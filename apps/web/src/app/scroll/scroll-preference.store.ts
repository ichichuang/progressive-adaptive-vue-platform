import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  defaultRestoreOnRefresh,
  type ScrollPreference,
  type ScrollPreferenceMutationResult,
  type ScrollPreferencePort,
} from './scroll-preference-contract'

export const useScrollPreferenceStore = defineStore('scroll-preference', () => {
  const restoreOnRefresh = ref(defaultRestoreOnRefresh)
  let preferencePort: ScrollPreferencePort | undefined
  let initialized = false
  let applying = false

  function persist(
    candidate: ScrollPreference,
  ): ReturnType<ScrollPreferencePort['write']>['status'] {
    return preferencePort?.write(candidate).status ?? 'failed'
  }

  return {
    restoreOnRefresh,
    initialize(port: ScrollPreferencePort): () => void {
      if (initialized) throw new Error('Scroll preference was already initialized.')
      const result = port.read()
      restoreOnRefresh.value =
        result.status === 'found' ? result.preference.restoreOnRefresh : defaultRestoreOnRefresh
      preferencePort = port
      initialized = true
      const unsubscribe = port.subscribe(() => {
        const latest = port.read()
        if (latest.status !== 'unusable')
          restoreOnRefresh.value =
            latest.status === 'found' ? latest.preference.restoreOnRefresh : defaultRestoreOnRefresh
      })
      return () => {
        unsubscribe()
        preferencePort = undefined
      }
    },
    setRestoreOnRefresh(enabled: boolean): ScrollPreferenceMutationResult {
      if (preferencePort === undefined) return { status: 'not-ready' }
      if (applying) return { status: 'busy' }
      applying = true
      try {
        const candidate: ScrollPreference = { schemaVersion: 1, restoreOnRefresh: enabled }
        restoreOnRefresh.value = candidate.restoreOnRefresh
        return { status: 'applied', persistence: persist(candidate) }
      } finally {
        applying = false
      }
    },
  }
})
