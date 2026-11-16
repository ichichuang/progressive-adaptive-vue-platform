import { getLuminance } from 'colorjs.io/fn'
import { parseCssColor } from '../schema/css-color'
import { projectRegionAppearance } from '../runtime/region-appearance'
import { resolvedThemePlane } from '../runtime/theme-registry'
import type { UiAppearanceSnapshot } from '../runtime/ui-appearance-projection'

type Channels = readonly [number, number, number]

interface ChannelBounds {
  readonly lower: Channels
  readonly upper: Channels
}

interface SettingsColorMotion {
  readonly surfaces: readonly (
    'content' | 'sidebar' | 'header' | 'canvas' | 'fill' | 'edge' | 'indicator'
  )[]
  readonly content?: ChannelBounds | undefined
  readonly sidebar?: ChannelBounds | undefined
  readonly header?: ChannelBounds | undefined
  readonly edge?: ChannelBounds | undefined
  readonly indicator?: ChannelBounds | undefined
}

function bounds(
  colors: readonly (string | undefined)[],
  running?: ChannelBounds,
): ChannelBounds | undefined {
  const channels: number[][] = []
  for (const value of colors) {
    // Restrict the supported paints to opaque legacy sRGB, whose interpolation
    // stays inside the channel bounds even when CSS retargets mid-transition.
    if (value === undefined || !/^(?:#[a-f\d]{6}|rgba\(\d+, \d+, \d+, 1\))$/iu.test(value)) return
    const color = parseCssColor(value)
    channels.push(color.coords.map(Number))
  }
  if (running !== undefined) channels.push([...running.lower], [...running.upper])
  const lowest = (index: number): number => Math.min(...channels.map((color) => color[index] ?? 0))
  const highest = (index: number): number => Math.max(...channels.map((color) => color[index] ?? 1))
  return {
    lower: [lowest(0), lowest(1), lowest(2)],
    upper: [highest(0), highest(1), highest(2)],
  }
}

function separated(
  foreground: ChannelBounds | undefined,
  background: ChannelBounds | undefined,
  ratio: number,
): boolean {
  if (foreground === undefined || background === undefined) return false
  const brightness = (coords: Channels): number =>
    getLuminance({ spaceId: 'srgb', coords: [...coords], alpha: 1 }) + 0.05
  return (
    brightness(foreground.lower) >= brightness(background.upper) * ratio ||
    brightness(background.lower) >= brightness(foreground.upper) * ratio
  )
}

function shellRegion(snapshot: Readonly<UiAppearanceSnapshot>, region: 'header' | 'sidebar') {
  const projection = projectRegionAppearance(snapshot, region)
  if (region === 'header' && (snapshot.colorStyle !== 'dark-frame' || !projection.isCustomized))
    return undefined
  if (
    region === 'sidebar' &&
    !['unified', 'dark-navigation', 'dark-frame'].includes(snapshot.colorStyle)
  )
    return undefined
  const palette = projection.appearance.colorPalette
  return {
    surface: projection.surface.background,
    text: [projection.surface.foreground, palette.text.primary, palette.text.secondary],
    action: palette.roles.primary.foreground,
    focus: palette.roles.primary.focus,
  }
}

/** A fixed set of actual Settings paints, checked once per accepted appearance change. */
export function projectSettingsColorMotion(
  previous: Readonly<UiAppearanceSnapshot>,
  next: Readonly<UiAppearanceSnapshot>,
  running?: SettingsColorMotion,
): SettingsColorMotion {
  const previousPlane = resolvedThemePlane(
    previous.themeEntry.definition,
    previous.colorMode,
    previous.contrast,
  )
  const nextPlane = resolvedThemePlane(next.themeEntry.definition, next.colorMode, next.contrast)
  const colors = (role: string) => [previousPlane[role], nextPlane[role]]
  const textRatio = next.contrast === 'enhanced' ? 7 : 4.5
  const nextBackdrop = bounds([nextPlane['color.surface.page'], nextPlane['color.surface.panel']])
  const page = bounds(
    [...colors('color.surface.page'), ...colors('color.surface.panel')],
    running?.content,
  )
  const edge = bounds(colors('color.border.default'), running?.edge)
  const indicator = bounds(colors('color.control.primary'), running?.indicator)
  // Text changes with the commit. Only the backing paint (and the separate
  // non-text indicator and edge) can contain a previous interpolation.
  const pageText = [
    nextPlane['color.text.primary'],
    nextPlane['color.text.secondary'],
    nextPlane['color.control.primary'],
  ]
  const content =
    pageText.every((color) => separated(bounds([color]), page, textRatio)) &&
    separated(indicator, page, 3) &&
    separated(edge, page, 3) &&
    separated(bounds(colors('color.focus.ring')), page, 3)
      ? page
      : undefined
  const backdrop = content ?? nextBackdrop
  const visibleEdge = separated(edge, backdrop, 3) ? edge : undefined
  const visibleIndicator = separated(indicator, backdrop, 3) ? indicator : undefined

  function regionBounds(region: 'header' | 'sidebar'): ChannelBounds | undefined {
    const old = shellRegion(previous, region)
    const current = shellRegion(next, region)
    if (old === undefined || current === undefined) return
    const background = bounds([old.surface, current.surface], running?.[region])
    const text = [
      ...current.text,
      current.action.default,
      current.action.hover,
      current.action.pressed,
    ]
    if (
      text.every((color) => separated(bounds([color]), background, textRatio)) &&
      separated(bounds([old.focus, current.focus]), background, 3)
    )
      return background
  }

  const header = regionBounds('header')
  const sidebar = regionBounds('sidebar')
  const surfaces: SettingsColorMotion['surfaces'][number][] = []
  if (content !== undefined) surfaces.push('content', 'fill')
  if (visibleEdge !== undefined) surfaces.push('edge')
  if (visibleIndicator !== undefined) surfaces.push('indicator')
  if (header !== undefined) surfaces.push('header')
  if (sidebar !== undefined) surfaces.push('sidebar')
  // A transparent header exposes the canvas behind its text.
  if (header !== undefined && sidebar !== undefined && content !== undefined)
    surfaces.push('canvas')
  return { surfaces, content, sidebar, header, edge: visibleEdge, indicator: visibleIndicator }
}
