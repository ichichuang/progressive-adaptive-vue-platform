import { z } from 'zod'

import { appearancePreferenceSchema, legacyColorModePreferenceSchema } from './appearance.schema'

const legacyPreferenceInputAppearanceSchema = appearancePreferenceSchema
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

const legacySeedPreferenceSchema = z.strictObject({
  schemaVersion: z.literal(2),
  appearance: appearancePreferenceSchema,
})

type LegacySeedPreference = z.infer<typeof legacySeedPreferenceSchema>
export const currentPreferenceSchema = legacySeedPreferenceSchema
export type CurrentPreference = LegacySeedPreference
