import { uiMotionPresets, type UiMotionPreset } from '@platform/ui'

export type CinematicCategory = 'overview' | (typeof uiMotionPresets)[UiMotionPreset]['category']
export function cinematicPresets(category: CinematicCategory): UiMotionPreset[] {
  return (Object.keys(uiMotionPresets) as UiMotionPreset[]).filter(
    (preset) => category === 'overview' || uiMotionPresets[preset].category === category,
  )
}

import type { ConsoleMessageKey } from '../../../shared/i18n'
export const cinematicCopy = {
  'theme-rift': {
    title: 'cinematic.theme-rift.title',
    description: 'cinematic.theme-rift.description',
  },
  curtain: { title: 'cinematic.curtain.title', description: 'cinematic.curtain.description' },
  iris: { title: 'cinematic.iris.title', description: 'cinematic.iris.description' },
  'page-peel': {
    title: 'cinematic.page-peel.title',
    description: 'cinematic.page-peel.description',
  },
  'camera-push': {
    title: 'cinematic.camera-push.title',
    description: 'cinematic.camera-push.description',
  },
  'card-expand': {
    title: 'cinematic.card-expand.title',
    description: 'cinematic.card-expand.description',
  },
  'paper-tear': {
    title: 'cinematic.paper-tear.title',
    description: 'cinematic.paper-tear.description',
  },
  'ink-reveal': {
    title: 'cinematic.ink-reveal.title',
    description: 'cinematic.ink-reveal.description',
  },
  'liquid-refraction': {
    title: 'cinematic.liquid-refraction.title',
    description: 'cinematic.liquid-refraction.description',
  },
  'pixel-dissolve': {
    title: 'cinematic.pixel-dissolve.title',
    description: 'cinematic.pixel-dissolve.description',
  },
  'particle-scatter': {
    title: 'cinematic.particle-scatter.title',
    description: 'cinematic.particle-scatter.description',
  },
  'text-reveal': {
    title: 'cinematic.text-reveal.title',
    description: 'cinematic.text-reveal.description',
  },
  'text-dust': {
    title: 'cinematic.text-dust.title',
    description: 'cinematic.text-dust.description',
  },
} as const satisfies Record<
  UiMotionPreset,
  { readonly title: ConsoleMessageKey; readonly description: ConsoleMessageKey }
>
export const cinematicStatusCopy = {
  ready: 'cinematic.status.ready',
  playing: 'cinematic.status.playing',
  held: 'cinematic.status.held',
  fallback: 'cinematic.status.fallback',
  reduced: 'cinematic.status.reduced',
  none: 'cinematic.status.none',
  failed: 'cinematic.status.failed',
} as const satisfies Record<string, ConsoleMessageKey>
