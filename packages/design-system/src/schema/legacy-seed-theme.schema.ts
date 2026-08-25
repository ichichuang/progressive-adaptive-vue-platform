import { z } from 'zod'

import { tokenReferenceSchema } from './token.schema'

export const legacySeedThemeIdPattern = /^[a-z][a-z0-9-]*$/u
export const legacySeedThemeIdSchema = z.string().regex(legacySeedThemeIdPattern)
export const legacyBuiltInThemeIds = ['neutral', 'ocean', 'warm'] as const

export const legacySeedThemeDefinitionSchema = z.strictObject({
  id: legacySeedThemeIdSchema,
  label: z.string().min(1),
  palette: z.strictObject({
    brand: tokenReferenceSchema,
    accent: tokenReferenceSchema,
    neutral: z.enum(['cool', 'neutral', 'warm']),
  }),
})

export type LegacySeedThemeDefinition = z.infer<typeof legacySeedThemeDefinitionSchema>
