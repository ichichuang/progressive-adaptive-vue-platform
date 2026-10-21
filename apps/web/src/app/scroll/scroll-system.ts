import type { Pinia } from 'pinia'
import { watch } from 'vue'
import type { RouterLifecycleHandle } from '../router/router-lifecycle'
import type { ScrollPreferencePort } from './scroll-preference-contract'
import type { ScrollRefreshPort } from './scroll-refresh-contract'
import { useScrollPreferenceStore } from './scroll-preference.store'

export interface ScrollDocumentLifecycle {
  readReloadEligible(): boolean
  readWorkspaceGeneration(): number | undefined
}

export function initializeScrollSystem(
  pinia: Pinia,
  router: RouterLifecycleHandle,
  preference: ScrollPreferencePort,
  refresh: ScrollRefreshPort,
  documentLifecycle: ScrollDocumentLifecycle,
): { dispose(): void } {
  const store = useScrollPreferenceStore(pinia)
  const detachPreference = store.initialize(preference)
  let connection: ReturnType<RouterLifecycleHandle['connectRefreshScroll']> | undefined
  let stopPreference: (() => void) | undefined
  function clearSnapshot(): boolean {
    const result = refresh.clear()
    if (result.status === 'saved') return true
    // The existing adapter reports failure; neither deletion nor freshness is confirmed.
    return false
  }
  try {
    const restored = refresh.read()
    const pending = restored.status === 'found' && clearSnapshot() ? restored.snapshot : undefined
    connection = router.connectRefreshScroll({
      ...documentLifecycle,
      readEnabled: () => store.restoreOnRefresh,
      pending,
      capture: (snapshot) => {
        if (refresh.write(snapshot).status === 'failed') clearSnapshot()
      },
      invalidate: () => {
        clearSnapshot()
      },
    })
    stopPreference = watch(
      () => store.restoreOnRefresh,
      (enabled) => {
        if (!enabled) {
          connection?.discardPending()
          clearSnapshot()
        }
      },
      { flush: 'sync' },
    )
  } catch (source: unknown) {
    detachPreference()
    connection?.dispose()
    throw source
  }
  let disposed = false
  return {
    dispose() {
      if (disposed) return
      disposed = true
      stopPreference()
      connection.dispose()
      detachPreference()
    },
  }
}
