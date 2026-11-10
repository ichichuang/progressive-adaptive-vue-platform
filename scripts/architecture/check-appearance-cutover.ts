import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import {
  ProductPreferenceDefault,
  applyAppearance,
  captureRadius,
  builtInThemeIds,
  builtInAppearanceThemePreviews,
  projectAccessibleCustomAppearanceThemePreviews,
  explicitThemePreferenceSchema,
  fontScaleValues,
  installCustomThemeBank,
  resolveThemeReference,
  validateCustomThemeDefinition,
} from '@platform/design-system'
import ts from 'typescript'

import {
  parseCustomThemeRegistrySnapshot,
  readCustomThemeRegistry,
  writeCustomThemeRegistry,
} from '../../apps/web/src/app/appearance/custom-theme-registry-storage'
import {
  readStoredPreference,
  writeStoredPreference,
} from '../../apps/web/src/app/appearance/preference-storage'
import { useAppearanceStore } from '../../apps/web/src/app/appearance/appearance.store'
import {
  installAppearanceProvider,
  registerPostMountAppearanceMediaSubscriptions,
} from '../../apps/web/src/app/appearance/appearance-bootstrap'
import { createStartupAttemptId } from '../../apps/web/src/app/bootstrap/lifecycle'
import { createPiniaProvider } from '../../apps/web/src/app/providers/pinia'
import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { parseJsonSource } from '../../packages/design-system/src/build/parse-json'
import { formatThemeBankCssValue } from '../../packages/design-system/src/build/formats/css'
import { deriveThemeBankRecords } from '../../packages/design-system/src/build/formats/typescript'
import { validatePublicRoleRegistry } from '../../packages/design-system/src/build/public-role-registry'
import { generatedThemeRegistry } from '../../packages/design-system/src/generated/theme-registry'
import { completeBuiltInThemeDefinitionSchema } from '../../packages/design-system/src/schema/complete-theme.schema'
import { uiDensityValues } from '../../packages/design-system/src/schema/appearance.schema'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const stableGeneratedHashes = {
  'packages/design-system/src/generated/token-names.ts':
    'bdee98c2c3f7285d53c6af6187f8974f88764e6b737c489d137c1976b2e878d5',
  'packages/design-system/src/generated/tokens.ts':
    '8b8f9cfbedf03425295caf5fdf41601348f18ac340c052142b05563851e625ca',
  'packages/design-system/src/generated/unocss-theme.ts':
    '41df53a033fe3aa942ffc2870488d08013683ea8368719954264c2583dfbace9',
} as const
const expectedPublicRootSymbols = [
  'colorModePreferenceSchema',
  'contrastPreferenceSchema',
  'densityPreferenceSchema',
  'fontScaleSchema',
  'materialPreferenceSchema',
  'motionPreferenceSchema',
  'radiusPreferenceSchema',
  'uiDensitySchema',
  'fontScaleValues',
  'ColorModePreference',
  'ContrastPreference',
  'DensityPreference',
  'FontScale',
  'MaterialPreference',
  'MotionPreference',
  'UiDensity',
  'builtInThemeIds',
  'explicitThemePreferenceSchema',
  'ExplicitThemePreference',
  'ThemeReference',
  'ProductPreferenceDefault',
  'applyAppearance',
  'captureRadius',
  'EffectiveAppearanceState',
  'projectUiAppearance',
  'UiAppearanceSnapshot',
  'projectSequentialColorScale',
  'resolveColorMode',
  'EffectiveColorMode',
  'resolveMotion',
  'ResolveMotionInput',
  'resolveMaterial',
  'EffectiveMaterial',
  'installCustomThemeBank',
  'resolveThemeReference',
  'validateCustomThemeDefinition',
  'CustomThemeRegistryEntry',
  'CustomThemeValidationResult',
  'ThemeBankInstallationResult',
  'ThemeReferenceResolutionResult',
  'ThemeRegistryEntry',
  'tokenNames',
  'TokenName',
  'tokens',
  'layoutRegistry',
  'LayoutProfileId',
  'LayoutRegistry',
  'LayoutRegistryRecord',
  'LayoutTokenId',
  'platformPreset',
  'designSystemConsoleProjection',
  'DesignSystemConsoleProjection',
  'builtInAppearanceThemePreviews',
  'projectAccessibleCustomAppearanceThemePreviews',
  'AppearanceThemePreviewProjection',
  'AppearanceThemePreviewSwatches',
] as const
const expectedStoreActions = [
  'restoreAppearance',
  'synchronizeAppearance',
  'readEffectiveAppearance',
  'changeAppearancePreference',
  'resetAppearancePreference',
  'replaceCustomThemeRegistry',
  'deleteCustomTheme',
  'reapplyAppearance',
] as const

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: JsonObject, expected: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort(compareCodePoints)
  const expectedKeys = [...expected].sort(compareCodePoints)

  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  )
}

function sourceFile(path: string, sourceText: string): ts.SourceFile {
  return ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function propertyName(node: ts.PropertyName | ts.BindingName | undefined): string | undefined {
  if (node === undefined) {
    return undefined
  }

  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text
  }

  return undefined
}

function exportNames(file: ts.SourceFile): string[] {
  const names: string[] = []

  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause !== undefined) {
      if (ts.isNamedExports(statement.exportClause)) {
        names.push(...statement.exportClause.elements.map((element) => element.name.text))
      }
      continue
    }

    const exported =
      ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)

    if (!exported) {
      continue
    }

    if (ts.isVariableStatement(statement)) {
      names.push(
        ...statement.declarationList.declarations.flatMap((declaration) => {
          const name = propertyName(declaration.name)
          return name === undefined ? [] : [name]
        }),
      )
    } else if (
      ts.isFunctionDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isClassDeclaration(statement)
    ) {
      if (statement.name !== undefined) {
        names.push(statement.name.text)
      }
    }
  }

  return names
}

