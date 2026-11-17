<script setup lang="ts">
import { computed, onDeactivated, onMounted, onScopeDispose, provide, ref, watch } from 'vue'
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
  type UiTableController,
  type UiTableEditorAccess,
  type UiTableEditorMode,
  type UiTableBatchAccess,
  type UiTableBatchOutcome,
  type UiTableCopy,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import TableRowActions from './TableRowActions.vue'
import { tableRowRemovalKey, type SelectRowRemoval } from './table-row-removal'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { useTableShowcase } from './table-showcase'
import { editExampleProducts } from './local-product-table'
import { createPublicProductTableTransport } from './public-product-table'
import { useWorkspaceEditorNavigation } from '../../router/application-navigation'
import type { RegisteredRouteDestination } from '../../router/route-input'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
const props = defineProps<{
  readonly schema: UiTableSchema
  readonly controlled?: {
    readonly table: UiTableController
    readonly editor: UiTableEditorAccess
    readonly batch: UiTableBatchAccess
    readonly canRemove: (row: UiTableReadonlyRecord) => boolean
    readonly removal: SelectRowRemoval
    readonly destination?: (
      mode: UiTableEditorMode,
      row: UiTableReadonlyRecord,
    ) => RegisteredRouteDestination | undefined
    readonly copy?: Partial<UiTableCopy>
    readonly formatBatchOutcome: (outcome: UiTableBatchOutcome) => string
  }
}>()
const control = props.controlled
const demo = useTableShowcase()
const { t } = demo
const navigation = useWorkspaceEditorNavigation(() => dirty())
const remote = props.schema.source.kind === 'remote'
const local = editExampleProducts
const http = control ? undefined : createPublicProductTableTransport()
const table = control
  ? control.table
  : useUiTable({
      schema: props.schema,
      rows: local.rows,
      ...(http === undefined ? {} : { transport: http }),
      translate: demo.translate,
    })
const transport: UiTableTransport | undefined = control
  ? undefined
  : remote
    ? http
    : local.transport(table)
const operationPorts = control
  ? { form: { access: control.editor }, batch: { access: control.batch } }
  : transport === undefined
    ? { form: {}, batch: {} }
    : { form: { transport }, batch: { transport } }
const query = useUiTableQuery(table, {
  ...demo.copy,
  submit: () => t('tableShowcase.search'),
  submitSucceeded: () => '',
})
const session = useUiTableForm({
  table,
  copy: demo.copy,
  ...operationPorts.form,
})
const batch = useUiTableActions({ table, ...operationPorts.batch })
const createDisabled = computed(
  () =>
    !session.canOpen('create', {}) ||
    session.loading.value ||
    session.form.value?.submitting.value === true,
)
if (control) provide(tableRowRemovalKey, control.removal)
const notice = ref('')
watch(
  () => table.access?.context(),
  () => {
    notice.value = ''
  },
  { flush: 'sync' },
)
const confirmation = ref<string>()
let answer: ((accepted: boolean) => void) | undefined
function confirmBatch(id: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false)
      return
    }
    function cancel() {
      finish(false)
    }
    function finish(accepted: boolean) {
      signal.removeEventListener('abort', cancel)
      answer = undefined
      confirmation.value = undefined
      resolve(accepted)
    }
    answer = finish
    confirmation.value = id
    signal.addEventListener('abort', cancel, { once: true })
  })
}
onDeactivated(() => answer?.(false))
onScopeDispose(() => answer?.(false))
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
    if (!control && !remote) void table.setRows(rows)
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
  if (!session.canOpen(mode, row)) return
  if (session.presentation === 'page') {
    if (control) {
      const destination = control.destination?.(mode, row)
      if (!destination || !navigation.isControlled(destination)) return
      await navigation.open(destination)
      return
    }
    const id = row['id']
    const recordId = typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
    if (mode !== 'create' && recordId === undefined) return
    // The retained page owns dirty-draft conflict confirmation when its input changes.
    await navigation.open({
      name: 'component-table-editor',
      query: mode === 'create' ? { mode } : { mode, id: recordId },
    })
  } else {
    const opened = await session.show(mode, row)
    notice.value = !opened && !session.error.value ? t('tableShowcase.closeBlocked') : ''
  }
}
async function remove(row: UiTableReadonlyRecord): Promise<void> {
  if (control) return
  notice.value = (await session.remove(row, () => true))
    ? remote
      ? t('tableShowcase.simulated')
      : ''
    : t('tableShowcase.error')
}
async function removeSelected(id: string): Promise<void> {
  const origin = table.access?.context()
  const completed = await batch.execute(id, (_action, _selection, signal) =>
    control ? confirmBatch(id, signal) : true,
  )
  if (origin !== table.access?.context()) return
  notice.value = completed ? '' : t('tableShowcase.error')
}
</script>
<template>
  <div
    ref="container"
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
  >
    <UiTable
      :table="table"
      :copy="control?.copy ? { ...demo.tableCopy, ...control.copy } : demo.tableCopy"
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
          v-text="
            table.totalKnown?.value === false
              ? ''
              : `${t('tableExamples.results')} ${String(table.total.value)}`
          "
        />
        <NButton
          type="primary"
          class="min-h-target-enhanced"
          :disabled="createDisabled"
          @click="open('create')"
        >
          {{ t('tableShowcase.create') }}
        </NButton>
        <NPopconfirm
          v-for="action in table.schema.batchActions ?? []"
          :key="action.id"
          :disabled="table.selectedKeys.value.length === 0 && confirmation !== action.id"
          to="#pavp-overlay-root"
          :trigger="control ? 'manual' : 'click'"
          :show="control ? confirmation === action.id : undefined"
          @update:show="
            (open: boolean) => {
              if (control && !open) answer?.(false)
            }
          "
          @positive-click="control ? answer?.(true) : removeSelected(action.id)"
        >
          <template #trigger>
            <NButton
              :disabled="table.selectedKeys.value.length === 0 || batch.pending.value !== null"
              class="min-h-target-enhanced"
              @click="control && removeSelected(action.id)"
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
          :row="row"
          :still-listed="() => table.rows.value.includes(row)"
          :removal-blocked="session.open.value"
          :allow-edit="session.canOpen('edit', row)"
          :allow-detail="session.canOpen('detail', row)"
          :allow-remove="!control || (control.canRemove(row) && control.removal(row) !== undefined)"
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
    <ul
      v-if="control && batch.outcomes.value.length"
      class="m-0 text-caption text-text-secondary"
      aria-live="polite"
    >
      <li
        v-for="(outcome, index) in batch.outcomes.value"
        :key="index"
      >
        {{ control.formatBatchOutcome(outcome) }}
      </li>
    </ul>
    <UiTableEditor
      v-if="session.presentation !== 'page'"
      :session="session"
      :copy="demo.editorCopy"
    />
  </div>
</template>
