import type { LayoutProfileId, MotionPreference } from '@platform/design-system'
import { gsap } from 'gsap'

export type AdminNavigationMotionCause =
  'initialize' | 'collapse' | 'route' | 'profile' | 'preference'

export interface AdminNavigationMotionState {
  readonly activeRouteName: string
  readonly collapsed: boolean
  readonly collapseOffsetInline: number
  readonly motion: MotionPreference
  readonly profile: LayoutProfileId
}

export interface AdminNavigationMotionTargets {
  readonly collapseLabel: HTMLElement | null
  readonly collapsedCollapseIcon: HTMLElement | null
  readonly collapsedNavigationPlane: HTMLElement | null
  readonly expandedNavigationPlane: HTMLElement | null
  readonly expandedCollapseIcon: HTMLElement | null
  readonly mainContentPlane: HTMLElement | null
  readonly navigationChromeBridge: HTMLElement | null
  readonly routeSelectionAuras: ReadonlyMap<string, HTMLElement>
}

export interface AdminNavigationMotionController {
  dispose(): void
  sync(state: Readonly<AdminNavigationMotionState>, cause: AdminNavigationMotionCause): void
}

interface AdminNavigationMotionControllerOptions {
  readonly initialState: Readonly<AdminNavigationMotionState>
  readonly onCollapseSettled: () => void
  readonly resolveTargets: () => Readonly<AdminNavigationMotionTargets>
  readonly root: HTMLElement
}

type GsapContext = ReturnType<typeof gsap.context>
type GsapTimeline = ReturnType<typeof gsap.timeline>

const readyAttribute = 'data-pavp-admin-navigation-motion'
const readyAttributeValue = 'ready'
const collapseMotionAttribute = 'data-pavp-admin-navigation-collapse-motion'
const routeMotionAttribute = 'data-pavp-admin-navigation-route-motion'
const switchAttribute = 'data-pavp-admin-navigation-switch'
const durationPattern = /^(\d+(?:\.\d+)?)(ms|s)$/u
const cubicBezierPattern =
  /^cubic-bezier\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/u
const dockInactiveScale = 0.86
const routeAuraInactiveScale = 0.72
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

function isCollapsedDockIcon(
  element: HTMLElement | undefined,
  targets: Readonly<AdminNavigationMotionTargets>,
): boolean {
  return element === targets.collapsedCollapseIcon
}

