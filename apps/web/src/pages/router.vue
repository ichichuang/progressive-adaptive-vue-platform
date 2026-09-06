<script setup lang="ts">
import { UiDescriptionList, UiPageHeader, UiSection, type UiDescriptionItem } from '@platform/ui'

import { computed } from 'vue'
import {
  getRouterConsoleRouteLabel,
  routerConsoleProjection,
} from '../app/router/router-console-projection'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'RouterGovernanceInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const routerItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: t('console.all-routes'), value: String(routerConsoleProjection.routeCount) },
  { label: t('console.product-routes'), value: String(routerConsoleProjection.productRouteCount) },
  { label: t('console.error-routes'), value: String(routerConsoleProjection.errorRouteCount) },
  {
    label: t('console.layout-capabilities'),
    value: routerConsoleProjection.layoutCapabilityIds.join(', '),
  },
  { label: t('console.scroll-owner'), value: routerConsoleProjection.scrollOwnerIds.join(', ') },
  {
    label: t('console.focus-contract'),
    value: routerConsoleProjection.focusContractIds.join(', '),
  },
  {
    label: t('console.restoration-policy'),
    value: routerConsoleProjection.scrollRestorationPolicyIds.join(', '),
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
    :description="t('console.router.description')"
    :title="t('console.router.title')"
  >
    <UiDescriptionList :items="routerItems" />
    <ul class="pavp-route-list">
      <li
        v-for="route in routerConsoleProjection.routes"
        :key="route.name"
      >
        <code>{{ route.name }}</code>
        <span>{{ getRouterConsoleRouteLabel(route.name, t) }}</span>
      </li>
    </ul>
  </UiSection>
</template>

<style scoped>
.pavp-route-list,
.pavp-route-list li {
  display: grid;
  gap: var(--ui-space-content-gap);
}

.pavp-route-list {
  margin: 0;
}

.pavp-route-list li {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
</style>
