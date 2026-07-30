import { defaultCurrentPreference } from './appearance-defaults'
import {
  currentPreferenceSchema,
  legacyPreferenceInputSchema,
  type CurrentPreference,
  type LegacyPreferenceInput,
} from '../schema/preference.schema'

function freshDefaultCurrentPreference(): CurrentPreference {
  return currentPreferenceSchema.parse(defaultCurrentPreference)
}

export function migrateToCurrentPreference(input: unknown): CurrentPreference {
  const current = currentPreferenceSchema.safeParse(input)

  if (current.success) {
    return current.data
  }

  const legacy = legacyPreferenceInputSchema.safeParse(input)

  if (!legacy.success) {
    return freshDefaultCurrentPreference()
  }

  const legacyPreference: LegacyPreferenceInput = legacy.data
  const { appearance } = legacyPreference
  const highContrast = appearance.colorMode === 'high-contrast'

  return currentPreferenceSchema.parse({
    schemaVersion: 2,
    appearance: {
      ...appearance,
      colorMode: highContrast ? 'system' : appearance.colorMode,
      contrast: highContrast ? 'enhanced' : appearance.contrast,
      material: 'solid',
    },
  })
}
