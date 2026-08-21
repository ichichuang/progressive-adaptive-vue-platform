export type StorageErrorId =
  | 'storage-unavailable'
  | 'storage-read-denied'
  | 'storage-parse-failed'
  | 'storage-schema-rejected'
  | 'storage-unsupported-version'
  | 'storage-principal-mismatch'
  | 'storage-serialization-failed'
  | 'storage-quota-exceeded'
  | 'storage-write-denied'
  | 'storage-readback-mismatch'
  | 'storage-conflict-detected'

export type StorageErrorMessageKey =
  | 'storage-error.storage-unavailable'
  | 'storage-error.storage-read-denied'
  | 'storage-error.storage-parse-failed'
  | 'storage-error.storage-schema-rejected'
  | 'storage-error.storage-unsupported-version'
  | 'storage-error.storage-principal-mismatch'
  | 'storage-error.storage-serialization-failed'
  | 'storage-error.storage-quota-exceeded'
  | 'storage-error.storage-write-denied'
  | 'storage-error.storage-readback-mismatch'
  | 'storage-error.storage-conflict-detected'

type StorageErrorRecoverability = 'none' | 'retry-operation'

type StorageErrorRetryOwner = 'none' | 'user'

type StorageErrorReportLevel = 'warning' | 'error'

const storageErrorSafeContextFields = Object.freeze([
  'startupAttemptId',
  'storageRecordId',
  'storageFailureCategory',
  'schemaVersion',
  'byteLength',
  'payloadHash',
  'releaseSha',
  'buildVersion',
] as const)

export interface StorageErrorRegistryRecord {
  readonly id: StorageErrorId
  readonly category: 'storage'
  readonly userMessageKey: StorageErrorMessageKey
  readonly recoverability: StorageErrorRecoverability
  readonly retryOwner: StorageErrorRetryOwner
  readonly reportLevel: StorageErrorReportLevel
  readonly safeContextFields: typeof storageErrorSafeContextFields
  readonly capabilityStatus: 'ACTIVE'
}

export const storageErrorRegistry = Object.freeze([
  Object.freeze({
    id: 'storage-unavailable',
    category: 'storage',
    userMessageKey: 'storage-error.storage-unavailable',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-read-denied',
    category: 'storage',
    userMessageKey: 'storage-error.storage-read-denied',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-parse-failed',
    category: 'storage',
    userMessageKey: 'storage-error.storage-parse-failed',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'warning',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-schema-rejected',
    category: 'storage',
    userMessageKey: 'storage-error.storage-schema-rejected',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'warning',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-unsupported-version',
    category: 'storage',
    userMessageKey: 'storage-error.storage-unsupported-version',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'warning',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-principal-mismatch',
    category: 'storage',
    userMessageKey: 'storage-error.storage-principal-mismatch',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'warning',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-serialization-failed',
    category: 'storage',
    userMessageKey: 'storage-error.storage-serialization-failed',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-quota-exceeded',
    category: 'storage',
    userMessageKey: 'storage-error.storage-quota-exceeded',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-write-denied',
    category: 'storage',
    userMessageKey: 'storage-error.storage-write-denied',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-readback-mismatch',
    category: 'storage',
    userMessageKey: 'storage-error.storage-readback-mismatch',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'storage-conflict-detected',
    category: 'storage',
    userMessageKey: 'storage-error.storage-conflict-detected',
    recoverability: 'retry-operation',
    retryOwner: 'user',
    reportLevel: 'warning',
    safeContextFields: storageErrorSafeContextFields,
    capabilityStatus: 'ACTIVE',
  }),
] as const satisfies readonly StorageErrorRegistryRecord[])

export function getStorageErrorRecord<Id extends StorageErrorId>(
  id: Id,
): Extract<(typeof storageErrorRegistry)[number], { readonly id: Id }> {
  const record = storageErrorRegistry.find((candidate) => candidate.id === id)

  if (record === undefined) {
    throw new TypeError()
  }

  return record as Extract<(typeof storageErrorRegistry)[number], { readonly id: Id }>
}
