import type { UiTableController } from './table-contracts'
import type { UiReportTableOptions, UiReportTableSection } from './report-contracts'
import type { UiFormValue } from './form-contracts'
import { resolveTableColumnDisplay } from './table-column-display'
import { getFormValue } from '../composables/form-draft-values'

/** Synchronous presentation snapshot. Does not request hidden pages or serialize hidden columns. */
export function captureUiTableReport(
  table: UiTableController,
  options: UiReportTableOptions,
): UiReportTableSection {
  const query = table.query.value
  const sourceRows = table.rows.value
  const sourceColumns = table.columns.value
  const selection = table.selectedKeys.value
  const total = table.total.value
  const rows = table.captureRows(options.scope)
  const columns = table.columns.value.filter((column) => !column.hidden)
  if (!columns.length) throw new Error('The report requires at least one visible column.')
  const fallback = (value: UiFormValue | undefined): string => {
    if (value === undefined || value === null || value === '') return options.empty
    if (typeof value === 'boolean') return options.boolean(value)
    if (typeof value === 'number' || typeof value === 'string') return String(value)
    throw new TypeError('Structured report cells require an explicit text formatter.')
  }
  const capturedRows = rows.map((row) =>
    Object.freeze(
      columns.map((column) => {
        const value = getFormValue(row, column.key)
        if (options.formatCell) {
          const text = options.formatCell(column.key, value)
          if (typeof text !== 'string')
            throw new TypeError('Report cell formatters must return text.')
          return text
        }
        if (column.dateTime && !options.dateTime)
          throw new TypeError('Date report cells require a display context.')
        return resolveTableColumnDisplay(
          column,
          value,
          fallback,
          (value) => table.text(value),
          options.dateTime,
        ).text
      }),
    ),
  )
  const capturedColumns = Object.freeze(
    columns.map((column) => Object.freeze({ key: column.key, title: table.text(column.title) })),
  )
  // Formatters/translators are trusted code, but must not change the captured source mid-read.
  table.captureRows(options.scope)
  if (
    table.query.value !== query ||
    table.rows.value !== sourceRows ||
    table.columns.value !== sourceColumns ||
    table.selectedKeys.value !== selection ||
    table.total.value !== total
  )
    throw new Error('Table changed while capturing the report.')
  return Object.freeze({
    kind: 'table',
    title: options.title,
    scope: options.scope,
    page: query.page,
    pageSize: query.pageSize,
    total,
    selectedCount: selection.length,
    loadedCount: rows.length,
    columns: capturedColumns,
    rows: Object.freeze(capturedRows),
  })
}
