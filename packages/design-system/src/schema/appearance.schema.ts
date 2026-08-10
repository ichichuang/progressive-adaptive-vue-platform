import Color from 'colorjs.io'
import { z } from 'zod'

import { builtInThemeIdSchema, customThemeIdSchema } from './complete-theme.schema'
import { legacySeedThemeIdSchema } from './legacy-seed-theme.schema'

export const colorModePreferenceValues = ['light', 'dark', 'system'] as const
export const legacyColorModePreferenceValues = ['light', 'dark', 'system', 'high-contrast'] as const
export const contrastPreferenceValues = ['standard', 'enhanced'] as const
export const materialPreferenceValues = ['adaptive', 'reduced', 'solid'] as const
export const uiDensityValues = ['compact', 'comfortable', 'spacious'] as const
export const motionPreferenceValues = ['full', 'reduced', 'none'] as const
export const fontScaleValues = [0.9, 1, 1.1, 1.2] as const

export const colorModePreferenceSchema = z.enum(colorModePreferenceValues)
export const legacyColorModePreferenceSchema = z.enum(legacyColorModePreferenceValues)
export const contrastPreferenceSchema = z.enum(contrastPreferenceValues)
export const materialPreferenceSchema = z.enum(materialPreferenceValues)
export const uiDensitySchema = z.enum(uiDensityValues)
export const motionPreferenceSchema = z.enum(motionPreferenceValues)
export const fontScaleSchema = z.union(fontScaleValues.map((value) => z.literal(value)))

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

export const legacySeedAppearancePreferenceSchema = z.strictObject({
  colorMode: colorModePreferenceSchema,
  theme: legacySeedThemeIdSchema,
  palette: appearancePaletteSchema,
  contrast: contrastPreferenceSchema,
  material: materialPreferenceSchema,
  density: densityPreferenceSchema,
  fontScale: fontScaleSchema,
  motion: motionPreferenceSchema,
})

const themeReferenceSchema = z.discriminatedUnion('registryKind', [
  z.strictObject({
    registryKind: z.literal('built-in'),
    themeId: builtInThemeIdSchema,
  }),
  z.strictObject({
    registryKind: z.literal('custom'),
    themeId: customThemeIdSchema,
  }),
])

export const explicitThemeAppearancePreferenceSchema = z.strictObject({
  colorMode: colorModePreferenceSchema,
  theme: themeReferenceSchema,
  contrast: contrastPreferenceSchema,
  material: materialPreferenceSchema,
  density: densityPreferenceSchema,
  fontScale: fontScaleSchema,
  motion: motionPreferenceSchema,
})

export type ThemeReference = z.infer<typeof themeReferenceSchema>
export type ColorModePreference = z.infer<typeof colorModePreferenceSchema>
export type ContrastPreference = z.infer<typeof contrastPreferenceSchema>
export type DensityPreference = z.infer<typeof densityPreferenceSchema>
export type FontScale = z.infer<typeof fontScaleSchema>
export type MaterialPreference = z.infer<typeof materialPreferenceSchema>
export type MotionPreference = z.infer<typeof motionPreferenceSchema>
export type UiDensity = z.infer<typeof uiDensitySchema>
