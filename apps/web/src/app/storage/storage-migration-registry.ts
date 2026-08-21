export interface StorageMigrationRecord {
  readonly id: string
  readonly owningSchemaId: string
  readonly sourceSchemaVersion: number
  readonly destinationSchemaVersion: number
}

export const storageMigrationRegistry: readonly StorageMigrationRecord[] = Object.freeze([])
