<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { AnimatePresence, M, m } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import {
  createMotionFeatureRuntime,
  createMotionInterruptionOwner,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
} from './motion-feature-runtime'

import { projectMotionPolicy } from './motion-policy'

import type { UiWorkspaceTab } from '../../components/contracts'
import { NDropdown, type DropdownOption } from 'naive-ui/es/dropdown'
import { NButton } from 'naive-ui/es/button'
import UiScrollArea from '../../components/UiScrollArea.vue'
import type { UiScrollController } from '../../components/scroll-contracts'

defineOptions({ name: 'WorkspaceTabsSurface' })

const props = defineProps<{
  readonly motion: EffectiveAppearanceState['motion']
  readonly items: readonly UiWorkspaceTab[]
  readonly activeId: string | null
  readonly label: string
  readonly previousLabel: string
  readonly nextLabel: string
  readonly refreshLabel: string
  readonly closeLabel: string
  readonly panelId: string
}>()
const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
  refresh: [id: string]
  viewport: [element: HTMLElement | null]
}>()
const activeIndex = computed(() =>
  props.activeId === null ? -1 : props.items.findIndex((item) => item.id === props.activeId),
)
const previousTab = computed(() =>
  activeIndex.value > 0 ? props.items[activeIndex.value - 1] : undefined,
)
const nextTab = computed(() =>
  activeIndex.value < 0 ? undefined : props.items[activeIndex.value + 1],
)
const strip = ref<HTMLElement>()
const viewport = ref<HTMLElement>()
const rovingId = ref<string | null>(null)
const tabStopId = computed(() =>
  props.items.some((item) => item.id === rovingId.value)
    ? rovingId.value
    : (props.items[activeIndex.value]?.id ?? props.items[0]?.id),
)
let scrollController: UiScrollController | null = null
let initialReveal = true
function connectScrollController(controller: UiScrollController | null): void {
  scrollController = controller
  if (controller === null || !initialReveal) return
  initialReveal = false
  const button = props.activeId === null ? null : findTabButton(props.activeId)
  if (button !== null) revealTab(button, 'instant')
}
const groupId = `pavp-workspace-${useId()}`
const menuId = `${groupId}-menu`
let contextCaller: HTMLElement | null = null
const contextMenu = ref<{ readonly id: string | null; readonly x: number; readonly y: number }>({
  id: null,
  x: 0,
  y: 0,
})
const contextItem = computed(() => props.items.find((item) => item.id === contextMenu.value.id))
const contextOptions = computed<DropdownOption[]>(() => [
  {
    key: 'refresh',
    label: props.refreshLabel,
    disabled: contextItem.value?.refreshable !== true,
    props: {
      role: 'menuitem',
      tabindex: -1,
      'aria-disabled': contextItem.value?.refreshable !== true,
    },
  },
  {
    key: 'close',
    label: props.closeLabel,
    disabled: contextItem.value?.closable !== true,
    props: {
      role: 'menuitem',
      tabindex: -1,
      'aria-disabled': contextItem.value?.closable !== true,
    },
  },
])
function closeContextMenu(): void {
  // Keep the anchor stable while the dropdown finishes its leave transition.
  if (contextMenu.value.id !== null) contextMenu.value = { ...contextMenu.value, id: null }
}
function findTabButton(id: string): HTMLElement | null {
  const button = document.getElementById(`${id}-tab`)
  return button !== null &&
    strip.value?.contains(button) === true &&
    button.closest('[inert]') === null
    ? button
    : null
}
function openContextMenu(id: string, x: number, y: number, caller?: HTMLElement): void {
  const button = findTabButton(id)
  if (button === null || !props.items.some((item) => item.id === id)) return
  contextCaller = caller ?? button
  contextMenu.value = { id, x, y }
}
function restoreContextCaller(): void {
  const menu = document.getElementById(menuId)
  if (
    menu?.contains(document.activeElement) === true &&
    contextCaller?.isConnected === true &&
    contextCaller.closest('[inert]') === null
  )
    contextCaller.focus({ preventScroll: true })
}
function contextMenuOptions(menu: HTMLElement): HTMLElement[] {
  return Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
  )
}
function isComposingKey(event: KeyboardEvent): boolean {
  // IME boundary keydowns can clear isComposing before the confirming key arrives.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- 229 is the remaining IME compatibility signal.
  return event.isComposing || event.keyCode === 229
}

