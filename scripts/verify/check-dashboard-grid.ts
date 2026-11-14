import assert from 'node:assert/strict'
import {
  dashboardScrollIsContained,
  dashboardLayoutKey,
} from '../../packages/ui/src/adapters/dashboard/grid-layout'

export function verifyDashboardGrid(): void {
  const layout = [
    { id: 'clock', x: 0, y: 0, w: 4, h: 4 },
    { id: 'chart', x: 4, y: 0, w: 8, h: 6 },
  ]
  assert.equal(dashboardLayoutKey(layout), dashboardLayoutKey([...layout].reverse()))
  assert.equal(layout[0]?.id, 'clock', 'Comparing engine geometry must not reorder Vue widgets.')
  assert.notEqual(
    dashboardLayoutKey(layout),
    dashboardLayoutKey(layout.map((item) => ({ ...item, y: 1 }))),
  )
  assert.notEqual(dashboardLayoutKey(layout), dashboardLayoutKey(layout.slice(0, 1)))
  const own = { owned: true, overflowY: 'auto', range: 100 }
  assert.equal(dashboardScrollIsContained([own]), true)
  assert.equal(dashboardScrollIsContained([{ ...own, range: 0 }]), true)
  assert.equal(dashboardScrollIsContained([]), false)
  assert.equal(dashboardScrollIsContained([{ ...own, overflowY: 'visible' }]), false)
  const competing = { owned: false, overflowY: 'auto', range: 10 }
  assert.equal(dashboardScrollIsContained([competing, own]), false)
  assert.equal(dashboardScrollIsContained([own, competing]), false)
  assert.equal(dashboardScrollIsContained([own, { ...competing, range: 0 }]), true)
  console.log('Dashboard geometry echo comparison and contained native scroll policy passed.')
}
