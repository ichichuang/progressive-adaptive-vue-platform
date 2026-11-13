import { generatedThemeRegistry } from '../generated/theme-registry'
import { ProductPreferenceDefault } from '../runtime/appearance-defaults'
import { projectUiAppearance } from '../runtime/ui-appearance-projection'
import {
  resolvedThemePlane,
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
  readonly accentA: string
  readonly accentB: string
  readonly surfacePage: string
  readonly surfacePanel: string
  readonly onAction: string
  readonly actionPrimary: string
  readonly controlPrimary: string
  readonly borderDefault: string
  readonly focusRing: string
  readonly statusInfo: string
  readonly statusSuccess: string
  readonly statusWarning: string
  readonly statusError: string
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
  entry: ThemeRegistryEntry,
  colorMode: ThemeColorMode,
  contrast: ThemeContrast,
  role: string,
): string {
  const value =
    entry.registryKind === 'built-in'
      ? generatedThemeRegistry.builtInEntries
          .find((theme) => theme.themeId === entry.themeId)
          ?.bank.records.find(
            (record) =>
              record.colorMode === colorMode &&
              record.contrast === contrast &&
              record.publicRole === role,
          )?.resolvedValue
      : resolvedThemePlane(entry.definition, colorMode, contrast)[role]

  if (value === undefined) {
    throw new TypeError(`${entry.themeId}: the Appearance theme preview projection is incomplete.`)
  }

  return value
}

function projectSwatches(
  entry: ThemeRegistryEntry,
  reference: ThemeReference,
  colorMode: ThemeColorMode,
  contrast: ThemeContrast,
): AppearanceThemePreviewSwatches {
  const { statusColors } = projectUiAppearance(
    {
      ...ProductPreferenceDefault,
      theme: reference,
      colorMode,
      contrast,
      density: ProductPreferenceDefault.density.preset,
      material: 'solid',
    },
    entry,
  )

  return Object.freeze({
    accentA: requiredSwatch(
      entry,
      colorMode,
      contrast,
      'color.expression.accent-a.solid.background',
    ),
    accentB: requiredSwatch(
      entry,
      colorMode,
      contrast,
      'color.expression.accent-b.solid.background',
    ),
    surfacePage: requiredSwatch(entry, colorMode, contrast, 'color.surface.page'),
    surfacePanel: requiredSwatch(entry, colorMode, contrast, 'color.surface.panel'),
    actionPrimary: requiredSwatch(entry, colorMode, contrast, 'color.action.primary'),
    onAction: requiredSwatch(entry, colorMode, contrast, 'color.text.on-action'),
    controlPrimary: requiredSwatch(entry, colorMode, contrast, 'color.control.primary'),
    borderDefault: requiredSwatch(entry, colorMode, contrast, 'color.border.default'),
    focusRing: requiredSwatch(entry, colorMode, contrast, 'color.focus.ring'),
    statusInfo: statusColors.info.default,
    statusSuccess: statusColors.success.default,
    statusWarning: statusColors.warning.default,
    statusError: statusColors.error.default,
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
        standard: projectSwatches(entry, reference, 'light', 'standard'),
        enhanced: projectSwatches(entry, reference, 'light', 'enhanced'),
      }),
      dark: Object.freeze({
        standard: projectSwatches(entry, reference, 'dark', 'standard'),
        enhanced: projectSwatches(entry, reference, 'dark', 'enhanced'),
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
    entries.map((entry) => {
      const validation = validateCustomThemeDefinition(entry.definition)

      if (validation.status !== 'validated' || validation.entry.themeId !== entry.themeId) {
        throw new TypeError(`${entry.themeId}: the Custom Theme preview projection was rejected.`)
      }

      return projectTheme(validation.entry)
    }),
  )
}
