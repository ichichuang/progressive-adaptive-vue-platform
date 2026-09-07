<script setup lang="ts">
import {
  UiDescriptionList,
  UiPageHeader,
  UiSection,
  UiStatusBadge,
  uiSystemConsoleProjection,
  type UiDescriptionItem,
} from '@platform/ui'
import { computed } from 'vue'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'UiSystemInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const uiItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: t('console.styled-vendor'), value: uiSystemConsoleProjection.styledVendor.coordinate },
  { label: t('console.import-policy'), value: uiSystemConsoleProjection.privateAdapterPolicyId },
  {
    label: t('console.component-count'),
    value: String(uiSystemConsoleProjection.publicComponentIds.length),
  },
  {
    label: t('console.components'),
    value: uiSystemConsoleProjection.publicComponentIds
      .map((id) =>
        uiSystemConsoleProjection.inactivePublicComponentIds.some((inactiveId) => inactiveId === id)
          ? `${id} (TARGET_INACTIVE)`
          : id,
      )
      .join(', '),
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
    :description="t('console.ui.description')"
    :title="t('console.ui.title')"
  >
    <UiStatusBadge
      label="ACTIVE"
      tone="active"
    />
    <UiDescriptionList :items="uiItems" />
  </UiSection>
</template>
