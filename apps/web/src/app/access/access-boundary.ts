import { inject, shallowRef, type App, type InjectionKey } from 'vue'

import {
  accessContextSchema,
  accessDecisionSchema,
  accessInvalidationSchema,
  accessRequestSchema,
  accessScopeSchema,
  type AccessBoundary,
  type AccessContextChange,
  type AccessContextState,
  type AccessHost,
  type AccessHostChange,
  type AccessInvalidation,
  type AccessRequest,
  type AccessState,
  type BoundAccessRequest,
} from './access-contract'

const accessKey: InjectionKey<AccessBoundary> = Symbol('access-boundary')

function state<const Status extends string>(status: Status): { readonly status: Status } {
  return Object.freeze({ status })
}

function affects(change: AccessInvalidation, request: AccessRequest): boolean {
  if (change.kind === 'identity' || change.kind === 'scope') return true
  if (
    change.domain !== request.domain ||
    (change.action !== undefined && change.action !== request.action)
  )
    return false
  if (change.kind === 'domain') return true
  if (request.kind !== 'record' && request.kind !== 'field') return false
  if (change.resource !== request.resource || change.recordId !== request.recordId) return false
  return (
    change.kind === 'record' || (request.kind === 'field' && change.fieldPath === request.fieldPath)
  )
}

