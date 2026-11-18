import assert from 'node:assert/strict'
import { createApp } from 'vue'
import { createRequire } from 'node:module'
import { createServer } from 'vite'
import {
  installAccessBoundary,
  useAccessBoundary,
} from '../../apps/web/src/app/access/access-boundary'
import type {
  AccessBoundary,
  AccessHost,
  AccessHostChange,
  AccessRequest,
} from '../../apps/web/src/app/access/access-contract'
import type { PiniaProviderHandle } from '../../apps/web/src/app/providers/pinia'
import { serveRouteAccessBrowserProbe } from '../verify/route-access-browser-probe'

interface ProbeDestination {
  name: string
  params: Record<string, never>
  query: Record<string, never>
  hash: string
}
interface ProbeMeta {
  auth: string
  requiredPermissionIds: readonly string[]
  permissionRequests?: Record<string, AccessRequest>
}
interface ProbeLocation {
  matched: readonly { name?: string; meta: Partial<ProbeMeta> }[]
}
interface ProbeCheck {
  read(): string
  dispose(): void
}
interface ProbeEntry {
  destination: ProbeDestination
}
const appRequire = createRequire(new URL('../../apps/web/package.json', import.meta.url))
const { createMemoryHistory, createRouter } = appRequire('vue-router') as {
  createMemoryHistory: () => unknown
  createRouter: (options: { history: unknown; routes: readonly unknown[] }) => {
    resolve(destination: string | { name: string }): ProbeLocation
  }
}

export async function verifyRouteAccess(): Promise<void> {
  const server = await createServer({ configFile: false, server: { middlewareMode: true } })
  try {
    await exerciseRouteAccess(server)
  } finally {
    await server.close()
  }
}

