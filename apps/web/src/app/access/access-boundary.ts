import { inject, shallowRef, type App, type InjectionKey } from 'vue'

import {
  accessContextSchema,
  accessDecisionSchema,
  accessInvalidationSchema,
  accessRequestSchema,
  accessProposalSchema,
  accessScopeSchema,
  type AccessBoundary,
  type AccessContextChange,
  type AccessContextSnapshot,
  type AccessContextState,
  type AccessHost,
  type AccessHostChange,
  type AccessInvalidation,
  type AccessRequest,
  type AccessState,
  type BoundAccessRequest,
  type AccessProposal,
} from './access-contract'
import type { BusinessAvailabilitySource } from './business-availability'

const accessKey: InjectionKey<AccessBoundary> = Symbol('access-boundary')

/** Copy and freeze candidate data once, independently of confirmed policy facts. */
export function captureAccessProposal(value: AccessProposal): AccessProposal {
  const proposal = accessProposalSchema.parse(value)
  function freeze(value: unknown): void {
    if (value === null || typeof value !== 'object') return
    for (const item of Object.values(value)) freeze(item)
    Object.freeze(value)
  }
  freeze(proposal.values)
  return proposal
}

function state<const Status extends string>(status: Status): { readonly status: Status } {
  return Object.freeze({ status })
}

function affects(change: AccessInvalidation, request: AccessRequest): boolean {
  if (change.kind === 'identity' || change.kind === 'scope') return true
  if (
    change.domain !== request.domain ||
    (change.action !== undefined && change.action !== request.action)
  )
    return false
  if (change.kind === 'domain') return true
  if (request.kind !== 'record' && request.kind !== 'field') return false
  if (change.resource !== request.resource || change.recordId !== request.recordId) return false
  return (
    change.kind === 'record' || (request.kind === 'field' && change.fieldPath === request.fieldPath)
  )
}

