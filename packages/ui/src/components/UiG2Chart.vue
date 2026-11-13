<script setup lang="ts">
import { Chart, ChartEvent, render as renderG2 } from '@antv/g2'
import { inject, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { projectG2Options } from '../adapters/g2/pavp-g2-options'
import { settleG2Animations } from '../adapters/g2/pavp-g2-retarget'
import { animateG2Labels, captureG2Labels } from '../adapters/g2/pavp-g2-label-motion'
import { createG2TooltipViewport } from '../adapters/g2/pavp-g2-tooltip'
import type { G2ThemeMetrics } from '../adapters/g2/pavp-g2-theme'
import { createChartTour } from './chart-tour-runtime'
import type {
  UiChartTourConfig,
  UiChartTourState,
  UiG2ChartHandle,
  UiG2ChartOptions,
} from './g2-chart-contracts'

defineOptions({ name: 'UiG2Chart' })
const props = defineProps<{
  readonly options: UiG2ChartOptions
  readonly label: string
  readonly tour?: UiChartTourConfig
}>()
const emit = defineEmits<{
  rendered: []
  error: [error: Error]
  tourChange: [state: UiChartTourState]
}>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new Error('UiG2Chart requires UiProvider.')
const host = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)
const resizePreview = ref<HTMLCanvasElement | null>(null)
const resizing = ref(false)
const metric = ref<HTMLElement | null>(null)
const tooltipMount = ref<HTMLElement | null>(null)
const tourRuntime = createChartTour((state) => {
  emit('tourChange', state)
})
let tourConfig: UiChartTourConfig | undefined
let visibilityObserver: IntersectionObserver | undefined
let pointerInside = false
let focusInside = false
let onscreen = true
function setPointer(value: boolean): void {
  pointerInside = value
  syncInteraction()
}
function setFocus(value: boolean): void {
  focusInside = value
  syncInteraction()
}
function syncInteraction(): void {
  tourRuntime.suspend('interaction', pointerInside || focusInside)
}
function syncVisibility(): void {
  tourRuntime.suspend('hidden', !active || !onscreen || document.hidden)
}
function tourSeriesTooltip(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (
    'interaction' in value &&
    value.interaction &&
    typeof value.interaction === 'object' &&
    'tooltip' in value.interaction
  ) {
    const tooltip = value.interaction.tooltip
    if (tooltip && typeof tooltip === 'object' && 'series' in tooltip && tooltip.series === false)
      return false
  }
  if ('type' in value && (value.type === 'line' || value.type === 'area')) return true
  return (
    'children' in value && Array.isArray(value.children) && value.children.some(tourSeriesTooltip)
  )
}
let tooltipViewport: ReturnType<typeof createG2TooltipViewport> | undefined
const caption = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const busy = ref(false)
let chart: Chart | undefined
let chartHost: HTMLElement | undefined
let observer: ResizeObserver | undefined
let frame: number | undefined
let resizeFrame: number | undefined
let previewFrame: number | undefined
let observedSize: { width: number; height: number } | undefined
let observedMetrics = ''
let active = false
let generation = 0
let revision = 0
let painting = false
let timeline = false
let dirty = false
let labelFrames: ReturnType<typeof captureG2Labels> | undefined
let paintedSize: { width: number; height: number } | undefined

function readMetrics(): G2ThemeMetrics {
  if (!metric.value || !caption.value || !title.value) throw new Error('Chart metrics unavailable.')
  const style = getComputedStyle(metric.value)
  const duration = Number.parseFloat(style.transitionDuration)
  return {
    fontFamily: style.fontFamily,
    bodySize: Number.parseFloat(style.fontSize),
    captionSize: Number.parseFloat(getComputedStyle(caption.value).fontSize),
    titleSize: Number.parseFloat(getComputedStyle(title.value).fontSize),
    controlHeight: Number.parseFloat(style.height),
    controlPadding: Number.parseFloat(style.paddingLeft),
    spacing: Number.parseFloat(style.columnGap),
    borderWidth: Number.parseFloat(style.borderTopWidth),
    radius: Number.parseFloat(style.borderTopLeftRadius),
    duration: duration * (style.transitionDuration.endsWith('ms') ? 1 : 1000),
    easing: style.transitionTimingFunction,
  }
}

