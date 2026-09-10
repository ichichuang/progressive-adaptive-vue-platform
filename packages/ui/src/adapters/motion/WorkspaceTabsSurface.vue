<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { AnimatePresence, m } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import {
  createMotionFeatureRuntime,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
} from './motion-feature-runtime'

import type { UiWorkspaceTab } from '../../components/contracts'
import { PavpDropdownPrimitive, type PavpDropdownOption } from '../naive/naive-dropdown'
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
let scrollController: UiScrollController | null = null
function connectScrollController(controller: UiScrollController | null): void {
  scrollController = controller
}
const groupId = `pavp-workspace-${useId()}`
const menuId = `${groupId}-menu`
const contextMenu = ref<{ readonly id: string | null; readonly x: number; readonly y: number }>({
  id: null,
  x: 0,
  y: 0,
})
const contextItem = computed(() => props.items.find((item) => item.id === contextMenu.value.id))
const contextOptions = computed<PavpDropdownOption[]>(() => [
  {
    key: 'refresh',
    label: props.refreshLabel,
    disabled: contextItem.value?.refreshable !== true,
    props: { role: 'menuitem', 'aria-disabled': contextItem.value?.refreshable !== true },
  },
  {
    key: 'close',
    label: props.closeLabel,
    disabled: contextItem.value?.closable !== true,
    props: { role: 'menuitem', 'aria-disabled': contextItem.value?.closable !== true },
  },
])
function closeContextMenu(): void {
  // Keep the anchor stable while the dropdown finishes its leave transition.
  if (contextMenu.value.id !== null) contextMenu.value = { ...contextMenu.value, id: null }
}
async function openContextMenu(id: string, x: number, y: number): Promise<void> {
  if (!props.items.some((item) => item.id === id)) return
  contextMenu.value = { id, x, y }
  await nextTick()
  if (contextItem.value?.id === id) document.getElementById(menuId)?.focus({ preventScroll: true })
}
function updateContextMenu(show: boolean): void {
  if (!show) dismissContextMenu()
}
function dismissContextMenu(event?: MouseEvent): void {
  const item = contextItem.value
  const focused = document.activeElement
  // Native pointer focus may complete after clickoutside (notably labels and touch).
  const targetsControl = event
    ?.composedPath()
    .some(
      (target) =>
        target instanceof Element &&
        target.matches(
          'a[href], button, input, select, textarea, label, summary, [tabindex], [contenteditable]',
        ),
    )
  if (
    item !== undefined &&
    targetsControl !== true &&
    (focused === document.body || document.getElementById(menuId)?.contains(focused) === true)
  )
    focusTab(document.getElementById(`${item.id}-tab`) ?? undefined)
  closeContextMenu()
}
function selectContextAction(key: string | number): void {
  const item = contextItem.value
  if (item !== undefined) focusTab(document.getElementById(`${item.id}-tab`) ?? undefined)
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
const full = computed(() => featureReady.value && props.motion === 'full')
const transition = computed(() => ({
  duration: !featureReady.value || props.motion === 'none' ? 0 : full.value ? 0.16 : 0.08,
  ...(full.value ? { layout: { type: 'spring' as const, visualDuration: 0.26, bounce: 0 } } : {}),
}))
const resting = Object.freeze({ opacity: 1, scale: 1 })
const leaving = computed(() => ({
  opacity: props.motion === 'none' ? 1 : 0,
  scale: full.value ? 0.98 : 1,
}))
const entering = computed(() => ({ ...leaving.value, y: full.value ? 3 : 0 }))
const buttonVariants = computed(() => ({
  rest: resting,
  hover: resting,
  focus: resting,
  press: { scale: full.value ? 0.985 : 1, opacity: 0.86 },
}))
// Gesture variants propagate from the real button to its token-painted surface.
// Animate opacity so theme colors (including color-mix) stay entirely CSS-owned.
const surfaceVariants = Object.freeze({
  rest: { opacity: 0 },
  hover: { opacity: 1 },
  focus: { opacity: 1 },
  press: { opacity: 1 },
})
const closeMarkVariants = computed(() => ({
  rest: { opacity: 0.68, scale: 1 },
  hover: { opacity: 1, scale: full.value ? 1.04 : 1 },
  focus: resting,
  press: { opacity: 0.86, scale: full.value ? 0.985 : 1 },
}))
const edgeSurfaceVariants = Object.freeze({
  rest: { opacity: 0 },
  hover: { opacity: 0.6 },
  focus: { opacity: 0.6 },
  press: { opacity: 1 },
  disabled: { opacity: 0, transition: { duration: 0 } },
})
const edgeGestures = Object.freeze({
  whileHover: 'hover',
  whileFocus: 'focus',
  whilePress: 'press',
})
// Only the mark scales; the button keeps its full minimum interactive target.
const edgeMarkVariants = computed(() => ({
  rest: resting,
  hover: { opacity: 1, scale: full.value ? 1.04 : 1 },
  focus: resting,
  press: { opacity: 0.86, scale: full.value ? 0.96 : 1 },
  disabled: { ...resting, transition: { duration: 0 } },
}))
function setStrip(value: unknown): void {
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
onBeforeUnmount(dispose)
const focusedId = ref<string | null>(null)

function revealTab(button: HTMLElement): void {
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
  if (offset !== 0) scrollController?.scrollBy({ left: offset, behavior: 'smooth' })
}

function focusTab(button: HTMLElement | undefined): void {
  if (button === undefined || strip.value?.contains(button) !== true) return
  button.focus({ preventScroll: true })
  revealTab(button)
}

watch(
  () => props.activeId,
  async (id) => {
    await nextTick()
    if (strip.value?.contains(document.activeElement) !== true) focusedId.value = id
    const button = id === null ? null : document.getElementById(`${id}-tab`)
    if (button !== null) revealTab(button)
  },
  { immediate: true },
)

function moveFocus(event: KeyboardEvent): void {
  const buttons = [
    ...(strip.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []),
  ].filter((button) => button.closest('[inert]') === null)
  const current = buttons.findIndex((button) => button === event.target)
  if (current < 0) return
  const direction =
    strip.value !== undefined && getComputedStyle(strip.value).direction === 'rtl' ? -1 : 1
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
    const button = buttons[current]
    const item = props.items.find((candidate) => `${candidate.id}-tab` === button?.id)
    if (button === undefined || item === undefined) return
    event.preventDefault()
    const bounds = button.closest('.pavp-workspace-tabs__item')?.getBoundingClientRect()
    if (bounds === undefined) return
    void openContextMenu(item.id, direction === -1 ? bounds.right : bounds.left, bounds.bottom)
    return
  }
  const offset = event.key === 'ArrowRight' ? direction : event.key === 'ArrowLeft' ? -direction : 0
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : offset === 0
          ? undefined
          : (current + offset + buttons.length) % buttons.length
  if (next === undefined) return
  event.preventDefault()
  // Only the strip scrolls; Enter/Space keep native button activation.
  focusTab(buttons[next])
}

watch(
  () => props.items,
  async (items, previous) => {
    const element = document.activeElement
    const index = previous.findIndex((item) => item.id === focusedId.value)
    if (index < 0 || items.some((item) => item.id === focusedId.value)) return
    const hadFocus = element !== null && strip.value?.contains(element) === true
    const next = items[Math.min(index, items.length - 1)]
    focusedId.value = next?.id ?? null
    await nextTick()
    if (
      hadFocus &&
      (!element.isConnected || element.closest('[inert]') !== null) &&
      (document.activeElement === document.body || document.activeElement === element)
    )
      focusTab(
        next === undefined ? strip.value : (document.getElementById(`${next.id}-tab`) ?? undefined),
      )
  },
  { flush: 'pre' },
)
</script>

<template>
  <LazyMotion
    :features="features"
    strict
  >
    <MotionConfig
      :reduced-motion="motion === 'full' ? 'never' : 'always'"
      :skip-animations="motion === 'none' || !featureReady"
    >
      <LayoutGroup
        :id="groupId"
        :inherit="false"
      >
        <div
          class="pavp-workspace-tabs-region"
          :data-motion="motion"
        >
          <m.button
            type="button"
            class="pavp-workspace-tabs-edge pavp-workspace-tabs-edge--previous"
            :aria-label="previousLabel"
            :disabled="previousTab === undefined"
            :initial="false"
            :animate="previousTab === undefined ? 'disabled' : 'rest'"
            v-bind="previousTab === undefined ? {} : edgeGestures"
            :transition="transition"
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
          </m.button>
          <div
            ref="viewport"
            class="pavp-workspace-tabs-viewport"
          >
            <UiScrollArea
              owner-id="workspace-tabs"
              x-scrollable
              @controller="connectScrollController"
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
                @keydown="moveFocus"
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
                    class="pavp-workspace-tabs__item"
                    role="presentation"
                    :data-active="item.id === activeId"
                    :data-closable="item.closable"
                    :layout="full ? 'position' : false"
                    :initial="featureReady && motion !== 'none' ? entering : false"
                    :animate="{ ...resting, y: 0 }"
                    :exit="leaving"
                    :transition="transition"
                    @contextmenu.prevent="openContextMenu(item.id, $event.clientX, $event.clientY)"
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
                    <m.button
                      :id="`${item.id}-tab`"
                      type="button"
                      role="tab"
                      class="pavp-workspace-tabs__tab"
                      :initial="false"
                      animate="rest"
                      while-hover="hover"
                      while-focus="focus"
                      while-press="press"
                      :variants="buttonVariants"
                      :transition="transition"
                      :aria-selected="item.id === activeId"
                      :aria-controls="panelId"
                      aria-haspopup="menu"
                      :aria-expanded="contextMenu.id === item.id"
                      :tabindex="item.id === (focusedId ?? activeId) ? 0 : -1"
                      @focus="focusedId = item.id"
                      @click="emit('activate', item.id)"
                    >
                      <m.span
                        class="pavp-workspace-tabs__hover"
                        aria-hidden="true"
                        :initial="false"
                        :variants="surfaceVariants"
                        :transition="transition"
                      />
                      <span class="pavp-workspace-tabs__label">{{ item.label }}</span>
                    </m.button>
                    <m.button
                      v-if="item.closable"
                      type="button"
                      class="pavp-workspace-tabs__close"
                      :initial="false"
                      animate="rest"
                      while-hover="hover"
                      while-focus="focus"
                      while-press="press"
                      :transition="transition"
                      :aria-label="item.closeLabel"
                      @focus="focusedId = item.id"
                      @click.stop="emit('close', item.id)"
                    >
                      <m.span
                        class="pavp-workspace-tabs__hover"
                        aria-hidden="true"
                        :initial="false"
                        :variants="surfaceVariants"
                        :transition="transition"
                      />
                      <m.span
                        class="pavp-workspace-tabs__close-mark"
                        aria-hidden="true"
                        :initial="false"
                        :variants="closeMarkVariants"
                        :transition="transition"
                      />
                    </m.button>
                  </m.div>
                </AnimatePresence>
              </m.div>
            </UiScrollArea>
          </div>
          <m.button
            type="button"
            class="pavp-workspace-tabs-edge pavp-workspace-tabs-edge--next"
            :aria-label="nextLabel"
            :disabled="nextTab === undefined"
            :initial="false"
            :animate="nextTab === undefined ? 'disabled' : 'rest'"
            v-bind="nextTab === undefined ? {} : edgeGestures"
            :transition="transition"
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
          </m.button>
        </div>
      </LayoutGroup>
    </MotionConfig>
  </LazyMotion>
  <PavpDropdownPrimitive
    :id="menuId"
    class="pavp-workspace-context-menu"
    role="menu"
    tabindex="-1"
    :aria-labelledby="contextMenu.id === null ? undefined : `${contextMenu.id}-tab`"
    trigger="manual"
    size="large"
    to="#pavp-overlay-root"
    :show="contextMenu.id !== null"
    :x="contextMenu.x"
    :y="contextMenu.y"
    :options="contextOptions"
    @update:show="updateContextMenu"
    @clickoutside="dismissContextMenu"
    @select="selectContextAction"
    @keydown.tab="closeContextMenu"
  />
</template>

<style scoped>
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
  outline: var(--ui-admin-focus-width) solid var(--ui-color-focus-ring);
  outline-offset: calc(var(--ui-admin-focus-width) * -1);
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
    var(--ui-admin-navigation-selected) 6%,
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
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}
.pavp-workspace-tabs__item::before {
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
.pavp-workspace-tabs__item[data-active='true'] {
  --workspace-hover-surface: color-mix(
    in srgb,
    var(--ui-admin-navigation-selected) 8%,
    transparent
  );

  color: var(--ui-color-text-primary);
}
.pavp-workspace-tabs__tab:hover {
  color: var(--ui-color-text-primary);
}
.pavp-workspace-tabs__item[data-closable='true'] .pavp-workspace-tabs__tab {
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
    var(--ui-admin-navigation-selected) 12%,
    var(--ui-color-surface-panel)
  );
  pointer-events: none;
}
.pavp-workspace-tabs__lens::before {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: var(--ui-admin-shadow-control);
  opacity: 0.4;
  pointer-events: none;
}
.pavp-workspace-tabs__lens::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: var(--ui-admin-focus-width);
  background: var(--ui-admin-navigation-selected);
  pointer-events: none;
}
.pavp-workspace-tabs .pavp-workspace-tabs__close {
  padding-inline: 0;
  color: var(--ui-color-text-secondary);
}
/* Paint one tab surface across adjacent targets without extending either hit box. */
.pavp-workspace-tabs__item[data-closable='true']
  .pavp-workspace-tabs__tab
  .pavp-workspace-tabs__hover {
  inset-inline-end: calc(var(--ui-layout-target-enhanced-minimum-inline-size) * -1);
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
.pavp-workspace-tabs__item:hover .pavp-workspace-tabs__close,
.pavp-workspace-tabs__item:focus-within .pavp-workspace-tabs__close,
.pavp-workspace-tabs__item[data-active='true'] .pavp-workspace-tabs__close {
  color: var(--ui-color-text-primary);
}
.pavp-workspace-tabs:not([data-motion='none']) button {
  transition: color var(--ui-motion-duration) var(--ui-motion-easing);
}
.pavp-workspace-tabs[data-motion='reduced'] button {
  transition-duration: calc(var(--ui-motion-duration) / 2);
}
.pavp-workspace-tabs button:focus-visible {
  outline: var(--ui-admin-focus-width) solid var(--ui-color-focus-ring);
  outline-offset: calc(var(--ui-admin-focus-width) * -1);
}
@media (forced-colors: active) {
  .pavp-workspace-tabs [aria-selected='true'] {
    outline: var(--ui-admin-border-width) solid Highlight;
    outline-offset: calc(var(--ui-admin-border-width) * -1);
  }
  .pavp-workspace-tabs button:focus-visible,
  .pavp-workspace-tabs-edge:focus-visible {
    outline-color: Highlight;
  }
}
</style>
