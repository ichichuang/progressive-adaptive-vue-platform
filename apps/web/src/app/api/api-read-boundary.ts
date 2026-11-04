import { inject, type App, type InjectionKey } from 'vue'
import type { ApiConfiguration } from '../../shared/api'

interface ApiReadBoundary {
  readonly configured: boolean
  readonly configuration: ApiConfiguration
  readonly origin: string | undefined
}
const apiReadBoundaryKey: InjectionKey<ApiReadBoundary> = Symbol('api-read-boundary')

export function provideApiReadBoundary(application: App, configuration: ApiConfiguration): void {
  const origin = typeof location === 'undefined' ? undefined : location.origin
  application.provide(
    apiReadBoundaryKey,
    Object.freeze({
      configured: configuration.status === 'configured',
      configuration,
      origin,
    }),
  )
}

export function useApiReadBoundary(): ApiReadBoundary {
  const boundary = inject(apiReadBoundaryKey)
  if (boundary === undefined) throw new TypeError('The API read boundary is unavailable.')
  return boundary
}
