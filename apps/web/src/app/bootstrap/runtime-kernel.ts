import type { Component } from 'vue'

import {
  initializeAppearanceFirstPaintHandoff,
  registerPostMountAppearanceMediaSubscriptions,
  type AppearanceFirstPaintHandoffHandle,
  type AppearanceMediaSubscriptionsUnsubscribe,
  type AppearanceSafetyRestorationAuthority,
} from '../appearance/appearance-bootstrap'
import {
  compiledBuildIdentity,
  loadRuntimeConfiguration,
  type RuntimeConfigurationLoadHandle,
} from '../config/runtime-configuration'
import type { CoreRuntimeConfiguration } from '../config/runtime-configuration-contract'
import AppErrorBoundary from '../errors/AppErrorBoundary.vue'
import {
  createCoreErrorLedger,
  type CoreErrorLedger,
  type NormalizedCoreError,
} from '../errors/core-error'
import {
  normalizeApplicationStartupFailure,
  normalizeRuntimeConfigurationFailure,
  normalizeVueComponentFailure,
} from '../errors/error-normalizer'
import {
  renderConfigurationFailure,
  renderStartupFailure,
  type FatalBoundaryHandle,
} from '../errors/fatal-boundary'
import {
  installGlobalFailureCapture,
  type GlobalFailureCaptureHandle,
} from '../errors/global-failure-capture'
import { createPiniaProvider, type PiniaProviderHandle } from '../providers/pinia'
import { createAndReadyRouter, type RouterLifecycleHandle } from '../router/router-lifecycle'
import { bootstrapStepRegistry, type BootstrapStepId } from './bootstrap-registry'
import {
  createVueApplication,
  mountVueApplication,
  type MountedApplicationHandle,
  type VueApplicationCreationHandle,
} from './create-application'
import {
  installPlatformProviders,
  type InstalledPlatformProvidersHandle,
} from './install-providers'
import {
  createStartupAttemptId,
  type ApplicationStartupState,
  type AttemptDisposalReason,
  type BootstrapDisposalStepId,
  type DisposalResult,
  type StartupAttemptId,
} from './lifecycle'
import { startupConfigurationRecoveryPolicy } from './startup-configuration-recovery'

const applicationMountTarget = '#app'

interface AttemptResources {
  appearanceHandoff?: AppearanceFirstPaintHandoffHandle
  appearanceSubscriptions?: AppearanceMediaSubscriptionsUnsubscribe
  configuration?: CoreRuntimeConfiguration
  configurationLoad?: RuntimeConfigurationLoadHandle
  failureCapture?: GlobalFailureCaptureHandle
  mountedApplication?: MountedApplicationHandle
  pinia?: PiniaProviderHandle
  providers?: InstalledPlatformProvidersHandle
  router?: RouterLifecycleHandle
  vueApplication?: VueApplicationCreationHandle
}

type AttemptOutcome =
  | {
      readonly status: 'configuration-failure'
      readonly error: NormalizedCoreError<'runtime-configuration-failure'>
      readonly disposalResult: DisposalResult
    }
  | {
      readonly status: 'startup-failure'
      readonly error: NormalizedCoreError<'application-startup-failure'>
    }
  | {
      readonly status: 'cancelled'
    }
  | {
      readonly status: 'ready'
      readonly readyAttempt: ReadyApplicationAttemptHandle
    }

interface ReadyApplicationAttemptHandle {
  readonly startupAttemptId: StartupAttemptId
  dispose(reason: AttemptDisposalReason): Promise<DisposalResult>
}

export interface RunningApplicationHandle {
  readonly appearanceSafetyRestorationAuthority: AppearanceSafetyRestorationAuthority | undefined
  readonly completion: Promise<void>
  readonly configurationRetriesUsed: number
  readonly startupState: ApplicationStartupState
  dispose(reason: 'application-disposal' | 'hmr'): Promise<DisposalResult>
}

function applicationTarget(): HTMLElement {
  const target = document.querySelector<HTMLElement>(applicationMountTarget)

  if (target === null) {
    throw new Error('The exact application Mount target is missing.')
  }

  return target
}

function reloadApplication(): void {
  window.location.reload()
}

