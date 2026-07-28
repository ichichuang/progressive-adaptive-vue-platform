import type { ColorModePreference } from '../schema/appearance.schema'

export type EffectiveColorMode = 'dark' | 'light'

export interface ResolveColorModeInput {
  readonly prefersDark: boolean
  readonly storedColorMode: ColorModePreference
}

export function resolveColorMode({
  prefersDark,
  storedColorMode,
}: ResolveColorModeInput): EffectiveColorMode {
  if (storedColorMode === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return storedColorMode
}
