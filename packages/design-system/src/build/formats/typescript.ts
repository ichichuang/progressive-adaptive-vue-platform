import type { Format } from 'style-dictionary/types'

import { builtInThemeIds, type BuiltInThemeDefinition } from '../../schema/complete-theme.schema'
import { formatOpaqueSrgbColor } from '../../schema/css-color'
import { legacyBuiltInThemeIds } from '../../schema/legacy-seed-theme.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import {
  isActivePublicColorRole,
  type PublicRoleRecord,
  type UnoCssMappingRecord,
} from '../public-role-registry'
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

function typeScriptLiteral(
  value: unknown,
  indentation = 0,
  references?: ReadonlyMap<unknown, string>,
): string {
  const reference = references?.get(value)
  if (reference !== undefined) return reference
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
    const compact = `[${value.map((entry) => typeScriptLiteral(entry, 0, references)).join(', ')}]`

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
      .map(
        (entry) =>
          `${' '.repeat(indentation + 2)}${typeScriptLiteral(entry, indentation + 2, references)},`,
      )
      .join('\n')

    return `[\n${values}\n${padding}]`
  }

  if (typeof value === 'object') {
    const padding = ' '.repeat(indentation)
    const properties = Object.entries(value)
      .map(
        ([key, entry]) =>
          `${' '.repeat(indentation + 2)}${propertyName(key)}: ${typeScriptLiteral(entry, indentation + 2, references)},`,
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

export function deriveThemeBankRecords(
  planes: BuiltInThemeDefinition['planes'],
  activePublicRoles: readonly PublicRoleRecord[],
) {
  const publicColors = activePublicRoles.filter(isActivePublicColorRole)

  return themeColorModes.flatMap((colorMode) =>
    themeContrasts.flatMap((contrast) =>
      publicColors.map((role) => {
        const authoredValue = planes[colorMode][contrast][role.id]

        if (authoredValue === undefined) {
          throw new Error(`planes.${colorMode}.${contrast}.${role.id}: Bank value is missing.`)
        }

        return {
          colorMode,
          contrast,
          publicRole: role.id,
          sourceField: `planes.${colorMode}.${contrast}.${role.id}`,
          authoredValue,
          bankVariable: bankVariable(colorMode, contrast, role.cssVariable),
          publicBinding: role.cssVariable,
        }
      }),
    ),
  )
}

export function themeRegistryDocument(result: TokenBuildResult) {
  const publicColors = result.activePublicRoles.filter(isActivePublicColorRole)
  const themesById = new Map(result.completeThemes.map((theme) => [theme.id, theme]))
  const builtInEntries = builtInThemeIds.map((themeId) => {
    const theme = themesById.get(themeId)

    if (theme === undefined) {
      throw new Error(`${themeId}: generated Built-in Theme Registry entry is missing.`)
    }

    const records = deriveThemeBankRecords(theme.planes, result.activePublicRoles).map((record) => {
      const resolvedValue =
        theme.resolvedPlanes[record.colorMode][record.contrast][record.publicRole]

      if (resolvedValue === undefined) {
        throw new Error(`${themeId}:${record.sourceField}: resolved Bank value is missing.`)
      }

      return {
        colorMode: record.colorMode,
        contrast: record.contrast,
        publicRole: record.publicRole,
        sourceField: record.sourceField,
        authoredValue: record.authoredValue,
        resolvedValue,
        bankVariable: record.bankVariable,
        publicBinding: record.publicBinding,
      }
    })

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

  if (customBankVariables.length !== themeColorModes.length * themeContrasts.length * 26) {
    throw new Error('Generated Custom Theme Bank allowlist must contain exactly 104 variables.')
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
  const legacyBuiltInThemeTuples = legacyBuiltInThemeIds.map((themeId) => {
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

export function statusSupplementaryDocument(result: TokenBuildResult) {
  return Object.fromEntries(
    themeColorModes.map((mode) => [
      mode,
      Object.fromEntries(
        themeContrasts.map((contrast) => [
          contrast,
          Object.fromEntries(
            ['info', 'success', 'warning', 'error'].map((tone) => {
              const path = `color.palette.status.${mode}.${contrast}.${tone}.supplementary`
              const token = result.tokens.find((record) => record.path === path)

              if (token?.type !== 'color' || token.visibility !== 'build-only') {
                throw new Error(`${path}: canonical Status Supplementary source is missing.`)
              }

              return [tone, formatOpaqueSrgbColor(tokenValueToCss('color', token.resolvedValue))]
            }),
          ),
        ]),
      ),
    ]),
  )
}

export function formatThemeRegistryTypeScript(result: TokenBuildResult): string {
  const document = {
    ...themeRegistryDocument(result),
    statusSupplementary: statusSupplementaryDocument(result),
  }
  const representative = document.builtInEntries[0]
  if (representative === undefined)
    throw new Error('The shared Status Bank requires a Built-in Theme.')
  const isStatus = (value: string) => value.startsWith('{color.palette.status.')
  const statusRecords = representative.bank.records.filter((record) =>
    isStatus(record.authoredValue),
  )
  const bankTemplates = representative.bank.records.map((record) => ({
    colorMode: record.colorMode,
    contrast: record.contrast,
    publicRole: record.publicRole,
    sourceField: record.sourceField,
    bankVariable: record.bankVariable,
    publicBinding: record.publicBinding,
  }))
  const sharedStatus = Object.fromEntries(
    themeColorModes.map((mode) => [
      mode,
      Object.fromEntries(
        themeContrasts.map((contrast) => [
          contrast,
          statusRecords
            .filter((record) => record.colorMode === mode && record.contrast === contrast)
            .map((record) => [record.publicRole, record.authoredValue, record.resolvedValue]),
        ]),
      ),
    ]),
  )
  const references = new Map<unknown, string>([
    [document.activePublicColorRoles, 'activePublicColorRoles'],
    [
      document.customBankVariables,
      '[\n    bankTemplates[0].bankVariable,\n    ...bankTemplates.slice(1).map((record) => record.bankVariable),\n  ]',
    ],
  ])

  for (const entry of document.builtInEntries) {
    if (
      JSON.stringify(entry.bank.records.filter((record) => isStatus(record.authoredValue))) !==
        JSON.stringify(statusRecords) ||
      entry.bank.records.some(
        (record) =>
          !isStatus(record.authoredValue) && record.authoredValue !== record.resolvedValue,
      )
    ) {
      throw new Error(
        `${entry.themeId}: compact Registry requires shared Status and absolute historical values.`,
      )
    }
    const historicalPlanes = Object.fromEntries(
      themeColorModes.map((mode) => [
        mode,
        Object.fromEntries(
          themeContrasts.map((contrast) => [
            contrast,
            Object.fromEntries(
              Object.entries(entry.definition.planes[mode][contrast]).filter(
                ([, value]) => !isStatus(value),
              ),
            ),
          ]),
        ),
      ]),
    )
    const argumentsSource = [entry.themeId, entry.definition.label, entry.source].map(stringLiteral)
    const callStart = `createBuiltInTheme(${argumentsSource.join(', ')}, {`
    references.set(
      entry,
      callStart.length + 4 <= 100
        ? `createBuiltInTheme(${argumentsSource.join(', ')}, ${typeScriptLiteral(historicalPlanes, 4)})`
        : `createBuiltInTheme(\n${argumentsSource.map((argument) => `      ${argument},`).join('\n')}\n      ${typeScriptLiteral(historicalPlanes, 6)},\n    )`,
    )
  }

  return `/* ${generatedNotice} */
const activePublicColorRoles = ${typeScriptLiteral(document.activePublicColorRoles)} as const
const bankTemplates = ${typeScriptLiteral(bankTemplates)} as const
const sharedStatus = ${typeScriptLiteral(sharedStatus)} as const

type PublicColorRole = (typeof activePublicColorRoles)[number]['publicRole']
type StatusRole = (typeof sharedStatus.light.standard)[number][0]
type ThemePlane = Readonly<Record<PublicColorRole, string>>
type StatusPlane = Readonly<Record<StatusRole, string>>
type HistoricalPlane = Omit<ThemePlane, StatusRole>
interface ThemePlanes<Plane> {
  readonly light: { readonly standard: Plane; readonly enhanced: Plane }
  readonly dark: { readonly standard: Plane; readonly enhanced: Plane }
}

function statusPlane(
  records: readonly (readonly [StatusRole, string, string])[],
  valueIndex: 1 | 2,
): StatusPlane {
  return Object.fromEntries(records.map((record) => [record[0], record[valueIndex]])) as StatusPlane
}

const statusAuthoredPlanes = {
  light: {
    standard: statusPlane(sharedStatus.light.standard, 1),
    enhanced: statusPlane(sharedStatus.light.enhanced, 1),
  },
  dark: {
    standard: statusPlane(sharedStatus.dark.standard, 1),
    enhanced: statusPlane(sharedStatus.dark.enhanced, 1),
  },
} as const
const statusResolvedValues = new Map<string, string>(
  [
    ...sharedStatus.light.standard,
    ...sharedStatus.light.enhanced,
    ...sharedStatus.dark.standard,
    ...sharedStatus.dark.enhanced,
  ].map((record) => [record[1], record[2]]),
)

type BuiltInThemeId =
${builtInThemeIds.map((id) => `  | ${stringLiteral(id)}`).join('\n')}

function createBuiltInTheme<const Id extends BuiltInThemeId>(
  themeId: Id,
  label: string,
  source: string,
  historicalPlanes: ThemePlanes<HistoricalPlane>,
) {
  const planes = {
    light: {
      standard: { ...historicalPlanes.light.standard, ...statusAuthoredPlanes.light.standard },
      enhanced: { ...historicalPlanes.light.enhanced, ...statusAuthoredPlanes.light.enhanced },
    },
    dark: {
      standard: { ...historicalPlanes.dark.standard, ...statusAuthoredPlanes.dark.standard },
      enhanced: { ...historicalPlanes.dark.enhanced, ...statusAuthoredPlanes.dark.enhanced },
    },
  } satisfies ThemePlanes<ThemePlane>
  const records = bankTemplates.map((record) => {
    const authoredValue = planes[record.colorMode][record.contrast][record.publicRole]
    // The generator proves historical cells are absolute and every shared Status alias resolves.
    const resolvedValue = statusResolvedValues.get(authoredValue) ?? authoredValue
    return {
      colorMode: record.colorMode,
      contrast: record.contrast,
      publicRole: record.publicRole,
      sourceField: record.sourceField,
      authoredValue,
      resolvedValue,
      bankVariable: record.bankVariable,
      publicBinding: record.publicBinding,
    } as const
  })
  return {
    registryKind: 'built-in',
    themeId,
    definition: { schemaVersion: ${String(representative.definition.schemaVersion)}, roleContractVersion: ${String(representative.definition.roleContractVersion)}, id: themeId, label, planes },
    source,
    bank: { visibility: 'ui-internal', records },
  } as const
}

export const generatedThemeRegistry = ${typeScriptLiteral(document, 0, references)} as const
`
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
  return tokens
    .map((token) => {
      const property = stringLiteral(token.name)
      const propertyValue = value(token)
      const compact = `  ${property}: ${propertyValue},`

      return compact.length <= 100 ? compact : `  ${property}:\n    ${propertyValue},`
    })
    .join('\n')
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
  if (mapping.generatorKind === 'property-specific-exact-rule') {
    return `  ${typeScriptLiteral(mapping, 2)},`
  }

  if (mapping.generatorKind === 'container-variant') {
    return `  {
    roleId: ${stringLiteral(mapping.roleId)},
    cssVariable: ${stringLiteral(mapping.cssVariable)},
    generatorKind: ${stringLiteral(mapping.generatorKind)},
    family: ${stringLiteral(mapping.family)},
    key: ${stringLiteral(mapping.key)},
    containerName: ${stringLiteral(mapping.containerName)},
    containerType: ${stringLiteral(mapping.containerType)},
    measurementAxis: ${stringLiteral(mapping.measurementAxis)},
    boundaryContributions: ${typeScriptLiteral(mapping.boundaryContributions, 4)},
  },`
  }

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

    if (mapping.generatorKind === 'container-variant') {
      continue
    }

    const mappingClasses =
      mapping.generatorKind === 'property-specific-exact-rule'
        ? mapping.bindings.map((binding) => binding.className)
        : mapping.classes

    for (const className of mappingClasses) {
      if (classes.has(className)) {
        throw new Error(`${mapping.roleId}: UnoCSS class "${className}" collides.`)
      }

      classes.add(className)
    }

    if (mapping.generatorKind === 'property-specific-exact-rule') {
      for (const binding of mapping.bindings) {
        rules.push({
          className: binding.className,
          declarations: { [binding.cssProperty]: `var(${mapping.cssVariable})` },
          roleId: mapping.roleId,
        })
      }
      continue
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
