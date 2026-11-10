import { z } from 'zod'
import { applicationConfig } from '../config/app.config'
import type { FormDraftFailure, FormDraftStorage } from '../forms/form-draft-contract'
import type { StorageErrorAdapter } from './storage-error'
import type { StorageErrorId } from './storage-error-registry'

const envelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  scope: z.string().min(1),
  schemaKey: z.string().min(1),
  savedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  data: z.unknown(),
})

export function createFormDraftStorage(
  errorAdapter: StorageErrorAdapter,
  isDisposed: () => boolean,
): FormDraftStorage {
  function failure(id: StorageErrorId, source?: unknown): void {
    errorAdapter.normalize(id, {
      source,
      storageRecordId: 'form-drafts',
      schemaVersion: null,
      byteLength: null,
      payloadHash: null,
    })
  }
  return {
    create<T>(input: {
      readonly scope: string
      readonly schemaKey: string
      readonly maxAgeMs: number
      readonly parse: (value: unknown) => T
    }) {
      if (
        !input.scope.trim() ||
        !input.schemaKey.trim() ||
        !Number.isSafeInteger(input.maxAgeMs) ||
        input.maxAgeMs <= 0
      )
        throw new TypeError(
          'Form drafts require an explicit scope, schema identity and positive expiry.',
        )
      const key = `${applicationConfig.forms.draftStorageKey}:${encodeURIComponent(input.scope)}`
      // A comparison token prevents stale tabs from silently replacing a newer draft.
      let observed: string | null | undefined
      let rejected = false
      function access(): Storage | undefined {
        if (isDisposed()) return undefined
        try {
          return window.localStorage
        } catch (source: unknown) {
          failure('storage-unavailable', source)
          return undefined
        }
      }
      function current(storage: Storage): { raw: string | null } | undefined {
        try {
          return { raw: storage.getItem(key) }
        } catch (source: unknown) {
          failure('storage-read-denied', source)
          return undefined
        }
      }
      function writable(storage: Storage): FormDraftFailure | undefined {
        const latest = current(storage)
        if (!latest) return 'unavailable'
        if (observed === undefined || latest.raw !== observed) {
          failure('storage-conflict-detected')
          return 'conflict'
        }
        return undefined
      }
      return {
        read() {
          const storage = access()
          const latest = storage && current(storage)
          if (!latest) return { status: 'unusable' as const, reason: 'unavailable' as const }
          observed = latest.raw
          rejected = false
          if (observed === null) return { status: 'missing' as const }
          let value: unknown
          try {
            value = JSON.parse(observed)
          } catch (source: unknown) {
            failure('storage-parse-failed', source)
            rejected = true
            return { status: 'unusable' as const, reason: 'invalid' as const }
          }
          const result = envelopeSchema.safeParse(value)
          if (!result.success) {
            const version =
              typeof value === 'object' &&
              value !== null &&
              'schemaVersion' in value &&
              value.schemaVersion !== 1
            failure(
              version ? 'storage-unsupported-version' : 'storage-schema-rejected',
              result.error,
            )
            rejected = true
            return {
              status: 'unusable' as const,
              reason: version ? ('incompatible' as const) : ('invalid' as const),
            }
          }
          const envelope = result.data
          if (envelope.scope !== input.scope || envelope.schemaKey !== input.schemaKey) {
            failure('storage-schema-rejected')
            rejected = true
            return { status: 'unusable' as const, reason: 'incompatible' as const }
          }
          if (envelope.expiresAt <= envelope.savedAt || envelope.savedAt > Date.now()) {
            failure('storage-schema-rejected')
            rejected = true
            return { status: 'unusable' as const, reason: 'invalid' as const }
          }
          if (envelope.expiresAt <= Date.now()) {
            rejected = true
            return { status: 'unusable' as const, reason: 'expired' as const }
          }
          try {
            return {
              status: 'found' as const,
              data: input.parse(envelope.data),
              savedAt: envelope.savedAt,
              expiresAt: envelope.expiresAt,
            }
          } catch (source: unknown) {
            failure('storage-schema-rejected', source)
            rejected = true
            return { status: 'unusable' as const, reason: 'invalid' as const }
          }
        },
        write(data: T) {
          if (rejected) return { status: 'failed' as const, reason: 'invalid' as const }
          const storage = access()
          if (!storage) return { status: 'failed' as const, reason: 'unavailable' as const }
          const conflict = writable(storage)
          if (conflict) return { status: 'failed' as const, reason: conflict }
          const savedAt = Date.now()
          const expiresAt = savedAt + input.maxAgeMs
          let serialized: string
          try {
            const envelope = envelopeSchema.parse({
              schemaVersion: 1,
              scope: input.scope,
              schemaKey: input.schemaKey,
              savedAt,
              expiresAt,
              data: input.parse(data),
            })
            serialized = JSON.stringify(envelope)
            // Verify JSON round-trip before mutating persisted data.
            input.parse(envelopeSchema.parse(JSON.parse(serialized)).data)
          } catch (source: unknown) {
            failure('storage-serialization-failed', source)
            return { status: 'failed' as const, reason: 'invalid' as const }
          }
          try {
            storage.setItem(key, serialized)
          } catch (source: unknown) {
            failure(
              source instanceof DOMException && source.name === 'QuotaExceededError'
                ? 'storage-quota-exceeded'
                : 'storage-write-denied',
              source,
            )
            return { status: 'failed' as const, reason: 'unavailable' as const }
          }
          const confirmed = current(storage)
          if (confirmed?.raw !== serialized) {
            failure('storage-readback-mismatch')
            return {
              status: 'failed' as const,
              reason: confirmed ? ('conflict' as const) : ('unavailable' as const),
            }
          }
          observed = serialized
          return { status: 'saved' as const, savedAt, expiresAt }
        },
        clear() {
          const storage = access()
          if (!storage) return { status: 'failed' as const, reason: 'unavailable' as const }
          const conflict = writable(storage)
          if (conflict) return { status: 'failed' as const, reason: conflict }
          try {
            storage.removeItem(key)
          } catch (source: unknown) {
            failure('storage-write-denied', source)
            return { status: 'failed' as const, reason: 'unavailable' as const }
          }
          const confirmed = current(storage)
          if (confirmed?.raw !== null) {
            failure('storage-readback-mismatch')
            return {
              status: 'failed' as const,
              reason: confirmed ? ('conflict' as const) : ('unavailable' as const),
            }
          }
          observed = null
          rejected = false
          return { status: 'cleared' as const }
        },
      }
    },
  }
}

/** Invalidations only. Each session re-reads its own scope through the validated port. */
export function subscribeFormDraftChanges(invalidate: () => void): () => void {
  const prefix = `${applicationConfig.forms.draftStorageKey}:`
  const receive = (event: StorageEvent): void => {
    if (event.key !== null && !event.key.startsWith(prefix)) return
    try {
      if (event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    invalidate()
  }
  window.addEventListener('storage', receive)
  return () => {
    window.removeEventListener('storage', receive)
  }
}
