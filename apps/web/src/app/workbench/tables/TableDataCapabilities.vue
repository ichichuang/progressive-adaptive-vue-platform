<script setup lang="ts">
import {
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  computed,
  effectScope,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from 'vue'

import {
  UiForm,
  UiScrollArea,
  UiTable,
  useUiTable,
  useUiTableQuery,
  type UiTableReadonlyRecord,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NCheckbox } from 'naive-ui/es/checkbox'
import { NCard } from 'naive-ui/es/card'
import { NModal } from 'naive-ui/es/modal'
import { NSelect } from 'naive-ui/es/select'
import { useConsoleI18n, type ConsoleMessageKey } from '../../../shared/i18n'
import TableCapabilityWorkbench from './TableCapabilityWorkbench.vue'
import { useTableShowcase } from './table-showcase'
import { tableSampleCategoryText } from './table-sample-categories'
import {
  createTableDemoTransport,
  tableDemoSortComparators,
  type TableSortExample,
  tableCapabilityRows,
  tableDataCapabilitySchema,
  tableFilterSampleRows,
  tableSampleNotes,
  type TableDataCapability,
  type TableDemoResponse,
} from './table-data-capabilities'

const props = withDefaults(
  defineProps<{
    readonly title: string
    readonly message: string
    readonly example: TableDataCapability
    readonly queryMode?: 'submit' | 'change'
    readonly debounce?: number
    readonly sorting?: TableSortExample
    readonly continuous?: boolean
    readonly inlineView?: Readonly<{ copyValue: string }> | null
  }>(),
  { queryMode: 'submit', debounce: 250, sorting: 'single', continuous: false, inlineView: null },
)
defineSlots<{ controls?: () => unknown; inline?: () => unknown }>()
const demo = useTableShowcase()
const { t, formatLabelValue } = demo
const { locale } = useConsoleI18n()
const activeInlineView = computed(() => (props.example === 'rendering' ? props.inlineView : null))
const tableCopy = {
  ...demo.tableCopy,
  error: () =>
    props.example === 'states' ? t('tableCapabilities.data.failureStatus') : demo.tableCopy.error(),
}
const translate = (value: string) =>
  value.startsWith('tableCapabilities.data.')
    ? t(value as ConsoleMessageKey)
    : demo.translate(value)
const notes = tableSampleNotes(t)
const rows =
  props.example === 'rendering'
    ? [
        {
          id: 1,
          title: 'PAVP 0001',
          amount: 0,
          enabled: false,
          date: '2026-11-10',
          category: 'Design',
          profile: { name: 'Alex' },
          note: notes.long.value,
        },
        {
          id: 2,
          title: 'PAVP 0002',
          amount: 1280.5,
          enabled: true,
          date: '2026-11-10T09:30:00+08:00',
          category: 'Engineering',
          profile: { name: 'Sam' },
          note: notes.offset.value,
        },
        {
          id: 3,
          title: 'PAVP 0003',
          amount: null,
          enabled: null,
          date: null,
          category: null,
          profile: { name: null },
          note: notes.missing.value,
        },
      ]
    : props.example === 'sorting'
      ? tableFilterSampleRows(36, notes.available.value)
      : tableCapabilityRows(props.example === 'virtual' ? 2000 : 36)
const simulation = createTableDemoTransport(rows, () =>
  t('tableCapabilities.data.simulatedFailure'),
)
function createModel() {
  const scope = effectScope(true)
  try {
    const model = scope.run(() => {
      const baseSchema = tableDataCapabilitySchema(
        props.example,
        notes,
        props.queryMode,
        props.debounce,
        props.sorting,
      )
      const schema = props.continuous
        ? { ...baseSchema, pagination: { mode: 'load-more' as const, pageSize: 100 } }
        : baseSchema
      const table = useUiTable({
        schema,
        locale,
        sortComparators: tableDemoSortComparators,
        rows,
        ...(props.example === 'states' ? { transport: simulation.transport } : {}),
        translate,
      })
      const query = schema.query
        ? useUiTableQuery(table, {
            ...demo.copy,
            submit: () => t('tableShowcase.search'),
            submitSucceeded: () => '',
          })
        : null
      return { schema, table, query }
    })
    if (!model) throw new TypeError('The table model scope is unavailable.')
    return {
      ...model,
      dispose: () => {
        scope.stop()
      },
    }
  } catch (error) {
    scope.stop()
    throw error
  }
}
const model = shallowRef(createModel())
const table = computed(() => model.value.table)
const query = computed(() => model.value.query)
const modelKey = computed(() => {
  if (props.example === 'virtual') return props.continuous ? 'continuous' : 'paged'
  if (props.example === 'sorting')
    return `${props.queryMode}-${String(props.debounce)}-${props.sorting}`
  return 'display'
})
const contentKey = computed(() => (activeInlineView.value ? 'inline' : modelKey.value))
const virtualScroll = ref(true)
const response = ref<TableDemoResponse>('rows')
const detail = shallowRef<UiTableReadonlyRecord | null>(null)
const detailNote = computed(() => {
  const note = detail.value?.['note']
  const option = Object.values(notes).find(({ value }) => value === note)
  return option ? t(option.label) : note
})
const detailOpen = ref(false)
const filtersOpen = ref(false)
watch(modelKey, () => {
  // The sorting and virtual specimens use local table models. Their configuration resets
  // keep workbench controls and the Router scroll owner mounted.
  filtersOpen.value = false
  if (props.example === 'virtual') virtualScroll.value = true
  model.value.dispose()
  model.value = createModel()
})
onScopeDispose(() => {
  model.value.dispose()
})
watch(
  () => activeInlineView.value !== null,
  (inline) => {
    if (inline) detailOpen.value = false
  },
)
// Retained pages must release teleported overlays when leaving their route.
onDeactivated(() => {
  filtersOpen.value = false
  detailOpen.value = false
})
const hintKeys = {
  sorting: 'tableCapabilities.data.sortingHint',
  rendering: 'tableCapabilities.data.renderingHint',
  virtual: 'tableCapabilities.data.virtualHint',
  states: 'tableCapabilities.data.statesHint',
} as const satisfies Record<TableDataCapability, ConsoleMessageKey>
const responseKeys = {
  rows: 'tableCapabilities.data.response.rows',
  empty: 'tableCapabilities.data.response.empty',
  error: 'tableCapabilities.data.response.error',
  slow: 'tableCapabilities.data.response.slow',
} as const satisfies Record<TableDemoResponse, ConsoleMessageKey>
const responseOptions = computed(() =>
  (['rows', 'empty', 'error', 'slow'] as const).map((value) => ({
    value,
    label: t(responseKeys[value]),
  })),
)
const applied = computed(() =>
  Object.entries(table.value.query.value.filters)
    .flatMap(([key, value]) => {
      if (value === '' || value === null) return []
      if (key === 'priceRange' && typeof value === 'object' && !Array.isArray(value)) {
        const bounds = value as Readonly<Record<string, unknown>>
        if (bounds['min'] === null && bounds['max'] === null) return []
        return [
          formatLabelValue(
            t('tableCapabilities.data.priceRange'),
            `${typeof bounds['min'] === 'number' ? String(bounds['min']) : '…'} – ${typeof bounds['max'] === 'number' ? String(bounds['max']) : '…'}`,
          ),
        ]
      }
      if (key === 'dates' && Array.isArray(value))
        return [formatLabelValue(t('tableCapabilities.data.dateRange'), value.join(' – '))]
      if (key === 'noteState')
        return [
          t(value === 'empty' ? 'tableCapabilities.data.empty' : 'tableCapabilities.data.notEmpty'),
        ]
      if (key === 'category' && typeof value === 'string')
        return [formatLabelValue(t('tableShowcase.category'), tableSampleCategoryText(value, t))]
      const label =
        key === 'nameMatch'
          ? t('tableCapabilities.data.fuzzyName')
          : translate(
              key === 'keyword'
                ? 'tableShowcase.search'
                : key === 'title'
                  ? 'tableShowcase.title'
                  : 'tableShowcase.category',
            )
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? [formatLabelValue(label, String(value))]
        : []
    })
    .join(' · '),
)
const sortLabel = computed(() => {
  const sorts = table.value.query.value.sorts
  if (!sorts.length) return t('tableCapabilities.data.unsorted')
  return sorts
    .map((sort, index) => {
      const column = model.value.schema.columns.find((item) => item.key === sort.key)
      return `${String(index + 1)}. ${translate(column?.title ?? sort.key)} · ${t(sort.order === 'ascend' ? 'tableCapabilities.data.ascending' : 'tableCapabilities.data.descending')}`
    })
    .join(' → ')
})
const requestLabel = computed(() => {
  const request = simulation.lastRequest.value
  if (!request) return ''
  return Object.entries(request.params)
    .filter(([, value]) => value !== '' && value !== null)
    .map(
      ([key, value]) =>
        `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`,
    )
    .join(' · ')
})
const copyValue = computed(() =>
  [
    t('tableExamples.aiRequest'),
    props.title,
    props.message,
    t(hintKeys[props.example]),
    ...(props.example === 'sorting'
      ? [
          'useUiTable · schema.sorting · setSorts · query.sorts · sortComparators · column.sortComparator',
        ]
      : []),
    ...(props.example === 'rendering' ? [t('tableCapabilities.data.renderingSlot')] : []),
    ...(props.example === 'states' ? [t('tableCapabilities.data.transportCopy')] : []),
    'apps/web/src/app/workbench/tables/TableDataCapabilities.vue',
    'apps/web/src/app/workbench/tables/table-data-capabilities.ts',
    JSON.stringify(
      {
        schema: model.value.schema,
        props: {
          ...(props.example === 'virtual' ? { virtualScroll: virtualScroll.value } : {}),
          ...(props.example === 'rendering' ? { rowActionsWidth: 112 } : {}),
        },
        dataSource:
          props.example === 'states'
            ? 'local asynchronous request simulation'
            : 'deterministic local records',
        records: rows.length,
      },
      null,
      2,
    ),
  ].join('\n\n'),
)
function runRequest(): void {
  simulation.nextResponse.value = response.value
  void table.value.refresh()
}
function openDetail(row: UiTableReadonlyRecord): void {
  detail.value = row
  detailOpen.value = true
}
</script>

<template>
  <TableCapabilityWorkbench
    :title="title"
    :message="message"
    :copy-value="activeInlineView?.copyValue ?? copyValue"
    :content-key="contentKey"
  >
    <template #controls>
      <UiScrollArea
        owner-id="table-capability-controls"
        x-scrollable
      >
        <div
          class="flex items-center gap-content-gap"
          :class="
            example === 'rendering'
              ? 'flex-nowrap w-max'
              : 'flex-wrap layout-narrow:flex-nowrap layout-narrow:w-max'
          "
        >
          <slot name="controls" />
          <NCheckbox
            v-if="example === 'virtual'"
            v-model:checked="virtualScroll"
          >
            {{ t('tableCapabilities.data.virtualEnabled') }}
          </NCheckbox>
          <div
            v-if="example === 'states'"
            class="flex min-w-0 w-full items-center gap-component-unit"
          >
            <NSelect
              v-model:value="response"
              class="flex-1 min-w-0"
              :options="responseOptions"
              filterable
              :input-props="{ 'aria-label': t('tableCapabilities.data.nextResponse') }"
            />
            <NButton
              type="primary"
              class="shrink-0"
              @click="runRequest"
            >
              {{
                t(
                  table.loading.value
                    ? 'tableCapabilities.data.replaceRequest'
                    : 'tableCapabilities.data.runRequest',
                )
              }}
            </NButton>
          </div>
          <NButton
            v-if="query"
            secondary
            @click="filtersOpen = true"
          >
            {{ t('tableCapabilities.data.filters') }}
          </NButton>
          <p
            v-if="example === 'states'"
            class="m-0 min-w-0 text-caption text-text-secondary"
          >
            {{ t('tableCapabilities.data.localSimulation') }}
          </p>
          <p
            v-if="example === 'sorting'"
            class="m-0 min-w-0 text-caption text-text-secondary"
          >
            {{
              t(
                sorting === 'business'
                  ? 'tableCapabilities.data.businessHint'
                  : sorting === 'multiple'
                    ? 'tableCapabilities.data.multipleHint'
                    : 'tableCapabilities.data.sortingCompact',
              )
            }}
          </p>
          <p
            v-if="!query && !activeInlineView"
            class="m-0 min-w-0 text-caption text-text-secondary"
          >
            {{ t(continuous ? 'tableShowcase.continuousHint' : hintKeys[example]) }}
          </p>
        </div>
      </UiScrollArea>
    </template>
    <slot
      v-if="activeInlineView"
      name="inline"
    />
    <UiTable
      v-else
      :table="table"
      :copy="tableCopy"
      :row-actions-width="112"
      :virtual-scroll="example === 'virtual' && virtualScroll"
    >
      <template #actions>
        <span
          :class="{ invisible: table.loading.value || table.error.value }"
          class="text-caption text-text-secondary"
        >
          {{ t('tableExamples.results') }} {{ table.total.value }}
          <span
            v-if="example === 'virtual'"
            v-text="
              continuous
                ? ` · ${table.rows.value.length} / ${table.total.value}`
                : ` · ${t('tableCapabilities.data.onePage')}`
            "
          />
          <span
            v-if="example === 'sorting'"
            v-text="` · ${t('tableExamples.selected')} ${String(table.selectedKeys.value.length)}`"
          />
        </span>
        <NButton
          v-if="example === 'sorting'"
          text
          :disabled="table.query.value.sorts.length === 0"
          @click="table.setSorts([])"
        >
          {{ t('tableCapabilities.data.clearSort') }}
        </NButton>
        <NButton
          v-if="example === 'sorting'"
          text
          :disabled="table.selectedKeys.value.length === 0"
          @click="table.setSelection([])"
        >
          {{ t('tableExamples.clearSelection') }}
        </NButton>
      </template>
      <template
        v-if="example === 'rendering'"
        #rowActions="{ row }"
      >
        <NButton
          text
          type="primary"
          v-bind="
            {
              'aria-label': `${t('tableCapabilities.data.details')} ${String(row['title'])}`,
            } satisfies ButtonHTMLAttributes
          "
          @click="openDetail(row)"
        >
          {{ t('tableCapabilities.data.details') }}
        </NButton>
      </template>
    </UiTable>
    <template #footer>
      <div
        class="grid min-w-0 gap-component-unit text-caption text-text-secondary"
        role="status"
        aria-live="polite"
      >
        <p
          v-if="query"
          class="m-0 break-words"
        >
          {{
            formatLabelValue(
              t(
                query.hasUnsavedChanges.value
                  ? 'tableExamples.pendingFilters'
                  : 'tableExamples.appliedFilters',
              ),
              applied || t('tableExamples.allRecords'),
            )
          }}
        </p>
        <p
          v-if="example === 'sorting'"
          class="m-0"
          v-text="formatLabelValue(t('tableCapabilities.data.sortPriority'), sortLabel)"
        />
        <template v-if="example === 'states'">
          <p
            class="m-0 truncate"
            :title="requestLabel"
            v-text="formatLabelValue(t('tableCapabilities.data.requestParams'), requestLabel)"
          />
          <p class="m-0">
            {{ t('tableCapabilities.data.requests') }} {{ simulation.started.value }} ·
            {{ t('tableCapabilities.data.responses') }} {{ simulation.completed.value }} ·
            {{ t('tableCapabilities.data.cancelled') }} {{ simulation.cancelled.value }}
          </p>
        </template>
        <p
          v-if="example === 'rendering' || example === 'virtual'"
          class="m-0"
        >
          {{
            t(
              example === 'rendering'
                ? activeInlineView
                  ? 'tableInline.hint'
                  : 'tableCapabilities.data.renderingBoundary'
                : 'tableCapabilities.data.virtualBoundary',
            )
          }}
        </p>
      </div>
    </template>
  </TableCapabilityWorkbench>
  <NModal
    v-if="query"
    :key="contentKey"
    v-model:show="filtersOpen"
    to="#pavp-overlay-root"
  >
    <NCard
      class="wb-provider-modal max-h-dvh"
      content-class="flex flex-1 min-h-0 min-w-0 overflow-hidden"
      role="dialog"
      closable
      v-bind="
        {
          title: t('tableCapabilities.data.filters'),
          'aria-modal': 'true',
          'aria-label': t('tableCapabilities.data.filters'),
        } satisfies HTMLAttributes
      "
      @close="filtersOpen = false"
    >
      <UiScrollArea
        :owner-id="`${table.schema.id}-filter-dialog`"
        class="flex-1 min-h-0 min-w-0"
        contained
      >
        <UiForm
          :form="query"
          class="grid gap-content-gap"
        >
          <template #actions>
            <span />
          </template>
        </UiForm>
      </UiScrollArea>
      <template #footer>
        <div class="flex flex-wrap items-center gap-component-unit">
          <NButton
            attr-type="submit"
            v-bind="
              {
                form: query.formId,
                'aria-busy': query.submitting.value,
              } satisfies ButtonHTMLAttributes
            "
            type="primary"
            class="min-h-target-enhanced min-w-target-enhanced"
            :disabled="query.submitting.value"
          >
            {{ query.copy.submit() }}
          </NButton>
          <NButton
            secondary
            class="min-h-target-enhanced min-w-target-enhanced"
            :disabled="query.submitting.value"
            @click="query.reset()"
          >
            {{ query.copy.reset() }}
          </NButton>
          <NButton
            quaternary
            class="min-h-target-enhanced min-w-target-enhanced"
            @click="filtersOpen = false"
          >
            {{ t('tableShowcase.close') }}
          </NButton>
          <span
            class="text-caption text-text-secondary"
            role="status"
            v-text="`${t('tableExamples.results')} ${String(table.total.value)}`"
          />
        </div>
      </template>
    </NCard>
  </NModal>
  <NModal
    v-if="!activeInlineView"
    v-model:show="detailOpen"
    preset="dialog"
    to="#pavp-overlay-root"
    :title="`${t('tableCapabilities.data.details')} · ${String(detail?.['title'] ?? '')}`"
    :positive-text="t('tableShowcase.close')"
    @positive-click="detailOpen = false"
  >
    <div class="grid gap-content-gap">
      <p
        class="m-0"
        v-text="formatLabelValue(t('tableShowcase.id'), String(detail?.['id'] ?? ''))"
      />
      <p class="leading-body m-0 break-words">
        {{ detailNote }}
      </p>
      <p class="m-0 text-caption text-text-secondary">
        {{ t('tableCapabilities.data.detailSource') }}
      </p>
    </div>
  </NModal>
</template>
