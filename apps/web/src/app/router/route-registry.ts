type RouteAuthPolicy = 'public' | 'anonymous-only' | 'required'

type RouteKeepAlivePolicy = 'never' | 'route-instance'

type RouteDataPrefetchPolicy = 'none' | 'blocking-required' | 'non-blocking'

type RouteErrorPolicy = 'route-boundary' | 'application-boundary' | 'fatal-startup-boundary'

export interface ValidatedRouteMeta {
  readonly titleKey: string
  readonly breadcrumbKey: string | null
  readonly layout: 'reading' | 'workspace' | 'focused-task'
  readonly layoutCapabilityId: string
  readonly auth: RouteAuthPolicy
  readonly requiredPermissionIds: readonly string[]
  readonly blockScrollOwnerId: string
  readonly inlineScrollOwnerId: string
  readonly keepAlive: RouteKeepAlivePolicy
  readonly telemetryName: string
  readonly dataPrefetch: RouteDataPrefetchPolicy
  readonly errorPolicy: RouteErrorPolicy
  readonly unsavedChangesPolicy: 'none' | 'confirm-before-leave'
  readonly focusContractId: string
  readonly scrollRestorationPolicyId: string
}

export interface RouteRegistryRecord {
  readonly name: string
  readonly pathPattern: string
  readonly sourcePath: string
  readonly meta: ValidatedRouteMeta
  readonly paramsSchemaId: string | null
  readonly querySchemaId: string | null
  readonly capabilityStatus: 'ACTIVE'
}

const emptyPermissionIds = Object.freeze([] as const)
const commonRouteMeta = Object.freeze({
  breadcrumbKey: null,
  layout: 'reading',
  layoutCapabilityId: 'route-layout.reading-document',
  auth: 'public',
  requiredPermissionIds: emptyPermissionIds,
  blockScrollOwnerId: 'document-block',
  inlineScrollOwnerId: 'document-inline',
  keepAlive: 'never',
  dataPrefetch: 'none',
  unsavedChangesPolicy: 'none',
  focusContractId: 'route-focus.primary-heading',
  scrollRestorationPolicyId: 'route-scroll.document-history',
} as const)

export const routeRegistry = Object.freeze([
  Object.freeze({
    name: 'home',
    pathPattern: '/',
    sourcePath: 'apps/web/src/pages/index.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.home',
      telemetryName: 'route.home',
      errorPolicy: 'route-boundary',
    }),
  }),
  Object.freeze({
    name: 'error-invalid-route-input',
    pathPattern: '/error/400',
    sourcePath: 'apps/web/src/pages/error/400.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.error-invalid-route-input',
      telemetryName: 'route.error.invalid-route-input',
      errorPolicy: 'application-boundary',
    }),
  }),
  Object.freeze({
    name: 'error-authentication-required',
    pathPattern: '/error/401',
    sourcePath: 'apps/web/src/pages/error/401.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.error-authentication-required',
      telemetryName: 'route.error.authentication-required',
      errorPolicy: 'application-boundary',
    }),
  }),
  Object.freeze({
    name: 'error-permission-denied',
    pathPattern: '/error/403',
    sourcePath: 'apps/web/src/pages/error/403.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.error-permission-denied',
      telemetryName: 'route.error.permission-denied',
      errorPolicy: 'application-boundary',
    }),
  }),
  Object.freeze({
    name: 'error-route-not-found',
    pathPattern: '/:path(.*)',
    sourcePath: 'apps/web/src/pages/[...path].vue',
    paramsSchemaId: 'route-params.not-found-path',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.error-route-not-found',
      telemetryName: 'route.error.route-not-found',
      errorPolicy: 'application-boundary',
    }),
  }),
  Object.freeze({
    name: 'error-application-route-failure',
    pathPattern: '/error/500',
    sourcePath: 'apps/web/src/pages/error/500.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.error-application-route-failure',
      telemetryName: 'route.error.application-route-failure',
      errorPolicy: 'application-boundary',
    }),
  }),
  Object.freeze({
    name: 'error-network-unavailable',
    pathPattern: '/error/offline',
    sourcePath: 'apps/web/src/pages/error/offline.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.error-network-unavailable',
      telemetryName: 'route.error.network-unavailable',
      errorPolicy: 'application-boundary',
    }),
  }),
  Object.freeze({
    name: 'error-service-unavailable',
    pathPattern: '/error/maintenance',
    sourcePath: 'apps/web/src/pages/error/maintenance.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: 'route-title.error-service-unavailable',
      telemetryName: 'route.error.service-unavailable',
      errorPolicy: 'application-boundary',
    }),
  }),
] as const satisfies readonly RouteRegistryRecord[])

