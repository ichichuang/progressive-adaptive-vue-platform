import { resolve } from 'node:path'
import { createServer, normalizePath } from 'vite'

const hostId = 'virtual:wp10-business-fixture-host'
const probeId = 'virtual:wp10-business-fixture-view'
const fixture = String.raw`
import { h, ref, computed, onScopeDispose } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { UiForm, UiG2Chart, UiTable } from '@platform/ui'
import { AccessRequestDialog, AssuranceDialog, GuardedOperationButton, ResourceSharingDialog, useAssurancePrompt } from '/src/app/access/advanced-interactions.ts'
import { useAccessBoundary } from '/src/app/access/access-boundary.ts'
import { executeDelegationChange } from '/src/app/access/delegation-interaction.ts'
import { useGuardedForm } from '/src/app/forms/use-guarded-form.ts'
import { useGuardedTable } from '/src/app/tables/use-guarded-table.ts'
import { useGuardedChart } from '/src/app/charts/use-guarded-chart.ts'
import { useTableShowcase } from '/src/app/workbench/tables/table-showcase.ts'
import { scenario } from '${hostId}'

const rows = [{ id: scenario.target.id, title: 'Jade report', amount: 4 }]
const confirmedForm = { receipt: 'confirmed-fixture-data', values: rows[0], isCurrent: () => true }
const read = scenario.requirement('read')
const list = scenario.requirement('list')
const emptyChart = { type: 'view', children: [] }

export const BusinessFixture = { setup() {
  const access = useAccessBoundary()
  const { state, target, domain, scope } = scenario
  const copy = useTableShowcase()
  const lifetime = new AbortController()
  onScopeDispose(() => lifetime.abort())
  const sharing = ref(false)
  const request = ref(false)
  const pending = ref(false)
  const feedback = ref('')
  const assurance = useAssurancePrompt(async (intent) => {
    await new Promise(resolve => setTimeout(resolve, 1200))
    return { status: 'verified', intent, expiresAt: Date.now() + 30000 }
  })
  const exportAction = scenario.exportAction(assurance.verify)
  const selected = { action: exportAction, target }
  const chart = useGuardedChart({
    access, view: list, options: { type: 'interval', key: 'reports', encode: { x: 'title', y: 'amount' }, animate: false },
    series: { reports: { fields: ['title', 'amount'], input: 'window' } },
    records: { domain, resource: 'report', id: row => row.id, read: 'read', fields: { title: 'read-field', amount: 'read-field' } },
    source: { kind: 'local', read: () => ({ kind: 'records', completeness: 'complete', rows }) },
  })
  const table = useGuardedTable({
    access, domain, resource: 'report', scope, recordAction: 'read', target: () => target,
    data: { kind: 'local', read: list, rows: () => rows },
    schema: { id: 'wp10-fixture-table', rowKey: 'id', source: { kind: 'local' }, columns: [
      { key: 'title', title: 'Confirmed report' }, { key: 'amount', title: 'Events', kind: 'number' },
    ] },
  })
  const editTarget = { ...target, mode: 'edit' }
  const form = useGuardedForm({
    access, form: { formId: 'wp10-fixture-form', copy: copy.copy, schema: { fields: [
      { kind: 'text', name: 'title', label: 'Report title' },
    ] } },
    source: { domain, resource: 'report', scope, selection: 'all', fields: { title: { edit: { read: 'read-field', write: 'write-field' } } } },
    target: () => editTarget, confirmed: () => confirmedForm, recordRead: () => read,
    recordWrite: () => scenario.requirement('write'), action: () => scenario.makeAction('write'),
  })
  const current = computed(() => access.readContext())
  const button = (text, onClick, disabled = false) => h(NButton, { onClick, disabled }, () => text)
  function change(key, id) { state[key] = !state[key]; scenario.updated(id) }

  async function submit() {
    if (pending.value) return
    pending.value = true
    feedback.value = ''
    try {
      const [result] = await table.execute(exportAction, { targets: [target], signal: lifetime.signal })
      if (!lifetime.signal.aborted) feedback.value = result?.status ?? 'unavailable'
    } finally { pending.value = false }
  }

  return () => h('section', { 'aria-label': 'Business access fixture', class: 'grid min-w-0 gap-content-gap p-page-inline overflow-auto' }, [
    h('div', { class: 'flex flex-wrap gap-control' }, [
      button('Sharing', () => { sharing.value = true }),
      button('Access request', () => { request.value = true }),
      button('Disable feature', () => change('feature', 'export-feature')),
      button('Toggle entitlement', () => change('entitlement', 'export-entitlement')),
      button('Toggle workflow', () => change('exportReady', 'workflow-export')),
      button('Enter delegation', () => executeDelegationChange(access, { target, action: scenario.enter }, 'enter', lifetime.signal), current.value.status !== 'ready' || !!current.value.snapshot.delegation),
      button('Switch context after 2 seconds', () => setTimeout(() => {
        if (!lifetime.signal.aborted) void scenario.select('marin')
      }, 2000)),
      button('Reset fixture', () => scenario.reset()),
    ]),
    h('div', { class: 'flex flex-wrap gap-control items-start' }, [
      h(GuardedOperationButton, { selection: selected, disabled: pending.value, onActivate: submit }, () => 'Export report'),
      h('span', { role: 'status' }, feedback.value),
    ]),
    h(ResourceSharingDialog, { host: scenario.sharing, show: sharing.value, 'onUpdate:show': value => { sharing.value = value } }),
    h(AccessRequestDialog, { host: scenario.accessRequest, show: request.value, 'onUpdate:show': value => { request.value = value } }),
    h(AssuranceDialog, { show: assurance.open.value, verifying: assurance.phase.value === 'verifying', onAccept: assurance.accept, onCancel: assurance.cancel }),
    h(UiForm, { form: form.form }),
    h(UiTable, { table: table.table, copy: copy.tableCopy }),
    h('div', { style: { height: '240px' } }, [h(UiG2Chart, { options: emptyChart, access: chart.view, label: 'Confirmed report chart' })]),
  ])
} }
`

