import assert from 'node:assert/strict'
import { createApp, type App } from 'vue'

import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type { AccessHost, AccessHostChange } from '../../apps/web/src/app/access/access-contract'

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

    read.dispose()
    assert.equal(read.read().status, 'disposed')
  } finally {
    dispose()
  }
  assert.equal(unsubscribed, true)
}
