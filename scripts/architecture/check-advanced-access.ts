import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createSSRApp } from 'vue'
import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type {
  AccessHost,
  AccessProposal,
  AccessRequest,
  BoundAccessRequest,
} from '../../apps/web/src/app/access/access-contract'
import { createCaslAccess } from '../../apps/web/src/app/access/casl-access'
import type {
  FactPacket,
  LoadConditionalFacts,
} from '../../apps/web/src/app/access/conditional-facts'
import { executeGuardedAction } from '../../apps/web/src/app/access/guarded-action'
import { createHostDecisionAccess } from '../../apps/web/src/app/access/host-decision-access'
import { createPredicateAccess } from '../../apps/web/src/app/access/predicate-access'
import { serveAdvancedAccessProbe } from '../verify/advanced-access-browser-probe'
import { createRelationshipAccess } from '../../apps/web/src/app/access/relationship-access'

const context = {
  identity: { kind: 'known', principalId: 'alex' },
  scope: [{ kind: 'team', id: 'blue' }],
} as const
const scope = { kind: 'exact', path: context.scope } as const
const domain = 'conditional-check'
const resource = 'task'
let id = 0
function binding(request: AccessRequest, proposal?: AccessProposal): BoundAccessRequest {
  return {
    id: ++id,
    context,
    contextGeneration: 1,
    request,
    ...(proposal === undefined ? {} : { proposal }),
  }
}
function record(action: string, recordId = 'issue'): AccessRequest {
  return { kind: 'record', domain, resource, recordId, action }
}
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function conditional(): Promise<void> {
  const rules = [
    { action: 'read', subject: 'Task', conditions: { owner: 'alex' } },
    { action: 'read', subject: 'Task', conditions: { blocked: true }, inverted: true },
    {
      action: 'read',
      subject: 'Task',
      fields: ['profile.*'],
      conditions: { owner: 'alex', blocked: true },
    },
    {
      action: 'check',
      subject: 'Task',
      conditions: { archived: { $exists: false }, score: { $ne: 7 } },
    },
    { action: 'submit', subject: 'Task', conditions: { owner: 'alex' } },
  ]
  const raw: FactPacket['facts'] = {
    owner: { status: 'known', value: 'alex' },
    blocked: { status: 'known', value: true },
    archived: { status: 'absent' },
    score: { status: 'known', value: 0 },
  }
  let change: FactPacket['facts'] = raw
  let stale = false
  const loadFacts: LoadConditionalFacts = (binding, input, required) => ({
    binding: stale ? { ...binding } : binding,
    input,
    ...(input === 'candidate' && binding.proposal
      ? { proposalRevision: binding.proposal.revision }
      : {}),
    complete: [...required],
    facts:
      input === 'candidate'
        ? {
            owner: {
              status: 'known',
              value: binding.proposal?.values['owner'] === 'alex' ? 'alex' : 'other',
            },
          }
        : change,
  })
  const access = createCaslAccess({
    domain,
    scope,
    loadFacts,
    policy: { revision: 'policy-opaque', rules },
    mappings: [
      { kind: 'type', resource, action: 'read', subject: 'Task', abilityAction: 'read' },
      { kind: 'collection', resource, action: 'read', subject: 'Task', abilityAction: 'read' },
      { kind: 'record', resource, action: 'read', subject: 'Task', abilityAction: 'read' },
      { kind: 'field', resource, action: 'read', subject: 'Task', abilityAction: 'read' },
      { kind: 'record', resource, action: 'check', subject: 'Task', abilityAction: 'check' },
      {
        kind: 'record',
        resource,
        action: 'submit',
        subject: 'Task',
        abilityAction: 'submit',
        input: 'candidate',
      },
    ],
  })
  // Resolve the official library through the owning workspace. This comparison is independent
  // of the PAVP completeness guard and uses the actual installed matcher and ordering.
  const webRequire = createRequire(new URL('../../apps/web/package.json', import.meta.url))
  const official = webRequire('@casl/ability') as {
    createMongoAbility(rules: unknown[]): {
      can(action: string, subject: unknown, field?: string): boolean
    }
    subject(type: string, value: Record<string, unknown>): unknown
  }
  const direct = official.createMongoAbility(rules)
  const concrete = official.subject('Task', { owner: 'alex', blocked: true, score: 0 })
  const status = async (target: BoundAccessRequest) =>
    (await access.provider.evaluate(target)).status
  for (const field of ['profile.title', 'private']) {
    assert.equal(
      await status(
        binding({
          kind: 'field',
          domain,
          resource,
          action: 'read',
          recordId: 'issue',
          fieldPath: field,
        }),
      ),
      direct.can('read', concrete, field) ? 'allow' : 'deny',
    )
  }
  assert.equal(
    await status(binding(record('read'))),
    direct.can('read', concrete) ? 'allow' : 'deny',
  )
  assert.equal(
    await status(binding({ kind: 'type', domain, resource, action: 'read' })),
    direct.can('read', 'Task') ? 'allow' : 'deny',
  )
  assert.equal(
    await status(binding({ kind: 'collection', domain, resource, action: 'read' })),
    'indeterminate',
  )
  assert.equal(await status(binding(record('check'))), 'allow')
  change = { ...raw, archived: { status: 'known', value: null } }
  assert.equal(await status(binding(record('check'))), 'deny')
  change = { ...raw, archived: { status: 'unknown' } }
  assert.equal(await status(binding(record('check'))), 'indeterminate')
  change = { ...raw, score: { status: 'undisclosed' } }
  assert.equal(await status(binding(record('check'))), 'indeterminate')
  change = { ...raw, score: { status: 'pending' } }
  assert.equal(await status(binding(record('check'))), 'pending')
  change = raw
  stale = true
  assert.equal(await status(binding(record('check'))), 'indeterminate')
  stale = false
  assert.equal(await status(binding(record('submit', 'reserved'))), 'indeterminate')
  assert.equal(
    await status(
      binding(record('submit', 'reserved'), { revision: 'proposal', values: { owner: 'alex' } }),
    ),
    'allow',
  )
  change = { ...raw, owner: { status: 'known', value: 'other' } }
  assert.equal(
    await status(binding(record('read'), { revision: 'proposal', values: { owner: 'alex' } })),
    'deny',
  )
  const wrongScope = {
    ...binding(record('read')),
    context: { ...context, scope: [{ kind: 'team', id: 'red' }] },
  }
  assert.equal(await status(wrongScope), 'deny')

  const app = createSSRApp({})
  const cleanup = installAccessBoundary(app, {
    resolveContext: () => context,
    decisions: [access.provider],
  })
  try {
    await Promise.resolve()
    const boundary = app.runWithContext(useAccessBoundary)
    const validations: AccessProposal[] = []
    const mine = { owner: 'alex' }
    const running = executeGuardedAction(
      boundary,
      {
        requirement: () => ({ scope, operator: 'all', requests: [record('submit', 'reserved')] }),
        isTargetCurrent: () => true,
        businessAllows: () => true,
        dispatch: (commands) =>
          Promise.resolve(
            commands.map((command) => {
              const { target, requestId } = command
              assert.equal(command.isCurrent(), true)
              if (target.proposal) validations.push(target.proposal)
              return { status: 'completed' as const, requestId, targetId: target.id, value: null }
            }),
          ),
      },
      {
        targets: [{ id: 'reserved', proposal: { revision: 'frozen-command', values: mine } }],
        signal: new AbortController().signal,
      },
    )
    mine.owner = 'edited-later'
    assert.equal((await running)[0]?.status, 'completed')
    assert.deepEqual(validations, [{ revision: 'frozen-command', values: { owner: 'alex' } }])

    change = raw
    const checked = boundary.observe(record('check'), () => undefined)
    await checked.evaluate()
    const prior = checked.permit()
    assert.ok(prior)
    assert.ok(prior.isCurrent())
    const older = deferred<unknown>()
    const outdated = access.replacePolicy(() => older.promise)
    assert.equal(prior.isCurrent(), false)
    assert.equal(await status(binding(record('check'))), 'pending')
    assert.equal(
      await access.replacePolicy(() => ({
        revision: 'bad',
        rules: [{ action: 'read', subject: 'Task', conditions: { owner: { $regex: 'al' } } }],
      })),
      false,
    )
    older.resolve({ revision: 'late', rules })
    assert.equal(await outdated, false)
    assert.equal(await status(binding(record('check'))), 'configuration-error')
    checked.dispose()
  } finally {
    cleanup()
  }

  const predicate = createPredicateAccess({
    domain,
    scope,
    rules: [
      {
        kind: 'record',
        resource,
        action: 'check',
        requires: ['active', 'count', 'empty', 'nullable'],
        test: ({ facts }) =>
          facts['active'] === false &&
          facts['count'] === 0 &&
          facts['empty'] === '' &&
          facts['nullable'] === null,
      },
    ],
    loadFacts: (binding, input, required) => ({
      binding,
      input,
      complete: [...required],
      facts: {
        active: { status: 'known', value: false },
        count: { status: 'known', value: 0 },
        empty: { status: 'known', value: '' },
        nullable: { status: 'known', value: null },
      },
    }),
  })
  assert.equal((await predicate.provider.evaluate(binding(record('check')))).status, 'allow')
}

