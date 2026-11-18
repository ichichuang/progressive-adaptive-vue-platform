import { resolve } from 'node:path'
import { createServer } from 'vite'

const probeId = 'virtual:pavp-guarded-table-probe'
const routeId = probeId + '-routes'
export const guardedTableFixtureSource = String.raw`
import { h, ref, inject, onScopeDispose, onErrorCaptured } from 'vue'
import { z } from 'zod'
import { NButton } from 'naive-ui/es/button'
import { UiScrollArea, UiTable } from '@platform/ui'
import { useAccessBoundary } from '/src/app/access/access-boundary.ts'
import { useGuardedTable } from '/src/app/tables/use-guarded-table.ts'
import { createGuardedTableEditor } from '/src/app/tables/guarded-table-editor.ts'
import { createApiClient } from '/src/shared/api/index.ts'
import { routerScrollControllerKey } from '/src/app/router/router-scroll-controller.ts'
import { useTableShowcase } from '/src/app/workbench/tables/table-showcase.ts'
import { tableExampleSchema } from '/src/app/workbench/tables/table-examples.ts'
import TablePlayground from '/src/app/workbench/tables/TablePlayground.vue'
import TableRouteEditor from '/src/app/workbench/tables/TableRouteEditor.vue'
import TableExampleWorkbench from '/src/app/workbench/tables/TableExampleWorkbench.vue'
import WorkbenchPage from '/src/app/workbench/WorkbenchPage.vue'

const domain = 'guarded-table-fixture'
const resource = 'inventory'
const globalScope = { kind: 'global' }
const request = (kind, action, item, fieldPath) => ({
  kind, domain, resource, action, ...(item ? { recordId: item } : {}), ...(fieldPath ? { fieldPath } : {}),
})
const requirement = (req) => ({ operator: 'all', scope: globalScope, requests: [req] })
const principal = ref('fixture-table-principal')
const team = ref('first')
const revocations = new Set()
const key = (recordId, action, fieldPath) => [recordId, action, fieldPath].join(':')
let notify
export const accessHost = {
  resolveContext() { return { identity: { kind: 'known', principalId: principal.value },
    scope: [{ kind: 'team', id: team.value }] } },
  decisions: [{ domain, targets: ['collection', 'type', 'record', 'field'], evaluate({ request }) {
    if (request.recordId === 'item-restricted' || revocations.has(key(request.recordId, request.action, request.fieldPath)))
      return { status: 'deny' }
    if (request.action === 'partial-remove' && request.recordId === 'item-b') return { status: 'deny' }
    return { status: 'allow' }
  } }],
  subscribe(listener) { notify = listener; return () => { notify = undefined } },
}
const saved = ref({})
const dispatches = ref(0)
const lastPatch = ref('')
const lastBatch = ref('')
const hold = ref(false)
let release
let releaseWrite
let releaseValidation
const holdValidation = ref(false)
const waitingValidation = ref(false)
const holdWrite = ref(false)
const waitingWrite = ref(false)
const waiting = ref(false)
const rows = () => [
  { id: 'item-a', title: saved.value['item-a'] ?? 'Authorized item A', price: 17.5, stock: 22, ignored: 'fixture raw private value' },
  { id: 'item-b', title: saved.value['item-b'] ?? 'Authorized item B', price: 19.5, stock: 25 },
  { id: 'item-restricted', title: 'fixture restricted row', price: 9000, stock: 999 },
].filter((row) => team.value === 'first' || row.id === 'item-b')
const endpoint = {
  id: 'guarded-table-fixture-detail', path: ['record'], method: 'GET', policy: 'standard', authentication: 'provided',
  response: { mode: 'json', mimeTypes: ['application/json'], schema: z.record(z.string(), z.json()) },
}
const client = createApiClient({
  configuration: { status: 'configured', baseUrl: 'https://example.test/' },
  authorize: async () => ({ headers: {}, credentials: 'omit' }),
  async fetch(url) {
    const value = rows().find((row) => row.id === url.searchParams.get('id'))
    if (hold.value) {
      waiting.value = true
      await new Promise((resolve) => { release = resolve })
      waiting.value = false
    }
    return Response.json(value ?? null)
  },
})
const action = (name, patch, label) => ({
  requirement: (item) => requirement(request('record', name, item.id)),
  isTargetCurrent: () => true,
  businessAllows: () => true,
  async dispatch(commands) {
    const results = []
    for (const command of commands) {
      if (!command.isCurrent()) continue
      dispatches.value++
      if (patch && holdWrite.value) {
        waitingWrite.value = true
        await new Promise((resolve) => { releaseWrite = resolve })
        waitingWrite.value = false
        results.push({ status: 'completed', requestId: command.requestId, targetId: command.target.id, value: 'acknowledged' })
        continue
      }
      if (patch) {
        lastPatch.value = JSON.stringify(patch)
        if (patch.title) saved.value = { ...saved.value, [command.target.id]: patch.title }
      }
      if (label) lastBatch.value = label + ' ' + command.target.id
      results.push({ status: 'completed', requestId: command.requestId, targetId: command.target.id, value: 'acknowledged' })
    }
    return results
  },
})
const editorSchema = {
  fields: [
    { kind: 'text', name: 'title', label: 'Fixture item title', required: true },
    { kind: 'number', name: 'price', label: 'Fixture item price' },
    { kind: 'number', name: 'stock', label: 'Fixture item stock' },
  ],
}
const batchActions = ['all-remove', 'partial-remove'].map((id) => ({ id, label: id, request: { api: id, method: 'DELETE' } }))
export function setupTable(mode) {
  const access = useAccessBoundary()
  const demo = useTableShowcase()
  const base = tableExampleSchema(mode)
  const schema = {
    ...base, source: { kind: 'local' }, sorting: 'multiple', columnSettings: true, selection: 'multiple',
    batchActions, csvExport: { fileName: 'guarded-items.csv', scopes: ['page', 'selected'] },
    keywordSearch: { parameter: 'keywords', fields: ['title', 'price'] },
    columns: base.columns.map((column) => ({ ...column, sortable: true })),
    query: { form: { fields: [{ kind: 'text', name: 'title', label: 'Title filter' }, { kind: 'number', name: 'price', label: 'Price filter' }] } },
    editor: { ...base.editor, form: editorSchema },
    summary: [{ key: 'totals', cells: { title: { kind: 'text', text: 'Fixture scoped summary' }, price: { kind: 'aggregate', scope: 'filtered', operation: 'sum' } } }],
  }
  const guarded = useGuardedTable({
    access, schema, domain, resource, scope: globalScope, recordAction: 'read', recordActions: ['edit', 'remove'],
    target: (row) => ({ id: row.id }),
    fields: {
      selection: 'listed',
      paths: { price: { column: requirement(request('type', 'price-column')), read: 'read-field' } },
    },
    data: { kind: 'local', read: requirement(request('collection', 'list')), rows },
    output: {
      csv: { requirement: requirement(request('collection', 'export')), fields: ['title', 'price'] },
      copy: { requirement: requirement(request('collection', 'copy')), fields: ['title'] },
    },
    translate: demo.translate,
  })
  const makeEditor = (onRecordUnavailable, dedicated = false) => createGuardedTableEditor({
    access, onRecordUnavailable, form: { formId: 'guarded-inventory-editor', copy: demo.copy },
    source: {
      domain, resource, scope: globalScope, selection: 'listed',
      fields: {
        title: { edit: { read: 'read-field', write: 'write-field' }, create: { write: 'write-field' } },
        price: { edit: { read: 'read-field' } },
      },
    },
    canOpen: (mode, row) => mode === 'create' || dedicated || guarded.can(row, mode === 'edit' ? 'edit' : 'read'),
    target: (mode, row) => mode === 'create' ? { id: 'item-reserved' } : (dedicated ? { id: row.id } : guarded.target(row)),
    read: () => ({ client, plan: ({ query }) => ({ status: 'ready', endpoint, input: { query } }) }),
    recordRead: (item) => requirement(request('record', 'read', item.id)),
    recordWrite: (item) => requirement(request('record', 'edit', item.id)),
    action: (patch) => action('edit', patch),
    async validate() {
      if (!holdValidation.value) return 'valid'
      waitingValidation.value = true
      await new Promise(resolve => { releaseValidation = resolve })
      waitingValidation.value = false
      return 'invalid'
    },
  })
  return {
    schema,
    demo,
    guarded,
    makeEditor,
    control: {
      table: guarded.table, editor: makeEditor(), batch: guarded.batch({
        'all-remove': { action: action('partial-remove', undefined, 'all-dispatched') },
        'partial-remove': { action: action('partial-remove', undefined, 'partial-dispatched'), mode: 'partial' },
      }),
      canRemove: (row) => guarded.can(row, 'remove'),
      removal(row) {
        const bound = guarded.target(row)
        if (!bound) return
        return { target: bound, action: action('remove', undefined, 'row-removed') }
      },
      destination: (mode, row) => ({
        name: 'component-combination-page', query: { mode, id: mode === 'create' ? 'item-reserved' : row.id },
      }),
      copy: { copyPage: () => 'Copy fixture page', accessStatus: (state) => 'Access: ' + state },
      formatBatchOutcome: ({ targetId, status }) => targetId + ' ' + status,
    },
  }
}

export const TableProbe = {
  name: 'GuardedTableFixture', props: ['title', 'message'], inheritAttrs: false,
  setup(props) {
    const view = ref('modal')
    const narrow = ref(false)
    const Modal = { setup: () => { const config = setupTable('modal'); return () => h(TablePlayground, { schema: config.schema, controlled: config.control }) } }
    const Drawer = { setup: () => { const config = setupTable('drawer'); return () => h(TablePlayground, { schema: config.schema, controlled: config.control }) } }
    const Page = { setup: () => { const config = setupTable('page'); return () => h(TablePlayground, { schema: config.schema, controlled: config.control }) } }
    const Cells = { setup: () => { const { guarded, demo } = setupTable('modal'); return () => h(UiTable, { table: guarded.table, copy: demo.tableCopy }, {
      cell: ({ row, value }) => h('span', { 'data-fixture-cell': JSON.stringify(row) }, String(value ?? '')),
    }) } }
    const hosts = { modal: Modal, drawer: Drawer, page: Page, cells: Cells }
    return () => h(TableExampleWorkbench, { title: props.title, message: props.message, example: 'modal' }, {
      controls: () => ['modal', 'drawer', 'page', 'cells'].map((mode) => h(NButton, {
        onClick: () => { view.value = mode },
      }, { default: () => 'Fixture ' + mode })).concat(
        h(NButton, { onClick: () => { narrow.value = !narrow.value } }, { default: () => 'Fixture narrow host' })),
      default: () => h('div', { class: 'flex flex-1 min-h-0 min-w-0',
        style: narrow.value ? 'width: min(390px, 100%)' : undefined }, [h(hosts[view.value])]),
    })
  },
}
export const DedicatedProbe = {
  name: 'GuardedDedicatedEditorFixture', props: ['routeInput', 'title', 'message'], inheritAttrs: false,
  setup(props) {
    const register = inject(routerScrollControllerKey)
    let releaseScroll
    const connect = (controller) => {
      releaseScroll?.()
      releaseScroll = controller ? register?.(controller) : undefined
    }
    onScopeDispose(() => connect(null))
    const config = setupTable('page')
    return () => {
      const query = props.routeInput.query
      return h(WorkbenchPage, { contained: true, title: props.title, message: props.message }, {
        default: () => h(TableRouteEditor, { key: query.mode + ':' + query.id, active: true, mode: query.mode, recordId: query.id,
          onScrollController: connect,
          controlled: { table: config.guarded.table, target: (id) => id ? { id } : undefined,
            editor: (unavailable) => config.makeEditor(unavailable, true),
            fallback: { name: 'component-combination-modal' },
          },
        }),
      })
    }
  },
}
function tableFixtureControls() {
  const revoke = (kind, action, id, fieldPath) => {
    revocations.add(key(id, action, fieldPath))
    const change = kind === 'domain' ? { kind, domain, action }
      : { kind, domain, resource, action, recordId: id, ...(fieldPath ? { fieldPath } : {}) }
    void notify?.(change)
  }
  return {
    'Withhold fixture write': () => revoke('record', 'edit', 'item-a'),
    'Withhold fixture read': () => revoke('record', 'read', 'item-a'),
    'Withhold fixture column': () => revoke('domain', 'price-column'),
    'Withhold fixture route': () => revoke('domain', 'open-editor'),
    'Change fixture scope': () => { team.value = 'second'; void notify?.({ kind: 'scope' }) },
    'Change fixture identity': () => { principal.value = 'fixture-table-alternate'; void notify?.({ kind: 'identity' }) },
    'Hold fixture detail': () => { hold.value = true },
    'Release fixture detail': () => { hold.value = false; release?.() },
    'Hold fixture validation': () => { holdValidation.value = true },
    'Release fixture validation': () => { holdValidation.value = false; releaseValidation?.() },
    'Hold fixture command': () => { holdWrite.value = true },
    'Release fixture command': () => { holdWrite.value = false; releaseWrite?.() },
    'Withhold fixture export': () => revoke('domain', 'export'),
  }
}
export { tableFixtureControls }
export function setFixtureTableScope(value) { team.value = value }
export function fixtureTableStatus() {
  return dispatches.value + ' | ' + lastPatch.value + ' | ' + lastBatch.value +
    (waiting.value ? ' | Waiting detail' : '') + (waitingWrite.value ? ' | Waiting command' : '') +
    (waitingValidation.value ? ' | Waiting validation' : '')
}
export function probeApp(App) {
  const actions = tableFixtureControls()
  return { setup() {
    onErrorCaptured((cause) => { console.error('Guarded table fixture', cause) })
    return () => [
    h(App),
    h('aside', { 'aria-label': 'Guarded fixture controls', style: 'position: fixed; bottom:0; right:0; z-index:99999; background:white; color:black; max-width:80vw' },
      Object.entries(actions).map(([label, onClick]) => h('button', { type: 'button', onClick }, label)).concat(
        h('output', { 'aria-label': 'Guarded fixture result' }, fixtureTableStatus()),
      ),
    ),
  ] } }
}
`

