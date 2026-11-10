import type { UiShellComposition } from '@platform/ui'
import type {
  ConsoleCommonMessageKey,
  ConsoleMessageScope,
  ConsoleTranslate,
} from '../../shared/i18n/message-schema'
import { getDefaultConsoleMessage } from '../../shared/i18n/default-messages'
import type { RouteParamsSchemaId, RouteQuerySchemaId } from './route-schemas'
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

export const workspaceIdentityPolicyRegistry = /* @__PURE__ */ Object.freeze([
  /* @__PURE__ */ Object.freeze({ id: 'workspace-identity.route-single', kind: 'route-single' }),
] as const)

type WorkspaceIdentityPolicyId = (typeof workspaceIdentityPolicyRegistry)[number]['id']

export interface RouteRegistryRecord {
  readonly workspaceIdentityPolicyId?: WorkspaceIdentityPolicyId | null
  readonly name: string
  readonly pathPattern: string
  readonly sourcePath: string
  readonly contentReadiness: 'route-dom' | 'workspace-content'
  readonly scrollRestoration: 'none' | 'build-static' | 'workspace-content'
  readonly messageScope: ConsoleMessageScope
  readonly meta: ValidatedRouteMeta
  readonly paramsSchemaId: RouteParamsSchemaId
  readonly querySchemaId: RouteQuerySchemaId
  readonly hashPolicy?: 'none' | 'element-id'
  readonly capabilityStatus: 'ACTIVE'
}

export type LayoutPresetId =
  'navigation-left' | 'navigation-right' | 'navigation-top' | 'focus' | 'workspace'