async function relationship(): Promise<void> {
  let now = 10
  const group = (id: string) => ({ kind: 'group', id })
  const person = { kind: 'principal', id: 'alex' }
  const parent = { resource: 'project', id: 'root' }
  const child = { resource: 'task', id: 'issue' }
  const graph = {
    complete: true,
    scope: context.scope,
    revision: 'graph-opaque',
    principals: ['alex'],
    groups: [
      { id: 'outer', members: [{ principal: group('inner') }] },
      { id: 'inner', members: [{ principal: person }] },
    ],
    objects: [parent, { ...child, parent }],
    edges: [{ object: parent, principal: group('outer'), relation: 'collaborator', expiresAt: 20 }],
  }
  const config = {
    domain,
    mappings: [
      { resource: 'project', action: 'read', allow: ['owner'] as const, inherit: [] },
      { resource: 'task', action: 'read', allow: ['collaborator'] as const, inherit: ['project'] },
      { resource: 'task', action: 'delete', allow: ['owner'] as const, inherit: [] },
    ].map((mapping) => ({ ...mapping, allow: [...mapping.allow] })),
    clock: () => now,
  }
  const relationships = createRelationshipAccess({ ...config, snapshot: graph })
  assert.deepEqual(await relationships.provider.evaluate(binding(record('read'))), {
    status: 'allow',
    expiresAt: 20,
    revision: 'graph-opaque',
  })
  assert.equal((await relationships.provider.evaluate(binding(record('delete')))).status, 'deny')
  now = 20
  assert.equal((await relationships.provider.evaluate(binding(record('read')))).status, 'deny')
  now = 10
  assert.equal(
    (
      await relationships.provider.evaluate({
        ...binding(record('read')),
        context: { ...context, scope: [{ kind: 'team', id: 'red' }] },
      })
    ).status,
    'indeterminate',
  )
  assert.equal(
    (
      await createRelationshipAccess({
        ...config,
        snapshot: graph,
        maxTraversal: 1,
      }).provider.evaluate(binding(record('read')))
    ).status,
    'indeterminate',
  )

  const app = createSSRApp({})
  const timed = createRelationshipAccess({
    ...config,
    clock: Date.now,
    snapshot: { ...graph, edges: [{ ...graph.edges[0], expiresAt: Date.now() + 200 }] },
  })
  const cleanup = installAccessBoundary(app, {
    resolveContext: () => context,
    decisions: [timed.provider],
  })
  try {
    await Promise.resolve()
    const boundary = app.runWithContext(useAccessBoundary)
    const expired = deferred<undefined>()
    const check = boundary.observe(record('read'), () => {
      expired.resolve(undefined)
    })
    await check.evaluate()
    const allow = check.permit()
    assert.ok(allow)
    assert.ok(allow.isCurrent())
    const timer = setTimeout(() => {
      expired.resolve(undefined)
    }, 500)
    await expired.promise
    clearTimeout(timer)
    assert.equal(allow.isCurrent(), false)
    assert.equal(check.read().status, 'expired')
    check.dispose()
  } finally {
    cleanup()
  }
  const exclude = { object: child, principal: person, relation: 'exclude' }
  assert.equal(
    await relationships.replaceSnapshot(() => ({ ...graph, edges: [...graph.edges, exclude] })),
    true,
  )
  assert.equal((await relationships.provider.evaluate(binding(record('read')))).status, 'deny')
  assert.equal(
    await relationships.replaceSnapshot(() => ({ ...graph, complete: false, principals: [] })),
    true,
  )
  assert.equal(
    (await relationships.provider.evaluate(binding(record('read')))).status,
    'indeterminate',
  )
  assert.equal(
    await relationships.replaceSnapshot(() => ({
      ...graph,
      groups: [{ id: 'cycle', members: [{ principal: group('cycle') }] }],
    })),
    false,
  )
  assert.equal(
    (await relationships.provider.evaluate(binding(record('read')))).status,
    'configuration-error',
  )
}

