import { strict as assert } from 'node:assert'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createApp, effectScope } from 'vue'
import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type { AccessRequest } from '../../apps/web/src/app/access/access-contract'
import { executeGuardedAction } from '../../apps/web/src/app/access/guarded-action'
import { createScopedApiRead } from '../../apps/web/src/app/api/scoped-api-read'
import { createShowcaseAdministration } from '../../apps/web/src/app/access-showcase/showcase-administration'
import { administrationModules } from '../../apps/web/src/app/administration/administration-routes'
import {
  members,
  organizations,
  reportId,
} from '../../apps/web/src/app/access-showcase/showcase-data'
import { showcaseTaskRead } from '../../apps/web/src/app/access-showcase/showcase-read'
import {
  reportCapability,
  taskCapability,
} from '../../apps/web/src/app/access-showcase/showcase-requirements'
import {
  showcaseProjectRequirement,
  type AccessShowcaseProfile,
} from '../../apps/web/src/app/access-showcase/showcase-routes'
import { showcaseBatch } from '../../apps/web/src/app/access-showcase/showcase-task-actions'
import { createShowcaseWorld } from '../../apps/web/src/app/access-showcase/showcase-world'
import { composeRouteRegistry } from '../../apps/web/src/app/router/route-registry'

async function verifyWorld(profile: AccessShowcaseProfile) {
  const authority =
    profile === 'casl'
      ? (await import('../../apps/web/src/app/access-showcase/showcase-casl')).createShowcaseCasl
      : undefined
  const world = createShowcaseWorld(profile, authority)
  const application = createApp({})
  const admin = createShowcaseAdministration(world)
  const dispose = installAccessBoundary(application, {
    ...world.host,
    decisions: [...world.host.decisions, admin.provider],
    administration: admin.modules,
  })
  const access = application.runWithContext(useAccessBoundary)
  const scope = effectScope()
  try {
    async function resolve(request: AccessRequest) {
      const check = access.observe(request, () => undefined)
      await check.evaluate()
      const status = check.read().status
      check.dispose()
      return status
    }

    await world.select(1)
    assert.equal(await resolve(showcaseProjectRequirement), 'deny')
    await world.select(7)
    assert.equal(await resolve(showcaseProjectRequirement), 'allow')
    const tasks = world.state.tasks.slice(0, 4)
    const task = tasks[0]
    assert.ok(task)
    const read = scope.run(() => createScopedApiRead(access, showcaseTaskRead(world)))
    assert.ok(read)
    assert.equal(await read.run({ id: task.id }), 'ready')
    const confirmed = read.state.value
    assert.equal(confirmed.status, 'ready')
    assert.doesNotMatch(JSON.stringify(confirmed.data), /8100|synthetic-replacement/u)

    assert.equal(await resolve(taskCapability('field', 'read-field', task.id, 'owner')), 'allow')
    assert.equal(await resolve(taskCapability('field', 'write-field', task.id, 'owner')), 'deny')
    assert.equal(await resolve(taskCapability('field', 'read-field', task.id, 'budget')), 'deny')
    assert.equal(await resolve(taskCapability('field', 'read-field', task.id, 'secret')), 'deny')
    assert.equal(await resolve(taskCapability('field', 'write-field', task.id, 'secret')), 'allow')
    await world.setTitleAccess(task.id, 'write', false)
    assert.equal(read.isCurrent(confirmed.requestId), true)
    assert.equal(await resolve(taskCapability('field', 'write-field', task.id, 'title')), 'deny')
    assert.equal(await resolve(taskCapability('field', 'read-field', task.id, 'title')), 'allow')
    await world.setTitleAccess(task.id, 'read', false)
    assert.equal(await resolve(taskCapability('field', 'read-field', task.id, 'title')), 'deny')
    assert.equal(await read.run({ id: task.id }), 'ready')
    const after = read.state.value
    assert.ok(after.status === 'ready' && !Object.hasOwn(after.data.values, 'title'))

    const targets = tasks.map(({ id, revision }) => ({ id, revision }))
    const signal = new AbortController().signal
    const all = await executeGuardedAction(access, showcaseBatch(world), { targets, signal })
    assert.deepEqual(
      all.map(({ status }) => status),
      ['not-dispatched', 'denied', 'unresolved', 'business-blocked'],
    )
    const partial = await executeGuardedAction(access, showcaseBatch(world), {
      targets,
      signal,
      mode: 'partial',
    })
    assert.deepEqual(
      partial.map(({ status }) => status),
      ['completed', 'denied', 'unresolved', 'business-blocked'],
    )
    assert.equal(world.state.tasks[0]?.completed, true)

    world.state.latency = 35
    const oldRead = read.run({ id: task.id })
    const oldDecision = access.observe(taskCapability('record', 'save', task.id), () => undefined)
    const pending = oldDecision.evaluate()
    await world.selectOrganization(organizations[1].id)
    assert.equal(await oldRead, 'stale')
    await pending
    assert.equal(oldDecision.permit(), undefined)
    oldDecision.dispose()
    const ready = access.readContext()
    assert.ok(ready.status === 'ready' && ready.snapshot.scope[0]?.id === organizations[1].id)

    await world.select(21)
    const policies = scope.run(() => createScopedApiRead(access, admin.modules.policies.read))
    assert.ok(policies)
    assert.equal(await policies.run({ offset: 0 }), 'ready')
    const policy = policies.state.value
    assert.ok(policy.status === 'ready' && policy.data.rows[0]?.['draftState'] === 'saved')

    await world.select(15)
    assert.equal(await resolve(reportCapability('approve', reportId)), 'deny')
    await world.selectIdentity(members[1].id)
    assert.equal(await resolve(reportCapability('approve', reportId)), 'allow')
    await world.advanceTime()
    assert.equal(await resolve(reportCapability('approve', reportId)), 'deny')
    await world.select(1)
    assert.equal(world.state.tasks.find(({ id }) => id === task.id)?.completed, false)
    assert.equal(world.state.quota, 2)
    assert.equal(await resolve(showcaseProjectRequirement), 'deny')
    console.log(
      `Access showcase ${profile}: navigation, projected fields, batches, stale scope, expiry and reset passed.`,
    )
  } finally {
    scope.stop()
    dispose()
  }
}

