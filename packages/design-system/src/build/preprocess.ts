import type { PreprocessedTokens } from 'style-dictionary/types'
import { z } from 'zod'

import { themeDefinitionSchema, type ThemeDefinition } from '../schema/theme.schema'
import {
  tokenDefinitionSchema,
  tokenGroupExtensionsSchema,
  tokenSourceSchema,
  type ColorValue,
  type TokenConditions,
  type TokenDefinition,
  type TokenPavpExtension,
  type TokenVisibility,
} from '../schema/token.schema'
import {
  validateContrastAndMaterialContracts,
  type ContrastPairValidation,
  type MaterialRoleValidation,
  type NonTextBoundaryValidation,
} from './contrast'
import { compareCodePoints } from './order'
import { parseJsonSource } from './parse-json'
import { createTokenResolver, type ResolvedTokenRecord, type TokenRecord } from './resolve'
import {
  assertVisibilityNarrowing,
  colorCompoundBudget,
  conditionEntries,
  conditionKey,
  cssVariableForRole,
  orderedConditions,
  roleMetadata,
  tierDefaultVisibility,
  visibilityEntersOutput,
  type TokenTier,
} from './token-contract'

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
const colorCompoundAxes = ['theme', 'colorMode', 'contrast'] as const

interface ResolvedThemeDefinition extends Omit<ThemeDefinition, 'palette'> {
  palette: {
    accent: ColorValue
    brand: ColorValue
    neutral: ThemeDefinition['palette']['neutral']
  }
}

export interface ColorCompound {
  conditions: TokenConditions
  name: string
}

export interface TokenBuildResult {
  colorCompoundBudget: number
  compounds: readonly ColorCompound[]
  contrastPairs: readonly ContrastPairValidation[]
  densityPresets: readonly string[]
  materialRoles: readonly MaterialRoleValidation[]
  nonTextBoundaries: readonly NonTextBoundaryValidation[]
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
  const segments = sourcePath.split('/')
  const directory = segments[0]
  const fileName = segments[1]

  if (segments.length !== 2 || !fileName?.endsWith('.tokens.json')) {
    throw new Error(`${sourcePath}: unsupported token source path.`)
  }

  if (directory === 'component') {
    throw new Error(
      `${sourcePath}: component token sources are unsupported until their admission gate.`,
    )
  }

  if (directory === 'primitive' || directory === 'density') {
    return directory
  }

  if (directory === 'semantic') {
    return fileName === 'material.tokens.json' ? 'semantic.material' : 'semantic'
  }

  throw new Error(`${sourcePath}: unknown token tier "${directory ?? '<missing>'}".`)
}

function groupVisibility(
  group: Record<string, unknown>,
  inheritedVisibility: TokenVisibility,
  sourcePath: string,
  path: readonly string[],
): TokenVisibility {
  const extensions = group['$extensions']

  if (extensions === undefined) {
    return inheritedVisibility
  }

  const parsed = tokenGroupExtensionsSchema.safeParse(extensions)

  if (!parsed.success) {
    throw formatIssues(sourcePath, parsed.error)
  }

  const visibility = parsed.data['org.pavp'].visibility
  assertVisibilityNarrowing(
    visibility,
    inheritedVisibility,
    `${sourcePath}:${path.length === 0 ? '<root>' : path.join('.')}`,
  )
  return visibility
}

function validateConditionShape(
  extension: TokenPavpExtension | undefined,
  tokenPath: string,
  sourcePath: string,
  roleCategory: string,
  type: TokenDefinition['$type'],
): void {
  const conditions = orderedConditions(extension?.conditions)
  const axes = conditionEntries(conditions).map(([axis]) => axis)
  const compound = extension?.compound

  if (axes.length <= 1) {
    if (compound !== undefined) {
      throw new Error(
        `${sourcePath}:${tokenPath}: compound metadata requires Theme × Mode × Contrast conditions.`,
      )
    }
    return
  }

  if (
    axes.length !== colorCompoundAxes.length ||
    axes.some((axis, index) => axis !== colorCompoundAxes[index])
  ) {
    throw new Error(
      `${sourcePath}:${tokenPath}: only the bounded Theme × Mode × Contrast color-plane compound is supported.`,
    )
  }

  if (compound === undefined) {
    throw new Error(
      `${sourcePath}:${tokenPath}: Theme × Mode × Contrast conditions require a named compound.`,
    )
  }

  if (type !== 'color' || roleCategory !== 'color') {
    throw new Error(
      `${sourcePath}:${tokenPath}: named compounds are restricted to color-plane roles.`,
    )
  }
}