function objectProperty(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.ObjectLiteralElementLike | undefined {
  return object.properties.find((property) => propertyName(property.name) === name)
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression
  }

  return current
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory() && entry.name !== 'dist' && entry.name !== 'node_modules') {
      files.push(...(await collectFiles(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

function colorRuntimeEntryViolations(sources: ReadonlyMap<string, string>): readonly string[] {
  const violations: string[] = []
  const helperPath = 'packages/design-system/src/schema/css-color.ts'
  const helperSource = sources.get(helperPath)

  if (
    helperSource === undefined ||
    !helperSource.includes("from 'colorjs.io/fn'") ||
    helperSource.includes("from 'colorjs.io'")
  ) {
    violations.push('css-color.ts must own the exact tree-shakeable Color.js public entry.')
  }

  for (const requiredSymbol of [
    'ColorSpace',
    'parse',
    'inGamut',
    'getAll',
    'contrastWCAG21',
    'sRGB',
    'sRGB_Linear',
    'HSL',
    'HWB',
    'Lab',
    'LCH',
    'OKLab',
    'OKLCH',
    'P3',
    'A98RGB',
    'ProPhoto',
    'REC_2020',
    'XYZ_D50',
    'XYZ_D65',
  ]) {
    if (helperSource?.includes(requiredSymbol) !== true) {
      violations.push(`css-color.ts must retain the admitted ${requiredSymbol} operation or space.`)
    }
  }

  for (const [path, source] of sources) {
    if (path !== helperPath && /from\s+['"]colorjs\.io(?:\/fn)?['"]/u.test(source)) {
      violations.push(`${path}: runtime Color.js imports must remain owned by css-color.ts.`)
    }
  }

  for (const [path, expectedImport] of [
    ['packages/design-system/src/schema/complete-theme.schema.ts', "from './css-color'"],
    ['packages/design-system/src/runtime/theme-registry.ts', "from '../schema/css-color'"],
  ] as const) {
    if (sources.get(path)?.includes(expectedImport) !== true) {
      violations.push(`${path}: the private CSS Color operation boundary drifted.`)
    }
  }

  return violations
}

async function validateColorRuntimeEntryOwnership(): Promise<readonly string[]> {
  const sourceFiles = (
    await Promise.all(
      ['schema', 'runtime'].map((directory) =>
        collectFiles(resolve(rootDirectory, 'packages/design-system/src', directory)),
      ),
    )
  )
    .flat()
    .filter((path) => extname(path) === '.ts')
  const sources = new Map<string, string>()

  for (const path of sourceFiles) {
    sources.set(relative(rootDirectory, path).split(sep).join('/'), await readFile(path, 'utf8'))
  }

  const violations = [...colorRuntimeEntryViolations(sources)]
  const helperPath = 'packages/design-system/src/schema/css-color.ts'
  const helperSource = sources.get(helperPath)
  const themeRegistryPath = 'packages/design-system/src/runtime/theme-registry.ts'
  const themeRegistrySource = sources.get(themeRegistryPath)

  if (helperSource === undefined || themeRegistrySource === undefined) {
    return [...violations, 'Color runtime ownership probe inputs are missing.']
  }

  const broadEntryProbe = new Map(sources)
  broadEntryProbe.set(helperPath, helperSource.replace('colorjs.io/fn', 'colorjs.io'))
  const competingOwnerProbe = new Map(sources)
  competingOwnerProbe.set(
    themeRegistryPath,
    `${themeRegistrySource}\nimport Color from 'colorjs.io'\nvoid Color\n`,
  )

  if (colorRuntimeEntryViolations(broadEntryProbe).length === 0) {
    violations.push('Color.js broad-entry reversible in-memory negative probe did not fail.')
  }

  if (colorRuntimeEntryViolations(competingOwnerProbe).length === 0) {
    violations.push('Color.js competing-owner reversible in-memory negative probe did not fail.')
  }

  return violations
}

const explicitAppearanceAxisKeys = [
  'colorMode',
  'theme',
  'contrast',
  'material',
  'density',
  'fontScale',
  'motion',
] as const
const safetyBaselineKeys = [
  'effectiveColorMode',
  'effectiveTheme',
  'effectiveContrast',
  'effectiveMaterial',
  'effectiveDensity',
] as const

function isStaticLiteralTree(expression: ts.Expression): boolean {
  const value = unwrapExpression(expression)

  if (
    ts.isStringLiteral(value) ||
    ts.isNumericLiteral(value) ||
    value.kind === ts.SyntaxKind.TrueKeyword ||
    value.kind === ts.SyntaxKind.FalseKeyword ||
    value.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true
  }

  if (ts.isPrefixUnaryExpression(value)) {
    return ts.isNumericLiteral(value.operand)
  }

  if (ts.isArrayLiteralExpression(value)) {
    return value.elements.every((element) =>
      ts.isSpreadElement(element) ? false : isStaticLiteralTree(element),
    )
  }

  if (ts.isObjectLiteralExpression(value)) {
    return value.properties.every(
      (property) => ts.isPropertyAssignment(property) && isStaticLiteralTree(property.initializer),
    )
  }

  return false
}

function objectKeys(object: ts.ObjectLiteralExpression): readonly string[] {
  return object.properties.flatMap((property) => {
    const name = propertyName(property.name)
    return name === undefined ? [] : [name]
  })
}

function scanConsumerAppearanceAuthorities(path: string, sourceText: string): readonly string[] {
  const violations: string[] = []
  if (
    sourceText.includes('--ui-control-height-baseline') &&
    !path.endsWith('/packages/ui/src/adapters/naive/pavp-naive-theme.ts')
  )
    violations.push(`density-internal-baseline-owner:${path}`)
  const file = sourceFile(path, sourceText)

  function inspect(node: ts.Node): void {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = new Set(objectKeys(node))
      const authoredDefault = explicitAppearanceAxisKeys.every((key) => keys.has(key))

      if (
        authoredDefault &&
        node.properties.every(
          (property) =>
            !ts.isPropertyAssignment(property) || isStaticLiteralTree(property.initializer),
        )
      ) {
        violations.push(`no-consumer-authored-appearance-default:${path}`)
        violations.push(`single-product-default-authority:${path}`)
      }

      const themeId = objectProperty(node, 'themeId')

      if (
        themeId !== undefined &&
        ts.isPropertyAssignment(themeId) &&
        ts.isStringLiteral(unwrapExpression(themeId.initializer))
      ) {
        violations.push(`no-theme-literal-runtime-state:${path}`)
      }

      for (const name of ['fontScale', 'density'] as const) {
        const property = objectProperty(node, name)

        if (
          property !== undefined &&
          ts.isPropertyAssignment(property) &&
          isStaticLiteralTree(property.initializer)
        ) {
          violations.push(`no-unapproved-density-or-font-scale:${path}`)
        }
      }
    }

    const firstArgument = ts.isCallExpression(node) ? node.arguments[0] : undefined
    const secondArgument = ts.isCallExpression(node) ? node.arguments[1] : undefined

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'setAttribute' &&
      firstArgument !== undefined &&
      secondArgument !== undefined &&
      ts.isStringLiteral(firstArgument) &&
      ts.isStringLiteral(secondArgument)
    ) {
      if (firstArgument.text === 'data-theme') {
        violations.push(`no-theme-literal-runtime-state:${path}`)
      }

      if (firstArgument.text === 'data-density') {
        violations.push(`no-unapproved-density-or-font-scale:${path}`)
      }
    }

    ts.forEachChild(node, inspect)
  }

  inspect(file)

  if (/--ui-font-scale\s*:\s*(?:0?\.\d+|\d+(?:\.\d+)?)/u.test(sourceText)) {
    violations.push(`no-unapproved-density-or-font-scale:${path}`)
  }

  return [...new Set(violations)]
}

function scanDesignSystemAppearanceAuthorities(
  path: string,
  sourceText: string,
): readonly string[] {
  const violations: string[] = []
  const file = sourceFile(path, sourceText)

  function inspect(node: ts.Node): void {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = new Set(objectKeys(node))

      if (
        explicitAppearanceAxisKeys.every((key) => keys.has(key)) &&
        node.properties.every(
          (property) =>
            !ts.isPropertyAssignment(property) || isStaticLiteralTree(property.initializer),
        ) &&
        !path.endsWith('/runtime/appearance-defaults.ts') &&
        !path.endsWith('/build/build.ts')
      ) {
        violations.push(`single-product-default-authority:${path}`)
      }

      if (
        safetyBaselineKeys.every((key) => keys.has(key)) &&
        !path.endsWith('/build/formats/first-paint.ts')
      ) {
        violations.push(`single-safety-baseline-authority:${path}`)
      }
    }

    ts.forEachChild(node, inspect)
  }

  inspect(file)
  return [...new Set(violations)]
}

async function validatePackageFiveStaticAuthorities(): Promise<readonly string[]> {
  const violations: string[] = []
  const consumerFiles = [
    ...(await collectFiles(resolve(rootDirectory, 'apps/web/src'))),
    ...(await collectFiles(resolve(rootDirectory, 'packages/ui/src'))),
  ].filter((path) => ['.css', '.ts', '.vue'].includes(extname(path)))

  for (const path of consumerFiles) {
    const source = await readFile(path, 'utf8')
    violations.push(...scanConsumerAppearanceAuthorities(path, source))
  }

  const designSystemFiles = (
    await collectFiles(resolve(rootDirectory, 'packages/design-system/src'))
  ).filter((path) => extname(path) === '.ts' && !path.includes(`${sep}generated${sep}`))
  let productDefaultDeclarations = 0
  let safetyBaselineDeclarations = 0

  for (const path of designSystemFiles) {
    const sourceText = await readFile(path, 'utf8')
    const file = sourceFile(path, sourceText)

    for (const statement of file.statements.filter(ts.isVariableStatement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (propertyName(declaration.name) === 'ProductPreferenceDefault') {
          productDefaultDeclarations += 1

          if (!path.endsWith('/runtime/appearance-defaults.ts')) {
            violations.push(`single-product-default-authority:${path}`)
          }
        }

        if (propertyName(declaration.name) === 'preInitializationSafetyBaseline') {
          safetyBaselineDeclarations += 1

          if (!path.endsWith('/build/formats/first-paint.ts')) {
            violations.push(`single-safety-baseline-authority:${path}`)
          }
        }
      }
    }

    violations.push(...scanDesignSystemAppearanceAuthorities(path, sourceText))
  }

  if (productDefaultDeclarations !== 1) {
    violations.push('single-product-default-authority: declaration count must equal one.')
  }

  if (safetyBaselineDeclarations !== 1) {
    violations.push('single-safety-baseline-authority: declaration count must equal one.')
  }

  const consumerNegativeProbe = scanConsumerAppearanceAuthorities(
    '<package-five-consumer-negative-probe>',
    `const duplicate = {
      colorMode: 'system',
      theme: { registryKind: 'built-in', themeId: 'royal-iris' },
      contrast: 'standard',
      material: 'adaptive',
      density: { preset: 'comfortable', scale: 1 },
      fontScale: 1,
      motion: 'full',
    }
    target.setAttribute('data-theme', 'neutral')`,
  )
  if (
    !scanConsumerAppearanceAuthorities(
      '<density-page-negative-probe>',
      "const height = 'var(--ui-control-height-baseline)'",
    ).some((violation) => violation.startsWith('density-internal-baseline-owner:'))
  )
    violations.push('density-internal-baseline-owner: negative probe did not fail.')
  const safetyNegativeProbe = scanDesignSystemAppearanceAuthorities(
    '<package-five-safety-negative-probe>',
    `const duplicateSafety = {
      effectiveColorMode: 'light',
      effectiveTheme: { registryKind: 'built-in', themeId: 'royal-iris' },
      effectiveContrast: 'standard',
      effectiveMaterial: 'solid',
      effectiveDensity: 'comfortable',
    }`,
  )

  for (const rule of [
    'no-unapproved-density-or-font-scale',
    'no-consumer-authored-appearance-default',
    'no-theme-literal-runtime-state',
    'single-product-default-authority',
  ]) {
    if (!consumerNegativeProbe.some((violation) => violation.startsWith(`${rule}:`))) {
      violations.push(`${rule}: reversible in-memory negative probe did not fail.`)
    }
  }

  if (
    !safetyNegativeProbe.some((violation) =>
      violation.startsWith('single-safety-baseline-authority:'),
    )
  ) {
    violations.push('single-safety-baseline-authority: negative probe did not fail.')
  }

  return [...new Set(violations)]
}

async function validateStableGeneratedOutputs(): Promise<readonly string[]> {
  const violations: string[] = []

  for (const [path, expectedHash] of Object.entries(stableGeneratedHashes)) {
    const actualHash = createHash('sha256')
      .update(await readFile(resolve(rootDirectory, path)))
      .digest('hex')

    if (actualHash !== expectedHash) {
      violations.push(`${path}: Package-entry stable SHA-256 changed.`)
    }
  }

  return violations
}

async function validatePublicRoot(): Promise<readonly string[]> {
  const path = resolve(rootDirectory, 'packages/design-system/src/index.ts')
  const file = sourceFile(path, await readFile(path, 'utf8'))
  const actual = exportNames(file)

  if (
    actual.length !== expectedPublicRootSymbols.length ||
    actual.some((name, index) => name !== expectedPublicRootSymbols[index])
  ) {
    return [
      `packages/design-system/src/index.ts: expected the frozen ordered ${String(expectedPublicRootSymbols.length)}-symbol public root, received [${actual.join(', ')}].`,
    ]
  }

  return []
}

async function validateFiveBuiltInThemes(): Promise<readonly string[]> {
  const violations: string[] = []
  const expectedIdentities = [
    ['royal-iris', 'Royal Iris'],
    ['cobalt-tide', 'Cobalt Tide'],
    ['emerald-grove', 'Emerald Grove'],
    ['ember-coral', 'Ember Coral'],
    ['berry-bloom', 'Berry Bloom'],
  ] as const
  const generatedIdentities = generatedThemeRegistry.builtInEntries.map((entry) => [
    entry.themeId,
    entry.definition.label,
  ])

  if (
    !isDeepStrictEqual(
      builtInThemeIds,
      expectedIdentities.map(([themeId]) => themeId),
    ) ||
    !isDeepStrictEqual(generatedIdentities, expectedIdentities)
  ) {
    violations.push(
      'Five Built-in Theme IDs, labels, or canonical order drifted from the Owner contract.',
    )
  }

  for (const entry of generatedThemeRegistry.builtInEntries) {
    const preview = builtInAppearanceThemePreviews.find(
      (candidate) => candidate.themeId === entry.themeId,
    )
    for (const colorMode of ['light', 'dark'] as const)
      for (const contrast of ['standard', 'enhanced'] as const)
        for (const [field, role] of [
          ['surfacePage', 'color.surface.page'],
          ['surfacePanel', 'color.surface.panel'],
          ['actionPrimary', 'color.action.primary'],
          ['controlPrimary', 'color.control.primary'],
          ['borderDefault', 'color.border.default'],
          ['focusRing', 'color.focus.ring'],
        ] as const) {
          const expected = entry.bank.records.find(
            (record) =>
              record.colorMode === colorMode &&
              record.contrast === contrast &&
              record.publicRole === role,
          )?.resolvedValue
          if (preview?.planes[colorMode][contrast][field] !== expected)
            violations.push(
              `${entry.themeId}/${colorMode}/${contrast}: preview ${field} must resolve its local palette alias.`,
            )
        }
    const validation = validateCustomThemeDefinition({
      ...resolvedCustomThemeProbeDefinition(),
      id: entry.themeId,
    })
    if (
      validation.status !== 'validated' ||
      projectAccessibleCustomAppearanceThemePreviews([validation.entry]).length !== 1
    )
      violations.push('New same-ID Custom themes must remain available in the preview gallery.')
  }

  const colorValues = generatedThemeRegistry.builtInEntries.flatMap((entry) => [
    ...Object.values(entry.definition.planes.light.standard),
    ...Object.values(entry.definition.planes.light.enhanced),
    ...Object.values(entry.definition.planes.dark.standard),
    ...Object.values(entry.definition.planes.dark.enhanced),
  ])
  const scrimValues = generatedThemeRegistry.builtInEntries.flatMap((entry) => [
    entry.definition.planes.light.standard['color.scrim.viewport'],
    entry.definition.planes.light.enhanced['color.scrim.viewport'],
    entry.definition.planes.dark.standard['color.scrim.viewport'],
    entry.definition.planes.dark.enhanced['color.scrim.viewport'],
  ])
  const expectedSourceFiles = expectedIdentities
    .map(([themeId]) => `${themeId}.theme.json`)
    .sort(compareCodePoints)
  const actualSourceFiles = (
    await readdir(resolve(rootDirectory, 'packages/design-system/tokens/themes/complete'))
  ).sort(compareCodePoints)
  const appearanceFiles = await readdir(resolve(rootDirectory, 'apps/web/src/app/appearance'))

  if (
    colorValues.length !== 600 ||
    colorValues.filter((value) => value.startsWith('{palette.')).length !== 580 ||
    scrimValues.length !== 20 ||
    scrimValues.some((value) => typeof value !== 'string' || value !== 'rgba(0, 0, 0, 0.56)')
  ) {
    violations.push(
      'Five Built-in Themes must use 580 local palette aliases and 20 unchanged fixed-alpha scrims.',
    )
  }

  if (!isDeepStrictEqual(actualSourceFiles, expectedSourceFiles)) {
    violations.push('Complete Built-in Theme source files must equal the exact five-theme set.')
  }

  if (
    appearanceFiles.includes('curated-custom-theme-catalog.json') ||
    appearanceFiles.includes('curated-custom-theme-catalog.ts')
  ) {
    violations.push('The rejected Curated Custom Theme Catalog source or reader remains active.')
  }

  return violations
}

function validateStoreAst(path: string, sourceText: string): readonly string[] {
  const violations: string[] = []
  const file = sourceFile(path, sourceText)
  const actionMethods = new Map<string, ts.MethodDeclaration>()
  const storeState = file.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'AppearanceStoreState',
  )

  if (
    storeState?.members.map((member) => propertyName(member.name)).join(',') !==
    'preference,customThemeRegistry'
  ) {
    violations.push('appearance.store.ts: AppearanceStoreState must contain exactly two fields.')
  }

  const storeExports = exportNames(file)

  if (!isDeepStrictEqual(storeExports, ['useAppearanceStore'])) {
    violations.push('appearance.store.ts: only useAppearanceStore may be exported.')
  }

  let storeOptions: ts.ObjectLiteralExpression | undefined

  function findStoreOptions(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineStore'
    ) {
      const options = node.arguments[1]

      if (options !== undefined && ts.isObjectLiteralExpression(options)) {
        storeOptions = options
      }
    }

    ts.forEachChild(node, findStoreOptions)
  }

  findStoreOptions(file)

  if (storeOptions === undefined) {
    violations.push('appearance.store.ts: the one Pinia options Store is missing.')
  } else {
    const actionsProperty = objectProperty(storeOptions, 'actions')
    const actionsObject =
      actionsProperty !== undefined &&
      ts.isPropertyAssignment(actionsProperty) &&
      ts.isObjectLiteralExpression(actionsProperty.initializer)
        ? actionsProperty.initializer
        : undefined
    const actionNames = actionsObject?.properties.map((property) => propertyName(property.name))

    for (const property of actionsObject?.properties ?? []) {
      if (ts.isMethodDeclaration(property)) {
        const name = propertyName(property.name)

        if (name !== undefined) {
          actionMethods.set(name, property)
        }
      }
    }

    if (!isDeepStrictEqual(actionNames, expectedStoreActions)) {
      violations.push(
        'appearance.store.ts: Store Actions must equal the admitted Appearance surface.',
      )
    }

    const stateProperty = objectProperty(storeOptions, 'state')
    let stateObject: ts.ObjectLiteralExpression | undefined

    if (
      stateProperty !== undefined &&
      ts.isPropertyAssignment(stateProperty) &&
      ts.isArrowFunction(stateProperty.initializer)
    ) {
      const body = unwrapExpression(stateProperty.initializer.body as ts.Expression)

      if (ts.isObjectLiteralExpression(body)) {
        stateObject = body
      }
    }

    if (
      stateObject?.properties.map((property) => propertyName(property.name)).join(',') !==
      'preference,customThemeRegistry'
    ) {
      violations.push('appearance.store.ts: Pinia state must initialize exactly two fields.')
    }
  }

  const transaction = file.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'commitAppearanceTransition',
  )

  if (
    transaction === undefined ||
    transaction.modifiers?.some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.AsyncKeyword ||
        modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  ) {
    violations.push(
      'appearance.store.ts: commitAppearanceTransition must be one private synchronous function.',
    )
  }

  const callOwners = new Map<string, string[]>()
  const transactionIntents = new Map<string, string[]>()
  let awaitCount = 0

  function inspectCalls(node: ts.Node, owner = '<module>'): void {
    let nextOwner = owner

    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      nextOwner = node.name.text
    } else if (ts.isMethodDeclaration(node)) {
      nextOwner = propertyName(node.name) ?? '<method>'
    }

    if (ts.isAwaitExpression(node) && nextOwner === 'commitAppearanceTransition') {
      awaitCount += 1
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text

      if (
        [
          'resolveThemeReference',
          'projectUiAppearance',
          'installCustomThemeBank',
          'applyAppearance',
          'writeStoredPreference',
          'writeCustomThemeRegistry',
          'captureStoredPreference',
          'restoreStoredPreference',
          'captureCustomThemeRegistry',
          'restoreCustomThemeRegistry',
          'commitAppearanceTransition',
        ].includes(name)
      ) {
        const owners = callOwners.get(name) ?? []
        owners.push(nextOwner)
        callOwners.set(name, owners)

        if (name === 'commitAppearanceTransition') {
          const intent = node.arguments[5]
          const values = transactionIntents.get(nextOwner) ?? []
          values.push(
            intent !== undefined && ts.isStringLiteral(intent) ? intent.text : '<non-literal>',
          )
          transactionIntents.set(nextOwner, values)
        }
      }
    }

    ts.forEachChild(node, (child) => {
      inspectCalls(child, nextOwner)
    })
  }

  inspectCalls(file)

  for (const name of [
    'resolveThemeReference',
    'projectUiAppearance',
    'installCustomThemeBank',
    'applyAppearance',
  ]) {
    if (
      !isDeepStrictEqual([...new Set(callOwners.get(name) ?? [])], ['commitAppearanceTransition'])
    ) {
      violations.push(`appearance.store.ts: ${name} may run only inside the transaction.`)
    }
  }

  const transactionSource = transaction?.getText(file) ?? ''
  const projectionPosition = transactionSource.indexOf('projectUiAppearance(')
  if (
    projectionPosition < 0 ||
    projectionPosition > transactionSource.indexOf('installCustomThemeBank(') ||
    projectionPosition > transactionSource.indexOf('applyAppearance(')
  ) {
    violations.push(
      'appearance.store.ts: the UI status projection must be prepared before any Bank or Appearance DOM write.',
    )
  }

  const expectedTransactionIntents = new Map<string, readonly string[]>([
    ['restoreAppearance', ['none']],
    ['synchronizeAppearance', ['none']],
    ['changeAppearancePreference', ['preference']],
    ['resetAppearancePreference', ['preference']],
    ['replaceCustomThemeRegistry', ['registry']],
    ['reapplyAppearance', ['none']],
  ])

  for (const [owner, intents] of expectedTransactionIntents) {
    if (!isDeepStrictEqual([...new Set(transactionIntents.get(owner) ?? [])], intents)) {
      violations.push(`appearance.store.ts: ${owner} persistence intent drifted.`)
    }
  }

  if (transactionIntents.has('deleteCustomTheme')) {
    violations.push('appearance.store.ts: deleteCustomTheme must remain outside the transaction.')
  }

  if (
    !isDeepStrictEqual(
      [...new Set(callOwners.get('writeStoredPreference') ?? [])],
      ['commitAppearanceTransition'],
    )
  ) {
    violations.push('appearance.store.ts: the Preference Writer has one authorized caller.')
  }

  const registryWriterOwners = [...new Set(callOwners.get('writeCustomThemeRegistry') ?? [])].sort(
    compareCodePoints,
  )

  if (
    !isDeepStrictEqual(registryWriterOwners, ['commitAppearanceTransition', 'deleteCustomTheme'])
  ) {
    violations.push(
      'appearance.store.ts: Registry Writer callers must be transaction plus deletion only.',
    )
  }

  for (const [name, expectedOwners] of [
    ['captureStoredPreference', []],
    ['restoreStoredPreference', []],
    ['captureCustomThemeRegistry', []],
    ['restoreCustomThemeRegistry', []],
  ] as const) {
    const actualOwners = [...new Set(callOwners.get(name) ?? [])].sort(compareCodePoints)
    const canonicalExpectedOwners = [...expectedOwners].sort(compareCodePoints)

    if (!isDeepStrictEqual(actualOwners, canonicalExpectedOwners)) {
      violations.push(`appearance.store.ts: ${name} callers drifted.`)
    }
  }

  if (awaitCount !== 0) {
    violations.push('appearance.store.ts: commitAppearanceTransition must not contain await.')
  }

  const persistenceIntent = file.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'PersistenceIntent',
  )
  const intentValues =
    persistenceIntent !== undefined && ts.isUnionTypeNode(persistenceIntent.type)
      ? persistenceIntent.type.types.flatMap((type) =>
          ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal) ? [type.literal.text] : [],
        )
      : []

  if (!isDeepStrictEqual(intentValues, ['none', 'preference', 'registry'])) {
    violations.push('appearance.store.ts: persistence intent must equal the closed set.')
  }

  if (
    sourceText.includes('cssText') ||
    /(?:get|set|remove)Attribute\(\s*['"]style['"]/u.test(sourceText)
  ) {
    violations.push('appearance.store.ts: whole-style capture or restoration is forbidden.')
  }

  const appearanceAttributeDeclaration = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((declaration) => propertyName(declaration.name) === 'appearanceAttributeNames')
  const appearanceAttributeInitializer = appearanceAttributeDeclaration?.initializer
  const appearanceAttributes =
    appearanceAttributeInitializer !== undefined &&
    ts.isAsExpression(appearanceAttributeInitializer)
      ? appearanceAttributeInitializer.expression
      : appearanceAttributeInitializer
  const actualAppearanceAttributes =
    appearanceAttributes !== undefined && ts.isArrayLiteralExpression(appearanceAttributes)
      ? appearanceAttributes.elements.flatMap((element) =>
          ts.isStringLiteral(element) ? [element.text] : [],
        )
      : []

  if (
    !isDeepStrictEqual(actualAppearanceAttributes, [
      'data-color-mode',
      'data-theme-kind',
      'data-theme',
      'data-contrast',
      'data-material',
      'data-density',
      'data-motion',
    ])
  ) {
    violations.push('appearance.store.ts: DOM capture must equal seven Appearance attributes.')
  }

  const deletion = actionMethods.get('deleteCustomTheme')
  const deletionSource =
    deletion === undefined ? '' : sourceText.slice(deletion.getStart(file), deletion.getEnd())

  for (const forbidden of [
    'commitAppearanceTransition',
    'this.preference =',
    'document.',
    'installCustomThemeBank',
    'applyAppearance',
    'writeStoredPreference',
    'captureStoredPreference',
    'restoreStoredPreference',
  ]) {
    if (deletionSource.includes(forbidden)) {
      violations.push(`appearance.store.ts: deleteCustomTheme contains forbidden ${forbidden}.`)
    }
  }

  for (const required of [
    'readStoredPreference()',
    'validateCustomThemeRegistryEntries(remainingEntries)',
    'writeCustomThemeRegistry(validation.entries)',
    'this.customThemeRegistry = validation.entries',
  ]) {
    if (!deletionSource.includes(required)) {
      violations.push(`appearance.store.ts: deleteCustomTheme is missing ${required}.`)
    }
  }

  for (const retiredCatalogSymbol of [
    'installCuratedCustomThemeCatalog',
    'readCuratedCustomThemeCatalog',
  ]) {
    if (sourceText.includes(retiredCatalogSymbol)) {
      violations.push(
        `appearance.store.ts: retired Catalog symbol ${retiredCatalogSymbol} remains.`,
      )
    }
  }

  if (
    sourceText.includes('JSON.stringify(previousEntry.definition)') ||
    !sourceText.includes('jsonValuesEqual(previousEntry.definition, candidateEntry.definition)')
  ) {
    violations.push(
      'appearance.store.ts: Registry replacement equality must ignore object-key insertion order.',
    )
  }

  if (!sourceText.includes('previousState.preference ?? productDefaultPreference()')) {
    violations.push(
      'appearance.store.ts: a null prior Preference must still clear a failed Custom Bank semantically.',
    )
  }

  return violations
}

function validateStorageOwnerAst(
  path: string,
  sourceText: string,
  expectedOwners: Readonly<Record<'getItem' | 'removeItem' | 'setItem', readonly string[]>>,
): readonly string[] {
  const violations: string[] = []
  const file = sourceFile(path, sourceText)
  const owners = new Map<string, string[]>()

  function inspect(node: ts.Node, owner = '<module>'): void {
    let nextOwner = owner

    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      nextOwner = node.name.text
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'localStorage' &&
      ['getItem', 'removeItem', 'setItem'].includes(node.expression.name.text)
    ) {
      const methodOwners = owners.get(node.expression.name.text) ?? []
      methodOwners.push(nextOwner)
      owners.set(node.expression.name.text, methodOwners)
    }

    ts.forEachChild(node, (child) => {
      inspect(child, nextOwner)
    })
  }

  inspect(file)

  for (const method of ['getItem', 'removeItem', 'setItem'] as const) {
    const actual = [...new Set(owners.get(method) ?? [])].sort(compareCodePoints)
    const expected = [...expectedOwners[method]].sort(compareCodePoints)

    if (!isDeepStrictEqual(actual, expected)) {
      violations.push(`${relative(rootDirectory, path)}: localStorage.${method} owners drifted.`)
    }
  }

  return violations
}

