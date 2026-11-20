import { projectSettingsColorMotion, type UiAppearanceSnapshot } from '@platform/design-system'
import type { UiMotionHandle, UiMotionOptions } from '@platform/ui'
import { nextTick } from 'vue'
import {
  captureAppearanceScene,
  mountAppearanceScene,
  themePickerSelector,
  trackAppearancePicker,
} from './appearance-scene'
import { jsonValuesEqual } from './appearance-value-equality'
import { getCinematicRouteRecipe } from '../router/route-transition/route-transition-showcase'

type SettingsAppearanceKind = 'mode' | 'palette'
type AppearanceTransitionKind = SettingsAppearanceKind | 'settings'
export type AppearanceTransitionOrigin = Readonly<{ x: number; y: number }>

type Snapshot = Readonly<UiAppearanceSnapshot>
type Scene = NonNullable<ReturnType<typeof captureAppearanceScene>>
type Change = Readonly<{
  kind: AppearanceTransitionKind
  target: Snapshot
  origin: AppearanceTransitionOrigin | undefined
  scene: Promise<Scene | undefined>
}>
type PlayRift = (
  scene: HTMLElement,
  appearance: Snapshot,
  options: UiMotionOptions<'theme-rift'>,
) => UiMotionHandle<'theme-rift'>

interface AppearanceFrame {
  readonly change: Change
  retarget(change: Change): void
  readonly dispose: () => void
}

const modeRevealDurationMs = 640
const paletteFissureDurationMs = 800
const modeRevealEasing = 'cubic-bezier(0.22,0.72,0.24,1)'
const paletteFissureEasing = 'cubic-bezier(0.30,0.25,0.26,1)'
let nextModeChangeAt = 0

let activeFrame: AppearanceFrame | undefined
let playRift: PlayRift | undefined

export function connectSettingsRift(player: PlayRift): () => void {
  playRift = player
  return () => {
    if (playRift === player) {
      finishSettingsAppearance()
      playRift = undefined
    }
  }
}
let settingsColorMotion:
  | {
      readonly target: Readonly<UiAppearanceSnapshot>
      readonly projection: ReturnType<typeof projectSettingsColorMotion>
    }
  | undefined
let settingsCleanup: ReturnType<typeof setTimeout> | undefined
let settingsColorFrame: number | undefined

export function finishSettingsAppearance(): void {
  const reveal = activeReveal
  activeReveal = undefined
  reveal?.interrupt()
  if (!activeFrame && !settingsColorMotion) return
  activeFrame?.dispose()
  settingsColorMotion = undefined
  clearTimeout(settingsCleanup)
  if (settingsColorFrame !== undefined) cancelAnimationFrame(settingsColorFrame)
  settingsColorFrame = undefined
  document.documentElement.removeAttribute('data-pavp-settings-appearance')
}

type RevealKind = Extract<AppearanceTransitionKind, 'mode' | 'palette'>

/** Typed view transitions namespace the reveal; the shared type also gates the supported path. */
const appearanceTransitionTypes: Readonly<Record<RevealKind, readonly string[]>> = {
  mode: ['pavp-appearance', 'pavp-appearance-mode'],
  palette: ['pavp-appearance', 'pavp-appearance-palette'],
}

interface RevealControl {
  interrupt(): void
}

let activeReveal: RevealControl | undefined

function revealRadius(width: number, height: number, x: number, y: number): number {
  return Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y))) + 1
}

function typedAppearanceViewTransitions(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:active-view-transition-type(pavp-appearance))')
  )
}

function viewTransitionRevealAvailable(previous: Snapshot, surface: HTMLElement | null): boolean {
  return (
    previous.motion === 'full' &&
    document.visibilityState === 'visible' &&
    !document.activeViewTransition &&
    document.querySelector('[data-pavp-route-transition-direction]') === null &&
    typeof document.startViewTransition === 'function' &&
    typedAppearanceViewTransitions() &&
    surface !== null &&
    // Forced colors hide the appearance surface; the same probe keeps the reveal out of that mode.
    getComputedStyle(surface).visibility !== 'hidden'
  )
}

/** The route content owns the 'root' name for its scoped transition; a document capture needs it unique. */
function writeRouteRootName(element: HTMLElement, value: string, priority?: string): void {
  element.style.setProperty('view-transition-name', value, priority)
}

