<script setup lang="ts">
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
  type HTMLAttributes,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NFlex } from 'naive-ui/es/flex'
import { NImage } from 'naive-ui/es/image'
import { NProgress } from 'naive-ui/es/progress'
import { NText } from 'naive-ui/es/typography'
import { UiG2Chart, type UiChartTourState, type UiDisplayStageSize } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
import { liveChartExample, liveStreamSamples } from '../charts/chart-live-simulation'
import { chartTourConfiguration, chartTourExample } from '../charts/chart-tour-example'
import ChartMetricValue from '../charts/ChartMetricValue.vue'
import { useLiveChartClock } from '../charts/use-live-chart-clock'
import productionCampus from './production-campus.png'

const props = defineProps<{
  readonly stageSize?: UiDisplayStageSize
}>()
const { t, locale } = useConsoleI18n()
const host = ref<InstanceType<typeof NFlex>>()
const measuredSize = ref<UiDisplayStageSize>({ width: 0, height: 0 })
const availableSize = computed(() => props.stageSize ?? measuredSize.value)
let resizeObserver: ResizeObserver | undefined
const active = ref(false)
const visible = ref(true)
const interval = ref(2000)
const playing = computed(() => active.value && visible.value)
const tick = useLiveChartClock(playing, interval)
const stream = computed(() => liveChartExample('stream', tick.value, t))
const ranking = computed(() => liveChartExample('ranking', tick.value, t))
const compactStage = computed(
  () =>
    availableSize.value.width < 720 ||
    availableSize.value.height < (props.stageSize === undefined ? 384 : 320),
)
const streamOptions = computed(() =>
  compactStage.value
    ? { ...stream.value.options, axis: false as const, legend: false as const }
    : stream.value.options,
)
const rankingOptions = computed(() =>
  compactStage.value
    ? {
        ...ranking.value.options,
        axis: { x: { title: false, tick: false, line: false, labelAutoHide: false }, y: false },
        labels: [],
      }
    : ranking.value.options,
)
const tourOptions = computed(() => {
  const options = chartTourExample('donut', 0, t)
  return compactStage.value ? { ...options, tooltip: false as const } : options
})
const tourState = ref<UiChartTourState>({ status: 'stopped', targetId: null, reason: null })
const errors = ref({ ranking: false, stream: false, tour: false })
const stroke = computed(() => Math.max(1, Math.min(6, (props.stageSize?.width ?? 1200) / 180)))
const channelLabels = computed(() => [
  t('chartLive.web'),
  t('chartLive.mobile'),
  t('chartLive.api'),
])
const channels = computed(() =>
  liveStreamSamples(tick.value)
    .filter((item) => item.second === tick.value + 35)
    .map((item) => ({
      label: channelLabels.value[item.channel] ?? '',
      value: item.value,
    })),
)
function visibilityChanged(): void {
  visible.value = document.visibilityState === 'visible'
}
function activate(): void {
  visibilityChanged()
  active.value = true
}
onMounted(() => {
  const element: unknown = host.value?.$el
  if (element instanceof HTMLElement) {
    const measure = (): void => {
      measuredSize.value = { width: element.clientWidth, height: element.clientHeight }
    }
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(element)
    measure()
  }
  document.addEventListener('visibilitychange', visibilityChanged)
  activate()
})
onActivated(activate)
onDeactivated(() => {
  active.value = false
})
onScopeDispose(() => {
  resizeObserver?.disconnect()
  active.value = false
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <NFlex
    ref="host"
    :size="0"
    class="operations-host h-full min-h-0 min-w-0 w-full"
  >
    <NFlex
      :size="0"
      class="operations-board h-full min-h-0 min-w-0 w-full"
      :class="{ 'operations-board-fixed': stageSize !== undefined }"
      v-bind="
        { role: 'region', 'aria-label': t('displayPreview.overview') } satisfies HTMLAttributes
      "
    >
      <NCard
        class="operations-panel operations-ranking rounded-panel min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        content-class="operations-panel-body flex flex-col h-full min-h-0 min-w-0"
        :bordered="false"
      >
        <NFlex
          align="baseline"
          justify="space-between"
          :size="0"
          class="operations-heading"
        >
          <NText strong>
            {{ t('displayPreview.ranking') }}
          </NText>
          <NText depth="3">
            {{ t('chartLive.rateUnit') }}
          </NText>
        </NFlex>
        <NText
          v-if="errors.ranking"
          depth="3"
          v-bind="{ role: 'alert' } satisfies HTMLAttributes"
        >
          {{ t('displayPreview.chartError') }}
        </NText>
        <UiG2Chart
          v-else
          class="flex-1 min-h-0 min-w-0"
          :options="rankingOptions"
          :label="t('displayPreview.ranking')"
          @error="errors.ranking = true"
        />
        <NButton
          v-if="errors.ranking"
          size="small"
          @click="errors.ranking = false"
        >
          {{ t('chartExamples.retry') }}
        </NButton>
      </NCard>

      <NCard
        class="operations-panel operations-channels rounded-panel min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        content-class="operations-panel-body flex flex-col h-full min-h-0 min-w-0"
        :bordered="false"
      >
        <NFlex
          align="baseline"
          justify="space-between"
          :size="0"
          class="operations-heading"
        >
          <NText strong>
            {{ t('displayPreview.channels') }}
          </NText>
          <NText depth="3">
            {{ t('chartLive.rateUnit') }}
          </NText>
        </NFlex>
        <NFlex
          v-for="channel in channels"
          :key="channel.label"
          vertical
          :size="0"
          class="operations-meter flex-1 min-h-0 justify-center"
        >
          <NFlex
            justify="space-between"
            :size="0"
            :wrap="false"
          >
            <NText
              class="min-w-0 truncate"
              depth="3"
            >
              {{ channel.label }}
            </NText>
            <NText
              class="tabular-nums"
              strong
            >
              <ChartMetricValue
                :value="String(channel.value)"
                :locale="locale"
                :active="playing"
              />
            </NText>
          </NFlex>
          <NProgress
            type="line"
            :height="stroke"
            :percentage="Math.round((channel.value / 160) * 100)"
            :show-indicator="false"
            v-bind="{ 'aria-label': channel.label } satisfies HTMLAttributes"
          />
        </NFlex>
      </NCard>

      <NCard
        class="operations-panel operations-summary rounded-panel min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        content-class="operations-panel-body flex flex-col h-full min-h-0 min-w-0"
        :bordered="false"
      >
        <NFlex
          align="baseline"
          justify="space-between"
          :size="0"
          class="operations-heading"
        >
          <NText strong>
            {{ t('displayPreview.overview') }}
          </NText>
          <NText depth="3">
            {{ t('displayPreview.now') }}
          </NText>
        </NFlex>
        <NFlex
          :size="0"
          class="operations-metrics flex-1 min-h-0"
        >
          <NFlex
            vertical
            :size="0"
            class="operations-metric min-w-0 justify-center"
          >
            <NText depth="3">
              {{ t('chartLive.currentTotal') }}
            </NText>
            <NText
              strong
              class="operations-value text-control-primary"
            >
              <ChartMetricValue
                :value="stream.metrics[0]?.value ?? '0'"
                :locale="locale"
                :active="playing"
              />
            </NText>
            <NText depth="3">
              {{ t('chartLive.rateUnit') }}
            </NText>
          </NFlex>
          <NFlex
            vertical
            :size="0"
            class="operations-metric min-w-0 justify-center"
          >
            <NText depth="3">
              {{ t('chartLive.series') }}
            </NText>
            <NText
              strong
              class="operations-value text-control-primary"
            >
              {{ stream.metrics[2]?.value }}
            </NText>
            <NText depth="3">
              {{ t('chartLive.channels') }}
            </NText>
          </NFlex>
          <NFlex
            vertical
            :size="0"
            class="operations-metric min-w-0 justify-center"
          >
            <NText depth="3">
              {{ t('chartLive.leader') }}
            </NText>
            <NText
              strong
              class="operations-value text-control-primary"
            >
              {{ ranking.metrics[0]?.value }}
            </NText>
            <NText depth="3">
              {{ t('chartLive.regions') }}
            </NText>
          </NFlex>
          <NFlex
            vertical
            :size="0"
            class="operations-metric min-w-0 justify-center"
          >
            <NText depth="3">
              {{ t('chartLive.leadingRate') }}
            </NText>
            <NText
              strong
              class="operations-value text-control-primary"
            >
              <ChartMetricValue
                :value="ranking.metrics[1]?.value ?? '0'"
                :locale="locale"
                :active="playing"
              />
            </NText>
            <NText depth="3">
              {{ t('chartLive.rateUnit') }}
            </NText>
          </NFlex>
        </NFlex>
      </NCard>

      <NCard
        class="operations-panel operations-visual rounded-panel min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        content-class="operations-panel-body flex flex-col h-full min-h-0 min-w-0"
        :bordered="false"
      >
        <NFlex
          align="baseline"
          justify="space-between"
          :size="0"
          class="operations-heading"
        >
          <NText strong>
            {{ t('displayPreview.productionScene') }}
          </NText>
          <NText depth="3">
            {{ t('displayPreview.sceneIllustration') }}
          </NText>
        </NFlex>
        <NImage
          class="rounded-control flex-1 min-h-0 min-w-0 overflow-hidden"
          :img-props="{ class: 'h-full w-full' }"
          :object-fit="stageSize === undefined ? 'cover' : 'fill'"
          :src="productionCampus"
          :alt="t('displayPreview.sceneIllustration')"
          preview-disabled
        />
      </NCard>

      <NCard
        class="operations-panel operations-stream rounded-panel min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        content-class="operations-panel-body flex flex-col h-full min-h-0 min-w-0"
        :bordered="false"
      >
        <NFlex
          align="baseline"
          justify="space-between"
          :size="0"
          class="operations-heading"
        >
          <NText strong>
            {{ t('displayPreview.stream') }}
          </NText>
          <NText depth="3">
            {{ t('chartLive.window') }} · {{ stream.metrics[1]?.value }}
            {{ t('chartLive.seconds') }}
          </NText>
        </NFlex>
        <NText
          v-if="errors.stream"
          depth="3"
          v-bind="{ role: 'alert' } satisfies HTMLAttributes"
        >
          {{ t('displayPreview.chartError') }}
        </NText>
        <UiG2Chart
          v-else
          class="flex-1 min-h-0 min-w-0"
          :options="streamOptions"
          :label="t('displayPreview.stream')"
          @error="errors.stream = true"
        />
        <NButton
          v-if="errors.stream"
          size="small"
          @click="errors.stream = false"
        >
          {{ t('chartExamples.retry') }}
        </NButton>
      </NCard>

      <NCard
        class="operations-panel operations-tour rounded-panel min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        content-class="operations-panel-body flex flex-col h-full min-h-0 min-w-0"
        :bordered="false"
      >
        <NFlex
          align="baseline"
          justify="space-between"
          :size="0"
          class="operations-heading"
        >
          <NText strong>
            {{ t('displayPreview.tour') }}
          </NText>
          <NText depth="3">
            {{ tourState.targetId ?? t('chartTour.donut') }}
          </NText>
        </NFlex>
        <NText
          v-if="errors.tour"
          depth="3"
          v-bind="{ role: 'alert' } satisfies HTMLAttributes"
        >
          {{ t('displayPreview.chartError') }}
        </NText>
        <UiG2Chart
          v-else
          class="flex-1 min-h-0 min-w-0"
          :options="tourOptions"
          :tour="chartTourConfiguration"
          :label="t('displayPreview.tour')"
          @error="errors.tour = true"
          @tour-change="tourState = $event"
        />
        <NButton
          v-if="errors.tour"
          size="small"
          @click="errors.tour = false"
        >
          {{ t('chartExamples.retry') }}
        </NButton>
      </NCard>

      <NCard
        class="operations-panel operations-status rounded-panel min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        content-class="operations-panel-body flex flex-col h-full min-h-0 min-w-0"
        :bordered="false"
      >
        <NFlex
          align="baseline"
          justify="space-between"
          :size="0"
          class="operations-heading"
        >
          <NText strong>
            {{ t('displayPreview.status') }}
          </NText>
          <NText depth="3">
            {{ t('displayPreview.now') }}
          </NText>
        </NFlex>
        <NFlex
          v-for="(metric, index) in [
            ranking.metrics[0],
            ranking.metrics[1],
            stream.metrics[1],
            ranking.metrics[2],
          ]"
          :key="index"
          align="center"
          justify="space-between"
          :size="0"
          :wrap="false"
          class="operations-status-row flex-1 min-h-0"
        >
          <NText
            class="min-w-0 truncate"
            depth="3"
          >
            {{ metric?.label }}
          </NText>
          <NText
            class="min-w-0 truncate tabular-nums"
            strong
          >
            {{ metric?.value }} {{ metric?.unit }}
          </NText>
        </NFlex>
      </NCard>
    </NFlex>
  </NFlex>
</template>

<style scoped>
.operations-host {
  container-type: size;
}
.operations-board {
  display: grid !important;
  grid-template-areas:
    'ranking summary tour'
    'ranking visual tour'
    'ranking visual tour'
    'channels stream status'
    'channels stream status'
    'channels stream status';
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.9fr) minmax(0, 1fr);
  grid-template-rows: 1.35fr 1.1fr 1.1fr 1.2fr 1.2fr 1.25fr;
  gap: 0.8em !important;
  padding: 0.8em;
  font-size: clamp(var(--ui-font-size-caption), 1.1cqi, var(--ui-font-size-body));
  line-height: var(--ui-font-line-height-compact);
}
.operations-board-fixed {
  font-size: clamp(0.4rem, min(1.8cqi, 3.5cqb), var(--ui-font-size-body));
}
.operations-board:not(.operations-board-fixed) {
  grid-template-rows:
    minmax(min-content, 1.35fr) repeat(2, minmax(0, 1.1fr))
    repeat(2, minmax(0, 1.2fr)) minmax(0, 1.25fr);
}
.operations-ranking {
  grid-area: ranking;
}
.operations-channels {
  grid-area: channels;
}
.operations-summary {
  grid-area: summary;
}
.operations-visual {
  grid-area: visual;
}
.operations-stream {
  grid-area: stream;
}
.operations-tour {
  grid-area: tour;
}
.operations-status {
  grid-area: status;
}
.operations-panel {
  font-size: inherit;
}
.operations-panel :deep(.operations-panel-body) {
  gap: 0.8em;
  padding: 1em 1.1em;
  font-size: inherit;
  line-height: var(--ui-font-line-height-compact);
}
.operations-heading {
  flex: 0 0 auto;
  gap: 0.5em !important;
  font-size: 1.08em;
}
.operations-metrics {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8em !important;
}
.operations-metric {
  gap: 0.25em !important;
}
.operations-value {
  font-size: 1.75em;
  line-height: var(--ui-font-line-height-compact);
}
.operations-metric > * {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.operations-board:not(.operations-board-fixed) .operations-metric > * {
  overflow-wrap: anywhere;
  white-space: normal;
}
.operations-meter {
  gap: 0.4em !important;
}
.operations-status-row {
  gap: 0.75em !important;
}
@container (width < 48rem) {
  .operations-board:not(.operations-board-fixed) {
    grid-template-areas: 'summary summary' 'stream stream' 'ranking tour' 'channels status' 'visual visual';
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows:
      minmax(min-content, 1fr) repeat(2, minmax(0, 1.5fr))
      minmax(min-content, 1.2fr) minmax(0, 0.7fr);
    font-size: var(--ui-font-size-caption);
  }
}
@container (height < 36rem) {
  .operations-board {
    gap: 0.4em !important;
    padding: 0.4em;
  }
  .operations-panel :deep(.operations-panel-body) {
    gap: 0.3em;
    padding: 0.4em 0.5em;
  }
  .operations-heading {
    flex-wrap: nowrap !important;
  }
  .operations-heading > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .operations-board:not(.operations-board-fixed) .operations-value {
    font-size: 1.4em;
  }
}
@container (width >= 48rem) and (height < 24rem) {
  .operations-board:not(.operations-board-fixed) {
    grid-template-areas: 'summary summary summary' 'ranking stream tour' 'channels visual status';
    grid-template-rows: minmax(min-content, 1.2fr) repeat(2, minmax(0, 1.5fr));
  }
  .operations-board:not(.operations-board-fixed) .operations-meter {
    display: grid !important;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: center;
  }
}
</style>
