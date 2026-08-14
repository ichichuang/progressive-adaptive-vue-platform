import { createApp, type Component, type App as VueApplication } from 'vue'

import type { NormalizedCoreError } from '../errors/core-error'
import { resolveVueLifecyclePhase } from '../errors/error-normalizer'
import type { StartupAttemptId } from './lifecycle'

export interface VueApplicationErrorHooks {
  captureComponentFailure(input: {
    readonly cause: unknown
    readonly startupAttemptId: StartupAttemptId
    readonly vueLifecyclePhase: 'render' | 'setup' | 'lifecycle' | 'watcher'
  }): NormalizedCoreError
  claimMountFailure(input: {
    readonly cause: unknown
    readonly startupAttemptId: StartupAttemptId
  }): void
  isMounting(): boolean
}

export interface VueApplicationCreationHandle {
  readonly application: VueApplication
  dispose(): void
}

export interface MountedApplicationHandle {
  readonly application: VueApplication
  dispose(): void
}

export function createVueApplication(input: {
  readonly errorHooks: VueApplicationErrorHooks
  readonly rootComponent: Component
  readonly rootProps: Record<string, unknown>
  readonly startupAttemptId: StartupAttemptId
}): VueApplicationCreationHandle {
  const application = createApp(input.rootComponent, input.rootProps)
  let disposed = false

  application.config.errorHandler = (cause, _instance, info) => {
    if (input.errorHooks.isMounting()) {
      input.errorHooks.claimMountFailure({
        cause,
        startupAttemptId: input.startupAttemptId,
      })
      return
    }

    input.errorHooks.captureComponentFailure({
      cause,
      startupAttemptId: input.startupAttemptId,
      vueLifecyclePhase: resolveVueLifecyclePhase(info),
    })
  }

  return {
    application,
    dispose() {
      if (disposed) {
        return
      }

      delete application.config.errorHandler
      disposed = true
    },
  }
}

export function mountVueApplication(
  application: VueApplication,
  target: '#app',
  retainHandle: (handle: MountedApplicationHandle) => void,
): MountedApplicationHandle {
  const matchingTargets = document.querySelectorAll<HTMLElement>(target)

  if (matchingTargets.length !== 1) {
    throw new Error('The exact application Mount target is unavailable.')
  }

  const targetElement = matchingTargets.item(0)
  let baselineChildNodes = Array.from(targetElement.childNodes)
  let baselineAttributes = Array.from(targetElement.attributes, ({ name, value }) => ({
    name,
    value,
  }))
  let mountConfirmed = false
  let vueUnmountComplete = false
  let targetBaselineRestored = false
  let disposed = false
  const restoreTargetBaseline = (): void => {
    targetElement.replaceChildren(...baselineChildNodes)

    for (const attribute of Array.from(targetElement.attributes)) {
      targetElement.removeAttribute(attribute.name)
    }

    for (const attribute of baselineAttributes) {
      targetElement.setAttribute(attribute.name, attribute.value)
    }

    targetBaselineRestored = true
  }
  const handle: MountedApplicationHandle = {
    application,
    dispose() {
      if (disposed) {
        return
      }

      let cleanupFailure: Error | undefined

      if (!vueUnmountComplete) {
        try {
          application.unmount()
          vueUnmountComplete = true
        } catch {
          cleanupFailure = new Error('Vue application unmount was incomplete.')
        }
      }

      if (!mountConfirmed && !targetBaselineRestored) {
        try {
          restoreTargetBaseline()
        } catch {
          cleanupFailure ??= new Error('Application Mount target restoration was incomplete.')
        }
      }

      if (cleanupFailure !== undefined) {
        throw cleanupFailure
      }

      baselineChildNodes = []
      baselineAttributes = []
      disposed = true
    },
  }

  retainHandle(handle)

  try {
    const mountedComponent: unknown = application.mount(target)

    if (mountedComponent === undefined) {
      throw new Error('The exact application Mount target is unavailable.')
    }

    mountConfirmed = true
    baselineChildNodes = []
    baselineAttributes = []
  } catch (source: unknown) {
    try {
      handle.dispose()
    } catch {
      // The retained handle lets the aggregate Attempt disposer retry and record this cleanup.
    }
    throw source
  }

  return handle
}