function observeLayout(): void {
  if (!active || !host.value) return
  const size = { width: host.value.clientWidth, height: host.value.clientHeight }
  const metrics = JSON.stringify(readMetrics())
  const changed = observedSize?.width !== size.width || observedSize.height !== size.height
  const metricsChanged = observedMetrics !== metrics
  observedSize = size
  observedMetrics = metrics
  if (changed && paintedSize && size.width > 0 && size.height > 0) {
    // Retain the last painted pixels while layout is moving. Rebuilding the scene on
    // every ResizeObserver delivery clears the canvas and competes with shell motion.
    if (!resizing.value && chart && resizePreview.value) {
      const source = chart.getContext().canvas?.getContextService().getDomElement()
      if (source instanceof HTMLCanvasElement) {
        const preview = resizePreview.value
        preview.width = source.width
        preview.height = source.height
        preview.getContext('2d')?.drawImage(source, 0, 0)
        resizing.value = true
        chart.emit('tooltip:hide', {})
      }
    }
    if (previewFrame !== undefined) cancelAnimationFrame(previewFrame)
    previewFrame = undefined
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
    let stableFrames = 0
    let previous = size
    const settle = (): void => {
      if (!active || !host.value) return
      const current = { width: host.value.clientWidth, height: host.value.clientHeight }
      stableFrames =
        current.width === previous.width && current.height === previous.height
          ? stableFrames + 1
          : 0
      previous = current
      if (stableFrames < 2) {
        resizeFrame = requestAnimationFrame(settle)
        return
      }
      resizeFrame = undefined
      schedule()
    }
    resizeFrame = requestAnimationFrame(settle)
    revision += 1
    dirty = true
    busy.value = true
    tourRuntime.suspend('rendering', true)
  } else if (metricsChanged || !paintedSize) schedule()
}

function schedule(): void {
  dirty = true
  tourRuntime.suspend('rendering', true)
  revision += 1
  if (!active || frame !== undefined || resizeFrame !== undefined) return
  // A native keyframe generator owns its sequence until completion. Drain obsolete
  // frames before starting the latest spec, rather than waiting seconds behind it.
  if (timeline || appearance?.value.motion !== 'full') finishAnimations()
  if (painting || timeline) return
  frame = requestAnimationFrame(() => {
    frame = undefined
    void render()
  })
}

function isCurrent(currentGeneration: number, currentRevision: number): boolean {
  return active && generation === currentGeneration && revision === currentRevision
}
function renderPending(): void {
  if (
    dirty &&
    active &&
    frame === undefined &&
    resizeFrame === undefined &&
    !painting &&
    !timeline
  ) {
    frame = requestAnimationFrame(() => {
      frame = undefined
      void render()
    })
  }
}
function finishAnimations(): void {
  if (chart) settleG2Animations(chart.getContext(), false)
}
function hasTimeline(options: unknown): boolean {
  if (!options || typeof options !== 'object') return false
  if ('type' in options && options.type === 'timingKeyframe') return true
  if (!('children' in options)) return false
  return (
    typeof options.children === 'function' ||
    (Array.isArray(options.children) &&
      options.children.some((child: unknown) => hasTimeline(child)))
  )
}
function painted(): void {
  if (resizing.value && resizeFrame === undefined && !dirty) {
    // AFTER_PAINT is a scene event; retain the preview through the canvas paint frame.
    previewFrame = requestAnimationFrame(() => {
      previewFrame = requestAnimationFrame(() => {
        previewFrame = undefined
        if (resizeFrame === undefined && !dirty) {
          resizing.value = false
          if (resizePreview.value) {
            resizePreview.value.width = 0
            resizePreview.value.height = 0
          }
        }
      })
    })
  }
  if (chart && labelFrames && appearance?.value.motion === 'full')
    animateG2Labels(chart.getContext(), labelFrames)
  labelFrames = undefined
  painting = false
  if (dirty && (timeline || appearance?.value.motion !== 'full')) finishAnimations()
  renderPending()
}

