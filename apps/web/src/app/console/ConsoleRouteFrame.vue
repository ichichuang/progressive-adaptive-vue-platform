<script setup lang="ts">
import { explicitThemePreferenceSchema } from '@platform/design-system'
import {
  UiAdminShell,
  UiWorkspaceTabs,
  type UiAdminNavigationExpansionUpdate,
  type UiAdminNavigationGroup,
  type UiScrollController,
  type UiShellComposition,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NIcon } from 'naive-ui/es/icon'
import { NTooltip } from 'naive-ui/es/tooltip'
import {
  computed,
  inject,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  watch,
  type Component,
} from 'vue'
import { useRouter } from 'vue-router'

import {
  useWorkspaceStore,
  isLiveWorkspace,
  type WorkspaceIdentity,
} from '../workspace/workspace.store'
import { isRouterNavigationCurrent } from '../router/router-lifecycle'
import { workspaceRetentionKey } from '../workspace/workspace-retention'
import { provideWorkspaceUnsavedChanges } from '../workspace/workspace-unsaved-changes'
import { useApplicationNavigation, useWorkspaceNavigation } from '../router/application-navigation'
import {
  routerScrollControllerKey,
  routerWorkspaceRefreshKey,
} from '../router/router-scroll-controller'
import { reconcileNavigationGroupIds } from '../navigation/navigation-preference-contract'
import { useNavigationPreferenceStore } from '../navigation/navigation-preference.store'
import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import { useAppearanceMutationBoundary } from '../appearance/appearance-mutation-boundary'
import {
  registeredRouteDestination,
  resolveRegisteredDestination,
  sameRouteAddress,
  type TypedNavigationResult,
} from '../router/route-input'
import {
  consoleNavigationRegistry,
  consoleNavigationGroups,
  consoleNavigationItems,
  type ConsoleNavigationGroup,
  getRouteRecord,
} from '../router/route-registry'
import { provideSettingsReturn } from '../router/settings-return'
import { useRuntimePresentation } from '../config/runtime-presentation'
import { useShellScrollRestoration } from '../scroll/use-shell-scroll-restoration'

defineOptions({ name: 'ConsoleRouteFrame' })
const shellScroll = useShellScrollRestoration()
const presentation = useRuntimePresentation()

const props = defineProps<{
  readonly activeRouteName: string
  readonly composition: UiShellComposition | null
  readonly containedContent: boolean
}>()

