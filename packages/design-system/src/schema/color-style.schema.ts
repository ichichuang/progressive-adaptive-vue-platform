import { z } from 'zod'

export const colorStyleIds = [
  'unified',
  'dark-navigation',
  'brand-sidebar',
  'brand-header',
  'dark-frame',
  'brand-frame',
  'soft-frame',
] as const
export const colorStyleSchema = z.enum(colorStyleIds)
export type ColorStyle = z.infer<typeof colorStyleSchema>
export const appearanceRegionKeys = ['sidebar', 'header', 'tabs', 'content', 'footer'] as const
export type AppearanceRegion = (typeof appearanceRegionKeys)[number]
