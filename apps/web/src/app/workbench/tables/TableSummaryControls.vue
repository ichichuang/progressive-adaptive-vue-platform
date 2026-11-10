<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UiTableController } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NModal } from 'naive-ui/es/modal'
import { NInput } from 'naive-ui/es/input'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NSelect } from 'naive-ui/es/select'
import { useTableShowcase } from './table-showcase'
import {
  tableSummaryExample,
  tableSummaryExampleDefaults as defaults,
  type TableSummaryExampleOptions,
} from './table-summary-example'

const props = defineProps<{
  readonly table: UiTableController
  readonly secondRow: boolean
}>()
const { t } = useTableShowcase()
const configurationOpen = ref(false)
const content = ref<TableSummaryExampleOptions['content']>(defaults.content)
const target = ref(defaults.target)
const scope = ref(defaults.scope)
const operation = ref(defaults.operation)
const customText = ref(t('tableExamples.summary.customText'))
const customValue = ref(defaults.value)
const category = ref('')
const contentOptions = computed(() => [
  { value: 'aggregate', label: t('tableExamples.summary.aggregate') },
  { value: 'text', label: t('tableExamples.summary.text') },
  { value: 'value', label: t('tableExamples.summary.value') },
])
const targetOptions = computed(() => [
  ...(content.value === 'aggregate'
    ? [{ value: 'both', label: t('tableExamples.summary.both') }]
    : []),
  ...props.table.schema.columns
    .filter((column) => content.value !== 'aggregate' || ['price', 'stock'].includes(column.key))
    .map((column) => ({ value: column.key, label: props.table.text(column.title) })),
])
const scopeLabels = computed(() => ({
  page: t('tableExamples.summary.page'),
  filtered: t('tableExamples.summary.filtered'),
}))
const scopeOptions = computed(() =>
  (['page', 'filtered'] as const).map((value) => ({
    value,
    label: scopeLabels.value[value],
  })),
)
const operationLabels = computed(() => ({
  sum: t('tableExamples.summary.sum'),
  avg: t('tableExamples.summary.avg'),
  min: t('tableExamples.summary.min'),
  max: t('tableExamples.summary.max'),
}))
const operationOptions = computed(() =>
  (['sum', 'avg', 'min', 'max'] as const).map((value) => ({
    value,
    label: operationLabels.value[value],
  })),
)
const categoryOptions = computed(() => [
  { value: '', label: t('tableExamples.summary.categoryAll') },
  ...['Design', 'Engineering', 'Research'].map((value) => ({ value, label: value })),
])
watch(content, (value) => {
  target.value = value === 'aggregate' ? 'both' : 'category'
})
const summaryLabel = computed(
  () => `${scopeLabels.value[scope.value]} · ${operationLabels.value[operation.value]}`,
)
const averageLabel = computed(
  () => `${scopeLabels.value[scope.value]} · ${operationLabels.value.avg}`,
)
watch(
  [
    content,
    target,
    scope,
    operation,
    () => props.secondRow,
    customText,
    customValue,
    summaryLabel,
    averageLabel,
  ],
  () => {
    props.table.setSummary(
      tableSummaryExample({
        content: content.value,
        target: target.value,
        scope: scope.value,
        operation: operation.value,
        secondRow: props.secondRow,
        text: customText.value,
        value: customValue.value,
        label: summaryLabel.value,
        averageLabel: averageLabel.value,
      }),
    )
  },
)
watch(category, (value) => {
  void props.table.search({ category: value })
})
</script>

<template>
  <NButton
    secondary
    @click="configurationOpen = true"
  >
    {{ t('tableExamples.summary.configure') }}
  </NButton>
  <NModal
    v-model:show="configurationOpen"
    preset="dialog"
    to="#pavp-overlay-root"
    :title="t('tableExamples.summary.configure')"
    :positive-text="t('tableShowcase.close')"
    @positive-click="configurationOpen = false"
  >
    <div class="grid grid-cols-2 min-w-0 items-end gap-content-gap">
      <div class="grid min-w-0 gap-component-unit">
        <span class="text-caption text-text-secondary">{{
          t('tableExamples.summary.content')
        }}</span>
        <NSelect
          v-model:value="content"
          :options="contentOptions"
          :aria-label="t('tableExamples.summary.content')"
        />
      </div>
      <div class="grid min-w-0 gap-component-unit">
        <span class="text-caption text-text-secondary">{{
          t('tableExamples.summary.columns')
        }}</span>
        <NSelect
          v-model:value="target"
          :options="targetOptions"
          :aria-label="t('tableExamples.summary.columns')"
        />
      </div>
      <div class="grid min-w-0 gap-component-unit">
        <span class="text-caption text-text-secondary">{{ t('tableExamples.summary.scope') }}</span>
        <NSelect
          v-model:value="scope"
          :options="scopeOptions"
          :disabled="content !== 'aggregate' && !secondRow"
          :aria-label="t('tableExamples.summary.scope')"
        />
      </div>
      <div
        v-if="content === 'aggregate'"
        class="grid min-w-0 gap-component-unit"
      >
        <span class="text-caption text-text-secondary">{{
          t('tableExamples.summary.operation')
        }}</span>
        <NSelect
          v-model:value="operation"
          :options="operationOptions"
          :aria-label="t('tableExamples.summary.operation')"
        />
      </div>
      <div
        v-else
        class="grid min-w-0 gap-component-unit"
      >
        <span class="text-caption text-text-secondary">{{
          t(
            content === 'text'
              ? 'tableExamples.summary.customText'
              : 'tableExamples.summary.customValue',
          )
        }}</span>
        <NInput
          v-if="content === 'text'"
          v-model:value="customText"
          :input-props="{ 'aria-label': t('tableExamples.summary.customText') }"
        />
        <NInputNumber
          v-else
          v-model:value="customValue"
          :input-props="{ 'aria-label': t('tableExamples.summary.customValue') }"
        />
      </div>
      <div class="grid min-w-0 gap-component-unit">
        <span class="text-caption text-text-secondary">{{ t('tableShowcase.category') }}</span>
        <NSelect
          v-model:value="category"
          :options="categoryOptions"
          :aria-label="t('tableShowcase.category')"
        />
      </div>
    </div>
  </NModal>
</template>
