import { createAndReadyStorage } from '../../apps/web/src/app/storage/storage-lifecycle'
import { coreRuntimeConfigurationSchema } from '../../apps/web/src/app/config/runtime-configuration-contract'
import assert from 'node:assert/strict'
import { createApp } from 'vue'
import {
  createDefaultDashboard,
  dashboardSchema,
  dashboardStoragePortKey,
  type DashboardDocument,
  type DashboardStoragePort,
} from '../../apps/web/src/app/dashboard/dashboard-contract'
import { useDashboard } from '../../apps/web/src/app/dashboard/use-dashboard'
import { createDashboardLayoutStorage } from '../../apps/web/src/app/storage/dashboard-layout-storage'
import { createStorageErrorAdapter } from '../../apps/web/src/app/storage/storage-error'
import { createStartupAttemptId } from '../../apps/web/src/app/bootstrap/lifecycle'

function createProbeApp() {
  return createApp({ render: () => null })
}

export function verifyDashboard(): void {
  const original = createDefaultDashboard()
  assert.equal(dashboardSchema.safeParse(original).success, true)
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

  let saved: DashboardDocument | undefined
  let writable = true
  const port: DashboardStoragePort = {
    read: () => ({ status: 'missing' }),
    write: (document) => {
      if (!writable) return { status: 'failed' }
      saved = structuredClone(document)
      return { status: 'saved' }
    },
  }
  const app = createProbeApp()
  app.provide(dashboardStoragePortKey, port)
  const controller = app.runWithContext(useDashboard)
  assert.equal(controller.canUndo.value, false)
  assert.equal(controller.add('notes'), true)
  assert.equal(controller.document.value.panels.length, 5)
  assert.deepEqual(saved, controller.document.value)
  controller.undo()
  assert.deepEqual(controller.document.value, original)
  const narrow = structuredClone(controller.document.value.layouts.narrow)
  controller.updateLayout(
    'wide',
    original.layouts.wide.map((item) => ({ ...item, y: item.y + 1 })),
  )
  assert.deepEqual(controller.document.value.layouts.narrow, narrow)
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
  assert.equal(controller.document.value.panels.length, 4)
  writable = false
  controller.reset()
  assert.equal(controller.failure.value, true)
  writable = true
  controller.retry()
  assert.equal(controller.failure.value, false)
  assert.deepEqual(saved, original)

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
  const recovery = recoveryApp.runWithContext(useDashboard)
  assert.equal(recovery.readFailure.value, true)
  assert.equal(recovery.failure.value, false)
  recovery.retry()
  recovery.retryRead()
  assert.equal(recovery.add('notes'), false)
  assert.equal(recoveryWrites, 0, 'Read failure must never overwrite the rejected document.')
  readsAvailable = true
  recovery.retryRead()
  assert.equal(recovery.readFailure.value, false)
  assert.equal(recoveryWrites, 0)
  assert.deepEqual(recovery.document.value, original)
  readsAvailable = false
  const explicitReset = recoveryApp.runWithContext(useDashboard)
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
