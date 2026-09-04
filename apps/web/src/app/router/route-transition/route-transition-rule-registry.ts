import { routeRegistry, type RouteName } from '../route-registry'
import { getRouteTransitionPreset } from './route-transition-preset-registry'
import type {
  RouteTransitionDirection,
  RouteTransitionFamilyId,
  RouteTransitionPresetId,
  RouteTransitionRule,
  RouteTransitionRuleKind,
} from './route-transition-types'

export const routeTransitionRuleRegistry = Object.freeze([
  Object.freeze({
    ruleId: 'route-transition-rule.global-default',
    kind: 'global-default',
    priority: 0,
    forwardPresetId: 'route-transition.content-crossfade',
    reversePresetId: 'route-transition.content-crossfade',
    fallbackPresetId: 'route-transition.content-crossfade',
  }),
  Object.freeze({
    ruleId: 'route-transition-rule.architecture-workspace',
    kind: 'route-family',
    fromFamilyId: 'route-family.architecture-workspace',
    toFamilyId: 'route-family.architecture-workspace',
    priority: 10,
    // Families are unordered: use crossfade here, ordered-routes for axis,
    // and explicit list/detail or task exact-route-pair rules for drill/sheet.
    forwardPresetId: 'route-transition.content-crossfade',
    reversePresetId: 'route-transition.content-crossfade',
    fallbackPresetId: 'route-transition.content-crossfade',
  }),
  // Owner-confirmed Sidebar order defines Full workspace forward/reverse navigation.
  Object.freeze({
    ruleId: 'route-transition-rule.architecture-workspace-axis',
    kind: 'ordered-routes',
    priority: 100,
    routeNames: Object.freeze([
      'console-overview',
      'appearance-management',
      'design-token-inspector',
      'runtime-kernel-inspector',
      'router-governance-inspector',
      'storage-persistence-inspector',
      'ui-system-inspector',
      'responsive-layout-inspector',
      'engineering-quality-inspector',
      'capability-roadmap',
    ] as const),
    forwardPresetId: 'route-transition.axis-inline-soft',
    reversePresetId: 'route-transition.axis-inline-soft',
    fallbackPresetId: 'route-transition.content-crossfade',
  }),
  Object.freeze({
    ruleId: 'route-transition-rule.architecture-workspace-error',
    kind: 'route-family',
    fromFamilyId: 'route-family.architecture-workspace',
    toFamilyId: 'route-family.error',
    priority: 20,
    forwardPresetId: 'route-transition.none',
    reversePresetId: 'route-transition.none',
    fallbackPresetId: 'route-transition.none',
  }),
  Object.freeze({
    ruleId: 'route-transition-rule.error',
    kind: 'route-family',
    fromFamilyId: 'route-family.error',
    toFamilyId: 'route-family.error',
    priority: 20,
    forwardPresetId: 'route-transition.none',
    reversePresetId: 'route-transition.none',
    fallbackPresetId: 'route-transition.none',
  }),
] as const satisfies readonly RouteTransitionRule[])

const ruleSpecificity = Object.freeze({
  'global-default': 1,
  'route-family': 2,
  'ordered-routes': 3,
  'exact-route-pair': 4,
} as const satisfies Readonly<Record<RouteTransitionRuleKind, number>>)

interface RuleMatch {
  readonly ruleId: string
  readonly presetId: RouteTransitionPresetId
  readonly direction: RouteTransitionDirection
  readonly priority: number
  readonly specificity: number
}

function selectPreset(
  rule: RouteTransitionRule,
  direction: RouteTransitionDirection,
): RouteTransitionPresetId {
  if (direction === 'forward') {
    return rule.forwardPresetId
  }
  if (direction === 'reverse') {
    return rule.reversePresetId
  }
  return rule.fallbackPresetId
}

function matchRule(
  rule: RouteTransitionRule,
  fromRouteName: RouteName,
  toRouteName: RouteName,
  fromFamilyId: RouteTransitionFamilyId,
  toFamilyId: RouteTransitionFamilyId,
): RuleMatch | undefined {
  let direction: RouteTransitionDirection | undefined

  switch (rule.kind) {
    case 'global-default':
      direction = 'neutral'
      break
    case 'route-family':
      if (
        (rule.fromFamilyId === fromFamilyId && rule.toFamilyId === toFamilyId) ||
        (rule.fromFamilyId === toFamilyId && rule.toFamilyId === fromFamilyId)
      ) {
        direction = 'neutral'
      }
      break
    case 'ordered-routes': {
      const fromIndex = rule.routeNames.indexOf(fromRouteName)
      const toIndex = rule.routeNames.indexOf(toRouteName)
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        direction = fromIndex < toIndex ? 'forward' : 'reverse'
      }
      break
    }
    case 'exact-route-pair':
      if (rule.fromRouteName === fromRouteName && rule.toRouteName === toRouteName) {
        direction = 'forward'
      } else if (rule.fromRouteName === toRouteName && rule.toRouteName === fromRouteName) {
        direction = 'reverse'
      }
      break
  }

  return direction === undefined
    ? undefined
    : Object.freeze({
        ruleId: rule.ruleId,
        presetId: selectPreset(rule, direction),
        direction,
        priority: rule.priority,
        specificity: ruleSpecificity[rule.kind],
      })
}

