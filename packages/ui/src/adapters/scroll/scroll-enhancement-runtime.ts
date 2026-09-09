import Lenis from 'lenis'
import { OverlayScrollbars } from 'overlayscrollbars'
import 'overlayscrollbars/overlayscrollbars.css'

import type { UiScrollInput } from '../../components/scroll-contracts'

/** Private vendor execution only; offsets and all navigation policy remain PAVP-owned. */
export function createScrollEnhancement(input: {
  readonly host: HTMLElement
  readonly viewport: HTMLElement
  readonly content: HTMLElement
  readonly mainContent: boolean
  readonly workspaceTabs: boolean
  readonly horizontal: boolean
  readonly navigation: boolean
}) {
  const { host, viewport, content } = input
  let lenis: Lenis | undefined
  let disposed = false
  let scrollbar: ReturnType<typeof OverlayScrollbars> | undefined

  // Lenis clamps targets to a positive range; native RTL scrollLeft can be negative.
  function supportsSmoothAxis(): boolean {
    return !input.horizontal || getComputedStyle(viewport).direction === 'ltr'
  }

  function cancelMotion(): void {
    lenis?.stop()
    viewport.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' })
    lenis?.start()
  }

  function setFullMotion(full: boolean): void {
    if (disposed) return
    if (!full || !(input.mainContent || input.workspaceTabs) || !supportsSmoothAxis()) {
      cancelMotion()
      lenis?.destroy()
      lenis = undefined
    } else {
      try {
        lenis ??= new Lenis({
          wrapper: viewport,
          content,
          eventsTarget: viewport,
          orientation: input.horizontal ? 'horizontal' : 'vertical',
          gestureOrientation: input.horizontal ? 'both' : 'vertical',
          virtualScroll: () => {
            if (supportsSmoothAxis()) return true
            cancelMotion()
            return false
          },
          smoothWheel: true,
          syncTouch: false,
          autoResize: true,
          autoRaf: true,
          anchors: false,
          infinite: false,
          wheelMultiplier: 1,
          touchMultiplier: 1,
          overscroll: false,
          respectReducedMotion: false,
        })
      } catch {
        console.warn('PAVP wheel smoothing unavailable; native scrolling remains active.')
      }
    }
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    cancelMotion()
    lenis?.destroy()
    lenis = undefined
    host.removeEventListener('pointerdown', cancelMotion, true)
    host.removeEventListener('keydown', cancelMotion, true)
    scrollbar?.destroy()
  }

  try {
    const position = { left: viewport.scrollLeft, top: viewport.scrollTop }
    scrollbar = OverlayScrollbars(
      { target: host, elements: { viewport, content, padding: false } },
      {
        overflow: {
          x: input.horizontal ? 'scroll' : 'hidden',
          y: input.horizontal ? 'hidden' : 'scroll',
        },
        scrollbars: {
          theme: 'os-theme-pavp',
          visibility: 'auto',
          autoHide: input.navigation ? 'leave' : 'never',
          autoHideSuspend: true,
          dragScroll: true,
          clickScroll: false,
        },
      },
      {
        updated: (_instance, { updateHints }) => {
          if (disposed || !input.workspaceTabs) return
          if (updateHints.directionChanged) cancelMotion()
          // Tab count and label changes can alter overflow without resizing the content box.
          if (updateHints.overflowAmountChanged || updateHints.overflowEdgeChanged) lenis?.resize()
        },
      },
    )
    viewport.scrollTo({ ...position, behavior: 'instant' })
    // Capture before a scrollbar drag or native keyboard action can compete with inertia.
    if (input.mainContent || input.workspaceTabs) {
      host.addEventListener('pointerdown', cancelMotion, true)
      host.addEventListener('keydown', cancelMotion, true)
    }
  } catch (error: unknown) {
    scrollbar ??= OverlayScrollbars(host)
    dispose()
    throw error
  }

  return {
    cancelMotion,
    setFullMotion,
    scrollTo(command: UiScrollInput): void {
      if (disposed) return
      const target = input.horizontal ? command.left : command.top
      if (command.behavior !== 'smooth') {
        // stop/start resets both public Lenis animation state and its target to actualScroll.
        // Native writes retain fractional offsets and browser clamping on both axes.
        lenis?.stop()
        viewport.scrollTo({ ...command, behavior: 'instant' })
        lenis?.resize()
        lenis?.start()
      } else if (lenis !== undefined && target !== undefined && supportsSmoothAxis()) {
        cancelMotion()
        if (input.horizontal && command.top !== undefined && command.top !== viewport.scrollTop)
          viewport.scrollTo({ top: command.top, behavior: 'smooth' })
        else if (
          !input.horizontal &&
          command.left !== undefined &&
          command.left !== viewport.scrollLeft
        )
          viewport.scrollTo({ left: command.left, behavior: 'smooth' })
        lenis.resize()
        lenis.scrollTo(target)
      } else {
        cancelMotion()
        viewport.scrollTo(command)
      }
    },
    dispose,
  }
}
