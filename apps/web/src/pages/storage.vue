<script setup lang="ts">
import { UiDescriptionList, UiPageHeader, UiSection, type UiDescriptionItem } from '@platform/ui'

import { storageConsoleProjection } from '../app/storage/storage-console-projection'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

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
    :description="
      t('console.storage.active-records', { count: storageConsoleProjection.recordCount })
    "
    :title="t('console.storage.title')"
  >
    <UiDescriptionList :items="storageItems" />
  </UiSection>
</template>
