import type {
  UiFormCopy,
  UiFormFieldConfig,
  UiFormIssue,
  UiFormValue,
} from '../components/form-contracts'

import { isCompleteFormMask, isFormAttachment } from '../components/form-special-values'

export function validateFormField(
  field: UiFormFieldConfig,
  value: UiFormValue | undefined,
  required: boolean,
  copy: UiFormCopy,
  translate?: (text: string) => string,
): readonly UiFormIssue[] {
  const empty =
    value === null ||
    value === undefined ||
    value === '' ||
    (field.kind === 'rating' && value === 0) ||
    (Array.isArray(value) && value.length === 0)
  if (empty) return required ? [{ field: field.name, message: copy.required }] : []
  const rules = field.rules
  const min = rules?.min ?? field.min
  const max = rules?.max ?? field.max
  const length = typeof value === 'string' || Array.isArray(value) ? value.length : undefined
  const attachmentSize = field.kind === 'attachment' ? field.maxSize : undefined
  const invalid =
    (field.kind === 'mask' &&
      typeof value === 'string' &&
      !isCompleteFormMask(value, field.mask)) ||
    (field.kind === 'attachment' &&
      Array.isArray(value) &&
      ((field.maxFiles !== undefined && value.length > field.maxFiles) ||
        (attachmentSize !== undefined &&
          value.some(
            (item) =>
              isFormAttachment(item) && item.size !== undefined && item.size > attachmentSize,
          )))) ||
    (typeof value === 'number' &&
      ((min !== undefined && value < min) || (max !== undefined && value > max))) ||
    (length !== undefined &&
      ((rules?.minLength !== undefined && length < rules.minLength) ||
        (rules?.maxLength !== undefined && length > rules.maxLength))) ||
    (rules?.format === 'email' &&
      (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))
  return invalid
    ? [
        {
          field: field.name,
          message:
            rules?.message === undefined
              ? copy.invalidValue
              : () => translate?.(rules.message ?? '') ?? rules.message ?? '',
        },
      ]
    : []
}
