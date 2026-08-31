<script setup lang="ts">
import {
  layoutRegistry,
  tokens,
  type LayoutProfileId,
  type LayoutRegistryRecord,
  type MotionPreference,
} from '@platform/design-system'
import {
  computed,
  h,
  inject,
  nextTick,
  onBeforeMount,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import type {
  AdminNavigationMotionCause,
  AdminNavigationMotionController,
  AdminNavigationMotionState,
  AdminNavigationMotionTargets,
} from '../adapters/gsap/admin-navigation-motion'
import { PavpLayoutPrimitive, PavpLayoutSiderPrimitive } from '../adapters/naive/naive-layout'
import {
  definePavpMenuNodeProps,
  PavpMenuPrimitive,
  type PavpMenuDropdownProps,
  type PavpMenuOption,
} from '../adapters/naive/naive-menu'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { resolveAdminShellProfile } from '../internal/layout/resolve-admin-shell-profile'
import type { UiAdminNavigationGroup } from './contracts'

defineOptions({ name: 'UiAdminShell' })

const props = defineProps<{
  readonly activeRouteName: string
  readonly navigation: readonly UiAdminNavigationGroup[]
}>()

const emit = defineEmits<{
  navigate: [routeName: string]
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

interface PendingAdminNavigationCollapseIntent {
  readonly initialState: AdminNavigationMotionState
  readonly originInlineStart: number
}

interface PendingAdminNavigationMotionSync {
  readonly cause: AdminNavigationMotionCause
  readonly initialState: AdminNavigationMotionState
  readonly state: AdminNavigationMotionState
}

const injectedAppearance = inject(pavpNaiveAppearanceKey)

if (injectedAppearance === undefined) {
  throw new Error('UiAdminShell requires the private PAVP Naive Appearance context.')
}

const appearance = injectedAppearance

const navigationIconClasses = [
  'i-lucide-layout-dashboard',
  'i-lucide-palette',
  'i-lucide-swatch-book',
  'i-lucide-cpu',
  'i-lucide-route',
  'i-lucide-database',
  'i-lucide-component',
  'i-lucide-panels-top-left',
  'i-lucide-workflow',
  'i-lucide-map',
] as const
type NavigationIconClass = (typeof navigationIconClasses)[number]

function resolveNavigationIconClass(iconClass: string): NavigationIconClass {
  if (!navigationIconClasses.includes(iconClass as NavigationIconClass)) {
    throw new TypeError(`${iconClass}: Admin Shell navigation icon is not admitted.`)
  }

  return iconClass as NavigationIconClass
}

function layoutRecord(id: string): LayoutRegistryRecord {
  const record = layoutRegistry.records.find((candidate) => candidate.id === id)

  if (record === undefined) {
    throw new TypeError(`${id}: Admin Shell Layout Registry record is missing.`)
  }

  return record
}

const regularMinimum = layoutRecord('layout.profile.regular.min-inline-size')
const wideMinimum = layoutRecord('layout.profile.wide.min-inline-size')
const railInlineSize = layoutRecord('layout.admin.sidebar.rail-inline-size')
const railRemMatch = /^(\d+(?:\.\d+)?)rem$/u.exec(railInlineSize.resolvedValue)

if (railRemMatch?.[1] === undefined) {
  throw new TypeError(
    `${railInlineSize.id}: Admin Shell rail width must be a finite positive rem value.`,
  )
}

const railRemMagnitude = Number(railRemMatch[1])

if (!Number.isFinite(railRemMagnitude) || railRemMagnitude <= 0) {
  throw new TypeError(
    `${railInlineSize.id}: Admin Shell rail width must be a finite positive rem value.`,
  )
}

function readRootFontSize(): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError('The computed root font size must be finite and positive.')
  }

  return value
}

const shell = ref<HTMLElement>()
const content = ref<HTMLElement>()
const expandedNavigationPlane = ref<HTMLElement>()
const collapsedNavigationPlane = ref<HTMLElement>()
const navigationChromeBridge = ref<HTMLElement>()
const navigationTrigger = ref<HTMLButtonElement>()
const drawerNavigation = ref<HTMLElement>()
const drawerClose = ref<HTMLButtonElement>()
const expandedCollapseIcon = ref<HTMLElement>()
const collapsedCollapseIcon = ref<HTMLElement>()
const collapseLabel = ref<HTMLElement>()
const profile = ref<LayoutProfileId>('narrow')
const navigationOpen = ref(false)
const wideNavigationCollapsed = ref(false)
const currentRootFontSize = ref(readRootFontSize())
const collapsedNavigationWidth = computed(() => railRemMagnitude * currentRootFontSize.value)
const naiveMenuIconMarginInline = 8
const navigationDockIconAxisInline = computed(() => collapsedNavigationWidth.value / 2)
const navigationDockLabelInlineStart = computed(() => (currentRootFontSize.value * 13) / 4)
const navigationMenuIconSize = computed(
  () =>
    (navigationDockLabelInlineStart.value -
      navigationDockIconAxisInline.value -
      naiveMenuIconMarginInline) *
    2,
)
const navigationMenuRootIndent = computed(
  () => navigationDockIconAxisInline.value - navigationMenuIconSize.value / 2,
)
const persistentNavigationCollapsed = computed(() => {
  if (profile.value === 'regular') {
    return true
  }

  return profile.value === 'wide' && wideNavigationCollapsed.value
})
const expandedNavigationWidth = tokens['layout.admin.sidebar.expanded-inline-size']
const persistentLayoutContentStyle = Object.freeze({ overflow: 'visible' })
const persistentSiderContentStyle = Object.freeze({
  overflow: 'var(--pavp-admin-navigation-sider-content-overflow)',
})
const wideNavigationCollapseLabel = computed(() =>
  wideNavigationCollapsed.value ? '展开导航' : '收起导航',
)
const navigationGroupKeys = computed(() =>
  props.navigation.map((group) => `navigation-group:${group.id}`),
)
const navigationRouteInventory = computed(() =>
  JSON.stringify(props.navigation.map((group) => group.items.map((item) => item.routeName))),
)
const expandedNavigationGroupKeys = ref<string[]>([...navigationGroupKeys.value])
const projectedExpandedNavigationGroupKeys = computed(() => {
  const projectedKeys = new Set(expandedNavigationGroupKeys.value)

  for (const group of props.navigation) {
    if (group.items.some((item) => item.routeName === props.activeRouteName)) {
      projectedKeys.add(navigationGroupKey(group.id))
    }
  }

  return [...projectedKeys]
})
const navigationSwitchExpandedGroupKeys = ref<string[]>()
const renderedExpandedNavigationGroupKeys = computed(
  () => navigationSwitchExpandedGroupKeys.value ?? projectedExpandedNavigationGroupKeys.value,
)
const routeSelectionAuraCandidates = new Map<string, Set<HTMLElement>>()
let currentShellInlineSize = 0
let resizeObserver: ResizeObserver | undefined
let adminNavigationMotionController: AdminNavigationMotionController | undefined
let adminNavigationMotionLoadPromise: Promise<void> | undefined
let adminNavigationMotionLoadEpoch = 0
let pendingAdminNavigationCollapseIntent: PendingAdminNavigationCollapseIntent | undefined
let pendingAdminNavigationMotionSync: PendingAdminNavigationMotionSync | undefined
let rootOverflow = ''
let bodyOverflow = ''
let focusReturnTarget: HTMLElement | null = null

