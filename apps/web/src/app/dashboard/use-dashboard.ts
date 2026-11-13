import { computed, shallowRef } from 'vue'
import type { UiDashboardItemPosition } from '@platform/ui'
import {
  createDefaultDashboard,
  dashboardSchema,
  useDashboardStoragePort,
  type DashboardDocument,
  type DashboardPanel,
} from './dashboard-contract'

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
    if (JSON.stringify(result.data) === JSON.stringify(document.value)) return true
    if (remember) history.value = [...history.value.slice(-19), document.value]
    // Preserve unaffected widget identities: typing a note must not replay every chart.
    const previous = document.value
    document.value = {
      ...result.data,
      panels: result.data.panels.map((panel) => {
        const existing = previous.panels.find((item) => item.id === panel.id)
        return existing && JSON.stringify(existing) === JSON.stringify(panel) ? existing : panel
      }),
      layouts: {
        wide:
          JSON.stringify(previous.layouts.wide) === JSON.stringify(result.data.layouts.wide)
            ? previous.layouts.wide
            : result.data.layouts.wide,
        narrow:
          JSON.stringify(previous.layouts.narrow) === JSON.stringify(result.data.layouts.narrow)
            ? previous.layouts.narrow
            : result.data.layouts.narrow,
      },
    }
    failure.value = storage.write(document.value).status !== 'saved'
    return true
  }
  function updateLayout(mode: 'wide' | 'narrow', layout: readonly UiDashboardItemPosition[]): void {
    commit({ ...document.value, layouts: { ...document.value.layouts, [mode]: layout } })
  }
  function updatePanel(panel: DashboardPanel): void {
    commit({
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
    const wideY = Math.max(0, ...document.value.layouts.wide.map((item) => item.y + item.h))
    const narrowY = Math.max(0, ...document.value.layouts.narrow.map((item) => item.y + item.h))
    const height = type === 'chart' ? 6 : 4
    return commit({
      ...document.value,
      panels: [...document.value.panels, panel],
      layouts: {
        wide: [
          ...document.value.layouts.wide,
          { id, x: 0, y: wideY, w: type === 'chart' ? 8 : 4, h: height },
        ],
        narrow: [...document.value.layouts.narrow, { id, x: 0, y: narrowY, w: 1, h: height }],
      },
    })
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
    updateLayout,
    updatePanel,
    add,
    remove,
    undo,
    reset,
    retry,
  }
}
