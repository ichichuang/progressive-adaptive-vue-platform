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

// Decorative emphasis, not success/warning/error semantics. Always use a soft/solid
// background with its matching foreground; standalone foreground targets neutral surfaces.
const expressionColorFamily = z.strictObject({
  foreground: paletteColor,
  soft: z.strictObject({ background: paletteColor, foreground: paletteColor }),
  solid: z.strictObject({ background: paletteColor, foreground: paletteColor }),
})

const themeColorPaletteSchema = z.strictObject({
  expression: z.strictObject({ accentA: expressionColorFamily, accentB: expressionColorFamily }),
  // Ordered categorical marks: >= 3:1 against theme surfaces, not text colors.
  // Keep a stable series domain; more than eight categories need another visual encoding
  // or an explicit application palette rather than a promise of unique default colors.
  dataViz: z.strictObject({
    categorical: z.strictObject({
      series1: paletteColor,
      series2: paletteColor,
      series3: paletteColor,
      series4: paletteColor,
      series5: paletteColor,
      series6: paletteColor,
      series7: paletteColor,
      series8: paletteColor,
    }),
  }),
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
