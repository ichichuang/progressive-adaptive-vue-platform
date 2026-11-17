import assert from 'node:assert/strict'
import { createSSRApp, effectScope } from 'vue'
import type { UiG2ChartOptions } from '../../packages/ui/src/components/g2-chart-contracts'
import { createApiClient } from '../../apps/web/src/shared/api'
import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type { AccessHost, AccessRequest } from '../../apps/web/src/app/access/access-contract'
import type { NativeAccessRequirement } from '../../apps/web/src/app/access/native-requirement'
import { useGuardedChart } from '../../apps/web/src/app/charts/use-guarded-chart'
import {
  bindGuardedChartSpec,
  guardedChartReportSchema,
} from '../../apps/web/src/app/charts/guarded-chart-spec'
import { serveGuardedChartBrowserProbe } from './guarded-chart-browser-probe'

export async function verifyGuardedChart(): Promise<void> {
  const domain = 'chart-check'
  const resource = 'measurements'
  const point = { id: 'a', at: 1, amount: 6, secret: 70, ignored: 427 }
  const other = { id: 'b', at: 3, amount: 11, secret: 80, ignored: 428 }
  const denied = new Set<string>()
  let principalId = 'chart-check-principal'
  let organization = 'first'
  const key = (request: AccessRequest) =>
    [
      request.action,
      'recordId' in request ? request.recordId : '',
      'fieldPath' in request ? request.fieldPath : '',
    ].join(':')
  let notify: NonNullable<Parameters<NonNullable<AccessHost['subscribe']>>[0]> | undefined
  const application = createSSRApp({})
  const teardown = installAccessBoundary(application, {
    resolveContext: () => ({
      identity: { kind: 'known', principalId },
      scope: [{ kind: 'team', id: organization }],
    }),
    decisions: [
      {
        domain,
        targets: ['collection', 'record', 'field'],
        evaluate: ({ request }) => ({ status: denied.has(key(request)) ? 'deny' : 'allow' }),
      },
    ],
    subscribe(listener) {
      notify = listener
      return () => {
        notify = undefined
      }
    },
  })
  const access = application.runWithContext(useAccessBoundary)
  const requirement = (action: string): NativeAccessRequirement => ({
    operator: 'all',
    scope: { kind: 'global' },
    requests: [{ kind: 'collection', action, domain, resource }],
  })
  const options = {
    type: 'view',
    children: [
      { type: 'interval', key: 'amounts', encode: { x: 'at', y: 'amount' } },
      { type: 'point', key: 'secrets', encode: { x: 'at', y: 'secret' } },
    ],
  } satisfies UiG2ChartOptions
  const scope = effectScope()
  const input = {
    access,
    view: requirement('read'),
    options,
    series: {
      amounts: { fields: ['at', 'amount'], input: 'window' as const },
      secrets: { fields: ['at', 'secret'], input: 'complete' as const },
    },
    records: {
      domain,
      resource,
      id: (row: Readonly<Record<string, unknown>>) => String(row['id']),
      read: 'read-record',
      fields: { secret: 'read-field' },
    },
    time: { field: 'at', overview: 'amount', permitted: () => [0, 4] as const },
    output: {
      image: requirement('image'),
      data: { requirement: requirement('export'), fields: ['amount'] },
    },
  }
  const tick = () =>
    new Promise<void>((done) => {
      setImmediate(done)
    })
  async function until(check: () => boolean): Promise<void> {
    for (let index = 0; index < 30; index++) {
      if (check()) return
      await tick()
    }
    assert.fail('The chart verification did not reach the expected state.')
  }
  try {
    await until(() => access.readContext().status === 'ready')
    const local = scope.run(() =>
      useGuardedChart({
        ...input,
        source: {
          kind: 'local',
          read: () => ({ kind: 'records', completeness: 'complete', rows: [point, other] }),
        },
      }),
    )
    assert.ok(local)
    const localOverview = () => local.timeline.value?.overview
    await until(() => local.status.value === 'ready')
    const first = local.view.read()
    assert.ok(first)
    assert.ok(first.isCurrent())
    assert.deepEqual(localOverview(), [
      { at: 1, value: 6 },
      { at: 3, value: 11 },
    ])
    assert.deepEqual(local.exportData('amounts')?.rows, [{ amount: 6 }, { amount: 11 }])
    assert.ok(!JSON.stringify(first.options).includes('ignored'))
    const image = local.view.permitImage?.()
    denied.add('image::')
    await notify?.({ kind: 'domain', domain, action: 'image' })
    assert.equal(image?.(), false)
    assert.equal(first.isCurrent(), true)

    denied.add('read-field:a:secret')
    const field = notify?.({
      kind: 'field',
      domain,
      resource,
      action: 'read-field',
      recordId: 'a',
      fieldPath: 'secret',
    })
    assert.equal(first.isCurrent(), false)
    await field
    await until(() => local.status.value === 'partial')
    assert.ok(!JSON.stringify(local.view.read()?.options).includes('secrets'))
    assert.deepEqual(localOverview(), [
      { at: 1, value: 6 },
      { at: 3, value: 11 },
    ])
    denied.add('read-record:b:')
    await notify?.({ kind: 'record', domain, resource, action: 'read-record', recordId: 'b' })
    await until(() => local.status.value === 'partial')
    assert.deepEqual(localOverview(), [{ at: 1, value: 6 }])

    const aggregate = scope.run(() =>
      useGuardedChart({
        access,
        view: requirement('aggregate'),
        options: { type: 'interval', key: 'total', encode: { x: 'bucket', y: 'sum' } },
        series: { total: { fields: ['bucket', 'sum'], input: 'aggregate' } },
        source: {
          kind: 'local',
          read: () => ({ kind: 'aggregate', rows: [{ bucket: 'Week', sum: 99 }] }),
        },
      }),
    )
    assert.ok(aggregate)
    await until(() => aggregate.status.value === 'ready')
    const aggregateFrame = aggregate.view.read()
    assert.ok(aggregateFrame)
    assert.ok(aggregateFrame.isCurrent())
    assert.throws(
      () =>
        bindGuardedChartSpec(
          {
            type: 'view',
            children: [
              {
                type: 'interval',
                key: 'amounts',
                data: { type: 'fetch', value: 'https://example.test' },
              },
            ],
          },
          new Map([['amounts', []]]),
          () => true,
        ),
      TypeError,
    )

    const endpoint = {
      id: 'guarded-chart-check-data',
      path: ['data'],
      method: 'GET',
      policy: 'standard',
      authentication: 'provided',
      response: {
        mode: 'json',
        mimeTypes: ['application/json'],
        schema: guardedChartReportSchema,
      },
    } as const
    const held: ((response: Response) => void)[] = []
    const queries: string[] = []
    const client = createApiClient({
      configuration: { status: 'configured', baseUrl: 'https://example.test/' },
      authorize: () => Promise.resolve({ headers: {}, credentials: 'omit' }),
      fetch(url) {
        queries.push(url.search)
        return new Promise((done) => {
          held.push(done)
        })
      },
    })
    const remote = scope.run(() =>
      useGuardedChart({
        ...input,
        source: {
          kind: 'remote',
          read: {
            client,
            requirement: () => requirement('remote'),
            plan: ({ query }) => ({ status: 'ready', endpoint, input: { query } }),
          },
        },
      }),
    )
    assert.ok(remote)
    assert.equal(await remote.refresh([8, 9]), 'empty')
    assert.equal(await remote.refresh(), 'empty')
    assert.deepEqual(queries, [])
    const older = remote.refresh([-9, 3])
    await until(() => held.length === 1)
    const newer = remote.refresh([1, 4])
    await until(() => held.length === 2)
    held[1]?.(Response.json({ kind: 'records', completeness: 'partial', rows: [point] }))
    assert.equal(await newer, 'partial')
    held[0]?.(Response.json({ kind: 'records', completeness: 'partial', rows: [other] }))
    assert.equal(await older, 'stale')
    assert.deepEqual(queries, ['?from=0&to=3', '?from=1&to=4'])
    assert.deepEqual(remote.timeline.value?.overview, [{ at: 1, value: 6 }])
    assert.equal(aggregateFrame.isCurrent(), true)

    const oldRemote = remote.view.read()
    const during = remote.refresh()
    await until(() => held.length === 3)
    assert.equal(oldRemote?.isCurrent(), true)
    organization = 'second'
    await notify?.({ kind: 'scope' })
    assert.equal(remote.view.read(), undefined)
    held[2]?.(Response.json({ kind: 'records', completeness: 'partial', rows: [other] }))
    assert.equal(await during, 'stale')
    principalId = 'chart-check-other-principal'
    await notify?.({ kind: 'identity' })
    assert.equal(remote.view.read(), undefined)
    assert.equal(aggregateFrame.isCurrent(), false)
    assert.equal(point.secret, 70)
    console.log(
      'Guarded chart: projection, independent aggregate, bounded range, operation and read races passed.',
    )
  } finally {
    scope.stop()
    teardown()
  }
}

if (process.argv.includes('--guarded-browser')) await serveGuardedChartBrowserProbe()
