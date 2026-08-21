import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import {
  ProductPreferenceDefault,
  applyAppearance,
  explicitThemePreferenceSchema,
  installCustomThemeBank,
  migrateToExplicitThemePreference,
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
import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { parseJsonSource } from '../../packages/design-system/src/build/parse-json'
import { generatedThemeRegistry } from '../../packages/design-system/src/generated/theme-registry'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const stableGeneratedHashes = {
  'packages/design-system/src/generated/token-names.ts':
    '15a95705fd99a7a4be1169ea734975c12e1d7a1f3897276002064c04b1c0cb8c',
  'packages/design-system/src/generated/tokens.ts':
    '90fd7f11153319b683cb6f79a9beb3a88eac7e2d9a34c966aed1f6e5b5808464',
  'packages/design-system/src/generated/unocss-theme.ts':
    '418e1bc8b6b6fa3db431d14f45ee54bd00fc95b19f116d87f5034e9790405840',
} as const
const expectedPublicRootSymbols = [
  'colorModePreferenceSchema',
  'contrastPreferenceSchema',
  'densityPreferenceSchema',
  'fontScaleSchema',
  'materialPreferenceSchema',
  'motionPreferenceSchema',
  'uiDensitySchema',
  'ColorModePreference',
  'ContrastPreference',
  'DensityPreference',
  'FontScale',
  'MaterialPreference',
  'MotionPreference',
  'UiDensity',
  'explicitThemePreferenceSchema',
  'ExplicitThemePreference',
  'ThemeReference',
  'ProductPreferenceDefault',
  'applyAppearance',
  'EffectiveAppearanceState',
  'migrateToExplicitThemePreference',
  'PreferenceMigrationResult',
  'resolveColorMode',
  'EffectiveColorMode',
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
  'platformPreset',
] as const
const expectedStoreActions = [
  'restoreAppearance',
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
    violations.push(...scanConsumerAppearanceAuthorities(path, await readFile(path, 'utf8')))
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
      theme: { registryKind: 'built-in', themeId: 'neutral' },
      contrast: 'standard',
      material: 'adaptive',
      density: { preset: 'comfortable', scale: 1 },
      fontScale: 1,
      motion: 'full',
    }
    target.setAttribute('data-theme', 'neutral')`,
  )
  const safetyNegativeProbe = scanDesignSystemAppearanceAuthorities(
    '<package-five-safety-negative-probe>',
    `const duplicateSafety = {
      effectiveColorMode: 'light',
      effectiveTheme: { registryKind: 'built-in', themeId: 'neutral' },
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
      `packages/design-system/src/index.ts: expected the frozen ordered 38-symbol Package 5 public root, received [${actual.join(', ')}].`,
    ]
  }

  return []
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
      violations.push('appearance.store.ts: Store Actions must equal the frozen ordered six.')
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

  for (const name of ['resolveThemeReference', 'installCustomThemeBank', 'applyAppearance']) {
    if (
      !isDeepStrictEqual([...new Set(callOwners.get(name) ?? [])], ['commitAppearanceTransition'])
    ) {
      violations.push(`appearance.store.ts: ${name} may run only inside the transaction.`)
    }
  }

  const expectedTransactionIntents = new Map<string, readonly string[]>([
    ['restoreAppearance', ['none']],
    ['changeAppearancePreference', ['preference']],
    ['resetAppearancePreference', ['preference']],
    ['replaceCustomThemeRegistry', ['registry']],
    ['reapplyAppearance', ['none']],
  ])

  for (const [owner, intents] of expectedTransactionIntents) {
    if (!isDeepStrictEqual(transactionIntents.get(owner), intents)) {
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
    violations.push('appearance.store.ts: Registry Writer callers must be transaction + deletion.')
  }

  for (const [name, expectedOwners] of [
    ['captureStoredPreference', ['commitAppearanceTransition']],
    ['restoreStoredPreference', ['commitAppearanceTransition']],
    ['captureCustomThemeRegistry', ['commitAppearanceTransition', 'deleteCustomTheme']],
    ['restoreCustomThemeRegistry', ['commitAppearanceTransition', 'deleteCustomTheme']],
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
    'this.customThemeRegistry = write.entries',
  ]) {
    if (!deletionSource.includes(required)) {
      violations.push(`appearance.store.ts: deleteCustomTheme is missing ${required}.`)
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

    if (/from\s+['"]pinia['"]/u.test(sourceText)) {
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

    if (sessionStorageReferences > 0) {
      violations.push(`${displayPath}: sessionStorage is not admitted.`)
    }
  }

  if (
    !isDeepStrictEqual(piniaImporters.sort(compareCodePoints), [
      'apps/web/src/app/appearance/appearance.store.ts',
      'apps/web/src/app/providers/pinia.ts',
    ])
  ) {
    violations.push(
      'Pinia imports must remain limited to its Runtime Kernel provider owner and appearance.store.ts.',
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
        getItem: ['captureStoredPreference', 'readStoredPreference'],
        removeItem: ['restoreStoredPreference'],
        setItem: ['restoreStoredPreference', 'writeStoredPreference'],
      },
    ),
    ...validateStorageOwnerAst(
      resolve(appearanceDirectory, 'custom-theme-registry-storage.ts'),
      registryStorage,
      {
        getItem: ['captureCustomThemeRegistry', 'readCustomThemeRegistry'],
        removeItem: ['restoreCustomThemeRegistry'],
        setItem: ['restoreCustomThemeRegistry', 'writeCustomThemeRegistry'],
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
  const prohibitedMainValueImports = mainFile.statements.filter(
    (statement): statement is ts.ImportDeclaration => {
      if (
        !ts.isImportDeclaration(statement) ||
        statement.importClause === undefined ||
        statement.importClause.phaseModifier === ts.SyntaxKind.TypeKeyword ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        return false
      }

      const modulePath = statement.moduleSpecifier.text
      return (
        modulePath === 'vue' ||
        modulePath === 'pinia' ||
        (modulePath.startsWith('./app/appearance/') &&
          (statement.importClause.name !== undefined ||
            (statement.importClause.namedBindings !== undefined &&
              (!ts.isNamedImports(statement.importClause.namedBindings) ||
                statement.importClause.namedBindings.elements.some(
                  (element) => !element.isTypeOnly,
                )))))
      )
    },
  )

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
      schemaVersion: 3,
      appearance: ProductPreferenceDefault,
    })
    const tuple = generatedThemeRegistry.legacyBuiltInThemeTuples[0]
    const legacyPreference = {
      schemaVersion: 2,
      appearance: {
        colorMode: 'system',
        theme: tuple.themeId,
        palette: {
          brand: tuple.brand,
          accent: tuple.accent,
          neutral: tuple.neutral,
        },
        contrast: 'standard',
        material: 'adaptive',
        density: { preset: 'comfortable', scale: 1 },
        fontScale: 1,
        motion: 'full',
      },
    } as const

    if (readStoredPreference().status !== 'missing' || storage.setCalls !== 0) {
      violations.push('Preference Reader must not write when the key is absent.')
    }

    const legacyRaw = JSON.stringify(legacyPreference)
    storage.values.set(preferenceKey, legacyRaw)
    const legacyRead = readStoredPreference()

    if (
      legacyRead.status !== 'restored' ||
      storage.values.get(preferenceKey) !== legacyRaw ||
      storage.setCalls !== 0
    ) {
      violations.push('Successful startup migration must remain in memory without writeback.')
    }

    storage.values.set(preferenceKey, '{malformed')

    if (readStoredPreference().status !== 'malformed' || storage.setCalls !== 0) {
      violations.push('Malformed Preference JSON must be rejected privately without a write.')
    }

    storage.values.set(
      preferenceKey,
      JSON.stringify({
        ...legacyPreference,
        appearance: {
          ...legacyPreference.appearance,
          palette: {
            ...legacyPreference.appearance.palette,
            brand: 'var(--invalid-legacy-color)',
          },
        },
      }),
    )
    const invalidParsedPreference = readStoredPreference()

    if (
      invalidParsedPreference.status !== 'rejected' ||
      invalidParsedPreference.code !== 'PREFERENCE_INPUT_INVALID' ||
      storage.setCalls !== 0
    ) {
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

    const neutral = generatedThemeRegistry.builtInEntries[0]
    const firstValidation = validateCustomThemeDefinition({
      ...neutral.definition,
      id: 'z.registry',
    })
    const secondValidation = validateCustomThemeDefinition({
      ...neutral.definition,
      id: 'A.registry',
    })

    if (firstValidation.status !== 'validated' || secondValidation.status !== 'validated') {
      return [...violations, 'Persistence probe Custom Themes must validate.']
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

    return violations
  })
}

function validateRuntimeContracts(): readonly string[] {
  const violations: string[] = []
  const expectedProductDefault = {
    colorMode: 'system',
    theme: { registryKind: 'built-in', themeId: 'neutral' },
    contrast: 'standard',
    material: 'adaptive',
    density: { preset: 'comfortable', scale: 1 },
    fontScale: 1,
    motion: 'full',
  }

  if (!isDeepStrictEqual(ProductPreferenceDefault, expectedProductDefault)) {
    violations.push('ProductPreferenceDefault drifted from the frozen seven-axis authority.')
  }

  const defaultPreference = explicitThemePreferenceSchema.safeParse({
    schemaVersion: 3,
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

  const explicitMigration = migrateToExplicitThemePreference(defaultPreference.data)

  if (
    explicitMigration.status !== 'success' ||
    !isDeepStrictEqual(explicitMigration.preference, defaultPreference.data)
  ) {
    violations.push('Valid Explicit Theme Preference migration must be an identity operation.')
  }

  const tuple = generatedThemeRegistry.legacyBuiltInThemeTuples[0]

  const legacyPreference = {
    schemaVersion: 2,
    appearance: {
      colorMode: 'system',
      theme: tuple.themeId,
      palette: {
        brand: tuple.brand,
        accent: tuple.accent,
        neutral: tuple.neutral,
      },
      contrast: 'standard',
      material: 'adaptive',
      density: { preset: 'comfortable', scale: 1 },
      fontScale: 1,
      motion: 'full',
    },
  } as const
  const losslessMigration = migrateToExplicitThemePreference(legacyPreference)
  const lossyMigration = migrateToExplicitThemePreference({
    ...legacyPreference,
    appearance: {
      ...legacyPreference.appearance,
      palette: {
        ...legacyPreference.appearance.palette,
        brand: '#123456',
      },
    },
  })

  if (
    losslessMigration.status !== 'success' ||
    losslessMigration.preference.appearance.theme.themeId !== tuple.themeId
  ) {
    violations.push('Lossless Legacy Preference migration is not deterministic.')
  }

  if (
    lossyMigration.status !== 'failure' ||
    lossyMigration.code !== 'MIGRATION_REQUIRES_THEME_COMPLETION'
  ) {
    violations.push('Lossy Legacy Preference migration must require Theme completion.')
  }

  for (const invalidInput of [
    { schemaVersion: 3 },
    {
      ...legacyPreference,
      appearance: {
        ...legacyPreference.appearance,
        palette: {
          ...legacyPreference.appearance.palette,
          brand: 'var(--invalid-legacy-color)',
        },
      },
    },
  ]) {
    const migration = migrateToExplicitThemePreference(invalidInput)

    if (migration.status !== 'failure' || migration.code !== 'PREFERENCE_INPUT_INVALID') {
      violations.push('Arbitrary parsed invalid input must map to PREFERENCE_INPUT_INVALID.')
    }
  }

  const neutral = generatedThemeRegistry.builtInEntries[0]

  const customDefinition = {
    ...neutral.definition,
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
    violations.push('Custom Theme Bank installation escaped its fixed 36-variable allowlist.')
  }

  const firstBankVariable = generatedThemeRegistry.customBankVariables[0]
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
    theme: { registryKind: 'built-in', themeId: 'neutral' },
    contrast: 'standard',
    material: 'solid',
    density: 'comfortable',
    fontScale: 1,
    motion: 'full',
  })

  if (
    properties.size !== 1 ||
    properties.get('--ui-font-scale')?.value !== '1' ||
    attributes.get('data-theme-kind') !== 'built-in'
  ) {
    violations.push('Built-in Appearance application did not clear the Custom Theme Bank.')
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
  const [runtimeCss, criticalCss, initializer, manifestSource] = await Promise.all([
    readFile(resolve(generatedDirectory, 'tokens.css'), 'utf8'),
    readFile(resolve(generatedDirectory, 'critical-theme.css'), 'utf8'),
    readFile(resolve(generatedDirectory, 'appearance-init.js'), 'utf8'),
    readFile(resolve(generatedDirectory, 'tokens.manifest.json'), 'utf8'),
  ])

  for (const entry of generatedThemeRegistry.builtInEntries) {
    const selector = `html[data-theme-kind='built-in'][data-theme='${entry.themeId}']`

    for (const [artifact, css] of [
      ['tokens.css', runtimeCss],
      ['critical-theme.css', criticalCss],
    ] as const) {
      const declarations = selectorDeclarations(css, selector)

      if (
        declarations?.size !== 36 ||
        entry.bank.records.some(
          (record) => declarations.get(record.bankVariable) !== record.resolvedValue,
        )
      ) {
        violations.push(`${artifact}: ${entry.themeId} Built-in Theme Bank projection drifted.`)
      }
    }
  }

  for (const role of generatedThemeRegistry.activePublicColorRoles) {
    if (
      !runtimeCss.includes(`${role.publicBinding}: var(--ui-theme-bank-effective-`) ||
      !criticalCss.includes(`${role.publicBinding}: var(--ui-theme-bank-effective-`)
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
    !initializer.includes('function isCssColor(value)') ||
    !initializer.includes('new Color(value)')
  ) {
    violations.push(
      'appearance-init.js: legacy Preference colors must use the declared Color.js classifier.',
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

  if (manifest['schemaVersion'] !== 7 || recordCount !== 181) {
    violations.push('tokens.manifest.json: Package 5 discriminator/count must equal 7/181.')
  }

  const themes = manifest['themes']

  if (!Array.isArray(themes) || themes.length !== 3) {
    violations.push('tokens.manifest.json: exactly three active Built-in Themes are required.')
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
          'bank',
        ]) ||
        value['activationStatus'] !== 'ACTIVE' ||
        value['registryKind'] !== 'built-in' ||
        value['themeId'] !== expectedEntry.themeId
      ) {
        violations.push(`tokens.manifest.json: themes[${String(index)}] identity/keys drifted.`)
        continue
      }

      const bank = value['bank']
      const records = isJsonObject(bank) ? bank['records'] : undefined

      if (
        !isJsonObject(bank) ||
        !exactKeys(bank, ['visibility', 'records']) ||
        bank['visibility'] !== 'ui-internal' ||
        !Array.isArray(records) ||
        records.length !== 36 ||
        records.some(
          (record) =>
            !isJsonObject(record) ||
            !exactKeys(record, [
              'colorMode',
              'contrast',
              'publicRole',
              'sourceField',
              'authoredValue',
              'bankVariable',
              'publicBinding',
            ]),
        )
      ) {
        violations.push(`tokens.manifest.json: themes[${String(index)}].bank drifted.`)
      }
    }
  }

  const firstPaint = manifest['firstPaint']
  const expectedFirstPaint = [
    {
      applicationKeyAgnostic: true,
      safetyBaseline: {
        effectiveColorMode: 'light',
        effectiveTheme: { registryKind: 'built-in', themeId: 'neutral' },
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
        legacyPreferenceMigration: true,
        builtInThemeResolution: true,
        atomicAppearanceApplication: true,
        synchronousCustomThemeResolution: false,
        customThemeRuntimeResolution: true,
        themeRegistryStorageKeyAttribute: false,
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
    validateApplicationOrchestration,
    validatePackageFiveStaticAuthorities,
    validateParserCorpus,
    validatePersistenceContracts,
    validateRuntimeContracts,
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
