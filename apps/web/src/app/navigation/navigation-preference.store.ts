import { defineStore, type Pinia } from 'pinia'
import { ref, shallowRef } from 'vue'

import {
  defaultNavigationAccordion,
  reconcileNavigationGroupIds,
  type NavigationPreference,
  type NavigationPreferenceMutationResult,
  type NavigationPreferencePort,
} from './navigation-preference-contract'

export const useNavigationPreferenceStore = defineStore('navigation-preference', () => {
  const wideNavigationCollapsed = ref(false)
  const accordion = ref(defaultNavigationAccordion)
  const expandedGroupIds = shallowRef<readonly string[]>([])
  let preferencePort: NavigationPreferencePort | undefined
  let admittedGroupIds: readonly string[] = []
  let groupParents: ReadonlyMap<string, string | undefined> = new Map()
  let initialized = false
  let applying = false

  function reconcileExpansion(
    groupIds: readonly string[],
    useAccordion = accordion.value,
  ): readonly string[] {
    const valid = reconcileNavigationGroupIds(groupIds, admittedGroupIds)
    if (!useAccordion) return valid
    const selected = new Map<string | undefined, string>()
    for (const id of valid) selected.set(groupParents.get(id), id)
    return valid.filter((id) => {
      if (selected.get(groupParents.get(id)) !== id) return false
      let parent = groupParents.get(id)
      while (parent !== undefined) {
        if (selected.get(groupParents.get(parent)) !== parent) return false
        parent = groupParents.get(parent)
      }
      return true
    })
  }

  function initialize(
    port: NavigationPreferencePort,
    groupIds: readonly string[],
    parents: ReadonlyMap<string, string | undefined> = new Map(),
  ): () => void {
    if (initialized) throw new Error('Navigation preference was already initialized.')
    const restored = port.read()
    admittedGroupIds = [...groupIds]
    groupParents = parents
    wideNavigationCollapsed.value =
      restored.status === 'found' ? restored.preference.wideNavigationCollapsed : false
    accordion.value =
      restored.status === 'found' ? restored.preference.accordion : defaultNavigationAccordion
    expandedGroupIds.value = reconcileExpansion(
      restored.status === 'found' ? restored.preference.expandedGroupIds : admittedGroupIds,
    )
    preferencePort = port
    initialized = true
    const unsubscribe = port.subscribe(() => {
      const latest = port.read()
      if (latest.status === 'unusable') return
      wideNavigationCollapsed.value =
        latest.status === 'found' ? latest.preference.wideNavigationCollapsed : false
      accordion.value =
        latest.status === 'found' ? latest.preference.accordion : defaultNavigationAccordion
      expandedGroupIds.value = reconcileExpansion(
        latest.status === 'found' ? latest.preference.expandedGroupIds : admittedGroupIds,
      )
    })
    return () => {
      unsubscribe()
      preferencePort = undefined
      admittedGroupIds = []
      groupParents = new Map()
    }
  }

  function currentPreference(): NavigationPreference {
    return {
      schemaVersion: 2,
      wideNavigationCollapsed: wideNavigationCollapsed.value,
      accordion: accordion.value,
      expandedGroupIds: [...expandedGroupIds.value],
    }
  }

  function persist(
    candidate: NavigationPreference,
  ): ReturnType<NavigationPreferencePort['write']>['status'] {
    return preferencePort?.write(candidate).status ?? 'failed'
  }

  function applyPreference(change: () => NavigationPreference): NavigationPreferenceMutationResult {
    if (preferencePort === undefined) return { status: 'not-ready' }
    if (applying) return { status: 'busy' }
    applying = true
    try {
      const candidate = change()
      return {
        status: 'applied',
        persistence: persist(candidate),
      }
    } finally {
      applying = false
    }
  }

  function setWideNavigationCollapsed(collapsed: boolean): NavigationPreferenceMutationResult {
    return applyPreference(() => {
      const candidate = { ...currentPreference(), wideNavigationCollapsed: collapsed }
      wideNavigationCollapsed.value = candidate.wideNavigationCollapsed
      return candidate
    })
  }

  function setExpandedGroupIds(groupIds: readonly string[]): NavigationPreferenceMutationResult {
    return applyPreference(() => {
      const candidate = { ...currentPreference(), expandedGroupIds: reconcileExpansion(groupIds) }
      expandedGroupIds.value = candidate.expandedGroupIds
      return candidate
    })
  }

  function setNavigationAccordion(
    enabled: boolean,
    groupIds: readonly string[],
  ): NavigationPreferenceMutationResult {
    return applyPreference(() => {
      const candidate = {
        ...currentPreference(),
        accordion: enabled,
        expandedGroupIds: reconcileExpansion(groupIds, enabled),
      }
      accordion.value = candidate.accordion
      expandedGroupIds.value = candidate.expandedGroupIds
      return candidate
    })
  }

  return {
    wideNavigationCollapsed,
    accordion,
    expandedGroupIds,
    initialize,
    setWideNavigationCollapsed,
    setExpandedGroupIds,
    setNavigationAccordion,
  }
})

export function initializeNavigationPreference(
  pinia: Pinia,
  preference: NavigationPreferencePort,
  groupIds: readonly string[],
  parents?: ReadonlyMap<string, string | undefined>,
): { dispose(): void } {
  const store = useNavigationPreferenceStore(pinia)
  return { dispose: store.initialize(preference, groupIds, parents) }
}
