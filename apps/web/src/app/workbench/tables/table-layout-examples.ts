import type { UiTableColumn, UiTableSchema } from '@platform/ui'
import { tableSummaryExample } from './table-summary-example'

export type TableLayoutExample = 'scroll' | 'widths' | 'responsive'
export type TableLayoutViewport = 'full' | 'regular' | 'narrow'

const descriptionWidth = 500

export interface TableLayoutWidths {
  readonly title: number
  readonly flexibleTitle: boolean
}

/** Numeric widths describe sample columns, not a new visual token or resizing contract. */
export function tableLayoutSchema(example: TableLayoutExample): UiTableSchema {
  const columns: readonly UiTableColumn[] = [
    {
      key: 'id',
      title: 'tableShowcase.id',
      kind: 'number',
      width: 104,
      sortable: true,
      ...(example === 'scroll' ? { fixed: 'left' as const } : {}),
    },
    {
      key: 'title',
      title: 'tableShowcase.title',
      width: example === 'widths' ? 160 : 240,
      sortable: true,
    },
    { key: 'category', title: 'tableShowcase.category', kind: 'tag', width: 180 },
    {
      key: 'description',
      title: 'tableShowcase.description',
      width: descriptionWidth,
    },
    { key: 'price', title: 'tableShowcase.price', kind: 'number', width: 120, sortable: true },
    {
      key: 'stock',
      title: 'tableShowcase.stock',
      kind: 'number',
      width: 100,
      sortable: true,
      ...(example === 'scroll' ? { fixed: 'right' as const } : {}),
    },
  ]
  return {
    id: `table-layout-${example}`,
    rowKey: 'id',
    source: { kind: 'local' },
    height: { mode: 'fill' },
    ...(example === 'scroll' ? { summary: tableSummaryExample() } : {}),
    columnSettings: true,
    selection: 'none',
    pagination: { pageSize: 10, pageSizes: [5, 10, 20] },
    appearance: { headerTone: 'soft', striped: false, columnDividers: true, rowDividers: true },
    columns:
      example === 'widths'
        ? columns.filter((column) => ['title', 'description'].includes(column.key))
        : columns,
  }
}

/** Keep the controller's current order and hidden flags while applying a new schema width. */
export function tableLayoutColumns(
  columns: readonly UiTableColumn[],
  widths: TableLayoutWidths,
  pinned: { readonly left: boolean; readonly right: boolean },
): readonly UiTableColumn[] {
  return columns.map((column) => {
    if (column.key === 'title' || column.key === 'description') {
      const next = { ...column }
      delete next.width
      // Omit both widths together. A lone flexible column can collapse beside an oversized column.
      const width = column.key === 'title' ? widths.title : descriptionWidth
      return { ...next, ...(widths.flexibleTitle ? {} : { width }) }
    }
    if (column.key === 'id' || column.key === 'stock') {
      const next = { ...column }
      delete next.fixed
      const fixed =
        column.key === 'id'
          ? pinned.left
            ? 'left'
            : undefined
          : pinned.right
            ? 'right'
            : undefined
      return { ...next, ...(fixed ? { fixed } : {}) }
    }
    return column
  })
}
