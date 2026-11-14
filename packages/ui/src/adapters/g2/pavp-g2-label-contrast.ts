import * as G2 from '@antv/g2'
import type { G2Context } from '@antv/g2'

type Canvas = NonNullable<G2Context['canvas']>
type Element = Canvas['document']['documentElement']
interface Color {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly alpha: number
}
function color(value: unknown): Color | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'r' in value &&
    'g' in value &&
    'b' in value &&
    typeof value.r === 'number' &&
    typeof value.g === 'number' &&
    typeof value.b === 'number'
  ) {
    return {
      r: value.r,
      g: value.g,
      b: value.b,
      alpha: 'alpha' in value && typeof value.alpha === 'number' ? value.alpha : 1,
    }
  }
  if (typeof value !== 'string') return undefined
  if (value === 'transparent') return { r: 0, g: 0, b: 0, alpha: 0 }
  const hex = /^#([\da-f]{3,8})$/iu.exec(value)?.[1]
  if (hex && [3, 4, 6, 8].includes(hex.length)) {
    const full =
      hex.length < 5
        ? Array.from({ length: hex.length }, (_, index) => hex.charAt(index).repeat(2)).join('')
        : hex
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      alpha: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
    }
  }
  const rgb = /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/iu.exec(
    value,
  )
  return rgb
    ? {
        r: Number(rgb[1]),
        g: Number(rgb[2]),
        b: Number(rgb[3]),
        alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
      }
    : undefined
}
function styleOf(element: { readonly parsedStyle?: unknown }): Record<string, unknown> {
  const style: unknown = element.parsedStyle
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {}
}
function unit(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1
}
function over(front: Color, back: Color): Color {
  const alpha = unit(front.alpha)
  return {
    r: front.r * alpha + back.r * (1 - alpha),
    g: front.g * alpha + back.g * (1 - alpha),
    b: front.b * alpha + back.b * (1 - alpha),
    alpha: 1,
  }
}
/** Choose contrast against the visible composited mark, not its unblended base color. */
export function innerLabelContrast(
  fill: unknown,
  fillOpacity: unknown,
  opacity: unknown,
  background: unknown,
): string | undefined {
  const foreground = color(fill)
  const backdrop = color(background)
  if (!foreground || !backdrop) return undefined
  const visible = over(
    { ...foreground, alpha: unit(foreground.alpha) * unit(fillOpacity) * unit(opacity) },
    backdrop,
  )
  const linear = (value: number) => {
    const v = value / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const luminance =
    0.2126 * linear(visible.r) + 0.7152 * linear(visible.g) + 0.0722 * linear(visible.b)
  // Readability extrema for measured contrast, matching native G2 contrastReverse; not a page palette.
  // eslint-disable-next-line local/no-raw-ui-colors -- Adapter-only contrast endpoints; no theme/style authority is introduced.
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000' : '#fff'
}
function backdrop(canvas: Canvas, fallback: string): Color | undefined {
  const layers: Color[] = []
  const dom = canvas.getContextService().getDomElement()
  let element: globalThis.Element | null =
    typeof globalThis.Element !== 'undefined' && dom instanceof globalThis.Element ? dom : null
  while (element) {
    const style = getComputedStyle(element)
    if (style.backgroundImage !== 'none') return undefined
    const parsed = color(style.backgroundColor)
    if (parsed) {
      layers.push(parsed)
      if (parsed.alpha >= 1) break
    }
    element = element.parentElement
  }
  let result = color(fallback)
  if (!result) return undefined
  for (const layer of layers.reverse()) result = over(layer, result)
  return result
}
/** Export and label contrast share the same actual DOM underlay. Nonuniform paint is unsupported. */
export function resolveG2CanvasBackground(
  context: G2Context,
  fallback: string,
): string | undefined {
  const result = context.canvas ? backdrop(context.canvas, fallback) : undefined
  // eslint-disable-next-line local/no-raw-ui-colors -- Serialize the measured DOM composite, not a new palette value.
  return result ? `rgb(${String(result.r)}, ${String(result.g)}, ${String(result.b)})` : undefined
}
function sceneBackdrop(mark: Element, label: Element, background: Color): Color | undefined {
  const ancestors: NonNullable<Element['parentElement']>[] = []
  let ancestor = mark.parentElement
  while (ancestor && typeof ancestor.getAttribute === 'function') {
    ancestors.unshift(ancestor)
    ancestor = ancestor.parentElement
  }
  const point = label.getBounds().center
  let result = background
  for (const view of ancestors) {
    if (view.getAttribute('className') !== G2.VIEW_CLASS_NAME) continue
    for (const child of view.children) {
      if (child.getAttribute('className') !== G2.AREA_CLASS_NAME) continue
      const bounds = child.getBounds()
      if (
        Math.abs(point[0] - bounds.center[0]) > bounds.halfExtents[0] ||
        Math.abs(point[1] - bounds.center[1]) > bounds.halfExtents[1]
      )
        continue
      const fill = color(styleOf(child)['fill'])
      if (!fill) return undefined // Gradient/image backgrounds have no single contrast color.
      result = over(
        {
          ...fill,
          alpha:
            unit(fill.alpha) *
            unit(styleOf(child)['fillOpacity']) *
            unit(styleOf(child)['opacity']),
        },
        result,
      )
    }
  }
  return result
}
interface ContrastRuntime {
  readonly labels: Map<Element, { readonly mark: Element; readonly fallback: string }>
  readonly invalidate: () => void
  readonly update: () => void
  readonly dispose: () => void
}
const runtimes = new WeakMap<Canvas, ContrastRuntime>()
function runtime(canvas: Canvas): ContrastRuntime {
  const existing = runtimes.get(canvas)
  if (existing) return existing
  const labels: ContrastRuntime['labels'] = new Map()
  let dirty = true
  const invalidate = () => {
    dirty = true
  }
  const changed = (event: unknown) => {
    if (
      !event ||
      typeof event !== 'object' ||
      !('attrName' in event) ||
      !['fill', 'fillOpacity', 'opacity'].includes(String(event.attrName))
    )
      return
    const target = 'target' in event ? event.target : undefined
    if (target && labels.has(target as Element)) return
    dirty = true
  }
  const update = () => {
    if (!labels.size || !dirty) return
    dirty = false
    const backgrounds = new Map<string, Color | undefined>()
    for (const [label, entry] of labels) {
      if (label.destroyed || entry.mark.destroyed) {
        labels.delete(label)
        continue
      }
      if (!backgrounds.has(entry.fallback))
        backgrounds.set(entry.fallback, backdrop(canvas, entry.fallback))
      const domBackground = backgrounds.get(entry.fallback)
      const background = domBackground ? sceneBackdrop(entry.mark, label, domBackground) : undefined
      // G Canvas uses resolved (inherited) parsed opacity, not a product of ancestors.
      const fill = innerLabelContrast(
        styleOf(entry.mark)['fill'],
        styleOf(entry.mark)['fillOpacity'],
        unit(styleOf(entry.mark)['opacity']),
        background,
      )
      if (fill && label.getAttribute('fill') !== fill) label.setAttribute('fill', fill)
    }
  }
  const dispose = () => {
    canvas.removeEventListener('beforerender', update)
    canvas.removeEventListener('DOMAttrModified', changed)
    canvas.removeEventListener('beforedestroy', dispose)
    labels.clear()
    runtimes.delete(canvas)
  }
  // Reuse G's render lifecycle: animations and direct mark opacity changes are already
  // applied here. No second RAF, timer, animation callback replacement or mutation loop.
  canvas.addEventListener('beforerender', update)
  canvas.addEventListener('DOMAttrModified', changed)
  canvas.addEventListener('beforedestroy', dispose)
  const result = { labels, invalidate, update, dispose }
  runtimes.set(canvas, result)
  return result
}
/** Private native label transform. Only labels admitted by the options owner enter here. */
export function createG2InnerContrast(fallback: string) {
  return () =>
    (labels: Element[], context: { readonly canvas: Canvas }): Element[] => {
      const owner = runtime(context.canvas)
      for (const label of labels) {
        const mark: unknown = label.getAttribute('dependentElement')
        if (mark && typeof mark === 'object' && 'parsedStyle' in mark)
          owner.labels.set(label, { mark: mark as Element, fallback })
      }
      owner.invalidate()
      owner.update()
      return labels
    }
}
/** A new spec can replace an automatic label with an explicit color or outside label. */
export function resetG2LabelContrast(context: G2Context): void {
  if (context.canvas) {
    const owner = runtimes.get(context.canvas)
    owner?.labels.clear()
    owner?.invalidate()
  }
}
export function disposeG2LabelContrast(context: G2Context): void {
  if (context.canvas) runtimes.get(context.canvas)?.dispose()
}
