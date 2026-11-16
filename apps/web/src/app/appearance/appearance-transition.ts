import {
  projectSettingsColorMotion,
  type EffectiveAppearanceState,
  type UiAppearanceSnapshot,
} from '@platform/design-system'
import type { UiMotionController, UiMotionHandle } from '@platform/ui'
import { nextTick } from 'vue'
import { getCinematicRouteRecipe } from '../router/route-transition/route-transition-showcase'

type AppearanceTransitionKind = 'mode' | 'palette'
export type AppearanceTransitionOrigin = Readonly<{ x: number; y: number }>

const appearanceTransitionType = 'pavp-appearance'
const appearanceRiftType = 'pavp-appearance-rift'
const settingsSceneSelector = '.wb-settings-page'
const modeTiming = {
  duration: 640,
  easing: 'cubic-bezier(0.22,0.72,0.24,1)',
  fill: 'both',
} as const
const paletteTiming = {
  duration: 800,
  easing: 'cubic-bezier(0.30,0.25,0.26,1)',
  fill: 'both',
} as const
interface ActiveAppearanceTransition {
  readonly transition: ViewTransition
  readonly commit: () => void
  committed: boolean
}

let active: ActiveAppearanceTransition | undefined
let settingsFrame: { readonly target: Readonly<UiAppearanceSnapshot>; dispose(): void } | undefined
let settingsColorMotion:
  | {
      readonly target: Readonly<UiAppearanceSnapshot>
      readonly projection: ReturnType<typeof projectSettingsColorMotion>
    }
  | undefined
let settingsCleanup: ReturnType<typeof setTimeout> | undefined
let settingsColorFrame: number | undefined

export function finishSettingsAppearance(): void {
  if (settingsFrame === undefined && settingsColorMotion === undefined) return
  settingsFrame?.dispose()
  settingsFrame = undefined
  settingsColorMotion = undefined
  clearTimeout(settingsCleanup)
  if (settingsColorFrame !== undefined) cancelAnimationFrame(settingsColorFrame)
  settingsColorFrame = undefined
  document.documentElement.removeAttribute('data-pavp-settings-appearance')
}

export function reconcileSettingsAppearance(snapshot: Readonly<UiAppearanceSnapshot>): void {
  const target = settingsFrame?.target ?? settingsColorMotion?.target
  if (target === undefined || target === snapshot) return
  if (
    target.colorMode !== snapshot.colorMode ||
    target.themeEntry.definition !== snapshot.themeEntry.definition ||
    target.contrast !== snapshot.contrast ||
    target.colorStyle !== snapshot.colorStyle ||
    target.material !== snapshot.material ||
    target.motion !== snapshot.motion ||
    target.fontScale !== snapshot.fontScale ||
    target.density !== snapshot.density ||
    target.radius !== snapshot.radius
  )
    finishSettingsAppearance()
}

function animateReducedSettingsAppearance(
  kind: AppearanceTransitionKind,
  previous: Readonly<UiAppearanceSnapshot>,
  next: Readonly<UiAppearanceSnapshot>,
): void {
  if (
    next.motion === 'none' ||
    document.visibilityState !== 'visible' ||
    document.querySelector('[data-pavp-route-transition-direction]') !== null
  ) {
    finishSettingsAppearance()
    return
  }
  const root = document.documentElement
  // Carry the channel bounds of a running transition. The browser retargets the
  // actual CSS properties, so no presentational color overrides or DOM reads are needed.
  const projection = projectSettingsColorMotion(previous, next, settingsColorMotion?.projection)
  const motion = { target: next, projection }
  settingsColorMotion = motion
  root.setAttribute('data-pavp-settings-appearance', [kind, ...projection.surfaces].join(' '))
  clearTimeout(settingsCleanup)
  if (settingsColorFrame !== undefined) cancelAnimationFrame(settingsColorFrame)
  settingsColorFrame = requestAnimationFrame(() => {
    settingsColorFrame = undefined
    const token = getComputedStyle(root).getPropertyValue('--ui-motion-duration').trim()
    const duration = Number.parseFloat(token) * (token.endsWith('ms') ? 1 : 1000)
    if (!Number.isFinite(duration) || duration <= 0) {
      finishSettingsAppearance()
      return
    }
    // A property that keeps its destination may still be completing an earlier palette change.
    settingsCleanup = setTimeout(() => {
      if (settingsColorMotion === motion) finishSettingsAppearance()
    }, duration / 2)
  })
}

