import { storageChangeChannelName } from './storage-cross-tab-contract'
import { storageRegistry } from './storage-registry'

export interface StorageCrossTabHandle {
  readonly broadcastChannel: BroadcastChannel | null
  readonly storageFallbackListener: (event: StorageEvent) => void
  dispose(): void
}

export function createStorageCrossTabHandle(): StorageCrossTabHandle {
  const registryKeys = new Set<string>(storageRegistry.map((record) => record.key))

  // The active cross-tab event allowlist is empty: the two direct-compatibility records do not
  // publish or consume Storage change events. The fallback listener only verifies that a storage
  // event targets an exact Storage Registry key and then returns without dispatching, so the
  // handle never turns into speculative message processing.
  const storageFallbackListener = (event: StorageEvent): void => {
    if (event.key === null || !registryKeys.has(event.key)) {
      return
    }
  }

  let broadcastChannel: BroadcastChannel | null = null
  let fallbackInstalled = false
  let disposed = false

  try {
    broadcastChannel = new BroadcastChannel(storageChangeChannelName)
  } catch {
    broadcastChannel = null
  }

  if (broadcastChannel === null) {
    window.addEventListener('storage', storageFallbackListener)
    fallbackInstalled = true
  }

  return {
    broadcastChannel,
    storageFallbackListener,
    dispose() {
      if (disposed) {
        return
      }

      disposed = true

      if (broadcastChannel !== null) {
        try {
          broadcastChannel.close()
        } catch {
          // The handle is already released; idempotent disposal continues.
        }
        broadcastChannel = null
      }

      if (fallbackInstalled) {
        window.removeEventListener('storage', storageFallbackListener)
        fallbackInstalled = false
      }
    },
  }
}
