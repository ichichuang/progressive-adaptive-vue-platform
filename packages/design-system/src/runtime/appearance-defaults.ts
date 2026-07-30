import { currentPreferenceSchema, type CurrentPreference } from '../schema/preference.schema'

function freezeCurrentPreference(preference: CurrentPreference): CurrentPreference {
  Object.freeze(preference.appearance.palette)
  Object.freeze(preference.appearance.density)
  Object.freeze(preference.appearance)
  Object.freeze(preference)
  return preference
}

export const defaultCurrentPreference = freezeCurrentPreference(
  currentPreferenceSchema.parse({
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
