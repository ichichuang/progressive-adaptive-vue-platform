import { generatedThemeRegistry } from '../generated/theme-registry'
import {
  validateCustomThemeDefinition,
  type CustomThemeRegistryEntry,
  type ThemeRegistryEntry,
} from '../runtime/theme-registry'
import {
  builtInThemeIds,
  completeBuiltInThemeDefinitionSchema,
} from '../schema/complete-theme.schema'
import type { ThemeReference } from '../schema/preference.schema'

export interface AppearanceThemePreviewSwatches {
  readonly surfacePage: string
  readonly surfacePanel: string
  readonly actionPrimary: string
  readonly borderDefault: string
  readonly focusRing: string
}

export interface AppearanceThemePreviewProjection {
  readonly registryKind: ThemeReference['registryKind']
  readonly themeId: string
  readonly label: string
  readonly reference: ThemeReference
  readonly planes: {
    readonly light: {
      readonly standard: AppearanceThemePreviewSwatches
      readonly enhanced: AppearanceThemePreviewSwatches
    }
    readonly dark: {
      readonly standard: AppearanceThemePreviewSwatches
      readonly enhanced: AppearanceThemePreviewSwatches
    }
  }
}

type ThemeDefinition = ThemeRegistryEntry['definition']
type ThemeColorMode = keyof ThemeDefinition['planes']
type ThemeContrast = keyof ThemeDefinition['planes']['light']

function requiredSwatch(
  definition: ThemeDefinition,
  colorMode: ThemeColorMode,
  contrast: ThemeContrast,
  role: string,
): string {
  const value = definition.planes[colorMode][contrast][role]

  if (value === undefined) {
    throw new TypeError(`${definition.id}: the Appearance theme preview projection is incomplete.`)
  }

  return value
}

function projectSwatches(
  definition: ThemeDefinition,
  colorMode: ThemeColorMode,
  contrast: ThemeContrast,
): AppearanceThemePreviewSwatches {
  return Object.freeze({
    surfacePage: requiredSwatch(definition, colorMode, contrast, 'color.surface.page'),
    surfacePanel: requiredSwatch(definition, colorMode, contrast, 'color.surface.panel'),
    actionPrimary: requiredSwatch(definition, colorMode, contrast, 'color.action.primary'),
    borderDefault: requiredSwatch(definition, colorMode, contrast, 'color.border.default'),
    focusRing: requiredSwatch(definition, colorMode, contrast, 'color.focus.ring'),
  })
}

function projectTheme(entry: ThemeRegistryEntry): AppearanceThemePreviewProjection {
  const reference: ThemeReference =
    entry.registryKind === 'built-in'
      ? { registryKind: 'built-in', themeId: entry.themeId }
      : { registryKind: 'custom', themeId: entry.themeId }

  return Object.freeze({
    registryKind: entry.registryKind,
    themeId: entry.themeId,
    label: entry.definition.label,
    reference: Object.freeze(reference),
    planes: Object.freeze({
      light: Object.freeze({
        standard: projectSwatches(entry.definition, 'light', 'standard'),
        enhanced: projectSwatches(entry.definition, 'light', 'enhanced'),
      }),
      dark: Object.freeze({
        standard: projectSwatches(entry.definition, 'dark', 'standard'),
        enhanced: projectSwatches(entry.definition, 'dark', 'enhanced'),
      }),
    }),
  })
}

export const builtInAppearanceThemePreviews = Object.freeze(
  builtInThemeIds.map((themeId) => {
    const generatedEntry = generatedThemeRegistry.builtInEntries.find(
      (entry) => entry.themeId === themeId,
    )

    if (generatedEntry === undefined) {
      throw new TypeError(`${themeId}: the generated built-in Theme is unavailable.`)
    }

    return projectTheme({
      registryKind: 'built-in',
      themeId,
      definition: completeBuiltInThemeDefinitionSchema.parse(generatedEntry.definition),
    })
  }),
)

export function projectAccessibleCustomAppearanceThemePreviews(
  entries: readonly CustomThemeRegistryEntry[],
): readonly AppearanceThemePreviewProjection[] {
  return Object.freeze(
    entries
      .filter((entry) => !builtInThemeIds.some((themeId) => themeId === entry.themeId))
      .map((entry) => {
        const validation = validateCustomThemeDefinition(entry.definition)

        if (validation.status !== 'validated' || validation.entry.themeId !== entry.themeId) {
          throw new TypeError(`${entry.themeId}: the Custom Theme preview projection was rejected.`)
        }

        return projectTheme(validation.entry)
      }),
  )
}
