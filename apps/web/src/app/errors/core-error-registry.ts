export type CoreErrorId =
  | 'runtime-configuration-failure'
  | 'application-startup-failure'
  | 'vue-component-failure'
  | 'unhandled-promise-rejection'

export type CoreErrorMessageKey =
  | 'core-error.runtime-configuration-failure'
  | 'core-error.application-startup-failure'
  | 'core-error.vue-component-failure'
  | 'core-error.unhandled-promise-rejection'

export type CoreErrorCategory = 'configuration' | 'startup' | 'component' | 'unknown'

type CoreErrorRecoverability = 'none' | 'retry-operation' | 'reload-application'

type CoreErrorRetryOwner = 'none' | 'runtime-kernel' | 'user'

type CoreErrorReportLevel = 'error' | 'fatal'

const coreErrorProhibitedContextFields = Object.freeze([
  'Cookie',
  'Authorization',
  'Token',
  'Password',
  'Secret',
  'CSRF',
  'full URL',
  'query',
  'form value',
  'request body',
  'response body',
  'Storage payload',
  'file content',
  'DOM text',
  'raw Runtime Configuration',
  'raw event',
  'raw Promise',
  'raw component instance',
  'component props',
  'component emits',
  'raw cause',
  'raw message',
  'raw stack',
] as const)

interface CoreErrorRegistryRecordBase {
  readonly id: CoreErrorId
  readonly category: CoreErrorCategory
  readonly userMessageKey: CoreErrorMessageKey
  readonly recoverability: CoreErrorRecoverability
  readonly retryOwner: CoreErrorRetryOwner
  readonly reportLevel: CoreErrorReportLevel
  readonly safeContextFields: readonly string[]
  readonly prohibitedContextFields: typeof coreErrorProhibitedContextFields
  readonly normalizationSource: string
  readonly fatalForCurrentAttempt: boolean
  readonly startupPrecedence: string
  readonly duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture'
  readonly capabilityStatus: 'ACTIVE'
}

type CoreErrorRegistryRecord =
  | (CoreErrorRegistryRecordBase & {
      readonly id: 'runtime-configuration-failure'
      readonly owner: 'apps/web/src/app/errors registry and normalizer'
      readonly producer: 'apps/web/src/app/config loader'
      readonly recoveryExecutor: 'runtime-kernel'
      readonly stateWhenRetryBudgetAvailable: 'recoverable-failure'
      readonly stateWhenRetryBudgetExhausted: 'fatal-failure'
    })
  | (CoreErrorRegistryRecordBase & {
      readonly id: 'application-startup-failure'
      readonly owner: 'apps/web/src/app/errors registry and normalizer'
      readonly producer: 'runtime-kernel bootstrap-step boundary'
      readonly presentationOwner: 'runtime-kernel'
    })
  | (CoreErrorRegistryRecordBase & {
      readonly id: 'vue-component-failure'
      readonly owner: 'apps/web/src/app/errors capture and normalizer'
      readonly producer: 'app.config.errorHandler or admitted component boundary'
      readonly presentationOwner: 'AppErrorBoundary'
      readonly allowedVueLifecyclePhase: readonly ['render', 'setup', 'lifecycle', 'watcher']
    })
  | (CoreErrorRegistryRecordBase & {
      readonly id: 'unhandled-promise-rejection'
      readonly owner: 'apps/web/src/app/errors global capture'
      readonly producer: 'the one global unhandledrejection listener'
      readonly triggersStartupRecovery: false
    })

export const coreErrorRegistry = Object.freeze([
  Object.freeze({
    id: 'runtime-configuration-failure',
    owner: 'apps/web/src/app/errors registry and normalizer',
    producer: 'apps/web/src/app/config loader',
    recoveryExecutor: 'runtime-kernel',
    category: 'configuration',
    userMessageKey: 'core-error.runtime-configuration-failure',
    recoverability: 'retry-operation',
    retryOwner: 'runtime-kernel',
    reportLevel: 'fatal',
    safeContextFields: Object.freeze([
      'startupAttemptId',
      'configurationFailureCause',
      'releaseSha',
      'buildVersion',
    ]),
    prohibitedContextFields: coreErrorProhibitedContextFields,
    normalizationSource: 'typed Runtime Configuration loader failure',
    fatalForCurrentAttempt: true,
    stateWhenRetryBudgetAvailable: 'recoverable-failure',
    stateWhenRetryBudgetExhausted: 'fatal-failure',
    startupPrecedence: 'configuration-first-before-global-capture',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'application-startup-failure',
    owner: 'apps/web/src/app/errors registry and normalizer',
    producer: 'runtime-kernel bootstrap-step boundary',
    presentationOwner: 'runtime-kernel',
    category: 'startup',
    userMessageKey: 'core-error.application-startup-failure',
    recoverability: 'reload-application',
    retryOwner: 'user',
    reportLevel: 'fatal',
    safeContextFields: Object.freeze([
      'startupAttemptId',
      'bootstrapStepId',
      'releaseSha',
      'buildVersion',
    ]),
    prohibitedContextFields: coreErrorProhibitedContextFields,
    normalizationSource: 'bootstrap-step catch or unclaimed startup-phase window.error',
    fatalForCurrentAttempt: true,
    startupPrecedence: 'initial-root-component-failure-is-application-startup-failure-once',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'vue-component-failure',
    owner: 'apps/web/src/app/errors capture and normalizer',
    producer: 'app.config.errorHandler or admitted component boundary',
    presentationOwner: 'AppErrorBoundary',
    category: 'component',
    userMessageKey: 'core-error.vue-component-failure',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: Object.freeze([
      'startupAttemptId',
      'vueLifecyclePhase',
      'releaseSha',
      'buildVersion',
    ]),
    prohibitedContextFields: coreErrorProhibitedContextFields,
    normalizationSource: 'app.config.errorHandler or admitted component boundary',
    fatalForCurrentAttempt: false,
    allowedVueLifecyclePhase: Object.freeze(['render', 'setup', 'lifecycle', 'watcher'] as const),
    startupPrecedence: 'initial-root-mount-propagates-to-application-startup-failure',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'unhandled-promise-rejection',
    owner: 'apps/web/src/app/errors global capture',
    producer: 'the one global unhandledrejection listener',
    category: 'unknown',
    userMessageKey: 'core-error.unhandled-promise-rejection',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: Object.freeze([
      'applicationStartupState',
      'startupAttemptId',
      'releaseSha',
      'buildVersion',
    ]),
    prohibitedContextFields: coreErrorProhibitedContextFields,
    normalizationSource: 'PromiseRejectionEvent.reason at the global listener',
    fatalForCurrentAttempt: false,
    triggersStartupRecovery: false,
    startupPrecedence: 'never-triggers-startup-recovery',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  }),
] as const satisfies readonly CoreErrorRegistryRecord[])

export function getCoreErrorRecord<Id extends CoreErrorId>(
  id: Id,
): Extract<(typeof coreErrorRegistry)[number], { readonly id: Id }> {
  const record = coreErrorRegistry.find((candidate) => candidate.id === id)

  if (record === undefined) {
    throw new TypeError()
  }

  return record as Extract<(typeof coreErrorRegistry)[number], { readonly id: Id }>
}
