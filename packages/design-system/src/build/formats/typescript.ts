import type { Format } from 'style-dictionary/types'

import { builtInThemeIds } from '../../schema/complete-theme.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import { isActivePublicColorRole, type UnoCssMappingRecord } from '../public-role-registry'
import {
  generatedNotice,
  requireBuildResult,
  tokenValueToCss,
  uniqueRoleTokensForOutput,
  type FormatContext,
  type OutputToken,
} from './shared'

function stringLiteral(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

function propertyName(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value) ? value : stringLiteral(value)
}

function typeScriptLiteral(value: unknown, indentation = 0): string {
  if (typeof value === 'string') {
    return stringLiteral(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }

    const padding = ' '.repeat(indentation)
    const compact = `[${value.map((entry) => typeScriptLiteral(entry)).join(', ')}]`

    if (
      value.every(
        (entry) =>
          typeof entry === 'string' ||
          typeof entry === 'number' ||
          typeof entry === 'boolean' ||
          entry === null,
      ) &&
      indentation + compact.length <= 100
    ) {
      return compact
    }

    const values = value
      .map((entry) => `${' '.repeat(indentation + 2)}${typeScriptLiteral(entry, indentation + 2)},`)
      .join('\n')

    return `[\n${values}\n${padding}]`
  }

  if (typeof value === 'object') {
    const padding = ' '.repeat(indentation)
    const properties = Object.entries(value)
      .map(
        ([key, entry]) =>
          `${' '.repeat(indentation + 2)}${propertyName(key)}: ${typeScriptLiteral(entry, indentation + 2)},`,
      )
      .join('\n')

    return `{\n${properties}\n${padding}}`
  }

  throw new Error('Unsupported generated TypeScript literal.')
}

const themeColorModes = ['light', 'dark'] as const
const themeContrasts = ['standard', 'enhanced'] as const

function bankVariable(
  colorMode: (typeof themeColorModes)[number],
  contrast: (typeof themeContrasts)[number],
  publicBinding: string,
): string {
  const colorPrefix = '--ui-color-'

  if (!publicBinding.startsWith(colorPrefix)) {
    throw new Error(`${publicBinding}: Theme Bank bindings must use the Public Color namespace.`)
  }

  return `--ui-theme-bank-${colorMode}-${contrast}-${publicBinding.slice(colorPrefix.length)}`
}

export function themeRegistryDocument(result: TokenBuildResult) {
  const publicColors = result.activePublicRoles.filter(isActivePublicColorRole)
  const themesById = new Map(result.completeThemes.map((theme) => [theme.id, theme]))
  const builtInEntries = builtInThemeIds.map((themeId) => {
    const theme = themesById.get(themeId)

    if (theme === undefined) {
      throw new Error(`${themeId}: generated Built-in Theme Registry entry is missing.`)
    }

    const records = themeColorModes.flatMap((colorMode) =>
      themeContrasts.flatMap((contrast) =>
        publicColors.map((role) => {
          const authoredValue = theme.planes[colorMode][contrast][role.id]
          const resolvedValue = theme.resolvedPlanes[colorMode][contrast][role.id]

          if (authoredValue === undefined || resolvedValue === undefined) {
            throw new Error(
              `${themeId}:planes.${colorMode}.${contrast}.${role.id}: generated Bank value is missing.`,
            )
          }

          return {
            colorMode,
            contrast,
            publicRole: role.id,
            sourceField: `planes.${colorMode}.${contrast}.${role.id}`,
            authoredValue,
            resolvedValue,
            bankVariable: bankVariable(colorMode, contrast, role.cssVariable),
            publicBinding: role.cssVariable,
          }
        }),
      ),
    )

    return {
      registryKind: 'built-in' as const,
      themeId,
      definition: {
        schemaVersion: theme.schemaVersion,
        roleContractVersion: theme.roleContractVersion,
        id: theme.id,
        label: theme.label,
        planes: theme.planes,
      },
      source: theme.source,
      bank: {
        visibility: 'ui-internal' as const,
        records,
      },
    }
  })
  const customBankVariables = [
    ...new Set(builtInEntries[0]?.bank.records.map((record) => record.bankVariable) ?? []),
  ]

  if (customBankVariables.length !== themeColorModes.length * themeContrasts.length * 9) {
    throw new Error('Generated Custom Theme Bank allowlist must contain exactly 36 variables.')
  }

  for (const entry of builtInEntries) {
    const entryVariables = entry.bank.records.map((record) => record.bankVariable)

    if (
      entryVariables.length !== customBankVariables.length ||
      entryVariables.some((variable, index) => variable !== customBankVariables[index])
    ) {
      throw new Error(`${entry.themeId}: Built-in Theme Bank allowlist/order must remain exact.`)
    }
  }

  const legacyThemesById = new Map(result.themes.map((theme) => [theme.id, theme]))
  const legacyBuiltInThemeTuples = builtInThemeIds.map((themeId) => {
    const legacyTheme = legacyThemesById.get(themeId)

    if (legacyTheme === undefined) {
      throw new Error(`${themeId}: Legacy Built-in Theme migration tuple is missing.`)
    }

    return {
      themeId,
      brand: tokenValueToCss('color', legacyTheme.palette.brand),
      accent: tokenValueToCss('color', legacyTheme.palette.accent),
      neutral: legacyTheme.palette.neutral,
    }
  })

  return {
    roleContractVersion: result.completeThemes[0]?.roleContractVersion,
    builtInRegistryOrder: builtInThemeIds,
    activePublicColorRoles: publicColors.map((role) => ({
      publicRole: role.id,
      publicBinding: role.cssVariable,
    })),
    alphaContracts: result.alphaContracts,
    namedContrasts: result.namedContrasts.map((record) => ({
      id: record.id,
      foregroundRole: record.foregroundRole,
      backgroundRole: record.backgroundRole,
      kind: record.kind,
      standardMinimum: record.standardMinimum,
      enhancedMinimum: record.enhancedMinimum,
      maximumUsefulRatio: record.maximumUsefulRatio,
      enhancedDifferenceRequired: record.enhancedDifferenceRequired,
      staticMaterialProjections: record.staticMaterialProjections,
    })),
    legacyBuiltInThemeTuples,
    customBankVariables,
    builtInEntries,
  } as const
}

