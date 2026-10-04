import { applicationConfig } from '../config/app.config'
import {
  browserPageBindingSchema,
  browserPageDiscoveryChannelName,
  browserPageDiscoverySchema,
  browserPageSessionSchema,
  type BrowserPageDiscovery,
  type BrowserPageSessionPort,
  type BrowserPageSessionSnapshot,
} from '../router/browser-page-session-contract'
import type { StorageErrorAdapter } from './storage-error'
import type { StorageErrorId } from './storage-error-registry'

export function createBrowserPageSessionStorage(
  errorAdapter: StorageErrorAdapter,
  isDisposed: () => boolean,
): { readonly port: BrowserPageSessionPort; dispose(): void } {
  const key = applicationConfig.browserPage.sessionStorageKey
  const listeners = new Set<(message: BrowserPageDiscovery) => void>()
  let disposed = false
  let channel: BroadcastChannel | null = null

  function inactive(): boolean {
    return disposed || isDisposed()
  }

  function failure(id: StorageErrorId, source: unknown): void {
    errorAdapter.normalize(id, {
      source,
      storageRecordId: id === 'storage-unavailable' ? null : 'browser-page-session',
      schemaVersion: null,
      byteLength: null,
      payloadHash: null,
    })
  }

  function access(target: Window): Storage | undefined {
    try {
      return target.sessionStorage
    } catch (source: unknown) {
      failure('storage-unavailable', source)
      return undefined
    }
  }

  function writeTo(
    target: Window,
    snapshot: BrowserPageSessionSnapshot,
  ): ReturnType<BrowserPageSessionPort['write']> {
    if (inactive()) return { status: 'failed' }
    const parsed = browserPageSessionSchema.safeParse(snapshot)
    if (!parsed.success) {
      failure('storage-schema-rejected', parsed.error)
      return { status: 'failed' }
    }
    let serialized: string
    try {
      serialized = JSON.stringify(parsed.data)
      const roundTrip: unknown = JSON.parse(serialized)
      if (!browserPageSessionSchema.safeParse(roundTrip).success)
        throw new TypeError('Browser page metadata could not be serialized.')
    } catch (source: unknown) {
      failure('storage-serialization-failed', source)
      return { status: 'failed' }
    }
    const storage = access(target)
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
    try {
      const raw = storage.getItem(key)
      const value: unknown = raw === null ? null : JSON.parse(raw)
      const confirmed = browserPageSessionSchema.safeParse(value)
      if (confirmed.success && JSON.stringify(confirmed.data) === serialized)
        return { status: 'saved' }
    } catch (source: unknown) {
      failure('storage-readback-mismatch', source)
      return { status: 'failed' }
    }
    failure('storage-readback-mismatch', undefined)
    return { status: 'failed' }
  }

  const receive = (event: MessageEvent<unknown>): void => {
    if (inactive()) return
    const parsed = browserPageDiscoverySchema.safeParse(event.data)
    if (!parsed.success) return
    for (const listener of listeners) listener(parsed.data)
  }

  try {
    channel = new BroadcastChannel(browserPageDiscoveryChannelName)
    channel.addEventListener('message', receive)
  } catch {
    if (channel !== null) channel.close()
    channel = null
  }

  const port = Object.freeze<BrowserPageSessionPort>({
    read(): ReturnType<BrowserPageSessionPort['read']> {
      if (inactive()) return { status: 'unusable', reason: 'disposed' }
      const storage = access(window)
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
      const parsed = browserPageSessionSchema.safeParse(value)
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
    write(snapshot: BrowserPageSessionSnapshot) {
      return writeTo(window, snapshot)
    },
    initializeTarget(target, binding) {
      if (inactive()) return { status: 'failed' }
      const parsed = browserPageBindingSchema.safeParse(binding)
      if (!parsed.success) {
        failure('storage-schema-rejected', parsed.error)
        return { status: 'failed' }
      }
      try {
        if (
          target === window ||
          target.closed ||
          target.opener !== window ||
          target.document.URL !== 'about:blank'
        )
          return { status: 'failed' }
        // A newly opened page inherits a storage copy; replace only this feature's record.
        return writeTo(target, {
          schemaVersion: 1,
          sourceId: crypto.randomUUID(),
          associations: [],
          target: parsed.data,
        })
      } catch (source: unknown) {
        failure('storage-unavailable', source)
        return { status: 'failed' }
      }
    },
    subscribe(listener) {
      if (inactive()) return () => undefined
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    discover(message) {
      if (inactive() || channel === null) return false
      const parsed = browserPageDiscoverySchema.safeParse(message)
      if (!parsed.success) return false
      try {
        channel.postMessage(parsed.data)
        return true
      } catch {
        return false
      }
    },
    available() {
      return !inactive() && channel !== null
    },
  })

  return {
    port,
    dispose() {
      if (disposed) return
      disposed = true
      listeners.clear()
      if (channel === null) return
      channel.removeEventListener('message', receive)
      try {
        channel.close()
      } catch {
        // Disposal must still release the channel reference if closing fails.
      }
      channel = null
    },
  }
}