async function render(): Promise<void> {
  if (
    !active ||
    !host.value ||
    !container.value ||
    !appearance ||
    painting ||
    timeline ||
    resizeFrame !== undefined
  )
    return
  let width = host.value.clientWidth
  let height = host.value.clientHeight
  if (width <= 0 || height <= 0) return
  dirty = false
  painting = true
  busy.value = true
  const currentGeneration = generation
  let currentRevision = revision
  let sequence = false
  try {
    if (chart === undefined) {
      chartHost = document.createElement('div')
      container.value.append(chartHost)
      chart = new Chart({ container: chartHost, autoFit: false })
      // Initialize the supported canvas/context once, without playing an empty scene.
      chart.options({ type: 'view', width, height, animate: false })
      await chart.render()
      if (generation !== currentGeneration) return
      chart.on(ChartEvent.AFTER_PAINT, painted)
      if (tooltipViewport) chart.on('tooltip:show', tooltipViewport.constrain)
    }
    // Initialization may span a ResizeObserver notification. Paint the latest snapshot
    // once rather than immediately replacing its enter animation with a duplicate update.
    currentRevision = revision
    width = host.value.clientWidth
    height = host.value.clientHeight
    if (width <= 0 || height <= 0) return
    dirty = false
    const resized =
      paintedSize !== undefined && (paintedSize.width !== width || paintedSize.height !== height)
    paintedSize = { width, height }
    const metrics = readMetrics()
    const options = projectG2Options(
      props.options,
      appearance.value,
      metrics,
      width,
      height,
      tooltipViewport?.options(metrics.spacing),
      resized,
      tourConfig
        ? {
            runtime: tourRuntime,
            targets: tourConfig.targets,
            seriesTooltip: tourSeriesTooltip(props.options),
          }
        : undefined,
    )
    sequence = hasTimeline(options)
    timeline = sequence
    labelFrames = captureG2Labels(chart.getContext())
    settleG2Animations(chart.getContext(), appearance.value.motion === 'full')
    // The public low-level renderer replaces the spec without merging. Unlike Chart.render's
    // animation queue, it can retarget a keyed scene as soon as the previous paint is ready.
    // G2 samples the displayed geometry before retiring old animations, preserving continuity.
    await new Promise<void>((resolve, reject) => {
      if (!chart) {
        resolve()
        return
      }
      renderG2(options, chart.getContext(), resolve, reject)
    })
    if (isCurrent(currentGeneration, currentRevision)) {
      tourRuntime.suspend('rendering', false)
      emit('rendered')
    }
  } catch (error: unknown) {
    if (generation === currentGeneration) {
      painting = false
      resizing.value = false
    }
    if (isCurrent(currentGeneration, currentRevision))
      emit('error', error instanceof Error ? error : new Error(String(error)))
  } finally {
    if (generation === currentGeneration) {
      if (sequence) timeline = false
      if (isCurrent(currentGeneration, currentRevision)) {
        painting = false
        busy.value = false
      }
      renderPending()
    }
  }
}

/** Snapshot the ready canvas, rather than restarting animation or exporting stale options. */
async function exportImage(): Promise<Blob> {
  if (
    !active ||
    !chart ||
    busy.value ||
    resizing.value ||
    dirty ||
    painting ||
    timeline ||
    !appearance
  )
    throw new Error('The chart is not ready to export.')
  const source = chart.getContext().canvas?.getContextService().getDomElement()
  if (!(source instanceof HTMLCanvasElement) || source.width <= 0 || source.height <= 0)
    throw new Error('The chart canvas is unavailable.')
  // Copy synchronously: later data/theme changes cannot mix into this snapshot.
  const snapshot = document.createElement('canvas')
  snapshot.width = source.width
  snapshot.height = source.height
  const context = snapshot.getContext('2d')
  if (!context) throw new Error('Image export is unavailable.')
  context.fillStyle = appearance.value.colorPalette.surfaces.surface
  context.fillRect(0, 0, snapshot.width, snapshot.height)
  context.drawImage(source, 0, 0)
  return await new Promise<Blob>((resolve, reject) => {
    snapshot.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The chart image could not be encoded.'))
    }, 'image/png')
  })
}
defineExpose<UiG2ChartHandle>({
  exportImage,
  playTour: () => {
    tourRuntime.play()
  },
  pauseTour: () => {
    tourRuntime.pause()
  },
  stopTour: () => {
    tourRuntime.stop()
  },
  nextTour: () => {
    tourRuntime.step(1)
  },
  previousTour: () => {
    tourRuntime.step(-1)
  },
})

