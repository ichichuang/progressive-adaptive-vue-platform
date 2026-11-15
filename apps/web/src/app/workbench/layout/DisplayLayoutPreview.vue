<script setup lang="ts">
import { computed, ref, useId, watch, type ButtonHTMLAttributes, type HTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NProgress } from 'naive-ui/es/progress'
import { NTag } from 'naive-ui/es/tag'
import { UiDisplayStage, UiG2Chart, type UiDisplayRatio, type UiG2ChartOptions } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly fixed?: boolean
}>()
const { t } = useConsoleI18n()
const descriptionId = useId()
const revision = ref(0)
const failed = ref(false)
const ratio = ref<UiDisplayRatio>({ width: 16, height: 9 })
const ratios = [
  { width: 16, height: 9 },
  { width: 4, height: 3 },
  { width: 21, height: 9 },
] as const
const ranking = [
  { region: 'A', value: 88 },
  { region: 'B', value: 72 },
  { region: 'C', value: 64 },
  { region: 'D', value: 49 },
  { region: 'E', value: 36 },
] as const
const chartHost = ref<HTMLElement>()
const boardHost = ref<HTMLElement>()
const portrait = ref(false)
const compactPlot = ref(false)
const labelSize = ref(12)
watch(
  [boardHost, chartHost],
  ([board, chart], _previous, cleanup) => {
    if (!board || !chart) return

    function measure(): void {
      if (!board || !chart) return
      portrait.value = board.clientWidth < board.clientHeight
      compactPlot.value = chart.clientWidth < 260 || chart.clientHeight < 135
      labelSize.value = Math.round(Number.parseFloat(getComputedStyle(board).fontSize) * 0.86)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(board)
    observer.observe(chart)
    measure()
    cleanup(() => {
      observer.disconnect()
    })
  },
  { flush: 'post' },
)
const data = computed(() =>
  Array.from({ length: 18 }, (_, index) => ({
    time: `${String(index).padStart(2, '0')}:00`,
    value: 140 + Math.round(Math.sin(index / 2 + revision.value) * 45) + index * 9,
  })),
)
const options = computed<UiG2ChartOptions>(() => ({
  type: 'view',
  data: data.value,
  encode: { x: 'time', y: 'value' },
  axis: compactPlot.value
    ? false
    : {
        x: {
          title: false,
          labelAutoRotate: false,
          labelAutoHide: true,
          labelFontSize: labelSize.value,
        },
        y: { title: false, labelFontSize: labelSize.value },
      },
  ...(compactPlot.value ? { padding: 0 } : {}),
  children: [
    { type: 'area', style: { fillOpacity: 0.2 }, tooltip: false },
    { type: 'line', style: { lineWidth: compactPlot.value ? 1.5 : 3 } },
  ],
}))
function update(): void {
  failed.value = false
  revision.value += 1
}
</script>

<template>
  <section
    class="display-preview-page flex-1 grid h-full min-h-0 min-w-0 bg-surface-page"
    :class="{ 'display-preview-page-fluid': !fixed }"
    :aria-label="title"
    :aria-describedby="descriptionId"
  >
    <p
      :id="descriptionId"
      class="sr-only"
      v-text="message"
    />
    <header
      class="display-preview-header rounded-panel flex flex-wrap min-w-0 items-center justify-between"
      :class="{
        'bg-surface-panel text-text-primary display-preview-header-fluid': !fixed,
        'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground': fixed,
      }"
    >
      <h1
        class="display-preview-title font-title-weight m-0"
        data-route-focus="architecture-console-page-heading"
        tabindex="-1"
      >
        {{ title }}
      </h1>
      <div class="display-preview-actions flex flex-wrap items-center">
        <NTag
          class="display-preview-tag"
          :bordered="false"
          type="info"
          size="small"
        >
          {{ t('displayPreview.sample') }}
        </NTag>
        <template v-if="fixed">
          <NButton
            v-for="choice in ratios"
            :key="choice.width"
            class="display-preview-control"
            size="small"
            :type="ratio.width === choice.width ? 'primary' : 'default'"
            v-bind="{ 'aria-pressed': ratio.width === choice.width } satisfies ButtonHTMLAttributes"
            @click="ratio = choice"
          >
            {{ choice.width }}:{{ choice.height }}
          </NButton>
        </template>
        <NButton
          class="display-preview-control"
          size="small"
          type="primary"
          secondary
          @click="update"
        >
          {{ t('displayPreview.update') }}
        </NButton>
      </div>
    </header>
    <component
      :is="props.fixed ? UiDisplayStage : 'div'"
      v-bind="props.fixed ? { ratio, label: title } : {}"
      class="h-full min-h-0 min-w-0"
    >
      <div class="display-preview-frame h-full min-h-0 min-w-0 w-full">
        <div
          ref="boardHost"
          class="display-preview-board grid h-full min-h-0 min-w-0"
          :class="{
            'rounded-panel bg-surface-panel shadow-panel': fixed,
            'display-preview-board-portrait': portrait === true,
            'display-preview-board-fluid': !fixed,
          }"
        >
          <div class="display-preview-metrics grid min-h-0 min-w-0">
            <article
              class="display-preview-metric rounded-panel flex flex-col min-w-0 justify-center bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground"
            >
              <span>{{ t('displayPreview.volume') }}</span>
              <div
                class="display-preview-readout flex min-w-0 items-baseline"
                :class="!fixed || portrait ? 'flex-wrap' : undefined"
              >
                <strong class="display-preview-value">{{ 42860 + revision * 137 }}</strong>
                <span>+12.8%</span>
              </div>
            </article>
            <article
              class="display-preview-metric rounded-panel flex flex-col min-w-0 justify-center text-text-primary"
              :class="fixed ? 'bg-surface-page' : 'bg-surface-panel shadow-panel'"
            >
              <span>{{ t('displayPreview.availability') }}</span>
              <strong class="display-preview-value">99.98%</strong>
            </article>
            <article
              class="display-preview-metric rounded-panel flex flex-col min-w-0 justify-center text-text-primary"
              :class="fixed ? 'bg-surface-page' : 'bg-surface-panel shadow-panel'"
            >
              <span>{{ t('displayPreview.latency') }}</span>
              <div
                class="display-preview-readout flex min-w-0 items-baseline"
                :class="!fixed || portrait ? 'flex-wrap' : undefined"
              >
                <strong
                  class="display-preview-value"
                  v-text="`${42 + (revision % 8)} ms`"
                />
                <span>P95</span>
              </div>
            </article>
          </div>
          <div
            class="display-preview-panels grid min-h-0 min-w-0"
            :class="portrait ? 'display-preview-portrait' : undefined"
          >
            <section
              class="display-preview-panel display-preview-trend rounded-panel grid min-h-0 min-w-0"
              :class="fixed ? 'bg-surface-page' : 'bg-surface-panel shadow-panel'"
              :aria-label="t('displayPreview.trend')"
            >
              <h2 class="display-preview-heading font-title-weight m-0 text-text-primary">
                {{ t('displayPreview.trend') }}
              </h2>
              <div
                ref="chartHost"
                class="display-preview-chart min-h-0 min-w-0"
              >
                <p
                  v-if="failed"
                  role="alert"
                  class="m-0 text-text-secondary"
                >
                  {{ t('displayPreview.chartError') }}
                </p>
                <UiG2Chart
                  v-else
                  :options="options"
                  :label="t('displayPreview.trend')"
                  @error="failed = true"
                />
              </div>
            </section>
            <section
              class="display-preview-panel display-preview-ranking rounded-panel grid min-h-0 min-w-0 bg-expression-accent-b-soft-background"
              :aria-label="t('displayPreview.ranking')"
            >
              <h2 class="display-preview-heading font-title-weight m-0 text-text-primary">
                {{ t('displayPreview.ranking') }}
              </h2>
              <div
                v-for="item in ranking"
                :key="item.region"
                class="display-preview-rank grid min-h-0 min-w-0"
              >
                <span>{{ t('displayPreview.region') }} {{ item.region }}</span>
                <NProgress
                  class="display-preview-rank-meter"
                  type="line"
                  :height="Math.max(2, labelSize / 3)"
                  :percentage="item.value"
                  :show-indicator="false"
                  v-bind="
                    {
                      'aria-label': `${t('displayPreview.region')} ${item.region}`,
                    } satisfies HTMLAttributes
                  "
                />
                <span class="tabular-nums">{{ item.value }}%</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </component>
  </section>
