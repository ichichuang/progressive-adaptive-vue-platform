import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { extname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { build } from 'vite'
import { parse as parseYaml } from 'yaml'

import { projectConfig } from '../../project.config'
import {
  ProductPreferenceDefault,
  builtInThemeIds,
  projectUiAppearance,
  resolveColorMode,
  resolveMaterial,
  resolveThemeReference,
  validateCustomThemeDefinition,
  type UiAppearanceSnapshot,
} from '@platform/design-system'
import { getDefaultConsoleMessage } from '../../apps/web/src/shared/i18n/default-messages'
import {
  PublicRoleRegistry,
  type LayoutContainerVariantId,
  type PublicRoleUnoCssProjection,
  type UnoCssClassProjection,
  type UnoCssContainerBoundaryContribution,
  type UnoCssContainerVariantProjection,
} from '../../packages/design-system/src/build/public-role-registry'
import { validateTokens } from '../../packages/design-system/src/build/build'
import {
  calculateWcag21Contrast,
  parseCssColor,
} from '../../packages/design-system/src/schema/css-color'
import { formatRuntimeCss } from '../../packages/design-system/src/build/formats/css'
import type { LayoutTokenId } from '../../packages/design-system/src/build/formats/layout'
import { layoutRegistry } from '../../packages/design-system/src/generated/layout-registry'
import { generatedThemeRegistry } from '../../packages/design-system/src/generated/theme-registry'
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
  getRouteRecord,
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
import { styleDeclarationKey, type StyleDeclarationIdentity } from './style-ownership'

type JsonObject = Record<string, unknown>

interface MaterialGateSnapshot {
  readonly appStylesSource: string
  readonly applicationImportSource: string
  readonly nonAdapterUiSource: string
  readonly manifestAndLockSource: string
  readonly pageVisualSource: string
  readonly appTemplateSource: string
  readonly workspaceRetentionSource: string
  readonly consoleFrameSource: string
  readonly factImportViolation: boolean
  readonly pageStorageSource: string
  readonly competingAppearanceEnvironmentSource: string
  readonly themeAdapterSource: string
  readonly naiveProviderSource: string
  readonly uiProviderSource: string
  readonly shellSource: string
  readonly adminTokenSource: string
  readonly routeRegistrySource: string
  readonly errorTitles: readonly (readonly [key: string, text: string])[]
  readonly generatedManifestsEqual: boolean
  readonly generatedTokensCssSource: string
  readonly expectedTokensCssSource: string
  readonly routeCount: number
  readonly publicComponentExports: readonly string[]
  readonly registeredPublicComponents: readonly {
    readonly exportName: string
    readonly consumerCount: number
    readonly capabilityStatus: 'ACTIVE' | 'TARGET_INACTIVE'
  }[]
}

interface ArchitectureAdminConsoleNegativeProbeResult {
  readonly id: string
  readonly expectedFailureCode: string
  readonly passed: boolean
}

interface NavigationReworkSourceSnapshot {
  readonly applicationSource: string
  readonly providerSource: string
  readonly runtimeContextSource: string
  readonly shellSource: string
  readonly themeSource: string
  readonly navigationColors: NavigationThemeColorSnapshot
}

interface AdminNavigationNativeSourceSnapshot {
  readonly adminNavigationMotionAdapterPresent: boolean
  readonly appSource: string
  readonly appStylesSource: string
  readonly applicationSource: string
  readonly architectureSource: string
  readonly checkBundleSource: string
  readonly consoleFrameSource: string
  readonly engineeringManifestSource: string
  readonly lockSource: string
  readonly motionDomMaxSource: string
  readonly motionRuntimeSource: string
  readonly motionSelectionLensSource: string
  readonly motionPolicySource: string
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
  readonly navigationColors: NavigationThemeColorSnapshot
  readonly uiManifestSource: string
  readonly workspaceSource: string
}

interface NavigationThemeColorSnapshot {
  readonly palette: NonNullable<UiAppearanceSnapshot['colorPalette']>
  readonly menu: Readonly<{
    itemColorHover: string
    itemColorActive: string
    itemColorActiveHover: string
    itemColorActiveCollapsed: string
    itemTextColorActive: string
    itemTextColorActiveHover: string
    itemIconColorActive: string
    itemIconColorActiveHover: string
    arrowColorActive: string
    arrowColorActiveHover: string
    itemTextColorChildActive: string
    itemTextColorChildActiveHover: string
    itemIconColorChildActive: string
    itemIconColorChildActiveHover: string
    arrowColorChildActive: string
    arrowColorChildActiveHover: string
  }>
  readonly dropdown: Readonly<{
    optionColorHover: string
    optionColorActive: string
    optionTextColorActive: string
  }>
  readonly childActiveFillPresent: boolean
  readonly childActiveHoverFillPresent: boolean
  readonly sharedDropdownPeer: boolean
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

interface NavigationStyleNode {
  readonly type: string
  readonly name?: string
  readonly params?: string
  readonly selector?: string
  readonly parent?: NavigationStyleNode
}

interface NavigationStyleDeclaration extends NavigationStyleNode {
  readonly prop: string
  readonly value: string
  readonly important?: boolean
  readonly cloneBefore: (overrides: Readonly<{ value: string }>) => unknown
  readonly remove: () => void
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
    readonly isProd?: boolean
    readonly preprocessLang?: string
    readonly scoped: boolean
    readonly source: string
  }) => {
    readonly code: string
    readonly errors: readonly unknown[]
    readonly rawResult?: {
      readonly root: {
        readonly walkDecls: (visitor: (declaration: NavigationStyleDeclaration) => void) => void
        readonly toString: () => string
      }
    }
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
const expectedArchitectureAdminConsoleNegativeProbeCount = 64
const expectedMotionGeometryNegativeProbeCount = 9
const expectedRuntime002NegativeProbeCount = 10
const expectedRuntime005NegativeProbeCount = 14
const expectedAdminNavigationNativeSourceInvariantCount = 24
const expectedAdminNavigationNativeSourceNegativeProbeCount = 25
const expectedAdminNavigationExpansionMotionInvariantCount = 21
const expectedAdminNavigationExpansionMotionNegativeProbeCount = 8
const expectedAdminNavigationCollapsedPopupSourceInvariantCount = 15
const expectedAdminNavigationCollapsedPopupSourceNegativeProbeCount = 8
const expectedAdminNavigationHeaderPlacementSourceInvariantCount = 13
const expectedAdminNavigationHeaderPlacementSourceNegativeProbeCount = 5
const expectedAdminNavigationNaiveActionsMotionInvariantCount = 22
const expectedAdminNavigationNaiveActionsMotionNegativeProbeCount = 10
const expectedAdminNavigationMotionVueSelectionLensSourceInvariantCount = 22
const expectedAdminNavigationMotionVueSelectionLensSourceNegativeProbeCount = 16
const expectedAdminNavigationReducedCrossfadeNegativeProbeCount = 8
const expectedNavigationReworkSourceInvariantCount = 56
const expectedNavigationReworkSourceNegativeProbeCount = 22
const expectedNavigationBudgetProbeCount = 18
const expectedRuntime003SourceNegativeProbeCount = 10
const adminNavigationMotionVueSelectionLensWorkPackage =
  'PAVP_ADMIN_NAVIGATION_MOTION_VUE_SHARED_SELECTION_LENS'
const expectedInitialJavaScriptBudgetBytes = projectConfig.bundleBudgets.initialJavaScriptGzipBytes
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
const expectedNavigationIconClasses = [
  'i-lucide-layout-dashboard',
  'i-lucide-palette',
  'i-lucide-ruler',
  'i-lucide-type',
  'i-lucide-sparkles',
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
  ['workbench-dashboard', '/', 'apps/web/src/pages/index.vue', '仪表盘'],
  ['workbench-colors', '/colors', 'apps/web/src/pages/colors.vue', '语义配色'],
  ['workbench-sizes', '/sizes', 'apps/web/src/pages/sizes.vue', '尺寸与空间'],
  ['workbench-typography', '/typography', 'apps/web/src/pages/typography.vue', '字体排印'],
  ['workbench-interactions', '/interactions', 'apps/web/src/pages/interactions.vue', '交互与状态'],
  ['control-center', '/control-center', 'apps/web/src/pages/control-center.vue', '系统设置'],
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
    value: '{dimension.border.width}',
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
    value: '{color.surface.page}',
    cssVariable: '--ui-admin-surface-content',
    resolvedValue: 'var(--ui-color-surface-page)',
  },
  {
    name: 'admin.surface.settings',
    type: 'color',
    value: '{color.surface.panel}',
    cssVariable: '--ui-admin-surface-settings',
    resolvedValue: 'var(--ui-color-surface-panel)',
  },
] as const
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
const scrollSystemThemeOverrideContract = {
  Scrollbar: ['width', 'height', 'color', 'colorHover', 'railColor', 'borderRadius'],
  Switch: [
    'railColor',
    'railColorActive',
    'buttonColor',
    'buttonBoxShadow',
    'boxShadowFocus',
    'textColor',
    'iconColor',
    'loadingColor',
    'opacityDisabled',
    'railHeightMedium',
    'railWidthMedium',
    'buttonHeightMedium',
    'buttonWidthMedium',
    'buttonWidthPressedMedium',
    'railBorderRadiusMedium',
    'buttonBorderRadiusMedium',
  ],
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

type NaiveThemeComponent = keyof typeof naive2452UseThemeKeyContract
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
    fields: ['heightSmall', 'heightMedium'],
    authority: 'interaction.control.height-baseline',
    valueKind: 'length',
  },
  {
    component: 'common',
    fields: ['heightLarge'],
    authority: 'layout.target.enhanced.minimum-block-size',
    valueKind: 'length',
  },
  {
    component: 'common',
    fields: ['fontSizeTiny'],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'common',
    fields: ['fontSizeMini'],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'common',
    fields: ['textColorDisabled'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['placeholderColor'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['placeholderColorDisabled'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorText'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorTextHover'],
    authority: 'color.control.primary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorTextPressed'],
    authority: 'color.control.primary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorTextDisabled'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorDisabledInfo'],
    authority: 'status.info.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderDisabledInfo'],
    authority: 'status.info.border',
    valueKind: 'border',
  },
  {
    component: 'Button',
    fields: ['textColorDisabledSuccess'],
    authority: 'status.success.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderDisabledSuccess'],
    authority: 'status.success.border',
    valueKind: 'border',
  },
  {
    component: 'Button',
    fields: ['textColorDisabledWarning'],
    authority: 'status.warning.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderDisabledWarning'],
    authority: 'status.warning.border',
    valueKind: 'border',
  },
  {
    component: 'Button',
    fields: ['textColorDisabledError'],
    authority: 'status.error.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderDisabledError'],
    authority: 'status.error.border',
    valueKind: 'border',
  },
  {
    component: 'Tag',
    fields: ['color'],
    authority: 'appearance.material.chrome',
    valueKind: 'color',
  },
  {
    component: 'Tag',
    fields: ['closeIconColor'],
    authority: 'color.text.secondary',
    valueKind: 'color',
  },
  {
    component: 'Tag',
    fields: ['closeIconColorHover'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Tag',
    fields: ['closeIconColorPressed'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Tag',
    fields: ['closeColorHover'],
    authority: 'color.surface.page',
    valueKind: 'color',
  },
  {
    component: 'Tag',
    fields: ['closeColorPressed'],
    authority: 'color.surface.page',
    valueKind: 'color',
  },
  {
    component: 'Tag',
    fields: ['closeBorderRadius'],
    authority: 'interaction.radius.small',
    valueKind: 'length',
  },
  {
    component: 'common',
    fields: ['infoColor'],
    authority: 'status.info.default',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['infoColorHover'],
    authority: 'status.info.hover',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['infoColorPressed'],
    authority: 'status.info.pressed',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['infoColorSuppl'],
    authority: 'status.info.supplementary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['textColorInfo', 'textColorHoverInfo', 'textColorPressedInfo', 'textColorFocusInfo'],
    authority: 'status.info.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderInfo', 'borderHoverInfo', 'borderPressedInfo', 'borderFocusInfo'],
    authority: 'status.info.border',
    valueKind: 'border',
  },
  {
    component: 'common',
    fields: ['successColor'],
    authority: 'status.success.default',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['successColorHover'],
    authority: 'status.success.hover',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['successColorPressed'],
    authority: 'status.success.pressed',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['successColorSuppl'],
    authority: 'status.success.supplementary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: [
      'textColorSuccess',
      'textColorHoverSuccess',
      'textColorPressedSuccess',
      'textColorFocusSuccess',
    ],
    authority: 'status.success.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderSuccess', 'borderHoverSuccess', 'borderPressedSuccess', 'borderFocusSuccess'],
    authority: 'status.success.border',
    valueKind: 'border',
  },
  {
    component: 'common',
    fields: ['warningColor'],
    authority: 'status.warning.default',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['warningColorHover'],
    authority: 'status.warning.hover',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['warningColorPressed'],
    authority: 'status.warning.pressed',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['warningColorSuppl'],
    authority: 'status.warning.supplementary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: [
      'textColorWarning',
      'textColorHoverWarning',
      'textColorPressedWarning',
      'textColorFocusWarning',
    ],
    authority: 'status.warning.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderWarning', 'borderHoverWarning', 'borderPressedWarning', 'borderFocusWarning'],
    authority: 'status.warning.border',
    valueKind: 'border',
  },
  {
    component: 'common',
    fields: ['errorColor'],
    authority: 'status.error.default',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['errorColorHover'],
    authority: 'status.error.hover',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['errorColorPressed'],
    authority: 'status.error.pressed',
    valueKind: 'color',
  },
  {
    component: 'common',
    fields: ['errorColorSuppl'],
    authority: 'status.error.supplementary',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: [
      'textColorError',
      'textColorHoverError',
      'textColorPressedError',
      'textColorFocusError',
    ],
    authority: 'status.error.onStatus',
    valueKind: 'color',
  },
  {
    component: 'Button',
    fields: ['borderError', 'borderHoverError', 'borderPressedError', 'borderFocusError'],
    authority: 'status.error.border',
    valueKind: 'border',
  },
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
    authority: 'interaction.radius.small',
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
    fields: ['paddingMedium'],
    authority: 'spacing.button.inline',
    valueKind: 'length',
  },
  {
    component: 'Button',
    fields: ['borderRadiusMedium'],
    authority: 'interaction.radius.control',
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
    component: 'Card',
    fields: ['color'],
    authority: 'color.surface.panel',
    valueKind: 'color',
  },
  {
    component: 'Card',
    fields: ['textColor', 'titleTextColor'],
    authority: 'color.text.primary',
    valueKind: 'color',
  },
  {
    component: 'Card',
    fields: ['borderRadius'],
    authority: 'interaction.radius.panel',
    valueKind: 'length',
  },
  {
    component: 'Card',
    fields: ['paddingSmall'],
    authority: 'spacing.content.gap',
    valueKind: 'length',
  },
  {
    component: 'Card',
    fields: ['paddingMedium', 'paddingLarge', 'paddingHuge'],
    authority: 'spacing.page.inline',
    valueKind: 'length',
  },
  {
    component: 'Card',
    fields: [
      'fontSizeSmall',
      'fontSizeMedium',
      'fontSizeLarge',
      'fontSizeHuge',
      'titleFontSizeSmall',
      'titleFontSizeMedium',
      'titleFontSizeLarge',
      'titleFontSizeHuge',
    ],
    authority: 'typography.size.body',
    valueKind: 'length',
  },
  {
    component: 'Card',
    fields: ['titleFontWeight'],
    authority: 'typography.weight.title',
    valueKind: 'font-weight',
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
    authority: 'interaction.radius.control',
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
    authority: 'interaction.radius.control',
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
        'textColorText',
        'self.textColorText via createKey("textColorText", mergedType)',
        ['--n-text-color'],
        'text-default',
        '.n-button--text default',
      ],
      [
        'textColorTextHover',
        'self.textColorTextHover via createKey("textColorTextHover", mergedType)',
        ['--n-text-color-hover', '--n-text-color-focus'],
        'text-hover/focus',
        '.n-button--text hover/focus',
      ],
      [
        'textColorTextPressed',
        'self.textColorTextPressed via createKey("textColorTextPressed", mergedType)',
        ['--n-text-color-pressed'],
        'text-pressed',
        '.n-button--text pressed',
      ],
      [
        'textColorTextDisabled',
        'self.textColorTextDisabled via createKey("textColorTextDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'disabled',
        '.n-button--text disabled',
      ],
      [
        'textColorDisabledInfo',
        'self.textColorDisabledInfo via createKey("textColorDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'info-filled-disabled',
        '.n-button--disabled text info',
      ],
      [
        'borderDisabledInfo',
        'self.borderDisabledInfo via createKey("borderDisabled", mergedType)',
        ['--n-border-disabled'],
        'info-filled-disabled',
        '.n-button--disabled border info',
      ],
      [
        'textColorDisabledSuccess',
        'self.textColorDisabledSuccess via createKey("textColorDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'success-filled-disabled',
        '.n-button--disabled text success',
      ],
      [
        'borderDisabledSuccess',
        'self.borderDisabledSuccess via createKey("borderDisabled", mergedType)',
        ['--n-border-disabled'],
        'success-filled-disabled',
        '.n-button--disabled border success',
      ],
      [
        'textColorDisabledWarning',
        'self.textColorDisabledWarning via createKey("textColorDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'warning-filled-disabled',
        '.n-button--disabled text warning',
      ],
      [
        'borderDisabledWarning',
        'self.borderDisabledWarning via createKey("borderDisabled", mergedType)',
        ['--n-border-disabled'],
        'warning-filled-disabled',
        '.n-button--disabled border warning',
      ],
      [
        'textColorDisabledError',
        'self.textColorDisabledError via createKey("textColorDisabled", mergedType)',
        ['--n-text-color-disabled'],
        'error-filled-disabled',
        '.n-button--disabled text error',
      ],
      [
        'borderDisabledError',
        'self.borderDisabledError via createKey("borderDisabled", mergedType)',
        ['--n-border-disabled'],
        'error-filled-disabled',
        '.n-button--disabled border error',
      ],
      [
        'textColorInfo',
        'self.textColorInfo via createKey("textColor", mergedType)',
        ['--n-text-color'],
        'info-filled-default',
        '.n-button filled text info',
      ],
      [
        'textColorHoverInfo',
        'self.textColorHoverInfo via createKey("textColorHover", mergedType)',
        ['--n-text-color-hover'],
        'info-filled-hover',
        '.n-button:hover filled text info',
      ],
      [
        'textColorPressedInfo',
        'self.textColorPressedInfo via createKey("textColorPressed", mergedType)',
        ['--n-text-color-pressed'],
        'info-filled-pressed',
        '.n-button:active filled text info',
      ],
      [
        'textColorFocusInfo',
        'self.textColorFocusInfo via createKey("textColorFocus", mergedType)',
        ['--n-text-color-focus'],
        'info-filled-focus',
        '.n-button:focus filled text info',
      ],
      [
        'borderInfo',
        'self.borderInfo via createKey("border", mergedType)',
        ['--n-border'],
        'info-filled-default',
        '.n-button .n-button__border info',
      ],
      [
        'borderHoverInfo',
        'self.borderHoverInfo via createKey("borderHover", mergedType)',
        ['--n-border-hover'],
        'info-filled-hover',
        '.n-button:hover .n-button__state-border info',
      ],
      [
        'borderPressedInfo',
        'self.borderPressedInfo via createKey("borderPressed", mergedType)',
        ['--n-border-pressed'],
        'info-filled-pressed',
        '.n-button:active .n-button__state-border info',
      ],
      [
        'borderFocusInfo',
        'self.borderFocusInfo via createKey("borderFocus", mergedType)',
        ['--n-border-focus'],
        'info-filled-focus',
        '.n-button:focus .n-button__state-border info',
      ],
      [
        'textColorSuccess',
        'self.textColorSuccess via createKey("textColor", mergedType)',
        ['--n-text-color'],
        'success-filled-default',
        '.n-button filled text success',
      ],
      [
        'textColorHoverSuccess',
        'self.textColorHoverSuccess via createKey("textColorHover", mergedType)',
        ['--n-text-color-hover'],
        'success-filled-hover',
        '.n-button:hover filled text success',
      ],
      [
        'textColorPressedSuccess',
        'self.textColorPressedSuccess via createKey("textColorPressed", mergedType)',
        ['--n-text-color-pressed'],
        'success-filled-pressed',
        '.n-button:active filled text success',
      ],
      [
        'textColorFocusSuccess',
        'self.textColorFocusSuccess via createKey("textColorFocus", mergedType)',
        ['--n-text-color-focus'],
        'success-filled-focus',
        '.n-button:focus filled text success',
      ],
      [
        'borderSuccess',
        'self.borderSuccess via createKey("border", mergedType)',
        ['--n-border'],
        'success-filled-default',
        '.n-button .n-button__border success',
      ],
      [
        'borderHoverSuccess',
        'self.borderHoverSuccess via createKey("borderHover", mergedType)',
        ['--n-border-hover'],
        'success-filled-hover',
        '.n-button:hover .n-button__state-border success',
      ],
      [
        'borderPressedSuccess',
        'self.borderPressedSuccess via createKey("borderPressed", mergedType)',
        ['--n-border-pressed'],
        'success-filled-pressed',
        '.n-button:active .n-button__state-border success',
      ],
      [
        'borderFocusSuccess',
        'self.borderFocusSuccess via createKey("borderFocus", mergedType)',
        ['--n-border-focus'],
        'success-filled-focus',
        '.n-button:focus .n-button__state-border success',
      ],
      [
        'textColorWarning',
        'self.textColorWarning via createKey("textColor", mergedType)',
        ['--n-text-color'],
        'warning-filled-default',
        '.n-button filled text warning',
      ],
      [
        'textColorHoverWarning',
        'self.textColorHoverWarning via createKey("textColorHover", mergedType)',
        ['--n-text-color-hover'],
        'warning-filled-hover',
        '.n-button:hover filled text warning',
      ],
      [
        'textColorPressedWarning',
        'self.textColorPressedWarning via createKey("textColorPressed", mergedType)',
        ['--n-text-color-pressed'],
        'warning-filled-pressed',
        '.n-button:active filled text warning',
      ],
      [
        'textColorFocusWarning',
        'self.textColorFocusWarning via createKey("textColorFocus", mergedType)',
        ['--n-text-color-focus'],
        'warning-filled-focus',
        '.n-button:focus filled text warning',
      ],
      [
        'borderWarning',
        'self.borderWarning via createKey("border", mergedType)',
        ['--n-border'],
        'warning-filled-default',
        '.n-button .n-button__border warning',
      ],
      [
        'borderHoverWarning',
        'self.borderHoverWarning via createKey("borderHover", mergedType)',
        ['--n-border-hover'],
        'warning-filled-hover',
        '.n-button:hover .n-button__state-border warning',
      ],
      [
        'borderPressedWarning',
        'self.borderPressedWarning via createKey("borderPressed", mergedType)',
        ['--n-border-pressed'],
        'warning-filled-pressed',
        '.n-button:active .n-button__state-border warning',
      ],
      [
        'borderFocusWarning',
        'self.borderFocusWarning via createKey("borderFocus", mergedType)',
        ['--n-border-focus'],
        'warning-filled-focus',
        '.n-button:focus .n-button__state-border warning',
      ],
      [
        'textColorError',
        'self.textColorError via createKey("textColor", mergedType)',
        ['--n-text-color'],
        'error-filled-default',
        '.n-button filled text error',
      ],
      [
        'textColorHoverError',
        'self.textColorHoverError via createKey("textColorHover", mergedType)',
        ['--n-text-color-hover'],
        'error-filled-hover',
        '.n-button:hover filled text error',
      ],
      [
        'textColorPressedError',
        'self.textColorPressedError via createKey("textColorPressed", mergedType)',
        ['--n-text-color-pressed'],
        'error-filled-pressed',
        '.n-button:active filled text error',
      ],
      [
        'textColorFocusError',
        'self.textColorFocusError via createKey("textColorFocus", mergedType)',
        ['--n-text-color-focus'],
        'error-filled-focus',
        '.n-button:focus filled text error',
      ],
      [
        'borderError',
        'self.borderError via createKey("border", mergedType)',
        ['--n-border'],
        'error-filled-default',
        '.n-button .n-button__border error',
      ],
      [
        'borderHoverError',
        'self.borderHoverError via createKey("borderHover", mergedType)',
        ['--n-border-hover'],
        'error-filled-hover',
        '.n-button:hover .n-button__state-border error',
      ],
      [
        'borderPressedError',
        'self.borderPressedError via createKey("borderPressed", mergedType)',
        ['--n-border-pressed'],
        'error-filled-pressed',
        '.n-button:active .n-button__state-border error',
      ],
      [
        'borderFocusError',
        'self.borderFocusError via createKey("borderFocus", mergedType)',
        ['--n-border-focus'],
        'error-filled-focus',
        '.n-button:focus .n-button__state-border error',
      ],
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
        'paddingMedium',
        'self.paddingMedium via createKey("padding", size)',
        ['--n-padding'],
        'normal-medium-without-round-circle-or-text',
        '.n-button normal medium padding',
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
    component: 'Card',
    fields: [
      ['color', 'self.color', ['--n-color'], 'base', '.n-card color'],
      ['textColor', 'self.textColor', ['--n-text-color'], 'base', '.n-card textColor'],
      [
        'titleTextColor',
        'self.titleTextColor',
        ['--n-title-text-color'],
        'base',
        '.n-card titleTextColor',
      ],
      ['borderRadius', 'self.borderRadius', ['--n-border-radius'], 'base', '.n-card borderRadius'],
      [
        'titleFontWeight',
        'self.titleFontWeight',
        ['--n-title-font-weight'],
        'base',
        '.n-card titleFontWeight',
      ],
      [
        'paddingSmall',
        'self.paddingSmall via createKey("padding", mergedSize)',
        ['--n-padding-top', '--n-padding-left', '--n-padding-bottom'],
        'small',
        '.n-card--small-type padding',
      ],
      [
        'fontSizeSmall',
        'self.fontSizeSmall via createKey("fontSize", mergedSize)',
        ['--n-font-size'],
        'small',
        '.n-card--small-type fontSize',
      ],
      [
        'titleFontSizeSmall',
        'self.titleFontSizeSmall via createKey("titleFontSize", mergedSize)',
        ['--n-title-font-size'],
        'small',
        '.n-card--small-type titleFontSize',
      ],
      [
        'paddingMedium',
        'self.paddingMedium via createKey("padding", mergedSize)',
        ['--n-padding-top', '--n-padding-left', '--n-padding-bottom'],
        'medium',
        '.n-card--medium-type padding',
      ],
      [
        'fontSizeMedium',
        'self.fontSizeMedium via createKey("fontSize", mergedSize)',
        ['--n-font-size'],
        'medium',
        '.n-card--medium-type fontSize',
      ],
      [
        'titleFontSizeMedium',
        'self.titleFontSizeMedium via createKey("titleFontSize", mergedSize)',
        ['--n-title-font-size'],
        'medium',
        '.n-card--medium-type titleFontSize',
      ],
      [
        'paddingLarge',
        'self.paddingLarge via createKey("padding", mergedSize)',
        ['--n-padding-top', '--n-padding-left', '--n-padding-bottom'],
        'large',
        '.n-card--large-type padding',
      ],
      [
        'fontSizeLarge',
        'self.fontSizeLarge via createKey("fontSize", mergedSize)',
        ['--n-font-size'],
        'large',
        '.n-card--large-type fontSize',
      ],
      [
        'titleFontSizeLarge',
        'self.titleFontSizeLarge via createKey("titleFontSize", mergedSize)',
        ['--n-title-font-size'],
        'large',
        '.n-card--large-type titleFontSize',
      ],
      [
        'paddingHuge',
        'self.paddingHuge via createKey("padding", mergedSize)',
        ['--n-padding-top', '--n-padding-left', '--n-padding-bottom'],
        'huge',
        '.n-card--huge-type padding',
      ],
      [
        'fontSizeHuge',
        'self.fontSizeHuge via createKey("fontSize", mergedSize)',
        ['--n-font-size'],
        'huge',
        '.n-card--huge-type fontSize',
      ],
      [
        'titleFontSizeHuge',
        'self.titleFontSizeHuge via createKey("titleFontSize", mergedSize)',
        ['--n-title-font-size'],
        'huge',
        '.n-card--huge-type titleFontSize',
      ],
    ],
    useThemeKey: 'Card/-card',
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
        'color',
        'self.color via createKey("color", type)',
        ['--n-color'],
        'native',
        '.n-tag default tag or its close button',
      ],
      [
        'closeIconColor',
        'self.closeIconColor via createKey("closeIconColor", type)',
        ['--n-close-icon-color'],
        'native',
        '.n-tag default tag or its close button',
      ],
      [
        'closeIconColorHover',
        'self.closeIconColorHover via createKey("closeIconColorHover", type)',
        ['--n-close-icon-color-hover'],
        'native',
        '.n-tag default tag or its close button',
      ],
      [
        'closeIconColorPressed',
        'self.closeIconColorPressed via createKey("closeIconColorPressed", type)',
        ['--n-close-icon-color-pressed'],
        'native',
        '.n-tag default tag or its close button',
      ],
      [
        'closeColorHover',
        'self.closeColorHover via createKey("closeColorHover", type)',
        ['--n-close-color-hover'],
        'native',
        '.n-tag default tag or its close button',
      ],
      [
        'closeColorPressed',
        'self.closeColorPressed via createKey("closeColorPressed", type)',
        ['--n-close-color-pressed'],
        'native',
        '.n-tag default tag or its close button',
      ],
      [
        'closeBorderRadius',
        'self.closeBorderRadius',
        ['--n-close-border-radius'],
        'native',
        '.n-tag default tag or its close button',
      ],
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

