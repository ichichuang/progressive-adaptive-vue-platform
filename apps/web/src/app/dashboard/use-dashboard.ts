import { computed, shallowRef } from 'vue'
import type { UiDashboardItemPosition } from '@platform/ui'
import {
  createDefaultDashboard,
  dashboardSchema,
  useDashboardStoragePort,
  type DashboardDocument,
  type DashboardPanel,
  type DashboardStyle,
  type DashboardEntrance,
} from './dashboard-contract'

function samePanel(left: DashboardPanel, right: DashboardPanel): boolean {
  if (
    left.id !== right.id ||
    left.type !== right.type ||
    left.title !== right.title ||
    left.tone !== right.tone ||
    left.entrance !== right.entrance
  )
    return false
  switch (left.type) {
    case 'chart':
      return right.type === 'chart' && left.config.series === right.config.series
    case 'notes':
      return right.type === 'notes' && left.config.text === right.config.text
    case 'capabilities':
      return (
        right.type === 'capabilities' &&
        (left.config.destinations === right.config.destinations ||
          (left.config.destinations !== undefined &&
            left.config.destinations.length === right.config.destinations?.length &&
            left.config.destinations.every(
              (name, index) => name === right.config.destinations?.[index],
            )))
      )
    case 'clock':
      return true
  }
}

function reuseLayout(
  previous: DashboardDocument['layouts']['wide'],
  incoming: DashboardDocument['layouts']['wide'],
): DashboardDocument['layouts']['wide'] {
  const positions = new Map(previous.map((item) => [item.id, item]))
  let unchanged = incoming.length === previous.length
  const next = incoming.map((item) => {
    const existing = positions.get(item.id)
    if (
      existing?.x === item.x &&
      existing.y === item.y &&
      existing.w === item.w &&
      existing.h === item.h
    )
      return existing
    unchanged = false
    return item
  })
  // Layout order carries no meaning; GridStack may report nodes in gesture order.
  return unchanged ? previous : next
}

function firstPosition(
  id: string,
  layout: readonly UiDashboardItemPosition[],
  columns: number,
  w: number,
  h: number,
): UiDashboardItemPosition | undefined {
  for (let y = 0; y + h <= 128; y += 1) {
    for (let x = 0; x + w <= columns; x += 1) {
      if (
        layout.every(
          (item) =>
            x + w <= item.x || x >= item.x + item.w || y + h <= item.y || y >= item.y + item.h,
        )
      )
        return { id, x, y, w, h }
    }
  }
  return undefined
}

