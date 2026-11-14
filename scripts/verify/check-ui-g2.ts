import { computed } from 'vue'
import {
  linkedSamples,
  linkedChartOptions,
  linkedChartEvents,
  linkedChannelOf,
} from '../../apps/web/src/app/workbench/charts/chart-linked-example'
import assert from 'node:assert/strict'
import { ESLint } from 'eslint'
import {
  normalizeUiChartTimeRange,
  panUiChartTimeRange,
  zoomUiChartTimeRange,
} from '../../packages/ui/src/components/chart-time-range'
import {
  liveStreamSamples,
  liveRankingSamples,
  liveDistributionSamples,
  liveSampleTime,
} from '../../apps/web/src/app/workbench/charts/chart-live-simulation'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import {
  ProductPreferenceDefault,
  builtInThemeIds,
  projectSequentialColorScale,
  projectUiAppearance,
  resolveThemeReference,
  type UiAppearanceSnapshot,
} from '@platform/design-system'
import { projectG2Options } from '../../packages/ui/src/adapters/g2/pavp-g2-options'
import {
  projectG2Theme,
  type G2ThemeMetrics,
} from '../../packages/ui/src/adapters/g2/pavp-g2-theme'
import type {
  UiG2ChartOptions,
  UiChartTourState,
} from '../../packages/ui/src/components/g2-chart-contracts'

const resolution = resolveThemeReference({
  reference: ProductPreferenceDefault.theme,
  customThemeRegistry: null,
})
assert.equal(resolution.status, 'resolved')
const appearance = projectUiAppearance(
  {
    ...ProductPreferenceDefault,
    colorMode: 'light',
    density: 'comfortable',
    material: 'solid',
  },
  resolution.entry,
)
const metrics: G2ThemeMetrics = {
  fontFamily: 'system-ui',
  bodySize: 16,
  captionSize: 13,
  titleSize: 24,
  controlHeight: 36,
  controlPadding: 14,
  spacing: 4,
  borderWidth: 1,
  radius: 6,
  duration: 180,
  easing: 'ease-out',
}
function record(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value))
  return value as Record<string, unknown>
}
function children(value: unknown): unknown[] {
  const result = record(value)['children']
  assert.ok(Array.isArray(result))
  return result as unknown[]
}
const data = [
  { month: 'Jan', total: 12 },
  { month: 'Feb', total: 18 },
]
const source: UiG2ChartOptions = {
  type: 'view',
  width: 999,
  height: 999,
  autoFit: true,
  data,
  children: [
    {
      type: 'interval',
      encode: { x: 'month', y: 'total', enterDuration: 5000 },
      animate: { enter: { type: 'growInY', duration: 500 } },
      axis: { x: { animate: { duration: 900 } } },
      interaction: { elementHoverScale: true },
    },
  ],
}
const before = structuredClone(source)
const full = projectG2Options(source, appearance, metrics, 600, 320)
assert.deepEqual(source, before)
assert.equal(full.width, 600)
assert.equal(full.height, 320)
assert.equal(full.autoFit, false)
assert.notEqual(record(full)['data'], data)
const fullMark = record(children(full)[0])
assert.equal(record(record(fullMark['animate'])['enter'])['type'], 'growInY')
assert.equal(record(record(fullMark['animate'])['enter'])['duration'], 500)
assert.equal(record(record(fullMark['theme'])['update'])['duration'], metrics.duration * 4)
assert.equal(record(record(fullMark['theme'])['update'])['easing'], metrics.easing)
assert.equal(record(fullMark['encode'])['enterDuration'], 5000)
// Native DOM mounts and live bounds are references, not mergeable configuration records.
class TooltipMount {
  readonly nodeType = 1
}
class TooltipBounds {
  x = 0
  y = 0
  width = 640
  height = 480
}
const viewportMount = new TooltipMount() as HTMLElement
const parentMount = new TooltipMount() as HTMLElement
const childMount = new TooltipMount() as HTMLElement
const viewportBounds = new TooltipBounds()
const tooltipViewport = { mount: viewportMount, bounding: viewportBounds }
const tooltipRender = () => 'custom tooltip'
const tooltipSpec: UiG2ChartOptions = {
  type: 'view',
  interaction: {
    tooltip: {
      mount: parentMount,
      position: 'top-left',
      enterable: true,
      render: tooltipRender,
      css: { '.g2-tooltip': { background: 'rebeccapurple' } },
    },
  },
  children: [
    { type: 'line' },
    { type: 'line', interaction: { tooltip: { mount: childMount, offset: [2, 3] } } },
    { type: 'line', interaction: { tooltip: false } },
  ],
}
const tooltipProjection = projectG2Options(
  tooltipSpec,
  appearance,
  metrics,
  600,
  320,
  tooltipViewport,
)
const tooltipOf = (node: unknown) => record(record(node)['interaction'])['tooltip']
const inheritedTooltip = record(tooltipOf(children(tooltipProjection)[0]))
const overriddenTooltip = record(tooltipOf(children(tooltipProjection)[1]))
assert.equal(inheritedTooltip['mount'], parentMount)
assert.equal(inheritedTooltip['bounding'], viewportBounds)
assert.equal(inheritedTooltip['position'], 'top-left')
assert.equal(inheritedTooltip['enterable'], true)
assert.equal(inheritedTooltip['render'], tooltipRender)
assert.equal(record(record(inheritedTooltip['css'])['.g2-tooltip'])['background'], 'rebeccapurple')
assert.equal(overriddenTooltip['mount'], childMount)
assert.equal(overriddenTooltip['position'], 'top-left')
assert.deepEqual(overriddenTooltip['offset'], [2, 3])
assert.equal(tooltipOf(children(tooltipProjection)[2]), false)
assert.equal(record(tooltipOf(tooltipSpec))['mount'], parentMount)
const defaultTooltip = record(
  tooltipOf(projectG2Options({ type: 'line' }, appearance, metrics, 600, 320, tooltipViewport)),
)
assert.equal(defaultTooltip['mount'], viewportMount)
assert.equal(defaultTooltip['bounding'], viewportBounds)
viewportBounds.y = -120
assert.equal(record(defaultTooltip['bounding'])['y'], -120)
const disabledTooltips = projectG2Options(
  { type: 'view', interaction: { tooltip: false }, children: [{ type: 'line' }] },
  appearance,
  metrics,
  600,
  320,
  tooltipViewport,
)
assert.equal(tooltipOf(disabledTooltips), false)
assert.equal(tooltipOf(children(disabledTooltips)[0]), false)
const explicitBounds = { x: 10, y: 20, width: 100, height: 90 }
const boundedTooltip = record(
  tooltipOf(
    projectG2Options(
      { type: 'line', interaction: { tooltip: { bounding: explicitBounds } } },
      appearance,
      metrics,
      600,
      320,
      tooltipViewport,
    ),
  ),
)
assert.deepEqual(boundedTooltip['bounding'], explicitBounds)
const defaultTiming = projectG2Theme(appearance, metrics)
assert.equal(defaultTiming.enter.duration, metrics.duration * 5)
assert.equal(defaultTiming.update.duration, metrics.duration * 4)
assert.equal(defaultTiming.exit.duration, metrics.duration * 2)
assert.equal(defaultTiming.enter.fill, 'both')
assert.equal(defaultTiming.update.fill, 'both')
assert.equal(
  record(projectG2Options({ type: 'timingKeyframe', children: [] }, appearance, metrics, 600, 300))[
    'duration'
  ],
  metrics.duration * 8,
)
const smoothFocus = record(
  projectG2Options(
    { type: 'interval', interaction: { elementHighlight: true } },
    appearance,
    metrics,
    600,
    300,
  ),
)
assert.equal(record(smoothFocus['interaction'])['elementHighlight'], false)
assert.equal(typeof record(record(smoothFocus['interaction'])['pavpHover'])['type'], 'function')
for (const choice of [false, { background: true }] as const) {
  const nativeFocus = projectG2Options(
    { type: 'interval', interaction: { elementHighlight: choice } },
    appearance,
    metrics,
    600,
    300,
  )
  assert.equal(record(record(nativeFocus)['interaction'])['pavpHover'], false)
  assert.deepEqual(record(record(nativeFocus)['interaction'])['elementHighlight'], choice)
}
const childFocus = projectG2Options(
  {
    type: 'view',
    interaction: { tooltip: { shared: true } },
    children: [
      {
        type: 'line',
        interaction: { elementHighlight: { background: true } },
        state: { inactive: { opacity: 0.8 } },
      },
    ],
  },
  appearance,
  metrics,
  600,
  300,
)
assert.equal(record(record(childFocus)['interaction'])['pavpHover'], false)
assert.equal(record(record(children(childFocus)[0])['interaction'])['pavpHover'], false)
// A caller can explicitly request platform focus alongside a non-visual observer.
for (const explicitFocus of [false, true]) {
  const observer = projectG2Options(
    {
      type: 'view',
      interaction: {
        tooltip: { shared: true },
        ...(explicitFocus ? { elementHighlight: true } : {}),
        observer: { type: () => () => undefined },
      },
    },
    appearance,
    metrics,
    600,
    300,
  )
  const hover = record(record(observer)['interaction'])['pavpHover']
  if (explicitFocus) assert.equal(typeof record(hover)['type'], 'function')
  else assert.equal(hover, false)
}
const timelineDuration = projectG2Options(
  { type: 'timingKeyframe', duration: 1200, children: [{ type: 'interval' }] },
  appearance,
  metrics,
  600,
  300,
)
assert.equal(record(timelineDuration)['duration'], 1200)
assert.equal(record(children(timelineDuration)[0])['animate'], undefined)
for (const mode of ['reduced', 'none'] as const) {
  const resolved = { ...appearance, motion: mode }
  const spec = projectG2Options(source, resolved, metrics, 360, 240)
  const mark = record(children(spec)[0])
  assert.equal(record(mark['encode'])['enterDuration'], undefined)
  assert.equal(record(record(mark['axis'])['x'])['animate'], false)
  assert.equal(record(mark['interaction'])['elementHoverScale'], false)
  assert.equal(record(record(mark['legend'])['color'])['navAnimate'], false)
  assert.equal(record(record(mark['theme'])['legendCategory'])['navAnimate'], false)
  if (mode === 'none') assert.equal(mark['animate'], false)
  else {
    assert.equal(record(record(mark['animate'])['enter'])['type'], 'fadeIn')
    assert.equal(record(record(mark['animate'])['enter'])['duration'], metrics.duration / 2)
    assert.equal(record(record(mark['animate'])['enter'])['fill'], 'both')
    assert.equal(record(record(mark['animate'])['update'])['type'], null)
  }
  const timeline: UiG2ChartOptions = {
    type: 'timingKeyframe',
    children: [
      { type: 'interval', key: 'first' },
      { type: 'line', key: 'last' },
    ],
  }
  assert.equal(projectG2Options(timeline, resolved, metrics, 600, 300).type, 'line')
  assert.equal(
    projectG2Options({ ...timeline, direction: 'reverse' }, resolved, metrics, 600, 300).type,
    'interval',
  )
  assert.equal(
    projectG2Options(
      { ...timeline, direction: 'alternate', iterationCount: 2 },
      resolved,
      metrics,
      600,
      300,
    ).type,
    'interval',
  )
  const noTooltip = projectG2Options(
    { type: 'view', interaction: { tooltip: false }, children: [{ type: 'interval' }] },
    resolved,
    metrics,
    400,
    240,
  )
  assert.equal(record(record(noTooltip)['interaction'])['tooltip'], false)
  assert.equal(record(record(children(noTooltip)[0])['interaction'])['tooltip'], undefined)
  const callbackSpec: UiG2ChartOptions = {
    type: 'facetRect',
    children: () => ({ type: 'interval', animate: { enter: { type: 'growInY' } } }),
  }
  const callback = record(projectG2Options(callbackSpec, resolved, metrics, 600, 300))['children']
  assert.equal(typeof callback, 'function')
  const child = record((callback as () => unknown)())
  if (mode === 'none') assert.equal(child['animate'], false)
  else assert.equal(record(record(child['animate'])['enter'])['type'], 'fadeIn')
}
for (const mode of ['reduced', 'none'] as const) {
  const inherited = projectG2Options(
    {
      type: 'view',
      axis: { x: false },
      legend: false,
      children: [{ type: 'interval', encode: { x: 'month', y: 'total' } }],
    },
    { ...appearance, motion: mode },
    metrics,
    400,
    240,
  )
  const child = record(children(inherited)[0])
  assert.equal(record(child['axis'])['x'], false)
  assert.equal(record(record(child['axis'])['y'])['animate'], false)
  assert.equal(child['legend'], false)
}
assert.throws(
  () =>
    projectG2Options(
      { type: 'timingKeyframe', iterationCount: 'infinite' },
      appearance,
      metrics,
      600,
      300,
    ),
  /finite/u,
)
const dark: UiAppearanceSnapshot = projectUiAppearance(
  { ...appearance, colorMode: 'dark', contrast: 'enhanced' },
  resolution.entry,
)
for (const state of [appearance, dark]) {
  const theme = projectG2Theme(state, metrics)
  assert.equal(theme.axis.labelFill, state.colorPalette.text.secondary)
  assert.equal(theme.axis.labelFontSize, metrics.captionSize)
  assert.equal(theme.axis.labelOpacity, 1)
  assert.equal(theme.legendCategory.itemLabelFill, state.colorPalette.text.primary)
  assert.equal(theme.color, state.colorPalette.roles.primary.foreground.default)
  assert.equal(theme.tooltip.css['.g2-tooltip'].background, state.colorPalette.tooltip.background)
  assert.equal(theme.title.titleFontSize, metrics.titleSize)
}
const scaled = projectG2Theme(appearance, {
  ...metrics,
  bodySize: 24,
  captionSize: 20,
  spacing: 8,
  borderWidth: 2,
})
assert.equal(scaled.axis.labelFontSize, 20)
assert.equal(scaled.margin, metrics.controlPadding)
assert.equal(scaled.axis.tickLineWidth, 2)
assert.equal(scaled.slider.trackSize, metrics.controlHeight / 2)

