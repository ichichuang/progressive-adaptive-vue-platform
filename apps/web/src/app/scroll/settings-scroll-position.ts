import { z } from 'zod'

/** Settings categories are route-owned identities, not persisted user preferences. */
const settingsSectionIds = [
  'settings-theme',
  'settings-comfort',
  'settings-reading',
  'settings-workspace',
] as const

const settingsSectionSchema = z.enum(settingsSectionIds)
export type SettingsSectionId = z.infer<typeof settingsSectionSchema>

const offsetSchema = z.strictObject({
  left: z.number(),
  top: z.number().nonnegative(),
})

export const settingsScrollPositionSchema = z.strictObject({
  section: settingsSectionSchema,
  positions: z.partialRecord(settingsSectionSchema, offsetSchema),
})
export type SettingsScrollPosition = z.infer<typeof settingsScrollPositionSchema>
