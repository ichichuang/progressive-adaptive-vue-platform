import type { ConsoleMessageScope, ConsoleTranslate } from '../../shared/i18n/message-schema'
import { getDefaultConsoleMessage } from '../../shared/i18n/default-messages'
import type { RouteTransitionFamilyId } from './route-transition/route-transition-types'

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
  readonly routeTransitionFamilyId: RouteTransitionFamilyId
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

export interface ConsoleNavigationGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly {
    readonly iconClass: string
    readonly label: string
    readonly routeName: string
  }[]
}

export type LayoutPresetId =
  'navigation-left' | 'navigation-right' | 'navigation-top' | 'focus' | 'workspace'

export interface LayoutCapabilityRegistryRecord {
  readonly id: string
  readonly layout: 'reading' | 'workspace' | 'focused-task'
  readonly shellRequired: boolean
  readonly renderOwner: 'route-component' | '@platform/ui'
  readonly allowedProfiles: readonly LayoutProfileId[]
  readonly allowedPresets: readonly LayoutPresetId[]
  readonly regionIdsByProfile: Readonly<{
    narrow: readonly string[]
    regular: readonly string[]
    wide: readonly string[]
  }> | null
  readonly movablePanelIds: readonly string[]
  readonly resizableRegionIds: readonly string[]
  readonly narrowProjection: 'stack' | 'tabs' | 'sheet' | null
  readonly blockScrollOwnerId: string
  readonly inlineScrollOwnerId: string
  readonly minimumTargetPolicyId: string | null
  readonly profileThresholdPolicyId: string | null
  readonly safeAreaPolicyId: string | null
  readonly capabilityStatus: 'ACTIVE'
}

export interface ScrollOwnerRegistryRecord {
  readonly id: string
  readonly axis: 'block' | 'inline'
  readonly ownerKind: 'document' | 'region'
  readonly ownerTarget: string
  readonly nativeScrolling: true
  readonly bodyScrollPolicy: 'owner-is-document' | 'prohibited-while-shell-mounted'
  readonly overscrollBehavior: 'native-document-chain' | 'contain'
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
  routeTransitionFamilyId: 'route-family.error',
} as const)

const consoleRouteMeta = Object.freeze({
  layout: 'workspace',
  layoutCapabilityId: 'route-layout.architecture-admin-console',
  auth: 'public',
  requiredPermissionIds: emptyPermissionIds,
  blockScrollOwnerId: 'architecture-console-content-block',
  inlineScrollOwnerId: 'architecture-console-content-inline',
  keepAlive: 'never',
  dataPrefetch: 'none',
  errorPolicy: 'route-boundary',
  unsavedChangesPolicy: 'none',
  focusContractId: 'route-focus.architecture-console-page-heading',
  scrollRestorationPolicyId: 'route-scroll.architecture-console-content-history',
  routeTransitionFamilyId: 'route-family.architecture-workspace',
} as const)

