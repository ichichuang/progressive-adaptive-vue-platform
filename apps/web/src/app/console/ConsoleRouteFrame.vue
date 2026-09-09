<script setup lang="ts">
import {
  UiAdminShell,
  UiWorkspaceTabs,
  type UiAdminNavigationExpansionUpdate,
  type UiAdminNavigationGroup,
} from '@platform/ui'
import { computed, nextTick, onScopeDispose, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  useWorkspaceStore,
  isLiveWorkspace,
  type WorkspaceIdentity,
} from '../workspace/workspace.store'
import { isRouterNavigationCurrent } from '../router/router-lifecycle'
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
const workspace = useWorkspaceStore()
const closing = new Set<WorkspaceIdentity>()
const workspaceTabs = computed(() =>
  workspace.entries.map((entry) => {
    const label = t(getRouteRecord(entry.destination.name).meta.titleKey)
    return {
      id: entry.identity,
      label,
      closeLabel: `${t('shell.closeActionLabel')} ${label}`,
      closable: !(workspace.entries.length === 1 && entry.destination.name === 'console-overview'),
    }
  }),
)

async function activateWorkspace(id: string): Promise<void> {
  const entry = workspace.entries.find((candidate) => candidate.identity === id)
  if (entry !== undefined)
    await routeTransitionCoordinator.navigate(
      entry.destination,
      isLiveWorkspace(entry) ? { workspaceActivation: entry } : undefined,
    )
}

async function closeWorkspace(id: string): Promise<void> {
  const entries = workspace.entries
  const index = entries.findIndex((entry) => entry.identity === id)
  const entry = entries[index]
  if (entry === undefined || closing.has(entry.identity)) return
  if (entry.identity !== workspace.activeIdentity) {
    workspace.discard(entry)
    await nextTick() // KeepAlive's public include pruning disposes the inactive instance.
    return
  }
  if (entries.length === 1 && entry.destination.name === 'console-overview') return
  if (!isLiveWorkspace(entry)) return
  if (!workspace.canDiscard(entry)) return
  const fallback = entries[index + 1] ?? entries[index - 1]
  const destination =
    fallback?.destination ?? registeredRouteDestination({ name: 'console-overview' })
  closing.add(entry.identity)
  try {
    const result = await routeTransitionCoordinator.navigate(
      destination,
      fallback !== undefined && isLiveWorkspace(fallback)
        ? { workspaceActivation: fallback }
        : undefined,
    )
    const active = workspace.active
    const resolved = resolveRegisteredDestination(router, destination)
    // A list mutation or independent navigation invalidates this destructive request.
    const survivors = workspace.entries.filter((candidate) =>
      entries.some((original) => original.identity === candidate.identity),
    )
    if (
      result.kind !== 'allow' ||
      !isRouterNavigationCurrent(router, result.navigationId) ||
      resolved === undefined ||
      !sameRouteAddress(router.currentRoute.value, resolved) ||
      active === undefined ||
      (fallback !== undefined &&
        (active.identity !== fallback.identity ||
          (isLiveWorkspace(fallback) && active.instance !== fallback.instance))) ||
      survivors.length !== entries.length ||
      survivors.some((candidate, position) => {
        const original = entries[position]
        if (candidate.identity !== original?.identity) return true
        return isLiveWorkspace(original)
          ? !isLiveWorkspace(candidate) || candidate.instance !== original.instance
          : candidate !== original && !(original === fallback && candidate === active)
      }) ||
      workspace.entries.length !== entries.length + (fallback === undefined ? 1 : 0)
    )
      return
    workspace.discard(entry)
    await nextTick()
  } finally {
    closing.delete(entry.identity)
  }
}
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

const appearance = useAppearanceReadBoundary()
const routeTransitionCoordinator = createRouteTransitionCoordinator({
  router,
  appearance,
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
    :enabled="shellRequired"
    :active-route-name="activeRouteName"
    :navigation="navigation"
    :wide-navigation-collapsed="navigationPreference.wideNavigationCollapsed"
    :expanded-navigation-group-ids="effectiveExpandedGroupIds"
    :copy="copy"
    @navigate="navigate"
    @update:wide-navigation-collapsed="navigationPreference.setWideNavigationCollapsed"
    @update:expanded-navigation-group-ids="updateExpandedNavigationGroups"
  >
    <template #workspace>
      <UiWorkspaceTabs
        :items="workspaceTabs"
        :active-id="workspace.activeIdentity"
        :motion="appearance.snapshot.value.motion"
        :label="t('workspace.label')"
        panel-id="pavp-workspace-panel"
        @activate="activateWorkspace"
        @close="closeWorkspace"
      />
    </template>
    <slot />
  </UiAdminShell>
</template>
