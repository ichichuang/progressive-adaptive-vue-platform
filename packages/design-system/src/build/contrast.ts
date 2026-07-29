import Color from 'colorjs.io'

import {
  colorValueSchema,
  type ColorValue,
  type ContrastPairDeclaration,
  type TokenConditions,
} from '../schema/token.schema'
import { compareCodePoints } from './order'
import type { ResolvedTokenRecord } from './resolve'

const materialProjections = ['adaptive', 'reduced', 'solid'] as const
const requiredMaterialRoleNames = [
  'material.chrome.background',
  'material.modal.background',
  'material.overlay.background',
  'material.scrim.background',
] as const
const forbiddenMaterialFamilies =
  /(?:^|\.)(?:clear-media|glass|glow|highlight|illumination|spring)(?:\.|$)/u

const requiredContrastPairs = [
  {
    background: 'color.surface.page',
    foreground: 'color.text.primary',
    id: 'text-primary-on-page',
    kind: 'text',
  },
  {
    background: 'color.surface.panel',
    foreground: 'color.text.primary',
    id: 'text-primary-on-panel',
    kind: 'text',
  },
  {
    background: 'color.surface.page',
    foreground: 'color.text.secondary',
    id: 'text-secondary-on-page',
    kind: 'text',
  },
  {
    background: 'color.surface.panel',
    foreground: 'color.text.secondary',
    id: 'text-secondary-on-panel',
    kind: 'text',
  },
  {
    background: 'color.action.primary',
    foreground: 'color.text.on-action',
    id: 'action-content-on-primary',
    kind: 'text',
  },
  {
    background: 'color.surface.page',
    foreground: 'color.focus.ring',
    id: 'focus-ring-on-page',
    kind: 'non-text',
  },
  {
    background: 'color.surface.panel',
    foreground: 'color.focus.ring',
    id: 'focus-ring-on-panel',
    kind: 'non-text',
  },
  {
    background: 'material.chrome.background',
    foreground: 'color.text.primary',
    id: 'material-chrome-content',
    kind: 'text',
  },
  {
    background: 'material.overlay.background',
    foreground: 'color.text.primary',
    id: 'material-overlay-content',
    kind: 'text',
  },
  {
    background: 'material.modal.background',
    foreground: 'color.text.primary',
    id: 'material-modal-content',
    kind: 'text',
  },
] as const satisfies readonly (ContrastPairDeclaration & {
  foreground: string
})[]

const nonTextBoundaryPairs = [
  {
    background: 'color.surface.page',
    foreground: 'color.action.primary',
    id: 'control-primary-on-page',
  },
  {
    background: 'color.surface.panel',
    foreground: 'color.action.primary',
    id: 'control-primary-on-panel',
  },
  {
    background: 'color.surface.page',
    foreground: 'color.border.default',
    id: 'border-default-on-page',
  },
  {
    background: 'color.surface.panel',
    foreground: 'color.border.default',
    id: 'border-default-on-panel',
  },
] as const

type ColorMode = 'dark' | 'light'
type Contrast = 'enhanced' | 'standard'
type MaterialProjection = (typeof materialProjections)[number]

interface EffectiveConditions {
  colorMode: ColorMode
  contrast: Contrast
  density: 'comfortable'
  material: MaterialProjection
  theme: string
}

export interface ContrastPairValidation {
  background: string
  foreground: string
  id: string
  kind: 'non-text' | 'text'
  minimumRatios: {
    enhanced: number
    standard: number
  }
  projections: readonly MaterialProjection[] | readonly ['not-applicable']
}

export interface NonTextBoundaryValidation {
  background: string
  foreground: string
  id: string
  minimumRatio: number
}

export interface MaterialRoleValidation {
  name: string
  projections: readonly MaterialProjection[]
}

export interface ContrastValidationResult {
  contrastPairs: readonly ContrastPairValidation[]
  materialRoles: readonly MaterialRoleValidation[]
  nonTextBoundaries: readonly NonTextBoundaryValidation[]
}

