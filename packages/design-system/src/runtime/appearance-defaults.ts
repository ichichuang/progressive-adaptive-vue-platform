import {
  explicitThemePreferenceSchema,
  type ExplicitThemePreference,
} from '../schema/preference.schema'
import { radiusProjection } from '../generated/radius-projection'

type ProductPreference = ExplicitThemePreference['appearance']

function freezeProductPreferenceDefault(preference: ProductPreference): ProductPreference {
  Object.freeze(preference.theme)
  Object.freeze(preference.density)
  return Object.freeze(preference)
}

export const ProductPreferenceDefault = freezeProductPreferenceDefault(
  explicitThemePreferenceSchema.parse({
    schemaVersion: 4,
    appearance: {
      colorMode: 'system',
      theme: {
        registryKind: 'built-in',
        themeId: 'royal-iris',
      },
      contrast: 'standard',
      material: 'adaptive',
      density: {
        preset: 'comfortable',
        scale: 1,
      },
      fontScale: 1,
      motion: 'full',
      radius: radiusProjection.defaultValue,
    },
  }).appearance,
)
