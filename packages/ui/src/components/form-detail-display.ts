import type { UiFormFieldConfig, UiFormFieldBinding, UiFormCopy } from './form-contracts'
import { formatUiDateTime, type UiDateTimeContext } from '../date-time/date-time'
import { isRichTextDocument, richTextPlainText } from './rich-text-document'

/** Shared plain presentation for on-screen details and captured reports. No lookup or mutation. */
export function formDetailDisplay(
  config: UiFormFieldConfig,
  binding: UiFormFieldBinding,
  copy: UiFormCopy,
  translate: (label: string) => string,
  context?: UiDateTimeContext,
): string[] {
  const value = binding.value
  if (['select', 'multi-select', 'radio', 'checkbox-group'].includes(config.kind))
    return binding.selectedOptions.map((item) =>
      item.option === null ? String(item.value) : translate(item.option.label),
    )
  if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) return []
  if (config.kind === 'rich-text' && isRichTextDocument(value)) return [richTextPlainText(value)]
  if (context && (config.kind === 'date' || config.kind === 'time') && typeof value === 'string')
    return [formatUiDateTime({ kind: config.kind, value }, context) ?? copy.empty()]
  if (context && config.kind === 'date-range' && Array.isArray(value))
    return [
      value
        .map((item) =>
          typeof item === 'string'
            ? (formatUiDateTime({ kind: 'date', value: item }, context) ?? copy.empty())
            : copy.empty(),
        )
        .join(' – '),
    ]
  if (typeof value === 'boolean') return [value ? copy.yes() : copy.no()]
  if (config.kind === 'date-range' && Array.isArray(value)) return [value.join(' – ')]
  if (config.kind === 'attachment' && Array.isArray(value))
    return value.map((item: unknown) =>
      typeof item === 'object' && item !== null && 'name' in item ? String(item.name) : '',
    )
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'object') return [JSON.stringify(value)]
  return [String(value)]
}
