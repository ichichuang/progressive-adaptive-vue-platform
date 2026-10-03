import { inject, provide, type InjectionKey } from 'vue'
import type { Router } from 'vue-router'

import {
  resolveRegisteredDestination,
  type RegisteredRouteDestination,
  type TypedNavigationResult,
} from './route-input'
import type { RouterNavigationOptions } from './router-lifecycle'
import type { RouteTransitionCoordinator } from './route-transition/route-transition-coordinator'

type ApplicationNavigationOptions = Pick<RouterNavigationOptions, 'replace'> & {
  readonly openIn?: 'current-page'
}

interface NewBrowserPageOptions {
  readonly openIn: 'new-page'
  readonly replace?: never
}

type BrowserPageOpenResult =
  | { readonly kind: 'invalid-input'; readonly reason: 'destination' | 'options' }
  | { readonly kind: 'invocation-error' }
  | { readonly kind: 'requested'; readonly completion: 'unobservable' }

export interface ApplicationNavigation {
  navigate(
    destination: RegisteredRouteDestination,
    options?: ApplicationNavigationOptions,
  ): Promise<TypedNavigationResult>
  navigate(
    destination: RegisteredRouteDestination,
    options: NewBrowserPageOptions,
  ): Promise<BrowserPageOpenResult>
  navigate(
    destination: RegisteredRouteDestination,
    options: ApplicationNavigationOptions | NewBrowserPageOptions,
  ): Promise<TypedNavigationResult | BrowserPageOpenResult>
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
  function navigate(
    destination: RegisteredRouteDestination,
    options?: ApplicationNavigationOptions,
  ): Promise<TypedNavigationResult>
  function navigate(
    destination: RegisteredRouteDestination,
    options: NewBrowserPageOptions,
  ): Promise<BrowserPageOpenResult>
  function navigate(
    destination: RegisteredRouteDestination,
    options: ApplicationNavigationOptions | NewBrowserPageOptions,
  ): Promise<TypedNavigationResult | BrowserPageOpenResult>
  function navigate(
    destination: RegisteredRouteDestination,
    options?: ApplicationNavigationOptions | NewBrowserPageOptions,
  ): Promise<TypedNavigationResult | BrowserPageOpenResult> {
    if (options?.openIn === 'new-page') {
      if ('replace' in options) return Promise.resolve({ kind: 'invalid-input', reason: 'options' })
      const href = resolveRegisteredDestination(router, destination)?.href
      if (href === undefined)
        return Promise.resolve({ kind: 'invalid-input', reason: 'destination' })
      try {
        window.open(href, '_blank', 'noopener')
      } catch {
        return Promise.resolve({ kind: 'invocation-error' })
      }
      return Promise.resolve({ kind: 'requested', completion: 'unobservable' })
    }
    const openIn: unknown = options?.openIn
    if (openIn !== undefined && openIn !== 'current-page')
      return Promise.resolve({ kind: 'invalid-input', reason: 'options' })
    return coordinator.navigate(
      destination,
      options?.replace === undefined ? undefined : { replace: options.replace },
    )
  }

  const navigation: ApplicationNavigation = Object.freeze({
    navigate,
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
) => Promise<TypedNavigationResult> | undefined
export function useApplicationLinkActivation(
  options: NewBrowserPageOptions,
): (
  event: MouseEvent,
  destination: RegisteredRouteDestination,
) => Promise<BrowserPageOpenResult> | undefined
export function useApplicationLinkActivation(
  options?: NewBrowserPageOptions,
): (
  event: MouseEvent,
  destination: RegisteredRouteDestination,
) => Promise<TypedNavigationResult | BrowserPageOpenResult> | undefined {
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
    if (options?.openIn === 'new-page') {
      event.preventDefault()
      if (
        !/^_[bB][lL][aA][nN][kK]$/u.test(anchor.getAttribute('target') ?? '') ||
        !(anchor.getAttribute('rel') ?? '')
          .split(/[\t\n\f\r ]+/u)
          .some((token) => token.toLowerCase() === 'noopener')
      )
        return Promise.resolve({ kind: 'invalid-input', reason: 'options' })
      const href = anchor.getAttribute('href')
      if (href === null || href === '' || href !== navigation.resolveHref(destination))
        return Promise.resolve({ kind: 'invalid-input', reason: 'destination' })
      return navigation.navigate(destination, { openIn: 'new-page' })
    }
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
