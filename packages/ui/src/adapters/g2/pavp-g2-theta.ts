import type { selectG2Elements, stdlib } from '@antv/g2'

type Element = ReturnType<typeof selectG2Elements>[number]
type AnimationFactory = ReturnType<typeof stdlib>['animation.fadeIn']
interface Sector {
  start: number
  end: number
  inner: number
  outer: number
}
const turn = Math.PI * 2
const displayed = new WeakMap<Element, { path: unknown; sector: Sector }>()

// Native theta intervals are circular SVG paths, centered by a separate transform.
// Rounded/custom paths deliberately keep the caller's normal G2 animation behavior.
function readSector(path: unknown, origin: number): Sector | undefined {
  if (typeof path !== 'string' || /[^MLAZ\d\s.,e+\-]/u.test(path)) return
  const commands = Array.from(path.matchAll(/([MLAZ])([^MLAZ]*)/gu), (match) => ({
    type: match[1],
    values: (match[2]?.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gu) ?? []).map(Number),
  }))
  const start = commands[0]
  const arcs = commands.filter((command) => command.type === 'A')
  const outer = arcs[0]
  if (start?.type !== 'M' || outer?.values.length !== 7) return
  const [x, y] = start.values
  const [radius, radiusY, rotation] = outer.values
  if (
    x === undefined ||
    y === undefined ||
    radius === undefined ||
    radius !== radiusY ||
    rotation !== 0
  )
    return
  if (
    arcs.length > 4 ||
    arcs.some((arc) => arc.values.length !== 7 || arc.values[0] !== arc.values[1])
  )
    return
  const angle = Math.atan2(y, x)
  const startAngle = origin + ((angle - origin + turn) % turn)
  const outerArcs = arcs.filter((arc) => arc.values[0] === radius)
  const last = outerArcs.at(-1)
  const endX = last?.values[5]
  const endY = last?.values[6]
  if (endX === undefined || endY === undefined) return
  const clockwise = outer.values[4] === 1
  let span = (Math.atan2(endY, endX) - angle + turn) % turn
  if (!clockwise)
    span = 0 // G2's epsilon-width zero-weight sector.
  else if (outerArcs.length > 1 && span < 1e-4) span = turn
  const inner = arcs.find((arc) => arc.values[0] !== radius)?.values[0] ?? 0
  return { start: startAngle, end: startAngle + span, inner, outer: radius }
}

function sectorOf(element: Element, path: unknown, origin: number): Sector | undefined {
  const sector = readSector(path, origin)
  if (!sector) return
  const datum: unknown = '__data__' in element ? element.__data__ : undefined
  // Native paths wrap the final zero-weight slice back to the first angle. The
  // normalized end channel distinguishes the final seam from the first category.
  if (
    sector.end === sector.start &&
    Math.abs(sector.start - origin) < 0.001 &&
    datum !== null &&
    typeof datum === 'object' &&
    'y1' in datum &&
    datum.y1 === 0
  )
    return { ...sector, start: sector.start + turn, end: sector.end + turn }
  return sector
}

/** Reveal one complete composition, rather than growing every wedge separately. */
export function createG2ThetaEnter(origin = -Math.PI / 2): AnimationFactory {
  return (options) => (from, _to, defaults) => {
    const shape = from[0]
    if (!shape) return []
    const path: unknown = shape.getAttribute('d')
    const sector = sectorOf(shape, path, origin)
    if (sector) displayed.set(shape, { path, sector })
    const opacity = Number(shape.getAttribute('opacity') ?? 1)
    return shape.animate([{ opacity: 0 }, { opacity }], { ...defaults, ...options }) ?? []
  }
}

function sectorPath({ start, end, inner, outer }: Sector): string {
  const point = (radius: number, angle: number) =>
    `${String(radius * Math.cos(angle))},${String(radius * Math.sin(angle))}`
  // Two arcs also represent a complete circle, including a single selected category.
  const middle = (start + end) / 2
  return [
    `M${point(outer, start)}`,
    `A${String(outer)},${String(outer)},0,0,1,${point(outer, middle)}`,
    `A${String(outer)},${String(outer)},0,0,1,${point(outer, end)}`,
    `L${point(inner, end)}`,
    ...(inner > 0
      ? [
          `A${String(inner)},${String(inner)},0,0,0,${point(inner, middle)}`,
          `A${String(inner)},${String(inner)},0,0,0,${point(inner, start)}`,
        ]
      : []),
    'Z',
  ].join('')
}

/** Native timing with angular interpolation: adjacent wedges keep one circular boundary. */
export function createG2ThetaUpdate(origin = -Math.PI / 2): AnimationFactory {
  return (options) => (from, to, defaults) => {
    const source = from[0]
    const target = to[0]
    if (!source || !target || from.length !== 1 || to.length !== 1) return []
    const before: unknown = source.getAttribute('d')
    const after: unknown = target.getAttribute('d')
    const previous = displayed.get(source)
    let start = previous && previous.path === before ? previous.sector : readSector(before, origin)
    // Resize renders can rewrite radii without running an animation. Keep the
    // cached winding of a collapsed final slice while accepting its new geometry.
    if (
      start &&
      previous &&
      start.start === start.end &&
      Math.abs(start.start - origin) < 0.001 &&
      Math.abs(previous.sector.start - origin - turn) < 0.001
    )
      start = { ...start, start: start.start + turn, end: start.end + turn }
    const end = sectorOf(source, after, origin)
    if (!start || !end) return []
    // r is a native interpolable scalar, but does not affect SVG Path geometry. It
    // carries eased progress without a second clock or a global CSS registration.
    const originalRadius: unknown = source.getAttribute('r')
    const initial: Record<string, string | number> = { r: 0 }
    const final: Record<string, string | number> = { r: 1 }
    for (const property of [
      'transform',
      'fill',
      'stroke',
      'opacity',
      'fillOpacity',
      'strokeOpacity',
    ]) {
      const fallback = property.endsWith('Opacity') || property === 'opacity' ? 1 : 'none'
      const a: unknown = source.getAttribute(property)
      const b: unknown = target.getAttribute(property)
      initial[property] = typeof a === 'number' || typeof a === 'string' ? a : fallback
      final[property] = typeof b === 'number' || typeof b === 'string' ? b : fallback
    }
    const animation = source.animate([initial, final], { ...defaults, ...options })
    if (!animation) return []
    animation.onframe = () => {
      const progress = Number(source.getAttribute('r'))
      const interpolate = (a: number, b: number) => a + (b - a) * progress
      const sector = {
        start: interpolate(start.start, end.start),
        end: interpolate(start.end, end.end),
        inner: interpolate(start.inner, end.inner),
        outer: interpolate(start.outer, end.outer),
      }
      const path = sectorPath(sector)
      source.setAttribute('d', path)
      displayed.set(source, { path, sector })
    }
    animation.onfinish = () => {
      source.setAttribute('d', after)
      if (originalRadius === undefined) source.removeAttribute('r')
      else source.setAttribute('r', originalRadius)
      displayed.set(source, { path: after, sector: end })
    }
    return animation
  }
}
