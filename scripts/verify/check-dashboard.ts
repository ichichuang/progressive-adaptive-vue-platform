import { verifyDashboardGrid } from './check-dashboard-grid'
import { createAndReadyStorage } from '../../apps/web/src/app/storage/storage-lifecycle'
import { coreRuntimeConfigurationSchema } from '../../apps/web/src/app/config/runtime-configuration-contract'
import assert from 'node:assert/strict'
import { createApp } from 'vue'
import {
  createDefaultDashboard,
  dashboardSchema,
  dashboardStyleIds,
  dashboardEntranceIds,
  dashboardToneIds,
  dashboardStoragePortKey,
  type DashboardCatalogDefinition,
  type DashboardDocument,
  type DashboardStoragePort,
} from '../../apps/web/src/app/dashboard/dashboard-contract'
import { useDashboard } from '../../apps/web/src/app/dashboard/use-dashboard'

const catalog = [
  {
    id: 'clock',
    kind: 'builtin',
    size: { wide: { w: 4, h: 2 }, narrow: { h: 2 } },
    panel: { type: 'clock', config: {} },
  },
  {
    id: 'notes',
    kind: 'builtin',
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
    panel: { type: 'notes', config: { text: '' } },
  },
  {
    id: 'capabilities',
    kind: 'builtin',
    size: { wide: { w: 4, h: 3 }, narrow: { h: 3 } },
    panel: { type: 'capabilities', config: {} },
  },
  {
    id: 'chart',
    kind: 'builtin',
    size: { wide: { w: 8, h: 5 }, narrow: { h: 5 } },
    panel: { type: 'chart', config: { series: 'traffic' } },
  },
  {
    id: 'delivery',
    kind: 'builtin',
    size: { wide: { w: 6, h: 5 }, narrow: { h: 4 } },
    panel: { type: 'chart', config: { series: 'delivery' } },
  },
  { id: 'route-time', kind: 'route', size: { wide: { w: 3, h: 2 }, narrow: { h: 2 } } },
  { id: 'theme-palette', kind: 'module', size: { wide: { w: 5, h: 4 }, narrow: { h: 3 } } },
] as const satisfies readonly DashboardCatalogDefinition[]
function createDashboard() {
  return useDashboard(catalog)
}
import { createDashboardLayoutStorage } from '../../apps/web/src/app/storage/dashboard-layout-storage'
import { createStorageErrorAdapter } from '../../apps/web/src/app/storage/storage-error'
import { createStartupAttemptId } from '../../apps/web/src/app/bootstrap/lifecycle'

function createProbeApp() {
  return createApp({ render: () => null })
}

