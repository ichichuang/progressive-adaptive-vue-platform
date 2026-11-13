<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import {
  UiChartTimeRange,
  UiCopyAction,
  UiG2Chart,
  UiScrollArea,
  normalizeUiChartTimeRange,
  type UiScrollController,
} from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import ChartMetricValue from './ChartMetricValue.vue'
import {
  linkedChannels,
  linkedHours,
  linkedSamples,
  linkedChannelKeys,
  linkedChartOptions,
  linkedChartEvents,
  type LinkedChannel,
} from './chart-linked-example'
import { useConsoleI18n } from '../../../shared/i18n'
import { useAppearanceReadBoundary } from '../../appearance/appearance-read-boundary'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'

defineProps<{ readonly title: string; readonly message: string }>()
const { t, locale } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const active = ref(true)
const revision = ref(0)
const range = ref<[number, number]>([0, linkedHours - 1])
const selected = ref<LinkedChannel | null>(null)
const hovered = ref<LinkedChannel | null>(null)
const tracking = ref(false)
const failed = ref(false)
const replay = ref(0)
const samples = computed(() => linkedSamples(revision.value, t))
const focus = computed(() => hovered.value ?? selected.value)
const colors = computed(() => {
  const colors = appearance.snapshot.value.colorPalette.dataViz.categorical
  return [colors.series1, colors.series2, colors.series3]
})
const colorClasses = [
  'bg-data-viz-categorical-series-1',
  'bg-data-viz-categorical-series-2',
  'bg-data-viz-categorical-series-3',
]
function select(channel: LinkedChannel): void {
  selected.value = selected.value === channel ? null : channel
}
const motionHost = ref<HTMLElement | null>(null)
function timing(): { duration: number; easing: string } {
  if (!motionHost.value || appearance.snapshot.value.motion !== 'full')
    return { duration: 0, easing: 'linear' }
  const style = getComputedStyle(motionHost.value)
  return {
    duration:
      Number.parseFloat(style.transitionDuration) *
      (style.transitionDuration.endsWith('ms') ? 1 : 1000),
    easing: style.transitionTimingFunction,
  }
}
const events = linkedChartEvents(
  select,
  (channel) => {
    hovered.value = channel
  },
  focus,
  timing,
)
const comparisonTitles = computed(() => ({
  ranking: t('chartLinked.ranking'),
  composition: t('chartLinked.composition'),
}))
const options = computed(() =>
  linkedChartOptions(samples.value, range.value, colors.value, events, tracking.value),
)
const visible = computed(() =>
  samples.value.filter((row) => row.hour >= range.value[0] && row.hour <= range.value[1]),
)
const total = computed(() =>
  visible.value
    .filter((row) => !selected.value || row.channel === selected.value)
    .reduce((sum, row) => sum + row.value, 0),
)
const overview = computed(() =>
  Array.from({ length: linkedHours }, (_, hour) =>
    samples.value.filter((row) => row.hour === hour).reduce((sum, row) => sum + row.value, 0),
  ),
)
const formatHour = (value: number): string =>
  `${t('chartLinked.day')} ${String(Math.floor(value / 24) + 1)} · ${String(Math.round(value) % 24).padStart(2, '0')}:00`
const copyValue = computed(() =>
  [
    t('chartLinked.copy'),
    'UiG2Chart + UiChartTimeRange',
    'apps/web/src/app/workbench/charts/ChartLinkedWorkbench.vue',
    JSON.stringify({ range: range.value, selected: selected.value }),
  ].join('\n\n'),
)
function updateRange(value: [number, number]): void {
  range.value = normalizeUiChartTimeRange(value, 0, linkedHours - 1)
}
function reset(): void {
  selected.value = null
  hovered.value = null
  range.value = [0, linkedHours - 1]
  tracking.value = false
}
function update(): void {
  revision.value += 1
  failed.value = false
}

