import Color from 'colorjs.io'
import { z } from 'zod'

import { themeIdSchema } from './theme.schema'

export const colorModeSchema = z.enum(['light', 'dark', 'system', 'high-contrast'])
export const contrastPreferenceSchema = z.enum(['standard', 'enhanced'])
export const uiDensitySchema = z.enum(['compact', 'comfortable', 'spacious'])
export const motionPreferenceSchema = z.enum(['full', 'reduced', 'none'])
export const fontScaleSchema = z.union([
  z.literal(0.9),
  z.literal(1),
  z.literal(1.1),
  z.literal(1.2),
])

const cssColorSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        new Color(value)
        return true
      } catch {
        return false
      }
    },
    {
      error: 'Expected a Color.js-compatible CSS color.',
    },
  )

export const densityPreferenceSchema = z.strictObject({
  preset: uiDensitySchema,
  scale: z.number().min(0.9).max(1.15).multipleOf(0.05),
})

export const appearancePreferenceSchema = z.strictObject({
  colorMode: colorModeSchema,
  theme: themeIdSchema,
  palette: z.strictObject({
    brand: cssColorSchema,
    accent: cssColorSchema,
    neutral: z.enum(['cool', 'neutral', 'warm']),
  }),
  contrast: contrastPreferenceSchema,
  density: densityPreferenceSchema,
  fontScale: fontScaleSchema,
  motion: motionPreferenceSchema,
})

export type AppearancePreference = z.infer<typeof appearancePreferenceSchema>
export type ColorMode = z.infer<typeof colorModeSchema>
export type DensityPreference = z.infer<typeof densityPreferenceSchema>
export type FontScale = z.infer<typeof fontScaleSchema>
export type MotionPreference = z.infer<typeof motionPreferenceSchema>
export type UiDensity = z.infer<typeof uiDensitySchema>
