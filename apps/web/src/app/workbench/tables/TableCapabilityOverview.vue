<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { UiCopyAction, UiScrollArea, type UiScrollController } from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../../router/application-navigation'
import { registeredRouteDestination } from '../../router/route-input'
import { getRouteRecord, routeMessageRegistry } from '../../router/route-registry'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import { useTableShowcase } from './table-showcase'

defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useTableShowcase()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const groups = [
  {
    label: 'tableCapabilities.overview.layout',
    routes: [
      'component-table',
      'component-table-scroll',
      'component-table-widths',
      'component-table-responsive',
    ],
  },
  {
    label: 'tableCapabilities.overview.data',
    routes: [
      'component-table-sorting',
      'component-table-selection',
      'component-table-rendering',
      'component-table-virtual',
      'component-table-states',
      'component-table-remote',
    ],
  },
  {
    label: 'tableCapabilities.overview.presentation',
    routes: [
      'component-table-columns',
      'component-table-summary',
      'component-table-appearance',
      'component-table-theme',
      'component-table-configuration',
    ],
  },
  {
    label: 'tableCapabilities.overview.composition',
    routes: [
      'component-combination-query',
      'component-combination-modal',
      'component-combination-drawer',
      'component-combination-page',
    ],
  },
] as const
function messageKey(name: string) {
  const entry = routeMessageRegistry.find((item) => item.routeName === name)
  if (!entry) throw new Error('A table capability route requires a registered message.')
  return entry.key
}
const sections = computed(() =>
  groups.map((group) => ({
    label: t(group.label),
    items: group.routes.map((name) => ({
      destination: registeredRouteDestination({ name }),
      title: t(getRouteRecord(name).meta.titleKey),
      message: t(messageKey(name)),
    })),
  })),
)
const copyValue = computed(() =>
  [
    t('tableCapabilities.overview.copy'),
    ...sections.value.flatMap((section) => [
      section.label,
      ...section.items.map((item) => `${item.title}: ${item.message}`),
    ]),
    t('tableCapabilities.overview.unsupported'),
    'packages/ui/src/components/table-contracts.ts',
    'apps/web/src/app/workbench/tables/',
  ].join('\n\n'),
)
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register)
  throw new Error('Table capability overview requires the Router Scroll Controller port.')
let unregister: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  unregister?.()
  unregister = undefined
  if (controller && active.value) unregister = register?.(controller)
}
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  connect(null)
})
onScopeDispose(() => {
  connect(null)
})
</script>
<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
    class="wb-form-page mx-auto w-full"
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <UiScrollArea
      owner-id="architecture-console-content"
      :enabled="active"
      class="flex-1 min-h-0"
      @controller="connect"
    >
      <div
        class="grid min-w-0 gap-content-gap"
        data-table-capabilities="overview"
      >
        <section
          v-for="section in sections"
          :key="section.label"
          class="grid min-w-0 gap-content-gap"
          :aria-label="section.label"
        >
          <h2 class="font-title-weight m-0 text-subheading text-text-primary">
            {{ section.label }}
          </h2>
          <div
            class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-3"
          >
            <NCard
              v-for="item in section.items"
              :key="item.destination.name"
              :bordered="false"
              class="min-w-0"
              content-class="grid min-w-0 gap-component-unit"
            >
              <NButton
                tag="a"
                text
                type="primary"
                class="justify-self-start min-h-target-enhanced"
                :href="navigation.resolveHref(item.destination)"
                @click="activate($event, item.destination)"
              >
                {{ item.title }}
                <span
                  class="i-lucide-arrow-up-right"
                  aria-hidden="true"
                />
              </NButton>
              <p class="m-0 text-caption text-text-secondary">
                {{ item.message }}
              </p>
            </NCard>
          </div>
        </section>
        <details
          class="wb-form-panel-header rounded-panel bg-surface-panel text-caption text-text-secondary"
        >
          <summary class="cursor-pointer content-center min-h-target-enhanced">
            {{ t('tableCapabilities.overview.scope') }}
          </summary>
          <p class="m-0">
            {{ t('tableCapabilities.overview.unsupported') }}
          </p>
        </details>
      </div>
    </UiScrollArea>
  </WorkbenchPage>
</template>
