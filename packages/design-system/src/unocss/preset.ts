import { definePreset } from '@unocss/core'
import type { Preset } from 'unocss'

import { platformTheme } from '../generated/unocss-theme'

export const platformPreset = definePreset((): Preset => ({
  name: '@platform/design-system',
  theme: platformTheme,
}))