function naiveComponentOverrideFields(component: NaiveThemeComponent): readonly string[] {
  const consumption = naive2452ConsumptionContract.find((record) => record.component === component)
  if (consumption === undefined) throw new Error(`Missing Naive consumption contract: ${component}`)
  return consumption.fields.map(([overrideKey]) => overrideKey)
}

const themeOverrideContract = {
  common: [
    'fontSizeTiny',
    'fontSizeMini',
    'textColorDisabled',
    'placeholderColor',
    'placeholderColorDisabled',
    'infoColor',
    'infoColorHover',
    'infoColorPressed',
    'infoColorSuppl',
    'successColor',
    'successColorHover',
    'successColorPressed',
    'successColorSuppl',
    'warningColor',
    'warningColorHover',
    'warningColorPressed',
    'warningColorSuppl',
    'errorColor',
    'errorColorHover',
    'errorColorPressed',
    'errorColorSuppl',
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
  Breadcrumb: naiveComponentOverrideFields('Breadcrumb'),
  Button: naiveComponentOverrideFields('Button'),
  Card: naiveComponentOverrideFields('Card'),
  Descriptions: naiveComponentOverrideFields('Descriptions'),
  Radio: naiveComponentOverrideFields('Radio'),
  Tag: naiveComponentOverrideFields('Tag'),
  Tooltip: [...naiveComponentOverrideFields('Tooltip'), 'peers'],
} as const satisfies Readonly<Record<NaiveThemeComponent | 'common', readonly string[]>>

const naive2452SharedConsumptionContract = [
  {
    consumingComponent: 'Button',
    overrideKey: 'heightSmall',
    selfLookup: 'self.heightSmall inherited from common.heightSmall via createKey("height", size)',
    emittedCssVariable: '--n-height',
    selectorState: '.n-button--small-type normal height',
    useThemeKey: 'Button/-button',
  },
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
  Card: 'Card/-card',
  Descriptions: 'Descriptions/-descriptions',
  Radio: 'Radio/-radio-group',
  Tag: 'Tag/-tag',
  Tooltip: 'Tooltip/-tooltip',
} as const

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

// Mutate CSS snapshots by declaration, so layer nesting and formatting do not
// turn a negative probe into an unchanged source string. No repository writes.
function replaceSfcCssValue(
  source: string,
  selector: string,
  property: string,
  from: string,
  to: string,
): string {
  let result = source
  for (const style of vueSfcCompiler.parse(source, { filename: shellSfcPath }).descriptor.styles) {
    const compiled = vueSfcCompiler.compileStyle({
      filename: shellSfcPath,
      id: shellSfcScopeId,
      scoped: false,
      source: style.content,
    })
    const matches: NavigationStyleDeclaration[] = []
    compiled.rawResult?.root.walkDecls((declaration) => {
      if (
        declaration.prop === property &&
        declaration.value === from &&
        splitCssSelectorList(declaration.parent?.selector ?? '').some(
          (candidate) => normalizedCssSelector(candidate) === normalizedCssSelector(selector),
        )
      ) {
        matches.push(declaration)
      }
    })
    if (matches.length > 0 && compiled.rawResult !== undefined) {
      for (const declaration of matches) {
        declaration.cloneBefore({ value: to })
        declaration.remove()
      }
      result = result.replace(style.content, compiled.rawResult.root.toString())
    }
  }
  return result
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

function navigationDropdownThemeOverride(source: string): ts.ObjectLiteralExpression | undefined {
  const overrides = themeOverrideObject(source)
  const menu = overrides === undefined ? undefined : objectPropertyObject(overrides, 'Menu')
  const peers = menu === undefined ? undefined : objectPropertyObject(menu, 'peers')
  const value = peers === undefined ? undefined : objectPropertyInitializer(peers, 'Dropdown')
  if (value === undefined) return undefined
  const expression = unwrapExpression(value)
  if (ts.isObjectLiteralExpression(expression)) return expression
  if (!ts.isIdentifier(expression)) return undefined
  let result: ts.ObjectLiteralExpression | undefined
  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === expression.getText() &&
      node.initializer !== undefined
    ) {
      const initializer = unwrapExpression(node.initializer)
      if (ts.isObjectLiteralExpression(initializer)) result = initializer
    }
    ts.forEachChild(node, visit)
  }
  visit(expression.getSourceFile())
  return result
}

