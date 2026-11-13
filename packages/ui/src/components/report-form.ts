import type { UiFormController, UiFormValue } from './form-contracts'
import type { UiReportFormOptions, UiReportFormSection } from './report-contracts'
import { formDetailDisplay } from './form-detail-display'
import { cloneDraft, freezeDraftValue } from '../composables/form-draft-values'
import { parseRichTextDocument } from './rich-text-document'

/** Captures only committed, currently visible presentation. Never resolves options or changes form state. */
export function captureUiFormReport<I>(
  form: UiFormController<I>,
  options: UiReportFormOptions,
): UiReportFormSection {
  const ready = () => form.phase.value === 'idle' && !form.hasPendingInput.value
  if (!ready()) throw new Error('The form is not ready for a report.')
  const revision = form.revision.value
  const included = options.includeFields ? new Set(options.includeFields) : null
  if (included && [...included].some((name) => !form.fields.some((field) => field.name === name)))
    throw new TypeError('Report fields must be existing concrete field paths.')
  const fields: UiReportFormSection['fields'][number][] = []
  for (const field of form.fields) {
    if (included && !included.has(field.name)) continue
    const binding = form.field(field.name)
    if (binding.hidden) continue
    if (
      ['select', 'multi-select', 'radio', 'checkbox-group'].includes(field.kind) &&
      binding.selectedOptions.some((option) => option.status !== 'ready')
    )
      throw new Error('Selected option labels are not ready for a report.')
    if (field.kind === 'custom' && !options.formatCustom)
      throw new TypeError('Custom report fields require an explicit text formatter.')
    const label = form.text(field.label)
    const fullLabel = form.nodeLabel(field.name)
    const group = fullLabel === label ? '' : fullLabel.slice(0, -(label.length + 3))
    const text =
      field.kind === 'custom'
        ? options.formatCustom?.(field.name, cloneDraft(binding.value) as UiFormValue)
        : formDetailDisplay(
            field,
            binding,
            form.copy,
            (label) => form.text(label),
            options.dateTime,
          ).join(', ') || form.copy.empty()
    if (typeof text !== 'string') throw new TypeError('Custom report fields must return text.')
    fields.push(
      Object.freeze({
        label,
        group,
        text,
        ...(field.kind === 'rich-text'
          ? { richText: freezeDraftValue(parseRichTextDocument(binding.value)) }
          : {}),
      }),
    )
  }
  if (form.revision.value !== revision || !ready())
    throw new Error('The form changed while capturing the report.')
  return Object.freeze({ kind: 'form', title: options.title, fields: Object.freeze(fields) })
}