function replace(source: string, from: string, to: string): string {
  if (source.split(from).length !== 2) throw new Error('The guarded table probe entry changed.')
  return source.replace(from, to)
}

export async function serveGuardedTableBrowserProbe(): Promise<void> {
  const server = await createServer({
    root: resolve('apps/web'),
    configFile: resolve('apps/web/vite.config.ts'),
    configLoader: 'runner',
    cacheDir: 'node_modules/.vite-guarded-table-probe',
    server: { host: '127.0.0.1', port: 41803, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'guarded-table-browser-probe',
        enforce: 'pre',
        resolveId(id) {
          return id === probeId || id === routeId ? '\0' + id : undefined
        },
        load(id) {
          if (id === '\0' + probeId) return guardedTableFixtureSource
          if (id === '\0' + routeId)
            return `import { routes as generated } from 'vue-router/auto-routes'
export const routes = generated.map((record) => record.name === 'component-combination-modal'
  ? { ...record, component: () => import("${probeId}").then((probe) => probe.TableProbe) }
  : record.name === 'component-combination-page'
    ? { ...record, component: () => import("${probeId}").then((probe) => probe.DedicatedProbe) }
    : record)`
          return undefined
        },
        transform(source, id) {
          if (id.endsWith('/src/app/router/route-registry.ts'))
            return replace(
              source,
              "  defineTableExampleRoute('combination', 'page'),",
              `  defineRoute({
  ...defineTableExampleRoute('combination', 'page'),
  querySchemaId: 'route-query.guarded-table-fixture',
  meta: { ...defineTableExampleRoute('combination', 'page').meta, auth: 'required',
    requiredPermissionIds: ['open-editor'],
    permissionRequests: { 'open-editor': { kind:'type', domain:'guarded-table-fixture', resource:'inventory', action:'open-editor' } },
  },
}),`,
            )
          if (id.endsWith('/src/app/router/route-schemas.ts'))
            return replace(
              source,
              'export const routeQuerySchemaRegistry = Object.freeze([',
              `export const routeQuerySchemaRegistry = Object.freeze([
  Object.freeze({ id: 'route-query.guarded-table-fixture', schema: z.strictObject({
    mode: z.enum(['create', 'edit', 'detail']).default('create'), id: z.string().regex(/^item-[a-z]+$/u).default('item-reserved'),
  }) }),`,
            )
          if (id.endsWith('/src/app/router/router-lifecycle.ts'))
            return replace(source, "from 'vue-router/auto-routes'", "from '" + routeId + "'")
          if (id.endsWith('/src/main.ts'))
            return (
              `import { accessHost, probeApp } from "${probeId}"\n` +
              replace(
                replace(
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
