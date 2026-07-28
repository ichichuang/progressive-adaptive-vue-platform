import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

import StyleDictionary from 'style-dictionary'
import type { PreprocessedTokens } from 'style-dictionary/types'

import { applyAppearance } from '../runtime/apply-appearance'
import { defaultUserPreferenceV2 } from '../runtime/appearance-defaults'
import { prepareFirstPaint } from '../runtime/first-paint'
import { upgradeUserPreference } from '../runtime/preference-schema-upgrades'
import { resolveColorMode } from '../runtime/resolve-color-mode'
import { resolveMaterial } from '../runtime/resolve-material'
import { userPreferenceV2Schema } from '../schema/preference.schema'
import { createCssFormat } from './formats/css'
import { createManifestFormat } from './formats/manifest'
import {
  createTokenNamesFormat,
  createTokensTypeScriptFormat,
  createUnoCssThemeFormat,
} from './formats/typescript'
import { tokenValueToCss, type FormatContext } from './formats/shared'
import { compareCodePoints } from './order'
import { preprocessTokenSources, type TokenBuildResult } from './preprocess'

const buildDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(buildDirectory, '../../../..')
const tokenSourceDirectory = resolve(repositoryRoot, 'packages/design-system/tokens')
const generatedDirectory = resolve(repositoryRoot, 'packages/design-system/src/generated')
const generatedFiles = [
  'token-names.ts',
  'tokens.css',
  'tokens.manifest.json',
  'tokens.ts',
  'unocss-theme.ts',
] as const

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
              destination: 'tokens.ts',
              format: 'pavp/typescript/tokens',
            },
            {
              destination: 'token-names.ts',
              format: 'pavp/typescript/token-names',
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
    createCssFormat(),
    createTokensTypeScriptFormat(),
    createTokenNamesFormat(),
    createUnoCssThemeFormat(),
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

  validateAppearanceContracts(context.result)
  return context.result
}

function assertInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Appearance contract: ${message}.`)
  }
}

function assertInvariantEqual(actual: unknown, expected: unknown, message: string): void {
  assertInvariant(isDeepStrictEqual(actual, expected), message)
}

function validateAppearanceContracts(result: TokenBuildResult): void {
  const validatedDefault = userPreferenceV2Schema.safeParse(defaultUserPreferenceV2)

  assertInvariant(validatedDefault.success, 'the canonical V2 default must pass its schema')
  assertInvariant(
    !('schemaVersion' in defaultUserPreferenceV2.appearance),
    'schemaVersion must exist only on the outer preference envelope',
  )
  assertInvariantEqual(
    {
      colorMode: defaultUserPreferenceV2.appearance.colorMode,
      contrast: defaultUserPreferenceV2.appearance.contrast,
      density: defaultUserPreferenceV2.appearance.density,
      fontScale: defaultUserPreferenceV2.appearance.fontScale,
      material: defaultUserPreferenceV2.appearance.material,
      motion: defaultUserPreferenceV2.appearance.motion,
      theme: defaultUserPreferenceV2.appearance.theme,
    },
    {
      colorMode: 'system',
      contrast: 'standard',
      density: {
        preset: 'comfortable',
        scale: 1,
      },
      fontScale: 1,
      material: 'adaptive',
      motion: 'full',
      theme: 'neutral',
    },
    'the canonical V2 default values must remain fixed',
  )
  assertInvariant(
    !userPreferenceV2Schema.safeParse({
      ...defaultUserPreferenceV2,
      appearance: {
        ...defaultUserPreferenceV2.appearance,
        colorMode: 'high-contrast',
      },
    }).success,
    'the V2 color mode schema must reject legacy high contrast',
  )
  assertInvariant(
    !userPreferenceV2Schema.safeParse({
      ...defaultUserPreferenceV2,
      appearance: {
        ...defaultUserPreferenceV2.appearance,
        schemaVersion: 2,
      },
    }).success,
    'the V2 appearance schema must reject a nested schemaVersion',
  )

  const neutralTheme = result.themes.find((theme) => theme.id === 'neutral')

  assertInvariant(neutralTheme !== undefined, 'the neutral theme must exist')
  assertInvariantEqual(
    defaultUserPreferenceV2.appearance.palette,
    {
      accent: tokenValueToCss('color', neutralTheme.palette.accent),
      brand: tokenValueToCss('color', neutralTheme.palette.brand),
      neutral: neutralTheme.palette.neutral,
    },
    'the canonical default palette must match the resolved neutral theme source',
  )

  const legacyAppearance = {
    colorMode: 'dark',
    contrast: 'enhanced',
    density: {
      preset: 'spacious',
      scale: 1.1,
    },
    fontScale: 1.2,
    motion: 'reduced',
    palette: {
      accent: defaultUserPreferenceV2.appearance.palette.accent,
      brand: defaultUserPreferenceV2.appearance.palette.brand,
      neutral: 'warm',
    },
    theme: 'ocean',
  } as const
  const legacyPreference = {
    appearance: legacyAppearance,
    schemaVersion: 1,
  } as const
  const legacySnapshot = JSON.stringify(legacyPreference)
  const migrated = upgradeUserPreference(legacyPreference)

  assertInvariantEqual(
    migrated,
    {
      appearance: {
        ...legacyAppearance,
        material: 'solid',
      },
      schemaVersion: 2,
    },
    'valid V1 preferences must migrate to solid while preserving valid fields',
  )
  assertInvariant(
    JSON.stringify(legacyPreference) === legacySnapshot,
    'migration must not mutate its input',
  )

  const highContrastMigrated = upgradeUserPreference({
    appearance: {
      ...legacyAppearance,
      colorMode: 'high-contrast',
      contrast: 'standard',
    },
    schemaVersion: 1,
  })

  assertInvariantEqual(
    {
      colorMode: highContrastMigrated.appearance.colorMode,
      contrast: highContrastMigrated.appearance.contrast,
      material: highContrastMigrated.appearance.material,
    },
    {
      colorMode: 'system',
      contrast: 'enhanced',
      material: 'solid',
    },
    'legacy high contrast must migrate to system, enhanced, and solid',
  )
  assertInvariantEqual(
    upgradeUserPreference(migrated),
    migrated,
    'valid V2 preferences must remain idempotent',
  )

  const firstFallback = upgradeUserPreference({
    appearance: {
      colorMode: 'dark',
    },
    schemaVersion: 1,
  })
  const secondFallback = upgradeUserPreference(undefined)

  assertInvariantEqual(
    firstFallback,
    defaultUserPreferenceV2,
    'invalid input must return the complete canonical default',
  )
  assertInvariantEqual(
    secondFallback,
    defaultUserPreferenceV2,
    'unknown input must return the complete canonical default',
  )
  assertInvariant(
    firstFallback !== secondFallback &&
      firstFallback.appearance !== secondFallback.appearance &&
      firstFallback.appearance.palette !== secondFallback.appearance.palette &&
      firstFallback.appearance.density !== secondFallback.appearance.density,
    'fallback preferences must not share mutable object state',
  )
  assertInvariant(
    Object.isFrozen(defaultUserPreferenceV2) &&
      Object.isFrozen(defaultUserPreferenceV2.appearance) &&
      Object.isFrozen(defaultUserPreferenceV2.appearance.palette) &&
      Object.isFrozen(defaultUserPreferenceV2.appearance.density),
    'the exported canonical default must not expose mutable shared state',
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
    'the color mode resolver must use only stored mode and explicit prefersDark',
  )

  const reducedWithoutBackdrop = Object.freeze({
    backdropFilterSupported: false,
    forcedColorsActive: false,
    reducedTransparencyRequested: false,
    storedMaterial: 'reduced' as const,
  })

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
      resolveMaterial(reducedWithoutBackdrop),
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

  const prepared = prepareFirstPaint({
    environment: {
      backdropFilterSupported: false,
      forcedColorsActive: false,
      prefersDark: true,
      reducedTransparencyRequested: false,
    },
    storedPreference: defaultUserPreferenceV2,
  })

  assertInvariantEqual(
    {
      effectiveColorMode: prepared.effectiveAppearance.colorMode,
      effectiveMaterial: prepared.effectiveAppearance.material,
      storedColorMode: prepared.storedPreference.appearance.colorMode,
      storedMaterial: prepared.storedPreference.appearance.material,
    },
    {
      effectiveColorMode: 'dark',
      effectiveMaterial: 'solid',
      storedColorMode: 'system',
      storedMaterial: 'adaptive',
    },
    'first-paint preparation must separate stored and effective appearance state',
  )

  const attributes = new Map<string, string>()

  applyAppearance(
    {
      setAttribute(name, value) {
        attributes.set(name, value)
      },
    },
    prepared.effectiveAppearance,
  )
  assertInvariantEqual(
    Object.fromEntries(attributes),
    {
      'data-color-mode': 'dark',
      'data-contrast': 'standard',
      'data-density': 'comfortable',
      'data-material': 'solid',
      'data-motion': 'full',
      'data-theme': 'neutral',
    },
    'appearance application must write only canonical effective attributes',
  )
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

export async function checkTokens(): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pavp-tokens-'))

  try {
    await buildTokens(temporaryDirectory)
    await compareGeneratedFiles(temporaryDirectory, generatedDirectory)
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