function conditionRank(conditions: TokenConditions): number {
  if (conditions.material !== undefined) {
    return 50
  }

  if (conditions.density !== undefined) {
    return 40
  }

  if (
    conditions.theme !== undefined &&
    conditions.colorMode !== undefined &&
    conditions.contrast !== undefined
  ) {
    return 35
  }

  if (conditions.contrast !== undefined) {
    return 30
  }

  if (conditions.colorMode !== undefined) {
    return 20
  }

  if (conditions.theme !== undefined) {
    return 10
  }

  return 0
}

function conditionsMatch(conditions: TokenConditions, state: EffectiveConditions): boolean {
  return (
    (conditions.theme === undefined || conditions.theme === state.theme) &&
    (conditions.colorMode === undefined || conditions.colorMode === state.colorMode) &&
    (conditions.contrast === undefined || conditions.contrast === state.contrast) &&
    (conditions.density === undefined || conditions.density === state.density) &&
    (conditions.material === undefined || conditions.material === state.material)
  )
}

function effectiveRecord(
  tokens: readonly ResolvedTokenRecord[],
  roleName: string,
  state: EffectiveConditions,
): ResolvedTokenRecord {
  const candidates = tokens
    .filter((token) => token.role.name === roleName && conditionsMatch(token.conditions, state))
    .sort(
      (left, right) =>
        conditionRank(left.conditions) - conditionRank(right.conditions) ||
        compareCodePoints(left.path, right.path),
    )
  const record = candidates.at(-1)

  if (record === undefined) {
    throw new Error(
      `${roleName}: no effective token for theme=${state.theme}, colorMode=${state.colorMode}, contrast=${state.contrast}, density=${state.density}, material=${state.material}.`,
    )
  }

  return record
}

function effectiveColorValue(
  tokens: readonly ResolvedTokenRecord[],
  roleName: string,
  state: EffectiveConditions,
  resolving = new Set<string>(),
): ColorValue {
  if (resolving.has(roleName)) {
    throw new Error(`${roleName}: effective color alias cycle detected.`)
  }

  const record = effectiveRecord(tokens, roleName, state)

  if (record.type !== 'color') {
    throw new Error(`${roleName}: contrast endpoints must be color tokens.`)
  }

  if (record.reference === undefined) {
    return colorValueSchema.parse(record.resolvedValue)
  }

  const reference = tokens.find((token) => token.path === record.reference)

  if (reference === undefined) {
    throw new Error(`${record.path}: missing effective color reference "${record.reference}".`)
  }

  const nextResolving = new Set(resolving)
  nextResolving.add(roleName)
  return effectiveColorValue(tokens, reference.role.name, state, nextResolving)
}

function toColor(value: ColorValue): Color {
  return new Color(value.colorSpace, value.components, value.alpha ?? 1)
}

function compositeOver(background: ColorValue, backdrop: 'black' | 'white'): Color {
  const foregroundColor = toColor(background).to('srgb-linear')
  const backdropColor = new Color(backdrop).to('srgb-linear')
  const alpha = foregroundColor.alpha
  const compositeCoordinates: [number, number, number] = [
    (foregroundColor.coords[0] ?? 0) * alpha + (backdropColor.coords[0] ?? 0) * (1 - alpha),
    (foregroundColor.coords[1] ?? 0) * alpha + (backdropColor.coords[1] ?? 0) * (1 - alpha),
    (foregroundColor.coords[2] ?? 0) * alpha + (backdropColor.coords[2] ?? 0) * (1 - alpha),
  ]

  return new Color('srgb-linear', compositeCoordinates, 1)
}

function minimumContrastRatio(foreground: ColorValue, background: ColorValue): number {
  if ((foreground.alpha ?? 1) !== 1) {
    throw new Error('Contrast foreground roles must remain opaque.')
  }

  const foregroundColor = toColor(foreground)
  const backgroundAlpha = background.alpha ?? 1
  const backgrounds =
    backgroundAlpha === 1
      ? [toColor(background)]
      : [compositeOver(background, 'black'), compositeOver(background, 'white')]

  return Math.min(
    ...backgrounds.map((backgroundColor) => foregroundColor.contrastWCAG21(backgroundColor)),
  )
}

