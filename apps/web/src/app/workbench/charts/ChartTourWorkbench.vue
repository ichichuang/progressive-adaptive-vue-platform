<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import {
  UiCopyAction,
  UiG2Chart,
  UiScrollArea,
  type UiG2ChartHandle,
  type UiG2ChartOptions,
  type UiScrollController,
  type UiChartTourState,
} from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import { useConsoleI18n } from '../../../shared/i18n'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'

defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
const active = ref(true)
const kind = ref<'bar' | 'line' | 'donut'>('bar')
const chart = ref<UiG2ChartHandle | null>(null)
const revision = ref(0)
const state = ref<UiChartTourState>({ status: 'stopped', targetId: null, reason: null })
const modeKeys = { bar: 'chartTour.bar', line: 'chartTour.line', donut: 'chartTour.donut' } as const
const statusKeys = {
  playing: 'chartTour.playing',
  paused: 'chartTour.paused',
  waiting: 'chartTour.waiting',
  stopped: 'chartTour.stopped',
} as const
const reasonKeys = {
  user: 'chartTour.paused',
  interaction: 'chartTour.interaction',
  hidden: 'chartTour.hidden',
  motion: 'chartTour.motion',
  rendering: 'chartTour.rendering',
  empty: 'chartTour.empty',
} as const
const names = ['09:00', '10:00', '11:00', '12:00', '13:00']
const rows = computed(() =>
  names.map((name, index) => ({
    name,
    value: Math.round(60 + index * 12 + Math.sin(index + revision.value) * 20),
  })),
)
const tour = computed(() => ({
  autoplay: true,
  intervalMs: 4000,
  loop: true,
  targets: names.map((name) => ({ id: name, field: 'name', value: name })),
}))
const options = computed<UiG2ChartOptions>(() => {
  const data = rows.value
  if (kind.value === 'line') {
    const points = data.flatMap((row) => [
      { ...row, channel: t('chartTour.direct'), key: `A-${row.name}` },
      {
        ...row,
        value: Math.round(row.value * 0.65),
        channel: t('chartTour.partner'),
        key: `B-${row.name}`,
      },
    ])
    return {
      type: 'view',
      data: points,
      encode: { x: 'name', y: 'value', color: 'channel' },
      axis: { x: { title: false }, y: { title: false } },
      children: [
        {
          type: 'line',
          encode: { shape: 'smooth' },
          tooltip: { title: 'name', items: [{ channel: 'y' }] },
        },
        { type: 'point', encode: { key: 'key' }, tooltip: false },
      ],
    }
  }
  if (kind.value === 'donut')
    return {
      type: 'interval',
      data,
      coordinate: { type: 'theta', innerRadius: 0.65 },
      transform: [{ type: 'stackY' }],
      encode: { y: 'value', color: 'name', key: 'name' },
      tooltip: { title: 'name', items: [{ field: 'value', name: t('chartExamples.value') }] },
      legend: false,
    }
  return {
    type: 'interval',
    data,
    encode: { x: 'name', y: 'value', color: 'name', key: 'name' },
    tooltip: { title: 'name', items: [{ field: 'value', name: t('chartExamples.value') }] },
    legend: false,
    axis: { x: { title: false }, y: { title: false } },
    scale: { y: { domain: [0, 160], nice: false } },
    labels: [{ text: 'value', position: 'top' }],
  }
})
const focusedValue = computed(() => {
  const row = rows.value.find((item) => item.name === state.value.targetId)
  return row
    ? kind.value === 'line'
      ? `${t('chartTour.direct')} ${String(row.value)} · ${t('chartTour.partner')} ${String(Math.round(row.value * 0.65))}`
      : String(row.value)
    : '—'
})
const copy = computed(() =>
  JSON.stringify(
    {
      component: 'UiG2Chart',
      label: t(modeKeys[kind.value]),
      options: options.value,
      tour: tour.value,
    },
    null,
    2,
  ),
)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Chart tour requires the Router Scroll Controller port.')
let controller: UiScrollController | null = null
let unregister: (() => void) | undefined
function connect(value: UiScrollController | null): void {
  controller = value
  unregister?.()
  unregister = value && active.value ? register?.(value) : undefined
}
onActivated(() => {
  active.value = true
  connect(controller)
})
onDeactivated(() => {
  active.value = false
  unregister?.()
  unregister = undefined
})
onScopeDispose(() => unregister?.())
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
        :value="copy"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <section
      class="wb-table-stage rounded-panel flex flex-1 flex-col min-h-0 min-w-0 bg-surface-panel"
      :aria-label="title"
    >
      <header
        class="wb-form-panel-header flex shrink-0 flex-wrap items-center justify-between gap-content-gap"
      >
        <div class="flex flex-wrap gap-component-unit">
          <NButton
            v-for="mode in ['bar', 'line', 'donut'] as const"
            :key="mode"
            :type="kind === mode ? 'primary' : 'default'"
            secondary
            :aria-pressed="kind === mode"
            @click="kind = mode"
          >
            {{ t(modeKeys[mode]) }}
          </NButton>
        </div>
        <span class="text-caption text-text-secondary">{{ t('chartTour.sample') }}</span>
      </header>
      <UiScrollArea
        contained
        owner-id="architecture-console-content"
        :enabled="active"
        class="flex-1 min-h-0"
        @controller="connect"
      >
        <div class="wb-form-panel-header flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap">
          <div class="flex flex-wrap items-center justify-between gap-component-unit">
            <h2 class="m-0 text-subheading text-text-primary">
              {{ state.targetId ?? t(modeKeys[kind]) }} · {{ focusedValue }}
            </h2>
            <span class="text-caption text-text-secondary">{{
              t(state.reason ? reasonKeys[state.reason] : statusKeys[state.status])
            }}</span>
          </div>
          <div class="flex-1 min-h-0 min-w-0">
            <UiG2Chart
              :key="kind"
              ref="chart"
              :options="options"
              :tour="tour"
              :label="t(modeKeys[kind])"
              @tour-change="state = $event"
            />
          </div>
          <p class="m-0 text-caption text-text-secondary">
            {{ t('chartTour.hint') }}
          </p>
        </div>
      </UiScrollArea>
      <footer
        class="wb-form-panel-header flex shrink-0 flex-wrap items-center justify-between gap-content-gap"
      >
        <div class="flex flex-wrap gap-component-unit">
          <NButton @click="chart?.previousTour()">
            {{ t('chartTour.previous') }}
          </NButton>
          <NButton
            type="primary"
            @click="chart?.playTour()"
          >
            {{ t('chartTour.play') }}
          </NButton>
          <NButton @click="chart?.pauseTour()">
            {{ t('chartTour.pause') }}
          </NButton>
          <NButton @click="chart?.nextTour()">
            {{ t('chartTour.next') }}
          </NButton>
          <NButton @click="chart?.stopTour()">
            {{ t('chartTour.stop') }}
          </NButton>
        </div>
        <NButton @click="revision++">
          {{ t('chartExamples.update') }}
        </NButton>
      </footer>
    </section>
  </WorkbenchPage>
</template>
