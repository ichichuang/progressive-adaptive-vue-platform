import { z } from 'zod'
import type { AccessProvider, AccessRequest, BoundAccessRequest } from './access-contract'
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

type PredicateRule = Pick<AccessRequest, 'kind' | 'resource' | 'action'> & {
  readonly input?: ConditionalInput
  readonly requires: readonly string[]
  readonly test: (input: {
    readonly facts: Readonly<Record<string, unknown>>
    readonly binding: BoundAccessRequest
  }) => boolean
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
      const facts = await readDeclaredFacts(options.loadFacts, binding, rule.input, rule.requires)
      if ('unavailable' in facts) return facts.unavailable
      try {
        const result = rule.test({ facts: facts.facts, binding })
        if (typeof result !== 'boolean')
          return { status: 'configuration-error', reasonCode: 'access.invalid-predicate-result' }
        return { status: result ? 'allow' : 'deny', ...facts.validity }
      } catch {
        return { status: 'evaluation-failed', reasonCode: 'access.predicate-failed' }
      }
    },
  }
  return Object.freeze({ provider: Object.freeze(provider), invalidateFacts: boundary.invalidate })
}
