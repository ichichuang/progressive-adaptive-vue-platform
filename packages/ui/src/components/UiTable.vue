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
  type DataTableRowData,
  type DataTableSortState,
} from 'naive-ui/es/data-table'
import { NPagination, type PaginationProps } from 'naive-ui/es/pagination'
import { useUiDateTime } from '../date-time/date-time-context'
import { resolveTableColumnDisplay } from './table-column-display'
import { NTag } from 'naive-ui/es/tag'
import { projectTableColumnGroups, type TableHeaderNode } from './table-column-groups'
import TableCsvActions from './TableCsvActions.vue'
import UiScrollArea from './UiScrollArea.vue'
import TableColumnSettings from './TableColumnSettings.vue'
import TableMaximizeSurface from './TableMaximizeSurface.vue'
import TableColumnTitle from './TableColumnTitle.vue'
import TableKeywordSearch from './TableKeywordSearch.vue'
import TableInlineActions from './TableInlineActions.vue'
import UiFormField from './UiFormField.vue'
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
import {
  findTreeRecord,
  projectTreeDisplayRows,
  readTreeChildren,
  resolveUiTableTree,
} from './table-tree'

/** Presentation only: the controller owns both local and remote query results. */
defineOptions({ name: 'UiTable' })
const expanded = ref(false)
const toolbarId = `table-toolbar-${useId()}`

const props = defineProps<UiTableProps>()
const inheritedDateTime = useUiDateTime()
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
    props.table.schema.maximizable === true ||
    slots.actions !== undefined ||
    props.table.schema.keywordSearch !== undefined ||
    props.table.schema.csvExport !== undefined ||
    props.table.schema.maxSelection !== undefined ||
    props.table.schema.columnSettings !== undefined ||
    props.table.schema.source.kind === 'remote' ||
    props.table.schema.tree?.childrenRequest !== undefined,
)
const providerAppearance = inject(pavpNaiveAppearanceKey)
if (providerAppearance === undefined) throw new TypeError('UiTable requires UiProvider.')

interface TableRow {
  readonly key: UiTableKey
  readonly record: UiTableReadonlyRecord
  readonly isLeaf?: boolean
  readonly children?: readonly TableRow[]
}

const tree = computed(() =>
  props.table.schema.tree ? resolveUiTableTree(props.table.schema.tree) : undefined,
)

function recordKey(record: UiTableReadonlyRecord): UiTableKey {
  const key = getFormValue(record, props.table.schema.rowKey)
  if (typeof key !== 'string' && typeof key !== 'number')
    throw new TypeError('Every table row requires a stable string or number key.')
  return key
}

