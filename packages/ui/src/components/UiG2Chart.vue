<script setup lang="ts">
import { Chart, ChartEvent, render as renderG2 } from '@antv/g2'
import { inject, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { projectG2Options } from '../adapters/g2/pavp-g2-options'
import { settleG2Animations } from '../adapters/g2/pavp-g2-retarget'
import { animateG2Labels, captureG2Labels } from '../adapters/g2/pavp-g2-label-motion'
import { createG2TooltipViewport } from '../adapters/g2/pavp-g2-tooltip'
import type { G2ThemeMetrics } from '../adapters/g2/pavp-g2-theme'
import type { UiG2ChartOptions } from './g2-chart-contracts'

defineOptions({ name: 'UiG2Chart' })
const props = defineProps<{ readonly options: UiG2ChartOptions; readonly label: string }>()
const emit = defineEmits<{ rendered: []; error: [error: Error] }>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new Error('UiG2Chart requires UiProvider.')
const host = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)
const metric = ref<HTMLElement | null>(null)
const tooltipMount = ref<HTMLElement | null>(null)
let tooltipViewport: ReturnType<typeof createG2TooltipViewport> | undefined
const caption = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const busy = ref(false)
let chart: Chart | undefined
let chartHost: HTMLElement | undefined
let observer: ResizeObserver | undefined
let frame: number | undefined
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

function schedule(): void {
  dirty = true
  revision += 1
  if (!active || frame !== undefined) return
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
  if (dirty && active && frame === undefined && !painting && !timeline) {
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
  if (chart && labelFrames && appearance?.value.motion === 'full')
    animateG2Labels(chart.getContext(), labelFrames)
  labelFrames = undefined
  painting = false
  if (dirty && (timeline || appearance?.value.motion !== 'full')) finishAnimations()
  renderPending()
}

async function render(): Promise<void> {
  if (!active || !host.value || !container.value || !appearance || painting || timeline) return
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
    if (isCurrent(currentGeneration, currentRevision)) emit('rendered')
  } catch (error: unknown) {
    if (generation === currentGeneration) painting = false
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

function start(): void {
  if (active || !host.value || !metric.value || !tooltipMount.value) return
  active = true
  tooltipViewport = createG2TooltipViewport(host.value, tooltipMount.value, () => {
    chart?.emit('tooltip:hide', {})
  })
  observer = new ResizeObserver(schedule)
  observer.observe(host.value)
  observer.observe(metric.value)
  if (caption.value) observer.observe(caption.value)
  if (title.value) observer.observe(title.value)
  schedule()
}
function stop(): void {
  active = false
  generation += 1
  observer?.disconnect()
  observer = undefined
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
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
onBeforeUnmount(stop)
</script>

<template>
  <div
    ref="host"
    class="h-full min-h-0 min-w-0 w-full relative"
    role="img"
    :aria-label="label"
    :aria-busy="busy"
  >
    <div
      ref="container"
      class="inset-0 absolute"
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
