import type { UiTableSchema } from '@platform/ui'
import { tableShowcaseSchema } from './table-showcase'
import { tableSummaryExample } from './table-summary-example'

export type TableExample =
  | 'basics'
  | 'appearance'
  | 'theme'
  | 'columns'
  | 'summary'
  | 'selection'
  | 'remote'
  | 'configuration'
  | 'query'
  | 'modal'
  | 'drawer'
  | 'page'

export function tableExampleSchema(example: TableExample): UiTableSchema {
  const source = tableShowcaseSchema(
    example === 'remote',
    example === 'drawer' ? 'drawer' : example === 'page' ? 'page' : 'modal',
  )
  if (example === 'modal' || example === 'drawer' || example === 'page')
    return {
      ...source,
      id: `table-editor-${example}`,
      height: { mode: 'fill' },
      appearance: {
        headerTone: 'soft',
        striped: false,
        rowDividers: true,
        columnDividers: true,
      },
      columnSettings: false,
      selection: 'none',
      batchActions: [],
      columns: source.columns.filter((column) => ['title', 'price', 'stock'].includes(column.key)),
    }
  const table = {
    id: source.id,
    rowKey: source.rowKey,
    source: source.source,
    columns: source.columns,
    ...(source.pagination ? { pagination: source.pagination } : {}),
  }
  return {
    ...table,
    id: `table-example-${example}`,
    height: { mode: 'fill' },
    ...(example === 'columns' ||
    example === 'summary' ||
    example === 'configuration' ||
    example === 'remote'
      ? { summary: tableSummaryExample() }
      : {}),
    ...(example === 'appearance' || example === 'theme'
      ? { pagination: { pageSize: 10, pageSizes: [5, 10, 20] } }
      : {}),
    ...(example === 'columns' ||
    example === 'summary' ||
    example === 'configuration' ||
    example === 'query'
      ? {
          appearance: {
            headerTone: 'soft' as const,
            striped: false,
            rowDividers: true,
            columnDividers: true,
          },
        }
      : {}),
    columnSettings: example === 'columns' || example === 'summary' || example === 'configuration',
    selection: example === 'selection' || example === 'theme' ? 'multiple' : 'none',
    ...(example === 'selection' && source.batchActions
      ? { batchActions: source.batchActions }
      : {}),
    columns:
      example === 'columns'
        ? [
            ...table.columns.map((column) =>
              column.key === 'title' ? { ...column, fixed: 'left' as const } : column,
            ),
            { key: 'description', title: 'tableShowcase.description', width: 260, hidden: true },
          ]
        : table.columns,
    ...(example === 'query'
      ? {
          query: {
            mode: 'submit' as const,
            form: {
              columns: 2,
              fields: [
                {
                  kind: 'text' as const,
                  name: 'title',
                  label: 'tableShowcase.title',
                  placeholder: 'tableShowcase.searchHint',
                },
                {
                  kind: 'select' as const,
                  name: 'category',
                  label: 'tableShowcase.category',
                  options: [
                    { value: 'Design', label: 'Design' },
                    { value: 'Engineering', label: 'Engineering' },
                    { value: 'Research', label: 'Research' },
                  ],
                },
              ],
            },
          },
        }
      : {}),
  }
}

export const tableExampleApis: Record<TableExample, string> = {
  basics: 'UiTable · height: auto / fixed / fill · useUiTable · setPage · setPageSize · setSort',
  appearance: 'UiTable · appearance · bordered · rowDividers · columnDividers · striped · density',
  theme: 'UiTable · appearance.headerTone: neutral / soft / solid · selectedKeys · setSelection',
  columns:
    'UiTable · columnSettings · setColumnVisibility · moveColumn · resetColumns · table.summary · table.setSummary · summaryCell',
  summary: 'UiTable · summary · setSummary · summaryCell · page / filtered / server values',
  selection: 'UiTable · selectedKeys · setSelection · useUiTableActions',
  remote: 'useUiTable · resolveUiTableRequest · createTableHttpTransport · summary: page scope',
  configuration:
    'parseUiTableSchema · UiTableSchema · useUiTable · table.summary · table.setSummary · summaryCell',
  query: 'UiForm · UiTable · useUiTableQuery · table.search · table.reset',
  modal: 'UiForm · UiTable · UiTableEditor · useUiTableForm',
  drawer: 'UiForm · UiTable · UiTableEditor · presentation: drawer',
  page: 'UiForm · UiTable · UiTableEditor · presentation: page · route-query.table-editor',
}

export const tableExampleGuideKeys = {
  appearance: {
    steps: [
      'tableExamples.appearance.step1',
      'tableExamples.appearance.step2',
      'tableExamples.appearance.step3',
    ],
    boundary: 'tableExamples.appearance.boundary',
  },
  theme: {
    steps: ['tableExamples.theme.step1', 'tableExamples.theme.step2', 'tableExamples.theme.step3'],
    boundary: 'tableExamples.theme.boundary',
  },
  basics: {
    steps: [
      'tableExamples.basics.step1',
      'tableExamples.basics.step2',
      'tableExamples.basics.step3',
    ],
    boundary: 'tableExamples.basics.boundary',
  },
  columns: {
    steps: [
      'tableExamples.columns.step1',
      'tableExamples.columns.step2',
      'tableExamples.columns.step3',
    ],
    boundary: 'tableExamples.columns.boundary',
  },
  summary: {
    steps: [
      'tableCapabilities.summary.step1',
      'tableCapabilities.summary.step2',
      'tableCapabilities.summary.step3',
    ],
    boundary: 'tableCapabilities.summary.boundary',
  },
  selection: {
    steps: [
      'tableExamples.selection.step1',
      'tableExamples.selection.step2',
      'tableExamples.selection.step3',
    ],
    boundary: 'tableExamples.selection.boundary',
  },
  remote: {
    steps: [
      'tableExamples.remote.step1',
      'tableExamples.remote.step2',
      'tableExamples.remote.step3',
    ],
    boundary: 'tableExamples.remote.boundary',
  },
  configuration: {
    steps: [
      'tableExamples.configuration.step1',
      'tableExamples.configuration.step2',
      'tableExamples.configuration.step3',
    ],
    boundary: 'tableExamples.configuration.boundary',
  },
  query: {
    steps: ['tableExamples.query.step1', 'tableExamples.query.step2', 'tableExamples.query.step3'],
    boundary: 'tableExamples.query.boundary',
  },
  modal: {
    steps: ['tableExamples.modal.step1', 'tableExamples.modal.step2', 'tableExamples.modal.step3'],
    boundary: 'tableExamples.modal.boundary',
  },
  drawer: {
    steps: [
      'tableExamples.drawer.step1',
      'tableExamples.drawer.step2',
      'tableExamples.drawer.step3',
    ],
    boundary: 'tableExamples.drawer.boundary',
  },
  page: {
    steps: ['tableExamples.page.step1', 'tableExamples.page.step2', 'tableExamples.page.step3'],
    boundary: 'tableExamples.page.boundary',
  },
} as const
