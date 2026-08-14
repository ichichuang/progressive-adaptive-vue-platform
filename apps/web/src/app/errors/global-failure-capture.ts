import type { ApplicationStartupState, StartupAttemptId } from '../bootstrap/lifecycle'
import type { BootstrapStepId } from '../bootstrap/bootstrap-registry'
import type { CoreBuildIdentity, NormalizedCoreError } from './core-error'
import {
  normalizeApplicationStartupFailure,
  normalizeUnhandledPromiseRejection,
} from './error-normalizer'

export interface GlobalFailureCaptureHandle {
  readonly windowErrorListener: (event: ErrorEvent) => void
  readonly unhandledRejectionListener: (event: PromiseRejectionEvent) => void
  withdrawStartupCapture(): void
  dispose(): void
}

export interface InstallGlobalFailureCaptureInput extends CoreBuildIdentity {
  readonly startupAttemptId: StartupAttemptId
  readonly getStartupState: () => ApplicationStartupState
  readonly getCurrentBootstrapStepId: () => BootstrapStepId
  readonly capture: (error: NormalizedCoreError) => boolean
  readonly claimStartupFailure: (error: NormalizedCoreError<'application-startup-failure'>) => void
}

export function installGlobalFailureCapture(
  input: InstallGlobalFailureCaptureInput,
  retainHandle: (handle: GlobalFailureCaptureHandle) => void,
): GlobalFailureCaptureHandle {
  let windowErrorActive = false
  let rejectionActive = false
  let disposed = false

  const windowErrorListener = (event: ErrorEvent): void => {
    if (disposed || !windowErrorActive || input.getStartupState() !== 'starting') {
      return
    }

    const error = normalizeApplicationStartupFailure({
      source: event.error,
      startupAttemptId: input.startupAttemptId,
      bootstrapStepId: input.getCurrentBootstrapStepId(),
      releaseSha: input.releaseSha,
      buildVersion: input.buildVersion,
    })

    if (input.capture(error)) {
      input.claimStartupFailure(error)
    }
  }

  const unhandledRejectionListener = (event: PromiseRejectionEvent): void => {
    if (disposed || !rejectionActive) {
      return
    }

    const error = normalizeUnhandledPromiseRejection({
      source: event.reason,
      applicationStartupState: input.getStartupState(),
      startupAttemptId: input.startupAttemptId,
      releaseSha: input.releaseSha,
      buildVersion: input.buildVersion,
    })

    input.capture(error)
    event.preventDefault()
  }

  const removeWindowErrorListener = (): boolean => {
    if (!windowErrorActive) {
      return true
    }

    try {
      window.removeEventListener('error', windowErrorListener)
      windowErrorActive = false
      return true
    } catch {
      return false
    }
  }
  const removeUnhandledRejectionListener = (): boolean => {
    if (!rejectionActive) {
      return true
    }

    try {
      window.removeEventListener('unhandledrejection', unhandledRejectionListener)
      rejectionActive = false
      return true
    } catch {
      return false
    }
  }
  const handle: GlobalFailureCaptureHandle = {
    windowErrorListener,
    unhandledRejectionListener,
    withdrawStartupCapture() {
      if (disposed || !windowErrorActive) {
        return
      }

      if (!removeWindowErrorListener()) {
        throw new Error('Startup failure-capture withdrawal was incomplete.')
      }
    },
    dispose() {
      if (disposed) {
        return
      }

      const windowErrorRemoved = removeWindowErrorListener()
      const rejectionRemoved = removeUnhandledRejectionListener()

      if (!windowErrorRemoved || !rejectionRemoved) {
        throw new Error('Global failure-capture disposal was incomplete.')
      }

      disposed = true
    },
  }

  retainHandle(handle)

  windowErrorActive = true
  try {
    window.addEventListener('error', windowErrorListener)
  } catch {
    try {
      handle.dispose()
    } catch {
      // The retained handle lets the aggregate Attempt disposer retry and record this cleanup.
    }
    throw new TypeError()
  }

  rejectionActive = true
  try {
    window.addEventListener('unhandledrejection', unhandledRejectionListener)
  } catch {
    try {
      handle.dispose()
    } catch {
      // The retained handle lets the aggregate Attempt disposer retry and record this cleanup.
    }
    throw new TypeError()
  }

  return handle
}
