import {
  accessDecisionSchema,
  accessContextSchema,
  accessRequestSchema,
  type AccessBoundary,
} from '../access/access-contract'
import { observeNativeRequirement } from '../access/native-requirement'
import { captureAccessProposal } from '../access/access-boundary'
import type { AdministrationSimulation } from './administration-host'

export async function simulateAdministration(
  access: AccessBoundary,
  simulation: AdministrationSimulation,
  input: Omit<Parameters<AdministrationSimulation['prepare']>[0], 'context'>,
  signal: AbortSignal,
  isCurrent: () => boolean,
  onInvalidated?: () => void,
) {
  const initial = access.readContext()
  if (initial.status !== 'ready' || !simulation.subjects.some(({ id }) => id === input.subjectId))
    return { status: 'unsupported' } as const
  let retained = false
  let expiry: ReturnType<typeof setTimeout> | undefined
  function release(): void {
    clearTimeout(expiry)
    signal.removeEventListener('abort', release)
    requirement.dispose()
  }
  function invalidate(): void {
    release()
    onInvalidated?.()
  }
  const requirement = observeNativeRequirement(access, simulation.requirement, invalidate)
  const ownsAttempt = () => !signal.aborted && isCurrent() && access.readContext() === initial
  try {
    if (!ownsAttempt()) return { status: 'stale' } as const
    await requirement.evaluate()
    if (!ownsAttempt()) return { status: 'stale' } as const
    const permit = requirement.permit()
    if (!permit) return { status: 'denied' } as const
    const current = () => ownsAttempt() && permit.isCurrent()
    if (!current()) return { status: 'stale' } as const
    const request = accessRequestSchema.parse(input.request)
    const { proposal, ...address } = input.target
    const target = Object.freeze({
      ...address,
      ...(proposal === undefined ? {} : { proposal: captureAccessProposal(proposal) }),
    })
    const selected = await simulation.prepare(
      Object.freeze({ ...input, target, request, context: initial.snapshot }),
      signal,
    )
    if (!current()) return { status: 'stale' } as const
    if (
      selected?.provider.domain !== request.domain ||
      !selected.provider.targets.includes(request.kind)
    )
      return { status: 'unsupported' } as const
    const context = accessContextSchema.parse(selected.context)
    if (context.identity.kind !== 'known' || context.identity.principalId !== input.subjectId)
      return { status: 'configuration-error' } as const
    const contextDeadline = Math.min(
      context.expiresAt ?? Infinity,
      context.delegation?.expiresAt ?? Infinity,
    )
    if (contextDeadline <= Date.now()) return { status: 'stale' } as const
    const decision = accessDecisionSchema.parse(
      await selected.provider.evaluate(
        Object.freeze({
          id: 0,
          context,
          request,
          contextGeneration: 0,
          ...(target.proposal === undefined ? {} : { proposal: target.proposal }),
        }),
      ),
    )
    const deadline = Math.min(contextDeadline, decision.expiresAt ?? Infinity, permit.expiresAt)
    if (!current() || deadline <= Date.now()) return { status: 'stale' } as const
    if (onInvalidated !== undefined) {
      retained = true
      signal.addEventListener('abort', release, { once: true })
      function expire(): void {
        const remaining = deadline - Date.now()
        if (remaining <= 0) invalidate()
        else expiry = setTimeout(expire, Math.min(remaining, 2_147_483_647))
      }
      if (Number.isFinite(deadline)) expire()
    }
    return { status: decision.status, revision: decision.revision }
  } catch {
    return { status: ownsAttempt() ? 'evaluation-failed' : 'stale' } as const
  } finally {
    if (!retained) release()
  }
}
