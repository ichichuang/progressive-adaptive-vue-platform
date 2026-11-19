<script setup lang="ts">
import { watch } from 'vue'

import { UiTable, useUiTable, useUiTableForm, type UiTableSchema } from '@platform/ui'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
import { createLocalProductTable } from './local-product-table'
import { useTableShowcase } from './table-showcase'

const props = defineProps<{ readonly schema: UiTableSchema; readonly mode: 'cell' | 'row' }>()
const emit = defineEmits<{ editing: [value: boolean] }>()
const demo = useTableShowcase()
const local = createLocalProductTable()
const table = useUiTable({ schema: props.schema, rows: local.rows, translate: demo.translate })
const session = useUiTableForm({ table, transport: local.transport(table), copy: demo.copy })
watch(
  session.open,
  (value) => {
    emit('editing', value)
  },
  { flush: 'sync' },
)
useWorkspaceUnsavedChanges(
  () =>
    (session.form.value?.hasUnsavedChanges.value ?? false) ||
    (session.form.value?.submitting.value ?? false),
  () => session.form.value?.values.value,
)
</script>
<template>
  <UiTable
    :table="table"
    :copy="demo.tableCopy"
    :row-actions-width="120"
    :inline-editing="{ session, copy: demo.editorCopy, mode }"
  />
</template>
