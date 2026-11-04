import { z } from 'zod'

import { explicitThemeAppearancePreferenceSchema, type ThemeReference } from './appearance.schema'

export const explicitThemePreferenceSchema = z.strictObject({
  schemaVersion: z.literal(4),
  appearance: explicitThemeAppearancePreferenceSchema,
})
export type ExplicitThemePreference = z.infer<typeof explicitThemePreferenceSchema>
export type { ThemeReference }
