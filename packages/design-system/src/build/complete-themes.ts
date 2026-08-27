import { createHash } from 'node:crypto'

import Color from 'colorjs.io'

import {
  builtInThemeIds,
  completeBuiltInThemeDefinitionSchema,
  completeThemeRoleContractVersion,
  type BuiltInThemeId,
  type completeThemeSchemaVersion,
} from '../schema/complete-theme.schema'
import { isTokenReference, tokenPathFromReference } from '../schema/token.schema'
import { tokenValueToCss } from './formats/shared'
import { compareCodePoints } from './order'
import { parseJsonSource } from './parse-json'
import {
  ActiveAlphaContractRegistry,
  ActiveNamedContrastRegistry,
  isActivePublicColorRole,
  PublicRoleRegistry,
  validateAlphaContractRegistry,
  validateNamedContrastRegistry,
  validatePublicRoleRegistry,
} from './public-role-registry'
import type { TokenResolver } from './resolve'

const colorModes = ['light', 'dark'] as const
const contrastLevels = ['standard', 'enhanced'] as const
const completeThemeSourcePattern = /^themes\/complete\/([a-z][a-z0-9-]*)\.theme\.json$/u
const resolvedColorEqualityToleranceDeltaEOK = 1e-6
const preRefinementActionPrimaryValues = {
  amber: [
    'oklch(49% 0.0898 78)',
    'oklch(37% 0.0678 78)',
    'oklch(70% 0.0892 78)',
    'oklch(83% 0.0735 78)',
  ],
  cobalt: [
    'oklch(49% 0.145 258)',
    'oklch(37% 0.1131 258)',
    'oklch(70% 0.1232 258)',
    'oklch(83% 0.075 258)',
  ],
  coral: [
    'oklch(49% 0.13 32)',
    'oklch(37% 0.1014 32)',
    'oklch(70% 0.1105 32)',
    'oklch(83% 0.0838 32)',
  ],
  graphite: [
    'oklch(49% 0.035 255)',
    'oklch(37% 0.0273 255)',
    'oklch(70% 0.0297 255)',
    'oklch(83% 0.0245 255)',
  ],
  iris: [
    'oklch(49% 0.13 300)',
    'oklch(37% 0.1014 300)',
    'oklch(70% 0.1105 300)',
    'oklch(83% 0.0877 300)',
  ],
  jade: [
    'oklch(49% 0.11 150)',
    'oklch(37% 0.0858 150)',
    'oklch(70% 0.0935 150)',
    'oklch(83% 0.077 150)',
  ],
  lagoon: [
    'oklch(49% 0.0736 205)',
    'oklch(37% 0.0556 205)',
    'oklch(70% 0.0807 205)',
    'oklch(83% 0.0664 205)',
  ],
  'stone-blue-ash': [
    'oklch(0.490 0.050 255)',
    'oklch(0.420 0.055 255)',
    'oklch(0.780 0.045 255)',
    'oklch(0.880 0.040 255)',
  ],
  'misty-rose-blue': [
    'oklch(0.490 0.055 340)',
    'oklch(0.420 0.060 340)',
    'oklch(0.780 0.050 340)',
    'oklch(0.880 0.045 340)',
  ],
  'honey-apricot-cream': [
    'oklch(0.490 0.110 050)',
    'oklch(0.420 0.1110 050)',
    'oklch(0.780 0.100 050)',
    'oklch(0.880 0.0710 050)',
  ],
  'cerulean-sky-navy': [
    'oklch(0.490 0.1039 235)',
    'oklch(0.420 0.0891 235)',
    'oklch(0.780 0.110 235)',
    'oklch(0.880 0.0690 235)',
  ],
  'lavender-ivory': [
    'oklch(0.490 0.100 280)',
    'oklch(0.420 0.110 280)',
    'oklch(0.780 0.090 280)',
    'oklch(0.880 0.0595 280)',
  ],
  'denim-cocoa': [
    'oklch(0.490 0.115 040)',
    'oklch(0.420 0.125 040)',
    'oklch(0.780 0.105 040)',
    'oklch(0.880 0.0662 040)',
  ],
  'burgundy-snow': [
    'oklch(0.490 0.110 350)',
    'oklch(0.420 0.120 350)',
    'oklch(0.780 0.095 350)',
    'oklch(0.880 0.0754 350)',
  ],
} as const satisfies Record<BuiltInThemeId, readonly [string, string, string, string]>
const preRefinementUnchangedCellHashes = {
  amber: '7bd9e883cfd11c5f6226e37e8fc66916843eb6df6bc892f2a5626698e048402f',
  cobalt: '4e39ed2f03423cd6764c861101f5455fd49142ef0ef0ab74294a893da3ddf061',
  coral: '3aba2a1c7beac5144f427cd8560f33972278810367381bf8bbd1f7cddbc9b83e',
  graphite: 'f499ff3002819de7c0ad5eb74fdeba2e12ab2d1d01a16c90cc2be15ae4e2a8fb',
  iris: '6ebb12a619db9736e87aec852b1a5e797adaaf0e8e7435559c88f208e30aa286',
  jade: '3dc2b6e3e603003a200b0cbfd9332c67f6ed3f7944823ebd2f8606542c1d6d7f',
  lagoon: '90169c19bee5143572d7b80398351e4dada8f54bb41d0b06add7da58d7b58d77',
  'stone-blue-ash': '09a323bf712606862010156b9d16c1a26df690243e27ca816cbe0a918a037706',
  'misty-rose-blue': 'c1129577b20133cd3ba80897d621eaa3d9a4ec6cbd00bd8e6fe3c036514c2808',
  'honey-apricot-cream': '0a4a58902af3a48466056194c217cf555640970b9de14c010fdd338be2a155fc',
  'cerulean-sky-navy': 'a96c9a7e769d417ef4f4be4498317bd4f1953dd481440e40a10543fc298a11d3',
  'lavender-ivory': '18da738cf03abe27528b1c383eb47a865156b318df79b8b2fb80d6ad4f1fd1b4',
  'denim-cocoa': '574bfff9055d134a721a33f5d9e17b09acb49abbd873691f0388d8a35910f07a',
  'burgundy-snow': '7e10ae620c301a30c0da07f76c9ee4301b8bb0db8a4229880b35b4763426a2f7',
} as const satisfies Record<BuiltInThemeId, string>

