import { z } from 'zod'

import {
  accessContextSchema,
  accessScopeSchema,
  type AccessHost,
  type AccessHostChange,
  type BoundAccessRequest,
} from './access-contract'
import { createNativeGrantProvider, matchNativeScope } from './native-grants'

type Context = BoundAccessRequest['context']
type Scope = Context['scope']
type Notify = (change: AccessHostChange) => Promise<void>
const presetSchema = z.strictObject({ id: z.string().min(1), context: accessContextSchema })

/** Each opt-in instance owns its fixture selection and policy in memory. */
export function createLocalAccessHost(input: {
  readonly domain: string
  readonly capabilities: unknown
  readonly policy: unknown
  readonly contexts: readonly z.input<typeof presetSchema>[]
  readonly initialContext: string
}) {
  const presets = new Map<string, Context>()
  for (const raw of input.contexts) {
    const { id, context } = presetSchema.parse(raw)
    if (presets.has(id)) throw new TypeError('Duplicate local context preset.')
    presets.set(id, context)
  }
  const initialContext = presets.get(input.initialContext)
  if (initialContext === undefined) throw new TypeError('Initial local context preset is missing.')
  const domain = input.domain
  const initialPolicy = createNativeGrantProvider(domain, input.capabilities, input.policy)
  let policy = initialPolicy
  let active: Context = initialContext
  let notify: Notify | undefined

  function selectConfirmedScope(candidate: Scope): Context {
    const identity = active.identity
    const matching = [...presets.values()].filter(
      ({ identity: owner, scope }) =>
        owner.kind === identity.kind &&
        (owner.kind !== 'known' ||
          (identity.kind === 'known' && owner.principalId === identity.principalId)) &&
        (candidate.length === 0
          ? scope.length === 0
          : matchNativeScope({ kind: 'exact', path: candidate }, scope) === 'match'),
    )
    const confirmed = matching[0]
    if (matching.length !== 1 || confirmed === undefined)
      throw new TypeError('The local identity cannot confirm this scope.')
    return confirmed
  }

  const host: AccessHost = Object.freeze({
    resolveContext(change) {
      if (change.kind === 'scope' && change.candidate !== undefined)
        active = selectConfirmedScope(change.candidate)
      return active
    },
    decisions: Object.freeze([
      Object.freeze({
        domain,
        targets: initialPolicy.targets,
        evaluate: (request: BoundAccessRequest) => policy.evaluate(request),
      }),
    ]),
    subscribe(listener: Notify) {
      if (notify !== undefined) throw new Error('The local access host already has an owner.')
      notify = listener
      return () => {
        if (notify === listener) notify = undefined
      }
    },
  } satisfies AccessHost)

  return Object.freeze({
    host,
    capabilities: initialPolicy.capabilities,
    async selectContext(id: string): Promise<void> {
      const confirmed = presets.get(id)
      if (confirmed === undefined) throw new TypeError('Unknown local context preset.')
      active = confirmed
      await notify?.({ kind: 'identity' })
    },
    async selectScope(path: Scope): Promise<void> {
      const candidate = accessScopeSchema.parse(path)
      if (notify === undefined) active = selectConfirmedScope(candidate)
      else await notify({ kind: 'scope', candidate })
    },
    async replacePolicy(snapshot: unknown): Promise<void> {
      policy = createNativeGrantProvider(domain, initialPolicy.capabilities, snapshot)
      await notify?.({ kind: 'domain', domain })
    },
    async reset(): Promise<void> {
      policy = initialPolicy
      active = initialContext
      await notify?.({ kind: 'identity' })
    },
  })
}
