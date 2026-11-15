import type { Component } from 'vue'
import type { ConsoleMessageKey } from '../../shared/i18n/message-schema'
import ThemePaletteReadout from '../workbench/palette/ThemePaletteReadout.vue'
import type { RegisteredRouteDestination } from '../router/route-input'
import type { DashboardCatalogDefinition, DashboardPanel } from './dashboard-contract'

interface DashboardCatalogPresentation {
  readonly titleKey?: ConsoleMessageKey
  readonly descriptionKey?: ConsoleMessageKey
}
export type DashboardCatalogEntry = DashboardCatalogDefinition &
  DashboardCatalogPresentation &
  (
    | {
        readonly kind: 'builtin'
        readonly category: 'module'
      }
    | {
        readonly kind: 'module'
        readonly category: 'module'
        readonly source: RegisteredRouteDestination
        readonly component: Component
      }
    | {
        readonly kind: 'route'
        readonly category: 'route'
        readonly destination: RegisteredRouteDestination
      }
  )

/**
 * Developer-owned allowlist. A route entry opens a registered page; a module entry
 * explicitly exposes a reusable component from that feature, never the whole route.
 * Persistent documents contain stable entry IDs, not components or arbitrary URLs.
 */
export const dashboardCatalog = [
  {
    id: 'clock',
    kind: 'builtin',
    category: 'module',
    titleKey: 'dashboardBoard.clock',
    size: { wide: { w: 4, h: 2 }, narrow: { h: 2 } },
    panel: { type: 'clock', config: {} },
  },
  {
    id: 'notes',
    kind: 'builtin',
    category: 'module',
    titleKey: 'dashboardBoard.notes',
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
    panel: { type: 'notes', config: { text: '' } },
  },
  {
    id: 'capabilities',
    kind: 'builtin',
    category: 'module',
    titleKey: 'dashboardBoard.capabilities',
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
    panel: { type: 'capabilities', config: {} },
  },
  {
    id: 'chart',
    kind: 'builtin',
    category: 'module',
    titleKey: 'dashboardBoard.catalogTraffic',
    size: { wide: { w: 8, h: 5 }, narrow: { h: 5 } },
    panel: { type: 'chart', config: { series: 'traffic' } },
  },
  {
    id: 'delivery',
    kind: 'builtin',
    category: 'module',
    titleKey: 'dashboardBoard.catalogDelivery',
    size: { wide: { w: 6, h: 5 }, narrow: { h: 5 } },
    panel: { type: 'chart', config: { series: 'delivery' } },
  },
  {
    id: 'theme-palette',
    kind: 'module',
    category: 'module',
    titleKey: 'dashboardBoard.paletteReadout',
    source: { name: 'workbench-colors' },
    size: { wide: { w: 5, h: 4 }, narrow: { h: 4 } },
    component: ThemePaletteReadout,
  },
  {
    id: 'route-forms',
    titleKey: 'dashboardBoard.linkForms',
    kind: 'route',
    category: 'route',
    destination: { name: 'component-form-overview' },
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
  },
  {
    id: 'route-tables',
    titleKey: 'dashboardBoard.linkTables',
    kind: 'route',
    category: 'route',
    destination: { name: 'component-table-overview' },
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
  },
  {
    id: 'route-charts',
    titleKey: 'dashboardBoard.linkCharts',
    kind: 'route',
    category: 'route',
    destination: { name: 'component-charts' },
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
  },
  {
    id: 'route-api',
    titleKey: 'dashboardBoard.linkApi',
    kind: 'route',
    category: 'route',
    destination: { name: 'api-overview' },
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
  },
  {
    id: 'route-motion',
    titleKey: 'dashboardBoard.linkMotion',
    kind: 'route',
    category: 'route',
    destination: { name: 'component-motion' },
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
  },
  {
    id: 'route-time',
    titleKey: 'dashboardBoard.linkDateTime',
    kind: 'route',
    category: 'route',
    destination: { name: 'workbench-date-time' },
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
  },
] as const satisfies readonly DashboardCatalogEntry[]

export function getDashboardCatalogEntry(id: string): DashboardCatalogEntry | undefined {
  return dashboardCatalog.find((entry) => entry.id === id)
}

export function matchesDashboardCatalogEntry(
  entry: DashboardCatalogEntry,
  panel: DashboardPanel,
): boolean {
  if (entry.kind !== 'builtin')
    return panel.type === entry.kind && panel.config.entryId === entry.id
  switch (entry.panel.type) {
    case 'chart':
      return panel.type === 'chart' && panel.config.series === entry.panel.config.series
    case 'clock':
    case 'notes':
    case 'capabilities':
      return panel.type === entry.panel.type
  }
}
