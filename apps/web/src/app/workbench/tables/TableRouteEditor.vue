<script setup lang="ts">
import {
  UiTableEditor,
  UiScrollArea,
  useUiTable,
  useUiTableForm,
  type UiScrollController,
  type UiTableController,
  type UiTableEditorAccess,
  type UiTableReadonlyRecord,
} from '@platform/ui'
import { useTableShowcase } from './table-showcase'
import { editExampleProducts } from './local-product-table'
import { tableExampleSchema } from './table-examples'
import { NButton } from 'naive-ui/es/button'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
import { useWorkspaceEditorNavigation } from '../../router/application-navigation'
import type { RegisteredRouteDestination } from '../../router/route-input'
const props = defineProps<{
  readonly mode: 'create' | 'edit' | 'detail'
  readonly recordId: string | undefined
  readonly active: boolean
  readonly controlled?: {
    readonly table: UiTableController
    /** Host mapping from the validated route ID to safe target metadata. */
    readonly target: (id: string | undefined) => UiTableReadonlyRecord | undefined
    readonly editor: (onRecordUnavailable: () => void) => UiTableEditorAccess
    readonly fallback: RegisteredRouteDestination
  }
}>()
const emit = defineEmits<{
  closed: []
  scrollController: [controller: UiScrollController | null]
}>()
const demo = useTableShowcase()
const control = props.controlled
const navigation = useWorkspaceEditorNavigation(() => dirty())
if (navigation.isCurrentControlled() !== (control !== undefined))
  throw new TypeError('The table editor provider does not match the authorized destination.')
const table = control
  ? control.table
  : useUiTable({
      schema: tableExampleSchema('page'),
      rows: editExampleProducts.rows,
      immediate: false,
      translate: demo.translate,
    })
const editor = control?.editor(() => {
  navigation.withdrawAccess()
})
if (control && !editor) throw new TypeError('A scoped editor provider is required.')
const session = useUiTableForm({
  table,
  copy: demo.copy,
  ...(editor ? { access: editor } : { transport: editExampleProducts.transport(table) }),
})
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
const record = control
  ? control.target(props.recordId)
  : editExampleProducts.rows.find((row) => {
      const id = row['id']
      return (typeof id === 'number' || typeof id === 'string') && String(id) === props.recordId
    })
const missing = (control !== undefined || props.mode !== 'create') && record === undefined
if (!missing) {
  if (control) {
    // The route is already authorized. The editor still resolves its independent record check.
    if (!record || !session.canOpen(props.mode, record)) navigation.withdrawAccess()
    else void session.show(props.mode, record)
  } else void session.show(props.mode, record ?? {})
}
async function close(): Promise<void> {
  if (control) {
    await navigation.close(control.fallback)
    return
  }
  emit('closed')
}
</script>
<template>
  <div class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap">
    <p
      v-if="!control"
      class="m-0 shrink-0 text-caption text-text-secondary"
    >
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
        @click="close"
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
      @closed="close"
      @scroll-controller="emit('scrollController', $event)"
    />
  </div>
</template>
