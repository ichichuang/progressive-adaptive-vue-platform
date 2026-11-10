<script setup lang="ts">
import {
  UiTableEditor,
  UiScrollArea,
  useUiTable,
  useUiTableForm,
  type UiScrollController,
} from '@platform/ui'
import { useTableShowcase } from './table-showcase'
import { editExampleProducts } from './local-product-table'
import { tableExampleSchema } from './table-examples'
import { NButton } from 'naive-ui/es/button'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
const props = defineProps<{
  readonly mode: 'create' | 'edit' | 'detail'
  readonly recordId: string | undefined
  readonly active: boolean
}>()
const emit = defineEmits<{
  closed: []
  scrollController: [controller: UiScrollController | null]
}>()
const demo = useTableShowcase()
const table = useUiTable({
  schema: tableExampleSchema('page'),
  rows: editExampleProducts.rows,
  immediate: false,
  translate: demo.translate,
})
const transport = editExampleProducts.transport(table)
const session = useUiTableForm({ table, transport, copy: demo.copy })
const dirty = () =>
  session.form.value?.hasUnsavedChanges.value === true ||
  session.form.value?.submitting.value === true
const busy = () => session.form.value?.submitting.value === true
defineExpose({ dirty, busy })
useWorkspaceUnsavedChanges(
  () =>
    session.form.value?.hasUnsavedChanges.value === true ||
    session.form.value?.submitting.value === true,
  () => session.form.value?.revision.value,
)
const record = editExampleProducts.rows.find((row) => {
  const id = row['id']
  return (typeof id === 'number' || typeof id === 'string') && String(id) === props.recordId
})
const missing = props.mode !== 'create' && record === undefined
if (!missing) void session.show(props.mode, record ?? {})
</script>
<template>
  <div class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap">
    <p class="m-0 shrink-0 text-caption text-text-secondary">
      {{ demo.t('tableExamples.memorySource') }}
    </p>
    <template v-if="missing">
      <UiScrollArea
        owner-id="architecture-console-content"
        :enabled="active"
        class="flex-1 min-h-0"
        @controller="emit('scrollController', $event)"
      >
        <p
          role="alert"
          class="m-0 text-body text-text-primary"
        >
          {{ demo.t('tableShowcase.recordMissing') }}
        </p>
      </UiScrollArea>
      <NButton
        class="self-end min-h-target-enhanced"
        @click="emit('closed')"
      >
        {{ demo.t('tableShowcase.close') }}
      </NButton>
    </template>
    <UiTableEditor
      v-else
      contained
      scroll-owner-id="architecture-console-content"
      :session="session"
      :copy="demo.editorCopy"
      @closed="emit('closed')"
      @scroll-controller="emit('scrollController', $event)"
    />
  </div>
</template>
