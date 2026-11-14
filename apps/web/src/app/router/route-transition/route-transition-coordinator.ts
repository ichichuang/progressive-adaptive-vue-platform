import type { UiMotionController, UiMotionHandle } from '@platform/ui'
import { watch } from 'vue'
import { loadRouteLocation, type Router, type RouteLocationResolved } from 'vue-router'

import type {
  RouteMotionPlayer,
  RouteMotionOrigin,
  RouteRevealBoundary,
} from './route-motion-player'
import type { AppearanceReadBoundary } from '../../appearance/appearance-read-boundary'
import { getRouteRecord } from '../route-registry'
import {
  acceptRouterNavigation,
  cancelledRouterNavigationResult,
  type RouterNavigationRequest,
  type RouterNavigationOptions,
  reserveRouterPresentationCommit,
} from '../router-lifecycle'
import type { RegisteredRouteDestination, TypedNavigationResult } from '../route-input'
import { routeTransitionBoundaryRegistry } from './route-transition-boundary-registry'
import { resolveRouteTransition } from './resolve-route-transition'
import {
  allowsCinematicRoutePreset,
  isWelcomeRouteEdge,
  getCinematicRouteRecipe,
  type CinematicRoutePreset,
  routeTransitionShowcaseRules,
} from './route-transition-showcase'
import type {
  RouteTransitionBoundaryValidity,
  RouteTransitionActiveState,
  RouteTransitionDecision,
  RouteTransitionDirection,
  RouteTransitionPresetId,
} from './route-transition-types'

interface ActiveVisualTransition {
  readonly handle: ViewTransition
  readonly directionOwner: { readonly element: HTMLElement }
}

interface RouteTransitionElement extends HTMLElement {
  startViewTransition(options: StartViewTransitionOptions): ViewTransition
}

type RouterPresentationCommitReservation = ReturnType<typeof reserveRouterPresentationCommit>

export interface RouteTransitionNavigationOptions extends RouterNavigationOptions {
  readonly origin?: RouteMotionOrigin
  readonly visual?:
    | { readonly preset: RouteTransitionPresetId }
    | {
        readonly preset: CinematicRoutePreset
        readonly origin: 'center' | { readonly clientX: number; readonly clientY: number }
      }
}

export interface RouteTransitionCoordinator {
  navigate(
    destination: RegisteredRouteDestination,
    options?: RouteTransitionNavigationOptions,
  ): Promise<TypedNavigationResult>
  dispose(): void
}

const directionAttribute = 'data-pavp-route-transition-direction'
const shellSelector = '.pavp-admin-shell'

function readBoundaryState(): {
  readonly validity: RouteTransitionBoundaryValidity
  readonly layoutProfile: 'narrow' | 'regular' | 'wide' | null
  readonly element: HTMLElement | undefined
} {
  const boundary = routeTransitionBoundaryRegistry[0]
  const targets = document.querySelectorAll(boundary.target)
  if (targets.length === 0) {
    return Object.freeze({ validity: 'missing', layoutProfile: null, element: undefined })
  }
  if (targets.length !== 1) {
    return Object.freeze({ validity: 'duplicate', layoutProfile: null, element: undefined })
  }

  const element = targets[0]
  if (!(element instanceof HTMLElement) || !element.isConnected) {
    return Object.freeze({ validity: 'missing', layoutProfile: null, element: undefined })
  }
  const layoutProfile = element.closest<HTMLElement>(shellSelector)?.dataset['layoutProfile']
  return Object.freeze({
    validity: 'valid',
    element,
    layoutProfile:
      layoutProfile === 'narrow' || layoutProfile === 'regular' || layoutProfile === 'wide'
        ? layoutProfile
        : null,
  })
}

function supportsElementViewTransition(
  element: HTMLElement | undefined,
): element is RouteTransitionElement {
  return (
    element !== undefined &&
    'startViewTransition' in element &&
    typeof element.startViewTransition === 'function'
  )
}

function supportsTypedViewTransitions(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:active-view-transition-type(pavp-route-content-crossfade))')
  )
}

function skipVisualTransition(transition: ActiveVisualTransition | undefined): void {
  if (transition === undefined) {
    return
  }
  try {
    transition.handle.skipTransition()
  } catch {
    // A visual skip is progressive enhancement cleanup, not an application error.
  }
}

