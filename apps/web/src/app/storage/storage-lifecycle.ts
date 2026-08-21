import type { StartupAttemptId } from '../bootstrap/lifecycle'
import type { CoreRuntimeConfiguration } from '../config/runtime-configuration-contract'
import { createStorageCrossTabHandle, type StorageCrossTabHandle } from './storage-cross-tab'
import { storageCrossTabEventAllowlist } from './storage-cross-tab-contract'
import { createStorageErrorAdapter, type StorageErrorAdapter } from './storage-error'
import { storageErrorMessageTable, type StorageErrorMessage } from './storage-error-messages'
import { storageErrorRegistry, type StorageErrorRegistryRecord } from './storage-error-registry'
import { storageMigrationRegistry, type StorageMigrationRecord } from './storage-migration-registry'
import { nonePrincipalPartitionId, type PrincipalPartitionId } from './storage-partition'
import { storageRegistry, type StorageRegistryRecord } from './storage-registry'

interface StorageOwner {
  readonly registry: readonly StorageRegistryRecord[]
  readonly migrationRegistry: readonly StorageMigrationRecord[]
  readonly crossTabEventAllowlist: readonly string[]
  readonly principalPartitionId: PrincipalPartitionId
  readonly errorRegistry: readonly StorageErrorRegistryRecord[]
  readonly errorMessages: Readonly<Record<string, StorageErrorMessage>>
  readonly errorAdapter: StorageErrorAdapter
}

export interface StorageLifecycleHandle {
  readonly owner: StorageOwner
  readonly broadcastChannel: BroadcastChannel | null
  readonly storageFallbackListener: (event: StorageEvent) => void
  dispose(): void
}

function assertRegistryExactEquality(): void {
  const records: readonly StorageRegistryRecord[] = storageRegistry
  const envelopeRecords = records.filter(
    (record) => record.persistenceShape === 'persisted-envelope',
  )
  const memoryRecords = records.filter((record) => record.medium === 'memory')
  const indexedDbRecords = records.filter((record) => record.medium === 'indexed-db')

  if (
    records.length !== 2 ||
    envelopeRecords.length !== 0 ||
    memoryRecords.length !== 0 ||
    indexedDbRecords.length !== 0 ||
    storageMigrationRegistry.length !== 0 ||
    storageCrossTabEventAllowlist.length !== 0
  ) {
    throw new TypeError('The Storage Registry diverged from the frozen exact contract.')
  }
}

export function createAndReadyStorage(input: {
  readonly configuration: CoreRuntimeConfiguration
  readonly startupAttemptId: StartupAttemptId
}): StorageLifecycleHandle {
  if (input.startupAttemptId.length === 0) {
    throw new TypeError('Storage requires the active Runtime Kernel startup attempt.')
  }

  assertRegistryExactEquality()

  const errorAdapter = createStorageErrorAdapter({
    startupAttemptId: input.startupAttemptId,
    releaseSha: input.configuration.releaseSha,
    buildVersion: input.configuration.buildVersion,
  })

  const owner = Object.freeze({
    registry: storageRegistry,
    migrationRegistry: storageMigrationRegistry,
    crossTabEventAllowlist: storageCrossTabEventAllowlist,
    principalPartitionId: nonePrincipalPartitionId,
    errorRegistry: storageErrorRegistry,
    errorMessages: storageErrorMessageTable,
    errorAdapter,
  })

  const crossTabHandle: StorageCrossTabHandle = createStorageCrossTabHandle()
  let disposed = false

  return {
    owner,
    broadcastChannel: crossTabHandle.broadcastChannel,
    storageFallbackListener: crossTabHandle.storageFallbackListener,
    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      crossTabHandle.dispose()
    },
  }
}
