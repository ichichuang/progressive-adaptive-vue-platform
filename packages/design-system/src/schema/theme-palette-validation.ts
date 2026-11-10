import type { ThemeColorPalette } from './theme-color-palette.schema'

/** Shared by build, runtime and the generated synchronous first-paint initializer. */
export function paletteContrastFailure(
  palette: ThemeColorPalette,
  mode: 'light' | 'dark',
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
    palette.roles.primary.solid.foreground,
    palette.roles.neutral.solid.background.default,
    textMinimum,
    'switch.off-content',
  )

  // Naive 2.45.2 composes colored secondary fills from the solid color and these
  // native light/dark state opacities. The same check runs before first paint.
  const opacity = mode === 'light' ? [0.16, 0.22, 0.28] : [0.16, 0.2, 0.12]
  const channels = (value: string): number[] =>
    [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16))
  for (const tone of ['primary', 'info', 'success', 'warning', 'error'] as const) {
    const foreground = palette.roles[tone].solid.background.default
    const foregroundChannels = channels(foreground)
    for (const [surface, background] of surfaces) {
      const backgroundChannels = channels(background)
      for (const [state, alpha] of opacity.entries()) {
        const composed = foregroundChannels.map(
          (value, index) => value * alpha + (backgroundChannels[index] ?? 0) * (1 - alpha),
        )
        pair(
          foreground,
          `rgb(${composed.join(' ')})`,
          textMinimum,
          `${tone}.native-secondary.${String(state)}/${surface}`,
        )
      }
    }
  }
  return failure
}
