import type { MaterialPreference } from '../schema/appearance.schema'

export type EffectiveMaterial = MaterialPreference

export interface ResolveMaterialInput {
  readonly backdropFilterSupported: boolean
  readonly forcedColorsActive: boolean
  readonly reducedTransparencyRequested: boolean
  readonly storedMaterial: MaterialPreference
}

export function resolveMaterial({
  backdropFilterSupported,
  forcedColorsActive,
  reducedTransparencyRequested,
  storedMaterial,
}: ResolveMaterialInput): EffectiveMaterial {
  if (forcedColorsActive || storedMaterial === 'solid') {
    return 'solid'
  }

  if (storedMaterial === 'reduced') {
    return 'reduced'
  }

  if (reducedTransparencyRequested) {
    return 'reduced'
  }

  return backdropFilterSupported ? 'adaptive' : 'solid'
}
