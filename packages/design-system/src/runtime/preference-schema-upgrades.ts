import { defaultUserPreferenceV2 } from './appearance-defaults'
import {
  legacyUserPreferenceV1Schema,
  userPreferenceV2Schema,
  type UserPreferenceV2,
} from '../schema/preference.schema'

function freshDefaultUserPreferenceV2(): UserPreferenceV2 {
  return userPreferenceV2Schema.parse(defaultUserPreferenceV2)
}

export function upgradeUserPreference(input: unknown): UserPreferenceV2 {
  const current = userPreferenceV2Schema.safeParse(input)

  if (current.success) {
    return current.data
  }

  const legacy = legacyUserPreferenceV1Schema.safeParse(input)

  if (!legacy.success) {
    return freshDefaultUserPreferenceV2()
  }

  const { appearance } = legacy.data
  const highContrast = appearance.colorMode === 'high-contrast'

  return userPreferenceV2Schema.parse({
    schemaVersion: 2,
    appearance: {
      ...appearance,
      colorMode: highContrast ? 'system' : appearance.colorMode,
      contrast: highContrast ? 'enhanced' : appearance.contrast,
      material: 'solid',
    },
  })
}
