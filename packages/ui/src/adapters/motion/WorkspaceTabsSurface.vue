<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { AnimatePresence as MotionAnimatePresence, M, m } from 'motion-v'
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type TransitionProps,
  computed,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue'
import {
  createMotionFeatureRuntime,
  createMotionInterruptionOwner,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
} from './motion-feature-runtime'

import { projectMotionPolicy } from './motion-policy'

import { pavpOverlayTargetKey } from '../naive/pavp-naive-runtime-context'
import type { UiWorkspaceTab } from '../../components/contracts'
import { NDropdown as NaiveDropdown, type DropdownOption } from 'naive-ui/es/dropdown'
import { NButton as NaiveButton } from 'naive-ui/es/button'
import UiScrollArea from '../../components/UiScrollArea.vue'
import type { UiScrollController } from '../../components/scroll-contracts'

// Narrow native-root contracts: vendor props remain intact; no arbitrary attributes admitted.
const NButton = NaiveButton as typeof NaiveButton &
  (new () => {
    $props: Pick<
      ButtonHTMLAttributes,
      | 'aria-label'
      | 'aria-selected'
      | 'aria-controls'
      | 'aria-haspopup'
      | 'aria-expanded'
      | 'id'
      | 'role'
      | 'tabindex'
      | 'onFocus'
      | 'onKeydown'
    >
  })
const NDropdown = NaiveDropdown as typeof NaiveDropdown &
  (new () => {
    $props: Pick<HTMLAttributes, 'id' | 'role' | 'tabindex' | 'aria-labelledby' | 'onKeydown'>
  })
// AnimatePresence inherits these hooks onto Vue Transition/TransitionGroup.
const AnimatePresence = MotionAnimatePresence as typeof MotionAnimatePresence &
  (new () => { $props: Pick<TransitionProps, 'onBeforeEnter' | 'onBeforeLeave'> })

defineOptions({ name: 'WorkspaceTabsSurface' })
const overlayTarget = inject(pavpOverlayTargetKey, '#pavp-overlay-root')

