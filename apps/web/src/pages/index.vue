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

defineOptions({ name: 'ConsoleOverviewPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const appearance = useAppearanceReadBoundary()
const foundationItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: '公共设计角色', value: String(overviewProjection.designSystem.publicRoleCount) },
  { label: '产品路由', value: String(overviewProjection.router.productRouteCount) },
  { label: '启动阶段', value: String(overviewProjection.runtimeKernel.stepCount) },
  { label: '存储记录', value: String(overviewProjection.storage.recordCount) },
  { label: '公共 UI 组件', value: String(overviewProjection.uiSystem.publicComponentIds.length) },
])
const appearanceItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: '颜色模式', value: appearance.snapshot.value.colorMode },
  { label: '主题', value: appearance.snapshot.value.theme.themeId },
  { label: '对比度', value: appearance.snapshot.value.contrast },
  { label: '材质', value: appearance.snapshot.value.material },
  { label: '密度', value: appearance.snapshot.value.density },
  { label: '动效', value: appearance.snapshot.value.motion },
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
    description="全部数字来自当前安全投影，不解析架构文档或私有注册表。"
    title="平台基础"
  >
    <div class="pavp-overview-status">
      <UiStatusBadge
        label="ACTIVE"
        tone="active"
      />
      <span>架构管理台、PAVP UI 与响应式 Shell 已接入当前静态能力面。</span>
    </div>
    <UiDescriptionList :items="foundationItems" />
  </UiSection>
  <UiSection
    description="直接进入各项当前架构能力的只读视图；外观页提供唯一初始交互面。"
    title="能力导航"
  >
    <nav
      aria-label="架构能力"
      class="pavp-overview-navigation"
    >
      <a
        v-for="record in capabilityNavigation"
        :key="record.name"
        class="border rounded-panel border-border-default min-h-target-enhanced text-text-primary"
        :href="record.pathPattern"
      >
        {{ record.visibleLabel }}
      </a>
    </nav>
  </UiSection>
  <UiSection
    description="该摘要是总览页唯一的实时状态例外。"
    title="当前外观"
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
