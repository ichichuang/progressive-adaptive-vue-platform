import Lenis, { type LenisOptions } from 'lenis'
import { OverlayScrollbars } from 'overlayscrollbars'
import 'overlayscrollbars/overlayscrollbars.css'
import { watch, type Ref } from 'vue'

import type { UiAppearanceSnapshot } from '@platform/design-system'
import type { UiScrollInput } from '../../components/scroll-contracts'

// A new gesture must take over from prior wheel inertia, including a synchronized
// table body/summary pair. This owns only cancellation, never offsets or targets.
let cancelActiveWheelMotion: (() => void) | undefined

/** Private vendor execution only; offsets and all navigation policy remain PAVP-owned. */
export function createScrollEnhancement(input: {
  readonly host: HTMLElement
  readonly viewport: HTMLElement
  readonly content: HTMLElement
  readonly horizontal: boolean
  readonly bothAxes?: boolean
  readonly viewportTarget?: boolean
  readonly textarea?: boolean
  readonly documentViewport?: boolean
}) {
  const { host, viewport, content } = input
  let lenis: Lenis | undefined
  let horizontalLenis: Lenis | undefined
  let disposed = false
  let scrollbar: ReturnType<typeof OverlayScrollbars> | undefined
  let textareaObserver: ResizeObserver | undefined

  function revealScrollbar(): void {
    host.removeAttribute('data-pavp-scroll-idle')
  }

  function onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') revealScrollbar()
  }

  function onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') return
    host.setAttribute('data-pavp-scroll-idle', '')
    // The first real leave ends the initial stationary-hover override. Subsequent
    // native enter/leave events let the vendor retain its own hover and timer state.
    scrollbar?.options({ scrollbars: { autoHide: 'leave' } })
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') revealScrollbar()
  }

  // Lenis clamps targets to a positive range; native RTL scrollLeft can be negative.
  function supportsSmoothAxis(): boolean {
    return !input.horizontal || getComputedStyle(viewport).direction === 'ltr'
  }

  function cancelMotion(): void {
    if (cancelActiveWheelMotion === cancelMotion) cancelActiveWheelMotion = undefined
    lenis?.stop()
    horizontalLenis?.stop()
    viewport.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' })
    lenis?.start()
    horizontalLenis?.start()
  }

  function cancelInputMotion(): void {
    cancelActiveWheelMotion?.()
    cancelMotion()
  }

  function resizeMotion(): void {
    lenis?.resize()
    horizontalLenis?.resize()
  }

  function destroyMotion(): void {
    cancelMotion()
    lenis?.destroy()
    horizontalLenis?.destroy()
    lenis = undefined
    horizontalLenis = undefined
  }

  function onNativePosition(): void {
    // Naive's public scrollTo and synchronized table ports write native offsets.
    // An interrupted animation must not overwrite that newer authoritative write.
    if (
      (horizontalLenis?.isScrolling === 'smooth' &&
        Math.abs(viewport.scrollLeft - horizontalLenis.animatedScroll) > 1) ||
      (lenis?.isScrolling === 'smooth' &&
        Math.abs(
          (input.horizontal ? viewport.scrollLeft : viewport.scrollTop) - lenis.animatedScroll,
        ) > 1)
    )
      cancelMotion()
  }

  function onBothAxesWheel(event: WheelEvent): void {
    if (!lenis || !horizontalLenis) return
    // A single input owner routes both axes before a virtualized vendor can write
    // the same offsets. Native scroll events still update its visible rows.
    if (event.defaultPrevented || event.ctrlKey || !event.cancelable) {
      cancelMotion()
      return
    }
    const mode = event.deltaMode
    const { deltaX, deltaY } = event
    const shiftWheel = event.shiftKey && deltaX === 0
    const lineHeight = mode === 1 ? Number.parseFloat(getComputedStyle(viewport).lineHeight) : 0
    const line = Number.isFinite(lineHeight) ? lineHeight : 16
    const x =
      (shiftWheel ? deltaY : deltaX) * (mode === 1 ? line : mode === 2 ? viewport.clientWidth : 1)
    const y =
      (shiftWheel ? 0 : deltaY) * (mode === 1 ? line : mode === 2 ? viewport.clientHeight : 1)
    const path = event.composedPath()
    const nested = path.slice(0, path.indexOf(viewport))
    if (
      (x !== 0 && getComputedStyle(viewport).direction !== 'ltr') ||
      nested.some(
        (node) =>
          node instanceof HTMLElement &&
          (node.hasAttribute('data-lenis-prevent') ||
            node.hasAttribute('data-lenis-prevent-wheel') ||
            (x !== 0 && node.hasAttribute('data-lenis-prevent-horizontal')) ||
            (y !== 0 && node.hasAttribute('data-lenis-prevent-vertical'))),
      )
    ) {
      cancelMotion()
      return
    }
    // A discrete table header can scroll X without any vertical content. Leave
    // pure Y input to its existing ancestor scroll chain instead of swallowing it.
    if ((x === 0 && y === 0) || (x === 0 && lenis.limit <= 0)) return
    if (cancelActiveWheelMotion !== cancelMotion) {
      cancelActiveWheelMotion?.()
      // A peer's latest scroll synchronization may precede its native scroll event.
      cancelMotion()
    }
    cancelActiveWheelMotion = cancelMotion
    event.preventDefault()
    // vueuc does not inspect defaultPrevented before writing its own wheel delta.
    // Stop only accepted enhanced input; native/reduced-motion events pass through.
    event.stopImmediatePropagation()
    if (x !== 0)
      horizontalLenis.scrollTo(horizontalLenis.targetScroll + x, {
        programmatic: false,
        lerp: horizontalLenis.options.lerp,
      })
    if (y !== 0)
      lenis.scrollTo(lenis.targetScroll + y, { programmatic: false, lerp: lenis.options.lerp })
  }

  function onTextareaInput(): void {
    cancelMotion()
    resizeMotion()
  }

  function setFullMotion(full: boolean): void {
    if (disposed) return
    if (!full || !supportsSmoothAxis()) {
      destroyMotion()
    } else {
      try {
        const options: LenisOptions = {
          wrapper: viewport,
          content,
          eventsTarget: viewport,
          orientation: input.horizontal ? 'horizontal' : 'vertical',
          gestureOrientation: input.horizontal ? 'both' : 'vertical',
          virtualScroll: ({ event }) => {
            if (input.textarea) resizeMotion()
            // Virtualized vendors may already own and cancel the same wheel event.
            if (!event.defaultPrevented && supportsSmoothAxis()) return true
            cancelMotion()
            return false
          },
          smoothWheel: true,
          // A small step above Lenis 1.3's 0.1 default shortens the settling tail.
          lerp: 0.12,
          syncTouch: false,
          autoResize: !input.viewportTarget,
          autoRaf: true,
          anchors: false,
          infinite: false,
          wheelMultiplier: 1,
          touchMultiplier: 1,
          overscroll: false,
          respectReducedMotion: false,
        }
        if (input.bothAxes && !input.horizontal) {
          // Lenis is single-axis. Both animators share the native viewport, but
          // neither listens to real wheel input: onBothAxesWheel is the sole owner.
          options.eventsTarget = document.createElement('div')
          horizontalLenis ??= new Lenis({
            ...options,
            orientation: 'horizontal',
            gestureOrientation: 'horizontal',
          })
        }
        lenis ??= new Lenis(options)
      } catch {
        destroyMotion()
        console.warn('PAVP wheel smoothing unavailable; native scrolling remains active.')
      }
    }
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    destroyMotion()
    revealScrollbar()
    host.removeEventListener('pointerenter', onPointerEnter)
    host.removeEventListener('pointerleave', onPointerLeave)
    host.removeEventListener('pointerdown', onPointerDown)
    host.removeEventListener('focusin', revealScrollbar)
    host.removeEventListener('pointerdown', cancelInputMotion, true)
    host.removeEventListener('keydown', cancelInputMotion, true)
    viewport.removeEventListener('input', onTextareaInput)
    viewport.removeEventListener('compositionstart', cancelMotion)
    viewport.removeEventListener('wheel', onBothAxesWheel, true)
    viewport.removeEventListener('scroll', onNativePosition)
    textareaObserver?.disconnect()
    scrollbar?.destroy()
  }

  try {
    const position = { left: viewport.scrollLeft, top: viewport.scrollTop }
    // Reload/re-entry can mount under a stationary pointer without a new enter event.
    // Seed visibility before creating rails; touch-only sticky :hover is not mouse hover.
    const canHover = window.matchMedia('(any-hover: hover)').matches
    const hovered = canHover && host.matches(':hover')
    host.toggleAttribute(
      'data-pavp-scroll-idle',
      canHover && !hovered && !host.matches(':focus-within'),
    )
    if (!input.textarea)
      scrollbar = OverlayScrollbars(
        input.documentViewport
          ? {
              target: host,
              elements: { viewport: host, content: false, padding: false },
              scrollbars: { slot: host },
            }
          : input.viewportTarget
            ? {
                target: viewport,
                elements: { viewport, content: false, padding: false },
                scrollbars: { slot: host },
              }
            : { target: host, elements: { viewport, content, padding: false } },
        {
          overflow: {
            x: input.horizontal || input.bothAxes ? 'scroll' : 'hidden',
            y: input.horizontal ? 'hidden' : 'scroll',
          },
          scrollbars: {
            theme: 'os-theme-pavp',
            visibility: 'auto',
            autoHide: hovered ? 'never' : 'leave',
            autoHideDelay: 0,
            autoHideSuspend: false,
            dragScroll: true,
            clickScroll: false,
          },
        },
        {
          updated: (_instance, { updateHints }) => {
            if (disposed) return
            if (updateHints.directionChanged) cancelMotion()
            // Content changes can alter overflow without resizing the content box.
            if (updateHints.overflowAmountChanged || updateHints.overflowEdgeChanged) resizeMotion()
          },
        },
      )
    if (
      input.documentViewport &&
      (scrollbar?.state().destroyed || scrollbar?.elements().scrollOffsetElement !== viewport)
    )
      throw new Error('Document scroll owner unavailable.')
    if (!input.textarea) viewport.scrollTo({ ...position, behavior: 'instant' })
    else {
      textareaObserver = new ResizeObserver(resizeMotion)
      textareaObserver.observe(viewport)
      viewport.addEventListener('input', onTextareaInput)
      viewport.addEventListener('compositionstart', cancelMotion)
    }
    host.addEventListener('pointerenter', onPointerEnter)
    host.addEventListener('pointerleave', onPointerLeave)
    host.addEventListener('pointerdown', onPointerDown)
    host.addEventListener('focusin', revealScrollbar)
    viewport.addEventListener('scroll', onNativePosition)
    if (input.bothAxes && !input.horizontal)
      viewport.addEventListener('wheel', onBothAxesWheel, { capture: true, passive: false })
    // Capture before a scrollbar drag or native keyboard action can compete with inertia.
    if (!input.documentViewport) {
      host.addEventListener('pointerdown', cancelInputMotion, true)
      host.addEventListener('keydown', cancelInputMotion, true)
    }
  } catch (error: unknown) {
    if (!input.textarea) scrollbar ??= OverlayScrollbars(host)
    dispose()
    throw error
  }

  return {
    cancelMotion,
    setFullMotion,
    hasPendingSmoothScroll: () =>
      lenis?.isScrolling === 'smooth' || horizontalLenis?.isScrolling === 'smooth',
    scrollTo(command: UiScrollInput): void {
      if (disposed) return
      const target = input.horizontal ? command.left : command.top
      if (command.behavior !== 'smooth') {
        // stop/start resets both public Lenis animation state and its target to actualScroll.
        // Native writes retain fractional offsets and browser clamping on both axes.
        lenis?.stop()
        horizontalLenis?.stop()
        viewport.scrollTo({ ...command, behavior: 'instant' })
        resizeMotion()
        lenis?.start()
        horizontalLenis?.start()
      } else if (
        lenis !== undefined &&
        horizontalLenis !== undefined &&
        getComputedStyle(viewport).direction === 'ltr'
      ) {
        cancelMotion()
        resizeMotion()
        if (command.left !== undefined) horizontalLenis.scrollTo(command.left)
        if (command.top !== undefined) lenis.scrollTo(command.top)
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

/** Present document rails only when the browser keeps its native scroll owner. */
export function attachDocumentScrollbar(): () => void {
  const viewport = document.documentElement
  const host = document.body
  if (
    document.scrollingElement !== viewport ||
    !OverlayScrollbars.env().scrollbarsHiding ||
    OverlayScrollbars(host) !== undefined
  )
    return () => undefined
  try {
    const enhancement = createScrollEnhancement({
      host,
      viewport,
      content: viewport,
      horizontal: false,
      bothAxes: true,
      documentViewport: true,
    })
    host.setAttribute('data-pavp-document-scroll', '')
    return () => {
      host.removeAttribute('data-pavp-document-scroll')
      enhancement.dispose()
    }
  } catch {
    console.warn('PAVP scroll: native fallback.')
    return () => undefined
  }
}

/** Keep Naive's viewport and virtual content in place while replacing only its rails. */
export function attachNaiveScrollbar(
  host: HTMLElement,
  viewport: HTMLElement,
  content: HTMLElement,
  xScrollable: boolean,
  appearance: Readonly<Ref<UiAppearanceSnapshot>>,
): () => void {
  const nativeViewport = content === viewport
  const textarea = viewport instanceof HTMLTextAreaElement
  const interactionHost = textarea ? host.parentElement : host
  const textareaRail = textarea ? host.nextElementSibling : null
  if (
    interactionHost === null ||
    !host.contains(viewport) ||
    (!nativeViewport && content.parentElement !== viewport) ||
    (textarea && !textareaRail?.hasAttribute('data-scrollbar-rail'))
  )
    return () => undefined
  const overflow = nativeViewport ? getComputedStyle(viewport) : undefined
  const scrollsX =
    overflow === undefined ? xScrollable : /^(auto|scroll)$/u.test(overflow.overflowX)
  const scrollsY = overflow === undefined || /^(auto|scroll)$/u.test(overflow.overflowY)
  if (!scrollsX && !scrollsY) return () => undefined
  const positionHost =
    !textarea && nativeViewport && getComputedStyle(interactionHost).position === 'static'
  if (positionHost) interactionHost.setAttribute('data-pavp-scroll-position', '')
  try {
    const enhancement = createScrollEnhancement({
      host: interactionHost,
      viewport,
      content,
      horizontal: !scrollsY && scrollsX,
      bothAxes: scrollsY && scrollsX,
      viewportTarget: true,
      textarea,
    })
    const stop = watch(() => appearance.value.motion === 'full', enhancement.setFullMotion, {
      immediate: true,
      flush: 'sync',
    })
    const marker = textarea ? 'data-pavp-textarea-scroll' : 'data-pavp-naive-scroll'
    interactionHost.setAttribute(marker, '')
    textareaRail?.setAttribute('data-pavp-textarea-rail', '')
    return () => {
      interactionHost.removeAttribute(marker)
      textareaRail?.removeAttribute('data-pavp-textarea-rail')
      stop()
      enhancement.dispose()
      if (positionHost) interactionHost.removeAttribute('data-pavp-scroll-position')
    }
  } catch {
    if (positionHost) interactionHost.removeAttribute('data-pavp-scroll-position')
    console.warn('PAVP scroll enhancement unavailable; Naive scrolling remains active.')
    return () => undefined
  }
}
