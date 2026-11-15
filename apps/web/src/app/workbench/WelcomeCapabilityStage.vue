<script setup lang="ts">
import { computed, ref, shallowRef, type ButtonHTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NTag } from 'naive-ui/es/tag'
import type { UiG2ChartOptions } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import type WelcomeInteractiveChart from './WelcomeInteractiveChart.vue'

defineOptions({ name: 'WelcomeCapabilityStage' })
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const generation = ref(0)
const hours = ref<24 | 48>(24)
const selected = ref<Signal | null>(null)
const failed = ref(false)
const interactiveChart = shallowRef<typeof WelcomeInteractiveChart>()
const interactiveReady = ref(false)
let loadingChart = false
const signals = ['compute', 'render', 'interaction'] as const
type Signal = (typeof signals)[number]
const ranges = [24, 48] as const
const names = computed(() => ({
  compute: t('welcomeArt.seriesCompute'),
  render: t('welcomeArt.seriesRender'),
  interaction: t('welcomeArt.seriesInteraction'),
}))
const colors = computed(() => {
  const palette = appearance.snapshot.value.colorPalette.dataViz.categorical
  return [palette.series1, palette.series2, palette.series3] as const
})
const dots: Record<Signal, string> = {
  compute: 'bg-data-viz-categorical-series-1',
  render: 'bg-data-viz-categorical-series-2',
  interaction: 'bg-data-viz-categorical-series-3',
}
// Deterministic illustrative signals, not a claim about measured platform performance.
const samples = computed(() =>
  signals.flatMap((signal, series) =>
    Array.from({ length: 48 }, (_, hour) => ({
      id: `${signal}-${String(hour)}`,
      hour,
      signal,
      name: names.value[signal],
      value: Math.round(
        35 +
          series * 14 +
          hour * 0.45 +
          Math.sin(hour * 0.28 + series * 1.8 + generation.value * 0.5) * 17 +
          Math.cos(hour * 0.65 + series + generation.value * 0.3) * 5,
      ),
    })),
  ),
)
const visible = computed(() => samples.value.filter((row) => row.hour < hours.value))
const visibleSignals = computed(() =>
  visible.value.filter((row) => selected.value === null || row.signal === selected.value),
)
// Logical coordinates only. The chart viewport and colors remain owned by PAVP tokens.
const preview = { width: 480, height: 240, left: 20, right: 460, top: 16, bottom: 222 }
const maxSignalValue = 110
const previewLines = computed(() =>
  signals.flatMap((signal, index) => {
    const rows = visibleSignals.value.filter((row) => row.signal === signal)
    if (rows.length === 0) return []
    const points = rows.map(({ hour, value }) => {
      const x = preview.left + (hour / (hours.value - 1)) * (preview.right - preview.left)
      const y = preview.bottom - (value / maxSignalValue) * (preview.bottom - preview.top)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return [
      {
        signal,
        color: colors.value[index],
        line: points.join(' '),
        area: [
          [preview.left, preview.bottom].join(','),
          ...points,
          [preview.right, preview.bottom].join(','),
        ].join(' '),
      },
    ]
  }),
)
const chart = computed((): UiG2ChartOptions => ({
  type: 'view',
  data: visibleSignals.value,
  legend: false,
  scale: {
    x: { type: 'linear', domain: [0, hours.value - 1], tickCount: 5 },
    y: { domain: [0, maxSignalValue], tickCount: 4 },
    color: { domain: signals.map((signal) => names.value[signal]), range: colors.value },
  },
  axis: {
    x: {
      title: false,
      grid: false,
      labelFormatter: (value: number) => `${String(Math.round(value))}h`,
    },
    y: { title: false, grid: true },
  },
  interaction: { tooltip: { series: true } },
  children: [
    {
      type: 'area',
      encode: { x: 'hour', y: 'value', color: 'name', key: 'id' },
      style: { shape: 'smooth', fillOpacity: 0.1 },
      tooltip: false,
    },
    {
      type: 'line',
      encode: { x: 'hour', y: 'value', color: 'name', key: 'id' },
      style: { shape: 'smooth', lineWidth: 3 },
      tooltip: { title: 'hour', items: ['value'] },
    },
  ],
}))
const metrics = computed(() =>
  signals.map((signal) => ({
    signal,
    name: names.value[signal],
    value:
      visible.value.find((row) => row.signal === signal && row.hour === hours.value - 1)?.value ??
      0,
  })),
)
function select(signal: Signal): void {
  selected.value = selected.value === signal ? null : signal
  void loadChart()
}
function update(): void {
  failed.value = false
  generation.value += 1
  void loadChart()
}
function setRange(range: (typeof ranges)[number]): void {
  hours.value = range
  void loadChart()
}
function chartFailed(): void {
  failed.value = true
  interactiveReady.value = false
}
function chartRendered(): void {
  failed.value = false
  interactiveReady.value = true
}
async function loadChart(): Promise<void> {
  if (interactiveChart.value || loadingChart) return
  loadingChart = true
  failed.value = false
  try {
    interactiveChart.value = (await import('./WelcomeInteractiveChart.vue')).default
  } catch {
    chartFailed()
  } finally {
    loadingChart = false
  }
}
</script>

<template>
  <section
    class="wb-home-preview rounded-panel grid shadow-panel text-text-primary"
    :aria-label="t('welcomeArt.signalLabel')"
  >
    <div class="flex flex-wrap min-w-0 items-center justify-between gap-component-unit">
      <div class="flex min-w-0 items-center gap-component-unit">
        <span
          class="i-lucide-chart-no-axes-combined text-text-primary"
          aria-hidden="true"
        />
        <strong class="text-subheading">{{ t('welcomeArt.signalTitle') }}</strong>
        <NTag
          size="small"
          :bordered="false"
        >
          {{ t('welcomeArt.sample') }}
        </NTag>
      </div>
      <div class="flex flex-wrap items-center gap-component-unit">
        <NButton
          v-for="range in ranges"
          :key="range"
          size="small"
          secondary
          :type="hours === range ? 'primary' : 'default'"
          v-bind="{ 'aria-pressed': hours === range } satisfies ButtonHTMLAttributes"
          @click="setRange(range)"
        >
          {{ t(range === 24 ? 'welcomeArt.rangeDay' : 'welcomeArt.rangeTwoDays') }}
        </NButton>
        <NButton
          size="small"
          secondary
          v-bind="{ 'aria-label': t('welcomeArt.updateSignals') } satisfies ButtonHTMLAttributes"
          @click="update"
        >
          <template #icon>
            <span
              class="i-lucide-refresh-cw"
              aria-hidden="true"
            />
          </template>
        </NButton>
      </div>
    </div>
    <div class="flex flex-wrap min-w-0 gap-component-unit">
      <NButton
        v-for="metric in metrics"
        :key="metric.signal"
        secondary
        :type="selected === metric.signal ? 'primary' : 'default'"
        v-bind="{ 'aria-pressed': selected === metric.signal } satisfies ButtonHTMLAttributes"
        @click="select(metric.signal)"
      >
        <template #icon>
          <span
            class="rounded-control shrink-0 size-icon-small"
            :class="dots[metric.signal]"
            aria-hidden="true"
          />
        </template>
        <span class="inline-flex items-baseline gap-component-unit">
          {{ metric.name }} <strong class="tabular-nums">{{ metric.value }}</strong>
        </span>
      </NButton>
    </div>
    <div
      class="wb-home-preview-chart relative"
      @pointermove.once="loadChart"
    >
      <svg
        v-if="!interactiveReady"
        class="h-full w-full block"
        :viewBox="`0 0 ${preview.width} ${preview.height}`"
        preserveAspectRatio="none"
        role="img"
        :aria-label="t('welcomeArt.signalLabel')"
      >
        <line
          v-for="step in 4"
          :key="step"
          :x1="preview.left"
          :x2="preview.right"
          :y1="preview.top + ((step - 1) * (preview.bottom - preview.top)) / 3"
          :y2="preview.top + ((step - 1) * (preview.bottom - preview.top)) / 3"
          class="text-text-secondary"
          stroke="currentColor"
          stroke-opacity="0.16"
          vector-effect="non-scaling-stroke"
        />
        <g
          v-for="series in previewLines"
          :key="series.signal"
        >
          <polygon
            :points="series.area"
            :fill="series.color"
            fill-opacity="0.1"
          />
          <polyline
            :points="series.line"
            fill="none"
            :stroke="series.color"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </g>
      </svg>
      <component
        :is="interactiveChart"
        v-if="interactiveChart"
        class="inset-0 absolute"
        :class="{ invisible: !interactiveReady }"
        :options="chart"
        :label="t('welcomeArt.signalLabel')"
        @error="chartFailed"
        @rendered="chartRendered"
      />
    </div>
    <span
      v-if="failed"
      role="status"
      class="text-caption text-text-secondary"
    >
      {{ t('welcomeArt.signalError') }}
    </span>
  </section>
</template>