type ColorMode = (typeof colorModes)[number]
type ContrastLevel = (typeof contrastLevels)[number]
type CompleteColorRoleMap = Readonly<Record<string, string>>

interface CompleteThemePlanes {
  readonly light: {
    readonly standard: CompleteColorRoleMap
    readonly enhanced: CompleteColorRoleMap
  }
  readonly dark: {
    readonly standard: CompleteColorRoleMap
    readonly enhanced: CompleteColorRoleMap
  }
}

export interface ValidatedCompleteBuiltInTheme {
  readonly activationStatus: 'TARGET_INACTIVE'
  readonly absoluteColorValueCount: number
  readonly authoredColorValueCount: number
  readonly id: BuiltInThemeId
  readonly label: string
  readonly planes: CompleteThemePlanes
  readonly primitiveAliasValueCount: number
  readonly registryKind: 'built-in'
  readonly resolvedPlanes: CompleteThemePlanes
  readonly roleContractVersion: typeof completeThemeRoleContractVersion
  readonly schemaVersion: typeof completeThemeSchemaVersion
  readonly selector: string
  readonly source: string
}

interface CompleteThemeSourceBundle {
  readonly contents: string
  readonly path: string
}

interface ValidatedRoleMap {
  absoluteColorValueCount: number
  authored: CompleteColorRoleMap
  primitiveAliasValueCount: number
  resolved: CompleteColorRoleMap
}

