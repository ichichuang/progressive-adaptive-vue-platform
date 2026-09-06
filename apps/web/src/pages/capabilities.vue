<script setup lang="ts">
import { UiPageHeader, UiSection, UiStatusBadge, type UiStatusTone } from '@platform/ui'

import { capabilityManifest, capabilityMessageKeys } from '../generated/capability-manifest'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'CapabilityRoadmapPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
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
  <UiSection
    :description="t('capabilities.description')"
    :title="t('capabilities.title')"
  >
    <div class="pavp-capability-grid">
      <article
        v-for="record in capabilityManifest.records"
        :key="record.id"
        class="pavp-capability-card border rounded-panel bg-surface-panel border-border-default"
      >
        <div class="pavp-capability-card__heading">
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

<style scoped>
.pavp-capability-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(var(--ui-layout-admin-content-minimum-inline-size), 1fr)
  );
  gap: var(--ui-space-content-gap);
}

.pavp-capability-card {
  display: grid;
  gap: var(--ui-space-content-gap);
  padding: var(--ui-space-page-inline);
}

.pavp-capability-card__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-space-content-gap);
}
</style>
