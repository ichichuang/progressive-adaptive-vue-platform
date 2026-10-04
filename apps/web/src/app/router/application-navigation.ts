import { inject, onMounted, onScopeDispose, provide, type InjectionKey } from 'vue'
import type { RouteLocationResolved, Router } from 'vue-router'
import { z } from 'zod'

import {
  resolveRegisteredDestination,
  routeDestination,
  routeHasPageInput,
  sameRouteAddress,
  validateRouteInput,
  type RegisteredRouteDestination,
  type TypedNavigationResult,
} from './route-input'
import { getRouteRecord } from './route-registry'
import {
  browserPageBindingSchema,
  browserPageSessionKey,
  type BrowserPageBinding,
  type BrowserPageDiscovery,
  type BrowserPageSessionSnapshot,
} from './browser-page-session-contract'
import type { RouterNavigationOptions } from './router-lifecycle'
import type { RouteTransitionCoordinator } from './route-transition/route-transition-coordinator'

type ApplicationNavigationOptions = Pick<RouterNavigationOptions, 'replace'> & {
  readonly openIn?: 'current-page'
  readonly reuse?: never
  readonly recovery?: never
}

interface NewBrowserPageOptions {
  readonly openIn: 'new-page'
  readonly reuse?: never
  readonly recovery?: never
  readonly replace?: never
}

interface TrackedNewBrowserPageOptions {
  readonly openIn: 'new-page'
  readonly reuse: 'same-destination'
  readonly recovery?: 'reopen'
  readonly replace?: never
}

type BrowserPageOpenResult =
  | { readonly kind: 'invalid-input'; readonly reason: 'destination' | 'options' }
  | { readonly kind: 'invocation-error' }
  | { readonly kind: 'requested'; readonly completion: 'unobservable' }

type TrackedBrowserPageResult =
  | { readonly kind: 'invalid-input'; readonly reason: 'destination' | 'options' }
  | {
      readonly kind: 'invocation-error'
      readonly phase: 'open' | 'associate' | 'initial-navigation' | 'activate'
    }
  | { readonly kind: 'open-unavailable'; readonly reason: 'no-reference' }
  | {
      readonly kind: 'requested'
      readonly action: 'open' | 'activate'
      readonly completion: 'unobservable'
    }
  | { readonly kind: 'association-pending' }
  | {
      readonly kind: 'association-unavailable'
      readonly reason:
        | 'changed-destination'
        | 'unconfirmed'
        | 'reference-lost'
        | 'restoring'
        | 'recovery-unavailable'
    }

type PageEligibility = 'eligible' | 'different-destination' | 'unconfirmed'
type PageEligibilityQuery = (fullPath: string, deploymentBase: string) => unknown
interface BrowserPageAssociation {
  readonly destination: RouteLocationResolved
  binding: BrowserPageBinding
  requestId: string | undefined
  state:
    | { readonly kind: 'pending' }
    | { readonly kind: 'restoring' }
    | {
        readonly kind: 'reachable'
        readonly target: Window
        initialDocument: Document | undefined
      }
    | {
        readonly kind: 'unavailable'
        readonly reason:
          'changed-destination' | 'reference-lost' | 'unconfirmed' | 'recovery-unavailable'
      }
}

const browserPageWindowMessageSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('ready'), binding: browserPageBindingSchema }),
  z.strictObject({
    kind: z.literal('reply'),
    binding: browserPageBindingSchema,
    requestId: z.uuid(),
  }),
])

function sameBinding(left: BrowserPageBinding, right: BrowserPageBinding): boolean {
  return (
    left.sourceId === right.sourceId &&
    left.associationId === right.associationId &&
    left.routeName === right.routeName
  )
}

