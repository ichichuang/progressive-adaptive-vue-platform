<script setup lang="ts">
import { UiAdminShell } from '@platform/ui'
import { onScopeDispose } from 'vue'
import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router'

import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import { consoleNavigationRegistry, type RouteName } from '../router/route-registry'
import { createRouteTransitionCoordinator } from '../router/route-transition/route-transition-coordinator'

defineOptions({ name: 'ConsoleRouteFrame' })

defineProps<{
  readonly activeRouteName: string
  readonly shellRequired: boolean
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const router = useRouter()
const routeTransitionCoordinator = createRouteTransitionCoordinator({
  router,
  appearance: useAppearanceReadBoundary(),
})

onScopeDispose(() => {
  routeTransitionCoordinator.dispose()
})

async function navigate(routeName: string): Promise<void> {
  if (router.currentRoute.value.name === routeName) {
    return
  }

  const failure = await routeTransitionCoordinator.navigate(routeName as RouteName)

  if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    return
  }
}
</script>

<template>
  <UiAdminShell
    v-if="shellRequired"
    :active-route-name="activeRouteName"
    :navigation="consoleNavigationRegistry"
    @navigate="navigate"
  >
    <slot />
  </UiAdminShell>
  <slot v-else />
</template>
