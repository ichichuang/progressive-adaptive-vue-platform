import { nextTick, type App } from 'vue'
import {
  createRouter,
  createWebHistory,
  isNavigationFailure,
  NavigationFailureType,
  type RouteLocationNormalized,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import type { CoreRuntimeConfiguration } from '../config/runtime-configuration-contract'
import {
  advanceActiveGuardStage,
  completeActiveGuardStages,
  createActiveGuardStageProgress,
  registeredRouteDestination,
  type ActiveGuardStageProgress,
  type TypedNavigationResult,
} from './navigation-contract'
import {
  focusContractRegistry,
  getErrorRouteName,
  getRoutePresentation,
  getRouteRecord,
  routeRegistry,
  routeTitleRegistry,
  scrollOwnerRegistry,
  type RouteName,
} from './route-registry'
import { routeParamsSchema, routeQuerySchema } from './route-schemas'
import {
  createNormalizedRouterError,
  safeRouterErrorRoute,
  type RouterErrorId,
  type RouterFailureKind,
} from './router-error-registry'

interface NavigationAttemptState {
  readonly navigationId: string
  readonly routeName: RouteName
  readonly guardStageProgress: ActiveGuardStageProgress
  componentResolutionReached: boolean
}

export interface RouterLifecycleHandle {
  readonly router: Router
  readonly history: RouterHistory
  readonly guardRemovers: readonly [() => void, () => void, () => void]
  readonly errorHandlerRemover: () => void
  markApplicationMounted(): void
  getLatestNavigationResult(): TypedNavigationResult | undefined
  dispose(): void
}

function exactRecordKeys(value: object, expectedKeys: readonly string[]): boolean {
  const keys = Object.keys(value)
  return (
    keys.length === expectedKeys.length &&
    new Set(keys).size === keys.length &&
    expectedKeys.every((key) => keys.includes(key))
  )
}

const routeMetaKeys = Object.freeze([
  'titleKey',
  'breadcrumbKey',
  'layout',
  'layoutCapabilityId',
  'auth',
  'requiredPermissionIds',
  'blockScrollOwnerId',
  'inlineScrollOwnerId',
  'keepAlive',
  'telemetryName',
  'dataPrefetch',
  'errorPolicy',
  'unsavedChangesPolicy',
  'focusContractId',
  'scrollRestorationPolicyId',
] as const)

function routeMetaMatches(
  actual: Readonly<Record<PropertyKey, unknown>>,
  expected: Readonly<Record<string, unknown>>,
): boolean {
  return (
    exactRecordKeys(actual, routeMetaKeys) &&
    routeMetaKeys.every((key) => {
      const actualValue = actual[key]
      const expectedValue = expected[key]

      return Array.isArray(expectedValue)
        ? Array.isArray(actualValue) &&
            actualValue.length === expectedValue.length &&
            actualValue.every((value, index) => value === expectedValue[index])
        : actualValue === expectedValue
    })
  )
}

function generatedRouteRecords(records: readonly RouteRecordRaw[]): RouteRecordRaw[] {
  return records.flatMap((record) => [record, ...generatedRouteRecords(record.children ?? [])])
}

function validateGeneratedRouteClosure(): void {
  const namedRecords = generatedRouteRecords(routes).filter(
    (record): record is RouteRecordRaw & { readonly name: string } =>
      typeof record.name === 'string',
  )

  if (namedRecords.length !== routeRegistry.length) {
    throw new TypeError('The generated runtime route count does not match the Route Registry.')
  }

  for (const record of routeRegistry) {
    const generated = namedRecords.find((candidate) => candidate.name === record.name)

    if (
      generated?.path !== record.pathPattern ||
      !routeMetaMatches(generated.meta ?? {}, record.meta)
    ) {
      throw new TypeError('The generated runtime route set diverged from the Route Registry.')
    }
  }
}

function hasRawSearch(location: RouteLocationNormalized): boolean {
  return location.fullPath.includes('?')
}

function validateRouteContract(location: RouteLocationNormalized): RouteName | undefined {
  let record: (typeof routeRegistry)[number]

  try {
    record = getRouteRecord(location.name)
  } catch {
    return undefined
  }

  if (
    !routeMetaMatches(location.meta, record.meta) ||
    !routeParamsSchema(record.paramsSchemaId).safeParse(location.params).success ||
    !routeQuerySchema(record.querySchemaId).safeParse(location.query).success ||
    hasRawSearch(location) ||
    location.hash !== ''
  ) {
    return undefined
  }

  return record.name
}

function ensureRuntimeConfigurationReady(configuration: CoreRuntimeConfiguration): void {
  if (
    !Object.isFrozen(configuration) ||
    configuration.deploymentBase.length === 0 ||
    configuration.releaseSha.length === 0 ||
    configuration.buildVersion.length === 0
  ) {
    throw new TypeError('The Router requires the validated Runtime Configuration authority.')
  }
}

function createFailureResult(input: {
  readonly configuration: CoreRuntimeConfiguration
  readonly errorId: RouterErrorId
  readonly failureKind: RouterFailureKind
  readonly navigationId: string
  readonly routeName: RouteName | null
  readonly browserExplicitlyOffline: boolean
}): Extract<TypedNavigationResult, { readonly kind: 'failure' }> {
  const error = createNormalizedRouterError(input.errorId, {
    navigationId: input.navigationId,
    routeName: input.routeName,
    failureKind: input.failureKind,
    releaseSha: input.configuration.releaseSha,
    buildVersion: input.configuration.buildVersion,
    controlledReloadUsed: false,
  })
  const destination = registeredRouteDestination(
    safeRouterErrorRoute(error.id, input.browserExplicitlyOffline),
  )

  return Object.freeze({
    kind: 'failure',
    navigationId: input.navigationId,
    errorId: error.id,
    destination,
  })
}

function finiteNativeScrollPosition(
  savedPosition: { readonly left: number; readonly top: number } | null,
): { readonly left: number; readonly top: number } {
  if (
    savedPosition !== null &&
    Number.isFinite(savedPosition.left) &&
    Number.isFinite(savedPosition.top)
  ) {
    return Object.freeze({ left: savedPosition.left, top: savedPosition.top })
  }

  return Object.freeze({ left: 0, top: 0 })
}

function sameScrollOwnerTarget(left: string, right: string): boolean {
  return left === right
}

export async function createAndReadyRouter(input: {
  readonly application: App
  readonly configuration: CoreRuntimeConfiguration
  readonly startupAttemptId: string
}): Promise<RouterLifecycleHandle> {
  validateGeneratedRouteClosure()
  ensureRuntimeConfigurationReady(input.configuration)

  if (input.startupAttemptId.length === 0) {
    throw new TypeError('The Router requires the active Runtime Kernel startup attempt.')
  }

  let applicationMounted = false
  let resolveApplicationMounted: (() => void) | undefined
  const applicationMountedPromise = new Promise<void>((resolve) => {
    resolveApplicationMounted = resolve
  })
  let disposed = false
  let routerReady = false
  let handlingRouterError = false
  let latestNavigationResult: TypedNavigationResult | undefined
  const navigationAttempts = new WeakMap<RouteLocationNormalized, NavigationAttemptState>()
  const history = createWebHistory(input.configuration.deploymentBase)
  const router = createRouter({
    history,
    routes,
    async scrollBehavior(to, _from, savedPosition) {
      await applicationMountedPromise
      await nextTick()

      if (disposed || !applicationMounted) {
        return false
      }

      const routeName = getRouteRecord(to.name).name
      const routeRecord = getRouteRecord(routeName)
      const presentation = getRoutePresentation(routeName)
      const focusContract = focusContractRegistry.find(
        (contract) => contract.id === routeRecord.meta.focusContractId,
      )

      if (focusContract === undefined) {
        throw new TypeError('The routed focus contract is unavailable.')
      }

      const focusTargets = document.querySelectorAll<HTMLElement>(focusContract.target)
      const navigation = navigationAttempts.get(to)

      if (
        navigation?.routeName !== routeName ||
        focusTargets.length !== 1 ||
        focusTargets[0]?.tagName !== 'H1' ||
        focusTargets[0].tabIndex !== focusContract.targetTabIndex
      ) {
        throw new TypeError('The routed document focus or scroll owner is unavailable.')
      }

      advanceActiveGuardStage(navigation.guardStageProgress, 'commit-focus-and-scroll')
      document.title = presentation.title
      focusTargets[0].focus({ preventScroll: true })
      completeActiveGuardStages(navigation.guardStageProgress)

      const preservesFailureDestination =
        latestNavigationResult?.kind === 'failure' &&
        latestNavigationResult.destination.name === navigation.routeName

      if (
        !preservesFailureDestination &&
        latestNavigationResult?.navigationId !== navigation.navigationId
      ) {
        latestNavigationResult = Object.freeze({
          kind: 'allow',
          navigationId: navigation.navigationId,
          destination: registeredRouteDestination(navigation.routeName),
        })
      }

      const scrollPosition = finiteNativeScrollPosition(savedPosition)
      const blockOwner = scrollOwnerRegistry.find(
        (owner) => owner.id === routeRecord.meta.blockScrollOwnerId,
      )
      const inlineOwner = scrollOwnerRegistry.find(
        (owner) => owner.id === routeRecord.meta.inlineScrollOwnerId,
      )

      if (blockOwner === undefined || inlineOwner === undefined) {
        throw new TypeError('The routed scroll owner is unavailable.')
      }

      if (blockOwner.ownerKind === 'document' && inlineOwner.ownerKind === 'document') {
        if (document.scrollingElement === null) {
          throw new TypeError('The document scroll owner is unavailable.')
        }

        return scrollPosition
      }

      if (
        blockOwner.ownerKind !== 'region' ||
        inlineOwner.ownerKind !== 'region' ||
        !sameScrollOwnerTarget(blockOwner.ownerTarget, inlineOwner.ownerTarget)
      ) {
        throw new TypeError('The routed region scroll owner is inconsistent.')
      }

      const regionOwners = document.querySelectorAll<HTMLElement>(blockOwner.ownerTarget)

      if (regionOwners.length !== 1) {
        throw new TypeError('The routed region scroll owner is unavailable.')
      }

      const regionOwner = regionOwners[0]

      if (regionOwner === undefined) {
        throw new TypeError('The routed region scroll owner is unavailable.')
      }

      regionOwner.scrollLeft = scrollPosition.left
      regionOwner.scrollTop = scrollPosition.top
      return false
    },
  })

  const beforeEachRemover = router.beforeEach((to) => {
    const navigationId = crypto.randomUUID()
    const pendingFailure =
      latestNavigationResult?.kind === 'failure' ? latestNavigationResult : undefined
    latestNavigationResult = undefined
    const guardStageProgress = createActiveGuardStageProgress()
    advanceActiveGuardStage(guardStageProgress, 'validate-route-contract')
    const routeName = validateRouteContract(to)

    advanceActiveGuardStage(guardStageProgress, 'ensure-runtime-configuration-ready')
    ensureRuntimeConfigurationReady(input.configuration)
    advanceActiveGuardStage(guardStageProgress, 'resolve-router-owned-safe-destination')

    if (routeName === undefined) {
      const failure = createFailureResult({
        configuration: input.configuration,
        errorId: 'route-input-validation-failure',
        failureKind: 'invalid-input',
        navigationId,
        routeName: null,
        browserExplicitlyOffline: false,
      })
      latestNavigationResult = failure
      return { name: failure.destination.name, replace: true }
    }

    if (pendingFailure?.destination.name === routeName) {
      latestNavigationResult = pendingFailure
    }

    navigationAttempts.set(to, {
      navigationId,
      routeName,
      guardStageProgress,
      componentResolutionReached: false,
    })

    if (routeName === getErrorRouteName('404')) {
      latestNavigationResult = createFailureResult({
        configuration: input.configuration,
        errorId: 'route-not-found',
        failureKind: 'route-not-found',
        navigationId,
        routeName,
        browserExplicitlyOffline: false,
      })
    }

    return true
  })

  const beforeResolveRemover = router.beforeResolve((to) => {
    const routeName = getRouteRecord(to.name).name
    const navigation = navigationAttempts.get(to)

    if (navigation?.routeName === routeName) {
      advanceActiveGuardStage(navigation.guardStageProgress, 'prepare-route-presentation')
      navigation.componentResolutionReached = true
    }

    const presentation = getRoutePresentation(routeName)

    if (routeTitleRegistry[getRouteRecord(routeName).meta.titleKey] !== presentation.title) {
      throw new TypeError('The route presentation authority is incomplete.')
    }

    return true
  })

  const afterEachRemover = router.afterEach((to, _from, failure) => {
    const navigation = navigationAttempts.get(to)

    if (failure === undefined) {
      if (
        navigation !== undefined &&
        to.redirectedFrom !== undefined &&
        latestNavigationResult?.kind !== 'failure'
      ) {
        latestNavigationResult = Object.freeze({
          kind: 'redirect',
          navigationId: navigation.navigationId,
          reason: 'redirected',
          destination: registeredRouteDestination(navigation.routeName),
          replace: true,
        })
      }

      return
    }

    if (navigation === undefined) {
      return
    }

    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      return
    }

    if (isNavigationFailure(failure, NavigationFailureType.cancelled)) {
      latestNavigationResult = Object.freeze({
        kind: 'cancel',
        navigationId: navigation.navigationId,
        reason: 'cancelled-by-new-navigation',
      })
    }
  })

  const errorHandlerRemover = router.onError((_source, to) => {
    if (!routerReady || disposed) {
      return
    }

    const navigation = navigationAttempts.get(to)
    const navigationId = navigation?.navigationId ?? crypto.randomUUID()
    const routeName = navigation?.routeName ?? null

    if (handlingRouterError) {
      latestNavigationResult = createFailureResult({
        configuration: input.configuration,
        errorId: 'route-redirect-loop',
        failureKind: 'redirect-loop',
        navigationId,
        routeName,
        browserExplicitlyOffline: false,
      })
      return
    }

    const chunkLoadFailure = navigation !== undefined && !navigation.componentResolutionReached
    const errorId = chunkLoadFailure ? 'route-chunk-load-failure' : 'route-navigation-failure'
    const failure = createFailureResult({
      configuration: input.configuration,
      errorId,
      failureKind: chunkLoadFailure ? 'chunk-load-failed' : 'unknown-navigation-failure',
      navigationId,
      routeName,
      browserExplicitlyOffline: chunkLoadFailure && !navigator.onLine,
    })
    latestNavigationResult = failure

    if (to.name === failure.destination.name) {
      return
    }

    handlingRouterError = true
    void router
      .replace({
        name: failure.destination.name,
        replace: true,
      })
      .catch(async () => {
        if (disposed) {
          return
        }

        const redirectLoopFailure = createFailureResult({
          configuration: input.configuration,
          errorId: 'route-redirect-loop',
          failureKind: 'redirect-loop',
          navigationId,
          routeName,
          browserExplicitlyOffline: false,
        })
        latestNavigationResult = redirectLoopFailure

        if (
          failure.destination.name !== redirectLoopFailure.destination.name &&
          router.currentRoute.value.name !== redirectLoopFailure.destination.name
        ) {
          try {
            await router.replace({
              name: redirectLoopFailure.destination.name,
              replace: true,
            })
          } catch {
            // The registered fallback was attempted exactly once; no recursive recovery is allowed.
          }
        }
      })
      .finally(() => {
        handlingRouterError = false
      })
  })

  const dispose = (): void => {
    if (disposed) {
      return
    }

    disposed = true
    resolveApplicationMounted?.()
    resolveApplicationMounted = undefined
    const failures: unknown[] = []

    for (const remove of [
      errorHandlerRemover,
      afterEachRemover,
      beforeResolveRemover,
      beforeEachRemover,
    ]) {
      try {
        remove()
      } catch (source: unknown) {
        failures.push(source)
      }
    }

    try {
      history.destroy()
    } catch (source: unknown) {
      failures.push(source)
    }

    if (failures.length !== 0) {
      const currentName = router.currentRoute.value.name
      const routeName =
        typeof currentName === 'string' &&
        routeRegistry.some((record) => record.name === currentName)
          ? currentName
          : null
      const disposalError = createNormalizedRouterError('route-disposal-failure', {
        navigationId: crypto.randomUUID(),
        routeName,
        failureKind: 'route-disposal-failed',
        releaseSha: input.configuration.releaseSha,
        buildVersion: input.configuration.buildVersion,
        controlledReloadUsed: false,
      })
      latestNavigationResult = Object.freeze({
        kind: 'failure',
        navigationId: disposalError.safeContext.navigationId,
        errorId: disposalError.id,
        destination: registeredRouteDestination(safeRouterErrorRoute(disposalError.id, false)),
      })
      throw new Error('Router disposal was incomplete.')
    }
  }

  const handle: RouterLifecycleHandle = {
    router,
    history,
    guardRemovers: Object.freeze([beforeEachRemover, beforeResolveRemover, afterEachRemover]),
    errorHandlerRemover,
    markApplicationMounted() {
      if (disposed || applicationMounted) {
        return
      }

      applicationMounted = true
      resolveApplicationMounted?.()
      resolveApplicationMounted = undefined
    },
    getLatestNavigationResult() {
      return latestNavigationResult
    },
    dispose,
  }

  try {
    input.application.use(router)
    await router.isReady()
    routerReady = true
    return handle
  } catch (source: unknown) {
    try {
      dispose()
    } catch {
      // The original pre-Mount startup failure remains the sole startup error boundary.
    }
    throw source
  }
}