export async function verifyAccessShowcase(): Promise<void> {
  await verifyWorld('native')
  await verifyWorld('casl')
}

type ArtifactProfile = 'public' | 'administration' | AccessShowcaseProfile

export async function verifyAccessArtifact(
  profile: ArtifactProfile,
  directory: string,
): Promise<void> {
  const showcase = profile === 'native' || profile === 'casl' ? profile : null
  const administration =
    profile === 'administration'
      ? administrationModules
      : showcase === null
        ? []
        : (['policies'] as const)
  const expected = composeRouteRegistry(administration, showcase)
    .map(({ sourcePath }) => sourcePath.replace(/^apps\/web\//u, ''))
    .sort()
  const manifest = JSON.parse(
    await readFile(join(directory, '.vite/manifest.json'), 'utf8'),
  ) as Record<string, { isDynamicEntry?: boolean }>
  const entries = Object.keys(manifest)
    .filter((key) =>
      /^(?:src\/(?:pages|administration-pages|access-showcase-pages)\/).*\.vue$/u.test(key),
    )
    .sort()
  assert.deepEqual(entries, expected)
  assert.ok(entries.every((key) => manifest[key]?.isDynamicEntry === true))
  const assets = join(directory, 'assets')
  const files = (await readdir(assets)).filter((name) => name.endsWith('.js'))
  const emitted = (
    await Promise.all(files.map((name) => readFile(join(assets, name), 'utf8')))
  ).join('\n')
  assert.doesNotMatch(
    emitted,
    /wp11-fixture|wp13-sample-|Simulate IME Enter|Login probe result|virtual:pavp-.*-probe|WP14 captured/u,
  )
  assert.equal(emitted.includes('showcase-synthetic-replacement-seed'), showcase !== null)
  assert.equal(emitted.includes('showcase-casl-policy'), profile === 'casl')
  assert.equal(emitted.includes('possibleRulesFor'), profile === 'casl')
  console.log(
    `Access artifact ${profile}: ${String(entries.length)} exact lazy routes and matching provider isolation.`,
  )
}

if (import.meta.main) {
  const [, , profile, directory] = process.argv
  if (profile === undefined) await verifyAccessShowcase()
  else if (
    (profile === 'public' ||
      profile === 'administration' ||
      profile === 'native' ||
      profile === 'casl') &&
    directory !== undefined
  )
    await verifyAccessArtifact(profile, directory)
  else throw new Error('Expected a composition profile and its built directory.')
}
