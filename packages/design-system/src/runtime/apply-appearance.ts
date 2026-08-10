import type {
  ContrastPreference,
  FontScale,
  MotionPreference,
  UiDensity,
} from '../schema/appearance.schema'
import type { ThemeReference } from '../schema/preference.schema'
import { clearCustomThemeBank } from './theme-registry'
import type { EffectiveColorMode } from './resolve-color-mode'
import type { EffectiveMaterial } from './resolve-material'

interface AppearanceStyleTarget {
  getPropertyPriority(name: string): string
  getPropertyValue(name: string): string
  removeProperty(name: string): string
  setProperty(name: string, value: string, priority?: string): void
}

interface AppearanceTarget {
  readonly style: AppearanceStyleTarget
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  removeAttribute(name: string): void
  setAttribute(name: string, value: string): void
}

export interface EffectiveAppearanceState {
  readonly colorMode: EffectiveColorMode
  readonly contrast: ContrastPreference
  readonly density: UiDensity
  readonly fontScale: FontScale
  readonly material: EffectiveMaterial
  readonly motion: MotionPreference
  readonly theme: ThemeReference
}

export function applyAppearance(
  target: AppearanceTarget,
  appearance: EffectiveAppearanceState,
): void {
  if (appearance.theme.registryKind === 'built-in') {
    clearCustomThemeBank(target)
  }

  target.setAttribute('data-color-mode', appearance.colorMode)
  target.setAttribute('data-theme-kind', appearance.theme.registryKind)
  target.setAttribute('data-theme', appearance.theme.themeId)
  target.setAttribute('data-contrast', appearance.contrast)
  target.setAttribute('data-material', appearance.material)
  target.setAttribute('data-density', appearance.density)
  target.setAttribute('data-motion', appearance.motion)
  target.style.setProperty('--ui-font-scale', String(appearance.fontScale))
}
