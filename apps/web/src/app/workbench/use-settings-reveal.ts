import type { EffectiveAppearanceState } from '@platform/design-system'
import { onActivated, onDeactivated, onScopeDispose, watch, type Ref } from 'vue'
import { useRouteRevealBoundary } from '../router/route-transition/route-motion-player'
import type { SettingsSectionId } from '../scroll/settings-scroll-position'

/** Settings rows retain their layout and accessibility while their inner surface enters. */
export function useSettingsReveal(input: {
  readonly page: Readonly<Ref<HTMLElement | null>>
  readonly section: Readonly<Ref<SettingsSectionId>>
  readonly motion: () => EffectiveAppearanceState['motion']
  readonly restored: boolean
}) {
  const route = useRouteRevealBoundary()
  let routeReady = false
  void route.whenRevealed().then(() => {
    routeReady = true
  })
  let viewport: HTMLElement | null = null
  let observer: IntersectionObserver | undefined
  let generation = 0
  let active = true
  let first = true
  const revealed = new Set<string>()
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>()

  function clearTimer(row: HTMLElement): void {
    const timer = timers.get(row)
    if (timer !== undefined) clearTimeout(timer)
    timers.delete(row)
  }
  function settle(row: HTMLElement): void {
    clearTimer(row)
    const id = row.dataset['settingsReveal']
    if (id !== undefined) revealed.add(id)
    row.dataset['settingsRevealState'] = 'done'
    observer?.unobserve(row)
  }
  function stop(): void {
    generation += 1
    observer?.disconnect()
    observer = undefined
    for (const row of timers.keys()) clearTimer(row)
    input.page.value
      ?.querySelectorAll<HTMLElement>('[data-settings-reveal-state="entering"]')
      .forEach(settle)
  }
  function showAll(): void {
    input.page.value?.querySelectorAll<HTMLElement>('[data-settings-reveal]').forEach(settle)
  }
  function enter(row: HTMLElement, delay: number, owner: number): void {
    if (timers.has(row) || revealed.has(row.dataset['settingsReveal'] ?? '')) return
    const run = (): void => {
      timers.delete(row)
      if (owner !== generation || !active || !row.isConnected) return
      const id = row.dataset['settingsReveal']
      if (id !== undefined) revealed.add(id)
      row.dataset['settingsRevealState'] = 'entering'
      observer?.unobserve(row)
    }
    if (delay === 0) run()
    else timers.set(row, setTimeout(run, delay))
  }
  function refresh(): void {
    stop()
    const root = viewport
    const section = input.page.value?.querySelector<HTMLElement>(`#${input.section.value}`)
    if (!active || !root || !section || input.motion() === 'none') {
      if (input.motion() === 'none') showAll()
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      showAll()
      return
    }
    const owner = generation
    const rows = [...section.querySelectorAll<HTMLElement>('[data-settings-reveal]')]
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (owner !== generation || !active) return
          let order = 0
          for (const entry of entries) {
            if (!(entry.target instanceof HTMLElement)) continue
            if (!entry.isIntersecting) {
              clearTimer(entry.target)
              continue
            }
            if (!routeReady) {
              settle(entry.target)
              continue
            }
            enter(entry.target, input.motion() === 'full' ? Math.min(order++ * 40, 80) : 0, owner)
          }
        },
        {
          root,
          rootMargin: `0px 0px ${String(Math.round(root.clientHeight / 10))}px 0px`,
          threshold: 0,
        },
      )
      const bounds = root.getBoundingClientRect()
      const initiallyVisible: HTMLElement[] = []
      for (const row of rows) {
        const id = row.dataset['settingsReveal']
        if (id === undefined || revealed.has(id)) {
          settle(row)
          continue
        }
        const box = row.getBoundingClientRect()
        const visible =
          box.bottom >= bounds.top &&
          box.top <= bounds.bottom &&
          box.right >= bounds.left &&
          box.left <= bounds.right
        if (visible && first && (input.restored || !routeReady)) {
          settle(row)
          continue
        }
        row.dataset['settingsRevealState'] = 'pending'
        observer.observe(row)
        if (visible) initiallyVisible.push(row)
      }
      // Commit the pending styles once before starting the initial visible rows.
      void root.getBoundingClientRect()
      initiallyVisible.forEach((row, index) => {
        enter(row, input.motion() === 'full' ? Math.min(index * 40, 80) : 0, owner)
      })
      first = false
    } catch {
      stop()
      showAll()
    }
  }
  function connect(element: HTMLElement | null): void {
    viewport = element
    if (element === null) {
      stop()
      return
    }
    queueMicrotask(refresh)
  }
  function expose(event: Event): void {
    const target = event.target
    if (!(target instanceof Element)) return
    const row = target.closest<HTMLElement>('[data-settings-reveal]')
    if (row && input.page.value?.contains(row)) settle(row)
  }
  watch(
    input.motion,
    (motion) => {
      if (motion === 'none') {
        stop()
        showAll()
      } else refresh()
    },
    { flush: 'sync' },
  )
  onDeactivated(() => {
    active = false
    stop()
  })
  onActivated(() => {
    if (!active) {
      active = true
      refresh()
    }
  })
  onScopeDispose(() => {
    active = false
    stop()
  })
  return { connect, refresh, expose }
}
