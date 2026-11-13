import { computed, shallowRef, onScopeDispose, useTemplateRef, watch, watchPostEffect } from 'vue'
import type { SelectProps } from 'naive-ui/es/select'
import type { UiFormController, UiFormFieldBinding } from '../../components/form-contracts'
import { acceptsControlValue, isDateOnly } from '../../components/form-control-values'

import { formatFormMask } from '../../components/form-special-values'

/** Typed control projection and transient input commitment, private to Naive presentation. */
export function useFormControl<I>(props: {
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding
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
  const optionItems = computed<NonNullable<SelectProps['options']>>(() => {
    const selected = new Map(props.binding.selectedOptions.map((item) => [item.value, item]))
    return props.binding.options.map((option) => {
      const evidence = selected.get(option.value)
      return {
        value: option.value,
        label:
          evidence === undefined
            ? props.form.text(option.label)
            : evidence.option === null
              ? String(evidence.value)
              : props.form.text(evidence.option.label),
        disabled: (evidence === undefined ? option : evidence.option)?.disabled === true,
      }
    })
  })
  function fallbackOption(value: string | number) {
    // Naive's non-virtual menu renders ignored nodes. Keep only the current page
    // in options and derive off-page selected labels through its official fallback.
    const option = props.binding.selectedOptions.find((item) => item.value === value)?.option
    return {
      value,
      label:
        option === undefined || option === null ? String(value) : props.form.text(option.label),
      disabled: option?.disabled === true,
    }
  }
  const selectedText = computed(() =>
    props.binding.selectedOptions
      .map((item) =>
        item.option === null ? String(item.value) : props.form.text(item.option.label),
      )
      .join(', '),
  )
  const selectDisabled = computed(
    () =>
      props.binding.disabled ||
      (props.binding.optionQuery === null && props.binding.optionsState !== 'ready'),
  )
  const readonlyComposite = computed(
    () =>
      props.binding.readonly &&
      [
        'select',
        'multi-select',
        'radio',
        'checkbox-group',
        'switch',
        'date',
        'date-range',
        'time',
      ].includes(config.value.kind),
  )
  // Naive's explicit non-error presentation is named "success". It does not
  // represent domain validity; only the controller's validation port decides it.
  const validationProps = computed(() => ({
    status: props.binding.invalid ? ('error' as const) : ('success' as const),
  }))
  // Native placeholders never replace entered text, including vendor edit buffers.
  const placeholder = computed(() => {
    const value = props.binding.value
    const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0)
    const reason = props.binding.invalid && empty ? props.binding.errors[0]?.() : undefined
    // Detailed/multiple errors remain available in the accessible summary.
    return reason !== undefined && reason.length <= 48 && !reason.includes('\n')
      ? reason
      : props.form.text(config.value.placeholder ?? '')
  })
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
  const buffer = shallowRef<string | null>(null)
  const dateText = computed(() => buffer.value ?? textValue.value)
  const numberFormat = computed(() => {
    const raw = buffer.value
    return raw !== null && (composing.value || !Number.isFinite(Number(raw)))
      ? () => raw
      : undefined
  })
  const numberFormatProps = computed(() =>
    numberFormat.value === undefined ? {} : { format: numberFormat.value },
  )
  function reportPending(): void {
    if (config.value.kind === 'attachment') return // Attachment session owns its pending lifecycle.
    // A retired keyed control can observe a shorter record before Vue unmounts
    // it. Its path no longer owns input and must not register pending state.
    if (!props.form.fields.some((field) => field.name === props.binding.name)) return
    const buffered = ['text', 'textarea', 'mask', 'number', 'date'].includes(config.value.kind)
    const value = props.binding.value
    const canonical = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    props.binding.setPendingInput(
      buffered && (composing.value || (buffer.value !== null && buffer.value !== canonical)),
    )
  }
  watch(composing, reportPending, { flush: 'sync' })
  watch(
    () => props.binding.value,
    () => {
      buffer.value = null
      reportPending()
    },
    { flush: 'sync' },
  )
  function captureComposition(event: CompositionEvent): void {
    // Select search is a query, never a pending canonical field edit.
    if (
      ['select', 'multi-select', 'radio', 'checkbox-group', 'date-range', 'time'].includes(
        config.value.kind,
      )
    )
      return
    composing.value = event.type === 'compositionstart'
  }
  function captureInput(event: Event): void {
    if (
      ['select', 'multi-select', 'radio', 'checkbox-group', 'date-range', 'time'].includes(
        config.value.kind,
      )
    )
      return
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      const correctingNumber = config.value.kind === 'number' && numberFormat.value !== undefined
      buffer.value = event.target.value
      reportPending()
      // A temporary official format override preserves invalid text on blur.
      // Naive skips immediate updates while it is present, so accept the first
      // valid correction through the same typed value boundary.
      if (correctingNumber && !composing.value) {
        const raw = buffer.value.trim()
        const value = Number(raw)
        const unfinished = raw === '-0' || (raw.includes('.') && /[.0]$/u.test(raw))
        const { min, max } = config.value
        if (raw === '') update(null)
        else if (
          !unfinished &&
          Number.isFinite(value) &&
          (min === undefined || value >= min) &&
          (max === undefined || value <= max)
        )
          update(value)
      }
    }
  }
  function update(value: unknown): boolean {
    if (config.value.kind === 'mask' && typeof value === 'string')
      value = formatFormMask(value, config.value.mask)
    if (!acceptsControlValue(props.form, props.binding, value)) return false
    const result = props.binding.setValue(value)
    const accepted = result === 'applied' || result === 'unchanged'
    if (accepted && !composing.value) {
      buffer.value = null
      reportPending()
    }
    return accepted
  }
  function updateDateText(value: string): void {
    if (buffer.value !== value) {
      buffer.value = value
      reportPending()
    }
    if (!composing.value && (value === '' || isDateOnly(value))) update(value === '' ? null : value)
  }
  function blurNumber(): void {
    // Invalid text remains visible through the official format prop. Merely
    // moving focus must not discard it or invalidate a leave confirmation.
    if (!composing.value && numberFormat.value === undefined) {
      buffer.value = null
      reportPending()
    }
    props.binding.blur()
  }
  function commit(): boolean {
    if (config.value.kind === 'attachment') return !props.binding.pendingInput
    if (
      ['select', 'multi-select', 'radio', 'checkbox-group', 'date-range', 'time'].includes(
        config.value.kind,
      )
    )
      return true
    if (composing.value) return false
    if (buffer.value === null) return true
    if (config.value.kind === 'number') {
      const raw = buffer.value.trim()
      // Match Naive's installed numeric parser; the decoder rejects NaN/Infinity.
      return update(raw === '' ? null : Number(raw))
    }
    if (config.value.kind === 'date')
      return buffer.value === '' ? update(null) : isDateOnly(buffer.value) && update(buffer.value)
    if (
      config.value.kind === 'text' ||
      config.value.kind === 'textarea' ||
      config.value.kind === 'mask'
    )
      return update(buffer.value)
    return true
  }
  function focusElement(): HTMLElement | null {
    if (!readonlyComposite.value && config.value.kind === 'radio')
      return root.value?.querySelector<HTMLElement>('input[type="radio"]:not(:disabled)') ?? null
    if (!readonlyComposite.value && config.value.kind === 'checkbox-group')
      return (
        root.value?.querySelector<HTMLElement>('[role="checkbox"]:not([aria-disabled="true"])') ??
        null
      )
    return (
      root.value?.querySelector<HTMLElement>(
        readonlyComposite.value
          ? '[data-form-readonly]'
          : '.n-base-selection-label, .n-base-selection-tags, [role="combobox"], [role="switch"], [role="slider"], button, input, textarea',
      ) ?? null
    )
  }
  watch(
    () => props.binding,
    (binding, previous) => {
      previous?.setFocusTarget(null)
      previous?.setCommitTarget(null)
      previous?.setPendingInput(false)
      binding.setFocusTarget(() => focusElement()?.focus())
      binding.setCommitTarget(commit)
      reportPending()
    },
    { immediate: true, flush: 'sync' },
  )
  watchPostEffect(() => {
    const binding = props.binding
    const attributes = {
      id: binding.controlId,
      'aria-labelledby': binding.labelId,
      'aria-describedby': [
        binding.describedBy,
        ['select', 'multi-select', 'radio', 'checkbox-group'].includes(config.value.kind)
          ? `${binding.controlId}-options`
          : '',
      ]
        .filter(Boolean)
        .join(' '),
      'aria-required': String(binding.required),
      'aria-invalid': String(binding.invalid),
      'aria-disabled': String(
        ['select', 'multi-select', 'radio', 'checkbox-group'].includes(config.value.kind)
          ? selectDisabled.value
          : binding.disabled,
      ),
    }
    // Associate the actual focus element of official controls without exposing
    // a vendor props bag on the public schema or field binding.
    const element =
      !readonlyComposite.value && ['radio', 'checkbox-group'].includes(config.value.kind)
        ? root.value?.querySelector<HTMLElement>('.n-radio-group, .n-checkbox-group')
        : focusElement()
    for (const [name, value] of Object.entries(attributes)) element?.setAttribute(name, value)
  })
  onScopeDispose(() => {
    props.binding.setFocusTarget(null)
    props.binding.setCommitTarget(null)
    props.binding.setPendingInput(false)
    buffer.value = null
    composing.value = false
  })

  return {
    root,
    config,
    textValue,
    numberValue,
    dateText,
    selectValue,
    optionItems,
    fallbackOption,
    selectedText,
    selectDisabled,
    readonlyComposite,
    validationProps,
    placeholder,
    numberHints,
    numberFormatProps,
    captureComposition,
    captureInput,
    update,
    updateDateText,
    blurNumber,
  }
}
