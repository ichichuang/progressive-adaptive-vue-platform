import {
  errorRouteRegistry,
  focusContractRegistry,
  routeLayoutCapabilityRegistry,
  routeRegistry,
  routeTitleRegistry,
  scrollOwnerRegistry,
  scrollRestorationPolicyRegistry,
} from './route-registry'

export interface RouterConsoleRouteRecord {
  readonly name: string
  readonly pathPattern: string
  readonly visibleLabel: string
}

export interface RouterConsoleProjection {
  readonly schemaVersion: 1
  readonly routeCount: number
  readonly productRouteCount: number
  readonly errorRouteCount: number
  readonly routes: readonly RouterConsoleRouteRecord[]
  readonly productRoutes: readonly RouterConsoleRouteRecord[]
  readonly layoutCapabilityIds: readonly string[]
  readonly scrollOwnerIds: readonly string[]
  readonly focusContractIds: readonly string[]
  readonly scrollRestorationPolicyIds: readonly string[]
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

const errorRouteNames = new Set<string>(errorRouteRegistry.map((record) => record.routeName))
const routeProjection = Object.freeze(
  routeRegistry
    .map((record) =>
      Object.freeze({
        name: record.name,
        pathPattern: record.pathPattern,
        visibleLabel: routeTitleRegistry[record.meta.titleKey],
      }),
    )
    .sort((left, right) => compareIds(left.name, right.name)),
)

export const routerConsoleProjection = Object.freeze({
  schemaVersion: 1,
  routeCount: routeRegistry.length,
  productRouteCount: routeRegistry.filter((record) => !errorRouteNames.has(record.name)).length,
  errorRouteCount: errorRouteRegistry.length,
  routes: routeProjection,
  productRoutes: Object.freeze(
    routeProjection.filter((record) => !errorRouteNames.has(record.name)),
  ),
  layoutCapabilityIds: Object.freeze(
    routeLayoutCapabilityRegistry.map((record) => record.id).sort(compareIds),
  ),
  scrollOwnerIds: Object.freeze(scrollOwnerRegistry.map((record) => record.id).sort(compareIds)),
  focusContractIds: Object.freeze(
    focusContractRegistry.map((record) => record.id).sort(compareIds),
  ),
  scrollRestorationPolicyIds: Object.freeze(
    scrollRestorationPolicyRegistry.map((record) => record.id).sort(compareIds),
  ),
} as const satisfies RouterConsoleProjection)
