<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import type { UiWorkspaceTab } from './contracts'

defineOptions({ name: 'UiWorkspaceTabs' })

const props = defineProps<{
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
  const buttons = [...(strip.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
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
      next !== undefined &&
      !element.isConnected &&
      document.activeElement === document.body
    )
      focusTab(document.getElementById(`${next.id}-tab`) ?? undefined)
  },
  { flush: 'pre' },
)
</script>

<template>
  <div
    ref="strip"
    class="pavp-workspace-tabs"
    :aria-label="label"
    role="tablist"
    tabindex="-1"
    aria-orientation="horizontal"
    @keydown="moveFocus"
  >
    <div
      v-for="item in items"
      :key="item.id"
      class="pavp-workspace-tabs__item"
      role="presentation"
    >
      <button
        :id="`${item.id}-tab`"
        type="button"
        role="tab"
        :aria-selected="item.id === activeId"
        :aria-controls="item.id === activeId ? panelId : undefined"
        :tabindex="item.id === (focusedId ?? activeId) ? 0 : -1"
        @focus="focusedId = item.id"
        @click="emit('activate', item.id)"
      >
        {{ item.label }}
      </button>
      <button
        v-if="item.closable"
        type="button"
        :aria-label="item.closeLabel"
        @focus="focusedId = item.id"
        @click="emit('close', item.id)"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pavp-workspace-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: var(--ui-space-content-gap);
  overflow-x: auto;
  padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
    max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
  background-color: var(--ui-color-surface-page);
  color: var(--ui-color-text-primary);
}
.pavp-workspace-tabs__item {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}
.pavp-workspace-tabs button {
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
.pavp-workspace-tabs [aria-selected='true'] {
  background-color: var(--ui-color-action-primary);
  color: var(--ui-color-text-on-action);
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
