<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onScopeDispose, ref, useId } from 'vue'
import {
  normalizeUiChartTimeRange,
  panUiChartTimeRange,
  zoomUiChartTimeRange,
  type UiChartTimeRangeValue,
} from './chart-time-range'

defineOptions({ name: 'UiChartTimeRange' })

const props = defineProps<{
  readonly value: UiChartTimeRangeValue
  readonly min: number
  readonly max: number
  readonly overview: readonly number[]
  readonly formatValue: (value: number) => string
  readonly label: string
  readonly startLabel: string
  readonly endLabel: string
  readonly helpText: string
}>()
const emit = defineEmits<{
  'update:value': [value: [number, number]]
  start: []
  end: []
}>()

const id = useId()
const root = ref<HTMLDivElement>()
const svg = ref<SVGSVGElement>()
const width = ref(1)
const height = ref(1)
const dragging = ref(false)
const range = computed(() => normalizeUiChartTimeRange(props.value, props.min, props.max))
// Keep a full-height pointer target around the slimmer visible track and grips.
const handleWidth = computed(() => (height.value * 3) / 4)
const handleSurfaceWidth = computed(() => handleWidth.value / 3)
const inset = computed(() => handleWidth.value + height.value / 16)
const trackWidth = computed(() => Math.max(1, width.value - inset.value * 2))
const top = computed(() => height.value / 6)
const trackHeight = computed(() => (height.value * 2) / 3)
const bottom = computed(() => top.value + trackHeight.value)
const radius = computed(() => height.value / 16)
const position = (value: number): number =>
  inset.value + ((value - props.min) / (props.max - props.min)) * trackWidth.value
const startX = computed(() => position(range.value[0]))
const endX = computed(() => position(range.value[1]))
const trend = computed(() => {
  const values = props.overview.map((value) => (Number.isFinite(value) ? value : 0))
  if (values.length === 0) return ''
  const minimum = Math.min(0, ...values)
  const maximum = Math.max(1, ...values)
  return values
    .map((value, index) => {
      const x = inset.value + (index / Math.max(1, values.length - 1)) * trackWidth.value
      const y = bottom.value - ((value - minimum) / (maximum - minimum)) * trackHeight.value * 0.8
      return `${index === 0 ? 'M' : 'L'}${String(x)},${String(y)}`
    })
    .join(' ')
})
const area = computed(() =>
  trend.value
    ? `${trend.value} L${String(inset.value + trackWidth.value)},${String(bottom.value)} L${String(inset.value)},${String(bottom.value)} Z`
    : '',
)
const handles = computed(() => [
  {
    mode: 'start' as const,
    value: range.value[0],
    x: startX.value - handleWidth.value,
    surfaceX: startX.value - handleSurfaceWidth.value,
    label: props.startLabel,
    min: props.min,
    max: range.value[1] - 1,
  },
  {
    mode: 'end' as const,
    value: range.value[1],
    x: endX.value,
    surfaceX: endX.value,
    label: props.endLabel,
    min: range.value[0] + 1,
    max: props.max,
  },
])

type PointerMode = 'start' | 'end' | 'pan' | 'overview'
interface PointerSession {
  readonly id: number
  readonly mode: PointerMode
  readonly initial: UiChartTimeRangeValue
  readonly start: number
}
interface WheelSession {
  readonly origin: UiChartTimeRangeValue
  initial: UiChartTimeRangeValue
  readonly pan: boolean
  anchor: number
  clientX: number
  delta: number
}
let pointer: PointerSession | undefined
let wheel: WheelSession | undefined
let wheelTimer: ReturnType<typeof setTimeout> | undefined
let observer: ResizeObserver | undefined
let connected = false

