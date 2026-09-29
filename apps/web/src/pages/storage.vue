<script setup lang="ts">
import { NDescriptions, NDescriptionsItem } from 'naive-ui/es/descriptions'
import { UiPageHeader, UiSection } from '@platform/ui'

import { storageConsoleProjection } from '../app/storage/storage-console-projection'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'StoragePersistenceInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const storageItems = storageConsoleProjection.records.map((record) => ({
  label: record.id,
  value: [record.schemaId, record.medium, record.persistenceShape, record.principalPartition].join(
    ' · ',
  ),
}))
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    :description="
      t('console.storage.active-records', { count: storageConsoleProjection.recordCount })
    "
    :title="t('console.storage.title')"
  >
    <NDescriptions
      bordered
      :column="1"
      label-placement="left"
    >
      <NDescriptionsItem
        v-for="item in storageItems"
        :key="item.label"
        :label="item.label"
      >
        {{ item.value }}
      </NDescriptionsItem>
    </NDescriptions>
  </UiSection>
</template>
