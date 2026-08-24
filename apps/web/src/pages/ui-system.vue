<script setup lang="ts">
import {
  UiDescriptionList,
  UiPageHeader,
  UiSection,
  UiStatusBadge,
  uiSystemConsoleProjection,
  type UiDescriptionItem,
} from '@platform/ui'

defineOptions({ name: 'UiSystemInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const uiItems: readonly UiDescriptionItem[] = [
  { label: 'Styled Vendor', value: uiSystemConsoleProjection.styledVendor.coordinate },
  { label: 'Import Policy', value: uiSystemConsoleProjection.privateAdapterPolicyId },
  { label: '公共组件数', value: String(uiSystemConsoleProjection.publicComponentIds.length) },
  { label: '公共组件', value: uiSystemConsoleProjection.publicComponentIds.join(', ') },
]
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    description="供应商组件和类型保留在 @platform/ui 私有适配目录。"
    title="组件边界"
  >
    <UiStatusBadge
      label="ACTIVE"
      tone="active"
    />
    <UiDescriptionList :items="uiItems" />
  </UiSection>
</template>
