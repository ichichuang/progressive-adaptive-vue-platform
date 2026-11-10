import { z } from 'zod'

// Every complete Theme supplies the same four semantic palette planes.
const paletteColor = z.string().regex(/^#[0-9A-F]{6}$/u)
const interactionColors = z.strictObject({
  default: paletteColor,
  hover: paletteColor,
  pressed: paletteColor,
})
const disabledColors = z.strictObject({
  background: paletteColor,
  foreground: paletteColor,
  border: paletteColor,
})
const colorFamily = z.strictObject({
  foreground: interactionColors.extend({ suppl: paletteColor }),
  solid: z.strictObject({
    background: interactionColors.extend({ focus: paletteColor }),
    foreground: paletteColor,
    border: paletteColor,
  }),
  soft: z.strictObject({
    background: interactionColors,
    foreground: paletteColor,
    icon: paletteColor,
    border: paletteColor,
  }),
  focus: paletteColor,
  disabled: disabledColors,
})

const themeColorPaletteSchema = z.strictObject({
  surfaces: z.strictObject({
    canvas: paletteColor,
    surface: paletteColor,
    raised: paletteColor,
    sunken: paletteColor,
  }),
  roles: z.strictObject({
    primary: colorFamily,
    info: colorFamily,
    success: colorFamily,
    warning: colorFamily,
    error: colorFamily,
    neutral: colorFamily,
  }),
  text: z.strictObject({
    primary: paletteColor,
    secondary: paletteColor,
    muted: paletteColor,
    onSurface: paletteColor,
  }),
  borders: z.strictObject({ control: paletteColor, decorative: paletteColor }),
  tooltip: z.strictObject({ background: paletteColor, foreground: paletteColor }),
})

const paletteContrasts = z.strictObject({
  standard: themeColorPaletteSchema,
  enhanced: themeColorPaletteSchema,
})
export const themeColorPalettesSchema = z.strictObject({
  light: paletteContrasts,
  dark: paletteContrasts,
})

type PaletteReadonly<Value> = {
  readonly [Key in keyof Value]: Value[Key] extends object
    ? PaletteReadonly<Value[Key]>
    : Value[Key]
}
export type ThemeColorPalette = PaletteReadonly<z.infer<typeof themeColorPaletteSchema>>
export type ThemeColorPalettes = PaletteReadonly<z.infer<typeof themeColorPalettesSchema>>
