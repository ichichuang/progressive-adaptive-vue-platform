import type { LayoutProfileId, MotionPreference } from '@platform/design-system'
import { gsap } from 'gsap'

export type AdminNavigationMotionCause =
  'initialize' | 'collapse' | 'route' | 'profile' | 'preference'

export interface AdminNavigationMotionState {
  readonly activeRouteName: string
  readonly collapsed: boolean
  readonly motion: MotionPreference
  readonly profile: LayoutProfileId
}

export interface AdminNavigationMotionTargets {
  readonly collapseLabel: HTMLElement | null
  readonly collapsedCollapseIcon: HTMLElement | null
  readonly expandedCollapseIcon: HTMLElement | null
  readonly routeSelectionDots: ReadonlyMap<string, HTMLElement>
}

export interface AdminNavigationMotionController {
  dispose(): void
  sync(state: Readonly<AdminNavigationMotionState>, cause: AdminNavigationMotionCause): void
}

interface AdminNavigationMotionControllerOptions {
  readonly initialState: Readonly<AdminNavigationMotionState>
  readonly resolveTargets: () => Readonly<AdminNavigationMotionTargets>
  readonly root: HTMLElement
}

type GsapContext = ReturnType<typeof gsap.context>
type GsapTimeline = ReturnType<typeof gsap.timeline>

const readyAttribute = 'data-pavp-admin-navigation-motion'
const readyAttributeValue = 'ready'
const durationPattern = /^(\d+(?:\.\d+)?)(ms|s)$/u
const cubicBezierPattern =
  /^cubic-bezier\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/u
const dockInactiveScale = 0.86
const routeDotInactiveScale = 0.72
const newtonIterations = 8
const bisectionIterations = 12
const minimumCurveSlope = 0.000_001

function parseMotionDuration(root: HTMLElement, motion: MotionPreference): number {
  const duration = getComputedStyle(root).getPropertyValue('--ui-motion-duration').trim()
  const match = durationPattern.exec(duration)

  if (match?.[1] === undefined || match[2] === undefined) {
    throw new TypeError(`Invalid PAVP motion duration token: ${duration}`)
  }

  const magnitude = Number(match[1])
  const seconds = match[2] === 'ms' ? magnitude / 1000 : magnitude

  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError(`Invalid PAVP motion duration token: ${duration}`)
  }

  return motion === 'reduced' ? seconds / 2 : seconds
}

function cubicCoordinate(time: number, first: number, second: number): number {
  const inverseTime = 1 - time

  return (
    3 * inverseTime * inverseTime * time * first +
    3 * inverseTime * time * time * second +
    time * time * time
  )
}

function cubicCoordinateSlope(time: number, first: number, second: number): number {
  const inverseTime = 1 - time

  return (
    3 * inverseTime * inverseTime * first +
    6 * inverseTime * time * (second - first) +
    3 * time * time * (1 - second)
  )
}

function createCubicBezierEase(
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number,
): gsap.EaseFunction {
  if (firstX < 0 || firstX > 1 || secondX < 0 || secondX > 1) {
    throw new TypeError('PAVP motion easing control-point x values must remain within [0, 1].')
  }

  return (progress: number): number => {
    if (progress <= 0 || progress >= 1) {
      return progress
    }

    let time = progress
    let useBisection = false

    for (let iteration = 0; iteration < newtonIterations; iteration += 1) {
      const slope = cubicCoordinateSlope(time, firstX, secondX)

      if (Math.abs(slope) < minimumCurveSlope) {
        useBisection = true
        break
      }

      const candidate = time - (cubicCoordinate(time, firstX, secondX) - progress) / slope

      if (candidate < 0 || candidate > 1) {
        useBisection = true
        break
      }

      time = candidate
    }

    if (useBisection) {
      let lowerBound = 0
      let upperBound = 1

      for (let iteration = 0; iteration < bisectionIterations; iteration += 1) {
        time = (lowerBound + upperBound) / 2

        if (cubicCoordinate(time, firstX, secondX) < progress) {
          lowerBound = time
        } else {
          upperBound = time
        }
      }
    }

    return cubicCoordinate(time, firstY, secondY)
  }
}

