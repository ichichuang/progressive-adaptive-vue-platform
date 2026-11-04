import Color from 'colorjs.io'

import type { ThemeColorPalette } from '../schema/theme-color-palette.schema'
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
    for (const [key, item] of Object.entries(value)) collect(item, path ? `${path}.${key}` : key)
  }
  collect(palette, '')
  return entries
}

export function validateThemeColorPalette(
  palette: ThemeColorPalette,
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
  const textMinimum = minimum(textContract)
  const boundaryMinimum = minimum(boundaryContract)
  function pair(foreground: string, background: string, required: number, name: string): void {
    const foregroundColor = new Color(foreground)
    const backgroundColor = new Color(background)
    if (!foregroundColor.inGamut('srgb') || !backgroundColor.inGamut('srgb'))
      throw new Error(`${context}:${name}: palette color is outside sRGB.`)
    const ratio = foregroundColor.contrastWCAG21(backgroundColor)
    if (!Number.isFinite(ratio) || ratio < required)
      throw new Error(`${context}:${name}: contrast ${String(ratio)} is below ${String(required)}.`)
  }
  const surfaces = Object.entries(palette.surfaces)
  for (const [name, foreground] of Object.entries(palette.text))
    for (const [surface, background] of surfaces)
      pair(foreground, background, textMinimum, `text.${name}/${surface}`)
  for (const [surface, background] of surfaces)
    pair(palette.borders.control, background, boundaryMinimum, `control-border/${surface}`)
  for (const [name, role] of Object.entries(palette.roles)) {
    for (const [state, foreground] of Object.entries(role.foreground)) {
      for (const [surface, background] of surfaces)
        pair(foreground, background, textMinimum, `${name}.foreground.${state}/${surface}`)
      for (const [stateName, background] of Object.entries(role.soft.background))
        pair(foreground, background, textMinimum, `${name}.foreground.${state}/soft.${stateName}`)
    }
    for (const [state, background] of Object.entries(role.solid.background))
      pair(role.solid.foreground, background, textMinimum, `${name}.on-solid/${state}`)
    for (const [state, background] of Object.entries(role.soft.background)) {
      pair(role.soft.foreground, background, textMinimum, `${name}.on-soft/${state}`)
      pair(role.soft.icon, background, boundaryMinimum, `${name}.soft-icon/${state}`)
      pair(role.soft.border, background, boundaryMinimum, `${name}.soft-border/${state}`)
    }
    for (const [surface, background] of surfaces) {
      pair(role.focus, background, boundaryMinimum, `${name}.focus/${surface}`)
      pair(role.soft.border, background, boundaryMinimum, `${name}.border/${surface}`)
    }
    pair(role.disabled.foreground, role.disabled.background, textMinimum, `${name}.disabled`)
  }
  pair(palette.tooltip.foreground, palette.tooltip.background, textMinimum, 'tooltip')
}
