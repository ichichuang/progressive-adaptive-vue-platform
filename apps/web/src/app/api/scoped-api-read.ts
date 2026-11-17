import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'

import type { ApiClient, ApiEndpoint, ApiRequestParameters } from '../../shared/api'
import { createApiAttempt } from '../../shared/api/cancellation'
import { snapshotApiParameters } from '../../shared/api/request'
import type { AccessBoundary, BoundAccessRequest } from '../access/access-contract'
import {
  observeNativeRequirement,
  type NativeAccessRequirement,
} from '../access/native-requirement'

type ReadQuery = NonNullable<ApiRequestParameters['query']>

function isScopedEndpoint(endpoint: ApiEndpoint<unknown>): boolean {
  return (
    endpoint.authentication === 'provided' &&
    (endpoint.method === 'GET' || endpoint.method === 'POST') &&
    endpoint.response.mode === 'json'
  )
}

type ScopedReadPlan<Value> =
  | { readonly status: 'empty' | 'unresolved' | 'unsupported' }
  | {
      readonly status: 'ready'
      readonly endpoint: ApiEndpoint<Value> & {
        readonly method: 'GET' | 'POST'
        readonly authentication: 'provided'
        readonly response: { readonly mode: 'json' }
      }
      readonly input: ApiRequestParameters
    }

interface ScopedReadDefinition<Value> {
  readonly client: Pick<ApiClient, 'request'>
  readonly requirement: (query: ReadQuery) => NativeAccessRequirement
  /** The host owns the restriction and the returned projection, including totals and summaries. */
  plan(
    input: {
      readonly requestId: string
      readonly context: BoundAccessRequest['context']
      readonly query: ReadQuery
    },
    signal: AbortSignal,
  ): ScopedReadPlan<Value> | Promise<ScopedReadPlan<Value>>
  readonly clearDerived?: () => undefined
}

type ReadOutcome =
  | 'ready'
  | 'empty'
  | 'denied'
  | 'unresolved'
  | 'unsupported'
  | 'configuration-error'
  | 'failed'
  | 'stale'

type ReadState<Value> =
  | { readonly status: 'idle' }
  | {
      readonly status: Exclude<ReadOutcome, 'ready' | 'stale'> | 'pending' | 'consumed'
      readonly requestId: string
    }
  | { readonly status: 'ready'; readonly requestId: string; readonly data: Value }