function parseMotionEase(root: HTMLElement): gsap.EaseFunction {
  const easing = getComputedStyle(root).getPropertyValue('--ui-motion-easing').trim()
  const match = cubicBezierPattern.exec(easing)

  if (match === null) {
    throw new TypeError(`Invalid PAVP motion easing token: ${easing}`)
  }

  const coordinates = match.slice(1).map(Number)

  if (coordinates.length !== 4 || coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new TypeError(`Invalid PAVP motion easing token: ${easing}`)
  }

  const [firstX, firstY, secondX, secondY] = coordinates

  if (
    firstX === undefined ||
    firstY === undefined ||
    secondX === undefined ||
    secondY === undefined
  ) {
    throw new TypeError(`Invalid PAVP motion easing token: ${easing}`)
  }

  return createCubicBezierEase(firstX, firstY, secondX, secondY)
}

function targetElements(targets: Readonly<AdminNavigationMotionTargets>): HTMLElement[] {
  const elements = [
    targets.expandedCollapseIcon,
    targets.collapsedCollapseIcon,
    targets.collapseLabel,
    ...targets.routeSelectionDots.values(),
  ]

  return elements.filter((element): element is HTMLElement => element !== null)
}

function isCollapsedDockIcon(
  element: HTMLElement | undefined,
  targets: Readonly<AdminNavigationMotionTargets>,
): boolean {
  return element === targets.collapsedCollapseIcon
}