function commitOnce(operation: ActiveAppearanceTransition): void {
  if (operation.committed) return
  operation.committed = true
  operation.commit()
}

/** A skipped View Transition still runs its update callback. Apply that update exactly once. */
export function interruptAppearanceTransition(): ViewTransition | undefined {
  const operation = active
  if (operation === undefined) return
  active = undefined
  try {
    operation.transition.skipTransition()
  } catch {
    // An unavailable visual transition must not prevent an accepted update.
  }
  commitOnce(operation)
  return operation.transition
}

export function settleAppearanceTransition(): Promise<void> | undefined {
  finishSettingsAppearance()
  const transition = interruptAppearanceTransition()
  if (transition === undefined) return
  return Promise.allSettled([transition.updateCallbackDone, transition.finished]).then(
    () => undefined,
  )
}

export function readAppearanceTransitionOrigin(
  event: MouseEvent | KeyboardEvent,
): AppearanceTransitionOrigin | undefined {
  if (event instanceof MouseEvent && (event.detail > 0 || event.type === 'pointerdown')) {
    return { x: event.clientX, y: event.clientY }
  }

  const control =
    event.target instanceof Element
      ? event.target.closest('[data-ui-radio-card-option], button, [role="radio"], label')
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

function revealGeometry(origin: AppearanceTransitionOrigin | undefined) {
  const width = document.documentElement.clientWidth
  const height = document.documentElement.clientHeight
  const x = Math.max(0, Math.min(width, origin?.x ?? width / 2))
  const y = Math.max(0, Math.min(height, origin?.y ?? height / 2))
  return { width, height, x, y }
}

type RevealGeometry = ReturnType<typeof revealGeometry>
const pixels = (value: number): string => `${String(value)}px`
const contour = (vertices: readonly (readonly number[])[]): string =>
  vertices.map((vertex) => vertex.map(pixels).join(' ')).join(', ')

function inverseClip({ width, height }: RevealGeometry, opening: readonly (readonly number[])[]) {
  const viewport = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
    [0, 0],
  ] as const
  return `polygon(evenodd, ${contour([...viewport, ...opening, opening[0] ?? viewport[0], viewport[0]])})`
}

function modeClip(geometry: RevealGeometry, inverse: boolean): string[] {
  const { width, height, x, y } = geometry
  const radius = Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y))) + 1
  // Keep the polygon within half a CSS pixel of the circle on large viewports.
  const segments = Math.max(64, Math.ceil(Math.PI * Math.sqrt(radius)))
  return [0, radius].map((r) => {
    if (!inverse) return `circle(${pixels(r)} at ${pixels(x)} ${pixels(y)})`
    const opening = Array.from({ length: segments }, (_, index) => {
      const angle = (2 * Math.PI * index) / segments
      return [x + Math.cos(angle) * r, y + Math.sin(angle) * r]
    })
    return inverseClip(geometry, opening)
  })
}

function paletteClips(geometry: RevealGeometry, inverse: boolean) {
  const { width, height, x, y } = geometry
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
  const cut = rift.map((vertices) =>
    inverse ? inverseClip(geometry, vertices) : `polygon(${contour(vertices)})`,
  )
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
  return { cut, bands }
}

function reveal(
  kind: AppearanceTransitionKind,
  origin: AppearanceTransitionOrigin | undefined,
): void {
  const geometry = revealGeometry(origin)
  const root = document.documentElement
  if (kind === 'mode') {
    root.animate(
      { clipPath: modeClip(geometry, false) },
      { ...modeTiming, pseudoElement: '::view-transition-new(root)' },
    )
    return
  }
  const { cut, bands } = paletteClips(geometry, false)
  root.animate(
    { clipPath: cut },
    { ...paletteTiming, pseudoElement: '::view-transition-new(root)' },
  )
  root.animate(
    { clipPath: bands },
    { ...paletteTiming, pseudoElement: '::view-transition-new(pavp-rift-edge)' },
  )
}

