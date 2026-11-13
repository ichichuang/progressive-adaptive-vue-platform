import { isUiDateOnly, isUiTimeOnly } from '../date-time/date-time'
import type { UiFormController, UiFormFieldBinding, UiFormValue } from './form-contracts'

import { isFormAttachment } from './form-special-values'

export function isDateOnly(value: string): boolean {
  return isUiDateOnly(value)
}
export function isTimeOnly(value: string): boolean {
  return value.length === 8 && isUiTimeOnly(value)
}

export function isDateRange(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item: unknown) => typeof item === 'string' && isDateOnly(item)) &&
    value[0] <= value[1]
  )
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
    case 'mask':
      return typeof value === 'string'
    case 'slider':
    case 'rating':
      return typeof value === 'number' && Number.isFinite(value)
    case 'attachment':
      return Array.isArray(value) && value.every(isFormAttachment)
    case 'number':
      return value === null || (typeof value === 'number' && Number.isFinite(value))
    case 'switch':
      return typeof value === 'boolean'
    case 'date':
      return value === null || (typeof value === 'string' && isDateOnly(value))
    case 'time':
      return value === null || (typeof value === 'string' && isTimeOnly(value))
    case 'date-range':
      return value === null || isDateRange(value)
    case 'radio':
    case 'select':
      return value === null || option(value)
    case 'checkbox-group':
    case 'multi-select':
      return Array.isArray(value) && value.every(option)
    case 'custom':
      return false // Custom controls use the typed binding directly.
  }
}
