import { createPinia, disposePinia, getActivePinia, setActivePinia, type Pinia } from 'pinia'

import type { StartupAttemptId } from '../bootstrap/lifecycle'

export interface PiniaProviderHandle {
  readonly pinia: Pinia
  dispose(): void
}

export function createPiniaProvider(startupAttemptId: StartupAttemptId): PiniaProviderHandle {
  void startupAttemptId
  const pinia = createPinia()
  let piniaDisposed = false
  let activePiniaReleased = false
  let disposed = false

  return {
    pinia,
    dispose() {
      if (disposed) {
        return
      }

      let cleanupFailure: Error | undefined

      if (!piniaDisposed) {
        try {
          disposePinia(pinia)
          piniaDisposed = true
        } catch {
          cleanupFailure = new Error('Pinia disposal was incomplete.')
        }
      }

      if (!activePiniaReleased) {
        try {
          if (getActivePinia() === pinia) {
            setActivePinia(undefined)
          }

          activePiniaReleased = true
        } catch {
          cleanupFailure ??= new Error('Active Pinia release was incomplete.')
        }
      }

      if (cleanupFailure !== undefined) {
        throw cleanupFailure
      }

      disposed = true
    },
  }
}
