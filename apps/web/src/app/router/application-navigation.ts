import { inject, provide, type InjectionKey } from 'vue'
import type { Router } from 'vue-router'

import {
  resolveRegisteredDestination,
  type RegisteredRouteDestination,
  type TypedNavigationResult,
} from './route-input'
import type { RouterNavigationOptions } from './router-lifecycle'
import type { RouteTransitionCoordinator } from './route-transition/route-transition-coordinator'

type ApplicationNavigationOptions = Pick<RouterNavigationOptions, 'replace'>

export interface ApplicationNavigation {
  navigate(
    destination: RegisteredRouteDestination,
    options?: ApplicationNavigationOptions,
  ): Promise<TypedNavigationResult>
  resolveHref(destination: RegisteredRouteDestination): string | undefined
}

const applicationNavigationKey: InjectionKey<ApplicationNavigation> =
  Symbol('Application Navigation')
const workspaceNavigationKey: InjectionKey<Pick<RouteTransitionCoordinator, 'navigate'>> =
  Symbol('Workspace Navigation')

export function provideApplicationNavigation(
  router: Router,
  coordinator: RouteTransitionCoordinator,
): void {
  const navigation: ApplicationNavigation = Object.freeze({
    navigate(destination: RegisteredRouteDestination, options?: ApplicationNavigationOptions) {
      return coordinator.navigate(
        destination,
        options?.replace === undefined ? undefined : { replace: options.replace },
      )
    },
    resolveHref(destination: RegisteredRouteDestination) {
      return resolveRegisteredDestination(router, destination)?.href
    },
  })
  provide(applicationNavigationKey, navigation)
  provide(
    workspaceNavigationKey,
    Object.freeze({
      navigate(destination: RegisteredRouteDestination, options?: RouterNavigationOptions) {
        return coordinator.navigate(destination, options)
      },
    }),
  )
}

export function useApplicationNavigation(): ApplicationNavigation {
  const navigation = inject(applicationNavigationKey)
  if (navigation === undefined)
    throw new Error('The Application Navigation context is unavailable.')
  return navigation
}

export function useWorkspaceNavigation(): Pick<RouteTransitionCoordinator, 'navigate'> {
  const navigation = inject(workspaceNavigationKey)
  if (navigation === undefined) throw new Error('The Workspace Navigation context is unavailable.')
  return navigation
}

export function useApplicationLinkActivation(): (
  event: MouseEvent,
  destination: RegisteredRouteDestination,
) => Promise<TypedNavigationResult> | undefined {
  const navigation = useApplicationNavigation()
  return (event, destination) => {
    const anchor = event.currentTarget
    if (
      event.defaultPrevented ||
      !event.cancelable ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      !(anchor instanceof HTMLAnchorElement) ||
      anchor.hasAttribute('download')
    )
      return
    const target =
      anchor.getAttribute('target') ??
      anchor.ownerDocument.querySelector('base[target]')?.getAttribute('target') ??
      ''
    if (target !== '' && target.toLowerCase() !== '_self') return
    const href = anchor.getAttribute('href')
    if (href === null || href === '' || href !== navigation.resolveHref(destination)) return
    event.preventDefault()
    return navigation.navigate(destination)
  }
}
