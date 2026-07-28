import Color from 'colorjs.io'
import { z } from 'zod'

import { themeIdSchema } from './theme.schema'

export const colorModePreferenceSchema = z.enum(['light', 'dark', 'system'])
export const legacyColorModePreferenceV1Schema = z.enum([
  'light',
  'dark',
  'system',
  'high-contrast',
])
export const contrastPreferenceSchema = z.enum(['standard', 'enhanced'])
export const materialPreferenceSchema = z.enum(['adaptive', 'reduced', 'solid'])
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

const appearancePaletteSchema = z.strictObject({
  brand: cssColorSchema,
  accent: cssColorSchema,
  neutral: z.enum(['cool', 'neutral', 'warm']),
})

export const appearancePreferenceV2Schema = z.strictObject({
  colorMode: colorModePreferenceSchema,
  theme: themeIdSchema,
  palette: appearancePaletteSchema,
  contrast: contrastPreferenceSchema,
  material: materialPreferenceSchema,
  density: densityPreferenceSchema,
  fontScale: fontScaleSchema,
  motion: motionPreferenceSchema,
})

export type AppearancePreferenceV2 = z.infer<typeof appearancePreferenceV2Schema>
export type ColorModePreference = z.infer<typeof colorModePreferenceSchema>
export type ContrastPreference = z.infer<typeof contrastPreferenceSchema>
export type DensityPreference = z.infer<typeof densityPreferenceSchema>
export type FontScale = z.infer<typeof fontScaleSchema>
export type MaterialPreference = z.infer<typeof materialPreferenceSchema>
export type MotionPreference = z.infer<typeof motionPreferenceSchema>
export type UiDensity = z.infer<typeof uiDensitySchema>
