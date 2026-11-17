import {
  accessDecisionSchema,
  accessContextSchema,
  accessRequestSchema,
  type AccessBoundary,
} from '../access/access-contract'
import { observeNativeRequirement } from '../access/native-requirement'
import type { AdministrationSimulation } from './administration-host'

export async function simulateAdministration(
  access: AccessBoundary,
  simulation: AdministrationSimulation,
  input: Omit<Parameters<AdministrationSimulation['prepare']>[0], 'context'>,
  signal: AbortSignal,
  isCurrent: () => boolean,
) {
  const initial = access.readContext()
  if (initial.status !== 'ready' || !simulation.subjects.some(({ id }) => id === input.subjectId))
    return { status: 'unsupported' } as const
  const requirement = observeNativeRequirement(access, simulation.requirement, () => undefined)
  try {
    await requirement.evaluate()
    const permit = requirement.permit()
    if (!permit) return { status: 'denied' } as const
    const current = () =>
      !signal.aborted && isCurrent() && access.readContext() === initial && permit.isCurrent()
    if (!current()) return { status: 'stale' } as const
    const request = accessRequestSchema.parse(input.request)
    const selected = await simulation.prepare(
      Object.freeze({ ...input, request, context: initial.snapshot }),
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
    const decision = accessDecisionSchema.parse(
      await selected.provider.evaluate(
        Object.freeze({
          id: 0,
          context,
          request,
          contextGeneration: 0,
          ...(input.target.proposal === undefined ? {} : { proposal: input.target.proposal }),
        }),
      ),
    )
    return current()
      ? { status: decision.status, revision: decision.revision }
      : ({ status: 'stale' } as const)
  } catch {
    return { status: signal.aborted ? 'stale' : 'evaluation-failed' } as const
  } finally {
    requirement.dispose()
  }
}
