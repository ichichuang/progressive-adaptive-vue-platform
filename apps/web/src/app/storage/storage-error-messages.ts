import { getDefaultConsoleMessage } from '../../shared/i18n/default-messages'
import type { StorageErrorMessageKey } from './storage-error-registry'

export interface StorageErrorMessage {
  readonly title: string
  readonly description: string
  readonly retryActionLabel: string | null
  readonly reloadActionLabel: string | null
}

export const storageErrorMessageTable = Object.freeze({
  'storage-error.storage-unavailable': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-unavailable.title'),
    description: getDefaultConsoleMessage('storage-error.storage-unavailable.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-read-denied': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-read-denied.title'),
    description: getDefaultConsoleMessage('storage-error.storage-read-denied.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-parse-failed': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-parse-failed.title'),
    description: getDefaultConsoleMessage('storage-error.storage-parse-failed.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-schema-rejected': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-schema-rejected.title'),
    description: getDefaultConsoleMessage('storage-error.storage-schema-rejected.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-unsupported-version': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-unsupported-version.title'),
    description: getDefaultConsoleMessage('storage-error.storage-unsupported-version.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-principal-mismatch': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-principal-mismatch.title'),
    description: getDefaultConsoleMessage('storage-error.storage-principal-mismatch.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-serialization-failed': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-serialization-failed.title'),
    description: getDefaultConsoleMessage('storage-error.storage-serialization-failed.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-quota-exceeded': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-quota-exceeded.title'),
    description: getDefaultConsoleMessage('storage-error.storage-quota-exceeded.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-write-denied': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-write-denied.title'),
    description: getDefaultConsoleMessage('storage-error.storage-write-denied.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-readback-mismatch': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-readback-mismatch.title'),
    description: getDefaultConsoleMessage('storage-error.storage-readback-mismatch.description'),
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'storage-error.storage-conflict-detected': Object.freeze({
    title: getDefaultConsoleMessage('storage-error.storage-conflict-detected.title'),
    description: getDefaultConsoleMessage('storage-error.storage-conflict-detected.description'),
    retryActionLabel: getDefaultConsoleMessage(
      'storage-error.storage-conflict-detected.retryActionLabel',
    ),
    reloadActionLabel: null,
  }),
} as const satisfies Readonly<Record<StorageErrorMessageKey, StorageErrorMessage>>)
