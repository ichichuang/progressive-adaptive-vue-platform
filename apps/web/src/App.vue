<script setup lang="ts">
import { UiProvider } from '@platform/ui'
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import { useConsoleI18n } from './shared/i18n'
import { useAppearanceReadBoundary } from './app/appearance/appearance-read-boundary'
import { useWorkspaceStore } from './app/workspace/workspace.store'
import ConsoleRouteFrame from './app/console/ConsoleRouteFrame.vue'
import { committedRouteInputProps } from './app/router/router-lifecycle'
import { getRoutePresentation, getRouteRecord } from './app/router/route-registry'

const { t, locale } = useConsoleI18n()
const route = useRoute()
const router = useRouter()
const workspace = useWorkspaceStore()
const routeInputProps = computed(() => committedRouteInputProps(router))
const appearance = useAppearanceReadBoundary()
const routeRecord = computed(() => getRouteRecord(route.name))
const presentation = computed(() => getRoutePresentation(route.name, t))
</script>

<template>
  <UiProvider
    :appearance="appearance.snapshot.value"
    :locale="locale"
  >
    <ConsoleRouteFrame
      :active-route-name="routeRecord.name"
      :shell-required="
        routeRecord.meta.layoutCapabilityId === 'route-layout.architecture-admin-console'
      "
    >
      <RouterView v-slot="{ Component }">
        <div
          id="pavp-workspace-panel"
          class="pavp-route-content"
          :role="workspace.activeIdentity === null ? undefined : 'tabpanel'"
          :tabindex="workspace.activeIdentity === null ? undefined : 0"
          :aria-labelledby="
            workspace.activeIdentity === null ? undefined : `${workspace.activeIdentity}-tab`
          "
        >
          <KeepAlive :include="workspace.includedComponentNames">
            <component
              :is="Component"
              :key="workspace.active?.instance"
              v-bind="routeInputProps"
              :breadcrumb="presentation.breadcrumb"
              :message="presentation.message"
              :title="presentation.title"
            />
          </KeepAlive>
        </div>
      </RouterView>
    </ConsoleRouteFrame>
  </UiProvider>
</template>