const props = defineProps<{
  readonly motion: EffectiveAppearanceState['motion']
  readonly items: readonly UiWorkspaceTab[]
  readonly activeId: string | null
  readonly label: string
  readonly previousLabel: string
  readonly nextLabel: string
  readonly overflowLabel: string
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
const overflowButtonId = `${groupId}-overflow`
const overflowAnchor = ref({ open: false, x: 0, y: 0 })
let overflowCaller: HTMLElement | null = null
const overflowing = ref(false)
const clippedEdge = ref<'left' | 'right' | 'both'>()
function closeOverflowMenu(): void {
  if (overflowAnchor.value.open) overflowAnchor.value = { ...overflowAnchor.value, open: false }
}
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
function overflowOption(item: UiWorkspaceTab): DropdownOption {
  return {
    key: item.id,
    label: () =>
      h('span', { class: 'pavp-workspace-tabs-overflow__row' }, [
        h('span', { class: 'pavp-workspace-tabs-overflow__name' }, item.label),
        item.closable
          ? h(
              'button',
              {
                type: 'button',
                class: 'pavp-workspace-tabs-overflow__close',
                'aria-label': item.closeLabel,
                onClick: (event: MouseEvent) => {
                  event.preventDefault()
                  event.stopPropagation()
                  closeOverflowTab(item.id)
                },
              },
              [
                h('span', {
                  class: 'i-lucide-x pavp-workspace-tabs-overflow__icon',
                  'aria-hidden': 'true',
                }),
              ],
            )
          : null,
      ]),
    ...(item.id === props.activeId
      ? {
          icon: () =>
            h('span', {
              class: 'i-lucide-check pavp-workspace-tabs-overflow__icon',
              'aria-hidden': 'true',
            }),
        }
      : {}),
    props: {
      role: 'menuitem',
      tabindex: -1,
      'data-tab-id': item.id,
      class: item.id === props.activeId ? 'pavp-workspace-tabs-overflow__current' : undefined,
    } as HTMLAttributes,
  }
}
const overflowOptions = computed<DropdownOption[]>(() => props.items.map(overflowOption))
const menuOptions = computed<DropdownOption[]>(() =>
  overflowAnchor.value.open ? overflowOptions.value : contextOptions.value,
)
const menuVisible = computed(() => contextMenu.value.id !== null || overflowAnchor.value.open)
const menuX = computed(() =>
  contextMenu.value.id !== null ? contextMenu.value.x : overflowAnchor.value.x,
)
const menuY = computed(() =>
  contextMenu.value.id !== null ? contextMenu.value.y : overflowAnchor.value.y,
)
const menuLabelledBy = computed(() => {
  if (contextMenu.value.id !== null) return `${contextMenu.value.id}-tab`
  if (overflowAnchor.value.open) return overflowButtonId
  return undefined
})
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
  closeOverflowMenu()
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
function restoreOverflowCaller(): void {
  if (overflowCaller?.isConnected === true && overflowCaller.closest('[inert]') === null)
    overflowCaller.focus({ preventScroll: true })
}
function handleMenuKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || isComposingKey(event)) return
  const menu = event.currentTarget
  const contextOpen = contextMenu.value.id !== null
  const overflowOpen = overflowAnchor.value.open
  if (!(menu instanceof HTMLElement) || (!contextOpen && !overflowOpen)) return
  if (event.key === 'Tab') {
    // Resume native traversal at the caller, not at the teleported overlay root.
    if (overflowOpen) restoreOverflowCaller()
    else restoreContextCaller()
    closeContextMenu()
    closeOverflowMenu()
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (overflowOpen) restoreOverflowCaller()
    else restoreContextCaller()
    closeContextMenu()
    closeOverflowMenu()
    return
  }
  if (overflowOpen && (event.key === 'Delete' || event.key === 'Backspace')) {
    const current = document.activeElement
    const id = current instanceof HTMLElement ? current.dataset['tabId'] : undefined
    const item = id === undefined ? undefined : props.items.find((entry) => entry.id === id)
    if (!item?.closable) return
    event.preventDefault()
    event.stopPropagation()
    closeOverflowTab(item.id)
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
  closeOverflowMenu()
}
function selectContextAction(key: string | number): void {
  const item = contextItem.value
  restoreContextCaller()
  closeContextMenu()
  if (item === undefined) return
  if (key === 'refresh' && item.refreshable) emit('refresh', item.id)
  else if (key === 'close' && item.closable) emit('close', item.id)
}
function closeOverflowTab(id: string): void {
  emit('close', id)
  void nextTick(() => {
    if (!overflowAnchor.value.open) return
    const menu = document.getElementById(menuId)
    const option = menu?.querySelector<HTMLElement>('[role="menuitem"]')
    if (option !== null && option !== undefined) option.focus({ preventScroll: true })
    else restoreOverflowCaller()
  })
}
function openOverflowFromKey(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  openOverflowMenu(event)
}
function openOverflowMenu(event: MouseEvent | KeyboardEvent): void {
  const target =
    event.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : event.target instanceof Element
        ? event.target.closest('button')
        : null
  if (target === null || !overflowing.value) return
  event.preventDefault()
  event.stopPropagation()
  closeContextMenu()
  const bounds = target.getBoundingClientRect()
  overflowCaller = target
  const point = { x: bounds.left + bounds.width / 2, y: bounds.bottom }
  // Open after the triggering click so the menu's outside-press does not close it immediately.
  void nextTick(() => {
    if (overflowCaller !== target || !overflowing.value) return
    overflowAnchor.value = { open: true, ...point }
    void nextTick(() => {
      if (!overflowAnchor.value.open) return
      document
        .getElementById(menuId)
        ?.querySelector<HTMLElement>('[role="menuitem"]')
        ?.focus({ preventScroll: true })
    })
  })
}
function selectMenuAction(key: string | number): void {
  if (!overflowAnchor.value.open) {
    selectContextAction(key)
    return
  }
  const id = String(key)
  restoreOverflowCaller()
  closeOverflowMenu()
  if (props.items.some((item) => item.id === id)) activateTab(id)
}
watch(
  contextItem,
  (item) => {
    if (item === undefined) closeContextMenu()
  },
  { flush: 'sync' },
)
function dismissOpenMenus(): void {
  closeContextMenu()
  closeOverflowMenu()
}
watch(overflowing, (value) => {
  if (!value) closeOverflowMenu()
})
watch(() => props.activeId, dismissOpenMenus, { flush: 'sync' })
onBeforeUnmount(dismissOpenMenus)
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
const indicator = ref<{
  readonly x: number
  readonly width: number
  readonly animated: boolean
} | null>(null)
let measuredIndicatorId: string | null = null
let geometryObserver: ResizeObserver | undefined
const indicatorTransition = computed(() => {
  if (indicator.value?.animated !== true || !full.value) return { duration: 0 }
  return transition.value.layout ?? { duration: transition.value.duration }
})
const interruption = createMotionInterruptionOwner(() => policy.value)
watch(
  () => props.motion,
  () => {
    interruption.settle(policy.value)
  },
  { flush: 'sync' },
)