const overridden = projectG2Options(
  {
    type: 'view',
    title: 'Long chart title',
    theme: { axis: { labelFontWeight: 'bold' } },
    children: [{ type: 'interval', theme: { axis: { tick: false } } }],
  },
  appearance,
  metrics,
  320,
  240,
)
const inheritedAxis = record(record(record(children(overridden)[0])['theme'])['axis'])
assert.equal(inheritedAxis['labelFontSize'], metrics.captionSize)
assert.equal(inheritedAxis['labelFontWeight'], 'bold')
assert.equal(inheritedAxis['tick'], false)
assert.equal(record(record(overridden)['title'])['titleWordWrapWidth'], 276)
assert.throws(
  () => projectG2Options({}, appearance, { ...metrics, spacing: Number.NaN }, 320, 240),
  /semantic styles/u,
)

// Regressions exercise every native input path, including explicit overrides.
for (const state of [appearance, dark]) {
  const css = record(projectG2Theme(state, metrics).tooltip.css)
  for (const selector of [
    '.g2-tooltip-title',
    '.g2-tooltip-list-item-name-label',
    '.g2-tooltip-list-item-value',
  ])
    assert.equal(record(css[selector])['color'], state.colorPalette.tooltip.foreground)
  assert.equal(record(css['.g2-tooltip'])['opacity'], 1)
}
assert.equal(record(record(scaled.point)['hollow'])['r'], 8)
assert.equal(record(record(scaled.point)['hollow'])['lineWidth'], 2)
for (const mode of ['full', 'reduced', 'none'] as const) {
  const spec = projectG2Options(
    {
      type: 'view',
      theme: {
        legendCategory: { navAnimate: { duration: 5000 } },
        tooltip: { css: { '.g2-tooltip': { transition: 'left 5s', color: 'red' } } },
      },
      interaction: {
        tooltip: { css: { '.g2-tooltip': { transition: 'top 5s', 'transition-duration': '5s' } } },
      },
      children: [
        {
          type: 'legends',
          scale: { color: { type: 'ordinal', domain: ['A', 'B'], range: ['red', 'blue'] } },
          navAnimate: { duration: 5000 },
        },
      ],
    },
    { ...appearance, motion: mode },
    metrics,
    400,
    240,
  )
  const theme = record(record(spec)['theme'])
  const themeTooltip = record(record(record(theme['tooltip'])['css'])['.g2-tooltip'])
  const tooltip = record(
    record(record(record(record(spec)['interaction'])['tooltip'])['css'])['.g2-tooltip'],
  )
  const legend = record(children(spec)[0])
  assert.equal(themeTooltip['color'], 'red')
  if (mode === 'full') {
    assert.equal(themeTooltip['transition'], 'left 5s')
    assert.equal(tooltip['transition'], 'top 5s')
    assert.equal(record(legend['navAnimate'])['duration'], 5000)
  } else {
    assert.equal(themeTooltip['transition'], 'none')
    assert.equal(tooltip['transition'], 'none')
    assert.equal(tooltip['transition-duration'], '0s')
    assert.equal(record(theme['legendCategory'])['navAnimate'], false)
    assert.equal(legend['navAnimate'], false)
    assert.equal(legend['animate'], false)
  }
}