function hasExecutableIdentifier(path: string, sourceText: string, name: string): boolean {
  const file = sourceFile(path, sourceText)
  let found = false

  function staticElementAccessName(expression: ts.Expression | undefined): string | undefined {
    if (expression === undefined) {
      return undefined
    }

    const current = unwrapExpression(expression)
    return ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)
      ? current.text
      : undefined
  }

  function isBrowserGlobal(expression: ts.Expression): boolean {
    const current = unwrapExpression(expression)
    return ts.isIdentifier(current) && ['globalThis', 'self', 'window'].includes(current.text)
  }

  function inspect(node: ts.Node): void {
    if (
      (ts.isIdentifier(node) &&
        node.text === name &&
        !(
          (ts.isPropertyAssignment(node.parent) || ts.isMethodDeclaration(node.parent)) &&
          node.parent.name === node
        )) ||
      (ts.isElementAccessExpression(node) &&
        isBrowserGlobal(node.expression) &&
        staticElementAccessName(node.argumentExpression) === name)
    ) {
      found = true
    }

    if (!found) {
      ts.forEachChild(node, inspect)
    }
  }

  inspect(file)
  return found
}

function scanDesignSystemStorageAccess(displayPath: string, sourceText: string): readonly string[] {
  const violations: string[] = []

  if (hasExecutableIdentifier(displayPath, sourceText, 'sessionStorage')) {
    violations.push(`${displayPath}: Design System sessionStorage access is forbidden.`)
  }

  if (
    hasExecutableIdentifier(displayPath, sourceText, 'localStorage') &&
    displayPath !== 'packages/design-system/src/generated/appearance-init.js'
  ) {
    violations.push(`${displayPath}: Design System direct localStorage access is forbidden.`)
  }

  return violations
}