export function verifyDashboard(): void {
  verifyDashboardGrid()
  const original = createDefaultDashboard()
  assert.equal(dashboardSchema.safeParse(original).success, true)
  assert.equal(
    original.layouts.narrow.find((item) => item.id === 'clock')?.h,
    2,
    'New narrow clocks should use compact geometry.',
  )
  assert.ok(original.panels.some((panel) => panel.type === 'chart'))
  const customDocument = structuredClone(original)
  customDocument.layouts.wide = [
    { id: 'capabilities', x: 0, y: 0, w: 7, h: 3 },
    { id: 'notes', x: 7, y: 0, w: 5, h: 5 },
    { id: 'clock', x: 0, y: 3, w: 4, h: 2 },
    { id: 'chart', x: 0, y: 5, w: 8, h: 5 },
  ]
  customDocument.layouts.narrow = [
    { id: 'clock', x: 0, y: 0, w: 1, h: 4 },
    { id: 'capabilities', x: 0, y: 4, w: 1, h: 4 },
    { id: 'chart', x: 0, y: 8, w: 1, h: 6 },
    { id: 'notes', x: 0, y: 14, w: 1, h: 4 },
  ]
  assert.equal(
    dashboardSchema.safeParse(customDocument).success,
    true,
    'Legacy chart documents remain valid.',
  )
  const restoredApp = createProbeApp()
  restoredApp.provide(dashboardStoragePortKey, {
    read: () => ({ status: 'found', document: customDocument }),
    write: () => assert.fail('Restoring saved geometry must not rewrite it.'),
  } satisfies DashboardStoragePort)
  assert.equal(restoredApp.runWithContext(createDashboard).document.value, customDocument)

  const invalid: unknown[] = [
    { ...original, extra: true },
    {
      ...original,
      layouts: {
        ...original.layouts,
        wide: original.layouts.wide.map((item) => ({ ...item, x: 0, y: 0 })),
      },
    },
    { ...original, schemaVersion: 2 },
    { ...original, panels: [...original.panels, original.panels[0]] },
    { ...original, panels: [{ id: 'clock', type: 'script', config: {} }] },
    {
      ...original,
      panels: original.panels.map((panel) => ({ ...panel, config: { script: 'alert(1)' } })),
    },
    { ...original, layouts: { ...original.layouts, wide: [] } },
    {
      ...original,
      layouts: {
        ...original.layouts,
        narrow: original.layouts.narrow.map((item) => ({ ...item, w: 2 })),
      },
    },
    {
      ...original,
      layouts: {
        ...original.layouts,
        wide: original.layouts.wide.map((item) => ({ ...item, y: 128 })),
      },
    },
    {
      ...original,
      layouts: {
        ...original.layouts,
        wide: original.layouts.wide.map((item) => ({ ...item, h: 1 })),
      },
    },
  ]
  for (const value of invalid) assert.equal(dashboardSchema.safeParse(value).success, false)

  for (const panel of [
    { id: 'notes', type: 'notes', title: '', config: { text: '' } },
    { id: 'notes', type: 'notes', title: 'x'.repeat(61), config: { text: '' } },
    { id: 'notes', type: 'notes', tone: 'red', config: { text: '' } },
    { id: 'capabilities', type: 'capabilities', config: { destinations: ['https://example.com'] } },
    {
      id: 'capabilities',
      type: 'capabilities',
      config: { destinations: ['api-overview', 'api-overview'] },
    },
  ]) {
    assert.equal(
      dashboardSchema.safeParse({
        ...original,
        panels: original.panels.map((item) => (item.id === panel.id ? panel : item)),
      }).success,
      false,
    )
  }
  for (const style of dashboardStyleIds) {
    for (const entrance of dashboardEntranceIds) {
      assert.equal(dashboardSchema.safeParse({ ...original, style, entrance }).success, true)
    }
  }
  for (const tone of dashboardToneIds) {
    for (const entrance of dashboardEntranceIds) {
      assert.equal(
        dashboardSchema.safeParse({
          ...original,
          panels: original.panels.map((panel) => ({ ...panel, tone, entrance })),
        }).success,
        true,
      )
    }
  }
  for (const invalidPresentation of [{ style: 'neon' }, { entrance: 'script' }]) {
    assert.equal(dashboardSchema.safeParse({ ...original, ...invalidPresentation }).success, false)
  }
  assert.equal(
    dashboardSchema.safeParse({
      ...original,
      panels: original.panels.map((panel) => ({ ...panel, entrance: 'custom-script' })),
    }).success,
    false,
  )
  let saved: DashboardDocument | undefined
  let writable = true
  let writes = 0
  const port: DashboardStoragePort = {
    read: () => ({ status: 'missing' }),
    write: (document) => {
      writes += 1
      if (!writable) return { status: 'failed' }
      saved = structuredClone(document)
      return { status: 'saved' }
    },
  }
  const app = createProbeApp()
  app.provide(dashboardStoragePortKey, port)
  const controller = app.runWithContext(createDashboard)
  assert.equal(controller.canUndo.value, false)
  const initialDocument = controller.document.value
  assert.equal(
    controller.updateLayout('wide', structuredClone(initialDocument.layouts.wide).reverse()),
    true,
  )
  assert.equal(controller.document.value, initialDocument)
  assert.equal(writes, 0, 'Equivalent layout order must not trigger storage or undo.')
  assert.equal(controller.canUndo.value, false)
  assert.equal(
    controller.updateLayout(
      'wide',
      initialDocument.layouts.wide.map((item) => ({ ...item, x: 0, y: 0 })),
    ),
    false,
  )
  assert.equal(controller.document.value, initialDocument)
  assert.equal(writes, 0)
  const shifted = initialDocument.layouts.wide.map((item) => ({ ...item, y: item.y + 1 }))
  assert.equal(controller.updateLayout('wide', shifted), true)
  assert.equal(writes, 1, 'One settled layout update must write once.')
  assert.equal(controller.document.value.panels, initialDocument.panels)
  assert.equal(controller.document.value.layouts.narrow, initialDocument.layouts.narrow)
  const shiftedDocument = controller.document.value
  assert.equal(controller.updateLayout('wide', structuredClone(shifted).reverse()), true)
  assert.equal(controller.document.value, shiftedDocument)
  assert.equal(writes, 1, 'Duplicate grid notifications must not create writes or history.')
  controller.undo()
  assert.deepEqual(controller.document.value, original)
  assert.equal(controller.canUndo.value, false, 'Duplicate layouts must not add undo steps.')
  const beforeNote = controller.document.value
  controller.updatePanel({ id: 'notes', type: 'notes', config: { text: 'Preserve other widgets' } })
  assert.equal(controller.document.value.panels[2], beforeNote.panels[2])
  assert.equal(controller.document.value.layouts.wide, beforeNote.layouts.wide)
  assert.equal(controller.document.value.layouts.narrow, beforeNote.layouts.narrow)
  const afterNote = controller.document.value
  const afterNoteWrites = writes
  controller.updatePanel({ id: 'notes', type: 'notes', config: { text: 'Preserve other widgets' } })
  assert.equal(controller.document.value, afterNote)
  assert.equal(writes, afterNoteWrites)
  controller.undo()
  assert.equal(controller.add('notes'), true)
  assert.equal(controller.document.value.panels.length, original.panels.length + 1)
  assert.deepEqual(saved, controller.document.value)
  controller.undo()
  assert.deepEqual(controller.document.value, original)
  const narrow = structuredClone(controller.document.value.layouts.narrow)
  controller.updateLayout(
    'wide',
    original.layouts.wide.map((item) => ({ ...item, y: item.y + 1 })),
  )
  assert.deepEqual(controller.document.value.layouts.narrow, narrow)
  const capabilitiesBefore = controller.document.value.panels.find(
    (panel) => panel.type === 'capabilities',
  )
  assert.ok(capabilitiesBefore)
  assert.equal(
    controller.updatePanel({
      ...capabilitiesBefore,
      title: 'My tools',
      tone: 'accent-b',
      config: { destinations: ['api-overview', 'component-charts'] },
    }),
    true,
  )
  const customized = controller.document.value
  assert.equal(
    controller.updatePanel({
      ...capabilitiesBefore,
      title: 'My tools',
      tone: 'accent-b',
      config: { destinations: ['api-overview', 'component-charts'] },
    }),
    true,
  )
  assert.equal(controller.document.value, customized)
  controller.undo()
  assert.deepEqual(
    controller.document.value.panels.find((panel) => panel.type === 'capabilities'),
    capabilitiesBefore,
  )
  const first = original.panels[0]
  assert.ok(first)
  controller.remove(first.id)
  assert.equal(
    controller.document.value.panels.some((panel) => panel.id === first.id),
    false,
  )
  assert.equal(
    controller.document.value.layouts.wide.some((panel) => panel.id === first.id),
    false,
  )
  controller.undo()
  assert.equal(controller.document.value.panels.length, original.panels.length)
  writable = false
  controller.reset()
  assert.equal(controller.failure.value, true)
  writable = true
  controller.retry()
  assert.equal(controller.failure.value, false)
  assert.deepEqual(saved, original)

  const placementApp = createProbeApp()
  placementApp.provide(dashboardStoragePortKey, port)
  const placement = placementApp.runWithContext(createDashboard)
  placement.remove('capabilities')
  assert.equal(placement.add('clock'), true)
  assert.deepEqual(placement.document.value.layouts.wide.at(-1), {
    id: 'panel-1',
    x: 0,
    y: 5,
    w: 4,
    h: 2,
  })
  assert.deepEqual(placement.document.value.layouts.narrow.at(-1), {
    id: 'panel-1',
    x: 0,
    y: 4,
    w: 1,
    h: 2,
  })
  placement.undo()
  assert.equal(placement.document.value.panels.length, original.panels.length - 1)
  assert.equal(placement.add('chart'), true)
  assert.equal(dashboardSchema.safeParse(placement.document.value).success, true)

  const catalogApp = createProbeApp()
  catalogApp.provide(dashboardStoragePortKey, port)
  const catalogBoard = catalogApp.runWithContext(createDashboard)
  const beforeUnknown = catalogBoard.document.value
  assert.equal(catalogBoard.add('unknown-feature'), false)
  assert.equal(catalogBoard.document.value, beforeUnknown)
  for (const entryId of ['delivery', 'route-time', 'theme-palette']) {
    assert.equal(catalogBoard.add(entryId), true)
    assert.equal(dashboardSchema.safeParse(catalogBoard.document.value).success, true)
  }
  const delivery = catalogBoard.document.value.panels.find(
    (item) => item.type === 'chart' && item.config.series === 'delivery',
  )
  assert.ok(delivery)
  assert.equal(
    catalogBoard.document.value.layouts.wide.find((item) => item.id === delivery.id)?.w,
    6,
  )
  assert.equal(
    catalogBoard.document.value.layouts.narrow.find((item) => item.id === delivery.id)?.h,
    4,
  )
  const modulePanel = catalogBoard.document.value.panels.find((item) => item.type === 'module')
  assert.ok(modulePanel)
  assert.deepEqual(modulePanel.config, { entryId: 'theme-palette' })
  assert.equal(JSON.stringify(catalogBoard.document.value).includes('component'), false)
  const moduleDocument = catalogBoard.document.value
  assert.equal(catalogBoard.updatePanel(structuredClone(modulePanel)), true)
  assert.equal(catalogBoard.document.value, moduleDocument)
  const routePanel = catalogBoard.document.value.panels.find((item) => item.type === 'route')
  assert.ok(routePanel)
  assert.deepEqual(routePanel.config, { entryId: 'route-time' })
  assert.equal(catalogBoard.updatePanel(structuredClone(routePanel)), true)
  assert.equal(catalogBoard.document.value, moduleDocument)
  const restoredCatalogApp = createProbeApp()
  restoredCatalogApp.provide(dashboardStoragePortKey, {
    read: () => ({ status: 'found', document: structuredClone(moduleDocument) }),
    write: () => assert.fail('Restoring modules must not rewrite persistent state.'),
  } satisfies DashboardStoragePort)
  assert.deepEqual(
    restoredCatalogApp.runWithContext(createDashboard).document.value,
    moduleDocument,
  )
  catalogBoard.undo()
  assert.equal(
    catalogBoard.document.value.panels.some((item) => item.type === 'module'),
    false,
  )
  assert.equal(catalogBoard.restoreLayout(), true)
  assert.equal(dashboardSchema.safeParse(catalogBoard.document.value).success, true)

  const appearanceApp = createProbeApp()
  appearanceApp.provide(dashboardStoragePortKey, port)
  const appearance = appearanceApp.runWithContext(createDashboard)
  const appearanceInitial = appearance.document.value
  assert.equal(appearance.setStyle('contrast'), true)
  assert.equal(appearance.document.value.style, 'contrast')
  assert.equal(appearance.document.value.panels, appearanceInitial.panels)
  const contrast = appearance.document.value
  const contrastWrites = writes
  assert.equal(appearance.setStyle('contrast'), true)
  assert.equal(appearance.document.value, contrast)
  assert.equal(writes, contrastWrites)
  assert.equal(appearance.setEntrance('curtain'), true)
  assert.equal(appearance.document.value.entrance, 'curtain')
  const curtain = appearance.document.value
  const curtainWrites = writes
  assert.equal(appearance.setEntrance('curtain'), true)
  assert.equal(appearance.document.value, curtain)
  assert.equal(writes, curtainWrites)
  const panel = appearance.document.value.panels[0]
  assert.ok(panel)
  assert.equal(appearance.updatePanel({ ...panel, tone: 'brand', entrance: 'none' }), true)
  assert.equal(appearance.document.value.panels[0]?.entrance, 'none')
  appearance.undo()
  assert.equal(appearance.document.value.panels[0].entrance, undefined)
  assert.equal(appearance.document.value.entrance, 'curtain')
  appearance.undo()
  assert.equal(appearance.document.value.entrance, undefined)
  assert.equal(appearance.document.value.style, 'contrast')
  appearance.undo()
  assert.deepEqual(appearance.document.value, appearanceInitial)
  assert.equal(appearance.canUndo.value, false)

  const layoutRecoveryApp = createProbeApp()
  layoutRecoveryApp.provide(dashboardStoragePortKey, port)
  const layoutRecovery = layoutRecoveryApp.runWithContext(createDashboard)
  layoutRecovery.remove('clock')
  assert.equal(layoutRecovery.add('chart'), true)
  layoutRecovery.setStyle('brand')
  layoutRecovery.setEntrance('iris')
  layoutRecovery.updatePanel({
    id: 'notes',
    type: 'notes',
    title: 'Keep my note',
    tone: 'accent-b',
    entrance: 'none',
    config: { text: 'Must survive recovery.' },
  })
  layoutRecovery.updatePanel({
    id: 'capabilities',
    type: 'capabilities',
    config: { destinations: ['api-overview'] },
  })
  for (const mode of ['wide', 'narrow'] as const) {
    assert.equal(
      layoutRecovery.updateLayout(
        mode,
        layoutRecovery.document.value.layouts[mode].map((item) => ({ ...item, y: item.y + 10 })),
      ),
      true,
    )
  }
  const beforeRecovery = layoutRecovery.document.value
  const recoveryWriteCount = Number(writes)
  assert.equal(layoutRecovery.restoreLayout(), true)
  const afterRecovery = layoutRecovery.document.value
  assert.equal(writes, recoveryWriteCount + 1)
  assert.equal(
    afterRecovery.panels,
    beforeRecovery.panels,
    'Layout recovery must preserve every card identity and its content.',
  )
  assert.equal(afterRecovery.style, 'brand')
  assert.equal(afterRecovery.entrance, 'iris')
  assert.equal(
    afterRecovery.panels.some((panel) => panel.id === 'clock'),
    false,
    'Removed cards must not return.',
  )
  assert.equal(
    afterRecovery.panels.some((panel) => panel.type === 'chart'),
    true,
    'Added cards must survive.',
  )
  assert.equal(dashboardSchema.safeParse(afterRecovery).success, true)
  assert.equal(layoutRecovery.restoreLayout(), true)
  assert.equal(layoutRecovery.document.value, afterRecovery)
  assert.equal(
    writes,
    recoveryWriteCount + 1,
    'Repeated recovery must not write or add an undo step.',
  )
  layoutRecovery.undo()
  assert.deepEqual(layoutRecovery.document.value, beforeRecovery)

  let readsAvailable = false
  let recoveryWrites = 0
  const recoveryApp = createProbeApp()
  recoveryApp.provide(dashboardStoragePortKey, {
    read: () =>
      readsAvailable
        ? { status: 'found', document: original }
        : { status: 'unusable', reason: 'invalid' },
    write: () => {
      recoveryWrites += 1
      return { status: 'saved' }
    },
  } satisfies DashboardStoragePort)
  const recovery = recoveryApp.runWithContext(createDashboard)
  assert.equal(recovery.readFailure.value, true)
  assert.equal(recovery.failure.value, false)
  recovery.retry()
  recovery.retryRead()
  assert.equal(recovery.add('notes'), false)
  assert.equal(recovery.restoreLayout(), false)
  assert.equal(recoveryWrites, 0, 'Read failure must never overwrite the rejected document.')
  readsAvailable = true
  recovery.retryRead()
  assert.equal(recovery.readFailure.value, false)
  assert.equal(recoveryWrites, 0)
  assert.deepEqual(recovery.document.value, original)
  readsAvailable = false
  const explicitReset = recoveryApp.runWithContext(createDashboard)
  explicitReset.reset()
  assert.equal(explicitReset.readFailure.value, false)
  assert.equal(recoveryWrites, 1, 'Only explicit reset replaces a rejected stored document.')

  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let raw: string | null = null
  let denied = false
  let mismatched = false
  let disposed = false
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => raw,
        setItem: (_key: string, value: string) => {
          if (denied) throw new Error('denied')
          raw = mismatched ? '{}' : value
        },
      },
    },
  })
  try {
    const storage = createDashboardLayoutStorage(
      createStorageErrorAdapter({
        startupAttemptId: createStartupAttemptId(),
        releaseSha: 'test',
        buildVersion: 'test',
      }),
      () => disposed,
    )
    assert.equal(storage.read().status, 'missing')
    assert.equal(storage.write(original).status, 'saved')
    assert.deepEqual(storage.read(), { status: 'found', document: original })
    raw = '{broken'
    assert.deepEqual(storage.read(), { status: 'unusable', reason: 'invalid' })
    assert.equal(raw, '{broken')
    denied = true
    assert.equal(storage.write(original).status, 'failed')
    denied = false
    mismatched = true
    assert.equal(storage.write(original).status, 'failed')
    mismatched = false
    assert.equal(storage.write(original).status, 'saved')
    const lifecycle = createAndReadyStorage({
      configuration: coreRuntimeConfigurationSchema.parse({
        schemaVersion: 2,
        environment: 'development',
        deploymentBase: '/',
        releaseSha: '0'.repeat(40),
        buildVersion: '0.0.0',
        api: { status: 'unconfigured' },
      }),
      startupAttemptId: createStartupAttemptId(),
    })
    assert.equal(
      lifecycle.owner.registry.some((record) => record.id === 'dashboard-layout'),
      true,
    )
    assert.equal(lifecycle.owner.dashboardLayout.write(original).status, 'saved')
    assert.deepEqual(lifecycle.owner.dashboardLayout.read(), {
      status: 'found',
      document: original,
    })
    lifecycle.dispose()
    lifecycle.dispose()
    assert.equal(lifecycle.owner.dashboardLayout.write(original).status, 'failed')
    assert.deepEqual(lifecycle.owner.dashboardLayout.read(), {
      status: 'unusable',
      reason: 'disposed',
    })
    disposed = true
    assert.equal(storage.write(original).status, 'failed')
    assert.deepEqual(storage.read(), { status: 'unusable', reason: 'disposed' })
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
  console.log('Dashboard JSON, independent layouts, undo/reset and storage failures passed.')
}
