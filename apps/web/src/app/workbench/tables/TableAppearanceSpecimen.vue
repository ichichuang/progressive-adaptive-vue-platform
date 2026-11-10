<script setup lang="ts">
import { computed, useId } from 'vue'
import { UiCopyAction, UiTable, useUiTable } from '@platform/ui'
import {
  tableAppearanceRows,
  tableAppearanceSchema,
  type TableAppearanceSpecimen,
} from './table-appearance-gallery'
import { useTableShowcase } from './table-showcase'

const props = defineProps<{ readonly specimen: TableAppearanceSpecimen }>()
const demo = useTableShowcase()
const { t } = demo
const headingId = useId()
const table = useUiTable({
  schema: tableAppearanceSchema(props.specimen),
  rows: tableAppearanceRows,
  translate: (value) =>
    value === 'tableGallery.value' ? t('tableGallery.value') : demo.translate(value),
})
const copyValue = computed(() =>
  [
    t('tableExamples.aiRequest'),
    t(props.specimen.label),
    t('tableExamples.appearance.boundary'),
    'apps/web/src/app/workbench/tables/TableAppearanceSpecimen.vue',
    'packages/ui/src/components/table-contracts.ts',
    JSON.stringify(
      {
        component: 'UiTable',
        controller: 'useUiTable',
        schema: table.schema,
        rows: tableAppearanceRows,
      },
      null,
      2,
    ),
  ].join('\n\n'),
)
</script>

<template>
  <article
    class="wb-form-panel-header rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
    :aria-labelledby="headingId"
    :data-table-style="specimen.id"
  >
    <header class="flex flex-wrap min-w-0 items-center justify-between gap-component-unit">
      <h3
        :id="headingId"
        class="font-title-weight m-0 text-body text-text-primary"
      >
        {{ t(specimen.label) }}
      </h3>
      <UiCopyAction
        variant="text"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="`${t('workbench.copy')} · ${t(specimen.label)}`"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </header>
    <UiTable
      :table="table"
      :copy="demo.tableCopy"
    />
  </article>
</template>