async function validateApplicationOrchestration(): Promise<readonly string[]> {
  const violations: string[] = []
  const appearanceDirectory = resolve(rootDirectory, 'apps/web/src/app/appearance')
  const appearanceFiles = await collectFiles(appearanceDirectory)
  const storageOwners = new Set([
    'apps/web/src/app/appearance/preference-storage.ts',
    'apps/web/src/app/appearance/custom-theme-registry-storage.ts',
  ])
  const storageOwnerDirectoryPrefix = 'apps/web/src/app/storage/'
  const applicationFiles = await collectFiles(resolve(rootDirectory, 'apps/web/src'))
  const piniaImporters: string[] = []

  for (const path of applicationFiles.filter((file) => ['.ts', '.vue'].includes(extname(file)))) {
    const displayPath = relative(rootDirectory, path).split(sep).join('/')
    const sourceText = await readFile(path, 'utf8')

    if (
      sourceFile(
        displayPath,
        extname(path) === '.vue'
          ? [...sourceText.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
              .map((match) => match[1])
              .join('\n')
          : sourceText,
      ).statements.some((statement) => {
        if (
          (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) ||
          statement.moduleSpecifier === undefined ||
          !ts.isStringLiteral(statement.moduleSpecifier) ||
          statement.moduleSpecifier.text !== 'pinia'
        )
          return false
        // With verbatimModuleSyntax, named type specifiers still emit an evaluating empty import.
        return ts.isImportDeclaration(statement)
          ? statement.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword
          : !statement.isTypeOnly
      })
    ) {
      piniaImporters.push(displayPath)
    }

    const localStorageReferences = sourceText.match(/\blocalStorage\b/gu)?.length ?? 0
    const sessionStorageReferences = sourceText.match(/\bsessionStorage\b/gu)?.length ?? 0

    if (
      localStorageReferences > 0 &&
      !storageOwners.has(displayPath) &&
      !displayPath.startsWith(storageOwnerDirectoryPrefix)
    ) {
      violations.push(`${displayPath}: direct localStorage access is outside its admitted owners.`)
    }

    if (
      sessionStorageReferences > 0 &&
      displayPath !== 'apps/web/src/app/storage/scroll-refresh-storage.ts' &&
      displayPath !== 'apps/web/src/app/storage/browser-page-session-storage.ts'
    ) {
      violations.push(`${displayPath}: sessionStorage requires an exact admitted record adapter.`)
    }
  }

  if (
    !isDeepStrictEqual(piniaImporters.sort(compareCodePoints), [
      'apps/web/src/app/appearance/appearance.store.ts',
      'apps/web/src/app/navigation/navigation-preference.store.ts',
      'apps/web/src/app/providers/pinia.ts',
      'apps/web/src/app/scroll/scroll-preference.store.ts',
      'apps/web/src/app/workspace/workspace.store.ts',
    ])
  ) {
    violations.push(
      'Pinia imports must remain limited to its Runtime Kernel provider owner, appearance.store.ts, navigation-preference.store.ts and workspace.store.ts.',
    )
  }

  const preferenceStorage = await readFile(
    resolve(appearanceDirectory, 'preference-storage.ts'),
    'utf8',
  )
  const registryStorage = await readFile(
    resolve(appearanceDirectory, 'custom-theme-registry-storage.ts'),
    'utf8',
  )

  violations.push(
    ...validateStorageOwnerAst(
      resolve(appearanceDirectory, 'preference-storage.ts'),
      preferenceStorage,
      {
        getItem: ['readStoredPreference'],
        removeItem: [],
        setItem: ['writeStoredPreference'],
      },
    ),
    ...validateStorageOwnerAst(
      resolve(appearanceDirectory, 'custom-theme-registry-storage.ts'),
      registryStorage,
      {
        getItem: ['readCustomThemeRegistry'],
        removeItem: [],
        setItem: ['writeCustomThemeRegistry'],
      },
    ),
  )

  if (
    !preferenceStorage.includes('applicationConfig.appearance.preferenceStorageKey') ||
    preferenceStorage.includes('customThemeRegistryStorageKey')
  ) {
    violations.push('preference-storage.ts must own only the configured Preference key.')
  }

  if (
    !registryStorage.includes('applicationConfig.appearance.customThemeRegistryStorageKey') ||
    registryStorage.includes('preferenceStorageKey')
  ) {
    violations.push('custom-theme-registry-storage.ts must own only the configured Registry key.')
  }

  const storePath = resolve(appearanceDirectory, 'appearance.store.ts')
  const storeSource = await readFile(storePath, 'utf8')
  violations.push(...validateStoreAst(storePath, storeSource))

  const bootstrap = await readFile(resolve(appearanceDirectory, 'appearance-bootstrap.ts'), 'utf8')
  const bootstrapFile = sourceFile('apps/web/src/app/appearance/appearance-bootstrap.ts', bootstrap)
  const bootstrapCalls: ts.CallExpression[] = []
  const bootstrapDeletes: ts.DeleteExpression[] = []
  const collectBootstrapOperations = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      bootstrapCalls.push(node)
    } else if (ts.isDeleteExpression(node)) {
      bootstrapDeletes.push(node)
    }

    ts.forEachChild(node, collectBootstrapOperations)
  }
  collectBootstrapOperations(bootstrapFile)
  const callPropertyName = (call: ts.CallExpression): string | undefined => {
    const expression = unwrapExpression(call.expression)
    return ts.isPropertyAccessExpression(expression) ? expression.name.text : undefined
  }
  const stringArgument = (call: ts.CallExpression, index: number): string | undefined => {
    const argument = call.arguments[index]
    const value = argument === undefined ? undefined : unwrapExpression(argument)
    return value !== undefined && ts.isStringLiteral(value) ? value.text : undefined
  }
  const deletedBridgeFields = new Set(
    bootstrapDeletes.flatMap((operation) => {
      const expression = unwrapExpression(operation.expression)
      return ts.isPropertyAccessExpression(expression) ? [expression.name.text] : []
    }),
  )
  const restorationCalls = bootstrapCalls.filter(
    (call) => callPropertyName(call) === 'restoreAppearance',
  )
  const mediaRegistrationCalls = bootstrapCalls.filter(
    (call) => callPropertyName(call) === 'addEventListener' && stringArgument(call, 0) === 'change',
  )
  const mediaRemovalCalls = bootstrapCalls.filter(
    (call) =>
      callPropertyName(call) === 'removeEventListener' && stringArgument(call, 0) === 'change',
  )
  const backdropCapabilityProbes = bootstrapCalls
    .filter((call) => callPropertyName(call) === 'supports')
    .map((call) => [stringArgument(call, 0), stringArgument(call, 1)] as const)

  if (
    !deletedBridgeFields.has('__pavpAppearanceHandoff') ||
    !deletedBridgeFields.has('__pavpRestoreAppearanceSafety') ||
    restorationCalls.length !== 1 ||
    mediaRegistrationCalls.length !== 1 ||
    mediaRemovalCalls.length !== 1 ||
    !isDeepStrictEqual(backdropCapabilityProbes, [
      ['backdrop-filter', 'blur(0)'],
      ['-webkit-backdrop-filter', 'blur(0)'],
    ])
  ) {
    violations.push(
      'appearance-bootstrap.ts: First Paint bridge release, restoration, capability detection, or post-mount media-listener parity is incomplete.',
    )
  }

  const mainSource = await readFile(resolve(rootDirectory, 'apps/web/src/main.ts'), 'utf8')
  const mainFile = sourceFile('apps/web/src/main.ts', mainSource)
  const rootComponentImport = mainFile.statements.find(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === './App.vue' &&
      statement.importClause?.name !== undefined,
  )
  const runtimeKernelImport = mainFile.statements.find(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === './app/bootstrap/runtime-kernel',
  )
  const runtimeKernelBindings = runtimeKernelImport?.importClause?.namedBindings
  const runtimeKernelValueImports =
    runtimeKernelBindings !== undefined && ts.isNamedImports(runtimeKernelBindings)
      ? runtimeKernelBindings.elements.filter((element) => !element.isTypeOnly)
      : []
  const runtimeKernelEntryBinding = runtimeKernelValueImports[0]?.name.text
  const runtimeKernelDelegations: ts.CallExpression[] = []
  const collectRuntimeKernelDelegations = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === runtimeKernelEntryBinding
    ) {
      runtimeKernelDelegations.push(node)
    }

    ts.forEachChild(node, collectRuntimeKernelDelegations)
  }
  collectRuntimeKernelDelegations(mainFile)
  const runtimeKernelRootArgument = runtimeKernelDelegations[0]?.arguments[0]
  const rootComponentBinding = rootComponentImport?.importClause?.name
  const prohibitsMainValueImport = (statement: ts.Statement): statement is ts.ImportDeclaration => {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause === undefined ||
      statement.importClause.phaseModifier === ts.SyntaxKind.TypeKeyword ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return false
    }

    const modulePath = statement.moduleSpecifier.text
    const bindings = statement.importClause.namedBindings
    return (
      (modulePath === 'vue' &&
        (statement.importClause.name !== undefined ||
          bindings === undefined ||
          !ts.isNamedImports(bindings) ||
          bindings.elements.some(
            (element) =>
              !element.isTypeOnly &&
              !['nextTick', 'shallowRef'].includes((element.propertyName ?? element.name).text),
          ))) ||
      modulePath === 'pinia' ||
      (modulePath.startsWith('./app/appearance/') &&
        (statement.importClause.name !== undefined ||
          (statement.importClause.namedBindings !== undefined &&
            (!ts.isNamedImports(statement.importClause.namedBindings) ||
              statement.importClause.namedBindings.elements.some(
                (element) => !element.isTypeOnly,
              )))))
    )
  }
  const prohibitedMainValueImports = mainFile.statements.filter(prohibitsMainValueImport)
  for (const imported of [
    "import { createApp } from 'vue'",
    "import * as Vue from 'vue'",
    "import { nextTick, shallowRef, createApp } from 'vue'",
    "import { initializeAppearance } from './app/appearance/appearance-bootstrap'",
  ]) {
    if (!sourceFile('main.ts', imported).statements.some(prohibitsMainValueImport))
      violations.push('Main lifecycle ownership import in-memory negative probe did not fail.')
  }
  if (
    sourceFile(
      'main.ts',
      "import { nextTick as flush, shallowRef as state, type ShallowRef } from 'vue'",
    ).statements.some(prohibitsMainValueImport)
  )
    violations.push('Main scroll document lifecycle named imports must allow local aliases.')

  if (
    rootComponentBinding === undefined ||
    runtimeKernelValueImports.length !== 1 ||
    runtimeKernelDelegations.length !== 1 ||
    runtimeKernelRootArgument === undefined ||
    !ts.isIdentifier(runtimeKernelRootArgument) ||
    runtimeKernelRootArgument.text !== rootComponentBinding.text ||
    prohibitedMainValueImports.length !== 0
  ) {
    violations.push(
      'apps/web/src/main.ts: Runtime Kernel delegation and sole aggregate HMR ownership must replace direct Package 5 lifecycle orchestration.',
    )
  }

  const appearanceSource = (
    await Promise.all(appearanceFiles.map((path) => readFile(path, 'utf8')))
  ).join('\n')

  for (const forbidden of [
    'indexedDB',
    'BroadcastChannel',
    'WebSocket',
    'fetch(',
    'sessionStorage',
    'principal',
    'tenant',
  ]) {
    if (appearanceSource.includes(forbidden)) {
      violations.push(`Package 5 Appearance source contains non-admitted capability ${forbidden}.`)
    }
  }

  const designSystemFiles = await collectFiles(resolve(rootDirectory, 'packages/design-system/src'))

  for (const path of designSystemFiles.filter((file) => ['.js', '.ts'].includes(extname(file)))) {
    const displayPath = relative(rootDirectory, path).split(sep).join('/')
    const sourceText = await readFile(path, 'utf8')
    violations.push(...scanDesignSystemStorageAccess(displayPath, sourceText))
  }

  const formatterStorageNegativeProbe = scanDesignSystemStorageAccess(
    'packages/design-system/src/build/formats/first-paint.ts',
    `export function invalidFormatterStorageAccess(): void {
      localStorage.getItem('unowned')
      globalThis['localStorage'].getItem('unowned')
      window[\`sessionStorage\`].getItem('unowned')
    }`,
  )

  if (
    !formatterStorageNegativeProbe.includes(
      'packages/design-system/src/build/formats/first-paint.ts: Design System direct localStorage access is forbidden.',
    ) ||
    !formatterStorageNegativeProbe.includes(
      'packages/design-system/src/build/formats/first-paint.ts: Design System sessionStorage access is forbidden.',
    )
  ) {
    violations.push(
      'Design System formatter direct-storage reversible negative probe did not fail.',
    )
  }

  return violations
}

function validateParserCorpus(): readonly string[] {
  const violations: string[] = []
  const malformedAndDuplicateCorpus = [
    '{',
    '{"schemaVersion":1,"entries":[]} trailing',
    '{"schemaVersion":1,"schemaVersion":1,"entries":[]}',
    '{"schemaVersion":1,"entries":[],"entries":[]}',
    '{"schemaVersion":1,"entries":[{"registryKind":"custom","themeId":"x","definition":{"id":"x","id":"x"}}]}',
    '{"schemaVersion":1,"entries":[,]}',
  ] as const

  for (const [index, rawValue] of malformedAndDuplicateCorpus.entries()) {
    let buildRejected = false

    try {
      parseJsonSource(rawValue, `<appearance-parser-corpus-${String(index)}>`)
    } catch {
      buildRejected = true
    }

    const applicationResult = parseCustomThemeRegistrySnapshot(rawValue)

    if (!buildRejected || applicationResult.status !== 'inaccessible') {
      violations.push(
        `Duplicate-aware JSON parser corpus ${String(index)} was not rejected by both owners.`,
      )
    }
  }

  const validRaw = '{"schemaVersion":1,"entries":[]}'

  try {
    parseJsonSource(validRaw, '<appearance-parser-valid>')
  } catch {
    violations.push('The Build duplicate-aware JSON parser rejected the valid empty Snapshot.')
  }

  const applicationValid = parseCustomThemeRegistrySnapshot(validRaw)

  if (applicationValid.status !== 'accessible' || applicationValid.entries.length !== 0) {
    violations.push(
      'The application duplicate-aware JSON parser rejected the valid empty Snapshot.',
    )
  }

  return violations
}

interface InMemoryStorageHarness {
  readonly storage: Storage
  readonly values: Map<string, string>
  getCalls: number
  removeCalls: number
  setCalls: number
}

