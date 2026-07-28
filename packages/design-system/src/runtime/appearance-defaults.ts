import { userPreferenceV2Schema, type UserPreferenceV2 } from '../schema/preference.schema'

function freezeUserPreference(preference: UserPreferenceV2): UserPreferenceV2 {
  Object.freeze(preference.appearance.palette)
  Object.freeze(preference.appearance.density)
  Object.freeze(preference.appearance)
  Object.freeze(preference)
  return preference
}

export const defaultUserPreferenceV2 = freezeUserPreference(
  userPreferenceV2Schema.parse({
    schemaVersion: 2,
    appearance: {
      colorMode: 'system',
      theme: 'neutral',
      palette: {
        brand: 'oklch(37% 0.014 247)',
        accent: 'oklch(55% 0.012 247)',
        neutral: 'neutral',
      },
      contrast: 'standard',
      material: 'adaptive',
      density: {
        preset: 'comfortable',
        scale: 1,
      },
      fontScale: 1,
      motion: 'full',
    },
  }),
)
