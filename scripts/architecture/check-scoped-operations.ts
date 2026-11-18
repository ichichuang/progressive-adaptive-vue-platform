import assert from 'node:assert/strict'
import { createApp } from 'vue'
import { createRequire } from 'node:module'

import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type { AccessHostChange, AccessRequest } from '../../apps/web/src/app/access/access-contract'
import {
  executeGuardedAction,
  type GuardedAction,
} from '../../apps/web/src/app/access/guarded-action'
import type { NativeAccessRequirement } from '../../apps/web/src/app/access/native-requirement'
import { createScopedApiRead } from '../../apps/web/src/app/api/scoped-api-read'
import {
  createApiClient,
  type ApiClient,
  type ApiEndpoint,
  type ApiResult,
} from '../../apps/web/src/shared/api'

const domain = 'scoped-operations-test'
const global = { kind: 'global' } as const
const signal = new AbortController().signal
const configuration = { status: 'configured', baseUrl: 'https://example.test/' } as const
interface Projection {
  rows: string[]
  total: number
}
const applicationZod = createRequire(new URL('../../apps/web/package.json', import.meta.url))(
  'zod',
) as {
  custom<Value>(predicate: (value: unknown) => boolean): ApiEndpoint<Value>['response']['schema']
}
const projection = applicationZod.custom<Projection>((value) => {
  if (value === null || typeof value !== 'object') return false
  const rows: unknown = Reflect.get(value, 'rows')
  return (
    Array.isArray(rows) &&
    rows.every((row) => typeof row === 'string') &&
    typeof Reflect.get(value, 'total') === 'number'
  )
})
const readEndpoint = {
  id: 'scoped-projection',
  method: 'GET',
  path: ['projection'],
  policy: 'standard',
  authentication: 'provided',
  response: { mode: 'json', mimeTypes: ['application/json'], schema: projection },
} as const

function latch<Value>() {
  let finish!: (value: Value) => void
  const promise = new Promise<Value>((resolve) => {
    finish = resolve
  })
  return { promise, finish }
}

function requirement(request: AccessRequest): NativeAccessRequirement {
  return { operator: 'all', scope: global, requests: [request] }
}

