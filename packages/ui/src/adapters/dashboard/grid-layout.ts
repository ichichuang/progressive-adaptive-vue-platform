import type { UiDashboardItemPosition } from '../../dashboard/dashboard-contracts'

/** Order is Vue-owned; compare only engine geometry, not vendor node ordering. */
export function dashboardLayoutKey(layout: readonly UiDashboardItemPosition[]): string {
  return JSON.stringify([...layout].sort((a, b) => a.id.localeCompare(b.id)))
}

/** A native drag loop may scroll only the verified PAVP viewport, never an ancestor/page. */
export function dashboardScrollIsContained(
  boundaries: readonly {
    readonly owned: boolean
    readonly overflowY: string
    readonly range: number
  }[],
): boolean {
  let owned = false
  for (const boundary of boundaries) {
    const scrollable = boundary.overflowY === 'auto' || boundary.overflowY === 'scroll'
    if (boundary.owned) {
      if (!scrollable) return false
      owned = true
    } else if (scrollable && boundary.range > 0) return false
  }
  return owned
}
