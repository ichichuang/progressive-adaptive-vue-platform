import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import ts from 'typescript'
import { parse as parseYaml } from 'yaml'

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

interface AdminNavigationGsapSourceSnapshot {
  readonly applicationSource: string
  readonly motionAdapterSource: string
  readonly publicUiRootSource: string
  readonly shellSource: string
  readonly themeSource: string
}

interface AdminNavigationThemeReflowSourceSnapshot extends AdminNavigationGsapSourceSnapshot {
  readonly appearancePageSource: string
  readonly providerSource: string
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
const expectedGsapVersion = '3.15.0'
const expectedArchitectureAdminConsoleNegativeProbeCount = 59
const expectedMotionGeometryNegativeProbeCount = 12
const expectedRuntime002NegativeProbeCount = 10
const expectedRuntime005NegativeProbeCount = 10
const expectedAcceptanceClosureNegativeProbeCount = 5
const expectedRuntime003AdmissionNegativeProbeCount = 5
const expectedRuntime003AcceptanceClosureNegativeProbeCount = 6
const expectedAdminNavigationGsapAdmissionNegativeProbeCount = 12
const expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount = 12
const expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount = 12
const expectedAdminNavigationThemeReflowSourceInvariantCount = 8
const expectedAdminNavigationThemeReflowSourceNegativeProbeCount = 8
const expectedAdminNavigationGsapSourceInvariantCount = 12
const expectedAdminNavigationGsapSourceNegativeProbeCount = 12
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
const expectedInitialJavaScriptBudgetBytes = 224 * 1024
const expectedMinimumInitialJavaScriptHeadroomBytes = 8 * 1024
const expectedMaximumInitialJavaScriptBytes =
  expectedInitialJavaScriptBudgetBytes - expectedMinimumInitialJavaScriptHeadroomBytes
const expectedCheckBundleSha256 = '30e618541feb287a82a88076045d232091fb3eabaeb499fb2aae8da3fb1fd372'
const runtime003WorkItem = 'PAVP-RUNTIME-003'
const runtime003AdmissionAmendment = 'PAVP_RUNTIME_003_ADMISSION_AMENDMENT'
const runtime003AcceptanceStatement = '那没问题'
const runtime003ImplementationCommit = '3fa078ab75322a17e5e4514d0805f1efea06981b'
const shellSfcPath = 'packages/ui/src/components/UiAdminShell.vue'
const shellSfcScopeId = 'data-v-pavp-admin-shell'
const requireFromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
const vueSfcCompiler = requireFromWeb('vue/compiler-sfc') as VueSfcCompiler
const expectedNaiveUiIntegrity =
  'sha512-KshetbFOX/uZ/Pe+60hJoUAo47x5QO1JpZaUVPQCQkNhFfJ7hKsX55A8oMFQHccEpLuQUMPkJ41cX94R4nWUjg=='
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
    'colorDisabledPrimary',
    'colorFocusPrimary',
    'colorHoverPrimary',
    'colorPressedPrimary',
    'colorPrimary',
    'colorSecondary',
    'colorSecondaryHover',
    'colorSecondaryPressed',
    'fontSizeMedium',
    'heightMedium',
    'rippleColor',
    'rippleColorPrimary',
    'rippleDuration',
    'textColor',
    'textColorFocusPrimary',
    'textColorGhost',
    'textColorGhostDisabled',
    'textColorGhostHover',
    'textColorGhostPressed',
    'textColorHoverPrimary',
    'textColorPressedPrimary',
    'textColorDisabledPrimary',
    'textColorPrimary',
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
} as const

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
    fields: ['textColorGhostHover', 'textColorGhostPressed'],
    authority: 'color.control.primary',
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
        'textColorPressedPrimary',
        'self.textColorPressedPrimary via createKey("textColorPressed", mergedType)',
        ['--n-text-color-pressed'],
        'primary-pressed',
        '.n-button:active primary text',
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
] as const satisfies readonly Naive2452SharedConsumptionRecord[]

