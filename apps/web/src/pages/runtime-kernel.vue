<script setup lang="ts">
import { UiDescriptionList, UiPageHeader, UiSection, type UiDescriptionItem } from '@platform/ui'

import { runtimeKernelConsoleProjection } from '../app/bootstrap/runtime-kernel-console-projection'
import { computed } from 'vue'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'RuntimeKernelInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const kernelItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: t('console.startup-count'), value: String(runtimeKernelConsoleProjection.stepCount) },
  {
    label: t('console.provider'),
    value: runtimeKernelConsoleProjection.activeProviderIds.join(', '),
  },
  {
    label: t('console.core-errors'),
    value: String(runtimeKernelConsoleProjection.errorRecordCounts.core),
  },
  {
    label: t('console.router-errors'),
    value: String(runtimeKernelConsoleProjection.errorRecordCounts.router),
  },
  {
    label: t('console.storage-errors'),
    value: String(runtimeKernelConsoleProjection.errorRecordCounts.storage),
  },
  {
    label: t('console.error-total'),
    value: String(runtimeKernelConsoleProjection.errorRecordCounts.total),
  },
])
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    :description="t('console.kernel.description')"
    :title="t('console.kernel.title')"
  >
    <UiDescriptionList :items="kernelItems" />
    <ol class="pavp-id-list text-text-secondary">
      <li
        v-for="stepId in runtimeKernelConsoleProjection.stepIds"
        :key="stepId"
      >
        {{ stepId }}
      </li>
    </ol>
  </UiSection>
</template>

<style scoped>
.pavp-id-list {
  display: grid;
  gap: var(--ui-space-content-gap);
  margin: 0;
}
</style>
