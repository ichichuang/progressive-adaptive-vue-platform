<script setup lang="ts">
import {
  layoutRegistry,
  tokens,
  type LayoutProfileId,
  type LayoutRegistryRecord,
} from '@platform/design-system'
import { computed, h, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { PavpButtonPrimitive } from '../adapters/naive/naive-button'
import { PavpIconPrimitive } from '../adapters/naive/naive-icon'
import { PavpLayoutPrimitive, PavpLayoutSiderPrimitive } from '../adapters/naive/naive-layout'
import {
  definePavpMenuNodeProps,
  PavpMenuPrimitive,
  type PavpMenuDropdownProps,
  type PavpMenuOption,
} from '../adapters/naive/naive-menu'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { PavpTooltipPrimitive } from '../adapters/naive/naive-tooltip'
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
const navigationTrigger = ref<HTMLButtonElement>()
const drawerNavigation = ref<HTMLElement>()
const drawerClose = ref<HTMLButtonElement>()
const profile = ref<LayoutProfileId>('narrow')
const navigationOpen = ref(false)
const wideNavigationCollapsed = ref(false)
const currentRootFontSize = ref(readRootFontSize())
const collapsedNavigationWidth = computed(() => railRemMagnitude * currentRootFontSize.value)
const persistentNavigationCollapsed = computed(() => {
  if (profile.value === 'regular') {
    return true
  }

  return profile.value === 'wide' && wideNavigationCollapsed.value
})
const expandedNavigationWidth = tokens['layout.admin.sidebar.expanded-inline-size']
const persistentLayoutContentStyle = Object.freeze({ overflow: 'visible' })
const persistentSiderContentStyle = Object.freeze({ overflow: 'hidden' })
const wideNavigationCollapseLabel = computed(() =>
  wideNavigationCollapsed.value ? '展开导航' : '收起导航',
)
const navigationGroupKeys = computed(() =>
  props.navigation.map((group) => `navigation-group:${group.id}`),
)
const expandedNavigationGroupKeys = ref<string[]>([...navigationGroupKeys.value])
const validExpandedNavigationGroupKeys = computed(() => {
  const admittedGroupKeys = new Set(navigationGroupKeys.value)

  return expandedNavigationGroupKeys.value.filter((key) => admittedGroupKeys.has(key))
})
const allNavigationGroupsExpanded = computed(() =>
  navigationGroupKeys.value.every((key) => validExpandedNavigationGroupKeys.value.includes(key)),
)
const navigationGroupsToggleLabel = computed(() =>
  allNavigationGroupsExpanded.value ? '折叠全部菜单' : '展开全部菜单',
)
let currentShellInlineSize = 0
let resizeObserver: ResizeObserver | undefined
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
        pavpNavigationKind: 'route',
        pavpRouteName: item.routeName,
      })),
    } satisfies PavpMenuOption
  }),
)

function toggleExpandedNavigationGroup(groupKey: string): void {
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

    event.currentTarget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
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
  trigger: 'hover',
}) satisfies PavpMenuDropdownProps

function handleNavigationValueUpdate(value: string | number): void {
  if (typeof value === 'string') {
    navigate(value)
  }
}

function handleNavigationExpandedKeysUpdate(keys: (string | number)[]): void {
  const admittedGroupKeys = new Set(navigationGroupKeys.value)
  expandedNavigationGroupKeys.value = keys.filter(
    (key): key is string => typeof key === 'string' && admittedGroupKeys.has(key),
  )
}

function toggleWideNavigation(): void {
  wideNavigationCollapsed.value = !wideNavigationCollapsed.value
}

function toggleAllNavigationGroups(): void {
  expandedNavigationGroupKeys.value = allNavigationGroupsExpanded.value
    ? []
    : [...navigationGroupKeys.value]
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
})

