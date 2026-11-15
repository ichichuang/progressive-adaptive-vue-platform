import assert from 'node:assert/strict'
import { createRenderer, defineComponent, nextTick, shallowRef } from 'vue'
import { useUiTable } from '../../packages/ui/src/composables/use-ui-table'
import { tableQuerySharingCodec as codec } from '../../apps/web/src/app/tables/table-query-sharing-example'
import { createTableQueryLinkCodec } from '../../apps/web/src/app/tables/table-query-link'
import { useTableQueryLink } from '../../apps/web/src/app/tables/use-table-query-link'
import type { UiTableController } from '../../packages/ui/src/components/table-contracts'

const renderer = createRenderer<object, object>({
  patchProp: () => undefined,
  insert: () => undefined,
  remove: () => undefined,
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => undefined,
  setElementText: () => undefined,
  parentNode: () => null,
  nextSibling: () => null,
})
function mountQueryLink(options: Parameters<typeof useTableQueryLink>[0]) {
  let binding: ReturnType<typeof useTableQueryLink> | undefined
  const app = renderer.createApp(
    defineComponent({
      setup() {
        binding = useTableQueryLink(options)
        return () => null
      },
    }),
  )
  app.mount({})
  assert.ok(binding)
  return { app, binding }
}
const settle = async () => {
  await nextTick()
  await new Promise<void>((resolve) => setImmediate(resolve))
  await nextTick()
}
const encoded = (title: string) =>
  codec.encode({ page: 1, pageSize: 10, filters: { title }, sorts: [] })

