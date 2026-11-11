<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NSelect } from 'naive-ui/es/select'
import {
  UiCopyAction,
  UiChartTimeRange,
  normalizeUiChartTimeRange,
  panUiChartTimeRange,
  zoomUiChartTimeRange,
  UiG2Chart,
  UiScrollArea,
  type UiG2ChartOptions,
  type UiScrollController,
} from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import {
  chartExample,
  chartHourLabel,
  chartKindCopy,
  chartSampleHours,
  getChartGroup,
  type ChartKind,
  type ChartGroup,
} from './chart-examples'
import { useConsoleI18n } from '../../../shared/i18n'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import { useAppearanceReadBoundary } from '../../appearance/appearance-read-boundary'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly group: ChartGroup
}>()
const { t, locale } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const group = getChartGroup(props.group)
const kind = ref<ChartKind>(group.kinds[0])
const revision = ref(0)
const replay = ref(0)
const narrow = ref(false)
const showData = ref(false)
const error = ref(false)
const rendered = ref(false)
const timelineStopped = ref(false)
const active = ref(true)
const range = ref<[number, number]>([0, chartSampleHours - 1])
const committedRange = ref<[number, number]>([...range.value])
const trackingRange = ref(false)
const choices = computed(() =>
  group.kinds.map((value) => ({ value, label: t(chartKindCopy[value].title) })),
)
const example = computed(() => chartExample(kind.value, revision.value, t))
const hasCompositionLegend = computed(() => props.group === 'composition')
// Category identities survive data revisions, replays, locale changes and chart switches.
const hiddenCategories = ref<string[]>([])
const compositionData = computed(() =>
  example.value.data.filter((row) => !hiddenCategories.value.includes(row.key)),
)
const compositionColors = computed(() => {
  const roles = appearance.snapshot.value.colorPalette.roles
  return [roles.primary, roles.info, roles.success, roles.warning, roles.error].map(
    (role) => role.foreground.default,
  )
})
const compositionColorClasses = [
  'text-control-primary',
  'text-control-info',
  'text-control-success',
  'text-control-warning',
  'text-control-error',
]
const compositionTotal = computed(() =>
  compositionData.value.reduce((sum, row) => sum + row.value, 0),
)
const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 1 }),
)
function toggleCategory(key: string): void {
  if (hiddenCategories.value.includes(key))
    hiddenCategories.value = hiddenCategories.value.filter((hidden) => hidden !== key)
  else if (compositionData.value.length > 1)
    hiddenCategories.value = [...hiddenCategories.value, key]
}
const hasRange = computed(() => kind.value === 'slider' || kind.value === 'brush')
const overview = computed(() =>
  Array.from({ length: chartSampleHours }, (_, hour) =>
    example.value.data.filter((row) => row.hour === hour).reduce((sum, row) => sum + row.value, 0),
  ),
)
const visibleData = computed(() =>
  hasRange.value
    ? example.value.data.filter(
        (row) => row.hour !== undefined && row.hour >= range.value[0] && row.hour <= range.value[1],
      )
    : hasCompositionLegend.value
      ? compositionData.value
      : example.value.data,
)
const seriesCount = computed(() => new Set(visibleData.value.map((row) => row.group)).size)
const numberFormat = computed(() => new Intl.NumberFormat(locale.value))
const hourChoices = computed(() =>
  Array.from({ length: chartSampleHours }, (_, value) => ({
    value,
    label: chartHourLabel(value, t),
  })),
)
const startChoices = computed(() =>
  hourChoices.value.filter((choice) => choice.value < range.value[1]),
)
const endChoices = computed(() =>
  hourChoices.value.filter((choice) => choice.value > range.value[0]),
)
const rangePresets = computed(() => [
  { hours: 24, label: t('chartExamples.lastDay') },
  { hours: 48, label: t('chartExamples.lastTwoDays') },
  { hours: chartSampleHours, label: t('chartExamples.fullRange') },
])
function hourLabel(hour: number): string {
  return chartHourLabel(hour, t)
}
const options = computed<UiG2ChartOptions>(() => {
  const spec = example.value.options
  if (hasCompositionLegend.value)
    return {
      ...spec,
      // Retain keyed zero-weight sectors so filtering can interpolate a shared boundary.
      data: example.value.data.map((row) => ({
        ...row,
        value: hiddenCategories.value.includes(row.key) ? 0 : row.value,
      })),
      legend: false,
      scale: {
        ...spec.scale,
        color: {
          domain: example.value.data.map((row) => row.name),
          range: compositionColors.value,
        },
      },
    }
  const children =
    'children' in spec && Array.isArray(spec.children)
      ? (spec.children as UiG2ChartOptions[])
      : undefined
  if (kind.value === 'timeline' && timelineStopped.value && spec.type === 'timingKeyframe') {
    const finalFrame = children?.at(-1)
    return finalFrame ? { ...finalFrame, animate: false } : spec
  }
  if (!hasRange.value || spec.type !== 'view') return spec
  const axes = spec.axis && typeof spec.axis === 'object' ? spec.axis : {}
  const legends = spec.legend && typeof spec.legend === 'object' ? spec.legend : {}
  const selected = example.value.data.filter(
    (row) =>
      row.hour !== undefined &&
      row.hour >= committedRange.value[0] &&
      row.hour <= committedRange.value[1],
  )
  const maximum = Math.max(1, ...selected.map((row) => row.value))
  const tracking = trackingRange.value
  return {
    ...spec,
    marginBottom: 0,
    legend: {
      ...legends,
      color: {
        ...(typeof legends.color === 'object' ? legends.color : {}),
        position: 'top',
        ...(tracking ? { animate: false, navAnimate: false } : {}),
      },
    },
    interaction: {
      ...spec.interaction,
      ...(kind.value === 'slider' ? { elementHighlight: true } : {}),
      rangeEvents: { type: rangeEvents },
    },
    scale: {
      ...spec.scale,
      x: { type: 'linear', domain: [...range.value], tickCount: 5, nice: false },
      y: { domain: [0, Math.ceil(maximum / 10) * 10], nice: false },
    },
    ...(tracking
      ? {
          animate: false,
          axis: {
            ...axes,
            x: { ...(typeof axes.x === 'object' ? axes.x : {}), animate: false },
            y: { ...(typeof axes.y === 'object' ? axes.y : {}), animate: false },
          },
          children: children?.map((child) => ({ ...child, animate: false })),
        }
      : {}),
  }
})
const label = computed(
  () => `${t(chartKindCopy[kind.value].title)}. ${t(chartKindCopy[kind.value].description)}`,
)
const status = computed(() => {
  if (error.value) return t('chartExamples.renderFailed')
  if (showData.value) return t('chartExamples.dataView')
  if (trackingRange.value) return t('chartExamples.trackingRange')
  return rendered.value ? t('chartExamples.ready') : t('chartExamples.rendering')
})
const copyValue = computed(() =>
  [
    t('chartExamples.copyRequest'),
    props.title,
    label.value,
    'UiG2Chart: options (G2Spec), label; rendered / error.',
    'packages/ui/src/components/g2-chart-guide.md',
    'apps/web/src/app/workbench/charts/chart-examples.ts',
    JSON.stringify(options.value, null, 2),
  ].join('\n\n'),
)
function selectKind(value: string): void {
  if (group.kinds.some((candidate) => candidate === value)) kind.value = value as ChartKind
}
function update(): void {
  revision.value += 1
  timelineStopped.value = false
  error.value = false
}
function restart(): void {
  replay.value += 1
  timelineStopped.value = false
  rendered.value = false
  error.value = false
}
function updateRange(value: number | number[]): void {
  if (!Array.isArray(value) || value.length !== 2) return
  const start = value[0]
  const end = value[1]
  if (start === undefined || end === undefined || end <= start) return
  range.value = normalizeUiChartTimeRange([start, end], 0, chartSampleHours - 1)
  if (!trackingRange.value) committedRange.value = [...range.value]
}
interface PlotArea {
  getBoundingClientRect(): { left: number; top: number; width: number; height: number }
}
let plotArea: PlotArea | null = null
let brushing = false
// Native brush highlighting emits a domain but never updates the chart internally.
// This subscription keeps the overview, exact inputs and plot on one range owner.
function rangeEvents() {
  return (
    target: { container: { querySelector(selector: string): PlotArea | null } },
    _views: unknown,
    emitter?: {
      on(name: string, listener: (event: unknown) => void): unknown
      off(name: string, listener: (event: unknown) => void): unknown
    },
  ) => {
    // G2 owns the measured plot rectangle, including responsive axis/legend layout.
    // Read its live client bounds for each event instead of estimating canvas padding.
    const plot = target.container.querySelector('.plot')
    plotArea = plot
    function brushStart(): void {
      // Do not rerender midway through a native brush gesture.
      clearWheel()
      brushing = true
    }
    function brushEnd(event: unknown): void {
      clearWheel()
      brushing = false
      commitRange()
      if (!event || typeof event !== 'object' || !('data' in event)) return
      const data: unknown = event.data
      if (!data || typeof data !== 'object' || !('selection' in data)) return
      const selection: unknown = data.selection
      if (!Array.isArray(selection) || !Array.isArray(selection[0])) return
      const [start, end] = selection[0] as unknown[]
      if (typeof start !== 'number' || typeof end !== 'number') return
      if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return
      trackingRange.value = false
      updateRange([Math.min(start, end), Math.max(start, end)])
    }
    function reset(): void {
      chooseRange(chartSampleHours)
    }
    emitter?.on('brush:start', brushStart)
    emitter?.on('brush:end', brushEnd)
    emitter?.on('plot:dblclick', reset)
    return () => {
      if (plotArea === plot) plotArea = null
      brushing = false
      emitter?.off('brush:start', brushStart)
      emitter?.off('brush:end', brushEnd)
      emitter?.off('plot:dblclick', reset)
    }
  }
}
let wheelTimer: ReturnType<typeof setTimeout> | undefined
let wheelRange: [number, number] | undefined
let wheelDelta = 0
let wheelPan = false
let wheelAnchor = 0
function clearWheel(): void {
  if (wheelTimer !== undefined) clearTimeout(wheelTimer)
  wheelTimer = undefined
  wheelRange = undefined
  wheelDelta = 0
}
function stopWheel(): void {
  clearWheel()
  commitRange()
}
function beginRange(): void {
  stopWheel()
  trackingRange.value = true
}
function plotWheel(event: WheelEvent): void {
  if (!hasRange.value || event.ctrlKey || event.metaKey) return
  if (brushing) {
    event.preventDefault()
    return
  }
  const host = event.currentTarget
  if (!(host instanceof HTMLElement)) return
  if (!event.altKey && !host.contains(document.activeElement)) return
  const bounds = plotArea?.getBoundingClientRect()
  if (
    !bounds ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    event.clientX < bounds.left ||
    event.clientX > bounds.left + bounds.width ||
    event.clientY < bounds.top ||
    event.clientY > bounds.top + bounds.height
  )
    return
  const anchor = (event.clientX - bounds.left) / bounds.width
  const raw = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
  if (!raw) return
  event.preventDefault()
  if (wheelRange && wheelPan !== event.shiftKey) stopWheel()
  // A moving pointer starts from the range currently under it, not the earlier
  // pointer's datum. Keep subpixel wheel deltas cumulative while the anchor is still.
  if (
    wheelRange &&
    ((!wheelPan && wheelAnchor !== anchor) ||
      (wheelDelta !== 0 && Math.sign(raw) !== Math.sign(wheelDelta)))
  )
    clearWheel()
  if (!wheelRange) {
    wheelRange = [...range.value]
    wheelPan = event.shiftKey
    wheelAnchor = anchor
    trackingRange.value = true
  }
  wheelDelta += raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientHeight : 1)
  updateRange(
    wheelPan
      ? panUiChartTimeRange(
          wheelRange,
          (wheelDelta / bounds.width) * (chartSampleHours - 1),
          0,
          chartSampleHours - 1,
        )
      : zoomUiChartTimeRange(
          wheelRange,
          Math.exp(Math.max(-6, Math.min(6, wheelDelta / 240))),
          wheelAnchor,
          0,
          chartSampleHours - 1,
        ),
  )
  if (wheelTimer !== undefined) clearTimeout(wheelTimer)
  wheelTimer = setTimeout(stopWheel, 160)
}
function focusPlot(event: PointerEvent): void {
  if (hasRange.value && event.currentTarget instanceof HTMLElement)
    event.currentTarget.focus({ preventScroll: true })
}
function selectStart(value: number): void {
  stopWheel()
  updateRange([value, range.value[1]])
}
function selectEnd(value: number): void {
  stopWheel()
  updateRange([range.value[0], value])
}
function commitRange(): void {
  committedRange.value = [...range.value]
  trackingRange.value = false
}
function chooseRange(hours: number): void {
  stopWheel()
  updateRange([chartSampleHours - hours, chartSampleHours - 1])
}
function isRangeSelected(hours: number): boolean {
  return range.value[0] === chartSampleHours - hours && range.value[1] === chartSampleHours - 1
}
watch(options, () => {
  rendered.value = false
})
watch(kind, () => {
  stopWheel()
  revision.value = 0
  timelineStopped.value = false
  trackingRange.value = false
  range.value = [0, chartSampleHours - 1]
  committedRange.value = [...range.value]
  error.value = false
})
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Chart examples require the Router Scroll Controller port.')
let unregister: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  unregister?.()
  unregister = undefined
  if (controller && active.value) unregister = register?.(controller)
}
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  stopWheel()
  connect(null)
})
onScopeDispose(() => {
  stopWheel()
  connect(null)
})
</script>
<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
    class="wb-form-page mx-auto w-full"
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <section
      class="rounded-panel flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
      data-chart-workbench="true"
      :aria-label="title"
    >
      <div
        class="wb-form-panel-header flex shrink-0 flex-wrap min-w-0 items-center justify-between gap-content-gap"
      >
        <div class="wb-chart-picker min-w-0">
          <NSelect
            :value="kind"
            :options="choices"
            :aria-label="t('chartExamples.kind')"
            @update:value="selectKind"
          />
        </div>
        <div class="flex flex-wrap gap-component-unit">
          <NButton
            secondary
            :aria-pressed="narrow"
            @click="narrow = !narrow"
          >
            {{ t('chartExamples.narrow') }}
          </NButton>
          <NButton
            secondary
            :aria-pressed="showData"
            @click="showData = !showData"
          >
            {{ showData ? t('chartExamples.showChart') : t('chartExamples.showData') }}
          </NButton>
        </div>
      </div>
      <UiScrollArea
        owner-id="architecture-console-content"
        :enabled="active"
        class="flex-1 min-h-0"
        @controller="connect"
      >
        <div
          class="flex shrink-0 flex-wrap min-w-0 items-start justify-between gap-content-gap px-page-inline"
        >
          <div class="grid min-w-0 gap-component-unit">
            <h2 class="font-title-weight m-0 text-subheading text-text-primary">
              {{ t(chartKindCopy[kind].title) }}
            </h2>
            <p class="m-0 text-pretty text-caption text-text-secondary">
              {{ t(chartKindCopy[kind].description) }}
            </p>
          </div>
          <dl class="m-0 flex shrink-0 flex-wrap gap-content-gap">
            <div class="grid gap-component-unit">
              <dt class="text-caption text-text-secondary">
                {{ t('chartExamples.sampleData') }}
              </dt>
              <dd class="font-title-weight m-0 tabular-nums text-subheading text-text-primary">
                {{ numberFormat.format(visibleData.length) }}
              </dd>
            </div>
            <div class="grid gap-component-unit">
              <dt class="text-caption text-text-secondary">
                {{ t('chartExamples.series') }}
              </dt>
              <dd class="font-title-weight m-0 tabular-nums text-subheading text-text-primary">
                {{ numberFormat.format(seriesCount) }}
              </dd>
            </div>
          </dl>
        </div>
        <div
          v-if="showData"
          class="wb-form-panel-header min-w-0"
        >
          <dl class="m-0 grid gap-component-unit">
            <div
              v-for="row in visibleData"
              :key="row.key"
              class="min-h-control rounded-control flex flex-wrap items-center justify-between bg-surface-page gap-content-gap px-button-inline"
            >
              <dt
                class="text-body text-text-secondary"
                v-text="row.name === row.group ? row.name : `${row.name} · ${row.group}`"
              />
              <dd class="m-0 tabular-nums text-body text-text-primary">
                {{
                  kind === 'distribution' || kind === 'scatter'
                    ? `${t('chartExamples.investment')} ${String(row.amount)} · ${t('chartExamples.return')} ${String(row.value)} · ${t('chartExamples.sampleSize')} ${String(row.size)}`
                    : numberFormat.format(row.value)
                }}
              </dd>
            </div>
          </dl>
        </div>
        <div
          v-else
          class="wb-chart-stage mx-auto flex grow flex-col min-w-0 w-full layout-narrow:px-page-inline"
          :data-narrow="narrow"
          :tabindex="hasRange ? 0 : undefined"
          :aria-label="hasRange ? t('chartExamples.plotRangeHint') : undefined"
          @wheel="plotWheel"
          @pointerdown="focusPlot"
        >
          <div
            v-if="error"
            role="alert"
            class="flex flex-1 flex-col items-center justify-center gap-content-gap px-page-inline"
          >
            <p class="m-0 text-body text-text-secondary">
              {{ t('chartExamples.error') }}
            </p>
            <NButton @click="restart">
              {{ t('chartExamples.retry') }}
            </NButton>
          </div>
          <UiG2Chart
            v-else
            :key="`${kind}-${String(replay)}-${String(timelineStopped)}`"
            :options="options"
            :label="label"
            @rendered="rendered = true"
            @error="error = true"
          />
        </div>
        <div
          v-if="hasCompositionLegend"
          class="wb-form-panel-header flex flex-wrap min-w-0 items-center justify-center gap-component-unit"
          role="group"
          :aria-label="t('chartExamples.series')"
          data-composition-legend
        >
          <NButton
            v-for="(row, index) in example.data"
            :key="row.key"
            :secondary="!hiddenCategories.includes(row.key)"
            :quaternary="hiddenCategories.includes(row.key)"
            :aria-pressed="!hiddenCategories.includes(row.key)"
            :disabled="!hiddenCategories.includes(row.key) && compositionData.length === 1"
            @click="toggleCategory(row.key)"
          >
            <span class="inline-flex items-center gap-component-unit">
              <span
                class="i-lucide-circle-dot shrink-0 text-caption"
                :class="compositionColorClasses[index]"
                aria-hidden="true"
              />
              <span>{{ row.name }}</span>
              <span class="tabular-nums text-caption text-text-secondary">
                {{
                  hiddenCategories.includes(row.key)
                    ? percentFormat.format(0)
                    : percentFormat.format(row.value / compositionTotal)
                }}
              </span>
            </span>
          </NButton>
        </div>
        <div
          v-if="hasRange"
          class="wb-chart-range shrink-0 grid min-w-0 gap-content-gap"
          role="group"
          :aria-label="t('chartExamples.timeRange')"
        >
          <UiChartTimeRange
            :value="range"
            :min="0"
            :max="chartSampleHours - 1"
            :overview="overview"
            :format-value="hourLabel"
            :label="t('chartExamples.timeRange')"
            :start-label="t('chartExamples.rangeStart')"
            :end-label="t('chartExamples.rangeEnd')"
            :help-text="t('chartExamples.rangeHint')"
            @update:value="updateRange"
            @start="beginRange"
            @end="commitRange"
          />
          <div class="flex flex-wrap min-w-0 items-end justify-between gap-content-gap">
            <div class="wb-chart-range-fields grid min-w-0 gap-content-gap">
              <div class="grid grid-cols-1 min-w-0 gap-component-unit">
                <span
                  class="text-caption text-text-secondary"
                  v-text="t('chartExamples.rangeStart')"
                />
                <NSelect
                  :value="range[0]"
                  :options="startChoices"
                  :aria-label="t('chartExamples.rangeStart')"
                  @update:value="selectStart"
                />
              </div>
              <div class="grid grid-cols-1 min-w-0 gap-component-unit">
                <span
                  class="text-caption text-text-secondary"
                  v-text="t('chartExamples.rangeEnd')"
                />
                <NSelect
                  :value="range[1]"
                  :options="endChoices"
                  :aria-label="t('chartExamples.rangeEnd')"
                  @update:value="selectEnd"
                />
              </div>
            </div>
            <div class="flex flex-wrap items-end gap-component-unit">
              <NButton
                v-for="preset in rangePresets"
                :key="preset.hours"
                size="small"
                :type="isRangeSelected(preset.hours) ? 'primary' : 'default'"
                :secondary="isRangeSelected(preset.hours)"
                :aria-pressed="isRangeSelected(preset.hours)"
                @click="chooseRange(preset.hours)"
              >
                {{ preset.label }}
              </NButton>
            </div>
          </div>
        </div>
      </UiScrollArea>
      <footer
        class="wb-form-panel-header flex shrink-0 flex-wrap items-center justify-between gap-content-gap"
      >
        <div class="grid min-w-0 gap-component-unit">
          <span
            class="text-caption text-text-secondary"
            v-text="
              `${t('chartExamples.sampleData')} · ${t('chartExamples.revision')} ${numberFormat.format(revision + 1)}`
            "
          />
          <span
            role="status"
            class="text-caption text-text-secondary"
            v-text="status"
          />
        </div>
        <div class="flex flex-wrap gap-component-unit">
          <NButton
            v-if="kind === 'timeline'"
            :disabled="showData || timelineStopped"
            @click="timelineStopped = true"
          >
            {{ t('chartExamples.stopTimeline') }}
          </NButton>
          <NButton
            :disabled="showData"
            @click="restart"
          >
            {{ t('chartExamples.replay') }}
          </NButton>
          <NButton
            type="primary"
            @click="update"
          >
            {{ t('chartExamples.update') }}
          </NButton>
        </div>
      </footer>
    </section>
  </WorkbenchPage>
</template>
