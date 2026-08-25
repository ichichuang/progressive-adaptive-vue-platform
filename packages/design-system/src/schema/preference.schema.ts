import { z } from 'zod'

import {
  explicitThemeAppearancePreferenceSchema,
  legacyColorModePreferenceSchema,
  legacySeedAppearancePreferenceSchema,
  type ThemeReference,
} from './appearance.schema'
import { legacyBuiltInThemeIds } from './legacy-seed-theme.schema'

const legacyPreferenceInputAppearanceSchema = legacySeedAppearancePreferenceSchema
  .omit({
    material: true,
  })
  .extend({
    colorMode: legacyColorModePreferenceSchema,
  })

export const legacyPreferenceInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  appearance: legacyPreferenceInputAppearanceSchema,
})
export type LegacyPreferenceInput = z.infer<typeof legacyPreferenceInputSchema>

export const legacySeedPreferenceSchema = z.strictObject({
  schemaVersion: z.literal(2),
  appearance: legacySeedAppearancePreferenceSchema,
})

export const explicitThemePreferenceSchema = z.strictObject({
  schemaVersion: z.literal(3),
  appearance: explicitThemeAppearancePreferenceSchema,
})

export const retiredBuiltInPreferenceSchema = z.strictObject({
  schemaVersion: z.literal(3),
  appearance: explicitThemeAppearancePreferenceSchema.extend({
    theme: z.strictObject({
      registryKind: z.literal('built-in'),
      themeId: z.enum(legacyBuiltInThemeIds),
    }),
  }),
})

export type ExplicitThemePreference = z.infer<typeof explicitThemePreferenceSchema>
export type LegacySeedPreference = z.infer<typeof legacySeedPreferenceSchema>
export type RetiredBuiltInPreference = z.infer<typeof retiredBuiltInPreferenceSchema>
export type { ThemeReference }
