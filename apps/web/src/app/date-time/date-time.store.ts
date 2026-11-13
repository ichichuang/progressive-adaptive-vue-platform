import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  dateTimePreferenceSchema,
  defaultDateTimeSettings,
  type DateTimePreference,
  type DateTimePreferencePort,
} from './date-time-preference'
export const useDateTimeStore = defineStore('date-time', () => {
  const preference = ref<DateTimePreference>({
    schemaVersion: 1,
    ...defaultDateTimeSettings,
  })
  const persistenceFailed = ref(false)
  let port: DateTimePreferencePort | undefined
  return {
    preference,
    persistenceFailed,
    initialize(
      source: DateTimePreferencePort,
      defaults: Omit<DateTimePreference, 'schemaVersion'>,
    ): () => void {
      port = source
      const read = () => {
        const result = source.read()
        persistenceFailed.value = result.status === 'unusable'
        if (result.status === 'found') preference.value = result.preference
        else if (result.status === 'missing') preference.value = { schemaVersion: 1, ...defaults }
      }
      preference.value = { schemaVersion: 1, ...defaults }
      read()
      const unsubscribe = source.subscribe(read)
      return () => {
        unsubscribe()
        port = undefined
      }
    },
    update(value: unknown): void {
      const parsed = dateTimePreferenceSchema.safeParse(value)
      if (!parsed.success) return
      preference.value = parsed.data
      persistenceFailed.value = port?.write(parsed.data).status !== 'saved'
    },
  }
})
