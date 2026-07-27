import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import StyleDictionary from 'style-dictionary'
import type { PreprocessedTokens } from 'style-dictionary/types'

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

  return context.result
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