function safeDispose(
  step: BootstrapDisposalStepId,
  operation: (() => void) | undefined,
  failedSteps: BootstrapDisposalStepId[],
): void {
  if (operation === undefined) {
    return
  }

  try {
    operation()
  } catch {
    failedSteps.push(step)
  }
}

function createAttemptDisposer(input: {
  readonly resources: AttemptResources
  readonly setState: (state: ApplicationStartupState) => void
  readonly withdrawReady: () => void
}): (reason: AttemptDisposalReason) => Promise<DisposalResult> {
  let result: DisposalResult | undefined

  return (reason) => {
    if (result !== undefined) {
      return Promise.resolve(result)
    }

    const failedSteps: BootstrapDisposalStepId[] = []
    const appearanceDisposalReason = reason === 'failed-startup' ? 'failed-startup' : reason

    safeDispose(
      'withdraw-application-ready',
      () => {
        input.withdrawReady()
        input.setState('disposing')
      },
      failedSteps,
    )
    safeDispose(
      'remove-appearance-media-subscriptions',
      input.resources.appearanceSubscriptions,
      failedSteps,
    )
    delete input.resources.appearanceSubscriptions
    safeDispose(
      'unmount-vue-application',
      input.resources.mountedApplication === undefined
        ? undefined
        : () => input.resources.mountedApplication?.dispose(),
      failedSteps,
    )
    delete input.resources.mountedApplication
    safeDispose(
      'dispose-router-and-history',
      input.resources.router === undefined ? undefined : () => input.resources.router?.dispose(),
      failedSteps,
    )
    delete input.resources.router
    safeDispose(
      'dispose-installed-platform-provider-handles',
      input.resources.providers === undefined
        ? undefined
        : () => input.resources.providers?.dispose(appearanceDisposalReason),
      failedSteps,
    )
    delete input.resources.providers
    safeDispose(
      'dispose-pinia',
      input.resources.pinia === undefined ? undefined : () => input.resources.pinia?.dispose(),
      failedSteps,
    )
    delete input.resources.pinia
    safeDispose(
      'release-vue-application-creation-handle',
      input.resources.vueApplication === undefined
        ? undefined
        : () => input.resources.vueApplication?.dispose(),
      failedSteps,
    )
    delete input.resources.vueApplication
    safeDispose(
      'release-first-paint-handoff-and-safety-handle',
      input.resources.appearanceHandoff === undefined
        ? undefined
        : () =>
            input.resources.appearanceHandoff?.dispose(
              reason === 'failed-startup' ? 'failed-startup' : 'normal-or-hmr',
            ),
      failedSteps,
    )
    delete input.resources.appearanceHandoff
    safeDispose(
      'dispose-global-failure-capture',
      input.resources.failureCapture === undefined
        ? undefined
        : () => input.resources.failureCapture?.dispose(),
      failedSteps,
    )
    delete input.resources.failureCapture
    safeDispose(
      'abort-release-runtime-configuration-handle',
      input.resources.configurationLoad === undefined
        ? undefined
        : () => input.resources.configurationLoad?.dispose(),
      failedSteps,
    )
    delete input.resources.configurationLoad
    delete input.resources.configuration

    input.setState('disposed')
    result = Object.freeze({
      status: 'disposed',
      failedSteps: Object.freeze(failedSteps),
    })
    return Promise.resolve(result)
  }
}

