<script setup lang="ts">
import { NDescriptions, NDescriptionsItem } from 'naive-ui/es/descriptions'
import { UiPageHeader, UiSection, UiStatusBadge } from '@platform/ui'

import { engineeringManifest } from '../generated/engineering-manifest'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'EngineeringQualityInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const coordinateItems = Object.entries(engineeringManifest.coordinates).map(([label, value]) => ({
  label,
  value,
}))
const budgetItems = engineeringManifest.bundleBudgets.map((record) => ({
  label: record.id,
  value: `${String(record.limit)} ${record.unit}`,
}))
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
    <NDescriptions
      bordered
      :column="1"
      label-placement="left"
    >
      <NDescriptionsItem
        v-for="item in coordinateItems"
        :key="item.label"
        :label="item.label"
      >
        {{ item.value }}
      </NDescriptionsItem>
    </NDescriptions>
  </UiSection>
  <UiSection
    :description="engineeringManifest.verifyStageIds.join(' → ')"
    :title="t('console.engineering.gates')"
  >
    <NDescriptions
      bordered
      :column="1"
      label-placement="left"
    >
      <NDescriptionsItem
        v-for="item in budgetItems"
        :key="item.label"
        :label="item.label"
      >
        {{ item.value }}
      </NDescriptionsItem>
    </NDescriptions>
  </UiSection>
</template>