function resolveFrameLength(value: string, pixelsPerRem: number): string {
  return value.replace(/(-?(?:\d*\.)?\d+)rem\b/gu, (_, length: string) =>
    pixels(Number(length) * pixelsPerRem),
  )
}

function captureSettingsPaint(shell: HTMLElement, preserveSize: boolean) {
  const old = document.createElement('div')
  old.classList.add('pavp-appearance-settings-old')
  const paint = getComputedStyle(document.documentElement)
  const appearanceRole = /^--ui-(?:color|admin|material)-/u
  const sizeRole =
    /^--ui-(?:control-|font-size-|icon-size-|layout-|space-|workbench-specimen-|radius-(?:control|panel|small)$)/u
  const pixelsPerRem = Number.parseFloat(paint.fontSize)
  for (let index = 0; index < paint.length; index++) {
    const name = paint.item(index)
    if (appearanceRole.test(name)) old.style.setProperty(name, paint.getPropertyValue(name))
    if (preserveSize) {
      if (sizeRole.test(name))
        old.style.setProperty(name, resolveFrameLength(paint.getPropertyValue(name), pixelsPerRem))
    }
  }
  old.style.setProperty('color-scheme', paint.colorScheme)

  // Retain the source foreground and backing surface together. The stripped
  // copy is inert and cannot join live radio groups or claim scroll identities.
  const copy = shell.cloneNode(true) as HTMLElement
  if (preserveSize) {
    // Material rules follow the live root. Retain their resolved paint on the outgoing copy.
    for (const selector of [
      '.pavp-admin-shell__header',
      '.pavp-admin-shell__sidebar',
      '.pavp-admin-shell__navigation-action[aria-current="page"]',
    ]) {
      const source = shell.querySelector(selector)
      const replica = copy.querySelector<HTMLElement>(selector)
      if (!source || !replica) continue
      const optics = getComputedStyle(source)
      replica.style.setProperty(
        '-webkit-backdrop-filter',
        optics.getPropertyValue('-webkit-backdrop-filter'),
      )
      replica.style.setProperty('backdrop-filter', optics.getPropertyValue('backdrop-filter'))
      replica.style.setProperty('box-shadow', optics.getPropertyValue('box-shadow'))
    }
  }
  for (const node of copy.querySelectorAll('[id], [name], [data-scroll-owner]')) {
    node.removeAttribute('id')
    node.removeAttribute('name')
    node.removeAttribute('data-scroll-owner')
  }
  const viewport = '.pavp-scroll-area__viewport'
  const peers = copy.querySelectorAll<HTMLElement>(viewport)
  const offsets = new Map<Element, HTMLElement>()
  shell.querySelectorAll<HTMLElement>(viewport).forEach((live, index) => {
    const peer = peers[index]
    if (peer) offsets.set(live, peer)
  })
  old.append(copy)
  return {
    layer: old,
    offsets,
    animateMask: (clipPath: string[], timing: KeyframeAnimationOptions) =>
      old.animate({ clipPath }, timing),
  }
}

type SettingsPaint = ReturnType<typeof captureSettingsPaint>

