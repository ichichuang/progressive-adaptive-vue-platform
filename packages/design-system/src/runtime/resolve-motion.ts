import type { MotionPreference } from '../schema/appearance.schema'

export interface ResolveMotionInput {
  readonly storedMotion: MotionPreference
  readonly prefersReducedMotion: boolean
}

export function resolveMotion({
  storedMotion,
  prefersReducedMotion,
}: ResolveMotionInput): MotionPreference {
  return storedMotion === 'full' && prefersReducedMotion ? 'reduced' : storedMotion
}
