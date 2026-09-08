import { defineStore, type Pinia } from 'pinia'
import { ref, shallowRef } from 'vue'

import {
  reconcileNavigationGroupIds,
  type NavigationPreferencePort,
} from './navigation-preference-contract'

export const useNavigationPreferenceStore = defineStore('navigation-preference', () => {
  const wideNavigationCollapsed = ref(false)
  const expandedGroupIds = shallowRef<readonly string[]>([])
  let preferencePort: NavigationPreferencePort | undefined
  let admittedGroupIds: readonly string[] = []
  let initialized = false

  function initialize(port: NavigationPreferencePort, groupIds: readonly string[]): () => void {
    if (initialized) throw new Error('Navigation preference was already initialized.')
    const restored = port.read()
    admittedGroupIds = [...groupIds]
    wideNavigationCollapsed.value =
      restored.status === 'found' ? restored.preference.wideNavigationCollapsed : false
    expandedGroupIds.value = reconcileNavigationGroupIds(
      restored.status === 'found' ? restored.preference.expandedGroupIds : admittedGroupIds,
      admittedGroupIds,
    )
    preferencePort = port
    initialized = true
    return () => {
      preferencePort = undefined
      admittedGroupIds = []
    }
  }

  function persist(): void {
    preferencePort?.write({
      schemaVersion: 1,
      wideNavigationCollapsed: wideNavigationCollapsed.value,
      expandedGroupIds: expandedGroupIds.value,
    })
  }

  function setWideNavigationCollapsed(collapsed: boolean): void {
    if (preferencePort === undefined) return
    wideNavigationCollapsed.value = collapsed
    persist()
  }

  function setExpandedGroupIds(groupIds: readonly string[]): void {
    if (preferencePort === undefined) return
    expandedGroupIds.value = reconcileNavigationGroupIds(groupIds, admittedGroupIds)
    persist()
  }

  return {
    wideNavigationCollapsed,
    expandedGroupIds,
    initialize,
    setWideNavigationCollapsed,
    setExpandedGroupIds,
  }
})

export function initializeNavigationPreference(
  pinia: Pinia,
  preference: NavigationPreferencePort,
  groupIds: readonly string[],
): { dispose(): void } {
  const store = useNavigationPreferenceStore(pinia)
  return { dispose: store.initialize(preference, groupIds) }
}
