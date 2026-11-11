<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import {
  UiCopyAction,
  UiG2Chart,
  UiScrollArea,
  type UiScrollController,
  type UiG2ChartOptions,
} from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import { chartExample, chartGroups } from './chart-examples'
import { liveChartExample, liveChartExamples } from './chart-live-simulation'
import { useConsoleI18n } from '../../../shared/i18n'
import { getRouteRecord } from '../../router/route-registry'
import { registeredRouteDestination } from '../../router/route-input'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../../router/application-navigation'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'

defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const sections = computed(() => [
  ...chartGroups.map((group) => ({
    ...group,
    title: t(getRouteRecord(group.routeName).meta.titleKey),
    destination: registeredRouteDestination({ name: group.routeName }),
    options: {
      ...chartExample(group.kinds[0], 0, t).options,
      axis: false,
      legend: false,
      tooltip: false,
      slider: false,
      margin: 0,
    } as UiG2ChartOptions,
  })),
  ...liveChartExamples.map((example) => ({
    id: example.kind,
    summary: example.summary,
    title: t(getRouteRecord(example.routeName).meta.titleKey),
    destination: registeredRouteDestination({ name: example.routeName }),
    options: {
      ...liveChartExample(example.kind, 0, t).options,
      axis: false,
      legend: false,
      tooltip: false,
      margin: 0,
    },
  })),
])
const copyValue = computed(() =>
  [
    t('chartExamples.copyRequest'),
    ...sections.value.map((section) => `${section.title}: ${t(section.summary)}`),
    'packages/ui/src/components/g2-chart-guide.md',
    'apps/web/src/app/workbench/charts/',
  ].join('\n\n'),
)
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Chart overview requires the Router Scroll Controller port.')
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
        class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
        data-chart-overview="true"
      >
        <NCard
          v-for="section in sections"
          :key="section.id"
          :bordered="false"
          class="min-w-0"
          content-class="grid min-w-0 gap-content-gap"
        >
          <div class="grid min-w-0 gap-component-unit">
            <h2
              class="font-title-weight m-0 text-subheading text-text-primary"
              v-text="section.title"
            />
            <p
              class="m-0 text-caption text-text-secondary"
              v-text="t(section.summary)"
            />
          </div>
          <div class="wb-chart-preview min-w-0">
            <UiG2Chart
              :options="section.options"
              :label="section.title"
            />
          </div>
          <NButton
            tag="a"
            text
            type="primary"
            class="justify-self-end min-h-target-enhanced"
            :href="navigation.resolveHref(section.destination)"
            @click="activate($event, section.destination)"
          >
            {{ t('chartExamples.explore')
            }}<span
              class="i-lucide-arrow-up-right"
              aria-hidden="true"
            />
          </NButton>
        </NCard>
      </div>
    </UiScrollArea>
  </WorkbenchPage>
</template>
