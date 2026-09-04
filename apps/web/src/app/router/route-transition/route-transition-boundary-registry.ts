import type { RouteTransitionBoundaryId, RouteTransitionFamilyId } from './route-transition-types'

export interface RouteTransitionBoundaryRecord {
  readonly id: RouteTransitionBoundaryId
  readonly target: '[data-scroll-owner="architecture-console-content"]'
  readonly viewTransitionName: 'pavp-admin-route-content'
  readonly fromFamilyId: RouteTransitionFamilyId
  readonly toFamilyId: RouteTransitionFamilyId
  readonly allowedProfiles: readonly ['narrow', 'regular', 'wide']
  readonly persistentRegions: readonly [
    'Header',
    'Sidebar',
    'NMenu',
    'Admin Navigation Motion Lens',
    'Drawer',
    'Overlay Root',
  ]
}

export const routeTransitionBoundaryRegistry = Object.freeze([
  Object.freeze({
    id: 'route-transition-boundary.architecture-console-content',
    target: '[data-scroll-owner="architecture-console-content"]',
    viewTransitionName: 'pavp-admin-route-content',
    fromFamilyId: 'route-family.architecture-workspace',
    toFamilyId: 'route-family.architecture-workspace',
    allowedProfiles: Object.freeze(['narrow', 'regular', 'wide'] as const),
    persistentRegions: Object.freeze([
      'Header',
      'Sidebar',
      'NMenu',
      'Admin Navigation Motion Lens',
      'Drawer',
      'Overlay Root',
    ] as const),
  }),
] as const satisfies readonly RouteTransitionBoundaryRecord[])

const boundaryRecords: readonly RouteTransitionBoundaryRecord[] = routeTransitionBoundaryRegistry

if (boundaryRecords.length !== 1) {
  throw new TypeError('The Route Transition Boundary Registry must own exactly one record.')
}

export function getRouteTransitionBoundary(
  boundaryId: unknown,
): RouteTransitionBoundaryRecord | undefined {
  return routeTransitionBoundaryRegistry.find((boundary) => boundary.id === boundaryId)
}
