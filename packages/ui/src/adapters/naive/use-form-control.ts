import { computed, shallowRef, onScopeDispose, useTemplateRef, watch, watchPostEffect } from 'vue'
import type {
  UiFormController,
  UiFormFieldBinding,
  UiFormKey,
} from '../../components/form-contracts'
import { acceptsControlValue, dateOnly, isDateOnly } from '../../components/form-control-values'

/** Typed control projection and transient input commitment, private to Naive presentation. */
export function useFormControl<I, K extends UiFormKey<I>>(props: {
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding<I, K>
}) {
  const root = useTemplateRef<HTMLElement>('root')
  const config = computed(() => {
    const config = props.form.fields.find((field) => field.name === props.binding.name)
    if (config === undefined) throw new TypeError('Unknown form control.')
    return config
  })
  const textValue = computed(() =>
    typeof props.binding.value === 'string' ? props.binding.value : '',
  )
  const numberValue = computed(() =>
    typeof props.binding.value === 'number' ? props.binding.value : null,
  )
  const selectValue = computed(() => {
    const value = props.binding.value
    if (Array.isArray(value))
      return value.filter(
        (item: unknown): item is string | number =>
          typeof item === 'string' || typeof item === 'number',
      )
    return typeof value === 'string' || typeof value === 'number' ? value : null
  })
  const optionItems = computed(() =>
    props.binding.options.map((option) => ({
      value: option.value,
      label: option.label(),
      disabled: option.disabled === true,
    })),
  )
  const selectedText = computed(() => {
    const value = selectValue.value
    const ids = Array.isArray(value) ? value : value === null ? [] : [value]
    return ids
      .map(
        (id) => props.binding.options.find((option) => option.value === id)?.label() ?? String(id),
      )
      .join(', ')
  })
  const unknownSelection = computed(() => {
    const value = selectValue.value
    const ids = Array.isArray(value) ? value : value === null ? [] : [value]
    return ids
      .filter((id) => !props.binding.options.some((option) => option.value === id))
      .map(String)
      .join(', ')
  })
  const selectDisabled = computed(
    () => props.binding.disabled || props.binding.optionsState !== 'ready',
  )
  const readonlyComposite = computed(
    () =>
      props.binding.readonly &&
      ['select', 'multi-select', 'switch', 'date'].includes(config.value.kind),
  )
  // Naive's explicit non-error presentation is named "success". It does not
  // represent domain validity; only the controller's validation port decides it.
  const validationProps = computed(() => ({
    status: props.binding.invalid ? ('error' as const) : ('success' as const),
  }))
  const numberHints = computed(() =>
    config.value.kind === 'number'
      ? {
          ...(config.value.min === undefined ? {} : { min: config.value.min }),
          ...(config.value.max === undefined ? {} : { max: config.value.max }),
          ...(config.value.step === undefined ? {} : { step: config.value.step }),
        }
      : {},
  )

  // Only transient vendor edit syntax lives here; canonical values remain in the controller.
  const composing = shallowRef(false)
  let buffer: string | null = null
  watch(
    () => props.binding.value,
    () => {
      buffer = null
    },
    { flush: 'sync' },
  )
  function captureInput(event: Event): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      buffer = event.target.value
  }
  function update(value: unknown): boolean {
    if (!acceptsControlValue(props.form, props.binding, value)) return false
    const result = props.binding.setValue(value)
    return result === 'applied' || result === 'unchanged'
  }
  function blurNumber(): void {
    // Naive normalizes or reverts its numeric text before emitting blur, even
    // when the canonical value is unchanged and no update:value event fires.
    if (!composing.value) buffer = null
    props.binding.blur()
  }
  function commit(): boolean {
    if (composing.value) return false
    if (buffer === null) return true
    if (config.value.kind === 'number') {
      const raw = buffer.trim()
      // Match Naive's installed numeric parser; the decoder rejects NaN/Infinity.
      return update(raw === '' ? null : Number(raw))
    }
    if (config.value.kind === 'date')
      return buffer === '' ? update(null) : isDateOnly(buffer) && update(buffer)
    if (config.value.kind === 'text' || config.value.kind === 'textarea') return update(buffer)
    return true
  }
  function dateDisabled(timestamp: number): boolean {
    const field = config.value
    return (
      field.kind === 'date' &&
      field.isDateAllowed?.(dateOnly(timestamp), props.form.values.value) === false
    )
  }
  function focusElement(): HTMLElement | null {
    return (
      root.value?.querySelector<HTMLElement>(
        readonlyComposite.value
          ? '[data-form-readonly]'
          : '[role="combobox"], [role="switch"], input, textarea',
      ) ?? null
    )
  }
  watch(
    () => props.binding,
    (binding, previous) => {
      previous?.setFocusTarget(null)
      previous?.setCommitTarget(null)
      binding.setFocusTarget(() => focusElement()?.focus())
      binding.setCommitTarget(commit)
    },
    { immediate: true, flush: 'sync' },
  )
  watchPostEffect(() => {
    const binding = props.binding
    const attributes = {
      id: binding.controlId,
      'aria-labelledby': binding.labelId,
      'aria-describedby': binding.describedBy,
      'aria-required': String(binding.required),
      'aria-invalid': String(binding.invalid),
      'aria-disabled': String(binding.disabled),
    }
    // NDatePicker does not expose inputProps. Associate its actual private input,
    // and the other composite focus elements, without exposing a vendor props bag.
    const element = focusElement()
    for (const [name, value] of Object.entries(attributes)) element?.setAttribute(name, value)
  })
  onScopeDispose(() => {
    props.binding.setFocusTarget(null)
    props.binding.setCommitTarget(null)
    buffer = null
    composing.value = false
  })

  return {
    config,
    textValue,
    numberValue,
    selectValue,
    optionItems,
    selectedText,
    unknownSelection,
    selectDisabled,
    readonlyComposite,
    validationProps,
    numberHints,
    composing,
    captureInput,
    update,
    blurNumber,
    dateDisabled,
  }
}