export type RouteName = (typeof routeRegistry)[number]['name']
export type RouteTitleKey = (typeof routeRegistry)[number]['meta']['titleKey']
type ErrorRouteCode = (typeof errorRouteRegistry)[number]['code']

export const routeTitleRegistry = Object.freeze({
  'route-title.home': 'Progressive Adaptive Vue Platform',
  'route-title.error-invalid-route-input': 'Invalid address',
  'route-title.error-authentication-required': 'Authentication required',
  'route-title.error-permission-denied': 'Access denied',
  'route-title.error-route-not-found': 'Page not found',
  'route-title.error-application-route-failure': 'Page unavailable',
  'route-title.error-network-unavailable': 'Offline',
  'route-title.error-service-unavailable': 'Service unavailable',
} as const satisfies Readonly<Record<RouteTitleKey, string>>)

export const routeMessageRegistry = Object.freeze([
  Object.freeze({
    routeName: 'home',
    key: 'route-message.home-summary',
    text: 'Phase 1A token contract and deterministic build foundation.',
  }),
  Object.freeze({
    routeName: 'error-invalid-route-input',
    key: 'route-message.error-invalid-route-input',
    text: 'The requested address contains invalid information.',
  }),
  Object.freeze({
    routeName: 'error-authentication-required',
    key: 'route-message.error-authentication-required',
    text: 'Authentication is required to continue.',
  }),
  Object.freeze({
    routeName: 'error-permission-denied',
    key: 'route-message.error-permission-denied',
    text: 'You do not have permission to view this page.',
  }),
  Object.freeze({
    routeName: 'error-route-not-found',
    key: 'route-message.error-route-not-found',
    text: 'The requested page was not found.',
  }),
  Object.freeze({
    routeName: 'error-application-route-failure',
    key: 'route-message.error-application-route-failure',
    text: 'The application could not open this page.',
  }),
  Object.freeze({
    routeName: 'error-network-unavailable',
    key: 'route-message.error-network-unavailable',
    text: 'This page is unavailable while the device is offline.',
  }),
  Object.freeze({
    routeName: 'error-service-unavailable',
    key: 'route-message.error-service-unavailable',
    text: 'This service is temporarily unavailable.',
  }),
] as const satisfies readonly {
  readonly routeName: RouteName
  readonly key: string
  readonly text: string
}[])

export const telemetryNameRegistry = Object.freeze(
  routeRegistry.map((record) => record.meta.telemetryName),
)

export const errorRouteRegistry = Object.freeze([
  Object.freeze({
    code: '400',
    category: 'invalid-route-input',
    routeName: 'error-invalid-route-input',
  }),
  Object.freeze({
    code: '401',
    category: 'authentication-required',
    routeName: 'error-authentication-required',
  }),
  Object.freeze({
    code: '403',
    category: 'permission-denied',
    routeName: 'error-permission-denied',
  }),
  Object.freeze({ code: '404', category: 'route-not-found', routeName: 'error-route-not-found' }),
  Object.freeze({
    code: '500',
    category: 'application-route-failure',
    routeName: 'error-application-route-failure',
  }),
  Object.freeze({
    code: 'offline',
    category: 'network-unavailable',
    routeName: 'error-network-unavailable',
  }),
  Object.freeze({
    code: 'maintenance',
    category: 'service-unavailable',
    routeName: 'error-service-unavailable',
  }),
] as const satisfies readonly {
  readonly code: string
  readonly category: string
  readonly routeName: RouteName
}[])

