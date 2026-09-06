<script setup lang="ts">
import {
  UiDescriptionList,
  UiPageHeader,
  UiSection,
  UiStatusBadge,
  type UiDescriptionItem,
} from '@platform/ui'

import { engineeringManifest } from '../generated/engineering-manifest'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'EngineeringQualityInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const coordinateItems: readonly UiDescriptionItem[] = Object.entries(
  engineeringManifest.coordinates,
).map(([label, value]) => ({ label, value }))
const budgetItems: readonly UiDescriptionItem[] = engineeringManifest.bundleBudgets.map(
  (record) => ({
    label: record.id,
    value: `${String(record.limit)} ${record.unit}`,
  }),
)
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    :description="engineeringManifest.workflowNames.join(', ')"
    :title="t('console.engineering.toolchain')"
  >
    <UiStatusBadge
      :label="t('console.engineering.generated')"
      tone="complete"
    />
    <UiDescriptionList :items="coordinateItems" />
  </UiSection>
  <UiSection
    :description="engineeringManifest.verifyStageIds.join(' → ')"
    :title="t('console.engineering.gates')"
  >
    <UiDescriptionList :items="budgetItems" />
  </UiSection>
</template>
