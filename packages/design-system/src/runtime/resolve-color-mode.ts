import type { ColorModePreference } from '../schema/appearance.schema'

export type EffectiveColorMode = 'dark' | 'light'

export interface ResolveColorModeInput {
  readonly prefersDark: boolean
  readonly storedColorMode: ColorModePreference
}

export const colorModeResolutionContract = {
  dark: 'dark',
  light: 'light',
  system: 'system',
} as const

export function resolveColorMode({
  prefersDark,
  storedColorMode,
}: ResolveColorModeInput): EffectiveColorMode {
  if (storedColorMode === colorModeResolutionContract.system) {
    return prefersDark ? colorModeResolutionContract.dark : colorModeResolutionContract.light
  }

  return storedColorMode
}