export const routeRegistry = Object.freeze([
  Object.freeze({
    name: 'console-overview',
    pathPattern: '/',
    sourcePath: 'apps/web/src/pages/index.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.console-overview',
      breadcrumbKey: 'route-breadcrumb.console-overview',
      telemetryName: 'route.console.overview',
    }),
  }),
  Object.freeze({
    name: 'appearance-management',
    pathPattern: '/appearance',
    sourcePath: 'apps/web/src/pages/appearance.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.appearance-management',
      breadcrumbKey: 'route-breadcrumb.appearance-management',
      telemetryName: 'route.console.appearance',
    }),
  }),
  Object.freeze({
    name: 'design-token-inspector',
    pathPattern: '/design-tokens',
    sourcePath: 'apps/web/src/pages/design-tokens.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.design-token-inspector',
      breadcrumbKey: 'route-breadcrumb.design-token-inspector',
      telemetryName: 'route.console.design-tokens',
    }),
  }),
  Object.freeze({
    name: 'runtime-kernel-inspector',
    pathPattern: '/runtime-kernel',
    sourcePath: 'apps/web/src/pages/runtime-kernel.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.runtime-kernel-inspector',
      breadcrumbKey: 'route-breadcrumb.runtime-kernel-inspector',
      telemetryName: 'route.console.runtime-kernel',
    }),
  }),
  Object.freeze({
    name: 'router-governance-inspector',
    pathPattern: '/router',
    sourcePath: 'apps/web/src/pages/router.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.router-governance-inspector',
      breadcrumbKey: 'route-breadcrumb.router-governance-inspector',
      telemetryName: 'route.console.router',
    }),
  }),
  Object.freeze({
    name: 'storage-persistence-inspector',
    pathPattern: '/storage',
    sourcePath: 'apps/web/src/pages/storage.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.storage-persistence-inspector',
      breadcrumbKey: 'route-breadcrumb.storage-persistence-inspector',
      telemetryName: 'route.console.storage',
    }),
  }),
  Object.freeze({
    name: 'ui-system-inspector',
    pathPattern: '/ui-system',
    sourcePath: 'apps/web/src/pages/ui-system.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.ui-system-inspector',
      breadcrumbKey: 'route-breadcrumb.ui-system-inspector',
      telemetryName: 'route.console.ui-system',
    }),
  }),
  Object.freeze({
    name: 'responsive-layout-inspector',
    pathPattern: '/responsive-layout',
    sourcePath: 'apps/web/src/pages/responsive-layout.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.responsive-layout-inspector',
      breadcrumbKey: 'route-breadcrumb.responsive-layout-inspector',
      telemetryName: 'route.console.responsive-layout',
    }),
  }),
  Object.freeze({
    name: 'engineering-quality-inspector',
    pathPattern: '/engineering',
    sourcePath: 'apps/web/src/pages/engineering.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.engineering-quality-inspector',
      breadcrumbKey: 'route-breadcrumb.engineering-quality-inspector',
      telemetryName: 'route.console.engineering',
    }),
  }),
  Object.freeze({
    name: 'capability-roadmap',
    pathPattern: '/capabilities',
    sourcePath: 'apps/web/src/pages/capabilities.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.capability-roadmap',
      breadcrumbKey: 'route-breadcrumb.capability-roadmap',
      telemetryName: 'route.console.capabilities',
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
export type RouteBreadcrumbKey = Exclude<
  (typeof routeRegistry)[number]['meta']['breadcrumbKey'],
  null
>
type ErrorRouteCode = (typeof errorRouteRegistry)[number]['code']

export const routeTitleRegistry = Object.freeze({
  'route-title.console-overview': getDefaultConsoleMessage('route-title.console-overview'),
  'route-title.appearance-management': getDefaultConsoleMessage(
    'route-title.appearance-management',
  ),
  'route-title.design-token-inspector': getDefaultConsoleMessage(
    'route-title.design-token-inspector',
  ),
  'route-title.runtime-kernel-inspector': getDefaultConsoleMessage(
    'route-title.runtime-kernel-inspector',
  ),
  'route-title.router-governance-inspector': getDefaultConsoleMessage(
    'route-title.router-governance-inspector',
  ),
  'route-title.storage-persistence-inspector': getDefaultConsoleMessage(
    'route-title.storage-persistence-inspector',
  ),
  'route-title.ui-system-inspector': getDefaultConsoleMessage('route-title.ui-system-inspector'),
  'route-title.responsive-layout-inspector': getDefaultConsoleMessage(
    'route-title.responsive-layout-inspector',
  ),
  'route-title.engineering-quality-inspector': getDefaultConsoleMessage(
    'route-title.engineering-quality-inspector',
  ),
  'route-title.capability-roadmap': getDefaultConsoleMessage('route-title.capability-roadmap'),
  'route-title.error-invalid-route-input': getDefaultConsoleMessage(
    'route-title.error-invalid-route-input',
  ),
  'route-title.error-authentication-required': getDefaultConsoleMessage(
    'route-title.error-authentication-required',
  ),
  'route-title.error-permission-denied': getDefaultConsoleMessage(
    'route-title.error-permission-denied',
  ),
  'route-title.error-route-not-found': getDefaultConsoleMessage(
    'route-title.error-route-not-found',
  ),
  'route-title.error-application-route-failure': getDefaultConsoleMessage(
    'route-title.error-application-route-failure',
  ),
  'route-title.error-network-unavailable': getDefaultConsoleMessage(
    'route-title.error-network-unavailable',
  ),
  'route-title.error-service-unavailable': getDefaultConsoleMessage(
    'route-title.error-service-unavailable',
  ),
} as const satisfies Readonly<Record<RouteTitleKey, string>>)

export const routeBreadcrumbRegistry = Object.freeze({
  'route-breadcrumb.console-overview': getDefaultConsoleMessage(
    'route-breadcrumb.console-overview',
  ),
  'route-breadcrumb.appearance-management': getDefaultConsoleMessage(
    'route-breadcrumb.appearance-management',
  ),
  'route-breadcrumb.design-token-inspector': getDefaultConsoleMessage(
    'route-breadcrumb.design-token-inspector',
  ),
  'route-breadcrumb.runtime-kernel-inspector': getDefaultConsoleMessage(
    'route-breadcrumb.runtime-kernel-inspector',
  ),
  'route-breadcrumb.router-governance-inspector': getDefaultConsoleMessage(
    'route-breadcrumb.router-governance-inspector',
  ),
  'route-breadcrumb.storage-persistence-inspector': getDefaultConsoleMessage(
    'route-breadcrumb.storage-persistence-inspector',
  ),
  'route-breadcrumb.ui-system-inspector': getDefaultConsoleMessage(
    'route-breadcrumb.ui-system-inspector',
  ),
  'route-breadcrumb.responsive-layout-inspector': getDefaultConsoleMessage(
    'route-breadcrumb.responsive-layout-inspector',
  ),
  'route-breadcrumb.engineering-quality-inspector': getDefaultConsoleMessage(
    'route-breadcrumb.engineering-quality-inspector',
  ),
  'route-breadcrumb.capability-roadmap': getDefaultConsoleMessage(
    'route-breadcrumb.capability-roadmap',
  ),
} as const satisfies Readonly<Record<RouteBreadcrumbKey, string>>)

export const routeMessageRegistry = Object.freeze([
  Object.freeze({
    routeName: 'console-overview',
    key: 'route-message.console-overview-summary',
    text: getDefaultConsoleMessage('route-message.console-overview-summary'),
  }),
  Object.freeze({
    routeName: 'appearance-management',
    key: 'route-message.appearance-management-summary',
    text: getDefaultConsoleMessage('route-message.appearance-management-summary'),
  }),
  Object.freeze({
    routeName: 'design-token-inspector',
    key: 'route-message.design-token-inspector-summary',
    text: getDefaultConsoleMessage('route-message.design-token-inspector-summary'),
  }),
  Object.freeze({
    routeName: 'runtime-kernel-inspector',
    key: 'route-message.runtime-kernel-inspector-summary',
    text: getDefaultConsoleMessage('route-message.runtime-kernel-inspector-summary'),
  }),
  Object.freeze({
    routeName: 'router-governance-inspector',
    key: 'route-message.router-governance-inspector-summary',
    text: getDefaultConsoleMessage('route-message.router-governance-inspector-summary'),
  }),
  Object.freeze({
    routeName: 'storage-persistence-inspector',
    key: 'route-message.storage-persistence-inspector-summary',
    text: getDefaultConsoleMessage('route-message.storage-persistence-inspector-summary'),
  }),
  Object.freeze({
    routeName: 'ui-system-inspector',
    key: 'route-message.ui-system-inspector-summary',
    text: getDefaultConsoleMessage('route-message.ui-system-inspector-summary'),
  }),
  Object.freeze({
    routeName: 'responsive-layout-inspector',
    key: 'route-message.responsive-layout-inspector-summary',
    text: getDefaultConsoleMessage('route-message.responsive-layout-inspector-summary'),
  }),
  Object.freeze({
    routeName: 'engineering-quality-inspector',
    key: 'route-message.engineering-quality-inspector-summary',
    text: getDefaultConsoleMessage('route-message.engineering-quality-inspector-summary'),
  }),
  Object.freeze({
    routeName: 'capability-roadmap',
    key: 'route-message.capability-roadmap-summary',
    text: getDefaultConsoleMessage('route-message.capability-roadmap-summary'),
  }),
  Object.freeze({
    routeName: 'error-invalid-route-input',
    key: 'route-message.error-invalid-route-input',
    text: getDefaultConsoleMessage('route-message.error-invalid-route-input'),
  }),
  Object.freeze({
    routeName: 'error-authentication-required',
    key: 'route-message.error-authentication-required',
    text: getDefaultConsoleMessage('route-message.error-authentication-required'),
  }),
  Object.freeze({
    routeName: 'error-permission-denied',
    key: 'route-message.error-permission-denied',
    text: getDefaultConsoleMessage('route-message.error-permission-denied'),
  }),
  Object.freeze({
    routeName: 'error-route-not-found',
    key: 'route-message.error-route-not-found',
    text: getDefaultConsoleMessage('route-message.error-route-not-found'),
  }),
  Object.freeze({
    routeName: 'error-application-route-failure',
    key: 'route-message.error-application-route-failure',
    text: getDefaultConsoleMessage('route-message.error-application-route-failure'),
  }),
  Object.freeze({
    routeName: 'error-network-unavailable',
    key: 'route-message.error-network-unavailable',
    text: getDefaultConsoleMessage('route-message.error-network-unavailable'),
  }),
  Object.freeze({
    routeName: 'error-service-unavailable',
    key: 'route-message.error-service-unavailable',
    text: getDefaultConsoleMessage('route-message.error-service-unavailable'),
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
    id: 'route-layout.architecture-admin-console',
    layout: 'workspace',
    shellRequired: true,
    renderOwner: '@platform/ui',
    allowedProfiles: Object.freeze(['narrow', 'regular', 'wide'] as const),
    allowedPresets: Object.freeze(['workspace'] as const),
    regionIdsByProfile: Object.freeze({
      narrow: Object.freeze([
        'architecture-console-content',
        'architecture-console-header',
        'architecture-console-navigation-overlay',
      ]),
      regular: Object.freeze([
        'architecture-console-content',
        'architecture-console-header',
        'architecture-console-navigation',
      ]),
      wide: Object.freeze([
        'architecture-console-content',
        'architecture-console-header',
        'architecture-console-navigation',
      ]),
    }),
    movablePanelIds: Object.freeze([] as const),
    resizableRegionIds: Object.freeze([] as const),
    narrowProjection: 'sheet',
    blockScrollOwnerId: 'architecture-console-content-block',
    inlineScrollOwnerId: 'architecture-console-content-inline',
    minimumTargetPolicyId: 'target-size.enhanced-44',
    profileThresholdPolicyId: 'layout-profile.architecture-admin-console',
    safeAreaPolicyId: 'safe-area.viewport-insets',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'route-layout.reading-document',
    layout: 'reading',
    shellRequired: false,
    renderOwner: 'route-component',
    allowedProfiles: Object.freeze([] as const),
    allowedPresets: Object.freeze([] as const),
    regionIdsByProfile: null,
    movablePanelIds: Object.freeze([] as const),
    resizableRegionIds: Object.freeze([] as const),
    narrowProjection: null,
    blockScrollOwnerId: 'document-block',
    inlineScrollOwnerId: 'document-inline',
    minimumTargetPolicyId: null,
    profileThresholdPolicyId: null,
    safeAreaPolicyId: null,
    capabilityStatus: 'ACTIVE',
  }),
] as const satisfies readonly LayoutCapabilityRegistryRecord[])

export const scrollOwnerRegistry = Object.freeze([
  Object.freeze({
    id: 'architecture-console-content-block',
    axis: 'block',
    ownerKind: 'region',
    ownerTarget: '[data-scroll-owner="architecture-console-content"]',
    nativeScrolling: true,
    bodyScrollPolicy: 'prohibited-while-shell-mounted',
    overscrollBehavior: 'contain',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'architecture-console-content-inline',
    axis: 'inline',
    ownerKind: 'region',
    ownerTarget: '[data-scroll-owner="architecture-console-content"]',
    nativeScrolling: true,
    bodyScrollPolicy: 'prohibited-while-shell-mounted',
    overscrollBehavior: 'contain',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'document-block',
    axis: 'block',
    ownerKind: 'document',
    ownerTarget: 'document.scrollingElement',
    nativeScrolling: true,
    bodyScrollPolicy: 'owner-is-document',
    overscrollBehavior: 'native-document-chain',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'document-inline',
    axis: 'inline',
    ownerKind: 'document',
    ownerTarget: 'document.scrollingElement',
    nativeScrolling: true,
    bodyScrollPolicy: 'owner-is-document',
    overscrollBehavior: 'native-document-chain',
    capabilityStatus: 'ACTIVE',
  }),
] as const satisfies readonly ScrollOwnerRegistryRecord[])

export const scrollRestorationPolicyRegistry = Object.freeze([
  Object.freeze({
    id: 'route-scroll.architecture-console-content-history',
    historyTraversal: 'finite-saved-native-block-and-inline-offsets-for-matching-owner',
    newNavigation: 'logical-block-and-inline-start',
    missingOrChangedOwner: 'logical-start',
    ownerReadiness: 'after-admin-shell-and-routed-dom-commit',
    arbitraryTimeout: 'PROHIBITED',
    polling: 'PROHIBITED',
    customScroller: 'PROHIBITED',
    scrollHijacking: 'PROHIBITED',
    capabilityStatus: 'ACTIVE',
  }),
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
    capabilityStatus: 'ACTIVE',
  }),
] as const)

