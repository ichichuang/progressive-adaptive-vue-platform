export type UiInteractionDirection = 'left' | 'right' | 'up' | 'down'

export interface UiInteractionPoint {
  readonly x: number
  readonly y: number
}

export interface UiInteractionGesture {
  readonly origin: UiInteractionPoint
  readonly position: UiInteractionPoint
  readonly delta: UiInteractionPoint
  readonly pointerType: string
}

export interface UiInteractionOptions {
  /** Maximum travel in CSS pixels before tap and long press are cancelled. */
  readonly movementThreshold?: number
  /** Minimum displacement in CSS pixels for a swipe. */
  readonly swipeThreshold?: number
  readonly longPressDelay?: number
  readonly directions?: readonly UiInteractionDirection[]
  readonly onTap?: (gesture: UiInteractionGesture) => void
  readonly onLongPress?: (gesture: UiInteractionGesture) => void
  readonly onSwipe?: (direction: UiInteractionDirection, gesture: UiInteractionGesture) => void
  readonly onDrag?: (gesture: UiInteractionGesture) => void
  readonly onDragEnd?: (gesture: UiInteractionGesture) => void
  /** Cancelled drags never call onDragEnd. */
  readonly onCancel?: () => void
}

type PointerSample = Pick<
  PointerEvent,
  'pointerId' | 'pointerType' | 'clientX' | 'clientY' | 'button' | 'isPrimary'
>
export type UiInteractionPhase = 'idle' | 'pressing' | 'dragging' | 'long-pressed'

/** One pointer session. No DOM mutation, scrolling interception or global state. */
export function createInteractionSession(
  options: UiInteractionOptions,
  publish: (phase: UiInteractionPhase) => void,
) {
  const movementThreshold = options.movementThreshold ?? 10
  const swipeThreshold = options.swipeThreshold ?? 50
  const delay = options.longPressDelay ?? 500
  for (const value of [movementThreshold, swipeThreshold, delay]) {
    if (!Number.isFinite(value) || value < 0)
      throw new Error('Interaction thresholds must be finite and non-negative.')
  }
  if (swipeThreshold <= movementThreshold)
    throw new Error('Swipe threshold must exceed movement threshold.')
  let pointer: number | undefined
  let gesture: UiInteractionGesture | undefined
  let moved = false
  let longPressed = false
  let dragging = false
  let timer: ReturnType<typeof setTimeout> | undefined
  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  function clear(): void {
    clearTimer()
    pointer = undefined
    gesture = undefined
    moved = false
    longPressed = false
    dragging = false
    publish('idle')
  }
  function cancel(): void {
    const active = pointer !== undefined
    clear()
    if (active) options.onCancel?.()
  }
  function move(event: PointerSample): void {
    if (event.pointerId !== pointer || gesture === undefined) return
    gesture = {
      ...gesture,
      position: { x: event.clientX, y: event.clientY },
      delta: { x: event.clientX - gesture.origin.x, y: event.clientY - gesture.origin.y },
    }
    if (Math.hypot(gesture.delta.x, gesture.delta.y) > movementThreshold) {
      moved = true
      clearTimer()
    }
    if (moved && !longPressed && options.onDrag !== undefined) {
      dragging = true
      publish('dragging')
      options.onDrag(gesture)
    }
  }
  return {
    cancel,
    move,
    activePointer: () => pointer,
    start(event: PointerSample): void {
      if (pointer !== undefined || !event.isPrimary || event.button !== 0) return
      pointer = event.pointerId
      gesture = {
        origin: { x: event.clientX, y: event.clientY },
        position: { x: event.clientX, y: event.clientY },
        delta: { x: 0, y: 0 },
        pointerType: event.pointerType,
      }
      publish('pressing')
      if (options.onLongPress !== undefined) {
        timer = setTimeout(() => {
          timer = undefined
          if (gesture === undefined || moved) return
          longPressed = true
          publish('long-pressed')
          options.onLongPress?.(gesture)
        }, delay)
      }
    },
    end(event: PointerSample): void {
      if (event.pointerId !== pointer) return
      move(event)
      if (gesture === undefined) return
      const result = gesture
      const wasDragging = dragging
      const wasMoved = moved
      const wasLongPressed = longPressed
      clear()
      if (wasLongPressed) return
      if (wasDragging) {
        options.onDragEnd?.(result)
        return
      }
      const { x, y } = result.delta
      if (wasMoved && Math.max(Math.abs(x), Math.abs(y)) >= swipeThreshold) {
        const direction =
          Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down'
        if (options.directions === undefined || options.directions.includes(direction))
          options.onSwipe?.(direction, result)
      } else if (!wasMoved) options.onTap?.(result)
    },
  }
}
