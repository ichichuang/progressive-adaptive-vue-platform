import type { Format } from 'style-dictionary/types'

import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import type { UnoCssMappingRecord } from '../public-role-registry'
import {
  generatedNotice,
  requireBuildResult,
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
