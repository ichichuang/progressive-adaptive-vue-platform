<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NInput } from 'naive-ui/es/input'
import { NRadioGroup, NRadioButton } from 'naive-ui/es/radio'
import {
  UiG2Chart,
  UiScrollArea,
  formatUiDateTime,
  useUiDateTime,
  type UiG2ChartOptions,
} from '@platform/ui'
import type { DashboardPanel } from '../../dashboard/dashboard-contract'
import { useConsoleI18n } from '../../../shared/i18n'
import { useApplicationNavigation } from '../../router/application-navigation'
import { registeredRouteDestination } from '../../router/route-input'
const props = defineProps<{ readonly panel: DashboardPanel; readonly editing: boolean }>()
const emit = defineEmits<{ update: [panel: DashboardPanel] }>()
const { t } = useConsoleI18n()
const dateTime = useUiDateTime()
const navigation = useApplicationNavigation()
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
const chart = computed<UiG2ChartOptions>(() => ({
  type:
    props.panel.type === 'chart' && props.panel.config.series === 'delivery' ? 'interval' : 'area',
  data: Array.from({ length: 7 }, (_, index) => ({
    day: String(index + 1),
    value: ([24, 36, 29, 52, 43, 64, 58][index] ?? 0) + revision.value * ((index % 3) + 1),
  })),
  encode: { x: 'day', y: 'value' },
  axis: { x: { title: false }, y: { title: false } },
  tooltip: { title: 'day', items: [{ field: 'value', name: t('dashboardBoard.value') }] },
}))
const links = [
  { route: 'component-form-overview', label: 'dashboard.forms', icon: 'i-lucide-list-checks' },
  { route: 'component-table-overview', label: 'dashboard.tables', icon: 'i-lucide-table-2' },
  { route: 'component-charts', label: 'dashboard.charts', icon: 'i-lucide-chart-no-axes-combined' },
] as const
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
        <NRadioButton value="traffic">
          {{ t('dashboardBoard.trend') }}
        </NRadioButton>
        <NRadioButton value="delivery">
          {{ t('dashboardBoard.compare') }}
        </NRadioButton>
      </NRadioGroup>
      <NButton
        size="small"
        quaternary
        @click="revision = (revision + 1) % 5"
      >
        {{ t('dashboardBoard.updateSample') }}
      </NButton>
    </div>
    <div class="flex-1 min-h-0">
      <UiScrollArea
        :owner-id="`dashboard-chart-${panel.id}`"
        contained
      >
        <div class="wb-dashboard-chart">
          <UiG2Chart
            :options="chart"
            :label="t('dashboardBoard.sample')"
          />
        </div>
      </UiScrollArea>
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
      show-count
      :placeholder="t('dashboardBoard.notePlaceholder')"
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
      class="grid gap-content-gap"
    >
      <span class="text-caption text-text-secondary">{{ dateTime?.timeZone }}</span>
      <strong class="tabular-nums text-expression-accent-a-foreground text-title">{{
        time
      }}</strong>
      <span class="text-body text-text-secondary">{{ date }}</span>
    </div>
    <div
      v-else
      class="grid gap-component-unit"
    >
      <NButton
        v-for="link in links"
        :key="link.route"
        secondary
        block
        @click="navigation.navigate(registeredRouteDestination({ name: link.route }))"
      >
        <template #icon>
          <span
            :class="
              link.route === 'component-form-overview'
                ? 'i-lucide-list-checks'
                : link.route === 'component-table-overview'
                  ? 'i-lucide-table-2'
                  : 'i-lucide-chart-no-axes-combined'
            "
            aria-hidden="true"
          />
        </template>
        {{ t(link.label) }}
      </NButton>
    </div>
  </UiScrollArea>
</template>