const naive2452UseThemeKeyContract = {
  Breadcrumb: 'Breadcrumb/-breadcrumb',
  Button: 'Button/-button',
  Descriptions: 'Descriptions/-descriptions',
  Radio: 'Radio/-radio-group',
  Tag: 'Tag/-tag',
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
  return /<template>([\s\S]*?)<\/template>/u.exec(source)?.[1] ?? ''
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
    '.pavp-admin-shell__navigation-chrome-bridge',
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
    '.pavp-admin-shell__navigation-chrome-bridge',
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
    "html[data-motion='full'] .pavp-admin-shell[data-pavp-admin-navigation-collapse-motion='ready'][data-pavp-admin-navigation-switch='active'] .pavp-admin-shell__sidebar",
    "html[data-motion='full'] .pavp-admin-shell[data-pavp-admin-navigation-collapse-motion='ready'][data-pavp-admin-navigation-switch='active'] .n-layout-sider__border",
    "html[data-material='reduced'] [data-pavp-admin-navigation='persistent'] .pavp-admin-shell__route-selection-aura",
    "html[data-material='solid'] [data-pavp-admin-navigation='persistent'] .pavp-admin-shell__route-selection-aura",
  ])
  const actualStateSelectors = new Set(
    stateRules
      .flatMap((rule) => rule.selector.split(',').map(normalizedCssSelector))
      .filter((selector) => selector.includes(' .pavp-admin-shell')),
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

  if (ts.isStringLiteral(value)) {
    const cssVariable = /^var\((--ui-[a-z0-9-]+)\)$/u.exec(value.text)?.[1]
    return cssVariable === undefined
      ? { authority: 'raw-literal', valueKind: 'unknown' }
      : cssVariableAuthority(cssVariable)
  }

  if (
    ts.isPropertyAccessExpression(value) &&
    /(?:breadcrumb|button|common|descriptions|radio|tag)Dark\.self/iu.test(value.getText())
  ) {
    return { authority: 'visible-vendor-default', valueKind: 'unknown' }
  }

  return { authority: 'unresolved', valueKind: 'unknown' }
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
      !exactSet(frozenOverrideKeys, themeOverrideContract[component]) ||
      !exactSet(frozenOverrideKeys, semanticFields) ||
      !exactSet(frozenOverrideKeys, actualFields) ||
      consumption.useThemeKey !== naive2452UseThemeKeyContract[component]
    ) {
      violations.push('NAIVE_2452_CONSUMPTION_CONTRACT')
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
  const expectedShellNavigationIconClasses = [...expectedNavigationIconClasses]
  if (
    !isDeepStrictEqual(navigationIconRecords, expectedNavigationIconClasses) ||
    !isDeepStrictEqual(shellNavigationIconClasses, expectedShellNavigationIconClasses) ||
    /\bglyph\s*:/u.test(snapshot.routeRegistrySource) ||
    !snapshot.shellSource.includes(':class="resolveNavigationIconClass(item.iconClass)"') ||
    !snapshot.shellSource.includes('class="pavp-admin-shell__navigation-icon"') ||
    !snapshot.shellSource.includes(
      'pavp-admin-shell__collapse-icon--expanded i-lucide-panel-left-close',
    ) ||
    !snapshot.shellSource.includes(
      'pavp-admin-shell__collapse-icon--collapsed i-lucide-panel-left-open',
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
    backdropLines.length !== 10 ||
    backdropLines.some((line) => !allowedBackdropDeclarations.has(line)) ||
    backdropLines.filter((line) => line.includes('blur(')).length !== 2 ||
    filterLines.length !== 0 ||
    exactOccurrenceCount(snapshot.shellSource, 'background: radial-gradient(') !== 2 ||
    exactOccurrenceCount(
      snapshot.shellSource,
      'color-mix(in srgb, var(--ui-admin-navigation-selected) 24%, transparent) 0,',
    ) !== 2 ||
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
    violations.push('PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_CURRENT_WORK')
  }

  if (
    canonicalWork !== adminNavigationHighlightRevealWorkPackage ||
    canonicalAuthority !== adminNavigationHighlightRevealAdmissionAmendment
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
    `CURRENT_BOUNDED_WORK_AUTHORITY=${adminNavigationHighlightRevealAdmissionAmendment}`,
    `CURRENT_BOUNDED_WORK=${adminNavigationHighlightRevealWorkPackage}`,
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
    `CHECK_BUNDLE_SHA256=${expectedCheckBundleSha256}`,
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
      workValues[0] !== adminNavigationHighlightRevealWorkPackage ||
      authorityValues[0] !== adminNavigationHighlightRevealAdmissionAmendment
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
    allCurrentWorkMarkers.length !== expectedAdminNavigationHighlightRevealActiveMirrorCount ||
    allCurrentWorkAuthorityMarkers.length !==
      expectedAdminNavigationHighlightRevealActiveMirrorCount ||
    allCurrentWorkMarkers.some((value) => value !== adminNavigationHighlightRevealWorkPackage) ||
    allCurrentWorkAuthorityMarkers.some(
      (value) => value !== adminNavigationHighlightRevealAdmissionAmendment,
    )
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
    'GSAP_GLOBAL_STATUS_REMAINS_DEFERRED',
    'GSAP_INSTANCE_ADMISSION_COUNT_IS_1',
  ] as const
  const requiredAdminNavigationThemeReflowFinalInvariantMarkers = [
    `${adminNavigationThemeReflowAdmissionAmendment}_IS_FROZEN`,
    `${adminNavigationThemeReflowWorkPackage}_STATUS_IS_OPEN`,
    `${adminNavigationThemeReflowWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_COMPLETE`,
    `${adminNavigationThemeReflowWorkPackage}_STATIC_VERIFICATION_IS_PASS`,
  ] as const
  const requiredAdminNavigationHighlightRevealFinalInvariantMarkers = [
    `${adminNavigationHighlightRevealAdmissionAmendment}_IS_FROZEN`,
    `CURRENT_BOUNDED_WORK_AUTHORITY_IS_${adminNavigationHighlightRevealAdmissionAmendment}`,
    `CURRENT_BOUNDED_WORK_IS_${adminNavigationHighlightRevealWorkPackage}`,
    `${adminNavigationHighlightRevealWorkPackage}_STATUS_IS_OPEN`,
    `${adminNavigationHighlightRevealWorkPackage}_REPOSITORY_IMPLEMENTATION_IS_NOT_STARTED`,
    `${adminNavigationHighlightRevealWorkPackage}_STATIC_VERIFICATION_IS_NOT_RUN`,
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
        `CURRENT_BOUNDED_WORK=${adminNavigationHighlightRevealWorkPackage}`,
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
        `CURRENT_BOUNDED_WORK=${adminNavigationHighlightRevealWorkPackage}`,
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
      'admin-navigation-highlight-reveal-current-work-left-as-theme-reflow',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_CURRENT_WORK',
      architectureSource.replace(
        `CURRENT_BOUNDED_WORK=${adminNavigationHighlightRevealWorkPackage}`,
        `CURRENT_BOUNDED_WORK=${adminNavigationThemeReflowWorkPackage}`,
      ),
    ],
    [
      'admin-navigation-highlight-reveal-current-work-id-unauthorized',
      'PAVP_ADMIN_NAVIGATION_HIGHLIGHT_REVEAL_CURRENT_WORK',
      architectureSource.replace(
        `CURRENT_BOUNDED_WORK=${adminNavigationHighlightRevealWorkPackage}`,
        'CURRENT_BOUNDED_WORK=PAVP-UNAUTHORIZED-WORK',
      ),
    ],
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
  const persistentMenuStart = shellSource.indexOf('<PavpMenuPrimitive')
  const navigationDockStart = shellSource.indexOf('class="pavp-admin-shell__navigation-dock"')
  const persistentNavigationEnd = shellSource.indexOf('</nav>', persistentMenuStart)
  const normalNodeStart = shellSource.indexOf('const persistentNavigationNodeProps')
  const dropdownNodeStart = shellSource.indexOf('const persistentNavigationDropdownNodeProps')
  const dropdownPropsStart = shellSource.indexOf('const persistentNavigationDropdownProps')
  const normalNodeSource = shellSource.slice(normalNodeStart, dropdownNodeStart)
  const dropdownNodeSource = shellSource.slice(dropdownNodeStart, dropdownPropsStart)
  const vendorMotionSource = `${providerSource}\n${shellSource}`
  const expandedProjectionSemantics = adminNavigationExpandedProjectionSemantics(shellSource)
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
      occurrences(shellSource, ':collapsed-width="collapsedNavigationWidth"') === 3,
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
        occurrences(shellSource, ':collapsed="persistentNavigationCollapsed"') === 1 &&
        occurrences(shellSource, ':collapsed="false"') === 1 &&
        occurrences(shellSource, ':collapsed="true"') === 1,
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
      shellSource.includes('ref="content"') &&
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
      shellSource.includes("overflow: 'var(--pavp-admin-navigation-sider-content-overflow)',") &&
        shellSource.includes('--pavp-admin-navigation-sider-content-overflow: hidden;') &&
        shellSource.includes(
          ".pavp-admin-shell[data-pavp-admin-navigation-switch='active'] {\n  --pavp-admin-navigation-sider-content-overflow: visible;\n}",
        ) &&
        shellSource.includes(':native-scrollbar="true"'),
    ],
    [
      'NAV_WIDE_CONTROL_VISIBILITY',
      persistentMenuStart !== -1 &&
        navigationDockStart > persistentMenuStart &&
        persistentNavigationEnd > navigationDockStart &&
        /v-if="profile === 'wide'"[\s\S]{0,320}class="pavp-admin-shell__navigation-dock"[\s\S]{0,420}@click="toggleWideNavigation"/u.test(
          shellSource,
        ),
    ],
    [
      'NAV_WIDE_CONTROL_LABELS',
      shellSource.includes("wideNavigationCollapsed.value ? '展开导航' : '收起导航'"),
    ],
    [
      'NAV_WIDE_CONTROL_ICON',
      shellSource.includes('pavp-admin-shell__collapse-icon--expanded i-lucide-panel-left-close') &&
        shellSource.includes('pavp-admin-shell__collapse-icon--collapsed i-lucide-panel-left-open'),
    ],
    [
      'NAV_WIDE_CONTROL_TARGET',
      shellSource.includes(
        'pavp-admin-shell__collapse-action min-h-target-enhanced min-w-target-enhanced',
      ),
    ],
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
      expandedProjectionSemantics.activeParentIncluded &&
        expandedProjectionSemantics.lifecycleMutationFree &&
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
      shellSource.includes('event.currentTarget.click()') &&
        !/\b(?:querySelector|getElementById|closest)\s*\(/u.test(shellSource),
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
      shellSource.includes("trigger: 'click'") &&
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
      'navigation-source-hover-popup-restored',
      'NAV_POPUP_OWNERSHIP',
      changedNavigationReworkSource(
        baseline,
        'shellSource',
        "  trigger: 'click',",
        "  trigger: 'hover',",
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
        '    event.currentTarget.click()',
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

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
      callables.set(statement.name.text, statement)
      continue
    }
    if (!ts.isVariableStatement(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer !== undefined &&
        (ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer))
      ) {
        callables.set(declaration.name.text, declaration.initializer)
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

  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === refName &&
    expression.name.text === 'value'
  ) {
    return true
  }

  if (ts.isElementAccessExpression(expression) || ts.isPropertyAccessExpression(expression)) {
    return isRefValueWriteTarget(expression.expression, refName)
  }

  return false
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
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      isRefValueWriteTarget(node.operand, refName)
    ) {
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
    menuNodes.length === 2 &&
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
              node.tag === 'button' &&
              hasStaticTemplateClass(node, 'pavp-admin-shell__collapse-action'),
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

function adminNavigationGsapSourceInvariantResults(
  snapshot: AdminNavigationGsapSourceSnapshot,
): readonly (readonly [string, boolean])[] {
  const normalizedShellSource = snapshot.shellSource.replaceAll(/\s+/gu, ' ')
  const normalizedThemeSource = snapshot.themeSource.replaceAll(/\s+/gu, ' ')
  const normalizedMotionAdapterSource = snapshot.motionAdapterSource.replaceAll(/\s+/gu, ' ')
  const fullModeScaleBranches = [
    ...snapshot.motionAdapterSource.matchAll(
      /if\s*\(state\.motion === 'full'\)\s*\{[\s\S]{0,320}?values(?:\.scale|\['scale'\])/gu,
    ),
  ]
  const motionScaleAssignments = [
    ...snapshot.motionAdapterSource.matchAll(/values(?:\.scale|\['scale'\])/gu),
  ]
  const visibilityListenerAdds = [
    ...snapshot.motionAdapterSource.matchAll(
      /document\.addEventListener\(\s*['"]visibilitychange['"]\s*,\s*([A-Za-z_$][\w$]*)\s*\)/gu,
    ),
  ].map((match) => match[1] ?? '')
  const visibilityListenerRemovals = [
    ...snapshot.motionAdapterSource.matchAll(
      /document\.removeEventListener\(\s*['"]visibilitychange['"]\s*,\s*([A-Za-z_$][\w$]*)\s*\)/gu,
    ),
  ].map((match) => match[1] ?? '')
  const unmountBlock =
    /onBeforeUnmount\(\(\) => \{([\s\S]{0,720}?)\n\}\)/u.exec(snapshot.shellSource)?.[1] ?? ''
  const shellMotionImport = "import('../adapters/gsap/admin-navigation-motion')"
  const adapterGsapImport = "import { gsap } from 'gsap'"
  const prohibitedGsapProperty =
    /\b(?:background|backgroundColor|border|borderColor|bottom|display|height|inset|left|margin|maxWidth|padding|right|top|width|y|zIndex)\s*:/u
  const prohibitedAdapterDomAccess =
    /\.(?:closest|getElementById|matches|parentElement|querySelector|querySelectorAll)\s*\(/u
  const prohibitedGlobalSideEffect =
    /\b(?:requestAnimationFrame|setInterval|setTimeout|registerPlugin|ScrollTrigger)\b|\b(?:document|window)\.(?:on|addEventListener\(\s*['"](?:keydown|keyup|mousedown|mousemove|mouseup|pointerdown|pointermove|pointerup|scroll|touchend|touchmove|touchstart|wheel))/u
  const routeMotionStart = snapshot.motionAdapterSource.indexOf('function animateRoute(')
  const routeMotionEnd = snapshot.motionAdapterSource.indexOf(
    'function syncMotion(',
    routeMotionStart,
  )
  const routeMotionSource = snapshot.motionAdapterSource.slice(routeMotionStart, routeMotionEnd)

  return Object.freeze([
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_LAZY_PRIVATE_BOUNDARY',
      exactOccurrenceCount(snapshot.shellSource, shellMotionImport) === 1 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, adapterGsapImport) === 1 &&
        !snapshot.applicationSource.includes('gsap') &&
        !snapshot.publicUiRootSource.includes('gsap') &&
        !snapshot.publicUiRootSource.includes('admin-navigation-motion'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_BOTTOM_DOCK_STRUCTURE',
      exactOccurrenceCount(snapshot.shellSource, '<PavpMenuPrimitive') === 2 &&
        normalizedShellSource.includes(':collapsed="false"') &&
        normalizedShellSource.includes(':collapsed="true"') &&
        normalizedShellSource.includes(
          '<div v-if="profile === \'wide\'" class="pavp-admin-shell__navigation-dock"',
        ) &&
        normalizedShellSource.includes(':aria-label="wideNavigationCollapseLabel"') &&
        /pavp-admin-shell__navigation-dock[\s\S]{0,640}<button[\s\S]{0,640}@click="[^"]+"/u.test(
          snapshot.shellSource,
        ) &&
        snapshot.shellSource.includes('grid-template-rows: minmax(0, 1fr) auto;') &&
        snapshot.shellSource.includes('.pavp-admin-shell__navigation-dock::before') &&
        snapshot.shellSource.includes(
          'border-block-start-color: var(--ui-color-border-default);',
        ) &&
        snapshot.shellSource.includes('border-block-start-style: solid;') &&
        snapshot.shellSource.includes('border-block-start-width: var(--ui-admin-border-width);') &&
        snapshot.shellSource.includes('inset-inline: var(--ui-space-content-gap);') &&
        snapshot.shellSource.includes('padding-inline: 0;') &&
        snapshot.shellSource.includes("[data-pavp-admin-navigation-switch='active']") &&
        snapshot.shellSource.indexOf('class="pavp-admin-shell__menu"') <
          snapshot.shellSource.indexOf('class="pavp-admin-shell__navigation-dock"'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_ROUTE_DOT_SEMANTICS',
      normalizedShellSource.includes(
        "h('span', { 'aria-hidden': 'true', class: 'pavp-admin-shell__route-selection-aura', 'data-selected': routeName === props.activeRouteName ? 'true' : 'false',",
      ) &&
        normalizedShellSource.includes(
          "'aria-current': routeName === props.activeRouteName ? 'page' : undefined",
        ) &&
        normalizedShellSource.includes(
          "[data-pavp-admin-navigation='persistent'] .pavp-admin-shell__route-selection-aura { position: absolute;",
        ) &&
        snapshot.shellSource.includes('pointer-events: none;') &&
        snapshot.shellSource.includes('visibility: hidden;') &&
        snapshot.shellSource.includes('transform-origin: center center;'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_VISUAL_OWNERSHIP',
      normalizedThemeSource.includes('itemColorActive: navigationSelectedSurface') &&
        normalizedThemeSource.includes('itemColorActiveHover: navigationSelectedSurface') &&
        normalizedThemeSource.includes('itemColorActiveCollapsed: navigationSelectedSurface') &&
        !normalizedThemeSource.includes('itemColorChildActive:') &&
        normalizedShellSource.includes(
          '.pavp-admin-shell__navigation-plane--collapsed .n-menu .n-menu-item-content--child-active::before',
        ) &&
        !snapshot.motionAdapterSource.includes('materialOverlay'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_PSEUDO_DOT_MOTION',
      snapshot.shellSource.includes(
        "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,",
      ) &&
        snapshot.shellSource.includes(
          '.pavp-admin-navigation-dropdown .n-dropdown-option-body::after {',
        ) &&
        exactOccurrenceCount(snapshot.shellSource, 'var(--ui-admin-navigation-selected) 24%') >=
          2 &&
        exactOccurrenceCount(snapshot.shellSource, 'background: radial-gradient(') === 2 &&
        normalizedShellSource.includes(
          "html[data-motion='reduced'] .pavp-admin-shell__navigation-action::after, html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after, html[data-motion='reduced'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after, html[data-motion='none'] .pavp-admin-shell__navigation-action::after, html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after, html[data-motion='none'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after { transform: translateY(-50%) scale(1); }",
        ),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_EXPLICIT_TARGETS',
      snapshot.motionAdapterSource.includes(
        'readonly routeSelectionAuras: ReadonlyMap<string, HTMLElement>',
      ) &&
        snapshot.motionAdapterSource.includes('readonly mainContentPlane: HTMLElement | null') &&
        snapshot.motionAdapterSource.includes(
          'readonly expandedNavigationPlane: HTMLElement | null',
        ) &&
        snapshot.motionAdapterSource.includes('readonly root: HTMLElement') &&
        snapshot.shellSource.includes('routeSelectionAuras: resolvedRouteSelectionAuras()') &&
        !prohibitedAdapterDomAccess.test(snapshot.motionAdapterSource),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_PROPERTY_OWNERSHIP',
      snapshot.motionAdapterSource.includes('autoAlpha:') &&
        motionScaleAssignments.length > 0 &&
        snapshot.motionAdapterSource.includes("overwrite: 'auto'") &&
        !prohibitedGsapProperty.test(snapshot.motionAdapterSource) &&
        snapshot.motionAdapterSource.includes(
          "gsap.quickSetter(targets.mainContentPlane, 'x', 'px')",
        ) &&
        !/\b(?:x|translateX)\s*:/u.test(routeMotionSource) &&
        !snapshot.motionAdapterSource.includes('willChange'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_MOTION_MODE_PARITY',
      normalizedMotionAdapterSource.includes("state.profile !== 'wide'") &&
        normalizedMotionAdapterSource.includes("state.motion === 'none'") &&
        normalizedMotionAdapterSource.includes("document.visibilityState === 'hidden'") &&
        normalizedMotionAdapterSource.includes(
          "cause === 'initialize' || cause === 'profile' || cause === 'preference'",
        ) &&
        snapshot.motionAdapterSource.includes(
          "return motion === 'reduced' ? seconds / 2 : seconds",
        ) &&
        fullModeScaleBranches.length === 4 &&
        motionScaleAssignments.length === 4 &&
        !snapshot.motionAdapterSource.includes("state.motion === 'reduced'") &&
        snapshot.shellSource.includes(
          ".pavp-admin-shell:not([data-pavp-admin-navigation-collapse-motion='ready'])",
        ) &&
        snapshot.shellSource.includes(
          ".pavp-admin-shell:not([data-pavp-admin-navigation-route-motion='ready'])",
        ),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_INTERRUPTION_AND_REVERSAL',
      exactOccurrenceCount(snapshot.motionAdapterSource, '.kill()') >= 3 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, '.revert()') >= 2 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, '.reverse()') >= 2 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, "eventCallback('onComplete'") === 2 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, "eventCallback('onReverseComplete'") ===
          2 &&
        snapshot.motionAdapterSource.includes('removeAttribute(readyAttribute)') &&
        exactOccurrenceCount(snapshot.motionAdapterSource, "overwrite: 'auto'") >= 2,
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_VISIBILITY_LIFECYCLE',
      visibilityListenerAdds.length === 1 &&
        isDeepStrictEqual(visibilityListenerAdds, visibilityListenerRemovals) &&
        snapshot.motionAdapterSource.includes("document.visibilityState === 'hidden'") &&
        snapshot.motionAdapterSource.includes('deactivate()'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_UNMOUNT_AND_LAZY_FALLBACK',
      /\+=\s*1/u.test(unmountBlock) &&
        unmountBlock.includes('?.dispose()') &&
        unmountBlock.includes('.clear()') &&
        snapshot.shellSource.includes('.catch((error: unknown) => {') &&
        snapshot.shellSource.includes('globalThis.reportError(error)') &&
        snapshot.shellSource.includes(".removeAttribute('data-pavp-admin-navigation-motion')") &&
        snapshot.shellSource.includes(
          ".removeAttribute('data-pavp-admin-navigation-collapse-motion')",
        ) &&
        snapshot.shellSource.includes(
          ".removeAttribute('data-pavp-admin-navigation-route-motion')",
        ) &&
        snapshot.shellSource.includes(
          ".pavp-admin-shell:not([data-pavp-admin-navigation-collapse-motion='ready'])",
        ) &&
        snapshot.shellSource.includes(
          ".pavp-admin-shell:not([data-pavp-admin-navigation-route-motion='ready'])",
        ),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_GSAP_GLOBAL_SIDE_EFFECTS',
      !prohibitedGlobalSideEffect.test(snapshot.motionAdapterSource) &&
        exactOccurrenceCount(snapshot.motionAdapterSource, 'document.addEventListener(') === 1 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, 'document.removeEventListener(') === 1,
    ]),
  ])
}

function adminNavigationGsapSourceViolations(
  snapshot: AdminNavigationGsapSourceSnapshot,
): string[] {
  return adminNavigationGsapSourceInvariantResults(snapshot)
    .filter(([, passed]) => !passed)
    .map(([failureCode]) => failureCode)
}

function runAdminNavigationGsapSourceNegativeProbes(
  baseline: AdminNavigationGsapSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationGsapSourceViolations(baseline)
  const probes: readonly [string, string, AdminNavigationGsapSourceSnapshot][] = [
    [
      'admin-navigation-gsap-changes-private-lazy-root',
      'ADMIN_NAV_GSAP_LAZY_PRIVATE_BOUNDARY',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "import('../adapters/gsap/admin-navigation-motion')",
          "import('../adapters/gsap/other-motion')",
        ),
      },
    ],
    [
      'admin-navigation-gsap-collapses-label-geometry-during-active-motion',
      'ADMIN_NAV_GSAP_BOTTOM_DOCK_STRUCTURE',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          'grid-template-rows: minmax(0, 1fr) auto;',
          'grid-template-rows: minmax(0, 1fr);',
        ),
      },
    ],
    [
      'admin-navigation-gsap-removes-route-dot-decoration-semantics',
      'ADMIN_NAV_GSAP_ROUTE_DOT_SEMANTICS',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "'data-selected': routeName === props.activeRouteName ? 'true' : 'false',",
          "'data-state': routeName === props.activeRouteName ? 'true' : 'false',",
        ),
      },
    ],
    [
      'admin-navigation-gsap-adds-expanded-root-active-surface',
      'ADMIN_NAV_GSAP_VISUAL_OWNERSHIP',
      {
        ...baseline,
        themeSource: baseline.themeSource.replace(
          'itemColorActiveCollapsed: navigationSelectedSurface,',
          'itemColorActiveCollapsed: navigationSelectedSurface,\n      itemColorChildActive: navigationSelectedSurface,',
        ),
      },
    ],
    [
      'admin-navigation-gsap-scales-reduced-and-none-pseudo-dots',
      'ADMIN_NAV_GSAP_PSEUDO_DOT_MOTION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replaceAll(
          'transform: translateY(-50%) scale(1);',
          'transform: translateY(-50%) scale(0.72);',
        ),
      },
    ],
    [
      'admin-navigation-gsap-queries-vendor-dom',
      'ADMIN_NAV_GSAP_EXPLICIT_TARGETS',
      {
        ...baseline,
        motionAdapterSource: `${baseline.motionAdapterSource}\noptions.root.querySelector('.n-menu-item')`,
      },
    ],
    [
      'admin-navigation-gsap-writes-route-geometry',
      'ADMIN_NAV_GSAP_PROPERTY_OWNERSHIP',
      {
        ...baseline,
        motionAdapterSource: baseline.motionAdapterSource.replace(
          "const values: gsap.TweenVars = {\n      autoAlpha: (index: number) => (entries[index]?.[0] === state.activeRouteName ? 1 : 0),\n      overwrite: 'auto',\n    }",
          "const values: gsap.TweenVars = {\n      autoAlpha: (index: number) => (entries[index]?.[0] === state.activeRouteName ? 1 : 0),\n      overwrite: 'auto',\n      x: 8,\n    }",
        ),
      },
    ],
    [
      'admin-navigation-gsap-scales-reduced-mode',
      'ADMIN_NAV_GSAP_MOTION_MODE_PARITY',
      {
        ...baseline,
        motionAdapterSource: baseline.motionAdapterSource.replace(
          "state.motion === 'full'",
          "state.motion === 'reduced'",
        ),
      },
    ],
    [
      'admin-navigation-gsap-keeps-interrupted-tweens',
      'ADMIN_NAV_GSAP_INTERRUPTION_AND_REVERSAL',
      {
        ...baseline,
        motionAdapterSource: baseline.motionAdapterSource.replace(
          'collapseTimeline?.kill()',
          'collapseTimeline?.pause()',
        ),
      },
    ],
    [
      'admin-navigation-gsap-leaks-visibility-listener',
      'ADMIN_NAV_GSAP_VISIBILITY_LIFECYCLE',
      {
        ...baseline,
        motionAdapterSource: baseline.motionAdapterSource.replace(
          'document.removeEventListener(',
          'document.addEventListener(',
        ),
      },
    ],
    [
      'admin-navigation-gsap-skips-unmount-disposal',
      'ADMIN_NAV_GSAP_UNMOUNT_AND_LAZY_FALLBACK',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          /(onBeforeUnmount\(\(\) => \{[\s\S]{0,360}?)\?\.dispose\(\)/u,
          '$1?.toString()',
        ),
      },
    ],
    [
      'admin-navigation-gsap-adds-global-timer',
      'ADMIN_NAV_GSAP_GLOBAL_SIDE_EFFECTS',
      {
        ...baseline,
        motionAdapterSource: `${baseline.motionAdapterSource}\nsetTimeout(() => undefined, 0)`,
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationGsapSourceViolations(mutatedSnapshot)

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

function adminNavigationThemeReflowSourceInvariantResults(
  snapshot: AdminNavigationThemeReflowSourceSnapshot,
): readonly (readonly [string, boolean])[] {
  const normalizedShellSource = snapshot.shellSource.replaceAll(/\s+/gu, ' ')
  const normalizedThemeSource = snapshot.themeSource.replaceAll(/\s+/gu, ' ')
  const normalizedProviderSource = snapshot.providerSource.replaceAll(/\s+/gu, ' ')
  const selectedSurfaceFormula =
    'color-mix(in srgb, var(--ui-admin-navigation-selected) 12%, var(--ui-material-overlay-background))'
  const parsedShellSfc = vueSfcCompiler.parse(snapshot.shellSource, { filename: shellSfcPath })
  const shellTemplateRoot = parsedShellSfc.descriptor.template?.ast
  const shellTemplateElements =
    shellTemplateRoot === undefined ? [] : collectShellTemplateElements(shellTemplateRoot)
  const persistentMenuNodes = shellTemplateElements
    .filter(({ node }) => node.tag === 'PavpMenuPrimitive')
    .map(({ node }) => node)
  const expandedKeyBindings = persistentMenuNodes.map((node) =>
    normalizeTemplateExpression(templateDirectives(node, 'bind', 'expanded-keys')[0]?.exp?.content),
  )
  const collapsedBindings = persistentMenuNodes.map((node) =>
    normalizeTemplateExpression(templateDirectives(node, 'bind', 'collapsed')[0]?.exp?.content),
  )
  const siderNode = shellTemplateElements.find(
    ({ node }) => node.tag === 'PavpLayoutSiderPrimitive',
  )?.node
  const persistentCollapsedBinding = normalizeTemplateExpression(
    siderNode === undefined
      ? undefined
      : templateDirectives(siderNode, 'bind', 'collapsed')[0]?.exp?.content,
  )
  const expandedProjectionName =
    expandedKeyBindings.length === 2 &&
    expandedKeyBindings[0] !== '' &&
    expandedKeyBindings[0] === expandedKeyBindings[1] &&
    /^[A-Za-z_$][\w$]*$/u.test(expandedKeyBindings[0] ?? '')
      ? expandedKeyBindings[0]
      : undefined
  const shellScriptSource = scriptContent(snapshot.shellSource)
  const shellScriptAst = ts.createSourceFile(
    'UiAdminShell.ts',
    shellScriptSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const shellInitializers = themeVariableInitializers(shellScriptAst)
  const menuOptionsInitializer = shellInitializers.get('navigationMenuOptions')
  const renderedExpandedKeysInitializer =
    expandedProjectionName === undefined ? undefined : shellInitializers.get(expandedProjectionName)
  const renderedExpandedKeysSource = renderedExpandedKeysInitializer?.getText(shellScriptAst) ?? ''
  const motionAdapterAst = ts.createSourceFile(
    'admin-navigation-motion.ts',
    snapshot.motionAdapterSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const motionInitializers = themeVariableInitializers(motionAdapterAst)
  const collapseMotionAttributeInitializer = motionInitializers.get('collapseMotionAttribute')
  const routeMotionAttributeInitializer = motionInitializers.get('routeMotionAttribute')
  const routeMotionSource =
    nestedFunctionDeclaration(motionAdapterAst, 'animateRoute')?.getText(motionAdapterAst) ?? ''
  const collapseReversalSource =
    nestedFunctionDeclaration(motionAdapterAst, 'continueCollapseReversal')?.getText(
      motionAdapterAst,
    ) ?? ''
  const shellStyleRules = cssRuleBlocks(styleContent(snapshot.shellSource))
  const appearanceStyleRules = cssRuleBlocks(styleContent(snapshot.appearancePageSource))
  const auraSelector =
    "[data-pavp-admin-navigation='persistent'] .pavp-admin-shell__route-selection-aura"
  const auraDeclarations = cssDeclarationsForSelector(shellStyleRules, auraSelector) ?? ''
  const materialFallbackSelectors = [
    `html[data-material='reduced'] ${auraSelector}`,
    "html[data-material='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after",
    "html[data-material='reduced'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after",
    `html[data-material='solid'] ${auraSelector}`,
    "html[data-material='solid'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after",
    "html[data-material='solid'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after",
  ] as const
  const forcedColorsSelectedSurfaceSelectors = [
    "[data-pavp-admin-navigation='persistent'] .pavp-admin-shell__navigation-plane--expanded .pavp-admin-shell__menu.n-menu .n-menu-item-content.n-menu-item-content--selected::before",
    "[data-pavp-admin-navigation='persistent'] .pavp-admin-shell__navigation-plane--collapsed .pavp-admin-shell__menu.n-menu .n-menu-item-content.n-menu-item-content--child-active::before",
    ".pavp-admin-navigation-dropdown.n-dropdown-menu .n-dropdown-option[aria-current='page'] .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)::before",
  ] as const
  const forcedColorsSelectedForegroundSelectors = [
    "[data-pavp-admin-navigation='persistent'] .pavp-admin-shell__navigation-plane--expanded .pavp-admin-shell__menu.n-menu .n-menu-item-content.n-menu-item-content--selected :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header)",
    "[data-pavp-admin-navigation='persistent'] .pavp-admin-shell__navigation-plane--collapsed .pavp-admin-shell__menu.n-menu .n-menu-item-content.n-menu-item-content--child-active :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header)",
    ".pavp-admin-navigation-dropdown.n-dropdown-menu .n-dropdown-option[aria-current='page'] .n-dropdown-option-body:not(.n-dropdown-option-body--disabled) :is(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label)",
  ] as const
  const collapsedSelectedSelectors = shellStyleRules.flatMap((rule) =>
    splitCssSelectorList(rule.selector)
      .map(normalizedCssSelector)
      .filter((selector) => selector.includes('.n-menu-item-content--child-active')),
  )
  const collapsedActiveHoverRules = shellStyleRules.flatMap((rule) =>
    splitCssSelectorList(rule.selector)
      .map(normalizedCssSelector)
      .filter(
        (selector) =>
          selector.includes('.pavp-admin-shell__navigation-plane--collapsed') &&
          selector.includes('.n-menu-item-content--child-active') &&
          selector.includes('::before') &&
          (selector.includes('.n-menu-item-content--hover') || selector.includes(':hover')),
      )
      .map((selector) => ({ declarations: rule.declarations, selector })),
  )
  const collapsedHoverRetainsSelectedSurface =
    collapsedActiveHoverRules.length > 0 &&
    collapsedActiveHoverRules.some((rule) =>
      rule.selector.includes('.n-menu-item-content--hover'),
    ) &&
    collapsedActiveHoverRules.some((rule) => rule.selector.includes(':hover')) &&
    collapsedActiveHoverRules.every((rule) => {
      if (!/(?:^|\s)\.n-menu(?:\s|$)/u.test(rule.selector)) {
        return false
      }

      const backgroundValues = rule.declarations.split(';').flatMap((declaration) => {
        const separatorIndex = declaration.indexOf(':')
        return separatorIndex >= 0 && declaration.slice(0, separatorIndex).trim() === 'background'
          ? [
              declaration
                .slice(separatorIndex + 1)
                .replaceAll(/\s+/gu, ' ')
                .replaceAll(/\(\s+/gu, '(')
                .replaceAll(/\s+\)/gu, ')')
                .trim(),
            ]
          : []
      })
      return isDeepStrictEqual(backgroundValues, [selectedSurfaceFormula])
    })
  const dockSelector = '.pavp-admin-shell__navigation-dock'
  const dockPseudoSelector = '.pavp-admin-shell__navigation-dock::before'
  const collapseActionSelector = '.pavp-admin-shell__collapse-action'
  const collapseForegroundSelector = '.pavp-admin-shell__collapse-foreground'
  const navigationChromeBridgeSelector = '.pavp-admin-shell__navigation-chrome-bridge'
  const stableOverflowSelector = '.pavp-admin-shell'
  const switchOverflowSelector = ".pavp-admin-shell[data-pavp-admin-navigation-switch='active']"
  const allSwitchOverflowDeclarations = shellStyleRules.flatMap((rule) =>
    selectorDeclarationValues(
      [rule],
      normalizedCssSelector(rule.selector.split(',')[0] ?? ''),
      '--pavp-admin-navigation-sider-content-overflow',
    ),
  )
  const wideGallerySelector =
    ":global(.pavp-admin-shell[data-layout-profile='wide']) .pavp-appearance-theme-gallery"
  const prohibitedMotionProperty =
    /\b(?:background|backgroundColor|backdropFilter|border|borderColor|bottom|display|filter|flexBasis|height|inset|left|margin|maxWidth|minWidth|padding|right|top|width|y|zIndex)\s*:/u
  const prohibitedMotionDomAccess =
    /\.(?:closest|getElementById|matches|parentElement|querySelector|querySelectorAll)\s*\(/u
  const lazyFailureCleanup =
    /\.catch\(\(error: unknown\) => \{[\s\S]{0,960}?removeAttribute\('data-pavp-admin-navigation-motion'\)[\s\S]{0,240}?removeAttribute\('data-pavp-admin-navigation-collapse-motion'\)[\s\S]{0,240}?removeAttribute\('data-pavp-admin-navigation-route-motion'\)[\s\S]{0,240}?removeAttribute\('data-pavp-admin-navigation-switch'\)[\s\S]{0,240}?reportAdminNavigationMotionFailure\(error\)/u

  function containsAstNode(
    root: ts.Node | undefined,
    predicate: (node: ts.Node) => boolean,
  ): boolean {
    if (root === undefined) {
      return false
    }

    let found = false
    function visit(node: ts.Node): void {
      if (found || predicate(node)) {
        found = true
        return
      }
      ts.forEachChild(node, visit)
    }
    visit(root)
    return found
  }

  function nestedFunctionDeclaration(
    root: ts.Node,
    name: string,
  ): ts.FunctionDeclaration | undefined {
    let result: ts.FunctionDeclaration | undefined
    containsAstNode(root, (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
        result = node
        return true
      }
      return false
    })
    return result
  }

  function isRefValueAccess(node: ts.Node, identifier: string): boolean {
    return (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === 'value' &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === identifier
    )
  }

  function refValueIdentifiers(root: ts.Node | undefined): readonly string[] {
    const names = new Set<string>()
    if (root !== undefined) {
      containsAstNode(root, (node) => {
        if (
          ts.isPropertyAccessExpression(node) &&
          node.name.text === 'value' &&
          ts.isIdentifier(node.expression)
        ) {
          names.add(node.expression.text)
        }
        return false
      })
    }
    return [...names]
  }

  function isComputedInitializer(initializer: ts.Expression | undefined): boolean {
    if (initializer === undefined) {
      return false
    }
    const value = unwrapExpression(initializer)
    return (
      ts.isCallExpression(value) &&
      ts.isIdentifier(value.expression) &&
      value.expression.text === 'computed'
    )
  }

  function callbackWritesExpandedKeys(node: ts.Node): boolean {
    const assignmentOperators = new Set<ts.SyntaxKind>([
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.PlusEqualsToken,
      ts.SyntaxKind.MinusEqualsToken,
      ts.SyntaxKind.AsteriskEqualsToken,
      ts.SyntaxKind.SlashEqualsToken,
      ts.SyntaxKind.PercentEqualsToken,
      ts.SyntaxKind.AsteriskAsteriskEqualsToken,
      ts.SyntaxKind.AmpersandEqualsToken,
      ts.SyntaxKind.BarEqualsToken,
      ts.SyntaxKind.CaretEqualsToken,
      ts.SyntaxKind.LessThanLessThanEqualsToken,
      ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
      ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
      ts.SyntaxKind.BarBarEqualsToken,
      ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      ts.SyntaxKind.QuestionQuestionEqualsToken,
    ])
    const mutatingMethods = new Set([
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

    return containsAstNode(node, (candidate) => {
      if (
        ts.isBinaryExpression(candidate) &&
        assignmentOperators.has(candidate.operatorToken.kind) &&
        isRefValueAccess(candidate.left, 'expandedNavigationGroupKeys')
      ) {
        return true
      }

      return (
        ts.isCallExpression(candidate) &&
        ts.isPropertyAccessExpression(candidate.expression) &&
        mutatingMethods.has(candidate.expression.name.text) &&
        isRefValueAccess(candidate.expression.expression, 'expandedNavigationGroupKeys')
      )
    })
  }

  const routeOrCollapseWatcherWritesExpandedKeys = containsAstNode(shellScriptAst, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      node.expression.text !== 'watch'
    ) {
      return false
    }

    const dependencySource = node.arguments[0]?.getText(shellScriptAst) ?? ''
    const callback = node.arguments[1]
    const tracksRouteOrCollapse =
      dependencySource.includes('props.activeRouteName') ||
      (persistentCollapsedBinding !== '' && dependencySource.includes(persistentCollapsedBinding))

    return tracksRouteOrCollapse && callback !== undefined && callbackWritesExpandedKeys(callback)
  })
  const renderedExpandedKeyDependencies = refValueIdentifiers(renderedExpandedKeysInitializer)
  const activeParentProjectionName = renderedExpandedKeyDependencies.find((name) => {
    const initializer = shellInitializers.get(name)
    const source = initializer?.getText(shellScriptAst) ?? ''
    return (
      isComputedInitializer(initializer) &&
      source.includes('props.activeRouteName') &&
      source.includes('props.navigation') &&
      source.includes('expandedNavigationGroupKeys.value')
    )
  })
  const switchExpandedKeySnapshotName = renderedExpandedKeyDependencies.find(
    (name) =>
      name !== activeParentProjectionName && !isComputedInitializer(shellInitializers.get(name)),
  )
  const activeParentProjectionInitializer =
    activeParentProjectionName === undefined
      ? undefined
      : shellInitializers.get(activeParentProjectionName)
  const activeParentProjectionSource =
    activeParentProjectionInitializer?.getText(shellScriptAst) ?? ''
  const activeParentProjectionMutationFree =
    activeParentProjectionInitializer !== undefined &&
    !callbackWritesExpandedKeys(activeParentProjectionInitializer)
  const shellCallables = topLevelCallables(shellScriptAst)
  const expandedKeyWriterCallables = [...shellCallables.values()].filter((callable) =>
    callbackWritesExpandedKeys(callable),
  )
  const expandedKeyWritersGuardedDuringSwitch =
    switchExpandedKeySnapshotName !== undefined &&
    expandedKeyWriterCallables.length === 2 &&
    expandedKeyWriterCallables.every((callable) => {
      if (!ts.isFunctionDeclaration(callable) || callable.body === undefined) {
        return false
      }

      const firstStatement = callable.body.statements[0]
      return (
        firstStatement !== undefined &&
        ts.isIfStatement(firstStatement) &&
        containsAstNode(firstStatement.expression, (node) =>
          isRefValueAccess(node, switchExpandedKeySnapshotName),
        ) &&
        containsAstNode(firstStatement.thenStatement, (node) => ts.isReturnStatement(node))
      )
    })
  const collapseCommitDeclaration = shellScriptAst.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.body !== undefined &&
      statement
        .getText(shellScriptAst)
        .includes("setAttribute('data-pavp-admin-navigation-switch', 'active')"),
  )
  const collapseCommitSource = collapseCommitDeclaration?.getText(shellScriptAst) ?? ''
  const switchSnapshotIndex =
    switchExpandedKeySnapshotName === undefined || activeParentProjectionName === undefined
      ? -1
      : collapseCommitSource.indexOf(
          `${switchExpandedKeySnapshotName}.value ??= [...${activeParentProjectionName}.value]`,
        )
  const switchAttributeIndex = collapseCommitSource.indexOf(
    "setAttribute('data-pavp-admin-navigation-switch', 'active')",
  )
  const switchSnapshotReleaseDeclaration = shellScriptAst.statements.find(
    (statement): statement is ts.FunctionDeclaration => {
      if (
        !ts.isFunctionDeclaration(statement) ||
        statement.name === undefined ||
        statement.body === undefined ||
        switchExpandedKeySnapshotName === undefined
      ) {
        return false
      }
      return statement
        .getText(shellScriptAst)
        .includes(`${switchExpandedKeySnapshotName}.value = undefined`)
    },
  )
  const switchSnapshotReleaseName = switchSnapshotReleaseDeclaration?.name?.text
  const switchSnapshotReleaseCallCount =
    switchSnapshotReleaseName === undefined
      ? 0
      : exactOccurrenceCount(shellScriptSource, `${switchSnapshotReleaseName}()`)
  const auraRenderHasHiddenSemantics = containsAstNode(shellScriptAst, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      node.expression.text !== 'h' ||
      node.arguments.length < 2
    ) {
      return false
    }

    const elementName = node.arguments[0]
    const properties = node.arguments[1]
    if (
      elementName === undefined ||
      properties === undefined ||
      !ts.isStringLiteral(elementName) ||
      elementName.text !== 'span'
    ) {
      return false
    }

    const object = unwrapExpression(properties)
    if (!ts.isObjectLiteralExpression(object)) {
      return false
    }

    const classValue = objectPropertyInitializer(object, 'class')
    const ariaHiddenValue = objectPropertyInitializer(object, 'aria-hidden')
    return (
      classValue !== undefined &&
      ts.isStringLiteral(classValue) &&
      classValue.text === 'pavp-admin-shell__route-selection-aura' &&
      ariaHiddenValue !== undefined &&
      ts.isStringLiteral(ariaHiddenValue) &&
      ariaHiddenValue.text === 'true'
    )
  })

  return Object.freeze([
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_SELECTED_STATE_PROJECTION',
      exactOccurrenceCount(snapshot.themeSource, `'${selectedSurfaceFormula}'`) === 1 &&
        normalizedThemeSource.includes('itemColorHover: navigationHover') &&
        normalizedThemeSource.includes('itemColorActive: navigationSelectedSurface') &&
        normalizedThemeSource.includes('itemColorActiveHover: navigationSelectedSurface') &&
        normalizedThemeSource.includes('itemColorActiveCollapsed: navigationSelectedSurface') &&
        normalizedThemeSource.includes('optionColorHover: navigationHover') &&
        normalizedThemeSource.includes('optionColorActive: navigationSelectedSurface') &&
        exactOccurrenceCount(snapshot.shellSource, 'var(--ui-admin-navigation-selected) 12%') ===
          2 &&
        collapsedSelectedSelectors.length >= 5 &&
        collapsedSelectedSelectors.every((selector) =>
          selector.includes('.pavp-admin-shell__navigation-plane--collapsed'),
        ) &&
        collapsedHoverRetainsSelectedSurface &&
        shellStyleRules.every((rule) => !rule.selector.includes('.n-layout-sider--collapsed')),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_AURA_DECORATION',
      exactOccurrenceCount(
        snapshot.shellSource,
        "class: 'pavp-admin-shell__route-selection-aura'",
      ) === 1 &&
        auraRenderHasHiddenSemantics &&
        snapshot.shellSource.includes(
          "'data-selected': routeName === props.activeRouteName ? 'true' : 'false'",
        ) &&
        snapshot.shellSource.includes(
          "'aria-current': routeName === props.activeRouteName ? 'page' : undefined",
        ) &&
        !snapshot.shellSource.includes('route-selection-dot') &&
        selectorDeclarationValues(shellStyleRules, auraSelector, 'background').length === 1 &&
        /radial-gradient\([\s\S]*var\(--ui-admin-navigation-selected\) 24%[\s\S]*transparent 72%[\s\S]*\)/u.test(
          auraDeclarations,
        ) &&
        isDeepStrictEqual(selectorDeclarationValues(shellStyleRules, auraSelector, 'block-size'), [
          'calc(var(--ui-space-content-gap) * 2)',
        ]) &&
        isDeepStrictEqual(selectorDeclarationValues(shellStyleRules, auraSelector, 'inline-size'), [
          'calc(var(--ui-space-content-gap) * 2)',
        ]) &&
        isDeepStrictEqual(
          selectorDeclarationValues(shellStyleRules, auraSelector, 'pointer-events'),
          ['none'],
        ) &&
        !/\b(?:backdrop-filter|filter)\s*:/iu.test(auraDeclarations) &&
        snapshot.motionAdapterSource.includes(
          'readonly routeSelectionAuras: ReadonlyMap<string, HTMLElement>',
        ),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_MATERIAL_FALLBACK',
      materialFallbackSelectors.every((selector) =>
        isDeepStrictEqual(selectorDeclarationValues(shellStyleRules, selector, 'display'), [
          'none',
        ]),
      ) &&
        forcedColorsSelectedSurfaceSelectors.every((selector) =>
          isDeepStrictEqual(selectorDeclarationValues(shellStyleRules, selector, 'background'), [
            'var(--ui-color-action-primary)',
          ]),
        ) &&
        forcedColorsSelectedForegroundSelectors.every((selector) =>
          isDeepStrictEqual(selectorDeclarationValues(shellStyleRules, selector, 'color'), [
            'var(--ui-color-text-on-action)',
          ]),
        ) &&
        normalizedShellSource.includes(
          "@media (forced-colors: active) { [data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
        ) &&
        normalizedShellSource.includes(
          "@media (prefers-reduced-transparency: reduce) { [data-pavp-admin-navigation='persistent'] .n-layout-sider",
        ),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_BOTTOM_DOCK_HANDOFF',
      selectorHasDeclarations(shellStyleRules, dockSelector, {
        position: 'relative',
        'padding-inline': '0',
      }) &&
        selectorHasDeclarations(shellStyleRules, dockPseudoSelector, {
          'border-block-start-color': 'var(--ui-color-border-default)',
          'border-block-start-style': 'solid',
          'border-block-start-width': 'var(--ui-admin-border-width)',
          'inset-inline': 'var(--ui-space-content-gap)',
        }) &&
        selectorDeclarationValues(shellStyleRules, dockSelector, 'background').length === 0 &&
        selectorDeclarationValues(shellStyleRules, dockSelector, 'box-shadow').length === 0 &&
        isDeepStrictEqual(
          selectorDeclarationValues(shellStyleRules, collapseActionSelector, 'inline-size'),
          ['100%'],
        ) &&
        selectorHasDeclarations(shellStyleRules, collapseForegroundSelector, {
          'grid-template-columns': 'auto minmax(0, 1fr)',
          'padding-inline-start': 'var(--ui-space-page-inline)',
        }) &&
        isDeepStrictEqual(
          selectorDeclarationValues(shellStyleRules, collapseForegroundSelector, 'pointer-events'),
          ['none'],
        ) &&
        isDeepStrictEqual(
          selectorDeclarationValues(
            shellStyleRules,
            stableOverflowSelector,
            '--pavp-admin-navigation-sider-content-overflow',
          ),
          ['hidden'],
        ) &&
        isDeepStrictEqual(
          selectorDeclarationValues(
            shellStyleRules,
            switchOverflowSelector,
            '--pavp-admin-navigation-sider-content-overflow',
          ),
          ['visible'],
        ) &&
        isDeepStrictEqual(allSwitchOverflowDeclarations, ['hidden', 'visible']) &&
        snapshot.shellSource.includes('class="pavp-admin-shell__collapse-foreground"') &&
        snapshot.shellSource.includes('const naiveMenuIconMarginInline = 8') &&
        snapshot.shellSource.includes(
          'const navigationDockIconAxisInline = computed(() => collapsedNavigationWidth.value / 2)',
        ) &&
        snapshot.shellSource.includes(
          'const navigationDockLabelInlineStart = computed(() => (currentRootFontSize.value * 13) / 4)',
        ) &&
        exactOccurrenceCount(
          snapshot.shellSource,
          ':collapsed-icon-size="navigationMenuIconSize"',
        ) === 2 &&
        exactOccurrenceCount(snapshot.shellSource, ':icon-size="navigationMenuIconSize"') === 2 &&
        exactOccurrenceCount(snapshot.shellSource, ':root-indent="navigationMenuRootIndent"') ===
          2 &&
        snapshot.shellSource.includes('grid-template-rows: minmax(0, 1fr) auto;') &&
        !/\[data-pavp-admin-navigation-switch='active'\][^{]*\.pavp-admin-shell__(?:navigation-dock|collapse-action|collapse-foreground)[^{]*\{/u.test(
          snapshot.shellSource,
        ) &&
        !snapshot.shellSource.includes('navigationDockForeground') &&
        !snapshot.motionAdapterSource.includes('navigationDockForeground'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_ATOMIC_LAYOUT_COMMIT',
      persistentMenuNodes.length === 2 &&
        exactSet(collapsedBindings, ['false', 'true']) &&
        expandedProjectionName !== undefined &&
        expandedKeyBindings.every((binding) => binding === expandedProjectionName) &&
        persistentMenuNodes.every(
          (node) =>
            templateAttributes(node, 'disabled').length === 0 &&
            templateDirectives(node, 'bind', 'disabled').length === 0,
        ) &&
        isComputedInitializer(renderedExpandedKeysInitializer) &&
        switchExpandedKeySnapshotName !== undefined &&
        activeParentProjectionName !== undefined &&
        renderedExpandedKeysSource.includes(
          `${switchExpandedKeySnapshotName}.value ?? ${activeParentProjectionName}.value`,
        ) &&
        isComputedInitializer(activeParentProjectionInitializer) &&
        activeParentProjectionSource.includes('props.activeRouteName') &&
        activeParentProjectionSource.includes('props.navigation') &&
        activeParentProjectionSource.includes('expandedNavigationGroupKeys.value') &&
        containsAstNode(activeParentProjectionInitializer, (node) => ts.isSpreadElement(node)) &&
        activeParentProjectionMutationFree &&
        !routeOrCollapseWatcherWritesExpandedKeys &&
        expandedKeyWritersGuardedDuringSwitch &&
        switchSnapshotIndex >= 0 &&
        switchAttributeIndex > switchSnapshotIndex &&
        switchSnapshotReleaseName !== undefined &&
        switchSnapshotReleaseCallCount >= 3 &&
        snapshot.shellSource.includes(`onCollapseSettled: ${switchSnapshotReleaseName}`) &&
        exactOccurrenceCount(snapshot.motionAdapterSource, 'options.onCollapseSettled()') === 2 &&
        /removeAttribute\(switchAttribute\)[\s\S]{0,240}?options\.onCollapseSettled\(\)/gu.test(
          snapshot.motionAdapterSource,
        ) &&
        menuOptionsInitializer !== undefined &&
        !menuOptionsInitializer.getText(shellScriptAst).includes(persistentCollapsedBinding) &&
        exactOccurrenceCount(snapshot.shellSource, ':options="navigationMenuOptions"') === 2 &&
        exactOccurrenceCount(snapshot.shellSource, ':inert="persistentNavigationCollapsed"') ===
          1 &&
        exactOccurrenceCount(snapshot.shellSource, ':inert="!persistentNavigationCollapsed"') ===
          1 &&
        normalizedShellSource.includes(
          '.pavp-admin-shell__navigation-plane--expanded { inline-size: var(--ui-layout-admin-sidebar-expanded-inline-size); }',
        ) &&
        normalizedShellSource.includes(
          '.pavp-admin-shell__navigation-plane--collapsed { inline-size: var(--ui-layout-admin-sidebar-rail-inline-size); }',
        ) &&
        normalizedShellSource.includes(
          "const persistentSiderContentStyle = Object.freeze({ overflow: 'var(--pavp-admin-navigation-sider-content-overflow)', })",
        ) &&
        snapshot.shellSource.includes(
          "[data-pavp-admin-navigation-collapse-motion='ready'][data-pavp-admin-navigation-switch='active']",
        ) &&
        exactOccurrenceCount(snapshot.shellSource, 'getBoundingClientRect().left') === 2 &&
        exactOccurrenceCount(
          snapshot.providerSource,
          ".pavp-admin-shell[data-pavp-admin-navigation-switch='active']",
        ) === 2 &&
        normalizedProviderSource.includes(
          ':where(.n-layout-sider, .n-layout-sider-scroll-container) { transition: none !important; }',
        ) &&
        normalizedProviderSource.includes(
          '.n-submenu-children.fade-in-height-expand-transition-enter-active',
        ) &&
        normalizedProviderSource.includes(
          '.n-submenu-children.fade-in-height-expand-transition-leave-active',
        ) &&
        snapshot.shellSource.includes('ref="navigationChromeBridge"') &&
        normalizedShellSource.includes(
          'aria-hidden="true" class="pavp-admin-shell__navigation-chrome-bridge"',
        ) &&
        selectorHasDeclarations(shellStyleRules, navigationChromeBridgeSelector, {
          position: 'absolute',
          'inline-size': 'var(--ui-layout-admin-sidebar-expanded-inline-size)',
          'pointer-events': 'none',
        }) &&
        selectorDeclarationValues(shellStyleRules, navigationChromeBridgeSelector, 'will-change')
          .length === 0,
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_COMPOSITOR_OWNERSHIP',
      snapshot.motionAdapterSource.includes(
        "gsap.quickSetter(targets.mainContentPlane, 'x', 'px')",
      ) &&
        snapshot.motionAdapterSource.includes(
          'readonly navigationChromeBridge: HTMLElement | null',
        ) &&
        snapshot.motionAdapterSource.includes('targets.navigationChromeBridge') &&
        snapshot.motionAdapterSource.includes('x: state.collapsed ? -collapseTravelInline : 0') &&
        snapshot.motionAdapterSource.includes("if (state.motion === 'full')") &&
        !snapshot.motionAdapterSource.includes("state.motion === 'reduced'") &&
        !prohibitedMotionProperty.test(snapshot.motionAdapterSource) &&
        !prohibitedMotionDomAccess.test(snapshot.motionAdapterSource) &&
        !/\b(?:x|translateX)\s*:/u.test(routeMotionSource) &&
        snapshot.motionAdapterSource.includes("state.motion === 'none'") &&
        snapshot.motionAdapterSource.includes('onUpdate: renderMainContentBridge'),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_MOTION_LIFECYCLE',
      exactOccurrenceCount(snapshot.motionAdapterSource, 'let collapseTimeline:') === 1 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, 'let routeTimeline:') === 1 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, 'let collapseContext:') === 1 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, 'let routeContext:') === 1 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, "eventCallback('onComplete'") === 2 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, "eventCallback('onReverseComplete'") ===
          2 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, '.reverse()') >= 2 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, '.kill()') >= 3 &&
        exactOccurrenceCount(snapshot.motionAdapterSource, '.revert()') >= 2 &&
        collapseReversalSource !== '' &&
        !collapseReversalSource.includes('collapseTravelInline =') &&
        collapseMotionAttributeInitializer !== undefined &&
        ts.isStringLiteral(collapseMotionAttributeInitializer) &&
        collapseMotionAttributeInitializer.text === 'data-pavp-admin-navigation-collapse-motion' &&
        routeMotionAttributeInitializer !== undefined &&
        ts.isStringLiteral(routeMotionAttributeInitializer) &&
        routeMotionAttributeInitializer.text === 'data-pavp-admin-navigation-route-motion' &&
        snapshot.motionAdapterSource.includes(
          "document.addEventListener('visibilitychange', handleVisibilityChange)",
        ) &&
        snapshot.motionAdapterSource.includes(
          "document.removeEventListener('visibilitychange', handleVisibilityChange)",
        ) &&
        exactOccurrenceCount(
          snapshot.motionAdapterSource,
          'options.root.setAttribute(collapseMotionAttribute, readyAttributeValue)',
        ) === 1 &&
        exactOccurrenceCount(
          snapshot.motionAdapterSource,
          'options.root.setAttribute(routeMotionAttribute, readyAttributeValue)',
        ) === 1 &&
        exactOccurrenceCount(
          snapshot.motionAdapterSource,
          'options.root.removeAttribute(collapseMotionAttribute)',
        ) >= 3 &&
        exactOccurrenceCount(
          snapshot.motionAdapterSource,
          'options.root.removeAttribute(routeMotionAttribute)',
        ) >= 3 &&
        snapshot.shellSource.includes(
          ".pavp-admin-shell:not([data-pavp-admin-navigation-collapse-motion='ready'])",
        ) &&
        snapshot.shellSource.includes(
          ".pavp-admin-shell:not([data-pavp-admin-navigation-route-motion='ready'])",
        ) &&
        !snapshot.shellSource.includes(
          ".pavp-admin-shell:not([data-pavp-admin-navigation-motion='ready'])",
        ) &&
        lazyFailureCleanup.test(snapshot.shellSource) &&
        snapshot.shellSource.includes('interface PendingAdminNavigationMotionSync') &&
        snapshot.shellSource.includes('let adminNavigationMotionLoadPromise: Promise<void>') &&
        snapshot.shellSource.includes('let pendingAdminNavigationCollapseIntent:') &&
        snapshot.shellSource.includes('let pendingAdminNavigationMotionSync:') &&
        normalizedShellSource.includes(
          'pendingAdminNavigationMotionSync?.initialState ?? pendingAdminNavigationCollapseIntent?.initialState',
        ) &&
        snapshot.shellSource.includes(
          'adminNavigationMotionController.sync(pendingSync.state, pendingSync.cause)',
        ) &&
        normalizedShellSource.includes(
          "if (cause === 'route' && pendingAdminNavigationMotionSync !== undefined)",
        ) &&
        exactOccurrenceCount(snapshot.shellSource, 'onBeforeMount(() => {') === 1 &&
        !/\b(?:requestAnimationFrame|setInterval|setTimeout)\b/u.test(snapshot.motionAdapterSource),
    ]),
    Object.freeze<readonly [string, boolean]>([
      'ADMIN_NAV_THEME_REFLOW_APPEARANCE_WIDE_GRID',
      isDeepStrictEqual(
        selectorDeclarationValues(
          appearanceStyleRules,
          wideGallerySelector,
          'grid-template-columns',
        ),
        ['repeat(4, minmax(0, 1fr))'],
      ) &&
        snapshot.appearancePageSource.includes(
          ":global(.pavp-admin-shell[data-layout-profile='regular']) .pavp-appearance-workspace,",
        ) &&
        snapshot.appearancePageSource.includes(
          ":global(.pavp-admin-shell[data-layout-profile='wide']) .pavp-appearance-workspace {",
        ),
    ]),
  ])
}

