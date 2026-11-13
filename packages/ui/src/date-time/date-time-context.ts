import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'
import type { UiDateTimeContext } from './date-time'
export const uiDateTimeContext: InjectionKey<ComputedRef<UiDateTimeContext | undefined>> =
  Symbol('ui-date-time')
/** Read the nearest explicit display policy. No clock, persistence or inferred time zone. */
export function useUiDateTime(): ComputedRef<UiDateTimeContext | undefined> {
  return inject(
    uiDateTimeContext,
    computed(() => undefined),
  )
}