// Exercise the locked vendor inference seam, rather than merely checking our input object.
// Resolve through the UI package, which owns this dependency and its compatibility patch.
const uiRequire = createRequire(new URL('../../packages/ui/package.json', import.meta.url))
const nativeScale = record(
  uiRequire(resolve(dirname(uiRequire.resolve('@antv/g2')), 'runtime/scale.js')) as unknown,
)
const inferScale = nativeScale['inferScale']
assert.equal(typeof inferScale, 'function')
function inferColor(
  state: UiAppearanceSnapshot,
  options: Record<string, unknown> = {},
  values: unknown[][] = [[0, 25, 50, 75, 100]],
): Record<string, unknown> {
  return record(
    (inferScale as (...args: unknown[]) => unknown)(
      'color',
      values,
      options,
      [],
      projectG2Theme(state, metrics),
      {},
    ),
  )
}
function colorAt(scale: Record<string, unknown>, value: number): unknown {
  const interpolator = scale['interpolator']
  assert.equal(typeof interpolator, 'function')
  return (interpolator as (value: number) => unknown)(value)
}
function rgbChannels(color: unknown): number[] {
  assert.equal(typeof color, 'string')
  return ((color as string).match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number)
}
for (const themeId of builtInThemeIds) {
  const resolved = resolveThemeReference({
    reference: { registryKind: 'built-in', themeId },
    customThemeRegistry: null,
  })
  assert.equal(resolved.status, 'resolved')
  for (const colorMode of ['light', 'dark'] as const) {
    for (const contrast of ['standard', 'enhanced'] as const) {
      const state = projectUiAppearance(
        { ...appearance, theme: { registryKind: 'built-in', themeId }, colorMode, contrast },
        resolved.entry,
      )
      const scale = inferColor(state)
      const colors = projectSequentialColorScale(state.colorPalette, state.contrast).active
      assert.equal(scale['type'], 'sequential')
      assert.deepEqual(scale['domain'], [0, 100])
      assert.deepEqual(rgbChannels(colorAt(scale, 0)), rgbChannels(colors[0]))
      assert.deepEqual(rgbChannels(colorAt(scale, 1)), rgbChannels(colors.at(-1)))
      const reversed = inferColor(state, { offset: (value: number) => 1 - value })
      assert.equal(colorAt(reversed, 0), colorAt(scale, 1))
      assert.equal(colorAt(reversed, 1), colorAt(scale, 0))
      const category = inferColor(state, {}, [['A', 'B', 'C']])
      assert.equal(category['type'], 'ordinal')
      assert.deepEqual(category['range'], Object.values(state.colorPalette.dataViz.categorical))
      assert.equal(projectG2Theme(state, metrics).category10.length, 8)
      assert.deepEqual(
        projectG2Theme(state, metrics).category20,
        projectG2Theme(state, metrics).category10,
      )
      const stable = inferColor(state, { domain: ['A', 'B', 'C'] }, [['C', 'A']])
      assert.deepEqual(stable['domain'], ['A', 'B', 'C'])
      assert.deepEqual(stable['range'], category['range'])
    }
  }
}
const nativePalette = inferColor(appearance, { palette: 'viridis' })
assert.equal(colorAt(nativePalette, 0), '#440154')
assert.equal(colorAt(nativePalette, 1), '#fde725')
const customInterpolator = (value: number): string => (value < 0.5 ? '#ff0000' : '#0000ff')
const customSequential = inferColor(dark, { interpolator: customInterpolator })
assert.equal(customSequential['interpolator'], customInterpolator)
assert.equal(colorAt(customSequential, 0.25), '#ff0000')
const customRange = inferColor(appearance, { range: ['#ff0000', '#0000ff'] })
assert.equal(customRange['type'], 'linear')
assert.deepEqual(customRange['range'], ['#ff0000', '#0000ff'])
assert.equal(inferColor(appearance, { type: 'identity' })['type'], 'identity')
const unwrapped = record(
  (inferScale as (...args: unknown[]) => unknown)('color', [[0, 100]], {}, [], {}, {}),
)
assert.equal(colorAt(unwrapped, 0), 'rgb(255, 255, 217)')

// A disabled navigator animation must still place the next page inside its clip.
const g2Require = createRequire(uiRequire.resolve('@antv/g2'))
const nativeComponents = record(g2Require('@antv/component') as unknown)
const Navigator = nativeComponents['Navigator']
assert.equal(typeof Navigator, 'function')
const goTo = record((Navigator as { readonly prototype: unknown }).prototype)['goTo']
assert.equal(typeof goTo, 'function')
const pagePositions = [
  [0, 0],
  [0, 0],
]
let playPosition = [0, 0]
let visiblePages: number[] = []
let pageInfoUpdates = 0
const navigator = {
  attributes: { animate: false },
  innerCurrPage: 0,
  get currPage() {
    return this.innerCurrPage
  },
  playState: 'idle',
  pageViews: pagePositions.map((_, index) => ({
    setLocalPosition(x: number, y: number) {
      pagePositions[index] = [x, y]
    },
  })),
  playWindow: {
    attr() {
      /* Native non-animated attr path does not move a Group's local position. */
    },
    setLocalPosition(x: number, y: number) {
      playPosition = [x, y]
    },
  },
  prepareFollowingPage(page: number) {
    pagePositions[page] = [100, 0]
  },
  getFollowingPageDiff() {
    return [100, 0]
  },
  setVisiblePages(pages: number[]) {
    visiblePages = pages
  },
  updatePageInfo() {
    pageInfoUpdates += 1
  },
}
for (const page of [1, 0, 1]) {
  assert.equal(
    (goTo as (this: typeof navigator, page: number) => unknown).call(navigator, page),
    null,
  )
  assert.equal(navigator.currPage, page)
  assert.equal(navigator.playState, 'idle')
  assert.deepEqual(pagePositions[page], [0, 0])
  assert.deepEqual(playPosition, [0, 0])
  assert.deepEqual(visiblePages, [page])
}
assert.equal(pageInfoUpdates, 3)

const compact = projectG2Theme(
  { ...appearance, density: 'compact' },
  { ...metrics, controlHeight: 32, controlPadding: 12 },
)
const spacious = projectG2Theme(
  { ...appearance, density: 'spacious' },
  { ...metrics, controlHeight: 44, controlPadding: 16 },
)
assert.ok(compact.margin < spacious.margin)
assert.ok(compact.legendCategory.rowPadding < spacious.legendCategory.rowPadding)
assert.ok(compact.slider.trackSize < spacious.slider.trackSize)

