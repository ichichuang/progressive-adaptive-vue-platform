import type { ApplicationStartupState, StartupAttemptId } from '../bootstrap/lifecycle'
import type { BootstrapStepId } from '../bootstrap/bootstrap-registry'
import type { RuntimeConfigurationFailureCause } from '../config/runtime-configuration-contract'
import {
  createNormalizedCoreError,
  isNormalizedCoreError,
  type CoreBuildIdentity,
  type NormalizedCoreError,
  type VueLifecyclePhase,
} from './core-error'

interface NormalizationInput extends CoreBuildIdentity {
  readonly source: unknown
  readonly startupAttemptId: StartupAttemptId
}

export function normalizeRuntimeConfigurationFailure(
  input: NormalizationInput & {
    readonly configurationFailureCause: RuntimeConfigurationFailureCause
  },
): NormalizedCoreError<'runtime-configuration-failure'> {
  if (isNormalizedCoreError(input.source)) {
    return input.source as NormalizedCoreError<'runtime-configuration-failure'>
  }

  return createNormalizedCoreError('runtime-configuration-failure', {
    startupAttemptId: input.startupAttemptId,
    configurationFailureCause: input.configurationFailureCause,
    releaseSha: input.releaseSha,
    buildVersion: input.buildVersion,
  })
}

export function normalizeApplicationStartupFailure(
  input: NormalizationInput & {
    readonly bootstrapStepId: BootstrapStepId
  },
): NormalizedCoreError<'application-startup-failure'> {
  if (isNormalizedCoreError(input.source)) {
    return input.source as NormalizedCoreError<'application-startup-failure'>
  }

  return createNormalizedCoreError('application-startup-failure', {
    startupAttemptId: input.startupAttemptId,
    bootstrapStepId: input.bootstrapStepId,
    releaseSha: input.releaseSha,
    buildVersion: input.buildVersion,
  })
}

export function normalizeVueComponentFailure(
  input: NormalizationInput & {
    readonly vueLifecyclePhase: VueLifecyclePhase
  },
): NormalizedCoreError<'vue-component-failure'> {
  if (isNormalizedCoreError(input.source)) {
    return input.source as NormalizedCoreError<'vue-component-failure'>
  }

  return createNormalizedCoreError('vue-component-failure', {
    startupAttemptId: input.startupAttemptId,
    vueLifecyclePhase: input.vueLifecyclePhase,
    releaseSha: input.releaseSha,
    buildVersion: input.buildVersion,
  })
}

export function normalizeUnhandledPromiseRejection(
  input: NormalizationInput & {
    readonly applicationStartupState: ApplicationStartupState
  },
): NormalizedCoreError<'unhandled-promise-rejection'> {
  if (isNormalizedCoreError(input.source)) {
    return input.source as NormalizedCoreError<'unhandled-promise-rejection'>
  }

  return createNormalizedCoreError('unhandled-promise-rejection', {
    applicationStartupState: input.applicationStartupState,
    startupAttemptId: input.startupAttemptId,
    releaseSha: input.releaseSha,
    buildVersion: input.buildVersion,
  })
}

export function resolveVueLifecyclePhase(info: string): VueLifecyclePhase {
  const productionRuntimeCode = /^https:\/\/vuejs\.org\/error-reference\/#runtime-([^/]+)$/u.exec(
    info,
  )?.[1]

  if (info.includes('render') || productionRuntimeCode === '1') {
    return 'render'
  }

  if (info.includes('setup') || productionRuntimeCode === '0') {
    return 'setup'
  }

  if (
    info.includes('watch') ||
    productionRuntimeCode === '2' ||
    productionRuntimeCode === '3' ||
    productionRuntimeCode === '4'
  ) {
    return 'watcher'
  }

  return 'lifecycle'
}
