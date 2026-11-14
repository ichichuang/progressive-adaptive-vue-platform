import type { UiMotionPreset } from '@platform/ui'
import type { RouteTransitionRule } from './route-transition-types'
import {
  routeTransitionPresetRegistry,
  getRouteTransitionPreset,
} from './route-transition-preset-registry'

const cinematicRouteRecipes = {
  'theme-rift': { exit: 'theme-rift', enter: 'theme-rift', coverMs: 220, revealMs: 400 },
  'mosaic-burst': { exit: 'pixel-dissolve', enter: 'iris', coverMs: 360, revealMs: 560 },
  'ink-surge': { exit: 'ink-reveal', enter: 'ink-reveal', coverMs: 320, revealMs: 620 },
  'paper-turn': { exit: 'page-peel', enter: 'paper-tear', coverMs: 320, revealMs: 540 },
} as const satisfies Record<
  string,
  {
    readonly exit: UiMotionPreset
    readonly enter: UiMotionPreset
    readonly coverMs: number
    readonly revealMs: number
  }
>
export const cinematicRoutePresetIds = [
  'theme-rift',
  'mosaic-burst',
  'ink-surge',
  'paper-turn',
] as const
export type CinematicRoutePreset = (typeof cinematicRoutePresetIds)[number]
export function isCinematicRoutePreset(value: unknown): value is CinematicRoutePreset {
  return cinematicRoutePresetIds.some((preset) => preset === value)
}
export function getCinematicRouteRecipe(preset: CinematicRoutePreset) {
  return cinematicRouteRecipes[preset]
}
export const routeTransitionShowcasePresetIds = [
  ...routeTransitionPresetRegistry.map((preset) => preset.id),
  ...cinematicRoutePresetIds,
] as const
export type RouteTransitionShowcasePreset = (typeof routeTransitionShowcasePresetIds)[number]
export type RouteTransitionShowcaseRouteName =
  'component-motion-route-transitions' | 'component-motion-route-preview'

/** Explicit demonstrations never change the ordinary navigation rules. */
export function isRouteTransitionShowcasePair(from: string, to: string): boolean {
  return (
    (from === 'component-motion-route-transitions' && to === 'component-motion-route-preview') ||
    (from === 'component-motion-route-preview' && to === 'component-motion-route-transitions')
  )
}

/** Route names only; runtime eligibility still belongs to the coordinator. */
export function isWelcomeRouteEdge(from: string, to: string): boolean {
  return from !== to && (from === 'workbench-welcome' || to === 'workbench-welcome')
}
/** Welcome edges use Rift; other cinematic recipes remain isolated to the demo pair. */
export function allowsCinematicRoutePreset(
  from: string,
  to: string,
  preset: unknown,
): preset is CinematicRoutePreset {
  return (
    isCinematicRoutePreset(preset) &&
    (isRouteTransitionShowcasePair(from, to) ||
      (preset === 'theme-rift' && isWelcomeRouteEdge(from, to)))
  )
}

export function routeTransitionShowcaseRules(
  from: string,
  to: string,
  preset: unknown,
): readonly RouteTransitionRule[] | undefined {
  if (!isRouteTransitionShowcasePair(from, to)) return undefined
  const registered = getRouteTransitionPreset(preset)
  if (registered === undefined) return undefined
  return [
    {
      ...(registered.id === 'route-transition.axis-inline-soft'
        ? {
            kind: 'ordered-routes',
            routeNames: [
              'component-motion-route-transitions',
              'component-motion-route-preview',
            ] as const,
          }
        : {
            kind: 'exact-route-pair',
            fromRouteName: 'component-motion-route-transitions',
            toRouteName: 'component-motion-route-preview',
          }),
      ruleId: 'route-transition-rule.explicit-showcase',
      priority: 0,
      forwardPresetId: registered.id,
      reversePresetId: registered.id,
      fallbackPresetId: registered.directionAware
        ? 'route-transition.content-crossfade'
        : registered.id,
    },
  ]
}