function createInMemoryStorage(): InMemoryStorageHarness {
  const values = new Map<string, string>()
  const harness = {
    values,
    getCalls: 0,
    removeCalls: 0,
    setCalls: 0,
  } as InMemoryStorageHarness
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear(): void {
      values.clear()
    },
    getItem(key: string): string | null {
      harness.getCalls += 1
      return values.get(key) ?? null
    },
    key(index: number): string | null {
      return [...values.keys()][index] ?? null
    },
    removeItem(key: string): void {
      harness.removeCalls += 1
      values.delete(key)
    },
    setItem(key: string, value: string): void {
      harness.setCalls += 1
      values.set(key, value)
    },
  }

  Object.defineProperty(harness, 'storage', {
    enumerable: true,
    value: storage,
  })
  return harness
}

function withInMemoryLocalStorage<Result>(operation: (storage: InMemoryStorageHarness) => Result) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const harness = createInMemoryStorage()

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: harness.storage,
  })

  try {
    return operation(harness)
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, 'localStorage')
    } else {
      Object.defineProperty(globalThis, 'localStorage', descriptor)
    }
  }
}

function validatePersistenceContracts(): readonly string[] {
  return withInMemoryLocalStorage((storage) => {
    const violations: string[] = []
    const preferenceKey = applicationConfig.appearance.preferenceStorageKey
    const registryKey = applicationConfig.appearance.customThemeRegistryStorageKey
    const defaultPreference = explicitThemePreferenceSchema.parse({
      schemaVersion: 4,
      appearance: ProductPreferenceDefault,
    })
    if (readStoredPreference().status !== 'missing' || storage.setCalls !== 0) {
      violations.push('Preference Reader must not write when the key is absent.')
    }

    for (const schemaVersion of [1, 2, 3]) {
      const raw = JSON.stringify({ ...defaultPreference, schemaVersion })
      storage.values.set(preferenceKey, raw)
      const rejected = readStoredPreference()
      if (
        rejected.status !== 'rejected' ||
        storage.values.get(preferenceKey) !== raw ||
        storage.setCalls !== 0 ||
        storage.removeCalls !== 0
      )
        violations.push(
          'Unsupported Preference formats must be rejected without rewriting or erasing stored data.',
        )
    }
    storage.values.set(preferenceKey, JSON.stringify(defaultPreference))
    const currentRead = readStoredPreference()
    if (
      currentRead.status !== 'restored' ||
      !isDeepStrictEqual(currentRead.preference, defaultPreference) ||
      storage.setCalls !== 0
    )
      violations.push('Current Preference reads must preserve every axis without writeback.')

    storage.values.set(preferenceKey, '{malformed')

    if (readStoredPreference().status !== 'malformed' || storage.setCalls !== 0) {
      violations.push('Malformed Preference JSON must be rejected privately without a write.')
    }

    storage.values.set(
      preferenceKey,
      JSON.stringify({
        ...defaultPreference,
        appearance: {
          ...defaultPreference.appearance,
          theme: { registryKind: 'built-in', themeId: 'unsupported-theme' },
        },
      }),
    )
    const invalidParsedPreference = readStoredPreference()

    if (invalidParsedPreference.status !== 'rejected' || storage.setCalls !== 0) {
      violations.push(
        'Schema-invalid parsed Preference input must map to PREFERENCE_INPUT_INVALID.',
      )
    }

    const preferenceWrite = writeStoredPreference(defaultPreference)
    const writtenPreference = JSON.parse(storage.values.get(preferenceKey) ?? 'null') as unknown

    if (
      preferenceWrite.status !== 'written' ||
      !isDeepStrictEqual(writtenPreference, defaultPreference) ||
      !isJsonObject(writtenPreference) ||
      !exactKeys(writtenPreference, ['schemaVersion', 'appearance'])
    ) {
      violations.push('Preference Writer must persist one direct Explicit Preference value.')
    }

    const firstValidation = validateCustomThemeDefinition({
      ...resolvedCustomThemeProbeDefinition(),
      id: 'z.registry',
    })
    const secondValidation = validateCustomThemeDefinition({
      ...resolvedCustomThemeProbeDefinition(),
      id: 'A.registry',
    })

    if (firstValidation.status !== 'validated' || secondValidation.status !== 'validated') {
      return [...violations, 'Persistence probe Custom Themes must validate.']
    }

    for (const roleContractVersion of [1, 2, 3]) {
      const definition = {
        ...resolvedCustomThemeProbeDefinition(),
        id: 'unsupported.contract',
        roleContractVersion,
      }
      const raw = JSON.stringify({
        schemaVersion: 1,
        entries: [{ registryKind: 'custom', themeId: definition.id, definition }],
      })
      storage.values.set(registryKey, raw)
      const writes = storage.setCalls
      const removals = storage.removeCalls
      if (
        readCustomThemeRegistry().status !== 'inaccessible' ||
        storage.setCalls !== writes ||
        storage.removeCalls !== removals ||
        storage.values.get(registryKey) !== raw
      )
        violations.push(
          'Unsupported Custom role contracts must be rejected without changing stored definitions.',
        )
    }

    const unsortedSnapshot = JSON.stringify({
      schemaVersion: 1,
      entries: [firstValidation.entry, secondValidation.entry],
    })
    storage.values.set(registryKey, unsortedSnapshot)
    const writesBeforeRegistryRead = storage.setCalls
    const registryRead = readCustomThemeRegistry()

    if (
      registryRead.status !== 'accessible' ||
      registryRead.entries.map((entry) => entry.themeId).join(',') !== 'A.registry,z.registry' ||
      storage.values.get(registryKey) !== unsortedSnapshot ||
      storage.setCalls !== writesBeforeRegistryRead
    ) {
      violations.push('Registry Reader must canonicalize in memory without rewriting Storage.')
    }

    const registryWrite = writeCustomThemeRegistry([firstValidation.entry, secondValidation.entry])
    const writtenRegistry = JSON.parse(storage.values.get(registryKey) ?? 'null') as unknown
    const writtenEntries =
      isJsonObject(writtenRegistry) && Array.isArray(writtenRegistry['entries'])
        ? writtenRegistry['entries']
        : []

    if (
      registryWrite.status !== 'written' ||
      !isJsonObject(writtenRegistry) ||
      !exactKeys(writtenRegistry, ['schemaVersion', 'entries']) ||
      writtenEntries
        .map((entry) => (isJsonObject(entry) ? entry['themeId'] : undefined))
        .join(',') !== 'A.registry,z.registry'
    ) {
      violations.push('Registry Writer must replace one canonically ordered exact Snapshot.')
    }

    const mismatchedDefinition = {
      ...firstValidation.entry.definition,
      roleContractVersion: generatedThemeRegistry.roleContractVersion + 1,
    }
    const requestedReference = {
      registryKind: 'custom' as const,
      themeId: firstValidation.entry.themeId,
    }
    const requestedMismatch = parseCustomThemeRegistrySnapshot(
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          {
            registryKind: 'custom',
            themeId: firstValidation.entry.themeId,
            definition: mismatchedDefinition,
          },
        ],
      }),
      requestedReference,
    )

    if (
      requestedMismatch.status !== 'inaccessible' ||
      requestedMismatch.rejectedCustomTheme?.code !== 'ROLE_CONTRACT_MISMATCH' ||
      Object.hasOwn(requestedMismatch, 'entries')
    ) {
      violations.push('Requested sole Role Contract failure mapping or Snapshot isolation drifted.')
    }

    const requestedInvalid = parseCustomThemeRegistrySnapshot(
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          {
            registryKind: 'custom',
            themeId: firstValidation.entry.themeId,
            definition: {
              ...firstValidation.entry.definition,
              planes: {},
            },
          },
        ],
      }),
      requestedReference,
    )

    if (
      requestedInvalid.status !== 'inaccessible' ||
      requestedInvalid.rejectedCustomTheme?.code !== 'THEME_INVALID' ||
      Object.hasOwn(requestedInvalid, 'entries')
    ) {
      violations.push('Requested sole invalid Theme mapping or Snapshot isolation drifted.')
    }

    const otherEntryFailure = parseCustomThemeRegistrySnapshot(
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          firstValidation.entry,
          {
            registryKind: 'custom',
            themeId: secondValidation.entry.themeId,
            definition: {
              ...secondValidation.entry.definition,
              roleContractVersion: generatedThemeRegistry.roleContractVersion + 1,
            },
          },
        ],
      }),
      requestedReference,
    )

    if (
      otherEntryFailure.status !== 'inaccessible' ||
      Object.hasOwn(otherEntryFailure, 'rejectedCustomTheme') ||
      Object.hasOwn(otherEntryFailure, 'entries')
    ) {
      violations.push('A different rejected Entry must expose no diagnostic or Registry Entry.')
    }

    for (const theme of [defaultPreference.appearance.theme, firstValidation.entry] as const) {
      for (const preset of uiDensityValues) {
        for (const fontScale of fontScaleValues) {
          for (const scale of [0.9, 1.1, 1.15]) {
            const preference = explicitThemePreferenceSchema.parse({
              schemaVersion: 4,
              appearance: {
                ...ProductPreferenceDefault,
                theme: { registryKind: theme.registryKind, themeId: theme.themeId },
                density: { preset, scale },
                fontScale,
              },
            })
            const written = writeStoredPreference(preference)
            const raw = storage.values.get(preferenceKey)
            const writes = storage.setCalls
            const restored = readStoredPreference()
            if (
              written.status !== 'written' ||
              restored.status !== 'restored' ||
              !isDeepStrictEqual(restored.preference, preference) ||
              raw !== JSON.stringify(preference) ||
              storage.setCalls !== writes
            )
              violations.push(
                'Density preset/non-1 scale/fontScale must round-trip losslessly without Reader writes.',
              )
          }
        }
      }
    }

    return violations
  })
}

function resolvedCustomThemeProbeDefinition(index = 0) {
  const entry = generatedThemeRegistry.builtInEntries[index]
  if (entry === undefined) throw new Error('The canonical theme fixture is unavailable.')
  return completeBuiltInThemeDefinitionSchema.parse(structuredClone(entry.definition))
}

