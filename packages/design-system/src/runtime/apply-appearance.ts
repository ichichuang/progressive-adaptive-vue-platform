import {
  radiusPreferenceSchema,
  type ContrastPreference,
  type FontScale,
  type MotionPreference,
  type UiDensity,
} from '../schema/appearance.schema'
import type { ThemeReference } from '../schema/preference.schema'
import { clearCustomThemeBank } from './theme-registry'
import type { EffectiveColorMode } from './resolve-color-mode'
import type { EffectiveMaterial } from './resolve-material'
import { radiusProjection } from '../generated/radius-projection'
import { resolveRadius } from './radius-projection'

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
  readonly radius: number
  readonly theme: ThemeReference
}

/** Capture private radius writes without exposing their variable identities to the app. */
export function captureRadius(target: Pick<AppearanceTarget, 'style'>): () => void {
  const captured = ['--ui-radius-control', '--ui-radius-panel', '--ui-radius-small'].map((name) => {
    const value = target.style.getPropertyValue(name)
    const priority = target.style.getPropertyPriority(name)
    return { name, value, priority, present: value !== '' || priority !== '' }
  })
  return () => {
    for (const property of captured) {
      if (property.present)
        target.style.setProperty(property.name, property.value, property.priority)
      else target.style.removeProperty(property.name)
    }
  }
}

export function applyAppearance(
  target: AppearanceTarget,
  appearance: EffectiveAppearanceState,
): void {
  const radius = resolveRadius(radiusPreferenceSchema.parse(appearance.radius), radiusProjection)
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
  target.style.setProperty('--ui-radius-control', `${String(radius.control)}px`)
  target.style.setProperty('--ui-radius-panel', `${String(radius.panel)}px`)
  target.style.setProperty('--ui-radius-small', `${String(radius.small)}px`)
}
