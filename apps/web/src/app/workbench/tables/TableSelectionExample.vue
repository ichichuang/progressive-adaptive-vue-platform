<script setup lang="ts">
import { computed, ref } from 'vue'
import { NRadioGroup, NRadioButton } from 'naive-ui/es/radio'
import TableCapabilityWorkbench from './TableCapabilityWorkbench.vue'
import TableDataExample from './TableDataExample.vue'
import { tableExampleSchema } from './table-examples'
import { useTableShowcase } from './table-showcase'

const props = defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useTableShowcase()
const mode = ref<'single' | 'multiple'>('multiple')
const schema = computed(() => ({
  ...tableExampleSchema('selection'),
  selection: mode.value,
  ...(mode.value === 'single' ? { batchActions: [] } : {}),
}))
const copyValue = computed(() =>
  [
    t('tableExamples.aiRequest'),
    props.title,
    t('tableCapabilities.selection.hint'),
    'UiTable · useUiTable · setSelection',
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
    </template>
    <TableDataExample
      :key="mode"
      :schema="schema"
    />
    <template #footer>
      <p class="m-0 text-caption text-text-secondary">
        {{ t('tableCapabilities.selection.hint') }}
      </p>
    </template>
  </TableCapabilityWorkbench>
</template>
