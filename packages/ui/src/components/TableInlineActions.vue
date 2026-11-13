<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui/es/button'
import type { UiTableProps } from './table-contracts'

const props = defineProps<{ readonly editing: NonNullable<UiTableProps['inlineEditing']> }>()
const session = computed(() => props.editing.session)
const status = computed(() => {
  const form = session.value.form.value
  if (form?.issues.value.length) return form.copy.errorSummary(form.issues.value.length)
  return form?.notice.value?.() ?? (session.value.error.value ? props.editing.copy.error() : '')
})
function cancel(): void {
  if (session.value.close(true)) session.value.release()
}
</script>
<template>
  <div class="flex shrink-0 min-w-0 items-center gap-content-gap">
    <span
      class="flex-1 min-w-0 truncate text-caption text-control-error"
      role="status"
      :title="status"
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