onBeforeUnmount(() => {
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
  () => props.activeRouteName,
  (activeRouteName, previousActiveRouteName) => {
    if (activeRouteName === previousActiveRouteName) {
      return
    }

    const activeGroup = props.navigation.find((group) =>
      group.items.some((item) => item.routeName === activeRouteName),
    )

    if (activeGroup === undefined) {
      return
    }

    const groupKey = navigationGroupKey(activeGroup.id)

    if (!validExpandedNavigationGroupKeys.value.includes(groupKey)) {
      expandedNavigationGroupKeys.value = [...validExpandedNavigationGroupKeys.value, groupKey]
    }
  },
)

watch(
  () => appearance.value.fontScale,
  () => {
    updateResponsiveNavigationMetrics()
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
      <div
        v-if="profile === 'wide'"
        class="pavp-admin-shell__header-actions flex items-center gap-content-gap"
      >
        <PavpTooltipPrimitive
          v-if="!persistentNavigationCollapsed"
          class="pavp-admin-shell__header-action-tooltip"
          placement="bottom-end"
          :show-arrow="false"
          to="#pavp-overlay-root"
        >
          <template #trigger>
            <PavpButtonPrimitive
              :aria-label="navigationGroupsToggleLabel"
              :bordered="false"
              attr-type="button"
              circle
              class="pavp-admin-shell__header-action shrink-0 min-h-target-enhanced min-w-target-enhanced"
              data-pavp-admin-navigation-groups-control="header-trailing"
              type="tertiary"
              @click="toggleAllNavigationGroups"
            >
              <template #icon>
                <span
                  class="pavp-admin-shell__header-action-icon-stack inline-grid items-center justify-center"
                  data-pavp-admin-navigation-icon-stack="groups"
                >
                  <PavpIconPrimitive
                    :class="{
                      'pavp-admin-shell__header-action-icon-state--active':
                        allNavigationGroupsExpanded,
                    }"
                    aria-hidden="true"
                    class="pavp-admin-shell__header-action-icon-state i-lucide-list-collapse col-start-1 row-start-1"
                    data-pavp-admin-navigation-icon-state="groups-expanded"
                  />
                  <PavpIconPrimitive
                    :class="{
                      'pavp-admin-shell__header-action-icon-state--active':
                        !allNavigationGroupsExpanded,
                    }"
                    aria-hidden="true"
                    class="pavp-admin-shell__header-action-icon-state i-lucide-list-tree col-start-1 row-start-1"
                    data-pavp-admin-navigation-icon-state="groups-collapsed"
                  />
                </span>
              </template>
            </PavpButtonPrimitive>
          </template>
          {{ navigationGroupsToggleLabel }}
        </PavpTooltipPrimitive>
        <PavpTooltipPrimitive
          class="pavp-admin-shell__header-action-tooltip"
          placement="bottom-end"
          :show-arrow="false"
          to="#pavp-overlay-root"
        >
          <template #trigger>
            <PavpButtonPrimitive
              :aria-label="wideNavigationCollapseLabel"
              :bordered="false"
              attr-type="button"
              circle
              class="pavp-admin-shell__header-action shrink-0 min-h-target-enhanced min-w-target-enhanced"
              data-pavp-admin-navigation-collapse-control="header-trailing"
              type="tertiary"
              @click="toggleWideNavigation"
            >
              <template #icon>
                <span
                  class="pavp-admin-shell__header-action-icon-stack inline-grid items-center justify-center"
                  data-pavp-admin-navigation-icon-stack="sidebar"
                >
                  <PavpIconPrimitive
                    :class="{
                      'pavp-admin-shell__header-action-icon-state--active':
                        !wideNavigationCollapsed,
                    }"
                    aria-hidden="true"
                    class="pavp-admin-shell__header-action-icon-state i-lucide-panel-left-close col-start-1 row-start-1"
                    data-pavp-admin-navigation-icon-state="sidebar-expanded"
                  />
                  <PavpIconPrimitive
                    :class="{
                      'pavp-admin-shell__header-action-icon-state--active': wideNavigationCollapsed,
                    }"
                    aria-hidden="true"
                    class="pavp-admin-shell__header-action-icon-state i-lucide-panel-left-open col-start-1 row-start-1"
                    data-pavp-admin-navigation-icon-state="sidebar-collapsed"
                  />
                </span>
              </template>
            </PavpButtonPrimitive>
          </template>
          {{ wideNavigationCollapseLabel }}
        </PavpTooltipPrimitive>
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
        <nav
          aria-label="架构导航"
          class="pavp-admin-shell__persistent-navigation"
        >
          <PavpMenuPrimitive
            :accordion="false"
            class="pavp-admin-shell__menu"
            :collapsed="persistentNavigationCollapsed"
            :collapsed-width="collapsedNavigationWidth"
            children-field="children"
            :dropdown-props="persistentNavigationDropdownProps"
            :expanded-keys="validExpandedNavigationGroupKeys"
            mode="vertical"
            :node-props="persistentNavigationNodeProps"
            :options="navigationMenuOptions"
            :value="activeRouteName"
            @update:expanded-keys="handleNavigationExpandedKeysUpdate"
            @update:value="handleNavigationValueUpdate"
          />
        </nav>
      </PavpLayoutSiderPrimitive>

      <main
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
  overflow: hidden;
  background: var(--ui-material-chrome-background);
  box-shadow: var(--ui-admin-shadow-chrome);
}

.pavp-admin-shell__navigation-group {
  display: grid;
  gap: var(--ui-space-content-gap);
}

