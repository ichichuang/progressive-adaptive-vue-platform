<script setup lang="ts">
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
  watch,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NSelect } from 'naive-ui/es/select'
import { UiCopyAction, UiG2Chart, UiScrollArea, type UiScrollController } from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import ChartMetricValue from './ChartMetricValue.vue'
import { liveChartExample, liveSampleTime, type LiveChartKind } from './chart-live-simulation'
import { useConsoleI18n } from '../../../shared/i18n'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly kind: LiveChartKind
}>()
const { t, locale } = useConsoleI18n()
const tick = ref(0)
const running = ref(true)
const active = ref(false)
const visible = ref(true)
const interval = ref(2000)
const showData = ref(false)
const narrow = ref(false)
const error = ref(false)
const replay = ref(0)
const numberFormat = computed(() => new Intl.NumberFormat(locale.value))
const example = computed(() => liveChartExample(props.kind, tick.value, t))
const speedOptions = computed(() => [
  { value: 4000, label: t('chartLive.speedSlow') },
  { value: 2000, label: t('chartLive.speedNormal') },
  { value: 1000, label: t('chartLive.speedFast') },
])
const description = computed(() =>
  t(
    props.kind === 'stream'
      ? 'chartLive.streamDescription'
      : props.kind === 'ranking'
        ? 'chartLive.rankingDescription'
        : 'chartLive.distributionDescription',
  ),
)
const method = computed(() =>
  t(
    props.kind === 'stream'
      ? 'chartLive.streamMethod'
      : props.kind === 'ranking'
        ? 'chartLive.rankingMethod'
        : 'chartLive.distributionMethod',
  ),
)
const playing = computed(() => running.value && active.value && visible.value && !error.value)
const status = computed(() =>
  error.value
    ? t('chartExamples.renderFailed')
    : showData.value
      ? t('chartLive.inspecting')
      : playing.value
        ? t('chartLive.running')
        : t('chartLive.paused'),
)
const copyValue = computed(() =>
  [
    t('chartExamples.copyRequest'),
    props.title,
    description.value,
    method.value,
    t('chartLive.lifecycle'),
    'apps/web/src/app/workbench/charts/ChartLiveWorkbench.vue',
    'apps/web/src/app/workbench/charts/chart-live-simulation.ts',
    'packages/ui/src/components/g2-chart-guide.md',
    JSON.stringify(
      {
        kind: props.kind,
        tick: tick.value,
        interval: interval.value,
        options: example.value.options,
      },
      null,
      2,
    ),
  ].join('\n\n'),
)
// Exactly one pending tick. Hidden/cached pages freeze rather than accumulating missed work.
let timer: ReturnType<typeof setTimeout> | undefined
function clearTimer(): void {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined
}
function schedule(): void {
  clearTimer()
  if (!playing.value) return
  timer = setTimeout(() => {
    timer = undefined
    if (!playing.value) return
    tick.value += 1
    schedule()
  }, interval.value)
}
watch([playing, interval], schedule, { flush: 'sync' })
function toggleRunning(): void {
  if (!running.value) showData.value = false
  running.value = !running.value
}
function toggleData(): void {
  running.value = false
  showData.value = !showData.value
}
function step(): void {
  if (!running.value && !error.value) tick.value += 1
}
function reset(): void {
  running.value = false
  tick.value = 0
  error.value = false
}
function retry(): void {
  error.value = false
  replay.value += 1
}
function fail(): void {
  error.value = true
  running.value = false
}
function visibilityChanged(): void {
  visible.value = document.visibilityState === 'visible'
}
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Live charts require the Router Scroll Controller port.')
let controller: UiScrollController | null = null
let unregister: (() => void) | undefined
function connect(next: UiScrollController | null): void {
  controller = next
  unregister?.()
  unregister = undefined
  if (controller && active.value) unregister = register?.(controller)
}
function activate(): void {
  visibilityChanged()
  active.value = true
  connect(controller)
}
onMounted(() => {
  document.addEventListener('visibilitychange', visibilityChanged)
  activate()
})
onActivated(activate)
onDeactivated(() => {
  active.value = false
  unregister?.()
  unregister = undefined
})
onScopeDispose(() => {
  active.value = false
  clearTimer()
  unregister?.()
  document.removeEventListener('visibilitychange', visibilityChanged)
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
      class="wb-table-stage rounded-panel flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
      data-chart-live-workbench="true"
      :aria-label="title"
    >
      <div
        class="wb-form-panel-header flex shrink-0 flex-wrap min-w-0 items-center justify-between gap-content-gap"
      >
        <div class="wb-chart-picker grid min-w-0 gap-component-unit">
          <span
            class="text-caption text-text-secondary"
            v-text="t('chartLive.frequency')"
          />
          <NSelect
            v-model:value="interval"
            :options="speedOptions"
            :aria-label="t('chartLive.frequency')"
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
            @click="toggleData"
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
        <div class="wb-form-panel-header grid min-w-0 gap-content-gap">
          <dl class="m-0 grid grid-cols-3 min-w-0 gap-component-unit">
            <div
              v-for="metric in example.metrics"
              :key="metric.label"
              class="rounded-control grid min-w-0 bg-surface-page gap-component-unit p-page-inline layout-narrow:p-0 layout-narrow:bg-transparent"
            >
              <dt
                class="text-caption text-text-secondary"
                v-text="metric.label"
              />
              <dd
                class="font-title-weight m-0 flex flex-wrap min-w-0 items-baseline tabular-nums gap-component-unit text-subheading text-text-primary"
              >
                <ChartMetricValue
                  :value="metric.value"
                  :locale="locale"
                  :active="active && visible && !showData"
                /><span
                  class="font-body-weight text-caption text-text-secondary"
                  v-text="metric.unit"
                />
              </dd>
            </div>
          </dl>
          <p
            class="m-0 text-body text-text-secondary"
            v-text="description"
          />
        </div>
        <div
          v-if="showData"
          class="wb-form-panel-header min-w-0"
        >
          <dl class="m-0 grid gap-component-unit">
            <div
              v-for="row in example.rows"
              :key="row.key"
              class="min-h-control rounded-control flex flex-wrap items-center justify-between bg-surface-page gap-content-gap px-button-inline"
            >
              <dt
                class="text-body text-text-secondary"
                v-text="row.name"
              />
              <dd
                class="m-0 tabular-nums text-body text-text-primary"
                v-text="`${numberFormat.format(row.value)} ${example.unit}`"
              />
            </div>
          </dl>
        </div>
        <div
          v-else
          class="wb-chart-stage mx-auto flex grow flex-col min-w-0 w-full px-page-inline"
          :data-narrow="narrow"
        >
          <div
            v-if="error"
            role="alert"
            class="flex flex-1 flex-col items-center justify-center gap-content-gap px-page-inline"
          >
            <p
              class="m-0 text-body text-text-secondary"
              v-text="t('chartExamples.error')"
            />
            <NButton @click="retry">
              {{ t('chartExamples.retry') }}
            </NButton>
          </div>
          <UiG2Chart
            v-else
            :key="replay"
            :options="example.options"
            :label="`${title}. ${description}`"
            @error="fail"
          />
        </div>
        <div class="wb-form-panel-header grid min-w-0 gap-component-unit">
          <h2
            class="font-title-weight m-0 text-body text-text-primary"
            v-text="t('chartLive.method')"
          />
          <p
            class="m-0 text-caption text-text-secondary"
            v-text="method"
          />
          <p
            class="m-0 text-caption text-text-secondary"
            v-text="t('chartLive.lifecycle')"
          />
        </div>
      </UiScrollArea>
      <footer
        class="wb-form-panel-header flex shrink-0 flex-wrap items-center justify-between gap-content-gap"
      >
        <div class="grid min-w-0 gap-component-unit">
          <span
            role="status"
            class="text-caption text-text-primary"
            v-text="`${t('chartLive.localSimulation')} · ${status}`"
          />
          <span
            class="tabular-nums text-caption text-text-secondary"
            data-chart-live-tick="true"
            v-text="
              `${t('chartLive.frame')} ${numberFormat.format(tick)} · ${t('chartLive.elapsed')} ${liveSampleTime(tick)}`
            "
          />
        </div>
        <div class="flex flex-wrap gap-component-unit">
          <NButton @click="reset">
            {{ t('chartLive.reset') }}
          </NButton>
          <NButton
            :disabled="running || error"
            @click="step"
          >
            {{ t('chartLive.step') }}
          </NButton>
          <NButton
            type="primary"
            :disabled="error"
            @click="toggleRunning"
          >
            {{ running ? t('chartLive.pause') : t('chartLive.resume') }}
          </NButton>
        </div>
      </footer>
    </section>
  </WorkbenchPage>
</template>