export async function verifyTableQueryRestoration(): Promise<void> {
  let requests = 0
  const table = useUiTable({
    immediate: false,
    schema: {
      id: 'remote-tree-query',
      rowKey: 'id',
      source: { kind: 'remote', request: { api: 'records', method: 'GET' } },
      columns: [{ key: 'title', title: 'Title' }],
      tree: {},
      pagination: { pageSize: 10 },
    },
    filters: { title: 'initial', privateToken: 'private' },
    transport: {
      list: () => {
        requests++
        return Promise.resolve({ rows: [{ id: 1, title: 'Root' }], total: 1 })
      },
    },
  })
  assert.equal(table.query.value.filters['title'], 'initial')
  await table.search({ title: 'searched', privateToken: 'private' })
  assert.equal(requests, 1)
  await table.applyQuery({
    page: 1,
    pageSize: 10,
    filters: { title: 'applied', privateToken: 'private' },
    sorts: [],
  })
  assert.equal(requests, 2)
  const localInput = {
    immediate: false,
    schema: {
      id: 'local-tree-query',
      rowKey: 'id',
      source: { kind: 'local' as const },
      columns: [{ key: 'title', title: 'Title' }],
      tree: {},
    },
  }
  assert.throws(
    () => useUiTable({ ...localInput, filters: { title: 'unsupported' } }),
    /local filters/,
  )
  const local = useUiTable(localInput)
  assert.throws(() => local.search({ title: 'unsupported' }), /local filters/)
  assert.throws(
    () => local.applyQuery({ page: 1, pageSize: 10, filters: { title: 'unsupported' }, sorts: [] }),
    /local filters/,
  )
  assert.deepEqual(local.query.value.filters, {})

  const routeQuery = shallowRef<unknown>(encoded('shared'))
  let pendingNavigation = false
  let rejectNavigation: ((reason: Error) => void) | undefined
  let fail: 'sync' | 'async' | undefined
  let rejectPending: ((reason: Error) => void) | undefined
  const controlled: UiTableController = {
    ...table,
    applyQuery: (query) => {
      if (fail === 'sync') throw new Error('Rejected query')
      if (fail === 'async')
        return new Promise<void>((_resolve, reject) => {
          rejectPending = reject
        })
      return table.applyQuery(query)
    },
  }
  const { app, binding } = mountQueryLink({
    table: controlled,
    codec,
    routeQuery: () => routeQuery.value,
    navigate: (query) => {
      if (pendingNavigation)
        return new Promise<boolean>((_resolve, reject) => {
          rejectNavigation = reject
        })
      routeQuery.value = query
      return Promise.resolve(true)
    },
    href: (query) => JSON.stringify(query),
  })
  await settle()
  assert.equal(requests, 3, 'URL restoration sends exactly one request')
  assert.equal(table.query.value.filters['title'], 'shared')
  assert.equal(table.query.value.filters['privateToken'], 'private')
  assert.ok(!binding.link.value.includes('private'))

  fail = 'sync'
  routeQuery.value = encoded('sync-failure')
  await settle()
  assert.equal(binding.error.value, true)
  fail = undefined
  routeQuery.value = encoded('recovered')
  await settle()
  assert.equal(binding.error.value, false)
  assert.equal(table.query.value.filters['title'], 'recovered')

  fail = 'async'
  routeQuery.value = encoded('async-failure')
  await settle()
  assert.ok(rejectPending)
  rejectPending(new Error('Async restore rejected'))
  await settle()
  assert.equal(binding.error.value, true)

  routeQuery.value = encoded('stale-failure')
  await settle()
  const rejectStale = rejectPending
  fail = undefined
  routeQuery.value = encoded('newer-success')
  await settle()
  assert.equal(binding.error.value, false)
  rejectStale(new Error('Older restore rejected'))
  await settle()
  assert.equal(binding.error.value, false)
  assert.equal(table.query.value.filters['title'], 'newer-success')
  routeQuery.value = { table: '{invalid' }
  await settle()
  assert.equal(binding.error.value, true)
  routeQuery.value = encoded('newer-success')
  await settle()
  assert.equal(binding.error.value, false)
  pendingNavigation = true
  await table.search({ title: 'old-navigation', privateToken: 'private' })
  assert.ok(rejectNavigation)
  await table.search({ title: 'latest-navigation', privateToken: 'private' })
  pendingNavigation = false
  rejectNavigation(new Error('Old navigation rejected'))
  await settle()
  assert.equal(binding.error.value, false)
  assert.equal(codec.decode(routeQuery.value).filters['title'], 'latest-navigation')

  fail = 'async'
  routeQuery.value = encoded('disposed-restore')
  await settle()
  const rejectDisposed = rejectPending
  app.unmount()
  rejectDisposed(new Error('Disposed restoration rejected'))
  await settle()
  assert.equal(binding.error.value, false)
  table.dispose()
  local.dispose()
  await verifyOptionalPublicFilters()
  await verifyResetDuringNavigation()
}

async function verifyOptionalPublicFilters(): Promise<void> {
  // Reuse the application's optional, no-default `table` field schema as a public filter.
  const optionalCodec = createTableQueryLinkCodec(codec.querySchema, {
    sortableKeys: [],
    pageSizes: [10],
    pageSize: 10,
  })
  const publicValue = encoded('optional-filter').table
  assert.ok(publicValue)
  const privateFilters = { privateToken: 'not-for-url', privateScope: { id: 7 } }
  let requests = 0
  let writes = 0
  const table = useUiTable({
    immediate: false,
    schema: {
      id: 'optional-public-query',
      rowKey: 'id',
      source: { kind: 'remote', request: { api: 'records', method: 'GET' } },
      columns: [{ key: 'title', title: 'Title' }],
      pagination: { pageSize: 10 },
    },
    filters: { ...privateFilters, table: publicValue },
    transport: {
      list: () => {
        requests++
        return Promise.resolve({ rows: [], total: 0 })
      },
    },
  })
  const populated = optionalCodec.encode({
    page: 1,
    pageSize: 10,
    sorts: [],
    filters: { table: publicValue },
  })
  const routeQuery = shallowRef<unknown>({})
  const { app, binding } = mountQueryLink({
    table,
    codec: optionalCodec,
    routeQuery: () => routeQuery.value,
    navigate: (query) => {
      writes++
      routeQuery.value = query
      return Promise.resolve(true)
    },
    href: (query) => JSON.stringify(query),
  })
  await settle()
  assert.equal(requests, 1)
  assert.deepEqual(table.query.value.filters, privateFilters)
  assert.deepEqual(routeQuery.value, {})
  assert.equal(writes, 0, 'Omitted public filters must not reappear via history replacement')

  routeQuery.value = populated
  await settle()
  assert.equal(requests, 2)
  assert.deepEqual(table.query.value.filters, { ...privateFilters, table: publicValue })
  routeQuery.value = {}
  await settle()
  assert.equal(requests, 3, 'Back restoration sends one request and clears optional public filters')
  assert.deepEqual(table.query.value.filters, privateFilters)
  assert.equal(writes, 0)
  routeQuery.value = populated
  await settle()
  assert.equal(requests, 4)
  assert.deepEqual(table.query.value.filters, { ...privateFilters, table: publicValue })
  assert.equal(binding.error.value, false)
  assert.ok(!binding.link.value.includes('private'))
  assert.ok(!binding.link.value.includes('not-for-url'))
  assert.equal(writes, 0)
  app.unmount()
  table.dispose()
}

