<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, ref } from 'vue'
import { adjacentVisibleTableColumn } from './table-column-preference'
import { NButton } from 'naive-ui/es/button'
import type { UiTableColumn, UiTableController, UiTableCopy } from './table-contracts'

const props = defineProps<{
  readonly dropPlacement?: 'before' | 'after' | undefined
  readonly owner: string
  readonly column: UiTableColumn
  readonly table: UiTableController
  readonly copy: UiTableCopy
}>()
const emit = defineEmits<{
  resizePreview: [key: string, width: number | undefined]
  reorderPreview: [target: { key: string; placement: 'before' | 'after' } | undefined]
}>()
const dragging = ref(false)
const resizing = ref(false)
let release: (() => void) | undefined
function cancel(): void {
  release?.()
  release = undefined
  emit('reorderPreview', undefined)
  dragging.value = false
  resizing.value = false
  emit('resizePreview', props.column.key, undefined)
}
function begin(event: PointerEvent, mode: 'resize' | 'reorder'): void {
  if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return
  const button = event.currentTarget
  const header = button.closest('th')
  if (!header) return
  event.preventDefault()
  event.stopPropagation()
  cancel()
  const start = event.clientX
  const initialWidth = header.getBoundingClientRect().width
  let width = initialWidth
  let target: { key: string; placement: 'before' | 'after' } | undefined
  resizing.value = mode === 'resize'
  dragging.value = mode === 'reorder'
  button.setPointerCapture(event.pointerId)
  function move(next: PointerEvent): void {
    if (next.pointerId !== event.pointerId) return
    if (mode === 'resize') {
      width = Math.min(
        props.column.maxWidth ?? Infinity,
        Math.max(props.column.minWidth ?? 1, initialWidth + next.clientX - start),
      )
      emit('resizePreview', props.column.key, width)
    } else {
      const hit = document
        .elementFromPoint(next.clientX, next.clientY)
        ?.closest<HTMLElement>('[data-table-column-owner]')
      if (hit?.dataset['tableColumnOwner'] !== props.owner) {
        target = undefined
        emit('reorderPreview', undefined)
        return
      }
      const key = hit.dataset['tableColumnKey']
      const bounds = hit.getBoundingClientRect()
      target =
        key && key !== props.column.key
          ? { key, placement: next.clientX < bounds.x + bounds.width / 2 ? 'before' : 'after' }
          : undefined
      emit('reorderPreview', target)
    }
  }
  function finish(next: PointerEvent): void {
    if (next.pointerId !== event.pointerId) return
    if (next.type === 'pointerup') {
      if (mode === 'resize') props.table.setColumnWidth(props.column.key, width)
      else if (target) props.table.reorderColumn(props.column.key, target.key, target.placement)
    }
    cancel()
  }
  function escape(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancel()
    }
  }
  document.addEventListener('keydown', escape, true)
  button.addEventListener('pointermove', move)
  button.addEventListener('pointerup', finish)
  button.addEventListener('pointercancel', finish)
  button.addEventListener('lostpointercapture', finish)
  release = () => {
    document.removeEventListener('keydown', escape, true)
    button.removeEventListener('pointermove', move)
    button.removeEventListener('pointerup', finish)
    button.removeEventListener('pointercancel', finish)
    button.removeEventListener('lostpointercapture', finish)
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId)
  }
}
function keyboard(event: KeyboardEvent, mode: 'resize' | 'reorder'): void {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  if (mode === 'reorder') {
    const direction = event.key === 'ArrowLeft' ? 'left' : 'right'
    const target = adjacentVisibleTableColumn(
      props.table.columns.value,
      props.column.key,
      direction,
    )
    if (target)
      props.table.reorderColumn(props.column.key, target, direction === 'left' ? 'before' : 'after')
  } else {
    const header =
      event.currentTarget instanceof HTMLElement ? event.currentTarget.closest('th') : null
    const width = props.column.width ?? header?.getBoundingClientRect().width
    if (width)
      props.table.setColumnWidth(
        props.column.key,
        Math.max(1, width + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : 10)),
      )
  }
}
onBeforeUnmount(cancel)
onDeactivated(cancel)
</script>

<template>
  <span
    class="flex min-w-0 items-center relative gap-component-unit"
    :class="dropPlacement ? 'text-primary' : ''"
    :data-table-column-owner="owner"
    :data-table-column-key="column.key"
  >
    <NButton
      v-if="table.schema.reorderableColumns"
      text
      size="small"
      class="shrink-0 touch-none"
      :class="dragging ? 'cursor-grabbing text-primary' : 'cursor-grab'"
      :aria-label="copy.reorderColumn?.(table.text(column.title)) ?? table.text(column.title)"
      :title="copy.reorderColumn?.(table.text(column.title))"
      @pointerdown="begin($event, 'reorder')"
      @keydown="keyboard($event, 'reorder')"
      @click.stop
    >
      <span
        class="i-lucide-grip-vertical size-icon-small"
        aria-hidden="true"
      />
    </NButton>
    <span
      v-if="dropPlacement === 'before'"
      class="i-lucide-arrow-right pointer-events-none left-0 absolute size-icon-small"
      aria-hidden="true"
    />
    <span class="flex-1 min-w-0 whitespace-nowrap"><slot /></span>
    <span
      v-if="dropPlacement === 'after'"
      class="i-lucide-arrow-left pointer-events-none right-0 absolute size-icon-small"
      aria-hidden="true"
    />
    <NButton
      v-if="column.resizable"
      text
      size="small"
      class="shrink-0 cursor-col-resize touch-none"
      :class="resizing ? 'text-primary' : ''"
      :aria-label="copy.resizeColumn?.(table.text(column.title)) ?? table.text(column.title)"
      :title="copy.resizeColumn?.(table.text(column.title))"
      @pointerdown="begin($event, 'resize')"
      @keydown="keyboard($event, 'resize')"
      @click.stop
    >
      <span
        class="i-lucide-move-horizontal size-icon-small"
        aria-hidden="true"
      />
    </NButton>
  </span>
</template>
