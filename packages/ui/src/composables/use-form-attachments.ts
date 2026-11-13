import { onScopeDispose, ref, watch } from 'vue'
import type {
  UiFormController,
  UiFormImageProcessing,
  UiFormFieldBinding,
  UiFormFieldConfig,
} from '../components/form-contracts'
import { isFormAttachment } from '../components/form-special-values'
import { sameDraftValue } from './form-draft-values'
import { formPresentation } from './form-presentation'

/** One field owns one pending selection. Vendor upload controls never own form data. */
export function useFormAttachments<I>(props: {
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding
  readonly processImage?: (
    file: File,
    options: UiFormImageProcessing,
    signal: AbortSignal,
  ) => Promise<File | null>
  readonly config: Extract<UiFormFieldConfig, { kind: 'attachment' }>
}) {
  const busy = ref(false)
  const failed = ref(false)
  let request: { controller: AbortController; binding: UiFormFieldBinding; value: unknown } | null =
    null
  function cancel(): void {
    const previous = request
    request = null
    busy.value = false
    failed.value = false
    previous?.controller.abort()
    previous?.binding.setPendingInput(false)
  }
  watch(
    () => [props.binding.disabled, props.binding.readonly, props.binding.hidden],
    ([disabled, readonly, hidden]) => {
      if (disabled || readonly || hidden) cancel()
    },
    { flush: 'sync' },
  )
  watch(
    [() => formPresentation(props.form).generation.value, () => props.binding.controlId],
    cancel,
    {
      flush: 'sync',
    },
  )
  watch(
    () => props.binding.value,
    (value) => {
      // The form immutably replaces its entire record. Unrelated edits must not cancel an upload.
      if (request && !sameDraftValue(value, request.value)) cancel()
    },
    { flush: 'sync' },
  )
  onScopeDispose(cancel)
  async function choose(selected: File): Promise<boolean> {
    const binding = props.binding
    const form = props.form
    const isDisposed = () => form.phase.value === 'disposed'
    if (busy.value || binding.disabled || binding.readonly || binding.hidden || isDisposed())
      return false
    const current = Array.isArray(binding.value) ? binding.value.filter(isFormAttachment) : []
    const { maxFiles, maxSize } = props.config
    if (
      (maxFiles !== undefined && current.length >= maxFiles) ||
      (props.config.imageProcessing === undefined &&
        maxSize !== undefined &&
        selected.size > maxSize)
    ) {
      failed.value = true
      return false
    }
    const active = { controller: new AbortController(), binding, value: binding.value }
    request = active
    const generation = formPresentation(form).generation.value
    busy.value = true
    failed.value = false
    binding.setPendingInput(true)
    try {
      let file = selected
      if (props.config.imageProcessing !== undefined) {
        if (!props.processImage) throw new TypeError('Image processor is unavailable.')
        const processed = await props.processImage(
          selected,
          props.config.imageProcessing,
          active.controller.signal,
        )
        if (processed === null || active.controller.signal.aborted || request !== active)
          return false
        if (maxSize !== undefined && processed.size > maxSize)
          throw new TypeError('Processed image exceeds the attachment limit.')
        file = processed
      }
      const attachment = await formPresentation(form).attachmentSource(props.config.source)(file, {
        signal: active.controller.signal,
        field: binding.name,
      })
      if (
        active.controller.signal.aborted ||
        request !== active ||
        !sameDraftValue(binding.value, active.value) ||
        formPresentation(form).generation.value !== generation ||
        isDisposed()
      )
        return false
      if (
        !isFormAttachment(attachment) ||
        current.some((item) => item.id === attachment.id) ||
        (maxSize !== undefined && attachment.size !== undefined && attachment.size > maxSize)
      )
        throw new TypeError('Invalid attachment reference.')
      // Detach before synchronous form watchers see our own successful publication.
      request = null
      const result = binding.setValue([...current, { ...attachment }])
      if (result !== 'applied' && result !== 'unchanged')
        throw new TypeError('Attachment was not applied.')
      binding.blur()
      return true
    } catch {
      if (!active.controller.signal.aborted) failed.value = true
      return false
    } finally {
      if (request === active) request = null
      if (request === null) {
        busy.value = false
        binding.setPendingInput(false)
      }
    }
  }
  function remove(id: string): void {
    if (busy.value || props.binding.disabled || props.binding.readonly || props.binding.hidden)
      return
    const current = Array.isArray(props.binding.value)
      ? props.binding.value.filter(isFormAttachment)
      : []
    props.binding.setValue(current.filter((item) => item.id !== id).map((item) => ({ ...item })))
    props.binding.blur()
  }
  return { busy, failed, choose, remove, cancel }
}
