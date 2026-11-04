import { generatedThemeRegistry } from '../generated/theme-registry'
import { calculateWcag21Contrast, formatOpaqueSrgbColor, parseCssColor } from '../schema/css-color'
import type { ThemeColorPalette } from '../schema/theme-color-palette.schema'
import type { EffectiveAppearanceState } from './apply-appearance'
import type { ThemeRegistryEntry } from './theme-registry'

type SemanticStatusAppearanceProjection = Readonly<
  Record<
    'info' | 'success' | 'warning' | 'error',
    {
      readonly default: string
      readonly hover: string
      readonly pressed: string
      readonly supplementary: string
      readonly onStatus: string
    }
  >
>

export interface UiAppearanceSnapshot extends EffectiveAppearanceState {
  readonly colorPalette: ThemeColorPalette | null
  readonly statusColors: SemanticStatusAppearanceProjection
}

function isStatusRole(role: string): boolean {
  return (
    role.startsWith('color.status.') ||
    role.startsWith('color.text.on-status.') ||
    /^color\.control\.(info|success|warning|error)$/u.test(role)
  )
}

function requiredColor(plane: Readonly<Record<string, string>>, role: string): string {
  const value = plane[role]

  if (value === undefined) {
    throw new Error(`${role}: resolved UI status endpoint is missing.`)
  }

  return value
}

function frozenPalette(palette: ThemeColorPalette): ThemeColorPalette {
  function project(value: unknown): unknown {
    if (typeof value === 'string') return formatOpaqueSrgbColor(value)
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Invalid generated UI color palette.')
    return Object.freeze(
      Object.fromEntries(Object.entries(value).map(([key, item]) => [key, project(item)])),
    )
  }
  return project(palette) as ThemeColorPalette
}

export function projectUiAppearance(
  appearance: Readonly<EffectiveAppearanceState>,
  entry: Readonly<ThemeRegistryEntry>,
): Readonly<UiAppearanceSnapshot> {
  if (
    entry.registryKind !== appearance.theme.registryKind ||
    entry.themeId !== appearance.theme.themeId ||
    entry.definition.id !== entry.themeId
  ) {
    throw new Error('UI Appearance projection requires the resolved active Theme tuple.')
  }

  const builtIn =
    entry.registryKind === 'built-in'
      ? generatedThemeRegistry.builtInEntries.find(
          (candidate) => candidate.themeId === entry.themeId,
        )
      : undefined

  if (entry.registryKind === 'built-in' && builtIn === undefined) {
    throw new Error('The resolved Built-in Theme Bank is unavailable.')
  }

  const standardRatios = new Map<string, number>()
  const projectedPlanes = new Map<string, Readonly<Record<string, string>>>()

  for (const contrast of ['standard', 'enhanced'] as const) {
    const resolvedPlane =
      builtIn === undefined
        ? entry.definition.planes[appearance.colorMode][contrast]
        : Object.fromEntries(
            builtIn.bank.records
              .filter(
                (record) =>
                  record.colorMode === appearance.colorMode && record.contrast === contrast,
              )
              .map((record) => [record.publicRole, record.resolvedValue]),
          )
    const plane = Object.fromEntries(
      Object.entries(resolvedPlane).map(([role, value]) => [
        role,
        isStatusRole(role) ? formatOpaqueSrgbColor(value) : value,
      ]),
    )

    for (const pair of generatedThemeRegistry.namedContrasts) {
      if (!isStatusRole(pair.foregroundRole)) continue

      const ratio = calculateWcag21Contrast(
        parseCssColor(requiredColor(plane, pair.foregroundRole)),
        parseCssColor(requiredColor(plane, pair.backgroundRole)),
      )
      const minimum = contrast === 'standard' ? pair.standardMinimum : pair.enhancedMinimum
      const standardRatio = standardRatios.get(pair.id)

      if (
        !Number.isFinite(ratio) ||
        ratio < minimum ||
        (contrast === 'enhanced' &&
          pair.enhancedDifferenceRequired &&
          (standardRatio === undefined || ratio <= standardRatio))
      ) {
        throw new Error(`${pair.id}: rounded UI status contrast failed in ${contrast}.`)
      }

      if (contrast === 'standard') standardRatios.set(pair.id, ratio)
    }

    projectedPlanes.set(contrast, plane)
  }

  const plane = projectedPlanes.get(appearance.contrast)

  if (plane === undefined) {
    throw new Error('The active UI status plane is unavailable.')
  }

  const colorPalette =
    builtIn === undefined
      ? null
      : frozenPalette(builtIn.uiPalette[appearance.colorMode][appearance.contrast])

  const projectTone = (tone: keyof SemanticStatusAppearanceProjection) =>
    Object.freeze({
      default: requiredColor(plane, `color.status.${tone}`),
      hover: requiredColor(plane, `color.status.${tone}.hover`),
      pressed: requiredColor(plane, `color.status.${tone}.pressed`),
      supplementary:
        colorPalette?.roles[tone].foreground.suppl ??
        generatedThemeRegistry.statusSupplementary[appearance.colorMode][appearance.contrast][tone],
      onStatus: requiredColor(plane, `color.text.on-status.${tone}`),
    })

  return Object.freeze({
    ...appearance,
    theme: Object.freeze({ ...appearance.theme }),
    colorPalette,
    statusColors: Object.freeze({
      info: projectTone('info'),
      success: projectTone('success'),
      warning: projectTone('warning'),
      error: projectTone('error'),
    }),
  })
}
