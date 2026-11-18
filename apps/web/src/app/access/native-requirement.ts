import { z } from 'zod'

import {
  accessRequestSchema,
  type AccessBoundary,
  type AccessInvalidation,
  type AccessProposal,
  type AccessState,
} from './access-contract'
import { matchNativeScope, nativeScopeSchema } from './native-grants'

const requirementSchema = z
  .strictObject({
    operator: z.enum(['all', 'any']),
    scope: nativeScopeSchema,
    requests: z.array(accessRequestSchema).min(1).readonly(),
  })
  .refine(({ requests }) => requests.every(({ domain }) => domain === requests[0]?.domain))

export type AccessRequirement = Readonly<z.output<typeof requirementSchema>>
export type NativeAccessRequirement = AccessRequirement

const invalidRequirement = {
  status: 'configuration-error',
  reasonCode: 'native-access.invalid-requirement',
} as const

/** Compose already bound leaf permits within one selected decision domain. */
export function observeNativeRequirement(
  access: AccessBoundary,
  input: unknown,
  onInvalidated: (change: AccessInvalidation) => void,
  proposal?: AccessProposal,
) {
  const parsed = requirementSchema.safeParse(input)
  const requirement = parsed.data
  const leaves =
    requirement?.requests.map((request) =>
      access.observe(
        request,
        onInvalidated,
        request.kind === 'record' || request.kind === 'field' ? proposal : undefined,
      ),
    ) ?? []
  let disposed = false

  function checkScope(): AccessState | undefined {
    if (requirement === undefined) return invalidRequirement
    const context = access.readContext()
    if (context.status === 'unconfigured') return { status: 'configuration-error' }
    if (context.status !== 'ready') return { status: context.status }
    const match = matchNativeScope(requirement.scope, context.snapshot.scope)
    if (match === 'unknown')
      return { status: 'indeterminate', reasonCode: 'native-access.scope-unconfirmed' }
    if (match === 'different') return { status: 'deny', reasonCode: 'native-access.scope-mismatch' }
    return undefined
  }

  function read(): AccessState {
    if (disposed) return { status: 'disposed' }
    const decisions = leaves.map((leaf) => leaf.read())
    const cleanupFailure = decisions.find(
      (decision) => 'reasonCode' in decision && decision.reasonCode === 'access.cleanup-failed',
    )
    if (cleanupFailure !== undefined) return cleanupFailure
    const configuration = decisions.find(({ status }) => status === 'configuration-error')
    if (configuration !== undefined) return configuration
    const scope = checkScope()
    if (scope !== undefined) return scope

    const denial = decisions.find(({ status }) => status === 'deny')
    if (requirement?.operator === 'all' && denial !== undefined) return denial

    // An unchecked alternative can still reveal a broken declaration.
    const unchecked = decisions.find(({ status }) => status === 'stale' || status === 'pending')
    if (unchecked !== undefined) return unchecked
    const allowed = (decision: AccessState) => decision.status === 'allow'
    if (requirement?.operator === 'any' ? decisions.some(allowed) : decisions.every(allowed))
      return { status: 'allow' }

    return (
      decisions.find(({ status }) => status !== 'allow' && status !== 'deny') ??
      denial ??
      invalidRequirement
    )
  }

  return Object.freeze({
    read,
    async evaluate(): Promise<void> {
      if (disposed || checkScope() !== undefined) return
      await Promise.all(leaves.map((leaf) => leaf.evaluate()))
    },
    permit() {
      if (read().status !== 'allow') return undefined
      const permits = leaves.flatMap((leaf) => {
        const permit = leaf.permit()
        return permit === undefined ? [] : [permit]
      })
      const deadlines = leaves.flatMap((leaf) => {
        const decision = leaf.read()
        return decision.status === 'allow' ? [decision.expiresAt ?? Infinity] : []
      })
      return Object.freeze({
        expiresAt:
          requirement?.operator === 'any' ? Math.max(...deadlines) : Math.min(...deadlines),
        isCurrent: () =>
          read().status === 'allow' &&
          (requirement?.operator === 'any'
            ? permits.some((permit) => permit.isCurrent())
            : permits.length === leaves.length && permits.every((permit) => permit.isCurrent())),
      })
    },
    dispose() {
      disposed = true
      for (const leaf of leaves) leaf.dispose()
    },
  })
}
