import assert from 'node:assert/strict'
import { createApp } from 'vue'

import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type {
  AccessRequest,
  BoundAccessRequest,
} from '../../apps/web/src/app/access/access-contract'
import { createLocalAccessHost } from '../../apps/web/src/app/access/local-access-host'
import { createNativeGrantProvider } from '../../apps/web/src/app/access/native-grants'
import { observeNativeRequirement } from '../../apps/web/src/app/access/native-requirement'

const domain = 'fixture-projects'
const organization = { kind: 'organization', id: 'shared-name' }
const firstScope = [{ kind: 'tenant', id: 'first' }, organization]
const secondScope = [{ kind: 'tenant', id: 'second' }, organization]
const exact = { kind: 'exact', path: firstScope } as const
const global = { kind: 'global' } as const
const principal = { kind: 'known', principalId: 'fixture-member' } as const
const admin = { kind: 'known', principalId: 'fixture-administrator' } as const
const anonymous = { kind: 'anonymous' } as const
const resource = 'fixture-record'
const collection = { domain, resource, kind: 'collection', action: 'list' } as const
const record = { domain, resource, kind: 'record', action: 'update', recordId: 'one' } as const
const title = {
  domain,
  resource,
  kind: 'field',
  action: 'read',
  recordId: 'one',
  fieldPath: 'title',
} as const
const secret = { ...title, fieldPath: 'secret' }
const open = { domain, resource, kind: 'type', action: 'open' } as const
const review = { domain, resource, kind: 'type', action: 'review' } as const
const catalog = [collection, record, title, open, review].map(({ resource, kind, action }) => ({
  resource,
  kind,
  action,
}))

function grant(
  request: AccessRequest,
  scope: typeof global | typeof exact,
  effect: 'allow' | 'deny' = 'allow',
) {
  return { request, scope, effect }
}

const policy = {
  complete: true,
  revision: 'fixture-start',
  roles: [
    { id: 'base', inherits: [], grants: [grant(record, exact)] },
    { id: 'editor', inherits: ['base'], grants: [grant(secret, global)] },
    { id: 'reviewer', inherits: [], grants: [grant(review, exact)] },
    { id: 'reader', inherits: [], grants: [grant(collection, exact)] },
    { id: 'admin', inherits: [], grants: [] },
  ],
  groups: [{ id: 'team', roles: ['reader'], grants: [grant(title, exact)] }],
  subjects: [
    {
      identity: principal,
      roles: ['editor', 'reviewer'],
      groups: ['team'],
      grants: [grant(open, global), grant(secret, exact, 'deny')],
    },
    { identity: admin, roles: ['admin'], groups: [], grants: [] },
    { identity: anonymous, roles: [], groups: [], grants: [grant(open, global)] },
  ],
}

const binding = (
  request: AccessRequest,
  scope = firstScope,
  identity: BoundAccessRequest['context']['identity'] = principal,
): BoundAccessRequest => ({
  id: 1,
  contextGeneration: 0,
  context: { identity, scope },
  request,
})

