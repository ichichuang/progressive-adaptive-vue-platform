import { computed, ref, watch, type ComputedRef } from 'vue'
import { useUiClock } from '@platform/ui'
/** Browsers provide no timezone-change event. Recheck once per visible minute and
 * immediately on focus/pageshow through the shared clock; never poll hidden tabs. */
export function useSystemTimeZone(enabled: ComputedRef<boolean>): ComputedRef<string> {
  const read = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const zone = ref(read())
  const tick = useUiClock({ interval: 60000, enabled })
  watch(
    [tick, enabled],
    () => {
      if (enabled.value) zone.value = read()
    },
    { immediate: true },
  )
  return computed(() => zone.value)
}
