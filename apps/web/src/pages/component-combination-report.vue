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
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import {
  UiForm,
  UiTable,
  UiG2Chart,
  UiScrollArea,
  UiCopyAction,
  UiReportPreview,
  useUiForm,
  useUiTable,
  captureUiFormReport,
  captureUiTableReport,
  captureUiChartReport,
  createUiReportSnapshot,
  type UiReportSnapshot,
  type UiReportCopy,
  type UiG2ChartHandle,
  type UiG2ChartOptions,
  type UiTableCsvScope,
  type UiScrollController,
} from '@platform/ui'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import { useTableShowcase } from '../app/workbench/tables/table-showcase'
import { reportExampleForm, reportExampleTable } from '../app/workbench/reports/report-example'
defineOptions({ name: 'ComponentCombinationReportPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useTableShowcase()
const { t } = demo
function translate(value: string): string {
  switch (value) {
    case 'reportExample.titleLabel':
      return t('reportExample.titleLabel')
    case 'reportExample.notesLabel':
      return t('reportExample.notesLabel')
    case 'reportExample.item':
      return t('reportExample.item')
    case 'reportExample.value':
      return t('reportExample.value')
    default:
      return demo.translate(value)
  }
}
const form = useUiForm({
  ...demo,
  translate,
  formId: 'report-example',
  schema: reportExampleForm,
  initial: { draftId: 'report-example', values: {} },
})
const records = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `PAVP ${String(i + 1).padStart(2, '0')}`,
  value: 40 + ((i * 17) % 70),
}))
const table = useUiTable({ schema: reportExampleTable, rows: records, translate })
const scope = ref<UiTableCsvScope>('page')
const chart = ref<UiG2ChartHandle>()
const snapshot = ref<UiReportSnapshot | null>(null)
const show = ref(false)
const busy = ref(false)
const failure = ref(false)
const chartReady = ref(false)
const chartOptions = computed<UiG2ChartOptions>(() => ({
  type: 'interval',
  data: table.rows.value
    .filter(
      (row) => scope.value === 'page' || table.selectedKeys.value.includes(row['id'] as number),
    )
    .map((row) => ({ name: row['name'], value: row['value'] })),
  encode: { x: 'name', y: 'value', color: 'name' },
  legend: false,
  axis: { x: { title: false }, y: { title: false } },
}))
watch(
  chartOptions,
  () => {
    chartReady.value = false
  },
  { flush: 'sync' },
)
const unavailable = computed(
  () =>
    !chartReady.value ||
    table.loading.value ||
    (scope.value === 'selected' && table.selectedKeys.value.length === 0),
)
const reportCopy: UiReportCopy = {
  close: () => t('reportExample.close'),
  print: () => t('reportExample.print'),
  preparing: () => t('reportExample.preparing'),
  failed: () => t('reportExample.failed'),
  capturedAt: (value) => `${t('reportExample.captured')} ${value}`,
  tableScope: (section) =>
    `${t(section.scope === 'page' ? 'reportExample.page' : 'reportExample.selected')} · ${t('reportExample.included')} ${String(section.rows.length)} · ${t('reportExample.pageNumber')} ${String(section.page)}`,
}
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Report examples require the Router Scroll Controller port.')
let active = true
let scrollController: UiScrollController | null = null
let unregister: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  scrollController = controller
  unregister?.()
  unregister = controller && active ? register?.(controller) : undefined
}
onActivated(() => {
  active = true
  connect(scrollController)
})
onDeactivated(() => {
  active = false
  unregister?.()
  unregister = undefined
})
onScopeDispose(() => {
  unregister?.()
  scrollController = null
})
let generation = 0
let abort: AbortController | undefined
function cancel() {
  generation++
  abort?.abort()
  abort = undefined
  busy.value = false
  show.value = false
}
async function generate() {
  cancel()
  const token = generation
  busy.value = true
  failure.value = false
  abort = new AbortController()
  try {
    if ((await form.validate()) !== 'valid') return
    if (token !== generation) return
    if (!chart.value || !chartReady.value || table.loading.value)
      throw new Error('Chart is not ready.')
    const capturedTitle = form.getValues().title
    const capturedAt = new Date().toISOString()
    const formSection = captureUiFormReport(form, { title: t('reportExample.details') })
    const tableSection = captureUiTableReport(table, {
      title: t('reportExample.records'),
      scope: scope.value,
      empty: t('configuredForm.empty'),
      boolean: (value) => (value ? t('configuredForm.yes') : t('configuredForm.no')),
    })
    const chartSection = await captureUiChartReport(chart.value, {
      title: t('reportExample.chart'),
      alt: t('reportExample.chart'),
      signal: abort.signal,
    })
    if (token !== generation) return
    snapshot.value = createUiReportSnapshot({
      title: capturedTitle,
      capturedAt,
      sections: [formSection, tableSection, chartSection],
    })
    show.value = true
  } catch {
    if (token === generation) failure.value = true
  } finally {
    if (token === generation) busy.value = false
  }
}
onMounted(() => {
  void table.refresh()
})
onDeactivated(cancel)
onScopeDispose(() => {
  cancel()
  form.dispose()
  table.dispose()
})
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="message"
    contained
    class="wb-form-page mx-auto w-full"
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        value="UiReportPreview · captureUiFormReport · captureUiTableReport · captureUiChartReport · createUiReportSnapshot"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <section
      class="rounded-panel flex flex-1 flex-col min-h-0 min-w-0 shadow-panel bg-surface-panel"
      :aria-label="title"
    >
      <UiScrollArea
        owner-id="architecture-console-content"
        contained
        class="flex-1 min-h-0"
        @controller="connect"
      >
        <div class="grid min-w-0 gap-content-gap p-page-inline">
          <div class="grid grid-cols-2 min-w-0 gap-content-gap layout-narrow:grid-cols-1">
            <section
              class="rounded-panel grid min-w-0 content-start bg-surface-page gap-content-gap p-page-inline"
              :aria-label="t('reportExample.details')"
            >
              <h2 class="font-title-weight m-0 text-subheading">
                {{ t('reportExample.details') }}
              </h2>
              <UiForm :form="form">
                <template #actions>
                  <span />
                </template>
              </UiForm>
            </section>
            <section
              class="rounded-panel min-w-0 bg-surface-page p-page-inline"
              :aria-label="t('reportExample.chart')"
            >
              <h2 class="font-title-weight m-0 text-subheading">
                {{ t('reportExample.chart') }}
              </h2>
              <div class="wb-chart-preview min-w-0">
                <UiG2Chart
                  ref="chart"
                  :options="chartOptions"
                  :label="t('reportExample.chart')"
                  @rendered="chartReady = true"
                  @error="chartReady = false"
                />
              </div>
            </section>
          </div>
          <section
            class="rounded-panel grid min-w-0 bg-surface-page gap-content-gap p-page-inline"
            :aria-label="t('reportExample.records')"
          >
            <div class="flex flex-wrap items-center justify-between gap-component-unit">
              <h2 class="font-title-weight m-0 text-subheading">
                {{ t('reportExample.records') }}
              </h2>
              <span class="text-caption text-text-secondary">{{ t('reportExample.local') }}</span>
            </div>
            <UiTable
              :table="table"
              :copy="demo.tableCopy"
            />
          </section>
        </div>
      </UiScrollArea>
      <footer
        class="flex shrink-0 flex-wrap items-center justify-between gap-content-gap p-page-inline"
      >
        <NRadioGroup
          v-model:value="scope"
          :aria-label="t('reportExample.scope')"
          :disabled="busy"
        >
          <NRadioButton value="page">
            {{ t('reportExample.page') }}
          </NRadioButton>
          <NRadioButton value="selected">
            {{ t('reportExample.selected') }}
          </NRadioButton>
        </NRadioGroup>
        <NButton
          type="primary"
          :loading="busy"
          :disabled="unavailable"
          @click="generate"
        >
          {{ failure ? t('reportExample.retry') : t('reportExample.preview') }}
        </NButton>
        <span
          class="w-full text-caption text-text-secondary"
          role="status"
          aria-live="polite"
        >
          {{ failure ? t('reportExample.failed') : '\u00a0' }}
        </span>
      </footer>
    </section>
    <UiReportPreview
      v-model:show="show"
      :snapshot="snapshot"
      :copy="reportCopy"
    />
  </WorkbenchPage>
</template>
