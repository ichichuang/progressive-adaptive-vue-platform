<script setup lang="ts">
import { UiAdminShell } from '@platform/ui'
import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router'

import { consoleNavigationRegistry, type RouteName } from '../router/route-registry'

defineOptions({ name: 'ConsoleRouteFrame' })

defineProps<{
  readonly activeRouteName: string
  readonly shellRequired: boolean
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const router = useRouter()

async function navigate(routeName: string): Promise<void> {
  if (router.currentRoute.value.name === routeName) {
    return
  }

  const failure = await router.push({ name: routeName as RouteName })

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