function suspendRouteRootNames(): () => void {
  const suspended: { element: HTMLElement; value: string; priority: string }[] = []
  for (const element of document.querySelectorAll<HTMLElement>('[data-scroll-owner]')) {
    if (getComputedStyle(element).viewTransitionName === 'none') continue
    const value = element.style.getPropertyValue('view-transition-name')
    const priority = element.style.getPropertyPriority('view-transition-name')
    writeRouteRootName(element, 'none')
    suspended.push({ element, value, priority })
  }
  if (suspended.length === 0) return () => undefined
  return () => {
    for (const { element, value, priority } of suspended) {
      if (value) writeRouteRootName(element, value, priority)
      else element.style.removeProperty('view-transition-name')
    }
  }
}

function settleRevealPaint(): Promise<void> {
  // Two frames let the committed tokens and the first retargeted chart paint land before the
  // reveal opens; the timeout keeps a throttled document from stalling the DOM update.
  return new Promise<void>((resolve) => {
    let settled = false
    const settle = (): void => {
      if (settled) return
      settled = true
      resolve()
    }
    let frames = 0
    const tick = (): void => {
      frames += 1
      if (frames >= 2) settle()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    setTimeout(settle, 120)
  })
}

/** Hit-testing is suppressed during a view transition, so a picker press resolves geometrically. */
function pickerButtonAt(x: number, y: number): HTMLElement | undefined {
  const popup = document.querySelector(themePickerSelector)
  if (typeof HTMLElement !== 'function' || !(popup instanceof HTMLElement)) return undefined
  for (const button of popup.querySelectorAll<HTMLElement>('button')) {
    const box = button.getBoundingClientRect()
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return button
  }
  return undefined
}

function playViewTransitionReveal(
  kind: RevealKind,
  input: {
    readonly origin?: AppearanceTransitionOrigin | undefined
    readonly commit: () => boolean
  },
): void {
  const root = document.documentElement
  finishSettingsAppearance()
  const { innerWidth: width, innerHeight: height } = window
  const x = Math.max(0, Math.min(width, input.origin?.x ?? width / 2))
  const y = Math.max(0, Math.min(height, input.origin?.y ?? height / 2))
  const contours = kind === 'palette' ? paletteFissure(width, height, x, y).page : []
  root.style.setProperty('--pavp-appearance-origin', `${String(x)}px ${String(y)}px`)
  root.style.setProperty(
    '--pavp-appearance-radius',
    `${String(revealRadius(width, height, x, y))}px`,
  )
  root.style.setProperty('--pavp-appearance-shape', contours[0] ?? '')
  root.style.setProperty('--pavp-appearance-shape-mid', contours[1] ?? '')
  root.style.setProperty('--pavp-appearance-shape-end', contours[2] ?? '')
  root.style.setProperty(
    '--pavp-appearance-duration',
    `${String(kind === 'mode' ? modeRevealDurationMs : paletteFissureDurationMs)}ms`,
  )
  root.style.setProperty(
    '--pavp-appearance-easing',
    kind === 'mode' ? modeRevealEasing : paletteFissureEasing,
  )
  const restoreNames = suspendRouteRootNames()
  const update = { attempted: false }
  let press: { readonly button: HTMLElement; readonly x: number; readonly y: number } | undefined
  let interrupt: () => void = () => {
    // Assigned once the transition exists.
  }
  const control: RevealControl = {
    interrupt: () => {
      interrupt()
    },
  }
  const listeners = new AbortController()
  const onInterrupt = (): void => {
    interrupt()
  }
  const onPress = (event: PointerEvent): void => {
    if (event.button !== 0) return
    const button = pickerButtonAt(event.clientX, event.clientY)
    if (!button) return
    press = { button, x: event.clientX, y: event.clientY }
    onInterrupt()
  }
  const cleanup = (): void => {
    if (activeReveal === control) activeReveal = undefined
    listeners.abort()
    root.style.removeProperty('--pavp-appearance-origin')
    root.style.removeProperty('--pavp-appearance-radius')
    root.style.removeProperty('--pavp-appearance-shape')
    root.style.removeProperty('--pavp-appearance-shape-mid')
    root.style.removeProperty('--pavp-appearance-shape-end')
    root.style.removeProperty('--pavp-appearance-duration')
    root.style.removeProperty('--pavp-appearance-easing')
    restoreNames()
  }
  const replayPress = (): void => {
    const held = press
    press = undefined
    if (!held?.button.isConnected) return
    held.button.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: held.x,
        clientY: held.y,
      }),
    )
  }
  let transition: ViewTransition
  try {
    transition = document.startViewTransition({
      update: async () => {
        update.attempted = true
        if (!input.commit()) {
          onInterrupt()
          return
        }
        if (kind === 'mode') nextModeChangeAt = performance.now() + modeRevealDurationMs
        await settleRevealPaint()
      },
      types: [...appearanceTransitionTypes[kind]],
    })
  } catch {
    // A document that refuses the transition still receives the preference directly.
    cleanup()
    if (!update.attempted) input.commit()
    return
  }
  interrupt = () => {
    try {
      transition.skipTransition()
    } catch {
      // A finished or skipped transition no longer accepts input.
    }
  }
  window.addEventListener('wheel', onInterrupt, { passive: true, signal: listeners.signal })
  document.addEventListener('touchmove', onInterrupt, {
    passive: true,
    signal: listeners.signal,
  })
  if (kind === 'palette')
    document.addEventListener('pointerdown', onPress, { capture: true, signal: listeners.signal })
  activeReveal = control
  transition.finished.then(
    () => {
      cleanup()
      replayPress()
    },
    () => {
      // A failed capture can retire the update before it ran; the choice still commits.
      cleanup()
      if (!update.attempted) input.commit()
      replayPress()
    },
  )
}

