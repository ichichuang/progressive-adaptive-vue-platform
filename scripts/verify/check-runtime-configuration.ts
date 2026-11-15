import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { createServer } from 'vite'
import type { loadRuntimeConfiguration } from '../../apps/web/src/app/config/runtime-configuration'

export async function verifyRuntimeConfigurationLoad(): Promise<void> {
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
    const module = await server.ssrLoadModule('/apps/web/src/app/config/runtime-configuration.ts')
    const load = module['loadRuntimeConfiguration'] as typeof loadRuntimeConfiguration
    const document = {
      baseURI: 'https://example.com/',
      querySelectorAll: (selector: string) => ({
        length: 1,
        item: () => ({
          matches: () => true,
          getAttribute: () =>
            selector.startsWith('link')
              ? '/generated/critical-theme.css'
              : selector.startsWith('script')
                ? '/generated/appearance-init.js'
                : '/runtime-configuration.json',
        }),
      }),
    } as unknown as Document
    const location = { origin: 'https://example.com' } as Location
    const configuration = {
      schemaVersion: 2,
      environment: 'production',
      deploymentBase: '/',
      releaseSha: 'a'.repeat(40),
      buildVersion: '1.0.0',
      api: { status: 'unconfigured' },
    }
    const successResponse = (): Response => Response.json(configuration)
    mock.timers.enable({ apis: ['setTimeout'] })
    try {
      for (const stalledPhase of ['headers', 'body'] as const) {
        let finishHeaders: ((response: Response) => void) | undefined
        let finishBody: ((body: string) => void) | undefined
        let transportSignal: AbortSignal | null | undefined
        const handle = load({
          document,
          location,
          signal: new AbortController().signal,
          fetch: (_url, init) => {
            transportSignal = init?.signal
            return stalledPhase === 'headers'
              ? new Promise<Response>((resolve) => {
                  finishHeaders = resolve
                })
              : Promise.resolve({
                  ok: true,
                  text: () =>
                    new Promise<string>((resolve) => {
                      finishBody = resolve
                    }),
                } as Response)
          },
        })
        // Let headers consume part of the budget before reading a stalled body.
        if (stalledPhase === 'body') mock.timers.tick(6_000)
        await Promise.resolve()
        let settled = false
        void handle.result.then(() => {
          settled = true
        })
        mock.timers.tick(stalledPhase === 'body' ? 3_999 : 9_999)
        await Promise.resolve()
        assert.equal(settled, false, `${stalledPhase}: not before the deadline`)
        mock.timers.tick(1)
        assert.deepEqual(await handle.result, {
          status: 'failure',
          cause: 'configuration-network-failure',
        })
        assert.equal(transportSignal?.aborted, true)
        finishHeaders?.(successResponse())
        finishBody?.(JSON.stringify(configuration))
        await Promise.resolve()
        assert.equal((await handle.result).status, 'failure', 'late transport must not win')
        handle.dispose()
        handle.dispose()
      }
      for (const cancellation of ['owner', 'handle', 'dispose', 'already-aborted'] as const) {
        const owner = new AbortController()
        if (cancellation === 'already-aborted') owner.abort()
        let requests = 0
        const handle = load({
          document,
          location,
          signal: owner.signal,
          fetch: () => {
            requests++
            return new Promise<Response>(() => {
              // Deliberately ignores cancellation to exercise the bounded owner.
            })
          },
        })
        if (cancellation === 'owner') owner.abort()
        if (cancellation === 'handle') handle.abort()
        if (cancellation === 'dispose') handle.dispose()
        assert.deepEqual(await handle.result, { status: 'cancelled' })
        if (cancellation === 'already-aborted') assert.equal(requests, 0)
        mock.timers.tick(10_000)
        assert.deepEqual(await handle.result, { status: 'cancelled' })
        handle.dispose()
      }
      const owner = new AbortController()
      let successSignal: AbortSignal | null | undefined
      const success = load({
        document,
        location,
        signal: owner.signal,
        fetch: (_url, init) => {
          successSignal = init?.signal
          return Promise.resolve(successResponse())
        },
      })
      assert.equal((await success.result).status, 'success')
      mock.timers.tick(10_000)
      owner.abort()
      assert.equal(successSignal?.aborted, false, 'settlement clears timeout and owner listener')
      success.dispose()
      const failure = load({
        document,
        location,
        signal: new AbortController().signal,
        fetch: () => Promise.reject(new Error('offline')),
      })
      assert.deepEqual(await failure.result, {
        status: 'failure',
        cause: 'configuration-network-failure',
      })
      failure.dispose()
    } finally {
      mock.timers.reset()
    }
  } finally {
    await server.close()
  }
  console.log('Runtime configuration deadline/cancellation probes: passed')
}