function validateSharedAppearanceSynchronization(): readonly string[] {
  return withInMemoryLocalStorage((storage) => {
    const failures: string[] = []
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const properties = new Map<string, { value: string; priority: string }>()
    const attributes = new Map<string, string>()
    const target = {
      hasAttribute: (name: string) => attributes.has(name),
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => {
        attributes.set(name, value)
      },
      removeAttribute: (name: string) => {
        attributes.delete(name)
      },
      style: {
        getPropertyValue: (name: string) => properties.get(name)?.value ?? '',
        getPropertyPriority: (name: string) => properties.get(name)?.priority ?? '',
        setProperty: (name: string, value: string, priority = '') => {
          properties.set(name, { value, priority })
        },
        removeProperty: (name: string) => {
          const previous = properties.get(name)?.value ?? ''
          properties.delete(name)
          return previous
        },
      },
    }
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { documentElement: target },
    })
    const provider = createPiniaProvider(createStartupAttemptId())
    const store = useAppearanceStore(provider.pinia)
    const environment = {
      backdropFilterSupported: true,
      forcedColorsActive: false,
      prefersDark: false,
      prefersReducedMotion: false,
      reducedTransparencyRequested: false,
    }
    const preferenceKey = applicationConfig.appearance.preferenceStorageKey
    const registryKey = applicationConfig.appearance.customThemeRegistryStorageKey
    const defaults = explicitThemePreferenceSchema.parse({
      schemaVersion: 4,
      appearance: ProductPreferenceDefault,
    })
    try {
      if (store.synchronizeAppearance(environment).status !== 'committed')
        failures.push('Missing shared Appearance records must use the product default.')
      const unrelatedKey = 'appearance-recovery-unrelated-probe'
      const unrelatedValue = '{"preserved":true}'
      storage.values.set(unrelatedKey, unrelatedValue)
      const inaccessibleCustom = validateCustomThemeDefinition({
        ...resolvedCustomThemeProbeDefinition(),
        id: 'unsupported-contract-probe',
      })
      if (inaccessibleCustom.status !== 'validated')
        throw new TypeError(
          'The current Custom fixture must validate before changing its contract.',
        )
      const invalidRegistry = JSON.stringify({
        schemaVersion: 1,
        entries: [
          {
            registryKind: 'custom',
            themeId: 'unsupported-contract-probe',
            definition: {
              ...resolvedCustomThemeProbeDefinition(),
              id: 'unsupported-contract-probe',
              roleContractVersion: 3,
            },
          },
        ],
      })
      storage.values.set(registryKey, invalidRegistry)
      const recoveryInputs = [
        '{malformed',
        ...[1, 2, 3, 5].map((schemaVersion) =>
          JSON.stringify({ schemaVersion, appearance: defaults.appearance }),
        ),
        JSON.stringify({
          ...defaults,
          appearance: {
            ...defaults.appearance,
            theme: { registryKind: 'built-in', themeId: 'retired-theme-probe' },
          },
        }),
        JSON.stringify({
          ...defaults,
          appearance: {
            ...defaults.appearance,
            theme: { registryKind: 'custom', themeId: 'unsupported-contract-probe' },
          },
        }),
      ]
      const startupGlobals = ['window', 'matchMedia', 'CSS'] as const
      const startupDescriptors = startupGlobals.map(
        (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
      )
      let startup: ReturnType<typeof installAppearanceProvider> | undefined
      let safetyRestores = 0
      let stopMedia: (() => void) | undefined
      try {
        const windowTarget = new EventTarget()
        Object.defineProperty(windowTarget, 'localStorage', { value: storage.storage })
        Object.defineProperty(globalThis, 'window', { configurable: true, value: windowTarget })
        const media = new Map<
          string,
          {
            matches: boolean
            listeners: Set<() => void>
            addEventListener(type: string, listener: () => void): void
            removeEventListener(type: string, listener: () => void): void
          }
        >()
        Object.defineProperty(globalThis, 'matchMedia', {
          configurable: true,
          value: (query: string) => {
            let item = media.get(query)
            if (item === undefined) {
              const listeners = new Set<() => void>()
              item = {
                matches: false,
                listeners,
                addEventListener: (_type, listener) => {
                  listeners.add(listener)
                },
                removeEventListener: (_type, listener) => {
                  listeners.delete(listener)
                },
              }
              media.set(query, item)
            }
            return item
          },
        })
        Object.defineProperty(globalThis, 'CSS', {
          configurable: true,
          value: { supports: () => false },
        })
        storage.values.set(preferenceKey, JSON.stringify({ schemaVersion: 3 }))
        const beforeStartup = new Map(storage.values)
        startup = installAppearanceProvider(provider.pinia, {
          handoff: undefined,
          safetyRestorationAuthority: undefined,
          restoreSafetyForFailedStartup: () => {
            safetyRestores += 1
          },
          dispose: () => undefined,
        })
        startup.reapply()
        if (
          !isDeepStrictEqual(startup.appearanceMutationBoundary.preference.value, defaults) ||
          startup.appearanceReadBoundary.snapshot.value.theme.themeId !==
            ProductPreferenceDefault.theme.themeId ||
          !isDeepStrictEqual(storage.values, beforeStartup) ||
          storage.setCalls !== 0 ||
          safetyRestores !== 0
        )
          failures.push(
            'The actual Appearance provider must finish startup with readable defaults and writable explicit controls without replacing saved data.',
          )
        stopMedia = registerPostMountAppearanceMediaSubscriptions(startup, () => undefined)
        const motionQuery = media.get('(prefers-reduced-motion: reduce)')
        if (
          motionQuery === undefined ||
          media.size !== 4 ||
          [...media.values()].some((item) => item.listeners.size !== 1)
        )
          failures.push(
            'The one Appearance owner must subscribe to the four existing environment axes exactly once.',
          )
        else {
          motionQuery.matches = true
          for (const listener of motionQuery.listeners) listener()
          if (
            startup.appearanceReadBoundary.snapshot.value.motion !== 'reduced' ||
            attributes.get('data-motion') !== 'reduced' ||
            startup.appearanceMutationBoundary.preference.value?.appearance.motion !== 'full' ||
            !isDeepStrictEqual(storage.values, beforeStartup)
          )
            failures.push(
              'OS reduction must reach snapshot and CSS without overwriting the stored explicit motion choice.',
            )
          motionQuery.matches = false
          for (const listener of motionQuery.listeners) listener()
          if (
            startup.appearanceReadBoundary.snapshot.value.motion !== 'full' ||
            attributes.get('data-motion') !== 'full'
          )
            failures.push(
              'Clearing OS reduction must restore the explicit full choice without persisting.',
            )
        }
        stopMedia()
        stopMedia = undefined
        if ([...media.values()].some((item) => item.listeners.size !== 0))
          failures.push(
            'Appearance environment subscriptions must all be removed by the existing owner lifetime.',
          )
        const choice = {
          ...defaults,
          appearance: {
            ...defaults.appearance,
            theme: { registryKind: 'built-in', themeId: 'emerald-grove' },
          },
        }
        if (
          startup.appearanceMutationBoundary.commitPreference(choice).status !== 'committed' ||
          startup.appearanceReadBoundary.snapshot.value.theme.themeId !== 'emerald-grove' ||
          storage.values.get(preferenceKey) !== JSON.stringify(choice) ||
          storage.values.get(registryKey) !== invalidRegistry ||
          storage.values.get(unrelatedKey) !== unrelatedValue ||
          storage.setCalls !== 1
        )
          failures.push(
            'Recovery must leave the explicit commit control usable and replace only Preference after the chosen action.',
          )
        if (
          startup.appearanceMutationBoundary.resetPreference().status !== 'committed' ||
          !isDeepStrictEqual(startup.appearanceMutationBoundary.preference.value, defaults) ||
          storage.values.get(preferenceKey) !== JSON.stringify(defaults) ||
          storage.values.get(registryKey) !== invalidRegistry ||
          storage.setCalls !== 2
        )
          failures.push(
            'Recovery must leave the explicit reset control usable and preserve invalid Registry bytes.',
          )
        storage.setCalls = 0
      } finally {
        stopMedia?.()
        startup?.dispose('normal-or-hmr')
        for (const [name, descriptor] of startupDescriptors) {
          if (descriptor === undefined) Reflect.deleteProperty(globalThis, name)
          else Object.defineProperty(globalThis, name, descriptor)
        }
      }
      for (const saved of recoveryInputs) {
        storage.values.set(preferenceKey, saved)
        store.$reset()
        const before = new Map(storage.values)
        if (
          store.restoreAppearance(environment).status !== 'committed' ||
          !isDeepStrictEqual(store.preference, defaults) ||
          store.readEffectiveAppearance(environment) === null ||
          attributes.get('data-theme') !== ProductPreferenceDefault.theme.themeId ||
          store.customThemeRegistry !== null ||
          !isDeepStrictEqual(storage.values, before) ||
          storage.setCalls !== 0 ||
          store.reapplyAppearance({ ...environment, prefersDark: true }).status !== 'committed' ||
          !isDeepStrictEqual(storage.values, before)
        )
          failures.push(
            'Invalid saved data must start with usable in-memory defaults and preserve every stored byte until an explicit choice.',
          )
      }
      const selected = {
        ...defaults,
        appearance: {
          ...defaults.appearance,
          theme: { registryKind: 'built-in', themeId: 'emerald-grove' },
          radius: 0,
        },
      }
      if (
        store.changeAppearancePreference(selected, environment).status !== 'committed' ||
        storage.values.get(preferenceKey) !== JSON.stringify(selected) ||
        storage.values.get(registryKey) !== invalidRegistry ||
        storage.values.get(unrelatedKey) !== unrelatedValue ||
        storage.setCalls !== 1
      )
        failures.push(
          'Explicit Built-in selection must replace only Preference despite an invalid Custom Registry.',
        )
      const savedBeforeCustom = new Map(storage.values)
      if (
        store.changeAppearancePreference(
          {
            ...defaults,
            appearance: {
              ...defaults.appearance,
              theme: { registryKind: 'custom', themeId: 'unsupported-contract-probe' },
            },
          },
          environment,
        ).status !== 'rejected' ||
        store.deleteCustomTheme(inaccessibleCustom.entry.themeId).status !== 'rejected' ||
        !isDeepStrictEqual(storage.values, savedBeforeCustom) ||
        !isDeepStrictEqual(store.preference, selected)
      )
        failures.push(
          'An invalid Registry must remain inaccessible to Custom selection and deletion.',
        )
      if (
        store.resetAppearancePreference(environment).status !== 'committed' ||
        !isDeepStrictEqual(store.preference, defaults) ||
        storage.values.get(registryKey) !== invalidRegistry ||
        storage.values.get(unrelatedKey) !== unrelatedValue ||
        storage.setCalls !== 2
      )
        failures.push(
          'Explicit reset must write only current Preference and preserve invalid Registry bytes.',
        )
      storage.values.set(preferenceKey, JSON.stringify(selected))
      const writesBeforeSync = storage.setCalls
      if (
        store.synchronizeAppearance(environment).status !== 'committed' ||
        !isDeepStrictEqual(store.preference, selected) ||
        store.customThemeRegistry !== null ||
        storage.setCalls !== writesBeforeSync ||
        storage.values.get(registryKey) !== invalidRegistry
      )
        failures.push(
          'A valid remote Built-in preference must apply without repairing an invalid Registry.',
        )
      const getItem = storage.storage.getItem.bind(storage.storage)
      storage.storage.getItem = () => {
        throw new Error('Isolated storage read failure.')
      }
      try {
        store.$reset()
        if (
          store.restoreAppearance(environment).status !== 'committed' ||
          !isDeepStrictEqual(store.preference, defaults) ||
          storage.setCalls !== writesBeforeSync
        )
          failures.push(
            'Unavailable persistence must leave startup usable without writing defaults.',
          )
      } finally {
        storage.storage.getItem = getItem
      }
      storage.values.clear()
      storage.setCalls = 0
      store.$reset()
      store.restoreAppearance(environment)
      for (const radius of [0, 1, 8, 16]) {
        const shared = { ...defaults, appearance: { ...defaults.appearance, radius } }
        storage.values.set(preferenceKey, JSON.stringify(shared))
        if (
          store.synchronizeAppearance(environment).status !== 'committed' ||
          store.preference?.appearance.radius !== radius ||
          properties.get('--ui-radius-control')?.value !== `${String(radius)}px` ||
          storage.values.get(preferenceKey) !== JSON.stringify(shared) ||
          storage.setCalls !== 0
        )
          failures.push('Remote radius application must preserve zero and never re-persist.')
      }
      for (const preset of uiDensityValues) {
        const shared = {
          ...defaults,
          appearance: {
            ...defaults.appearance,
            radius: 0,
            fontScale: 1.1,
            density: { preset, scale: 1.1 },
          },
        }
        storage.values.set(preferenceKey, JSON.stringify(shared))
        if (
          store.synchronizeAppearance(environment).status !== 'committed' ||
          attributes.get('data-density') !== preset ||
          store.preference?.appearance.density.scale !== 1.1 ||
          store.preference.appearance.radius !== 0 ||
          properties.get('--ui-font-scale')?.value !== '1.1' ||
          [...properties.keys()].some((name) => name.includes('button-inline')) ||
          storage.values.get(preferenceKey) !== JSON.stringify(shared) ||
          storage.setCalls !== 0
        )
          failures.push(
            'Each shared density preset must select generated CSS without inline spacing, scale application or preference writes.',
          )
      }
      const validRadiusState = JSON.stringify(store.$state)
      const validRadiusDom = JSON.stringify([...properties])
      for (const radius of [undefined, -1, 17, 0.5, '0']) {
        storage.values.set(
          preferenceKey,
          JSON.stringify({ ...defaults, appearance: { ...defaults.appearance, radius } }),
        )
        if (
          store.synchronizeAppearance(environment).status !== 'rejected' ||
          JSON.stringify(store.$state) !== validRadiusState ||
          JSON.stringify([...properties]) !== validRadiusDom ||
          storage.setCalls !== 0
        )
          failures.push('Invalid current shared radius must retain the last valid state and DOM.')
      }
      const unsupportedRecord = JSON.stringify({
        schemaVersion: 3,
        appearance: defaults.appearance,
      })
      const beforeUnsupported = JSON.stringify(store.$state)
      storage.values.set(preferenceKey, unsupportedRecord)
      if (
        store.synchronizeAppearance(environment).status !== 'rejected' ||
        JSON.stringify(store.$state) !== beforeUnsupported ||
        storage.values.get(preferenceKey) !== unsupportedRecord ||
        storage.setCalls !== 0
      )
        failures.push(
          'Unsupported shared records must preserve the last valid presentation and saved bytes.',
        )
      const themeId = 'shared-preference-probe'
      const preference = {
        ...defaults,
        appearance: {
          ...defaults.appearance,
          radius: 0,
          theme: { registryKind: 'custom', themeId },
        },
      }
      storage.values.set(preferenceKey, JSON.stringify(preference))
      const saveFixture = (index: number) => {
        const definition = { ...resolvedCustomThemeProbeDefinition(index), id: themeId }
        storage.values.set(
          registryKey,
          JSON.stringify({
            schemaVersion: 1,
            entries: [{ registryKind: 'custom', themeId, definition }],
          }),
        )
        return definition
      }
      saveFixture(0)
      if (store.synchronizeAppearance(environment).status !== 'committed')
        failures.push('A valid shared custom theme must resolve and apply.')
      const before = JSON.stringify([...properties])
      const replacement = saveFixture(1)
      if (
        store.synchronizeAppearance(environment).status !== 'committed' ||
        store.customThemeRegistry?.[0]?.definition.label !== replacement.label ||
        store.preference?.appearance.radius !== 0 ||
        JSON.stringify([...properties]) === before
      )
        failures.push('Same-ID saved theme changes must replace the actual Theme Bank.')
      const valid = JSON.stringify([...properties])
      storage.values.set(preferenceKey, JSON.stringify(defaults))
      const visibleThemeId = store.customThemeRegistry?.[0]?.themeId
      if (
        visibleThemeId === undefined ||
        store.deleteCustomTheme(visibleThemeId).status !== 'rejected' ||
        storage.setCalls !== 0
      )
        failures.push(
          'A pending remote selection must not allow deletion of the still-visible local theme.',
        )
      storage.values.set(preferenceKey, JSON.stringify(preference))
      storage.values.set(registryKey, '{invalid')
      if (
        store.synchronizeAppearance(environment).status !== 'rejected' ||
        JSON.stringify([...properties]) !== valid
      )
        failures.push('Invalid shared theme data must preserve the last valid presentation.')
      storage.values.delete(registryKey)
      if (store.synchronizeAppearance(environment).status !== 'rejected')
        failures.push('A dangling custom reference must not replace valid Appearance state.')
      storage.values.delete(preferenceKey)
      if (store.synchronizeAppearance(environment).status !== 'committed' || storage.setCalls !== 0)
        failures.push('Shared missing/reset and remote application must not persist defaults.')
      // Deletion finishes before selection starts: this is not a cross-key transaction race.
      storage.values.set(preferenceKey, JSON.stringify(defaults))
      saveFixture(0)
      store.synchronizeAppearance(environment)
      const peerProvider = createPiniaProvider(createStartupAttemptId())
      try {
        const peer = useAppearanceStore(peerProvider.pinia)
        peer.synchronizeAppearance(environment)
        const deletedId = peer.customThemeRegistry?.[0]?.themeId
        if (deletedId === undefined || peer.deleteCustomTheme(deletedId).status !== 'committed')
          failures.push(
            'The peer must finish deleting the unreferenced saved theme before selection.',
          )
        const writesAfterDeletion = storage.setCalls
        if (
          store.changeAppearancePreference(preference, environment).status !== 'rejected' ||
          storage.setCalls !== writesAfterDeletion
        )
          failures.push(
            'A stale local registry must not authorize selecting a theme already deleted by a peer.',
          )
        peer.$reset()
        if (peer.restoreAppearance(environment).status !== 'committed')
          failures.push(
            'Refused stale selection must leave persisted preferences restorable by a fresh store.',
          )
        const stateBeforeUnavailableRead = JSON.stringify(store.$state)
        const read = storage.storage.getItem.bind(storage.storage)
        storage.storage.getItem = (key) => {
          if (key === registryKey) throw new Error('Isolated registry read failure.')
          return read(key)
        }
        try {
          if (
            store.changeAppearancePreference(preference, environment).status !== 'rejected' ||
            JSON.stringify(store.$state) !== stateBeforeUnavailableRead ||
            storage.setCalls !== writesAfterDeletion
          )
            failures.push(
              'A failed persisted-registry read must reject local selection without changing valid state or preferences.',
            )
        } finally {
          storage.storage.getItem = read
        }
      } finally {
        peerProvider.dispose()
      }
      const zeroRadius = {
        ...defaults,
        appearance: {
          ...defaults.appearance,
          radius: 0,
          fontScale: 1.1,
          motion: 'reduced',
          density: { preset: 'compact', scale: 1.1 },
        },
      }
      if (store.changeAppearancePreference(zeroRadius, environment).status !== 'committed')
        failures.push('An explicit zero-radius save must remain a valid local preference.')
      const otherTheme = {
        ...zeroRadius,
        appearance: {
          ...zeroRadius.appearance,
          theme: { registryKind: 'built-in', themeId: 'emerald-grove' },
        },
      }
      if (
        store.changeAppearancePreference(otherTheme, environment).status !== 'committed' ||
        store.preference?.appearance.radius !== 0
      )
        failures.push('Theme changes must not reset a saved zero radius.')
      const radiusReset = {
        ...otherTheme,
        appearance: { ...otherTheme.appearance, radius: ProductPreferenceDefault.radius },
      }
      if (
        store.changeAppearancePreference(radiusReset, environment).status !== 'committed' ||
        !isDeepStrictEqual(store.preference, radiusReset)
      )
        failures.push('A radius-only reset must preserve every unrelated preference axis.')
      storage.values.set(preferenceKey, JSON.stringify(zeroRadius))
      storage.values.delete(registryKey)
      store.synchronizeAppearance(environment)
      const previousMode = store.preference?.appearance.colorMode
      properties.set('--ui-radius-control', { value: '0px', priority: 'important' })
      properties.delete('--ui-radius-small')
      const beforeFailure = new Map(properties)
      const remote = {
        ...defaults,
        appearance: {
          ...defaults.appearance,
          radius: 16,
          colorMode: 'dark',
          density: { preset: 'spacious', scale: 1.1 },
        },
      }
      storage.storage.setItem = () => {
        storage.values.set(preferenceKey, JSON.stringify(remote))
        throw new Error('Isolated storage-port failure after a competing write.')
      }
      const result = store.changeAppearancePreference(
        { ...defaults, appearance: { ...defaults.appearance, colorMode: 'light' } },
        environment,
      )
      if (
        result.status !== 'rejected' ||
        store.preference?.appearance.colorMode !== previousMode ||
        store.preference?.appearance.radius !== 0 ||
        attributes.get('data-density') !== 'compact' ||
        store.preference.appearance.density.scale !== 1.1 ||
        !isDeepStrictEqual(properties, beforeFailure) ||
        storage.values.get(preferenceKey) !== JSON.stringify(remote)
      )
        failures.push(
          'Failed local persistence must restore local state without compensating over a newer saved value.',
        )
      if (
        store.synchronizeAppearance(environment).status !== 'committed' ||
        store.preference?.appearance.colorMode !== 'dark' ||
        store.preference.appearance.radius !== 16 ||
        attributes.get('data-density') !== 'spacious' ||
        store.preference.appearance.density.scale !== 1.1 ||
        properties.get('--ui-radius-control')?.value !== '16px'
      )
        failures.push(
          'Appearance must converge on the latest valid persisted record after a local failure.',
        )
      return failures
    } finally {
      provider.dispose()
      if (descriptor === undefined) Reflect.deleteProperty(globalThis, 'document')
      else Object.defineProperty(globalThis, 'document', descriptor)
    }
  })
}