function closeNavigation(): void {
  navigationOpen.value = false
}

function handleDrawerScrimPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || event.target !== event.currentTarget) {
    return
  }

  event.preventDefault()
  closeNavigation()
}

function openNavigation(): void {
  focusReturnTarget =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : (navigationTrigger.value ?? null)
  navigationOpen.value = true
}

function navigate(routeName: string): void {
  if (profile.value === 'narrow' && navigationOpen.value) {
    closeNavigation()
  }

  if (routeName === props.activeRouteName) {
    return
  }

  emit('navigate', routeName)
}

function preserveCurrentPersistentNavigationFocus(event: PointerEvent, routeName: string): void {
  if (event.button === 0 && routeName === props.activeRouteName) {
    event.preventDefault()
  }
}

function navigationGroupKey(groupId: string): string {
  return `navigation-group:${groupId}`
}

function navigationOptionKind(option: PavpMenuOption): 'group' | 'route' | undefined {
  return option['pavpNavigationKind'] === 'group' || option['pavpNavigationKind'] === 'route'
    ? option['pavpNavigationKind']
    : undefined
}

function navigationOptionRouteName(option: PavpMenuOption): string | undefined {
  return typeof option['pavpRouteName'] === 'string' ? option['pavpRouteName'] : undefined
}

function renderNavigationIcon(iconClass: string): () => ReturnType<typeof h> {
  const admittedIconClass = resolveNavigationIconClass(iconClass)

  return () =>
    h('span', {
      'aria-hidden': 'true',
      class: [admittedIconClass, 'pavp-admin-shell__navigation-icon'],
    })
}

function updateRouteSelectionAuraReference(routeName: string, element: unknown): void {
  if (element instanceof HTMLElement) {
    const candidates = routeSelectionAuraCandidates.get(routeName) ?? new Set<HTMLElement>()
    candidates.add(element)
    routeSelectionAuraCandidates.set(routeName, candidates)
    return
  }

  if (element === null) {
    const candidates = routeSelectionAuraCandidates.get(routeName)

    if (candidates === undefined) {
      return
    }

    for (const candidate of candidates) {
      if (!candidate.isConnected) {
        candidates.delete(candidate)
      }
    }

    if (candidates.size === 0) {
      routeSelectionAuraCandidates.delete(routeName)
    }
  }
}

function renderRouteSelectionAura(routeName: string): () => ReturnType<typeof h> {
  return () =>
    h('span', {
      'aria-hidden': 'true',
      class: 'pavp-admin-shell__route-selection-aura',
      'data-selected': routeName === props.activeRouteName ? 'true' : 'false',
      ref: (element: unknown) => {
        updateRouteSelectionAuraReference(routeName, element)
      },
    })
}

function resolvedRouteSelectionAuras(): ReadonlyMap<string, HTMLElement> {
  const resolved = new Map<string, HTMLElement>()
  const expandedPlane = expandedNavigationPlane.value

  if (expandedPlane === undefined) {
    return resolved
  }

  for (const [routeName, candidates] of routeSelectionAuraCandidates) {
    for (const candidate of candidates) {
      if (!candidate.isConnected) {
        candidates.delete(candidate)
        continue
      }

      if (expandedPlane.contains(candidate)) {
        resolved.set(routeName, candidate)
        break
      }
    }
  }

  return resolved
}

const navigationMenuOptions = computed<PavpMenuOption[]>(() =>
  props.navigation.map((group) => {
    const firstItem = group.items[0]

    if (firstItem === undefined) {
      throw new TypeError(`${group.id}: Admin Shell navigation group must contain route items.`)
    }

    return {
      key: navigationGroupKey(group.id),
      label: group.label,
      icon: renderNavigationIcon(firstItem.iconClass),
      pavpNavigationKind: 'group',
      children: group.items.map((item) => ({
        key: item.routeName,
        label: item.label,
        icon: renderNavigationIcon(item.iconClass),
        extra: renderRouteSelectionAura(item.routeName),
        pavpNavigationKind: 'route',
        pavpRouteName: item.routeName,
      })),
    } satisfies PavpMenuOption
  }),
)

function toggleExpandedNavigationGroup(groupKey: string): void {
  if (navigationSwitchExpandedGroupKeys.value !== undefined) {
    return
  }

  if (expandedNavigationGroupKeys.value.includes(groupKey)) {
    expandedNavigationGroupKeys.value = expandedNavigationGroupKeys.value.filter(
      (key) => key !== groupKey,
    )
  } else {
    expandedNavigationGroupKeys.value = [...expandedNavigationGroupKeys.value, groupKey]
  }
}

function isKeyboardActivation(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' '
}

function handleRootNavigationKeydown(event: KeyboardEvent, groupKey: string): void {
  if (!isKeyboardActivation(event)) {
    return
  }

  event.preventDefault()

  if (persistentNavigationCollapsed.value) {
    if (!(event.currentTarget instanceof HTMLElement)) {
      throw new TypeError('The collapsed navigation trigger is unavailable.')
    }

    event.currentTarget.click()
    return
  }

  toggleExpandedNavigationGroup(groupKey)
}

function handleRouteNavigationKeydown(event: KeyboardEvent, routeName: string): void {
  if (!isKeyboardActivation(event)) {
    return
  }

  event.preventDefault()
  navigate(routeName)
}

const persistentNavigationNodeProps = definePavpMenuNodeProps((option) => {
  const optionKind = navigationOptionKind(option)

  if (optionKind === 'group' && typeof option.key === 'string') {
    const groupKey = option.key

    return {
      tabindex: 0,
      onKeydown: (event: KeyboardEvent) => {
        handleRootNavigationKeydown(event, groupKey)
      },
    }
  }

  const routeName = navigationOptionRouteName(option)

  if (optionKind !== 'route' || routeName === undefined) {
    return {}
  }

  return {
    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,
    tabindex: 0,
    onKeydown: (event: KeyboardEvent) => {
      handleRouteNavigationKeydown(event, routeName)
    },
    onPointerdown: (event: PointerEvent) => {
      preserveCurrentPersistentNavigationFocus(event, routeName)
    },
  }
})