function isBrowserWindow(value: unknown): value is Window {
  try {
    return (
      typeof value === 'object' && value !== null && 'window' in value && value.window === value
    )
  } catch {
    return false
  }
}

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
  navigate(
    destination: RegisteredRouteDestination,
    options: TrackedNewBrowserPageOptions,
  ): Promise<TrackedBrowserPageResult>
  navigate(
    destination: RegisteredRouteDestination,
    options: ApplicationNavigationOptions | NewBrowserPageOptions | TrackedNewBrowserPageOptions,
  ): Promise<TypedNavigationResult | BrowserPageOpenResult | TrackedBrowserPageResult>
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
  const injectedSessionPort = inject(browserPageSessionKey)
  if (injectedSessionPort === undefined)
    throw new Error('Browser page session storage is unavailable.')
  const sessionPort = injectedSessionPort
  const ownerDocument = document
  const deploymentBase = router.options.history.createHref('/')
  const associations: BrowserPageAssociation[] = []
  let mounted = false
  let disposed = false
  let pageHidden = false
  let session: BrowserPageSessionSnapshot | undefined
  let unsubscribeDiscovery: (() => void) | undefined

  function applicationUrl(href: string): URL | undefined {
    try {
      const url = new URL(href, window.location.origin)
      // The validated runtime configuration currently admits root deployment only.
      if (
        deploymentBase !== '/' ||
        url.origin !== window.location.origin ||
        url.username !== '' ||
        url.password !== '' ||
        !url.pathname.startsWith(deploymentBase)
      )
        return undefined
      return url
    } catch {
      return undefined
    }
  }

  function eligibility(expectedFullPath: string, expectedDeploymentBase: string): PageEligibility {
    if (
      typeof expectedFullPath !== 'string' ||
      typeof expectedDeploymentBase !== 'string' ||
      !mounted ||
      disposed ||
      pageHidden ||
      document !== ownerDocument ||
      expectedDeploymentBase !== deploymentBase
    )
      return 'unconfirmed'
    try {
      const expected = router.resolve(expectedFullPath)
      const current = router.currentRoute.value
      if (
        validateRouteInput(expected).kind !== 'valid' ||
        validateRouteInput(current).kind !== 'valid'
      )
        return 'unconfirmed'
      if (!sameRouteAddress(current, expected)) return 'different-destination'
      const currentUrl = applicationUrl(router.resolve(current.fullPath).href)
      return currentUrl?.href === ownerDocument.URL ? 'eligible' : 'unconfirmed'
    } catch {
      return 'unconfirmed'
    }
  }

  function suspendEligibility(): void {
    pageHidden = true
    for (const association of associations) association.requestId = undefined
  }
  function restoreEligibility(): void {
    if (!mounted || disposed || document !== ownerDocument) return
    pageHidden = false
    for (const association of associations)
      if (association.state.kind === 'restoring') requestRecovery(association)
    notifyOpener({ kind: 'ready' })
  }
  onMounted(() => {
    if (disposed) return
    mounted = true
    if (!Object.hasOwn(ownerDocument, '__pavpApplicationPageEligibility'))
      Object.defineProperty(ownerDocument, '__pavpApplicationPageEligibility', {
        value: eligibility,
        enumerable: false,
        writable: false,
        configurable: true,
      })
    window.addEventListener('pagehide', suspendEligibility)
    window.addEventListener('pageshow', restoreEligibility)
    window.addEventListener('message', receiveWindowMessage)
    unsubscribeDiscovery = sessionPort.subscribe(receiveDiscovery)
    restoreSession()
    restoreEligibility()
  })
  onScopeDispose(() => {
    disposed = true
    mounted = false
    const installed: unknown = Object.getOwnPropertyDescriptor(
      ownerDocument,
      '__pavpApplicationPageEligibility',
    )?.value
    if (installed === eligibility)
      Reflect.deleteProperty(ownerDocument, '__pavpApplicationPageEligibility')
    window.removeEventListener('pagehide', suspendEligibility)
    window.removeEventListener('pageshow', restoreEligibility)
    window.removeEventListener('message', receiveWindowMessage)
    unsubscribeDiscovery?.()
    associations.length = 0
    session = undefined
  })

  function terminateAssociation(
    association: BrowserPageAssociation,
    reason: 'changed-destination' | 'reference-lost' | 'unconfirmed' | 'recovery-unavailable',
  ): TrackedBrowserPageResult {
    association.state = { kind: 'unavailable', reason }
    association.requestId = undefined
    return { kind: 'association-unavailable', reason }
  }

  function inspectAssociation(
    association: BrowserPageAssociation,
  ): TrackedBrowserPageResult | { readonly kind: 'eligible'; readonly target: Window } {
    const state = association.state
    if (state.kind === 'pending') return { kind: 'association-pending' }
    if (state.kind === 'restoring') return { kind: 'association-unavailable', reason: 'restoring' }
    if (state.kind === 'unavailable')
      return { kind: 'association-unavailable', reason: state.reason }
    let targetDocument: Document
    try {
      if (state.target.closed || state.target.opener !== window)
        return terminateAssociation(association, 'reference-lost')
      targetDocument = state.target.document
    } catch {
      return terminateAssociation(association, 'reference-lost')
    }
    if (targetDocument === state.initialDocument) return { kind: 'association-pending' }
    state.initialDocument = undefined
    const actualUrl = applicationUrl(targetDocument.URL)
    if (actualUrl === undefined) return terminateAssociation(association, 'changed-destination')
    // Parse the observed root-deployed URL using this router; never compare records across realms.
    let actual: RouteLocationResolved
    try {
      actual = router.resolve(actualUrl.pathname + actualUrl.search + actualUrl.hash)
    } catch {
      return { kind: 'association-unavailable', reason: 'unconfirmed' }
    }
    if (
      validateRouteInput(actual).kind !== 'valid' ||
      !sameRouteAddress(actual, association.destination)
    )
      return terminateAssociation(association, 'changed-destination')
    let confirmed: unknown
    try {
      const candidate: unknown = Object.getOwnPropertyDescriptor(
        targetDocument,
        '__pavpApplicationPageEligibility',
      )?.value
      if (isEligibilityQuery(candidate))
        confirmed = candidate(association.destination.fullPath, deploymentBase)
    } catch {
      // A failed application query does not prove the browsing context was lost.
    }
    if (confirmed === 'different-destination')
      return terminateAssociation(association, 'changed-destination')
    if (confirmed === 'eligible') return { kind: 'eligible', target: state.target }
    if (targetDocument.readyState === 'loading') return { kind: 'association-pending' }
    return { kind: 'association-unavailable', reason: 'unconfirmed' }
  }

  function activateAssociation(association: BrowserPageAssociation): TrackedBrowserPageResult {
    if (association.state.kind === 'restoring' && !requestRecovery(association))
      return { kind: 'association-unavailable', reason: 'recovery-unavailable' }
    const outcome = inspectAssociation(association)
    if (outcome.kind !== 'eligible') return outcome
    try {
      outcome.target.focus()
    } catch {
      return { kind: 'invocation-error', phase: 'activate' }
    }
    return { kind: 'requested', action: 'activate', completion: 'unobservable' }
  }

  function resolveBinding(binding: BrowserPageBinding): RouteLocationResolved | undefined {
    try {
      const record = getRouteRecord(binding.routeName)
      if (binding.deploymentBase !== deploymentBase || routeHasPageInput(record)) return undefined
      const resolved = router.resolve({ name: record.name })
      if (validateRouteInput(resolved).kind !== 'valid') return undefined
      return resolveRegisteredDestination(router, routeDestination(resolved))
    } catch {
      return undefined
    }
  }

  function restoreSession(): void {
    const stored = sessionPort.read()
    if (stored.status === 'unusable') return
    if (stored.status === 'missing') {
      try {
        session = {
          schemaVersion: 1,
          sourceId: crypto.randomUUID(),
          associations: [],
          target: null,
        }
      } catch {
        // A usable identity is required before any tracked page can be created.
      }
      return
    }
    const restored: BrowserPageAssociation[] = []
    for (const binding of stored.snapshot.associations) {
      const destination = resolveBinding(binding)
      if (destination === undefined) return
      restored.push({ destination, binding, requestId: undefined, state: { kind: 'restoring' } })
    }
    if (stored.snapshot.target !== null && resolveBinding(stored.snapshot.target) === undefined)
      return
    session = stored.snapshot
    associations.push(...restored)
  }

  function requestRecovery(association: BrowserPageAssociation): boolean {
    if (
      !mounted ||
      disposed ||
      pageHidden ||
      document !== ownerDocument ||
      !sessionPort.available()
    )
      return false
    try {
      const requestId = crypto.randomUUID()
      association.requestId = requestId
      if (sessionPort.discover({ kind: 'discover', binding: association.binding, requestId }))
        return true
    } catch {
      // Failure is observable on the next explicit attempt, never replaced by an open.
    }
    association.requestId = undefined
    return false
  }

  function notifyOpener(
    message: { readonly kind: 'ready' } | { readonly kind: 'reply'; readonly requestId: string },
  ): void {
    const binding = session?.target
    if (binding === undefined || binding === null) return
    const destination = resolveBinding(binding)
    if (
      destination === undefined ||
      eligibility(destination.fullPath, binding.deploymentBase) !== 'eligible'
    )
      return
    try {
      const opener: unknown = window.opener
      if (isBrowserWindow(opener) && opener !== window && !opener.closed)
        opener.postMessage({ ...message, binding }, window.location.origin)
    } catch {
      // A severed browser relation cannot be reconstructed from a stored identity.
    }
  }

  function receiveDiscovery(message: BrowserPageDiscovery): void {
    const binding = session?.target
    if (binding !== undefined && binding !== null && sameBinding(binding, message.binding))
      notifyOpener({ kind: 'reply', requestId: message.requestId })
  }

  function receiveWindowMessage(event: MessageEvent<unknown>): void {
    if (
      !mounted ||
      disposed ||
      pageHidden ||
      document !== ownerDocument ||
      event.origin !== window.location.origin ||
      !isBrowserWindow(event.source) ||
      event.source === window
    )
      return
    const parsed = browserPageWindowMessageSchema.safeParse(event.data)
    if (!parsed.success) return
    const message = parsed.data
    const association = associations.find((entry) => sameBinding(entry.binding, message.binding))
    if (
      association === undefined ||
      (message.kind === 'reply' && message.requestId !== association.requestId)
    )
      return
    const candidate: BrowserPageAssociation = {
      destination: association.destination,
      binding: association.binding,
      requestId: undefined,
      state: { kind: 'reachable', target: event.source, initialDocument: undefined },
    }
    if (inspectAssociation(candidate).kind !== 'eligible') return
    if (message.kind === 'ready') {
      if (association.state.kind === 'restoring') requestRecovery(association)
      return
    }
    if (association.state.kind === 'restoring') association.state = candidate.state
    else if (association.state.kind === 'reachable' && association.state.target !== event.source)
      terminateAssociation(association, 'unconfirmed')
  }

  function openAssociation(
    association: BrowserPageAssociation,
    absoluteHref: string,
  ): TrackedBrowserPageResult {
    association.state = { kind: 'pending' }
    let target: Window | null
    try {
      target = window.open('about:blank', '_blank')
    } catch {
      terminateAssociation(association, 'reference-lost')
      return { kind: 'invocation-error', phase: 'open' }
    }
    if (target === null) {
      terminateAssociation(association, 'reference-lost')
      return { kind: 'open-unavailable', reason: 'no-reference' }
    }
    let initialDocument: Document
    try {
      initialDocument = target.document
      if (target.closed || initialDocument.URL !== 'about:blank')
        throw new Error('The new blank browser page is unavailable.')
      // Preserve the browser-created relation used to request activation from this source.
      if (target.opener !== window) throw new Error('The new browser page lost its source opener.')
    } catch {
      terminateAssociation(association, 'reference-lost')
      return { kind: 'invocation-error', phase: 'associate' }
    }
    if (sessionPort.initializeTarget(target, association.binding).status !== 'saved')
      return terminateAssociation(association, 'recovery-unavailable')
    association.state = { kind: 'reachable', target, initialDocument }
    try {
      target.location.replace(absoluteHref)
    } catch {
      terminateAssociation(association, 'reference-lost')
      return { kind: 'invocation-error', phase: 'initial-navigation' }
    }
    return { kind: 'requested', action: 'open', completion: 'unobservable' }
  }

  function navigateTracked(
    destination: RegisteredRouteDestination,
    options: TrackedNewBrowserPageOptions,
  ): TrackedBrowserPageResult {
    if (disposed || document !== ownerDocument)
      return { kind: 'association-unavailable', reason: 'reference-lost' }
    if (!mounted || pageHidden) return { kind: 'association-unavailable', reason: 'unconfirmed' }
    const resolved = resolveRegisteredDestination(router, destination)
    const url = resolved === undefined ? undefined : applicationUrl(resolved.href)
    if (resolved === undefined || url === undefined)
      return { kind: 'invalid-input', reason: 'destination' }
    if (routeHasPageInput(getRouteRecord(resolved.name)))
      return { kind: 'invalid-input', reason: 'destination' }
    let association = associations.find((entry) => sameRouteAddress(entry.destination, resolved))
    if (association !== undefined) {
      const outcome = activateAssociation(association)
      if (
        options.recovery !== 'reopen' ||
        outcome.kind !== 'association-unavailable' ||
        outcome.reason === 'recovery-unavailable'
      )
        return outcome
    } else {
      if (options.recovery === 'reopen') return { kind: 'invalid-input', reason: 'options' }
    }
    if (session === undefined || !sessionPort.available())
      return { kind: 'association-unavailable', reason: 'recovery-unavailable' }
    let binding: BrowserPageBinding
    try {
      binding = {
        sourceId: session.sourceId,
        associationId: crypto.randomUUID(),
        routeName: getRouteRecord(resolved.name).name,
        deploymentBase: '/',
      }
    } catch {
      return { kind: 'association-unavailable', reason: 'recovery-unavailable' }
    }
    const nextSession: BrowserPageSessionSnapshot = {
      ...session,
      associations: [
        ...session.associations.filter((entry) => entry.routeName !== binding.routeName),
        binding,
      ],
    }
    if (sessionPort.write(nextSession).status !== 'saved')
      return { kind: 'association-unavailable', reason: 'recovery-unavailable' }
    session = nextSession
    if (association === undefined) {
      association = {
        destination: resolved,
        binding,
        requestId: undefined,
        state: { kind: 'pending' },
      }
      associations.push(association)
    } else {
      association.binding = binding
      association.requestId = undefined
    }
    return openAssociation(association, url.href)
  }

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
    options: TrackedNewBrowserPageOptions,
  ): Promise<TrackedBrowserPageResult>
  function navigate(
    destination: RegisteredRouteDestination,
    options: ApplicationNavigationOptions | NewBrowserPageOptions | TrackedNewBrowserPageOptions,
  ): Promise<TypedNavigationResult | BrowserPageOpenResult | TrackedBrowserPageResult>
  function navigate(
    destination: RegisteredRouteDestination,
    options?: ApplicationNavigationOptions | NewBrowserPageOptions | TrackedNewBrowserPageOptions,
  ): Promise<TypedNavigationResult | BrowserPageOpenResult | TrackedBrowserPageResult> {
    const reuse: unknown = options?.reuse
    const recovery: unknown = options?.recovery
    if (
      options !== undefined &&
      (('reuse' in options && (options.openIn !== 'new-page' || reuse !== 'same-destination')) ||
        ('recovery' in options &&
          (options.openIn !== 'new-page' || reuse !== 'same-destination' || recovery !== 'reopen')))
    )
      return Promise.resolve({ kind: 'invalid-input', reason: 'options' })
    if (options?.openIn === 'new-page' && options.reuse === 'same-destination') {
      if ('replace' in options) return Promise.resolve({ kind: 'invalid-input', reason: 'options' })
      return Promise.resolve(navigateTracked(destination, options))
    }
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

function isEligibilityQuery(value: unknown): value is PageEligibilityQuery {
  return typeof value === 'function'
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
  options: TrackedNewBrowserPageOptions,
): (
  event: MouseEvent,
  destination: RegisteredRouteDestination,
) => Promise<TrackedBrowserPageResult> | undefined
export function useApplicationLinkActivation(
  options?: NewBrowserPageOptions | TrackedNewBrowserPageOptions,
): (
  event: MouseEvent,
  destination: RegisteredRouteDestination,
) => Promise<TypedNavigationResult | BrowserPageOpenResult | TrackedBrowserPageResult> | undefined {
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
      return navigation.navigate(destination, options)
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
