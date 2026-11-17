import type { AccessBoundary, DelegationCommand } from './access-contract'
import { executeGuardedAction } from './guarded-action'

export async function executeDelegationChange(
  access: AccessBoundary,
  command: DelegationCommand,
  change: 'enter' | 'exit',
  signal: AbortSignal,
) {
  const origin = access.readContext()
  if (origin.status !== 'ready' || origin.snapshot.identity.kind !== 'known') return 'unavailable'
  const snapshot = origin.snapshot
  if (change === 'enter' && snapshot.delegation) return 'unsupported'
  if (change === 'exit' && !snapshot.delegation) return 'unavailable'
  const [outcome] = await executeGuardedAction(access, command.action, {
    targets: [command.target],
    signal,
  })
  if (outcome?.requestId === undefined) return outcome?.status ?? 'unavailable'
  // Even an uncertain or failed exit must ask the host what context is actually effective.
  const confirmed = await access.reconfirm?.(snapshot)
  if (outcome.status !== 'completed' || !confirmed) return 'unavailable'
  if (change === 'exit') return confirmed.delegation === undefined ? 'completed' : 'unavailable'
  return confirmed.delegation?.actorId === origin.snapshot.identity.principalId
    ? 'completed'
    : 'unavailable'
}