const persistentNavigationDropdownNodeProps = definePavpMenuNodeProps((option) => {
  const routeName = navigationOptionRouteName(option)

  if (routeName === undefined) {
    return {}
  }

  return {
    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,
    onPointerdown: (event: PointerEvent) => {
      preserveCurrentPersistentNavigationFocus(event, routeName)
    },
  }
})

const persistentNavigationDropdownProps = Object.freeze({
  keyboard: true,
  menuProps: () => ({ class: 'pavp-admin-navigation-dropdown' }),
  nodeProps: persistentNavigationDropdownNodeProps,
  to: '#pavp-overlay-root',
  trigger: 'click',
}) satisfies PavpMenuDropdownProps

function handleNavigationValueUpdate(value: string | number): void {
  if (typeof value === 'string') {
    navigate(value)
  }
}

function handleNavigationExpandedKeysUpdate(keys: (string | number)[]): void {
  if (navigationSwitchExpandedGroupKeys.value !== undefined) {
    return
  }

  const admittedGroupKeys = new Set(navigationGroupKeys.value)
  expandedNavigationGroupKeys.value = keys.filter(
    (key): key is string => typeof key === 'string' && admittedGroupKeys.has(key),
  )
}

function toggleWideNavigation(): void {
  const root = shell.value
  const mainContent = content.value

  if (root === undefined || mainContent === undefined) {
    throw new Error('The Wide Admin navigation collapse plane is unavailable.')
  }

  navigationSwitchExpandedGroupKeys.value ??= [...projectedExpandedNavigationGroupKeys.value]
  pendingAdminNavigationCollapseIntent = {
    initialState: resolveAdminNavigationMotionState(),
    originInlineStart: mainContent.getBoundingClientRect().left,
  }
  loadAdminNavigationMotion()
  root.setAttribute('data-pavp-admin-navigation-switch', 'active')
  wideNavigationCollapsed.value = !wideNavigationCollapsed.value
}

function releaseNavigationSwitchExpandedGroupKeys(): void {
  navigationSwitchExpandedGroupKeys.value = undefined
  pendingAdminNavigationCollapseIntent = undefined
  pendingAdminNavigationMotionSync = undefined
}

function resolveAdminNavigationMotionState(collapseOffsetInline = 0): AdminNavigationMotionState {
  return {
    activeRouteName: props.activeRouteName,
    collapsed: persistentNavigationCollapsed.value,
    collapseOffsetInline,
    motion: appearance.value.motion,
    profile: profile.value,
  }
}

function resolveAdminNavigationMotionTargets(): AdminNavigationMotionTargets {
  return {
    collapseLabel: collapseLabel.value ?? null,
    collapsedCollapseIcon: collapsedCollapseIcon.value ?? null,
    collapsedNavigationPlane: collapsedNavigationPlane.value ?? null,
    expandedNavigationPlane: expandedNavigationPlane.value ?? null,
    expandedCollapseIcon: expandedCollapseIcon.value ?? null,
    mainContentPlane: content.value ?? null,
    navigationChromeBridge: navigationChromeBridge.value ?? null,
    routeSelectionAuras: resolvedRouteSelectionAuras(),
  }
}

function reportAdminNavigationMotionFailure(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error)
    return
  }

  console.error('PAVP Admin navigation motion failed to initialize.', error)
}

function loadAdminNavigationMotion(): void {
  if (
    adminNavigationMotionController !== undefined ||
    adminNavigationMotionLoadPromise !== undefined
  ) {
    return
  }

  const loadEpoch = ++adminNavigationMotionLoadEpoch
  const loadPromise = import('../adapters/gsap/admin-navigation-motion')
    .then(({ createAdminNavigationMotionController }) => {
      const root = shell.value

      if (loadEpoch !== adminNavigationMotionLoadEpoch || root === undefined) {
        return
      }

      const initialState =
        pendingAdminNavigationMotionSync?.initialState ??
        pendingAdminNavigationCollapseIntent?.initialState ??
        resolveAdminNavigationMotionState()
      adminNavigationMotionController = createAdminNavigationMotionController({
        initialState,
        onCollapseSettled: releaseNavigationSwitchExpandedGroupKeys,
        resolveTargets: resolveAdminNavigationMotionTargets,
        root,
      })

      const pendingSync = pendingAdminNavigationMotionSync

      if (pendingSync !== undefined) {
        pendingAdminNavigationMotionSync = undefined
        pendingAdminNavigationCollapseIntent = undefined
        adminNavigationMotionController.sync(pendingSync.state, pendingSync.cause)
      }
    })
    .catch((error: unknown) => {
      if (loadEpoch !== adminNavigationMotionLoadEpoch) {
        return
      }

      adminNavigationMotionController?.dispose()
      adminNavigationMotionController = undefined
      shell.value?.removeAttribute('data-pavp-admin-navigation-motion')
      shell.value?.removeAttribute('data-pavp-admin-navigation-collapse-motion')
      shell.value?.removeAttribute('data-pavp-admin-navigation-route-motion')
      shell.value?.removeAttribute('data-pavp-admin-navigation-switch')
      releaseNavigationSwitchExpandedGroupKeys()
      reportAdminNavigationMotionFailure(error)
    })

  adminNavigationMotionLoadPromise = loadPromise
  void loadPromise.finally(() => {
    if (
      loadEpoch === adminNavigationMotionLoadEpoch &&
      adminNavigationMotionLoadPromise === loadPromise
    ) {
      adminNavigationMotionLoadPromise = undefined
    }
  })
}

function resolveAdminNavigationMotionCause(
  nextValues: readonly [LayoutProfileId, boolean, string, MotionPreference],
  previousValues: readonly [LayoutProfileId, boolean, string, MotionPreference],
): AdminNavigationMotionCause {
  if (nextValues[3] !== previousValues[3]) {
    return 'preference'
  }

  if (nextValues[0] !== previousValues[0]) {
    return 'profile'
  }

  if (nextValues[1] !== previousValues[1]) {
    return 'collapse'
  }

  return 'route'
}

function handleDrawerKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeNavigation()
    return
  }

  if (event.key !== 'Tab') {
    return
  }

  const focusable = [
    ...(drawerNavigation.value?.querySelectorAll<HTMLButtonElement>('button') ?? []),
  ]

  if (focusable.length === 0) {
    event.preventDefault()
    return
  }

  const first = focusable[0]
  const last = focusable.at(-1)

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

function updateResponsiveNavigationMetrics(inlineSize = currentShellInlineSize): void {
  currentShellInlineSize = inlineSize
  currentRootFontSize.value = readRootFontSize()
  profile.value = resolveAdminShellProfile({
    inlineSize: currentShellInlineSize,
    rootFontSize: currentRootFontSize.value,
    regularMinimum,
    wideMinimum,
  })

  if (profile.value !== 'narrow') {
    navigationOpen.value = false
  }
}

