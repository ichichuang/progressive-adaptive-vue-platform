import type { FormDraftStorageContext } from '../forms/form-draft-contract'
import type { NavigationPreferencePort } from '../navigation/navigation-preference-contract'
import type { WorkspaceSessionPort } from '../workspace/workspace-session-contract'
import { createWorkspaceSessionStorage } from './workspace-session-storage'
import { createNavigationPreferenceStorage } from './navigation-preference-storage'
import type { LocalePreferencePort } from '../../shared/i18n'
import { createLocalePreferenceStorage } from './locale-preference-storage'
import type { StartupAttemptId } from '../bootstrap/lifecycle'
import type { CoreRuntimeConfiguration } from '../config/runtime-configuration-contract'
import { createStorageErrorAdapter, type StorageErrorAdapter } from './storage-error'
import { storageErrorMessageTable, type StorageErrorMessage } from './storage-error-messages'
import { storageErrorRegistry, type StorageErrorRegistryRecord } from './storage-error-registry'
import { storageMigrationRegistry, type StorageMigrationRecord } from './storage-migration-registry'
import { nonePrincipalPartitionId, type PrincipalPartitionId } from './storage-partition'
import { storageRegistry, type StorageRegistryRecord } from './storage-registry'
import type { BrowserPageSessionPort } from '../router/browser-page-session-contract'
import { createBrowserPageSessionStorage } from './browser-page-session-storage'
import type { ShellScrollStorageContext } from '../scroll/shell-scroll-storage-key'

import type { TableColumnPreferenceContext } from '../tables/table-column-preference-context'

interface StorageOwner {
  readonly tableColumns: TableColumnPreferenceContext
  readonly shellScroll: ShellScrollStorageContext
  readonly formDrafts: FormDraftStorageContext
  readonly browserPageSession: BrowserPageSessionPort
  readonly scrollPreference: ScrollPreferencePort
  readonly scrollRefresh: ScrollRefreshPort
  readonly workspaceSession: WorkspaceSessionPort
  readonly navigationPreference: NavigationPreferencePort
  readonly localePreference: LocalePreferencePort
  readonly registry: readonly StorageRegistryRecord[]
  readonly migrationRegistry: readonly StorageMigrationRecord[]
  readonly principalPartitionId: PrincipalPartitionId
  readonly errorRegistry: readonly StorageErrorRegistryRecord[]
  readonly errorMessages: Readonly<Record<string, StorageErrorMessage>>
  readonly errorAdapter: StorageErrorAdapter
}

export interface StorageLifecycleHandle {
  readonly owner: StorageOwner
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
    records.length !== 11 ||
    envelopeRecords.length !== 1 ||
    memoryRecords.length !== 0 ||
    indexedDbRecords.length !== 0 ||
    storageMigrationRegistry.length !== 0
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

  let disposed = false
  const browserPageSession = createBrowserPageSessionStorage(errorAdapter, () => disposed)
  const recordStorageContext = Object.freeze({ errorAdapter, isDisposed: () => disposed })
  const owner = Object.freeze({
    tableColumns: recordStorageContext,
    shellScroll: recordStorageContext,
    formDrafts: recordStorageContext,
    browserPageSession: browserPageSession.port,
    scrollPreference: createScrollPreferenceStorage(errorAdapter, () => disposed),
    scrollRefresh: createScrollRefreshStorage(errorAdapter, () => disposed),
    workspaceSession: createWorkspaceSessionStorage(errorAdapter, () => disposed),
    navigationPreference: createNavigationPreferenceStorage(errorAdapter, () => disposed),
    localePreference: createLocalePreferenceStorage(errorAdapter, () => disposed),
    registry: storageRegistry,
    migrationRegistry: storageMigrationRegistry,
    principalPartitionId: nonePrincipalPartitionId,
    errorRegistry: storageErrorRegistry,
    errorMessages: storageErrorMessageTable,
    errorAdapter,
  })

  return {
    owner,
    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      browserPageSession.dispose()
    },
  }
}
import type { ScrollPreferencePort } from '../scroll/scroll-preference-contract'
import type { ScrollRefreshPort } from '../scroll/scroll-refresh-contract'
import { createScrollPreferenceStorage } from './scroll-preference-storage'
import { createScrollRefreshStorage } from './scroll-refresh-storage'
