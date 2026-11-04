<script setup lang="ts">
import { tokenNames } from '@platform/design-system'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import TokenGallery from '../app/workbench/TokenGallery.vue'
defineOptions({ name: 'WorkbenchSizesPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const names = tokenNames.filter(
  (name) =>
    name.startsWith('spacing.') ||
    (name.startsWith('layout.') && !name.startsWith('layout.z.')) ||
    name === 'interaction.border.width' ||
    name === 'interaction.control.height' ||
    name.startsWith('interaction.radius.'),
)
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="t('workbench.sizesHint')"
  >
    <TokenGallery
      :names="names"
      :label="t('workbench.sizes')"
    />
  </WorkbenchPage>
</template>