onMounted(() => {
  const target = shell.value

  if (target === undefined) {
    throw new Error('The Admin Shell query container is unavailable.')
  }

  rootOverflow = document.documentElement.style.overflow
  bodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  updateResponsiveNavigationMetrics(target.getBoundingClientRect().width)
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]

    if (entry !== undefined) {
      updateResponsiveNavigationMetrics(
        entry.borderBoxSize[0]?.inlineSize ?? entry.contentRect.width,
      )
    }
  })
  resizeObserver.observe(target)
  loadAdminNavigationMotion()
})

onBeforeMount(() => {
  loadAdminNavigationMotion()
})

onBeforeUnmount(() => {
  adminNavigationMotionLoadEpoch += 1
  adminNavigationMotionLoadPromise = undefined
  adminNavigationMotionController?.dispose()
  adminNavigationMotionController = undefined
  releaseNavigationSwitchExpandedGroupKeys()
  routeSelectionAuraCandidates.clear()
  resizeObserver?.disconnect()
  resizeObserver = undefined
  document.documentElement.style.overflow = rootOverflow
  document.body.style.overflow = bodyOverflow
  navigationOpen.value = false
})

watch(navigationOpen, async (isOpen) => {
  await nextTick()

  if (isOpen) {
    drawerClose.value?.focus()
  } else if (focusReturnTarget?.isConnected === true) {
    focusReturnTarget.focus()
    focusReturnTarget = null
  }
})

watch(
  () => appearance.value.fontScale,
  () => {
    updateResponsiveNavigationMetrics()
  },
  { flush: 'post' },
)

watch(
  expandedNavigationGroupKeys,
  () => {
    adminNavigationMotionController?.sync(resolveAdminNavigationMotionState(), 'route')
  },
  { flush: 'post' },
)

watch(
  navigationRouteInventory,
  () => {
    adminNavigationMotionController?.sync(resolveAdminNavigationMotionState(), 'route')
  },
  { flush: 'post' },
)

