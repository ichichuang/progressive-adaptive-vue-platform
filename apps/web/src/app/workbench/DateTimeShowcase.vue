<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onScopeDispose, ref } from 'vue'
import { NCard } from 'naive-ui/es/card'
import { NSelect } from 'naive-ui/es/select'
import { NSwitch } from 'naive-ui/es/switch'
import {
  UiSection,
  UiG2Chart,
  type UiG2ChartOptions,
  UiForm,
  UiTable,
  UiCopyAction,
  useUiForm,
  useUiDateTime,
  useUiTable,
  formatUiDateTime,
  formatUiRelativeTime,
  type UiDateTimeContext,
} from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'
import { useFormShowcase } from './forms/form-showcase'
import { useTableShowcase } from './tables/table-showcase'
const { t, locale } = useConsoleI18n()
const globalDateTime = useUiDateTime()
const timeZone = ref('global')
const twelveHour = ref<boolean>()
const zones = computed(() => [
  { label: t('dateShowcase.followGlobal'), value: 'global' },
  ...['Asia/Shanghai', 'UTC', 'America/New_York', 'Europe/London'].map((value) => ({
    label: value,
    value,
  })),
])
const context = computed<UiDateTimeContext>(() => {
  if (timeZone.value === 'global' && globalDateTime.value) return globalDateTime.value
  return {
    locale: locale.value,
    timeZone: timeZone.value === 'global' ? 'UTC' : timeZone.value,
    hourCycle:
      twelveHour.value === undefined
        ? (globalDateTime.value?.hourCycle ?? 'h23')
        : twelveHour.value
          ? 'h12'
          : 'h23',
  }
})
const formDemo = useFormShowcase()
const tableDemo = useTableShowcase()
const form = useUiForm({
  ...formDemo,
  formId: 'date-time-detail',
  schema: {
    columns: 2,
    fields: [
      { kind: 'date', name: 'date', label: 'dateShowcase.date' },
      { kind: 'time', name: 'time', label: 'dateShowcase.time' },
    ],
  },
  initial: { draftId: 'date-time-example', values: { date: '2026-01-01', time: '09:30:00' } },
})
const table = useUiTable({
  schema: {
    id: 'date-time-table',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [
      { key: 'instant', title: 'dateShowcase.instant', dateTime: { kind: 'instant' } },
      {
        key: 'date',
        title: 'dateShowcase.date',
        minWidth: 128,
        overflow: 'ellipsis',
        dateTime: { kind: 'date' },
      },
    ],
  },
  rows: [{ id: 1, instant: '2026-01-01T00:30:00Z', date: '2026-01-01' }],
  translate: formDemo.translate,
})
onScopeDispose(() => {
  form.dispose()
  table.dispose()
})
const sample = { kind: 'instant', value: '2026-01-01T00:30:00Z' } as const
const chart = computed<UiG2ChartOptions>(() => {
  const format = (value: number) =>
    formatUiDateTime(
      { kind: 'timestamp', value, unit: 'milliseconds' },
      context.value,
      'datetime',
    ) ?? '—'
  return {
    type: 'line',
    data: [0, 1, 2, 3].map((hour) => ({
      time: Date.UTC(2026, 0, 1, hour),
      value: [12, 24, 18, 32][hour],
      label: format(Date.UTC(2026, 0, 1, hour)),
    })),
    encode: { x: 'time', y: 'value' },
    axis: {
      x: {
        title: false,
        labelFormatter: (value: number) =>
          formatUiDateTime(
            { kind: 'timestamp', value, unit: 'milliseconds' },
            context.value,
            'time',
          ) ?? '—',
        labelAutoRotate: false,
      },
      y: { title: false },
    },
    tooltip: { title: 'label', items: [{ field: 'value', name: t('chartExamples.value') }] },
  }
})
const startedAt = Date.now()
const now = ref(startedAt)
let timer: ReturnType<typeof setInterval> | undefined
let active = true
function stop(): void {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}
function start(): void {
  stop()
  if (!active || document.hidden) return
  now.value = Date.now()
  timer = setInterval(() => {
    if (!document.hidden) now.value = Date.now()
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
  document.removeEventListener('visibilitychange', start)
  stop()
})
const examples = computed(() => [
  {
    label: t('dateShowcase.instant'),
    text: formatUiDateTime(sample, context.value),
    hint: t('dateShowcase.instantHint'),
  },
  {
    label: t('dateShowcase.date'),
    text: formatUiDateTime({ kind: 'date', value: '2026-01-01' }, context.value, 'long-date'),
    hint: t('dateShowcase.dateHint'),
  },
  {
    label: t('dateShowcase.time'),
    text: formatUiDateTime({ kind: 'time', value: '09:30:00' }, context.value, 'time'),
    hint: t('dateShowcase.timeHint'),
  },
  {
    label: t('dateShowcase.relative'),
    text: formatUiRelativeTime(
      { kind: 'timestamp', value: startedAt, unit: 'milliseconds' },
      context.value,
      now.value,
    ),
    hint: t('dateShowcase.relativeHint'),
  },
])
</script>
<template>
  <NCard
    :bordered="false"
    class="shadow-panel"
  >
    <UiSection
      :title="t('dateShowcase.title')"
      :description="t('dateShowcase.description')"
    >
      <div class="grid gap-content-gap">
        <div class="flex flex-wrap items-center gap-content-gap">
          <div class="flex-1 min-w-0">
            <NSelect
              v-model:value="timeZone"
              :options="zones"
              :aria-label="t('dateShowcase.zone')"
            />
          </div>
          <NSwitch
            :value="context.hourCycle === 'h12'"
            :disabled="timeZone === 'global'"
            :aria-disabled="timeZone === 'global'"
            :aria-label="t('dateShowcase.hours')"
            @update:value="twelveHour = $event"
          >
            <template #checked>
              <span v-text="'12h'" />
            </template>
            <template #unchecked>
              <span v-text="'24h'" />
            </template>
          </NSwitch>
        </div>
        <div
          class="grid gap-content-gap layout-narrow:grid-cols-1 layout-regular:grid-cols-2 layout-wide:grid-cols-2"
        >
          <div
            v-for="example in examples"
            :key="example.label"
            class="rounded-control grid min-w-0 bg-surface-page gap-component-unit p-page-inline"
          >
            <span class="text-caption text-text-secondary">{{ example.label }}</span>
            <strong class="text-body text-text-primary">{{ example.text ?? '—' }}</strong>
            <span class="text-caption text-text-secondary">{{ example.hint }}</span>
          </div>
        </div>
      </div>
      <div class="wb-chart-preview">
        <UiG2Chart
          :options="chart"
          :label="t('dateShowcase.title')"
        />
      </div>
      <UiTable
        :table="table"
        :copy="tableDemo.tableCopy"
        :date-time="context"
      />
      <UiForm
        :form="form"
        mode="detail"
        :date-time="context"
      />
      <UiCopyAction
        variant="tertiary"
        value="formatUiDateTime · formatUiRelativeTime · UiTable.dateTime · UiForm.dateTime · explicit locale/timeZone · date-only/time-only/instant"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('formShowcase.copyAI')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </UiSection>
  </NCard>
</template>