async function verifyResetDuringNavigation(): Promise<void> {
  for (const outcome of ['success', 'denied', 'rejection'] as const) {
    let requests = 0
    const defaults = { title: '', category: null, privateToken: 'private' }
    const table = useUiTable({
      immediate: false,
      filters: defaults,
      schema: {
        id: 'reset-during-navigation',
        rowKey: 'id',
        source: { kind: 'remote', request: { api: 'records', method: 'GET' } },
        columns: [{ key: 'title', title: 'Title' }],
        pagination: { pageSize: 10 },
      },
      transport: {
        list: () => {
          requests++
          return Promise.resolve({ rows: [], total: 0 })
        },
      },
    })
    const routeQuery = shallowRef<unknown>({})
    const navigations: { query: { table?: string }; replace: boolean }[] = []
    let completeFirst: (() => void) | undefined
    const { app, binding } = mountQueryLink({
      table,
      codec,
      routeQuery: () => routeQuery.value,
      navigate: (query, replace) => {
        navigations.push({ query, replace })
        if (navigations.length === 1) {
          return new Promise<boolean>((resolve, reject) => {
            completeFirst = () => {
              if (outcome === 'rejection') reject(new Error('Navigation failed'))
              else {
                if (outcome === 'success') routeQuery.value = query
                resolve(outcome === 'success')
              }
            }
          })
        }
        routeQuery.value = query
        return Promise.resolve(true)
      },
      href: (query) => JSON.stringify(query),
    })
    await settle()
    assert.equal(requests, 1)
    await table.search({ ...defaults, title: 'A' })
    await table.search({ ...defaults, title: 'B' })
    await table.reset()
    assert.equal(requests, 4)
    assert.deepEqual(routeQuery.value, {})
    assert.deepEqual(table.query.value.filters, defaults)
    assert.ok(completeFirst)
    completeFirst()
    await settle()
    assert.deepEqual(table.query.value.filters, defaults)
    assert.deepEqual(routeQuery.value, {})
    assert.equal(requests, 4, 'Navigation echoes must not cause duplicate table requests')
    assert.deepEqual(
      navigations,
      [
        { query: encoded('A'), replace: false },
        { query: {}, replace: false },
      ],
      'Latest reset supersedes queued B for successful, denied, and rejected navigation',
    )
    assert.equal(binding.error.value, false)
    assert.ok(!binding.link.value.includes('private'))
    if (outcome === 'success') {
      // Simulate Back then Forward through the successfully published history entries.
      routeQuery.value = encoded('A')
      await settle()
      assert.equal(table.query.value.filters.title, 'A')
      assert.equal(requests, 5)
      routeQuery.value = {}
      await settle()
      assert.deepEqual(table.query.value.filters, defaults)
      assert.equal(requests, 6)
      assert.equal(navigations.length, 2, 'History restores do not add or replace entries')
    }
    app.unmount()
    table.dispose()
  }
}