async function handleContextMenuKeydown(id: string, event: KeyboardEvent): Promise<void> {
  if (event.defaultPrevented || isComposingKey(event)) return
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
  const button = findTabButton(id)
  if (button === null || !(event.target instanceof HTMLElement)) return
  event.preventDefault()
  event.stopPropagation()
  const caller = event.target
  const bounds = button.getBoundingClientRect()
  openContextMenu(id, bounds.left, bounds.bottom, caller)
  const opening = contextMenu.value
  await nextTick()
  // Opening explicitly from the keyboard owns focus; later route/prop updates do not.
  if (contextMenu.value !== opening || document.activeElement !== caller) return
  const menu = document.getElementById(menuId)
  if (menu !== null) (contextMenuOptions(menu)[0] ?? menu).focus({ preventScroll: true })
}
function handleMenuKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || isComposingKey(event)) return
  const menu = event.currentTarget
  if (!(menu instanceof HTMLElement) || contextMenu.value.id === null) return
  if (event.key === 'Tab') {
    // Resume native traversal at the caller, not at the teleported overlay root.
    restoreContextCaller()
    closeContextMenu()
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    restoreContextCaller()
    closeContextMenu()
    return
  }
  const options = contextMenuOptions(menu)
  const index = options.findIndex((option) => option === document.activeElement)
  let target: HTMLElement | undefined
  if (event.key === 'ArrowDown') target = options[(index + 1) % options.length]
  else if (event.key === 'ArrowUp') target = options[(index - 1 + options.length) % options.length]
  else if (event.key === 'Home') target = options[0]
  else if (event.key === 'End') target = options.at(-1)
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    options[index]?.click()
    return
  } else return
  event.preventDefault()
  event.stopPropagation()
  target?.focus({ preventScroll: true })
}
function updateContextMenu(show: boolean): void {
  if (!show) dismissContextMenu()
}
function dismissContextMenu(event?: MouseEvent): void {
  const item = contextItem.value
  // evtd reports outside mouseup after contextmenu has retargeted this controlled menu.
  // Only the current, live tab inside this strip owns that right-button gesture.
  if (
    event?.type === 'mouseup' &&
    event.button === 2 &&
    item !== undefined &&
    event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          target.matches('.pavp-workspace-tabs__item') &&
          strip.value?.contains(target) === true &&
          target.closest('[inert]') === null &&
          target.querySelector('[role="tab"]')?.id === `${item.id}-tab`,
      )
  )
    return
  closeContextMenu()
}
function selectContextAction(key: string | number): void {
  const item = contextItem.value
  restoreContextCaller()
  closeContextMenu()
  if (item === undefined) return
  if (key === 'refresh' && item.refreshable) emit('refresh', item.id)
  else if (key === 'close' && item.closable) emit('close', item.id)
}
watch(
  contextItem,
  (item) => {
    if (item === undefined) closeContextMenu()
  },
  { flush: 'sync' },
)
watch(() => props.activeId, closeContextMenu, { flush: 'sync' })
onBeforeUnmount(closeContextMenu)
const { dispose, features, featureReady, startAfterStableMount } = createMotionFeatureRuntime()
const policy = computed(() => projectMotionPolicy(props.motion, featureReady.value))
const full = computed(() => policy.value.movement)
const transition = computed(() => policy.value.workspace.transition)
const resting = projectMotionPolicy('none').workspace.resting
const leaving = computed(() => policy.value.workspace.leaving)
const entering = computed(() => policy.value.workspace.entering)
const closeMarkVariants = computed(() => policy.value.workspace.closeMarkVariants)
const edgeSurfaceVariants = projectMotionPolicy('none').workspace.edgeSurfaceVariants
const tabSurfaceVariants = computed(() => policy.value.workspace.tabSurfaceVariants)
const edgeGestures = projectMotionPolicy('none').workspace.edgeGestures
const edgeMarkVariants = computed(() => policy.value.workspace.edgeMarkVariants)
const interruption = createMotionInterruptionOwner(() => policy.value)
watch(
  () => props.motion,
  () => {
    interruption.settle(policy.value)
  },
  { flush: 'sync' },
)

