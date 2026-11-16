import type { App as VueApplication } from 'vue'
import type { ExplicitThemePreference } from '@platform/design-system'

import {
  installAppearanceProvider,
  type AppearanceFirstPaintHandoffHandle,
  type AppearanceProviderHandle,
} from '../appearance/appearance-bootstrap'
import { provideAppearanceMutationBoundary } from '../appearance/appearance-mutation-boundary'
import { provideAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import type { AttemptDisposalReason } from './lifecycle'
import type { PiniaProviderHandle } from '../providers/pinia'
import type { ApiConfiguration } from '../../shared/api'
import { provideApiReadBoundary } from '../api/api-read-boundary'
import { installAccessBoundary } from '../access/access-boundary'
import type { AccessHost } from '../access/access-contract'

export const activeProviderIds = ['pinia', 'appearance'] as const

export interface InstalledPlatformProvidersHandle {
  readonly ids: readonly ['pinia', 'appearance']
  readonly appearance: AppearanceProviderHandle
  dispose(reason: AttemptDisposalReason): void
}

export function installPlatformProviders(input: {
  readonly application: VueApplication
  readonly handoff: AppearanceFirstPaintHandoffHandle
  readonly pinia: PiniaProviderHandle['pinia']
  readonly appearanceDefault?: ExplicitThemePreference
  readonly api: ApiConfiguration
  readonly accessHost?: AccessHost
}): InstalledPlatformProvidersHandle {
  input.application.use(input.pinia)
  provideApiReadBoundary(input.application, input.api)
  const appearance = installAppearanceProvider(input.pinia, input.handoff, input.appearanceDefault)
  provideAppearanceReadBoundary(input.application, appearance.appearanceReadBoundary)
  provideAppearanceMutationBoundary(input.application, appearance.appearanceMutationBoundary)
  const disposeAccess = installAccessBoundary(input.application, input.accessHost)
  let disposed = false

  return {
    ids: activeProviderIds,
    appearance,
    dispose(reason) {
      if (disposed) {
        return
      }

      disposed = true
      try {
        disposeAccess()
      } finally {
        appearance.dispose(reason === 'failed-startup' ? 'failed-startup' : 'normal-or-hmr')
      }
    },
  }
}