function publish(value: UiChartTimeRangeValue): void {
  const next = normalizeUiChartTimeRange(value, props.min, props.max)
  if (next[0] !== range.value[0] || next[1] !== range.value[1]) emit('update:value', next)
}
function valueAt(clientX: number): number {
  const bounds = svg.value?.getBoundingClientRect()
  if (!bounds) return props.min
  const x = ((clientX - bounds.left) / Math.max(1, bounds.width)) * width.value
  return props.min + ((x - inset.value) / trackWidth.value) * (props.max - props.min)
}
function finishWheel(cancel = false): void {
  if (wheelTimer !== undefined) clearTimeout(wheelTimer)
  wheelTimer = undefined
  if (!wheel) return
  const initial = wheel.origin
  wheel = undefined
  if (cancel) publish(initial)
  emit('end')
}
function beginPointer(event: PointerEvent, mode: PointerMode): void {
  if (!event.isPrimary || event.button !== 0 || pointer || !svg.value) return
  event.preventDefault()
  event.stopPropagation()
  finishWheel()
  const target = event.currentTarget
  if (target instanceof SVGElement && target.getAttribute('role') === 'slider') {
    target.focus({ preventScroll: true })
  } else {
    svg.value.focus({ preventScroll: true })
  }
  pointer = { id: event.pointerId, mode, initial: [...range.value], start: valueAt(event.clientX) }
  dragging.value = mode !== 'overview'
  svg.value.setPointerCapture(event.pointerId)
  emit('start')
}
function movePointer(event: PointerEvent): void {
  if (pointer?.id !== event.pointerId || pointer.mode === 'overview') return
  const delta = valueAt(event.clientX) - pointer.start
  const [start, end] = pointer.initial
  if (pointer.mode === 'pan') {
    publish(panUiChartTimeRange(pointer.initial, delta, props.min, props.max))
  } else if (pointer.mode === 'start') {
    publish([Math.min(end - 1, start + delta), end])
  } else {
    publish([start, Math.max(start + 1, end + delta)])
  }
}
function finishPointer(cancel = false): void {
  if (!pointer) return
  const session = pointer
  pointer = undefined
  dragging.value = false
  if (svg.value?.hasPointerCapture(session.id)) svg.value.releasePointerCapture(session.id)
  if (cancel) publish(session.initial)
  emit('end')
}
function releasePointer(event: PointerEvent): void {
  if (pointer?.id !== event.pointerId) return
  if (pointer.mode === 'overview') {
    const span = pointer.initial[1] - pointer.initial[0]
    publish(
      panUiChartTimeRange(
        pointer.initial,
        valueAt(event.clientX) - span / 2 - pointer.initial[0],
        props.min,
        props.max,
      ),
    )
  }
  finishPointer()
}
function cancelPointer(event: PointerEvent): void {
  if (pointer?.id === event.pointerId) finishPointer(true)
}
function onWheel(event: WheelEvent): void {
  if (event.ctrlKey || event.metaKey || pointer) return
  if (!event.altKey && !root.value?.contains(document.activeElement)) return
  const raw = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
  if (raw === 0) return
  event.preventDefault()
  event.stopPropagation()
  if (wheel && wheel.pan !== event.shiftKey) finishWheel()
  if (!wheel) {
    wheel = {
      origin: [...range.value],
      initial: [...range.value],
      pan: event.shiftKey,
      anchor: (valueAt(event.clientX) - range.value[0]) / (range.value[1] - range.value[0]),
      clientX: event.clientX,
      delta: 0,
    }
    emit('start')
  }
  if (
    (wheel.delta !== 0 && Math.sign(raw) !== Math.sign(wheel.delta)) ||
    (!wheel.pan && Math.abs(event.clientX - wheel.clientX) > 0.5)
  ) {
    // Reversals discard saturated deltas; a moving pointer gets a fresh local anchor.
    // Keep the gesture origin unchanged so Escape still restores the original range.
    wheel.initial = [...range.value]
    wheel.anchor = (valueAt(event.clientX) - range.value[0]) / (range.value[1] - range.value[0])
    wheel.clientX = event.clientX
    wheel.delta = 0
  }
  const unit =
    event.deltaMode === 1 ? height.value / 2 : event.deltaMode === 2 ? trackWidth.value : 1
  wheel.delta += raw * unit
  publish(
    wheel.pan
      ? panUiChartTimeRange(
          wheel.initial,
          (wheel.delta / trackWidth.value) * (props.max - props.min),
          props.min,
          props.max,
        )
      : zoomUiChartTimeRange(
          wheel.initial,
          Math.exp(Math.max(-6, Math.min(6, wheel.delta / 240))),
          wheel.anchor,
          props.min,
          props.max,
        ),
  )
  if (wheelTimer !== undefined) clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => {
    finishWheel()
  }, 160)
}
function onKey(event: KeyboardEvent, mode: 'start' | 'end' | 'pan'): void {
  if (event.ctrlKey || event.metaKey || event.altKey || pointer) return
  const [start, end] = range.value
  const page = Math.max(1, Math.round((props.max - props.min) / 10))
  const delta =
    event.key === 'ArrowRight' || event.key === 'ArrowUp'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -1
        : event.key === 'PageUp'
          ? page
          : event.key === 'PageDown'
            ? -page
            : undefined
  let next: UiChartTimeRangeValue
  if (delta !== undefined) {
    next =
      mode === 'pan'
        ? panUiChartTimeRange(range.value, delta, props.min, props.max)
        : mode === 'start'
          ? [Math.min(end - 1, start + delta), end]
          : [start, Math.max(start + 1, end + delta)]
  } else if (event.key === 'Home') {
    next =
      mode === 'pan'
        ? panUiChartTimeRange(range.value, props.min - start, props.min, props.max)
        : mode === 'start'
          ? [props.min, end]
          : [start, start + 1]
  } else if (event.key === 'End') {
    next =
      mode === 'pan'
        ? panUiChartTimeRange(range.value, props.max - end, props.min, props.max)
        : mode === 'start'
          ? [end - 1, end]
          : [start, props.max]
  } else return
  event.preventDefault()
  event.stopPropagation()
  finishWheel()
  publish(next)
}
function onEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || (!pointer && !wheel)) return
  event.preventDefault()
  event.stopPropagation()
  finishPointer(true)
  finishWheel(true)
}
function onRootKey(event: KeyboardEvent): void {
  onEscape(event)
  if (event.target === svg.value) onKey(event, 'pan')
}
function onFocusOut(event: FocusEvent): void {
  if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget))
    finishWheel()
}
function connect(): void {
  if (connected || !root.value || !svg.value) return
  connected = true
  observer = new ResizeObserver(([entry]) => {
    if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return
    width.value = entry.contentRect.width
    height.value = entry.contentRect.height
  })
  observer.observe(svg.value)
  root.value.addEventListener('wheel', onWheel, { passive: false })
  root.value.addEventListener('keydown', onRootKey)
}
function disconnect(): void {
  finishPointer()
  finishWheel()
  observer?.disconnect()
  observer = undefined
  root.value?.removeEventListener('wheel', onWheel)
  root.value?.removeEventListener('keydown', onRootKey)
  connected = false
}
onMounted(connect)
onActivated(connect)
onDeactivated(disconnect)
onScopeDispose(disconnect)
</script>