function setStrip(value: unknown): void {
  interruption.bind('strip', value)
  strip.value =
    value !== null &&
    typeof value === 'object' &&
    '$el' in value &&
    value.$el instanceof HTMLElement
      ? value.$el
      : undefined
}
function retireTab(element: Element): void {
  if (element instanceof HTMLElement) element.inert = true
}
function revealEnteringTab(element: Element): void {
  if (element instanceof HTMLElement) element.inert = false
}
onMounted(() => {
  void startAfterStableMount()
})
onBeforeUnmount(() => {
  interruption.dispose(projectMotionPolicy('none'))
  dispose()
})

function revealTab(button: HTMLElement, behavior: 'smooth' | 'instant' = 'smooth'): void {
  const owner = viewport.value
  const item = button.closest<HTMLElement>('.pavp-workspace-tabs__item')
  if (owner === undefined || item === null || strip.value?.contains(item) !== true) return
  const bounds = owner.getBoundingClientRect()
  // Reveal the complete tab, including its separate close target.
  const target = item.getBoundingClientRect()
  const offset =
    target.left < bounds.left
      ? target.left - bounds.left
      : target.right > bounds.right
        ? target.right - bounds.right
        : 0
  if (offset !== 0) scrollController?.scrollBy({ left: offset, behavior })
}

function focusTab(id: string): void {
  const button = findTabButton(id)
  if (button === null) return
  rovingId.value = id
  button.focus({ preventScroll: true })
  revealTab(button)
}
function handleTabKeydown(id: string, event: KeyboardEvent): void {
  if (event.defaultPrevented || isComposingKey(event)) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const index = props.items.findIndex((item) => item.id === id)
  if (index < 0) return
  let target: UiWorkspaceTab | undefined
  if (event.key === 'ArrowLeft')
    target = props.items[(index - 1 + props.items.length) % props.items.length]
  else if (event.key === 'ArrowRight') target = props.items[(index + 1) % props.items.length]
  else if (event.key === 'Home') target = props.items[0]
  else if (event.key === 'End') target = props.items.at(-1)
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    emit('activate', id)
    return
  } else return
  event.preventDefault()
  event.stopPropagation()
  if (target !== undefined) focusTab(target.id)
}
watch(
  () => props.items.map((item) => item.id),
  async (ids, previousIds) => {
    const focused = document.activeElement
    const menu = document.getElementById(menuId)
    const caller = menu?.contains(focused) === true ? contextCaller : focused
    const item = caller instanceof HTMLElement ? caller.closest('.pavp-workspace-tabs__item') : null
    if (item === null || strip.value?.contains(item) !== true) return
    const removedIndex = previousIds.findIndex(
      (id) => item.querySelector('[role="tab"]')?.id === `${id}-tab`,
    )
    const removedId = previousIds[removedIndex]
    if (removedId === undefined || ids.includes(removedId)) return
    const neighborId = ids[Math.min(removedIndex, ids.length - 1)]
    await nextTick()
    // A close request may be cancelled. Restore only after actual removal, and never
    // take focus back if the user or the application has already moved it elsewhere.
    if (document.activeElement !== focused && document.activeElement !== document.body) return
    if (neighborId !== undefined) focusTab(neighborId)
  },
)

watch(
  () => props.activeId,
  async (id) => {
    await nextTick()
    if (id !== props.activeId) return
    const button = id === null ? null : findTabButton(id)
    if (button !== null) revealTab(button)
  },
  // The controller supplies the initial default before shell restoration. Later activation reveals it.
)
</script>

