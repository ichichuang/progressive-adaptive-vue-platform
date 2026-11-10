<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiTable,
  useUiTable,
  useUiTableActions,
  type UiTableSchema,
  type UiTableAppearance,
  type UiTableHeight,
  type UiTableController,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { NCheckbox } from 'naive-ui/es/checkbox'
import { NTag } from 'naive-ui/es/tag'
import TableSummaryControls from './TableSummaryControls.vue'
import { createLocalProductTable } from './local-product-table'
import { createPublicProductTableTransport } from './public-product-table'
import { useTableShowcase } from './table-showcase'
const props = defineProps<{
  readonly schema: UiTableSchema
  readonly height?: UiTableHeight
  readonly demoStates?: boolean
  readonly appearance?: UiTableAppearance
  readonly summaryControls?: boolean
}>()
const emit = defineEmits<{
  configurationChange: [configuration: Pick<UiTableSchema, 'columns' | 'summary'>]
  summaryRendererChange: [enabled: boolean]
}>()
const fill = computed(() => (props.height ?? props.schema.height)?.mode === 'fill')
defineSlots<{ query?: (binding: { table: UiTableController }) => unknown }>()
const demo = useTableShowcase()
const { t } = demo
const local = createLocalProductTable()
const table = useUiTable({
  schema: props.schema,
  rows: local.rows,
  transport: createPublicProductTableTransport(),
  translate: demo.translate,
})
const batch = useUiTableActions({ table, transport: local.transport(table) })
const notice = ref('')
const emptyData = ref(false)
const richSummary = ref(false)
const summaryAverages = ref(false)
watch(richSummary, (enabled) => {
  emit('summaryRendererChange', enabled)
})
watch(
  [table.columns, table.summary],
  ([columns, summary]) => {
    emit('configurationChange', { columns, summary })
  },
  { immediate: true },
)
watch(emptyData, (empty) => {
  void table.setRows(empty ? [] : local.rows)
})
async function removeSelected(id: string): Promise<void> {
  notice.value = (await batch.execute(id, () => true)) ? '' : t('tableShowcase.error')
}
</script>
<template>
  <div
    class="min-w-0 gap-content-gap"
    :class="fill ? 'flex flex-1 flex-col min-h-0' : 'grid'"
  >
    <UiTable
      :table="table"
      :copy="demo.tableCopy"
      v-bind="{ ...(height ? { height } : {}), ...(appearance ? { appearance } : {}) }"
    >
      <template
        v-if="$slots['query'] || summaryControls"
        #query
      >
        <TableSummaryControls
          v-if="summaryControls"
          :table="table"
          :second-row="summaryAverages"
        />
        <slot
          name="query"
          :table="table"
        />
      </template>
      <template
        v-if="summaryControls && richSummary"
        #summaryCell="{ column, text }"
      >
        <NTag
          v-if="column.key === 'title' || column.key === 'category'"
          type="primary"
          size="small"
        >
          {{ text }}
        </NTag>
        <NTag
          v-else-if="column.kind === 'number'"
          type="primary"
          size="small"
          class="font-title-weight tabular-nums"
        >
          {{ text }}
        </NTag>
        <span v-else>{{ text }}</span>
      </template>
      <template #actions>
        <span
          class="text-body text-text-primary"
          role="status"
          aria-live="polite"
          v-text="`${t('tableExamples.results')} ${String(table.total.value)}`"
        />
        <NCheckbox
          v-if="summaryControls"
          v-model:checked="summaryAverages"
        >
          {{ t('tableExamples.summary.secondRow') }}
        </NCheckbox>
        <NCheckbox
          v-if="summaryControls"
          v-model:checked="richSummary"
        >
          {{ t('tableExamples.summary.rich') }}
        </NCheckbox>
        <NCheckbox
          v-if="demoStates"
          v-model:checked="emptyData"
        >
          {{ t('tableExamples.height.emptyData') }}
        </NCheckbox>
        <template
          v-if="table.schema.selection === 'multiple' || table.schema.selection === 'single'"
        >
          <span
            class="text-caption text-text-secondary"
            v-text="`${t('tableExamples.selected')} ${String(table.selectedKeys.value.length)}`"
          />
          <NButton
            class="min-h-target-enhanced"
            :disabled="table.selectedKeys.value.length === 0"
            @click="table.setSelection([])"
          >
            {{ t('tableExamples.clearSelection') }}
          </NButton>
          <NPopconfirm
            v-for="action in table.schema.batchActions ?? []"
            :key="action.id"
            to="#pavp-overlay-root"
            @positive-click="removeSelected(action.id)"
          >
            <template #trigger>
              <NButton
                type="error"
                secondary
                class="min-h-target-enhanced"
                :disabled="table.selectedKeys.value.length === 0 || batch.pending.value !== null"
              >
                {{ table.text(action.label) }}
              </NButton>
            </template>
            {{ t('tableExamples.confirmBatch') }} {{ table.selectedKeys.value.length }}
          </NPopconfirm>
        </template>
      </template>
    </UiTable>
    <p
      v-if="notice"
      role="alert"
      class="m-0 text-caption text-control-error"
    >
      {{ notice }}
    </p>
  </div>
</template>