async function startAttempt(input: {
  readonly captureLedger: CoreErrorLedger
  readonly registerDisposer: (
    dispose: (reason: AttemptDisposalReason) => Promise<DisposalResult>,
  ) => void
  readonly rootComponent: Component
  readonly startupAttemptId: StartupAttemptId
  readonly retainedAppearanceSafetyRestorationAuthority:
    AppearanceSafetyRestorationAuthority | undefined
  readonly retainAppearanceSafetyRestorationAuthority: (
    authority: AppearanceSafetyRestorationAuthority,
  ) => void
}): Promise<AttemptOutcome> {
  let state: ApplicationStartupState = 'not-started'
  let applicationReady = false
  let currentBootstrapStepId: BootstrapStepId = bootstrapStepRegistry[0].id
  let nextBootstrapStepIndex = 0
  let mounting = false
  let claimedStartupFailure: NormalizedCoreError<'application-startup-failure'> | undefined
  const resources: AttemptResources = {}
  const attemptAbortController = new AbortController()
  const setState = (nextState: ApplicationStartupState): void => {
    state = nextState
  }
  const enterBootstrapStep = (stepId: BootstrapStepId): void => {
    currentBootstrapStepId = stepId

    if (bootstrapStepRegistry[nextBootstrapStepIndex]?.id !== stepId) {
      throw new Error('Runtime Kernel Bootstrap execution diverged from its exact registry.')
    }

    nextBootstrapStepIndex += 1
  }
  const withdrawReady = (): void => {
    if (!applicationReady) {
      return
    }

    applicationReady = false
  }
  const disposeAttempt = createAttemptDisposer({
    resources,
    setState,
    withdrawReady,
  })
  input.registerDisposer(disposeAttempt)

  const throwClaimedStartupFailure = (): void => {
    if (claimedStartupFailure !== undefined) {
      throw new Error('A startup failure was claimed by the global capture boundary.')
    }
  }

  setState('starting')

  enterBootstrapStep('validate-build-and-runtime-configuration')
  resources.configurationLoad = loadRuntimeConfiguration({
    document,
    location: window.location,
    fetch: window.fetch.bind(window),
    signal: attemptAbortController.signal,
  })
  const configurationResult = await resources.configurationLoad.result

  if (configurationResult.status === 'cancelled') {
    await disposeAttempt('application-disposal')
    return { status: 'cancelled' }
  }

  if (configurationResult.status === 'failure') {
    const error = normalizeRuntimeConfigurationFailure({
      source: configurationResult,
      startupAttemptId: input.startupAttemptId,
      configurationFailureCause: configurationResult.cause,
      releaseSha: compiledBuildIdentity.releaseSha,
      buildVersion: compiledBuildIdentity.buildVersion,
    })
    input.captureLedger.capture(error)
    setState('recoverable-failure')
    const disposalResult = await disposeAttempt('failed-startup')
    return { status: 'configuration-failure', error, disposalResult }
  }

  resources.configuration = configurationResult.configuration

  try {
    enterBootstrapStep('install-pre-vue-global-failure-capture')
    resources.failureCapture = installGlobalFailureCapture(
      {
        startupAttemptId: input.startupAttemptId,
        getStartupState: () => state,
        getCurrentBootstrapStepId: () => currentBootstrapStepId,
        capture: (error) => input.captureLedger.capture(error),
        claimStartupFailure(error) {
          claimedStartupFailure = error
        },
        releaseSha: resources.configuration.releaseSha,
        buildVersion: resources.configuration.buildVersion,
      },
      (handle) => {
        resources.failureCapture = handle
      },
    )
    throwClaimedStartupFailure()

    enterBootstrapStep('initialize-design-system-and-resolve-first-paint-handoff')
    resources.appearanceHandoff = initializeAppearanceFirstPaintHandoff(
      document,
      configurationResult.appearanceInitializerScript,
      input.retainedAppearanceSafetyRestorationAuthority,
      (handle) => {
        resources.appearanceHandoff = handle

        if (handle.safetyRestorationAuthority !== undefined) {
          input.retainAppearanceSafetyRestorationAuthority(handle.safetyRestorationAuthority)
        }
      },
    )
    throwClaimedStartupFailure()

    enterBootstrapStep('create-vue-application')
    const errorHooks = {
      startupAttemptId: input.startupAttemptId,
      getStartupState: () => state,
      capture: (error: NormalizedCoreError) => input.captureLedger.capture(error),
      releaseSha: resources.configuration.releaseSha,
      buildVersion: resources.configuration.buildVersion,
    } as const
    resources.vueApplication = createVueApplication({
      rootComponent: AppErrorBoundary,
      rootProps: {
        rootComponent: input.rootComponent,
        errorHooks,
      },
      startupAttemptId: input.startupAttemptId,
      errorHooks: {
        isMounting: () => mounting,
        claimMountFailure(mountFailure) {
          if (claimedStartupFailure !== undefined) {
            return
          }

          claimedStartupFailure = normalizeApplicationStartupFailure({
            source: mountFailure.cause,
            startupAttemptId: mountFailure.startupAttemptId,
            bootstrapStepId: currentBootstrapStepId,
            releaseSha: resources.configuration?.releaseSha ?? compiledBuildIdentity.releaseSha,
            buildVersion:
              resources.configuration?.buildVersion ?? compiledBuildIdentity.buildVersion,
          })
        },
        captureComponentFailure(componentFailure) {
          const error = normalizeVueComponentFailure({
            source: componentFailure.cause,
            startupAttemptId: componentFailure.startupAttemptId,
            vueLifecyclePhase: componentFailure.vueLifecyclePhase,
            releaseSha: resources.configuration?.releaseSha ?? compiledBuildIdentity.releaseSha,
            buildVersion:
              resources.configuration?.buildVersion ?? compiledBuildIdentity.buildVersion,
          })
          input.captureLedger.capture(error)
          return error
        },
      },
    })
    throwClaimedStartupFailure()

    enterBootstrapStep('create-pinia')
    resources.pinia = createPiniaProvider(input.startupAttemptId)
    throwClaimedStartupFailure()

    enterBootstrapStep('install-platform-providers')
    resources.providers = installPlatformProviders({
      application: resources.vueApplication.application,
      pinia: resources.pinia.pinia,
      handoff: resources.appearanceHandoff,
    })
    throwClaimedStartupFailure()

    enterBootstrapStep('create-and-ready-router')
    resources.router = await createAndReadyRouter({
      application: resources.vueApplication.application,
      configuration: resources.configuration,
      startupAttemptId: input.startupAttemptId,
    })
    throwClaimedStartupFailure()

    enterBootstrapStep('mount-application')
    mounting = true
    try {
      resources.mountedApplication = mountVueApplication(
        resources.vueApplication.application,
        applicationMountTarget,
        (handle) => {
          resources.mountedApplication = handle
        },
      )
    } finally {
      mounting = false
    }
    resources.router.markApplicationMounted()
    throwClaimedStartupFailure()

    enterBootstrapStep('register-post-mount-appearance-media-subscriptions')
    resources.appearanceSubscriptions = registerPostMountAppearanceMediaSubscriptions(
      resources.providers.appearance,
      (unsubscribe) => {
        resources.appearanceSubscriptions = unsubscribe
      },
    )
    throwClaimedStartupFailure()

    enterBootstrapStep('publish-application-ready')
    resources.failureCapture.withdrawStartupCapture()
    throwClaimedStartupFailure()
    applicationReady = true
    setState('ready')

    let runningDisposed = false
    const readyAttempt: ReadyApplicationAttemptHandle = {
      startupAttemptId: input.startupAttemptId,
      async dispose(reason) {
        if (runningDisposed) {
          return disposeAttempt(reason)
        }

        runningDisposed = true
        return disposeAttempt(reason)
      },
    }

    return { status: 'ready', readyAttempt }
  } catch (source: unknown) {
    const error =
      claimedStartupFailure ??
      normalizeApplicationStartupFailure({
        source,
        startupAttemptId: input.startupAttemptId,
        bootstrapStepId: currentBootstrapStepId,
        releaseSha: resources.configuration.releaseSha,
        buildVersion: resources.configuration.buildVersion,
      })
    input.captureLedger.capture(error)
    setState('fatal-failure')
    await disposeAttempt('failed-startup')
    return { status: 'startup-failure', error }
  }
}

