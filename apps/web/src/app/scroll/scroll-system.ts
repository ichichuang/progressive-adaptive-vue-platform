import type { Pinia } from 'pinia'
import { watch } from 'vue'
import type { RouterLifecycleHandle } from '../router/router-lifecycle'
import type { ScrollPreferencePort } from './scroll-preference-contract'
import type { ScrollRefreshPort } from './scroll-refresh-contract'
import { useScrollPreferenceStore } from './scroll-preference.store'

export function initializeScrollSystem(
  pinia: Pinia,
  router: RouterLifecycleHandle,
  preference: ScrollPreferencePort,
  refresh: ScrollRefreshPort,
): { dispose(): void } {
  const store = useScrollPreferenceStore(pinia)
  const detachPreference = store.initialize(preference)
  let disconnectRouter: (() => void) | undefined
  let stopPreference: (() => void) | undefined
  try {
    const restored = refresh.read()
    disconnectRouter = router.connectRefreshScroll({
      readEnabled: () => store.restoreOnRefresh,
      pending: restored.status === 'found' ? restored.snapshot : undefined,
      capture: (snapshot) => {
        refresh.write(snapshot)
      },
    })
    stopPreference = watch(
      () => store.restoreOnRefresh,
      (enabled) => {
        if (!enabled) refresh.clear()
      },
      { flush: 'sync' },
    )
  } catch (source: unknown) {
    detachPreference()
    disconnectRouter?.()
    throw source
  }
  let disposed = false
  return {
    dispose() {
      if (disposed) return
      disposed = true
      stopPreference()
      disconnectRouter()
      detachPreference()
    },
  }
}
