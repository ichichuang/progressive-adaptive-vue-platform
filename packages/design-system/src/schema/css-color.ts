import {
  A98RGB,
  ColorSpace,
  HSL,
  HWB,
  Lab,
  LCH,
  OKLab,
  OKLCH,
  P3,
  ProPhoto,
  REC_2020,
  XYZ_D50,
  XYZ_D65,
  contrastWCAG21,
  inGamut,
  parse,
  sRGB,
  sRGB_Linear,
  type ColorConstructor,
} from 'colorjs.io/fn'

const supportedCssColorSpaces = [
  sRGB,
  sRGB_Linear,
  HSL,
  HWB,
  Lab,
  LCH,
  OKLab,
  OKLCH,
  P3,
  A98RGB,
  ProPhoto,
  REC_2020,
  XYZ_D50,
  XYZ_D65,
] as const

function ensureSupportedCssColorSpaces(): void {
  for (const colorSpace of supportedCssColorSpaces) {
    if (ColorSpace.registry[colorSpace.id] === undefined) {
      ColorSpace.register(colorSpace)
    }
  }
}

export type ParsedCssColor = ColorConstructor

export function parseCssColor(value: string): ParsedCssColor {
  ensureSupportedCssColorSpaces()
  return parse(value)
}

export function isInSrgbGamut(color: ParsedCssColor): boolean {
  return inGamut(color, 'srgb')
}

export function calculateWcag21Contrast(
  foreground: ParsedCssColor,
  background: ParsedCssColor,
): number {
  return contrastWCAG21(foreground, background)
}
