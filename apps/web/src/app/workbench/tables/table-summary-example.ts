import type { UiTableSummaryCell, UiTableSummaryRow } from '@platform/ui'

export interface TableSummaryExampleOptions {
  readonly content: 'aggregate' | 'text' | 'value'
  readonly target: string
  readonly scope: 'page' | 'filtered'
  readonly operation: 'sum' | 'avg' | 'min' | 'max'
  readonly secondRow: boolean
  readonly text: string
  readonly value: number | null
  readonly label?: string
  readonly averageLabel?: string
}

export const tableSummaryExampleDefaults: TableSummaryExampleOptions = {
  content: 'aggregate',
  target: 'both',
  scope: 'page',
  operation: 'sum',
  secondRow: false,
  text: 'tableExamples.summary.customText',
  value: 100,
}

/** The example changes only the summary definition, never query or column state. */
export function tableSummaryExample(
  options: TableSummaryExampleOptions = tableSummaryExampleDefaults,
): readonly UiTableSummaryRow[] {
  const targets = options.target === 'both' ? ['price', 'stock'] : [options.target]
  const cells: Record<string, UiTableSummaryCell> = {
    title: {
      kind: 'text',
      text:
        options.content === 'aggregate'
          ? (options.label ?? 'tableExamples.summary.pageTotal')
          : 'tableExamples.summary.customText',
    },
  }
  for (const key of targets) {
    cells[key] =
      options.content === 'aggregate'
        ? {
            kind: 'aggregate',
            operation: options.operation,
            scope: options.scope,
            format: { decimalPlaces: key === 'price' || options.operation === 'avg' ? 2 : 0 },
          }
        : options.content === 'text'
          ? { kind: 'text', text: options.text }
          : { kind: 'value', value: options.value }
  }
  const rows: UiTableSummaryRow[] = [{ key: 'primary', cells }]
  if (options.secondRow) {
    rows.push({
      key: 'averages',
      cells: {
        title: { kind: 'text', text: options.averageLabel ?? 'tableExamples.summary.average' },
        price: {
          kind: 'aggregate',
          operation: 'avg',
          scope: options.scope,
          format: { decimalPlaces: 2 },
        },
        stock: {
          kind: 'aggregate',
          operation: 'avg',
          scope: options.scope,
          format: { decimalPlaces: 2 },
        },
      },
    })
  }
  return rows
}
