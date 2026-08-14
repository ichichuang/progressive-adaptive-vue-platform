import type { ApplicationStartupState, StartupAttemptId } from '../bootstrap/lifecycle'
import type { BootstrapStepId } from '../bootstrap/bootstrap-registry'
import type { RuntimeConfigurationFailureCause } from '../config/runtime-configuration-contract'
import { getCoreErrorRecord, type CoreErrorCategory, type CoreErrorId } from './core-error-registry'

export type VueLifecyclePhase = 'render' | 'setup' | 'lifecycle' | 'watcher'

export interface CoreBuildIdentity {
  readonly releaseSha: string
  readonly buildVersion: string
}

export interface AppErrorBoundaryHooks extends CoreBuildIdentity {
  readonly startupAttemptId: StartupAttemptId
  readonly getStartupState: () => ApplicationStartupState
  readonly capture: (error: NormalizedCoreError) => boolean
}

interface RuntimeConfigurationFailureSafeContext extends CoreBuildIdentity {
  readonly startupAttemptId: StartupAttemptId
  readonly configurationFailureCause: RuntimeConfigurationFailureCause
}

interface ApplicationStartupFailureSafeContext extends CoreBuildIdentity {
  readonly startupAttemptId: StartupAttemptId
  readonly bootstrapStepId: BootstrapStepId
}

interface VueComponentFailureSafeContext extends CoreBuildIdentity {
  readonly startupAttemptId: StartupAttemptId
  readonly vueLifecyclePhase: VueLifecyclePhase
}

interface UnhandledPromiseRejectionSafeContext extends CoreBuildIdentity {
  readonly applicationStartupState: ApplicationStartupState
  readonly startupAttemptId: StartupAttemptId
}

export type CoreErrorSafeContext =
  | RuntimeConfigurationFailureSafeContext
  | ApplicationStartupFailureSafeContext
  | VueComponentFailureSafeContext
  | UnhandledPromiseRejectionSafeContext

const normalizedCoreErrorIdentity: unique symbol = Symbol('NormalizedCoreError')

export interface NormalizedCoreError<
  Id extends CoreErrorId = CoreErrorId,
  Context extends CoreErrorSafeContext = CoreErrorSafeContext,
> {
  readonly [normalizedCoreErrorIdentity]: true
  readonly id: Id
  readonly category: CoreErrorCategory
  readonly errorInstanceId: string
  readonly causeCategory: CoreErrorCategory
  readonly timestamp: string
  readonly safeContext: Readonly<Context>
}

const normalizedCoreErrors = new WeakSet()
const capturedNormalizedCoreErrors = new WeakSet()

export function isNormalizedCoreError(source: unknown): source is NormalizedCoreError {
  return typeof source === 'object' && source !== null && normalizedCoreErrors.has(source)
}

export function createNormalizedCoreError<
  Id extends CoreErrorId,
  Context extends CoreErrorSafeContext,
>(id: Id, safeContext: Context): NormalizedCoreError<Id, Context> {
  const record = getCoreErrorRecord(id)
  const normalized = Object.freeze({
    [normalizedCoreErrorIdentity]: true as const,
    id,
    category: record.category,
    errorInstanceId: crypto.randomUUID(),
    causeCategory: record.category,
    timestamp: new Date().toISOString(),
    safeContext: Object.freeze(safeContext),
  })

  normalizedCoreErrors.add(normalized)
  return normalized
}

export interface CoreErrorLedger {
  capture(error: NormalizedCoreError): boolean
  has(error: NormalizedCoreError): boolean
  snapshot(): readonly NormalizedCoreError[]
  dispose(): void
}

export function createCoreErrorLedger(): CoreErrorLedger {
  const capturedErrors = new Map<string, NormalizedCoreError>()
  let disposed = false

  return {
    capture(error) {
      if (
        disposed ||
        capturedNormalizedCoreErrors.has(error) ||
        capturedErrors.has(error.errorInstanceId)
      ) {
        return false
      }

      capturedNormalizedCoreErrors.add(error)
      capturedErrors.set(error.errorInstanceId, error)
      return true
    },
    has(error) {
      return capturedErrors.has(error.errorInstanceId)
    },
    snapshot() {
      return Object.freeze([...capturedErrors.values()])
    },
    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      capturedErrors.clear()
    },
  }
}
