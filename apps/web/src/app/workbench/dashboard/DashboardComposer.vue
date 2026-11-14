<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  useId,
  watch,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCheckbox } from 'naive-ui/es/checkbox'
import { NEmpty } from 'naive-ui/es/empty'
import { NInput } from 'naive-ui/es/input'
import { NFormItem } from 'naive-ui/es/form'
import {
  UiDashboardGrid,
  UiScrollArea,
  responsiveLayoutConsoleProjection,
  useUiMotion,
  type UiMotionHandle,
  type UiMotionPreset,
  type UiDashboardGridHandle,
  type UiScrollController,
} from '@platform/ui'
import { useDashboard } from '../../dashboard/use-dashboard'
import {
  dashboardDestinationLabels,
  dashboardDestinations,
  dashboardPresetTones,
  defaultDashboardDestinations,
  type DashboardDestination,
  type DashboardEntrance,
  type DashboardTone,
  type DashboardPanel,
} from '../../dashboard/dashboard-contract'
import { useRouteRevealBoundary } from '../../router/route-transition/route-motion-player'
import { useAppearanceReadBoundary } from '../../appearance/appearance-read-boundary'
import { useConsoleI18n } from '../../../shared/i18n'
import { useDashboardActionTheme, useDashboardCheckboxTheme } from './use-dashboard-action-theme'
import DashboardWidget from './DashboardWidget.vue'
import DashboardContextMenu from './DashboardContextMenu.vue'
import DashboardAppearanceOptions from './DashboardAppearanceOptions.vue'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
defineProps<{ readonly title: string }>()
const { t } = useConsoleI18n()
const actionTheme = useDashboardActionTheme()
const checkboxTheme = useDashboardCheckboxTheme()
const motion = useUiMotion()
const reveal = useRouteRevealBoundary()
const appearance = useAppearanceReadBoundary()
const registerScroll = inject(routerScrollControllerKey)
let unregisterScroll: (() => void) | undefined
let active = true
const currentScroll = shallowRef<UiScrollController | null>(null)
function connectScroll(controller: UiScrollController | null): void {
  currentScroll.value = controller
  unregisterScroll?.()
  unregisterScroll = controller && active ? registerScroll?.(controller) : undefined
}
onActivated(() => {
  const returning = !active
  active = true
  connectScroll(currentScroll.value)
  if (returning) void playBoardArrival()
})
onDeactivated(() => {
  active = false
  unregisterScroll?.()
  unregisterScroll = undefined
})
onScopeDispose(() => {
  connectScroll(null)
})
const board = useDashboard()
const editing = ref(false)
const host = ref<HTMLElement>()
const grid = ref<UiDashboardGridHandle>()
const dashboardViewport = shallowRef<HTMLElement | null>(null)
const mode = ref<'wide' | 'narrow'>('wide')
const rejected = ref(false)
const context = shallowRef<{
  x: number
  y: number
  cardId?: string | undefined
  caller: HTMLElement | null
  pointer: boolean
} | null>(null)
type Inspector = 'appearance' | 'properties' | 'library' | 'layout'
const inspector = ref<Inspector>()
const inspectorOpen = ref(false)
const inspectorCaller = shallowRef<HTMLElement | null>(null)
const inspectorElement = ref<HTMLElement>()
const inspectorTitleId = useId()
const propertyTitleId = useId()
watch(inspectorElement, (element, _previous, onCleanup) => {
  if (!element) return
  const closeWithEscape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return
    event.preventDefault()
    event.stopPropagation()
    setInspectorOpen(false)
  }
  element.addEventListener('keydown', closeWithEscape)
  onCleanup(() => {
    element.removeEventListener('keydown', closeWithEscape)
  })
})
let inspectorOffset: ReturnType<UiScrollController['readOffset']> | undefined
const motionSample = ref<HTMLElement>()
const showMotionSample = ref(false)
const inspectorTitle = computed(() => {
  if (inspector.value === 'properties' && propertyPanel.value) return cardTitle(propertyPanel.value)
  if (inspector.value === 'library') return t('dashboardBoard.add')
  if (inspector.value === 'layout') return t('dashboardBoard.layoutTools')
  return t('dashboardBoard.appearanceStyle')
})
async function openInspector(kind: Inspector, caller: HTMLElement | null): Promise<void> {
  if (!inspectorOpen.value) inspectorOffset = currentScroll.value?.readOffset()
  showMotionSample.value = false
  inspectorCaller.value = caller
  inspector.value = kind
  inspectorOpen.value = true
  await nextTick()
  inspectorElement.value?.focus({ preventScroll: true })
  if (kind === 'properties' && propertyPanel.value) revealPanel(propertyPanel.value)
}
function setInspectorOpen(show: boolean): void {
  if (!show && inspectorOpen.value) {
    if (propertyPanel.value) commitTitle(propertyPanel.value)
    clearArrivals()
  }
  inspectorOpen.value = show
}
async function clearInspector(): Promise<void> {
  if (inspectorOpen.value) return
  inspector.value = undefined
  propertyPanel.value = undefined
  const caller = inspectorCaller.value
  const offset = inspectorOffset
  inspectorCaller.value = null
  inspectorOffset = undefined
  showMotionSample.value = false
  await nextTick()
  if (!active) return
  if (offset) currentScroll.value?.scrollTo({ ...offset, behavior: 'instant' })
  if (caller?.isConnected) caller.focus({ preventScroll: true })
}
const toneOverrides = computed(
  () => board.document.value.panels.filter((panel) => panel.tone !== undefined).length,
)
const entranceOverrides = computed(
  () => board.document.value.panels.filter((panel) => panel.entrance !== undefined).length,
)
function closeContext(): void {
  context.value = null
}
function isInteractiveContextTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'input, textarea, select, a, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]',
    ) !== null
  )
}
function contextCard(target: EventTarget | null): string | undefined {
  if (!(target instanceof Element)) return undefined
  const panel = target.closest<HTMLElement>('[data-dashboard-panel]')
  const id = panel?.dataset['dashboardPanel']
  return id && panels.value.has(id) ? id : undefined
}
function contextCaller(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>('[data-dashboard-panel], [data-dashboard-context-host]')
    : null
}
function openContext(event: MouseEvent): void {
  if (isInteractiveContextTarget(event.target) || document.getSelection()?.toString().trim()) {
    closeContext()
    return
  }
  context.value = {
    x: event.clientX,
    y: event.clientY,
    cardId: contextCard(event.target),
    caller: contextCaller(event.target),
    pointer: true,
  }
}
function contextKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || !(event.target instanceof HTMLElement)) return
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
  event.preventDefault()
  event.stopPropagation()
  const bounds = event.target.getBoundingClientRect()
  const cardId = contextCard(event.target)
  context.value = {
    x: bounds.left,
    y: bounds.top,
    ...(cardId ? { cardId } : {}),
    caller: event.target,
    pointer: false,
  }
}
function contextAction(
  action: 'edit' | 'finish' | 'properties' | 'remove' | 'add' | 'appearance' | 'layout',
): void {
  const cardId = context.value?.cardId
  const caller = context.value?.caller ?? null
  closeContext()
  if (board.readFailure.value) return
  if (inspectorOpen.value && ['properties', 'appearance', 'add', 'layout'].includes(action)) {
    if (propertyPanel.value) commitTitle(propertyPanel.value)
    propertyPanel.value = undefined
  }
  switch (action) {
    case 'edit':
      editing.value = true
      break
    case 'finish':
      editing.value = false
      break
    case 'remove':
      if (cardId) {
        board.remove(cardId)
        void nextTick(() =>
          dashboardViewport.value
            ?.closest<HTMLElement>('[data-dashboard-context-host]')
            ?.focus({ preventScroll: true }),
        )
      }
      break
    case 'properties':
      if (cardId) {
        propertyPanel.value = cardId
        propertyTitle.value = panels.value.get(cardId)?.title ?? ''
        void openInspector('properties', caller)
      }
      break
    case 'add':
      rejected.value = false
      void openInspector('library', caller)
      break
    case 'appearance':
      void openInspector('appearance', caller)
      break
    case 'layout':
      void openInspector('layout', caller)
  }
}
function closeOverlays(): void {
  closeContext()
  touchPressEnd()
  showMotionSample.value = false
  setInspectorOpen(false)
}
onDeactivated(closeOverlays)