export const focusContractRegistry = Object.freeze([
  Object.freeze({
    id: 'route-focus.architecture-console-page-heading',
    target: 'h1[data-route-focus="architecture-console-page-heading"]',
    targetTabIndex: -1,
    timing: 'after-admin-shell-and-routed-dom-commit-without-arbitrary-timeout',
    focusBehavior:
      'initial-preserve-browser-focus;subsequent-prevent-scroll-then-registered-scroll-restoration',
    successfulNavigation:
      'initial-preserve-browser-focus;subsequent-location-change-transfer-focus-to-target',
    cancelledOrFailedNavigation: 'preserve-or-restore-previous-valid-focus',
    missingTarget: 'typed-navigation-failure',
    visibleFocus: 'existing-semantic-focus-tokens',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'route-focus.primary-heading',
    target: 'h1[data-route-focus="primary-heading"]',
    targetTabIndex: -1,
    timing: 'after-routed-dom-commit-without-arbitrary-timeout',
    focusBehavior:
      'initial-preserve-browser-focus;subsequent-prevent-scroll-then-registered-scroll-restoration',
    successfulNavigation:
      'initial-preserve-browser-focus;subsequent-location-change-transfer-focus-to-target',
    cancelledOrFailedNavigation: 'preserve-or-restore-previous-valid-focus',
    missingTarget: 'typed-navigation-failure',
    visibleFocus: 'existing-semantic-focus-tokens',
    capabilityStatus: 'ACTIVE',
  }),
] as const)