function sameAppearance(left: Snapshot, right: Snapshot): boolean {
  return (
    left.theme.registryKind === right.theme.registryKind &&
    left.theme.themeId === right.theme.themeId &&
    left.colorMode === right.colorMode &&
    left.contrast === right.contrast &&
    left.colorStyle === right.colorStyle &&
    left.material === right.material &&
    left.motion === right.motion &&
    left.fontScale === right.fontScale &&
    left.density === right.density &&
    left.radius === right.radius &&
    // A stored custom theme is validated into a fresh definition on each preference change.
    jsonValuesEqual(left.themeEntry.definition, right.themeEntry.definition)
  )
}

export function reconcileSettingsAppearance(snapshot: Readonly<UiAppearanceSnapshot>): void {
  const target = activeFrame?.change.target ?? settingsColorMotion?.target
  if (target && target !== snapshot && !sameAppearance(target, snapshot)) finishSettingsAppearance()
}

function animateReducedSettingsAppearance(
  kind: SettingsAppearanceKind,
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

function paletteFissure(width: number, height: number, x: number, y: number) {
  type Point = readonly [number, number]
  const origin: Point = [x, y]
  const bend = Math.min(width, height) * 0.08
  const overscan = Math.min(18, Math.max(8, bend * 0.28))
  // The original palette reveal grows from the activation point to a bent slit, then to the viewport.
  const slit: Point[] = [
    [x - bend * 1.6, -overscan],
    [x + bend * 0.8, -overscan],
    [x + bend * 2.6, y],
    [x + bend * 0.7, height + overscan],
    [x - bend * 2.2, height + overscan],
    [x - bend * 0.7, y],
  ]
  const opened: Point[] = [
    [-overscan, -overscan],
    [width + overscan, -overscan],
    [width + overscan, y],
    [width + overscan, height + overscan],
    [-overscan, height + overscan],
    [-overscan, y],
  ]
  const contours = [slit.map(() => origin), slit, opened]
  const points = (vertices: Point[]) =>
    vertices.map(([left, top]) => `${String(left)}px ${String(top)}px`).join(', ')
  const edge = contours.map((vertices, index) => {
    const stroke = index === 0 ? 0 : 2
    const inner = vertices.map<Point>(([left, top], vertex) => [
      left + (vertex >= 1 && vertex <= 3 ? -stroke : stroke),
      top + (vertex < 2 ? stroke : vertex === 3 || vertex === 4 ? -stroke : 0),
    ])
    const loop = [...vertices, vertices[0] ?? origin, ...[...inner, inner[0] ?? origin].reverse()]
    return `polygon(evenodd, ${points(loop)})`
  })
  return { page: contours.map((vertices) => `polygon(${points(vertices)})`), edge }
}

function presentAppearance(
  surface: HTMLElement,
  firstScene: Scene,
  previous: Snapshot,
  firstChange: Change,
): void {
  let change = firstChange
  let reveal: Animation | undefined
  let rim: Animation | undefined
  let rift: UiMotionHandle<'theme-rift'> | undefined
  let retarget: ((next: Change) => void) | undefined
  const pending = [firstChange]
  const listeners = new AbortController()
  const operation: AppearanceFrame = {
    get change() {
      return change
    },
    retarget(next) {
      const sameEffect = next.kind === change.kind
      change = next
      if (sameEffect && !pending.length && retarget) {
        retarget(next)
        return
      }
      if (sameEffect && next.kind === 'palette' && !pending.length) {
        // Finish the visible sweep continuously so the next color can open from its own button.
        reveal?.updatePlaybackRate(2)
        rim?.updatePlaybackRate(2)
      }
      // Preserve a pending change of each kind, in user order, without replaying a whole burst.
      retarget = undefined
      const superseded = pending.findIndex((queued) => queued.kind === next.kind)
      if (superseded >= 0) pending.splice(superseded, 1)
      pending.push(next)
    },
    dispose() {
      if (activeFrame !== operation) return
      activeFrame = undefined
      listeners.abort()
      reveal?.cancel()
      rim?.cancel()
      rift?.cancel()
      surface.replaceChildren()
      if (surface.isConnected) surface.hidePopover()
      document.documentElement.removeAttribute('data-pavp-settings-appearance')
    },
  }
  activeFrame = operation

  async function play(): Promise<void> {
    surface.popover = 'manual'
    surface.showPopover()
    document.documentElement.setAttribute('data-pavp-settings-appearance', 'reveal')
    const signal = listeners.signal
    trackAppearancePicker(surface, signal)
    let base = mountAppearanceScene(surface)
    let scene = firstScene(base)
    let displayed = previous
    window.addEventListener('resize', operation.dispose, { signal })
    document.addEventListener('visibilitychange', operation.dispose, { signal })
    // The mirror has the original scroll offsets. Hand scrolling immediately back to the live page.
    document.addEventListener('wheel', operation.dispose, { passive: true, signal })
    document.addEventListener('touchmove', operation.dispose, { passive: true, signal })
    const stopped = () => signal.aborted
    async function playReveal(start: Change): Promise<Change | undefined> {
      const destination = await start.scene
      if (!destination || stopped()) return
      if (start.kind === 'palette' && sameAppearance(displayed, start.target)) {
        // The live page has the latest selection. Only a following effect still needs its copy.
        if (pending.length) scene = destination(base)
        else operation.dispose()
        return start
      }
      const incoming = mountAppearanceScene(surface)
      let newPage = destination(incoming)
      const { innerWidth: width, innerHeight: height } = window
      const x = Math.max(0, Math.min(width, start.origin?.x ?? width / 2))
      const y = Math.max(0, Math.min(height, start.origin?.y ?? height / 2))
      const radius = revealRadius(width, height, x, y)
      const at = `at ${String(x)}px ${String(y)}px`
      const fissure = start.kind === 'palette' ? paletteFissure(width, height, x, y) : undefined
      const timing: KeyframeAnimationOptions = fissure
        ? { duration: paletteFissureDurationMs, easing: paletteFissureEasing, fill: 'both' }
        : { duration: modeRevealDurationMs, easing: modeRevealEasing, fill: 'both' }
      const wave = incoming.animate(
        { clipPath: fissure?.page ?? [`circle(0px ${at})`, `circle(${String(radius)}px ${at})`] },
        timing,
      )
      reveal = wave
      let edge: HTMLSpanElement | undefined
      if (fissure) {
        edge = document.createElement('span')
        edge.className = 'pavp-appearance-rift-edge'
        // The incoming scene supplies the edge colors while later clicks update the live theme.
        newPage.after(edge)
        rim = edge.animate({ clipPath: fissure.edge }, timing)
      }
      let selected = start
      let destinationMode = start.target.colorMode
      const showingIncoming = () => selected.target.colorMode === destinationMode
      const reverseTo = (next: Change) => {
        const wasForward = showingIncoming()
        if (destinationMode === displayed.colorMode) destinationMode = next.target.colorMode
        selected = next
        const forward = showingIncoming()
        if (wasForward !== forward) wave.reverse()
        // System and explicit modes can have identical colors but different selected controls.
        void next.scene
          .then((copy) => {
            if (!copy || stopped() || selected !== next || reveal !== wave) return
            if (forward) newPage = copy(incoming)
            else scene = copy(base)
          })
          .catch(operation.dispose)
      }
      retarget = fissure ? undefined : reverseTo
      await Promise.all([wave.finished, rim?.finished])
      if (stopped()) return
      retarget = undefined
      if (fissure || showingIncoming()) {
        base.remove()
        base = incoming
        scene = newPage
      } else incoming.remove()
      wave.cancel()
      rim?.cancel()
      edge?.remove()
      reveal = undefined
      rim = undefined
      return selected
    }

    async function playFissure(start: Change): Promise<Change | undefined> {
      const player = playRift
      if (!player) return
      const recipe = getCinematicRouteRecipe('theme-rift')
      let opening = start
      retarget = (next) => {
        opening = next
      }
      const phase = (direction: 'exit' | 'enter', appearance: Snapshot, request: Change) =>
        player(scene, appearance, {
          preset: 'theme-rift',
          phase: direction,
          durationMs: direction === 'exit' ? recipe.coverMs : recipe.revealMs,
          ...(request.origin
            ? { origin: { clientX: request.origin.x, clientY: request.origin.y } }
            : {}),
        })
      rift = phase('exit', displayed, start)
      if ((await rift.finished).kind !== 'completed' || stopped()) return
      retarget = undefined
      const destination = await opening.scene
      if (!destination || stopped()) return
      rift.cancel()
      scene = destination(base)
      rift = phase('enter', opening.target, opening)
      if ((await rift.finished).kind !== 'completed' || stopped()) return
      rift.cancel()
      rift = undefined
      return opening
    }

    // Hand the fully presented page to the next effect. Every input has already committed.
    while (!stopped()) {
      const request = pending.shift()
      if (!request) return
      const shown = await (request.kind === 'settings' ? playFissure(request) : playReveal(request))
      if (!shown) return
      displayed = shown.target
    }
  }

  void play().then(operation.dispose, operation.dispose)
}

export function playAppearanceTransition(input: {
  readonly kind: AppearanceTransitionKind
  readonly origin?: AppearanceTransitionOrigin | undefined
  readonly isCurrent?: () => boolean
  readonly readSnapshot: () => Snapshot
  readonly commit: () => boolean
}): void {
  if (input.kind === 'mode' && performance.now() < nextModeChangeAt) return
  if (input.isCurrent?.()) return
  const previous = input.readSnapshot()
  const surface = document.getElementById('pavp-appearance-surface')
  const revealKind = input.kind === 'mode' || input.kind === 'palette' ? input.kind : undefined
  if (revealKind !== undefined && viewTransitionRevealAvailable(previous, surface)) {
    playViewTransitionReveal(revealKind, input)
    return
  }
  const canPresent =
    previous.motion === 'full' &&
    document.visibilityState === 'visible' &&
    !document.activeViewTransition &&
    !document.querySelector('[data-pavp-route-transition-direction]') &&
    surface !== null &&
    typeof surface.showPopover === 'function' &&
    typeof surface.animate === 'function' &&
    getComputedStyle(surface).visibility !== 'hidden'
  const continuing = canPresent ? activeFrame : undefined
  let initial: Scene | undefined
  if (canPresent && !continuing) {
    try {
      initial = captureAppearanceScene(surface)
    } catch {
      // A surface which cannot be copied still accepts the preference below.
    }
  }
  if (!input.commit()) return
  if (input.kind === 'mode') nextModeChangeAt = performance.now() + modeRevealDurationMs
  const target = input.readSnapshot()
  if (surface && (initial || continuing) && target.motion === 'full') {
    const change = {
      kind: input.kind,
      origin: input.origin,
      target,
      scene: nextTick(() => captureAppearanceScene(surface)).catch(() => undefined),
    } as const
    if (continuing) continuing.retarget(change)
    else if (initial) {
      finishSettingsAppearance()
      presentAppearance(surface, initial, previous, change)
    }
    return
  }
  finishSettingsAppearance()
  if (input.kind !== 'settings' && target.motion === 'reduced' && !document.activeViewTransition) {
    animateReducedSettingsAppearance(input.kind, previous, target)
  }
}
