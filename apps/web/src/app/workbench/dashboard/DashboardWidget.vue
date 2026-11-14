<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NInput } from 'naive-ui/es/input'
import { NCard } from 'naive-ui/es/card'
import { NRadioGroup, NRadioButton } from 'naive-ui/es/radio'
import {
  UiG2Chart,
  UiScrollArea,
  formatUiDateTime,
  useUiDateTime,
  type UiG2ChartOptions,
} from '@platform/ui'
import {
  dashboardDestinationLabels,
  defaultDashboardDestinations,
  type DashboardDestination,
  type DashboardPanel,
  type DashboardTone,
} from '../../dashboard/dashboard-contract'
import { useConsoleI18n } from '../../../shared/i18n'
import { useDashboardActionTheme } from './use-dashboard-action-theme'
import {
  useApplicationNavigation,
  useApplicationLinkActivation,
} from '../../router/application-navigation'
import { registeredRouteDestination } from '../../router/route-input'
const props = defineProps<{ readonly panel: DashboardPanel; readonly tone: DashboardTone }>()
const emit = defineEmits<{ update: [panel: DashboardPanel] }>()
const { t } = useConsoleI18n()
const actionTheme = useDashboardActionTheme()
const dateTime = useUiDateTime()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const now = ref(Date.now())
const revision = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
let active = true
function stop(): void {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}
function start(): void {
  stop()
  if (!active || document.hidden || props.panel.type !== 'clock') return
  now.value = Date.now()
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
}
onMounted(() => {
  document.addEventListener('visibilitychange', start)
  start()
})
onActivated(() => {
  active = true
  start()
})
onDeactivated(() => {
  active = false
  stop()
})
onScopeDispose(() => {
  stop()
  document.removeEventListener('visibilitychange', start)
})
const time = computed(() =>
  dateTime.value
    ? formatUiDateTime(
        { kind: 'timestamp', value: now.value, unit: 'milliseconds' },
        dateTime.value,
        'time',
      )
    : '—',
)
const date = computed(() =>
  dateTime.value
    ? formatUiDateTime(
        { kind: 'timestamp', value: now.value, unit: 'milliseconds' },
        dateTime.value,
        'long-date',
      )
    : '—',
)
const chart = computed<UiG2ChartOptions>(() => {
  const data = Array.from({ length: 7 }, (_, index) => ({
    day: String(index + 1),
    value: ([24, 36, 29, 52, 43, 64, 58][index] ?? 0) + revision.value * ((index % 3) + 1),
  }))
  const shared = {
    data,
    encode: { x: 'day', y: 'value' },
    axis: { x: { title: false }, y: { title: false } },
    tooltip: { title: 'day', items: [{ field: 'value', name: t('dashboardBoard.chartValue') }] },
  }
  if (props.panel.type === 'chart' && props.panel.config.series === 'delivery')
    return { ...shared, type: 'interval', style: { opacity: 1 }, animate: { enter: false } }
  // The card owns entrance. Repeated initial size/theme paints must not replay a mark reveal.
  // Keep native data-update transitions and inherit the resolved theme palette for both marks.
  return {
    ...shared,
    type: 'view',
    children: [
      {
        type: 'area',
        style: { fillOpacity: 0.18, opacity: 1 },
        tooltip: false,
        animate: { enter: false },
      },
      { type: 'line', style: { lineWidth: 2, opacity: 1 }, animate: { enter: false } },
    ],
  }
})
const destinations = computed<readonly DashboardDestination[]>(() =>
  props.panel.type === 'capabilities'
    ? (props.panel.config.destinations ?? defaultDashboardDestinations)
    : [],
)
function note(text: string): void {
  if (props.panel.type === 'notes') emit('update', { ...props.panel, config: { text } })
}
function series(value: string | number | boolean): void {
  if (props.panel.type === 'chart' && (value === 'traffic' || value === 'delivery'))
    emit('update', { ...props.panel, config: { series: value } })
}
</script>
<template>
  <div
    v-if="panel.type === 'chart'"
    class="flex flex-1 flex-col min-h-0 gap-component-unit"
  >
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-component-unit">
      <NRadioGroup
        :value="panel.config.series"
        size="small"
        :name="`${panel.id}-series`"
        :aria-label="t('dashboardBoard.series')"
        @update:value="series"
      >
        <NRadioButton
          class="wb-dashboard-choice"
          value="traffic"
        >
          {{ t('dashboardBoard.trend') }}
        </NRadioButton>
        <NRadioButton
          class="wb-dashboard-choice"
          value="delivery"
        >
          {{ t('dashboardBoard.compare') }}
        </NRadioButton>
      </NRadioGroup>
      <NButton
        size="small"
        type="primary"
        quaternary
        :theme-overrides="actionTheme"
        @click="revision = (revision + 1) % 5"
      >
        {{ t('dashboardBoard.updateSample') }}
      </NButton>
    </div>
    <div class="flex-1 min-h-0 min-w-0">
      <UiG2Chart
        :options="chart"
        :label="t('dashboardBoard.sample')"
      />
    </div>
    <p class="m-0 shrink-0 text-caption text-text-secondary">
      {{ t('dashboardBoard.sample') }}
    </p>
  </div>
  <div
    v-else-if="panel.type === 'notes'"
    class="flex flex-1 flex-col min-h-0 gap-component-unit"
  >
    <NInput
      type="textarea"
      :value="panel.config.text"
      :maxlength="500"
      :resizable="false"
      :input-props="{ 'aria-label': t('dashboardBoard.notes') }"
      :placeholder="t('dashboardBoard.notesEmpty')"
      :aria-label="t('dashboardBoard.notes')"
      class="h-full min-h-0"
      @update:value="note"
    />
  </div>
  <UiScrollArea
    v-else
    :owner-id="`dashboard-widget-${panel.id}`"
    contained
  >
    <div
      v-if="panel.type === 'clock'"
      class="flex flex-col gap-component-unit"
    >
      <strong
        class="tabular-nums text-title"
        :class="{
          'text-expression-accent-a-soft-foreground': tone === 'accent-a',
          'text-expression-accent-b-soft-foreground': tone === 'accent-b',
          'text-text-primary': tone !== 'accent-a' && tone !== 'accent-b',
        }"
        v-text="time"
      />
      <div class="flex flex-wrap items-center gap-component-unit text-caption text-text-secondary">
        <span>{{ date }}</span>
        <span>{{ dateTime?.timeZone }}</span>
      </div>
    </div>
    <div
      v-else
      class="wb-dashboard-shortcuts grid min-w-0 gap-component-unit"
    >
      <NCard
        v-for="destination in destinations"
        :key="destination"
        tag="a"
        :href="navigation.resolveHref(registeredRouteDestination({ name: destination }))"
        size="small"
        :bordered="false"
        hoverable
        class="wb-link min-w-0"
        @click="activate($event, registeredRouteDestination({ name: destination }))"
      >
        <span class="flex min-w-0 w-full items-center justify-between gap-content-gap">
          <span class="flex min-w-0 items-center gap-component-unit">
            <span
              :class="{
                'i-lucide-list-checks': destination === 'component-form-overview',
                'i-lucide-table-2': destination === 'component-table-overview',
                'i-lucide-chart-no-axes-combined': destination === 'component-charts',
                'i-lucide-radio-tower': destination === 'api-overview',
                'i-lucide-boxes': destination === 'component-showcase',
                'i-lucide-palette': destination === 'workbench-colors',
                'i-lucide-sparkles': destination === 'workbench-motion',
                'i-lucide-calendar-clock': destination === 'workbench-date-time',
              }"
              class="shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            <strong class="text-body text-text-primary">{{
              t(dashboardDestinationLabels[destination])
            }}</strong>
          </span>
          <span
            class="i-lucide-arrow-up-right shrink-0 text-text-secondary"
            aria-hidden="true"
          />
        </span>
      </NCard>
      <p
        v-if="destinations.length === 0"
        class="m-0 text-body text-text-secondary"
      >
        {{ t('dashboardBoard.noDestinations') }}
      </p>
    </div>
  </UiScrollArea>
</template>
