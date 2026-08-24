import type { EffectiveAppearanceState } from '@platform/design-system'
import { inject, readonly, shallowRef, type App, type InjectionKey, type ShallowRef } from 'vue'

export interface AppearanceReadBoundary {
  readonly snapshot: Readonly<ShallowRef<Readonly<EffectiveAppearanceState>>>
}

interface AppearanceReadBoundaryProviderHandle {
  readonly boundary: AppearanceReadBoundary
  update(next: Readonly<EffectiveAppearanceState>): void
  dispose(): void
}

class AppearanceReadBoundaryUnavailableError extends Error {
  readonly classification = 'application-startup-failure'
  readonly bootstrapStepId = 'mount-application'

  constructor() {
    super('The Appearance Read Boundary is unavailable.')
    this.name = 'AppearanceReadBoundaryUnavailableError'
  }
}

const appearanceReadBoundaryKey: InjectionKey<AppearanceReadBoundary> = Symbol(
  'appearance-read-boundary',
)

export function createAppearanceReadBoundary(
  initialSnapshot: Readonly<EffectiveAppearanceState>,
): AppearanceReadBoundaryProviderHandle {
  const snapshot = shallowRef<Readonly<EffectiveAppearanceState>>(readonly(initialSnapshot))
  const boundary: AppearanceReadBoundary = Object.freeze({
    snapshot: readonly(snapshot),
  })
  let disposed = false

  return {
    boundary,
    update(next) {
      if (disposed) {
        throw new Error('The Appearance Read Boundary has been disposed.')
      }

      snapshot.value = readonly(next)
    },
    dispose() {
      disposed = true
    },
  }
}

export function provideAppearanceReadBoundary(app: App, boundary: AppearanceReadBoundary): void {
  app.provide(appearanceReadBoundaryKey, boundary)
}

export function useAppearanceReadBoundary(): AppearanceReadBoundary {
  const boundary = inject(appearanceReadBoundaryKey)

  if (boundary === undefined) {
    throw new AppearanceReadBoundaryUnavailableError()
  }

  return boundary
}
