import assert from 'node:assert/strict'
import { createApp } from 'vue'
import type { AccessHost } from '../../apps/web/src/app/access/access-contract'
import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import {
  executeGuardedAction,
  observeActionTarget,
  type ActionTarget,
  type GuardedAction,
} from '../../apps/web/src/app/access/guarded-action'
import { observeNativeRequirement } from '../../apps/web/src/app/access/native-requirement'
import { executeDelegationChange } from '../../apps/web/src/app/access/delegation-interaction'
import { parseShareView, sharingProposal } from '../../apps/web/src/app/access/resource-sharing'
import { createBusinessAccessScenario } from '../verify/business-access-scenario'

function accessApp(host?: AccessHost) {
  const app = createApp({})
  const dispose = installAccessBoundary(app, host)
  return { access: app.runWithContext(useAccessBoundary), dispose }
}

function deferred() {
  let resolve = (): void => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export async function verifyBusinessAccess(): Promise<void> {
  const { access: publicAccess, dispose: disposePublic } = accessApp()
  assert.equal(publicAccess.readContext().status, 'unconfigured')
  assert.equal(publicAccess.availabilitySource?.('unselected'), undefined)
  disposePublic()

  let timestamp = Date.now()
  const scenario = createBusinessAccessScenario(() => timestamp)
  const { access, dispose } = accessApp(scenario.host)
  const signal = new AbortController().signal
  await Promise.resolve()
  const execute = async (
    action: GuardedAction<unknown>,
    target: ActionTarget = scenario.target,
    abort = signal,
  ) => (await executeGuardedAction(access, action, { targets: [target], signal: abort }))[0]
  const { state, target } = scenario

  try {
    const action = scenario.exportAction()
    for (const [key, unavailable, healthy, expected] of [
      ['feature', false, true, 'feature'],
      ['entitlement', false, true, 'entitlement'],
      ['quota', 0, 2, 'quota'],
      ['exportReady', false, true, 'workflow'],
    ] as const) {
      Object.assign(state, { [key]: unavailable })
      const result = await execute(action)
      assert.equal(result?.status, 'business-blocked')
      assert.equal(result.reason?.kind, expected)
      assert.equal(state.exports, 0)
      Object.assign(state, { [key]: healthy })
    }
    state.featureFallback = true
    assert.equal((await execute(action))?.status, 'failed')
    state.featureFallback = false
    state.assumeDenied = true
    const count = state.evaluations
    const denied = await execute(action)
    assert.equal(denied?.status, 'denied')
    assert.equal(denied.reason, undefined)
    assert.equal(state.evaluations, count)
    state.assumeDenied = false
    const wrongSource: GuardedAction<unknown> = {
      ...action,
      availability: {
        operation: 'export',
        constraints: (target) =>
          action.availability
            ?.constraints(target)
            .map((value) => ({ ...value, source: 'absent' })) ?? [],
      },
    }
    assert.equal((await execute(wrongSource))?.status, 'configuration-error')
    const display = observeActionTarget(access, action, target, () => undefined)
    await display.evaluate()
    assert.equal(display.assessment().primary, undefined)
    const unrelated = observeNativeRequirement(
      access,
      scenario.requirement('read'),
      () => undefined,
    )
    await unrelated.evaluate()
    const read = unrelated.permit()
    state.feature = false
    scenario.updated('export-feature')
    assert.equal(display.assessment().primary?.status, 'stale')
    assert.equal(read?.isCurrent(), true)
    display.dispose()
    unrelated.dispose()

    await scenario.reset()
    state.quota = 1
    const barrier = deferred()
    let requests = 0
    scenario.setExportBarrier(async () => {
      if (++requests === 2) barrier.resolve()
      await barrier.promise
    })
    const concurrent = await Promise.all([
      execute(action, { ...target, idempotencyKey: 'independent-one' }),
      execute(action, { ...target, idempotencyKey: 'independent-two' }),
    ])
    assert.deepEqual(concurrent.map((item) => item?.status).sort(), ['completed', 'failed'])
    assert.equal(state.quota, 0)
    assert.equal(state.exports, 1)
    assert.notEqual(concurrent[0]?.requestId, concurrent[1]?.requestId)

    await scenario.reset()
    const workflow = (operation: Parameters<typeof scenario.transition>[0]) =>
      execute(scenario.transition(operation), { ...target, revision: String(state.revision) })
    assert.equal((await workflow('submit'))?.status, 'completed')
    assert.equal((await workflow('approve'))?.status, 'business-blocked')
    assert.equal(
      await executeDelegationChange(access, { action: scenario.enter, target }, 'enter', signal),
      'completed',
    )
    assert.equal(
      await executeDelegationChange(access, { action: scenario.enter, target }, 'enter', signal),
      'unsupported',
    )
    assert.equal((await workflow('approve'))?.status, 'business-blocked')
    assert.equal(
      await executeDelegationChange(access, { action: scenario.exit, target }, 'exit', signal),
      'completed',
    )
    assert.equal((await workflow('withdraw'))?.status, 'completed')
    assert.equal((await workflow('submit'))?.status, 'completed')
    await scenario.select('marin')
    assert.equal((await workflow('approve'))?.status, 'completed')
    assert.equal(state.taskState, 'first-review')
    assert.equal((await workflow('approve'))?.status, 'business-blocked')
    await scenario.select('alex')
    assert.equal((await workflow('approve'))?.status, 'completed')
    assert.equal(state.taskState, 'approved')
    await scenario.reset()
    await workflow('submit')
    await scenario.select('marin')
    await workflow('reject')
    assert.equal(state.taskState, 'rejected')

    for (const change of ['enter', 'exit'] as const) {
      await scenario.reset()
      if (change === 'exit')
        assert.equal(
          await executeDelegationChange(
            access,
            { action: scenario.enter, target },
            'enter',
            signal,
          ),
          'completed',
        )
      const dispatch = deferred()
      const response = deferred()
      const action: GuardedAction<unknown> = {
        ...(change === 'enter' ? scenario.enter : scenario.exit),
        async dispatch(commands) {
          dispatch.resolve()
          await response.promise
          return commands.map(({ requestId, target }) => ({
            requestId,
            targetId: target.id,
            status: 'completed',
            value: null,
          }))
        },
      }
      const run = executeDelegationChange(access, { action, target }, change, signal)
      await dispatch.promise
      await scenario.select('alex')
      response.resolve()
      assert.equal(await run, 'unavailable')
      const settled = access.readContext()
      assert.equal(settled.status, 'ready')
      assert.deepEqual(settled.snapshot.identity, { kind: 'known', principalId: 'alex' })
      assert.equal(settled.snapshot.delegation, undefined)
    }

    await scenario.reset()
    const relation = observeNativeRequirement(access, scenario.shareRead, () => undefined)
    await relation.evaluate()
    assert.equal(relation.read().status, 'deny')
    const requestCommands = scenario.accessRequest.commands
    assert.ok(requestCommands?.request && requestCommands.approve)
    assert.equal(
      (await execute(requestCommands.request, { ...target, revision: String(state.revision) }))
        ?.status,
      'completed',
    )
    assert.equal(
      (await execute(requestCommands.approve, { ...target, revision: String(state.revision) }))
        ?.status,
      'denied',
    )
    await scenario.select('marin')
    assert.equal(
      (await execute(requestCommands.approve, { ...target, revision: String(state.revision) }))
        ?.status,
      'completed',
    )
    assert.equal(state.accessRequest, 'approved')
    await scenario.select('casey')
    await relation.evaluate()
    assert.equal(relation.read().status, 'deny')
    await scenario.changeAccessRequest('effective')
    await relation.evaluate()
    assert.equal(relation.read().status, 'allow')
    await scenario.changeAccessRequest('revoked')
    await relation.evaluate()
    assert.equal(relation.read().status, 'deny')
    const mode = {
      mode: 'selected-members',
      scope: 'summary',
      recipients: ['outsider'],
      expiresAt: null,
    } as const
    assert.equal(sharingProposal(scenario.sharing, mode), undefined)
    const unsafe = {
      status: 'effective',
      revision: 'test',
      destination: { kind: 'host', url: 'https://unsafe.example/share/opaque' },
    }
    assert.equal(parseShareView(unsafe, scenario.sharing), undefined)
    assert.ok(
      parseShareView(unsafe, {
        ...scenario.sharing,
        destinationPolicy: {
          origins: ['https://unsafe.example'],
          permits: (url) => url.pathname.startsWith('/share/'),
        },
      }),
    )
    state.shareExpiry = timestamp + 30_000
    await scenario.changeSharing('effective')
    await relation.evaluate()
    assert.equal(relation.read().status, 'allow')
    timestamp += 31_000
    await relation.evaluate()
    assert.equal(relation.read().status, 'deny')
    await scenario.changeSharing('revoked')
    assert.equal(relation.permit(), undefined)
    relation.dispose()

    for (const change of [
      'none',
      'proposal',
      'scope',
      'cancelled',
      'expired',
      'reconfirmed',
      'failed-context',
    ] as const) {
      await scenario.reset()
      const begun = deferred()
      const pending = deferred()
      let challenges = 0
      let draft = 'confirmed-proposal'
      const base = scenario.exportAction(async (intent) => {
        ++challenges
        begun.resolve()
        await pending.promise
        if (change === 'cancelled') return { status: 'cancelled' }
        return {
          status: 'verified',
          intent,
          expiresAt: change === 'expired' ? Date.now() - 1 : timestamp + 30_000,
          ...(change === 'reconfirmed' || change === 'failed-context'
            ? { refreshContext: true }
            : {}),
        }
      })
      const action = {
        ...base,
        isTargetCurrent: (target: ActionTarget) => target.proposal?.revision === draft,
      }
      const result = execute(
        action,
        { ...target, proposal: { revision: draft, values: { format: 'pdf' } } },
        signal,
      )
      await begun.promise
      if (change === 'proposal') draft = 'replacement-proposal'
      if (change === 'scope')
        await scenario.select('casey', [{ kind: 'organization', id: 'different' }])
      if (change === 'reconfirmed') scenario.updateContextRevision()
      if (change === 'failed-context') scenario.setContextFailure(true)
      pending.resolve()
      const expected = change === 'none' || change === 'reconfirmed'
      assert.equal((await result)?.status, expected ? 'completed' : 'not-dispatched', change)
      assert.equal(state.exports, expected ? 1 : 0, change)
      assert.equal(challenges, 1, change)
      scenario.setContextFailure(false)
    }
  } finally {
    dispose()
  }
  console.log(
    'Business availability: independent constraints, quota contention, delegation, captured assurance, workflow and temporary grants passed.',
  )
}

if (process.argv[1]?.endsWith('/check-business-access.ts')) {
  await verifyBusinessAccess()
  if (process.argv.includes('--browser')) {
    const { serveBusinessAccessProbe } = await import('../verify/business-access-browser-probe')
    await serveBusinessAccessProbe()
  }
}
