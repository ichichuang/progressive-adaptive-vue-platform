import type { UiShellComposition } from '@platform/ui'
import type {
  ConsoleCommonMessageKey,
  ConsoleMessageScope,
  ConsoleTranslate,
} from '../../shared/i18n/message-schema'
import { getDefaultConsoleMessage } from '../../shared/i18n/default-messages'
import {
  routeParamsSchema,
  routeQuerySchema,
  type RouteParamsSchemaId,
  type RouteQuerySchemaId,
} from './route-schemas'
import type { RouteTransitionFamilyId } from './route-transition/route-transition-types'
import type { AccessRequest } from '../access/access-contract'
import {
  administrationAccessDomain,
  administrationLayout,
  administrationPages,
  administrationRouteFolder,
  resolveAdministrationSelection,
  type AdministrationModule,
} from '../administration/administration-routes'

import {
  accessShowcaseProfiles,
  showcasePages,
  showcaseProjectRequirement,
  showcaseRouteFolder,
  type AccessShowcaseProfile,
} from '../access-showcase/showcase-routes'

type RouteAuthPolicy = 'public' | 'anonymous-only' | 'required' | 'policy'

type RouteKeepAlivePolicy = 'never' | 'route-instance'

type RouteDataPrefetchPolicy = 'none' | 'blocking-required' | 'non-blocking'

type RouteErrorPolicy = 'route-boundary' | 'application-boundary' | 'fatal-startup-boundary'

interface RouteAccessDestination {
  readonly name: string
  readonly params: Readonly<Record<string, unknown>>
  readonly query: Readonly<Record<string, unknown>>
  readonly hash: string
}

