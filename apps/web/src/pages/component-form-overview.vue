<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { UiCopyAction, UiScrollArea, type UiScrollController } from '@platform/ui'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import { useConsoleI18n } from '../shared/i18n'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'
import { getRouteRecord, routeMessageRegistry } from '../app/router/route-registry'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'

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
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register)
  throw new Error('Form capability overview requires the Router Scroll Controller port.')
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
        data-form-capabilities="overview"
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
                {{ item.title
                }}<span
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
        <p class="m-0 text-caption text-text-secondary">
          {{ t('formCapabilities.overview.boundary') }}
        </p>
      </div>
    </UiScrollArea>
  </WorkbenchPage>
</template>