export function formatThemeRegistryTypeScript(result: TokenBuildResult): string {
  return `/* ${generatedNotice} */\nexport const generatedThemeRegistry = ${typeScriptLiteral(themeRegistryDocument(result))} as const\n`
}

export function createThemeRegistryFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/theme-registry',
    format: () => formatThemeRegistryTypeScript(requireBuildResult(context)),
  }
}

interface UnoCssRuleProjection {
  readonly className: string
  readonly declarations: Readonly<Record<string, string>>
  readonly roleId: string
}

interface UnoCssThemeEntryProjection {
  readonly family: string
  readonly key: string
  readonly roleId: string
  readonly value: string
}

export interface UnoCssProjection {
  readonly mappings: readonly UnoCssMappingRecord[]
  readonly rules: readonly UnoCssRuleProjection[]
  readonly theme: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly themeEntries: readonly UnoCssThemeEntryProjection[]
}

function entries(tokens: readonly OutputToken[], value: (token: OutputToken) => string): string {
  return tokens.map((token) => `  ${stringLiteral(token.name)}: ${value(token)},`).join('\n')
}

export function formatTokensTypeScript(result: TokenBuildResult): string {
  const tokens = uniqueRoleTokensForOutput(result, 'public-typescript')

  return `/* ${generatedNotice} */\nimport type { TokenName } from './token-names'\n\nexport const tokens = {\n${entries(tokens, (token) => stringLiteral(`var(${token.cssVariable})`))}\n} as const satisfies Record<TokenName, string>\n`
}

export function createTokensTypeScriptFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/tokens',
    format: () => formatTokensTypeScript(requireBuildResult(context)),
  }
}

export function formatTokenNames(result: TokenBuildResult): string {
  const names = uniqueRoleTokensForOutput(result, 'public-token-names')
    .map((token) => `  ${stringLiteral(token.name)},`)
    .join('\n')

  return `/* ${generatedNotice} */\nexport const tokenNames = [\n${names}\n] as const\n\nexport type TokenName = (typeof tokenNames)[number]\n`
}

export function createTokenNamesFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/token-names',
    format: () => formatTokenNames(requireBuildResult(context)),
  }
}

const generatedThemeFamily = {
  'font-family': 'font',
  'font-weight': 'fontWeight',
  'line-height': 'leading',
  radius: 'radius',
  shadow: 'shadow',
} as const

function mappingLine(mapping: UnoCssMappingRecord): string {
  const classes = mapping.classes.map(stringLiteral).join(', ')
  const properties = mapping.allowedCssProperties.map(stringLiteral).join(', ')

  return `  {
    roleId: ${stringLiteral(mapping.roleId)},
    cssVariable: ${stringLiteral(mapping.cssVariable)},
    generatorKind: ${stringLiteral(mapping.generatorKind)},
    family: ${stringLiteral(mapping.family)},
    key: ${stringLiteral(mapping.key)},
    classes: [${classes}],
    allowedCssProperties: [${properties}],
  },`
}

