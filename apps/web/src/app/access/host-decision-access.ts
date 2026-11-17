import { z } from 'zod'
import type { AccessDecision, AccessProvider, BoundAccessRequest } from './access-contract'
import {
  capabilityKey,
  capabilityShape,
  indexCapabilities,
  scopeDecision,
  type AdapterScope,
} from './adapter-capabilities'
import { nativeScopeSchema } from './native-grants'
import { createProviderSnapshot } from './provider-snapshot'

const id = z.string().min(1)
const capabilitySchema = z.strictObject(capabilityShape)
const mappingSchema = z.strictObject({
  principal: id,
  relation: id,
  object: id,
  field: id.optional(),
  modelId: id.optional(),
  policyRevision: id.optional(),
  relationshipRevision: id.optional(),
  consistency: id.optional(),
})
const answerSchema = z.strictObject({
  requestId: id,
  target: id,
  status: z.enum([
    'allow',
    'deny',
    'indeterminate',
    'unsupported',
    'pending',
    'evaluation-failed',
    'configuration-error',
  ]),
  modelId: id.optional(),
  policyRevision: id.optional(),
  relationshipRevision: id.optional(),
  expiresAt: z.number().int().nonnegative().optional(),
})
type MappedDecision = z.input<typeof mappingSchema>
interface HostDecisionQuery {
  readonly requestId: string
  readonly target: string
  readonly binding: BoundAccessRequest
  readonly mapping: Readonly<z.output<typeof mappingSchema>>
}
interface Waiting {
  readonly query: HostDecisionQuery
  readonly resolve: (value: AccessDecision) => void
}
const malformed = {
  status: 'configuration-error',
  reasonCode: 'access.host-result-invalid',
} as const

/** Requests are batched once per microtask. Selected services own the meaning of the mapping. */
export function createHostDecisionAccess(options: {
  readonly domain: string
  readonly scope: AdapterScope
  readonly capabilities: readonly z.input<typeof capabilitySchema>[]
  readonly consistency?: readonly string[]
  readonly map: (binding: BoundAccessRequest) => MappedDecision | undefined
  readonly evaluate: (queries: readonly HostDecisionQuery[]) => Promise<unknown>
}) {
  const { domain } = options
  const scope = nativeScopeSchema.parse(options.scope)
  const capabilities = indexCapabilities(
    options.capabilities.map((item) => capabilitySchema.parse(item)),
  )
  const supportedConsistency = new Set(z.array(id).parse(options.consistency ?? []))
  const changes = createProviderSnapshot(domain, true, () => true)
  let queue: Waiting[] = []
  async function dispatch(batch: readonly Waiting[]): Promise<void> {
    try {
      const result = await options.evaluate(Object.freeze(batch.map(({ query }) => query)))
      if (!Array.isArray(result)) {
        for (const { resolve } of batch) resolve(malformed)
        return
      }
      // Match raw IDs before validating an entry so a malformed duplicate is still a duplicate.
      const byId = new Map<string, unknown[]>()
      for (const item of result as unknown[]) {
        const parsed = z.object({ requestId: id }).safeParse(item)
        if (!parsed.success) continue
        const list = byId.get(parsed.data.requestId) ?? []
        list.push(item)
        byId.set(parsed.data.requestId, list)
      }
      for (const { query, resolve } of batch) {
        const matches = byId.get(query.requestId)
        if (matches === undefined) {
          resolve({ status: 'indeterminate', reasonCode: 'access.host-result-missing' })
          continue
        }
        const answer = answerSchema.safeParse(matches[0])
        if (matches.length !== 1 || !answer.success || answer.data.target !== query.target) {
          resolve(malformed)
          continue
        }
        const { modelId, policyRevision, relationshipRevision } = query.mapping
        if (
          (modelId !== undefined && modelId !== answer.data.modelId) ||
          (policyRevision !== undefined && policyRevision !== answer.data.policyRevision) ||
          (relationshipRevision !== undefined &&
            relationshipRevision !== answer.data.relationshipRevision)
        ) {
          resolve({ status: 'indeterminate', reasonCode: 'access.host-revision-unconfirmed' })
          continue
        }
        const { status, expiresAt } = answer.data
        resolve({ status, ...(expiresAt === undefined ? {} : { expiresAt }) })
      }
    } catch {
      for (const { resolve } of batch)
        resolve({ status: 'evaluation-failed', reasonCode: 'access.host-transport-failed' })
    }
  }
  const provider: AccessProvider = {
    domain,
    targets: Object.freeze([...new Set([...capabilities.values()].map(({ kind }) => kind))]),
    subscribe: changes.subscribe,
    evaluate(binding) {
      const { request } = binding
      if (request.domain !== domain || !capabilities.has(capabilityKey(request)))
        return { status: 'unsupported', reasonCode: 'access.capability-unsupported' }
      const denied = scopeDecision(scope, binding)
      if (denied) return denied
      let mapping
      try {
        const requested = options.map(binding)
        if (requested === undefined || (request.kind === 'field' && requested.field === undefined))
          return { status: 'unsupported', reasonCode: 'access.host-mapping-unsupported' }
        mapping = Object.freeze(mappingSchema.parse(requested))
      } catch {
        return { status: 'configuration-error', reasonCode: 'access.host-mapping-invalid' }
      }
      if (mapping.consistency !== undefined && !supportedConsistency.has(mapping.consistency))
        return { status: 'unsupported', reasonCode: 'access.host-consistency-unsupported' }
      const target = JSON.stringify([
        request.kind,
        request.resource,
        request.action,
        mapping.principal,
        mapping.relation,
        mapping.object,
        mapping.field,
      ])
      return new Promise<AccessDecision>((resolve) => {
        if (queue.length === 0)
          queueMicrotask(() => {
            const batch = queue
            queue = []
            void dispatch(batch)
          })
        queue.push({
          query: Object.freeze({ requestId: crypto.randomUUID(), target, binding, mapping }),
          resolve,
        })
      })
    },
  }
  return Object.freeze({ provider: Object.freeze(provider), invalidate: changes.invalidate })
}