<template>
  <LazyMotion
    :features="features"
    strict
  >
    <MotionConfig
      :reduced-motion="policy.reducedMotion"
      :skip-animations="policy.skipAnimations"
    >
      <LayoutGroup
        :id="groupId"
        :inherit="false"
      >
        <div
          class="pavp-workspace-tabs-region"
          :data-motion="motion"
        >
          <M
            :ref="(element) => interruption.bind('previous', element)"
            :initial="false"
            :animate="previousTab === undefined ? 'disabled' : 'rest'"
            v-bind="previousTab === undefined ? {} : edgeGestures"
            :transition="transition"
            as-child
          >
            <NButton
              attr-type="button"
              text
              class="pavp-workspace-tabs-edge pavp-workspace-tabs-edge--previous"
              :aria-label="previousLabel"
              :disabled="previousTab === undefined"
              native-focus-behavior
              @click="previousTab !== undefined && emit('activate', previousTab.id)"
            >
              <m.span
                class="pavp-workspace-tabs-edge__surface"
                aria-hidden="true"
                :initial="false"
                :variants="edgeSurfaceVariants"
                :transition="transition"
              />
              <m.span
                class="pavp-workspace-tabs-edge__mark"
                aria-hidden="true"
                :initial="false"
                :variants="edgeMarkVariants"
                :transition="transition"
              >
                <span class="pavp-workspace-tabs-edge__icon i-lucide-chevron-left" />
              </m.span>
            </NButton>
          </M>
          <div
            ref="viewport"
            class="pavp-workspace-tabs-viewport"
          >
            <UiScrollArea
              owner-id="workspace-tabs"
              x-scrollable
              @controller="connectScrollController"
              @viewport="emit('viewport', $event)"
            >
              <m.div
                :ref="setStrip"
                :layout="full ? 'position' : false"
                :data-motion="motion"
                :data-layout-motion="full"
                class="pavp-workspace-tabs"
                :aria-label="label"
                role="tablist"
                tabindex="-1"
                aria-orientation="horizontal"
              >
                <AnimatePresence
                  :initial="false"
                  mode="popLayout"
                  @before-leave="retireTab"
                  @before-enter="revealEnteringTab"
                >
                  <m.div
                    v-for="item in items"
                    :key="item.id"
                    class="pavp-workspace-tabs__item data-[active=true]:text-text-primary focus-within:text-text-primary hover:text-text-primary"
                    role="presentation"
                    :data-active="item.id === activeId"
                    :data-closable="item.closable"
                    :layout="full ? 'position' : false"
                    :initial="featureReady && motion !== 'none' ? entering : false"
                    :variants="{ rest: { ...resting, y: 0 } }"
                    animate="rest"
                    while-hover="hover"
                    while-press="press"
                    :exit="leaving"
                    :transition="transition"
                    @contextmenu.prevent="openContextMenu(item.id, $event.clientX, $event.clientY)"
                    @keydown="handleContextMenuKeydown(item.id, $event)"
                  >
                    <m.div
                      v-if="full && item.id === activeId"
                      class="pavp-workspace-tabs__lens"
                      aria-hidden="true"
                      layout-id="active-surface"
                      :initial="false"
                      :transition="transition"
                    />
                    <div
                      v-else-if="item.id === activeId"
                      class="pavp-workspace-tabs__lens"
                      aria-hidden="true"
                    />
                    <m.span
                      class="pavp-workspace-tabs__hover"
                      aria-hidden="true"
                      :variants="tabSurfaceVariants"
                      :transition="transition"
                    />
                    <NButton
                      :id="`${item.id}-tab`"
                      attr-type="button"
                      text
                      role="tab"
                      class="pavp-workspace-tabs__tab"
                      :aria-selected="item.id === activeId"
                      :aria-controls="panelId"
                      aria-haspopup="menu"
                      :aria-expanded="contextMenu.id === item.id"
                      :tabindex="item.id === tabStopId ? 0 : -1"
                      @focus="rovingId = item.id"
                      @keydown="handleTabKeydown(item.id, $event)"
                      @click="emit('activate', item.id)"
                    >
                      <span class="pavp-workspace-tabs__label">{{ item.label }}</span>
                    </NButton>
                    <M
                      v-if="item.closable"
                      :initial="false"
                      animate="rest"
                      while-hover="hover"
                      while-press="press"
                      :transition="transition"
                      as-child
                    >
                      <NButton
                        attr-type="button"
                        text
                        class="pavp-workspace-tabs__close"
                        :aria-label="item.closeLabel"
                        native-focus-behavior
                        @click.stop="emit('close', item.id)"
                      >
                        <m.span
                          class="pavp-workspace-tabs__close-mark"
                          aria-hidden="true"
                          :initial="false"
                          :variants="closeMarkVariants"
                          :transition="transition"
                        />
                      </NButton>
                    </M>
                  </m.div>
                </AnimatePresence>
              </m.div>
            </UiScrollArea>
          </div>
          <M
            :ref="(element) => interruption.bind('next', element)"
            :initial="false"
            :animate="nextTab === undefined ? 'disabled' : 'rest'"
            v-bind="nextTab === undefined ? {} : edgeGestures"
            :transition="transition"
            as-child
          >
            <NButton
              attr-type="button"
              text
              class="pavp-workspace-tabs-edge pavp-workspace-tabs-edge--next"
              :aria-label="nextLabel"
              :disabled="nextTab === undefined"
              native-focus-behavior
              @click="nextTab !== undefined && emit('activate', nextTab.id)"
            >
              <m.span
                class="pavp-workspace-tabs-edge__surface"
                aria-hidden="true"
                :initial="false"
                :variants="edgeSurfaceVariants"
                :transition="transition"
              />
              <m.span
                class="pavp-workspace-tabs-edge__mark"
                aria-hidden="true"
                :initial="false"
                :variants="edgeMarkVariants"
                :transition="transition"
              >
                <span class="pavp-workspace-tabs-edge__icon i-lucide-chevron-right" />
              </m.span>
            </NButton>
          </M>
        </div>
      </LayoutGroup>
    </MotionConfig>
  </LazyMotion>
  <NDropdown
    :id="menuId"
    class="pavp-workspace-context-menu"
    role="menu"
    tabindex="-1"
    :aria-labelledby="contextMenu.id === null ? undefined : `${contextMenu.id}-tab`"
    trigger="manual"
    :keyboard="false"
    size="large"
    to="#pavp-overlay-root"
    :show="contextMenu.id !== null"
    :x="contextMenu.x"
    :y="contextMenu.y"
    :options="contextOptions"
    @update:show="updateContextMenu"
    @clickoutside="dismissContextMenu"
    @select="selectContextAction"
    @keydown="handleMenuKeydown"
  />