export async function verifyNativeAccess(): Promise<void> {
  const native = createNativeGrantProvider(domain, catalog, policy)
  assert.deepEqual(new Set(native.targets), new Set(['type', 'collection', 'record', 'field']))
  assert.ok(Object.isFrozen(native.capabilities) && Object.isFrozen(native.capabilities[0]))
  for (const request of [open, collection, record, title, review])
    assert.equal((await native.evaluate(binding(request))).status, 'allow')

  assert.deepEqual(await native.evaluate(binding(secret)), {
    status: 'deny',
    reasonCode: 'native-access.explicit-denial',
    revision: policy.revision,
  })
  assert.equal((await native.evaluate(binding(secret, secondScope))).status, 'allow')
  assert.equal((await native.evaluate(binding(secret, []))).status, 'indeterminate')
  assert.equal(
    (await native.evaluate(binding(secret, [{ kind: 'tenant', id: 'first' }]))).status,
    'indeterminate',
  )
  assert.equal((await native.evaluate(binding(secret, [organization]))).status, 'indeterminate')
  assert.equal((await native.evaluate(binding(open, []))).status, 'allow')
  assert.equal((await native.evaluate(binding(record, []))).status, 'indeterminate')
  for (const request of [collection, title, record])
    assert.equal((await native.evaluate(binding(request, secondScope))).status, 'deny')
  assert.equal((await native.evaluate(binding({ ...record, recordId: 'two' }))).status, 'deny')
  assert.equal((await native.evaluate(binding({ ...title, fieldPath: 'other' }))).status, 'deny')
  assert.equal((await native.evaluate(binding(open, firstScope, admin))).status, 'deny')
  assert.equal((await native.evaluate(binding(open, [], anonymous))).status, 'allow')
  assert.equal(
    (await native.evaluate(binding({ ...open, action: 'undeclared' }))).status,
    'configuration-error',
  )
  assert.equal(
    (await native.evaluate(binding({ ...open, domain: 'unrelated' }))).status,
    'configuration-error',
  )

  const coarseOnly = createNativeGrantProvider(domain, catalog, {
    complete: true,
    revision: 'coarse',
    roles: [],
    subjects: [
      {
        identity: principal,
        roles: [],
        groups: [],
        grants: [grant({ ...open, action: 'open' }, global)],
      },
    ],
  })
  assert.equal(
    (await coarseOnly.evaluate(binding({ ...record, action: 'open' }))).status,
    'configuration-error',
  )
  assert.equal((await coarseOnly.evaluate(binding(record))).status, 'deny')
  assert.equal((await coarseOnly.evaluate(binding(title))).status, 'deny')
  const unavailable = createNativeGrantProvider(domain, catalog, undefined)
  assert.equal((await unavailable.evaluate(binding(open))).status, 'indeterminate')
  for (const bad of [
    { ...policy, complete: false },
    {
      ...policy,
      roles: [
        ...policy.roles,
        { id: 'cycle-first', inherits: ['cycle-second'], grants: [] },
        { id: 'cycle-second', inherits: ['cycle-first'], grants: [] },
      ],
    },
    { ...policy, roles: [...policy.roles, { id: 'orphan', inherits: ['missing'], grants: [] }] },
    { ...policy, groups: [{ id: 'team', roles: ['missing'], grants: [] }] },
    { ...policy, groups: [] },
    {
      ...policy,
      subjects: [
        {
          identity: principal,
          roles: [],
          groups: [],
          grants: [{ request: open, effect: 'allow' }],
        },
      ],
    },
    {
      ...policy,
      roles: [
        ...policy.roles,
        { id: 'undeclared', inherits: [], grants: [grant({ ...open, action: '*' }, global)] },
      ],
    },
  ]) {
    const rejected = createNativeGrantProvider(domain, catalog, bad)
    assert.deepEqual(await rejected.evaluate(binding(open)), {
      status: 'configuration-error',
      reasonCode: 'native-access.invalid-policy',
    })
  }
  const wildcard = createNativeGrantProvider(
    domain,
    [{ kind: 'type', resource: '*', action: 'open' }],
    policy,
  )
  assert.equal((await wildcard.evaluate(binding(open))).reasonCode, 'native-access.invalid-catalog')

  const fixture = {
    domain,
    capabilities: catalog,
    policy,
    initialContext: 'first',
    contexts: [
      { id: 'first', context: { identity: principal, scope: firstScope } },
      { id: 'second', context: { identity: principal, scope: secondScope } },
      { id: 'guest', context: { identity: anonymous, scope: [] } },
    ],
  }
  function createProbe() {
    const local = createLocalAccessHost(fixture)
    const app = createApp({})
    const dispose = installAccessBoundary(app, local.host)
    return { local, access: app.runWithContext(useAccessBoundary), dispose }
  }

  const current = createProbe()
  const other = createProbe()
  try {
    await Promise.resolve()
    const { access, local } = current
    const ignore = () => undefined
    const all = observeNativeRequirement(
      access,
      { operator: 'all', requests: [open, record], scope: exact },
      ignore,
    )
    const allDenied = observeNativeRequirement(
      access,
      { operator: 'all', requests: [open, secret], scope: exact },
      ignore,
    )
    const any = observeNativeRequirement(
      access,
      { operator: 'any', requests: [open, secret], scope: exact },
      ignore,
    )
    const empty = observeNativeRequirement(
      access,
      { operator: 'any', requests: [], scope: exact },
      ignore,
    )
    const bad = observeNativeRequirement(
      access,
      { operator: 'any', requests: [open, { ...open, action: 'missing' }], scope: exact },
      ignore,
    )
    const field = access.observe(title, ignore)
    const otherField = other.access.observe(title, ignore)
    await Promise.all([
      all.evaluate(),
      allDenied.evaluate(),
      any.evaluate(),
      bad.evaluate(),
      field.evaluate(),
      otherField.evaluate(),
    ])
    assert.equal(all.read().status, 'allow')
    assert.equal(allDenied.read().status, 'deny')
    assert.equal(any.read().status, 'allow')
    assert.equal(empty.read().status, 'configuration-error')
    assert.equal(bad.read().status, 'configuration-error')
    const old = any.permit()
    const otherPermit = otherField.permit()
    assert.ok(old && otherPermit)
    const pending = field.evaluate()
    const badReplacement = local.replacePolicy({ ...policy, complete: false })
    assert.equal(old.isCurrent(), false)
    assert.equal(field.permit(), undefined)
    assert.equal(otherPermit.isCurrent(), true)
    await Promise.all([pending, badReplacement])
    assert.equal(field.read().status, 'stale')
    await field.evaluate()
    assert.equal(field.read().status, 'configuration-error')
    await local.replacePolicy(undefined)
    await field.evaluate()
    assert.equal(field.read().status, 'indeterminate')
    await local.replacePolicy({
      complete: true,
      revision: 'fixture-restricted',
      roles: [],
      subjects: [],
    })
    await field.evaluate()
    assert.deepEqual(field.read(), {
      status: 'deny',
      reasonCode: 'native-access.no-grant',
      revision: 'fixture-restricted',
    })
    await local.reset()
    await any.evaluate()
    const restored = any.permit()
    assert.ok(restored)
    assert.equal(restored.isCurrent(), true)
    const switching = local.selectScope(secondScope)
    assert.equal(restored.isCurrent(), false)
    await switching
    await any.evaluate()
    assert.deepEqual(any.read(), { status: 'deny', reasonCode: 'native-access.scope-mismatch' })
    assert.equal(any.permit(), undefined)
    await local.selectScope([{ kind: 'tenant', id: 'unconfirmed' }])
    assert.equal(access.readContext().status, 'identity-failed')
    await local.selectContext('guest')
    const guest = access.readContext()
    assert.equal(guest.status, 'ready')
    assert.equal(guest.snapshot.identity.kind, 'anonymous')
    assert.equal(any.read().status, 'indeterminate')
    await local.reset()
    await any.evaluate()
    assert.equal(any.permit()?.isCurrent(), true)
  } finally {
    current.dispose()
    other.dispose()
  }
}
