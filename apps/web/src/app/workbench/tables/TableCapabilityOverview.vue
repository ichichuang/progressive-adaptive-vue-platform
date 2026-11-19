<script setup lang="ts">
import { type AnchorHTMLAttributes, computed } from 'vue'

import { UiCopyAction } from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import WorkbenchSection from '../WorkbenchSection.vue'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../../router/application-navigation'
import { registeredRouteDestination } from '../../router/route-input'
import { getRouteRecord, routeMessageRegistry } from '../../router/route-registry'
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
      'component-table-tree',
      'component-table-query-link',
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
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <template #actions>
      <UiCopyAction
        variant="tertiary"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <div
      class="grid min-w-0 gap-field-gap"
      v-bind="{ 'data-table-capabilities': 'overview' }"
    >
      <WorkbenchSection
        v-for="section in sections"
        :key="section.label"
        :title="section.label"
      >
        <div
          class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-3"
        >
          <a
            v-for="item in section.items"
            :key="item.destination.name"
            class="wb-capability-content wb-link rounded-control no-underline grid min-w-0 items-center bg-surface-page min-h-target-enhanced p-panel-narrow text-text-primary hover:bg-expression-accent-a-soft-background"
            v-bind="
              {
                onClick: (event: MouseEvent) => {
                  activate(event, item.destination)
                },
                href: navigation.resolveHref(item.destination),
              } satisfies AnchorHTMLAttributes
            "
          >
            <span
              class="wb-capability-mark rounded-control grid row-span-2 place-items-center bg-surface-panel text-control-primary text-title"
              aria-hidden="true"
            >
              <span class="i-lucide-database" />
            </span>
            <strong class="leading-body font-title-weight text-body">
              {{ item.title }}
            </strong>
            <span class="col-start-2 text-caption text-text-secondary">
              {{ item.message }}
            </span>
            <span
              class="row-span-2 col-start-3 row-start-1 text-control-primary"
              aria-hidden="true"
            >
              ↗
            </span>
          </a>
        </div>
      </WorkbenchSection>
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
  </WorkbenchPage>
</template>
