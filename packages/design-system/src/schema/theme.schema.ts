import { z } from 'zod'

import { tokenReferenceSchema } from './token.schema'

export const themeIdPattern = /^[a-z][a-z0-9-]*$/u
export const themeIdSchema = z.string().regex(themeIdPattern)

export const themeDefinitionSchema = z.strictObject({
  id: themeIdSchema,
  label: z.string().min(1),
  palette: z.strictObject({
    brand: tokenReferenceSchema,
    accent: tokenReferenceSchema,
    neutral: z.enum(['cool', 'neutral', 'warm']),
  }),
})

export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>
