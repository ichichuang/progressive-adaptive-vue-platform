import * as G2 from '@antv/g2'
import type { G2Context } from '@antv/g2'

type G2Element = NonNullable<G2Context['canvas']>['document']['documentElement']
interface LabelFrame {
  readonly x: number
  readonly y: number
  readonly text: string
}

function labelsOf(context: G2Context): G2Element[] {
  return context.canvas?.document.getElementsByClassName<G2Element>(G2.LABEL_CLASS_NAME) ?? []
}

function frameOf(label: G2Element): LabelFrame | undefined {
  const x: unknown = label.getAttribute('x')
  const y: unknown = label.getAttribute('y')
  const text: unknown = label.getAttribute('text')
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x + y)
    ? { x, y, text: typeof text === 'string' || typeof text === 'number' ? String(text) : '' }
    : undefined
}

/** G2's native labels copy the final attributes without following their mark transition. */
export function captureG2Labels(context: G2Context): ReadonlyMap<G2Element, LabelFrame> {
  const frames = new Map<G2Element, LabelFrame>()
  for (const label of labelsOf(context)) {
    const frame = frameOf(label)
    if (frame) frames.set(label, frame)
  }
  return frames
}

export function animateG2Labels(
  context: G2Context,
  previous: ReadonlyMap<G2Element, LabelFrame>,
): void {
  for (const label of labelsOf(context)) {
    const from = previous.get(label)
    const to = frameOf(label)
    const datum: unknown = '__data__' in label ? label.__data__ : undefined
    if (!from || !to || !datum || typeof datum !== 'object' || !('dependentElement' in datum))
      continue
    const element = datum.dependentElement as G2Element | undefined
    // Only cartesian interval labels: transformed/path labels need their native geometry.
    if (element?.nodeName !== 'rect') continue
    const movement = element.getAnimations().find((animation) => {
      const timing = animation.effect.getTiming()
      return animation.playState === 'running' && Number(timing.duration) > 0
    })
    if (!movement) continue
    const timing = movement.effect.getTiming()
    const animation = label.animate(
      [
        { x: from.x, y: from.y },
        { x: to.x, y: to.y },
      ],
      { ...timing, fill: 'both' },
    )
    if (!animation) continue
    const numeric = /^-?\d+(?:\.\d+)?$/u
    const interpolateText = numeric.test(from.text) && numeric.test(to.text)
    const start = Number(from.text)
    const end = Number(to.text)
    const precision = to.text.split('.')[1]?.length ?? 0
    label.setAttribute('x', from.x)
    label.setAttribute('y', from.y)
    if (interpolateText) label.setAttribute('text', from.text)
    animation.onframe = () => {
      if (!interpolateText || label.destroyed) return
      const progress = animation.effect.getComputedTiming().progress ?? 0
      label.setAttribute('text', (start + (end - start) * progress).toFixed(precision))
    }
    animation.onfinish = () => {
      if (!label.destroyed) label.setAttribute('text', to.text)
    }
    // Use the chart's existing lifecycle/retarget queue, never a second RAF owner.
    context.animations?.push(animation)
  }
}
