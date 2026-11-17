import assert from 'node:assert/strict'
import { createApp } from 'vue'
import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import { executeGuardedAction } from '../../apps/web/src/app/access/guarded-action'
import { administrationAction } from '../../apps/web/src/app/administration/administration-host'
import { simulateAdministration } from '../../apps/web/src/app/administration/administration-simulation'
import { createScopedApiRead } from '../../apps/web/src/app/api/scoped-api-read'
import { createAdministrationFixture } from './administration-browser-fixture'

function installFixture(fixture: ReturnType<typeof createAdministrationFixture>) {
  const application = createApp({})
  const dispose = installAccessBoundary(application, fixture.accessHost)
  return { access: application.runWithContext(useAccessBoundary), dispose }
}

const fixture = createAdministrationFixture('editable')
const { access, dispose } = installFixture(fixture)
await Promise.resolve()
const operator = access.readContext()
assert.equal(operator.status, 'ready')
const host = access.administration?.()
assert.ok(host?.roles?.simulation)
assert.ok(host.policies)
const roleRead = createScopedApiRead(access, host.roles.read)
const policyRead = createScopedApiRead(access, host.policies.read)
const signal = new AbortController().signal

async function read(owner: typeof roleRead, keyword?: string) {
  assert.equal(await owner.run(keyword === undefined ? {} : { keyword }), 'ready')
  const state = owner.state.value
  assert.equal(state.status, 'ready')
  return state.data.rows
}

try {
  const [original] = await read(roleRead, 'Read report')
  assert.ok(original)
  assert.equal(original['directEffect'], 'allow')
  const inherited = (await read(roleRead)).find((row) => row['id'] === 'inherited')
  assert.ok(inherited)
  assert.equal(inherited['directEffect'], 'unset')
  assert.equal(inherited['effective'], 'allow')
  const command = host.roles.commands?.find(({ kind }) => kind === 'set-direct-rule')
  assert.ok(command)
  assert.ok(typeof original['revision'] === 'string')
  assert.ok(typeof inherited['revision'] === 'string')
  const action = administrationAction(access, command, () => true)
  const target = {
    id: 'reading',
    revision: original['revision'],
    proposal: { revision: 'probe-intent', values: { value: 'deny' } },
  }
  const attempt = async (candidate: typeof target) =>
    (await executeGuardedAction(access, action, { targets: [candidate], signal }))[0]?.status
  assert.equal(
    await attempt({ ...target, id: 'inherited', revision: inherited['revision'] }),
    'business-blocked',
  )
  assert.equal(await attempt(target), 'completed')
  assert.equal(await attempt(target), 'not-dispatched')
  const matrix = await read(roleRead)
  assert.equal(matrix.find((row) => row['id'] === 'reading')?.['directEffect'], 'deny')
  assert.deepEqual(
    matrix.find((row) => row['id'] === 'inherited'),
    inherited,
  )
  const external = matrix.find((row) => row['id'] === 'external')
  assert.ok(external)
  assert.equal(external['editable'], false)
  const simulation = host.roles.simulation
  assert.equal(simulation.request(external), undefined)
  const request = simulation.request(original)
  assert.ok(request)
  assert.equal(
    (
      await simulateAdministration(
        access,
        simulation,
        {
          target: { id: 'reading' },
          request,
          subjectId: 'fern',
        },
        signal,
        () => true,
      )
    ).status,
    'deny',
  )
  assert.equal(access.readContext(), operator)

  const [policy] = await read(policyRead)
  assert.ok(policy)
  const save = host.policies.commands?.find(({ kind }) => kind === 'save')
  const publish = host.policies.commands?.find(({ kind }) => kind === 'publish')
  assert.ok(save && publish)
  const revision = policy['revision']
  const activeRevision = policy['activeRevision']
  assert.ok(typeof revision === 'string')
  assert.ok(typeof activeRevision === 'string')
  const savePolicy = (expectedActiveRevision: string) =>
    executeGuardedAction(
      access,
      administrationAction(access, save, () => true),
      {
        targets: [
          {
            id: 'policy',
            revision,
            proposal: {
              revision: 'policy-draft',
              values: { value: 'field-read', expectedActiveRevision },
            },
          },
        ],
        signal,
      },
    )
  assert.equal((await savePolicy('stale-base'))[0]?.status, 'business-blocked')
  fixture.failNextSave()
  assert.equal((await savePolicy(activeRevision))[0]?.status, 'failed')
  assert.equal((await savePolicy(activeRevision))[0]?.status, 'completed')
  const [draft] = await read(policyRead)
  assert.equal(draft?.['draftState'], 'saved')
  assert.equal(draft['activeRevision'], activeRevision)
  assert.ok(typeof draft['revision'] === 'string')
  assert.equal(
    (
      await executeGuardedAction(
        access,
        administrationAction(access, publish, () => true),
        {
          targets: [
            {
              id: 'policy',
              revision: draft['revision'],
              proposal: {
                revision: 'policy-publication',
                values: { expectedActiveRevision: activeRevision },
              },
            },
          ],
          signal,
        },
      )
    )[0]?.status,
    'completed',
  )
  const [published] = await read(policyRead)
  assert.equal(published?.['draftState'], 'published')
  assert.equal(published['activeRevision'], activeRevision)
  fixture.confirmEffectiveness()
  const [effective] = await read(policyRead)
  assert.equal(effective?.['draftState'], 'effective')
  assert.notEqual(effective['activeRevision'], activeRevision)

  // Use a new editable policy instance to distinguish an authoritative conflict from a failed write.
  const racingHost = createAdministrationFixture('editable')
  const { access: racingAccess, dispose: releaseRacingAccess } = installFixture(racingHost)
  try {
    await Promise.resolve()
    racingHost.conflictNextSave()
    const racingCommand = racingAccess
      .administration?.()
      ?.policies?.commands?.find(({ kind }) => kind === 'save')
    assert.ok(racingCommand)
    const [conflict] = await executeGuardedAction(
      racingAccess,
      administrationAction(racingAccess, racingCommand, () => true),
      {
        targets: [
          {
            id: 'policy',
            revision: 'seed',
            proposal: {
              revision: 'racing-write',
              values: { value: 'field-read', expectedActiveRevision: 'fixture-active-seed' },
            },
          },
        ],
        signal,
      },
    )
    assert.equal(conflict?.status, 'failed')
    assert.equal(conflict.failure, 'revision-conflict')
  } finally {
    releaseRacingAccess()
  }

  fixture.revoke()
  assert.equal(roleRead.state.value.status, 'idle')
  assert.equal(policyRead.state.value.status, 'idle')
  assert.equal(await roleRead.run(), 'denied')
  assert.equal(
    createAdministrationFixture('readonly').accessHost.administration?.roles?.commands,
    undefined,
  )
  console.log(
    'Administration: exact rule delta, inherited and external rules, independent simulation, policy revision and lifecycle, scoped revocation and readonly capability passed.',
  )
} finally {
  roleRead.dispose()
  policyRead.dispose()
  dispose()
}