function naiveCommonParserSensitiveOverrides(source: string): readonly string[] {
  const overrides = themeOverrideObject(source)
  const commonOverride =
    overrides === undefined ? undefined : objectPropertyObject(overrides, 'common')
  const commonProperties =
    commonOverride === undefined ? undefined : staticObjectPropertyNames(commonOverride)

  if (commonOverride === undefined || commonProperties === undefined) {
    return []
  }

  const declarations = themeVariableInitializers(commonOverride.getSourceFile())
  const statusFields = new Set<string>()
  const invalidStatusFields: string[] = []

  for (const tone of ['info', 'success', 'warning', 'error']) {
    for (const [suffix, value] of [
      ['', 'default'],
      ['Hover', 'hover'],
      ['Pressed', 'pressed'],
      ['Suppl', 'supplementary'],
    ] as const) {
      const field = `${tone}Color${suffix}`
      statusFields.add(field)
      const authority = resolveThemeAuthority(
        objectPropertyInitializer(commonOverride, field),
        declarations,
      )

      if (authority.authority !== `status.${tone}.${value}` || authority.valueKind !== 'color') {
        invalidStatusFields.push(field)
      }
    }
  }

  return [
    ...commonProperties.filter(
      (property) =>
        naiveCommonParserSensitiveColorProperties.has(property) && !statusFields.has(property),
    ),
    ...invalidStatusFields,
  ]
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

function statusProjectionPath(
  expression: ts.Expression,
  declarations: ReadonlyMap<string, ts.Expression>,
  seen: ReadonlySet<string> = new Set(),
): readonly string[] | undefined {
  const value = unwrapExpression(expression)

  if (
    ts.isPropertyAccessExpression(value) ||
    (ts.isElementAccessExpression(value) && ts.isStringLiteral(value.argumentExpression))
  ) {
    const parent = statusProjectionPath(value.expression, declarations, seen)
    const key = ts.isPropertyAccessExpression(value)
      ? value.name.text
      : (value.argumentExpression as ts.StringLiteral).text
    return parent === undefined ? undefined : [...parent, key]
  }

  if (!ts.isIdentifier(value) || seen.has(value.text)) return undefined

  const isSnapshotParameter = value
    .getSourceFile()
    .statements.some(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.parameters.some(
          (parameter) =>
            ts.isIdentifier(parameter.name) &&
            parameter.name.text === value.text &&
            /\bUiAppearanceSnapshot\b/u.test(parameter.type?.getText() ?? ''),
        ),
    )

  if (isSnapshotParameter) return []
  const initializer = declarations.get(value.text)
  return initializer === undefined
    ? undefined
    : statusProjectionPath(initializer, declarations, new Set([...seen, value.text]))
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

  const statusPath = statusProjectionPath(value, declarations)
  if (
    statusPath?.length === 3 &&
    statusPath[0] === 'statusColors' &&
    ['info', 'success', 'warning', 'error'].includes(statusPath[1] ?? '') &&
    ['default', 'hover', 'pressed', 'supplementary', 'onStatus'].includes(statusPath[2] ?? '')
  ) {
    return { authority: `status.${statusPath.slice(1).join('.')}`, valueKind: 'color' }
  }

  if (
    ts.isTemplateExpression(value) &&
    value.head.text === 'var(--ui-admin-border-width) solid ' &&
    value.templateSpans.length === 1
  ) {
    const span = value.templateSpans[0]
    const color =
      span === undefined ? undefined : statusProjectionPath(span.expression, declarations)
    if (
      span?.literal.text === '' &&
      color?.length === 3 &&
      color[0] === 'statusColors' &&
      ['info', 'success', 'warning', 'error'].includes(color[1] ?? '') &&
      color[2] === 'default'
    ) {
      return { authority: `status.${color[1] ?? ''}.border`, valueKind: 'border' }
    }
  }

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

function buttonPaddingAuthority(expression: ts.Expression | undefined): NaiveThemeAuthority {
  const invalid = { authority: 'invalid-button-padding-shape', valueKind: 'unknown' } as const
  if (expression === undefined) return invalid

  // Bind the exact tree owning this field; other theme fields keep their existing resolver.
  const sourceFile = expression.getSourceFile()
  const options: ts.CompilerOptions = { noEmit: true, noLib: true, noResolve: true }
  const host = ts.createCompilerHost(options)
  host.getSourceFile = (name) => (name === sourceFile.fileName ? sourceFile : undefined)
  host.fileExists = (name) => name === sourceFile.fileName
  host.readFile = (name) => (name === sourceFile.fileName ? sourceFile.text : undefined)
  const program = ts.createProgram([sourceFile.fileName], options, host)
  const checker = program.getTypeChecker()
  const diagnostics = program.getSemanticDiagnostics(sourceFile)

  function binding(identifier: ts.Identifier): ts.Declaration | undefined {
    const declarations = checker.getSymbolAtLocation(identifier)?.getDeclarations()
    const declaration = declarations?.length === 1 ? declarations[0] : undefined
    if (
      declaration?.getSourceFile() !== sourceFile ||
      diagnostics.some(
        (diagnostic) =>
          diagnostic.file === sourceFile &&
          diagnostic.start !== undefined &&
          diagnostic.start >= declaration.getStart() &&
          diagnostic.start < declaration.end,
      )
    ) {
      return undefined
    }
    return declaration
  }

  function immutableValue(
    candidate: ts.Expression | undefined,
    seen: ReadonlySet<ts.Declaration> = new Set(),
  ): ts.Expression | undefined {
    if (candidate === undefined) return undefined
    const value = unwrapExpression(candidate)
    if (!ts.isIdentifier(value)) return value
    const declaration = binding(value)
    if (
      declaration === undefined ||
      seen.has(declaration) ||
      !ts.isVariableDeclaration(declaration) ||
      !ts.isIdentifier(declaration.name) ||
      !ts.isVariableDeclarationList(declaration.parent) ||
      (declaration.parent.flags & ts.NodeFlags.Const) === 0 ||
      !ts.isVariableStatement(declaration.parent.parent)
    ) {
      return undefined
    }
    return immutableValue(declaration.initializer, new Set([...seen, declaration]))
  }

  const value = immutableValue(expression)
  if (value !== undefined && ts.isTemplateExpression(value) && value.head.text === '0 ') {
    const span = value.templateSpans[0]
    const inline = immutableValue(span?.expression)
    if (
      value.templateSpans.length === 1 &&
      span?.literal.text === '' &&
      inline !== undefined &&
      ts.isElementAccessExpression(inline) &&
      ts.isIdentifier(inline.expression) &&
      ts.isStringLiteral(inline.argumentExpression) &&
      inline.argumentExpression.text === 'spacing.button.inline'
    ) {
      const imported = binding(inline.expression)
      if (imported !== undefined && ts.isImportSpecifier(imported)) {
        const clause = imported.parent.parent
        const declaration = clause.parent
        if (
          !imported.isTypeOnly &&
          clause.phaseModifier === undefined &&
          (imported.propertyName ?? imported.name).text === 'tokens' &&
          ts.isImportDeclaration(declaration) &&
          ts.isStringLiteral(declaration.moduleSpecifier) &&
          declaration.moduleSpecifier.text === '@platform/design-system'
        ) {
          return tokenAuthority('spacing.button.inline')
        }
      }
    }
  }
  return invalid
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

function isNavigationThemeProjection(
  value: unknown,
): value is (appearance: Readonly<UiAppearanceSnapshot>) => unknown {
  return typeof value === 'function'
}

function requiredNavigationColor(owner: JsonObject, field: string): string {
  const value = owner[field]
  if (typeof value !== 'string') {
    throw new TypeError(`The Naive navigation theme projection is missing ${field}.`)
  }
  return value
}

function isSoftButtonProjection(
  value: unknown,
): value is (
  appearance: Readonly<UiAppearanceSnapshot>,
  type: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error',
) => unknown {
  return typeof value === 'function'
}

async function actualNavigationThemeColors(): Promise<NavigationThemeColorSnapshot> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pavp-naive-theme-check-'))
  const previousNodeEnv = process.env['NODE_ENV']
  try {
    const outputDirectory = join(temporaryDirectory, 'output')
    await build({
      root: rootDirectory,
      configFile: false,
      envDir: false,
      publicDir: false,
      cacheDir: join(temporaryDirectory, 'cache'),
      plugins: [],
      ssr: { target: 'node', noExternal: true },
      build: {
        ssr: resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'),
        target: 'node24',
        outDir: outputDirectory,
        emptyOutDir: false,
        copyPublicDir: false,
        watch: null,
        manifest: false,
        ssrManifest: false,
        emitAssets: false,
        sourcemap: false,
        reportCompressedSize: false,
        rolldownOptions: { output: { entryFileNames: 'theme.mjs' } },
      },
    })
    const loaded: unknown = await import(pathToFileURL(join(outputDirectory, 'theme.mjs')).href)
    if (!isJsonObject(loaded)) {
      throw new TypeError('The compiled Naive theme module has no exports.')
    }
    const projection = loaded['createPavpNaiveThemeProjection']
    if (!isNavigationThemeProjection(projection)) {
      throw new TypeError('The compiled Naive theme projection export is not callable.')
    }
    const softButtonProjection = loaded['createPavpNaiveSoftButtonProps']
    if (!isSoftButtonProjection(softButtonProjection))
      throw new TypeError('The bounded soft Button projection is unavailable.')
    const formColorProjection = loaded['createPavpNaiveFormThemeProjection']
    if (!isNavigationThemeProjection(formColorProjection))
      throw new TypeError('The Form color projection is unavailable.')
    const atColor = (value: unknown, ...keys: string[]): unknown =>
      keys.reduce<unknown>(
        (current, key) => (isJsonObject(current) ? current[key] : undefined),
        value,
      )
    const expectColor = (actual: unknown, expected: string, context: string): void => {
      if (actual !== expected) throw new TypeError(`Naive semantic color mismatch: ${context}.`)
    }
    for (const themeId of builtInThemeIds) {
      const resolved = resolveThemeReference({
        reference: { registryKind: 'built-in', themeId },
        customThemeRegistry: null,
      })
      if (resolved.status !== 'resolved')
        throw new TypeError('An approved Built-in Theme is unavailable.')
      const bank = generatedThemeRegistry.builtInEntries.find((entry) => entry.themeId === themeId)
      if (bank === undefined) throw new TypeError('The current Theme Bank is unavailable.')
      const currentCustomCases = ['authored', 'action-on-page', 'action-on-panel'].map(
        (scenario) => {
          const planes = Object.fromEntries(
            (['light', 'dark'] as const).map((mode) => [
              mode,
              Object.fromEntries(
                (['standard', 'enhanced'] as const).map((contrast) => {
                  const colors = Object.fromEntries(
                    bank.bank.records
                      .filter((record) => record.colorMode === mode && record.contrast === contrast)
                      .map((record) => [record.publicRole, record.resolvedValue]),
                  )
                  if (scenario !== 'authored') {
                    const surface =
                      colors[
                        scenario === 'action-on-page' ? 'color.surface.page' : 'color.surface.panel'
                      ]
                    const foreground = colors['color.text.primary']
                    if (surface === undefined || foreground === undefined)
                      throw new TypeError('The current Custom regression fixture is incomplete.')
                    colors['color.action.primary'] = surface
                    colors['color.text.on-action'] = foreground
                  }
                  return [contrast, colors]
                }),
              ),
            ]),
          )
          const validation = validateCustomThemeDefinition({
            schemaVersion: 3,
            roleContractVersion: generatedThemeRegistry.roleContractVersion,
            id: `current-custom-projection-${themeId}-${scenario}`,
            label: resolved.entry.definition.label,
            planes,
          })
          if (validation.status !== 'validated')
            throw new TypeError('The current role-only Custom projection fixture is invalid.')
          return validation.entry
        },
      )
      for (const colorMode of ['light', 'dark'] as const) {
        for (const contrast of ['standard', 'enhanced'] as const) {
          const snapshot = projectUiAppearance(
            {
              ...ProductPreferenceDefault,
              colorMode,
              contrast,
              density: ProductPreferenceDefault.density.preset,
              material: 'solid',
              theme: { registryKind: 'built-in', themeId },
            },
            resolved.entry,
          )
          const palette = snapshot.colorPalette
          if (palette === null) throw new TypeError('An approved semantic palette is unavailable.')
          const projectedColors = atColor(projection(snapshot), 'themeOverrides')
          const formColors = formColorProjection(snapshot)
          const context = `${themeId}/${colorMode}/${contrast}`
          const contrastContract = tokenManifest.namedContrasts.find(
            (pair) => pair.id === 'text-primary-on-panel',
          )
          if (contrastContract === undefined)
            throw new TypeError('The current text contrast authority is unavailable.')
          const minimum =
            contrast === 'enhanced'
              ? contrastContract.enhancedMinimum
              : contrastContract.standardMinimum
          for (const currentCustom of currentCustomCases) {
            const customSnapshot = projectUiAppearance(
              {
                ...snapshot,
                theme: { registryKind: 'custom', themeId: currentCustom.themeId },
              },
              currentCustom,
            )
            if (customSnapshot.colorPalette !== null)
              throw new TypeError('Current Custom projection must remain role-only.')
            const customOverrides = atColor(projection(customSnapshot), 'themeOverrides')
            const customForm = formColorProjection(customSnapshot)
            const customPlane = currentCustom.definition.planes[colorMode][contrast]
            const customRoleColor = (role: string): string => {
              const value = customPlane[role]
              if (value === undefined) throw new TypeError(`Missing current Custom color: ${role}.`)
              return value
            }
            const customVariables = new Map<string, string>(
              generatedThemeRegistry.activePublicColorRoles.map((role) => [
                role.publicBinding,
                customRoleColor(role.publicRole),
              ]),
            )
            const customColor = (value: unknown): string => {
              if (typeof value !== 'string') throw new TypeError('A Custom color is missing.')
              const binding = /^var\((--[^),]+)\)$/u.exec(value)?.[1]
              const resolved = binding === undefined ? value : customVariables.get(binding)
              if (resolved === undefined)
                throw new TypeError('A Custom color binding is unresolved.')
              return resolved
            }
            for (const field of ['feedbackTextColorError', 'feedbackTextColorWarning'])
              for (const surface of ['color.surface.page', 'color.surface.panel'] as const) {
                const ratio = calculateWcag21Contrast(
                  parseCssColor(customColor(atColor(customOverrides, 'Form', field))),
                  parseCssColor(customRoleColor(surface)),
                )
                if (ratio < minimum)
                  throw new TypeError(
                    `${context}/Custom ${field}: transparent feedback contrast failed.`,
                  )
              }
            const feedbackRatio = calculateWcag21Contrast(
              parseCssColor(customColor(atColor(customForm, 'Form', 'feedbackTextColorError'))),
              parseCssColor(customRoleColor('color.status.error')),
            )
            if (feedbackRatio < minimum)
              throw new TypeError(`${context}/Custom solid Form feedback contrast failed.`)
            for (const overrides of [customOverrides, customForm])
              for (const rail of ['railColor', 'railColorActive']) {
                const background = customColor(atColor(overrides, 'Switch', rail))
                const foreground = customColor(atColor(overrides, 'Switch', 'textColor'))
                const thumb = customColor(atColor(overrides, 'Switch', 'buttonColor'))
                if (
                  background !== customRoleColor('color.text.primary') ||
                  foreground !== customRoleColor('color.surface.panel') ||
                  thumb !== customRoleColor('color.surface.panel') ||
                  calculateWcag21Contrast(parseCssColor(foreground), parseCssColor(background)) <
                    minimum
                )
                  throw new TypeError(`${context}/Custom ${rail}: Switch pairing is unsupported.`)
                for (const surface of ['color.surface.page', 'color.surface.panel']) {
                  const pair = tokenManifest.namedContrasts.find(
                    (candidate) =>
                      candidate.id ===
                      (surface === 'color.surface.page'
                        ? 'border-default-on-page'
                        : 'border-default-on-panel'),
                  )
                  if (pair === undefined)
                    throw new TypeError('The current non-text contrast authority is unavailable.')
                  const boundaryMinimum =
                    contrast === 'enhanced' ? pair.enhancedMinimum : pair.standardMinimum
                  if (
                    calculateWcag21Contrast(
                      parseCssColor(background),
                      parseCssColor(customRoleColor(surface)),
                    ) < boundaryMinimum
                  )
                    throw new TypeError(
                      `${context}/${currentCustom.themeId}/${rail}: Custom Switch track boundary failed.`,
                    )
                }
                for (const field of ['buttonColor', 'iconColor', 'loadingColor']) {
                  const color = customColor(atColor(overrides, 'Switch', field))
                  const backdrop = field === 'buttonColor' ? background : thumb
                  if (
                    calculateWcag21Contrast(parseCssColor(color), parseCssColor(backdrop)) < minimum
                  )
                    throw new TypeError(
                      `${context}/${currentCustom.themeId}/${rail}/${field}: Custom Switch content contrast failed.`,
                    )
                }
              }
          }
          const requireContrast = (
            foreground: unknown,
            background: unknown,
            label: string,
          ): void => {
            if (
              typeof foreground !== 'string' ||
              typeof background !== 'string' ||
              calculateWcag21Contrast(parseCssColor(foreground), parseCssColor(background)) <
                minimum
            )
              throw new TypeError(
                `${context}/${label}: actual projected contrast is below ${String(minimum)}.`,
              )
          }
          expectColor(
            atColor(projectedColors, 'Form', 'feedbackTextColorError'),
            palette.roles.error.foreground.default,
            `${context}/plain Form feedback`,
          )
          expectColor(
            atColor(formColors, 'Form', 'feedbackTextColorError'),
            palette.roles.error.solid.foreground,
            `${context}/PAVP strong feedback`,
          )
          for (const background of Object.values(palette.surfaces))
            requireContrast(
              atColor(projectedColors, 'Form', 'feedbackTextColorError'),
              background,
              'transparent Form error feedback',
            )
          requireContrast(
            atColor(formColors, 'Form', 'feedbackTextColorError'),
            palette.roles.error.solid.background.default,
            'PAVP solid Form feedback',
          )
          expectColor(
            atColor(projectedColors, 'Switch', 'railColor'),
            palette.roles.neutral.solid.background.default,
            `${context}/Switch unchecked rail`,
          )
          for (const rail of ['railColor', 'railColorActive'])
            requireContrast(
              atColor(projectedColors, 'Switch', 'textColor'),
              atColor(projectedColors, 'Switch', rail),
              `Switch ${rail} slot text`,
            )

          for (const [tone, suffix] of [
            ['default', ''],
            ['primary', 'Primary'],
            ['info', 'Info'],
            ['success', 'Success'],
            ['warning', 'Warning'],
            ['error', 'Error'],
          ] as const) {
            const props = softButtonProjection(snapshot, tone)
            if (
              !isJsonObject(props) ||
              props['type'] !== tone ||
              props['secondary'] !== false ||
              props['bordered'] !== false
            )
              throw new TypeError(
                'Soft Button props must use the official independent-color branch.',
              )
            const family = palette.roles[tone === 'default' ? 'neutral' : tone]
            for (const [state, background] of [
              ['', family.soft.background.default],
              ['Hover', family.soft.background.hover],
              ['Pressed', family.soft.background.pressed],
              ['Focus', family.soft.background.hover],
            ] as const) {
              const fg = atColor(props, 'themeOverrides', `textColor${state}${suffix}`)
              const bg = atColor(props, 'themeOverrides', `color${state}${suffix}`)
              expectColor(fg, family.soft.foreground, `${context}/soft ${tone} text`)
              expectColor(bg, background, `${context}/soft ${tone} background`)
              requireContrast(fg, bg, `soft ${tone}/${state}`)
            }
          }
          for (const [tone, suffix] of [
            ['primary', 'Primary'],
            ['info', 'Info'],
            ['success', 'Success'],
            ['warning', 'Warning'],
            ['error', 'Error'],
          ] as const) {
            const family = palette.roles[tone]
            for (const [field, expected] of [
              ['color', family.solid.background.default],
              ['colorHover', family.solid.background.hover],
              ['colorPressed', family.solid.background.pressed],
              ['colorFocus', family.solid.background.focus],
              ['textColor', family.solid.foreground],
              ['textColorHover', family.solid.foreground],
              ['textColorPressed', family.solid.foreground],
              ['textColorFocus', family.solid.foreground],
              ['colorDisabled', family.disabled.background],
              ['textColorDisabled', family.disabled.foreground],
              ['textColorText', family.foreground.default],
              ['textColorTextHover', family.foreground.hover],
              ['textColorTextPressed', family.foreground.pressed],
              ['textColorGhost', family.foreground.default],
            ] as const)
              expectColor(
                atColor(projectedColors, 'Button', `${field}${suffix}`),
                expected,
                `${context}/Button.${field}${suffix}`,
              )
            for (const [field, expected] of [
              ['Color', family.foreground.default],
              ['ColorHover', family.foreground.hover],
              ['ColorPressed', family.foreground.pressed],
              ['ColorSuppl', family.foreground.suppl],
            ] as const)
              expectColor(
                atColor(projectedColors, 'common', `${tone}${field}`),
                expected,
                `${context}/common.${tone}${field}`,
              )
            expectColor(
              atColor(projectedColors, 'Tag', `color${suffix}`),
              family.soft.background.default,
              `${context}/Tag`,
            )
            expectColor(
              atColor(projectedColors, 'Tag', `textColor${suffix}`),
              family.soft.foreground,
              `${context}/Tag text`,
            )
            if (suffix !== 'Primary') {
              expectColor(
                atColor(projectedColors, 'Alert', `color${suffix}`),
                family.soft.background.default,
                `${context}/Alert`,
              )
              expectColor(
                atColor(projectedColors, 'Alert', `contentTextColor${suffix}`),
                family.soft.foreground,
                `${context}/Alert content`,
              )
              expectColor(
                atColor(projectedColors, 'Message', `iconColor${suffix}`),
                family.foreground.default,
                `${context}/Message`,
              )
              expectColor(
                atColor(projectedColors, 'Notification', `iconColor${suffix}`),
                family.foreground.default,
                `${context}/Notification`,
              )
            }
          }
          for (const [keys, expected] of [
            [['Checkbox', 'colorChecked'], palette.roles.primary.solid.background.default],
            [['Checkbox', 'checkMarkColor'], palette.roles.primary.solid.foreground],
            [['Radio', 'colorActive'], palette.roles.primary.solid.background.default],
            [['Radio', 'dotColorActive'], palette.roles.primary.solid.foreground],
            [['Switch', 'railColorActive'], palette.roles.primary.solid.background.default],
            [['Switch', 'textColor'], palette.roles.primary.solid.foreground],
            [['Input', 'color'], palette.surfaces.surface],
            [['Input', 'placeholderColor'], palette.text.muted],
            [['Input', 'colorDisabled'], palette.roles.primary.disabled.background],
            [['Table', 'tdColor'], palette.surfaces.surface],
            [['DataTable', 'tdColorHover'], palette.roles.neutral.soft.background.hover],
            [['Tabs', 'barColor'], palette.roles.primary.foreground.default],
            [['Popover', 'color'], palette.surfaces.raised],
            [['Modal', 'color'], palette.surfaces.raised],
            [['Tooltip', 'color'], palette.tooltip.background],
            [['Tooltip', 'textColor'], palette.tooltip.foreground],
          ] as const)
            expectColor(atColor(projectedColors, ...keys), expected, `${context}/${keys.join('.')}`)
          for (const [keys, expected] of [
            [['Input', 'color'], palette.surfaces.surface],
            [
              ['InputNumber', 'peers', 'Input', 'colorDisabled'],
              palette.roles.primary.disabled.background,
            ],
            [['Select', 'peers', 'InternalSelection', 'color'], palette.surfaces.surface],
            [
              ['Select', 'peers', 'InternalSelectMenu', 'optionColorActive'],
              palette.roles.primary.soft.background.default,
            ],
            [['DatePicker', 'itemColorActive'], palette.roles.primary.solid.background.default],
            [['DatePicker', 'itemTextColorActive'], palette.roles.primary.solid.foreground],
          ] as const)
            expectColor(atColor(formColors, ...keys), expected, `${context}/Form.${keys.join('.')}`)
          const commonColors = atColor(projectedColors, 'common')
          if (!isJsonObject(commonColors)) throw new TypeError('Naive Common colors are absent.')
          for (const field of naiveCommonParserSensitiveColorProperties)
            if (
              typeof commonColors[field] !== 'string' ||
              !/^rgba\(\d+, \d+, \d+, 1\)$/u.test(commonColors[field])
            )
              throw new TypeError(
                `${context}/common.${field}: parser-sensitive color must be opaque integer RGBA.`,
              )
        }
      }
    }

    const preference = ProductPreferenceDefault
    const resolution = resolveThemeReference({
      reference: preference.theme,
      customThemeRegistry: null,
    })
    if (resolution.status !== 'resolved') {
      throw new TypeError('The canonical default Appearance Theme is unavailable.')
    }
    const appearance = projectUiAppearance(
      {
        colorMode: resolveColorMode({
          storedColorMode: preference.colorMode,
          prefersDark: false,
        }),
        contrast: preference.contrast,
        density: preference.density.preset,
        fontScale: preference.fontScale,
        material: resolveMaterial({
          storedMaterial: preference.material,
          forcedColorsActive: false,
          reducedTransparencyRequested: false,
          backdropFilterSupported: true,
        }),
        motion: preference.motion,
        radius: preference.radius,
        theme: preference.theme,
      },
      resolution.entry,
    )
    const projected: unknown = projection(appearance)
    if (!isJsonObject(projected) || !isJsonObject(projected['themeOverrides'])) {
      throw new TypeError('The compiled Naive theme projection has no overrides.')
    }
    const overrides = projected['themeOverrides']
    const common = overrides['common']
    const button = overrides['Button']
    if (
      !isJsonObject(common) ||
      !isJsonObject(button) ||
      common['heightSmall'] !== 'var(--ui-control-height-baseline)' ||
      common['heightMedium'] !== 'var(--ui-control-height-baseline)' ||
      common['heightLarge'] !== 'var(--ui-layout-target-enhanced-minimum-block-size)' ||
      Object.hasOwn(button, 'heightSmall') ||
      Object.hasOwn(button, 'heightTiny') ||
      button['heightMedium'] !== 'var(--ui-layout-target-enhanced-minimum-block-size)' ||
      button['paddingMedium'] !== '0 var(--ui-space-button-inline)'
    )
      throw new TypeError(
        'The compiled Naive density baseline or preserved Button geometry drifted.',
      )
    const tag = overrides['Tag']
    const switchTheme = overrides['Switch']
    const formProjection = loaded['createPavpNaiveFormThemeProjection']
    if (!isNavigationThemeProjection(formProjection))
      throw new TypeError('The existing Form theme projection is unavailable.')
    const formTheme: unknown = formProjection(appearance)
    if (
      !isJsonObject(tag) ||
      tag['heightMedium'] !== 'var(--ui-control-height)' ||
      !isJsonObject(switchTheme) ||
      switchTheme['railWidthMedium'] !== 'var(--ui-control-height)' ||
      ![
        'railHeightMedium',
        'buttonHeightMedium',
        'buttonWidthMedium',
        'buttonWidthPressedMedium',
      ].every((field) => switchTheme[field] === 'calc(var(--ui-control-height) / 2)') ||
      !isJsonObject(formTheme) ||
      !isDeepStrictEqual(formTheme['Switch'], switchTheme)
    )
      throw new TypeError(
        'Existing Tag/Switch density consumers and shared Form Switch geometry must remain exact.',
      )
    const menu = overrides['Menu']
    const dropdown = overrides['Dropdown']
    if (!isJsonObject(menu) || !isJsonObject(dropdown) || !isJsonObject(menu['peers'])) {
      throw new TypeError('The compiled Naive navigation overrides are incomplete.')
    }
    const at = (value: unknown, ...keys: readonly string[]): unknown =>
      keys.reduce<unknown>(
        (current, key) => (isJsonObject(current) ? current[key] : undefined),
        value,
      )
    const radiusFields: readonly (readonly [unknown, Readonly<Record<string, string>>])[] = [
      [
        common,
        { borderRadius: 'var(--ui-radius-control)', borderRadiusSmall: 'var(--ui-radius-small)' },
      ],
      [button, { borderRadiusMedium: 'var(--ui-radius-control)' }],
      [
        tag,
        { borderRadius: 'var(--ui-radius-control)', closeBorderRadius: 'var(--ui-radius-small)' },
      ],
      [menu, { borderRadius: 'var(--ui-radius-control)' }],
      [dropdown, { borderRadius: 'var(--ui-radius-control)' }],
      [at(dropdown, 'peers', 'Popover'), { borderRadius: 'var(--ui-radius-panel)' }],
      [overrides['Breadcrumb'], { itemBorderRadius: 'var(--ui-radius-small)' }],
      [overrides['Radio'], { buttonBorderRadius: 'var(--ui-radius-control)' }],
      [overrides['Scrollbar'], { borderRadius: 'var(--ui-radius-small)' }],
      [overrides['Descriptions'], { borderRadius: 'var(--ui-radius-panel)' }],
      [overrides['Tooltip'], { borderRadius: 'var(--ui-radius-panel)' }],
      [at(overrides, 'Tooltip', 'peers', 'Popover'), { borderRadius: 'var(--ui-radius-panel)' }],
      [
        switchTheme,
        {
          railBorderRadiusMedium: 'calc(var(--ui-control-height) / 4)',
          buttonBorderRadiusMedium: 'calc(var(--ui-control-height) / 4)',
        },
      ],
      [formTheme['Input'], { borderRadius: 'var(--ui-radius-control)' }],
      [
        at(formTheme, 'InputNumber', 'peers', 'Input'),
        { borderRadius: 'var(--ui-radius-control)' },
      ],
      [
        at(formTheme, 'Select', 'peers', 'InternalSelection'),
        { borderRadius: 'var(--ui-radius-control)' },
      ],
      [
        at(formTheme, 'Select', 'peers', 'InternalSelection', 'peers', 'Popover'),
        { borderRadius: 'var(--ui-radius-panel)' },
      ],
      [
        at(formTheme, 'Select', 'peers', 'InternalSelectMenu'),
        { borderRadius: 'var(--ui-radius-panel)' },
      ],
      [
        formTheme['DatePicker'],
        { itemBorderRadius: 'var(--ui-radius-small)', panelBorderRadius: 'var(--ui-radius-panel)' },
      ],
    ]
    if (
      radiusFields.some(
        ([value, expected]) =>
          !isJsonObject(value) ||
          Object.entries(expected).some(([field, radius]) => value[field] !== radius),
      )
    )
      throw new TypeError(
        'The compiled Naive Control/Panel/Small or intrinsic Switch radius projection drifted.',
      )
    const childActiveFillPresent = Object.hasOwn(menu, 'itemColorChildActive')
    const childActiveHoverFillPresent = Object.hasOwn(menu, 'itemColorChildActiveHover')
    if (childActiveFillPresent) requiredNavigationColor(menu, 'itemColorChildActive')
    if (childActiveHoverFillPresent) requiredNavigationColor(menu, 'itemColorChildActiveHover')

    if (appearance.colorPalette === null)
      throw new TypeError('The default Built-in palette is unavailable.')
    return Object.freeze({
      palette: appearance.colorPalette,
      menu: Object.freeze({
        itemColorHover: requiredNavigationColor(menu, 'itemColorHover'),
        itemColorActive: requiredNavigationColor(menu, 'itemColorActive'),
        itemColorActiveHover: requiredNavigationColor(menu, 'itemColorActiveHover'),
        itemColorActiveCollapsed: requiredNavigationColor(menu, 'itemColorActiveCollapsed'),
        itemTextColorActive: requiredNavigationColor(menu, 'itemTextColorActive'),
        itemTextColorActiveHover: requiredNavigationColor(menu, 'itemTextColorActiveHover'),
        itemIconColorActive: requiredNavigationColor(menu, 'itemIconColorActive'),
        itemIconColorActiveHover: requiredNavigationColor(menu, 'itemIconColorActiveHover'),
        arrowColorActive: requiredNavigationColor(menu, 'arrowColorActive'),
        arrowColorActiveHover: requiredNavigationColor(menu, 'arrowColorActiveHover'),
        itemTextColorChildActive: requiredNavigationColor(menu, 'itemTextColorChildActive'),
        itemTextColorChildActiveHover: requiredNavigationColor(
          menu,
          'itemTextColorChildActiveHover',
        ),
        itemIconColorChildActive: requiredNavigationColor(menu, 'itemIconColorChildActive'),
        itemIconColorChildActiveHover: requiredNavigationColor(
          menu,
          'itemIconColorChildActiveHover',
        ),
        arrowColorChildActive: requiredNavigationColor(menu, 'arrowColorChildActive'),
        arrowColorChildActiveHover: requiredNavigationColor(menu, 'arrowColorChildActiveHover'),
      }),
      dropdown: Object.freeze({
        optionColorHover: requiredNavigationColor(dropdown, 'optionColorHover'),
        optionColorActive: requiredNavigationColor(dropdown, 'optionColorActive'),
        optionTextColorActive: requiredNavigationColor(dropdown, 'optionTextColorActive'),
      }),
      childActiveFillPresent,
      childActiveHoverFillPresent,
      sharedDropdownPeer: menu['peers']['Dropdown'] === dropdown,
    })
  } finally {
    if (previousNodeEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = previousNodeEnv
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

function navigationSelectedColorProjection(colors: NavigationThemeColorSnapshot) {
  const { menu, dropdown } = colors
  const primary = colors.palette.roles.primary
  const surface = `var(--pavp-navigation-selected-surface, ${primary.soft.background.default})`
  const foreground = `var(--pavp-navigation-selected-foreground, ${primary.soft.foreground})`
  const childForeground = `var(--pavp-navigation-child-active-foreground, ${primary.soft.foreground})`
  const hover = colors.palette.roles.neutral.soft.background.hover
  return {
    hover: menu.itemColorHover === hover && dropdown.optionColorHover === hover,
    surface:
      menu.itemColorActive === surface &&
      menu.itemColorActiveHover === surface &&
      menu.itemColorActiveCollapsed === surface &&
      dropdown.optionColorActive === surface &&
      colors.sharedDropdownPeer,
    foreground:
      menu.itemTextColorActive === foreground &&
      menu.itemTextColorActiveHover === foreground &&
      menu.itemIconColorActive === foreground &&
      menu.itemIconColorActiveHover === foreground &&
      menu.arrowColorActive === foreground &&
      menu.arrowColorActiveHover === foreground &&
      dropdown.optionTextColorActive === foreground &&
      menu.itemTextColorChildActive === childForeground &&
      menu.itemTextColorChildActiveHover === childForeground &&
      menu.itemIconColorChildActive === childForeground &&
      menu.itemIconColorChildActiveHover === childForeground &&
      menu.arrowColorChildActive === childForeground &&
      menu.arrowColorChildActiveHover === childForeground,
    expandedUnfilled: !colors.childActiveFillPresent && !colors.childActiveHoverFillPresent,
  }
}

function navigationSelectedColorStylesValid(source: string): boolean {
  const parsed = vueSfcCompiler.parse(source, { filename: shellSfcPath })
  if (parsed.errors.length !== 0) return false
  const base = {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    important: false,
  }
  const menuSelector = "[data-pavp-admin-navigation='persistent'] .n-menu"
  const dropdownSelector =
    ".pavp-admin-navigation-dropdown.n-dropdown-menu:has(.n-dropdown-option[aria-current='page'] > .n-dropdown-option-body:not(.n-dropdown-option-body--disabled))"
  const lensSelector = '.pavp-admin-navigation-selection-lens'
  const motionReadySelectedSelector =
    ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content--selected::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content.n-menu-item-content--child-active::before"
  const expected: readonly StyleDeclarationIdentity[] = [
    {
      ...base,
      context: ['@layer vendor-overrides'],
      selector: motionReadySelectedSelector,
      property: 'visibility',
      value: 'hidden',
    },
    {
      ...base,
      context: ['@layer components', '@media (forced-colors: active)'],
      selector: lensSelector,
      property: 'visibility',
      value: 'hidden',
    },
    {
      ...base,
      context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
      selector: motionReadySelectedSelector,
      property: 'visibility',
      value: 'visible',
    },
    {
      ...base,
      context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
      selector: menuSelector,
      property: '--pavp-navigation-selected-surface',
      value: 'var(--ui-color-action-primary)',
    },
    {
      ...base,
      context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
      selector: menuSelector,
      property: '--pavp-navigation-selected-foreground',
      value: 'var(--ui-color-text-on-action)',
    },
    {
      ...base,
      context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
      selector: dropdownSelector,
      property: '--pavp-navigation-selected-surface',
      value: 'var(--ui-color-action-primary)',
    },
    {
      ...base,
      context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
      selector: dropdownSelector,
      property: '--pavp-navigation-selected-foreground',
      value: 'var(--ui-color-text-on-action)',
    },
    {
      ...base,
      context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
      selector: "[data-pavp-admin-navigation='persistent'] .n-menu.n-menu--collapsed",
      property: '--pavp-navigation-child-active-foreground',
      value: 'var(--ui-color-text-on-action)',
    },
    {
      ...base,
      context: [],
      selector:
        "[data-pavp-admin-navigation='persistent'] .n-menu-item-content:not(.n-menu-item-content--selected):not(.n-menu-item-content--child-active):active :where(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header)",
      property: 'color',
      value: 'var(--ui-color-control-primary)',
    },
    {
      ...base,
      context: [],
      selector:
        '.pavp-admin-navigation-dropdown .n-dropdown-option-body:not(.n-dropdown-option-body--active:not(.n-dropdown-option-body--disabled)):active :where(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label)',
      property: 'color',
      value: 'var(--ui-color-control-primary)',
    },
  ]
  const actual: StyleDeclarationIdentity[] = []
  for (const [block, style] of parsed.descriptor.styles.entries()) {
    const compiled = vueSfcCompiler.compileStyle({
      filename: shellSfcPath,
      id: shellSfcScopeId,
      scoped: style.scoped === true,
      source: style.content,
    })
    if (compiled.errors.length !== 0 || compiled.rawResult === undefined) return false
    compiled.rawResult.root.walkDecls((declaration) => {
      const selector = declaration.parent?.selector ?? ''
      const indicatorVisibility =
        declaration.prop === 'visibility' &&
        (normalizedCssSelector(selector) === normalizedCssSelector(lensSelector) ||
          normalizedCssSelector(selector) === normalizedCssSelector(motionReadySelectedSelector))
      if (
        !expected.some(
          (entry) =>
            entry.property !== 'color' &&
            entry.property !== 'visibility' &&
            entry.property === declaration.prop,
        ) &&
        !indicatorVisibility &&
        !(
          declaration.prop === 'color' &&
          selector.includes(':active') &&
          (selector.includes('.n-menu-item-content') ||
            selector.includes('.n-dropdown-option-body'))
        )
      )
        return
      const context: string[] = []
      let ancestor = declaration.parent?.parent
      while (ancestor !== undefined) {
        if (ancestor.type === 'atrule')
          context.unshift(`@${ancestor.name ?? ''} ${ancestor.params ?? ''}`)
        ancestor = ancestor.parent
      }
      actual.push({
        ...base,
        block,
        context,
        selector,
        property: declaration.prop,
        value: declaration.value,
        important: Boolean(declaration.important),
      })
    })
  }
  return isDeepStrictEqual(
    actual.map(styleDeclarationKey).sort(compareCodePoints),
    expected.map(styleDeclarationKey).sort(compareCodePoints),
  )
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

      const expression =
        componentOverride === undefined
          ? undefined
          : objectPropertyInitializer(componentOverride, field)
      const authority =
        component === 'Button' && field === 'paddingMedium'
          ? buttonPaddingAuthority(expression)
          : resolveThemeAuthority(expression, declarations)
      if (authority.authority === 'invalid-button-padding-shape') {
        violations.push('NAIVE_BUTTON_PADDING_SHAPE')
      }
      authorities.set(key, authority)

      if (expectation === undefined) continue

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

  for (const [field, authority] of authorities) {
    if (
      authority.authority === 'interaction.control.height-baseline' &&
      field !== 'common.heightSmall' &&
      field !== 'common.heightMedium'
    )
      violations.push('NAIVE_DENSITY_BASELINE_CONSUMER')
  }

  for (const consumption of naive2452ConsumptionContract) {
    const component = consumption.component
    const semanticFields = [...expectations.keys()]
      .filter((key) => key.startsWith(`${component}.`))
      .map((key) => key.slice(component.length + 1))
    const frozenFields = consumption.fields
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
      duplicateFrozenKeys ||
      invalidFrozenField ||
      !exactSet(frozenOverrideKeys, semanticFields) ||
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

  if (
    !naive2452SharedConsumptionContract.some(
      (record) =>
        record.consumingComponent === 'Button' &&
        record.overrideKey === 'heightSmall' &&
        runtimeString(record.emittedCssVariable) === '--n-height',
    )
  )
    violations.push('NAIVE_2452_CONSUMPTION_CONTRACT')

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
    cssRuleBlocks(styleContent(snapshot.naiveProviderSource)).some(
      (rule) =>
        /\.n-radio-button--focus\b/u.test(rule.selector) &&
        /\b(?:outline|outline-style|outline-width|box-shadow)\s*:\s*(?!none\b|0(?:\s|;|$))[^;]+/u.test(
          rule.declarations,
        ),
    ) ||
    !normalizedProviderSource.includes('box-shadow: var(--ui-admin-shadow-focus-ring);') ||
    !normalizedProviderSource.includes('@media (forced-colors: active)') ||
    !normalizedProviderSource.includes('outline: var(--ui-admin-border-focus);') ||
    !normalizedProviderSource.includes('outline-offset: var(--ui-admin-focus-outline-offset);')
  ) {
    violations.push('NAIVE_FOCUS_PRESENTATION')
  }

  const statusBorders: ts.TemplateExpression[] = []
  const collectStatusBorders = (node: ts.Node): void => {
    if (ts.isTemplateExpression(node)) {
      const authority = resolveThemeAuthority(node, declarations)
      if (
        authority.valueKind === 'border' &&
        /^status\.(?:info|success|warning|error)\.border$/u.test(authority.authority)
      ) {
        statusBorders.push(node)
      }
    }
    ts.forEachChild(node, collectStatusBorders)
  }
  collectStatusBorders(sourceFile)
  let rawVisualSource = snapshot.themeAdapterSource
  for (const expression of statusBorders.sort(
    (left, right) => right.getStart() - left.getStart(),
  )) {
    rawVisualSource = `${rawVisualSource.slice(0, expression.getStart())}''${rawVisualSource.slice(expression.getEnd())}`
  }

  if (
    /#[\da-f]{3,8}\b|\b(?:hsl|hwb|lab|lch|oklab|oklch|rgb)\s*\(|['"][^'"]*\b\d+(?:\.\d+)?(?:ms|s|px|rem)\b[^'"]*['"]|['"][^'"]*(?:\binset\s+|\s+solid\b)[^'"]*['"]/iu.test(
      rawVisualSource,
    )
  ) {
    violations.push('NAIVE_RAW_VISUAL_AUTHORITY')
  }

  const nonShellUiSource = snapshot.nonAdapterUiSource
    .replace(snapshot.shellSource, '')
    .replace(snapshot.uiProviderSource, '')
    // Styles retain exact declaration/context owners in validateVueStyleGuardrails;
    // this text probe covers non-style source, without a second class-prefix ban.
    .replaceAll(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gu, '')
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
    header !== undefined &&
    header.ancestors.every(isStableOwnershipPathNode) &&
    templateDirectives(header.node, 'if').length === 1 &&
    normalizeTemplateExpression(templateDirectives(header.node, 'if')[0]?.exp?.content) ===
      'hasHeader' &&
    ['else-if', 'else', 'show', 'for'].every(
      (name) => templateDirectives(header.node, name).length === 0,
    )
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
      "administration && profile === 'narrow'" &&
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
        ancestor.tag === 'NLayoutSider' ||
        ancestor.tag === 'NMenu' ||
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
      (directive) =>
        normalizeTemplateExpression(directive.exp?.content) ===
        "administration && profile === 'wide'",
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
  if (
    ts.isCallExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === 'isCurrentDestination' &&
    value.arguments.length === 1 &&
    value.arguments[0]?.getText(sourceFile) === routeParameterName
  ) {
    return scenario.currentRoute
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

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'isCurrentDestination' &&
      node.arguments.length === 1 &&
      node.arguments[0]?.getText(sourceFile) === routeParameterName
    )
      activeRoute = true
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    ) {
      primaryButton ||=
        (isEventButton(node.left) && isPrimaryButtonLiteral(node.right)) ||
        (isPrimaryButtonLiteral(node.left) && isEventButton(node.right))
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

  if (
    ts.isCallExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === 'isCurrentDestination' &&
    value.arguments.length === 1 &&
    value.arguments[0] !== undefined &&
    ts.isIdentifier(value.arguments[0]) &&
    value.arguments[0].text === routeParameterName
  )
    return scenario.currentRoute

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
    !shellSource.includes('<NMenu') ||
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
    [...normalNodeSource.matchAll(/tabindex: -1/gu)].length !== 2 ||
    /onKeydown|tabindex: 0/u.test(normalNodeSource)
  ) {
    violations.push('PAVP_RUNTIME_002_KEYBOARD_FOCUS_FORBIDDEN')
  }

  const handler = functionDeclaration(sourceFile, 'preserveCurrentPersistentNavigationFocus')
  const currentDestination = functionDeclaration(sourceFile, 'isCurrentDestination')
  if (
    currentDestination === undefined ||
    !/return props\.navigation\.some\(\(group\) =>\s*group\.items\.some\(\(item\) => item\.routeName === routeName && item\.isCurrentDestination\),?\s*\)/u.test(
      currentDestination.getText(sourceFile),
    )
  ) {
    violations.push(
      'PAVP_RUNTIME_002_CURRENT_ROUTE_NOOP',
      'PAVP_RUNTIME_002_DIFFERENT_ROUTE_DEFAULT',
    )
  }
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
    singleBoundExpression(innerPanel.node, 'aria-label') !== 'copy.navigationLabel' ||
    staticTemplateAttribute(innerPanel.node, 'tabindex') !== '-1' ||
    staticTemplateAttribute(innerPanel.node, 'ref') !== 'drawerNavigation'
  ) {
    violations.push('PAVP_RUNTIME_003_DIALOG_SEMANTICS')
  }

  const mainElements = shellElements.filter(
    (element) =>
      element.node.tag === 'div' &&
      singleBoundExpression(element.node, 'role') === "enabled ? 'main' : undefined",
  )
  const mainInertBindings =
    mainElements[0] === undefined ? [] : templateDirectives(mainElements[0].node, 'bind', 'inert')
  if (
    mainElements.length !== 1 ||
    mainInertBindings.length !== 1 ||
    normalizeTemplateExpression(mainInertBindings[0]?.exp?.content) !==
      "administration && profile === 'narrow' && navigationOpen"
  ) {
    violations.push('PAVP_RUNTIME_003_MAIN_INERT')
  }

  if (
    /\.focus\s*\(/u.test(shellScript) ||
    !shellScript.includes("if (event.key === 'Escape')") ||
    !snapshot.shellSource.includes('@click="closeNavigation"') ||
    !snapshot.shellSource.includes('@keydown="handleDrawerKeydown"')
  ) {
    violations.push('PAVP_RUNTIME_003_NO_FOCUS_TRANSFER')
  }

  if (
    runtime002NavigationViolations(snapshot.shellSource).length > 0 ||
    !snapshot.shellSource.includes('v-if="administration && profile !== \'narrow\'"') ||
    !snapshot.shellSource.includes('<NMenu') ||
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
  const contentDeclarations = cssDeclarationsForSelector(rules, '.pavp-admin-shell__drawer-content')

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
      overflow: 'hidden',
      background: 'var(--ui-material-overlay-background)',
      'box-shadow': 'var(--ui-admin-shadow-overlay)',
    }) ||
    !snapshot.shellSource.includes('owner-id="architecture-console-drawer"') ||
    !contentDeclarations?.includes('var(--pavp-safe-area-top)') ||
    !contentDeclarations.includes('var(--pavp-safe-area-bottom)') ||
    !contentDeclarations.includes('var(--pavp-safe-area-left)') ||
    !contentDeclarations.includes('var(--pavp-safe-area-right)')
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
    runtimeNumber(routeRegistry.length) !== 13 ||
    runtimeNumber(runtimeKernelConsoleProjection.stepCount) !== 15 ||
    !isDeepStrictEqual(runtimeKernelConsoleProjection.activeProviderIds, ['pinia', 'appearance']) ||
    runtimeNumber(storageConsoleProjection.recordCount) !== 8 ||
    runtimeNumber(designSystemConsoleProjection.builtInThemeIds.length) !== 5
  ) {
    violations.push('PAVP_RUNTIME_003_PRESERVED_AUTHORITIES')
  }

  return [...new Set(violations)]
}

