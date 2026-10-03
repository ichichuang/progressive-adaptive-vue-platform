<script setup lang="ts">
import { UiPageHeader, UiSection, UiStatusBadge, type UiStatusTone } from '@platform/ui'

import { capabilityManifest, capabilityMessageKeys } from '../../generated/capability-manifest'
import { useConsoleI18n } from '../../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'CapabilityRoadmapContent' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

defineSlots<{
  actions?(): unknown
}>()

function statusTone(status: 'ACTIVE' | 'TARGET_INACTIVE' | 'DEFERRED'): UiStatusTone {
  if (status === 'ACTIVE') {
    return 'active'
  }

  return status === 'DEFERRED' ? 'deferred' : 'not-started'
}
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <slot name="actions" />
  <UiSection
    :description="t('capabilities.description')"
    :title="t('capabilities.title')"
  >
    <div class="grid gap-content-gap grid-cols-auto-fit-admin-content">
      <article
        v-for="record in capabilityManifest.records"
        :key="record.id"
        class="rounded-panel border-solid grid bg-surface-panel border-border-default border-width-default gap-content-gap p-page-inline"
      >
        <div class="flex items-center justify-between gap-content-gap">
          <h2 class="leading-title font-title-weight m-0 text-text-primary text-title">
            {{ t(capabilityMessageKeys[record.id].visibleLabel) }}
          </h2>
          <UiStatusBadge
            :label="record.capabilityStatus"
            :tone="statusTone(record.capabilityStatus)"
          />
        </div>
        <p class="m-0 text-text-secondary">
          {{ t(capabilityMessageKeys[record.id].summary) }}
        </p>
        <p class="m-0 text-text-secondary">
          {{ t(capabilityMessageKeys[record.id].admissionCondition) }}
        </p>
        <code>{{ record.owner }}</code>
      </article>
    </div>
  </UiSection>
</template>
