<script setup lang="ts">
import {
  UiAdminShell,
  type UiAdminNavigationExpansionUpdate,
  type UiAdminNavigationGroup,
} from '@platform/ui'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { reconcileNavigationGroupIds } from '../navigation/navigation-preference-contract'
import { useNavigationPreferenceStore } from '../navigation/navigation-preference.store'
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
const navigationPreference = useNavigationPreferenceStore()
const activeGroupExplicitlyCollapsed = ref(false)
const currentGroupIds = computed(() => navigation.value.map((group) => group.id))
const preferredExpandedGroupIds = computed(() =>
  reconcileNavigationGroupIds(navigationPreference.expandedGroupIds, currentGroupIds.value),
)
const activeGroupId = computed(
  () => navigation.value.find((group) => group.items.some((item) => item.isCurrentDestination))?.id,
)
const effectiveExpandedGroupIds = computed(() =>
  reconcileNavigationGroupIds(
    activeGroupExplicitlyCollapsed.value || activeGroupId.value === undefined
      ? preferredExpandedGroupIds.value
      : [...preferredExpandedGroupIds.value, activeGroupId.value],
    currentGroupIds.value,
  ),
)

watch(
  () => router.currentRoute.value,
  () => {
    activeGroupExplicitlyCollapsed.value = false
  },
  { flush: 'sync' },
)

function updateExpandedNavigationGroups(update: UiAdminNavigationExpansionUpdate): void {
  const requested = reconcileNavigationGroupIds(update.expandedGroupIds, currentGroupIds.value)
  const previousEffective = new Set(effectiveExpandedGroupIds.value)
  const nextEffective = new Set(requested)
  const preferred = new Set(preferredExpandedGroupIds.value)
  const nextPreferred =
    update.intent === 'all'
      ? requested
      : currentGroupIds.value.filter((id) =>
          previousEffective.has(id) !== nextEffective.has(id)
            ? nextEffective.has(id)
            : preferred.has(id),
        )
  activeGroupExplicitlyCollapsed.value =
    activeGroupId.value !== undefined && !nextEffective.has(activeGroupId.value)
  navigationPreference.setExpandedGroupIds(nextPreferred)
}

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
    :wide-navigation-collapsed="navigationPreference.wideNavigationCollapsed"
    :expanded-navigation-group-ids="effectiveExpandedGroupIds"
    :copy="copy"
    @navigate="navigate"
    @update:wide-navigation-collapsed="navigationPreference.setWideNavigationCollapsed"
    @update:expanded-navigation-group-ids="updateExpandedNavigationGroups"
  >
    <slot />
  </UiAdminShell>
  <slot v-else />
</template>
