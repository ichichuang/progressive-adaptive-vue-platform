import type { App as VueApplication } from 'vue'

import {
  installAppearanceProvider,
  type AppearanceFirstPaintHandoffHandle,
  type AppearanceProviderHandle,
} from '../appearance/appearance-bootstrap'
import type { AttemptDisposalReason } from './lifecycle'
import type { PiniaProviderHandle } from '../providers/pinia'

const activeProviderIds = ['pinia', 'appearance'] as const

export interface InstalledPlatformProvidersHandle {
  readonly ids: readonly ['pinia', 'appearance']
  readonly appearance: AppearanceProviderHandle
  dispose(reason: AttemptDisposalReason): void
}

export function installPlatformProviders(input: {
  readonly application: VueApplication
  readonly handoff: AppearanceFirstPaintHandoffHandle
  readonly pinia: PiniaProviderHandle['pinia']
}): InstalledPlatformProvidersHandle {
  input.application.use(input.pinia)
  const appearance = installAppearanceProvider(input.pinia, input.handoff)
  let disposed = false

  return {
    ids: activeProviderIds,
    appearance,
    dispose(reason) {
      if (disposed) {
        return
      }

      appearance.dispose(reason === 'failed-startup' ? 'failed-startup' : 'normal-or-hmr')
      disposed = true
    },
  }
}
