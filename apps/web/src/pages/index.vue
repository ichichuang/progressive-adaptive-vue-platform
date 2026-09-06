<script setup lang="ts">
import {
  UiDescriptionList,
  UiPageHeader,
  UiSection,
  UiStatusBadge,
  type UiDescriptionItem,
} from '@platform/ui'
import { computed } from 'vue'

import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import { overviewProjection } from '../app/console/overview-projection'
import { getRouterConsoleRouteLabel } from '../app/router/router-console-projection'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'ConsoleOverviewPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const appearance = useAppearanceReadBoundary()
const foundationItems = computed<readonly UiDescriptionItem[]>(() => [
  {
    label: t('console.public-roles'),
    value: String(overviewProjection.designSystem.publicRoleCount),
  },
  {
    label: t('console.product-routes'),
    value: String(overviewProjection.router.productRouteCount),
  },
  { label: t('console.startup-stages'), value: String(overviewProjection.runtimeKernel.stepCount) },
  { label: t('console.storage-records'), value: String(overviewProjection.storage.recordCount) },
  {
    label: t('console.public-ui'),
    value: String(overviewProjection.uiSystem.publicComponentIds.length),
  },
])
const appearanceItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: t('console.color-mode'), value: appearance.snapshot.value.colorMode },
  { label: t('console.theme'), value: appearance.snapshot.value.theme.themeId },
  { label: t('console.contrast'), value: appearance.snapshot.value.contrast },
  { label: t('console.material'), value: appearance.snapshot.value.material },
  { label: t('console.density'), value: appearance.snapshot.value.density },
  { label: t('console.motion'), value: appearance.snapshot.value.motion },
])
const capabilityNavigation = overviewProjection.router.productRoutes.filter(
  (record) => record.name !== 'console-overview',
)
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    :description="t('console.overview.foundation-description')"
    :title="t('console.overview.foundation-title')"
  >
    <div class="pavp-overview-status">
      <UiStatusBadge
        label="ACTIVE"
        tone="active"
      />
      <span>{{ t('console.overview.active-summary') }}</span>
    </div>
    <UiDescriptionList :items="foundationItems" />
  </UiSection>
  <UiSection
    :description="t('console.overview.navigation-description')"
    :title="t('console.overview.navigation-title')"
  >
    <nav
      :aria-label="t('console.overview.navigation-label')"
      class="pavp-overview-navigation"
    >
      <a
        v-for="record in capabilityNavigation"
        :key="record.name"
        class="border rounded-panel border-border-default min-h-target-enhanced text-text-primary"
        :href="record.pathPattern"
      >
        {{ getRouterConsoleRouteLabel(record.name, t) }}
      </a>
    </nav>
  </UiSection>
  <UiSection
    :description="t('console.overview.appearance-description')"
    :title="t('console.overview.appearance-title')"
  >
    <UiDescriptionList :items="appearanceItems" />
  </UiSection>
</template>

<style scoped>
.pavp-overview-status {
  display: flex;
  align-items: center;
  gap: var(--ui-space-content-gap);
  color: var(--ui-color-text-secondary);
}

.pavp-overview-navigation {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(var(--ui-layout-admin-content-minimum-inline-size), 1fr)
  );
  gap: var(--ui-space-content-gap);
}

.pavp-overview-navigation a {
  display: flex;
  align-items: center;
  padding-inline: var(--ui-space-page-inline);
  text-decoration: none;
}
</style>