// Flat tables keep application fields such as `children` outside Naive's tree-data protocol.
// Tree tables project children onto the display wrapper only.
const rows = computed<TableRow[]>(() => {
  if (!tree.value) {
    return props.table.rows.value.map((record) => ({ key: recordKey(record), record }))
  }
  return projectTreeDisplayRows(props.table.rows.value, recordKey, tree.value)
})
const selectionRejected = ref(false)
const selectionLimitLabel = computed(() => {
  const maximum = props.table.schema.maxSelection
  if (maximum === undefined) return ''
  const selected = props.table.selectedKeys.value.length
  return (
    props.copy.selectionLimit?.(selected, maximum) ?? `${String(selected)} / ${String(maximum)}`
  )
})
function selectRows(keys: UiTableKey[]): void {
  selectionRejected.value = !props.table.setSelection(keys)
}
const checkedKeys = computed(() => [...props.table.selectedKeys.value])
const expandedRowKeys = computed(() => [...props.table.expandedKeys.value])
const selectionCascade = computed(() =>
  tree.value ? tree.value.selectionCascade && props.table.schema.selection === 'multiple' : false,
)
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
  if (expanded.value) return { mode: 'fill' as const }
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
  if (props.virtualScroll && tree.value)
    throw new TypeError('Tree tables do not support virtual scrolling.')
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
    : props.table.error.value || props.table.treeLoadErrors.value.length > 0
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
const inlineMode = computed(
  () => props.inlineEditing?.mode ?? props.table.schema.editor?.inline?.mode ?? 'row',
)
function inlineButton(row: TableRow, field?: string, label?: string): VNodeChild {
  const editing = props.inlineEditing
  if (!editing) return null
  return h(
    NButton,
    {
      text: true,
      type: 'primary',
      disabled: editing.session.open.value,
      'aria-label': `${editing.copy.title('edit')} · ${field ? props.table.text(props.table.columns.value.find((column) => column.key === field)?.title ?? field) + ' · ' : ''}${String(row.key)}`,
      onClick: () => {
        void editing.session.showInline(row.record, field)
      },
    },
    () => label ?? editing.copy.title('edit'),
  )
}
function cell(row: TableRow, column: UiTableColumn): VNodeChild {
  const value = getFormValue(row.record, column.key)
  const editing = props.inlineEditing
  if (editing?.session.isInlineEditing(row.record, column.key) && editing.session.form.value)
    return h(UiFormField, { form: editing.session.form.value, name: column.key })
  if (
    editing &&
    inlineMode.value === 'cell' &&
    props.table.schema.editor?.inline?.fields.includes(column.key)
  ) {
    const display = resolveTableColumnDisplay(
      column,
      value,
      text,
      (label) => props.table.text(label),
      props.dateTime ?? inheritedDateTime.value,
    )
    return inlineButton(row, column.key, display.text)
  }
  if (slots.cell) return slots.cell({ row: row.record, column, value, text: text(value) })
  const display = resolveTableColumnDisplay(
    column,
    value,
    text,
    (label) => props.table.text(label),
    props.dateTime ?? inheritedDateTime.value,
  )
  if (column.kind === 'tag' && value !== null && value !== undefined && value !== '')
    return h(
      NTag,
      { bordered: false, size: 'small', type: display.tone ?? 'default' },
      () => display.text,
    )
  if (column.options || column.format || column.dateTime || column.emptyText !== undefined)
    return display.text
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
  return text(value)
}
const reorderPreview = ref<{ key: string; placement: 'before' | 'after' }>()
const columnPreview = ref<Readonly<Record<string, number>>>({})
function previewColumnWidth(key: string, width: number | undefined): void {
  columnPreview.value =
    width === undefined
      ? Object.fromEntries(Object.entries(columnPreview.value).filter(([name]) => name !== key))
      : { ...columnPreview.value, [key]: width }
}
function columnTitle(column: UiTableColumn): VNodeChild {
  const querySorts = props.table.query.value.sorts
  const index = querySorts.findIndex((sort) => sort.key === column.key)
  const title = () =>
    props.table.schema.sorting === 'multiple' && index !== -1
      ? h('span', { class: 'inline-flex items-center gap-component-unit' }, [
          props.table.text(column.title),
          h(NTag, { size: 'small', type: 'primary', bordered: false }, () => String(index + 1)),
        ])
      : props.table.text(column.title)
  return column.resizable || props.table.schema.reorderableColumns
    ? h(
        TableColumnTitle,
        {
          owner: toolbarId,
          column,
          table: props.table,
          copy: props.copy,
          dropPlacement:
            reorderPreview.value?.key === column.key ? reorderPreview.value.placement : undefined,
          onReorderPreview: (
            target: { key: string; placement: 'before' | 'after' } | undefined,
          ) => {
            reorderPreview.value = target
          },
          onResizePreview: previewColumnWidth,
        },
        title,
      )
    : title()
}
const leafColumns = computed<DataTableColumns<TableRow>>(() => {
  const querySorts = props.table.query.value.sorts
  const selected = props.table.selectedKeys.value
  const visible = props.table.columns.value.filter((column) => !column.hidden)
  const treeColumnKey = tree.value ? visible[0]?.key : undefined
  const result: DataTableColumns<TableRow> = visible.map((column) => ({
    key: column.key,
    title: () => columnTitle(column),
    align: column.align ?? (column.kind === 'number' ? 'right' : 'left'),
    ...(column.overflow === 'ellipsis' ? { ellipsis: { tooltip: true } } : {}),
    ...((columnPreview.value[column.key] ?? column.width) === undefined
      ? {}
      : { width: columnPreview.value[column.key] ?? column.width }),
    ...(column.minWidth === undefined ? {} : { minWidth: column.minWidth }),
    ...(column.maxWidth === undefined ? {} : { maxWidth: column.maxWidth }),
    ...(column.fixed === undefined ? {} : { fixed: column.fixed }),
    ...(treeColumnKey === column.key ? { tree: true } : {}),
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
    result.unshift({
      type: 'selection',
      multiple: props.table.schema.selection === 'multiple',
      ...(props.table.schema.maxSelection === undefined
        ? {}
        : {
            disabled: (row: TableRow) =>
              !selected.includes(row.key) &&
              selected.length >= (props.table.schema.maxSelection ?? Infinity),
          }),
    })
  if (slots.rowActions || (props.inlineEditing && inlineMode.value === 'row')) {
    const width = props.rowActionsWidth ?? 160
    if (!Number.isFinite(width) || width <= 0)
      throw new TypeError('Table rowActionsWidth must be a positive finite number.')
    result.push({
      key: '__pavp_row_actions__',
      title: props.copy.actions(),
      fixed: 'right',
      width,
      render: (row: TableRow) => [
        slots.rowActions?.({ row: row.record }) as VNodeChild,
        props.inlineEditing && inlineMode.value === 'row' ? inlineButton(row) : null,
      ],
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
let movingSurface = false
let surfaceMove = 0
let surfaceOffset = { left: 0, top: 0 }
function restoreSurfaceOffset(): void {
  mainTable.value?.scrollTo(surfaceOffset)
  summaryTable.value?.scrollTo({ left: surfaceOffset.left, top: 0 })
}
watch(
  expanded,
  async () => {
    const move = ++surfaceMove
    const offset = { left: horizontalPosition, top: bodyScrollTop }
    surfaceOffset = offset
    movingSurface = true
    // Modal host ref and Teleport relocation are separate Vue render passes.
    await nextTick()
    await nextTick()
    requestAnimationFrame(() => {
      if (move !== surfaceMove) return
      mainTable.value?.scrollTo(offset)
      summaryTable.value?.scrollTo({ left: offset.left, top: 0 })
      movingSurface = false
    })
  },
  { flush: 'sync' },
)
onBeforeUnmount(() => {
  surfaceMove++
})

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
  if (movingSurface) return
  const source = event.target
  if (!(source instanceof HTMLElement)) return
  if (destination === summaryTable.value) {
    bodyScrollTop = source.scrollTop
    if (
      props.table.schema.pagination?.mode === 'load-more' &&
      !props.table.error.value &&
      !props.inlineEditing?.session.open.value &&
      source.scrollHeight > source.clientHeight &&
      source.scrollTop + source.clientHeight >= source.scrollHeight - 32
    )
      void props.table.loadMore()
  }
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
    if (props.table.schema.pagination?.mode === 'load-more' && props.table.query.value.page > 1)
      return
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
async function loadTreeChildren(node: DataTableRowData): Promise<void> {
  const config = tree.value
  if (!config) return
  const row = node as TableRow
  try {
    await props.table.loadTreeChildren(row.record)
  } catch {
    // The controller exposes a retryable node error. Naive does not catch onLoad rejection.
    return
  }
  // Naive inspects this raw node for shallow-loaded state before the next data flush.
  const latest = findTreeRecord(props.table.rows.value, row.key, recordKey, config.childrenKey)
  const source = latest ? readTreeChildren(latest, config.childrenKey) : undefined
  const mutable = row as unknown as { children?: TableRow[] }
  if (source !== undefined) mutable.children = projectTreeDisplayRows(source, recordKey, config)
}
const retryingChildren = ref(false)
async function retryTreeChildren(): Promise<void> {
  if (retryingChildren.value || !tree.value) return
  retryingChildren.value = true
  const table = props.table
  const config = tree.value
  try {
    for (const { key } of table.treeLoadErrors.value) {
      const row = findTreeRecord(table.rows.value, key, recordKey, config.childrenKey)
      if (!row) continue
      try {
        await table.loadTreeChildren(row)
        table.setExpandedKeys([...table.expandedKeys.value, key])
      } catch {
        // Keep the failed node retryable without disturbing other loaded branches.
      }
    }
  } finally {
    retryingChildren.value = false
  }
}
const treeTableBindings = computed(() => {
  if (!tree.value) return { cascade: false as const }
  return {
    cascade: selectionCascade.value,
    childrenKey: 'children' as const,
    indent: tree.value.indent,
    expandedRowKeys: expandedRowKeys.value,
    ...(tree.value.childrenRequest ? { onLoad: loadTreeChildren } : {}),
  }
})
function sort(value: DataTableSortState | DataTableSortState[] | null): void {
  if (props.inlineEditing?.session.open.value) return
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
    class="flex flex-col min-w-0"
    :class="height.mode === 'fill' ? 'flex-1 min-h-0' : ''"
  >
    <TableMaximizeSurface
      v-model:expanded="expanded"
      :label="copy.maximize?.() ?? copy.columns()"
      :restore-label="copy.restore?.() ?? copy.resetColumns()"
      @settled="restoreSurfaceOffset"
    >
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
              <TableKeywordSearch
                v-if="table.schema.keywordSearch"
                :table="table"
                :copy="copy"
                :disabled="Boolean(inlineEditing?.session.open.value)"
              />
              <slot
                name="actions"
                :table="table"
              />
            </div>
            <span
              v-if="table.error.value || table.treeLoadErrors.value.length"
              role="alert"
              class="text-caption text-control-error"
            >
              {{ copy.error() }}
            </span>
            <NButton
              v-if="table.schema.tree?.childrenRequest"
              quaternary
              :class="table.treeLoadErrors.value.length ? '' : 'invisible'"
              :disabled="
                table.loading.value || retryingChildren || !table.treeLoadErrors.value.length
              "
              :loading="retryingChildren"
              @click="retryTreeChildren"
            >
              {{ copy.retry() }}
            </NButton>
            <span
              v-if="table.schema.maxSelection !== undefined"
              class="text-caption"
              :class="selectionRejected ? 'text-control-error' : 'text-text-secondary'"
              role="status"
            >
              {{ selectionLimitLabel }}
            </span>
            <NButton
              v-if="table.schema.maximizable"
              quaternary
              :aria-label="
                expanded
                  ? (copy.restore?.() ?? copy.resetColumns())
                  : (copy.maximize?.() ?? copy.columns())
              "
              :title="
                expanded
                  ? (copy.restore?.() ?? copy.resetColumns())
                  : (copy.maximize?.() ?? copy.columns())
              "
              @click="expanded = !expanded"
            >
              <span
                class="size-icon-small"
                :class="expanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
                aria-hidden="true"
              />
            </NButton>
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
              v-bind="{ ...heightBindings, ...treeTableBindings }"
              :flex-height="height.mode === 'fill'"
              :virtual-scroll="virtualScroll === true"
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
              @update:checked-row-keys="selectRows"
              @update:expanded-row-keys="table.setExpandedKeys"
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
        <TableInlineActions
          v-if="inlineEditing"
          :editing="inlineEditing"
        />
        <div class="flex shrink-0 min-w-0 justify-end">
          <NButton
            v-if="table.schema.pagination?.mode === 'load-more'"
            :loading="table.loading.value"
            :disabled="!table.hasMore.value || Boolean(inlineEditing?.session.open.value)"
            @click="table.loadMore()"
          >
            {{
              table.error.value
                ? copy.retry()
                : table.hasMore.value
                  ? (copy.loadMore?.() ?? copy.refresh())
                  : (copy.loadedAll?.() ?? copy.empty())
            }}
          </NButton>
          <NPagination
            v-else
            v-bind="pagination"
            :disabled="Boolean(inlineEditing?.session.open.value)"
            @update:page="table.setPage"
            @update:page-size="table.setPageSize"
          />
        </div>
      </div>
    </TableMaximizeSurface>
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
