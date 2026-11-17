import type { BusinessAvailabilitySource } from './business-availability'

/** Instance-scoped source for project local rules and isolated, deterministic scenarios. */
export function createLocalAvailabilitySource(
  id: string,
  evaluate: BusinessAvailabilitySource['evaluate'],
) {
  type Listener = Parameters<NonNullable<BusinessAvailabilitySource['subscribe']>>[0]
  const listeners = new Set<Listener>()
  const source: BusinessAvailabilitySource = Object.freeze({
    id,
    evaluate,
    subscribe(notify: Listener) {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
  })
  return Object.freeze({
    source,
    invalidate(change: Parameters<Listener>[0]): void {
      for (const listener of [...listeners]) listener(change)
    },
  })
}
