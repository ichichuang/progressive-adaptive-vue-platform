import * as G2 from '@antv/g2'
import type { CustomInteraction } from '@antv/g2'

type G2Element = ReturnType<typeof G2.selectG2Elements>[number]
type G2Animation = NonNullable<ReturnType<G2Element['animate']>>
interface HoverStyle {
  opacity: number
  lineWidth?: number
}
interface HoverState {
  datum: unknown
  original: { opacity: unknown; lineWidth?: unknown }
  base: HoverStyle
  target: HoverStyle
  animation: G2Animation | null
}

function datumOf(element: G2Element): unknown {
  return '__data__' in element ? element.__data__ : undefined
}

function numberOf(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readStyle(element: G2Element, lineWidth: boolean): HoverStyle {
  return {
    opacity: numberOf(element.getAttribute('opacity'), 1),
    ...(lineWidth ? { lineWidth: numberOf(element.getAttribute('lineWidth'), 0) } : {}),
  }
}

function writeStyle(element: G2Element, style: { opacity: unknown; lineWidth?: unknown }) {
  // G ignores undefined writes, and null removal can parse to NaN. Restore the
  // effective defaults explicitly when the caller did not specify an attribute.
  element.setAttribute('opacity', style.opacity ?? 1)
  if ('lineWidth' in style) element.setAttribute('lineWidth', style.lineWidth ?? 0)
}

function stopAnimation(state: HoverState) {
  const animation = state.animation
  state.animation = null
  if (!animation) return
  animation.onfinish = null
  animation.cancel()
}

/**
 * Private G2 interaction using the native canvas animation API. A native line element
 * is a complete series; points and other marks keep their individual hit targets.
 * Only opacity and unencoded line/point strokes change, never quantitative geometry.
 * The caller supplies semantic timing: full duration, short reduced duration, or zero.
 */
export function createG2Hover(
  duration: number,
  easing: string,
  movement = true,
): NonNullable<CustomInteraction['type']> {
  const interaction: NonNullable<CustomInteraction['type']> =
    () =>
    ({ container, view }) => {
      const plot = G2.selectPlotArea(container)
      const elements = G2.selectG2Elements(plot)
      const elementSet = new Set(elements)
      const states = new Map<G2Element, HoverState>()
      const pending = new Set<G2Animation>()
      const encodedSize = new Set(
        Array.from(view.markState.keys())
          .filter((mark) => {
            const size: unknown = mark.encode?.['size']
            if (size === undefined) return false
            // G2 infers a constant visual size even for ordinary points. Only
            // data-driven size must suppress stroke emphasis.
            if (
              size !== null &&
              typeof size === 'object' &&
              'visual' in size &&
              size.visual === true &&
              (!('field' in size) || size.field === undefined) &&
              'value' in size &&
              Array.isArray(size.value)
            ) {
              const values: unknown[] = size.value
              return values.some((value) => value !== values[0])
            }
            return true
          })
          .map((mark) => mark.key),
      )
      let active: G2Element | null = null
      let disposed = false

      function hasEncodedSize(element: G2Element): boolean {
        const datum = datumOf(element)
        return (
          typeof datum === 'object' &&
          datum !== null &&
          'markKey' in datum &&
          typeof datum.markKey === 'string' &&
          encodedSize.has(datum.markKey)
        )
      }

      function transition(element: G2Element, focused: boolean, dimmed: boolean) {
        let state = states.get(element)
        // Do not race G2's entry, data-update, or caller-owned animations. Resume the
        // current hover after they finish, even when the pointer has stopped moving.
        const foreign = element
          .getAnimations()
          .filter(
            (animation) =>
              animation !== state?.animation &&
              (animation.playState === 'running' || animation.playState === 'paused'),
          )
        if (foreign.length > 0) {
          for (const animation of foreign) {
            if (pending.has(animation)) continue
            pending.add(animation)
            void animation.finished.then(
              () => {
                pending.delete(animation)
                if (!disposed) update()
              },
              () => pending.delete(animation),
            )
          }
          return
        }
        if (!state) {
          if (!active) return
          const markType = 'markType' in element ? element.markType : undefined
          const emphasize =
            movement && (markType === 'line' || markType === 'point') && !hasEncodedSize(element)
          const base = readStyle(element, emphasize)
          state = {
            datum: datumOf(element),
            original: {
              opacity: element.getAttribute('opacity') as unknown,
              ...(emphasize ? { lineWidth: element.getAttribute('lineWidth') as unknown } : {}),
            },
            base,
            target: base,
            animation: null,
          }
          states.set(element, state)
        }
        const target: HoverStyle = {
          opacity: state.base.opacity * (dimmed ? 0.38 : 1),
          ...(state.base.lineWidth !== undefined
            ? {
                lineWidth: focused ? state.base.lineWidth * 1.5 : state.base.lineWidth,
              }
            : {}),
        }
        if (
          state.target.opacity === target.opacity &&
          state.target.lineWidth === target.lineWidth
        ) {
          if (!active && !state.animation) states.delete(element)
          return
        }
        // G's cancel clears animated attributes. Capture the displayed frame first,
        // then restore it before retargeting so fast pointer movement never snaps.
        const from = readStyle(element, state.base.lineWidth !== undefined)
        stopAnimation(state)
        state.target = target
        writeStyle(element, from)
        const animation =
          duration > 0
            ? element.animate([{ ...from }, { ...target }], { duration, easing, fill: 'both' })
            : null
        state.animation = animation
        if (!animation) {
          writeStyle(element, active ? target : state.original)
          if (!active) states.delete(element)
          return
        }
        const current = state
        animation.onfinish = () => {
          if (disposed || current.animation !== animation) return
          stopAnimation(current)
          writeStyle(element, active ? target : current.original)
          if (!active) states.delete(element)
        }
      }

      function update() {
        for (const element of elements)
          transition(element, element === active, active !== null && element !== active)
      }

      function pointerMove(event: { target: unknown }) {
        let target = event.target
        // Custom/group shapes can dispatch from a child rather than the G2 mark.
        while (target && typeof target === 'object' && !elementSet.has(target as G2Element)) {
          target = 'parentNode' in target ? target.parentNode : null
        }
        active = elementSet.has(target as G2Element) ? (target as G2Element) : null
        update()
      }

      function pointerLeave() {
        active = null
        update()
      }

      plot.addEventListener('pointerover', pointerMove)
      plot.addEventListener('pointermove', pointerMove)
      plot.addEventListener('pointerleave', pointerLeave)
      plot.addEventListener('pointerout', pointerLeave)
      return () => {
        disposed = true
        plot.removeEventListener('pointerover', pointerMove)
        plot.removeEventListener('pointermove', pointerMove)
        plot.removeEventListener('pointerleave', pointerLeave)
        plot.removeEventListener('pointerout', pointerLeave)
        for (const [element, state] of states) {
          // G2 may already have rebound a surviving mark to new data before this
          // cleanup runs. Never restore an old render's styling over that update.
          const restore =
            datumOf(element) === state.datum &&
            !element
              .getAnimations()
              .some(
                (animation) =>
                  animation !== state.animation &&
                  (animation.playState === 'running' || animation.playState === 'paused'),
              )
              ? state.original
              : {
                  opacity: element.getAttribute('opacity') as unknown,
                  ...(state.base.lineWidth !== undefined
                    ? { lineWidth: element.getAttribute('lineWidth') as unknown }
                    : {}),
                }
          stopAnimation(state)
          writeStyle(element, restore)
        }
        states.clear()
        pending.clear()
      }
    }
  interaction.props = { reapplyWhenUpdate: true }
  return interaction
}
