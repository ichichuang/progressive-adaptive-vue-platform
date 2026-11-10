import { nextTick } from 'vue'

import type { ShellScrollSnapshot } from './shell-scroll-contract'
import type { ShellScrollStorageContext } from './shell-scroll-storage-key'
import { createShellScrollStorage } from '../storage/shell-scroll-storage'

/** The application owns persistence; each UI owner only exposes its native viewport. */
export function createShellScroll(context: ShellScrollStorageContext) {
  const port = createShellScrollStorage(context.errorAdapter, context.isDisposed)
  const restored = port.read()
  const snapshot: ShellScrollSnapshot =
    restored.status === 'found'
      ? { ...restored.snapshot }
      : { schemaVersion: 1, sidebarTop: 0, drawerTop: 0, tabsLeft: 0 }
  let dirty = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  function persist(): void {
    clearTimeout(timer)
    timer = undefined
    if (dirty && port.write({ ...snapshot }).status === 'saved') dirty = false
  }
  function changed(): void {
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(persist, 120)
  }

  function bind(key: 'sidebarTop' | 'drawerTop' | 'tabsLeft', horizontal = false) {
    let viewport: HTMLElement | null = null
    let observer: ResizeObserver | undefined
    let pending = true
    let initialized = false
    let applied = 0
    let maximum = 0
    const offset = (element: HTMLElement): number =>
      horizontal ? element.scrollLeft : element.scrollTop
    const limit = (element: HTMLElement): number =>
      Math.max(
        0,
        horizontal
          ? element.scrollWidth - element.clientWidth
          : element.scrollHeight - element.clientHeight,
      )
    const visible = (element: HTMLElement): boolean =>
      element.isConnected && element.clientWidth > 0 && element.clientHeight > 0
    const bounded = (max: number): number => Math.min(max, Math.max(0, snapshot[key]))

    function capture(): void {
      const element = viewport
      if (element === null || pending || !visible(element)) return
      const currentMaximum = limit(element)
      const current = Math.max(0, Math.min(currentMaximum, offset(element)))
      // Browser clamping after a resize is not a new requested position. Retain the
      // desired offset so temporarily collapsed/short content can grow back again.
      if (currentMaximum !== maximum && current === bounded(currentMaximum)) return
      if (current === applied) return
      applied = current
      maximum = currentMaximum
      if (snapshot[key] === current) return
      snapshot[key] = current
      changed()
    }
    function restore(): void {
      const element = viewport
      if (element === null || !visible(element)) return
      if (!initialized) {
        initialized = true
        // Without a stored position, retain the UI owner's initial active-tab reveal.
        if (restored.status !== 'found') snapshot[key] = offset(element)
      }
      // ResizeObserver runs before paint. Do not defer its correction to another frame,
      // and do not reapply a stale snapshot when only a user scroll has changed.
      if (!pending) {
        capture()
        if (limit(element) === maximum) return
      }
      maximum = limit(element)
      applied = bounded(maximum)
      element.scrollTo(
        horizontal ? { left: applied, behavior: 'instant' } : { top: applied, behavior: 'instant' },
      )
      pending = false
    }
    function interrupt(): void {
      // An intentional interaction takes priority over a not-yet-restored viewport.
      if (!pending) return
      pending = false
      const element = viewport
      if (element === null) return
      applied = offset(element)
      maximum = limit(element)
      snapshot[key] = applied
      changed()
    }
    function detach(): void {
      capture()
      observer?.disconnect()
      observer = undefined
      viewport?.removeEventListener('scroll', capture)
      viewport?.removeEventListener('wheel', interrupt)
      viewport?.removeEventListener('pointerdown', interrupt)
      viewport?.removeEventListener('keydown', interrupt)
      viewport = null
    }
    function connect(element: HTMLElement | null): void {
      if (element === viewport || disposed) return
      detach()
      viewport = element
      pending = true
      if (element === null) return
      element.addEventListener('scroll', capture, { passive: true })
      element.addEventListener('wheel', interrupt, { passive: true })
      element.addEventListener('pointerdown', interrupt, { passive: true })
      element.addEventListener('keydown', interrupt)
      observer = new ResizeObserver(restore)
      observer.observe(element)
      if (element.firstElementChild !== null) observer.observe(element.firstElementChild)
      restore()
      void nextTick(() => {
        if (viewport === element && !disposed) restore()
      })
    }
    return { connect, capture, detach }
  }

  const sidebar = bind('sidebarTop')
  const drawer = bind('drawerTop')
  const tabs = bind('tabsLeft', true)
  const bindings = [sidebar, drawer, tabs]
  function flush(): void {
    for (const binding of bindings) binding.capture()
    persist()
  }
  function visibilityChanged(): void {
    if (document.visibilityState === 'hidden') flush()
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', visibilityChanged)
  function dispose(): void {
    if (disposed) return
    disposed = true
    for (const binding of bindings) binding.detach()
    persist()
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', visibilityChanged)
  }
  return { sidebar: sidebar.connect, drawer: drawer.connect, tabs: tabs.connect, dispose }
}
