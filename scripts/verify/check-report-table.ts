import assert from 'node:assert/strict'
import { useUiTable } from '../../packages/ui/src/composables/use-ui-table'
import { captureUiTableReport } from '../../packages/ui/src/components/report-table'
import type { UiReportTableOptions } from '../../packages/ui/src/components/report-contracts'

export async function verifyReportTable(): Promise<void> {
  const options: UiReportTableOptions = {
    title: 'Report',
    scope: 'page',
    empty: '—',
    boolean: (value) => (value ? 'Yes' : 'No'),
  }
  const table = useUiTable({
    schema: {
      id: 'report',
      rowKey: 'id',
      source: { kind: 'local' },
      selection: 'multiple',
      pagination: { pageSize: 2, pageSizes: [2, 4] },
      columns: [
        { key: 'name', title: 'Name' },
        {
          key: 'amount',
          title: 'Amount',
          kind: 'number',
          format: { decimalPlaces: 2, prefix: '$' },
        },
        { key: 'hidden', title: 'Secret', hidden: true },
      ],
      csvExport: { fileName: 'report.csv', scopes: ['page', 'selected'] },
    },
    rows: [
      { id: 1, name: 'A', amount: 3, hidden: 'PRIVATE' },
      { id: 2, name: 'B', amount: 4, hidden: 'PRIVATE' },
      { id: 3, name: 'C', amount: 5, hidden: 'PRIVATE' },
    ],
  })
  await table.refresh()
  const first = captureUiTableReport(table, options)
  assert.deepEqual(first.rows, [
    ['A', '$3.00'],
    ['B', '$4.00'],
  ])
  assert.equal(first.loadedCount, 2)
  assert.equal(first.total, 3)
  assert.equal(JSON.stringify(first).includes('PRIVATE'), false)
  assert.equal(Object.isFrozen(first.rows[0]), true)
  table.setSelection([2])
  const selected = captureUiTableReport(table, { ...options, scope: 'selected' })
  assert.deepEqual(selected.rows, [['B', '$4.00']])
  assert.equal(selected.selectedCount, 1)
  assert.equal(table.exportCsv('selected').rowCount, 1)
  table.moveColumn('amount', 'up')
  assert.deepEqual(
    captureUiTableReport(table, options).columns.map((c) => c.key),
    ['amount', 'name'],
  )
  await table.setPage(2)
  assert.equal(captureUiTableReport(table, options).rows.length, 1)
  assert.deepEqual(
    first.rows,
    [
      ['A', '$3.00'],
      ['B', '$4.00'],
    ],
    'captured snapshots are detached',
  )
  assert.throws(() => captureUiTableReport(table, { ...options, scope: 'selected' }))
  table.dispose()
  assert.throws(() => captureUiTableReport(table, options))
  const tree = useUiTable({
    schema: {
      id: 'tree-report',
      rowKey: 'id',
      source: { kind: 'local' },
      tree: {},
      columns: [{ key: 'name', title: 'Name' }],
    },
    rows: [{ id: 1, name: 'Parent', children: [{ id: 2, name: 'Child' }] }],
  })
  await tree.refresh()
  assert.deepEqual(captureUiTableReport(tree, options).rows, [['Parent'], ['Child']])
  assert.throws(() => tree.exportCsv('page'), 'report capture must not implicitly enable CSV')
  tree.dispose()
  const structured = useUiTable({
    schema: {
      id: 'structured-report',
      rowKey: 'id',
      source: { kind: 'local' },
      columns: [{ key: 'data', title: 'Data' }],
    },
    rows: [{ id: 1, data: { secret: 'not serialized' } }],
  })
  await structured.refresh()
  assert.throws(() => captureUiTableReport(structured, options))
  assert.deepEqual(
    captureUiTableReport(structured, { ...options, formatCell: () => 'Explicit label' }).rows,
    [['Explicit label']],
  )
  assert.throws(() =>
    captureUiTableReport(structured, {
      ...options,
      formatCell: () => {
        structured.dispose()
        return 'Late'
      },
    }),
  )
  const mutating = useUiTable({
    schema: {
      id: 'mutating-report',
      rowKey: 'id',
      source: { kind: 'local' },
      selection: 'multiple',
      columns: [{ key: 'name', title: 'Name' }],
    },
    rows: [{ id: 1, name: 'A' }],
  })
  await mutating.refresh()
  assert.throws(
    () =>
      captureUiTableReport(mutating, {
        ...options,
        formatCell: () => {
          mutating.setSelection([1])
          return 'Changed'
        },
      }),
    /changed/u,
  )
  mutating.dispose()
  structured.dispose()
}