export interface ValidatedRouteMeta {
  readonly titleKey: string
  readonly breadcrumbKey: string | null
  readonly layout: 'reading' | 'workspace' | 'focused-task'
  readonly layoutCapabilityId: string
  readonly auth: RouteAuthPolicy
  readonly requiredPermissionIds: readonly string[]
  readonly permissionRequests?: Readonly<
    Record<string, AccessRequest | ((destination: RouteAccessDestination) => AccessRequest)>
  >
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
  readonly isHome?: true
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
  const R extends Pick<RouteRegistryRecord, 'name' | 'pathPattern' | 'sourcePath' | 'isHome'> & {
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

function defineChartWorkspaceRoute<const S extends string>(suffix: S) {
  return defineConsoleWorkspaceRoute({
    name: `component-chart-${suffix}`,
    pathPattern: `/components/charts/${suffix}`,
    sourcePath: `apps/web/src/pages/component-chart-${suffix}.vue`,
    meta: { telemetryName: `route.component.chart.${suffix}` },
  } as const)
}

function defineMotionWorkspaceRoute<const S extends string>(suffix: S) {
  return defineConsoleWorkspaceRoute({
    name: `component-motion-${suffix}`,
    pathPattern: `/components/motion/${suffix}`,
    sourcePath: `apps/web/src/pages/component-motion-${suffix}.vue`,
    meta: { telemetryName: `route.component.motion.${suffix}` },
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

function defineApiWorkspaceRoute<const S extends string>(suffix: S) {
  return defineConsoleWorkspaceRoute({
    name: `api-${suffix}`,
    pathPattern: `/requests/${suffix}`,
    sourcePath: `apps/web/src/pages/api-${suffix}.vue`,
    meta: { telemetryName: `route.api.${suffix}` },
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

function defineErrorRouteTarget<const Code extends string, const Category extends string>(
  code: Code,
  category: Category,
) {
  return Object.freeze({ code, category, routeName: `error-${category}` as const })
}

const errorTargets = Object.freeze([
  defineErrorRouteTarget('400', 'invalid-route-input'),
  defineErrorRouteTarget('401', 'authentication-required'),
  defineErrorRouteTarget('403', 'permission-denied'),
  defineErrorRouteTarget('404', 'route-not-found'),
  defineErrorRouteTarget('500', 'application-route-failure'),
  defineErrorRouteTarget('offline', 'network-unavailable'),
  defineErrorRouteTarget('maintenance', 'service-unavailable'),
] as const)

function defineStatusPreview<const Segment extends string, const Category extends string>(
  segment: Segment,
  category: Category,
) {
  return defineRoute({
    name: `preview-status-${segment}`,
    pathPattern: `/previews/status/${segment}`,
    sourcePath: `apps/web/src/pages/preview-status-${segment}.vue`,
    contentReadiness: 'route-dom',
    scrollRestoration: 'none',
    messageScope: 'common',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    workspaceIdentityPolicyId: 'workspace-identity.route-single',
    statusMessageKey:
      segment === '404'
        ? 'route-message.preview-status-404'
        : (`route-message.error-${category}` as const),
    meta: {
      ...consoleRouteMeta,
      titleKey: `route-title.error-${category}`,
      breadcrumbKey: null,
      telemetryName:
        segment === '404' ? 'route.preview.status.not-found' : `route.preview.status.${segment}`,
    },
  } as const)
}

function defineLayoutPreview<const Segment extends string>(
  segment: Segment,
  layoutId: string,
  scrollRestoration: 'build-static' | 'none' = 'build-static',
) {
  const name = `preview-layout-${segment}` as const
  return defineRoute({
    name,
    pathPattern: `/previews/layout/${segment}`,
    sourcePath: `apps/web/src/pages/preview-layout-${segment}.vue`,
    contentReadiness: 'route-dom',
    scrollRestoration,
    messageScope: 'console',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    workspaceIdentityPolicyId: null,
    meta: Object.freeze({
      ...consoleRouteMeta,
      ...layoutMeta(layoutId),
      keepAlive: 'never',
      titleKey: `route-title.${name}`,
      breadcrumbKey: null,
      telemetryName: `route.preview.layout.${segment}`,
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
  defineFormWorkspaceRoute('steps'),
  defineFormWorkspaceRoute('dynamic'),
  defineFormWorkspaceRoute('media'),
  defineFormWorkspaceRoute('rich-text'),
  defineFormWorkspaceRoute('validation'),
  defineFormWorkspaceRoute('extension'),
  defineFormWorkspaceRoute('controls'),
  defineFormWorkspaceRoute('lifecycle'),
  defineFormWorkspaceRoute('loading'),
  defineFormWorkspaceRoute('submission'),
  defineFormWorkspaceRoute('options'),
  defineFormWorkspaceRoute('builder'),
] as const)

export const layoutPreviewRoutes = Object.freeze([
  defineLayoutPreview('admin', 'route-layout.architecture-admin-console'),
  defineLayoutPreview('admin-footer', 'route-layout.architecture-admin-console-footer'),
  defineLayoutPreview('header', 'route-layout.header-content'),
  defineLayoutPreview('header-footer', 'route-layout.header-content-footer'),
  defineLayoutPreview('content-footer', 'route-layout.content-footer'),
  defineLayoutPreview('content', 'route-layout.content-only'),
  defineLayoutPreview('display', 'route-layout.content-only', 'none'),
  defineLayoutPreview('fixed-display', 'route-layout.content-only', 'none'),
] as const)

export const publicRouteRegistry = Object.freeze([
  defineConsoleWorkspaceRoute({
    name: 'workbench-welcome',
    pathPattern: '/',
    sourcePath: 'apps/web/src/pages/index.vue',
    meta: {
      telemetryName: 'route.workbench.welcome',
    },
  }),
  defineConsoleWorkspaceRoute({
    name: 'workbench-dashboard',
    pathPattern: '/dashboard',
    sourcePath: 'apps/web/src/pages/dashboard.vue',
    isHome: true,
    meta: {
      telemetryName: 'route.workbench.dashboard',
    },
  }),
  defineApiWorkspaceRoute('overview'),
  defineApiWorkspaceRoute('basics'),
  defineApiWorkspaceRoute('responses'),
  defineApiWorkspaceRoute('cancellation'),
  defineApiWorkspaceRoute('errors'),
  defineApiWorkspaceRoute('query'),
  defineApiWorkspaceRoute('authorization'),
  defineApiWorkspaceRoute('integration'),
  defineApiWorkspaceRoute('advanced'),
  defineWorkbenchRoute('colors'),
  defineWorkbenchRoute('sizes'),
  defineWorkbenchRoute('typography'),
  defineWorkbenchRoute('date-time'),
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
  defineComponentWorkspaceRoute('charts'),
  defineChartWorkspaceRoute('trends'),
  defineChartWorkspaceRoute('comparison'),
  defineChartWorkspaceRoute('composition'),
  defineChartWorkspaceRoute('distribution'),
  defineChartWorkspaceRoute('interaction'),
  defineChartWorkspaceRoute('live-stream'),
  defineChartWorkspaceRoute('live-ranking'),
  defineChartWorkspaceRoute('live-distribution'),
  defineChartWorkspaceRoute('linked'),
  defineChartWorkspaceRoute('tour'),
  defineChartWorkspaceRoute('stage'),
  defineComponentWorkspaceRoute('motion'),
  defineMotionWorkspaceRoute('reveal'),
  defineMotionWorkspaceRoute('spatial'),
  defineMotionWorkspaceRoute('material'),
  defineMotionWorkspaceRoute('particles'),
  defineMotionWorkspaceRoute('text'),
  defineRoute({
    ...defineMotionWorkspaceRoute('route-transitions'),
    querySchemaId: 'route-query.motion-transition',
  }),
  defineRoute({
    ...defineMotionWorkspaceRoute('route-preview'),
    pathPattern: '/components/motion/route-transitions/preview',
    querySchemaId: 'route-query.motion-transition',
  }),
  ...formWorkspaceRoutes,
  defineComponentWorkspaceRoute('table'),
  defineTableExampleRoute('table', 'appearance'),
  defineTableExampleRoute('table', 'theme'),
  defineTableExampleRoute('table', 'columns'),
  defineTableExampleRoute('table', 'selection'),
  defineTableExampleRoute('table', 'tree'),
  defineRoute({
    ...defineTableExampleRoute('table', 'query-link'),
    querySchemaId: 'route-query.table-query-link',
  }),
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
  defineTableExampleRoute('combination', 'report'),
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
  ...errorTargets.map(({ code, category }) => defineStatusPreview(code, category)),
  defineRoute({
    name: 'preview-layouts',
    pathPattern: '/previews/layout',
    sourcePath: 'apps/web/src/pages/preview-layouts.vue',
    contentReadiness: 'route-dom',
    scrollRestoration: 'build-static',
    messageScope: 'console',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    workspaceIdentityPolicyId: 'workspace-identity.route-single',
    meta: Object.freeze({
      ...consoleRouteMeta,
      titleKey: 'route-title.preview-layouts',
      breadcrumbKey: null,
      telemetryName: 'route.preview.layouts',
    }),
  }),
  ...layoutPreviewRoutes,
  defineRoute({
    name: 'login',
    pathPattern: '/login',
    sourcePath: 'apps/web/src/pages/login.vue',
    contentReadiness: 'route-dom',
    scrollRestoration: 'none',
    messageScope: 'common',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    meta: Object.freeze({
      ...consoleRouteMeta,
      ...layoutMeta('route-layout.content-only'),
      titleKey: 'route-title.login',
      breadcrumbKey: null,
      keepAlive: 'never',
      telemetryName: 'route.login',
    }),
  }),
] as const satisfies readonly RouteRegistryRecord[])

const optionalAdministrationRecords = [administrationLayout, ...administrationPages].map((route) =>
  defineRoute({
    name: route.name,
    pathPattern: route.path,
    sourcePath: `apps/web/${administrationRouteFolder}/${route.file}`,
    module: route.module,
    parentName: 'parent' in route ? route.parent : null,
    contentReadiness: 'route-dom',
    scrollRestoration: 'build-static',
    messageScope: 'console',
    paramsSchemaId: 'route-params.none',
    querySchemaId: 'route-query.none',
    capabilityStatus: 'ACTIVE',
    workspaceIdentityPolicyId: 'workspace-identity.route-single',
    meta: Object.freeze({
      ...consoleRouteMeta,
      auth: 'required',
      keepAlive: 'never',
      requiredPermissionIds: Object.freeze(['administration-view']),
      permissionRequests: Object.freeze({
        'administration-view': Object.freeze({
          kind: 'type',
          domain: administrationAccessDomain,
          resource: route.resource,
          action: 'view',
        }),
      }),
      titleKey: `route-title.${route.name}` as const,
      breadcrumbKey: null,
      telemetryName: `route.administration.${route.resource}` as const,
    }),
  } as const),
)

function defineShowcaseRoute<
  const Name extends (typeof showcasePages)[number]['name'],
  const Query extends RouteQuerySchemaId,
>(
  route: { readonly name: Name; readonly path: string; readonly file: string },
  querySchemaId: Query,
) {
  return defineRoute({
    name: route.name,
    pathPattern: route.path,
    sourcePath: `apps/web/${showcaseRouteFolder}/${route.file}`,
    showcase: true,
    contentReadiness: 'route-dom',
    scrollRestoration: 'none',
    messageScope: 'console',
    paramsSchemaId: 'route-params.none',
    querySchemaId,
    capabilityStatus: 'ACTIVE',
    workspaceIdentityPolicyId: 'workspace-identity.route-single',
    meta: Object.freeze({
      ...consoleRouteMeta,
      ...layoutMeta('route-layout.architecture-admin-console-footer'),
      keepAlive: 'never',
      ...(route.name === 'access-showcase-projects' || route.name === 'access-showcase-editor'
        ? {
            auth: 'required',
            requiredPermissionIds: Object.freeze(['showcase-project-view']),
            permissionRequests: Object.freeze({
              'showcase-project-view': showcaseProjectRequirement,
            }),
          }
        : {}),
      titleKey: `route-title.${route.name}`,
      breadcrumbKey: null,
      telemetryName: `route.${route.name}`,
    }),
  } as const)
}

const optionalShowcaseRecords = [
  defineShowcaseRoute(showcasePages[0], 'route-query.none'),
  defineShowcaseRoute(showcasePages[1], 'route-query.none'),
  defineShowcaseRoute(showcasePages[2], 'route-query.showcase-editor'),
  defineShowcaseRoute(showcasePages[3], 'route-query.none'),
] as const

export function composeRouteRegistry(
  selection: readonly AdministrationModule[],
  showcase: AccessShowcaseProfile | null = null,
) {
  if (showcase !== null && !accessShowcaseProfiles.includes(showcase))
    throw new TypeError('Unknown access showcase profile.')
  const resolved = resolveAdministrationSelection(selection)
  const records = [
    ...publicRouteRegistry,
    ...optionalAdministrationRecords.filter(({ module }) =>
      module === null ? resolved.length !== 0 : resolved.includes(module),
    ),
    ...(showcase === null ? [] : optionalShowcaseRecords),
  ]
  assertRouteComposition(records)
  return Object.freeze(records)
}

export function assertRouteComposition(records: readonly RouteRegistryRecord[]): void {
  const names = new Set<string>()
  const paths = new Set<string>()
  const sources = new Set<string>()
  for (const route of records) {
    const normalized = route.pathPattern.toLowerCase().replace(/\/$/u, '') || '/'
    if (names.has(route.name) || paths.has(normalized) || sources.has(route.sourcePath))
      throw new TypeError(`Duplicate route name, path or component: ${route.name}`)
    names.add(route.name)
    paths.add(normalized)
    sources.add(route.sourcePath)
    if (route.name.startsWith('access-showcase')) {
      const declared = optionalShowcaseRecords.find(({ name }) => name === route.name)
      if (
        declared?.pathPattern !== route.pathPattern ||
        declared.sourcePath !== route.sourcePath ||
        route.paramsSchemaId !== declared.paramsSchemaId ||
        route.querySchemaId !== declared.querySchemaId ||
        route.meta.auth !== declared.meta.auth ||
        JSON.stringify(route.meta.requiredPermissionIds) !==
          JSON.stringify(declared.meta.requiredPermissionIds) ||
        JSON.stringify(route.meta.permissionRequests) !==
          JSON.stringify(declared.meta.permissionRequests)
      )
        throw new TypeError(`Invalid showcase route declaration: ${route.name}`)
    }
    if (!route.name.startsWith('administration-')) continue
    const declared = optionalAdministrationRecords.find(({ name }) => name === route.name)
    if (
      declared?.pathPattern !== route.pathPattern ||
      declared.sourcePath !== route.sourcePath ||
      route.paramsSchemaId !== declared.paramsSchemaId ||
      route.querySchemaId !== declared.querySchemaId
    )
      throw new TypeError(`Invalid administration route declaration: ${route.name}`)
    if (
      route.meta.auth !== 'required' ||
      route.meta.requiredPermissionIds.length !== 1 ||
      route.meta.requiredPermissionIds[0] !== 'administration-view' ||
      JSON.stringify(route.meta.permissionRequests) !==
        JSON.stringify(declared.meta.permissionRequests)
    )
      throw new TypeError(`Administration route lacks its required access binding: ${route.name}`)
    if (declared.parentName !== null && !records.some(({ name }) => name === declared.parentName))
      throw new TypeError(`Administration layout missing for ${route.name}`)
  }
}

const compiledAdministration =
  typeof __PAVP_ADMINISTRATION_MODULES__ === 'undefined' ? [] : __PAVP_ADMINISTRATION_MODULES__
const compiledShowcase =
  typeof __PAVP_ACCESS_SHOWCASE__ === 'undefined' ? null : __PAVP_ACCESS_SHOWCASE__
export const routeRegistry = composeRouteRegistry(compiledAdministration, compiledShowcase)

export function resolveHomeRoute<
  const R extends Pick<RouteRegistryRecord, 'name' | 'pathPattern' | 'isHome'>,
>(records: readonly R[]) {
  const marked = records.filter(
    (record): record is Extract<R, { readonly isHome: true }> => record.isHome === true,
  )
  if (marked.length > 1) {
    throw new TypeError(
      `Only one route may set isHome: ${marked.map(({ name }) => name).join(', ')}`,
    )
  }

  const home =
    marked[0] ??
    records.find(
      (record): record is Extract<R, { readonly pathPattern: '/' }> => record.pathPattern === '/',
    )
  if (home === undefined) throw new TypeError('Set isHome on a route or register the root route.')
  return home
}

const homeRoute = resolveHomeRoute(publicRouteRegistry)

function validateHomeRoute(record: RouteRegistryRecord): void {
  if (
    record.workspaceIdentityPolicyId !== 'workspace-identity.route-single' ||
    !routeParamsSchema(record.paramsSchemaId).safeParse({}).success ||
    !routeQuerySchema(record.querySchemaId).safeParse({}).success
  ) {
    throw new TypeError(
      `The home route must be a workspace without required URL input: ${record.name}`,
    )
  }
}

validateHomeRoute(homeRoute)
export const homeRouteName = homeRoute.name

export type RouteName = (typeof routeRegistry)[number]['name']
export function isDisplayLayoutPreview(name: string): boolean {
  return name === 'preview-layout-display' || name === 'preview-layout-fixed-display'
}

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

export function getRouteMessageKey(
  record: (typeof routeRegistry)[number],
): ConsoleCommonMessageKey {
  if ('statusMessageKey' in record) return record.statusMessageKey
  return record.messageScope === 'common'
    ? `route-message.${record.name}`
    : `route-message.${record.name}-summary`
}

export const routeMessageRegistry = Object.freeze(
  routeRegistry.map((record) => {
    const key = getRouteMessageKey(record)
    return Object.freeze({ routeName: record.name, key, text: getDefaultConsoleMessage(key) })
  }),
)

export const telemetryNameRegistry = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ routeRegistry.map((record) => record.meta.telemetryName),
)

export const errorRouteRegistry = errorTargets satisfies readonly {
  readonly code: string
  readonly category: string
  readonly routeName: RouteName
}[]

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

type ConsoleNavigationName = Exclude<
  Extract<(typeof routeRegistry)[number], { readonly paramsSchemaId: 'route-params.none' }>['name'],
  Extract<
    (typeof routeRegistry)[number],
    { readonly querySchemaId: 'route-query.showcase-editor' }
  >['name']
>

export interface ConsoleNavigationItem {
  readonly iconClass: string
  readonly labelKey?: ConsoleCommonMessageKey
  readonly destination: {
    [Name in ConsoleNavigationName]: { readonly name: Name }
  }[ConsoleNavigationName]
}

export interface ConsoleNavigationGroup {
  readonly id: string
  readonly labelKey: ConsoleCommonMessageKey
  readonly items: readonly (ConsoleNavigationItem | ConsoleNavigationGroup)[]
}

function defineNavigationItem<
  const Name extends ConsoleNavigationItem['destination']['name'],
  const Icon extends string,
>(name: Name, iconClass: Icon, labelKey?: ConsoleCommonMessageKey) {
  return Object.freeze({
    iconClass,
    destination: Object.freeze({ name }),
    ...(labelKey === undefined ? {} : { labelKey }),
  })
}

const publicConsoleNavigationRegistry = Object.freeze([
  Object.freeze({
    id: 'workbench',
    labelKey: 'navigation.workbench',
    items: Object.freeze([
      defineNavigationItem('workbench-welcome', 'i-lucide-map'),
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
      defineNavigationItem('workbench-date-time', 'i-lucide-clock-3'),
      defineNavigationItem('workbench-motion', 'i-lucide-workflow'),
    ]),
  }),
  Object.freeze({
    id: 'api',
    labelKey: 'navigation.api',
    items: Object.freeze([
      defineNavigationItem('api-overview', 'i-lucide-workflow'),
      defineNavigationItem('api-basics', 'i-lucide-workflow'),
      defineNavigationItem('api-responses', 'i-lucide-workflow'),
      defineNavigationItem('api-cancellation', 'i-lucide-workflow'),
      defineNavigationItem('api-errors', 'i-lucide-workflow'),
      defineNavigationItem('api-query', 'i-lucide-workflow'),
      defineNavigationItem('api-authorization', 'i-lucide-workflow'),
      defineNavigationItem('api-integration', 'i-lucide-panels-top-left'),
      defineNavigationItem('api-advanced', 'i-lucide-workflow'),
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
        id: 'charts',
        labelKey: 'navigation.charts',
        items: Object.freeze([
          defineNavigationItem('component-charts', 'i-lucide-database'),
          defineNavigationItem('component-chart-trends', 'i-lucide-database'),
          defineNavigationItem('component-chart-comparison', 'i-lucide-database'),
          defineNavigationItem('component-chart-composition', 'i-lucide-database'),
          defineNavigationItem('component-chart-distribution', 'i-lucide-database'),
          defineNavigationItem('component-chart-interaction', 'i-lucide-database'),
          defineNavigationItem('component-chart-live-stream', 'i-lucide-database'),
          defineNavigationItem('component-chart-live-ranking', 'i-lucide-database'),
          defineNavigationItem('component-chart-live-distribution', 'i-lucide-database'),
          defineNavigationItem('component-chart-linked', 'i-lucide-database'),
          defineNavigationItem('component-chart-tour', 'i-lucide-database'),
          defineNavigationItem('component-chart-stage', 'i-lucide-database'),
        ]),
      }),
      Object.freeze({
        id: 'cinematic-motion',
        labelKey: 'navigation.cinematic-motion',
        items: Object.freeze([
          defineNavigationItem('component-motion', 'i-lucide-sparkles'),
          defineNavigationItem('component-motion-reveal', 'i-lucide-sparkles'),
          defineNavigationItem('component-motion-spatial', 'i-lucide-sparkles'),
          defineNavigationItem('component-motion-material', 'i-lucide-sparkles'),
          defineNavigationItem('component-motion-particles', 'i-lucide-sparkles'),
          defineNavigationItem('component-motion-text', 'i-lucide-sparkles'),
          defineNavigationItem('component-motion-route-transitions', 'i-lucide-sparkles'),
        ]),
      }),
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
          defineNavigationItem('component-table-tree', 'i-lucide-list-tree'),
          defineNavigationItem('component-table-query-link', 'i-lucide-link'),
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
          defineNavigationItem('component-combination-report', 'i-lucide-panels-top-left'),
        ]),
      }),
    ]),
  }),
  Object.freeze({
    id: 'architecture-previews',
    labelKey: 'navigation.architecturePreviews',
    items: Object.freeze([
      Object.freeze({
        id: 'status-previews',
        labelKey: 'navigation.statusPreviews',
        items: Object.freeze([
          defineNavigationItem(
            'preview-status-400',
            'i-lucide-file-warning',
            'navigation.preview400',
          ),
          defineNavigationItem(
            'preview-status-401',
            'i-lucide-file-warning',
            'navigation.preview401',
          ),
          defineNavigationItem(
            'preview-status-403',
            'i-lucide-file-warning',
            'navigation.preview403',
          ),
          defineNavigationItem(
            'preview-status-404',
            'i-lucide-file-warning',
            'navigation.preview404',
          ),
          defineNavigationItem(
            'preview-status-500',
            'i-lucide-file-warning',
            'navigation.preview500',
          ),
          defineNavigationItem('preview-status-offline', 'i-lucide-file-warning'),
          defineNavigationItem('preview-status-maintenance', 'i-lucide-file-warning'),
        ]),
      }),
      defineNavigationItem(
        'preview-layouts',
        'i-lucide-panels-top-left',
        'navigation.layoutPreviews',
      ),
    ]),
  }),
] as const satisfies readonly ConsoleNavigationGroup[])

const administrationNavigation = routeRegistry.flatMap((record) =>
  'module' in record && record.module !== null
    ? [
        Object.freeze({
          iconClass: 'i-lucide-layout-dashboard',
          destination: Object.freeze({ name: record.name }),
        }),
      ]
    : [],
)
export const consoleNavigationRegistry = Object.freeze([
  ...publicConsoleNavigationRegistry,
  ...(compiledShowcase === null
    ? []
    : [
        {
          id: 'access-showcase' as const,
          labelKey: 'route-title.access-showcase' as const,
          items: [
            defineNavigationItem('access-showcase', 'i-lucide-layout-dashboard'),
            defineNavigationItem('access-showcase-projects', 'i-lucide-workflow'),
          ],
        },
      ]),
  ...(administrationNavigation.length === 0
    ? []
    : [
        Object.freeze({
          id: 'administration' as const,
          labelKey: 'route-title.administration-shell' as const,
          items: Object.freeze(administrationNavigation),
        }),
      ]),
] as const)

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
export const consoleWorkspaceNavigationItems = Object.freeze(
  consoleNavigationItems.filter(
    (item) => getRouteRecord(item.destination.name).workspaceIdentityPolicyId !== null,
  ),
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