</template>

<style scoped>
.display-preview-page {
  container-type: size;
  grid-template-rows: auto minmax(0, 1fr);
}
.display-preview-header {
  font-size: clamp(var(--ui-font-size-caption), min(1.4cqi, 4cqb), var(--ui-font-size-heading));
  gap: 0.5em;
  padding: 0.6em 1em;
}
.display-preview-title {
  font-size: 1.65em;
  line-height: var(--ui-font-line-height-compact);
}
.display-preview-actions {
  gap: 0.35em;
}
.display-preview-control,
.display-preview-tag {
  font-size: 0.95em;
}
.display-preview-frame {
  container-type: size;
}
.display-preview-board {
  font-size: clamp(
    calc(var(--ui-font-size-caption) * 0.75),
    min(1.7cqi, 7cqb),
    calc(var(--ui-font-size-title) * 1.2)
  );
  line-height: var(--ui-font-line-height-compact);
  grid-template-rows: minmax(0, 1.35fr) minmax(0, 3.3fr);
  gap: 0.65em;
  padding: 0.65em;
}
.display-preview-board-portrait {
  font-size: clamp(var(--ui-font-size-caption), min(3.3cqi, 3.5cqb), var(--ui-font-size-heading));
  grid-template-rows: minmax(0, 1fr) minmax(0, 4fr);
}
.display-preview-metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65em;
}
.display-preview-metric {
  padding: 0.2em 0.6em;
  gap: 0.15em;
}
.display-preview-panel {
  padding: 0.6em 0.75em;
  gap: 0.25em;
}
.display-preview-readout {
  gap: 0.33em;
}
.display-preview-value {
  font-size: 1.55em;
}
.display-preview-panels {
  grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
  gap: 0.65em;
}
.display-preview-portrait {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 2.3fr) minmax(0, 1.2fr);
}
.display-preview-trend {
  grid-template-rows: auto minmax(0, 1fr);
}
.display-preview-heading {
  font-size: 1.05em;
  line-height: var(--ui-font-line-height-title);
}
.display-preview-ranking {
  grid-template-rows: auto repeat(5, minmax(0, 1fr));
}
.display-preview-rank {
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.4em;
  font-size: 0.82em;
}
.display-preview-rank-meter {
  min-width: 0;
}

