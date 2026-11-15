import type { UiFormSchema } from './form-contracts'
import { parseUiFormSchema } from './form-schema'

export class InlineFormScopeError extends TypeError {}

/** Validate the actual editable projection using the same rules as a full form. */
export function parseInlineFormScope(form: UiFormSchema, fields: readonly string[]): UiFormSchema {
  const names = new Set(fields)
  const { steps, ...withoutSteps } = form
  void steps
  const selected = form.fields.filter((field) => names.has(field.name))
  if (
    names.size === 0 ||
    names.size !== fields.length ||
    selected.length !== names.size ||
    selected.some((field) => field.kind === 'group' || field.kind === 'repeat')
  ) {
    throw new InlineFormScopeError(
      'Inline fields must be unique existing scalar top-level form fields.',
    )
  }
  try {
    return parseUiFormSchema({ ...withoutSteps, fields: selected })
  } catch (cause) {
    if (!(cause instanceof Error)) throw cause
    throw new InlineFormScopeError(`Inline fields [${fields.join(', ')}]: ${cause.message}`, {
      cause,
    })
  }
}