export function createRouteTransitionCoordinator(input: {
  readonly router: Router
  readonly appearance: AppearanceReadBoundary
  readonly motionPlayer?: () => RouteMotionPlayer | undefined
  readonly reveal?: RouteRevealBoundary
}): RouteTransitionCoordinator {
  let directionOwner: ActiveVisualTransition['directionOwner'] | undefined
  let activeTransition: ActiveVisualTransition | undefined
  let activeCinematic: { handle: UiMotionHandle | undefined; finishReveal: () => void } | undefined
  let activeReservation: RouterPresentationCommitReservation | undefined
  let pendingNavigation: RouterNavigationRequest | undefined
  let disposed = false

  const clearDirection = (owner: typeof directionOwner): void => {
    if (owner === undefined || directionOwner !== owner) return
    owner.element.removeAttribute(directionAttribute)
    directionOwner = undefined
  }

  const cancelPresentation = (): void => {
    activeReservation?.cancel()
    activeReservation = undefined
  }

  const cancelCinematic = (): void => {
    activeCinematic?.handle?.cancel()
    activeCinematic?.finishReveal()
    activeCinematic = undefined
  }

  const stopMotionObservation = watch(
    () => input.appearance.snapshot.value.motion,
    () => {
      skipVisualTransition(activeTransition)
      cancelCinematic()
      cancelPresentation()
      clearDirection(directionOwner)
    },
    { flush: 'sync' },
  )

  const requestIsCurrent = (request: RouterNavigationRequest): boolean =>
    !disposed && request.isCurrent()

  const navigateDirectly = (request: RouterNavigationRequest): Promise<TypedNavigationResult> => {
    if (pendingNavigation === request) pendingNavigation = undefined
    return request.navigate()
  }

  const projectDirection = (element: HTMLElement, direction: RouteTransitionDirection) => {
    clearDirection(directionOwner)
    directionOwner = { element }
    element.setAttribute(directionAttribute, direction)
    return directionOwner
  }

  const startNativeTransition = (
    element: RouteTransitionElement,
    update: () => Promise<void>,
    decision: Extract<RouteTransitionDecision, { readonly kind: 'native-element' }>,
  ): ViewTransition => element.startViewTransition({ update, types: [decision.transitionType] })

  const runVisualTransition = async (
    request: RouterNavigationRequest,
    resolvedTarget: RouteLocationResolved,
    decision: Extract<RouteTransitionDecision, { readonly kind: 'native-element' }>,
    element: RouteTransitionElement,
  ): Promise<void> => {
    const owner = projectDirection(element, decision.direction)
    const visual: { transition: ActiveVisualTransition | undefined } = { transition: undefined }
    const update = async (): Promise<void> => {
      if (!requestIsCurrent(request)) return
      const reservation = reserveRouterPresentationCommit({
        router: input.router,
        navigationId: request.navigationId,
        expectedRouteName: getRouteRecord(resolvedTarget.name).name,
        expectedFullPath: resolvedTarget.fullPath,
      })
      activeReservation = reservation
      try {
        const result = await navigateDirectly(request)
        const currentRoute = input.router.currentRoute.value
        if (
          result.kind !== 'allow' ||
          result.presentation !== 'page' ||
          !requestIsCurrent(request) ||
          currentRoute.name !== resolvedTarget.name ||
          currentRoute.fullPath !== resolvedTarget.fullPath ||
          currentRoute.redirectedFrom !== undefined
        ) {
          reservation.cancel()
          skipVisualTransition(visual.transition)
          return
        }
        const presentationCommit = await reservation.completion
        if (presentationCommit === 'cancelled') skipVisualTransition(visual.transition)
      } catch (error) {
        reservation.cancel()
        skipVisualTransition(visual.transition)
        throw error
      } finally {
        if (activeReservation === reservation) activeReservation = undefined
      }
    }
    // Visual startup may schedule the callback before throwing; both paths share one update.
    let updatePromise: Promise<void> | undefined
    const updateOnce = (): Promise<void> => (updatePromise ??= update())
    const finishReveal = input.reveal?.begin()
    let transition: ViewTransition
    try {
      transition = startNativeTransition(element, updateOnce, decision)
    } catch {
      finishReveal?.()
      clearDirection(owner)
      await updateOnce()
      return
    }
    const ownedTransition = Object.freeze({ handle: transition, directionOwner: owner })
    visual.transition = ownedTransition
    activeTransition = ownedTransition
    void transition.ready.catch(() => undefined)
    void request.completion.then((result) => {
      if (result.kind !== 'allow' || result.presentation !== 'page')
        skipVisualTransition(ownedTransition)
    })
    const finishVisual = (): void => {
      if (activeTransition === ownedTransition) activeTransition = undefined
      clearDirection(ownedTransition.directionOwner)
      finishReveal?.()
    }
    void transition.finished.then(finishVisual, finishVisual)
    await transition.updateCallbackDone
  }

  const runCinematicTransition = async (
    request: RouterNavigationRequest,
    resolvedTarget: RouteLocationResolved,
    element: HTMLElement,
    player: UiMotionController,
    visual: Extract<
      NonNullable<RouteTransitionNavigationOptions['visual']>,
      { readonly preset: CinematicRoutePreset }
    >,
  ): Promise<TypedNavigationResult> => {
    const owner = {
      handle: undefined as UiMotionHandle | undefined,
      finishReveal: input.reveal?.begin() ?? (() => undefined),
    }
    activeCinematic = owner
    const recipe = getCinematicRouteRecipe(visual.preset)
    const origin = visual.origin === 'center' ? {} : { origin: visual.origin }
    let revealStarted = false
    void request.completion.then((result) => {
      if ((result.kind !== 'allow' || result.presentation !== 'page') && activeCinematic === owner)
        cancelCinematic()
    })
    try {
      try {
        owner.handle = player.play(element, {
          preset: recipe.exit,
          phase: 'exit',
          durationMs: recipe.coverMs,
          ...origin,
        })
      } catch {
        return await navigateDirectly(request)
      }
      const covered = await owner.handle.finished
      if (!requestIsCurrent(request)) return await request.completion
      if (covered.kind !== 'completed' || activeCinematic !== owner)
        return await navigateDirectly(request)
      const reservation = reserveRouterPresentationCommit({
        router: input.router,
        navigationId: request.navigationId,
        expectedRouteName: getRouteRecord(resolvedTarget.name).name,
        expectedFullPath: resolvedTarget.fullPath,
      })
      activeReservation = reservation
      try {
        const result = await navigateDirectly(request)
        const currentRoute = input.router.currentRoute.value
        if (
          result.kind !== 'allow' ||
          result.presentation !== 'page' ||
          !requestIsCurrent(request) ||
          currentRoute.name !== resolvedTarget.name ||
          currentRoute.fullPath !== resolvedTarget.fullPath
        ) {
          reservation.cancel()
          return result
        }
        const presentation = await reservation.completion
        if (
          presentation === 'cancelled' ||
          !requestIsCurrent(request) ||
          activeCinematic !== owner ||
          input.appearance.snapshot.value.motion !== 'full'
        )
          return result
        try {
          owner.handle = player.play(element, {
            preset: recipe.enter,
            phase: 'enter',
            durationMs: recipe.revealMs,
            ...origin,
          })
          revealStarted = true
          const finish = (): void => {
            owner.handle?.cancel()
            owner.finishReveal()
            if (activeCinematic === owner) activeCinematic = undefined
          }
          void owner.handle.finished.then(finish, finish)
        } catch {
          // Visual enhancement must never turn an already committed navigation into a failure.
        }
        return result
      } finally {
        reservation.cancel()
        if (activeReservation === reservation) activeReservation = undefined
      }
    } finally {
      if (!revealStarted) {
        owner.handle?.cancel()
        owner.finishReveal()
        if (activeCinematic === owner) activeCinematic = undefined
      }
    }
  }

  const performNavigation = async (
    request: RouterNavigationRequest,
    options?: RouteTransitionNavigationOptions,
  ): Promise<TypedNavigationResult> => {
    const resolvedTarget = request.resolvedTarget
    if (resolvedTarget === undefined) return navigateDirectly(request)
    const fromRoute = getRouteRecord(input.router.currentRoute.value.name)
    const toRoute = getRouteRecord(resolvedTarget.name)
    if (fromRoute.meta.layoutCapabilityId !== toRoute.meta.layoutCapabilityId) {
      return navigateDirectly(request)
    }
    const motion = input.appearance.snapshot.value.motion
    const boundaryState = readBoundaryState()
    const motionPlayer = input.motionPlayer?.()
    const capturedOrigin = motionPlayer?.consumeOrigin() ?? 'center'
    const origin = options?.origin ?? capturedOrigin
    const visual = isWelcomeRouteEdge(fromRoute.name, toRoute.name)
      ? {
          preset: 'theme-rift' as const,
          origin:
            options?.visual !== undefined && 'origin' in options.visual
              ? options.visual.origin
              : origin,
        }
      : options?.visual
    const player = motionPlayer?.controller
    const showcaseRules = routeTransitionShowcaseRules(fromRoute.name, toRoute.name, visual?.preset)
    const cinematic =
      visual !== undefined &&
      'origin' in visual &&
      allowsCinematicRoutePreset(fromRoute.name, toRoute.name, visual.preset) &&
      options?.replace !== true &&
      fromRoute.meta.routeTransitionFamilyId === 'route-family.architecture-workspace' &&
      toRoute.meta.routeTransitionFamilyId === 'route-family.architecture-workspace' &&
      motion === 'full' &&
      document.visibilityState === 'visible' &&
      boundaryState.validity === 'valid' &&
      boundaryState.layoutProfile !== null &&
      boundaryState.element !== undefined &&
      player !== undefined
        ? { visual, player }
        : undefined
    const decision = resolveRouteTransition(
      {
        fromRouteName: fromRoute.name,
        toRouteName: toRoute.name,
        navigationKind: options?.replace === true ? 'replace' : 'push',
        fromFamilyId: fromRoute.meta.routeTransitionFamilyId,
        toFamilyId: toRoute.meta.routeTransitionFamilyId,
        motion,
        layoutProfile: boundaryState.layoutProfile,
        nativeApiAvailable: supportsElementViewTransition(boundaryState.element),
        typedTransitionSupport: supportsTypedViewTransitions(),
        documentVisibility: document.visibilityState,
        boundaryValidity: boundaryState.validity,
        activeTransitionState: (activeTransition === undefined
          ? 'idle'
          : 'active') satisfies RouteTransitionActiveState,
      },
      showcaseRules,
    )
    if (cinematic === undefined && decision.kind === 'bypass') return navigateDirectly(request)
    try {
      await loadRouteLocation(resolvedTarget)
    } catch {
      if (!requestIsCurrent(request)) return request.completion
      return navigateDirectly(request)
    }
    if (!requestIsCurrent(request)) return request.completion
    const preparedBoundary = readBoundaryState()
    const element = preparedBoundary.element
    if (
      input.appearance.snapshot.value.motion !== motion ||
      element !== boundaryState.element ||
      (cinematic === undefined && !supportsElementViewTransition(element)) ||
      preparedBoundary.layoutProfile !== boundaryState.layoutProfile ||
      document.visibilityState !== 'visible'
    )
      return navigateDirectly(request)
    if (cinematic !== undefined && element !== undefined)
      return runCinematicTransition(
        request,
        resolvedTarget,
        element,
        cinematic.player,
        cinematic.visual,
      )
    if (decision.kind === 'bypass' || !supportsElementViewTransition(element))
      return navigateDirectly(request)
    await runVisualTransition(request, resolvedTarget, decision, element)
    return request.completion
  }

  return Object.freeze({
    navigate(destination: RegisteredRouteDestination, options?: RouteTransitionNavigationOptions) {
      if (disposed) return Promise.resolve(cancelledRouterNavigationResult())
      const request = acceptRouterNavigation(input.router, destination, options)
      if (request.kind !== 'accepted') return Promise.resolve(request)
      pendingNavigation = request
      cancelCinematic()
      cancelPresentation()
      skipVisualTransition(activeTransition)
      clearDirection(directionOwner)
      // Each caller can settle as soon as its lifecycle operation is superseded, even during preload.
      return Promise.race([request.completion, performNavigation(request, options)])
    },
    dispose() {
      if (disposed) return
      disposed = true
      pendingNavigation?.cancelBeforeStart()
      pendingNavigation = undefined
      cancelCinematic()
      cancelPresentation()
      stopMotionObservation()
      skipVisualTransition(activeTransition)
      activeTransition = undefined
      clearDirection(directionOwner)
    },
  })
}
