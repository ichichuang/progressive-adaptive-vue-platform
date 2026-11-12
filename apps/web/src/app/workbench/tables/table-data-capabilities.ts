import { shallowRef } from 'vue'
import type {
  UiTableRecord,
  UiTableResolvedRequest,
  UiTableSchema,
  UiTableTransport,
  UiTableSortComparator,
} from '@platform/ui'

export type TableDataCapability = 'sorting' | 'rendering' | 'virtual' | 'states'
export type TableSortExample = 'single' | 'multiple' | 'business'

/** Trusted application rule. JSON refers only to this registry key. */
export const tableDemoSortComparators: Readonly<Record<string, UiTableSortComparator>> = {
  categoryPriority: (left, right) => {
    const priority = ['Research', 'Engineering', 'Design']
    const rank = (value: unknown) => {
      const index = typeof value === 'string' ? priority.indexOf(value) : -1
      return index < 0 ? priority.length : index
    }
    return rank(left) - rank(right)
  },
}

export type TableDemoResponse = 'rows' | 'empty' | 'error' | 'slow'

/** Deterministic, local sample records. These are not fetched from a service. */
export function tableCapabilityRows(count: number): UiTableRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `PAVP ${String(index + 1).padStart(4, '0')}`,
    category: ['Design', 'Engineering', 'Research'][index % 3] ?? 'Design',
    price: (index * 17) % 300,
    stock: (index * 7) % 90,
  }))
}

export function tableDataCapabilitySchema(
  example: TableDataCapability,
  mode: 'submit' | 'change' = 'submit',
  debounce = 250,
  sorting: TableSortExample = 'single',
): UiTableSchema {
  const query = {
    mode,
    debounce,
    form: {
      columns: 2 as const,
      fields: [
        {
          kind: 'text' as const,
          name: 'title',
          label: 'tableShowcase.title',
          placeholder: 'tableCapabilities.data.searchHint',
        },
        {
          kind: 'select' as const,
          name: 'category',
          label: 'tableShowcase.category',
          options: ['Design', 'Engineering', 'Research'].map((value) => ({ value, label: value })),
        },
      ],
    },
  }
  const columns = [
    { key: 'id', title: 'tableShowcase.id', kind: 'number' as const, width: 104, sortable: true },
    { key: 'title', title: 'tableShowcase.title', width: 200, sortable: true },
    {
      ...(example === 'sorting' && sorting === 'business'
        ? { sortComparator: 'categoryPriority' }
        : {}),
      key: 'category',
      title: 'tableShowcase.category',
      kind: 'tag' as const,
      width: 160,
      sortable: true,
    },
    {
      key: 'price',
      title: 'tableShowcase.price',
      kind: 'number' as const,
      width: 120,
      sortable: true,
    },
    {
      key: 'stock',
      title: 'tableShowcase.stock',
      kind: 'number' as const,
      width: 120,
      sortable: true,
    },
  ]
  return {
    id: `table-capability-${example}`,
    rowKey: 'id',
    ...(example === 'sorting'
      ? { sorting: sorting === 'single' ? ('single' as const) : ('multiple' as const) }
      : {}),
    height: { mode: 'fill' },
    source:
      example === 'states'
        ? {
            kind: 'remote',
            request: {
              api: 'local-simulation/records',
              method: 'GET',
              params: {
                title: { from: 'filters.title' },
                category: { from: 'filters.category' },
                offset: { from: 'offset' },
                limit: { from: 'pageSize' },
                sortKey: { from: 'sort.key' },
                sortOrder: { from: 'sort.order' },
              },
            },
          }
        : { kind: 'local' },
    selection: example === 'sorting' ? 'multiple' : 'none',
    pagination:
      example === 'virtual' ? { pageSize: 2000 } : { pageSize: 10, pageSizes: [5, 10, 20] },
    columns:
      example === 'rendering'
        ? [
            { key: 'title', title: 'tableCapabilities.data.text', kind: 'text', width: 180 },
            { key: 'amount', title: 'tableCapabilities.data.number', kind: 'number', width: 120 },
            {
              key: 'enabled',
              title: 'tableCapabilities.data.boolean',
              kind: 'boolean',
              width: 120,
            },
            { key: 'date', title: 'tableCapabilities.data.date', kind: 'date', width: 240 },
            { key: 'category', title: 'tableCapabilities.data.tag', kind: 'tag', width: 140 },
            { key: 'profile.name', title: 'tableCapabilities.data.nested', width: 180 },
            { key: 'note', title: 'tableCapabilities.data.longContent', width: 300 },
          ]
        : columns,
    ...(example === 'sorting' || example === 'states' ? { query } : {}),
    ...(example === 'states'
      ? {
          summary: [
            {
              key: 'response-totals',
              cells: {
                title: { kind: 'text' as const, text: 'tableCapabilities.data.responseSummary' },
                id: { kind: 'value' as const, from: 'matching.count' },
                price: { kind: 'value' as const, from: 'matching.price' },
                stock: { kind: 'value' as const, from: 'matching.stock' },
              },
            },
          ],
        }
      : {}),
  }
}

