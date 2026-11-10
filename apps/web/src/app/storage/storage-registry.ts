import { applicationConfig } from '../config/app.config'
import type { PrincipalPartitionKind } from './storage-partition'

type StoragePersistenceShape = 'direct-compatibility' | 'persisted-envelope'

type StorageCorruptionPolicy =
  'quarantine-then-reset' | 'delete-then-reset' | 'preserve-in-place-reject-read'

type StorageMedium = 'local-storage' | 'session-storage' | 'indexed-db' | 'memory'

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
    id: 'form-drafts',
    ownerDomain: 'apps/web/src/app/forms',
    key: applicationConfig.forms.draftStorageKey,
    medium: 'local-storage',
    persistenceShape: 'persisted-envelope',
    schemaId: 'form-draft',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'appearance-preference',
    ownerDomain: 'apps/web/src/app/appearance',
    key: applicationConfig.appearance.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'explicit-theme-preference',
    currentSchemaVersion: 4,
    minimumSupportedSchemaVersion: 4,
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
  Object.freeze({
    id: 'locale-preference',
    ownerDomain: 'apps/web/src/shared/i18n',
    key: applicationConfig.localization.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'locale-preference',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'navigation-preference',
    ownerDomain: 'apps/web/src/app/navigation',
    key: applicationConfig.navigation.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'navigation-preference',
    currentSchemaVersion: 2,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'workspace-session',
    ownerDomain: 'apps/web/src/app/workspace',
    key: applicationConfig.workspace.sessionStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'workspace-session',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'shell-scroll',
    ownerDomain: 'apps/web/src/app/scroll',
    key: applicationConfig.scroll.shellStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'shell-scroll',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'scroll-preference',
    ownerDomain: 'apps/web/src/app/scroll',
    key: applicationConfig.scroll.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'scroll-preference',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'scroll-refresh-session',
    ownerDomain: 'apps/web/src/app/router',
    key: applicationConfig.scroll.refreshSessionStorageKey,
    medium: 'session-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'scroll-refresh-session',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'browser-page-session',
    ownerDomain: 'apps/web/src/app/router',
    key: applicationConfig.browserPage.sessionStorageKey,
    medium: 'session-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'browser-page-session',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  }),
] as const satisfies readonly StorageRegistryRecord[])
