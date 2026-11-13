import {
  onActivated,
  onDeactivated,
  onScopeDispose,
  readonly,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import {
  createInteractionSession,
  type UiInteractionOptions,
  type UiInteractionPhase,
} from './interaction-session'
export type {
  UiInteractionDirection,
  UiInteractionGesture,
  UiInteractionOptions,
  UiInteractionPoint,
  UiInteractionPhase,
} from './interaction-session'

/**
 * Opt-in pointer gestures; normal scrolling and native clicks remain untouched.
 * Consumers own touch-action (e.g. pan-y for horizontal swipes) and provide
 * ordinary keyboard controls for the same action. Drag wins over swipe; a long
 * press cannot also tap. Coordinates are viewport CSS pixels, anchored at down.
 */
export function useUiInteraction(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: UiInteractionOptions,
) {
  const phase = shallowRef<UiInteractionPhase>('idle')
  const session = createInteractionSession(options, (value) => {
    phase.value = value
  })
  let enabled = true
  let captured: HTMLElement | undefined
  function release(pointer: number | undefined): void {
    const element = captured
    captured = undefined
    if (pointer !== undefined && element?.hasPointerCapture(pointer))
      element.releasePointerCapture(pointer)
  }
  function cancel(): void {
    const pointer = session.activePointer()
    session.cancel()
    release(pointer)
  }
  watch(
    () => toValue(target),
    (element, _previous, cleanup) => {
      cancel()
      if (element === null || element === undefined) return
      const controller = new AbortController()
      const listenerOptions = { signal: controller.signal }
      element.addEventListener(
        'pointerdown',
        (event) => {
          if (!enabled) return
          session.start(event)
          if (session.activePointer() === event.pointerId && element.isConnected) {
            element.setPointerCapture(event.pointerId)
            captured = element
          }
        },
        listenerOptions,
      )
      element.addEventListener(
        'pointermove',
        (event) => {
          session.move(event)
        },
        listenerOptions,
      )
      element.addEventListener(
        'pointerup',
        (event) => {
          if (session.activePointer() !== event.pointerId) return
          session.end(event)
          release(event.pointerId)
        },
        listenerOptions,
      )
      const cancelPointer = (event: PointerEvent): void => {
        if (event.pointerId === session.activePointer()) cancel()
      }
      element.addEventListener('pointercancel', cancelPointer, listenerOptions)
      element.addEventListener('lostpointercapture', cancelPointer, listenerOptions)
      element.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape') cancel()
        },
        listenerOptions,
      )
      element.ownerDocument.defaultView?.addEventListener('blur', cancel, listenerOptions)
      element.ownerDocument.addEventListener(
        'visibilitychange',
        () => {
          if (element.ownerDocument.hidden) cancel()
        },
        listenerOptions,
      )
      cleanup(() => {
        cancel()
        controller.abort()
      })
    },
    { flush: 'post', immediate: true },
  )
  onDeactivated(() => {
    enabled = false
    cancel()
  })
  onActivated(() => {
    enabled = true
  })
  onScopeDispose(cancel)
  return { phase: readonly(phase), cancel }
}
