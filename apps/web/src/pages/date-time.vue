<script setup lang="ts">
import { UiCopyAction } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import DateTimeShowcase from '../app/workbench/DateTimeShowcase.vue'
defineOptions({ name: 'WorkbenchDateTimePage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <template #actions>
      <UiCopyAction
        variant="tertiary"
        :value="t('dateShowcase.copy')"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('formShowcase.copyAI')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <DateTimeShowcase />
  </WorkbenchPage>
</template>
