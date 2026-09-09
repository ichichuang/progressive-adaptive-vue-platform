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

defineOptions({ name: 'WorkspaceTabsSurface' })

const props = defineProps<{
  readonly motion: EffectiveAppearanceState['motion']
  readonly items: readonly UiWorkspaceTab[]
  readonly activeId: string | null
  readonly label: string
  readonly panelId: string
}>()
const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
}>()
const strip = ref<HTMLElement>()
const groupId = `pavp-workspace-${useId()}`
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
  const owner = strip.value
  if (owner === undefined) return
  const bounds = owner.getBoundingClientRect()
  const target = button.getBoundingClientRect()
  const offset =
    target.left < bounds.left
      ? target.left - bounds.left
      : target.right > bounds.right
        ? target.right - bounds.right
        : 0
  owner.scrollLeft += offset
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
        <m.div
          :ref="setStrip"
          layout-scroll
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
              :layout="full ? 'position' : false"
              :initial="featureReady && motion !== 'none' ? entering : false"
              :animate="{ ...resting, y: 0 }"
              :exit="leaving"
              :transition="transition"
            >
              <m.div
                v-if="full && item.id === activeId"
                class="pavp-workspace-tabs__lens"
                aria-hidden="true"
                layout-id="active-surface"
                :initial="false"
                :transition="transition"
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
                :variants="buttonVariants"
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
                <span
                  class="pavp-workspace-tabs__label"
                  aria-hidden="true"
                >
                  ×
                </span>
              </m.button>
            </m.div>
          </AnimatePresence>
        </m.div>
      </LayoutGroup>
    </MotionConfig>
  </LazyMotion>
</template>

<style scoped>
.pavp-workspace-tabs {
  --workspace-hover-surface: var(--ui-admin-navigation-hover);

  position: relative;
  isolation: isolate;
  display: flex;
  flex: 0 0 auto;
  gap: var(--ui-space-content-gap);
  overflow-x: auto;
  padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
    max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
  background-color: var(--ui-color-surface-page);
  border-block-end-width: var(--ui-admin-border-width);
  border-block-end-style: solid;
  border-block-end-color: var(--ui-color-border-default);
  color: var(--ui-color-text-secondary);
}
.pavp-workspace-tabs__item {
  position: relative;
  isolation: isolate;
  border-radius: var(--ui-radius-panel);
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}
.pavp-workspace-tabs button {
  position: relative;
  isolation: isolate;
  z-index: var(--ui-z-base);
  min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
  min-inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
  padding-inline: var(--ui-space-content-gap);
  border: 0;
  border-radius: var(--ui-radius-panel);
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
.pavp-workspace-tabs__lens,
.pavp-workspace-tabs[data-layout-motion='false'] .pavp-workspace-tabs__item[data-active='true'] {
  background: color-mix(
    in srgb,
    var(--ui-admin-navigation-selected) 12%,
    var(--ui-color-surface-panel)
  );
  box-shadow: var(--ui-admin-shadow-control-hover);
}
.pavp-workspace-tabs__lens::after,
.pavp-workspace-tabs[data-layout-motion='false']
  .pavp-workspace-tabs__item[data-active='true']::after {
  content: '';
  position: absolute;
  inset-inline: var(--ui-radius-panel);
  inset-block-end: 0;
  block-size: var(--ui-admin-focus-width);
  background: var(--ui-admin-navigation-selected);
  pointer-events: none;
}
.pavp-workspace-tabs__lens {
  position: absolute;
  inset: 0;
  z-index: var(--ui-z-base);
  border-radius: inherit;
  pointer-events: none;
}
.pavp-workspace-tabs .pavp-workspace-tabs__close {
  --workspace-hover-surface: color-mix(
    in srgb,
    var(--ui-admin-navigation-selected) 16%,
    transparent
  );

  padding-inline: 0;
  color: var(--ui-color-text-secondary);
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
  .pavp-workspace-tabs button:focus-visible {
    outline-color: Highlight;
  }
}
</style>
