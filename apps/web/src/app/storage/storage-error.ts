import type { StartupAttemptId } from '../bootstrap/lifecycle'
import { getStorageErrorRecord, type StorageErrorId } from './storage-error-registry'

interface StorageErrorSafeContext {
  readonly startupAttemptId: StartupAttemptId
  readonly storageRecordId: string | null
  readonly storageFailureCategory: StorageErrorId
  readonly schemaVersion: number | null
  readonly byteLength: number | null
  readonly payloadHash: string | null
  readonly releaseSha: string
  readonly buildVersion: string
}

interface StorageErrorNormalizationInput {
  readonly source: unknown
  readonly storageRecordId: string | null
  readonly schemaVersion: number | null
  readonly byteLength: number | null
  readonly payloadHash: string | null
}

const normalizedStorageErrorIdentity: unique symbol = Symbol('NormalizedStorageError')

interface NormalizedStorageError<Id extends StorageErrorId = StorageErrorId> {
  readonly [normalizedStorageErrorIdentity]: true
  readonly id: Id
  readonly category: 'storage'
  readonly errorInstanceId: string
  readonly timestamp: string
  readonly safeContext: Readonly<StorageErrorSafeContext>
}

const normalizedStorageErrors = new WeakSet()

function isNormalizedStorageError(source: unknown): source is NormalizedStorageError {
  return typeof source === 'object' && source !== null && normalizedStorageErrors.has(source)
}

function createNormalizedStorageError<Id extends StorageErrorId>(
  id: Id,
  safeContext: StorageErrorSafeContext,
): NormalizedStorageError<Id> {
  const record = getStorageErrorRecord(id)
  const normalized = Object.freeze({
    [normalizedStorageErrorIdentity]: true as const,
    id,
    category: record.category,
    errorInstanceId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    safeContext: Object.freeze(safeContext),
  })

  normalizedStorageErrors.add(normalized)
  return normalized
}

export interface StorageErrorAdapter {
  normalize(id: StorageErrorId, input: StorageErrorNormalizationInput): NormalizedStorageError
}

export function createStorageErrorAdapter(input: {
  readonly startupAttemptId: StartupAttemptId
  readonly releaseSha: string
  readonly buildVersion: string
}): StorageErrorAdapter {
  return {
    normalize(id, normalizationInput) {
      if (isNormalizedStorageError(normalizationInput.source)) {
        return normalizationInput.source
      }

      return createNormalizedStorageError(id, {
        startupAttemptId: input.startupAttemptId,
        storageRecordId: normalizationInput.storageRecordId,
        storageFailureCategory: id,
        schemaVersion: normalizationInput.schemaVersion,
        byteLength: normalizationInput.byteLength,
        payloadHash: normalizationInput.payloadHash,
        releaseSha: input.releaseSha,
        buildVersion: input.buildVersion,
      })
    },
  }
}