function start(): void {
  if (active || !host.value || !metric.value || !tooltipMount.value) return
  active = true
  onscreen = true
  pointerInside = host.value.matches(':hover')
  focusInside = host.value.contains(document.activeElement)
  syncInteraction()
  syncVisibility()
  tourRuntime.suspend('motion', appearance?.value.motion !== 'full')
  document.addEventListener('visibilitychange', syncVisibility)
  visibilityObserver = new IntersectionObserver((entries) => {
    onscreen = entries.some((entry) => entry.isIntersecting)
    syncVisibility()
  })
  visibilityObserver.observe(host.value)
  tooltipViewport = createG2TooltipViewport(
    host.value,
    tooltipMount.value,
    () => {
      chart?.emit('tooltip:hide', {})
    },
    appearance?.value.motion === 'full',
  )
  observer = new ResizeObserver(observeLayout)
  observer.observe(host.value)
  observer.observe(metric.value)
  if (caption.value) observer.observe(caption.value)
  if (title.value) observer.observe(title.value)
  schedule()
}
function stop(): void {
  active = false
  tourRuntime.suspend('hidden', true)
  tourRuntime.suspend('rendering', true)
  visibilityObserver?.disconnect()
  visibilityObserver = undefined
  document.removeEventListener('visibilitychange', syncVisibility)
  generation += 1
  observer?.disconnect()
  observer = undefined
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
  if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
  if (previewFrame !== undefined) cancelAnimationFrame(previewFrame)
  resizeFrame = undefined
  previewFrame = undefined
  observedSize = undefined
  observedMetrics = ''
  resizing.value = false
  chart?.destroy()
  tooltipViewport?.destroy()
  tooltipViewport = undefined
  chart = undefined
  chartHost?.remove()
  chartHost = undefined
  painting = false
  timeline = false
  labelFrames = undefined
  paintedSize = undefined
  busy.value = false
}
watch(
  () => props.tour,
  (value) => {
    try {
      tourRuntime.configure(value)
      tourConfig = value
      schedule()
    } catch (error: unknown) {
      tourRuntime.configure(undefined)
      tourConfig = undefined
      schedule()
      emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  },
  { deep: true, immediate: true },
)
watch(() => props.options, schedule, { deep: true, flush: 'post' })
watch(
  appearance,
  (next, previous) => {
    if (active && next.motion !== previous.motion) {
      // Retire in-flight spatial animation immediately when the preference changes.
      stop()
      start()
    } else schedule()
  },
  { flush: 'post' },
)
onMounted(start)
onActivated(start)
onDeactivated(stop)
onBeforeUnmount(() => {
  stop()
  tourRuntime.dispose()
})
</script>

<template>
  <div
    ref="host"
    class="h-full min-h-0 min-w-0 w-full relative"
    role="img"
    :aria-label="label"
    :aria-busy="busy"
    @pointerenter="setPointer(true)"
    @pointerleave="setPointer(false)"
    @pointerdown="tourRuntime.pause()"
    @focusin="setFocus(true)"
    @focusout="setFocus(host?.contains($event.relatedTarget as Node | null) ?? false)"
  >
    <div
      v-show="!resizing"
      ref="container"
      class="inset-0 absolute"
      aria-hidden="true"
    />
    <canvas
      v-show="resizing"
      ref="resizePreview"
      class="h-full w-full inset-0 absolute"
      aria-hidden="true"
    />
    <Teleport to="#pavp-overlay-root">
      <div
        ref="tooltipMount"
        class="pointer-events-none inset-0 fixed z-overlay"
        aria-hidden="true"
      />
    </Teleport>
    <span
      ref="metric"
      class="font-body-family rounded-control border-solid flex invisible pointer-events-none absolute border-width-default duration-motion ease-motion gap-component-unit h-control px-button-inline text-body"
      aria-hidden="true"
    >
      <span>M</span>
      <span
        ref="caption"
        class="text-caption"
        v-text="'M'"
      />
      <span
        ref="title"
        class="text-title"
        v-text="'M'"
      />
    </span>
  </div>
</template>
