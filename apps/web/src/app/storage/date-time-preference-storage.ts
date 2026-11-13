import { subscribeSharedPreferenceChanges } from './shared-preference-events'
import {
  dateTimePreferenceSchema,
  type DateTimePreference,
  type DateTimePreferencePort,
} from '../date-time/date-time-preference'
import { applicationConfig } from '../config/app.config'
import type { StorageErrorAdapter } from './storage-error'
import type { StorageErrorId } from './storage-error-registry'

export function createDateTimePreferenceStorage(
  errorAdapter: StorageErrorAdapter,
  isDisposed: () => boolean,
): DateTimePreferencePort {
  const key = applicationConfig.dateTime.preferenceStorageKey
  function failure(id: StorageErrorId, source: unknown): void {
    errorAdapter.normalize(id, {
      source,
      storageRecordId: id === 'storage-unavailable' ? null : 'date-time-preference',
      schemaVersion: null,
      byteLength: null,
      payloadHash: null,
    })
  }
  function access(): Storage | undefined {
    try {
      return window.localStorage
    } catch (source: unknown) {
      failure('storage-unavailable', source)
      return undefined
    }
  }
  return {
    subscribe(invalidate) {
      return subscribeSharedPreferenceChanges([key], () => {
        if (!isDisposed()) invalidate()
      })
    },
    read(): ReturnType<DateTimePreferencePort['read']> {
      if (isDisposed()) return { status: 'unusable', reason: 'disposed' }
      const storage = access()
      if (storage === undefined) return { status: 'unusable', reason: 'unavailable' }
      let raw: string | null
      try {
        raw = storage.getItem(key)
      } catch (source: unknown) {
        failure('storage-read-denied', source)
        return { status: 'unusable', reason: 'unavailable' }
      }
      if (raw === null) return { status: 'missing' }
      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch (source: unknown) {
        failure('storage-parse-failed', source)
        return { status: 'unusable', reason: 'invalid' }
      }
      const parsed = dateTimePreferenceSchema.safeParse(value)
      if (!parsed.success) {
        const unsupportedVersion =
          typeof value === 'object' &&
          value !== null &&
          'schemaVersion' in value &&
          value.schemaVersion !== 1
        failure(
          unsupportedVersion ? 'storage-unsupported-version' : 'storage-schema-rejected',
          parsed.error,
        )
        return { status: 'unusable', reason: 'invalid' }
      }
      return { status: 'found', preference: parsed.data }
    },
    write(preference: DateTimePreference) {
      if (isDisposed()) return { status: 'failed', reason: 'disposed' }
      const parsed = dateTimePreferenceSchema.safeParse(preference)
      if (!parsed.success) {
        failure('storage-schema-rejected', parsed.error)
        return { status: 'failed' }
      }
      let serialized: string
      try {
        serialized = JSON.stringify(parsed.data)
      } catch (source: unknown) {
        failure('storage-serialization-failed', source)
        return { status: 'failed' }
      }
      const storage = access()
      if (storage === undefined) return { status: 'failed' }
      try {
        storage.setItem(key, serialized)
      } catch (source: unknown) {
        failure(
          source instanceof DOMException && source.name === 'QuotaExceededError'
            ? 'storage-quota-exceeded'
            : 'storage-write-denied',
          source,
        )
        return { status: 'failed' }
      }
      let raw: string | null
      try {
        raw = storage.getItem(key)
      } catch (source: unknown) {
        failure('storage-readback-mismatch', source)
        return { status: 'failed' }
      }
      try {
        const value: unknown = raw === null ? null : JSON.parse(raw)
        const confirmed = dateTimePreferenceSchema.safeParse(value)
        if (
          confirmed.success &&
          confirmed.data.timeZone === parsed.data.timeZone &&
          confirmed.data.hourCycle === parsed.data.hourCycle
        )
          return { status: 'saved' }
      } catch (source: unknown) {
        failure('storage-readback-mismatch', source)
        return { status: 'failed' }
      }
      failure('storage-readback-mismatch', undefined)
      return { status: 'failed' }
    },
  }
}