/** One explicit read owner. Results have no anonymous cache key or persistent representation. */
export function createScopedApiRead<Value>(
  access: AccessBoundary,
  definition: ScopedReadDefinition<Value>,
) {
  const state = shallowRef<ReadState<Value>>({ status: 'idle' })
  let active: { release(): void; isCurrent(): boolean } | undefined
  let disposed = false
  let generation = 0

  function releaseActive(): void {
    const previous = active
    active = undefined
    previous?.release()
    state.value = { status: 'idle' }
    if (previous !== undefined) definition.clearDerived?.()
  }

  function clear(): void {
    generation++
    releaseActive()
  }

  async function run(input: ReadQuery = {}, signal?: AbortSignal): Promise<ReadOutcome> {
    if (disposed) return 'stale'
    const ticket = ++generation
    releaseActive()
    if (ticket !== generation || signal?.aborted === true) return 'stale'
    const requestId = crypto.randomUUID()
    const observed = access.readContext()
    if (observed.status !== 'ready') {
      const status = observed.status === 'unconfigured' ? 'configuration-error' : 'unresolved'
      state.value = { status, requestId }
      return status
    }
    const query = Object.freeze(
      Object.fromEntries(
        Object.entries(snapshotApiParameters({ query: input }).query ?? {}).map(([key, value]) => [
          key,
          typeof value === 'object' ? Object.freeze(value) : value,
        ]),
      ),
    )
    const context = observed.snapshot
    const cancellation = new AbortController()
    let expiry: ReturnType<typeof setTimeout> | undefined
    const check = observeNativeRequirement(access, definition.requirement(query), invalidate)
    let permit: ReturnType<typeof check.permit>
    function ownsRead(): boolean {
      const current = access.readContext()
      return (
        ticket === generation &&
        active === owner &&
        !cancellation.signal.aborted &&
        current.status === 'ready' &&
        current.snapshot === context
      )
    }
    function invalidate(): void {
      if (active === owner) clear()
    }
    const owner = {
      isCurrent: () => ownsRead() && permit?.isCurrent() === true,
      release() {
        cancellation.abort()
        check.dispose()
        if (expiry !== undefined) clearTimeout(expiry)
        signal?.removeEventListener('abort', invalidate)
      },
    }
    function settle(status: Exclude<ReadOutcome, 'ready' | 'stale'>): ReadOutcome {
      if (!ownsRead()) {
        invalidate()
        return 'stale'
      }
      active = undefined
      owner.release()
      state.value = { status, requestId }
      return status
    }
    function checkDeadline(deadline: number): void {
      if (!owner.isCurrent()) invalidate()
      else if (Number.isFinite(deadline))
        expiry = setTimeout(
          () => {
            checkDeadline(deadline)
          },
          Math.min(2_147_483_647, Math.max(0, deadline - Date.now())),
        )
    }

    active = owner
    signal?.addEventListener('abort', invalidate, { once: true })
    state.value = { status: 'pending', requestId }
    const attempt = createApiAttempt(cancellation.signal, 30_000)
    try {
      await attempt.run(() => check.evaluate())
      if (!ownsRead()) {
        invalidate()
        return 'stale'
      }
      permit = check.permit()
      if (permit === undefined) {
        const { status } = check.read()
        return settle(
          status === 'deny'
            ? 'denied'
            : status === 'configuration-error'
              ? status
              : status === 'evaluation-failed'
                ? 'failed'
                : 'unresolved',
        )
      }
      const plan = await attempt.run(async () => {
        if (!owner.isCurrent()) return undefined
        return await definition.plan(Object.freeze({ requestId, context, query }), attempt.signal)
      })
      if (!owner.isCurrent()) {
        invalidate()
        return 'stale'
      }
      if (plan === undefined) return settle('configuration-error')
      if (plan.status === 'empty') {
        state.value = { status: 'empty', requestId }
        checkDeadline(Math.min(context.expiresAt ?? Infinity, permit.expiresAt))
        return 'empty'
      }
      if (plan.status !== 'ready') return settle(plan.status)
      if (!isScopedEndpoint(plan.endpoint)) return settle('configuration-error')
      const result = await attempt.run(() =>
        definition.client.request(plan.endpoint, {
          ...plan.input,
          signal: attempt.signal,
          isDispatchCurrent: owner.isCurrent,
        }),
      )
      if (!owner.isCurrent()) {
        invalidate()
        return 'stale'
      }
      if (result.status !== 'success' || result.data === undefined) return settle('failed')
      state.value = { status: 'ready', requestId, data: result.data }
      checkDeadline(Math.min(context.expiresAt ?? Infinity, permit.expiresAt))
      return 'ready'
    } catch {
      if (permit !== undefined && !owner.isCurrent()) {
        invalidate()
        return 'stale'
      }
      return settle('failed')
    } finally {
      attempt.dispose()
    }
  }

  function dispose(): void {
    disposed = true
    clear()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return Object.freeze({
    state: computed(() => {
      const current = state.value
      return (current.status === 'ready' ||
        current.status === 'empty' ||
        current.status === 'consumed') &&
        active?.isCurrent() !== true
        ? ({ status: 'idle' } as const)
        : current
    }),
    isCurrent: (requestId: string) => {
      const published = state.value
      return (
        (published.status === 'ready' ||
          published.status === 'empty' ||
          published.status === 'consumed') &&
        published.requestId === requestId &&
        active?.isCurrent() === true
      )
    },
    /** Transfer the value to its presentation owner while retaining the scoped read receipt. */
    consume(requestId: string): Value | undefined {
      const published = state.value
      if (
        published.status !== 'ready' ||
        published.requestId !== requestId ||
        active?.isCurrent() !== true
      )
        return undefined
      state.value = { status: 'consumed', requestId }
      return published.data
    },
    run,
    clear,
    dispose,
  })
}