function adminNavigationThemeReflowSourceViolations(
  snapshot: AdminNavigationThemeReflowSourceSnapshot,
): string[] {
  return adminNavigationThemeReflowSourceInvariantResults(snapshot)
    .filter(([, passed]) => !passed)
    .map(([failureCode]) => failureCode)
}

function runAdminNavigationThemeReflowSourceNegativeProbes(
  baseline: AdminNavigationThemeReflowSourceSnapshot,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const baselineFailureCodes = adminNavigationThemeReflowSourceViolations(baseline)
  const probes: readonly [string, string, AdminNavigationThemeReflowSourceSnapshot][] = [
    [
      'admin-navigation-theme-reflow-removes-collapsed-hover-retention',
      'ADMIN_NAV_THEME_REFLOW_SELECTED_STATE_PROJECTION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '.pavp-admin-shell__navigation-plane--collapsed\n  .n-menu\n  .n-menu-item-content--child-active.n-menu-item-content--hover::before',
          '.pavp-admin-shell__navigation-plane--collapsed\n  .n-menu-item-content--child-active.n-menu-item-content--hover::before',
        ),
      },
    ],
    [
      'admin-navigation-theme-reflow-restores-hard-dot',
      'ADMIN_NAV_THEME_REFLOW_AURA_DECORATION',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          "class: 'pavp-admin-shell__route-selection-aura'",
          "class: 'pavp-admin-shell__route-selection-dot'",
        ),
      },
    ],
    [
      'admin-navigation-theme-reflow-weakens-forced-colors-selection-specificity',
      'ADMIN_NAV_THEME_REFLOW_MATERIAL_FALLBACK',
      {
        ...baseline,
        shellSource: baseline.shellSource.replace(
          '.pavp-admin-shell__menu.n-menu\n    .n-menu-item-content.n-menu-item-content--selected::before',
          '.pavp-admin-shell__menu\n    .n-menu-item-content--selected::before',
        ),
      },
    ],
    [
      'admin-navigation-theme-reflow-breaks-dock-hit-area-and-switch-overflow',
      'ADMIN_NAV_THEME_REFLOW_BOTTOM_DOCK_HANDOFF',
      {
        ...baseline,
        shellSource: `${baseline.shellSource.replace(
          '  inline-size: 100%;\n  overflow: visible;',
          '  inline-size: 200%;\n  overflow: visible;',
        )}\n<style scoped>.pavp-admin-shell { --pavp-admin-navigation-sider-content-overflow: visible; }</style>`,
      },
    ],
    [
      'admin-navigation-theme-reflow-drifts-expanded-keys-during-switch',
      'ADMIN_NAV_THEME_REFLOW_ATOMIC_LAYOUT_COMMIT',
      {
        ...baseline,
        shellSource: baseline.shellSource
          .replace(
            '() => navigationSwitchExpandedGroupKeys.value ?? projectedExpandedNavigationGroupKeys.value,',
            '() => projectedExpandedNavigationGroupKeys.value,',
          )
          .replace(
            '</script>',
            'watch([persistentNavigationCollapsed, () => props.activeRouteName], () => { expandedNavigationGroupKeys.value = [] })\n</script>',
          ),
      },
    ],
    [
      'admin-navigation-theme-reflow-writes-main-width',
      'ADMIN_NAV_THEME_REFLOW_COMPOSITOR_OWNERSHIP',
      {
        ...baseline,
        motionAdapterSource: baseline.motionAdapterSource.replace(
          "gsap.quickSetter(targets.mainContentPlane, 'x', 'px')",
          "gsap.quickSetter(targets.mainContentPlane, 'width', 'px')",
        ),
      },
    ],
    [
      'admin-navigation-theme-reflow-swaps-motion-handoff-attributes',
      'ADMIN_NAV_THEME_REFLOW_MOTION_LIFECYCLE',
      {
        ...baseline,
        motionAdapterSource: baseline.motionAdapterSource.replace(
          "const collapseMotionAttribute = 'data-pavp-admin-navigation-collapse-motion'\nconst routeMotionAttribute = 'data-pavp-admin-navigation-route-motion'",
          "const collapseMotionAttribute = 'data-pavp-admin-navigation-route-motion'\nconst routeMotionAttribute = 'data-pavp-admin-navigation-collapse-motion'",
        ),
      },
    ],
    [
      'admin-navigation-theme-reflow-wide-gallery-five-columns',
      'ADMIN_NAV_THEME_REFLOW_APPEARANCE_WIDE_GRID',
      {
        ...baseline,
        appearancePageSource: baseline.appearancePageSource.replace(
          'grid-template-columns: repeat(4, minmax(0, 1fr));',
          'grid-template-columns: repeat(5, minmax(0, 1fr));',
        ),
      },
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutatedSnapshot]) => {
      const failureCodes = adminNavigationThemeReflowSourceViolations(mutatedSnapshot)

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
  const expectedProjectConfigBudget = 'initialJavaScriptGzipBytes: 224 * 1024'
  const expectedMinimumHeadroom = 'const minimumInitialJavaScriptHeadroomBytes = 8 * 1024'
  const expectedEngineeringManifestBudget =
    "{ id: 'initial-javascript-gzip', limit: 229376, unit: 'bytes-gzip' }"
  const expectedEngineeringManifestMotionBudget =
    "{ id: 'lazy-motion-adapter-javascript-gzip', limit: 40960, unit: 'bytes-gzip' }"
  const requiredArchitectureMarkers = [
    'PREVIOUS_INITIAL_JAVASCRIPT_BUDGET=184320',
    `CURRENT_INITIAL_JAVASCRIPT_BUDGET=${String(expectedInitialJavaScriptBudgetBytes)}`,
    'INITIAL_JAVASCRIPT_BUDGET_DELTA=45056',
    `MINIMUM_INITIAL_JAVASCRIPT_HEADROOM=${String(expectedMinimumInitialJavaScriptHeadroomBytes)}`,
    `MAXIMUM_ALLOWED_INITIAL_JAVASCRIPT=${String(expectedMaximumInitialJavaScriptBytes)}`,
    'PRE_IMPLEMENTATION_BASELINE_INITIAL_JAVASCRIPT=164026',
    'PRE_REBASELINE_IMPLEMENTATION_INITIAL_JAVASCRIPT=210493',
    'PRE_REBASELINE_IMPLEMENTATION_DELTA=46467',
    'EXPECTED_HEADROOM_AT_MEASURED_IMPLEMENTATION=18883',
    'INITIAL_JAVASCRIPT_MEASUREMENT_CHANGE=NONE',
    'NON_ROUTE_DYNAMIC_NAVIGATION_CHUNK=EXACT_ONE_PRIVATE_GSAP_ADAPTER_LAZY_ROOT_ALLOWED_BY_1_2B_0I',
    'EXACT_ALLOWED_NAVIGATION_DYNAMIC_IMPORT_SPECIFIER=../adapters/gsap/admin-navigation-motion',
    'OTHER_NON_ROUTE_DYNAMIC_NAVIGATION_ROOT=PROHIBITED',
    `ENGINEERING_MANIFEST_BUDGET_MIRROR=${String(expectedInitialJavaScriptBudgetBytes)}`,
    '| `initial-javascript-gzip` | `229376` | `bytes-gzip` |',
    'WORK_PACKAGE=PAVP_INITIAL_JAVASCRIPT_HEADROOM_RECOVERY',
    'INITIAL_JAVASCRIPT_HARD_BUDGET_BYTES=184320',
  ] as const

  if (
    exactOccurrenceCount(snapshot.projectConfigSource, expectedProjectConfigBudget) !== 1 ||
    snapshot.projectConfigSource.includes('initialJavaScriptGzipBytes: 180 * 1024')
  ) {
    violations.push('NAV_BUDGET_HARD_LIMIT')
  }

  if (requiredArchitectureMarkers.some((marker) => !snapshot.architectureSource.includes(marker))) {
    violations.push('NAV_BUDGET_ARCHITECTURE')
  }

  if (exactOccurrenceCount(snapshot.checkBundleSource, expectedMinimumHeadroom) !== 1) {
    violations.push('NAV_BUDGET_MINIMUM_HEADROOM')
  }

  if (
    createHash('sha256').update(snapshot.checkBundleSource).digest('hex') !==
    expectedCheckBundleSha256
  ) {
    violations.push('NAV_BUDGET_MEASUREMENT_INTEGRITY')
  }

  if (
    exactOccurrenceCount(snapshot.engineeringManifestSource, expectedEngineeringManifestBudget) !==
      1 ||
    exactOccurrenceCount(
      snapshot.engineeringManifestSource,
      expectedEngineeringManifestMotionBudget,
    ) !== 1
  ) {
    violations.push('NAV_BUDGET_GENERATED_MIRROR')
  }

  const navigationDynamicImportSpecifiers = [
    ...snapshot.navigationSource.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu),
  ].map((match) => match[1] ?? '')

  if (
    !isDeepStrictEqual(navigationDynamicImportSpecifiers, [
      '../adapters/gsap/admin-navigation-motion',
    ])
  ) {
    violations.push('NAV_BUDGET_DYNAMIC_NAVIGATION_IMPORT')
  }

  if (snapshot.routeCount !== 17) {
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
          'initialJavaScriptGzipBytes: 224 * 1024',
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
      'navigation-budget-increases-hard-limit-again',
      'NAV_BUDGET_HARD_LIMIT',
      {
        ...baseline,
        projectConfigSource: baseline.projectConfigSource.replace(
          'initialJavaScriptGzipBytes: 224 * 1024',
          'initialJavaScriptGzipBytes: 225 * 1024',
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
      'navigation-budget-leaves-generated-mirror-at-previous-limit',
      'NAV_BUDGET_GENERATED_MIRROR',
      {
        ...baseline,
        engineeringManifestSource: baseline.engineeringManifestSource.replace(
          "{ id: 'initial-javascript-gzip', limit: 229376, unit: 'bytes-gzip' }",
          "{ id: 'initial-javascript-gzip', limit: 184320, unit: 'bytes-gzip' }",
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
  const catalogs = isJsonObject(lockfile['catalogs']) ? lockfile['catalogs'] : {}
  const defaultCatalog = isJsonObject(catalogs['default']) ? catalogs['default'] : {}
  const packages = isJsonObject(lockfile['packages']) ? lockfile['packages'] : {}
  const snapshots = isJsonObject(lockfile['snapshots']) ? lockfile['snapshots'] : {}
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
  const gsapCatalogCandidate = defaultCatalog['gsap']
  const gsapCatalog = isJsonObject(gsapCatalogCandidate) ? gsapCatalogCandidate : {}
  const gsapImporterCandidate = uiImporterDependencies['gsap']
  const gsapImporter = isJsonObject(gsapImporterCandidate) ? gsapImporterCandidate : {}
  const naivePackageCandidate = packages[`naive-ui@${expectedNaiveUiVersion}`]
  const naivePackage: JsonObject = isJsonObject(naivePackageCandidate) ? naivePackageCandidate : {}
  const resolution = isJsonObject(naivePackage['resolution']) ? naivePackage['resolution'] : {}
  const engines = isJsonObject(naivePackage['engines']) ? naivePackage['engines'] : {}
  const peerDependencies = isJsonObject(naivePackage['peerDependencies'])
    ? naivePackage['peerDependencies']
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
  const gsapPackageKeys = Object.keys(packages).filter((key) => key.startsWith('gsap@'))
  const gsapSnapshotKeys = Object.keys(snapshots).filter((key) => key.startsWith('gsap@'))
  const gsapPackageCandidate = packages[`gsap@${expectedGsapVersion}`]
  const gsapPackage = isJsonObject(gsapPackageCandidate) ? gsapPackageCandidate : {}
  const gsapResolution = isJsonObject(gsapPackage['resolution']) ? gsapPackage['resolution'] : {}
  const gsapSnapshotCandidate = snapshots[`gsap@${expectedGsapVersion}`]
  const gsapSnapshot = isJsonObject(gsapSnapshotCandidate) ? gsapSnapshotCandidate : {}
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
      gsap: 'catalog:',
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
      gsap: 'catalog:',
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
    catalog['gsap'] !== expectedGsapVersion ||
    gsapCatalog['specifier'] !== expectedGsapVersion ||
    gsapCatalog['version'] !== expectedGsapVersion ||
    !isDeepStrictEqual(uiDependencies, {
      '@platform/design-system': 'workspace:*',
      gsap: 'catalog:',
      'naive-ui': 'catalog:',
      vue: 'catalog:',
    }) ||
    gsapImporter['specifier'] !== 'catalog:' ||
    gsapImporter['version'] !== expectedGsapVersion ||
    !isDeepStrictEqual(gsapPackageKeys, [`gsap@${expectedGsapVersion}`]) ||
    gsapResolution['integrity'] !== expectedGsapIntegrity ||
    !isDeepStrictEqual(gsapSnapshotKeys, [`gsap@${expectedGsapVersion}`]) ||
    !isDeepStrictEqual(gsapSnapshot, {})
  ) {
    violations.push('GSAP exact catalog, UI dependency and lockfile closure drifted.')
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
    defineStoreCount += [...source.matchAll(/\bdefineStore\s*\(/gu)].length
    if (
      relative(rootDirectory, path) !== 'apps/web/src/app/appearance/appearance-bootstrap.ts' &&
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
  if (
    requiredProjectionMarkers.some((marker) => !themeSource.includes(marker)) ||
    expectedMaterialBranches.some((branch) => !normalizedThemeSource.includes(branch)) ||
    !providerSource.includes("html[data-motion='reduced']") ||
    !providerSource.includes("html[data-motion='none']") ||
    !providerSource.includes('transition: none !important;') ||
    !providerSource.includes('animation: none !important;') ||
    importantMotionDeclarations.length !== 21 ||
    importantMotionDeclarations.some(
      (declaration) =>
        !/^(?:animation|animation-duration|opacity|transform|transition|transition-duration|transition-timing-function):/u.test(
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
      { id: 'initial-css-gzip', limit: 40960, unit: 'bytes-gzip' },
      {
        id: 'initial-javascript-gzip',
        limit: expectedInitialJavaScriptBudgetBytes,
        unit: 'bytes-gzip',
      },
      { id: 'lazy-motion-adapter-javascript-gzip', limit: 40960, unit: 'bytes-gzip' },
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
  const nonAdapterUiFiles = (await collectFiles(resolve(rootDirectory, 'packages/ui/src'))).filter(
    (path) =>
      ['.ts', '.vue'].includes(extname(path)) &&
      !relative(rootDirectory, path).startsWith('packages/ui/src/adapters/naive/'),
  )
  const [applicationSources, nonAdapterUiSources] = await Promise.all([
    Promise.all(applicationFiles.map((path) => readFile(path, 'utf8'))),
    Promise.all(nonAdapterUiFiles.map((path) => readFile(path, 'utf8'))),
  ])
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
    layoutAdapterSource,
    menuAdapterSource,
    runtimeContextSource,
    projectConfigSource,
    checkBundleSource,
    engineeringManifestSource,
    motionAdapterSource,
    publicUiRootSource,
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
      resolve(rootDirectory, 'packages/ui/src/adapters/gsap/admin-navigation-motion.ts'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'packages/ui/src/index.ts'), 'utf8'),
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
  const adminNavigationGsapSourceBaseline: AdminNavigationGsapSourceSnapshot = {
    applicationSource: applicationSources.join('\n'),
    motionAdapterSource,
    publicUiRootSource,
    shellSource,
    themeSource,
  }
  const adminNavigationThemeReflowSourceBaseline: AdminNavigationThemeReflowSourceSnapshot = {
    ...adminNavigationGsapSourceBaseline,
    appearancePageSource,
    providerSource: naiveProviderSource,
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
  const adminNavigationGsapSourceInvariantResultsBaseline =
    adminNavigationGsapSourceInvariantResults(adminNavigationGsapSourceBaseline)
  const adminNavigationGsapSourceNegativeProbeResults = runAdminNavigationGsapSourceNegativeProbes(
    adminNavigationGsapSourceBaseline,
  )
  const adminNavigationThemeReflowSourceInvariantResultsBaseline =
    adminNavigationThemeReflowSourceInvariantResults(adminNavigationThemeReflowSourceBaseline)
  const adminNavigationThemeReflowSourceNegativeProbeResults =
    runAdminNavigationThemeReflowSourceNegativeProbes(adminNavigationThemeReflowSourceBaseline)
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
    adminNavigationGsapSourceInvariantResultsBaseline.length !==
    expectedAdminNavigationGsapSourceInvariantCount
  ) {
    violations.push(
      `Admin navigation GSAP source-invariant count drifted: expected ${String(expectedAdminNavigationGsapSourceInvariantCount)}, received ${String(adminNavigationGsapSourceInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationGsapSourceNegativeProbeResults.length !==
    expectedAdminNavigationGsapSourceNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation GSAP source negative-probe count drifted: expected ${String(expectedAdminNavigationGsapSourceNegativeProbeCount)}, received ${String(adminNavigationGsapSourceNegativeProbeResults.length)}.`,
    )
  }
  if (
    adminNavigationThemeReflowSourceInvariantResultsBaseline.length !==
    expectedAdminNavigationThemeReflowSourceInvariantCount
  ) {
    violations.push(
      `Admin navigation theme/reflow source-invariant count drifted: expected ${String(expectedAdminNavigationThemeReflowSourceInvariantCount)}, received ${String(adminNavigationThemeReflowSourceInvariantResultsBaseline.length)}.`,
    )
  }
  if (
    adminNavigationThemeReflowSourceNegativeProbeResults.length !==
    expectedAdminNavigationThemeReflowSourceNegativeProbeCount
  ) {
    violations.push(
      `Admin navigation theme/reflow source negative-probe count drifted: expected ${String(expectedAdminNavigationThemeReflowSourceNegativeProbeCount)}, received ${String(adminNavigationThemeReflowSourceNegativeProbeResults.length)}.`,
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
    ...adminNavigationGsapSourceViolations(adminNavigationGsapSourceBaseline),
    ...adminNavigationThemeReflowSourceViolations(adminNavigationThemeReflowSourceBaseline),
    ...navigationBudgetViolations(navigationBudgetBaseline),
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
  for (const result of adminNavigationGsapSourceNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation GSAP source negative probe did not fail.`,
      )
    }
  }
  for (const result of adminNavigationThemeReflowSourceNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory Admin navigation theme/reflow source negative probe did not fail.`,
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
    `Architecture Admin Console check: passed (${String(expectedArchitectureAdminConsoleNegativeProbeCount)}/${String(expectedArchitectureAdminConsoleNegativeProbeCount)} Admin/Naive negative probes; ${String(expectedMotionGeometryNegativeProbeCount)}/${String(expectedMotionGeometryNegativeProbeCount)} Motion geometry negative probes; ${String(expectedRuntime002NegativeProbeCount)}/${String(expectedRuntime002NegativeProbeCount)} PAVP-RUNTIME-002 negative probes; ${String(expectedRuntime005NegativeProbeCount)}/${String(expectedRuntime005NegativeProbeCount)} PAVP-RUNTIME-005 negative probes; ${String(expectedAcceptanceClosureNegativeProbeCount)}/${String(expectedAcceptanceClosureNegativeProbeCount)} acceptance-closure negative probes; ${String(expectedRuntime003AdmissionNegativeProbeCount)}/${String(expectedRuntime003AdmissionNegativeProbeCount)} PAVP-RUNTIME-003 admission negative probes; ${String(expectedRuntime003AcceptanceClosureNegativeProbeCount)}/${String(expectedRuntime003AcceptanceClosureNegativeProbeCount)} PAVP-RUNTIME-003 acceptance-closure negative probes; ${String(expectedAdminNavigationGsapAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationGsapAdmissionNegativeProbeCount)} Admin navigation GSAP admission negative probes; ${String(expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationThemeReflowAdmissionNegativeProbeCount)} Admin navigation theme/reflow admission negative probes; ${String(expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount)}/${String(expectedAdminNavigationHighlightRevealAdmissionNegativeProbeCount)} Admin navigation highlight/reveal admission negative probes; ${String(expectedAdminNavigationGsapSourceInvariantCount)}/${String(expectedAdminNavigationGsapSourceInvariantCount)} Admin navigation GSAP source invariants; ${String(expectedAdminNavigationGsapSourceNegativeProbeCount)}/${String(expectedAdminNavigationGsapSourceNegativeProbeCount)} Admin navigation GSAP source negative probes; ${String(expectedAdminNavigationThemeReflowSourceInvariantCount)}/${String(expectedAdminNavigationThemeReflowSourceInvariantCount)} Admin navigation theme/reflow source invariants; ${String(expectedAdminNavigationThemeReflowSourceNegativeProbeCount)}/${String(expectedAdminNavigationThemeReflowSourceNegativeProbeCount)} Admin navigation theme/reflow source negative probes; ${String(expectedRuntime003SourceNegativeProbeCount)}/${String(expectedRuntime003SourceNegativeProbeCount)} PAVP-RUNTIME-003 negative probes; ${String(expectedNavigationReworkSourceNegativeProbeCount)}/${String(expectedNavigationReworkSourceNegativeProbeCount)} Naive collapsible multilevel navigation source negative probes; ${String(expectedNavigationBudgetNegativeProbeCount)}/${String(expectedNavigationBudgetNegativeProbeCount)} Naive navigation budget negative probes)`,
  )
}