/** One owner per bootstrap attempt. The host still enforces access on the service. */
export function installAccessBoundary(application: App, host?: AccessHost): () => void {
  const configuredHost = typeof host?.resolveContext === 'function' ? host : undefined
  const context = shallowRef<AccessContextState>(
    state(configuredHost === undefined ? 'unconfigured' : 'initializing'),
  )
  const providers = new Map<
    string,
    {
      readonly targets: ReadonlySet<AccessRequest['kind']>
      readonly evaluate: AccessHost['decisions'][number]['evaluate']
      readonly subscribe: AccessHost['decisions'][number]['subscribe']
    } | null
  >()
  const selections: AccessHost['decisions'] =
    configuredHost !== undefined && Array.isArray(configuredHost.decisions)
      ? configuredHost.decisions
      : []
  for (const provider of selections) {
    if (typeof provider.domain !== 'string' || provider.domain.length === 0) continue
    providers.set(
      provider.domain,
      providers.has(provider.domain) ||
        typeof provider.evaluate !== 'function' ||
        !Array.isArray(provider.targets)
        ? null
        : {
            targets: new Set(provider.targets),
            evaluate: provider.evaluate.bind(provider),
            subscribe: provider.subscribe?.bind(provider),
          },
    )
  }
  const availability = new Map<string, BusinessAvailabilitySource | undefined>()
  const sources: readonly BusinessAvailabilitySource[] = Array.isArray(configuredHost?.availability)
    ? configuredHost.availability
    : []
  for (const source of sources) {
    if (typeof source.id !== 'string' || source.id.length === 0) continue
    availability.set(
      source.id,
      !availability.has(source.id) && typeof source.evaluate === 'function' ? source : undefined,
    )
  }

  const consumers = new Set<{
    readonly request: AccessRequest
    advance(): void
    notify(change: AccessInvalidation): void
  }>()
  let disposed = false
  let contextGeneration = 0
  let requestId = 0
  let delegationExpiry: ReturnType<typeof setTimeout> | undefined

  function contextDeadline(snapshot: AccessContextSnapshot): number {
    return Math.min(snapshot.expiresAt ?? Infinity, snapshot.delegation?.expiresAt ?? Infinity)
  }

  function readContext(): AccessContextState {
    const current = context.value
    if (current.status === 'ready' && contextDeadline(current.snapshot) <= Date.now())
      return state('expired')
    return current
  }

  function invalidate(change: AccessInvalidation, next?: AccessContextState): void {
    const affected = [...consumers].filter(({ request }) => affects(change, request))
    // Retire every affected generation before Vue watchers or owner callbacks can run.
    for (const consumer of affected) consumer.advance()
    if (next !== undefined) context.value = next
    for (const consumer of affected) consumer.notify(change)
  }

  async function replaceContext(
    change: AccessContextChange,
    initial = false,
  ): Promise<AccessContextSnapshot | undefined> {
    if (configuredHost === undefined || disposed) return
    clearTimeout(delegationExpiry)
    const generation = ++contextGeneration
    const current = () => !disposed && generation === contextGeneration
    invalidate(
      Object.freeze({ kind: change.kind }),
      state(initial ? 'initializing' : 'transitioning'),
    )
    if (!current()) return

    try {
      const candidate =
        change.kind === 'scope' && change.candidate !== undefined
          ? accessScopeSchema.parse(change.candidate)
          : undefined
      const request = Object.freeze(
        candidate === undefined ? { kind: change.kind } : { kind: 'scope' as const, candidate },
      )
      const result = await configuredHost.resolveContext(request)
      if (!current()) return
      const snapshot = accessContextSchema.parse(result)
      if (
        candidate !== undefined &&
        (candidate.length !== snapshot.scope.length ||
          candidate.some(({ kind, id }, index) => {
            const confirmed = snapshot.scope[index]
            return confirmed?.kind !== kind || confirmed.id !== id
          }))
      ) {
        throw new TypeError('The host did not confirm the requested access scope.')
      }
      if (snapshot.delegation !== undefined && contextDeadline(snapshot) <= Date.now())
        throw new TypeError('The host returned an expired delegation.')
      if (!current()) return
      context.value = Object.freeze({ status: 'ready', snapshot })
      function expireDelegation(): void {
        if (!current()) return
        const remaining = contextDeadline(snapshot) - Date.now()
        if (remaining <= 0) void replaceContext({ kind: 'identity' })
        else delegationExpiry = setTimeout(expireDelegation, Math.min(remaining, 2_147_483_647))
      }
      if (snapshot.delegation !== undefined) expireDelegation()
      return snapshot
    } catch {
      if (current()) context.value = state('identity-failed')
    }
  }

  async function onHostChange(change: AccessHostChange): Promise<void> {
    if (disposed) return
    if (change.kind === 'identity' || change.kind === 'scope') {
      await replaceContext(change)
    } else {
      invalidate(accessInvalidationSchema.parse(change))
    }
  }

  const boundary: AccessBoundary = {
    readContext,
    availabilitySource: (id) => (disposed ? undefined : availability.get(id)),
    delegationExit: (snapshot) => {
      const active = readContext()
      if (
        active.status === 'ready' &&
        active.snapshot === snapshot &&
        snapshot.delegation !== undefined
      ) {
        try {
          return configuredHost?.delegation?.exit(snapshot)
        } catch {
          return undefined
        }
      }
      return undefined
    },
    async reconfirm(origin) {
      const active = readContext()
      if (active.status === 'ready' && active.snapshot === origin)
        return await replaceContext({ kind: 'identity' })
      return undefined
    },
    observe(input, onInvalidated, proposal) {
      const parsed = accessRequestSchema.safeParse(input)
      const request = parsed.data
      const provider = request === undefined ? undefined : providers.get(request.domain)
      let candidate: AccessProposal | undefined
      let invalidProposal = false
      if (proposal !== undefined) {
        try {
          if (request?.kind !== 'record' && request?.kind !== 'field') throw new TypeError()
          candidate = captureAccessProposal(proposal)
        } catch {
          invalidProposal = true
        }
      }
      if (request === undefined || !provider?.targets.has(request.kind) || invalidProposal) {
        return Object.freeze({
          read: () => state(disposed ? 'disposed' : 'configuration-error'),
          evaluate: () => Promise.resolve(),
          permit: () => undefined,
          dispose: () => undefined,
        })
      }

      let closed = disposed
      let generation = 0
      let expiry: ReturnType<typeof setTimeout> | undefined
      const evaluation = shallowRef<{
        readonly generation: number
        readonly binding: BoundAccessRequest
        readonly result: AccessState
      }>()

      const owner = {
        request,
        advance() {
          if (expiry !== undefined) clearTimeout(expiry)
          expiry = undefined
          generation++
        },
        notify(change: AccessInvalidation) {
          if (closed) return
          if (evaluation.value?.generation !== generation) evaluation.value = undefined
          try {
            onInvalidated(change)
          } catch {
            // One consumer cannot keep other owners from clearing invalidated state.
          }
        },
      }
      if (!closed) consumers.add(owner)

      function read(): AccessState {
        if (closed || disposed) return state('disposed')
        const active = readContext()
        if (active.status === 'unconfigured') return state('configuration-error')
        if (active.status !== 'ready') return state(active.status)
        const current = evaluation.value
        if (current?.generation !== generation) return state('stale')
        const result = current.result
        if ('expiresAt' in result && (result.expiresAt ?? Infinity) <= Date.now())
          return state('expired')
        return result
      }

      return Object.freeze({
        read,
        async evaluate() {
          const active = readContext()
          if (active.status !== 'ready' || closed || disposed) return
          owner.advance()
          const pending = {
            generation,
            binding: Object.freeze({
              id: ++requestId,
              context: active.snapshot,
              contextGeneration,
              request,
              ...(candidate === undefined ? {} : { proposal: candidate }),
            }),
            result: state('pending'),
          }
          const current = () =>
            !disposed &&
            !closed &&
            evaluation.value === pending &&
            pending.generation === generation &&
            pending.binding.contextGeneration === contextGeneration &&
            readContext().status === 'ready'
          evaluation.value = pending
          if (!current()) return
          try {
            const answer = await provider.evaluate(pending.binding)
            if (!current()) return
            const result = accessDecisionSchema.parse(answer)
            if (current()) {
              const confirmed = { ...pending, result }
              evaluation.value = confirmed
              const deadline = Math.min(
                result.expiresAt ?? Infinity,
                contextDeadline(active.snapshot),
              )
              function expire(): void {
                if (evaluation.value !== confirmed || closed || disposed) return
                const remaining = deadline - Date.now()
                if (remaining <= 0) {
                  const { request } = pending.binding
                  expiry = undefined
                  evaluation.value = { ...confirmed, result: state('expired') }
                  owner.notify(
                    request.kind === 'field' || request.kind === 'record'
                      ? request
                      : { kind: 'domain', domain: request.domain, action: request.action },
                  )
                } else expiry = setTimeout(expire, Math.min(2_147_483_647, remaining))
              }
              // Only a previously current decision needs to withdraw owned presentation.
              const delay = deadline - Date.now()
              if (Number.isFinite(delay) && delay > 0)
                expiry = setTimeout(expire, Math.min(2_147_483_647, delay))
            }
          } catch {
            if (current()) evaluation.value = { ...pending, result: state('evaluation-failed') }
          }
        },
        permit() {
          const current = evaluation.value
          if (current === undefined || read().status !== 'allow') return undefined
          return Object.freeze({
            binding: current.binding,
            isCurrent: () => evaluation.value === current && read().status === 'allow',
          })
        },
        dispose() {
          closed = true
          owner.advance()
          evaluation.value = undefined
          consumers.delete(owner)
        },
      })
    },
  }
  application.provide(accessKey, Object.freeze(boundary))
  let unsubscribe: (() => void) | undefined
  const providerSubscriptions: (() => void)[] = []

  if (configuredHost !== undefined) {
    for (const [domain, provider] of providers) {
      if (!provider?.subscribe) continue
      try {
        providerSubscriptions.push(
          provider.subscribe((change) => {
            const parsed = accessInvalidationSchema.safeParse(change)
            if (
              !disposed &&
              parsed.success &&
              'domain' in parsed.data &&
              parsed.data.domain === domain
            )
              invalidate(parsed.data)
          }),
        )
      } catch {
        providers.set(domain, null)
      }
    }
    void replaceContext({ kind: 'identity' }, true)
    try {
      unsubscribe = configuredHost.subscribe?.(onHostChange)
    } catch {
      contextGeneration++
      invalidate(Object.freeze({ kind: 'identity' }), state('identity-failed'))
    }
  }

  return () => {
    if (disposed) return
    disposed = true
    clearTimeout(delegationExpiry)
    contextGeneration++
    invalidate(Object.freeze({ kind: 'identity' }), state('disposed'))
    consumers.clear()
    for (const unsubscribe of providerSubscriptions) unsubscribe()
    unsubscribe?.()
  }
}

export function useAccessBoundary(): AccessBoundary {
  const access = inject(accessKey)
  if (access === undefined) throw new Error('The application access boundary is unavailable.')
  return access
}
