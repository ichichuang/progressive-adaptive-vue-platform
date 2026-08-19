import type { RouteName } from './route-registry'
import type { RouterErrorId } from './router-error-registry'

export const activeGuardStageRegistry = Object.freeze([
  'validate-route-contract',
  'ensure-runtime-configuration-ready',
  'resolve-router-owned-safe-destination',
  'prepare-route-presentation',
  'commit-focus-and-scroll',
] as const)

export type ActiveGuardStage = (typeof activeGuardStageRegistry)[number]

export interface ActiveGuardStageProgress {
  advance(stage: ActiveGuardStage): void
  complete(): void
}

export function createActiveGuardStageProgress(): ActiveGuardStageProgress {
  let nextStageIndex = 0

  return Object.freeze({
    advance(stage: ActiveGuardStage): void {
      if (activeGuardStageRegistry[nextStageIndex] !== stage) {
        throw new TypeError('The active Router Guard stage order diverged from its registry.')
      }

      nextStageIndex += 1
    },
    complete(): void {
      if (nextStageIndex !== activeGuardStageRegistry.length) {
        throw new TypeError('The active Router Guard projection is incomplete.')
      }
    },
  })
}

export function advanceActiveGuardStage(
  progress: ActiveGuardStageProgress,
  stage: ActiveGuardStage,
): void {
  progress.advance(stage)
}

export function completeActiveGuardStages(progress: ActiveGuardStageProgress): void {
  progress.complete()
}

export const activeNavigationOutcomeRegistry = Object.freeze([
  'duplicated',
  'cancelled-by-new-navigation',
  'redirected',
  'invalid-input',
  'chunk-load-failed',
  'route-disposal-failed',
  'redirect-loop',
  'unknown-navigation-failure',
] as const)

export interface RegisteredRouteDestination {
  readonly name: RouteName
}

export type TypedNavigationResult =
  | {
      readonly kind: 'allow'
      readonly navigationId: string
      readonly destination: RegisteredRouteDestination
    }
  | {
      readonly kind: 'redirect'
      readonly navigationId: string
      readonly reason: 'redirected'
      readonly destination: RegisteredRouteDestination
      readonly replace: true
    }
  | {
      readonly kind: 'cancel'
      readonly navigationId: string
      readonly reason: 'cancelled-by-new-navigation'
    }
  | {
      readonly kind: 'failure'
      readonly navigationId: string
      readonly errorId: RouterErrorId
      readonly destination: RegisteredRouteDestination
    }

export function registeredRouteDestination(name: RouteName): RegisteredRouteDestination {
  return Object.freeze({ name })
}
