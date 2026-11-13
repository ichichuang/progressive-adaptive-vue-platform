import type { ThemeColorPalette } from './theme-color-palette.schema'

/** Shared by build, runtime and the generated synchronous first-paint initializer. */
export function paletteContrastFailure(
  palette: ThemeColorPalette,
  _mode: 'light' | 'dark',
  textMinimum: number,
  boundaryMinimum: number,
  contrast: (foreground: string, background: string) => number,
): string | null {
  let failure: string | null = null
  function pair(foreground: string, background: string, minimum: number, name: string): void {
    if (failure !== null) return
    const ratio = contrast(foreground, background)
    if (!Number.isFinite(ratio) || ratio < minimum)
      failure = `${name}: contrast ${String(ratio)} is below ${String(minimum)}.`
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
  pair(
    palette.roles.neutral.solid.foreground,
    palette.roles.neutral.solid.background.default,
    textMinimum,
    'switch.off-content',
  )

  for (const [name, accent] of Object.entries(palette.expression)) {
    for (const [surface, background] of surfaces)
      pair(accent.foreground, background, textMinimum, `expression.${name}/${surface}`)
    pair(accent.soft.foreground, accent.soft.background, textMinimum, `expression.${name}.soft`)
    pair(accent.solid.foreground, accent.solid.background, textMinimum, `expression.${name}.solid`)
  }
  const categories = Object.entries(palette.dataViz.categorical)
  if (new Set(categories.map(([, color]) => color)).size !== categories.length)
    return 'dataViz.categorical: every series must have a distinct color.'
  for (const [name, color] of categories)
    for (const [surface, background] of surfaces)
      pair(color, background, boundaryMinimum, `dataViz.${name}/${surface}`)

  // Naive colored secondary buttons use the opaque soft role, validated above.
  return failure
}