// Interrupted native animations must settle without restoring obsolete geometry later.
const { settleG2Animations } = await import('../../packages/ui/src/adapters/g2/pavp-g2-retarget')
type RetargetContext = Parameters<typeof settleG2Animations>[0]
type RetargetAnimation = NonNullable<RetargetContext['animations']>[number]
type RetargetTarget = NonNullable<RetargetContext['canvas']>['document']['documentElement']
interface RetargetTimeline {
  readonly animationsWithPromises: readonly unknown[]
  play(target: RetargetTarget, frames: Keyframe[], timing: KeyframeEffectOptions): RetargetAnimation
}
const nativeAnimations = g2Require('@antv/g') as {
  AnimationTimeline: new (document: {
    defaultView: {
      requestAnimationFrame: (callback: (time: number) => void) => number
      cancelAnimationFrame: (id: number) => void
    }
  }) => RetargetTimeline
  Rect: new (options: { style: Record<string, unknown> }) => RetargetTarget
}
const animationFrames = new Map<number, (time: number) => void>()
let animationFrameId = 0
const animationTimeline = new nativeAnimations.AnimationTimeline({
  defaultView: {
    requestAnimationFrame(callback) {
      animationFrames.set(++animationFrameId, callback)
      return animationFrameId
    },
    cancelAnimationFrame(id) {
      animationFrames.delete(id)
    },
  },
})
function advanceAnimations(time: number): void {
  const callbacks = [...animationFrames.values()]
  animationFrames.clear()
  for (const callback of callbacks) callback(time)
}
const retargetShape = new nativeAnimations.Rect({
  style: { width: 10, height: 10, x: 0, opacity: 1 },
})
const interrupted = animationTimeline.play(
  retargetShape,
  [
    { x: 0, opacity: 0 },
    { x: 80, opacity: 1 },
  ],
  { duration: 800, fill: 'both' },
)
let interruptionSettled = false
void interrupted.finished.then(() => {
  interruptionSettled = true
  interrupted.cancel() // G2 also cancels its transition when the promise settles.
})
interrupted.onfinish = () => {
  retargetShape.setAttribute('x', 999)
}
advanceAnimations(0)
advanceAnimations(100)
const displayedX = retargetShape.getAttribute('x') as unknown
const displayedOpacity = retargetShape.getAttribute('opacity') as unknown
assert.equal(displayedX, 10)
// Actual G2 guide transitions include null although the published type omits it.
settleG2Animations(
  { animations: [null, interrupted, undefined] as unknown as RetargetAnimation[] },
  true,
)
assert.equal(retargetShape.getAttribute('x') as unknown, displayedX)
await Promise.resolve()
advanceAnimations(200)
await new Promise<void>((resolve) => setTimeout(resolve, 0))
assert.equal(interruptionSettled, true)
assert.equal(animationTimeline.animationsWithPromises.length, 0)
assert.equal(retargetShape.getAttribute('x') as unknown, displayedX)
assert.equal(retargetShape.getAttribute('opacity') as unknown, displayedOpacity)
assert.equal(retargetShape.hasAttribute('computedOffset'), false)
assert.equal(retargetShape.hasAttribute('offset'), false)
const completing = animationTimeline.play(retargetShape, [{ opacity: 0 }, { opacity: 1 }], {
  duration: 800,
  fill: 'both',
})
const completionCallback = () => {
  retargetShape.setAttribute('x', 80)
}
completing.onfinish = completionCallback
const completion = completing.finished
advanceAnimations(300)
settleG2Animations({ animations: [completing] }, false)
await completion
assert.equal(completing.onfinish, completionCallback)
assert.equal(retargetShape.getAttribute('opacity') as unknown, 1)
completing.cancel()
advanceAnimations(400)
assert.equal(animationTimeline.animationsWithPromises.length, 0)

// Theta defaults keep real circular arcs, adjacent boundaries and interrupted geometry.
const { createG2ThetaUpdate } = await import('../../packages/ui/src/adapters/g2/pavp-g2-theta')
const thetaNative = g2Require('@antv/g') as {
  Path: new (options: { style: Record<string, unknown> }) => RetargetTarget
}
const thetaPaths = [
  [
    'M0,-100A100,100,0,0,1,100,0L60,0A60,60,0,0,0,0,-60Z',
    'M0,-100A100,100,0,0,1,0,100L0,60A60,60,0,0,0,0,-60Z',
  ],
  [
    'M100,0A100,100,0,1,1,0,-100L0,-60A60,60,0,1,0,60,0Z',
    'M0,100A100,100,0,0,1,0,-100L0,-60A60,60,0,0,0,0,60Z',
  ],
] as const
const thetaShapes = thetaPaths.map(([path]) => {
  const shape = new thetaNative.Path({ style: { d: path, fill: '#000000' } })
  Object.defineProperty(shape, 'animate', {
    value: (frames: Keyframe[], timing: KeyframeEffectOptions) =>
      animationTimeline.play(shape, frames, timing),
  })
  return shape
})
const thetaTransitions = thetaPaths.map(([, path], index) => {
  const shape = thetaShapes[index]
  assert.ok(shape)
  const target = new thetaNative.Path({ style: { d: path, fill: '#000000' } })
  const transition = createG2ThetaUpdate()({})([shape], [target], {
    duration: 800,
    easing: 'linear',
    fill: 'both',
  })
  assert.ok(!Array.isArray(transition))
  return transition
})
advanceAnimations(500)
advanceAnimations(700)
advanceAnimations(900)
const thetaDisplayed = thetaShapes.map((shape) => {
  const path: unknown = shape.getAttribute('d')
  assert.equal(typeof path, 'string')
  assert.ok(String(path).includes('A100,100'))
  assert.ok(!String(path).includes('C'))
  return String(path)
})
assert.notEqual(thetaDisplayed[0], thetaPaths[0][0])
assert.notEqual(thetaDisplayed[0], thetaPaths[0][1])
const boundaryA = thetaDisplayed[0]?.match(/A100,100,0,0,1,([^A-Z]+)L/u)?.[1]
const boundaryB = thetaDisplayed[1]?.match(/^M([^A-Z]+)/u)?.[1]
assert.equal(boundaryA, boundaryB, 'Adjacent sectors must share their displayed boundary.')
settleG2Animations({ animations: thetaTransitions }, true)
await Promise.resolve()
advanceAnimations(1100)
assert.deepEqual(
  thetaShapes.map((shape) => shape.getAttribute('d') as unknown),
  thetaDisplayed,
)
// Filtering to one category collapses later slices at 2π, not back at angle zero.
const singleCategoryPaths = [
  'M0,-100A100,100,0,1,1,-0.001,-100L-0.0006,-60A60,60,0,1,0,0,-60Z',
  'M0,-100A100,100,0,0,0,0,-100L0,-60A60,60,0,0,1,0,-60Z',
] as const
const collapsing = thetaShapes.map((shape, index) => {
  Object.defineProperty(shape, '__data__', { value: { y1: index === 0 ? 1 : 0 } })
  const target = new thetaNative.Path({ style: { d: singleCategoryPaths[index], fill: '#000000' } })
  const transition = createG2ThetaUpdate()({})([shape], [target], {
    duration: 800,
    easing: 'linear',
    fill: 'both',
  })
  assert.ok(!Array.isArray(transition))
  return transition
})
advanceAnimations(1300)
advanceAnimations(1500)
advanceAnimations(1700)
const collapsingPaths = thetaShapes.map((shape) => String(shape.getAttribute('d')))
const collapseEnd = collapsingPaths[0]
  ?.match(/A100,100,0,0,1,([^A-Z]+)L/u)?.[1]
  ?.split(',')
  .map(Number)
const collapseStart = collapsingPaths[1]
  ?.match(/^M([^A-Z]+)/u)?.[1]
  ?.split(',')
  .map(Number)
assert.ok(collapseEnd && collapseStart)
assert.ok(
  Math.hypot(
    (collapseEnd[0] ?? 0) - (collapseStart[0] ?? 0),
    (collapseEnd[1] ?? 0) - (collapseStart[1] ?? 0),
  ) < 0.005,
)
settleG2Animations({ animations: collapsing }, false)
await Promise.resolve()
advanceAnimations(1900)
await new Promise<void>((resolve) => setTimeout(resolve, 0))