watch(
  [
    profile,
    persistentNavigationCollapsed,
    () => props.activeRouteName,
    () => appearance.value.motion,
  ],
  (nextValues, previousValues) => {
    const cause = resolveAdminNavigationMotionCause(nextValues, previousValues)
    const root = shell.value
    const collapseIntent = pendingAdminNavigationCollapseIntent
    let collapseOffsetInline = 0

    if (cause === 'collapse' && collapseIntent !== undefined) {
      const finalInlineStart = content.value?.getBoundingClientRect().left

      if (finalInlineStart !== undefined) {
        collapseOffsetInline = collapseIntent.originInlineStart - finalInlineStart
      }
    }

    const state = resolveAdminNavigationMotionState(collapseOffsetInline)

    if (adminNavigationMotionController === undefined) {
      if (cause === 'collapse' && collapseIntent !== undefined) {
        pendingAdminNavigationMotionSync = {
          cause,
          initialState: collapseIntent.initialState,
          state,
        }
        loadAdminNavigationMotion()
        return
      }

      if (cause === 'route' && pendingAdminNavigationMotionSync !== undefined) {
        pendingAdminNavigationMotionSync = {
          ...pendingAdminNavigationMotionSync,
          state: resolveAdminNavigationMotionState(
            pendingAdminNavigationMotionSync.state.collapseOffsetInline,
          ),
        }
        return
      }

      root?.removeAttribute('data-pavp-admin-navigation-switch')
      releaseNavigationSwitchExpandedGroupKeys()
      return
    }

    pendingAdminNavigationMotionSync = undefined
    pendingAdminNavigationCollapseIntent = undefined
    adminNavigationMotionController.sync(state, cause)
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="shell"
    class="pavp-admin-shell"
    :data-layout-profile="profile"
    :data-navigation-collapsed="persistentNavigationCollapsed ? 'true' : 'false'"
  >
    <header
      class="pavp-admin-shell__header h-admin-header"
      data-shell-region="architecture-console-header"
    >
      <button
        v-if="profile === 'narrow'"
        ref="navigationTrigger"
        aria-label="打开架构导航"
        class="pavp-admin-shell__action min-h-target-enhanced min-w-target-enhanced"
        type="button"
        @click="openNavigation"
      >
        导航
      </button>
      <div class="pavp-admin-shell__identity">
        <span class="pavp-admin-shell__eyebrow">PAVP</span>
        <strong>架构管理台</strong>
      </div>
    </header>

    <PavpLayoutPrimitive
      class="pavp-admin-shell__layout"
      :content-style="persistentLayoutContentStyle"
      data-pavp-admin-navigation="persistent"
      :has-sider="profile !== 'narrow'"
      :native-scrollbar="true"
    >
      <PavpLayoutSiderPrimitive
        v-if="profile !== 'narrow'"
        bordered
        class="pavp-admin-shell__sidebar"
        :collapsed="persistentNavigationCollapsed"
        :collapsed-width="collapsedNavigationWidth"
        collapse-mode="width"
        :content-style="persistentSiderContentStyle"
        data-shell-region="architecture-console-navigation"
        :native-scrollbar="true"
        :show-trigger="false"
        :width="expandedNavigationWidth"
      >
        <div
          ref="navigationChromeBridge"
          aria-hidden="true"
          class="pavp-admin-shell__navigation-chrome-bridge"
        />
        <nav
          aria-label="架构导航"
          class="pavp-admin-shell__persistent-navigation"
        >
          <div class="pavp-admin-shell__navigation-menu-stack">
            <div
              ref="expandedNavigationPlane"
              :aria-hidden="persistentNavigationCollapsed"
              class="pavp-admin-shell__navigation-plane pavp-admin-shell__navigation-plane--expanded"
              :inert="persistentNavigationCollapsed"
            >
              <PavpMenuPrimitive
                :accordion="false"
                class="pavp-admin-shell__menu"
                :collapsed="false"
                :collapsed-icon-size="navigationMenuIconSize"
                :collapsed-width="collapsedNavigationWidth"
                children-field="children"
                :dropdown-props="persistentNavigationDropdownProps"
                :expanded-keys="renderedExpandedNavigationGroupKeys"
                :icon-size="navigationMenuIconSize"
                mode="vertical"
                :node-props="persistentNavigationNodeProps"
                :options="navigationMenuOptions"
                :root-indent="navigationMenuRootIndent"
                :value="activeRouteName"
                @update:expanded-keys="handleNavigationExpandedKeysUpdate"
                @update:value="handleNavigationValueUpdate"
              />
            </div>
            <div
              ref="collapsedNavigationPlane"
              :aria-hidden="!persistentNavigationCollapsed"
              class="pavp-admin-shell__navigation-plane pavp-admin-shell__navigation-plane--collapsed"
              :inert="!persistentNavigationCollapsed"
            >
              <PavpMenuPrimitive
                :accordion="false"
                class="pavp-admin-shell__menu"
                :collapsed="true"
                :collapsed-icon-size="navigationMenuIconSize"
                :collapsed-width="collapsedNavigationWidth"
                children-field="children"
                :dropdown-props="persistentNavigationDropdownProps"
                :expanded-keys="renderedExpandedNavigationGroupKeys"
                :icon-size="navigationMenuIconSize"
                mode="vertical"
                :node-props="persistentNavigationNodeProps"
                :options="navigationMenuOptions"
                :root-indent="navigationMenuRootIndent"
                :value="activeRouteName"
                @update:expanded-keys="handleNavigationExpandedKeysUpdate"
                @update:value="handleNavigationValueUpdate"
              />
            </div>
          </div>

          <div
            v-if="profile === 'wide'"
            class="pavp-admin-shell__navigation-dock"
          >
            <button
              :aria-label="wideNavigationCollapseLabel"
              class="pavp-admin-shell__action pavp-admin-shell__collapse-action min-h-target-enhanced min-w-target-enhanced"
              type="button"
              @click="toggleWideNavigation"
            >
              <span class="pavp-admin-shell__collapse-foreground">
                <span
                  aria-hidden="true"
                  class="pavp-admin-shell__collapse-icon-stack"
                >
                  <span
                    ref="expandedCollapseIcon"
                    aria-hidden="true"
                    class="pavp-admin-shell__collapse-icon pavp-admin-shell__collapse-icon--expanded i-lucide-panel-left-close"
                  />
                  <span
                    ref="collapsedCollapseIcon"
                    aria-hidden="true"
                    class="pavp-admin-shell__collapse-icon pavp-admin-shell__collapse-icon--collapsed i-lucide-panel-left-open"
                  />
                </span>
                <span
                  ref="collapseLabel"
                  aria-hidden="true"
                  class="pavp-admin-shell__collapse-label"
                >
                  收起导航
                </span>
              </span>
            </button>
          </div>
        </nav>
      </PavpLayoutSiderPrimitive>

      <main
        ref="content"
        class="pavp-admin-shell__content min-w-admin-content"
        data-scroll-owner="architecture-console-content"
        data-shell-region="architecture-console-content"
        :inert="profile === 'narrow' && navigationOpen"
      >
        <div class="pavp-admin-shell__content-inner">
          <slot />
        </div>
      </main>
    </PavpLayoutPrimitive>

    <Teleport to="#pavp-overlay-root">
      <Transition name="pavp-admin-drawer">
        <div
          v-if="profile === 'narrow' && navigationOpen"
          class="pavp-admin-shell__drawer-layer"
          data-shell-region="architecture-console-navigation-overlay"
          @pointerdown="handleDrawerScrimPointerDown($event)"
        >
          <nav
            ref="drawerNavigation"
            aria-label="架构导航"
            aria-modal="true"
            class="pavp-admin-shell__drawer-navigation"
            role="dialog"
            tabindex="-1"
          >
            <div class="pavp-admin-shell__drawer-heading">
              <strong>架构导航</strong>
              <button
                ref="drawerClose"
                aria-label="关闭架构导航"
                class="pavp-admin-shell__action min-h-target-enhanced min-w-target-enhanced"
                type="button"
                @click="closeNavigation"
                @keydown="handleDrawerKeydown"
              >
                关闭
              </button>
            </div>
            <div
              v-for="group in navigation"
              :key="group.id"
              class="pavp-admin-shell__navigation-group"
            >
              <p class="pavp-admin-shell__navigation-group-label">
                {{ group.label }}
              </p>
              <button
                v-for="item in group.items"
                :key="item.routeName"
                :aria-current="item.routeName === activeRouteName ? 'page' : undefined"
                class="pavp-admin-shell__navigation-action min-h-target-enhanced min-w-target-enhanced"
                type="button"
                @click="navigate(item.routeName)"
                @keydown="handleDrawerKeydown"
              >
                <span
                  :class="resolveNavigationIconClass(item.iconClass)"
                  aria-hidden="true"
                  class="pavp-admin-shell__navigation-icon"
                />
                <span>{{ item.label }}</span>
              </button>
            </div>
          </nav>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.pavp-admin-shell {
  --pavp-admin-navigation-sider-content-overflow: hidden;
  --pavp-safe-area-top: env(safe-area-inset-top, 0px);
  --pavp-safe-area-right: env(safe-area-inset-right, 0px);
  --pavp-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --pavp-safe-area-left: env(safe-area-inset-left, 0px);
  position: relative;
  min-block-size: 100dvh;
  overflow: hidden;
  color: var(--ui-color-text-primary);
  background-color: var(--ui-admin-ambient-canvas);
  container-name: pavp-admin-shell;
  container-type: inline-size;
  isolation: isolate;
}

.pavp-admin-shell[data-pavp-admin-navigation-switch='active'] {
  --pavp-admin-navigation-sider-content-overflow: visible;
}

.pavp-admin-shell::before {
  position: absolute;
  z-index: var(--ui-z-base);
  background:
    radial-gradient(
      circle at 12% 4%,
      color-mix(in srgb, var(--ui-admin-ambient-light-primary) 20%, transparent),
      transparent 42%
    ),
    radial-gradient(
      circle at 88% 2%,
      color-mix(in srgb, var(--ui-admin-ambient-light-accent) 16%, transparent),
      transparent 38%
    ),
    linear-gradient(
      color-mix(in srgb, var(--ui-admin-ambient-grid) 14%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--ui-admin-ambient-grid) 14%, transparent) 1px,
      transparent 1px
    );
  background-size:
    auto,
    auto,
    var(--ui-space-section-block) var(--ui-space-section-block),
    var(--ui-space-section-block) var(--ui-space-section-block);
  content: '';
  inset: 0;
  pointer-events: none;
  animation: pavp-admin-ambient-drift calc(var(--ui-motion-duration) * 40) var(--ui-motion-easing)
    infinite alternate;
}

.pavp-admin-shell__header,
.pavp-admin-shell__layout {
  position: relative;
  z-index: var(--ui-z-base);
}

.pavp-admin-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-space-content-gap);
  padding-block-start: var(--pavp-safe-area-top);
  padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
    max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
  color: var(--ui-color-text-primary);
  background: var(--ui-material-chrome-background);
  box-shadow: var(--ui-admin-shadow-chrome);
}

.pavp-admin-shell__identity {
  display: flex;
  align-items: baseline;
  gap: var(--ui-space-content-gap);
}

.pavp-admin-shell__eyebrow {
  color: var(--ui-color-text-primary);
  font-weight: var(--ui-font-weight-title);
}

.pavp-admin-shell__layout {
  min-inline-size: 0;
  block-size: calc(100dvh - var(--ui-layout-admin-header-block-size) - var(--pavp-safe-area-top));
  background: transparent;
}

