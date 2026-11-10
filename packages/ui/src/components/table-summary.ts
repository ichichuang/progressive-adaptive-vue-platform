import { cloneDraft, freezeDraftValue, getFormValue } from '../composables/form-draft-values'
import { tablePathParts } from './table-request'
import type {
  UiTableColumn,
  UiTableReadonlyRecord,
  UiTableResolvedSummaryRow,
  UiTableSummaryCell,
  UiTableSummaryFormat,
  UiTableSummaryRow,
  UiTableSummaryValue,
} from './table-contracts'

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new TypeError('Expected a table summary object.')
  return value as Record<string, unknown>
}

function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new TypeError('Unsupported table summary property.')
}

function scalar(value: unknown): value is UiTableSummaryValue {
  return (
    value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

/** Shared validation for initial JSON and explicit controller configuration changes. */
export function parseTableSummary(
  input: unknown,
  columns: readonly UiTableColumn[],
  source: 'local' | 'remote',
): readonly UiTableSummaryRow[] {
  const rows: unknown = cloneDraft(input)
  if (!Array.isArray(rows)) throw new TypeError('Expected table summary rows.')
  const columnKeys = new Set(columns.map((column) => column.key))
  const rowKeys = new Set<string>()
  for (const raw of rows) {
    const row = record(raw)
    keys(row, ['key', 'cells'])
    const key = row['key']
    if (typeof key !== 'string' || !key.trim() || rowKeys.has(key))
      throw new TypeError('Table summary row keys must be nonempty and unique.')
    rowKeys.add(key)
    const cells = record(row['cells'])
    if (Object.keys(cells).length === 0) throw new TypeError('A summary row requires cells.')
    for (const [column, rawCell] of Object.entries(cells)) {
      if (!columnKeys.has(column)) throw new TypeError('Unknown summary column.')
      const cell = record(rawCell)
      if (cell['kind'] === 'text') {
        keys(cell, ['kind', 'text'])
        if (typeof cell['text'] !== 'string') throw new TypeError('Invalid summary text.')
      } else if (cell['kind'] === 'value') {
        keys(cell, ['kind', 'value', 'from', 'format'])
        if (Object.hasOwn(cell, 'value') === Object.hasOwn(cell, 'from'))
          throw new TypeError('A summary value requires either value or from.')
        if (Object.hasOwn(cell, 'from')) tablePathParts(cell['from'])
        else if (!scalar(cell['value'])) throw new TypeError('Invalid summary value.')
      } else if (cell['kind'] === 'aggregate') {
        keys(cell, ['kind', 'operation', 'field', 'scope', 'format'])
        if (
          typeof cell['operation'] !== 'string' ||
          !['sum', 'avg', 'min', 'max', 'count'].includes(cell['operation'])
        )
          throw new TypeError('Unsupported summary aggregate.')
        if (typeof cell['scope'] !== 'string' || !['page', 'filtered'].includes(cell['scope']))
          throw new TypeError('Invalid summary scope.')
        if (cell['scope'] === 'filtered' && source !== 'local')
          throw new TypeError('Filtered summaries require local data.')
        if (Object.hasOwn(cell, 'field')) {
          if (cell['operation'] === 'count')
            throw new TypeError('A count summary counts records and cannot specify a field.')
          tablePathParts(cell['field'])
        }
      } else throw new TypeError('Unsupported summary cell kind.')
      if (cell['format'] !== undefined) {
        const format = record(cell['format'])
        keys(format, ['decimalPlaces', 'prefix', 'suffix'])
        const decimals = format['decimalPlaces']
        if (
          decimals !== undefined &&
          (typeof decimals !== 'number' ||
            !Number.isInteger(decimals) ||
            decimals < 0 ||
            decimals > 20)
        )
          throw new TypeError('Summary decimalPlaces must be an integer from 0 to 20.')
        for (const affix of ['prefix', 'suffix'])
          if (format[affix] !== undefined && typeof format[affix] !== 'string')
            throw new TypeError('Invalid summary prefix or suffix.')
      }
    }
  }
  return freezeDraftValue(rows) as readonly UiTableSummaryRow[]
}

/** Response metadata shares the same finite JSON boundary as accepted table rows. */
export function parseTableSummaryData(input: unknown): UiTableReadonlyRecord {
  return freezeDraftValue(record(cloneDraft(input === undefined ? {} : input)))
}

function aggregate(
  cell: Extract<UiTableSummaryCell, { readonly kind: 'aggregate' }>,
  column: string,
  rows: readonly UiTableReadonlyRecord[],
): number | null {
  if (cell.operation === 'count') return rows.length
  const values = rows
    .map((row) => getFormValue(row, cell.field ?? column))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (values.length === 0) return cell.operation === 'sum' && rows.length === 0 ? 0 : null
  if (cell.operation === 'min') return values.reduce((left, right) => Math.min(left, right))
  if (cell.operation === 'max') return values.reduce((left, right) => Math.max(left, right))
  const sum = values.reduce((total, value) => total + value, 0)
  // Dividing first avoids an overflowing intermediate sum for otherwise representable means.
  const result =
    cell.operation === 'avg'
      ? Number.isFinite(sum)
        ? sum / values.length
        : values.reduce((total, value) => total + value / values.length, 0)
      : sum
  return Number.isFinite(result) ? result : null
}

function format(value: UiTableSummaryValue, options: UiTableSummaryFormat | undefined): string {
  if (value === null) return ''
  const text =
    typeof value === 'number' && options?.decimalPlaces !== undefined
      ? value.toFixed(options.decimalPlaces)
      : String(value)
  return `${options?.prefix ?? ''}${text}${options?.suffix ?? ''}`
}

/** Pure projection of the last accepted dataset, independent of a newer pending query. */
export function resolveTableSummary(
  summary: readonly UiTableSummaryRow[],
  pageRows: readonly UiTableReadonlyRecord[],
  filteredRows: readonly UiTableReadonlyRecord[],
  data: UiTableReadonlyRecord,
  translate: (text: string) => string,
): readonly UiTableResolvedSummaryRow[] {
  return freezeDraftValue(
    summary.map((row) => ({
      key: row.key,
      cells: Object.fromEntries(
        Object.entries(row.cells).map(([column, cell]) => {
          if (cell.kind === 'text')
            return [column, { value: cell.text, text: translate(cell.text) }]
          const raw =
            cell.kind === 'aggregate'
              ? aggregate(cell, column, cell.scope === 'page' ? pageRows : filteredRows)
              : cell.from !== undefined
                ? getFormValue(data, cell.from)
                : cell.value
          const value = scalar(raw) ? raw : null
          return [column, { value, text: format(value, cell.format) }]
        }),
      ),
    })),
  )
}
