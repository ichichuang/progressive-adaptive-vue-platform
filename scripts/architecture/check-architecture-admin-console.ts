import { readFile, readdir } from 'node:fs/promises'
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
  readonly applicationImportSource: string
  readonly manifestAndLockSource: string
  readonly pageVisualSource: string
  readonly appTemplateSource: string
  readonly factImportViolation: boolean
  readonly pageStorageSource: string
  readonly competingAppearanceEnvironmentSource: string
  readonly capabilityPageTemplateSource: string
  readonly themeAdapterSource: string
  readonly generatedManifestsEqual: boolean
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

const rootDirectory = process.cwd()
const expectedNaiveUiVersion = '2.45.2'
const expectedNaiveUiIntegrity =
  'sha512-KshetbFOX/uZ/Pe+60hJoUAo47x5QO1JpZaUVPQCQkNhFfJ7hKsX55A8oMFQHccEpLuQUMPkJ41cX94R4nWUjg=='
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
const expectedAdminAliases = [
  ['admin.ambient.canvas', 'color', '{color.surface.page}', '--ui-admin-ambient-canvas'],
  ['admin.ambient.grid', 'color', '{color.border.default}', '--ui-admin-ambient-grid'],
  ['admin.ambient.light-accent', 'color', '{color.focus.ring}', '--ui-admin-ambient-light-accent'],
  [
    'admin.ambient.light-primary',
    'color',
    '{color.action.primary}',
    '--ui-admin-ambient-light-primary',
  ],
  ['admin.ambient.light-warm', 'color', '{color.text.secondary}', '--ui-admin-ambient-light-warm'],
  ['admin.border.subtle', 'color', '{color.border.default}', '--ui-admin-border-subtle'],
  [
    'admin.chrome.header',
    'color',
    '{material.chrome.adaptive.background}',
    '--ui-admin-chrome-header',
  ],
  [
    'admin.chrome.sidebar',
    'color',
    '{material.chrome.adaptive.background}',
    '--ui-admin-chrome-sidebar',
  ],
  ['admin.navigation.hover', 'color', '{color.surface.panel}', '--ui-admin-navigation-hover'],
  [
    'admin.navigation.selected',
    'color',
    '{color.action.primary}',
    '--ui-admin-navigation-selected',
  ],
  ['admin.shadow.chrome', 'shadow', '{interaction.shadow.panel}', '--ui-admin-shadow-chrome'],
  ['admin.shadow.overlay', 'shadow', '{interaction.shadow.panel}', '--ui-admin-shadow-overlay'],
  ['admin.surface.content', 'color', '{color.surface.panel}', '--ui-admin-surface-content'],
  [
    'admin.surface.overlay',
    'color',
    '{material.overlay.adaptive.background}',
    '--ui-admin-surface-overlay',
  ],
  ['admin.surface.settings', 'color', '{color.surface.panel}', '--ui-admin-surface-settings'],
] as const
const adminAliasResolvedValues = new Map<string, string>([
  ['{color.action.primary}', 'var(--ui-color-action-primary)'],
  ['{color.border.default}', 'var(--ui-color-border-default)'],
  ['{color.focus.ring}', 'var(--ui-color-focus-ring)'],
  ['{color.surface.page}', 'var(--ui-color-surface-page)'],
  ['{color.surface.panel}', 'var(--ui-color-surface-panel)'],
  ['{color.text.secondary}', 'var(--ui-color-text-secondary)'],
  ['{interaction.shadow.panel}', 'var(--ui-shadow-panel)'],
  ['{material.chrome.adaptive.background}', 'var(--ui-material-chrome-background)'],
  ['{material.overlay.adaptive.background}', 'var(--ui-material-overlay-background)'],
])
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
    'borderRadiusMedium',
    'colorFocusPrimary',
    'colorHoverPrimary',
    'colorPressedPrimary',
    'colorPrimary',
    'fontSizeMedium',
    'heightMedium',
    'rippleColor',
    'rippleColorPrimary',
    'textColor',
    'textColorFocus',
    'textColorFocusPrimary',
    'textColorHover',
    'textColorHoverPrimary',
    'textColorPressed',
    'textColorPressedPrimary',
    'textColorPrimary',
  ],
  Descriptions: [
    'borderColor',
    'borderRadius',
    'fontSizeMedium',
    'lineHeight',
    'tdColor',
    'tdTextColor',
    'thColor',
    'thFontWeight',
    'thTextColor',
    'titleTextColor',
  ],
  Radio: [
    'buttonBorderColor',
    'buttonBorderColorActive',
    'buttonBorderColorHover',
    'buttonBorderRadius',
    'buttonBoxShadowFocus',
    'buttonColor',
    'buttonColorActive',
    'buttonHeightMedium',
    'buttonTextColor',
    'buttonTextColorActive',
    'buttonTextColorHover',
    'color',
    'colorActive',
    'dotColorActive',
    'fontSizeMedium',
    'labelLineHeight',
    'textColor',
  ],
  Tag: [
    'border',
    'borderRadius',
    'color',
    'colorBordered',
    'fontSizeMedium',
    'fontWeightStrong',
    'heightMedium',
    'textColor',
  ],
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
  return /<template>([\s\S]*?)<\/template>/u.exec(source)?.[1] ?? ''
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

