import {
  workspaceSessionSchema,
  type WorkspaceSession,
  type WorkspaceSessionPort,
  type WorkspaceSessionReadResult,
} from '../workspace/workspace-session-contract'
import { applicationConfig } from '../config/app.config'
import type { StorageErrorAdapter } from './storage-error'
import type { StorageErrorId } from './storage-error-registry'

export function createWorkspaceSessionStorage(
  errorAdapter: StorageErrorAdapter,
  isDisposed: () => boolean,
): WorkspaceSessionPort {
  const key = applicationConfig.workspace.sessionStorageKey
  function failure(id: StorageErrorId, source: unknown): void {
    errorAdapter.normalize(id, {
      source,
      storageRecordId: id === 'storage-unavailable' ? null : 'workspace-session',
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
    read(): WorkspaceSessionReadResult {
      if (isDisposed()) return { status: 'unusable', reason: 'unavailable' }
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
      const parsed = workspaceSessionSchema.safeParse(value)
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
      return { status: 'found', session: parsed.data }
    },
    write(session: WorkspaceSession) {
      if (isDisposed()) return { status: 'failed' }
      const parsed = workspaceSessionSchema.safeParse(session)
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
        failure('storage-read-denied', source)
        return { status: 'failed' }
      }
      try {
        const value: unknown = raw === null ? null : JSON.parse(raw)
        const confirmed = workspaceSessionSchema.safeParse(value)
        if (
          confirmed.success &&
          confirmed.data.openRouteNames.length === parsed.data.openRouteNames.length &&
          confirmed.data.openRouteNames.every(
            (id, index) => id === parsed.data.openRouteNames[index],
          )
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
