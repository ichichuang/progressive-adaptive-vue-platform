import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import type {
  UiTableColumn,
  UiTableController,
  UiTableInput,
  UiTableKey,
  UiTableQuery,
  UiTableReadonlyRecord,
  UiTableSummaryRow,
} from '../components/table-contracts'
import { parseUiTableSchema } from '../components/table-schema'
import {
  parseTableSummary,
  parseTableSummaryData,
  resolveTableSummary,
} from '../components/table-summary'
import { resolveUiTableRequest } from '../components/table-request'
import { cloneDraft, freezeDraftValue, getFormValue } from './form-draft-values'

/** One owner for applied query, selection and cancellable list work. No HTTP or storage singleton. */
export function useUiTable(input: UiTableInput): UiTableController {
  const schema = parseUiTableSchema(input.schema)
  if (schema.source.kind === 'remote' && !input.transport)
    throw new TypeError('A remote table requires a transport.')
  const snapshot = <T>(value: T): T => freezeDraftValue(cloneDraft(value)) as T
  const initialFilters = snapshot(input.filters ?? {})
  const transport = input.transport
  const context = snapshot(input.context ?? {})
  const query = shallowRef<UiTableQuery>(
    snapshot({
      page: 1,
      pageSize: schema.pagination?.pageSize ?? 20,
      filters: initialFilters,
      sort: null,
    }),
  )
  const columns = shallowRef<readonly UiTableColumn[]>(schema.columns)
  const summary = shallowRef<readonly UiTableSummaryRow[]>(schema.summary ?? snapshot([]))
  // Publish rows, filtered local rows and server metadata as one accepted response.
  const accepted = shallowRef({
    rows: [] as readonly UiTableReadonlyRecord[],
    total: 0,
    filteredRows: [] as readonly UiTableReadonlyRecord[],
    summary: {},
  })
  const rows = computed(() => accepted.value.rows)
  const total = computed(() => accepted.value.total)
  const loading = shallowRef(false)
  const error = shallowRef<Error | null>(null)
  const selectedKeys = shallowRef<readonly UiTableKey[]>([])
  let localRows = snapshot(input.rows ?? [])
  let sequence = 0
  let disposed = false
  let active: AbortController | undefined
  function rowKey(row: UiTableReadonlyRecord): UiTableKey {
    const key = getFormValue(row, schema.rowKey)
    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError('Every table row requires a stable string or number key.')
    return key
  }
  function validateRows(value: readonly UiTableReadonlyRecord[]): void {
    const keys = new Set<UiTableKey>()
    for (const row of value) {
      const key = rowKey(row)
      if (keys.has(key)) throw new TypeError('Table row keys must be unique.')
      keys.add(key)
    }
  }
  function display(value: unknown): string {
    return value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : ''
  }
  function isCurrent(ticket: number, signal: AbortSignal): boolean {
    return !disposed && ticket === sequence && !signal.aborted
  }
  function filterLeaves(
    filters: UiTableReadonlyRecord,
    prefix = '',
  ): readonly (readonly [string, UiTableReadonlyRecord[string]])[] {
    return Object.entries(filters).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? filterLeaves(value as UiTableReadonlyRecord, path)
        : [[path, value] as const]
    })
  }
  function localPage(current: UiTableQuery) {
    // Grouped form values retain their nested request shape. Only the local
    // matcher projects them to the same paths used by flat filters and columns.
    const filters = filterLeaves(current.filters)
    const matching = localRows.filter((row) =>
      filters.every(([key, value]) => {
        if (value === '' || value === null || (Array.isArray(value) && value.length === 0))
          return true
        const cell = getFormValue(row, key)
        if (typeof value === 'string')
          return display(cell).toLocaleLowerCase().includes(value.toLocaleLowerCase())
        if (Array.isArray(value)) return value.some((item) => Object.is(item, cell))
        return Object.is(cell, value)
      }),
    )
    const sort = current.sort
    if (sort)
      matching.sort((a, b) => {
        const left = getFormValue(a, sort.key)
        const right = getFormValue(b, sort.key)
        const result =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : display(left).localeCompare(display(right))
        return sort.order === 'ascend' ? result : -result
      })
    const start = (current.page - 1) * current.pageSize
    return {
      page: { rows: matching.slice(start, start + current.pageSize), total: matching.length },
      filteredRows: matching,
    }
  }
  async function remoteList(
    request: Parameters<NonNullable<typeof transport>['list']>[0],
    signal: AbortSignal,
  ) {
    if (!transport) throw new TypeError('A remote table requires a transport.')
    return transport.list(request, signal)
  }
  validateRows(localRows)
  async function refresh(): Promise<void> {
    if (disposed) return
    active?.abort()
    const controller = new AbortController()
    active = controller
    const ticket = ++sequence
    const current = query.value
    loading.value = true
    error.value = null
    try {
      const next =
        schema.source.kind === 'local'
          ? localPage(current)
          : {
              page: await remoteList(
                resolveUiTableRequest(schema.source.request, {
                  ...current,
                  context,
                  row: {},
                  form: {},
                }),
                controller.signal,
              ),
              filteredRows: [],
            }
      if (!isCurrent(ticket, controller.signal)) return
      const result = next.page
      if (!Number.isSafeInteger(result.total) || result.total < 0 || !Array.isArray(result.rows))
        throw new TypeError('Invalid table page response.')
      const lastPage = Math.max(1, Math.ceil(result.total / current.pageSize))
      if (current.page > lastPage) {
        query.value = snapshot({ ...current, page: lastPage })
        input.onQueryChange?.(query.value)
        await refresh()
        return
      }
      const nextRows = snapshot(result.rows)
      const summaryData = parseTableSummaryData('summary' in result ? result.summary : undefined)
      validateRows(nextRows)
      if (nextRows.length > current.pageSize || result.total < nextRows.length)
        throw new TypeError('Table page size or total is inconsistent.')
      accepted.value = {
        rows: nextRows,
        total: result.total,
        filteredRows: snapshot(next.filteredRows),
        summary: summaryData,
      }
      const visibleKeys = new Set(nextRows.map(rowKey))
      const nextSelection = selectedKeys.value.filter((key) => visibleKeys.has(key))
      if (nextSelection.length !== selectedKeys.value.length) {
        selectedKeys.value = snapshot(nextSelection)
        input.onSelectionChange?.(selectedKeys.value)
      }
    } catch (cause) {
      if (isCurrent(ticket, controller.signal))
        error.value = cause instanceof Error ? cause : new Error('Table request failed.')
    } finally {
      if (isCurrent(ticket, controller.signal)) loading.value = false
    }
  }
  async function change(patch: Partial<UiTableQuery>): Promise<void> {
    if (disposed) return
    query.value = snapshot({ ...query.value, ...patch })
    if (selectedKeys.value.length) {
      selectedKeys.value = []
      input.onSelectionChange?.(selectedKeys.value)
    }
    input.onQueryChange?.(query.value)
    await refresh()
  }
  const controller: UiTableController = {
    schema,
    text: (value) => input.translate?.(value) ?? value,
    columns: computed(() => columns.value),
    summary: computed(() => summary.value),
    summaryRows: computed(() =>
      resolveTableSummary(
        summary.value,
        accepted.value.rows,
        accepted.value.filteredRows,
        accepted.value.summary,
        (value) => input.translate?.(value) ?? value,
      ),
    ),
    rows: computed(() => rows.value),
    total: computed(() => total.value),
    query: computed(() => query.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    selectedKeys: computed(() => selectedKeys.value),
    refresh,
    search: (filters) => change({ page: 1, filters: snapshot(filters) }),
    reset: () => change({ page: 1, filters: initialFilters, sort: null }),
    setPage: (page) => {
      if (!Number.isSafeInteger(page) || page < 1) throw new TypeError('Invalid table page.')
      return change({ page })
    },
    setPageSize: (pageSize) => {
      if (!Number.isSafeInteger(pageSize) || pageSize < 1)
        throw new TypeError('Invalid table page size.')
      return change({ page: 1, pageSize })
    },
    setSort: (sort) => {
      if (sort && !schema.columns.some((column) => column.key === sort.key && column.sortable))
        throw new TypeError('This table column is not sortable.')
      return change({ page: 1, sort })
    },
    setSelection: (keys) => {
      if (disposed) return
      const visible = new Set(rows.value.map(rowKey))
      const unique = [...new Set(keys)].filter((key) => visible.has(key))
      if (unique.some((key) => typeof key !== 'string' && typeof key !== 'number'))
        throw new TypeError('Invalid selected row key.')
      selectedKeys.value = snapshot(
        schema.selection === 'multiple'
          ? unique
          : schema.selection === 'single'
            ? unique.slice(-1)
            : [],
      )
      input.onSelectionChange?.(selectedKeys.value)
    },
    setColumnVisibility: (key, visible) => {
      if (disposed) return
      if (!columns.value.some((column) => column.key === key))
        throw new TypeError('Unknown table column.')
      if (typeof visible !== 'boolean') throw new TypeError('Invalid table column visibility.')
      if (!visible && !columns.value.some((column) => column.key !== key && !column.hidden))
        throw new TypeError('A table requires at least one visible column.')
      columns.value = snapshot(
        columns.value.map((column) =>
          column.key === key ? { ...column, hidden: !visible } : column,
        ),
      )
    },
    moveColumn: (key, direction) => {
      if (disposed) return
      const index = columns.value.findIndex((column) => column.key === key)
      if (index === -1) throw new TypeError('Unknown table column.')
      if (!['up', 'down'].includes(direction)) throw new TypeError('Invalid column direction.')
      const target = index + (direction === 'up' ? -1 : 1)
      if (target < 0 || target >= columns.value.length) return
      const next = [...columns.value]
      const [column] = next.splice(index, 1)
      if (column) next.splice(target, 0, column)
      columns.value = snapshot(next)
    },
    resetColumns: () => {
      if (!disposed) columns.value = schema.columns
    },
    setSummary: (value) => {
      if (!disposed) summary.value = parseTableSummary(value, schema.columns, schema.source.kind)
    },
    setRows: (value) => {
      if (schema.source.kind !== 'local')
        throw new TypeError('Remote data is owned by the transport.')
      const next = snapshot(value)
      validateRows(next)
      localRows = next
      return refresh()
    },
    dispose: () => {
      disposed = true
      ++sequence
      active?.abort()
      loading.value = false
    },
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      controller.dispose()
    })
  if (input.immediate !== false) void refresh()
  return controller
}
