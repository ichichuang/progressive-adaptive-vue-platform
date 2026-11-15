import type { ConsoleTranslate } from '../../../shared/i18n'
import { getRoutePresentation } from '../../router/route-registry'
import {
  getDashboardCatalogEntry,
  type DashboardCatalogEntry,
} from '../../dashboard/dashboard-catalog'
import type { DashboardPanel } from '../../dashboard/dashboard-contract'

export type DashboardLibraryPreview =
  'clock' | 'capabilities' | 'chart' | 'comparison' | 'notes' | 'route' | 'module'

const builtinLabels = {
  clock: 'dashboardBoard.clock',
  capabilities: 'dashboardBoard.capabilities',
  chart: 'dashboardBoard.chart',
  notes: 'dashboardBoard.notes',
} as const

export function catalogCardTitle(entry: DashboardCatalogEntry, t: ConsoleTranslate): string {
  if (entry.titleKey !== undefined) return t(entry.titleKey)
  if (entry.category === 'route') return getRoutePresentation(entry.destination.name, t).title
  if ('panel' in entry) return t(builtinLabels[entry.panel.type])
  return t('dashboardBoard.libraryModules')
}

export function dashboardCardTitle(panel: DashboardPanel, t: ConsoleTranslate): string {
  if (panel.title !== undefined) return panel.title
  if (panel.type !== 'route' && panel.type !== 'module') return t(builtinLabels[panel.type])
  const entry = getDashboardCatalogEntry(panel.config.entryId)
  if (entry !== undefined) return catalogCardTitle(entry, t)
  return t(
    panel.type === 'route' ? 'dashboardBoard.libraryRoutes' : 'dashboardBoard.libraryModules',
  )
}
