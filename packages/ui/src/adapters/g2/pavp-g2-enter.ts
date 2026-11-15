import type { selectG2Elements, stdlib } from '@antv/g2'

type Element = ReturnType<typeof selectG2Elements>[number]
type AnimationFactory = ReturnType<typeof stdlib>['animation.fadeIn']

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return undefined
}

function paintedOpacity(shape: Element, name: string, fallback: number): number {
  const styleSource = shape.style as unknown
  const styled =
    styleSource !== null && typeof styleSource === 'object' && name in styleSource
      ? (styleSource as Record<string, unknown>)[name]
      : undefined
  return (
    finiteNumber(styled === undefined ? (shape.getAttribute(name) as unknown) : styled) ?? fallback
  )
}

/**
 * Default entrance paints the finished mark immediately.
 * G2's scaleInY and fadeIn otherwise hide interval, line, area and point marks
 * for the whole theme enter duration.
 */
export function createG2VisibleEnter(): AnimationFactory {
  return (options) => (from, _to, defaults) => {
    const shape = from[0]
    if (!shape) return []
    const frame = {
      opacity: paintedOpacity(shape, 'opacity', 1),
      fillOpacity: paintedOpacity(shape, 'fillOpacity', 1),
      strokeOpacity: paintedOpacity(shape, 'strokeOpacity', 1),
    }
    return (
      shape.animate([frame, frame], {
        ...defaults,
        ...options,
        delay: 0,
        duration: 0,
      }) ?? []
    )
  }
}