export const consoleNavigationRegistry = Object.freeze([
  Object.freeze({
    id: 'workspace',
    label: getDefaultConsoleMessage('navigation.workspace'),
    items: Object.freeze([
      Object.freeze({
        iconClass: 'i-lucide-layout-dashboard',
        label: getDefaultConsoleMessage('route-title.console-overview'),
        routeName: 'console-overview',
      }),
    ]),
  }),
  Object.freeze({
    id: 'visual-system',
    label: getDefaultConsoleMessage('navigation.visual-system'),
    items: Object.freeze([
      Object.freeze({
        iconClass: 'i-lucide-palette',
        label: getDefaultConsoleMessage('route-title.appearance-management'),
        routeName: 'appearance-management',
      }),
      Object.freeze({
        iconClass: 'i-lucide-swatch-book',
        label: getDefaultConsoleMessage('route-title.design-token-inspector'),
        routeName: 'design-token-inspector',
      }),
    ]),
  }),
  Object.freeze({
    id: 'application-foundation',
    label: getDefaultConsoleMessage('navigation.application-foundation'),
    items: Object.freeze([
      Object.freeze({
        iconClass: 'i-lucide-cpu',
        label: getDefaultConsoleMessage('route-title.runtime-kernel-inspector'),
        routeName: 'runtime-kernel-inspector',
      }),
      Object.freeze({
        iconClass: 'i-lucide-route',
        label: getDefaultConsoleMessage('route-title.router-governance-inspector'),
        routeName: 'router-governance-inspector',
      }),
      Object.freeze({
        iconClass: 'i-lucide-database',
        label: getDefaultConsoleMessage('route-title.storage-persistence-inspector'),
        routeName: 'storage-persistence-inspector',
      }),
    ]),
  }),
  Object.freeze({
    id: 'interface-foundation',
    label: getDefaultConsoleMessage('navigation.interface-foundation'),
    items: Object.freeze([
      Object.freeze({
        iconClass: 'i-lucide-component',
        label: getDefaultConsoleMessage('route-title.ui-system-inspector'),
        routeName: 'ui-system-inspector',
      }),
      Object.freeze({
        iconClass: 'i-lucide-panels-top-left',
        label: getDefaultConsoleMessage('route-title.responsive-layout-inspector'),
        routeName: 'responsive-layout-inspector',
      }),
    ]),
  }),
  Object.freeze({
    id: 'development-governance',
    label: getDefaultConsoleMessage('navigation.development-governance'),
    items: Object.freeze([
      Object.freeze({
        iconClass: 'i-lucide-workflow',
        label: getDefaultConsoleMessage('route-title.engineering-quality-inspector'),
        routeName: 'engineering-quality-inspector',
      }),
    ]),
  }),
  Object.freeze({
    id: 'architecture-planning',
    label: getDefaultConsoleMessage('navigation.architecture-planning'),
    items: Object.freeze([
      Object.freeze({
        iconClass: 'i-lucide-map',
        label: getDefaultConsoleMessage('route-title.capability-roadmap'),
        routeName: 'capability-roadmap',
      }),
    ]),
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

export function getRoutePresentation(
  name: unknown,
  translate?: ConsoleTranslate,
): {
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
} {
  const record = getRouteRecord(name)
  const message = routeMessageRegistry.find((candidate) => candidate.routeName === record.name)

  if (message === undefined) {
    throw new TypeError('The route presentation is incomplete.')
  }

  const read = translate ?? getDefaultConsoleMessage
  return Object.freeze({
    breadcrumb:
      record.meta.breadcrumbKey === null
        ? read(record.meta.titleKey)
        : read(record.meta.breadcrumbKey),
    title: read(record.meta.titleKey),
    message: read(message.key),
  })
}
import type { LayoutProfileId } from '@platform/design-system'

export function getRouteMessageScope(name: unknown): ConsoleMessageScope {
  const record = getRouteRecord(name)
  if (record.name === 'appearance-management') return 'appearance'
  if (record.name === 'capability-roadmap') return 'capabilities'
  return record.meta.breadcrumbKey === null ? 'common' : 'console'
}

export function getConsoleNavigation(
  translate: ConsoleTranslate,
): readonly ConsoleNavigationGroup[] {
  const labels = {
    workspace: translate('navigation.workspace'),
    'visual-system': translate('navigation.visual-system'),
    'application-foundation': translate('navigation.application-foundation'),
    'interface-foundation': translate('navigation.interface-foundation'),
    'development-governance': translate('navigation.development-governance'),
    'architecture-planning': translate('navigation.architecture-planning'),
  }
  return consoleNavigationRegistry.map((group) => ({
    ...group,
    label: labels[group.id],
    items: group.items.map((item) => ({
      ...item,
      label: translate(getRouteRecord(item.routeName).meta.titleKey),
    })),
  }))
}