export const routeLayoutCapabilityRegistry = Object.freeze([
  Object.freeze({
    id: 'route-layout.reading-document',
    layout: 'reading',
    shellRequired: false,
    renderOwner: 'route-component',
    blockScrollOwnerId: 'document-block',
    inlineScrollOwnerId: 'document-inline',
    requiredShellRegionIds: Object.freeze([] as const),
    optionalShellRegionIds: Object.freeze([] as const),
    movablePanelIds: Object.freeze([] as const),
    resizableRegionIds: Object.freeze([] as const),
    capabilityStatus: 'ACTIVE',
  }),
] as const)

export const scrollOwnerRegistry = Object.freeze([
  Object.freeze({
    id: 'document-block',
    axis: 'block',
    ownerKind: 'document',
    ownerTarget: 'document.scrollingElement',
    nativeScrolling: true,
  }),
  Object.freeze({
    id: 'document-inline',
    axis: 'inline',
    ownerKind: 'document',
    ownerTarget: 'document.scrollingElement',
    nativeScrolling: true,
  }),
] as const)

export const scrollRestorationPolicyRegistry = Object.freeze([
  Object.freeze({
    id: 'route-scroll.document-history',
    historyTraversal: 'finite-saved-native-block-and-inline-offsets-for-matching-owner',
    newNavigation: 'logical-block-and-inline-start',
    missingOrChangedOwner: 'logical-start',
    ownerReadiness: 'after-routed-dom-commit',
    arbitraryTimeout: 'PROHIBITED',
    polling: 'PROHIBITED',
    customScroller: 'PROHIBITED',
    scrollHijacking: 'PROHIBITED',
  }),
] as const)

export const focusContractRegistry = Object.freeze([
  Object.freeze({
    id: 'route-focus.primary-heading',
    target: 'h1[data-route-focus="primary-heading"]',
    targetTabIndex: -1,
    timing: 'after-routed-dom-commit-without-arbitrary-timeout',
    focusBehavior: 'prevent-scroll-then-registered-scroll-restoration',
    successfulNavigation: 'transfer-focus-to-target',
    cancelledOrFailedNavigation: 'preserve-or-restore-previous-valid-focus',
    missingTarget: 'typed-navigation-failure',
  }),
] as const)

export const activeRedirectRegistry = Object.freeze([] as const)
export const activeDynamicRouteRegistry = Object.freeze([] as const)

export function getErrorRouteName(code: ErrorRouteCode): RouteName {
  const record = errorRouteRegistry.find((candidate) => candidate.code === code)

  if (record === undefined) {
    throw new TypeError('The Error Route is not registered.')
  }

  return record.routeName
}

export function getRouteRecord(name: unknown): (typeof routeRegistry)[number] {
  const record = routeRegistry.find((candidate) => candidate.name === name)

  if (record === undefined) {
    throw new TypeError('The generated route is not registered.')
  }

  return record
}

export function getRouteRecordBySourcePath(sourcePath: string): (typeof routeRegistry)[number] {
  const record = routeRegistry.find((candidate) => candidate.sourcePath === sourcePath)

  if (record === undefined) {
    throw new TypeError('The page source is not registered.')
  }

  return record
}

export function getRoutePresentation(name: unknown): {
  readonly title: string
  readonly message: string
} {
  const record = getRouteRecord(name)
  const message = routeMessageRegistry.find((candidate) => candidate.routeName === record.name)

  if (message === undefined) {
    throw new TypeError('The route presentation is incomplete.')
  }

  return Object.freeze({
    title: routeTitleRegistry[record.meta.titleKey],
    message: message.text,
  })
}