let touchPress:
  { id: number; x: number; y: number; timer: ReturnType<typeof setTimeout> } | undefined
function touchPressStart(event: PointerEvent): void {
  if (event.pointerType !== 'touch' || !event.isPrimary || isInteractiveContextTarget(event.target))
    return
  touchPressEnd()
  const caller = contextCaller(event.target)
  if (!caller) return
  const cardId = contextCard(event.target)
  const { clientX: x, clientY: y } = event
  const timer = setTimeout(() => {
    touchPress = undefined
    if (caller.isConnected && !document.getSelection()?.toString().trim()) {
      context.value = { x, y, cardId, caller, pointer: true }
    }
  }, 500)
  touchPress = { id: event.pointerId, x, y, timer }
}
function touchPressMove(event: PointerEvent): void {
  if (
    touchPress?.id === event.pointerId &&
    Math.hypot(event.clientX - touchPress.x, event.clientY - touchPress.y) > 10
  )
    touchPressEnd()
}
function touchPressEnd(): void {
  if (touchPress) clearTimeout(touchPress.timer)
  touchPress = undefined
}
onScopeDispose(touchPressEnd)

const adjustedPanel = ref<string>()
const arrivalTimers = new Set<ReturnType<typeof setTimeout>>()
const arrivalMotions = new Set<UiMotionHandle>()
let arrivalGeneration = 0
function clearArrivals(): void {
  arrivalGeneration += 1
  showMotionSample.value = false
  for (const timer of arrivalTimers) clearTimeout(timer)
  arrivalTimers.clear()
  for (const animation of arrivalMotions) animation.cancel()
  arrivalMotions.clear()
}
onDeactivated(clearArrivals)
onScopeDispose(clearArrivals)
watch(editing, (value) => {
  if (value) clearArrivals()
})
function panelSurface(id: string): HTMLElement | undefined {
  return host.value?.querySelector<HTMLElement>(`[data-dashboard-panel="${id}"]`) ?? undefined
}
function revealPanel(id: string): void {
  const element = panelSurface(id)
  const viewport = dashboardViewport.value
  if (!element || !viewport || !currentScroll.value) return
  const frame = viewport.getBoundingClientRect()
  const target = element.getBoundingClientRect()
  const delta =
    target.top < frame.top || target.height > frame.height
      ? target.top - frame.top
      : Math.max(0, target.bottom - frame.bottom)
  if (delta) currentScroll.value.scrollBy({ top: delta, behavior: 'instant' })
}
function panelIsVisible(element: HTMLElement, fully = false): boolean {
  const viewport = dashboardViewport.value?.getBoundingClientRect()
  if (!viewport || !element.isConnected) return false
  const bounds = element.getBoundingClientRect()
  if (fully) {
    return (
      Math.floor(bounds.top) >= Math.floor(viewport.top) &&
      Math.ceil(bounds.bottom) <= Math.ceil(viewport.bottom) &&
      Math.floor(bounds.left) >= Math.floor(viewport.left) &&
      Math.ceil(bounds.right) <= Math.ceil(viewport.right)
    )
  }
  return (
    bounds.bottom > viewport.top &&
    bounds.top < viewport.bottom &&
    bounds.right > viewport.left &&
    bounds.left < viewport.right
  )
}
type DashboardMotion = Exclude<DashboardEntrance, 'balanced' | 'none'>
function arrive(element: HTMLElement, preset: DashboardMotion): void {
  if (!active || appearance.snapshot.value.motion !== 'full' || !panelIsVisible(element)) return
  playEntrance(element, preset)
}
function playEntrance(element: HTMLElement, preset: DashboardMotion): void {
  const animation = motion.play(element, { preset, phase: 'enter' })
  arrivalMotions.add(animation)
  void animation.finished.then(() => arrivalMotions.delete(animation))
}
const dashboardArrivals = {
  capabilities: 'curtain',
  notes: 'card-expand',
  clock: 'camera-push',
  chart: 'card-expand',
} as const satisfies Readonly<Record<DashboardPanel['type'], UiMotionPreset>>
const boardStyle = computed(() => board.document.value.style ?? 'theme')
const boardEntrance = computed(() => board.document.value.entrance ?? 'balanced')
const mayPlay = computed(() => appearance.snapshot.value.motion === 'full')
watch(mayPlay, (enabled) => {
  if (!enabled) clearArrivals()
})
function resolvedEntrance(panel: DashboardPanel) {
  const choice = panel.entrance ?? boardEntrance.value
  return choice === 'balanced' ? dashboardArrivals[panel.type] : choice
}
function playVisibleCards(scope: 'arrival' | 'preview'): boolean {
  const isPreview = scope === 'preview'
  clearArrivals()
  if (!active || !mayPlay.value) return false
  const visible = board.document.value.layouts[mode.value].flatMap(({ id }) => {
    const element = panelSurface(id)
    const panel = panels.value.get(id)
    if (
      !element ||
      !panel ||
      (isPreview && panel.entrance !== undefined) ||
      !panelIsVisible(element, isPreview)
    )
      return []
    const preset = resolvedEntrance(panel)
    return preset === 'none' ? [] : [{ element, preset }]
  })

  visible.forEach(({ element, preset }, index) => {
    if (!isPreview || index === 0) {
      arrive(element, preset)
      return
    }
    const timer = setTimeout(() => {
      arrivalTimers.delete(timer)
      arrive(element, preset)
    }, index * 100)
    arrivalTimers.add(timer)
  })
  return visible.length > 0
}
async function playBoardArrival(): Promise<void> {
  const generation = arrivalGeneration
  await nextTick()
  await reveal.whenRevealed()
  if (generation !== arrivalGeneration || editing.value) return
  playVisibleCards('arrival')
}
onMounted(() => {
  void playBoardArrival()
})
async function previewSample(preset: DashboardMotion): Promise<void> {
  const generation = arrivalGeneration
  showMotionSample.value = true
  await nextTick()
  if (generation === arrivalGeneration && inspectorOpen.value && motionSample.value) {
    playEntrance(motionSample.value, preset)
  }
}
function previewCard(id: string): void {
  clearArrivals()
  if (!active || !mayPlay.value || !inspectorOpen.value) return
  const panel = panels.value.get(id)
  if (!panel) return
  const preset = resolvedEntrance(panel)
  if (preset === 'none') return
  const element = panelSurface(id)
  if (element && panelIsVisible(element, true)) arrive(element, preset)
  else void previewSample(preset)
}
function chooseBoardEntrance(entrance: DashboardEntrance): void {
  board.setEntrance(entrance)
  if (!playVisibleCards('preview') && active && mayPlay.value && entrance !== 'none') {
    void previewSample(entrance === 'balanced' ? dashboardArrivals.capabilities : entrance)
  }
}
const propertyPanel = ref<string>()
const propertyTitle = ref('')
function commitTitle(id: string): void {
  const panel = panels.value.get(id)
  if (!panel) return
  const next = { ...panel }
  const title = propertyTitle.value.trim()
  if (title) next.title = title
  else delete next.title
  board.updatePanel(next)
}
function tone(id: string): DashboardTone {
  const panel = panels.value.get(id)
  return panel ? (panel.tone ?? dashboardPresetTones[boardStyle.value][panel.type]) : 'theme'
}
function setTone(id: string, tone: DashboardTone): void {
  const panel = panels.value.get(id)
  if (panel) board.updatePanel({ ...panel, tone })
}
function setPanelEntrance(id: string, entrance: DashboardEntrance): void {
  const panel = panels.value.get(id)
  if (!panel) return
  board.updatePanel({ ...panel, entrance })
  previewCard(id)
}
function resetPanelAppearance(id: string, key: 'tone' | 'entrance'): void {
  const panel = panels.value.get(id)
  if (!panel) return
  const inherited = { ...panel }
  if (key === 'tone') delete inherited.tone
  else delete inherited.entrance
  board.updatePanel(inherited)
  if (key === 'entrance') previewCard(id)
}
function destinations(id: string): readonly DashboardDestination[] {
  const panel = panels.value.get(id)
  return panel?.type === 'capabilities'
    ? (panel.config.destinations ?? defaultDashboardDestinations)
    : []
}
function destinationChoices(id: string) {
  const selected = destinations(id)
  return [...selected, ...dashboardDestinations.filter((route) => !selected.includes(route))].map(
    (value, index) => ({
      value,
      label: t(dashboardDestinationLabels[value]),
      index,
      selected: index < selected.length,
      isLast: index === selected.length - 1,
    }),
  )
}
function setDestinations(id: string, values: string[]): void {
  const panel = panels.value.get(id)
  if (panel?.type !== 'capabilities') return
  const destinations = values.filter((value): value is DashboardDestination =>
    dashboardDestinations.some((route) => route === value),
  )
  board.updatePanel({ ...panel, config: { ...panel.config, destinations } })
}
function toggleDestination(id: string, destination: DashboardDestination, checked: boolean): void {
  const ordered = destinations(id)
  setDestinations(
    id,
    checked ? [...ordered, destination] : ordered.filter((value) => value !== destination),
  )
}
function reorderDestination(id: string, index: number, delta: -1 | 1): void {
  const values = [...destinations(id)]
  const current = values[index]
  const next = values[index + delta]
  if (!current || !next) return
  values[index] = next
  values[index + delta] = current
  setDestinations(id, values)
}