export function unoCssProjection(result: TokenBuildResult): UnoCssProjection {
  const tokens = uniqueRoleTokensForOutput(result, 'unocss')
  const tokensByRole = new Map(tokens.map((token) => [token.name, token]))
  const mappingRoles = new Set<string>()
  const classes = new Set<string>()
  const families = new Map<string, Map<string, string>>()
  const rules: UnoCssRuleProjection[] = []
  const themeEntries: UnoCssThemeEntryProjection[] = []

  for (const mapping of result.unoCssMappings) {
    if (mappingRoles.has(mapping.roleId)) {
      throw new Error(`${mapping.roleId}: duplicate UnoCSS mapping record.`)
    }

    mappingRoles.add(mapping.roleId)

    const token = tokensByRole.get(mapping.roleId)

    if (token?.cssVariable !== mapping.cssVariable) {
      throw new Error(`${mapping.roleId}: UnoCSS mapping has no matching public Token output.`)
    }

    for (const className of mapping.classes) {
      if (classes.has(className)) {
        throw new Error(`${mapping.roleId}: UnoCSS class "${className}" collides.`)
      }

      classes.add(className)
    }

    if (mapping.generatorKind === 'exact-rule') {
      const declarations = Object.fromEntries(
        mapping.allowedCssProperties.map((property) => [property, `var(${mapping.cssVariable})`]),
      )

      for (const className of mapping.classes) {
        rules.push({
          className,
          declarations,
          roleId: mapping.roleId,
        })
      }
      continue
    }

    const targetFamily = (generatedThemeFamily as Readonly<Record<string, string | undefined>>)[
      mapping.family
    ]

    if (targetFamily === undefined) {
      throw new Error(`${mapping.roleId}: unsupported UnoCSS Theme family "${mapping.family}".`)
    }

    const family = families.get(targetFamily) ?? new Map<string, string>()

    if (family.has(mapping.key)) {
      throw new Error(
        `${mapping.roleId}: UnoCSS Theme key "${targetFamily}.${mapping.key}" collides.`,
      )
    }

    const value = `var(${mapping.cssVariable})`

    family.set(mapping.key, value)
    families.set(targetFamily, family)
    themeEntries.push({
      family: targetFamily,
      key: mapping.key,
      roleId: mapping.roleId,
      value,
    })
  }

  const tokenRoleIds = [...tokensByRole.keys()].sort(compareCodePoints)
  const mappingRoleIds = [...mappingRoles].sort(compareCodePoints)

  if (
    tokenRoleIds.length !== mappingRoleIds.length ||
    tokenRoleIds.some((roleId, index) => roleId !== mappingRoleIds[index])
  ) {
    throw new Error(
      `UnoCSS public role completeness failed: tokens=[${tokenRoleIds.join(', ')}], mappings=[${mappingRoleIds.join(', ')}].`,
    )
  }

  return {
    mappings: result.unoCssMappings,
    rules: rules.sort((left, right) => compareCodePoints(left.className, right.className)),
    theme: Object.fromEntries(
      [...families.entries()]
        .sort(([left], [right]) => compareCodePoints(left, right))
        .map(([family, values]) => [
          family,
          Object.fromEntries(
            [...values.entries()]
              .sort(([left], [right]) => compareCodePoints(left, right))
              .map(([key, value]) => [key, value]),
          ),
        ]),
    ),
    themeEntries: themeEntries.sort((left, right) => compareCodePoints(left.roleId, right.roleId)),
  }
}

export function formatUnoCssTheme(result: TokenBuildResult): string {
  const projection = unoCssProjection(result)
  const mappingLines = projection.mappings.map(mappingLine).join('\n')
  const ruleLines = projection.rules
    .map((rule) => {
      const declarations = Object.entries(rule.declarations)
        .sort(([left], [right]) => compareCodePoints(left, right))
        .map(([property, value]) => `      ${propertyName(property)}: ${stringLiteral(value)},`)
        .join('\n')

      return `  [
    ${stringLiteral(rule.className)},
    {
${declarations}
    },
  ],`
    })
    .join('\n')
  const familyLines = Object.entries(projection.theme)
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([family, values]) => {
      const valueLines = Object.entries(values)
        .sort(([left], [right]) => compareCodePoints(left, right))
        .map(([key, value]) => `    ${propertyName(key)}: ${stringLiteral(value)},`)
        .join('\n')

      return `  ${family}: {\n${valueLines}\n  },`
    })
    .join('\n')

  return `/* ${generatedNotice} */
export const platformUnoMappings = [
${mappingLines}
] as const

export const platformRules = [
${ruleLines}
] as const

export const platformTheme = {
${familyLines}
} as const
`
}

export function createUnoCssThemeFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/unocss-theme',
    format: () => formatUnoCssTheme(requireBuildResult(context)),
  }
}
