import { applicationConfig } from '../config/app.config'
import type { PrincipalPartitionKind } from './storage-partition'

type StoragePersistenceShape = 'direct-compatibility' | 'persisted-envelope'

type StorageCorruptionPolicy =
  'quarantine-then-reset' | 'delete-then-reset' | 'preserve-in-place-reject-read'

type StorageMedium = 'local-storage' | 'indexed-db' | 'memory'

export interface StorageRegistryRecord {
  readonly id: string
  readonly ownerDomain: string
  readonly key: string
  readonly medium: StorageMedium
  readonly persistenceShape: StoragePersistenceShape
  readonly schemaId: string
  readonly currentSchemaVersion: number
  readonly minimumSupportedSchemaVersion: number
  readonly principalPartition: PrincipalPartitionKind
  readonly containsSensitiveData: false
  readonly corruptionPolicy: StorageCorruptionPolicy
  readonly capabilityStatus: 'ACTIVE'
}

export const storageRegistry = Object.freeze([
  Object.freeze({
    id: 'appearance-preference',
    ownerDomain: 'apps/web/src/app/appearance',
    key: applicationConfig.appearance.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'explicit-theme-preference',
    currentSchemaVersion: 3,
    minimumSupportedSchemaVersion: 3,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'appearance-custom-theme-registry',
    ownerDomain: 'apps/web/src/app/appearance',
    key: applicationConfig.appearance.customThemeRegistryStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'custom-theme-registry-snapshot',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
] as const satisfies readonly StorageRegistryRecord[])
