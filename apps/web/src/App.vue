<script setup lang="ts">
import { UiProvider, useUiMotion, type UiDateTimeContext } from '@platform/ui'
import { computed, inject, onScopeDispose, provide, shallowRef, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import { useConsoleI18n } from './shared/i18n'
import { useAppearanceReadBoundary } from './app/appearance/appearance-read-boundary'
import {
  connectSettingsRift,
  finishSettingsAppearance,
  reconcileSettingsAppearance,
} from './app/appearance/appearance-transition'
import { provideLoadingFeedback } from './app/loading/loading-feedback'
import { useWorkspaceStore } from './app/workspace/workspace.store'
import ConsoleRouteFrame from './app/console/ConsoleRouteFrame.vue'
import { provideApplicationNavigation } from './app/router/application-navigation'
import { useRouterNavigationPending } from './app/router/router-lifecycle'
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
const navigationPending = useRouterNavigationPending()
const taskPending = provideLoadingFeedback()
const loadingPending = computed(() => navigationPending.value || taskPending.value)
const showLoading = shallowRef(false)
const loadingMessage = computed(() => (showLoading.value ? t('shell.loading') : ''))
watch(loadingPending, (pending, _previous, onCleanup) => {
  if (!pending) {
    showLoading.value = false
    return
  }
  const timer = window.setTimeout(() => {
    showLoading.value = true
  }, 180)
  onCleanup(() => {
    window.clearTimeout(timer)
  })
})
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
// The preset plays the appearance currently on screen, including the outgoing theme.
const sceneAppearance = shallowRef(appearance.snapshot.value)
const sceneMotion = useUiMotion(sceneAppearance)
onScopeDispose(
  connectSettingsRift((scene, snapshot, options) => {
    sceneAppearance.value = snapshot
    return sceneMotion.play(scene, options)
  }),
)
watch(appearance.snapshot, reconcileSettingsAppearance)
onScopeDispose(finishSettingsAppearance)
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
  if (
    snapshot?.routeName === routeRecord.value.name &&
    retention.readFailure(snapshot) !== undefined &&
    getRouteLayoutCapability(routeRecord.value.meta.layoutCapabilityId).composition !== null
  )
    return true
  return (
    (routeRecord.value.name === 'control-center' ||
      routeRecord.value.name === 'workbench-welcome' ||
      routeRecord.value.name === 'login' ||
      routeRecord.value.name.startsWith('access-showcase') ||
      routeRecord.value.name.startsWith('preview-status-') ||
      routeRecord.value.name.startsWith('preview-layout-') ||
      routeRecord.value.name === 'workbench-dashboard' ||
      routeRecord.value.name === 'workbench-motion' ||
      (routeRecord.value.name.startsWith('api-') && routeRecord.value.name !== 'api-overview') ||
      routeRecord.value.name.startsWith('component-motion') ||
      routeRecord.value.name.startsWith('component-chart-') ||
      (routeRecord.value.name.startsWith('component-form-') &&
        routeRecord.value.name !== 'component-form-overview') ||
      (routeRecord.value.name.startsWith('component-table') &&
        routeRecord.value.name !== 'component-table-overview' &&
        routeRecord.value.name !== 'component-table-appearance') ||
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
  <div
    id="pavp-appearance-surface"
    aria-hidden="true"
    inert
  />
  <span
    class="pavp-loading-meter pointer-events-none inset-x-0 top-0 fixed z-overlay"
    :hidden="!showLoading"
    aria-hidden="true"
  />
  <span
    class="sr-only"
    role="status"
  >
    {{ loadingMessage }}
  </span>
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
