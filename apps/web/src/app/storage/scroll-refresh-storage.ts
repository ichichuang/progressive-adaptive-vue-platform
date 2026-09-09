import {
  scrollRefreshSchema,
  type ScrollRefreshSnapshot,
  type ScrollRefreshPort,
} from '../scroll/scroll-refresh-contract'
import { applicationConfig } from '../config/app.config'
import type { StorageErrorAdapter } from './storage-error'
import type { StorageErrorId } from './storage-error-registry'

export function createScrollRefreshStorage(
  errorAdapter: StorageErrorAdapter,
  isDisposed: () => boolean,
): ScrollRefreshPort {
  const key = applicationConfig.scroll.refreshSessionStorageKey
  function failure(id: StorageErrorId, source: unknown): void {
    errorAdapter.normalize(id, {
      source,
      storageRecordId: id === 'storage-unavailable' ? null : 'scroll-refresh-session',
      schemaVersion: null,
      byteLength: null,
      payloadHash: null,
    })
  }
  function access(): Storage | undefined {
    try {
      return window.sessionStorage
    } catch (source: unknown) {
      failure('storage-unavailable', source)
      return undefined
    }
  }
  return {
    read(): ReturnType<ScrollRefreshPort['read']> {
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
      const parsed = scrollRefreshSchema.safeParse(value)
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
      return { status: 'found', snapshot: parsed.data }
    },
    clear() {
      if (isDisposed()) return { status: 'failed', reason: 'disposed' }
      const storage = access()
      if (storage === undefined) return { status: 'failed' }
      try {
        storage.removeItem(key)
      } catch (source: unknown) {
        failure('storage-write-denied', source)
        return { status: 'failed' }
      }
      try {
        if (storage.getItem(key) === null) return { status: 'saved' }
      } catch (source: unknown) {
        failure('storage-readback-mismatch', source)
        return { status: 'failed' }
      }
      failure('storage-readback-mismatch', undefined)
      return { status: 'failed' }
    },
    write(snapshot: ScrollRefreshSnapshot) {
      if (isDisposed()) return { status: 'failed', reason: 'disposed' }
      const parsed = scrollRefreshSchema.safeParse(snapshot)
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
        const confirmed = scrollRefreshSchema.safeParse(value)
        if (
          confirmed.success &&
          confirmed.data.routeName === parsed.data.routeName &&
          confirmed.data.ownerId === parsed.data.ownerId &&
          confirmed.data.left === parsed.data.left &&
          confirmed.data.top === parsed.data.top &&
          confirmed.data.context.length === parsed.data.context.length &&
          confirmed.data.context.every((value, index) => value === parsed.data.context[index])
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
