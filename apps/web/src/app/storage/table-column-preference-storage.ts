import { parseUiTableColumnPreference, type UiTableColumnPreferenceStorage } from '@platform/ui'
import { applicationConfig } from '../config/app.config'
import type { StorageErrorAdapter } from './storage-error'
import type { StorageErrorId } from './storage-error-registry'

export function createTableColumnPreferenceStorage(
  errorAdapter: StorageErrorAdapter,
  isDisposed: () => boolean,
): UiTableColumnPreferenceStorage {
  function failure(id: StorageErrorId, source: unknown): void {
    errorAdapter.normalize(id, {
      source,
      storageRecordId: 'table-column-preferences',
      schemaVersion: null,
      byteLength: null,
      payloadHash: null,
    })
  }
  function access(): Storage | undefined {
    if (isDisposed()) return undefined
    try {
      return window.localStorage
    } catch (source: unknown) {
      failure('storage-unavailable', source)
      return undefined
    }
  }
  const keyFor = (key: string): string =>
    `${applicationConfig.tables.columnPreferenceStorageKey}:${encodeURIComponent(key)}`
  return {
    read(key) {
      const storage = access()
      if (!storage) return null
      let raw: string | null
      try {
        raw = storage.getItem(keyFor(key))
      } catch (source: unknown) {
        failure('storage-read-denied', source)
        return null
      }
      if (raw === null) return null
      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch (source: unknown) {
        failure('storage-parse-failed', source)
        return null
      }
      try {
        return parseUiTableColumnPreference(value)
      } catch (source: unknown) {
        failure('storage-schema-rejected', source)
        return null
      }
    },
    write(key, preference) {
      const storage = access()
      if (!storage) return
      const serialized = JSON.stringify(parseUiTableColumnPreference(preference))
      try {
        storage.setItem(keyFor(key), serialized)
        if (storage.getItem(keyFor(key)) !== serialized)
          failure('storage-readback-mismatch', undefined)
      } catch (source: unknown) {
        failure('storage-write-denied', source)
      }
    },
    clear(key) {
      const storage = access()
      if (!storage) return
      try {
        storage.removeItem(keyFor(key))
      } catch (source: unknown) {
        failure('storage-write-denied', source)
      }
    },
  }
}