function replace(source: string, from: string, to: string): string {
  if (source.split(from).length !== 2) throw new Error('The business access probe entry changed.')
  return source.replace(from, to)
}

export async function serveBusinessAccessProbe(): Promise<void> {
  const hostSource = `/@fs/${normalizePath(resolve('scripts/verify/business-access-scenario.ts'))}`
  const server = await createServer({
    root: resolve('apps/web'),
    configFile: resolve('apps/web/vite.config.ts'),
    configLoader: 'runner',
    cacheDir: 'node_modules/.vite-business-access-probe',
    server: { host: '127.0.0.1', port: 41812, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'business-access-browser-probe',
        enforce: 'pre',
        resolveId(id) {
          return id === hostId || id === probeId ? '\0' + id : undefined
        },
        load(id) {
          if (id === '\0' + hostId)
            return `import { createBusinessAccessScenario } from '${hostSource}'\nexport const scenario = createBusinessAccessScenario()\nexport const accessHost = scenario.host`
          if (id === '\0' + probeId) return fixture
          return undefined
        },
        transform(source, id) {
          if (id.endsWith('/src/pages/component-combination-modal.vue'))
            return replace(
              replace(
                source,
                "import TablePlayground from '../app/workbench/tables/TablePlayground.vue'",
                `import { BusinessFixture } from '${probeId}'`,
              ),
              '<TablePlayground :schema="schema" />',
              '<BusinessFixture />',
            )
          if (id.endsWith('/src/main.ts'))
            return (
              `import { accessHost } from '${hostId}'\n` +
              replace(
                source,
                '  retainedAppearanceSafetyRestorationAuthority,\n)',
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