export function createAdminNavigationMotionController(
  options: Readonly<AdminNavigationMotionControllerOptions>,
): AdminNavigationMotionController {
  let collapseContext: GsapContext | undefined
  let collapseTimeline: GsapTimeline | undefined
  let collapseTimelineOriginCollapsed: boolean | undefined
  let collapseTimelineTargetCollapsed: boolean | undefined
  let collapseTravelInline = 0
  let mainContentXSetter: ((value: number) => void) | undefined
  const collapseProgress = { value: options.initialState.collapsed ? 1 : 0 }
  let routeContext: GsapContext | undefined
  let routeTimeline: GsapTimeline | undefined
  let routeTimelineOriginName: string | undefined
  let routeTimelineTargetName: string | undefined
  let disposed = false
  let latestState = options.initialState
  const routeTrackedTargets = new Set<HTMLElement>()

  function refreshReadyAttribute(): void {
    if (collapseContext !== undefined || routeContext !== undefined) {
      options.root.setAttribute(readyAttribute, readyAttributeValue)
    } else {
      options.root.removeAttribute(readyAttribute)
    }
  }

  function stopCollapseMotion(): void {
    collapseTimeline?.kill()
    collapseTimeline = undefined
    collapseTimelineOriginCollapsed = undefined
    collapseTimelineTargetCollapsed = undefined
    mainContentXSetter = undefined
    const activeContext = collapseContext
    collapseContext = undefined
    activeContext?.revert()
    options.root.removeAttribute(collapseMotionAttribute)
    options.root.removeAttribute(switchAttribute)
    refreshReadyAttribute()
  }

  function stopRouteMotion(): void {
    routeTimeline?.kill()
    routeTimeline = undefined
    routeTimelineOriginName = undefined
    routeTimelineTargetName = undefined
    const activeContext = routeContext
    routeContext = undefined
    activeContext?.revert()
    routeTrackedTargets.clear()
    options.root.removeAttribute(routeMotionAttribute)
    refreshReadyAttribute()
  }

  function stopActiveMotion(): void {
    stopCollapseMotion()
    stopRouteMotion()
  }

  function deactivate(): void {
    stopActiveMotion()
    options.root.removeAttribute(readyAttribute)
    options.root.removeAttribute(collapseMotionAttribute)
    options.root.removeAttribute(routeMotionAttribute)
    options.root.removeAttribute(switchAttribute)
    options.onCollapseSettled()
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
    for (const [routeName, aura] of targets.routeSelectionAuras) {
      const values: gsap.TweenVars = {
        autoAlpha: routeName === state.activeRouteName ? 1 : 0,
      }

      if (state.motion === 'full') {
        values.scale = routeName === state.activeRouteName ? 1 : routeAuraInactiveScale
      }

      gsap.set(aura, values)
    }
  }

  function stableNavigationPlaneState(
    targets: Readonly<AdminNavigationMotionTargets>,
    state: Readonly<AdminNavigationMotionState>,
  ): void {
    const planes = [targets.expandedNavigationPlane, targets.collapsedNavigationPlane]

    for (const [index, plane] of planes.entries()) {
      if (plane === null) {
        continue
      }

      const isCollapsedPlane = index === 1
      const values: gsap.TweenVars = {
        autoAlpha: isCollapsedPlane === state.collapsed ? 1 : 0,
      }

      if (state.motion === 'full') {
        values.x = 0
      }

      gsap.set(plane, values)
    }
  }

  function stableNavigationChromeBridgeState(
    targets: Readonly<AdminNavigationMotionTargets>,
    state: Readonly<AdminNavigationMotionState>,
  ): void {
    if (state.motion !== 'full' || targets.navigationChromeBridge === null) {
      return
    }

    gsap.set(targets.navigationChromeBridge, {
      autoAlpha: 1,
      force3D: true,
      x: state.collapsed ? -collapseTravelInline : 0,
    })
  }

  function renderMainContentBridge(): void {
    if (mainContentXSetter === undefined) {
      return
    }

    const translatedInline = latestState.collapsed
      ? collapseTravelInline * (1 - collapseProgress.value)
      : -collapseTravelInline * collapseProgress.value

    mainContentXSetter(translatedInline)
  }

  function beginCollapseContext(
    targets: Readonly<AdminNavigationMotionTargets>,
    startingState: Readonly<AdminNavigationMotionState>,
    finalState: Readonly<AdminNavigationMotionState>,
  ): void {
    collapseTravelInline = Math.abs(finalState.collapseOffsetInline)
    collapseContext = gsap.context(() => {
      stableDockState(targets, startingState)
      stableNavigationPlaneState(targets, startingState)
      stableNavigationChromeBridgeState(targets, startingState)

      if (finalState.motion === 'full' && targets.mainContentPlane !== null) {
        gsap.set(targets.mainContentPlane, { x: 0 })
        mainContentXSetter = gsap.quickSetter(targets.mainContentPlane, 'x', 'px') as (
          value: number,
        ) => void
        collapseProgress.value = startingState.collapsed ? 1 : 0
        renderMainContentBridge()
      }
    }, options.root)
    options.root.setAttribute(collapseMotionAttribute, readyAttributeValue)
    refreshReadyAttribute()
  }

  function ensureRouteContext(
    targets: Readonly<AdminNavigationMotionTargets>,
    startingState: Readonly<AdminNavigationMotionState>,
  ): void {
    const entries = [...targets.routeSelectionAuras.entries()]

    if (routeContext === undefined) {
      routeContext = gsap.context(() => {
        stableRouteState(targets, startingState)
      }, options.root)

      for (const [, aura] of entries) {
        routeTrackedTargets.add(aura)
      }
      options.root.setAttribute(routeMotionAttribute, readyAttributeValue)
      refreshReadyAttribute()
      return
    }

    const newEntries = entries.filter(([, aura]) => !routeTrackedTargets.has(aura))

    if (newEntries.length === 0) {
      return
    }

    for (const [, aura] of newEntries) {
      routeTrackedTargets.add(aura)
    }

    routeContext.add(() => {
      stableRouteState(
        {
          ...targets,
          routeSelectionAuras: new Map(newEntries),
        },
        startingState,
      )
    })
  }

  function finishCollapseMotion(timeline: GsapTimeline): void {
    if (collapseTimeline !== timeline) {
      return
    }

    collapseTimeline = undefined
    collapseTimelineOriginCollapsed = undefined
    collapseTimelineTargetCollapsed = undefined
    mainContentXSetter = undefined
    const completedContext = collapseContext
    collapseContext = undefined
    completedContext?.revert()
    options.root.removeAttribute(collapseMotionAttribute)
    options.root.removeAttribute(switchAttribute)
    refreshReadyAttribute()
    options.onCollapseSettled()
  }

  function finishRouteMotion(timeline: GsapTimeline): void {
    if (routeTimeline !== timeline) {
      return
    }

    routeTimeline = undefined
    routeTimelineOriginName = undefined
    routeTimelineTargetName = undefined
    const completedContext = routeContext
    routeContext = undefined
    completedContext?.revert()
    routeTrackedTargets.clear()
    options.root.removeAttribute(routeMotionAttribute)
    refreshReadyAttribute()
  }

  function continueCollapseReversal(state: Readonly<AdminNavigationMotionState>): boolean {
    const timeline = collapseTimeline

    if (timeline === undefined) {
      return false
    }

    renderMainContentBridge()

    if (state.collapsed === collapseTimelineTargetCollapsed) {
      timeline.play()
      return true
    }

    if (state.collapsed === collapseTimelineOriginCollapsed) {
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

  function animateCollapse(
    targets: Readonly<AdminNavigationMotionTargets>,
    state: Readonly<AdminNavigationMotionState>,
    previousState: Readonly<AdminNavigationMotionState>,
    duration: number,
    ease: gsap.EaseFunction,
  ): void {
    beginCollapseContext(targets, previousState, state)

    const icons = [targets.expandedCollapseIcon, targets.collapsedCollapseIcon].filter(
      (element): element is HTMLElement => element !== null,
    )
    const timeline = gsap.timeline({ defaults: { duration, ease }, paused: true })
    collapseTimeline = timeline
    collapseTimelineOriginCollapsed = previousState.collapsed
    collapseTimelineTargetCollapsed = state.collapsed

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

    const expandedPlane = targets.expandedNavigationPlane
    const collapsedPlane = targets.collapsedNavigationPlane

    if (expandedPlane !== null && collapsedPlane !== null) {
      const outgoingPlane = state.collapsed ? expandedPlane : collapsedPlane
      const incomingPlane = state.collapsed ? collapsedPlane : expandedPlane
      const outgoingValues: gsap.TweenVars = {
        autoAlpha: 0,
        overwrite: 'auto',
      }
      const incomingValues: gsap.TweenVars = {
        autoAlpha: 1,
        overwrite: 'auto',
      }

      if (state.motion === 'full') {
        const direction = state.collapsed ? 1 : -1
        const planeShiftInline = Math.abs(state.collapseOffsetInline) / 12
        gsap.set(incomingPlane, { x: planeShiftInline * direction })
        outgoingValues.x = planeShiftInline * direction * -1
        incomingValues.x = 0
      }

      timeline.to(outgoingPlane, outgoingValues, 0)
      timeline.to(incomingPlane, incomingValues, 0)
    }

    if (state.motion === 'full' && targets.navigationChromeBridge !== null) {
      timeline.to(
        targets.navigationChromeBridge,
        {
          force3D: true,
          overwrite: 'auto',
          x: state.collapsed ? -collapseTravelInline : 0,
        },
        0,
      )
    }

    if (state.motion === 'full' && mainContentXSetter !== undefined) {
      timeline.to(
        collapseProgress,
        {
          value: state.collapsed ? 1 : 0,
          onUpdate: renderMainContentBridge,
          overwrite: 'auto',
        },
        0,
      )
    }

    timeline.eventCallback('onComplete', () => {
      finishCollapseMotion(timeline)
    })
    timeline.eventCallback('onReverseComplete', () => {
      finishCollapseMotion(timeline)
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
    const entries = [...targets.routeSelectionAuras.entries()]

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

        return isSelected ? 1 : routeAuraInactiveScale
      }
    }

    timeline.to(
      entries.map(([, aura]) => aura),
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

    if (cause === 'route' && previousState.activeRouteName === state.activeRouteName) {
      return
    }

    const targets = options.resolveTargets()
    const duration = parseMotionDuration(options.root, state.motion)
    const ease = parseMotionEase(options.root)

    if (cause === 'collapse') {
      stopRouteMotion()

      if (!continueCollapseReversal(state)) {
        stopCollapseMotion()
        options.root.setAttribute(switchAttribute, 'active')
        animateCollapse(targets, state, previousState, duration, ease)
      }
      return
    }

    ensureRouteContext(targets, previousState)

    if (!continueRouteReversal(state.activeRouteName)) {
      const replacingActiveTimeline = routeTimeline !== undefined
      routeTimeline?.kill()
      routeTimeline = undefined
      animateRoute(
        targets,
        state,
        replacingActiveTimeline ? undefined : previousState.activeRouteName,
        duration,
        ease,
      )
    }
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
