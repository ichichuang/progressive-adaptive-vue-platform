import { resolve } from 'node:path'
import { createServer } from 'vite'

// These substitutions exist only in the opt-in loopback verification server.
const routeModule = 'virtual:pavp-route-access-probe-routes'
const appModule = 'virtual:pavp-route-access-probe-app'

const routeSource = String.raw`
import { h, inject, onScopeDispose, ref, Teleport } from 'vue'
import { UiScrollArea } from '@platform/ui'
import { routerScrollControllerKey } from '/src/app/router/router-scroll-controller.ts'
import { onBeforeRouteLeave } from 'vue-router'
import { routes as generated } from 'vue-router/auto-routes'

const protectedComponent = {
  name: 'ProtectedRouteProbe',
  props: ['title', 'routeInput'],
  inheritAttrs: false,
  setup(props) {
    const dirty = ref(false)
    const register = inject(routerScrollControllerKey)
    let release
    const connect = (controller) => {
      release?.()
      release = controller ? register?.(controller) : undefined
    }
    onScopeDispose(() => connect(null))
    onBeforeRouteLeave(() => !dirty.value)
    const content = () => [
      h('h1', { tabindex: -1, 'data-route-focus': 'architecture-console-page-heading' }, props.title),
      h('p', { 'data-probe-content': '' }, 'Probe protected record ' + (props.routeInput?.query.id ?? 'public child')),
      h('button', { onClick: () => { dirty.value = true } }, 'Arm ordinary leave guard'),
      h(Teleport, { to: '#pavp-overlay-root' }, [h('p', { 'data-probe-overlay': '' }, 'Probe protected overlay')]),
    ]
    return () => props.routeInput.name === 'component-table-editor'
      ? h(UiScrollArea, { ownerId: 'architecture-console-content', enabled: true, onController: connect,
          class: 'flex-1 min-h-0 w-full' }, { default: content })
      : h('div', content())
  },
}
const parent = generated.find((record) => record.name === 'workbench-date-time')
const children = ['workbench-colors', 'component-table-editor'].map((name) => {
  const record = generated.find((candidate) => candidate.name === name)
  if (record === undefined) throw new Error('Probe child route is missing.')
  return { ...record, component: protectedComponent }
})
if (parent === undefined) throw new Error('Probe parent route is missing.')
export const routes = generated.flatMap((record) => record === parent
  ? [{ name: record.name, path: record.path, children }]
  : children.some((child) => child.name === record.name) ? [] : [record])
`

const appSource = String.raw`
import { h } from 'vue'
import { useRouter } from 'vue-router'
import { createLocalAccessHost } from '/src/app/access/local-access-host.ts'
import { createNativeGrantProvider } from '/src/app/access/native-grants.ts'
import { acceptRouterNavigation } from '/src/app/router/router-lifecycle.ts'
import { applicationConfig } from '/src/app/config/app.config.ts'

const principal = { kind: 'known', principalId: 'probe-user' }
const global = { kind: 'global' }
const opening = { domain: 'probe-shell', kind: 'type', resource: 'page', action: 'open' }
const record = { domain: 'probe-records', kind: 'record', resource: 'entry', action: 'read', recordId: '1' }
const capability = ({ kind, resource, action }) => ({ kind, resource, action })
const snapshot = (request) => ({
  complete: true, revision: 'probe-granted', roles: [],
  subjects: [{ identity: principal, roles: [], groups: [], grants: [{ effect: 'allow', scope: global, request }] }],
})
const local = createLocalAccessHost({
  domain: opening.domain, capabilities: [capability(opening)], policy: snapshot(opening),
  initialContext: 'known',
  contexts: [
    { id: 'known', context: { identity: principal, scope: [] } },
    { id: 'anonymous', context: { identity: { kind: 'anonymous' }, scope: [] } },
  ],
})
const records = createNativeGrantProvider(record.domain, [capability(record)], snapshot(record))
let pending
let releasePending
export const accessHost = {
  ...local.host,
  decisions: [...local.host.decisions, {
    ...records,
    evaluate(binding) {
      const result = records.evaluate(binding)
      return pending === undefined ? result : pending.then(() => result)
    },
  }],
}
export function probeApp(App) {
  return {
    setup() {
      const router = useRouter()
      const navigate = (destination) => {
        const request = acceptRouterNavigation(router, destination)
        if (request.kind === 'accepted') void request.navigate()
      }
      const actions = {
        'Open record 1': () => navigate({ name: 'component-table-editor', query: { mode: 'detail', id: '1' } }),
        'Open record 2': () => navigate({ name: 'component-table-editor', query: { mode: 'detail', id: '2' } }),
        'Open public dashboard': () => navigate({ name: 'workbench-dashboard' }),
        'Revoke shell grant': () => local.replacePolicy({ complete: true, revision: 'revoked', roles: [], subjects: [] }),
        'Confirm anonymous identity': () => local.selectContext('anonymous'),
        'Reset probe': () => local.reset(),
        'Hold record decision': () => { pending = new Promise((resolve) => { releasePending = resolve }) },
        'Release record decision': () => { pending = undefined; releasePending?.(); releasePending = undefined },
        'Seed mixed saved tabs': () => {
          localStorage.setItem(applicationConfig.workspace.sessionStorageKey, JSON.stringify({
            schemaVersion: 1, openRouteNames: ['workbench-welcome', 'workbench-dashboard', 'workbench-colors', 'component-table-editor'],
          }))
        },
      }
      return () => [
        h(App),
        h('aside', { 'aria-label': 'WP-04 probe controls', style: 'position:fixed;bottom:0;right:0;background:white;color:black;z-index:100000;padding:5px' },
          Object.entries(actions).map(([label, run]) => h('button', { type: 'button', onClick: run }, label))),
      ]
    },
  }
}
`

