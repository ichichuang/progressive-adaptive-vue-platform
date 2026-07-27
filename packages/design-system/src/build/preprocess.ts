import type { PreprocessedTokens } from 'style-dictionary/types'
import { z } from 'zod'

import { themeDefinitionSchema, type ThemeDefinition } from '../schema/theme.schema'
import {
  tokenDefinitionSchema,
  tokenSourceSchema,
  type ColorValue,
  type TokenDefinition,
} from '../schema/token.schema'
import { compareCodePoints } from './order'
import { parseJsonSource } from './parse-json'
import {
  createTokenResolver,
  type ResolvedTokenRecord,
  type TokenRecord,
  type TokenTier,
} from './resolve'

const sourceBundleSchema = z.strictObject({
  path: z.string().min(1),
  contents: z.string().min(1),
})

const sourceDictionarySchema = z.strictObject({
  'pavp-source': z.record(
    z.string(),
    z.strictObject({
      $type: z.literal('string'),
      $value: sourceBundleSchema,
    }),
  ),
})

const requiredDensityPresets = ['comfortable', 'compact', 'spacious'] as const
const requiredThemeIds = ['neutral', 'ocean', 'warm'] as const

interface ResolvedThemeDefinition extends Omit<ThemeDefinition, 'palette'> {
  palette: {
    accent: ColorValue
    brand: ColorValue
    neutral: ThemeDefinition['palette']['neutral']
  }
}

export interface TokenBuildResult {
  densityPresets: readonly string[]
  sourceFiles: readonly string[]
  themes: readonly ResolvedThemeDefinition[]
  tokens: readonly ResolvedTokenRecord[]
}

function formatIssues(sourcePath: string, error: z.ZodError): Error {
  const diagnostics = error.issues
    .map((issue) => {
      const path = issue.path.length === 0 ? '<root>' : issue.path.join('.')
      return `- ${sourcePath}:${path} ${issue.message}`
    })
    .join('\n')

  return new Error(`Invalid token source:\n${diagnostics}`)
}

function tierFromSourcePath(sourcePath: string): TokenTier {
  const [directory] = sourcePath.split('/')

  if (directory === 'primitive' || directory === 'semantic' || directory === 'density') {
    return directory
  }

  throw new Error(`${sourcePath}: token files must belong to primitive, semantic, or density.`)
}

function flattenTokenSource(
  source: Record<string, unknown>,
  sourcePath: string,
  tier: TokenTier,
): TokenRecord[] {
  const records: TokenRecord[] = []

  function visit(group: Record<string, unknown>, path: string[]): void {
    for (const [key, value] of Object.entries(group).sort(([left], [right]) =>
      compareCodePoints(left, right),
    )) {
      if (key.startsWith('$')) {
        continue
      }

      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`${sourcePath}:${[...path, key].join('.')} must be an object.`)
      }

      const child = value as Record<string, unknown>

      if ('$value' in child) {
        const parsed = tokenDefinitionSchema.safeParse(child)

        if (!parsed.success) {
          throw formatIssues(sourcePath, parsed.error)
        }

        const token: TokenDefinition = parsed.data
        records.push({
          path: [...path, key].join('.'),
          sourcePath,
          tier,
          type: token.$type,
          value: token.$value,
          ...(token.$description === undefined ? {} : { description: token.$description }),
        })
      } else {
        visit(child, [...path, key])
      }
    }
  }

  visit(source, [])
  return records
}

function setToken(dictionary: Record<string, unknown>, record: ResolvedTokenRecord): void {
  const segments = record.path.split('.')
  const tokenName = segments.pop()

  if (tokenName === undefined) {
    throw new Error('Resolved token path cannot be empty.')
  }

  let target = dictionary

  for (const segment of segments) {
    const existing = target[segment]

    if (existing === undefined) {
      const group: Record<string, unknown> = {}
      target[segment] = group
      target = group
      continue
    }

    if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
      throw new Error(`${record.path}: token path collides with an existing token.`)
    }

    target = existing as Record<string, unknown>
  }

  target[tokenName] = {
    $type: record.type,
    $value: record.value,
    ...(record.description === undefined ? {} : { $description: record.description }),
    $extensions: {
      'org.pavp': {
        source: record.sourcePath,
        tier: record.tier,
      },
    },
  }
}