function validateRuntimeContracts(): readonly string[] {
  const violations: string[] = []
  const expectedProductDefault = {
    colorMode: 'system',
    theme: { registryKind: 'built-in', themeId: 'royal-iris' },
    contrast: 'standard',
    material: 'adaptive',
    density: { preset: 'comfortable', scale: 1 },
    fontScale: 1,
    motion: 'full',
    radius: 8,
  }

  if (!isDeepStrictEqual(ProductPreferenceDefault, expectedProductDefault)) {
    violations.push('ProductPreferenceDefault drifted from the current eight-axis authority.')
  }

  const defaultPreference = explicitThemePreferenceSchema.safeParse({
    schemaVersion: 4,
    appearance: ProductPreferenceDefault,
  })

  if (!defaultPreference.success) {
    violations.push('ProductPreferenceDefault does not construct an Explicit Theme Preference.')
    return violations
  }

  for (const invalidPreference of [
    { ...defaultPreference.data, extra: true },
    { schemaVersion: 3 },
    {
      ...defaultPreference.data,
      appearance: {
        ...defaultPreference.data.appearance,
        theme: { registryKind: 'built-in', themeId: 'unknown' },
      },
    },
  ]) {
    if (explicitThemePreferenceSchema.safeParse(invalidPreference).success) {
      violations.push('Explicit Theme Preference schema is not exact and closed.')
    }
  }

  const opaqueCustomId = ' Customer Ω Theme '
  const customReferencePreference = explicitThemePreferenceSchema.safeParse({
    ...defaultPreference.data,
    appearance: {
      ...defaultPreference.data.appearance,
      theme: { registryKind: 'custom', themeId: opaqueCustomId },
    },
  })

  if (
    !customReferencePreference.success ||
    customReferencePreference.data.appearance.theme.themeId !== opaqueCustomId
  ) {
    violations.push('Custom Theme IDs must remain opaque and byte-for-byte unchanged.')
  }

  const customDefinition = {
    ...resolvedCustomThemeProbeDefinition(),
    id: 'checker.custom',
  }
  const validation = validateCustomThemeDefinition(customDefinition)

  if (validation.status !== 'validated') {
    violations.push('A complete exact Custom Theme failed Design System validation.')
    return violations
  }

  const mismatch = validateCustomThemeDefinition({
    ...customDefinition,
    roleContractVersion: generatedThemeRegistry.roleContractVersion + 1,
  })

  if (mismatch.status !== 'rejected' || mismatch.code !== 'ROLE_CONTRACT_MISMATCH') {
    violations.push('Custom Theme Role Contract mismatch mapping drifted.')
  }

  const resolution = resolveThemeReference({
    reference: {
      registryKind: 'custom',
      themeId: validation.entry.themeId,
    },
    customThemeRegistry: [validation.entry],
  })

  if (resolution.status !== 'resolved' || resolution.entry.registryKind !== 'custom') {
    violations.push('Exact Custom Theme tuple resolution failed.')
  }

  const properties = new Map<string, { priority: string; value: string }>()
  const attributes = new Map<string, string>()
  const target = {
    style: {
      getPropertyPriority(name: string): string {
        return properties.get(name)?.priority ?? ''
      },
      getPropertyValue(name: string): string {
        return properties.get(name)?.value ?? ''
      },
      removeProperty(name: string): string {
        const previous = properties.get(name)?.value ?? ''
        properties.delete(name)
        return previous
      },
      setProperty(name: string, value: string, priority = ''): void {
        properties.set(name, { priority, value })
      },
    },
    getAttribute(name: string): string | null {
      return attributes.get(name) ?? null
    },
    hasAttribute(name: string): boolean {
      return attributes.has(name)
    },
    removeAttribute(name: string): void {
      attributes.delete(name)
    },
    setAttribute(name: string, value: string): void {
      attributes.set(name, value)
    },
  }
  const installation = installCustomThemeBank(target, validation.entry)

  if (
    installation.status !== 'installed' ||
    !isDeepStrictEqual(
      [...properties.keys()].sort(compareCodePoints),
      [...generatedThemeRegistry.customBankVariables].sort(compareCodePoints),
    )
  ) {
    violations.push('Custom Theme Bank installation escaped its fixed 120-variable allowlist.')
  }

  const firstBankVariable = generatedThemeRegistry.customBankVariables[0]
  if (firstBankVariable === undefined)
    return [...violations, 'Custom Bank allowlist must be non-empty.']
  const rollbackProperties = new Map<string, { priority: string; value: string }>([
    [firstBankVariable, { priority: 'important', value: 'rgb(1 2 3)' }],
  ])
  const rollbackAttributes = new Map<string, string>([
    ['data-theme-kind', 'custom'],
    ['data-theme', 'previous.custom'],
  ])
  let installationWrites = 0
  let injectedInstallationFailure = false
  const recoverableFailureTarget = {
    style: {
      getPropertyPriority(name: string): string {
        return rollbackProperties.get(name)?.priority ?? ''
      },
      getPropertyValue(name: string): string {
        return rollbackProperties.get(name)?.value ?? ''
      },
      removeProperty(name: string): string {
        const previous = rollbackProperties.get(name)?.value ?? ''
        rollbackProperties.delete(name)
        return previous
      },
      setProperty(name: string, value: string, priority = ''): void {
        if (!injectedInstallationFailure) {
          installationWrites += 1

          if (installationWrites === 2) {
            injectedInstallationFailure = true
            throw new Error('Synthetic partial installation failure.')
          }
        }

        rollbackProperties.set(name, { priority, value })
      },
    },
    getAttribute(name: string): string | null {
      return rollbackAttributes.get(name) ?? null
    },
    hasAttribute(name: string): boolean {
      return rollbackAttributes.has(name)
    },
    removeAttribute(name: string): void {
      rollbackAttributes.delete(name)
    },
    setAttribute(name: string, value: string): void {
      rollbackAttributes.set(name, value)
    },
  }
  const recoverableFailure = installCustomThemeBank(recoverableFailureTarget, validation.entry)

  if (
    recoverableFailure.status !== 'rejected' ||
    !isDeepStrictEqual(
      [...rollbackProperties],
      [[firstBankVariable, { priority: 'important', value: 'rgb(1 2 3)' }]],
    ) ||
    rollbackAttributes.get('data-theme-kind') !== 'custom' ||
    rollbackAttributes.get('data-theme') !== 'previous.custom'
  ) {
    violations.push('Rejected Custom Theme Bank installation did not roll back exactly.')
  }

  applyAppearance(target, {
    colorMode: 'light',
    theme: { registryKind: 'built-in', themeId: 'royal-iris' },
    contrast: 'standard',
    material: 'solid',
    density: 'comfortable',
    fontScale: 1,
    motion: 'full',
    radius: ProductPreferenceDefault.radius,
  })

  if (
    properties.size !== 4 ||
    properties.get('--ui-font-scale')?.value !== '1' ||
    attributes.get('data-theme-kind') !== 'built-in'
  ) {
    violations.push('Built-in Appearance application did not clear the Custom Theme Bank.')
  }

  const radiusState = {
    colorMode: 'light',
    theme: { registryKind: 'built-in', themeId: 'royal-iris' },
    contrast: 'standard',
    material: 'solid',
    density: 'comfortable',
    fontScale: 1,
    motion: 'full',
    radius: 8,
  } as const
  for (const [radius, control, panel, small] of [
    [0, '0px', '0px', '0px'],
    [1, '1px', '1.5px', '0.5px'],
    [8, '8px', '12px', '4px'],
    [16, '16px', '16px', '4px'],
  ] as const) {
    applyAppearance(target, { ...radiusState, radius })
    if (
      properties.get('--ui-radius-control')?.value !== control ||
      properties.get('--ui-radius-panel')?.value !== panel ||
      properties.get('--ui-radius-small')?.value !== small
    )
      violations.push(
        'The public Appearance writer must project zero, fractional derived radii and caps.',
      )
  }
  for (const radius of [-1, 17, 0.5, NaN, Infinity, -Infinity]) {
    const previousProperties = new Map(properties)
    const previousAttributes = new Map(attributes)
    let rejected = false
    try {
      applyAppearance(target, { ...radiusState, radius })
    } catch {
      rejected = true
    }
    if (
      !rejected ||
      !isDeepStrictEqual(properties, previousProperties) ||
      !isDeepStrictEqual(attributes, previousAttributes)
    )
      violations.push(
        'Invalid radius at the public writer must fail before any DOM or Theme Bank mutation.',
      )
  }
  properties.set('--ui-radius-control', { value: '0px', priority: 'important' })
  properties.set('--ui-radius-panel', { value: '1.5px', priority: '' })
  properties.delete('--ui-radius-small')
  const capturedProperties = new Map(properties)
  const restoreRadius = captureRadius(target)
  applyAppearance(target, radiusState)
  restoreRadius()
  if (!isDeepStrictEqual(properties, capturedProperties))
    violations.push(
      'Opaque radius restoration must preserve raw zero, priority and absence exactly.',
    )

  for (const theme of [
    defaultPreference.data.appearance.theme,
    { registryKind: 'custom', themeId: validation.entry.themeId },
  ] as const) {
    for (const preset of uiDensityValues) {
      for (const fontScale of fontScaleValues) {
        for (const scale of [0.9, 1, 1.1]) {
          const preference = explicitThemePreferenceSchema.parse({
            schemaVersion: 4,
            appearance: {
              ...ProductPreferenceDefault,
              theme,
              density: { preset, scale },
              fontScale,
            },
          })
          const before = JSON.stringify(preference)
          if (theme.registryKind === 'custom') installCustomThemeBank(target, validation.entry)
          applyAppearance(target, {
            ...preference.appearance,
            colorMode: 'light',
            material: 'solid',
            density: preset,
          })
          const validatedPreference = explicitThemePreferenceSchema.safeParse(preference)
          if (
            attributes.get('data-density') !== preset ||
            properties.get('--ui-font-scale')?.value !== String(fontScale) ||
            [...properties.keys()].some(
              (name) =>
                name.includes('control-height') ||
                name.includes('density') ||
                name.includes('button-inline'),
            ) ||
            !validatedPreference.success ||
            !isDeepStrictEqual(validatedPreference.data, preference) ||
            JSON.stringify(preference) !== before
          )
            violations.push(
              'Density runtime application must preserve non-1 scale without applying it or writing height overrides.',
            )
        }
      }
    }
  }

  let partialMutationStarted = false
  const rollbackTarget = {
    style: {
      getPropertyPriority(): string {
        return ''
      },
      getPropertyValue(): string {
        return ''
      },
      removeProperty(): string {
        if (partialMutationStarted) {
          throw new Error('Synthetic rollback failure.')
        }

        return ''
      },
      setProperty(): void {
        partialMutationStarted = true
        throw new Error('Synthetic installation failure.')
      },
    },
    getAttribute(): string | null {
      return null
    },
    hasAttribute(): boolean {
      return false
    },
    removeAttribute(): void {
      return undefined
    },
    setAttribute(): void {
      return undefined
    },
  }
  let rollbackFailurePropagated = false

  try {
    installCustomThemeBank(rollbackTarget, validation.entry)
  } catch (error) {
    rollbackFailurePropagated = error instanceof AggregateError
  }

  if (!rollbackFailurePropagated) {
    violations.push('Installer rollback failure must not be reported as a clean rejection.')
  }

  return violations
}

