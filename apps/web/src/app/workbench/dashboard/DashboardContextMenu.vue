<script setup lang="ts">
import { computed, nextTick, onDeactivated, onMounted, onScopeDispose, ref, watch } from 'vue'
import { NPopover } from 'naive-ui/es/popover'
import { NButton } from 'naive-ui/es/button'
import { UiCopyAction, useUiMotion, type UiMotionHandle } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
import { useDashboardActionTheme } from './use-dashboard-action-theme'
const props = defineProps<{
  readonly show: boolean
  readonly x: number
  readonly y: number
  readonly cardLabel?: string | undefined
  readonly editing: boolean
  readonly disabled: boolean
  readonly caller: HTMLElement | null
  readonly pointer: boolean
  readonly copyValue: string
}>()
const emit = defineEmits<{
  close: []
  action: [value: 'edit' | 'finish' | 'properties' | 'remove' | 'add' | 'appearance' | 'layout']
}>()
const { t } = useConsoleI18n()
const actionTheme = useDashboardActionTheme()
const menuIconTheme = {
  iconSizeSmall: 'var(--ui-icon-size-medium)',
  iconMarginSmall: '0 var(--ui-space-content-gap)',
}
const menuActionTheme = computed(() => ({ ...actionTheme.value, ...menuIconTheme }))
const motion = useUiMotion()
const menu = ref<HTMLElement>()
const closing = ref(false)
let playback: UiMotionHandle | undefined
let generation = 0
const actions = computed(() =>
  props.cardLabel === undefined
    ? ([
        {
          id: props.editing ? 'finish' : 'edit',
          label: props.editing ? 'dashboardBoard.finish' : 'dashboardBoard.edit',
          disabled: props.disabled,
        },
        { id: 'add', label: 'dashboardBoard.add', disabled: props.disabled },
        { id: 'appearance', label: 'dashboardBoard.appearanceStyle', disabled: props.disabled },
        ...(props.editing
          ? ([
              { id: 'layout', label: 'dashboardBoard.layoutTools', disabled: props.disabled },
            ] as const)
          : []),
      ] as const)
    : ([
        { id: 'properties', label: 'dashboardBoard.properties', disabled: props.disabled },
        ...(props.editing
          ? ([{ id: 'remove', label: 'dashboardBoard.remove', disabled: props.disabled }] as const)
          : []),
      ] as const),
)
function restoreFocus(): void {
  if (menu.value?.contains(document.activeElement) && props.caller?.isConnected)
    props.caller.focus({ preventScroll: true })
}
function close(restore = true, withMotion = true): void {
  if (!props.show || (withMotion && closing.value)) return
  const sequence = ++generation
  playback?.cancel()
  playback = undefined
  if (restore) restoreFocus()
  if (!withMotion || !menu.value) {
    emit('close')
    return
  }
  closing.value = true
  const exit = motion.play(menu.value, {
    preset: 'card-expand',
    phase: 'exit',
    durationMs: 150,
    ...(props.pointer ? { origin: { clientX: props.x, clientY: props.y } } : {}),
  })
  playback = exit
  void exit.finished.then(() => {
    if (generation === sequence) emit('close')
  })
}
function select(action: (typeof actions.value)[number]['id']): void {
  if (closing.value) return
  restoreFocus()
  emit('action', action)
}
function dismissOutside(event: PointerEvent): void {
  // Dismiss on a fresh gesture, not the release of the gesture that opened the menu.
  const path = event.composedPath()
  if (!props.show || (menu.value && path.includes(menu.value))) return
  if (
    event.button === 2 &&
    path.some(
      (target) => target instanceof Element && target.matches('[data-dashboard-context-host]'),
    )
  )
    return
  close(false)
}
function items(): HTMLButtonElement[] {
  return Array.from(
    menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
  )
}
function keydown(event: KeyboardEvent): void {
  if (event.isComposing) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (event.key === 'Tab') {
    close()
    return
  }
  const options = items()
  if (options.length === 0) return
  const index = options.findIndex((item) => item === document.activeElement)
  let target: HTMLButtonElement | undefined
  if (event.key === 'ArrowDown') target = options[(index + 1) % options.length]
  else if (event.key === 'ArrowUp')
    target = index < 0 ? options.at(-1) : options[(index - 1 + options.length) % options.length]
  else if (event.key === 'Home') target = options[0]
  else if (event.key === 'End') target = options.at(-1)
  else return
  event.preventDefault()
  event.stopPropagation()
  target?.focus({ preventScroll: true })
}
watch(
  () => [props.show, props.x, props.y, props.caller],
  async () => {
    const sequence = ++generation
    closing.value = false
    playback?.cancel()
    playback = undefined
    if (!props.show) return
    await nextTick()
    await nextTick()
    if (sequence !== generation || !menu.value) return
    playback = motion.play(menu.value, {
      preset: 'card-expand',
      phase: 'enter',
      durationMs: 280,
      ...(props.pointer ? { origin: { clientX: props.x, clientY: props.y } } : {}),
    })
    // Pointer-opened menus should not visually suggest an action before the pointer reaches it.
    if (props.pointer) menu.value.focus({ preventScroll: true })
    else items()[0]?.focus({ preventScroll: true })
  },
)
function dismissOnScroll(event: Event): void {
  if (props.show && !(event.target instanceof Node && menu.value?.contains(event.target)))
    close(true, false)
}
function dismissOnResize(): void {
  if (props.show) close(true, false)
}
onMounted(() => {
  document.addEventListener('pointerdown', dismissOutside, true)
  document.addEventListener('scroll', dismissOnScroll, true)
  window.addEventListener('resize', dismissOnResize)
})
onDeactivated(() => {
  close(false, false)
})
onScopeDispose(() => {
  generation += 1
  playback?.cancel()
  document.removeEventListener('pointerdown', dismissOutside, true)
  document.removeEventListener('scroll', dismissOnScroll, true)
  window.removeEventListener('resize', dismissOnResize)
})
</script>
<template>
  <NPopover
    trigger="manual"
    placement="bottom-start"
    :show="show"
    :x="x"
    :y="y"
    :animated="false"
    :show-arrow="false"
    @contextmenu.capture.prevent
  >
    <div
      ref="menu"
      class="grid min-w-0 gap-component-unit"
      role="menu"
      :inert="closing"
      :aria-label="
        t(cardLabel === undefined ? 'dashboardBoard.contextMenu' : 'dashboardBoard.cardMenu')
      "
      tabindex="-1"
      @keydown="keydown"
    >
      <div
        class="text-start px-button-inline text-caption text-text-secondary"
        v-text="cardLabel ?? t('dashboardBoard.contextMenu')"
      />
      <NButton
        v-for="action in actions"
        :key="action.id"
        class="wb-dashboard-context-action"
        block
        :type="action.id === 'remove' ? 'error' : 'primary'"
        quaternary
        :theme-overrides="action.id === 'remove' ? menuIconTheme : menuActionTheme"
        size="small"
        role="menuitem"
        tabindex="-1"
        :disabled="action.disabled"
        :data-dashboard-danger="action.id === 'remove' ? 'true' : undefined"
        @click="select(action.id)"
      >
        <template #icon>
          <span
            :class="{
              'i-lucide-layout-dashboard': action.id === 'edit',
              'i-lucide-check': action.id === 'finish',
              'i-lucide-sliders-horizontal': action.id === 'properties',
              'i-lucide-trash-2': action.id === 'remove',
              'i-lucide-plus': action.id === 'add',
              'i-lucide-palette': action.id === 'appearance',
              'i-lucide-panels-top-left': action.id === 'layout',
            }"
            aria-hidden="true"
          />
        </template>
        <span
          class="text-start"
          v-text="t(action.label)"
        />
      </NButton>
      <UiCopyAction
        v-if="cardLabel === undefined"
        class="wb-dashboard-context-action"
        type="primary"
        quaternary
        :theme-overrides="actionTheme"
        size="small"
        role="menuitem"
        tabindex="-1"
        :value="copyValue"
        :label="t('dashboardBoard.copy')"
        :copy-label="t('formShowcase.copyAI')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
        :disabled="disabled"
        variant="tertiary"
        :tertiary="false"
      />
    </div>
  </NPopover>
</template>
