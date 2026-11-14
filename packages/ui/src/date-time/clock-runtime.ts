/** One timer per provider-independent browser clock, with no work without consumers. */
export interface ClockEnvironment {
  now(): number
  hidden(): boolean
  schedule(callback: () => void, delay: number): () => void
  listen(callback: () => void): () => void
}
export function createClockRuntime(environment: ClockEnvironment): {
  subscribe(interval: 1000 | 60000, update: (now: number) => void): () => void
} {
  const listeners = new Map<
    symbol,
    { interval: number; update: (now: number) => void; next: number }
  >()
  let previousNow = environment.now()
  let cancel: (() => void) | undefined
  let unlisten: (() => void) | undefined
  function schedule(): void {
    cancel?.()
    cancel = undefined
    if (listeners.size === 0 || environment.hidden()) return
    const now = environment.now()
    const next = Math.min(...Array.from(listeners.values(), (entry) => entry.next))
    cancel = environment.schedule(tick, Math.max(1, next - now))
  }
  function tick(): void {
    cancel = undefined
    if (environment.hidden()) return
    const now = environment.now()
    for (const entry of listeners.values()) {
      if (now >= entry.next || now < previousNow) {
        entry.update(now)
        entry.next = now + entry.interval
      }
    }
    previousNow = now
    schedule()
  }
  function visibility(): void {
    if (!environment.hidden()) {
      const now = environment.now()
      previousNow = now
      for (const entry of listeners.values()) {
        entry.update(now)
        entry.next = now + entry.interval
      }
    }
    schedule()
  }
  return {
    subscribe(interval, update) {
      const id = Symbol('clock-consumer')
      const now = environment.now()
      listeners.set(id, { interval, update, next: now + interval })
      unlisten ??= environment.listen(visibility)
      update(now)
      schedule()
      return () => {
        listeners.delete(id)
        if (listeners.size === 0) {
          unlisten?.()
          unlisten = undefined
        }
        schedule()
      }
    },
  }
}
