import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import { createClockRuntime } from './clock-runtime'

const clock = createClockRuntime({
  now: () => Date.now(),
  hidden: () => document.hidden,
  schedule(callback, delay) {
    const timer = setTimeout(callback, delay)
    return () => {
      clearTimeout(timer)
    }
  },
  listen(callback) {
    document.addEventListener('visibilitychange', callback)
    window.addEventListener('pageshow', callback)
    window.addEventListener('focus', callback)
    return () => {
      document.removeEventListener('visibilitychange', callback)
      window.removeEventListener('pageshow', callback)
      window.removeEventListener('focus', callback)
    }
  },
})
/** Shared wall clock. KeepAlive deactivation, hidden documents and disposal stop ticking.
 * Minute consumers do not force a second timer. No browser APIs are touched during SSR. */
export function useUiClock(
  options: {
    readonly interval?: 1000 | 60000
    readonly enabled?: MaybeRefOrGetter<boolean>
  } = {},
): ComputedRef<number> {
  const now = ref(Date.now())
  let active = false
  let unsubscribe: (() => void) | undefined
  function sync(): void {
    unsubscribe?.()
    unsubscribe = undefined
    if (active && toValue(options.enabled ?? true)) {
      unsubscribe = clock.subscribe(options.interval ?? 1000, (value) => {
        now.value = value
      })
    }
  }
  function activate(): void {
    if (active) return
    active = true
    sync()
  }
  function deactivate(): void {
    active = false
    sync()
  }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(deactivate)
  onScopeDispose(deactivate)
  watch(() => toValue(options.enabled ?? true), sync)
  return computed(() => now.value)
}