async function exerciseRouteAccess(
  server: Awaited<ReturnType<typeof createServer>>,
): Promise<void> {
  const base = '/apps/web/src/app/'
  const [registry, policy, workspace, sessionModule, piniaModule]: unknown[] = await Promise.all([
    server.ssrLoadModule(base + 'router/route-registry.ts'),
    server.ssrLoadModule(base + 'router/route-access.ts'),
    server.ssrLoadModule(base + 'workspace/workspace.store.ts'),
    server.ssrLoadModule(base + 'workspace/workspace-session.ts'),
    server.ssrLoadModule(base + 'providers/pinia.ts'),
  ])
  const { createPiniaProvider } = piniaModule as {
    createPiniaProvider: (startupAttemptId: string) => PiniaProviderHandle
  }
  const { getRouteRecord } = registry as {
    getRouteRecord: (name: string) => { name: string; pathPattern: string; meta: ProbeMeta }
  }
  const { isPublicRoute, observeRouteAccess, waitForRouteAccess } = policy as {
    isPublicRoute: (location: ProbeLocation) => boolean
    observeRouteAccess: (
      access: AccessBoundary,
      location: ProbeLocation,
      destination: ProbeDestination,
    ) => ProbeCheck
    waitForRouteAccess: (check: ProbeCheck, signal: AbortSignal) => Promise<string>
  }
  const { useWorkspaceStore } = workspace as {
    useWorkspaceStore: (pinia: PiniaProviderHandle['pinia']) => {
      entries: readonly ProbeEntry[]
      active: ProbeEntry | undefined
      commit(
        name: { name: string },
        destination: ProbeDestination,
        component: unknown,
        origin: undefined,
        controlled: true,
      ): ProbeEntry | undefined
      withdraw(entry: ProbeEntry): void
    }
  }
  const { initializeWorkspaceSession } = sessionModule as {
    initializeWorkspaceSession: (
      pinia: PiniaProviderHandle['pinia'],
      port: {
        read(): {
          status: 'found'
          session: { schemaVersion: 1; openRouteNames: readonly string[] }
        }
        write(snapshot: { openRouteNames: readonly string[] }): { status: 'saved' }
      },
      isPublicRouteName: (name: string) => boolean,
    ) => { dispose(): void }
  }
  const parent = getRouteRecord('workbench-date-time')
  const child = getRouteRecord('workbench-colors')
  const login = getRouteRecord('login')
  const parentMeta: ProbeMeta = {
    ...parent.meta,
    auth: 'required',
    requiredPermissionIds: ['shell'],
    permissionRequests: {
      shell: { domain: 'shell', kind: 'type', resource: 'page', action: 'open' },
    },
  }
  const component = { name: 'RouteAccessProbe' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        name: 'workbench-welcome',
        component,
        meta: getRouteRecord('workbench-welcome').meta,
      },
      { path: login.pathPattern, name: login.name, component, meta: login.meta },
      {
        path: '/date-time',
        name: parent.name,
        meta: parentMeta,
        children: [
          { path: '/colors', name: child.name, component, meta: child.meta },
          {
            path: '/dashboard',
            name: 'workbench-dashboard',
            component,
            meta: {
              ...getRouteRecord('workbench-dashboard').meta,
              auth: 'policy',
              requiredPermissionIds: ['record'],
              permissionRequests: {
                record: () => ({
                  domain: 'records',
                  kind: 'record',
                  resource: 'record',
                  action: 'view',
                  recordId: 'chosen',
                }),
              },
            },
          },
        ],
      },
      {
        path: '/api/authorization',
        name: 'api-authorization',
        component,
        meta: {
          ...getRouteRecord('api-authorization').meta,
          auth: 'policy',
        },
      },
    ],
  })
  const app = createApp({})
  const piniaProvider = createPiniaProvider('route-access-probe')
  const pinia = piniaProvider.pinia
  app.use(pinia)
  let notify: ((change: AccessHostChange) => Promise<void>) | undefined
  let anonymous = true
  let allowShell = false
  let seenRecord = ''
  let resolveRecord: ((decision: { status: 'allow' | 'indeterminate' }) => void) | undefined
  let holdRecords = true
  const host: AccessHost = {
    resolveContext: () => ({
      identity: anonymous ? { kind: 'anonymous' } : { kind: 'known', principalId: 'probe' },
      scope: [],
    }),
    decisions: [
      {
        domain: 'shell',
        targets: ['type'],
        evaluate: () => ({ status: allowShell ? 'allow' : 'deny' }),
      },
      {
        domain: 'records',
        targets: ['record'],
        evaluate({ request }) {
          if (request.kind === 'record') seenRecord = request.recordId
          if (!holdRecords) return { status: 'allow' }
          return new Promise((resolve) => {
            resolveRecord = resolve
          })
        },
      },
    ],
    subscribe(listener) {
      notify = listener
      return () => {
        notify = undefined
      }
    },
  }
  const dispose = installAccessBoundary(app, host)
  const checks: ReturnType<typeof observeRouteAccess>[] = []
  const access = app.runWithContext(useAccessBoundary)
  function observe(destination: ProbeDestination) {
    const check = observeRouteAccess(
      access,
      router.resolve({ name: destination.name }),
      destination,
    )
    checks.push(check)
    return check
  }
  const signal = new AbortController().signal
  try {
    assert.equal(isPublicRoute(router.resolve('/')), true)
    const loginLocation = router.resolve('/login')
    const loginDestination = { name: login.name, params: {}, query: {}, hash: '' }
    assert.deepEqual(
      loginLocation.matched.map(({ name }) => name),
      ['login'],
    )
    assert.equal(isPublicRoute(loginLocation), true)
    assert.equal(isPublicRoute(router.resolve('/colors')), false)
    const nestedPublicChild = observe({ name: 'workbench-colors', params: {}, query: {}, hash: '' })
    const both = observe({ name: 'workbench-dashboard', params: {}, query: {}, hash: '' })
    const invalid = observe({ name: 'api-authorization', params: {}, query: {}, hash: '' })
    assert.equal(invalid.read(), 'configuration-error')
    assert.equal(await waitForRouteAccess(nestedPublicChild, signal), 'identity-required')
    anonymous = false
    assert.ok(notify)
    await notify({ kind: 'identity' })
    const confirmed = access.readContext()
    assert.equal(observe(loginDestination).read(), 'allow')
    assert.equal(access.readContext(), confirmed)
    assert.equal(await waitForRouteAccess(nestedPublicChild, signal), 'deny')
    allowShell = true
    await notify({ kind: 'domain', domain: 'shell' })
    assert.equal(await waitForRouteAccess(nestedPublicChild, signal), 'allow')
    assert.equal(both.read(), 'pending')
    assert.equal(seenRecord, 'chosen')
    const cancelled = new AbortController()
    const wait = waitForRouteAccess(both, cancelled.signal)
    cancelled.abort()
    assert.equal(await wait, 'cancelled')
    assert.ok(resolveRecord)
    resolveRecord({ status: 'indeterminate' })
    assert.equal(await waitForRouteAccess(both, signal), 'indeterminate')
    holdRecords = false
    await notify({ kind: 'domain', domain: 'records' })
    assert.equal(await waitForRouteAccess(both, signal), 'allow')
    await notify({ kind: 'record', domain: 'records', resource: 'record', recordId: 'unrelated' })
    assert.equal(both.read(), 'allow')

    const writes: (readonly string[])[] = []
    const store = app.runWithContext(() => useWorkspaceStore(pinia))
    const session = app.runWithContext(() =>
      initializeWorkspaceSession(
        pinia,
        {
          read: () => ({
            status: 'found',
            session: {
              schemaVersion: 1,
              openRouteNames: ['workbench-colors', 'administration-policies', 'workbench-welcome'],
            },
          }),
          write(snapshot) {
            writes.push(snapshot.openRouteNames)
            return { status: 'saved' }
          },
        },
        (name) => name === 'workbench-welcome',
      ),
    )
    try {
      assert.deepEqual(
        store.entries.map(({ destination }) => destination.name),
        ['workbench-welcome'],
      )
      const publicChild = { name: 'workbench-colors', params: {}, query: {}, hash: '' } as const
      const protectedTab = store.commit(
        { name: publicChild.name },
        publicChild,
        component,
        undefined,
        true,
      )
      assert.ok(protectedTab)
      assert.equal(store.active, protectedTab)
      assert.deepEqual(writes, [['workbench-welcome']])
      store.withdraw(protectedTab)
      assert.equal(store.active, undefined)
      assert.deepEqual(
        store.entries.map(({ destination }) => destination.name),
        ['workbench-welcome'],
      )
      assert.deepEqual(writes, [['workbench-welcome']])
    } finally {
      session.dispose()
    }
  } finally {
    for (const check of checks) check.dispose()
    dispose()
    app.runWithContext(() => {
      piniaProvider.dispose()
    })
  }
}

if (process.argv[1]?.endsWith('check-route-access.ts')) {
  if (process.argv.includes('--browser')) await serveRouteAccessBrowserProbe()
  else {
    await verifyRouteAccess()
    console.log('Route access, matched constraints, and workspace sessions: passed.')
  }
}
