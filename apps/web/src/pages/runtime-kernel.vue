<script setup lang="ts">
import { UiDescriptionList, UiPageHeader, UiSection, type UiDescriptionItem } from '@platform/ui'

import { runtimeKernelConsoleProjection } from '../app/bootstrap/runtime-kernel-console-projection'

defineOptions({ name: 'RuntimeKernelInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const kernelItems: readonly UiDescriptionItem[] = [
  { label: '启动阶段数', value: String(runtimeKernelConsoleProjection.stepCount) },
  { label: 'Provider', value: runtimeKernelConsoleProjection.activeProviderIds.join(', ') },
  { label: 'Core Errors', value: String(runtimeKernelConsoleProjection.errorRecordCounts.core) },
  {
    label: 'Router Errors',
    value: String(runtimeKernelConsoleProjection.errorRecordCounts.router),
  },
  {
    label: 'Storage Errors',
    value: String(runtimeKernelConsoleProjection.errorRecordCounts.storage),
  },
  { label: 'Error Total', value: String(runtimeKernelConsoleProjection.errorRecordCounts.total) },
]
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    description="阶段顺序来自现有 Runtime Kernel Registry。"
    title="启动与 Provider"
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
