import { z } from 'zod'
import type {
  AccessDecision,
  AccessProvider,
  AccessRequest,
  BoundAccessRequest,
} from './access-contract'
import {
  capabilityKey,
  capabilityShape,
  indexCapabilities,
  scopeDecision,
  type AdapterScope,
} from './adapter-capabilities'
import {
  readDeclaredFacts,
  validFactPaths,
  type ConditionalInput,
  type LoadConditionalFacts,
} from './conditional-facts'
import { nativeScopeSchema } from './native-grants'
import { createProviderSnapshot } from './provider-snapshot'

export interface DeclaredPredicate<Binding> {
  readonly input?: ConditionalInput
  readonly requires: readonly string[]
  readonly test: (input: {
    readonly facts: Readonly<Record<string, unknown>>
    readonly binding: Binding
  }) => boolean
}

type PredicateRule = Pick<AccessRequest, 'kind' | 'resource' | 'action'> &
  DeclaredPredicate<BoundAccessRequest>

export async function evaluateDeclaredPredicate<
  Binding extends Pick<BoundAccessRequest, 'proposal'>,
>(
  rule: DeclaredPredicate<Binding>,
  binding: Binding,
  load?: LoadConditionalFacts<Binding>,
): Promise<{ readonly decision: AccessDecision; readonly factRevision?: string }> {
  const facts = await readDeclaredFacts(load, binding, rule.input ?? 'confirmed', rule.requires)
  if ('unavailable' in facts) return { decision: facts.unavailable }
  try {
    const result = rule.test({ facts: facts.facts, binding })
    if (typeof result !== 'boolean')
      return {
        decision: { status: 'configuration-error', reasonCode: 'access.invalid-predicate-result' },
      }
    return {
      decision: { status: result ? 'allow' : 'deny', ...facts.validity },
      ...(facts.revision === undefined ? {} : { factRevision: facts.revision }),
    }
  } catch {
    return { decision: { status: 'evaluation-failed', reasonCode: 'access.predicate-failed' } }
  }
}

export function createPredicateAccess(options: {
  readonly domain: string
  readonly scope: AdapterScope
  readonly rules: readonly PredicateRule[]
  readonly loadFacts?: LoadConditionalFacts
}) {
  const { domain } = options
  const scope = nativeScopeSchema.parse(options.scope)
  const rules = indexCapabilities(
    options.rules.map((rule) => {
      const capability = z.object(capabilityShape).parse(rule)
      const input = z.enum(['confirmed', 'candidate']).default('confirmed').parse(rule.input)
      if (
        !validFactPaths(rule.requires) ||
        typeof rule.test !== 'function' ||
        (input === 'candidate' && capability.kind !== 'record' && capability.kind !== 'field')
      )
        throw new TypeError('Invalid predicate capability.')
      return {
        ...capability,
        input,
        requires: Object.freeze([...rule.requires]),
        test: rule.test,
      }
    }),
  )
  const boundary = createProviderSnapshot(domain, true, () => rules)
  const provider: AccessProvider = {
    domain,
    targets: Object.freeze([...new Set([...rules.values()].map(({ kind }) => kind))]),
    subscribe: boundary.subscribe,
    async evaluate(binding) {
      const rule = rules.get(capabilityKey(binding.request))
      if (!rule || binding.request.domain !== domain)
        return { status: 'unsupported', reasonCode: 'access.capability-unsupported' }
      const denied = scopeDecision(scope, binding)
      if (denied) return denied
      return (await evaluateDeclaredPredicate(rule, binding, options.loadFacts)).decision
    },
  }
  return Object.freeze({ provider: Object.freeze(provider), invalidateFacts: boundary.invalidate })
}