function measureIndicator(): { readonly x: number; readonly width: number } | null {
  const root = strip.value
  const id = props.activeId
  if (root === undefined || id === null) return null
  const button = findTabButton(id)
  const item = button?.closest<HTMLElement>('.pavp-workspace-tabs__item') ?? null
  if (item === null || !root.contains(item)) return null
  const rootBox = root.getBoundingClientRect()
  const itemBox = item.getBoundingClientRect()
  if (itemBox.width < 1 || rootBox.width < 1) return null
  const rtl = getComputedStyle(root).direction === 'rtl'
  // Strip and tab share scroll, sidebar, and font-scale movement, so this delta stays on the tab.
  const x = rtl ? itemBox.right - rootBox.right : itemBox.left - rootBox.left
  return { x, width: itemBox.width }
}
function syncIndicator(): void {
  const next = measureIndicator()
  const id = props.activeId
  if (next === null && id !== null) return
  const selectionChanged = measuredIndicatorId !== id
  measuredIndicatorId = id
  if (next === null) {
    indicator.value = null
    return
  }
  const current = indicator.value
  if (
    current !== null &&
    Math.abs(current.x - next.x) <= 0.5 &&
    Math.abs(current.width - next.width) <= 0.5
  )
    return
  indicator.value = { ...next, animated: current !== null && selectionChanged && full.value }
}
function tabScrollport(): HTMLElement | undefined {
  const root = viewport.value
  return root?.querySelector<HTMLElement>('.pavp-scroll-area__viewport') ?? root ?? undefined
}
function measureOverflow(): void {
  const port = tabScrollport()
  const maximum = port === undefined ? 0 : Math.max(0, port.scrollWidth - port.clientWidth)
  overflowing.value = maximum > 1
  if (!overflowing.value || port === undefined || strip.value === undefined) {
    clippedEdge.value = undefined
    return
  }
  const rtl = getComputedStyle(port).direction === 'rtl'
  const offset = Math.min(maximum, Math.max(0, rtl ? -port.scrollLeft : port.scrollLeft))
  const left = rtl ? offset < maximum - 1 : offset > 1
  const right = rtl ? offset > 1 : offset < maximum - 1
  clippedEdge.value = left && right ? 'both' : left ? 'left' : right ? 'right' : undefined
}
function revealTab(button: HTMLElement, behavior: 'smooth' | 'instant' = 'smooth'): void {
  const owner = tabScrollport()
  const item = button.closest<HTMLElement>('.pavp-workspace-tabs__item')
  if (owner === undefined || item === null || strip.value?.contains(item) !== true) return
  const bounds = owner.getBoundingClientRect()
  const target = item.getBoundingClientRect()
  const rtl = getComputedStyle(owner).direction === 'rtl'
  let delta = 0
  if (target.width > bounds.width)
    delta = rtl ? target.right - bounds.right : target.left - bounds.left
  else if (target.left < bounds.left) delta = target.left - bounds.left
  else if (target.right > bounds.right) delta = target.right - bounds.right
  if (Math.abs(delta) >= 1) scrollController?.scrollBy({ left: delta, behavior })
}
function revealTabNeighbors(id: string): void {
  const owner = tabScrollport()
  const index = props.items.findIndex((item) => item.id === id)
  const button = findTabButton(id)
  const item = button?.closest<HTMLElement>('.pavp-workspace-tabs__item')
  if (owner !== undefined && index >= 0 && item !== undefined && item !== null) {
    const bounds = owner.getBoundingClientRect()
    const left = bounds.left + owner.clientLeft
    const right = left + owner.clientWidth
    const target = item.getBoundingClientRect()
    const neighbors = [props.items[index - 1], props.items[index + 1]]
      .map((neighbor) =>
        neighbor === undefined
          ? undefined
          : findTabButton(neighbor.id)
              ?.closest<HTMLElement>('.pavp-workspace-tabs__item')
              ?.getBoundingClientRect(),
      )
      .filter((neighbor): neighbor is DOMRect => neighbor !== undefined)
    let start = Math.min(target.left, ...neighbors.map((neighbor) => neighbor.left))
    let end = Math.max(target.right, ...neighbors.map((neighbor) => neighbor.right))
    if (end - start > owner.clientWidth) {
      const towardRight = (target.left + target.right) / 2 >= (left + right) / 2
      const neighbor = neighbors.find((candidate) =>
        towardRight ? candidate.left >= target.right : candidate.right <= target.left,
      )
      start = Math.min(target.left, neighbor?.left ?? target.left)
      end = Math.max(target.right, neighbor?.right ?? target.right)
      if (end - start > owner.clientWidth) {
        start = target.left
        end = target.right
      }
    }
    const delta = start < left ? start - left : end > right ? end - right : 0
    if (Math.abs(delta) >= 1) scrollController?.scrollBy({ left: delta, behavior: 'smooth' })
  }
}
let revealFrame: number | undefined
let pendingRevealId: string | undefined
let interruptedRevealId: string | undefined
let revealGeneration = 0
let viewportRevealFrame: number | undefined
let viewportRevealInterrupted = false
let observedViewportWidth: number | undefined
function cancelTabReveal(): void {
  revealGeneration += 1
  if (viewportRevealFrame !== undefined) viewportRevealInterrupted = true
  if (pendingRevealId !== undefined) interruptedRevealId = pendingRevealId
  pendingRevealId = undefined
  if (revealFrame !== undefined) {
    cancelAnimationFrame(revealFrame)
    revealFrame = undefined
  }
}
function scheduleTabReveal(id: string): void {
  if (revealFrame !== undefined) cancelAnimationFrame(revealFrame)
  revealFrame = requestAnimationFrame(() => {
    revealFrame = requestAnimationFrame(() => {
      revealFrame = undefined
      if (props.activeId === id) revealTabNeighbors(id)
    })
  })
}
function activateTab(id: string): void {
  cancelTabReveal()
  interruptedRevealId = undefined
  const current = id === props.activeId
  pendingRevealId = current ? undefined : id
  emit('activate', id)
  if (current) scheduleTabReveal(id)
}
function scheduleViewportReveal(): void {
  if (viewportRevealFrame !== undefined) return
  viewportRevealInterrupted = false
  let previousWidth = -1
  let previousOffset = Number.NaN
  let stableFrames = 0
  const check = (): void => {
    const port = tabScrollport()
    if (port === undefined || port.clientWidth < 1) {
      viewportRevealFrame = undefined
      return
    }
    const width = port.clientWidth
    const offset = port.scrollLeft
    stableFrames = width === previousWidth && offset === previousOffset ? stableFrames + 1 : 0
    previousWidth = width
    previousOffset = offset
    if (stableFrames < 4) {
      viewportRevealFrame = requestAnimationFrame(check)
      return
    }
    viewportRevealFrame = undefined
    if (viewportRevealInterrupted || props.activeId === null) return
    const button = findTabButton(props.activeId)
    if (button !== null) revealTab(button)
  }
  viewportRevealFrame = requestAnimationFrame(check)
}
function observeGeometry(): void {
  geometryObserver ??= new ResizeObserver(() => {
    const port = tabScrollport()
    const width = port?.clientWidth
    if (
      width !== undefined &&
      width > 0 &&
      observedViewportWidth !== undefined &&
      width < observedViewportWidth
    )
      scheduleViewportReveal()
    if (width !== undefined && width > 0) observedViewportWidth = width
    syncIndicator()
    measureOverflow()
  })
  geometryObserver.disconnect()
  const port = tabScrollport()
  if (port !== undefined) geometryObserver.observe(port)
  if (strip.value !== undefined) {
    geometryObserver.observe(strip.value)
    for (const item of strip.value.querySelectorAll<HTMLElement>('.pavp-workspace-tabs__item'))
      geometryObserver.observe(item)
  }
}
function setStrip(value: unknown): void {
  interruption.bind('strip', value)
  const nextStrip =
    value !== null &&
    typeof value === 'object' &&
    '$el' in value &&
    value.$el instanceof HTMLElement
      ? value.$el
      : undefined
  if (strip.value === nextStrip) return
  strip.value = nextStrip
  void nextTick(() => {
    observeGeometry()
    syncIndicator()
    measureOverflow()
  })
}
function retireTab(element: Element): void {
  if (!(element instanceof HTMLElement)) return
  element.inert = true
  if (element.dataset['hideOnExit'] === 'true') {
    element.classList.add('invisible')
    element.setAttribute('aria-hidden', 'true')
  }
}
function revealEnteringTab(element: Element): void {
  if (!(element instanceof HTMLElement)) return
  element.inert = false
  if (element.dataset['hideOnExit'] === 'true') {
    element.classList.remove('invisible')
    element.removeAttribute('aria-hidden')
  }
}
onMounted(() => {
  void startAfterStableMount()
  void nextTick(() => {
    observeGeometry()
    syncIndicator()
    measureOverflow()
  })
})
onBeforeUnmount(() => {
  geometryObserver?.disconnect()
  cancelTabReveal()
  if (viewportRevealFrame !== undefined) cancelAnimationFrame(viewportRevealFrame)
  interruption.dispose(projectMotionPolicy('none'))
  dispose()
})

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
  cancelTabReveal()
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
    activateTab(id)
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
    const caller =
      menu?.contains(focused) === true
        ? overflowAnchor.value.open
          ? null
          : contextCaller
        : focused
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
  () =>
    props.items
      .map((item) => `${item.id}\u0000${item.label}\u0000${String(item.closable)}`)
      .join('\n'),
  async () => {
    await nextTick()
    observeGeometry()
    syncIndicator()
    measureOverflow()
  },
)
watch(
  () => props.activeId,
  async (id, previousId) => {
    const generation = revealGeneration
    await nextTick()
    if (id !== props.activeId) return
    syncIndicator()
    if (generation !== revealGeneration) return
    const reveal =
      id !== null && id !== interruptedRevealId && (id === pendingRevealId || previousId !== null)
    pendingRevealId = undefined
    interruptedRevealId = undefined
    if (reveal) {
      await nextTick()
      if (id === props.activeId && generation === revealGeneration) scheduleTabReveal(id)
    }
  },
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
              @click="previousTab !== undefined && activateTab(previousTab.id)"
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
          <div class="pavp-workspace-tabs-viewport">
            <div
              ref="viewport"
              class="pavp-workspace-tabs-scroller"
              :data-clipped-edge="clippedEdge"
              @pointerdown.capture="cancelTabReveal"
              @scroll.capture.passive="measureOverflow"
              @wheel.capture.passive="cancelTabReveal"
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
                  <m.div
                    v-if="indicator !== null"
                    class="pavp-workspace-tabs__lens"
                    role="presentation"
                    aria-hidden="true"
                    :initial="false"
                    :animate="{ x: indicator.x, width: indicator.width }"
                    :transition="indicatorTransition"
                  />
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
                      :data-hide-on-exit="item.hideOnExit"
                      :initial="featureReady && motion !== 'none' ? entering : false"
                      :variants="{ rest: { ...resting, y: 0 } }"
                      animate="rest"
                      while-hover="hover"
                      while-press="press"
                      :exit="leaving"
                      :transition="transition"
                      @contextmenu.prevent="
                        openContextMenu(item.id, $event.clientX, $event.clientY)
                      "
                      @keydown="handleContextMenuKeydown(item.id, $event)"
                    >
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
                        @click="activateTab(item.id)"
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
            <NButton
              v-if="overflowing"
              :id="overflowButtonId"
              attr-type="button"
              text
              class="pavp-workspace-tabs-edge"
              :aria-label="overflowLabel"
              aria-haspopup="menu"
              :aria-expanded="overflowAnchor.open"
              :aria-controls="menuId"
              native-focus-behavior
              @click.stop="openOverflowMenu"
              @keydown="openOverflowFromKey"
            >
              <span
                class="pavp-workspace-tabs-edge__mark"
                aria-hidden="true"
              >
                <span class="pavp-workspace-tabs-edge__icon i-lucide-list" />
              </span>
            </NButton>
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
              @click="nextTab !== undefined && activateTab(nextTab.id)"
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
    :aria-labelledby="menuLabelledBy"
    trigger="manual"
    :keyboard="false"
    scrollable
    size="large"
    :to="overlayTarget"
    :show="menuVisible"
    :x="menuX"
    :y="menuY"
    :options="menuOptions"
    @update:show="updateContextMenu"
    @clickoutside="dismissContextMenu"
    @select="selectMenuAction"
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
    background-color: var(--pavp-region-background, var(--ui-color-surface-panel));
    border-radius: var(--ui-radius-panel);
    padding-block: var(--ui-space-component-unit);
  }
  .pavp-workspace-tabs-region:dir(rtl) {
    padding-inline-start: var(--pavp-safe-area-right);
    padding-inline-end: var(--pavp-safe-area-left);
  }
  .pavp-workspace-tabs-viewport {
    display: flex;
    align-items: center;
    min-inline-size: 0;
    flex: 1 1 0;
  }
  .pavp-workspace-tabs-scroller {
    container-type: inline-size;
    flex: 1 1 auto;
    min-inline-size: 0;
  }
  @media (forced-colors: none) {
    .pavp-workspace-tabs-scroller[data-clipped-edge='left']:not(:has(:focus-visible)) {
      mask-image: linear-gradient(to right, transparent, currentColor var(--ui-space-page-inline));
    }
    .pavp-workspace-tabs-scroller[data-clipped-edge='right']:not(:has(:focus-visible)) {
      mask-image: linear-gradient(to left, transparent, currentColor var(--ui-space-page-inline));
    }
    .pavp-workspace-tabs-scroller[data-clipped-edge='both']:not(:has(:focus-visible)) {
      mask-image: linear-gradient(
        to right,
        transparent,
        currentColor var(--ui-space-page-inline),
        currentColor calc(100% - var(--ui-space-page-inline)),
        transparent
      );
    }
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
    border-radius: var(--ui-radius-control);
    background: transparent;
    color: var(--pavp-region-foreground, var(--ui-color-text-secondary));
    cursor: pointer;
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
    gap: var(--ui-space-field-gap);
    color: var(--pavp-region-foreground, var(--ui-color-text-secondary));
  }
  .pavp-workspace-tabs__item {
    border-radius: var(--ui-radius-control);
    position: relative;
    isolation: isolate;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    max-inline-size: 100cqi;
    min-inline-size: 0;
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
    display: block;
    overflow: hidden;
    min-inline-size: calc(var(--ui-font-size-body) * 2);
    max-inline-size: calc(var(--ui-control-height) * 6);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pavp-workspace-tabs .pavp-workspace-tabs__tab {
    border-radius: inherit;
    flex: 1 1 auto;
    min-inline-size: 0;
  }
  .pavp-workspace-tabs__item[data-closable='true'] .pavp-workspace-tabs__tab {
    border-start-end-radius: 0;
    padding-inline-end: 0;
    text-align: end;
  }
  .pavp-workspace-tabs__lens {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    border-radius: var(--ui-radius-control);
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
    inset-inline: var(--ui-space-content-gap);
    border-radius: var(--ui-radius-small);
    /* Keep the active marker above the shared horizontal scroll rail. */
    inset-block-end: calc(var(--ui-space-content-gap) / 6);
    block-size: var(--ui-admin-focus-width);
    background: var(--ui-admin-navigation-selected);
    pointer-events: none;
  }
  .pavp-workspace-tabs .pavp-workspace-tabs__close {
    border-radius: var(--ui-radius-small);
    flex: 0 0 auto;
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
  .pavp-workspace-context-menu :deep([role='menuitem']:focus-visible),
  .pavp-workspace-context-menu :deep(.pavp-workspace-tabs-overflow__close:focus-visible) {
    outline: none;
    box-shadow: var(--ui-admin-shadow-focus-ring);
  }
  .pavp-workspace-context-menu :deep(.pavp-workspace-tabs-overflow__row) {
    display: flex;
    align-items: center;
    gap: var(--ui-space-content-gap);
    min-inline-size: 0;
  }
  .pavp-workspace-context-menu :deep(.pavp-workspace-tabs-overflow__name) {
    overflow: hidden;
    flex: 1 1 auto;
    min-inline-size: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pavp-workspace-context-menu :deep(.pavp-workspace-tabs-overflow__current) {
    color: var(--ui-color-text-primary);
  }
  .pavp-workspace-context-menu :deep(.pavp-workspace-tabs-overflow__close) {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    padding: var(--ui-space-content-gap);
    border: 0;
    border-radius: var(--ui-radius-small);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .pavp-workspace-context-menu :deep(.pavp-workspace-tabs-overflow__icon) {
    inline-size: var(--ui-font-size-body);
    block-size: var(--ui-font-size-body);
  }
  @media (forced-colors: active) {
    .pavp-workspace-tabs [aria-selected='true'] {
      outline: var(--ui-admin-border-width) solid Highlight;
      outline-offset: calc(var(--ui-admin-border-width) * -1);
    }
    .pavp-workspace-tabs button:focus-visible,
    .pavp-workspace-tabs-edge:focus-visible,
    .pavp-workspace-context-menu:focus-visible,
    .pavp-workspace-context-menu :deep([role='menuitem']:focus-visible),
    .pavp-workspace-context-menu :deep(.pavp-workspace-tabs-overflow__close:focus-visible) {
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
  min-inline-size: 0;
}
.pavp-workspace-tabs__tab.n-button :deep(.n-button__content) {
  display: block;
  overflow: hidden;
  min-inline-size: 0;
  max-inline-size: 100%;
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
  color: var(--pavp-region-foreground, var(--ui-color-text-secondary));
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
