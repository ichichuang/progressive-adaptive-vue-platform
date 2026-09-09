import { defineStore } from 'pinia'
import { ref } from 'vue'
import { defaultRestoreOnRefresh, type ScrollPreferencePort } from './scroll-preference-contract'

export const useScrollPreferenceStore = defineStore('scroll-preference', () => {
  const restoreOnRefresh = ref(defaultRestoreOnRefresh)
  let preferencePort: ScrollPreferencePort | undefined
  let initialized = false
  return {
    restoreOnRefresh,
    initialize(port: ScrollPreferencePort): () => void {
      if (initialized) throw new Error('Scroll preference was already initialized.')
      const result = port.read()
      restoreOnRefresh.value =
        result.status === 'found' ? result.preference.restoreOnRefresh : defaultRestoreOnRefresh
      preferencePort = port
      initialized = true
      return () => {
        preferencePort = undefined
      }
    },
    setRestoreOnRefresh(enabled: boolean): void {
      if (preferencePort === undefined) return
      restoreOnRefresh.value = enabled
      preferencePort.write({ schemaVersion: 1, restoreOnRefresh: enabled })
    },
  }
})