<template>
  <div
    ref="root"
    class="pavp-chart-time-range grid min-w-0 gap-component-unit"
    :data-dragging="dragging"
    @focusout="onFocusOut"
  >
    <svg
      ref="svg"
      class="pavp-chart-time-range-track rounded-control w-full"
      :viewBox="`0 0 ${String(width)} ${String(height)}`"
      role="group"
      tabindex="0"
      :aria-label="label"
      :aria-describedby="`${id}-help`"
      @pointerdown="beginPointer($event, 'overview')"
      @pointermove="movePointer"
      @pointerup="releasePointer"
      @pointercancel="cancelPointer"
      @lostpointercapture="cancelPointer"
    >
      <defs>
        <clipPath :id="`${id}-selection`">
          <rect
            class="pavp-chart-time-range-geometry"
            :x="startX"
            :y="top"
            :width="endX - startX"
            :height="trackHeight"
          />
        </clipPath>
      </defs>
      <rect
        class="pavp-chart-time-range-backdrop"
        :x="inset"
        :y="top"
        :width="trackWidth"
        :height="trackHeight"
        :rx="radius"
      />
      <path
        class="pavp-chart-time-range-area"
        :d="area"
      />
      <path
        class="pavp-chart-time-range-trend"
        :d="trend"
      />
      <g
        :clip-path="`url(#${id}-selection)`"
        aria-hidden="true"
      >
        <rect
          class="pavp-chart-time-range-selected"
          :x="inset"
          :y="top"
          :width="trackWidth"
          :height="trackHeight"
        />
        <path
          class="pavp-chart-time-range-selected-area"
          :d="area"
        />
        <path
          class="pavp-chart-time-range-selected-trend"
          :d="trend"
        />
      </g>
      <rect
        class="pavp-chart-time-range-window pavp-chart-time-range-geometry"
        :x="startX"
        :y="top"
        :width="endX - startX"
        :height="trackHeight"
        aria-hidden="true"
      />
      <rect
        class="pavp-chart-time-range-pan pavp-chart-time-range-geometry"
        :x="startX"
        :y="0"
        :width="endX - startX"
        :height="height"
        aria-hidden="true"
        @pointerdown="beginPointer($event, 'pan')"
      />
      <g
        v-for="handle in handles"
        :key="handle.mode"
        class="pavp-chart-time-range-handle"
        role="slider"
        tabindex="0"
        aria-orientation="horizontal"
        :aria-label="handle.label"
        :aria-valuemin="handle.min"
        :aria-valuemax="handle.max"
        :aria-valuenow="handle.value"
        :aria-valuetext="formatValue(handle.value)"
        :aria-describedby="`${id}-help`"
        @pointerdown="beginPointer($event, handle.mode)"
        @keydown="onKey($event, handle.mode)"
      >
        <rect
          class="pavp-chart-time-range-hit pavp-chart-time-range-geometry"
          :x="handle.x"
          :y="0"
          :width="handleWidth"
          :height="height"
        />
        <rect
          class="pavp-chart-time-range-handle-surface pavp-chart-time-range-geometry"
          :x="handle.surfaceX + radius / 4"
          :y="top + radius / 4"
          :width="handleSurfaceWidth - radius / 2"
          :height="trackHeight - radius / 2"
          :rx="radius"
        />
        <rect
          v-for="offset in [0.3, 0.6]"
          :key="offset"
          class="pavp-chart-time-range-grip pavp-chart-time-range-geometry"
          :x="handle.surfaceX + handleSurfaceWidth * offset"
          :y="top + trackHeight / 3"
          :height="trackHeight / 3"
        />
      </g>
    </svg>
    <div class="flex flex-wrap items-baseline justify-between gap-component-unit">
      <span class="text-caption text-text-secondary">{{ label }}</span>
      <span
        class="tabular-nums text-caption text-text-primary"
        v-text="`${formatValue(range[0])} → ${formatValue(range[1])}`"
      />
    </div>
    <p
      :id="`${id}-help`"
      class="m-0 text-pretty text-caption text-text-secondary"
    >
      {{ helpText }}
    </p>
  </div>