async function host(): Promise<void> {
  const authority = createHostDecisionAccess({
    domain,
    scope,
    consistency: ['HIGHER_CONSISTENCY'],
    capabilities: [
      { kind: 'record', resource, action: 'read' },
      { kind: 'field', resource, action: 'read' },
    ],
    map: ({ request }) => {
      if (request.kind !== 'record') return
      return {
        principal: 'user:alex',
        relation: 'reader',
        object: 'task:' + request.recordId,
        modelId: 'model-opaque',
        relationshipRevision: 'tuple-opaque',
        consistency: 'HIGHER_CONSISTENCY',
      }
    },
    evaluate: (queries) => {
      assert.equal(queries.length, 5)
      assert.equal(queries[0]?.mapping.consistency, 'HIGHER_CONSISTENCY')
      const rows = queries.map(({ requestId, target, mapping }) => ({
        requestId,
        target,
        status: 'allow',
        modelId: mapping.modelId,
        relationshipRevision: mapping.relationshipRevision,
      }))
      const [good, missing, duplicate, mismatch, outdated] = rows
      assert.ok(good && missing && duplicate && mismatch && outdated)
      return Promise.resolve([
        { ...mismatch, target: good.target },
        duplicate,
        good,
        duplicate,
        { ...outdated, relationshipRevision: 'different-tuples' },
      ])
    },
  })
  const results = await Promise.all(
    ['good', 'missing', 'duplicate', 'mismatch', 'outdated'].map((key) =>
      Promise.resolve(authority.provider.evaluate(binding(record('read', key)))),
    ),
  )
  assert.deepEqual(
    results.map(({ status }) => status),
    ['allow', 'indeterminate', 'configuration-error', 'configuration-error', 'indeterminate'],
  )
  assert.equal(
    (
      await authority.provider.evaluate(
        binding({
          kind: 'field',
          domain,
          resource,
          recordId: 'good',
          fieldPath: 'secret',
          action: 'read',
        }),
      )
    ).status,
    'unsupported',
  )

  let casbinTransportFails = false
  const casbin = createHostDecisionAccess({
    domain,
    scope,
    capabilities: [{ kind: 'record', resource, action: 'read' }],
    map: ({ request, context }) =>
      request.kind === 'record' && context.identity.kind === 'known'
        ? {
            principal: context.identity.principalId,
            relation: request.action,
            object: request.recordId,
          }
        : undefined,
    evaluate: (queries) => {
      if (casbinTransportFails) return Promise.reject(new Error('unfiltered service message'))
      return Promise.resolve(
        queries.map(({ requestId, target, mapping }) => ({
          requestId,
          target,
          status: mapping.principal === 'alex' && mapping.relation === 'read' ? 'allow' : 'deny',
        })),
      )
    },
  })
  assert.equal((await casbin.provider.evaluate(binding(record('read')))).status, 'allow')
  casbinTransportFails = true
  assert.deepEqual(await casbin.provider.evaluate(binding(record('read'))), {
    status: 'evaluation-failed',
    reasonCode: 'access.host-transport-failed',
  })

  const sent = deferred<undefined>()
  const late = deferred<unknown>()
  const switching = createHostDecisionAccess({
    domain,
    scope: { kind: 'global' },
    capabilities: [{ kind: 'record', resource, action: 'read' }],
    map: () => ({ principal: 'alex', relation: 'read', object: 'issue' }),
    evaluate: (queries) => {
      sent.resolve(undefined)
      return late.promise.then(() =>
        queries.map(({ requestId, target }) => ({ requestId, target, status: 'allow' })),
      )
    },
  })
  const app = createSSRApp({})
  let team = 'blue'
  let notify: Parameters<NonNullable<AccessHost['subscribe']>>[0] | undefined
  const cleanup = installAccessBoundary(app, {
    decisions: [switching.provider],
    resolveContext: () => ({ ...context, scope: [{ kind: 'team', id: team }] }),
    subscribe(callback) {
      notify = callback
      return () => {
        notify = undefined
      }
    },
  })
  try {
    await Promise.resolve()
    const check = app.runWithContext(useAccessBoundary).observe(record('read'), () => undefined)
    const pending = check.evaluate()
    await sent.promise
    team = 'red'
    await notify?.({ kind: 'scope' })
    team = 'blue'
    await notify?.({ kind: 'scope' })
    late.resolve(null)
    await pending
    assert.equal(check.permit(), undefined)
    assert.equal(check.read().status, 'stale')
  } finally {
    cleanup()
  }
}

export async function verifyAdvancedAccess(): Promise<void> {
  await conditional()
  await relationship()
  await host()
  console.log(
    'Advanced access: CASL equivalence, facts, proposals, bounded relations, expiry, and host correlation passed.',
  )
}

if (process.argv[1]?.endsWith('check-advanced-access.ts')) {
  if (process.argv.includes('--browser')) await serveAdvancedAccessProbe()
  else await verifyAdvancedAccess()
}