/** One owner per bootstrap attempt. The host still enforces access on the service. */
export function installAccessBoundary(application: App, host?: AccessHost): () => void {
  const configuredHost = typeof host?.resolveContext === 'function' ? host : undefined
  const context = shallowRef<AccessContextState>(
    state(configuredHost === undefined ? 'unconfigured' : 'initializing'),
  )
  const providers = new Map<
    string,
    {
      readonly targets: ReadonlySet<AccessRequest['kind']>
      readonly evaluate: AccessHost['decisions'][number]['evaluate']
    } | null
  >()
  const selections: AccessHost['decisions'] =
    configuredHost !== undefined && Array.isArray(configuredHost.decisions)
      ? configuredHost.decisions
      : []
  for (const provider of selections) {
    if (typeof provider.domain !== 'string' || provider.domain.length === 0) continue
    providers.set(
      provider.domain,
      providers.has(provider.domain) ||
        typeof provider.evaluate !== 'function' ||
        !Array.isArray(provider.targets)
        ? null
        : { targets: new Set(provider.targets), evaluate: provider.evaluate.bind(provider) },
    )
  }

  const consumers = new Set<{
    readonly request: AccessRequest
    advance(): void
    notify(change: AccessInvalidation): void
  }>()
  let disposed = false
  let contextGeneration = 0
  let requestId = 0

  function readContext(): AccessContextState {
    const current = context.value
    if (current.status === 'ready' && (current.snapshot.expiresAt ?? Infinity) <= Date.now())
      return state('expired')
    return current
  }

  function invalidate(change: AccessInvalidation, next?: AccessContextState): void {
    const affected = [...consumers].filter(({ request }) => affects(change, request))
    // Retire every affected generation before Vue watchers or owner callbacks can run.
    for (const consumer of affected) consumer.advance()
    if (next !== undefined) context.value = next
    for (const consumer of affected) consumer.notify(change)
  }

  async function replaceContext(change: AccessContextChange, initial = false): Promise<void> {
    if (configuredHost === undefined || disposed) return
    const generation = ++contextGeneration
    const current = () => !disposed && generation === contextGeneration
    invalidate(
      Object.freeze({ kind: change.kind }),
      state(initial ? 'initializing' : 'transitioning'),
    )
    if (!current()) return

    try {
      const candidate =
        change.kind === 'scope' && change.candidate !== undefined
          ? accessScopeSchema.parse(change.candidate)
          : undefined
      const request = Object.freeze(
        candidate === undefined ? { kind: change.kind } : { kind: 'scope' as const, candidate },
      )
      const result = await configuredHost.resolveContext(request)
      if (!current()) return
      const snapshot = accessContextSchema.parse(result)
      if (
        candidate !== undefined &&
        (candidate.length !== snapshot.scope.length ||
          candidate.some(({ kind, id }, index) => {
            const confirmed = snapshot.scope[index]
            return confirmed?.kind !== kind || confirmed.id !== id
          }))
      ) {
        throw new TypeError('The host did not confirm the requested access scope.')
      }
      if (current()) context.value = Object.freeze({ status: 'ready', snapshot })
    } catch {
      if (current()) context.value = state('identity-failed')
    }
  }

  async function onHostChange(change: AccessHostChange): Promise<void> {
    if (disposed) return
    if (change.kind === 'identity' || change.kind === 'scope') {
      await replaceContext(change)
    } else {
      invalidate(accessInvalidationSchema.parse(change))
    }
  }

  const boundary: AccessBoundary = {
    readContext,
    observe(input, onInvalidated) {
      const parsed = accessRequestSchema.safeParse(input)
      const request = parsed.data
      const provider = request === undefined ? undefined : providers.get(request.domain)
      if (request === undefined || !provider?.targets.has(request.kind)) {
        return Object.freeze({
          read: () => state(disposed ? 'disposed' : 'configuration-error'),
          evaluate: () => Promise.resolve(),
          permit: () => undefined,
          dispose: () => undefined,
        })
      }

      let closed = disposed
      let generation = 0
      const evaluation = shallowRef<{
        readonly generation: number
        readonly binding: BoundAccessRequest
        readonly result: AccessState
      }>()

      const owner = {
        request,
        advance() {
          generation++
        },
        notify(change: AccessInvalidation) {
          if (closed) return
          if (evaluation.value?.generation !== generation) evaluation.value = undefined
          try {
            onInvalidated(change)
          } catch {
            // One consumer cannot keep other owners from clearing invalidated state.
          }
        },
      }
      if (!closed) consumers.add(owner)

      function read(): AccessState {
        if (closed || disposed) return state('disposed')
        const active = readContext()
        if (active.status === 'unconfigured') return state('configuration-error')
        if (active.status !== 'ready') return state(active.status)
        const current = evaluation.value
        if (current?.generation !== generation) return state('stale')
        const result = current.result
        if ('expiresAt' in result && (result.expiresAt ?? Infinity) <= Date.now())
          return state('expired')
        return result
      }

      return Object.freeze({
        read,
        async evaluate() {
          const active = readContext()
          if (active.status !== 'ready' || closed || disposed) return
          const pending = {
            generation,
            binding: Object.freeze({
              id: ++requestId,
              context: active.snapshot,
              contextGeneration,
              request,
            }),
            result: state('pending'),
          }
          const current = () =>
            !disposed &&
            !closed &&
            evaluation.value === pending &&
            pending.generation === generation &&
            pending.binding.contextGeneration === contextGeneration &&
            readContext().status === 'ready'
          evaluation.value = pending
          if (!current()) return
          try {
            const answer = await provider.evaluate(pending.binding)
            if (!current()) return
            const result = accessDecisionSchema.parse(answer)
            if (current()) evaluation.value = { ...pending, result }
          } catch {
            if (current()) evaluation.value = { ...pending, result: state('evaluation-failed') }
          }
        },
        permit() {
          const current = evaluation.value
          if (current === undefined || read().status !== 'allow') return undefined
          return Object.freeze({
            binding: current.binding,
            isCurrent: () => evaluation.value === current && read().status === 'allow',
          })
        },
        dispose() {
          closed = true
          generation++
          evaluation.value = undefined
          consumers.delete(owner)
        },
      })
    },
  }
  application.provide(accessKey, Object.freeze(boundary))
  let unsubscribe: (() => void) | undefined

  if (configuredHost !== undefined) {
    void replaceContext({ kind: 'identity' }, true)
    try {
      unsubscribe = configuredHost.subscribe?.(onHostChange)
    } catch {
      contextGeneration++
      invalidate(Object.freeze({ kind: 'identity' }), state('identity-failed'))
    }
  }

  return () => {
    if (disposed) return
    disposed = true
    contextGeneration++
    invalidate(Object.freeze({ kind: 'identity' }), state('disposed'))
    consumers.clear()
    unsubscribe?.()
  }
}

export function useAccessBoundary(): AccessBoundary {
  const access = inject(accessKey)
  if (access === undefined) throw new Error('The application access boundary is unavailable.')
  return access
}