function nativeNavigationCollapseProjection(source: string): boolean {
  const template = vueSfcCompiler.parse(source, { filename: shellSfcPath }).descriptor.template?.ast
  if (template === undefined) return false
  const owners = collectShellTemplateElements(template).filter(
    ({ node }) => node.tag === 'NLayoutSider' || node.tag === 'NMenu',
  )
  return (
    owners.length === 2 &&
    owners.every(
      ({ node }) => singleBoundExpression(node, 'collapsed') === 'persistentNavigationCollapsed',
    )
  )
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
    navigationIconRecords.some((icon) => !shellNavigationIconClasses.includes(icon)) ||
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
    /function\s+navigate\s*\([^)]*\)\s*:\s*void\s*\{[\s\S]*?if\s*\(\s*profile\.value\s*===\s*'narrow'\s*&&\s*navigationOpen\.value\s*\)\s*\{\s*closeNavigation\(\)\s*\}[\s\S]*?if\s*\(\s*isCurrentDestination\(routeName\)\s*\)\s*\{\s*return\s*\}[\s\S]*?emit\(\s*'navigate'\s*,\s*routeName\s*\)/u.test(
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

  const namedWorkbenchVendorSelectors = new Set([
    '.wb-theme-option.n-button',
    '.wb-theme-option .n-button__content',
    '.wb-section-link.n-button',
    '.wb-settings-dock.n-button',
    ".wb-settings-dock.n-button[data-collapsed='true']",
    "[data-layout-profile='regular'] .wb-section-link.n-button, [data-layout-profile='wide'] .wb-section-link.n-button",
  ])
  const ordinaryPageSource = snapshot.pageVisualSource.replace(
    /<style data-pavp-owner="workbench">([\s\S]*?)<\/style>/gu,
    (_block, css: string) =>
      css.replace(/([^{}]+)\{([^{}]*)\}/gu, (rule: string, selector: string) =>
        namedWorkbenchVendorSelectors.has(selector.replace(/\s+/gu, ' ').trim())
          ? rule.replace(selector, selector.replace(/\.n-[a-z0-9_-]+/giu, ''))
          : rule,
      ),
  )
  if (/\.n-[a-z0-9_-]+/iu.test(ordinaryPageSource)) {
    violations.push('VENDOR_SELECTOR_IN_PAGE')
  }
  if (
    !isDeepStrictEqual(snapshot.errorTitles, [
      ['route-title.error-invalid-route-input', '地址无效'],
      ['route-title.error-authentication-required', '需要身份认证'],
      ['route-title.error-permission-denied', '访问被拒绝'],
      ['route-title.error-route-not-found', '未找到页面'],
      ['route-title.error-application-route-failure', '页面不可用'],
      ['route-title.error-network-unavailable', '当前离线'],
      ['route-title.error-service-unavailable', '服务不可用'],
    ])
  ) {
    violations.push('ENGLISH_ERROR_TITLE')
  }

  return violations
}

function currentWorkStatusViolations(architectureSource: string): string[] {
  const statusEnd = architectureSource.indexOf('\n---\n')
  const status = statusEnd < 0 ? architectureSource : architectureSource.slice(0, statusEnd)
  const read = (text: string, field: string): readonly string[] =>
    [...text.matchAll(new RegExp('^' + field + '[ \\t]*=[ \\t]*([^\\r\\n]+)$', 'gmu'))].map(
      (match) => match[1]?.trim() ?? '',
    )
  const work = read(status, 'CURRENT_BOUNDED_WORK')
  const authority = read(status, 'CURRENT_BOUNDED_WORK_AUTHORITY')
  if (
    work.length !== 1 ||
    authority.length !== 1 ||
    read(architectureSource, 'CURRENT_BOUNDED_WORK').length !== 1 ||
    read(architectureSource, 'CURRENT_BOUNDED_WORK_AUTHORITY').length !== 1
  )
    return ['CURRENT_WORK_AUTHORITY']
  const id = work[0]
  const owner = authority[0]
  if (id === 'NONE') return owner === 'NONE' ? [] : ['CURRENT_WORK_AUTHORITY']
  const records = [
    ...architectureSource.matchAll(/^#{3,6} \x60([^\x60]+)\x60 scoped admission record[ \t]*$/gmu),
  ].filter((match) => match[1] === id)
  const record = records[0]
  if (records.length !== 1 || record?.index === undefined || owner === undefined)
    return ['CURRENT_WORK_ADMISSION']
  const precedingSections = [
    ...architectureSource.slice(0, record.index).matchAll(/^#{1,6} ([\dA-Z.]+) /gmu),
  ]
  const section = precedingSections.at(-1)?.[1]?.replace(/\.$/u, '')
  if (section === undefined || owner !== 'ARCHITECTURE_SECTION_' + section.replaceAll('.', '_'))
    return ['CURRENT_WORK_AUTHORITY']
  const start = architectureSource.indexOf('\n\x60\x60\x60text\n', record.index + record[0].length)
  const end = architectureSource.indexOf('\n\x60\x60\x60', start + 1)
  if (start < 0 || end < 0) return ['CURRENT_WORK_ADMISSION']
  const preamble = architectureSource.slice(record.index + record[0].length, start)
  if (/^#{1,6}[ \t]/mu.test(preamble)) return ['CURRENT_WORK_ADMISSION']
  const admission = architectureSource.slice(start, end)
  const required = [
    'ID',
    'AUTHORITY',
    'IMPLEMENTATION_AUTHORIZATION',
    'REPOSITORY_IMPLEMENTATION',
    'STATIC_VERIFICATION',
    'ALLOWED_SCOPE',
    'PROHIBITED_SCOPE',
    'MACHINE_GATES',
  ]
  if (
    required.some((field) => {
      const values = read(admission, field)
      return values.length !== 1 || values[0]?.length === 0
    }) ||
    read(admission, 'ID')[0] !== id ||
    read(admission, 'AUTHORITY')[0] !== owner
  )
    return ['CURRENT_WORK_ADMISSION']
  if (
    !/^OWNER_APPROVED(?:_[A-Z0-9]+)*$/u.test(
      read(admission, 'IMPLEMENTATION_AUTHORIZATION')[0] ?? '',
    )
  )
    return ['CURRENT_WORK_IMPLEMENTATION_AUTHORIZATION']
  return []
}

function runCurrentWorkAuthorityProbes(architectureSource: string): void {
  const reject = (candidate: string): void => {
    if (currentWorkStatusViolations(candidate).length === 0)
      throw new Error('Current Work must reject missing, duplicate or unbound authority.')
  }
  reject(architectureSource.replace(/^CURRENT_BOUNDED_WORK=.*$/mu, ''))
  reject(
    architectureSource.replace(
      /^CURRENT_BOUNDED_WORK_AUTHORITY=.*$/mu,
      'CURRENT_BOUNDED_WORK_AUTHORITY=ARCHITECTURE_SECTION_0',
    ),
  )
  reject(architectureSource.replace(/^CURRENT_BOUNDED_WORK=(.*)$/mu, '$&\n$&'))
  reject(
    architectureSource.replace(
      /^CURRENT_BOUNDED_WORK=.*$/mu,
      'CURRENT_BOUNDED_WORK=UNREGISTERED_WORK',
    ),
  )
  const currentId = /^CURRENT_BOUNDED_WORK=([^\r\n]+)$/mu.exec(architectureSource)?.[1]
  const admissionHeading = [
    ...architectureSource.matchAll(/^#{3,6} \x60([^\x60]+)\x60 scoped admission record[ \t]*$/gmu),
  ].find((match) => match[1] === currentId)
  if (admissionHeading?.index !== undefined) {
    const split = admissionHeading.index + admissionHeading[0].length
    reject(
      architectureSource.slice(0, split) +
        '\n\n## Unrelated section\n' +
        architectureSource.slice(split),
    )
  }
  const editableHistory = architectureSource.replaceAll(
    'OWNER_ACCEPTANCE_STATEMENT=',
    'Historical Owner statement: ',
  )
  if (currentWorkStatusViolations(editableHistory).length !== 0)
    throw new Error('Historical narrative must not own Current Work.')

  const authorizationProbe = `CURRENT_BOUNDED_WORK=BOUNDED_IMPLEMENTATION
CURRENT_BOUNDED_WORK_AUTHORITY=ARCHITECTURE_SECTION_7_1
---
## 7.1 Bounded implementation
### \x60BOUNDED_IMPLEMENTATION\x60 scoped admission record

\x60\x60\x60text
ID=BOUNDED_IMPLEMENTATION
AUTHORITY=ARCHITECTURE_SECTION_7_1
IMPLEMENTATION_AUTHORIZATION=OWNER_APPROVED
REPOSITORY_IMPLEMENTATION=IN_PROGRESS
STATIC_VERIFICATION=NOT_RUN
ALLOWED_SCOPE=existing owner
PROHIBITED_SCOPE=unrelated work
MACHINE_GATES=existing checks
\x60\x60\x60
`
  for (const authorization of ['OWNER_APPROVED', 'OWNER_APPROVED_SOURCE_ONLY']) {
    if (
      currentWorkStatusViolations(
        authorizationProbe.replace('=OWNER_APPROVED', '=' + authorization),
      ).length !== 0
    )
      throw new Error('Current Work must accept explicit Owner approval with bounded scope.')
  }
  const topLevelProbe = authorizationProbe
    .replaceAll('SECTION_7_1', 'SECTION_20')
    .replace('## 7.1 Bounded', '# 20. Bounded')
  if (currentWorkStatusViolations(topLevelProbe).length !== 0)
    throw new Error('Current Work must accept a top-level section with heading punctuation.')
  reject(topLevelProbe.replaceAll('SECTION_20', 'SECTION_20_1'))
  for (const authorization of ['NOT_AUTHORIZED', 'NONE', 'PENDING_OWNER_APPROVAL', 'UNKNOWN']) {
    const candidate = authorizationProbe.replace('=OWNER_APPROVED', '=' + authorization)
    if (
      !currentWorkStatusViolations(candidate).includes('CURRENT_WORK_IMPLEMENTATION_AUTHORIZATION')
    )
      throw new Error('Current Work must reject implementation without explicit Owner approval.')
  }
}

function readMotionPolicy(
  source: string,
  mode: 'full' | 'reduced' | 'none',
): JsonObject | undefined {
  try {
    const exports: Record<string, unknown> = {}
    const output = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    runInNewContext(output, { exports, module: { exports } })
    const factory = exports['projectMotionPolicy']
    if (typeof factory !== 'function') return undefined
    const policy: unknown = JSON.parse(
      JSON.stringify(Reflect.apply(factory, undefined, [mode, true])),
    )
    return isJsonObject(policy) ? policy : undefined
  } catch {
    return undefined
  }
}

function adminNavigationMotionVueSelectionLensSourceInvariantResults(
  snapshot: AdminNavigationNativeSourceSnapshot,
): readonly Readonly<{ code: string; passed: boolean }>[] {
  const fullPolicy = readMotionPolicy(snapshot.motionPolicySource, 'full')
  const reducedPolicy = readMotionPolicy(snapshot.motionPolicySource, 'reduced')
  const nonePolicy = readMotionPolicy(snapshot.motionPolicySource, 'none')
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
    snapshot.motionPolicySource,
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
          "import { LayoutGroup, LazyMotion, MotionConfig, mountedStates, type domMax } from 'motion-v'",
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
        runtimeLoadSource.indexOf('loadMotionDomMax()') >
          runtimeLoadSource.indexOf('await nextTick()') &&
        !/import\s*\{\s*domMax\s*\}\s*from\s*['"]motion-v['"]/u.test(snapshot.motionRuntimeSource),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_FULL_PROFILE',
      passed:
        isDeepStrictEqual(fullPolicy?.['navigationTransition'], {
          layout: { type: 'spring', visualDuration: 0.26, bounce: 0.16, delay: 0 },
        }) &&
        fullPolicy?.['movement'] === true &&
        fullPolicy['reducedMotion'] === 'user' &&
        fullPolicy['skipAnimations'] === false &&
        /(?:transition:\s*[\w.]+\.navigationTransition|projectMotionPolicy\('full'\)\.navigationTransition)/u.test(
          lensScript,
        ) &&
        lensTemplate.includes(':reduced-motion="policy.reducedMotion"') &&
        lensTemplate.includes(':skip-animations="policy.skipAnimations"'),
    },
    {
      code: 'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      passed:
        normalizedLensScript.includes('policy.value.movement && props.isOwner(option)') &&
        reducedPolicy?.['movement'] === false &&
        reducedPolicy['reducedMotion'] === 'always' &&
        reducedPolicy['skipAnimations'] === false &&
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
        nonePolicy?.['movement'] === false &&
        nonePolicy['reducedMotion'] === 'always' &&
        nonePolicy['skipAnimations'] === true &&
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
        /onBeforeUnmount\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\.dispose\([\s\S]*?\bdispose\(\)/u.test(
          lensScript,
        ) &&
        snapshot.motionRuntimeSource.includes('runtimeState.disposed = true') &&
        exactOccurrenceCount(snapshot.motionRuntimeSource, 'if (isDisposed())') === 2 &&
        runtimeLoadSource.indexOf('if (isDisposed())') <
          runtimeLoadSource.indexOf('const loadedFeatures = await loadMotionDomMax()') &&
        runtimeLoadSource.lastIndexOf('if (isDisposed())') >
          runtimeLoadSource.indexOf('const loadedFeatures = await loadMotionDomMax()') &&
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
        !/AdminNavigationSelectionLens|motion-feature-runtime|admin-navigation-dom-max/u.test(
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
        selectionLensDeclarations.includes('border-radius: var(--ui-radius-control);') &&
        selectionLensDeclarations.includes('background: var(--n-item-color-active);') &&
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
        exactOccurrenceCount(shellTemplate, '<NMenu') === 1 &&
        shellTemplate.includes(':options="navigationMenuOptions"') &&
        shellTemplate.includes(':value="activeRouteName"') &&
        !/<NMenu[\s\S]*?:key=/u.test(
          shellTemplate.slice(
            shellTemplate.indexOf('<NMenu'),
            shellTemplate.indexOf('/>', shellTemplate.indexOf('<NMenu')),
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
        snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
        navigationSelectedColorProjection(snapshot.navigationColors).hover &&
        navigationSelectedColorProjection(snapshot.navigationColors).surface,
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
        exactOccurrenceCount(shellTemplate, '<NLayoutSider') === 1 &&
        exactOccurrenceCount(shellTemplate, '<NMenu') === 1 &&
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
        snapshot.checkBundleSource.includes('const expectedDynamicRootCount = 23') &&
        snapshot.architectureSource.includes(
          'CURRENT_BOUNDED_WORK=PAVP_DEVELOPER_WORKBENCH_RECONSTRUCTION',
        ) &&
        snapshot.routeCount === 13 &&
        snapshot.runtimeKernelStepCount === 15 &&
        snapshot.activeProviderIds.join(',') === 'pinia,appearance' &&
        snapshot.storageRecordCount === 8,
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
        motionPolicySource: baseline.motionPolicySource.replace(
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
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transition-duration',
          'var(--ui-motion-duration)',
          'calc(var(--ui-motion-duration) * 2)',
        ),
      },
    ],
    [
      'admin-navigation-motion-vue-removes-none-branch',
      'ADMIN_NAV_MOTION_VUE_NONE_PROFILE',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transition',
          'none',
          'opacity var(--ui-motion-duration)',
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
          /\nonBeforeUnmount\(\(\) => \{[\s\S]*?\}\)\n/u,
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
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          '.pavp-admin-navigation-selection-lens',
          'pointer-events',
          'none',
          'auto',
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

  const probes: readonly [string, string, AdminNavigationNativeSourceSnapshot][] = [
    [
      'admin-navigation-reduced-crossfade-renders-motion-lens',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        motionSelectionLensSource: baseline.motionSelectionLensSource.replace(
          'policy.value.movement && props.isOwner(option)',
          'props.isOwner(option)',
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-restores-raw-point-one-duration',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transition-duration',
          'var(--ui-motion-duration)',
          '0.1s',
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-restores-half-duration',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transition-duration',
          'var(--ui-motion-duration)',
          'calc(var(--ui-motion-duration) / 2)',
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-adds-transform-scale',
      'ADMIN_NAV_MOTION_VUE_REDUCED_PROFILE',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transform',
          'none',
          'scale(0.98)',
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
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          ".pavp-admin-shell[data-navigation-collapsed='false'] [data-pavp-admin-navigation-motion-ready='true'] .n-menu-item-content--selected::before",
          'visibility',
          'hidden',
          'visible',
        ),
      },
    ],
    [
      'admin-navigation-reduced-crossfade-allows-none-transition',
      'ADMIN_NAV_MOTION_VUE_NONE_PROFILE',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transition',
          'none',
          'opacity var(--ui-motion-duration)',
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

function validateProductExperienceReworkStatus(architectureSource: string): readonly string[] {
  const status = architectureSource.slice(0, architectureSource.indexOf('\n---\n'))
  const required = [
    'PAVP_ARCHITECTURE_ADMIN_CONSOLE_CAPABILITY_STATUS=ACTIVE',
    'ADMIN_CONSOLE_OVERALL_RUNTIME_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'ADMIN_CONSOLE_OVERALL_VISUAL_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'ADMIN_CONSOLE_OVERALL_ACCESSIBILITY_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
    'ADMIN_CONSOLE_OVERALL_RELEASE_ACCEPTANCE=REVOKED_BY_EXACT_COMMIT_RUNTIME_AUDIT',
  ]
  runCurrentWorkAuthorityProbes(architectureSource)
  return [
    ...required
      .filter((field) => !status.split(/\r?\n/u).includes(field))
      .map(() => 'Architecture Admin Console current acceptance status drifted.'),
    ...currentWorkStatusViolations(architectureSource),
  ]
}

function materialGateViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = [
    ...shellExperienceViolations(snapshot),
    ...naiveThemeStateViolations(snapshot),
  ]
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
  const publicThemeOverrides = themeOverrideObject(snapshot.themeAdapterSource)
  if (
    publicThemeOverrides === undefined ||
    objectPropertyObject(publicThemeOverrides, 'Button') === undefined
  ) {
    violations.push('MISSING_NAIVE_OVERRIDE')
  }
  if (naiveCommonParserSensitiveOverrides(snapshot.themeAdapterSource).length > 0) {
    violations.push('NAIVE_COMMON_PARSER_INPUT')
  }
  if (
    /#[\da-f]{3,8}\b(?![-\w])|\b(?:hsl|hwb|lab|lch|oklab|oklch|rgb)\s*\(/iu.test(
      snapshot.pageVisualSource,
    ) ||
    /\b(?:backdrop-filter|filter)\s*:|\b(?:blur|brightness|saturate)\s*\(/iu.test(
      snapshot.pageVisualSource,
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
  if (snapshot.routeCount !== 13) {
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
        !snapshot.publicComponentExports.includes(record.exportName) ||
        (['UiForm', 'UiFormField'].includes(record.exportName)
          ? record.capabilityStatus !== 'TARGET_INACTIVE' || record.consumerCount !== 0
          : record.capabilityStatus !== 'ACTIVE' || record.consumerCount === 0),
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

  const shell = vueSfcCompiler.parse(snapshot.shellSource, { filename: shellSfcPath })
  const shellDefaultSlots =
    shell.descriptor.template?.ast === undefined
      ? []
      : collectShellTemplateElements(shell.descriptor.template.ast).filter(
          (element) =>
            element.node.tag === 'slot' &&
            staticTemplateAttribute(element.node, 'name') === undefined,
        )
  if (
    shell.errors.length !== 0 ||
    shellDefaultSlots.length !== 1 ||
    shellDefaultSlots.some((slot) =>
      [...slot.ancestors, slot.node].some(
        (node) => hasTemplateKey(node) || hasRouteConditional(node),
      ),
    )
  )
    violations.push('PAVP_RUNTIME_005_REMOUNT_WRAPPER')

  const appElements = collectShellTemplateElements(appTemplateRoot)
  const consoleFrameElements = collectShellTemplateElements(consoleFrameTemplateRoot)
  const routerViews = appElements.filter((element) => element.node.tag === 'RouterView')
  const routeHosts = appElements.filter((element) =>
    hasStaticTemplateClass(element.node, 'pavp-route-content'),
  )
  const routedComponents = appElements.filter(
    (element) => element.node.tag === 'WorkspaceRetentionHost',
  )
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
    adminShells.some(
      (element) =>
        hasRouteConditional(element.node) ||
        element.ancestors.some(hasRouteConditional) ||
        boundTemplateExpression(element.node, 'composition') !== 'composition',
    ) ||
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
    const forbiddenWrapperTags = new Set(['Suspense', 'Transition', 'TransitionGroup'])
    const routeSlotExpressions = templateDirectives(routerView.node, 'slot').map((directive) =>
      normalizeTemplateExpression(directive.exp?.content),
    )
    if (
      !routeHost.ancestors.includes(routerView.node) ||
      !routedComponent.ancestors.includes(routeHost.node) ||
      routerElementChildren.length !== 1 ||
      routerElementChildren[0] !== routeHost.node ||
      hostElementChildren.length !== 1 ||
      hostElementChildren[0] !== routedComponent.node ||
      routeSlotExpressions.length !== 1 ||
      !/\bComponent\b/u.test(routeSlotExpressions[0] ?? '') ||
      boundTemplateExpression(routedComponent.node, 'component') !== 'Component' ||
      boundTemplateExpression(routedComponent.node, 'controller') === undefined ||
      boundTemplateExpression(routedComponent.node, 'snapshot') === undefined ||
      appElements.some((element) => ['KeepAlive', 'component'].includes(element.node.tag ?? ''))
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

  const retention = ts.createSourceFile(
    'workspace-retention.ts',
    snapshot.workspaceRetentionSource,
    ts.ScriptTarget.Latest,
    true,
  )
  let addsOutletOrLayout = false
  let addsRouteTransition = false
  const vueRenderImports = new Set<string>()
  const vueComponentImports = new Set<string>()
  const nativeRenderCalls: ts.CallExpression[] = []
  const retentionCalls: ts.CallExpression[] = []
  for (const statement of retention.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const bindings = statement.importClause?.namedBindings
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue
    for (const binding of bindings.elements) {
      const imported = binding.propertyName?.text ?? binding.name.text
      if (statement.moduleSpecifier.text === 'vue' && imported === 'h')
        vueRenderImports.add(binding.name.text)
      if (statement.moduleSpecifier.text === 'vue' && imported === 'defineComponent')
        vueComponentImports.add(binding.name.text)
      if (statement.moduleSpecifier.text === 'vue-router' && imported === 'RouterView')
        addsOutletOrLayout = true
      if (['Transition', 'TransitionGroup', 'Suspense'].includes(imported))
        addsRouteTransition = true
    }
  }
  function inspectRetentionBoundary(node: ts.Node): void {
    if (ts.isCallExpression(node)) retentionCalls.push(node)
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      vueRenderImports.has(node.expression.text) &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    )
      nativeRenderCalls.push(node)
    ts.forEachChild(node, inspectRetentionBoundary)
  }
  inspectRetentionBoundary(retention)

  // Only the admitted section/h1/p fallback is native DOM in this otherwise hostless owner.
  // Inline and shared render functions are equivalent; no private helper name is normative.
  const isNativeCall = (node: ts.Node | undefined, tag: string): node is ts.CallExpression =>
    node !== undefined &&
    ts.isCallExpression(node) &&
    nativeRenderCalls.includes(node) &&
    node.arguments[0] !== undefined &&
    ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === tag
  const isOwnRenderCall = (call: ts.CallExpression): boolean => {
    for (let node: ts.Node = call.parent; !ts.isSourceFile(node); node = node.parent) {
      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        if (!ts.isReturnStatement(node.parent)) return false
        for (let owner: ts.Node = node.parent; !ts.isSourceFile(owner); owner = owner.parent) {
          if (
            ts.isCallExpression(owner) &&
            ts.isIdentifier(owner.expression) &&
            vueComponentImports.has(owner.expression.text)
          )
            return true
        }
        return false
      }
      if (ts.isFunctionDeclaration(node)) return false
    }
    return false
  }
  const fallbackRoots = nativeRenderCalls.filter((call) => isNativeCall(call, 'section'))
  const allowedFallbackCalls = new Set<ts.CallExpression>()
  const boundaryRenderCalls = new Set<ts.CallExpression>()
  let fallbackStructureValid = fallbackRoots.length > 0
  for (const root of fallbackRoots) {
    const children = root.arguments[2]
    const props = root.arguments[1]
    const heading =
      children !== undefined && ts.isArrayLiteralExpression(children)
        ? children.elements[0]
        : undefined
    const description =
      children !== undefined && ts.isArrayLiteralExpression(children)
        ? children.elements[1]
        : undefined
    const headingProps =
      heading !== undefined && ts.isCallExpression(heading) ? heading.arguments[1] : undefined
    const headingTabIndex =
      headingProps !== undefined && ts.isObjectLiteralExpression(headingProps)
        ? objectPropertyInitializer(headingProps, 'tabindex')
        : undefined
    const structureValid =
      children !== undefined &&
      ts.isArrayLiteralExpression(children) &&
      children.elements.length === 2 &&
      props !== undefined &&
      ts.isObjectLiteralExpression(props) &&
      objectPropertyInitializer(props, 'role')?.getText() === "'alert'" &&
      objectPropertyInitializer(props, 'aria-live')?.getText() === "'assertive'" &&
      !props.properties.some((property) =>
        ['id', 'style', 'data-scroll-owner'].includes(objectPropertyName(property) ?? ''),
      ) &&
      isNativeCall(heading, 'h1') &&
      isNativeCall(description, 'p') &&
      headingProps !== undefined &&
      ts.isObjectLiteralExpression(headingProps) &&
      objectPropertyInitializer(headingProps, 'data-route-focus') !== undefined &&
      headingTabIndex !== undefined &&
      ts.isPropertyAccessExpression(headingTabIndex) &&
      headingTabIndex.name.text === 'targetTabIndex'
    if (!structureValid || !ts.isCallExpression(heading) || !ts.isCallExpression(description)) {
      fallbackStructureValid = false
      continue
    }
    allowedFallbackCalls.add(root)
    allowedFallbackCalls.add(heading)
    allowedFallbackCalls.add(description)
    if (isOwnRenderCall(root)) {
      boundaryRenderCalls.add(root)
      continue
    }
    let owner: ts.Node = root.parent
    while (
      !ts.isSourceFile(owner) &&
      !ts.isFunctionDeclaration(owner) &&
      !ts.isArrowFunction(owner) &&
      !ts.isFunctionExpression(owner)
    )
      owner = owner.parent
    const ownerName = ts.isFunctionDeclaration(owner)
      ? owner.name
      : !ts.isSourceFile(owner) &&
          ts.isVariableDeclaration(owner.parent) &&
          ts.isIdentifier(owner.parent.name)
        ? owner.parent.name
        : undefined
    const calls = retentionCalls.filter(
      (call) =>
        ownerName !== undefined &&
        ts.isIdentifier(call.expression) &&
        call.expression.text === ownerName.text,
    )
    if (calls.length === 0 || !calls.every(isOwnRenderCall)) fallbackStructureValid = false
    for (const call of calls) boundaryRenderCalls.add(call)
  }
  if (boundaryRenderCalls.size !== 2) fallbackStructureValid = false
  if (!fallbackStructureValid) violations.push('PAGE_COMPONENT_FALLBACK_STRUCTURE')
  if (nativeRenderCalls.some((call) => !fallbackStructureValid || !allowedFallbackCalls.has(call)))
    addsOutletOrLayout = true
  if (addsOutletOrLayout) violations.push('PAVP_RUNTIME_005_ROUTE_COMPONENT_CONTRACT')
  if (addsRouteTransition) violations.push('PAVP_RUNTIME_005_REMOUNT_WRAPPER')

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
  const allMotionStyle = [
    snapshot.appStylesSource,
    shellStyle,
    styleContent(snapshot.pageVisualSource),
    styleContent(snapshot.naiveProviderSource),
  ].join('\n')
  const allGeometryRules = cssRuleBlocks([snapshot.appStylesSource, shellStyle].join('\n'))
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

  if (
    !snapshot.shellSource.includes('.pavp-admin-shell__navigation-action::after') ||
    !snapshot.shellSource.includes(
      'transform: translateX(calc(var(--ui-layout-admin-drawer-maximum-inline-size) * -1));',
    )
  )
    violations.push('LOCAL_MOTION_CONTRACT')

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
  const routedComponentBlock =
    /<WorkspaceRetentionHost\b[\s\S]*?\/>/u.exec(baseline.appTemplateSource)?.[0] ?? ''
  const transitionWrappedComponentBlock = `<Transition mode="out-in">${routedComponentBlock}</Transition>`
  const probes: readonly [string, string, Partial<MaterialGateSnapshot>][] = [
    [
      'page-fallback-adds-second-main',
      'PAVP_RUNTIME_005_ROUTE_COMPONENT_CONTRACT',
      {
        workspaceRetentionSource: baseline.workspaceRetentionSource.replace(
          /h\(\s*'section'/u,
          "h('main'",
        ),
      },
    ],
    [
      'page-fallback-adds-retry-button',
      'PAGE_COMPONENT_FALLBACK_STRUCTURE',
      {
        workspaceRetentionSource: baseline.workspaceRetentionSource.replace(
          /h\(\s*'p'/u,
          "h('button'",
        ),
      },
    ],
    [
      'page-fallback-removes-route-heading',
      'PAGE_COMPONENT_FALLBACK_STRUCTURE',
      {
        workspaceRetentionSource: baseline.workspaceRetentionSource.replace(
          "'data-route-focus':",
          "'data-unowned-heading':",
        ),
      },
    ],
    [
      'retention-adds-native-layout-outside-fallback',
      'PAVP_RUNTIME_005_ROUTE_COMPONENT_CONTRACT',
      {
        workspaceRetentionSource: `${baseline.workspaceRetentionSource}\nh('div', { 'data-scroll-owner': 'unowned' })`,
      },
    ],
    [
      'runtime-005-route-host-key-restored',
      'PAVP_RUNTIME_005_ROUTE_HOST_KEY',
      {
        appTemplateSource: baseline.appTemplateSource.replace(
          'class="pavp-route-content"',
          ':key="routeRecord.name" class="pavp-route-content"',
        ),
      },
    ],
    [
      'runtime-005-routed-component-key-added',
      'PAVP_RUNTIME_005_COMPONENT_KEY',
      {
        appTemplateSource: baseline.appTemplateSource.replace(
          '<WorkspaceRetentionHost',
          '<WorkspaceRetentionHost :key="routeRecord.name"',
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
          'class="pavp-route-content"',
          'v-if="Component" class="pavp-route-content"',
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

function buttonPaddingLexicalViolations(baseline: MaterialGateSnapshot): string[] {
  const source = baseline.themeAdapterSource
  const overrides = themeOverrideObject(source)
  const button = overrides === undefined ? undefined : objectPropertyObject(overrides, 'Button')
  const padding =
    button === undefined ? undefined : objectPropertyInitializer(button, 'paddingMedium')
  if (padding === undefined) return ['Button padding lexical probes require the existing field.']
  let projection: ts.Node = padding
  while (!ts.isFunctionDeclaration(projection) && !ts.isSourceFile(projection)) {
    projection = projection.parent
  }
  if (
    !ts.isFunctionDeclaration(projection) ||
    projection.body === undefined ||
    projection.parameters[0] === undefined
  ) {
    return ['Button padding lexical probes require the existing projection function.']
  }

  const paddingStart = padding.getStart()
  const paddingEnd = padding.end
  const body = projection.body.getStart() + 1
  const moduleStart = projection.getStart()
  const parameter = projection.parameters[0].getStart()
  const canonical = "`0 ${tokens['spacing.button.inline']}`"
  const alias = `\nconst paddingAlias = ${canonical}\n`
  const unrelated =
    "\nfunction unrelatedPaddingScope() { const paddingAlias = 'unrelated'; return paddingAlias }\n"
  function changedSource(
    expression: string,
    ...insertions: readonly (readonly [number, string])[]
  ): string {
    const edits: [number, number, string][] = [
      [paddingStart, paddingEnd, expression],
      ...insertions.map(([position, text]): [number, number, string] => [position, position, text]),
    ]
    return edits
      .sort(([left], [right]) => right - left)
      .reduce(
        (text, [start, end, replacement]) => text.slice(0, start) + replacement + text.slice(end),
        source,
      )
  }

  const cases: readonly [string, string, boolean][] = [
    ['direct', changedSource(canonical), true],
    ['local-alias', changedSource('paddingAlias', [body, alias]), true],
    [
      'unrelated-before',
      changedSource('paddingAlias', [body, alias], [moduleStart, unrelated]),
      true,
    ],
    [
      'unrelated-after',
      changedSource('paddingAlias', [body, alias], [projection.end, unrelated]),
      true,
    ],
    ['module-alias', changedSource('paddingAlias', [moduleStart, alias]), true],
    [
      'block-alias',
      changedSource('paddingAlias', [body, `\n{${alias}`], [projection.body.end - 1, '}\n']),
      true,
    ],
    [
      'alias-chain-parentheses',
      changedSource(
        '(paddingAlias)',
        [moduleStart, "const inlineAlias = tokens['spacing.button.inline']\n"],
        [
          body,
          '\nconst secondAlias = (inlineAlias)\nconst paddingAlias = (`0 ${(secondAlias)}`)\n',
        ],
      ),
      true,
    ],
    [
      'nearest-constant-shadow',
      changedSource(
        'paddingAlias',
        [moduleStart, alias],
        [body, "\nconst paddingAlias = 'unrelated'\n"],
      ),
      false,
    ],
    [
      'nearest-mutable-shadow',
      changedSource(
        'paddingAlias',
        [moduleStart, alias],
        [body, "\nlet paddingAlias = 'unrelated'\n"],
      ),
      false,
    ],
    [
      'parameter-shadow',
      changedSource('paddingAlias', [moduleStart, alias], [parameter, 'paddingAlias: string, ']),
      false,
    ],
    [
      'local-tokens-object',
      changedSource(canonical, [
        body,
        "\nconst tokens = { 'spacing.button.inline': 'unrelated' }\n",
      ]),
      false,
    ],
    [
      'tokens-parameter',
      changedSource(canonical, [parameter, 'tokens: Record<string, string>, ']),
      false,
    ],
    [
      'wrong-token-import',
      changedSource(canonical).replace(
        "} from '@platform/design-system'",
        "} from 'unrelated-package'",
      ),
      false,
    ],
    [
      'type-only-token-import',
      changedSource(canonical).replace('  tokens,', '  type tokens,'),
      false,
    ],
    [
      'circular-alias-chain',
      changedSource('paddingAlias', [
        body,
        '\nconst paddingAlias = otherAlias\nconst otherAlias = paddingAlias\n',
      ]),
      false,
    ],
    ['ambiguous-alias', changedSource('paddingAlias', [body, alias + alias]), false],
    [
      'unsupported-binding',
      changedSource('paddingAlias', [body, '\nconst { paddingAlias } = unknownSource\n']),
      false,
    ],
  ]
  return cases.flatMap(([id, themeAdapterSource, valid]) => {
    const actual = materialGateViolations(modifiedSnapshot(baseline, { themeAdapterSource }))
    const expected = valid
      ? []
      : ['NAIVE_BUTTON_PADDING_SHAPE', 'NAIVE_OVERRIDE_VALUE_KIND', 'NAIVE_OVERRIDE_SEMANTIC_ROLE']
    return isDeepStrictEqual(actual, expected)
      ? []
      : [
          `naive-button-padding-${id}: expected ${expected.join(', ') || 'no diagnostics'}; received ${actual.join(', ') || 'no diagnostics'}.`,
        ]
  })
}

function runArchitectureAdminConsoleNegativeProbes(
  baseline: MaterialGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const overrides = themeOverrideObject(baseline.themeAdapterSource)
  const button = overrides === undefined ? undefined : objectPropertyObject(overrides, 'Button')
  const padding =
    button === undefined ? undefined : objectPropertyInitializer(button, 'paddingMedium')
  const paddingProbes: readonly [string, string, string][] = [
    ['raw', "'0 14px'", ''],
    ['nonzero', "`1 ${tokens['spacing.button.inline']}`", ''],
    ['wrong-role', "`0 ${tokens['spacing.page.inline']}`", ''],
    ['missing-zero', "`${tokens['spacing.button.inline']}`", ''],
    ['naked-token', "tokens['spacing.button.inline']", ''],
    ['reversed', "`${tokens['spacing.button.inline']} 0`", ''],
    ['extra-component', "`0 ${tokens['spacing.button.inline']} 0`", ''],
    [
      'extra-expression',
      "`0 ${tokens['spacing.button.inline']} ${tokens['spacing.button.inline']}`",
      '',
    ],
    ['unregistered-variable', "'0 var(--ui-unregistered-button-inline)'", ''],
    ['unknown-helper', "unknownPadding(tokens['spacing.button.inline'])", ''],
    ['unresolved-alias', 'missingPadding', ''],
    [
      'mutable-alias',
      'mutablePadding',
      "let mutablePadding = `0 ${tokens['spacing.button.inline']}`\n",
    ],
    ['circular-alias', 'circularPadding', 'const circularPadding = circularPadding\n'],
    [
      'mutable-token-alias',
      '`0 ${mutableInline}`',
      "let mutableInline = tokens['spacing.button.inline']\n",
    ],
  ]
  const probes: readonly [string, string, Partial<MaterialGateSnapshot>][] = [
    ...(['heightSmall', 'heightMedium'] as const).flatMap(
      (field): readonly [string, string, Partial<MaterialGateSnapshot>][] => {
        const common =
          overrides === undefined ? undefined : objectPropertyObject(overrides, 'common')
        const value = common === undefined ? undefined : objectPropertyInitializer(common, field)
        const change = (replacement: string): string =>
          value === undefined
            ? baseline.themeAdapterSource
            : baseline.themeAdapterSource.slice(0, value.getStart()) +
              replacement +
              baseline.themeAdapterSource.slice(value.end)
        return [
          [
            'density-common-' + field + '-public-role',
            'NAIVE_OVERRIDE_SEMANTIC_ROLE',
            { themeAdapterSource: change("tokens['interaction.control.height']") },
          ],
          [
            'density-common-' + field + '-raw-pixels',
            'NAIVE_OVERRIDE_SEMANTIC_ROLE',
            { themeAdapterSource: change("'36px'") },
          ],
        ]
      },
    ),
    ...(['Button', 'Tag'] as const).map(
      (component): [string, string, Partial<MaterialGateSnapshot>] => {
        const owner =
          overrides === undefined ? undefined : objectPropertyObject(overrides, component)
        const value =
          owner === undefined ? undefined : objectPropertyInitializer(owner, 'heightMedium')
        const replacement =
          component === 'Button'
            ? "tokens['interaction.control.height']"
            : "'var(--ui-control-height-baseline)'"
        return [
          'density-' + component + '-height-source',
          'NAIVE_OVERRIDE_SEMANTIC_ROLE',
          {
            themeAdapterSource:
              value === undefined
                ? baseline.themeAdapterSource
                : baseline.themeAdapterSource.slice(0, value.getStart()) +
                  replacement +
                  baseline.themeAdapterSource.slice(value.end),
          },
        ]
      },
    ),
    ...paddingProbes.map(
      ([id, expression, declarations]): [string, string, Partial<MaterialGateSnapshot>] => [
        `naive-button-padding-${id}`,
        'NAIVE_BUTTON_PADDING_SHAPE',
        {
          themeAdapterSource:
            padding === undefined
              ? baseline.themeAdapterSource
              : declarations +
                baseline.themeAdapterSource.slice(0, padding.getStart()) +
                expression +
                baseline.themeAdapterSource.slice(padding.end),
        },
      ],
    ),
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
        themeAdapterSource: (() => {
          const button = themeOverrideObject(baseline.themeAdapterSource)?.properties.find(
            (property) => objectPropertyName(property) === 'Button',
          )
          if (button === undefined || !ts.isPropertyAssignment(button))
            return baseline.themeAdapterSource
          return (
            baseline.themeAdapterSource.slice(0, button.name.getStart()) +
            'MissingButton' +
            baseline.themeAdapterSource.slice(button.name.end)
          )
        })(),
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
    ['nineteenth-route', 'ROUTE_COUNT', { routeCount: 19 }],
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
          { exportName: 'UiProbe', consumerCount: 0, capabilityStatus: 'ACTIVE' },
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
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-material='reduced'] .pavp-admin-shell__drawer-navigation",
          'box-shadow',
          'none',
          'var(--ui-admin-shadow-chrome)',
        ),
      },
    ],
    [
      'motion-none-drawer-transition-target-removed',
      'MOTION_NONE_TARGETS',
      {
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation",
          'transition',
          'none',
          'opacity var(--ui-motion-duration)',
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
        errorTitles: baseline.errorTitles.map(([key, text]) => [
          key,
          key === 'route-title.error-invalid-route-input' ? 'Bad Request' : text,
        ]),
      },
    ],
    [
      'active-navigation-emits',
      'ACTIVE_NAVIGATION_ITEM_NOOP',
      {
        shellSource: baseline.shellSource.replace(
          /if\s*\(isCurrentDestination\(routeName\)\)\s*\{\s*return\s*\}/u,
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
    '@click="navigate(item.routeName)"',
    '@pointerdown="preserveCurrentPersistentNavigationFocus($event, item.routeName)" @click="navigate(item.routeName)"',
  )
  const disabledCurrentSource = baseline.shellSource.replace(
    "    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,",
    "    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,\n    disabled: true,",
  )
  const keyboardRestoredSource = baseline.shellSource.replace(
    '      tabindex: -1,',
    '      tabindex: 0,',
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
        'event.button === 0 && isCurrentDestination(routeName)',
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
        'if (event.button === 0 && isCurrentDestination(routeName)) {\n    event.preventDefault()\n  }',
        'if (event.button === 0 && isCurrentDestination(routeName)) {\n    event.currentTarget?.blur()\n  }',
      ),
    ],
    [
      'runtime-002-delayed-focus-restore-restored',
      'PAVP_RUNTIME_002_PROHIBITED_REPAIR',
      baseline.shellSource.replace(
        'if (event.button === 0 && isCurrentDestination(routeName)) {\n    event.preventDefault()\n  }',
        'if (event.button === 0 && isCurrentDestination(routeName)) {\n    setTimeout(() => event.currentTarget?.focus())\n  }',
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
      'runtime-002-keyboard-focus-restored',
      'PAVP_RUNTIME_002_KEYBOARD_FOCUS_FORBIDDEN',
      keyboardRestoredSource,
    ],
    [
      'runtime-002-current-route-noop-removed',
      'PAVP_RUNTIME_002_CURRENT_ROUTE_NOOP',
      baseline.shellSource.replace(
        /\n\s*if\s*\(isCurrentDestination\(routeName\)\)\s*\{\s*return\s*\}/u,
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
        /inset-inline:\s*0;\s*background:\s*var\(--ui-color-scrim-viewport\);/u,
        'inline-size: min(100%, var(--ui-layout-admin-drawer-maximum-inline-size)); inset-inline: 0; background: var(--ui-color-scrim-viewport);',
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
        '          :inert="administration && profile === \'narrow\' && navigationOpen"\n',
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
  const { applicationSource, providerSource, runtimeContextSource, shellSource, themeSource } =
    snapshot
  const layoutStart = shellSource.indexOf('<NLayout')
  const siderStart = shellSource.indexOf('<NLayoutSider')
  const siderEnd = shellSource.indexOf('</NLayoutSider>')
  const layoutEnd = shellSource.indexOf('</NLayout>')
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
    'itemIconColor: colorTextSecondary',
    'itemIconColorHover: colorControl',
    'itemIconColorCollapsed: colorTextSecondary',
    'arrowColor: colorTextSecondary',
    'arrowColorHover: colorControl',
    'itemColorHover: navigationHover',
    'itemHeight: enhancedTargetHeight',
    'fontSize',
    'dividerColor: colorBorder',
  ] as const
  const requiredDropdownThemeFields = [
    'color: materialOverlay',
    'optionTextColor: colorText',
    'prefixColor: colorTextSecondary',
    'suffixColor: colorTextSecondary',
    'optionTextColorHover: colorControl',
    'optionColorHover: navigationHover',
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
    [
      'NAV_RUNTIME_CONTEXT_KEY',
      runtimeContextSource.includes('InjectionKey<PavpNaiveAppearanceReference>') &&
        runtimeContextSource.includes("Symbol('pavp-naive-appearance')"),
    ],
    [
      'NAV_RUNTIME_CONTEXT_READONLY',
      runtimeContextSource.includes('Readonly<Ref<Readonly<UiAppearanceSnapshot>>>') &&
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
    ['NAV_WIDE_CONTROLLED_STATE', controlledWideNavigationToggle(scriptContent(shellSource))],
    [
      'NAV_COLLAPSED_STATE',
      shellSource.includes('const persistentNavigationCollapsed = computed(() => {') &&
        shellSource.includes("if (profile.value === 'regular')") &&
        nativeNavigationCollapseProjection(shellSource),
    ],
    [
      'NAV_COLLAPSE_PERSISTENCE',
      !/\b(?:localStorage|sessionStorage|setItem|useStorage)\b/u.test(shellSource),
    ],
    [
      'NAV_STABLE_LAYOUT',
      occurrences(shellSource, '<NLayout\n') === 1 && !/<NLayout\b[^>]*\bv-if\b/u.test(shellSource),
    ],
    [
      'NAV_LAYOUT_PROFILE',
      shellSource.includes(':has-sider="administration && profile !== \'narrow\'"') &&
        shellSource.includes('v-if="administration && profile !== \'narrow\'"'),
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
      shellSource.includes(
        ':data-shell-region="enabled ? \'architecture-console-content\' : undefined"',
      ) &&
        shellSource.includes(':inert="administration && profile === \'narrow\' && navigationOpen"'),
    ],
    ['NAV_NO_LAYOUT_CONTENT', !shellSource.includes('PavpLayoutContent')],
    [
      'NAV_NO_MAIN_REMOUNT_KEY',
      !/\s:key=/u.test(
        /<div\b[^>]*:data-shell-region="[^"]*architecture-console-content[^"]*"[^>]*>/u.exec(
          shellSource,
        )?.[0] ?? '',
      ),
    ],
    ['NAV_SINGLE_SCROLL_OWNER', occurrences(shellSource, ':data-scroll-owner=') === 1],
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
      shellSource
        .replaceAll(/\s+/gu, ' ')
        .includes(
          'props.wideNavigationCollapsed ? props.copy.expandNavigationLabel : props.copy.collapseNavigationLabel',
        ),
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
        shellSource.includes(':accordion="navigationAccordion"') &&
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
      shellSource.includes('readonly expandedNavigationGroupIds: readonly string[]') &&
        !/expandedNavigationGroupKeys\s*=\s*ref/u.test(shellSource),
    ],
    [
      'NAV_EXPANDED_ROUTE_STATE',
      expandedProjectionSemantics.controlledProjection &&
        !expandedProjectionSemantics.activeParentIncluded &&
        shellSource.includes('const validExpandedNavigationGroupKeys = computed(() => {') &&
        !shellSource.includes('() => props.activeRouteName') &&
        !shellSource.includes('ensureActiveNavigationGroupExpanded'),
    ],
    [
      'NAV_EXPANDED_STATE_PRESERVATION',
      !/expandedNavigationGroupKeys\.value\s*=\s*\[\.\.\.navigationGroupKeys\.value\]/u.test(
        shellSource,
      ),
    ],
    [
      'NAV_ROOT_KEYBOARD_DISABLED',
      normalNodeSource.includes("optionKind === 'group'") &&
        /optionKind === 'group'[\s\S]*?return \{\s*tabindex: -1,/u.test(normalNodeSource) &&
        !normalNodeSource.includes('onKeydown'),
    ],
    [
      'NAV_LEAF_KEYBOARD_DISABLED',
      normalNodeSource.includes("optionKind !== 'route'") &&
        occurrences(normalNodeSource, 'tabindex: -1') === 2 &&
        !normalNodeSource.includes('onKeydown'),
    ],
    [
      'NAV_EVENT_LOCAL_POPUP',
      !shellSource.includes("dispatchEvent(new MouseEvent('mouseenter'") &&
        !/\b(?:querySelector|getElementById|closest)\s*\(/u.test(shellSource),
    ],
    [
      'NAV_DROPDOWN_KEYBOARD_DISABLED',
      shellSource.includes('keyboard: false') && !shellSource.includes('handleDropdownKeydown'),
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
        navigationSelectedColorProjection(snapshot.navigationColors).surface &&
        navigationSelectedColorProjection(snapshot.navigationColors).foreground &&
        requiredMenuThemeFields.every((field) => themeSource.includes(field)),
    ],
    [
      'NAV_THEME_DROPDOWN_PEER',
      navigationDropdownThemeOverride(themeSource) !== undefined &&
        requiredDropdownThemeFields.every((field) =>
          navigationDropdownThemeOverride(themeSource)?.getText().includes(field),
        ) &&
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
        'v-if="administration && profile === \'narrow\' && navigationOpen"',
        '@pointerdown="handleDrawerScrimPointerDown($event)"',
        'aria-modal="true"',
        'role="dialog"',
        '@keydown="handleDrawerKeydown"',
        ':inert="administration && profile === \'narrow\' && navigationOpen"',
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
  sourceKey: Exclude<keyof NavigationReworkSourceSnapshot, 'navigationColors'>,
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
  const leafTabIndex = '    tabindex: -1,'
  const fontScaleWatch = `watch(\n  () => appearance.value.fontScale,\n  () => {\n    updateResponsiveNavigationMetrics()\n  },\n  { flush: 'post' },\n)`
  const probes: readonly (readonly [string, string, NavigationReworkSourceSnapshot])[] = [
    [
      'navigation-source-sider-outside-layout',
      'NAV_LAYOUT_NESTING',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '<NLayoutSider',
        '</NLayout>\n      <NLayoutSider',
      ),
    ],
    [
      'navigation-source-has-sider-removed',
      'NAV_LAYOUT_PROFILE',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '      :has-sider="administration && profile !== \'narrow\'"\n',
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
      'navigation-source-root-focusability-restored',
      'NAV_ROOT_KEYBOARD_DISABLED',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        '      tabindex: -1,',
        '      tabindex: 0,',
      ),
    ],
    [
      'navigation-source-leaf-keyboard-navigation-restored',
      'NAV_LEAF_KEYBOARD_DISABLED',
      changedNavigationReworkSource(baseline, 'shellSource', leafTabIndex, '    tabindex: 0,'),
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
        '  keyboard: false,',
        "  keyboard: false,\n  owner: document.querySelector('.n-menu-item'),",
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
        'optionTextColorHover: colorControl,',
        "optionTextColorHover: '#18a058',",
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
        "  emit('update:wideNavigationCollapsed', !props.wideNavigationCollapsed)",
        "  emit('update:wideNavigationCollapsed', !props.wideNavigationCollapsed)\n  localStorage.setItem('wide-navigation-collapsed', String(props.wideNavigationCollapsed))",
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
    (refName.startsWith('props.')
      ? condition.expression.text === 'props' && condition.name.text === refName.slice(6)
      : condition.expression.text === refName && condition.name.text === 'value') &&
    unwrapExpression(conditional.whenTrue).getText() === trueLabel &&
    unwrapExpression(conditional.whenFalse).getText() === falseLabel
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
    .filter((node) => node.tag === 'NMenu')
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
    lenis: 'catalog:',
    'motion-v': 'catalog:',
    'naive-ui': 'catalog:',
    overlayscrollbars: 'catalog:',
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
  const nativeSurfaceBaseRules = shellRules.filter(
    (rule) =>
      rule.selector.includes(
        "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
      ) &&
      rule.selector.includes('.pavp-admin-navigation-dropdown .n-dropdown-option-body::before'),
  )
  const nativeSurfaceBaseDeclarations = nativeSurfaceBaseRules
    .map((rule) => rule.declarations)
    .join('\n')
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
    snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
    navigationSelectedColorProjection(snapshot.navigationColors).surface &&
    navigationSelectedColorProjection(snapshot.navigationColors).foreground &&
    navigationSelectedColorStylesValid(snapshot.shellSource)
  const pressedSurfaceOverrideAbsent = !cssRuleBlocks(shellStyles).some(
    (rule) =>
      rule.selector.includes(':active::before') &&
      /\b(?:background|background-color)\s*:/iu.test(rule.declarations),
  )
  const wideCollapseControlOwned =
    controlledWideNavigationToggle(shellScript) &&
    shellTemplate.includes('data-pavp-admin-navigation-collapse-control="header-trailing"') &&
    shellTemplate.includes('v-if="administration && profile === \'wide\'"') &&
    shellTemplate.includes(':aria-label="wideNavigationCollapseLabel"') &&
    shellTemplate.includes('@click="toggleWideNavigation"') &&
    shellTemplate.includes('<NButton') &&
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
  const runtime003Preserved =
    shellTemplate.includes('<Teleport to="#pavp-overlay-root">') &&
    shellTemplate.includes('aria-modal="true"') &&
    shellTemplate.includes('role="dialog"') &&
    shellTemplate.includes('@pointerdown="handleDrawerScrimPointerDown($event)"') &&
    shellScript.includes("to: '#pavp-overlay-root'") &&
    shellScript.includes('function handleDrawerKeydown(event: KeyboardEvent): void')
  const admittedDynamicRoots =
    snapshot.checkBundleSource.includes('const expectedLazyRouteCount = 13') &&
    snapshot.checkBundleSource.includes('const expectedMotionFeatureDynamicRootCount = 1') &&
    snapshot.checkBundleSource.includes('const expectedDynamicRootCount = 23') &&
    snapshot.checkBundleSource.includes('...localizationResourceManifestKeys,') &&
    snapshot.checkBundleSource.includes('admin-navigation-motion-dom-max') &&
    snapshot.projectConfigSource.includes('adminNavigationMotionFeatureJavaScriptGzipBytes:') &&
    exactOccurrenceCount(snapshot.engineeringManifestSource, "{ id: '") === 5 &&
    snapshot.engineeringManifestSource.includes(
      "{ id: 'admin-navigation-motion-feature-javascript-gzip',",
    )

  return Object.freeze([
    {
      code: 'ADMIN_NAV_NATIVE_SINGLE_SIDER',
      passed: [...shellTemplate.matchAll(/<NLayoutSider(?=[\s>])/gu)].length === 1,
    },
    {
      code: 'ADMIN_NAV_NATIVE_SINGLE_MENU',
      passed: [...shellTemplate.matchAll(/<NMenu(?=[\s>])/gu)].length === 1,
    },
    {
      code: 'ADMIN_NAV_NATIVE_SHARED_COLLAPSED_AUTHORITY',
      passed:
        nativeNavigationCollapseProjection(snapshot.shellSource) &&
        exactOccurrenceCount(shellScript, 'const persistentNavigationCollapsed = computed(') ===
          1 &&
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
        snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
        navigationSelectedColorProjection(snapshot.navigationColors).hover,
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
        navigationSelectedColorProjection(snapshot.navigationColors).expandedUnfilled &&
        shellStyles.includes(
          ".pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active::before",
        ),
    },
    {
      code: 'ADMIN_NAV_NATIVE_COLLAPSED_AND_DROPDOWN_SELECTED',
      passed: collapsedAndDropdownSelected,
    },
    {
      code: 'ADMIN_NAV_NATIVE_NARROW_RUNTIME_003',
      passed: runtime003Preserved,
    },
    {
      code: 'ADMIN_NAV_NATIVE_ROUTE_COUNT',
      passed: snapshot.routeCount === 13,
    },
    {
      code: 'ADMIN_NAV_NATIVE_KERNEL_COUNT',
      passed: snapshot.runtimeKernelStepCount === 15,
    },
    {
      code: 'ADMIN_NAV_NATIVE_PROVIDER_IDS',
      passed: isDeepStrictEqual(snapshot.activeProviderIds, ['pinia', 'appearance']),
    },
    {
      code: 'ADMIN_NAV_NATIVE_STORAGE_COUNT',
      passed: snapshot.storageRecordCount === 8,
    },
    {
      code: 'ADMIN_NAV_NATIVE_SCOPED_MOTION_DEPENDENCIES',
      passed: scopedMotionDependencyClosure,
    },
    {
      code: 'ADMIN_NAV_NATIVE_DYNAMIC_ROOTS',
      passed: admittedDynamicRoots,
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
  const menuOptionsEnd = shellScript.indexOf('function collapsedNavigationGroupRouteName')
  const dropdownPropsStart = shellScript.indexOf('const persistentNavigationDropdownProps')
  const dropdownPropsEnd = shellScript.indexOf('function handleNavigationValueUpdate')
  const menuOptionsSource = shellScript.slice(menuOptionsStart, menuOptionsEnd)
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
  const popupPeerSource = navigationDropdownThemeOverride(snapshot.themeSource)?.getText() ?? ''

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
      code: 'ADMIN_NAV_COLLAPSED_POPUP_KEYBOARD_DISABLED',
      passed: !shellScript.includes('onKeydown') && !shellScript.includes('tabindex: 0'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_VENDOR_KEYBOARD_DISABLED',
      passed: dropdownPropsSource.includes('keyboard: false'),
    },
    {
      code: 'ADMIN_NAV_COLLAPSED_POPUP_EVENT_LOCAL_ONLY',
      passed:
        !/\b(?:querySelector|getElementById|closest)\s*\(/u.test(dropdownPropsSource) &&
        !/\b(?:setTimeout|setInterval|requestAnimationFrame)\s*\(/u.test(dropdownPropsSource) &&
        !/\b(?:document|window|globalThis)\.addEventListener\s*\(/u.test(dropdownPropsSource),
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
        navigationSelectedColorProjection(snapshot.navigationColors).surface,
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
        nativeSourceResults.get('ADMIN_NAV_NATIVE_NARROW_RUNTIME_003') === true,
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
      'admin-navigation-collapsed-popup-restores-keyboard-opening',
      'ADMIN_NAV_COLLAPSED_POPUP_KEYBOARD_DISABLED',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace('      tabindex: -1,', '      tabindex: 0,'),
      },
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
        navigationColors: {
          ...baseline.navigationColors,
          menu: {
            ...baseline.navigationColors.menu,
            itemColorActiveHover: baseline.navigationColors.menu.itemColorHover,
          },
        },
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

function navigationPreferenceEmits(node: ts.Node, eventName: string): readonly ts.CallExpression[] {
  const calls: ts.CallExpression[] = []
  function visit(candidate: ts.Node): void {
    if (
      ts.isCallExpression(candidate) &&
      ts.isIdentifier(candidate.expression) &&
      candidate.expression.text === 'emit' &&
      candidate.arguments[0] !== undefined &&
      ts.isStringLiteral(candidate.arguments[0]) &&
      candidate.arguments[0].text === eventName
    )
      calls.push(candidate)
    ts.forEachChild(candidate, visit)
  }
  visit(node)
  return calls
}

function controlledWideNavigationToggle(shellScript: string): boolean {
  const source = ts.createSourceFile(
    shellSfcPath,
    shellScript,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const calls = navigationPreferenceEmits(source, 'update:wideNavigationCollapsed')
  const payload = calls[0]?.arguments[1]
  return (
    calls.length === 1 &&
    payload !== undefined &&
    ts.isPrefixUnaryExpression(payload) &&
    payload.operator === ts.SyntaxKind.ExclamationToken &&
    ts.isPropertyAccessExpression(payload.operand) &&
    payload.operand.expression.getText(source) === 'props' &&
    payload.operand.name.text === 'wideNavigationCollapsed' &&
    !/\b(?:wideNavigationCollapsed|expandedNavigationGroupKeys)\s*=\s*(?:ref|shallowRef|reactive)\b/u.test(
      shellScript,
    ) &&
    refValueWriteCount(source, 'wideNavigationCollapsed') === 0
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
        const callable = shellCallables.get(expression)
        return (
          callable !== undefined &&
          navigationPreferenceEmits(callable, 'update:wideNavigationCollapsed').length !== 0
        )
      })
      .map((directive) => ({ directive, element })),
  )
  const soleTemplateStateWriter =
    stateWritingTemplateEvents.length === 1 ? stateWritingTemplateEvents[0] : undefined
  const siderNodes = templateElements.filter((element) => element.node.tag === 'NLayoutSider')
  const menuNodes = templateElements.filter((element) => element.node.tag === 'NMenu')
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
  const exactToggleAuthority = controlledWideNavigationToggle(shellScript)
  const toggleDeclaration = functionDeclaration(shellSourceFile, 'toggleWideNavigation')
  const uniqueScriptStateWriter =
    toggleDeclaration !== undefined &&
    navigationPreferenceEmits(shellSourceFile, 'update:wideNavigationCollapsed').length === 1 &&
    navigationPreferenceEmits(toggleDeclaration, 'update:wideNavigationCollapsed').length === 1 &&
    refValueWriteCount(shellSourceFile, 'wideNavigationCollapsed') === 0 &&
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
    "const persistentNavigationCollapsed = computed(() => { if (profile.value === 'regular') { return true } return profile.value === 'wide' && props.wideNavigationCollapsed })",
  )
  const exactDynamicLabels =
    computedBooleanLabelMatches(
      shellInitializers.get('wideNavigationCollapseLabel'),
      'props.wideNavigationCollapsed',
      'props.copy.expandNavigationLabel',
      'props.copy.collapseNavigationLabel',
    ) &&
    exactOccurrenceCount(shellScript, 'props.copy.expandNavigationLabel') === 1 &&
    exactOccurrenceCount(shellScript, 'props.copy.collapseNavigationLabel') === 1
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
    /<button\s+[\s\S]*?v-if="administration && profile === 'narrow'"[\s\S]*?ref="navigationTrigger"[\s\S]*?:aria-label="copy\.openNavigationLabel"[\s\S]*?@click="openNavigation"[\s\S]*?>\s*\{\{ copy\.navigationActionLabel \}\}\s*<\/button>/u.test(
      shellTemplate,
    )
  const narrowDrawerPreserved = [
    '<Teleport to="#pavp-overlay-root">',
    'v-if="administration && profile === \'narrow\' && navigationOpen"',
    '@pointerdown="handleDrawerScrimPointerDown($event)"',
    'aria-modal="true"',
    'role="dialog"',
    '@keydown="handleDrawerKeydown"',
    ':inert="administration && profile === \'narrow\' && navigationOpen"',
  ].every((marker) => shellTemplate.includes(marker))

  return Object.freeze([
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_SINGLE_CONTROL',
      passed:
        projection.controlElements.length === 1 &&
        controlNode?.tag === 'NButton' &&
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
        collapsedRefAuthorities.length === 0 &&
        !/\b(?:localStorage|sessionStorage|setItem|useStorage)\b/u.test(shellScript),
    },
    {
      code: 'ADMIN_NAV_HEADER_COLLAPSE_ACCESSIBLE_LABELS',
      passed:
        exactDynamicLabels &&
        controlAriaLabelBindings.length === 1 &&
        normalizeTemplateExpression(controlAriaLabelBindings[0]?.exp?.content) ===
          'wideNavigationCollapseLabel' &&
        controlNode?.tag === 'NButton' &&
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
        nativeNavigationCollapseProjection(snapshot.shellSource),
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
        shellTemplate.includes(':has-sider="administration && profile !== \'narrow\'"') &&
        shellTemplate.includes('v-if="administration && profile !== \'narrow\'"') &&
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
  const menuStart = source.indexOf('<NMenu')
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
        shellSource: baseline.shellSource.replace('<NLayoutSider', '<NLayoutSider><NLayoutSider'),
      },
    ],
    [
      'admin-navigation-native-adds-second-menu',
      'ADMIN_NAV_NATIVE_SINGLE_MENU',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace('<NMenu', '<NMenu><NMenu'),
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
      'admin-navigation-native-forced-lens-visible',
      'ADMIN_NAV_NATIVE_SELECTED_SURFACE',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          '.pavp-admin-navigation-selection-lens',
          'visibility',
          'hidden',
          'visible',
        ),
      },
    ],
    [
      'admin-navigation-native-forced-selected-pseudo-hidden',
      'ADMIN_NAV_NATIVE_SELECTED_SURFACE',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          ".pavp-admin-shell[data-navigation-collapsed='false'] [data-pavp-admin-navigation-motion-ready='true'] .n-menu-item-content--selected::before",
          'visibility',
          'visible',
          'hidden',
        ),
      },
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
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transform',
          'none',
          'scale(0.98)',
        ),
      },
    ],
    [
      'admin-navigation-native-restores-none-transition',
      'ADMIN_NAV_NATIVE_NONE_MOTION',
      {
        ...baseline,
        shellSource: replaceSfcCssValue(
          baseline.shellSource,
          "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before",
          'transition',
          'none',
          'opacity var(--ui-motion-duration)',
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
        navigationColors: {
          ...baseline.navigationColors,
          childActiveFillPresent: true,
        },
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
      'admin-navigation-native-route-count-drift',
      'ADMIN_NAV_NATIVE_ROUTE_COUNT',
      { ...baseline, routeCount: 19 },
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
      { ...baseline, storageRecordCount: 2 },
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
          'const expectedLazyRouteCount = 13',
          'const expectedLazyRouteCount = 19',
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
  const menuNodes = shellElements.filter((element) => element.node.tag === 'NMenu')
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
  const frameSource = snapshot.consoleFrameSource
  const routeWatchContract =
    /watch\(\s*\(\) => router\.currentRoute\.value,/u.test(frameSource) &&
    frameSource.includes("{ flush: 'sync' }") &&
    frameSource.includes('item.isCurrentDestination') &&
    frameSource.includes('reconcileNavigationGroupIds') &&
    !/\b(?:localStorage|sessionStorage|setItem|\$subscribe)\b/u.test(frameSource)
  const expansionWatchSourcesAreExact =
    expansionWritingWatchCalls.length === 0 &&
    watchCalls.every(
      (call) => navigationPreferenceEmits(call, 'update:expandedNavigationGroupIds').length === 0,
    ) &&
    !/\bexpandedNavigationGroupKeys\s*=\s*(?:ref|shallowRef|reactive)\b/u.test(shellScript)

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
        ancestor.tag === 'NLayoutSider' ||
        ancestor.tag === 'NMenu' ||
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
  const toggleAllDeclaration = functionDeclaration(shellSourceFile, 'toggleNavigationMode')
  const normalizedToggleAllSource =
    toggleAllDeclaration?.getText(shellSourceFile).replaceAll(/\s+/gu, ' ') ?? ''
  const toggleAllExactStateAuthority =
    toggleAllDeclaration !== undefined &&
    navigationPreferenceEmits(toggleAllDeclaration, 'update:expandedNavigationGroupIds').length ===
      1 &&
    navigationPreferenceEmits(toggleAllDeclaration, 'update:wideNavigationCollapsed').length ===
      0 &&
    normalizedToggleAllSource.includes("intent: 'mode'") &&
    normalizedToggleAllSource.includes('accordion: !props.navigationAccordion') &&
    refValueWriteCount(toggleAllDeclaration, 'expandedNavigationGroupKeys') === 0 &&
    refValueWriteCount(toggleAllDeclaration, 'wideNavigationCollapsed') === 0 &&
    !/\b(?:route|router|focus|appearance|storage|localStorage|sessionStorage)\b/iu.test(
      normalizedToggleAllSource,
    )
  const exactGroupControlLabels =
    computedBooleanLabelMatches(
      shellInitializers.get('navigationGroupsToggleLabel'),
      'props.navigationAccordion',
      'props.copy.freeNavigationModeLabel',
      'props.copy.accordionNavigationModeLabel',
    ) &&
    exactOccurrenceCount(shellScript, 'props.copy.accordionNavigationModeLabel') === 1 &&
    exactOccurrenceCount(shellScript, 'props.copy.freeNavigationModeLabel') === 1 &&
    groupControlAriaBindings.length === 1 &&
    normalizeTemplateExpression(groupControlAriaBindings[0]?.exp?.content) ===
      'navigationGroupsToggleLabel' &&
    exactOccurrenceCount(shellTemplate, '{{ navigationGroupsToggleLabel }}') === 1 &&
    !groupControlSource.includes('title=')
  const groupControlNaiveButton =
    groupControlNode?.tag === 'NButton' &&
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
    exactOccurrenceCount(snapshot.appSource, 'class="pavp-route-content"') === 1 &&
    [...snapshot.appSource.matchAll(/:key="([^"]+)"/gu)].every((match) =>
      /^[\w$]+\.active\?\.instance$/u.test(match[1] ?? ''),
    ) &&
    /\.pavp-route-content\s*\{\s*opacity:\s*1\s*;\s*\}/u.test(snapshot.appStylesSource)
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
    'v-if="administration && profile === \'narrow\' && navigationOpen"',
    '@pointerdown="handleDrawerScrimPointerDown($event)"',
    'aria-modal="true"',
    'role="dialog"',
    '@keydown="handleDrawerKeydown"',
    ':inert="administration && profile === \'narrow\' && navigationOpen"',
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
        dependencyClosureHasPropsProperty(validExpandedClosure, 'expandedNavigationGroupIds') &&
        !shellScript.includes('projectedExpandedNavigationGroupKeys'),
    },
    {
      code: 'ADMIN_NAV_EXPANSION_ACTIVE_PARENT_OPTIONAL',
      passed:
        !dependencyClosureHasPropsProperty(validExpandedClosure, 'activeRouteName') &&
        dependencyClosureHasPropsProperty(validExpandedClosure, 'expandedNavigationGroupIds') &&
        menuNode !== undefined &&
        singleBoundExpression(menuNode, 'accordion') === 'navigationAccordion',
    },
    {
      code: 'ADMIN_NAV_PREFERENCE_APPLICATION_BOUNDARY',
      passed:
        frameSource.includes('useNavigationPreferenceStore()') &&
        frameSource.includes(':wide-navigation-collapsed=') &&
        frameSource.includes(':expanded-navigation-group-ids=') &&
        frameSource.includes('@update:wide-navigation-collapsed=') &&
        frameSource.includes('@update:expanded-navigation-group-ids=') &&
        frameSource.includes('.setWideNavigationCollapsed') &&
        frameSource.includes('.setExpandedGroupIds(') &&
        frameSource.includes("update.intent === 'mode'") &&
        frameSource.includes('.setNavigationAccordion(') &&
        frameSource.includes(':navigation-accordion=') &&
        frameSource.includes('item.isCurrentDestination') &&
        !/\$subscribe|\$patch|\$state|\b(?:setTimeout|setInterval|requestAnimationFrame)\b/u.test(
          frameSource,
        ),
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
        isDeepStrictEqual(groupControlClickExpressions, ['toggleNavigationMode']),
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
          "administration && profile === 'wide'",
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
        controlledWideNavigationToggle(shellScript) &&
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
        [...shellTemplate.matchAll(/<NLayoutSider(?=[\s>])/gu)].length === 1 &&
        [...shellTemplate.matchAll(/<NMenu(?=[\s>])/gu)].length === 1,
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
    'new Set(props.expandedNavigationGroupIds)',
    'new Set([...props.expandedNavigationGroupIds, props.activeRouteName])',
  )
  const actionMutatesWideSource = baseline.shellSource.replace(
    "intent: 'mode',",
    "intent: 'mode',\n    extra: emit('update:wideNavigationCollapsed', !props.wideNavigationCollapsed),",
  )
  const reducedMotionRemovedSource = baseline.providerSource.replace(
    "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
    "html[data-motion='probe-reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,",
  )
  const noneMotionAllowedSource = `${baseline.providerSource}\n<style>\nhtml[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu { transition: opacity var(--ui-motion-duration) !important; animation: pavp-probe var(--ui-motion-duration) !important; }\n</style>\n`
  const routeKeySource = baseline.appSource.replace(
    'class="pavp-route-content"',
    ':key="route.fullPath" class="pavp-route-content"',
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
    [...action.ancestors].reverse().find((ancestor) => ancestor.tag === 'NTooltip'),
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
    actionDescendants(action).filter((element) => element.node.tag === 'NIcon'),
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
    'UiScrollArea',
    'UiAdminShell',
    'UiPageHeader',
    'UiProvider',
    'UiRadioCardGroup',
    'UiSection',
    'UiStatusBadge',
    'UiForm',
    'UiFormField',
    'UiWorkspaceTabs',
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
        element.node.tag === 'NIcon' &&
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
    snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
    navigationSelectedColorProjection(snapshot.navigationColors).surface
  const selectedSurfaceBaseRules = cssRuleBlocks(shellStyles).filter(
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
    selectedSurfaceBaseRules.some((rule) =>
      rule.declarations.includes('transition-property: background-color, opacity;'),
    ) &&
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
    'v-if="administration && profile === \'narrow\' && navigationOpen"',
    '@pointerdown="handleDrawerScrimPointerDown($event)"',
    'aria-modal="true"',
    'role="dialog"',
    '@keydown="handleDrawerKeydown"',
    ':inert="administration && profile === \'narrow\' && navigationOpen"',
  ].every((marker) => shellTemplate.includes(marker))

  return Object.freeze([
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_BUTTONS',
      passed:
        actionElements.length === 2 &&
        actionElements.every(
          (element) =>
            element.node.tag === 'NButton' &&
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
        headerActionVisualProjection,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_ICONS',
      passed:
        iconPrimitives.length === 4 && iconStates.every((element) => element.node.tag === 'NIcon'),
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_TOOLTIPS',
      passed:
        actionTooltips.length === 2 &&
        actionTooltips.every((tooltip) => tooltip?.tag === 'NTooltip') &&
        compactTooltipProjection,
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
        exactOccurrenceCount(shellScript, 'props.copy.accordionNavigationModeLabel') === 1 &&
        exactOccurrenceCount(shellScript, 'props.copy.freeNavigationModeLabel') === 1 &&
        exactOccurrenceCount(shellScript, 'props.copy.collapseNavigationLabel') === 1 &&
        exactOccurrenceCount(shellScript, 'props.copy.expandNavigationLabel') === 1 &&
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
        snapshot.themeSource.includes('optionColorHover: navigationHoverSurface') &&
        navigationSelectedColorProjection(snapshot.navigationColors).hover,
    },
    {
      code: 'ADMIN_NAV_NAIVE_ACTIONS_SELECTED_SIXTEEN_PERCENT',
      passed:
        exactOccurrenceCount(snapshot.themeSource, selectedFormula) === 1 &&
        navigationSelectedColorProjection(snapshot.navigationColors).surface,
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
        exactOccurrenceCount(shellTemplate, '<NLayoutSider') === 1 &&
        exactOccurrenceCount(shellTemplate, '<NMenu') === 1,
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
    .find((ancestor) => ancestor.tag === 'NTooltip')
  const firstIconState = elements.find(
    (element) =>
      staticTemplateAttribute(element.node, 'data-pavp-admin-navigation-icon-state') ===
      'groups-expanded',
  )
  const groupActionSource = groupAction?.node.loc?.source ?? ''
  const nativeButtonActionSource = groupActionSource
    .replace('<NButton', '<button')
    .replace('</NButton>', '</button>')
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
    tooltipSource.replaceAll('NTooltip', 'div'),
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
  const routeKeySource = baseline.appSource.replace(
    'class="pavp-route-content"',
    ':key="route.fullPath" class="pavp-route-content"',
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
      {
        ...baseline,
        navigationColors: {
          ...baseline.navigationColors,
          menu: {
            ...baseline.navigationColors.menu,
            itemColorActiveHover: baseline.navigationColors.menu.itemColorHover,
          },
        },
      },
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
    'MOTION_FEATURE_BUDGET_FAILURE=MEASURED_MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES > projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes',
    'MOTION_FEATURE_BUDGET_EQUALITY=PASS',
    'MOTION_FEATURE_REMAINING_BYTES=INFORMATIONAL_ONLY',
    'MOTION_FEATURE_EXCLUSIVE_GZIP_BYTES=33648',
    'MOTION_FEATURE_HARD_BUDGET_BYTES=49152',
    'MOTION_FEATURE_HEADROOM_BYTES=15504',
    'MOTION_FEATURE_EXCLUSIVE_JAVASCRIPT_FILE_COUNT=1',
    'FINAL_INITIAL_JAVASCRIPT_GZIP_BYTES=223308',
    'FINAL_INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=237568',
    'FINAL_INITIAL_JAVASCRIPT_HEADROOM_BYTES=14260',
    'INITIAL_JAVASCRIPT_CURRENT_HARD_BUDGET_BYTES=237568',
  ] as const
  const requiredBundleMeasurementMarkers = [
    'const expectedLazyRouteCount = 13',
    'const expectedMotionFeatureDynamicRootCount = 1',
    'const expectedDynamicRootCount = 23',
    '...localizationResourceManifestKeys,',
    'for (const ownerKey of initialChunkKeys)',
    'collectStaticChunkClosure(manifest, motionFeatureManifestKey)',
    'differenceValues(motionFeatureStaticClosure, initialChunkKeys)',
  ] as const

  if (
    !Number.isSafeInteger(expectedInitialJavaScriptBudgetBytes) ||
    expectedInitialJavaScriptBudgetBytes <= 0 ||
    !Number.isSafeInteger(motionFeatureBudgetBytes) ||
    motionFeatureBudgetBytes <= 0 ||
    exactOccurrenceCount(snapshot.projectConfigSource, 'initialJavaScriptGzipBytes:') !== 1 ||
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
    snapshot.routeCount !== 13 ||
    !snapshot.checkBundleSource.includes('const expectedLazyRouteCount = 13') ||
    !snapshot.checkBundleSource.includes('const expectedMotionFeatureDynamicRootCount = 1') ||
    !snapshot.checkBundleSource.includes('const expectedDynamicRootCount = 23') ||
    !snapshot.checkBundleSource.includes('...localizationResourceManifestKeys,') ||
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

function runNavigationBudgetProbes(
  baseline: NavigationBudgetGateSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = navigationBudgetViolations(baseline)
  const probes: readonly [string, string, NavigationBudgetGateSnapshot][] = [
    [
      'navigation-budget-duplicates-initial-hard-limit-authority',
      'NAV_BUDGET_HARD_LIMIT',
      {
        ...baseline,
        projectConfigSource: baseline.projectConfigSource.replace(
          'initialJavaScriptGzipBytes:',
          'initialJavaScriptGzipBytes: 1, initialJavaScriptGzipBytes:',
        ),
      },
    ],
    [
      'navigation-budget-rejects-limit-equality',
      'NAV_BUDGET_ARCHITECTURE',
      {
        ...baseline,
        architectureSource: baseline.architectureSource.replace(
          'MOTION_FEATURE_BUDGET_EQUALITY=PASS',
          'MOTION_FEATURE_BUDGET_EQUALITY=FAIL',
        ),
      },
    ],
    [
      'navigation-budget-breaks-motion-exclusive-closure',
      'NAV_BUDGET_MEASUREMENT_INTEGRITY',
      {
        ...baseline,
        checkBundleSource: baseline.checkBundleSource.replace(
          'differenceValues(motionFeatureStaticClosure, initialChunkKeys)',
          'motionFeatureStaticClosure',
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
      { ...baseline, routeCount: 19 },
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

  const sourceFile = ts.createSourceFile(
    'check-bundle.ts',
    baseline.checkBundleSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const limitProbes = [
    {
      property: 'initialJavaScriptGzipBytes',
      measurement: 'initialJavaScriptBytes',
      cases: [
        ['below-limit', 270335, 270336, true],
        ['exact-limit', 270336, 270336, true],
        ['one-byte-above-limit', 270337, 270336, false],
        ['non-aligned-limit', 8193, 8193, true],
        ['recorded-measurement', 263391, 270336, true],
        ['smaller-bundle', 1, 270336, true],
      ],
    },
    {
      property: 'adminNavigationMotionFeatureJavaScriptGzipBytes',
      measurement: 'motionFeatureJavaScriptBytes',
      cases: [
        ['below-limit', 49151, 49152, true],
        ['exact-limit', 49152, 49152, true],
        ['one-byte-above-limit', 49153, 49152, false],
        ['non-aligned-limit', 8193, 8193, true],
        ['recorded-measurement', 33648, 49152, true],
        ['smaller-bundle', 1, 49152, true],
      ],
    },
  ] as const
  const limitProbeResults = limitProbes.flatMap(({ property, measurement, cases }) => {
    const branches = sourceFile.statements.filter(
      (statement): statement is ts.IfStatement =>
        ts.isIfStatement(statement) &&
        statement.expression
          .getText(sourceFile)
          .includes(`projectConfig.bundleBudgets.${property}`),
    )
    const branch = branches.length === 1 ? branches[0] : undefined

    return cases.map(([id, measuredBytes, configuredBudget, expectedAcceptance]) => {
      const result: unknown =
        branch === undefined
          ? undefined
          : runInNewContext(
              `(() => { try { ${branch.getText(sourceFile)}; return 'accepted' } catch (error) { return error instanceof Error && error.name === 'Error' ? 'rejected' : 'invalid' } })()`,
              {
                [measurement]: measuredBytes,
                motionFeatureRootId: 'admin-navigation-motion-dom-max',
                projectConfig: { bundleBudgets: { [property]: configuredBudget } },
              },
              { timeout: 1000 },
            )

      return Object.freeze({
        id: `navigation-budget-${property}-${id}`,
        expectedFailureCode: 'NAV_BUDGET_LIMIT_COMPARISON',
        passed: result === (expectedAcceptance ? 'accepted' : 'rejected'),
      })
    })
  })

  return Object.freeze([
    ...probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
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
    ...limitProbeResults,
  ])
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
      '@intlify/message-compiler': 'catalog:',
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
      'naive-ui': 'catalog:',
      '@tanstack/vue-query': 'catalog:',
      'vue-i18n': 'catalog:',
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
      lenis: 'catalog:',
      'motion-v': 'catalog:',
      'naive-ui': 'catalog:',
      overlayscrollbars: 'catalog:',
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
      lenis: 'catalog:',
      'motion-v': 'catalog:',
      'naive-ui': 'catalog:',
      overlayscrollbars: 'catalog:',
      vue: 'catalog:',
    }) ||
    webDependencies['@platform/ui'] !== 'workspace:*' ||
    webDependencies['naive-ui'] !== 'catalog:' ||
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
    tokenManifest.schemaVersion !== 12 ||
    tokenManifest.tokens.length !== 274 ||
    tokenManifest.activePublicRoles.length !== 60 ||
    tokenManifest.unoCssMappings.length !== 60 ||
    tokenManifest.namedContrasts.length !== 34 ||
    tokenManifest.governance.recordCount !== 438 ||
    tokenManifest.governance.baselineRecordCount !== 181 ||
    tokenManifest.governance.expectedRecordCountDelta !== 257 ||
    classProjections.length !== 58 ||
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
  const errorNames = new Set<string>(errorRouteRegistry.map((record) => record.routeName))
  const productRoutes = routeRegistry.filter((record) => !errorNames.has(record.name))
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
  const workbenchStyles = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/workbench/workbench.css'),
    'utf8',
  )
  const naiveProviderSource = await readFile(
    resolve(rootDirectory, 'packages/ui/src/providers/UiProvider.vue'),
    'utf8',
  )

  if (
    runtimeCount(routeRegistry) !== 13 ||
    runtimeCount(productRoutes) !== 6 ||
    runtimeCount(errorRouteRegistry) !== 7 ||
    Object.keys(breadcrumbRegistry).length !== 6 ||
    !exactSet(layoutPresets, ['workspace']) ||
    !isDeepStrictEqual(actualProduct, productRouteContract)
  ) {
    violations.push('The exact 13/6/7 workbench Route Registry closure drifted.')
  }

  if (
    [...appSource.matchAll(/<RouterView\b/gu)].length !== 1 ||
    [...shellSource.matchAll(/new ResizeObserver\b/gu)].length !== 1 ||
    !shellSource.includes('container-name: pavp-admin-shell') ||
    !shellSource.includes(':data-scroll-owner=') ||
    !shellSource.includes(
      "document.documentElement.style.overflow = enabled.value ? 'hidden' : rootOverflow",
    ) ||
    !shellSource.includes(
      "document.body.style.overflow = enabled.value ? 'hidden' : bodyOverflow",
    ) ||
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
    shellRegions.length !== 5 ||
    !exactSet(
      shellRegions.map((record) => record.id),
      [
        'architecture-console-content',
        'architecture-console-footer',
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

  const footer = shellRegions.find((record) => record.id === 'architecture-console-footer')
  if (
    !isDeepStrictEqual(footer, {
      id: 'architecture-console-footer',
      owner: '@platform/ui',
      profileAvailability: ['narrow', 'regular', 'wide'],
      requiredProfiles: [],
      overlayRelationship: 'background-locked-by-navigation-overlay',
      scrollRelationship: 'inside-route-primary-scroll-owner',
      capabilityStatus: 'ACTIVE',
    }) ||
    shellRegions.some(
      (record) =>
        record.id !== 'architecture-console-footer' && record.requiredProfiles.length === 0,
    )
  ) {
    violations.push(
      'Footer must be the only optional region and remain inside the route primary scroll owner.',
    )
  }

  const requiredMotionMarkers = [
    '.pavp-admin-shell__navigation-action[aria-current=',
    "[data-pavp-admin-navigation='persistent'] .n-layout-sider",
    'pavp-admin-drawer-enter-active',
    '.pavp-route-content',
    '.n-button',
    "data-motion='reduced'",
    "data-motion='none'",
  ]
  const motionSource = shellSource + appStyles + workbenchStyles + naiveProviderSource
  const nonShellOpticalSource = appStyles + naiveProviderSource

  if (
    requiredMotionMarkers.some((marker) => !motionSource.includes(marker)) ||
    /transition\s*:\s*all\b/iu.test(motionSource) ||
    /\b(?:animation|transition)(?:-duration|-delay)?\s*:[^;]*(?:\d+(?:\.\d+)?)(?:ms|s)\b/iu.test(
      motionSource,
    ) ||
    /\b(?:backdrop-filter|filter)\s*:|\b(?:blur|brightness|saturate)\s*\(/iu.test(
      nonShellOpticalSource,
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

async function validateWorkbenchAndAppearanceAuthority(): Promise<{
  readonly violations: string[]
  readonly factImportViolation: boolean
  readonly pageSource: string
  readonly competingEnvironmentSource: string
}> {
  const violations: string[] = []
  const pageSources: string[] = []
  let factImportViolation = false
  const errorNames = new Set<string>(errorRouteRegistry.map((record) => record.routeName))
  const pagePaths = routeRegistry
    .filter((record) => !errorNames.has(record.name))
    .map((record) => record.sourcePath)
  const viewPaths = [
    ...pagePaths,
    'apps/web/src/app/workbench/WorkbenchPage.vue',
    'apps/web/src/app/workbench/TokenGallery.vue',
    'apps/web/src/app/workbench/TokenSpecimen.vue',
  ]
  const factImports = new Set([
    '../app/api/api-read-boundary',
    '../app/appearance/appearance-read-boundary',
    '../app/appearance/appearance-mutation-boundary',
    '../app/navigation/navigation-preference.store',
    '../app/scroll/scroll-preference.store',
    '../app/router/application-navigation',
    '../app/router/route-input',
    '../app/router/route-registry',
    '../app/router/settings-return',
    '../app/router/router-scroll-controller',
  ])
  const requiredConsumerImports = new Map<string, readonly string[]>([
    [
      'apps/web/src/pages/index.vue',
      ['../app/api/api-read-boundary', '../shared/services/uapi-world-time'],
    ],
    [
      'apps/web/src/pages/control-center.vue',
      [
        '../app/appearance/appearance-mutation-boundary',
        '../app/appearance/appearance-read-boundary',
        '../app/navigation/navigation-preference.store',
        '../app/scroll/scroll-preference.store',
        '../app/router/settings-return',
        '../app/router/router-scroll-controller',
        '../shared/i18n',
      ],
    ],
    ['apps/web/src/app/workbench/TokenSpecimen.vue', ['@platform/design-system']],
  ])
  for (const path of viewPaths) {
    const content = await readFile(resolve(rootDirectory, path), 'utf8')
    const imports = importedModules(path, content)
    const parsed = vueSfcCompiler.parse(content, { filename: path })
    pageSources.push(content)
    if (
      (requiredConsumerImports.get(path) ?? []).some((specifier) => !imports.includes(specifier))
    ) {
      factImportViolation = true
      violations.push(path + ': the required real capability consumer boundary is missing.')
    }
    if (parsed.errors.length !== 0 || parsed.descriptor.template === undefined)
      violations.push(path + ': workbench view must parse and expose its real template.')
    if (
      imports.some(
        (specifier) =>
          specifier.includes('/app/') &&
          !specifier.includes('/workbench/') &&
          !factImports.has(specifier),
      )
    ) {
      factImportViolation = true
      violations.push(path + ': workbench views must consume admitted application fact boundaries.')
    }
    if (
      /<(?:UiProvider|UiAdminShell|RouterView|UiForm|UiFormField|NForm|NFormItem|NDataTable)\b/u.test(
        templateContent(content),
      )
    )
      violations.push(
        path +
          ': a page cannot mount another shell/provider or demonstrate an incomplete capability.',
      )
    if (/\b(?:fetch|setInterval)\s*\(/u.test(scriptContent(content)))
      violations.push(
        path +
          ': workbench views cannot bypass the API read boundary or fabricate a polling clock.',
      )
  }
  const retiredPaths = [
    'appearance.vue',
    'design-tokens.vue',
    'runtime-kernel.vue',
    'router.vue',
    'storage.vue',
    'ui-system.vue',
    'responsive-layout.vue',
    'engineering.vue',
    'capabilities.vue',
    'capabilities-standalone.vue',
  ].map((name) => 'apps/web/src/pages/' + name)
  retiredPaths.push(
    'apps/web/src/app/console/CapabilityRoadmapContent.vue',
    'apps/web/src/app/console/overview-projection.ts',
  )
  for (const path of retiredPaths) {
    if (
      await access(resolve(rootDirectory, path)).then(
        () => true,
        () => false,
      )
    )
      violations.push(path + ': retired explanation-page source must not remain.')
  }
  const workbenchStyle = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/workbench/workbench.css'),
    'utf8',
  )
  pageSources.push('<style data-pavp-owner="workbench">' + workbenchStyle + '</style>')
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
    !readBoundarySource.includes('Readonly<ShallowRef<Readonly<UiAppearanceSnapshot>>>') ||
    [...readBoundarySource.matchAll(/\bshallowRef\s*</gu)].length !== 1 ||
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
    defineStoreCount !== 4 ||
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

  return {
    violations,
    factImportViolation,
    pageSource: joinedPages,
    competingEnvironmentSource: competingEnvironmentSources.join('\n'),
  }
}

async function validateNaiveOverrides(): Promise<string[]> {
  const violations: string[] = []
  const [themeSource, providerSource, radioCardSource, statusBadgeSource, pageHeaderSource] =
    await Promise.all([
      readFile(
        resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'),
        'utf8',
      ),
      readFile(resolve(rootDirectory, 'packages/ui/src/providers/UiProvider.vue'), 'utf8'),
      readFile(resolve(rootDirectory, 'packages/ui/src/components/UiRadioCardGroup.vue'), 'utf8'),
      readFile(resolve(rootDirectory, 'packages/ui/src/components/UiStatusBadge.vue'), 'utf8'),
      readFile(resolve(rootDirectory, 'packages/ui/src/components/UiPageHeader.vue'), 'utf8'),
    ])
  const overrides = themeOverrideObject(themeSource)

  if (overrides === undefined) {
    return ['The PAVP-to-Naive theme override object is unavailable.']
  }

  const [buttonTheme, buttonRender, nativeCommon] = await Promise.all([
    readFile(requireFromUi.resolve('naive-ui/es/button/styles/light.mjs'), 'utf8'),
    readFile(requireFromUi.resolve('naive-ui/es/button/src/Button.mjs'), 'utf8'),
    readFile(requireFromUi.resolve('naive-ui/es/_styles/common/_common.mjs'), 'utf8'),
  ])
  if (
    !/const\s*\{[^}]*heightSmall[^}]*\}\s*=\s*[\w$]+/u.test(buttonTheme) ||
    !/return\s*\{[^}]*heightTiny,[^}]*heightSmall,/u.test(buttonTheme) ||
    !buttonRender.includes('[createKey("height", size)]: height') ||
    !buttonRender.includes('"--n-height": text ? "initial" : height') ||
    !nativeCommon.includes('heightTiny: "22px"')
  )
    violations.push(
      'Naive Button Common-to-Small inheritance, Tiny branch or height consumption drifted.',
    )
  const overrideNames = staticObjectPropertyNames(overrides)
  const menuOverrides = objectPropertyObject(overrides, 'Menu')
  const menuPeers =
    menuOverrides === undefined ? undefined : objectPropertyObject(menuOverrides, 'peers')
  const rootDropdown = objectPropertyInitializer(overrides, 'Dropdown')
  const menuDropdown =
    menuPeers === undefined ? undefined : objectPropertyInitializer(menuPeers, 'Dropdown')
  if (
    rootDropdown === undefined ||
    !ts.isIdentifier(rootDropdown) ||
    menuDropdown?.getText() !== rootDropdown.getText() ||
    navigationDropdownThemeOverride(themeSource) === undefined ||
    !themeSource.includes('Dropdown: dropdownDark')
  )
    violations.push(
      'Workspace and Menu Dropdown must share one PAVP theme projection with the admitted dark theme.',
    )
  if (
    overrideNames === undefined ||
    !exactSet(overrideNames, [
      ...Object.keys(themeOverrideContract),
      ...Object.keys(scrollSystemThemeOverrideContract),
      'Layout',
      'Menu',
      'Dropdown',
      'Form',
    ])
  ) {
    violations.push('PAVP-to-Naive override component inventory drifted.')
  }

  for (const [component, expectedProperties] of Object.entries({
    ...themeOverrideContract,
    ...scrollSystemThemeOverrideContract,
  })) {
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
    ? 59
    : 58
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

  const radioTemplate = vueSfcCompiler.parse(radioCardSource, {
    filename: 'UiRadioCardGroup.vue',
  }).descriptor.template?.ast
  const radioElements =
    radioTemplate === undefined
      ? []
      : collectShellTemplateElements(radioTemplate).map((element) => element.node)
  const radioGroup = radioElements.find((node) => node.tag === 'NRadioGroup')
  const radioOption = radioElements.find((node) => node.tag === 'NRadioButton')
  const radioSlot = radioElements.find(
    (node) => node.tag === 'slot' && staticTemplateAttribute(node, 'name') === 'option',
  )
  const displayedValue =
    radioGroup === undefined ? undefined : singleBoundExpression(radioGroup, 'value')
  const optionValue =
    radioOption === undefined ? undefined : singleBoundExpression(radioOption, 'value')
  const radioSelectedProjections = [
    radioOption === undefined ? undefined : singleBoundExpression(radioOption, 'data-selected'),
    radioSlot === undefined ? undefined : singleBoundExpression(radioSlot, 'selected'),
  ]
  const matchingRadioSelection =
    displayedValue !== undefined &&
    optionValue !== undefined &&
    radioSelectedProjections.every(
      (expression) =>
        expression === `${optionValue} === ${displayedValue}` ||
        expression === `${displayedValue} === ${optionValue}`,
    )
  const radioOptionClasses =
    radioOption === undefined
      ? []
      : (staticTemplateAttribute(radioOption, 'class') ?? '').split(/\s+/u)
  const radioPointerRing = cssRuleBlocks(styleContent(radioCardSource)).some(
    (rule) =>
      /:focus(?:-within|-visible)?\b|:hover\b/u.test(rule.selector) &&
      radioOptionClasses.some((name) => name !== '' && rule.selector.includes(`.${name}`)) &&
      (/\boutline(?:-style|-width)?\s*:\s*(?!none\b|0(?:\s|;|$))[^;]+/u.test(rule.declarations) ||
        /\bbox-shadow\s*:[^;]*var\(--ui-admin-shadow-focus-ring\)/u.test(rule.declarations)),
  )
  if (
    !radioCardSource.includes('<NRadioGroup') ||
    !radioCardSource.includes('<NRadioButton') ||
    !radioCardSource.includes(':name="groupName"') ||
    !radioCardSource.includes(':disabled="disabled"') ||
    !matchingRadioSelection ||
    radioPointerRing ||
    !statusBadgeSource.includes('<NTag') ||
    !statusBadgeSource.includes('bordered') ||
    !statusBadgeSource.includes('var(--ui-color-status-success)') ||
    !statusBadgeSource.includes('var(--ui-color-text-on-status-success)') ||
    /\b(?:checkable|closable|strong)\b/u.test(templateContent(statusBadgeSource)) ||
    !pageHeaderSource.includes('<NBreadcrumb') ||
    !pageHeaderSource.includes('<NBreadcrumbItem')
  ) {
    violations.push('Retained UI composite rendered-state contract drifted.')
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
    runtimeNumber(designSystemConsoleProjection.publicRoleCount) !== 60 ||
    runtimeNumber(designSystemConsoleProjection.publicColorRoleCount) !== 30 ||
    runtimeNumber(designSystemConsoleProjection.manifestSchemaVersion) !== 12 ||
    runtimeNumber(designSystemConsoleProjection.manifestRecordCount) !== 438 ||
    !isDeepStrictEqual(designSystemConsoleProjection.builtInThemeIds, [
      'royal-iris',
      'cobalt-tide',
      'emerald-grove',
      'ember-coral',
      'berry-bloom',
    ]) ||
    runtimeNumber(runtimeKernelConsoleProjection.stepCount) !== 15 ||
    runtimeNumber(runtimeErrorCounts.total) !== 21 ||
    !isDeepStrictEqual(runtimeKernelConsoleProjection.activeProviderIds, ['pinia', 'appearance']) ||
    runtimeNumber(routerConsoleProjection.routeCount) !== 13 ||
    runtimeNumber(routerConsoleProjection.productRouteCount) !== 6 ||
    runtimeNumber(routerConsoleProjection.errorRouteCount) !== 7 ||
    runtimeCount(routerRecords) !== 13 ||
    runtimeNumber(storageConsoleProjection.recordCount) !== 8 ||
    runtimeCount(storageRecords) !== 8 ||
    runtimeCount(uiSystemConsoleProjection.publicComponentIds) !== 10 ||
    !isDeepStrictEqual(uiSystemConsoleProjection.inactivePublicComponentIds, [
      'ui-form',
      'ui-form-field',
    ]) ||
    runtimeString(uiSystemConsoleProjection.styledVendor.coordinate) !== 'naive-ui@2.45.2' ||
    runtimeCount(responsiveLayoutConsoleProjection.profiles) !== 3 ||
    runtimeCount(responsiveLayoutConsoleProjection.shellRegionIds) !== 5 ||
    runtimeCount(responsiveLayoutConsoleProjection.sizeTokens) !== 7 ||
    runtimeNumber(engineeringManifest.schemaVersion) !== 1 ||
    runtimeNumber(capabilityManifest.schemaVersion) !== 1 ||
    runtimeNumber(capabilityManifest.recordCount) !== 21 ||
    runtimeCount(capabilityRecords) !== 21 ||
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
    getDefaultConsoleMessage(group.labelKey),
    group.items.map((item) =>
      getDefaultConsoleMessage(getRouteRecord(item.destination.name).meta.titleKey),
    ),
  ])
  const navigationIconProjection = consoleNavigationRegistry.flatMap((group) =>
    group.items.map((item) => item.iconClass),
  )
  if (
    !isDeepStrictEqual(navigationProjection, [
      ['工作台', ['仪表盘']],
      ['设计令牌', ['语义配色', '尺寸与空间', '字体排印']],
      ['交互能力', ['交互与状态']],
    ]) ||
    !isDeepStrictEqual(navigationIconProjection, expectedNavigationIconClasses)
  ) {
    violations.push('Visible Chinese Sidebar taxonomy or Lucide projection drifted.')
  }

  return violations
}

export async function validateArchitectureAdminConsole(): Promise<readonly string[]> {
  const violations: string[] = []
  const appearanceAndFacts = await validateWorkbenchAndAppearanceAuthority()
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
  const nonAdapterUiFiles = allUiFiles.filter(
    (path) =>
      ['.ts', '.vue'].includes(extname(path)) &&
      !relative(rootDirectory, path).startsWith('packages/ui/src/adapters/naive/'),
  )
  const [applicationSources, allUiSources] = await Promise.all([
    Promise.all(applicationFiles.map((path) => readFile(path, 'utf8'))),
    Promise.all(allUiFiles.map((path) => readFile(path, 'utf8'))),
  ])
  const nonAdapterUiSources = allUiSources.filter((_source, index) =>
    nonAdapterUiFiles.includes(allUiFiles[index] ?? ''),
  )
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
    workspaceRetentionSource,
    themeSource,
    naiveProviderSource,
    shellSource,
    adminTokenSource,
    routeRegistrySource,
    architectureSource,
    runtimeContextSource,
    projectConfigSource,
    checkBundleSource,
    engineeringManifestSource,
    motionDomMaxSource,
    motionRuntimeSource,
    motionSelectionLensSource,
    motionPolicySource,
    publicUiRootSource,
  ] = await Promise.all([
    readFile(resolve(rootDirectory, 'pnpm-workspace.yaml'), 'utf8'),
    readFile(resolve(rootDirectory, 'pnpm-lock.yaml'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/package.json'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/package.json'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/App.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/workspace/workspace-retention.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/providers/UiProvider.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiAdminShell.vue'), 'utf8'),
    readFile(
      resolve(rootDirectory, 'packages/design-system/tokens/semantic/admin-console.tokens.json'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'apps/web/src/app/router/route-registry.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'ARCHITECTURE.md'), 'utf8'),
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
      resolve(rootDirectory, 'packages/ui/src/adapters/motion/motion-feature-runtime.ts'),
      'utf8',
    ),
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/motion/AdminNavigationSelectionLens.vue'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/motion/motion-policy.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/index.ts'), 'utf8'),
  ])
  const uiProviderSource = naiveProviderSource
  const [naiveDropdownSource, naiveMenuChildSource, naivePopoverSource, naiveSubmenuSource] =
    await Promise.all([
      readFile(requireFromUi.resolve('naive-ui/es/dropdown/src/Dropdown.mjs'), 'utf8'),
      readFile(requireFromUi.resolve('naive-ui/es/menu/src/use-menu-child.mjs'), 'utf8'),
      readFile(requireFromUi.resolve('naive-ui/es/popover/src/Popover.mjs'), 'utf8'),
      readFile(requireFromUi.resolve('naive-ui/es/menu/src/Submenu.mjs'), 'utf8'),
    ])
  const [appStylesSource, consoleFrameSource, generatedTokensCssSource, tokenBuildResult] =
    await Promise.all([
      readFile(resolve(rootDirectory, 'apps/web/src/app/styles/layers.css'), 'utf8'),
      readFile(resolve(rootDirectory, 'apps/web/src/app/console/ConsoleRouteFrame.vue'), 'utf8'),
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
    appTemplateSource: appSource,
    workspaceRetentionSource,
    consoleFrameSource,
    factImportViolation: appearanceAndFacts.factImportViolation,
    pageStorageSource: appearanceAndFacts.pageSource,
    competingAppearanceEnvironmentSource: appearanceAndFacts.competingEnvironmentSource,
    themeAdapterSource: themeSource,
    naiveProviderSource,
    uiProviderSource,
    shellSource,
    adminTokenSource,
    routeRegistrySource,
    errorTitles: Object.entries(routeTitleRegistry).filter(([key]) =>
      key.startsWith('route-title.error-'),
    ),
    generatedManifestsEqual:
      engineeringViolations.length === 0 && capabilityViolations.length === 0,
    generatedTokensCssSource,
    expectedTokensCssSource: formatRuntimeCss(tokenBuildResult),
    routeCount: routeRegistry.length,
    publicComponentExports,
    registeredPublicComponents: uiPublicComponentRegistry.records.map((record) => ({
      exportName: record.exportName,
      consumerCount: record.consumerRouteNames.length,
      capabilityStatus: record.capabilityStatus,
    })),
  }
  const navigationColors = await actualNavigationThemeColors()
  const navigationReworkBaseline: NavigationReworkSourceSnapshot = {
    applicationSource: applicationSources.join('\n'),
    providerSource: naiveProviderSource,
    runtimeContextSource,
    shellSource,
    themeSource,
    navigationColors,
  }
  const adminNavigationNativeSourceBaseline: AdminNavigationNativeSourceSnapshot = {
    adminNavigationMotionAdapterPresent,
    appSource,
    appStylesSource,
    applicationSource: [...applicationSources, ...allUiSources].join('\n'),
    architectureSource,
    checkBundleSource,
    consoleFrameSource,
    engineeringManifestSource,
    lockSource,
    motionDomMaxSource,
    motionRuntimeSource,
    motionSelectionLensSource,
    motionPolicySource,
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
    navigationColors,
    uiManifestSource,
    workspaceSource,
  }
  const navigationBudgetBaseline: NavigationBudgetGateSnapshot = {
    architectureSource,
    checkBundleSource,
    engineeringManifestSource,
    navigationSource: [naiveProviderSource, runtimeContextSource, shellSource, themeSource].join(
      '\n',
    ),
    projectConfigSource,
    routeCount: routeRegistry.length,
  }
  const negativeProbeResults = runArchitectureAdminConsoleNegativeProbes(baseline)
  const motionGeometryNegativeProbeResults = runMotionGeometryNegativeProbes(baseline)
  const runtime002NegativeProbeResults = runRuntime002NegativeProbes(baseline)
  const runtime005NegativeProbeResults = runRuntime005NegativeProbes(baseline)
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
  const navigationBudgetProbeResults = runNavigationBudgetProbes(navigationBudgetBaseline)
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
  if (navigationBudgetProbeResults.length !== expectedNavigationBudgetProbeCount) {
    violations.push(
      `Naive navigation budget probe count drifted: expected ${String(expectedNavigationBudgetProbeCount)}, received ${String(navigationBudgetProbeResults.length)}.`,
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
  violations.push(...buttonPaddingLexicalViolations(baseline))
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
  for (const result of navigationBudgetProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: in-memory Naive navigation budget probe did not match its expected result.`,
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

  console.log('Architecture Admin Console check: passed')
  console.log(
    `Workspace Axis default check: passed (20 directed edges across 3 layout profiles; Full/Reduced/None/typed fallback; ${String(expectedRouteTransitionWorkspaceDefaultNegativeProbeCount)}/${String(expectedRouteTransitionWorkspaceDefaultNegativeProbeCount)} reversible in-memory negative probes)`,
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
