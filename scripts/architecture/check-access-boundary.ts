import assert from 'node:assert/strict'
import { createApp, type App } from 'vue'

import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type {
  AccessHost,
  AccessHostChange,
  AccessWindowHint,
} from '../../apps/web/src/app/access/access-contract'
import { observeNativeRequirement } from '../../apps/web/src/app/access/native-requirement'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function createProbeApplication(): App {
  return createApp({})
}

export async function verifyAccessBoundary(): Promise<void> {
  const readField = {
    kind: 'field',
    domain: 'projects',
    resource: 'task',
    recordId: 'task-one',
    fieldPath: 'title',
    action: 'read',
  } as const

  const ignoreInvalidation = () => undefined
  const publicApp = createProbeApplication()
  const disposePublic = installAccessBoundary(publicApp)
  const publicAccess = publicApp.runWithContext(useAccessBoundary)
  assert.equal(publicAccess.readContext().status, 'unconfigured')
  assert.equal(
    publicAccess.observe(readField, ignoreInvalidation).read().status,
    'configuration-error',
  )
  disposePublic()

  const initial = deferred<Awaited<ReturnType<AccessHost['resolveContext']>>>()
  const returnedScope = [{ kind: 'organization', id: 'organization-a' }]
  const olderScope = deferred<Awaited<ReturnType<AccessHost['resolveContext']>>>()
  const newerScope = deferred<Awaited<ReturnType<AccessHost['resolveContext']>>>()
  const lateDecision = deferred<{ status: 'allow' }>()
  let result: ReturnType<AccessHost['decisions'][number]['evaluate']> = { status: 'allow' }
  let failEvaluation = false
  let notify!: (change: AccessHostChange) => Promise<void>
  let unsubscribed = false
  let calls = 0
  const app = createProbeApplication()
  const dispose = installAccessBoundary(app, {
    resolveContext(change) {
      if (change.kind === 'identity') return initial.promise
      const target = change.candidate?.[0]?.id
      if (target === 'organization-b') return olderScope.promise
      if (target === 'organization-c') return newerScope.promise
      if (target === 'organization-d')
        return { identity: { kind: 'known', principalId: 'person' }, scope: change.candidate ?? [] }
      return { identity: { kind: 'known', principalId: 'person' }, scope: returnedScope }
    },
    decisions: [
      {
        domain: 'projects',
        targets: ['field'],
        evaluate(binding) {
          calls++
          assert.ok(Object.isFrozen(binding) && Object.isFrozen(binding.request))
          assert.ok(Object.isFrozen(binding.context) && Object.isFrozen(binding.context.identity))
          assert.ok(Object.isFrozen(binding.context.scope))
          if (failEvaluation) throw new Error('Unpublishable service detail')
          return result
        },
      },
      {
        domain: 'reports',
        targets: ['field'],
        evaluate: () => ({ status: 'allow' }),
      },
    ],
    subscribe(listener) {
      notify = listener
      return () => {
        unsubscribed = true
      }
    },
  })

  try {
    const access = app.runWithContext(useAccessBoundary)
    // A single editor owns confirmed display, a separate draft and a dispatch permit.
    let confirmed: string | undefined = 'Saved title'
    let draft: string | undefined = 'Unsaved title'
    const read = access.observe(readField, () => {
      confirmed = undefined
    })
    const write = access.observe({ ...readField, action: 'update' }, () => {
      draft = undefined
    })
    const unrelated = access.observe({ ...readField, recordId: 'task-two' }, ignoreInvalidation)
    const report = access.observe({ ...readField, domain: 'reports' }, ignoreInvalidation)

    assert.equal(read.read().status, 'initializing')
    await read.evaluate()
    assert.equal(calls, 0)
    initial.resolve({ identity: { kind: 'anonymous' }, scope: returnedScope, revision: 'r9' })
    await initial.promise
    const anonymous = access.readContext()
    assert.equal(anonymous.status, 'ready')
    assert.equal(anonymous.snapshot.identity.kind, 'anonymous')
    const sourceScope = returnedScope[0]
    assert.ok(sourceScope)
    const originalId = sourceScope.id
    sourceScope.id = 'mutated-by-host'
    assert.equal(anonymous.snapshot.scope[0]?.id, originalId)
    assert.ok(Object.isFrozen(anonymous.snapshot.scope[0]))
    sourceScope.id = originalId

    const unmapped = access.observe({ ...readField, domain: 'unmapped' }, ignoreInvalidation)
    const unsupported = access.observe(
      {
        kind: 'record',
        domain: 'projects',
        resource: 'task',
        recordId: 'task-one',
        action: 'read',
      },
      ignoreInvalidation,
    )
    await Promise.all([unmapped.evaluate(), unsupported.evaluate(), report.evaluate()])
    assert.equal(unmapped.read().status, 'configuration-error')
    assert.equal(unsupported.read().status, 'configuration-error')
    assert.equal(calls, 0)

    result = { status: 'deny', revision: 'z' }
    await read.evaluate()
    assert.equal(read.read().status, 'deny')
    assert.equal(read.permit(), undefined)
    result = { status: 'indeterminate' }
    await read.evaluate()
    assert.equal(read.read().status, 'indeterminate')
    failEvaluation = true
    await read.evaluate()
    assert.deepEqual(read.read(), { status: 'evaluation-failed' })
    failEvaluation = false
    result = { status: 'allow', revision: 'a', expiresAt: 1 }
    await read.evaluate()
    assert.equal(read.read().status, 'expired')
    assert.equal(read.permit(), undefined)
    result = Promise.resolve({ status: 'allow', revision: 'a' })
    await Promise.all([read.evaluate(), write.evaluate(), unrelated.evaluate()])
    const readPermit = read.permit()
    const writePermit = write.permit()
    const unrelatedPermit = unrelated.permit()
    const reportPermit = report.permit()
    assert.ok(readPermit && writePermit && unrelatedPermit && reportPermit)

    const { domain, resource, recordId, fieldPath } = readField
    const revokeWrite = notify({
      kind: 'field',
      domain,
      resource,
      recordId,
      fieldPath,
      action: 'update',
    })
    assert.equal(writePermit.isCurrent(), false)
    assert.equal(write.permit(), undefined)
    assert.equal(draft, undefined)
    assert.equal(readPermit.isCurrent(), true)
    assert.equal(confirmed, 'Saved title')
    await revokeWrite

    await notify({ kind: 'record', domain, resource, recordId })
    assert.equal(confirmed, undefined)
    assert.equal(readPermit.isCurrent(), false)
    assert.equal(unrelatedPermit.isCurrent(), true)
    await notify({ kind: 'domain', domain })
    assert.equal(unrelatedPermit.isCurrent(), false)
    assert.equal(reportPermit.isCurrent(), true)

    result = lateDecision.promise
    const pending = read.evaluate()
    assert.equal(read.read().status, 'pending')
    const first = notify({
      kind: 'scope',
      candidate: [{ kind: 'organization', id: 'organization-b' }],
    })
    assert.deepEqual(access.readContext(), { status: 'transitioning' })
    assert.equal(reportPermit.isCurrent(), false)
    const second = notify({
      kind: 'scope',
      candidate: [{ kind: 'organization', id: 'organization-c' }],
    })
    newerScope.resolve({ identity: { kind: 'known', principalId: 'person' }, scope: returnedScope })
    await second
    assert.equal(access.readContext().status, 'identity-failed')
    olderScope.resolve({
      identity: { kind: 'known', principalId: 'person' },
      scope: [{ kind: 'organization', id: 'organization-b' }],
    })
    lateDecision.resolve({ status: 'allow' })
    await Promise.all([first, pending])
    assert.equal(access.readContext().status, 'identity-failed')
    assert.equal(read.permit(), undefined)

    await notify({ kind: 'scope' })
    assert.equal(access.readContext().status, 'ready')
    assert.equal(read.read().status, 'stale')
    result = { status: 'allow' }
    await read.evaluate()
    const confirmedPermit = read.permit()
    assert.ok(
      confirmedPermit &&
        confirmedPermit.binding.contextGeneration > readPermit.binding.contextGeneration,
    )
    const identityChange = notify({ kind: 'identity' })
    assert.equal(confirmedPermit.isCurrent(), false)
    await identityChange
    assert.equal(read.read().status, 'stale')

    await notify({ kind: 'scope', candidate: [{ kind: 'organization', id: 'organization-d' }] })
    const switched = access.readContext()
    assert.equal(switched.status, 'ready')
    assert.equal(switched.snapshot.scope[0]?.id, 'organization-d')
    assert.equal(read.permit(), undefined)

    const returning = deferred<{ status: 'allow' }>()
    result = returning.promise
    const beforeReturn = read.evaluate()
    await notify({ kind: 'scope' })
    await notify({ kind: 'scope', candidate: [{ kind: 'organization', id: 'organization-d' }] })
    const returned = access.readContext()
    assert.equal(returned.status, 'ready')
    assert.deepEqual(returned.snapshot.scope, switched.snapshot.scope)
    assert.notEqual(returned.snapshot, switched.snapshot)
    returning.resolve({ status: 'allow' })
    await beforeReturn
    assert.equal(read.permit(), undefined)

    const broken = observeNativeRequirement(
      access,
      {
        operator: 'any',
        scope: { kind: 'global' },
        requests: [readField, { ...readField, recordId: 'task-two' }],
      },
      () => {
        throw new Error('Owner failed to clear derived state.')
      },
    )
    let survivorCleared = 0
    const survivor = access.observe(readField, () => {
      survivorCleared++
    })
    await Promise.all([broken.evaluate(), survivor.evaluate()])
    const survivorPermit = survivor.permit()
    assert.ok(survivorPermit)
    await notify({ kind: 'record', domain, resource, recordId })
    assert.equal(survivorCleared, 1)
    assert.equal(survivorPermit.isCurrent(), false)
    await broken.evaluate()
    assert.equal(broken.permit(), undefined)
    assert.deepEqual(broken.read(), {
      status: 'evaluation-failed',
      reasonCode: 'access.cleanup-failed',
    })
    await notify({ kind: 'record', domain, resource, recordId })
    assert.equal(survivorCleared, 2)
    broken.dispose()
    survivor.dispose()

    read.dispose()
    assert.equal(read.read().status, 'disposed')
  } finally {
    dispose()
  }
  assert.equal(unsubscribed, true)
  await verifyExpiryAndDisposal()
  await verifyWindowHints()
}

