<script setup lang="ts">
import { designSystemConsoleProjection } from '@platform/design-system'
import {
  UiDescriptionList,
  UiPageHeader,
  UiSection,
  UiStatusBadge,
  type UiDescriptionItem,
} from '@platform/ui'

defineOptions({ name: 'DesignTokenInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const manifestItems: readonly UiDescriptionItem[] = [
  { label: 'Manifest Schema', value: String(designSystemConsoleProjection.manifestSchemaVersion) },
  { label: 'Manifest Records', value: String(designSystemConsoleProjection.manifestRecordCount) },
  { label: '公共角色', value: String(designSystemConsoleProjection.publicRoleCount) },
  { label: '公共颜色角色', value: String(designSystemConsoleProjection.publicColorRoleCount) },
  { label: '内置主题', value: designSystemConsoleProjection.builtInThemeIds.join(', ') },
  { label: '主题平面', value: designSystemConsoleProjection.planeIds.join(', ') },
  { label: '对比度', value: designSystemConsoleProjection.contrastValues.join(', ') },
  { label: '材质', value: designSystemConsoleProjection.materialValues.join(', ') },
]
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    description="只公开计数、稳定 ID 和清单摘要，不公开原始 Token Bank。"
    title="设计系统清单"
  >
    <UiStatusBadge
      label="ACTIVE"
      tone="active"
    />
    <UiDescriptionList :items="manifestItems" />
  </UiSection>
</template>
