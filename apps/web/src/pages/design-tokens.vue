<script setup lang="ts">
import { designSystemConsoleProjection } from '@platform/design-system'
import {
  UiDescriptionList,
  UiPageHeader,
  UiSection,
  UiStatusBadge,
  type UiDescriptionItem,
} from '@platform/ui'
import { computed } from 'vue'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'DesignTokenInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const manifestItems = computed<readonly UiDescriptionItem[]>(() => [
  {
    label: t('console.manifest-schema'),
    value: String(designSystemConsoleProjection.manifestSchemaVersion),
  },
  {
    label: t('console.manifest-records'),
    value: String(designSystemConsoleProjection.manifestRecordCount),
  },
  { label: t('console.roles'), value: String(designSystemConsoleProjection.publicRoleCount) },
  {
    label: t('console.color-roles'),
    value: String(designSystemConsoleProjection.publicColorRoleCount),
  },
  {
    label: t('console.built-in-themes'),
    value: designSystemConsoleProjection.builtInThemeIds.join(', '),
  },
  { label: t('console.theme-planes'), value: designSystemConsoleProjection.planeIds.join(', ') },
  { label: t('console.contrast'), value: designSystemConsoleProjection.contrastValues.join(', ') },
  { label: t('console.material'), value: designSystemConsoleProjection.materialValues.join(', ') },
])
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    :description="t('console.tokens.description')"
    :title="t('console.tokens.title')"
  >
    <UiStatusBadge
      label="ACTIVE"
      tone="active"
    />
    <UiDescriptionList :items="manifestItems" />
  </UiSection>
</template>
