<script setup lang="ts">
import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { fitUiDisplayStage, type UiDisplayRatio, type UiDisplayStageSize } from './display-stage'
defineOptions({ name: 'UiDisplayStage' })
const props = defineProps<{ readonly ratio?: UiDisplayRatio; readonly label: string }>()
const emit = defineEmits<{ resize: [size: UiDisplayStageSize] }>()
defineSlots<{ default: () => unknown }>()
const host = ref<HTMLElement>()
const stage = ref<HTMLElement>()
let observer: ResizeObserver | undefined
let previous: UiDisplayStageSize | undefined
function measure(): void {
  if (!host.value || !stage.value) return
  const size = fitUiDisplayStage(host.value.clientWidth, host.value.clientHeight, props.ratio)
  if (previous?.width === size.width && previous.height === size.height) return
  previous = size
  stage.value.style.width = `${String(size.width)}px`
  stage.value.style.height = `${String(size.height)}px`
  emit('resize', size)
}
function start(): void {
  if (observer || !host.value) return
  observer = new ResizeObserver(measure)
  observer.observe(host.value)
  measure()
}
function stop(): void {
  observer?.disconnect()
  observer = undefined
  previous = undefined
}
watch(() => props.ratio, measure, { deep: true, flush: 'post' })
onMounted(start)
onActivated(start)
onDeactivated(stop)
onBeforeUnmount(stop)
</script>
<template>
  <div
    ref="host"
    class="flex h-full min-h-0 min-w-0 w-full items-center justify-center"
  >
    <section
      ref="stage"
      class="shrink-0 min-h-0 min-w-0 relative"
      :aria-label="label"
    >
      <slot />
    </section>
  </div>
</template>