export async function verifyScopedOperations(): Promise<void> {
  const app = createApp({})
  let notify: ((change: AccessHostChange) => Promise<void>) | undefined
  let team = 'alpha'
  let writeAllowed = true
  let readAllowed = true
  const dispose = installAccessBoundary(app, {
    resolveContext: () => ({
      identity: { kind: 'known', principalId: 'isolated-scoped-principal' },
      scope: [{ kind: 'team', id: team }],
      revision: team + '-opaque',
    }),
    decisions: [
      {
        domain,
        targets: ['record', 'collection'],
        evaluate({ request }) {
          if (request.action === 'read')
            return { status: readAllowed && request.kind === 'collection' ? 'allow' : 'deny' }
          return {
            status:
              writeAllowed && request.kind === 'record' && request.recordId !== 'denied'
                ? 'allow'
                : 'deny',
          }
        },
      },
    ],
    subscribe(listener) {
      notify = listener
      return () => {
        notify = undefined
      }
    },
  })
  try {
    assert.ok(notify)
    const access = app.runWithContext(useAccessBoundary)
    assert.equal(access.readContext().status, 'initializing')
    await Promise.resolve()
    assert.equal(access.readContext().status, 'ready')
    const calls: string[][] = []
    const effects: string[] = []
    const action: GuardedAction<string> = {
      requirement: ({ id }) =>
        requirement({
          domain,
          kind: 'record',
          resource: 'item',
          action: 'remove',
          recordId: id,
        }),
      businessAllows: ({ id }) => id !== 'business',
      isTargetCurrent: ({ revision }) => revision === 'record-revision',
      dispatch(commands) {
        calls.push(commands.map(({ target }) => target.id))
        return Promise.resolve(
          commands
            .map(({ requestId, target, context }) => {
              assert.equal(context.scope[0]?.id, team)
              return {
                requestId,
                targetId: target.id,
                status: 'completed' as const,
                value: target.id,
              }
            })
            .reverse(),
        )
      },
      apply(value, command) {
        assert.equal(command.isCurrent(), true)
        effects.push(value)
      },
    }
    const target = (id: string) => ({ id, revision: 'record-revision' })
    const selected = ['first', 'denied', 'business'].map(target)
    const result = (outcomes: Awaited<ReturnType<typeof executeGuardedAction>>) =>
      outcomes.map(({ status }) => status)
    assert.deepEqual(
      result(await executeGuardedAction(access, action, { targets: selected, signal })),
      ['not-dispatched', 'denied', 'business-blocked'],
    )
    assert.equal(calls.length, 0)
    assert.deepEqual(
      result(
        await executeGuardedAction(access, action, { targets: selected, mode: 'partial', signal }),
      ),
      ['completed', 'denied', 'business-blocked'],
    )
    assert.deepEqual(calls, [['first']])
    assert.deepEqual(effects, ['first'])

    const pair = ['first', 'second'].map(target)
    const group = await executeGuardedAction(access, action, { targets: pair, signal })
    assert.deepEqual(result(group), ['completed', 'completed'])
    assert.notEqual(group[0]?.requestId, group[1]?.requestId)
    assert.deepEqual(calls.at(-1), ['first', 'second'])
    const duplicates = await executeGuardedAction(access, action, {
      targets: [target('first'), target('first')],
      signal,
    })
    assert.deepEqual(result(duplicates), ['invalid-target', 'invalid-target'])
    const mismatchedPermission = await executeGuardedAction(
      access,
      {
        ...action,
        requirement: () => action.requirement(target('first')),
      },
      { targets: [target('denied')], signal },
    )
    assert.deepEqual(result(mismatchedPermission), ['configuration-error'])

    let confirmationCalls = 0
    const deniedAfterConfirm = await executeGuardedAction(access, action, {
      targets: [target('first')],
      signal,
      confirm() {
        confirmationCalls++
        writeAllowed = false
        return Promise.resolve(true)
      },
    })
    assert.equal(confirmationCalls, 1)
    assert.deepEqual(result(deniedAfterConfirm), ['denied'])
    writeAllowed = true
    const modal = latch<boolean>()
    const opened = latch<true>()
    const confirming = executeGuardedAction(access, action, {
      targets: [target('first')],
      signal,
      confirm(permissionSignal) {
        permissionSignal.addEventListener(
          'abort',
          () => {
            modal.finish(false)
          },
          { once: true },
        )
        opened.finish(true)
        return modal.promise
      },
    })
    await opened.promise
    await notify({ kind: 'record', domain, resource: 'item', recordId: 'first', action: 'remove' })
    assert.deepEqual(result(await confirming), ['not-dispatched'])

    const uncorrelated = await executeGuardedAction(
      access,
      {
        ...action,
        dispatch([one, two]) {
          assert.ok(one && two)
          return Promise.resolve([
            {
              requestId: one.requestId,
              targetId: two.target.id,
              status: 'completed',
              value: 'wrong',
            },
            {
              requestId: one.requestId,
              targetId: one.target.id,
              status: 'completed',
              value: 'duplicate',
            },
          ])
        },
      },
      { targets: pair, signal },
    )
    assert.deepEqual(result(uncorrelated), ['unknown', 'unknown'])
    assert.equal(effects.includes('wrong') || effects.includes('duplicate'), false)

    const replay: string[] = []
    const retry = await executeGuardedAction(
      access,
      {
        ...action,
        retryUnknown: true,
        dispatch([command]) {
          assert.ok(command)
          replay.push(command.requestId)
          return Promise.resolve([
            {
              requestId: command.requestId,
              targetId: command.target.id,
              ...(replay.length === 1
                ? ({ status: 'unknown' } as const)
                : ({ status: 'completed', value: 'replayed' } as const)),
            },
          ])
        },
      },
      { targets: [{ ...target('first'), idempotencyKey: 'same-opaque-key' }], signal },
    )
    assert.deepEqual(result(retry), ['completed'])
    assert.equal(replay.length, 2)
    assert.equal(replay[0], replay[1])

    const dispatched = latch<true>()
    const response = latch<true>()
    const partialCalls: string[] = []
    const partial = executeGuardedAction(
      access,
      {
        ...action,
        async dispatch([command]) {
          assert.ok(command)
          partialCalls.push(command.target.id)
          dispatched.finish(true)
          await response.promise
          return [
            {
              requestId: command.requestId,
              targetId: command.target.id,
              status: 'completed',
              value: 'old',
            },
          ]
        },
      },
      { targets: pair, mode: 'partial', signal },
    )
    await dispatched.promise
    team = 'beta'
    await notify({ kind: 'scope' })
    response.finish(true)
    const staleMutation = await partial
    assert.deepEqual(result(staleMutation), ['completed', 'not-dispatched'])
    assert.equal(staleMutation[0]?.applied, false)
    assert.deepEqual(partialCalls, ['first'])
    assert.equal(effects.includes('old'), false)

    const callsToData: URL[] = []
    const client = createApiClient({
      configuration,
      authorize: () => Promise.resolve({ headers: {}, credentials: 'omit' }),
      fetch(url, init) {
        assert.equal(init.cache, 'no-store')
        callsToData.push(url)
        return Promise.resolve(Response.json({ rows: ['scoped'], total: 7 }))
      },
    })
    let scopeStatus: 'ready' | 'empty' | 'unresolved' | 'unsupported' = 'ready'
    let derivedClears = 0
    const reads = createScopedApiRead(access, {
      client,
      requirement: () =>
        requirement({ domain, kind: 'collection', resource: 'item', action: 'read' }),
      plan({ context, query }) {
        return scopeStatus === 'ready'
          ? {
              status: 'ready',
              endpoint: readEndpoint,
              input: { query: { ...query, scope: context.scope[0]?.id } },
            }
          : { status: scopeStatus }
      },
      clearDerived() {
        derivedClears++
      },
    })
    try {
      const query = { sort: ['title'], page: 2 }
      const pending = reads.run(query)
      query.sort[0] = 'changed'
      assert.equal(await pending, 'ready')
      const requestedUrl = callsToData.at(0)
      assert.ok(requestedUrl)
      assert.equal(requestedUrl.searchParams.get('scope'), 'beta')
      assert.equal(requestedUrl.searchParams.get('page'), '2')
      assert.equal(requestedUrl.searchParams.get('sort'), 'title')
      const confirmed = reads.state.value
      assert.equal(confirmed.status, 'ready')
      assert.deepEqual(confirmed.data, { rows: ['scoped'], total: 7 })
      assert.equal(reads.isCurrent(confirmed.requestId), true)
      await notify({ kind: 'domain', domain, action: 'remove' })
      assert.equal(reads.state.value, confirmed)
      assert.equal(derivedClears, 0)
      readAllowed = false
      await notify({ kind: 'domain', domain, action: 'read' })
      assert.equal(reads.state.value.status, 'idle')
      assert.equal(derivedClears, 1)
      assert.equal(reads.isCurrent(confirmed.requestId), false)
      assert.equal(await reads.run(), 'denied')
      readAllowed = true
      for (const status of ['empty', 'unresolved', 'unsupported'] as const) {
        scopeStatus = status
        assert.equal(await reads.run(), status)
      }
      assert.equal(callsToData.length, 1)
    } finally {
      reads.dispose()
    }

    const started = latch<true>()
    const late = latch<ApiResult<Projection>>()
    const plan = () => ({ status: 'ready', endpoint: readEndpoint, input: {} }) as const
    const delayedClient = {
      request() {
        started.finish(true)
        return late.promise
      },
    } as unknown as Pick<ApiClient, 'request'>
    const collection = () =>
      requirement({ domain, kind: 'collection', resource: 'item', action: 'read' })
    const cleanupFailed = createScopedApiRead(access, {
      client,
      requirement: collection,
      plan,
      clearDerived() {
        throw new Error('Derived presentation could not be cleared.')
      },
    })
    assert.equal(await cleanupFailed.run(), 'ready')
    await notify({ kind: 'domain', domain, action: 'read' })
    assert.equal(cleanupFailed.state.value.status, 'failed')
    assert.equal(await cleanupFailed.run(), 'failed')
    cleanupFailed.dispose()
    const delayed = createScopedApiRead(access, {
      client: delayedClient,
      requirement: collection,
      plan,
    })
    try {
      const outdated = delayed.run()
      await started.promise
      await notify({ kind: 'domain', domain, action: 'read' })
      late.finish({
        status: 'success',
        data: { rows: ['old'], total: 1 },
        requestId: 'late',
        httpStatus: 200,
      })
      assert.equal(await outdated, 'stale')
      assert.equal(delayed.state.value.status, 'idle')
    } finally {
      delayed.dispose()
    }

    const direct = createScopedApiRead(access, {
      client,
      plan,
      requirement: () =>
        requirement({ domain, kind: 'record', resource: 'item', recordId: 'one', action: 'read' }),
    })
    assert.equal(await direct.run(), 'denied')
    direct.dispose()

    const authorizationStarted = latch<true>()
    const credentials = latch<true>()
    let valid = true
    let fetches = 0
    const preflight = createApiClient({
      configuration,
      async authorize() {
        authorizationStarted.finish(true)
        await credentials.promise
        return { headers: {}, credentials: 'omit' }
      },
      fetch() {
        fetches++
        return Promise.resolve(Response.json({ rows: [], total: 0 }))
      },
    })
    const request = preflight.request(readEndpoint, { signal, isDispatchCurrent: () => valid })
    await authorizationStarted.promise
    valid = false
    credentials.finish(true)
    const blocked = await request
    assert.equal(blocked.status, 'failure')
    assert.equal(blocked.error.category, 'authorization')
    assert.equal(blocked.error.dispatched, false)
    assert.equal(fetches, 0)
  } finally {
    dispose()
  }
}

if (process.argv[1]?.endsWith('check-scoped-operations.ts')) {
  if (process.argv.includes('--browser')) {
    const { serveScopedOperationsBrowserProbe } =
      await import('../verify/scoped-operations-browser-probe')
    await serveScopedOperationsBrowserProbe()
  } else {
    await verifyScopedOperations()
    console.log('Guarded actions, correlated batches, scoped reads and transport dispatch: passed.')
  }
}
