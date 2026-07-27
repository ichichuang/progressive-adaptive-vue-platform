import { z } from 'zod'

import { appearancePreferenceSchema } from './appearance.schema'

export const userPreferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  appearance: appearancePreferenceSchema,
})

export type UserPreference = z.infer<typeof userPreferenceSchema>
