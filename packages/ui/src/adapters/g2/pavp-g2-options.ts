import type { UiAppearanceSnapshot } from '@platform/design-system'
import type { UiG2ChartOptions } from '../../components/g2-chart-contracts'
import { projectG2Theme, type G2ThemeMetrics } from './pavp-g2-theme'
import { createG2ThetaEnter, createG2ThetaUpdate } from './pavp-g2-theta'
import { createG2Hover, type G2TourFocus } from './pavp-g2-hover'
import type { G2TooltipViewport } from './pavp-g2-tooltip'

type OptionsRecord = Record<string, unknown>
function record(value: unknown): value is OptionsRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// G2 normalizes/mutates nested options. Preserve the caller's Vue state, functions and Dates.
function copy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item: unknown) => copy(item))
  if (record(value) && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]))
  return value
}

function mergeG2Defaults(base: OptionsRecord, override: OptionsRecord): OptionsRecord {
  const result = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const current = result[key]
    result[key] =
      record(current) &&
      record(value) &&
      Object.getPrototypeOf(current) === Object.prototype &&
      Object.getPrototypeOf(value) === Object.prototype
        ? mergeG2Defaults(current, value)
        : value
  }
  return result
}

// HTML tooltip styles bypass canvas animation settings. Clamp after caller overrides,
// including longhands, while leaving their color/content/placement customization intact.
function withoutTooltipMotion(value: unknown): OptionsRecord {
  const tooltip = record(value) ? value : {}
  const css = record(tooltip['css']) ? tooltip['css'] : {}
  return {
    ...tooltip,
    css: Object.fromEntries(
      Object.entries({ '.g2-tooltip': {}, ...css }).map(([selector, style]) => [
        selector,
        {
          ...(record(style) ? style : {}),
          transition: 'none',
          'transition-property': 'none',
          'transition-duration': '0s',
          'transition-delay': '0s',
          animation: 'none',
          'animation-name': 'none',
          'animation-duration': '0s',
          'animation-delay': '0s',
        },
      ]),
    ),
  }
}

// G2 combines view and mark interactions into one view. A descendant's explicit
// focus/state choice must therefore opt that whole chart out of platform focus.
function hasFocusOverride(value: unknown): boolean {
  if (!record(value)) return false
  if (value['state'] !== undefined) return true
  const interaction = record(value['interaction']) ? value['interaction'] : {}
  if (
    Object.entries(interaction).some(
      ([name, setting]) =>
        ((/^(element|brush|legendHighlight)/u.test(name) || name === 'pavpHover') &&
          !(name === 'elementHighlight' && setting === true)) ||
        (record(setting) &&
          typeof setting['type'] === 'function' &&
          interaction['elementHighlight'] !== true),
    )
  )
    return true
  const children = value['children']
  return (
    typeof children === 'function' ||
    (Array.isArray(children) && children.some((child: unknown) => hasFocusOverride(child)))
  )
}

function hasLabelTheme(value: unknown): boolean {
  if (!record(value)) return false
  const theme = record(value['theme']) ? value['theme'] : {}
  if (theme['innerLabel'] !== undefined || theme['label'] !== undefined) return true
  const children = value['children']
  return typeof children === 'function' || (Array.isArray(children) && children.some(hasLabelTheme))
}

