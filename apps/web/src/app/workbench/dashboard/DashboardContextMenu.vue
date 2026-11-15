<script setup lang="ts">
import {
  type ButtonHTMLAttributes,
  computed,
  nextTick,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
  useId,
  watch,
} from 'vue'
import { NPopover } from 'naive-ui/es/popover'
import { NButton } from 'naive-ui/es/button'
import { NFormItem } from 'naive-ui/es/form'
import { NInput } from 'naive-ui/es/input'
import { useUiMotion, type UiMotionHandle } from '@platform/ui'
import type {
  DashboardDestination,
  DashboardEntrance,
  DashboardPanel,
  DashboardStyle,
  DashboardTone,
} from '../../dashboard/dashboard-contract'
import { useConsoleI18n } from '../../../shared/i18n'
import { useDashboardActionTheme } from './use-dashboard-action-theme'
import DashboardAppearanceOptions from './DashboardAppearanceOptions.vue'
import DashboardMenuBranch from './DashboardMenuBranch.vue'

type MenuAction =
  | 'edit'
  | 'finish'
  | 'remove'
  | 'add'
  | 'undo'
  | 'compact'
  | 'restore-layout'
  | 'retry-read'
  | 'replace-invalid'
  | 'retry-save'
interface ShortcutChoice {
  readonly value: DashboardDestination
  readonly label: string
  readonly index: number
  readonly selected: boolean
  readonly isLast: boolean
}
const props = defineProps<{
  readonly show: boolean
  readonly x: number
  readonly y: number
  readonly cardId?: string | undefined
  readonly cardLabel?: string | undefined
  readonly panel?: DashboardPanel | undefined
  readonly cardTone?: DashboardTone | undefined
  readonly boardStyle: DashboardStyle
  readonly boardEntrance: DashboardEntrance
  readonly toneOverrides: number
  readonly entranceOverrides: number
  readonly previewEnabled: boolean
  readonly destinations: readonly ShortcutChoice[]
  readonly canUndo: boolean
  readonly editing: boolean
  readonly readFailure: boolean
  readonly saveFailure: boolean
  readonly caller: HTMLElement | null
  readonly pointer: boolean
}>()
const emit = defineEmits<{
  close: []
  action: [value: MenuAction]
  'board-style': [value: DashboardStyle]
  'board-entrance': [value: DashboardEntrance, target: HTMLElement | null]
  'card-tone': [id: string, value: DashboardTone]
  'card-entrance': [id: string, value: DashboardEntrance, target: HTMLElement | null]
  'reset-tone': [id: string]
  'reset-entrance': [id: string, target: HTMLElement | null]
  title: [id: string, value: string]
  'toggle-destination': [id: string, value: DashboardDestination, checked: boolean]
  'reorder-destination': [id: string, index: number, delta: -1 | 1]
}>()
const { t } = useConsoleI18n()
const actionTheme = useDashboardActionTheme()
const menuIconTheme = {
  iconSizeSmall: 'var(--ui-icon-size-medium)',
  iconMarginSmall: '0 var(--ui-space-content-gap)',
}
const menuActionTheme = computed(() => ({ ...actionTheme.value, ...menuIconTheme }))
const motion = useUiMotion()
const menuId = useId()
const titleId = useId()
const menu = ref<HTMLElement>()
const openPath = ref<string[]>([])
const closing = ref(false)
const titleDraft = ref('')
let draftCardId: string | undefined
const titleDirty = ref(false)
let playback: UiMotionHandle | undefined
let generation = 0