function mountSettingsFrame(
  shell: HTMLElement,
  paint: SettingsPaint,
  target: Readonly<UiAppearanceSnapshot>,
  cancel: () => void,
  hasBackdrop = false,
) {
  const frame = document.createElement('div')
  frame.classList.add('pavp-appearance-settings-frame')
  if (hasBackdrop) frame.classList.add('pavp-appearance-settings-frame--rift')
  frame.inert = true
  frame.setAttribute('aria-hidden', 'true')
  const listening = new AbortController()
  let offsets = paint.offsets
  const syncOffset = (live: Element, copy: HTMLElement): void => {
    copy.scrollTo({ top: live.scrollTop, left: live.scrollLeft, behavior: 'instant' })
  }
  const replace = (next: SettingsPaint): void => {
    frame.replaceChildren(next.layer)
    offsets = next.offsets
    offsets.forEach((copy, live) => {
      syncOffset(live, copy)
    })
  }
  const operation = {
    target,
    dispose: () => {
      listening.abort()
      frame.remove()
      cancel()
    },
  }
  settingsFrame = operation
  document.documentElement.setAttribute('data-pavp-settings-appearance', 'reveal')
  document.body.append(frame)
  if (getComputedStyle(frame).display === 'none') {
    finishSettingsAppearance()
    return
  }
  replace(paint)
  shell.addEventListener(
    'scroll',
    (event) => {
      if (!(event.target instanceof Element)) return
      const copy = offsets.get(event.target)
      if (copy) syncOffset(event.target, copy)
    },
    { capture: true, passive: true, signal: listening.signal },
  )
  window.addEventListener('resize', finishSettingsAppearance, { signal: listening.signal })
  shell.addEventListener(
    'focusin',
    (event) => {
      if (event.target instanceof Element && event.target.matches(':focus-visible'))
        finishSettingsAppearance()
    },
    { signal: listening.signal },
  )
  return { frame, operation, replace }
}

function prepareSettingsReveal(
  scene: Element,
  kind: AppearanceTransitionKind,
  geometry: RevealGeometry,
): ((target: Readonly<UiAppearanceSnapshot>) => void) | undefined {
  const shell = scene.closest('.pavp-admin-shell')
  if (!(shell instanceof HTMLElement)) return
  const paint = captureSettingsPaint(shell, false)
  return (target) => {
    const animations: Animation[] = []
    const mounted = mountSettingsFrame(shell, paint, target, () => {
      for (const animation of animations) animation.cancel()
    })
    if (mounted === undefined) return
    const { frame, operation } = mounted
    const palette = kind === 'palette' ? paletteClips(geometry, true) : undefined
    const timing = palette === undefined ? modeTiming : paletteTiming
    try {
      const mask = paint.animateMask(palette?.cut ?? modeClip(geometry, true), timing)
      animations.push(mask)
      if (
        !(mask.effect instanceof KeyframeEffect) ||
        !mask.effect.getKeyframes()[0]?.['clipPath']
      ) {
        finishSettingsAppearance()
        return
      }
      if (palette !== undefined) {
        const edge = document.createElement('div')
        edge.classList.add('pavp-appearance-rift-edge')
        frame.append(edge)
        animations.push(edge.animate({ clipPath: palette.bands }, timing))
      }
    } catch {
      finishSettingsAppearance()
      return
    }
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (settingsFrame === operation) finishSettingsAppearance()
    })
  }
}

function supportsSettingsReveal(): boolean {
  return (
    document.visibilityState === 'visible' &&
    document.querySelector('[data-pavp-route-transition-direction]') === null &&
    typeof document.documentElement.animate === 'function'
  )
}