// A nonanimated resize rewrites native paths without visiting the animation cache.
// Restoring categories afterwards must retain the collapsed sector's 2π winding.
const afterResize = thetaShapes.map((shape, index) => {
  const resizedPath = singleCategoryPaths[index]?.replaceAll('100', '80').replaceAll('60', '48')
  shape.setAttribute('d', resizedPath)
  record(record(shape)['__data__'])['y1'] = index === 0 ? 1 : 0.75
  const target = new thetaNative.Path({
    style: {
      d: thetaPaths[index]?.[0].replaceAll('100', '80').replaceAll('60', '48'),
      fill: '#000000',
    },
  })
  const transition = createG2ThetaUpdate()({})([shape], [target], {
    duration: 800,
    easing: 'linear',
    fill: 'both',
  })
  assert.ok(!Array.isArray(transition))
  return transition
})
advanceAnimations(1990)
advanceAnimations(2010)
advanceAnimations(2030)
const resizedPaths = thetaShapes.map((shape) => String(shape.getAttribute('d')))
const resizedEnd = resizedPaths[0]
  ?.match(/A80,80,0,0,1,([^A-Z]+)L/u)?.[1]
  ?.split(',')
  .map(Number)
const resizedStart = resizedPaths[1]
  ?.match(/^M([^A-Z]+)/u)?.[1]
  ?.split(',')
  .map(Number)
assert.ok(resizedEnd && resizedStart)
assert.ok(
  Math.hypot(
    (resizedEnd[0] ?? 0) - (resizedStart[0] ?? 0),
    (resizedEnd[1] ?? 0) - (resizedStart[1] ?? 0),
  ) < 0.005,
  'A resized collapsed sector must reopen from the shared final seam.',
)
settleG2Animations({ animations: afterResize }, true)
await Promise.resolve()
advanceAnimations(2050)

const thetaSpec: UiG2ChartOptions = {
  type: 'interval',
  coordinate: { type: 'theta' },
  data: [],
}
const thetaDefault = projectG2Options(thetaSpec, appearance, metrics, 600, 320)
assert.equal(typeof record(record(record(thetaDefault)['animate'])['update'])['type'], 'function')
const thetaExplicit = projectG2Options(
  { ...thetaSpec, animate: { update: { type: 'fadeIn' } } },
  appearance,
  metrics,
  600,
  320,
)
assert.equal(record(record(record(thetaExplicit)['animate'])['update'])['type'], 'fadeIn')
for (const motion of ['reduced', 'none'] as const) {
  const projected = projectG2Options(thetaSpec, { ...appearance, motion }, metrics, 600, 320)
  assert.ok(
    record(projected)['animate'] === false ||
      record(record(record(projected)['animate'])['update'])['type'] === null,
  )
}

// Native labels share the bar clock, numeric interpolation and rapid-update cleanup.
const { captureG2Labels, animateG2Labels } =
  await import('../../packages/ui/src/adapters/g2/pavp-g2-label-motion')
const labelShape = new nativeAnimations.Rect({ style: { x: 100, y: 40, text: '100' } })
Object.defineProperty(labelShape, 'animate', {
  value: (frames: Keyframe[], timing: KeyframeEffectOptions) =>
    animationTimeline.play(labelShape, frames, timing),
})
const labelBar = new nativeAnimations.Rect({ style: { x: 0, y: 40, width: 100, height: 20 } })
Object.assign(labelShape, { __data__: { dependentElement: labelBar } })
const labelContext = {
  canvas: { document: { getElementsByClassName: () => [labelShape] } },
  animations: [],
} as unknown as RetargetContext
const labelBefore = captureG2Labels(labelContext)
labelShape.setAttribute('x', 200)
labelShape.setAttribute('y', 80)
labelShape.setAttribute('text', '200')
const barMovement = animationTimeline.play(labelBar, [{ width: 100 }, { width: 200 }], {
  duration: 800,
  easing: 'linear',
  fill: 'both',
})
Object.defineProperty(labelBar, 'getAnimations', { value: () => [barMovement] })
animateG2Labels(labelContext, labelBefore)
assert.equal(labelContext.animations?.length, 1)
assert.equal(labelShape.getAttribute('x') as unknown, 100)
assert.equal(labelShape.getAttribute('text') as unknown, '100')
advanceAnimations(2100)
advanceAnimations(2500)
assert.equal(labelShape.getAttribute('x') as unknown, 150)
assert.equal(labelShape.getAttribute('y') as unknown, 60)
assert.equal(labelShape.getAttribute('text') as unknown, '150')
const labelMidpoint = captureG2Labels(labelContext)
settleG2Animations(labelContext, true)
assert.equal(labelShape.getAttribute('text') as unknown, '150')
assert.equal(labelMidpoint.get(labelShape)?.x, 150)
barMovement.finish()
barMovement.cancel()
advanceAnimations(2700)
assert.equal(labelShape.getAttribute('x') as unknown, 150)

// Native grow animations own temporary clipping, never a persistent layout boundary.
const growAnimations = (
  uiRequire('@antv/g2') as {
    stdlib(): Record<
      string,
      (
        options: Record<string, never>,
        context: { coordinate: { getOptions(): { transformations: [] } } },
      ) => (
        from: RetargetTarget[],
        to: RetargetTarget[],
        timing: KeyframeEffectOptions,
      ) => RetargetAnimation
    >
  }
).stdlib()
let growTime = 3000
for (const name of ['growInX', 'growInY']) {
  for (const completion of [
    'finished',
    'retargeted',
    'replaced',
    'cancelled',
    'destroyed',
  ] as const) {
    const shape = new nativeAnimations.Rect({
      style: { x: 100, y: 20, width: 80, height: 60 },
    })
    const originalClip = new nativeAnimations.Rect({ style: { width: 200, height: 200 } })
    if (completion === 'retargeted') shape.setAttribute('clipPath', originalClip)
    const appendChild = shape.appendChild.bind(shape)
    Object.defineProperty(shape, 'appendChild', {
      value: (child: RetargetTarget) => {
        Object.defineProperty(child, 'animate', {
          value: (frames: Keyframe[], timing: KeyframeEffectOptions) =>
            animationTimeline.play(child, frames, timing),
        })
        return appendChild(child)
      },
    })
    const factory = growAnimations[`animation.${name}`]
    assert.ok(factory)
    const animation = factory({}, { coordinate: { getOptions: () => ({ transformations: [] }) } })(
      [shape],
      [],
      { duration: 800, fill: 'both' },
    )
    const completed = animation.finished
    const temporaryClip = shape.getAttribute('clipPath') as RetargetTarget
    assert.notEqual(temporaryClip, originalClip)
    advanceAnimations(growTime)
    advanceAnimations(growTime + 100)
    assert.equal(shape.getAttribute('clipPath'), temporaryClip)
    if (completion === 'replaced') shape.setAttribute('clipPath', originalClip)
    if (completion === 'retargeted') settleG2Animations({ animations: [animation] }, true)
    else if (completion === 'cancelled') animation.cancel()
    else if (completion === 'destroyed') shape.destroy()
    else animation.finish()
    if (completion === 'cancelled' || completion === 'destroyed')
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    else await completed
    if (!shape.destroyed)
      assert.equal(
        shape.getAttribute('clipPath'),
        completion === 'retargeted' || completion === 'replaced' ? originalClip : undefined,
        `${name} must release its temporary clip without overwriting caller clipping.`,
      )
    assert.equal(temporaryClip.destroyed, true)
    if (!shape.destroyed) {
      shape.setAttribute('x', 10)
      shape.setAttribute('width', 20)
    }
    animation.cancel()
    advanceAnimations(growTime + 200)
    assert.equal(shape.children.length, 0)
    growTime += 300
  }
}