function selectorDeclarations(css: string, selector: string): Map<string, string> | null {
  const marker = `  ${selector} {\n`
  const start = css.indexOf(marker)

  if (start < 0 || css.includes(marker, start + marker.length)) {
    return null
  }

  const end = css.indexOf('\n  }', start + marker.length)

  if (end < 0) {
    return null
  }

  const declarations = new Map<string, string>()
  const normalizedBlock = css
    .slice(start + marker.length, end)
    .replace(/var\(\n      (--ui-[a-z0-9-]+)\n    \)/gu, 'var($1)')

  for (const line of normalizedBlock.split('\n')) {
    const match = /^    (--ui-[a-z0-9-]+): (.+);$/u.exec(line)

    if (match?.[1] === undefined || match[2] === undefined || declarations.has(match[1])) {
      return null
    }

    declarations.set(match[1], match[2])
  }

  return declarations
}

async function validateGeneratedThemeBankAndManifest(): Promise<readonly string[]> {
  const violations: string[] = []
  const generatedDirectory = resolve(rootDirectory, 'packages/design-system/src/generated')
  const [runtimeCss, criticalCss, initializer, manifestSource, firstPaintFormatter] =
    await Promise.all([
      readFile(resolve(generatedDirectory, 'tokens.css'), 'utf8'),
      readFile(resolve(generatedDirectory, 'critical-theme.css'), 'utf8'),
      readFile(resolve(generatedDirectory, 'appearance-init.js'), 'utf8'),
      readFile(resolve(generatedDirectory, 'tokens.manifest.json'), 'utf8'),
      readFile(
        resolve(rootDirectory, 'packages/design-system/src/build/formats/first-paint.ts'),
        'utf8',
      ),
    ])

  for (const entry of generatedThemeRegistry.builtInEntries) {
    const selector = `html[data-theme-kind='built-in'][data-theme='${entry.themeId}']`

    for (const [artifact, css] of [
      ['tokens.css', runtimeCss],
      ['critical-theme.css', criticalCss],
    ] as const) {
      const declarations = selectorDeclarations(css, selector)

      if (
        declarations?.size !== 120 ||
        entry.bank.records.some(
          (record) =>
            declarations.get(record.bankVariable) !== formatThemeBankCssValue(record.resolvedValue),
        )
      ) {
        violations.push(`${artifact}: ${entry.themeId} Built-in Theme Bank projection drifted.`)
      }
    }
  }

  for (const role of generatedThemeRegistry.activePublicColorRoles) {
    if (
      !runtimeCss
        .replace(/var\(\s+(--ui-[a-z0-9-]+)\s+\)/gu, 'var($1)')
        .includes(`${role.publicBinding}: var(--ui-theme-bank-effective-`) ||
      !criticalCss
        .replace(/var\(\s+(--ui-[a-z0-9-]+)\s+\)/gu, 'var($1)')
        .includes(`${role.publicBinding}: var(--ui-theme-bank-effective-`)
    ) {
      violations.push(`${role.publicRole}: public Theme Bank binding is incomplete.`)
    }
  }

  if (
    initializer.includes(applicationConfig.appearance.preferenceStorageKey) ||
    initializer.includes(applicationConfig.appearance.customThemeRegistryStorageKey) ||
    /\.(?:setItem|removeItem|clear)\s*\(/u.test(initializer)
  ) {
    violations.push('appearance-init.js: application keys or Storage writes are forbidden.')
  }

  if (
    !initializer.includes('Embedded from the declared Color.js dependency') ||
    !firstPaintFormatter.includes('../../schema/css-color.ts')
  ) {
    violations.push(
      'appearance-init.js: current Custom colors must reuse the Design System CSS Color owner.',
    )
  }

  if (
    !initializer.includes('function captureAppearanceState()') ||
    !initializer.includes('function restoreAppearanceState(capture)') ||
    !initializer.includes('restoreAppearanceState(previousAppearanceState)')
  ) {
    violations.push(
      'appearance-init.js: all-axis application needs exact local rollback before rejection.',
    )
  }

  const manifest = JSON.parse(manifestSource) as unknown

  if (!isJsonObject(manifest)) {
    return [...violations, 'tokens.manifest.json: root must be an object.']
  }

  const familyNames = [
    'tokens',
    'activePublicRoles',
    'unoCssMappings',
    'namedContrasts',
    'alphaContracts',
    'densities',
    'themes',
    'firstPaint',
  ] as const
  const recordCount = familyNames.reduce(
    (count, family) => count + (Array.isArray(manifest[family]) ? manifest[family].length : 0),
    0,
  )

  if (manifest['schemaVersion'] !== 12 || recordCount !== 602) {
    violations.push('tokens.manifest.json: current discriminator/count must equal 12/602.')
  }

  const themes = manifest['themes']

  if (!Array.isArray(themes) || themes.length !== builtInThemeIds.length) {
    violations.push('tokens.manifest.json: exactly five active Built-in Themes are required.')
  } else {
    for (const [index, value] of themes.entries()) {
      const expectedEntry = generatedThemeRegistry.builtInEntries[index]

      if (
        !isJsonObject(value) ||
        expectedEntry === undefined ||
        !exactKeys(value, [
          'activationStatus',
          'registryKind',
          'themeId',
          'label',
          'source',
          'schemaVersion',
          'roleContractVersion',
          'planes',
          'uiPalette',
          'bank',
        ]) ||
        value['activationStatus'] !== 'ACTIVE' ||
        value['registryKind'] !== 'built-in' ||
        value['themeId'] !== expectedEntry.themeId
      ) {
        violations.push(`tokens.manifest.json: themes[${String(index)}] identity/keys drifted.`)
        continue
      }

      if (!isDeepStrictEqual(value['uiPalette'], expectedEntry.uiPalette))
        violations.push(
          `tokens.manifest.json: ${expectedEntry.themeId} approved palette projection drifted.`,
        )
      const bank = value['bank']

      if (
        !isJsonObject(bank) ||
        !exactKeys(bank, ['visibility', 'derivation']) ||
        bank['visibility'] !== 'ui-internal' ||
        bank['derivation'] !== 'theme-planes-and-active-public-roles'
      ) {
        violations.push(`tokens.manifest.json: themes[${String(index)}].bank drifted.`)
      }
      const definition = completeBuiltInThemeDefinitionSchema.parse({
        schemaVersion: value['schemaVersion'],
        roleContractVersion: value['roleContractVersion'],
        id: value['themeId'],
        label: value['label'],
        planes: value['planes'],
        uiPalette: value['uiPalette'],
      })
      const publicRoles = validatePublicRoleRegistry({
        schemaVersion: 2,
        status: 'active-current-public-surface',
        records: manifest['activePublicRoles'],
      })
      const records = deriveThemeBankRecords(definition.planes, publicRoles)
      const expectedRecords = expectedEntry.bank.records.map(
        ({
          colorMode,
          contrast,
          publicRole,
          sourceField,
          authoredValue,
          bankVariable,
          publicBinding,
        }) => ({
          colorMode,
          contrast,
          publicRole,
          sourceField,
          authoredValue,
          bankVariable,
          publicBinding,
        }),
      )
      if (records.length !== 120 || !isDeepStrictEqual(records, expectedRecords)) {
        violations.push(
          `tokens.manifest.json: ${expectedEntry.themeId} logical Bank records lost information or order.`,
        )
      }
    }
  }

  const firstPaint = manifest['firstPaint']
  const expectedFirstPaint = [
    {
      applicationKeyAgnostic: true,
      safetyBaseline: {
        effectiveColorMode: 'light',
        effectiveTheme: { registryKind: 'built-in', themeId: 'royal-iris' },
        effectiveContrast: 'standard',
        effectiveMaterial: 'solid',
        effectiveDensity: 'comfortable',
      },
      artifacts: ['appearance-init.js', 'critical-theme.css'],
      synchronousClassicScript: true,
      storageWrite: false,
      capabilities: {
        preferenceStorageKeyAttribute: true,
        preferenceStorageRead: true,
        explicitThemePreferenceValidation: true,
        builtInThemeResolution: true,
        atomicAppearanceApplication: true,
        synchronousCustomThemeResolution: true,
        customThemeRuntimeResolution: true,
        themeRegistryStorageKeyAttribute: true,
      },
    },
  ]

  if (!isDeepStrictEqual(firstPaint, expectedFirstPaint)) {
    violations.push('tokens.manifest.json: First Paint record drifted from its frozen shape.')
  }

  return violations
}

export async function validateAppearanceCutover(): Promise<readonly string[]> {
  const violations: string[] = []
  const checks: readonly (() => readonly string[] | Promise<readonly string[]>)[] = [
    validateStableGeneratedOutputs,
    validatePublicRoot,
    validateColorRuntimeEntryOwnership,
    validateFiveBuiltInThemes,
    validateApplicationOrchestration,
    validatePackageFiveStaticAuthorities,
    validateParserCorpus,
    validatePersistenceContracts,
    validateRuntimeContracts,
    validateSharedAppearanceSynchronization,
    validateGeneratedThemeBankAndManifest,
  ]

  for (const check of checks) {
    try {
      violations.push(...(await check()))
    } catch (error) {
      violations.push(
        `Appearance cutover checker defect: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return violations
}
