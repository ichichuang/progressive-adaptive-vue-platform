import type { UiChartTourConfig, UiChartTourState, UiChartTourTarget } from './g2-chart-contracts'

type Suspension = 'interaction' | 'hidden' | 'motion' | 'rendering'
interface TourClock {
  set(callback: () => void, delay: number): unknown
  clear(handle: unknown): void
}
function isTarget(value: unknown): value is UiChartTourTarget {
  if (!value || typeof value !== 'object') return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    'field' in value &&
    typeof value.field === 'string' &&
    value.field.trim().length > 0 &&
    'value' in value &&
    (typeof value.value === 'string' ||
      (typeof value.value === 'number' && Number.isFinite(value.value)))
  )
}
/** Instance-owned tour scheduler. Never owns chart data or vendor lifecycle. */
export function createChartTour(
  change: (state: UiChartTourState) => void,
  clock: TourClock = {
    set: (callback, delay) => setTimeout(callback, delay),
    clear: (handle) => {
      clearTimeout(handle as ReturnType<typeof setTimeout>)
    },
  },
) {
  let config: UiChartTourConfig | undefined
  let wanted = false
  let stopped = true
  let index = 0
  let timer: unknown
  let disposed = false
  let available = new Set<string>()
  const suspended = new Set<Suspension>(['rendering'])
  const listeners = new Set<() => void>()
  let state: UiChartTourState = { status: 'stopped', targetId: null, reason: null }
  function targets(): readonly UiChartTourTarget[] {
    return config?.targets.filter((target: UiChartTourTarget) => available.has(target.id)) ?? []
  }
  function cancel(): void {
    if (timer !== undefined) clock.clear(timer)
    timer = undefined
  }
  function publish(): void {
    if (disposed) return
    cancel()
    const list = targets()
    index = Math.max(0, Math.min(index, Math.max(0, list.length - 1)))
    const reason = (['motion', 'hidden', 'interaction', 'rendering'] as const).find((key) =>
      suspended.has(key),
    )
    state = {
      status: stopped
        ? 'stopped'
        : !wanted
          ? 'paused'
          : reason || !list.length
            ? 'waiting'
            : 'playing',
      targetId: stopped ? null : (list[index]?.id ?? null),
      reason: stopped ? null : !wanted ? 'user' : (reason ?? (!list.length ? 'empty' : null)),
    }
    change(state)
    for (const listener of listeners) listener()
    if (state.status === 'playing' && list.length > 1) {
      timer = clock.set(() => {
        timer = undefined
        if (index === targets().length - 1 && config?.loop === false) wanted = false
        else index = (index + 1) % targets().length
        publish()
      }, config?.intervalMs ?? 4000)
    }
  }
  function preserve(update: () => void): void {
    const id = targets()[index]?.id
    update()
    const next = targets().findIndex((target: UiChartTourTarget) => target.id === id)
    if (next >= 0) index = next
    publish()
  }
  return {
    configure(next: UiChartTourConfig | undefined): void {
      if (next) {
        if (
          !Array.isArray(next.targets) ||
          !next.targets.every(isTarget) ||
          new Set(next.targets.map((target: UiChartTourTarget) => target.id)).size !==
            next.targets.length
        )
          throw new Error('Chart tour requires unique IDs and finite string/number field targets.')
        if (
          next.intervalMs !== undefined &&
          (!Number.isFinite(next.intervalMs) || next.intervalMs < 1000)
        )
          throw new Error('Chart tour intervalMs must be at least 1000 ms.')
        if (
          (next.autoplay !== undefined && typeof next.autoplay !== 'boolean') ||
          (next.loop !== undefined && typeof next.loop !== 'boolean')
        )
          throw new Error('Chart tour autoplay and loop must be boolean.')
      }
      const first = config === undefined
      preserve(() => {
        config = next
        if (!next) {
          wanted = false
          stopped = true
        } else if (first) {
          wanted = next.autoplay === true
          stopped = !wanted
        }
      })
    },
    available(ids: readonly string[]): void {
      preserve(() => {
        available = new Set(ids)
      })
    },
    suspend(reason: Suspension, value: boolean): void {
      if (suspended.has(reason) === value) return
      if (value) suspended.add(reason)
      else suspended.delete(reason)
      publish()
    },
    play(): void {
      if (!config) return
      stopped = false
      wanted = true
      publish()
    },
    pause(): void {
      if (!config || stopped) return
      wanted = false
      publish()
    },
    stop(): void {
      wanted = false
      stopped = true
      index = 0
      publish()
    },
    select(id: string): void {
      const next = targets().findIndex((target) => target.id === id)
      if (next < 0) return
      index = next
      wanted = false
      stopped = false
      publish()
    },
    step(direction: 1 | -1): void {
      const list = targets()
      if (!list.length) return
      index = stopped
        ? direction === 1
          ? 0
          : list.length - 1
        : (index + direction + list.length) % list.length
      stopped = false
      wanted = false
      publish()
    },
    target(): UiChartTourTarget | null {
      return stopped ||
        suspended.has('interaction') ||
        suspended.has('hidden') ||
        suspended.has('rendering')
        ? null
        : (targets()[index] ?? null)
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose(): void {
      disposed = true
      cancel()
      listeners.clear()
    },
  }
}
export type ChartTourRuntime = ReturnType<typeof createChartTour>
