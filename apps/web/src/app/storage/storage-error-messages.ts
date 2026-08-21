import type { StorageErrorMessageKey } from './storage-error-registry'

export interface StorageErrorMessage {
  readonly title: string
  readonly description: string
  readonly retryActionLabel: string | null
  readonly reloadActionLabel: string | null
}

export const storageErrorMessageTable = Object.freeze({
  'storage-error.storage-unavailable': Object.freeze({
    title: 'Preferences unavailable',
    description: 'Local preferences could not be accessed on this device.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-read-denied': Object.freeze({
    title: 'Preferences unavailable',
    description: 'Local preferences could not be read on this device.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-parse-failed': Object.freeze({
    title: 'Preferences unavailable',
    description: 'Stored preferences could not be understood safely.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-schema-rejected': Object.freeze({
    title: 'Preferences unavailable',
    description: 'Stored preferences did not match the expected format.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-unsupported-version': Object.freeze({
    title: 'Preferences unavailable',
    description: 'Stored preferences use an unsupported version.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-principal-mismatch': Object.freeze({
    title: 'Preferences unavailable',
    description: 'Stored preferences do not belong to this context.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-serialization-failed': Object.freeze({
    title: 'Preferences unavailable',
    description: 'The preference change could not be saved.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-quota-exceeded': Object.freeze({
    title: 'Preferences unavailable',
    description: 'There is not enough local space to save preferences.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-write-denied': Object.freeze({
    title: 'Preferences unavailable',
    description: 'The preference change could not be saved on this device.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-readback-mismatch': Object.freeze({
    title: 'Preferences unavailable',
    description: 'The saved preference could not be confirmed.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-conflict-detected': Object.freeze({
    title: 'Preferences changed elsewhere',
    description: 'Preferences changed in another window. Review them before saving again.',
    retryActionLabel: 'Review and retry',
    reloadActionLabel: null,
  }),
} as const satisfies Readonly<Record<StorageErrorMessageKey, StorageErrorMessage>>)
