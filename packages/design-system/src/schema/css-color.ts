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
  getAll,
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

export function formatOpaqueSrgbColor(value: string): string {
  const color = parseCssColor(value)

  if (color.alpha !== 1 || !isInSrgbGamut(color)) {
    throw new Error('UI status colors require opaque sRGB values.')
  }

  const channels = getAll(color, 'srgb').map((channel) => {
    if (channel === null || !Number.isFinite(channel)) {
      throw new Error(`UI status color ${value} has an invalid sRGB channel: ${String(channel)}.`)
    }

    const integerChannel = Math.round(channel * 255)

    if (integerChannel < 0 || integerChannel > 255) {
      throw new Error(`UI status color ${value} cannot be represented as integer sRGB.`)
    }

    return integerChannel
  })

  return `rgba(${channels.join(', ')}, 1)`
}

export function calculateWcag21Contrast(
  foreground: ParsedCssColor,
  background: ParsedCssColor,
): number {
  return contrastWCAG21(foreground, background)
}