.display-preview-page-fluid {
  gap: var(--ui-space-content-gap);
}
.display-preview-board-fluid {
  width: 100%;
  font-size: clamp(var(--ui-font-size-caption), min(1.4cqi, 3cqb), var(--ui-font-size-heading));
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--ui-space-content-gap);
  padding: 0;
}
.display-preview-board-fluid.display-preview-board-portrait {
  font-size: clamp(var(--ui-font-size-caption), min(3.3cqi, 3.5cqb), var(--ui-font-size-heading));
}
.display-preview-board-fluid .display-preview-metric {
  padding: 0.5em 0.85em;
}
.display-preview-board-fluid .display-preview-panel {
  padding: 0.85em 1em;
}
.display-preview-header-fluid {
  font-size: clamp(var(--ui-font-size-caption), min(1.14cqi, 3cqb), var(--ui-font-size-body));
}
/* Keep text-sized rows before distributing the rest of the stage to the plot. */
.display-preview-board-fluid .display-preview-portrait {
  grid-template-rows: minmax(0, 2.3fr) minmax(min-content, 1.2fr);
}
.display-preview-board-fluid .display-preview-ranking {
  grid-template-rows: auto repeat(5, minmax(min-content, 1fr));
}
@media (height < 24rem) {
  .display-preview-page-fluid {
    gap: var(--ui-space-component-unit);
  }
  .display-preview-header-fluid {
    column-gap: var(--ui-space-component-unit);
    padding: 0.35em 0.55em;
  }
}
@container (height < 12rem) {
  .display-preview-board-fluid,
  .display-preview-board-fluid .display-preview-panels {
    gap: var(--ui-space-component-unit);
  }
  .display-preview-board-fluid .display-preview-metric {
    padding: 0.25em 0.55em;
  }
  .display-preview-board-fluid .display-preview-panel {
    padding: 0.45em 0.55em;
  }
  .display-preview-board-fluid .display-preview-ranking {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto repeat(3, minmax(min-content, 1fr));
  }
  .display-preview-board-fluid .display-preview-ranking > .display-preview-heading {
    grid-column: 1 / -1;
  }
}
@container (width < 24rem) and (height < 12rem) {
  .display-preview-board-fluid .display-preview-panels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr);
  }
  .display-preview-board-fluid .display-preview-ranking {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto repeat(5, minmax(min-content, 1fr));
  }
}
</style>
