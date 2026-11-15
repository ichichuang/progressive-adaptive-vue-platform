<script setup lang="ts">
import { nextTick, onScopeDispose, ref, watch, type ButtonHTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { useUiMotion, type UiMotionHandle, type UiMotionOrigin } from '@platform/ui'
import { useDashboardActionTheme } from './use-dashboard-action-theme'

const props = defineProps<{
  readonly id: string
  readonly owner: string
  readonly label: string
  readonly icon?: 'palette' | 'sparkles' | 'layout' | 'sliders' | 'pencil' | 'compass'
  readonly show: boolean
  readonly disabled?: boolean
  readonly dialog?: boolean
}>()
const emit = defineEmits<{
  open: [focus: boolean]
  keydown: [event: KeyboardEvent]
  settled: [page: string]
}>()
const motion = useUiMotion()
const actionTheme = useDashboardActionTheme()
const icons = {
  palette: 'i-lucide-palette',
  sparkles: 'i-lucide-sparkles',
  layout: 'i-lucide-panels-top-left',
  sliders: 'i-lucide-sliders-horizontal',
  pencil: 'i-lucide-pencil',
  compass: 'i-lucide-compass',
} as const
const surface = ref<HTMLElement>()
const visible = ref(false)
const closing = ref(false)
let origin: UiMotionOrigin | undefined
let playback: UiMotionHandle | undefined
let generation = 0

function hover(event: PointerEvent): void {
  if (event.pointerType !== 'mouse' || props.disabled || props.show) return
  origin = { clientX: event.clientX, clientY: event.clientY }
  emit('open', false)
}
function open(event: MouseEvent): void {
  origin = event.detail ? { clientX: event.clientX, clientY: event.clientY } : undefined
  emit('open', true)
}
watch(
  () => props.show,
  async (show) => {
    const sequence = ++generation
    playback?.cancel()
    playback = undefined
    closing.value = false
    if (show) {
      visible.value = true
      await nextTick()
      await nextTick()
      if (sequence !== generation || !surface.value) return
      playback = motion.play(surface.value, {
        preset: 'card-expand',
        phase: 'enter',
        durationMs: 160,
        ...(origin ? { origin } : {}),
      })
      void playback.finished.then(() => {
        if (sequence === generation && props.show) emit('settled', props.id)
      })
      return
    }
    if (!visible.value || !surface.value) {
      visible.value = false
      return
    }
    closing.value = true
    const exit = motion.play(surface.value, {
      preset: 'card-expand',
      phase: 'exit',
      durationMs: 120,
      ...(origin ? { origin } : {}),
    })
    playback = exit
    void exit.finished.then(() => {
      if (generation === sequence) {
        visible.value = false
        closing.value = false
      }
    })
  },
)
onScopeDispose(() => {
  generation += 1
  playback?.cancel()
})
</script>

<template>
  <NPopover
    trigger="manual"
    placement="right-start"
    :show="visible"
    :animated="false"
    :show-arrow="false"
    scrollable
    class="wb-dashboard-menu-popover max-h-dvh"
  >
    <template #trigger>
      <NButton
        class="wb-dashboard-context-action"
        block
        type="primary"
        quaternary
        size="small"
        :theme-overrides="actionTheme"
        :disabled="disabled"
        v-bind="
          {
            role: 'menuitem',
            tabindex: -1,
            'aria-haspopup': dialog ? 'dialog' : 'menu',
            'aria-expanded': show,
            onPointerenter: hover,
          } satisfies ButtonHTMLAttributes
        "
        :data-dashboard-submenu="id"
        @click="open"
      >
        <template #icon>
          <span
            v-if="icon"
            :class="icons[icon]"
            aria-hidden="true"
          />
        </template>
        <span class="flex w-full items-center justify-between gap-content-gap">
          <span v-text="label" />
          <span
            class="i-lucide-chevron-right shrink-0"
            aria-hidden="true"
          />
        </span>
      </NButton>
    </template>
    <div
      v-if="dialog"
      ref="surface"
      class="grid min-w-0 gap-component-unit"
      role="dialog"
      tabindex="-1"
      :aria-label="label"
      aria-modal="false"
      :data-dashboard-menu-owner="owner"
      :data-dashboard-menu-page="id"
      :inert="closing"
      @contextmenu.capture.prevent
    >
      <slot />
    </div>
    <div
      v-else
      ref="surface"
      class="grid min-w-0 gap-component-unit"
      role="menu"
      tabindex="-1"
      :aria-label="label"
      :data-dashboard-menu-owner="owner"
      :data-dashboard-menu-page="id"
      :inert="closing"
      @contextmenu.capture.prevent
      @keydown="emit('keydown', $event)"
    >
      <slot />
    </div>
  </NPopover>
</template>