function assertExactValues(
  actualValues: readonly string[],
  expectedValues: readonly string[],
  description: string,
): void {
  const actual = [...actualValues].sort(compareCodePoints)
  const expected = [...expectedValues].sort(compareCodePoints)

  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${description}: expected [${expected.join(', ')}], received [${actual.join(', ')}].`,
    )
  }
}

function assertExactOrder(
  actualValues: readonly string[],
  expectedValues: readonly string[],
  description: string,
): void {
  if (
    actualValues.length !== expectedValues.length ||
    actualValues.some((value, index) => value !== expectedValues[index])
  ) {
    throw new Error(
      `${description}: expected [${expectedValues.join(', ')}], received [${actualValues.join(', ')}].`,
    )
  }
}

function parsedColor(value: string, context: string): Color {
  let color: Color

  try {
    color = new Color(value)
  } catch {
    throw new Error(`${context}: invalid absolute CSS color "${value}".`)
  }

  if (!color.inGamut('srgb')) {
    throw new Error(`${context}: color must be representable in the sRGB gamut.`)
  }

  return color
}

function resolveAuthoredColor(
  authoredValue: string,
  themeId: BuiltInThemeId,
  fieldPath: string,
  resolver: TokenResolver,
): { resolvedValue: string; sourceKind: 'absolute' | 'direct-primitive-alias' } {
  if (!isTokenReference(authoredValue)) {
    parsedColor(authoredValue, `${themeId}:${fieldPath}`)
    return {
      resolvedValue: authoredValue,
      sourceKind: 'absolute',
    }
  }

  const targetPath = tokenPathFromReference(authoredValue)
  const target = resolver.records.find((record) => record.path === targetPath)

  if (
    target?.tier !== 'primitive' ||
    target.visibility !== 'build-only' ||
    target.type !== 'color' ||
    target.reference !== undefined
  ) {
    throw new Error(
      `${themeId}:${fieldPath}: aliases must directly reference a literal build-only Primitive color.`,
    )
  }

  const resolvedValue = tokenValueToCss('color', target.resolvedValue)

  parsedColor(resolvedValue, `${themeId}:${fieldPath}`)
  return {
    resolvedValue,
    sourceKind: 'direct-primitive-alias',
  }
}

function validateRoleMap(
  map: Record<string, string>,
  roleIds: readonly string[],
  themeId: BuiltInThemeId,
  mode: ColorMode,
  contrast: ContrastLevel,
  resolver: TokenResolver,
): ValidatedRoleMap {
  const fieldRoot = `planes.${mode}.${contrast}`

  assertExactOrder(Object.keys(map), roleIds, `${themeId}:${fieldRoot} public color role order`)

  const authoredEntries: [string, string][] = []
  const resolvedEntries: [string, string][] = []
  let absoluteColorValueCount = 0
  let primitiveAliasValueCount = 0

  for (const roleId of roleIds) {
    const authoredValue = map[roleId]

    if (authoredValue === undefined) {
      throw new Error(`${themeId}:${fieldRoot}.${roleId}: authored value is missing.`)
    }

    const { resolvedValue, sourceKind } = resolveAuthoredColor(
      authoredValue,
      themeId,
      `${fieldRoot}.${roleId}`,
      resolver,
    )
    const alpha = parsedColor(resolvedValue, `${themeId}:${fieldRoot}.${roleId}`).alpha
    const alphaRecord = ActiveAlphaContractRegistry.records.find(
      (record) => record.roleId === roleId,
    )

    if (alphaRecord === undefined ? alpha !== 1 : alpha !== alphaRecord.minimumAlpha) {
      const expected = alphaRecord?.minimumAlpha ?? 1

      throw new Error(
        `${themeId}:${fieldRoot}.${roleId}: Alpha ${String(alpha)} must equal ${String(expected)}.`,
      )
    }

    if (sourceKind === 'absolute') {
      absoluteColorValueCount += 1
    } else {
      primitiveAliasValueCount += 1
    }

    authoredEntries.push([roleId, authoredValue])
    resolvedEntries.push([roleId, resolvedValue])
  }

  return {
    absoluteColorValueCount,
    authored: Object.fromEntries(authoredEntries),
    primitiveAliasValueCount,
    resolved: Object.fromEntries(resolvedEntries),
  }
}

function contrastRatio(foreground: string, background: string): number {
  return parsedColor(foreground, 'Named Contrast foreground').contrastWCAG21(
    parsedColor(background, 'Named Contrast background'),
  )
}

function validateNamedContrasts(theme: ValidatedCompleteBuiltInTheme): void {
  const namedContrasts = validateNamedContrastRegistry(
    ActiveNamedContrastRegistry,
    validatePublicRoleRegistry(PublicRoleRegistry),
  ).filter((record) => record.staticMaterialProjections.length === 0)

  for (const mode of colorModes) {
    for (const contrast of contrastLevels) {
      const plane = theme.resolvedPlanes[mode][contrast]

      for (const pair of namedContrasts) {
        const foreground = plane[pair.foregroundRole]
        const background = plane[pair.backgroundRole]

        if (foreground === undefined || background === undefined) {
          throw new Error(`${theme.id}:${mode}.${contrast}:${pair.id}: endpoint is missing.`)
        }

        const ratio = contrastRatio(foreground, background)
        const minimum = contrast === 'enhanced' ? pair.enhancedMinimum : pair.standardMinimum

        if (ratio < minimum) {
          throw new Error(
            `${theme.id}:${mode}.${contrast}:${pair.id}: contrast ${ratio.toFixed(3)}:1 is below ${String(minimum)}:1.`,
          )
        }
      }
    }
  }
}

function validateEnhancedPlanes(
  theme: ValidatedCompleteBuiltInTheme,
  roleIds: readonly string[],
): void {
  const stricterPairs = ActiveNamedContrastRegistry.records.filter(
    (record) =>
      record.staticMaterialProjections.length === 0 &&
      record.enhancedMinimum > record.standardMinimum,
  )

  for (const mode of colorModes) {
    const standard = theme.resolvedPlanes[mode].standard
    const enhanced = theme.resolvedPlanes[mode].enhanced

    if (roleIds.every((roleId) => standard[roleId] === enhanced[roleId])) {
      throw new Error(`${theme.id}:${mode}: Enhanced plane must not duplicate Standard.`)
    }

    if (
      stricterPairs.every(
        (pair) =>
          standard[pair.foregroundRole] === enhanced[pair.foregroundRole] &&
          standard[pair.backgroundRole] === enhanced[pair.backgroundRole],
      )
    ) {
      throw new Error(
        `${theme.id}:${mode}: Enhanced plane must intentionally change a stricter contrast endpoint.`,
      )
    }
  }
}

function validateDarkActionHarmony(theme: ValidatedCompleteBuiltInTheme): void {
  const oldActionValues = preRefinementActionPrimaryValues[theme.id]
  const planeTuples = [
    ['light', 'standard'],
    ['light', 'enhanced'],
    ['dark', 'standard'],
    ['dark', 'enhanced'],
  ] as const

  for (const [index, [colorMode, contrast]] of planeTuples.entries()) {
    const plane = theme.planes[colorMode][contrast]

    if (plane['color.control.primary'] !== oldActionValues[index]) {
      throw new Error(`${theme.id}:${colorMode}.${contrast}: Control Foreground copy drifted.`)
    }
  }

  const unchangedCells = planeTuples.flatMap(([colorMode, contrast]) =>
    Object.entries(theme.planes[colorMode][contrast]).flatMap(([roleId, value]) =>
      roleId === 'color.control.primary' ||
      (colorMode === 'dark' &&
        (roleId === 'color.action.primary' || roleId === 'color.text.on-action'))
        ? []
        : [[colorMode, contrast, roleId, value].join('\n')],
    ),
  )
  const unchangedHash = createHash('sha256').update(unchangedCells.join('\n---\n')).digest('hex')

  if (unchangedHash !== preRefinementUnchangedCellHashes[theme.id]) {
    throw new Error(`${theme.id}: one of the 448 unchanged pre-existing Theme cells drifted.`)
  }

  const standardAction = parsedColor(
    theme.resolvedPlanes.dark.standard['color.action.primary'] ?? '',
    `${theme.id}:dark.standard.color.action.primary`,
  ).to('oklch')
  const standardText = parsedColor(
    theme.resolvedPlanes.dark.standard['color.text.on-action'] ?? '',
    `${theme.id}:dark.standard.color.text.on-action`,
  ).to('oklch')
  const enhancedAction = parsedColor(
    theme.resolvedPlanes.dark.enhanced['color.action.primary'] ?? '',
    `${theme.id}:dark.enhanced.color.action.primary`,
  ).to('oklch')
  const enhancedText = parsedColor(
    theme.resolvedPlanes.dark.enhanced['color.text.on-action'] ?? '',
    `${theme.id}:dark.enhanced.color.text.on-action`,
  ).to('oklch')
  const standardActionLightness = standardAction.coords[0] ?? Number.NaN
  const standardTextLightness = standardText.coords[0] ?? Number.NaN
  const enhancedActionLightness = enhancedAction.coords[0] ?? Number.NaN
  const enhancedTextLightness = enhancedText.coords[0] ?? Number.NaN

  if (
    standardActionLightness > 0.5 ||
    standardTextLightness < 0.94 ||
    enhancedActionLightness > 0.38 ||
    enhancedTextLightness < 0.985 ||
    enhancedActionLightness >= standardActionLightness ||
    enhancedTextLightness < standardTextLightness
  ) {
    throw new Error(`${theme.id}: Dark Action Fill and On-action Content lightness drifted.`)
  }
}

function validateThemeIdentity(
  themes: readonly ValidatedCompleteBuiltInTheme[],
  roleIds: readonly string[],
): void {
  const identityTuples = themes.map((theme) => `${theme.registryKind}\n${theme.id}`)

  if (new Set(identityTuples).size !== identityTuples.length) {
    throw new Error('Complete built-in Theme identity tuples must be unique.')
  }

  for (const mode of colorModes) {
    for (const contrast of contrastLevels) {
      for (const roleId of roleIds) {
        for (const [leftIndex, leftTheme] of themes.entries()) {
          for (const rightTheme of themes.slice(leftIndex + 1)) {
            const leftValue = leftTheme.resolvedPlanes[mode][contrast][roleId]
            const rightValue = rightTheme.resolvedPlanes[mode][contrast][roleId]

            if (leftValue === undefined || rightValue === undefined) {
              throw new Error(`${mode}.${contrast}.${roleId}: Theme identity role is missing.`)
            }

            const difference = parsedColor(
              leftValue,
              `${leftTheme.id}:${mode}.${contrast}.${roleId}`,
            ).deltaEOK(parsedColor(rightValue, `${rightTheme.id}:${mode}.${contrast}.${roleId}`))

            if (
              !Number.isFinite(difference) ||
              difference <= resolvedColorEqualityToleranceDeltaEOK
            ) {
              throw new Error(
                `${mode}.${contrast}.${roleId}: Theme identity must remain present between ${leftTheme.id} and ${rightTheme.id}.`,
              )
            }
          }
        }
      }
    }
  }
}

function validateCompleteThemeSource(
  bundle: CompleteThemeSourceBundle,
  roleIds: readonly string[],
  resolver: TokenResolver,
): ValidatedCompleteBuiltInTheme {
  const pathMatch = completeThemeSourcePattern.exec(bundle.path)

  if (pathMatch === null) {
    throw new Error(`${bundle.path}: unsupported complete-theme source path.`)
  }

  const parsed = completeBuiltInThemeDefinitionSchema.safeParse(
    parseJsonSource(bundle.contents, bundle.path),
  )

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${bundle.path}:${issue.path.join('.') || '<root>'} ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid complete built-in Theme source:\n${issues}`)
  }

  const definition = parsed.data

  if (pathMatch[1] !== definition.id) {
    throw new Error(`${bundle.path}: source filename must match Theme id "${definition.id}".`)
  }

  const lightStandard = validateRoleMap(
    definition.planes.light.standard,
    roleIds,
    definition.id,
    'light',
    'standard',
    resolver,
  )
  const lightEnhanced = validateRoleMap(
    definition.planes.light.enhanced,
    roleIds,
    definition.id,
    'light',
    'enhanced',
    resolver,
  )
  const darkStandard = validateRoleMap(
    definition.planes.dark.standard,
    roleIds,
    definition.id,
    'dark',
    'standard',
    resolver,
  )
  const darkEnhanced = validateRoleMap(
    definition.planes.dark.enhanced,
    roleIds,
    definition.id,
    'dark',
    'enhanced',
    resolver,
  )
  const roleMaps = [lightStandard, lightEnhanced, darkStandard, darkEnhanced]
  const theme: ValidatedCompleteBuiltInTheme = {
    activationStatus: 'TARGET_INACTIVE',
    absoluteColorValueCount: roleMaps.reduce(
      (count, map) => count + map.absoluteColorValueCount,
      0,
    ),
    authoredColorValueCount: roleMaps.reduce(
      (count, map) => count + Object.keys(map.authored).length,
      0,
    ),
    id: definition.id,
    label: definition.label,
    planes: {
      light: {
        standard: lightStandard.authored,
        enhanced: lightEnhanced.authored,
      },
      dark: {
        standard: darkStandard.authored,
        enhanced: darkEnhanced.authored,
      },
    },
    primitiveAliasValueCount: roleMaps.reduce(
      (count, map) => count + map.primitiveAliasValueCount,
      0,
    ),
    registryKind: 'built-in',
    resolvedPlanes: {
      light: {
        standard: lightStandard.resolved,
        enhanced: lightEnhanced.resolved,
      },
      dark: {
        standard: darkStandard.resolved,
        enhanced: darkEnhanced.resolved,
      },
    },
    roleContractVersion: definition.roleContractVersion,
    schemaVersion: definition.schemaVersion,
    selector: `html[data-theme-kind='built-in'][data-theme='${definition.id}']`,
    source: bundle.path,
  }

  validateNamedContrasts(theme)
  validateEnhancedPlanes(theme, roleIds)
  validateDarkActionHarmony(theme)
  return theme
}

