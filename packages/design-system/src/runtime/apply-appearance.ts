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

export const effectiveAppearanceAttributes = [
  ['colorMode', 'data-color-mode'],
  ['contrast', 'data-contrast'],
  ['density', 'data-density'],
  ['material', 'data-material'],
  ['motion', 'data-motion'],
  ['theme', 'data-theme'],
] as const satisfies readonly (readonly [keyof EffectiveAppearanceState, `data-${string}`])[]

export function applyAppearance(
  target: AppearanceAttributeTarget,
  appearance: EffectiveAppearanceState,
): void {
  for (const [stateKey, attributeName] of effectiveAppearanceAttributes) {
    target.setAttribute(attributeName, appearance[stateKey])
  }
}
