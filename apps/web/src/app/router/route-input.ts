import { z } from 'zod'
import {
  stringifyQuery,
  type RouteLocationNormalized,
  type RouteLocationResolved,
  type RouteParamsGeneric,
  type Router,
} from 'vue-router'

import type { RouteNamedMap } from 'vue-router/auto-routes'
import type { RouterErrorId } from './router-error-registry'
import {
  getRouteRecord,
  routeRegistry,
  type RouteName,
  type RouteRegistryRecord,
  type errorRouteRegistry,
} from './route-registry'
import {
  routeParamsSchema,
  routeQuerySchema,
  type routeParamsSchemaRegistry,
  type routeQuerySchemaRegistry,
} from './route-schemas'

type RouteDeclarationFor<N extends RouteName> = Extract<
  (typeof routeRegistry)[number],
  { readonly name: N }
>
type ParamsSchemaFor<N extends RouteName> = Extract<
  (typeof routeParamsSchemaRegistry)[number],
  { readonly id: RouteDeclarationFor<N>['paramsSchemaId'] }
>['schema']
type QuerySchemaFor<N extends RouteName> = Extract<
  (typeof routeQuerySchemaRegistry)[number],
  { readonly id: RouteDeclarationFor<N>['querySchemaId'] }
>['schema']
type RouteQueryInput<N extends RouteName> = z.input<QuerySchemaFor<N>>
type ParamsField<N extends RouteName> = keyof RouteNamedMap[N]['paramsRaw'] extends never
  ? { readonly params?: never }
  : { readonly params: RouteNamedMap[N]['paramsRaw'] }
type QueryField<N extends RouteName> =
  RouteDeclarationFor<N>['querySchemaId'] extends 'route-query.none'
    ? { readonly query?: never }
    : Record<string, never> extends RouteQueryInput<N>
      ? { readonly query?: RouteQueryInput<N> }
      : { readonly query: RouteQueryInput<N> }
type HashField<N extends RouteName> =
  RouteDeclarationFor<N> extends { readonly hashPolicy: 'element-id' }
    ? { readonly hash?: '' | `#${string}` }
    : { readonly hash?: never }

export type RegisteredRouteDestination<N extends RouteName = RouteName> = {
  [K in N]: Readonly<{ name: K }> & ParamsField<K> & QueryField<K> & HashField<K>
}[N]

export type ValidatedRouteInput<N extends RouteName = RouteName> = {
  [K in N]: Readonly<{
    name: K
    params: z.output<ParamsSchemaFor<K>>
    query: z.output<QuerySchemaFor<K>>
    hash: RouteDeclarationFor<K> extends { readonly hashPolicy: 'element-id' }
      ? '' | `#${string}`
      : ''
  }>
}[N]

export type RouteInputValidationResult =
  { readonly kind: 'valid'; readonly input: ValidatedRouteInput } | { readonly kind: 'invalid' }

export type TypedNavigationResult =
  | {
      readonly kind: 'duplicated'
      readonly destination: RegisteredRouteDestination
    }
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
      readonly reason: 'cancelled-by-new-navigation' | 'access-invalidated'
    }
  | {
      readonly kind: 'failure'
      readonly navigationId: string
      readonly errorId: RouterErrorId
      readonly destination: Readonly<{ name: (typeof errorRouteRegistry)[number]['routeName'] }>
    }

export function registeredRouteDestination<const D extends RegisteredRouteDestination>(
  destination: D,
): D {
  return Object.freeze(destination)
}

export function validateRouteInput(location: RouteLocationNormalized): RouteInputValidationResult {
  const record = routeRegistry.find((candidate) => candidate.name === location.name)
  if (record === undefined || location.matched.length === 0) return { kind: 'invalid' }
  for (const matched of location.matched) {
    const declaration = routeRegistry.find((candidate) => candidate.name === matched.name)
    if (
      matched.path !== declaration?.pathPattern ||
      !routeMetaMatches(matched.meta, declaration.meta)
    )
      return { kind: 'invalid' }
  }
  const params = routeParamsSchema(record.paramsSchemaId).safeParse(location.params)
  const query = routeQuerySchema(record.querySchemaId).safeParse(location.query)
  const fragment = location.fullPath.indexOf('#')
  try {
    if (fragment !== -1) decodeURIComponent(location.fullPath.slice(fragment + 1))
  } catch {
    return { kind: 'invalid' }
  }
  const search = location.fullPath.indexOf('?')
  if (
    !params.success ||
    !query.success ||
    !routeMetaMatches(location.meta, record.meta) ||
    (Object.keys(routeQuerySchema(record.querySchemaId).shape).length === 0 &&
      search !== -1 &&
      (fragment === -1 || search < fragment)) ||
    (!allowsRouteHash(record.hashPolicy)
      ? fragment !== -1 || location.hash !== ''
      : location.hash !== '' &&
        (!location.hash.startsWith('#') ||
          location.hash.length === 1 ||
          /[\u0000-\u0020\u007f]/u.test(location.hash)))
  ) {
    return { kind: 'invalid' }
  }
  // Registry membership and the two schemas above establish the correlated runtime branch.
  return {
    kind: 'valid',
    input: Object.freeze({
      name: record.name,
      params: params.data,
      query: query.data,
      hash: location.hash,
    }) as Extract<RouteInputValidationResult, { kind: 'valid' }>['input'],
  }
}

