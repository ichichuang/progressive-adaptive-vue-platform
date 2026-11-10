import type { Format } from 'style-dictionary/types'

import { builtInThemeIds, type BuiltInThemeDefinition } from '../../schema/complete-theme.schema'
import { formatOpaqueSrgbColor } from '../../schema/css-color'
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
        uiPalette: theme.uiPalette,
      },
      source: theme.source,
      uiPalette: theme.uiPalette,
      bank: {
        visibility: 'ui-internal' as const,
        records,
      },
    }
  })
  const customBankVariables = [
    ...new Set(builtInEntries[0]?.bank.records.map((record) => record.bankVariable) ?? []),
  ]

  if (
    customBankVariables.length !==
    themeColorModes.length * themeContrasts.length * publicColors.length
  ) {
    throw new Error('Generated Custom Theme Bank allowlist must contain exactly 120 variables.')
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
  if (representative === undefined) throw new Error('The Built-in Theme Registry is empty.')
  const references = new Map<unknown, string>([
    [document.activePublicColorRoles, 'activePublicColorRoles'],
    [document.customBankVariables, 'bankTemplates.map((record) => record.bankVariable)'],
    [
      document.builtInRegistryOrder,
      `[\n${document.builtInRegistryOrder.map((id) => `    ${stringLiteral(id)},`).join('\n')}\n  ]`,
    ],
  ])
  const sharedPlanes = representative.definition.planes
  let paletteColorCount = 0
  const paletteShape = (value: unknown): unknown =>
    typeof value === 'string'
      ? paletteColorCount++
      : Object.fromEntries(
          Object.entries(value as Readonly<Record<string, unknown>>).map(([key, item]) => [
            key,
            paletteShape(item),
          ]),
        )
  const planeShape = paletteShape(representative.uiPalette.light.standard)
  const packedPalette = (value: unknown): string =>
    typeof value === 'string'
      ? value.slice(1)
      : Object.values(value as Readonly<Record<string, unknown>>)
          .map(packedPalette)
          .join('')
  const encodePalette = (value: unknown): string => {
    const colors = packedPalette(value)
    if (colors.length !== paletteColorCount * 4 * 6 || !/^[0-9A-F]+$/u.test(colors)) {
      throw new Error('The Built-in Theme Registry palette is incomplete or invalid.')
    }
    return Buffer.from(colors, 'hex').toString('base64')
  }
  for (const entry of document.builtInEntries) {
    const planes =
      JSON.stringify(entry.definition.planes) === JSON.stringify(sharedPlanes)
        ? 'authoredPlanes'
        : typeScriptLiteral(entry.definition.planes, 6)
    references.set(
      entry,
      `createBuiltInTheme(\n      ${stringLiteral(entry.themeId)},\n      ${stringLiteral(entry.definition.label)},\n      ${stringLiteral(entry.source)},\n      ${planes},\n      ${stringLiteral(encodePalette(entry.uiPalette))},\n    )`,
    )
  }
  return `/* ${generatedNotice} */
import type { ThemeColorPalettes } from '../schema/theme-color-palette.schema'

const activePublicColorRoles = ${typeScriptLiteral(document.activePublicColorRoles)} as const
const bankTemplates = (['light', 'dark'] as const).flatMap((colorMode) =>
  (['standard', 'enhanced'] as const).flatMap((contrast) =>
    activePublicColorRoles.map((role) => ({
      colorMode,
      contrast,
      publicRole: role.publicRole,
      sourceField: 'planes.' + colorMode + '.' + contrast + '.' + role.publicRole,
      bankVariable:
        '--ui-theme-bank-' +
        colorMode +
        '-' +
        contrast +
        '-' +
        role.publicBinding.slice('--ui-color-'.length),
      publicBinding: role.publicBinding,
    })),
  ),
)
const authoredPlanes = ${typeScriptLiteral(sharedPlanes)} as const
const paletteShape = ${typeScriptLiteral(planeShape)} as const

type ThemeId = ${builtInThemeIds.map(stringLiteral).join(' | ')}
type PublicColorRole = (typeof activePublicColorRoles)[number]['publicRole']
type ThemePlane = Readonly<Record<PublicColorRole, string>>
interface ThemePlanes {
  readonly light: { readonly standard: ThemePlane; readonly enhanced: ThemePlane }
  readonly dark: { readonly standard: ThemePlane; readonly enhanced: ThemePlane }
}

function resolvePaletteValue(value: string, palette: unknown): string {
  if (!value.startsWith('{palette.')) return value
  let resolved: unknown = palette
  for (const key of value.slice('{palette.'.length, -1).split('.')) {
    if (resolved === null || typeof resolved !== 'object')
      throw new Error('Invalid generated palette path.')
    resolved = (resolved as Readonly<Record<string, unknown>>)[key]
  }
  if (typeof resolved !== 'string') throw new Error('Missing generated palette color.')
  return resolved
}

function decodePalette(packed: string): ThemeColorPalettes {
  const bytes = atob(packed)
  if (bytes.length !== ${String(paletteColorCount * 4 * 3)}) throw new Error('Incomplete generated palette.')
  const digits = '0123456789ABCDEF'
  const hex = (offset: number) =>
    digits.charAt(bytes.charCodeAt(offset) >> 4) + digits.charAt(bytes.charCodeAt(offset) & 15)
  function plane(offset: number): ThemeColorPalettes['light']['standard'] {
    function decode(shape: unknown): unknown {
      if (typeof shape === 'number') {
        const index = (offset + shape) * 3
        if (!Number.isInteger(index) || index < 0 || index + 2 >= bytes.length)
          throw new Error('Missing generated palette value.')
        return '#' + hex(index) + hex(index + 1) + hex(index + 2)
      }
      return Object.fromEntries(
        Object.entries(shape as Readonly<Record<string, unknown>>).map(([key, value]) => [
          key,
          decode(value),
        ]),
      )
    }
    return decode(paletteShape) as ThemeColorPalettes['light']['standard']
  }
  return {
    light: { standard: plane(0), enhanced: plane(${String(paletteColorCount)}) },
    dark: { standard: plane(${String(paletteColorCount * 2)}), enhanced: plane(${String(paletteColorCount * 3)}) },
  }
}

function createBuiltInTheme(
  themeId: ThemeId,
  label: string,
  source: string,
  planes: ThemePlanes,
  packedPalette: string,
) {
  const uiPalette = decodePalette(packedPalette)
  const records = bankTemplates.map((template) => {
    const authoredValue = planes[template.colorMode][template.contrast][template.publicRole]
    return {
      ...template,
      authoredValue,
      resolvedValue: resolvePaletteValue(
        authoredValue,
        uiPalette[template.colorMode][template.contrast],
      ),
    }
  })
  return {
    registryKind: 'built-in',
    themeId,
    definition: { schemaVersion: ${String(representative.definition.schemaVersion)}, roleContractVersion: ${String(representative.definition.roleContractVersion)}, id: themeId, label, planes, uiPalette },
    source,
    uiPalette,
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
          declarations: {
            [binding.cssProperty]:
              mapping.family === 'content-size' && binding.cssProperty === 'grid-template-columns'
                ? `repeat(auto-fit, minmax(min(100%, var(${mapping.cssVariable})), 1fr))`
                : `var(${mapping.cssVariable})`,
          },
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
        .map(([property, value]) => {
          const declaration = `      ${propertyName(property)}: ${stringLiteral(value)},`

          return declaration.length <= 100
            ? declaration
            : `      ${propertyName(property)}:\n        ${stringLiteral(value)},`
        })
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