const resizedChart = projectG2Options(source, appearance, metrics, 320, 240, undefined, true)
assert.equal(record(resizedChart)['animate'], false)
assert.equal(record(children(resizedChart)[0])['animate'], false)
assert.equal(record(record(record(children(resizedChart)[0])['axis'])['x'])['animate'], false)
assert.equal(record(record(resizedChart.theme)['update'])['duration'], metrics.duration * 4)

// The overview and plot share bounded, integer domains with at least two samples.
assert.deepEqual(normalizeUiChartTimeRange([-3, 110], 0, 95), [0, 95])
assert.deepEqual(normalizeUiChartTimeRange([47.1, 47.2], 0, 95), [47, 48])
assert.deepEqual(panUiChartTimeRange([72, 95], 10, 0, 95), [72, 95])
assert.deepEqual(panUiChartTimeRange([10, 33], -30, 0, 95), [0, 23])
assert.deepEqual(zoomUiChartTimeRange([0, 95], 0.5, 0.5, 0, 95), [24, 72])
assert.deepEqual(zoomUiChartTimeRange([72, 95], 2, 1, 0, 95), [49, 95])
assert.deepEqual(zoomUiChartTimeRange([40, 41], 0.1, 0.5, 0, 95), [40, 41])

assert.deepEqual(zoomUiChartTimeRange([40, 41], 1.1, 0.5, 0, 95), [40, 42])

// Preserve the pointer's data coordinate, with at most half a discrete sample of rounding.
for (const anchor of [-0.25, 0.05, 0.5, 0.95, 1.25]) {
  const initial = [30, 70] as const
  const next = zoomUiChartTimeRange(initial, 0.7, anchor, 0, 95)
  const before = initial[0] + (initial[1] - initial[0]) * anchor
  const after = next[0] + (next[1] - next[0]) * anchor
  assert.ok(Math.abs(before - after) <= 0.5)
}
assert.deepEqual(zoomUiChartTimeRange([0, 10], 2, 0.95, 0, 95), [0, 20])
assert.throws(() => normalizeUiChartTimeRange([0, 1], 4, 4), RangeError)
assert.throws(() => normalizeUiChartTimeRange([NaN, 2], 0, 95), RangeError)
assert.throws(() => zoomUiChartTimeRange([0, 10], 0, 0.5, 0, 95), RangeError)

// Live examples retain bounded, reproducible samples rather than an accumulating history.
assert.deepEqual(liveStreamSamples(0), liveStreamSamples(0))
assert.deepEqual(liveRankingSamples(0), liveRankingSamples(0))
assert.deepEqual(liveDistributionSamples(0), liveDistributionSamples(0))
for (const tick of [0, 1, 17, 119, 1200, 86400]) {
  const stream = liveStreamSamples(tick)
  const next = liveStreamSamples(tick + 1)
  assert.equal(stream.length, 108)
  assert.equal(new Set(stream.map((row) => row.key)).size, 108)
  assert.ok(stream.every((row) => row.value >= 0 && row.value <= 160))
  assert.deepEqual(
    stream.filter((row) => row.second > tick),
    next.filter((row) => row.second < tick + 36),
  )
  const ranking = liveRankingSamples(tick)
  assert.equal(ranking.length, 6)
  assert.deepEqual(ranking.map((row) => row.key).sort(), ['0', '1', '2', '3', '4', '5'])
  assert.ok(
    ranking.every(
      (row, index) =>
        row.value >= 0 &&
        row.value <= 160 &&
        (index === 0 || (ranking[index - 1]?.value ?? 0) >= row.value),
    ),
  )
  const distribution = liveDistributionSamples(tick)
  const following = liveDistributionSamples(tick + 1)
  assert.equal(distribution.samples.length, 120)
  assert.equal(
    distribution.bins.reduce((total, row) => total + row.value, 0),
    120,
  )
  assert.deepEqual(distribution.samples.slice(6), following.samples.slice(0, -6))
  assert.equal(distribution.p95, [...distribution.samples].sort((a, b) => a - b)[113])
  assert.ok(distribution.samples.every((value) => value >= 0 && value < 600))
}
assert.notDeepEqual(
  liveRankingSamples(0).map((row) => row.key),
  liveRankingSamples(8).map((row) => row.key),
)
assert.equal(liveSampleTime(65), '01:05')

// Only native tooltip position writes belong to this measured vendor owner.
const eslint = new ESLint()
for (const [file, property, rejected] of [
  ['packages/ui/src/adapters/g2/pavp-g2-tooltip.ts', 'left', false],
  ['packages/ui/src/adapters/g2/pavp-g2-tooltip.ts', 'top', false],
  ['packages/ui/src/adapters/g2/pavp-g2-tooltip.ts', 'width', true],
  ['packages/ui/src/adapters/g2/pavp-g2-tooltip.ts', 'color', true],
  ['packages/ui/src/adapters/g2/pavp-g2-options.ts', 'left', true],
  ['apps/web/src/app/workbench/charts/chart-examples.ts', 'left', true],
] as const) {
  const [result] = await eslint.lintText(
    `const tooltip = document.createElement('div'); tooltip.style.${property} = '12px';`,
    { filePath: resolve(file) },
  )
  assert.ok(result)
  assert.equal(
    result.messages.some((message) => message.ruleId === 'local/no-unapproved-visual-literals'),
    rejected,
    `G2 tooltip positioning owner: ${file} ${property}`,
  )
}

// Linked examples use the same time window and category identity across three views.
const linkedRows = linkedSamples(0, (...args) => args[0])
assert.equal(linkedRows.length, 216)
assert.deepEqual(
  linkedRows,
  linkedSamples(0, (...args) => args[0]),
)
assert.notDeepEqual(
  linkedRows,
  linkedSamples(1, (...args) => args[0]),
)
assert.equal(linkedChannelOf({ data: { data: { channel: 'web' } } }), 'web')
assert.equal(linkedChannelOf({ data: { data: [{ channel: 'api' }] } }), 'api')
assert.equal(linkedChannelOf({ data: { data: { channel: 'unknown' } } }), null)
const linkedListeners = new Map<string, (event: unknown) => void>()
let linkedSelected: string | null = null
const linkedBridge = linkedChartEvents(
  (channel) => {
    linkedSelected = channel
  },
  () => undefined,
  computed(() => null),
  () => ({ duration: 0, easing: 'linear' }),
)
const linkedCleanup = linkedBridge()(
  { container: { querySelectorAll: () => [] }, view: { markState: new Map() } },
  [],
  {
    on: (name, listener) => linkedListeners.set(name, listener),
    off: (name) => linkedListeners.delete(name),
  },
)
linkedListeners.get('element:click')?.({ data: { data: { channel: 'mobile' } } })
assert.equal(linkedSelected, 'mobile')
linkedCleanup()
assert.equal(linkedListeners.size, 0)
const linkedSpecs = linkedChartOptions(linkedRows, [48, 71], ['a', 'b', 'c'], linkedBridge, false)
const linkedTrend = record(linkedSpecs.trend)['data'] as { value: number }[]
const linkedRank = record(linkedSpecs.ranking)['data'] as { value: number }[]
const linkedShare = record(linkedSpecs.composition)['data'] as { value: number }[]
assert.equal(linkedTrend.length, 72)
assert.equal(
  linkedTrend.reduce((sum, row) => sum + row.value, 0),
  7530,
)
assert.equal(
  linkedRank.reduce((sum, row) => sum + row.value, 0),
  7530,
)
assert.equal(
  linkedShare.reduce((sum, row) => sum + row.value, 0),
  7530,
)

const innerDefaults = projectG2Options(
  { type: 'interval', labels: [{ text: 'value', position: 'inside' }] },
  appearance,
  metrics,
  600,
  320,
)
assert.equal(
  typeof record(
    (record((record(innerDefaults)['labels'] as unknown[])[0])['transform'] as unknown[])[0],
  )['type'],
  'function',
)
const innerExplicit = projectG2Options(
  { type: 'interval', labels: [{ text: 'value', position: 'inside', style: { fill: '#123456' } }] },
  appearance,
  metrics,
  600,
  320,
)
assert.equal(record((record(innerExplicit)['labels'] as unknown[])[0])['transform'], undefined)

