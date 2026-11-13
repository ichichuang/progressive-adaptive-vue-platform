import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onActivated,
  onDeactivated,
  onScopeDispose,
  shallowRef,
} from 'vue'
import type {
  UiTableColumn,
  UiTableCsvScope,
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
import { matchesLocalFilters, validateLocalFilters } from '../components/table-local-filters'
import { parseUiTableSchema } from '../components/table-schema'
import {
  parseTableSummary,
  parseTableSummaryData,
  resolveTableSummary,
} from '../components/table-summary'
import { resolveUiTableRequest } from '../components/table-request'
import {
  attachTreeChildren,
  collectTreeKeys,
  flattenTreeRecords,
  findTreeRecord,
  readTreeChildren,
  resolveUiTableTree,
  walkTreeRecords,
} from '../components/table-tree'
import { cloneDraft, freezeDraftValue, getFormValue } from './form-draft-values'

/** One owner for applied query, selection and cancellable list work. No HTTP or storage singleton. */
export function useUiTable(input: UiTableInput): UiTableController {
  const schema = parseUiTableSchema(input.schema)
  if (schema.source.kind === 'remote' && !input.transport)
    throw new TypeError('A remote table requires a transport.')
  const tree = schema.tree ? resolveUiTableTree(schema.tree) : undefined
  if (tree?.childrenRequest && !input.transport)
    throw new TypeError('Tree childrenRequest requires a transport.')
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
  function acceptFilters(value: UiTableReadonlyRecord): UiTableReadonlyRecord {
    const candidate: unknown = value
    if (candidate === null || Array.isArray(candidate) || typeof candidate !== 'object')
      throw new TypeError('Table filters must be a JSON record.')
    const filters = snapshot(value)
    validateLocalFilters(filters, schema.localFilters ?? [])
    return filters
  }
  const initialFilters = acceptFilters(input.filters ?? {})
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
  const queryChangeReason = shallowRef<'change' | 'page-correction'>('change')
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
        columns: columns.value.map(({ key, hidden, width }) => ({
          key,
          hidden: hidden === true,
          ...(width === undefined ? {} : { width }),
        })),
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
  const expandedKeys = shallowRef<readonly UiTableKey[]>(snapshot(tree?.defaultExpandedKeys ?? []))
  let localRows = snapshot(input.rows ?? [])
  let sequence = 0
  let disposed = false
  let active: AbortController | undefined
  const treeLoadErrors = shallowRef<readonly { readonly key: UiTableKey; readonly error: Error }[]>(
    [],
  )
  const childLoads = new Map<UiTableKey, AbortController>()
  function rowKey(row: UiTableReadonlyRecord): UiTableKey {
    const key = getFormValue(row, schema.rowKey)
    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError('Every table row requires a stable string or number key.')
    return key
  }
  function validateRows(value: readonly UiTableReadonlyRecord[]): void {
    const keys = new Set<UiTableKey>()
    const visit = (row: UiTableReadonlyRecord): void => {
      const key = rowKey(row)
      if (keys.has(key)) throw new TypeError('Table row keys must be unique.')
      keys.add(key)
      if (!tree) return
      const children = readTreeChildren(row, tree.childrenKey)
      if (children === undefined) return
      for (const child of children) visit(child)
    }
    for (const row of value) visit(row)
  }
  function visibleKeys(value: readonly UiTableReadonlyRecord[] = rows.value): Set<UiTableKey> {
    if (!tree) return new Set(value.map(rowKey))
    return new Set(collectTreeKeys(value, rowKey, tree.childrenKey))
  }
  function publishRows(
    nextRows: readonly UiTableReadonlyRecord[],
    totalCount: number,
    filteredRows: readonly UiTableReadonlyRecord[],
    summaryData: UiTableReadonlyRecord,
  ): void {
    accepted.value = {
      rows: nextRows,
      total: totalCount,
      filteredRows,
      summary: summaryData,
    }
    const nextVisible = visibleKeys(nextRows)
    const nextSelection = selectedKeys.value.filter((key) => nextVisible.has(key))
    if (nextSelection.length !== selectedKeys.value.length) {
      selectedKeys.value = snapshot(nextSelection)
      input.onSelectionChange?.(selectedKeys.value)
    }
    if (tree) {
      const nextExpanded = expandedKeys.value.filter((key) => nextVisible.has(key))
      if (nextExpanded.length !== expandedKeys.value.length)
        expandedKeys.value = snapshot(nextExpanded)
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
      if (schema.localFilters?.some((definition) => definition.parameter === path)) return []
      return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? filterLeaves(value as UiTableReadonlyRecord, path)
        : [[path, value] as const]
    })
  }
  function localPage(current: UiTableQuery) {
    // Grouped form values retain their nested request shape. Only the local
    // matcher projects them to the same paths used by flat filters and columns.
    const filters = filterLeaves(current.filters)
    const matching = localRows.filter(
      (row) =>
        matchesLocalFilters(row, current.filters, schema.localFilters ?? []) &&
        filters.every(([key, value]) => {
          if (key === schema.keywordSearch?.parameter) {
            if (value === null || value === '') return true
            if (typeof value !== 'string') return false
            const keyword = value.trim().toLocaleLowerCase()
            return (
              !keyword ||
              schema.keywordSearch.fields.some((field) =>
                display(getFormValue(row, field)).toLocaleLowerCase().includes(keyword),
              )
            )
          }
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
  const continuous = schema.pagination?.mode === 'load-more'
  let activeAppend = false
  async function refresh(): Promise<void> {
    if (continuous && query.value.page !== 1) {
      query.value = snapshot({ ...query.value, page: 1 })
      input.onQueryChange?.(query.value)
    }
    await fetchPage(false)
  }
  async function fetchPage(append: boolean): Promise<void> {
    if (disposed) return
    activeAppend = append
    active?.abort()
    for (const child of childLoads.values()) child.abort()
    childLoads.clear()
    treeLoadErrors.value = []
    const controller = new AbortController()
    active = controller
    const ticket = ++sequence
    const current = append ? snapshot({ ...query.value, page: query.value.page + 1 }) : query.value
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
      if (append && current.page > lastPage)
        throw new TypeError('Table total changed; refresh the collection before continuing.')
      if (current.page > lastPage) {
        queryChangeReason.value = 'page-correction'
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
      for (const controller of childLoads.values()) controller.abort()
      childLoads.clear()
      if (append) {
        const merged = new Map(rows.value.map((row) => [rowKey(row), row]))
        const previousCount = merged.size
        for (const row of nextRows) merged.set(rowKey(row), row)
        if (merged.size === previousCount || merged.size > result.total)
          throw new TypeError('The next table page must add records within the reported total.')
        publishRows([...merged.values()], result.total, snapshot(next.filteredRows), summaryData)
        query.value = current
        input.onQueryChange?.(query.value)
      } else publishRows(nextRows, result.total, snapshot(next.filteredRows), summaryData)
    } catch (cause) {
      if (isCurrent(ticket, controller.signal))
        error.value = cause instanceof Error ? cause : new Error('Table request failed.')
    } finally {
      if (isCurrent(ticket, controller.signal)) loading.value = false
    }
  }
  async function change(patch: Partial<UiTableQuery>): Promise<void> {
    if (disposed) return
    queryChangeReason.value = 'change'
    query.value = snapshot({ ...query.value, ...patch })
    if (selectedKeys.value.length) {
      selectedKeys.value = []
      input.onSelectionChange?.(selectedKeys.value)
    }
    if (tree && expandedKeys.value.length) expandedKeys.value = []
    input.onQueryChange?.(query.value)
    await refresh()
  }
  async function loadTreeChildren(row: UiTableReadonlyRecord): Promise<void> {
    if (disposed) return
    if (!tree?.childrenRequest || !transport)
      throw new TypeError('Tree childrenRequest requires a configured transport.')
    const parentKey = rowKey(row)
    const existing = findTreeRecord(rows.value, parentKey, rowKey, tree.childrenKey)
    if (!existing) throw new TypeError('Unknown tree parent row.')
    if (readTreeChildren(existing, tree.childrenKey) !== undefined) return
    childLoads.get(parentKey)?.abort()
    const controller = new AbortController()
    childLoads.set(parentKey, controller)
    const ticket = sequence
    treeLoadErrors.value = treeLoadErrors.value.filter(({ key }) => key !== parentKey)
    try {
      const response = await transport.list(
        resolveUiTableRequest(tree.childrenRequest, {
          ...query.value,
          context,
          row: existing,
          form: {},
        }),
        controller.signal,
      )
      // Read through a function so an awaited dispose() is not narrowed away.
      if (!isCurrent(ticket, controller.signal)) return
      if (!Array.isArray(response.rows)) throw new TypeError('Invalid tree children response.')
      const children = snapshot(response.rows)
      validateRows(children)
      walkTreeRecords(children, tree.childrenKey, (child) => {
        if (Object.is(rowKey(child), parentKey))
          throw new TypeError('Tree children cannot reuse the parent key.')
      })
      const nextRoots = snapshot(
        attachTreeChildren(rows.value, parentKey, children, rowKey, tree.childrenKey),
      )
      validateRows(nextRoots)
      if (schema.source.kind === 'local') {
        localRows = snapshot(
          attachTreeChildren(localRows, parentKey, children, rowKey, tree.childrenKey),
        )
      }
      publishRows(nextRoots, total.value, accepted.value.filteredRows, accepted.value.summary)
    } catch (cause) {
      if (!isCurrent(ticket, controller.signal)) return
      const failure = cause instanceof Error ? cause : new Error('Tree children request failed.')
      treeLoadErrors.value = [
        ...treeLoadErrors.value.filter(({ key }) => key !== parentKey),
        { key: parentKey, error: failure },
      ]
      throw failure
    } finally {
      if (childLoads.get(parentKey) === controller) childLoads.delete(parentKey)
    }
  }
  function validateSorts(sorts: readonly UiTableSort[]): readonly UiTableSort[] {
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
    return entries
  }
  function setSorts(sorts: readonly UiTableSort[]): Promise<void> {
    const entries = validateSorts(sorts)
    return change({ page: 1, sorts: entries, sort: entries[0] ?? null })
  }
  function captureRows(scope: UiTableCsvScope): readonly UiTableReadonlyRecord[] {
    if (!['page', 'selected'].includes(scope)) throw new TypeError('Invalid table row scope.')
    if (disposed || loading.value || error.value)
      throw new Error('Table data is not ready for export.')
    const selected = new Set(selectedKeys.value)
    const loaded = tree ? flattenTreeRecords(rows.value, tree.childrenKey) : rows.value
    const captured = scope === 'page' ? loaded : loaded.filter((row) => selected.has(rowKey(row)))
    if (captured.length === 0) throw new Error('No rows are available for this export scope.')
    return snapshot(captured)
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
    queryChangeReason: computed(() => queryChangeReason.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    selectedKeys: computed(() => selectedKeys.value),
    treeLoadErrors: computed(() => treeLoadErrors.value),
    expandedKeys: computed(() => expandedKeys.value),
    refresh,
    hasMore: computed(() => continuous && rows.value.length < total.value),
    loadMore: async () => {
      if (disposed || !continuous || loading.value || rows.value.length >= total.value) return
      await fetchPage(true)
    },
    applyQuery: (value) => {
      if (
        !Number.isSafeInteger(value.page) ||
        value.page < 1 ||
        !Number.isSafeInteger(value.pageSize) ||
        value.pageSize < 1
      )
        throw new TypeError('Invalid table pagination.')
      const sorts = validateSorts(value.sorts)
      const candidate: unknown = value.filters
      if (candidate === null || Array.isArray(candidate) || typeof candidate !== 'object')
        throw new TypeError('Table filters must be a JSON record.')
      const filters = acceptFilters(value.filters)
      if (tree && Object.keys(filters).length)
        throw new TypeError('Tree tables do not support local filters.')
      return change({
        page: value.page,
        pageSize: value.pageSize,
        filters,
        sorts,
        sort: sorts[0] ?? null,
      })
    },
    search: (filters) => change({ page: 1, filters: acceptFilters(filters) }),
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
      if (disposed) return false
      const visible = visibleKeys()
      const unique = [...new Set(keys)].filter((key) => visible.has(key))
      if (unique.some((key) => typeof key !== 'string' && typeof key !== 'number'))
        throw new TypeError('Invalid selected row key.')
      if (schema.maxSelection !== undefined && unique.length > schema.maxSelection) return false
      selectedKeys.value = snapshot(
        schema.selection === 'multiple'
          ? unique
          : schema.selection === 'single'
            ? unique.slice(-1)
            : [],
      )
      input.onSelectionChange?.(selectedKeys.value)
      return true
    },
    setExpandedKeys: (keys) => {
      if (disposed) return
      if (!tree) {
        if (keys.length) throw new TypeError('Expanded keys require a tree table.')
        expandedKeys.value = []
        return
      }
      const visible = visibleKeys()
      const unique = [...new Set(keys)].filter((key) => visible.has(key))
      if (unique.some((key) => typeof key !== 'string' && typeof key !== 'number'))
        throw new TypeError('Invalid expanded row key.')
      expandedKeys.value = snapshot(
        unique.filter((key) => {
          const row = findTreeRecord(rows.value, key, rowKey, tree.childrenKey)
          return (
            !tree.childrenRequest ||
            (row !== undefined && readTreeChildren(row, tree.childrenKey) !== undefined)
          )
        }),
      )
    },
    loadTreeChildren,
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
    reorderColumn: (key, targetKey, placement) => {
      if (disposed) return
      const column = columns.value.find((item) => item.key === key)
      if (!column || !columns.value.some((item) => item.key === targetKey))
        throw new TypeError('Unknown table column.')
      if (!['before', 'after'].includes(placement)) throw new TypeError('Invalid column placement.')
      if (key === targetKey) return
      const next = columns.value.filter((item) => item.key !== key)
      const target = next.findIndex((item) => item.key === targetKey)
      next.splice(target + (placement === 'after' ? 1 : 0), 0, column)
      columns.value = snapshot(next)
      persistColumns()
    },
    setColumnWidth: (key, width) => {
      if (disposed) return
      const column = columns.value.find((item) => item.key === key)
      if (!column) throw new TypeError('Unknown table column.')
      if (!Number.isFinite(width) || width <= 0)
        throw new TypeError('Table column width must be a positive finite number.')
      const bounded = Math.min(column.maxWidth ?? Infinity, Math.max(column.minWidth ?? 1, width))
      columns.value = snapshot(
        columns.value.map((item) => (item.key === key ? { ...item, width: bounded } : item)),
      )
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
    captureRows,
    exportCsv: (scope) => {
      const configuration = schema.csvExport
      if (!configuration?.scopes.includes(scope))
        throw new TypeError('This CSV scope is not enabled.')
      const exportRows = captureRows(scope)
      return createTableCsv(configuration.fileName, columns.value, exportRows, (value) =>
        controller.text(value),
      )
    },
    setSummary: (value) => {
      if (tree) throw new TypeError('Tree tables do not support summary rows.')
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
      for (const controller of childLoads.values()) controller.abort()
      childLoads.clear()
      loading.value = false
    },
  }
  if (continuous && getCurrentInstance()) {
    let resume = false
    onDeactivated(() => {
      resume = loading.value
      ++sequence
      active?.abort()
      loading.value = false
    })
    onActivated(() => {
      if (!resume) return
      resume = false
      void fetchPage(activeAppend)
    })
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      controller.dispose()
    })
  if (input.immediate !== false) void refresh()
  return controller
}