function flattenTokenSource(
  source: Record<string, unknown>,
  sourcePath: string,
  tier: TokenTier,
): TokenRecord[] {
  const records: TokenRecord[] = []
  const tierVisibility = tierDefaultVisibility[tier]

  function visit(
    group: Record<string, unknown>,
    path: string[],
    inheritedVisibility: TokenVisibility,
  ): void {
    const enforcedVisibility = groupVisibility(group, inheritedVisibility, sourcePath, path)

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
      const childPath = [...path, key]

      if ('$value' in child) {
        const parsed = tokenDefinitionSchema.safeParse(child)

        if (!parsed.success) {
          throw formatIssues(sourcePath, parsed.error)
        }

        const token: TokenDefinition = parsed.data
        const extension = token.$extensions?.['org.pavp']
        const visibility = extension?.visibility ?? enforcedVisibility
        const tokenPath = childPath.join('.')

        assertVisibilityNarrowing(visibility, enforcedVisibility, `${sourcePath}:${tokenPath}`)

        const role = roleMetadata(extension?.role ?? tokenPath)

        if (tier === 'semantic.material' && role.category !== 'material') {
          throw new Error(
            `${sourcePath}:${tokenPath}: semantic.material tokens must use the material role namespace.`,
          )
        }

        if (tier === 'semantic' && role.category === 'material') {
          throw new Error(
            `${sourcePath}:${tokenPath}: material roles must be owned by semantic/material.tokens.json.`,
          )
        }

        validateConditionShape(extension, tokenPath, sourcePath, role.category, token.$type)

        const conditions = orderedConditions(extension?.conditions)
        const runtimeExposed = visibilityEntersOutput(visibility, 'runtime-css')

        records.push({
          conditions,
          path: tokenPath,
          role,
          source: sourcePath,
          tier,
          type: token.$type,
          value: token.$value,
          visibility,
          ...(extension?.compound === undefined ? {} : { compound: extension.compound }),
          ...(extension?.contrastPairs === undefined
            ? {}
            : { contrastPairs: extension.contrastPairs }),
          ...(runtimeExposed ? { cssVariable: cssVariableForRole(role) } : {}),
          ...(token.$description === undefined ? {} : { description: token.$description }),
        })
      } else {
        visit(child, childPath, enforcedVisibility)
      }
    }
  }

  visit(source, [], tierVisibility)
  return records
}

export function parseTokenSourceRecords(sourcePath: string, contents: string): TokenRecord[] {
  const tier = tierFromSourcePath(sourcePath)
  const parsed = parseJsonSource(contents, sourcePath)
  const source = tokenSourceSchema.safeParse(parsed)

  if (!source.success) {
    throw formatIssues(sourcePath, source.error)
  }

  return flattenTokenSource(source.data, sourcePath, tier)
}

function compareRecords(left: ResolvedTokenRecord, right: ResolvedTokenRecord): number {
  return (
    compareCodePoints(left.role.name, right.role.name) ||
    compareCodePoints(conditionKey(left.conditions), conditionKey(right.conditions)) ||
    compareCodePoints(left.path, right.path)
  )
}

