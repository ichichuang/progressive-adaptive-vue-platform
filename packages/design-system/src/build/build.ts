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
import { createCssFormat, formatRuntimeCss } from './formats/css'
import { createManifestFormat, formatManifest, manifestDocument } from './formats/manifest'
import { selectTokensForOutput, tokenValueToCss, type FormatContext } from './formats/shared'
import {
  createTokenNamesFormat,
  createTokensTypeScriptFormat,
  createUnoCssThemeFormat,
  formatTokenNames,
  formatTokensTypeScript,
  formatUnoCssTheme,
} from './formats/typescript'
import { compareCodePoints } from './order'
import {
  parseTokenSourceRecords,
  preprocessTokenSources,
  validateTokenRecords,
  type TokenBuildResult,
} from './preprocess'
import { createTokenResolver, type ResolvedTokenRecord } from './resolve'

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
    createCssFormat(context),
    createTokensTypeScriptFormat(context),
    createTokenNamesFormat(context),
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
    colorCompoundBudget: baseline.colorCompoundBudget,
    compounds,
    densityPresets: baseline.densityPresets,
    sourceFiles: [...new Set(tokens.map((token) => token.source))].sort(compareCodePoints),
    themes: baseline.themes,
    tokens,
  }
}

function validateGeneratorContracts(result: TokenBuildResult): void {
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
  const matrixUnoCss = formatUnoCssTheme(matrixResult)

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
      !matrixNames.includes('color.build') &&
      !matrixUnoCss.includes('color.internal') &&
      !matrixUnoCss.includes('color.build') &&
      !matrixUnoCss.includes('--ui-color-internal') &&
      !matrixUnoCss.includes('--ui-color-build'),
    'ui-internal and build-only tokens must not enter public TypeScript, names, or UnoCSS',
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
    formatManifest(matrixResult),
    formatManifest(matrixResult),
    'Manifest formatting must be deterministic',
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