function roundRatio(value: number): number {
  return Number(value.toFixed(3))
}

function assertExactValues(
  actualValues: readonly string[],
  expectedValues: readonly string[],
  description: string,
): void {
  const actual = [...new Set(actualValues)].sort(compareCodePoints)
  const expected = [...expectedValues].sort(compareCodePoints)

  if (actual.join('\n') !== expected.join('\n')) {
    throw new Error(
      `${description}: expected [${expected.join(', ')}], received [${actual.join(', ')}].`,
    )
  }
}

function validateMaterialRoles(
  tokens: readonly ResolvedTokenRecord[],
  themeIds: readonly string[],
): MaterialRoleValidation[] {
  const materialTokens = tokens.filter((token) => token.tier === 'semantic.material')

  assertExactValues(
    materialTokens.map((token) => token.role.name),
    requiredMaterialRoleNames,
    'Material role contract',
  )

  for (const token of materialTokens) {
    if (
      token.visibility !== 'ui-internal' ||
      token.role.category !== 'material' ||
      token.type !== 'color'
    ) {
      throw new Error(
        `${token.source}:${token.path}: material roles must be ui-internal color tokens in the material namespace.`,
      )
    }

    if (forbiddenMaterialFamilies.test(token.role.name)) {
      throw new Error(`${token.source}:${token.path}: forbidden material family.`)
    }

    const conditionKeys = Object.keys(token.conditions)

    if (conditionKeys.length !== 1 || token.conditions.material === undefined) {
      throw new Error(
        `${token.source}:${token.path}: material roles require one factorized effective-material selector.`,
      )
    }
  }

  const validations = requiredMaterialRoleNames.map((roleName) => {
    const roleTokens = materialTokens.filter((token) => token.role.name === roleName)

    assertExactValues(
      roleTokens.flatMap((token) =>
        token.conditions.material === undefined ? [] : [token.conditions.material],
      ),
      materialProjections,
      `${roleName} projection contract`,
    )

    return {
      name: roleName,
      projections: materialProjections,
    }
  })

  for (const theme of themeIds) {
    for (const colorMode of ['light', 'dark'] as const) {
      for (const roleName of requiredMaterialRoleNames) {
        const state = {
          colorMode,
          contrast: 'standard',
          density: 'comfortable',
          theme,
        } as const
        const reduced = effectiveColorValue(tokens, roleName, {
          ...state,
          material: 'reduced',
        })
        const solid = effectiveColorValue(tokens, roleName, {
          ...state,
          material: 'solid',
        })
        const minimumReducedAlpha = roleName === 'material.scrim.background' ? 0.72 : 0.94

        if ((reduced.alpha ?? 1) < minimumReducedAlpha) {
          throw new Error(
            `${roleName}: reduced must remain high-opacity for ${theme}/${colorMode}.`,
          )
        }

        if ((solid.alpha ?? 1) !== 1) {
          throw new Error(
            `${roleName}: solid must remain the opaque terminal fallback for ${theme}/${colorMode}.`,
          )
        }
      }
    }
  }

  return validations
}

function declaredContrastPairs(
  tokens: readonly ResolvedTokenRecord[],
): Map<string, ContrastPairDeclaration & { foreground: string }> {
  const declarations = new Map<string, ContrastPairDeclaration & { foreground: string }>()

  for (const token of tokens) {
    for (const declaration of token.contrastPairs ?? []) {
      const pair = {
        ...declaration,
        foreground: token.role.name,
      }
      const existing = declarations.get(pair.id)

      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(pair)) {
        throw new Error(`${token.source}:${token.path}: conflicting contrast pair "${pair.id}".`)
      }

      declarations.set(pair.id, pair)
    }
  }

  return declarations
}

