<script setup lang="ts">
import { UiProvider } from '@platform/ui'
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { useAppearanceReadBoundary } from './app/appearance/appearance-read-boundary'
import ConsoleRouteFrame from './app/console/ConsoleRouteFrame.vue'
import { getRoutePresentation, getRouteRecord } from './app/router/route-registry'

const route = useRoute()
const appearance = useAppearanceReadBoundary()
const routeRecord = computed(() => getRouteRecord(route.name))
const presentation = computed(() => getRoutePresentation(route.name))
</script>

<template>
  <UiProvider :appearance="appearance.snapshot.value">
    <ConsoleRouteFrame
      :active-route-name="routeRecord.name"
      :shell-required="
        routeRecord.meta.layoutCapabilityId === 'route-layout.architecture-admin-console'
      "
    >
      <RouterView v-slot="{ Component }">
        <div class="pavp-route-content">
          <component
            :is="Component"
            :breadcrumb="presentation.breadcrumb"
            :message="presentation.message"
            :title="presentation.title"
          />
        </div>
      </RouterView>
    </ConsoleRouteFrame>
  </UiProvider>
</template>
