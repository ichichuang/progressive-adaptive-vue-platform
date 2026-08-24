import { coreErrorRegistry } from '../errors/core-error-registry'
import { routerErrorRegistry } from '../router/router-error-registry'
import { storageErrorRegistry } from '../storage/storage-error-registry'
import { bootstrapStepRegistry } from './bootstrap-registry'
import { activeProviderIds } from './install-providers'

export interface RuntimeKernelConsoleErrorRecordCounts {
  readonly core: 4
  readonly router: 6
  readonly storage: 11
  readonly total: 21
}

export interface RuntimeKernelConsoleProjection {
  readonly schemaVersion: 1
  readonly stepIds: readonly string[]
  readonly stepCount: 11
  readonly activeProviderIds: readonly ['pinia', 'appearance']
  readonly errorRecordCounts: RuntimeKernelConsoleErrorRecordCounts
}

const totalErrorRecords =
  coreErrorRegistry.length + routerErrorRegistry.length + storageErrorRegistry.length
const runtimeCount = (records: readonly unknown[]): number => records.length
const stepCount = runtimeCount(bootstrapStepRegistry)
const coreErrorCount = runtimeCount(coreErrorRegistry)
const routerErrorCount = runtimeCount(routerErrorRegistry)
const storageErrorCount = runtimeCount(storageErrorRegistry)

if (
  stepCount !== 11 ||
  coreErrorCount !== 4 ||
  routerErrorCount !== 6 ||
  storageErrorCount !== 11 ||
  totalErrorRecords !== 21
) {
  throw new TypeError('The Runtime Kernel Console projection source is incomplete.')
}

export const runtimeKernelConsoleProjection = Object.freeze({
  schemaVersion: 1,
  stepIds: Object.freeze(bootstrapStepRegistry.map((record) => record.id)),
  stepCount,
  activeProviderIds,
  errorRecordCounts: Object.freeze({
    core: coreErrorCount,
    router: routerErrorCount,
    storage: storageErrorCount,
    total: totalErrorRecords,
  }),
} as const satisfies RuntimeKernelConsoleProjection)
