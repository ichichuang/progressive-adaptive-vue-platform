import { colorStyleSchema } from './color-style.schema'
import { z } from 'zod'
import { radiusProjection } from '../generated/radius-projection'

import { builtInThemeIdSchema, customThemeIdSchema } from './complete-theme.schema'

export const colorModePreferenceValues = ['light', 'dark', 'system'] as const
export const contrastPreferenceValues = ['standard', 'enhanced'] as const
export const materialPreferenceValues = ['adaptive', 'reduced', 'solid'] as const
export const uiDensityValues = ['compact', 'comfortable', 'spacious'] as const
export const motionPreferenceValues = ['full', 'reduced', 'none'] as const
export const fontScaleValues = [0.9, 1, 1.1, 1.2] as const

export const colorModePreferenceSchema = z.enum(colorModePreferenceValues)
export const contrastPreferenceSchema = z.enum(contrastPreferenceValues)
export const materialPreferenceSchema = z.enum(materialPreferenceValues)
export const uiDensitySchema = z.enum(uiDensityValues)
export const motionPreferenceSchema = z.enum(motionPreferenceValues)
export const fontScaleSchema = z.union(fontScaleValues.map((value) => z.literal(value)))

export const densityPreferenceSchema = z.strictObject({
  preset: uiDensitySchema,
  scale: z.number().min(0.9).max(1.15).multipleOf(0.05),
})

export const radiusPreferenceSchema = z
  .number()
  .int()
  .min(radiusProjection.minimum)
  .max(radiusProjection.maximum)
  .multipleOf(radiusProjection.step)

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
  colorStyle: colorStyleSchema,
  colorMode: colorModePreferenceSchema,
  theme: themeReferenceSchema,
  contrast: contrastPreferenceSchema,
  material: materialPreferenceSchema,
  density: densityPreferenceSchema,
  fontScale: fontScaleSchema,
  motion: motionPreferenceSchema,
  radius: radiusPreferenceSchema,
})

export type ThemeReference = z.infer<typeof themeReferenceSchema>
export type ColorModePreference = z.infer<typeof colorModePreferenceSchema>
export type ContrastPreference = z.infer<typeof contrastPreferenceSchema>
export type DensityPreference = z.infer<typeof densityPreferenceSchema>
export type FontScale = z.infer<typeof fontScaleSchema>
export type MaterialPreference = z.infer<typeof materialPreferenceSchema>
export type MotionPreference = z.infer<typeof motionPreferenceSchema>
export type UiDensity = z.infer<typeof uiDensitySchema>