</template>

<style scoped>
@layer components {
  .pavp-workspace-tabs-region {
    display: flex;
    min-inline-size: 0;
    flex: 0 0 auto;
    padding-inline-start: var(--pavp-safe-area-left);
    padding-inline-end: var(--pavp-safe-area-right);
    background-color: var(--ui-color-surface-panel);
    border-block-end-width: var(--ui-admin-border-width);
    border-block-end-style: solid;
    border-block-end-color: var(--ui-color-border-default);
  }
  .pavp-workspace-tabs-region:dir(rtl) {
    padding-inline-start: var(--pavp-safe-area-right);
    padding-inline-end: var(--pavp-safe-area-left);
  }
  .pavp-workspace-tabs-viewport {
    min-inline-size: 0;
    flex: 1 1 0;
  }
  .pavp-workspace-tabs-edge {
    position: relative;
    isolation: isolate;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
    inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
    min-inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ui-color-text-secondary);
    cursor: pointer;
  }
  .pavp-workspace-tabs-edge--previous {
    border-inline-end-width: var(--ui-admin-border-width);
    border-inline-end-style: solid;
    border-inline-end-color: var(--ui-color-border-default);
  }
  .pavp-workspace-tabs-edge--next {
    border-inline-start-width: var(--ui-admin-border-width);
    border-inline-start-style: solid;
    border-inline-start-color: var(--ui-color-border-default);
  }
  .pavp-workspace-tabs-edge__surface {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--ui-admin-navigation-selected) 10%, transparent);
    opacity: 0;
    pointer-events: none;
  }
  .pavp-workspace-tabs-edge__mark {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: var(--ui-font-size-body);
    block-size: var(--ui-font-size-body);
    pointer-events: none;
  }
  .pavp-workspace-tabs-edge__icon {
    inline-size: 100%;
    block-size: 100%;
  }
  .pavp-workspace-tabs-edge__icon:dir(rtl) {
    transform: scaleX(-1);
  }
  .pavp-workspace-tabs-edge:focus-visible {
    color: var(--ui-color-text-primary);
    outline: none;
    box-shadow: var(--ui-admin-shadow-focus-ring);
  }
  .pavp-workspace-tabs-edge:disabled {
    cursor: not-allowed;
  }
  .pavp-workspace-tabs-edge:disabled .pavp-workspace-tabs-edge__icon {
    opacity: var(--ui-admin-state-disabled-opacity);
  }
  .pavp-workspace-tabs-edge:disabled .pavp-workspace-tabs-edge__surface {
    visibility: hidden;
  }
  .pavp-workspace-tabs-edge:enabled:hover,
  .pavp-workspace-tabs-edge:enabled:active {
    color: var(--ui-color-text-primary);
  }
  .pavp-workspace-tabs-region:not([data-motion='none']) .pavp-workspace-tabs-edge:enabled {
    transition: color var(--ui-motion-duration) var(--ui-motion-easing);
  }
  .pavp-workspace-tabs-region[data-motion='reduced'] .pavp-workspace-tabs-edge:enabled {
    transition-duration: calc(var(--ui-motion-duration) / 2);
  }

  .pavp-workspace-tabs {
    --workspace-hover-surface: color-mix(
      in srgb,
      var(--ui-admin-navigation-selected) 12%,
      transparent
    );

    position: relative;
    isolation: isolate;
    display: flex;
    flex: 0 0 auto;
    gap: 0;
    color: var(--ui-color-text-secondary);
  }
  .pavp-workspace-tabs__item {
    border-radius: var(--ui-radius-control) var(--ui-radius-control) 0 0;
    position: relative;
    isolation: isolate;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
  .pavp-workspace-tabs__item::before {
    border-radius: inherit;
    content: '';
    position: absolute;
    inset: 0;
    border-block-start-width: var(--ui-admin-border-width);
    border-block-start-style: solid;
    border-block-start-color: var(--ui-color-border-default);
    border-inline-end-width: var(--ui-admin-border-width);
    border-inline-end-style: solid;
    border-inline-end-color: var(--ui-color-border-default);
    opacity: 0.4;
    pointer-events: none;
  }
  .pavp-workspace-tabs button {
    position: relative;
    isolation: isolate;
    z-index: var(--ui-z-base);
    min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
    min-inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
    padding-inline: var(--ui-space-content-gap);
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
  .pavp-workspace-tabs__hover {
    position: absolute;
    inset: 0;
    z-index: var(--ui-z-base);
    border-radius: inherit;
    background: var(--workspace-hover-surface);
    opacity: 0;
    pointer-events: none;
  }
  .pavp-workspace-tabs__label {
    position: relative;
    z-index: var(--ui-z-base);
  }
  .pavp-workspace-tabs .pavp-workspace-tabs__tab {
    border-radius: inherit;
  }
  .pavp-workspace-tabs__item[data-closable='true'] .pavp-workspace-tabs__tab {
    border-start-end-radius: 0;
    padding-inline-end: 0;
    text-align: end;
  }
  .pavp-workspace-tabs__lens {
    position: absolute;
    inset: 0;
    z-index: var(--ui-z-base);
    border-radius: inherit;
    background: color-mix(
      in srgb,
      var(--ui-admin-navigation-selected) 20%,
      var(--ui-color-surface-panel)
    );
    pointer-events: none;
  }
  .pavp-workspace-tabs__lens::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: var(--ui-admin-shadow-control);
    opacity: 0.4;
    pointer-events: none;
  }
  .pavp-workspace-tabs__lens::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    /* Keep the active marker above the shared horizontal scroll rail. */
    inset-block-end: calc(var(--ui-space-content-gap) / 6);
    block-size: var(--ui-admin-focus-width);
    background: var(--ui-admin-navigation-selected);
    pointer-events: none;
  }
  .pavp-workspace-tabs .pavp-workspace-tabs__close {
    border-radius: var(--ui-radius-small);
    padding-inline: 0;
  }
  /* Center the small mark inside the full close target, keeping the rail geometry stable. */
  .pavp-workspace-tabs__close-mark {
    position: absolute;
    inset-block: 0;
    inset-inline-start: calc((100% - var(--ui-font-size-body)) / 2);
    margin-block: auto;
    inline-size: var(--ui-font-size-body);
    block-size: var(--ui-font-size-body);
    pointer-events: none;
  }
  .pavp-workspace-tabs__close-mark::before,
  .pavp-workspace-tabs__close-mark::after {
    content: '';
    position: absolute;
    inset-block-start: calc(50% - var(--ui-admin-border-width) / 2);
    inset-inline: 0;
    border-block-start-width: var(--ui-admin-border-width);
    border-block-start-style: solid;
    border-block-start-color: currentColor;
    transform: rotate(45deg);
  }
  .pavp-workspace-tabs__close-mark::after {
    transform: rotate(-45deg);
  }
  .pavp-workspace-tabs:not([data-motion='none']) button {
    transition: color var(--ui-motion-duration) var(--ui-motion-easing);
  }
  .pavp-workspace-tabs[data-motion='reduced'] button {
    transition-duration: calc(var(--ui-motion-duration) / 2);
  }
  .pavp-workspace-tabs button:focus-visible,
  .pavp-workspace-context-menu:focus-visible,
  .pavp-workspace-context-menu :deep([role='menuitem']:focus-visible) {
    outline: none;
    box-shadow: var(--ui-admin-shadow-focus-ring);
  }
  @media (forced-colors: active) {
    .pavp-workspace-tabs [aria-selected='true'] {
      outline: var(--ui-admin-border-width) solid Highlight;
      outline-offset: calc(var(--ui-admin-border-width) * -1);
    }
    .pavp-workspace-tabs button:focus-visible,
    .pavp-workspace-tabs-edge:focus-visible,
    .pavp-workspace-context-menu:focus-visible,
    .pavp-workspace-context-menu :deep([role='menuitem']:focus-visible) {
      outline: var(--ui-admin-focus-width) solid Highlight;
      outline-offset: calc(var(--ui-admin-focus-width) * -1);
      box-shadow: none;
    }
  }
}
</style>

<style scoped>
.pavp-workspace-tabs__tab.n-button,
.pavp-workspace-tabs__close.n-button,
.pavp-workspace-tabs-edge.n-button {
  block-size: var(--ui-layout-target-enhanced-minimum-block-size);
  color: inherit;
  font: inherit;
}
.pavp-workspace-tabs__tab.n-button {
  padding-inline: var(--ui-space-content-gap);
  border-radius: inherit;
}
.pavp-workspace-tabs__item[data-closable='true'] .pavp-workspace-tabs__tab.n-button {
  padding-inline-end: 0;
  border-start-end-radius: 0;
}
.pavp-workspace-tabs__close.n-button {
  min-inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
  border-radius: var(--ui-radius-small);
}
.pavp-workspace-tabs-edge.n-button {
  inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
  color: var(--ui-color-text-secondary);
}
.pavp-workspace-tabs-edge.n-button:disabled {
  opacity: 1;
}
.pavp-workspace-tabs-edge.n-button:focus-visible,
.pavp-workspace-tabs-edge.n-button:enabled:hover,
.pavp-workspace-tabs-edge.n-button:enabled:active {
  color: var(--ui-color-text-primary);
}
</style>
