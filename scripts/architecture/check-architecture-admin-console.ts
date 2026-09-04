import { access, readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import ts from 'typescript'
import { parse as parseYaml } from 'yaml'

import { projectConfig } from '../../project.config'
import {
  PublicRoleRegistry,
  type LayoutContainerVariantId,
  type PublicRoleUnoCssProjection,
  type UnoCssClassProjection,
  type UnoCssContainerBoundaryContribution,
  type UnoCssContainerVariantProjection,
} from '../../packages/design-system/src/build/public-role-registry'
import { validateTokens } from '../../packages/design-system/src/build/build'
import { formatRuntimeCss } from '../../packages/design-system/src/build/formats/css'
import type { LayoutTokenId } from '../../packages/design-system/src/build/formats/layout'
import { layoutRegistry } from '../../packages/design-system/src/generated/layout-registry'
import tokenManifest from '../../packages/design-system/src/generated/tokens.manifest.json' with { type: 'json' }
import { designSystemConsoleProjection } from '../../packages/design-system/src/console/design-system-console-projection'
import { responsiveLayoutConsoleProjection } from '../../packages/ui/src/console/responsive-layout-console-projection'
import { uiSystemConsoleProjection } from '../../packages/ui/src/console/ui-system-console-projection'
import {
  adminShellLayoutPolicyRegistry,
  type LayoutProfileThresholdPolicyRecord,
  type MinimumTargetPolicyRecord,
  type SafeAreaPolicyRecord,
} from '../../packages/ui/src/internal/layout/admin-shell-layout-policy-registry'
import {
  adminShellRegionRegistry,
  type AdminShellRegionRegistryRecord,
} from '../../packages/ui/src/internal/layout/admin-shell-region-registry'
import { uiPublicComponentRegistry } from '../../packages/ui/src/registry/ui-public-component-registry'
import {
  runtimeKernelConsoleProjection,
  type RuntimeKernelConsoleErrorRecordCounts,
} from '../../apps/web/src/app/bootstrap/runtime-kernel-console-projection'
import {
  consoleNavigationRegistry,
  errorRouteRegistry,
  routeBreadcrumbRegistry,
  routeRegistry,
  routeTitleRegistry,
  type LayoutPresetId,
  type RouteBreadcrumbKey,
} from '../../apps/web/src/app/router/route-registry'
import {
  routerConsoleProjection,
  type RouterConsoleRouteRecord,
} from '../../apps/web/src/app/router/router-console-projection'
import {
  storageConsoleProjection,
  type StorageConsoleRecord,
} from '../../apps/web/src/app/storage/storage-console-projection'
import {
  capabilityManifest,
  type CapabilityImplementationStatus,
  type CapabilityManifestRecord,
  type CapabilityPresentationMode,
} from '../../apps/web/src/generated/capability-manifest'
import {
  engineeringManifest,
  type EngineeringBundleBudgetRecord,
  type EngineeringCoordinates,
} from '../../apps/web/src/generated/engineering-manifest'
import { validateCapabilityManifest } from './check-capability-manifest'
import { validateEngineeringManifest } from './check-engineering-manifest'
import {
  expectedRouterPresentationCommitNegativeProbeCount,
  expectedRouteTransitionFullPaceNegativeProbeCount,
  expectedRouteTransitionPresetSelectionNegativeProbeCount,
  expectedRouteTransitionSourceNegativeProbeCount,
  expectedRouteTransitionSourceProofCount,
  expectedRouteTransitionStylelintPolicyNegativeProbeCount,
  expectedRouteTransitionWorkspaceDefaultNegativeProbeCount,
  validateRouteTransitionSourceGovernance,
} from './check-router'
import { validateUiPublicComponents } from './check-ui-public-components'

type JsonObject = Record<string, unknown>

interface MaterialGateSnapshot {
  readonly appStylesSource: string
  readonly applicationImportSource: string
  readonly nonAdapterUiSource: string
  readonly manifestAndLockSource: string
  readonly pageVisualSource: string
  readonly appearancePageSource: string
  readonly appearanceThemeProjectionSource: string
  readonly appearanceMutationSource: string
  readonly appTemplateSource: string
  readonly consoleFrameSource: string
  readonly factImportViolation: boolean
  readonly pageStorageSource: string
  readonly competingAppearanceEnvironmentSource: string
  readonly capabilityPageTemplateSource: string
  readonly themeAdapterSource: string
  readonly naiveProviderSource: string
  readonly uiProviderSource: string
  readonly shellSource: string
  readonly adminTokenSource: string
  readonly routeRegistrySource: string
  readonly generatedManifestsEqual: boolean
  readonly generatedTokensCssSource: string
  readonly expectedTokensCssSource: string
  readonly routeCount: number
  readonly publicComponentExports: readonly string[]
  readonly registeredPublicComponents: readonly {
    readonly exportName: string
    readonly consumerCount: number
  }[]
}

interface ArchitectureAdminConsoleNegativeProbeResult {
  readonly id: string
  readonly expectedFailureCode: string
  readonly passed: boolean
}

interface NavigationReworkSourceSnapshot {
  readonly applicationSource: string
  readonly layoutAdapterSource: string
  readonly menuAdapterSource: string
  readonly providerSource: string
  readonly runtimeContextSource: string
  readonly shellSource: string
  readonly themeSource: string
}

interface AdminNavigationNativeSourceSnapshot {
  readonly adminNavigationMotionAdapterPresent: boolean
  readonly appSource: string
  readonly appStylesSource: string
  readonly applicationSource: string
  readonly architectureSource: string
  readonly appearancePageSource: string
  readonly buttonAdapterSource: string
  readonly checkBundleSource: string
  readonly consoleFrameSource: string
  readonly engineeringManifestSource: string
  readonly iconAdapterSource: string
  readonly lockSource: string
  readonly motionDomMaxSource: string
  readonly motionRuntimeSource: string
  readonly motionSelectionLensSource: string
  readonly naiveDropdownSource: string
  readonly naiveMenuChildSource: string
  readonly naivePopoverSource: string
  readonly naiveSubmenuSource: string
  readonly nonAdapterSource: string
  readonly outsideMotionPrivateSource: string
  readonly projectConfigSource: string
  readonly providerSource: string
  readonly publicComponentExports: readonly string[]
  readonly publicUiRootSource: string
  readonly routeCount: number
  readonly runtimeKernelStepCount: number
  readonly activeProviderIds: readonly string[]
  readonly storageRecordCount: number
  readonly shellSource: string
  readonly themeSource: string
  readonly tooltipAdapterSource: string
  readonly uiManifestSource: string
  readonly workspaceSource: string
}

interface NavigationBudgetGateSnapshot {
  readonly architectureSource: string
  readonly checkBundleSource: string
  readonly engineeringManifestSource: string
  readonly navigationSource: string
  readonly projectConfigSource: string
  readonly routeCount: number
}

interface VueSfcStyleBlock {
  readonly content: string
  readonly lang?: string
  readonly scoped?: boolean
}

interface VueTemplateLocation {
  readonly source: string
}

interface VueTemplateSimpleExpression {
  readonly content: string
}

interface VueTemplateAttribute {
  readonly loc: VueTemplateLocation
  readonly name: string
  readonly type: 6
  readonly value?: VueTemplateSimpleExpression
}

interface VueTemplateDirective {
  readonly arg?: VueTemplateSimpleExpression
  readonly exp?: VueTemplateSimpleExpression
  readonly loc: VueTemplateLocation
  readonly modifiers?: readonly unknown[]
  readonly name: string
  readonly type: 7
}

type VueTemplateProperty = VueTemplateAttribute | VueTemplateDirective

interface VueTemplateNode {
  readonly children?: readonly VueTemplateNode[]
  readonly loc?: VueTemplateLocation
  readonly props?: readonly VueTemplateProperty[]
  readonly tag?: string
  readonly type: number
}

interface VueTemplateBlock {
  readonly ast?: VueTemplateNode
  readonly content: string
}

interface VueSfcCompiler {
  readonly compileStyle: (options: {
    readonly filename: string
    readonly id: string
    readonly preprocessLang?: string
    readonly scoped: boolean
    readonly source: string
  }) => {
    readonly code: string
    readonly errors: readonly unknown[]
  }
  readonly parse: (
    source: string,
    options: Readonly<{ filename: string }>,
  ) => {
    readonly descriptor: {
      readonly styles: readonly VueSfcStyleBlock[]
      readonly template?: VueTemplateBlock | null
    }
    readonly errors: readonly unknown[]
  }
}

interface CompiledSfcStyleBlock {
  readonly code: string
  readonly rules: readonly CssRuleBlock[]
  readonly scoped: boolean
  readonly source: string
}

interface CompiledSfcStyles {
  readonly blocks: readonly CompiledSfcStyleBlock[]
  readonly errors: readonly unknown[]
}

const rootDirectory = process.cwd()
const expectedNaiveUiVersion = '2.45.2'
const expectedMotionVueVersion = '2.4.0'
const expectedVueUseCoreVersion = '14.4.0'
const expectedArchitectureAdminConsoleNegativeProbeCount = 59
const expectedMotionGeometryNegativeProbeCount = 12
const expectedRuntime002NegativeProbeCount = 10
const expectedRuntime005NegativeProbeCount = 10
const expectedAcceptanceClosureNegativeProbeCount = 5
const expectedRuntime003AdmissionNegativeProbeCount = 5
const expectedRuntime003AcceptanceClosureNegativeProbeCount = 6
const expectedAdminNavigationGsapAdmissionNegativeProbeCount = 12
const expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount = 12
const expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount = 10
const expectedAdminNavigationNativeAdmissionNegativeProbeCount = 12
const expectedAdminNavigationNativeAcceptanceClosureNegativeProbeCount = 5
const expectedAdminNavigationNativeSourceInvariantCount = 24
const expectedAdminNavigationNativeSourceNegativeProbeCount = 24
const expectedAdminNavigationExpansionMotionInvariantCount = 20
const expectedAdminNavigationExpansionMotionNegativeProbeCount = 8
const expectedAdminNavigationCollapsedPopupSourceInvariantCount = 15
const expectedAdminNavigationCollapsedPopupSourceNegativeProbeCount = 8
const expectedAdminNavigationHeaderPlacementSourceInvariantCount = 13
const expectedAdminNavigationHeaderPlacementSourceNegativeProbeCount = 5
const expectedAdminNavigationNaiveActionsMotionInvariantCount = 24
const expectedAdminNavigationNaiveActionsMotionNegativeProbeCount = 10
const expectedAdminNavigationMotionVueSelectionLensAdmissionNegativeProbeCount = 12
const expectedAdminNavigationMotionVueSelectionLensSourceInvariantCount = 22
const expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount = 16
const expectedAdminNavigationReducedCrossfadeNegativeProbeCount = 8
const expectedRouteTransitionAdmissionNegativeProbeCount = 12
const expectedNavigationReworkSourceInvariantCount = 59
const expectedNavigationReworkSourceNegativeProbeCount = 23
const expectedNavigationBudgetNegativeProbeCount = 6
const expectedRuntime003ActiveMirrorCount = 13
const expectedRuntime003SourceNegativeProbeCount = 10
const acceptedDarkActionWorkPackage = 'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT'
const darkActionAdmissionAmendment = 'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT'
const darkActionImplementationCommit = '5673236868737f42f3470307b5f5d6c8d4e8639e'
const darkActionAcceptanceStatement = '验收通过'
const navigationReworkWorkPackage = 'PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK'
const navigationReworkAdmissionAmendment =
  'PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_ADMISSION_AMENDMENT'
const adminNavigationGsapWorkPackage =
  'PAVP_ADMIN_NAVIGATION_INSET_ROUTE_SELECTION_AND_BOTTOM_COLLAPSE_DOCK_GSAP_REWORK'
const adminNavigationGsapAdmissionAmendment =
  'PAVP_ADMIN_NAVIGATION_INSET_ROUTE_SELECTION_AND_BOTTOM_COLLAPSE_DOCK_GSAP_ADMISSION_AMENDMENT'
const expectedAdminNavigationGsapActiveMirrorCount = 13
const adminNavigationThemeReflowWorkPackage =
  'PAVP_ADMIN_NAVIGATION_THEME_TINTED_SELECTION_AND_REFLOW_STABILITY_REWORK'
const adminNavigationThemeReflowAdmissionAmendment =
  'PAVP_ADMIN_NAVIGATION_THEME_TINTED_SELECTION_AND_REFLOW_STABILITY_ADMISSION_AMENDMENT'
const expectedAdminNavigationThemeReflowActiveMirrorCount = 13
const adminNavigationHighlightRevealWorkPackage =
  'PAVP_ADMIN_NAVIGATION_VISIBLE_HOVER_AND_UNIFIED_SELECTED_REVEAL_REWORK'
const adminNavigationHighlightRevealAdmissionAmendment =
  'PAVP_ADMIN_NAVIGATION_VISIBLE_HOVER_AND_UNIFIED_SELECTED_REVEAL_ADMISSION_AMENDMENT'
const expectedAdminNavigationHighlightRevealActiveMirrorCount = 13
const adminNavigationNativeWorkPackage = 'PAVP_ADMIN_NAVIGATION_NATIVE_NAIVE_SIMPLIFICATION'
const adminNavigationNativeAdmissionAmendment =
  'PAVP_ADMIN_NAVIGATION_NATIVE_NAIVE_SIMPLIFICATION_ADMISSION_AMENDMENT'
const expectedAdminNavigationNativeActiveMirrorCount = 13
const adminNavigationMotionVueSelectionLensWorkPackage =
  'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SHARED_SELECTION_LENS'
const adminNavigationMotionVueSelectionLensAdmissionAmendment =
  'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SHARED_SELECTION_LENS_ADMISSION_AMENDMENT'
const expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount = 13
const adminNavigationMotionVueSelectionLensImplementationCommit =
  'b6efbb608b309f601217a2765150bd9ec217cf78'
const adminNavigationMotionVueSelectionLensAcceptanceStatement = '效果还可以 可以接受'
const routeTransitionWorkPackage = 'PAVP_ROUTE_TRANSITION_ROUTING_CAPABILITY'
const routeTransitionAdmissionAmendment =
  'PAVP_ROUTE_TRANSITION_ROUTING_CAPABILITY_ADMISSION_AMENDMENT'
const expectedRouteTransitionActiveMirrorCount = 13
const adminNavigationNativeImplementationCommit = '70cc43995512994b4155df04ddb7896047d8ad3a'
const adminNavigationNativeAcceptanceStatement = '没问题 通过'
const expectedAdminNavigationNativeImplementationPaths = [
  'ARCHITECTURE.md',
  'apps/web/src/generated/engineering-manifest.ts',
  'packages/ui/package.json',
  'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
  'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
  'packages/ui/src/components/UiAdminShell.vue',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'project.config.ts',
  'scripts/architecture/check-architecture-admin-console.ts',
  'scripts/architecture/check-boundaries.ts',
  'scripts/architecture/check-ui-public-components.ts',
  'scripts/architecture/generate-engineering-manifest.ts',
  'scripts/verify/check-bundle.ts',
  'scripts/verify/check-project-config.ts',
  'packages/ui/src/adapters/gsap/admin-navigation-motion.ts',
  'packages/ui/src/adapters/naive/naive-icon.ts',
  'packages/ui/src/adapters/naive/naive-tooltip.ts',
] as const
const expectedAdminNavigationNativeImplementationPathInventory =
  expectedAdminNavigationNativeImplementationPaths.join(';')
const currentInitialJavaScriptBudgetBytes = 224 * 1024
const expectedInitialJavaScriptBudgetBytes = projectConfig.bundleBudgets.initialJavaScriptGzipBytes
const expectedMinimumInitialJavaScriptHeadroomBytes = 8 * 1024
const expectedBundleBudgetAlignmentBytes = 8 * 1024
const historicalAdminNavigationGsapCheckBundleSha256 =
  '30e618541feb287a82a88076045d232091fb3eabaeb499fb2aae8da3fb1fd372'
const runtime003WorkItem = 'PAVP-RUNTIME-003'
const runtime003AdmissionAmendment = 'PAVP_RUNTIME_003_ADMISSION_AMENDMENT'
const runtime003AcceptanceStatement = '那没问题'
const runtime003ImplementationCommit = '3fa078ab75322a17e5e4514d0805f1efea06981b'
const shellSfcPath = 'packages/ui/src/components/UiAdminShell.vue'
const shellSfcScopeId = 'data-v-pavp-admin-shell'
const requireFromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
const requireFromUi = createRequire(resolve(rootDirectory, 'packages/ui/package.json'))
const vueSfcCompiler = requireFromWeb('vue/compiler-sfc') as VueSfcCompiler
const expectedNaiveUiIntegrity =
  'sha512-KshetbFOX/uZ/Pe+60hJoUAo47x5QO1JpZaUVPQCQkNhFfJ7hKsX55A8oMFQHccEpLuQUMPkJ41cX94R4nWUjg=='
const expectedMotionVueIntegrity =
  'sha512-kRDGMAZk3nvdjEO36Wo6pezSEIStGXGhVFiwo1QkUDsUg8mB5igjYPXyece8wtu2DrHhmFfA6Y1nOz07+5QH4A=='
const expectedVueUseCoreIntegrity =
  'sha512-X4WHz1HlCzCBoYXesUkifzzWBAcZgXG8Fi5iNPQg/epdzOB3gu8Fawj3hvuwYR1nGcXGnvxwYYcUC/71++svtQ=='
const expectedGsapIntegrity =
  'sha512-dMW4CWBTUK1AEEDeZc1g4xpPGIrSf9fJF960qbTZmN/QwZIWY5wgliS6JWl9/25fpTGJrMRtSjGtOmPnfjZB+A=='
const expectedNavigationIconClasses = [
  'i-lucide-layout-dashboard',
  'i-lucide-palette',
  'i-lucide-swatch-book',
  'i-lucide-cpu',
  'i-lucide-route',
  'i-lucide-database',
  'i-lucide-component',
  'i-lucide-panels-top-left',
  'i-lucide-workflow',
  'i-lucide-map',
] as const
const styledFrameworkPackages = [
  'ant-design-vue',
  'arco-design-vue',
  'element-plus',
  'primevue',
  'quasar',
  'reka-ui',
  'shadcn-vue',
  'tailwindcss',
  'vuetify',
] as const
const productRouteContract = [
  ['console-overview', '/', 'apps/web/src/pages/index.vue', '总览'],
  ['appearance-management', '/appearance', 'apps/web/src/pages/appearance.vue', '主题与外观'],
  ['design-token-inspector', '/design-tokens', 'apps/web/src/pages/design-tokens.vue', '设计令牌'],
  [
    'runtime-kernel-inspector',
    '/runtime-kernel',
    'apps/web/src/pages/runtime-kernel.vue',
    '运行时内核',
  ],
  ['router-governance-inspector', '/router', 'apps/web/src/pages/router.vue', '路由治理'],
  ['storage-persistence-inspector', '/storage', 'apps/web/src/pages/storage.vue', '存储与持久化'],
  ['ui-system-inspector', '/ui-system', 'apps/web/src/pages/ui-system.vue', 'UI 组件'],
  [
    'responsive-layout-inspector',
    '/responsive-layout',
    'apps/web/src/pages/responsive-layout.vue',
    '响应式布局',
  ],
  [
    'engineering-quality-inspector',
    '/engineering',
    'apps/web/src/pages/engineering.vue',
    '工程与质量',
  ],
  ['capability-roadmap', '/capabilities', 'apps/web/src/pages/capabilities.vue', '能力路线图'],
] as const
const expectedLayoutRecords = [
  [
    'layout.admin.content.minimum-inline-size',
    'content-size',
    '20rem',
    '--ui-layout-admin-content-minimum-inline-size',
  ],
  [
    'layout.admin.drawer.maximum-inline-size',
    'shell-size',
    '20rem',
    '--ui-layout-admin-drawer-maximum-inline-size',
  ],
  ['layout.admin.header.block-size', 'shell-size', '3.5rem', '--ui-layout-admin-header-block-size'],
  [
    'layout.admin.sidebar.expanded-inline-size',
    'shell-size',
    '16rem',
    '--ui-layout-admin-sidebar-expanded-inline-size',
  ],
  [
    'layout.admin.sidebar.rail-inline-size',
    'shell-size',
    '4rem',
    '--ui-layout-admin-sidebar-rail-inline-size',
  ],
  [
    'layout.profile.regular.min-inline-size',
    'profile-threshold',
    '48rem',
    '--ui-layout-profile-regular-min-inline-size',
  ],
  [
    'layout.profile.wide.min-inline-size',
    'profile-threshold',
    '80rem',
    '--ui-layout-profile-wide-min-inline-size',
  ],
  [
    'layout.target.enhanced.minimum-block-size',
    'minimum-target',
    '44px',
    '--ui-layout-target-enhanced-minimum-block-size',
  ],
  [
    'layout.target.enhanced.minimum-inline-size',
    'minimum-target',
    '44px',
    '--ui-layout-target-enhanced-minimum-inline-size',
  ],
] as const satisfies readonly (readonly [LayoutTokenId, string, string, string])[]
const expectedAdminTokens = [
  {
    name: 'admin.ambient.canvas',
    type: 'color',
    value: '{color.surface.page}',
    cssVariable: '--ui-admin-ambient-canvas',
    resolvedValue: 'var(--ui-color-surface-page)',
  },
  {
    name: 'admin.ambient.grid',
    type: 'color',
    value: '{color.border.default}',
    cssVariable: '--ui-admin-ambient-grid',
    resolvedValue: 'var(--ui-color-border-default)',
  },
  {
    name: 'admin.ambient.light-accent',
    type: 'color',
    value: '{color.focus.ring}',
    cssVariable: '--ui-admin-ambient-light-accent',
    resolvedValue: 'var(--ui-color-focus-ring)',
  },
  {
    name: 'admin.ambient.light-primary',
    type: 'color',
    value: '{color.control.primary}',
    cssVariable: '--ui-admin-ambient-light-primary',
    resolvedValue: 'var(--ui-color-control-primary)',
  },
  {
    name: 'admin.ambient.light-warm',
    type: 'color',
    value: '{color.text.secondary}',
    cssVariable: '--ui-admin-ambient-light-warm',
    resolvedValue: 'var(--ui-color-text-secondary)',
  },
  {
    name: 'admin.border.action',
    type: 'border',
    value: {
      color: '{color.control.primary}',
      width: '{admin.border.width}',
      style: 'solid',
    },
    cssVariable: '--ui-admin-border-action',
    resolvedValue: 'var(--ui-admin-border-width) solid var(--ui-color-control-primary)',
  },
  {
    name: 'admin.border.control',
    type: 'border',
    value: {
      color: '{color.border.default}',
      width: '{admin.border.width}',
      style: 'solid',
    },
    cssVariable: '--ui-admin-border-control',
    resolvedValue: 'var(--ui-admin-border-width) solid var(--ui-color-border-default)',
  },
  {
    name: 'admin.border.focus',
    type: 'border',
    value: {
      color: '{color.focus.ring}',
      width: '{admin.border.width}',
      style: 'solid',
    },
    cssVariable: '--ui-admin-border-focus',
    resolvedValue: 'var(--ui-admin-border-width) solid var(--ui-color-focus-ring)',
  },
  {
    name: 'admin.border.subtle',
    type: 'color',
    value: '{color.border.default}',
    cssVariable: '--ui-admin-border-subtle',
    resolvedValue: 'var(--ui-color-border-default)',
  },
  {
    name: 'admin.border.width',
    type: 'dimension',
    value: { value: 1, unit: 'px' },
    cssVariable: '--ui-admin-border-width',
    resolvedValue: '1px',
  },
  {
    name: 'admin.focus.outline-offset',
    type: 'dimension',
    value: '{admin.focus.width}',
    cssVariable: '--ui-admin-focus-outline-offset',
    resolvedValue: 'var(--ui-admin-focus-width)',
  },
  {
    name: 'admin.focus.width',
    type: 'dimension',
    value: { value: 2, unit: 'px' },
    cssVariable: '--ui-admin-focus-width',
    resolvedValue: '2px',
  },
  {
    name: 'admin.navigation.hover',
    type: 'color',
    value: '{color.surface.panel}',
    cssVariable: '--ui-admin-navigation-hover',
    resolvedValue: 'var(--ui-color-surface-panel)',
  },
  {
    name: 'admin.navigation.selected',
    type: 'color',
    value: '{color.control.primary}',
    cssVariable: '--ui-admin-navigation-selected',
    resolvedValue: 'var(--ui-color-control-primary)',
  },
  {
    name: 'admin.optical.backdrop-blur',
    type: 'dimension',
    value: '{dimension.space.3}',
    cssVariable: '--ui-admin-optical-backdrop-blur',
    resolvedValue: '0.75rem',
  },
  {
    name: 'admin.shadow.chrome',
    type: 'shadow',
    value: '{interaction.shadow.panel}',
    cssVariable: '--ui-admin-shadow-chrome',
    resolvedValue: 'var(--ui-shadow-panel)',
  },
  {
    name: 'admin.shadow.control',
    type: 'shadow',
    value: {
      color: '{color.border.default}',
      offsetX: '{dimension.space.0}',
      offsetY: '{dimension.space.0}',
      blur: '{dimension.space.0}',
      spread: '{admin.border.width}',
      inset: true,
    },
    cssVariable: '--ui-admin-shadow-control',
    resolvedValue:
      'inset 0rem 0rem 0rem var(--ui-admin-border-width) var(--ui-color-border-default)',
  },
  {
    name: 'admin.shadow.control-hover',
    type: 'shadow',
    value: {
      color: '{color.control.primary}',
      offsetX: '{dimension.space.0}',
      offsetY: '{dimension.space.0}',
      blur: '{dimension.space.0}',
      spread: '{admin.border.width}',
      inset: true,
    },
    cssVariable: '--ui-admin-shadow-control-hover',
    resolvedValue:
      'inset 0rem 0rem 0rem var(--ui-admin-border-width) var(--ui-color-control-primary)',
  },
  {
    name: 'admin.shadow.focus-ring',
    type: 'shadow',
    value: [
      {
        color: '{color.focus.ring}',
        offsetX: '{dimension.space.0}',
        offsetY: '{dimension.space.0}',
        blur: '{dimension.space.0}',
        spread: '{admin.border.width}',
        inset: true,
      },
      {
        color: '{color.focus.ring}',
        offsetX: '{dimension.space.0}',
        offsetY: '{dimension.space.0}',
        blur: '{dimension.space.0}',
        spread: '{admin.focus.width}',
      },
    ],
    cssVariable: '--ui-admin-shadow-focus-ring',
    resolvedValue:
      'inset 0rem 0rem 0rem var(--ui-admin-border-width) var(--ui-color-focus-ring), 0rem 0rem 0rem var(--ui-admin-focus-width) var(--ui-color-focus-ring)',
  },
  {
    name: 'admin.shadow.overlay',
    type: 'shadow',
    value: '{interaction.shadow.panel}',
    cssVariable: '--ui-admin-shadow-overlay',
    resolvedValue: 'var(--ui-shadow-panel)',
  },
  {
    name: 'admin.state.disabled-opacity',
    type: 'number',
    value: 0.5,
    cssVariable: '--ui-admin-state-disabled-opacity',
    resolvedValue: '0.5',
  },
  {
    name: 'admin.surface.content',
    type: 'color',
    value: '{color.surface.panel}',
    cssVariable: '--ui-admin-surface-content',
    resolvedValue: 'var(--ui-color-surface-panel)',
  },
  {
    name: 'admin.surface.settings',
    type: 'color',
    value: '{color.surface.panel}',
    cssVariable: '--ui-admin-surface-settings',
    resolvedValue: 'var(--ui-color-surface-panel)',
  },
] as const
const pageFactImportContract = new Map<string, readonly string[]>([
  [
    'apps/web/src/pages/index.vue',
    [
      '@platform/ui',
      'vue',
      '../app/appearance/appearance-read-boundary',
      '../app/console/overview-projection',
    ],
  ],
  [
    'apps/web/src/pages/appearance.vue',
    [
      '@platform/design-system',
      '@platform/ui',
      'vue',
      '../app/appearance/appearance-mutation-boundary',
      '../app/appearance/appearance-read-boundary',
    ],
  ],
  ['apps/web/src/pages/design-tokens.vue', ['@platform/design-system', '@platform/ui']],
  [
    'apps/web/src/pages/runtime-kernel.vue',
    ['@platform/ui', '../app/bootstrap/runtime-kernel-console-projection'],
  ],
  ['apps/web/src/pages/router.vue', ['@platform/ui', '../app/router/router-console-projection']],
  ['apps/web/src/pages/storage.vue', ['@platform/ui', '../app/storage/storage-console-projection']],
  ['apps/web/src/pages/ui-system.vue', ['@platform/ui']],
  ['apps/web/src/pages/responsive-layout.vue', ['@platform/ui']],
  ['apps/web/src/pages/engineering.vue', ['@platform/ui', '../generated/engineering-manifest']],
  ['apps/web/src/pages/capabilities.vue', ['@platform/ui', '../generated/capability-manifest']],
])
const naiveCommonParserSensitiveColorProperties: ReadonlySet<string> = new Set([
  'cardColor',
  'dividerColor',
  'errorColor',
  'infoColor',
  'modalColor',
  'popoverColor',
  'primaryColor',
  'successColor',
  'tableHeaderColor',
  'warningColor',
])
const themeOverrideContract = {
  common: [
    'actionColor',
    'bodyColor',
    'borderColor',
    'borderRadius',
    'borderRadiusSmall',
    'boxShadow1',
    'boxShadow2',
    'boxShadow3',
    'cubicBezierEaseIn',
    'cubicBezierEaseInOut',
    'cubicBezierEaseOut',
    'fontFamily',
    'fontSize',
    'fontSizeLarge',
    'fontSizeMedium',
    'fontSizeSmall',
    'fontWeight',
    'fontWeightStrong',
    'heightLarge',
    'heightMedium',
    'heightSmall',
    'hoverColor',
    'iconColor',
    'iconColorHover',
    'iconColorPressed',
    'lineHeight',
    'opacityDisabled',
    'pressedColor',
    'primaryColorHover',
    'primaryColorPressed',
    'primaryColorSuppl',
    'tagColor',
    'textColor1',
    'textColor2',
    'textColor3',
    'textColorBase',
  ],
  Breadcrumb: [
    'fontSize',
    'fontWeightActive',
    'itemBorderRadius',
    'itemColorHover',
    'itemColorPressed',
    'itemLineHeight',
    'itemTextColor',
    'itemTextColorActive',
    'itemTextColorHover',
    'itemTextColorPressed',
    'separatorColor',
  ],
  Button: [
    'border',
    'borderDisabled',
    'borderDisabledPrimary',
    'borderFocus',
    'borderFocusPrimary',
    'borderHover',
    'borderHoverPrimary',
    'borderPressed',
    'borderPressedPrimary',
    'borderPrimary',
    'borderRadiusMedium',
    'color',
    'colorDisabled',
    'colorDisabledPrimary',
    'colorFocus',
    'colorFocusPrimary',
    'colorHover',
    'colorHoverPrimary',
    'colorPressed',
    'colorPressedPrimary',
    'colorPrimary',
    'colorSecondary',
    'colorSecondaryHover',
    'colorSecondaryPressed',
    'fontSizeMedium',
    'heightMedium',
    'iconSizeMedium',
    'rippleColor',
    'rippleColorPrimary',
    'rippleDuration',
    'textColor',
    'textColorDisabled',
    'textColorFocusPrimary',
    'textColorFocus',
    'textColorGhost',
    'textColorGhostDisabled',
    'textColorGhostHover',
    'textColorGhostPressed',
    'textColorHover',
    'textColorHoverPrimary',
    'textColorPressed',
    'textColorPressedPrimary',
    'textColorDisabledPrimary',
    'textColorPrimary',
    'textColorTertiary',
  ],
  Descriptions: [
    'borderColor',
    'borderRadius',
    'fontSizeMedium',
    'lineHeight',
    'tdColor',
    'tdPaddingBorderedMedium',
    'tdTextColor',
    'thColor',
    'thFontWeight',
    'thPaddingBorderedMedium',
    'thTextColor',
  ],
  Radio: [
    'buttonBorderColor',
    'buttonBorderColorActive',
    'buttonBorderRadius',
    'buttonBoxShadow',
    'buttonBoxShadowFocus',
    'buttonBoxShadowHover',
    'buttonColor',
    'buttonColorActive',
    'buttonHeightMedium',
    'buttonTextColor',
    'buttonTextColorActive',
    'buttonTextColorHover',
    'fontSizeMedium',
  ],
  Tag: ['border', 'borderRadius', 'colorBordered', 'fontSizeMedium', 'heightMedium', 'textColor'],
  Tooltip: ['borderRadius', 'boxShadow', 'color', 'padding', 'peers', 'textColor'],
} as const

const tooltipPopoverPeerOverrideContract = [
  'borderRadius',
  'boxShadow',
  'color',
  'dividerColor',
  'fontSize',
  'padding',
  'space',
  'textColor',
] as const

type NaiveThemeComponent = Exclude<keyof typeof themeOverrideContract, 'common'>
type NaiveThemeValueKind =
  | 'border'
  | 'color'
  | 'easing'
  | 'font-family'
  | 'font-weight'
  | 'length'
  | 'number'
  | 'shadow'
  | 'time'

interface NaiveThemeAuthority {
  readonly authority: string
  readonly valueKind: NaiveThemeValueKind | 'unknown'
}

interface NaiveThemeSemanticGroup {
  readonly component: NaiveThemeComponent | 'common'
  readonly fields: readonly string[]
  readonly authority: string
  readonly valueKind: NaiveThemeValueKind
}

type Naive2452FieldConsumption = readonly [
  overrideKey: string,
  selfLookup: string,
  emittedCssVariables: readonly `--n-${string}`[],
  variant: string,
  selectorState: string,
]

interface Naive2452ComponentConsumptionRecord {
  readonly component: NaiveThemeComponent
  readonly fields: readonly Naive2452FieldConsumption[]
  readonly useThemeKey: string
}

interface Naive2452SharedConsumptionRecord {
  readonly consumingComponent: NaiveThemeComponent
  readonly emittedCssVariable: `--n-${string}`
  readonly overrideKey: string
  readonly selectorState: string
  readonly selfLookup: string
  readonly useThemeKey: string
}

const naiveThemeSemanticGroups = [
  {
    component: 'common',
    fields: [
      'primaryColorHover',
      'primaryColorPressed',
      'primaryColorSuppl',
      'iconColorHover',
      'iconColorPressed',
    ],
    authority: 'color.control.primary',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['cubicBezierEaseIn', 'cubicBezierEaseInOut', 'cubicBezierEaseOut'],
    authority: 'interaction.motion.easing',
    valueKind: 'easing',
  },
  {
    component: 'common',
    fields: ['opacityDisabled'],
    authority: 'admin.state.disabled-opacity',
    valueKind: 'number',
  },
  {
    component: 'Breadcrumb',
    fields: ['fontSize'],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'Breadcrumb',
    fields: ['itemLineHeight'],
    authority: 'typography.line-height.body',
    valueKind: 'number',
  },
  {
    component: 'Breadcrumb',
    fields: ['itemTextColor'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'Breadcrumb',
    fields: ['itemTextColorHover', 'itemTextColorPressed'],
    authority: 'color.control.primary',
    valueKind: 'color',
  },
  {
    component: 'Breadcrumb',
    fields: ['itemTextColorActive'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Breadcrumb',
    fields: ['itemBorderRadius'],
    authority: 'interaction.radius.panel',
    valueKind: 'length',
  },
  {
    component: 'Breadcrumb',
    fields: ['itemColorHover', 'itemColorPressed'],
    authority: 'appearance.material.chrome',
    valueKind: 'color',
  },
  {
    component: 'Breadcrumb',
    fields: ['separatorColor'],
    authority: 'color.border.default',
    valueKind: 'color',
  },
  {
    component: 'Breadcrumb',
    fields: ['fontWeightActive'],
    authority: 'typography.weight.title',
    valueKind: 'font-weight',
  },
  {
    component: 'Button',
    fields: ['heightMedium'],
    authority: 'layout.target.enhanced.minimum-block-size',
    valueKind: 'length',
  },
  {
    component: 'Button',
    fields: ['borderRadiusMedium'],
    authority: 'interaction.radius.panel',
    valueKind: 'length',
  },
  {
    component: 'Button',
    fields: ['fontSizeMedium'],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'Button',
    fields: ['iconSizeMedium'],
    authority: 'admin.header.action-icon-size',
    valueKind: 'length',
  },
  {
    component: 'Button',
    fields: ['border', 'borderDisabled'],
    authority: 'admin.border.control',
    valueKind: 'border',
  },
  {
    component: 'Button',
    fields: [
      'borderHover',
      'borderPressed',
      'borderPrimary',
      'borderHoverPrimary',
      'borderPressedPrimary',
      'borderDisabledPrimary',
    ],
    authority: 'admin.border.action',
    valueKind: 'border',
  },
  {
    component: 'Button',
    fields: ['borderFocus', 'borderFocusPrimary'],
    authority: 'admin.border.focus',
    valueKind: 'border',
  },
  {
    component: 'Button',
    fields: ['colorSecondary', 'colorSecondaryHover', 'colorSecondaryPressed'],
    authority: 'appearance.material.chrome',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['color', 'colorDisabled'],
    authority: 'appearance.material.chrome',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['colorHover', 'colorFocus'],
    authority: 'admin.navigation.hover-surface',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['colorPressed'],
    authority: 'admin.navigation.selected-surface',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: [
      'colorPrimary',
      'colorHoverPrimary',
      'colorPressedPrimary',
      'colorFocusPrimary',
      'colorDisabledPrimary',
    ],
    authority: 'color.action.primary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: [
      'textColorPrimary',
      'textColorHoverPrimary',
      'textColorPressedPrimary',
      'textColorFocusPrimary',
      'textColorDisabledPrimary',
    ],
    authority: 'color.text.on-action',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColor', 'textColorGhost'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: [
      'textColorHover',
      'textColorPressed',
      'textColorFocus',
      'textColorGhostHover',
      'textColorGhostPressed',
    ],
    authority: 'color.control.primary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorTertiary', 'textColorDisabled'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorGhostDisabled'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['rippleColor', 'rippleColorPrimary'],
    authority: 'color.focus.ring',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['rippleDuration'],
    authority: 'appearance.motion.duration',
    valueKind: 'time',
  },
  {
    component: 'Descriptions',
    fields: ['lineHeight'],
    authority: 'typography.line-height.body',
    valueKind: 'number',
  },
  {
    component: 'Descriptions',
    fields: ['fontSizeMedium'],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'Descriptions',
    fields: ['thColor', 'tdColor'],
    authority: 'color.surface.panel',
    valueKind: 'color',
  },
  {
    component: 'Descriptions',
    fields: ['thTextColor'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'Descriptions',
    fields: ['thFontWeight'],
    authority: 'typography.weight.title',
    valueKind: 'font-weight',
  },
  {
    component: 'Descriptions',
    fields: ['thPaddingBorderedMedium', 'tdPaddingBorderedMedium'],
    authority: 'spacing.content.gap',
    valueKind: 'length',
  },
  {
    component: 'Descriptions',
    fields: ['tdTextColor'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Descriptions',
    fields: ['borderColor'],
    authority: 'color.border.default',
    valueKind: 'color',
  },
  {
    component: 'Descriptions',
    fields: ['borderRadius'],
    authority: 'interaction.radius.panel',
    valueKind: 'length',
  },
  {
    component: 'Radio',
    fields: ['buttonHeightMedium'],
    authority: 'layout.target.enhanced.minimum-block-size',
    valueKind: 'length',
  },
  {
    component: 'Radio',
    fields: ['fontSizeMedium'],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'Radio',
    fields: ['buttonBorderColor'],
    authority: 'color.border.default',
    valueKind: 'color',
  },
  {
    component: 'Radio',
    fields: ['buttonBorderColorActive', 'buttonTextColorHover'],
    authority: 'color.control.primary',
    valueKind: 'color',
  },
  {
    component: 'Radio',
    fields: ['buttonColorActive'],
    authority: 'color.action.primary',
    valueKind: 'color',
  },
  {
    component: 'Radio',
    fields: ['buttonBoxShadow'],
    authority: 'admin.shadow.control',
    valueKind: 'shadow',
  },
  {
    component: 'Radio',
    fields: ['buttonBoxShadowHover'],
    authority: 'admin.shadow.control-hover',
    valueKind: 'shadow',
  },
  {
    component: 'Radio',
    fields: ['buttonBoxShadowFocus'],
    authority: 'admin.shadow.focus-ring',
    valueKind: 'shadow',
  },
  {
    component: 'Radio',
    fields: ['buttonColor'],
    authority: 'appearance.material.chrome',
    valueKind: 'color',
  },
  {
    component: 'Radio',
    fields: ['buttonTextColor'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Radio',
    fields: ['buttonTextColorActive'],
    authority: 'color.text.on-action',
    valueKind: 'color',
  },
  {
    component: 'Radio',
    fields: ['buttonBorderRadius'],
    authority: 'interaction.radius.panel',
    valueKind: 'length',
  },
  {
    component: 'Tag',
    fields: ['heightMedium'],
    authority: 'interaction.control.height',
    valueKind: 'length',
  },
  {
    component: 'Tag',
    fields: ['borderRadius'],
    authority: 'interaction.radius.panel',
    valueKind: 'length',
  },
  {
    component: 'Tag',
    fields: ['fontSizeMedium'],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'Tag',
    fields: ['border'],
    authority: 'admin.border.control',
    valueKind: 'border',
  },
  {
    component: 'Tag',
    fields: ['textColor'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Tag',
    fields: ['colorBordered'],
    authority: 'appearance.material.chrome',
    valueKind: 'color',
  },
  {
    component: 'Tooltip',
    fields: ['borderRadius'],
    authority: 'interaction.radius.panel',
    valueKind: 'length',
  },
  {
    component: 'Tooltip',
    fields: ['boxShadow'],
    authority: 'admin.shadow.overlay',
    valueKind: 'shadow',
  },
  {
    component: 'Tooltip',
    fields: ['color'],
    authority: 'appearance.material.overlay',
    valueKind: 'color',
  },
  {
    component: 'Tooltip',
    fields: ['padding'],
    authority: 'spacing.content.gap',
    valueKind: 'length',
  },
  {
    component: 'Tooltip',
    fields: ['textColor'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
] as const satisfies readonly NaiveThemeSemanticGroup[]

const naive2452ConsumptionContract = [
  {
    component: 'Breadcrumb',
    fields: [
      ['fontSize', 'self.fontSize', ['--n-font-size'], 'base', '.n-breadcrumb typography'],
      [
        'fontWeightActive',
        'self.fontWeightActive',
        ['--n-font-weight-active'],
        'active',
        '.n-breadcrumb-item:last-child .n-breadcrumb-item__link active weight',
      ],
      [
        'itemBorderRadius',
        'self.itemBorderRadius',
        ['--n-item-border-radius'],
        'base',
        '.n-breadcrumb-item__link radius',
      ],
      [
        'itemColorHover',
        'self.itemColorHover',
        ['--n-item-color-hover'],
        'clickable-hover',
        '.n-breadcrumb-item:not(:last-child).n-breadcrumb-item--clickable .n-breadcrumb-item__link:hover background',
      ],
      [
        'itemColorPressed',
        'self.itemColorPressed',
        ['--n-item-color-pressed'],
        'clickable-pressed',
        '.n-breadcrumb-item:not(:last-child).n-breadcrumb-item--clickable .n-breadcrumb-item__link:active background',
      ],
      [
        'itemLineHeight',
        'self.itemLineHeight',
        ['--n-item-line-height'],
        'base',
        '.n-breadcrumb-item line height',
      ],
      [
        'itemTextColor',
        'self.itemTextColor',
        ['--n-item-text-color'],
        'base',
        '.n-breadcrumb-item__link text',
      ],
      [
        'itemTextColorActive',
        'self.itemTextColorActive',
        ['--n-item-text-color-active'],
        'active',
        '.n-breadcrumb-item:last-child .n-breadcrumb-item__link text',
      ],
      [
        'itemTextColorHover',
        'self.itemTextColorHover',
        ['--n-item-text-color-hover'],
        'link-hover',
        '.n-breadcrumb-item__link:hover text and icon',
      ],
      [
        'itemTextColorPressed',
        'self.itemTextColorPressed',
        ['--n-item-text-color-pressed'],
        'link-pressed',
        '.n-breadcrumb-item__link:active text and icon',
      ],
      [
        'separatorColor',
        'self.separatorColor',
        ['--n-separator-color'],
        'base',
        '.n-breadcrumb-item__separator color',
      ],
    ],
    useThemeKey: 'Breadcrumb/-breadcrumb',
  },
  {
    component: 'Button',
    fields: [
      [
        'border',
        'self.border via createKey("border", mergedType)',
        ['--n-border'],
        'default-or-ghost',
        '.n-button__border base',
      ],
      [
        'borderDisabled',
        'self.borderDisabled via createKey("borderDisabled", mergedType)',
        ['--n-border-disabled'],
        'default-or-ghost-disabled',
        '.n-button--disabled .n-button__border',
      ],
      [
        'borderDisabledPrimary',
        'self.borderDisabledPrimary via createKey("borderDisabled", mergedType)',
        ['--n-border-disabled'],
        'primary-disabled',
        '.n-button--disabled .n-button__border primary',
      ],
      [
        'borderFocus',
        'self.borderFocus via createKey("borderFocus", mergedType)',
        ['--n-border-focus'],
        'default-or-ghost-focus',
        '.n-button:focus .n-button__state-border',
      ],
      [
        'borderFocusPrimary',
        'self.borderFocusPrimary via createKey("borderFocus", mergedType)',
        ['--n-border-focus'],
        'primary-focus',
        '.n-button:focus .n-button__state-border primary',
      ],
      [
        'borderHover',
        'self.borderHover via createKey("borderHover", mergedType)',
        ['--n-border-hover'],
        'default-or-ghost-hover',
        '.n-button:hover .n-button__state-border',
      ],
      [
        'borderHoverPrimary',
        'self.borderHoverPrimary via createKey("borderHover", mergedType)',
        ['--n-border-hover'],
        'primary-hover',
        '.n-button:hover .n-button__state-border primary',
      ],
      [
        'borderPressed',
        'self.borderPressed via createKey("borderPressed", mergedType)',
        ['--n-border-pressed'],
        'default-or-ghost-pressed',
        '.n-button:active .n-button__state-border',
      ],
      [
        'borderPressedPrimary',
        'self.borderPressedPrimary via createKey("borderPressed", mergedType)',
        ['--n-border-pressed'],
        'primary-pressed',
        '.n-button:active .n-button__state-border primary',
      ],
      [
        'borderPrimary',
        'self.borderPrimary via createKey("border", mergedType)',
        ['--n-border'],
        'primary',
        '.n-button__border primary',
      ],
      [
        'borderRadiusMedium',
        'self.borderRadiusMedium via createKey("borderRadius", size)',
        ['--n-border-radius'],
        'medium',
        '.n-button medium radius',
      ],
      [
        'colorDisabledPrimary',
        'self.colorDisabledPrimary via createKey("colorDisabled", mergedType)',
        ['--n-color-disabled'],
        'primary-disabled',
        '.n-button--disabled primary background',
      ],
      [
        'colorFocusPrimary',
        'self.colorFocusPrimary via createKey("colorFocus", mergedType)',
        ['--n-color-focus'],
        'primary-focus',
        '.n-button:focus primary background',
      ],
      [
        'colorHoverPrimary',
        'self.colorHoverPrimary via createKey("colorHover", mergedType)',
        ['--n-color-hover'],
        'primary-hover',
        '.n-button:hover primary background',
      ],
      [
        'colorPressedPrimary',
        'self.colorPressedPrimary via createKey("colorPressed", mergedType)',
        ['--n-color-pressed'],
        'primary-pressed',
        '.n-button:active primary background',
      ],
      [
        'colorPrimary',
        'self.colorPrimary via createKey("color", mergedType)',
        ['--n-color'],
        'primary',
        '.n-button primary background',
      ],
      [
        'color',
        'self.color via createKey("color", mergedType)',
        ['--n-color'],
        'default',
        '.n-button default background',
      ],
      [
        'colorDisabled',
        'self.colorDisabled via createKey("colorDisabled", mergedType)',
        ['--n-color-disabled'],
        'default-disabled',
        '.n-button--disabled default background',
      ],
      [
        'colorFocus',
        'self.colorFocus via createKey("colorFocus", mergedType)',
        ['--n-color-focus'],
        'default-focus',
        '.n-button:focus default background',
      ],
      [
        'colorHover',
        'self.colorHover via createKey("colorHover", mergedType)',
        ['--n-color-hover'],
        'default-hover',
        '.n-button:hover default background',
      ],
      [
        'colorPressed',
        'self.colorPressed via createKey("colorPressed", mergedType)',
        ['--n-color-pressed'],
        'default-pressed',
        '.n-button:active default background',
      ],
      [
        'colorSecondary',
        'self.colorSecondary',
        ['--n-color', '--n-color-disabled'],
        'secondary-default-and-disabled',
        '.n-button secondary default background',
      ],
      [
        'colorSecondaryHover',
        'self.colorSecondaryHover',
        ['--n-color-hover', '--n-color-focus'],
        'secondary-hover-and-focus',
        '.n-button secondary default hover and focus background',
      ],
      [
        'colorSecondaryPressed',
        'self.colorSecondaryPressed',
        ['--n-color-pressed'],
        'secondary-pressed',
        '.n-button secondary default pressed background',
      ],
      [
        'fontSizeMedium',
        'self.fontSizeMedium via createKey("fontSize", size)',
        ['--n-font-size'],
        'medium',
        '.n-button medium typography',
      ],
      [
        'heightMedium',
        'self.heightMedium via createKey("height", size)',
        ['--n-height'],
        'medium',
        '.n-button medium geometry',
      ],
      [
        'iconSizeMedium',
        'self.iconSizeMedium via createKey("iconSize", size)',
        ['--n-icon-size'],
        'medium',
        '.n-button .n-button__icon medium geometry',
      ],
      [
        'rippleColor',
        'self.rippleColor via createKey("rippleColor", mergedType)',
        ['--n-ripple-color'],
        'default-or-ghost-wave',
        '.n-button .n-base-wave animation',
      ],
      [
        'rippleColorPrimary',
        'self.rippleColorPrimary via createKey("rippleColor", mergedType)',
        ['--n-ripple-color'],
        'primary-wave',
        '.n-button .n-base-wave primary animation',
      ],
      [
        'rippleDuration',
        'self.rippleDuration',
        ['--n-ripple-duration'],
        'wave-duration',
        '.n-button .n-base-wave animation duration',
      ],
      [
        'textColor',
        'self.textColor',
        [
          '--n-text-color',
          '--n-text-color-hover',
          '--n-text-color-pressed',
          '--n-text-color-focus',
          '--n-text-color-disabled',
        ],
        'default-and-secondary',
        '.n-button default or secondary text states',
      ],
      [
        'textColorDisabled',
        'self.textColorDisabled via createKey("textColorDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'default-disabled',
        '.n-button--disabled default text',
      ],
      [
        'textColorFocus',
        'self.textColorFocus via createKey("textColorFocus", mergedType)',
        ['--n-text-color-focus'],
        'default-focus',
        '.n-button:focus default text',
      ],
      [
        'textColorFocusPrimary',
        'self.textColorFocusPrimary via createKey("textColorFocus", mergedType)',
        ['--n-text-color-focus'],
        'primary-focus',
        '.n-button:focus primary text',
      ],
      [
        'textColorGhost',
        'self.textColorGhost via createKey("textColorGhost", mergedType)',
        ['--n-text-color'],
        'ghost',
        '.n-button ghost text',
      ],
      [
        'textColorGhostDisabled',
        'self.textColorGhostDisabled via createKey("textColorGhostDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'ghost-disabled',
        '.n-button--disabled ghost text',
      ],
      [
        'textColorGhostHover',
        'self.textColorGhostHover via createKey("textColorGhostHover", mergedType)',
        ['--n-text-color-hover', '--n-text-color-focus'],
        'ghost-hover-and-focus',
        '.n-button ghost hover and focus text',
      ],
      [
        'textColorGhostPressed',
        'self.textColorGhostPressed via createKey("textColorGhostPressed", mergedType)',
        ['--n-text-color-pressed'],
        'ghost-pressed',
        '.n-button ghost pressed text',
      ],
      [
        'textColorHoverPrimary',
        'self.textColorHoverPrimary via createKey("textColorHover", mergedType)',
        ['--n-text-color-hover'],
        'primary-hover',
        '.n-button:hover primary text',
      ],
      [
        'textColorHover',
        'self.textColorHover via createKey("textColorHover", mergedType)',
        ['--n-text-color-hover'],
        'default-hover',
        '.n-button:hover default text',
      ],
      [
        'textColorPressedPrimary',
        'self.textColorPressedPrimary via createKey("textColorPressed", mergedType)',
        ['--n-text-color-pressed'],
        'primary-pressed',
        '.n-button:active primary text',
      ],
      [
        'textColorPressed',
        'self.textColorPressed via createKey("textColorPressed", mergedType)',
        ['--n-text-color-pressed'],
        'default-pressed',
        '.n-button:active default text',
      ],
      [
        'textColorDisabledPrimary',
        'self.textColorDisabledPrimary via createKey("textColorDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'primary-disabled',
        '.n-button--disabled primary text',
      ],
      [
        'textColorPrimary',
        'self.textColorPrimary via createKey("textColor", mergedType)',
        ['--n-text-color'],
        'primary',
        '.n-button primary text',
      ],
      [
        'textColorTertiary',
        'self.textColorTertiary',
        [
          '--n-text-color',
          '--n-text-color-hover',
          '--n-text-color-pressed',
          '--n-text-color-focus',
          '--n-text-color-disabled',
        ],
        'tertiary-type-quaternary',
        '.n-button quaternary tertiary-type text states',
      ],
    ],
    useThemeKey: 'Button/-button',
  },
  {
    component: 'Descriptions',
    fields: [
      [
        'borderColor',
        'self.borderColor',
        ['--n-border-color'],
        'bordered',
        '.n-descriptions--bordered .n-descriptions-table-wrapper border',
      ],
      [
        'borderRadius',
        'self.borderRadius',
        ['--n-border-radius'],
        'bordered',
        '.n-descriptions--bordered .n-descriptions-table-wrapper radius',
      ],
      [
        'fontSizeMedium',
        'self.fontSizeMedium via createKey("fontSize", mergedSize)',
        ['--n-font-size'],
        'medium',
        '.n-descriptions medium typography',
      ],
      [
        'lineHeight',
        'self.lineHeight',
        ['--n-line-height'],
        'base',
        '.n-descriptions-table-header and .n-descriptions-table-content line height',
      ],
      [
        'tdColor',
        'self.tdColor',
        ['--n-td-color'],
        'bordered',
        '.n-descriptions-table-wrapper content background',
      ],
      [
        'tdPaddingBorderedMedium',
        'self.tdPaddingBorderedMedium via createKey("tdPaddingBordered", mergedSize)',
        ['--n-td-padding'],
        'bordered-medium',
        '.n-descriptions--bordered .n-descriptions-table-content padding',
      ],
      [
        'tdTextColor',
        'self.tdTextColor',
        ['--n-td-text-color'],
        'base',
        '.n-descriptions-table-content text',
      ],
      [
        'thColor',
        'self.thColor',
        ['--n-th-color'],
        'bordered',
        '.n-descriptions-table-header background',
      ],
      [
        'thFontWeight',
        'self.thFontWeight',
        ['--n-th-font-weight'],
        'base',
        '.n-descriptions-table-header weight',
      ],
      [
        'thPaddingBorderedMedium',
        'self.thPaddingBorderedMedium via createKey("thPaddingBordered", mergedSize)',
        ['--n-th-padding'],
        'bordered-medium',
        '.n-descriptions--bordered .n-descriptions-table-header padding',
      ],
      [
        'thTextColor',
        'self.thTextColor',
        ['--n-th-text-color'],
        'base',
        '.n-descriptions-table-header text',
      ],
    ],
    useThemeKey: 'Descriptions/-descriptions',
  },
  {
    component: 'Radio',
    fields: [
      [
        'buttonBorderColor',
        'self.buttonBorderColor',
        ['--n-button-border-color'],
        'base',
        '.n-radio-button and .n-radio-group__splitor base borders',
      ],
      [
        'buttonBorderColorActive',
        'self.buttonBorderColorActive',
        ['--n-button-border-color-active'],
        'checked',
        '.n-radio-button--checked and .n-radio-group__splitor--checked borders',
      ],
      [
        'buttonBorderRadius',
        'self.buttonBorderRadius',
        ['--n-button-border-radius'],
        'edge-buttons',
        '.n-radio-button:first-child, .n-radio-button:last-child and state-border radius',
      ],
      [
        'buttonBoxShadow',
        'self.buttonBoxShadow',
        ['--n-button-box-shadow'],
        'base',
        '.n-radio-button__state-border base shadow',
      ],
      [
        'buttonBoxShadowFocus',
        'self.buttonBoxShadowFocus',
        ['--n-button-box-shadow-focus'],
        'focus',
        '.n-radio-button--focus:not(:active) .n-radio-button__state-border',
      ],
      [
        'buttonBoxShadowHover',
        'self.buttonBoxShadowHover',
        ['--n-button-box-shadow-hover'],
        'hover',
        '.n-radio-button:not(.n-radio-button--disabled):hover .n-radio-button__state-border',
      ],
      [
        'buttonColor',
        'self.buttonColor',
        ['--n-button-color'],
        'base',
        '.n-radio-button base background',
      ],
      [
        'buttonColorActive',
        'self.buttonColorActive',
        ['--n-button-color-active'],
        'checked',
        '.n-radio-button--checked background',
      ],
      [
        'buttonHeightMedium',
        'self.buttonHeightMedium via createKey("buttonHeight", size)',
        ['--n-height'],
        'medium',
        '.n-radio-group--button-group medium geometry',
      ],
      [
        'buttonTextColor',
        'self.buttonTextColor',
        ['--n-button-text-color'],
        'base',
        '.n-radio-button base text',
      ],
      [
        'buttonTextColorActive',
        'self.buttonTextColorActive',
        ['--n-button-text-color-active'],
        'checked',
        '.n-radio-button--checked text',
      ],
      [
        'buttonTextColorHover',
        'self.buttonTextColorHover',
        ['--n-button-text-color-hover'],
        'hover-unchecked',
        '.n-radio-button:not(.n-radio-button--disabled):hover:not(.n-radio-button--checked) text',
      ],
      [
        'fontSizeMedium',
        'self.fontSizeMedium via createKey("fontSize", size)',
        ['--n-font-size'],
        'medium',
        '.n-radio-group medium typography',
      ],
    ],
    useThemeKey: 'Radio/-radio-group',
  },
  {
    component: 'Tag',
    fields: [
      [
        'border',
        'self.border via createKey("border", type)',
        ['--n-border'],
        'default',
        '.n-tag__border default bordered status badge',
      ],
      ['borderRadius', 'self.borderRadius', ['--n-border-radius'], 'base', '.n-tag radius'],
      [
        'colorBordered',
        'self.colorBordered via createKey("colorBordered", type)',
        ['--n-color'],
        'default-bordered',
        '.n-tag default bordered background',
      ],
      [
        'fontSizeMedium',
        'self.fontSizeMedium via createKey("fontSize", size)',
        ['--n-font-size'],
        'medium',
        '.n-tag medium typography',
      ],
      [
        'heightMedium',
        'self.heightMedium via createKey("height", size)',
        ['--n-height'],
        'medium',
        '.n-tag medium geometry',
      ],
      [
        'textColor',
        'self.textColor via createKey("textColor", type)',
        ['--n-text-color'],
        'default',
        '.n-tag default text',
      ],
    ],
    useThemeKey: 'Tag/-tag',
  },
  {
    component: 'Tooltip',
    fields: [
      [
        'borderRadius',
        'self.borderRadius forwarded as Popover builtinThemeOverrides',
        ['--n-border-radius'],
        'tooltip-popover',
        '.n-popover.tooltip radius',
      ],
      [
        'boxShadow',
        'self.boxShadow forwarded as Popover builtinThemeOverrides',
        ['--n-box-shadow'],
        'tooltip-popover',
        '.n-popover.tooltip shadow',
      ],
      [
        'color',
        'self.color forwarded as Popover builtinThemeOverrides',
        ['--n-color'],
        'tooltip-popover',
        '.n-popover.tooltip background',
      ],
      [
        'padding',
        'self.padding forwarded as Popover builtinThemeOverrides',
        ['--n-padding'],
        'tooltip-popover',
        '.n-popover.tooltip content padding',
      ],
      [
        'textColor',
        'self.textColor forwarded as Popover builtinThemeOverrides',
        ['--n-text-color'],
        'tooltip-popover',
        '.n-popover.tooltip text',
      ],
    ],
    useThemeKey: 'Tooltip/-tooltip',
  },
] as const satisfies readonly Naive2452ComponentConsumptionRecord[]

const naive2452SharedConsumptionContract = [
  {
    consumingComponent: 'Breadcrumb',
    overrideKey: 'cubicBezierEaseInOut',
    selfLookup: 'common.cubicBezierEaseInOut',
    emittedCssVariable: '--n-bezier',
    selectorState: '.n-breadcrumb-item transition states',
    useThemeKey: 'Breadcrumb/-breadcrumb',
  },
  {
    consumingComponent: 'Button',
    overrideKey: 'cubicBezierEaseInOut',
    selfLookup: 'common.cubicBezierEaseInOut',
    emittedCssVariable: '--n-bezier',
    selectorState: '.n-button transition states',
    useThemeKey: 'Button/-button',
  },
  {
    consumingComponent: 'Button',
    overrideKey: 'cubicBezierEaseOut',
    selfLookup: 'common.cubicBezierEaseOut',
    emittedCssVariable: '--n-bezier-ease-out',
    selectorState: '.n-button .n-base-wave animation timing',
    useThemeKey: 'Button/-button',
  },
  {
    consumingComponent: 'Button',
    overrideKey: 'opacityDisabled',
    selfLookup: 'self.opacityDisabled derived from common.opacityDisabled',
    emittedCssVariable: '--n-opacity-disabled',
    selectorState: '.n-button--disabled opacity',
    useThemeKey: 'Button/-button',
  },
  {
    consumingComponent: 'Descriptions',
    overrideKey: 'cubicBezierEaseInOut',
    selfLookup: 'common.cubicBezierEaseInOut',
    emittedCssVariable: '--n-bezier',
    selectorState: '.n-descriptions table transition states',
    useThemeKey: 'Descriptions/-descriptions',
  },
  {
    consumingComponent: 'Radio',
    overrideKey: 'cubicBezierEaseInOut',
    selfLookup: 'common.cubicBezierEaseInOut',
    emittedCssVariable: '--n-bezier',
    selectorState: '.n-radio-group and .n-radio-button transition states',
    useThemeKey: 'Radio/-radio-group',
  },
  {
    consumingComponent: 'Radio',
    overrideKey: 'opacityDisabled',
    selfLookup: 'self.opacityDisabled derived from common.opacityDisabled',
    emittedCssVariable: '--n-opacity-disabled',
    selectorState: '.n-radio-button--disabled and .n-radio-group__splitor--disabled opacity',
    useThemeKey: 'Radio/-radio-group',
  },
  {
    consumingComponent: 'Tag',
    overrideKey: 'cubicBezierEaseInOut',
    selfLookup: 'common.cubicBezierEaseInOut',
    emittedCssVariable: '--n-bezier',
    selectorState: '.n-tag transition states',
    useThemeKey: 'Tag/-tag',
  },
  {
    consumingComponent: 'Tooltip',
    overrideKey: 'cubicBezierEaseInOut',
    selfLookup: 'Popover common.cubicBezierEaseInOut',
    emittedCssVariable: '--n-bezier',
    selectorState: '.n-popover.tooltip transition states',
    useThemeKey: 'Tooltip/-tooltip',
  },
  {
    consumingComponent: 'Tooltip',
    overrideKey: 'cubicBezierEaseIn',
    selfLookup: 'Popover common.cubicBezierEaseIn',
    emittedCssVariable: '--n-bezier-ease-in',
    selectorState: '.n-popover.tooltip enter transition',
    useThemeKey: 'Tooltip/-tooltip',
  },
  {
    consumingComponent: 'Tooltip',
    overrideKey: 'cubicBezierEaseOut',
    selfLookup: 'Popover common.cubicBezierEaseOut',
    emittedCssVariable: '--n-bezier-ease-out',
    selectorState: '.n-popover.tooltip leave transition',
    useThemeKey: 'Tooltip/-tooltip',
  },
] as const satisfies readonly Naive2452SharedConsumptionRecord[]

const naive2452UseThemeKeyContract = {
  Breadcrumb: 'Breadcrumb/-breadcrumb',
  Button: 'Button/-button',
  Descriptions: 'Descriptions/-descriptions',
  Radio: 'Radio/-radio-group',
  Tag: 'Tag/-tag',
  Tooltip: 'Tooltip/-tooltip',
} as const satisfies Readonly<Record<NaiveThemeComponent, string>>

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function exactSet(actual: readonly string[], expected: readonly string[]): boolean {
  const left = [...actual].sort(compareCodePoints)
  const right = [...expected].sort(compareCodePoints)
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function runtimeCount(records: readonly unknown[]): number {
  return records.length
}

function runtimeNumber(value: number): number {
  return value
}

function runtimeString(value: string): string {
  return value
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

function scriptContent(source: string): string {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
    .map((match) => match[1] ?? '')
    .join('\n')
}

function templateContent(source: string): string {
  const parsed = vueSfcCompiler.parse(source, { filename: 'source.vue' })

  return parsed.errors.length === 0 ? (parsed.descriptor.template?.content ?? '') : ''
}

function styleContent(source: string): string {
  return [...source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gu)]
    .map((match) => match[1] ?? '')
    .join('\n')
}

interface CssRuleBlock {
  readonly declarations: string
  readonly selector: string
}

function cssRuleBlocks(source: string): readonly CssRuleBlock[] {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map((match) => ({
    declarations: match[2] ?? '',
    selector: (match[1] ?? '').replaceAll(/\s+/gu, ' ').trim(),
  }))
}

function splitCssSelectorList(selectorList: string): readonly string[] {
  const selectors: string[] = []
  let functionalDepth = 0
  let selectorStart = 0

  for (let index = 0; index < selectorList.length; index += 1) {
    const character = selectorList[index]

    if (character === '(') {
      functionalDepth += 1
    } else if (character === ')') {
      functionalDepth = Math.max(0, functionalDepth - 1)
    } else if (character === ',' && functionalDepth === 0) {
      selectors.push(selectorList.slice(selectorStart, index))
      selectorStart = index + 1
    }
  }

  selectors.push(selectorList.slice(selectorStart))
  return selectors
}

function cssDeclarationsForSelector(
  rules: readonly CssRuleBlock[],
  selector: string,
): string | undefined {
  const declarations = rules
    .filter((rule) =>
      splitCssSelectorList(rule.selector).some((candidate) => candidate.trim() === selector),
    )
    .map((rule) => rule.declarations)

  return declarations.length === 0 ? undefined : declarations.join('\n')
}

function cssDeclarationNames(declarations: string): readonly string[] {
  return [...declarations.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/gimu)].map((match) => match[1] ?? '')
}

function compileSfcStyles(source: string): CompiledSfcStyles {
  const parsed = vueSfcCompiler.parse(source, { filename: shellSfcPath })
  const errors: unknown[] = [...parsed.errors]
  const blocks = parsed.descriptor.styles.map((block) => {
    const scoped = block.scoped === true
    const compiled = vueSfcCompiler.compileStyle({
      filename: shellSfcPath,
      id: shellSfcScopeId,
      ...(block.lang === undefined ? {} : { preprocessLang: block.lang }),
      scoped,
      source: block.content,
    })

    errors.push(...compiled.errors)

    return Object.freeze({
      code: compiled.code,
      rules: cssRuleBlocks(compiled.code),
      scoped,
      source: block.content,
    })
  })

  return Object.freeze({ blocks: Object.freeze(blocks), errors: Object.freeze(errors) })
}

function normalizedCssSelector(selector: string): string {
  return selector.replaceAll(/\s+/gu, ' ').trim()
}

function selectorDeclarationValues(
  rules: readonly CssRuleBlock[],
  selector: string,
  property: string,
): readonly string[] {
  const values: string[] = []

  for (const rule of rules) {
    if (
      !splitCssSelectorList(rule.selector).some(
        (candidate) => normalizedCssSelector(candidate) === selector,
      )
    ) {
      continue
    }

    for (const declaration of rule.declarations.split(';')) {
      const separatorIndex = declaration.indexOf(':')
      if (separatorIndex < 0 || declaration.slice(0, separatorIndex).trim() !== property) {
        continue
      }

      values.push(declaration.slice(separatorIndex + 1).trim())
    }
  }

  return values
}

function selectorHasDeclarations(
  rules: readonly CssRuleBlock[],
  selector: string,
  declarations: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(declarations).every(([property, value]) =>
    selectorDeclarationValues(rules, selector, property).includes(value),
  )
}

function compiledShellStateViolations(source: string): string[] {
  const violations: string[] = []
  const compiled = compileSfcStyles(source)

  if (compiled.errors.length > 0) {
    return ['SHELL_SFC_STYLE_COMPILATION']
  }

  const scopedBlocks = compiled.blocks.filter((block) => block.scoped)
  const stateBlocks = compiled.blocks.filter((block) => !block.scoped)
  if (
    scopedBlocks.length !== 1 ||
    stateBlocks.length !== 1 ||
    scopedBlocks.some((block) => /data-(?:material|motion)/u.test(block.source)) ||
    stateBlocks.some((block) => block.source.includes(':global('))
  ) {
    violations.push('SHELL_STATE_STYLE_BOUNDARY')
  }

  const allRules = compiled.blocks.flatMap((block) => block.rules)
  const stateRules = allRules.filter((rule) => /\[data-(?:material|motion)=/u.test(rule.selector))
  const prohibitedRootProperties = new Set([
    '-webkit-backdrop-filter',
    'animation',
    'backdrop-filter',
    'box-shadow',
    'transform',
    'transition',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'translate',
  ])
  const rootOnlySelector = /^(?:html(?:\[[^\]]+\])?|body(?:\[[^\]]+\])?|#app)$/u

  for (const rule of allRules) {
    const selectors = rule.selector.split(',').map(normalizedCssSelector)
    const rootOnlySelectors = selectors.filter((selector) => rootOnlySelector.test(selector))
    if (rootOnlySelectors.length > 0) {
      violations.push('SHELL_COMPILED_ROOT_SELECTOR')
      if (
        cssDeclarationNames(rule.declarations).some((name) => prohibitedRootProperties.has(name))
      ) {
        violations.push('SHELL_COMPILED_ROOT_STATE_DECLARATION')
      }
    }
  }

  for (const rule of stateRules) {
    const selectors = rule.selector.split(',').map(normalizedCssSelector)
    const navigationWhereSelector =
      /^html\[data-motion='(?:reduced|none)'\]\s+:where\(/u.test(
        normalizedCssSelector(rule.selector),
      ) && rule.selector.includes("[data-pavp-admin-navigation='persistent']")
    if (
      !navigationWhereSelector &&
      selectors.some(
        (selector) =>
          !/^html\[data-(?:material|motion)='[^']+'\] (?:\.pavp-admin-shell|\[data-pavp-admin-navigation='persistent'\]|\.pavp-admin-navigation-dropdown|:where\()/u.test(
            selector,
          ),
      )
    ) {
      violations.push('SHELL_STATE_SELECTOR_NAMESPACE')
    }
  }

  const materialTargets = [
    '.pavp-admin-shell__header',
    '.pavp-admin-shell__sidebar',
    ".pavp-admin-shell__navigation-action[aria-current='page']",
    '.pavp-admin-shell__drawer-navigation',
    '.pavp-admin-navigation-dropdown',
  ] as const
  const adaptiveBackdrop = {
    '-webkit-backdrop-filter': 'blur(var(--ui-admin-optical-backdrop-blur))',
    'backdrop-filter': 'blur(var(--ui-admin-optical-backdrop-blur))',
  }
  if (
    materialTargets.some(
      (target) =>
        !selectorHasDeclarations(
          allRules,
          `html[data-material='adaptive'] ${target}`,
          adaptiveBackdrop,
        ),
    )
  ) {
    violations.push('MATERIAL_ADAPTIVE_TARGETS')
  }

  const noBackdrop = {
    '-webkit-backdrop-filter': 'none',
    'backdrop-filter': 'none',
  }
  if (
    (['reduced', 'solid'] as const).some((material) =>
      materialTargets.some(
        (target) =>
          !selectorHasDeclarations(
            allRules,
            `html[data-material='${material}'] ${target}`,
            noBackdrop,
          ),
      ),
    )
  ) {
    violations.push('MATERIAL_INERT_TARGETS')
  }

  const reducedShadowTargets = [
    '.pavp-admin-shell__header',
    '.pavp-admin-shell__sidebar',
    '.pavp-admin-shell__drawer-navigation',
    '.pavp-admin-navigation-dropdown',
  ] as const
  if (
    reducedShadowTargets.some(
      (target) =>
        !selectorHasDeclarations(allRules, `html[data-material='reduced'] ${target}`, {
          'box-shadow': 'none',
        }),
    )
  ) {
    violations.push('MATERIAL_REDUCED_SHADOW_TARGETS')
  }

  const reducedDurationTargets = [
    '.pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation',
    '.pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active .pavp-admin-shell__drawer-navigation',
    '.pavp-admin-shell__sidebar',
    '.pavp-admin-shell__action',
    '.pavp-admin-shell__navigation-action',
    '.pavp-admin-shell__navigation-action::after',
  ] as const
  if (
    reducedDurationTargets.some(
      (target) =>
        !selectorHasDeclarations(allRules, `html[data-motion='reduced'] ${target}`, {
          'transition-duration': 'calc(var(--ui-motion-duration) / 2)',
        }),
    ) ||
    !selectorHasDeclarations(
      allRules,
      "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation",
      { transform: 'translateX(calc(var(--ui-space-content-gap) * -1))' },
    ) ||
    !selectorHasDeclarations(
      allRules,
      "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation",
      { transform: 'translateX(calc(var(--ui-space-content-gap) * -1))' },
    ) ||
    !selectorHasDeclarations(allRules, "html[data-motion='reduced'] .pavp-admin-shell::before", {
      animation: 'none',
    })
  ) {
    violations.push('MOTION_REDUCED_TARGETS')
  }

  const motionNoneTransitionTargets = reducedDurationTargets
  if (
    motionNoneTransitionTargets.some(
      (target) =>
        !selectorHasDeclarations(allRules, `html[data-motion='none'] ${target}`, {
          transition: 'none',
        }),
    ) ||
    !selectorHasDeclarations(allRules, "html[data-motion='none'] .pavp-admin-shell::before", {
      animation: 'none',
    }) ||
    !selectorHasDeclarations(
      allRules,
      "html[data-motion='none'] .pavp-admin-shell__action:active",
      { transform: 'none' },
    ) ||
    !selectorHasDeclarations(
      allRules,
      "html[data-motion='none'] .pavp-admin-shell__navigation-action:active",
      { transform: 'none' },
    ) ||
    !selectorHasDeclarations(
      allRules,
      "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation",
      { transform: 'none' },
    ) ||
    !selectorHasDeclarations(
      allRules,
      "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation",
      { transform: 'none' },
    )
  ) {
    violations.push('MOTION_NONE_TARGETS')
  }

  const allowedStateSelectors = new Set([
    ...(['adaptive', 'reduced', 'solid'] as const).flatMap((material) =>
      materialTargets
        .filter((target) => target.startsWith('.pavp-admin-shell'))
        .map((target) => `html[data-material='${material}'] ${target}`),
    ),
    "html[data-motion='reduced'] .pavp-admin-shell::before",
    "html[data-motion='none'] .pavp-admin-shell::before",
    ...(['reduced', 'none'] as const).flatMap((motion) =>
      reducedDurationTargets.map((target) => `html[data-motion='${motion}'] ${target}`),
    ),
    "html[data-motion='reduced'] .pavp-admin-shell__action:active",
    "html[data-motion='reduced'] .pavp-admin-shell__navigation-action:active",
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation",
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation",
    "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation",
    "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation",
    "html[data-motion='none'] .pavp-admin-shell__action:active",
    "html[data-motion='none'] .pavp-admin-shell__navigation-action:active",
  ])
  const actualStateSelectors = new Set(
    stateRules
      .flatMap((rule) => rule.selector.split(',').map(normalizedCssSelector))
      .filter((selector) => selector.includes(' .pavp-admin-shell'))
      .filter((selector) => !selector.includes('[data-pavp-admin-selection-feedback=')),
  )
  if (
    actualStateSelectors.size !== allowedStateSelectors.size ||
    [...actualStateSelectors].some((selector) => !allowedStateSelectors.has(selector))
  ) {
    violations.push('SHELL_STATE_SELECTOR_TARGET_SET')
  }

  return [...new Set(violations)]
}

function selectorTargetsPersistentOwner(selector: string, owner: string): boolean {
  const normalizedSelector = selector
    .replaceAll(/:global\(([^)]*)\)/gu, '$1')
    .replaceAll(/\s+/gu, ' ')
    .trim()

  if (owner === '.pavp-route-content > *') {
    const directChildMarker = '.pavp-route-content >'
    const markerIndex = normalizedSelector.lastIndexOf(directChildMarker)

    if (markerIndex >= 0) {
      const directChildTarget = normalizedSelector
        .slice(markerIndex + directChildMarker.length)
        .trim()
      const structuralTarget = directChildTarget
        .replaceAll(/\[[^\]]*\]/gu, '')
        .replaceAll(/\([^)]*\)/gu, '')

      if (
        directChildTarget.length > 0 &&
        !directChildTarget.includes('::') &&
        !/[\s>+~]/u.test(structuralTarget)
      ) {
        return true
      }
    }
  }

  const ownerIndex = normalizedSelector.lastIndexOf(owner)

  if (ownerIndex < 0) {
    return false
  }

  const characterBeforeOwner = normalizedSelector[ownerIndex - 1]
  if (
    ownerIndex > 0 &&
    characterBeforeOwner !== ' ' &&
    characterBeforeOwner !== '>' &&
    characterBeforeOwner !== '+' &&
    characterBeforeOwner !== '~'
  ) {
    return false
  }

  const suffix = normalizedSelector.slice(ownerIndex + owner.length).trim()

  if (suffix.includes('::')) {
    return false
  }

  return (
    suffix.length === 0 || /^(?:\[[^\]]*\]|:[a-z-]+(?:\([^)]*\))?|[.#][a-z0-9_-]+)*$/iu.test(suffix)
  )
}

function balancedBlock(source: string, marker: string): string | undefined {
  const markerIndex = source.indexOf(marker)

  if (markerIndex < 0) {
    return undefined
  }

  const openingBrace = source.indexOf('{', markerIndex + marker.length)

  if (openingBrace < 0) {
    return undefined
  }

  let depth = 1

  for (let index = openingBrace + 1; index < source.length; index += 1) {
    const character = source[index]

    if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1

      if (depth === 0) {
        return source.slice(openingBrace + 1, index)
      }
    }
  }

  return undefined
}

function importedModules(path: string, source: string): string[] {
  const content = extname(path) === '.vue' ? scriptContent(source) : source
  return ts.preProcessFile(content, true, true).importedFiles.map((record) => record.fileName)
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression
  }

  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    ts.isIdentifier(current.expression.expression) &&
    current.expression.expression.text === 'Object' &&
    current.expression.name.text === 'freeze' &&
    current.arguments[0] !== undefined
  ) {
    return unwrapExpression(current.arguments[0])
  }

  return current
}

function objectPropertyName(property: ts.ObjectLiteralElementLike): string | undefined {
  const name = property.name
  return name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name))
    ? name.text
    : undefined
}

function staticObjectPropertyNames(
  object: ts.ObjectLiteralExpression,
): readonly string[] | undefined {
  const names: string[] = []

  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
      return undefined
    }

    const name = objectPropertyName(property)
    if (name === undefined) {
      return undefined
    }

    names.push(name)
  }

  return names
}

function objectPropertyObject(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.ObjectLiteralExpression | undefined {
  const property = object.properties.find((candidate) => objectPropertyName(candidate) === name)

  if (!property || !ts.isPropertyAssignment(property)) {
    return undefined
  }

  const value = unwrapExpression(property.initializer)
  return ts.isObjectLiteralExpression(value) ? value : undefined
}

function objectPropertyInitializer(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const property = object.properties.find((candidate) => objectPropertyName(candidate) === name)

  if (property === undefined) {
    return undefined
  }

  if (ts.isPropertyAssignment(property)) {
    return property.initializer
  }

  return ts.isShorthandPropertyAssignment(property) ? property.name : undefined
}

function themeOverrideObject(source: string): ts.ObjectLiteralExpression | undefined {
  const parsed = ts.createSourceFile('pavp-naive-theme.ts', source, ts.ScriptTarget.Latest, true)
  let result: ts.ObjectLiteralExpression | undefined

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'themeOverrides' &&
      node.initializer !== undefined
    ) {
      const value = unwrapExpression(node.initializer)
      result = ts.isObjectLiteralExpression(value) ? value : undefined
    }
    ts.forEachChild(node, visit)
  }

  visit(parsed)
  return result
}

function naiveCommonParserSensitiveOverrides(source: string): readonly string[] {
  const overrides = themeOverrideObject(source)
  const commonOverride =
    overrides === undefined ? undefined : objectPropertyObject(overrides, 'common')
  const commonProperties =
    commonOverride === undefined ? undefined : staticObjectPropertyNames(commonOverride)

  if (commonProperties === undefined) {
    return []
  }

  return commonProperties.filter((property) =>
    naiveCommonParserSensitiveColorProperties.has(property),
  )
}

function themeVariableInitializers(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.Expression> {
  const declarations = new Map<string, ts.Expression>()

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      declarations.set(node.name.text, node.initializer)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return declarations
}

function manifestTypeToNaiveValueKind(type: string): NaiveThemeValueKind | 'unknown' {
  return (
    (
      {
        border: 'border',
        color: 'color',
        cubicBezier: 'easing',
        dimension: 'length',
        duration: 'time',
        fontFamily: 'font-family',
        fontWeight: 'font-weight',
        number: 'number',
        shadow: 'shadow',
      } as const satisfies Readonly<Record<string, NaiveThemeValueKind>>
    )[type] ?? 'unknown'
  )
}

function tokenAuthority(name: string): NaiveThemeAuthority {
  const records = tokenManifest.tokens.filter((record) => record.name === name)
  const types = [...new Set(records.map((record) => record.type))]

  return records.length > 0 && types.length === 1 && types[0] !== undefined
    ? {
        authority: name,
        valueKind: manifestTypeToNaiveValueKind(types[0]),
      }
    : { authority: 'unresolved', valueKind: 'unknown' }
}

function cssVariableAuthority(cssVariable: string): NaiveThemeAuthority {
  if (cssVariable === '--ui-material-chrome-background') {
    return { authority: 'appearance.material.chrome', valueKind: 'color' }
  }
  if (cssVariable === '--ui-material-overlay-background') {
    return { authority: 'appearance.material.overlay', valueKind: 'color' }
  }

  const records = tokenManifest.tokens.filter((record) => record.cssVariable === cssVariable)
  const names = [...new Set(records.map((record) => record.name))]
  const types = [...new Set(records.map((record) => record.type))]

  return names.length === 1 &&
    names[0] !== undefined &&
    types.length === 1 &&
    types[0] !== undefined
    ? {
        authority: names[0],
        valueKind: manifestTypeToNaiveValueKind(types[0]),
      }
    : { authority: 'unresolved', valueKind: 'unknown' }
}

function resolveThemeAuthority(
  expression: ts.Expression | undefined,
  declarations: ReadonlyMap<string, ts.Expression>,
  seen: ReadonlySet<string> = new Set(),
): NaiveThemeAuthority {
  if (expression === undefined) {
    return { authority: 'missing', valueKind: 'unknown' }
  }

  const value = unwrapExpression(expression)

  if (ts.isIdentifier(value)) {
    if (value.text === 'navigationHoverSurface') {
      return { authority: 'admin.navigation.hover-surface', valueKind: 'color' }
    }
    if (value.text === 'navigationSelectedSurface') {
      return { authority: 'admin.navigation.selected-surface', valueKind: 'color' }
    }
    if (seen.has(value.text)) {
      return { authority: 'circular-private-alias', valueKind: 'unknown' }
    }

    const initializer = declarations.get(value.text)
    return resolveThemeAuthority(initializer, declarations, new Set([...seen, value.text]))
  }

  if (
    ts.isElementAccessExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === 'tokens' &&
    ts.isStringLiteral(value.argumentExpression)
  ) {
    return tokenAuthority(value.argumentExpression.text)
  }

  if (
    ts.isPropertyAccessExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === 'material'
  ) {
    if (value.name.text === 'chrome') {
      return { authority: 'appearance.material.chrome', valueKind: 'color' }
    }

    if (value.name.text === 'shadow') {
      return { authority: 'appearance.material.shadow', valueKind: 'shadow' }
    }
  }

  if (
    ts.isCallExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === 'resolveMotionDuration'
  ) {
    return { authority: 'appearance.motion.duration', valueKind: 'time' }
  }

  if (
    ts.isTemplateExpression(value) &&
    value.getText() === '`calc(${spacingContentGap} / 2) ${spacingContentGap}`'
  ) {
    return { authority: 'spacing.content.gap', valueKind: 'length' }
  }

  if (ts.isTemplateExpression(value) && value.getText() === '`calc(${spacingContentGap} / 2)`') {
    return { authority: 'spacing.content.gap', valueKind: 'length' }
  }

  if (ts.isTemplateExpression(value) && value.getText() === '`calc(${enhancedTargetHeight} / 2)`') {
    return { authority: 'admin.header.action-icon-size', valueKind: 'length' }
  }

  if (ts.isStringLiteral(value)) {
    const cssVariable = /^var\((--ui-[a-z0-9-]+)\)$/u.exec(value.text)?.[1]
    return cssVariable === undefined
      ? { authority: 'raw-literal', valueKind: 'unknown' }
      : cssVariableAuthority(cssVariable)
  }

  if (
    ts.isPropertyAccessExpression(value) &&
    /(?:breadcrumb|button|common|descriptions|radio|tag|tooltip)Dark\.self/iu.test(value.getText())
  ) {
    return { authority: 'visible-vendor-default', valueKind: 'unknown' }
  }

  return { authority: 'unresolved', valueKind: 'unknown' }
}

function resolveThemeExpressionText(
  expression: ts.Expression | undefined,
  declarations: ReadonlyMap<string, ts.Expression>,
  seen: ReadonlySet<string> = new Set(),
): string | undefined {
  if (expression === undefined) {
    return undefined
  }

  const value = unwrapExpression(expression)

  if (ts.isIdentifier(value)) {
    if (seen.has(value.text)) {
      return undefined
    }

    return resolveThemeExpressionText(
      declarations.get(value.text),
      declarations,
      new Set([...seen, value.text]),
    )
  }

  return value.getText()
}

function naiveSemanticExpectations(): ReadonlyMap<
  string,
  Readonly<{ authority: string; valueKind: NaiveThemeValueKind }>
> {
  const expectations = new Map<
    string,
    Readonly<{ authority: string; valueKind: NaiveThemeValueKind }>
  >()

  for (const group of naiveThemeSemanticGroups) {
    for (const field of group.fields) {
      const key = `${group.component}.${field}`

      if (expectations.has(key)) {
        throw new TypeError(`${key}: duplicate frozen Naive semantic expectation.`)
      }

      expectations.set(key, {
        authority: group.authority,
        valueKind: group.valueKind,
      })
    }
  }

  return expectations
}

function naiveThemeStateViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = []
  const sourceFile = ts.createSourceFile(
    'pavp-naive-theme.ts',
    snapshot.themeAdapterSource,
    ts.ScriptTarget.Latest,
    true,
  )
  const declarations = themeVariableInitializers(sourceFile)
  const overrides = themeOverrideObject(snapshot.themeAdapterSource)
  const expectations = naiveSemanticExpectations()
  const authorities = new Map<string, NaiveThemeAuthority>()

  if (overrides === undefined) {
    return ['NAIVE_OVERRIDE_INVENTORY']
  }

  for (const component of Object.keys(
    themeOverrideContract,
  ) as (keyof typeof themeOverrideContract)[]) {
    const componentOverride = objectPropertyObject(overrides, component)
    const expectedProperties = themeOverrideContract[component]
    const actualProperties =
      componentOverride === undefined ? undefined : staticObjectPropertyNames(componentOverride)

    if (actualProperties === undefined || !exactSet(actualProperties, expectedProperties)) {
      violations.push('NAIVE_OVERRIDE_INVENTORY')
    }

    for (const field of expectedProperties) {
      const key = `${component}.${field}`
      const expectation = expectations.get(key)

      if (expectation === undefined) {
        continue
      }

      const authority = resolveThemeAuthority(
        componentOverride === undefined
          ? undefined
          : objectPropertyInitializer(componentOverride, field),
        declarations,
      )
      authorities.set(key, authority)

      if (authority.authority === 'visible-vendor-default') {
        violations.push('NAIVE_VISIBLE_VENDOR_DEFAULT')
      }
      if (authority.valueKind !== expectation.valueKind) {
        violations.push('NAIVE_OVERRIDE_VALUE_KIND')
      }
      if (authority.authority !== expectation.authority) {
        violations.push('NAIVE_OVERRIDE_SEMANTIC_ROLE')
      }
    }
  }

  for (const component of Object.keys(themeOverrideContract).filter(
    (name): name is NaiveThemeComponent => name !== 'common',
  )) {
    const semanticFields = [...expectations.keys()]
      .filter((key) => key.startsWith(`${component}.`))
      .map((key) => key.slice(component.length + 1))
    const consumption = naive2452ConsumptionContract.find(
      (record) => record.component === component,
    )
    const componentOverride = objectPropertyObject(overrides, component)
    const actualFields =
      componentOverride === undefined ? undefined : staticObjectPropertyNames(componentOverride)
    const consumableOverrideFields = themeOverrideContract[component].filter(
      (field) => field !== 'peers',
    )
    const frozenFields = consumption?.fields ?? []
    const frozenOverrideKeys = frozenFields.map(([overrideKey]) => overrideKey)
    const duplicateFrozenKeys = new Set(frozenOverrideKeys).size !== frozenOverrideKeys.length
    const invalidFrozenField = frozenFields.some(
      ([overrideKey, selfLookup, emittedCssVariables, variant, selectorState]) =>
        overrideKey.length === 0 ||
        !selfLookup.startsWith('self.') ||
        runtimeCount(emittedCssVariables) === 0 ||
        new Set(emittedCssVariables).size !== emittedCssVariables.length ||
        emittedCssVariables.some((variable) => !variable.startsWith('--n-')) ||
        variant.length === 0 ||
        !selectorState.includes('.n-'),
    )

    if (
      consumption === undefined ||
      actualFields === undefined ||
      duplicateFrozenKeys ||
      invalidFrozenField ||
      !exactSet(frozenOverrideKeys, consumableOverrideFields) ||
      !exactSet(frozenOverrideKeys, semanticFields) ||
      !exactSet(
        frozenOverrideKeys,
        actualFields.filter((field) => field !== 'peers'),
      ) ||
      consumption.useThemeKey !== naive2452UseThemeKeyContract[component]
    ) {
      violations.push('NAIVE_2452_CONSUMPTION_CONTRACT')
    }
  }

  const tooltipOverride = objectPropertyObject(overrides, 'Tooltip')
  const tooltipPeers =
    tooltipOverride === undefined ? undefined : objectPropertyObject(tooltipOverride, 'peers')
  const tooltipPeerNames =
    tooltipPeers === undefined ? undefined : staticObjectPropertyNames(tooltipPeers)
  const tooltipPopover =
    tooltipPeers === undefined ? undefined : objectPropertyObject(tooltipPeers, 'Popover')
  const tooltipPopoverFields =
    tooltipPopover === undefined ? undefined : staticObjectPropertyNames(tooltipPopover)
  const tooltipPopoverExpectations = new Map<
    string,
    Readonly<{ authority: string; valueKind: NaiveThemeValueKind }>
  >([
    ['fontSize', { authority: 'typography.size.body', valueKind: 'length' }],
    ['borderRadius', { authority: 'interaction.radius.panel', valueKind: 'length' }],
    ['color', { authority: 'appearance.material.overlay', valueKind: 'color' }],
    ['dividerColor', { authority: 'color.border.default', valueKind: 'color' }],
    ['textColor', { authority: 'color.text.primary', valueKind: 'color' }],
    ['boxShadow', { authority: 'admin.shadow.overlay', valueKind: 'shadow' }],
    ['padding', { authority: 'spacing.content.gap', valueKind: 'length' }],
    ['space', { authority: 'spacing.content.gap', valueKind: 'length' }],
  ])

  if (
    tooltipPeerNames === undefined ||
    !exactSet(tooltipPeerNames, ['Popover']) ||
    tooltipPopover === undefined ||
    tooltipPopoverFields === undefined ||
    !exactSet(tooltipPopoverFields, tooltipPopoverPeerOverrideContract)
  ) {
    violations.push('NAIVE_OVERRIDE_INVENTORY')
  } else {
    for (const [field, expectation] of tooltipPopoverExpectations) {
      const authority = resolveThemeAuthority(
        objectPropertyInitializer(tooltipPopover, field),
        declarations,
      )

      if (
        authority.authority !== expectation.authority ||
        authority.valueKind !== expectation.valueKind
      ) {
        violations.push('NAIVE_OVERRIDE_SEMANTIC_ROLE')
      }
    }
  }

  const sharedConsumptionIdentities = new Set<string>()
  const commonOverrideKeys = new Set<string>(themeOverrideContract.common)

  for (const consumption of naive2452SharedConsumptionContract) {
    const identity = [
      consumption.consumingComponent,
      consumption.overrideKey,
      consumption.emittedCssVariable,
    ].join('/')
    const expectation = expectations.get(`common.${consumption.overrideKey}`)

    if (
      sharedConsumptionIdentities.has(identity) ||
      !commonOverrideKeys.has(consumption.overrideKey) ||
      expectation === undefined ||
      consumption.selfLookup.length === 0 ||
      !consumption.selectorState.includes('.n-') ||
      consumption.useThemeKey !== naive2452UseThemeKeyContract[consumption.consumingComponent]
    ) {
      violations.push('NAIVE_2452_CONSUMPTION_CONTRACT')
    }

    sharedConsumptionIdentities.add(identity)
  }

  for (const component of ['Button', 'Radio'] as const) {
    if (
      !naive2452SharedConsumptionContract.some(
        (record) =>
          record.consumingComponent === component &&
          record.overrideKey === 'cubicBezierEaseInOut' &&
          runtimeString(record.emittedCssVariable) === '--n-bezier',
      ) ||
      !naive2452SharedConsumptionContract.some(
        (record) =>
          record.consumingComponent === component &&
          record.overrideKey === 'opacityDisabled' &&
          runtimeString(record.emittedCssVariable) === '--n-opacity-disabled',
      )
    ) {
      violations.push('NAIVE_2452_CONSUMPTION_CONTRACT')
    }
  }

  const tooltipSharedConsumption = naive2452SharedConsumptionContract
    .filter((record) => record.consumingComponent === 'Tooltip')
    .map((record) => `${record.overrideKey}/${runtimeString(record.emittedCssVariable)}`)
  if (
    !exactSet(tooltipSharedConsumption, [
      'cubicBezierEaseIn/--n-bezier-ease-in',
      'cubicBezierEaseInOut/--n-bezier',
      'cubicBezierEaseOut/--n-bezier-ease-out',
    ])
  ) {
    violations.push('NAIVE_2452_CONSUMPTION_CONTRACT')
  }

  const matches = (component: string, field: string, authority: string): boolean =>
    authorities.get(`${component}.${field}`)?.authority === authority
  const matchesExpectation = (component: string, field: string): boolean => {
    const expectation = expectations.get(`${component}.${field}`)
    const authority = authorities.get(`${component}.${field}`)

    return (
      expectation !== undefined &&
      authority?.authority === expectation.authority &&
      authority.valueKind === expectation.valueKind
    )
  }

  if (
    !matches('Radio', 'buttonBoxShadowHover', 'admin.shadow.control-hover') ||
    snapshot.themeAdapterSource.includes('buttonBorderColorHover')
  ) {
    violations.push('NAIVE_RADIO_HOVER_SHADOW')
  }
  if (!matches('Radio', 'buttonBoxShadowFocus', 'admin.shadow.focus-ring')) {
    violations.push('NAIVE_FOCUS_SEMANTIC')
  }
  if (
    ['borderPrimary', 'borderHoverPrimary', 'borderPressedPrimary', 'borderFocusPrimary'].some(
      (field) => !matchesExpectation('Button', field),
    )
  ) {
    violations.push('NAIVE_BUTTON_PRIMARY_BORDER')
  }
  if (
    ['borderDisabledPrimary', 'colorDisabledPrimary', 'textColorDisabledPrimary'].some(
      (field) => !matchesExpectation('Button', field),
    )
  ) {
    violations.push('NAIVE_BUTTON_PRIMARY_DISABLED')
  }
  if (
    !matches('Tag', 'border', 'admin.border.control') ||
    authorities.get('Tag.border')?.valueKind !== 'border'
  ) {
    violations.push('NAIVE_TAG_BORDER_KIND')
  }

  const normalizedProviderSource = snapshot.naiveProviderSource.replaceAll(/\s+/gu, ' ')
  if (
    !normalizedProviderSource.includes('.n-button:focus-visible') ||
    !normalizedProviderSource.includes('.n-radio-button--focus') ||
    !normalizedProviderSource.includes('box-shadow: var(--ui-admin-shadow-focus-ring);') ||
    !normalizedProviderSource.includes('@media (forced-colors: active)') ||
    !normalizedProviderSource.includes('outline: var(--ui-admin-border-focus);') ||
    !normalizedProviderSource.includes('outline-offset: var(--ui-admin-focus-outline-offset);')
  ) {
    violations.push('NAIVE_FOCUS_PRESENTATION')
  }

  if (
    /#[\da-f]{3,8}\b|\b(?:hsl|hwb|lab|lch|oklab|oklch|rgb)\s*\(|['"][^'"]*\b\d+(?:\.\d+)?(?:ms|s|px|rem)\b[^'"]*['"]|['"][^'"]*(?:\binset\s+|\s+solid\b)[^'"]*['"]/iu.test(
      snapshot.themeAdapterSource,
    )
  ) {
    violations.push('NAIVE_RAW_VISUAL_AUTHORITY')
  }

  const nonShellUiSource = snapshot.nonAdapterUiSource.replace(snapshot.shellSource, '')
  if (/\.n-[a-z0-9_-]+/iu.test(nonShellUiSource) || /\bthemeOverrides\b/u.test(nonShellUiSource)) {
    violations.push('NAIVE_OVERRIDE_OUTSIDE_PRIVATE_ADAPTER')
  }

  return [...new Set(violations)]
}

function exportNames(source: string): string[] {
  const parsed = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true)
  const names: string[] = []

  for (const statement of parsed.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause)
    ) {
      names.push(...statement.exportClause.elements.map((element) => element.name.text))
      continue
    }

    const exported =
      ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)

    if (
      exported &&
      (ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isFunctionDeclaration(statement)) &&
      statement.name !== undefined
    ) {
      names.push(statement.name.text)
    }
  }

  return names
}

interface ShellTemplateElement {
  readonly ancestors: readonly VueTemplateNode[]
  readonly node: VueTemplateNode
}

interface AdminNavigationHeaderCollapseControlProjection {
  readonly ariaLabelBindingSource: string
  readonly control: ShellTemplateElement | undefined
  readonly controlElements: readonly ShellTemplateElement[]
  readonly controlSource: string
  readonly forbiddenAncestryAbsent: boolean
  readonly headerProfileIndependent: boolean
  readonly headerTrailingDescendant: boolean
  readonly identityProfileIndependent: boolean
  readonly narrowTriggerProfileIndependent: boolean
  readonly wideConditionSource: string
  readonly wideOnly: boolean
}

interface Runtime002MouseScenario {
  readonly button: number
  readonly currentRoute: boolean
}

interface Runtime002MouseEffect {
  prevented: number
  stopped: boolean
  supported: boolean
}

interface Runtime002NavigationScenario {
  readonly currentRoute: boolean
  readonly initialNavigationOpen: boolean
  readonly profile: 'narrow' | 'wide'
}

interface Runtime002NavigationEffect {
  closeCount: number
  emitCount: number
  navigationOpen: boolean
  stopped: boolean
  supported: boolean
}

interface Runtime003PointerScenario {
  readonly button: number
  readonly selfTarget: boolean
}

interface Runtime003PointerEffect {
  closeCount: number
  operations: string[]
  prevented: number
  stopped: boolean
  supported: boolean
}

function normalizeTemplateExpression(expression: string | undefined): string {
  return expression?.replaceAll(/\s+/gu, ' ').trim() ?? ''
}

function templateAttributes(node: VueTemplateNode, name: string): readonly VueTemplateAttribute[] {
  return (node.props ?? []).filter(
    (property): property is VueTemplateAttribute => property.type === 6 && property.name === name,
  )
}

function templateDirectives(
  node: VueTemplateNode,
  name: string,
  argument?: string,
): readonly VueTemplateDirective[] {
  return (node.props ?? []).filter(
    (property): property is VueTemplateDirective =>
      property.type === 7 &&
      property.name === name &&
      (argument === undefined || property.arg?.content === argument),
  )
}

function staticTemplateAttribute(node: VueTemplateNode, name: string): string | undefined {
  const attributes = templateAttributes(node, name)
  return attributes.length === 1 ? attributes[0]?.value?.content : undefined
}

function hasStaticTemplateClass(node: VueTemplateNode, className: string): boolean {
  return (
    staticTemplateAttribute(node, 'class')
      ?.split(/\s+/u)
      .some((candidate) => candidate === className) === true
  )
}

function collectShellTemplateElements(root: VueTemplateNode): readonly ShellTemplateElement[] {
  const elements: ShellTemplateElement[] = []

  function visit(node: VueTemplateNode, ancestors: readonly VueTemplateNode[]): void {
    if (node.type === 1) {
      elements.push({ ancestors, node })
    }

    for (const child of node.children ?? []) {
      visit(child, [...ancestors, node])
    }
  }

  visit(root, [])
  return elements
}

function ancestorHasStaticAttribute(
  element: ShellTemplateElement,
  tag: string,
  name: string,
  value: string,
): boolean {
  return element.ancestors.some(
    (ancestor) => ancestor.tag === tag && staticTemplateAttribute(ancestor, name) === value,
  )
}

function adminNavigationHeaderCollapseControlProjection(
  shellSource: string,
): AdminNavigationHeaderCollapseControlProjection {
  const parsedSfc = vueSfcCompiler.parse(shellSource, { filename: shellSfcPath })
  const templateAst = parsedSfc.descriptor.template?.ast

  if (parsedSfc.errors.length > 0 || templateAst === undefined) {
    return Object.freeze({
      ariaLabelBindingSource: '',
      control: undefined,
      controlElements: [],
      controlSource: '',
      forbiddenAncestryAbsent: false,
      headerProfileIndependent: false,
      headerTrailingDescendant: false,
      identityProfileIndependent: false,
      narrowTriggerProfileIndependent: false,
      wideConditionSource: '',
      wideOnly: false,
    })
  }

  const elements = collectShellTemplateElements(templateAst)
  const controlElements = elements.filter(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-collapse-control') ===
      'header-trailing',
  )
  const control = controlElements.length === 1 ? controlElements[0] : undefined
  const headerElements = elements.filter(
    (element) =>
      element.node.tag === 'header' &&
      hasStaticTemplateClass(element.node, 'pavp-admin-shell__header') &&
      staticTemplateAttribute(element.node, 'data-shell-region') === 'architecture-console-header',
  )
  const header = headerElements.length === 1 ? headerElements[0] : undefined
  const identityElements = elements.filter(
    (element) =>
      hasStaticTemplateClass(element.node, 'pavp-admin-shell__identity') &&
      header !== undefined &&
      element.ancestors.includes(header.node),
  )
  const identity = identityElements.length === 1 ? identityElements[0] : undefined
  const narrowTriggerElements = elements.filter(
    (element) =>
      element.node.tag === 'button' &&
      staticTemplateAttribute(element.node, 'ref') === 'navigationTrigger' &&
      header !== undefined &&
      element.ancestors.includes(header.node),
  )
  const narrowTrigger = narrowTriggerElements.length === 1 ? narrowTriggerElements[0] : undefined
  const hasConditionalVisibilityDirective = (node: VueTemplateNode): boolean =>
    ['if', 'else-if', 'else', 'show'].some(
      (directiveName) => templateDirectives(node, directiveName).length > 0,
    )
  const hasRuntimeMultiplicityDirective = (node: VueTemplateNode): boolean =>
    templateDirectives(node, 'for').length > 0
  const isStableOwnershipPathNode = (node: VueTemplateNode): boolean =>
    !hasConditionalVisibilityDirective(node) && !hasRuntimeMultiplicityDirective(node)
  const headerProfileIndependent =
    header !== undefined && [...header.ancestors, header.node].every(isStableOwnershipPathNode)
  const profileIndependentPathBelowHeader = (
    element: ShellTemplateElement | undefined,
  ): boolean => {
    if (element === undefined || header === undefined) {
      return false
    }

    const headerIndex = element.ancestors.indexOf(header.node)
    const path =
      headerIndex === -1 ? [] : [...element.ancestors.slice(headerIndex + 1), element.node]

    return path.length > 0 && path.every(isStableOwnershipPathNode)
  }
  const identityProfileIndependent = profileIndependentPathBelowHeader(identity)
  const narrowTriggerAncestorPathIndependent =
    narrowTrigger !== undefined &&
    header !== undefined &&
    narrowTrigger.ancestors
      .slice(narrowTrigger.ancestors.indexOf(header.node) + 1)
      .every(isStableOwnershipPathNode)
  const narrowTriggerConditions =
    narrowTrigger === undefined ? [] : templateDirectives(narrowTrigger.node, 'if')
  const narrowTriggerProfileIndependent =
    narrowTrigger !== undefined &&
    narrowTriggerAncestorPathIndependent &&
    narrowTriggerConditions.length === 1 &&
    normalizeTemplateExpression(narrowTriggerConditions[0]?.exp?.content) ===
      "profile === 'narrow'" &&
    ['else-if', 'else', 'show', 'for'].every(
      (directiveName) => templateDirectives(narrowTrigger.node, directiveName).length === 0,
    )
  const headerChildren =
    header?.node.children?.filter((child): child is VueTemplateNode => child.type === 1) ?? []
  const controlHeaderChild = headerChildren.find(
    (child) => control?.node === child || control?.ancestors.includes(child) === true,
  )
  const identityHeaderChild = headerChildren.find(
    (child) => identity?.node === child || identity?.ancestors.includes(child) === true,
  )
  const controlHeaderChildIndex =
    controlHeaderChild === undefined ? -1 : headerChildren.indexOf(controlHeaderChild)
  const identityHeaderChildIndex =
    identityHeaderChild === undefined ? -1 : headerChildren.indexOf(identityHeaderChild)
  const headerAncestorIndex =
    control === undefined || header === undefined ? -1 : control.ancestors.indexOf(header.node)
  const trailingPath =
    control === undefined || header === undefined || headerAncestorIndex === -1
      ? []
      : [header.node, ...control.ancestors.slice(headerAncestorIndex + 1), control.node]
  const controlIsFinalElementThroughTrailingPath = trailingPath
    .slice(0, -1)
    .every((parent, index) => {
      const elementChildren =
        parent.children?.filter((child): child is VueTemplateNode => child.type === 1) ?? []

      return elementChildren.at(-1) === trailingPath[index + 1]
    })
  const headerTrailingDescendant =
    control !== undefined &&
    header !== undefined &&
    identity !== undefined &&
    control.ancestors.includes(header.node) &&
    controlHeaderChildIndex > identityHeaderChildIndex &&
    controlHeaderChildIndex === headerChildren.length - 1 &&
    controlIsFinalElementThroughTrailingPath
  const forbiddenAncestryAbsent =
    control !== undefined &&
    !control.ancestors.some(
      (ancestor) =>
        ancestor.tag === 'PavpLayoutSiderPrimitive' ||
        ancestor.tag === 'PavpMenuPrimitive' ||
        hasStaticTemplateClass(ancestor, 'pavp-admin-shell__drawer-navigation') ||
        (ancestor.tag === 'nav' && staticTemplateAttribute(ancestor, 'aria-label') === '架构导航'),
    )
  const visibilityNodes = trailingPath.slice(1)
  const visibilityDirectives = visibilityNodes.flatMap((node) =>
    ['if', 'else-if', 'else', 'show'].flatMap((directiveName) =>
      templateDirectives(node, directiveName),
    ),
  )
  const wideConditions = visibilityNodes.flatMap((node) =>
    templateDirectives(node, 'if').filter(
      (directive) => normalizeTemplateExpression(directive.exp?.content) === "profile === 'wide'",
    ),
  )
  const wideCondition = wideConditions.length === 1 ? wideConditions[0] : undefined
  const ariaLabelBindings =
    control === undefined ? [] : templateDirectives(control.node, 'bind', 'aria-label')

  return Object.freeze({
    ariaLabelBindingSource:
      ariaLabelBindings.length === 1 ? (ariaLabelBindings[0]?.loc.source ?? '') : '',
    control,
    controlElements,
    controlSource: control?.node.loc?.source ?? '',
    forbiddenAncestryAbsent,
    headerProfileIndependent,
    headerTrailingDescendant,
    identityProfileIndependent,
    narrowTriggerProfileIndependent,
    wideConditionSource: wideCondition?.loc.source ?? '',
    wideOnly:
      wideCondition !== undefined &&
      visibilityDirectives.length === 1 &&
      visibilityNodes.every((node) => !hasRuntimeMultiplicityDirective(node)),
  })
}

function functionDeclaration(
  sourceFile: ts.SourceFile,
  name: string,
): ts.FunctionDeclaration | undefined {
  return sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  )
}

function runtime002MouseValue(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  eventParameterName: string,
  routeParameterName: string,
  scenario: Runtime002MouseScenario,
): boolean | number | string | undefined {
  const value = unwrapExpression(expression)

  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  if (ts.isNumericLiteral(value)) {
    return Number(value.text)
  }
  if (ts.isStringLiteral(value)) {
    return value.text
  }
  if (ts.isIdentifier(value) && value.text === routeParameterName) {
    return scenario.currentRoute ? 'current-route' : 'different-route'
  }
  if (ts.isPropertyAccessExpression(value)) {
    if (
      ts.isIdentifier(value.expression) &&
      value.expression.text === eventParameterName &&
      value.name.text === 'button'
    ) {
      return scenario.button
    }
    if (
      ts.isIdentifier(value.expression) &&
      value.expression.text === 'props' &&
      value.name.text === 'activeRouteName'
    ) {
      return 'current-route'
    }
  }
  if (ts.isPrefixUnaryExpression(value) && value.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = runtime002MouseValue(
      value.operand,
      sourceFile,
      eventParameterName,
      routeParameterName,
      scenario,
    )
    return typeof operand === 'boolean' ? !operand : undefined
  }
  if (!ts.isBinaryExpression(value)) {
    return undefined
  }

  const left = runtime002MouseValue(
    value.left,
    sourceFile,
    eventParameterName,
    routeParameterName,
    scenario,
  )
  const right = runtime002MouseValue(
    value.right,
    sourceFile,
    eventParameterName,
    routeParameterName,
    scenario,
  )

  if (value.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return typeof left === 'boolean' && typeof right === 'boolean' ? left && right : undefined
  }
  if (value.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
    return typeof left === 'boolean' && typeof right === 'boolean' ? left || right : undefined
  }
  if (left === undefined || right === undefined) {
    return undefined
  }
  if (value.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return left === right
  }
  if (value.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
    return left !== right
  }

  return undefined
}

function executeRuntime002MouseStatement(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
  eventParameterName: string,
  routeParameterName: string,
  scenario: Runtime002MouseScenario,
  effect: Runtime002MouseEffect,
): void {
  if (effect.stopped || !effect.supported) {
    return
  }
  if (ts.isBlock(statement)) {
    for (const child of statement.statements) {
      executeRuntime002MouseStatement(
        child,
        sourceFile,
        eventParameterName,
        routeParameterName,
        scenario,
        effect,
      )
    }
    return
  }
  if (ts.isIfStatement(statement)) {
    const condition = runtime002MouseValue(
      statement.expression,
      sourceFile,
      eventParameterName,
      routeParameterName,
      scenario,
    )
    if (typeof condition !== 'boolean') {
      effect.supported = false
      return
    }
    const branch = condition ? statement.thenStatement : statement.elseStatement
    if (branch !== undefined) {
      executeRuntime002MouseStatement(
        branch,
        sourceFile,
        eventParameterName,
        routeParameterName,
        scenario,
        effect,
      )
    }
    return
  }
  if (ts.isReturnStatement(statement)) {
    effect.supported = statement.expression === undefined
    effect.stopped = true
    return
  }
  if (ts.isExpressionStatement(statement)) {
    const expression = unwrapExpression(statement.expression)
    if (
      ts.isCallExpression(expression) &&
      expression.arguments.length === 0 &&
      ts.isPropertyAccessExpression(expression.expression) &&
      ts.isIdentifier(expression.expression.expression) &&
      expression.expression.expression.text === eventParameterName &&
      expression.expression.name.text === 'preventDefault'
    ) {
      effect.prevented += 1
      return
    }
  }

  effect.supported = false
}

function runtime002MouseEffect(
  declaration: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  scenario: Runtime002MouseScenario,
): Runtime002MouseEffect {
  const effect: Runtime002MouseEffect = {
    prevented: 0,
    stopped: false,
    supported: declaration.body !== undefined,
  }
  const eventParameterName = declaration.parameters[0]?.name.getText(sourceFile) ?? ''
  const routeParameterName = declaration.parameters[1]?.name.getText(sourceFile) ?? ''

  if (declaration.body !== undefined) {
    executeRuntime002MouseStatement(
      declaration.body,
      sourceFile,
      eventParameterName,
      routeParameterName,
      scenario,
      effect,
    )
  }

  return effect
}

function runtime002HandlerHasProhibitedRepair(declaration: ts.FunctionDeclaration): boolean {
  let prohibited = false
  const prohibitedCalls = new Set([
    'nextTick',
    'queueMicrotask',
    'requestAnimationFrame',
    'setInterval',
    'setTimeout',
  ])
  const prohibitedMethods = new Set(['addEventListener', 'blur', 'focus', 'removeEventListener'])

  function visit(node: ts.Node): void {
    if (
      (ts.isIdentifier(node) && ['document', 'globalThis', 'window'].includes(node.text)) ||
      (ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) && prohibitedCalls.has(node.expression.text)) ||
          (ts.isPropertyAccessExpression(node.expression) &&
            prohibitedMethods.has(node.expression.name.text))))
    ) {
      prohibited = true
    }
    ts.forEachChild(node, visit)
  }

  if (declaration.body !== undefined) {
    visit(declaration.body)
  }
  return prohibited
}

function runtime002HandlerExactGuardChecks(
  declaration: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
): Readonly<{ activeRoute: boolean; primaryButton: boolean }> {
  const eventParameterName = declaration.parameters[0]?.name.getText(sourceFile) ?? ''
  const routeParameterName = declaration.parameters[1]?.name.getText(sourceFile) ?? ''
  let activeRoute = false
  let primaryButton = false

  function isEventButton(expression: ts.Expression): boolean {
    const value = unwrapExpression(expression)
    return (
      ts.isPropertyAccessExpression(value) &&
      ts.isIdentifier(value.expression) &&
      value.expression.text === eventParameterName &&
      value.name.text === 'button'
    )
  }

  function isPrimaryButtonLiteral(expression: ts.Expression): boolean {
    const value = unwrapExpression(expression)
    return ts.isNumericLiteral(value) && value.text === '0'
  }

  function isRequestedRoute(expression: ts.Expression): boolean {
    const value = unwrapExpression(expression)
    return ts.isIdentifier(value) && value.text === routeParameterName
  }

  function isActiveRoute(expression: ts.Expression): boolean {
    const value = unwrapExpression(expression)
    return (
      ts.isPropertyAccessExpression(value) &&
      ts.isIdentifier(value.expression) &&
      value.expression.text === 'props' &&
      value.name.text === 'activeRouteName'
    )
  }

  function visit(node: ts.Node): void {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    ) {
      primaryButton ||=
        (isEventButton(node.left) && isPrimaryButtonLiteral(node.right)) ||
        (isPrimaryButtonLiteral(node.left) && isEventButton(node.right))
      activeRoute ||=
        (isRequestedRoute(node.left) && isActiveRoute(node.right)) ||
        (isActiveRoute(node.left) && isRequestedRoute(node.right))
    }
    ts.forEachChild(node, visit)
  }

  if (declaration.body !== undefined) {
    visit(declaration.body)
  }

  return { activeRoute, primaryButton }
}

function runtime002NavigationValue(
  expression: ts.Expression,
  routeParameterName: string,
  scenario: Runtime002NavigationScenario,
  effect: Runtime002NavigationEffect,
): boolean | string | undefined {
  const value = unwrapExpression(expression)

  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  if (ts.isStringLiteral(value)) {
    return value.text
  }
  if (ts.isIdentifier(value) && value.text === routeParameterName) {
    return scenario.currentRoute ? 'current-route' : 'different-route'
  }
  if (ts.isPropertyAccessExpression(value)) {
    if (
      ts.isIdentifier(value.expression) &&
      value.expression.text === 'props' &&
      value.name.text === 'activeRouteName'
    ) {
      return 'current-route'
    }
    if (
      ts.isIdentifier(value.expression) &&
      value.expression.text === 'profile' &&
      value.name.text === 'value'
    ) {
      return scenario.profile
    }
    if (
      ts.isIdentifier(value.expression) &&
      value.expression.text === 'navigationOpen' &&
      value.name.text === 'value'
    ) {
      return effect.navigationOpen
    }
  }
  if (ts.isPrefixUnaryExpression(value) && value.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = runtime002NavigationValue(value.operand, routeParameterName, scenario, effect)
    return typeof operand === 'boolean' ? !operand : undefined
  }
  if (!ts.isBinaryExpression(value)) {
    return undefined
  }

  const left = runtime002NavigationValue(value.left, routeParameterName, scenario, effect)
  const right = runtime002NavigationValue(value.right, routeParameterName, scenario, effect)
  if (value.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return typeof left === 'boolean' && typeof right === 'boolean' ? left && right : undefined
  }
  if (value.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
    return typeof left === 'boolean' && typeof right === 'boolean' ? left || right : undefined
  }
  if (left === undefined || right === undefined) {
    return undefined
  }
  if (value.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return left === right
  }
  if (value.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
    return left !== right
  }

  return undefined
}

function executeRuntime002NavigationStatement(
  statement: ts.Statement,
  routeParameterName: string,
  scenario: Runtime002NavigationScenario,
  effect: Runtime002NavigationEffect,
): void {
  if (effect.stopped || !effect.supported) {
    return
  }
  if (ts.isBlock(statement)) {
    for (const child of statement.statements) {
      executeRuntime002NavigationStatement(child, routeParameterName, scenario, effect)
    }
    return
  }
  if (ts.isIfStatement(statement)) {
    const condition = runtime002NavigationValue(
      statement.expression,
      routeParameterName,
      scenario,
      effect,
    )
    if (typeof condition !== 'boolean') {
      effect.supported = false
      return
    }
    const branch = condition ? statement.thenStatement : statement.elseStatement
    if (branch !== undefined) {
      executeRuntime002NavigationStatement(branch, routeParameterName, scenario, effect)
    }
    return
  }
  if (ts.isReturnStatement(statement)) {
    effect.supported = statement.expression === undefined
    effect.stopped = true
    return
  }
  if (ts.isExpressionStatement(statement)) {
    const expression = unwrapExpression(statement.expression)
    if (
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === 'closeNavigation' &&
      expression.arguments.length === 0
    ) {
      effect.closeCount += 1
      effect.navigationOpen = false
      return
    }
    if (
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === 'emit' &&
      expression.arguments.length === 2
    ) {
      const eventName = expression.arguments[0]
      const requestedRoute = expression.arguments[1]
      if (
        eventName !== undefined &&
        requestedRoute !== undefined &&
        ts.isStringLiteral(eventName) &&
        eventName.text === 'navigate' &&
        ts.isIdentifier(requestedRoute) &&
        requestedRoute.text === routeParameterName
      ) {
        effect.emitCount += 1
        return
      }
    }
  }

  effect.supported = false
}

function runtime002NavigationEffect(
  declaration: ts.FunctionDeclaration,
  scenario: Runtime002NavigationScenario,
): Runtime002NavigationEffect {
  const effect: Runtime002NavigationEffect = {
    closeCount: 0,
    emitCount: 0,
    navigationOpen: scenario.initialNavigationOpen,
    stopped: false,
    supported: declaration.body !== undefined,
  }
  const routeParameterName = declaration.parameters[0]?.name.getText() ?? ''

  if (declaration.body !== undefined) {
    executeRuntime002NavigationStatement(declaration.body, routeParameterName, scenario, effect)
  }

  return effect
}

function runtime002CloseNavigationIsCanonical(
  declaration: ts.FunctionDeclaration | undefined,
): boolean {
  if (declaration?.body?.statements.length !== 1) {
    return false
  }
  const statement = declaration.body.statements[0]
  if (statement === undefined || !ts.isExpressionStatement(statement)) {
    return false
  }
  const expression = unwrapExpression(statement.expression)
  return (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(expression.left) &&
    ts.isIdentifier(expression.left.expression) &&
    expression.left.expression.text === 'navigationOpen' &&
    expression.left.name.text === 'value' &&
    expression.right.kind === ts.SyntaxKind.FalseKeyword
  )
}

function runtime002ButtonIsNativeAndEnabled(node: VueTemplateNode): boolean {
  return (
    node.tag === 'button' &&
    staticTemplateAttribute(node, 'type') === 'button' &&
    templateAttributes(node, 'disabled').length === 0 &&
    templateDirectives(node, 'bind', 'disabled').length === 0
  )
}

function runtime002ButtonIsSequentiallyFocusable(node: VueTemplateNode): boolean {
  const staticTabindex = templateAttributes(node, 'tabindex')
  const boundTabindex = templateDirectives(node, 'bind', 'tabindex')

  return (
    (staticTabindex.length === 0 && boundTabindex.length === 0) ||
    (staticTabindex.length === 1 &&
      staticTabindex[0]?.value?.content === '0' &&
      boundTabindex.length === 0) ||
    (boundTabindex.length === 1 &&
      normalizeTemplateExpression(boundTabindex[0]?.exp?.content) === '0' &&
      staticTabindex.length === 0)
  )
}

function runtime002AriaCurrentIsCanonical(node: VueTemplateNode): boolean {
  const bindings = templateDirectives(node, 'bind', 'aria-current')
  return (
    bindings.length === 1 &&
    normalizeTemplateExpression(bindings[0]?.exp?.content) ===
      "item.routeName === activeRouteName ? 'page' : undefined"
  )
}

function runtime002NavigationViolations(shellSource: string): string[] {
  const violations: string[] = []
  const parsedSfc = vueSfcCompiler.parse(shellSource, { filename: shellSfcPath })
  const templateAst = parsedSfc.descriptor.template?.ast

  if (parsedSfc.errors.length > 0 || templateAst === undefined) {
    return ['PAVP_RUNTIME_002_SFC_AST']
  }

  const elements = collectShellTemplateElements(templateAst)
  const drawerButtons = elements.filter(
    (element) =>
      element.node.tag === 'button' &&
      hasStaticTemplateClass(element.node, 'pavp-admin-shell__navigation-action') &&
      ancestorHasStaticAttribute(element, 'nav', 'ref', 'drawerNavigation'),
  )

  if (
    drawerButtons.length !== 1 ||
    !shellSource.includes('<PavpMenuPrimitive') ||
    !shellSource.includes(':node-props="persistentNavigationNodeProps"') ||
    !shellSource.includes(':dropdown-props="persistentNavigationDropdownProps"')
  ) {
    return ['PAVP_RUNTIME_002_NAVIGATION_SURFACES']
  }

  const drawerButton = drawerButtons[0]?.node
  if (drawerButton === undefined) {
    return ['PAVP_RUNTIME_002_NAVIGATION_SURFACES']
  }

  const shellScript = scriptContent(shellSource)
  const sourceFile = ts.createSourceFile(
    shellSfcPath,
    shellScript,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const normalNodeStart = shellScript.indexOf('const persistentNavigationNodeProps')
  const dropdownNodeStart = shellScript.indexOf('const persistentNavigationDropdownNodeProps')
  const dropdownPropsStart = shellScript.indexOf('const persistentNavigationDropdownProps')
  const normalNodeSource = shellScript.slice(normalNodeStart, dropdownNodeStart)
  const dropdownNodeSource = shellScript.slice(dropdownNodeStart, dropdownPropsStart)
  const guardCall = 'preserveCurrentPersistentNavigationFocus(event, routeName)'
  const drawerPointerdown = templateDirectives(drawerButton, 'on', 'pointerdown')
  const drawerClick = templateDirectives(drawerButton, 'on', 'click')
  const drawerKeydown = templateDirectives(drawerButton, 'on', 'keydown')

  if (!normalNodeSource.includes(guardCall) || !dropdownNodeSource.includes(guardCall)) {
    violations.push('PAVP_RUNTIME_002_PERSISTENT_MOUSEDOWN_BINDING')
  }
  if (
    !shellScript.includes('function handleNavigationValueUpdate(value: string | number): void') ||
    !shellScript.includes('navigate(value)')
  ) {
    violations.push('PAVP_RUNTIME_002_PERSISTENT_CLICK_CONTRACT')
  }
  if (drawerPointerdown.length !== 0) {
    violations.push('PAVP_RUNTIME_002_DRAWER_GUARD_ABSENT')
  }
  if (
    drawerClick.length !== 1 ||
    normalizeTemplateExpression(drawerClick[0]?.exp?.content) !== 'navigate(item.routeName)'
  ) {
    violations.push('PAVP_RUNTIME_002_DRAWER_CLOSE_LIFECYCLE')
  }
  if (
    drawerKeydown.length !== 1 ||
    normalizeTemplateExpression(drawerKeydown[0]?.exp?.content) !== 'handleDrawerKeydown'
  ) {
    violations.push('PAVP_RUNTIME_002_DRAWER_CLOSE_LIFECYCLE')
  }
  if (
    !runtime002ButtonIsNativeAndEnabled(drawerButton) ||
    /disabled\s*:/u.test(normalNodeSource) ||
    /disabled\s*:/u.test(dropdownNodeSource)
  ) {
    violations.push('PAVP_RUNTIME_002_NATIVE_BUTTON')
  }
  if (
    [
      ...shellScript.matchAll(
        /'aria-current': routeName === props\.activeRouteName \? 'page' : undefined/gu,
      ),
    ].length !== 2 ||
    !runtime002AriaCurrentIsCanonical(drawerButton)
  ) {
    violations.push('PAVP_RUNTIME_002_ARIA_CURRENT')
  }
  if (
    !runtime002ButtonIsSequentiallyFocusable(drawerButton) ||
    [...normalNodeSource.matchAll(/tabindex: 0/gu)].length !== 2 ||
    !normalNodeSource.includes('handleRootNavigationKeydown(event, groupKey)') ||
    !normalNodeSource.includes('handleRouteNavigationKeydown(event, routeName)')
  ) {
    violations.push('PAVP_RUNTIME_002_KEYBOARD_FOCUSABILITY')
  }

  const handler = functionDeclaration(sourceFile, 'preserveCurrentPersistentNavigationFocus')
  const handlerExported =
    handler !== undefined &&
    ts.getModifiers(handler)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)

  if (
    handler === undefined ||
    handlerExported ||
    handler.parameters.length !== 2 ||
    handler.parameters[0]?.type?.getText(sourceFile) !== 'PointerEvent' ||
    handler.parameters[1]?.type?.getText(sourceFile) !== 'string' ||
    handler.type?.getText(sourceFile) !== 'void'
  ) {
    violations.push('PAVP_RUNTIME_002_HANDLER_INPUT')
  } else {
    const exactGuardChecks = runtime002HandlerExactGuardChecks(handler, sourceFile)
    const primaryCurrent = runtime002MouseEffect(handler, sourceFile, {
      button: 0,
      currentRoute: true,
    })
    const primaryDifferent = runtime002MouseEffect(handler, sourceFile, {
      button: 0,
      currentRoute: false,
    })
    const secondaryCurrent = runtime002MouseEffect(handler, sourceFile, {
      button: 1,
      currentRoute: true,
    })
    const secondaryDifferent = runtime002MouseEffect(handler, sourceFile, {
      button: 1,
      currentRoute: false,
    })

    if (
      !exactGuardChecks.primaryButton ||
      !primaryCurrent.supported ||
      primaryCurrent.prevented !== 1
    ) {
      violations.push('PAVP_RUNTIME_002_PRIMARY_CURRENT_GUARD')
    }
    if (
      !secondaryCurrent.supported ||
      !secondaryDifferent.supported ||
      secondaryCurrent.prevented !== 0 ||
      secondaryDifferent.prevented !== 0
    ) {
      violations.push('PAVP_RUNTIME_002_PRIMARY_CURRENT_GUARD')
    }
    if (
      !exactGuardChecks.activeRoute ||
      !primaryDifferent.supported ||
      primaryDifferent.prevented !== 0
    ) {
      violations.push('PAVP_RUNTIME_002_DIFFERENT_ROUTE_DEFAULT')
    }
    if (runtime002HandlerHasProhibitedRepair(handler)) {
      violations.push('PAVP_RUNTIME_002_PROHIBITED_REPAIR')
    }
  }

  const navigate = functionDeclaration(sourceFile, 'navigate')
  const closeNavigation = functionDeclaration(sourceFile, 'closeNavigation')
  const navigateIsCanonical =
    navigate?.parameters.length === 1 &&
    navigate.parameters[0]?.type?.getText(sourceFile) === 'string' &&
    navigate.type?.getText(sourceFile) === 'void'
  if (!navigateIsCanonical) {
    violations.push(
      'PAVP_RUNTIME_002_CURRENT_ROUTE_NOOP',
      'PAVP_RUNTIME_002_DIFFERENT_ROUTE_NAVIGATION',
      'PAVP_RUNTIME_002_DRAWER_CLOSE_LIFECYCLE',
    )
  } else {
    const persistentCurrent = runtime002NavigationEffect(navigate, {
      currentRoute: true,
      initialNavigationOpen: false,
      profile: 'wide',
    })
    const persistentDifferent = runtime002NavigationEffect(navigate, {
      currentRoute: false,
      initialNavigationOpen: false,
      profile: 'wide',
    })
    const drawerCurrent = runtime002NavigationEffect(navigate, {
      currentRoute: true,
      initialNavigationOpen: true,
      profile: 'narrow',
    })
    const drawerDifferent = runtime002NavigationEffect(navigate, {
      currentRoute: false,
      initialNavigationOpen: true,
      profile: 'narrow',
    })

    if (
      !persistentCurrent.supported ||
      !drawerCurrent.supported ||
      persistentCurrent.emitCount !== 0 ||
      drawerCurrent.emitCount !== 0
    ) {
      violations.push('PAVP_RUNTIME_002_CURRENT_ROUTE_NOOP')
    }
    if (
      !persistentDifferent.supported ||
      !drawerDifferent.supported ||
      persistentDifferent.emitCount !== 1 ||
      drawerDifferent.emitCount !== 1
    ) {
      violations.push('PAVP_RUNTIME_002_DIFFERENT_ROUTE_NAVIGATION')
    }
    if (
      !runtime002CloseNavigationIsCanonical(closeNavigation) ||
      persistentCurrent.closeCount !== 0 ||
      persistentDifferent.closeCount !== 0 ||
      drawerCurrent.closeCount !== 1 ||
      drawerDifferent.closeCount !== 1 ||
      drawerCurrent.navigationOpen ||
      drawerDifferent.navigationOpen
    ) {
      violations.push('PAVP_RUNTIME_002_DRAWER_CLOSE_LIFECYCLE')
    }
  }

  const shellRules = cssRuleBlocks(styleContent(shellSource))
  const drawerFocusDeclarations = cssDeclarationsForSelector(
    shellRules,
    '.pavp-admin-shell__navigation-action:focus-visible',
  )
  const persistentFocusDeclarations = cssDeclarationsForSelector(
    shellRules,
    "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
  )
  const focusSuppression = shellRules.some(
    (rule) =>
      rule.selector.includes('.pavp-admin-shell__navigation-action') &&
      (/\b(?:display\s*:\s*none|pointer-events\s*:\s*none|visibility\s*:\s*hidden)\b/iu.test(
        rule.declarations,
      ) ||
        (rule.selector.includes(':focus') &&
          /\boutline\s*:\s*none\b/iu.test(rule.declarations) &&
          !/\bbox-shadow\s*:\s*var\(--ui-[a-z0-9-]+\)/iu.test(rule.declarations))),
  )
  if (
    drawerFocusDeclarations === undefined ||
    persistentFocusDeclarations === undefined ||
    !/\bbox-shadow\s*:\s*var\(--ui-[a-z0-9-]+\)/iu.test(drawerFocusDeclarations) ||
    !/\bbox-shadow\s*:\s*var\(--ui-[a-z0-9-]+\)/iu.test(persistentFocusDeclarations) ||
    focusSuppression
  ) {
    violations.push('PAVP_RUNTIME_002_FOCUS_PRESENTATION')
  }

  return [...new Set(violations)]
}

function runtime003PointerValue(
  expression: ts.Expression,
  eventParameterName: string,
  scenario: Runtime003PointerScenario,
): boolean | number | string | undefined {
  const value = unwrapExpression(expression)

  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  if (ts.isNumericLiteral(value)) {
    return Number(value.text)
  }
  if (
    ts.isPropertyAccessExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === eventParameterName
  ) {
    if (value.name.text === 'button') {
      return scenario.button
    }
    if (value.name.text === 'target') {
      return scenario.selfTarget ? 'self-target' : 'pointer-target'
    }
    if (value.name.text === 'currentTarget') {
      return scenario.selfTarget ? 'self-target' : 'current-target'
    }
  }
  if (ts.isPrefixUnaryExpression(value) && value.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = runtime003PointerValue(value.operand, eventParameterName, scenario)
    return typeof operand === 'boolean' ? !operand : undefined
  }
  if (!ts.isBinaryExpression(value)) {
    return undefined
  }

  const left = runtime003PointerValue(value.left, eventParameterName, scenario)
  const right = runtime003PointerValue(value.right, eventParameterName, scenario)
  if (value.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return typeof left === 'boolean' && typeof right === 'boolean' ? left && right : undefined
  }
  if (value.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
    return typeof left === 'boolean' && typeof right === 'boolean' ? left || right : undefined
  }
  if (left === undefined || right === undefined) {
    return undefined
  }
  if (value.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return left === right
  }
  if (value.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
    return left !== right
  }

  return undefined
}

function executeRuntime003PointerStatement(
  statement: ts.Statement,
  eventParameterName: string,
  scenario: Runtime003PointerScenario,
  effect: Runtime003PointerEffect,
): void {
  if (effect.stopped || !effect.supported) {
    return
  }
  if (ts.isBlock(statement)) {
    for (const child of statement.statements) {
      executeRuntime003PointerStatement(child, eventParameterName, scenario, effect)
    }
    return
  }
  if (ts.isIfStatement(statement)) {
    const condition = runtime003PointerValue(statement.expression, eventParameterName, scenario)
    if (typeof condition !== 'boolean') {
      effect.supported = false
      return
    }
    const branch = condition ? statement.thenStatement : statement.elseStatement
    if (branch !== undefined) {
      executeRuntime003PointerStatement(branch, eventParameterName, scenario, effect)
    }
    return
  }
  if (ts.isReturnStatement(statement)) {
    effect.supported = statement.expression === undefined
    effect.stopped = true
    return
  }
  if (ts.isExpressionStatement(statement)) {
    const expression = unwrapExpression(statement.expression)
    if (ts.isCallExpression(expression)) {
      if (
        ts.isPropertyAccessExpression(expression.expression) &&
        ts.isIdentifier(expression.expression.expression) &&
        expression.expression.expression.text === eventParameterName &&
        expression.expression.name.text === 'preventDefault' &&
        expression.arguments.length === 0
      ) {
        effect.prevented += 1
        effect.operations.push('preventDefault')
        return
      }
      if (
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === 'closeNavigation' &&
        expression.arguments.length === 0
      ) {
        effect.closeCount += 1
        effect.operations.push('closeNavigation')
        return
      }
    }
  }

  effect.supported = false
}

function runtime003PointerEffect(
  declaration: ts.FunctionDeclaration,
  scenario: Runtime003PointerScenario,
): Runtime003PointerEffect {
  const effect: Runtime003PointerEffect = {
    closeCount: 0,
    operations: [],
    prevented: 0,
    stopped: false,
    supported: declaration.body !== undefined,
  }
  const eventParameterName = declaration.parameters[0]?.name.getText() ?? ''

  if (declaration.body !== undefined) {
    executeRuntime003PointerStatement(declaration.body, eventParameterName, scenario, effect)
  }

  return effect
}

function runtime003HandlerGuardChecks(
  declaration: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
): Readonly<{ primaryButton: boolean; selfTarget: boolean }> {
  const eventParameterName = declaration.parameters[0]?.name.getText(sourceFile) ?? ''
  let primaryButton = false
  let selfTarget = false

  function eventProperty(expression: ts.Expression, property: string): boolean {
    const value = unwrapExpression(expression)
    return (
      ts.isPropertyAccessExpression(value) &&
      ts.isIdentifier(value.expression) &&
      value.expression.text === eventParameterName &&
      value.name.text === property
    )
  }

  function isPrimaryButtonLiteral(expression: ts.Expression): boolean {
    const value = unwrapExpression(expression)
    return ts.isNumericLiteral(value) && Number(value.text) === 0
  }

  function visit(node: ts.Node): void {
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken)
    ) {
      primaryButton ||=
        (eventProperty(node.left, 'button') && isPrimaryButtonLiteral(node.right)) ||
        (eventProperty(node.right, 'button') && isPrimaryButtonLiteral(node.left))
      selfTarget ||=
        (eventProperty(node.left, 'target') && eventProperty(node.right, 'currentTarget')) ||
        (eventProperty(node.right, 'target') && eventProperty(node.left, 'currentTarget'))
    }
    ts.forEachChild(node, visit)
  }

  if (declaration.body !== undefined) {
    visit(declaration.body)
  }

  return { primaryButton, selfTarget }
}

function runtime003HasGlobalPointerListener(sourceFile: ts.SourceFile): boolean {
  let found = false

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const eventName =
        node.arguments[0] === undefined ? undefined : unwrapExpression(node.arguments[0])
      if (
        node.expression.name.text === 'addEventListener' &&
        eventName !== undefined &&
        ts.isStringLiteral(eventName) &&
        eventName.text === 'pointerdown'
      ) {
        found = true
      }
    }
    if (ts.isBinaryExpression(node)) {
      const left = unwrapExpression(node.left)
      if (
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(left) &&
        left.name.text === 'onpointerdown'
      ) {
        found = true
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return found
}

function runtime003HandlerHasProhibitedRepair(declaration: ts.FunctionDeclaration): boolean {
  let prohibited = false
  const prohibitedCalls = new Set(['nextTick', 'requestAnimationFrame', 'setTimeout'])
  const prohibitedMethods = new Set([
    'blur',
    'focus',
    'releasePointerCapture',
    'setPointerCapture',
    'stopImmediatePropagation',
    'stopPropagation',
  ])

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && prohibitedCalls.has(node.expression.text)) {
        prohibited = true
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        prohibitedMethods.has(node.expression.name.text)
      ) {
        prohibited = true
      }
    }
    ts.forEachChild(node, visit)
  }

  if (declaration.body !== undefined) {
    visit(declaration.body)
  }

  return prohibited
}

function logicalCompiledShellSelector(selector: string): string {
  return normalizedCssSelector(selector.replaceAll(`[${shellSfcScopeId}]`, ''))
}

function logicalCompiledShellRules(compiled: CompiledSfcStyles): readonly CssRuleBlock[] {
  return compiled.blocks.flatMap((block) =>
    block.rules.map((rule) => ({
      declarations: rule.declarations,
      selector: rule.selector.split(',').map(logicalCompiledShellSelector).join(', '),
    })),
  )
}

function selectorFinalCompound(selector: string): string {
  const normalized = logicalCompiledShellSelector(selector)
  return (
    normalized
      .split(/\s+|[>+~]/u)
      .filter(Boolean)
      .at(-1) ?? ''
  )
}

function selectorFinalTargetHasClass(selector: string, className: string): boolean {
  return selectorFinalCompound(selector).includes(className)
}

function selectorTargetsDrawerOuter(selector: string): boolean {
  const finalCompound = selectorFinalCompound(selector)
  return (
    finalCompound.includes('.pavp-admin-shell__drawer-layer') ||
    (finalCompound.includes('.pavp-admin-drawer-') &&
      !finalCompound.includes('.pavp-admin-shell__drawer-navigation'))
  )
}

function runtime003SourceViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = []
  const parsedShell = vueSfcCompiler.parse(snapshot.shellSource, { filename: shellSfcPath })
  const parsedProvider = vueSfcCompiler.parse(snapshot.uiProviderSource, {
    filename: 'packages/ui/src/providers/UiProvider.vue',
  })
  const shellTemplateAst = parsedShell.descriptor.template?.ast
  const providerTemplateAst = parsedProvider.descriptor.template?.ast

  if (
    parsedShell.errors.length > 0 ||
    parsedProvider.errors.length > 0 ||
    shellTemplateAst === undefined ||
    providerTemplateAst === undefined
  ) {
    return ['PAVP_RUNTIME_003_SFC_AST']
  }

  const shellElements = collectShellTemplateElements(shellTemplateAst)
  const providerElements = collectShellTemplateElements(providerTemplateAst)
  const outerOverlays = shellElements.filter((element) =>
    hasStaticTemplateClass(element.node, 'pavp-admin-shell__drawer-layer'),
  )
  const innerPanels = shellElements.filter((element) =>
    hasStaticTemplateClass(element.node, 'pavp-admin-shell__drawer-navigation'),
  )
  const transitions = shellElements.filter(
    (element) =>
      element.node.tag === 'Transition' &&
      staticTemplateAttribute(element.node, 'name') === 'pavp-admin-drawer',
  )
  const teleports = shellElements.filter((element) => element.node.tag === 'Teleport')
  const overlayRoots = providerElements.filter(
    (element) => staticTemplateAttribute(element.node, 'id') === 'pavp-overlay-root',
  )
  const outerOverlay = outerOverlays[0]
  const innerPanel = innerPanels[0]
  const transition = transitions[0]
  const teleport = teleports[0]
  const nearestElementAncestor = (element: ShellTemplateElement): VueTemplateNode | undefined =>
    [...element.ancestors].reverse().find((node) => node.type === 1)

  if (
    outerOverlays.length !== 1 ||
    innerPanels.length !== 1 ||
    outerOverlay === undefined ||
    innerPanel === undefined ||
    outerOverlay.node === innerPanel.node ||
    nearestElementAncestor(innerPanel) !== outerOverlay.node
  ) {
    violations.push('PAVP_RUNTIME_003_DRAWER_STRUCTURE')
  }

  if (
    transitions.length !== 1 ||
    teleports.length !== 1 ||
    transition === undefined ||
    teleport === undefined ||
    outerOverlay === undefined ||
    nearestElementAncestor(outerOverlay) !== transition.node ||
    nearestElementAncestor(transition) !== teleport.node ||
    staticTemplateAttribute(teleport.node, 'to') !== '#pavp-overlay-root' ||
    overlayRoots.length !== 1 ||
    overlayRoots[0]?.node.tag !== 'div' ||
    [...snapshot.nonAdapterUiSource.matchAll(/id="pavp-overlay-root"/gu)].length !== 1
  ) {
    violations.push('PAVP_RUNTIME_003_OVERLAY_OWNERSHIP')
  }

  const pointerdownBindings = shellElements.flatMap((element) =>
    templateDirectives(element.node, 'on', 'pointerdown').map((directive) => ({
      directive,
      element,
    })),
  )
  const outerPointerdown =
    outerOverlay === undefined ? [] : templateDirectives(outerOverlay.node, 'on', 'pointerdown')
  const innerPointerdown =
    innerPanel === undefined ? [] : templateDirectives(innerPanel.node, 'on', 'pointerdown')
  const exactPointerExpression = 'handleDrawerScrimPointerDown($event)'

  if (
    outerPointerdown.length !== 1 ||
    pointerdownBindings.length !== 1 ||
    pointerdownBindings[0]?.element !== outerOverlay ||
    (outerPointerdown[0]?.modifiers?.length ?? 0) !== 0 ||
    normalizeTemplateExpression(outerPointerdown[0]?.exp?.content) !== exactPointerExpression
  ) {
    violations.push('PAVP_RUNTIME_003_OUTER_POINTER_BINDING')
  }
  if (innerPointerdown.length !== 0) {
    violations.push('PAVP_RUNTIME_003_INNER_POINTER_BOUNDARY')
  }

  const shellScript = scriptContent(snapshot.shellSource)
  const sourceFile = ts.createSourceFile(
    shellSfcPath,
    shellScript,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const handler = functionDeclaration(sourceFile, 'handleDrawerScrimPointerDown')
  const handlerExported =
    handler !== undefined &&
    ts.getModifiers(handler)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)

  if (
    handler === undefined ||
    handlerExported ||
    handler.parameters.length !== 1 ||
    handler.parameters[0]?.type?.getText(sourceFile) !== 'PointerEvent' ||
    handler.type?.getText(sourceFile) !== 'void'
  ) {
    violations.push('PAVP_RUNTIME_003_HANDLER_INPUT')
  } else {
    const guards = runtime003HandlerGuardChecks(handler, sourceFile)
    const primarySelf = runtime003PointerEffect(handler, { button: 0, selfTarget: true })
    const nonPrimarySelf = runtime003PointerEffect(handler, { button: 1, selfTarget: true })
    const primaryInner = runtime003PointerEffect(handler, { button: 0, selfTarget: false })
    const nonPrimaryInner = runtime003PointerEffect(handler, { button: 1, selfTarget: false })

    if (
      !guards.primaryButton ||
      !nonPrimarySelf.supported ||
      !nonPrimaryInner.supported ||
      nonPrimarySelf.prevented !== 0 ||
      nonPrimarySelf.closeCount !== 0 ||
      nonPrimaryInner.prevented !== 0 ||
      nonPrimaryInner.closeCount !== 0
    ) {
      violations.push('PAVP_RUNTIME_003_PRIMARY_BUTTON_GUARD')
    }
    if (
      !guards.selfTarget ||
      !primaryInner.supported ||
      primaryInner.prevented !== 0 ||
      primaryInner.closeCount !== 0
    ) {
      violations.push('PAVP_RUNTIME_003_SELF_TARGET_GUARD')
    }
    if (
      !primarySelf.supported ||
      primarySelf.prevented !== 1 ||
      primarySelf.closeCount !== 1 ||
      !isDeepStrictEqual(primarySelf.operations, ['preventDefault', 'closeNavigation'])
    ) {
      violations.push('PAVP_RUNTIME_003_POINTER_ACTION_ORDER')
    }
    if (runtime003HandlerHasProhibitedRepair(handler)) {
      violations.push('PAVP_RUNTIME_003_PROHIBITED_POINTER_REPAIR')
    }
  }

  if (runtime003HasGlobalPointerListener(sourceFile)) {
    violations.push('PAVP_RUNTIME_003_GLOBAL_POINTER_LISTENER')
  }

  if (
    innerPanel === undefined ||
    staticTemplateAttribute(innerPanel.node, 'role') !== 'dialog' ||
    staticTemplateAttribute(innerPanel.node, 'aria-modal') !== 'true' ||
    staticTemplateAttribute(innerPanel.node, 'aria-label') !== '架构导航' ||
    staticTemplateAttribute(innerPanel.node, 'tabindex') !== '-1' ||
    staticTemplateAttribute(innerPanel.node, 'ref') !== 'drawerNavigation'
  ) {
    violations.push('PAVP_RUNTIME_003_DIALOG_SEMANTICS')
  }

  const mainElements = shellElements.filter((element) => element.node.tag === 'main')
  const mainInertBindings =
    mainElements[0] === undefined ? [] : templateDirectives(mainElements[0].node, 'bind', 'inert')
  if (
    mainElements.length !== 1 ||
    mainInertBindings.length !== 1 ||
    normalizeTemplateExpression(mainInertBindings[0]?.exp?.content) !==
      "profile === 'narrow' && navigationOpen"
  ) {
    violations.push('PAVP_RUNTIME_003_MAIN_INERT')
  }

  const normalizedScript = shellScript.replaceAll(/\s+/gu, ' ')
  const focusLifecycleMarkers = [
    'document.activeElement instanceof HTMLElement',
    'focusReturnTarget =',
    'navigationOpen.value = true',
    "if (event.key === 'Escape')",
    "if (event.key !== 'Tab')",
    "drawerNavigation.value?.querySelectorAll<HTMLButtonElement>('button')",
    'drawerClose.value?.focus()',
    'focusReturnTarget?.isConnected === true',
    'focusReturnTarget.focus()',
    'focusReturnTarget = null',
  ] as const
  if (
    focusLifecycleMarkers.some((marker) => !normalizedScript.includes(marker)) ||
    [...shellScript.matchAll(/\bnextTick\s*\(/gu)].length !== 1 ||
    [...shellScript.matchAll(/\bwatch\s*\(\s*navigationOpen\b/gu)].length !== 1 ||
    !snapshot.shellSource.includes('ref="drawerClose"') ||
    !snapshot.shellSource.includes('@click="closeNavigation"') ||
    !snapshot.shellSource.includes('@keydown="handleDrawerKeydown"')
  ) {
    violations.push('PAVP_RUNTIME_003_FOCUS_LIFECYCLE')
  }

  if (
    runtime002NavigationViolations(snapshot.shellSource).length > 0 ||
    !snapshot.shellSource.includes('v-if="profile !== \'narrow\'"') ||
    !snapshot.shellSource.includes('<PavpMenuPrimitive') ||
    !snapshot.shellSource.includes(':collapsed="persistentNavigationCollapsed"')
  ) {
    violations.push('PAVP_RUNTIME_003_PERSISTENT_NAVIGATION')
  }

  const compiled = compileSfcStyles(snapshot.shellSource)
  if (compiled.errors.length > 0) {
    violations.push('PAVP_RUNTIME_003_COMPILED_CSS')
    return [...new Set(violations)]
  }
  const rules = logicalCompiledShellRules(compiled)
  const outerSelector = '.pavp-admin-shell__drawer-layer'
  const innerSelector = '.pavp-admin-shell__drawer-navigation'
  const outerDeclarations = cssDeclarationsForSelector(rules, outerSelector)
  const innerDeclarations = cssDeclarationsForSelector(rules, innerSelector)

  if (
    outerDeclarations === undefined ||
    !selectorHasDeclarations(rules, outerSelector, {
      background: 'var(--ui-color-scrim-viewport)',
      'inset-block': '0',
      'inset-inline': '0',
      position: 'fixed',
      'z-index': 'var(--ui-z-overlay)',
    }) ||
    /(?:^|;)\s*(?:inline-size|max-inline-size)\s*:/imu.test(outerDeclarations) ||
    outerDeclarations.includes('--ui-layout-admin-drawer-maximum-inline-size')
  ) {
    violations.push('PAVP_RUNTIME_003_OUTER_VIEWPORT')
  }
  if (!outerDeclarations?.includes('var(--ui-color-scrim-viewport)')) {
    violations.push('PAVP_RUNTIME_003_SCRIM_TOKEN')
  }
  if (
    innerDeclarations === undefined ||
    !selectorHasDeclarations(rules, innerSelector, {
      'block-size': '100%',
      'inline-size': '100%',
      'max-inline-size': 'var(--ui-layout-admin-drawer-maximum-inline-size)',
      overflow: 'auto',
      background: 'var(--ui-material-overlay-background)',
      'box-shadow': 'var(--ui-admin-shadow-overlay)',
    }) ||
    !innerDeclarations.includes('var(--pavp-safe-area-top)') ||
    !innerDeclarations.includes('var(--pavp-safe-area-bottom)') ||
    !innerDeclarations.includes('var(--pavp-safe-area-left)') ||
    !innerDeclarations.includes('var(--pavp-safe-area-right)')
  ) {
    violations.push('PAVP_RUNTIME_003_INNER_PANEL')
  }

  const maximumWidthConsumers = rules.filter((rule) =>
    rule.declarations.includes('--ui-layout-admin-drawer-maximum-inline-size'),
  )
  if (
    maximumWidthConsumers.length === 0 ||
    maximumWidthConsumers.some((rule) =>
      rule.selector
        .split(',')
        .some((selector) => !selectorFinalTargetHasClass(selector, innerSelector)),
    )
  ) {
    violations.push('PAVP_RUNTIME_003_MAXIMUM_WIDTH_OWNER')
  }

  const prohibitedOuterProperties = new Set([
    '-webkit-backdrop-filter',
    'animation',
    'animation-delay',
    'animation-duration',
    'backdrop-filter',
    'filter',
    'opacity',
    'transform',
    'translate',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
  ])
  const outerRules = rules.filter((rule) =>
    rule.selector.split(',').some(selectorTargetsDrawerOuter),
  )
  const drawerMotionRules = rules.filter(
    (rule) =>
      rule.selector.includes('pavp-admin-drawer-') &&
      cssDeclarationNames(rule.declarations).some((property) =>
        /^(?:transform|translate|transition)(?:-|$)/u.test(property),
      ),
  )
  if (
    outerRules.some((rule) =>
      cssDeclarationNames(rule.declarations).some((property) =>
        prohibitedOuterProperties.has(property),
      ),
    ) ||
    drawerMotionRules.length === 0 ||
    drawerMotionRules.some((rule) =>
      rule.selector
        .split(',')
        .filter((selector) => selector.includes('pavp-admin-drawer-'))
        .some((selector) => !selectorFinalTargetHasClass(selector, innerSelector)),
    )
  ) {
    violations.push('PAVP_RUNTIME_003_DRAWER_MOTION_TARGET')
  }

  const fullMotionActiveSelectors = [
    '.pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation',
    '.pavp-admin-drawer-leave-active .pavp-admin-shell__drawer-navigation',
  ] as const
  const fullMotionDisplacementSelectors = [
    '.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation',
    '.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation',
  ] as const
  if (
    fullMotionActiveSelectors.some(
      (selector) =>
        !selectorHasDeclarations(rules, selector, {
          'transition-duration': 'var(--ui-motion-duration)',
          'transition-property': 'transform',
          'transition-timing-function': 'var(--ui-motion-easing)',
        }),
    ) ||
    fullMotionDisplacementSelectors.some(
      (selector) =>
        !selectorHasDeclarations(rules, selector, {
          transform: 'translateX(calc(var(--ui-layout-admin-drawer-maximum-inline-size) * -1))',
        }),
    )
  ) {
    violations.push('PAVP_RUNTIME_003_DRAWER_MOTION_TARGET')
  }

  const reducedMotionActiveSelectors = [
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation",
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active .pavp-admin-shell__drawer-navigation",
  ] as const
  const reducedMotionDisplacementSelectors = [
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation",
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation",
  ] as const
  if (
    reducedMotionActiveSelectors.some(
      (selector) =>
        !selectorHasDeclarations(rules, selector, {
          'transition-duration': 'calc(var(--ui-motion-duration) / 2)',
        }),
    ) ||
    reducedMotionDisplacementSelectors.some(
      (selector) =>
        !selectorHasDeclarations(rules, selector, {
          transform: 'translateX(calc(var(--ui-space-content-gap) * -1))',
        }),
    )
  ) {
    violations.push('PAVP_RUNTIME_003_REDUCED_MOTION')
  }

  const noneMotionActiveSelectors = [
    "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation",
    "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active .pavp-admin-shell__drawer-navigation",
  ] as const
  const noneMotionDisplacementSelectors = [
    "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation",
    "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation",
  ] as const
  if (
    noneMotionActiveSelectors.some(
      (selector) => !selectorHasDeclarations(rules, selector, { transition: 'none' }),
    ) ||
    noneMotionDisplacementSelectors.some(
      (selector) => !selectorHasDeclarations(rules, selector, { transform: 'none' }),
    )
  ) {
    violations.push('PAVP_RUNTIME_003_NONE_MOTION')
  }

  if (
    rules.some(
      (rule) =>
        (rule.selector.includes('pavp-admin-shell__drawer-layer') ||
          rule.selector.includes('pavp-admin-drawer-leave')) &&
        /(?:^|;)\s*pointer-events\s*:\s*none\s*(?:;|$)/imu.test(rule.declarations),
    )
  ) {
    violations.push('PAVP_RUNTIME_003_LEAVE_POINTER_INTERCEPTION')
  }

  if (
    runtimeNumber(routeRegistry.length) !== 17 ||
    runtimeNumber(runtimeKernelConsoleProjection.stepCount) !== 11 ||
    !isDeepStrictEqual(runtimeKernelConsoleProjection.activeProviderIds, ['pinia', 'appearance']) ||
    runtimeNumber(storageConsoleProjection.recordCount) !== 2 ||
    runtimeNumber(designSystemConsoleProjection.builtInThemeIds.length) !== 14
  ) {
    violations.push('PAVP_RUNTIME_003_PRESERVED_AUTHORITIES')
  }

  return [...new Set(violations)]
}

function shellExperienceViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = []
  const normalizedNaiveProvider = snapshot.naiveProviderSource.replaceAll(/\s+/gu, ' ')
  const compiledStateViolations = compiledShellStateViolations(snapshot.shellSource)
  violations.push(...compiledStateViolations)
  violations.push(...runtime002NavigationViolations(snapshot.shellSource))
  const allowedShellMaterialVariables = new Set([
    '--ui-material-chrome-background',
    '--ui-material-overlay-background',
  ])
  const shellMaterialVariables = [
    ...snapshot.shellSource.matchAll(/--ui-material-[a-z0-9-]+/gu),
  ].map((match) => match[0])
  const backdropLines = snapshot.shellSource
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) => line.startsWith('backdrop-filter:') || line.startsWith('-webkit-backdrop-filter:'),
    )
  const allowedBackdropDeclarations = new Set([
    '-webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));',
    'backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));',
    '-webkit-backdrop-filter: none;',
    'backdrop-filter: none;',
  ])
  const filterLines = snapshot.shellSource
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('filter:'))

  if (/pavp-admin-shell__profile|\{\{\s*profile\s*\}\}/u.test(snapshot.shellSource)) {
    violations.push('PROFILE_DEBUG_TEXT')
  }
  if (/\bmax-w-content\b/u.test(snapshot.shellSource)) {
    violations.push('ADMIN_WORKSPACE_MAX_WIDTH')
  }

  const navigationIconRecords = [
    ...snapshot.routeRegistrySource.matchAll(/\biconClass\s*:\s*['"]([^'"]+)['"]/gu),
  ].map((match) => match[1])
  const shellNavigationIconClasses = [
    ...snapshot.shellSource.matchAll(/['"](i-lucide-[a-z0-9-]+)['"]/gu),
  ].map((match) => match[1])
  const expectedHeaderActionIconClasses = [
    'i-lucide-list-collapse',
    'i-lucide-list-tree',
    'i-lucide-panel-left-open',
    'i-lucide-panel-left-close',
  ]
  if (
    !isDeepStrictEqual(navigationIconRecords, expectedNavigationIconClasses) ||
    !isDeepStrictEqual(shellNavigationIconClasses, expectedNavigationIconClasses) ||
    expectedHeaderActionIconClasses.some(
      (iconClass) => !snapshot.shellSource.includes(iconClass),
    ) ||
    /\bglyph\s*:/u.test(snapshot.routeRegistrySource) ||
    !snapshot.shellSource.includes(':class="resolveNavigationIconClass(item.iconClass)"') ||
    !snapshot.shellSource.includes('class="pavp-admin-shell__navigation-icon"') ||
    !snapshot.shellSource.includes(
      'data-pavp-admin-navigation-collapse-control="header-trailing"',
    ) ||
    !snapshot.shellSource.includes('aria-hidden="true"')
  ) {
    violations.push('SIDEBAR_ICON_CONTRACT')
  }

  const navigationButtonTags = [
    ...snapshot.shellSource.matchAll(
      /<button\b(?=[^>]*:aria-current\s*=\s*"item\.routeName\s*===\s*activeRouteName\s*\?\s*'page'\s*:\s*undefined")[^>]*>/gu,
    ),
  ].map((match) => match[0])
  if (
    navigationButtonTags.length !== 1 ||
    navigationButtonTags.some(
      (tag) =>
        !/\btype\s*=\s*"button"/u.test(tag) ||
        !/@click\s*=\s*"navigate\(item\.routeName\)"/u.test(tag) ||
        /\bdisabled\b|\btabindex\s*=\s*"-1"/u.test(tag),
    ) ||
    [
      ...snapshot.shellSource.matchAll(
        /'aria-current': routeName === props\.activeRouteName \? 'page' : undefined/gu,
      ),
    ].length !== 2
  ) {
    violations.push('ACTIVE_NAVIGATION_ITEM_ACCESSIBILITY')
  }

  const activeNavigationNoop =
    /function\s+navigate\s*\([^)]*\)\s*:\s*void\s*\{[\s\S]*?if\s*\(\s*profile\.value\s*===\s*'narrow'\s*&&\s*navigationOpen\.value\s*\)\s*\{\s*closeNavigation\(\)\s*\}[\s\S]*?if\s*\(\s*routeName\s*===\s*props\.activeRouteName\s*\)\s*\{\s*return\s*\}[\s\S]*?emit\(\s*'navigate'\s*,\s*routeName\s*\)/u.test(
      snapshot.shellSource,
    )
  if (!activeNavigationNoop) {
    violations.push('ACTIVE_NAVIGATION_ITEM_NOOP')
  }

  if (/\{material\.[^}]*\.adaptive\.[^}]*\}/u.test(snapshot.adminTokenSource)) {
    violations.push('ADMIN_ADAPTIVE_PIN')
  }

  if (
    compiledStateViolations.some((violation) =>
      [
        'MATERIAL_ADAPTIVE_TARGETS',
        'MATERIAL_INERT_TARGETS',
        'MATERIAL_REDUCED_SHADOW_TARGETS',
      ].includes(violation),
    ) ||
    !snapshot.shellSource.includes('background: var(--ui-material-chrome-background);') ||
    !snapshot.shellSource.includes('background: var(--ui-material-overlay-background);') ||
    shellMaterialVariables.some((variable) => !allowedShellMaterialVariables.has(variable)) ||
    snapshot.shellSource.includes('--ui-admin-chrome-header') ||
    snapshot.shellSource.includes('--ui-admin-chrome-sidebar') ||
    snapshot.shellSource.includes('--ui-admin-surface-overlay')
  ) {
    violations.push('MATERIAL_BRANCH_INCOMPLETE')
  }

  if (
    backdropLines.length !== 8 ||
    backdropLines.some((line) => !allowedBackdropDeclarations.has(line)) ||
    backdropLines.filter((line) => line.includes('blur(')).length !== 2 ||
    filterLines.length !== 0 ||
    snapshot.shellSource.includes(
      'color-mix(in srgb, var(--ui-admin-navigation-selected) 24%, transparent)',
    ) ||
    /\b(?:brightness|saturate)\s*\(/iu.test(snapshot.shellSource) ||
    /transition-property\s*:[^;]*(?:backdrop-filter|filter)/iu.test(snapshot.shellSource)
  ) {
    violations.push('MATERIAL_BACKDROP_CONTRACT')
  }

  if (
    compiledStateViolations.includes('MOTION_NONE_TARGETS') ||
    !normalizedNaiveProvider.includes("html[data-motion='none'] :where(") ||
    !normalizedNaiveProvider.includes('transition: none !important;') ||
    !normalizedNaiveProvider.includes('animation: none !important;')
  ) {
    violations.push('NAIVE_MOTION_NONE_INCOMPLETE')
  }

  if (/\.n-[a-z0-9_-]+/iu.test(snapshot.pageVisualSource)) {
    violations.push('VENDOR_SELECTOR_IN_PAGE')
  }
  const errorTitles = [
    ...snapshot.routeRegistrySource.matchAll(/'route-title\.error-[^']+'\s*:\s*'([^']+)'/gu),
  ].map((match) => match[1] ?? '')
  if (errorTitles.length !== 7 || errorTitles.some((title) => /[a-z]/iu.test(title))) {
    violations.push('ENGLISH_ERROR_TITLE')
  }

  return violations
}

function appearanceWorkspaceViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = []
  const source = snapshot.appearancePageSource
  const projectionSource = snapshot.appearanceThemeProjectionSource
  const template = templateContent(source)
  const normalizedSource = source.replaceAll(/\s+/gu, ' ')
  const visibleLiteralText = template
    .replaceAll(/<!--[\s\S]*?-->/gu, ' ')
    .replaceAll(/<[^>]+>/gu, ' ')
    .replaceAll(/\{\{[\s\S]*?\}\}/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .replaceAll('PAVP', '')
    .trim()
  const requiredChineseCopy = [
    "label: '跟随系统'",
    "label: '浅色'",
    "label: '深色'",
    "label: '标准'",
    "label: '增强'",
    "label: '自适应'",
    "label: '弱化'",
    "label: '纯色'",
    "'0.9': '90%'",
    "'1': '100%'",
    "'1.1': '110%'",
    "'1.2': '120%'",
    "label: '完整'",
    "label: '减少'",
    "label: '关闭'",
    'description="从十四套内置主题中选择界面基调，色板会随明暗模式与对比度即时投影。"',
    'displayLabel: theme.label',
  ] as const
  const appearanceAxes = [...source.matchAll(/data-appearance-axis="([a-z-]+)"/gu)].map(
    (match) => match[1],
  )
  const requiredProjectionMarkers = [
    'builtInThemeIds.map',
    '.filter((entry) => !builtInThemeIds.some',
    'completeBuiltInThemeDefinitionSchema.parse',
    'validateCustomThemeDefinition(entry.definition)',
    'surfacePage:',
    'surfacePanel:',
    'actionPrimary:',
    'controlPrimary:',
    'borderDefault:',
    'focusRing:',
    'Object.freeze(reference)',
  ] as const

  if (
    source.includes('pavp-appearance-grid') ||
    source.includes('title="外观偏好"') ||
    source.includes('所有变更均通过应用内部无状态') ||
    !source.includes('pavp-appearance-theme-gallery') ||
    !source.includes('pavp-appearance-workspace') ||
    !source.includes('pavp-appearance-preview')
  ) {
    violations.push('OLD_FLAT_APPEARANCE')
  }

  if (
    !isDeepStrictEqual(appearanceAxes, [
      'theme',
      'color-mode',
      'contrast',
      'material',
      'font-scale',
      'motion',
    ]) ||
    appearanceAxes.includes('density')
  ) {
    violations.push('DENSITY_CONTROL')
  }

  if (
    requiredChineseCopy.some((copy) => !source.includes(copy)) ||
    /[A-Za-z]/u.test(visibleLiteralText)
  ) {
    violations.push('ENGLISH_PRIMARY_LABEL')
  }

  if (
    !source.includes('<UiRadioCardGroup') ||
    !source.includes('class="pavp-appearance-theme-gallery"') ||
    !source.includes('#option="{ option, selected }"') ||
    !source.includes(':model-value="selectedThemeValue"') ||
    !source.includes(':options="themeSelectionOptions"') ||
    !source.includes('@update:model-value="updateThemeSelection"') ||
    !source.includes('label="当前主题"') ||
    [...source.matchAll(/\['--pavp-appearance-swatch'\]/gu)].length !== 6 ||
    !source.includes('currentSwatches(themePreviewForValue(option.value))') ||
    !source.includes('builtInAppearanceThemePreviews') ||
    !source.includes('projectAccessibleCustomAppearanceThemePreviews') ||
    /<(?:button|input|select|textarea|label)\b/iu.test(template) ||
    requiredProjectionMarkers.some((marker) => !projectionSource.includes(marker)) ||
    /\b(?:source|bank)\s*:/u.test(projectionSource)
  ) {
    violations.push('THEME_GALLERY_PROJECTION')
  }

  if (
    /installCuratedThemeCatalog|安装七套主题|七套精选主题已安装|pavp-appearance-theme-catalog/u.test(
      source,
    )
  ) {
    violations.push('CURATED_THEME_CATALOG_ENTRY')
  }

  if (
    /#[\da-f]{3,8}\b|\b(?:hsl|hwb|lab|lch|oklab|oklch|rgb)\s*\(/iu.test(source) ||
    /--pavp-appearance-swatch\s*:\s*(?:#|[a-z]+\()/iu.test(source)
  ) {
    violations.push('HARDCODED_THEME_SWATCH')
  }

  if (
    !source.includes(':data-material-preview="effective.snapshot.value.material"') ||
    !source.includes(':data-motion-preview="effective.snapshot.value.motion"') ||
    !source.includes('<UiButton') ||
    !source.includes('<UiStatusBadge') ||
    !source.includes('<UiDescriptionList') ||
    !source.includes('<UiSegmentedControl') ||
    !source.includes('pavp-material-stage__header') ||
    !source.includes('pavp-material-stage__navigation') ||
    !source.includes('pavp-material-stage__content') ||
    !source.includes('pavp-material-stage__focus-example') ||
    /<(?:UiProvider|UiAdminShell|RouterView)\b/u.test(template)
  ) {
    violations.push('FAKE_APPEARANCE_PREVIEW')
  }

  if (
    !source.includes('density: current.appearance.density') ||
    !source.includes('const currentDensity = candidate.appearance.density') ||
    !source.includes('density: currentDensity') ||
    !source.includes('ProductPreferenceDefault') ||
    /candidate\.appearance\.density\s*=/u.test(source) ||
    /mutation\.resetPreference\s*\(/u.test(source) ||
    [...source.matchAll(/commitAxis\(\(candidate\)\s*=>/gu)].length !== 6
  ) {
    violations.push('DENSITY_PRESERVATION')
  }

  if (/\buseAppearanceStore\b|appearance\.store/u.test(source)) {
    violations.push('DIRECT_APPEARANCE_STORE')
  }
  if (/\b(?:localStorage|sessionStorage)\b/u.test(source)) {
    violations.push('DIRECT_PAGE_STORAGE')
  }
  if (/\b(?:matchMedia|CSS\.supports)\s*\(/u.test(source)) {
    violations.push('DUPLICATE_APPEARANCE_ENVIRONMENT')
  }
  if (/\bfrom\s+['"]naive-ui(?:\/[^'"]+)?['"]/u.test(source)) {
    violations.push('DIRECT_NAIVE_IMPORT')
  }
  if (/<UiProvider\b/u.test(template)) {
    violations.push('SECOND_UI_PROVIDER')
  }

  const materialVariables = [...source.matchAll(/--ui-material-[a-z0-9-]+/gu)].map(
    (match) => match[0],
  )
  const allowedMaterialVariables = new Set([
    '--ui-material-chrome-background',
    '--ui-material-overlay-background',
  ])
  const backdropLines = source
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) => line.startsWith('backdrop-filter:') || line.startsWith('-webkit-backdrop-filter:'),
    )
  const allowedBackdropDeclarations = new Set([
    '-webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));',
    'backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));',
    '-webkit-backdrop-filter: none;',
    'backdrop-filter: none;',
  ])
  if (
    materialVariables.length < 3 ||
    materialVariables.some((variable) => !allowedMaterialVariables.has(variable)) ||
    !source.includes("data-material-preview='adaptive'") ||
    !source.includes("data-material-preview='reduced'") ||
    !source.includes("data-material-preview='solid'") ||
    !source.includes('background: var(--ui-color-surface-panel);') ||
    !source.includes('background: var(--ui-material-chrome-background);') ||
    !source.includes('background: var(--ui-material-overlay-background);') ||
    backdropLines.length !== 8 ||
    backdropLines.some((line) => !allowedBackdropDeclarations.has(line)) ||
    backdropLines.filter((line) => line.includes('blur(')).length !== 2 ||
    /\bopacity\s*:/iu.test(source)
  ) {
    violations.push('MATERIAL_PREVIEW_CONSUMER')
  }

  if (
    !source.includes("data-motion-preview='full'") ||
    !source.includes("data-motion-preview='reduced'") ||
    !source.includes("data-motion-preview='none'") ||
    !source.includes('@media (prefers-reduced-motion: reduce)') ||
    !/data-motion-preview='none'[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;/u.test(source)
  ) {
    violations.push('MOTION_NONE_BRANCH')
  }

  if (!normalizedSource.includes('function replayMotion(): void { motionSequence.value += 1 }')) {
    violations.push('MOTION_REPLAY_MUTATES')
  }

  if (
    [...source.matchAll(/aria-live="polite"/gu)].length !== 1 ||
    !source.includes(':key="feedbackSequence"') ||
    !source.includes('feedbackSequence.value += 1') ||
    !source.includes("'设置已保存'") ||
    !source.includes("'无法应用此设置，已恢复原状态'") ||
    !source.includes("'已恢复默认设置'") ||
    !source.includes(':data-feedback-phase="feedbackPhase"')
  ) {
    violations.push('FEEDBACK_REPLAY')
  }

  if (
    /Mutation Boundary|Appearance Store|内部所有者|内部架构/u.test(visibleLiteralText) ||
    !snapshot.routeRegistrySource.includes(
      '统一管理主题、颜色模式、对比度、材质、字号与动效，并实时查看界面效果。',
    )
  ) {
    violations.push('APPEARANCE_PRODUCT_COPY')
  }

  return violations
}

function currentWorkStatusViolations(architectureSource: string): string[] {
  const violations: string[] = []
  const valuesForMarker = (marker: string): readonly string[] =>
    [
      ...architectureSource.matchAll(new RegExp(`^${marker}[ \\t]*=[ \\t]*([^\\r\\n]+)$`, 'gmu')),
    ].map((match) => match[1]?.trim() ?? '')
  const runtime003StatusValues = valuesForMarker('PAVP_RUNTIME_003_STATUS')
  const navigationReworkAdmissionValues = valuesForMarker(navigationReworkAdmissionAmendment)
  const navigationReworkStatusValues = valuesForMarker(`${navigationReworkWorkPackage}_STATUS`)
  const navigationReworkImplementationValues = valuesForMarker(
    `${navigationReworkWorkPackage}_REPOSITORY_IMPLEMENTATION`,
  )
  const navigationReworkVerificationValues = valuesForMarker(
    `${navigationReworkWorkPackage}_STATIC_VERIFICATION`,
  )
  const adminNavigationGsapAdmissionValues = valuesForMarker(adminNavigationGsapAdmissionAmendment)
  const adminNavigationGsapStatusValues = valuesForMarker(
    `${adminNavigationGsapWorkPackage}_STATUS`,
  )
  const adminNavigationGsapImplementationValues = valuesForMarker(
    `${adminNavigationGsapWorkPackage}_REPOSITORY_IMPLEMENTATION`,
  )
  const adminNavigationGsapVerificationValues = valuesForMarker(
    `${adminNavigationGsapWorkPackage}_STATIC_VERIFICATION`,
  )
  const adminNavigationThemeReflowAdmissionValues = valuesForMarker(
    adminNavigationThemeReflowAdmissionAmendment,
  )
  const adminNavigationThemeReflowStatusValues = valuesForMarker(
    `${adminNavigationThemeReflowWorkPackage}_STATUS`,
  )
  const adminNavigationThemeReflowImplementationValues = valuesForMarker(
    `${adminNavigationThemeReflowWorkPackage}_REPOSITORY_IMPLEMENTATION`,
  )
  const adminNavigationThemeReflowVerificationValues = valuesForMarker(
    `${adminNavigationThemeReflowWorkPackage}_STATIC_VERIFICATION`,
  )
  const adminNavigationHighlightRevealAdmissionValues = valuesForMarker(
    adminNavigationHighlightRevealAdmissionAmendment,
  )
  const adminNavigationHighlightRevealStatusValues = valuesForMarker(
    `${adminNavigationHighlightRevealWorkPackage}_STATUS`,
  )
  const adminNavigationHighlightRevealImplementationValues = valuesForMarker(
    `${adminNavigationHighlightRevealWorkPackage}_REPOSITORY_IMPLEMENTATION`,
  )
  const adminNavigationHighlightRevealVerificationValues = valuesForMarker(
    `${adminNavigationHighlightRevealWorkPackage}_STATIC_VERIFICATION`,
  )
  const adminNavigationNativeAdmissionValues = valuesForMarker(
    adminNavigationNativeAdmissionAmendment,
  )
  const adminNavigationNativeStatusValues = valuesForMarker(
    `${adminNavigationNativeWorkPackage}_STATUS`,
  )
  const adminNavigationNativeImplementationValues = valuesForMarker(
    `${adminNavigationNativeWorkPackage}_REPOSITORY_IMPLEMENTATION`,
  )
  const adminNavigationNativeVerificationValues = valuesForMarker(
    `${adminNavigationNativeWorkPackage}_STATIC_VERIFICATION`,
  )
  const adminNavigationMotionVueSelectionLensAdmissionValues = valuesForMarker(
    adminNavigationMotionVueSelectionLensAdmissionAmendment,
  )
  const adminNavigationMotionVueSelectionLensStatusValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_STATUS`,
  )
  const adminNavigationMotionVueSelectionLensImplementationValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_REPOSITORY_IMPLEMENTATION`,
  )
  const adminNavigationMotionVueSelectionLensVerificationValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_STATIC_VERIFICATION`,
  )
  const adminNavigationMotionVueSelectionLensRuntimeAcceptanceValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_RUNTIME_ACCEPTANCE`,
  )
  const adminNavigationMotionVueSelectionLensVisualAcceptanceValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_VISUAL_ACCEPTANCE`,
  )
  const adminNavigationMotionVueSelectionLensAccessibilityAcceptanceValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_ACCESSIBILITY_ACCEPTANCE`,
  )
  const adminNavigationMotionVueSelectionLensPublicationValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_PUBLICATION_STATUS`,
  )
  const adminNavigationMotionVueSelectionLensReleaseValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_RELEASE_STATUS`,
  )
  const adminNavigationMotionVueSelectionLensAcceptanceStatementValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_ACCEPTANCE_STATEMENT`,
  )
  const adminNavigationMotionVueSelectionLensImplementationCommitValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_IMPLEMENTATION_COMMIT`,
  )
  const adminNavigationMotionVueSelectionLensPublicationTargetValues = valuesForMarker(
    `${adminNavigationMotionVueSelectionLensWorkPackage}_PUBLICATION_TARGET`,
  )
  const routeTransitionAdmissionValues = valuesForMarker(routeTransitionAdmissionAmendment)
  const routeTransitionStatusValues = valuesForMarker(`${routeTransitionWorkPackage}_STATUS`)
  const routeTransitionImplementationValues = valuesForMarker(
    `${routeTransitionWorkPackage}_REPOSITORY_IMPLEMENTATION`,
  )
  const routeTransitionVerificationValues = valuesForMarker(
    `${routeTransitionWorkPackage}_STATIC_VERIFICATION`,
  )
  const routeTransitionRuntimeAcceptanceValues = valuesForMarker(
    `${routeTransitionWorkPackage}_OWNER_RUNTIME_ACCEPTANCE`,
  )
  const routeTransitionVisualAcceptanceValues = valuesForMarker(
    `${routeTransitionWorkPackage}_OWNER_VISUAL_ACCEPTANCE`,
  )
  const routeTransitionAccessibilityAcceptanceValues = valuesForMarker(
    `${routeTransitionWorkPackage}_OWNER_ACCESSIBILITY_ACCEPTANCE`,
  )
  const routeTransitionPublicationValues = valuesForMarker(
    `${routeTransitionWorkPackage}_PUBLICATION_STATUS`,
  )
  const routeTransitionReleaseValues = valuesForMarker(
    `${routeTransitionWorkPackage}_RELEASE_STATUS`,
  )
  const canonicalStatusEnd = architectureSource.indexOf('\n---\n')
  const canonicalStatusSource =
    canonicalStatusEnd === -1 ? architectureSource : architectureSource.slice(0, canonicalStatusEnd)
  const canonicalWork = /^CURRENT_BOUNDED_WORK[ \t]*=[ \t]*([^\r\n]+)$/mu
    .exec(canonicalStatusSource)?.[1]
    ?.trim()
  const canonicalAuthority = /^CURRENT_BOUNDED_WORK_AUTHORITY[ \t]*=[ \t]*([^\r\n]+)$/mu
    .exec(canonicalStatusSource)?.[1]
    ?.trim()

  const recordCurrentWorkViolation = (): void => {
    violations.push('PAVP_RUNTIME_003_CURRENT_WORK')
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_CURRENT_WORK')
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_CURRENT_WORK')
    violations.push('PAVP_ROUTE_TRANSITION_CURRENT_WORK')
  }

  if (
    canonicalWork !== routeTransitionWorkPackage ||
    canonicalAuthority !== routeTransitionAdmissionAmendment
  ) {
    recordCurrentWorkViolation()
  }

  const amendmentHeading = `### 1.2B.0G \`${acceptedDarkActionWorkPackage}\``
  const amendmentStart = architectureSource.indexOf(amendmentHeading)
  const amendmentEnd =
    amendmentStart === -1
      ? -1
      : architectureSource.indexOf('\n### ', amendmentStart + amendmentHeading.length)
  const amendmentSource =
    amendmentStart === -1
      ? ''
      : architectureSource.slice(
          amendmentStart,
          amendmentEnd === -1 ? architectureSource.length : amendmentEnd,
        )
  const requiredAmendmentMarkers = [
    `AMENDMENT=${darkActionAdmissionAmendment}`,
    'AMENDMENT_STATUS=FROZEN',
    `WORK_PACKAGE=${acceptedDarkActionWorkPackage}`,
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    `HISTORICAL_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${darkActionAdmissionAmendment}`,
    `HISTORICAL_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${acceptedDarkActionWorkPackage}`,
    'OWNER_RUNTIME_ACCEPTANCE=PASS',
    'OWNER_VISUAL_ACCEPTANCE=PASS',
    `OWNER_ACCEPTANCE_STATEMENT=${darkActionAcceptanceStatement}`,
    'PRODUCTION_RELEASE_STATUS=NOT_RELEASED',
  ] as const

  if (
    amendmentSource.length === 0 ||
    requiredAmendmentMarkers.some((marker) => !amendmentSource.includes(marker))
  ) {
    violations.push('DARK_ACTION_FROZEN_AMENDMENT_REQUIRED')
  }

  const runtime003AmendmentHeading = `#### \`${runtime003AdmissionAmendment}\``
  const runtime003AmendmentStart = architectureSource.indexOf(runtime003AmendmentHeading)
  const runtime003AmendmentEnd =
    runtime003AmendmentStart === -1
      ? -1
      : architectureSource.indexOf(
          '\n#### ',
          runtime003AmendmentStart + runtime003AmendmentHeading.length,
        )
  const runtime003AmendmentSource =
    runtime003AmendmentStart === -1
      ? ''
      : architectureSource.slice(
          runtime003AmendmentStart,
          runtime003AmendmentEnd === -1 ? architectureSource.length : runtime003AmendmentEnd,
        )

  if (
    !runtime003AmendmentSource.includes(`AMENDMENT=${runtime003AdmissionAmendment}`) ||
    !runtime003AmendmentSource.includes('AMENDMENT_STATUS=FROZEN') ||
    !runtime003AmendmentSource.includes(`WORK_ITEM=${runtime003WorkItem}`)
  ) {
    violations.push('PAVP_RUNTIME_003_ADMISSION_NOT_FROZEN')
  }

  const navigationReworkAmendmentHeading = `### 1.2B.0H \`${navigationReworkWorkPackage}\``
  const navigationReworkAmendmentStart = architectureSource.indexOf(
    navigationReworkAmendmentHeading,
  )
  const navigationReworkAmendmentEnd =
    navigationReworkAmendmentStart === -1
      ? -1
      : architectureSource.indexOf(
          '\n### ',
          navigationReworkAmendmentStart + navigationReworkAmendmentHeading.length,
        )
  const navigationReworkAmendmentSource =
    navigationReworkAmendmentStart === -1
      ? ''
      : architectureSource.slice(
          navigationReworkAmendmentStart,
          navigationReworkAmendmentEnd === -1
            ? architectureSource.length
            : navigationReworkAmendmentEnd,
        )
  const requiredNavigationReworkAmendmentMarkers = [
    `AMENDMENT=${navigationReworkAdmissionAmendment}`,
    'AMENDMENT_STATUS=FROZEN',
    `${navigationReworkAdmissionAmendment}=FROZEN`,
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    `WORK_PACKAGE=${navigationReworkWorkPackage}`,
    `${navigationReworkWorkPackage}_STATUS=OPEN`,
    `${navigationReworkWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
    `${navigationReworkWorkPackage}_STATIC_VERIFICATION=PASS`,
    `CURRENT_BOUNDED_WORK_AUTHORITY=${routeTransitionAdmissionAmendment}`,
    `CURRENT_BOUNDED_WORK=${routeTransitionWorkPackage}`,
    `${adminNavigationGsapAdmissionAmendment}=FROZEN`,
    `${adminNavigationGsapWorkPackage}_STATUS=OPEN`,
    `${adminNavigationGsapWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
    `${adminNavigationGsapWorkPackage}_STATIC_VERIFICATION=PASS`,
    `${adminNavigationThemeReflowAdmissionAmendment}=FROZEN`,
    `${adminNavigationThemeReflowWorkPackage}_STATUS=OPEN`,
    `${adminNavigationThemeReflowWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
    `${adminNavigationThemeReflowWorkPackage}_STATIC_VERIFICATION=PASS`,
    `${adminNavigationHighlightRevealAdmissionAmendment}=FROZEN`,
    `${adminNavigationHighlightRevealWorkPackage}_STATUS=OPEN`,
    `${adminNavigationHighlightRevealWorkPackage}_REPOSITORY_IMPLEMENTATION=NOT_STARTED`,
    `${adminNavigationHighlightRevealWorkPackage}_STATIC_VERIFICATION=NOT_RUN`,
    'PAVP_RUNTIME_003_STATUS=ACCEPTED',
    'PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_RUNTIME_003_STATIC_VERIFICATION=PASS',
    'PAVP_RUNTIME_003_OWNER_RUNTIME_ACCEPTANCE=PASS',
    'PAVP_RUNTIME_003_OWNER_VISUAL_ACCEPTANCE=PASS',
    'PAVP_RUNTIME_003_OWNER_ACCESSIBILITY_ACCEPTANCE=PASS',
    'PAVP_RUNTIME_004_STATUS=OPEN',
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
  ] as const

  if (
    navigationReworkAmendmentSource.length === 0 ||
    requiredNavigationReworkAmendmentMarkers.some(
      (marker) => !navigationReworkAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_ADMISSION_NOT_FROZEN')
  }

  const adminNavigationGsapAmendmentHeading = `### 1.2B.0I \`${adminNavigationGsapWorkPackage}\``
  const adminNavigationGsapAmendmentStart = architectureSource.indexOf(
    adminNavigationGsapAmendmentHeading,
  )
  const adminNavigationGsapAmendmentEnd =
    adminNavigationGsapAmendmentStart === -1
      ? -1
      : architectureSource.indexOf(
          '\n### ',
          adminNavigationGsapAmendmentStart + adminNavigationGsapAmendmentHeading.length,
        )
  const adminNavigationGsapAmendmentSource =
    adminNavigationGsapAmendmentStart === -1
      ? ''
      : architectureSource.slice(
          adminNavigationGsapAmendmentStart,
          adminNavigationGsapAmendmentEnd === -1
            ? architectureSource.length
            : adminNavigationGsapAmendmentEnd,
        )
  const requiredAdminNavigationGsapAmendmentMarkers = [
    `AMENDMENT=${adminNavigationGsapAdmissionAmendment}`,
    'AMENDMENT_KIND=ARCHITECTURE_ONLY_BOUNDED_INSTANCE_GSAP_ADMISSION',
    'AMENDMENT_STATUS=FROZEN',
    'NORMATIVE_WRITE_AUTHORITY=ARCHITECTURE.md',
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    'ACTIVATION_EFFECT=CANONICAL_WORK_PACKAGE_ADMISSION_ONLY',
    `SOURCE_IMPLEMENTATION_AUTHORITY=${adminNavigationGsapWorkPackage}_ONLY_UNDER_THIS_FROZEN_CONTRACT`,
    `WORK_PACKAGE=${adminNavigationGsapWorkPackage}`,
    '\nSTATUS=OPEN\n',
    '\nREPOSITORY_IMPLEMENTATION=COMPLETE\n',
    '\nSTATIC_VERIFICATION=PASS\n',
    'OWNER_DEMAND=CONFIRMED',
    'OWNER_ARCHITECTURE_POLICY_EXCEPTION_AUTHORIZATION=CONFIRMED',
    'OWNER_SOURCE_IMPLEMENTATION_AUTHORIZATION=CONFIRMED',
    'OWNER_DO_NOT_REQUEST_RECONFIRMATION=CONFIRMED',
    'NEW_CAPABILITY_STATUS_ENUM=PROHIBITED',
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
  ] as const

  if (
    adminNavigationGsapAmendmentSource.length === 0 ||
    requiredAdminNavigationGsapAmendmentMarkers.some(
      (marker) => !adminNavigationGsapAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_ADMISSION_NOT_FROZEN')
  }

  const requiredAdminNavigationGsapInstanceScopeMarkers = [
    'RUNTIME_MOTION_GLOBAL_CAPABILITY_STATUS=TARGET_INACTIVE',
    'GSAP_GLOBAL_STATUS=DEFERRED',
    'GSAP_GENERAL_PRIORITY_CHANGE=NONE',
    'GSAP_INSTANCE_ADMISSION_COUNT=1',
    `GSAP_INSTANCE_ADMISSION=${adminNavigationGsapWorkPackage}_ONLY`,
    'GSAP_24_2_CONDITION_2_INSTANCE_DISPOSITION=REPLACED_BY_EXPLICIT_OWNER_PRODUCT_TECHNOLOGY_DECISION',
    'GSAP_24_2_CONDITIONS_1_3_4_5_6_7=REQUIRED_UNCHANGED',
    'OTHER_GSAP_INTERACTION_ADMISSION=NONE',
    'OTHER_MOTION_VENDOR_ADMISSION=NONE',
  ] as const
  const gsapStatusValues = valuesForMarker('GSAP_STATUS')

  if (
    gsapStatusValues.length !== 1 ||
    gsapStatusValues[0] !== 'DEFERRED' ||
    requiredAdminNavigationGsapInstanceScopeMarkers.some(
      (marker) => !adminNavigationGsapAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_INSTANCE_SCOPE')
  }

  const requiredAdminNavigationGsapCoordinateMarkers = [
    'GSAP_DEPENDENCY_COORDINATE=gsap@3.15.0',
    'GSAP_CATALOG_COORDINATE=3.15.0',
    'GSAP_UI_MANIFEST_PROTOCOL=catalog:',
    'GSAP_DEPENDENCY_OWNER=packages/ui',
    'GSAP_LOCK_CATALOG_SPECIFIER=3.15.0',
    'GSAP_LOCK_CATALOG_VERSION=3.15.0',
    'GSAP_LOCK_UI_IMPORTER_SPECIFIER=catalog:',
    'GSAP_LOCK_UI_IMPORTER_VERSION=3.15.0',
    'GSAP_LOCK_PACKAGE_KEY=gsap@3.15.0',
    `GSAP_LOCK_PACKAGE_INTEGRITY=${expectedGsapIntegrity}`,
    'GSAP_LOCK_SNAPSHOT=gsap@3.15.0_EMPTY_RECORD',
  ] as const

  if (
    requiredAdminNavigationGsapCoordinateMarkers.some(
      (marker) => !adminNavigationGsapAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_COORDINATE')
  }

  const requiredAdminNavigationGsapDynamicRootMarkers = [
    'GSAP_LOAD_MODE=EXACT_PRIVATE_ADAPTER_LAZY_ROOT',
    'GSAP_ADAPTER_LAZY_IMPORT_SPECIFIER=../adapters/gsap/admin-navigation-motion',
    'EXACT_ROUTE_LAZY_ROOT_COUNT=17',
    'EXACT_NON_ROUTE_DYNAMIC_MOTION_ROOT_COUNT=1',
    'EXACT_DYNAMIC_ROOT_COUNT=18',
    'EXACT_NON_ROUTE_DYNAMIC_MOTION_ROOT=packages/ui/src/adapters/gsap/admin-navigation-motion.ts',
    'OTHER_NON_ROUTE_DYNAMIC_ROOT=PROHIBITED',
  ] as const

  if (
    requiredAdminNavigationGsapDynamicRootMarkers.some(
      (marker) => !adminNavigationGsapAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_DYNAMIC_ROOT')
  }

  const requiredAdminNavigationGsapBudgetMarkers = [
    'INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=229376',
    'INITIAL_JAVASCRIPT_MINIMUM_HEADROOM_BYTES=8192',
    'INITIAL_JAVASCRIPT_MAXIMUM_ALLOWED_BYTES=221184',
    'INITIAL_JAVASCRIPT_BUDGET_CHANGE=NONE',
    'MOTION_ADAPTER_JAVASCRIPT_GZIP_HARD_BUDGET_BYTES=40960',
    'MOTION_ADAPTER_ADR_THRESHOLD_BYTES_GZIP=40960',
    'ENGINEERING_MANIFEST_MOTION_BUDGET_ID=lazy-motion-adapter-javascript-gzip',
    'ENGINEERING_MANIFEST_MOTION_BUDGET_LIMIT=40960',
    'ENGINEERING_MANIFEST_MOTION_BUDGET_UNIT=bytes-gzip',
    'ENGINEERING_MANIFEST_BUDGET_COUNT=5',
    'MEASURED_INITIAL_JAVASCRIPT_GZIP_BYTES=211177',
    'MEASURED_INITIAL_JAVASCRIPT_HEADROOM_BYTES=18199',
    'MEASURED_INITIAL_CSS_GZIP_BYTES=24729',
    'MEASURED_DYNAMIC_ROOT_COUNT=18',
    'MEASURED_ROUTE_LAZY_ROOT_COUNT=17',
    'MEASURED_NON_ROUTE_MOTION_ROOT_COUNT=1',
    'MEASURED_MOTION_ADAPTER_STATIC_CLOSURE_FILE_COUNT=1',
    'MEASURED_MOTION_ADAPTER_JAVASCRIPT_GZIP_BYTES=28771',
    `CHECK_BUNDLE_SHA256=${historicalAdminNavigationGsapCheckBundleSha256}`,
  ] as const

  if (
    requiredAdminNavigationGsapBudgetMarkers.some(
      (marker) => !adminNavigationGsapAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_BUDGET')
  }

  const requiredAdminNavigationGsapOverlapMarkers = [
    `PREVIOUS_CURRENT_BOUNDED_WORK_AUTHORITY=${navigationReworkAdmissionAmendment}`,
    `PREVIOUS_CURRENT_BOUNDED_WORK=${navigationReworkWorkPackage}`,
    'PREVIOUS_CURRENT_BOUNDED_WORK_STATUS=OPEN',
    'PREVIOUS_CURRENT_BOUNDED_WORK_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PREVIOUS_CURRENT_BOUNDED_WORK_STATIC_VERIFICATION=PASS',
    'PREVIOUS_CURRENT_BOUNDED_WORK_DISPOSITION=PRESERVED_AS_IMPLEMENTED_STATIC_BASELINE_NOT_CURRENT',
    'WORK_PACKAGE_RELATION=SERIAL_OWNER_DIRECTED_NAVIGATION_REWORK',
    'PARALLEL_NAVIGATION_IMPLEMENTATION=PROHIBITED',
    'SOURCE_OVERLAP_DISPOSITION=NEW_WORK_PACKAGE_OWNS_THE_FINAL_NAVIGATION_DIFF',
    'PREVIOUS_IMPLEMENTATION_ROLLBACK=PROHIBITED',
  ] as const

  if (
    requiredAdminNavigationGsapOverlapMarkers.some(
      (marker) => !adminNavigationGsapAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_OVERLAP')
  }

  const requiredAdminNavigationGsapPrivateBoundaryMarkers = [
    'GSAP_ADAPTER_PATH=packages/ui/src/adapters/gsap/admin-navigation-motion.ts',
    'GSAP_ADAPTER_VISIBILITY=PRIVATE',
    'GSAP_PUBLIC_ROOT_EXPORT=PROHIBITED',
    'APPLICATION_DIRECT_GSAP_IMPORT=PROHIBITED',
    'OTHER_PACKAGE_GSAP_DEPENDENCY=PROHIBITED',
    'GSAP_DEEP_IMPORT=PROHIBITED',
    'GSAP_CDN_OR_SCRIPT_INJECTION=PROHIBITED',
    'GSAP_VENDOR_STATIC_IMPORT_OWNER=packages/ui/src/adapters/gsap/admin-navigation-motion.ts',
    'GSAP_OWNS=PAVP-owned bottom-dock label/icon opacity/visibility and Full-only scale plus PAVP-owned expanded route-dot opacity/visibility and Full-only scale',
    'NAIVE_THEME_AND_CSSR_OWNS=Level-2 inset Overlay surface plus Sider/Menu width and native label/arrow transition under existing PAVP namespaced duration policy',
    'CSS_BASELINE_OWNS=stable dock icon/label and route-dot visibility before lazy readiness or after disposal plus collapsed root/dropdown pseudo-dot presentation; Reduced and None pseudo-dots force scale(1)',
  ] as const

  if (
    requiredAdminNavigationGsapPrivateBoundaryMarkers.some(
      (marker) => !adminNavigationGsapAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_PRIVATE_BOUNDARY')
  }

  const adminNavigationThemeReflowAmendmentHeading = `### 1.2B.0J \`${adminNavigationThemeReflowWorkPackage}\``
  const adminNavigationThemeReflowAmendmentStart = architectureSource.indexOf(
    adminNavigationThemeReflowAmendmentHeading,
  )
  const adminNavigationThemeReflowAmendmentEnd =
    adminNavigationThemeReflowAmendmentStart === -1
      ? -1
      : architectureSource.indexOf(
          '\n### ',
          adminNavigationThemeReflowAmendmentStart +
            adminNavigationThemeReflowAmendmentHeading.length,
        )
  const adminNavigationThemeReflowAmendmentSource =
    adminNavigationThemeReflowAmendmentStart === -1
      ? ''
      : architectureSource.slice(
          adminNavigationThemeReflowAmendmentStart,
          adminNavigationThemeReflowAmendmentEnd === -1
            ? architectureSource.length
            : adminNavigationThemeReflowAmendmentEnd,
        )
  const requiredAdminNavigationThemeReflowAdmissionMarkers = [
    `AMENDMENT=${adminNavigationThemeReflowAdmissionAmendment}`,
    'AMENDMENT_KIND=ARCHITECTURE_ONLY_SERIAL_OWNER_DIRECTED_NAVIGATION_VISUAL_AND_REFLOW_CORRECTION_ADMISSION',
    'AMENDMENT_STATUS=FROZEN',
    'NORMATIVE_WRITE_AUTHORITY=ARCHITECTURE.md',
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    'ACTIVATION_EFFECT=CANONICAL_WORK_PACKAGE_ADMISSION_ONLY',
    `SOURCE_IMPLEMENTATION_AUTHORITY=${adminNavigationThemeReflowWorkPackage}_ONLY_UNDER_THIS_FROZEN_CONTRACT`,
    `WORK_PACKAGE=${adminNavigationThemeReflowWorkPackage}`,
    '\nSTATUS=OPEN\n',
    '\nREPOSITORY_IMPLEMENTATION=COMPLETE\n',
    '\nSTATIC_VERIFICATION=PASS\n',
    'OWNER_DEMAND=CONFIRMED',
    'OWNER_VISUAL_REJECTION=CONFIRMED',
    'OWNER_SOURCE_IMPLEMENTATION_AUTHORIZATION=CONFIRMED',
    'OWNER_DO_NOT_REQUEST_RECONFIRMATION=CONFIRMED',
    'CONTRACT_PRECEDENCE=SECTION_1_2B_0J_SUPERSEDES_SECTION_1_2B_0I_ACTIVE_SURFACE_HARD_DOT_COLLAPSE_REFLOW_AND_DOCK_HANDOFF_ONLY',
    'HISTORICAL_SECTION_1_2B_0I_CONTRACT_MUTATION=PROHIBITED',
    'NEW_CAPABILITY_STATUS_ENUM=PROHIBITED',
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
  ] as const

  if (
    adminNavigationThemeReflowAmendmentSource.length === 0 ||
    requiredAdminNavigationThemeReflowAdmissionMarkers.some(
      (marker) => !adminNavigationThemeReflowAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_ADMISSION_NOT_FROZEN')
  }

  const requiredAdminNavigationGsapAdmissionHistoryMarkers = [
    `HISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationGsapAdmissionAmendment}`,
    `HISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${adminNavigationGsapWorkPackage}`,
  ] as const

  if (
    requiredAdminNavigationGsapAdmissionHistoryMarkers.some(
      (marker) => !adminNavigationThemeReflowAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_ADMISSION_HISTORY')
  }

  const requiredAdminNavigationThemeReflowOverlapMarkers = [
    `PREVIOUS_CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationGsapAdmissionAmendment}`,
    `PREVIOUS_CURRENT_BOUNDED_WORK=${adminNavigationGsapWorkPackage}`,
    'PREVIOUS_CURRENT_BOUNDED_WORK_STATUS=OPEN',
    'PREVIOUS_CURRENT_BOUNDED_WORK_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PREVIOUS_CURRENT_BOUNDED_WORK_STATIC_VERIFICATION=PASS',
    'PREVIOUS_CURRENT_BOUNDED_WORK_DISPOSITION=PRESERVED_AS_IMPLEMENTED_STATIC_BASELINE_NOT_CURRENT',
    'WORK_PACKAGE_RELATION=SERIAL_OWNER_DIRECTED_NAVIGATION_CORRECTION',
    'PARALLEL_NAVIGATION_IMPLEMENTATION=PROHIBITED',
    'SOURCE_OVERLAP_DISPOSITION=NEW_WORK_PACKAGE_OWNS_THE_FINAL_NAVIGATION_AND_APPEARANCE_GRID_DIFF',
    'PREVIOUS_IMPLEMENTATION_ROLLBACK=PROHIBITED',
  ] as const

  if (
    requiredAdminNavigationThemeReflowOverlapMarkers.some(
      (marker) => !adminNavigationThemeReflowAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_OVERLAP')
  }

  const requiredAdminNavigationThemeTintedSelectionMarkers = [
    'NAVIGATION_VISUAL_DIRECTION=OWNER_SELECTED_DIRECTION_2_ORDERLY_INSET_SELECTION',
    'EXPANDED_ROOT_ACTIVE_PRESENTATION=FOREGROUND_ONLY',
    'EXPANDED_ROOT_LEFT_ACTIVE_INDICATOR=PROHIBITED',
    'NAVIGATION_NON_SELECTED_HOVER_PRESENTATION=EXISTING_LOW_CONTRAST_NAVIGATION_HOVER_SURFACE_ONLY',
    'NAVIGATION_NON_SELECTED_HOVER_COLOR_AUTHORITY=--ui-admin-navigation-hover',
    'NAVIGATION_HOVER_CHANGE=NONE',
    'LEVEL_2_ACTIVE_SURFACE=INSET_THEME_TINTED_OVERLAY_STATE_PROJECTION',
    'LEVEL_2_ACTIVE_SURFACE_COLOR_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 12%,var(--ui-material-overlay-background))',
    'LEVEL_2_ACTIVE_HOVER_SURFACE=SAME_AS_LEVEL_2_ACTIVE_SURFACE',
    'LEVEL_2_ACTIVE_PRESSED_SURFACE=SAME_AS_LEVEL_2_ACTIVE_SURFACE',
    'LEVEL_2_HARD_ROUTE_DOT=PROHIBITED',
    'ACTIVE_ROUTE_DOT_DISPOSITION=SUPERSEDED_BY_ONE_TRAILING_SOFT_CONTROL_PRIMARY_AURA',
    'LEVEL_2_ACTIVE_DECORATION=ONE_TRAILING_SOFT_CONTROL_PRIMARY_AURA',
    'LEVEL_2_ACTIVE_AURA_COLOR_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 24%,transparent)',
    'LEVEL_2_ACTIVE_AURA_SOFTENING=STATIC_RADIAL_THEME_TINT_FALLOFF',
    'LEVEL_2_ACTIVE_AURA_FALLOFF_END=72%',
    'LEVEL_2_ACTIVE_AURA_FILTER=PROHIBITED',
    'COLLAPSED_ROOT_ACTIVE_SURFACE=COMPACT_CENTERED_THEME_TINTED_OVERLAY_STATE_PROJECTION',
    'COLLAPSED_ROOT_HARD_DOT=PROHIBITED',
    'SELECTED_BACKDROP_FILTER=PROHIBITED',
    'SELECTED_AURA_FILTER=PROHIBITED',
    'SELECTED_AURA_FILTER_ANIMATION=PROHIBITED',
    'ADAPTIVE_MATERIAL_SELECTED_AURA=STATIC_RADIAL_THEME_TINT_FALLOFF',
    'SOLID_MATERIAL_SELECTED_SURFACE=FLAT_OPAQUE_THEME_TINTED_PANEL',
    'PREFERS_REDUCED_TRANSPARENCY_SELECTED_AURA=HIDDEN',
    'FORCED_COLORS_SELECTED_SURFACE=color.action.primary',
    'FORCED_COLORS_SELECTED_FOREGROUND=color.text.on-action',
    'FORCED_COLORS_SELECTED_INTERACTION_RETENTION=HIGHER_SPECIFICITY_THAN_VENDOR_BASE_HOVER_AND_ACTIVE_WITHOUT_IMPORTANT',
    'FORCED_COLORS_SELECTED_AURA=HIDDEN',
    'COLLAPSED_ROOT_SELECTION_SCOPE=STATIC_COLLAPSED_NAVIGATION_PLANE_NOT_SHARED_SIDER_COLLAPSED_STATE',
    'COLLAPSED_ROOT_SELECTED_HOVER_SURFACE=SAME_12_PERCENT_THEME_TINT_AS_SELECTED_NOT_NEUTRAL_HOVER',
    'NEW_PUBLIC_VISUAL_TOKEN=NONE',
    'NEW_UI_INTERNAL_VISUAL_TOKEN=NONE',
    'NEW_MATERIAL_AUTHORITY=NONE',
  ] as const

  if (
    requiredAdminNavigationThemeTintedSelectionMarkers.some(
      (marker) => !adminNavigationThemeReflowAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_TINTED_SELECTION')
  }

  const requiredAdminNavigationAtomicCollapseMarkers = [
    'GSAP_INSTANCE_ADMISSION_COUNT=1',
    `GSAP_INSTANCE_ADMISSION_OWNER=${adminNavigationThemeReflowWorkPackage}_ONLY`,
    'GSAP_DEPENDENCY_COORDINATE=gsap@3.15.0',
    'GSAP_DEPENDENCY_CHANGE=NONE',
    'GSAP_DYNAMIC_ROOT_CHANGE=NONE',
    'GSAP_BUNDLE_BUDGET_CHANGE=NONE',
    'WIDE_COLLAPSE_SEMANTIC_STATE_COMMIT=IMMEDIATE',
    'WIDE_COLLAPSE_FINAL_LAYOUT_COMMIT=ONE_ATOMIC_COMMIT_PER_INPUT',
    'WIDE_COLLAPSE_PER_FRAME_SIDER_WIDTH_TWEEN=PROHIBITED',
    'WIDE_COLLAPSE_PER_FRAME_MAX_WIDTH_TWEEN=PROHIBITED',
    'WIDE_COLLAPSE_PER_FRAME_MAIN_LAYOUT_REFLOW=PROHIBITED',
    'WIDE_COLLAPSE_LAYOUT_READ_WRITE_LOOP=PROHIBITED',
    'WIDE_COLLAPSE_LAYOUT_READ_DURING_TWEEN=PROHIBITED',
    'NAIVE_SIDER_NATIVE_WIDTH_TRANSITION_DURING_NAMED_SWITCH=DISABLED',
    'NAIVE_MENU_SUBMENU_HEIGHT_TRANSITION_DURING_NAMED_SWITCH=DISABLED',
    'NAIVE_MENU_SUBMENU_FORCED_LAYOUT_TRANSITION_DURING_NAMED_SWITCH=PROHIBITED',
    'PERSISTENT_SIDER_CONTENT_OVERFLOW_STABLE=hidden',
    'PERSISTENT_SIDER_CONTENT_OVERFLOW_DURING_NAMED_SWITCH=visible',
    'PERSISTENT_SIDER_SWITCH_OVERFLOW_AUTHORITY=PAVP_SHELL_LOCAL_STATE_CUSTOM_PROPERTY_NOT_DESIGN_TOKEN',
    'PERSISTENT_SIDER_SWITCH_OVERFLOW_POINTER_TARGET_EXPANSION=PROHIBITED',
    'NAVIGATION_MENU_OPTION_IDENTITY_ACROSS_COLLAPSE=STABLE',
    'NAVIGATION_EXPANDED_KEY_STATE_ACROSS_COLLAPSE=PRESERVED',
    'NAVIGATION_EXPANDED_KEY_MUTATION_DURING_NAMED_SWITCH=PROHIBITED',
    'PERSISTENT_COLLAPSE_WATCH_EXPANDED_KEY_MUTATION=PROHIBITED',
    'ACTIVE_ROUTE_WATCH_EXPANDED_KEY_MUTATION=PROHIBITED',
    'ACTIVE_ROUTE_PARENT_EXPANDED_KEYS_PROJECTION=DERIVED_CONTROLLED_VALUE_WITHOUT_SHELL_STATE_MUTATION',
    'NAVIGATION_EXPANDED_KEY_PROJECTION_DURING_NAMED_SWITCH=FROZEN_FROM_PRE_COMMIT_UNTIL_SETTLED_OR_FALLBACK',
    'NAVIGATION_INACTIVE_PLANE_INTERACTION_SUPPRESSION=inert;aria-hidden;pointer-events-none',
    'NAVIGATION_MENU_DISABLED_STATE_ACROSS_COLLAPSE=PROHIBITED',
    'NAVIGATION_ROUTE_DECORATION_TARGET_IDENTITY_ACROSS_COLLAPSE=STABLE',
    'FULL_COLLAPSE_MAIN_CONTENT_PROPERTY_ALLOWLIST=translateX',
    'FULL_COLLAPSE_MAIN_CONTENT_SCALE=PROHIBITED',
    'FULL_COLLAPSE_SIDER_OR_MENU_WIDTH_WRITE_BY_GSAP=PROHIBITED',
    'FULL_COLLAPSE_DURATION=200ms',
    'REDUCED_COLLAPSE_VISUAL_BRIDGE=100ms_OPACITY_ONLY_WITH_IMMEDIATE_ATOMIC_FINAL_GEOMETRY',
    'REDUCED_COLLAPSE_TRANSFORM=PROHIBITED',
    'NONE_COLLAPSE_VISUAL_BRIDGE=NONE_IMMEDIATE_ATOMIC_FINAL_STATE',
    'FINAL_STABLE_PAVP_OWNED_GEOMETRY_TRANSFORM=none',
  ] as const

  if (
    requiredAdminNavigationAtomicCollapseMarkers.some(
      (marker) => !adminNavigationThemeReflowAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_ATOMIC_COLLAPSE')
  }

  const requiredAdminNavigationBottomDockHandoffMarkers = [
    'COLLAPSE_CONTROL_PLACEMENT=BOTTOM_UTILITY_DOCK',
    'BOTTOM_DOCK_STANDALONE_PANEL=PROHIBITED',
    'BOTTOM_DOCK_SURFACE=SAME_AS_PERSISTENT_SIDER_CHROME',
    'BOTTOM_DOCK_TOP_DIVIDER=ONE_INSET_EXISTING_TOKEN_OWNED_HAIRLINE',
    'BOTTOM_DOCK_ACTION_GEOMETRY=ONE_ROW_WITH_ICON_ALIGNED_TO_NAVIGATION_ICON_AXIS',
    'BOTTOM_DOCK_FOREGROUND_POINTER_EVENTS=NONE',
    'BOTTOM_DOCK_HIT_TARGET_OVERFLOW=PROHIBITED',
    'BOTTOM_DOCK_RAIL_CONTENT_WIDTH=FULL_RAIL_WITHOUT_OUTER_INLINE_PADDING',
    'NAIVE_MENU_ROOT_ICON_AXIS=NAVIGATION_RAIL_CENTER',
    'NAIVE_MENU_ROOT_LABEL_AXIS=BOTTOM_DOCK_EXPANDED_LABEL_AXIS',
    'BOTTOM_DOCK_CSS_GSAP_HANDOFF_GEOMETRY_CHANGE=PROHIBITED',
    'BOTTOM_DOCK_LAZY_READY_HANDOFF_ROW_COUNT=ONE_BEFORE_DURING_AND_AFTER',
    'BOTTOM_DOCK_LAZY_READY_HANDOFF_ICON_AXIS=INVARIANT',
    'GSAP_INLINE_STYLE_CLEANUP=REQUIRED_FOR_EVERY_NORMAL_COMPLETION_INTERRUPTION_FAILURE_AND_DISPOSAL_PATH',
    'GSAP_READY_ATTRIBUTE_CLEANUP=REQUIRED_FOR_EVERY_STABLE_OR_DISPOSED_STATE',
    'GSAP_GLOBAL_READY_ATTRIBUTE_USE=LIFECYCLE_AGGREGATE_ONLY_NOT_CSS_FALLBACK_OWNER',
    'GSAP_NAMED_INTERACTION_HANDOFF_MARKERS=INDEPENDENT_COLLAPSE_AND_ROUTE',
    'GSAP_COLLAPSE_HANDOFF_ATTRIBUTE=data-pavp-admin-navigation-collapse-motion',
    'GSAP_ROUTE_HANDOFF_ATTRIBUTE=data-pavp-admin-navigation-route-motion',
    'GSAP_CROSS_INTERACTION_FALLBACK_SUPPRESSION=PROHIBITED',
    'GSAP_HIDDEN_DOCUMENT_ACTIVATION=PROHIBITED',
    'GSAP_LAZY_LOAD_FAILURE_UNHANDLED_REJECTION=PROHIBITED',
  ] as const

  if (
    requiredAdminNavigationBottomDockHandoffMarkers.some(
      (marker) => !adminNavigationThemeReflowAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_BOTTOM_DOCK_HANDOFF')
  }

  const requiredAppearanceWideGridMarkers = [
    'APPEARANCE_THEME_GALLERY_WIDE_COLUMN_COUNT=4',
    'APPEARANCE_THEME_GALLERY_WIDE_EXPANDED_COLUMN_COUNT=4',
    'APPEARANCE_THEME_GALLERY_WIDE_COLLAPSED_COLUMN_COUNT=4',
    'APPEARANCE_THEME_GALLERY_WIDE_SWITCH_COLUMN_REFLOW=PROHIBITED',
    'APPEARANCE_THEME_GALLERY_WIDE_AUTO_FIT_THRESHOLD_CROSSING=PROHIBITED',
    'APPEARANCE_THEME_GALLERY_REGULAR_AND_NARROW_RESPONSIVE_BEHAVIOR=PRESERVED',
    'APPEARANCE_THEME_GALLERY_THEME_COUNT=14',
    'APPEARANCE_THEME_GALLERY_THEME_ORDER=PRESERVED',
    'APPEARANCE_THEME_GALLERY_SELECTION_AND_MUTATION_BEHAVIOR=PRESERVED',
    'OTHER_PAGE_CONTENT_MODEL_CHANGE=NONE',
  ] as const

  if (
    requiredAppearanceWideGridMarkers.some(
      (marker) => !adminNavigationThemeReflowAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_APPEARANCE_WIDE_GRID_STABILITY')
  }

  const adminNavigationHighlightRevealAmendmentHeading = `### 1.2B.0K \`${adminNavigationHighlightRevealWorkPackage}\``
  const adminNavigationHighlightRevealAmendmentStart = architectureSource.indexOf(
    adminNavigationHighlightRevealAmendmentHeading,
  )
  const adminNavigationHighlightRevealAmendmentEnd =
    adminNavigationHighlightRevealAmendmentStart === -1
      ? -1
      : architectureSource.indexOf(
          '\n### ',
          adminNavigationHighlightRevealAmendmentStart +
            adminNavigationHighlightRevealAmendmentHeading.length,
        )
  const adminNavigationHighlightRevealAmendmentSource =
    adminNavigationHighlightRevealAmendmentStart === -1
      ? ''
      : architectureSource.slice(
          adminNavigationHighlightRevealAmendmentStart,
          adminNavigationHighlightRevealAmendmentEnd === -1
            ? architectureSource.length
            : adminNavigationHighlightRevealAmendmentEnd,
        )
  const requiredAdminNavigationHighlightRevealAdmissionMarkers = [
    `AMENDMENT=${adminNavigationHighlightRevealAdmissionAmendment}`,
    'AMENDMENT_KIND=ARCHITECTURE_ONLY_SERIAL_OWNER_DIRECTED_NAVIGATION_INTERACTION_VISIBILITY_AND_REVEAL_ADMISSION',
    'AMENDMENT_STATUS=FROZEN',
    'NORMATIVE_WRITE_AUTHORITY=ARCHITECTURE.md',
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    'ACTIVATION_EFFECT=CANONICAL_WORK_PACKAGE_ADMISSION_ONLY',
    'SOURCE_IMPLEMENTATION_AUTHORITY=REQUIRES_SEPARATE_OWNER_CONFIRMATION',
    `WORK_PACKAGE=${adminNavigationHighlightRevealWorkPackage}`,
    '\nSTATUS=OPEN\n',
    '\nREPOSITORY_IMPLEMENTATION=NOT_STARTED\n',
    '\nSTATIC_VERIFICATION=NOT_RUN\n',
    'OWNER_DEMAND=CONFIRMED',
    'OWNER_BEST_SOLUTION_SELECTION=CONFIRMED',
    'OWNER_SOURCE_IMPLEMENTATION_AUTHORIZATION=NOT_GRANTED_IN_THIS_ARCHITECTURE_ONLY_TASK',
    'CONTRACT_PRECEDENCE=SECTION_1_2B_0K_SUPERSEDES_SECTION_1_2B_0J_NON_SELECTED_HOVER_SELECTED_TINT_TRAILING_AURA_MATERIAL_REVEAL_AND_ROUTE_REVEAL_HANDOFF_ONLY',
    'HISTORICAL_SECTION_1_2B_0J_CONTRACT_MUTATION=PROHIBITED',
    'NEW_CAPABILITY_STATUS_ENUM=PROHIBITED',
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
  ] as const

  if (
    adminNavigationHighlightRevealAmendmentSource.length === 0 ||
    requiredAdminNavigationHighlightRevealAdmissionMarkers.some(
      (marker) => !adminNavigationHighlightRevealAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_ADMISSION_NOT_FROZEN')
  }

  const requiredAdminNavigationThemeReflowHistoryMarkers = [
    `PREVIOUS_CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationThemeReflowAdmissionAmendment}`,
    `PREVIOUS_CURRENT_BOUNDED_WORK=${adminNavigationThemeReflowWorkPackage}`,
    'PREVIOUS_CURRENT_BOUNDED_WORK_STATUS=OPEN',
    'PREVIOUS_CURRENT_BOUNDED_WORK_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PREVIOUS_CURRENT_BOUNDED_WORK_STATIC_VERIFICATION=PASS',
    'PREVIOUS_CURRENT_BOUNDED_WORK_DISPOSITION=PRESERVED_AS_IMPLEMENTED_STATIC_BASELINE_NOT_CURRENT',
    `HISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationThemeReflowAdmissionAmendment}`,
    `HISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${adminNavigationThemeReflowWorkPackage}`,
    'WORK_PACKAGE_RELATION=SERIAL_OWNER_DIRECTED_NAVIGATION_INTERACTION_CORRECTION',
    'PARALLEL_NAVIGATION_IMPLEMENTATION=PROHIBITED',
    'PREVIOUS_IMPLEMENTATION_ROLLBACK=PROHIBITED',
  ] as const

  if (
    requiredAdminNavigationThemeReflowHistoryMarkers.some(
      (marker) => !adminNavigationHighlightRevealAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_ADMISSION_HISTORY')
  }

  const requiredAdminNavigationHighlightRevealVisualMarkers = [
    'NAVIGATION_VISUAL_DIRECTION=PRESERVED_OWNER_SELECTED_DIRECTION_2_ORDERLY_INSET_SELECTION',
    'EXPANDED_ROOT_LEFT_ACTIVE_INDICATOR=PROHIBITED',
    'NAVIGATION_NON_SELECTED_HOVER_PRESENTATION=VISIBLE_LOW_CONTRAST_THEME_TINTED_SURFACE',
    'NAVIGATION_NON_SELECTED_HOVER_SURFACE_COLOR_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 6%,var(--ui-material-chrome-background))',
    'NAVIGATION_NON_SELECTED_HOVER_TINT_STRENGTH=6%',
    'LEVEL_2_ACTIVE_SURFACE_COLOR_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 16%,var(--ui-material-overlay-background))',
    'SELECTED_TINT_STRENGTH=16%',
    'SELECTED_HOVER_AND_PRESSED_SURFACE=SAME_AS_SELECTED_SURFACE',
    'SELECTED_REVEAL_DECORATION=ONE_PAVP_OWNED_INSET_FLAT_THEME_TINT_REVEAL_PLANE',
    'SELECTED_REVEAL_COLOR_FORMULA=SAME_AS_LEVEL_2_ACTIVE_SURFACE_COLOR_FORMULA',
    'SELECTED_REVEAL_GEOMETRY=SAME_AS_NAIVE_NATIVE_MENU_ITEM_CONTENT_BEFORE_GEOMETRY',
    'SELECTED_REVEAL_FINAL_HANDOFF=IDENTICAL_COLOR_AND_GEOMETRY_FROM_TRANSIENT_REVEAL_TO_NAIVE_STATIC_SURFACE',
    'NEW_PUBLIC_VISUAL_TOKEN=NONE',
    'NEW_UI_INTERNAL_VISUAL_TOKEN=NONE',
    'NEW_MATERIAL_ROLE=NONE',
  ] as const

  if (
    requiredAdminNavigationHighlightRevealVisualMarkers.some(
      (marker) => !adminNavigationHighlightRevealAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_VISUAL_CONTRACT')
  }

  const requiredAdminNavigationHighlightRevealMaterialMarkers = [
    'REDUCED_MATERIAL_SELECTED_REVEAL=VISIBLE_FLAT_DURING_ROUTE_HANDOFF',
    'SOLID_MATERIAL_SELECTED_REVEAL=VISIBLE_FLAT_OPAQUE_DURING_ROUTE_HANDOFF',
    'SOLID_MATERIAL_SELECTED_REVEAL_DISPLAY_NONE=PROHIBITED',
    'PREFERS_REDUCED_TRANSPARENCY_SELECTED_REVEAL=VISIBLE_FLAT_DURING_ROUTE_HANDOFF',
    'FORCED_COLORS_SELECTED_REVEAL=HIDDEN',
    'SELECTED_GLASS_ON_GLASS=PROHIBITED',
    'SELECTED_REVEAL_FILTER_ANIMATION=PROHIBITED',
  ] as const

  if (
    requiredAdminNavigationHighlightRevealMaterialMarkers.some(
      (marker) => !adminNavigationHighlightRevealAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_MATERIAL_CONTRACT')
  }

  const requiredAdminNavigationHighlightRevealMotionMarkers = [
    'MOTION_PREFERENCE_AUTHORITY=EXISTING_FULL_REDUCED_NONE_APPEARANCE_STATE_ONLY',
    'GSAP_GLOBAL_STATUS=DEFERRED',
    'GSAP_INSTANCE_ADMISSION_COUNT=1',
    `GSAP_INSTANCE_ADMISSION_OWNER=${adminNavigationHighlightRevealWorkPackage}_ONLY`,
    'GSAP_DEPENDENCY_COORDINATE=gsap@3.15.0',
    'GSAP_DEPENDENCY_CHANGE=NONE',
    'GSAP_DYNAMIC_ROOT_CHANGE=NONE',
    'GSAP_BUNDLE_BUDGET_CHANGE=NONE',
    'GSAP_NAMED_PRODUCTION_INTERACTION_COUNT=2',
    'GSAP_NAMED_PRODUCTION_INTERACTION_CHANGE=NONE',
    'GSAP_ROUTE_INTERACTION_ID=admin-navigation.route-selection-inset-surface',
    'GSAP_ROUTE_HANDOFF_ATTRIBUTE=data-pavp-admin-navigation-route-motion',
    'FULL_SELECTED_REVEAL=200ms_OPACITY_VISIBILITY_AND_DECORATION_SCALE_0.96_TO_1',
    'FULL_SELECTED_REVEAL_DURATION_AUTHORITY=interaction.motion.duration',
    'FULL_SELECTED_REVEAL_EASING_AUTHORITY=interaction.motion.easing',
    'REDUCED_SELECTED_REVEAL=100ms_OPACITY_ONLY',
    'REDUCED_SELECTED_REVEAL_DURATION_AUTHORITY=calc(interaction.motion.duration / 2)',
    'REDUCED_SELECTED_REVEAL_TRANSFORM=PROHIBITED',
    'NONE_SELECTED_REVEAL=NO_TIMELINE_IMMEDIATE_STATIC_SELECTED_SURFACE',
    'GSAP_ROUTE_FULL_PROPERTY_ALLOWLIST=opacity;visibility;decoration-scale',
    'GSAP_ROUTE_REDUCED_PROPERTY_ALLOWLIST=opacity;visibility',
    'GSAP_ROUTE_NONE_PROPERTY_ALLOWLIST=NONE',
    'GSAP_FULL_PROPERTY_ALLOWLIST=opacity;visibility;translateX;decoration-scale',
    'GSAP_REDUCED_PROPERTY_ALLOWLIST=opacity;visibility',
    'GSAP_NONE_PROPERTY_ALLOWLIST=NONE',
    'HOVER_GSAP_OWNERSHIP=NONE',
  ] as const

  if (
    requiredAdminNavigationHighlightRevealMotionMarkers.some(
      (marker) => !adminNavigationHighlightRevealAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_MOTION_CONTRACT')
  }

  const requiredAdminNavigationHighlightRevealGsapBoundaryMarkers = [
    'GSAP_BACKGROUND_COLOR_OWNERSHIP=PROHIBITED',
    'GSAP_FILTER_OWNERSHIP=PROHIBITED',
    'GSAP_BACKDROP_FILTER_OWNERSHIP=PROHIBITED',
    'GSAP_LAYOUT_PROPERTY_OWNERSHIP=NONE',
  ] as const

  if (
    requiredAdminNavigationHighlightRevealGsapBoundaryMarkers.some(
      (marker) => !adminNavigationHighlightRevealAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_GSAP_BOUNDARY')
  }

  const requiredAdminNavigationHighlightRevealLifecycleMarkers = [
    'GSAP_ACTIVE_TIMELINE_COUNT_PER_INTERACTION=AT_MOST_ONE',
    'GSAP_NEW_INPUT_POLICY=INTERRUPT_CURRENT_AND_CONTINUE_FROM_CURRENT_RENDERED_STATE_WITH_REMAINING_DISTANCE_DURATION',
    'GSAP_REVERSAL_POLICY=REVERSE_WHEN_TARGET_RETURNS_TO_PRIOR_STABLE_STATE',
    'EMPTY_ROUTE_REVEAL_TARGET_POLICY=NO_CONTEXT_NO_MARKER_NO_TIMELINE_STABLE_CSS_FINAL_STATE',
    'LAZY_CONTROLLER_NOT_READY_ROUTE_POLICY=STABLE_CSS_FINAL_STATE_WITHOUT_DEFERRED_REPLAY_OR_REWIND',
    'GSAP_INLINE_STYLE_CLEANUP=REQUIRED_FOR_EVERY_NORMAL_COMPLETION_INTERRUPTION_FAILURE_AND_DISPOSAL_PATH',
    'GSAP_READY_ATTRIBUTE_CLEANUP=REQUIRED_FOR_EVERY_STABLE_OR_DISPOSED_STATE',
    'GSAP_DOM_QUERY=PROHIBITED',
    'GSAP_VENDOR_DOM_PATCH=PROHIBITED',
    'GSAP_TIMER_OR_RAF_OWNERSHIP=NONE',
    'MOTION_RESULT_PARITY=REQUIRED',
  ] as const

  if (
    requiredAdminNavigationHighlightRevealLifecycleMarkers.some(
      (marker) => !adminNavigationHighlightRevealAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_LIFECYCLE')
  }

  const adminNavigationHighlightRevealArchitectureOnlyPaths =
    '```text\nARCHITECTURE.md\nscripts/architecture/check-architecture-admin-console.ts\n```'
  if (
    !adminNavigationHighlightRevealAmendmentSource.includes(
      adminNavigationHighlightRevealArchitectureOnlyPaths,
    ) ||
    !adminNavigationHighlightRevealAmendmentSource.includes(
      'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_ARCHITECTURE_ONLY_SCOPE')
  }

  const adminNavigationNativeAmendmentHeading = `### 1.2B.0L \`${adminNavigationNativeWorkPackage}\``
  const adminNavigationNativeAmendmentStart = architectureSource.indexOf(
    adminNavigationNativeAmendmentHeading,
  )
  const adminNavigationNativeAmendmentEnd =
    adminNavigationNativeAmendmentStart === -1
      ? -1
      : architectureSource.indexOf(
          '\n### ',
          adminNavigationNativeAmendmentStart + adminNavigationNativeAmendmentHeading.length,
        )
  const adminNavigationNativeAmendmentSource =
    adminNavigationNativeAmendmentStart === -1
      ? ''
      : architectureSource.slice(
          adminNavigationNativeAmendmentStart,
          adminNavigationNativeAmendmentEnd === -1
            ? architectureSource.length
            : adminNavigationNativeAmendmentEnd,
        )
  const requiredAdminNavigationNativeAdmissionMarkers = [
    `AMENDMENT=${adminNavigationNativeAdmissionAmendment}`,
    'AMENDMENT_KIND=OWNER_DIRECTED_SUPERSEDING_ADMIN_NAVIGATION_CORRECTIVE_ADMISSION',
    'AMENDMENT_STATUS=FROZEN',
    `WORK_PACKAGE=${adminNavigationNativeWorkPackage}`,
    'WORK_PACKAGE_CLASSIFICATION=BOUNDED_NATIVE_NAIVE_NAVIGATION_SIMPLIFICATION',
    '\nSTATUS=ACCEPTED\n',
    '\nREPOSITORY_IMPLEMENTATION=COMPLETE\n',
    '\nSTATIC_VERIFICATION=PASS\n',
    'OPEN_TO_ACCEPTED_TRANSITION_AUTHORITY=SEPARATE_LATER_EXPLICIT_OWNER_REVIEW_AND_GIT_CLOSURE_TASK_ONLY',
    'OWNER_DEMAND=CONFIRMED',
    'OWNER_SOURCE_IMPLEMENTATION_AUTHORIZATION=CONFIRMED',
    'OWNER_DO_NOT_REQUEST_RECONFIRMATION=REQUIRED',
    `PREVIOUS_CURRENT_WORK=${adminNavigationHighlightRevealWorkPackage}`,
    'PREVIOUS_CURRENT_WORK_DISPOSITION=OWNER_REJECTED_BEFORE_SOURCE_IMPLEMENTATION_HISTORICAL_ONLY',
    'PREVIOUS_GSAP_IMPLEMENTATIONS_DISPOSITION=OWNER_REJECTED_HISTORICAL_ONLY',
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
  ] as const
  const requiredAdminNavigationNativeStructureMarkers = [
    'PERSISTENT_N_LAYOUT_SIDER_COUNT=1',
    'PERSISTENT_N_MENU_COUNT=1',
    'PERSISTENT_NAVIGATION_COLLAPSED_AUTHORITY=persistentNavigationCollapsed',
    'SIDER_AND_MENU_COLLAPSED_AUTHORITY=SAME',
    'SIDER_GEOMETRY_OWNER=NAIVE_NATIVE_MIN_AND_MAX_WIDTH_TRANSITION',
    'MENU_COLLAPSE_OWNER=NAIVE_NATIVE_LABEL_ICON_ARROW_AND_SUBMENU_TRANSITIONS',
    'PAVP_NATIVE_TRANSITION_SUPPRESSION=PROHIBITED',
    'MAIN_CONTENT_GEOMETRY_ANIMATION=PROHIBITED',
    'DUPLICATE_EXPANDED_COLLAPSED_MENU_TREES=PROHIBITED',
    'CHROME_OR_FLIP_BRIDGE=PROHIBITED',
    'MAIN_CONTENT_TRANSFORM_COMPENSATION=PROHIBITED',
    'ROUTE_AURA_OR_EXTRA_REVEAL_DOM=PROHIBITED',
    'MOVING_PILL=PROHIBITED',
    'NAVIGATION_TIMER_RAF_OR_ANIMATION_STATE_STORE=PROHIBITED',
    'WIDE_COLLAPSE_TRIGGER=ONE_PRIVATE_NAIVE_ICON_BUTTON',
    'WIDE_COLLAPSE_TRIGGER_AUTHORITY=TOGGLE_wideNavigationCollapsed_ONLY',
    'WIDE_COLLAPSE_TRIGGER_PROFILE=WIDE_ONLY',
    'WIDE_COLLAPSE_TRIGGER_PLACEMENT=EXISTING_TOP_APPLICATION_HEADER_FINAL_TRAILING_ACTION',
    'PREVIOUS_WIDE_COLLAPSE_TRIGGER_PLACEMENT=SIDEBAR_BOTTOM_LEFT_OWNER_REJECTED',
    'SIDEBAR_BOTTOM_COLLAPSE_CONTROL=PROHIBITED',
    'SETTINGS_ENTRY_IMPLEMENTATION=NOT_STARTED',
    'OWNER_NATIVE_COLLAPSE_MOTION_VISUAL_OBSERVATION=PASS',
    'OWNER_NATIVE_COLLAPSE_MOTION_VISUAL_OBSERVATION_SCOPE=CURRENT_NATIVE_COLLAPSE_MOTION_ONLY_NOT_PLACEMENT_OR_PACKAGE_ACCEPTANCE',
    'HEADER_GEOMETRY_MOTION=NONE',
    'NEW_MOTION_STATE_PERSISTENCE_TOKEN_DEPENDENCY_ROUTE_OR_PUBLIC_API=NONE',
    'REGULAR_NAVIGATION=PERMANENTLY_COLLAPSED',
    'NARROW_DRAWER_CHANGE=NONE',
    'BOUNDED_CORRECTION=PAVP_ADMIN_HEADER_NAIVE_ACTIONS_AND_MENU_SELECTION_MOTION_INTEGRATION',
    'ADMIN_CONSOLE_PRODUCT_ACTION_COMPONENT_BOUNDARY=EXISTING_PAVP_PUBLIC_COMPONENT_OR_PRIVATE_ADMITTED_NAIVE_COMPONENT',
    'HEADER_NAVIGATION_ACTION_PRIMITIVES=PRIVATE_NBUTTON_NICON_NTOOLTIP',
    'HEADER_NAVIGATION_ACTION_NATIVE_BUTTON=PROHIBITED',
    'HEADER_NAVIGATION_ACTION_BROWSER_TITLE=PROHIBITED',
    'HEADER_NAVIGATION_ACTION_TOOLTIP_TARGET=#pavp-overlay-root',
    'HEADER_NAVIGATION_ACTION_GEOMETRY=UNO_CSS_AND_EXISTING_PAVP_SHORTCUTS',
    'HEADER_NAVIGATION_ACTION_VISUAL_AUTHORITY=PAVP_DESIGN_TOKENS_THROUGH_NAIVE_THEME_OVERRIDES',
    'HEADER_NAVIGATION_ACTION_PAGE_LEVEL_RAW_CSS_OR_VISUAL_LITERAL=PROHIBITED',
    'HEADER_NAVIGATION_ACTION_PRIVATE_VENDOR_CSS=NAIVE_INTERNAL_STATE_ONLY',
    'HEADER_NAVIGATION_ACTION_ICON_STACK=STABLE_TWO_LAYERS_BOTH_MOUNTED',
    'HEADER_NAVIGATION_ACTION_ICON_FULL=OPACITY_AND_EXISTING_SELECTED_SURFACE_SCALE',
    'HEADER_NAVIGATION_ACTION_ICON_REDUCED=OPACITY_ONLY_HALF_DURATION',
    'HEADER_NAVIGATION_ACTION_ICON_NONE=IMMEDIATE_WITHOUT_TRANSITION_ANIMATION_OR_TRANSFORM',
    'NEW_MOTION_MATERIAL_TOKEN_STATE_PERSISTENCE_DEPENDENCY_OR_PUBLIC_API=NONE',
  ] as const
  const requiredAdminNavigationNativeVisualMarkers = [
    'SELECTED_SURFACE_OWNER=NAIVE_MENU_ITEM_CONTENT_BEFORE_AND_DROPDOWN_OPTION_BODY_BEFORE',
    'HOVER_SURFACE_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 6%,var(--ui-material-chrome-background))',
    'SELECTED_SURFACE_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 16%,var(--ui-material-overlay-background))',
    'SELECTED_HOVER_AND_PRESSED_SURFACE=SAME_16_PERCENT_SELECTED_SURFACE',
    'EXPANDED_ROOT_CHILD_ACTIVE_PRESENTATION=FOREGROUND_ONLY_AT_REST',
    'COLLAPSED_ROOT_CHILD_ACTIVE_SURFACE=SAME_16_PERCENT_SELECTED_SURFACE',
    'COLLAPSED_DROPDOWN_SELECTED_SURFACE=SAME_16_PERCENT_SELECTED_SURFACE',
    'OLD_SELECTED_EXIT_AND_NEW_SELECTED_ENTER=PARALLEL_NATIVE_CLASS_STATE_TRANSITION',
    'MENU_SELECTED_EXIT_ENTRY_OWNER=EXISTING_NAIVE_STATE_SURFACES_ONLY',
    'LEFT_SELECTION_BAR=PROHIBITED',
    'HARD_ROUTE_DOT=PROHIBITED',
    'BADGE_OUTLINE_OR_ADDITIONAL_SHADOW=PROHIBITED',
    'FILTER_BLUR_OR_BACKDROP_ANIMATION=PROHIBITED',
    'FOCUS_VISUAL_AUTHORITY=color.focus.ring',
  ] as const
  const requiredAdminNavigationNativeRetirementMarkers = [
    'GSAP_GLOBAL_STATUS=DEFERRED',
    'GSAP_INSTANCE_ADMISSION_COUNT=0',
    'GSAP_NAVIGATION_RUNTIME_CONSUMERS=0',
    'GSAP_SOURCE_IMPORTS=0',
    'GSAP_DIRECT_DEPENDENCIES=0',
    'GSAP_CATALOG_ENTRIES=0',
    'GSAP_LOCKFILE_ENTRIES=0',
    'NON_ROUTE_DYNAMIC_MOTION_ROOT_COUNT=0',
    'EXACT_DYNAMIC_ROOT_COUNT=17',
    'DYNAMIC_ROOT_SET=EXACT_REGISTERED_LAZY_ROUTES_ONLY',
    'ROUTE_REGISTRY_RECORDS=17',
    'RUNTIME_KERNEL_STEP_COUNT=11',
    'ACTIVE_PROVIDER_IDS=pinia,appearance',
    'STORAGE_REGISTRY_RECORDS=2',
    'INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=229376',
    'INITIAL_JAVASCRIPT_MINIMUM_HEADROOM_BYTES=8192',
    'INITIAL_CSS_AND_LAZY_ROUTE_BUDGET_CHANGE=NONE',
    `IMPLEMENTATION_PATH_COUNT=${String(expectedAdminNavigationNativeImplementationPaths.length)}`,
    `IMPLEMENTATION_PATH_INVENTORY=${expectedAdminNavigationNativeImplementationPathInventory}`,
    'ACCEPTANCE_CLOSURE_MUTATION_PATHS=ARCHITECTURE.md;scripts/architecture/check-architecture-admin-console.ts',
    'NON_ACCEPTANCE_IMPLEMENTATION_PATH_COUNT=16',
    'NON_ACCEPTANCE_IMPLEMENTATION_PATH_SHA256_PRESERVATION=REQUIRED',
    `ACCEPTANCE_CLOSURE_REVERSIBLE_PROBE_COUNT=${String(expectedAdminNavigationNativeAcceptanceClosureNegativeProbeCount)}`,
  ] as const

  if (
    adminNavigationNativeAmendmentSource.length === 0 ||
    requiredAdminNavigationNativeAdmissionMarkers.some(
      (marker) => !adminNavigationNativeAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_ADMISSION')
  }
  if (
    requiredAdminNavigationNativeStructureMarkers.some(
      (marker) => !adminNavigationNativeAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_STRUCTURE')
  }
  if (
    requiredAdminNavigationNativeVisualMarkers.some(
      (marker) => !adminNavigationNativeAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_VISUAL_MOTION')
  }
  if (
    requiredAdminNavigationNativeRetirementMarkers.some(
      (marker) => !adminNavigationNativeAmendmentSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_GSAP_RETIREMENT')
  }

  if (
    exactOccurrenceCount(
      architectureSource,
      `OWNER_ACCEPTANCE_STATEMENT=${adminNavigationNativeAcceptanceStatement}`,
    ) !== 1 ||
    exactOccurrenceCount(architectureSource, adminNavigationNativeAcceptanceStatement) !== 1
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_ACCEPTANCE_STATEMENT')
  }
  if (
    exactOccurrenceCount(adminNavigationNativeAmendmentSource, 'OWNER_RUNTIME_ACCEPTANCE=PASS') !==
    1
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_RUNTIME_ACCEPTANCE')
  }
  if (
    exactOccurrenceCount(adminNavigationNativeAmendmentSource, 'OWNER_VISUAL_ACCEPTANCE=PASS') !== 1
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_VISUAL_ACCEPTANCE')
  }
  if (
    exactOccurrenceCount(
      adminNavigationNativeAmendmentSource,
      'OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED',
    ) !== 1 ||
    adminNavigationNativeAmendmentSource.includes('OWNER_ACCESSIBILITY_ACCEPTANCE=PASS')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_ACCESSIBILITY_ACCEPTANCE')
  }
  if (
    exactOccurrenceCount(adminNavigationNativeAmendmentSource, 'PUBLICATION_TARGET=origin/main') !==
      1 ||
    exactOccurrenceCount(
      adminNavigationNativeAmendmentSource,
      'PRODUCTION_RELEASE=NOT_RELEASED',
    ) !== 1
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_PUBLICATION_RELEASE_BOUNDARY')
  }

  const architectureLines = architectureSource.split(/\r?\n/u)
  const activeMirrorIndexes = architectureLines.flatMap((line, index) =>
    /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS[ \t]*=/u.test(line) ? [index] : [],
  )

  if (activeMirrorIndexes.length === 0) {
    violations.push('DARK_ACTION_ACCEPTANCE_STATUS')
  }

  for (const mirrorIndex of activeMirrorIndexes) {
    const mirrorLines = architectureLines.slice(mirrorIndex, mirrorIndex + 40)
    const workValues = mirrorLines.flatMap((line) => {
      const match = /^CURRENT_BOUNDED_WORK[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
      return match?.[1] === undefined ? [] : [match[1].trim()]
    })
    const authorityValues = mirrorLines.flatMap((line) => {
      const match = /^CURRENT_BOUNDED_WORK_AUTHORITY[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
      return match?.[1] === undefined ? [] : [match[1].trim()]
    })

    if (
      workValues.length !== 1 ||
      authorityValues.length !== 1 ||
      workValues[0] !== routeTransitionWorkPackage ||
      authorityValues[0] !== routeTransitionAdmissionAmendment
    ) {
      recordCurrentWorkViolation()
    }
  }

  const allCurrentWorkMarkers = architectureLines.flatMap((line) => {
    const match = /^CURRENT_BOUNDED_WORK[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
    return match?.[1] === undefined ? [] : [match[1].trim()]
  })
  const allCurrentWorkAuthorityMarkers = architectureLines.flatMap((line) => {
    const match = /^CURRENT_BOUNDED_WORK_AUTHORITY[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
    return match?.[1] === undefined ? [] : [match[1].trim()]
  })

  if (
    allCurrentWorkMarkers.length !== expectedRouteTransitionActiveMirrorCount ||
    allCurrentWorkAuthorityMarkers.length !== expectedRouteTransitionActiveMirrorCount ||
    allCurrentWorkMarkers.some((value) => value !== routeTransitionWorkPackage) ||
    allCurrentWorkAuthorityMarkers.some((value) => value !== routeTransitionAdmissionAmendment)
  ) {
    recordCurrentWorkViolation()
  }

  if (
    navigationReworkAdmissionValues.length !== expectedRuntime003ActiveMirrorCount ||
    navigationReworkAdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_ADMISSION_NOT_FROZEN')
  }
  if (
    navigationReworkStatusValues.length !== expectedRuntime003ActiveMirrorCount ||
    navigationReworkStatusValues.some((value) => value !== 'OPEN')
  ) {
    violations.push('PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_STATUS')
  }
  if (
    navigationReworkImplementationValues.length !== expectedRuntime003ActiveMirrorCount ||
    navigationReworkImplementationValues.some((value) => value !== 'COMPLETE')
  ) {
    violations.push(
      'PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_REPOSITORY_IMPLEMENTATION_STATE',
    )
    violations.push('PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_HISTORY')
  }
  if (
    navigationReworkVerificationValues.length !== expectedRuntime003ActiveMirrorCount ||
    navigationReworkVerificationValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_STATIC_VERIFICATION_STATE')
    violations.push('PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_HISTORY')
  }

  if (
    adminNavigationGsapAdmissionValues.length !== expectedAdminNavigationGsapActiveMirrorCount ||
    adminNavigationGsapAdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_ADMISSION_NOT_FROZEN')
  }
  if (
    adminNavigationGsapStatusValues.length !== expectedAdminNavigationGsapActiveMirrorCount ||
    adminNavigationGsapStatusValues.some((value) => value !== 'OPEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_STATUS')
  }
  if (
    adminNavigationGsapImplementationValues.length !==
      expectedAdminNavigationGsapActiveMirrorCount ||
    adminNavigationGsapImplementationValues.some((value) => value !== 'COMPLETE')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_REPOSITORY_IMPLEMENTATION_STATE')
  }
  if (
    adminNavigationGsapVerificationValues.length !== expectedAdminNavigationGsapActiveMirrorCount ||
    adminNavigationGsapVerificationValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_STATIC_VERIFICATION_STATE')
  }

  if (
    adminNavigationThemeReflowAdmissionValues.length !==
      expectedAdminNavigationThemeReflowActiveMirrorCount ||
    adminNavigationThemeReflowAdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_ADMISSION_NOT_FROZEN')
  }
  if (
    adminNavigationThemeReflowStatusValues.length !==
      expectedAdminNavigationThemeReflowActiveMirrorCount ||
    adminNavigationThemeReflowStatusValues.some((value) => value !== 'OPEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_STATUS')
  }
  if (
    adminNavigationThemeReflowImplementationValues.length !==
      expectedAdminNavigationThemeReflowActiveMirrorCount ||
    adminNavigationThemeReflowImplementationValues.some((value) => value !== 'COMPLETE')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_REPOSITORY_IMPLEMENTATION_STATE')
  }
  if (
    adminNavigationThemeReflowVerificationValues.length !==
      expectedAdminNavigationThemeReflowActiveMirrorCount ||
    adminNavigationThemeReflowVerificationValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_STATIC_VERIFICATION_STATE')
  }

  if (
    adminNavigationHighlightRevealAdmissionValues.length !==
      expectedAdminNavigationHighlightRevealActiveMirrorCount ||
    adminNavigationHighlightRevealAdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_ADMISSION_NOT_FROZEN')
  }
  if (
    adminNavigationHighlightRevealStatusValues.length !==
      expectedAdminNavigationHighlightRevealActiveMirrorCount ||
    adminNavigationHighlightRevealStatusValues.some((value) => value !== 'OPEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_STATUS')
  }
  if (
    adminNavigationHighlightRevealImplementationValues.length !==
      expectedAdminNavigationHighlightRevealActiveMirrorCount ||
    adminNavigationHighlightRevealImplementationValues.some((value) => value !== 'NOT_STARTED')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_REPOSITORY_IMPLEMENTATION_STATE')
  }
  if (
    adminNavigationHighlightRevealVerificationValues.length !==
      expectedAdminNavigationHighlightRevealActiveMirrorCount ||
    adminNavigationHighlightRevealVerificationValues.some((value) => value !== 'NOT_RUN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_STATIC_VERIFICATION_STATE')
  }

  if (
    adminNavigationNativeAdmissionValues.length !==
      expectedAdminNavigationNativeActiveMirrorCount ||
    adminNavigationNativeAdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_ADMISSION')
  }
  if (
    adminNavigationNativeStatusValues.length !== expectedAdminNavigationNativeActiveMirrorCount ||
    adminNavigationNativeStatusValues.some((value) => value !== 'ACCEPTED')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_STATUS')
  }
  if (
    adminNavigationNativeImplementationValues.length !==
      expectedAdminNavigationNativeActiveMirrorCount ||
    adminNavigationNativeImplementationValues.some((value) => value !== 'COMPLETE')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_REPOSITORY_IMPLEMENTATION_STATE')
  }
  if (
    adminNavigationNativeVerificationValues.length !==
      expectedAdminNavigationNativeActiveMirrorCount ||
    adminNavigationNativeVerificationValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_STATIC_VERIFICATION_STATE')
  }

  if (
    adminNavigationMotionVueSelectionLensAdmissionValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensAdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_ADMISSION_NOT_FROZEN')
  }
  if (
    adminNavigationMotionVueSelectionLensStatusValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensStatusValues.some((value) => value !== 'ACCEPTED')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_STATUS')
  }
  if (
    adminNavigationMotionVueSelectionLensImplementationValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensImplementationValues.some((value) => value !== 'COMPLETE')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_IMPLEMENTATION_STATE')
  }
  if (
    adminNavigationMotionVueSelectionLensVerificationValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensVerificationValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_STATIC_VERIFICATION_STATE')
  }
  if (
    adminNavigationMotionVueSelectionLensRuntimeAcceptanceValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensRuntimeAcceptanceValues.some(
      (value) => value !== 'PASS',
    ) ||
    adminNavigationMotionVueSelectionLensVisualAcceptanceValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensVisualAcceptanceValues.some((value) => value !== 'PASS') ||
    adminNavigationMotionVueSelectionLensAccessibilityAcceptanceValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensAccessibilityAcceptanceValues.some(
      (value) => value !== 'NOT_PERFORMED',
    ) ||
    adminNavigationMotionVueSelectionLensPublicationValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensPublicationValues.some((value) => value !== 'COMPLETE') ||
    adminNavigationMotionVueSelectionLensReleaseValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensReleaseValues.some((value) => value !== 'NOT_RELEASED') ||
    adminNavigationMotionVueSelectionLensAcceptanceStatementValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensAcceptanceStatementValues.some(
      (value) => value !== adminNavigationMotionVueSelectionLensAcceptanceStatement,
    ) ||
    adminNavigationMotionVueSelectionLensImplementationCommitValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensImplementationCommitValues.some(
      (value) => value !== adminNavigationMotionVueSelectionLensImplementationCommit,
    ) ||
    adminNavigationMotionVueSelectionLensPublicationTargetValues.length !==
      expectedAdminNavigationMotionVueSelectionLensActiveMirrorCount ||
    adminNavigationMotionVueSelectionLensPublicationTargetValues.some(
      (value) => value !== 'origin/main',
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_STATE_BOUNDARY')
  }

  if (
    routeTransitionAdmissionValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionAdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_ROUTE_TRANSITION_ADMISSION_NOT_FROZEN')
  }
  if (
    routeTransitionStatusValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionStatusValues.some((value) => value !== 'OPEN') ||
    routeTransitionImplementationValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionImplementationValues.some((value) => value !== 'COMPLETE') ||
    routeTransitionVerificationValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionVerificationValues.some((value) => value !== 'PASS') ||
    routeTransitionRuntimeAcceptanceValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionRuntimeAcceptanceValues.some((value) => value !== 'NOT_PERFORMED') ||
    routeTransitionVisualAcceptanceValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionVisualAcceptanceValues.some((value) => value !== 'NOT_PERFORMED') ||
    routeTransitionAccessibilityAcceptanceValues.length !==
      expectedRouteTransitionActiveMirrorCount ||
    routeTransitionAccessibilityAcceptanceValues.some((value) => value !== 'NOT_PERFORMED') ||
    routeTransitionPublicationValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionPublicationValues.some((value) => value !== 'NOT_PUBLISHED') ||
    routeTransitionReleaseValues.length !== expectedRouteTransitionActiveMirrorCount ||
    routeTransitionReleaseValues.some((value) => value !== 'NOT_RELEASED')
  ) {
    violations.push('PAVP_ROUTE_TRANSITION_STATE_BOUNDARY')
  }

  const statusValues = [
    ...architectureSource.matchAll(
      /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS[ \t]*=[ \t]*([^\r\n]+)$/gmu,
    ),
  ].map((match) => match[1]?.trim())
  const implementationValues = [
    ...architectureSource.matchAll(
      /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION[ \t]*=[ \t]*([^\r\n]+)$/gmu,
    ),
  ].map((match) => match[1]?.trim())
  const verificationValues = [
    ...architectureSource.matchAll(
      /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATIC_VERIFICATION[ \t]*=[ \t]*([^\r\n]+)$/gmu,
    ),
  ].map((match) => match[1]?.trim())
  const admissionValues = [
    ...architectureSource.matchAll(
      /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT[ \t]*=[ \t]*([^\r\n]+)$/gmu,
    ),
  ].map((match) => match[1]?.trim())
  const ownerRuntimeAcceptanceValues = valuesForMarker(
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_RUNTIME_ACCEPTANCE',
  )
  const ownerVisualAcceptanceValues = valuesForMarker(
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_VISUAL_ACCEPTANCE',
  )
  const ownerAcceptanceStatementValues = valuesForMarker(
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_ACCEPTANCE_STATEMENT',
  )
  const implementationCommitValues = valuesForMarker(
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_IMPLEMENTATION_COMMIT',
  )
  const publicationTargetValues = valuesForMarker(
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_TARGET',
  )
  const publicationStatusValues = valuesForMarker(
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_STATUS',
  )

  if (
    statusValues.length !== activeMirrorIndexes.length ||
    statusValues.some((value) => value !== 'ACCEPTED')
  ) {
    violations.push('DARK_ACTION_ACCEPTANCE_STATUS')
  }
  if (
    implementationValues.length !== activeMirrorIndexes.length ||
    implementationValues.some((value) => value !== 'COMPLETE') ||
    verificationValues.length !== activeMirrorIndexes.length ||
    verificationValues.some((value) => value !== 'PASS') ||
    admissionValues.length === 0 ||
    admissionValues.some((value) => value !== 'FROZEN') ||
    implementationCommitValues.length !== activeMirrorIndexes.length ||
    implementationCommitValues.some((value) => value !== darkActionImplementationCommit) ||
    publicationTargetValues.length !== activeMirrorIndexes.length ||
    publicationTargetValues.some((value) => value !== 'origin/main') ||
    publicationStatusValues.length !== activeMirrorIndexes.length ||
    publicationStatusValues.some((value) => value !== 'COMPLETE') ||
    ownerAcceptanceStatementValues.length !== activeMirrorIndexes.length ||
    ownerAcceptanceStatementValues.some((value) => value !== darkActionAcceptanceStatement)
  ) {
    violations.push('DARK_ACTION_ACCEPTANCE_MIRROR')
  }
  if (
    ownerRuntimeAcceptanceValues.length !== activeMirrorIndexes.length ||
    ownerRuntimeAcceptanceValues.some((value) => value !== 'PASS')
  ) {
    violations.push('DARK_ACTION_OWNER_RUNTIME_ACCEPTANCE')
  }
  if (
    ownerVisualAcceptanceValues.length !== activeMirrorIndexes.length ||
    ownerVisualAcceptanceValues.some((value) => value !== 'PASS')
  ) {
    violations.push('DARK_ACTION_OWNER_VISUAL_ACCEPTANCE')
  }

  const historicalWorkLine = `HISTORICAL_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${acceptedDarkActionWorkPackage}`
  const historicalAuthorityLine = `HISTORICAL_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${darkActionAdmissionAmendment}`
  const historicalWorkLines = architectureLines.filter((line) =>
    line.includes(`CURRENT_BOUNDED_WORK=${acceptedDarkActionWorkPackage}`),
  )
  const historicalAuthorityLines = architectureLines.filter((line) =>
    line.includes(`CURRENT_BOUNDED_WORK_AUTHORITY=${darkActionAdmissionAmendment}`),
  )

  if (
    historicalWorkLines.length !== 1 ||
    historicalWorkLines[0] !== historicalWorkLine ||
    historicalAuthorityLines.length !== 1 ||
    historicalAuthorityLines[0] !== historicalAuthorityLine
  ) {
    violations.push('DARK_ACTION_ADMISSION_HISTORY')
  }

  const runtime003HistoricalWorkLine = `HISTORICAL_PAVP_RUNTIME_003_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${runtime003WorkItem}`
  const runtime003HistoricalAuthorityLine = `HISTORICAL_PAVP_RUNTIME_003_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${runtime003AdmissionAmendment}`
  const runtime003HistoricalWorkLines = architectureLines.filter((line) =>
    line.includes(`CURRENT_BOUNDED_WORK=${runtime003WorkItem}`),
  )
  const runtime003HistoricalAuthorityLines = architectureLines.filter((line) =>
    line.includes(`CURRENT_BOUNDED_WORK_AUTHORITY=${runtime003AdmissionAmendment}`),
  )

  if (
    runtime003HistoricalWorkLines.length !== 1 ||
    runtime003HistoricalWorkLines[0] !== runtime003HistoricalWorkLine ||
    runtime003HistoricalAuthorityLines.length !== 1 ||
    runtime003HistoricalAuthorityLines[0] !== runtime003HistoricalAuthorityLine
  ) {
    violations.push('PAVP_RUNTIME_003_ADMISSION_HISTORY')
  }

  const requiredDarkActionFinalInvariantMarkers = [
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT_IS_FROZEN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS_IS_ACCEPTED',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION_IS_COMPLETE',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATIC_VERIFICATION_IS_PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_RUNTIME_ACCEPTANCE_IS_PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_VISUAL_ACCEPTANCE_IS_PASS',
    `PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_ACCEPTANCE_STATEMENT_IS_${darkActionAcceptanceStatement}`,
    `PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_IMPLEMENTATION_COMMIT_IS_${darkActionImplementationCommit}`,
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_TARGET_IS_ORIGIN_MAIN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_STATUS_IS_COMPLETE',
  ] as const
  const requiredRuntime003FinalInvariantMarkers = [
    'PAVP_RUNTIME_003_ADMISSION_AMENDMENT_IS_FROZEN',
    'PAVP_RUNTIME_003_STATUS_IS_ACCEPTED',
    'PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION_IS_COMPLETE',
    'PAVP_RUNTIME_003_STATIC_VERIFICATION_IS_PASS',
    'PAVP_RUNTIME_003_OWNER_RUNTIME_ACCEPTANCE_IS_PASS',
    'PAVP_RUNTIME_003_OWNER_VISUAL_ACCEPTANCE_IS_PASS',
    'PAVP_RUNTIME_003_OWNER_ACCESSIBILITY_ACCEPTANCE_IS_PASS',
    `PAVP_RUNTIME_003_OWNER_ACCEPTANCE_STATEMENT_IS_${runtime003AcceptanceStatement}`,
    `PAVP_RUNTIME_003_IMPLEMENTATION_COMMIT_IS_${runtime003ImplementationCommit}`,
    'PAVP_RUNTIME_003_PUBLICATION_TARGET_IS_ORIGIN_MAIN',
    'PAVP_RUNTIME_003_PUBLICATION_STATUS_IS_COMPLETE',
  ] as const
  const requiredNavigationReworkFinalInvariantMarkers = [
    `${navigationReworkAdmissionAmendment}_IS_FROZEN`,
    `${navigationReworkWorkPackage}_STATUS_IS_OPEN`,
    `${navigationReworkWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_COMPLETE`,
    `${navigationReworkWorkPackage}_STATIC_VERIFICATION_IS_PASS`,
  ] as const
  const requiredAdminNavigationGsapFinalInvariantMarkers = [
    `${adminNavigationGsapAdmissionAmendment}_IS_FROZEN`,
    `${adminNavigationGsapWorkPackage}_STATUS_IS_OPEN`,
    `${adminNavigationGsapWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_COMPLETE`,
    `${adminNavigationGsapWorkPackage}_STATIC_VERIFICATION_IS_PASS`,
  ] as const
  const requiredAdminNavigationThemeReflowFinalInvariantMarkers = [
    `${adminNavigationThemeReflowAdmissionAmendment}_IS_FROZEN`,
    `${adminNavigationThemeReflowWorkPackage}_STATUS_IS_OPEN`,
    `${adminNavigationThemeReflowWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_COMPLETE`,
    `${adminNavigationThemeReflowWorkPackage}_STATIC_VERIFICATION_IS_PASS`,
  ] as const
  const requiredAdminNavigationHighlightRevealFinalInvariantMarkers = [
    `${adminNavigationHighlightRevealAdmissionAmendment}_IS_FROZEN`,
    `${adminNavigationHighlightRevealWorkPackage}_STATUS_IS_OPEN`,
    `${adminNavigationHighlightRevealWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_NOT_STARTED`,
    `${adminNavigationHighlightRevealWorkPackage}_STATIC_VERIFICATION_IS_NOT_RUN`,
  ] as const
  const requiredAdminNavigationNativeFinalInvariantMarkers = [
    `${adminNavigationNativeAdmissionAmendment}_IS_FROZEN`,
    `${adminNavigationNativeWorkPackage}_STATUS_IS_ACCEPTED`,
    `${adminNavigationNativeWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_COMPLETE`,
    `${adminNavigationNativeWorkPackage}_STATIC_VERIFICATION_IS_PASS`,
    'GSAP_GLOBAL_STATUS_REMAINS_DEFERRED',
    'GSAP_INSTANCE_ADMISSION_COUNT_IS_0',
  ] as const
  const requiredAdminNavigationMotionVueSelectionLensFinalInvariantMarkers = [
    `${adminNavigationMotionVueSelectionLensAdmissionAmendment}_IS_FROZEN`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_STATUS_IS_ACCEPTED`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_COMPLETE`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_STATIC_VERIFICATION_IS_PASS`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_RUNTIME_ACCEPTANCE_IS_PASS`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_VISUAL_ACCEPTANCE_IS_PASS`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_ACCESSIBILITY_ACCEPTANCE_IS_NOT_PERFORMED`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_OWNER_ACCEPTANCE_STATEMENT_IS_${adminNavigationMotionVueSelectionLensAcceptanceStatement}`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_IMPLEMENTATION_COMMIT_IS_${adminNavigationMotionVueSelectionLensImplementationCommit}`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_PUBLICATION_TARGET_IS_ORIGIN_MAIN`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_PUBLICATION_STATUS_IS_COMPLETE`,
    `${adminNavigationMotionVueSelectionLensWorkPackage}_RELEASE_STATUS_IS_NOT_RELEASED`,
  ] as const
  const requiredRouteTransitionFinalInvariantMarkers = [
    `${routeTransitionAdmissionAmendment}_IS_FROZEN`,
    `CURRENT_BOUNDED_WORK_AUTHORITY_IS_${routeTransitionAdmissionAmendment}`,
    `CURRENT_BOUNDED_WORK_IS_${routeTransitionWorkPackage}`,
    `${routeTransitionWorkPackage}_STATUS_IS_OPEN`,
    `${routeTransitionWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_COMPLETE`,
    `${routeTransitionWorkPackage}_STATIC_VERIFICATION_IS_PASS`,
    `${routeTransitionWorkPackage}_OWNER_RUNTIME_ACCEPTANCE_IS_NOT_PERFORMED`,
    `${routeTransitionWorkPackage}_OWNER_VISUAL_ACCEPTANCE_IS_NOT_PERFORMED`,
    `${routeTransitionWorkPackage}_OWNER_ACCESSIBILITY_ACCEPTANCE_IS_NOT_PERFORMED`,
    `${routeTransitionWorkPackage}_PUBLICATION_STATUS_IS_NOT_PUBLISHED`,
    `${routeTransitionWorkPackage}_RELEASE_STATUS_IS_NOT_RELEASED`,
  ] as const
  const requiredSuccessorFinalInvariantMarkers = [
    'NEXT_CANONICAL_WORK_PACKAGE_IS_NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE_IS_NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION_IS_NONE',
  ] as const

  if (
    requiredDarkActionFinalInvariantMarkers.some((marker) => !architectureSource.includes(marker))
  ) {
    violations.push('DARK_ACTION_ACCEPTANCE_MIRROR')
  }
  if (
    requiredRuntime003FinalInvariantMarkers.some((marker) => !architectureSource.includes(marker))
  ) {
    violations.push('PAVP_RUNTIME_003_ACCEPTANCE_MIRROR')
  }
  if (
    requiredNavigationReworkFinalInvariantMarkers.some(
      (marker) => !architectureSource.includes(marker),
    )
  ) {
    violations.push('PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_FINAL_INVARIANT')
  }
  if (
    requiredAdminNavigationGsapFinalInvariantMarkers.some(
      (marker) => !architectureSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_GSAP_FINAL_INVARIANT')
  }
  if (
    requiredAdminNavigationThemeReflowFinalInvariantMarkers.some(
      (marker) => !architectureSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_THEME_REFLOW_FINAL_INVARIANT')
  }
  if (
    requiredAdminNavigationHighlightRevealFinalInvariantMarkers.some(
      (marker) => !architectureSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_FINAL_INVARIANT')
  }
  if (
    requiredAdminNavigationNativeFinalInvariantMarkers.some(
      (marker) => !architectureSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_NATIVE_FINAL_INVARIANT')
  }
  if (
    requiredAdminNavigationMotionVueSelectionLensFinalInvariantMarkers.some(
      (marker) => !architectureSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_FINAL_INVARIANT')
  }
  if (
    requiredRouteTransitionFinalInvariantMarkers.some(
      (marker) => !architectureSource.includes(marker),
    )
  ) {
    violations.push('PAVP_ROUTE_TRANSITION_FINAL_INVARIANT')
  }
  if (
    requiredSuccessorFinalInvariantMarkers.some((marker) => !architectureSource.includes(marker))
  ) {
    violations.push('DARK_ACTION_SUCCESSOR_STATE')
  }

  const canonicalNextWork = /^NEXT_CANONICAL_WORK_PACKAGE[ \t]*=[ \t]*([^\r\n]+)$/mu
    .exec(canonicalStatusSource)?.[1]
    ?.trim()
  const canonicalNextImplementation =
    /^NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE[ \t]*=[ \t]*([^\r\n]+)$/mu
      .exec(canonicalStatusSource)?.[1]
      ?.trim()
  const canonicalSuccessorAuthorization =
    /^SUCCESSOR_PACKAGE_AUTHORIZATION[ \t]*=[ \t]*([^\r\n]+)$/mu
      .exec(canonicalStatusSource)?.[1]
      ?.trim()

  if (
    canonicalNextWork !== 'NONE' ||
    canonicalNextImplementation !== 'NONE' ||
    canonicalSuccessorAuthorization !== 'NONE'
  ) {
    violations.push('DARK_ACTION_SUCCESSOR_STATE')
  }

  const overallAcceptanceMarkers = [
    'OWNER_PRODUCT_EXPERIENCE_ACCEPTANCE',
    'CURRENT_RELEASE_ACCEPTANCE',
    'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE',
    'ADMIN_CONSOLE_OVERALL_VISUAL_ACCEPTANCE',
    'ADMIN_CONSOLE_OVERALL_ACCESSIBILITY_ACCEPTANCE',
    'ADMIN_CONSOLE_OVERALL_RELEASE_ACCEPTANCE',
  ] as const
  if (
    overallAcceptanceMarkers.some((marker) => {
      const values = valuesForMarker(marker)
      return (
        values.length === 0 ||
        values.some((value) => value !== 'REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT')
      )
    })
  ) {
    violations.push('ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORED')
  }

  const runtime003AdmissionValues = valuesForMarker('PAVP_RUNTIME_003_ADMISSION_AMENDMENT')
  const runtime003ImplementationValues = valuesForMarker(
    'PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION',
  )
  const runtime003VerificationValues = valuesForMarker('PAVP_RUNTIME_003_STATIC_VERIFICATION')
  const runtime003OwnerRuntimeAcceptanceValues = valuesForMarker(
    'PAVP_RUNTIME_003_OWNER_RUNTIME_ACCEPTANCE',
  )
  const runtime003OwnerVisualAcceptanceValues = valuesForMarker(
    'PAVP_RUNTIME_003_OWNER_VISUAL_ACCEPTANCE',
  )
  const runtime003OwnerAccessibilityAcceptanceValues = valuesForMarker(
    'PAVP_RUNTIME_003_OWNER_ACCESSIBILITY_ACCEPTANCE',
  )
  const runtime003OwnerAcceptanceStatementValues = valuesForMarker(
    'PAVP_RUNTIME_003_OWNER_ACCEPTANCE_STATEMENT',
  )
  const runtime003ImplementationCommitValues = valuesForMarker(
    'PAVP_RUNTIME_003_IMPLEMENTATION_COMMIT',
  )
  const runtime003PublicationTargetValues = valuesForMarker('PAVP_RUNTIME_003_PUBLICATION_TARGET')
  const runtime003PublicationStatusValues = valuesForMarker('PAVP_RUNTIME_003_PUBLICATION_STATUS')
  const runtime004StatusValues = valuesForMarker('PAVP_RUNTIME_004_STATUS')

  if (
    runtime003AdmissionValues.length === 0 ||
    runtime003AdmissionValues.some((value) => value !== 'FROZEN')
  ) {
    violations.push('PAVP_RUNTIME_003_ADMISSION_NOT_FROZEN')
  }
  if (
    runtime003StatusValues.length !== expectedRuntime003ActiveMirrorCount ||
    runtime003StatusValues.some((value) => value !== 'ACCEPTED')
  ) {
    violations.push('PAVP_RUNTIME_003_ACCEPTANCE_STATUS')
  }
  if (
    runtime004StatusValues.length !== runtime003StatusValues.length ||
    runtime004StatusValues.some((value) => value !== 'OPEN')
  ) {
    violations.push('OPEN_RUNTIME_DEFECT_STATUS_DRIFT')
  }
  if (
    runtime003ImplementationValues.length !== runtime003StatusValues.length ||
    runtime003ImplementationValues.some((value) => value !== 'COMPLETE')
  ) {
    violations.push('PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION_STATE')
  }
  if (
    runtime003VerificationValues.length !== runtime003StatusValues.length ||
    runtime003VerificationValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_RUNTIME_003_STATIC_VERIFICATION_STATE')
  }
  if (
    runtime003OwnerRuntimeAcceptanceValues.length !== runtime003StatusValues.length ||
    runtime003OwnerRuntimeAcceptanceValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_RUNTIME_003_OWNER_RUNTIME_ACCEPTANCE')
  }
  if (
    runtime003OwnerVisualAcceptanceValues.length !== runtime003StatusValues.length ||
    runtime003OwnerVisualAcceptanceValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_RUNTIME_003_OWNER_VISUAL_ACCEPTANCE')
  }
  if (
    runtime003OwnerAccessibilityAcceptanceValues.length !== runtime003StatusValues.length ||
    runtime003OwnerAccessibilityAcceptanceValues.some((value) => value !== 'PASS')
  ) {
    violations.push('PAVP_RUNTIME_003_OWNER_ACCESSIBILITY_ACCEPTANCE')
  }
  if (
    runtime003OwnerAcceptanceStatementValues.length !== runtime003StatusValues.length ||
    runtime003OwnerAcceptanceStatementValues.some(
      (value) => value !== runtime003AcceptanceStatement,
    ) ||
    runtime003ImplementationCommitValues.length !== runtime003StatusValues.length ||
    runtime003ImplementationCommitValues.some(
      (value) => value !== runtime003ImplementationCommit,
    ) ||
    runtime003PublicationTargetValues.length !== runtime003StatusValues.length ||
    runtime003PublicationTargetValues.some((value) => value !== 'origin/main') ||
    runtime003PublicationStatusValues.length !== runtime003StatusValues.length ||
    runtime003PublicationStatusValues.some((value) => value !== 'COMPLETE')
  ) {
    violations.push('PAVP_RUNTIME_003_ACCEPTANCE_MIRROR')
  }

  violations.push(...adminNavigationMotionVueSelectionLensAdmissionViolations(architectureSource))
  violations.push(...routeTransitionAdmissionViolations(architectureSource))

  return [...new Set(violations)]
}

function runAcceptanceClosureNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const probes: readonly [string, string, string][] = [
    [
      'dark-action-status-reopened',
      'DARK_ACTION_ACCEPTANCE_STATUS',
      architectureSource.replace(
        'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS=ACCEPTED',
        'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS=OPEN',
      ),
    ],
    [
      'dark-action-retained-as-current-work',
      'PAVP_RUNTIME_003_CURRENT_WORK',
      architectureSource.replace(
        `CURRENT_BOUNDED_WORK=${routeTransitionWorkPackage}`,
        `CURRENT_BOUNDED_WORK=${acceptedDarkActionWorkPackage}`,
      ),
    ],
    [
      'dark-action-owner-runtime-acceptance-removed',
      'DARK_ACTION_OWNER_RUNTIME_ACCEPTANCE',
      architectureSource.replace(
        'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_RUNTIME_ACCEPTANCE=PASS\n',
        '',
      ),
    ],
    [
      'dark-action-owner-visual-acceptance-removed',
      'DARK_ACTION_OWNER_VISUAL_ACCEPTANCE',
      architectureSource.replace(
        'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_VISUAL_ACCEPTANCE=PASS\n',
        '',
      ),
    ],
    [
      'admin-console-overall-acceptance-falsely-restored',
      'ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORED',
      architectureSource.replace(
        'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
        'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=PASS',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed: mutatedSource !== architectureSource && failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function runRuntime003AdmissionNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const probes: readonly [string, string, string][] = [
    [
      'runtime-003-historical-current-work-removed',
      'PAVP_RUNTIME_003_ADMISSION_HISTORY',
      architectureSource.replace(
        `HISTORICAL_PAVP_RUNTIME_003_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${runtime003WorkItem}`,
        'HISTORICAL_PAVP_RUNTIME_003_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=NONE',
      ),
    ],
    [
      'runtime-003-historical-current-work-id-replaced',
      'PAVP_RUNTIME_003_ADMISSION_HISTORY',
      architectureSource.replace(
        `HISTORICAL_PAVP_RUNTIME_003_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${runtime003WorkItem}`,
        'HISTORICAL_PAVP_RUNTIME_003_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=PAVP-RUNTIME-999',
      ),
    ],
    [
      'runtime-003-repository-implementation-falsely-complete',
      'PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION_STATE',
      architectureSource.replace(
        'PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION=COMPLETE',
        'PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION=NOT_STARTED',
      ),
    ],
    [
      'runtime-003-static-verification-falsely-passed',
      'PAVP_RUNTIME_003_STATIC_VERIFICATION_STATE',
      architectureSource.replace(
        'PAVP_RUNTIME_003_STATIC_VERIFICATION=PASS',
        'PAVP_RUNTIME_003_STATIC_VERIFICATION=NOT_RUN',
      ),
    ],
    [
      'runtime-003-overall-admin-console-acceptance-restored',
      'ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORED',
      architectureSource.replace(
        'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
        'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=PASS',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed: mutatedSource !== architectureSource && failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function runRuntime003AcceptanceClosureNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const probes: readonly [string, string, string][] = [
    [
      'runtime-003-status-reopened-after-acceptance',
      'PAVP_RUNTIME_003_ACCEPTANCE_STATUS',
      architectureSource.replace(
        'PAVP_RUNTIME_003_STATUS=ACCEPTED',
        'PAVP_RUNTIME_003_STATUS=OPEN',
      ),
    ],
    [
      'runtime-003-retained-as-current-work-after-acceptance',
      'PAVP_RUNTIME_003_CURRENT_WORK',
      architectureSource.replace(
        `CURRENT_BOUNDED_WORK=${routeTransitionWorkPackage}`,
        `CURRENT_BOUNDED_WORK=${runtime003WorkItem}`,
      ),
    ],
    [
      'runtime-003-owner-runtime-acceptance-removed',
      'PAVP_RUNTIME_003_OWNER_RUNTIME_ACCEPTANCE',
      architectureSource.replace('PAVP_RUNTIME_003_OWNER_RUNTIME_ACCEPTANCE=PASS\n', ''),
    ],
    [
      'runtime-003-owner-visual-acceptance-removed',
      'PAVP_RUNTIME_003_OWNER_VISUAL_ACCEPTANCE',
      architectureSource.replace('PAVP_RUNTIME_003_OWNER_VISUAL_ACCEPTANCE=PASS\n', ''),
    ],
    [
      'runtime-003-owner-accessibility-acceptance-removed',
      'PAVP_RUNTIME_003_OWNER_ACCESSIBILITY_ACCEPTANCE',
      architectureSource.replace('PAVP_RUNTIME_003_OWNER_ACCESSIBILITY_ACCEPTANCE=PASS\n', ''),
    ],
    [
      'runtime-003-overall-admin-console-acceptance-falsely-restored',
      'ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORED',
      architectureSource.replace(
        'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
        'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=PASS',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed: mutatedSource !== architectureSource && failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function runAdminNavigationGsapAdmissionNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = currentWorkStatusViolations(architectureSource)
  const probes: readonly [string, string, string][] = [
    [
      'admin-navigation-gsap-historical-current-work-left-as-previous-navigation',
      'PAVP_ADMIN_NAVIGATION_GSAP_ADMISSION_HISTORY',
      architectureSource.replace(
        `HISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationGsapAdmissionAmendment}\nHISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${adminNavigationGsapWorkPackage}`,
        `HISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${navigationReworkAdmissionAmendment}\nHISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${navigationReworkWorkPackage}`,
      ),
    ],
    [
      'admin-navigation-gsap-historical-current-work-id-unauthorized',
      'PAVP_ADMIN_NAVIGATION_GSAP_ADMISSION_HISTORY',
      architectureSource.replace(
        `HISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${adminNavigationGsapWorkPackage}`,
        'HISTORICAL_SECTION_1_2B_0I_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=PAVP-UNAUTHORIZED-WORK',
      ),
    ],
    [
      'admin-navigation-gsap-amendment-unfrozen',
      'PAVP_ADMIN_NAVIGATION_GSAP_ADMISSION_NOT_FROZEN',
      architectureSource.replace(
        `AMENDMENT=${adminNavigationGsapAdmissionAmendment}\nAMENDMENT_KIND=ARCHITECTURE_ONLY_BOUNDED_INSTANCE_GSAP_ADMISSION\nAMENDMENT_STATUS=FROZEN`,
        `AMENDMENT=${adminNavigationGsapAdmissionAmendment}\nAMENDMENT_KIND=ARCHITECTURE_ONLY_BOUNDED_INSTANCE_GSAP_ADMISSION\nAMENDMENT_STATUS=DRAFT`,
      ),
    ],
    [
      'admin-navigation-gsap-repository-regresses-to-not-started',
      'PAVP_ADMIN_NAVIGATION_GSAP_REPOSITORY_IMPLEMENTATION_STATE',
      architectureSource.replace(
        `${adminNavigationGsapWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
        `${adminNavigationGsapWorkPackage}_REPOSITORY_IMPLEMENTATION=NOT_STARTED`,
      ),
    ],
    [
      'admin-navigation-gsap-static-regresses-to-not-run',
      'PAVP_ADMIN_NAVIGATION_GSAP_STATIC_VERIFICATION_STATE',
      architectureSource.replace(
        `${adminNavigationGsapWorkPackage}_STATIC_VERIFICATION=PASS`,
        `${adminNavigationGsapWorkPackage}_STATIC_VERIFICATION=NOT_RUN`,
      ),
    ],
    [
      'admin-navigation-gsap-general-status-falsely-activated',
      'PAVP_ADMIN_NAVIGATION_GSAP_INSTANCE_SCOPE',
      architectureSource.replace('\nGSAP_STATUS=DEFERRED\n', '\nGSAP_STATUS=ACTIVE\n'),
    ],
    [
      'admin-navigation-gsap-coordinate-drift',
      'PAVP_ADMIN_NAVIGATION_GSAP_COORDINATE',
      architectureSource.replace(
        'GSAP_DEPENDENCY_COORDINATE=gsap@3.15.0',
        'GSAP_DEPENDENCY_COORDINATE=gsap@3.15.1',
      ),
    ],
    [
      'admin-navigation-gsap-adds-second-motion-root',
      'PAVP_ADMIN_NAVIGATION_GSAP_DYNAMIC_ROOT',
      architectureSource.replace(
        'EXACT_NON_ROUTE_DYNAMIC_MOTION_ROOT_COUNT=1',
        'EXACT_NON_ROUTE_DYNAMIC_MOTION_ROOT_COUNT=2',
      ),
    ],
    [
      'admin-navigation-gsap-raises-motion-budget',
      'PAVP_ADMIN_NAVIGATION_GSAP_BUDGET',
      architectureSource.replace(
        'MOTION_ADAPTER_JAVASCRIPT_GZIP_HARD_BUDGET_BYTES=40960',
        'MOTION_ADAPTER_JAVASCRIPT_GZIP_HARD_BUDGET_BYTES=40961',
      ),
    ],
    [
      'admin-navigation-gsap-allows-parallel-overlap',
      'PAVP_ADMIN_NAVIGATION_GSAP_OVERLAP',
      architectureSource.replace(
        'PARALLEL_NAVIGATION_IMPLEMENTATION=PROHIBITED',
        'PARALLEL_NAVIGATION_IMPLEMENTATION=ALLOWED',
      ),
    ],
    [
      'admin-navigation-gsap-allows-application-import',
      'PAVP_ADMIN_NAVIGATION_GSAP_PRIVATE_BOUNDARY',
      architectureSource.replace(
        'APPLICATION_DIRECT_GSAP_IMPORT=PROHIBITED',
        'APPLICATION_DIRECT_GSAP_IMPORT=ALLOWED',
      ),
    ],
    [
      'admin-navigation-gsap-regresses-previous-navigation-evidence',
      'PAVP_NAIVE_COLLAPSIBLE_MULTILEVEL_NAVIGATION_REWORK_HISTORY',
      architectureSource.replace(
        `${navigationReworkWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
        `${navigationReworkWorkPackage}_REPOSITORY_IMPLEMENTATION=NOT_STARTED`,
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          mutatedSource !== architectureSource &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function runAdminNavigationThemeReflowAdmissionNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = currentWorkStatusViolations(architectureSource)
  const probes: readonly [string, string, string][] = [
    [
      'admin-navigation-theme-reflow-historical-current-work-left-as-previous-gsap',
      'PAVP_ADMIN_NAVIGATION_THEME_REFLOW_ADMISSION_HISTORY',
      architectureSource.replace(
        `HISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationThemeReflowAdmissionAmendment}\nHISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${adminNavigationThemeReflowWorkPackage}`,
        `HISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_AUTHORITY_LITERAL=CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationGsapAdmissionAmendment}\nHISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${adminNavigationGsapWorkPackage}`,
      ),
    ],
    [
      'admin-navigation-theme-reflow-historical-current-work-id-unauthorized',
      'PAVP_ADMIN_NAVIGATION_THEME_REFLOW_ADMISSION_HISTORY',
      architectureSource.replace(
        `HISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=${adminNavigationThemeReflowWorkPackage}`,
        'HISTORICAL_SECTION_1_2B_0J_ADMISSION_TIME_CURRENT_BOUNDED_WORK_LITERAL=CURRENT_BOUNDED_WORK=PAVP-UNAUTHORIZED-WORK',
      ),
    ],
    [
      'admin-navigation-theme-reflow-amendment-unfrozen',
      'PAVP_ADMIN_NAVIGATION_THEME_REFLOW_ADMISSION_NOT_FROZEN',
      architectureSource.replace(
        `AMENDMENT=${adminNavigationThemeReflowAdmissionAmendment}\nAMENDMENT_KIND=ARCHITECTURE_ONLY_SERIAL_OWNER_DIRECTED_NAVIGATION_VISUAL_AND_REFLOW_CORRECTION_ADMISSION\nAMENDMENT_STATUS=FROZEN`,
        `AMENDMENT=${adminNavigationThemeReflowAdmissionAmendment}\nAMENDMENT_KIND=ARCHITECTURE_ONLY_SERIAL_OWNER_DIRECTED_NAVIGATION_VISUAL_AND_REFLOW_CORRECTION_ADMISSION\nAMENDMENT_STATUS=DRAFT`,
      ),
    ],
    [
      'admin-navigation-theme-reflow-repository-rolled-back-to-not-started',
      'PAVP_ADMIN_NAVIGATION_THEME_REFLOW_REPOSITORY_IMPLEMENTATION_STATE',
      architectureSource.replace(
        `${adminNavigationThemeReflowWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
        `${adminNavigationThemeReflowWorkPackage}_REPOSITORY_IMPLEMENTATION=NOT_STARTED`,
      ),
    ],
    [
      'admin-navigation-theme-reflow-static-rolled-back-to-not-run',
      'PAVP_ADMIN_NAVIGATION_THEME_REFLOW_STATIC_VERIFICATION_STATE',
      architectureSource.replace(
        `${adminNavigationThemeReflowWorkPackage}_STATIC_VERIFICATION=PASS`,
        `${adminNavigationThemeReflowWorkPackage}_STATIC_VERIFICATION=NOT_RUN`,
      ),
    ],
    [
      'admin-navigation-theme-reflow-changes-existing-hover',
      'PAVP_ADMIN_NAVIGATION_THEME_TINTED_SELECTION',
      architectureSource.replace(
        'NAVIGATION_HOVER_CHANGE=NONE',
        'NAVIGATION_HOVER_CHANGE=REPLACED',
      ),
    ],
    [
      'admin-navigation-theme-reflow-selected-tint-formula-drift',
      'PAVP_ADMIN_NAVIGATION_THEME_TINTED_SELECTION',
      architectureSource.replace(
        'LEVEL_2_ACTIVE_SURFACE_COLOR_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 12%,var(--ui-material-overlay-background))',
        'LEVEL_2_ACTIVE_SURFACE_COLOR_FORMULA=var(--ui-material-overlay-background)',
      ),
    ],
    [
      'admin-navigation-theme-reflow-restores-hard-route-dot',
      'PAVP_ADMIN_NAVIGATION_THEME_TINTED_SELECTION',
      architectureSource.replace(
        'LEVEL_2_HARD_ROUTE_DOT=PROHIBITED',
        'LEVEL_2_HARD_ROUTE_DOT=ALLOWED',
      ),
    ],
    [
      'admin-navigation-theme-reflow-restores-per-frame-sider-width-tween',
      'PAVP_ADMIN_NAVIGATION_ATOMIC_COLLAPSE',
      architectureSource.replace(
        'WIDE_COLLAPSE_PER_FRAME_SIDER_WIDTH_TWEEN=PROHIBITED',
        'WIDE_COLLAPSE_PER_FRAME_SIDER_WIDTH_TWEEN=ALLOWED',
      ),
    ],
    [
      'admin-navigation-theme-reflow-restores-submenu-forced-layout-transition',
      'PAVP_ADMIN_NAVIGATION_ATOMIC_COLLAPSE',
      architectureSource.replace(
        'NAIVE_MENU_SUBMENU_FORCED_LAYOUT_TRANSITION_DURING_NAMED_SWITCH=PROHIBITED',
        'NAIVE_MENU_SUBMENU_FORCED_LAYOUT_TRANSITION_DURING_NAMED_SWITCH=ALLOWED',
      ),
    ],
    [
      'admin-navigation-theme-reflow-allows-bottom-dock-handoff-geometry-change',
      'PAVP_ADMIN_NAVIGATION_BOTTOM_DOCK_HANDOFF',
      architectureSource.replace(
        'BOTTOM_DOCK_CSS_GSAP_HANDOFF_GEOMETRY_CHANGE=PROHIBITED',
        'BOTTOM_DOCK_CSS_GSAP_HANDOFF_GEOMETRY_CHANGE=ALLOWED',
      ),
    ],
    [
      'admin-navigation-theme-reflow-wide-appearance-five-columns',
      'PAVP_APPEARANCE_WIDE_GRID_STABILITY',
      architectureSource.replace(
        'APPEARANCE_THEME_GALLERY_WIDE_COLUMN_COUNT=4',
        'APPEARANCE_THEME_GALLERY_WIDE_COLUMN_COUNT=5',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          mutatedSource !== architectureSource &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function runAdminNavigationHighlightRevealAdmissionNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = currentWorkStatusViolations(architectureSource)
  const probes: readonly [string, string, string][] = [
    [
      'admin-navigation-highlight-reveal-amendment-unfrozen',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_ADMISSION_NOT_FROZEN',
      architectureSource.replace(
        `AMENDMENT=${adminNavigationHighlightRevealAdmissionAmendment}\nAMENDMENT_KIND=ARCHITECTURE_ONLY_SERIAL_OWNER_DIRECTED_NAVIGATION_INTERACTION_VISIBILITY_AND_REVEAL_ADMISSION\nAMENDMENT_STATUS=FROZEN`,
        `AMENDMENT=${adminNavigationHighlightRevealAdmissionAmendment}\nAMENDMENT_KIND=ARCHITECTURE_ONLY_SERIAL_OWNER_DIRECTED_NAVIGATION_INTERACTION_VISIBILITY_AND_REVEAL_ADMISSION\nAMENDMENT_STATUS=DRAFT`,
      ),
    ],
    [
      'admin-navigation-highlight-reveal-premature-repository-implementation',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_REPOSITORY_IMPLEMENTATION_STATE',
      architectureSource.replace(
        `${adminNavigationHighlightRevealWorkPackage}_REPOSITORY_IMPLEMENTATION=NOT_STARTED`,
        `${adminNavigationHighlightRevealWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
      ),
    ],
    [
      'admin-navigation-highlight-reveal-premature-static-verification',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_STATIC_VERIFICATION_STATE',
      architectureSource.replace(
        `${adminNavigationHighlightRevealWorkPackage}_STATIC_VERIFICATION=NOT_RUN`,
        `${adminNavigationHighlightRevealWorkPackage}_STATIC_VERIFICATION=PASS`,
      ),
    ],
    [
      'admin-navigation-highlight-reveal-hover-and-selected-formula-drift',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_VISUAL_CONTRACT',
      architectureSource
        .replace(
          'NAVIGATION_NON_SELECTED_HOVER_SURFACE_COLOR_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 6%,var(--ui-material-chrome-background))',
          'NAVIGATION_NON_SELECTED_HOVER_SURFACE_COLOR_FORMULA=var(--ui-material-chrome-background)',
        )
        .replace(
          'LEVEL_2_ACTIVE_SURFACE_COLOR_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 16%,var(--ui-material-overlay-background))',
          'LEVEL_2_ACTIVE_SURFACE_COLOR_FORMULA=var(--ui-material-overlay-background)',
        ),
    ],
    [
      'admin-navigation-highlight-reveal-restores-trailing-aura',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_VISUAL_CONTRACT',
      architectureSource.replace(
        'SELECTED_REVEAL_DECORATION=ONE_PAVP_OWNED_INSET_FLAT_THEME_TINT_REVEAL_PLANE',
        'SELECTED_REVEAL_DECORATION=ONE_TRAILING_SOFT_CONTROL_PRIMARY_AURA',
      ),
    ],
    [
      'admin-navigation-highlight-reveal-allows-solid-display-none',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_MATERIAL_CONTRACT',
      architectureSource.replace(
        'SOLID_MATERIAL_SELECTED_REVEAL_DISPLAY_NONE=PROHIBITED',
        'SOLID_MATERIAL_SELECTED_REVEAL_DISPLAY_NONE=ALLOWED',
      ),
    ],
    [
      'admin-navigation-highlight-reveal-drifts-full-reduced-none-property-allowlists',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_MOTION_CONTRACT',
      architectureSource
        .replace(
          'GSAP_ROUTE_FULL_PROPERTY_ALLOWLIST=opacity;visibility;decoration-scale',
          'GSAP_ROUTE_FULL_PROPERTY_ALLOWLIST=opacity;visibility;background-color;decoration-scale',
        )
        .replace(
          'GSAP_ROUTE_REDUCED_PROPERTY_ALLOWLIST=opacity;visibility',
          'GSAP_ROUTE_REDUCED_PROPERTY_ALLOWLIST=opacity;visibility;decoration-scale',
        )
        .replace(
          'GSAP_ROUTE_NONE_PROPERTY_ALLOWLIST=NONE',
          'GSAP_ROUTE_NONE_PROPERTY_ALLOWLIST=opacity',
        ),
    ],
    [
      'admin-navigation-highlight-reveal-expands-gsap-property-ownership',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_GSAP_BOUNDARY',
      architectureSource
        .replace(
          'GSAP_BACKGROUND_COLOR_OWNERSHIP=PROHIBITED',
          'GSAP_BACKGROUND_COLOR_OWNERSHIP=ALLOWED',
        )
        .replace('GSAP_FILTER_OWNERSHIP=PROHIBITED', 'GSAP_FILTER_OWNERSHIP=ALLOWED')
        .replace('GSAP_LAYOUT_PROPERTY_OWNERSHIP=NONE', 'GSAP_LAYOUT_PROPERTY_OWNERSHIP=width'),
    ],
    [
      'admin-navigation-highlight-reveal-removes-empty-target-and-lazy-stability',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_LIFECYCLE',
      architectureSource
        .replace(
          'EMPTY_ROUTE_REVEAL_TARGET_POLICY=NO_CONTEXT_NO_MARKER_NO_TIMELINE_STABLE_CSS_FINAL_STATE',
          'EMPTY_ROUTE_REVEAL_TARGET_POLICY=CREATE_CONTEXT_AND_MARKER',
        )
        .replace(
          'LAZY_CONTROLLER_NOT_READY_ROUTE_POLICY=STABLE_CSS_FINAL_STATE_WITHOUT_DEFERRED_REPLAY_OR_REWIND',
          'LAZY_CONTROLLER_NOT_READY_ROUTE_POLICY=DEFERRED_REPLAY_FROM_INITIAL_STATE',
        ),
    ],
    [
      'admin-navigation-highlight-reveal-expands-architecture-only-paths',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_ARCHITECTURE_ONLY_SCOPE',
      architectureSource.replace(
        '```text\nARCHITECTURE.md\nscripts/architecture/check-architecture-admin-console.ts\n```\n\n本 Architecture-only Stage 必须原子同步修改 `ARCHITECTURE.md` 与 `scripts/architecture/check-architecture-admin-console.ts`；二者之外的 UI、Application、Design Token、Generated Output、Dependency、Lockfile、Project Configuration、Bundle、Runtime、Workflow、Test、Browser、Screenshot、Trace 与 Evidence Artifact 修改全部禁止。',
        '```text\nARCHITECTURE.md\nscripts/architecture/check-architecture-admin-console.ts\npackages/ui/src/components/UiAdminShell.vue\n```\n\n本 Architecture-only Stage 必须原子同步修改 `ARCHITECTURE.md` 与 `scripts/architecture/check-architecture-admin-console.ts`；二者之外的 UI、Application、Design Token、Generated Output、Dependency、Lockfile、Project Configuration、Bundle、Runtime、Workflow、Test、Browser、Screenshot、Trace 与 Evidence Artifact 修改全部禁止。',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          mutatedSource !== architectureSource &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function adminNavigationMotionVueSelectionLensAdmissionViolations(
  architectureSource: string,
): string[] {
  const violations: string[] = []
  const amendmentHeading = `### 1.2B.0M \`${adminNavigationMotionVueSelectionLensWorkPackage}\``
  const amendmentStart = architectureSource.indexOf(amendmentHeading)
  const amendmentEnd =
    amendmentStart === -1
      ? -1
      : architectureSource.indexOf('\n### ', amendmentStart + amendmentHeading.length)
  const amendmentSource =
    amendmentStart === -1
      ? ''
      : architectureSource.slice(
          amendmentStart,
          amendmentEnd === -1 ? architectureSource.length : amendmentEnd,
        )
  const hasEveryMarker = (markers: readonly string[]): boolean =>
    amendmentSource.length > 0 && markers.every((marker) => amendmentSource.includes(marker))

  const admissionMarkers = [
    `AMENDMENT=${adminNavigationMotionVueSelectionLensAdmissionAmendment}`,
    'AMENDMENT_STATUS=FROZEN',
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    `WORK_PACKAGE=${adminNavigationMotionVueSelectionLensWorkPackage}`,
  ] as const
  if (!hasEveryMarker(admissionMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_ADMISSION_NOT_FROZEN')
  }

  const implementationStateMarkers = [
    'STATUS=ACCEPTED',
    'REPOSITORY_IMPLEMENTATION=COMPLETE',
    'STATIC_VERIFICATION=PASS',
    'OWNER_RUNTIME_ACCEPTANCE=PASS',
    'OWNER_VISUAL_ACCEPTANCE=PASS',
    'OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED',
    `OWNER_ACCEPTANCE_STATEMENT=${adminNavigationMotionVueSelectionLensAcceptanceStatement}`,
    `IMPLEMENTATION_COMMIT=${adminNavigationMotionVueSelectionLensImplementationCommit}`,
    'PUBLICATION_TARGET=origin/main',
    'PUBLICATION_STATUS=COMPLETE',
    'RELEASE_STATUS=NOT_RELEASED',
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
  ] as const
  if (!hasEveryMarker(implementationStateMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_STATE_BOUNDARY')
  }

  const predecessorMarkers = [
    `PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_INSTANCE=${adminNavigationNativeWorkPackage}`,
    'PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_STATUS=ACCEPTED',
    'PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_STATIC_VERIFICATION=PASS',
    `PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_IMPLEMENTATION_COMMIT=${adminNavigationNativeImplementationCommit}`,
  ] as const
  if (!hasEveryMarker(predecessorMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_PREDECESSOR_DRIFT')
  }

  const scopedCapabilityMarkers = [
    'MOTION_FOR_VUE_GENERAL_CAPABILITY_STATUS=DEFERRED',
    'RUNTIME_MOTION_GENERAL_CAPABILITY_STATUS=TARGET_INACTIVE',
    `MOTION_FOR_VUE_SCOPED_ADMISSION=${adminNavigationMotionVueSelectionLensWorkPackage}_ONLY`,
    'MOTION_FOR_VUE_SCOPED_RUNTIME_STATUS=INSTALLED',
    'MOTION_FOR_VUE_PUBLIC_PLATFORM_API=PROHIBITED',
    'MOTION_FOR_VUE_OTHER_CONSUMERS=PROHIBITED',
    'MOTION_FOR_VUE_ROUTE_CONTENT_ANIMATION=PROHIBITED',
  ] as const
  if (!hasEveryMarker(scopedCapabilityMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_SCOPE_BOUNDARY')
  }

  const motionVueDependencyMarkers = [
    'MOTION_VUE_COORDINATE=motion-v@2.4.0',
    'MOTION_VUE_LICENSE=MIT',
    'MOTION_VUE_DEPENDENCY_OWNER=@platform/ui',
    'MOTION_VUE_ONLY_ADMITTED_ANIMATION_RUNTIME=motion-v',
    'VUEUSE_CORE_ADMISSION_PURPOSE=motion-v_REQUIRED_PEER_ONLY',
    'PATCH_TARGET_PACKAGE=motion-v',
    'PATCH_TARGET_VERSION=2.4.0',
    'PATCH_FILE=patches/motion-v@2.4.0.patch',
    'PATCH_KIND=DECLARATION_ONLY',
    'PATCH_RUNTIME_CHANGE=PROHIBITED',
    'PATCH_JAVASCRIPT_CHANGE=PROHIBITED',
    'PATCH_PACKAGE_METADATA_CHANGE=PROHIBITED',
    'PATCH_SECOND_PACKAGE=PROHIBITED',
    'TYPESCRIPT_STRICTNESS_CHANGE=PROHIBITED',
    'REACT_TYPE_DEPENDENCY=PROHIBITED',
    'PATCH_RUNTIME_HASH_EQUALITY=REQUIRED',
    'PATCH_SHA256=fe15a8c9fbe1795b63b62db2b0a262c44c45fe58fc75b14cd89c51ead0e19d59',
    'PATCH_CHANGED_DECLARATION_FILE_COUNT=19',
    'PATCH_CHANGED_DECLARATION_HUNK_COUNT=20',
    'PATCH_RUNTIME_JAVASCRIPT_FILE_COUNT=91',
    'PATCH_RUNTIME_HASH_MANIFEST_SHA256=58f8bbff2272c77b361cbc3eb438f7e3b32d4b42eb83b1599760bb76db502adb',
    'PATCH_EXACT_MOTION_PATCH_COUNT=1',
    'PATCH_CANONICAL_TOTAL_SET=motion-v@2.4.0;unconfig@7.5.0;vue-router@5.2.0',
    'PATCH_DIRECT_REACT_OR_BROWSER_GLOBAL_COMPATIBILITY_DEPENDENCY=PROHIBITED',
    'PATCH_TYPESCRIPT_STRICT=true',
    'PATCH_TYPESCRIPT_EXACT_OPTIONAL_PROPERTY_TYPES=true',
    'PATCH_TYPESCRIPT_SKIP_LIB_CHECK=false',
  ] as const
  if (!hasEveryMarker(motionVueDependencyMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_MOTION_VUE_COORDINATE')
  }
  if (!hasEveryMarker(['MOTION_VUE_REQUIRED_PEER_COORDINATE=@vueuse/core@14.4.0'])) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_VUEUSE_PEER_COORDINATE')
  }

  const privateBoundaryMarkers = [
    'packages/ui/src/adapters/motion/admin-navigation-motion-runtime.ts',
    'packages/ui/src/adapters/motion/admin-navigation-dom-max.ts',
    'packages/ui/src/adapters/motion/AdminNavigationSelectionLens.vue',
    'packages/ui/src/adapters/motion/**',
    'MOTION_VUE_LAZY_COMPONENT=m',
    'MOTION_VUE_FULL_COMPONENT_IMPORT=PROHIBITED',
    'MOTION_VUE_LAZY_MOTION_STRICT=REQUIRED',
    'MOTION_VUE_FEATURE_PACKAGE=domMax',
    'MOTION_VUE_FEATURE_LOADING=ASYNC_AFTER_INITIAL_STABLE_MOUNT',
    'MOTION_VUE_MISSED_INTERACTION_REPLAY=PROHIBITED',
  ] as const
  if (!hasEveryMarker(privateBoundaryMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_PRIVATE_BOUNDARY')
  }

  const featureRootMarkers = [
    'MOTION_FEATURE_ROOT_ID=admin-navigation-motion-dom-max',
    'MOTION_FEATURE_SOURCE_PATH=packages/ui/src/adapters/motion/admin-navigation-dom-max.ts',
    'MOTION_FEATURE_MANIFEST_KEY=../../packages/ui/src/adapters/motion/admin-navigation-dom-max.ts',
    'MOTION_FEATURE_MANIFEST_KEY_DERIVATION=normalized POSIX relative path from apps/web to MOTION_FEATURE_SOURCE_PATH',
    'MOTION_FEATURE_DYNAMIC_ROOT_COUNT=1',
    'FINAL_DYNAMIC_ROOT_COUNT=18',
    'FINAL_ROUTE_DYNAMIC_ROOT_COUNT=17',
    'FINAL_NON_ROUTE_DYNAMIC_ROOT_COUNT=1',
    'DYNAMIC_ROOT_COLLECTION=UNION_OF_DYNAMIC_IMPORTS_FROM_EVERY_INITIAL_STATIC_CLOSURE_CHUNK',
    'DYNAMIC_IMPORT_OWNER=INITIAL_STATIC_CLOSURE_ONLY',
    'DYNAMIC_ENTRY_SET=EXACT_17_ROUTE_ROOTS_PLUS_1_MOTION_FEATURE_ROOT',
    'MOTION_FEATURE_DYNAMIC_CHILD_ROOT_COUNT=0',
    'DYNAMIC_ROOT_IN_INITIAL_STATIC_CLOSURE=PROHIBITED',
  ] as const
  if (!hasEveryMarker(featureRootMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_FEATURE_ROOT_IDENTITY')
  }

  const featureBudgetIdentityMarkers = [
    'MOTION_FEATURE_PROJECT_CONFIG_BUDGET_PROPERTY=projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes',
    'MOTION_FEATURE_ENGINEERING_MANIFEST_RECORD_ID=admin-navigation-motion-feature-javascript-gzip',
    'MOTION_FEATURE_ENGINEERING_MANIFEST_UNIT=bytes-gzip',
  ] as const
  if (!hasEveryMarker(featureBudgetIdentityMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_FEATURE_BUDGET_IDENTITY')
  }

  const featureClosureMarkers = [
    'MOTION_FEATURE_STATIC_CLOSURE=collectStaticChunkClosure(manifest, MOTION_FEATURE_MANIFEST_KEY)',
    'MOTION_FEATURE_EXCLUSIVE_CLOSURE_FORMULA=MOTION_FEATURE_STATIC_CLOSURE minus INITIAL_STATIC_CLOSURE',
    'MOTION_FEATURE_EXCLUSIVE_CLOSURE_MEASUREMENT=DISTINCT_JAVASCRIPT_PRODUCTION_GZIP_SUM',
    'MOTION_FEATURE_EXCLUSIVE_CLOSURE_NON_EMPTY=REQUIRED',
    'MOTION_FEATURE_CSS_OUTPUT=PROHIBITED',
    'MOTION_FEATURE_ROUTE_STATIC_CLOSURE_OVERLAP=PROHIBITED',
    'MOTION_FEATURE_INITIAL_STATIC_CLOSURE_OVERLAP=PROHIBITED',
    'MOTION_FEATURE_ROUTE_CHUNK_BUDGET_INCLUSION=PROHIBITED',
    'MOTION_FEATURE_SHARED_INITIAL_CHUNK_BUDGET_INCLUSION=PROHIBITED',
    'MOTION_FEATURE_WARNING_ONLY_FALLBACK=PROHIBITED',
  ] as const
  if (!hasEveryMarker(featureClosureMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_FEATURE_CLOSURE_MEASUREMENT')
  }

  const budgetFormulaMarkers = [
    'MOTION_FEATURE_BUDGET_FORMULA=ceil((MEASURED_MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES + 8192) / 8192) * 8192',
    'MOTION_FEATURE_BUDGET_HEADROOM >= 8192',
    'MOTION_FEATURE_BUDGET_HEADROOM < 16384',
    'MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES=33648',
    'MOTION_FEATURE_HARD_BUDGET_BYTES=49152',
    'MOTION_FEATURE_HEADROOM_BYTES=15504',
    'FINAL_INITIAL_JAVASCRIPT_GZIP_BYTES=223308',
    'FINAL_INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=237568',
    'FINAL_INITIAL_JAVASCRIPT_HEADROOM_BYTES=14260',
    'INITIAL_JAVASCRIPT_CURRENT_HARD_BUDGET_BYTES=237568',
    'INITIAL_JAVASCRIPT_RETAIN_CONDITION=229376 - measuredInitialJavaScript >= 8192',
    'INITIAL_JAVASCRIPT_REBASE_FORMULA=ceil((measuredInitialJavaScript + 8192) / 8192) * 8192',
    'INITIAL_JAVASCRIPT_REBASE_MINIMUM_HEADROOM_BYTES=8192',
    'INITIAL_JAVASCRIPT_REBASE_MAXIMUM_HEADROOM_EXCLUSIVE_BYTES=16384',
    'INITIAL_JAVASCRIPT_PRESELECTED_INCREASE=PROHIBITED',
  ] as const
  if (!hasEveryMarker(budgetFormulaMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_BUDGET_ROUNDING')
  }

  const selectionLensMarkers = [
    'MOTION_SELECTION_LENS_LAYOUT_ID=pavp-admin-navigation-selection-lens',
    'MOTION_SELECTION_LENS_ACTIVE_COUNT=1',
    'MOTION_SELECTION_LENS_EXPANDED_OWNER=SELECTED_LEVEL_2_ROUTE',
    'MOTION_SELECTION_LENS_COLLAPSED_OWNER=ACTIVE_ROUTE_ROOT_SUBMENU',
    'MOTION_SELECTION_LENS_POPUP_OWNER=NONE',
    'MOTION_SELECTION_LENS_NARROW_DRAWER_CONSUMER=NONE',
    'MOTION_SELECTION_LENS_HOVER_OWNER=NAIVE',
    'MOTION_SELECTION_LENS_HOVER_FORMULA=6_PERCENT_THEME_TINT',
    'MOTION_SELECTION_LENS_SELECTED_FORMULA=16_PERCENT_THEME_TINT',
    'MOTION_SELECTION_LENS_FULL_READY_SELECTED_SURFACE_OWNER=ONE_MOTION_LENS_ONLY',
    'MOTION_SELECTION_LENS_FULL_NOT_READY_SELECTED_SURFACE_OWNER=NAIVE_SELECTED_BACKGROUND',
    'MOTION_SELECTION_LENS_REDUCED_SELECTED_SURFACE_OWNER=NAIVE_PERSISTENT_BEFORE_SURFACES',
    'MOTION_SELECTION_LENS_NONE_SELECTED_SURFACE_OWNER=NAIVE_PERSISTENT_BEFORE_SURFACES',
    'MOTION_SELECTION_LENS_FALLBACK_STACKING=PROHIBITED',
    'MOTION_SELECTION_LENS_AFTER_BLOOM=PROHIBITED',
    'MOTION_SELECTION_LENS_AURA_LEFT_BAR_HARD_DOT_BADGE_SECOND_SHADOW=PROHIBITED',
    'MOTION_SELECTION_LENS_TEXT_OR_ICON_POSITION_MOTION=PROHIBITED',
    'MOTION_SELECTION_LENS_PUBLIC_RENDER_BOUNDARIES=renderLabel;renderIcon;nodeProps_WHEN_REQUIRED',
  ] as const
  if (!hasEveryMarker(selectionLensMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_VISUAL_OWNERSHIP')
  }

  const readinessMarkers = [
    'MOTION_FEATURE_NOT_READY_SELECTED_OWNER=NAIVE_16_PERCENT_STATIC_FALLBACK',
    'MOTION_FEATURE_NOT_READY_NAVIGATION=FULLY_USABLE_WITH_IMMEDIATE_ROUTE_CHANGES',
    'MOTION_FEATURE_NOT_READY_INTERACTION_QUEUE=PROHIBITED',
    'MOTION_FEATURE_READY_MOUNT_OWNER=CURRENT_ACTIVE_PROJECTED_OWNER',
    'MOTION_FEATURE_READY_INITIAL_ENTRY=PROHIBITED_BY_initial_false_OR_DOCUMENTED_EQUIVALENT',
    'MOTION_FEATURE_READY_FALLBACK_CUTOVER=SAME_VUE_COMMIT',
    'MOTION_FEATURE_READY_OLD_ROUTE_ANIMATION=PROHIBITED',
    'MOTION_FEATURE_READY_MISSED_INTERACTION_REPLAY=PROHIBITED',
    'MOTION_FEATURE_READY_SELECTED_FLASH_DUPLICATION_OR_GAP=PROHIBITED',
  ] as const
  if (!hasEveryMarker(readinessMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_READINESS')
  }

  const motionMappingMarkers = [
    'MOTION_FULL_REDUCED_MOTION=never',
    'MOTION_FULL_TRANSITION=spring_visualDuration_0.26_bounce_0.16_no_delay',
    'MOTION_FULL_RAPID_SELECTION=INTERRUPTIBLE_FROM_RENDERED_STATE',
    'MOTION_REDUCED_REDUCED_MOTION=always',
    'MOTION_REDUCED_MOTION_LENS=NONE',
    'MOTION_REDUCED_SELECTED_CHANGE=CONCURRENT_OLD_SURFACE_FADE_OUT_AND_NEW_SURFACE_FADE_IN',
    'MOTION_REDUCED_SURFACE_SET=.n-menu-item-content::before;.n-dropdown-option-body::before',
    'MOTION_REDUCED_TRANSITION_PROPERTY=background-color;opacity',
    'MOTION_REDUCED_TRANSITION_DURATION=var(--ui-motion-duration)',
    'MOTION_REDUCED_TRANSITION_EASING=var(--ui-motion-easing)',
    'MOTION_REDUCED_LAYOUT_TRANSFORM_SPRING_SCALE_TRANSLATION=PROHIBITED',
    'MOTION_REDUCED_OWNER_REVISION_REMOUNT=PROHIBITED',
    'MOTION_REDUCED_ANIMATE_PRESENCE=PROHIBITED',
    'MOTION_NONE_SELECTED_CHANGE=IMMEDIATE_WITHOUT_LAYOUT_OPACITY_OR_ICON_ANIMATION',
    'MOTION_NONE_ICON_RESPONSE=NONE',
    'MOTION_NONE_STALE_TRANSFORM_OR_OPACITY=PROHIBITED',
    'MOTION_MODE_SWITCH_NAVIGATION_REPLAY=PROHIBITED',
    'MOTION_MODE_SWITCH_SELECTED_OWNER_GAP_OR_FLASH=PROHIBITED',
    'MOTION_NON_ROUTE_INPUT_SELECTED_TRANSITION_REPLAY=PROHIBITED',
    'PAVP_APPEARANCE_MOTION_AUTHORITY=SOLE',
    'DEVICE_MEDIA_QUERY_PRODUCT_AUTHORITY=PROHIBITED',
    'SECOND_MOTION_PREFERENCE_OR_RESOLVER=PROHIBITED',
  ] as const
  if (!hasEveryMarker(motionMappingMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_MOTION_MAPPING')
  }

  const routePreservationMarkers = [
    'PAVP_RUNTIME_005_CHANGE=NONE',
    'ROUTE_CONTENT_ANIMATION=PROHIBITED',
    'ROUTER_VIEW_COUNT=1',
    'ROUTE_CONTENT_HOST=STABLE_UNKEYED',
    'ROUTE_DERIVED_KEY=PROHIBITED',
    'ROUTE_LEVEL_TRANSITION=PROHIBITED',
    'ROUTE_OPACITY_ENTRY=PROHIBITED',
    'MAIN_TRANSFORM=PROHIBITED',
    'ROUTER_FOCUS_OR_SCROLL_CHANGE=NONE',
  ] as const
  if (!hasEveryMarker(routePreservationMarkers)) {
    violations.push('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_ROUTE_PRESERVATION')
  }

  return [...new Set(violations)]
}

const routeTransitionImplementationPaths = Object.freeze([
  'ARCHITECTURE.md',
  'apps/web/src/app/console/ConsoleRouteFrame.vue',
  'apps/web/src/app/router/route-registry.ts',
  'apps/web/src/app/router/router-lifecycle.ts',
  'apps/web/src/app/router/route-transition/route-transition-types.ts',
  'apps/web/src/app/router/route-transition/route-transition-preset-registry.ts',
  'apps/web/src/app/router/route-transition/route-transition-rule-registry.ts',
  'apps/web/src/app/router/route-transition/route-transition-boundary-registry.ts',
  'apps/web/src/app/router/route-transition/resolve-route-transition.ts',
  'apps/web/src/app/router/route-transition/route-transition-coordinator.ts',
  'apps/web/src/app/router/route-transition/route-transition.css',
  'apps/web/src/app/styles/layers.css',
  'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
  'scripts/architecture/check-router.ts',
  'scripts/architecture/check-architecture-admin-console.ts',
  'scripts/architecture/check-boundaries.ts',
  'stylelint.config.mjs',
])

function routeTransitionInventoryViolations(source: string): string[] {
  const failures: string[] = []
  const inventories = [
    ...source.matchAll(/^ROUTE_TRANSITION_IMPLEMENTATION_CHANGED_FILES=(.*)$/gmu),
  ]
  const counts = [
    ...source.matchAll(/^ROUTE_TRANSITION_IMPLEMENTATION_CHANGED_FILE_COUNT=(.*)$/gmu),
  ]
  if (
    inventories.length !== 1 ||
    !isDeepStrictEqual(inventories[0]?.[1]?.split(';'), routeTransitionImplementationPaths) ||
    counts.length !== 1 ||
    counts[0]?.[1] !== String(routeTransitionImplementationPaths.length)
  ) {
    failures.push('PAVP_ROUTE_TRANSITION_EXACT_IMPLEMENTATION_INVENTORY')
  }
  if (
    !source.includes(
      'ROUTE_TRANSITION_UI_IMPLEMENTATION_EXCEPTION=packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    ) ||
    !source.includes(
      'ROUTE_TRANSITION_UI_IMPLEMENTATION_EXCEPTION_SCOPE=PERMANENT_NAIVE_SIDER_DIVIDER_WIDTH_TO_--ui-admin-border-width_ONLY',
    ) ||
    !source.includes('ROUTE_TRANSITION_OTHER_UI_IMPLEMENTATION=UNCHANGED') ||
    !source.includes(
      '除 `packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue` 外的 `packages/ui/**`、Motion Vue Adapters、Runtime Kernel',
    )
  ) {
    failures.push('PAVP_ROUTE_TRANSITION_PROVIDER_SCOPE')
  }
  return failures
}

function validateRouteTransitionInventoryGovernance(source: string): string[] {
  const failures = routeTransitionInventoryViolations(source)
  const inventory =
    'ROUTE_TRANSITION_IMPLEMENTATION_CHANGED_FILES=' + routeTransitionImplementationPaths.join(';')
  const provider = 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue'
  const probes: readonly [string, string][] = [
    [
      source.replace(
        'ROUTE_TRANSITION_IMPLEMENTATION_CHANGED_FILE_COUNT=17',
        'ROUTE_TRANSITION_IMPLEMENTATION_CHANGED_FILE_COUNT=16',
      ),
      'PAVP_ROUTE_TRANSITION_EXACT_IMPLEMENTATION_INVENTORY',
    ],
    [
      source.replace(inventory, inventory.replace(';' + provider, '')),
      'PAVP_ROUTE_TRANSITION_EXACT_IMPLEMENTATION_INVENTORY',
    ],
    [
      source.replace(inventory, inventory + ';apps/web/src/App.vue'),
      'PAVP_ROUTE_TRANSITION_EXACT_IMPLEMENTATION_INVENTORY',
    ],
    [
      source.replace(inventory, inventory + ';' + provider),
      'PAVP_ROUTE_TRANSITION_EXACT_IMPLEMENTATION_INVENTORY',
    ],
    [
      source.replace(
        'PERMANENT_NAIVE_SIDER_DIVIDER_WIDTH_TO_--ui-admin-border-width_ONLY',
        'GENERAL_UI_OWNERSHIP',
      ),
      'PAVP_ROUTE_TRANSITION_PROVIDER_SCOPE',
    ],
    [
      source.replace('除 `' + provider + '` 外的 `packages/ui/**`', '`packages/ui/**`'),
      'PAVP_ROUTE_TRANSITION_PROVIDER_SCOPE',
    ],
  ]
  for (const [mutated, expected] of probes) {
    if (
      mutated === source ||
      !isDeepStrictEqual(routeTransitionInventoryViolations(mutated), [expected])
    ) {
      failures.push('Route Transition inventory negative probe failed: ' + expected)
    }
  }
  if (failures.length === 0) {
    console.log(
      'Route Transition exact implementation inventory: 17 paths; 6/6 negative probes passed',
    )
  }
  return failures
}

function routeTransitionAdmissionViolations(architectureSource: string): string[] {
  const violations: string[] = []
  const amendmentHeading = `### 1.2B.0N \`${routeTransitionWorkPackage}\``
  const amendmentStart = architectureSource.indexOf(amendmentHeading)
  const amendmentEnd =
    amendmentStart === -1
      ? -1
      : architectureSource.indexOf('\n### ', amendmentStart + amendmentHeading.length)
  const amendmentSource =
    amendmentStart === -1
      ? ''
      : architectureSource.slice(
          amendmentStart,
          amendmentEnd === -1 ? architectureSource.length : amendmentEnd,
        )
  const hasEveryMarker = (markers: readonly string[]): boolean =>
    amendmentSource.length > 0 && markers.every((marker) => amendmentSource.includes(marker))

  const currentWorkMarkers = [
    `PREVIOUS_CURRENT_BOUNDED_WORK=${adminNavigationMotionVueSelectionLensWorkPackage}`,
    'PREVIOUS_CURRENT_BOUNDED_WORK_DISPOSITION=ACCEPTED_DIRECT_PREDECESSOR_NOT_CURRENT',
  ] as const
  if (!hasEveryMarker(currentWorkMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_CURRENT_WORK')
  }

  const predecessorReconciliationMarkers = [
    `DIRECT_PREDECESSOR_WORK_PACKAGE=${adminNavigationMotionVueSelectionLensWorkPackage}`,
    'DIRECT_PREDECESSOR_STATUS=ACCEPTED',
    'DIRECT_PREDECESSOR_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'DIRECT_PREDECESSOR_STATIC_VERIFICATION=PASS',
    `DIRECT_PREDECESSOR_OWNER_ACCEPTANCE_STATEMENT=${adminNavigationMotionVueSelectionLensAcceptanceStatement}`,
    'DIRECT_PREDECESSOR_OWNER_RUNTIME_ACCEPTANCE=PASS',
    'DIRECT_PREDECESSOR_OWNER_VISUAL_ACCEPTANCE=PASS',
    'DIRECT_PREDECESSOR_OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED',
    `DIRECT_PREDECESSOR_IMPLEMENTATION_COMMIT=${adminNavigationMotionVueSelectionLensImplementationCommit}`,
    'DIRECT_PREDECESSOR_PUBLICATION_TARGET=origin/main',
    'DIRECT_PREDECESSOR_PUBLICATION_STATUS=COMPLETE',
    'DIRECT_PREDECESSOR_RELEASE_STATUS=NOT_RELEASED',
  ] as const
  if (!hasEveryMarker(predecessorReconciliationMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_PREDECESSOR_RECONCILIATION')
  }

  const admissionMarkers = [
    `AMENDMENT=${routeTransitionAdmissionAmendment}`,
    'AMENDMENT_KIND=ARCHITECTURE_ONLY_ROUTE_TRANSITION_ROUTING_CAPABILITY_ADMISSION',
    'AMENDMENT_STATUS=FROZEN',
    'NORMATIVE_WRITE_AUTHORITY=ARCHITECTURE.md',
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    `WORK_PACKAGE=${routeTransitionWorkPackage}`,
    'NEW_STATUS_ENUM=PROHIBITED',
  ] as const
  if (!hasEveryMarker(admissionMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_ADMISSION_NOT_FROZEN')
  }

  const stateMarkers = [
    'STATUS=OPEN',
    'REPOSITORY_IMPLEMENTATION=COMPLETE',
    'STATIC_VERIFICATION=PASS',
    'OWNER_RUNTIME_ACCEPTANCE=NOT_PERFORMED',
    'OWNER_VISUAL_ACCEPTANCE=NOT_PERFORMED',
    'OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED',
    'PUBLICATION_STATUS=NOT_PUBLISHED',
    'RELEASE_STATUS=NOT_RELEASED',
  ] as const
  if (!hasEveryMarker(stateMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_STATE_BOUNDARY')
  }

  const technologyMarkers = [
    'ROUTE_TRANSITION_ENGINE=NATIVE_DOCUMENT_VIEW_TRANSITION_API',
    'ROUTE_TRANSITION_SCOPE=DOCUMENT_SCOPED_SAME_DOCUMENT_ONLY',
    'ELEMENT_SCOPED_VIEW_TRANSITION=PROHIBITED',
    'ROUTE_TRANSITION_NPM_DEPENDENCY=NONE',
    'ROUTE_TRANSITION_VENDOR_RUNTIME=NONE',
    'ROUTE_TRANSITION_SECOND_ANIMATION_LIBRARY=PROHIBITED',
    'SSGOI_ROUTE_CONTENT_OWNERSHIP=PROHIBITED',
    'MOTION_VUE_ANIMATE_PRESENCE_ROUTE_CONTENT_OWNERSHIP=PROHIBITED',
    'MOTION_VUE_ROUTE_LAYOUT_OR_PRESENCE_OWNERSHIP=PROHIBITED',
    'VUE_TRANSITION_AROUND_ROUTER_VIEW=PROHIBITED',
    'GSAP_ROUTE_TIMELINES=PROHIBITED',
    'ANIME_JS_ROUTE_CONTENT_OWNERSHIP=PROHIBITED',
    'ANOTHER_ROUTE_TRANSITION_DEPENDENCY=PROHIBITED',
    'ROUTE_TRANSITION_REJECTION_NO_ROUTE_DERIVED_KEY=REQUIRED',
    'ROUTE_TRANSITION_REJECTION_NO_REAL_OUTGOING_DOM=REQUIRED',
    'ROUTE_TRANSITION_REJECTION_NO_SECOND_SCROLL_CACHE_OR_WRITER=REQUIRED',
    'ROUTE_TRANSITION_REJECTION_NO_SECOND_HISTORY_DIRECTION_STACK=REQUIRED',
    'ROUTE_TRANSITION_REJECTION_NO_DUPLICATE_FOCUSABLE_CONTENT=REQUIRED',
    'ROUTE_TRANSITION_REJECTION_NO_SECOND_ROUTER_OWNER=REQUIRED',
    `MOTION_VUE_REMAINS_SCOPED_TO=${adminNavigationMotionVueSelectionLensWorkPackage}_ONLY`,
  ] as const
  if (!hasEveryMarker(technologyMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_TECHNOLOGY_BOUNDARY')
  }

  const runtime005Markers = [
    'PAVP_RUNTIME_005_LIVE_DOM_ROUTE_ANIMATION=PROHIBITED',
    `PAVP_RUNTIME_005_NATIVE_STATIC_SNAPSHOT_TRANSITION=ADMITTED_ONLY_FOR_${routeTransitionWorkPackage}`,
    'PAVP_RUNTIME_005_ROUTE_HOST_KEY=NONE',
    'PAVP_RUNTIME_005_ROUTED_COMPONENT_KEY=NONE',
    'PAVP_RUNTIME_005_REAL_OUTGOING_DOM_RETENTION=PROHIBITED',
    'PAVP_RUNTIME_005_ROUTER_VIEW_COUNT=1',
    'PAVP_RUNTIME_005_ROUTE_CONTENT_HOST_COUNT=1',
    'PAVP_RUNTIME_005_ROUTE_CONTENT_HOST=.pavp-route-content',
    'PAVP_RUNTIME_005_ROUTE_V_IF_OR_V_SHOW=PROHIBITED',
    'PAVP_RUNTIME_005_VUE_TRANSITION=PROHIBITED',
    'PAVP_RUNTIME_005_ANIMATE_PRESENCE=PROHIBITED',
    'PAVP_RUNTIME_005_KEEP_ALIVE_OR_SUSPENSE_ADDITION=PROHIBITED',
    'PAVP_RUNTIME_005_LIVE_ROUTE_DOM_OPACITY=1',
    'PAVP_RUNTIME_005_LIVE_ROUTE_DOM_TRANSFORM=none',
    'PAVP_RUNTIME_005_DELIBERATE_BLANK_FRAME=PROHIBITED',
    'PAVP_RUNTIME_005_ANIMATED_SURFACE=BROWSER_CREATED_STATIC_PSEUDO_ELEMENT_SNAPSHOTS_ONLY',
    'ROUTER_REMAINS_SOLE_URL_HISTORY_GUARD_ERROR_FOCUS_SCROLL_OWNER=REQUIRED',
  ] as const
  if (!hasEveryMarker(runtime005Markers)) {
    violations.push('PAVP_ROUTE_TRANSITION_RUNTIME_005_BOUNDARY')
  }

  const presetMarkers = [
    'ROUTE_TRANSITION_PRESET_REGISTRY=route-transition.none;route-transition.content-crossfade;route-transition.axis-inline-soft;route-transition.drill-soft;route-transition.sheet-soft',
    'ROUTE_TRANSITION_PRESET_COUNT=5',
    'ROUTE_TRANSITION_ACTIVE_VISUAL_PRESET_COUNT=4',
    'ROUTE_TRANSITION_PRESET_ID_OWNER=PAVP',
    'ROUTE_TRANSITION_DEFAULT_PRESET=route-transition.content-crossfade',
    'ROUTE_TRANSITION_DEFAULT_SCOPE=GLOBAL_AND_UNORDERED_FALLBACK',
    'ROUTE_TRANSITION_WORKSPACE_FULL_DEFAULT_PRESET=route-transition.axis-inline-soft',
    'ROUTE_TRANSITION_WORKSPACE_FULL_DEFAULT_RULE=route-transition-rule.architecture-workspace-axis',
    'ROUTE_TRANSITION_WORKSPACE_FULL_DEFAULT_RULE_KIND=ordered-routes',
    'ROUTE_TRANSITION_WORKSPACE_AXIS_ORDER=console-overview;appearance-management;design-token-inspector;runtime-kernel-inspector;router-governance-inspector;storage-persistence-inspector;ui-system-inspector;responsive-layout-inspector;engineering-quality-inspector;capability-roadmap',
    'ROUTE_TRANSITION_WORKSPACE_AXIS_DIRECTION=LATER_INDEX_FORWARD;EARLIER_INDEX_REVERSE',
    'ROUTE_TRANSITION_OWNER_COMPARISON_RULES=REMOVED',
    'ROUTE_TRANSITION_FULL_DEFAULT=PARALLEL_OLD_NEW_SNAPSHOT_OPACITY_CROSSFADE',
    'ROUTE_TRANSITION_FULL_DEFAULT_DURATION=calc(var(--ui-motion-duration) + var(--ui-motion-duration) / 2)',
    'ROUTE_TRANSITION_FULL_DEFAULT_EASING=var(--ui-motion-easing)',
    'ROUTE_TRANSITION_DURATION_OWNER=::view-transition-group(pavp-admin-route-content)',
    'ROUTE_TRANSITION_DESCENDANT_DURATION=IMAGE_PAIR_OLD_NEW_INHERIT_SHARED_GROUP_DURATION',
    'ROUTE_TRANSITION_FULL_PACE_SCOPE=NAMED_ROUTE_CONTENT_SNAPSHOTS_ONLY;MICROINTERACTIONS_UNCHANGED;NO_USER_PACE_OPTION',
    'ROUTE_TRANSITION_STYLELINT_POLICY_OWNER=stylelint.config.mjs',
    'ROUTE_TRANSITION_STYLELINT_FULL_DURATION_SCOPE=apps/web/src/app/router/route-transition/route-transition.css:animation-duration:EXACT_FULL_VALUE_ONLY',
    'ROUTE_TRANSITION_STYLELINT_GLOBAL_DURATION_POLICY=UNCHANGED',
    'LIVE_DIVIDER_WIDTH_AUTHORITY=--ui-admin-border-width',
    'ROUTE_TRANSITION_DIVIDER_ROOT_CAUSE=DOCUMENT_OVERLAY_OCCLUSION_BY_SNAPSHOT_OVERFLOW',
    'ROUTE_TRANSITION_GROUP_BORDER_MIRROR=REJECTED_INEFFECTIVE',
    'ROUTE_TRANSITION_GROUP_BORDER_REJECTION_REASON=PARENT_BORDER_PAINTS_BELOW_MOVING_IMAGE_PAIR_DESCENDANTS',
    'ROUTE_TRANSITION_DIVIDER_OWNER=PERMANENT_LIVE_NAIVE_DIVIDER_ONLY',
    'ROUTE_TRANSITION_SNAPSHOT_CONTAINMENT_OWNER=::view-transition-image-pair(pavp-admin-route-content)',
    'ROUTE_TRANSITION_SNAPSHOT_CONTAINMENT=overflow:clip',
    'ROUTE_TRANSITION_SNAPSHOT_SCROLL_OWNER=NONE',
    'ROUTE_TRANSITION_DIVIDER_GEOMETRY_COMPENSATION=PROHIBITED',
    'ROUTE_TRANSITION_STYLELINT_DIVIDER_MARGIN_EXCEPTION=REMOVED_NEGATIVE_EXPRESSION_REJECTED_EVERYWHERE',
    'ROUTE_TRANSITION_FULL_DEFAULT_SPATIAL_EFFECTS=NONE',
    'ROUTE_TRANSITION_FULL_DEFAULT_FILTER_EFFECTS=NONE',
    'ROUTE_TRANSITION_FULL_DEFAULT_GEOMETRY_INTERPOLATION=PROHIBITED',
    'ROUTE_TRANSITION_ROOT_SNAPSHOT_ANIMATION=DISABLED',
    'ROUTE_TRANSITION_REDUCED_DEFAULT=PERCEPTIBLE_OPACITY_ONLY_CROSSFADE',
    'ROUTE_TRANSITION_REDUCED_DURATION=var(--ui-motion-duration)',
    'ROUTE_TRANSITION_REDUCED_EASING=var(--ui-motion-easing)',
    'ROUTE_TRANSITION_REDUCED_SPATIAL_MOTION=PROHIBITED',
    'ROUTE_TRANSITION_NONE_BEHAVIOR=BYPASS_DOCUMENT_START_VIEW_TRANSITION_AND_NAVIGATE_IMMEDIATELY',
    'ROUTE_TRANSITION_CONTENT_CROSSFADE_SEMANTICS=PEER_WORKSPACES_AND_UNRELATED_ROUTE_FAMILIES',
    'ROUTE_TRANSITION_AXIS_INLINE_SOFT_SEMANTICS=EXPLICITLY_ORDERED_PEER_ROUTES_ONLY',
    'ROUTE_TRANSITION_DRILL_SOFT_SEMANTICS=LIST_TO_DETAIL_ROUTE_PAIRS_ONLY',
    'ROUTE_TRANSITION_SHEET_SOFT_SEMANTICS=TEMPORARY_TASK_CREATE_EDIT_FILTER_OR_MODAL_LIKE_ROUTES_ONLY',
    'ROUTE_TRANSITION_NON_DEFAULT_PRESET_REQUIRES=EXPLICIT_VALIDATED_RULE',
    'ROUTE_TRANSITION_REDUCED_SPATIAL_PRESET_PROJECTION=route-transition.content-crossfade',
    'ROUTE_TRANSITION_NONE_PRESET_PROJECTION=route-transition.none',
    'ROUTE_TRANSITION_INITIAL_EXPRESSIVE_PRESETS=PROHIBITED_HERO_ZOOM_SHARED_ELEMENT_SCROLL_SEQUENCE_FILM_STRIP_BLIND_ROTATE_JAEMIN_OR_OTHER',
    'ROUTE_TRANSITION_NATIVE_OBJECT_CALLBACK_CSS_KEYFRAME_OR_ARBITRARY_OPTION_EXPOSURE=PROHIBITED',
  ] as const
  if (!hasEveryMarker(presetMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_PRESET_REGISTRY')
  }

  const routeMetaMarkers = [
    'ROUTE_META_ADDITION=routeTransitionFamilyId',
    'ROUTE_META_ADDITION_COUNT=1',
    'ROUTE_TRANSITION_FAMILY_ALLOWED_VALUES=route-family.architecture-workspace;route-family.error',
    'ROUTE_TRANSITION_FAMILY_ARCHITECTURE_WORKSPACE_ROUTE_COUNT=10',
    'ROUTE_TRANSITION_FAMILY_ERROR_ROUTE_COUNT=7',
    'PRE_IMPLEMENTATION_EXACT_ROUTE_META_KEY_COUNT=15',
    'CURRENT_EXACT_ROUTE_META_KEY_COUNT=16',
    'ROUTE_META_PRESET_PAIR_ORDER_DIRECTION_VENDOR_PARAMETER_CALLBACK_CSS_OR_KEYFRAME=PROHIBITED',
    'ROUTE_TRANSITION_PAIR_AND_ORDERED_BEHAVIOR_OWNER=RULE_REGISTRY_ONLY',
  ] as const
  if (!hasEveryMarker(routeMetaMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_ROUTE_META_BOUNDARY')
  }

  const ruleMarkers = [
    'ROUTE_TRANSITION_RULE_KINDS=global-default;route-family;ordered-routes;exact-route-pair',
    'ROUTE_TRANSITION_RULE_FIELD_ALLOWLIST=RouteName;RouteTransitionFamilyId;RouteTransitionPresetId;integer_priority;forwardPresetId;reversePresetId;fallbackPresetId',
    'ROUTE_TRANSITION_RULE_RAW_PATH_COMPONENT_PATH_VENDOR_FUNCTION_CSS_KEYFRAME_OR_ARBITRARY_OBJECT=PROHIBITED',
    'ROUTE_TRANSITION_RULE_RESOLUTION_ORDER=HIGHER_PRIORITY;EXACT_ROUTE_PAIR;ORDERED_ROUTES;ROUTE_FAMILY;GLOBAL_DEFAULT',
    'ROUTE_TRANSITION_EQUAL_PRIORITY_AND_SPECIFICITY=STATIC_VERIFICATION_FAIL',
    'ROUTE_TRANSITION_DECLARATION_ORDER_TIEBREAK=PROHIBITED',
    'ROUTE_TRANSITION_RULE_DIRECTION=GLOBAL_DEFAULT_AND_ROUTE_FAMILY_NEUTRAL;ORDERED_ROUTES_BY_ROUTE_ORDER;EXACT_ROUTE_PAIR_BY_CONFIGURED_PAIR',
    'ROUTE_TRANSITION_DIRECTIONAL_PRESET_MAPPING=ORDERED_OR_EXACT_FORWARD_REVERSE_ONLY;NEUTRAL_FIELDS_REJECT_DIRECTION_AWARE_PRESETS_BEFORE_PROJECTION',
    'ROUTE_TRANSITION_UNKNOWN_INACTIVE_INVALID_AMBIGUOUS_OR_MISSING_REFERENCE=route-transition.none',
  ] as const
  if (!hasEveryMarker(ruleMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_RULE_PRECEDENCE')
  }

  const navigationMarkers = [
    'ROUTE_TRANSITION_INITIAL_NAVIGATION_OWNER=ConsoleRouteFrame.navigate()',
    'ROUTE_TRANSITION_INITIAL_SCOPE=USER_INITIATED_ADMIN_PRODUCT_NAVIGATION_ONLY',
    'ROUTE_TRANSITION_ELIGIBLE_EDGE=DIFFERENT_PRODUCT_ROUTE_TO_DIFFERENT_PRODUCT_ROUTE',
    'ROUTE_TRANSITION_ELIGIBLE_MOTION=FULL_OR_REDUCED',
    'ROUTE_TRANSITION_ELIGIBLE_API=SUPPORTED_DOCUMENT_SCOPED_VIEW_TRANSITION',
    'ROUTE_TRANSITION_ELIGIBLE_DOCUMENT_VISIBILITY=VISIBLE',
    'ROUTE_TRANSITION_ELIGIBLE_BOUNDARY=VALID_AND_UNIQUE',
    'ROUTE_TRANSITION_BROWSER_BACK_FORWARD=DEFERRED',
    'ROUTE_TRANSITION_SECOND_HISTORY_MODEL=PROHIBITED',
    'ROUTE_TRANSITION_BYPASS_SET=INITIAL_NAVIGATION;HARD_RELOAD;CURRENT_ROUTE_NO_OP;BROWSER_BACK_FORWARD;ROUTER_REPLACE;REDIRECT;PRODUCT_TO_ERROR;ERROR_TO_PRODUCT;ERROR_TO_ERROR;CHUNK_LOAD_ERROR;RECOVERY_NAVIGATION;MOTION_NONE;UNSUPPORTED_BROWSER;HIDDEN_DOCUMENT;MISSING_OR_DUPLICATE_BOUNDARY',
    'ROUTE_TRANSITION_COORDINATOR_OWNER=PRIVATE_ROUTER_DOMAIN_MODULE',
    'ROUTE_TRANSITION_CURRENT_ROUTE_NO_OP_BEFORE_PRELOAD=REQUIRED',
    'ROUTE_TRANSITION_TARGET_RESOLUTION_OWNER=EXISTING_ROUTER',
    'ROUTE_TRANSITION_TARGET_PRELOAD=loadRouteLocation()_BEFORE_SNAPSHOT',
    'ROUTE_TRANSITION_ROUTER_PUSH_COUNT_IN_UPDATE_CALLBACK=1',
    'ROUTE_TRANSITION_PREVIOUS_UPDATE_CALLBACK_COMPLETION=AWAIT_ROUTER_RESULT_THEN_VUE_NEXT_TICK',
    'ROUTE_TRANSITION_PREVIOUS_UPDATE_CALLBACK_DEFECT=VUE_NEXT_TICK_DID_NOT_PROVE_ASYNC_ROUTER_SCROLL_BEHAVIOR_COMPLETION',
    'ROUTE_TRANSITION_INSTALLED_VUE_ROUTER_VERSION=5.2.0',
    'VUE_ROUTER_FINALIZE_NAVIGATION_HANDLE_SCROLL_AWAIT=NO',
    'VUE_ROUTER_PUSH_MAY_RESOLVE_BEFORE_ASYNC_SCROLL_BEHAVIOR=YES',
    'ROUTE_TRANSITION_UPDATE_CALLBACK_COMPLETION=AWAIT_ROUTER_RESULT_THEN_EXACT_ROUTER_PRESENTATION_COMMIT',
    'ROUTER_PRESENTATION_COMMIT_OWNER=EXISTING_ROUTER_LIFECYCLE_ONLY',
    'ROUTER_PRESENTATION_COMMIT_BROKER=PRIVATE_WEAKMAP_PER_ROUTER',
    'ROUTER_PRESENTATION_COMMIT_RESERVATION=ONE_SHOT_EXACT_FUTURE_NAVIGATION',
    'ROUTER_PRESENTATION_COMMIT_RESERVATION_FIELDS=EXPECTED_ROUTE_NAME;EXPECTED_FULL_PATH;UNIQUE_PRIVATE_SYMBOL;MONOTONIC_RUNTIME_SEQUENCE;PROMISE',
    'ROUTER_PRESENTATION_COMMIT_RESERVATION_TIMING=IMMEDIATELY_BEFORE_SINGLE_ROUTER_PUSH',
    'ROUTER_PRESENTATION_COMMIT_BINDING=EXACT_EXPECTED_ROUTE_NAME_AND_FULL_PATH_TO_ACTUAL_NORMALIZED_TO',
    'ROUTER_PRESENTATION_COMMIT_BINDING_PHASE=EXISTING_BEFORE_EACH_AFTER_NAVIGATION_ATTEMPT_CREATION_BEFORE_PRESENTATION',
    'ROUTER_PRESENTATION_COMMIT_RAPID_NAVIGATION_IDENTITY=LATEST_MATCHING_UNBOUND_RUNTIME_SEQUENCE_WITH_DISTINCT_PRIVATE_SYMBOL',
    'ROUTER_PRESENTATION_COMMIT_SUCCESS_POINT=AFTER_DOM_TITLE_H1_FOCUS_INLINE_SCROLL_LEFT_AND_FINAL_BLOCK_SCROLL_TOP_COMMIT',
    'ROUTER_PRESENTATION_COMMIT_NAVIGATION_FAILURE=SETTLE_CANCELLED_AND_RETURN_ORIGINAL_TYPED_FAILURE',
    'ROUTER_PRESENTATION_COMMIT_REDIRECT=SETTLE_ORIGINAL_RESERVATION_AND_SKIP_OWNING_VISUAL_TRANSITION',
    'ROUTER_PRESENTATION_COMMIT_ERROR=REJECT_AND_PRESERVE_ROUTER_ERROR_OBSERVABILITY',
    'ROUTER_PRESENTATION_COMMIT_SUPERSESSION=SETTLE_CANCELLED_WITHOUT_CANCELLING_ROUTER_COMMIT',
    'ROUTER_PRESENTATION_COMMIT_ROUTER_DISPOSAL=SETTLE_ALL_REMAINING_RESERVATIONS',
    'ROUTER_PRESENTATION_COMMIT_COORDINATOR_DISPOSAL_OR_STALE_EPOCH=SETTLE_ALL_OWNED_RESERVATIONS',
    'ROUTER_PRESENTATION_COMMIT_DIRECT_ROUTER_NAVIGATION=UNCHANGED_WITHOUT_RESERVATION',
    'ROUTER_PRESENTATION_COMMIT_TIMER_RAF_POLLING_OBSERVER_LISTENER_PERSISTENCE=NONE',
    'ROUTE_TRANSITION_TYPED_NAVIGATION_FAILURE_AND_ROUTER_ERROR_NORMALIZATION=PRESERVED',
    'ROUTE_TRANSITION_ROUTER_FOCUS_AND_SCROLL_OWNERSHIP=PRESERVED',
    'ROUTER_REMAINS_SOLE_TITLE_FOCUS_BLOCK_SCROLL_INLINE_SCROLL_GUARD_REDIRECT_ERROR_URL_HISTORY_OWNER=REQUIRED',
    'ROUTE_TRANSITION_COORDINATOR_TITLE_FOCUS_OR_SCROLL_WRITE=PROHIBITED',
    'ROUTE_TRANSITION_MAX_ACTIVE_VIEW_TRANSITION=1',
    'ROUTE_TRANSITION_OLDER_VISUAL_TRANSITION=SKIP_BEFORE_NEWER',
    'ROUTE_TRANSITION_NAVIGATION_QUEUE_OR_REPLAY=PROHIBITED',
    'ROUTE_TRANSITION_NATIVE_PROMISE_REJECTION_HANDLING=ready;updateCallbackDone;finished',
    'ROUTE_TRANSITION_REAL_ROUTER_OR_LAZY_LOAD_FAILURE=PROPAGATE',
    'ROUTE_TRANSITION_VISUAL_SKIP_OR_UNSUPPORTED=PROGRESSIVE_ENHANCEMENT_BYPASS',
    'ROUTE_TRANSITION_BEFORE_RESOLVE_DEFERRED_GUARD_IMPLEMENTATION=NOT_FROZEN',
    'ROUTE_TRANSITION_IMPLEMENTATION_PATH=EXISTING_PROGRAMMATIC_NAVIGATION_PATH_ONLY',
    'ROUTE_TRANSITION_PREFERRED_API=document.startViewTransition({update,types:[validatedTransitionType]})',
    'ROUTE_TRANSITION_PRESET_TO_TYPE_CARDINALITY=EXACTLY_ONE_VALIDATED_PAVP_OWNED_TYPE',
    'ROUTE_TRANSITION_TYPED_OPTIONS_UNAVAILABLE_FALLBACK=CALLBACK_ONLY_DEFAULT_CONTENT_CROSSFADE_OR_SAFE_BYPASS',
    'ROUTE_TRANSITION_API_UNAVAILABLE_FALLBACK=NORMAL_ROUTER_NAVIGATION',
    'ROUTE_TRANSITION_POLYFILL=PROHIBITED',
  ] as const
  if (!hasEveryMarker(navigationMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_INITIAL_NAVIGATION_SCOPE')
  }

  const dynamicRootMarkers = [
    'ROUTE_TRANSITION_NEW_NPM_DEPENDENCIES=0',
    'ROUTE_TRANSITION_NEW_DYNAMIC_ROOTS=0',
    'TOTAL_DYNAMIC_ROOTS_AFTER_FIRST_IMPLEMENTATION=18',
    'ROUTE_DYNAMIC_ROOTS=17',
    'ADMIN_NAVIGATION_MOTION_DYNAMIC_ROOTS=1',
    'ROUTE_TRANSITION_DYNAMIC_ROOTS=0',
    'ROUTE_TRANSITION_INITIAL_CLOSURE=SYNC_NORMAL_APPLICATION_CLOSURE',
    'ROUTE_TRANSITION_FEATURE_READY_STATE=PROHIBITED',
    'ROUTE_TRANSITION_LAZY_RUNTIME=PROHIBITED',
    'ROUTE_TRANSITION_FIRST_NAVIGATION_ANIMATION_LOSS=PROHIBITED',
    'ROUTE_TRANSITION_BUNDLE_BUDGET_CHANGE=NONE',
    'ROUTE_TRANSITION_BUDGET_HEADROOM_FAILURE=STOP_AND_REQUEST_SEPARATE_AMENDMENT',
  ] as const
  if (!hasEveryMarker(dynamicRootMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_DYNAMIC_ROOT_BOUNDARY')
  }

  const modelAndSourceMarkers = [
    'ROUTE_TRANSITION_BOUNDARY_ID=route-transition-boundary.architecture-console-content',
    'ROUTE_TRANSITION_BOUNDARY_TARGET=[data-scroll-owner="architecture-console-content"]',
    'ROUTE_TRANSITION_BOUNDARY_VIEW_TRANSITION_NAME=pavp-admin-route-content',
    'ROUTE_TRANSITION_BOUNDARY_ELIGIBLE_FAMILY_EDGE=route-family.architecture-workspace->route-family.architecture-workspace',
    'ROUTE_TRANSITION_PERSISTENT_REGIONS=HEADER;SIDEBAR;MENU;NAVIGATION_MOTION_LENS;DRAWER;OVERLAY_ROOT',
    'ROUTE_TRANSITION_BOUNDARY_NAME_OWNER_COUNT=1',
    'ROUTE_TRANSITION_PERSISTENT_REGION_TRANSITION_NAME=NONE',
    'ROUTE_TRANSITION_PERSISTENT_REGION_ROOT_SNAPSHOT_PARTICIPATION=PROHIBITED',
    'ROUTE_TRANSITION_BOUNDARY_OVERFLOW_SCROLL_WRAPPER_PAGE_MARKER_OR_REAL_OUTGOING_CHANGE=PROHIBITED',
    'ROUTE_TRANSITION_RESOLVER_OWNER=PAVP',
    'ROUTE_TRANSITION_RESOLVER_PURITY=PURE',
    'ROUTE_TRANSITION_RESOLVER_INPUTS=VALIDATED_FROM_ROUTE_NAME;VALIDATED_TO_ROUTE_NAME;NAVIGATION_KIND;EFFECTIVE_PAVP_MOTION;ROUTE_FAMILIES;LAYOUT_PROFILE;NATIVE_API_AVAILABILITY;TYPED_TRANSITION_SUPPORT;DOCUMENT_VISIBILITY;BOUNDARY_VALIDITY;ACTIVE_TRANSITION_STATE',
    'ROUTE_TRANSITION_RESOLVER_OUTPUT=BYPASS_WITH_REASON_OR_VALIDATED_PRESET_BOUNDARY_MOTION_PROJECTION_AND_DIRECTION',
    'ROUTE_TRANSITION_RESOLVER_ROUTER_HISTORY_STACK_SCROLL_FOCUS_PERSISTENCE_NATIVE_HANDLE_CALLBACK_CSS_OR_VENDOR_OWNERSHIP=PROHIBITED',
    'ROUTE_TRANSITION_PRIVATE_DIRECTORY=apps/web/src/app/router/route-transition/**',
    'ROUTE_TRANSITION_FILE_ALLOWLIST=route-transition-types.ts;route-transition-preset-registry.ts;route-transition-rule-registry.ts;route-transition-boundary-registry.ts;resolve-route-transition.ts;route-transition-coordinator.ts;route-transition.css',
    'ROUTE_TRANSITION_EXISTING_INTEGRATION_FILES=apps/web/src/app/router/route-registry.ts;apps/web/src/app/router/router-lifecycle.ts;apps/web/src/app/console/ConsoleRouteFrame.vue;apps/web/src/app/styles/layers.css;scripts/architecture/check-router.ts;scripts/architecture/check-architecture-admin-console.ts;scripts/architecture/check-boundaries.ts',
    'ROUTE_TRANSITION_PRODUCT_PAGE_DIRECT_RUNTIME_IMPORT=PROHIBITED',
  ] as const
  if (!hasEveryMarker(modelAndSourceMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_MODEL_AND_SOURCE_BOUNDARY')
  }

  const implementationClosureMarkers = [
    'ROUTE_TRANSITION_IMPLEMENTATION_CHANGED_FILE_COUNT=17',
    'ROUTE_TRANSITION_ROUTE_META_KEY_COUNT=16',
    'ROUTE_TRANSITION_PRODUCT_FAMILY_RECORD_COUNT=10',
    'ROUTE_TRANSITION_ERROR_FAMILY_RECORD_COUNT=7',
    'ROUTE_TRANSITION_IMPLEMENTED_PRESET_RECORD_COUNT=5',
    'ROUTE_TRANSITION_IMPLEMENTED_VISUAL_RECIPE_COUNT=4',
    'ROUTE_TRANSITION_ACTIVE_RULE_COUNT=5',
    'ROUTE_TRANSITION_WORKSPACE_AXIS_CHECK_COUNT=3',
    'ROUTE_TRANSITION_WORKSPACE_AXIS_NEGATIVE_PROBE_COUNT=4',
    'ROUTE_TRANSITION_WORKSPACE_AXIS_PROJECTION_MATRIX=90_DIRECTED_EDGES;3_LAYOUT_PROFILES;FULL_REDUCED_NONE_TYPED_FALLBACK',
    'ROUTE_TRANSITION_IMPLEMENTED_BOUNDARY=route-transition-boundary.architecture-console-content:[data-scroll-owner="architecture-console-content"]:pavp-admin-route-content:narrow,regular,wide',
    'ROUTE_TRANSITION_COORDINATOR_LIFECYCLE=ONE_CONSOLE_ROUTE_FRAME_INSTANCE;ONE_PRIVATE_MOTION_WATCH;MONOTONIC_PRELOAD_EPOCH;DISTINCT_PRESENTATION_COMMIT_RESERVATION_PER_VISUAL_PUSH;MAX_ONE_ACTIVE_VIEW_TRANSITION;SKIP_ON_NEW_NAVIGATION_OR_MOTION_CHANGE;DISPOSE_INVALIDATES_PRELOAD_SETTLES_RESERVATIONS_AND_SKIPS_VISUAL',
    'ROUTE_TRANSITION_PRELOAD_COMMIT=router.resolve;loadRouteLocation_BEFORE_SNAPSHOT;STALE_EPOCH_NO_PUSH;PRELOAD_FAILURE_DIRECT_ROUTER_PUSH_FOR_EXISTING_ERROR_CLASSIFICATION;ONE_ROUTER_PUSH_IN_UPDATE;AWAIT_ROUTER_RESULT;AWAIT_EXACT_ROUTER_PRESENTATION_COMMIT_AFTER_FINAL_REGION_SCROLL_WRITE',
    'ROUTE_TRANSITION_SOURCE_PROOF_COUNT=52',
    'ROUTE_TRANSITION_RETAINED_SOURCE_NEGATIVE_PROBE_COUNT=12',
    'ROUTE_TRANSITION_PRESENTATION_COMMIT_SOURCE_NEGATIVE_PROBE_COUNT=8',
    'ROUTE_TRANSITION_PRESET_SELECTION_SOURCE_NEGATIVE_PROBE_COUNT=7',
    'ROUTE_TRANSITION_FULL_PACE_SOURCE_NEGATIVE_PROBE_COUNT=9',
    'ROUTE_TRANSITION_STYLELINT_POLICY_NEGATIVE_PROBE_COUNT=3',
    'ROUTE_TRANSITION_SOURCE_NEGATIVE_PROBE_COUNT=39',
    'ROUTE_TRANSITION_NEW_NPM_DEPENDENCIES=0',
    'ROUTE_TRANSITION_NEW_DYNAMIC_ROOTS=0',
    'ROUTE_TRANSITION_BUNDLE_BUDGET_CHANGE=NONE',
    'ROUTE_TRANSITION_FINAL_INITIAL_JAVASCRIPT_GZIP_BYTES=226638',
    'ROUTE_TRANSITION_INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=237568',
    'ROUTE_TRANSITION_FINAL_INITIAL_JAVASCRIPT_HEADROOM_BYTES=10930',
    'ROUTE_TRANSITION_FINAL_INITIAL_CSS_GZIP_BYTES=25854',
    'ROUTE_TRANSITION_INITIAL_CSS_HARD_BUDGET_BYTES=40960',
    'ROUTE_TRANSITION_FINAL_DYNAMIC_ROOT_SET=17_ROUTE_ROOTS;1_ADMIN_NAVIGATION_MOTION_ROOT;0_ROUTE_TRANSITION_ROOTS;18_TOTAL',
    'ROUTE_TRANSITION_OWNER_RUNTIME_ACCEPTANCE=NOT_PERFORMED',
    'ROUTE_TRANSITION_OWNER_VISUAL_ACCEPTANCE=NOT_PERFORMED',
    'ROUTE_TRANSITION_OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED',
  ] as const
  if (!hasEveryMarker(implementationClosureMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_IMPLEMENTATION_CLOSURE')
  }

  const successorMarkers = [
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
    'SOURCE_IMPLEMENTATION_STATUS=COMPLETE',
    'ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORATION=PROHIBITED',
    'PRODUCTION_RELEASE_STATUS=NOT_RELEASED',
  ] as const
  if (!hasEveryMarker(successorMarkers)) {
    violations.push('PAVP_ROUTE_TRANSITION_SUCCESSOR_BOUNDARY')
  }

  return [...new Set(violations)]
}

function runRouteTransitionAdmissionNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = currentWorkStatusViolations(architectureSource)
  const probes: readonly [string, string, string][] = [
    [
      'route-transition-published-motion-package-remains-current',
      'PAVP_ROUTE_TRANSITION_CURRENT_WORK',
      architectureSource
        .replace(
          `CURRENT_BOUNDED_WORK_AUTHORITY=${routeTransitionAdmissionAmendment}`,
          `CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationMotionVueSelectionLensAdmissionAmendment}`,
        )
        .replace(
          `CURRENT_BOUNDED_WORK=${routeTransitionWorkPackage}`,
          `CURRENT_BOUNDED_WORK=${adminNavigationMotionVueSelectionLensWorkPackage}`,
        ),
    ],
    [
      'route-transition-predecessor-publication-or-owner-statement-drifts',
      'PAVP_ROUTE_TRANSITION_PREDECESSOR_RECONCILIATION',
      architectureSource
        .replace(
          `DIRECT_PREDECESSOR_IMPLEMENTATION_COMMIT=${adminNavigationMotionVueSelectionLensImplementationCommit}`,
          'DIRECT_PREDECESSOR_IMPLEMENTATION_COMMIT=0000000000000000000000000000000000000000',
        )
        .replace(
          `DIRECT_PREDECESSOR_OWNER_ACCEPTANCE_STATEMENT=${adminNavigationMotionVueSelectionLensAcceptanceStatement}`,
          'DIRECT_PREDECESSOR_OWNER_ACCEPTANCE_STATEMENT=DRIFTED',
        ),
    ],
    [
      'route-transition-amendment-is-not-frozen',
      'PAVP_ROUTE_TRANSITION_ADMISSION_NOT_FROZEN',
      architectureSource.replace(
        `${routeTransitionAdmissionAmendment}=FROZEN`,
        `${routeTransitionAdmissionAmendment}=DRAFT`,
      ),
    ],
    [
      'route-transition-package-is-rolled-back-to-not-started-and-not-run',
      'PAVP_ROUTE_TRANSITION_STATE_BOUNDARY',
      architectureSource
        .replace(
          `${routeTransitionWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
          `${routeTransitionWorkPackage}_REPOSITORY_IMPLEMENTATION=NOT_STARTED`,
        )
        .replace(
          `${routeTransitionWorkPackage}_STATIC_VERIFICATION=PASS`,
          `${routeTransitionWorkPackage}_STATIC_VERIFICATION=NOT_RUN`,
        ),
    ],
    [
      'route-transition-route-content-vendor-or-dependency-is-admitted',
      'PAVP_ROUTE_TRANSITION_TECHNOLOGY_BOUNDARY',
      architectureSource
        .replace(
          'SSGOI_ROUTE_CONTENT_OWNERSHIP=PROHIBITED',
          'SSGOI_ROUTE_CONTENT_OWNERSHIP=ADMITTED',
        )
        .replace(
          'MOTION_VUE_ANIMATE_PRESENCE_ROUTE_CONTENT_OWNERSHIP=PROHIBITED',
          'MOTION_VUE_ANIMATE_PRESENCE_ROUTE_CONTENT_OWNERSHIP=ADMITTED',
        )
        .replace(
          'VUE_TRANSITION_AROUND_ROUTER_VIEW=PROHIBITED',
          'VUE_TRANSITION_AROUND_ROUTER_VIEW=ADMITTED',
        )
        .replace('GSAP_ROUTE_TIMELINES=PROHIBITED', 'GSAP_ROUTE_TIMELINES=ADMITTED')
        .replace(
          'ANOTHER_ROUTE_TRANSITION_DEPENDENCY=PROHIBITED',
          'ANOTHER_ROUTE_TRANSITION_DEPENDENCY=ADMITTED',
        ),
    ],
    [
      'route-transition-route-key-or-real-outgoing-dom-is-restored',
      'PAVP_ROUTE_TRANSITION_RUNTIME_005_BOUNDARY',
      architectureSource
        .replace(
          'PAVP_RUNTIME_005_ROUTE_HOST_KEY=NONE',
          'PAVP_RUNTIME_005_ROUTE_HOST_KEY=routeName',
        )
        .replace(
          'PAVP_RUNTIME_005_REAL_OUTGOING_DOM_RETENTION=PROHIBITED',
          'PAVP_RUNTIME_005_REAL_OUTGOING_DOM_RETENTION=ADMITTED',
        ),
    ],
    [
      'route-transition-active-preset-is-removed-and-default-drifts',
      'PAVP_ROUTE_TRANSITION_PRESET_REGISTRY',
      architectureSource
        .replace(
          'ROUTE_TRANSITION_PRESET_REGISTRY=route-transition.none;route-transition.content-crossfade;route-transition.axis-inline-soft;route-transition.drill-soft;route-transition.sheet-soft',
          'ROUTE_TRANSITION_PRESET_REGISTRY=route-transition.none;route-transition.content-crossfade;route-transition.axis-inline-soft;route-transition.drill-soft',
        )
        .replace(
          'ROUTE_TRANSITION_DEFAULT_PRESET=route-transition.content-crossfade',
          'ROUTE_TRANSITION_DEFAULT_PRESET=route-transition.axis-inline-soft',
        ),
    ],
    [
      'route-transition-vendor-css-function-or-pair-rule-enters-route-meta',
      'PAVP_ROUTE_TRANSITION_ROUTE_META_BOUNDARY',
      architectureSource.replace(
        'ROUTE_META_ADDITION=routeTransitionFamilyId',
        'ROUTE_META_ADDITION=routeTransitionPresetId;routeTransitionPair;vendorConfig;callback;css',
      ),
    ],
    [
      'route-transition-rule-precedence-becomes-ambiguous',
      'PAVP_ROUTE_TRANSITION_RULE_PRECEDENCE',
      architectureSource
        .replace(
          'ROUTE_TRANSITION_EQUAL_PRIORITY_AND_SPECIFICITY=STATIC_VERIFICATION_FAIL',
          'ROUTE_TRANSITION_EQUAL_PRIORITY_AND_SPECIFICITY=ALLOW',
        )
        .replace(
          'ROUTE_TRANSITION_DECLARATION_ORDER_TIEBREAK=PROHIBITED',
          'ROUTE_TRANSITION_DECLARATION_ORDER_TIEBREAK=ALLOWED',
        ),
    ],
    [
      'route-transition-browser-back-forward-is-admitted-in-first-implementation',
      'PAVP_ROUTE_TRANSITION_INITIAL_NAVIGATION_SCOPE',
      architectureSource.replace(
        'ROUTE_TRANSITION_BROWSER_BACK_FORWARD=DEFERRED',
        'ROUTE_TRANSITION_BROWSER_BACK_FORWARD=ADMITTED',
      ),
    ],
    [
      'route-transition-dynamic-root-or-total-count-drifts',
      'PAVP_ROUTE_TRANSITION_DYNAMIC_ROOT_BOUNDARY',
      architectureSource
        .replace('ROUTE_TRANSITION_NEW_DYNAMIC_ROOTS=0', 'ROUTE_TRANSITION_NEW_DYNAMIC_ROOTS=1')
        .replace(
          'TOTAL_DYNAMIC_ROOTS_AFTER_FIRST_IMPLEMENTATION=18',
          'TOTAL_DYNAMIC_ROOTS_AFTER_FIRST_IMPLEMENTATION=19',
        )
        .replace('ROUTE_TRANSITION_DYNAMIC_ROOTS=0', 'ROUTE_TRANSITION_DYNAMIC_ROOTS=1'),
    ],
    [
      'route-transition-overall-acceptance-or-successor-source-is-started',
      'PAVP_ROUTE_TRANSITION_SUCCESSOR_BOUNDARY',
      architectureSource
        .replace(
          'ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORATION=PROHIBITED',
          'ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORATION=PASS',
        )
        .replace('SOURCE_IMPLEMENTATION_STATUS=COMPLETE', 'SOURCE_IMPLEMENTATION_STATUS=STARTED'),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource).filter((code) =>
        code.startsWith('PAVP_ROUTE_TRANSITION_'),
      )

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          mutatedSource !== architectureSource &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.length === 1 &&
          failureCodes[0] === expectedFailureCode,
      })
    }),
  )
}

function runAdminNavigationMotionVueSelectionLensAdmissionNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = currentWorkStatusViolations(architectureSource)
  const probes: readonly [string, string, string][] = [
    [
      'admin-navigation-motion-vue-selection-lens-current-work-left-native',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_CURRENT_WORK',
      architectureSource
        .replace(
          `CURRENT_BOUNDED_WORK_AUTHORITY=${routeTransitionAdmissionAmendment}`,
          `CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationNativeAdmissionAmendment}`,
        )
        .replace(
          `CURRENT_BOUNDED_WORK=${routeTransitionWorkPackage}`,
          `CURRENT_BOUNDED_WORK=${adminNavigationNativeWorkPackage}`,
        ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-amendment-unfrozen',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_ADMISSION_NOT_FROZEN',
      architectureSource.replace(
        `${adminNavigationMotionVueSelectionLensAdmissionAmendment}=FROZEN`,
        `${adminNavigationMotionVueSelectionLensAdmissionAmendment}=DRAFT`,
      ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-implementation-regresses-not-started',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_IMPLEMENTATION_STATE',
      architectureSource.replace(
        `${adminNavigationMotionVueSelectionLensWorkPackage}_REPOSITORY_IMPLEMENTATION=COMPLETE`,
        `${adminNavigationMotionVueSelectionLensWorkPackage}_REPOSITORY_IMPLEMENTATION=NOT_STARTED`,
      ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-static-regresses-not-run',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_STATIC_VERIFICATION_STATE',
      architectureSource.replace(
        `${adminNavigationMotionVueSelectionLensWorkPackage}_STATIC_VERIFICATION=PASS`,
        `${adminNavigationMotionVueSelectionLensWorkPackage}_STATIC_VERIFICATION=NOT_RUN`,
      ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-predecessor-drift',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_PREDECESSOR_DRIFT',
      architectureSource
        .replace(
          'PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_STATUS=ACCEPTED',
          'PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_STATUS=OPEN',
        )
        .replace(
          `PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_IMPLEMENTATION_COMMIT=${adminNavigationNativeImplementationCommit}`,
          'PREVIOUS_ADMIN_NAVIGATION_AUTHORITY_IMPLEMENTATION_COMMIT=0000000000000000000000000000000000000000',
        ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-motion-v-coordinate-drift',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_MOTION_VUE_COORDINATE',
      architectureSource.replace(
        'MOTION_VUE_COORDINATE=motion-v@2.4.0',
        'MOTION_VUE_COORDINATE=motion-v@2.5.0',
      ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-vueuse-peer-coordinate-drift',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_VUEUSE_PEER_COORDINATE',
      architectureSource.replace(
        'MOTION_VUE_REQUIRED_PEER_COORDINATE=@vueuse/core@14.4.0',
        'MOTION_VUE_REQUIRED_PEER_COORDINATE=@vueuse/core@14.3.0',
      ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-feature-root-identity-drift',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_FEATURE_ROOT_IDENTITY',
      architectureSource
        .replace(
          'MOTION_FEATURE_ROOT_ID=admin-navigation-motion-dom-max',
          'MOTION_FEATURE_ROOT_ID=admin-navigation-motion-dom-animation',
        )
        .replace(
          'MOTION_FEATURE_SOURCE_PATH=packages/ui/src/adapters/motion/admin-navigation-dom-max.ts',
          'MOTION_FEATURE_SOURCE_PATH=packages/ui/src/adapters/motion/admin-navigation-dom-animation.ts',
        )
        .replace(
          'MOTION_FEATURE_MANIFEST_KEY=../../packages/ui/src/adapters/motion/admin-navigation-dom-max.ts',
          'MOTION_FEATURE_MANIFEST_KEY=../../packages/ui/src/adapters/motion/admin-navigation-dom-animation.ts',
        ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-feature-budget-identity-drift',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_FEATURE_BUDGET_IDENTITY',
      architectureSource
        .replace(
          'MOTION_FEATURE_PROJECT_CONFIG_BUDGET_PROPERTY=projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes',
          'MOTION_FEATURE_PROJECT_CONFIG_BUDGET_PROPERTY=projectConfig.bundleBudgets.motionBytes',
        )
        .replace(
          'MOTION_FEATURE_ENGINEERING_MANIFEST_RECORD_ID=admin-navigation-motion-feature-javascript-gzip',
          'MOTION_FEATURE_ENGINEERING_MANIFEST_RECORD_ID=motion-feature-gzip',
        ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-closure-includes-initial-or-route',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_FEATURE_CLOSURE_MEASUREMENT',
      architectureSource.replace(
        'MOTION_FEATURE_EXCLUSIVE_CLOSURE_FORMULA=MOTION_FEATURE_STATIC_CLOSURE minus INITIAL_STATIC_CLOSURE',
        'MOTION_FEATURE_EXCLUSIVE_CLOSURE_FORMULA=MOTION_FEATURE_STATIC_CLOSURE plus INITIAL_OR_ROUTE_STATIC_CLOSURE',
      ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-budget-rounding-drift',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_BUDGET_ROUNDING',
      architectureSource
        .replace(
          'MOTION_FEATURE_BUDGET_FORMULA=ceil((MEASURED_MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES + 8192) / 8192) * 8192',
          'MOTION_FEATURE_BUDGET_FORMULA=ceil(MEASURED_MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES * 1.1)',
        )
        .replace(
          'MOTION_FEATURE_BUDGET_HEADROOM >= 8192',
          'MOTION_FEATURE_BUDGET_HEADROOM >= 4096',
        ),
    ],
    [
      'admin-navigation-motion-vue-selection-lens-general-motion-or-route-activated',
      'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_SCOPE_BOUNDARY',
      architectureSource
        .replace(
          'MOTION_FOR_VUE_GENERAL_CAPABILITY_STATUS=DEFERRED',
          'MOTION_FOR_VUE_GENERAL_CAPABILITY_STATUS=ACTIVE',
        )
        .replace(
          'MOTION_FOR_VUE_ROUTE_CONTENT_ANIMATION=PROHIBITED',
          'MOTION_FOR_VUE_ROUTE_CONTENT_ANIMATION=ADMITTED',
        ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)
      const admissionFailureCodes = failureCodes.filter((code) =>
        code.startsWith('PAVP_ADMIN_NAVIGATION_MOTION_VUE_SELECTION_LENS_'),
      )

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          mutatedSource !== architectureSource &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          admissionFailureCodes.length === 1 &&
          admissionFailureCodes[0] === expectedFailureCode,
      })
    }),
  )
}

function adminNavigationMotionVueSelectionLensSourceInvariantResults(
  snapshot: AdminNavigationNativeSourceSnapshot,
): readonly Readonly<{ code: string; passed: boolean }>[] {
  const shellScript = scriptContent(snapshot.shellSource)
  const shellTemplate = templateContent(snapshot.shellSource)
  const shellStyles = styleContent(snapshot.shellSource)
  const lensScript = scriptContent(snapshot.motionSelectionLensSource)
  const normalizedLensScript = lensScript.replaceAll(/\s+/gu, ' ')
  const lensTemplate = templateContent(snapshot.motionSelectionLensSource)
  const normalizedMotionRuntimeSource = snapshot.motionRuntimeSource.replaceAll(/\s+/gu, ' ')
  const motionPrivateSource = [
    snapshot.motionSelectionLensSource,
    snapshot.motionRuntimeSource,
    snapshot.motionDomMaxSource,
  ].join('\n')
  const outsideMotionPrivateSource = snapshot.outsideMotionPrivateSource
  const ownerFunctionStart = shellScript.indexOf(
    'function isPersistentNavigationSelectionLensOwner',
  )
  const ownerFunctionEnd =
    ownerFunctionStart === -1
      ? -1
      : shellScript.indexOf('\nfunction toggleExpandedNavigationGroup', ownerFunctionStart)
  const ownerFunctionSource =
    ownerFunctionStart === -1
      ? ''
      : shellScript.slice(
          ownerFunctionStart,
          ownerFunctionEnd === -1 ? shellScript.length : ownerFunctionEnd,
        )
  const shellRules = cssRuleBlocks(shellStyles)
  const selectionLensRule = shellRules.find(
    (rule) => rule.selector.trim() === '.pavp-admin-navigation-selection-lens',
  )
  const selectionLensDeclarations = selectionLensRule?.declarations ?? ''
  const persistentSurfaceSelector =
    "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before"
  const popupSurfaceSelector = '.pavp-admin-navigation-dropdown .n-dropdown-option-body::before'
  const reducedPersistentSurfaceSelector =
    "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before"
  const reducedPopupSurfaceSelector =
    "html[data-motion='reduced'] .pavp-admin-navigation-dropdown .n-dropdown-option .n-dropdown-option-body::before"
  const nonePersistentSurfaceSelector =
    "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before"
  const nonePopupSurfaceSelector =
    "html[data-motion='none'] .pavp-admin-navigation-dropdown .n-dropdown-option .n-dropdown-option-body::before"
  const fullReadyExpandedFallbackSelector =
    ".pavp-admin-shell[data-navigation-collapsed='false'] [data-pavp-admin-navigation-motion-ready='true'] .n-menu-item-content--selected::before"
  const fullReadyCollapsedFallbackSelector =
    ".pavp-admin-shell[data-navigation-collapsed='true'] [data-pavp-admin-navigation-motion-ready='true'] .n-menu-item-content.n-menu-item-content--child-active::before"
  const expandedRootIdleSurfaceSelector =
    ".pavp-admin-shell[data-navigation-collapsed='false'] [data-pavp-admin-navigation='persistent'] .n-menu > .n-submenu > .n-menu-item-content:where(:not(.n-menu-item-content--hover):not(:hover))::before"
  const expandedActiveRootBaselineSelector =
    ".pavp-admin-shell[data-navigation-collapsed='false'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content--child-active:not(.n-menu-item-content--hover):not(:hover)::before"
  const reducedForegroundStart = snapshot.providerSource.indexOf(
    "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,",
  )
  const reducedForegroundEnd =
    reducedForegroundStart === -1
      ? -1
      : snapshot.providerSource.indexOf(
          "\nhtml[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from",
          reducedForegroundStart,
        )
  const reducedForegroundSource =
    reducedForegroundStart === -1
      ? ''
      : snapshot.providerSource.slice(
          reducedForegroundStart,
          reducedForegroundEnd === -1 ? snapshot.providerSource.length : reducedForegroundEnd,
        )
  const motionImportPattern = /\bfrom\s+['"]motion-v(?:\/[^'"]*)?['"]/u
  const forbiddenMotionLifecyclePattern =
    /\b(?:querySelector|getElementById|getBoundingClientRect|getComputedStyle|closest|cloneNode|setTimeout|setInterval|requestAnimationFrame|cancelAnimationFrame|MutationObserver|ResizeObserver)\s*\(|\b(?:document|window|globalThis)\./u
  const rejectedSelectionDecorationPattern =
    /SelectionFeedbackPhase|selectionFeedback|data-pavp-admin-selection-feedback|idle-a|idle-b|selection-bloom|Bloom|moving-pill|movingPill|route-selection-aura|hard-route-dot|left-selection/iu
  const publicShellContractStart = shellScript.indexOf('const props = defineProps<')
  const publicShellContractEnd =
    publicShellContractStart === -1
      ? -1
      : shellScript.indexOf('\nconst emit = defineEmits<', publicShellContractStart)
  const publicShellContractSource =
    publicShellContractStart === -1
      ? ''
      : shellScript.slice(
          publicShellContractStart,
          publicShellContractEnd === -1 ? shellScript.length : publicShellContractEnd,
        )
  const runtimeLoadStart = snapshot.motionRuntimeSource.indexOf(
    'async function startAfterStableMount',
  )
  const runtimeLoadSource =
    runtimeLoadStart === -1 ? '' : snapshot.motionRuntimeSource.slice(runtimeLoadStart)

  return Object.freeze([
    {
      code: 'ADMIN_NAV_MOTION_VUE_PRIVATE_INTEGRATION',
      passed:
        exactOccurrenceCount(
          shellScript,
          "import AdminNavigationSelectionLens from '../adapters/motion/AdminNavigationSelectionLens.vue'",
        ) === 1 &&
        [...shellTemplate.matchAll(/<AdminNavigationSelectionLens(?=[\s>])/gu)].length === 1 &&
        shellTemplate.includes('v-slot="{ featureReady, renderIcon }"') &&
        shellTemplate.includes(':render-icon="renderIcon"') &&
        shellTemplate.includes(':render-base-icon="renderNavigationMenuIcon"') &&
        !shellTemplate
          .slice(shellTemplate.indexOf('<Teleport to="#pavp-overlay-root">'))
          .includes('<AdminNavigationSelectionLens'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_OWNER_PROJECTION',
      passed:
        ownerFunctionSource.includes("if (profile.value === 'narrow')") &&
        ownerFunctionSource.includes('return false') &&
        ownerFunctionSource.includes(
          "return optionKind === 'group' && option.key === activeNavigationGroupKey.value",
        ) &&
        ownerFunctionSource.includes(
          "return optionKind === 'route' && navigationOptionRouteName(option) === props.activeRouteName",
        ) &&
        !shellTemplate.includes(':owner-key=') &&
        !lensScript.includes('ownerKey'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_UNIQUE_LAYOUT_ID',
      passed:
        exactOccurrenceCount(
          lensScript,
          "const selectionLensLayoutId = 'pavp-admin-navigation-selection-lens'",
        ) === 1 &&
        exactOccurrenceCount(lensScript, 'layoutId: selectionLensLayoutId') === 1 &&
        exactOccurrenceCount(lensScript, 'layoutId:') === 1,
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_LAZY_STRICT_RUNTIME',
      passed:
        exactOccurrenceCount(lensScript, "import { m, type MotionProps } from 'motion-v'") === 1 &&
        snapshot.motionRuntimeSource.includes(
          "import { LayoutGroup, LazyMotion, MotionConfig, type domMax } from 'motion-v'",
        ) &&
        exactOccurrenceCount(lensScript, 'h(m.div, {') === 1 &&
        lensScript.includes('satisfies MotionProps & HTMLAttributes & VNodeProps') &&
        !lensScript.includes('const MotionSelectionLens') &&
        !lensScript.includes('type Component') &&
        exactOccurrenceCount(lensTemplate, '<LazyMotion') === 1 &&
        exactOccurrenceCount(lensTemplate, '<MotionConfig') === 1 &&
        exactOccurrenceCount(lensTemplate, '<LayoutGroup>') === 1 &&
        /<LazyMotion\s+[\s\S]*?:features="features"[\s\S]*?\sstrict\s*>/u.test(lensTemplate) &&
        !/\bimport\s*\{[^}]*\bMotion\b[^}]*\}\s*from\s*['"]motion-v['"]/u.test(motionPrivateSource),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_ASYNC_DOM_MAX',
      passed:
        exactOccurrenceCount(
          snapshot.motionRuntimeSource,
          "import('./admin-navigation-dom-max')",
        ) === 1 &&
        snapshot.motionDomMaxSource.trim() === "export { domMax as default } from 'motion-v'" &&
        [...motionPrivateSource.matchAll(/\bimport\s*\(/gu)].length === 1 &&
        runtimeLoadSource.includes('await nextTick()') &&
        runtimeLoadSource.indexOf('loadAdminNavigationDomMax()') >
          runtimeLoadSource.indexOf('await nextTick()') &&
        !/import\s*\{\s*domMax\s*\}\s*from\s*['"]motion-v['"]/u.test(snapshot.motionRuntimeSource),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_FULL_PROFILE',
      passed:
        lensScript.includes("type: 'spring'") &&
        lensScript.includes('visualDuration: 0.26') &&
        lensScript.includes('bounce: 0.16') &&
        lensScript.includes('delay: 0') &&
        lensScript.includes("props.motion === 'full' ? 'never' : 'always'") &&
        normalizedLensScript.includes(
          'layoutId: selectionLensLayoutId, transition: fullLayoutTransition',
        ),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      passed:
        normalizedLensScript.includes(
          "featureReady.value && props.motion === 'full' && props.isOwner(option)",
        ) &&
        !lensScript.includes("props.motion === 'reduced'") &&
        !lensScript.includes('reducedSelectionTransition') &&
        !lensScript.includes('duration: 0.1') &&
        selectorHasDeclarations(shellRules, reducedPersistentSurfaceSelector, {
          transform: 'none',
          'transition-duration': 'var(--ui-motion-duration)',
          'transition-property': 'background-color, opacity',
          'transition-timing-function': 'var(--ui-motion-easing)',
        }) &&
        selectorHasDeclarations(shellRules, reducedPopupSurfaceSelector, {
          transform: 'none',
          'transition-duration': 'var(--ui-motion-duration)',
          'transition-property': 'background-color, opacity',
          'transition-timing-function': 'var(--ui-motion-easing)',
        }) &&
        !reducedForegroundSource.includes('opacity') &&
        reducedForegroundSource.includes('transition-property: color !important;'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_NONE_PROFILE',
      passed:
        lensScript.includes("const skipAnimations = computed(() => props.motion === 'none')") &&
        !lensScript.includes("props.motion === 'none' && props.isOwner(option)") &&
        !shellStyles.includes('.pavp-admin-navigation-selection-lens--none') &&
        selectorHasDeclarations(shellRules, nonePersistentSurfaceSelector, {
          animation: 'none',
          transform: 'none',
          transition: 'none',
        }) &&
        selectorHasDeclarations(shellRules, nonePopupSurfaceSelector, {
          animation: 'none',
          transform: 'none',
          transition: 'none',
        }),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_READINESS_CUTOVER',
      passed:
        snapshot.motionRuntimeSource.includes('const mutableFeatureReady = ref(false)') &&
        exactOccurrenceCount(snapshot.motionRuntimeSource, 'mutableFeatureReady.value = true') ===
          1 &&
        shellTemplate.includes("featureReady && appearance.motion === 'full' ? 'true' : 'false'") &&
        shellStyles.includes("[data-pavp-admin-navigation-motion-ready='true']") &&
        exactOccurrenceCount(lensScript, 'initial: false') === 1 &&
        !/\b(?:queue|replay|missedInteraction)\b/iu.test(motionPrivateSource),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_FAILURE_FALLBACK',
      passed:
        snapshot.motionRuntimeSource.includes('.catch(() => undefined)') &&
        snapshot.motionRuntimeSource.includes('if (loadedFeatures === undefined)') &&
        normalizedMotionRuntimeSource.includes('if (loadedFeatures === undefined) { return }') &&
        !/\.catch\([^)]*=>\s*\{?\s*throw\b/u.test(snapshot.motionRuntimeSource) &&
        !/mutableFeatureReady\.value\s*=\s*true/u.test(
          snapshot.motionRuntimeSource.slice(
            snapshot.motionRuntimeSource.indexOf('if (loadedFeatures === undefined)'),
            snapshot.motionRuntimeSource.indexOf(
              'if (isDisposed())',
              snapshot.motionRuntimeSource.indexOf('if (loadedFeatures === undefined)') + 1,
            ),
          ),
        ),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_UNMOUNT_LIFECYCLE',
      passed:
        exactOccurrenceCount(lensScript, 'onBeforeUnmount(dispose)') === 1 &&
        snapshot.motionRuntimeSource.includes('runtimeState.disposed = true') &&
        exactOccurrenceCount(snapshot.motionRuntimeSource, 'if (isDisposed())') === 2 &&
        runtimeLoadSource.indexOf('if (isDisposed())') <
          runtimeLoadSource.indexOf('const loadedFeatures = await loadAdminNavigationDomMax()') &&
        runtimeLoadSource.lastIndexOf('if (isDisposed())') >
          runtimeLoadSource.indexOf('const loadedFeatures = await loadAdminNavigationDomMax()') &&
        runtimeLoadSource.includes('if (!isDisposed())'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_NO_FORBIDDEN_DOM_LIFECYCLE',
      passed: !forbiddenMotionLifecyclePattern.test(motionPrivateSource),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_NO_ROUTE_MOTION',
      passed:
        !/RouterView|useRoute|routeMotion|routeTransition|route-content|<Transition\b/iu.test(
          motionPrivateSource,
        ) &&
        exactOccurrenceCount(snapshot.appSource, '<RouterView') === 1 &&
        !/<Transition\b/u.test(snapshot.appSource) &&
        snapshot.architectureSource.includes('PAVP_RUNTIME_005_CHANGE=NONE') &&
        snapshot.architectureSource.includes('ROUTE_CONTENT_HOST=STABLE_UNKEYED'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_NO_PUBLIC_LEAK',
      passed:
        !motionImportPattern.test(outsideMotionPrivateSource) &&
        !motionImportPattern.test(snapshot.publicUiRootSource) &&
        !/AdminNavigationSelectionLens|admin-navigation-motion-runtime|admin-navigation-dom-max/u.test(
          snapshot.publicUiRootSource,
        ) &&
        !/\b(?:MotionConfig|LazyMotion|LayoutGroup|MotionProps|domMax)\b/u.test(
          publicShellContractSource,
        ) &&
        !/readonly\s+motion\s*:/u.test(publicShellContractSource),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_NO_REJECTED_BLOOM',
      passed:
        !rejectedSelectionDecorationPattern.test(
          `${snapshot.shellSource}\n${snapshot.providerSource}\n${motionPrivateSource}`,
        ) &&
        !/\[data-pavp-admin-navigation=['"]persistent['"]\][^{}]*::after/iu.test(shellStyles) &&
        !/\.pavp-admin-navigation-selection-lens::after/iu.test(shellStyles),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_TOKEN_SURFACE',
      passed:
        selectionLensDeclarations.includes('position: absolute;') &&
        selectionLensDeclarations.includes('inset-block: 0;') &&
        selectionLensDeclarations.includes(
          'inset-inline: calc(var(--ui-space-content-gap) / 2);',
        ) &&
        selectionLensDeclarations.includes('border-radius: var(--ui-radius-panel);') &&
        selectionLensDeclarations.includes('var(--ui-admin-navigation-selected) 16%') &&
        selectionLensDeclarations.includes('var(--ui-material-overlay-background)') &&
        selectionLensDeclarations.includes('pointer-events: none;') &&
        !/\b(?:box-shadow|filter|backdrop-filter)\s*:/iu.test(selectionLensDeclarations) &&
        lensScript.includes("'aria-hidden': 'true'") &&
        lensScript.includes("zIndex: 'calc(var(--ui-z-base) - 1)'") &&
        normalizedLensScript.includes(
          '? renderSelectionLens() : null, props.renderBaseIcon(option)',
        ),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_PERSISTENT_CROSSFADE_SURFACES',
      passed:
        selectorHasDeclarations(shellRules, persistentSurfaceSelector, {
          opacity: '0',
          transform: 'none',
          'transition-duration': 'var(--ui-motion-duration)',
          'transition-property': 'background-color, opacity',
          'transition-timing-function': 'var(--ui-motion-easing)',
        }) &&
        selectorHasDeclarations(shellRules, popupSurfaceSelector, {
          opacity: '0',
          transform: 'none',
          'transition-duration': 'var(--ui-motion-duration)',
          'transition-property': 'background-color, opacity',
          'transition-timing-function': 'var(--ui-motion-easing)',
        }) &&
        selectorHasDeclarations(shellRules, expandedRootIdleSurfaceSelector, {
          visibility: 'hidden',
        }) &&
        selectorHasDeclarations(shellRules, expandedActiveRootBaselineSelector, {
          opacity: '1',
          transform: 'none',
        }) &&
        exactOccurrenceCount(shellTemplate, '<PavpMenuPrimitive') === 1 &&
        shellTemplate.includes(':options="navigationMenuOptions"') &&
        shellTemplate.includes(':value="activeRouteName"') &&
        !/<PavpMenuPrimitive[\s\S]*?:key=/u.test(
          shellTemplate.slice(
            shellTemplate.indexOf('<PavpMenuPrimitive'),
            shellTemplate.indexOf('/>', shellTemplate.indexOf('<PavpMenuPrimitive')),
          ),
        ),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_STATE_FORMULAS',
      passed:
        exactOccurrenceCount(
          snapshot.themeSource,
          'color-mix(in srgb, var(--ui-admin-navigation-selected) 6%, var(--ui-material-chrome-background))',
        ) === 1 &&
        exactOccurrenceCount(
          snapshot.themeSource,
          'color-mix(in srgb, var(--ui-admin-navigation-selected) 16%, var(--ui-material-overlay-background))',
        ) === 1 &&
        snapshot.themeSource.includes('itemColorHover: navigationHoverSurface') &&
        snapshot.themeSource.includes('itemColorActive: navigationSelectedSurface') &&
        snapshot.themeSource.includes('itemColorActiveHover: navigationSelectedSurface') &&
        snapshot.themeSource.includes('itemColorActiveCollapsed: navigationSelectedSurface') &&
        snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
        snapshot.themeSource.includes('optionColorActive: navigationSelectedSurface'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_FALLBACK_EXCLUSIVITY',
      passed:
        selectorHasDeclarations(shellRules, fullReadyExpandedFallbackSelector, {
          opacity: '1',
          transform: 'none',
          transition: 'none',
          visibility: 'hidden',
        }) &&
        selectorHasDeclarations(shellRules, fullReadyCollapsedFallbackSelector, {
          opacity: '1',
          transform: 'none',
          transition: 'none',
          visibility: 'hidden',
        }) &&
        !cssDeclarationsForSelector(shellRules, fullReadyExpandedFallbackSelector)?.includes(
          'background: transparent',
        ),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_SINGLE_NATIVE_NAVIGATION',
      passed:
        exactOccurrenceCount(shellTemplate, '<PavpLayoutSiderPrimitive') === 1 &&
        exactOccurrenceCount(shellTemplate, '<PavpMenuPrimitive') === 1 &&
        exactOccurrenceCount(shellScript, 'const persistentNavigationCollapsed = computed(') === 1,
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_NO_REDUCED_PRESENCE_OR_REMOUNT',
      passed:
        !/AnimatePresence|reducedOwnerRevision|animateReducedOwnerChange|readyOwnerKey|ownerRevision/u.test(
          motionPrivateSource,
        ) &&
        !lensScript.includes("if (props.motion === 'reduced')") &&
        !lensScript.includes("if (props.motion === 'none')") &&
        !shellStyles.includes('.pavp-admin-navigation-selection-lens--reduced') &&
        !shellStyles.includes('.pavp-admin-navigation-selection-lens--none'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_DEPENDENCY_ROOT_BUDGET_CLOSURE',
      passed:
        snapshot.workspaceSource.includes('motion-v: 2.4.0') &&
        snapshot.workspaceSource.includes("'@vueuse/core': 14.4.0") &&
        snapshot.lockSource.includes('motion-v@2.4.0') &&
        snapshot.lockSource.includes('@vueuse/core@14.4.0') &&
        snapshot.lockSource.includes('motion-v@2.4.0:') &&
        snapshot.lockSource.includes('path: patches/motion-v@2.4.0.patch') &&
        snapshot.projectConfigSource.includes(
          'adminNavigationMotionFeatureJavaScriptGzipBytes: 48 * 1024',
        ) &&
        snapshot.engineeringManifestSource.includes(
          "id: 'admin-navigation-motion-feature-javascript-gzip'",
        ) &&
        snapshot.engineeringManifestSource.includes('limit: 49152') &&
        snapshot.checkBundleSource.includes(
          "const motionFeatureManifestKey = '../../packages/ui/src/adapters/motion/admin-navigation-dom-max.ts'",
        ) &&
        snapshot.checkBundleSource.includes('const expectedMotionFeatureDynamicRootCount = 1') &&
        snapshot.checkBundleSource.includes(
          'const expectedDynamicRootCount = expectedLazyRouteCount + expectedMotionFeatureDynamicRootCount',
        ) &&
        snapshot.architectureSource.includes('FINAL_DYNAMIC_ROOT_COUNT=18') &&
        snapshot.routeCount === 17 &&
        snapshot.runtimeKernelStepCount === 11 &&
        snapshot.activeProviderIds.join(',') === 'pinia,appearance' &&
        snapshot.storageRecordCount === 2,
    },
  ])
}

function adminNavigationMotionVueSelectionLensSourceViolations(
  snapshot: AdminNavigationNativeSourceSnapshot,
): string[] {
  return adminNavigationMotionVueSelectionLensSourceInvariantResults(snapshot)
    .filter((result) => !result.passed)
    .map((result) => result.code)
}

function runAdminNavigationMotionVueSelectionLensSourceNegativeProbes(
  baseline: AdminNavigationNativeSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationMotionVueSelectionLensSourceViolations(baseline)
  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-motion-vue-removes-private-integration',
      'ADMIN_NAV_MOTION_VUE_PRIVATE_INTEGRATION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "import AdminNavigationSelectionLens from '../adapters/motion/AdminNavigationSelectionLens.vue'\n",
          '',
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-drifts-owner-projection',
      'ADMIN_NAV_MOTION_VUE_OWNER_PROJECTION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "return optionKind === 'group' && option.key === activeNavigationGroupKey.value",
          "return optionKind === 'route' && option.key === activeNavigationGroupKey.value",
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-drifts-layout-id',
      'ADMIN_NAV_MOTION_VUE_UNIQUE_LAYOUT_ID',
      {
        ...baseline,
        motionSelectionLensSource: baseline.motionSelectionLensSource.replace(
          "const selectionLensLayoutId = 'pavp-admin-navigation-selection-lens'",
          "const selectionLensLayoutId = 'pavp-admin-navigation-selection-pill'",
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-disables-lazy-strict-mode',
      'ADMIN_NAV_MOTION_VUE_LAZY_STRICT_RUNTIME',
      {
        ...baseline,
        motionSelectionLensSource: baseline.motionSelectionLensSource.replace(
          '\n    strict\n',
          '\n',
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-drifts-async-dom-max-root',
      'ADMIN_NAV_MOTION_VUE_ASYNC_DOM_MAX',
      {
        ...baseline,
        motionRuntimeSource: baseline.motionRuntimeSource.replace(
          "import('./admin-navigation-dom-max')",
          "import('./admin-navigation-dom-animation')",
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-drifts-full-spring',
      'ADMIN_NAV_MOTION_VUE_FULL_PROFILE',
      {
        ...baseline,
        motionSelectionLensSource: baseline.motionSelectionLensSource.replace(
          'visualDuration: 0.26',
          'visualDuration: 0.27',
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-expands-reduced-duration',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='reduced']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before {\n  transform: none;\n  transition-duration: var(--ui-motion-duration);",
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='reduced']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before {\n  transform: none;\n  transition-duration: calc(var(--ui-motion-duration) * 2);",
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-removes-none-branch',
      'ADMIN_NAV_MOTION_VUE_NONE_PROFILE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          'animation: none;\n  transform: none;\n  transition: none;',
          'animation: none;\n  transform: none;\n  transition: opacity var(--ui-motion-duration);',
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-splits-readiness-fallback',
      'ADMIN_NAV_MOTION_VUE_READINESS_CUTOVER',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "featureReady && appearance.motion === 'full' ? 'true' : 'false'",
          "featureReady ? 'true' : 'false'",
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-rethrows-feature-load-failure',
      'ADMIN_NAV_MOTION_VUE_FAILURE_FALLBACK',
      {
        ...baseline,
        motionRuntimeSource: baseline.motionRuntimeSource.replace(
          '.catch(() => undefined)',
          '.catch((error: unknown) => { throw error })',
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-removes-unmount-disposal',
      'ADMIN_NAV_MOTION_VUE_UNMOUNT_LIFECYCLE',
      {
        ...baseline,
        motionSelectionLensSource: baseline.motionSelectionLensSource.replace(
          '\nonBeforeUnmount(dispose)\n',
          '\n',
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-adds-animation-frame-lifecycle',
      'ADMIN_NAV_MOTION_VUE_NO_FORBIDDEN_DOM_LIFECYCLE',
      {
        ...baseline,
        motionRuntimeSource: `${baseline.motionRuntimeSource}\nrequestAnimationFrame(() => undefined)\n`,
      },
    ],
    [
      'admin-navigation-motion-vue-adds-route-motion',
      'ADMIN_NAV_MOTION_VUE_NO_ROUTE_MOTION',
      {
        ...baseline,
        motionRuntimeSource: `${baseline.motionRuntimeSource}\nconst routeMotionIntent = true\n`,
      },
    ],
    [
      'admin-navigation-motion-vue-leaks-public-export',
      'ADMIN_NAV_MOTION_VUE_NO_PUBLIC_LEAK',
      {
        ...baseline,
        publicUiRootSource: `${baseline.publicUiRootSource}\nexport { m } from 'motion-v'\n`,
      },
    ],
    [
      'admin-navigation-motion-vue-restores-selection-bloom-state',
      'ADMIN_NAV_MOTION_VUE_NO_REJECTED_BLOOM',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '</script>',
          "type SelectionFeedbackPhase = 'idle-a' | 'idle-b'\n</script>",
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-makes-lens-pointer-target',
      'ADMIN_NAV_MOTION_VUE_TOKEN_SURFACE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '  pointer-events: none;\n}',
          '  pointer-events: auto;\n}',
        ),
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationMotionVueSelectionLensSourceViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          isDeepStrictEqual(failureCodes, [expectedFailureCode]),
      })
    }),
  )
}

function runAdminNavigationReducedCrossfadeNegativeProbes(
  baseline: AdminNavigationNativeSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationMotionVueSelectionLensSourceViolations(baseline)
  const reducedSurfaceBlock =
    "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='reduced']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before {\n  transform: none;\n  transition-duration: var(--ui-motion-duration);\n  transition-property: background-color, opacity;\n  transition-timing-function: var(--ui-motion-easing);\n}"
  const noneSurfaceBlock =
    "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='none']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before {\n  animation: none;\n  transform: none;\n  transition: none;\n}"
  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-reduced-crossfade-renders-motion-lens',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        motionSelectionLensSource: baseline.motionSelectionLensSource.replace(
          "featureReady.value && props.motion === 'full' && props.isOwner(option)",
          "featureReady.value && props.motion !== 'none' && props.isOwner(option)",
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-restores-raw-point-one-duration',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          reducedSurfaceBlock,
          reducedSurfaceBlock.replace(
            'transition-duration: var(--ui-motion-duration);',
            'transition-duration: 0.1s;',
          ),
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-restores-half-duration',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          reducedSurfaceBlock,
          reducedSurfaceBlock.replace(
            'transition-duration: var(--ui-motion-duration);',
            'transition-duration: calc(var(--ui-motion-duration) / 2);',
          ),
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-adds-transform-scale',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          reducedSurfaceBlock,
          reducedSurfaceBlock.replace('transform: none;', 'transform: scale(0.98);'),
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-disables-feature-ready-fallback',
      'ADMIN_NAV_MOTION_VUE_READINESS_CUTOVER',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "featureReady && appearance.motion === 'full' ? 'true' : 'false'",
          "featureReady ? 'true' : 'false'",
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-stacks-lens-and-naive-surface',
      'ADMIN_NAV_MOTION_VUE_FALLBACK_EXCLUSIVITY',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '  transition: none;\n  visibility: hidden;\n}',
          '  transition: none;\n  visibility: visible;\n}',
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-allows-none-transition',
      'ADMIN_NAV_MOTION_VUE_NONE_PROFILE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          noneSurfaceBlock,
          noneSurfaceBlock.replace(
            'transition: none;',
            'transition: opacity var(--ui-motion-duration);',
          ),
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-adds-route-motion-and-drifts-runtime-005',
      'ADMIN_NAV_MOTION_VUE_NO_ROUTE_MOTION',
      {
        ...baseline,
        appSource: baseline.appSource.replace(
          '<RouterView v-slot="{ Component }">',
          '<Transition name="pavp-route"><RouterView v-slot="{ Component }">',
        ),
        architectureSource: baseline.architectureSource.replace(
          'PAVP_RUNTIME_005_CHANGE=NONE',
          'PAVP_RUNTIME_005_CHANGE=ROUTE_ANIMATION',
        ),
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationMotionVueSelectionLensSourceViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          isDeepStrictEqual(failureCodes, [expectedFailureCode]),
      })
    }),
  )
}

function runAdminNavigationNativeAdmissionNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = currentWorkStatusViolations(architectureSource)
  const probes: readonly [string, string, string][] = [
    [
      'admin-navigation-native-current-work-left-as-rejected-reveal',
      'PAVP_ADMIN_NAVIGATION_NATIVE_CURRENT_WORK',
      architectureSource.replace(
        `CURRENT_BOUNDED_WORK=${routeTransitionWorkPackage}`,
        `CURRENT_BOUNDED_WORK=${adminNavigationHighlightRevealWorkPackage}`,
      ),
    ],
    [
      'admin-navigation-native-current-work-id-unauthorized',
      'PAVP_ADMIN_NAVIGATION_NATIVE_CURRENT_WORK',
      architectureSource.replace(
        `CURRENT_BOUNDED_WORK=${routeTransitionWorkPackage}`,
        'CURRENT_BOUNDED_WORK=PAVP-UNAUTHORIZED-WORK',
      ),
    ],
    [
      'admin-navigation-native-amendment-unfrozen',
      'PAVP_ADMIN_NAVIGATION_NATIVE_ADMISSION',
      architectureSource.replace(
        `AMENDMENT=${adminNavigationNativeAdmissionAmendment}\nAMENDMENT_KIND=OWNER_DIRECTED_SUPERSEDING_ADMIN_NAVIGATION_CORRECTIVE_ADMISSION\nAMENDMENT_STATUS=FROZEN`,
        `AMENDMENT=${adminNavigationNativeAdmissionAmendment}\nAMENDMENT_KIND=OWNER_DIRECTED_SUPERSEDING_ADMIN_NAVIGATION_CORRECTIVE_ADMISSION\nAMENDMENT_STATUS=DRAFT`,
      ),
    ],
    [
      'admin-navigation-native-repository-regresses-to-not-started',
      'PAVP_ADMIN_NAVIGATION_NATIVE_ADMISSION',
      architectureSource.replace(
        `WORK_PACKAGE_CLASSIFICATION=BOUNDED_NATIVE_NAIVE_NAVIGATION_SIMPLIFICATION\nPARENT_WORK_PACKAGE=PAVP_ARCHITECTURE_ADMIN_CONSOLE\nSTATUS=ACCEPTED\nREPOSITORY_IMPLEMENTATION=COMPLETE`,
        `WORK_PACKAGE_CLASSIFICATION=BOUNDED_NATIVE_NAIVE_NAVIGATION_SIMPLIFICATION\nPARENT_WORK_PACKAGE=PAVP_ARCHITECTURE_ADMIN_CONSOLE\nSTATUS=ACCEPTED\nREPOSITORY_IMPLEMENTATION=NOT_STARTED`,
      ),
    ],
    [
      'admin-navigation-native-static-regresses-to-not-run',
      'PAVP_ADMIN_NAVIGATION_NATIVE_ADMISSION',
      architectureSource.replace(
        `WORK_PACKAGE=${adminNavigationNativeWorkPackage}\nWORK_PACKAGE_CLASSIFICATION=BOUNDED_NATIVE_NAIVE_NAVIGATION_SIMPLIFICATION\nPARENT_WORK_PACKAGE=PAVP_ARCHITECTURE_ADMIN_CONSOLE\nSTATUS=ACCEPTED\nREPOSITORY_IMPLEMENTATION=COMPLETE\nSTATIC_VERIFICATION=PASS`,
        `WORK_PACKAGE=${adminNavigationNativeWorkPackage}\nWORK_PACKAGE_CLASSIFICATION=BOUNDED_NATIVE_NAIVE_NAVIGATION_SIMPLIFICATION\nPARENT_WORK_PACKAGE=PAVP_ARCHITECTURE_ADMIN_CONSOLE\nSTATUS=ACCEPTED\nREPOSITORY_IMPLEMENTATION=COMPLETE\nSTATIC_VERIFICATION=NOT_RUN`,
      ),
    ],
    [
      'admin-navigation-native-allows-two-persistent-siders',
      'PAVP_ADMIN_NAVIGATION_NATIVE_STRUCTURE',
      architectureSource.replace(
        'PERSISTENT_N_LAYOUT_SIDER_COUNT=1',
        'PERSISTENT_N_LAYOUT_SIDER_COUNT=2',
      ),
    ],
    [
      'admin-navigation-native-splits-collapsed-authority',
      'PAVP_ADMIN_NAVIGATION_NATIVE_STRUCTURE',
      architectureSource.replace(
        'SIDER_AND_MENU_COLLAPSED_AUTHORITY=SAME',
        'SIDER_AND_MENU_COLLAPSED_AUTHORITY=DIFFERENT',
      ),
    ],
    [
      'admin-navigation-native-hover-strength-drift',
      'PAVP_ADMIN_NAVIGATION_NATIVE_VISUAL_MOTION',
      architectureSource.replace(
        'HOVER_SURFACE_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 6%,var(--ui-material-chrome-background))',
        'HOVER_SURFACE_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 7%,var(--ui-material-chrome-background))',
      ),
    ],
    [
      'admin-navigation-native-selected-strength-drift',
      'PAVP_ADMIN_NAVIGATION_NATIVE_VISUAL_MOTION',
      architectureSource.replace(
        'SELECTED_SURFACE_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 16%,var(--ui-material-overlay-background))',
        'SELECTED_SURFACE_FORMULA=color-mix(in srgb,var(--ui-admin-navigation-selected) 15%,var(--ui-material-overlay-background))',
      ),
    ],
    [
      'admin-navigation-native-restores-gsap-instance',
      'PAVP_ADMIN_NAVIGATION_NATIVE_GSAP_RETIREMENT',
      architectureSource.replace(
        'GSAP_INSTANCE_ADMISSION_COUNT=0',
        'GSAP_INSTANCE_ADMISSION_COUNT=1',
      ),
    ],
    [
      'admin-navigation-native-restores-motion-dynamic-root',
      'PAVP_ADMIN_NAVIGATION_NATIVE_GSAP_RETIREMENT',
      architectureSource.replace(
        'NON_ROUTE_DYNAMIC_MOTION_ROOT_COUNT=0',
        'NON_ROUTE_DYNAMIC_MOTION_ROOT_COUNT=1',
      ),
    ],
    [
      'admin-navigation-native-route-count-drift',
      'PAVP_ADMIN_NAVIGATION_NATIVE_GSAP_RETIREMENT',
      architectureSource.replace(
        'DYNAMIC_ROOT_SET=EXACT_REGISTERED_LAZY_ROUTES_ONLY\nROUTE_REGISTRY_RECORDS=17',
        'DYNAMIC_ROOT_SET=EXACT_REGISTERED_LAZY_ROUTES_ONLY\nROUTE_REGISTRY_RECORDS=18',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          mutatedSource !== architectureSource &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function runAdminNavigationNativeAcceptanceClosureNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = currentWorkStatusViolations(architectureSource)
  const acceptanceBlock = [
    'OPEN_TO_ACCEPTED_TRANSITION_AUTHORITY=SEPARATE_LATER_EXPLICIT_OWNER_REVIEW_AND_GIT_CLOSURE_TASK_ONLY',
    `OWNER_ACCEPTANCE_STATEMENT=${adminNavigationNativeAcceptanceStatement}`,
    'OWNER_RUNTIME_ACCEPTANCE=PASS',
    'OWNER_VISUAL_ACCEPTANCE=PASS',
    'OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED',
    'PUBLICATION_TARGET=origin/main',
    'PRODUCTION_RELEASE=NOT_RELEASED',
  ].join('\n')
  const probes: readonly [string, string, string][] = [
    [
      'admin-navigation-native-runtime-acceptance-reverted',
      'PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_RUNTIME_ACCEPTANCE',
      architectureSource.replace(
        acceptanceBlock,
        acceptanceBlock.replace(
          'OWNER_RUNTIME_ACCEPTANCE=PASS',
          'OWNER_RUNTIME_ACCEPTANCE=NOT_PERFORMED',
        ),
      ),
    ],
    [
      'admin-navigation-native-visual-acceptance-reverted',
      'PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_VISUAL_ACCEPTANCE',
      architectureSource.replace(
        acceptanceBlock,
        acceptanceBlock.replace(
          'OWNER_VISUAL_ACCEPTANCE=PASS',
          'OWNER_VISUAL_ACCEPTANCE=NOT_PERFORMED',
        ),
      ),
    ],
    [
      'admin-navigation-native-accessibility-acceptance-invented',
      'PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_ACCESSIBILITY_ACCEPTANCE',
      architectureSource.replace(
        acceptanceBlock,
        acceptanceBlock.replace(
          'OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED',
          'OWNER_ACCESSIBILITY_ACCEPTANCE=PASS',
        ),
      ),
    ],
    [
      'admin-navigation-native-restores-overall-admin-console-acceptance',
      'ADMIN_CONSOLE_OVERALL_ACCEPTANCE_RESTORED',
      architectureSource.replace(
        'ADMIN_CONSOLE_OVERALL_ACCESSIBILITY_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
        'ADMIN_CONSOLE_OVERALL_ACCESSIBILITY_ACCEPTANCE=ACCEPTED',
      ),
    ],
    [
      'admin-navigation-native-owner-statement-drift',
      'PAVP_ADMIN_NAVIGATION_NATIVE_OWNER_ACCEPTANCE_STATEMENT',
      architectureSource.replace(
        acceptanceBlock,
        acceptanceBlock.replace(
          `OWNER_ACCEPTANCE_STATEMENT=${adminNavigationNativeAcceptanceStatement}`,
          'OWNER_ACCEPTANCE_STATEMENT=验收陈述已变更',
        ),
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSource]) => {
      const failureCodes = currentWorkStatusViolations(mutatedSource)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          mutatedSource !== architectureSource &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function validateProductExperienceReworkStatus(architectureSource: string): string[] {
  const requiredMarkers = [
    'WORK_PACKAGE=PAVP_ARCHITECTURE_ADMIN_CONSOLE_PRODUCT_EXPERIENCE_REWORK',
    'STATUS=COMPLETE',
    'PAVP_ARCHITECTURE_ADMIN_CONSOLE_INFRASTRUCTURE=ACTIVE',
    'PAVP_ARCHITECTURE_ADMIN_CONSOLE_PRODUCT_EXPERIENCE_REWORK=COMPLETE',
    'PAVP_APPEARANCE_NAIVE_CONTROL_AND_VISUAL_REFINEMENT_ADMISSION_AMENDMENT=FROZEN',
    'PAVP_APPEARANCE_NAIVE_CONTROL_AND_VISUAL_REFINEMENT=COMPLETE',
    'PAVP_INITIAL_JAVASCRIPT_HEADROOM_RECOVERY=COMPLETE',
    'BASELINE_INITIAL_JAVASCRIPT_GZIP_BYTES=183685',
    'FINAL_INITIAL_JAVASCRIPT_GZIP_BYTES=161574',
    'INITIAL_JAVASCRIPT_GZIP_REDUCTION_BYTES=22111',
    'FINAL_INITIAL_JAVASCRIPT_HEADROOM_BYTES=22746',
    'INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=184320',
    'INITIAL_CSS_HARD_BUDGET_BYTES=40960',
    'LAZY_ROUTE_JAVASCRIPT_HARD_BUDGET_BYTES=122880',
    'DEPENDENCY_CHANGE=NONE',
    'LOCKFILE_CHANGE=NONE',
    'VISIBLE_BEHAVIOR_CHANGE=NONE',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT=FROZEN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS=ACCEPTED',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATIC_VERIFICATION=PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_RUNTIME_ACCEPTANCE=PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_VISUAL_ACCEPTANCE=PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_ACCEPTANCE_STATEMENT=验收通过',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_IMPLEMENTATION_COMMIT=5673236868737f42f3470307b5f5d6c8d4e8639e',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_TARGET=origin/main',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_STATUS=COMPLETE',
    'PAVP_RUNTIME_003_ADMISSION_AMENDMENT=FROZEN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT_IS_FROZEN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS_IS_ACCEPTED',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION_IS_COMPLETE',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATIC_VERIFICATION_IS_PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_RUNTIME_ACCEPTANCE_IS_PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_VISUAL_ACCEPTANCE_IS_PASS',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_OWNER_ACCEPTANCE_STATEMENT_IS_验收通过',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_IMPLEMENTATION_COMMIT_IS_5673236868737f42f3470307b5f5d6c8d4e8639e',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_TARGET_IS_ORIGIN_MAIN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_PUBLICATION_STATUS_IS_COMPLETE',
    'PAVP_RUNTIME_003_ADMISSION_AMENDMENT_IS_FROZEN',
    'NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=NONE',
    'COMPLETED_BOUNDED_IMPLEMENTATION=/appearance only',
    'REPOSITORY_IMPLEMENTATION=COMPLETE',
    'STATIC_VERIFICATION=PASS',
    'OWNER_EXTERNAL_RUNTIME_AND_VISUAL_REVIEW=FAILED_PREVIOUS_REVISION_CORRECTION_IMPLEMENTED_PENDING_REVIEW',
    'PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_EXTERNAL',
    'IMPLEMENTATION_COMMIT=ac66b3a698a5c94b1928a38de7068e8238689a27',
    'HISTORICAL_STAGING_STATUS=COMPLETE',
    'HISTORICAL_COMMIT_STATUS=COMPLETE',
    'HISTORICAL_PUSH_STATUS=COMPLETE',
    'RELEASE_AUTHORIZATION=NONE',
    'NEW_PUBLIC_UI_COMPONENT=UiRadioCardGroup',
    'TARGET_PUBLIC_UI_COMPONENT_COUNT=9',
    'NATIVE_INTERACTIVE_CONTROL_SOURCE_COUNT_IN_APPEARANCE_PAGE=0',
    'PARALLEL_OWNER_AUTHORIZED_CORRECTIVE_WORK=NONE',
    'ADMIN_CONSOLE_EXPERIENCE_FOUNDATION=COMPLETE',
    'PAVP_APPEARANCE_CAPABILITY_WORKSPACE_REWORK=COMPLETE',
    'PAVP_NAIVE_THEME_STATE_FUSION_REPAIR=COMPLETE',
    'PAVP_CURATED_CUSTOM_THEME_CATALOG=OWNER_REJECTED_AND_RETIRED',
    'PAVP_SEVEN_BUILTIN_THEME_REPLACEMENT=COMPLETE',
    'PAVP_MOTION_GEOMETRY_STABILITY_REPAIR=COMPLETE',
    'PAVP_MOTION_GEOMETRY_STABILITY_REPAIR = COMPLETE',
    'PAVP_MOTION_GEOMETRY_STABILITY_REPAIR_IS_COMPLETE',
    'OWNER_APPEARANCE_WORKSPACE_ACCEPTANCE=ACCEPTED',
    'OWNER_CURATED_CUSTOM_THEME_CATALOG_ACCEPTANCE=REJECTED',
    'OWNER_SEVEN_BUILTIN_THEME_REPLACEMENT_ACCEPTANCE=ACCEPTED',
    'OWNER_MOTION_GEOMETRY_STABILITY_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'OWNER_MOTION_GEOMETRY_STABILITY_ACCEPTANCE = REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'OWNER_MOTION_GEOMETRY_STABILITY_ACCEPTANCE_IS_REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'OWNER_PRODUCT_EXPERIENCE_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'CURRENT_RELEASE_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'ADMIN_CONSOLE_OVERALL_VISUAL_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'ADMIN_CONSOLE_OVERALL_ACCESSIBILITY_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'ADMIN_CONSOLE_OVERALL_RELEASE_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'PAVP_RUNTIME_001_STATUS=ACCEPTED',
    'PAVP_RUNTIME_002_STATUS=OPEN',
    'PAVP_RUNTIME_002_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_RUNTIME_002_STATIC_VERIFICATION=PASS',
    'PAVP_RUNTIME_003_STATUS=ACCEPTED',
    'PAVP_RUNTIME_003_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_RUNTIME_003_STATIC_VERIFICATION=PASS',
    'PAVP_RUNTIME_003_OWNER_RUNTIME_ACCEPTANCE=PASS',
    'PAVP_RUNTIME_003_OWNER_VISUAL_ACCEPTANCE=PASS',
    'PAVP_RUNTIME_003_OWNER_ACCESSIBILITY_ACCEPTANCE=PASS',
    `PAVP_RUNTIME_003_OWNER_ACCEPTANCE_STATEMENT=${runtime003AcceptanceStatement}`,
    `PAVP_RUNTIME_003_IMPLEMENTATION_COMMIT=${runtime003ImplementationCommit}`,
    'PAVP_RUNTIME_003_PUBLICATION_TARGET=origin/main',
    'PAVP_RUNTIME_003_PUBLICATION_STATUS=COMPLETE',
    'PAVP_RUNTIME_004_STATUS=OPEN',
    'PAVP_RUNTIME_005_STATUS=OPEN',
    'PAVP_RUNTIME_005_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_RUNTIME_005_STATIC_VERIFICATION=PASS',
    'NEXT_CANONICAL_WORK_PACKAGE=NONE',
    'SUCCESSOR_PACKAGE_AUTHORIZATION=NONE',
    'COMPLETED_AUTHORIZED_SCOPE=PAVP_APPEARANCE_NAIVE_CONTROL_AND_VISUAL_REFINEMENT',
    'OWNER_RUNTIME_AND_VISUAL_ACCEPTANCE=CORRECTED_REVISION_PENDING_OWNER_REVIEW',
    'OWNER_EXTERNAL_REVIEW=FAILED_PREVIOUS_REVISION_CORRECTION_IMPLEMENTED_PENDING_REVIEW',
    'PAVP_RUNTIME_002_DEFECT_IDENTITY=PERSISTENT_CURRENT_NAVIGATION_PRIMARY_MOUSEDOWN_NATIVE_FOCUS_TRANSFER',
    'IMPLEMENTED_PRIVATE_HANDLER=preserveCurrentPersistentNavigationFocus',
    'IMPLEMENTED_EVENT_BOUNDARY=owned mousedown before the existing click navigation handler',
    'IMPLEMENTED_PREVENT_DEFAULT_GUARD=event.button === 0 AND requested route equals active route AND button belongs to persistent Wide Sidebar or Regular Rail',
    'IMPLEMENTED_DIFFERENT_ROUTE_MOUSEDOWN=DO_NOT_PREVENT_DEFAULT',
    'IMPLEMENTED_NARROW_DRAWER_MOUSEDOWN_GUARD=ABSENT',
    'IMPLEMENTED_NATIVE_KEYBOARD_ENTER_AND_SPACE=UNCHANGED',
    'STATIC_PROOF_21=dependencies and pnpm-lock.yaml remain unchanged',
    'REVERSIBLE_PAVP_RUNTIME_002_NEGATIVE_PROBE_COUNT=10',
    'PAVP_RUNTIME_005_DEFECT_IDENTITY=ADMIN_CONSOLE_FIRST_PAINT_AND_ROUTE_CONTENT_CONTINUITY',
    'REPAIRED_ROUTE_CONTENT_HOST_COUNT=1',
    'REPAIRED_ROUTE_CONTENT_HOST_KEY=NONE',
    'REPAIRED_ROUTE_CONTENT_HOST_LIFECYCLE=stable host remains mounted while routed components change inside it',
    'REPAIRED_ROUTE_CONTENT_HOST_OPACITY=1',
    'REPAIRED_ROUTE_LEVEL_ANIMATION=NONE',
    'REPAIRED_ROUTE_LEVEL_TRANSITION=NONE',
    'REPAIRED_DIRECT_PAGE_CHILD_BLANKET_ANIMATION=NONE',
    'REPAIRED_DIRECT_PAGE_CHILD_BLANKET_TRANSITION=NONE',
    'REPAIRED_DIRECT_PAGE_CHILD_DELAY=NONE',
    'FULL_REDUCED_NONE_ROUTE_CONTENT_VISIBILITY=IDENTICAL_STABLE_VISIBLE',
    'FULL_REDUCED_NONE_ROUTE_CONTENT_FINAL_GEOMETRY=IDENTICAL',
    'PAVP_RUNTIME_002_SOURCE_IMPLEMENTATION=PRESERVED',
    'PAVP_RUNTIME_002_OWNING_CHECKER_CONTRACT=PRESERVED',
    'REVERSIBLE_PAVP_RUNTIME_005_NEGATIVE_PROBE_COUNT=10',
    'PENDING_OWNER_ACCEPTANCE_STATUS_INTRODUCED=NO',
    'CURRENT_TASK_REPORT_STATUS=COMPLETED',
    'OWNER_EXTERNAL_REVIEW=NOT_PERFORMED_OPTIONAL_EXTERNAL_NON_GATING',
    'PUBLICATION_AUTHORIZATION_FOR_REWORK=GRANTED_BY_OWNER',
    'PAVP_ARCHITECTURE_ADMIN_CONSOLE_PUBLICATION_AUTHORIZATION=GRANTED_BY_OWNER',
    'PREVIOUS_VISUAL_ACCEPTANCE=REVOKED',
    'COMMIT_BEFORE_OWNER_VISUAL_ACCEPTANCE=PROHIBITED',
    'RELEASE_BEFORE_OWNER_VISUAL_ACCEPTANCE=PROHIBITED',
    'CURRENT_PROHIBITED_SCOPE=redesign of the other nine product-page content models',
    'PREVIOUS_APPEARANCE_PAGE_EXPERIENCE=OWNER_REJECTED',
    'CURRENT_BOUNDED_IMPLEMENTATION=Appearance Capability Workspace only',
    'WORK_PACKAGE=PAVP_NAIVE_THEME_STATE_FUSION_REPAIR',
    'STATUS=COMPLETE',
    'OWNER_OBSERVED_RUNTIME_RESULT=REJECTED',
    'PRE_REPAIR_BASELINE_KIND=UNCOMMITTED_CORRECTED_WORKTREE_MEASUREMENT',
    'PRE_REPAIR_BASELINE_COMMIT=NONE',
    'REPAIR_FINAL_MANIFEST_SCHEMA_VERSION=9',
    'REPAIR_FINAL_TOKEN_RECORD_COUNT=145',
    'REPAIR_FINAL_MANIFEST_RECORD_COUNT=239',
    'MOTION_GEOMETRY_REPAIR_WITHIN_THIS_COMPLETED_PACKAGE=NOT_STARTED_AND_OUT_OF_SCOPE',
    'DEPENDENCY_CHANGE=NONE',
    'WORK_PACKAGE=PAVP_CURATED_CUSTOM_THEME_CATALOG',
    'STATUS=OWNER_REJECTED_AND_RETIRED',
    'CATALOG_SOURCE_DISPOSITION=REMOVED',
    'INSTALL_CONTROL_DISPOSITION=REMOVED',
    'WORK_PACKAGE=PAVP_SEVEN_BUILTIN_THEME_REPLACEMENT',
    'STATUS=COMPLETE',
    'HISTORICAL_POST_REPLACEMENT_BUILT_IN_THEME_COUNT=7',
    'HISTORICAL_POST_REPLACEMENT_BUILT_IN_THEME_ID_ORDER=amber,cobalt,coral,graphite,iris,jade,lagoon',
    'HISTORICAL_POST_REPLACEMENT_BUILT_IN_THEME_PLANE_COUNT=28',
    'HISTORICAL_POST_REPLACEMENT_BUILT_IN_THEME_AUTHORED_COLOR_COUNT=252',
    'WORK_PACKAGE=PAVP_ADDITIONAL_BUILTIN_THEME_EXPANSION',
    'OWNER_APPROVED_ID_AND_ORDER_CONTRACT=CONFIRMED',
    'OWNER_APPROVED_SRGB_FIELD_CORRECTION=CONFIRMED',
    'PRE_EXPANSION_BUILT_IN_THEME_SOURCE_PRESERVATION=byte-for-byte unchanged',
    'ADDED_BUILT_IN_THEME_ID_ORDER=stone-blue-ash,misty-rose-blue,honey-apricot-cream,cerulean-sky-navy,lavender-ivory,denim-cocoa,burgundy-snow',
    'ACTIVE_BUILT_IN_THEME_COUNT=14',
    'ACTIVE_BUILT_IN_THEME_ID_ORDER=amber,cobalt,coral,graphite,iris,jade,lagoon,stone-blue-ash,misty-rose-blue,honey-apricot-cream,cerulean-sky-navy,lavender-ivory,denim-cocoa,burgundy-snow',
    'ACTIVE_BUILT_IN_THEME_PLANE_COUNT=56',
    'ACTIVE_BUILT_IN_THEME_AUTHORED_COLOR_COUNT=560',
    'ADDED_SOURCE_AUTHORED_COLOR_COUNT=252',
    'ADDED_SOURCE_SRGB_IN_GAMUT_ORIGINAL_COUNT=176',
    'ADDED_SOURCE_SRGB_OUT_OF_GAMUT_ORIGINAL_COUNT=76',
    'ADDED_SOURCE_SRGB_CORRECTED_FIELD_COUNT=76',
    'THEME_BANK_CSS_NUMERIC_FORMAT=strip insignificant decimal trailing zeros deterministically without changing the canonical authored source value',
    'PRODUCT_PREFERENCE_DEFAULT_THEME=built-in:iris',
    'PRE_INITIALIZATION_SAFETY_BASELINE_THEME=built-in:iris',
    'CATALOG_INSTALLATION_CAPABILITY=REMOVED',
    'MIGRATION_STORAGE_WRITE=PROHIBITED',
    'CUSTOM_REGISTRY_SNAPSHOT_CLEAR_OR_REWRITE=PROHIBITED',
    'CURRENT_MANIFEST_SCHEMA_VERSION=9',
    'CURRENT_TOKEN_RECORD_COUNT=145',
    'CURRENT_MANIFEST_RECORD_COUNT=252',
    'CURRENT_EXPECTED_RECORD_COUNT_DELTA=71',
    'CURRENT_MANIFEST_GZIP_BYTES=16198',
    'CURRENT_MANIFEST_RAW_UTF8_BYTES=369028',
    'COMMIT_AUTHORIZATION=GRANTED_BY_OWNER',
    'PUSH_AUTHORIZATION=GRANTED_BY_OWNER',
    'IMPLEMENTATION_COMMIT=7dc240c025170ee1eaa62d6fbe00627cd22db8d9',
    'PUBLICATION_TARGET=origin/main',
    'PUBLICATION_STATUS=COMPLETE',
    'WORK_PACKAGE=PAVP_MOTION_GEOMETRY_STABILITY_REPAIR',
    'RUNTIME_MOTION_CAPABILITY_ACTIVATION=NONE',
    'MOTION_MODE_SWITCH_GEOMETRY_DELTA=0',
    'ROUTE_CONTENT_HOST_LIFECYCLE=one stable unkeyed host retained while routed components change inside it',
    'ROUTE_CONTENT_HOST_VISIBILITY=opacity 1 without route-level animation or transition',
    'ROUTE_ENTRY_FULL=no route-level animation;no route-level transition;stable opacity;stable geometry',
    'ROUTE_ENTRY_REDUCED=no route-level animation;no route-level transition;stable opacity;stable geometry',
    'ROUTE_ENTRY_NONE=no route-level animation;no route-level transition;stable opacity;stable geometry',
    'ROUTE_LAYERED_CONTENT_ENTRY=NONE',
    'ROUTE_DIRECT_CHILD_BLANKET_ANIMATION=PROHIBITED',
    'ROUTE_DIRECT_CHILD_ANIMATION_DELAY=PROHIBITED',
    'ROUTE_LEVEL_CONTENT_CONCEALMENT=PROHIBITED',
    'PERSISTENT_OR_ROUTE_OWNER_ANIMATION_FILL_MODE_FORWARDS=PROHIBITED',
    'PERSISTENT_OR_ROUTE_OWNER_ANIMATION_FILL_MODE_BOTH=PROHIBITED',
    'REVERSIBLE_MOTION_GEOMETRY_NEGATIVE_PROBE_COUNT=12',
    'REVERSIBLE_ADMIN_NAIVE_NEGATIVE_PROBE_COUNT=58',
    'EXISTING_CSS_MOTION_GEOMETRY_REPAIR_DOES_NOT_ACTIVATE_RUNTIME_MOTION',
    'PERSISTENT_SHELL_AND_ROUTE_GEOMETRY_IS_INVARIANT_ACROSS_FULL_REDUCED_NONE',
    'ROUTE_CONTENT_KEY=NONE',
    'ROUTED_COMPONENT_ROUTE_DERIVED_KEY=NONE',
    'TOKENS_CSS_FORMAT_OWNER=packages/design-system/src/build/formats/css.ts',
    'TOKENS_CSS_GENERATOR_CONTRACT_OWNER=packages/design-system/src/build/build.ts',
    'TOKENS_CSS_MANUAL_EDIT=PROHIBITED',
    'TOKENS_CSS_REGENERATION_EQUALITY=PASS',
    'STATIC_PRODUCTION_GATE=PASS',
    'NEXT_PAGE_REWORK_AUTHORIZATION=NONE',
    'NEW_CAPABILITY_STATUS_ENUM=PROHIBITED',
    'INITIAL_NAVIGATION_FOCUS=preserve-browser-focus',
    'SUBSEQUENT_SUCCESSFUL_NAVIGATION_FOCUS=registered-page-heading',
    'ACTIVE_NAVIGATION_ITEM_ACTIVATION=no-op',
    'DUPLICATED_SAME_LOCATION_NAVIGATION=no-op-before-navigation-attempt',
  ] as const
  const staleCurrentAcceptanceMarkers = [
    'PAVP_CURATED_CUSTOM_THEME_CATALOG=IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE',
    'PAVP_CURATED_CUSTOM_THEME_CATALOG = IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE',
    'PAVP_CURATED_CUSTOM_THEME_CATALOG_IS_IMPLEMENTED_PENDING_OWNER_VISUAL_ACCEPTANCE',
    'OWNER_CURATED_CUSTOM_THEME_CATALOG_ACCEPTANCE=PENDING',
    'OWNER_CURATED_CUSTOM_THEME_CATALOG_ACCEPTANCE = PENDING',
    'OWNER_CURATED_CUSTOM_THEME_CATALOG_ACCEPTANCE_IS_PENDING',
    'OWNER_MOTION_GEOMETRY_STABILITY_ACCEPTANCE=ACCEPTED',
    'OWNER_MOTION_GEOMETRY_STABILITY_ACCEPTANCE = ACCEPTED',
    'OWNER_MOTION_GEOMETRY_STABILITY_ACCEPTANCE_IS_ACCEPTED',
    'OWNER_PRODUCT_EXPERIENCE_ACCEPTANCE=ACCEPTED',
    'OWNER_PRODUCT_EXPERIENCE_ACCEPTANCE = ACCEPTED',
    'OWNER_PRODUCT_EXPERIENCE_ACCEPTANCE_IS_ACCEPTED',
    'CURRENT_RELEASE_ACCEPTANCE=OWNER_ACCEPTED',
    'CURRENT_PRODUCT_EXPERIENCE_RELEASE_ACCEPTANCE=OWNER_ACCEPTED',
    'PRODUCTION_RELEASE_ACCEPTANCE=OWNER_ACCEPTED',
  ] as const

  const productExperienceStatusDrifted =
    requiredMarkers.some((marker) => !architectureSource.includes(marker)) ||
    staleCurrentAcceptanceMarkers.some((marker) => architectureSource.includes(marker)) ||
    [
      ...architectureSource.matchAll(
        /^IMPLEMENTATION_COMMIT=ac66b3a698a5c94b1928a38de7068e8238689a27$/gmu,
      ),
    ].length !== 1 ||
    /^PAVP_RUNTIME_002_STATUS=(?:ACCEPTED|IMPLEMENTED_PENDING_OWNER_ACCEPTANCE|PENDING_OWNER_ACCEPTANCE)$/mu.test(
      architectureSource,
    ) ||
    /^PAVP_RUNTIME_005_STATUS=(?:ACCEPTED|IMPLEMENTED_PENDING_OWNER_ACCEPTANCE|PENDING_OWNER_ACCEPTANCE)$/mu.test(
      architectureSource,
    ) ||
    /^OWNER_RUNTIME_RECHECK_PENDING=/mu.test(architectureSource) ||
    /PAVP_ARCHITECTURE_ADMIN_CONSOLE_OWNER_(?:RENDERED|VISUAL)_REVIEW=ACCEPTED/u.test(
      architectureSource,
    )

  return [
    ...(productExperienceStatusDrifted
      ? ['Architecture Admin Console Product Experience Rework status drifted.']
      : []),
    ...currentWorkStatusViolations(architectureSource),
  ]
}

function materialGateViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = [
    ...shellExperienceViolations(snapshot),
    ...appearanceWorkspaceViolations(snapshot),
    ...naiveThemeStateViolations(snapshot),
  ]
  const nonAppearancePageVisualSource = snapshot.pageVisualSource.replace(
    snapshot.appearancePageSource,
    '',
  )

  if (
    /\bfrom\s+['"]naive-ui(?:\/[^'"]+)?['"]|\bimport\s*\(\s*['"]naive-ui(?:\/[^'"]+)?['"]/u.test(
      snapshot.applicationImportSource,
    )
  ) {
    violations.push('DIRECT_NAIVE_IMPORT')
  }
  if (/\breka-ui\b/u.test(snapshot.manifestAndLockSource + snapshot.applicationImportSource)) {
    violations.push('ACTIVE_REKA')
  }
  if (
    styledFrameworkPackages.some(
      (name) => name !== 'reka-ui' && snapshot.manifestAndLockSource.includes(name),
    )
  ) {
    violations.push('SECOND_STYLED_FRAMEWORK')
  }
  if (!snapshot.themeAdapterSource.includes('  Button: {')) {
    violations.push('MISSING_NAIVE_OVERRIDE')
  }
  if (naiveCommonParserSensitiveOverrides(snapshot.themeAdapterSource).length > 0) {
    violations.push('NAIVE_COMMON_PARSER_INPUT')
  }
  if (
    /#[\da-f]{3,8}\b|\b(?:hsl|hwb|lab|lch|oklab|oklch|rgb)\s*\(/iu.test(
      snapshot.pageVisualSource,
    ) ||
    /\b(?:backdrop-filter|filter)\s*:|\b(?:blur|brightness|saturate)\s*\(/iu.test(
      nonAppearancePageVisualSource,
    )
  ) {
    violations.push('RAW_VISUAL_AUTHORITY')
  }
  if (
    /@(?:container|media)[^{]*(?:48rem|80rem)|(?:inline-size|block-size|width|height)\s*:\s*(?:3\.5|4|16|20)rem|(?:inline-size|block-size|width|height)\s*:\s*44px/iu.test(
      snapshot.pageVisualSource,
    )
  ) {
    violations.push('RAW_LAYOUT_AUTHORITY')
  }
  if ([...snapshot.appTemplateSource.matchAll(/<RouterView\b/gu)].length !== 1) {
    violations.push('ROUTER_OUTLET_COUNT')
  }
  if (snapshot.routeCount !== 17) {
    violations.push('ROUTE_COUNT')
  }
  if (snapshot.factImportViolation) {
    violations.push('PAGE_FACT_BOUNDARY')
  }
  if (/\b(?:localStorage|sessionStorage)\b/u.test(snapshot.pageStorageSource)) {
    violations.push('DIRECT_PAGE_STORAGE')
  }
  if (/\b(?:matchMedia|CSS\.supports)\s*\(/u.test(snapshot.competingAppearanceEnvironmentSource)) {
    violations.push('DUPLICATE_APPEARANCE_ENVIRONMENT')
  }
  if (
    /<(?:UiButton|UiSegmentedControl|button|input|select|textarea)\b[\s\S]*?\b(?:API|Auth|认证|接口)/iu.test(
      snapshot.capabilityPageTemplateSource,
    )
  ) {
    violations.push('INACTIVE_CAPABILITY_CONTROL')
  }
  if (!snapshot.generatedManifestsEqual) {
    violations.push('GENERATED_MANIFEST_DRIFT')
  }

  const registered = new Map(
    snapshot.registeredPublicComponents.map((record) => [record.exportName, record.consumerCount]),
  )
  if (snapshot.publicComponentExports.some((exportName) => !registered.has(exportName))) {
    violations.push('PUBLIC_UI_UNREGISTERED')
  }
  if (
    snapshot.registeredPublicComponents.some(
      (record) =>
        !snapshot.publicComponentExports.includes(record.exportName) || record.consumerCount === 0,
    )
  ) {
    violations.push('PUBLIC_UI_UNUSED')
  }

  return [...new Set(violations)]
}

function modifiedSnapshot(
  snapshot: MaterialGateSnapshot,
  change: Partial<MaterialGateSnapshot>,
): MaterialGateSnapshot {
  return { ...snapshot, ...change }
}

function replaceLastOccurrence(source: string, search: string, replacement: string): string {
  const index = source.lastIndexOf(search)

  return index < 0
    ? source
    : `${source.slice(0, index)}${replacement}${source.slice(index + search.length)}`
}

function runtime005RouteContentViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = []
  const parsedApp = vueSfcCompiler.parse(snapshot.appTemplateSource, {
    filename: 'apps/web/src/App.vue',
  })
  const parsedConsoleFrame = vueSfcCompiler.parse(snapshot.consoleFrameSource, {
    filename: 'apps/web/src/app/console/ConsoleRouteFrame.vue',
  })
  const appTemplateRoot = parsedApp.descriptor.template?.ast
  const consoleFrameTemplateRoot = parsedConsoleFrame.descriptor.template?.ast

  function hasTemplateKey(node: VueTemplateNode): boolean {
    return (
      templateAttributes(node, 'key').length > 0 ||
      templateDirectives(node, 'bind', 'key').length > 0 ||
      templateDirectives(node, 'bind').some(
        (directive) =>
          directive.arg === undefined && /(?:^|[{,]\s*)key\s*:/u.test(directive.exp?.content ?? ''),
      )
    )
  }

  function boundTemplateExpression(node: VueTemplateNode, argument: string): string | undefined {
    const directives = templateDirectives(node, 'bind', argument)
    return directives.length === 1
      ? normalizeTemplateExpression(directives[0]?.exp?.content)
      : undefined
  }

  function hasRouteConditional(node: VueTemplateNode): boolean {
    return templateDirectives(node, 'if').length > 0 || templateDirectives(node, 'show').length > 0
  }

  if (
    parsedApp.errors.length > 0 ||
    parsedConsoleFrame.errors.length > 0 ||
    appTemplateRoot === undefined ||
    consoleFrameTemplateRoot === undefined
  ) {
    return ['PAVP_RUNTIME_005_APP_TEMPLATE_AST']
  }

  const appElements = collectShellTemplateElements(appTemplateRoot)
  const consoleFrameElements = collectShellTemplateElements(consoleFrameTemplateRoot)
  const routerViews = appElements.filter((element) => element.node.tag === 'RouterView')
  const routeHosts = appElements.filter((element) =>
    hasStaticTemplateClass(element.node, 'pavp-route-content'),
  )
  const routedComponents = appElements.filter((element) => element.node.tag === 'component')
  const uiProviders = appElements.filter((element) => element.node.tag === 'UiProvider')
  const consoleFrames = appElements.filter((element) => element.node.tag === 'ConsoleRouteFrame')
  const adminShells = consoleFrameElements.filter((element) => element.node.tag === 'UiAdminShell')
  const routerView = routerViews[0]
  const routeHost = routeHosts[0]
  const routedComponent = routedComponents[0]

  if (routerViews.length !== 1) {
    violations.push('PAVP_RUNTIME_005_ROUTER_VIEW_COUNT')
  }
  if (routeHosts.length !== 1) {
    violations.push('PAVP_RUNTIME_005_ROUTE_HOST_COUNT')
  }
  if (routedComponents.length !== 1) {
    violations.push('PAVP_RUNTIME_005_ROUTE_COMPONENT_CONTRACT')
  }

  if (routeHost !== undefined && hasTemplateKey(routeHost.node)) {
    violations.push('PAVP_RUNTIME_005_ROUTE_HOST_KEY')
  }
  if (routedComponent !== undefined && hasTemplateKey(routedComponent.node)) {
    violations.push('PAVP_RUNTIME_005_COMPONENT_KEY')
  }
  if (
    uiProviders.length !== 1 ||
    consoleFrames.length !== 1 ||
    adminShells.length !== 1 ||
    [...uiProviders, ...consoleFrames, ...adminShells].some((element) =>
      hasTemplateKey(element.node),
    )
  ) {
    violations.push('PAVP_RUNTIME_005_REMOUNT_WRAPPER')
  }

  if (routerView !== undefined && routeHost !== undefined && routedComponent !== undefined) {
    const routerElementChildren = (routerView.node.children ?? []).filter((node) => node.type === 1)
    const hostElementChildren = (routeHost.node.children ?? []).filter((node) => node.type === 1)
    const primaryRouteNodes = [
      ...routedComponent.ancestors.filter((node) => node.type === 1),
      routedComponent.node,
    ]
    const forbiddenWrapperTags = new Set(['KeepAlive', 'Suspense', 'Transition', 'TransitionGroup'])
    const routeSlotExpressions = templateDirectives(routerView.node, 'slot').map((directive) =>
      normalizeTemplateExpression(directive.exp?.content),
    )
    const componentContract = {
      breadcrumb: boundTemplateExpression(routedComponent.node, 'breadcrumb'),
      is: boundTemplateExpression(routedComponent.node, 'is'),
      message: boundTemplateExpression(routedComponent.node, 'message'),
      title: boundTemplateExpression(routedComponent.node, 'title'),
    }

    if (
      !routeHost.ancestors.includes(routerView.node) ||
      !routedComponent.ancestors.includes(routeHost.node) ||
      routerElementChildren.length !== 1 ||
      routerElementChildren[0] !== routeHost.node ||
      hostElementChildren.length !== 1 ||
      hostElementChildren[0] !== routedComponent.node ||
      !isDeepStrictEqual(routeSlotExpressions, ['{ Component }']) ||
      !isDeepStrictEqual(componentContract, {
        breadcrumb: 'presentation.breadcrumb',
        is: 'Component',
        message: 'presentation.message',
        title: 'presentation.title',
      })
    ) {
      violations.push('PAVP_RUNTIME_005_ROUTE_COMPONENT_CONTRACT')
    }
    if (primaryRouteNodes.some((node) => forbiddenWrapperTags.has(node.tag ?? ''))) {
      violations.push('PAVP_RUNTIME_005_REMOUNT_WRAPPER')
    }
    if (
      primaryRouteNodes.some(
        (node) => node !== routeHost.node && node !== routedComponent.node && hasTemplateKey(node),
      )
    ) {
      violations.push('PAVP_RUNTIME_005_REMOUNT_WRAPPER')
    }
    if (primaryRouteNodes.some(hasRouteConditional)) {
      violations.push('PAVP_RUNTIME_005_ROUTE_CONDITIONAL')
    }
  } else {
    violations.push('PAVP_RUNTIME_005_ROUTE_COMPONENT_CONTRACT')
  }

  const appStyleRules = cssRuleBlocks(snapshot.appStylesSource)
  const hostOpacityValues = selectorDeclarationValues(
    appStyleRules,
    '.pavp-route-content',
    'opacity',
  )
  if (hostOpacityValues.length === 0 || hostOpacityValues.some((value) => value !== '1')) {
    violations.push('PAVP_RUNTIME_005_ROUTE_HOST_VISIBILITY')
  }

  for (const rule of appStyleRules) {
    const selectors = rule.selector.split(',')
    const targetsHost = selectors.some((selector) =>
      selectorTargetsPersistentOwner(selector, '.pavp-route-content'),
    )
    const targetsDirectChild = selectors.some((selector) =>
      selectorTargetsPersistentOwner(selector, '.pavp-route-content > *'),
    )
    if (!targetsHost && !targetsDirectChild) {
      continue
    }

    const properties = cssDeclarationNames(rule.declarations)
    const hasMotionProperty = properties.some((property) =>
      /^(?:animation|transition)(?:-|$)/u.test(property),
    )
    const hasDelay = properties.some((property) =>
      /^(?:animation|transition)-delay$/u.test(property),
    )
    const opacityValues = [
      ...rule.declarations.matchAll(/(?:^|;)\s*opacity\s*:\s*([^;]+)/gimu),
    ].map((match) => (match[1] ?? '').trim())
    const concealsContent =
      opacityValues.some((value) => value !== '1') ||
      /\bvisibility\s*:\s*(?:hidden|collapse)\b/iu.test(rule.declarations) ||
      /\bdisplay\s*:\s*none\b/iu.test(rule.declarations) ||
      /\bcontent-visibility\s*:\s*hidden\b/iu.test(rule.declarations)
    const geometryValues = [
      ...rule.declarations.matchAll(
        /(?:^|;)\s*(?:transform|translate|scale|rotate)\s*:\s*([^;]+)/gimu,
      ),
    ].map((match) => (match[1] ?? '').trim())
    const changesGeometry =
      geometryValues.some((value) => value !== 'none') ||
      /\b(?:clip|clip-path|filter|backdrop-filter|mask|mask-image)\s*:/iu.test(rule.declarations)

    if (targetsDirectChild && hasDelay) {
      violations.push('PAVP_RUNTIME_005_DIRECT_CHILD_DELAY')
    }
    if (targetsHost && hasMotionProperty) {
      violations.push('PAVP_RUNTIME_005_ROUTE_HOST_MOTION')
    }
    if (targetsDirectChild && hasMotionProperty) {
      violations.push('PAVP_RUNTIME_005_DIRECT_CHILD_MOTION')
    }
    if (targetsHost && (concealsContent || changesGeometry)) {
      violations.push('PAVP_RUNTIME_005_ROUTE_HOST_VISIBILITY')
    }
    if (targetsDirectChild && concealsContent) {
      violations.push('PAVP_RUNTIME_005_DIRECT_CHILD_MOTION')
    }
    if (rule.selector.includes('data-motion')) {
      violations.push('PAVP_RUNTIME_005_MOTION_BRANCH')
    }
  }

  if (
    snapshot.appStylesSource.includes('@keyframes pavp-route-content-enter') ||
    snapshot.appStylesSource.includes('@keyframes pavp-layered-content-enter')
  ) {
    violations.push('PAVP_RUNTIME_005_ROUTE_HOST_MOTION')
  }

  const pageStyleRules = cssRuleBlocks(styleContent(snapshot.pageVisualSource))
  if (
    pageStyleRules.some(
      (rule) =>
        rule.selector
          .split(',')
          .some(
            (selector) =>
              selectorTargetsPersistentOwner(selector, '.pavp-route-content') ||
              selectorTargetsPersistentOwner(selector, '.pavp-route-content > *'),
          ) &&
        (/\b(?:animation|transition)(?:-[a-z-]+)?\s*:/iu.test(rule.declarations) ||
          /\bopacity\s*:\s*0\b/iu.test(rule.declarations)),
    )
  ) {
    violations.push('PAVP_RUNTIME_005_PAGE_RECREATION')
  }

  return [...new Set(violations)]
}

function motionGeometryViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = []
  const appStyleRules = cssRuleBlocks(snapshot.appStylesSource)
  const shellStyle = styleContent(snapshot.shellSource)
  const appearanceStyle = styleContent(snapshot.appearancePageSource)
  const allMotionStyle = [
    snapshot.appStylesSource,
    shellStyle,
    appearanceStyle,
    styleContent(snapshot.naiveProviderSource),
  ].join('\n')
  const allGeometryRules = cssRuleBlocks(
    [snapshot.appStylesSource, shellStyle, appearanceStyle].join('\n'),
  )
  const persistentOwnerSelectors = [
    'html',
    'body',
    '#app',
    '#pavp-overlay-root',
    '.pavp-route-content',
    '.pavp-route-content > *',
    '.pavp-admin-shell',
    '.pavp-admin-shell__header',
    '.pavp-admin-shell__sidebar',
    '.pavp-admin-shell__content',
    '.pavp-appearance-workspace',
    '.pavp-appearance-preview-column',
  ] as const

  if (
    persistentOwnerSelectors.some(
      (owner) =>
        !appStyleRules.some(
          (rule) =>
            rule.selector
              .split(',')
              .some((selector) => selectorTargetsPersistentOwner(selector, owner)) &&
            /\btransform\s*:\s*none\s*;/u.test(rule.declarations) &&
            /\btranslate\s*:\s*none\s*;/u.test(rule.declarations),
        ),
    )
  ) {
    violations.push('PERSISTENT_OWNER_BASE_GEOMETRY')
  }

  for (const rule of allGeometryRules) {
    const selectors = rule.selector.split(',')
    if (
      !selectors.some((selector) =>
        persistentOwnerSelectors.some((owner) => selectorTargetsPersistentOwner(selector, owner)),
      )
    ) {
      continue
    }

    const geometryValues = [
      ...rule.declarations.matchAll(/(?:^|;)\s*(transform|translate)\s*:\s*([^;]+)/gimu),
    ]
    const nonNoneGeometryValues = geometryValues
      .map((match) => (match[2] ?? '').trim())
      .filter((value) => value !== 'none')
    if (nonNoneGeometryValues.length > 0) {
      violations.push('PERSISTENT_OWNER_TRANSFORM')
    }
    const targetsRouteOwner = selectors.some(
      (selector) =>
        selectorTargetsPersistentOwner(selector, '.pavp-route-content') ||
        selectorTargetsPersistentOwner(selector, '.pavp-route-content > *'),
    )
    if (
      targetsRouteOwner &&
      nonNoneGeometryValues.some((value) => /translateX\s*\(/u.test(value))
    ) {
      violations.push('ROUTE_HORIZONTAL_TRANSFORM')
    }
    if (
      targetsRouteOwner &&
      nonNoneGeometryValues.some((value) =>
        /(?:translate[XY]?\s*\(\s*0(?:[a-z%]+)?\s*\)|scale(?:[XY])?\s*\(\s*1\s*\))/iu.test(value),
      )
    ) {
      violations.push('PERSISTENT_IDENTITY_TRANSFORM')
    }
  }

  const persistentRouteRules = appStyleRules.filter((rule) =>
    rule.selector.includes('.pavp-route-content'),
  )
  if (
    persistentRouteRules.some(
      (rule) =>
        /\banimation-fill-mode\s*:\s*(?:both|forwards)\b/iu.test(rule.declarations) ||
        /\banimation\s*:[^;]*\b(?:both|forwards)\b/iu.test(rule.declarations),
    )
  ) {
    violations.push('ROUTE_PERSISTENT_FILL_MODE')
  }

  if (
    persistentRouteRules.some(
      (rule) =>
        rule.selector.includes("data-motion='none'") &&
        (/\banimation\s*:\s*(?!none\b)[^;]+/iu.test(rule.declarations) ||
          /\btransition\s*:\s*(?!none\b)[^;]+/iu.test(rule.declarations)),
    )
  ) {
    violations.push('NONE_ROUTE_ANIMATION')
  }

  const motionRules = cssRuleBlocks(allMotionStyle).filter((rule) =>
    rule.selector.includes('data-motion'),
  )
  for (const rule of motionRules) {
    const properties = cssDeclarationNames(rule.declarations)
    if (properties.some((property) => /^(?:margin|padding)(?:-|$)/u.test(property))) {
      violations.push('MOTION_LAYOUT_SPACING')
    }
    if (properties.some((property) => /^(?:grid|grid-template)(?:-|$)/u.test(property))) {
      violations.push('MOTION_GRID_GEOMETRY')
    }
    if (
      properties.some((property) =>
        /^(?:(?:min-|max-)?(?:block-size|inline-size|width|height)|gap$|row-gap$|column-gap$|flex(?:-|$)|align(?:-|$)|justify(?:-|$)|place(?:-|$)|inset(?:-|$)|left$|right$|top$|bottom$|position$|overflow(?:-|$)|overscroll(?:-|$)|scroll(?:-|$)|container(?:-|$)|contain$|content-visibility$|columns$|column(?:-|$)|float$|clear$)/u.test(
          property,
        ),
      )
    ) {
      violations.push('MOTION_GEOMETRY_PROPERTY')
    }
  }

  const shellTags = [
    /<UiProvider\b[\s\S]*?>/u.exec(snapshot.appTemplateSource)?.[0] ?? '',
    /<ConsoleRouteFrame\b[\s\S]*?>/u.exec(snapshot.appTemplateSource)?.[0] ?? '',
    /<UiAdminShell\b[\s\S]*?>/u.exec(snapshot.consoleFrameSource)?.[0] ?? '',
  ]
  if (shellTags.some((tag) => /(?:^|\s)(?::key|v-bind:key)\s*=/u.test(tag))) {
    violations.push('MOTION_SHELL_REMOUNT')
  }

  const routeContentTag = /<div\b(?=[^>]*class="pavp-route-content")[^>]*>/u.exec(
    snapshot.appTemplateSource,
  )?.[0]
  if (
    routeContentTag === undefined ||
    /(?:^|\s)(?::key|v-bind:key|key)\s*=/u.test(routeContentTag)
  ) {
    violations.push('MOTION_ROUTE_REMOUNT')
  }

  const appearanceWorkspaceTag = /<[^>]*\bclass="pavp-appearance-workspace"[^>]*>/u.exec(
    snapshot.appearancePageSource,
  )?.[0]
  if (
    appearanceWorkspaceTag === undefined ||
    /(?:^|\s)(?::key|v-bind:key)\s*=/u.test(appearanceWorkspaceTag)
  ) {
    violations.push('MOTION_APPEARANCE_REMOUNT')
  }

  const appearancePreviewColumnTag = /<[^>]*\bclass="pavp-appearance-preview-column"[^>]*>/u.exec(
    snapshot.appearancePageSource,
  )?.[0]
  if (
    appearancePreviewColumnTag === undefined ||
    /(?:^|\s)(?::key|v-bind:key)\s*=/u.test(appearancePreviewColumnTag)
  ) {
    violations.push('MOTION_APPEARANCE_REMOUNT')
  }

  const appearanceMotionOwnerSource = `${scriptContent(snapshot.appearancePageSource)}\n${snapshot.appearanceMutationSource}`
  if (
    /\buseRouter\b|\brouter\.(?:push|replace|go|back|forward)\s*\(|\bhistory\.(?:pushState|replaceState|go|back|forward)\s*\(|\blocation\.(?:assign|replace)\s*\(|\blocation\.(?:href|hash)\s*=/u.test(
      appearanceMotionOwnerSource,
    )
  ) {
    violations.push('MOTION_ROUTER_NAVIGATION')
  }
  if (
    /\b(?:scrollLeft|scrollTop)\s*=|\.scroll(?:To|By|IntoView)\s*\(/u.test(
      appearanceMotionOwnerSource,
    )
  ) {
    violations.push('MOTION_SCROLL_WRITE')
  }
  if (
    /\.dataset\.layoutProfile\s*=|\.setAttribute\(\s*['"]data-layout-profile['"]|\.layoutProfile\s*=/u.test(
      appearanceMotionOwnerSource,
    )
  ) {
    violations.push('MOTION_LAYOUT_PROFILE_WRITE')
  }

  const motionReplayKeys = [
    ...snapshot.appearancePageSource.matchAll(/:key="([^"]*motionSequence[^"]*)"/gu),
  ].map((match) => match[1])
  const updateMotionBody = balancedBlock(snapshot.appearancePageSource, 'function updateMotion')
  if (
    !isDeepStrictEqual(motionReplayKeys, [
      '`navigation-${previewView}-${String(motionSequence)}`',
      '`content-${String(motionSequence)}`',
      '`motion-${String(motionSequence)}`',
    ]) ||
    updateMotionBody === undefined ||
    updateMotionBody.includes('motionSequence') ||
    !snapshot.appearancePageSource
      .replaceAll(/\s+/gu, ' ')
      .includes('function replayMotion(): void { motionSequence.value += 1 }')
  ) {
    violations.push('MOTION_REPLAY_SCOPE')
  }

  if (
    !snapshot.shellSource.includes('.pavp-admin-shell__navigation-action::after') ||
    !snapshot.shellSource.includes(
      'transform: translateX(calc(var(--ui-layout-admin-drawer-maximum-inline-size) * -1));',
    ) ||
    !snapshot.appearancePageSource.includes('@keyframes pavp-appearance-indicator-enter') ||
    !snapshot.appearancePageSource.includes('@keyframes pavp-appearance-content-enter')
  ) {
    violations.push('LOCAL_MOTION_CONTRACT')
  }

  if (snapshot.generatedTokensCssSource !== snapshot.expectedTokensCssSource) {
    violations.push('GENERATED_TOKENS_CSS_DRIFT')
  }

  return [...new Set(violations)]
}

function runMotionGeometryNegativeProbes(
  baseline: MaterialGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const probes: readonly [string, string, Partial<MaterialGateSnapshot>][] = [
    [
      'route-horizontal-entry-transform-restored',
      'ROUTE_HORIZONTAL_TRANSFORM',
      {
        appStylesSource: `${baseline.appStylesSource}\n.pavp-route-content { transform: translateX(var(--ui-space-content-gap)); }\n`,
      },
    ],
    [
      'route-persistent-fill-mode-both-restored',
      'ROUTE_PERSISTENT_FILL_MODE',
      {
        appStylesSource: `${baseline.appStylesSource}\n.pavp-route-content { animation-fill-mode: both; }\n`,
      },
    ],
    [
      'route-settled-identity-transform-restored',
      'PERSISTENT_IDENTITY_TRANSFORM',
      {
        appStylesSource: `${baseline.appStylesSource}\n.pavp-route-content { transform: translateX(0); }\n`,
      },
    ],
    [
      'motion-specific-content-padding-added',
      'MOTION_LAYOUT_SPACING',
      {
        appStylesSource: `${baseline.appStylesSource}\nhtml[data-motion='reduced'] .pavp-route-content { padding-inline: var(--ui-space-content-gap); }\n`,
      },
    ],
    [
      'motion-specific-grid-template-added',
      'MOTION_GRID_GEOMETRY',
      {
        appStylesSource: `${baseline.appStylesSource}\nhtml[data-motion='reduced'] .pavp-route-content { grid-template-columns: 1fr; }\n`,
      },
    ],
    [
      'motion-state-keys-admin-shell',
      'MOTION_SHELL_REMOUNT',
      {
        consoleFrameSource: baseline.consoleFrameSource.replace(
          '<UiAdminShell\n',
          '<UiAdminShell\n    :key="document.documentElement.dataset.motion"\n',
        ),
      },
    ],
    [
      'motion-state-keys-appearance-workspace',
      'MOTION_APPEARANCE_REMOUNT',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          '<div class="pavp-appearance-workspace">',
          '<div :key="effective.snapshot.value.motion" class="pavp-appearance-workspace">',
        ),
      },
    ],
    [
      'motion-mutation-writes-scroll-left',
      'MOTION_SCROLL_WRITE',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          'function updateMotion(value: string): void {',
          'function updateMotion(value: string): void {\n  document.documentElement.scrollLeft = 0',
        ),
      },
    ],
    [
      'sticky-preview-owner-transform-added',
      'PERSISTENT_OWNER_TRANSFORM',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          '</style>',
          '.pavp-appearance-preview-column { transform: translateX(0); }\n</style>',
        ),
      },
    ],
    [
      'motion-specific-route-inline-size-added',
      'MOTION_GEOMETRY_PROPERTY',
      {
        appStylesSource: `${baseline.appStylesSource}\nhtml[data-motion='reduced'] .pavp-route-content { inline-size: var(--ui-layout-admin-content-minimum-inline-size); }\n`,
      },
    ],
    [
      'route-animation-left-active-under-none',
      'NONE_ROUTE_ANIMATION',
      {
        appStylesSource: `${baseline.appStylesSource}\nhtml[data-motion='none'] .pavp-route-content { animation: pavp-probe var(--ui-motion-duration) var(--ui-motion-easing); }\n`,
      },
    ],
    [
      'generated-tokens-css-manual-drift',
      'GENERATED_TOKENS_CSS_DRIFT',
      { generatedTokensCssSource: `${baseline.generatedTokensCssSource}\n/* manual drift */\n` },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, change]) => {
      const mutatedSnapshot = modifiedSnapshot(baseline, change)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          motionGeometryViolations(mutatedSnapshot).includes(expectedFailureCode),
      })
    }),
  )
}

function runRuntime005NegativeProbes(
  baseline: MaterialGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const routedComponentBlock = `          <component
            :is="Component"
            :breadcrumb="presentation.breadcrumb"
            :message="presentation.message"
            :title="presentation.title"
          />`
  const transitionWrappedComponentBlock = `          <Transition mode="out-in">
            <component
              :is="Component"
              :breadcrumb="presentation.breadcrumb"
              :message="presentation.message"
              :title="presentation.title"
            />
          </Transition>`
  const probes: readonly [string, string, Partial<MaterialGateSnapshot>][] = [
    [
      'runtime-005-route-host-key-restored',
      'PAVP_RUNTIME_005_ROUTE_HOST_KEY',
      {
        appTemplateSource: baseline.appTemplateSource.replace(
          '<div class="pavp-route-content">',
          '<div :key="routeRecord.name" class="pavp-route-content">',
        ),
      },
    ],
    [
      'runtime-005-routed-component-key-added',
      'PAVP_RUNTIME_005_COMPONENT_KEY',
      {
        appTemplateSource: baseline.appTemplateSource.replace(
          '          <component\n',
          '          <component\n            :key="routeRecord.name"\n',
        ),
      },
    ],
    [
      'runtime-005-route-host-opacity-entry-restored',
      'PAVP_RUNTIME_005_ROUTE_HOST_MOTION',
      {
        appStylesSource: `${baseline.appStylesSource}\n.pavp-route-content { animation: pavp-runtime-005-host-entry var(--ui-motion-duration) var(--ui-motion-easing); }\n@keyframes pavp-runtime-005-host-entry { from { opacity: 0; } to { opacity: 1; } }\n`,
      },
    ],
    [
      'runtime-005-direct-child-opacity-entry-restored',
      'PAVP_RUNTIME_005_DIRECT_CHILD_MOTION',
      {
        appStylesSource: `${baseline.appStylesSource}\n.pavp-route-content > * { animation: pavp-runtime-005-child-entry var(--ui-motion-duration) var(--ui-motion-easing); }\n@keyframes pavp-runtime-005-child-entry { from { opacity: 0; } to { opacity: 1; } }\n`,
      },
    ],
    [
      'runtime-005-direct-child-delay-restored',
      'PAVP_RUNTIME_005_DIRECT_CHILD_DELAY',
      {
        appStylesSource: `${baseline.appStylesSource}\n.pavp-route-content > :nth-child(2) { animation-delay: calc(var(--ui-motion-duration) / 2); }\n`,
      },
    ],
    [
      'runtime-005-transition-out-in-added',
      'PAVP_RUNTIME_005_REMOUNT_WRAPPER',
      {
        appTemplateSource: baseline.appTemplateSource.replace(
          routedComponentBlock,
          transitionWrappedComponentBlock,
        ),
      },
    ],
    [
      'runtime-005-route-level-v-if-added',
      'PAVP_RUNTIME_005_ROUTE_CONDITIONAL',
      {
        appTemplateSource: baseline.appTemplateSource.replace(
          '<div class="pavp-route-content">',
          '<div v-if="Component" class="pavp-route-content">',
        ),
      },
    ],
    [
      'runtime-005-route-host-hidden',
      'PAVP_RUNTIME_005_ROUTE_HOST_VISIBILITY',
      {
        appStylesSource: `${baseline.appStylesSource}\n.pavp-route-content { visibility: hidden; }\n`,
      },
    ],
    [
      'runtime-005-motion-host-opacity-branch',
      'PAVP_RUNTIME_005_MOTION_BRANCH',
      {
        appStylesSource: `${baseline.appStylesSource}\nhtml[data-motion='reduced'] .pavp-route-content { opacity: 0; }\n`,
      },
    ],
    [
      'runtime-005-product-page-full-page-entry-restored',
      'PAVP_RUNTIME_005_PAGE_RECREATION',
      {
        pageVisualSource: `${baseline.pageVisualSource}\n<style>\n:global(.pavp-route-content) { animation: pavp-runtime-005-page-entry var(--ui-motion-duration) var(--ui-motion-easing); }\n@keyframes pavp-runtime-005-page-entry { from { opacity: 0; } to { opacity: 1; } }\n</style>\n`,
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, change]) => {
      const mutatedSnapshot = modifiedSnapshot(baseline, change)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          runtime005RouteContentViolations(mutatedSnapshot).includes(expectedFailureCode),
      })
    }),
  )
}

function runArchitectureAdminConsoleNegativeProbes(
  baseline: MaterialGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const probes: readonly [string, string, Partial<MaterialGateSnapshot>][] = [
    [
      'direct-naive-app-import',
      'DIRECT_NAIVE_IMPORT',
      {
        applicationImportSource: `${baseline.applicationImportSource}\nimport { NButton } from 'naive-ui'`,
      },
    ],
    [
      'reintroduced-reka',
      'ACTIVE_REKA',
      { manifestAndLockSource: `${baseline.manifestAndLockSource}\n"reka-ui": "2.10.3"` },
    ],
    [
      'second-styled-framework',
      'SECOND_STYLED_FRAMEWORK',
      { manifestAndLockSource: `${baseline.manifestAndLockSource}\n"element-plus": "2.11.0"` },
    ],
    [
      'missing-naive-override',
      'MISSING_NAIVE_OVERRIDE',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '  Button: {',
          '  MissingButton: {',
        ),
      },
    ],
    [
      'naive-radio-hover-shadow-removed',
      'NAIVE_RADIO_HOVER_SHADOW',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      buttonBoxShadowHover: shadowControlHover,\n',
          '',
        ),
      },
    ],
    [
      'naive-radio-unused-hover-key-restored',
      'NAIVE_RADIO_HOVER_SHADOW',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      buttonBoxShadowHover: shadowControlHover,',
          '      buttonBorderColorHover: colorAction,',
        ),
      },
    ],
    [
      'naive-radio-focus-uses-material-shadow',
      'NAIVE_FOCUS_SEMANTIC',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      buttonBoxShadowFocus: shadowFocusRing,',
          '      buttonBoxShadowFocus: material.shadow,',
        ),
      },
    ],
    [
      'naive-focus-provider-ring-removed',
      'NAIVE_FOCUS_PRESENTATION',
      {
        naiveProviderSource: baseline.naiveProviderSource.replace(
          '  box-shadow: var(--ui-admin-shadow-focus-ring);\n',
          '',
        ),
      },
    ],
    [
      'naive-radio-visible-vendor-default',
      'NAIVE_VISIBLE_VENDOR_DEFAULT',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      buttonTextColorHover: colorControl,',
          '      buttonTextColorHover: radioDark.self.buttonTextColorHover,',
        ),
      },
    ],
    [
      'naive-control-hover-restored-to-action-fill',
      'NAIVE_OVERRIDE_SEMANTIC_ROLE',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      buttonTextColorHover: colorControl,',
          '      buttonTextColorHover: colorAction,',
        ),
      },
    ],
    [
      'naive-button-primary-border-removed',
      'NAIVE_BUTTON_PRIMARY_BORDER',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      borderPrimary: borderAction,\n',
          '',
        ),
      },
    ],
    [
      'naive-button-primary-disabled-removed',
      'NAIVE_BUTTON_PRIMARY_DISABLED',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      colorDisabledPrimary: colorAction,\n',
          '',
        ),
      },
    ],
    [
      'naive-tag-border-color-only',
      'NAIVE_TAG_BORDER_KIND',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      border: borderControl,\n      textColor: colorText,\n      colorBordered: material.chrome,',
          '      border: colorBorder,\n      textColor: colorText,\n      colorBordered: material.chrome,',
        ),
      },
    ],
    [
      'naive-common-parser-sensitive-token-alias',
      'NAIVE_COMMON_PARSER_INPUT',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '  common: {',
          "  common: {\n    primaryColor: 'var(--ui-color-action-primary)',",
        ),
      },
    ],
    [
      'naive-component-local-override',
      'NAIVE_OVERRIDE_OUTSIDE_PRIVATE_ADAPTER',
      {
        nonAdapterUiSource: `${baseline.nonAdapterUiSource}\n.n-radio-button { color: inherit; }`,
      },
    ],
    [
      'naive-raw-border-composite',
      'NAIVE_RAW_VISUAL_AUTHORITY',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '      borderPrimary: borderAction,',
          "      borderPrimary: '1px solid var(--ui-color-action-primary)',",
        ),
      },
    ],
    [
      'raw-color-or-optical',
      'RAW_VISUAL_AUTHORITY',
      { pageVisualSource: `${baseline.pageVisualSource}\n.probe { color: #fff; }` },
    ],
    [
      'raw-breakpoint-or-shell-size',
      'RAW_LAYOUT_AUTHORITY',
      { pageVisualSource: `${baseline.pageVisualSource}\n@container (min-width: 48rem) {}` },
    ],
    [
      'second-router-outlet',
      'ROUTER_OUTLET_COUNT',
      { appTemplateSource: `${baseline.appTemplateSource}\n<RouterView />` },
    ],
    ['eighteenth-route', 'ROUTE_COUNT', { routeCount: 18 }],
    ['page-safe-projection-bypass', 'PAGE_FACT_BOUNDARY', { factImportViolation: true }],
    [
      'direct-page-local-storage',
      'DIRECT_PAGE_STORAGE',
      { pageStorageSource: `${baseline.pageStorageSource}\nlocalStorage.getItem('probe')` },
    ],
    [
      'duplicate-appearance-resolver',
      'DUPLICATE_APPEARANCE_ENVIRONMENT',
      {
        competingAppearanceEnvironmentSource: `${baseline.competingAppearanceEnvironmentSource}\nmatchMedia('(prefers-color-scheme: dark)')`,
      },
    ],
    [
      'inactive-api-auth-control',
      'INACTIVE_CAPABILITY_CONTROL',
      {
        capabilityPageTemplateSource: `${baseline.capabilityPageTemplateSource}\n<UiButton>API 设置</UiButton>`,
      },
    ],
    [
      'manual-generated-manifest-edit',
      'GENERATED_MANIFEST_DRIFT',
      { generatedManifestsEqual: false },
    ],
    [
      'public-ui-absent-registry',
      'PUBLIC_UI_UNREGISTERED',
      { publicComponentExports: [...baseline.publicComponentExports, 'UiProbe'] },
    ],
    [
      'unused-public-ui',
      'PUBLIC_UI_UNUSED',
      {
        publicComponentExports: [...baseline.publicComponentExports, 'UiProbe'],
        registeredPublicComponents: [
          ...baseline.registeredPublicComponents,
          { exportName: 'UiProbe', consumerCount: 0 },
        ],
      },
    ],
    [
      'visible-layout-profile-debug-text',
      'PROFILE_DEBUG_TEXT',
      { shellSource: `${baseline.shellSource}\n<span>{{ profile }}</span>` },
    ],
    [
      'admin-workspace-reading-width',
      'ADMIN_WORKSPACE_MAX_WIDTH',
      { shellSource: `${baseline.shellSource}\n<div class="max-w-content" />` },
    ],
    [
      'single-character-sidebar-glyph',
      'SIDEBAR_ICON_CONTRACT',
      { routeRegistrySource: `${baseline.routeRegistrySource}\nglyph: '总'` },
    ],
    [
      'admin-alias-adaptive-pin',
      'ADMIN_ADAPTIVE_PIN',
      {
        adminTokenSource: `${baseline.adminTokenSource}\n"$value": "{material.chrome.adaptive.background}"`,
      },
    ],
    [
      'missing-reduced-material-branch',
      'MATERIAL_BRANCH_INCOMPLETE',
      {
        shellSource: baseline.shellSource.replaceAll(
          "data-material='reduced'",
          "data-material='adaptive'",
        ),
      },
    ],
    [
      'missing-solid-material-branch',
      'MATERIAL_BRANCH_INCOMPLETE',
      {
        shellSource: baseline.shellSource.replaceAll(
          "data-material='solid'",
          "data-material='adaptive'",
        ),
      },
    ],
    [
      'scoped-grouped-partial-global-state-selector-restored',
      'SHELL_COMPILED_ROOT_STATE_DECLARATION',
      {
        shellSource: baseline.shellSource.replace(
          '</style>',
          `:global(html[data-motion='reduced']) .pavp-admin-shell__sidebar,
:global(html[data-motion='reduced']) .pavp-admin-shell__action {
  transform: translateX(var(--ui-space-content-gap));
}
</style>`,
        ),
      },
    ],
    [
      'compiled-root-only-reduced-motion-transform',
      'SHELL_COMPILED_ROOT_STATE_DECLARATION',
      {
        shellSource: baseline.shellSource.replace(
          /\n<\/style>\s*$/u,
          "\nhtml[data-motion='reduced'] { transform: translateX(var(--ui-space-content-gap)); }\n</style>\n",
        ),
      },
    ],
    [
      'compiled-root-only-none-transition',
      'SHELL_COMPILED_ROOT_STATE_DECLARATION',
      {
        shellSource: baseline.shellSource.replace(
          /\n<\/style>\s*$/u,
          "\nhtml[data-motion='none'] { transition: transform var(--ui-motion-duration); }\n</style>\n",
        ),
      },
    ],
    [
      'compiled-root-only-adaptive-backdrop',
      'SHELL_COMPILED_ROOT_STATE_DECLARATION',
      {
        shellSource: baseline.shellSource.replace(
          /\n<\/style>\s*$/u,
          "\nhtml[data-material='adaptive'] { backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur)); }\n</style>\n",
        ),
      },
    ],
    [
      'unscoped-state-selector-loses-shell-namespace',
      'SHELL_STATE_SELECTOR_NAMESPACE',
      {
        shellSource: baseline.shellSource.replace(
          "html[data-material='adaptive'] .pavp-admin-shell__header,",
          "html[data-material='adaptive'] .probe-header,",
        ),
      },
    ],
    [
      'adaptive-header-target-removed',
      'MATERIAL_ADAPTIVE_TARGETS',
      {
        shellSource: baseline.shellSource.replace(
          "html[data-material='adaptive'] .pavp-admin-shell__header,",
          "html[data-material='probe-adaptive'] .pavp-admin-shell__header,",
        ),
      },
    ],
    [
      'reduced-drawer-shadow-removal-target-removed',
      'MATERIAL_REDUCED_SHADOW_TARGETS',
      {
        shellSource: replaceLastOccurrence(
          baseline.shellSource,
          "html[data-material='reduced'] .pavp-admin-shell__drawer-navigation,",
          "html[data-material='probe-reduced'] .pavp-admin-shell__drawer-navigation,",
        ),
      },
    ],
    [
      'motion-none-drawer-transition-target-removed',
      'MOTION_NONE_TARGETS',
      {
        shellSource: baseline.shellSource.replace(
          "html[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active\n  .pavp-admin-shell__drawer-navigation,",
          "html[data-motion='probe-none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active\n  .pavp-admin-shell__drawer-navigation,",
        ),
      },
    ],
    [
      'naive-transition-active-under-none',
      'NAIVE_MOTION_NONE_INCOMPLETE',
      {
        naiveProviderSource: baseline.naiveProviderSource.replaceAll(
          'transition: none !important;',
          'transition-duration: var(--ui-motion-duration) !important;',
        ),
      },
    ],
    [
      'vendor-selector-in-page',
      'VENDOR_SELECTOR_IN_PAGE',
      { pageVisualSource: `${baseline.pageVisualSource}\n.n-button {}` },
    ],
    [
      'english-error-title',
      'ENGLISH_ERROR_TITLE',
      {
        routeRegistrySource: `${baseline.routeRegistrySource}\n'route-title.error-probe': 'Bad Request',`,
      },
    ],
    [
      'active-navigation-emits',
      'ACTIVE_NAVIGATION_ITEM_NOOP',
      {
        shellSource: baseline.shellSource.replace(
          /if\s*\(routeName\s*===\s*props\.activeRouteName\)\s*\{\s*return\s*\}/u,
          '',
        ),
      },
    ],
    [
      'active-navigation-loses-accessibility',
      'ACTIVE_NAVIGATION_ITEM_ACCESSIBILITY',
      {
        shellSource: baseline.shellSource.replaceAll(
          ':aria-current="item.routeName === activeRouteName ? \'page\' : undefined"',
          ':disabled="item.routeName === activeRouteName"',
        ),
      },
    ],
    [
      'appearance-old-flat-form-only',
      'OLD_FLAT_APPEARANCE',
      {
        appearancePageSource: `${baseline.appearancePageSource}\n<div class="pavp-appearance-grid" />`,
      },
    ],
    [
      'appearance-hardcoded-theme-swatch',
      'HARDCODED_THEME_SWATCH',
      {
        appearancePageSource: `${baseline.appearancePageSource}\n.probe { --pavp-appearance-swatch: #fff; }`,
      },
    ],
    [
      'appearance-density-control',
      'DENSITY_CONTROL',
      {
        appearancePageSource: `${baseline.appearancePageSource}\n<div data-appearance-axis="density" />`,
      },
    ],
    [
      'appearance-direct-store-import',
      'DIRECT_APPEARANCE_STORE',
      {
        appearancePageSource: `${baseline.appearancePageSource}\nimport { useAppearanceStore } from '../app/appearance/appearance.store'`,
      },
    ],
    [
      'appearance-direct-local-storage',
      'DIRECT_PAGE_STORAGE',
      {
        appearancePageSource: `${baseline.appearancePageSource}\nlocalStorage.setItem('probe', 'probe')`,
      },
    ],
    [
      'appearance-second-ui-provider',
      'SECOND_UI_PROVIDER',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          '</template>',
          '<UiProvider /></template>',
        ),
      },
    ],
    [
      'appearance-fake-preview-without-effective-snapshot',
      'FAKE_APPEARANCE_PREVIEW',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          ':data-material-preview="effective.snapshot.value.material"',
          'data-material-preview="adaptive"',
        ),
      },
    ],
    [
      'appearance-material-consumer-removed',
      'MATERIAL_PREVIEW_CONSUMER',
      {
        appearancePageSource: baseline.appearancePageSource.replaceAll(
          '--ui-material-',
          '--ui-probe-',
        ),
      },
    ],
    [
      'appearance-motion-active-under-none',
      'MOTION_NONE_BRANCH',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          'animation: none;\n  transform: none;\n  transition: none;',
          'animation: pavp-appearance-content-enter var(--ui-motion-duration) var(--ui-motion-easing);\n  transform: none;\n  transition: none;',
        ),
      },
    ],
    [
      'appearance-replay-mutates-preference',
      'MOTION_REPLAY_MUTATES',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          'motionSequence.value += 1',
          'mutation.commitPreference({})',
        ),
      },
    ],
    [
      'appearance-repeated-feedback-does-not-replay',
      'FEEDBACK_REPLAY',
      {
        appearancePageSource: baseline.appearancePageSource.replace(':key="feedbackSequence"', ''),
      },
    ],
    [
      'appearance-direct-naive-import',
      'DIRECT_NAIVE_IMPORT',
      {
        appearancePageSource: `${baseline.appearancePageSource}\nimport { NButton } from 'naive-ui'`,
      },
    ],
    [
      'appearance-english-primary-label',
      'ENGLISH_PRIMARY_LABEL',
      {
        appearancePageSource: baseline.appearancePageSource.replace(
          '</template>',
          '<span>System</span></template>',
        ),
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, change]) =>
      Object.freeze({
        id,
        expectedFailureCode,
        passed: materialGateViolations(modifiedSnapshot(baseline, change)).includes(
          expectedFailureCode,
        ),
      }),
    ),
  )
}

function runRuntime002NegativeProbes(
  baseline: MaterialGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const pointerGuardCall = '      preserveCurrentPersistentNavigationFocus(event, routeName)\n'
  const drawerGuardSource = replaceLastOccurrence(
    baseline.shellSource,
    '                type="button"\n                @click="navigate(item.routeName)"',
    '                type="button"\n                @pointerdown="preserveCurrentPersistentNavigationFocus($event, item.routeName)"\n                @click="navigate(item.routeName)"',
  )
  const disabledCurrentSource = baseline.shellSource.replace(
    "    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,",
    "    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,\n    disabled: true,",
  )
  const keyboardRemovedSource = baseline.shellSource.replace(
    '      tabindex: 0,',
    '      tabindex: -1,',
  )
  const probes: readonly [string, string, string][] = [
    [
      'runtime-002-persistent-guard-removed',
      'PAVP_RUNTIME_002_PERSISTENT_MOUSEDOWN_BINDING',
      baseline.shellSource.replace(pointerGuardCall, ''),
    ],
    [
      'runtime-002-guard-applies-to-every-route',
      'PAVP_RUNTIME_002_DIFFERENT_ROUTE_DEFAULT',
      baseline.shellSource.replace(
        'event.button === 0 && routeName === props.activeRouteName',
        'event.button === 0 && true',
      ),
    ],
    [
      'runtime-002-primary-button-check-removed',
      'PAVP_RUNTIME_002_PRIMARY_CURRENT_GUARD',
      baseline.shellSource.replace('event.button === 0', 'true'),
    ],
    [
      'runtime-002-guard-attached-to-drawer',
      'PAVP_RUNTIME_002_DRAWER_GUARD_ABSENT',
      drawerGuardSource,
    ],
    [
      'runtime-002-blur-repair-restored',
      'PAVP_RUNTIME_002_PROHIBITED_REPAIR',
      baseline.shellSource.replace(
        'if (event.button === 0 && routeName === props.activeRouteName) {\n    event.preventDefault()\n  }',
        'if (event.button === 0 && routeName === props.activeRouteName) {\n    event.currentTarget?.blur()\n  }',
      ),
    ],
    [
      'runtime-002-delayed-focus-restore-restored',
      'PAVP_RUNTIME_002_PROHIBITED_REPAIR',
      baseline.shellSource.replace(
        'if (event.button === 0 && routeName === props.activeRouteName) {\n    event.preventDefault()\n  }',
        'if (event.button === 0 && routeName === props.activeRouteName) {\n    setTimeout(() => event.currentTarget?.focus())\n  }',
      ),
    ],
    ['runtime-002-current-item-disabled', 'PAVP_RUNTIME_002_NATIVE_BUTTON', disabledCurrentSource],
    [
      'runtime-002-aria-current-removed',
      'PAVP_RUNTIME_002_ARIA_CURRENT',
      baseline.shellSource.replace(
        "    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,\n",
        '',
      ),
    ],
    [
      'runtime-002-keyboard-focus-removed',
      'PAVP_RUNTIME_002_KEYBOARD_FOCUSABILITY',
      keyboardRemovedSource,
    ],
    [
      'runtime-002-current-route-noop-removed',
      'PAVP_RUNTIME_002_CURRENT_ROUTE_NOOP',
      baseline.shellSource.replace(
        /\n\s*if\s*\(routeName\s*===\s*props\.activeRouteName\)\s*\{\s*return\s*\}/u,
        '',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, shellSource]) =>
      Object.freeze({
        id,
        expectedFailureCode,
        passed:
          shellSource !== baseline.shellSource &&
          runtime002NavigationViolations(shellSource).includes(expectedFailureCode),
      }),
    ),
  )
}

function runRuntime003SourceNegativeProbes(
  baseline: MaterialGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const probes: readonly [string, string, string][] = [
    [
      'runtime-003-outer-overlay-restricted-to-drawer-width',
      'PAVP_RUNTIME_003_OUTER_VIEWPORT',
      baseline.shellSource.replace(
        '  inset-inline: 0;\n  background: var(--ui-color-scrim-viewport);',
        '  inline-size: min(100%, var(--ui-layout-admin-drawer-maximum-inline-size));\n  inset-inline: 0;\n  background: var(--ui-color-scrim-viewport);',
      ),
    ],
    [
      'runtime-003-complete-viewport-inset-removed',
      'PAVP_RUNTIME_003_OUTER_VIEWPORT',
      baseline.shellSource.replace('  inset-inline: 0;\n', ''),
    ],
    [
      'runtime-003-scrim-token-removed',
      'PAVP_RUNTIME_003_SCRIM_TOKEN',
      baseline.shellSource.replace('  background: var(--ui-color-scrim-viewport);\n', ''),
    ],
    [
      'runtime-003-self-target-guard-removed',
      'PAVP_RUNTIME_003_SELF_TARGET_GUARD',
      baseline.shellSource.replace(' || event.target !== event.currentTarget', ''),
    ],
    [
      'runtime-003-primary-button-guard-removed',
      'PAVP_RUNTIME_003_PRIMARY_BUTTON_GUARD',
      baseline.shellSource.replace('event.button !== 0 || ', ''),
    ],
    [
      'runtime-003-document-pointer-listener-added',
      'PAVP_RUNTIME_003_GLOBAL_POINTER_LISTENER',
      baseline.shellSource.replace(
        '</script>',
        "document.addEventListener('pointerdown', handleDrawerScrimPointerDown)\n</script>",
      ),
    ],
    [
      'runtime-003-inner-panel-pointer-close-added',
      'PAVP_RUNTIME_003_INNER_POINTER_BOUNDARY',
      baseline.shellSource.replace(
        '            class="pavp-admin-shell__drawer-navigation"\n            role="dialog"',
        '            class="pavp-admin-shell__drawer-navigation"\n            role="dialog"\n            @pointerdown="handleDrawerScrimPointerDown($event)"',
      ),
    ],
    [
      'runtime-003-drawer-transform-moved-to-outer-overlay',
      'PAVP_RUNTIME_003_DRAWER_MOTION_TARGET',
      baseline.shellSource
        .replace(
          '.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation,',
          '.pavp-admin-drawer-enter-from,',
        )
        .replace(
          '.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation {',
          '.pavp-admin-drawer-leave-to {',
        ),
    ],
    [
      'runtime-003-inner-panel-aria-modal-removed',
      'PAVP_RUNTIME_003_DIALOG_SEMANTICS',
      baseline.shellSource.replace('            aria-modal="true"\n', ''),
    ],
    [
      'runtime-003-main-inert-removed',
      'PAVP_RUNTIME_003_MAIN_INERT',
      baseline.shellSource.replace(
        '        :inert="profile === \'narrow\' && navigationOpen"\n',
        '',
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, shellSource]) => {
      const failureCodes = runtime003SourceViolations(modifiedSnapshot(baseline, { shellSource }))

      return Object.freeze({
        id,
        expectedFailureCode,
        passed: shellSource !== baseline.shellSource && failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function navigationReworkSourceViolations(snapshot: NavigationReworkSourceSnapshot): string[] {
  const {
    applicationSource,
    layoutAdapterSource,
    menuAdapterSource,
    providerSource,
    runtimeContextSource,
    shellSource,
    themeSource,
  } = snapshot
  const layoutStart = shellSource.indexOf('<PavpLayoutPrimitive')
  const siderStart = shellSource.indexOf('<PavpLayoutSiderPrimitive')
  const siderEnd = shellSource.indexOf('</PavpLayoutSiderPrimitive>')
  const layoutEnd = shellSource.indexOf('</PavpLayoutPrimitive>')
  const normalNodeStart = shellSource.indexOf('const persistentNavigationNodeProps')
  const dropdownNodeStart = shellSource.indexOf('const persistentNavigationDropdownNodeProps')
  const dropdownPropsStart = shellSource.indexOf('const persistentNavigationDropdownProps')
  const normalNodeSource = shellSource.slice(normalNodeStart, dropdownNodeStart)
  const dropdownNodeSource = shellSource.slice(dropdownNodeStart, dropdownPropsStart)
  const vendorMotionSource = `${providerSource}\n${shellSource}`
  const expandedProjectionSemantics = adminNavigationExpandedProjectionSemantics(shellSource)
  const headerCollapseProjection = adminNavigationHeaderCollapseControlProjection(shellSource)
  const headerCollapseControl = headerCollapseProjection.control?.node
  const headerCollapseControlHasTargetGeometry =
    headerCollapseControl !== undefined &&
    hasStaticTemplateClass(headerCollapseControl, 'pavp-admin-shell__header-action') &&
    hasStaticTemplateClass(headerCollapseControl, 'min-h-target-enhanced') &&
    hasStaticTemplateClass(headerCollapseControl, 'min-w-target-enhanced')
  const occurrences = (source: string, value: string): number => source.split(value).length - 1
  const requiredMenuThemeFields = [
    'color: material.chrome',
    'groupTextColor: colorTextSecondary',
    'itemTextColor: colorText',
    'itemTextColorHover: colorControl',
    'itemTextColorActive: colorControl',
    'itemTextColorChildActive: colorControl',
    'itemIconColor: colorTextSecondary',
    'itemIconColorHover: colorControl',
    'itemIconColorActive: colorControl',
    'itemIconColorChildActive: colorControl',
    'itemIconColorCollapsed: colorTextSecondary',
    'arrowColor: colorTextSecondary',
    'arrowColorHover: colorControl',
    'arrowColorActive: colorControl',
    'arrowColorChildActive: colorControl',
    'itemColorHover: navigationHover',
    'itemColorActive: navigationSelectedSurface',
    'itemColorActiveHover: navigationSelectedSurface',
    'itemColorActiveCollapsed: navigationSelectedSurface',
    'itemHeight: enhancedTargetHeight',
    'borderRadius: radius',
    'fontSize',
    'dividerColor: colorBorder',
  ] as const
  const requiredDropdownThemeFields = [
    'color: materialOverlay',
    'optionTextColor: colorText',
    'prefixColor: colorTextSecondary',
    'suffixColor: colorTextSecondary',
    'optionTextColorHover: colorControl',
    'optionTextColorActive: colorControl',
    'optionColorHover: navigationHover',
    'optionColorActive: navigationSelectedSurface',
    'borderRadius: radius',
    'boxShadow: shadowOverlay',
  ] as const
  const themeOverrides = themeOverrideObject(themeSource)
  const layoutThemeOverrides =
    themeOverrides === undefined ? undefined : objectPropertyObject(themeOverrides, 'Layout')
  const layoutCommonOverrides =
    layoutThemeOverrides === undefined
      ? undefined
      : objectPropertyObject(layoutThemeOverrides, 'common')
  const layoutCommonOverrideNames =
    layoutCommonOverrides === undefined
      ? undefined
      : staticObjectPropertyNames(layoutCommonOverrides)
  const layoutBodyColorOverride =
    layoutCommonOverrides === undefined
      ? undefined
      : objectPropertyInitializer(layoutCommonOverrides, 'bodyColor')
  const invariants: readonly (readonly [string, boolean])[] = [
    ['NAV_VENDOR_IMPORT_OWNER', !/\bfrom\s+['"]naive-ui(?:\/[^'"]+)?['"]/u.test(applicationSource)],
    [
      'NAV_LAYOUT_ADAPTER_LAYOUT',
      layoutAdapterSource.includes('NLayout as PavpLayoutPrimitive') &&
        layoutAdapterSource.includes('NLayoutSider as PavpLayoutSiderPrimitive') &&
        layoutAdapterSource.includes("from 'naive-ui/es/layout'"),
    ],
    [
      'NAV_MENU_ADAPTER',
      menuAdapterSource.includes('NMenu as PavpMenuPrimitive') &&
        menuAdapterSource.includes("from 'naive-ui/es/menu'"),
    ],
    [
      'NAV_RUNTIME_CONTEXT_KEY',
      runtimeContextSource.includes('InjectionKey<PavpNaiveAppearanceReference>') &&
        runtimeContextSource.includes("Symbol('pavp-naive-appearance')"),
    ],
    [
      'NAV_RUNTIME_CONTEXT_READONLY',
      runtimeContextSource.includes('Readonly<Ref<Readonly<EffectiveAppearanceState>>>') &&
        !/\b(?:localStorage|sessionStorage|setItem)\b/u.test(runtimeContextSource),
    ],
    [
      'NAV_PROVIDER_CONTEXT',
      providerSource.includes('provide(pavpNaiveAppearanceKey, appearance)') &&
        providerSource.includes('const appearance = toRef(() => props.appearance)'),
    ],
    [
      'NAV_PROVIDER_PRESERVED',
      providerSource.includes('<NConfigProvider') &&
        providerSource.includes(':theme="projection.theme"') &&
        providerSource.includes(':theme-overrides="projection.themeOverrides"'),
    ],
    [
      'NAV_STRICT_REM_RECORD',
      shellSource.includes("layoutRecord('layout.admin.sidebar.rail-inline-size')") &&
        shellSource.includes('/^(\\d+(?:\\.\\d+)?)rem$/u.exec'),
    ],
    [
      'NAV_REM_PARSE_ONCE',
      occurrences(shellSource, 'const railRemMagnitude = Number(railRemMatch[1])') === 1,
    ],
    [
      'NAV_ROOT_FONT_READ',
      shellSource.includes('getComputedStyle(document.documentElement).fontSize'),
    ],
    ['NAV_ROOT_FONT_VALIDATION', shellSource.includes('!Number.isFinite(value) || value <= 0')],
    [
      'NAV_COLLAPSED_WIDTH_BRIDGE',
      shellSource.includes('const collapsedNavigationWidth = computed(') &&
        shellSource.includes('railRemMagnitude * currentRootFontSize.value'),
    ],
    [
      'NAV_SHARED_COLLAPSED_WIDTH',
      occurrences(shellSource, ':collapsed-width="collapsedNavigationWidth"') === 2,
    ],
    [
      'NAV_EXPANDED_WIDTH_AUTHORITY',
      shellSource.includes(
        "const expandedNavigationWidth = tokens['layout.admin.sidebar.expanded-inline-size']",
      ) && shellSource.includes(':width="expandedNavigationWidth"'),
    ],
    ['NAV_SINGLE_RESIZE_OBSERVER', occurrences(shellSource, 'new ResizeObserver(') === 1],
    [
      'NAV_RESPONSIVE_LIFECYCLE',
      !/\b(?:MutationObserver|matchMedia|setTimeout|setInterval|requestAnimationFrame)\s*\(/u.test(
        shellSource,
      ) && !/\b(?:window|document)\.addEventListener\s*\(/u.test(shellSource),
    ],
    [
      'NAV_FONT_SCALE_INVALIDATION',
      shellSource.includes('() => appearance.value.fontScale') &&
        shellSource.includes("{ flush: 'post' }"),
    ],
    [
      'NAV_PROFILE_RECOMPUTATION',
      shellSource.includes('function updateResponsiveNavigationMetrics(') &&
        shellSource.includes('currentRootFontSize.value = readRootFontSize()') &&
        shellSource.includes('profile.value = resolveAdminShellProfile({') &&
        /\(\) => appearance\.value\.fontScale[\s\S]*?updateResponsiveNavigationMetrics\(\)/u.test(
          shellSource,
        ),
    ],
    ['NAV_WIDE_LOCAL_STATE', shellSource.includes('const wideNavigationCollapsed = ref(false)')],
    [
      'NAV_COLLAPSED_STATE',
      shellSource.includes('const persistentNavigationCollapsed = computed(() => {') &&
        shellSource.includes("if (profile.value === 'regular')") &&
        occurrences(shellSource, ':collapsed="persistentNavigationCollapsed"') === 2 &&
        occurrences(shellSource, ':collapsed="false"') === 0 &&
        occurrences(shellSource, ':collapsed="true"') === 0,
    ],
    [
      'NAV_COLLAPSE_PERSISTENCE',
      !/\b(?:localStorage|sessionStorage|setItem|useStorage)\b/u.test(shellSource),
    ],
    [
      'NAV_STABLE_LAYOUT',
      occurrences(shellSource, '<PavpLayoutPrimitive\n') === 1 &&
        !/<PavpLayoutPrimitive[^>]*\bv-if\b/u.test(shellSource),
    ],
    [
      'NAV_LAYOUT_PROFILE',
      shellSource.includes(':has-sider="profile !== \'narrow\'"') &&
        shellSource.includes('v-if="profile !== \'narrow\'"'),
    ],
    [
      'NAV_LAYOUT_NESTING',
      layoutStart !== -1 &&
        siderStart > layoutStart &&
        siderEnd > siderStart &&
        layoutEnd > siderEnd,
    ],
    [
      'NAV_SIDER_CONTROL',
      shellSource.includes('collapse-mode="width"') &&
        shellSource.includes(':show-trigger="false"'),
    ],
    [
      'NAV_STABLE_MAIN',
      shellSource.includes('data-shell-region="architecture-console-content"') &&
        shellSource.includes(':inert="profile === \'narrow\' && navigationOpen"'),
    ],
    ['NAV_NO_LAYOUT_CONTENT', !shellSource.includes('PavpLayoutContent')],
    ['NAV_NO_MAIN_REMOUNT_KEY', !/<main[\s\S]{0,320}\s:key=/u.test(shellSource)],
    [
      'NAV_SINGLE_SCROLL_OWNER',
      occurrences(shellSource, 'data-scroll-owner="architecture-console-content"') === 1,
    ],
    [
      'NAV_SIDER_SCROLL_BOUNDARY',
      shellSource.includes(
        "const persistentSiderContentStyle = Object.freeze({ overflow: 'hidden' })",
      ) &&
        !shellSource.includes('data-pavp-admin-navigation-switch') &&
        shellSource.includes(':native-scrollbar="true"'),
    ],
    [
      'NAV_WIDE_CONTROL_VISIBILITY',
      headerCollapseProjection.controlElements.length === 1 &&
        headerCollapseProjection.headerTrailingDescendant &&
        headerCollapseProjection.forbiddenAncestryAbsent &&
        headerCollapseProjection.wideOnly,
    ],
    [
      'NAV_WIDE_CONTROL_LABELS',
      shellSource.includes("wideNavigationCollapsed.value ? '展开导航' : '收起导航'"),
    ],
    [
      'NAV_WIDE_CONTROL_ICON',
      shellSource.includes('data-pavp-admin-navigation-collapse-control="header-trailing"') &&
        shellSource.includes('data-pavp-admin-navigation-icon-state="sidebar-expanded"') &&
        shellSource.includes('data-pavp-admin-navigation-icon-state="sidebar-collapsed"') &&
        shellSource.includes('i-lucide-panel-left-close') &&
        shellSource.includes('i-lucide-panel-left-open'),
    ],
    ['NAV_WIDE_CONTROL_TARGET', headerCollapseControlHasTargetGeometry],
    [
      'NAV_ROOT_PROJECTION',
      shellSource.includes('key: navigationGroupKey(group.id)') &&
        shellSource.includes('label: group.label') &&
        shellSource.includes('icon: renderNavigationIcon(firstItem.iconClass)'),
    ],
    [
      'NAV_ROOT_SUBMENU',
      shellSource.includes('children: group.items.map((item) => ({') &&
        shellSource.includes("pavpNavigationKind: 'group'"),
    ],
    [
      'NAV_LEVEL_TWO_PROJECTION',
      shellSource.includes('key: item.routeName') &&
        shellSource.includes('label: item.label') &&
        shellSource.includes('icon: renderNavigationIcon(item.iconClass)'),
    ],
    [
      'NAV_CONTROLLED_MENU',
      [
        ':collapsed="persistentNavigationCollapsed"',
        ':collapsed-width="collapsedNavigationWidth"',
        ':dropdown-props="persistentNavigationDropdownProps"',
        ':node-props="persistentNavigationNodeProps"',
        ':options="navigationMenuOptions"',
        ':value="activeRouteName"',
        '@update:expanded-keys="handleNavigationExpandedKeysUpdate"',
        '@update:value="handleNavigationValueUpdate"',
      ].every((marker) => shellSource.includes(marker)) &&
        expandedProjectionSemantics.controlledProjection,
    ],
    [
      'NAV_MENU_MODE',
      shellSource.includes('mode="vertical"') &&
        shellSource.includes(':accordion="false"') &&
        shellSource.includes('children-field="children"'),
    ],
    [
      'NAV_ROUTE_ACTIVATION_OWNER',
      shellSource.includes('function handleNavigationValueUpdate(value: string | number)') &&
        shellSource.includes('navigate(value)'),
    ],
    [
      'NAV_CURRENT_ROUTE_NOOP',
      /function navigate\(routeName: string\): void \{[\s\S]*?routeName === props\.activeRouteName[\s\S]*?return/u.test(
        shellSource,
      ),
    ],
    [
      'NAV_EXPANDED_INITIAL_STATE',
      shellSource.includes(
        'const expandedNavigationGroupKeys = ref<string[]>([...navigationGroupKeys.value])',
      ),
    ],
    [
      'NAV_EXPANDED_ROUTE_STATE',
      expandedProjectionSemantics.controlledProjection &&
        !expandedProjectionSemantics.activeParentIncluded &&
        shellSource.includes('const validExpandedNavigationGroupKeys = computed(() => {') &&
        shellSource.includes('() => props.activeRouteName') &&
        !shellSource.includes('ensureActiveNavigationGroupExpanded'),
    ],
    [
      'NAV_EXPANDED_STATE_PRESERVATION',
      !/expandedNavigationGroupKeys\.value\s*=\s*\[\.\.\.navigationGroupKeys\.value\]/u.test(
        shellSource,
      ),
    ],
    [
      'NAV_ROOT_KEYBOARD',
      normalNodeSource.includes("optionKind === 'group'") &&
        /optionKind === 'group'[\s\S]*?return \{\s*tabindex: 0,[\s\S]*?handleRootNavigationKeydown\(event, groupKey\)/u.test(
          normalNodeSource,
        ),
    ],
    [
      'NAV_LEAF_KEYBOARD',
      normalNodeSource.includes("optionKind !== 'route'") &&
        occurrences(normalNodeSource, 'tabindex: 0') === 2 &&
        normalNodeSource.includes('handleRouteNavigationKeydown(event, routeName)'),
    ],
    [
      'NAV_EVENT_LOCAL_POPUP',
      shellSource.includes(
        "event.currentTarget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))",
      ) && !/\b(?:querySelector|getElementById|closest)\s*\(/u.test(shellSource),
    ],
    [
      'NAV_DROPDOWN_NATIVE_KEYBOARD',
      shellSource.includes('keyboard: true') && !shellSource.includes('handleDropdownKeydown'),
    ],
    [
      'NAV_ARIA_CURRENT',
      occurrences(
        shellSource,
        "'aria-current': routeName === props.activeRouteName ? 'page' : undefined",
      ) === 2,
    ],
    [
      'NAV_NORMAL_POINTER_GUARD',
      normalNodeSource.includes('preserveCurrentPersistentNavigationFocus(event, routeName)'),
    ],
    [
      'NAV_DROPDOWN_POINTER_GUARD',
      dropdownNodeSource.includes('preserveCurrentPersistentNavigationFocus(event, routeName)'),
    ],
    [
      'NAV_POPUP_OWNERSHIP',
      shellSource.includes("trigger: 'hover'") &&
        !shellSource.includes("trigger: 'click'") &&
        shellSource.includes("to: '#pavp-overlay-root'") &&
        shellSource.includes("class: 'pavp-admin-navigation-dropdown'"),
    ],
    [
      'NAV_THEME_LAYOUT_PARSER_INPUT',
      isDeepStrictEqual(layoutCommonOverrideNames, ['bodyColor']) &&
        layoutBodyColorOverride?.getText() === 'commonDark.bodyColor',
    ],
    [
      'NAV_THEME_LAYOUT_MENU',
      themeSource.includes('Layout: layoutDark') &&
        themeSource.includes('Menu: menuDark') &&
        themeSource.includes('siderColor: material.chrome') &&
        themeSource.includes('siderBorderColor: colorBorder') &&
        requiredMenuThemeFields.every((field) => themeSource.includes(field)),
    ],
    [
      'NAV_THEME_DROPDOWN_PEER',
      themeSource.includes('peers: {\n        Dropdown: {') &&
        requiredDropdownThemeFields.every((field) => themeSource.includes(field)) &&
        !/#18a058|#36ad6a|#0c7a43/iu.test(themeSource),
    ],
    [
      'NAV_VENDOR_NAMESPACES',
      shellSource.includes("[data-pavp-admin-navigation='persistent'] .n-menu") &&
        shellSource.includes('.pavp-admin-navigation-dropdown.n-dropdown-menu') &&
        !/\.n-[a-z0-9_-]+/iu.test(applicationSource),
    ],
    [
      'NAV_FOCUS_VISIBLE',
      /\[data-pavp-admin-navigation='persistent'\] \.n-menu-item:focus-visible \{[\s\S]*?box-shadow: var\(--ui-admin-shadow-focus-ring\);[\s\S]*?\}/u.test(
        shellSource,
      ),
    ],
    [
      'NAV_MOTION_CLOSURE',
      vendorMotionSource.includes('html[data-motion]') &&
        vendorMotionSource.includes("html[data-motion='reduced']") &&
        vendorMotionSource.includes("html[data-motion='none']") &&
        vendorMotionSource.includes(
          "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
        ) &&
        /html\[data-motion='none'\][\s\S]*?\.n-layout-sider[\s\S]*?\.n-menu[\s\S]*?\.pavp-admin-navigation-dropdown[\s\S]*?transition: none !important;/u.test(
          vendorMotionSource,
        ) &&
        !/\.n-menu-item-content-header[^{}]*\{[^}]*opacity\s*:\s*0/u.test(vendorMotionSource),
    ],
    [
      'NAV_NARROW_DRAWER_PRESERVATION',
      [
        '<Teleport to="#pavp-overlay-root">',
        'v-if="profile === \'narrow\' && navigationOpen"',
        '@pointerdown="handleDrawerScrimPointerDown($event)"',
        'aria-modal="true"',
        'role="dialog"',
        '@keydown="handleDrawerKeydown"',
        ':inert="profile === \'narrow\' && navigationOpen"',
      ].every((marker) => shellSource.includes(marker)),
    ],
  ]

  if (invariants.length !== expectedNavigationReworkSourceInvariantCount) {
    return [
      `NAV_SOURCE_INVARIANT_COUNT:${String(invariants.length)}/${String(expectedNavigationReworkSourceInvariantCount)}`,
    ]
  }

  return invariants.flatMap(([code, passed]) => (passed ? [] : [code]))
}

function changedNavigationReworkSource(
  baseline: NavigationReworkSourceSnapshot,
  sourceKey: keyof NavigationReworkSourceSnapshot,
  search: string,
  replacement: string,
): NavigationReworkSourceSnapshot {
  return {
    ...baseline,
    [sourceKey]: baseline[sourceKey].replace(search, replacement),
  }
}

function runNavigationReworkSourceNegativeProbes(
  baseline: NavigationReworkSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const normalGuard = `    onPointerdown: (event: PointerEvent) => {\n      preserveCurrentPersistentNavigationFocus(event, routeName)\n    },`
  const leafKeyboard = `    onKeydown: (event: KeyboardEvent) => {\n      handleRouteNavigationKeydown(event, routeName)\n    },`
  const fontScaleWatch = `watch(\n  () => appearance.value.fontScale,\n  () => {\n    updateResponsiveNavigationMetrics()\n  },\n  { flush: 'post' },\n)`
  const probes: readonly (readonly [string, string, NavigationReworkSourceSnapshot])[] = [
    [
      'navigation-source-app-direct-naive-import',
      'NAV_VENDOR_IMPORT_OWNER',
      {
        ...baseline,
        applicationSource: `${baseline.applicationSource}\nimport { NMenu } from 'naive-ui'`,
      },
    ],
    [
      'navigation-source-sider-outside-layout',
      'NAV_LAYOUT_NESTING',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '<PavpLayoutSiderPrimitive',
        '</PavpLayoutPrimitive>\n      <PavpLayoutSiderPrimitive',
      ),
    ],
    [
      'navigation-source-has-sider-removed',
      'NAV_LAYOUT_PROFILE',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '      :has-sider="profile !== \'narrow\'"\n',
        '',
      ),
    ],
    [
      'navigation-source-collapse-state-diverged',
      'NAV_COLLAPSED_STATE',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '        :collapsed="persistentNavigationCollapsed"',
        '        :collapsed="wideNavigationCollapsed"',
      ),
    ],
    [
      'navigation-source-hardcoded-rail-width',
      'NAV_SHARED_COLLAPSED_WIDTH',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '        :collapsed-width="collapsedNavigationWidth"',
        '        :collapsed-width="64"',
      ),
    ],
    [
      'navigation-source-font-scale-invalidation-removed',
      'NAV_FONT_SCALE_INVALIDATION',
      changedNavigationReworkSource(baseline, 'shellSource', fontScaleWatch, ''),
    ],
    [
      'navigation-source-profile-recompute-removed',
      'NAV_PROFILE_RECOMPUTATION',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        fontScaleWatch,
        fontScaleWatch.replace('    updateResponsiveNavigationMetrics()\n', ''),
      ),
    ],
    [
      'navigation-source-profile-label-deletion-restored',
      'NAV_ROOT_PROJECTION',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '      label: group.label,',
        "      label: profile.value === 'wide' ? group.label : '',",
      ),
    ],
    [
      'navigation-source-root-leaf-introduced',
      'NAV_ROOT_SUBMENU',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '      children: group.items.map((item) => ({',
        '      pavpChildren: group.items.map((item) => ({',
      ),
    ],
    [
      'navigation-source-popup-target-body',
      'NAV_POPUP_OWNERSHIP',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        "  to: '#pavp-overlay-root',",
        "  to: 'body',",
      ),
    ],
    [
      'navigation-source-click-popup-restored',
      'NAV_POPUP_OWNERSHIP',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        "  trigger: 'hover',",
        "  trigger: 'click',",
      ),
    ],
    [
      'navigation-source-root-focusability-removed',
      'NAV_ROOT_KEYBOARD',
      changedNavigationReworkSource(baseline, 'shellSource', '      tabindex: 0,', ''),
    ],
    [
      'navigation-source-leaf-keyboard-navigation-removed',
      'NAV_LEAF_KEYBOARD',
      changedNavigationReworkSource(baseline, 'shellSource', leafKeyboard, ''),
    ],
    [
      'navigation-source-normal-pointer-guard-removed',
      'NAV_NORMAL_POINTER_GUARD',
      changedNavigationReworkSource(baseline, 'shellSource', normalGuard, ''),
    ],
    [
      'navigation-source-dropdown-pointer-guard-removed',
      'NAV_DROPDOWN_POINTER_GUARD',
      changedNavigationReworkSource(
        changedNavigationReworkSource(baseline, 'shellSource', normalGuard, ''),
        'shellSource',
        normalGuard,
        '',
      ),
    ],
    [
      'navigation-source-vendor-dom-query-added',
      'NAV_EVENT_LOCAL_POPUP',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        "    event.currentTarget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))",
        "    document.querySelector('.n-menu-item')?.dispatchEvent(new MouseEvent('click'))",
      ),
    ],
    [
      'navigation-source-layout-parser-input-removed',
      'NAV_THEME_LAYOUT_PARSER_INPUT',
      changedNavigationReworkSource(
        baseline,
        'themeSource',
        '      common: {\n        bodyColor: commonDark.bodyColor,\n      },\n',
        '',
      ),
    ],
    [
      'navigation-source-vendor-primary-green-added',
      'NAV_THEME_DROPDOWN_PEER',
      changedNavigationReworkSource(
        baseline,
        'themeSource',
        '          optionTextColorHover: colorControl,',
        "          optionTextColorHover: '#18a058',",
      ),
    ],
    [
      'navigation-source-focus-visible-removed',
      'NAV_FOCUS_VISIBLE',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
        "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus",
      ),
    ],
    [
      'navigation-source-motion-none-closure-removed',
      'NAV_MOTION_CLOSURE',
      changedNavigationReworkSource(
        baseline,
        'providerSource',
        "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
        "html[data-motion='disabled']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
      ),
    ],
    [
      'navigation-source-opacity-zero-workaround-added',
      'NAV_MOTION_CLOSURE',
      {
        ...baseline,
        shellSource: `${baseline.shellSource}\n<style>.n-menu-item-content-header { opacity: 0; }</style>`,
      },
    ],
    [
      'navigation-source-narrow-drawer-modified',
      'NAV_NARROW_DRAWER_PRESERVATION',
      changedNavigationReworkSource(baseline, 'shellSource', '            aria-modal="true"\n', ''),
    ],
    [
      'navigation-source-collapse-persistence-added',
      'NAV_COLLAPSE_PERSISTENCE',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '  wideNavigationCollapsed.value = !wideNavigationCollapsed.value',
        "  wideNavigationCollapsed.value = !wideNavigationCollapsed.value\n  localStorage.setItem('wide-navigation-collapsed', String(wideNavigationCollapsed.value))",
      ),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const changed = !isDeepStrictEqual(mutatedSnapshot, baseline)
      const failureCodes = navigationReworkSourceViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed: changed && failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function exactOccurrenceCount(source: string, value: string): number {
  return source.split(value).length - 1
}

interface AdminNavigationExpandedProjectionSemantics {
  readonly activeParentIncluded: boolean
  readonly controlledProjection: boolean
  readonly lifecycleMutationFree: boolean
}

function topLevelVariableInitializers(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.Expression> {
  const initializers = new Map<string, ts.Expression>()

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
        initializers.set(declaration.name.text, declaration.initializer)
      }
    }
  }

  return initializers
}

function topLevelCallables(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.Node> {
  const callables = new Map<string, ts.Node>()
  const aliases = new Map<string, string>()

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
      callables.set(statement.name.text, statement)
      continue
    }
    if (!ts.isVariableStatement(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
        continue
      }

      const initializer = unwrapExpression(declaration.initializer)
      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        callables.set(declaration.name.text, initializer)
      } else if (ts.isIdentifier(initializer)) {
        aliases.set(declaration.name.text, initializer.text)
      }
    }
  }

  let aliasResolved = true
  while (aliasResolved) {
    aliasResolved = false
    for (const [alias, target] of aliases) {
      if (callables.has(alias)) {
        continue
      }

      const callable = callables.get(target)
      if (callable !== undefined) {
        callables.set(alias, callable)
        aliasResolved = true
      }
    }
  }

  return callables
}

function expressionDependencyClosure(
  root: ts.Expression,
  initializers: ReadonlyMap<string, ts.Expression>,
): readonly ts.Expression[] {
  const pending: ts.Expression[] = [root]
  const result: ts.Expression[] = []
  const visitedInitializers = new Set<ts.Expression>()

  while (pending.length > 0) {
    const expression = pending.pop()
    if (expression === undefined || visitedInitializers.has(expression)) {
      continue
    }

    visitedInitializers.add(expression)
    result.push(expression)

    function visit(node: ts.Node): void {
      if (ts.isIdentifier(node)) {
        const dependency = initializers.get(node.text)
        if (dependency !== undefined && !visitedInitializers.has(dependency)) {
          pending.push(dependency)
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(expression)
  }

  return result
}

function nodeReferencesRefValue(node: ts.Node, refName: string): boolean {
  let referenced = false

  function visit(candidate: ts.Node): void {
    if (
      ts.isPropertyAccessExpression(candidate) &&
      ts.isIdentifier(candidate.expression) &&
      candidate.expression.text === refName &&
      candidate.name.text === 'value'
    ) {
      referenced = true
      return
    }
    ts.forEachChild(candidate, visit)
  }

  visit(node)
  return referenced
}

function expressionIsRefArray(initializer: ts.Expression): boolean {
  const expression = unwrapExpression(initializer)

  return (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'ref' &&
    expression.arguments[0] !== undefined &&
    ts.isArrayLiteralExpression(unwrapExpression(expression.arguments[0]))
  )
}

function expressionIsComputed(initializer: ts.Expression): boolean {
  const expression = unwrapExpression(initializer)
  return (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'computed' &&
    expression.arguments[0] !== undefined
  )
}

function dependencyClosureHasPropsProperty(
  closure: readonly ts.Expression[],
  property: string,
): boolean {
  return closure.some((expression) => {
    let found = false

    function visit(node: ts.Node): void {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'props' &&
        node.name.text === property
      ) {
        found = true
        return
      }
      ts.forEachChild(node, visit)
    }

    visit(expression)
    return found
  })
}

function dependencyClosureCombinesExpandedKeys(
  closure: readonly ts.Expression[],
  expandedStateName: string,
): boolean {
  const observations = {
    addsProjectedKey: false,
    copiesExpandedStateIntoSet: false,
    directArrayCombination: false,
    spreadsProjectedCollection: false,
  }

  for (const expression of closure) {
    function visit(node: ts.Node): void {
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Set' &&
        node.arguments?.some((argument) => nodeReferencesRefValue(argument, expandedStateName)) ===
          true
      ) {
        observations.copiesExpandedStateIntoSet = true
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'add'
      ) {
        observations.addsProjectedKey = true
      }
      if (ts.isArrayLiteralExpression(node) && node.elements.some(ts.isSpreadElement)) {
        observations.spreadsProjectedCollection = true
      }

      if (ts.isArrayLiteralExpression(node)) {
        const expandedStateSpreads = node.elements.filter(
          (element) =>
            ts.isSpreadElement(element) &&
            nodeReferencesRefValue(element.expression, expandedStateName),
        )
        if (
          expandedStateSpreads.length === 1 &&
          node.elements.some((element) => !expandedStateSpreads.includes(element))
        ) {
          observations.directArrayCombination = true
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(expression)
  }

  return (
    observations.directArrayCombination ||
    (observations.copiesExpandedStateIntoSet &&
      observations.addsProjectedKey &&
      observations.spreadsProjectedCollection)
  )
}

function isRefValueWriteTarget(node: ts.Expression, refName: string): boolean {
  const expression = unwrapExpression(node)

  if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'value') {
    const receiver = unwrapExpression(expression.expression)
    if (ts.isIdentifier(receiver) && receiver.text === refName) {
      return true
    }
  }

  if (ts.isElementAccessExpression(expression)) {
    const receiver = unwrapExpression(expression.expression)
    const argument = unwrapExpression(expression.argumentExpression)
    if (
      ts.isIdentifier(receiver) &&
      receiver.text === refName &&
      ts.isStringLiteralLike(argument) &&
      argument.text === 'value'
    ) {
      return true
    }
  }

  if (ts.isElementAccessExpression(expression) || ts.isPropertyAccessExpression(expression)) {
    return isRefValueWriteTarget(expression.expression, refName)
  }

  return false
}

function isRefValueUpdateExpression(node: ts.Node, refName: string): boolean {
  return (
    (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
    (node.operator === ts.SyntaxKind.PlusPlusToken ||
      node.operator === ts.SyntaxKind.MinusMinusToken) &&
    isRefValueWriteTarget(node.operand, refName)
  )
}

function nodeOrCalledFunctionWritesRef(
  root: ts.Node,
  refName: string,
  callables: ReadonlyMap<string, ts.Node>,
  visitedCallables = new Set<string>(),
): boolean {
  let writes = false
  const mutatingArrayMethods = new Set([
    'copyWithin',
    'fill',
    'pop',
    'push',
    'reverse',
    'shift',
    'sort',
    'splice',
    'unshift',
  ])

  function visit(node: ts.Node): void {
    if (writes) {
      return
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      isRefValueWriteTarget(node.left, refName)
    ) {
      writes = true
      return
    }
    if (isRefValueUpdateExpression(node, refName)) {
      writes = true
      return
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      mutatingArrayMethods.has(node.expression.name.text) &&
      isRefValueWriteTarget(node.expression.expression, refName)
    ) {
      writes = true
      return
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callableName = node.expression.text
      const callable = callables.get(callableName)
      if (callable !== undefined && !visitedCallables.has(callableName)) {
        visitedCallables.add(callableName)
        if (nodeOrCalledFunctionWritesRef(callable, refName, callables, visitedCallables)) {
          writes = true
          return
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(root)
  return writes
}

function refValueWriteCount(root: ts.Node, refName: string): number {
  let count = 0

  function visit(node: ts.Node): void {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      isRefValueWriteTarget(node.left, refName)
    ) {
      count += 1
    } else if (isRefValueUpdateExpression(node, refName)) {
      count += 1
    }

    ts.forEachChild(node, visit)
  }

  visit(root)
  return count
}

function templateEventExpressionWritesRef(
  expression: string,
  refName: string,
  callables: ReadonlyMap<string, ts.Node>,
): boolean {
  const sourceFile = ts.createSourceFile(
    'pavp-template-event-expression.ts',
    expression,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const onlyStatement = sourceFile.statements[0]
  const expressionStatement =
    sourceFile.statements.length === 1 &&
    onlyStatement !== undefined &&
    ts.isExpressionStatement(onlyStatement)
      ? onlyStatement
      : undefined
  const rootExpression =
    expressionStatement === undefined ? undefined : unwrapExpression(expressionStatement.expression)

  if (rootExpression !== undefined && ts.isIdentifier(rootExpression)) {
    const rootCallable = callables.get(rootExpression.text)
    if (
      rootCallable !== undefined &&
      nodeOrCalledFunctionWritesRef(rootCallable, refName, callables)
    ) {
      return true
    }
  }

  let writes = false

  function directTarget(candidate: ts.Expression): boolean {
    const target = unwrapExpression(candidate)
    return (
      (ts.isIdentifier(target) && target.text === refName) || isRefValueWriteTarget(target, refName)
    )
  }

  function visit(node: ts.Node): void {
    if (writes) {
      return
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      directTarget(node.left)
    ) {
      writes = true
      return
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken) &&
      directTarget(node.operand)
    ) {
      writes = true
      return
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callable = callables.get(node.expression.text)
      if (callable !== undefined && nodeOrCalledFunctionWritesRef(callable, refName, callables)) {
        writes = true
        return
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return writes
}

function computedBooleanLabelMatches(
  initializer: ts.Expression | undefined,
  refName: string,
  trueLabel: string,
  falseLabel: string,
): boolean {
  if (initializer === undefined) {
    return false
  }

  const computedCall = unwrapExpression(initializer)
  if (
    !ts.isCallExpression(computedCall) ||
    !ts.isIdentifier(computedCall.expression) ||
    computedCall.expression.text !== 'computed' ||
    computedCall.arguments.length !== 1
  ) {
    return false
  }

  const computedArgument = computedCall.arguments[0]
  if (computedArgument === undefined) {
    return false
  }

  const callback = unwrapExpression(computedArgument)
  if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) {
    return false
  }

  const onlyCallbackStatement = ts.isBlock(callback.body) ? callback.body.statements[0] : undefined
  const returnedExpression = ts.isBlock(callback.body)
    ? callback.body.statements.length === 1 &&
      onlyCallbackStatement !== undefined &&
      ts.isReturnStatement(onlyCallbackStatement) &&
      onlyCallbackStatement.expression !== undefined
      ? onlyCallbackStatement.expression
      : undefined
    : callback.body

  if (returnedExpression === undefined) {
    return false
  }

  const conditional = unwrapExpression(returnedExpression)
  if (!ts.isConditionalExpression(conditional)) {
    return false
  }

  const condition = unwrapExpression(conditional.condition)

  return (
    ts.isPropertyAccessExpression(condition) &&
    ts.isIdentifier(condition.expression) &&
    condition.expression.text === refName &&
    condition.name.text === 'value' &&
    ts.isStringLiteralLike(conditional.whenTrue) &&
    conditional.whenTrue.text === trueLabel &&
    ts.isStringLiteralLike(conditional.whenFalse) &&
    conditional.whenFalse.text === falseLabel
  )
}

function adminNavigationMenuNodes(shellSource: string): readonly VueTemplateNode[] {
  const parsedSfc = vueSfcCompiler.parse(shellSource, { filename: shellSfcPath })
  const templateAst = parsedSfc.descriptor.template?.ast

  if (parsedSfc.errors.length > 0 || templateAst === undefined) {
    return []
  }

  return collectShellTemplateElements(templateAst)
    .map((element) => element.node)
    .filter((node) => node.tag === 'PavpMenuPrimitive')
}

function singleBoundExpression(node: VueTemplateNode, argument: string): string | undefined {
  const bindings = templateDirectives(node, 'bind', argument)
  return bindings.length === 1 ? normalizeTemplateExpression(bindings[0]?.exp?.content) : undefined
}

function adminNavigationExpandedProjectionSemantics(
  shellSource: string,
): AdminNavigationExpandedProjectionSemantics {
  const menuNodes = adminNavigationMenuNodes(shellSource)
  const projectionBindings = menuNodes.map((node) => singleBoundExpression(node, 'expanded-keys'))
  const projectionName = projectionBindings[0]
  const shellScript = scriptContent(shellSource)
  const sourceFile = ts.createSourceFile(
    shellSfcPath,
    shellScript,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const initializers = topLevelVariableInitializers(sourceFile)
  const callables = topLevelCallables(sourceFile)
  const projectionInitializer =
    projectionName === undefined ? undefined : initializers.get(projectionName)
  const controlledProjection =
    menuNodes.length === 1 &&
    projectionName !== undefined &&
    /^[A-Za-z_$][\w$]*$/u.test(projectionName) &&
    projectionBindings.every((binding) => binding === projectionName)

  if (
    !controlledProjection ||
    projectionInitializer === undefined ||
    !expressionIsComputed(projectionInitializer)
  ) {
    return Object.freeze({
      activeParentIncluded: false,
      controlledProjection: false,
      lifecycleMutationFree: false,
    })
  }

  const projectionClosure = expressionDependencyClosure(projectionInitializer, initializers)
  const expandedStateNames = [...initializers.entries()]
    .filter(
      ([name, initializer]) =>
        expressionIsRefArray(initializer) &&
        projectionClosure.some((expression) => nodeReferencesRefValue(expression, name)),
    )
    .map(([name]) => name)
  const expandedStateName = expandedStateNames.length === 1 ? expandedStateNames[0] : undefined
  const activeParentIncluded =
    expandedStateName !== undefined &&
    dependencyClosureHasPropsProperty(projectionClosure, 'navigation') &&
    dependencyClosureHasPropsProperty(projectionClosure, 'activeRouteName') &&
    dependencyClosureCombinesExpandedKeys(projectionClosure, expandedStateName)

  if (expandedStateName === undefined) {
    return Object.freeze({
      activeParentIncluded,
      controlledProjection,
      lifecycleMutationFree: false,
    })
  }
  const controlledExpandedStateName = expandedStateName

  const watchObservation = { callbackWrites: false }
  function visitWatchCalls(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'watch'
    ) {
      for (const callback of node.arguments.slice(1)) {
        if (nodeOrCalledFunctionWritesRef(callback, controlledExpandedStateName, callables)) {
          watchObservation.callbackWrites = true
          return
        }
      }
    }
    ts.forEachChild(node, visitWatchCalls)
  }
  visitWatchCalls(sourceFile)

  const parsedSfc = vueSfcCompiler.parse(shellSource, { filename: shellSfcPath })
  const templateAst = parsedSfc.descriptor.template?.ast
  const collapseActions =
    templateAst === undefined
      ? []
      : collectShellTemplateElements(templateAst)
          .map((element) => element.node)
          .filter(
            (node) =>
              staticTemplateAttribute(node, 'data-pavp-admin-navigation-collapse-control') ===
              'header-trailing',
          )
  const collapseAction = collapseActions.length === 1 ? collapseActions.at(0) : undefined
  const collapseClickExpression =
    collapseAction === undefined
      ? ''
      : normalizeTemplateExpression(
          templateDirectives(collapseAction, 'on', 'click')[0]?.exp?.content,
        )
  const collapseCallableName = /^([A-Za-z_$][\w$]*)(?:\(\))?$/u.exec(collapseClickExpression)?.[1]
  const collapseCallable =
    collapseCallableName === undefined ? undefined : callables.get(collapseCallableName)
  const collapseCallbackWrites =
    collapseCallable === undefined ||
    nodeOrCalledFunctionWritesRef(collapseCallable, controlledExpandedStateName, callables)

  return Object.freeze({
    activeParentIncluded,
    controlledProjection,
    lifecycleMutationFree: !watchObservation.callbackWrites && !collapseCallbackWrites,
  })
}

function adminNavigationNativeSourceInvariantResults(
  snapshot: AdminNavigationNativeSourceSnapshot,
): readonly Readonly<{ code: string; passed: boolean }>[] {
  const shellTemplate = templateContent(snapshot.shellSource)
  const shellScript = scriptContent(snapshot.shellSource)
  const normalizedShellScript = shellScript.replaceAll(/\s+/gu, ' ')
  const shellStyles = styleContent(snapshot.shellSource)
  const shellRules = cssRuleBlocks(shellStyles)
  const sourceAndDependencyCorpus = [
    snapshot.applicationSource,
    snapshot.checkBundleSource,
    snapshot.engineeringManifestSource,
    snapshot.lockSource,
    snapshot.projectConfigSource,
    snapshot.providerSource,
    snapshot.publicUiRootSource,
    snapshot.shellSource,
    snapshot.themeSource,
    snapshot.uiManifestSource,
    snapshot.workspaceSource,
  ].join('\n')
  const prohibitedDualPlanePattern =
    /navigation-plane|plane--expanded|plane--collapsed|expandedNavigationMenu|collapsedNavigationMenu/iu
  const prohibitedBridgePattern =
    /navigation-chrome-bridge|navigationChromeBridge|flipBridge|renderChromeBridge/iu
  const prohibitedCompensationPattern =
    /mainContentPlane|main-content-bridge|renderMainContentBridge|mainContentCompensation/iu
  const prohibitedRevealPattern =
    /route-selection-aura|routeAura|selected-reveal|reveal-plane|moving-pill|movingPill|selection-bloom|hard-route-dot|left-selection/iu
  const prohibitedAnimationStatePattern =
    /collapseTimeline|routeTimeline|requestAnimationFrame|navigationMotionState|routeMotionIntent|SelectionFeedbackPhase|selectionFeedback|idle-a|idle-b/iu
  const exactUiDependencies = {
    '@platform/design-system': 'workspace:*',
    '@vueuse/core': 'catalog:',
    'motion-v': 'catalog:',
    'naive-ui': 'catalog:',
    vue: 'catalog:',
  } as const
  const uiManifest = JSON.parse(snapshot.uiManifestSource) as JsonObject
  const uiDependencies = isJsonObject(uiManifest['dependencies']) ? uiManifest['dependencies'] : {}
  const workspace = parseYaml(snapshot.workspaceSource) as JsonObject
  const workspaceCatalog = isJsonObject(workspace['catalog']) ? workspace['catalog'] : {}
  const workspacePatchedDependencies = isJsonObject(workspace['patchedDependencies'])
    ? workspace['patchedDependencies']
    : {}
  const lockfile = parseYaml(snapshot.lockSource) as JsonObject
  const lockCatalogs = isJsonObject(lockfile['catalogs']) ? lockfile['catalogs'] : {}
  const lockDefaultCatalog = isJsonObject(lockCatalogs['default']) ? lockCatalogs['default'] : {}
  const lockImporters = isJsonObject(lockfile['importers']) ? lockfile['importers'] : {}
  const uiImporter = isJsonObject(lockImporters['packages/ui']) ? lockImporters['packages/ui'] : {}
  const uiImporterDependencies = isJsonObject(uiImporter['dependencies'])
    ? uiImporter['dependencies']
    : {}
  const lockPackages = isJsonObject(lockfile['packages']) ? lockfile['packages'] : {}
  const lockSnapshots = isJsonObject(lockfile['snapshots']) ? lockfile['snapshots'] : {}
  const lockPatchedDependencies = isJsonObject(lockfile['patchedDependencies'])
    ? lockfile['patchedDependencies']
    : {}
  const motionPatchLockRecord = isJsonObject(lockPatchedDependencies['motion-v@2.4.0'])
    ? lockPatchedDependencies['motion-v@2.4.0']
    : {}
  const scopedMotionDependencyClosure =
    isDeepStrictEqual(uiDependencies, exactUiDependencies) &&
    workspaceCatalog['motion-v'] === expectedMotionVueVersion &&
    workspaceCatalog['@vueuse/core'] === expectedVueUseCoreVersion &&
    isDeepStrictEqual(
      Object.keys(workspacePatchedDependencies).filter((key) => key.startsWith('motion-v@')),
      ['motion-v@2.4.0'],
    ) &&
    workspacePatchedDependencies['motion-v@2.4.0'] === 'patches/motion-v@2.4.0.patch' &&
    isDeepStrictEqual(
      Object.keys(lockPatchedDependencies).filter((key) => key.startsWith('motion-v@')),
      ['motion-v@2.4.0'],
    ) &&
    motionPatchLockRecord['hash'] ===
      'fe15a8c9fbe1795b63b62db2b0a262c44c45fe58fc75b14cd89c51ead0e19d59' &&
    motionPatchLockRecord['path'] === 'patches/motion-v@2.4.0.patch' &&
    !Object.hasOwn(workspaceCatalog, 'gsap') &&
    !Object.hasOwn(lockDefaultCatalog, 'gsap') &&
    !Object.hasOwn(uiImporterDependencies, 'gsap') &&
    !Object.hasOwn(lockPackages, 'gsap@3.15.0') &&
    !Object.hasOwn(lockSnapshots, 'gsap@3.15.0') &&
    !/(?:^|\s)gsap(?:@|:)/mu.test(snapshot.lockSource)
  const nativeSurfaceBaseRule = shellRules.find(
    (rule) =>
      rule.selector.includes(
        "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
      ) &&
      rule.selector.includes('.pavp-admin-navigation-dropdown .n-dropdown-option-body::before'),
  )
  const nativeSurfaceBaseDeclarations = nativeSurfaceBaseRule?.declarations ?? ''
  const acceptedNativeFullSurfaceOwner =
    nativeSurfaceBaseDeclarations.includes('opacity: 0;') &&
    nativeSurfaceBaseDeclarations.includes('transform: scale(0.98);') &&
    nativeSurfaceBaseDeclarations.includes('transition-duration: var(--ui-motion-duration);') &&
    nativeSurfaceBaseDeclarations.includes(
      'transition-property: background-color, opacity, transform;',
    ) &&
    nativeSurfaceBaseDeclarations.includes(
      'transition-timing-function: var(--ui-motion-easing);',
    ) &&
    !/\b(?:filter|backdrop-filter)\s*:/iu.test(nativeSurfaceBaseDeclarations) &&
    shellStyles.includes('.n-menu-item-content--selected::before') &&
    shellStyles.includes('opacity: 1;') &&
    shellStyles.includes('transform: scale(1);') &&
    snapshot.providerSource.includes("html[data-motion='full']") &&
    snapshot.providerSource.includes(
      'transition-property: background-color, opacity, transform !important;',
    )
  const toleratedRejectedLocalFullSurfaceResidue =
    nativeSurfaceBaseDeclarations.includes('opacity: 0;') &&
    nativeSurfaceBaseDeclarations.includes('transform: none;') &&
    nativeSurfaceBaseDeclarations.includes('transition-duration: var(--ui-motion-duration);') &&
    nativeSurfaceBaseDeclarations.includes('transition-property: background-color, opacity;') &&
    nativeSurfaceBaseDeclarations.includes(
      'transition-timing-function: var(--ui-motion-easing);',
    ) &&
    !/\b(?:filter|backdrop-filter)\s*:/iu.test(nativeSurfaceBaseDeclarations) &&
    shellStyles.includes('.n-menu-item-content--selected::before') &&
    shellStyles.includes('opacity: 1;') &&
    !/\.n-menu-item-content::before[^{}]*\{[^}]*(?:scale|translate)[XYZ3d]*\(/isu.test(
      shellStyles,
    ) &&
    !/\.n-dropdown-option-body::before[^{}]*\{[^}]*(?:scale|translate)[XYZ3d]*\(/isu.test(
      shellStyles,
    )
  const fullSurfaceOwner =
    acceptedNativeFullSurfaceOwner || toleratedRejectedLocalFullSurfaceResidue
  const acceptedNativeReducedSurfaceOwner =
    [
      "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
      "html[data-motion='reduced'] .pavp-admin-navigation-dropdown .n-dropdown-option .n-dropdown-option-body::before",
    ].every((selector) =>
      selectorHasDeclarations(shellRules, selector, {
        transform: 'none',
        'transition-duration': 'var(--ui-motion-duration)',
        'transition-property': 'background-color, opacity',
        'transition-timing-function': 'var(--ui-motion-easing)',
      }),
    ) &&
    snapshot.providerSource.includes(
      "html[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from",
    ) &&
    snapshot.providerSource.includes('transition-property: color !important;')
  const reducedSurfaceOwner = acceptedNativeReducedSurfaceOwner
  const acceptedNativeNoneSurfaceOwner = snapshot.providerSource.includes(
    "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body::before\n  ) {\n  transform: none !important;\n}",
  )
  const toleratedRejectedLocalNoneSurfaceResidue =
    [
      "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
      "html[data-motion='none'] .pavp-admin-navigation-dropdown .n-dropdown-option .n-dropdown-option-body::before",
    ].every((selector) =>
      selectorHasDeclarations(shellRules, selector, {
        animation: 'none',
        transform: 'none',
        transition: 'none',
      }),
    ) &&
    snapshot.providerSource.includes(
      "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
    ) &&
    snapshot.providerSource.includes('animation: none !important;') &&
    snapshot.providerSource.includes('transition: none !important;') &&
    snapshot.providerSource.includes('opacity: 1 !important;') &&
    snapshot.providerSource.includes('transform: none !important;') &&
    !cssRuleBlocks(styleContent(snapshot.providerSource)).some(
      (rule) =>
        rule.selector.includes("html[data-motion='none']") &&
        rule.selector.includes('.n-menu-item-content__arrow') &&
        /\btransform\s*:/iu.test(rule.declarations),
    )
  const noneSurfaceOwner =
    (acceptedNativeNoneSurfaceOwner || toleratedRejectedLocalNoneSurfaceResidue) &&
    snapshot.providerSource.includes(
      "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
    ) &&
    snapshot.providerSource.includes('animation: none !important;') &&
    snapshot.providerSource.includes('transition: none !important;') &&
    snapshot.providerSource.includes('opacity: 1 !important;') &&
    snapshot.providerSource.includes('transform: none !important;') &&
    !cssRuleBlocks(styleContent(snapshot.providerSource)).some(
      (rule) =>
        rule.selector.includes("html[data-motion='none']") &&
        rule.selector.includes('.n-menu-item-content__arrow') &&
        /\btransform\s*:/iu.test(rule.declarations),
    )
  const nativeTransitionOwner =
    snapshot.providerSource.includes("[data-pavp-admin-navigation='persistent'] .n-layout-sider") &&
    snapshot.providerSource.includes(
      'transition-duration: var(--ui-motion-duration) !important;',
    ) &&
    snapshot.providerSource.includes(
      'transition-timing-function: var(--ui-motion-easing) !important;',
    ) &&
    !/data-pavp-admin-navigation-switch|navigationSwitch|switch-overflow/iu.test(
      snapshot.shellSource + snapshot.providerSource,
    )
  const hoverFormula =
    "'color-mix(in srgb, var(--ui-admin-navigation-selected) 6%, var(--ui-material-chrome-background))'"
  const selectedFormula =
    "'color-mix(in srgb, var(--ui-admin-navigation-selected) 16%, var(--ui-material-overlay-background))'"
  const selectedProjection =
    snapshot.themeSource.includes('itemColorHover: navigationHoverSurface') &&
    snapshot.themeSource.includes('itemColorActive: navigationSelectedSurface') &&
    snapshot.themeSource.includes('itemColorActiveHover: navigationSelectedSurface') &&
    snapshot.themeSource.includes('itemColorActiveCollapsed: navigationSelectedSurface') &&
    snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
    snapshot.themeSource.includes('optionColorActive: navigationSelectedSurface')
  const pressedSurfaceOverrideAbsent = !cssRuleBlocks(shellStyles).some(
    (rule) =>
      rule.selector.includes(':active::before') &&
      /\b(?:background|background-color)\s*:/iu.test(rule.declarations),
  )
  const wideCollapseControlOwned =
    normalizedShellScript.includes(
      'function toggleWideNavigation(): void { wideNavigationCollapsed.value = !wideNavigationCollapsed.value }',
    ) &&
    shellTemplate.includes('data-pavp-admin-navigation-collapse-control="header-trailing"') &&
    shellTemplate.includes('v-if="profile === \'wide\'"') &&
    shellTemplate.includes(':aria-label="wideNavigationCollapseLabel"') &&
    shellTemplate.includes('@click="toggleWideNavigation"') &&
    shellTemplate.includes('<PavpButtonPrimitive') &&
    shellTemplate.includes('attr-type="button"') &&
    shellTemplate.includes(':bordered="false"') &&
    shellTemplate.includes('type="tertiary"') &&
    shellTemplate.includes('<template #icon>') &&
    shellTemplate.includes('circle') &&
    !shellTemplate.includes(':title="wideNavigationCollapseLabel"') &&
    !shellStyles.includes('.pavp-admin-shell__header-navigation-toggle')
  const collapsedAndDropdownSelected =
    shellStyles.includes(
      ".pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active::before",
    ) &&
    shellStyles.includes(
      '.pavp-admin-navigation-dropdown .n-dropdown-option-body--active::before',
    ) &&
    shellStyles.includes('background: var(--n-item-color-active-collapsed);') &&
    shellStyles.includes('background: var(--n-option-color-active);')
  const runtime003AndAppearancePreserved =
    shellTemplate.includes('<Teleport to="#pavp-overlay-root">') &&
    shellTemplate.includes('aria-modal="true"') &&
    shellTemplate.includes('role="dialog"') &&
    shellTemplate.includes('@pointerdown="handleDrawerScrimPointerDown($event)"') &&
    shellScript.includes("to: '#pavp-overlay-root'") &&
    shellScript.includes('function handleDrawerKeydown(event: KeyboardEvent): void') &&
    snapshot.appearancePageSource.includes('grid-template-columns: repeat(4, minmax(0, 1fr));')
  const dynamicRootsIncludeOnlyRoutesAndMotionFeature =
    snapshot.checkBundleSource.includes('const expectedLazyRouteCount = 17') &&
    snapshot.checkBundleSource.includes('const expectedMotionFeatureDynamicRootCount = 1') &&
    snapshot.checkBundleSource.includes(
      'const expectedDynamicRootCount = expectedLazyRouteCount + expectedMotionFeatureDynamicRootCount',
    ) &&
    snapshot.checkBundleSource.includes(
      'const expectedDynamicRootKeys = new Set([...expectedLazyRouteKeys, motionFeatureManifestKey])',
    ) &&
    snapshot.checkBundleSource.includes('admin-navigation-motion-dom-max') &&
    snapshot.projectConfigSource.includes('adminNavigationMotionFeatureJavaScriptGzipBytes:') &&
    exactOccurrenceCount(snapshot.engineeringManifestSource, "{ id: '") === 5 &&
    snapshot.engineeringManifestSource.includes(
      "{ id: 'admin-navigation-motion-feature-javascript-gzip',",
    )

  return Object.freeze([
    {
      code: 'ADMIN_NAV_NATIVE_SINGLE_SIDER',
      passed: [...shellTemplate.matchAll(/<PavpLayoutSiderPrimitive(?=[\s>])/gu)].length === 1,
    },
    {
      code: 'ADMIN_NAV_NATIVE_SINGLE_MENU',
      passed: [...shellTemplate.matchAll(/<PavpMenuPrimitive(?=[\s>])/gu)].length === 1,
    },
    {
      code: 'ADMIN_NAV_NATIVE_SHARED_COLLAPSED_AUTHORITY',
      passed:
        exactOccurrenceCount(shellTemplate, ':collapsed="persistentNavigationCollapsed"') === 2 &&
        exactOccurrenceCount(shellScript, 'const persistentNavigationCollapsed = computed(') ===
          1 &&
        !/:collapsed="(?:false|true|wideNavigationCollapsed)"/u.test(shellTemplate) &&
        wideCollapseControlOwned,
    },
    {
      code: 'ADMIN_NAV_NATIVE_NO_DUPLICATE_PLANES',
      passed: !prohibitedDualPlanePattern.test(snapshot.shellSource),
    },
    {
      code: 'ADMIN_NAV_NATIVE_NO_CHROME_BRIDGE',
      passed: !prohibitedBridgePattern.test(snapshot.shellSource),
    },
    {
      code: 'ADMIN_NAV_NATIVE_NO_MAIN_COMPENSATION',
      passed: !prohibitedCompensationPattern.test(snapshot.shellSource),
    },
    {
      code: 'ADMIN_NAV_NATIVE_NO_EXTRA_REVEAL_DOM',
      passed: !prohibitedRevealPattern.test(snapshot.shellSource),
    },
    {
      code: 'ADMIN_NAV_NATIVE_NO_GSAP',
      passed:
        !snapshot.adminNavigationMotionAdapterPresent &&
        !/\bgsap\b/iu.test(sourceAndDependencyCorpus),
    },
    {
      code: 'ADMIN_NAV_NATIVE_SIDER_TRANSITION',
      passed: nativeTransitionOwner,
    },
    {
      code: 'ADMIN_NAV_NATIVE_HOVER_SURFACE',
      passed:
        exactOccurrenceCount(snapshot.themeSource, hoverFormula) === 1 &&
        snapshot.themeSource.includes('itemColorHover: navigationHoverSurface') &&
        snapshot.themeSource.includes('optionColorHover: navigationHoverSurface'),
    },
    {
      code: 'ADMIN_NAV_NATIVE_SELECTED_SURFACE',
      passed:
        exactOccurrenceCount(snapshot.themeSource, selectedFormula) === 1 &&
        selectedProjection &&
        pressedSurfaceOverrideAbsent,
    },
    {
      code: 'ADMIN_NAV_NATIVE_FULL_MOTION',
      passed: fullSurfaceOwner,
    },
    {
      code: 'ADMIN_NAV_NATIVE_REDUCED_MOTION',
      passed: reducedSurfaceOwner,
    },
    {
      code: 'ADMIN_NAV_NATIVE_NONE_MOTION',
      passed: noneSurfaceOwner,
    },
    {
      code: 'ADMIN_NAV_NATIVE_SELECTED_CLASS_HANDOFF',
      passed:
        shellTemplate.includes(':value="activeRouteName"') &&
        shellStyles.includes('.n-menu-item-content--selected::before') &&
        !prohibitedAnimationStatePattern.test(shellScript) &&
        pressedSurfaceOverrideAbsent,
    },
    {
      code: 'ADMIN_NAV_NATIVE_EXPANDED_ROOT_FOREGROUND_ONLY',
      passed:
        !snapshot.themeSource.includes('itemColorChildActive: navigationSelectedSurface') &&
        shellStyles.includes(
          ".pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active::before",
        ),
    },
    {
      code: 'ADMIN_NAV_NATIVE_COLLAPSED_AND_DROPDOWN_SELECTED',
      passed: collapsedAndDropdownSelected,
    },
    {
      code: 'ADMIN_NAV_NATIVE_NARROW_RUNTIME_003_APPEARANCE',
      passed: runtime003AndAppearancePreserved,
    },
    {
      code: 'ADMIN_NAV_NATIVE_ROUTE_COUNT',
      passed: snapshot.routeCount === 17,
    },
    {
      code: 'ADMIN_NAV_NATIVE_KERNEL_COUNT',
      passed: snapshot.runtimeKernelStepCount === 11,
    },
    {
      code: 'ADMIN_NAV_NATIVE_PROVIDER_IDS',
      passed: isDeepStrictEqual(snapshot.activeProviderIds, ['pinia', 'appearance']),
    },
    {
      code: 'ADMIN_NAV_NATIVE_STORAGE_COUNT',
      passed: snapshot.storageRecordCount === 2,
    },
    {
      code: 'ADMIN_NAV_NATIVE_SCOPED_MOTION_DEPENDENCIES',
      passed: scopedMotionDependencyClosure,
    },
    {
      code: 'ADMIN_NAV_NATIVE_DYNAMIC_ROOTS',
      passed: dynamicRootsIncludeOnlyRoutesAndMotionFeature,
    },
  ])
}

function adminNavigationNativeSourceViolations(
  snapshot: AdminNavigationNativeSourceSnapshot,
): string[] {
  return adminNavigationNativeSourceInvariantResults(snapshot)
    .filter((result) => !result.passed)
    .map((result) => result.code)
}

function adminNavigationCollapsedPopupInvariantResults(
  snapshot: AdminNavigationNativeSourceSnapshot,
): readonly Readonly<{ code: string; passed: boolean }>[] {
  const shellTemplate = templateContent(snapshot.shellSource)
  const shellScript = scriptContent(snapshot.shellSource)
  const shellStyles = styleContent(snapshot.shellSource)
  const menuOptionsStart = shellScript.indexOf('const navigationMenuOptions')
  const menuOptionsEnd = shellScript.indexOf('function toggleExpandedNavigationGroup')
  const rootKeydownStart = shellScript.indexOf('function handleRootNavigationKeydown')
  const rootKeydownEnd = shellScript.indexOf('function handleRouteNavigationKeydown')
  const dropdownPropsStart = shellScript.indexOf('const persistentNavigationDropdownProps')
  const dropdownPropsEnd = shellScript.indexOf('function handleNavigationValueUpdate')
  const menuOptionsSource = shellScript.slice(menuOptionsStart, menuOptionsEnd)
  const rootKeydownSource = shellScript.slice(rootKeydownStart, rootKeydownEnd)
  const dropdownPropsSource = shellScript.slice(dropdownPropsStart, dropdownPropsEnd)
  const shellRules = cssRuleBlocks(shellStyles)
  const popupPanelRules = shellRules.filter((rule) =>
    rule.selector.includes('.pavp-admin-navigation-dropdown.n-dropdown-menu'),
  )
  const popupPanelRule = popupPanelRules.find((rule) =>
    /\.pavp-admin-navigation-dropdown\.n-dropdown-menu\s*$/u.test(rule.selector.trim()),
  )
  const popupPanelDeclarations = popupPanelRule?.declarations ?? ''
  const popupOptionDecorationRules = shellRules.filter(
    (rule) =>
      rule.selector.includes('.pavp-admin-navigation-dropdown') &&
      rule.selector.includes('.n-dropdown-option') &&
      /\b(?:border(?:-[a-z-]+)?|outline|box-shadow)\s*:/iu.test(rule.declarations),
  )
  const popupNonSuppressionShadowRules = shellRules.filter(
    (rule) =>
      rule.selector.includes('.pavp-admin-navigation-dropdown') &&
      /\bbox-shadow\s*:/iu.test(rule.declarations) &&
      !/\bbox-shadow\s*:\s*none\s*;/iu.test(rule.declarations),
  )
  const popupBorderRules = shellRules.filter(
    (rule) =>
      rule.selector.includes('.pavp-admin-navigation-dropdown') &&
      /\bborder(?:-[a-z-]+)?\s*:/iu.test(rule.declarations),
  )
  const railPointerFocusDecorationRules = shellRules.filter(
    (rule) =>
      rule.selector.includes("[data-pavp-admin-navigation='persistent']") &&
      rule.selector.includes('.n-menu-item:hover') &&
      /\b(?:border(?:-[a-z-]+)?|outline|box-shadow)\s*:/iu.test(rule.declarations),
  )
  const railExtraSurfaceRules = shellRules.filter((rule) => {
    const persistentMenuItemRule =
      rule.selector.includes("[data-pavp-admin-navigation='persistent']") &&
      rule.selector.includes('.n-menu-item-content')
    const rejectedLocalSelectionDecorationResidueRule =
      rule.selector === "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::after" ||
      (rule.selector.includes('::after') &&
        (rule.selector.includes('[data-pavp-admin-selection-feedback=') ||
          rule.selector.includes("html[data-motion='none']")))

    return (
      persistentMenuItemRule &&
      ((rule.selector.includes('::after') && !rejectedLocalSelectionDecorationResidueRule) ||
        (/:(?:hover|active)/u.test(rule.selector) &&
          /\b(?:border(?:-[a-z-]+)?|outline|box-shadow)\s*:/iu.test(rule.declarations)))
    )
  })
  const railRejectedSelectionDecorationBaseRules = shellRules.filter(
    (rule) =>
      rule.selector === "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::after",
  )
  const nativeSourceResults = new Map(
    adminNavigationNativeSourceInvariantResults(snapshot).map((result) => [
      result.code,
      result.passed,
    ]),
  )
  const eventLocalHoverActivation =
    rootKeydownSource.includes("event.key === 'Enter' || event.key === ' '") ||
    shellScript.includes("return event.key === 'Enter' || event.key === ' '")
  const popupPeerStart = snapshot.themeSource.indexOf('      peers: {\n        Dropdown: {')
  const popupPeerEnd = snapshot.themeSource.indexOf('    Radio: {', popupPeerStart)
  const popupPeerSource = snapshot.themeSource.slice(popupPeerStart, popupPeerEnd)

  return Object.freeze([
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_ROOT_SUBMENUS',
      passed:
        nativeSourceResults.get('ADMIN_NAV_NATIVE_SINGLE_MENU') === true &&
        menuOptionsSource.includes('props.navigation.map((group) => {') &&
        menuOptionsSource.includes('children: group.items.map((item) => ({') &&
        menuOptionsSource.includes("pavpNavigationKind: 'group'") &&
        !/\b(?:rootLeaf|pavpRootRouteName)\b/iu.test(menuOptionsSource),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_NATIVE_HOVER',
      passed:
        dropdownPropsSource.includes("trigger: 'hover'") &&
        !dropdownPropsSource.includes("trigger: 'click'") &&
        /trigger:\s*"hover"\s*\n\s*\},\s*this\.menuProps\?\.dropdownProps,/u.test(
          snapshot.naiveSubmenuSource,
        ) &&
        snapshot.naivePopoverSource.includes('keepAliveOnHover: {') &&
        snapshot.naivePopoverSource.includes('default: true') &&
        snapshot.naivePopoverSource.includes('function handleMouseEnter()') &&
        snapshot.naivePopoverSource.includes('function handleMouseLeave()'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_OVERLAY_TARGET',
      passed:
        exactOccurrenceCount(dropdownPropsSource, "to: '#pavp-overlay-root'") === 1 &&
        !/\bto:\s*['"]body['"]/u.test(dropdownPropsSource) &&
        exactOccurrenceCount(shellTemplate, '<Teleport to="#pavp-overlay-root">') === 1,
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_RIGHT_START',
      passed:
        snapshot.naiveMenuChildSource.includes('if ("tmNodes" in props) return "right-start"') &&
        snapshot.naiveSubmenuSource.includes('placement: this.dropdownPlacement'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_KEYBOARD_OPEN',
      passed:
        rootKeydownSource.includes('if (persistentNavigationCollapsed.value)') &&
        rootKeydownSource.includes('event.currentTarget instanceof HTMLElement') &&
        rootKeydownSource.includes(
          "event.currentTarget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))",
        ) &&
        eventLocalHoverActivation &&
        shellScript.includes('tabindex: 0') &&
        !rootKeydownSource.includes('.click()'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_NATIVE_KEYBOARD_ESCAPE',
      passed:
        dropdownPropsSource.includes('keyboard: true') &&
        snapshot.naiveDropdownSource.includes('ArrowUp: {') &&
        snapshot.naiveDropdownSource.includes('ArrowDown: {') &&
        snapshot.naiveDropdownSource.includes('Enter: {') &&
        snapshot.naiveDropdownSource.includes('Escape: handleKeydownEsc') &&
        /function handleKeydownEsc\(\) \{\s*doUpdateShow\(false\);\s*\}/u.test(
          snapshot.naiveDropdownSource,
        ) &&
        !rootKeydownSource.includes('blur()'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_EVENT_LOCAL_ONLY',
      passed:
        !/\b(?:querySelector|getElementById|closest)\s*\(/u.test(
          `${rootKeydownSource}\n${dropdownPropsSource}`,
        ) &&
        !/\b(?:setTimeout|setInterval|requestAnimationFrame)\s*\(/u.test(
          `${rootKeydownSource}\n${dropdownPropsSource}`,
        ) &&
        !/\b(?:document|window|globalThis)\.addEventListener\s*\(/u.test(
          `${rootKeydownSource}\n${dropdownPropsSource}`,
        ),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_NO_TOOLTIP',
      passed:
        !/\b(?:NTooltip|Tooltip|title\s*:)/u.test(menuOptionsSource) &&
        !snapshot.naiveSubmenuSource.includes('Tooltip_default') &&
        !snapshot.naiveSubmenuSource.includes('menu-tooltip'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_RAIL_SINGLE_SURFACE',
      passed:
        railExtraSurfaceRules.length === 0 &&
        railRejectedSelectionDecorationBaseRules.length === 0 &&
        shellStyles.includes(
          "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
        ) &&
        !shellStyles.includes('.pavp-admin-navigation-dropdown .n-dropdown-option-body::after'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_HOVER_FORMULA',
      passed:
        nativeSourceResults.get('ADMIN_NAV_NATIVE_HOVER_SURFACE') === true &&
        snapshot.themeSource.includes('itemColorHover: navigationHoverSurface') &&
        snapshot.themeSource.includes('optionColorHover: navigationHoverSurface'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_SELECTED_FORMULA',
      passed:
        nativeSourceResults.get('ADMIN_NAV_NATIVE_SELECTED_SURFACE') === true &&
        snapshot.themeSource.includes('itemColorActiveHover: navigationSelectedSurface') &&
        snapshot.themeSource.includes('itemColorActiveCollapsed: navigationSelectedSurface') &&
        snapshot.themeSource.includes('optionColorActive: navigationSelectedSurface'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_FOCUS_VISIBLE_ONLY',
      passed:
        shellStyles.includes(
          "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
        ) &&
        !shellStyles.includes("[data-pavp-admin-navigation='persistent'] .n-menu-item:focus {") &&
        railPointerFocusDecorationRules.length === 0 &&
        popupOptionDecorationRules.length === 0,
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_SINGLE_PANEL',
      passed:
        popupPanelRules.length >= 1 &&
        popupPanelDeclarations.includes('box-sizing: border-box;') &&
        popupPanelDeclarations.includes('border-color: var(--ui-color-border-default);') &&
        popupPanelDeclarations.includes('border-style: solid;') &&
        popupPanelDeclarations.includes('border-width: var(--ui-admin-border-width);') &&
        !/\b(?:background|box-shadow|outline)\s*:/iu.test(popupPanelDeclarations) &&
        popupBorderRules.length === 1 &&
        popupNonSuppressionShadowRules.length === 0 &&
        popupPeerSource.includes('color: materialOverlay') &&
        exactOccurrenceCount(popupPeerSource, 'boxShadow: shadowOverlay') === 1,
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_RUNTIME_002',
      passed:
        exactOccurrenceCount(
          shellScript,
          'preserveCurrentPersistentNavigationFocus(event, routeName)',
        ) === 2 &&
        exactOccurrenceCount(
          shellScript,
          "'aria-current': routeName === props.activeRouteName ? 'page' : undefined",
        ) === 2 &&
        /routeName === props\.activeRouteName[\s\S]*?return/u.test(shellScript),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_PRESERVED_BOUNDARIES',
      passed:
        nativeSourceResults.get('ADMIN_NAV_NATIVE_SINGLE_SIDER') === true &&
        nativeSourceResults.get('ADMIN_NAV_NATIVE_SINGLE_MENU') === true &&
        nativeSourceResults.get('ADMIN_NAV_NATIVE_SHARED_COLLAPSED_AUTHORITY') === true &&
        nativeSourceResults.get('ADMIN_NAV_NATIVE_SIDER_TRANSITION') === true &&
        nativeSourceResults.get('ADMIN_NAV_NATIVE_NO_GSAP') === true &&
        nativeSourceResults.get('ADMIN_NAV_NATIVE_NARROW_RUNTIME_003_APPEARANCE') === true,
    },
  ])
}

function adminNavigationCollapsedPopupViolations(
  snapshot: AdminNavigationNativeSourceSnapshot,
): string[] {
  return adminNavigationCollapsedPopupInvariantResults(snapshot)
    .filter((result) => !result.passed)
    .map((result) => result.code)
}

function runAdminNavigationCollapsedPopupNegativeProbes(
  baseline: AdminNavigationNativeSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationCollapsedPopupViolations(baseline)
  const hoverActivation =
    "    event.currentTarget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))"
  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-collapsed-popup-restores-click-trigger',
      'ADMIN_NAV_COLLAPSED_POPUP_NATIVE_HOVER',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace("  trigger: 'hover',", "  trigger: 'click',"),
      },
    ],
    [
      'admin-navigation-collapsed-popup-removes-hover-trigger',
      'ADMIN_NAV_COLLAPSED_POPUP_NATIVE_HOVER',
      { ...baseline, shellSource: baseline.shellSource.replace("  trigger: 'hover',\n", '') },
    ],
    [
      'admin-navigation-collapsed-popup-removes-enter-space-opening',
      'ADMIN_NAV_COLLAPSED_POPUP_KEYBOARD_OPEN',
      { ...baseline, shellSource: baseline.shellSource.replace(`${hoverActivation}\n`, '') },
    ],
    [
      'admin-navigation-collapsed-popup-targets-body',
      'ADMIN_NAV_COLLAPSED_POPUP_OVERLAY_TARGET',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace("  to: '#pavp-overlay-root',", "  to: 'body',"),
      },
    ],
    [
      'admin-navigation-collapsed-popup-adds-tooltip-path',
      'ADMIN_NAV_COLLAPSED_POPUP_NO_TOOLTIP',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '      label: group.label,',
          '      label: group.label,\n      title: group.label, // NTooltip duplicate path',
        ),
      },
    ],
    [
      'admin-navigation-collapsed-popup-adds-second-rail-surface',
      'ADMIN_NAV_COLLAPSED_POPUP_RAIL_SINGLE_SURFACE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '</style>',
          "[data-pavp-admin-navigation='persistent'] .n-menu-item-content:hover::after { background: var(--ui-admin-navigation-hover); }\n</style>",
        ),
      },
    ],
    [
      'admin-navigation-collapsed-popup-shows-focus-ring-on-hover',
      'ADMIN_NAV_COLLAPSED_POPUP_FOCUS_VISIBLE_ONLY',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
          "[data-pavp-admin-navigation='persistent'] .n-menu-item:hover",
        ),
      },
    ],
    [
      'admin-navigation-collapsed-popup-stacks-hover-over-selected',
      'ADMIN_NAV_COLLAPSED_POPUP_SELECTED_FORMULA',
      {
        ...baseline,
        themeSource: baseline.themeSource.replace(
          'itemColorActiveHover: navigationSelectedSurface',
          'itemColorActiveHover: navigationHoverSurface',
        ),
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationCollapsedPopupViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function adminNavigationHeaderPlacementInvariantResults(
  snapshot: AdminNavigationNativeSourceSnapshot,
): readonly Readonly<{ code: string; passed: boolean }>[] {
  const projection = adminNavigationHeaderCollapseControlProjection(snapshot.shellSource)
  const parsedSfc = vueSfcCompiler.parse(snapshot.shellSource, { filename: shellSfcPath })
  const templateAst = parsedSfc.descriptor.template?.ast
  const templateElements =
    parsedSfc.errors.length === 0 && templateAst !== undefined
      ? collectShellTemplateElements(templateAst)
      : []
  const shellTemplate = templateContent(snapshot.shellSource)
  const shellScript = scriptContent(snapshot.shellSource)
  const normalizedShellScript = shellScript.replaceAll(/\s+/gu, ' ')
  const shellStyles = styleContent(snapshot.shellSource)
  const shellSourceFile = ts.createSourceFile(
    shellSfcPath,
    shellScript,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const shellInitializers = topLevelVariableInitializers(shellSourceFile)
  const shellCallables = topLevelCallables(shellSourceFile)
  const controlNode = projection.control?.node
  const controlClickExpressions =
    controlNode === undefined
      ? []
      : templateDirectives(controlNode, 'on', 'click').map((directive) =>
          normalizeTemplateExpression(directive.exp?.content),
        )
  const controlAriaLabelBindings =
    controlNode === undefined ? [] : templateDirectives(controlNode, 'bind', 'aria-label')
  const controlAuthorityButtons = templateElements.filter((element) =>
    templateDirectives(element.node, 'on', 'click').some((directive) =>
      /^toggleWideNavigation(?:\(\))?$/u.test(normalizeTemplateExpression(directive.exp?.content)),
    ),
  )
  const stateWritingTemplateEvents = templateElements.flatMap((element) =>
    templateDirectives(element.node, 'on')
      .filter((directive) => {
        const expression = normalizeTemplateExpression(directive.exp?.content)
        return (
          expression.length > 0 &&
          templateEventExpressionWritesRef(expression, 'wideNavigationCollapsed', shellCallables)
        )
      })
      .map((directive) => ({ directive, element })),
  )
  const soleTemplateStateWriter =
    stateWritingTemplateEvents.length === 1 ? stateWritingTemplateEvents[0] : undefined
  const siderNodes = templateElements.filter(
    (element) => element.node.tag === 'PavpLayoutSiderPrimitive',
  )
  const menuNodes = templateElements.filter((element) => element.node.tag === 'PavpMenuPrimitive')
  const runtimeSingleSiderMenu =
    siderNodes.length === 1 &&
    menuNodes.length === 1 &&
    [...siderNodes, ...menuNodes].every((element) =>
      [...element.ancestors, element.node].every(
        (node) => templateDirectives(node, 'for').length === 0,
      ),
    )
  const collapsedRefAuthorities = [
    ...shellScript.matchAll(/\bconst\s+([A-Za-z_$][\w$]*Collapsed)\s*=\s*ref\s*\(/gu),
  ].map((match) => match[1])
  const exactToggleAuthority = normalizedShellScript.includes(
    'function toggleWideNavigation(): void { wideNavigationCollapsed.value = !wideNavigationCollapsed.value }',
  )
  const toggleDeclaration = functionDeclaration(shellSourceFile, 'toggleWideNavigation')
  const uniqueScriptStateWriter =
    toggleDeclaration !== undefined &&
    refValueWriteCount(shellSourceFile, 'wideNavigationCollapsed') === 1 &&
    refValueWriteCount(toggleDeclaration, 'wideNavigationCollapsed') === 1 &&
    shellSourceFile.statements.every(
      (statement) =>
        statement === toggleDeclaration ||
        !nodeOrCalledFunctionWritesRef(statement, 'wideNavigationCollapsed', shellCallables),
    )
  const uniqueTemplateStateWriter =
    soleTemplateStateWriter !== undefined &&
    controlNode !== undefined &&
    staticTemplateAttribute(
      soleTemplateStateWriter.element.node,
      'data-pavp-admin-navigation-collapse-control',
    ) === 'header-trailing' &&
    soleTemplateStateWriter.directive.arg?.content === 'click' &&
    normalizeTemplateExpression(soleTemplateStateWriter.directive.exp?.content) ===
      'toggleWideNavigation'
  const exactCollapsedProjection = normalizedShellScript.includes(
    "const persistentNavigationCollapsed = computed(() => { if (profile.value === 'regular') { return true } return profile.value === 'wide' && wideNavigationCollapsed.value })",
  )
  const exactDynamicLabels =
    computedBooleanLabelMatches(
      shellInitializers.get('wideNavigationCollapseLabel'),
      'wideNavigationCollapsed',
      '展开导航',
      '收起导航',
    ) &&
    exactOccurrenceCount(shellScript, "'展开导航'") === 1 &&
    exactOccurrenceCount(shellScript, "'收起导航'") === 1
  const noBottomContainer =
    !/pavp-admin-shell__(?:navigation-control|collapse-action|collapse-icon)|collapse-dock|bottom-dock|bottom-control/iu.test(
      `${shellTemplate}\n${shellStyles}`,
    ) && !shellStyles.includes('grid-template-rows: minmax(0, 1fr) auto;')
  const noSettingsPlaceholder =
    !/settings-entry|settings-placeholder|navigation-settings|i-lucide-settings|设置/iu.test(
      shellTemplate,
    )
  const nativeInvariantResults = new Map(
    adminNavigationNativeSourceInvariantResults(snapshot).map((result) => [
      result.code,
      result.passed,
    ]),
  )
  const narrowTriggerPreserved =
    /<button\s+[\s\S]*?v-if="profile === 'narrow'"[\s\S]*?ref="navigationTrigger"[\s\S]*?aria-label="打开架构导航"[\s\S]*?@click="openNavigation"[\s\S]*?>\s*导航\s*<\/button>/u.test(
      shellTemplate,
    )
  const narrowDrawerPreserved = [
    '<Teleport to="#pavp-overlay-root">',
    'v-if="profile === \'narrow\' && navigationOpen"',
    '@pointerdown="handleDrawerScrimPointerDown($event)"',
    'aria-modal="true"',
    'role="dialog"',
    '@keydown="handleDrawerKeydown"',
    ':inert="profile === \'narrow\' && navigationOpen"',
  ].every((marker) => shellTemplate.includes(marker))

  return Object.freeze([
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_SINGLE_CONTROL',
      passed:
        projection.controlElements.length === 1 &&
        controlNode?.tag === 'PavpButtonPrimitive' &&
        staticTemplateAttribute(controlNode, 'attr-type') === 'button',
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_HEADER_TRAILING_DESCENDANT',
      passed: projection.headerTrailingDescendant,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_FORBIDDEN_ANCESTRY_ABSENT',
      passed: projection.forbiddenAncestryAbsent,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_WIDE_ONLY',
      passed: projection.wideOnly,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_STATE_AUTHORITY',
      passed:
        isDeepStrictEqual(controlClickExpressions, ['toggleWideNavigation']) &&
        exactToggleAuthority &&
        uniqueScriptStateWriter &&
        uniqueTemplateStateWriter &&
        isDeepStrictEqual(collapsedRefAuthorities, ['wideNavigationCollapsed']) &&
        !/\b(?:localStorage|sessionStorage|setItem|useStorage)\b/u.test(shellScript),
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_ACCESSIBLE_LABELS',
      passed:
        exactDynamicLabels &&
        controlAriaLabelBindings.length === 1 &&
        normalizeTemplateExpression(controlAriaLabelBindings[0]?.exp?.content) ===
          'wideNavigationCollapseLabel' &&
        controlNode?.tag === 'PavpButtonPrimitive' &&
        staticTemplateAttribute(controlNode, 'attr-type') === 'button',
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_BOTTOM_CONTAINER_ABSENT',
      passed: noBottomContainer,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_NO_DUPLICATE_OWNER',
      passed:
        controlAuthorityButtons.length === 1 &&
        exactOccurrenceCount(shellTemplate, '@click="toggleWideNavigation"') === 1 &&
        exactOccurrenceCount(shellTemplate, ':aria-label="wideNavigationCollapseLabel"') === 1 &&
        exactOccurrenceCount(
          shellTemplate,
          'data-pavp-admin-navigation-icon-state="sidebar-expanded"',
        ) === 1 &&
        exactOccurrenceCount(
          shellTemplate,
          'data-pavp-admin-navigation-icon-state="sidebar-collapsed"',
        ) === 1,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_SETTINGS_PLACEHOLDER_ABSENT',
      passed: noSettingsPlaceholder,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_SINGLE_NATIVE_SIDER_MENU',
      passed: runtimeSingleSiderMenu,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_SHARED_COLLAPSED_AUTHORITY',
      passed:
        runtimeSingleSiderMenu &&
        singleBoundExpression(siderNodes[0]?.node ?? { type: 0 }, 'collapsed') ===
          'persistentNavigationCollapsed' &&
        singleBoundExpression(menuNodes[0]?.node ?? { type: 0 }, 'collapsed') ===
          'persistentNavigationCollapsed' &&
        exactOccurrenceCount(shellScript, 'const persistentNavigationCollapsed = computed(') ===
          1 &&
        exactCollapsedProjection &&
        !/:collapsed="(?:false|true|wideNavigationCollapsed)"/u.test(shellTemplate),
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_NO_GSAP_OR_LAYOUT_BRIDGE',
      passed:
        nativeInvariantResults.get('ADMIN_NAV_NATIVE_NO_GSAP') === true &&
        nativeInvariantResults.get('ADMIN_NAV_NATIVE_NO_CHROME_BRIDGE') === true &&
        nativeInvariantResults.get('ADMIN_NAV_NATIVE_NO_MAIN_COMPENSATION') === true,
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_REGULAR_NARROW_PRESERVED',
      passed:
        exactCollapsedProjection &&
        projection.headerProfileIndependent &&
        projection.identityProfileIndependent &&
        projection.narrowTriggerProfileIndependent &&
        projection.wideOnly &&
        shellTemplate.includes(':has-sider="profile !== \'narrow\'"') &&
        shellTemplate.includes('v-if="profile !== \'narrow\'"') &&
        narrowTriggerPreserved &&
        narrowDrawerPreserved,
    },
  ])
}

function adminNavigationHeaderPlacementViolations(
  snapshot: AdminNavigationNativeSourceSnapshot,
): string[] {
  return adminNavigationHeaderPlacementInvariantResults(snapshot)
    .filter((result) => !result.passed)
    .map((result) => result.code)
}

function replaceExactOnce(source: string, search: string, replacement: string): string {
  return search.length > 0 && exactOccurrenceCount(source, search) === 1
    ? source.replace(search, replacement)
    : source
}

function insertBeforePersistentNavigationEnd(source: string, insertion: string): string {
  const menuStart = source.indexOf('<PavpMenuPrimitive')
  const persistentNavigationEnd = menuStart === -1 ? -1 : source.indexOf('</nav>', menuStart)

  if (persistentNavigationEnd === -1) {
    return source
  }

  return `${source.slice(0, persistentNavigationEnd)}${insertion}${source.slice(persistentNavigationEnd)}`
}

function runAdminNavigationHeaderPlacementNegativeProbes(
  baseline: AdminNavigationNativeSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationHeaderPlacementViolations(baseline)
  const projection = adminNavigationHeaderCollapseControlProjection(baseline.shellSource)
  const withoutControl = replaceExactOnce(baseline.shellSource, projection.controlSource, '')
  const movedInsideSiderSource =
    withoutControl === baseline.shellSource
      ? baseline.shellSource
      : insertBeforePersistentNavigationEnd(
          withoutControl,
          `\n          ${projection.controlSource}\n        `,
        )
  const duplicatedControlSource = replaceExactOnce(
    baseline.shellSource,
    projection.controlSource,
    `${projection.controlSource}\n      ${projection.controlSource}`,
  )
  const outsideWideConditionSource = replaceExactOnce(
    baseline.shellSource,
    projection.wideConditionSource,
    projection.wideConditionSource.replace("profile === 'wide'", "profile !== 'wide'"),
  )
  const dynamicAriaLabelRemovedSource = replaceExactOnce(
    baseline.shellSource,
    projection.ariaLabelBindingSource,
    '',
  )
  const bottomDockRestoredSource = insertBeforePersistentNavigationEnd(
    baseline.shellSource,
    '\n          <div class="pavp-admin-shell__navigation-control"></div>\n        ',
  )
  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-header-collapse-moved-back-inside-sider',
      'ADMIN_NAV_HEADER_COLLAPSE_FORBIDDEN_ANCESTRY_ABSENT',
      { ...baseline, shellSource: movedInsideSiderSource },
    ],
    [
      'admin-navigation-header-collapse-control-duplicated',
      'ADMIN_NAV_HEADER_COLLAPSE_NO_DUPLICATE_OWNER',
      { ...baseline, shellSource: duplicatedControlSource },
    ],
    [
      'admin-navigation-header-collapse-rendered-outside-wide',
      'ADMIN_NAV_HEADER_COLLAPSE_WIDE_ONLY',
      { ...baseline, shellSource: outsideWideConditionSource },
    ],
    [
      'admin-navigation-header-collapse-dynamic-aria-label-removed',
      'ADMIN_NAV_HEADER_COLLAPSE_ACCESSIBLE_LABELS',
      { ...baseline, shellSource: dynamicAriaLabelRemovedSource },
    ],
    [
      'admin-navigation-header-collapse-bottom-dock-restored',
      'ADMIN_NAV_HEADER_COLLAPSE_BOTTOM_CONTAINER_ABSENT',
      { ...baseline, shellSource: bottomDockRestoredSource },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationHeaderPlacementViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function runAdminNavigationNativeSourceNegativeProbes(
  baseline: AdminNavigationNativeSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationNativeSourceViolations(baseline)
  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-native-adds-second-sider',
      'ADMIN_NAV_NATIVE_SINGLE_SIDER',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '<PavpLayoutSiderPrimitive',
          '<PavpLayoutSiderPrimitive><PavpLayoutSiderPrimitive',
        ),
      },
    ],
    [
      'admin-navigation-native-adds-second-menu',
      'ADMIN_NAV_NATIVE_SINGLE_MENU',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '<PavpMenuPrimitive',
          '<PavpMenuPrimitive><PavpMenuPrimitive',
        ),
      },
    ],
    [
      'admin-navigation-native-splits-collapsed-authority',
      'ADMIN_NAV_NATIVE_SHARED_COLLAPSED_AUTHORITY',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          ':collapsed="persistentNavigationCollapsed"',
          ':collapsed="wideNavigationCollapsed"',
        ),
      },
    ],
    [
      'admin-navigation-native-restores-duplicate-plane',
      'ADMIN_NAV_NATIVE_NO_DUPLICATE_PLANES',
      { ...baseline, shellSource: baseline.shellSource + '\nnavigation-plane--expanded' },
    ],
    [
      'admin-navigation-native-restores-chrome-bridge',
      'ADMIN_NAV_NATIVE_NO_CHROME_BRIDGE',
      { ...baseline, shellSource: baseline.shellSource + '\nnavigationChromeBridge' },
    ],
    [
      'admin-navigation-native-restores-main-content-compensation',
      'ADMIN_NAV_NATIVE_NO_MAIN_COMPENSATION',
      { ...baseline, shellSource: baseline.shellSource + '\nmainContentPlane' },
    ],
    [
      'admin-navigation-native-restores-route-aura',
      'ADMIN_NAV_NATIVE_NO_EXTRA_REVEAL_DOM',
      { ...baseline, shellSource: baseline.shellSource + '\nroute-selection-aura' },
    ],
    [
      'admin-navigation-native-restores-gsap-import',
      'ADMIN_NAV_NATIVE_NO_GSAP',
      {
        ...baseline,
        adminNavigationMotionAdapterPresent: true,
        applicationSource: baseline.applicationSource + "\nimport { gsap } from 'gsap'",
      },
    ],
    [
      'admin-navigation-native-suppresses-native-sider-transition',
      'ADMIN_NAV_NATIVE_SIDER_TRANSITION',
      {
        ...baseline,
        providerSource: baseline.providerSource.replace(
          "[data-pavp-admin-navigation='persistent'] .n-layout-sider,",
          "[data-pavp-admin-navigation-switch='active'] .n-layout-sider,",
        ),
      },
    ],
    [
      'admin-navigation-native-hover-strength-drift',
      'ADMIN_NAV_NATIVE_HOVER_SURFACE',
      { ...baseline, themeSource: baseline.themeSource.replace(' 6%,', ' 7%,') },
    ],
    [
      'admin-navigation-native-selected-strength-drift',
      'ADMIN_NAV_NATIVE_SELECTED_SURFACE',
      { ...baseline, themeSource: baseline.themeSource.replace(' 16%,', ' 15%,') },
    ],
    [
      'admin-navigation-native-expands-full-motion-properties',
      'ADMIN_NAV_NATIVE_FULL_MOTION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          'transition-property: background-color, opacity;',
          'transition-property: background-color, filter, opacity;',
        ),
        providerSource: baseline.providerSource.replace(
          'transition-property: background-color, opacity, transform !important;',
          'transition-property: background-color, filter, opacity, transform !important;',
        ),
      },
    ],
    [
      'admin-navigation-native-restores-reduced-transform',
      'ADMIN_NAV_NATIVE_REDUCED_MOTION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='reduced']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before {\n  transform: none;\n  transition-duration: var(--ui-motion-duration);\n  transition-property: background-color, opacity;",
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='reduced']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before {\n  transform: scale(0.98);\n  transition-duration: var(--ui-motion-duration);\n  transition-property: background-color, opacity;",
        ),
      },
    ],
    [
      'admin-navigation-native-restores-none-transition',
      'ADMIN_NAV_NATIVE_NONE_MOTION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          'animation: none;\n  transform: none;\n  transition: none;',
          'animation: none;\n  transform: scale(0.98);\n  transition: opacity var(--ui-motion-duration);',
        ),
        providerSource: baseline.providerSource.replace(
          "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body::before\n  ) {\n  transform: none !important;\n}",
          "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body::before\n  ) {\n  transform: scale(0.98) !important;\n}",
        ),
      },
    ],
    [
      'admin-navigation-native-adds-shared-route-animation-state',
      'ADMIN_NAV_NATIVE_SELECTED_CLASS_HANDOFF',
      {
        ...baseline,
        shellSource: baseline.shellSource
          .replace('</script>', 'const routeMotionIntent = ref()\n</script>')
          .replace(
            '</style>',
            '.n-menu-item-content:active::before { background: var(--ui-material-overlay-background); }\n</style>',
          ),
      },
    ],
    [
      'admin-navigation-native-fills-expanded-parent',
      'ADMIN_NAV_NATIVE_EXPANDED_ROOT_FOREGROUND_ONLY',
      {
        ...baseline,
        themeSource: baseline.themeSource + '\nitemColorChildActive: navigationSelectedSurface,',
      },
    ],
    [
      'admin-navigation-native-hides-collapsed-selected-surface',
      'ADMIN_NAV_NATIVE_COLLAPSED_AND_DROPDOWN_SELECTED',
      {
        ...baseline,
        shellSource: baseline.shellSource.replaceAll(
          ".pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active::before",
          "[data-probe-collapsed-selected='hidden']",
        ),
      },
    ],
    [
      'admin-navigation-native-regresses-narrow-appearance-contract',
      'ADMIN_NAV_NATIVE_NARROW_RUNTIME_003_APPEARANCE',
      {
        ...baseline,
        appearancePageSource: baseline.appearancePageSource.replace(
          'grid-template-columns: repeat(4, minmax(0, 1fr));',
          'grid-template-columns: repeat(5, minmax(0, 1fr));',
        ),
      },
    ],
    [
      'admin-navigation-native-route-count-drift',
      'ADMIN_NAV_NATIVE_ROUTE_COUNT',
      { ...baseline, routeCount: 18 },
    ],
    [
      'admin-navigation-native-kernel-count-drift',
      'ADMIN_NAV_NATIVE_KERNEL_COUNT',
      { ...baseline, runtimeKernelStepCount: 10 },
    ],
    [
      'admin-navigation-native-provider-id-drift',
      'ADMIN_NAV_NATIVE_PROVIDER_IDS',
      { ...baseline, activeProviderIds: ['pinia'] },
    ],
    [
      'admin-navigation-native-storage-count-drift',
      'ADMIN_NAV_NATIVE_STORAGE_COUNT',
      { ...baseline, storageRecordCount: 3 },
    ],
    [
      'admin-navigation-native-adds-unadmitted-animation-dependency',
      'ADMIN_NAV_NATIVE_SCOPED_MOTION_DEPENDENCIES',
      {
        ...baseline,
        uiManifestSource: baseline.uiManifestSource.replace(
          '"naive-ui": "catalog:"',
          '"gsap": "catalog:",\n    "naive-ui": "catalog:"',
        ),
      },
    ],
    [
      'admin-navigation-native-drifts-motion-dynamic-root-set',
      'ADMIN_NAV_NATIVE_DYNAMIC_ROOTS',
      {
        ...baseline,
        checkBundleSource: baseline.checkBundleSource.replace(
          'const expectedLazyRouteCount = 17',
          'const expectedLazyRouteCount = 18',
        ),
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationNativeSourceViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function adminNavigationExpansionMotionInvariantResults(
  snapshot: AdminNavigationNativeSourceSnapshot,
): readonly Readonly<{ code: string; passed: boolean }>[] {
  const parsedShell = vueSfcCompiler.parse(snapshot.shellSource, { filename: shellSfcPath })
  const shellTemplateAst = parsedShell.descriptor.template?.ast
  const shellElements =
    parsedShell.errors.length === 0 && shellTemplateAst !== undefined
      ? collectShellTemplateElements(shellTemplateAst)
      : []
  const shellTemplate = templateContent(snapshot.shellSource)
  const shellScript = scriptContent(snapshot.shellSource)
  const normalizedShellScript = shellScript.replaceAll(/\s+/gu, ' ')
  const shellStyles = styleContent(snapshot.shellSource)
  const providerStyles = styleContent(snapshot.providerSource)
  const shellSourceFile = ts.createSourceFile(
    shellSfcPath,
    shellScript,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const shellInitializers = topLevelVariableInitializers(shellSourceFile)
  const shellCallables = topLevelCallables(shellSourceFile)
  const menuNodes = shellElements.filter((element) => element.node.tag === 'PavpMenuPrimitive')
  const menuNode = menuNodes.length === 1 ? menuNodes[0]?.node : undefined
  const expandedKeysBinding =
    menuNode === undefined ? undefined : singleBoundExpression(menuNode, 'expanded-keys')
  const validExpandedInitializer = shellInitializers.get('validExpandedNavigationGroupKeys')
  const validExpandedClosure =
    validExpandedInitializer === undefined
      ? []
      : expressionDependencyClosure(validExpandedInitializer, shellInitializers)
  const watchCalls: ts.CallExpression[] = []
  function collectWatchCalls(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'watch'
    ) {
      watchCalls.push(node)
    }
    ts.forEachChild(node, collectWatchCalls)
  }
  collectWatchCalls(shellSourceFile)
  const expansionWritingWatchCalls = watchCalls.filter((call) =>
    call.arguments
      .slice(1)
      .some((argument) =>
        nodeOrCalledFunctionWritesRef(argument, 'expandedNavigationGroupKeys', shellCallables),
      ),
  )
  const routeWatch =
    expansionWritingWatchCalls.length === 1 ? expansionWritingWatchCalls[0] : undefined
  const routeWatchSource = routeWatch?.getText(shellSourceFile).replaceAll(/\s+/gu, ' ') ?? ''
  const routeWatchGetterSource =
    routeWatch?.arguments[0]?.getText(shellSourceFile).replaceAll(/\s+/gu, ' ') ?? ''
  const routeWatchContract =
    routeWatchGetterSource === '() => props.activeRouteName' &&
    routeWatchSource.includes('(activeRouteName, previousActiveRouteName') &&
    routeWatchSource.includes('if (activeRouteName === previousActiveRouteName) { return }') &&
    routeWatchSource.includes(
      'const activeGroup = props.navigation.find((group) => group.items.some((item) => item.routeName === activeRouteName), )',
    ) &&
    routeWatchSource.includes('if (activeGroup === undefined) { return }') &&
    routeWatchSource.includes('const groupKey = navigationGroupKey(activeGroup.id)') &&
    routeWatchSource.includes('if (!validExpandedNavigationGroupKeys.value.includes(groupKey))') &&
    routeWatchSource.includes(
      'expandedNavigationGroupKeys.value = [...validExpandedNavigationGroupKeys.value, groupKey]',
    ) &&
    !/\b(?:nextTick|setTimeout|setInterval|requestAnimationFrame|querySelector|getElementById)\b/u.test(
      routeWatchSource,
    )
  const expansionWatchSourcesAreExact =
    expansionWritingWatchCalls.length === 1 &&
    !watchCalls.some((call) => {
      const getterSource = call.arguments[0]?.getText(shellSourceFile) ?? ''
      return /expandedNavigationGroupKeys|validExpandedNavigationGroupKeys/u.test(getterSource)
    })

  const headers = shellElements.filter(
    (element) =>
      element.node.tag === 'header' &&
      hasStaticTemplateClass(element.node, 'pavp-admin-shell__header') &&
      staticTemplateAttribute(element.node, 'data-shell-region') === 'architecture-console-header',
  )
  const header = headers.length === 1 ? headers[0] : undefined
  const groupControlElements = shellElements.filter(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-groups-control') ===
      'header-trailing',
  )
  const groupControl = groupControlElements.length === 1 ? groupControlElements[0] : undefined
  const groupControlNode = groupControl?.node
  const groupControlSource = groupControlNode?.loc?.source ?? ''
  const groupControlHeaderIndex =
    groupControl === undefined || header === undefined
      ? -1
      : groupControl.ancestors.indexOf(header.node)
  const groupControlPath =
    groupControl === undefined || header === undefined || groupControlHeaderIndex === -1
      ? []
      : [...groupControl.ancestors.slice(groupControlHeaderIndex + 1), groupControl.node]
  const groupControlVisibilityExpressions = groupControlPath.flatMap((node) =>
    ['if', 'else-if', 'show'].flatMap((directiveName) =>
      templateDirectives(node, directiveName).map((directive) =>
        normalizeTemplateExpression(directive.exp?.content),
      ),
    ),
  )
  const groupControlForbiddenAncestryAbsent =
    groupControl !== undefined &&
    !groupControl.ancestors.some(
      (ancestor) =>
        ancestor.tag === 'PavpLayoutSiderPrimitive' ||
        ancestor.tag === 'PavpMenuPrimitive' ||
        hasStaticTemplateClass(ancestor, 'pavp-admin-shell__drawer-navigation') ||
        (ancestor.tag === 'nav' && staticTemplateAttribute(ancestor, 'aria-label') === '架构导航'),
    )
  const groupControlClickExpressions =
    groupControlNode === undefined
      ? []
      : templateDirectives(groupControlNode, 'on', 'click').map((directive) =>
          normalizeTemplateExpression(directive.exp?.content),
        )
  const groupControlAriaBindings =
    groupControlNode === undefined ? [] : templateDirectives(groupControlNode, 'bind', 'aria-label')
  const toggleAllDeclaration = functionDeclaration(shellSourceFile, 'toggleAllNavigationGroups')
  const normalizedToggleAllSource =
    toggleAllDeclaration?.getText(shellSourceFile).replaceAll(/\s+/gu, ' ') ?? ''
  const toggleAllExactStateAuthority =
    normalizedToggleAllSource ===
      'function toggleAllNavigationGroups(): void { expandedNavigationGroupKeys.value = allNavigationGroupsExpanded.value ? [] : [...navigationGroupKeys.value] }' &&
    toggleAllDeclaration !== undefined &&
    refValueWriteCount(toggleAllDeclaration, 'expandedNavigationGroupKeys') === 1 &&
    refValueWriteCount(toggleAllDeclaration, 'wideNavigationCollapsed') === 0 &&
    !/\b(?:route|router|focus|appearance|storage|localStorage|sessionStorage)\b/iu.test(
      normalizedToggleAllSource,
    )
  const exactGroupControlLabels =
    computedBooleanLabelMatches(
      shellInitializers.get('navigationGroupsToggleLabel'),
      'allNavigationGroupsExpanded',
      '折叠全部菜单',
      '展开全部菜单',
    ) &&
    exactOccurrenceCount(shellScript, "'折叠全部菜单'") === 1 &&
    exactOccurrenceCount(shellScript, "'展开全部菜单'") === 1 &&
    groupControlAriaBindings.length === 1 &&
    normalizeTemplateExpression(groupControlAriaBindings[0]?.exp?.content) ===
      'navigationGroupsToggleLabel' &&
    exactOccurrenceCount(shellTemplate, '{{ navigationGroupsToggleLabel }}') === 1 &&
    !groupControlSource.includes('title=')
  const groupControlNaiveButton =
    groupControlNode?.tag === 'PavpButtonPrimitive' &&
    staticTemplateAttribute(groupControlNode, 'attr-type') === 'button' &&
    staticTemplateAttribute(groupControlNode, 'type') === 'tertiary' &&
    singleBoundExpression(groupControlNode, 'bordered') === 'false' &&
    templateAttributes(groupControlNode, 'circle').length === 1 &&
    templateAttributes(groupControlNode, 'quaternary').length === 0 &&
    hasStaticTemplateClass(groupControlNode, 'pavp-admin-shell__header-action') &&
    hasStaticTemplateClass(groupControlNode, 'min-h-target-enhanced') &&
    hasStaticTemplateClass(groupControlNode, 'min-w-target-enhanced') &&
    groupControlSource.includes('data-pavp-admin-navigation-icon-state="groups-expanded"') &&
    groupControlSource.includes('data-pavp-admin-navigation-icon-state="groups-collapsed"')

  const fullVendorMotionCoverage =
    snapshot.providerSource.includes(
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
    ) &&
    snapshot.providerSource.includes(
      'transition-duration: var(--ui-motion-duration) !important;',
    ) &&
    snapshot.providerSource.includes(
      'transition-timing-function: var(--ui-motion-easing) !important;',
    ) &&
    snapshot.providerSource.includes(
      'transition-property: background-color, opacity, transform !important;',
    ) &&
    [
      '.n-menu-item-content__icon',
      '.n-menu-item-content__arrow',
      '.n-menu-item-content-header',
      '.n-submenu-children',
      '.pavp-admin-navigation-dropdown',
      '.n-dropdown-option-body',
      '.n-dropdown-option-body__prefix',
    ].every((marker) => snapshot.providerSource.includes(marker)) &&
    snapshot.providerSource.includes(
      "html[data-motion='full'] .pavp-admin-shell__header-action-icon-state",
    )
  const reducedVendorMotionCoverage =
    snapshot.providerSource.includes(
      "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
    ) &&
    snapshot.providerSource.includes(
      'transition-duration: calc(var(--ui-motion-duration) / 2) !important;',
    ) &&
    (snapshot.providerSource.includes(
      'transition-property: background-color, opacity !important;',
    ) ||
      (shellStyles.includes(
        "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
      ) &&
        shellStyles.includes('transition-property: background-color, opacity;'))) &&
    snapshot.providerSource.includes('transition-property: color, opacity !important;') &&
    snapshot.providerSource.includes(
      'transition-property: background-color, color, opacity !important;',
    ) &&
    snapshot.providerSource.includes(
      "html[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from",
    ) &&
    snapshot.providerSource.includes('transform: none !important;') &&
    snapshot.providerSource.includes(
      "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state",
    )
  const motionNoneRules = cssRuleBlocks(`${providerStyles}\n${shellStyles}`).filter((rule) =>
    rule.selector.includes("html[data-motion='none']"),
  )
  const motionNoneRulesSafe =
    motionNoneRules.length > 0 &&
    motionNoneRules.every((rule) => {
      const transitionValues = [
        ...rule.declarations.matchAll(/\btransition\s*:\s*([^;]+);/giu),
      ].map((match) => match[1]?.replaceAll('!important', '').trim())
      const animationValues = [...rule.declarations.matchAll(/\banimation\s*:\s*([^;]+);/giu)].map(
        (match) => match[1]?.replaceAll('!important', '').trim(),
      )
      const transformValues = [...rule.declarations.matchAll(/\btransform\s*:\s*([^;]+);/giu)].map(
        (match) => match[1]?.replaceAll('!important', '').trim(),
      )

      return (
        transitionValues.every((value) => value === 'none') &&
        animationValues.every((value) => value === 'none') &&
        transformValues.every((value) => value === 'none')
      )
    })
  const noneVendorMotionCoverage =
    snapshot.providerSource.includes(
      "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
    ) &&
    snapshot.providerSource.includes('animation: none !important;') &&
    snapshot.providerSource.includes('transition: none !important;') &&
    snapshot.providerSource.includes(
      '.n-submenu-children.fade-in-height-expand-transition-enter-active',
    ) &&
    snapshot.providerSource.includes('opacity: 1 !important;') &&
    snapshot.providerSource.includes(
      "html[data-motion='none'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from",
    ) &&
    snapshot.providerSource.includes(
      "html[data-motion='none'] .pavp-admin-shell__header-action-icon-state",
    ) &&
    !motionNoneRules.some(
      (rule) =>
        rule.selector.includes('.n-menu-item-content__arrow') &&
        /\btransform\s*:/iu.test(rule.declarations),
    ) &&
    motionNoneRulesSafe
  const motionCssCorpus = `${providerStyles}\n${shellStyles}`
  const tokenizedMotionAllowlist =
    !/\btransition\s*:\s*all\b/iu.test(motionCssCorpus) &&
    !/\btransition-(?:duration|timing-function)\s*:\s*(?:\d|\.)/iu.test(motionCssCorpus) &&
    !/\btransition-timing-function\s*:\s*(?:cubic-bezier|linear|ease(?:-in|-out|-in-out)?)(?:\(|\s*;)/iu.test(
      motionCssCorpus,
    ) &&
    !/transition-property\s*:[^;]*(?:filter|backdrop-filter)/iu.test(motionCssCorpus)

  const routeCorpus = `${snapshot.appSource}\n${snapshot.consoleFrameSource}`
  const routeHostOpenTag = /<div\b[^>]*class="pavp-route-content"[^>]*>/u.exec(
    snapshot.appSource,
  )?.[0]
  const routeStyleRules = cssRuleBlocks(snapshot.appStylesSource).filter((rule) =>
    rule.selector.includes('.pavp-route-content'),
  )
  const singleRouterView = exactOccurrenceCount(routeCorpus, '<RouterView') === 1
  const stableUnkeyedRouteHost =
    routeHostOpenTag !== undefined &&
    !/(?:^|\s)(?::)?key\s*=/u.test(routeHostOpenTag) &&
    exactOccurrenceCount(snapshot.appSource, '<div class="pavp-route-content">') === 1 &&
    !/<component\b[^>]*(?:^|\s)(?::)?key\s*=/u.test(snapshot.appSource) &&
    snapshot.appStylesSource.includes('.pavp-route-content {\n  opacity: 1;\n}')
  const routeStyleRulesAreMotionFree = routeStyleRules.every((rule) => {
    const opacityValues = [...rule.declarations.matchAll(/\bopacity\s*:\s*([^;]+);/giu)].map(
      (match) => match[1]?.trim(),
    )

    return (
      !/\b(?:animation|transition)(?:-[a-z-]+)?\s*:/iu.test(rule.declarations) &&
      opacityValues.every((value) => value === '1')
    )
  })
  const noRouteLevelMotion =
    !/<Transition\b/u.test(routeCorpus) &&
    !/\bpavp-route-content[^{}]*\{[^}]*(?:animation|transition)\s*:/iu.test(
      snapshot.appStylesSource,
    ) &&
    routeStyleRulesAreMotionFree &&
    !/<(?:div|component)\b[^>]*(?:v-if|v-show)\s*=/u.test(snapshot.appSource)
  const runtime005MarkersPreserved = [
    'PAVP_RUNTIME_005_STATUS=OPEN',
    'PAVP_RUNTIME_005_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_RUNTIME_005_STATIC_VERIFICATION=PASS',
    'REPAIRED_ROUTE_CONTENT_HOST_COUNT=1',
    'REPAIRED_ROUTE_CONTENT_HOST_KEY=NONE',
    'REPAIRED_ROUTE_CONTENT_HOST_OPACITY=1',
    'ROUTE_CONTENT_HOST_VISIBILITY=opacity 1 without route-level animation or transition',
    'ROUTE_ENTRY_FULL=no route-level animation;no route-level transition;stable opacity;stable geometry',
    'ROUTE_ENTRY_REDUCED=no route-level animation;no route-level transition;stable opacity;stable geometry',
    'ROUTE_ENTRY_NONE=no route-level animation;no route-level transition;stable opacity;stable geometry',
    'ROUTE_ENTRY_OR_LEAVE_MOTION=PROHIBITED',
    'PAVP_RUNTIME_005_CHANGE=NONE',
  ].every((marker) => snapshot.architectureSource.includes(marker))
  const expansionArchitectureContractPreserved = [
    'EXPANDED_NAVIGATION_STATE_AUTHORITY=expandedNavigationGroupKeys',
    'EXPANDED_NAVIGATION_PROJECTION=VALID_ADMITTED_ROOT_GROUP_KEYS_ONLY',
    'INITIAL_ROOT_SUBMENU_STATE=ALL_EXPANDED',
    'ACTIVE_PARENT_MANUAL_COLLAPSE=PERMITTED_AND_STABLE_WHILE_ROUTE_UNCHANGED',
    'ACTIVE_PARENT_RECONCILIATION=ACTUAL_activeRouteName_CHANGE_ONLY',
    'ACTIVE_PARENT_CONTINUOUS_REINSERTION=PROHIBITED',
    'HEADER_ROOT_SUBMENU_CONTROL_COUNT=1',
    'HEADER_ROOT_SUBMENU_CONTROL_PROFILE=WIDE_ONLY',
    'HEADER_ROOT_SUBMENU_CONTROL_VISIBILITY=PERSISTENT_NAVIGATION_EXPANDED_ONLY',
    'HEADER_ROOT_SUBMENU_CONTROL_STATE_AUTHORITY=expandedNavigationGroupKeys_ONLY',
    'HEADER_SIDEBAR_COLLAPSE_CONTROL_STATE_AUTHORITY=wideNavigationCollapsed_ONLY',
  ].every((marker) => snapshot.architectureSource.includes(marker))
  const motionArchitectureContractPreserved = [
    'ADMIN_NAVIGATION_MOTION_COVERAGE=HOVER;SELECTED;SUBMENU_HEIGHT;SUBMENU_ARROW;COLLAPSED_POPUP;HEADER_ROOT_SUBMENU_CONTROL;HEADER_SIDEBAR_COLLAPSE_CONTROL',
    'ADMIN_NAVIGATION_FULL_DURATION=var(--ui-motion-duration)',
    'ADMIN_NAVIGATION_FULL_EASING=var(--ui-motion-easing)',
    'ADMIN_NAVIGATION_REDUCED_DURATION=calc(var(--ui-motion-duration) / 2)',
    'ADMIN_NAVIGATION_REDUCED_TRANSFORM=none',
    'ADMIN_NAVIGATION_NONE_TRANSITION=none',
    'ADMIN_NAVIGATION_NONE_ANIMATION=none',
    'ADMIN_NAVIGATION_NONE_MOTION_EFFECT_TRANSFORM=none',
    'ADMIN_NAVIGATION_NONE_SUBMENU_ARROW=SEMANTIC_FINAL_ORIENTATION_WITHOUT_TRANSITION',
    'NEW_MOTION_AUTHORITY_STATE_STORE_PERSISTENCE_DEPENDENCY_ROUTE_TOKEN_OR_PUBLIC_API=NONE',
  ].every((marker) => snapshot.architectureSource.includes(marker))
  const narrowDrawerPreserved = [
    '<Teleport to="#pavp-overlay-root">',
    'v-if="profile === \'narrow\' && navigationOpen"',
    '@pointerdown="handleDrawerScrimPointerDown($event)"',
    'aria-modal="true"',
    'role="dialog"',
    '@keydown="handleDrawerKeydown"',
    ':inert="profile === \'narrow\' && navigationOpen"',
  ].every((marker) => shellTemplate.includes(marker))

  return Object.freeze([
    {
      code: 'ADMIN_NAV_EXPANSION_CONTROLLED_KEYS',
      passed:
        expansionArchitectureContractPreserved &&
        expandedKeysBinding === 'validExpandedNavigationGroupKeys' &&
        validExpandedInitializer !== undefined &&
        expressionIsComputed(validExpandedInitializer) &&
        dependencyClosureHasPropsProperty(validExpandedClosure, 'navigation') &&
        validExpandedClosure.some((expression) =>
          nodeReferencesRefValue(expression, 'expandedNavigationGroupKeys'),
        ) &&
        normalizedShellScript.includes(
          'const admittedGroupKeys = new Set(navigationGroupKeys.value) return expandedNavigationGroupKeys.value.filter((key) => admittedGroupKeys.has(key))',
        ) &&
        !shellScript.includes('projectedExpandedNavigationGroupKeys'),
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ACTIVE_PARENT_OPTIONAL',
      passed:
        !dependencyClosureHasPropsProperty(validExpandedClosure, 'activeRouteName') &&
        normalizedShellScript.includes(
          'const expandedNavigationGroupKeys = ref<string[]>([...navigationGroupKeys.value])',
        ) &&
        normalizedToggleAllSource.includes('? [] : [...navigationGroupKeys.value]'),
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ROUTE_CHANGE_RECONCILIATION',
      passed: routeWatchContract,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_NO_CONTINUOUS_FORCE',
      passed: expansionWatchSourcesAreExact,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ALL_ACTION_SINGLE',
      passed:
        groupControlElements.length === 1 &&
        groupControlNaiveButton &&
        isDeepStrictEqual(groupControlClickExpressions, ['toggleAllNavigationGroups']),
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ALL_ACTION_HEADER_DESCENDANT',
      passed: header !== undefined && groupControl?.ancestors.includes(header.node) === true,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ALL_ACTION_FORBIDDEN_ANCESTRY',
      passed: groupControlForbiddenAncestryAbsent,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ALL_ACTION_VISIBILITY',
      passed:
        isDeepStrictEqual([...groupControlVisibilityExpressions].sort(), [
          '!persistentNavigationCollapsed',
          "profile === 'wide'",
        ]) && groupControlPath.every((node) => templateDirectives(node, 'for').length === 0),
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ALL_ACTION_STATE_AUTHORITY',
      passed: toggleAllExactStateAuthority,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ALL_ACTION_LABELS',
      passed: exactGroupControlLabels,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_SIDEBAR_CONTROL_DISTINCT',
      passed:
        exactOccurrenceCount(shellTemplate, 'data-pavp-admin-navigation-collapse-control') === 1 &&
        exactOccurrenceCount(shellTemplate, 'data-pavp-admin-navigation-groups-control') === 1 &&
        shellTemplate.includes('@click="toggleWideNavigation"') &&
        normalizedShellScript.includes(
          'function toggleWideNavigation(): void { wideNavigationCollapsed.value = !wideNavigationCollapsed.value }',
        ) &&
        !normalizedToggleAllSource.includes('wideNavigationCollapsed'),
    },
    {
      code: 'ADMIN_NAV_EXPANSION_MOTION_FULL_REDUCED_NONE',
      passed:
        motionArchitectureContractPreserved &&
        fullVendorMotionCoverage &&
        reducedVendorMotionCoverage &&
        noneVendorMotionCoverage,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_MOTION_NONE_CLOSURE',
      passed: noneVendorMotionCoverage && motionNoneRulesSafe,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_MOTION_TOKENIZED_ALLOWLIST',
      passed: tokenizedMotionAllowlist,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_SINGLE_ROUTER_VIEW',
      passed: singleRouterView,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ROUTE_HOST_STABLE_UNKEYED',
      passed: stableUnkeyedRouteHost,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ROUTE_MOTION_ABSENT',
      passed: noRouteLevelMotion,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_RUNTIME_005_PRESERVED',
      passed:
        runtime005MarkersPreserved &&
        singleRouterView &&
        stableUnkeyedRouteHost &&
        noRouteLevelMotion,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_SINGLE_SIDER_MENU',
      passed:
        [...shellTemplate.matchAll(/<PavpLayoutSiderPrimitive(?=[\s>])/gu)].length === 1 &&
        [...shellTemplate.matchAll(/<PavpMenuPrimitive(?=[\s>])/gu)].length === 1,
    },
    {
      code: 'ADMIN_NAV_EXPANSION_NARROW_DRAWER_PRESERVED',
      passed: narrowDrawerPreserved,
    },
  ])
}

function adminNavigationExpansionMotionViolations(
  snapshot: AdminNavigationNativeSourceSnapshot,
): string[] {
  return adminNavigationExpansionMotionInvariantResults(snapshot)
    .filter((result) => !result.passed)
    .map((result) => result.code)
}

function runAdminNavigationExpansionMotionNegativeProbes(
  baseline: AdminNavigationNativeSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationExpansionMotionViolations(baseline)
  const parsedShell = vueSfcCompiler.parse(baseline.shellSource, { filename: shellSfcPath })
  const templateAst = parsedShell.descriptor.template?.ast
  const elements =
    parsedShell.errors.length === 0 && templateAst !== undefined
      ? collectShellTemplateElements(templateAst)
      : []
  const groupControl = elements.find(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-groups-control') ===
      'header-trailing',
  )
  const groupControlSource = groupControl?.node.loc?.source ?? ''
  const withoutGroupControl = replaceExactOnce(baseline.shellSource, groupControlSource, '')
  const movedInsideSiderSource =
    withoutGroupControl === baseline.shellSource
      ? baseline.shellSource
      : insertBeforePersistentNavigationEnd(
          withoutGroupControl,
          `\n          ${groupControlSource}\n        `,
        )
  const unconditionalProjectionSource = baseline.shellSource.replace(
    'const validExpandedNavigationGroupKeys = computed(() => {\n  const admittedGroupKeys = new Set(navigationGroupKeys.value)\n\n  return expandedNavigationGroupKeys.value.filter((key) => admittedGroupKeys.has(key))\n})',
    'const validExpandedNavigationGroupKeys = computed(() => {\n  const projectedKeys = new Set(expandedNavigationGroupKeys.value)\n\n  for (const group of props.navigation) {\n    if (group.items.some((item) => item.routeName === props.activeRouteName)) {\n      projectedKeys.add(navigationGroupKey(group.id))\n    }\n  }\n\n  return [...projectedKeys]\n})',
  )
  const actionMutatesWideSource = baseline.shellSource.replace(
    'function toggleAllNavigationGroups(): void {\n  expandedNavigationGroupKeys.value = allNavigationGroupsExpanded.value\n    ? []\n    : [...navigationGroupKeys.value]\n}',
    'function toggleAllNavigationGroups(): void {\n  wideNavigationCollapsed.value = !wideNavigationCollapsed.value\n  expandedNavigationGroupKeys.value = []\n}',
  )
  const reducedMotionRemovedSource = baseline.providerSource.replace(
    "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
    "html[data-motion='probe-reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
  )
  const noneMotionAllowedSource = `${baseline.providerSource}\n<style>\nhtml[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu { transition: opacity var(--ui-motion-duration) !important; animation: pavp-probe var(--ui-motion-duration) !important; }\n</style>\n`
  const routeKeySource = baseline.appSource.replace(
    '<div class="pavp-route-content">',
    '<div :key="route.fullPath" class="pavp-route-content">',
  )
  const secondRouterViewSource = baseline.appSource.replace(
    '</UiProvider>',
    '<RouterView />\n  </UiProvider>',
  )
  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-expansion-restores-unconditional-active-parent',
      'ADMIN_NAV_EXPANSION_ACTIVE_PARENT_OPTIONAL',
      { ...baseline, shellSource: unconditionalProjectionSource },
    ],
    [
      'admin-navigation-expansion-removes-header-all-action',
      'ADMIN_NAV_EXPANSION_ALL_ACTION_SINGLE',
      { ...baseline, shellSource: withoutGroupControl },
    ],
    [
      'admin-navigation-expansion-moves-all-action-inside-sider',
      'ADMIN_NAV_EXPANSION_ALL_ACTION_FORBIDDEN_ANCESTRY',
      { ...baseline, shellSource: movedInsideSiderSource },
    ],
    [
      'admin-navigation-expansion-all-action-mutates-wide-collapse',
      'ADMIN_NAV_EXPANSION_ALL_ACTION_STATE_AUTHORITY',
      { ...baseline, shellSource: actionMutatesWideSource },
    ],
    [
      'admin-navigation-expansion-removes-reduced-motion-coverage',
      'ADMIN_NAV_EXPANSION_MOTION_FULL_REDUCED_NONE',
      { ...baseline, providerSource: reducedMotionRemovedSource },
    ],
    [
      'admin-navigation-expansion-allows-motion-under-none',
      'ADMIN_NAV_EXPANSION_MOTION_NONE_CLOSURE',
      { ...baseline, providerSource: noneMotionAllowedSource },
    ],
    [
      'admin-navigation-expansion-adds-route-derived-key',
      'ADMIN_NAV_EXPANSION_ROUTE_HOST_STABLE_UNKEYED',
      { ...baseline, appSource: routeKeySource },
    ],
    [
      'admin-navigation-expansion-adds-second-router-view',
      'ADMIN_NAV_EXPANSION_SINGLE_ROUTER_VIEW',
      { ...baseline, appSource: secondRouterViewSource },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationExpansionMotionViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function adminNavigationNaiveActionsMotionInvariantResults(
  snapshot: AdminNavigationNativeSourceSnapshot,
): readonly Readonly<{ code: string; passed: boolean }>[] {
  const parsedShell = vueSfcCompiler.parse(snapshot.shellSource, { filename: shellSfcPath })
  const templateAst = parsedShell.descriptor.template?.ast
  const elements =
    parsedShell.errors.length === 0 && templateAst !== undefined
      ? collectShellTemplateElements(templateAst)
      : []
  const shellTemplate = templateContent(snapshot.shellSource)
  const shellScript = scriptContent(snapshot.shellSource)
  const shellStyles = styleContent(snapshot.shellSource)
  const providerStyles = styleContent(snapshot.providerSource)
  const actionElements = elements.filter((element) =>
    [
      'data-pavp-admin-navigation-groups-control',
      'data-pavp-admin-navigation-collapse-control',
    ].some((attribute) => staticTemplateAttribute(element.node, attribute) === 'header-trailing'),
  )
  const groupAction = actionElements.find(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-groups-control') ===
      'header-trailing',
  )
  const sidebarAction = actionElements.find(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-collapse-control') ===
      'header-trailing',
  )
  const actionTooltips = actionElements.map((action) =>
    [...action.ancestors].reverse().find((ancestor) => ancestor.tag === 'PavpTooltipPrimitive'),
  )
  const actionDescendants = (action: ShellTemplateElement | undefined): ShellTemplateElement[] =>
    action === undefined
      ? []
      : elements.filter((element) => element.ancestors.includes(action.node))
  const iconStates = actionElements.flatMap((action) =>
    actionDescendants(action).filter(
      (element) =>
        staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-icon-state') !==
        undefined,
    ),
  )
  const iconStacks = actionElements.flatMap((action) =>
    actionDescendants(action).filter(
      (element) =>
        staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-icon-stack') !==
        undefined,
    ),
  )
  const iconPrimitives = actionElements.flatMap((action) =>
    actionDescendants(action).filter((element) => element.node.tag === 'PavpIconPrimitive'),
  )
  const iconSlotTemplates = actionElements.flatMap((action) =>
    actionDescendants(action).filter(
      (element) =>
        element.node.tag === 'template' &&
        templateDirectives(element.node, 'slot', 'icon').length === 1,
    ),
  )
  const actionSources = actionElements.map((element) => element.node.loc?.source ?? '').join('\n')
  const headerActionRules = cssRuleBlocks(`${shellStyles}\n${providerStyles}`).filter((rule) =>
    rule.selector.includes('pavp-admin-shell__header-action'),
  )
  const hoverFormula =
    "'color-mix(in srgb, var(--ui-admin-navigation-selected) 6%, var(--ui-material-chrome-background))'"
  const selectedFormula =
    "'color-mix(in srgb, var(--ui-admin-navigation-selected) 16%, var(--ui-material-overlay-background))'"
  const exactPublicComponents = [
    'UiAdminShell',
    'UiButton',
    'UiDescriptionList',
    'UiPageHeader',
    'UiProvider',
    'UiRadioCardGroup',
    'UiSection',
    'UiSegmentedControl',
    'UiStatusBadge',
  ]
  const headerActionsContainer = elements.find((element) =>
    hasStaticTemplateClass(element.node, 'pavp-admin-shell__header-actions'),
  )
  const themeSourceFile = ts.createSourceFile(
    'pavp-naive-theme.ts',
    snapshot.themeSource,
    ts.ScriptTarget.Latest,
    true,
  )
  const themeDeclarations = themeVariableInitializers(themeSourceFile)
  const themeOverrides = themeOverrideObject(snapshot.themeSource)
  const buttonOverride =
    themeOverrides === undefined ? undefined : objectPropertyObject(themeOverrides, 'Button')
  const tooltipOverride =
    themeOverrides === undefined ? undefined : objectPropertyObject(themeOverrides, 'Tooltip')
  const tooltipPeers =
    tooltipOverride === undefined ? undefined : objectPropertyObject(tooltipOverride, 'peers')
  const tooltipPopover =
    tooltipPeers === undefined ? undefined : objectPropertyObject(tooltipPeers, 'Popover')
  const buttonAuthorityIs = (field: string, authority: string): boolean =>
    buttonOverride !== undefined &&
    resolveThemeAuthority(objectPropertyInitializer(buttonOverride, field), themeDeclarations)
      .authority === authority
  const headerActionVisualProjection =
    buttonOverride !== undefined &&
    resolveThemeExpressionText(
      objectPropertyInitializer(buttonOverride, 'iconSizeMedium'),
      themeDeclarations,
    ) === '`calc(${enhancedTargetHeight} / 2)`' &&
    [
      ['color', 'appearance.material.chrome'],
      ['colorDisabled', 'appearance.material.chrome'],
      ['colorHover', 'admin.navigation.hover-surface'],
      ['colorFocus', 'admin.navigation.hover-surface'],
      ['colorPressed', 'admin.navigation.selected-surface'],
      ['textColorTertiary', 'color.text.secondary'],
      ['textColorHover', 'color.control.primary'],
      ['textColorPressed', 'color.control.primary'],
      ['textColorFocus', 'color.control.primary'],
      ['textColorDisabled', 'color.text.secondary'],
    ].every(([field, authority]) =>
      field !== undefined && authority !== undefined ? buttonAuthorityIs(field, authority) : false,
    )
  const compactTooltipProjection =
    tooltipOverride !== undefined &&
    tooltipPopover !== undefined &&
    [
      objectPropertyInitializer(tooltipOverride, 'padding'),
      objectPropertyInitializer(tooltipPopover, 'padding'),
      objectPropertyInitializer(tooltipPopover, 'space'),
    ].every(
      (expression) =>
        resolveThemeExpressionText(expression, themeDeclarations) ===
        '`calc(${spacingContentGap} / 2)`',
    )
  const stableIconStates =
    iconStates.length === 4 &&
    isDeepStrictEqual(
      iconStates
        .map((element) =>
          staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-icon-state'),
        )
        .sort(),
      ['groups-collapsed', 'groups-expanded', 'sidebar-collapsed', 'sidebar-expanded'],
    ) &&
    iconStates.every((element) => {
      const owner = actionElements.find((action) => element.ancestors.includes(action.node))
      const ownerIndex = owner === undefined ? -1 : element.ancestors.indexOf(owner.node)
      const stableLayerPath =
        ownerIndex === -1 ? [] : [...element.ancestors.slice(ownerIndex + 1), element.node]

      return (
        element.node.tag === 'PavpIconPrimitive' &&
        hasStaticTemplateClass(element.node, 'pavp-admin-shell__header-action-icon-state') &&
        hasStaticTemplateClass(element.node, 'col-start-1') &&
        hasStaticTemplateClass(element.node, 'row-start-1') &&
        stableLayerPath.length > 0 &&
        stableLayerPath.every((node) =>
          ['if', 'else-if', 'else', 'show', 'for'].every(
            (directive) => templateDirectives(node, directive).length === 0,
          ),
        )
      )
    })
  const providerMotionRules = cssRuleBlocks(providerStyles)
  const exactMotionValue = (selector: string, property: string, value: string): boolean =>
    isDeepStrictEqual(selectorDeclarationValues(providerMotionRules, selector, property), [value])
  const fullIconSelector = "html[data-motion='full'] .pavp-admin-shell__header-action-icon-state"
  const reducedIconSelector =
    "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state"
  const noneIconSelector = "html[data-motion='none'] .pavp-admin-shell__header-action-icon-state"
  const fullHeaderButtonSelector =
    "html[data-motion='full'] .pavp-admin-shell__header-action.n-button"
  const reducedHeaderButtonSelector =
    "html[data-motion='reduced'] .pavp-admin-shell__header-action.n-button"
  const headerButtonMotionCoverage =
    exactMotionValue(
      fullHeaderButtonSelector,
      'transition-duration',
      'var(--ui-motion-duration) !important',
    ) &&
    exactMotionValue(
      fullHeaderButtonSelector,
      'transition-timing-function',
      'var(--ui-motion-easing) !important',
    ) &&
    exactMotionValue(
      fullHeaderButtonSelector,
      'transition-property',
      'background-color, color, opacity !important',
    ) &&
    exactMotionValue(
      reducedHeaderButtonSelector,
      'transition-duration',
      'calc(var(--ui-motion-duration) / 2) !important',
    ) &&
    exactMotionValue(
      reducedHeaderButtonSelector,
      'transition-timing-function',
      'var(--ui-motion-easing) !important',
    ) &&
    exactMotionValue(
      reducedHeaderButtonSelector,
      'transition-property',
      'background-color, color, opacity !important',
    )
  const iconMotionCoverage =
    exactMotionValue(
      fullIconSelector,
      'transition-duration',
      'var(--ui-motion-duration) !important',
    ) &&
    exactMotionValue(
      fullIconSelector,
      'transition-timing-function',
      'var(--ui-motion-easing) !important',
    ) &&
    exactMotionValue(fullIconSelector, 'transition-property', 'opacity, transform !important') &&
    exactMotionValue(
      reducedIconSelector,
      'transition-duration',
      'calc(var(--ui-motion-duration) / 2) !important',
    ) &&
    exactMotionValue(
      reducedIconSelector,
      'transition-timing-function',
      'var(--ui-motion-easing) !important',
    ) &&
    exactMotionValue(reducedIconSelector, 'transition-property', 'opacity !important') &&
    exactMotionValue(reducedIconSelector, 'transform', 'none !important') &&
    exactMotionValue(noneIconSelector, 'animation', 'none !important') &&
    exactMotionValue(noneIconSelector, 'transition', 'none !important') &&
    exactMotionValue(noneIconSelector, 'transform', 'none !important') &&
    headerButtonMotionCoverage &&
    snapshot.providerSource.includes('.pavp-admin-shell__header-action-tooltip')
  const selectedStateProjection =
    exactOccurrenceCount(snapshot.themeSource, hoverFormula) === 1 &&
    exactOccurrenceCount(snapshot.themeSource, selectedFormula) === 1 &&
    snapshot.themeSource.includes('itemColorHover: navigationHoverSurface') &&
    snapshot.themeSource.includes('itemColorActive: navigationSelectedSurface') &&
    snapshot.themeSource.includes('itemColorActiveHover: navigationSelectedSurface') &&
    snapshot.themeSource.includes('itemColorActiveCollapsed: navigationSelectedSurface') &&
    snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
    snapshot.themeSource.includes('optionColorActive: navigationSelectedSurface')
  const selectedSurfaceBaseRule = cssRuleBlocks(shellStyles).find(
    (rule) =>
      rule.selector.includes(
        "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
      ) &&
      rule.selector.includes('.pavp-admin-navigation-dropdown .n-dropdown-option-body::before'),
  )
  const acceptedNativeSelectedSurfaceTransition =
    shellStyles.includes(
      "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\n.pavp-admin-navigation-dropdown .n-dropdown-option-body::before,\n.pavp-admin-shell__header-action-icon-state {",
    ) &&
    shellStyles.includes('transition-property: background-color, opacity, transform;') &&
    snapshot.providerSource.includes(
      'transition-property: background-color, opacity, transform !important;',
    ) &&
    snapshot.providerSource.includes('transition-property: background-color, opacity !important;')
  const toleratedRejectedLocalSelectedSurfaceResidue =
    selectedSurfaceBaseRule?.declarations.includes(
      'transition-property: background-color, opacity;',
    ) === true &&
    shellStyles.includes(
      "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
    ) &&
    shellStyles.includes(
      "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
    )
  const selectedSurfaceTransition =
    (acceptedNativeSelectedSurfaceTransition || toleratedRejectedLocalSelectedSurfaceResidue) &&
    snapshot.providerSource.includes(
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu,",
    ) &&
    snapshot.providerSource.includes(
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,",
    )
  const acceptedNativeHeaderActionScale =
    exactOccurrenceCount(shellStyles, 'transform: scale(0.98);') === 1 &&
    exactOccurrenceCount(shellStyles, 'transform: scale(0.94);') === 0
  const toleratedRejectedLocalHeaderActionScale =
    exactOccurrenceCount(shellStyles, 'transform: scale(0.94);') === 1 &&
    exactOccurrenceCount(shellStyles, 'transform: scale(0.98);') === 0
  const headerActionNonVisibleFocusRules = cssRuleBlocks(
    `${shellStyles}\n${providerStyles}`,
  ).filter(
    (rule) =>
      rule.selector.includes('pavp-admin-shell__header-action') &&
      /:focus(?!-visible)/u.test(rule.selector),
  )
  const acceptedNativeFocusVisibleOnly = headerActionNonVisibleFocusRules.length === 0
  const toleratedRejectedLocalFocusSuppression =
    headerActionNonVisibleFocusRules.length === 1 &&
    headerActionNonVisibleFocusRules[0]?.selector.trim() ===
      '.pavp-admin-shell__header-action.n-button:focus:not(:focus-visible)' &&
    selectorHasDeclarations(
      cssRuleBlocks(providerStyles),
      '.pavp-admin-shell__header-action.n-button:focus:not(:focus-visible)',
      { 'box-shadow': 'none' },
    )
  const noSelectedHoverStack =
    selectedStateProjection &&
    !cssRuleBlocks(shellStyles).some(
      (rule) =>
        /(?:selected|active)[^,]*:(?:hover|active)[^,]*::before/iu.test(rule.selector) &&
        /navigationHoverSurface|ui-material-chrome-background|6%/iu.test(rule.declarations),
    )
  const routeCorpus = `${snapshot.appSource}\n${snapshot.consoleFrameSource}`
  const routeHostOpenTag = /<div\b[^>]*class="pavp-route-content"[^>]*>/u.exec(
    snapshot.appSource,
  )?.[0]
  const routeStyleRules = cssRuleBlocks(snapshot.appStylesSource).filter((rule) =>
    rule.selector.includes('.pavp-route-content'),
  )
  const routeBoundaryPreserved =
    exactOccurrenceCount(routeCorpus, '<RouterView') === 1 &&
    routeHostOpenTag !== undefined &&
    !/(?:^|\s)(?::)?key\s*=/u.test(routeHostOpenTag) &&
    !/<Transition\b/u.test(routeCorpus) &&
    !/<(?:div|component)\b[^>]*(?:v-if|v-show)\s*=/u.test(snapshot.appSource) &&
    routeStyleRules.every(
      (rule) =>
        !/\b(?:animation|transition)(?:-[a-z-]+)?\s*:/iu.test(rule.declarations) &&
        [...rule.declarations.matchAll(/\bopacity\s*:\s*([^;]+);/giu)].every(
          (match) => match[1]?.trim() === '1',
        ),
    )
  const runtime005Preserved = [
    'PAVP_RUNTIME_005_STATUS=OPEN',
    'PAVP_RUNTIME_005_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_RUNTIME_005_STATIC_VERIFICATION=PASS',
    'REPAIRED_ROUTE_CONTENT_HOST_COUNT=1',
    'REPAIRED_ROUTE_CONTENT_HOST_KEY=NONE',
    'ROUTE_ENTRY_OR_LEAVE_MOTION=PROHIBITED',
    'PAVP_RUNTIME_005_CHANGE=NONE',
  ].every((marker) => snapshot.architectureSource.includes(marker))
  const narrowDrawerPreserved = [
    '<Teleport to="#pavp-overlay-root">',
    'v-if="profile === \'narrow\' && navigationOpen"',
    '@pointerdown="handleDrawerScrimPointerDown($event)"',
    'aria-modal="true"',
    'role="dialog"',
    '@keydown="handleDrawerKeydown"',
    ':inert="profile === \'narrow\' && navigationOpen"',
  ].every((marker) => shellTemplate.includes(marker))

  return Object.freeze([
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_BUTTONS',
      passed:
        actionElements.length === 2 &&
        actionElements.every(
          (element) =>
            element.node.tag === 'PavpButtonPrimitive' &&
            staticTemplateAttribute(element.node, 'attr-type') === 'button' &&
            templateAttributes(element.node, 'circle').length === 1 &&
            staticTemplateAttribute(element.node, 'type') === 'tertiary' &&
            singleBoundExpression(element.node, 'bordered') === 'false' &&
            templateAttributes(element.node, 'quaternary').length === 0 &&
            actionDescendants(element).filter(
              (descendant) =>
                descendant.node.tag === 'template' &&
                templateDirectives(descendant.node, 'slot', 'icon').length === 1,
            ).length === 1,
        ) &&
        iconSlotTemplates.length === 2 &&
        headerActionVisualProjection &&
        snapshot.buttonAdapterSource.trim() ===
          "export { NButton as PavpButtonPrimitive } from 'naive-ui/es/button'",
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_ICONS',
      passed:
        iconPrimitives.length === 4 &&
        iconStates.every((element) => element.node.tag === 'PavpIconPrimitive') &&
        snapshot.iconAdapterSource.trim() ===
          "export { NIcon as PavpIconPrimitive } from 'naive-ui/es/icon'",
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_TOOLTIPS',
      passed:
        actionTooltips.length === 2 &&
        actionTooltips.every((tooltip) => tooltip?.tag === 'PavpTooltipPrimitive') &&
        compactTooltipProjection &&
        snapshot.tooltipAdapterSource.trim() ===
          "export { NTooltip as PavpTooltipPrimitive } from 'naive-ui/es/tooltip'",
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_NO_NATIVE_BUTTON',
      passed:
        actionElements.every((element) => element.node.tag !== 'button') &&
        !/<button\b[^>]*data-pavp-admin-navigation-(?:groups|collapse)-control/iu.test(
          shellTemplate,
        ),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_NO_NATIVE_TITLE',
      passed:
        [...actionElements, ...actionTooltips.map((node) => ({ node })).filter((item) => item.node)]
          .flatMap((element) => element.node?.props ?? [])
          .every(
            (property) =>
              !(
                (property.type === 6 && property.name === 'title') ||
                (property.type === 7 &&
                  property.name === 'bind' &&
                  property.arg?.content === 'title')
              ),
          ) && !actionSources.includes('title='),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_TOOLTIP_TARGET',
      passed:
        actionTooltips.every(
          (tooltip) =>
            tooltip !== undefined &&
            staticTemplateAttribute(tooltip, 'to') === '#pavp-overlay-root' &&
            staticTemplateAttribute(tooltip, 'placement') === 'bottom-end' &&
            singleBoundExpression(tooltip, 'show-arrow') === 'false',
        ) &&
        !actionTooltips.some(
          (tooltip) => staticTemplateAttribute(tooltip ?? { type: 0 }, 'to') === 'body',
        ),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_PRIVATE_ADAPTER_BOUNDARY',
      passed:
        shellScript.includes("from '../adapters/naive/naive-button'") &&
        shellScript.includes("from '../adapters/naive/naive-icon'") &&
        shellScript.includes("from '../adapters/naive/naive-tooltip'") &&
        !/\bfrom\s+['"]naive-ui(?:\/[^'"]+)?['"]/u.test(shellScript),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_NO_APP_VENDOR_IMPORT',
      passed: !/\bfrom\s+['"]naive-ui(?:\/[^'"]+)?['"]/u.test(snapshot.nonAdapterSource),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_PUBLIC_REGISTRY_UNCHANGED',
      passed:
        isDeepStrictEqual(
          [...snapshot.publicComponentExports].sort(),
          exactPublicComponents.sort(),
        ) &&
        !/Pavp(?:Button|Icon|Tooltip)Primitive|naive-(?:button|icon|tooltip)/u.test(
          snapshot.publicUiRootSource,
        ),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_UNOCSS_GEOMETRY',
      passed:
        headerActionsContainer !== undefined &&
        ['flex', 'items-center', 'gap-content-gap'].every((className) =>
          hasStaticTemplateClass(headerActionsContainer.node, className),
        ) &&
        actionElements.every((element) =>
          ['min-h-target-enhanced', 'min-w-target-enhanced'].every((className) =>
            hasStaticTemplateClass(element.node, className),
          ),
        ) &&
        iconStacks.length === 2 &&
        iconStacks.every((element) =>
          ['inline-grid', 'items-center', 'justify-center'].every((className) =>
            hasStaticTemplateClass(element.node, className),
          ),
        ),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_NO_INLINE_RAW_VISUAL',
      passed:
        !/(?:^|\s)(?::)?style\s*=|\b\d+(?:\.\d+)?(?:px|rem|ms|s)\b|#[\da-f]{3,8}\b/iu.test(
          actionSources,
        ) &&
        headerActionRules.every(
          (rule) =>
            !/#[\da-f]{3,8}\b|\b(?:rgb|hsl|oklch)\(/iu.test(rule.declarations) &&
            !/\b(?:transition-duration|transition-timing-function)\s*:\s*(?:\d|\.)/iu.test(
              rule.declarations,
            ),
        ) &&
        (acceptedNativeHeaderActionScale || toleratedRejectedLocalHeaderActionScale) &&
        !shellStyles.includes('transform: scaleX(') &&
        !shellStyles.includes('transform: scaleY('),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_EXACT_LABELS',
      passed:
        groupAction !== undefined &&
        sidebarAction !== undefined &&
        exactOccurrenceCount(shellScript, "'折叠全部菜单'") === 1 &&
        exactOccurrenceCount(shellScript, "'展开全部菜单'") === 1 &&
        exactOccurrenceCount(shellScript, "'收起导航'") === 1 &&
        exactOccurrenceCount(shellScript, "'展开导航'") === 1 &&
        exactOccurrenceCount(shellTemplate, '{{ navigationGroupsToggleLabel }}') === 1 &&
        exactOccurrenceCount(shellTemplate, '{{ wideNavigationCollapseLabel }}') === 1,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_STABLE_ICON_STACKS',
      passed: stableIconStates && iconStacks.length === 2,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_ICON_MOTION',
      passed: iconMotionCoverage,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_HOVER_SIX_PERCENT',
      passed:
        exactOccurrenceCount(snapshot.themeSource, hoverFormula) === 1 &&
        snapshot.themeSource.includes('itemColorHover: navigationHoverSurface') &&
        snapshot.themeSource.includes('optionColorHover: navigationHoverSurface'),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_SELECTED_SIXTEEN_PERCENT',
      passed:
        exactOccurrenceCount(snapshot.themeSource, selectedFormula) === 1 &&
        snapshot.themeSource.includes('itemColorActive: navigationSelectedSurface') &&
        snapshot.themeSource.includes('optionColorActive: navigationSelectedSurface'),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_SELECTED_HOVER_PRESSED_RETENTION',
      passed: noSelectedHoverStack,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_NATIVE_SELECTED_HANDOFF',
      passed:
        selectedSurfaceTransition &&
        shellTemplate.includes(':value="activeRouteName"') &&
        shellStyles.includes('.n-menu-item-content--selected::before') &&
        shellStyles.includes('.n-dropdown-option-body--active::before') &&
        !/navigationMotionState|routeMotionIntent|requestAnimationFrame/iu.test(shellScript),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_SINGLE_SURFACE_OWNER',
      passed:
        selectedSurfaceTransition &&
        cssRuleBlocks(shellStyles).filter(
          (rule) =>
            rule.selector ===
            "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::after",
        ).length === 0 &&
        !/\.n-dropdown-option-body::after/iu.test(shellStyles) &&
        !/selected-reveal|reveal-plane|moving-pill|route-selection-aura/iu.test(
          snapshot.shellSource,
        ),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_NO_SECOND_SYSTEM',
      passed:
        !/\bgsap\b|Aura|movingPill|moving-pill|left-selection|hard-route-dot/iu.test(
          `${snapshot.shellSource}\n${snapshot.providerSource}`,
        ) &&
        exactOccurrenceCount(shellTemplate, '<PavpLayoutSiderPrimitive') === 1 &&
        exactOccurrenceCount(shellTemplate, '<PavpMenuPrimitive') === 1,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_FOCUS_VISIBLE_ONLY',
      passed:
        snapshot.providerSource.includes('.n-button:focus-visible') &&
        shellStyles.includes('.n-menu-item:focus-visible') &&
        (acceptedNativeFocusVisibleOnly || toleratedRejectedLocalFocusSuppression),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_ROUTE_MOTION_ABSENT',
      passed: routeBoundaryPreserved,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_RUNTIME_005_PRESERVED',
      passed: runtime005Preserved && routeBoundaryPreserved,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_NARROW_DRAWER_PRESERVED',
      passed: narrowDrawerPreserved,
    },
  ])
}

function adminNavigationNaiveActionsMotionViolations(
  snapshot: AdminNavigationNativeSourceSnapshot,
): string[] {
  return adminNavigationNaiveActionsMotionInvariantResults(snapshot)
    .filter((result) => !result.passed)
    .map((result) => result.code)
}

function runAdminNavigationNaiveActionsMotionNegativeProbes(
  baseline: AdminNavigationNativeSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationNaiveActionsMotionViolations(baseline)
  const parsedShell = vueSfcCompiler.parse(baseline.shellSource, { filename: shellSfcPath })
  const templateAst = parsedShell.descriptor.template?.ast
  const elements =
    parsedShell.errors.length === 0 && templateAst !== undefined
      ? collectShellTemplateElements(templateAst)
      : []
  const groupAction = elements.find(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-groups-control') ===
      'header-trailing',
  )
  const groupTooltip = [...(groupAction?.ancestors ?? [])]
    .reverse()
    .find((ancestor) => ancestor.tag === 'PavpTooltipPrimitive')
  const firstIconState = elements.find(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-icon-state') ===
      'groups-expanded',
  )
  const groupActionSource = groupAction?.node.loc?.source ?? ''
  const nativeButtonActionSource = groupActionSource
    .replace('<PavpButtonPrimitive', '<button')
    .replace('</PavpButtonPrimitive>', '</button>')
  const nativeButtonSource = replaceExactOnce(
    baseline.shellSource,
    groupActionSource,
    nativeButtonActionSource,
  )
  const nativeTitleSource = baseline.shellSource.replace(
    ':aria-label="navigationGroupsToggleLabel"',
    ':aria-label="navigationGroupsToggleLabel"\n            :title="navigationGroupsToggleLabel"',
  )
  const tooltipSource = groupTooltip?.loc?.source ?? ''
  const withoutTooltipPrimitive = replaceExactOnce(
    baseline.shellSource,
    tooltipSource,
    tooltipSource.replaceAll('PavpTooltipPrimitive', 'div'),
  )
  const bodyTooltipTarget = baseline.shellSource.replace('to="#pavp-overlay-root"', 'to="body"')
  const withoutIconState = replaceExactOnce(
    baseline.shellSource,
    firstIconState?.node.loc?.source ?? '',
    '',
  )
  const withoutReducedIconMotion = baseline.providerSource.replace(
    "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state",
    "html[data-motion='probe-reduced'] .pavp-admin-shell__header-action-icon-state",
  )
  const motionNoneAllowsIconTransition = `${baseline.providerSource}\n<style>\nhtml[data-motion='none'] .pavp-admin-shell__header-action-icon-state { transition: opacity var(--ui-motion-duration) !important; }\n</style>\n`
  const withoutSelectedTransition = baseline.shellSource
    .replace('transition-property: background-color, opacity;', 'transition-property: opacity;')
    .replace(
      'transition-property: background-color, opacity, transform;',
      'transition-property: opacity, transform;',
    )
  const stackedSelectedHover = baseline.themeSource.replace(
    'itemColorActiveHover: navigationSelectedSurface',
    'itemColorActiveHover: navigationHoverSurface',
  )
  const routeKeySource = baseline.appSource.replace(
    '<div class="pavp-route-content">',
    '<div :key="route.fullPath" class="pavp-route-content">',
  )
  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-naive-actions-restores-native-button',
      'ADMIN_NAV_NAIVE_ACTIONS_BUTTONS',
      { ...baseline, shellSource: nativeButtonSource },
    ],
    [
      'admin-navigation-naive-actions-restores-browser-title',
      'ADMIN_NAV_NAIVE_ACTIONS_NO_NATIVE_TITLE',
      { ...baseline, shellSource: nativeTitleSource },
    ],
    [
      'admin-navigation-naive-actions-removes-tooltip',
      'ADMIN_NAV_NAIVE_ACTIONS_TOOLTIPS',
      { ...baseline, shellSource: withoutTooltipPrimitive },
    ],
    [
      'admin-navigation-naive-actions-targets-body',
      'ADMIN_NAV_NAIVE_ACTIONS_TOOLTIP_TARGET',
      { ...baseline, shellSource: bodyTooltipTarget },
    ],
    [
      'admin-navigation-naive-actions-removes-icon-layer',
      'ADMIN_NAV_NAIVE_ACTIONS_STABLE_ICON_STACKS',
      { ...baseline, shellSource: withoutIconState },
    ],
    [
      'admin-navigation-naive-actions-removes-reduced-icon-motion',
      'ADMIN_NAV_NAIVE_ACTIONS_ICON_MOTION',
      { ...baseline, providerSource: withoutReducedIconMotion },
    ],
    [
      'admin-navigation-naive-actions-allows-none-icon-transition',
      'ADMIN_NAV_NAIVE_ACTIONS_ICON_MOTION',
      { ...baseline, providerSource: motionNoneAllowsIconTransition },
    ],
    [
      'admin-navigation-naive-actions-removes-selected-transition',
      'ADMIN_NAV_NAIVE_ACTIONS_NATIVE_SELECTED_HANDOFF',
      { ...baseline, shellSource: withoutSelectedTransition },
    ],
    [
      'admin-navigation-naive-actions-stacks-hover-over-selected',
      'ADMIN_NAV_NAIVE_ACTIONS_SELECTED_HOVER_PRESSED_RETENTION',
      { ...baseline, themeSource: stackedSelectedHover },
    ],
    [
      'admin-navigation-naive-actions-adds-route-derived-key',
      'ADMIN_NAV_NAIVE_ACTIONS_ROUTE_MOTION_ABSENT',
      { ...baseline, appSource: routeKeySource },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationNaiveActionsMotionViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

function navigationBudgetViolations(snapshot: NavigationBudgetGateSnapshot): string[] {
  const violations: string[] = []
  const motionFeatureBudgetBytes =
    projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes
  const expectedInitialProjectConfigBudget = `initialJavaScriptGzipBytes: ${String(expectedInitialJavaScriptBudgetBytes / 1024)} * 1024`
  const expectedInitialEngineeringManifestBudget = `{ id: 'initial-javascript-gzip', limit: ${String(expectedInitialJavaScriptBudgetBytes)}, unit: 'bytes-gzip' }`
  const expectedMotionEngineeringManifestBudget = `{ id: 'admin-navigation-motion-feature-javascript-gzip', limit: ${String(motionFeatureBudgetBytes)}, unit: 'bytes-gzip' }`
  const requiredArchitectureMarkers = [
    `WORK_PACKAGE=${adminNavigationMotionVueSelectionLensWorkPackage}`,
    'MOTION_FEATURE_ROOT_ID=admin-navigation-motion-dom-max',
    'MOTION_FEATURE_MANIFEST_KEY=../../packages/ui/src/adapters/motion/admin-navigation-dom-max.ts',
    'MOTION_FEATURE_DYNAMIC_ROOT_COUNT=1',
    'FINAL_DYNAMIC_ROOT_COUNT=18',
    'FINAL_ROUTE_DYNAMIC_ROOT_COUNT=17',
    'FINAL_NON_ROUTE_DYNAMIC_ROOT_COUNT=1',
    'DYNAMIC_ROOT_COLLECTION=UNION_OF_DYNAMIC_IMPORTS_FROM_EVERY_INITIAL_STATIC_CLOSURE_CHUNK',
    'DYNAMIC_ENTRY_SET=EXACT_17_ROUTE_ROOTS_PLUS_1_MOTION_FEATURE_ROOT',
    'MOTION_FEATURE_EXCLUSIVE_CLOSURE_FORMULA=MOTION_FEATURE_STATIC_CLOSURE minus INITIAL_STATIC_CLOSURE',
    'MOTION_FEATURE_EXCLUSIVE_CLOSURE_MEASUREMENT=DISTINCT_JAVASCRIPT_PRODUCTION_GZIP_SUM',
    'MOTION_FEATURE_PROJECT_CONFIG_BUDGET_PROPERTY=projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes',
    'MOTION_FEATURE_ENGINEERING_MANIFEST_RECORD_ID=admin-navigation-motion-feature-javascript-gzip',
    'MOTION_FEATURE_ENGINEERING_MANIFEST_UNIT=bytes-gzip',
    'MOTION_FEATURE_BUDGET_FORMULA=ceil((MEASURED_MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES + 8192) / 8192) * 8192',
    'MOTION_FEATURE_BUDGET_HEADROOM >= 8192',
    'MOTION_FEATURE_BUDGET_HEADROOM < 16384',
    'MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES=33648',
    `MOTION_FEATURE_HARD_BUDGET_BYTES=${String(motionFeatureBudgetBytes)}`,
    `MOTION_FEATURE_HEADROOM_BYTES=${String(motionFeatureBudgetBytes - 33648)}`,
    'MOTION_FEATURE_EXCLUSIVE_JAVASCRIPT_FILE_COUNT=1',
    'FINAL_INITIAL_JAVASCRIPT_GZIP_BYTES=223308',
    `FINAL_INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=${String(expectedInitialJavaScriptBudgetBytes)}`,
    `FINAL_INITIAL_JAVASCRIPT_HEADROOM_BYTES=${String(expectedInitialJavaScriptBudgetBytes - 223308)}`,
    `INITIAL_JAVASCRIPT_CURRENT_HARD_BUDGET_BYTES=${String(expectedInitialJavaScriptBudgetBytes)}`,
    `INITIAL_JAVASCRIPT_PRE_REBASE_HARD_BUDGET_BYTES=${String(currentInitialJavaScriptBudgetBytes)}`,
    `INITIAL_JAVASCRIPT_REBASE_MINIMUM_HEADROOM_BYTES=${String(expectedMinimumInitialJavaScriptHeadroomBytes)}`,
    'INITIAL_JAVASCRIPT_RETAIN_CONDITION=229376 - measuredInitialJavaScript >= 8192',
    'INITIAL_JAVASCRIPT_REBASE_FORMULA=ceil((measuredInitialJavaScript + 8192) / 8192) * 8192',
  ] as const
  const requiredBundleMeasurementMarkers = [
    'const expectedLazyRouteCount = 17',
    'const expectedMotionFeatureDynamicRootCount = 1',
    'const expectedDynamicRootCount = expectedLazyRouteCount + expectedMotionFeatureDynamicRootCount',
    'const expectedDynamicRootKeys = new Set([...expectedLazyRouteKeys, motionFeatureManifestKey])',
    'for (const ownerKey of initialChunkKeys)',
    'collectStaticChunkClosure(manifest, motionFeatureManifestKey)',
    'differenceValues(motionFeatureStaticClosure, initialChunkKeys)',
    'const expectedMotionFeatureJavaScriptHardBudgetBytes = exactAlignedBundleBudget(',
    'motionFeatureJavaScriptBytes,',
    'projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes !==',
    'motionFeatureJavaScriptHeadroomBytes < minimumMotionFeatureJavaScriptHeadroomBytes',
    'motionFeatureJavaScriptHeadroomBytes >= maximumAlignedBudgetHeadroomBytes',
  ] as const

  if (
    projectConfig.bundleBudgets.initialJavaScriptGzipBytes !==
      expectedInitialJavaScriptBudgetBytes ||
    expectedInitialJavaScriptBudgetBytes < expectedMinimumInitialJavaScriptHeadroomBytes ||
    expectedInitialJavaScriptBudgetBytes % expectedBundleBudgetAlignmentBytes !== 0 ||
    motionFeatureBudgetBytes < expectedMinimumInitialJavaScriptHeadroomBytes ||
    motionFeatureBudgetBytes % expectedBundleBudgetAlignmentBytes !== 0 ||
    exactOccurrenceCount(snapshot.projectConfigSource, expectedInitialProjectConfigBudget) !== 1 ||
    exactOccurrenceCount(
      snapshot.projectConfigSource,
      'adminNavigationMotionFeatureJavaScriptGzipBytes:',
    ) !== 1
  ) {
    violations.push('NAV_BUDGET_HARD_LIMIT')
  }

  if (requiredArchitectureMarkers.some((marker) => !snapshot.architectureSource.includes(marker))) {
    violations.push('NAV_BUDGET_ARCHITECTURE')
  }

  if (
    exactOccurrenceCount(
      snapshot.checkBundleSource,
      'const minimumInitialJavaScriptHeadroomBytes = 8 * 1024',
    ) !== 1 ||
    exactOccurrenceCount(
      snapshot.checkBundleSource,
      'const minimumMotionFeatureJavaScriptHeadroomBytes = 8 * 1024',
    ) !== 1 ||
    exactOccurrenceCount(
      snapshot.checkBundleSource,
      'const maximumAlignedBudgetHeadroomBytes = 16 * 1024',
    ) !== 1
  ) {
    violations.push('NAV_BUDGET_MINIMUM_HEADROOM')
  }

  if (
    requiredBundleMeasurementMarkers.some((marker) => !snapshot.checkBundleSource.includes(marker))
  ) {
    violations.push('NAV_BUDGET_MEASUREMENT_INTEGRITY')
  }

  if (
    exactOccurrenceCount(
      snapshot.engineeringManifestSource,
      expectedInitialEngineeringManifestBudget,
    ) !== 1 ||
    exactOccurrenceCount(
      snapshot.engineeringManifestSource,
      expectedMotionEngineeringManifestBudget,
    ) !== 1 ||
    exactOccurrenceCount(snapshot.engineeringManifestSource, "{ id: '") !== 5 ||
    snapshot.engineeringManifestSource.includes('lazy-motion-adapter-javascript-gzip')
  ) {
    violations.push('NAV_BUDGET_GENERATED_MIRROR')
  }

  const navigationDynamicImportSpecifiers = [
    ...snapshot.navigationSource.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu),
  ].map((match) => match[1] ?? '')

  if (!isDeepStrictEqual(navigationDynamicImportSpecifiers, [])) {
    violations.push('NAV_BUDGET_DYNAMIC_NAVIGATION_IMPORT')
  }

  if (
    snapshot.routeCount !== 17 ||
    !snapshot.checkBundleSource.includes('const expectedLazyRouteCount = 17') ||
    !snapshot.checkBundleSource.includes('const expectedMotionFeatureDynamicRootCount = 1') ||
    !snapshot.checkBundleSource.includes(
      'const expectedDynamicRootCount = expectedLazyRouteCount + expectedMotionFeatureDynamicRootCount',
    ) ||
    !snapshot.checkBundleSource.includes(
      'const expectedDynamicRootKeys = new Set([...expectedLazyRouteKeys, motionFeatureManifestKey])',
    ) ||
    !snapshot.checkBundleSource.includes(
      "const motionFeatureRootId = 'admin-navigation-motion-dom-max'",
    ) ||
    !snapshot.checkBundleSource.includes(
      "const motionFeatureManifestKey = '../../packages/ui/src/adapters/motion/admin-navigation-dom-max.ts'",
    )
  ) {
    violations.push('NAV_BUDGET_ROUTE_LAZY_COUNT')
  }

  return violations
}

function runNavigationBudgetNegativeProbes(
  baseline: NavigationBudgetGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = navigationBudgetViolations(baseline)
  const probes: readonly [string, string, NavigationBudgetGateSnapshot][] = [
    [
      'navigation-budget-restores-previous-hard-limit',
      'NAV_BUDGET_HARD_LIMIT',
      {
        ...baseline,
        projectConfigSource: baseline.projectConfigSource.replace(
          `initialJavaScriptGzipBytes: ${String(expectedInitialJavaScriptBudgetBytes / 1024)} * 1024`,
          'initialJavaScriptGzipBytes: 180 * 1024',
        ),
      },
    ],
    [
      'navigation-budget-lowers-minimum-headroom',
      'NAV_BUDGET_MINIMUM_HEADROOM',
      {
        ...baseline,
        checkBundleSource: baseline.checkBundleSource.replace(
          'const minimumInitialJavaScriptHeadroomBytes = 8 * 1024',
          'const minimumInitialJavaScriptHeadroomBytes = 4 * 1024',
        ),
      },
    ],
    [
      'navigation-budget-breaks-motion-exclusive-formula',
      'NAV_BUDGET_MEASUREMENT_INTEGRITY',
      {
        ...baseline,
        checkBundleSource: baseline.checkBundleSource.replace(
          'const expectedMotionFeatureJavaScriptHardBudgetBytes = exactAlignedBundleBudget(',
          'const expectedMotionFeatureJavaScriptHardBudgetBytes = Math.ceil(',
        ),
      },
    ],
    [
      'navigation-budget-adds-dynamic-navigation-import',
      'NAV_BUDGET_DYNAMIC_NAVIGATION_IMPORT',
      {
        ...baseline,
        navigationSource: `${baseline.navigationSource}\nvoid import('./naive-menu')`,
      },
    ],
    [
      'navigation-budget-changes-route-lazy-count',
      'NAV_BUDGET_ROUTE_LAZY_COUNT',
      { ...baseline, routeCount: 18 },
    ],
    [
      'navigation-budget-leaves-motion-generated-mirror-at-wrong-limit',
      'NAV_BUDGET_GENERATED_MIRROR',
      {
        ...baseline,
        engineeringManifestSource: baseline.engineeringManifestSource.replace(
          `{ id: 'admin-navigation-motion-feature-javascript-gzip', limit: ${String(projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes)}, unit: 'bytes-gzip' }`,
          "{ id: 'admin-navigation-motion-feature-javascript-gzip', limit: 8192, unit: 'bytes-gzip' }",
        ),
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = navigationBudgetViolations(mutatedSnapshot)

      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          !isDeepStrictEqual(mutatedSnapshot, baseline) &&
          !baselineFailureCodes.includes(expectedFailureCode) &&
          failureCodes.includes(expectedFailureCode),
      })
    }),
  )
}

async function validateDependencies(): Promise<string[]> {
  const violations: string[] = []
  const workspace = parseYaml(
    await readFile(resolve(rootDirectory, 'pnpm-workspace.yaml'), 'utf8'),
  ) as JsonObject
  const lockfile = parseYaml(
    await readFile(resolve(rootDirectory, 'pnpm-lock.yaml'), 'utf8'),
  ) as JsonObject
  const uiManifest = JSON.parse(
    await readFile(resolve(rootDirectory, 'packages/ui/package.json'), 'utf8'),
  ) as JsonObject
  const webManifest = JSON.parse(
    await readFile(resolve(rootDirectory, 'apps/web/package.json'), 'utf8'),
  ) as JsonObject
  const designSystemManifest = JSON.parse(
    await readFile(resolve(rootDirectory, 'packages/design-system/package.json'), 'utf8'),
  ) as JsonObject
  const rootManifest = JSON.parse(
    await readFile(resolve(rootDirectory, 'package.json'), 'utf8'),
  ) as JsonObject
  const unoConfigSource = await readFile(resolve(rootDirectory, 'uno.config.ts'), 'utf8')
  const catalog = isJsonObject(workspace['catalog']) ? workspace['catalog'] : {}
  const workspacePatchedDependencies = isJsonObject(workspace['patchedDependencies'])
    ? workspace['patchedDependencies']
    : {}
  const catalogs = isJsonObject(lockfile['catalogs']) ? lockfile['catalogs'] : {}
  const defaultCatalog = isJsonObject(catalogs['default']) ? catalogs['default'] : {}
  const packages = isJsonObject(lockfile['packages']) ? lockfile['packages'] : {}
  const snapshots = isJsonObject(lockfile['snapshots']) ? lockfile['snapshots'] : {}
  const lockPatchedDependencies = isJsonObject(lockfile['patchedDependencies'])
    ? lockfile['patchedDependencies']
    : {}
  const motionPatchLockRecord = isJsonObject(lockPatchedDependencies['motion-v@2.4.0'])
    ? lockPatchedDependencies['motion-v@2.4.0']
    : {}
  const importers = isJsonObject(lockfile['importers']) ? lockfile['importers'] : {}
  const rootImporter = isJsonObject(importers['.']) ? importers['.'] : {}
  const webImporter = isJsonObject(importers['apps/web']) ? importers['apps/web'] : {}
  const designSystemImporter = isJsonObject(importers['packages/design-system'])
    ? importers['packages/design-system']
    : {}
  const uiImporter = isJsonObject(importers['packages/ui']) ? importers['packages/ui'] : {}
  const uiImporterDependencies = isJsonObject(uiImporter['dependencies'])
    ? uiImporter['dependencies']
    : {}
  const naiveImporter = isJsonObject(uiImporterDependencies['naive-ui'])
    ? uiImporterDependencies['naive-ui']
    : {}
  const motionVueImporter = isJsonObject(uiImporterDependencies['motion-v'])
    ? uiImporterDependencies['motion-v']
    : {}
  const vueUseCoreImporter = isJsonObject(uiImporterDependencies['@vueuse/core'])
    ? uiImporterDependencies['@vueuse/core']
    : {}
  const naivePackageCandidate = packages[`naive-ui@${expectedNaiveUiVersion}`]
  const naivePackage: JsonObject = isJsonObject(naivePackageCandidate) ? naivePackageCandidate : {}
  const resolution = isJsonObject(naivePackage['resolution']) ? naivePackage['resolution'] : {}
  const engines = isJsonObject(naivePackage['engines']) ? naivePackage['engines'] : {}
  const peerDependencies = isJsonObject(naivePackage['peerDependencies'])
    ? naivePackage['peerDependencies']
    : {}
  const motionVuePackageCandidate = packages[`motion-v@${expectedMotionVueVersion}`]
  const motionVuePackage: JsonObject = isJsonObject(motionVuePackageCandidate)
    ? motionVuePackageCandidate
    : {}
  const motionVueResolution = isJsonObject(motionVuePackage['resolution'])
    ? motionVuePackage['resolution']
    : {}
  const vueUseCorePackageCandidate = packages[`@vueuse/core@${expectedVueUseCoreVersion}`]
  const vueUseCorePackage: JsonObject = isJsonObject(vueUseCorePackageCandidate)
    ? vueUseCorePackageCandidate
    : {}
  const vueUseCoreResolution = isJsonObject(vueUseCorePackage['resolution'])
    ? vueUseCorePackage['resolution']
    : {}
  const uiDependencies = isJsonObject(uiManifest['dependencies']) ? uiManifest['dependencies'] : {}
  const webDependencies = isJsonObject(webManifest['dependencies'])
    ? webManifest['dependencies']
    : {}
  const designSystemDependencies = isJsonObject(designSystemManifest['dependencies'])
    ? designSystemManifest['dependencies']
    : {}
  const designSystemDevDependencies = isJsonObject(designSystemManifest['devDependencies'])
    ? designSystemManifest['devDependencies']
    : {}
  const rootDevDependencies = isJsonObject(rootManifest['devDependencies'])
    ? rootManifest['devDependencies']
    : {}
  const naivePackageKeys = Object.keys(packages).filter((key) => key.startsWith('naive-ui@'))
  const motionVuePackageKeys = Object.keys(packages).filter((key) => key.startsWith('motion-v@'))
  const vueUseCorePackageKeys = Object.keys(packages).filter((key) =>
    key.startsWith('@vueuse/core@'),
  )
  const motionVueSnapshotKeys = Object.keys(snapshots).filter((key) => key.startsWith('motion-v@'))
  const gsapPackageKeys = Object.keys(packages).filter((key) => key.startsWith('gsap@'))
  const gsapSnapshotKeys = Object.keys(snapshots).filter((key) => key.startsWith('gsap@'))
  const vuePackageKeys = Object.keys(packages).filter((key) => key.startsWith('vue@'))

  function importerSpecifiers(importer: JsonObject, field: string): JsonObject {
    const records = isJsonObject(importer[field]) ? importer[field] : {}
    return Object.fromEntries(
      Object.entries(records).map(([name, record]) => [
        name,
        isJsonObject(record) ? record['specifier'] : undefined,
      ]),
    )
  }

  if (
    !isDeepStrictEqual(rootDevDependencies, {
      '@iconify-json/lucide': 'catalog:',
      '@platform/design-system': 'workspace:*',
      '@types/node': 'catalog:',
      '@unocss/eslint-plugin': 'catalog:',
      '@unocss/preset-icons': 'catalog:',
      '@unocss/preset-wind4': 'catalog:',
      '@vitejs/plugin-vue': 'catalog:',
      eslint: 'catalog:',
      'eslint-plugin-boundaries': 'catalog:',
      'eslint-plugin-vue': 'catalog:',
      'eslint-plugin-vuejs-accessibility': 'catalog:',
      knip: 'catalog:',
      prettier: 'catalog:',
      stylelint: 'catalog:',
      tsx: 'catalog:',
      typescript: 'catalog:',
      'typescript-eslint': 'catalog:',
      unocss: 'catalog:',
      vite: 'catalog:',
      'vue-tsc': 'catalog:',
      yaml: 'catalog:',
    }) ||
    !isDeepStrictEqual(webDependencies, {
      '@platform/design-system': 'workspace:*',
      '@platform/ui': 'workspace:*',
      pinia: 'catalog:',
      vue: 'catalog:',
      'vue-router': 'catalog:',
      zod: 'catalog:',
    }) ||
    !isDeepStrictEqual(designSystemDependencies, {
      'colorjs.io': 'catalog:',
      zod: 'catalog:',
    }) ||
    !isDeepStrictEqual(designSystemDevDependencies, {
      '@unocss/core': 'catalog:',
      'style-dictionary': 'catalog:',
      unocss: 'catalog:',
    }) ||
    !isDeepStrictEqual(uiDependencies, {
      '@platform/design-system': 'workspace:*',
      '@vueuse/core': 'catalog:',
      'motion-v': 'catalog:',
      'naive-ui': 'catalog:',
      vue: 'catalog:',
    }) ||
    !exactSet(Object.keys(importers), ['.', 'apps/web', 'packages/design-system', 'packages/ui']) ||
    !isDeepStrictEqual(importerSpecifiers(rootImporter, 'devDependencies'), rootDevDependencies) ||
    !isDeepStrictEqual(importerSpecifiers(webImporter, 'dependencies'), webDependencies) ||
    !isDeepStrictEqual(
      importerSpecifiers(designSystemImporter, 'dependencies'),
      designSystemDependencies,
    ) ||
    !isDeepStrictEqual(
      importerSpecifiers(designSystemImporter, 'devDependencies'),
      designSystemDevDependencies,
    ) ||
    !isDeepStrictEqual(importerSpecifiers(uiImporter, 'dependencies'), uiDependencies)
  ) {
    violations.push(
      'PAVP-RUNTIME-002 exact dependency manifests or pnpm lock importer closure drifted.',
    )
  }

  if (
    catalog['naive-ui'] !== expectedNaiveUiVersion ||
    !isDeepStrictEqual(uiDependencies, {
      '@platform/design-system': 'workspace:*',
      '@vueuse/core': 'catalog:',
      'motion-v': 'catalog:',
      'naive-ui': 'catalog:',
      vue: 'catalog:',
    }) ||
    webDependencies['@platform/ui'] !== 'workspace:*' ||
    Object.hasOwn(webDependencies, 'naive-ui') ||
    naiveImporter['specifier'] !== 'catalog:' ||
    typeof naiveImporter['version'] !== 'string' ||
    !naiveImporter['version'].startsWith('2.45.2(vue@3.5.40') ||
    !isDeepStrictEqual(naivePackageKeys, ['naive-ui@2.45.2']) ||
    resolution['integrity'] !== expectedNaiveUiIntegrity ||
    engines['node'] !== '>=20' ||
    peerDependencies['vue'] !== '^3.0.0' ||
    !isDeepStrictEqual(vuePackageKeys, ['vue@3.5.40'])
  ) {
    violations.push('Naive UI exact dependency, lockfile, integrity or single-Vue closure drifted.')
  }

  if (
    catalog['motion-v'] !== expectedMotionVueVersion ||
    catalog['@vueuse/core'] !== expectedVueUseCoreVersion ||
    motionVueImporter['specifier'] !== 'catalog:' ||
    typeof motionVueImporter['version'] !== 'string' ||
    !motionVueImporter['version'].startsWith(
      `2.4.0(patch_hash=fe15a8c9fbe1795b63b62db2b0a262c44c45fe58fc75b14cd89c51ead0e19d59)`,
    ) ||
    vueUseCoreImporter['specifier'] !== 'catalog:' ||
    typeof vueUseCoreImporter['version'] !== 'string' ||
    !vueUseCoreImporter['version'].startsWith('14.4.0(vue@3.5.40') ||
    !isDeepStrictEqual(motionVuePackageKeys, ['motion-v@2.4.0']) ||
    !isDeepStrictEqual(vueUseCorePackageKeys, ['@vueuse/core@14.4.0']) ||
    motionVueSnapshotKeys.length !== 1 ||
    !motionVueSnapshotKeys[0]?.includes(
      'patch_hash=fe15a8c9fbe1795b63b62db2b0a262c44c45fe58fc75b14cd89c51ead0e19d59',
    ) ||
    !isDeepStrictEqual(
      Object.keys(workspacePatchedDependencies).filter((key) => key.startsWith('motion-v@')),
      ['motion-v@2.4.0'],
    ) ||
    workspacePatchedDependencies['motion-v@2.4.0'] !== 'patches/motion-v@2.4.0.patch' ||
    !isDeepStrictEqual(
      Object.keys(lockPatchedDependencies).filter((key) => key.startsWith('motion-v@')),
      ['motion-v@2.4.0'],
    ) ||
    motionPatchLockRecord['hash'] !==
      'fe15a8c9fbe1795b63b62db2b0a262c44c45fe58fc75b14cd89c51ead0e19d59' ||
    motionPatchLockRecord['path'] !== 'patches/motion-v@2.4.0.patch' ||
    motionVueResolution['integrity'] !== expectedMotionVueIntegrity ||
    vueUseCoreResolution['integrity'] !== expectedVueUseCoreIntegrity
  ) {
    violations.push(
      'Motion Vue scoped dependency, peer, patch identity or lockfile closure drifted.',
    )
  }

  if (
    Object.hasOwn(catalog, 'gsap') ||
    Object.hasOwn(defaultCatalog, 'gsap') ||
    Object.hasOwn(uiDependencies, 'gsap') ||
    Object.hasOwn(uiImporterDependencies, 'gsap') ||
    gsapPackageKeys.length !== 0 ||
    gsapSnapshotKeys.length !== 0
  ) {
    violations.push(
      'GSAP must be absent from the active Catalog, UI dependency and lockfile closure.',
    )
  }

  if (
    /\bsafelist\s*:/u.test(unoConfigSource) ||
    [...unoConfigSource.matchAll(/\bpresetIcons\s*\(/gu)].length !== 1 ||
    !unoConfigSource.includes('@iconify-json/lucide/icons.json')
  ) {
    violations.push('The exact existing Lucide UnoCSS projection drifted.')
  }

  for (const packageName of styledFrameworkPackages) {
    if (packageName === 'reka-ui') {
      continue
    }
    if (
      Object.hasOwn(catalog, packageName) ||
      Object.keys(packages).some((key) => key.startsWith(`${packageName}@`))
    ) {
      violations.push(`${packageName}: a second styled UI framework is forbidden.`)
    }
  }

  if (
    Object.hasOwn(catalog, 'reka-ui') ||
    Object.keys(packages).some((key) => key.startsWith('reka-ui@'))
  ) {
    violations.push('Reka UI must be absent from active Catalog and lockfile records.')
  }

  return violations
}

async function validateTokensAndLayout(): Promise<string[]> {
  const violations: string[] = []
  const unoCssProjections: readonly PublicRoleUnoCssProjection[] = PublicRoleRegistry.records.map(
    (record) => record.unocss,
  )
  const classProjections: readonly UnoCssClassProjection[] = unoCssProjections.filter(
    (projection): projection is UnoCssClassProjection =>
      projection.generatorKind !== 'container-variant',
  )
  const containerProjections: readonly UnoCssContainerVariantProjection[] =
    unoCssProjections.filter(
      (projection): projection is UnoCssContainerVariantProjection =>
        projection.generatorKind === 'container-variant',
    )
  const containerContributions: readonly UnoCssContainerBoundaryContribution[] =
    containerProjections.flatMap((projection) => projection.boundaryContributions)
  const layoutVariantIds: readonly LayoutContainerVariantId[] = [
    ...new Set(containerContributions.map((contribution) => contribution.variantName)),
  ]
  const layoutProjection = layoutRegistry.records.map((record) => [
    record.id,
    record.kind,
    record.resolvedValue,
    record.cssVariable,
  ])

  if (
    runtimeNumber(layoutRegistry.schemaVersion) !== 1 ||
    !isDeepStrictEqual(layoutProjection, expectedLayoutRecords) ||
    tokenManifest.schemaVersion !== 9 ||
    tokenManifest.tokens.length !== 145 ||
    tokenManifest.activePublicRoles.length !== 37 ||
    tokenManifest.unoCssMappings.length !== 37 ||
    tokenManifest.governance.recordCount !== 252 ||
    tokenManifest.governance.baselineRecordCount !== 181 ||
    tokenManifest.governance.expectedRecordCountDelta !== 71 ||
    classProjections.length !== 35 ||
    containerProjections.length !== 2 ||
    containerContributions.length !== 4 ||
    !exactSet(layoutVariantIds, ['layout-narrow', 'layout-regular', 'layout-wide'])
  ) {
    violations.push('Design Token, Public Role, Layout Registry or Manifest cardinality drifted.')
  }

  const adminManifestRecords = tokenManifest.tokens
    .filter((record) => record.name.startsWith('admin.'))
    .map((record) => [record.name, record.type, record.resolvedValue, record.cssVariable])
  const source = JSON.parse(
    await readFile(
      resolve(rootDirectory, 'packages/design-system/tokens/semantic/admin-console.tokens.json'),
      'utf8',
    ),
  ) as JsonObject
  const sourceAdmin = isJsonObject(source['admin']) ? source['admin'] : {}

  const expectedAdminManifestRecords = expectedAdminTokens.map((record) => [
    record.name,
    record.type,
    record.resolvedValue,
    record.cssVariable,
  ])
  const sourceTokenInvalid = expectedAdminTokens.some((record) => {
    const segments = record.name.split('.').slice(1)
    let current: unknown = sourceAdmin

    for (const segment of segments) {
      current = isJsonObject(current) ? current[segment] : undefined
    }

    return (
      !isJsonObject(current) ||
      !isDeepStrictEqual(Object.keys(current), ['$type', '$value', '$extensions']) ||
      current['$type'] !== record.type ||
      !isDeepStrictEqual(current['$value'], record.value) ||
      !isDeepStrictEqual(current['$extensions'], { 'org.pavp': { role: record.name } })
    )
  })

  if (
    !isDeepStrictEqual(adminManifestRecords, expectedAdminManifestRecords) ||
    sourceTokenInvalid ||
    !isJsonObject(sourceAdmin['$extensions']) ||
    JSON.stringify(sourceAdmin['$extensions']) !==
      JSON.stringify({ 'org.pavp': { visibility: 'ui-internal' } })
  ) {
    violations.push('The exact twenty-three Admin semantic projections drifted.')
  }

  const containerMappings = tokenManifest.unoCssMappings.filter(
    (record) => record.generatorKind === 'container-variant',
  )
  if (
    containerMappings.length !== 2 ||
    containerMappings.some(
      (record) =>
        record.containerName !== 'pavp-admin-shell' ||
        record.containerType !== 'inline-size' ||
        record.measurementAxis !== 'inline',
    )
  ) {
    violations.push('Generated Layout container-variant mappings drifted.')
  }

  return violations
}

async function validateRoutesShellAndMotion(): Promise<string[]> {
  const violations: string[] = []
  const productRoutes = routeRegistry.filter((record) => record.meta.layout === 'workspace')
  const breadcrumbRegistry: Readonly<Record<RouteBreadcrumbKey, string>> = routeBreadcrumbRegistry
  const layoutPresets: readonly LayoutPresetId[] = [
    ...new Set(
      routeRegistry.flatMap((record) =>
        record.meta.layout === 'workspace' ? (['workspace'] as const) : [],
      ),
    ),
  ]
  const actualProduct = productRoutes.map((record) => [
    record.name,
    record.pathPattern,
    record.sourcePath,
    routeTitleRegistry[record.meta.titleKey],
  ])
  const shellSource = await readFile(
    resolve(rootDirectory, 'packages/ui/src/components/UiAdminShell.vue'),
    'utf8',
  )
  const appSource = await readFile(resolve(rootDirectory, 'apps/web/src/App.vue'), 'utf8')
  const appStyles = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/styles/layers.css'),
    'utf8',
  )
  const appearancePage = await readFile(
    resolve(rootDirectory, 'apps/web/src/pages/appearance.vue'),
    'utf8',
  )
  const naiveProviderSource = await readFile(
    resolve(rootDirectory, 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue'),
    'utf8',
  )

  if (
    runtimeCount(routeRegistry) !== 17 ||
    runtimeCount(productRoutes) !== 10 ||
    runtimeCount(errorRouteRegistry) !== 7 ||
    Object.keys(breadcrumbRegistry).length !== 10 ||
    !exactSet(layoutPresets, ['workspace']) ||
    !isDeepStrictEqual(actualProduct, productRouteContract)
  ) {
    violations.push('The exact 17/10/7 Route Registry closure drifted.')
  }

  if (
    [...appSource.matchAll(/<RouterView\b/gu)].length !== 1 ||
    [...shellSource.matchAll(/new ResizeObserver\b/gu)].length !== 1 ||
    !shellSource.includes('container-name: pavp-admin-shell') ||
    !shellSource.includes('data-scroll-owner="architecture-console-content"') ||
    !shellSource.includes("document.documentElement.style.overflow = 'hidden'") ||
    !shellSource.includes("document.body.style.overflow = 'hidden'") ||
    [...shellSource.matchAll(/env\(safe-area-inset-/gu)].length !== 8 ||
    /(?:48rem|80rem|3\.5rem|4rem|16rem|20rem|44px)/u.test(shellSource)
  ) {
    violations.push(
      'Admin Shell container, observer, scroll, safe-area or generated-size closure drifted.',
    )
  }

  const shellRegions: readonly AdminShellRegionRegistryRecord[] = adminShellRegionRegistry.records
  const profilePolicies: readonly LayoutProfileThresholdPolicyRecord[] =
    adminShellLayoutPolicyRegistry.profileThresholdPolicies
  const targetPolicies: readonly MinimumTargetPolicyRecord[] =
    adminShellLayoutPolicyRegistry.minimumTargetPolicies
  const safeAreaPolicies: readonly SafeAreaPolicyRecord[] =
    adminShellLayoutPolicyRegistry.safeAreaPolicies

  if (
    shellRegions.length !== 4 ||
    !exactSet(
      shellRegions.map((record) => record.id),
      [
        'architecture-console-content',
        'architecture-console-header',
        'architecture-console-navigation',
        'architecture-console-navigation-overlay',
      ],
    ) ||
    profilePolicies.length !== 1 ||
    targetPolicies.length !== 1 ||
    safeAreaPolicies.length !== 1
  ) {
    violations.push('Admin Shell Region or Layout Policy Registry drifted.')
  }

  const requiredMotionMarkers = [
    '.pavp-admin-shell__navigation-action[aria-current=',
    "[data-pavp-admin-navigation='persistent'] .n-layout-sider",
    'pavp-admin-drawer-enter-active',
    '.pavp-route-content',
    '.n-button',
    'pavp-setting-commit',
    'pavp-admin-ambient-drift',
    "data-motion='reduced'",
    "data-motion='none'",
  ]
  const motionSource = shellSource + appStyles + appearancePage + naiveProviderSource
  const nonShellAndAppearanceOpticalSource = appStyles + naiveProviderSource

  if (
    requiredMotionMarkers.some((marker) => !motionSource.includes(marker)) ||
    /transition\s*:\s*all\b/iu.test(motionSource) ||
    /\b(?:animation|transition)(?:-duration|-delay)?\s*:[^;]*(?:\d+(?:\.\d+)?)(?:ms|s)\b/iu.test(
      motionSource,
    ) ||
    /\b(?:backdrop-filter|filter)\s*:|\b(?:blur|brightness|saturate)\s*\(/iu.test(
      nonShellAndAppearanceOpticalSource,
    )
  ) {
    violations.push('The exact token-governed Motion and optical-effect contract drifted.')
  }

  if (
    !shellSource.includes('@media (forced-colors: active)') ||
    !shellSource.includes('@media (prefers-reduced-transparency: reduce)')
  ) {
    violations.push('Forced Colors or Reduced Transparency fallback is missing.')
  }

  return violations
}

async function validateAppearanceAndPageFacts(): Promise<{
  readonly violations: string[]
  readonly factImportViolation: boolean
  readonly pageSource: string
  readonly competingEnvironmentSource: string
  readonly capabilityTemplate: string
}> {
  const violations: string[] = []
  const pageSources: string[] = []
  let factImportViolation = false
  let capabilityTemplate = ''

  for (const [path, expectedImports] of pageFactImportContract) {
    const source = await readFile(resolve(rootDirectory, path), 'utf8')
    const imports = importedModules(path, source)
    pageSources.push(source)
    if (!exactSet(imports, expectedImports)) {
      factImportViolation = true
      violations.push(`${path}: safe Inspector fact-import contract drifted.`)
    }
    if (path.endsWith('/capabilities.vue')) {
      capabilityTemplate = templateContent(source)
    }
  }

  const readBoundarySource = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/appearance/appearance-read-boundary.ts'),
    'utf8',
  )
  const mutationBoundarySource = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/appearance/appearance-mutation-boundary.ts'),
    'utf8',
  )
  const bootstrapSource = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/appearance/appearance-bootstrap.ts'),
    'utf8',
  )
  const appFiles = (await collectFiles(resolve(rootDirectory, 'apps/web/src'))).filter((path) =>
    ['.ts', '.vue'].includes(extname(path)),
  )
  const competingEnvironmentSources: string[] = []
  let defineStoreCount = 0

  for (const path of appFiles) {
    const source = await readFile(path, 'utf8')
    const repositoryPath = relative(rootDirectory, path).split('\\').join('/')
    const admittedRouteTransitionSupportCheck =
      repositoryPath ===
        'apps/web/src/app/router/route-transition/route-transition-coordinator.ts' &&
      [...source.matchAll(/\bCSS\.supports\s*\(/gu)].length === 1 &&
      source.includes(
        "CSS.supports('selector(:active-view-transition-type(pavp-route-content-crossfade))')",
      ) &&
      !/\bmatchMedia\s*\(/u.test(source)
    defineStoreCount += [...source.matchAll(/\bdefineStore\s*\(/gu)].length
    if (
      repositoryPath !== 'apps/web/src/app/appearance/appearance-bootstrap.ts' &&
      !admittedRouteTransitionSupportCheck &&
      /\b(?:matchMedia|CSS\.supports)\s*\(/u.test(source)
    ) {
      competingEnvironmentSources.push(source)
    }
  }

  if (
    !exactSet(exportNames(readBoundarySource), [
      'AppearanceReadBoundary',
      'createAppearanceReadBoundary',
      'provideAppearanceReadBoundary',
      'useAppearanceReadBoundary',
    ]) ||
    !exactSet(exportNames(mutationBoundarySource), [
      'AppearanceMutationBoundary',
      'AppearanceMutationResult',
      'createAppearanceMutationBoundary',
      'provideAppearanceMutationBoundary',
      'useAppearanceMutationBoundary',
    ]) ||
    [...bootstrapSource.matchAll(/\.\$subscribe\s*\(/gu)].length !== 1 ||
    !bootstrapSource.includes("{ detached: true, flush: 'sync' }") ||
    mutationBoundarySource.includes('installCuratedThemeCatalog') ||
    bootstrapSource.includes('installCuratedCustomThemeCatalog') ||
    defineStoreCount !== 1 ||
    competingEnvironmentSources.length !== 0
  ) {
    violations.push(
      'Appearance readonly, stateless mutation or single environment/store authority drifted.',
    )
  }

  const joinedPages = pageSources.join('\n')
  if (
    /\b(?:localStorage|sessionStorage|useAppearanceStore|matchMedia|CSS\.supports)\b/u.test(
      joinedPages,
    ) ||
    /\bthemeOverrides\b/u.test(joinedPages)
  ) {
    violations.push('A Console page bypasses Appearance, Storage or vendor-theme ownership.')
  }

  if (
    /<(?:UiButton|UiSegmentedControl|button|input|select|textarea)\b/u.test(capabilityTemplate) ||
    /\b(?:mock|placeholder|fake metric)\b/iu.test(joinedPages)
  ) {
    violations.push('Inactive capability controls or placeholder data are forbidden.')
  }

  return {
    violations,
    factImportViolation,
    pageSource: joinedPages,
    competingEnvironmentSource: competingEnvironmentSources.join('\n'),
    capabilityTemplate,
  }
}

async function validateNaiveOverrides(): Promise<string[]> {
  const violations: string[] = []
  const [
    themeSource,
    providerSource,
    buttonSource,
    radioCardSource,
    segmentedSource,
    statusBadgeSource,
    descriptionListSource,
    pageHeaderSource,
  ] = await Promise.all([
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'), 'utf8'),
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiButton.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiRadioCardGroup.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiSegmentedControl.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiStatusBadge.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiDescriptionList.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiPageHeader.vue'), 'utf8'),
  ])
  const overrides = themeOverrideObject(themeSource)

  if (overrides === undefined) {
    return ['The PAVP-to-Naive theme override object is unavailable.']
  }

  const overrideNames = staticObjectPropertyNames(overrides)
  if (
    overrideNames === undefined ||
    !exactSet(overrideNames, [...Object.keys(themeOverrideContract), 'Layout', 'Menu'])
  ) {
    violations.push('PAVP-to-Naive override component inventory drifted.')
  }

  for (const [component, expectedProperties] of Object.entries(themeOverrideContract)) {
    const componentOverride = objectPropertyObject(overrides, component)
    const actualProperties =
      componentOverride === undefined ? undefined : staticObjectPropertyNames(componentOverride)
    if (actualProperties === undefined || !exactSet(actualProperties, expectedProperties)) {
      violations.push(`${component}: complete PAVP-owned Naive override map drifted.`)
    }
  }

  if (naiveCommonParserSensitiveOverrides(themeSource).length > 0) {
    violations.push(
      'Naive global common parser-sensitive colors must retain vendor-concrete inputs.',
    )
  }

  if (
    /#[\da-f]{3,8}\b|\b(?:hsl|hwb|lab|lch|oklab|oklch|rgb)\s*\(|\b\d+(?:\.\d+)?(?:ms|s|px|rem)\b/iu.test(
      themeSource,
    )
  ) {
    violations.push('Naive theme projection contains a raw visual authority.')
  }

  const requiredProjectionMarkers = [
    'appearance.material',
    'appearance.motion',
    "case 'adaptive'",
    "case 'reduced'",
    "case 'solid'",
    "case 'full'",
    "case 'none'",
    'var(--ui-material-chrome-background)',
    'Tooltip: tooltipDark',
    'iconSizeMedium: headerActionIconSize',
    'colorHover: navigationHoverSurface',
    'colorPressed: navigationSelectedSurface',
    'colorFocus: navigationHoverSurface',
    'textColorTertiary: colorTextSecondary',
    'textColorHover: colorControl',
    'padding: compactOverlaySpacing',
    'space: compactOverlaySpacing',
  ]
  const normalizedThemeSource = themeSource.replaceAll(/\s+/gu, ' ')
  const expectedMaterialBranches = [
    "case 'adaptive': return { chrome: materialChrome, shadow }",
    "case 'reduced': return { chrome: materialChrome, shadow: 'none' }",
    "case 'solid': return { chrome: materialChrome, shadow: 'none' }",
  ] as const
  const importantMotionDeclarations = providerSource
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('!important'))
  const expectedImportantMotionDeclarationCount = providerSource.includes(
    '.pavp-admin-shell__header-action.n-button:focus:not(:focus-visible)',
  )
    ? 52
    : 51
  if (
    requiredProjectionMarkers.some((marker) => !themeSource.includes(marker)) ||
    expectedMaterialBranches.some((branch) => !normalizedThemeSource.includes(branch)) ||
    !providerSource.includes("html[data-motion='reduced']") ||
    !providerSource.includes("html[data-motion='none']") ||
    !providerSource.includes(
      "html[data-motion='full'] .pavp-admin-shell__header-action-icon-state",
    ) ||
    !providerSource.includes(
      "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state",
    ) ||
    !providerSource.includes(
      "html[data-motion='none'] .pavp-admin-shell__header-action-icon-state",
    ) ||
    !providerSource.includes('.pavp-admin-shell__header-action-tooltip') ||
    !providerSource.includes('transition: none !important;') ||
    !providerSource.includes('animation: none !important;') ||
    importantMotionDeclarations.length !== expectedImportantMotionDeclarationCount ||
    importantMotionDeclarations.some(
      (declaration) =>
        !/^(?:animation|animation-duration|opacity|transform|transition|transition-duration|transition-property|transition-timing-function):/u.test(
          declaration,
        ),
    )
  ) {
    violations.push('Naive Material or Motion projection is incomplete.')
  }

  if (
    !buttonSource.includes("readonly variant?: 'ghost' | 'primary' | 'secondary'") ||
    !buttonSource.includes(':ghost="variant === \'ghost\'"') ||
    !buttonSource.includes(':secondary="variant === \'secondary\'"') ||
    !buttonSource.includes(":type=\"variant === 'primary' ? 'primary' : 'default'\"") ||
    !buttonSource.includes(':disabled="disabled"') ||
    !radioCardSource.includes('<PavpRadioGroupPrimitive') ||
    !radioCardSource.includes('<PavpRadioButtonPrimitive') ||
    !radioCardSource.includes(':name="groupName"') ||
    !radioCardSource.includes(':data-selected="option.value === modelValue"') ||
    !radioCardSource.includes('pavp-radio-card-group__option:focus-within') ||
    !segmentedSource.includes('<PavpRadioGroupPrimitive') ||
    !segmentedSource.includes('<PavpRadioButtonPrimitive') ||
    !statusBadgeSource.includes('<PavpTagPrimitive') ||
    !statusBadgeSource.includes('bordered') ||
    /\b(?:checkable|closable|strong)\b/u.test(templateContent(statusBadgeSource)) ||
    !descriptionListSource.includes('<PavpDescriptionsPrimitive') ||
    !descriptionListSource.includes('bordered') ||
    !descriptionListSource.includes(':column="1"') ||
    !descriptionListSource.includes('label-placement="left"') ||
    !pageHeaderSource.includes('<PavpBreadcrumbPrimitive') ||
    !pageHeaderSource.includes('<PavpBreadcrumbItemPrimitive')
  ) {
    violations.push('Current public Naive wrapper variants or rendered-state contract drifted.')
  }

  return violations
}

function validateInspectorProjections(): string[] {
  const violations: string[] = []
  const runtimeErrorCounts: RuntimeKernelConsoleErrorRecordCounts =
    runtimeKernelConsoleProjection.errorRecordCounts
  const routerRecords: readonly RouterConsoleRouteRecord[] = routerConsoleProjection.routes
  const storageRecords: readonly StorageConsoleRecord[] = storageConsoleProjection.records
  const capabilityRecords: readonly CapabilityManifestRecord[] = capabilityManifest.records
  const capabilityImplementationStatuses: readonly CapabilityImplementationStatus[] =
    capabilityRecords.map((record) => record.implementationStatus)
  const capabilityPresentationModes: readonly CapabilityPresentationMode[] = capabilityRecords.map(
    (record) => record.presentationMode,
  )
  const engineeringCoordinates: EngineeringCoordinates = engineeringManifest.coordinates
  const engineeringBudgets: readonly EngineeringBundleBudgetRecord[] =
    engineeringManifest.bundleBudgets

  if (
    runtimeNumber(designSystemConsoleProjection.publicRoleCount) !== 37 ||
    runtimeNumber(designSystemConsoleProjection.manifestSchemaVersion) !== 9 ||
    runtimeNumber(designSystemConsoleProjection.manifestRecordCount) !== 252 ||
    !isDeepStrictEqual(designSystemConsoleProjection.builtInThemeIds, [
      'amber',
      'cobalt',
      'coral',
      'graphite',
      'iris',
      'jade',
      'lagoon',
      'stone-blue-ash',
      'misty-rose-blue',
      'honey-apricot-cream',
      'cerulean-sky-navy',
      'lavender-ivory',
      'denim-cocoa',
      'burgundy-snow',
    ]) ||
    runtimeNumber(runtimeKernelConsoleProjection.stepCount) !== 11 ||
    runtimeNumber(runtimeErrorCounts.total) !== 21 ||
    !isDeepStrictEqual(runtimeKernelConsoleProjection.activeProviderIds, ['pinia', 'appearance']) ||
    runtimeNumber(routerConsoleProjection.routeCount) !== 17 ||
    runtimeNumber(routerConsoleProjection.productRouteCount) !== 10 ||
    runtimeNumber(routerConsoleProjection.errorRouteCount) !== 7 ||
    runtimeCount(routerRecords) !== 17 ||
    runtimeNumber(storageConsoleProjection.recordCount) !== 2 ||
    runtimeCount(storageRecords) !== 2 ||
    runtimeCount(uiSystemConsoleProjection.publicComponentIds) !== 9 ||
    runtimeString(uiSystemConsoleProjection.styledVendor.coordinate) !== 'naive-ui@2.45.2' ||
    runtimeCount(responsiveLayoutConsoleProjection.profiles) !== 3 ||
    runtimeCount(responsiveLayoutConsoleProjection.shellRegionIds) !== 4 ||
    runtimeCount(responsiveLayoutConsoleProjection.sizeTokens) !== 7 ||
    runtimeNumber(engineeringManifest.schemaVersion) !== 1 ||
    runtimeCount(engineeringManifest.verifyStageIds) !== 14 ||
    runtimeNumber(capabilityManifest.schemaVersion) !== 1 ||
    runtimeNumber(capabilityManifest.recordCount) !== 20 ||
    runtimeCount(capabilityRecords) !== 20 ||
    capabilityImplementationStatuses.some(
      (status) => !['complete', 'not-started', 'deferred'].includes(status),
    ) ||
    capabilityPresentationModes.some(
      (mode) => !['active-interactive', 'active-read-only', 'roadmap-only'].includes(mode),
    ) ||
    runtimeCount(engineeringBudgets) !== 5 ||
    !isDeepStrictEqual(engineeringBudgets, [
      { id: 'generated-token-manifest-gzip', limit: 32768, unit: 'bytes-gzip' },
      {
        id: 'admin-navigation-motion-feature-javascript-gzip',
        limit: projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes,
        unit: 'bytes-gzip',
      },
      { id: 'initial-css-gzip', limit: 40960, unit: 'bytes-gzip' },
      {
        id: 'initial-javascript-gzip',
        limit: expectedInitialJavaScriptBudgetBytes,
        unit: 'bytes-gzip',
      },
      { id: 'lazy-route-javascript-gzip', limit: 122880, unit: 'bytes-gzip' },
    ]) ||
    runtimeString(engineeringCoordinates.node) !== 'node@24.15.0'
  ) {
    violations.push('One or more safe Inspector projections diverged from active authorities.')
  }

  const navigationProjection = consoleNavigationRegistry.map((group) => [
    group.label,
    group.items.map((item) => item.label),
  ])
  const navigationIconProjection = consoleNavigationRegistry.flatMap((group) =>
    group.items.map((item) => item.iconClass),
  )
  if (
    !isDeepStrictEqual(navigationProjection, [
      ['工作台', ['总览']],
      ['视觉系统', ['主题与外观', '设计令牌']],
      ['应用基础', ['运行时内核', '路由治理', '存储与持久化']],
      ['界面基础', ['UI 组件', '响应式布局']],
      ['开发治理', ['工程与质量']],
      ['架构规划', ['能力路线图']],
    ]) ||
    !isDeepStrictEqual(navigationIconProjection, expectedNavigationIconClasses)
  ) {
    violations.push('Visible Chinese Sidebar taxonomy or Lucide projection drifted.')
  }

  return violations
}

export async function validateArchitectureAdminConsole(): Promise<readonly string[]> {
  const violations: string[] = []
  const appearanceAndFacts = await validateAppearanceAndPageFacts()
  const [engineeringViolations, capabilityViolations, uiViolations] = await Promise.all([
    validateEngineeringManifest(),
    validateCapabilityManifest(),
    validateUiPublicComponents(),
  ])
  const applicationFiles = (await collectFiles(resolve(rootDirectory, 'apps/web/src'))).filter(
    (path) => ['.ts', '.vue'].includes(extname(path)),
  )
  const allUiFiles = (await collectFiles(resolve(rootDirectory, 'packages/ui/src'))).filter(
    (path) => ['.ts', '.vue'].includes(extname(path)),
  )
  const nonAdapterUiFiles = (await collectFiles(resolve(rootDirectory, 'packages/ui/src'))).filter(
    (path) =>
      ['.ts', '.vue'].includes(extname(path)) &&
      !relative(rootDirectory, path).startsWith('packages/ui/src/adapters/naive/'),
  )
  const [applicationSources, allUiSources, nonAdapterUiSources] = await Promise.all([
    Promise.all(applicationFiles.map((path) => readFile(path, 'utf8'))),
    Promise.all(allUiFiles.map((path) => readFile(path, 'utf8'))),
    Promise.all(nonAdapterUiFiles.map((path) => readFile(path, 'utf8'))),
  ])
  const outsideMotionPrivateUiSources = allUiSources.filter(
    (_source, index) =>
      !relative(rootDirectory, allUiFiles[index] ?? '').startsWith(
        'packages/ui/src/adapters/motion/',
      ),
  )
  const adminNavigationMotionAdapterPresent = await access(
    resolve(rootDirectory, 'packages/ui/src/adapters/gsap/admin-navigation-motion.ts'),
  ).then(
    () => true,
    () => false,
  )
  const [
    workspaceSource,
    lockSource,
    uiManifestSource,
    webManifestSource,
    appSource,
    themeSource,
    naiveProviderSource,
    uiProviderSource,
    shellSource,
    adminTokenSource,
    routeRegistrySource,
    architectureSource,
    appearancePageSource,
    appearanceThemeProjectionSource,
    buttonAdapterSource,
    iconAdapterSource,
    layoutAdapterSource,
    menuAdapterSource,
    runtimeContextSource,
    projectConfigSource,
    checkBundleSource,
    engineeringManifestSource,
    motionDomMaxSource,
    motionRuntimeSource,
    motionSelectionLensSource,
    publicUiRootSource,
    tooltipAdapterSource,
  ] = await Promise.all([
    readFile(resolve(rootDirectory, 'pnpm-workspace.yaml'), 'utf8'),
    readFile(resolve(rootDirectory, 'pnpm-lock.yaml'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/package.json'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/package.json'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/App.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'), 'utf8'),
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'packages/ui/src/providers/UiProvider.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiAdminShell.vue'), 'utf8'),
    readFile(
      resolve(rootDirectory, 'packages/design-system/tokens/semantic/admin-console.tokens.json'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'apps/web/src/app/router/route-registry.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'ARCHITECTURE.md'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/pages/appearance.vue'), 'utf8'),
    readFile(
      resolve(
        rootDirectory,
        'packages/design-system/src/console/appearance-workspace-theme-projection.ts',
      ),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/naive-button.ts'), 'utf8'),
    access(resolve(rootDirectory, 'packages/ui/src/adapters/naive/naive-icon.ts'))
      .then(() =>
        readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/naive-icon.ts'), 'utf8'),
      )
      .catch(() => ''),
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/naive-layout.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/naive-menu.ts'), 'utf8'),
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-runtime-context.ts'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'project.config.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'scripts/verify/check-bundle.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/generated/engineering-manifest.ts'), 'utf8'),
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/motion/admin-navigation-dom-max.ts'),
      'utf8',
    ),
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/motion/admin-navigation-motion-runtime.ts'),
      'utf8',
    ),
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/motion/AdminNavigationSelectionLens.vue'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'packages/ui/src/index.ts'), 'utf8'),
    access(resolve(rootDirectory, 'packages/ui/src/adapters/naive/naive-tooltip.ts'))
      .then(() =>
        readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/naive-tooltip.ts'), 'utf8'),
      )
      .catch(() => ''),
  ])
  const [naiveDropdownSource, naiveMenuChildSource, naivePopoverSource, naiveSubmenuSource] =
    await Promise.all([
      readFile(requireFromUi.resolve('naive-ui/es/dropdown/src/Dropdown.mjs'), 'utf8'),
      readFile(requireFromUi.resolve('naive-ui/es/menu/src/use-menu-child.mjs'), 'utf8'),
      readFile(requireFromUi.resolve('naive-ui/es/popover/src/Popover.mjs'), 'utf8'),
      readFile(requireFromUi.resolve('naive-ui/es/menu/src/Submenu.mjs'), 'utf8'),
    ])
  const [
    appStylesSource,
    consoleFrameSource,
    appearanceStoreSource,
    appearanceMutationBoundarySource,
    appearanceBootstrapSource,
    generatedTokensCssSource,
    tokenBuildResult,
  ] = await Promise.all([
    readFile(resolve(rootDirectory, 'apps/web/src/app/styles/layers.css'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/console/ConsoleRouteFrame.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/appearance/appearance.store.ts'), 'utf8'),
    readFile(
      resolve(rootDirectory, 'apps/web/src/app/appearance/appearance-mutation-boundary.ts'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'apps/web/src/app/appearance/appearance-bootstrap.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/design-system/src/generated/tokens.css'), 'utf8'),
    validateTokens(),
  ])
  const publicComponentExports = uiPublicComponentRegistry.records.map(
    (record) => record.exportName,
  )
  const baseline: MaterialGateSnapshot = {
    appStylesSource,
    applicationImportSource: applicationSources.join('\n'),
    nonAdapterUiSource: nonAdapterUiSources.join('\n'),
    manifestAndLockSource: [workspaceSource, lockSource, uiManifestSource, webManifestSource].join(
      '\n',
    ),
    pageVisualSource: appearanceAndFacts.pageSource,
    appearancePageSource,
    appearanceThemeProjectionSource,
    appearanceMutationSource: [
      appearanceStoreSource,
      appearanceMutationBoundarySource,
      appearanceBootstrapSource,
    ].join('\n'),
    appTemplateSource: appSource,
    consoleFrameSource,
    factImportViolation: appearanceAndFacts.factImportViolation,
    pageStorageSource: appearanceAndFacts.pageSource,
    competingAppearanceEnvironmentSource: appearanceAndFacts.competingEnvironmentSource,
    capabilityPageTemplateSource: appearanceAndFacts.capabilityTemplate,
    themeAdapterSource: themeSource,
    naiveProviderSource,
    uiProviderSource,
    shellSource,
    adminTokenSource,
    routeRegistrySource,
    generatedManifestsEqual:
      engineeringViolations.length === 0 && capabilityViolations.length === 0,
    generatedTokensCssSource,
    expectedTokensCssSource: formatRuntimeCss(tokenBuildResult),
    routeCount: routeRegistry.length,
    publicComponentExports,
    registeredPublicComponents: uiPublicComponentRegistry.records.map((record) => ({
      exportName: record.exportName,
      consumerCount: record.consumerRouteNames.length,
    })),
  }
  const navigationReworkBaseline: NavigationReworkSourceSnapshot = {
    applicationSource: applicationSources.join('\n'),
    layoutAdapterSource,
    menuAdapterSource,
    providerSource: naiveProviderSource,
    runtimeContextSource,
    shellSource,
    themeSource,
  }
  const adminNavigationNativeSourceBaseline: AdminNavigationNativeSourceSnapshot = {
    adminNavigationMotionAdapterPresent,
    appSource,
    appStylesSource,
    applicationSource: [...applicationSources, ...allUiSources].join('\n'),
    architectureSource,
    appearancePageSource,
    buttonAdapterSource,
    checkBundleSource,
    consoleFrameSource,
    engineeringManifestSource,
    iconAdapterSource,
    lockSource,
    motionDomMaxSource,
    motionRuntimeSource,
    motionSelectionLensSource,
    naiveDropdownSource,
    naiveMenuChildSource,
    naivePopoverSource,
    naiveSubmenuSource,
    nonAdapterSource: [...applicationSources, ...nonAdapterUiSources].join('\n'),
    outsideMotionPrivateSource: [...applicationSources, ...outsideMotionPrivateUiSources].join(
      '\n',
    ),
    projectConfigSource,
    providerSource: naiveProviderSource,
    publicComponentExports,
    publicUiRootSource,
    routeCount: routeRegistry.length,
    runtimeKernelStepCount: runtimeNumber(runtimeKernelConsoleProjection.stepCount),
    activeProviderIds: runtimeKernelConsoleProjection.activeProviderIds,
    storageRecordCount: runtimeNumber(storageConsoleProjection.recordCount),
    shellSource,
    themeSource,
    tooltipAdapterSource,
    uiManifestSource,
    workspaceSource,
  }
  const navigationBudgetBaseline: NavigationBudgetGateSnapshot = {
    architectureSource,
    checkBundleSource,
    engineeringManifestSource,
    navigationSource: [
      layoutAdapterSource,
      menuAdapterSource,
      naiveProviderSource,
      runtimeContextSource,
      shellSource,
      themeSource,
    ].join('\n'),
    projectConfigSource,
    routeCount: routeRegistry.length,
  }
  const negativeProbeResults = runArchitectureAdminConsoleNegativeProbes(baseline)
  const motionGeometryNegativeProbeResults = runMotionGeometryNegativeProbes(baseline)
  const runtime002NegativeProbeResults = runRuntime002NegativeProbes(baseline)
  const runtime005NegativeProbeResults = runRuntime005NegativeProbes(baseline)
  const acceptanceClosureNegativeProbeResults =
    runAcceptanceClosureNegativeProbes(architectureSource)
  const runtime003AdmissionNegativeProbeResults =
    runRuntime003AdmissionNegativeProbes(architectureSource)
  const runtime003AcceptanceClosureNegativeProbeResults =
    runRuntime003AcceptanceClosureNegativeProbes(architectureSource)
  const adminNavigationGsapAdmissionNegativeProbeResults =
    runAdminNavigationGsapAdmissionNegativeProbes(architectureSource)
  const adminNavigationThemeReflowAdmissionNegativeProbeResults =
    runAdminNavigationThemeReflowAdmissionNegativeProbes(architectureSource)
  const adminNavigationHighlightRevealAdmissionNegativeProbeResults =
    runAdminNavigationHighlightRevealAdmissionNegativeProbes(architectureSource)
  const adminNavigationNativeAdmissionNegativeProbeResults =
    runAdminNavigationNativeAdmissionNegativeProbes(architectureSource)
  const adminNavigationNativeAcceptanceClosureNegativeProbeResults =
    runAdminNavigationNativeAcceptanceClosureNegativeProbes(architectureSource)
  const adminNavigationMotionVueSelectionLensAdmissionNegativeProbeResults =
    runAdminNavigationMotionVueSelectionLensAdmissionNegativeProbes(architectureSource)
  const routeTransitionAdmissionNegativeProbeResults =
    runRouteTransitionAdmissionNegativeProbes(architectureSource)
  violations.push(...validateRouteTransitionInventoryGovernance(architectureSource))
  const adminNavigationMotionVueSelectionLensSourceInvariantResultsBaseline =
    adminNavigationMotionVueSelectionLensSourceInvariantResults(adminNavigationNativeSourceBaseline)
  const adminNavigationMotionVueSelectionLensSourceNegativeProbeResults =
    runAdminNavigationMotionVueSelectionLensSourceNegativeProbes(
      adminNavigationNativeSourceBaseline,
    )
  const adminNavigationReducedCrossfadeNegativeProbeResults =
    runAdminNavigationReducedCrossfadeNegativeProbes(adminNavigationNativeSourceBaseline)
  const adminNavigationNativeSourceInvariantResultsBaseline =
    adminNavigationNativeSourceInvariantResults(adminNavigationNativeSourceBaseline)
  const adminNavigationNativeSourceNegativeProbeResults =
    runAdminNavigationNativeSourceNegativeProbes(adminNavigationNativeSourceBaseline)
  const adminNavigationExpansionMotionInvariantResultsBaseline =
    adminNavigationExpansionMotionInvariantResults(adminNavigationNativeSourceBaseline)
  const adminNavigationExpansionMotionNegativeProbeResults =
    runAdminNavigationExpansionMotionNegativeProbes(adminNavigationNativeSourceBaseline)
  const adminNavigationCollapsedPopupInvariantResultsBaseline =
    adminNavigationCollapsedPopupInvariantResults(adminNavigationNativeSourceBaseline)
  const adminNavigationCollapsedPopupNegativeProbeResults =
    runAdminNavigationCollapsedPopupNegativeProbes(adminNavigationNativeSourceBaseline)
  const adminNavigationHeaderPlacementInvariantResultsBaseline =
    adminNavigationHeaderPlacementInvariantResults(adminNavigationNativeSourceBaseline)
  const adminNavigationHeaderPlacementNegativeProbeResults =
    runAdminNavigationHeaderPlacementNegativeProbes(adminNavigationNativeSourceBaseline)
  const adminNavigationNaiveActionsMotionInvariantResultsBaseline =
    adminNavigationNaiveActionsMotionInvariantResults(adminNavigationNativeSourceBaseline)
  const adminNavigationNaiveActionsMotionNegativeProbeResults =
    runAdminNavigationNaiveActionsMotionNegativeProbes(adminNavigationNativeSourceBaseline)
  const navigationReworkSourceNegativeProbeResults =
    runNavigationReworkSourceNegativeProbes(navigationReworkBaseline)
  const navigationBudgetNegativeProbeResults =
    runNavigationBudgetNegativeProbes(navigationBudgetBaseline)
  const runtime003SourceNegativeProbeResults = runRuntime003SourceNegativeProbes(baseline)

  if (negativeProbeResults.length !== expectedArchitectureAdminConsoleNegativeProbeCount) {
    violations.push(
      `Architecture Admin Console negative-probe count drifted: expected ${String(expectedArchitectureAdminConsoleNegativeProbeCount)}, received ${String(negativeProbeResults.length)}.`,
    )
  }
  if (motionGeometryNegativeProbeResults.length !== expectedMotionGeometryNegativeProbeCount) {
    violations.push(
      `Motion geometry negative-probe count drifted: expected ${String(expectedMotionGeometryNegativeProbeCount)}, received ${String(motionGeometryNegativeProbeResults.length)}.`,
    )
  }
  if (runtime002NegativeProbeResults.length !== expectedRuntime002NegativeProbeCount) {
    violations.push(
      `PAVP-RUNTIME-002 negative-probe count drifted: expected ${String(expectedRuntime002NegativeProbeCount)}, received ${String(runtime002NegativeProbeResults.length)}.`,
    )
  }
  if (runtime005NegativeProbeResults.length !== expectedRuntime005NegativeProbeCount) {
    violations.push(
      `PAVP-RUNTIME-005 negative-probe count drifted: expected ${String(expectedRuntime005NegativeProbeCount)}, received ${String(runtime005NegativeProbeResults.length)}.`,
    )
  }
  if (
    acceptanceClosureNegativeProbeResults.length !== expectedAcceptanceClosureNegativeProbeCount
  ) {
    violations.push(
      `Acceptance-closure negative-probe count drifted: expected ${String(expectedAcceptanceClosureNegativeProbeCount)}, received ${String(acceptanceClosureNegativeProbeResults.length)}.`,
    )
  }
  if (
    runtime003AdmissionNegativeProbeResults.length !== expectedRuntime003AdmissionNegativeProbeCount
  ) {
    violations.push(
      `PAVP-RUNTIME-003 admission negative-probe count drifted: expected ${String(expectedRuntime003AdmissionNegativeProbeCount)}, received ${String(runtime003AdmissionNegativeProbeResults.length)}.`,
    )
  }
  if (
    runtime003AcceptanceClosureNegativeProbeResults.length !==
    expectedRuntime003AcceptanceClosureNegativeProbeCount
  ) {
    violations.push(
      `PAVP-RUNTIME-003 acceptance-closure negative-probe count drifted: expected ${String(expectedRuntime003AcceptanceClosureNegativeProbeCount)}, received ${String(runtime003AcceptanceClosureNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationGsapAdmissionNegativeProbeResults.length !==
    expectedAdminNavigationGsapAdmissionNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation GSAP admission negative-probe count drifted: expected ${String(expectedAdminNavigationGsapAdmissionNegativeProbeCount)}, received ${String(adminNavigationGsapAdmissionNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationThemeReflowAdmissionNegativeProbeResults.length !==
    expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation theme/reflow admission negative-probe count drifted: expected ${String(expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount)}, received ${String(adminNavigationThemeReflowAdmissionNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationHighlightRevealAdmissionNegativeProbeResults.length !==
    expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation highlight/reveal admission negative-probe count drifted: expected ${String(expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount)}, received ${String(adminNavigationHighlightRevealAdmissionNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationNativeAdmissionNegativeProbeResults.length !==
    expectedAdminNavigationNativeAdmissionNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Native Naive admission negative-probe count drifted: expected ${String(expectedAdminNavigationNativeAdmissionNegativeProbeCount)}, received ${String(adminNavigationNativeAdmissionNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationNativeAcceptanceClosureNegativeProbeResults.length !==
    expectedAdminNavigationNativeAcceptanceClosureNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Native Naive acceptance-closure negative-probe count drifted: expected ${String(expectedAdminNavigationNativeAcceptanceClosureNegativeProbeCount)}, received ${String(adminNavigationNativeAcceptanceClosureNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationMotionVueSelectionLensAdmissionNegativeProbeResults.length !==
    expectedAdminNavigationMotionVueSelectionLensAdmissionNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Motion Vue shared-selection-lens admission negative-probe count drifted: expected ${String(expectedAdminNavigationMotionVueSelectionLensAdmissionNegativeProbeCount)}, received ${String(adminNavigationMotionVueSelectionLensAdmissionNegativeProbeResults.length)}.`,
    )
  }
  if (
    routeTransitionAdmissionNegativeProbeResults.length !==
    expectedRouteTransitionAdmissionNegativeProbeCount
  ) {
    violations.push(
      `Route-transition admission negative-probe count drifted: expected ${String(expectedRouteTransitionAdmissionNegativeProbeCount)}, received ${String(routeTransitionAdmissionNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationMotionVueSelectionLensSourceInvariantResultsBaseline.length !==
    expectedAdminNavigationMotionVueSelectionLensSourceInvariantCount
  ) {
    violations.push(
      `Admin navigation Motion Vue shared-selection-lens source-invariant count drifted: expected ${String(expectedAdminNavigationMotionVueSelectionLensSourceInvariantCount)}, received ${String(adminNavigationMotionVueSelectionLensSourceInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationMotionVueSelectionLensSourceNegativeProbeResults.length !==
    expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Motion Vue shared-selection-lens source negative-probe count drifted: expected ${String(expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount)}, received ${String(adminNavigationMotionVueSelectionLensSourceNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationReducedCrossfadeNegativeProbeResults.length !==
    expectedAdminNavigationReducedCrossfadeNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Reduced crossfade negative-probe count drifted: expected ${String(expectedAdminNavigationReducedCrossfadeNegativeProbeCount)}, received ${String(adminNavigationReducedCrossfadeNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationNativeSourceInvariantResultsBaseline.length !==
    expectedAdminNavigationNativeSourceInvariantCount
  ) {
    violations.push(
      `Admin navigation Native Naive source-invariant count drifted: expected ${String(expectedAdminNavigationNativeSourceInvariantCount)}, received ${String(adminNavigationNativeSourceInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationNativeSourceNegativeProbeResults.length !==
    expectedAdminNavigationNativeSourceNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Native Naive source negative-probe count drifted: expected ${String(expectedAdminNavigationNativeSourceNegativeProbeCount)}, received ${String(adminNavigationNativeSourceNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationExpansionMotionInvariantResultsBaseline.length !==
    expectedAdminNavigationExpansionMotionInvariantCount
  ) {
    violations.push(
      `Admin navigation expansion/motion source-invariant count drifted: expected ${String(expectedAdminNavigationExpansionMotionInvariantCount)}, received ${String(adminNavigationExpansionMotionInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationExpansionMotionNegativeProbeResults.length !==
    expectedAdminNavigationExpansionMotionNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation expansion/motion source negative-probe count drifted: expected ${String(expectedAdminNavigationExpansionMotionNegativeProbeCount)}, received ${String(adminNavigationExpansionMotionNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationCollapsedPopupInvariantResultsBaseline.length !==
    expectedAdminNavigationCollapsedPopupSourceInvariantCount
  ) {
    violations.push(
      `Admin navigation collapsed-popup source-invariant count drifted: expected ${String(expectedAdminNavigationCollapsedPopupSourceInvariantCount)}, received ${String(adminNavigationCollapsedPopupInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationCollapsedPopupNegativeProbeResults.length !==
    expectedAdminNavigationCollapsedPopupSourceNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation collapsed-popup source negative-probe count drifted: expected ${String(expectedAdminNavigationCollapsedPopupSourceNegativeProbeCount)}, received ${String(adminNavigationCollapsedPopupNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationHeaderPlacementInvariantResultsBaseline.length !==
    expectedAdminNavigationHeaderPlacementSourceInvariantCount
  ) {
    violations.push(
      `Admin navigation Header placement source-invariant count drifted: expected ${String(expectedAdminNavigationHeaderPlacementSourceInvariantCount)}, received ${String(adminNavigationHeaderPlacementInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationHeaderPlacementNegativeProbeResults.length !==
    expectedAdminNavigationHeaderPlacementSourceNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Header placement source negative-probe count drifted: expected ${String(expectedAdminNavigationHeaderPlacementSourceNegativeProbeCount)}, received ${String(adminNavigationHeaderPlacementNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationNaiveActionsMotionInvariantResultsBaseline.length !==
    expectedAdminNavigationNaiveActionsMotionInvariantCount
  ) {
    violations.push(
      `Admin navigation Naive actions/motion source-invariant count drifted: expected ${String(expectedAdminNavigationNaiveActionsMotionInvariantCount)}, received ${String(adminNavigationNaiveActionsMotionInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationNaiveActionsMotionNegativeProbeResults.length !==
    expectedAdminNavigationNaiveActionsMotionNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation Naive actions/motion source negative-probe count drifted: expected ${String(expectedAdminNavigationNaiveActionsMotionNegativeProbeCount)}, received ${String(adminNavigationNaiveActionsMotionNegativeProbeResults.length)}.`,
    )
  }
  if (runtime003SourceNegativeProbeResults.length !== expectedRuntime003SourceNegativeProbeCount) {
    violations.push(
      `PAVP-RUNTIME-003 source negative-probe count drifted: expected ${String(expectedRuntime003SourceNegativeProbeCount)}, received ${String(runtime003SourceNegativeProbeResults.length)}.`,
    )
  }
  if (
    navigationReworkSourceNegativeProbeResults.length !==
    expectedNavigationReworkSourceNegativeProbeCount
  ) {
    violations.push(
      `Naive collapsible multilevel navigation source negative-probe count drifted: expected ${String(expectedNavigationReworkSourceNegativeProbeCount)}, received ${String(navigationReworkSourceNegativeProbeResults.length)}.`,
    )
  }
  if (navigationBudgetNegativeProbeResults.length !== expectedNavigationBudgetNegativeProbeCount) {
    violations.push(
      `Naive navigation budget negative-probe count drifted: expected ${String(expectedNavigationBudgetNegativeProbeCount)}, received ${String(navigationBudgetNegativeProbeResults.length)}.`,
    )
  }

  violations.push(
    ...(await validateDependencies()),
    ...(await validateTokensAndLayout()),
    ...(await validateRoutesShellAndMotion()),
    ...appearanceAndFacts.violations,
    ...(await validateNaiveOverrides()),
    ...validateInspectorProjections(),
    ...validateProductExperienceReworkStatus(architectureSource),
    ...engineeringViolations,
    ...capabilityViolations,
    ...uiViolations,
    ...motionGeometryViolations(baseline),
    ...runtime005RouteContentViolations(baseline),
    ...runtime003SourceViolations(baseline),
    ...navigationReworkSourceViolations(navigationReworkBaseline),
    ...adminNavigationMotionVueSelectionLensSourceViolations(adminNavigationNativeSourceBaseline),
    ...adminNavigationNativeSourceViolations(adminNavigationNativeSourceBaseline),
    ...adminNavigationExpansionMotionViolations(adminNavigationNativeSourceBaseline),
    ...adminNavigationCollapsedPopupViolations(adminNavigationNativeSourceBaseline),
    ...adminNavigationHeaderPlacementViolations(adminNavigationNativeSourceBaseline),
    ...adminNavigationNaiveActionsMotionViolations(adminNavigationNativeSourceBaseline),
    ...navigationBudgetViolations(navigationBudgetBaseline),
    ...(await validateRouteTransitionSourceGovernance()),
  )

  const baselineViolations = materialGateViolations(baseline)
  if (baselineViolations.length > 0) {
    violations.push(
      `Admin Console material gate baseline failed: ${baselineViolations.join(', ')}.`,
    )
  }
  for (const result of negativeProbeResults) {
    if (!result.passed) {
      violations.push(`${result.id}: reversible in-memory negative probe did not fail.`)
    }
  }
  for (const result of motionGeometryNegativeProbeResults) {
    if (!result.passed) {
      violations.push(`${result.id}: reversible in-memory Motion negative probe did not fail.`)
    }
  }
  for (const result of runtime002NegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory PAVP-RUNTIME-002 negative probe did not fail.`,
      )
    }
  }
  for (const result of runtime005NegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory PAVP-RUNTIME-005 negative probe did not fail.`,
      )
    }
  }
  for (const result of acceptanceClosureNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory acceptance-closure negative probe did not fail.`,
      )
    }
  }
  for (const result of runtime003AdmissionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory PAVP-RUNTIME-003 admission negative probe did not fail.`,
      )
    }
  }
  for (const result of runtime003AcceptanceClosureNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory PAVP-RUNTIME-003 acceptance-closure negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationGsapAdmissionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation GSAP admission negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationThemeReflowAdmissionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation theme/reflow admission negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationHighlightRevealAdmissionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation highlight/reveal admission negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationNativeAdmissionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Native Naive admission negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationNativeAcceptanceClosureNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Native Naive acceptance-closure negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationMotionVueSelectionLensAdmissionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Motion Vue shared-selection-lens admission negative probe did not fail.`,
      )
    }
  }
  for (const result of routeTransitionAdmissionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory route-transition Architecture admission negative probe did not fail exclusively for ${result.expectedFailureCode}.`,
      )
    }
  }
  for (const result of adminNavigationMotionVueSelectionLensSourceNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Motion Vue shared-selection-lens source negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationReducedCrossfadeNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Reduced crossfade negative probe did not fail exclusively for ${result.expectedFailureCode}.`,
      )
    }
  }
  for (const result of adminNavigationNativeSourceNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Native Naive source negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationExpansionMotionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation expansion/motion negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationCollapsedPopupNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation collapsed-popup negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationHeaderPlacementNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Header placement negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationNaiveActionsMotionNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation Naive actions/motion negative probe did not fail.`,
      )
    }
  }
  for (const result of runtime003SourceNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory PAVP-RUNTIME-003 source negative probe did not fail.`,
      )
    }
  }
  for (const result of navigationReworkSourceNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Naive collapsible multilevel navigation source negative probe did not fail.`,
      )
    }
  }
  for (const result of navigationBudgetNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Naive navigation budget negative probe did not fail.`,
      )
    }
  }

  return [...new Set(violations)]
}

if (process.argv[1]?.endsWith('check-architecture-admin-console.ts')) {
  const violations = await validateArchitectureAdminConsole()

  if (violations.length > 0) {
    throw new Error(violations.join('\n'))
  }

  console.log(
    `Architecture Admin Console check: passed (${String(expectedArchitectureAdminConsoleNegativeProbeCount)}/${String(expectedArchitectureAdminConsoleNegativeProbeCount)} Admin/Naive negative probes; ${String(expectedMotionGeometryNegativeProbeCount)}/${String(expectedMotionGeometryNegativeProbeCount)} Motion geometry negative probes; ${String(expectedRuntime002NegativeProbeCount)}/${String(expectedRuntime002NegativeProbeCount)} PAVP-RUNTIME-002 negative probes; ${String(expectedRuntime005NegativeProbeCount)}/${String(expectedRuntime005NegativeProbeCount)} PAVP-RUNTIME-005 negative probes; ${String(expectedAcceptanceClosureNegativeProbeCount)}/${String(expectedAcceptanceClosureNegativeProbeCount)} acceptance-closure negative probes; ${String(expectedRuntime003AdmissionNegativeProbeCount)}/${String(expectedRuntime003AdmissionNegativeProbeCount)} PAVP-RUNTIME-003 admission negative probes; ${String(expectedRuntime003AcceptanceClosureNegativeProbeCount)}/${String(expectedRuntime003AcceptanceClosureNegativeProbeCount)} PAVP-RUNTIME-003 acceptance-closure negative probes; ${String(expectedAdminNavigationGsapAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationGsapAdmissionNegativeProbeCount)} historical Admin navigation GSAP admission negative probes; ${String(expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount)} historical Admin navigation theme/reflow admission negative probes; ${String(expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount)} historical Admin navigation highlight/reveal admission negative probes; ${String(expectedAdminNavigationNativeAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationNativeAdmissionNegativeProbeCount)} Admin navigation Native Naive admission negative probes; ${String(expectedAdminNavigationNativeAcceptanceClosureNegativeProbeCount)}/${String(expectedAdminNavigationNativeAcceptanceClosureNegativeProbeCount)} Admin navigation Native Naive acceptance-closure negative probes; ${String(expectedAdminNavigationMotionVueSelectionLensAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationMotionVueSelectionLensAdmissionNegativeProbeCount)} Motion Vue shared-selection-lens admission negative probes; ${String(expectedAdminNavigationMotionVueSelectionLensSourceInvariantCount)}/${String(expectedAdminNavigationMotionVueSelectionLensSourceInvariantCount)} Motion Vue shared-selection-lens source invariants; ${String(expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount)}/${String(expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount)} Motion Vue shared-selection-lens source negative probes; ${String(expectedAdminNavigationReducedCrossfadeNegativeProbeCount)}/${String(expectedAdminNavigationReducedCrossfadeNegativeProbeCount)} Reduced crossfade negative probes; ${String(expectedAdminNavigationNativeSourceInvariantCount)}/${String(expectedAdminNavigationNativeSourceInvariantCount)} Admin navigation Native Naive source invariants; ${String(expectedAdminNavigationNativeSourceNegativeProbeCount)}/${String(expectedAdminNavigationNativeSourceNegativeProbeCount)} Admin navigation Native Naive source negative probes; ${String(expectedAdminNavigationExpansionMotionInvariantCount)}/${String(expectedAdminNavigationExpansionMotionInvariantCount)} Admin navigation expansion/motion source invariants; ${String(expectedAdminNavigationExpansionMotionNegativeProbeCount)}/${String(expectedAdminNavigationExpansionMotionNegativeProbeCount)} Admin navigation expansion/motion negative probes; ${String(expectedAdminNavigationCollapsedPopupSourceInvariantCount)}/${String(expectedAdminNavigationCollapsedPopupSourceInvariantCount)} Admin navigation collapsed-popup source invariants; ${String(expectedAdminNavigationCollapsedPopupSourceNegativeProbeCount)}/${String(expectedAdminNavigationCollapsedPopupSourceNegativeProbeCount)} Admin navigation collapsed-popup negative probes; ${String(expectedAdminNavigationHeaderPlacementSourceInvariantCount)}/${String(expectedAdminNavigationHeaderPlacementSourceInvariantCount)} Admin navigation Header placement source invariants; ${String(expectedAdminNavigationHeaderPlacementSourceNegativeProbeCount)}/${String(expectedAdminNavigationHeaderPlacementSourceNegativeProbeCount)} Admin navigation Header placement negative probes; ${String(expectedAdminNavigationNaiveActionsMotionInvariantCount)}/${String(expectedAdminNavigationNaiveActionsMotionInvariantCount)} Admin navigation Naive actions/motion source invariants; ${String(expectedAdminNavigationNaiveActionsMotionNegativeProbeCount)}/${String(expectedAdminNavigationNaiveActionsMotionNegativeProbeCount)} Admin navigation Naive actions/motion negative probes; ${String(expectedRuntime003SourceNegativeProbeCount)}/${String(expectedRuntime003SourceNegativeProbeCount)} PAVP-RUNTIME-003 negative probes; ${String(expectedNavigationReworkSourceNegativeProbeCount)}/${String(expectedNavigationReworkSourceNegativeProbeCount)} Naive collapsible multilevel navigation source negative probes; ${String(expectedNavigationBudgetNegativeProbeCount)}/${String(expectedNavigationBudgetNegativeProbeCount)} Naive navigation budget negative probes)`,
  )
  console.log(
    `Admin navigation Motion Vue shared-selection-lens admission check: passed (${String(expectedAdminNavigationMotionVueSelectionLensAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationMotionVueSelectionLensAdmissionNegativeProbeCount)} reversible in-memory Architecture admission negative probes)`,
  )
  console.log(
    `Route-transition routing capability admission check: passed (${String(expectedRouteTransitionAdmissionNegativeProbeCount)}/${String(expectedRouteTransitionAdmissionNegativeProbeCount)} reversible in-memory Architecture admission negative probes)`,
  )
  console.log(
    `Workspace Axis default check: passed (90 directed edges across 3 layout profiles; Full/Reduced/None/typed fallback; ${String(expectedRouteTransitionWorkspaceDefaultNegativeProbeCount)}/${String(expectedRouteTransitionWorkspaceDefaultNegativeProbeCount)} reversible in-memory negative probes)`,
  )
  console.log(
    `Route-transition routing capability source check: passed (${String(expectedRouteTransitionSourceProofCount)} source proofs; ${String(expectedRouteTransitionSourceNegativeProbeCount)}/${String(expectedRouteTransitionSourceNegativeProbeCount)} retained reversible in-memory source negative probes; ${String(expectedRouterPresentationCommitNegativeProbeCount)}/${String(expectedRouterPresentationCommitNegativeProbeCount)} Router Presentation Commit reversible in-memory negative probes; ${String(expectedRouteTransitionPresetSelectionNegativeProbeCount)}/${String(expectedRouteTransitionPresetSelectionNegativeProbeCount)} preset-selection reversible in-memory negative probes; ${String(expectedRouteTransitionFullPaceNegativeProbeCount)}/${String(expectedRouteTransitionFullPaceNegativeProbeCount)} Full pace reversible in-memory negative probes; ${String(expectedRouteTransitionStylelintPolicyNegativeProbeCount)}/${String(expectedRouteTransitionStylelintPolicyNegativeProbeCount)} Stylelint policy reversible in-memory negative probes)`,
  )
  console.log(
    `Admin navigation Motion Vue shared-selection-lens source check: passed (${String(expectedAdminNavigationMotionVueSelectionLensSourceInvariantCount)} source invariants; ${String(expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount)}/${String(expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount)} reversible in-memory source negative probes)`,
  )
  console.log(
    `Admin navigation Reduced crossfade check: passed (${String(expectedAdminNavigationReducedCrossfadeNegativeProbeCount)}/${String(expectedAdminNavigationReducedCrossfadeNegativeProbeCount)} reversible in-memory negative probes)`,
  )
}
