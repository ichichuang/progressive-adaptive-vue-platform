<script setup lang="ts">
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NButtonGroup } from 'naive-ui/es/button-group'
import { m } from 'motion-v'
import type { UiG2ChartOptions } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import { useLiveChartClock } from './charts/use-live-chart-clock'
import type WelcomeInteractiveChart from './WelcomeInteractiveChart.vue'

defineOptions({ name: 'WelcomeCapabilityStage' })
const props = defineProps<{ readonly entranceReady: boolean }>()
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const active = ref(false)
const visiblePage = ref(false)
const interactiveReady = ref(false)
const tick = useLiveChartClock(
  computed(() => active.value && visiblePage.value && interactiveReady.value),
  ref(1000),
)
const hours = ref<24 | 48>(24)
const selected = ref<Signal | null>(null)
const failed = ref(false)
const interactiveChart = shallowRef<typeof WelcomeInteractiveChart>()
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
          Math.sin((hour + tick.value) * 0.08) * 10 +
          Math.sin((hour + tick.value) * 0.28 + series * 1.8) * 17 +
          Math.cos((hour + tick.value) * 0.65 + series) * 5,
      ),
    })),
  ),
)
const visible = computed(() =>
  samples.value
    .filter((row) => row.hour >= 48 - hours.value)
    .map((row) => ({ ...row, hour: row.hour - (48 - hours.value) })),
)
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
function visibilityChanged(): void {
  visiblePage.value = document.visibilityState === 'visible'
}
function activate(): void {
  visibilityChanged()
  active.value = true
  if (props.entranceReady) void loadChart()
}
watch(
  () => props.entranceReady,
  (ready) => {
    if (ready && active.value) void loadChart()
  },
)
onMounted(() => {
  document.addEventListener('visibilitychange', visibilityChanged)
  activate()
})
onActivated(activate)
onDeactivated(() => {
  active.value = false
})
onScopeDispose(() => {
  active.value = false
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <section
    class="wb-home-preview rounded-panel grid text-text-primary"
    :aria-label="t('welcomeArt.signalLabel')"
  >
    <div class="flex flex-wrap min-w-0 items-center justify-between gap-component-unit">
      <div class="flex min-w-0 items-center gap-component-unit">
        <span
          class="i-lucide-chart-no-axes-combined text-text-primary"
          aria-hidden="true"
        />
        <strong class="text-subheading">{{ t('welcomeArt.signalTitle') }}</strong>
      </div>
      <NButtonGroup
        data-pavp-exclusive-selection
        v-bind="
          {
            class: 'min-w-0',
            'aria-label': t('chartExamples.timeRange'),
          } satisfies HTMLAttributes
        "
      >
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
      </NButtonGroup>
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
          <m.span
            class="rounded-control shrink-0 size-icon-small"
            :class="dots[metric.signal]"
            :initial="false"
            :animate="{ opacity: selected !== null && selected !== metric.signal ? 0.35 : 1 }"
            :transition="{
              duration:
                appearance.snapshot.value.motion === 'full'
                  ? 0.2
                  : appearance.snapshot.value.motion === 'reduced'
                    ? 0.1
                    : 0,
            }"
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
      :aria-busy="!interactiveReady && !failed"
    >
      <component
        :is="interactiveChart"
        v-if="interactiveChart"
        v-show="!failed"
        class="inset-0 absolute"
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
