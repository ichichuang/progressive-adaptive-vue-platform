<script setup lang="ts">
import { computed, type AnchorHTMLAttributes } from 'vue'
import { UiCopyAction } from '@platform/ui'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import WorkbenchSection from '../app/workbench/WorkbenchSection.vue'
import { useConsoleI18n } from '../shared/i18n'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'
import { getRouteRecord, routeMessageRegistry } from '../app/router/route-registry'

defineOptions({ name: 'ComponentFormOverviewPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const groups = [
  {
    label: 'formCapabilities.overview.compose',
    routes: [
      'component-form-basics',
      'component-form-layout',
      'component-form-detail',
      'component-form-steps',
      'component-form-dynamic',
      'component-form-media',
      'component-form-rich-text',
      'component-form-builder',
    ],
  },
  {
    label: 'formCapabilities.overview.interact',
    routes: [
      'component-form-dependencies',
      'component-form-calculations',
      'component-form-structure',
      'component-form-controls',
      'component-form-extension',
    ],
  },
  {
    label: 'formCapabilities.overview.recover',
    routes: [
      'component-form-validation',
      'component-form-loading',
      'component-form-submission',
      'component-form-options',
      'component-form-lifecycle',
    ],
  },
] as const
const sections = computed(() =>
  groups.map((group) => ({
    label: t(group.label),
    items: group.routes.map((name) => {
      const message = routeMessageRegistry.find((item) => item.routeName === name)
      if (!message) throw new Error('A form capability requires a registered route message.')
      return {
        destination: registeredRouteDestination({ name }),
        title: t(getRouteRecord(name).meta.titleKey),
        message: t(message.key),
      }
    }),
  })),
)
const copyValue = computed(() =>
  [
    t('formCapabilities.overview.copy'),
    ...sections.value.flatMap((section) => [
      section.label,
      ...section.items.map((item) => `${item.title}: ${item.message}`),
    ]),
    t('formCapabilities.overview.boundary'),
    'packages/ui/src/components/form-contracts.ts',
    'packages/ui/src/components/form-guide.md',
    'apps/web/src/app/workbench/forms/',
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
      data-form-capabilities="overview"
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
                href: navigation.resolveHref(item.destination),
                onClick: (event: MouseEvent) => activate(event, item.destination),
              } satisfies AnchorHTMLAttributes
            "
          >
            <span
              class="wb-capability-mark rounded-control grid row-span-2 place-items-center bg-surface-panel text-control-primary text-title"
              aria-hidden="true"
            >
              <span class="i-lucide-type" />
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
      <p class="m-0 text-caption text-text-secondary">
        {{ t('formCapabilities.overview.boundary') }}
      </p>
    </div>
  </WorkbenchPage>
</template>
