import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { effectScope, shallowRef } from 'vue'
import type { UiTableAccess, UiTableSchema } from '../../packages/ui/src/components/table-contracts'
import { useUiTable } from '../../packages/ui/src/composables/use-ui-table'
import { serveGuardedTableBrowserProbe } from './guarded-table-browser-probe'

export async function verifyGuardedTable(): Promise<void> {
  const context = shallowRef<object | undefined>({})
  const version = shallowRef(0)
  const secret = shallowRef(true)
  const denied = new Set<string>()
  const original = [
    { id: 'a', label: 'A', confidential: 25 },
    { id: 'b', label: 'B', confidential: 40 },
  ] as const
  const schema = {
    id: 'guarded-table-check',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [
      { key: 'label', title: 'Label', sortable: true },
      { key: 'confidential', title: 'Confidential', sortable: true, kind: 'number' },
    ],
    selection: 'multiple',
    csvExport: { fileName: 'items.csv', scopes: ['page', 'selected'] },
    summary: [
      {
        key: 'totals',
        cells: {
          label: { kind: 'aggregate', scope: 'filtered', operation: 'count' },
          confidential: { kind: 'aggregate', scope: 'filtered', operation: 'sum' },
        },
      },
    ],
  } satisfies UiTableSchema
  const access: UiTableAccess = {
    context: () => context.value,
    revision: () => version.value,
    state: () => (context.value ? 'ready' : 'unresolved'),
    column: (key) => key !== 'confidential' || secret.value,
    filter: (key) => key !== 'confidential' || secret.value,
    summary: () => false,
    local: () => original,
    row(row) {
      if (typeof row['id'] !== 'string' || denied.has(row['id'])) return
      return {
        id: row['id'],
        label: row['label'] ?? '',
        ...(secret.value && row['confidential'] !== undefined
          ? { confidential: row['confidential'] }
          : {}),
      }
    },
    output(kind) {
      if (kind === 'copy') return
      const before = version.value
      return { fields: ['label', 'confidential'], isCurrent: () => before === version.value }
    },
  }
  const scope = effectScope()
  try {
    const table = scope.run(() => useUiTable({ schema, access }))
    assert.ok(table)
    const confidentialSummary = (): unknown =>
      table.summaryRows.value[0]?.cells['confidential']?.value
    await table.setSort({ key: 'confidential', order: 'descend' })
    assert.deepEqual(
      table.rows.value.map(({ id }) => id),
      ['b', 'a'],
    )
    assert.equal(confidentialSummary(), 65)
    table.setSelection(['a', 'b'])
    denied.add('b')
    version.value++
    assert.deepEqual(table.selectedKeys.value, ['a'])
    assert.equal(confidentialSummary(), 25)
    await table.search({ confidential: 25 })
    secret.value = false
    version.value++
    assert.deepEqual(table.query.value.sorts, [])
    assert.deepEqual(table.query.value.filters, {})
    assert.deepEqual(
      table.columns.value.map(({ key }) => key),
      ['label'],
    )
    assert.deepEqual(table.rows.value, [{ id: 'a', label: 'A' }])
    assert.equal(confidentialSummary(), undefined)
    assert.throws(() => {
      table.setColumnWidth('confidential', 100)
    })
    assert.throws(() => table.captureRows('page'))
    assert.throws(() => table.exportCsv('page'))
    assert.ok(table.deliverOutput)
    let csv = ''
    assert.equal(
      table.deliverOutput('copy', 'page', () => assert.fail('Unexpected copy')),
      false,
    )
    assert.equal(
      table.deliverOutput('csv', 'page', (file) => {
        csv = file.content
      }),
      true,
    )
    assert.equal(csv, '\uFEFF"Label"\r\n"A"\r\n')
    assert.equal(original[0].confidential, 25)
    context.value = undefined
    assert.deepEqual(table.rows.value, [])
    assert.deepEqual(table.selectedKeys.value, [])
    assert.equal(
      table.deliverOutput('csv', 'page', () => assert.fail('Stale output')),
      false,
    )
  } finally {
    scope.stop()
  }
  const remoteScope = effectScope()
  type PageReceipt = NonNullable<Awaited<ReturnType<NonNullable<UiTableAccess['read']>>>>
  let completeRead: ((response: PageReceipt) => void) | undefined
  try {
    context.value = {}
    const remote = remoteScope.run(() =>
      useUiTable({
        schema: {
          ...schema,
          source: { kind: 'remote', request: { api: 'records', method: 'GET' } },
          summary: [{ key: 'totals', cells: { label: { kind: 'value', from: 'count' } } }],
        },
        immediate: false,
        access: {
          ...access,
          summary: (path) => path === 'count',
          read: () =>
            new Promise((resolve) => {
              completeRead = resolve
            }),
        },
      }),
    )
    assert.ok(remote)
    const refresh = remote.refresh()
    const firstOrigin = context.value
    completeRead?.({
      page: { rows: [{ id: 'a', label: 'A' }], total: 47, summary: { count: 47 } },
      isCurrent: () => context.value === firstOrigin,
    })
    await refresh
    assert.equal(remote.total.value, 47)
    assert.equal(remote.summaryRows.value[0]?.cells['label']?.value, 47)
    const selection = remote.setSelection(['a'])
    assert.equal(selection, true)
    const delayed = remote.refresh()
    context.value = {}
    completeRead?.({
      page: { rows: [{ id: 'a', label: 'Stale row' }], total: 99, summary: { count: 99 } },
      isCurrent: () => context.value === firstOrigin,
    })
    await delayed
    assert.deepEqual(remote.rows.value, [])
    assert.equal(remote.total.value, 0)
    assert.deepEqual(remote.selectedKeys.value, [])
    assert.equal(remote.totalKnown?.value, false)
  } finally {
    remoteScope.stop()
  }
  console.log('Guarded table: field/record reconciliation, selection, summaries and output passed.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--browser')) await serveGuardedTableBrowserProbe()
  else await verifyGuardedTable()
}
