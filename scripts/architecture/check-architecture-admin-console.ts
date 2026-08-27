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
const expectedArchitectureAdminConsoleNegativeProbeCount = 59
const expectedMotionGeometryNegativeProbeCount = 12
const expectedRuntime002NegativeProbeCount = 10
const expectedRuntime005NegativeProbeCount = 10
const expectedCurrentWorkNegativeProbeCount = 4
const expectedCurrentBoundedWork = 'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT'
const expectedCurrentBoundedWorkAuthority =
  'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT'
const shellSfcPath = 'packages/ui/src/components/UiAdminShell.vue'
const shellSfcScopeId = 'data-v-pavp-admin-shell'
const requireFromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
const vueSfcCompiler = requireFromWeb('vue/compiler-sfc') as VueSfcCompiler
const expectedNaiveUiIntegrity =
  'sha512-KshetbFOX/uZ/Pe+60hJoUAo47x5QO1JpZaUVPQCQkNhFfJ7hKsX55A8oMFQHccEpLuQUMPkJ41cX94R4nWUjg=='
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

function cssDeclarationsForSelector(
  rules: readonly CssRuleBlock[],
  selector: string,
): string | undefined {
  const declarations = rules
    .filter((rule) => rule.selector.split(',').some((candidate) => candidate.trim() === selector))
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
      !rule.selector.split(',').some((candidate) => normalizedCssSelector(candidate) === selector)
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
    if (
      selectors.some(
        (selector) =>
          !/^html\[data-(?:material|motion)='[^']+'\] \.pavp-admin-shell/u.test(selector),
      )
    ) {
      violations.push('SHELL_STATE_SELECTOR_NAMESPACE')
    }
  }

  const materialTargets = [
    '.pavp-admin-shell__header',
    '.pavp-admin-shell__sidebar',
    ".pavp-admin-shell__navigation-action[aria-current='page']",
    '.pavp-admin-shell__rail-tooltip',
    '.pavp-admin-shell__drawer-navigation',
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
    '.pavp-admin-shell__rail-tooltip',
    '.pavp-admin-shell__drawer-navigation',
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
    '.pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active',
    '.pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active',
    '.pavp-admin-shell__sidebar',
    '.pavp-admin-shell__action',
    '.pavp-admin-shell__navigation-action',
    '.pavp-admin-shell__navigation-action::before',
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
      "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from",
      { transform: 'translateX(calc(var(--ui-space-content-gap) * -1))' },
    ) ||
    !selectorHasDeclarations(
      allRules,
      "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to",
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
    )
  ) {
    violations.push('MOTION_NONE_TARGETS')
  }

  const allowedStateSelectors = new Set([
    ...(['adaptive', 'reduced', 'solid'] as const).flatMap((material) =>
      materialTargets.map((target) => `html[data-material='${material}'] ${target}`),
    ),
    "html[data-motion='reduced'] .pavp-admin-shell::before",
    "html[data-motion='none'] .pavp-admin-shell::before",
    ...(['reduced', 'none'] as const).flatMap((motion) =>
      reducedDurationTargets.map((target) => `html[data-motion='${motion}'] ${target}`),
    ),
    "html[data-motion='reduced'] .pavp-admin-shell__action:active",
    "html[data-motion='reduced'] .pavp-admin-shell__navigation-action:active",
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from",
    "html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to",
    "html[data-motion='none'] .pavp-admin-shell__action:active",
    "html[data-motion='none'] .pavp-admin-shell__navigation-action:active",
  ])
  const actualStateSelectors = new Set(
    stateRules.flatMap((rule) => rule.selector.split(',').map(normalizedCssSelector)),
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

  if (
    /\.n-[a-z0-9_-]+/iu.test(snapshot.nonAdapterUiSource) ||
    /\bthemeOverrides\b/u.test(snapshot.nonAdapterUiSource)
  ) {
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

function ancestorHasDirective(
  element: ShellTemplateElement,
  tag: string,
  name: string,
  expression: string,
): boolean {
  return element.ancestors.some(
    (ancestor) =>
      ancestor.tag === tag &&
      templateDirectives(ancestor, name).some(
        (directive) => normalizeTemplateExpression(directive.exp?.content) === expression,
      ),
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
  const navigationButtons = elements.filter(
    (element) =>
      element.node.tag === 'button' &&
      hasStaticTemplateClass(element.node, 'pavp-admin-shell__navigation-action'),
  )
  const persistentButtons = navigationButtons.filter((element) =>
    ancestorHasDirective(element, 'aside', 'if', "profile !== 'narrow'"),
  )
  const drawerButtons = navigationButtons.filter((element) =>
    ancestorHasStaticAttribute(element, 'nav', 'ref', 'drawerNavigation'),
  )

  if (
    navigationButtons.length !== 2 ||
    persistentButtons.length !== 1 ||
    drawerButtons.length !== 1
  ) {
    return ['PAVP_RUNTIME_002_NAVIGATION_SURFACES']
  }

  const persistentButton = persistentButtons[0]?.node
  const drawerButton = drawerButtons[0]?.node
  if (persistentButton === undefined || drawerButton === undefined) {
    return ['PAVP_RUNTIME_002_NAVIGATION_SURFACES']
  }

  const persistentClick = templateDirectives(persistentButton, 'on', 'click')
  const persistentMousedown = templateDirectives(persistentButton, 'on', 'mousedown')
  const drawerMousedown = templateDirectives(drawerButton, 'on', 'mousedown')
  const drawerClick = templateDirectives(drawerButton, 'on', 'click')
  const drawerKeydown = templateDirectives(drawerButton, 'on', 'keydown')
  const mousedownIndex =
    persistentMousedown[0] === undefined
      ? -1
      : (persistentButton.props ?? []).indexOf(persistentMousedown[0])
  const clickIndex =
    persistentClick[0] === undefined
      ? -1
      : (persistentButton.props ?? []).indexOf(persistentClick[0])

  if (persistentMousedown.length !== 1 || (persistentMousedown[0]?.modifiers?.length ?? 0) !== 0) {
    violations.push('PAVP_RUNTIME_002_PERSISTENT_MOUSEDOWN_BINDING')
  }
  if (
    persistentClick.length !== 1 ||
    (persistentClick[0]?.modifiers?.length ?? 0) !== 0 ||
    normalizeTemplateExpression(persistentClick[0]?.exp?.content) !== 'navigate(item.routeName)'
  ) {
    violations.push('PAVP_RUNTIME_002_PERSISTENT_CLICK_CONTRACT')
  }
  if (
    persistentMousedown.length === 1 &&
    persistentClick.length === 1 &&
    (mousedownIndex < 0 || clickIndex < 0 || mousedownIndex >= clickIndex)
  ) {
    violations.push('PAVP_RUNTIME_002_EVENT_ORDER')
  }
  if (drawerMousedown.length !== 0) {
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
    !runtime002ButtonIsNativeAndEnabled(persistentButton) ||
    !runtime002ButtonIsNativeAndEnabled(drawerButton)
  ) {
    violations.push('PAVP_RUNTIME_002_NATIVE_BUTTON')
  }
  if (
    !runtime002AriaCurrentIsCanonical(persistentButton) ||
    !runtime002AriaCurrentIsCanonical(drawerButton)
  ) {
    violations.push('PAVP_RUNTIME_002_ARIA_CURRENT')
  }
  if (
    !runtime002ButtonIsSequentiallyFocusable(persistentButton) ||
    !runtime002ButtonIsSequentiallyFocusable(drawerButton) ||
    templateDirectives(persistentButton, 'on', 'keydown').length > 0 ||
    templateDirectives(persistentButton, 'on', 'keyup').length > 0 ||
    templateDirectives(persistentButton, 'on', 'keypress').length > 0
  ) {
    violations.push('PAVP_RUNTIME_002_KEYBOARD_FOCUSABILITY')
  }

  const handlerCall = /^([A-Z_a-z][$\w]*)\(\s*\$event\s*,\s*item\.routeName\s*\)$/u.exec(
    normalizeTemplateExpression(persistentMousedown[0]?.exp?.content),
  )
  const handlerName = handlerCall?.[1]
  const shellScript = scriptContent(shellSource)
  const sourceFile = ts.createSourceFile(
    shellSfcPath,
    shellScript,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const handler =
    handlerName === undefined ? undefined : functionDeclaration(sourceFile, handlerName)
  const handlerExported =
    handler !== undefined &&
    ts.getModifiers(handler)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)

  if (
    handler === undefined ||
    handlerExported ||
    handler.parameters.length !== 2 ||
    handler.parameters[0]?.type?.getText(sourceFile) !== 'MouseEvent' ||
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
  const focusDeclarations = cssDeclarationsForSelector(
    shellRules,
    '.pavp-admin-shell__navigation-action:focus-visible',
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
    focusDeclarations === undefined ||
    !/\bbox-shadow\s*:\s*var\(--ui-[a-z0-9-]+\)/iu.test(focusDeclarations) ||
    focusSuppression
  ) {
    violations.push('PAVP_RUNTIME_002_FOCUS_PRESENTATION')
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
  if (
    !isDeepStrictEqual(navigationIconRecords, expectedNavigationIconClasses) ||
    !isDeepStrictEqual(shellNavigationIconClasses, expectedNavigationIconClasses) ||
    /\bglyph\s*:/u.test(snapshot.routeRegistrySource) ||
    !snapshot.shellSource.includes(':class="resolveNavigationIconClass(item.iconClass)"') ||
    !snapshot.shellSource.includes('class="pavp-admin-shell__navigation-icon"') ||
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
    navigationButtonTags.length !== 2 ||
    navigationButtonTags.some(
      (tag) =>
        !/\btype\s*=\s*"button"/u.test(tag) ||
        !/@click\s*=\s*"navigate\(item\.routeName\)"/u.test(tag) ||
        /\bdisabled\b|\btabindex\s*=\s*"-1"/u.test(tag),
    )
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
    backdropLines.length !== 6 ||
    backdropLines.some((line) => !allowedBackdropDeclarations.has(line)) ||
    backdropLines.filter((line) => line.includes('blur(')).length !== 2 ||
    /(?:^|\n)\s*filter\s*:|\b(?:brightness|saturate)\s*\(/iu.test(snapshot.shellSource) ||
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
  const canonicalStatusEnd = architectureSource.indexOf('\n---\n')
  const canonicalStatusSource =
    canonicalStatusEnd === -1 ? architectureSource : architectureSource.slice(0, canonicalStatusEnd)
  const canonicalWork = /^CURRENT_BOUNDED_WORK[ \t]*=[ \t]*([^\r\n]+)$/mu
    .exec(canonicalStatusSource)?.[1]
    ?.trim()
  const canonicalAuthority = /^CURRENT_BOUNDED_WORK_AUTHORITY[ \t]*=[ \t]*([^\r\n]+)$/mu
    .exec(canonicalStatusSource)?.[1]
    ?.trim()

  if (canonicalWork === undefined || canonicalAuthority === undefined) {
    violations.push('CURRENT_WORK_ACTIVE_MARKER_REQUIRED')
  } else if (
    !['NONE', expectedCurrentBoundedWork].includes(canonicalWork) ||
    !['NONE', expectedCurrentBoundedWorkAuthority].includes(canonicalAuthority)
  ) {
    violations.push('CURRENT_WORK_UNAUTHORIZED_ID')
  } else if (
    canonicalWork !== expectedCurrentBoundedWork ||
    canonicalAuthority !== expectedCurrentBoundedWorkAuthority
  ) {
    violations.push('CURRENT_WORK_MIRROR_CONFLICT')
  }

  const amendmentHeading = `### 1.2B.0G \`${expectedCurrentBoundedWork}\``
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
    `AMENDMENT=${expectedCurrentBoundedWorkAuthority}`,
    'AMENDMENT_STATUS=FROZEN',
    `WORK_PACKAGE=${expectedCurrentBoundedWork}`,
    'SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT=PROHIBITED',
    `CURRENT_BOUNDED_WORK_AUTHORITY=${expectedCurrentBoundedWorkAuthority}`,
    `CURRENT_BOUNDED_WORK=${expectedCurrentBoundedWork}`,
  ] as const

  if (
    amendmentSource.length === 0 ||
    requiredAmendmentMarkers.some((marker) => !amendmentSource.includes(marker))
  ) {
    violations.push('CURRENT_WORK_FROZEN_RECORD_REQUIRED')
  }

  const architectureLines = architectureSource.split(/\r?\n/u)
  const activeMirrorIndexes = architectureLines.flatMap((line, index) =>
    /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS[ \t]*=/u.test(line) ? [index] : [],
  )

  if (activeMirrorIndexes.length === 0) {
    violations.push('CURRENT_WORK_ACTIVE_MARKER_REQUIRED')
  }

  for (const mirrorIndex of activeMirrorIndexes) {
    const mirrorLines = architectureLines.slice(mirrorIndex, mirrorIndex + 12)
    const workValues = mirrorLines.flatMap((line) => {
      const match = /^CURRENT_BOUNDED_WORK[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
      return match?.[1] === undefined ? [] : [match[1].trim()]
    })
    const authorityValues = mirrorLines.flatMap((line) => {
      const match = /^CURRENT_BOUNDED_WORK_AUTHORITY[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
      return match?.[1] === undefined ? [] : [match[1].trim()]
    })

    if (
      workValues.some((value) => !['NONE', expectedCurrentBoundedWork].includes(value)) ||
      authorityValues.some(
        (value) => !['NONE', expectedCurrentBoundedWorkAuthority].includes(value),
      )
    ) {
      violations.push('CURRENT_WORK_UNAUTHORIZED_ID')
    } else if (
      workValues.length !== 1 ||
      authorityValues.length !== 1 ||
      workValues[0] !== expectedCurrentBoundedWork ||
      authorityValues[0] !== expectedCurrentBoundedWorkAuthority
    ) {
      violations.push('CURRENT_WORK_MIRROR_CONFLICT')
    }
  }

  const completedHistoricalRanges: readonly (readonly [number, number])[] = (() => {
    const ranges: [number, number][] = []
    let fenceStart: number | undefined

    for (const [lineIndex, line] of architectureLines.entries()) {
      if (line === '```text') {
        fenceStart = lineIndex
      } else if (line === '```' && fenceStart !== undefined) {
        const fencedSource = architectureLines.slice(fenceStart + 1, lineIndex).join('\n')
        if (/^STATUS=COMPLETE$/mu.test(fencedSource)) {
          ranges.push([fenceStart, lineIndex])
        }
        fenceStart = undefined
      }
    }

    return ranges
  })()
  const belongsToCompletedHistoricalRecord = (lineIndex: number): boolean =>
    completedHistoricalRanges.some(([start, end]) => lineIndex > start && lineIndex < end)
  const allCurrentWorkMarkers = architectureLines.flatMap((line, lineIndex) => {
    const match = /^CURRENT_BOUNDED_WORK[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
    return match?.[1] === undefined ? [] : [{ lineIndex, value: match[1].trim() }]
  })
  const allCurrentWorkAuthorityMarkers = architectureLines.flatMap((line, lineIndex) => {
    const match = /^CURRENT_BOUNDED_WORK_AUTHORITY[ \t]*=[ \t]*([^\r\n]+)$/u.exec(line)
    return match?.[1] === undefined ? [] : [{ lineIndex, value: match[1].trim() }]
  })

  const hasUnauthorizedCurrentWorkValue =
    allCurrentWorkMarkers.some(
      ({ value }) => !['NONE', expectedCurrentBoundedWork].includes(value),
    ) ||
    allCurrentWorkAuthorityMarkers.some(
      ({ value }) => !['NONE', expectedCurrentBoundedWorkAuthority].includes(value),
    )

  if (hasUnauthorizedCurrentWorkValue) {
    violations.push('CURRENT_WORK_UNAUTHORIZED_ID')
  }
  if (
    !hasUnauthorizedCurrentWorkValue &&
    (allCurrentWorkMarkers.filter(({ value }) => value === expectedCurrentBoundedWork).length !==
      activeMirrorIndexes.length ||
      allCurrentWorkAuthorityMarkers.filter(
        ({ value }) => value === expectedCurrentBoundedWorkAuthority,
      ).length !== activeMirrorIndexes.length ||
      allCurrentWorkMarkers.some(
        ({ lineIndex, value }) =>
          value === 'NONE' && !belongsToCompletedHistoricalRecord(lineIndex),
      ) ||
      allCurrentWorkAuthorityMarkers.some(
        ({ lineIndex, value }) =>
          value === 'NONE' && !belongsToCompletedHistoricalRecord(lineIndex),
      ))
  ) {
    violations.push('CURRENT_WORK_MIRROR_CONFLICT')
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
  const hasFalseImplementationClaim =
    statusValues.length !== activeMirrorIndexes.length ||
    statusValues.some((value) => value !== 'OPEN') ||
    implementationValues.length !== activeMirrorIndexes.length ||
    implementationValues.some((value) => value !== 'COMPLETE') ||
    verificationValues.length !== activeMirrorIndexes.length ||
    verificationValues.some((value) => value !== 'PASS') ||
    admissionValues.length === 0 ||
    admissionValues.some((value) => value !== 'FROZEN') ||
    /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT[ \t]*=/mu.test(architectureSource) ||
    /^PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_(?:IMPLEMENTATION_COMMIT|COMMIT|PUBLICATION_STATUS|RELEASE_STATUS|OWNER_ACCEPTANCE|ACCEPTANCE)[ \t]*=/mu.test(
      architectureSource,
    ) ||
    /^(?:REPOSITORY_IMPLEMENTATION|STATIC_VERIFICATION|IMPLEMENTATION_COMMIT|PUBLICATION_STATUS|RELEASE_STATUS|OWNER_ACCEPTANCE)[ \t]*=/mu.test(
      amendmentSource,
    ) ||
    /^SOURCE_IMPLEMENTATION_IN_THIS_AMENDMENT[ \t]*=[ \t]*(?!PROHIBITED[ \t]*$).+$/mu.test(
      amendmentSource,
    ) ||
    /^PRODUCTION_RELEASE_ACCEPTANCE[ \t]*=[ \t]*(?!REQUIRED_EXTERNAL(?:_|[ \t]*$)).+$/mu.test(
      amendmentSource,
    )

  if (hasFalseImplementationClaim) {
    violations.push('CURRENT_WORK_IMPLEMENTATION_FALSE_CLAIM')
  }

  if (
    !architectureSource.includes(
      'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT_IS_FROZEN',
    ) ||
    !architectureSource.includes('PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS_IS_OPEN') ||
    !architectureSource.includes(
      'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION_IS_COMPLETE',
    ) ||
    !architectureSource.includes(
      'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATIC_VERIFICATION_IS_PASS',
    ) ||
    !architectureSource.includes(`CURRENT_BOUNDED_WORK_IS_${expectedCurrentBoundedWork}`) ||
    /^CURRENT_BOUNDED_WORK_IS_NONE$/mu.test(architectureSource)
  ) {
    violations.push('CURRENT_WORK_MIRROR_CONFLICT')
  }

  return [...new Set(violations)]
}

function runCurrentWorkNegativeProbes(
  architectureSource: string,
): readonly ArchitectureAdminConsoleNegativeProbeResult[] {
  const currentWorkMarker = `CURRENT_BOUNDED_WORK=${expectedCurrentBoundedWork}`
  const probes: readonly [string, string, string][] = [
    [
      'current-work-restored-to-none',
      'CURRENT_WORK_MIRROR_CONFLICT',
      architectureSource.replace(currentWorkMarker, 'CURRENT_BOUNDED_WORK=NONE'),
    ],
    [
      'current-work-unauthorized-id',
      'CURRENT_WORK_UNAUTHORIZED_ID',
      architectureSource.replace(currentWorkMarker, 'CURRENT_BOUNDED_WORK=PAVP_UNAUTHORIZED_WORK'),
    ],
    [
      'current-work-conflicting-mirror',
      'CURRENT_WORK_MIRROR_CONFLICT',
      replaceLastOccurrence(architectureSource, currentWorkMarker, 'CURRENT_BOUNDED_WORK=NONE'),
    ],
    [
      'current-work-false-implementation-regression',
      'CURRENT_WORK_IMPLEMENTATION_FALSE_CLAIM',
      architectureSource.replace(
        'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION=COMPLETE',
        'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION=NOT_STARTED',
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
          failureCodes.length === 1 &&
          failureCodes[0] === expectedFailureCode,
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
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS=OPEN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION=COMPLETE',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATIC_VERIFICATION=PASS',
    'CURRENT_BOUNDED_WORK_AUTHORITY=PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT',
    'CURRENT_BOUNDED_WORK=PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_ADMISSION_AMENDMENT_IS_FROZEN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATUS_IS_OPEN',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_REPOSITORY_IMPLEMENTATION_IS_COMPLETE',
    'PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT_STATIC_VERIFICATION_IS_PASS',
    'CURRENT_BOUNDED_WORK_IS_PAVP_DARK_ACTION_COLOR_HARMONY_REFINEMENT',
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
    'PAVP_RUNTIME_003_STATUS=OPEN',
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
    !snapshot.shellSource.includes('.pavp-admin-shell__navigation-action::before') ||
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
          "html[data-material='reduced'] .pavp-admin-shell__drawer-navigation {",
          "html[data-material='probe-reduced'] .pavp-admin-shell__drawer-navigation {",
        ),
      },
    ],
    [
      'motion-none-drawer-transition-target-removed',
      'MOTION_NONE_TARGETS',
      {
        shellSource: baseline.shellSource.replace(
          "html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active,",
          "html[data-motion='probe-none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active,",
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
  const persistentMousedownExpression = /@mousedown="([^"]+)"/u.exec(baseline.shellSource)?.[1]
  const drawerGuardSource =
    persistentMousedownExpression === undefined
      ? baseline.shellSource
      : replaceLastOccurrence(
          baseline.shellSource,
          '                type="button"\n                @click="navigate(item.routeName)"',
          `                type="button"\n                @mousedown="${persistentMousedownExpression}"\n                @click="navigate(item.routeName)"`,
        )
  const disabledCurrentSource = baseline.shellSource.replace(
    /(\n\s*)(@mousedown="[^"]+")/u,
    '$1:disabled="item.routeName === activeRouteName"$1$2',
  )
  const keyboardRemovedSource = baseline.shellSource.replace(
    /(\n\s*)(@mousedown="[^"]+")/u,
    '$1tabindex="-1"$1$2',
  )
  const probes: readonly [string, string, string][] = [
    [
      'runtime-002-persistent-guard-removed',
      'PAVP_RUNTIME_002_PERSISTENT_MOUSEDOWN_BINDING',
      baseline.shellSource.replace(/\n\s*@mousedown="[^"]+"/u, ''),
    ],
    [
      'runtime-002-guard-applies-to-every-route',
      'PAVP_RUNTIME_002_DIFFERENT_ROUTE_DEFAULT',
      replaceLastOccurrence(baseline.shellSource, 'routeName === props.activeRouteName', 'true'),
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
      baseline.shellSource.replace('event.preventDefault()', 'event.currentTarget?.blur()'),
    ],
    [
      'runtime-002-delayed-focus-restore-restored',
      'PAVP_RUNTIME_002_PROHIBITED_REPAIR',
      baseline.shellSource.replace(
        'event.preventDefault()',
        'setTimeout(() => event.currentTarget?.focus())',
      ),
    ],
    ['runtime-002-current-item-disabled', 'PAVP_RUNTIME_002_NATIVE_BUTTON', disabledCurrentSource],
    [
      'runtime-002-aria-current-removed',
      'PAVP_RUNTIME_002_ARIA_CURRENT',
      baseline.shellSource.replace(
        '                :aria-current="item.routeName === activeRouteName ? \'page\' : undefined"\n',
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
  const packages = isJsonObject(lockfile['packages']) ? lockfile['packages'] : {}
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
    'transition-property: inline-size',
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
  if (overrideNames === undefined || !exactSet(overrideNames, Object.keys(themeOverrideContract))) {
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
    importantMotionDeclarations.length !== 10 ||
    importantMotionDeclarations.some(
      (declaration) =>
        !/^(?:animation|animation-duration|transition|transition-duration|transition-timing-function):/u.test(
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
    runtimeCount(engineeringBudgets) !== 4 ||
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
    shellSource,
    adminTokenSource,
    routeRegistrySource,
    architectureSource,
    appearancePageSource,
    appearanceThemeProjectionSource,
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
  const negativeProbeResults = runArchitectureAdminConsoleNegativeProbes(baseline)
  const motionGeometryNegativeProbeResults = runMotionGeometryNegativeProbes(baseline)
  const runtime002NegativeProbeResults = runRuntime002NegativeProbes(baseline)
  const runtime005NegativeProbeResults = runRuntime005NegativeProbes(baseline)
  const currentWorkNegativeProbeResults = runCurrentWorkNegativeProbes(architectureSource)

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
  if (currentWorkNegativeProbeResults.length !== expectedCurrentWorkNegativeProbeCount) {
    violations.push(
      `Current-work negative-probe count drifted: expected ${String(expectedCurrentWorkNegativeProbeCount)}, received ${String(currentWorkNegativeProbeResults.length)}.`,
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
  for (const result of currentWorkNegativeProbeResults) {
    if (!result.passed) {
      violations.push(
        `${result.id}: reversible in-memory current-work negative probe did not fail.`,
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
    `Architecture Admin Console check: passed (${String(expectedArchitectureAdminConsoleNegativeProbeCount)}/${String(expectedArchitectureAdminConsoleNegativeProbeCount)} Admin/Naive negative probes; ${String(expectedMotionGeometryNegativeProbeCount)}/${String(expectedMotionGeometryNegativeProbeCount)} Motion geometry negative probes; ${String(expectedRuntime002NegativeProbeCount)}/${String(expectedRuntime002NegativeProbeCount)} PAVP-RUNTIME-002 negative probes; ${String(expectedRuntime005NegativeProbeCount)}/${String(expectedRuntime005NegativeProbeCount)} PAVP-RUNTIME-005 negative probes; ${String(expectedCurrentWorkNegativeProbeCount)}/${String(expectedCurrentWorkNegativeProbeCount)} current-work negative probes)`,
  )
}
