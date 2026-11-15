<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import type { UiTableProps } from './table-contracts'
import { InlineFormScopeError } from './table-inline-form'

const props = defineProps<{
  readonly editing: NonNullable<UiTableProps['inlineEditing']>
  readonly mode: 'cell' | 'row'
}>()
const session = computed(() => props.editing.session)
const dismissedScopeError = shallowRef<InlineFormScopeError>()
watch(
  () => props.mode,
  () => {
    const error = session.value.error.value
    dismissedScopeError.value = error instanceof InlineFormScopeError ? error : undefined
  },
)
const status = computed(() => {
  const form = session.value.form.value
  if (form?.issues.value.length) return form.copy.errorSummary(form.issues.value.length)
  const notice = form?.notice.value?.()
  if (notice !== undefined) return notice
  const error = session.value.error.value
  if (!error || error === dismissedScopeError.value) return ''
  const copy = props.editing.copy
  return error instanceof InlineFormScopeError
    ? (copy.inlineScopeError?.() ?? copy.error())
    : copy.error()
})
function cancel(): void {
  if (session.value.close(true)) session.value.release()
}
</script>
<template>
  <div
    class="flex shrink-0 min-w-0 items-center gap-content-gap layout-narrow:flex-wrap layout-narrow:justify-end"
  >
    <span
      class="flex-1 min-w-0 break-words text-caption text-control-error layout-narrow:basis-full layout-narrow:min-h-target-enhanced"
      role="status"
    >
      {{ status }}
    </span>
    <NButton
      :disabled="!session.open.value || Boolean(session.form.value?.submitting.value)"
      @click="cancel"
    >
      {{ editing.copy.cancel() }}
    </NButton>
    <NButton
      type="primary"
      :disabled="!session.inlineFields.value.length || !session.form.value"
      :loading="Boolean(session.form.value?.submitting.value)"
      @click="session.saveInline()"
    >
      {{ editing.copy.save() }}
    </NButton>
  </div>
</template>