async function verifyWindowHints(): Promise<void> {
  const listeners = new Set<(hint: unknown) => void>()
  const sent: AccessWindowHint[] = []
  let signedOut = false
  function createWindow(organization: string, session: string) {
    const app = createProbeApplication()
    let scope = [{ kind: 'organization', id: organization }]
    let notify!: (change: AccessHostChange) => Promise<void>
    let confirmations = 0
    const stop = installAccessBoundary(app, {
      resolveContext(change) {
        confirmations++
        if (change.kind === 'scope' && change.candidate !== undefined) scope = [...change.candidate]
        return {
          identity:
            signedOut && session === 'shared'
              ? { kind: 'anonymous' }
              : { kind: 'known', principalId: session },
          scope,
        }
      },
      decisions: [],
      subscribe(listener) {
        notify = listener
        return () => undefined
      },
      windowInvalidation: {
        application: 'window-fixture',
        audience: (context) => (context.identity.kind === 'known' ? session : undefined),
        send(message) {
          sent.push(message)
          for (const receive of listeners) {
            receive(message)
            receive(message)
          }
        },
        subscribe(receive) {
          listeners.add(receive)
          return () => {
            listeners.delete(receive)
          }
        },
      },
    })
    return {
      access: app.runWithContext(useAccessBoundary),
      stop,
      confirmCount: () => confirmations,
      change: (change: AccessHostChange) => notify(change),
    }
  }
  const first = createWindow('first', 'shared')
  const second = createWindow('second', 'shared')
  const unrelated = createWindow('third', 'other')
  try {
    await Promise.resolve()
    await first.change({ kind: 'scope', candidate: [{ kind: 'organization', id: 'updated' }] })
    assert.equal(sent.length, 0)
    const secondBefore = second.access.readContext()
    assert.equal(secondBefore.status, 'ready')
    assert.equal(secondBefore.snapshot.scope[0]?.id, 'second')
    assert.equal(second.confirmCount(), 1)
    for (const receive of listeners) {
      const identityHint = { id: crypto.randomUUID(), audience: 'shared' }
      receive({ ...identityHint, application: 'other-application' })
      receive({
        ...identityHint,
        application: 'window-fixture',
        scope: [{ kind: 'organization', id: 'forged' }],
      })
    }
    assert.equal(second.confirmCount(), 1)
    signedOut = true
    await first.change({ kind: 'identity', notifyWindows: true })
    assert.equal(sent.length, 1)
    assert.equal(first.confirmCount(), 3)
    assert.equal(second.confirmCount(), 2)
    assert.equal(unrelated.confirmCount(), 1)
    const secondAfter = second.access.readContext()
    assert.equal(secondAfter.status, 'ready')
    assert.equal(secondAfter.snapshot.identity.kind, 'anonymous')
    assert.equal(secondAfter.snapshot.scope[0]?.id, 'second')
  } finally {
    first.stop()
    second.stop()
    unrelated.stop()
  }
  assert.equal(listeners.size, 0)
}