function hasInvalidDirectionMapping(rule: RouteTransitionRule): boolean {
  if (getRouteTransitionPreset(rule.fallbackPresetId)?.directionAware === true) {
    return true
  }
  return (
    (rule.kind === 'global-default' || rule.kind === 'route-family') &&
    (getRouteTransitionPreset(rule.forwardPresetId)?.directionAware === true ||
      getRouteTransitionPreset(rule.reversePresetId)?.directionAware === true)
  )
}

export function resolveRouteTransitionRule(
  input: {
    readonly fromRouteName: RouteName
    readonly toRouteName: RouteName
    readonly fromFamilyId: RouteTransitionFamilyId
    readonly toFamilyId: RouteTransitionFamilyId
  },
  rules: readonly RouteTransitionRule[] = routeTransitionRuleRegistry,
):
  | Readonly<{ readonly status: 'matched'; readonly match: RuleMatch }>
  | Readonly<{ readonly status: 'ambiguous' }>
  | Readonly<{ readonly status: 'invalid-rule' }>
  | Readonly<{ readonly status: 'unknown-reference' }> {
  const knownRouteNames = new Set<RouteName>(routeRegistry.map((route) => route.name))
  if (
    !knownRouteNames.has(input.fromRouteName) ||
    !knownRouteNames.has(input.toRouteName) ||
    !routeTransitionFamilyIds.has(input.fromFamilyId) ||
    !routeTransitionFamilyIds.has(input.toFamilyId)
  ) {
    return Object.freeze({ status: 'unknown-reference' })
  }

  if (rules.some(hasInvalidDirectionMapping)) {
    return Object.freeze({ status: 'invalid-rule' })
  }

  const matches = rules
    .map((rule) =>
      matchRule(rule, input.fromRouteName, input.toRouteName, input.fromFamilyId, input.toFamilyId),
    )
    .filter((match): match is RuleMatch => match !== undefined)
    .sort((left, right) => right.priority - left.priority || right.specificity - left.specificity)
  const selected = matches[0]

  if (selected === undefined || getRouteTransitionPreset(selected.presetId) === undefined) {
    return Object.freeze({ status: 'unknown-reference' })
  }

  const competing = matches[1]
  if (competing?.priority === selected.priority && competing.specificity === selected.specificity) {
    return Object.freeze({ status: 'ambiguous' })
  }

  return Object.freeze({ status: 'matched', match: selected })
}

const routeTransitionFamilyIds = new Set<RouteTransitionFamilyId>([
  'route-family.architecture-workspace',
  'route-family.error',
])
const ruleIds = routeTransitionRuleRegistry.map((rule) => rule.ruleId)
const activeRules: readonly RouteTransitionRule[] = routeTransitionRuleRegistry

if (
  new Set(ruleIds).size !== routeTransitionRuleRegistry.length ||
  activeRules.some(
    (rule) =>
      !rule.ruleId.startsWith('route-transition-rule.') ||
      !Number.isInteger(rule.priority) ||
      getRouteTransitionPreset(rule.forwardPresetId) === undefined ||
      getRouteTransitionPreset(rule.reversePresetId) === undefined ||
      getRouteTransitionPreset(rule.fallbackPresetId) === undefined ||
      (rule.kind === 'route-family' &&
        (!routeTransitionFamilyIds.has(rule.fromFamilyId) ||
          !routeTransitionFamilyIds.has(rule.toFamilyId))) ||
      (rule.kind === 'ordered-routes' &&
        (rule.routeNames.length < 2 || new Set(rule.routeNames).size !== rule.routeNames.length)) ||
      (rule.kind === 'exact-route-pair' && rule.fromRouteName === rule.toRouteName),
  )
) {
  throw new TypeError('The Route Transition Rule Registry is invalid.')
}

for (const fromRoute of routeRegistry) {
  for (const toRoute of routeRegistry) {
    const resolution = resolveRouteTransitionRule({
      fromRouteName: fromRoute.name,
      toRouteName: toRoute.name,
      fromFamilyId: fromRoute.meta.routeTransitionFamilyId,
      toFamilyId: toRoute.meta.routeTransitionFamilyId,
    })
    if (resolution.status === 'ambiguous') {
      throw new TypeError('The Route Transition Rule Registry contains an ambiguous edge.')
    }
  }
}
