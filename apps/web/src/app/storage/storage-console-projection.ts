import { storageRegistry } from './storage-registry'

export interface StorageConsoleRecord {
  readonly id: string
  readonly schemaId: string
  readonly medium: string
  readonly persistenceShape: string
  readonly principalPartition: string
  readonly containsSensitiveData: boolean
}

export interface StorageConsoleProjection {
  readonly schemaVersion: 1
  readonly recordCount: number
  readonly records: readonly StorageConsoleRecord[]
}

export const storageConsoleProjection = Object.freeze({
  schemaVersion: 1,
  recordCount: storageRegistry.length,
  records: Object.freeze(
    storageRegistry
      .map((record) =>
        Object.freeze({
          id: record.id,
          schemaId: record.schemaId,
          medium: record.medium,
          persistenceShape: record.persistenceShape,
          principalPartition: record.principalPartition,
          containsSensitiveData: record.containsSensitiveData,
        }),
      )
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)),
  ),
} as const satisfies StorageConsoleProjection)
