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

interface LegacyThemeIdentity {
  readonly id: string
  readonly label: string
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

  if (themeId === 'neutral') {
    throw new Error(`${themeId}:${fieldPath}: Neutral complete-theme aliases are prohibited.`)
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

  assertExactValues(Object.keys(map), roleIds, `${themeId}:${fieldRoot} public color role set`)

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
  return theme
}

export function validateCompleteBuiltInThemes({
  bundles,
  legacyThemes,
  resolver,
}: {
  bundles: readonly CompleteThemeSourceBundle[]
  legacyThemes: readonly LegacyThemeIdentity[]
  resolver: TokenResolver
}): readonly ValidatedCompleteBuiltInTheme[] {
  const publicRoles = validatePublicRoleRegistry(PublicRoleRegistry)
  const roleIds = publicRoles.filter(isActivePublicColorRole).map((record) => record.id)

  validateAlphaContractRegistry(ActiveAlphaContractRegistry, publicRoles)
  validateNamedContrastRegistry(ActiveNamedContrastRegistry, publicRoles)

  const contractVersions: number[] = [
    completeThemeRoleContractVersion,
    PublicRoleRegistry.schemaVersion,
    ActiveAlphaContractRegistry.schemaVersion,
    ActiveNamedContrastRegistry.schemaVersion,
  ]

  if (new Set(contractVersions).size !== 1) {
    throw new Error('Complete Theme, Public Role, Alpha, and Named Contrast versions must match.')
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
    const legacyTheme = legacyThemes.find((candidate) => candidate.id === theme.id)

    if (legacyTheme?.label !== theme.label) {
      throw new Error(`${theme.id}: complete and Legacy built-in Theme identity/label must match.`)
    }

    if (theme.authoredColorValueCount !== roleIds.length * 4) {
      throw new Error(`${theme.id}: complete Theme must contain exactly 36 authored colors.`)
    }
  }

  const authoredColorValueCount = themes.reduce(
    (count, theme) => count + theme.authoredColorValueCount,
    0,
  )

  if (authoredColorValueCount !== builtInThemeIds.length * roleIds.length * 4) {
    throw new Error('Complete built-in Theme set must contain exactly 108 authored colors.')
  }

  validateThemeIdentity(themes, roleIds)
  return themes
}
