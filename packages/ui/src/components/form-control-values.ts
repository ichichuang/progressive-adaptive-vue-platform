import type { UiFormController, UiFormFieldBinding, UiFormValue } from './form-contracts'

function dateOnly(timestamp: number): string {
  const date = new Date(timestamp)
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false
  if (Number(value.slice(0, 4)) === 0) return false
  const date = new Date(0)
  date.setFullYear(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  )
  return dateOnly(date.getTime()) === value
}

/** Decode vendor events using the exact admitted kind and its typed option identities. */
export function acceptsControlValue<I>(
  form: UiFormController<I>,
  binding: UiFormFieldBinding,
  value: unknown,
): value is UiFormValue {
  const config = form.fields.find((field) => field.name === binding.name)
  if (config === undefined) return false
  const option = (candidate: unknown) =>
    binding.optionQuery === null
      ? binding.options.some((item) => item.value === candidate && !item.disabled)
      : typeof candidate === 'string' ||
        (typeof candidate === 'number' && Number.isFinite(candidate))
  switch (config.kind) {
    case 'text':
    case 'textarea':
      return typeof value === 'string'
    case 'number':
      return value === null || (typeof value === 'number' && Number.isFinite(value))
    case 'switch':
      return typeof value === 'boolean'
    case 'date':
      return value === null || (typeof value === 'string' && isDateOnly(value))
    case 'select':
      return value === null || option(value)
    case 'multi-select':
      return Array.isArray(value) && value.every(option)
    case 'custom':
      return false // Custom controls use the typed binding directly.
  }
}
