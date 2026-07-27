import Color from 'colorjs.io'

import type { ColorValue } from '../schema/token.schema'

function round(value: number): number {
  return Number(value.toFixed(6))
}

export function normalizeColor(value: ColorValue, tokenPath: string): ColorValue {
  const [lightness, chroma, hue] = value.components
  const alpha = value.alpha ?? 1
  const color = new Color('oklch', [lightness, chroma, hue], alpha)

  if (!color.inGamut('srgb')) {
    throw new Error(`${tokenPath}: color must be representable in the sRGB gamut.`)
  }

  return {
    colorSpace: 'oklch',
    components: [round(lightness), round(chroma), round(hue)],
    ...(alpha === 1 ? {} : { alpha: round(alpha) }),
  }
}