let observer: ResizeObserver | undefined
const breakpoint = responsiveLayoutConsoleProjection.profiles.find((item) => item.id === 'regular')
  ?.minimumInclusive.resolvedValue
function measure(): void {
  if (!host.value || !breakpoint) return
  const threshold =
    Number.parseFloat(breakpoint) *
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  mode.value = host.value.clientWidth < threshold ? 'narrow' : 'wide'
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (host.value) observer.observe(host.value)
})
onScopeDispose(() => observer?.disconnect())
const panels = computed(
  () => new Map(board.document.value.panels.map((panel) => [panel.id, panel])),
)
const panelLabels = {
  clock: 'dashboardBoard.clock',
  capabilities: 'dashboardBoard.capabilities',
  chart: 'dashboardBoard.chart',
  notes: 'dashboardBoard.notes',
} as const
const options = computed(() =>
  (['clock', 'capabilities', 'chart', 'notes'] as const).map((value) => ({
    value,
    label: t(panelLabels[value]),
  })),
)
function keydown(event: KeyboardEvent, id: string): void {
  const directions: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }
  const direction = directions[event.key]
  if (!direction || !editing.value || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  adjustedPanel.value = id
  if (event.shiftKey) grid.value?.resize(id, direction[0], direction[1])
  else grid.value?.move(id, direction[0], direction[1])
}
async function add(type: DashboardPanel['type']): Promise<void> {
  const before = new Set(board.document.value.panels.map(({ id }) => id))
  rejected.value = !board.add(type)
  if (rejected.value) return
  const id = board.document.value.panels.find((panel) => !before.has(panel.id))?.id
  if (!id) return
  adjustedPanel.value = id
  await nextTick()
  const element = panelSurface(id)
  const panel = panels.value.get(id)
  if (!element || !panel) return
  const preset = resolvedEntrance(panel)
  if (preset !== 'none') arrive(element, preset)
}
function cardTitle(id: string): string {
  const panel = panels.value.get(id)
  return panel ? (panel.title ?? t(panelLabels[panel.type])) : ''
}
const announcement = computed(() => {
  const item = board.document.value.layouts[mode.value].find(
    (item) => item.id === adjustedPanel.value,
  )
  return item
    ? `${cardTitle(item.id)} · ${t('dashboardBoard.position')} ${String(item.y + 1)}, ${String(item.x + 1)}; ${String(item.w)} × ${String(item.h)}`
    : ''
})
</script>
<template>
  <div
    ref="host"
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
    @contextmenu.capture.prevent
  >
    <h1
      class="sr-only"
      data-route-focus="architecture-console-page-heading"
      tabindex="-1"
    >
      {{ title }}
    </h1>
    <UiScrollArea
      owner-id="architecture-console-content"
      class="wb-dashboard-scroll rounded-panel flex-1 min-h-0 min-w-0"
      :class="{
        'bg-surface-panel': boardStyle === 'theme' || boardStyle === 'brand',
        'bg-expression-accent-a-soft-background': boardStyle === 'soft',
        'bg-expression-accent-b-soft-background': boardStyle === 'contrast',
      }"
      :data-dashboard-editing="editing ? 'true' : undefined"
      :data-dashboard-style="boardStyle"
      data-dashboard-context-host
      role="region"
      :aria-label="t('dashboardBoard.board')"
      tabindex="0"
      :aria-description="t(editing ? 'dashboardBoard.editHint' : 'dashboardBoard.browseHint')"
      aria-keyshortcuts="Shift+F10"
      @contextmenu="openContext"
      @pointerdown="touchPressStart"
      @pointermove="touchPressMove"
      @pointerup="touchPressEnd"
      @pointercancel="touchPressEnd"
      @keydown="contextKeydown"
      @controller="connectScroll"
      @viewport="dashboardViewport = $event"
    >
      <UiDashboardGrid
        ref="grid"
        class="shrink-0"
        :layout="board.document.value.layouts[mode]"
        :columns="mode === 'wide' ? 12 : 1"
        :editing="editing"
        :scroll-controller="currentScroll ?? undefined"
        :label="t('dashboardBoard.board')"
        @update:layout="board.updateLayout(mode, $event)"
      >
        <template #item="{ id }">
          <section
            class="rounded-panel flex flex-col h-full min-h-0 min-w-0"
            :class="{
              'gap-component-unit p-panel-narrow': panels.get(id)?.type === 'clock',
              'bg-expression-accent-a-soft-background': tone(id) === 'accent-a',
              'gap-content-gap p-page-inline': panels.get(id)?.type !== 'clock',
              'bg-expression-accent-b-soft-background': tone(id) === 'accent-b',
              'bg-surface-page': tone(id) === 'quiet',
              'bg-surface-panel': ['theme', 'brand', 'accent-a-strong', 'accent-b-strong'].includes(
                tone(id),
              ),
            }"
            :aria-label="cardTitle(id)"
            :data-dashboard-panel="id"
            :data-dashboard-configuring="inspectorOpen && propertyPanel === id ? 'true' : undefined"
            tabindex="0"
            :data-dashboard-tone="tone(id)"
          >
            <header class="min-h-control flex shrink-0 items-center gap-component-unit">
              <div class="shrink-0 relative">
                <NButton
                  type="primary"
                  class="pavp-dashboard-drag-handle shrink-0"
                  :class="{ invisible: !editing }"
                  :aria-hidden="!editing"
                  :tabindex="editing ? 0 : -1"
                  quaternary
                  :theme-overrides="actionTheme"
                  size="small"
                  :aria-label="`${t('dashboardBoard.move')} · ${cardTitle(id)}`"
                  @keydown="keydown($event, id)"
                >
                  <span
                    class="i-lucide-grip"
                    aria-hidden="true"
                  />
                </NButton>
                <span
                  v-if="!editing"
                  class="flex items-center inset-0 justify-center absolute text-text-secondary"
                  aria-hidden="true"
                >
                  <span
                    :class="{
                      'i-lucide-clock-3': panels.get(id)?.type === 'clock',
                      'i-lucide-compass': panels.get(id)?.type === 'capabilities',
                      'i-lucide-chart-no-axes-combined': panels.get(id)?.type === 'chart',
                      'i-lucide-notebook-pen': panels.get(id)?.type === 'notes',
                    }"
                  />
                </span>
              </div>
              <h2
                class="m-0 rounded-control flex flex-1 min-w-0 items-center self-stretch px-button-inline text-subheading"
                :class="{
                  'bg-action-primary text-text-on-action': tone(id) === 'brand',
                  'bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground':
                    tone(id) === 'accent-a-strong',
                  'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground':
                    tone(id) === 'accent-b-strong',
                }"
              >
                <span
                  class="min-w-0 truncate"
                  v-text="cardTitle(id)"
                />
              </h2>
            </header>
            <DashboardWidget
              v-if="panels.get(id)"
              :panel="panels.get(id)!"
              :tone="tone(id)"
              @update="board.updatePanel"
            />
          </section>
        </template>
      </UiDashboardGrid>
      <NEmpty
        v-if="board.document.value.panels.length === 0"
        :description="t('dashboardBoard.empty')"
      />
    </UiScrollArea>
    <span
      class="sr-only"
      role="status"
      aria-live="polite"
      v-text="announcement"
    />
    <footer
      v-if="board.readFailure.value || board.failure.value"
      class="flex shrink-0 flex-wrap items-center gap-component-unit"
    >
      <template v-if="board.readFailure.value">
        <span
          role="status"
          class="text-caption text-text-secondary"
          v-text="t('dashboardBoard.readFailed')"
        />
        <NButton
          :theme-overrides="actionTheme"
          type="primary"
          size="small"
          secondary
          @click="board.retryRead"
        >
          {{ t('dashboardBoard.retryRead') }}
        </NButton>
        <NButton
          size="small"
          type="warning"
          secondary
          @click="board.reset"
        >
          {{ t('dashboardBoard.replaceInvalid') }}
        </NButton>
      </template>
      <NButton
        v-if="board.failure.value"
        size="small"
        type="warning"
        secondary
        @click="board.retry"
      >
        {{ t('dashboardBoard.saveFailed') }}
      </NButton>
    </footer>
    <Transition
      name="wb-dashboard-dock"
      :css="mayPlay"
      @after-leave="clearInspector"
    >
      <section
        v-if="inspectorOpen && inspector"
        ref="inspectorElement"
        class="wb-dashboard-dock rounded-panel flex shrink-0 flex-col min-h-0 min-w-0 shadow-panel overflow-clip bg-surface-panel gap-component-unit p-panel-narrow"
        role="dialog"
        aria-modal="false"
        tabindex="-1"
        :aria-labelledby="inspectorTitleId"
      >
        <header class="flex shrink-0 min-w-0 items-center justify-between gap-component-unit">
          <h2
            :id="inspectorTitleId"
            class="m-0 min-w-0 truncate text-subheading"
            v-text="inspectorTitle"
          />
          <div class="flex shrink-0 items-center gap-component-unit">
            <span
              v-if="showMotionSample"
              ref="motionSample"
              class="min-h-control rounded-control flex items-center bg-expression-accent-a-soft-background px-button-inline text-expression-accent-a-soft-foreground"
              aria-hidden="true"
            >
              <span class="i-lucide-layout-dashboard" />
            </span>
            <NButton
              type="primary"
              quaternary
              :theme-overrides="actionTheme"
              size="small"
              :aria-label="t('dashboardBoard.closeSettings')"
              @click="setInspectorOpen(false)"
            >
              <span
                class="i-lucide-x"
                aria-hidden="true"
              />
            </NButton>
          </div>
        </header>
        <UiScrollArea
          :key="inspector"
          :owner-id="`dashboard-inspector-${inspector}`"
          class="min-h-0"
          contained
        >
          <div class="grid min-w-0 gap-component-unit">
            <DashboardAppearanceOptions
              v-if="inspector === 'appearance'"
              :board-style="boardStyle"
              :entrance="boardEntrance"
              :tone-overrides="toneOverrides"
              :entrance-overrides="entranceOverrides"
              :preview-enabled="mayPlay"
              @update:board-style="board.setStyle"
              @update:entrance="chooseBoardEntrance"
            />
            <template v-else-if="inspector === 'library'">
              <NButton
                v-for="option in options"
                :key="option.value"
                :theme-overrides="actionTheme"
                type="primary"
                block
                secondary
                :disabled="board.document.value.panels.length >= 24"
                @click="add(option.value)"
              >
                <span class="flex w-full items-center justify-between gap-component-unit">
                  <span>{{ option.label }}</span>
                  <span
                    class="i-lucide-plus shrink-0"
                    aria-hidden="true"
                  />
                </span>
              </NButton>
              <span
                v-if="rejected"
                role="status"
                class="text-caption text-text-secondary"
                v-text="t('dashboardBoard.full')"
              />
            </template>
            <div
              v-else-if="inspector === 'layout'"
              class="flex flex-wrap gap-component-unit"
            >
              <NButton
                :theme-overrides="actionTheme"
                type="primary"
                :disabled="!board.canUndo.value"
                secondary
                @click="board.undo"
              >
                {{ t('dashboardBoard.undo') }}
              </NButton>
              <NButton
                :theme-overrides="actionTheme"
                type="primary"
                secondary
                @click="grid?.compact()"
              >
                {{ t('dashboardBoard.compact') }}
              </NButton>
              <NButton
                :theme-overrides="actionTheme"
                type="primary"
                secondary
                @click="board.restoreLayout"
              >
                {{ t('dashboardBoard.restoreLayout') }}
              </NButton>
            </div>
            <DashboardAppearanceOptions
              v-else-if="propertyPanel && panels.get(propertyPanel)"
              :key="propertyPanel"
              :tone="tone(propertyPanel)"
              :entrance="panels.get(propertyPanel)?.entrance ?? boardEntrance"
              :tone-inherited="panels.get(propertyPanel)?.tone === undefined"
              :entrance-inherited="panels.get(propertyPanel)?.entrance === undefined"
              :preview-enabled="mayPlay"
              @update:tone="setTone(propertyPanel, $event)"
              @update:entrance="setPanelEntrance(propertyPanel, $event)"
              @reset:tone="resetPanelAppearance(propertyPanel, 'tone')"
              @reset:entrance="resetPanelAppearance(propertyPanel, 'entrance')"
            >
              <NFormItem
                :label="t('dashboardBoard.cardTitle')"
                :show-feedback="false"
                :label-props="{ for: propertyTitleId }"
              >
                <NInput
                  v-model:value="propertyTitle"
                  :maxlength="60"
                  :input-props="{
                    id: propertyTitleId,
                    'aria-label': t('dashboardBoard.cardTitle'),
                  }"
                  @keydown.enter="commitTitle(propertyPanel)"
                />
              </NFormItem>
              <div
                v-if="panels.get(propertyPanel)?.type === 'capabilities'"
                class="grid gap-component-unit"
              >
                <strong class="text-body">{{ t('dashboardBoard.destinations') }}</strong>
                <div
                  v-for="option in destinationChoices(propertyPanel)"
                  :key="option.value"
                  class="flex min-w-0 items-center gap-component-unit"
                >
                  <NCheckbox
                    class="wb-dashboard-choice min-h-control rounded-control flex-1 min-w-0 px-button-inline"
                    :theme-overrides="checkboxTheme"
                    :checked="option.selected"
                    @update:checked="toggleDestination(propertyPanel, option.value, $event)"
                  >
                    {{ option.label }}
                  </NCheckbox>
                  <template v-if="option.selected">
                    <NButton
                      type="primary"
                      size="small"
                      quaternary
                      :theme-overrides="actionTheme"
                      :disabled="option.index === 0"
                      :aria-label="`${t('dashboardBoard.earlier')} · ${option.label}`"
                      @click="reorderDestination(propertyPanel, option.index, -1)"
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
                      :aria-label="`${t('dashboardBoard.later')} · ${option.label}`"
                      @click="reorderDestination(propertyPanel, option.index, 1)"
                    >
                      <span
                        class="i-lucide-arrow-down"
                        aria-hidden="true"
                      />
                    </NButton>
                  </template>
                </div>
              </div>
            </DashboardAppearanceOptions>
          </div>
        </UiScrollArea>
      </section>
    </Transition>
    <DashboardContextMenu
      :show="context !== null"
      :x="context?.x ?? 0"
      :y="context?.y ?? 0"
      :card-label="context?.cardId ? cardTitle(context.cardId) : undefined"
      :caller="context?.caller ?? null"
      :pointer="context?.pointer ?? false"
      :editing="editing"
      :copy-value="JSON.stringify(board.document.value, null, 2)"
      :disabled="board.readFailure.value"
      @close="closeContext"
      @action="contextAction"
    />
  </div>
</template>