function materialGateViolations(snapshot: MaterialGateSnapshot): string[] {
  const violations: string[] = []

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
    /#[\da-f]{3,8}\b|\b(?:hsl|hwb|lab|lch|oklab|oklch|rgb)\s*\(|\b(?:backdrop-filter|filter)\s*:|\b(?:blur|brightness|saturate)\s*\(/iu.test(
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
      'naive-common-parser-sensitive-token-alias',
      'NAIVE_COMMON_PARSER_INPUT',
      {
        themeAdapterSource: baseline.themeAdapterSource.replace(
          '  common: {',
          '  common: {\n    primaryColor: colorAction,',
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
  const catalog = isJsonObject(workspace['catalog']) ? workspace['catalog'] : {}
  const packages = isJsonObject(lockfile['packages']) ? lockfile['packages'] : {}
  const importers = isJsonObject(lockfile['importers']) ? lockfile['importers'] : {}
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
  const naivePackageKeys = Object.keys(packages).filter((key) => key.startsWith('naive-ui@'))
  const vuePackageKeys = Object.keys(packages).filter((key) => key.startsWith('vue@'))

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
    tokenManifest.schemaVersion !== 8 ||
    tokenManifest.tokens.length !== 137 ||
    tokenManifest.activePublicRoles.length !== 36 ||
    tokenManifest.unoCssMappings.length !== 36 ||
    tokenManifest.governance.recordCount !== 231 ||
    tokenManifest.governance.baselineRecordCount !== 181 ||
    tokenManifest.governance.expectedRecordCountDelta !== 50 ||
    classProjections.length !== 34 ||
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

  const expectedAdminManifestRecords = expectedAdminAliases.map(
    ([name, type, alias, cssVariable]) => [
      name,
      type,
      adminAliasResolvedValues.get(alias),
      cssVariable,
    ],
  )
  const sourceAliasInvalid = expectedAdminAliases.some(([name, type, alias]) => {
    const segments = name.split('.').slice(1)
    let current: unknown = sourceAdmin

    for (const segment of segments) {
      current = isJsonObject(current) ? current[segment] : undefined
    }

    return (
      !isJsonObject(current) ||
      !isDeepStrictEqual(Object.keys(current), ['$type', '$value', '$extensions']) ||
      current['$type'] !== type ||
      current['$value'] !== alias ||
      !isDeepStrictEqual(current['$extensions'], { 'org.pavp': { role: name } })
    )
  })

  if (
    !isDeepStrictEqual(adminManifestRecords, expectedAdminManifestRecords) ||
    sourceAliasInvalid ||
    !isJsonObject(sourceAdmin['$extensions']) ||
    JSON.stringify(sourceAdmin['$extensions']) !==
      JSON.stringify({ 'org.pavp': { visibility: 'ui-internal' } })
  ) {
    violations.push('The exact fifteen Admin semantic aliases drifted.')
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
    'pavp-route-content-enter',
    'pavp-layered-content-enter',
    '.n-button',
    'pavp-setting-commit',
    'pavp-admin-ambient-drift',
    "data-motion='reduced'",
    "data-motion='none'",
  ]
  const motionSource = shellSource + appStyles + appearancePage + naiveProviderSource

  if (
    requiredMotionMarkers.some((marker) => !motionSource.includes(marker)) ||
    /transition\s*:\s*all\b/iu.test(motionSource) ||
    /\b(?:animation|transition)(?:-duration|-delay)?\s*:[^;]*(?:\d+(?:\.\d+)?)(?:ms|s)\b/iu.test(
      motionSource,
    ) ||
    /\b(?:backdrop-filter|filter)\s*:|\b(?:blur|brightness|saturate)\s*\(/iu.test(motionSource)
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
  const themeSource = await readFile(
    resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'),
    'utf8',
  )
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
    runtimeNumber(designSystemConsoleProjection.publicRoleCount) !== 36 ||
    runtimeNumber(designSystemConsoleProjection.manifestSchemaVersion) !== 8 ||
    runtimeNumber(designSystemConsoleProjection.manifestRecordCount) !== 231 ||
    runtimeNumber(runtimeKernelConsoleProjection.stepCount) !== 11 ||
    runtimeNumber(runtimeErrorCounts.total) !== 21 ||
    !isDeepStrictEqual(runtimeKernelConsoleProjection.activeProviderIds, ['pinia', 'appearance']) ||
    runtimeNumber(routerConsoleProjection.routeCount) !== 17 ||
    runtimeNumber(routerConsoleProjection.productRouteCount) !== 10 ||
    runtimeNumber(routerConsoleProjection.errorRouteCount) !== 7 ||
    runtimeCount(routerRecords) !== 17 ||
    runtimeNumber(storageConsoleProjection.recordCount) !== 2 ||
    runtimeCount(storageRecords) !== 2 ||
    runtimeCount(uiSystemConsoleProjection.publicComponentIds) !== 8 ||
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
  if (
    !isDeepStrictEqual(navigationProjection, [
      ['工作台', ['总览']],
      ['视觉系统', ['主题与外观', '设计令牌']],
      ['应用基础', ['运行时内核', '路由治理', '存储与持久化']],
      ['界面基础', ['UI 组件', '响应式布局']],
      ['开发治理', ['工程与质量']],
      ['架构规划', ['能力路线图']],
    ])
  ) {
    violations.push('Visible Chinese Sidebar taxonomy drifted.')
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
  const applicationSources = await Promise.all(
    applicationFiles.map((path) => readFile(path, 'utf8')),
  )
  const [workspaceSource, lockSource, uiManifestSource, webManifestSource, appSource, themeSource] =
    await Promise.all([
      readFile(resolve(rootDirectory, 'pnpm-workspace.yaml'), 'utf8'),
      readFile(resolve(rootDirectory, 'pnpm-lock.yaml'), 'utf8'),
      readFile(resolve(rootDirectory, 'packages/ui/package.json'), 'utf8'),
      readFile(resolve(rootDirectory, 'apps/web/package.json'), 'utf8'),
      readFile(resolve(rootDirectory, 'apps/web/src/App.vue'), 'utf8'),
      readFile(
        resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'),
        'utf8',
      ),
    ])
  const publicComponentExports = uiPublicComponentRegistry.records.map(
    (record) => record.exportName,
  )
  const baseline: MaterialGateSnapshot = {
    applicationImportSource: applicationSources.join('\n'),
    manifestAndLockSource: [workspaceSource, lockSource, uiManifestSource, webManifestSource].join(
      '\n',
    ),
    pageVisualSource: appearanceAndFacts.pageSource,
    appTemplateSource: appSource,
    factImportViolation: appearanceAndFacts.factImportViolation,
    pageStorageSource: appearanceAndFacts.pageSource,
    competingAppearanceEnvironmentSource: appearanceAndFacts.competingEnvironmentSource,
    capabilityPageTemplateSource: appearanceAndFacts.capabilityTemplate,
    themeAdapterSource: themeSource,
    generatedManifestsEqual:
      engineeringViolations.length === 0 && capabilityViolations.length === 0,
    routeCount: routeRegistry.length,
    publicComponentExports,
    registeredPublicComponents: uiPublicComponentRegistry.records.map((record) => ({
      exportName: record.exportName,
      consumerCount: record.consumerRouteNames.length,
    })),
  }
  const negativeProbeResults = runArchitectureAdminConsoleNegativeProbes(baseline)

  violations.push(
    ...(await validateDependencies()),
    ...(await validateTokensAndLayout()),
    ...(await validateRoutesShellAndMotion()),
    ...appearanceAndFacts.violations,
    ...(await validateNaiveOverrides()),
    ...validateInspectorProjections(),
    ...engineeringViolations,
    ...capabilityViolations,
    ...uiViolations,
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

  return [...new Set(violations)]
}

if (process.argv[1]?.endsWith('check-architecture-admin-console.ts')) {
  const violations = await validateArchitectureAdminConsole()

  if (violations.length > 0) {
    throw new Error(violations.join('\n'))
  }

  console.log('Architecture Admin Console check: passed (16/16 negative probes)')
}
