import { getRouteTransitionBoundary } from './route-transition-boundary-registry'
import { getRouteTransitionPreset } from './route-transition-preset-registry'
import {
  resolveRouteTransitionRule,
  routeTransitionRuleRegistry,
} from './route-transition-rule-registry'
import type {
  RouteTransitionBypassReason,
  RouteTransitionDecision,
  RouteTransitionMotion,
  RouteTransitionMotionProjection,
  RouteTransitionNavigationKind,
  RouteTransitionPresetId,
  RouteTransitionResolverInput,
  RouteTransitionRule,
} from './route-transition-types'

const boundaryId = 'route-transition-boundary.architecture-console-content' as const
const validLayoutProfiles = new Set(['narrow', 'regular', 'wide'] as const)

function bypass(reason: RouteTransitionBypassReason): RouteTransitionDecision {
  return Object.freeze({ kind: 'bypass', reason })
}

function navigationBypassReason(
  input: RouteTransitionResolverInput &
    Readonly<{ readonly navigationKind: RouteTransitionNavigationKind }>,
): RouteTransitionBypassReason | undefined {
  switch (input.navigationKind) {
    case 'push':
      return undefined
    case 'initial':
      return 'initial-navigation'
    case 'replace':
      return 'replace-navigation'
    case 'redirect':
      return 'redirect-navigation'
    case 'traverse-back':
    case 'traverse-forward':
      return 'history-traversal'
    case 'recovery':
      return 'recovery-navigation'
    case 'error':
      return 'error-navigation'
  }
}

function projectPreset(
  selectedPresetId: RouteTransitionPresetId,
  input: RouteTransitionResolverInput & Readonly<{ readonly motion: RouteTransitionMotion }>,
): RouteTransitionPresetId {
  const selectedPreset = getRouteTransitionPreset(selectedPresetId)
  if (selectedPreset === undefined) {
    return 'route-transition.none'
  }
  if (input.motion === 'none') {
    return selectedPreset.nonePresetId
  }
  if (input.motion === 'reduced') {
    return selectedPreset.reducedPresetId
  }
  if (!input.typedTransitionSupport && selectedPreset.directionAware) {
    return 'route-transition.content-crossfade'
  }
  return selectedPreset.id
}

export function resolveRouteTransition(
  input: RouteTransitionResolverInput,
  rules: readonly RouteTransitionRule[] = routeTransitionRuleRegistry,
): RouteTransitionDecision {
  if (input.fromRouteName === input.toRouteName) {
    return bypass('current-route')
  }

  const navigationReason = navigationBypassReason(input)
  if (navigationReason !== undefined) {
    return bypass(navigationReason)
  }
  if (input.fromFamilyId === 'route-family.error' || input.toFamilyId === 'route-family.error') {
    return bypass('error-family-edge')
  }
  if (input.motion === 'none') {
    return bypass('motion-none')
  }
  if (!input.nativeApiAvailable) {
    return bypass('unsupported-native-api')
  }
  if (input.documentVisibility !== 'visible') {
    return bypass('hidden-document')
  }
  if (input.boundaryValidity === 'missing') {
    return bypass('missing-boundary')
  }
  if (input.boundaryValidity === 'duplicate') {
    return bypass('duplicate-boundary')
  }
  if (input.layoutProfile === null || !validLayoutProfiles.has(input.layoutProfile)) {
    return bypass('invalid-layout-profile')
  }

  const boundary = getRouteTransitionBoundary(boundaryId)
  if (
    boundary?.fromFamilyId !== input.fromFamilyId ||
    boundary.toFamilyId !== input.toFamilyId ||
    !boundary.allowedProfiles.includes(input.layoutProfile)
  ) {
    return bypass('unknown-registry-reference')
  }

  const ruleResolution = resolveRouteTransitionRule(input, rules)
  if (ruleResolution.status === 'ambiguous' || ruleResolution.status === 'invalid-rule') {
    return bypass('invalid-rule')
  }
  if (ruleResolution.status === 'unknown-reference') {
    return bypass('unknown-registry-reference')
  }

  const presetId = projectPreset(ruleResolution.match.presetId, input)
  const preset = getRouteTransitionPreset(presetId)
  if (
    preset?.transitionType === undefined ||
    preset.transitionType === null ||
    preset.id === 'route-transition.none'
  ) {
    return bypass('unknown-registry-reference')
  }

  return Object.freeze({
    kind: 'native-document',
    presetId: preset.id,
    boundaryId,
    motionProjection: input.motion satisfies RouteTransitionMotionProjection,
    direction: preset.directionAware ? ruleResolution.match.direction : 'neutral',
    transitionType: preset.transitionType,
  })
}
