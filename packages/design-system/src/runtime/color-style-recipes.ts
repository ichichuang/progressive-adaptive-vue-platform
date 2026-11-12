import type { AppearanceRegion, ColorStyle } from '../schema/color-style.schema'
import type { EffectiveColorMode } from './resolve-color-mode'

interface RegionRecipe {
  readonly colorMode: EffectiveColorMode
  readonly surface: 'canvas' | 'surface' | 'sunken' | 'tinted' | 'solid'
}
type StylePlane = Readonly<Record<AppearanceRegion, RegionRecipe>>

function plane(
  colorMode: EffectiveColorMode,
  accents: Readonly<Partial<Record<AppearanceRegion, RegionRecipe>>> = {},
): StylePlane {
  const region = Object.freeze({ colorMode, surface: 'surface' as const })
  return Object.freeze({
    sidebar: region,
    header: region,
    tabs: region,
    content: Object.freeze({ colorMode, surface: 'canvas' }),
    footer: region,
    ...Object.fromEntries(
      Object.entries(accents).map(([key, recipe]) => [key, Object.freeze(recipe)]),
    ),
  })
}

/** Curated compositions reuse the active brand's validated palette, never arbitrary colors. */
export const colorStyleRecipes: Readonly<
  Record<ColorStyle, Readonly<Record<EffectiveColorMode, StylePlane>>>
> = Object.freeze({
  unified: Object.freeze({ light: plane('light'), dark: plane('dark') }),
  'dark-navigation': Object.freeze({
    light: plane('light', { sidebar: { colorMode: 'dark', surface: 'sunken' } }),
    dark: plane('dark', { sidebar: { colorMode: 'dark', surface: 'sunken' } }),
  }),
  'brand-sidebar': Object.freeze({
    light: plane('light', { sidebar: { colorMode: 'dark', surface: 'tinted' } }),
    dark: plane('dark', { sidebar: { colorMode: 'dark', surface: 'tinted' } }),
  }),
  'brand-header': Object.freeze({
    light: plane('light', { header: { colorMode: 'light', surface: 'solid' } }),
    dark: plane('dark', { header: { colorMode: 'dark', surface: 'solid' } }),
  }),
  'dark-frame': Object.freeze({
    light: plane('light', {
      header: { colorMode: 'dark', surface: 'sunken' },
      sidebar: { colorMode: 'dark', surface: 'sunken' },
    }),
    dark: plane('dark', {
      header: { colorMode: 'dark', surface: 'sunken' },
      sidebar: { colorMode: 'dark', surface: 'sunken' },
    }),
  }),
  'brand-frame': Object.freeze({
    light: plane('light', {
      header: { colorMode: 'light', surface: 'solid' },
      sidebar: { colorMode: 'dark', surface: 'tinted' },
    }),
    dark: plane('dark', {
      header: { colorMode: 'dark', surface: 'solid' },
      sidebar: { colorMode: 'dark', surface: 'tinted' },
    }),
  }),
  'soft-frame': Object.freeze({
    light: plane('light', {
      header: { colorMode: 'light', surface: 'tinted' },
      sidebar: { colorMode: 'light', surface: 'tinted' },
      tabs: { colorMode: 'light', surface: 'tinted' },
      footer: { colorMode: 'light', surface: 'tinted' },
    }),
    dark: plane('dark', {
      header: { colorMode: 'dark', surface: 'tinted' },
      sidebar: { colorMode: 'dark', surface: 'tinted' },
      tabs: { colorMode: 'dark', surface: 'tinted' },
      footer: { colorMode: 'dark', surface: 'tinted' },
    }),
  }),
})
