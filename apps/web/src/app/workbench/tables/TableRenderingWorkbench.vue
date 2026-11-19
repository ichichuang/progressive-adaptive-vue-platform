<script setup lang="ts">
import { type HTMLAttributes, computed, ref, useId } from 'vue'

import type { UiTableSchema } from '@platform/ui'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import TableDataCapabilities from './TableDataCapabilities.vue'
import TableInlineEditingExample from './TableInlineEditingExample.vue'
import { useConsoleI18n } from '../../../shared/i18n'
import { tableShowcaseSchema } from './table-showcase'
defineOptions({ name: 'TableRenderingWorkbench' })
const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly breadcrumb?: string
}>()
const { t } = useConsoleI18n()
const viewChoiceName = `table-rendering-view-${useId()}`
const editorChoiceName = `table-inline-mode-${useId()}`
const mode = ref<'display' | 'inline'>('display')
const editing = ref(false)
const base = tableShowcaseSchema(false)
if (!base.editor) throw new TypeError('The inline showcase requires an editor.')
const inlineSchema = {
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
} satisfies UiTableSchema
const editorMode = ref<'cell' | 'row'>(inlineSchema.editor.inline.mode)
const inlineView = computed(() => {
  if (mode.value !== 'inline') return null
  const { editor } = inlineSchema
  const schema = {
    ...inlineSchema,
    editor: { ...editor, inline: { ...editor.inline, mode: editorMode.value } },
  }
  return { copyValue: `${props.title}\n${JSON.stringify(schema, null, 2)}` }
})
function switchView(value: string | number | boolean): void {
  if ((value !== 'display' && value !== 'inline') || value === mode.value || editing.value) return
  editorMode.value = inlineSchema.editor.inline.mode
  mode.value = value
}
</script>
<template>
  <TableDataCapabilities
    :title="title"
    :message="message"
    example="rendering"
    :inline-view="inlineView"
  >
    <template #controls>
      <NRadioGroup
        :value="mode"
        :name="viewChoiceName"
        :disabled="editing"
        v-bind="
          { role: 'radiogroup', 'aria-label': t('tableInline.example') } satisfies HTMLAttributes
        "
        @update:value="switchView"
      >
        <NRadioButton value="display">
          {{ t('tableInline.display') }}
        </NRadioButton>
        <NRadioButton value="inline">
          {{ t('tableInline.edit') }}
        </NRadioButton>
      </NRadioGroup>
      <NRadioGroup
        v-if="mode === 'inline'"
        v-model:value="editorMode"
        :name="editorChoiceName"
        :disabled="editing"
        v-bind="
          { role: 'radiogroup', 'aria-label': t('tableInline.mode') } satisfies HTMLAttributes
        "
      >
        <NRadioButton value="cell">
          {{ t('tableInline.cell') }}
        </NRadioButton>
        <NRadioButton value="row">
          {{ t('tableInline.row') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
    <template #inline>
      <TableInlineEditingExample
        :schema="inlineSchema"
        :mode="editorMode"
        @editing="editing = $event"
      />
    </template>
  </TableDataCapabilities>
</template>