export function routeMetaMatches(
  actual: Readonly<Record<PropertyKey, unknown>>,
  expected: Readonly<Record<string, unknown>>,
): boolean {
  return (
    Object.keys(actual).length === Object.keys(expected).length &&
    Object.entries(expected).every(([key, value]) => {
      const received = actual[key]
      return Array.isArray(value)
        ? Array.isArray(received) &&
            received.length === value.length &&
            value.every((item, index) => item === received[index])
        : received === value
    })
  )
}

const rawParam = z.union([z.string(), z.number()])
const rawQuery = z.union([z.string(), z.null()])

export function resolveRegisteredDestination(
  router: Router,
  destination: RegisteredRouteDestination,
): RouteLocationResolved | undefined {
  try {
    const record = getRouteRecord(destination.name)
    const paramsSchema = routeParamsSchema(record.paramsSchemaId)
    const querySchema = routeQuerySchema(record.querySchemaId)
    const paramsShape = Object.fromEntries(
      Object.keys(paramsSchema.shape).map((key) => [
        key,
        z.union([rawParam, z.array(rawParam)]).optional(),
      ]),
    )
    const queryShape = Object.fromEntries(
      Object.keys(querySchema.shape).map((key) => [
        key,
        z.union([rawQuery, z.array(rawQuery)]).optional(),
      ]),
    )
    const caller = z
      .strictObject({
        name: z.literal(record.name),
        params:
          record.paramsSchemaId === 'route-params.none'
            ? z.never().optional()
            : z.strictObject(paramsShape),
        query:
          Object.keys(queryShape).length === 0
            ? z.never().optional()
            : z.strictObject(queryShape).optional(),
        hash: allowsRouteHash(record.hashPolicy) ? z.string().optional() : z.never().optional(),
      })
      .safeParse(destination)
    if (!caller.success) return undefined
    // Resolution context deliberately clears required current-route params: this is not a committed route.
    const context = { ...router.currentRoute.value, params: {} } as typeof router.currentRoute.value
    const resolved = router.resolve(destination, context)
    const roundTrip = router.resolve(resolved.fullPath)
    if (
      resolved.matched.at(-1) !== roundTrip.matched.at(-1) ||
      validateRouteInput(roundTrip).kind !== 'valid'
    )
      return undefined
    return roundTrip
  } catch {
    return undefined
  }
}

export function sameRouteAddress(
  left: RouteLocationNormalized,
  right: RouteLocationNormalized,
): boolean {
  const leftParams: RouteParamsGeneric = left.params
  const rightParams: RouteParamsGeneric = right.params
  const leftRecord = left.matched.at(-1)
  const rightRecord = right.matched.at(-1)
  const paramValuesEqual = (a: string | string[] | undefined, b: string | string[] | undefined) =>
    Array.isArray(a)
      ? Array.isArray(b)
        ? a.length === b.length && a.every((value, index) => value === b[index])
        : a.length === 1 && a[0] === b
      : Array.isArray(b)
        ? b.length === 1 && b[0] === a
        : a === b
  return (
    leftRecord !== undefined &&
    rightRecord !== undefined &&
    (leftRecord.aliasOf ?? leftRecord) === (rightRecord.aliasOf ?? rightRecord) &&
    Object.keys(left.params).length === Object.keys(right.params).length &&
    Object.keys(left.params).every((key) => paramValuesEqual(leftParams[key], rightParams[key])) &&
    stringifyQuery(left.query) === stringifyQuery(right.query) &&
    left.hash === right.hash
  )
}

export function routeDestination(location: RouteLocationNormalized): RegisteredRouteDestination {
  const record = getRouteRecord(location.name)
  // Only called for a location accepted by validateRouteInput. Keep URL values, never parsed defaults.
  return Object.freeze({
    name: record.name,
    ...(record.paramsSchemaId === 'route-params.none' ? {} : { params: location.params }),
    ...(Object.keys(routeQuerySchema(record.querySchemaId).shape).length === 0
      ? {}
      : { query: location.query }),
    ...(allowsRouteHash(record.hashPolicy) ? { hash: location.hash } : {}),
  }) as RegisteredRouteDestination
}

function allowsRouteHash(policy: RouteRegistryRecord['hashPolicy']): boolean {
  return policy === 'element-id'
}

export function routeHasPageInput(record: RouteRegistryRecord): boolean {
  return (
    record.paramsSchemaId !== 'route-params.none' ||
    Object.keys(routeQuerySchema(record.querySchemaId).shape).length !== 0 ||
    allowsRouteHash(record.hashPolicy)
  )
}
