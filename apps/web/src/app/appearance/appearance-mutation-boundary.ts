import type { CustomThemeRegistryEntry, ExplicitThemePreference } from '@platform/design-system'
import {
  computed,
  inject,
  readonly,
  type App,
  type ComputedRef,
  type DeepReadonly,
  type InjectionKey,
} from 'vue'

export type AppearanceMutationResult =
  { readonly status: 'committed' } | { readonly status: 'rejected' }

export interface AppearanceMutationBoundary {
  readonly preference: Readonly<ComputedRef<DeepReadonly<ExplicitThemePreference> | null>>
  readonly customThemeRegistry: Readonly<
    ComputedRef<readonly DeepReadonly<CustomThemeRegistryEntry>[] | null>
  >
  readonly commitPreference: (candidate: unknown) => AppearanceMutationResult
  readonly resetPreference: () => AppearanceMutationResult
}

class AppearanceMutationBoundaryUnavailableError extends Error {
  readonly classification = 'application-startup-failure'
  readonly bootstrapStepId = 'mount-application'

  constructor() {
    super('The Appearance Mutation Boundary is unavailable.')
    this.name = 'AppearanceMutationBoundaryUnavailableError'
  }
}

const appearanceMutationBoundaryKey: InjectionKey<AppearanceMutationBoundary> = Symbol(
  'appearance-mutation-boundary',
)

export function createAppearanceMutationBoundary(input: {
  readonly readPreference: () => ExplicitThemePreference | null
  readonly readCustomThemeRegistry: () => readonly CustomThemeRegistryEntry[] | null
  readonly commitPreference: (candidate: unknown) => AppearanceMutationResult
  readonly resetPreference: () => AppearanceMutationResult
}): AppearanceMutationBoundary {
  const preference = computed(() => {
    const value = input.readPreference()
    return value === null ? null : readonly(value)
  })
  const customThemeRegistry = computed(() => {
    const value = input.readCustomThemeRegistry()
    return value === null ? null : readonly(value)
  })

  return Object.freeze({
    preference,
    customThemeRegistry,
    commitPreference: input.commitPreference,
    resetPreference: input.resetPreference,
  })
}

export function provideAppearanceMutationBoundary(
  app: App,
  boundary: AppearanceMutationBoundary,
): void {
  app.provide(appearanceMutationBoundaryKey, boundary)
}

export function useAppearanceMutationBoundary(): AppearanceMutationBoundary {
  const boundary = inject(appearanceMutationBoundaryKey)

  if (boundary === undefined) {
    throw new AppearanceMutationBoundaryUnavailableError()
  }

  return boundary
}