const innerThemed = projectG2Options(
  {
    type: 'interval',
    theme: { innerLabel: { fill: '#123456' } },
    labels: [{ text: 'value', position: 'inside' }],
  },
  appearance,
  metrics,
  600,
  320,
)
assert.equal(record((record(innerThemed)['labels'] as unknown[])[0])['transform'], undefined)

console.log(
  'G2: bounded live simulation, rolling windows, stable ranking identities, histogram totals/P95, native options, 20 theme/color states, color overrides, tooltip portals/inheritance and positioning ownership, tooltip/guide motion and pagination, sizes, immutability, timeline/facet and pointer range policies passed.',
)

// Tour lifecycle uses a fake clock: no browser timers or vendor instance escape.
{
  const { createChartTour } = await import('../../packages/ui/src/components/chart-tour-runtime')
  let callback: (() => void) | undefined
  let current: UiChartTourState = {
    status: 'stopped',
    targetId: null,
    reason: null,
  }
  const tour = createChartTour(
    (state) => {
      current = state
    },
    {
      set: (next) => {
        callback = next
        return 1
      },
      clear: () => {
        callback = undefined
      },
    },
  )
  function tick(): void {
    const run = callback
    callback = undefined
    run?.()
  }
  const targets = ['a', 'b', 'c'].map((id) => ({ id, field: 'key', value: id }))
  tour.configure({ targets, autoplay: true, intervalMs: 4000 })
  tour.available(['a', 'b', 'c'])
  assert.equal(current.status, 'waiting')
  tour.suspend('rendering', false)
  assert.equal(current.status, 'playing')
  assert.equal(current.targetId, 'a')
  tick()
  assert.equal(current.targetId, 'b')
  tour.suspend('interaction', true)
  assert.equal(callback, undefined)
  assert.equal(tour.target(), null)
  tour.suspend('interaction', false)
  assert.equal(tour.target()?.id, 'b')
  tour.pause()
  tour.suspend('hidden', true)
  tour.suspend('hidden', false)
  assert.equal(current.status, 'paused')
  assert.equal(callback, undefined)
  tour.configure({ targets: [...targets].reverse(), autoplay: true })
  assert.equal(current.targetId, 'b')
  tour.available(['a', 'c'])
  assert.equal(current.targetId, 'a')
  tour.stop()
  assert.equal(current.targetId, null)
  tour.step(-1)
  assert.equal(current.targetId, 'a')
  tour.play()
  tour.suspend('motion', true)
  assert.equal(current.reason, 'motion')
  assert.equal(callback, undefined)
  tour.suspend('motion', false)
  tour.available([])
  assert.equal(current.reason, 'empty')
  assert.equal(callback, undefined)
  tour.available(['a'])
  assert.equal(current.status, 'playing')
  assert.equal(callback, undefined)
  tour.stop()
  tour.configure({ targets, loop: false })
  tour.available(['a', 'b', 'c'])
  tour.play()
  tick()
  tick()
  tick()
  assert.equal(current.targetId, 'c')
  assert.equal(current.status, 'paused')
  assert.equal(callback, undefined)
  assert.throws(() => {
    tour.configure({ targets, intervalMs: 0 })
  }, /intervalMs/u)
  assert.throws(() => {
    tour.configure({
      targets: [
        { id: 'a', field: 'key', value: 'a' },
        { id: 'a', field: 'key', value: 'a' },
      ],
    })
  }, /unique IDs/u)
  tour.play()
  tour.dispose()
  assert.equal(callback, undefined)
}

// Temporal formatting is explicit and immutable; native developer customizations win.
{
  const { projectG2DateTime } = await import('../../packages/ui/src/adapters/g2/pavp-g2-date-time')
  const context = { locale: 'en-US', timeZone: 'UTC', hourCycle: 'h23' } as const
  const source = {
    type: 'line' as const,
    encode: { x: 'at', y: 'value' },
    tooltip: { items: ['value'] },
  }
  const channels = { x: { kind: 'timestamp', unit: 'milliseconds', preset: 'time' } } as const
  assert.equal(projectG2DateTime(source, undefined, context), source)
  const projected = projectG2DateTime(source, channels, context)
  const inspect = projected as unknown as {
    axis: { x: { labelFormatter: (value: unknown) => string } }
    tooltip: { title: (value: unknown) => string; items: readonly string[] }
  }
  assert.equal(inspect.axis.x.labelFormatter(Date.UTC(2026, 0, 1, 12)), '12:00:00')
  assert.match(inspect.tooltip.title({ at: Date.UTC(2026, 0, 1, 12) }), /2026/u)
  assert.equal(inspect.axis.x.labelFormatter('not-a-date'), '—')
  assert.deepEqual(inspect.tooltip.items, ['value'])
  assert.equal('axis' in source, false)
  const instantProjected = projectG2DateTime(
    { ...source, scale: { x: { type: 'time' } } },
    { x: { kind: 'instant', preset: 'time' } },
    context,
  ) as unknown as { axis: { x: { labelFormatter: (value: unknown) => string } } }
  assert.equal(instantProjected.axis.x.labelFormatter(new Date('2026-01-01T12:00:00Z')), '12:00:00')
  assert.equal(instantProjected.axis.x.labelFormatter(new Date('invalid')), '—')
  const dateProjected = projectG2DateTime(
    source,
    { x: { kind: 'date' } },
    { ...context, timeZone: 'America/New_York' },
  ) as unknown as { axis: { x: { labelFormatter: (value: unknown) => string } } }
  assert.equal(dateProjected.axis.x.labelFormatter('2026-01-01'), '01/01/2026')
  assert.equal(
    dateProjected.axis.x.labelFormatter(new Date('2026-01-01T00:00:00Z')),
    '—',
    'Civil date channels do not guess a timezone for instant values.',
  )
  // Exercise the installed continuous scale, including local-midnight ticks crossing DST.
  const { Time } = createRequire(uiRequire.resolve('@antv/g2'))('@antv/scale') as {
    Time: new (options: { domain: Date[]; tickCount: number; utc: boolean }) => {
      getTicks(): Date[]
    }
  }
  const previousTZ = process.env['TZ']
  try {
    for (const hostZone of ['UTC', 'Asia/Shanghai', 'America/New_York', 'Pacific/Kiritimati']) {
      process.env['TZ'] = hostZone
      for (const utc of [false, true]) {
        const domain = ['2026-03-07', '2026-03-10'].map(
          (date) => new Date(utc ? date : `${date}T00:00:00`),
        )
        const ticks = new Time({ domain, tickCount: 4, utc }).getTicks()
        assert.equal(ticks.length, 4)
        for (const displayZone of ['UTC', 'America/New_York', 'Pacific/Kiritimati']) {
          const options = { ...source, scale: { x: { type: 'time' as const, utc } } }
          const adapted = projectG2DateTime(
            options,
            { x: { kind: 'date' } },
            { ...context, timeZone: displayZone, dateFormat: 'ymd' },
          ) as unknown as { axis: { x: { labelFormatter: (value: unknown) => string } } }
          assert.deepEqual(ticks.map(adapted.axis.x.labelFormatter), [
            '2026-03-07',
            '2026-03-08',
            '2026-03-09',
            '2026-03-10',
          ])
          assert.equal(adapted.axis.x.labelFormatter(new Date('invalid')), '—')
          assert.equal(adapted.axis.x.labelFormatter('2026-03-07'), '2026-03-07')
          assert.equal('axis' in options, false)
          assert.deepEqual(options.scale.x, { type: 'time', utc })
          const nestedDates = projectG2DateTime(
            { type: 'view', scale: options.scale, children: [source] },
            { x: { kind: 'date' } },
            { ...context, timeZone: displayZone, dateFormat: 'dmy' },
          ) as unknown as {
            children: { axis: { x: { labelFormatter: (value: unknown) => string } } }[]
          }
          assert.equal(nestedDates.children[0]?.axis.x.labelFormatter(ticks[0]), '07/03/2026')
          const customDate = () => 'caller date'
          const explicit = projectG2DateTime(
            { ...options, axis: { x: { labelFormatter: customDate } } },
            { x: { kind: 'date' } },
            context,
          ) as unknown as { axis: { x: { labelFormatter: typeof customDate } } }
          assert.equal(explicit.axis.x.labelFormatter, customDate)
        }
      }
    }
  } finally {
    if (previousTZ === undefined) delete process.env['TZ']
    else process.env['TZ'] = previousTZ
  }
  for (const tooltip of ['value', ['value'], { field: 'value' }, { channel: 'y' }, () => 'value']) {
    const shortcut = projectG2DateTime({ ...source, tooltip }, channels, context) as unknown as {
      tooltip: unknown
    }
    assert.equal(shortcut.tooltip, tooltip, 'Native tooltip shortcuts remain caller-owned.')
  }

  assert.equal(
    projectG2DateTime(source, undefined, context),
    source,
    'Removing date channels restores original options without stale projected formatters.',
  )
  const custom = () => 'custom'
  const overridden = projectG2DateTime(
    { ...source, axis: { x: { labelFormatter: custom } }, tooltip: { title: custom } },
    channels,
    context,
  ) as unknown as {
    axis: { x: { labelFormatter: typeof custom } }
    tooltip: { title: typeof custom }
  }
  assert.equal(overridden.axis.x.labelFormatter, custom)
  assert.equal(overridden.tooltip.title, custom)
  const disabled = projectG2DateTime(
    { ...source, axis: false, tooltip: false },
    channels,
    context,
  ) as unknown as { axis: false; tooltip: false }
  assert.equal(disabled.axis, false)
  assert.equal(disabled.tooltip, false)
  const nested = projectG2DateTime(
    { type: 'view', axis: false, tooltip: false, children: [source] },
    channels,
    context,
  ) as unknown as { children: { axis: false; tooltip: false }[] }
  assert.equal(nested.children[0]?.axis, false)
  // The child explicitly supplies tooltip items, so it owns its tooltip rather than inheriting false.
  const inherited = projectG2DateTime(
    {
      type: 'view',
      axis: false,
      tooltip: false,
      children: [{ type: 'line', encode: { x: 'at', y: 'value' } }],
    },
    channels,
    context,
  ) as unknown as { children: { axis: false; tooltip: false }[] }
  assert.equal(inherited.children[0]?.tooltip, false)
}

