import { watch } from 'vue'
import {
  isNavigationFailure,
  loadRouteLocation,
  type Router,
  type RouteLocationResolved,
} from 'vue-router'

import type { AppearanceReadBoundary } from '../../appearance/appearance-read-boundary'
import { getRouteRecord, type RouteName } from '../route-registry'
import { reserveRouterPresentationCommit } from '../router-lifecycle'
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
  readonly directionOwnerId: number
}

type RouterPushResult = Awaited<ReturnType<Router['push']>>
type RouterPresentationCommitReservation = ReturnType<typeof reserveRouterPresentationCommit>

export interface RouteTransitionCoordinator {
  navigate(targetRouteName: RouteName): Promise<RouterPushResult>
  dispose(): void
}

const directionAttribute = 'data-pavp-route-transition-direction'
const shellSelector = '.pavp-admin-shell'

function readBoundaryState(): {
  readonly validity: RouteTransitionBoundaryValidity
  readonly layoutProfile: 'narrow' | 'regular' | 'wide' | null
} {
  const boundary = routeTransitionBoundaryRegistry[0]
  const targets = document.querySelectorAll<HTMLElement>(boundary.target)
  if (targets.length === 0) {
    return Object.freeze({ validity: 'missing', layoutProfile: null })
  }
  if (targets.length !== 1) {
    return Object.freeze({ validity: 'duplicate', layoutProfile: null })
  }

  const layoutProfile = targets[0]?.closest<HTMLElement>(shellSelector)?.dataset['layoutProfile']
  return Object.freeze({
    validity: 'valid',
    layoutProfile:
      layoutProfile === 'narrow' || layoutProfile === 'regular' || layoutProfile === 'wide'
        ? layoutProfile
        : null,
  })
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
  let navigationEpoch = 0
  let directionOwnerSequence = 0
  let directionOwnerId: number | undefined
  let activeTransition: ActiveVisualTransition | undefined
  let disposed = false
  const activePresentationCommitReservations = new Map<
    RouterPresentationCommitReservation,
    number
  >()

  const stopMotionObservation = watch(
    () => input.appearance.snapshot.value.motion,
    () => {
      skipVisualTransition(activeTransition)
    },
  )

  const clearDirection = (ownerId: number): void => {
    if (directionOwnerId !== ownerId) {
      return
    }
    document.documentElement.removeAttribute(directionAttribute)
    directionOwnerId = undefined
  }

  const projectDirection = (direction: RouteTransitionDirection): number => {
    const ownerId = ++directionOwnerSequence
    directionOwnerId = ownerId
    document.documentElement.setAttribute(directionAttribute, direction)
    return ownerId
  }

  const cancelPresentationCommitReservations = (
    shouldCancel: (reservationEpoch: number) => boolean,
  ): void => {
    for (const [reservation, reservationEpoch] of activePresentationCommitReservations) {
      if (!shouldCancel(reservationEpoch)) {
        continue
      }
      reservation.cancel()
      activePresentationCommitReservations.delete(reservation)
    }
  }

  const beginPresentationCommitReservation = (
    targetRouteName: RouteName,
    resolvedTarget: RouteLocationResolved,
    reservationEpoch: number,
  ): RouterPresentationCommitReservation => {
    const reservation = reserveRouterPresentationCommit({
      router: input.router,
      expectedRouteName: targetRouteName,
      expectedFullPath: resolvedTarget.fullPath,
    })
    activePresentationCommitReservations.set(reservation, reservationEpoch)
    return reservation
  }

  const navigateDirectly = (targetRouteName: RouteName): Promise<RouterPushResult> =>
    input.router.push({ name: targetRouteName })

  const startNativeTransition = (
    update: () => Promise<void>,
    decision: Extract<RouteTransitionDecision, { readonly kind: 'native-document' }>,
    typed: boolean,
  ): ViewTransition =>
    document.startViewTransition(
      typed
        ? {
            update,
            types: [decision.transitionType],
          }
        : update,
    )

  const runVisualTransition = async (
    targetRouteName: RouteName,
    resolvedTarget: RouteLocationResolved,
    decision: Extract<RouteTransitionDecision, { readonly kind: 'native-document' }>,
    requestEpoch: number,
  ): Promise<RouterPushResult> => {
    skipVisualTransition(activeTransition)

    const updateState: {
      result: RouterPushResult
      started: boolean
      owningVisualTransition: ActiveVisualTransition | undefined
    } = {
      result: undefined,
      started: false,
      owningVisualTransition: undefined,
    }
    let ownerId = projectDirection(decision.direction)
    const requestIsStale = (): boolean => requestEpoch !== navigationEpoch || disposed
    const update = async (): Promise<void> => {
      updateState.started = true
      if (requestIsStale()) {
        return
      }

      const reservation = beginPresentationCommitReservation(
        targetRouteName,
        resolvedTarget,
        requestEpoch,
      )
      try {
        updateState.result = await input.router.push({ name: targetRouteName })

        if (isNavigationFailure(updateState.result)) {
          reservation.cancel()
          skipVisualTransition(updateState.owningVisualTransition)
          return
        }

        const currentRoute = input.router.currentRoute.value
        if (
          requestIsStale() ||
          currentRoute.name !== resolvedTarget.name ||
          currentRoute.fullPath !== resolvedTarget.fullPath ||
          currentRoute.redirectedFrom !== undefined
        ) {
          reservation.cancel()
          skipVisualTransition(updateState.owningVisualTransition)
          return
        }

        const presentationCommit = await reservation.completion
        if (presentationCommit === 'cancelled') {
          skipVisualTransition(updateState.owningVisualTransition)
        }
      } catch (error) {
        reservation.cancel()
        skipVisualTransition(updateState.owningVisualTransition)
        throw error
      } finally {
        activePresentationCommitReservations.delete(reservation)
      }
    }
    const hasUpdateStarted = (): boolean => updateState.started

    let transition: ViewTransition
    try {
      transition = startNativeTransition(update, decision, supportsTypedViewTransitions())
    } catch (error) {
      if (updateState.started) {
        cancelPresentationCommitReservations(
          (reservationEpoch) => reservationEpoch === requestEpoch,
        )
        clearDirection(ownerId)
        throw error
      }

      clearDirection(ownerId)
      ownerId = projectDirection('neutral')
      try {
        transition = startNativeTransition(update, decision, false)
      } catch (fallbackError) {
        clearDirection(ownerId)
        if (hasUpdateStarted()) {
          cancelPresentationCommitReservations(
            (reservationEpoch) => reservationEpoch === requestEpoch,
          )
          throw fallbackError
        }
        return navigateDirectly(targetRouteName)
      }
    }

    const ownedTransition = Object.freeze({ handle: transition, directionOwnerId: ownerId })
    updateState.owningVisualTransition = ownedTransition
    activeTransition = ownedTransition

    void transition.ready.catch(() => undefined)
    const updateCompletion = transition.updateCallbackDone.then(
      () => updateState.result,
      (error: unknown) => {
        throw error
      },
    )
    void transition.finished.then(
      () => {
        if (activeTransition === ownedTransition) {
          activeTransition = undefined
        }
        clearDirection(ownedTransition.directionOwnerId)
      },
      () => {
        if (activeTransition === ownedTransition) {
          activeTransition = undefined
        }
        clearDirection(ownedTransition.directionOwnerId)
      },
    )

    return updateCompletion
  }

  return Object.freeze({
    navigate: async (targetRouteName: RouteName) => {
      const currentEpoch = ++navigationEpoch
      cancelPresentationCommitReservations((reservationEpoch) => reservationEpoch < currentEpoch)
      skipVisualTransition(activeTransition)
      const fromRoute = getRouteRecord(input.router.currentRoute.value.name)
      const toRoute = getRouteRecord(targetRouteName)
      const motion = input.appearance.snapshot.value.motion
      const nativeApiAvailable = typeof document.startViewTransition === 'function'
      const boundaryState = readBoundaryState()
      const decision = resolveRouteTransition({
        fromRouteName: fromRoute.name,
        toRouteName: toRoute.name,
        navigationKind: 'push',
        fromFamilyId: fromRoute.meta.routeTransitionFamilyId,
        toFamilyId: toRoute.meta.routeTransitionFamilyId,
        motion,
        layoutProfile: boundaryState.layoutProfile,
        nativeApiAvailable,
        typedTransitionSupport: supportsTypedViewTransitions(),
        documentVisibility: document.visibilityState,
        boundaryValidity: boundaryState.validity,
        activeTransitionState: (activeTransition === undefined
          ? 'idle'
          : 'active') satisfies RouteTransitionActiveState,
      })

      if (decision.kind === 'bypass') {
        return navigateDirectly(targetRouteName)
      }

      const resolvedTarget: RouteLocationResolved = input.router.resolve({ name: targetRouteName })
      try {
        await loadRouteLocation(resolvedTarget)
      } catch (error) {
        if (currentEpoch !== navigationEpoch || disposed) {
          throw error
        }
        return navigateDirectly(targetRouteName)
      }

      if (currentEpoch !== navigationEpoch || disposed) {
        return
      }

      return runVisualTransition(targetRouteName, resolvedTarget, decision, currentEpoch)
    },
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      navigationEpoch += 1
      cancelPresentationCommitReservations(() => true)
      stopMotionObservation()
      skipVisualTransition(activeTransition)
      activeTransition = undefined
      if (directionOwnerId !== undefined) {
        clearDirection(directionOwnerId)
      }
    },
  })
}
