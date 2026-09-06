<script setup lang="ts">
import { UiAdminShell, type UiAdminNavigationGroup } from '@platform/ui'
import { computed, onScopeDispose } from 'vue'
import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router'

import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import { getConsoleNavigation, type RouteName } from '../router/route-registry'
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
const navigation = computed((): readonly UiAdminNavigationGroup[] => getConsoleNavigation(t))
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
    :navigation="navigation"
    :copy="copy"
    @navigate="navigate"
  >
    <slot />
  </UiAdminShell>
  <slot v-else />
</template>
