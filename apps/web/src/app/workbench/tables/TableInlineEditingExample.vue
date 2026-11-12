<script setup lang="ts">
import { computed, onDeactivated, ref } from 'vue'
import { NPopover } from 'naive-ui/es/popover'
import { NButton } from 'naive-ui/es/button'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import {
  UiFormField,
  UiScrollArea,
  UiTable,
  useUiTable,
  useUiTableForm,
  type UiTableReadonlyRecord,
  type UiTableSchema,
} from '@platform/ui'
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
const schema: UiTableSchema = {
  ...base,
  id: 'inline-products',
  columnSettings: false,
  selection: 'none',
  batchActions: [],
  pagination: { pageSize: 10 },
  height: { mode: 'fill' },
  appearance: { striped: false, columnDividers: true },
  columns: base.columns
    .filter((column) => column.key !== 'category')
    .map((column) => ({ ...column, sortable: false, width: column.key === 'title' ? 260 : 160 })),
}
const table = useUiTable({ schema, rows: local.rows, translate: demo.translate })
const session = useUiTableForm({ table, transport: local.transport(table), copy: demo.copy })
const hintOpen = ref(false)
onDeactivated(() => {
  hintOpen.value = false
})
const mode = ref<'cell' | 'row'>('cell')
const selectedField = ref<string | null>(null)
const editable = ['title', 'price', 'stock']
let originalPage = 1
const dirty = computed(
  () =>
    (session.form.value?.hasUnsavedChanges.value ?? false) ||
    (session.form.value?.submitting.value ?? false),
)
useWorkspaceUnsavedChanges(
  () => dirty.value,
  () => session.form.value?.values.value,
)
const visible = computed(() =>
  table.rows.value.some((row) => row['id'] === session.row.value?.['id']),
)
const copyValue = computed(
  () =>
    `${props.title}\nuseUiTableForm · show('edit', record, { fields }) · UiTable cell slot · UiFormField\n${JSON.stringify(schema, null, 2)}`,
)
const editedTitle = computed(() => {
  const title = session.row.value?.['title']
  return typeof title === 'string' ? title : ''
})
const status = computed(() => {
  const form = session.form.value
  if (form?.issues.value.length) return demo.copy.errorSummary(form.issues.value.length)
  return (
    form?.notice.value?.() ??
    (session.error.value
      ? demo.editorCopy.error()
      : session.open.value
        ? `${t('tableShowcase.edit')} · ${editedTitle.value}`
        : t('tableInline.local'))
  )
})

function editing(row: UiTableReadonlyRecord, key: string): boolean {
  return (
    session.open.value &&
    session.row.value?.['id'] === row['id'] &&
    editable.includes(key) &&
    (selectedField.value === null || selectedField.value === key)
  )
}
async function begin(row: UiTableReadonlyRecord, field: string | null): Promise<void> {
  if (session.open.value) return
  selectedField.value = field
  originalPage = table.query.value.page
  if (await session.show('edit', row, { fields: field === null ? editable : [field] }))
    emit('editing', true)
}
function cancel(): void {
  if (session.close(true)) {
    session.release()
    emit('editing', false)
  }
}
async function save(): Promise<void> {
  const form = session.form.value
  const result = await form?.submit()
  if (result === 'invalid') {
    const first = form?.issues.value.find((issue) => issue.field !== null)
    if (first?.field) form?.focusField(first.field)
  }
  if (!session.open.value) {
    session.release()
    emit('editing', false)
  }
}
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
      :key="mode"
      :table="table"
      :copy="demo.tableCopy"
      :row-actions-width="120"
    >
      <template #cell="{ row, column, text }">
        <UiFormField
          v-if="editing(row, column.key) && session.form.value"
          :form="session.form.value"
          :name="column.key"
        />
        <NButton
          v-else-if="mode === 'cell' && editable.includes(column.key)"
          text
          type="primary"
          :disabled="session.open.value"
          :aria-label="`${t('tableShowcase.edit')} ${table.text(column.title)} · ${String(row['title'])}`"
          @click="begin(row, column.key)"
        >
          {{ text }}
        </NButton>
        <span v-else>{{ text }}</span>
      </template>
      <template
        v-if="mode === 'row'"
        #rowActions="{ row }"
      >
        <NButton
          text
          type="primary"
          :disabled="session.open.value"
          :aria-label="`${t('tableShowcase.edit')} ${String(row['title'])}`"
          @click="begin(row, null)"
        >
          {{ t('tableShowcase.edit') }}
        </NButton>
      </template>
    </UiTable>
    <template #footer>
      <div class="flex flex-wrap items-center gap-content-gap">
        <span
          class="flex-1 min-w-0 text-caption text-text-secondary layout-narrow:sr-only"
          role="status"
          v-text="status"
        />
        <NPopover
          v-model:show="hintOpen"
          trigger="click"
          to="#pavp-overlay-root"
        >
          <template #trigger>
            <NButton
              quaternary
              class="hidden layout-narrow:inline-flex"
              :aria-label="status"
            >
              <span
                class="i-lucide-info"
                aria-hidden="true"
              />
            </NButton>
          </template>
          <div class="grid gap-component-unit">
            <span>{{ t('tableInline.hint') }}</span>
            <span>{{ status }}</span>
          </div>
        </NPopover>
        <NButton
          v-if="session.open.value && !visible"
          @click="table.setPage(originalPage)"
        >
          {{ t('tableInline.return') }}
        </NButton>
        <NButton
          :disabled="!session.open.value || Boolean(session.form.value?.submitting.value)"
          @click="cancel"
        >
          {{ demo.editorCopy.cancel() }}
        </NButton>
        <NButton
          type="primary"
          :disabled="!session.form.value || session.form.value.submitting.value"
          :loading="Boolean(session.form.value?.submitting.value)"
          @click="save"
        >
          {{ demo.editorCopy.save() }}
        </NButton>
      </div>
    </template>
  </TableCapabilityWorkbench>
</template>
