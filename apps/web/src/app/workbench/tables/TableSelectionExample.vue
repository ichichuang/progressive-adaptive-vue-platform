<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UiTableSchema } from '@platform/ui'
import { NRadioGroup, NRadioButton } from 'naive-ui/es/radio'
import { NPopover } from 'naive-ui/es/popover'
import { NButton } from 'naive-ui/es/button'
import TableCapabilityWorkbench from './TableCapabilityWorkbench.vue'
import TableDataExample from './TableDataExample.vue'
import { tableExampleSchema } from './table-examples'
import { useTableShowcase } from './table-showcase'

const props = defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useTableShowcase()
const mode = ref<'single' | 'multiple'>('multiple')
const schema = computed<UiTableSchema>(() => ({
  csvExport: { fileName: 'products.csv', scopes: ['page', 'selected'] },
  ...tableExampleSchema('selection'),
  selection: mode.value,
  ...(mode.value === 'single' ? { batchActions: [] } : {}),
}))
const copyValue = computed(() =>
  [
    t('tableExamples.aiRequest'),
    props.title,
    t('tableCapabilities.selection.hint'),
    'UiTable · useUiTable · setSelection · csvExport · exportCsv',
    'apps/web/src/app/workbench/tables/TableSelectionExample.vue',
    JSON.stringify(schema.value, null, 2),
  ].join('\n\n'),
)
</script>
<template>
  <TableCapabilityWorkbench
    :title="title"
    :message="message"
    :copy-value="copyValue"
  >
    <template #controls>
      <div class="flex min-w-0 items-center gap-component-unit">
        <NRadioGroup
          v-model:value="mode"
          :aria-label="t('tableCapabilities.selection.mode')"
          name="table-selection-mode"
        >
          <NRadioButton value="single">
            {{ t('tableCapabilities.selection.single') }}
          </NRadioButton>
          <NRadioButton value="multiple">
            {{ t('tableCapabilities.selection.multiple') }}
          </NRadioButton>
        </NRadioGroup>
        <NPopover
          trigger="click"
          scrollable
          to="#pavp-overlay-root"
        >
          <template #trigger>
            <NButton
              quaternary
              :aria-label="t('tableCapabilities.selection.guide')"
            >
              <span
                class="i-lucide-info"
                aria-hidden="true"
              />
            </NButton>
          </template>
          <div class="grid gap-component-unit">
            <span>{{ t('tableCapabilities.selection.hint') }}</span>
            <span>{{ t('tableShowcase.exportBoundary') }}</span>
          </div>
        </NPopover>
      </div>
    </template>
    <TableDataExample
      :key="mode"
      :schema="schema"
    />
  </TableCapabilityWorkbench>
</template>
