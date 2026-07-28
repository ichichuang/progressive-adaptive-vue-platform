import type { ContrastPreference, MotionPreference, UiDensity } from '../schema/appearance.schema'
import type { ThemeDefinition } from '../schema/theme.schema'
import type { EffectiveColorMode } from './resolve-color-mode'
import type { EffectiveMaterial } from './resolve-material'

export interface AppearanceAttributeTarget {
  setAttribute(name: string, value: string): void
}

export interface EffectiveAppearanceState {
  readonly colorMode: EffectiveColorMode
  readonly contrast: ContrastPreference
  readonly density: UiDensity
  readonly material: EffectiveMaterial
  readonly motion: MotionPreference
  readonly theme: ThemeDefinition['id']
}

export function applyAppearance(
  target: AppearanceAttributeTarget,
  appearance: EffectiveAppearanceState,
): void {
  target.setAttribute('data-color-mode', appearance.colorMode)
  target.setAttribute('data-contrast', appearance.contrast)
  target.setAttribute('data-density', appearance.density)
  target.setAttribute('data-material', appearance.material)
  target.setAttribute('data-motion', appearance.motion)
  target.setAttribute('data-theme', appearance.theme)
}
