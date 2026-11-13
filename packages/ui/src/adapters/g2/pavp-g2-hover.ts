import * as G2 from '@antv/g2'
import type { CustomInteraction } from '@antv/g2'
import type { ChartTourRuntime } from '../../components/chart-tour-runtime'
import type { UiChartTourTarget } from '../../components/g2-chart-contracts'
export interface G2TourFocus {
  readonly runtime: ChartTourRuntime
  readonly targets: readonly UiChartTourTarget[]
  readonly seriesTooltip: boolean
}

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
  tour?: G2TourFocus,
): NonNullable<CustomInteraction['type']> {
  const interaction: NonNullable<CustomInteraction['type']> =
    () =>
    ({ container, view }, _views, emitter) => {
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
      const tourMatches = new Map<
        G2Element,
        { datum: Record<string, unknown>; x: unknown; ids: string[] }
      >()
      if (tour) {
        for (const element of elements) {
          const kind = 'markType' in element ? element.markType : undefined
          if (kind !== 'interval' && kind !== 'point') continue
          const binding = datumOf(element)
          if (
            !binding ||
            typeof binding !== 'object' ||
            !('markKey' in binding) ||
            !('index' in binding) ||
            typeof binding.index !== 'number'
          )
            continue
          const owner = Array.from(view.markState.keys()).find(
            (mark) => mark.key === binding.markKey,
          )
          const data: unknown = owner?.data
          const datum: unknown = Array.isArray(data) ? data[binding.index] : undefined
          if (!datum || typeof datum !== 'object' || Array.isArray(datum)) continue
          const row = datum as Record<string, unknown>
          const encode: unknown = owner?.encode?.['x']
          const field =
            encode &&
            typeof encode === 'object' &&
            'field' in encode &&
            typeof encode.field === 'string'
              ? encode.field
              : null
          tourMatches.set(element, {
            datum: row,
            x: field ? row[field] : undefined,
            ids: tour.targets
              .filter(
                (target) => Object.hasOwn(row, target.field) && row[target.field] === target.value,
              )
              .map((target) => target.id),
          })
        }
        tour.runtime.available([
          ...new Set([...tourMatches.values()].flatMap((match) => match.ids)),
        ])
      }
      let autoElements = new Set<G2Element>()
      let tooltipOwned = false

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
          if (!active && autoElements.size === 0) return
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
          if (!active && autoElements.size === 0 && !state.animation) states.delete(element)
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
          writeStyle(element, active || autoElements.size > 0 ? target : state.original)
          if (!active && autoElements.size === 0) states.delete(element)
          return
        }
        const current = state
        animation.onfinish = () => {
          if (disposed || current.animation !== animation) return
          stopAnimation(current)
          writeStyle(element, active || autoElements.size > 0 ? target : current.original)
          if (!active && autoElements.size === 0) states.delete(element)
        }
      }

      function update() {
        for (const element of elements)
          transition(
            element,
            active ? element === active : autoElements.has(element),
            active ? element !== active : autoElements.size > 0 && !autoElements.has(element),
          )
      }

      function syncTour(): void {
        const target = tour?.runtime.target()
        autoElements = new Set(
          [...tourMatches]
            .filter(([, match]) => target && match.ids.includes(target.id))
            .map(([element]) => element),
        )
        update()
        const first = [...autoElements][0]
        const match = first ? tourMatches.get(first) : undefined
        if (match && emitter && (!tour?.seriesTooltip || match.x !== undefined)) {
          tooltipOwned = true
          emitter.emit('tooltip:show', {
            nativeEvent: false,
            data: { data: tour?.seriesTooltip ? { x: match.x } : match.datum },
          })
        } else if (tooltipOwned) {
          tooltipOwned = false
          emitter?.emit('tooltip:hide', { nativeEvent: false })
        }
      }
      const unsubscribe = tour?.runtime.subscribe(syncTour)
      syncTour()

      function pointerMove(event: { target: unknown }) {
        let target = event.target
        // Custom/group shapes can dispatch from a child rather than the G2 mark.
        while (target && typeof target === 'object' && !elementSet.has(target as G2Element)) {
          target = 'parentNode' in target ? target.parentNode : null
        }
        active = elementSet.has(target as G2Element) ? (target as G2Element) : null
        update()
      }

      function pointerDown(event: { target: unknown }): void {
        pointerMove(event)
        const id = active ? tourMatches.get(active)?.ids[0] : undefined
        if (id) tour?.runtime.select(id)
      }
      function pointerLeave() {
        active = null
        update()
      }

      if (tour) plot.addEventListener('pointerdown', pointerDown)
      plot.addEventListener('pointerover', pointerMove)
      plot.addEventListener('pointermove', pointerMove)
      plot.addEventListener('pointerleave', pointerLeave)
      plot.addEventListener('pointerout', pointerLeave)
      return () => {
        disposed = true
        unsubscribe?.()
        if (tour) plot.removeEventListener('pointerdown', pointerDown)
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
