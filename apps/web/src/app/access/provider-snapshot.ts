import type { AccessDecision, ProviderInvalidation } from './access-contract'

type Snapshot<T> = { readonly value: T } | { readonly unavailable: AccessDecision }

/** One instance owns its replacement sequence and publishes through WP-02 invalidation. */
export function createProviderSnapshot<T>(
  domain: string,
  initial: unknown,
  compile: (input: unknown) => T,
) {
  const listeners = new Set<(change: ProviderInvalidation) => void>()
  function prepare(input: unknown): Snapshot<T> {
    try {
      return { value: compile(input) }
    } catch {
      return {
        unavailable: { status: 'configuration-error', reasonCode: 'access.invalid-snapshot' },
      }
    }
  }
  let snapshot =
    initial === undefined
      ? ({
          unavailable: { status: 'indeterminate', reasonCode: 'access.snapshot-unavailable' },
        } as const)
      : prepare(initial)
  function invalidate(change: ProviderInvalidation = { kind: 'domain', domain }): void {
    if (change.domain !== domain)
      throw new TypeError('An invalidation must match its decision domain.')
    for (const notify of listeners) notify(change)
  }
  return {
    read: () => snapshot,
    invalidate,
    subscribe: (notify: (change: ProviderInvalidation) => void) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    replace: async (load: () => unknown): Promise<boolean> => {
      const pending = {
        unavailable: { status: 'pending', reasonCode: 'access.snapshot-replacing' },
      } as const
      snapshot = pending
      invalidate()
      let next: Snapshot<T>
      try {
        next = prepare(await load())
      } catch {
        next = {
          unavailable: { status: 'evaluation-failed', reasonCode: 'access.snapshot-load-failed' },
        }
      }
      if (snapshot !== pending) return false
      snapshot = next
      invalidate()
      return 'value' in next
    },
  }
}