const probeMetadata = String.raw`
function probeMeta(record) {
  if (record.name === 'workbench-date-time') return {
    ...record.meta, auth: 'required', requiredPermissionIds: ['shell-open'],
    permissionRequests: { 'shell-open': { domain: 'probe-shell', kind: 'type', resource: 'page', action: 'open' } },
  }
  if (record.name === 'component-table-editor') return {
    ...record.meta, auth: 'policy', requiredPermissionIds: ['record-read'],
    permissionRequests: {
      'record-read': (target) => ({ domain: 'probe-records', kind: 'record', resource: 'entry', action: 'read', recordId: target.query.id }),
    },
  }
  if (record.name === 'api-authorization') return { ...record.meta, auth: 'policy' }
  return record.meta
}
`

function replaceOnce(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2)
    throw new Error('The isolated browser probe entry changed.')
  return source.replace(before, after)
}

export async function serveRouteAccessBrowserProbe(): Promise<void> {
  const server = await createServer({
    root: resolve('apps/web'),
    configFile: resolve('apps/web/vite.config.ts'),
    configLoader: 'runner',
    cacheDir: 'node_modules/.vite-route-access-probe',
    server: { host: '127.0.0.1', port: 41799, strictPort: true },
    plugins: [
      {
        name: 'pavp-route-access-browser-probe',
        enforce: 'pre',
        resolveId(id) {
          return id === routeModule || id === appModule ? '\0' + id : undefined
        },
        load(id) {
          if (id === '\0' + routeModule) return routeSource
          if (id === '\0' + appModule) return appSource
          return undefined
        },
        transform(source, id) {
          if (id.endsWith('/src/app/router/route-registry.ts')) {
            return (
              probeMetadata +
              replaceOnce(
                source,
                '    ...record,\n    hashPolicy:',
                '    ...record,\n    meta: probeMeta(record),\n    hashPolicy:',
              )
            )
          }
          if (id.endsWith('/src/app/router/router-lifecycle.ts'))
            return replaceOnce(
              source,
              "from 'vue-router/auto-routes'",
              "from '" + routeModule + "'",
            )
          if (id.endsWith('/src/main.ts'))
            return (
              "import { accessHost, probeApp } from '" +
              appModule +
              "'\n" +
              replaceOnce(
                replaceOnce(
                  source,
                  'startRuntimeKernel(\n  App,',
                  'startRuntimeKernel(\n  probeApp(App),',
                ),
                '  retainedAppearanceSafetyRestorationAuthority,\n  selectedAccessHost,\n)',
                '  retainedAppearanceSafetyRestorationAuthority,\n  accessHost,\n)',
              )
            )
          return undefined
        },
      },
    ],
  })
  await server.listen()
  server.printUrls()
}