.pavp-admin-shell__sidebar {
  position: relative;
  z-index: var(--ui-z-overlay);
  flex: 0 0 auto;
  block-size: 100%;
  overflow: visible;
  background: var(--ui-material-chrome-background);
  box-shadow: var(--ui-admin-shadow-chrome);
}

.pavp-admin-shell__navigation-chrome-bridge {
  position: absolute;
  z-index: var(--ui-z-base);
  block-size: 100%;
  inline-size: var(--ui-layout-admin-sidebar-expanded-inline-size);
  background: var(--ui-material-chrome-background);
  box-shadow: var(--ui-admin-shadow-chrome);
  inset-block-start: 0;
  inset-inline-start: 0;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateX(0);
  transform-origin: left center;
}

.pavp-admin-shell__navigation-group {
  display: grid;
  gap: var(--ui-space-content-gap);
}

.pavp-admin-shell__persistent-navigation {
  position: relative;
  z-index: var(--ui-z-base);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  align-content: start;
  block-size: 100%;
  min-inline-size: 0;
  padding-block: var(--ui-space-content-gap);
}

.pavp-admin-shell__navigation-menu-stack {
  display: grid;
  min-block-size: 0;
  min-inline-size: 0;
}

.pavp-admin-shell__navigation-plane {
  grid-area: 1 / 1;
  min-block-size: 0;
  min-inline-size: 0;
}

.pavp-admin-shell__navigation-plane--expanded {
  inline-size: var(--ui-layout-admin-sidebar-expanded-inline-size);
}

.pavp-admin-shell__navigation-plane--collapsed {
  inline-size: var(--ui-layout-admin-sidebar-rail-inline-size);
}

.pavp-admin-shell[data-navigation-collapsed='false'] .pavp-admin-shell__navigation-plane--collapsed,
.pavp-admin-shell[data-navigation-collapsed='true'] .pavp-admin-shell__navigation-plane--expanded {
  visibility: hidden;
  pointer-events: none;
}

.pavp-admin-shell[data-pavp-admin-navigation-collapse-motion='ready'][data-pavp-admin-navigation-switch='active']
  .pavp-admin-shell__navigation-plane {
  visibility: visible;
}

.pavp-admin-shell__navigation-dock {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
  padding-block-start: var(--ui-space-content-gap);
  padding-inline: 0;
}

.pavp-admin-shell__navigation-dock::before {
  position: absolute;
  border-block-start-color: var(--ui-color-border-default);
  border-block-start-style: solid;
  border-block-start-width: var(--ui-admin-border-width);
  content: '';
  inset-block-start: 0;
  inset-inline: var(--ui-space-content-gap);
  pointer-events: none;
}

.pavp-admin-shell__collapse-action {
  display: flex;
  align-items: center;
  justify-content: start;
  flex: 0 0 auto;
  inline-size: 100%;
  overflow: visible;
  padding-inline: 0;
  text-align: start;
}

.pavp-admin-shell__collapse-foreground {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  box-sizing: border-box;
  inline-size: calc(
    var(--ui-layout-admin-sidebar-expanded-inline-size) - var(--ui-space-content-gap) * 2
  );
  min-inline-size: 0;
  gap: var(--ui-space-content-gap);
  padding-inline-start: var(--ui-space-page-inline);
  pointer-events: none;
}

.pavp-admin-shell__collapse-icon-stack,
.pavp-admin-shell__collapse-icon {
  block-size: var(--ui-font-size-body);
  inline-size: var(--ui-font-size-body);
}

.pavp-admin-shell__collapse-icon-stack {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
}

.pavp-admin-shell__collapse-icon {
  grid-area: 1 / 1;
  transform-origin: center;
}

.pavp-admin-shell__collapse-label {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: clip;
  white-space: nowrap;
}

.pavp-admin-shell:not([data-pavp-admin-navigation-collapse-motion='ready'])
  .pavp-admin-shell__collapse-icon--expanded,
.pavp-admin-shell:not([data-pavp-admin-navigation-collapse-motion='ready'])
  .pavp-admin-shell__collapse-label {
  visibility: visible;
  opacity: 1;
}

.pavp-admin-shell:not([data-pavp-admin-navigation-collapse-motion='ready'])
  .pavp-admin-shell__collapse-icon--collapsed,
.pavp-admin-shell[data-navigation-collapsed='true']:not(
    [data-pavp-admin-navigation-collapse-motion='ready']
  )
  .pavp-admin-shell__collapse-icon--expanded,
.pavp-admin-shell[data-navigation-collapsed='true']:not(
    [data-pavp-admin-navigation-collapse-motion='ready']
  )
  .pavp-admin-shell__collapse-label {
  visibility: hidden;
  opacity: 0;
}

.pavp-admin-shell[data-navigation-collapsed='true']:not(
    [data-pavp-admin-navigation-collapse-motion='ready']
  )
  .pavp-admin-shell__collapse-icon--collapsed {
  visibility: visible;
  opacity: 1;
}

.pavp-admin-shell__menu {
  min-block-size: 0;
  min-inline-size: 0;
}

.pavp-admin-shell__navigation-group-label {
  margin: 0;
  color: var(--ui-color-text-secondary);
  font-size: var(--ui-font-size-body);
  font-weight: var(--ui-font-weight-title);
  line-height: var(--ui-font-line-height-body);
}

.pavp-admin-shell__action,
.pavp-admin-shell__navigation-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-space-content-gap);
  border: 0;
  border-radius: var(--ui-radius-panel);
  color: var(--ui-color-text-primary);
  font-family: var(--ui-font-family-body);
  font-size: var(--ui-font-size-body);
  font-weight: var(--ui-font-weight-body);
  line-height: var(--ui-font-line-height-body);
  background: transparent;
  cursor: pointer;
  transition-duration: var(--ui-motion-duration);
  transition-property: color, background-color, box-shadow, transform;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-shell__navigation-action {
  position: relative;
  justify-content: start;
  inline-size: 100%;
  padding-inline: var(--ui-space-page-inline);
  text-align: start;
}

.pavp-admin-shell__navigation-icon {
  flex: 0 0 auto;
  block-size: var(--ui-font-size-body);
  inline-size: var(--ui-font-size-body);
}

.pavp-admin-shell__action:hover,
.pavp-admin-shell__navigation-action:hover {
  color: var(--ui-color-text-primary);
  background: var(--ui-admin-navigation-hover);
}

.pavp-admin-shell__action:active,
.pavp-admin-shell__navigation-action:active {
  transform: translateY(calc(var(--ui-space-content-gap) / 4));
}

.pavp-admin-shell__action:focus-visible,
.pavp-admin-shell__navigation-action:focus-visible {
  box-shadow: var(--ui-shadow-panel);
  outline: none;
}

