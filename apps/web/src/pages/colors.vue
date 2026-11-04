<script setup lang="ts">
import { tokenNames } from '@platform/design-system'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import TokenGallery from '../app/workbench/TokenGallery.vue'
defineOptions({ name: 'WorkbenchColorsPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const names = tokenNames.filter((name) => name.startsWith('color.'))
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="t('workbench.colorsHint')"
  >
    <TokenGallery
      :names="names"
      :label="t('workbench.colors')"
    />
  </WorkbenchPage>
</template>