function validateContrastPairDeclarations(tokens: readonly ResolvedTokenRecord[]): void {
  const declarations = declaredContrastPairs(tokens)

  assertExactValues(
    [...declarations.keys()],
    requiredContrastPairs.map((pair) => pair.id),
    'Named contrast pair contract',
  )

  for (const expected of requiredContrastPairs) {
    const actual = declarations.get(expected.id)

    if (
      actual?.background !== expected.background ||
      actual.foreground !== expected.foreground ||
      actual.kind !== expected.kind
    ) {
      throw new Error(`${expected.id}: named contrast endpoints or kind are incomplete.`)
    }
  }
}

function validationStates(
  themeIds: readonly string[],
  projections: readonly MaterialProjection[],
): EffectiveConditions[] {
  return themeIds.flatMap((theme) =>
    (['light', 'dark'] as const).flatMap((colorMode) =>
      (['standard', 'enhanced'] as const).flatMap((contrast) =>
        projections.map((material) => ({
          colorMode,
          contrast,
          density: 'comfortable' as const,
          material,
          theme,
        })),
      ),
    ),
  )
}

function validateNamedContrastPairs(
  tokens: readonly ResolvedTokenRecord[],
  themeIds: readonly string[],
): ContrastPairValidation[] {
  validateContrastPairDeclarations(tokens)

  return requiredContrastPairs.map((pair) => {
    const isMaterialPair = pair.background.startsWith('material.')
    const projections = isMaterialPair ? materialProjections : (['solid'] as const)
    const ratios = {
      enhanced: Number.POSITIVE_INFINITY,
      standard: Number.POSITIVE_INFINITY,
    }

    for (const state of validationStates(themeIds, projections)) {
      const foreground = effectiveColorValue(tokens, pair.foreground, state)
      const background = effectiveColorValue(tokens, pair.background, state)
      const ratio = minimumContrastRatio(foreground, background)
      const normalTextThreshold = state.contrast === 'enhanced' ? 7 : 4.5
      const largeTextThreshold = state.contrast === 'enhanced' ? 4.5 : 3
      const threshold = pair.kind === 'text' ? normalTextThreshold : 3

      if (ratio < threshold || (pair.kind === 'text' && ratio < largeTextThreshold)) {
        throw new Error(
          `${pair.id}: contrast ${ratio.toFixed(3)}:1 fails ${state.theme}/${state.colorMode}/${state.contrast}/${state.material}.`,
        )
      }

      ratios[state.contrast] = Math.min(ratios[state.contrast], ratio)
    }

    return {
      background: pair.background,
      foreground: pair.foreground,
      id: pair.id,
      kind: pair.kind,
      minimumRatios: {
        enhanced: roundRatio(ratios.enhanced),
        standard: roundRatio(ratios.standard),
      },
      projections: isMaterialPair ? materialProjections : (['not-applicable'] as const),
    }
  })
}

function validateNonTextBoundaries(
  tokens: readonly ResolvedTokenRecord[],
  themeIds: readonly string[],
): NonTextBoundaryValidation[] {
  return nonTextBoundaryPairs.map((pair) => {
    let minimumRatio = Number.POSITIVE_INFINITY

    for (const state of validationStates(themeIds, ['solid'])) {
      const foreground = effectiveColorValue(tokens, pair.foreground, state)
      const background = effectiveColorValue(tokens, pair.background, state)
      const ratio = minimumContrastRatio(foreground, background)

      if (ratio < 3) {
        throw new Error(
          `${pair.id}: non-text contrast ${ratio.toFixed(3)}:1 fails ${state.theme}/${state.colorMode}/${state.contrast}.`,
        )
      }

      minimumRatio = Math.min(minimumRatio, ratio)
    }

    return {
      ...pair,
      minimumRatio: roundRatio(minimumRatio),
    }
  })
}

export function validateContrastAndMaterialContracts(
  tokens: readonly ResolvedTokenRecord[],
  themeIds: readonly string[],
): ContrastValidationResult {
  const materialRoles = validateMaterialRoles(tokens, themeIds)
  const contrastPairs = validateNamedContrastPairs(tokens, themeIds)
  const nonTextBoundaries = validateNonTextBoundaries(tokens, themeIds)

  return {
    contrastPairs,
    materialRoles,
    nonTextBoundaries,
  }
}