export function validateCompleteBuiltInThemes({
  bundles,
  resolver,
}: {
  bundles: readonly CompleteThemeSourceBundle[]
  resolver: TokenResolver
}): readonly ValidatedCompleteBuiltInTheme[] {
  const publicRoles = validatePublicRoleRegistry(PublicRoleRegistry)
  const roleIds = publicRoles.filter(isActivePublicColorRole).map((record) => record.id)

  validateAlphaContractRegistry(ActiveAlphaContractRegistry, publicRoles)
  validateNamedContrastRegistry(ActiveNamedContrastRegistry, publicRoles)

  const activeContractVersions: readonly number[] = [
    completeThemeRoleContractVersion,
    PublicRoleRegistry.schemaVersion,
    ActiveAlphaContractRegistry.schemaVersion,
    ActiveNamedContrastRegistry.schemaVersion,
  ]

  if (activeContractVersions.join(',') !== '2,1,1,1') {
    throw new Error('Complete Theme role-contract and registry schema versions are incomplete.')
  }

  if (bundles.length !== builtInThemeIds.length) {
    throw new Error(
      `Complete built-in Theme source count: expected ${String(builtInThemeIds.length)}, received ${String(bundles.length)}.`,
    )
  }

  const themes = bundles
    .map((bundle) => validateCompleteThemeSource(bundle, roleIds, resolver))
    .sort((left, right) => compareCodePoints(left.id, right.id))

  assertExactValues(
    themes.map((theme) => theme.id),
    builtInThemeIds,
    'Complete built-in Theme IDs',
  )

  if (new Set(themes.map((theme) => theme.id)).size !== themes.length) {
    throw new Error('Complete built-in Theme IDs must be unique.')
  }

  for (const theme of themes) {
    if (theme.authoredColorValueCount !== roleIds.length * 4) {
      throw new Error(`${theme.id}: complete Theme must contain exactly 40 authored colors.`)
    }
  }

  const authoredColorValueCount = themes.reduce(
    (count, theme) => count + theme.authoredColorValueCount,
    0,
  )

  if (authoredColorValueCount !== builtInThemeIds.length * roleIds.length * 4) {
    throw new Error(
      `Complete built-in Theme set must contain exactly ${String(builtInThemeIds.length * roleIds.length * 4)} authored colors.`,
    )
  }

  validateThemeIdentity(themes, roleIds)
  return themes
}
