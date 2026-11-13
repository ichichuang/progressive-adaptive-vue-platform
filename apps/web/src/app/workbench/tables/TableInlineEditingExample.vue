<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { UiScrollArea, UiTable, useUiTable, useUiTableForm, type UiTableSchema } from '@platform/ui'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
import TableCapabilityWorkbench from './TableCapabilityWorkbench.vue'
import { createLocalProductTable } from './local-product-table'
import { tableShowcaseSchema, useTableShowcase } from './table-showcase'

const props = defineProps<{ readonly title: string; readonly message: string }>()
defineSlots<{ controls?: () => unknown }>()
const emit = defineEmits<{ editing: [value: boolean] }>()
const demo = useTableShowcase()
const { t } = demo
const local = createLocalProductTable()
const base = tableShowcaseSchema(false)
if (!base.editor) throw new TypeError('The inline showcase requires an editor.')
const schema: UiTableSchema = {
  ...base,
  id: 'inline-products',
  columnSettings: false,
  selection: 'none',
  batchActions: [],
  pagination: { pageSize: 10 },
  height: { mode: 'fill' },
  appearance: { striped: false, columnDividers: true },
  editor: { ...base.editor, inline: { mode: 'cell', fields: ['title', 'price', 'stock'] } },
  columns: base.columns
    .filter((column) => column.key !== 'category')
    .map((column) => ({ ...column, sortable: false, width: column.key === 'title' ? 260 : 160 })),
}
const table = useUiTable({ schema, rows: local.rows, translate: demo.translate })
const session = useUiTableForm({ table, transport: local.transport(table), copy: demo.copy })
const mode = ref<'cell' | 'row'>(schema.editor?.inline?.mode ?? 'row')
watch(session.open, (value) => {
  emit('editing', value)
})
useWorkspaceUnsavedChanges(
  () =>
    (session.form.value?.hasUnsavedChanges.value ?? false) ||
    (session.form.value?.submitting.value ?? false),
  () => session.form.value?.values.value,
)
const copyValue = computed(
  () =>
    `${props.title}\n${JSON.stringify({ ...schema, editor: { ...schema.editor, inline: { ...schema.editor?.inline, mode: mode.value } } }, null, 2)}`,
)
</script>
<template>
  <TableCapabilityWorkbench
    :title="title"
    message=""
    :copy-value="copyValue"
  >
    <template #controls>
      <UiScrollArea
        owner-id="table-inline-editing-controls"
        x-scrollable
      >
        <div
          class="flex flex-wrap items-center gap-content-gap layout-narrow:flex-nowrap layout-narrow:w-max"
        >
          <slot name="controls" />
          <NRadioGroup
            v-model:value="mode"
            :disabled="session.open.value"
            :aria-label="t('tableInline.mode')"
          >
            <NRadioButton value="cell">
              {{ t('tableInline.cell') }}
            </NRadioButton>
            <NRadioButton value="row">
              {{ t('tableInline.row') }}
            </NRadioButton>
          </NRadioGroup>
          <span class="text-caption text-text-secondary layout-narrow:hidden">{{
            t('tableInline.hint')
          }}</span>
        </div>
      </UiScrollArea>
    </template>
    <UiTable
      :table="table"
      :copy="demo.tableCopy"
      :row-actions-width="120"
      :inline-editing="{ session, copy: demo.editorCopy, mode }"
    />
  </TableCapabilityWorkbench>
</template>
