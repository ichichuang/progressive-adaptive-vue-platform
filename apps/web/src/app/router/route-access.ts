import { effectScope, inject, shallowRef, watch, type InjectionKey } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import {
  accessRequestSchema,
  type AccessBoundary,
  type AccessRequest,
} from '../access/access-contract'
import type { RegisteredRouteDestination, ValidatedRouteInput } from './route-input'

type MatchedLocation = Pick<RouteLocationNormalized, 'matched'>
type AccessStatus =
  | 'allow'
  | 'pending'
  | 'identity-required'
  | 'deny'
  | 'indeterminate'
  | 'configuration-error'
  | 'failed'

export interface RouteAccessCheck {
  readonly read: () => AccessStatus
  dispose(): void
}

export const routeNavigationVisibilityKey: InjectionKey<
  (destination: RegisteredRouteDestination) => boolean
> = Symbol('PAVP Route Navigation Visibility')

export function useRouteNavigationVisibility(): (
  destination: RegisteredRouteDestination,
) => boolean {
  const visible = inject(routeNavigationVisibilityKey)
  if (visible === undefined)
    throw new TypeError('The route navigation visibility owner is unavailable.')
  return visible
}

function accessRecords(location: MatchedLocation) {
  // Validated generated component-less groups have no metadata of their own.
  return location.matched.filter(
    ({ name, meta }) => name !== undefined || Object.keys(meta).length > 0,
  )
}

export function isPublicRoute(location: MatchedLocation): boolean {
  const records = accessRecords(location)
  return (
    records.length > 0 &&
    records.every(
      ({ meta }) =>
        meta.auth === 'public' &&
        Array.isArray(meta.requiredPermissionIds) &&
        meta.requiredPermissionIds.length === 0 &&
        meta.permissionRequests === undefined,
    )
  )
}

/** Each matched record contributes mandatory constraints against the validated destination. */
export function observeRouteAccess(
  access: AccessBoundary,
  location: MatchedLocation,
  destination: ValidatedRouteInput,
): RouteAccessCheck {
  let requireIdentity = false
  let requireAnonymous = false
  const requests: AccessRequest[] = []
  try {
    for (const { meta } of accessRecords(location)) {
      const { auth, requiredPermissionIds: ids, permissionRequests: definitions } = meta
      if (
        !['public', 'required', 'anonymous-only', 'policy'].includes(auth) ||
        !Array.isArray(ids) ||
        (auth === 'policy' && ids.length === 0) ||
        (ids.length === 0 && definitions !== undefined) ||
        new Set(ids).size !== ids.length
      )
        throw new TypeError('Invalid route access declaration.')
      requireIdentity ||= auth === 'required'
      requireAnonymous ||= auth === 'anonymous-only'
      for (const id of ids) {
        if (
          definitions === undefined ||
          typeof id !== 'string' ||
          !id ||
          !Object.hasOwn(definitions, id)
        )
          throw new TypeError('Unbound route permission.')
        const definition = definitions[id]
        requests.push(
          accessRequestSchema.parse(
            typeof definition === 'function' ? definition(destination) : definition,
          ),
        )
      }
    }
  } catch {
    return Object.freeze({ read: () => 'configuration-error' as const, dispose: () => undefined })
  }

  let disposed = false
  let scheduled = false
  const clock = shallowRef(0)
  let timer: ReturnType<typeof setTimeout> | undefined
  const leaves = requests.map((request) => access.observe(request, schedule))

  function contextStatus(): AccessStatus {
    const context = access.readContext()
    if (context.status === 'initializing' || context.status === 'transitioning') return 'pending'
    if (context.status === 'unconfigured') return 'configuration-error'
    if (context.status === 'expired') return 'identity-required'
    if (context.status !== 'ready') return 'failed'
    if (requireIdentity && context.snapshot.identity.kind !== 'known') return 'identity-required'
    if (requireAnonymous && context.snapshot.identity.kind !== 'anonymous') return 'deny'
    return 'allow'
  }

  function read(): AccessStatus {
    // Deadline updates also invalidate consumers when the host has not sent a change event.
    void clock.value
    if (disposed) return 'failed'
    const context = contextStatus()
    const decisions = leaves.map((leaf) => leaf.read())
    if (decisions.some(({ status }) => status === 'configuration-error'))
      return 'configuration-error'
    if (context !== 'allow') return context
    if (decisions.some(({ status }) => status === 'deny')) return 'deny'
    if (decisions.some(({ status }) => status === 'evaluation-failed' || status === 'disposed'))
      return 'failed'
    if (decisions.some(({ status }) => status === 'indeterminate' || status === 'expired'))
      return 'indeterminate'
    return leaves.every((leaf) => leaf.permit()?.isCurrent() === true) ? 'allow' : 'pending'
  }

  function schedule(): void {
    if (scheduled || disposed) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      if (disposed || contextStatus() !== 'allow') return
      for (const leaf of leaves) void leaf.evaluate()
    })
  }

  function nearestExpiry(): number {
    const context = access.readContext()
    let expires = context.status === 'ready' ? (context.snapshot.expiresAt ?? Infinity) : Infinity
    for (const leaf of leaves) {
      const decision = leaf.read()
      if ('expiresAt' in decision) expires = Math.min(expires, decision.expiresAt ?? Infinity)
    }
    return expires
  }
  function scheduleExpiry(expires: number): void {
    if (timer !== undefined) clearTimeout(timer)
    if (!Number.isFinite(expires)) return
    timer = setTimeout(
      () => {
        clock.value++
        scheduleExpiry(nearestExpiry())
      },
      Math.max(0, Math.min(2_147_483_647, expires - Date.now())),
    )
  }
  const scope = effectScope(true)
  scope.run(() => {
    watch(() => access.readContext(), schedule, { flush: 'sync', immediate: true })
    watch(nearestExpiry, scheduleExpiry, { flush: 'sync', immediate: true })
  })
  return Object.freeze({
    read,
    dispose() {
      if (disposed) return
      disposed = true
      scope.stop()
      if (timer !== undefined) clearTimeout(timer)
      for (const leaf of leaves) leaf.dispose()
    },
  })
}

export function waitForRouteAccess(
  check: RouteAccessCheck,
  signal: AbortSignal,
): Promise<Exclude<AccessStatus, 'pending'> | 'cancelled'> {
  const initial = check.read()
  if (signal.aborted) return Promise.resolve('cancelled')
  if (initial !== 'pending') return Promise.resolve(initial)
  return new Promise((resolve) => {
    const finish = (status: Exclude<AccessStatus, 'pending'> | 'cancelled') => {
      stop()
      signal.removeEventListener('abort', abort)
      resolve(status)
    }
    const abort = () => {
      finish('cancelled')
    }
    const stop = watch(
      check.read,
      (status) => {
        if (status !== 'pending') finish(status)
      },
      { flush: 'sync' },
    )
    signal.addEventListener('abort', abort, { once: true })
  })
}
