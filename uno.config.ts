import { defineConfig } from 'unocss'
import { presetIcons } from '@unocss/preset-icons'
import { presetWind4 } from '@unocss/preset-wind4'
import { platformPreset } from '@platform/design-system'

export default defineConfig({
  blocklist: [
    [
      'transition-all',
      {
        message: 'Use an explicit transition property.',
      },
    ],
    [
      /^(?:bg|border|fill|from|outline|ring|stroke|text|to|via)-(?:amber|blue|cyan|emerald|fuchsia|gray|green|indigo|lime|neutral|orange|pink|purple|red|rose|sky|slate|stone|teal|violet|yellow|zinc)(?:-\d+)?(?:\/\d+)?$/,
      {
        message: 'Use project semantic design tokens instead of preset palette colors.',
      },
    ],
  ],
  presets: [
    presetWind4({
      preflights: {
        reset: true,
        theme: {
          mode: 'on-demand',
        },
      },
    }),
    presetIcons({
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json').then((module) => module.default),
      },
    }),
    platformPreset(),
  ],
})