/** Private vendor projection, not a second chart grammar or appearance state. */
export function projectG2Options(
  options: UiG2ChartOptions,
  appearance: UiAppearanceSnapshot,
  metrics: G2ThemeMetrics,
  width: number,
  height: number,
  tooltipViewport?: G2TooltipViewport,
  resizing = false,
  tour?: G2TourFocus,
): UiG2ChartOptions {
  const measuredValues = [
    metrics.bodySize,
    metrics.captionSize,
    metrics.titleSize,
    metrics.spacing,
    metrics.controlHeight,
    metrics.controlPadding,
    metrics.borderWidth,
    metrics.radius,
    metrics.duration,
    width,
    height,
  ]
  if (
    measuredValues.some((value) => !Number.isFinite(value) || value < 0) ||
    metrics.bodySize === 0 ||
    metrics.captionSize === 0 ||
    metrics.titleSize === 0
  )
    throw new Error('UiG2Chart requires resolved PAVP semantic styles and finite dimensions.')
  const theme = projectG2Theme(appearance, metrics)
  const movement = appearance.motion === 'full'
  const platformHover = !hasFocusOverride(options)
  if (tour && !platformHover)
    throw new Error('Chart tour cannot override caller-owned focus or state interactions.')
  if (tour) {
    const root: unknown = options
    const nodes = record(root) && root['type'] === 'view' ? root['children'] : [root]
    if (
      !Array.isArray(nodes) ||
      !nodes.length ||
      nodes.some(
        (node: unknown) =>
          !record(node) || !['interval', 'point', 'line', 'area'].includes(String(node['type'])),
      ) ||
      !nodes.some(
        (node: unknown) =>
          record(node) && (node['type'] === 'point' || node['type'] === 'interval'),
      )
    )
      throw new Error(
        'Chart tour supports a single view of interval or point marks, optionally with line/area context.',
      )
  }
  const platformInnerContrast = !hasLabelTheme(options)
  function project(
    value: unknown,
    inheritedTheme: OptionsRecord = theme,
    inheritedGuides: OptionsRecord = {},
    inheritedHover = false,
    inheritedTooltip?: unknown,
    inheritedTheta?: OptionsRecord,
  ): unknown {
    if (Array.isArray(value))
      return value.map((child: unknown) =>
        project(
          child,
          inheritedTheme,
          inheritedGuides,
          inheritedHover,
          inheritedTooltip,
          inheritedTheta,
        ),
      )
    if (!record(value)) return value
    const node: OptionsRecord = { ...value }
    for (const key of ['axis', 'legend']) {
      const inherited = inheritedGuides[key]
      const own = node[key]
      if (inherited === false) node[key] = false
      else if (record(inherited) && own !== false)
        node[key] = mergeG2Defaults(inherited, record(own) ? own : {})
    }
    if (
      node['type'] === 'timingKeyframe' &&
      (node['iterationCount'] === 'infinite' ||
        (typeof node['iterationCount'] === 'number' && !Number.isFinite(node['iterationCount'])))
    )
      throw new Error('UiG2Chart requires a finite timingKeyframe iterationCount.')
    if (!movement && typeof node['type'] === 'function')
      throw new Error('Custom G2 mark functions cannot guarantee reduced/none motion.')
    // G2's timeline generates its own animation overrides and can run forever.
    // Reduced/none represent the final frame without starting a timeline.
    if (!movement && node['type'] === 'timingKeyframe') {
      const children = node['children']
      const count =
        typeof node['iterationCount'] === 'number'
          ? Math.ceil(Math.max(0, node['iterationCount']))
          : 1
      const direction = node['direction']
      const reverse =
        direction === 'reverse' ||
        (direction === 'alternate' && count % 2 === 0) ||
        (direction === 'reverse-alternate' && count % 2 !== 0)
      const final: unknown =
        Array.isArray(children) && count > 0 ? children.at(reverse ? 0 : -1) : undefined
      return project(
        final ?? { type: 'view' },
        inheritedTheme,
        inheritedGuides,
        inheritedHover,
        inheritedTooltip,
      )
    }
    const ownInteraction = record(node['interaction']) ? node['interaction'] : {}
    const ownTooltip = ownInteraction['tooltip']
    const resolvedTooltip =
      ownTooltip === undefined
        ? inheritedTooltip
        : record(ownTooltip)
          ? mergeG2Defaults(record(inheritedTooltip) ? inheritedTooltip : {}, ownTooltip)
          : ownTooltip
    if (tooltipViewport) {
      // Defaults must follow the same inheritance as explicit native configuration.
      // A child mark must not re-enable a disabled tooltip or replace a caller mount.
      node['interaction'] = {
        ...ownInteraction,
        tooltip:
          resolvedTooltip === false
            ? false
            : { ...tooltipViewport, ...(record(resolvedTooltip) ? resolvedTooltip : {}) },
      }
    }
    if (Array.isArray(node['labels'])) {
      node['labels'] = node['labels'].map((label: unknown) => {
        if (!record(label)) return label
        const position = label['position']
        const placement =
          position === 'right'
            ? { dx: metrics.spacing * 2, textAlign: 'start' }
            : position === 'left'
              ? { dx: -metrics.spacing * 2, textAlign: 'end' }
              : position === 'top'
                ? { dy: -metrics.spacing * 2, textBaseline: 'bottom' }
                : {}
        // Native contrast transform measures the actual mark fill, not the primary
        // button background. Explicit label colors/transforms remain caller-owned.
        const labelStyle = record(label['style']) ? label['style'] : {}
        const contrastTransform =
          platformInnerContrast &&
          (position === 'inside' || position === 'inner') &&
          label['fill'] === undefined &&
          labelStyle['fill'] === undefined &&
          label['transform'] === undefined
            ? { transform: [{ type: 'contrastReverse' }] }
            : {}
        return { ...placement, ...contrastTransform, ...label }
      })
    }
    const customTheme = node['theme']
    const resolvedTheme = mergeG2Defaults(inheritedTheme, record(customTheme) ? customTheme : {})
    node['theme'] = resolvedTheme
    if (movement && node['type'] === 'timingKeyframe') {
      node['duration'] ??= metrics.duration * 8
      node['easing'] ??= metrics.easing
    }
    // Theme timing is the default, not a mark override: native animation encodings and
    // timingKeyframe durations must retain their own precedence in full mode.
    const coordinate = record(node['coordinate']) ? node['coordinate'] : inheritedTheta
    const theta = coordinate?.['type'] === 'theta' ? coordinate : undefined
    const style = record(node['style']) ? node['style'] : {}
    const encode = record(node['encode']) ? node['encode'] : {}
    const plainSector =
      !Object.entries(style).some(
        ([key, value]) =>
          /^(radius|innerRadius|inset|shape)/u.test(key) && value !== 0 && value !== undefined,
      ) && encode['shape'] === undefined
    if (
      movement &&
      theta &&
      plainSector &&
      node['type'] === 'interval' &&
      node['animate'] !== false
    ) {
      const animate = record(node['animate']) ? node['animate'] : {}
      const origin = typeof theta['startAngle'] === 'number' ? theta['startAngle'] : undefined
      node['animate'] = {
        ...animate,
        ...(animate['enter'] === undefined && encode['enterType'] === undefined
          ? { enter: { type: createG2ThetaEnter(origin) } }
          : {}),
        ...(animate['update'] === undefined && encode['updateType'] === undefined
          ? { update: { type: createG2ThetaUpdate(origin) } }
          : {}),
      }
    }
    if (movement && record(node['animate'])) {
      node['animate'] = Object.fromEntries(
        Object.entries(node['animate']).map(([phase, custom]) => [
          phase,
          custom === false ? { type: null } : custom,
        ]),
      )
    }
    if (!movement) {
      // Disable spatial updates, delays and encoded motion, including descendant marks.
      const encode = node['encode']
      if (record(encode))
        node['encode'] = Object.fromEntries(
          Object.entries(encode).filter(
            ([key]) => !/^(enter|update|exit)(Type|Duration|Delay|Easing)$/u.test(key),
          ),
        )
      node['animate'] =
        appearance.motion === 'none' || value['animate'] === false
          ? false
          : {
              enter: {
                type: 'fadeIn',
                fill: 'both',
                duration: metrics.duration / 2,
                delay: 0,
                easing: metrics.easing,
              },
              update: { type: null },
              exit: {
                type: 'fadeOut',
                fill: 'both',
                duration: metrics.duration / 2,
                delay: 0,
                easing: metrics.easing,
              },
            }
      for (const key of ['axis', 'legend', 'slider', 'scrollbar']) {
        const guides = node[key]
        if (guides === false) continue
        const channels =
          key === 'axis'
            ? [
                'x',
                'y',
                'z',
                'position',
                ...Object.keys(record(encode) ? encode : {}).filter((channel) =>
                  /^position\d+$/u.test(channel),
                ),
              ]
            : key === 'legend'
              ? ['color', 'shape', 'size', 'opacity']
              : []
        const defaults = Object.fromEntries(channels.map((channel) => [channel, {}]))
        if (channels.length > 0 || record(guides))
          node[key] = Object.fromEntries(
            Object.entries({ ...defaults, ...(record(guides) ? guides : {}) }).map(
              ([channel, guide]) => [
                channel,
                guide === false
                  ? false
                  : {
                      ...(record(guide) ? guide : {}),
                      animate: false,
                      ...(key === 'legend' ? { navAnimate: false } : {}),
                    },
              ],
            ),
          )
      }
      // Standalone native guide children put these options on the node itself.
      if (node['type'] === 'legends') {
        node['animate'] = false
        node['navAnimate'] = false
      }
      if (node['type'] === 'axisX' || node['type'] === 'axisY' || node['type'] === 'axisZ')
        node['animate'] = false
      const nodeTheme = node['theme']
      if (record(nodeTheme)) {
        node['theme'] = {
          ...nodeTheme,
          tooltip: withoutTooltipMotion(nodeTheme['tooltip']),
          legendCategory: {
            ...(record(nodeTheme['legendCategory']) ? nodeTheme['legendCategory'] : {}),
            navAnimate: false,
          },
          enter: { duration: 0, delay: 0 },
          update: { duration: 0, delay: 0 },
          exit: { duration: 0, delay: 0 },
        }
      }
      const interaction = node['interaction']
      const tooltip = record(interaction) ? interaction['tooltip'] : undefined
      node['interaction'] = {
        ...(record(interaction) ? interaction : {}),
        ...(record(tooltip) ? { tooltip: withoutTooltipMotion(tooltip) } : {}),
        elementHoverScale: false,
        fisheye: false,
      }
    }
    const interaction = record(node['interaction']) ? node['interaction'] : {}
    const sharedTooltip =
      record(interaction['tooltip']) && interaction['tooltip']['shared'] === true
    const hoverRequested =
      Boolean(tour) || inheritedHover || interaction['elementHighlight'] === true || sharedTooltip
    if (
      platformHover &&
      hoverRequested &&
      interaction['pavpHover'] === undefined &&
      node['state'] === undefined
    ) {
      const hoverDuration =
        appearance.motion === 'none' || node['animate'] === false
          ? 0
          : metrics.duration * (movement ? 1.5 : 0.5)
      node['interaction'] = {
        ...interaction,
        elementHighlight: false,
        pavpHover: { type: createG2Hover(hoverDuration, metrics.easing, movement, tour) },
      }
    } else if (interaction['pavpHover'] === undefined) {
      // G2 retires custom interaction listeners only when the next spec names them.
      node['interaction'] = { ...interaction, pavpHover: false }
    }
    const guides = { axis: node['axis'], legend: node['legend'] }
    if (Array.isArray(node['children']))
      node['children'] = node['children'].map((child: unknown) =>
        project(child, resolvedTheme, guides, hoverRequested, resolvedTooltip, theta),
      )
    else if (typeof node['children'] === 'function') {
      const children = node['children'] as (...args: unknown[]) => unknown
      node['children'] = (...args: unknown[]) =>
        project(
          copy(children(...args)),
          resolvedTheme,
          guides,
          hoverRequested,
          resolvedTooltip,
          theta,
        )
    }
    // A resized canvas clips old pixel coordinates. Reflow its scene immediately,
    // keeping interaction timing full so the next hover/data update behaves normally.
    if (resizing) {
      node['animate'] = false
      for (const key of ['axis', 'legend', 'slider', 'scrollbar']) {
        const guide = node[key]
        if (guide === false) continue
        const defaults = key === 'axis' ? { x: {}, y: {} } : key === 'legend' ? { color: {} } : {}
        node[key] = Object.fromEntries(
          Object.entries({ ...defaults, ...(record(guide) ? guide : {}) }).map(
            ([channel, value]) => [
              channel,
              value === false
                ? false
                : { ...(record(value) ? value : {}), animate: false, navAnimate: false },
            ],
          ),
        )
      }
    }
    return node
  }
  const projected = project(copy(options)) as UiG2ChartOptions
  const root = projected as OptionsRecord
  const title = root['title']
  if (typeof title === 'string' || record(title)) {
    // G2 does not wrap chart titles by default. Bound native text to the measured host,
    // reserving the theme margin and the same semantic cross padding on each side.
    const titleWidth = Math.max(
      metrics.captionSize,
      width - metrics.controlPadding * 2 - metrics.spacing * 4,
    )
    root['title'] = {
      crossPadding: metrics.spacing * 2,
      titleWordWrap: true,
      titleWordWrapWidth: titleWidth,
      titleMaxLines: 2,
      titleTextOverflow: 'ellipsis',
      subtitleWordWrap: true,
      subtitleWordWrapWidth: titleWidth,
      subtitleMaxLines: 2,
      subtitleTextOverflow: 'ellipsis',
      ...(typeof title === 'string' ? { title } : title),
    }
  }
  return { ...projected, width, height, autoFit: false }
}
