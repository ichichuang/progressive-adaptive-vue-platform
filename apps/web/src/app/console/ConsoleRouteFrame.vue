<script setup lang="ts">
import { UiAdminShell } from '@platform/ui'
import { useRouter } from 'vue-router'

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

function navigate(routeName: string): void {
  void router.push({ name: routeName as RouteName })
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
