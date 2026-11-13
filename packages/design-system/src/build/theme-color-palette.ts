import Color from 'colorjs.io'

import type { ThemeColorPalette } from '../schema/theme-color-palette.schema'
import { paletteContrastFailure } from '../schema/theme-palette-validation'
import { ActiveNamedContrastRegistry } from './public-role-registry'

export function themePaletteColorEntries(palette: ThemeColorPalette): ReadonlyMap<string, string> {
  const entries = new Map<string, string>()
  function collect(value: unknown, path: string): void {
    if (typeof value === 'string') {
      entries.set(path, value)
      return
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${path}: invalid theme palette source.`)
    for (const [key, item] of Object.entries(value)) {
      const segment = key.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
      collect(item, path ? `${path}.${segment}` : segment)
    }
  }
  collect(palette, '')
  return entries
}

export function validateThemeColorPalette(
  palette: ThemeColorPalette,
  mode: 'light' | 'dark',
  contrast: 'standard' | 'enhanced',
  context: string,
): void {
  const textContract = ActiveNamedContrastRegistry.records.find(
    (record) => record.id === 'text-primary-on-panel',
  )
  const boundaryContract = ActiveNamedContrastRegistry.records.find(
    (record) => record.id === 'control-primary-on-panel',
  )
  if (textContract === undefined || boundaryContract === undefined)
    throw new Error('The canonical palette contrast requirements are unavailable.')
  const minimum = (record: {
    readonly enhancedMinimum: number
    readonly standardMinimum: number
  }) => (contrast === 'enhanced' ? record.enhancedMinimum : record.standardMinimum)
  function colorContrast(foreground: string, background: string): number {
    const foregroundColor = new Color(foreground)
    const backgroundColor = new Color(background)
    if (!foregroundColor.inGamut('srgb') || !backgroundColor.inGamut('srgb'))
      throw new Error(`${context}: palette color is outside sRGB.`)
    return foregroundColor.contrastWCAG21(backgroundColor)
  }
  const failure = paletteContrastFailure(
    palette,
    mode,
    minimum(textContract),
    minimum(boundaryContract),
    colorContrast,
  )
  if (failure !== null) throw new Error(`${context}:${failure}`)
}