.pavp-admin-shell__navigation-action[aria-current='page'] {
  color: var(--ui-color-text-primary);
  background: var(--ui-material-overlay-background);
}

.pavp-admin-shell__navigation-action::after {
  position: absolute;
  block-size: calc(var(--ui-space-content-gap) / 2);
  inline-size: calc(var(--ui-space-content-gap) / 2);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-admin-navigation-selected);
  content: '';
  inset-block-start: 50%;
  inset-inline-end: var(--ui-space-page-inline);
  opacity: 0;
  transform: translateY(-50%) scale(0.72);
  transform-origin: center;
  transition-duration: var(--ui-motion-duration);
  transition-property: opacity, transform;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-shell__navigation-action[aria-current='page']::after {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.pavp-admin-shell__content {
  position: relative;
  flex: 1 1 auto;
  inline-size: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  padding-block: var(--ui-space-section-block)
    max(var(--ui-space-section-block), var(--pavp-safe-area-bottom));
  padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
    max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
  background: var(--ui-admin-surface-content);
}

.pavp-admin-shell__content-inner {
  display: grid;
  gap: var(--ui-space-section-block);
  inline-size: 100%;
}

.pavp-admin-shell__drawer-navigation {
  display: grid;
  align-content: start;
  gap: var(--ui-space-section-block);
  block-size: 100%;
  inline-size: 100%;
  max-inline-size: var(--ui-layout-admin-drawer-maximum-inline-size);
  overflow: auto;
  padding-block: max(var(--ui-space-section-block), var(--pavp-safe-area-top))
    max(var(--ui-space-section-block), var(--pavp-safe-area-bottom));
  padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
    max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
  background: var(--ui-material-overlay-background);
  box-shadow: var(--ui-admin-shadow-overlay);
}

.pavp-admin-shell__drawer-layer {
  --pavp-safe-area-top: env(safe-area-inset-top, 0px);
  --pavp-safe-area-right: env(safe-area-inset-right, 0px);
  --pavp-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --pavp-safe-area-left: env(safe-area-inset-left, 0px);
  position: fixed;
  z-index: var(--ui-z-overlay);
  inset-block: 0;
  inset-inline: 0;
  background: var(--ui-color-scrim-viewport);
}

.pavp-admin-shell__drawer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-space-content-gap);
}

.pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation,
.pavp-admin-drawer-leave-active .pavp-admin-shell__drawer-navigation {
  transition-duration: var(--ui-motion-duration);
  transition-property: transform;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation,
.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation {
  transform: translateX(calc(var(--ui-layout-admin-drawer-maximum-inline-size) * -1));
}

@keyframes pavp-admin-ambient-drift {
  from {
    transform: translateX(calc(var(--ui-space-content-gap) * -1));
  }

  to {
    transform: translateX(var(--ui-space-content-gap));
  }
}

@media (forced-colors: active) {
  .pavp-admin-shell::before {
    display: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .pavp-admin-shell::before {
    opacity: 0;
  }

  .pavp-admin-shell__header,
  .pavp-admin-shell__sidebar,
  .pavp-admin-shell__navigation-action[aria-current='page'],
  .pavp-admin-shell__drawer-navigation {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>

<style>
[data-pavp-admin-navigation='persistent'] .pavp-admin-shell__route-selection-aura {
  position: absolute;
  z-index: var(--ui-z-base);
  display: block;
  block-size: calc(var(--ui-space-content-gap) * 2);
  inline-size: calc(var(--ui-space-content-gap) * 2);
  border-radius: var(--ui-radius-panel);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--ui-admin-navigation-selected) 24%, transparent) 0,
    transparent 72%
  );
  inset-block-start: 50%;
  inset-inline-end: var(--ui-space-content-gap);
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) scale(0.72);
  transform-origin: center center;
}

.pavp-admin-navigation-dropdown .pavp-admin-shell__route-selection-aura {
  display: none;
}

[data-pavp-admin-navigation='persistent'] .n-menu {
  padding-block-end: 0;
}

[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible {
  border-radius: var(--ui-radius-panel);
  box-shadow: var(--ui-admin-shadow-focus-ring);
  outline: none;
}

[data-pavp-admin-navigation='persistent'] .n-menu-item-content:active::before {
  background: var(--ui-admin-navigation-hover);
}

[data-pavp-admin-navigation='persistent']
  .n-menu-item-content:active
  :where(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header) {
  color: var(--ui-color-control-primary);
}

[data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,
.pavp-admin-navigation-dropdown .n-dropdown-option-body::after {
  position: absolute;
  z-index: var(--ui-z-base);
  block-size: calc(var(--ui-space-content-gap) * 2);
  inline-size: calc(var(--ui-space-content-gap) * 2);
  border-radius: var(--ui-radius-panel);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--ui-admin-navigation-selected) 24%, transparent) 0,
    transparent 72%
  );
  content: '';
  inset-block-start: 50%;
  inset-inline-end: var(--ui-space-content-gap);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) scale(0.72);
  transform-origin: center;
  transition-property: opacity, transform;
}

