import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { runInNewContext } from 'node:vm'
import { constants, gzipSync, type ZlibOptions } from 'node:zlib'

import StyleDictionary from 'style-dictionary'
import type { PreprocessedTokens } from 'style-dictionary/types'

import { ProductPreferenceDefault } from '../runtime/appearance-defaults'
import { migrateToExplicitThemePreference } from '../runtime/preference-migration'
import { resolveColorMode } from '../runtime/resolve-color-mode'
import { resolveMaterial } from '../runtime/resolve-material'
import { fontScaleValues } from '../schema/appearance.schema'
import { explicitThemePreferenceSchema } from '../schema/preference.schema'
import { tokenPathFromReference } from '../schema/token.schema'
import { validateCompleteBuiltInThemes } from './complete-themes'
import { validateContrastAndMaterialContracts } from './contrast'
import { createCssFormat, formatRuntimeCss } from './formats/css'
import {
  createAppearanceInitFormat,
  createCriticalThemeFormat,
  formatAppearanceInitScript,
  formatCriticalThemeCss,
  preInitializationSafetyBaseline,
} from './formats/first-paint'
import {
  createManifestFormat,
  manifestDocument,
  validateManifestGovernance,
} from './formats/manifest'
import {
  selectTokensForOutput,
  stableJson,
  tokenValueToCss,
  type FormatContext,
} from './formats/shared'
import {
  createTokenNamesFormat,
  createThemeRegistryFormat,
  createTokensTypeScriptFormat,
  createUnoCssThemeFormat,
  formatTokenNames,
  formatThemeRegistryTypeScript,
  formatTokensTypeScript,
  formatUnoCssTheme,
  themeRegistryDocument,
  unoCssProjection,
} from './formats/typescript'
import { compareCodePoints } from './order'
import {
  parseTokenSourceRecords,
  preprocessTokenSources,
  validateActivePublicRoleTokens,
  validateTokenRecords,
  type TokenBuildResult,
} from './preprocess'
import {
  ActiveAlphaContractRegistry,
  ActiveNamedContrastRegistry,
  PublicRoleRegistry,
  unoCssMappingRecords,
  validateAlphaContractRegistry,
  validateNamedContrastRegistry,
  validatePublicRoleRegistry,
} from './public-role-registry'
import { createTokenResolver, type ResolvedTokenRecord, type TokenResolver } from './resolve'

const buildDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(buildDirectory, '../../../..')
const tokenSourceDirectory = resolve(repositoryRoot, 'packages/design-system/tokens')
const generatedDirectory = resolve(repositoryRoot, 'packages/design-system/src/generated')
const generatedFiles = [
  'appearance-init.js',
  'critical-theme.css',
  'token-names.ts',
  'theme-registry.ts',
  'tokens.css',
  'tokens.manifest.json',
  'tokens.ts',
  'unocss-theme.ts',
] as const

const manifestCompressionContract = {
  profileId: 'node-zlib-gzip-sync',
  runtimeNodeVersion: '24.15.0',
  baseline: {
    commit: 'd2e7354fad616824e52dfe5ca0f7cdbe6b4705cf',
    bytes: 3366,
  },
  current: {
    expectedBytes: 7687,
    expectedByteDelta: 4321,
  },
  completeThemePlanes: {
    baselineCommit: '1daba84b5196e152966bd7e0f2e9e7ed8c24938f',
    baselineBytes: 5213,
    acceptedFinalBytes: 6153,
    baselineRecordCount: 181,
    expectedByteDelta: 940,
    expectedRecordCountDelta: 0,
  },
  explicitThemePreferenceCutover: {
    baselineCommit: '2f5a28a7dbe877f96ac3d24299d892bd7bb9087f',
    baselineBytes: 6153,
    baselineRecordCount: 181,
    expectedByteDelta: 1534,
    expectedRecordCountDelta: 0,
  },
  hardLimitBytes: 32768,
  options: {
    chunkSize: constants.Z_DEFAULT_CHUNK,
    finishFlush: constants.Z_FINISH,
    flush: constants.Z_NO_FLUSH,
    level: constants.Z_BEST_COMPRESSION,
    memLevel: constants.Z_DEFAULT_MEMLEVEL,
    strategy: constants.Z_DEFAULT_STRATEGY,
    windowBits: constants.Z_DEFAULT_WINDOWBITS,
  },
} as const

const manifestGzipOptions = {
  ...manifestCompressionContract.options,
} as const satisfies ZlibOptions

interface SourceBundle {
  contents: string
  path: string
}

interface InitializedDictionary {
  context: FormatContext
  dictionary: StyleDictionary
}

async function collectSourcePaths(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })
  const paths: string[] = []

  for (const entry of entries.sort((left, right) => compareCodePoints(left.name, right.name))) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      paths.push(...(await collectSourcePaths(path)))
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.tokens.json') || entry.name.endsWith('.theme.json'))
    ) {
      paths.push(path)
    } else if (entry.isFile()) {
      const sourcePath = relative(tokenSourceDirectory, path).split(sep).join('/')

      if (sourcePath !== 'component/README.md') {
        throw new Error(`${sourcePath}: unsupported token source file.`)
      }
    }
  }

  return paths
}

async function readSourceBundles(): Promise<SourceBundle[]> {
  const sourcePaths = await collectSourcePaths(tokenSourceDirectory)

  if (sourcePaths.length === 0) {
    throw new Error('No token or theme sources were found.')
  }

  return Promise.all(
    sourcePaths.map(async (path) => ({
      contents: await readFile(path, 'utf8'),
      path: relative(tokenSourceDirectory, path).split(sep).join('/'),
    })),
  )
}

function sourceDictionary(bundles: readonly SourceBundle[]): PreprocessedTokens {
  return {
    'pavp-source': Object.fromEntries(
      bundles.map((bundle, index) => [
        String(index).padStart(3, '0'),
        {
          $type: 'string',
          $value: bundle,
        },
      ]),
    ),
  }
}

function buildPath(directory: string): string {
  return directory.endsWith(sep) ? directory : `${directory}${sep}`
}

async function initializeDictionary(outputDirectory: string): Promise<InitializedDictionary> {
  const context: FormatContext = {}
  const dictionary = new StyleDictionary(
    {
      tokens: sourceDictionary(await readSourceBundles()),
      usesDtcg: true,
      preprocessors: ['pavp/strict'],
      log: {
        warnings: 'error',
        errors: {
          brokenReferences: 'throw',
        },
      },
      platforms: {
        generated: {
          buildPath: buildPath(outputDirectory),
          transforms: ['pavp/name/path', 'pavp/css-value'],
          files: [
            {
              destination: 'tokens.css',
              format: 'pavp/css',
            },
            {
              destination: 'critical-theme.css',
              format: 'pavp/css/critical-theme',
            },
            {
              destination: 'appearance-init.js',
              format: 'pavp/javascript/appearance-init',
            },
            {
              destination: 'tokens.ts',
              format: 'pavp/typescript/tokens',
            },
            {
              destination: 'token-names.ts',
              format: 'pavp/typescript/token-names',
            },
            {
              destination: 'theme-registry.ts',
              format: 'pavp/typescript/theme-registry',
            },
            {
              destination: 'unocss-theme.ts',
              format: 'pavp/typescript/unocss-theme',
            },
            {
              destination: 'tokens.manifest.json',
              format: 'pavp/json/manifest',
            },
          ],
        },
      },
    },
    {
      init: false,
    },
  )

  dictionary.registerPreprocessor({
    name: 'pavp/strict',
    preprocessor: (tokens) => {
      const processed = preprocessTokenSources(tokens)
      context.result = processed.result
      return processed.tokens
    },
  })
  dictionary.registerTransform({
    name: 'pavp/name/path',
    type: 'name',
    transform: (token) => token.path.join('-'),
  })
  dictionary.registerTransform({
    name: 'pavp/css-value',
    type: 'value',
    transitive: false,
    transform: (token) => {
      if (typeof token.$type !== 'string') {
        throw new Error(`${token.path.join('.')}: token type is missing after preprocessing.`)
      }

      return tokenValueToCss(token.$type as Parameters<typeof tokenValueToCss>[0], token.$value)
    },
  })

  for (const format of [
    createCssFormat(context),
    createCriticalThemeFormat(context),
    createAppearanceInitFormat(context),
    createTokensTypeScriptFormat(context),
    createTokenNamesFormat(context),
    createThemeRegistryFormat(context),
    createUnoCssThemeFormat(context),
    createManifestFormat(context),
  ]) {
    dictionary.registerFormat(format)
  }

  await dictionary.init()
  return {
    context,
    dictionary,
  }
}

function requireResult(context: FormatContext): TokenBuildResult {
  if (context.result === undefined) {
    throw new Error('Token validation completed without build metadata.')
  }

  validateGeneratorContracts(context.result)
  validateAppearanceContracts(context.result)
  validateFirstPaintContracts(context.result)
  return context.result
}

function assertInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Production contract: ${message}.`)
  }
}

function assertInvariantEqual(actual: unknown, expected: unknown, message: string): void {
  assertInvariant(isDeepStrictEqual(actual, expected), message)
}

function assertContractFailure(
  operation: () => unknown,
  expectedMessage: RegExp,
  message: string,
): void {
  let failure: unknown

  try {
    operation()
  } catch (error) {
    failure = error
  }

  assertInvariant(failure instanceof Error && expectedMessage.test(failure.message), message)
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deterministicManifestGzip(serializedManifest: Buffer): Buffer {
  return gzipSync(serializedManifest, manifestGzipOptions)
}

function validateManifestCompression(result: TokenBuildResult): number {
  const document = manifestDocument(result)
  const governance = document['governance']

  assertInvariant(
    isUnknownRecord(governance) &&
      governance['compressionProfileId'] === manifestCompressionContract.profileId,
    'Manifest payload and external compression profile IDs must match',
  )
  assertInvariant(
    process.versions.node === manifestCompressionContract.runtimeNodeVersion,
    `Manifest compression requires Node ${manifestCompressionContract.runtimeNodeVersion}, received ${process.versions.node}`,
  )
  assertInvariantEqual(
    Object.keys(manifestGzipOptions).sort(compareCodePoints),
    Object.keys(manifestCompressionContract.options).sort(compareCodePoints),
    'Manifest gzip option keys must match the canonical compression profile',
  )

  for (const [option, expected] of Object.entries(manifestCompressionContract.options)) {
    assertInvariant(
      manifestGzipOptions[option as keyof typeof manifestGzipOptions] === expected,
      `Manifest gzip option "${option}" must match the canonical compression profile`,
    )
  }

  const serializedText = stableJson(document)

  assertInvariant(
    serializedText.endsWith('\n') && !serializedText.endsWith('\n\n'),
    'Manifest compression input must contain exactly one terminal LF',
  )

  const serializedManifest = Buffer.from(serializedText, 'utf8')

  assertInvariantEqual(
    serializedManifest.toString('utf8'),
    serializedText,
    'Manifest compression input must use UTF-8 encoding',
  )

  const first = deterministicManifestGzip(serializedManifest)
  const repeated = deterministicManifestGzip(serializedManifest)
  const expectedHeader = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02])

  assertInvariant(
    first.equals(repeated),
    'Manifest gzip compression must be byte-identical within one process',
  )
  assertInvariant(
    first.subarray(0, expectedHeader.length).equals(expectedHeader),
    'Manifest gzip header must contain no name or timestamp metadata',
  )

  const originalPath = process.env['PATH']

  try {
    process.env['PATH'] = '/pavp-manifest-gzip-path-must-not-be-read'
    assertInvariant(
      first.equals(deterministicManifestGzip(serializedManifest)),
      'Manifest gzip compression must not depend on the process PATH',
    )
  } finally {
    if (originalPath === undefined) {
      delete process.env['PATH']
    } else {
      process.env['PATH'] = originalPath
    }
  }

  const gzipBytes = first.byteLength
  const actualDelta = gzipBytes - manifestCompressionContract.baseline.bytes
  const explicitThemePreferenceByteDelta =
    gzipBytes - manifestCompressionContract.explicitThemePreferenceCutover.baselineBytes
  const manifestRecordCount = governance['recordCount']

  assertInvariant(
    manifestCompressionContract.current.expectedBytes -
      manifestCompressionContract.baseline.bytes ===
      manifestCompressionContract.current.expectedByteDelta,
    'Manifest external byte-governance expected bytes and delta must match the canonical baseline',
  )
  assertInvariant(
    gzipBytes <= manifestCompressionContract.hardLimitBytes,
    `Manifest gzip budget exceeded: ${String(gzipBytes)} bytes exceed ${String(manifestCompressionContract.hardLimitBytes)} bytes`,
  )
  assertInvariant(
    gzipBytes === manifestCompressionContract.current.expectedBytes,
    `Manifest gzip bytes: expected ${String(manifestCompressionContract.current.expectedBytes)}, received ${String(gzipBytes)}`,
  )
  assertInvariant(
    actualDelta === manifestCompressionContract.current.expectedByteDelta,
    `Manifest gzip delta: expected ${String(manifestCompressionContract.current.expectedByteDelta)}, received ${String(actualDelta)}`,
  )
  assertInvariant(
    manifestCompressionContract.completeThemePlanes.acceptedFinalBytes -
      manifestCompressionContract.completeThemePlanes.baselineBytes ===
      manifestCompressionContract.completeThemePlanes.expectedByteDelta,
    'historical Complete Theme planes accepted bytes and delta must match their baseline',
  )
  assertInvariant(
    typeof manifestRecordCount === 'number' &&
      manifestRecordCount -
        manifestCompressionContract.explicitThemePreferenceCutover.baselineRecordCount ===
        manifestCompressionContract.explicitThemePreferenceCutover.expectedRecordCountDelta,
    'Explicit Theme Preference cutover Manifest record delta must equal zero',
  )
  assertInvariant(
    manifestCompressionContract.current.expectedBytes -
      manifestCompressionContract.explicitThemePreferenceCutover.baselineBytes ===
      manifestCompressionContract.explicitThemePreferenceCutover.expectedByteDelta,
    'Explicit Theme Preference cutover expected bytes and delta must match the entry baseline',
  )
  assertInvariant(
    explicitThemePreferenceByteDelta ===
      manifestCompressionContract.explicitThemePreferenceCutover.expectedByteDelta,
    `Explicit Theme Preference cutover gzip delta: expected ${String(manifestCompressionContract.explicitThemePreferenceCutover.expectedByteDelta)}, received ${String(explicitThemePreferenceByteDelta)}`,
  )

  return gzipBytes
}

function validationRecords(
  sourcePath: string,
  source: Record<string, unknown> | string,
): readonly ResolvedTokenRecord[] {
  const contents = typeof source === 'string' ? source : JSON.stringify(source)
  return createTokenResolver(parseTokenSourceRecords(sourcePath, contents)).records
}

function validationResult(
  baseline: TokenBuildResult,
  tokens: readonly ResolvedTokenRecord[],
): TokenBuildResult {
  const compounds = validateTokenRecords(tokens, new Set(baseline.themes.map((theme) => theme.id)))

  return {
    activePublicRoles: baseline.activePublicRoles,
    alphaContracts: baseline.alphaContracts,
    colorCompoundBudget: baseline.colorCompoundBudget,
    completeThemes: baseline.completeThemes,
    compounds,
    densityPresets: baseline.densityPresets,
    materialRoles: [],
    namedContrasts: [],
    sourceFiles: [...new Set(tokens.map((token) => token.source))].sort(compareCodePoints),
    themes: baseline.themes,
    tokens,
    unoCssMappings: baseline.unoCssMappings,
  }
}

function exactRoleIdSet(
  values: readonly string[],
  expected: readonly string[],
  description: string,
  allowRepeatedConditions = false,
): string[] {
  if (!allowRepeatedConditions) {
    const duplicates = values.filter((value, index) => values.indexOf(value) !== index)

    assertInvariant(
      duplicates.length === 0,
      `${description} must not contain duplicate role IDs: ${duplicates.join(', ')}`,
    )
  }

  const actualSet = [...new Set(values)].sort(compareCodePoints)
  const expectedSet = [...expected].sort(compareCodePoints)

  assertInvariantEqual(
    actualSet,
    expectedSet,
    `${description} must equal the active public role set`,
  )
  return actualSet
}

function validateUnoCssProjection(result: TokenBuildResult): string[] {
  const projection = unoCssProjection(result)
  const expectedMappings = unoCssMappingRecords(result.activePublicRoles)

  assertInvariantEqual(
    projection.mappings,
    expectedMappings,
    'UnoCSS mapping records must exactly project the Public Role Registry',
  )

  for (const mapping of projection.mappings) {
    const role = result.activePublicRoles.find((record) => record.id === mapping.roleId)

    assertInvariant(role !== undefined, `${mapping.roleId} UnoCSS mapping must bind an active role`)
    assertInvariantEqual(
      mapping,
      {
        roleId: role.id,
        cssVariable: role.cssVariable,
        generatorKind: role.unocss.generatorKind,
        family: role.unocss.family,
        key: role.unocss.key,
        classes: role.unocss.classes,
        allowedCssProperties: role.unocss.allowedCssProperties,
      },
      `${mapping.roleId} UnoCSS metadata must remain registry exact`,
    )

    if (mapping.generatorKind === 'exact-rule') {
      const rules = projection.rules.filter((rule) => rule.roleId === mapping.roleId)

      assertInvariantEqual(
        rules.map((rule) => rule.className).sort(compareCodePoints),
        [...mapping.classes].sort(compareCodePoints),
        `${mapping.roleId} exact UnoCSS classes must all be generated`,
      )

      for (const rule of rules) {
        assertInvariantEqual(
          Object.keys(rule.declarations).sort(compareCodePoints),
          [...mapping.allowedCssProperties].sort(compareCodePoints),
          `${mapping.roleId} exact UnoCSS rule must write only allowed CSS properties`,
        )
        assertInvariant(
          Object.values(rule.declarations).every(
            (value) => value === `var(${mapping.cssVariable})`,
          ),
          `${mapping.roleId} exact UnoCSS rule must reference its canonical CSS variable`,
        )
      }
    } else {
      const entries = projection.themeEntries.filter((entry) => entry.roleId === mapping.roleId)

      assertInvariant(
        entries.length === 1,
        `${mapping.roleId} UnoCSS Theme mapping must generate exactly one entry`,
      )
      assertInvariant(
        entries[0]?.value === `var(${mapping.cssVariable})`,
        `${mapping.roleId} UnoCSS Theme entry must reference its canonical CSS variable`,
      )
    }
  }

  const projectedClasses = [
    ...projection.rules.map((rule) => rule.className),
    ...projection.mappings
      .filter((mapping) => mapping.generatorKind === 'theme-entry')
      .flatMap((mapping) => mapping.classes),
  ]
  const registeredClasses = projection.mappings.flatMap((mapping) => mapping.classes)

  assertInvariantEqual(
    [...projectedClasses].sort(compareCodePoints),
    [...registeredClasses].sort(compareCodePoints),
    'actual UnoCSS rules and Theme entries must project exactly the registered classes',
  )

  return exactRoleIdSet(
    projection.mappings.map((mapping) => mapping.roleId),
    result.activePublicRoles.map((record) => record.id),
    'UnoCSS role IDs',
  )
}

function validatePublicOutputCompleteness(result: TokenBuildResult): void {
  const activeIds = exactRoleIdSet(
    result.activePublicRoles.map((record) => record.id),
    PublicRoleRegistry.records.map((record) => record.id),
    'Active Public Role Registry IDs',
  )
  const registryByVariable = new Map<string, (typeof result.activePublicRoles)[number]>(
    result.activePublicRoles.map((record) => [record.cssVariable, record]),
  )
  const runtimeContractsByVariable = new Map<
    string,
    {
      roleId: string
      visibility: (typeof result.tokens)[number]['visibility']
    }
  >()

  for (const token of selectTokensForOutput(result, 'runtime-css')) {
    assertInvariant(
      token.cssVariable !== undefined,
      `${token.path} Runtime CSS token must declare a canonical variable`,
    )

    const contract = {
      roleId: token.role.name,
      visibility: token.visibility,
    }
    const existing = runtimeContractsByVariable.get(token.cssVariable)

    assertInvariant(
      existing === undefined || isDeepStrictEqual(existing, contract),
      `${token.cssVariable} Runtime CSS variable must bind exactly one role and visibility`,
    )
    runtimeContractsByVariable.set(token.cssVariable, contract)
  }

  const runtimeCss = formatRuntimeCss(result)
  const runtimeVariables = [...runtimeCss.matchAll(/^\s+(--ui-[a-z0-9-]+):/gmu)].map(
    (match) => match[1] ?? '',
  )
  const registry = themeRegistryDocument(result)
  const privateThemeBankVariables = new Set([
    ...registry.customBankVariables,
    ...registry.customBankVariables.map((variable) =>
      variable.replace(/^--ui-theme-bank-(?:dark|light)-/u, '--ui-theme-bank-effective-'),
    ),
  ])

  assertInvariantEqual(
    [...new Set(runtimeVariables)].sort(compareCodePoints),
    [...runtimeContractsByVariable.keys(), ...privateThemeBankVariables].sort(compareCodePoints),
    'Runtime CSS declarations must contain every and only registered Token or private Theme Bank variables',
  )

  const runtimeIds = exactRoleIdSet(
    runtimeVariables.flatMap((variable) => {
      if (privateThemeBankVariables.has(variable)) {
        return []
      }

      const contract = runtimeContractsByVariable.get(variable)

      assertInvariant(
        contract !== undefined,
        `${variable} Runtime CSS declaration must have a registered Token contract`,
      )

      if (contract.visibility !== 'public') {
        return []
      }

      const role = registryByVariable.get(variable)

      assertInvariant(
        role?.id === contract.roleId,
        `${variable} public Runtime CSS declaration must bind its own Public Role Registry record`,
      )
      return [role.id]
    }),
    activeIds,
    'Runtime CSS public role IDs',
    true,
  )
  const typeScriptEntries = [
    ...formatTokensTypeScript(result).matchAll(/^  '([^']+)': 'var\((--ui-[a-z0-9-]+)\)',$/gmu),
  ].map((match) => ({
    id: match[1] ?? '',
    variable: match[2] ?? '',
  }))

  for (const entry of typeScriptEntries) {
    assertInvariant(
      result.activePublicRoles.some(
        (record) => record.id === entry.id && record.cssVariable === entry.variable,
      ),
      `${entry.id} public TypeScript token must bind its own canonical CSS variable`,
    )
  }

  const typeScriptIds = exactRoleIdSet(
    typeScriptEntries.map((entry) => entry.id),
    activeIds,
    'public TypeScript role IDs',
  )
  const tokenNameIds = exactRoleIdSet(
    [...formatTokenNames(result).matchAll(/^  '([^']+)',$/gmu)].map((match) => match[1] ?? ''),
    activeIds,
    'public Token Name role IDs',
  )
  const unoCssIds = validateUnoCssProjection(result)
  const manifest = manifestDocument(result)
  const manifestTokens = manifest['tokens']

  assertInvariant(Array.isArray(manifestTokens), 'Manifest Token records must be an array')

  const materialProjectionsByRole = new Map(
    result.materialRoles.map((record) => [record.name, record.projections]),
  )
  const materialProjectionIds = manifestTokens.flatMap((entry) => {
    assertInvariant(isUnknownRecord(entry), 'Manifest Token records must be objects')

    const role = entry['role']

    assertInvariant(
      isUnknownRecord(role) && typeof role['name'] === 'string',
      'Manifest Token role metadata must be complete',
    )

    const expectedProjections = materialProjectionsByRole.get(role['name'])

    if (expectedProjections === undefined) {
      assertInvariant(
        entry['materialProjections'] === undefined,
        `${role['name']} non-Material Token must not carry Material projection metadata`,
      )
      return []
    }

    assertInvariantEqual(
      entry['materialProjections'],
      expectedProjections,
      `${role['name']} Material Token must preserve its complete projection metadata`,
    )
    return [role['name']]
  })

  exactRoleIdSet(
    materialProjectionIds,
    result.materialRoles.map((record) => record.name),
    'Manifest Material projection role IDs',
    true,
  )

  const manifestPublicIds = manifestTokens.flatMap((entry) => {
    if (!isUnknownRecord(entry) || entry['visibility'] !== 'public') {
      return []
    }

    const role = entry['role']

    assertInvariant(
      isUnknownRecord(role) &&
        typeof role['name'] === 'string' &&
        typeof role['category'] === 'string',
      'Manifest public Token role metadata must be complete',
    )

    const registered = result.activePublicRoles.find((record) => record.id === role['name'])

    assertInvariant(
      registered !== undefined &&
        entry['type'] === registered.tokenType &&
        entry['cssVariable'] === registered.cssVariable &&
        role['category'] === registered.category,
      `${role['name']} Manifest public Token metadata must match the Public Role Registry`,
    )
    return [role['name']]
  })
  const manifestIds = exactRoleIdSet(manifestPublicIds, activeIds, 'Manifest public role IDs', true)

  assertInvariantEqual(
    {
      A: activeIds,
      R: runtimeIds,
      T: typeScriptIds,
      N: tokenNameIds,
      U: unoCssIds,
      M: manifestIds,
    },
    {
      A: activeIds,
      R: activeIds,
      T: activeIds,
      N: activeIds,
      U: activeIds,
      M: activeIds,
    },
    'Public Output Completeness requires byte-equivalent sorted A = R = T = N = U = M sets',
  )
  assertInvariantEqual(
    manifest['activePublicRoles'],
    result.activePublicRoles,
    'Manifest Active Public Role records must remain exact',
  )
  assertInvariantEqual(
    manifest['unoCssMappings'],
    result.unoCssMappings,
    'Manifest UnoCSS mapping records must remain exact',
  )
  assertInvariantEqual(
    manifest['alphaContracts'],
    result.alphaContracts,
    'Manifest Alpha records must remain exact',
  )
  assertInvariantEqual(
    manifest['namedContrasts'],
    result.namedContrasts,
    'Manifest Named Contrast records must remain exact',
  )
}

function completeThemeSourceDocument(
  theme: TokenBuildResult['completeThemes'][number],
): Record<string, unknown> {
  return {
    schemaVersion: theme.schemaVersion,
    roleContractVersion: theme.roleContractVersion,
    id: theme.id,
    label: theme.label,
    planes: theme.planes,
  }
}

function completeThemeTokenResolver(result: TokenBuildResult): TokenResolver {
  return {
    records: result.tokens,
    resolveReference(reference, expectedType, context) {
      const targetPath = tokenPathFromReference(reference)
      const target = result.tokens.find((record) => record.path === targetPath)

      if (target === undefined) {
        throw new Error(`${context}: unknown token reference "${reference}".`)
      }

      if (target.type !== expectedType) {
        throw new Error(
          `${context}: reference "${reference}" has type "${target.type}", expected "${expectedType}".`,
        )
      }

      return target.resolvedValue
    },
  }
}

function mutableThemeRoleMap(
  document: Record<string, unknown>,
  mode: 'dark' | 'light',
  contrast: 'enhanced' | 'standard',
): Record<string, unknown> {
  const planes = document['planes']
  const modePlanes = isUnknownRecord(planes) ? planes[mode] : undefined
  const roleMap = isUnknownRecord(modePlanes) ? modePlanes[contrast] : undefined

  assertInvariant(isUnknownRecord(roleMap), `${mode}.${contrast} probe role map must exist`)
  return roleMap
}

function validateCompleteThemeContracts(result: TokenBuildResult): void {
  const resolver = completeThemeTokenResolver(result)
  const canonicalDocuments = result.completeThemes.map(completeThemeSourceDocument)
  const canonicalSources = result.completeThemes.map((theme) => theme.source)
  const validateDocuments = (
    documents: readonly Record<string, unknown>[],
    sources: readonly string[] = canonicalSources,
  ) =>
    validateCompleteBuiltInThemes({
      bundles: documents.map((document, index) => ({
        contents: stableJson(document),
        path: sources[index] ?? '<missing-complete-theme-source>',
      })),
      legacyThemes: result.themes,
      resolver,
    })

  assertInvariant(
    result.completeThemes.length === 3,
    'exactly three complete built-in target Themes must exist',
  )
  assertInvariant(
    result.completeThemes.reduce((count, theme) => count + theme.authoredColorValueCount, 0) ===
      108,
    'complete built-in target Themes must contain exactly 108 authored color values',
  )
  assertInvariant(
    result.completeThemes.reduce((count, theme) => count + theme.absoluteColorValueCount, 0) ===
      108 && result.completeThemes.every((theme) => theme.primitiveAliasValueCount === 0),
    'Package 4 built-in Theme cells must all be explicit absolute colors without aliases',
  )
  assertInvariantEqual(
    validateDocuments(canonicalDocuments),
    result.completeThemes,
    'complete built-in Theme validation must be deterministic and preserve authored values',
  )
  assertInvariantEqual(
    validateDocuments(structuredClone(canonicalDocuments)),
    result.completeThemes,
    'repeated complete built-in Theme validation must be byte-stable',
  )

  const manifest = manifestDocument(result)
  const registry = themeRegistryDocument(result)
  const expectedThemeMetadata = registry.builtInEntries.map((entry) => ({
    activationStatus: 'ACTIVE',
    registryKind: entry.registryKind,
    themeId: entry.themeId,
    label: entry.definition.label,
    source: entry.source,
    schemaVersion: entry.definition.schemaVersion,
    roleContractVersion: entry.definition.roleContractVersion,
    planes: entry.definition.planes,
    bank: {
      visibility: entry.bank.visibility,
      records: entry.bank.records.map((record) => ({
        colorMode: record.colorMode,
        contrast: record.contrast,
        publicRole: record.publicRole,
        sourceField: record.sourceField,
        authoredValue: record.authoredValue,
        bankVariable: record.bankVariable,
        publicBinding: record.publicBinding,
      })),
    },
  }))

  assertInvariantEqual(
    manifest['themes'],
    expectedThemeMetadata,
    'Manifest Theme records must exactly project active Built-in Registry and Bank metadata',
  )

  const manifestProjectionDrift = structuredClone(manifest)
  const driftedThemeRecords = manifestProjectionDrift['themes']

  assertInvariant(
    Array.isArray(driftedThemeRecords),
    'Manifest projection probe Theme records must exist',
  )
  manifestProjectionDrift['themes'] = driftedThemeRecords.slice(1)
  assertContractFailure(
    () => {
      assertInvariantEqual(
        manifestProjectionDrift['themes'],
        expectedThemeMetadata,
        'Manifest Theme records must exactly project active Built-in Registry and Bank metadata',
      )
    },
    /Manifest Theme records/u,
    'complete Theme Manifest projection drift must fail',
  )

  const activeRuntimeArtifacts = {
    'appearance-init.js': formatAppearanceInitScript(result),
    'critical-theme.css': formatCriticalThemeCss(result),
    'token-names.ts': formatTokenNames(result),
    'theme-registry.ts': formatThemeRegistryTypeScript(result),
    'tokens.css': formatRuntimeCss(result),
    'tokens.ts': formatTokensTypeScript(result),
    'unocss-theme.ts': formatUnoCssTheme(result),
  }

  for (const [file, contents] of Object.entries(activeRuntimeArtifacts)) {
    const mustOwnThemeBank = [
      'appearance-init.js',
      'critical-theme.css',
      'theme-registry.ts',
      'tokens.css',
    ].includes(file)

    assertInvariant(
      mustOwnThemeBank
        ? contents.includes('--ui-theme-bank-')
        : !contents.includes('--ui-theme-bank-'),
      `${file} Package 5 Theme Bank ownership must match its generated boundary`,
    )
    assertInvariant(
      ['appearance-init.js', 'critical-theme.css', 'tokens.css'].includes(file)
        ? contents.includes('data-theme-kind')
        : !contents.includes('data-theme-kind'),
      `${file} Package 5 Theme identity ownership must match its generated boundary`,
    )
  }

  const missingTheme = structuredClone(canonicalDocuments).slice(0, 2)

  assertContractFailure(
    () => validateDocuments(missingTheme, canonicalSources.slice(0, 2)),
    /source count/u,
    'a missing complete built-in Theme must fail',
  )

  const duplicateTheme = structuredClone(canonicalDocuments)
  duplicateTheme[1] = structuredClone(duplicateTheme[0] ?? {})

  assertContractFailure(
    () =>
      validateDocuments(duplicateTheme, [
        canonicalSources[0] ?? '',
        canonicalSources[0] ?? '',
        canonicalSources[2] ?? '',
      ]),
    /Theme IDs/u,
    'a duplicate complete built-in Theme identity must fail',
  )

  const missingPlane = structuredClone(canonicalDocuments)
  const missingPlanePlanes = missingPlane[0]?.['planes']

  assertInvariant(isUnknownRecord(missingPlanePlanes), 'missing-plane probe source must exist')
  delete missingPlanePlanes['dark']
  assertContractFailure(
    () => validateDocuments(missingPlane),
    /Invalid complete built-in Theme source/u,
    'a missing complete Theme plane must fail',
  )

  const missingRole = structuredClone(canonicalDocuments)
  delete mutableThemeRoleMap(missingRole[0] ?? {}, 'light', 'standard')['color.text.secondary']
  assertContractFailure(
    () => validateDocuments(missingRole),
    /public color role set/u,
    'a missing complete Theme role must fail',
  )

  const extraRole = structuredClone(canonicalDocuments)
  const extraRoleMap = mutableThemeRoleMap(extraRole[0] ?? {}, 'light', 'standard')
  const existingExtraProbeValue = extraRoleMap['color.action.primary']

  assertInvariant(
    typeof existingExtraProbeValue === 'string',
    'extra-role probe source value must exist',
  )
  extraRoleMap['color.unapproved.extra'] = existingExtraProbeValue
  assertContractFailure(
    () => validateDocuments(extraRole),
    /public color role set/u,
    'an extra complete Theme role must fail',
  )

  const computedColor = structuredClone(canonicalDocuments)
  mutableThemeRoleMap(computedColor[0] ?? {}, 'light', 'standard')['color.action.primary'] =
    'var(--unapproved-color)'
  assertContractFailure(
    () => validateDocuments(computedColor),
    /Invalid complete built-in Theme source/u,
    'computed or fallback-dependent complete Theme colors must fail',
  )

  const outOfGamutColor = structuredClone(canonicalDocuments)
  const outOfGamutRoleMap = mutableThemeRoleMap(outOfGamutColor[0] ?? {}, 'light', 'standard')
  const originalActionColor = outOfGamutRoleMap['color.action.primary']

  assertInvariant(
    typeof originalActionColor === 'string',
    'out-of-gamut probe source value must exist',
  )
  outOfGamutRoleMap['color.action.primary'] = originalActionColor.replace(/% [^ ]+ /u, '% 0.4 ')
  assertContractFailure(
    () => validateDocuments(outOfGamutColor),
    /Invalid complete built-in Theme source/u,
    'out-of-gamut complete Theme colors must fail without correction',
  )

  const invalidAlpha = structuredClone(canonicalDocuments)
  const invalidAlphaRoleMap = mutableThemeRoleMap(invalidAlpha[0] ?? {}, 'light', 'standard')
  const originalScrimColor = invalidAlphaRoleMap['color.scrim.viewport']

  assertInvariant(
    typeof originalScrimColor === 'string',
    'invalid-Alpha probe source value must exist',
  )
  invalidAlphaRoleMap['color.scrim.viewport'] = originalScrimColor.replace('0.56', '0.5')
  assertContractFailure(
    () => validateDocuments(invalidAlpha),
    /Alpha/u,
    'complete Theme Alpha contract drift must fail',
  )

  const invalidNamedContrast = structuredClone(canonicalDocuments)
  const invalidNamedContrastRoleMap = mutableThemeRoleMap(
    invalidNamedContrast[0] ?? {},
    'light',
    'standard',
  )

  invalidNamedContrastRoleMap['color.text.primary'] =
    invalidNamedContrastRoleMap['color.surface.page']
  assertContractFailure(
    () => validateDocuments(invalidNamedContrast),
    /contrast/u,
    'complete Theme Named Contrast violations must fail',
  )

  const invalidEnhancedIntent = structuredClone(canonicalDocuments)
  const standardIntentRoleMap = mutableThemeRoleMap(
    invalidEnhancedIntent[0] ?? {},
    'light',
    'standard',
  )
  const enhancedIntentRoleMap = mutableThemeRoleMap(
    invalidEnhancedIntent[0] ?? {},
    'light',
    'enhanced',
  )

  Object.assign(enhancedIntentRoleMap, structuredClone(standardIntentRoleMap))
  assertContractFailure(
    () => validateDocuments(invalidEnhancedIntent),
    /Enhanced plane must not duplicate Standard/u,
    'complete Theme Enhanced-plane intent violations must fail',
  )

  const missingPerRoleIdentity = structuredClone(canonicalDocuments)
  const neutralIdentityRoleMap = mutableThemeRoleMap(
    missingPerRoleIdentity[0] ?? {},
    'light',
    'standard',
  )
  const oceanIdentityRoleMap = mutableThemeRoleMap(
    missingPerRoleIdentity[1] ?? {},
    'light',
    'standard',
  )

  oceanIdentityRoleMap['color.scrim.viewport'] = neutralIdentityRoleMap['color.scrim.viewport']
  assertContractFailure(
    () => validateDocuments(missingPerRoleIdentity),
    /Theme identity must remain present/u,
    'complete Theme identity must remain present through every public color role',
  )

  for (const forbiddenField of ['fallback', 'inheritance', 'palette', 'seed']) {
    const forbiddenAuthority = structuredClone(canonicalDocuments)
    const firstDocument = forbiddenAuthority[0]

    assertInvariant(firstDocument !== undefined, 'forbidden-authority probe source must exist')
    firstDocument[forbiddenField] = {}
    assertContractFailure(
      () => validateDocuments(forbiddenAuthority),
      /Invalid complete built-in Theme source/u,
      `complete Themes must reject ${forbiddenField} authority`,
    )
  }

  const duplicateKeyContents = stableJson(canonicalDocuments[0]).replace(
    '  "id": "neutral",',
    '  "id": "neutral",\n  "id": "neutral",',
  )

  assertContractFailure(
    () =>
      validateCompleteBuiltInThemes({
        bundles: [
          {
            contents: duplicateKeyContents,
            path: canonicalSources[0] ?? '',
          },
          ...canonicalDocuments.slice(1).map((document, index) => ({
            contents: stableJson(document),
            path: canonicalSources[index + 1] ?? '',
          })),
        ],
        legacyThemes: result.themes,
        resolver,
      }),
    /Duplicate JSON object key/u,
    'duplicate complete Theme fields must fail before object validation',
  )
}

function validateGeneratorContracts(result: TokenBuildResult): void {
  const publicRoleRecords = validatePublicRoleRegistry(PublicRoleRegistry)
  const alphaContracts = validateAlphaContractRegistry(
    ActiveAlphaContractRegistry,
    publicRoleRecords,
  )
  const namedContrasts = validateNamedContrastRegistry(
    ActiveNamedContrastRegistry,
    publicRoleRecords,
  )

  assertInvariantEqual(
    result.activePublicRoles,
    publicRoleRecords,
    'Token preprocessing must carry the exact Public Role Registry',
  )
  assertInvariantEqual(
    result.alphaContracts,
    alphaContracts,
    'Token preprocessing must carry the exact Alpha Registry',
  )
  assertInvariantEqual(
    result.unoCssMappings,
    unoCssMappingRecords(publicRoleRecords),
    'Token preprocessing must carry exactly 27 UnoCSS mapping records',
  )
  assertInvariantEqual(
    result.namedContrasts.map((record) =>
      Object.fromEntries(
        Object.entries(record).filter(([property]) => property !== 'minimumRatios'),
      ),
    ),
    namedContrasts,
    'Token preprocessing must carry the exact 14-record Named Contrast Registry',
  )

  validateCompleteThemeContracts(result)
  validateActivePublicRoleTokens(result.tokens, publicRoleRecords)
  validatePublicOutputCompleteness(result)
  validateManifestGovernance(result)
  validateManifestCompression(result)

  const colorValue = {
    colorSpace: 'oklch',
    components: [0.5, 0.1, 250],
  }
  const visibilityRecords = validationRecords('semantic/visibility.tokens.json', {
    color: {
      $extensions: {
        'org.pavp': {
          visibility: 'ui-internal',
        },
      },
      inherited: {
        $type: 'color',
        $value: colorValue,
      },
      private: {
        $extensions: {
          'org.pavp': {
            visibility: 'build-only',
          },
        },
        inherited: {
          $type: 'color',
          $value: colorValue,
        },
      },
      'token-level': {
        $type: 'color',
        $value: colorValue,
        $extensions: {
          'org.pavp': {
            visibility: 'build-only',
          },
        },
      },
    },
  })

  assertInvariantEqual(
    visibilityRecords.map((token) => [token.path, token.visibility]),
    [
      ['color.inherited', 'ui-internal'],
      ['color.private.inherited', 'build-only'],
      ['color.token-level', 'build-only'],
    ],
    'visibility must resolve from token metadata, then the nearest parent group, then the tier default',
  )

  for (const token of result.tokens) {
    if (token.tier === 'primitive' || token.tier === 'density') {
      assertInvariant(
        token.visibility === 'build-only',
        `${token.path} must remain build-only under its enforced tier`,
      )
    }

    if (token.tier === 'semantic.material') {
      assertInvariant(
        token.visibility !== 'public',
        `${token.path} must not widen the semantic.material tier to public`,
      )
    }

    assertInvariant(
      token.tier !== 'component',
      `${token.path} must not enter the unsupported component tier`,
    )
  }

  const futureMaterial = validationRecords('semantic/material.tokens.json', {
    material: {
      future: {
        background: {
          $type: 'color',
          $value: colorValue,
        },
      },
    },
  })[0]

  assertInvariant(
    futureMaterial?.tier === 'semantic.material' &&
      futureMaterial.visibility === 'ui-internal' &&
      futureMaterial.cssVariable === '--ui-material-future-background',
    'future semantic.material tokens must default to ui-internal and use --ui-material-*',
  )

  assertContractFailure(
    () =>
      validationRecords('primitive/invalid.tokens.json', {
        color: {
          invalid: {
            $type: 'color',
            $value: colorValue,
            $extensions: {
              'org.pavp': {
                visibility: 'public',
              },
            },
          },
        },
      }),
    /illegally widens/u,
    'primitive visibility widening to public must fail',
  )
  assertContractFailure(
    () =>
      validationRecords('semantic/invalid.tokens.json', {
        color: {
          $extensions: {
            'org.pavp': {
              visibility: 'ui-internal',
            },
          },
          invalid: {
            $type: 'color',
            $value: colorValue,
            $extensions: {
              'org.pavp': {
                visibility: 'public',
              },
            },
          },
        },
      }),
    /illegally widens/u,
    'child visibility widening beyond its nearest enforced group must fail',
  )
  assertContractFailure(
    () =>
      validationRecords('unknown/source.tokens.json', {
        color: {
          invalid: {
            $type: 'color',
            $value: colorValue,
          },
        },
      }),
    /unknown token tier/u,
    'unknown token tiers must fail',
  )
  assertContractFailure(
    () =>
      validationRecords('component/button.tokens.json', {
        button: {
          invalid: {
            $type: 'color',
            $value: colorValue,
          },
        },
      }),
    /component token sources are unsupported/u,
    'component token sources must remain unsupported before admission',
  )
  assertContractFailure(
    () =>
      validationRecords('semantic/invalid.tokens.json', {
        color: {
          invalid: {
            $type: 'color',
            $value: colorValue,
            $extensions: {
              'org.pavp': {
                visibility: 'public',
                unknown: true,
              },
            },
          },
        },
      }),
    /Invalid token source/u,
    'unknown org.pavp metadata must fail',
  )
  assertContractFailure(
    () =>
      validationRecords('semantic/invalid.tokens.json', {
        color: {
          invalid: {
            $type: 'color',
            $value: colorValue,
            $extensions: {
              'org.pavp': {
                visibility: 'external',
              },
            },
          },
        },
      }),
    /Invalid token source/u,
    'malformed visibility metadata must fail',
  )
  assertContractFailure(
    () =>
      validationRecords('semantic/invalid.tokens.json', {
        color: {
          invalid: {
            $type: 'color',
            $value: colorValue,
            $extensions: {
              'org.pavp': {},
            },
          },
        },
      }),
    /Invalid token source/u,
    'empty unresolved org.pavp metadata must fail',
  )
  assertContractFailure(
    () =>
      validationRecords(
        'semantic/invalid.tokens.json',
        '{"color":{"invalid":{"$type":"color","$value":{"colorSpace":"oklch","components":[0.5,0.1,250]},"$extensions":{"org.pavp":{"visibility":"public","visibility":"build-only"}}}}}',
      ),
    /Duplicate JSON object key/u,
    'duplicate metadata must fail before validation',
  )

  const matrixTokens = validationRecords('semantic/output.tokens.json', {
    color: {
      alias: {
        $type: 'color',
        $value: '{color.public}',
      },
      build: {
        $type: 'color',
        $value: colorValue,
        $extensions: {
          'org.pavp': {
            visibility: 'build-only',
          },
        },
      },
      internal: {
        $type: 'color',
        $value: colorValue,
        $extensions: {
          'org.pavp': {
            visibility: 'ui-internal',
          },
        },
      },
      public: {
        $type: 'color',
        $value: colorValue,
      },
    },
  })
  const matrixResult = validationResult(result, matrixTokens)

  assertInvariantEqual(
    selectTokensForOutput(matrixResult, 'runtime-css').map((token) => token.visibility),
    ['public', 'ui-internal', 'public'],
    'Runtime CSS must select public and ui-internal tokens only',
  )
  assertInvariantEqual(
    selectTokensForOutput(matrixResult, 'public-typescript').map((token) => token.visibility),
    ['public', 'public'],
    'public TypeScript must select public tokens only',
  )
  assertInvariantEqual(
    selectTokensForOutput(matrixResult, 'public-token-names').map((token) => token.visibility),
    ['public', 'public'],
    'public token names must select public tokens only',
  )
  assertInvariantEqual(
    selectTokensForOutput(matrixResult, 'unocss').map((token) => token.visibility),
    ['public', 'public'],
    'UnoCSS must select public tokens only',
  )
  assertInvariant(
    selectTokensForOutput(matrixResult, 'manifest').length === matrixTokens.length,
    'Manifest must select public, ui-internal, and build-only tokens',
  )

  const matrixCss = formatRuntimeCss(matrixResult)
  const matrixTypeScript = formatTokensTypeScript(matrixResult)
  const matrixNames = formatTokenNames(matrixResult)

  assertInvariant(
    matrixCss.includes('--ui-color-internal:') &&
      !matrixCss.includes('--ui-color-build:') &&
      matrixCss.includes('--ui-color-alias: var(--ui-color-public);'),
    'Runtime CSS filtering must retain internal tokens, exclude build-only tokens, and preserve runtime aliases',
  )
  assertInvariant(
    !matrixTypeScript.includes('color.internal') &&
      !matrixTypeScript.includes('color.build') &&
      !matrixNames.includes('color.internal') &&
      !matrixNames.includes('color.build'),
    'ui-internal and build-only tokens must not enter public TypeScript or names',
  )

  const matrixManifest = manifestDocument(matrixResult)
  const matrixManifestTokens = matrixManifest['tokens']

  assertInvariant(
    Array.isArray(matrixManifestTokens) && matrixManifestTokens.length === matrixTokens.length,
    'Manifest must contain every visibility class',
  )

  const manifestTokenNames = matrixManifestTokens.map((entry) =>
    isUnknownRecord(entry) && typeof entry['name'] === 'string' ? entry['name'] : '',
  )

  assertInvariantEqual(
    manifestTokenNames,
    [...manifestTokenNames].sort(compareCodePoints),
    'Manifest token entries must use deterministic code-point ordering',
  )

  for (const entry of matrixManifestTokens) {
    assertInvariant(
      isUnknownRecord(entry) &&
        typeof entry['tier'] === 'string' &&
        typeof entry['visibility'] === 'string' &&
        typeof entry['source'] === 'string' &&
        isUnknownRecord(entry['conditions']) &&
        isUnknownRecord(entry['role']) &&
        'resolvedValue' in entry,
      'every Manifest token must contain tier, visibility, source, conditions, role, and resolvedValue metadata',
    )

    const runtimeExposed = entry['visibility'] === 'public' || entry['visibility'] === 'ui-internal'
    assertInvariant(
      'cssVariable' in entry === runtimeExposed,
      'Manifest cssVariable must exist only for Runtime CSS tokens',
    )
  }

  assertInvariantEqual(
    manifestDocument(matrixResult),
    matrixManifest,
    'Manifest document projection must be deterministic',
  )

  const selectorRecords = createTokenResolver([
    ...parseTokenSourceRecords(
      'semantic/selectors.tokens.json',
      JSON.stringify({
        color: {
          selector: {
            base: {
              $type: 'color',
              $value: colorValue,
              $extensions: {
                'org.pavp': {
                  role: 'color.selector.value',
                },
              },
            },
            compound: {
              $type: 'color',
              $value: colorValue,
              $extensions: {
                'org.pavp': {
                  role: 'color.selector.value',
                  conditions: {
                    theme: 'ocean',
                    colorMode: 'dark',
                    contrast: 'enhanced',
                  },
                  compound: 'ocean-dark-enhanced',
                },
              },
            },
            contrast: {
              $type: 'color',
              $value: colorValue,
              $extensions: {
                'org.pavp': {
                  role: 'color.selector.value',
                  conditions: {
                    contrast: 'enhanced',
                  },
                },
              },
            },
            density: {
              $type: 'color',
              $value: colorValue,
              $extensions: {
                'org.pavp': {
                  role: 'color.selector.value',
                  conditions: {
                    density: 'compact',
                  },
                },
              },
            },
            mode: {
              $type: 'color',
              $value: colorValue,
              $extensions: {
                'org.pavp': {
                  role: 'color.selector.value',
                  conditions: {
                    colorMode: 'dark',
                  },
                },
              },
            },
            theme: {
              $type: 'color',
              $value: colorValue,
              $extensions: {
                'org.pavp': {
                  role: 'color.selector.value',
                  conditions: {
                    theme: 'ocean',
                  },
                },
              },
            },
          },
        },
      }),
    ),
    ...parseTokenSourceRecords(
      'semantic/material.tokens.json',
      JSON.stringify({
        material: {
          selector: {
            reduced: {
              $type: 'color',
              $value: colorValue,
              $extensions: {
                'org.pavp': {
                  role: 'material.selector.value',
                  conditions: {
                    material: 'reduced',
                  },
                },
              },
            },
          },
        },
      }),
    ),
  ]).records
  const selectorResult = validationResult(result, selectorRecords)
  const selectorCss = formatRuntimeCss(selectorResult)
  const selectorOrder = [
    ':root',
    "html[data-theme='ocean']",
    "html[data-color-mode='dark']",
    "html[data-contrast='enhanced']",
    "html[data-theme='ocean'][data-color-mode='dark'][data-contrast='enhanced']",
    "html[data-density='compact']",
    "html[data-material='reduced']",
  ]
  let previousSelectorIndex = -1

  for (const selector of selectorOrder) {
    const selectorIndex = selectorCss.indexOf(`  ${selector} {`)

    assertInvariant(
      selectorIndex > previousSelectorIndex,
      'conditional selectors must follow base, theme, mode, contrast, compound, density, and material order',
    )
    previousSelectorIndex = selectorIndex
  }

  const compoundSelectorLines = selectorCss
    .split('\n')
    .filter((line) => line.includes('data-theme') && line.includes('data-color-mode'))

  assertInvariant(
    compoundSelectorLines.length === 1 &&
      !selectorCss.includes("[data-density='compact'][") &&
      !selectorCss.includes("[data-material='reduced']["),
    'selector output must remain factorized and prohibit density or material compounds',
  )
  assertInvariantEqual(
    selectorResult.compounds,
    [
      {
        conditions: {
          theme: 'ocean',
          colorMode: 'dark',
          contrast: 'enhanced',
        },
        name: 'ocean-dark-enhanced',
      },
    ],
    'named color-plane compounds must be recorded deterministically',
  )

  assertContractFailure(
    () =>
      validationRecords('semantic/invalid-compound.tokens.json', {
        color: {
          invalid: {
            $type: 'color',
            $value: colorValue,
            $extensions: {
              'org.pavp': {
                conditions: {
                  theme: 'ocean',
                  colorMode: 'dark',
                  contrast: 'enhanced',
                  density: 'compact',
                },
                compound: 'invalid-density-compound',
              },
            },
          },
        },
      }),
    /only the bounded Theme × Mode × Contrast/u,
    'density and material must be prohibited from named compounds',
  )

  const compoundCases = [
    ['neutral', 'light', 'standard'],
    ['neutral', 'light', 'enhanced'],
    ['neutral', 'dark', 'standard'],
    ['neutral', 'dark', 'enhanced'],
    ['ocean', 'light', 'standard'],
    ['ocean', 'light', 'enhanced'],
    ['ocean', 'dark', 'standard'],
    ['ocean', 'dark', 'enhanced'],
    ['warm', 'light', 'standard'],
  ] as const
  const compoundSource = Object.fromEntries(
    compoundCases.map(([theme, colorMode, contrast], index) => [
      `case-${String(index)}`,
      {
        $type: 'color',
        $value: colorValue,
        $extensions: {
          'org.pavp': {
            conditions: {
              theme,
              colorMode,
              contrast,
            },
            compound: `compound-${String(index)}`,
          },
        },
      },
    ]),
  )
  const overBudgetRecords = validationRecords('semantic/compound-budget.tokens.json', {
    color: {
      budget: compoundSource,
    },
  })

  assertContractFailure(
    () => validateTokenRecords(overBudgetRecords, new Set(result.themes.map((theme) => theme.id))),
    /Color compound budget exceeded/u,
    'the strict finite color compound budget must fail generation when exceeded',
  )

  const duplicateRoleRecords = validationRecords('semantic/duplicate-role.tokens.json', {
    color: {
      one: {
        $type: 'color',
        $value: colorValue,
        $extensions: {
          'org.pavp': {
            role: 'color.duplicate.role',
          },
        },
      },
      two: {
        $type: 'color',
        $value: colorValue,
        $extensions: {
          'org.pavp': {
            role: 'color.duplicate.role',
          },
        },
      },
    },
  })

  assertContractFailure(
    () =>
      validateTokenRecords(duplicateRoleRecords, new Set(result.themes.map((theme) => theme.id))),
    /ambiguous role conditions/u,
    'ambiguous duplicate role conditions must fail generation',
  )

  const publicTypeScript = formatTokensTypeScript(result)
  const publicNames = formatTokenNames(result)
  const publicUnoCss = formatUnoCssTheme(result)

  assertInvariant(
    !publicTypeScript.includes('material.') &&
      !publicTypeScript.includes('--ui-material-') &&
      !publicNames.includes('material.') &&
      !publicUnoCss.includes('material.') &&
      !publicUnoCss.includes('--ui-material-') &&
      !publicTypeScript.includes('material-support') &&
      !publicNames.includes('material-support') &&
      !publicUnoCss.includes('material-support'),
    'ui-internal material and support tokens must not leak into public TypeScript, names, or UnoCSS',
  )

  const themeIds = result.themes.map((theme) => theme.id)
  const incompleteMaterialTokens = result.tokens.filter(
    (token) =>
      !(token.role.name === 'material.chrome.background' && token.conditions.material === 'solid'),
  )

  assertContractFailure(
    () =>
      validateContrastAndMaterialContracts(
        incompleteMaterialTokens,
        themeIds,
        ActiveNamedContrastRegistry.records,
      ),
    /projection contract/u,
    'incomplete adaptive, reduced, or solid material projections must fail generation',
  )
}

function validateAppearanceContracts(result: TokenBuildResult): void {
  const defaultPreference = explicitThemePreferenceSchema.safeParse({
    schemaVersion: 3,
    appearance: ProductPreferenceDefault,
  })

  assertInvariant(
    defaultPreference.success,
    'the canonical Product Preference Default must produce a valid Explicit Theme Preference',
  )
  assertInvariantEqual(
    ProductPreferenceDefault,
    {
      colorMode: 'system',
      theme: {
        registryKind: 'built-in',
        themeId: 'neutral',
      },
      contrast: 'standard',
      material: 'adaptive',
      density: {
        preset: 'comfortable',
        scale: 1,
      },
      fontScale: 1,
      motion: 'full',
    },
    'the canonical Product Preference Default axes must remain fixed',
  )
  assertInvariant(
    Object.isFrozen(ProductPreferenceDefault) &&
      Object.isFrozen(ProductPreferenceDefault.theme) &&
      Object.isFrozen(ProductPreferenceDefault.density),
    'the Product Preference Default must be deeply frozen at every object boundary',
  )
  assertInvariant(
    !('schemaVersion' in ProductPreferenceDefault),
    'the Product Preference Default must remain appearance-only',
  )

  const registry = themeRegistryDocument(result)

  assertInvariantEqual(
    registry.builtInRegistryOrder,
    ['neutral', 'ocean', 'warm'],
    'the Built-in Theme Registry order must remain canonical',
  )
  assertInvariant(
    registry.builtInEntries.length === 3 &&
      registry.builtInEntries.every((entry) => entry.bank.records.length === 36),
    'the generated Built-in Theme Registry must contain three complete 36-cell Banks',
  )
  assertInvariant(
    registry.customBankVariables.length === 36 && new Set(registry.customBankVariables).size === 36,
    'the generated Custom Theme Bank allowlist must contain exactly 36 fixed variables',
  )
  assertInvariantEqual(
    formatThemeRegistryTypeScript(result),
    formatThemeRegistryTypeScript(result),
    'the generated private Theme Registry must be deterministic',
  )

  assertInvariantEqual(
    [
      resolveColorMode({
        prefersDark: false,
        storedColorMode: 'light',
      }),
      resolveColorMode({
        prefersDark: true,
        storedColorMode: 'dark',
      }),
      resolveColorMode({
        prefersDark: false,
        storedColorMode: 'system',
      }),
      resolveColorMode({
        prefersDark: true,
        storedColorMode: 'system',
      }),
    ],
    ['light', 'dark', 'light', 'dark'],
    'the color-mode resolver must use only stored mode and explicit prefersDark',
  )
  assertInvariantEqual(
    [
      resolveMaterial({
        backdropFilterSupported: true,
        forcedColorsActive: true,
        reducedTransparencyRequested: false,
        storedMaterial: 'adaptive',
      }),
      resolveMaterial({
        backdropFilterSupported: true,
        forcedColorsActive: false,
        reducedTransparencyRequested: true,
        storedMaterial: 'solid',
      }),
      resolveMaterial({
        backdropFilterSupported: false,
        forcedColorsActive: false,
        reducedTransparencyRequested: false,
        storedMaterial: 'reduced',
      }),
      resolveMaterial({
        backdropFilterSupported: true,
        forcedColorsActive: false,
        reducedTransparencyRequested: true,
        storedMaterial: 'adaptive',
      }),
      resolveMaterial({
        backdropFilterSupported: false,
        forcedColorsActive: false,
        reducedTransparencyRequested: false,
        storedMaterial: 'adaptive',
      }),
      resolveMaterial({
        backdropFilterSupported: true,
        forcedColorsActive: false,
        reducedTransparencyRequested: false,
        storedMaterial: 'adaptive',
      }),
    ],
    ['solid', 'solid', 'reduced', 'reduced', 'solid', 'adaptive'],
    'the material resolver precedence must remain canonical',
  )
}

interface AppearanceInitExecutionOptions {
  backdropFilterSupported?: boolean
  cssColorSupported?: boolean
  fontScaleWriteFailure?: boolean
  forcedColorsActive?: boolean
  invokeRestorationOperation?: boolean
  prefersDark?: boolean
  rawPreference?: string | null
  reducedTransparencyRequested?: boolean
  storageKey?: string | null
  storageReadFailure?: boolean
}

interface AppearanceInitExecutionResult {
  attributes: Record<string, string>
  customProperties: Record<string, string>
  handoff?: unknown
  hasRestorationOperation: boolean
  networkRequests: number
  requestedStorageKey?: string
  storageWrites: number
}

const firstPaintSafetyFontScale = String(ProductPreferenceDefault.fontScale)

function executeAppearanceInit(
  script: string,
  {
    backdropFilterSupported = true,
    cssColorSupported = true,
    fontScaleWriteFailure = false,
    forcedColorsActive = false,
    invokeRestorationOperation = false,
    prefersDark = false,
    rawPreference = null,
    reducedTransparencyRequested = false,
    storageKey = 'runtime-supplied-preference-key',
    storageReadFailure = false,
  }: AppearanceInitExecutionOptions = {},
): AppearanceInitExecutionResult {
  const attributes = new Map<string, string>([
    ['data-color-mode', 'light'],
    ['data-theme-kind', 'built-in'],
    ['data-theme', 'neutral'],
    ['data-contrast', 'standard'],
    ['data-material', 'solid'],
    ['data-density', 'comfortable'],
    ['data-motion', 'full'],
  ])
  const customProperties = new Map<string, string>([['--ui-font-scale', '1']])
  const currentScript =
    storageKey === null
      ? null
      : ({
          getAttribute(name: string): string | null {
            return name === 'data-preference-storage-key' ? storageKey : null
          },
        } as Record<string, unknown>)
  let requestedStorageKey: string | undefined
  let storageWrites = 0
  let networkRequests = 0
  const rejectStorageWrite = (): never => {
    storageWrites += 1
    throw new Error('Generated first-paint script attempted a storage write.')
  }
  const rejectNetwork = (): never => {
    networkRequests += 1
    throw new Error('Generated first-paint script attempted a network request.')
  }

  runInNewContext(script, {
    CSS: {
      supports(property: string): boolean {
        return property === 'color' ? cssColorSupported : backdropFilterSupported
      },
    },
    document: {
      currentScript,
      documentElement: {
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
        style: {
          getPropertyPriority(): string {
            return ''
          },
          getPropertyValue(name: string): string {
            return customProperties.get(name) ?? ''
          },
          removeProperty(name: string): string {
            const previous = customProperties.get(name) ?? ''
            customProperties.delete(name)
            return previous
          },
          setProperty(name: string, value: string): void {
            if (
              fontScaleWriteFailure &&
              name === '--ui-font-scale' &&
              value !== firstPaintSafetyFontScale
            ) {
              throw new Error('Synthetic font-scale write failure.')
            }

            customProperties.set(name, value)
          },
        },
      },
    },
    fetch: rejectNetwork,
    localStorage: {
      clear: rejectStorageWrite,
      getItem(key: string): string | null {
        requestedStorageKey = key

        if (storageReadFailure) {
          throw new Error('Storage unavailable.')
        }

        return rawPreference
      },
      removeItem: rejectStorageWrite,
      setItem: rejectStorageWrite,
    },
    matchMedia(query: string): { matches: boolean } {
      return {
        matches:
          (query === '(forced-colors: active)' && forcedColorsActive) ||
          (query === '(prefers-color-scheme: dark)' && prefersDark) ||
          (query === '(prefers-reduced-transparency: reduce)' && reducedTransparencyRequested),
      }
    },
    WebSocket: rejectNetwork,
    XMLHttpRequest: rejectNetwork,
  })

  const restorationOperation =
    currentScript === null ? undefined : currentScript['__pavpRestoreAppearanceSafety']

  if (invokeRestorationOperation && typeof restorationOperation === 'function') {
    ;(restorationOperation as () => void)()
  }

  const handoff = currentScript === null ? undefined : currentScript['__pavpAppearanceHandoff']
  const normalizedHandoff =
    handoff === undefined ? undefined : (JSON.parse(JSON.stringify(handoff)) as unknown)

  return {
    attributes: Object.fromEntries(attributes),
    customProperties: Object.fromEntries(customProperties),
    ...(normalizedHandoff === undefined ? {} : { handoff: normalizedHandoff }),
    hasRestorationOperation: typeof restorationOperation === 'function',
    networkRequests,
    ...(requestedStorageKey === undefined ? {} : { requestedStorageKey }),
    storageWrites,
  }
}

function executeAppearanceMigration(script: string, input: unknown): unknown {
  const marker = '  var currentScript = document.currentScript'
  const instrumented = script.replace(
    marker,
    `  globalThis.__pavpMigrationProbe = migrateToExplicitThemePreference\n\n${marker}`,
  )

  assertInvariant(
    instrumented !== script && instrumented.indexOf(marker) === instrumented.lastIndexOf(marker),
    'appearance-init.js migration probe injection point must remain exact',
  )

  const context: Record<string, unknown> = {
    document: {
      currentScript: null,
      documentElement: null,
    },
  }

  runInNewContext(instrumented, context)
  const migration = context['__pavpMigrationProbe']

  assertInvariant(
    typeof migration === 'function',
    'appearance-init.js must retain one private migration classifier',
  )

  return JSON.parse(JSON.stringify((migration as (value: unknown) => unknown)(input))) as unknown
}

function validateFirstPaintContracts(result: TokenBuildResult): void {
  const registry = themeRegistryDocument(result)
  const criticalTheme = formatCriticalThemeCss(result)
  const runtimeCss = formatRuntimeCss(result)
  const appearanceInit = formatAppearanceInitScript(result)
  const canonicalAttributes = new Set([
    'data-color-mode',
    'data-theme-kind',
    'data-theme',
    'data-contrast',
    'data-material',
    'data-density',
    'data-motion',
  ])
  const safetyAttributes = {
    'data-color-mode': 'light',
    'data-theme-kind': 'built-in',
    'data-theme': 'neutral',
    'data-contrast': 'standard',
    'data-material': 'solid',
    'data-density': 'comfortable',
    'data-motion': 'full',
  }
  const safetyCustomProperties = {
    '--ui-font-scale': firstPaintSafetyFontScale,
  }

  for (const themeId of registry.builtInRegistryOrder) {
    const selector = `html[data-theme-kind='built-in'][data-theme='${themeId}']`

    assertInvariant(
      criticalTheme.includes(selector) && runtimeCss.includes(selector),
      `${themeId}: critical and runtime CSS must both install the complete Built-in Theme Bank`,
    )
  }

  for (const bankVariable of registry.customBankVariables) {
    assertInvariant(
      criticalTheme.includes(bankVariable) &&
        runtimeCss.includes(bankVariable) &&
        appearanceInit.includes(bankVariable),
      `${bankVariable}: Theme Bank variable must remain generator-owned across both CSS artifacts and First Paint`,
    )
  }

  assertInvariant(
    criticalTheme.includes('--ui-font-scale: 1;') &&
      criticalTheme.includes('font-size: calc(100% * var(--ui-font-scale));') &&
      criticalTheme.includes('@media (forced-colors: active)'),
    'critical-theme.css must provide the complete generated safety baseline',
  )
  assertInvariantEqual(
    formatCriticalThemeCss(result),
    criticalTheme,
    'critical-theme.css generation must be deterministic',
  )
  assertInvariantEqual(
    formatAppearanceInitScript(result),
    appearanceInit,
    'appearance-init.js generation must be deterministic',
  )
  assertInvariant(
    !/\b(?:import|export)\b/u.test(appearanceInit) &&
      !/\b(?:async|await|fetch|XMLHttpRequest|WebSocket)\b/u.test(appearanceInit) &&
      !/\.(?:setItem|removeItem|clear)\s*\(/u.test(appearanceInit) &&
      !appearanceInit.includes('pinia') &&
      !appearanceInit.includes('pavp:web:user-preference') &&
      !appearanceInit.includes('pavp:web:custom-theme-registry') &&
      appearanceInit.includes('document.currentScript') &&
      appearanceInit.includes("getAttribute('data-preference-storage-key')"),
    'appearance-init.js must remain synchronous, classic, network-free, storage-read-only, application-key-agnostic, and module-free',
  )
  assertInvariantEqual(
    manifestDocument(result)['firstPaint'],
    [
      {
        applicationKeyAgnostic: true,
        safetyBaseline: preInitializationSafetyBaseline,
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
    ],
    'Manifest first-paint metadata must equal the frozen Package 5 contract',
  )

  const builtInPreference = explicitThemePreferenceSchema.parse({
    schemaVersion: 3,
    appearance: {
      ...ProductPreferenceDefault,
      colorMode: 'system',
      theme: {
        registryKind: 'built-in',
        themeId: 'ocean',
      },
      contrast: 'enhanced',
      material: 'adaptive',
      density: {
        preset: 'spacious',
        scale: 1.1,
      },
      fontScale: 1.2,
      motion: 'reduced',
    },
  })
  const builtInExecution = executeAppearanceInit(appearanceInit, {
    prefersDark: true,
    rawPreference: JSON.stringify(builtInPreference),
  })

  assertInvariantEqual(
    builtInExecution,
    {
      attributes: {
        'data-color-mode': 'dark',
        'data-theme-kind': 'built-in',
        'data-theme': 'ocean',
        'data-contrast': 'enhanced',
        'data-material': 'adaptive',
        'data-density': 'spacious',
        'data-motion': 'reduced',
      },
      customProperties: {
        '--ui-font-scale': '1.2',
      },
      hasRestorationOperation: true,
      networkRequests: 0,
      requestedStorageKey: 'runtime-supplied-preference-key',
      storageWrites: 0,
    },
    'appearance-init.js must resolve and atomically apply every Built-in appearance axis',
  )
  assertInvariant(
    Object.keys(builtInExecution.attributes).every((attribute) =>
      canonicalAttributes.has(attribute),
    ),
    'appearance-init.js must set only the seven Appearance-owned attributes',
  )

  for (const fontScale of fontScaleValues) {
    const preference = explicitThemePreferenceSchema.parse({
      schemaVersion: 3,
      appearance: {
        ...ProductPreferenceDefault,
        fontScale,
      },
    })
    const execution = executeAppearanceInit(appearanceInit, {
      rawPreference: JSON.stringify(preference),
    })

    assertInvariant(
      execution.customProperties['--ui-font-scale'] === String(fontScale),
      `appearance-init.js must apply validated fontScale=${String(fontScale)}`,
    )
  }

  const customPreference = explicitThemePreferenceSchema.parse({
    schemaVersion: 3,
    appearance: {
      ...ProductPreferenceDefault,
      theme: {
        registryKind: 'custom',
        themeId: 'Customer Theme Ω',
      },
    },
  })
  const customExecution = executeAppearanceInit(appearanceInit, {
    rawPreference: JSON.stringify(customPreference),
  })

  assertInvariantEqual(
    customExecution,
    {
      attributes: safetyAttributes,
      customProperties: safetyCustomProperties,
      handoff: {
        restoration: 'custom-theme-reference',
      },
      hasRestorationOperation: true,
      networkRequests: 0,
      requestedStorageKey: 'runtime-supplied-preference-key',
      storageWrites: 0,
    },
    'a valid Custom reference must retain safety and expose only the private restoration signal',
  )

  const legacyTuple = registry.legacyBuiltInThemeTuples[2]

  assertInvariant(legacyTuple !== undefined, 'the warm legacy migration tuple must exist')

  const legacyExecution = executeAppearanceInit(appearanceInit, {
    rawPreference: JSON.stringify({
      schemaVersion: 1,
      appearance: {
        colorMode: 'high-contrast',
        theme: legacyTuple.themeId,
        palette: {
          brand: legacyTuple.brand,
          accent: legacyTuple.accent,
          neutral: legacyTuple.neutral,
        },
        contrast: 'standard',
        density: {
          preset: 'comfortable',
          scale: 1,
        },
        fontScale: 1,
        motion: 'full',
      },
    }),
  })

  assertInvariant(
    legacyExecution.attributes['data-color-mode'] === 'light' &&
      legacyExecution.attributes['data-theme'] === 'warm' &&
      legacyExecution.attributes['data-contrast'] === 'enhanced' &&
      legacyExecution.attributes['data-material'] === 'solid',
    'appearance-init.js must perform the exact lossless legacy migration in memory',
  )

  const migrationParityInputs = [
    builtInPreference,
    {
      schemaVersion: 2,
      appearance: {
        colorMode: 'system',
        theme: legacyTuple.themeId,
        palette: {
          brand: legacyTuple.brand,
          accent: legacyTuple.accent,
          neutral: legacyTuple.neutral,
        },
        contrast: 'standard',
        material: 'adaptive',
        density: { preset: 'comfortable', scale: 1 },
        fontScale: 1,
        motion: 'full',
      },
    },
    {
      schemaVersion: 2,
      appearance: {
        colorMode: 'system',
        theme: legacyTuple.themeId,
        palette: {
          brand: '#123456',
          accent: legacyTuple.accent,
          neutral: legacyTuple.neutral,
        },
        contrast: 'standard',
        material: 'adaptive',
        density: { preset: 'comfortable', scale: 1 },
        fontScale: 1,
        motion: 'full',
      },
    },
    {
      schemaVersion: 2,
      appearance: {
        colorMode: 'system',
        theme: legacyTuple.themeId,
        palette: {
          brand: 'var(--invalid-legacy-color)',
          accent: legacyTuple.accent,
          neutral: legacyTuple.neutral,
        },
        contrast: 'standard',
        material: 'adaptive',
        density: { preset: 'comfortable', scale: 1 },
        fontScale: 1,
        motion: 'full',
      },
    },
    { schemaVersion: 3 },
  ] as const

  for (const input of migrationParityInputs) {
    assertInvariantEqual(
      executeAppearanceMigration(appearanceInit, input),
      migrateToExplicitThemePreference(input),
      'appearance-init.js and runtime must share the exact Preference migration classification',
    )
  }

  const atomicFailure = executeAppearanceInit(appearanceInit, {
    fontScaleWriteFailure: true,
    rawPreference: JSON.stringify(builtInPreference),
  })

  assertInvariantEqual(
    atomicFailure.attributes,
    safetyAttributes,
    'appearance-init.js must restore all seven attributes after a partial application failure',
  )
  assertInvariantEqual(
    atomicFailure.customProperties,
    safetyCustomProperties,
    'appearance-init.js must restore Font Scale after a partial application failure',
  )

  const expectedFailures = [
    executeAppearanceInit(appearanceInit, {
      rawPreference: '{invalid',
    }),
    executeAppearanceInit(appearanceInit, {
      rawPreference: JSON.stringify({ schemaVersion: 3 }),
    }),
    executeAppearanceInit(appearanceInit, {
      rawPreference: JSON.stringify({
        schemaVersion: 2,
        appearance: {
          colorMode: 'system',
          theme: legacyTuple.themeId,
          palette: {
            brand: '#123456',
            accent: legacyTuple.accent,
            neutral: legacyTuple.neutral,
          },
          contrast: 'standard',
          material: 'adaptive',
          density: {
            preset: 'comfortable',
            scale: 1,
          },
          fontScale: 1,
          motion: 'full',
        },
      }),
    }),
    executeAppearanceInit(appearanceInit, {
      storageReadFailure: true,
    }),
    executeAppearanceInit(appearanceInit, {
      rawPreference: JSON.stringify(migrationParityInputs[3]),
    }),
    executeAppearanceInit(appearanceInit, {
      storageKey: null,
    }),
  ]

  for (const failure of expectedFailures) {
    assertInvariantEqual(
      failure.attributes,
      safetyAttributes,
      'appearance-init.js expected failures must retain all seven safety attributes',
    )
    assertInvariantEqual(
      failure.customProperties,
      safetyCustomProperties,
      'appearance-init.js expected failures must retain the baseline Font Scale',
    )
    assertInvariant(
      failure.networkRequests === 0 && failure.storageWrites === 0,
      'appearance-init.js expected failures must not request the network or write Storage',
    )
  }
}

export async function validateTokens(): Promise<TokenBuildResult> {
  const initialized = await initializeDictionary(generatedDirectory)
  return requireResult(initialized.context)
}

export async function buildTokens(outputDirectory = generatedDirectory): Promise<TokenBuildResult> {
  const initialized = await initializeDictionary(outputDirectory)
  await initialized.dictionary.buildAllPlatforms()
  return requireResult(initialized.context)
}

async function compareGeneratedFiles(
  actualDirectory: string,
  expectedDirectory: string,
): Promise<void> {
  const expectedEntries = (await readdir(expectedDirectory)).sort()

  if (expectedEntries.join('\n') !== [...generatedFiles].sort().join('\n')) {
    throw new Error(
      `Tracked generated directory must contain exactly: ${generatedFiles.join(', ')}.`,
    )
  }

  for (const file of generatedFiles) {
    const [actual, expected] = await Promise.all([
      readFile(resolve(actualDirectory, file)),
      readFile(resolve(expectedDirectory, file)),
    ])

    if (!actual.equals(expected)) {
      throw new Error(`${file}: generated output drift detected. Run pnpm tokens:build.`)
    }
  }
}

function generatedClassDeclarations(css: string, className: string): Record<string, string> {
  const selector = `.${className}{`
  const start = css.indexOf(selector)

  assertInvariant(start >= 0, `${className} must generate an actual UnoCSS class rule`)
  assertInvariant(
    !css.includes(selector, start + selector.length),
    `${className} must generate exactly one UnoCSS class rule`,
  )

  const end = css.indexOf('}', start + selector.length)

  assertInvariant(end >= 0, `${className} must generate a complete UnoCSS class rule`)

  const declarations = css
    .slice(start + selector.length, end)
    .split(';')
    .filter((declaration) => declaration.length > 0)
    .map((declaration) => {
      const separator = declaration.indexOf(':')

      assertInvariant(separator > 0, `${className} emitted malformed UnoCSS declarations`)
      return [declaration.slice(0, separator), declaration.slice(separator + 1)] as const
    })

  assertInvariant(
    new Set(declarations.map(([property]) => property)).size === declarations.length,
    `${className} must not emit duplicate CSS properties`,
  )
  return Object.fromEntries(declarations)
}

async function validateInstalledUnoCssPreset(result: TokenBuildResult): Promise<void> {
  const [
    { createGenerator, presetWind4 },
    {
      platformPreset,
      wind4PublicVariableBypassCandidates,
      wind4RestrictedThemeAliasCandidates,
      wind4RestrictedThemeSafelistPaths,
    },
    { default: rootUnoConfiguration },
  ] = await Promise.all([
    import('unocss'),
    import('../unocss/preset'),
    import('../../../../uno.config'),
  ])
  const projection = unoCssProjection(result)
  const installedPreset = platformPreset()
  const expectedRules = projection.rules.map((rule) => [rule.className, rule.declarations] as const)
  const rootConfiguration = rootUnoConfiguration as unknown

  assertInvariant(
    isUnknownRecord(rootConfiguration),
    'the root UnoCSS configuration must be an object',
  )

  for (const forbiddenSurface of [
    'theme',
    'extendTheme',
    'rules',
    'shortcuts',
    'safelist',
    'preprocess',
    'transformers',
    'prefix',
  ]) {
    assertInvariant(
      rootConfiguration[forbiddenSurface] === undefined,
      `the root UnoCSS configuration must not define a custom ${forbiddenSurface} surface`,
    )
  }

  const rootPresets = rootConfiguration['presets']

  assertInvariant(
    Array.isArray(rootPresets) && rootPresets.every(isUnknownRecord),
    'the root UnoCSS configuration must contain its exact preset route',
  )
  assertInvariantEqual(
    rootPresets.map((preset) => preset['name']),
    ['@unocss/preset-wind4', '@unocss/preset-icons', '@platform/design-system'],
    'the root UnoCSS configuration must preserve its exact three-preset route',
  )

  const rootPlatformPreset = rootPresets.find(
    (preset) => preset['name'] === '@platform/design-system',
  )

  assertInvariant(
    rootPlatformPreset !== undefined,
    'the root UnoCSS configuration must install the platform preset',
  )

  assertInvariantEqual(
    installedPreset.rules,
    expectedRules,
    'the installed platformPreset rules must equal the generated exact-rule projection',
  )
  assertInvariantEqual(
    installedPreset.theme,
    projection.theme,
    'the installed platformPreset Theme must equal the generated Theme-entry projection',
  )
  assertInvariantEqual(
    rootPlatformPreset['rules'],
    expectedRules,
    'the root UnoCSS configuration must install only the generated platform rules',
  )
  assertInvariantEqual(
    rootPlatformPreset['theme'],
    projection.theme,
    'the root UnoCSS configuration must install only the generated platform Theme entries',
  )
  assertInvariant(
    Array.isArray(rootPlatformPreset['blocklist']) &&
      rootPlatformPreset['blocklist'].length === 1 &&
      rootPlatformPreset['blocklist'].every((entry: unknown) => typeof entry === 'function'),
    'the root platform preset must install exactly one generated Theme containment blocklist',
  )

  for (const forbiddenSurface of ['shortcuts', 'safelist', 'preprocess']) {
    assertInvariant(
      rootPlatformPreset[forbiddenSurface] === undefined,
      `the root platform preset must not define ${forbiddenSurface}`,
    )
  }

  const generator = await createGenerator({
    ...rootUnoConfiguration,
    warn: false,
  })
  const referenceGenerator = await createGenerator({
    warn: false,
    presets: [
      presetWind4({
        preflights: {
          reset: false,
          theme: false,
        },
      }),
      {
        name: 'pavp-wind4-theme-reference',
        theme: projection.theme,
      },
    ],
  })
  const installedTheme = generator.config.theme as unknown
  const textTheme = isUnknownRecord(installedTheme) ? installedTheme['text'] : undefined
  const wind4TextSizeKeys = isUnknownRecord(textTheme) ? Object.keys(textTheme) : []
  const forbiddenThemeAliases = wind4RestrictedThemeAliasCandidates(wind4TextSizeKeys)
  const forbiddenCandidates = [...forbiddenThemeAliases, ...wind4PublicVariableBypassCandidates]
  const expectedRestrictedRoleIds = projection.mappings
    .filter((mapping) => mapping.generatorKind === 'theme-entry')
    .map((mapping) => mapping.roleId)
    .sort(compareCodePoints)

  assertInvariantEqual(
    [...new Set(forbiddenThemeAliases.map((candidate) => candidate.roleId))].sort(
      compareCodePoints,
    ),
    expectedRestrictedRoleIds,
    'the Wind4 alias grammar must cover all seven restricted Theme entries',
  )
  assertInvariantEqual(
    [...new Set(wind4PublicVariableBypassCandidates.map((candidate) => candidate.roleId))].sort(
      compareCodePoints,
    ),
    projection.mappings.map((mapping) => mapping.roleId).sort(compareCodePoints),
    'arbitrary public-variable bypass validation must cover all 27 mappings',
  )
  assertInvariant(
    new Set(forbiddenCandidates.map((candidate) => candidate.className)).size ===
      forbiddenCandidates.length,
    'the exhaustive Wind4 and public-variable candidate set must be unique',
  )
  assertInvariantEqual(
    generator.config.safelist,
    [],
    'the installed UnoCSS route must not safelist Theme property paths',
  )
  assertInvariantEqual(
    generator.config.preprocess,
    [],
    'the installed UnoCSS route must not preprocess classes around containment',
  )

  for (const safelistPath of wind4RestrictedThemeSafelistPaths) {
    assertInvariant(
      !generator.config.safelist.includes(safelistPath),
      `${safelistPath} must not bypass on-demand Theme containment through the safelist`,
    )
  }

  const actualClasses: string[] = []

  for (const mapping of result.unoCssMappings) {
    for (const className of mapping.classes) {
      const generated = await generator.generate(className, {
        preflights: false,
      })
      const declarations = generatedClassDeclarations(generated.css, className)

      assertInvariantEqual(
        [...generated.matched],
        [className],
        `${className} must be matched by the actual platformPreset`,
      )
      assertInvariantEqual(
        Object.keys(declarations).sort(compareCodePoints),
        [...mapping.allowedCssProperties].sort(compareCodePoints),
        `${className} actual UnoCSS output must remain within its allowed CSS property scope`,
      )

      if (mapping.generatorKind === 'exact-rule') {
        assertInvariantEqual(
          declarations,
          Object.fromEntries(
            mapping.allowedCssProperties.map((property) => [
              property,
              `var(${mapping.cssVariable})`,
            ]),
          ),
          `${className} actual exact rule must bind its canonical public CSS variable`,
        )
      } else {
        const themeEntry = projection.themeEntries.find((entry) => entry.roleId === mapping.roleId)

        assertInvariant(
          themeEntry !== undefined,
          `${mapping.roleId} must have one generated Theme entry`,
        )

        if (themeEntry.family === 'shadow') {
          assertInvariant(
            Object.values(declarations).some((value) =>
              value.includes(`var(${mapping.cssVariable})`),
            ),
            `${className} must consume its canonical public Shadow variable directly`,
          )
        } else {
          const mirrorVariable = `--${themeEntry.family}-${themeEntry.key}`

          assertInvariant(
            Object.values(declarations).some((value) => value.includes(`var(${mirrorVariable})`)),
            `${className} must consume only its canonical Wind4 Theme mirror`,
          )
        }
      }

      actualClasses.push(className)
    }
  }

  assertInvariantEqual(
    actualClasses.sort(compareCodePoints),
    result.unoCssMappings.flatMap((mapping) => mapping.classes).sort(compareCodePoints),
    'the actual platformPreset must generate all 27 registered public classes',
  )

  const preflight = await generator.generate(actualClasses.join(' '), {
    preflights: true,
  })
  const compactPreflightCss = preflight.css.replaceAll(/\s+/gu, '')

  for (const mapping of projection.mappings) {
    if (mapping.generatorKind !== 'theme-entry' || mapping.family === 'shadow') {
      continue
    }

    const themeEntry = projection.themeEntries.find((entry) => entry.roleId === mapping.roleId)

    assertInvariant(
      themeEntry !== undefined,
      `${mapping.roleId} must have one generated preflight Theme entry`,
    )

    const mirrorVariable = `--${themeEntry.family}-${themeEntry.key}`

    assertInvariant(
      compactPreflightCss.includes(`${mirrorVariable}:var(${mapping.cssVariable})`),
      `${mapping.roleId} on-demand Theme preflight must bind its mirror to the canonical public variable`,
    )
  }

  for (const candidate of forbiddenCandidates) {
    const reference = await referenceGenerator.generate(candidate.className, {
      preflights: false,
    })

    assertInvariantEqual(
      [...reference.matched],
      [candidate.className],
      `${candidate.className} must remain an actual pinned-Wind4 resolver path (${candidate.template})`,
    )

    const generated = await generator.generate(candidate.className, {
      preflights: false,
    })

    assertInvariantEqual(
      [...generated.matched],
      [],
      `${candidate.className} must be blocked as an unregistered public resolver path (${candidate.template})`,
    )
    assertInvariant(
      !result.unoCssMappings.some((mapping) => generated.css.includes(mapping.cssVariable)),
      `${candidate.className} must not resolve to any public CSS variable`,
    )
  }
}

export async function checkTokens(): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pavp-tokens-'))

  try {
    const result = await buildTokens(temporaryDirectory)
    await compareGeneratedFiles(temporaryDirectory, generatedDirectory)
    await validateInstalledUnoCssPreset(result)
  } finally {
    await rm(temporaryDirectory, {
      force: true,
      recursive: true,
    })
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'build'

  if (command === 'build') {
    const result = await buildTokens()
    console.log(`Token build: generated ${String(result.tokens.length)} validated tokens`)
    return
  }

  if (command === 'check') {
    await checkTokens()
    console.log('Token generation: deterministic')
    return
  }

  if (command === 'validate') {
    const result = await validateTokens()
    console.log(`Token schemas: ${String(result.sourceFiles.length)} sources valid`)
    return
  }

  throw new Error(`Unknown token build command "${command}".`)
}

const entryPath = process.argv[1] === undefined ? undefined : resolve(process.argv[1])

if (entryPath === fileURLToPath(import.meta.url)) {
  await main()
}
