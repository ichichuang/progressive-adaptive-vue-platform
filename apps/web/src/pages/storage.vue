<script setup lang="ts">
import { UiDescriptionList, UiPageHeader, UiSection, type UiDescriptionItem } from '@platform/ui'

import { storageConsoleProjection } from '../app/storage/storage-console-projection'

defineOptions({ name: 'StoragePersistenceInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const storageItems: readonly UiDescriptionItem[] = storageConsoleProjection.records.map(
  (record) => ({
    label: record.id,
    value: [
      record.schemaId,
      record.medium,
      record.persistenceShape,
      record.principalPartition,
    ].join(' · '),
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
    :description="`当前活动记录：${storageConsoleProjection.recordCount}`"
    title="持久化记录"
  >
    <UiDescriptionList :items="storageItems" />
  </UiSection>
</template>
