<script setup lang="ts">
import { nextTick, onMounted, onActivated, onDeactivated, onBeforeUnmount, ref, watch } from 'vue'
import { GridStack } from '../adapters/dashboard/grid-runtime'
import { dashboardLayoutKey, dashboardScrollIsContained } from '../adapters/dashboard/grid-layout'
import type { UiScrollController } from './scroll-contracts'
import type {
  UiDashboardGridHandle,
  UiDashboardItemPosition,
} from '../dashboard/dashboard-contracts'
defineOptions({ name: 'UiDashboardGrid' })
const props = defineProps<{
  readonly layout: readonly UiDashboardItemPosition[]
  readonly columns: 1 | 12
  readonly editing: boolean
  readonly rowHeight?: number
  readonly label: string
  readonly scrollController?: UiScrollController | undefined
}>()
const emit = defineEmits<{
  'update:layout': [layout: readonly UiDashboardItemPosition[]]
  interaction: [active: boolean]
}>()
defineSlots<{ item: (props: { id: string }) => unknown }>()
const host = ref<HTMLElement>()
const metric = ref<HTMLElement>()
let grid: GridStack | undefined
let observer: ResizeObserver | undefined
let mutations: MutationObserver | undefined
let synchronizing = false
let active = false
let generation = 0
let lastPublished = ''
let appliedEditing: boolean | undefined
let appliedColumns: number | undefined
let initialLayoutFrame: number | undefined
let initialLayoutPainted = false
let appliedMetrics: { height: number; margin: number; animate: boolean } | undefined
const interaction = ref<'idle' | 'dragging' | 'resizing'>('idle')
function readLayout(): UiDashboardItemPosition[] {
  return (
    grid?.engine.nodes.flatMap((node) =>
      node.id === undefined
        ? []
        : [
            {
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: node.w ?? 1,
              h: node.h ?? 2,
            },
          ],
    ) ?? []
  )
}
function positions(): void {
  if (!active || synchronizing || !grid || interaction.value !== 'idle') return
  const layout = readLayout()
  const key = dashboardLayoutKey(layout)
  if (key === lastPublished || key === dashboardLayoutKey(props.layout)) return
  lastPublished = key
  emit('update:layout', layout)
}
function nativeScrollAllowed(): boolean {
  const element = host.value
  const controller = props.scrollController
  const viewport = element?.closest('.pavp-scroll-area__viewport')
  const boundary = element?.closest('.pavp-scroll-area')
  if (!element || !controller || !viewport || !boundary || !controller.ownsBoundary(boundary))
    return false
  const boundaries = []
  let ancestor: HTMLElement | null = element
  while (ancestor) {
    boundaries.push({
      owned: ancestor === viewport,
      overflowY: getComputedStyle(ancestor).overflowY,
      range: ancestor.scrollHeight - ancestor.clientHeight,
    })
    ancestor = ancestor.parentElement
  }
  const page = element.ownerDocument.scrollingElement
  if (page && page.scrollHeight > page.clientHeight) return false
  return dashboardScrollIsContained(boundaries)
}
function beginInteraction(event: Event): void {
  interaction.value = event.type === 'dragstart' ? 'dragging' : 'resizing'
  props.scrollController?.cancelMotion()
  emit('interaction', true)
}
function endInteraction(): void {
  if (interaction.value === 'idle') return
  interaction.value = 'idle'
  positions()
  emit('interaction', false)
  if (active) void synchronize()
}
function dimensions(): void {
  if (!grid || !metric.value || !active) return
  const style = getComputedStyle(metric.value)
  const requestedHeight = props.rowHeight
  const height =
    requestedHeight !== undefined && Number.isFinite(requestedHeight) && requestedHeight > 0
      ? requestedHeight
      : Number.parseFloat(style.height)
  const margin = Number.parseFloat(style.paddingTop) / 2
  const animate = initialLayoutPainted && document.documentElement.dataset['motion'] === 'full'
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(margin)) return
  if (appliedMetrics?.height !== height) grid.cellHeight(height)
  if (appliedMetrics?.margin !== margin) grid.margin(margin)
  if (appliedMetrics?.animate !== animate) grid.setAnimation(animate)
  appliedMetrics = { height, margin, animate }
}
async function synchronize(): Promise<void> {
  const current = ++generation
  await nextTick()
  if (!active || !host.value || current !== generation) return
  if (interaction.value !== 'idle') return
  synchronizing = true
  try {
    if (!grid) {
      grid =
        GridStack.init(
          {
            auto: false,
            column: props.columns,
            maxRow: 128,
            mode: 'float',
            animate: false,
            disableDrag: !props.editing,
            disableResize: !props.editing,
            resizable: { handles: 'n,e,s,w,ne,se,sw,nw' },
            draggable: {
              handle: '.pavp-dashboard-drag-handle',
              scroll: nativeScrollAllowed(),
              pause: false,
            },
            acceptWidgets: false,
          },
          host.value,
        ) ?? undefined
      if (!grid) return
      grid.on('change', positions)
      grid.on('dragstart resizestart', beginInteraction)
      grid.on('dragstop resizestop', endInteraction)
    }
    const geometryChanged =
      appliedColumns !== props.columns ||
      dashboardLayoutKey(readLayout()) !== dashboardLayoutKey(props.layout)
    const editingChanged = appliedEditing !== props.editing
    if (geometryChanged) {
      grid.batchUpdate()
      const ids = new Set(props.layout.map((item) => item.id))
      for (const node of [...grid.engine.nodes])
        if (node.id !== undefined && !ids.has(node.id) && node.el)
          grid.removeWidget(node.el, false, false)
      if (appliedColumns !== props.columns) grid.column(props.columns, 'none')
      const elements = new Map(
        [...host.value.children].map((element) => [element.getAttribute('gs-id'), element]),
      )
      const registered = new Set(grid.engine.nodes.map((node) => node.id))
      for (const item of props.layout) {
        const element = elements.get(item.id)
        if (element instanceof HTMLElement && !registered.has(item.id))
          grid.makeWidget(element, { ...item, minW: 1, minH: 2, maxW: props.columns, maxH: 128 })
      }
      grid.load(
        props.layout.map((item) => ({ ...item, minW: 1, minH: 2, maxW: props.columns, maxH: 128 })),
        false,
      )
      grid.batchUpdate(false)
      appliedColumns = props.columns
      lastPublished = dashboardLayoutKey(props.layout)
    }
    if (editingChanged) {
      grid.enableMove(props.editing)
      grid.enableResize(props.editing)
      for (const element of grid.getGridItems()) grid.refreshDragHandles(element)
      appliedEditing = props.editing
    }
    dimensions()
    if (!initialLayoutPainted && initialLayoutFrame === undefined) {
      // Apply the restored coordinates and measurements in a paint with animation disabled.
      initialLayoutFrame = requestAnimationFrame(() => {
        initialLayoutFrame = requestAnimationFrame(() => {
          initialLayoutFrame = undefined
          if (!active || !grid) return
          initialLayoutPainted = true
          dimensions()
        })
      })
    }
  } finally {
    synchronizing = false
  }
}
function start(): void {
  if (active) return
  active = true
  void synchronize()
  if (metric.value) {
    observer = new ResizeObserver(dimensions)
    observer.observe(metric.value, { box: 'border-box' })
  }
  mutations = new MutationObserver(dimensions)
  mutations.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-motion'],
  })
}
function stop(): void {
  active = false
  generation++
  endInteraction()
  observer?.disconnect()
  mutations?.disconnect()
  if (initialLayoutFrame !== undefined) cancelAnimationFrame(initialLayoutFrame)
  initialLayoutFrame = undefined
  initialLayoutPainted = false
  grid?.destroy(false)
  grid = undefined
  appliedEditing = undefined
  appliedColumns = undefined
  appliedMetrics = undefined
  lastPublished = ''
}
function adjust(id: string, dx: number, dy: number, dw: number, dh: number): void {
  if (!props.editing || !grid || ![dx, dy, dw, dh].every(Number.isInteger)) return
  const node = grid.engine.nodes.find((item) => item.id === id)
  if (!node?.el) return
  const w = Math.max(1, Math.min(props.columns, (node.w ?? 1) + dw))
  const h = Math.max(2, Math.min(128, (node.h ?? 2) + dh))
  grid.update(node.el, {
    x: Math.max(0, Math.min(props.columns - w, (node.x ?? 0) + dx)),
    y: Math.max(0, Math.min(128 - h, (node.y ?? 0) + dy)),
    w,
    h,
  })
}
const handle: UiDashboardGridHandle = {
  compact: () => {
    if (props.editing && interaction.value === 'idle') grid?.compact('compact')
  },
  move: (id, dx, dy) => {
    adjust(id, dx, dy, 0, 0)
  },
  resize: (id, dw, dh) => {
    adjust(id, 0, 0, dw, dh)
  },
}
defineExpose(handle)
onMounted(start)
onActivated(start)
onDeactivated(stop)
onBeforeUnmount(stop)
watch(
  () => [props.layout, props.columns, props.editing, props.rowHeight],
  () => {
    void synchronize()
  },
  { deep: true },
)
</script>
<template>
  <section
    ref="host"
    class="grid-stack pavp-dashboard-grid text-body"
    :aria-label="label"
    :data-dashboard-interaction="interaction"
  >
    <div
      ref="metric"
      class="pavp-dashboard-grid__metric"
      aria-hidden="true"
    />
    <div
      v-for="item in layout"
      :key="item.id"
      class="grid-stack-item"
      :gs-id="item.id"
    >
      <div class="grid-stack-item-content rounded-panel shadow-panel bg-surface-panel">
        <slot
          :id="item.id"
          name="item"
        />
      </div>
    </div>
  </section>
</template>
<style scoped>
.pavp-dashboard-grid__metric {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  height: calc(var(--ui-control-height) * 2);
  padding-top: var(--ui-space-content-gap);
}

.pavp-dashboard-grid :deep(.grid-stack-item-content) {
  overflow: visible;
}
.pavp-dashboard-grid.grid-stack-animate
  :deep(
    .grid-stack-item:not(.ui-draggable-dragging):not(.ui-resizable-resizing):not(
        .grid-stack-placeholder
      )
  ) {
  transition-duration: var(--ui-motion-duration);
  transition-timing-function: var(--ui-motion-easing);
}
.pavp-dashboard-grid :deep(.pavp-dashboard-drag-handle) {
  cursor: grab;
  touch-action: none;
}
.pavp-dashboard-grid :deep(.pavp-dashboard-drag-handle:active) {
  cursor: grabbing;
}
.pavp-dashboard-grid :deep(.grid-stack-placeholder > .placeholder-content) {
  background: var(--ui-color-surface-panel);
  border-radius: var(--ui-radius-panel);
  border-width: var(--ui-border-width);
  border-style: dashed;
  border-color: var(--ui-color-border-default);
}
</style>
