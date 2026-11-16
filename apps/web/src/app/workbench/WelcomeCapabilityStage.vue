<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, type ButtonHTMLAttributes } from 'vue'
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
const maxSignalValue = 110
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
      encode: { x: 'hour', y: 'value', color: 'name', key: 'signal' },
      style: { shape: 'smooth', fillOpacity: 0.1 },
      animate: { enter: { type: 'fadeIn' }, exit: { type: 'fadeOut' } },
      tooltip: false,
    },
    {
      type: 'line',
      encode: { x: 'hour', y: 'value', color: 'name', key: 'signal' },
      style: { shape: 'smooth', lineWidth: 3 },
      animate: { enter: { type: 'fadeIn' }, exit: { type: 'fadeOut' } },
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
// Keep G2 in its deferred chunk, but never require pointer input to initialize the chart.
onMounted(() => {
  void loadChart()
})
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
        :secondary="selected === null || selected === metric.signal"
        :quaternary="selected !== null && selected !== metric.signal"
        :type="selected === metric.signal ? 'primary' : 'default'"
        v-bind="{ 'aria-pressed': selected === metric.signal } satisfies ButtonHTMLAttributes"
        @click="select(metric.signal)"
      >
        <template #icon>
          <span
            class="rounded-control shrink-0 size-icon-small"
            :class="
              selected !== null && selected !== metric.signal
                ? 'i-lucide-circle text-text-secondary'
                : dots[metric.signal]
            "
            aria-hidden="true"
          />
        </template>
        <span class="inline-flex items-baseline gap-component-unit">
          {{ metric.name }} <strong class="tabular-nums">{{ metric.value }}</strong>
          <span
            class="i-lucide-check size-icon-small"
            :class="{ invisible: selected !== metric.signal }"
            aria-hidden="true"
          />
        </span>
      </NButton>
    </div>
    <div
      class="wb-home-preview-chart relative"
      :aria-busy="!interactiveReady && !failed"
    >
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
      <span
        v-if="failed"
        role="status"
        class="flex items-center inset-0 justify-center absolute text-caption text-text-secondary"
      >
        {{ t('welcomeArt.signalError') }}
      </span>
    </div>
  </section>
</template>
