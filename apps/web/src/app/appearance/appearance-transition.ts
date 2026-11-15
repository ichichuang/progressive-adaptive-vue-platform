import type { EffectiveAppearanceState } from '@platform/design-system'
import { nextTick } from 'vue'

type AppearanceTransitionKind = 'mode' | 'palette'
export type AppearanceTransitionOrigin = Readonly<{ x: number; y: number }>

const appearanceTransitionType = 'pavp-appearance'
const appearanceRiftType = 'pavp-appearance-rift'
let active: ViewTransition | undefined

export function settleAppearanceTransition(): Promise<void> | undefined {
  const transition = active
  if (transition === undefined) return
  transition.skipTransition()
  return transition.finished.catch(() => undefined)
}

export function readAppearanceTransitionOrigin(
  event: MouseEvent | KeyboardEvent,
): AppearanceTransitionOrigin | undefined {
  if (event instanceof MouseEvent && (event.detail > 0 || event.type === 'pointerdown')) {
    return { x: event.clientX, y: event.clientY }
  }

  const control =
    event.target instanceof Element
      ? event.target.closest('[data-ui-radio-card-option], button, [role="radio"]')
      : null
  const box = control?.getBoundingClientRect()
  return box === undefined ? undefined : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

function supportsAppearanceTransition(motion: EffectiveAppearanceState['motion']): boolean {
  return (
    motion === 'full' &&
    document.visibilityState === 'visible' &&
    typeof document.startViewTransition === 'function' &&
    'activeViewTransition' in document &&
    typeof document.documentElement.animate === 'function' &&
    CSS.supports('selector(:active-view-transition-type(pavp-appearance))') &&
    !document.activeViewTransition &&
    document.querySelector('[data-pavp-route-transition-direction]') === null
  )
}

function reveal(
  kind: AppearanceTransitionKind,
  origin: AppearanceTransitionOrigin | undefined,
): void {
  const width = document.documentElement.clientWidth
  const height = document.documentElement.clientHeight
  const x = Math.max(0, Math.min(width, origin?.x ?? width / 2))
  const y = Math.max(0, Math.min(height, origin?.y ?? height / 2))
  const horizontal = Math.max(x, width - x)
  const vertical = Math.max(y, height - y)
  const root = document.documentElement
  const pixels = (value: number): string => `${String(value)}px`
  if (kind === 'mode') {
    const radius = Math.ceil(Math.hypot(horizontal, vertical)) + 1
    const circle = (size: number): string => `circle(${pixels(size)} at ${pixels(x)} ${pixels(y)})`
    root.animate(
      { clipPath: [circle(0), circle(radius)] },
      {
        duration: 640,
        easing: 'cubic-bezier(0.22, 0.72, 0.24, 1)',
        fill: 'both',
        pseudoElement: '::view-transition-new(root)',
      },
    )
    return
  }

  const bend = Math.min(width, height) * 0.08
  const edge = Math.min(18, Math.max(8, bend * 0.28))
  const rift = [
    [
      [x, y],
      [x, y],
      [x, y],
      [x, y],
      [x, y],
      [x, y],
    ],
    [
      [x - bend * 1.6, -edge],
      [x + bend * 0.8, -edge],
      [x + bend * 2.6, y],
      [x + bend * 0.7, height + edge],
      [x - bend * 2.2, height + edge],
      [x - bend * 0.7, y],
    ],
    [
      [-edge, -edge],
      [width + edge, -edge],
      [width + edge, y],
      [width + edge, height + edge],
      [-edge, height + edge],
      [-edge, y],
    ],
  ] as const
  const contour = (vertices: readonly (readonly number[])[]): string =>
    vertices.map((vertex) => vertex.map(pixels).join(' ')).join(', ')
  const cut = rift.map((vertices) => `polygon(${contour(vertices)})`)
  // The edge is a hollow band; its inner contour is exactly the new page's reveal.
  const bands = rift.map((vertices, index) => {
    const thickness = index === 0 ? 0 : edge
    const outer = vertices.map(([left, top], vertex) => [
      left + (vertex >= 1 && vertex <= 3 ? thickness : -thickness),
      top + (vertex < 2 ? -thickness : vertex === 3 || vertex === 4 ? thickness : 0),
    ])
    const start = outer[0] ?? [x, y]
    const loop = [...outer, start, ...[...vertices, vertices[0]].reverse(), start]
    return `polygon(evenodd, ${contour(loop)})`
  })
  const timing = {
    duration: 800,
    easing: 'cubic-bezier(0.30, 0.25, 0.26, 1)',
    fill: 'both',
  } as const
  root.animate({ clipPath: cut }, { ...timing, pseudoElement: '::view-transition-new(root)' })
  root.animate(
    { clipPath: bands },
    { ...timing, pseudoElement: '::view-transition-new(pavp-rift-edge)' },
  )
}

/** Animate only explicit visual actions. The existing appearance boundary owns every commit. */
export function playAppearanceTransition(input: {
  readonly kind: AppearanceTransitionKind
  readonly motion: EffectiveAppearanceState['motion']
  readonly origin?: AppearanceTransitionOrigin | undefined
  readonly commit: () => void
}): ViewTransition | undefined {
  // Keep the first deliberate action; additional triggers neither interrupt nor replay it.
  if (active !== undefined) return
  if (!supportsAppearanceTransition(input.motion)) {
    input.commit()
    return
  }

  let transition: ViewTransition
  try {
    transition = document.startViewTransition({
      types:
        input.kind === 'palette'
          ? [appearanceTransitionType, appearanceRiftType]
          : [appearanceTransitionType],
      update: async () => {
        input.commit()
        await nextTick()
      },
    })
  } catch {
    input.commit()
    return
  }
  active = transition
  void transition.ready
    .then(() => {
      if (active !== transition) return
      if (getComputedStyle(document.documentElement, '::view-transition').display === 'none') {
        transition.skipTransition()
        return
      }
      reveal(input.kind, input.origin)
    })
    .catch(() => {
      transition.skipTransition()
    })
  void transition.finished
    .catch(() => undefined)
    .finally(() => {
      if (active === transition) active = undefined
    })
  void transition.updateCallbackDone.catch(() => undefined)
  return transition
}
