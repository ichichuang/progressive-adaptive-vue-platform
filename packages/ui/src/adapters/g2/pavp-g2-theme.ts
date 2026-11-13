import { projectSequentialColorScale, type UiAppearanceSnapshot } from '@platform/design-system'
import type { Theme } from '@antv/g2'

/** Resolved CSS pixels, measured in the chart's own inherited token scope. */
export interface G2ThemeMetrics {
  readonly fontFamily: string
  readonly bodySize: number
  readonly captionSize: number
  readonly titleSize: number
  readonly controlHeight: number
  readonly controlPadding: number
  readonly spacing: number
  readonly borderWidth: number
  readonly radius: number
  readonly duration: number
  readonly easing: string
}

export function projectG2Theme(appearance: UiAppearanceSnapshot, metrics: G2ThemeMetrics) {
  const { colorPalette: palette } = appearance
  const {
    fontFamily,
    bodySize,
    captionSize,
    titleSize,
    controlHeight,
    controlPadding,
    spacing,
    borderWidth,
    radius,
  } = metrics
  const primary = palette.roles.primary.foreground.default
  const colors = Object.values(palette.dataViz.categorical)
  const axis = {
    labelFontFamily: fontFamily,
    labelFontSize: captionSize,
    labelFill: palette.text.secondary,
    labelOpacity: 1,
    labelSpacing: spacing,
    titleFontFamily: fontFamily,
    titleFontSize: bodySize,
    titleFill: palette.text.primary,
    titleOpacity: 1,
    titleSpacing: spacing * 2,
    gridStroke: palette.borders.decorative,
    gridStrokeOpacity: 1,
    gridLineWidth: borderWidth,
    lineStroke: palette.borders.control,
    lineStrokeOpacity: 1,
    lineLineWidth: borderWidth,
    tickStroke: palette.borders.control,
    tickOpacity: 1,
    tickLineWidth: borderWidth,
    tickLength: spacing,
  }
  const label = { fontFamily, fontSize: bodySize, fill: palette.text.primary, fillOpacity: 1 }
  const duration = appearance.motion === 'full' ? metrics.duration : 0
  const timing = { duration, delay: 0, easing: metrics.easing, fill: 'both' as const }
  // G2 reads native interaction defaults from theme[name]. Its Theme type only
  // enumerates guide/mark names, so retain this private inferred extension.
  const interactionTheme = {
    brushXHighlight: {
      maskFill: primary,
      maskFillOpacity: 0.12,
      maskStroke: primary,
      maskStrokeOpacity: 1,
      maskLineWidth: borderWidth,
    },
  }
  return {
    ...interactionTheme,
    type: appearance.colorMode === 'dark' ? 'dark' : 'light',
    color: primary,
    category10: colors,
    category20: colors,
    sequential: [...projectSequentialColorScale(palette, appearance.contrast).active],
    margin: controlPadding,
    // Chart changes travel farther than controls. Derive their choreography from the
    // same semantic clock without slowing buttons, tooltips or user input.
    enter: { ...timing, duration: duration * 5 },
    update: { ...timing, duration: duration * 4 },
    exit: { ...timing, duration: duration * 2 },
    view: { viewFill: 'transparent' },
    axis,
    axisTop: axis,
    axisBottom: axis,
    axisLeft: axis,
    axisRight: axis,
    axisLinear: axis,
    axisArc: axis,
    axisRadar: axis,
    legendCategory: {
      navAnimate: appearance.motion === 'full' ? { ...timing } : false,
      itemLabelFontFamily: fontFamily,
      itemLabelFontSize: captionSize,
      itemLabelFill: palette.text.primary,
      itemLabelFillOpacity: 1,
      itemValueFontFamily: fontFamily,
      itemValueFontSize: captionSize,
      itemValueFill: palette.text.secondary,
      itemValueFillOpacity: 1,
      titleFontFamily: fontFamily,
      titleFontSize: bodySize,
      titleFill: palette.text.primary,
      titleFillOpacity: 1,
      navPageNumFontFamily: fontFamily,
      navPageNumFontSize: captionSize,
      navPageNumFill: palette.text.secondary,
      navPageNumFillOpacity: 1,
      navButtonFill: palette.text.secondary,
      navButtonFillOpacity: 1,
      itemMarkerSize: captionSize,
      focusMarkerSize: bodySize,
      itemSpacing: [spacing, spacing, spacing / 2],
      rowPadding: Math.max(spacing, (controlHeight - captionSize) / 2),
      colPadding: controlPadding,
      padding: spacing,
      titleSpacing: spacing,
    },
    legendContinuous: {
      labelFontFamily: fontFamily,
      labelFontSize: captionSize,
      labelFill: palette.text.secondary,
      labelFillOpacity: 1,
      titleFontFamily: fontFamily,
      titleFontSize: bodySize,
      titleFill: palette.text.primary,
      titleFillOpacity: 1,
      handleLabelFontFamily: fontFamily,
      handleLabelFontSize: captionSize,
      handleLabelFill: palette.text.secondary,
      handleLabelFillOpacity: 1,
      handleMarkerFill: palette.surfaces.raised,
      handleMarkerStroke: palette.borders.control,
      handleMarkerStrokeOpacity: 1,
      handleHeight: bodySize,
      handleWidth: captionSize,
      ribbonSize: bodySize,
      ribbonFill: palette.roles.neutral.soft.background.default,
      tickStroke: palette.borders.control,
      tickStrokeOpacity: 1,
      labelSpacing: spacing,
      titleSpacing: spacing,
    },
    title: {
      titleFontFamily: fontFamily,
      titleFontSize: titleSize,
      titleFill: palette.text.primary,
      titleFillOpacity: 1,
      subtitleFontFamily: fontFamily,
      subtitleFontSize: bodySize,
      subtitleFill: palette.text.secondary,
      subtitleFillOpacity: 1,
      spacing,
    },
    label: { ...label, connectorStroke: palette.borders.control, connectorLineWidth: borderWidth },
    innerLabel: label,
    htmlLabel: { fontFamily, fontSize: captionSize, color: palette.text.primary, opacity: 1 },
    text: { text: label, badge: label },
    line: { line: { lineWidth: borderWidth * 2, lineCap: 'round', lineJoin: 'round' } },
    point: {
      point: { r: spacing, lineWidth: borderWidth },
      hollow: { r: spacing, lineWidth: borderWidth, strokeOpacity: 1 },
    },
    slider: {
      trackSize: controlHeight / 2,
      trackFill: palette.surfaces.sunken,
      selectionFill: primary,
      handleIconSize: captionSize,
      handleIconFill: palette.surfaces.raised,
      handleIconStroke: palette.borders.control,
      handleIconStrokeOpacity: 1,
      handleIconRadius: radius,
      handleIconLineWidth: borderWidth,
      handleLabelFontFamily: fontFamily,
      handleLabelFontSize: captionSize,
      handleLabelFill: palette.text.primary,
      handleLabelFillOpacity: 1,
    },
    scrollbar: {
      trackSize: spacing * 2,
      trackFill: palette.surfaces.sunken,
      thumbFill: palette.borders.control,
      thumbFillOpacity: 1,
      thumbHighlightedFillOpacity: 1,
    },
    tooltip: {
      css: {
        '.g2-tooltip': {
          'font-family': fontFamily,
          'font-size': `${String(bodySize)}px`,
          color: palette.tooltip.foreground,
          opacity: 1,
          transition:
            appearance.motion === 'full'
              ? `visibility ${String(duration)}ms ${metrics.easing}, left ${String(duration)}ms ${metrics.easing}, top ${String(duration)}ms ${metrics.easing}`
              : 'none',
          background: palette.tooltip.background,
          padding: `${String(spacing * 2)}px`,
          'border-radius': `${String(radius)}px`,
          'box-shadow': 'none',
          'box-sizing': 'border-box',
          'min-width': '0',
          width: 'max-content',
          'max-width': `calc(100dvw - ${String(spacing * 4)}px)`,
          'max-height': `calc(100dvh - ${String(spacing * 4)}px)`,
          overflow: 'auto',
        },
        '.g2-tooltip-title': {
          color: palette.tooltip.foreground,
          'white-space': 'normal',
          'overflow-wrap': 'anywhere',
        },
        '.g2-tooltip-list-item': { color: palette.tooltip.foreground },
        '.g2-tooltip-list-item-name': { 'min-width': '0' },
        '.g2-tooltip-list-item-name-label': {
          color: palette.tooltip.foreground,
          'white-space': 'normal',
          'overflow-wrap': 'anywhere',
        },
        '.g2-tooltip-list-item-value': {
          color: palette.tooltip.foreground,
          'white-space': 'normal',
          'overflow-wrap': 'anywhere',
        },
      },
    },
  } satisfies Theme
}