.pavp-admin-shell__persistent-navigation {
  position: relative;
  z-index: var(--ui-z-base);
  min-inline-size: 0;
  padding-block: var(--ui-space-content-gap);
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
[data-pavp-admin-navigation='persistent'] .n-menu {
  padding-block-end: 0;
}

[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible {
  border-radius: var(--ui-radius-panel);
  box-shadow: var(--ui-admin-shadow-focus-ring);
  outline: none;
}

[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,
.pavp-admin-navigation-dropdown .n-dropdown-option-body::before,
.pavp-admin-shell__header-action-icon-state {
  opacity: 0;
  transform: scale(0.98);
  transform-origin: center;
  transition-duration: var(--ui-motion-duration);
  transition-property: background-color, opacity, transform;
  transition-timing-function: var(--ui-motion-easing);
}

[data-pavp-admin-navigation='persistent'] .n-menu-item-content--hover::before,
[data-pavp-admin-navigation='persistent'] .n-menu-item-content:hover::before,
[data-pavp-admin-navigation='persistent'] .n-menu-item-content--selected::before,
.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation='persistent']
  .n-menu-item-content--child-active::before,
.pavp-admin-navigation-dropdown .n-dropdown-option-body--pending::before,
.pavp-admin-navigation-dropdown .n-dropdown-option-body--active::before,
.pavp-admin-navigation-dropdown
  .n-dropdown-option[aria-current='page']
  .n-dropdown-option-body::before,
.pavp-admin-shell__header-action-icon-state--active {
  opacity: 1;
  transform: scale(1);
}

[data-pavp-admin-navigation='persistent']
  .n-menu-item-content:active
  :where(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header) {
  color: var(--ui-color-control-primary);
}

.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation='persistent']
  .n-menu-item-content--child-active::before,
.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation='persistent']
  .n-menu-item-content--child-active.n-menu-item-content--hover::before,
.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation='persistent']
  .n-menu-item-content--child-active:hover::before {
  background: var(--n-item-color-active-collapsed);
}

.pavp-admin-navigation-dropdown .n-dropdown-option-body--active::before,
.pavp-admin-navigation-dropdown
  .n-dropdown-option[aria-current='page']
  .n-dropdown-option-body::before {
  background: var(--n-option-color-active);
}

.pavp-admin-navigation-dropdown.n-dropdown-menu {
  box-sizing: border-box;
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-width: var(--ui-admin-border-width);
}

.pavp-admin-navigation-dropdown
  .n-dropdown-option-body:active
  :where(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label) {
  color: var(--ui-color-control-primary);
}

html[data-material='adaptive'] .pavp-admin-shell__header,
html[data-material='adaptive'] .pavp-admin-shell__sidebar,
html[data-material='adaptive'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='adaptive'] .pavp-admin-shell__drawer-navigation,
html[data-material='adaptive'] .pavp-admin-navigation-dropdown {
  -webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
  backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
}

html[data-material='reduced'] .pavp-admin-shell__header,
html[data-material='reduced'] .pavp-admin-shell__sidebar,
html[data-material='reduced'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='reduced'] .pavp-admin-shell__drawer-navigation,
html[data-material='reduced'] .pavp-admin-navigation-dropdown,
html[data-material='solid'] .pavp-admin-shell__header,
html[data-material='solid'] .pavp-admin-shell__sidebar,
html[data-material='solid'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='solid'] .pavp-admin-shell__drawer-navigation,
html[data-material='solid'] .pavp-admin-navigation-dropdown {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

html[data-material='reduced'] .pavp-admin-shell__header,
html[data-material='reduced'] .pavp-admin-shell__sidebar,
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
  transform: none;
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

@media (forced-colors: active) {
  [data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: var(--ui-admin-focus-outline-offset);
  }

  [data-pavp-admin-navigation='persistent'] .n-menu-item-content--selected::before,
  .pavp-admin-shell[data-navigation-collapsed='true']
    [data-pavp-admin-navigation='persistent']
    .n-menu-item-content--child-active::before,
  .pavp-admin-navigation-dropdown.n-dropdown-menu
    .n-dropdown-option[aria-current='page']
    .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)::before {
    background-color: var(--ui-color-action-primary);
  }

  [data-pavp-admin-navigation='persistent']
    .n-menu-item-content--selected
    :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header),
  .pavp-admin-shell[data-navigation-collapsed='true']
    [data-pavp-admin-navigation='persistent']
    .n-menu-item-content--child-active
    :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header),
  .pavp-admin-navigation-dropdown.n-dropdown-menu
    .n-dropdown-option[aria-current='page']
    .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)
    :is(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label) {
    color: var(--ui-color-text-on-action);
  }
}

@media (prefers-reduced-transparency: reduce) {
  [data-pavp-admin-navigation='persistent'] .n-layout-sider,
  .pavp-admin-navigation-dropdown {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
