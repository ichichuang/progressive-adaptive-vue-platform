<script setup lang="ts">
import {
  layoutRegistry,
  tokens,
  type LayoutProfileId,
  type LayoutRegistryRecord,
} from '@platform/design-system'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const shell = ref<HTMLElement>()
const content = ref<HTMLElement>()
const navigationTrigger = ref<HTMLButtonElement>()
const drawerNavigation = ref<HTMLElement>()
const drawerClose = ref<HTMLButtonElement>()
const profile = ref<LayoutProfileId>('narrow')
const navigationOpen = ref(false)
const sidebarInlineSize = computed(() =>
  profile.value === 'wide'
    ? tokens['layout.admin.sidebar.expanded-inline-size']
    : tokens['layout.admin.sidebar.rail-inline-size'],
)
let resizeObserver: ResizeObserver | undefined
let rootOverflow = ''
let bodyOverflow = ''
let focusReturnTarget: HTMLElement | null = null

function closeNavigation(): void {
  navigationOpen.value = false
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

function updateProfile(inlineSize: number): void {
  profile.value = resolveAdminShellProfile({
    inlineSize,
    rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
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
  updateProfile(target.getBoundingClientRect().width)
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]

    if (entry !== undefined) {
      updateProfile(entry.borderBoxSize[0]?.inlineSize ?? entry.contentRect.width)
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
</script>

<template>
  <div
    ref="shell"
    class="pavp-admin-shell"
    :data-layout-profile="profile"
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

    <div class="pavp-admin-shell__layout">
      <aside
        v-if="profile !== 'narrow'"
        class="pavp-admin-shell__sidebar"
        data-shell-region="architecture-console-navigation"
        :style="{ inlineSize: sidebarInlineSize }"
      >
        <nav
          aria-label="架构导航"
          :class="profile === 'wide' ? 'pavp-admin-shell__navigation' : 'pavp-admin-shell__rail'"
        >
          <div
            v-for="group in navigation"
            :key="group.id"
            class="pavp-admin-shell__navigation-group"
          >
            <p
              v-if="profile === 'wide'"
              class="pavp-admin-shell__navigation-group-label"
            >
              {{ group.label }}
            </p>
            <div
              v-for="item in group.items"
              :key="item.routeName"
              class="pavp-admin-shell__navigation-item"
            >
              <button
                :aria-current="item.routeName === activeRouteName ? 'page' : undefined"
                :aria-describedby="
                  profile === 'regular' ? `rail-tooltip-${item.routeName}` : undefined
                "
                :aria-label="profile === 'regular' ? item.label : undefined"
                class="pavp-admin-shell__navigation-action min-h-target-enhanced min-w-target-enhanced"
                type="button"
                @click="navigate(item.routeName)"
              >
                <span
                  :class="resolveNavigationIconClass(item.iconClass)"
                  aria-hidden="true"
                  class="pavp-admin-shell__navigation-icon"
                />
                <span v-if="profile === 'wide'">{{ item.label }}</span>
              </button>
              <span
                v-if="profile === 'regular'"
                :id="`rail-tooltip-${item.routeName}`"
                class="pavp-admin-shell__rail-tooltip"
                role="tooltip"
              >
                {{ item.label }}
              </span>
            </div>
          </div>
        </nav>
      </aside>

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
    </div>

    <Teleport to="#pavp-overlay-root">
      <Transition name="pavp-admin-drawer">
        <div
          v-if="profile === 'narrow' && navigationOpen"
          class="pavp-admin-shell__drawer-layer"
          data-shell-region="architecture-console-navigation-overlay"
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
  display: flex;
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
  transition-duration: var(--ui-motion-duration);
  transition-property: inline-size;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-shell__navigation,
.pavp-admin-shell__rail,
.pavp-admin-shell__navigation-group {
  display: grid;
  gap: var(--ui-space-content-gap);
}

.pavp-admin-shell__navigation,
.pavp-admin-shell__rail {
  align-content: start;
  padding-block: var(--ui-space-section-block);
}

.pavp-admin-shell__navigation {
  padding-inline: var(--ui-space-page-inline);
}

.pavp-admin-shell__rail {
  justify-content: center;
}

.pavp-admin-shell__navigation-group-label {
  margin: 0;
  color: var(--ui-color-text-secondary);
  font-size: var(--ui-font-size-body);
  font-weight: var(--ui-font-weight-title);
  line-height: var(--ui-font-line-height-body);
}

.pavp-admin-shell__navigation-item {
  position: relative;
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

.pavp-admin-shell__rail .pavp-admin-shell__navigation-action {
  justify-content: center;
  padding-inline: 0;
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

.pavp-admin-shell__navigation-action::before {
  position: absolute;
  block-size: calc(100% - var(--ui-space-content-gap));
  inline-size: calc(var(--ui-space-content-gap) / 2);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-admin-navigation-selected);
  content: '';
  inset-block-start: calc(var(--ui-space-content-gap) / 2);
  inset-inline-start: 0;
  transform: scaleY(0);
  transform-origin: center;
  transition-duration: var(--ui-motion-duration);
  transition-property: transform;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-shell__navigation-action[aria-current='page']::before {
  transform: scaleY(1);
}

.pavp-admin-shell__rail-tooltip {
  position: absolute;
  z-index: var(--ui-z-overlay);
  display: none;
  min-inline-size: max-content;
  inset-block-start: 0;
  inset-inline-start: calc(100% + var(--ui-space-content-gap));
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  color: var(--ui-color-text-primary);
  background: var(--ui-material-overlay-background);
  box-shadow: var(--ui-admin-shadow-overlay);
  white-space: nowrap;
}

:where(.pavp-admin-shell__navigation-item:hover, .pavp-admin-shell__navigation-item:focus-within)
  .pavp-admin-shell__rail-tooltip {
  display: block;
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
  block-size: 100dvh;
  inline-size: min(100%, var(--ui-layout-admin-drawer-maximum-inline-size));
  inset-block: 0;
  inset-inline-start: 0;
}

.pavp-admin-shell__drawer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-space-content-gap);
}

.pavp-admin-drawer-enter-active,
.pavp-admin-drawer-leave-active {
  transition-duration: var(--ui-motion-duration);
  transition-property: transform;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-drawer-enter-from,
.pavp-admin-drawer-leave-to {
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
  .pavp-admin-shell__rail-tooltip,
  .pavp-admin-shell__drawer-navigation {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>

<style>
html[data-material='adaptive'] .pavp-admin-shell__header,
html[data-material='adaptive'] .pavp-admin-shell__sidebar,
html[data-material='adaptive'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='adaptive'] .pavp-admin-shell__rail-tooltip,
html[data-material='adaptive'] .pavp-admin-shell__drawer-navigation {
  -webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
  backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
}

html[data-material='reduced'] .pavp-admin-shell__header,
html[data-material='reduced'] .pavp-admin-shell__sidebar,
html[data-material='reduced'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='reduced'] .pavp-admin-shell__rail-tooltip,
html[data-material='reduced'] .pavp-admin-shell__drawer-navigation,
html[data-material='solid'] .pavp-admin-shell__header,
html[data-material='solid'] .pavp-admin-shell__sidebar,
html[data-material='solid'] .pavp-admin-shell__navigation-action[aria-current='page'],
html[data-material='solid'] .pavp-admin-shell__rail-tooltip,
html[data-material='solid'] .pavp-admin-shell__drawer-navigation {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

html[data-material='reduced'] .pavp-admin-shell__header,
html[data-material='reduced'] .pavp-admin-shell__sidebar,
html[data-material='reduced'] .pavp-admin-shell__rail-tooltip,
html[data-material='reduced'] .pavp-admin-shell__drawer-navigation {
  box-shadow: none;
}

html[data-motion='reduced'] .pavp-admin-shell::before,
html[data-motion='none'] .pavp-admin-shell::before {
  animation: none;
}

html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active,
html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active,
html[data-motion='reduced'] .pavp-admin-shell__sidebar,
html[data-motion='reduced'] .pavp-admin-shell__action,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action::before {
  transition-duration: calc(var(--ui-motion-duration) / 2);
}

html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active,
html[data-motion='none'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active,
html[data-motion='none'] .pavp-admin-shell__sidebar,
html[data-motion='none'] .pavp-admin-shell__action,
html[data-motion='none'] .pavp-admin-shell__navigation-action,
html[data-motion='none'] .pavp-admin-shell__navigation-action::before {
  transition: none;
}

html[data-motion='reduced'] .pavp-admin-shell__action:active,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action:active {
  transform: translateY(calc(var(--ui-space-content-gap) / 8));
}

html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from,
html[data-motion='reduced'] .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to {
  transform: translateX(calc(var(--ui-space-content-gap) * -1));
}

html[data-motion='none'] .pavp-admin-shell__action:active,
html[data-motion='none'] .pavp-admin-shell__navigation-action:active {
  transform: none;
}
</style>
