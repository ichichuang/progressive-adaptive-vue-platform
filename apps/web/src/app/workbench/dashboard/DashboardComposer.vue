<script setup lang="ts">
import {
  type ButtonHTMLAttributes,
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
import { NEmpty } from 'naive-ui/es/empty'
import {
  NMessageProvider,
  type MessageProviderInst,
  type MessageReactive,
} from 'naive-ui/es/message'
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
import { useDashboardActionTheme } from './use-dashboard-action-theme'
import DashboardWidget from './DashboardWidget.vue'
import DashboardContextMenu from './DashboardContextMenu.vue'
import DashboardLibraryDrawer, { type DashboardLibraryEntry } from './DashboardLibraryDrawer.vue'
import {
  dashboardCatalog,
  matchesDashboardCatalogEntry,
  type DashboardCatalogEntry,
} from '../../dashboard/dashboard-catalog'
import { catalogCardTitle, dashboardCardTitle } from './dashboard-card-presentation'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import { useApplicationNavigation } from '../../router/application-navigation'
import { registeredRouteDestination } from '../../router/route-input'
defineProps<{ readonly title: string }>()
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const actionTheme = useDashboardActionTheme()
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
  if (returning) {
    void playBoardArrival()
    if (board.readFailure.value) showStorageFailure('read')
    else if (board.failure.value) showStorageFailure('save')
  }
})
onDeactivated(() => {
  active = false
  clearStorageMessage()
  unregisterScroll?.()
  unregisterScroll = undefined
})
onScopeDispose(() => {
  connectScroll(null)
})
const board = useDashboard(dashboardCatalog)
const messageProvider = ref<MessageProviderInst>()
let storageMessage: MessageReactive | undefined
function clearStorageMessage(): void {
  const previous = storageMessage
  storageMessage = undefined
  if (!previous) return
  previous.destroy()
  void nextTick(() => {
    previous.destroy()
  })
}
function showStorageFailure(kind: 'read' | 'save'): void {
  if (!active) return
  const content = t(
    kind === 'read' ? 'dashboardBoard.readFailedHint' : 'dashboardBoard.saveFailedHint',
  )
  if (storageMessage) {
    storageMessage.content = content
    return
  }
  const message = messageProvider.value?.warning(content, {
    duration: 0,
    closable: true,
    onClose: () => {
      if (storageMessage === message) storageMessage = undefined
    },
  })
  storageMessage = message
}
watch([board.readFailure, board.failure], ([readFailed, saveFailed]) => {
  if (readFailed) showStorageFailure('read')
  else if (saveFailed) showStorageFailure('save')
  else clearStorageMessage()
})
watch(
  () => board.document.value.panels.length,
  (count, previous) => {
    if (count === 0 && previous > 0) {
      void nextTick(() => currentScroll.value?.scrollTo({ top: 0, behavior: 'instant' }))
    }
  },
)
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
const libraryOpen = ref(false)
let libraryCaller: HTMLElement | null = null
let libraryAddedId: string | undefined
const boardDescriptionId = useId()
const toneOverrides = computed(
  () => board.document.value.panels.filter((panel) => panel.tone !== undefined).length,
)
const entranceOverrides = computed(
  () => board.document.value.panels.filter((panel) => panel.entrance !== undefined).length,
)
function closeContext(): void {
  context.value = null
}
function openLibrary(caller: HTMLElement | null): void {
  if (board.readFailure.value) return
  rejected.value = false
  libraryCaller = caller
  libraryAddedId = undefined
  libraryOpen.value = true
}
function finishEditing(): void {
  editing.value = false
  void nextTick(() =>
    dashboardViewport.value
      ?.closest<HTMLElement>('[data-dashboard-context-host]')
      ?.focus({ preventScroll: true }),
  )
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
  action:
    | 'edit'
    | 'finish'
    | 'remove'
    | 'add'
    | 'undo'
    | 'compact'
    | 'restore-layout'
    | 'retry-read'
    | 'replace-invalid'
    | 'retry-save',
): void {
  const cardId = context.value?.cardId
  const caller = context.value?.caller ?? null
  if (board.readFailure.value && action !== 'retry-read' && action !== 'replace-invalid') return
  switch (action) {
    case 'edit':
      editing.value = true
      break
    case 'finish':
      finishEditing()
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
    case 'add':
      openLibrary(caller)
      break
    case 'undo':
      board.undo()
      break
    case 'compact':
      grid.value?.compact()
      break
    case 'restore-layout':
      board.restoreLayout()
      break
    case 'retry-read':
      board.retryRead()
      if (board.readFailure.value) showStorageFailure('read')
      break
    case 'replace-invalid':
      board.reset()
      if (board.failure.value) showStorageFailure('save')
      break
    case 'retry-save':
      board.retry()
      if (board.failure.value) showStorageFailure('save')
      break
  }
}
function closeOverlays(): void {
  closeContext()
  touchPressEnd()
  clearArrivals()
  libraryOpen.value = false
  libraryAddedId = undefined
  libraryCaller = null
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
  route: 'camera-push',
  module: 'card-expand',
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
  if (board.readFailure.value) showStorageFailure('read')
  else if (board.failure.value) showStorageFailure('save')
})
function previewSample(preset: DashboardMotion, target: HTMLElement | null): void {
  const sample = target?.querySelector<HTMLElement>('[data-dashboard-motion-preview]')
  if (sample) playEntrance(sample, preset)
}
function previewCard(id: string, target: HTMLElement | null): void {
  clearArrivals()
  if (!active || !mayPlay.value || !context.value) return
  const panel = panels.value.get(id)
  if (!panel) return
  const preset = resolvedEntrance(panel)
  if (preset === 'none') return
  const element = panelSurface(id)
  if (element && panelIsVisible(element, true)) arrive(element, preset)
  else previewSample(preset, target)
}
function chooseBoardEntrance(entrance: DashboardEntrance, target: HTMLElement | null): void {
  board.setEntrance(entrance)
  if (!playVisibleCards('preview') && active && mayPlay.value && entrance !== 'none') {
    previewSample(entrance === 'balanced' ? dashboardArrivals.capabilities : entrance, target)
  }
}
function commitTitle(id: string, value: string): void {
  const panel = panels.value.get(id)
  if (!panel) return
  const next = { ...panel }
  const title = value.trim()
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
function setPanelEntrance(
  id: string,
  entrance: DashboardEntrance,
  target: HTMLElement | null,
): void {
  const panel = panels.value.get(id)
  if (!panel) return
  board.updatePanel({ ...panel, entrance })
  previewCard(id, target)
}
function resetPanelAppearance(
  id: string,
  key: 'tone' | 'entrance',
  target: HTMLElement | null = null,
): void {
  const panel = panels.value.get(id)
  if (!panel) return
  const inherited = { ...panel }
  if (key === 'tone') delete inherited.tone
  else delete inherited.entrance
  board.updatePanel(inherited)
  if (key === 'entrance') previewCard(id, target)
}
function destinations(id: string): readonly DashboardDestination[] {
  const panel = panels.value.get(id)
  return panel?.type === 'capabilities'
    ? (panel.config.destinations ?? defaultDashboardDestinations)
    : []
}
function destinationChoices(id: string) {
  const visible = (name: DashboardDestination) =>
    navigation.canShow(registeredRouteDestination({ name }))
  const selected = destinations(id).filter(visible)
  return [
    ...selected,
    ...dashboardDestinations.filter((route) => !selected.includes(route) && visible(route)),
  ].map((value, index) => ({
    value,
    label: t(dashboardDestinationLabels[value]),
    index,
    selected: index < selected.length,
    isLast: index === selected.length - 1,
  }))
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
const libraryEntries = computed<readonly DashboardLibraryEntry[]>(() =>
  dashboardCatalog
    .filter((entry) => entry.kind !== 'route' || navigation.canShow(entry.destination))
    .map((entry: DashboardCatalogEntry) => ({
      id: entry.id,
      title: catalogCardTitle(entry, t),
      category: entry.category,
      preview:
        entry.kind !== 'builtin'
          ? entry.kind
          : entry.panel.type === 'chart' && entry.panel.config.series === 'delivery'
            ? 'comparison'
            : entry.panel.type,
      ...(entry.descriptionKey !== undefined ? { description: t(entry.descriptionKey) } : {}),
      added: board.document.value.panels.some((panel) =>
        matchesDashboardCatalogEntry(entry, panel),
      ),
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
function add(entryId: string): void {
  const before = new Set(board.document.value.panels.map(({ id }) => id))
  rejected.value = !board.add(entryId)
  if (rejected.value) return
  libraryAddedId = board.document.value.panels.find((panel) => !before.has(panel.id))?.id
  adjustedPanel.value = libraryAddedId
}
function finishLibrary(): void {
  if (libraryOpen.value) return
  const added = libraryAddedId
  const caller = libraryCaller
  libraryAddedId = undefined
  libraryCaller = null
  if (!active) return
  const element = added ? panelSurface(added) : undefined
  const panel = added ? panels.value.get(added) : undefined
  if (added && element && panel) {
    revealPanel(added)
    element.focus({ preventScroll: true })
    const preset = resolvedEntrance(panel)
    if (preset !== 'none') arrive(element, preset)
  } else if (caller?.isConnected) {
    caller.focus({ preventScroll: true })
  }
}
function cardTitle(id: string): string {
  const panel = panels.value.get(id)
  if (panel?.type === 'route') {
    const entry = dashboardCatalog.find(({ id }) => id === panel.config.entryId)
    if (entry?.kind === 'route' && !navigation.canShow(entry.destination))
      return t('dashboardBoard.libraryRoutes')
  }
  return panel ? dashboardCardTitle(panel, t) : ''
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
    class="flex-1 grid grid-rows-1 min-h-0 min-w-0 gap-content-gap"
    @contextmenu.capture.prevent
  >
    <h1
      class="sr-only"
      data-route-focus="architecture-console-page-heading"
      tabindex="-1"
    >
      {{ title }}
    </h1>
    <p
      :id="boardDescriptionId"
      class="sr-only"
    >
      {{ t(editing ? 'dashboardBoard.editHint' : 'dashboardBoard.browseHint') }}
    </p>
    <UiScrollArea
      owner-id="architecture-console-content"
      class="wb-dashboard-scroll rounded-panel col-start-1 row-start-1 min-h-0 min-w-0"
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
      :aria-describedby="boardDescriptionId"
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
            tabindex="0"
            :data-dashboard-tone="tone(id)"
          >
            <header class="flex shrink-0 items-center gap-component-unit min-h-target-enhanced">
              <div class="shrink-0 relative">
                <NButton
                  type="primary"
                  class="pavp-dashboard-drag-handle shrink-0"
                  :class="{ invisible: !editing }"
                  v-bind="
                    {
                      'aria-hidden': !editing,
                      tabindex: editing ? 0 : -1,
                      'aria-label': `${t('dashboardBoard.move')} · ${cardTitle(id)}`,
                      onKeydown: (event: KeyboardEvent) => keydown(event, id),
                    } satisfies ButtonHTMLAttributes
                  "
                  quaternary
                  :theme-overrides="actionTheme"
                  size="small"
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
                      'i-lucide-arrow-up-right': panels.get(id)?.type === 'route',
                      'i-lucide-panels-top-left': panels.get(id)?.type === 'module',
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
        class="text-center flex-1 justify-center p-panel-narrow"
        :description="t('dashboardBoard.empty')"
        :theme-overrides="{ iconSizeMedium: 'var(--ui-control-height)' }"
      >
        <template #icon>
          <span
            class="rounded-panel flex h-full w-full items-center justify-center bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground"
          >
            <span
              class="i-lucide-layout-dashboard size-icon-large"
              aria-hidden="true"
            />
          </span>
        </template>
        <template #extra>
          <NButton
            :theme-overrides="actionTheme"
            type="primary"
            :disabled="!!board.readFailure.value"
            @click="openLibrary($event.currentTarget as HTMLElement)"
          >
            <template #icon>
              <span
                class="i-lucide-plus"
                aria-hidden="true"
              />
            </template>
            {{ t('dashboardBoard.add') }}
          </NButton>
        </template>
      </NEmpty>
    </UiScrollArea>
    <span
      class="sr-only"
      role="status"
      aria-live="polite"
      v-text="announcement"
    />
    <NMessageProvider
      ref="messageProvider"
      to="#pavp-overlay-root"
    />
    <DashboardLibraryDrawer
      :show="libraryOpen"
      :entries="libraryEntries"
      :can-add="board.document.value.panels.length < 24"
      :rejected="rejected"
      @close="libraryOpen = false"
      @after-leave="finishLibrary"
      @add="add"
    />
    <DashboardContextMenu
      :show="context !== null"
      :x="context?.x ?? 0"
      :y="context?.y ?? 0"
      :card-id="context?.cardId"
      :card-label="context?.cardId ? cardTitle(context.cardId) : undefined"
      :panel="context?.cardId ? panels.get(context.cardId) : undefined"
      :card-tone="context?.cardId ? tone(context.cardId) : undefined"
      :board-style="boardStyle"
      :board-entrance="boardEntrance"
      :tone-overrides="toneOverrides"
      :entrance-overrides="entranceOverrides"
      :preview-enabled="mayPlay"
      :destinations="context?.cardId ? destinationChoices(context.cardId) : []"
      :can-undo="board.canUndo.value"
      :caller="context?.caller ?? null"
      :pointer="context?.pointer ?? false"
      :editing="editing"
      :read-failure="board.readFailure.value"
      :save-failure="board.failure.value"
      @close="closeContext"
      @action="contextAction"
      @board-style="board.setStyle"
      @board-entrance="chooseBoardEntrance"
      @card-tone="setTone"
      @card-entrance="setPanelEntrance"
      @reset-tone="(id) => resetPanelAppearance(id, 'tone')"
      @reset-entrance="(id, target) => resetPanelAppearance(id, 'entrance', target)"
      @title="commitTitle"
      @toggle-destination="toggleDestination"
      @reorder-destination="reorderDestination"
    />
  </div>
</template>
