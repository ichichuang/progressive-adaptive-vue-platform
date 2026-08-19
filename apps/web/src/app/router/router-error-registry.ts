import { coreErrorRegistry } from '../errors/core-error-registry'
import type { RouteName } from './route-registry'

export type RouterErrorId =
  | 'route-input-validation-failure'
  | 'route-not-found'
  | 'route-navigation-failure'
  | 'route-chunk-load-failure'
  | 'route-disposal-failure'
  | 'route-redirect-loop'

export type RouterFailureKind =
  | 'invalid-input'
  | 'route-not-found'
  | 'chunk-load-failed'
  | 'route-disposal-failed'
  | 'redirect-loop'
  | 'unknown-navigation-failure'

export const routerErrorRegistry = Object.freeze([
  Object.freeze({
    id: 'route-input-validation-failure',
    category: 'validation',
    userMessageKey: 'router-error.route-input-validation-failure',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeRoute: 'error-invalid-route-input',
  }),
  Object.freeze({
    id: 'route-not-found',
    category: 'navigation',
    userMessageKey: 'router-error.route-not-found',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeRoute: 'error-route-not-found',
  }),
  Object.freeze({
    id: 'route-navigation-failure',
    category: 'navigation',
    userMessageKey: 'router-error.route-navigation-failure',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeRoute: 'error-application-route-failure',
  }),
  Object.freeze({
    id: 'route-chunk-load-failure',
    category: 'chunk-load',
    userMessageKey: 'router-error.route-chunk-load-failure',
    recoverability: 'reload-application',
    retryOwner: 'user',
    reportLevel: 'error',
    safeRoute: Object.freeze({
      offline: 'error-network-unavailable',
      fallback: 'error-application-route-failure',
    }),
  }),
  Object.freeze({
    id: 'route-disposal-failure',
    category: 'navigation',
    userMessageKey: 'router-error.route-disposal-failure',
    recoverability: 'reload-application',
    retryOwner: 'user',
    reportLevel: 'fatal',
    safeRoute: 'error-application-route-failure',
  }),
  Object.freeze({
    id: 'route-redirect-loop',
    category: 'navigation',
    userMessageKey: 'router-error.route-redirect-loop',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeRoute: 'error-application-route-failure',
  }),
] as const)

export const applicationErrorRegistry = Object.freeze([
  ...coreErrorRegistry,
  ...routerErrorRegistry,
] as const)

export interface RouterErrorSafeContext {
  readonly navigationId: string
  readonly routeName: RouteName | null
  readonly failureKind: RouterFailureKind
  readonly releaseSha: string
  readonly buildVersion: string
  readonly controlledReloadUsed: false
}

const normalizedRouterErrorIdentity: unique symbol = Symbol('NormalizedRouterError')

export interface NormalizedRouterError<Id extends RouterErrorId = RouterErrorId> {
  readonly [normalizedRouterErrorIdentity]: true
  readonly id: Id
  readonly category: (typeof routerErrorRegistry)[number]['category']
  readonly errorInstanceId: string
  readonly timestamp: string
  readonly safeContext: Readonly<RouterErrorSafeContext>
}

export function createNormalizedRouterError<Id extends RouterErrorId>(
  id: Id,
  safeContext: RouterErrorSafeContext,
): NormalizedRouterError<Id> {
  const record = routerErrorRegistry.find((candidate) => candidate.id === id)

  if (record === undefined) {
    throw new TypeError('The Router Error is not registered.')
  }

  return Object.freeze({
    [normalizedRouterErrorIdentity]: true as const,
    id,
    category: record.category,
    errorInstanceId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    safeContext: Object.freeze(safeContext),
  })
}

export function safeRouterErrorRoute(
  id: RouterErrorId,
  browserExplicitlyOffline: boolean,
): RouteName {
  const record = routerErrorRegistry.find((candidate) => candidate.id === id)

  if (record === undefined) {
    throw new TypeError('The Router Error is not registered.')
  }

  if (record.id === 'route-chunk-load-failure') {
    return browserExplicitlyOffline ? record.safeRoute.offline : record.safeRoute.fallback
  }

  return record.safeRoute
}
