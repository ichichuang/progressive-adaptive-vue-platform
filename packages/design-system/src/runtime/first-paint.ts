import type { FontScale } from '../schema/appearance.schema'
import type { UserPreferenceV2 } from '../schema/preference.schema'
import type { EffectiveAppearanceState } from './apply-appearance'
import { upgradeUserPreference } from './preference-schema-upgrades'
import { resolveColorMode } from './resolve-color-mode'
import { resolveMaterial } from './resolve-material'

export interface FirstPaintApplicationBoundary {
  readonly preferenceStorageKey: string
}

export interface FirstPaintResolutionEnvironment {
  readonly backdropFilterSupported: boolean
  readonly forcedColorsActive: boolean
  readonly prefersDark: boolean
  readonly reducedTransparencyRequested: boolean
}

export interface PrepareFirstPaintInput {
  readonly environment: FirstPaintResolutionEnvironment
  readonly storedPreference: unknown
}

export interface PreparedFirstPaintState {
  readonly densityScale: number
  readonly effectiveAppearance: EffectiveAppearanceState
  readonly fontScale: FontScale
  readonly storedPreference: UserPreferenceV2
}

export function prepareFirstPaint({
  environment,
  storedPreference,
}: PrepareFirstPaintInput): PreparedFirstPaintState {
  const preference = upgradeUserPreference(storedPreference)

  return {
    storedPreference: preference,
    effectiveAppearance: {
      colorMode: resolveColorMode({
        prefersDark: environment.prefersDark,
        storedColorMode: preference.appearance.colorMode,
      }),
      contrast: preference.appearance.contrast,
      density: preference.appearance.density.preset,
      material: resolveMaterial({
        backdropFilterSupported: environment.backdropFilterSupported,
        forcedColorsActive: environment.forcedColorsActive,
        reducedTransparencyRequested: environment.reducedTransparencyRequested,
        storedMaterial: preference.appearance.material,
      }),
      motion: preference.appearance.motion,
      theme: preference.appearance.theme,
    },
    densityScale: preference.appearance.density.scale,
    fontScale: preference.appearance.fontScale,
  }
}
