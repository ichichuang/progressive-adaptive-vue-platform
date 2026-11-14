import { effectScope } from 'vue'
import type { useRuntimeUpdateReload as Reload } from '../../apps/web/src/app/config/use-runtime-update-reload'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import type {
  createRuntimeUpdateMonitor as Monitor,
  probeRuntimeConfigurationUpdate as Probe,
} from '../../apps/web/src/app/config/runtime-update-monitor'
export async function verifyRuntimeUpdate(): Promise<void> {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    define: {
      __PAVP_COMPILED_ENVIRONMENT__: JSON.stringify('production'),
      __PAVP_COMPILED_RELEASE_SHA__: JSON.stringify('a'.repeat(40)),
      __PAVP_COMPILED_BUILD_VERSION__: JSON.stringify('1.0.0'),
    },
  })
  try {
    const module = await server.ssrLoadModule('/apps/web/src/app/config/runtime-update-monitor.ts')
    const reloadModule = await server.ssrLoadModule(
      '/apps/web/src/app/config/use-runtime-update-reload.ts',
    )
    const useReload = reloadModule['useRuntimeUpdateReload'] as typeof Reload
    type Permit = Awaited<ReturnType<Parameters<typeof useReload>[0]['requestReload']>>
    let release: ((permit: Permit) => void) | undefined
    let identity: { environment: 'production'; releaseSha: string; buildVersion: string } | null = {
      environment: 'production',
      releaseSha: 'b'.repeat(40),
      buildVersion: '2.0.0',
    }
    let reloads = 0
    let requestsCount = 0
    let currentCheck: (() => boolean) | undefined
    const scope = effectScope()
    const reloader = scope.run(() =>
      useReload({
        candidate: () => identity,
        requestReload: (isCurrent) => {
          requestsCount++
          currentCheck = isCurrent
          return new Promise<Permit>((resolve) => {
            release = resolve
          })
        },
        reloadDocument: () => {
          reloads++
        },
      }),
    )
    assert.ok(reloader)
    const permit: Exclude<Permit, undefined> = {
      reload(action) {
        action()
        return true
      },
    }
    const changed = reloader.reload()
    await reloader.reload()
    assert.equal(requestsCount, 1)
    assert.equal(reloader.busy.value, true)
    identity = {
      ...identity,
      environment: 'production',
      releaseSha: 'c'.repeat(40),
      buildVersion: '2.0.0',
    }
    assert.equal(currentCheck?.(), false)
    release?.(permit)
    await changed
    assert.equal(reloads, 0)
    const cancelled = reloader.reload()
    release?.(undefined)
    await cancelled
    assert.equal(reloads, 0)
    const accepted = reloader.reload()
    release?.(permit)
    await accepted
    assert.equal(reloads, 1)
    const disposed = reloader.reload()
    scope.stop()
    release?.(permit)
    await disposed
    assert.equal(reloads, 1)
    assert.equal(reloader.busy.value, false)
    const probe = module['probeRuntimeConfigurationUpdate'] as typeof Probe
    const document = {
      baseURI: 'https://example.com/',
      querySelectorAll: () => ({
        length: 1,
        item: () => ({ matches: () => true, getAttribute: () => '/runtime-configuration.json' }),
      }),
    } as unknown as Document
    const location = { origin: 'https://example.com' } as Location
    let calls = 0
    const fetcher: typeof fetch = () => {
      calls++
      return Promise.resolve(new Response('{}'))
    }
    const signal = new AbortController().signal
    assert.equal(await probe({ document, location, fetch: fetcher, signal }), null)
    assert.equal(calls, 1)
    const candidate = {
      schemaVersion: 2,
      environment: 'production',
      deploymentBase: '/',
      releaseSha: 'b'.repeat(40),
      buildVersion: '2.0.0',
      api: { status: 'unconfigured' },
    }
    const found = await probe({
      document,
      location,
      signal,
      fetch: () => Promise.resolve(Response.json(candidate)),
    })
    assert.equal(found?.buildVersion, '2.0.0')
    assert.equal(found.releaseSha, candidate.releaseSha)
    assert.equal(
      await probe({
        document,
        location,
        signal,
        fetch: () => Promise.resolve(Response.json({ ...candidate, environment: 'development' })),
      }),
      null,
    )
    const controller = new AbortController()
    controller.abort()
    assert.equal(
      await probe({ document, location, fetch: fetcher, signal: controller.signal }),
      null,
    )
    assert.equal(calls, 1)
    assert.equal(
      await probe({
        document,
        location: { origin: 'https://other.example' } as Location,
        fetch: fetcher,
        signal,
      }),
      null,
    )
    assert.equal(calls, 1)
    const create = module['createRuntimeUpdateMonitor'] as typeof Monitor
    const clock = Date.now
    let now = 1000000
    Date.now = () => now
    try {
      const focus = new EventTarget()
      const visibility = new EventTarget()
      let visible = 'visible'
      const timeouts = new Map<number, () => void>()
      const intervals = new Map<number, () => void>()
      let id = 0
      const browser = {
        location,
        addEventListener: focus.addEventListener.bind(focus),
        removeEventListener: focus.removeEventListener.bind(focus),
        setTimeout: (callback: () => void) => {
          const key = ++id
          timeouts.set(key, callback)
          return key
        },
        clearTimeout: (key: number) => {
          timeouts.delete(key)
        },
        setInterval: (callback: () => void) => {
          const key = ++id
          intervals.set(key, callback)
          return key
        },
        clearInterval: (key: number) => {
          intervals.delete(key)
        },
      } as unknown as Window
      const page = {
        baseURI: document.baseURI,
        querySelectorAll: () => ({
          length: 1,
          item: () => ({ matches: () => true, getAttribute: () => '/runtime-configuration.json' }),
        }),
        get visibilityState() {
          return visible
        },
        addEventListener: visibility.addEventListener.bind(visibility),
        removeEventListener: visibility.removeEventListener.bind(visibility),
      } as unknown as Document
      const requests: {
        resolve: (response: Response) => void
        signal: AbortSignal | null | undefined
      }[] = []
      const statuses: string[] = []
      const candidates: (string | null)[] = []
      const monitor = create({
        document: page,
        window: browser,
        fetch: (_url, options) =>
          new Promise<Response>((resolve) => {
            requests.push({ resolve, signal: options?.signal })
          }),
        onStatus: (status) => {
          statuses.push(status)
        },
        onCandidate: (value) => {
          candidates.push(value?.releaseSha ?? null)
        },
      })
      assert.equal(intervals.size, 1)
      assert.equal(requests.length, 1)
      const first = monitor.check()
      assert.equal(first, monitor.check())
      requests[0]?.resolve(Response.json(candidate))
      await first
      assert.equal(candidates.at(-1), candidate.releaseSha)
      focus.dispatchEvent(new Event('focus'))
      assert.equal(requests.length, 1)
      now += 60001
      visible = 'hidden'
      for (const callback of intervals.values()) callback()
      assert.equal(requests.length, 1)
      visible = 'visible'
      visibility.dispatchEvent(new Event('visibilitychange'))
      assert.equal(requests.length, 2)
      const failure = monitor.check()
      requests[1]?.resolve(new Response('bad', { status: 500 }))
      await failure
      assert.equal(statuses.at(-1), 'unavailable')
      assert.equal(candidates.at(-1), candidate.releaseSha)
      monitor.dismiss()
      assert.equal(candidates.at(-1), null)
      now += 60001
      focus.dispatchEvent(new Event('focus'))
      requests[2]?.resolve(Response.json(candidate))
      await new Promise((resolve) => setTimeout(resolve, 0))
      assert.equal(candidates.at(-1), null)
      const newer = monitor.check()
      requests[3]?.resolve(Response.json(candidate))
      await newer
      assert.equal(candidates.at(-1), candidate.releaseSha)
      now += 60001
      const current = monitor.check()
      requests[4]?.resolve(
        Response.json({ ...candidate, releaseSha: 'a'.repeat(40), buildVersion: '1.0.0' }),
      )
      await current
      assert.equal(statuses.at(-1), 'current')
      assert.equal(candidates.at(-1), null)
      now += 60001
      const versionOnly = monitor.check()
      requests[5]?.resolve(Response.json({ ...candidate, releaseSha: 'a'.repeat(40) }))
      await versionOnly
      assert.equal(statuses.at(-1), 'available')
      now += 60001
      const shaOnly = monitor.check()
      requests[6]?.resolve(Response.json({ ...candidate, buildVersion: '1.0.0' }))
      await shaOnly
      assert.equal(candidates.at(-1), candidate.releaseSha)
      now += 60001
      const invalid = monitor.check()
      requests[7]?.resolve(Response.json({ invalid: true }))
      await invalid
      assert.equal(candidates.at(-1), candidate.releaseSha)
      now += 60001
      const late = monitor.check()
      for (const callback of timeouts.values()) callback()
      assert.equal(requests[8]?.signal?.aborted, true)
      requests[8].resolve(Response.json(candidate))
      await late
      assert.equal(statuses.at(-1), 'unavailable')
      assert.equal(candidates.at(-1), candidate.releaseSha)
      now += 60001
      const final = monitor.check()
      const count = candidates.length
      monitor.dispose()
      assert.equal(requests[9]?.signal?.aborted, true)
      requests[9].resolve(Response.json(candidate))
      await final
      assert.equal(candidates.length, count)
      assert.equal(intervals.size, 0)
      assert.equal(timeouts.size, 0)
      now += 60001
      focus.dispatchEvent(new Event('focus'))
      await monitor.check()
      assert.equal(requests.length, 10)
      let manualCalls = 0
      const manual = create({
        document: page,
        window: browser,
        automatic: false,
        fetch: () => {
          manualCalls++
          return Promise.resolve(Response.json(candidate))
        },
        onCandidate: () => undefined,
      })
      assert.equal(intervals.size, 0)
      focus.dispatchEvent(new Event('focus'))
      visibility.dispatchEvent(new Event('visibilitychange'))
      assert.equal(manualCalls, 0)
      await manual.check()
      assert.equal(manualCalls, 1)
      manual.dispose()
    } finally {
      Date.now = clock
    }
  } finally {
    await server.close()
  }
}
