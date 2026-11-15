import { onScopeDispose, ref, watch, type Ref } from 'vue'

/** Keep one pending tick and stop it when the owning chart is inactive. */
export function useLiveChartClock(
  playing: Readonly<Ref<boolean>>,
  interval: Readonly<Ref<number>>,
) {
  const tick = ref(0)
  let timer: ReturnType<typeof setTimeout> | undefined
  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  function schedule(): void {
    clearTimer()
    if (!playing.value) return
    timer = setTimeout(() => {
      timer = undefined
      if (!playing.value) return
      tick.value += 1
      schedule()
    }, interval.value)
  }
  watch([playing, interval], schedule, { flush: 'sync', immediate: true })
  onScopeDispose(clearTimer)
  return tick
}
