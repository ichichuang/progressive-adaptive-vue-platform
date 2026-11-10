<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { NInput, type InputInst } from 'naive-ui/es/input'
import type { UiFormFieldBinding } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
const props = defineProps<{ readonly binding: UiFormFieldBinding }>()
const { t } = useConsoleI18n()
const input = ref<InputInst | null>(null)
const draft = ref('')
const composing = ref(false)
function editable(): boolean {
  return !props.binding.hidden && !props.binding.disabled && !props.binding.readonly
}
function reportPending(): void {
  const value = props.binding.value
  props.binding.setPendingInput(
    composing.value || draft.value !== (typeof value === 'string' ? value : ''),
  )
}
function commit(): boolean {
  if (composing.value || !editable()) return false
  const value = draft.value.trim()
  const result = props.binding.setValue(value)
  const accepted = result === 'applied' || result === 'unchanged'
  if (accepted) {
    draft.value = value
    props.binding.setPendingInput(false)
  }
  return accepted
}
watch(
  () => props.binding.value,
  (value) => {
    if (!composing.value) draft.value = typeof value === 'string' ? value : ''
  },
  { immediate: true, flush: 'sync' },
)
watch(
  () => props.binding,
  (binding, previous) => {
    previous?.setFocusTarget(null)
    previous?.setCommitTarget(null)
    previous?.setPendingInput(false)
    binding.setFocusTarget(() => input.value?.focus())
    binding.setCommitTarget(commit)
    reportPending()
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  props.binding.setFocusTarget(null)
  props.binding.setCommitTarget(null)
  props.binding.setPendingInput(false)
})
function update(value: string): void {
  if (!editable()) return
  draft.value = value
  if (!composing.value) props.binding.setValue(value)
  reportPending()
}
function captureInput(event: Event): void {
  if (!editable()) return
  if (event.target instanceof HTMLInputElement) {
    draft.value = event.target.value
    reportPending()
  }
}
function startComposition(): void {
  if (!editable()) return
  composing.value = true
  reportPending()
}
function endComposition(event: CompositionEvent): void {
  captureInput(event)
  composing.value = false
  update(draft.value)
}
function blur(): void {
  commit()
  props.binding.blur()
}
</script>
<template>
  <NInput
    ref="input"
    :value="draft"
    :disabled="binding.disabled"
    :readonly="binding.readonly"
    :placeholder="t('formShowcase.extensionPlaceholder')"
    :input-props="{
      id: binding.controlId,
      'aria-labelledby': binding.labelId,
      'aria-describedby': binding.describedBy,
      'aria-invalid': binding.invalid,
      'aria-required': binding.required,
      onInput: captureInput,
      onCompositionstart: startComposition,
      onCompositionend: endComposition,
    }"
    @update:value="update"
    @blur="blur"
  >
    <template #prefix>
      <span class="text-text-secondary">PAVP /</span>
    </template>
  </NInput>
</template>