export function createAdminNavigationMotionController(
  options: Readonly<AdminNavigationMotionControllerOptions>,
): AdminNavigationMotionController {
  let context: GsapContext | undefined
  let dockTimeline: GsapTimeline | undefined
  let routeTimeline: GsapTimeline | undefined
  let dockTimelineOriginCollapsed: boolean | undefined
  let dockTimelineTargetCollapsed: boolean | undefined
  let routeTimelineOriginName: string | undefined
  let routeTimelineTargetName: string | undefined
  let disposed = false
  let latestState = options.initialState
  const trackedTargets = new Set<HTMLElement>()

  function stopDockMotion(): void {
    dockTimeline?.kill()
    dockTimeline = undefined
    dockTimelineOriginCollapsed = undefined
    dockTimelineTargetCollapsed = undefined
  }

  function stopRouteMotion(): void {
    routeTimeline?.kill()
    routeTimeline = undefined
    routeTimelineOriginName = undefined
    routeTimelineTargetName = undefined
  }

  function stopActiveMotion(): void {
    stopDockMotion()
    stopRouteMotion()

    if (trackedTargets.size > 0) {
      gsap.killTweensOf([...trackedTargets])
    }
  }

  function deactivate(): void {
    options.root.removeAttribute(readyAttribute)
    stopActiveMotion()
    context?.revert()
    context = undefined
    trackedTargets.clear()
  }

  function handOffStableStateWhenIdle(): void {
    if (context === undefined || dockTimeline !== undefined || routeTimeline !== undefined) {
      return
    }

    options.root.removeAttribute(readyAttribute)
    context.revert()
    context = undefined
    trackedTargets.clear()
  }

  function stableDockState(
    targets: Readonly<AdminNavigationMotionTargets>,
    state: Readonly<AdminNavigationMotionState>,
  ): void {
    const icons = [targets.expandedCollapseIcon, targets.collapsedCollapseIcon].filter(
      (element): element is HTMLElement => element !== null,
    )

    if (icons.length > 0) {
      const visibility = (index: number): number => {
        const element = icons[index]

        return isCollapsedDockIcon(element, targets) === state.collapsed ? 1 : 0
      }

      const values: gsap.TweenVars = {
        autoAlpha: visibility,
      }

      if (state.motion === 'full') {
        values.scale = (index: number) => (visibility(index) === 1 ? 1 : dockInactiveScale)
      }

      gsap.set(icons, values)
    }

    if (targets.collapseLabel !== null) {
      gsap.set(targets.collapseLabel, { autoAlpha: state.collapsed ? 0 : 1 })
    }
  }

  function stableRouteState(
    targets: Readonly<AdminNavigationMotionTargets>,
    state: Readonly<AdminNavigationMotionState>,
  ): void {
    for (const [routeName, dot] of targets.routeSelectionDots) {
      const values: gsap.TweenVars = {
        autoAlpha: routeName === state.activeRouteName ? 1 : 0,
      }

      if (state.motion === 'full') {
        values.scale = routeName === state.activeRouteName ? 1 : routeDotInactiveScale
      }

      gsap.set(dot, values)
    }
  }

  function beginMotionContext(
    targets: Readonly<AdminNavigationMotionTargets>,
    startingState: Readonly<AdminNavigationMotionState>,
  ): void {
    for (const element of targetElements(targets)) {
      trackedTargets.add(element)
    }

    context = gsap.context(() => {
      stableDockState(targets, startingState)
      stableRouteState(targets, startingState)
    }, options.root)
    options.root.setAttribute(readyAttribute, readyAttributeValue)
  }

  function registerNewTargets(
    targets: Readonly<AdminNavigationMotionTargets>,
    startingState: Readonly<AdminNavigationMotionState>,
  ): void {
    if (context === undefined) {
      beginMotionContext(targets, startingState)
      return
    }

    const currentTargets = targetElements(targets)
    const newTargets = new Set(currentTargets.filter((element) => !trackedTargets.has(element)))

    if (newTargets.size === 0) {
      return
    }

    for (const element of newTargets) {
      trackedTargets.add(element)
    }

    context.add(() => {
      stableDockState(
        {
          collapseLabel:
            targets.collapseLabel !== null && newTargets.has(targets.collapseLabel)
              ? targets.collapseLabel
              : null,
          collapsedCollapseIcon:
            targets.collapsedCollapseIcon !== null && newTargets.has(targets.collapsedCollapseIcon)
              ? targets.collapsedCollapseIcon
              : null,
          expandedCollapseIcon:
            targets.expandedCollapseIcon !== null && newTargets.has(targets.expandedCollapseIcon)
              ? targets.expandedCollapseIcon
              : null,
          routeSelectionDots: new Map<string, HTMLElement>(),
        },
        startingState,
      )
      stableRouteState(
        {
          collapseLabel: null,
          collapsedCollapseIcon: null,
          expandedCollapseIcon: null,
          routeSelectionDots: new Map(
            [...targets.routeSelectionDots].filter(([, dot]) => newTargets.has(dot)),
          ),
        },
        startingState,
      )
    })
  }

  function finishDockMotion(timeline: GsapTimeline): void {
    if (dockTimeline !== timeline) {
      return
    }

    dockTimeline = undefined
    dockTimelineOriginCollapsed = undefined
    dockTimelineTargetCollapsed = undefined
    handOffStableStateWhenIdle()
  }

  function finishRouteMotion(timeline: GsapTimeline): void {
    if (routeTimeline !== timeline) {
      return
    }

    routeTimeline = undefined
    routeTimelineOriginName = undefined
    routeTimelineTargetName = undefined
    handOffStableStateWhenIdle()
  }

  function continueDockReversal(collapsed: boolean): boolean {
    const timeline = dockTimeline

    if (timeline === undefined) {
      return false
    }

    if (collapsed === dockTimelineTargetCollapsed) {
      timeline.play()
      return true
    }

    if (collapsed === dockTimelineOriginCollapsed) {
      timeline.reverse()
      return true
    }

    return false
  }

  function continueRouteReversal(routeName: string): boolean {
    const timeline = routeTimeline

    if (timeline === undefined) {
      return false
    }

    if (routeName === routeTimelineTargetName) {
      timeline.play()
      return true
    }

    if (routeName === routeTimelineOriginName) {
      timeline.reverse()
      return true
    }

    return false
  }

  function animateDock(
    targets: Readonly<AdminNavigationMotionTargets>,
    state: Readonly<AdminNavigationMotionState>,
    originCollapsed: boolean,
    duration: number,
    ease: gsap.EaseFunction,
  ): void {
    const icons = [targets.expandedCollapseIcon, targets.collapsedCollapseIcon].filter(
      (element): element is HTMLElement => element !== null,
    )

    if (icons.length === 0 && targets.collapseLabel === null) {
      return
    }

    const timeline = gsap.timeline({ defaults: { duration, ease }, paused: true })
    dockTimeline = timeline
    dockTimelineOriginCollapsed = originCollapsed
    dockTimelineTargetCollapsed = state.collapsed

    if (icons.length > 0) {
      const values: gsap.TweenVars = {
        autoAlpha: (index: number) => {
          const element = icons[index]

          return isCollapsedDockIcon(element, targets) === state.collapsed ? 1 : 0
        },
        overwrite: 'auto',
      }

      if (state.motion === 'full') {
        values.scale = (index: number) => {
          const element = icons[index]
          const isVisible = isCollapsedDockIcon(element, targets) === state.collapsed

          return isVisible ? 1 : dockInactiveScale
        }
      }

      timeline.to(icons, values, 0)
    }

    if (targets.collapseLabel !== null) {
      timeline.to(
        targets.collapseLabel,
        {
          autoAlpha: state.collapsed ? 0 : 1,
          overwrite: 'auto',
        },
        0,
      )
    }

    timeline.eventCallback('onComplete', () => {
      finishDockMotion(timeline)
    })
    timeline.eventCallback('onReverseComplete', () => {
      finishDockMotion(timeline)
    })
    timeline.play()
  }

  function animateRoute(
    targets: Readonly<AdminNavigationMotionTargets>,
    state: Readonly<AdminNavigationMotionState>,
    originRouteName: string | undefined,
    duration: number,
    ease: gsap.EaseFunction,
  ): void {
    const entries = [...targets.routeSelectionDots.entries()]

    if (entries.length === 0) {
      return
    }

    const timeline = gsap.timeline({ defaults: { duration, ease }, paused: true })
    routeTimeline = timeline
    routeTimelineOriginName = originRouteName
    routeTimelineTargetName = state.activeRouteName
    const values: gsap.TweenVars = {
      autoAlpha: (index: number) => (entries[index]?.[0] === state.activeRouteName ? 1 : 0),
      overwrite: 'auto',
    }

    if (state.motion === 'full') {
      values.scale = (index: number) => {
        const isSelected = entries[index]?.[0] === state.activeRouteName

        return isSelected ? 1 : routeDotInactiveScale
      }
    }

    timeline.to(
      entries.map(([, dot]) => dot),
      values,
      0,
    )
    timeline.eventCallback('onComplete', () => {
      finishRouteMotion(timeline)
    })
    timeline.eventCallback('onReverseComplete', () => {
      finishRouteMotion(timeline)
    })
    timeline.play()
  }

  function syncMotion(
    state: Readonly<AdminNavigationMotionState>,
    cause: AdminNavigationMotionCause,
  ): void {
    if (disposed) {
      return
    }

    const previousState = latestState
    latestState = state

    if (
      document.visibilityState === 'hidden' ||
      state.profile !== 'wide' ||
      state.motion === 'none'
    ) {
      deactivate()
      return
    }

    if (cause === 'initialize' || cause === 'profile' || cause === 'preference') {
      deactivate()
      return
    }

    const targets = options.resolveTargets()
    registerNewTargets(targets, previousState)

    if (context === undefined) {
      return
    }

    if (cause === 'route' && previousState.activeRouteName === state.activeRouteName) {
      handOffStableStateWhenIdle()
      return
    }

    const duration = parseMotionDuration(options.root, state.motion)
    const ease = parseMotionEase(options.root)

    context.add(() => {
      if (cause === 'collapse') {
        stopRouteMotion()

        if (!continueDockReversal(state.collapsed)) {
          stopDockMotion()
          animateDock(targets, state, previousState.collapsed, duration, ease)
        }
      } else if (!continueRouteReversal(state.activeRouteName)) {
        const replacingActiveTimeline = routeTimeline !== undefined
        stopRouteMotion()
        animateRoute(
          targets,
          state,
          replacingActiveTimeline ? undefined : previousState.activeRouteName,
          duration,
          ease,
        )
      }
    })

    handOffStableStateWhenIdle()
  }

  function sync(
    state: Readonly<AdminNavigationMotionState>,
    cause: AdminNavigationMotionCause,
  ): void {
    try {
      syncMotion(state, cause)
    } catch (error) {
      deactivate()
      throw error
    }
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      deactivate()
    }
  }

  function dispose(): void {
    if (disposed) {
      return
    }

    disposed = true
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    deactivate()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return Object.freeze({ dispose, sync })
}
