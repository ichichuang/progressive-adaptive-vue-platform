<script setup lang="ts">
import { computed } from 'vue'
import { UiForm, useUiTableQuery, type UiTableController } from '@platform/ui'
import { useTableShowcase } from './table-showcase'
import { tableSampleCategoryText } from './table-sample-categories'
const props = defineProps<{ readonly table: UiTableController }>()
const demo = useTableShowcase()
const { t, formatLabelValue } = demo
const query = useUiTableQuery(props.table, {
  ...demo.copy,
  submit: () => t('tableShowcase.search'),
  submitSucceeded: () => '',
})
const applied = computed(() =>
  Object.entries(props.table.query.value.filters)
    .filter(([, value]) => value !== '' && value !== null)
    .map(([key, value]) => {
      const label = demo.translate(
        key === 'title' ? 'tableShowcase.title' : 'tableShowcase.category',
      )
      const text =
        key === 'category' && typeof value === 'string'
          ? tableSampleCategoryText(value, t)
          : typeof value === 'string'
            ? value
            : JSON.stringify(value)
      return formatLabelValue(label, text)
    })
    .join(' · '),
)
</script>
<template>
  <div class="grid min-w-0 gap-content-gap">
    <UiForm
      :form="query"
      class="flex flex-wrap items-end gap-content-gap layout-narrow:flex-col layout-narrow:items-stretch"
    />
    <p
      class="m-0 text-caption text-text-secondary"
      role="status"
      aria-live="polite"
    >
      {{
        formatLabelValue(
          t(
            query.hasUnsavedChanges.value
              ? 'tableExamples.pendingFilters'
              : 'tableExamples.appliedFilters',
          ),
          applied || t('tableExamples.allRecords'),
        )
      }}
    </p>
  </div>
</template>
