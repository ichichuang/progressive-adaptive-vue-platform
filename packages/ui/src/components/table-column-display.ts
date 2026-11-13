import { formatUiDateTime, type UiDateTimeContext } from '../date-time/date-time'
import type { UiTableColumn } from './table-contracts'
import type { UiFormValue } from './form-contracts'

/** Declarative labels are presentation only; sorting, filtering and exports retain raw values. */
export function resolveTableColumnDisplay(
  column: UiTableColumn,
  value: UiFormValue | undefined,
  fallback: (value: UiFormValue | undefined) => string,
  translate: (text: string) => string,
  dateTime?: UiDateTimeContext,
): { readonly text: string; readonly tone: NonNullable<UiTableColumn['options']>[number]['tone'] } {
  if (value === null || value === undefined || value === '')
    return {
      text: column.emptyText === undefined ? fallback(value) : translate(column.emptyText),
      tone: undefined,
    }
  const option = column.options?.find((item) => item.value === value)
  if (option) return { text: translate(option.label), tone: option.tone }
  if (
    (column.kind === 'boolean' && typeof value !== 'boolean') ||
    (column.kind === 'number' && (typeof value !== 'number' || !Number.isFinite(value)))
  )
    return {
      text: column.emptyText === undefined ? fallback(null) : translate(column.emptyText),
      tone: undefined,
    }
  const date = column.dateTime
  if (date !== undefined) {
    const input =
      date.kind === 'timestamp'
        ? typeof value === 'number'
          ? ({ kind: date.kind, value, unit: date.unit } as const)
          : null
        : typeof value === 'string'
          ? ({ kind: date.kind, value } as const)
          : null
    const formatted = input && dateTime ? formatUiDateTime(input, dateTime, date.preset) : null
    return {
      text:
        formatted ??
        (column.emptyText === undefined ? fallback(null) : translate(column.emptyText)),
      tone: undefined,
    }
  }
  const format = column.format
  const text =
    typeof value === 'number' && Number.isFinite(value) && format?.decimalPlaces !== undefined
      ? value.toFixed(format.decimalPlaces)
      : fallback(value)
  return { text: `${format?.prefix ?? ''}${text}${format?.suffix ?? ''}`, tone: undefined }
}
