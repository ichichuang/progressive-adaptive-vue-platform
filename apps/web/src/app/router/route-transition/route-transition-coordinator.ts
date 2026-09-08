import { watch } from 'vue'
import { loadRouteLocation, type Router, type RouteLocationResolved } from 'vue-router'

import type { AppearanceReadBoundary } from '../../appearance/appearance-read-boundary'
import { getRouteRecord } from '../route-registry'
import {
  acceptRouterNavigation,
  cancelledRouterNavigationResult,
  type RouterNavigationRequest,
  reserveRouterPresentationCommit,
} from '../router-lifecycle'
import type { RegisteredRouteDestination, TypedNavigationResult } from '../route-input'
import { routeTransitionBoundaryRegistry } from './route-transition-boundary-registry'
import { resolveRouteTransition } from './resolve-route-transition'
import type {
  RouteTransitionBoundaryValidity,
  RouteTransitionActiveState,
  RouteTransitionDecision,
  RouteTransitionDirection,
} from './route-transition-types'

interface ActiveVisualTransition {
  readonly handle: ViewTransition
  readonly directionOwner: { readonly element: HTMLElement }
}

interface RouteTransitionElement extends HTMLElement {
  startViewTransition(options: StartViewTransitionOptions): ViewTransition
}

type RouterPresentationCommitReservation = ReturnType<typeof reserveRouterPresentationCommit>

export interface RouteTransitionCoordinator {
  navigate(
    destination: RegisteredRouteDestination,
    options?: Readonly<{ replace?: boolean }>,
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
}): RouteTransitionCoordinator {
  let directionOwner: ActiveVisualTransition['directionOwner'] | undefined
  let activeTransition: ActiveVisualTransition | undefined
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

  const stopMotionObservation = watch(
    () => input.appearance.snapshot.value.motion,
    () => {
      skipVisualTransition(activeTransition)
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
    let transition: ViewTransition
    try {
      transition = startNativeTransition(element, updateOnce, decision)
    } catch {
      clearDirection(owner)
      await updateOnce()
      return
    }
    const ownedTransition = Object.freeze({ handle: transition, directionOwner: owner })
    visual.transition = ownedTransition
    activeTransition = ownedTransition
    void transition.ready.catch(() => undefined)
    void request.completion.then((result) => {
      if (result.kind !== 'allow') skipVisualTransition(ownedTransition)
    })
    const finishVisual = (): void => {
      if (activeTransition === ownedTransition) activeTransition = undefined
      clearDirection(ownedTransition.directionOwner)
    }
    void transition.finished.then(finishVisual, finishVisual)
    await transition.updateCallbackDone
  }

  const performNavigation = async (
    request: RouterNavigationRequest,
    options?: Readonly<{ replace?: boolean }>,
  ): Promise<TypedNavigationResult> => {
    const resolvedTarget = request.resolvedTarget
    if (resolvedTarget === undefined) return navigateDirectly(request)
    const fromRoute = getRouteRecord(input.router.currentRoute.value.name)
    const toRoute = getRouteRecord(resolvedTarget.name)
    const motion = input.appearance.snapshot.value.motion
    const boundaryState = readBoundaryState()
    const decision = resolveRouteTransition({
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
    })
    if (decision.kind === 'bypass') return navigateDirectly(request)
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
      !supportsElementViewTransition(element) ||
      preparedBoundary.layoutProfile !== boundaryState.layoutProfile ||
      document.visibilityState !== 'visible'
    )
      return navigateDirectly(request)
    await runVisualTransition(request, resolvedTarget, decision, element)
    return request.completion
  }

  return Object.freeze({
    navigate(destination: RegisteredRouteDestination, options?: Readonly<{ replace?: boolean }>) {
      if (disposed) return Promise.resolve(cancelledRouterNavigationResult())
      const request = acceptRouterNavigation(input.router, destination, options)
      if (request.kind !== 'accepted') return Promise.resolve(request)
      pendingNavigation = request
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
      cancelPresentation()
      stopMotionObservation()
      skipVisualTransition(activeTransition)
      activeTransition = undefined
      clearDirection(directionOwner)
    },
  })
}
