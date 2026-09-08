<script setup lang="ts">
import { UiAdminShell, type UiAdminNavigationGroup } from '@platform/ui'
import { computed, onScopeDispose } from 'vue'
import { useRouter } from 'vue-router'

import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import {
  registeredRouteDestination,
  resolveRegisteredDestination,
  sameRouteAddress,
} from '../router/route-input'
import { consoleNavigationRegistry, getRouteRecord } from '../router/route-registry'
import { createRouteTransitionCoordinator } from '../router/route-transition/route-transition-coordinator'

defineOptions({ name: 'ConsoleRouteFrame' })

defineProps<{
  readonly activeRouteName: string
  readonly shellRequired: boolean
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const { t } = useConsoleI18n()
const projectedNavigation = computed(() =>
  consoleNavigationRegistry
    .map((group) => ({
      id: group.id,
      label: t(group.labelKey),
      items: group.items.map((item) => ({
        ...item,
        destination: registeredRouteDestination(item.destination),
        routeName: item.destination.name,
        label: t(getRouteRecord(item.destination.name).meta.titleKey),
      })),
    }))
    .filter((group) => group.items.length !== 0),
)
const navigation = computed((): readonly UiAdminNavigationGroup[] =>
  projectedNavigation.value.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const resolved = resolveRegisteredDestination(router, item.destination)
      return {
        ...item,
        isCurrentDestination:
          resolved !== undefined && sameRouteAddress(router.currentRoute.value, resolved),
      }
    }),
  })),
)
const copy = computed(() => ({
  consoleTitle: t('shell.consoleTitle'),
  navigationLabel: t('shell.navigationLabel'),
  navigationActionLabel: t('shell.navigationActionLabel'),
  openNavigationLabel: t('shell.openNavigationLabel'),
  closeNavigationLabel: t('shell.closeNavigationLabel'),
  closeActionLabel: t('shell.closeActionLabel'),
  expandNavigationLabel: t('shell.expandNavigationLabel'),
  collapseNavigationLabel: t('shell.collapseNavigationLabel'),
  expandAllMenusLabel: t('shell.expandAllMenusLabel'),
  collapseAllMenusLabel: t('shell.collapseAllMenusLabel'),
}))
const router = useRouter()
const routeTransitionCoordinator = createRouteTransitionCoordinator({
  router,
  appearance: useAppearanceReadBoundary(),
})

onScopeDispose(() => {
  routeTransitionCoordinator.dispose()
})

async function navigate(routeName: string): Promise<void> {
  const item = projectedNavigation.value
    .flatMap((group) => group.items)
    .find((candidate) => candidate.routeName === routeName)
  if (item === undefined) return
  await routeTransitionCoordinator.navigate(item.destination)
}
</script>

<template>
  <UiAdminShell
    v-if="shellRequired"
    :active-route-name="activeRouteName"
    :navigation="navigation"
    :copy="copy"
    @navigate="navigate"
  >
    <slot />
  </UiAdminShell>
  <slot v-else />
</template>
