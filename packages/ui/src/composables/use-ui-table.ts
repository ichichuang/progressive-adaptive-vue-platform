import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import type {
  UiTableColumn,
  UiTableController,
  UiTableInput,
  UiTableKey,
  UiTableQuery,
  UiTableReadonlyRecord,
  UiTableSummaryRow,
  UiTableSort,
} from '../components/table-contracts'
import {
  parseUiTableColumnPreference,
  restoreTableColumns,
} from '../components/table-column-preference'
import { createTableCsv } from '../components/table-csv'
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
  for (const column of schema.columns) {
    const name = column.sortComparator
    if (
      name &&
      (!input.sortComparators ||
        !Object.hasOwn(input.sortComparators, name) ||
        typeof input.sortComparators[name] !== 'function')
    )
      throw new TypeError(`Unknown table sort comparator: ${name}`)
  }
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
      sorts: [],
    }),
  )
  const preferenceKey = schema.columnPreferenceKey
  const preferenceStorage = input.columnPreferenceStorage
  if (preferenceKey && !preferenceStorage)
    throw new TypeError('Column preferences require an application storage port.')
  let initialColumns = schema.columns
  if (preferenceKey && preferenceStorage) {
    try {
      const saved = preferenceStorage.read(preferenceKey)
      if (saved !== null && saved !== undefined)
        initialColumns = restoreTableColumns(schema.columns, parseUiTableColumnPreference(saved))
    } catch {
      // Unavailable or invalid storage must not prevent using the table.
    }
  }
  const columns = shallowRef<readonly UiTableColumn[]>(snapshot(initialColumns))
  function persistColumns(): void {
    if (!preferenceKey || !preferenceStorage) return
    try {
      preferenceStorage.write(preferenceKey, {
        schemaVersion: 1,
        columns: columns.value.map(({ key, hidden }) => ({ key, hidden: hidden === true })),
      })
    } catch {
      // The application adapter owns persistence diagnostics; current interaction still works.
    }
  }
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
    if (current.sorts.length)
      matching.sort((a, b) => {
        for (const sort of current.sorts) {
          const column = schema.columns.find((item) => item.key === sort.key)
          const left = getFormValue(a, sort.key)
          const right = getFormValue(b, sort.key)
          const comparator = column?.sortComparator
            ? input.sortComparators?.[column.sortComparator]
            : undefined
          const result =
            comparator && column
              ? comparator(left, right, { column, leftRow: a, rightRow: b })
              : typeof left === 'number' && typeof right === 'number'
                ? left - right
                : display(left).localeCompare(display(right))
          if (!Number.isFinite(result))
            throw new TypeError('Table sort comparators must return a finite number.')
          if (result !== 0) return sort.order === 'ascend' ? result : -result
        }
        return 0
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
  function setSorts(sorts: readonly UiTableSort[]): Promise<void> {
    if (!Array.isArray(sorts) || (schema.sorting !== 'multiple' && sorts.length > 1))
      throw new TypeError('Multiple sorting requires sorting: multiple.')
    const candidates: readonly unknown[] = sorts
    const entries: UiTableSort[] = []
    const seen = new Set<string>()
    for (const candidate of candidates) {
      if (typeof candidate !== 'object' || candidate === null)
        throw new TypeError('Invalid table sort.')
      const sort = candidate as Record<string, unknown>
      if (
        typeof sort['key'] !== 'string' ||
        !schema.columns.some((column) => column.key === sort['key'] && column.sortable)
      )
        throw new TypeError('This table column is not sortable.')
      if (
        (sort['order'] !== 'ascend' && sort['order'] !== 'descend') ||
        seen.has(sort['key']) ||
        Object.keys(sort).some((key) => key !== 'key' && key !== 'order')
      )
        throw new TypeError('Invalid or duplicate table sort.')
      seen.add(sort['key'])
      entries.push({ key: sort['key'], order: sort['order'] })
    }
    return change({ page: 1, sorts: entries, sort: entries[0] ?? null })
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
    reset: () => change({ page: 1, filters: initialFilters, sort: null, sorts: [] }),
    setPage: (page) => {
      if (!Number.isSafeInteger(page) || page < 1) throw new TypeError('Invalid table page.')
      return change({ page })
    },
    setPageSize: (pageSize) => {
      if (!Number.isSafeInteger(pageSize) || pageSize < 1)
        throw new TypeError('Invalid table page size.')
      return change({ page: 1, pageSize })
    },
    setSort: (sort) => setSorts(sort ? [sort] : []),
    setSorts,
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
      persistColumns()
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
      persistColumns()
    },
    resetColumns: () => {
      if (disposed) return
      columns.value = schema.columns
      if (preferenceKey && preferenceStorage) {
        try {
          preferenceStorage.clear(preferenceKey)
        } catch {
          // A failed storage operation does not block resetting this session.
        }
      }
    },
    exportCsv: (scope) => {
      const configuration = schema.csvExport
      if (!configuration?.scopes.includes(scope))
        throw new TypeError('This CSV scope is not enabled.')
      if (disposed || loading.value || error.value)
        throw new Error('Table data is not ready for export.')
      const selected = new Set(selectedKeys.value)
      const exportRows =
        scope === 'page' ? rows.value : rows.value.filter((row) => selected.has(rowKey(row)))
      if (exportRows.length === 0) throw new Error('No rows are available for this export scope.')
      return createTableCsv(configuration.fileName, columns.value, exportRows, (value) =>
        controller.text(value),
      )
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