async function verifyExpiryAndDisposal(): Promise<void> {
  const app = createProbeApplication()
  let cleared = false
  let detached = false
  const expired = deferred<true>()
  const stop = installAccessBoundary(app, {
    resolveContext: () => ({
      identity: { kind: 'known', principalId: 'fixture-expiry' },
      scope: [],
      expiresAt: Date.now() + 30,
    }),
    decisions: [
      {
        domain: 'expiry',
        targets: ['type'],
        evaluate: () => ({ status: 'allow' }),
        subscribe: () => () => {
          throw new Error('Provider unsubscribe failed.')
        },
      },
    ],
    subscribe: () => () => {
      detached = true
    },
  })
  const access = app.runWithContext(useAccessBoundary)
  await Promise.resolve()
  const view = access.observe(
    { kind: 'type', domain: 'expiry', resource: 'report', action: 'view' },
    () => {
      if (!cleared) {
        cleared = true
        expired.resolve(true)
      }
    },
  )
  await view.evaluate()
  const permit = view.permit()
  assert.ok(permit)
  await expired.promise
  assert.equal(access.readContext().status, 'expired')
  assert.equal(permit.isCurrent(), false)
  assert.throws(stop, AggregateError)
  assert.equal(detached, true)
  assert.equal(view.read().status, 'disposed')
  stop()
}