export function validateTokenRecords(
  records: readonly ResolvedTokenRecord[],
  themeIds: ReadonlySet<string>,
): ColorCompound[] {
  const outputConditions = new Map<string, string>()
  const roleContracts = new Map<
    string,
    Pick<ResolvedTokenRecord, 'cssVariable' | 'tier' | 'type' | 'visibility'>
  >()
  const cssVariables = new Map<string, string>()
  const compounds = new Map<string, TokenConditions>()

  for (const record of records) {
    if (record.conditions.theme !== undefined && !themeIds.has(record.conditions.theme)) {
      throw new Error(
        `${record.source}:${record.path}: unknown theme condition "${record.conditions.theme}".`,
      )
    }

    if (record.conditions.material !== undefined && record.role.category !== 'material') {
      throw new Error(
        `${record.source}:${record.path}: material selectors may write only --ui-material-* roles.`,
      )
    }

    const outputKey = `${record.role.name}\n${conditionKey(record.conditions)}`
    const existingOutput = outputConditions.get(outputKey)

    if (existingOutput !== undefined) {
      throw new Error(
        `${record.source}:${record.path}: ambiguous role conditions duplicate ${existingOutput}.`,
      )
    }

    outputConditions.set(outputKey, `${record.source}:${record.path}`)

    const existingRole = roleContracts.get(record.role.name)
    const roleContract = {
      ...(record.cssVariable === undefined ? {} : { cssVariable: record.cssVariable }),
      tier: record.tier,
      type: record.type,
      visibility: record.visibility,
    }

    if (
      existingRole !== undefined &&
      (existingRole.cssVariable !== roleContract.cssVariable ||
        existingRole.tier !== roleContract.tier ||
        existingRole.type !== roleContract.type ||
        existingRole.visibility !== roleContract.visibility)
    ) {
      throw new Error(
        `${record.source}:${record.path}: role "${record.role.name}" has conflicting tier, visibility, type, or CSS metadata.`,
      )
    }

    roleContracts.set(record.role.name, roleContract)

    if (record.cssVariable !== undefined) {
      const existingRoleName = cssVariables.get(record.cssVariable)

      if (existingRoleName !== undefined && existingRoleName !== record.role.name) {
        throw new Error(
          `${record.source}:${record.path}: CSS variable "${record.cssVariable}" collides with role "${existingRoleName}".`,
        )
      }

      cssVariables.set(record.cssVariable, record.role.name)
    }

    if (record.compound !== undefined) {
      const existingConditions = compounds.get(record.compound)

      if (
        existingConditions !== undefined &&
        conditionKey(existingConditions) !== conditionKey(record.conditions)
      ) {
        throw new Error(
          `${record.source}:${record.path}: compound "${record.compound}" has conflicting conditions.`,
        )
      }

      compounds.set(record.compound, record.conditions)
    }
  }

  if (compounds.size > colorCompoundBudget) {
    throw new Error(
      `Color compound budget exceeded: ${String(compounds.size)} compounds exceed the limit of ${String(colorCompoundBudget)}.`,
    )
  }

  return [...compounds.entries()]
    .map(([name, conditions]) => ({
      conditions: orderedConditions(conditions),
      name,
    }))
    .sort((left, right) => compareCodePoints(left.name, right.name))
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
    $value: record.resolvedValue,
    ...(record.description === undefined ? {} : { $description: record.description }),
    $extensions: {
      'org.pavp': {
        conditions: record.conditions,
        role: record.role,
        source: record.source,
        tier: record.tier,
        visibility: record.visibility,
        ...(record.compound === undefined ? {} : { compound: record.compound }),
        ...(record.cssVariable === undefined ? {} : { cssVariable: record.cssVariable }),
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

function parseThemeSource(bundle: { contents: string; path: string }): ThemeDefinition {
  if (!/^themes\/[a-z][a-z0-9-]*\.theme\.json$/u.test(bundle.path)) {
    throw new Error(`${bundle.path}: unsupported theme source path.`)
  }

  const parsed = parseJsonSource(bundle.contents, bundle.path)
  const theme = themeDefinitionSchema.safeParse(parsed)

  if (!theme.success) {
    throw formatIssues(bundle.path, theme.error)
  }

  return theme.data
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
    if (bundle.path.endsWith('.theme.json')) {
      const theme = parseThemeSource(bundle)
      const existingThemeSource = themeIds.get(theme.id)

      if (existingThemeSource !== undefined) {
        throw new Error(
          `${bundle.path}: duplicate theme id "${theme.id}" also declared by ${existingThemeSource}.`,
        )
      }

      themeIds.set(theme.id, bundle.path)
      themes.push(theme)
      continue
    }

    if (!bundle.path.endsWith('.tokens.json')) {
      throw new Error(`${bundle.path}: unsupported token source.`)
    }

    for (const record of parseTokenSourceRecords(bundle.path, bundle.contents)) {
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

  const records = [...resolver.records].sort(compareRecords)
  const compounds = validateTokenRecords(records, new Set(themeIds.keys()))
  const validation = validateContrastAndMaterialContracts(
    records,
    resolvedThemes.map((theme) => theme.id),
  )
  const tokens: Record<string, unknown> = {}

  for (const record of records) {
    setToken(tokens, record)
  }

  return {
    result: {
      colorCompoundBudget,
      compounds,
      contrastPairs: validation.contrastPairs,
      densityPresets: [...new Set(densityPresets)].sort(),
      materialRoles: validation.materialRoles,
      nonTextBoundaries: validation.nonTextBoundaries,
      sourceFiles: bundles.map((bundle) => bundle.path),
      themes: resolvedThemes,
      tokens: records,
    },
    tokens: tokens as PreprocessedTokens,
  }
}