html[data-material='reduced']
  [data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__route-selection-aura,
html[data-material='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,
html[data-material='reduced'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after,
html[data-material='solid']
  [data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__route-selection-aura,
html[data-material='solid'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,
html[data-material='solid'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after {
  display: none;
}

.pavp-admin-shell:not([data-pavp-admin-navigation-route-motion='ready'])
  [data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__route-selection-aura {
  visibility: hidden;
  opacity: 0;
}

.pavp-admin-shell:not([data-pavp-admin-navigation-route-motion='ready'])
  [data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__route-selection-aura[data-selected='true'] {
  visibility: visible;
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

html[data-motion='reduced'] .pavp-admin-shell__navigation-action::after,
html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,
html[data-motion='reduced'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after,
html[data-motion='none'] .pavp-admin-shell__navigation-action::after,
html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,
html[data-motion='none'] .pavp-admin-navigation-dropdown .n-dropdown-option-body::after {
  transform: translateY(-50%) scale(1);
}

[data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__navigation-plane--collapsed
  .n-menu
  .n-menu-item-content--child-active::after,
.pavp-admin-navigation-dropdown
  .n-dropdown-option[aria-current='page']
  .n-dropdown-option-body::after {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

[data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__navigation-plane--collapsed
  .n-menu
  .n-menu-item-content--child-active::before,
[data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__navigation-plane--collapsed
  .n-menu
  .n-menu-item-content--child-active.n-menu-item-content--hover::before,
[data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__navigation-plane--collapsed
  .n-menu
  .n-menu-item-content--child-active:hover::before {
  background: color-mix(
    in srgb,
    var(--ui-admin-navigation-selected) 12%,
    var(--ui-material-overlay-background)
  );
}

.pavp-admin-navigation-dropdown.n-dropdown-menu {
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-width: var(--ui-admin-border-width);
  background: var(--ui-material-overlay-background);
  box-shadow: var(--ui-admin-shadow-overlay);
}

.pavp-admin-navigation-dropdown .n-dropdown-option-body--pending {
  box-shadow: var(--ui-admin-shadow-focus-ring);
}

.pavp-admin-navigation-dropdown .n-dropdown-option-body:active::before {
  background: var(--ui-admin-navigation-hover);
}

.pavp-admin-navigation-dropdown
  .n-dropdown-option-body:active
  :where(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label) {
  color: var(--ui-color-control-primary);
}

[data-pavp-admin-navigation='persistent'] .n-menu-item-content--selected:active::before,
[data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__navigation-plane--collapsed
  .n-menu
  .n-menu-item-content--child-active:active::before,
.pavp-admin-navigation-dropdown
  .n-dropdown-option[aria-current='page']
  .n-dropdown-option-body:active::before {
  background: color-mix(
    in srgb,
    var(--ui-admin-navigation-selected) 12%,
    var(--ui-material-overlay-background)
  );
}

html[data-material='adaptive'] .pavp-admin-shell__header,
html[data-material='adaptive'] .pavp-admin-shell__sidebar,
html[data-material='adaptive'] .pavp-admin-shell__navigation-chrome-bridge,
html[data-material='adaptive'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='adaptive'] .pavp-admin-shell__drawer-navigation,
html[data-material='adaptive'] .pavp-admin-navigation-dropdown {
  -webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
  backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
}

html[data-material='reduced'] .pavp-admin-shell__header,
html[data-material='reduced'] .pavp-admin-shell__sidebar,
html[data-material='reduced'] .pavp-admin-shell__navigation-chrome-bridge,
html[data-material='reduced'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='reduced'] .pavp-admin-shell__drawer-navigation,
html[data-material='reduced'] .pavp-admin-navigation-dropdown,
html[data-material='solid'] .pavp-admin-shell__header,
html[data-material='solid'] .pavp-admin-shell__sidebar,
html[data-material='solid'] .pavp-admin-shell__navigation-chrome-bridge,
html[data-material='solid'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='solid'] .pavp-admin-shell__drawer-navigation,
html[data-material='solid'] .pavp-admin-navigation-dropdown {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

html[data-material='reduced'] .pavp-admin-shell__header,
html[data-material='reduced'] .pavp-admin-shell__sidebar,
html[data-material='reduced'] .pavp-admin-shell__navigation-chrome-bridge,
html[data-material='reduced'] .pavp-admin-shell__drawer-navigation,
html[data-material='reduced'] .pavp-admin-navigation-dropdown {
  box-shadow: none;
}

html[data-motion='reduced'] .pavp-admin-shell::before,
html[data-motion='none'] .pavp-admin-shell::before {
  animation: none;
}

html[data-motion='reduced']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='reduced']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='reduced'] .pavp-admin-shell__sidebar,
html[data-motion='reduced'] .pavp-admin-shell__action,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action::after {
  transition-duration: calc(var(--ui-motion-duration) / 2);
}

html[data-motion='none']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='none']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='none'] .pavp-admin-shell__sidebar,
html[data-motion='none'] .pavp-admin-shell__action,
html[data-motion='none'] .pavp-admin-shell__navigation-action,
html[data-motion='none'] .pavp-admin-shell__navigation-action::after {
  transition: none;
}

html[data-motion='reduced'] .pavp-admin-shell__action:active,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action:active {
  transform: translateY(calc(var(--ui-space-content-gap) / 8));
}

html[data-motion='reduced']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from
  .pavp-admin-shell__drawer-navigation,
html[data-motion='reduced']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to
  .pavp-admin-shell__drawer-navigation {
  transform: translateX(calc(var(--ui-space-content-gap) * -1));
}

html[data-motion='none']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from
  .pavp-admin-shell__drawer-navigation,
html[data-motion='none']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to
  .pavp-admin-shell__drawer-navigation {
  transform: none;
}

html[data-motion='none'] .pavp-admin-shell__action:active,
html[data-motion='none'] .pavp-admin-shell__navigation-action:active {
  transform: none;
}

html[data-motion='full']
  .pavp-admin-shell[data-pavp-admin-navigation-collapse-motion='ready'][data-pavp-admin-navigation-switch='active']
  .pavp-admin-shell__sidebar {
  -webkit-backdrop-filter: none;
  background: transparent;
  backdrop-filter: none;
  box-shadow: none;
}

html[data-motion='full']
  .pavp-admin-shell[data-pavp-admin-navigation-collapse-motion='ready'][data-pavp-admin-navigation-switch='active']
  .n-layout-sider__border {
  opacity: 0;
  transition: none;
}

@media (forced-colors: active) {
  [data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible,
  .pavp-admin-navigation-dropdown .n-dropdown-option-body--pending {
    outline: var(--ui-admin-border-focus);
    outline-offset: var(--ui-admin-focus-outline-offset);
  }

  [data-pavp-admin-navigation='persistent']
    .pavp-admin-shell__navigation-plane--expanded
    .pavp-admin-shell__menu.n-menu
    .n-menu-item-content.n-menu-item-content--selected::before,
  [data-pavp-admin-navigation='persistent']
    .pavp-admin-shell__navigation-plane--collapsed
    .pavp-admin-shell__menu.n-menu
    .n-menu-item-content.n-menu-item-content--child-active::before,
  .pavp-admin-navigation-dropdown.n-dropdown-menu
    .n-dropdown-option[aria-current='page']
    .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)::before {
    background: var(--ui-color-action-primary);
  }

  [data-pavp-admin-navigation='persistent']
    .pavp-admin-shell__navigation-plane--expanded
    .pavp-admin-shell__menu.n-menu
    .n-menu-item-content.n-menu-item-content--selected
    :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header),
  [data-pavp-admin-navigation='persistent']
    .pavp-admin-shell__navigation-plane--collapsed
    .pavp-admin-shell__menu.n-menu
    .n-menu-item-content.n-menu-item-content--child-active
    :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header),
  .pavp-admin-navigation-dropdown.n-dropdown-menu
    .n-dropdown-option[aria-current='page']
    .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)
    :is(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label) {
    color: var(--ui-color-text-on-action);
  }

  [data-pavp-admin-navigation='persistent'] .pavp-admin-shell__route-selection-aura,
  [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,
  .pavp-admin-navigation-dropdown .n-dropdown-option-body::after {
    display: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  [data-pavp-admin-navigation='persistent'] .n-layout-sider,
  .pavp-admin-navigation-dropdown {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  [data-pavp-admin-navigation='persistent'] .pavp-admin-shell__route-selection-aura,
  [data-pavp-admin-navigation='persistent'] .n-menu-item-content::after,
  .pavp-admin-navigation-dropdown .n-dropdown-option-body::after {
    display: none;
  }
}
</style>