{
  const { innerLabelContrast } =
    await import('../../packages/ui/src/adapters/g2/pavp-g2-label-contrast')
  assert.equal(innerLabelContrast('#000', 1, 1, '#fff'), '#fff')
  assert.equal(innerLabelContrast('#fff', 1, 1, '#000'), '#000')
  assert.equal(innerLabelContrast('#000', 1, 0.25, '#fff'), '#000')
  assert.equal(innerLabelContrast('#fff', 1, 0.25, '#000'), '#fff')
  assert.equal(innerLabelContrast('rgba(0, 0, 0, 0.25)', 1, 1, '#fff'), '#000')
  assert.equal(innerLabelContrast('#000', 0.25, 1, '#fff'), '#000')
  assert.equal(innerLabelContrast('#000', 1, 1, '#000'), '#fff')
  assert.equal(innerLabelContrast('gradient', 1, 1, '#fff'), undefined)
}

{
  const {
    createG2InnerContrast,
    resetG2LabelContrast,
    disposeG2LabelContrast,
    resolveG2CanvasBackground,
  } = await import('../../packages/ui/src/adapters/g2/pavp-g2-label-contrast')
  const events = new Map<string, (event?: unknown) => void>()
  let writes = 0
  const parentDocument = { parentElement: null }
  const mark = {
    destroyed: false,
    parsedStyle: { fill: { r: 0, g: 0, b: 0, alpha: 1 }, fillOpacity: 1, opacity: 1 },
    parentElement: parentDocument,
  }
  const attributes = new Map<string, unknown>([
    ['dependentElement', mark],
    ['fill', '#000'],
  ])
  const label = {
    destroyed: false,
    getBounds: () => ({ center: [0, 0], halfExtents: [1, 1] }),
    getAttribute: (key: string) => attributes.get(key),
    setAttribute: (key: string, value: unknown) => {
      writes++
      attributes.set(key, value)
      events.get('DOMAttrModified')?.({ attrName: key, target: label })
    },
  }
  const canvas = {
    getContextService: () => ({ getDomElement: () => ({}) }),
    addEventListener: (name: string, callback: (event?: unknown) => void) => {
      assert.equal(events.has(name), false)
      events.set(name, callback)
    },
    removeEventListener: (name: string) => events.delete(name),
  }
  type Transform = ReturnType<ReturnType<typeof createG2InnerContrast>>
  const labels = [label] as unknown as Parameters<Transform>[0]
  const context = { canvas } as unknown as Parameters<Transform>[1]
  createG2InnerContrast('#fff')()(labels, context)
  assert.equal(attributes.get('fill'), '#fff')
  const initialWrites = writes
  events.get('beforerender')?.()
  events.get('beforerender')?.()
  assert.equal(writes, initialWrites, 'Idle frames do not dirty or rewrite label colors.')
  mark.parsedStyle.opacity = 0.25
  events.get('DOMAttrModified')?.({ attrName: 'opacity', target: mark })
  events.get('beforerender')?.()
  assert.equal(
    attributes.get('fill'),
    '#000',
    'Direct/animated opacity changes update composited contrast.',
  )
  mark.parsedStyle.opacity = 1
  mark.parsedStyle.fill = { r: 255, g: 255, b: 255, alpha: 1 }
  events.get('DOMAttrModified')?.({ attrName: 'fill', target: mark })
  events.get('beforerender')?.()
  assert.equal(attributes.get('fill'), '#000')
  // G Canvas paints each primitive using its own resolved opacity, not ancestor products.
  const nativeG = g2Require('@antv/g') as {
    Group: new (config: unknown) => {
      append: (...children: unknown[]) => void
      parsedStyle: { opacity?: number }
    }
    Rect: new (config: unknown) => typeof mark
  }
  const group = new nativeG.Group({ style: { opacity: 0.25 } })
  const inherited = new nativeG.Rect({ style: { width: 10, height: 10, fill: '#fff' } })
  const explicit = new nativeG.Rect({ style: { width: 10, height: 10, fill: '#fff', opacity: 1 } })
  group.append(inherited, explicit)
  assert.equal(group.parsedStyle.opacity, 0.25)
  assert.equal(inherited.parsedStyle.opacity, undefined)
  assert.equal(explicit.parsedStyle.opacity, 1)
  attributes.set('dependentElement', explicit)
  createG2InnerContrast('#000')()(labels, context)
  assert.equal(
    attributes.get('fill'),
    '#000',
    'Explicit opaque child is not faded by ancestor opacity.',
  )
  attributes.set('dependentElement', inherited)
  createG2InnerContrast('#000')()(labels, context)
  assert.equal(
    attributes.get('fill'),
    '#000',
    'Unspecified opacity matches native Canvas default 1.',
  )
  attributes.set('dependentElement', mark)
  createG2InnerContrast('#fff')()(labels, context)
  const lifecycleContext = context as unknown as Parameters<typeof resetG2LabelContrast>[0]
  assert.equal(resolveG2CanvasBackground(lifecycleContext, '#123456'), 'rgb(18, 52, 86)')
  resetG2LabelContrast(lifecycleContext)
  attributes.set('fill', '#custom')
  mark.parsedStyle.fill = { r: 0, g: 0, b: 0, alpha: 1 }
  events.get('DOMAttrModified')?.({ attrName: 'fill', target: mark })
  events.get('beforerender')?.()
  assert.equal(
    attributes.get('fill'),
    '#custom',
    'A new spec with explicit colors no longer belongs to auto contrast.',
  )
  createG2InnerContrast('#000')()(labels, context)
  assert.equal(events.size, 3, 'Re-registering labels reuses one canvas listener set.')
  disposeG2LabelContrast(lifecycleContext)
  assert.equal(events.size, 0, 'Disposal removes scene listeners.')
}
