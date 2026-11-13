<script setup lang="ts">
import { nextTick, onMounted, onActivated, onDeactivated, onBeforeUnmount, ref, watch } from 'vue'
import { GridStack } from '../adapters/dashboard/grid-runtime'
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
function positions(): void {
  if (synchronizing || !grid) return
  const layout = grid.engine.nodes.flatMap((node) =>
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
  )
  emit('update:layout', layout)
}
function dimensions(): void {
  if (!grid || !host.value) return
  if (!metric.value) return
  const style = getComputedStyle(metric.value)
  const requestedHeight = props.rowHeight
  grid.cellHeight(
    requestedHeight !== undefined && Number.isFinite(requestedHeight) && requestedHeight > 0
      ? requestedHeight
      : Number.parseFloat(style.height),
  )
  grid.margin(Number.parseFloat(style.paddingTop) / 2)
  grid.setAnimation(document.documentElement.dataset['motion'] === 'full')
}
async function synchronize(): Promise<void> {
  const current = ++generation
  await nextTick()
  if (!active || !host.value || current !== generation) return
  synchronizing = true
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
          resizable: { handles: 'se' },
          draggable: { handle: '.pavp-dashboard-drag-handle', scroll: false, pause: false },
          acceptWidgets: false,
        },
        host.value,
      ) ?? undefined
    if (!grid) {
      synchronizing = false
      return
    }
    grid.on('change', positions)
    grid.on('dragstart resizestart', () => {
      emit('interaction', true)
    })
    grid.on('dragstop resizestop', () => {
      positions()
      emit('interaction', false)
    })
  }
  grid.batchUpdate()
  const ids = new Set(props.layout.map((item) => item.id))
  for (const node of [...grid.engine.nodes]) {
    if (node.id !== undefined && !ids.has(node.id) && node.el)
      grid.removeWidget(node.el, false, false)
  }
  grid.column(props.columns, 'none')
  for (const item of props.layout) {
    const element = [...host.value.children].find(
      (child) => child.getAttribute('gs-id') === item.id,
    )
    if (!(element instanceof HTMLElement)) continue
    if (!grid.engine.nodes.some((node) => node.id === item.id)) {
      grid.makeWidget(element, { ...item, minW: 1, minH: 2, maxW: props.columns, maxH: 128 })
    }
  }
  // Restore the complete layout atomically: sequential updates would collide with
  // old positions and push widgets that have not yet received their new positions.
  // false keeps creation/removal and all component content under Vue ownership.
  grid.load(
    props.layout.map((item) => ({
      ...item,
      minW: 1,
      minH: 2,
      maxW: props.columns,
      maxH: 128,
    })),
    false,
  )
  grid.enableMove(props.editing)
  grid.enableResize(props.editing)
  for (const element of grid.getGridItems()) grid.refreshDragHandles(element)
  grid.batchUpdate(false)
  dimensions()
  synchronizing = false
}
function start(): void {
  if (active) return
  active = true
  void synchronize()
  if (host.value) {
    observer = new ResizeObserver(dimensions)
    observer.observe(host.value)
  }
  mutations = new MutationObserver(dimensions)
  mutations.observe(document.documentElement, { attributes: true })
}
function stop(): void {
  active = false
  generation++
  observer?.disconnect()
  mutations?.disconnect()
  grid?.destroy(false)
  grid = undefined
  emit('interaction', false)
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
.pavp-dashboard-grid
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
}
</style>
