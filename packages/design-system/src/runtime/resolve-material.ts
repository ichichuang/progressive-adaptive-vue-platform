import type { MaterialPreference } from '../schema/appearance.schema'

export type EffectiveMaterial = MaterialPreference

export interface ResolveMaterialInput {
  readonly backdropFilterSupported: boolean
  readonly forcedColorsActive: boolean
  readonly reducedTransparencyRequested: boolean
  readonly storedMaterial: MaterialPreference
}

export const materialResolutionContract = {
  adaptive: 'adaptive',
  reduced: 'reduced',
  solid: 'solid',
} as const

export function resolveMaterial({
  backdropFilterSupported,
  forcedColorsActive,
  reducedTransparencyRequested,
  storedMaterial,
}: ResolveMaterialInput): EffectiveMaterial {
  if (forcedColorsActive || storedMaterial === materialResolutionContract.solid) {
    return materialResolutionContract.solid
  }

  if (storedMaterial === materialResolutionContract.reduced) {
    return materialResolutionContract.reduced
  }

  if (reducedTransparencyRequested) {
    return materialResolutionContract.reduced
  }

  return backdropFilterSupported
    ? materialResolutionContract.adaptive
    : materialResolutionContract.solid
}
