<script setup lang="ts">
import {
  computed,
  Fragment,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  useId,
  type VNodeChild,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import {
  NDataTable,
  type DataTableColumns,
  type DataTableBaseColumn,
  type DataTableInst,
  type DataTableSortState,
} from 'naive-ui/es/data-table'
import { NPagination, type PaginationProps } from 'naive-ui/es/pagination'
import { NTag } from 'naive-ui/es/tag'
import { projectTableColumnGroups, type TableHeaderNode } from './table-column-groups'
import TableCsvActions from './TableCsvActions.vue'
import UiScrollArea from './UiScrollArea.vue'
import TableColumnSettings from './TableColumnSettings.vue'
import TableSortIcon from '../adapters/motion/TableSortIcon.vue'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { createPavpNaiveTableThemeProjection } from '../adapters/naive/pavp-naive-table-theme'
import { observePavpNaiveTableColumns } from '../adapters/naive/pavp-naive-table-layout'
import { getFormValue } from '../composables/form-draft-values'
import type { UiFormValue } from './form-contracts'
import type {
  UiTableColumn,
  UiTableAppearance,
  UiTableController,
  UiTableKey,
  UiTableProps,
  UiTableReadonlyRecord,
  UiTableSummaryValue,
  UiTableResolvedSummaryRow,
} from './table-contracts'

/** Presentation only: the controller owns both local and remote query results. */
defineOptions({ name: 'UiTable' })
const toolbarId = `table-toolbar-${useId()}`

const props = defineProps<UiTableProps>()
const slots = defineSlots<{
  query?: (binding: { readonly table: UiTableController }) => unknown
  actions?: (binding: { readonly table: UiTableController }) => unknown
  rowActions?: (binding: { readonly row: UiTableReadonlyRecord }) => unknown
  cell?: (binding: {
    readonly row: UiTableReadonlyRecord
    readonly column: UiTableColumn
    readonly value: UiFormValue | undefined
    readonly text: string
  }) => VNodeChild
  summaryCell?: (binding: {
    readonly table: UiTableController
    readonly rowKey: string
    readonly column: UiTableColumn
    readonly value: UiTableSummaryValue
    readonly text: string
  }) => unknown
}>()
const hasToolbar = computed(
  () =>
    slots.actions !== undefined ||
    props.table.schema.csvExport !== undefined ||
    props.table.schema.columnSettings !== undefined ||
    props.table.schema.source.kind === 'remote',
)
const providerAppearance = inject(pavpNaiveAppearanceKey)
if (providerAppearance === undefined) throw new TypeError('UiTable requires UiProvider.')

interface TableRow {
  readonly key: UiTableKey
  readonly record: UiTableReadonlyRecord
}

// Keep application fields such as `children` outside Naive's tree-data protocol.
const rows = computed<TableRow[]>(() =>
  props.table.rows.value.map((record) => {
    const key = getFormValue(record, props.table.schema.rowKey)
    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError('Every table row requires a stable string or number key.')
    return { key, record }
  }),
)
const checkedKeys = computed(() => [...props.table.selectedKeys.value])
const presentation = computed<Required<UiTableAppearance>>(() => {
  const schema = props.table.schema.appearance
  const override = props.appearance
  return {
    bordered: override?.bordered ?? schema?.bordered ?? true,
    rowDividers: override?.rowDividers ?? schema?.rowDividers ?? false,
    columnDividers: override?.columnDividers ?? schema?.columnDividers ?? false,
    striped: override?.striped ?? schema?.striped ?? true,
    headerTone: override?.headerTone ?? schema?.headerTone ?? 'soft',
    density: override?.density ?? schema?.density ?? providerAppearance.value.density,
  }
})
const tableTheme = computed(() =>
  createPavpNaiveTableThemeProjection(providerAppearance.value, presentation.value.headerTone),
)
const tableSize = computed(
  () =>
    (({ compact: 'small', comfortable: 'medium', spacious: 'large' }) as const)[
      presentation.value.density
    ],
)
// Height is a presentation contract, never derived from row counts or the window.
const height = computed(() => {
  const configured = props.height ?? props.table.schema.height
  if (props.maxHeight !== undefined && configured !== undefined)
    throw new TypeError('Use table height or legacy maxHeight, not both.')
  const value =
    configured ??
    (props.maxHeight === undefined
      ? { mode: 'auto' as const }
      : { mode: 'fixed' as const, bodyHeight: props.maxHeight })
  if (value.mode === 'fixed' && (!Number.isFinite(value.bodyHeight) || value.bodyHeight <= 0))
    throw new TypeError('Table bodyHeight must be a positive finite number.')
  if (props.virtualScroll && value.mode === 'auto')
    throw new TypeError('Virtual table scrolling requires fixed or fill height.')
  return value
})
const heightBindings = computed(() =>
  height.value.mode === 'fixed'
    ? { minHeight: height.value.bodyHeight, maxHeight: height.value.bodyHeight }
    : {},
)
const pagination = computed<PaginationProps>(() => {
  const sizes = props.table.schema.pagination?.pageSizes
  return {
    page: props.table.query.value.page,
    pageSize: props.table.query.value.pageSize,
    itemCount: props.table.total.value,
    disabled: props.table.loading.value,
    showSizePicker: sizes !== undefined,
    ...(sizes === undefined ? {} : { pageSizes: [...sizes] }),
  }
})
const status = computed(() =>
  props.table.loading.value
    ? props.copy.loading()
    : props.table.error.value
      ? props.copy.error()
      : '',
)
const refreshLabel = computed(() =>
  props.table.error.value ? props.copy.retry() : props.copy.refresh(),
)

function text(value: UiFormValue | undefined): string {
  if (value === null || value === undefined || value === '') return props.copy.empty()
  if (typeof value === 'boolean') return props.copy.boolean(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
function cell(row: TableRow, column: UiTableColumn): VNodeChild {
  const value = getFormValue(row.record, column.key)
  if (slots.cell) return slots.cell({ row: row.record, column, value, text: text(value) })
  if (column.kind === 'boolean')
    return typeof value === 'boolean' ? props.copy.boolean(value) : props.copy.empty()
  if (column.kind === 'number')
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : props.copy.empty()
  if (column.kind === 'date') {
    // Preserve the supplied date/offset. Formatting must not silently shift a date-only value.
    if (typeof value === 'string' && Number.isFinite(Date.parse(value)))
      return h('time', { datetime: value }, value)
    return text(value)
  }
  if (column.kind === 'tag' && value !== null && value !== undefined && value !== '')
    return h(NTag, { bordered: false, size: 'small' }, () => text(value))
  return text(value)
}
const leafColumns = computed<DataTableColumns<TableRow>>(() => {
  const querySorts = props.table.query.value.sorts
  const result: DataTableColumns<TableRow> = props.table.columns.value
    .filter((column) => !column.hidden)
    .map((column) => ({
      key: column.key,
      title:
        props.table.schema.sorting === 'multiple' &&
        querySorts.some((sort) => sort.key === column.key)
          ? () =>
              h('span', { class: 'inline-flex items-center gap-component-unit' }, [
                props.table.text(column.title),
                h(NTag, { size: 'small', type: 'primary', bordered: false }, () =>
                  String(querySorts.findIndex((sort) => sort.key === column.key) + 1),
                ),
              ])
          : props.table.text(column.title),
      align: column.kind === 'number' ? 'right' : 'left',
      ...(column.width === undefined ? {} : { width: column.width }),
      ...(column.fixed === undefined ? {} : { fixed: column.fixed }),
      sorter:
        column.sortable === true
          ? props.table.schema.sorting === 'multiple'
            ? { multiple: 1 }
            : true
          : false,
      // The native button bubbles to Naive's header, preserving its sorting cycle.
      renderSorterIcon: ({ order }) => {
        const label = props.copy.sortLabel(props.table.text(column.title), order)
        return h(
          'button',
          {
            type: 'button',
            class:
              'inline-flex size-icon-large shrink-0 cursor-pointer items-center justify-center text-inherit',
            'aria-label': label,
            title: label,
          },
          h(TableSortIcon, { order, motion: providerAppearance.value.motion }),
        )
      },
      sortOrder: querySorts.find((sort) => sort.key === column.key)?.order ?? false,
      render: (row: TableRow) => cell(row, column),
    }))
  if (props.table.schema.selection === 'single' || props.table.schema.selection === 'multiple')
    result.unshift({ type: 'selection', multiple: props.table.schema.selection === 'multiple' })
  if (slots.rowActions) {
    const width = props.rowActionsWidth ?? 160
    if (!Number.isFinite(width) || width <= 0)
      throw new TypeError('Table rowActionsWidth must be a positive finite number.')
    result.push({
      key: '__pavp_row_actions__',
      title: props.copy.actions(),
      fixed: 'right',
      width,
      render: (row: TableRow) => slots.rowActions?.({ row: row.record }) as VNodeChild,
    })
  }
  return result
})
const columns = computed<DataTableColumns<TableRow>>(() => {
  const leaves = leafColumns.value
  const byKey = new Map(
    leaves.flatMap((column) => ('key' in column ? [[column.key, column] as const] : [])),
  )
  function render(nodes: readonly TableHeaderNode[]): DataTableBaseColumn<TableRow>[] {
    return nodes.map((node) => {
      if (node.kind === 'column') return byKey.get(node.column.key) as DataTableBaseColumn<TableRow>
      return {
        key: node.key,
        title: props.table.text(node.title),
        titleAlign: 'center' as const,
        ...(node.fixed === undefined ? {} : { fixed: node.fixed }),
        children: render(node.children),
      }
    })
  }
  const grouped: DataTableColumns<TableRow> = render(
    projectTableColumnGroups(props.table.columns.value, props.table.schema.columnGroups ?? []),
  )
  const selection = leaves.find((column) => column.type === 'selection')
  if (selection) grouped.unshift(selection)
  const actions = byKey.get('__pavp_row_actions__')
  if (actions) grouped.push(actions)
  return grouped
})
// The main table remains the sole column-width authority. The summary uses the same
// native table/fixed-column renderer, but lives outside its vertical data viewport.
const mainElement = ref<HTMLElement>()
const mainTable = ref<DataTableInst>()
const summaryTable = ref<DataTableInst>()
const measuredWidths = ref<readonly number[]>([])
const fixedOffsets = ref<readonly { readonly left: string; readonly right: string }[]>([])
const summaryWidth = computed(() => measuredWidths.value.reduce((total, width) => total + width, 0))
const summaryRows = computed(() => [...props.table.summaryRows.value])
let disconnectColumns: (() => void) | undefined
let horizontalPosition = 0
let bodyScrollTop = 0
function observeColumns(): void {
  disconnectColumns?.()
  disconnectColumns = undefined
  if (!mainElement.value || !summaryRows.value.length) return
  disconnectColumns = observePavpNaiveTableColumns(
    mainElement.value,
    leafColumns.value,
    (columns) => {
      const widths = columns.map((column) => column.width)
      const offsets = columns.map(({ left, right }) => ({ left, right }))
      if (JSON.stringify(offsets) !== JSON.stringify(fixedOffsets.value))
        fixedOffsets.value = offsets
      if (
        widths.length !== measuredWidths.value.length ||
        widths.some((width, index) => Math.abs(width - (measuredWidths.value[index] ?? 0)) > 0.1)
      )
        measuredWidths.value = widths
    },
  )
}
watch([mainElement, columns, rows, () => summaryRows.value.length], observeColumns, {
  flush: 'post',
})
onBeforeUnmount(() => disconnectColumns?.())
function syncScroll(event: Event, destination: DataTableInst | undefined): void {
  const source = event.target
  if (!(source instanceof HTMLElement)) return
  if (destination === summaryTable.value) bodyScrollTop = source.scrollTop
  if (Math.abs(source.scrollLeft - horizontalPosition) < 0.1) return
  horizontalPosition = source.scrollLeft
  destination?.scrollTo({
    left: horizontalPosition,
    top: destination === mainTable.value ? bodyScrollTop : 0,
  })
}
watch(
  () => props.table.query.value.page,
  async () => {
    await nextTick()
    mainTable.value?.scrollTo({ left: horizontalPosition, top: 0 })
  },
)
watch(measuredWidths, async () => {
  await nextTick()
  summaryTable.value?.scrollTo({ left: horizontalPosition })
})
// Fresh column renderers keep a dynamically enabled summary slot reactive.
function summaryColumns(): DataTableColumns<UiTableResolvedSummaryRow> {
  return leafColumns.value.map((column, index) => {
    const source =
      'key' in column
        ? props.table.columns.value.find((item) => item.key === column.key)
        : undefined
    const width = measuredWidths.value[index] ?? column.width
    return {
      key: `summary-column-${String(index)}`,
      title: source ? props.table.text(source.title) : '',
      className: 'n-data-table-td--summary',
      ...(width === undefined ? {} : { width }),
      cellProps: (row) => ({
        style: fixedOffsets.value[index] ?? {},
        ...(source && row.cells[source.key]
          ? {
              'aria-label': `${props.table.text(source.title)}: ${row.cells[source.key]?.text ?? ''}`,
            }
          : {}),
      }),
      ...(column.fixed === undefined ? {} : { fixed: column.fixed }),
      align: source?.kind === 'number' ? 'right' : 'left',
      render: (row) => {
        if (!source) return ''
        const cell = row.cells[source.key]
        if (!cell) return ''
        return slots.summaryCell
          ? h(Fragment, { key: JSON.stringify([row.key, source.key]) }, [
              slots.summaryCell({
                table: props.table,
                rowKey: row.key,
                column: source,
                value: cell.value,
                text: cell.text,
              }) as VNodeChild,
            ])
          : cell.text
      },
    }
  })
}
function rowKey(row: TableRow): UiTableKey {
  return row.key
}
function sort(value: DataTableSortState | DataTableSortState[] | null): void {
  const states = (Array.isArray(value) ? value : value ? [value] : []).flatMap((next) =>
    next.order && typeof next.columnKey === 'string'
      ? [{ key: next.columnKey, order: next.order }]
      : [],
  )
  // Naive emits controlled columns in display order. Preserve the user's existing priorities.
  const existing = props.table.query.value.sorts.flatMap((sort) => {
    const next = states.find((state) => state.key === sort.key)
    return next ? [next] : []
  })
  void props.table.setSorts([
    ...existing,
    ...states.filter((state) => !existing.some((sort) => sort.key === state.key)),
  ])
}
</script>

<template>
  <div
    class="pavp-table flex flex-col min-w-0 gap-content-gap"
    :class="height.mode === 'fill' ? 'flex-1 min-h-0' : ''"
    :data-height-mode="height.mode"
  >
    <div
      v-if="slots.query"
      class="shrink-0 min-w-0"
    >
      <slot
        name="query"
        :table="table"
      />
    </div>
    <UiScrollArea
      v-if="hasToolbar"
      :owner-id="toolbarId"
      x-scrollable
      class="shrink-0 h-auto"
    >
      <div
        class="flex shrink-0 flex-wrap min-w-0 items-center gap-content-gap layout-narrow:flex-nowrap layout-narrow:w-max"
      >
        <div
          class="flex flex-1 flex-wrap min-w-0 items-center gap-content-gap layout-narrow:flex-nowrap"
        >
          <slot
            name="actions"
            :table="table"
          />
        </div>
        <span
          v-if="table.error.value"
          role="alert"
          class="text-caption text-control-error"
        >
          {{ copy.error() }}
        </span>
        <TableCsvActions
          v-if="table.schema.csvExport"
          :table="table"
          :copy="copy"
        />
        <TableColumnSettings
          v-if="table.schema.columnSettings"
          :table="table"
          :copy="copy"
        />
        <NButton
          v-if="table.schema.source.kind === 'remote'"
          quaternary
          class="min-h-target-enhanced min-w-target-enhanced"
          :disabled="table.loading.value"
          :aria-label="refreshLabel"
          :aria-busy="table.loading.value"
          :title="table.error.value ? copy.error() : refreshLabel"
          @click="table.refresh()"
        >
          <span class="flex items-center gap-component-unit">
            <span
              class="i-lucide-refresh-cw shrink-0"
              aria-hidden="true"
            />
            <span class="grid">
              <span
                v-for="(label, index) in [copy.refresh(), copy.retry()]"
                :key="index"
                class="col-start-1 row-start-1 invisible"
                aria-hidden="true"
              >
                {{ label }}
              </span>
              <span
                class="col-start-1 row-start-1"
                aria-hidden="true"
              >
                {{ refreshLabel }}
              </span>
            </span>
          </span>
        </NButton>
      </div>
    </UiScrollArea>
    <span
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      v-text="status"
    />
    <div
      class="pavp-table-grid flex flex-col min-w-0"
      :data-summary="summaryRows.length > 0"
      :class="height.mode === 'fill' ? 'flex-1 min-h-0' : ''"
    >
      <div
        ref="mainElement"
        class="pavp-table-data min-w-0"
        :class="height.mode === 'fill' ? 'flex flex-1 flex-col min-h-0' : ''"
      >
        <NDataTable
          ref="mainTable"
          class="min-w-0"
          :class="height.mode === 'fill' ? 'flex-1 min-h-0' : ''"
          :data="rows"
          :columns="columns"
          :row-key="rowKey"
          :checked-row-keys="checkedKeys"
          :pagination="false"
          :loading="table.loading.value"
          :aria-busy="table.loading.value"
          v-bind="heightBindings"
          :flex-height="height.mode === 'fill'"
          :virtual-scroll="virtualScroll === true"
          :cascade="false"
          :bordered="presentation.bordered"
          :bottom-bordered="presentation.rowDividers && !presentation.bordered"
          :single-column="!presentation.rowDividers"
          :single-line="!presentation.columnDividers"
          :striped="presentation.striped"
          :size="tableSize"
          :theme-overrides="tableTheme"
          remote
          scroll-x="100%"
          @scroll="syncScroll($event, summaryTable)"
          @update:sorter="sort"
          @update:checked-row-keys="table.setSelection"
        >
          <template #empty>
            <span
              class="leading-body whitespace-pre-wrap break-words text-body text-text-secondary"
            >
              {{ table.error.value ? copy.error() : copy.empty() }}
            </span>
          </template>
        </NDataTable>
      </div>
      <NDataTable
        v-if="summaryRows.length"
        ref="summaryTable"
        class="pavp-table-summary shrink-0 min-w-0"
        :data="summaryRows"
        :columns="summaryColumns()"
        :row-key="(row: UiTableResolvedSummaryRow) => row.key"
        :pagination="false"
        :bordered="presentation.bordered"
        :bottom-bordered="presentation.rowDividers && !presentation.bordered"
        :single-column="!presentation.rowDividers"
        :single-line="!presentation.columnDividers"
        :striped="false"
        :size="tableSize"
        :theme-overrides="tableTheme"
        :scroll-x="summaryWidth || '100%'"
        table-layout="fixed"
        @scroll="syncScroll($event, mainTable)"
      />
    </div>
    <div class="flex shrink-0 min-w-0 justify-end">
      <NPagination
        v-bind="pagination"
        @update:page="table.setPage"
        @update:page-size="table.setPageSize"
      />
    </div>
  </div>
</template>

<style scoped>
@layer vendor-overrides {
  /* Match Naive's local rail level above its fixed columns (left 2, right 1). */
  .pavp-table :deep([data-pavp-naive-scroll] > .os-scrollbar) {
    z-index: calc(var(--ui-z-base) + 3);
  }

  /* Naive's stripe selector otherwise erases sorting on alternate rows. */
  .pavp-table-data :deep(.n-data-table-tr--striped > .n-data-table-td--sorting) {
    background-color: color-mix(
      in srgb,
      var(--n-merged-td-color-striped) 80%,
      var(--n-merged-td-color-hover)
    ) !important;
  }

  /* Hover is one continuous row, including sorted and fixed cells. */
  .pavp-table-data :deep(.n-data-table-tr:hover > .n-data-table-td),
  .pavp-table-data :deep(.n-data-table-tr > .n-data-table-td--hover) {
    background-color: var(--n-merged-td-color-hover) !important;
  }

  .pavp-table-grid[data-summary='true'] .pavp-table-data :deep(.n-data-table-wrapper) {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }

  .pavp-table-summary :deep(.n-data-table-wrapper) {
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    border-top-width: 0 !important;
  }

  /* The shared data header labels these aligned summary cells; do not duplicate it. */
  .pavp-table-summary :deep(.n-data-table-thead) {
    display: none;
  }

  /* Naive's unlayered nowrap rule must yield without reducing touch targets. */
  .pavp-table :deep(.n-pagination) {
    flex-wrap: wrap !important;
    row-gap: var(--ui-space-content-gap);
  }

  /* Summary cells also inherit body sorting styles. Keep the header color pair together. */
  .pavp-table :deep(.n-data-table-td--summary) {
    background-color: var(--n-merged-th-color) !important;
    color: var(--n-th-text-color) !important;
    font-weight: var(--ui-font-weight-title);
  }
}
</style>