export interface LayoutCapabilityRegistryRecord {
  readonly id: string
  readonly layout: 'reading' | 'workspace' | 'focused-task'
  readonly composition: UiShellComposition | null
  readonly shellRequired: boolean
  readonly focusContractId: string
  readonly scrollRestorationPolicyId: string
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

const applicationLayout = Object.freeze({
  shellRequired: true,
  focusContractId: 'route-focus.architecture-console-page-heading',
  scrollRestorationPolicyId: 'route-scroll.architecture-console-content-history',
  renderOwner: '@platform/ui',
  allowedProfiles: Object.freeze(['narrow', 'regular', 'wide'] as const),
  movablePanelIds: Object.freeze([] as const),
  resizableRegionIds: Object.freeze([] as const),
  blockScrollOwnerId: 'architecture-console-content-block',
  inlineScrollOwnerId: 'architecture-console-content-inline',
  minimumTargetPolicyId: 'target-size.enhanced-44',
  profileThresholdPolicyId: 'layout-profile.architecture-admin-console',
  safeAreaPolicyId: 'safe-area.viewport-insets',
  capabilityStatus: 'ACTIVE',
} as const)

function defineApplicationLayout(
  composition: UiShellComposition,
  id = `route-layout.${composition}`,
) {
  const administration = composition.startsWith('admin-')
  const regions = [
    'architecture-console-content',
    ...(composition.endsWith('-footer') ? ['architecture-console-footer'] : []),
    ...(administration || composition.startsWith('header-') ? ['architecture-console-header'] : []),
  ]
  const persistentRegions = Object.freeze([
    ...regions,
    ...(administration ? ['architecture-console-navigation'] : []),
  ])
  return Object.freeze({
    ...applicationLayout,
    id,
    composition,
    layout: administration ? ('workspace' as const) : ('focused-task' as const),
    allowedPresets: Object.freeze(administration ? (['workspace'] as const) : (['focus'] as const)),
    narrowProjection: administration ? ('sheet' as const) : null,
    regionIdsByProfile: Object.freeze({
      narrow: Object.freeze([
        ...regions,
        ...(administration ? ['architecture-console-navigation-overlay'] : []),
      ]),
      regular: persistentRegions,
      wide: persistentRegions,
    }),
  })
}

export const routeLayoutCapabilityRegistry = Object.freeze([
  defineApplicationLayout('admin-workspace', 'route-layout.architecture-admin-console'),
  defineApplicationLayout(
    'admin-workspace-footer',
    'route-layout.architecture-admin-console-footer',
  ),
  defineApplicationLayout('header-content'),
  defineApplicationLayout('header-content-footer'),
  defineApplicationLayout('content-footer'),
  defineApplicationLayout('content-only'),
  Object.freeze({
    id: 'route-layout.reading-document',
    layout: 'reading',
    composition: null,
    focusContractId: 'route-focus.primary-heading',
    scrollRestorationPolicyId: 'route-scroll.document-history',
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

export function getRouteLayoutCapability(id: string): LayoutCapabilityRegistryRecord {
  const matches = routeLayoutCapabilityRegistry.filter((record) => record.id === id)
  const capability = matches[0]
  if (matches.length !== 1 || capability === undefined) {
    throw new Error(`Unknown or duplicate layout: ${id}`)
  }
  return capability
}

function layoutMeta(id: string) {
  const capability = getRouteLayoutCapability(id)
  return {
    layoutCapabilityId: capability.id,
    layout: capability.layout,
    blockScrollOwnerId: capability.blockScrollOwnerId,
    inlineScrollOwnerId: capability.inlineScrollOwnerId,
    focusContractId: capability.focusContractId,
    scrollRestorationPolicyId: capability.scrollRestorationPolicyId,
  }
}

const emptyPermissionIds = Object.freeze([] as const)
const commonRouteMeta = Object.freeze({
  breadcrumbKey: null,
  ...layoutMeta('route-layout.reading-document'),
  auth: 'public',
  requiredPermissionIds: emptyPermissionIds,
  keepAlive: 'never',
  dataPrefetch: 'none',
  unsavedChangesPolicy: 'none',
  routeTransitionFamilyId: 'route-family.error',
} as const)

const consoleRouteMeta = Object.freeze({
  ...layoutMeta('route-layout.architecture-admin-console'),
  auth: 'public',
  requiredPermissionIds: emptyPermissionIds,
  keepAlive: 'route-instance',
  dataPrefetch: 'none',
  errorPolicy: 'route-boundary',
  unsavedChangesPolicy: 'none',
  routeTransitionFamilyId: 'route-family.architecture-workspace',
} as const)

function defineRoute<const R extends RouteRegistryRecord>(
  record: R,
): Readonly<
  Omit<R, 'hashPolicy' | 'workspaceIdentityPolicyId'> & {
    hashPolicy: R extends { readonly hashPolicy: infer H } ? H : 'none'
    workspaceIdentityPolicyId: R extends { readonly workspaceIdentityPolicyId: infer P } ? P : null
  }
>
function defineRoute(record: RouteRegistryRecord) {
  return Object.freeze({
    ...record,
    hashPolicy: record.hashPolicy ?? 'none',
    workspaceIdentityPolicyId: record.workspaceIdentityPolicyId ?? null,
  })
}

function defineConsoleWorkspaceRoute<
  const R extends Pick<RouteRegistryRecord, 'name' | 'pathPattern' | 'sourcePath'> & {
    readonly meta: Pick<ValidatedRouteMeta, 'telemetryName'>
  },
>(record: R) {
  return defineRoute({
    contentReadiness: 'route-dom',
    scrollRestoration: 'build-static',
    messageScope: 'console',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    workspaceIdentityPolicyId: 'workspace-identity.route-single',
    ...record,
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: `route-title.${record.name}` as `route-title.${R['name']}`,
      breadcrumbKey: `route-breadcrumb.${record.name}` as `route-breadcrumb.${R['name']}`,
      ...record.meta,
    }),
  } as const)
}

function defineWorkbenchRoute<const S extends string>(suffix: S) {
  return defineConsoleWorkspaceRoute({
    name: `workbench-${suffix}`,
    pathPattern: `/${suffix}`,
    sourcePath: `apps/web/src/pages/${suffix}.vue`,
    meta: {
      telemetryName: `route.workbench.${suffix}`,
    },
  } as const)
}

function defineComponentWorkspaceRoute<const S extends string>(suffix: S) {
  return defineConsoleWorkspaceRoute({
    name: `component-${suffix}`,
    pathPattern: `/components/${suffix}`,
    sourcePath: `apps/web/src/pages/component-${suffix}.vue`,
    meta: {
      telemetryName: `route.component.${suffix}`,
    },
  } as const)
}

function defineFormWorkspaceRoute<const S extends string>(suffix: S) {
  return defineConsoleWorkspaceRoute({
    name: `component-form-${suffix}`,
    pathPattern: `/components/forms/${suffix}`,
    sourcePath: `apps/web/src/pages/component-form-${suffix}.vue`,
    meta: {
      telemetryName: `route.component.form.${suffix}`,
    },
  } as const)
}

function defineTableExampleRoute<const G extends 'table' | 'combination', const S extends string>(
  group: G,
  suffix: S,
) {
  return defineConsoleWorkspaceRoute({
    name: `component-${group}-${suffix}`,
    pathPattern: `/components/${group === 'table' ? 'tables' : 'combinations'}/${suffix}`,
    sourcePath: `apps/web/src/pages/component-${group}-${suffix}.vue`,
    meta: { telemetryName: `route.component.${group}.${suffix}` },
  } as const)
}

function defineErrorRoute<const Category extends string, const Segment extends string>(
  category: Category,
  segment: Segment,
) {
  return defineRoute({
    name: `error-${category}`,
    contentReadiness: 'route-dom',
    scrollRestoration: 'none',
    messageScope: 'common',
    pathPattern: `/error/${segment}`,
    sourcePath: `apps/web/src/pages/error/${segment}.vue`,
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...commonRouteMeta,
      titleKey: `route-title.error-${category}`,
      telemetryName: `route.error.${category}`,
      errorPolicy: 'application-boundary',
    }),
  } as const)
}

const formWorkspaceRoutes = Object.freeze([
  defineFormWorkspaceRoute('overview'),
  defineFormWorkspaceRoute('basics'),
  defineFormWorkspaceRoute('detail'),
  defineFormWorkspaceRoute('layout'),
  defineFormWorkspaceRoute('dependencies'),
  defineFormWorkspaceRoute('calculations'),
  defineFormWorkspaceRoute('structure'),
  defineFormWorkspaceRoute('validation'),
  defineFormWorkspaceRoute('extension'),
  defineFormWorkspaceRoute('controls'),
  defineFormWorkspaceRoute('lifecycle'),
  defineFormWorkspaceRoute('loading'),
  defineFormWorkspaceRoute('submission'),
  defineFormWorkspaceRoute('options'),
  defineFormWorkspaceRoute('builder'),
] as const)

export const routeRegistry = Object.freeze([
  defineConsoleWorkspaceRoute({
    name: 'workbench-dashboard',
    pathPattern: '/',
    sourcePath: 'apps/web/src/pages/index.vue',
    meta: {
      telemetryName: 'route.workbench.dashboard',
    },
  }),
  defineWorkbenchRoute('colors'),
  defineWorkbenchRoute('sizes'),
  defineWorkbenchRoute('typography'),
  defineWorkbenchRoute('interactions'),
  defineWorkbenchRoute('motion'),
  defineConsoleWorkspaceRoute({
    name: 'component-showcase',
    pathPattern: '/components',
    sourcePath: 'apps/web/src/pages/component-showcase.vue',
    meta: {
      telemetryName: 'route.component.showcase',
    },
  }),
  defineComponentWorkspaceRoute('actions'),
  defineComponentWorkspaceRoute('inputs'),
  defineComponentWorkspaceRoute('selection'),
  defineComponentWorkspaceRoute('navigation'),
  defineComponentWorkspaceRoute('data'),
  defineComponentWorkspaceRoute('feedback'),
  defineComponentWorkspaceRoute('layout'),
  ...formWorkspaceRoutes,
  defineComponentWorkspaceRoute('table'),
  defineTableExampleRoute('table', 'appearance'),
  defineTableExampleRoute('table', 'theme'),
  defineTableExampleRoute('table', 'columns'),
  defineTableExampleRoute('table', 'selection'),
  defineTableExampleRoute('table', 'remote'),
  defineTableExampleRoute('table', 'configuration'),
  defineTableExampleRoute('table', 'overview'),
  defineTableExampleRoute('table', 'scroll'),
  defineTableExampleRoute('table', 'widths'),
  defineTableExampleRoute('table', 'responsive'),
  defineTableExampleRoute('table', 'sorting'),
  defineTableExampleRoute('table', 'rendering'),
  defineTableExampleRoute('table', 'virtual'),
  defineTableExampleRoute('table', 'states'),
  defineTableExampleRoute('table', 'summary'),
  defineTableExampleRoute('combination', 'query'),
  defineTableExampleRoute('combination', 'modal'),
  defineTableExampleRoute('combination', 'drawer'),
  defineTableExampleRoute('combination', 'page'),
  defineRoute({
    ...defineComponentWorkspaceRoute('table-editor'),
    querySchemaId: 'route-query.table-editor',
  }),
  defineRoute({
    name: 'control-center',
    contentReadiness: 'route-dom',
    scrollRestoration: 'build-static',
    messageScope: 'appearance',
    pathPattern: '/control-center',
    sourcePath: 'apps/web/src/pages/control-center.vue',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    workspaceIdentityPolicyId: null,
    meta: Object.freeze({
      ...consoleRouteMeta,
      keepAlive: 'never',
      titleKey: 'route-title.control-center',
      breadcrumbKey: 'route-breadcrumb.control-center',
      telemetryName: 'route.console.control-center',
    }),
  }),
  defineErrorRoute('invalid-route-input', '400'),
  defineErrorRoute('authentication-required', '401'),
  defineErrorRoute('permission-denied', '403'),
  defineRoute({
    name: 'error-route-not-found',
    contentReadiness: 'route-dom',
    scrollRestoration: 'none',
    messageScope: 'common',
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
  defineErrorRoute('application-route-failure', '500'),
  defineErrorRoute('network-unavailable', 'offline'),
  defineErrorRoute('service-unavailable', 'maintenance'),
] as const satisfies readonly RouteRegistryRecord[])

export type RouteName = (typeof routeRegistry)[number]['name']
export type RouteTitleKey = (typeof routeRegistry)[number]['meta']['titleKey']
export type RouteBreadcrumbKey = Exclude<
  (typeof routeRegistry)[number]['meta']['breadcrumbKey'],
  null
>
type ErrorRouteCode = (typeof errorRouteRegistry)[number]['code']

function getDefaultRouteMessages<Key extends RouteTitleKey | RouteBreadcrumbKey>(
  keys: readonly Key[],
): Readonly<Record<Key, string>> {
  // Object.fromEntries widens keys; every supplied route key receives its default message.
  return Object.freeze(
    Object.fromEntries(keys.map((key) => [key, getDefaultConsoleMessage(key)])) as Record<
      Key,
      string
    >,
  )
}

export const routeTitleRegistry = getDefaultRouteMessages(
  routeRegistry.map((record) => record.meta.titleKey),
)

const routeBreadcrumbKeys = /* @__PURE__ */ routeRegistry.map((record) => record.meta.breadcrumbKey)
export const routeBreadcrumbRegistry = /* @__PURE__ */ getDefaultRouteMessages(
  /* @__PURE__ */ routeBreadcrumbKeys.filter((key) => key !== null),
)

export const routeMessageRegistry = Object.freeze(
  routeRegistry.map((record) => {
    const key: ConsoleCommonMessageKey =
      record.messageScope === 'common'
        ? `route-message.${record.name}`
        : `route-message.${record.name}-summary`
    return Object.freeze({ routeName: record.name, key, text: getDefaultConsoleMessage(key) })
  }),
)

export const telemetryNameRegistry = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ routeRegistry.map((record) => record.meta.telemetryName),
)

function defineErrorRouteTarget<const Code extends string, const Category extends string>(
  code: Code,
  category: Category,
) {
  return Object.freeze({ code, category, routeName: `error-${category}` as const })
}

export const errorRouteRegistry = Object.freeze([
  defineErrorRouteTarget('400', 'invalid-route-input'),
  defineErrorRouteTarget('401', 'authentication-required'),
  defineErrorRouteTarget('403', 'permission-denied'),
  defineErrorRouteTarget('404', 'route-not-found'),
  defineErrorRouteTarget('500', 'application-route-failure'),
  defineErrorRouteTarget('offline', 'network-unavailable'),
  defineErrorRouteTarget('maintenance', 'service-unavailable'),
] as const satisfies readonly {
  readonly code: string
  readonly category: string
  readonly routeName: RouteName
}[])

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

export const scrollRestorationPolicyRegistry = /* @__PURE__ */ Object.freeze([
  /* @__PURE__ */ Object.freeze({
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
  /* @__PURE__ */ Object.freeze({
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
    focusBehavior: 'no-programmatic-focus',
    successfulNavigation: 'preserve-browser-focus',
    cancelledOrFailedNavigation: 'preserve-browser-focus',
    missingTarget: 'typed-navigation-failure',
    visibleFocus: 'existing-semantic-focus-tokens',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'route-focus.primary-heading',
    target: 'h1[data-route-focus="primary-heading"]',
    targetTabIndex: -1,
    timing: 'after-routed-dom-commit-without-arbitrary-timeout',
    focusBehavior: 'no-programmatic-focus',
    successfulNavigation: 'preserve-browser-focus',
    cancelledOrFailedNavigation: 'preserve-browser-focus',
    missingTarget: 'typed-navigation-failure',
    visibleFocus: 'existing-semantic-focus-tokens',
    capabilityStatus: 'ACTIVE',
  }),
] as const)

export interface ConsoleNavigationItem {
  readonly iconClass: string
  readonly destination: {
    [
      Name in Extract<
        (typeof routeRegistry)[number],
        { readonly paramsSchemaId: 'route-params.none' }
      >['name']
    ]: { readonly name: Name }
  }[Extract<
    (typeof routeRegistry)[number],
    { readonly paramsSchemaId: 'route-params.none' }
  >['name']]
}

export interface ConsoleNavigationGroup {
  readonly id: string
  readonly labelKey: ConsoleCommonMessageKey
  readonly items: readonly (ConsoleNavigationItem | ConsoleNavigationGroup)[]
}

function defineNavigationItem<
  const Name extends ConsoleNavigationItem['destination']['name'],
  const Icon extends string,
>(name: Name, iconClass: Icon) {
  return Object.freeze({ iconClass, destination: Object.freeze({ name }) })
}

export const consoleNavigationRegistry = Object.freeze([
  Object.freeze({
    id: 'workbench',
    labelKey: 'navigation.workbench',
    items: Object.freeze([
      defineNavigationItem('workbench-dashboard', 'i-lucide-layout-dashboard'),
    ]),
  }),
  Object.freeze({
    id: 'design',
    labelKey: 'navigation.design',
    items: Object.freeze([
      defineNavigationItem('workbench-colors', 'i-lucide-palette'),
      defineNavigationItem('workbench-sizes', 'i-lucide-ruler'),
      defineNavigationItem('workbench-typography', 'i-lucide-type'),
    ]),
  }),
  Object.freeze({
    id: 'capabilities',
    labelKey: 'navigation.capabilities',
    items: Object.freeze([
      defineNavigationItem('workbench-interactions', 'i-lucide-sparkles'),
      defineNavigationItem('workbench-motion', 'i-lucide-workflow'),
    ]),
  }),
  Object.freeze({
    id: 'components',
    labelKey: 'navigation.components',
    items: Object.freeze([
      defineNavigationItem('component-showcase', 'i-lucide-component'),
      defineNavigationItem('component-actions', 'i-lucide-sparkles'),
      defineNavigationItem('component-inputs', 'i-lucide-type'),
      defineNavigationItem('component-selection', 'i-lucide-swatch-book'),
      defineNavigationItem('component-navigation', 'i-lucide-route'),
      defineNavigationItem('component-data', 'i-lucide-database'),
      defineNavigationItem('component-feedback', 'i-lucide-workflow'),
      defineNavigationItem('component-layout', 'i-lucide-panels-top-left'),
      Object.freeze({
        id: 'forms',
        labelKey: 'navigation.forms',
        items: Object.freeze(
          formWorkspaceRoutes.map(({ name }) =>
            defineNavigationItem(
              name,
              name === 'component-form-builder' ? 'i-lucide-panels-top-left' : 'i-lucide-type',
            ),
          ),
        ),
      }),
      Object.freeze({
        id: 'tables',
        labelKey: 'navigation.tables',
        items: Object.freeze([
          defineNavigationItem('component-table-overview', 'i-lucide-database'),
          defineNavigationItem('component-table', 'i-lucide-database'),
          defineNavigationItem('component-table-scroll', 'i-lucide-database'),
          defineNavigationItem('component-table-widths', 'i-lucide-database'),
          defineNavigationItem('component-table-responsive', 'i-lucide-database'),
          defineNavigationItem('component-table-columns', 'i-lucide-database'),
          defineNavigationItem('component-table-sorting', 'i-lucide-database'),
          defineNavigationItem('component-table-selection', 'i-lucide-database'),
          defineNavigationItem('component-table-rendering', 'i-lucide-database'),
          defineNavigationItem('component-table-summary', 'i-lucide-database'),
          defineNavigationItem('component-table-virtual', 'i-lucide-database'),
          defineNavigationItem('component-table-states', 'i-lucide-database'),
          defineNavigationItem('component-table-remote', 'i-lucide-database'),
          defineNavigationItem('component-table-appearance', 'i-lucide-database'),
          defineNavigationItem('component-table-theme', 'i-lucide-database'),
          defineNavigationItem('component-table-configuration', 'i-lucide-database'),
        ]),
      }),
      Object.freeze({
        id: 'combinations',
        labelKey: 'navigation.combinations',
        items: Object.freeze([
          defineNavigationItem('component-combination-query', 'i-lucide-panels-top-left'),
          defineNavigationItem('component-combination-modal', 'i-lucide-panels-top-left'),
          defineNavigationItem('component-combination-drawer', 'i-lucide-panels-top-left'),
          defineNavigationItem('component-combination-page', 'i-lucide-panels-top-left'),
        ]),
      }),
    ]),
  }),
] as const satisfies readonly ConsoleNavigationGroup[])

function flattenNavigationGroups(
  groups: readonly ConsoleNavigationGroup[],
  parentId?: string,
): readonly { readonly id: string; readonly parentId: string | undefined }[] {
  return groups.flatMap((group) => [
    { id: group.id, parentId },
    ...flattenNavigationGroups(
      group.items.filter((item): item is ConsoleNavigationGroup => 'items' in item),
      group.id,
    ),
  ])
}

export function getConsoleNavigationItems(
  groups: readonly ConsoleNavigationGroup[],
): readonly ConsoleNavigationItem[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) =>
      'destination' in item ? [item] : getConsoleNavigationItems([item]),
    ),
  )
}

export const consoleNavigationGroups = Object.freeze(
  flattenNavigationGroups(consoleNavigationRegistry),
)
export const consoleNavigationItems = Object.freeze(
  getConsoleNavigationItems(consoleNavigationRegistry),
)

export const activeRedirectRegistry = /* @__PURE__ */ Object.freeze([] as const)
export const activeDynamicRouteRegistry = /* @__PURE__ */ Object.freeze([] as const)

export function getErrorRouteName(
  code: ErrorRouteCode,
): (typeof errorRouteRegistry)[number]['routeName'] {
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
  return getRouteRecord(name).messageScope
}
