export type ApplicationStartupState =
  | 'not-started'
  | 'starting'
  | 'ready'
  | 'recoverable-failure'
  | 'fatal-failure'
  | 'disposing'
  | 'disposed'

declare const startupAttemptIdentity: unique symbol

export type StartupAttemptId = string & {
  readonly [startupAttemptIdentity]: true
}

export type AttemptDisposalReason =
  'application-disposal' | 'configuration-retry' | 'failed-startup' | 'hmr'

export interface DisposalResult {
  readonly status: 'disposed'
  readonly failedSteps: readonly BootstrapDisposalStepId[]
}

export type BootstrapDisposalStepId =
  | 'withdraw-application-ready'
  | 'remove-appearance-media-subscriptions'
  | 'unmount-vue-application'
  | 'dispose-installed-platform-provider-handles'
  | 'dispose-pinia'
  | 'release-vue-application-creation-handle'
  | 'release-first-paint-handoff-and-safety-handle'
  | 'dispose-global-failure-capture'
  | 'abort-release-runtime-configuration-handle'

export function createStartupAttemptId(): StartupAttemptId {
  return crypto.randomUUID() as StartupAttemptId
}
