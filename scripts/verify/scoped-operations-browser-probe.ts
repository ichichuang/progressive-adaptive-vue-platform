import { resolve } from 'node:path'
import { createServer } from 'vite'

const probeModule = 'virtual:pavp-scoped-operations-probe'
const probeSource = String.raw`
import { h, provide, ref } from 'vue'
import { z } from 'zod'
import { createApiClient } from '/src/shared/api/index.ts'
import { createLocalAccessHost } from '/src/app/access/local-access-host.ts'
import { useAccessBoundary } from '/src/app/access/access-boundary.ts'
import { createScopedApiRead } from '/src/app/api/scoped-api-read.ts'
import { tableRowRemovalKey } from '/src/app/workbench/tables/table-row-removal.ts'

const domain = 'scoped-probe'
const principal = { kind: 'known', principalId: 'scoped-probe-principal' }
const scopeA = [{ kind: 'team', id: 'alpha' }]
const scopeB = [{ kind: 'team', id: 'beta' }]
const requirementScope = { kind: 'global' }
const list = { domain, kind: 'collection', resource: 'product', action: 'read' }
const remove = { domain, kind: 'record', resource: 'product', action: 'remove', recordId: '1' }
const capability = ({ kind, resource, action }) => ({ kind, resource, action })
const local = createLocalAccessHost({
  domain,
  capabilities: [capability(list), capability(remove)],
  policy: {
    complete: true, revision: 'scoped-probe-policy', roles: [],
    subjects: [{
      identity: principal, roles: [], groups: [],
      grants: [list, remove].map((request) => ({
        effect: 'allow', scope: { kind: 'exact', path: scopeA }, request,
      })),
    }],
  },
  initialContext: 'alpha',
  contexts: [
    { id: 'alpha', context: { identity: principal, scope: scopeA } },
    { id: 'beta', context: { identity: principal, scope: scopeB } },
  ],
})
let notify
let allowRead = true
let allowRemove = true
export const accessHost = {
  ...local.host,
  decisions: local.host.decisions.map((provider) => ({
    ...provider,
    evaluate(binding) {
      if ((binding.request.action === 'remove' && !allowRemove) ||
          (binding.request.action === 'read' && !allowRead)) return { status: 'deny' }
      return provider.evaluate(binding)
    },
  })),
  subscribe(listener) {
    notify = listener
    return local.host.subscribe(listener)
  },
}
const native = (request) => ({ operator: 'all', scope: requirementScope, requests: [request] })
const root = { policy: 'standard', authentication: 'provided' }
const dataEndpoint = {
  ...root, method: 'GET', id: 'scoped-probe-read', path: ['data'],
  response: { mode: 'json', mimeTypes: ['application/json'], schema: z.object({ label: z.string(), total: z.number() }) },
}
const actionEndpoint = {
  ...root, method: 'DELETE', id: 'scoped-probe-remove', path: ['command'],
  response: { mode: 'json', mimeTypes: ['application/json'], schema: z.object({ removed: z.string() }) },
}
export function probeApp(App) {
  return {
    setup() {
      const access = useAccessBoundary()
      const mutations = ref(0)
      const confirmed = ref('')
      const client = createApiClient({
        configuration: { status: 'configured', baseUrl: 'https://example.test/' },
        authorize: async () => ({ headers: {}, credentials: 'omit' }),
        async fetch(url, options) {
          if (url.pathname === '/data' && url.searchParams.get('scope') === 'alpha')
            return Response.json({ label: 'Scoped probe product', total: 1 })
          if (url.pathname === '/command' && options.method === 'DELETE') {
            mutations.value += 1
            return Response.json({ removed: url.searchParams.get('record') })
          }
          return new Response(null, { status: 403 })
        },
      })
      const data = createScopedApiRead(access, {
        client, requirement: () => native(list),
        plan({ context }) {
          const id = context.scope[0]?.id
          return id === undefined ? { status: 'unresolved' } : {
            status: 'ready', endpoint: dataEndpoint, input: { query: { scope: id } },
          }
        },
      })
      provide(tableRowRemovalKey, (row) => ({
        target: { id: String(row.id) },
        action: {
          requirement: (target) => native({ ...remove, recordId: target.id }),
          isTargetCurrent: (target) => target.id === String(row.id),
          businessAllows: () => true,
          async dispatch(commands, signal) {
            const command = commands[0]
            const result = await client.request(actionEndpoint, {
              signal, isDispatchCurrent: command.isCurrent,
              query: { record: command.target.id, scope: command.context.scope[0]?.id },
            })
            return [{
              targetId: command.target.id,
              requestId: command.requestId,
              ...(result.status === 'success'
                ? { status: 'completed', value: result.data }
                : { status: result.status === 'failure' && result.error.dispatched === false
                    ? 'not-dispatched' : 'unknown' }),
            }]
          },
          apply(reply) { confirmed.value = 'Removed ' + reply.removed },
        },
      }))
      const actions = {
        'Load scoped probe': () => data.run(),
        'Revoke probe write': () => { allowRemove = false; return notify?.({ kind: 'domain', domain, action: 'remove' }) },
        'Revoke probe read': () => { allowRead = false; return notify?.({ kind: 'domain', domain, action: 'read' }) },
        'Switch probe scope': () => local.selectScope(scopeB),
        'Reset scoped probe': () => { allowRemove = true; allowRead = true; return local.reset() },
      }
      return () => [
        h(App),
        h('aside', { 'aria-label': 'WP-05 probe controls', style: 'position:fixed;bottom:0;right:0;background:white;color:black;z-index:100000;padding:5px' }, [
          ...Object.entries(actions).map(([label, run]) => h('button', { type: 'button', onClick: run }, label)),
          h('output', { 'data-probe-data': '' }, data.state.value.status === 'ready'
            ? data.state.value.data.label + ' (' + data.state.value.data.total + ')'
            : data.state.value.status),
          h('output', { 'data-probe-dispatches': '' }, 'Dispatches: ' + mutations.value),
          h('output', { 'data-probe-applied': '' }, confirmed.value),
        ]),
      ]
    },
  }
}
`

export async function serveScopedOperationsBrowserProbe(): Promise<void> {
  const server = await createServer({
    root: resolve('apps/web'),
    configFile: resolve('apps/web/vite.config.ts'),
    configLoader: 'runner',
    cacheDir: 'node_modules/.vite-scoped-operations-probe',
    server: { host: '127.0.0.1', port: 41800, strictPort: true },
    plugins: [
      {
        name: 'pavp-scoped-operations-probe',
        enforce: 'pre',
        resolveId: (id) => (id === probeModule ? '\0' + id : undefined),
        load: (id) => (id === '\0' + probeModule ? probeSource : undefined),
        transform(source, id) {
          if (!id.endsWith('/src/main.ts')) return undefined
          const appStart = 'startRuntimeKernel(\n  App,'
          const appEnd = '  retainedAppearanceSafetyRestorationAuthority,\n)'
          if (source.split(appStart).length !== 2 || source.split(appEnd).length !== 2)
            throw new Error('The scoped operations probe entry changed.')
          return (
            "import { accessHost, probeApp } from '" +
            probeModule +
            "'\n" +
            source
              .replace(appStart, 'startRuntimeKernel(\n  probeApp(App),')
              .replace(appEnd, '  retainedAppearanceSafetyRestorationAuthority,\n  accessHost,\n)')
          )
        },
      },
    ],
  })
  await server.listen()
  server.printUrls()
}
