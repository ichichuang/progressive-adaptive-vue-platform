<script setup lang="ts">
import { UiProvider } from '@platform/ui'
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
import { createRouteTransitionCoordinator } from './app/router/route-transition/route-transition-coordinator'
import { getRouteLayoutCapability, getRouteRecord } from './app/router/route-registry'

const { t, locale } = useConsoleI18n()
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
const routeTransitionCoordinator = createRouteTransitionCoordinator({ router, appearance })
onScopeDispose(() => {
  routeTransitionCoordinator.dispose()
})
provideApplicationNavigation(router, routeTransitionCoordinator)
const routeRecord = computed(() => getRouteRecord(route.name))
const composition = computed(
  () => getRouteLayoutCapability(routeRecord.value.meta.layoutCapabilityId).composition,
)
const tabpanel = computed(
  () => composition.value?.startsWith('admin-') === true && workspace.activeIdentity !== null,
)
</script>

<template>
  <UiProvider
    :appearance="appearance.snapshot.value"
    :locale="locale"
  >
    <ConsoleRouteFrame
      :active-route-name="routeRecord.name"
      :composition="composition"
    >
      <RouterView v-slot="{ Component }">
        <div
          id="pavp-workspace-panel"
          class="pavp-route-content"
          :role="tabpanel ? 'tabpanel' : undefined"
          :tabindex="tabpanel ? 0 : undefined"
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