defineSlots<{
  footer?: (props: Readonly<Record<string, never>>) => unknown
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const { t } = useConsoleI18n()
const colorModeSwitchFailed = ref(false)
function projectNavigation(group: ConsoleNavigationGroup): UiAdminNavigationGroup {
  return {
    id: group.id,
    label: t(group.labelKey),
    items: group.items.map((item) => {
      if ('items' in item) return projectNavigation(item)
      const destination = registeredRouteDestination(item.destination)
      const resolved = resolveRegisteredDestination(router, destination)
      return {
        iconClass: item.iconClass,
        routeName: item.destination.name,
        label: t(getRouteRecord(item.destination.name).meta.titleKey),
        isCurrentDestination:
          resolved !== undefined && sameRouteAddress(router.currentRoute.value, resolved),
      }
    }),
  }
}
const navigation = computed((): readonly UiAdminNavigationGroup[] =>
  consoleNavigationRegistry.map(projectNavigation),
)

function activeNavigationPath(groups: readonly UiAdminNavigationGroup[]): readonly string[] {
  for (const group of groups) {
    for (const item of group.items) {
      if ('items' in item) {
        const childPath = activeNavigationPath([item])
        if (childPath.length !== 0) return [group.id, ...childPath]
      } else if (item.isCurrentDestination) return [group.id]
    }
  }
  return []
}
const copy = computed(() => ({
  ...(presentation.name === null ? {} : { brandName: presentation.name }),
  ...(presentation.logo === null ? {} : { logoUrl: presentation.logo }),
  consoleTitle: presentation.name ?? t('shell.consoleTitle'),
  navigationLabel: t('shell.navigationLabel'),
  navigationActionLabel: t('shell.navigationActionLabel'),
  openNavigationLabel: t('shell.openNavigationLabel'),
  closeNavigationLabel: t('shell.closeNavigationLabel'),
  closeActionLabel: t('shell.closeActionLabel'),
  expandNavigationLabel: t('shell.expandNavigationLabel'),
  collapseNavigationLabel: t('shell.collapseNavigationLabel'),
  locateCurrentLabel: t('shell.locateCurrent'),
  freeNavigationModeLabel: t('shell.freeNavigationModeLabel'),
  accordionNavigationModeLabel: t('shell.accordionNavigationModeLabel'),
  switchToLightLabel: t('shell.switchToLight'),
  switchToDarkLabel: t('shell.switchToDark'),
  colorModeChangeFailedLabel: t('shell.colorModeChangeFailed'),
}))
const router = useRouter()
const applicationNavigation = useApplicationNavigation()
const workspaceNavigation = useWorkspaceNavigation()
const settingsReturn = provideSettingsReturn()
const registerScrollController = inject(routerScrollControllerKey)
const prepareWorkspaceRefresh = inject(routerWorkspaceRefreshKey)
const retentionCommands = inject(workspaceRetentionKey)
if (retentionCommands === undefined)
  throw new TypeError('The Workspace retention commands are unavailable.')
const retention = retentionCommands
if (prepareWorkspaceRefresh === undefined)
  throw new Error('The Console requires the Router Workspace Refresh port.')
if (registerScrollController === undefined)
  throw new Error('The Console requires the Router Scroll Controller port.')
let unregisterScrollController: (() => void) | undefined
let unregisterPageScrollController: (() => void) | undefined
provide(routerScrollControllerKey, (controller) => {
  const release = registerScrollController(controller)
  unregisterPageScrollController = release
  return () => {
    release()
    if (unregisterPageScrollController === release) unregisterPageScrollController = undefined
  }
})
watch(
  () => [props.activeRouteName, props.containedContent] as const,
  ([, contained]) => {
    unregisterPageScrollController?.()
    unregisterPageScrollController = undefined
    if (!contained) return
    unregisterScrollController?.()
    unregisterScrollController = undefined
  },
  { flush: 'sync' },
)
function connectContentScrollController(controller: UiScrollController | null): void {
  if (controller === null) {
    unregisterScrollController?.()
    unregisterScrollController = undefined
    return
  }
  if (unregisterScrollController !== undefined)
    throw new TypeError('The Console content already has a Scroll Controller.')
  unregisterScrollController = registerScrollController?.(controller)
}
const workspace = useWorkspaceStore()
const { confirmation: discardConfirmation, requestDiscard } =
  provideWorkspaceUnsavedChanges(workspace)
const WorkspaceDiscardDialog = shallowRef<Component>()
const discardDialogUnavailable = ref(false)
watch(discardConfirmation, async (confirmation) => {
  if (confirmation === undefined) return
  discardDialogUnavailable.value = false
  if (WorkspaceDiscardDialog.value !== undefined) return
  try {
    WorkspaceDiscardDialog.value = (await import('../workspace/WorkspaceDiscardDialog.vue')).default
  } catch {
    // A missing optional dialog chunk must not replace the app and destroy retained edits.
    if (discardConfirmation.value !== confirmation) return
    confirmation.cancel()
    discardDialogUnavailable.value = true
  }
})
const closing = new Set<WorkspaceIdentity>()
// Navigation must succeed before discarding a workspace. Present that two-step
// transaction to the tab strip as one selection/layout change, not two targets.
const closingTabActivation = shallowRef<{
  readonly source: WorkspaceIdentity
  readonly destination: WorkspaceIdentity
} | null>(null)
const workspaceTabActiveId = computed(() => {
  const closingActivation = closingTabActivation.value
  return closingActivation !== null &&
    workspace.activeIdentity === closingActivation.destination &&
    workspace.entries.some((entry) => entry.identity === closingActivation.source)
    ? closingActivation.source
    : workspace.activeIdentity
})
const workspaceTabs = computed(() =>
  workspace.entries.map((entry) => {
    const label = t(getRouteRecord(entry.destination.name).meta.titleKey)
    return {
      id: entry.identity,
      label,
      closeLabel: `${t('shell.closeActionLabel')} ${label}`,
      closable: !(
        workspace.entries.length === 1 && entry.destination.name === 'workbench-dashboard'
      ),
      refreshable: workspace.canDiscard(entry),
    }
  }),
)

async function activateWorkspace(id: string): Promise<TypedNavigationResult | undefined> {
  const entry = workspace.entries.find((candidate) => candidate.identity === id)
  if (entry !== undefined)
    return workspaceNavigation.navigate(
      entry.destination,
      isLiveWorkspace(entry) ? { workspaceActivation: entry } : undefined,
    )
}

let refreshTarget: WorkspaceIdentity | undefined
async function refreshWorkspace(id: string): Promise<void> {
  const target = workspace.entries.find((entry) => entry.identity === id)
  if (
    target === undefined ||
    refreshTarget !== undefined ||
    closing.has(target.identity) ||
    !workspace.canDiscard(target)
  )
    return
  refreshTarget = target.identity
  discardDialogUnavailable.value = false
  try {
    const startingRoute = router.currentRoute.value
    const discard = await requestDiscard(
      target,
      'refresh',
      () =>
        refreshTarget === target.identity &&
        !closing.has(target.identity) &&
        router.currentRoute.value === startingRoute,
    )
    if (!discard?.isCurrent()) return
    if (target.identity !== workspace.activeIdentity) {
      const result = await activateWorkspace(id)
      const resolved = resolveRegisteredDestination(router, target.destination)
      if (
        result?.kind !== 'allow' ||
        !isRouterNavigationCurrent(router, result.navigationId) ||
        resolved === undefined ||
        !sameRouteAddress(router.currentRoute.value, resolved)
      )
        return
    }
    const active = workspace.active
    if (
      active?.identity !== target.identity ||
      refreshTarget !== target.identity ||
      closing.has(target.identity)
    )
      return
    // Dormant activation already mounted a fresh instance; never mount it twice.
    if (!isLiveWorkspace(target)) return
    if (active.instance !== target.instance || !discard.isCurrent()) return
    const presentation = prepareWorkspaceRefresh?.(active)
    if (presentation === undefined) return
    try {
      const replacement = await retention.refresh(active, {
        signal: presentation.signal,
        replace: (prepare) => (discard.isCurrent() ? presentation.replace(prepare) : undefined),
        isCurrent: () =>
          refreshTarget === target.identity &&
          !closing.has(target.identity) &&
          presentation.isCurrent(),
      })
      if (replacement !== undefined) await presentation.reset(replacement)
    } finally {
      presentation.release()
    }
  } finally {
    refreshTarget = undefined
  }
}

async function closeWorkspace(id: string): Promise<void> {
  const entries = workspace.entries
  const index = entries.findIndex((entry) => entry.identity === id)
  const entry = entries[index]
  if (entry === undefined || closing.has(entry.identity)) return
  if (entries.length === 1 && entry.destination.name === 'workbench-dashboard') return
  if (!workspace.canDiscard(entry) || refreshTarget === entry.identity) return
  const wasActive = entry.identity === workspace.activeIdentity
  const startingRoute = router.currentRoute.value
  closing.add(entry.identity)
  discardDialogUnavailable.value = false
  try {
    const discard = await requestDiscard(
      entry,
      'close',
      () =>
        closing.has(entry.identity) &&
        (wasActive
          ? router.currentRoute.value === startingRoute
          : workspace.activeIdentity !== entry.identity),
    )
    if (!discard?.isCurrent()) return
    if (!wasActive) {
      await retention.close(entry)
      return
    }
    if (!isLiveWorkspace(entry)) return
    const fallback = entries[index + 1] ?? entries[index - 1]
    const destination =
      fallback?.destination ?? registeredRouteDestination({ name: 'workbench-dashboard' })
    const closingActivation =
      fallback === undefined
        ? null
        : {
            source: entry.identity,
            destination: fallback.identity,
          }
    closingTabActivation.value = closingActivation
    const result = await workspaceNavigation.navigate(
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
      result.presentation !== 'page' ||
      !isRouterNavigationCurrent(router, result.navigationId) ||
      resolved === undefined ||
      !sameRouteAddress(router.currentRoute.value, resolved) ||
      active === undefined ||
      !retention.isHealthy(active) ||
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
      workspace.entries.length !== entries.length + (fallback === undefined ? 1 : 0) ||
      !discard.isCurrent()
    )
      return
    await retention.close(entry)
  } finally {
    if (closingTabActivation.value?.source === entry.identity) closingTabActivation.value = null
    closing.delete(entry.identity)
  }
}
const navigationPreference = useNavigationPreferenceStore()
const activeGroupExplicitlyCollapsed = ref(false)
const currentGroupIds = computed(() => consoleNavigationGroups.map((group) => group.id))
const preferredExpandedGroupIds = computed(() =>
  reconcileNavigationGroupIds(navigationPreference.expandedGroupIds, currentGroupIds.value),
)
const activeGroupIds = computed(() => activeNavigationPath(navigation.value))
const effectiveExpandedGroupIds = computed(() =>
  reconcileNavigationGroupIds(
    activeGroupExplicitlyCollapsed.value || activeGroupIds.value.length === 0
      ? preferredExpandedGroupIds.value
      : navigationPreference.accordion
        ? activeGroupIds.value.every((id) => preferredExpandedGroupIds.value.includes(id))
          ? preferredExpandedGroupIds.value
          : activeGroupIds.value
        : [...preferredExpandedGroupIds.value, ...activeGroupIds.value],
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

watch(
  () => navigationPreference.accordion,
  () => {
    activeGroupExplicitlyCollapsed.value = false
  },
  { flush: 'sync' },
)

function updateExpandedNavigationGroups(update: UiAdminNavigationExpansionUpdate): void {
  const requested = reconcileNavigationGroupIds(update.expandedGroupIds, currentGroupIds.value)
  if (update.intent === 'mode') {
    activeGroupExplicitlyCollapsed.value = false
    navigationPreference.setNavigationAccordion(update.accordion, requested)
    return
  }
  const previousEffective = new Set(effectiveExpandedGroupIds.value)
  const nextEffective = new Set(requested)
  const preferred = new Set(preferredExpandedGroupIds.value)
  const nextPreferred = navigationPreference.accordion
    ? requested
    : currentGroupIds.value.filter((id) =>
        previousEffective.has(id) !== nextEffective.has(id)
          ? nextEffective.has(id)
          : preferred.has(id),
      )
  activeGroupExplicitlyCollapsed.value = activeGroupIds.value.some((id) => !nextEffective.has(id))
  navigationPreference.setExpandedGroupIds(nextPreferred)
}

const appearance = useAppearanceReadBoundary()
const appearanceMutation = useAppearanceMutationBoundary()

function toggleColorMode(): void {
  const current = explicitThemePreferenceSchema.safeParse(appearanceMutation.preference.value)
  if (!current.success) {
    colorModeSwitchFailed.value = true
    return
  }
  const result = appearanceMutation.commitPreference({
    ...current.data,
    appearance: {
      ...current.data.appearance,
      colorMode: appearance.snapshot.value.colorMode === 'dark' ? 'light' : 'dark',
    },
  })
  colorModeSwitchFailed.value = result.status !== 'committed'
}

onScopeDispose(() => {
  refreshTarget = undefined
  unregisterScrollController?.()
  unregisterPageScrollController?.()
})

// One successful settings departure owns positioning for Done, history and shell navigation.
const navigationFocusRequest = ref(0)
watch(
  () => props.activeRouteName,
  (to, from) => {
    if (from === 'control-center' && to !== from) navigationFocusRequest.value += 1
  },
  { flush: 'post' },
)

async function prepareNavigationFocus(): Promise<boolean> {
  if (props.activeRouteName !== 'control-center') return true
  await settingsReturn.finish()
  // The successful departure hook above positions once, after the new route renders.
  return false
}

async function navigate(routeName: string): Promise<void> {
  if (routeName === 'control-center') {
    if (props.activeRouteName !== 'control-center')
      await applicationNavigation.navigate(registeredRouteDestination({ name: 'control-center' }))
    return
  }
  const item = consoleNavigationItems.find((candidate) => candidate.destination.name === routeName)
  if (item === undefined) return
  await applicationNavigation.navigate(registeredRouteDestination(item.destination))
}
</script>

<template>
  <WorkspaceDiscardDialog
    v-if="discardConfirmation !== undefined && WorkspaceDiscardDialog !== undefined"
    :action="discardConfirmation.action"
    :workspace-name="t(getRouteRecord(discardConfirmation.entry.destination.name).meta.titleKey)"
    :accept="discardConfirmation.accept"
    :cancel="discardConfirmation.cancel"
  />
  <div
    v-if="discardDialogUnavailable"
    class="flex pointer-events-none inset-x-0 bottom-0 justify-center fixed p-page-inline z-overlay"
  >
    <p
      class="m-0 rounded-panel shadow-panel bg-surface-panel max-w-content p-page-inline text-caption text-text-primary"
      role="alert"
      v-text="t('shell.unsavedChangesUnavailable')"
    />
  </div>
  <UiAdminShell
    :composition="composition"
    :prepare-navigation-focus="prepareNavigationFocus"
    :navigation-focus-request="navigationFocusRequest"
    :content-layout="containedContent ? 'contained' : 'scroll'"
    :active-route-name="activeRouteName"
    :navigation="navigation"
    :wide-navigation-collapsed="navigationPreference.wideNavigationCollapsed"
    :navigation-accordion="navigationPreference.accordion"
    :color-mode-switch-failed="colorModeSwitchFailed"
    :expanded-navigation-group-ids="effectiveExpandedGroupIds"
    :copy="copy"
    @navigate="navigate"
    @toggle-color-mode="toggleColorMode"
    @content-scroll-controller="connectContentScrollController"
    @sidebar-viewport="shellScroll('sidebar', $event)"
    @drawer-viewport="shellScroll('drawer', $event)"
    @update:wide-navigation-collapsed="navigationPreference.setWideNavigationCollapsed"
    @update:expanded-navigation-group-ids="updateExpandedNavigationGroups"
  >
    <template #workspace>
      <UiWorkspaceTabs
        v-if="activeRouteName !== 'control-center'"
        :items="workspaceTabs"
        :active-id="workspaceTabActiveId"
        :motion="appearance.snapshot.value.motion"
        :label="t('workspace.label')"
        :previous-label="t('workspace.previousLabel')"
        :next-label="t('workspace.nextLabel')"
        :refresh-label="t('workspace.refreshLabel')"
        :close-label="t('shell.closeActionLabel')"
        panel-id="pavp-workspace-panel"
        @viewport="shellScroll('tabs', $event)"
        @activate="activateWorkspace"
        @close="closeWorkspace"
        @refresh="refreshWorkspace"
      />
    </template>
    <template #navigation-bottom="{ collapsed, navigate: navigateFromDock }">
      <div class="flex w-full justify-center">
        <NTooltip
          :disabled="!collapsed"
          placement="right"
          to="#pavp-overlay-root"
        >
          <template #trigger>
            <NButton
              :aria-current="activeRouteName === 'control-center' ? 'page' : undefined"
              :aria-label="t('shell.systemSettings')"
              block
              class="wb-settings-dock min-h-target-enhanced min-w-target-enhanced"
              :data-collapsed="collapsed"
              :quaternary="activeRouteName !== 'control-center'"
              :tertiary="activeRouteName === 'control-center'"
              :bordered="false"
              @click="navigateFromDock('control-center')"
            >
              <span class="flex min-w-0 items-center gap-content-gap">
                <NIcon>
                  <span
                    aria-hidden="true"
                    class="i-lucide-settings block"
                  />
                </NIcon>
                <span
                  v-if="!collapsed"
                  class="font-title-weight"
                >
                  {{ t('shell.systemSettings') }}
                </span>
              </span>
            </NButton>
          </template>
          {{ t('shell.systemSettings') }}
        </NTooltip>
      </div>
    </template>
    <template #footer>
      <slot name="footer" />
    </template>
    <slot />
  </UiAdminShell>
</template>
