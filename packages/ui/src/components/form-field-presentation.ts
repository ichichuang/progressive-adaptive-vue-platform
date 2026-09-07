import { computed } from 'vue'
import type { UiFormFieldProps, UiFormKey } from './form-contracts'
import { formPresentation } from '../composables/form-presentation'

export function useFormFieldPresentation<I, K extends UiFormKey<I>>(
  props: UiFormFieldProps<I, K>,
  hasControlSlot: () => boolean,
) {
  const binding = computed(() => props.form.field(props.name))
  const config = computed(() => {
    const field = props.form.fields.find((field) => field.name === props.name)
    if (field === undefined) throw new TypeError('Unknown form field.')
    if (field.kind === 'custom' && !hasControlSlot())
      throw new TypeError('Custom form fields require a typed control slot.')
    return field
  })
  // A new accepted generation or controller/field identity remounts transient
  // buffers, including custom slot children whose scalar value may be unchanged.
  const controlScopeKey = computed(() =>
    Symbol(
      `${props.form.formId}:${props.name}:${String(formPresentation(props.form).generation.value)}`,
    ),
  )
  return { binding, config, controlScopeKey }
}