</template>

<style scoped>
@layer components {
  .pavp-chart-time-range-track {
    display: block;
    block-size: var(--ui-control-height);
    overflow: visible;
    touch-action: none;
    user-select: none;
    cursor: crosshair;
  }
  .pavp-chart-time-range-track:focus-visible {
    outline: var(--ui-border-width) solid var(--ui-color-focus-ring);
    outline-offset: var(--ui-space-component-unit);
  }
  .pavp-chart-time-range-backdrop {
    fill: var(--ui-color-surface-page);
    stroke: var(--ui-color-border-default);
    stroke-width: var(--ui-border-width);
  }
  .pavp-chart-time-range-area {
    fill: var(--ui-color-text-secondary);
    fill-opacity: 0.12;
  }
  .pavp-chart-time-range-trend {
    fill: none;
    stroke: var(--ui-color-text-secondary);
    stroke-width: var(--ui-border-width);
  }
  .pavp-chart-time-range-selected {
    fill: var(--ui-color-control-primary);
    fill-opacity: 0.08;
  }
  .pavp-chart-time-range-selected-area {
    fill: var(--ui-color-control-primary);
    fill-opacity: 0.2;
  }
  .pavp-chart-time-range-selected-trend {
    fill: none;
    stroke: var(--ui-color-control-primary);
    stroke-width: calc(var(--ui-border-width) * 2);
  }
  .pavp-chart-time-range-window {
    fill: transparent;
    stroke: var(--ui-color-control-primary);
    stroke-width: var(--ui-border-width);
  }
  .pavp-chart-time-range-pan {
    fill: transparent;
    cursor: grab;
  }
  .pavp-chart-time-range[data-dragging='true'] .pavp-chart-time-range-pan {
    cursor: grabbing;
  }
  .pavp-chart-time-range-handle {
    cursor: ew-resize;
    outline: none;
  }
  .pavp-chart-time-range-hit {
    fill: transparent;
  }
  .pavp-chart-time-range-handle-surface {
    fill: var(--ui-color-surface-panel);
    stroke: var(--ui-color-control-primary);
    stroke-width: var(--ui-border-width);
  }
  .pavp-chart-time-range-handle:hover .pavp-chart-time-range-handle-surface,
  .pavp-chart-time-range-handle:focus-visible .pavp-chart-time-range-handle-surface {
    stroke: var(--ui-color-focus-ring);
    stroke-width: calc(var(--ui-border-width) * 2);
  }
  .pavp-chart-time-range-grip {
    fill: var(--ui-color-control-primary);
    width: var(--ui-border-width);
    pointer-events: none;
  }
  .pavp-chart-time-range-geometry {
    transition-property: x, width;
    transition-duration: calc(var(--ui-motion-duration) * 2);
    transition-timing-function: var(--ui-motion-easing);
  }
  html[data-motion='reduced'] .pavp-chart-time-range-geometry,
  html[data-motion='none'] .pavp-chart-time-range-geometry,
  .pavp-chart-time-range[data-dragging='true'] .pavp-chart-time-range-geometry {
    transition: none;
  }
}
</style>