export function useDashboard() {
  const storage = useDashboardStoragePort()
  const restored = storage.read()
  const document = shallowRef<DashboardDocument>(
    restored.status === 'found' ? restored.document : createDefaultDashboard(),
  )
  const readFailure = shallowRef(restored.status === 'unusable')
  const failure = shallowRef(false)
  const history = shallowRef<DashboardDocument[]>([])
  function commit(candidate: unknown, remember = true): boolean {
    if (readFailure.value) return false
    const result = dashboardSchema.safeParse(candidate)
    if (!result.success) return false
    const previous = document.value
    const existingPanels = new Map(previous.panels.map((panel) => [panel.id, panel]))
    const panels = result.data.panels.map((panel) => {
      const existing = existingPanels.get(panel.id)
      return existing && samePanel(existing, panel) ? existing : panel
    })
    const next = {
      ...result.data,
      panels:
        panels.length === previous.panels.length &&
        panels.every((panel, index) => panel === previous.panels[index])
          ? previous.panels
          : panels,
      layouts: {
        wide: reuseLayout(previous.layouts.wide, result.data.layouts.wide),
        narrow: reuseLayout(previous.layouts.narrow, result.data.layouts.narrow),
      },
    }
    if (
      next.style === previous.style &&
      next.entrance === previous.entrance &&
      next.panels === previous.panels &&
      next.layouts.wide === previous.layouts.wide &&
      next.layouts.narrow === previous.layouts.narrow
    )
      return true
    if (remember) history.value = [...history.value.slice(-19), previous]
    // Preserve unaffected widget identities: moving a panel must not replay its chart.
    document.value = next
    failure.value = storage.write(document.value).status !== 'saved'
    return true
  }
  function setStyle(style: DashboardStyle): boolean {
    return commit({ ...document.value, style })
  }
  function setEntrance(entrance: DashboardEntrance): boolean {
    return commit({ ...document.value, entrance })
  }
  function updateLayout(
    mode: 'wide' | 'narrow',
    layout: readonly UiDashboardItemPosition[],
  ): boolean {
    return commit({ ...document.value, layouts: { ...document.value.layouts, [mode]: layout } })
  }
  function updatePanel(panel: DashboardPanel): boolean {
    if (!document.value.panels.some((item) => item.id === panel.id)) return false
    return commit({
      ...document.value,
      panels: document.value.panels.map((item) => (item.id === panel.id ? panel : item)),
    })
  }
  function remove(id: string): void {
    commit({
      ...document.value,
      panels: document.value.panels.filter((panel) => panel.id !== id),
      layouts: {
        wide: document.value.layouts.wide.filter((item) => item.id !== id),
        narrow: document.value.layouts.narrow.filter((item) => item.id !== id),
      },
    })
  }
  function add(type: DashboardPanel['type']): boolean {
    if (document.value.panels.length >= 24) return false
    let sequence = 1
    while (document.value.panels.some((panel) => panel.id === `panel-${String(sequence)}`))
      sequence += 1
    const id = `panel-${String(sequence)}`
    const panel: DashboardPanel =
      type === 'chart'
        ? { id, type, config: { series: 'traffic' } }
        : type === 'notes'
          ? { id, type, config: { text: '' } }
          : { id, type, config: {} }
    const height = type === 'chart' ? 5 : type === 'clock' ? 2 : 3
    const wide = firstPosition(
      id,
      document.value.layouts.wide,
      12,
      type === 'chart' ? 8 : 4,
      height,
    )
    const narrow = firstPosition(id, document.value.layouts.narrow, 1, 1, height)
    if (!wide || !narrow) return false
    return commit({
      ...document.value,
      panels: [...document.value.panels, panel],
      layouts: {
        wide: [...document.value.layouts.wide, wide],
        narrow: [...document.value.layouts.narrow, narrow],
      },
    })
  }

  function restoreLayout(): boolean {
    if (readFailure.value) return false
    const preset = createDefaultDashboard()
    const panels = document.value.panels
    const defaults = new Set(
      preset.panels
        .filter((item) => panels.some((panel) => panel.id === item.id && panel.type === item.type))
        .map((item) => item.id),
    )
    const layouts: DashboardDocument['layouts'] = {
      wide: preset.layouts.wide.filter((item) => defaults.has(item.id)),
      narrow: preset.layouts.narrow.filter((item) => defaults.has(item.id)),
    }
    for (const panel of panels) {
      if (defaults.has(panel.id)) continue
      const height = panel.type === 'chart' ? 5 : panel.type === 'clock' ? 2 : 3
      const wide = firstPosition(panel.id, layouts.wide, 12, panel.type === 'chart' ? 8 : 4, height)
      const narrow = firstPosition(panel.id, layouts.narrow, 1, 1, height)
      if (!wide || !narrow) return false
      layouts.wide.push(wide)
      layouts.narrow.push(narrow)
    }
    return commit({ ...document.value, layouts })
  }

  function undo(): void {
    const previous = history.value.at(-1)
    if (!previous) return
    history.value = history.value.slice(0, -1)
    commit(previous, false)
  }
  function reset(): void {
    readFailure.value = false
    const preset = createDefaultDashboard()
    if (JSON.stringify(preset) === JSON.stringify(document.value)) retry()
    else commit(preset)
  }
  function retryRead(): void {
    const result = storage.read()
    if (result.status === 'unusable') return
    document.value = result.status === 'found' ? result.document : createDefaultDashboard()
    history.value = []
    readFailure.value = false
    failure.value = false
  }
  function retry(): void {
    if (readFailure.value) return
    failure.value = storage.write(document.value).status !== 'saved'
  }
  return {
    document: computed(() => document.value),
    readFailure: computed(() => readFailure.value),
    retryRead,
    failure: computed(() => failure.value),
    canUndo: computed(() => history.value.length > 0),
    setStyle,
    setEntrance,
    updateLayout,
    updatePanel,
    add,
    remove,
    undo,
    restoreLayout,
    reset,
    retry,
  }
}