export function startRuntimeKernel(
  rootComponent: Component,
  retainedConfigurationRetriesUsed = 0,
  retainedAppearanceSafetyRestorationAuthority?: AppearanceSafetyRestorationAuthority,
): RunningApplicationHandle {
  const maximumRetriesPerDocument = startupConfigurationRecoveryPolicy.maximumRetriesPerDocument

  if (
    !Number.isInteger(retainedConfigurationRetriesUsed) ||
    retainedConfigurationRetriesUsed < 0 ||
    retainedConfigurationRetriesUsed > maximumRetriesPerDocument
  ) {
    throw new Error('The document Runtime Configuration retry budget is invalid.')
  }

  let configurationRetriesUsed = retainedConfigurationRetriesUsed
  let appearanceSafetyRestorationAuthority = retainedAppearanceSafetyRestorationAuthority
  let kernelState: ApplicationStartupState = 'not-started'
  let currentAttemptDisposer:
    ((reason: AttemptDisposalReason) => Promise<DisposalResult>) | undefined
  let fatalBoundary: FatalBoundaryHandle | undefined
  let disposed = false
  let finalDisposalResult: DisposalResult | undefined
  let finalDisposalPromise: Promise<DisposalResult> | undefined
  let activeAttemptCompletion: Promise<void> = Promise.resolve()
  const ledger = createCoreErrorLedger()

  const runAttempt = async (): Promise<void> => {
    kernelState = 'starting'
    fatalBoundary?.dispose()
    fatalBoundary = undefined
    const outcome = await startAttempt({
      captureLedger: ledger,
      registerDisposer(dispose) {
        currentAttemptDisposer = dispose
      },
      rootComponent,
      startupAttemptId: createStartupAttemptId(),
      retainedAppearanceSafetyRestorationAuthority: appearanceSafetyRestorationAuthority,
      retainAppearanceSafetyRestorationAuthority(authority) {
        appearanceSafetyRestorationAuthority = authority
      },
    })

    if (disposed) {
      if (outcome.status === 'ready') {
        await outcome.readyAttempt.dispose('application-disposal')
      }
      return
    }

    if (outcome.status === 'ready') {
      kernelState = 'ready'
      return
    }

    if (outcome.status === 'cancelled') {
      kernelState = 'disposed'
      return
    }

    if (outcome.status === 'configuration-failure') {
      const retryAvailable =
        outcome.disposalResult.failedSteps.length === 0 &&
        configurationRetriesUsed < maximumRetriesPerDocument
      kernelState = retryAvailable ? 'recoverable-failure' : 'fatal-failure'
      fatalBoundary = renderConfigurationFailure({
        target: applicationTarget(),
        error: outcome.error,
        action: retryAvailable
          ? {
              kind: 'retry',
              run() {
                configurationRetriesUsed += 1
                activeAttemptCompletion = runAttemptToTerminalState()
              },
            }
          : {
              kind: 'reload',
              run: reloadApplication,
            },
      })
      return
    }

    kernelState = 'fatal-failure'
    fatalBoundary = renderStartupFailure({
      target: applicationTarget(),
      error: outcome.error,
      reload: reloadApplication,
    })
  }

  async function runAttemptToTerminalState(): Promise<void> {
    try {
      await runAttempt()
    } catch {
      try {
        fatalBoundary?.dispose()
      } catch {
        // A terminal renderer failure cannot create a second error record or recovery path.
      }
      fatalBoundary = undefined

      if (currentAttemptDisposer !== undefined) {
        try {
          await currentAttemptDisposer('failed-startup')
        } catch {
          // The terminal state remains authoritative if aggregate disposal cannot resolve.
        }
      }

      kernelState = 'fatal-failure'
    }
  }

  activeAttemptCompletion = runAttemptToTerminalState()

  return {
    get appearanceSafetyRestorationAuthority() {
      return appearanceSafetyRestorationAuthority
    },
    get completion() {
      return activeAttemptCompletion
    },
    get configurationRetriesUsed() {
      return configurationRetriesUsed
    },
    get startupState() {
      return kernelState
    },
    dispose(reason) {
      if (finalDisposalPromise !== undefined) {
        return finalDisposalPromise
      }

      finalDisposalPromise = (async () => {
        disposed = true
        kernelState = 'disposing'
        let fatalBoundaryDisposalFailure: Error | undefined

        try {
          fatalBoundary?.dispose()
        } catch {
          fatalBoundaryDisposalFailure = new Error('Fatal boundary disposal was incomplete.')
        }
        fatalBoundary = undefined
        finalDisposalResult =
          currentAttemptDisposer === undefined
            ? Object.freeze({ status: 'disposed', failedSteps: Object.freeze([]) })
            : await currentAttemptDisposer(reason)
        await activeAttemptCompletion

        if (reason === 'application-disposal') {
          appearanceSafetyRestorationAuthority = undefined
        }

        currentAttemptDisposer = undefined
        ledger.dispose()
        kernelState = 'disposed'

        if (fatalBoundaryDisposalFailure !== undefined) {
          throw fatalBoundaryDisposalFailure
        }

        return finalDisposalResult
      })()

      return finalDisposalPromise
    },
  }
}
