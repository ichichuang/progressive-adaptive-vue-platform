<script setup lang="ts">
import { UiDescriptionList, UiPageHeader, UiSection, type UiDescriptionItem } from '@platform/ui'

import { routerConsoleProjection } from '../app/router/router-console-projection'

defineOptions({ name: 'RouterGovernanceInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const routerItems: readonly UiDescriptionItem[] = [
  { label: '全部路由', value: String(routerConsoleProjection.routeCount) },
  { label: '产品路由', value: String(routerConsoleProjection.productRouteCount) },
  { label: '错误路由', value: String(routerConsoleProjection.errorRouteCount) },
  { label: '布局能力', value: routerConsoleProjection.layoutCapabilityIds.join(', ') },
  { label: '滚动 Owner', value: routerConsoleProjection.scrollOwnerIds.join(', ') },
  { label: '焦点合同', value: routerConsoleProjection.focusContractIds.join(', ') },
  { label: '恢复策略', value: routerConsoleProjection.scrollRestorationPolicyIds.join(', ') },
]
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    description="路由、滚动、焦点与布局能力均由 Router Domain 的活动注册表投影。"
    title="治理闭包"
  >
    <UiDescriptionList :items="routerItems" />
    <ul class="pavp-route-list">
      <li
        v-for="route in routerConsoleProjection.routes"
        :key="route.name"
      >
        <code>{{ route.name }}</code>
        <span>{{ route.visibleLabel }}</span>
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
