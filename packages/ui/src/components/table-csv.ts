import type { UiTableColumn, UiTableCsvFile, UiTableReadonlyRecord } from './table-contracts'
import { getFormValue } from '../composables/form-draft-values'

/** Quote every cell, preserve Unicode/newlines, and reduce common spreadsheet formula interpretation risks. */
function cell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : ''
  // Numeric values are data. Prefix common formula-like text; spreadsheet import behavior still varies.
  if (typeof value !== 'number' && (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)))
    text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

/** Pure serialization; the UI owns file download and the controller owns the exact row scope. */
export function createTableCsv(
  fileName: string,
  columns: readonly UiTableColumn[],
  rows: readonly UiTableReadonlyRecord[],
  translate: (value: string) => string,
): UiTableCsvFile {
  const visible = columns.filter((column) => !column.hidden)
  const lines = [visible.map((column) => cell(translate(column.title))).join(',')]
  for (const row of rows)
    lines.push(visible.map((column) => cell(getFormValue(row, column.key))).join(','))
  return Object.freeze({
    fileName,
    content: `\uFEFF${lines.join('\r\n')}\r\n`,
    mimeType: 'text/csv;charset=utf-8',
    rowCount: rows.length,
  })
}
