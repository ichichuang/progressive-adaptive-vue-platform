import { generatedThemeRegistry } from '../generated/theme-registry'
import {
  explicitThemePreferenceSchema,
  legacyPreferenceInputSchema,
  legacySeedPreferenceSchema,
  type ExplicitThemePreference,
  type LegacyPreferenceInput,
  type LegacySeedPreference,
} from '../schema/preference.schema'

export type PreferenceMigrationResult =
  | {
      readonly status: 'success'
      readonly preference: ExplicitThemePreference
    }
  | {
      readonly status: 'failure'
      readonly code: 'MIGRATION_REQUIRES_THEME_COMPLETION'
    }
  | {
      readonly status: 'failure'
      readonly code: 'PREFERENCE_INPUT_INVALID'
    }

function migrateLegacySeedPreference(preference: LegacySeedPreference): PreferenceMigrationResult {
  const tuple = generatedThemeRegistry.legacyBuiltInThemeTuples.find(
    (candidate) => candidate.themeId === preference.appearance.theme,
  )

  if (
    tuple?.brand !== preference.appearance.palette.brand ||
    tuple.accent !== preference.appearance.palette.accent ||
    tuple.neutral !== preference.appearance.palette.neutral
  ) {
    return {
      status: 'failure',
      code: 'MIGRATION_REQUIRES_THEME_COMPLETION',
    }
  }

  return {
    status: 'success',
    preference: explicitThemePreferenceSchema.parse({
      schemaVersion: 3,
      appearance: {
        colorMode: preference.appearance.colorMode,
        theme: {
          registryKind: 'built-in',
          themeId: tuple.themeId,
        },
        contrast: preference.appearance.contrast,
        material: preference.appearance.material,
        density: preference.appearance.density,
        fontScale: preference.appearance.fontScale,
        motion: preference.appearance.motion,
      },
    }),
  }
}

function migrateLegacyPreferenceInput(
  preference: LegacyPreferenceInput,
): PreferenceMigrationResult {
  const highContrast = preference.appearance.colorMode === 'high-contrast'

  return migrateLegacySeedPreference(
    legacySeedPreferenceSchema.parse({
      schemaVersion: 2,
      appearance: {
        ...preference.appearance,
        colorMode: highContrast ? 'system' : preference.appearance.colorMode,
        contrast: highContrast ? 'enhanced' : preference.appearance.contrast,
        material: 'solid',
      },
    }),
  )
}

export function migrateToExplicitThemePreference(input: unknown): PreferenceMigrationResult {
  const explicitPreference = explicitThemePreferenceSchema.safeParse(input)

  if (explicitPreference.success) {
    return {
      status: 'success',
      preference: explicitPreference.data,
    }
  }

  const legacySeedPreference = legacySeedPreferenceSchema.safeParse(input)

  if (legacySeedPreference.success) {
    return migrateLegacySeedPreference(legacySeedPreference.data)
  }

  const legacyPreference = legacyPreferenceInputSchema.safeParse(input)

  if (legacyPreference.success) {
    return migrateLegacyPreferenceInput(legacyPreference.data)
  }

  return {
    status: 'failure',
    code: 'PREFERENCE_INPUT_INVALID',
  }
}
