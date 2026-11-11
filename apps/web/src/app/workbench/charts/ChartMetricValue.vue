<script setup lang="ts">
import { computed, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { useAppearanceReadBoundary } from '../../appearance/appearance-read-boundary'

const props = defineProps<{
  readonly value: string
  readonly locale: string
  readonly active: boolean
}>()
const appearance = useAppearanceReadBoundary()
const host = ref<HTMLElement | null>(null)
const displayed = ref(Number(props.value))
const number = computed(() => Number(props.value))
const formatted = computed(() =>
  Number.isFinite(number.value)
    ? new Intl.NumberFormat(props.locale).format(Math.round(displayed.value))
    : props.value,
)
let frame: number | undefined
function stop(): void {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
}
function settle(): void {
  stop()
  displayed.value = number.value
}
watch([number, () => props.active, () => appearance.snapshot.value.motion], () => {
  stop()
  const target = number.value
  if (
    !host.value ||
    !props.active ||
    appearance.snapshot.value.motion !== 'full' ||
    !Number.isFinite(displayed.value) ||
    !Number.isFinite(target)
  ) {
    displayed.value = target
    return
  }
  const from = displayed.value
  const style = getComputedStyle(host.value)
  const duration =
    Number.parseFloat(style.transitionDuration) *
    (style.transitionDuration.endsWith('ms') ? 1 : 1000) *
    4
  if (!duration || from === target) {
    displayed.value = target
    return
  }
  const curve = /^cubic-bezier\(([^)]+)\)$/u
    .exec(style.transitionTimingFunction)?.[1]
    ?.split(',')
    .map(Number)
  const [x1, y1, x2, y2] = curve ?? []
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    displayed.value = target
    return
  }
  // This local scalar clock changes only text, not DOM presentation. Match the
  // chart's resolved timing curve and retarget from the currently displayed value.
  const bezier = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3
  const started = performance.now()
  const advance = (now: number): void => {
    const progress = Math.min((now - started) / duration, 1)
    let low = 0
    let high = 1
    for (let index = 0; index < 12; index += 1) {
      const middle = (low + high) / 2
      if (bezier(middle, x1, x2) < progress) low = middle
      else high = middle
    }
    displayed.value = from + (target - from) * bezier((low + high) / 2, y1, y2)
    if (progress < 1) frame = requestAnimationFrame(advance)
    else {
      displayed.value = target
      frame = undefined
    }
  }
  frame = requestAnimationFrame(advance)
})
onDeactivated(settle)
onScopeDispose(stop)
</script>

<template>
  <span
    ref="host"
    class="duration-motion ease-motion"
    :aria-label="value"
  >
    <span
      aria-hidden="true"
      v-text="formatted"
    />
  </span>
</template>