function assertExactSet(
  actualValues: readonly string[],
  expectedValues: readonly string[],
  description: string,
): void {
  const actual = [...new Set(actualValues)].sort()
  const expected = [...expectedValues].sort()

  if (actual.join('\n') !== expected.join('\n')) {
    throw new Error(
      `${description}: expected [${expected.join(', ')}], received [${actual.join(', ')}].`,
    )
  }
}

export function preprocessTokenSources(dictionary: PreprocessedTokens): {
  result: TokenBuildResult
  tokens: PreprocessedTokens
} {
  const sourceDictionary = sourceDictionarySchema.safeParse(dictionary)

  if (!sourceDictionary.success) {
    throw formatIssues('<Style Dictionary input>', sourceDictionary.error)
  }

  const bundles = Object.values(sourceDictionary.data['pavp-source'])
    .map((token) => token.$value)
    .sort((left, right) => compareCodePoints(left.path, right.path))
  const tokenRecords: TokenRecord[] = []
  const tokenPaths = new Map<string, string>()
  const themes: ThemeDefinition[] = []
  const themeIds = new Map<string, string>()

  for (const bundle of bundles) {
    const parsed = parseJsonSource(bundle.contents, bundle.path)

    if (bundle.path.endsWith('.theme.json')) {
      const theme = themeDefinitionSchema.safeParse(parsed)

      if (!theme.success) {
        throw formatIssues(bundle.path, theme.error)
      }

      const existingThemeSource = themeIds.get(theme.data.id)

      if (existingThemeSource !== undefined) {
        throw new Error(
          `${bundle.path}: duplicate theme id "${theme.data.id}" also declared by ${existingThemeSource}.`,
        )
      }

      themeIds.set(theme.data.id, bundle.path)
      themes.push(theme.data)
      continue
    }

    const source = tokenSourceSchema.safeParse(parsed)

    if (!source.success) {
      throw formatIssues(bundle.path, source.error)
    }

    const tier = tierFromSourcePath(bundle.path)

    for (const record of flattenTokenSource(source.data, bundle.path, tier)) {
      const existingSource = tokenPaths.get(record.path)

      if (existingSource !== undefined) {
        throw new Error(
          `${bundle.path}:${record.path} duplicates a token declared by ${existingSource}.`,
        )
      }

      tokenPaths.set(record.path, bundle.path)
      tokenRecords.push(record)
    }
  }

  const resolver = createTokenResolver(tokenRecords)
  const resolvedThemes = themes
    .sort((left, right) => compareCodePoints(left.id, right.id))
    .map((theme): ResolvedThemeDefinition => ({
      id: theme.id,
      label: theme.label,
      palette: {
        brand: resolver.resolveReference(
          theme.palette.brand,
          'color',
          `theme.${theme.id}.palette.brand`,
        ) as ColorValue,
        accent: resolver.resolveReference(
          theme.palette.accent,
          'color',
          `theme.${theme.id}.palette.accent`,
        ) as ColorValue,
        neutral: theme.palette.neutral,
      },
    }))
  const densityPresets = resolver.records
    .filter((record) => record.tier === 'density')
    .map((record) => record.path.split('.')[1])
    .filter((value): value is string => value !== undefined)

  assertExactSet(densityPresets, requiredDensityPresets, 'Density preset contract')
  assertExactSet(
    resolvedThemes.map((theme) => theme.id),
    requiredThemeIds,
    'Theme preset contract',
  )

  const tokens: Record<string, unknown> = {}

  for (const record of resolver.records) {
    setToken(tokens, record)
  }

  return {
    result: {
      densityPresets: [...new Set(densityPresets)].sort(),
      sourceFiles: bundles.map((bundle) => bundle.path),
      themes: resolvedThemes,
      tokens: resolver.records,
    },
    tokens: tokens as PreprocessedTokens,
  }
}
