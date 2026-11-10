import { generatedThemeRegistry } from '../generated/theme-registry'
import { parseCssColor } from '../schema/css-color'
import type { ContrastPreference } from '../schema/appearance.schema'
import type { ThemeColorPalette } from '../schema/theme-color-palette.schema'

type LinearColor = readonly [number, number, number]

function linearColor(value: string): LinearColor {
  const parsed = parseCssColor(value)
  const [red, green, blue] = parsed.coords
  if (
    parsed.spaceId !== 'srgb' ||
    parsed.alpha !== 1 ||
    typeof red !== 'number' ||
    typeof green !== 'number' ||
    typeof blue !== 'number' ||
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    throw new Error('A validated sequential color must have opaque sRGB channels.')
  }
  const linear = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  return [linear(red), linear(green), linear(blue)]
}

function luminance([red, green, blue]: LinearColor): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function maximumSafeMix(
  start: number,
  end: number,
  backgrounds: readonly number[],
  minimum: number,
): number {
  const change = end - start
  if (change === 0) return 0
  let maximum = 1
  for (const background of backgrounds) {
    if (start < background && change > 0) {
      const upper = (background + 0.05) / minimum - 0.05
      maximum = Math.min(maximum, (upper - start) / change)
    } else if (start > background && change < 0) {
      const lower = minimum * (background + 0.05) - 0.05
      maximum = Math.min(maximum, (start - lower) / -change)
    }
  }
  // Leave room for sRGB channel rounding at the contrast boundary.
  return Math.max(0, Math.min(1, maximum)) * 0.9
}

function mixedSrgb(start: LinearColor, end: LinearColor, fraction: number): string {
  const mixChannel = (value: number, target: number): number => {
    const linear = Math.max(0, Math.min(1, value * (1 - fraction) + target * fraction))
    const srgb = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
    return Math.round(srgb * 255)
  }
  const channels = [
    mixChannel(start[0], end[0]),
    mixChannel(start[1], end[1]),
    mixChannel(start[2], end[2]),
  ]
  return `rgb(${channels.join(', ')})`
}

/** Derive a sequential indicator scale from the active validated Theme palette. */
export function projectSequentialColorScale(
  palette: ThemeColorPalette,
  contrast: ContrastPreference,
): Readonly<{ minimum: string; active: readonly string[] }> {
  const contract = generatedThemeRegistry.namedContrasts.find(
    (pair) => pair.id === 'control-primary-on-panel',
  )
  if (contract === undefined) throw new Error('The control contrast authority is unavailable.')
  const minimum = contrast === 'enhanced' ? contract.enhancedMinimum : contract.standardMinimum
  const background = palette.roles.primary.soft.background.default
  const base = linearColor(palette.roles.primary.foreground.default)
  const low = linearColor(background)
  const baseLuminance = luminance(base)
  const lowLuminance = luminance(low)
  const extreme: LinearColor = lowLuminance > baseLuminance ? [0, 0, 0] : [1, 1, 1]
  const extremeLuminance = luminance(extreme)
  const backgrounds = [background, ...Object.values(palette.surfaces)].map((value) =>
    luminance(linearColor(value)),
  )
  const lowDistance = Math.abs(lowLuminance - baseLuminance)
  const highDistance = Math.abs(extremeLuminance - baseLuminance)
  const lowRange = lowDistance * maximumSafeMix(baseLuminance, lowLuminance, backgrounds, minimum)
  const highRange =
    highDistance * maximumSafeMix(baseLuminance, extremeLuminance, backgrounds, minimum)
  const backgroundIsLighter = lowLuminance > baseLuminance
  const direction = backgroundIsLighter ? -1 : 1
  const contrastWithBackground = (value: number): number =>
    (Math.max(value, lowLuminance) + 0.05) / (Math.min(value, lowLuminance) + 0.05)
  const firstContrast = contrastWithBackground(baseLuminance - direction * lowRange)
  const lastContrast = contrastWithBackground(baseLuminance + direction * highRange)
  const active = Array.from({ length: 4 }, (_, index) => {
    // Equal ratios make consecutive levels more evenly distinguishable than equal luminance gaps.
    const targetContrast = firstContrast * (lastContrast / firstContrast) ** (index / 3)
    const targetLuminance = backgroundIsLighter
      ? (lowLuminance + 0.05) / targetContrast - 0.05
      : targetContrast * (lowLuminance + 0.05) - 0.05
    const position = (targetLuminance - baseLuminance) * direction
    const towardLow = position < 0
    const distance = towardLow ? lowDistance : highDistance
    return mixedSrgb(
      base,
      towardLow ? low : extreme,
      distance === 0 ? 0 : Math.abs(position) / distance,
    )
  })
  return Object.freeze({ minimum: background, active: Object.freeze(active) })
}
