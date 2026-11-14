<script setup lang="ts">
import { computed, onDeactivated, onScopeDispose, ref } from 'vue'
import { NCard } from 'naive-ui/es/card'
import { NSelect } from 'naive-ui/es/select'
import { NSwitch } from 'naive-ui/es/switch'
import {
  UiSection,
  UiG2Chart,
  type UiG2ChartOptions,
  UiForm,
  UiTable,
  useUiClock,
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
const zoneMenuOpen = ref(false)
onDeactivated(() => {
  zoneMenuOpen.value = false
})
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
    dateFormat: globalDateTime.value?.dateFormat ?? 'locale',
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
const chart = computed<UiG2ChartOptions>(() => ({
  type: 'line',
  data: [0, 1, 2, 3].map((hour) => ({
    time: Date.UTC(2026, 0, 1, hour),
    value: [12, 24, 18, 32][hour],
  })),
  encode: { x: 'time', y: 'value' },
  axis: { x: { title: false, labelAutoRotate: false }, y: { title: false } },
  tooltip: { items: [{ field: 'value', name: t('chartExamples.value') }] },
}))
const startedAt = Date.now()
const now = useUiClock()
const liveTime = computed(
  () =>
    formatUiDateTime(
      { kind: 'timestamp', value: now.value, unit: 'milliseconds' },
      context.value,
    ) ?? '—',
)
const examples = computed(() => [
  {
    label: t('dateShowcase.instant'),
    text: formatUiDateTime(sample, context.value),
    hint: t('dateShowcase.instantHint'),
  },
  {
    label: t('dateShowcase.date'),
    text: formatUiDateTime({ kind: 'date', value: '2026-01-01' }, context.value),
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
  <div class="grid min-w-0 gap-content-gap">
    <NCard
      :bordered="false"
      class="shadow-panel"
    >
      <UiSection :title="t('dateShowcase.live')">
        <div class="grid min-w-0 gap-component-unit">
          <strong
            class="font-title-weight tabular-nums text-text-primary text-title"
            v-text="liveTime"
          />
          <span
            class="text-caption text-text-secondary"
            v-text="`${context.timeZone} · ${t('dateShowcase.liveHint')}`"
          />
        </div>
      </UiSection>
    </NCard>
    <NCard
      :bordered="false"
      class="shadow-panel"
    >
      <UiSection
        :title="t('dateShowcase.preview')"
        :description="t('dateShowcase.previewHint')"
      >
        <div class="grid gap-content-gap">
          <div class="flex flex-wrap items-center gap-content-gap">
            <div class="flex-1 min-w-0">
              <NSelect
                v-model:value="timeZone"
                v-model:show="zoneMenuOpen"
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
      </UiSection>
    </NCard>
    <NCard
      :bordered="false"
      class="shadow-panel"
    >
      <UiSection
        :title="t('dateShowcase.chart')"
        :description="t('dateShowcase.chartHint')"
      >
        <div class="wb-chart-preview">
          <UiG2Chart
            :options="chart"
            :label="t('dateShowcase.chart')"
            :date-time="context"
            :date-time-channels="{ x: { kind: 'timestamp', unit: 'milliseconds', preset: 'time' } }"
          />
        </div>
      </UiSection>
    </NCard>
    <NCard
      :bordered="false"
      class="shadow-panel"
    >
      <UiSection
        :title="t('dateShowcase.integration')"
        :description="t('dateShowcase.integrationHint')"
      >
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
      </UiSection>
    </NCard>
  </div>
</template>