/** Exercises the remote request/response contract without making an HTTP request. */
export function createTableDemoTransport(
  rows: readonly UiTableRecord[],
  errorMessage: () => string,
) {
  const nextResponse = shallowRef<TableDemoResponse>('rows')
  const lastRequest = shallowRef<UiTableResolvedRequest | null>(null)
  const started = shallowRef(0)
  const completed = shallowRef(0)
  const cancelled = shallowRef(0)
  const transport: UiTableTransport = {
    async list(request, signal) {
      signal.throwIfAborted()
      if (request.api !== 'local-simulation/records' || request.method !== 'GET')
        throw new TypeError('Unsupported local request simulation.')
      lastRequest.value = request
      started.value++
      const response = nextResponse.value
      nextResponse.value = 'rows'
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', abort)
          cancelled.value++
          reject(new DOMException('Local request simulation cancelled.', 'AbortError'))
        }
        const timer = setTimeout(
          () => {
            signal.removeEventListener('abort', abort)
            resolve()
          },
          response === 'slow' ? 3500 : 650,
        )
        signal.addEventListener('abort', abort, { once: true })
      })
      signal.throwIfAborted()
      if (response === 'error') throw new Error(errorMessage())
      const titleValue = request.params['title']
      const title = typeof titleValue === 'string' ? titleValue.toLocaleLowerCase() : ''
      const category = request.params['category']
      const matching =
        response === 'empty'
          ? []
          : rows.filter(
              (row) =>
                typeof row['title'] === 'string' &&
                row['title'].toLocaleLowerCase().includes(title) &&
                (!category || row['category'] === category),
            )
      const key = request.params['sortKey']
      const order = request.params['sortOrder']
      if (typeof key === 'string' && (order === 'ascend' || order === 'descend'))
        matching.sort((left, right) => {
          const a = left[key]
          const b = right[key]
          const comparison =
            typeof a === 'number' && typeof b === 'number'
              ? a - b
              : typeof a === 'string' && typeof b === 'string'
                ? a.localeCompare(b)
                : 0
          return order === 'ascend' ? comparison : -comparison
        })
      const offset = request.params['offset']
      const limit = request.params['limit']
      if (typeof offset !== 'number' || typeof limit !== 'number')
        throw new TypeError('The request requires pagination parameters.')
      completed.value++
      return {
        rows: matching.slice(offset, offset + limit),
        total: matching.length,
        summary: {
          matching: {
            count: matching.length,
            price: matching.reduce((sum, row) => sum + Number(row['price']), 0),
            stock: matching.reduce((sum, row) => sum + Number(row['stock']), 0),
          },
        },
      }
    },
  }
  return { transport, nextResponse, lastRequest, started, completed, cancelled }
}
