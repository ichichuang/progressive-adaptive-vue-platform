<script setup lang="ts">
import { computed } from 'vue'
import { UiForm, useUiTableQuery, type UiTableController } from '@platform/ui'
import { useTableShowcase } from './table-showcase'
const props = defineProps<{ readonly table: UiTableController }>()
const demo = useTableShowcase()
const { t } = demo
const query = useUiTableQuery(props.table, {
  ...demo.copy,
  submit: () => t('tableShowcase.search'),
  submitSucceeded: () => '',
})
const applied = computed(() =>
  Object.entries(props.table.query.value.filters)
    .filter(([, value]) => value !== '' && value !== null)
    .map(
      ([key, value]) =>
        `${demo.translate(key === 'title' ? 'tableShowcase.title' : 'tableShowcase.category')}: ${typeof value === 'string' ? value : JSON.stringify(value)}`,
    )
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
        query.hasUnsavedChanges.value
          ? t('tableExamples.pendingFilters')
          : t('tableExamples.appliedFilters')
      }}
      {{ applied || t('tableExamples.allRecords') }}
    </p>
  </div>
</template>
