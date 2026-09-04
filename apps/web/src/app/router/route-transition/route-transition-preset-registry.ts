import type { RouteTransitionPresetId, RouteTransitionType } from './route-transition-types'

type RouteTransitionPresetSemantics =
  | 'immediate-router-navigation'
  | 'peer-workspaces-and-unrelated-route-families'
  | 'explicitly-ordered-peer-routes-only'
  | 'list-to-detail-or-detail-to-list-only'
  | 'temporary-task-create-edit-filter-or-modal-like-only'

export interface RouteTransitionPresetRecord {
  readonly id: RouteTransitionPresetId
  readonly transitionType: RouteTransitionType | null
  readonly visualRecipe: Exclude<RouteTransitionPresetId, 'route-transition.none'> | null
  readonly semantics: RouteTransitionPresetSemantics
  readonly isDefault: boolean
  readonly directionAware: boolean
  readonly reducedPresetId: RouteTransitionPresetId
  readonly nonePresetId: 'route-transition.none'
  readonly routerBehavior: 'immediate' | 'native-document'
}

export const routeTransitionPresetRegistry = Object.freeze([
  Object.freeze({
    id: 'route-transition.none',
    transitionType: null,
    visualRecipe: null,
    semantics: 'immediate-router-navigation',
    isDefault: false,
    directionAware: false,
    reducedPresetId: 'route-transition.none',
    nonePresetId: 'route-transition.none',
    routerBehavior: 'immediate',
  }),
  Object.freeze({
    id: 'route-transition.content-crossfade',
    transitionType: 'pavp-route-content-crossfade',
    visualRecipe: 'route-transition.content-crossfade',
    semantics: 'peer-workspaces-and-unrelated-route-families',
    isDefault: true,
    directionAware: false,
    reducedPresetId: 'route-transition.content-crossfade',
    nonePresetId: 'route-transition.none',
    routerBehavior: 'native-document',
  }),
  Object.freeze({
    id: 'route-transition.axis-inline-soft',
    transitionType: 'pavp-route-axis-inline-soft',
    visualRecipe: 'route-transition.axis-inline-soft',
    semantics: 'explicitly-ordered-peer-routes-only',
    isDefault: false,
    directionAware: true,
    reducedPresetId: 'route-transition.content-crossfade',
    nonePresetId: 'route-transition.none',
    routerBehavior: 'native-document',
  }),
  Object.freeze({
    id: 'route-transition.drill-soft',
    transitionType: 'pavp-route-drill-soft',
    visualRecipe: 'route-transition.drill-soft',
    semantics: 'list-to-detail-or-detail-to-list-only',
    isDefault: false,
    directionAware: true,
    reducedPresetId: 'route-transition.content-crossfade',
    nonePresetId: 'route-transition.none',
    routerBehavior: 'native-document',
  }),
  Object.freeze({
    id: 'route-transition.sheet-soft',
    transitionType: 'pavp-route-sheet-soft',
    visualRecipe: 'route-transition.sheet-soft',
    semantics: 'temporary-task-create-edit-filter-or-modal-like-only',
    isDefault: false,
    directionAware: true,
    reducedPresetId: 'route-transition.content-crossfade',
    nonePresetId: 'route-transition.none',
    routerBehavior: 'native-document',
  }),
] as const satisfies readonly RouteTransitionPresetRecord[])

const presetRecords: readonly RouteTransitionPresetRecord[] = routeTransitionPresetRegistry
const presetIds = presetRecords.map((preset) => preset.id)
const transitionTypes = presetRecords.flatMap((preset) =>
  preset.transitionType === null ? [] : [preset.transitionType],
)

if (
  presetRecords.length !== 5 ||
  new Set(presetIds).size !== presetRecords.length ||
  new Set(transitionTypes).size !== transitionTypes.length ||
  routeTransitionPresetRegistry.filter((preset) => preset.isDefault).length !== 1 ||
  routeTransitionPresetRegistry.find((preset) => preset.isDefault)?.id !==
    'route-transition.content-crossfade'
) {
  throw new TypeError('The Route Transition Preset Registry is invalid.')
}

export function getRouteTransitionPreset(
  presetId: unknown,
): RouteTransitionPresetRecord | undefined {
  return routeTransitionPresetRegistry.find((preset) => preset.id === presetId)
}
