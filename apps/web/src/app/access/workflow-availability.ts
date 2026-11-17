import type { AccessProposal } from './access-contract'
import type {
  BusinessAvailabilitySource,
  BusinessEvaluation,
  BusinessResolution,
} from './business-availability'
import { validFactPaths, type LoadConditionalFacts } from './conditional-facts'
import { evaluateDeclaredPredicate, type DeclaredPredicate } from './predicate-access'

type WorkflowBinding = BusinessEvaluation & { readonly proposal?: AccessProposal }

export function createWorkflowAvailability(options: {
  readonly id: string
  readonly transitions: Readonly<Record<string, DeclaredPredicate<WorkflowBinding>>>
  readonly loadFacts: LoadConditionalFacts<WorkflowBinding>
  readonly subscribe?: BusinessAvailabilitySource['subscribe']
}): BusinessAvailabilitySource {
  const rules = new Map(
    Object.entries(options.transitions).map(([id, rule]) => {
      if (
        !id ||
        rule.requires.length === 0 ||
        !validFactPaths(rule.requires) ||
        typeof rule.test !== 'function'
      )
        throw new TypeError('Invalid workflow transition declaration.')
      return [id, Object.freeze({ ...rule, requires: Object.freeze([...rule.requires]) })]
    }),
  )
  return Object.freeze({
    id: options.id,
    ...(options.subscribe === undefined ? {} : { subscribe: options.subscribe }),
    async evaluate(input: BusinessEvaluation): Promise<BusinessResolution> {
      if (input.constraint.kind !== 'workflow') return { status: 'configuration-error' }
      const rule = rules.get(input.constraint.transition)
      if (!rule) return { status: 'configuration-error' }
      const { proposal } = input.intent.target
      const { decision, factRevision } = await evaluateDeclaredPredicate(
        rule,
        Object.freeze({ ...input, ...(proposal === undefined ? {} : { proposal }) }),
        options.loadFacts,
      )
      if (decision.status === 'pending' || decision.status === 'configuration-error')
        return { status: decision.status }
      if (decision.status === 'evaluation-failed') return { status: 'failed' }
      if ((decision.status !== 'allow' && decision.status !== 'deny') || factRevision === undefined)
        return { status: 'unknown' }
      return {
        status: 'confirmed',
        revision: factRevision,
        expiresAt: decision.expiresAt,
        detail: { kind: 'workflow', eligible: decision.status === 'allow' },
      }
    },
  })
}
