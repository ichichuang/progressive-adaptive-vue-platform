<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue'
import { layoutRegistry } from '@platform/design-system'
import {
  UiForm,
  UiTable,
  UiTableEditor,
  useUiTable,
  useUiTableQuery,
  useUiTableForm,
  useUiTableActions,
  type UiTableSchema,
  type UiTableReadonlyRecord,
  type UiTableTransport,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import TableRowActions from './TableRowActions.vue'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { useTableShowcase } from './table-showcase'
import { editExampleProducts } from './local-product-table'
import { createPublicProductTableTransport } from './public-product-table'
import { useWorkspaceEditorNavigation } from '../../router/application-navigation'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
const props = defineProps<{ readonly schema: UiTableSchema }>()
const demo = useTableShowcase()
const { t } = demo
const navigation = useWorkspaceEditorNavigation(() => dirty())
const remote = props.schema.source.kind === 'remote'
const local = editExampleProducts
const http = createPublicProductTableTransport()
const table = useUiTable({
  schema: props.schema,
  rows: local.rows,
  transport: http,
  translate: demo.translate,
})
const baseTransport = remote ? http : local.transport(table)
const transport: UiTableTransport = {
  ...baseTransport,
  async mutate(request, signal) {
    if (!baseTransport.mutate) throw new TypeError('Mutation transport is unavailable.')
    await baseTransport.mutate(request, signal)
  },
}
const query = useUiTableQuery(table, {
  ...demo.copy,
  submit: () => t('tableShowcase.search'),
  submitSucceeded: () => '',
})
const session = useUiTableForm({ table, transport, copy: demo.copy })
const batch = useUiTableActions({ table, transport })
const notice = ref('')
const container = ref<HTMLElement>()
const compactActions = ref(false)
const regularWidth = layoutRegistry.records.find(
  (record) => record.id === 'layout.profile.regular.min-inline-size',
)?.resolvedValue
if (!regularWidth?.endsWith('rem')) throw new TypeError('Expected a rem layout threshold.')
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (!container.value) return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    compactActions.value = entry.contentRect.width < Number.parseFloat(regularWidth) * rootFontSize
  })
  resizeObserver.observe(container.value)
})
onScopeDispose(() => resizeObserver?.disconnect())
watch(
  () => local.rows,
  (rows) => {
    if (!remote) void table.setRows(rows)
  },
)
const dirty = () =>
  session.form.value?.hasUnsavedChanges.value === true ||
  session.form.value?.submitting.value === true
useWorkspaceUnsavedChanges(dirty, () => session.form.value?.revision.value)
defineExpose({ dirty })
async function open(
  mode: 'create' | 'edit' | 'detail',
  row: UiTableReadonlyRecord = {},
): Promise<void> {
  if (session.presentation === 'page') {
    const id = row['id']
    const recordId = typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
    if (mode !== 'create' && recordId === undefined) return
    // The retained page owns dirty-draft conflict confirmation when its input changes.
    await navigation.open({
      name: 'component-table-editor',
      query: mode === 'create' ? { mode } : { mode, id: recordId },
    })
  } else if (!(await session.show(mode, row))) notice.value = t('tableShowcase.closeBlocked')
}
async function remove(row: UiTableReadonlyRecord): Promise<void> {
  notice.value = (await session.remove(row, () => true))
    ? remote
      ? t('tableShowcase.simulated')
      : ''
    : t('tableShowcase.error')
}
async function removeSelected(id: string): Promise<void> {
  notice.value = (await batch.execute(id, () => true)) ? '' : t('tableShowcase.error')
}
</script>
<template>
  <div
    ref="container"
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
  >
    <UiTable
      :table="table"
      :copy="demo.tableCopy"
      :row-actions-width="compactActions ? 104 : 160"
    >
      <template #query>
        <UiForm
          :form="query"
          class="flex flex-wrap items-end gap-content-gap layout-narrow:flex-col layout-narrow:items-stretch"
        />
      </template>
      <template #actions>
        <span
          class="text-caption text-text-secondary"
          role="status"
          aria-live="polite"
          v-text="`${t('tableExamples.results')} ${String(table.total.value)}`"
        />
        <NButton
          type="primary"
          class="min-h-target-enhanced"
          :disabled="session.loading.value || session.form.value?.submitting.value === true"
          @click="open('create')"
        >
          {{ t('tableShowcase.create') }}
        </NButton>
        <NPopconfirm
          v-for="action in table.schema.batchActions ?? []"
          :key="action.id"
          :disabled="table.selectedKeys.value.length === 0"
          to="#pavp-overlay-root"
          @positive-click="removeSelected(action.id)"
        >
          <template #trigger>
            <NButton
              :disabled="table.selectedKeys.value.length === 0 || batch.pending.value !== null"
              class="min-h-target-enhanced"
            >
              {{ table.text(action.label) }} ({{ table.selectedKeys.value.length }})
            </NButton>
          </template>
          {{ t('tableShowcase.confirmRemove') }}
        </NPopconfirm>
        <span
          v-if="table.schema.selection === 'multiple'"
          class="text-caption text-text-secondary"
          v-text="t('tableShowcase.selectionScope')"
        />
      </template>
      <template #rowActions="{ row }">
        <TableRowActions
          :compact="compactActions"
          :disabled="session.loading.value || session.form.value?.submitting.value === true"
          @edit="open('edit', row)"
          @detail="open('detail', row)"
          @remove="remove(row)"
        />
      </template>
    </UiTable>
    <p
      v-if="notice"
      role="alert"
      class="m-0 text-caption text-control-error"
    >
      {{ notice }}
    </p>
    <UiTableEditor
      v-if="session.presentation !== 'page'"
      :session="session"
      :copy="demo.editorCopy"
    />
  </div>
</template>
