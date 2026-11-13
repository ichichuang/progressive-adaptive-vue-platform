import { computed, shallowRef, watch } from 'vue'
import type { UiFormFieldProps } from './form-contracts'
import { formPresentation } from '../composables/form-presentation'

export function useFormFieldPresentation<I>(
  props: UiFormFieldProps<I>,
  hasControlSlot: () => boolean,
) {
  // Creating a binding reads the current draft to validate its path. Keep that
  // incidental read out of dependency tracking: moved rows retain their binding
  // until Vue updates the component's concrete path.
  const binding = shallowRef(props.form.field(props.name))
  watch(
    [
      () => props.form,
      () => props.name,
      () =>
        props.form.fields.some((field) => field.name === props.name)
          ? formPresentation(props.form).fieldIdentity(props.name)
          : undefined,
    ],
    ([form, name, identity]) => {
      // A repeat shrink can invalidate the old path before Vue unmounts its row.
      if (identity === undefined) return
      binding.value = form.field(name)
    },
    // Snapshot replacement publishes generation before rebuilding row metadata.
    // Bind after that synchronous publication, before this renderer updates.
    { flush: 'pre' },
  )
  const config = computed(() => {
    const field = props.form.fields.find((field) => field.name === props.name)
    if (field === undefined) throw new TypeError('Unknown form field.')
    if (
      field.kind === 'custom' &&
      props.mode !== 'detail' &&
      !props.form.field(props.name).readonly &&
      !hasControlSlot()
    )
      throw new TypeError('Custom form fields require a typed control slot.')
    return field
  })
  // Logical row identity survives reordering; accepted snapshots and a different
  // field/controller still remount transient buffers and custom slot children.
  const controlScopeKey = computed(() => formPresentation(props.form).fieldIdentity(props.name))
  return { binding, config, controlScopeKey }
}
