import type { LayoutProfileId } from '@platform/design-system'

import type { RouteName } from '../route-registry'

export type RouteTransitionPresetId =
  | 'route-transition.none'
  | 'route-transition.content-crossfade'
  | 'route-transition.axis-inline-soft'
  | 'route-transition.drill-soft'
  | 'route-transition.sheet-soft'

export type RouteTransitionFamilyId = 'route-family.architecture-workspace' | 'route-family.error'

export type RouteTransitionBoundaryId = 'route-transition-boundary.architecture-console-content'

export type RouteTransitionRuleKind =
  'global-default' | 'route-family' | 'ordered-routes' | 'exact-route-pair'

export type RouteTransitionNavigationKind =
  | 'push'
  | 'initial'
  | 'replace'
  | 'redirect'
  | 'traverse-back'
  | 'traverse-forward'
  | 'recovery'
  | 'error'

export type RouteTransitionDirection = 'forward' | 'reverse' | 'neutral'

export type RouteTransitionMotion = 'full' | 'reduced' | 'none'

export type RouteTransitionMotionProjection = Exclude<RouteTransitionMotion, 'none'>

export type RouteTransitionType =
  | 'pavp-route-content-crossfade'
  | 'pavp-route-axis-inline-soft'
  | 'pavp-route-drill-soft'
  | 'pavp-route-sheet-soft'

export type RouteTransitionBoundaryValidity = 'valid' | 'missing' | 'duplicate'

export type RouteTransitionActiveState = 'idle' | 'active'

export type RouteTransitionBypassReason =
  | 'initial-navigation'
  | 'current-route'
  | 'replace-navigation'
  | 'redirect-navigation'
  | 'history-traversal'
  | 'recovery-navigation'
  | 'error-navigation'
  | 'error-family-edge'
  | 'motion-none'
  | 'unsupported-native-api'
  | 'hidden-document'
  | 'missing-boundary'
  | 'duplicate-boundary'
  | 'invalid-layout-profile'
  | 'invalid-rule'
  | 'unknown-registry-reference'

export type RouteTransitionDecision =
  | Readonly<{
      kind: 'bypass'
      reason: RouteTransitionBypassReason
    }>
  | Readonly<{
      kind: 'native-document'
      presetId: Exclude<RouteTransitionPresetId, 'route-transition.none'>
      boundaryId: RouteTransitionBoundaryId
      motionProjection: RouteTransitionMotionProjection
      direction: RouteTransitionDirection
      transitionType: RouteTransitionType
    }>

export interface RouteTransitionResolverInput {
  readonly fromRouteName: RouteName
  readonly toRouteName: RouteName
  readonly navigationKind: RouteTransitionNavigationKind
  readonly fromFamilyId: RouteTransitionFamilyId
  readonly toFamilyId: RouteTransitionFamilyId
  readonly motion: RouteTransitionMotion
  readonly layoutProfile: LayoutProfileId | null
  readonly nativeApiAvailable: boolean
  readonly typedTransitionSupport: boolean
  readonly documentVisibility: DocumentVisibilityState
  readonly boundaryValidity: RouteTransitionBoundaryValidity
  readonly activeTransitionState: RouteTransitionActiveState
}

interface RouteTransitionRuleBase {
  readonly ruleId: string
  readonly priority: number
  readonly forwardPresetId: RouteTransitionPresetId
  readonly reversePresetId: RouteTransitionPresetId
  readonly fallbackPresetId: RouteTransitionPresetId
}

interface GlobalDefaultRouteTransitionRule extends RouteTransitionRuleBase {
  readonly kind: 'global-default'
}

interface RouteFamilyTransitionRule extends RouteTransitionRuleBase {
  readonly kind: 'route-family'
  readonly fromFamilyId: RouteTransitionFamilyId
  readonly toFamilyId: RouteTransitionFamilyId
}

interface OrderedRoutesTransitionRule extends RouteTransitionRuleBase {
  readonly kind: 'ordered-routes'
  readonly routeNames: readonly [RouteName, RouteName, ...RouteName[]]
}

interface ExactRoutePairTransitionRule extends RouteTransitionRuleBase {
  readonly kind: 'exact-route-pair'
  readonly fromRouteName: RouteName
  readonly toRouteName: RouteName
}

export type RouteTransitionRule =
  | GlobalDefaultRouteTransitionRule
  | RouteFamilyTransitionRule
  | OrderedRoutesTransitionRule
  | ExactRoutePairTransitionRule
