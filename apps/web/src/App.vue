<script setup lang="ts">
import { UiProvider, type UiDateTimeContext } from '@platform/ui'
import { computed, inject, onScopeDispose, provide } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import { useConsoleI18n } from './shared/i18n'
import { useAppearanceReadBoundary } from './app/appearance/appearance-read-boundary'
import { useWorkspaceStore } from './app/workspace/workspace.store'
import ConsoleRouteFrame from './app/console/ConsoleRouteFrame.vue'
import { provideApplicationNavigation } from './app/router/application-navigation'
import { routerWorkspaceRetentionKey } from './app/router/router-scroll-controller'
import {
  createWorkspaceRetention,
  WorkspaceRetentionHost,
  workspaceRetentionKey,
} from './app/workspace/workspace-retention'
import {
  provideRouteMotionPlayer,
  provideRouteRevealBoundary,
} from './app/router/route-transition/route-motion-player'
import { createRouteTransitionCoordinator } from './app/router/route-transition/route-transition-coordinator'
import { getRouteLayoutCapability, getRouteRecord } from './app/router/route-registry'

import { useSystemTimeZone } from './app/date-time/use-system-time-zone'
import { useDateTimeStore } from './app/date-time/date-time.store'
import { useDateTimePreferencePort } from './app/date-time/date-time-preference'
import { useRuntimePresentation } from './app/config/runtime-presentation'
const { t, locale } = useConsoleI18n()
const dateTimeStore = useDateTimeStore()
onScopeDispose(
  dateTimeStore.initialize(useDateTimePreferencePort(), useRuntimePresentation().dateTime),
)
const systemTimeZone = useSystemTimeZone(
  computed(() => dateTimeStore.preference.timeZone === 'system'),
)
const dateTime = computed<UiDateTimeContext>(() => ({
  locale: locale.value,
  hourCycle: dateTimeStore.preference.hourCycle,
  dateFormat: dateTimeStore.preference.dateFormat,
  timeZone:
    dateTimeStore.preference.timeZone === 'system'
      ? systemTimeZone.value
      : dateTimeStore.preference.timeZone,
}))
const route = useRoute()
const router = useRouter()
const workspace = useWorkspaceStore()
const retention = createWorkspaceRetention(workspace, t)
onScopeDispose(() => {
  retention.dispose()
})
provide(workspaceRetentionKey, retention.commands)
const retentionPort = inject(routerWorkspaceRetentionKey)
if (retentionPort === undefined)
  throw new TypeError('The Router retention boundary is unavailable.')
onScopeDispose(retentionPort.connect(retention))
const appearance = useAppearanceReadBoundary()
const routeTransitionCoordinator = createRouteTransitionCoordinator({
  router,
  appearance,
  motionPlayer: provideRouteMotionPlayer(),
  reveal: provideRouteRevealBoundary(),
})
onScopeDispose(() => {
  routeTransitionCoordinator.dispose()
})
provideApplicationNavigation(router, routeTransitionCoordinator)
const routeRecord = computed(() => getRouteRecord(route.name))
const containedContent = computed(() => {
  const snapshot = retentionPort.read()
  return (
    (routeRecord.value.name === 'control-center' ||
      routeRecord.value.name === 'workbench-welcome' ||
      routeRecord.value.name === 'workbench-dashboard' ||
      routeRecord.value.name === 'workbench-motion' ||
      routeRecord.value.name === 'workbench-date-time' ||
      (routeRecord.value.name.startsWith('api-') && routeRecord.value.name !== 'api-overview') ||
      routeRecord.value.name.startsWith('component-motion') ||
      routeRecord.value.name === 'component-charts' ||
      routeRecord.value.name.startsWith('component-chart-') ||
      routeRecord.value.name.startsWith('component-form-') ||
      routeRecord.value.name.startsWith('component-table') ||
      routeRecord.value.name.startsWith('component-combination-')) &&
    (snapshot === undefined || retention.readFailure(snapshot) === undefined)
  )
})
const composition = computed(
  () => getRouteLayoutCapability(routeRecord.value.meta.layoutCapabilityId).composition,
)
const tabpanel = computed(
  () =>
    composition.value?.startsWith('admin-') === true &&
    routeRecord.value.workspaceIdentityPolicyId !== null &&
    workspace.activeIdentity !== null,
)
</script>

<template>
  <UiProvider
    :appearance="appearance.snapshot.value"
    :locale="locale"
    :date-time="dateTime"
  >
    <ConsoleRouteFrame
      :active-route-name="routeRecord.name"
      :composition="composition"
      :contained-content="containedContent"
    >
      <RouterView v-slot="{ Component }">
        <div
          id="pavp-workspace-panel"
          class="pavp-route-content"
          :class="{ 'flex flex-1 min-h-0 h-full': containedContent }"
          :role="tabpanel ? 'tabpanel' : undefined"
          :tabindex="tabpanel ? -1 : undefined"
          :aria-labelledby="tabpanel ? `${workspace.activeIdentity}-tab` : undefined"
        >
          <WorkspaceRetentionHost
            :component="Component"
            :snapshot="retentionPort.read()"
            :controller="retention"
          />
        </div>
      </RouterView>
    </ConsoleRouteFrame>
  </UiProvider>
</template>