/** Use the Welcome recipe over the entire settings shell with the live DOM underneath. */
export async function playSettingsComfortTransition(input: {
  readonly scene: HTMLElement | null
  readonly player: UiMotionController
  readonly origin: AppearanceTransitionOrigin | undefined
  readonly changesMotion: boolean
  readonly readSnapshot: () => Readonly<UiAppearanceSnapshot>
  readonly commit: () => boolean
}): Promise<void> {
  interruptAppearanceTransition()
  finishSettingsAppearance()
  const previous = input.readSnapshot()
  const shell = input.scene?.closest<HTMLElement>('.pavp-admin-shell')
  const old =
    shell && (previous.motion === 'full' || input.changesMotion) && supportsSettingsReveal()
      ? captureSettingsPaint(shell, true)
      : undefined
  if (!input.commit() || old === undefined || !shell) return

  const target = input.readSnapshot()
  const full = target.motion === 'full'
  if (!full && (target.motion === 'none' || !input.changesMotion)) return
  if (
    previous.contrast === target.contrast &&
    previous.fontScale === target.fontScale &&
    previous.density === target.density &&
    previous.material === target.material &&
    previous.radius === target.radius &&
    previous.motion === target.motion
  )
    return

  let playback: UiMotionHandle | undefined
  const mounted = mountSettingsFrame(shell, old, target, () => playback?.cancel(), full)
  if (mounted === undefined) return
  const { operation, replace } = mounted
  const recipe = getCinematicRouteRecipe('theme-rift')
  const origin =
    input.origin === undefined
      ? {}
      : { origin: { clientX: input.origin.x, clientY: input.origin.y } }
  try {
    playback = input.player.play(old.layer, {
      preset: recipe.exit,
      phase: 'exit',
      durationMs: recipe.coverMs,
      ...origin,
    })
    const covered = await playback.finished
    if (!full || settingsFrame !== operation || covered.kind !== 'completed' || !shell.isConnected)
      return
    const incoming = captureSettingsPaint(shell, false)
    playback.cancel()
    replace(incoming)
    playback = input.player.play(incoming.layer, {
      preset: recipe.enter,
      phase: 'enter',
      durationMs: recipe.revealMs,
      ...origin,
    })
    await playback.finished
  } finally {
    if (settingsFrame === operation) finishSettingsAppearance()
  }
}

/** Animate only explicit visual actions. The existing appearance boundary owns every commit. */
export function playAppearanceTransition(input: {
  readonly kind: AppearanceTransitionKind
  readonly motion: EffectiveAppearanceState['motion']
  readonly origin?: AppearanceTransitionOrigin | undefined
  readonly isCurrent?: () => boolean
  readonly readSnapshot?: () => Readonly<UiAppearanceSnapshot>
  readonly commit: () => boolean
}): ViewTransition | undefined {
  // Flush the older accepted update before applying a newer one. skipTransition only
  // skips presentation; it does not prevent the older update callback from running.
  const interrupted = interruptAppearanceTransition() !== undefined
  if (input.isCurrent?.() === true) return

  const settings = document.querySelector(settingsSceneSelector)
  if (settings !== null) {
    const before = input.readSnapshot?.()
    if (settingsFrame !== undefined) finishSettingsAppearance()
    const geometry =
      before !== undefined && input.motion === 'full' && supportsSettingsReveal()
        ? revealGeometry(input.origin)
        : undefined
    const revealSettings =
      geometry === undefined ? undefined : prepareSettingsReveal(settings, input.kind, geometry)
    const committed = input.commit()
    const after = input.readSnapshot?.()
    if (
      committed &&
      before !== undefined &&
      after !== undefined &&
      (before.colorMode !== after.colorMode ||
        before.themeEntry.definition !== after.themeEntry.definition)
    ) {
      if (revealSettings !== undefined) {
        revealSettings(after)
      } else if (after.motion === 'reduced') {
        animateReducedSettingsAppearance(input.kind, before, after)
      }
    }
    return
  }
  if (interrupted) {
    input.commit()
    return
  }
  if (!supportsAppearanceTransition(input.motion)) {
    input.commit()
    return
  }

  let transition: ViewTransition
  const pending: { operation?: ActiveAppearanceTransition } = {}
  let committedSynchronously = false
  const commit = (): void => {
    if (pending.operation !== undefined) commitOnce(pending.operation)
    else if (!committedSynchronously) {
      committedSynchronously = true
      input.commit()
    }
  }
  try {
    transition = document.startViewTransition({
      types:
        input.kind === 'palette'
          ? [appearanceTransitionType, appearanceRiftType]
          : [appearanceTransitionType],
      update: async () => {
        commit()
        await nextTick()
      },
    })
  } catch {
    commit()
    return
  }
  const operation = { transition, commit: input.commit, committed: committedSynchronously }
  pending.operation = operation
  active = operation
  void transition.ready
    .then(() => {
      if (active !== operation) return
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
      if (active === operation) active = undefined
    })
  void transition.updateCallbackDone.catch(() => undefined)
  return transition
}
