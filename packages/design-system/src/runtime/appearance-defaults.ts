import {
  explicitThemePreferenceSchema,
  type ExplicitThemePreference,
} from '../schema/preference.schema'

type ProductPreference = ExplicitThemePreference['appearance']

function freezeProductPreferenceDefault(preference: ProductPreference): ProductPreference {
  Object.freeze(preference.theme)
  Object.freeze(preference.density)
  return Object.freeze(preference)
}

export const ProductPreferenceDefault = freezeProductPreferenceDefault(
  explicitThemePreferenceSchema.parse({
    schemaVersion: 3,
    appearance: {
      colorMode: 'system',
      theme: {
        registryKind: 'built-in',
        themeId: 'iris',
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
  }).appearance,
)