function retry(): void {
  failed.value = false
  replay.value += 1
}
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Linked charts require the Router Scroll Controller port.')
let scrollController: UiScrollController | null = null
let unregister: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  scrollController = controller
  unregister?.()
  unregister = controller && active.value ? register?.(controller) : undefined
}
onActivated(() => {
  active.value = true
  connect(scrollController)
})
onDeactivated(() => {
  active.value = false
  hovered.value = null
  tracking.value = false
  unregister?.()
  unregister = undefined
})
onScopeDispose(() => {
  unregister?.()
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
      ref="motionHost"
      class="wb-table-stage rounded-panel flex flex-1 flex-col min-h-0 min-w-0 bg-surface-panel duration-motion ease-motion"
      :aria-label="title"
      data-chart-linked
    >
      <UiScrollArea
        owner-id="architecture-console-content"
        :enabled="active"
        class="flex-1 min-h-0"
        @controller="connect"
      >
        <div class="wb-form-panel-header grid min-w-0 gap-content-gap">
          <div class="flex flex-wrap items-center justify-between gap-content-gap">
            <div
              class="flex flex-wrap gap-component-unit"
              role="group"
              :aria-label="t('chartLinked.channels')"
            >
              <NButton
                v-for="(channel, index) in linkedChannels"
                :key="channel"
                :type="selected === channel ? 'primary' : 'default'"
                secondary
                :aria-pressed="selected === channel"
                @click="select(channel)"
                @mouseenter="hovered = channel"
                @pointerleave="hovered = null"
                @focus="hovered = channel"
                @blur="hovered = null"
              >
                <span class="inline-flex items-center gap-component-unit">
                  <span
                    class="rounded-control shrink-0 size-icon-small"
                    :class="selected === channel ? undefined : colorClasses[index]"
                    aria-hidden="true"
                  />
                  {{ t(linkedChannelKeys[channel]) }}
                </span>
              </NButton>
            </div>
            <div class="flex items-baseline tabular-nums gap-component-unit">
              <span class="text-caption text-text-secondary">{{
                selected ? t(linkedChannelKeys[selected]) : t('chartLinked.all')
              }}</span>
              <strong class="text-subheading text-text-primary">
                <ChartMetricValue
                  :value="String(total)"
                  :locale="locale"
                  :active="active"
                />
              </strong>
            </div>
          </div>
          <p class="m-0 text-caption text-text-secondary">
            {{ t('chartLinked.hint') }}
          </p>
          <div
            v-if="failed"
            role="alert"
            class="rounded-control flex items-center justify-between bg-surface-page gap-content-gap p-page-inline"
          >
            <span>{{ t('chartExamples.error') }}</span>
            <NButton @click="retry">
              {{ t('chartExamples.retry') }}
            </NButton>
          </div>
          <div
            class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-3 layout-wide:grid-cols-3"
          >
            <section
              class="rounded-panel min-w-0 bg-surface-page p-page-inline"
              :aria-label="t('chartLinked.trend')"
              @pointerleave="hovered = null"
            >
              <h2 class="font-title-weight m-0 text-body text-text-primary">
                {{ t('chartLinked.trend') }}
              </h2>
              <div class="wb-chart-preview min-w-0">
                <UiG2Chart
                  :key="`trend-${String(replay)}`"
                  :options="options.trend"
                  :label="t('chartLinked.trend')"
                  @error="failed = true"
                />
              </div>
              <UiChartTimeRange
                :value="range"
                :min="0"
                :max="linkedHours - 1"
                :overview="overview"
                :format-value="formatHour"
                :label="t('chartExamples.timeRange')"
                :start-label="t('chartExamples.rangeStart')"
                :end-label="t('chartExamples.rangeEnd')"
                :help-text="t('chartLinked.rangeHint')"
                @update:value="updateRange"
                @start="tracking = true"
                @end="tracking = false"
              />
              <div class="flex flex-wrap items-center justify-between gap-component-unit">
                <div class="flex gap-component-unit">
                  <NButton
                    size="small"
                    :secondary="range[0] === 48"
                    :aria-pressed="range[0] === 48 && range[1] === 71"
                    @click="updateRange([48, 71])"
                  >
                    {{ t('chartExamples.lastDay') }}
                  </NButton>
                  <NButton
                    size="small"
                    :secondary="range[0] === 0"
                    :aria-pressed="range[0] === 0 && range[1] === 71"
                    @click="updateRange([0, 71])"
                  >
                    {{ t('chartLinked.fullRange') }}
                  </NButton>
                </div>
              </div>
            </section>
            <section
              v-for="kind in ['ranking', 'composition'] as const"
              :key="kind"
              class="rounded-panel min-w-0 bg-surface-page p-page-inline"
              :aria-label="comparisonTitles[kind]"
              @pointerleave="hovered = null"
            >
              <h2 class="font-title-weight m-0 text-body text-text-primary">
                {{ comparisonTitles[kind] }}
              </h2>
              <div class="wb-chart-preview min-w-0">
                <UiG2Chart
                  :key="`${kind}-${String(replay)}`"
                  :options="options[kind]"
                  :label="comparisonTitles[kind]"
                  @error="failed = true"
                />
              </div>
            </section>
          </div>
        </div>
      </UiScrollArea>
      <footer
        class="wb-form-panel-header flex shrink-0 flex-wrap items-center justify-between gap-content-gap"
      >
        <span class="text-caption text-text-secondary">{{ t('chartLive.localSimulation') }}</span>
        <div class="flex flex-wrap gap-component-unit">
          <NButton @click="reset">
            {{ t('chartLinked.reset') }}
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
