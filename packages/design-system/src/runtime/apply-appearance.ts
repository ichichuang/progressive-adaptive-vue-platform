import type {
  ContrastPreference,
  FontScale,
  MotionPreference,
  UiDensity,
} from '../schema/appearance.schema'
import type { LegacySeedThemeDefinition } from '../schema/legacy-seed-theme.schema'
import type { EffectiveColorMode } from './resolve-color-mode'
import type { EffectiveMaterial } from './resolve-material'

export interface AppearanceAttributeTarget {
  setAttribute(name: string, value: string): void
}

export interface AppearanceStyleTarget {
  setProperty(name: `--ui-${string}`, value: string): void
}

export interface AppearanceApplicationTarget extends AppearanceAttributeTarget {
  readonly style: AppearanceStyleTarget
}

export interface EffectiveAppearanceState {
  readonly colorMode: EffectiveColorMode
  readonly contrast: ContrastPreference
  readonly density: UiDensity
  readonly fontScale: FontScale
  readonly material: EffectiveMaterial
  readonly motion: MotionPreference
  readonly theme: LegacySeedThemeDefinition['id']
}

export const effectiveAppearanceAttributes = [
  ['colorMode', 'data-color-mode'],
  ['contrast', 'data-contrast'],
  ['density', 'data-density'],
  ['material', 'data-material'],
  ['motion', 'data-motion'],
  ['theme', 'data-theme'],
] as const satisfies readonly (readonly [keyof EffectiveAppearanceState, `data-${string}`])[]

export const effectiveAppearanceCustomProperties = [
  ['fontScale', '--ui-font-scale'],
] as const satisfies readonly (readonly [keyof EffectiveAppearanceState, `--ui-${string}`])[]

export function applyAppearance(
  target: AppearanceApplicationTarget,
  appearance: EffectiveAppearanceState,
): void {
  for (const [stateKey, attributeName] of effectiveAppearanceAttributes) {
    target.setAttribute(attributeName, appearance[stateKey])
  }

  for (const [stateKey, propertyName] of effectiveAppearanceCustomProperties) {
    target.style.setProperty(propertyName, String(appearance[stateKey]))
  }
}