function commitTitle(): void {
  if (draftCardId && titleDirty.value) emit('title', draftCardId, titleDraft.value)
  titleDirty.value = false
}
function setPath(path: string[]): void {
  if (openPath.value.includes('card-title') && !path.includes('card-title')) commitTitle()
  openPath.value = path
}
function menuItems(surface: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    surface.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]:not(:disabled), button[role="menuitemradio"]:not(:disabled), button[role="menuitemcheckbox"]:not(:disabled)',
    ),
  ).filter((item) => item.closest('[data-dashboard-menu-owner]') === surface)
}
function focusMenuElement(element: HTMLElement | undefined | null): void {
  if (!element) return
  element.focus({ preventScroll: true })
  const popover = element.closest('.wb-dashboard-menu-popover')
  let container = element.parentElement
  while (container && container !== popover) {
    const overflow = getComputedStyle(container).overflowY
    if (/(auto|scroll)/u.test(overflow) && container.scrollHeight > container.clientHeight) {
      const item = element.getBoundingClientRect()
      const viewport = container.getBoundingClientRect()
      if (item.top < viewport.top) container.scrollTop += item.top - viewport.top
      else if (item.bottom > viewport.bottom) container.scrollTop += item.bottom - viewport.bottom
      break
    }
    container = container.parentElement
  }
}
function surfaceFor(page: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-dashboard-menu-owner="${menuId}"][data-dashboard-menu-page="${page}"]`,
  )
}
function revealFocusedMenuItem(page?: string): void {
  const surface = page ? surfaceFor(page) : menu.value
  const focused = document.activeElement
  if (
    surface &&
    focused instanceof HTMLElement &&
    focused.closest('[data-dashboard-menu-owner]') === surface
  )
    focusMenuElement(focused)
}
async function openBranch(path: string[], focus: boolean): Promise<void> {
  if (closing.value) return
  setPath(path)
  if (!focus) return
  await nextTick()
  await nextTick()
  await nextTick()
  const page = path.at(-1)
  const surface = page ? surfaceFor(page) : menu.value
  if (!surface || !props.show || (page && openPath.value.at(-1) !== page)) return
  const input = surface.querySelector<HTMLInputElement>('input:not(:disabled)')
  focusMenuElement(input ?? menuItems(surface)[0])
}
function collapseBelow(path: string[], event: PointerEvent): void {
  if (event.pointerType !== 'mouse') return
  if (path.every((part, index) => openPath.value[index] === part)) setPath(path)
}
function focusBranch(page: string): void {
  const trigger = document.querySelector<HTMLElement>(`[data-dashboard-submenu="${page}"]`)
  focusMenuElement(trigger)
}
function restoreFocus(): void {
  const focused = document.activeElement
  if (
    focused instanceof Element &&
    focused.closest(`[data-dashboard-menu-owner="${menuId}"]`) &&
    props.caller?.isConnected
  )
    props.caller.focus({ preventScroll: true })
}
function close(restore = true, withMotion = true): void {
  if (!props.show || (withMotion && closing.value)) return
  commitTitle()
  setPath([])
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
function select(action: MenuAction, dismiss = true): void {
  if (closing.value) return
  if (dismiss) close()
  emit('action', action)
}
function updateCardEntrance(value: DashboardEntrance, target: HTMLElement | null): void {
  if (props.cardId) emit('card-entrance', props.cardId, value, target)
}
function dismissOutside(event: PointerEvent): void {
  if (!props.show) return
  const path = event.composedPath()
  if (
    path.some(
      (target) =>
        target instanceof Element && target.getAttribute('data-dashboard-menu-owner') === menuId,
    )
  )
    return
  if (
    event.button === 2 &&
    path.some(
      (target) => target instanceof Element && target.matches('[data-dashboard-context-host]'),
    )
  )
    return
  close(false)
}
function keydown(event: KeyboardEvent): void {
  if (event.isComposing || !(event.target instanceof Element)) return
  const surface = event.target.closest<HTMLElement>(`[data-dashboard-menu-owner="${menuId}"]`)
  if (!surface) return
  const page = surface.dataset['dashboardMenuPage']
  const input =
    event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
  if (event.key === 'Escape' || (event.key === 'ArrowLeft' && page && !input)) {
    event.preventDefault()
    event.stopPropagation()
    if (page) {
      const index = openPath.value.indexOf(page)
      setPath(index < 0 ? [] : openPath.value.slice(0, index))
      void nextTick(() => {
        focusBranch(page)
      })
    } else close()
    return
  }
  if (event.key === 'Tab') {
    close(false)
    return
  }
  if (input) return
  const options = menuItems(surface)
  if (!options.length) return
  const index = options.findIndex((item) => item === document.activeElement)
  if (event.key === 'ArrowRight' && index >= 0 && options[index]?.getAttribute('aria-haspopup')) {
    event.preventDefault()
    options[index].click()
    return
  }
  let target: HTMLButtonElement | undefined
  if (event.key === 'ArrowDown') target = options[(index + 1) % options.length]
  else if (event.key === 'ArrowUp')
    target = index < 0 ? options.at(-1) : options[(index - 1 + options.length) % options.length]
  else if (event.key === 'Home') target = options[0]
  else if (event.key === 'End') target = options.at(-1)
  else return
  event.preventDefault()
  event.stopPropagation()
  focusMenuElement(target)
}
function titleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    event.stopPropagation()
    commitTitle()
    return
  }
  keydown(event)
}
watch(
  () => [props.show, props.x, props.y, props.caller, props.cardId],
  async () => {
    commitTitle()
    setPath([])
    draftCardId = props.cardId
    titleDraft.value = props.panel?.title ?? ''
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
      durationMs: 200,
      ...(props.pointer ? { origin: { clientX: props.x, clientY: props.y } } : {}),
    })
    void playback.finished.then(() => {
      if (sequence === generation && props.show) revealFocusedMenuItem()
    })
    if (props.pointer) menu.value.focus({ preventScroll: true })
    else focusMenuElement(menuItems(menu.value)[0])
  },
)
function dismissOnScroll(event: Event): void {
  if (!props.show) return
  const target = event.target
  if (target instanceof Element) {
    const popover = target.closest('.wb-dashboard-menu-popover')
    if (popover?.querySelector(`[data-dashboard-menu-owner="${menuId}"]`)) return
  }
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
    scrollable
    class="wb-dashboard-menu-popover max-h-dvh"
    v-bind="{ onContextmenuCapture: (event: MouseEvent) => event.preventDefault() }"
  >
    <div
      ref="menu"
      class="grid min-w-0 gap-component-unit"
      role="menu"
      :inert="closing"
      :aria-label="
        cardId === undefined
          ? t('dashboardBoard.contextMenu')
          : `${cardLabel} · ${t('dashboardBoard.cardMenu')}`
      "
      :data-dashboard-menu-owner="menuId"
      tabindex="-1"
      @keydown="keydown"
    >
      <template v-if="cardId === undefined">
        <NButton
          class="wb-dashboard-context-action"
          block
          type="primary"
          quaternary
          size="small"
          :theme-overrides="menuActionTheme"
          :disabled="readFailure"
          v-bind="
            {
              role: 'menuitem',
              tabindex: -1,
              onPointerenter: (event: PointerEvent) => collapseBelow([], event),
            } satisfies ButtonHTMLAttributes
          "
          @click="select(editing ? 'finish' : 'edit')"
        >
          <template #icon>
            <span
              :class="editing ? 'i-lucide-check' : 'i-lucide-layout-dashboard'"
              aria-hidden="true"
            />
          </template>
          {{ t(editing ? 'dashboardBoard.finish' : 'dashboardBoard.edit') }}
        </NButton>
        <NButton
          class="wb-dashboard-context-action"
          block
          type="primary"
          quaternary
          size="small"
          :theme-overrides="menuActionTheme"
          :disabled="readFailure"
          v-bind="
            {
              role: 'menuitem',
              tabindex: -1,
              onPointerenter: (event: PointerEvent) => collapseBelow([], event),
            } satisfies ButtonHTMLAttributes
          "
          @click="select('add')"
        >
          <template #icon>
            <span
              class="i-lucide-plus"
              aria-hidden="true"
            />
          </template>
          {{ t('dashboardBoard.add') }}
        </NButton>
        <DashboardMenuBranch
          id="board-style"
          :owner="menuId"
          :label="t('dashboardBoard.appearanceStyle')"
          icon="palette"
          :show="openPath.includes('board-style')"
          :disabled="readFailure"
          @open="openBranch(['board-style'], $event)"
          @keydown="keydown"
          @settled="revealFocusedMenuItem"
        >
          <DashboardMenuBranch
            id="board-color"
            :owner="menuId"
            :label="t('dashboardBoard.colorTab')"
            icon="palette"
            :show="openPath.includes('board-color')"
            @open="openBranch(['board-style', 'board-color'], $event)"
            @keydown="keydown"
            @settled="revealFocusedMenuItem"
          >
            <DashboardAppearanceOptions
              section="color"
              :board-style="boardStyle"
              :entrance="boardEntrance"
              :tone-overrides="toneOverrides"
              :preview-enabled="previewEnabled"
              @update:board-style="emit('board-style', $event)"
            />
          </DashboardMenuBranch>
          <DashboardMenuBranch
            id="board-motion"
            :owner="menuId"
            :label="t('dashboardBoard.motionTab')"
            icon="sparkles"
            :show="openPath.includes('board-motion')"
            @open="openBranch(['board-style', 'board-motion'], $event)"
            @keydown="keydown"
            @settled="revealFocusedMenuItem"
          >
            <DashboardAppearanceOptions
              section="motion"
              :board-style="boardStyle"
              :entrance="boardEntrance"
              :entrance-overrides="entranceOverrides"
              :preview-enabled="previewEnabled"
              @update:entrance="(value, target) => emit('board-entrance', value, target)"
            />
          </DashboardMenuBranch>
        </DashboardMenuBranch>
        <DashboardMenuBranch
          v-if="editing"
          id="layout"
          :owner="menuId"
          :label="t('dashboardBoard.layoutTools')"
          icon="layout"
          :show="openPath.includes('layout')"
          :disabled="readFailure"
          @open="openBranch(['layout'], $event)"
          @keydown="keydown"
          @settled="revealFocusedMenuItem"
        >
          <NButton
            class="wb-dashboard-context-action"
            block
            type="primary"
            quaternary
            size="small"
            :theme-overrides="menuActionTheme"
            :disabled="!canUndo"
            v-bind="{ role: 'menuitem', tabindex: -1 } satisfies ButtonHTMLAttributes"
            @click="select('undo', false)"
          >
            <template #icon>
              <span
                class="i-lucide-undo-2"
                aria-hidden="true"
              />
            </template>
            <span>{{ t('dashboardBoard.undo') }}</span>
          </NButton>
          <NButton
            class="wb-dashboard-context-action"
            block
            type="primary"
            quaternary
            size="small"
            :theme-overrides="menuActionTheme"
            v-bind="{ role: 'menuitem', tabindex: -1 } satisfies ButtonHTMLAttributes"
            @click="select('compact', false)"
          >
            <template #icon>
              <span
                class="i-lucide-panels-top-left"
                aria-hidden="true"
              />
            </template>
            <span>{{ t('dashboardBoard.compact') }}</span>
          </NButton>
          <NButton
            class="wb-dashboard-context-action"
            block
            type="primary"
            quaternary
            size="small"
            :theme-overrides="menuActionTheme"
            v-bind="{ role: 'menuitem', tabindex: -1 } satisfies ButtonHTMLAttributes"
            @click="select('restore-layout', false)"
          >
            <template #icon>
              <span
                class="i-lucide-rotate-ccw"
                aria-hidden="true"
              />
            </template>
            <span>{{ t('dashboardBoard.restoreLayout') }}</span>
          </NButton>
        </DashboardMenuBranch>
      </template>
      <template v-else>
        <NButton
          v-if="editing"
          class="wb-dashboard-context-action"
          block
          type="primary"
          quaternary
          size="small"
          :theme-overrides="menuActionTheme"
          v-bind="
            {
              role: 'menuitem',
              tabindex: -1,
              onPointerenter: (event: PointerEvent) => collapseBelow([], event),
            } satisfies ButtonHTMLAttributes
          "
          @click="select('finish')"
        >
          <template #icon>
            <span
              class="i-lucide-check"
              aria-hidden="true"
            />
          </template>
          {{ t('dashboardBoard.finish') }}
        </NButton>
        <DashboardMenuBranch
          id="card-settings"
          :owner="menuId"
          :label="t('dashboardBoard.properties')"
          icon="sliders"
          :show="openPath.includes('card-settings')"
          :disabled="readFailure"
          @open="openBranch(['card-settings'], $event)"
          @keydown="keydown"
          @settled="revealFocusedMenuItem"
        >
          <DashboardMenuBranch
            id="card-title"
            :owner="menuId"
            :label="t('dashboardBoard.cardTitle')"
            icon="pencil"
            :show="openPath.includes('card-title')"
            dialog
            @open="openBranch(['card-settings', 'card-title'], $event)"
            @keydown="keydown"
            @settled="revealFocusedMenuItem"
          >
            <NFormItem
              :label="t('dashboardBoard.cardTitle')"
              :show-feedback="false"
              :label-props="{ for: titleId }"
            >
              <NInput
                v-model:value="titleDraft"
                :maxlength="60"
                :input-props="{ id: titleId, 'aria-label': t('dashboardBoard.cardTitle') }"
                @update:value="titleDirty = true"
                @keydown="titleKeydown"
              />
            </NFormItem>
          </DashboardMenuBranch>
          <DashboardMenuBranch
            id="card-color"
            :owner="menuId"
            :label="t('dashboardBoard.colorTab')"
            icon="palette"
            :show="openPath.includes('card-color')"
            @open="openBranch(['card-settings', 'card-color'], $event)"
            @keydown="keydown"
            @settled="revealFocusedMenuItem"
          >
            <DashboardAppearanceOptions
              v-if="panel && cardTone"
              section="color"
              :tone="cardTone"
              :entrance="panel.entrance ?? boardEntrance"
              :tone-inherited="panel.tone === undefined"
              :preview-enabled="previewEnabled"
              @update:tone="emit('card-tone', cardId, $event)"
              @reset:tone="emit('reset-tone', cardId)"
            />
          </DashboardMenuBranch>
          <DashboardMenuBranch
            id="card-motion"
            :owner="menuId"
            :label="t('dashboardBoard.motionTab')"
            icon="sparkles"
            :show="openPath.includes('card-motion')"
            @open="openBranch(['card-settings', 'card-motion'], $event)"
            @keydown="keydown"
            @settled="revealFocusedMenuItem"
          >
            <DashboardAppearanceOptions
              v-if="panel && cardTone"
              section="motion"
              :tone="cardTone"
              :entrance="panel.entrance ?? boardEntrance"
              :entrance-inherited="panel.entrance === undefined"
              :preview-enabled="previewEnabled"
              @update:entrance="updateCardEntrance"
              @reset:entrance="emit('reset-entrance', cardId, $event)"
            />
          </DashboardMenuBranch>
          <DashboardMenuBranch
            v-if="panel?.type === 'capabilities'"
            id="card-destinations"
            :owner="menuId"
            :label="t('dashboardBoard.destinations')"
            icon="compass"
            :show="openPath.includes('card-destinations')"
            @open="openBranch(['card-settings', 'card-destinations'], $event)"
            @keydown="keydown"
            @settled="revealFocusedMenuItem"
          >
            <div
              v-for="option in destinations"
              :key="option.value"
              class="flex min-w-0 items-center gap-component-unit"
              role="none"
            >
              <NButton
                class="wb-dashboard-context-action wb-dashboard-choice flex-1 min-w-0"
                type="primary"
                quaternary
                size="small"
                :theme-overrides="menuActionTheme"
                v-bind="
                  {
                    role: 'menuitemcheckbox',
                    tabindex: -1,
                    'aria-checked': option.selected,
                  } satisfies ButtonHTMLAttributes
                "
                @click="emit('toggle-destination', cardId, option.value, !option.selected)"
              >
                <template #icon>
                  <span
                    :class="option.selected ? 'i-lucide-check' : 'i-lucide-plus'"
                    aria-hidden="true"
                  />
                </template>
                <span>{{ option.label }}</span>
              </NButton>
              <template v-if="option.selected">
                <NButton
                  type="primary"
                  size="small"
                  quaternary
                  :theme-overrides="actionTheme"
                  :disabled="option.index === 0"
                  v-bind="
                    {
                      role: 'menuitem',
                      tabindex: -1,
                      'aria-label': `${t('dashboardBoard.earlier')} · ${option.label}`,
                    } satisfies ButtonHTMLAttributes
                  "
                  @click="emit('reorder-destination', cardId, option.index, -1)"
                >
                  <span
                    class="i-lucide-arrow-up"
                    aria-hidden="true"
                  />
                </NButton>
                <NButton
                  type="primary"
                  size="small"
                  quaternary
                  :theme-overrides="actionTheme"
                  :disabled="option.isLast"
                  v-bind="
                    {
                      role: 'menuitem',
                      tabindex: -1,
                      'aria-label': `${t('dashboardBoard.later')} · ${option.label}`,
                    } satisfies ButtonHTMLAttributes
                  "
                  @click="emit('reorder-destination', cardId, option.index, 1)"
                >
                  <span
                    class="i-lucide-arrow-down"
                    aria-hidden="true"
                  />
                </NButton>
              </template>
            </div>
          </DashboardMenuBranch>
        </DashboardMenuBranch>
        <NButton
          v-if="editing"
          class="wb-dashboard-context-action"
          data-dashboard-danger="true"
          block
          type="error"
          quaternary
          size="small"
          :theme-overrides="menuIconTheme"
          :disabled="readFailure"
          v-bind="
            {
              role: 'menuitem',
              tabindex: -1,
              onPointerenter: (event: PointerEvent) => collapseBelow([], event),
            } satisfies ButtonHTMLAttributes
          "
          @click="select('remove')"
        >
          <template #icon>
            <span
              class="i-lucide-trash-2"
              aria-hidden="true"
            />
          </template>
          <span>{{ t('dashboardBoard.remove') }}</span>
        </NButton>
      </template>
      <template v-if="readFailure">
        <NButton
          class="wb-dashboard-context-action"
          block
          type="warning"
          quaternary
          size="small"
          v-bind="
            {
              role: 'menuitem',
              tabindex: -1,
              onPointerenter: (event: PointerEvent) => collapseBelow([], event),
            } satisfies ButtonHTMLAttributes
          "
          @click="select('retry-read')"
        >
          {{ t('dashboardBoard.retryRead') }}
        </NButton>
        <NButton
          class="wb-dashboard-context-action"
          block
          type="warning"
          quaternary
          size="small"
          v-bind="
            {
              role: 'menuitem',
              tabindex: -1,
              onPointerenter: (event: PointerEvent) => collapseBelow([], event),
            } satisfies ButtonHTMLAttributes
          "
          @click="select('replace-invalid')"
        >
          {{ t('dashboardBoard.replaceInvalid') }}
        </NButton>
      </template>
      <NButton
        v-if="saveFailure"
        class="wb-dashboard-context-action"
        block
        type="warning"
        quaternary
        size="small"
        v-bind="
          {
            role: 'menuitem',
            tabindex: -1,
            onPointerenter: (event: PointerEvent) => collapseBelow([], event),
          } satisfies ButtonHTMLAttributes
        "
        @click="select('retry-save')"
      >
        {{ t('dashboardBoard.saveFailed') }}
      </NButton>
    </div>
  </NPopover>
</template>
