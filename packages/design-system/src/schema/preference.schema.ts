import { z } from 'zod'

import {
  appearancePreferenceV2Schema,
  legacyColorModePreferenceV1Schema,
} from './appearance.schema'

const legacyAppearancePreferenceV1Schema = appearancePreferenceV2Schema
  .omit({
    material: true,
  })
  .extend({
    colorMode: legacyColorModePreferenceV1Schema,
  })

export const legacyUserPreferenceV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  appearance: legacyAppearancePreferenceV1Schema,
})

export const userPreferenceV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  appearance: appearancePreferenceV2Schema,
})

export type UserPreferenceV2 = z.infer<typeof userPreferenceV2Schema>
