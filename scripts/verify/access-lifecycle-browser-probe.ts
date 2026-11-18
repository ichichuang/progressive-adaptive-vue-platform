import { resolve } from 'node:path'
import { normalizePath, type Plugin } from 'vite'
import { guardedChartFixtureSource } from './guarded-chart-browser-probe'
import { guardedTableFixtureSource } from './guarded-table-browser-probe'

export function accessLifecycleBrowserProbe(): Plugin {
  const probe = 'virtual:pavp-access-lifecycle-probe'
  const chart = 'virtual:pavp-lifecycle-chart'
  const table = 'virtual:pavp-lifecycle-table'
  const admin = `/@fs/${normalizePath(resolve('scripts/verify/administration-browser-fixture.ts'))}`
  const assembly = `
import { h, ref } from 'vue'
import { createAdministrationFixture } from '${admin}'
import { Fixture, accessHost as chartHost } from '${chart}'
import { setupTable, tableFixtureControls, fixtureTableStatus, setFixtureTableScope, accessHost as tableHost } from '${table}'
import TablePlayground from '/src/app/workbench/tables/TablePlayground.vue'
import { useAccessBoundary } from '/src/app/access/access-boundary.ts'
import { useApplicationNavigation } from '/src/app/router/application-navigation.ts'

const administration = createAdministrationFixture('editable')
const channel = new BroadcastChannel('pavp-lifecycle-fixture')
const hosts = [administration.accessHost, tableHost, chartHost]
const logoutKey = 'pavp-lifecycle-fixture-logout'
const currentScope = ref('first')
const tableControls = tableFixtureControls()
let notify
let deadline
let holdSimulation = false
let simulationDenied = false
let releaseSimulation
const simulationWaiting = ref(false)
const modules = Object.fromEntries(Object.entries(administration.accessHost.administration).map(([name, host]) => {
  const simulation = host.simulation
  return [name, simulation ? { ...host, simulation: {
    ...simulation,
    async prepare(input, signal) {
      const result = await simulation.prepare(input, signal)
      if (holdSimulation) {
        simulationWaiting.value = true
        await new Promise(resolve => { releaseSimulation = resolve })
        simulationWaiting.value = false
      }
      return result
    },
  } } : host]
}))

export const lifecycleHost = {
  administration: modules,
  windowInvalidation: {
    application: 'lifecycle-fixture',
    audience: context => context.identity.kind === 'known' ? 'lifecycle-fixture-session' : undefined,
    send(message) { channel.postMessage(message) },
    subscribe(receive) {
      const listener = event => receive(event.data)
      channel.addEventListener('message', listener)
      return () => { channel.removeEventListener('message',listener); channel.close() }
    },
  },
  resolveContext() {
    return {
      identity: localStorage.getItem(logoutKey) === 'yes'
        ? {kind:'anonymous'}
        : {kind:'known',principalId:'wp11-fixture-operator'},
      scope: [{kind:'organization',id:currentScope.value}],
      ...(deadline === undefined ? {} : { expiresAt: deadline }),
    }
  },
  decisions: hosts.flatMap(host => host.decisions).map(provider => ({
    ...provider,
    evaluate(input) {
      return input.context.identity.kind === 'known' && !(simulationDenied && input.request.action === 'simulate')
        ? provider.evaluate(input) : {status:'deny'}
    },
  })),
  subscribe(onChange) {
    notify = onChange
    const stops = hosts.map(host => host.subscribe(onChange))
    return () => { notify = undefined; stops.forEach(stop => stop()) }
  },
}

export const LifecycleControls = { setup() {
  const access = useAccessBoundary()
  const navigation = useApplicationNavigation()
  const controls = {
    'Fixture switch scope'() {
      currentScope.value = currentScope.value === 'first' ? 'second' : 'first'
      void notify?.({kind:'scope'})
      setFixtureTableScope(currentScope.value)
    },
    'Fixture logout across windows'() {
      localStorage.setItem(logoutKey,'yes')
      void notify?.({kind:'identity',notifyWindows:true})
    },
    'Fixture reset local session'() {
      localStorage.removeItem(logoutKey)
      deadline = undefined
      void notify?.({kind:'identity'})
    },
    'Fixture expire session'() {
      deadline = Date.now() + 250
      void notify?.({kind:'identity'})
    },
    'Fixture freeze next simulation'() { holdSimulation = true },
    'Fixture release simulation'() { holdSimulation = false; releaseSimulation?.() },
    'Fixture revoke simulation'() {
      simulationDenied = true
      void notify?.({kind:'domain',domain:'administration',action:'simulate'})
    },
    'Fixture confirm effective policy'() {
      if (administration.confirmEffectiveness()) tableControls['Withhold fixture read']()
    },
    'Fixture revoke workbench': administration.revoke,
    'Fixture open policies': () => navigation.navigate({name:'administration-policies'}),
  }
  return () => h('details', { style:'position:fixed;inset:auto 0 0 auto;z-index:99999;background:Canvas;color:CanvasText;max-width:75vw' }, [
    h('summary','Lifecycle controls'),
    h('output', {'aria-label':'Lifecycle session'}, (access.readContext().snapshot?.identity.kind ?? access.readContext().status) + ' | ' + currentScope.value + ' | ' + fixtureTableStatus() + (simulationWaiting.value ? ' | Waiting simulation' : '')),
    ...Object.entries({...controls, ...tableControls}).map(([text, onClick]) => h('button',{type:'button',onClick},text)),
  ])
} }

export const LifecycleViews = { setup() {
  const config = setupTable('modal')
  return () => h('aside', {
    'aria-label':'Lifecycle controlled children',
    style:'min-height:0;max-height:60vh;overflow:auto',
  }, [
    h(TablePlayground, { schema: config.schema, controlled: config.control, style:'display:block;min-height:420px' }),
    h(Fixture),
  ])
} }
`
  function insert(source: string, anchor: string, replacement: string): string {
    if (source.split(anchor).length !== 2)
      throw new Error(`The lifecycle probe boundary changed: ${anchor}`)
    return source.replace(anchor, replacement)
  }
  const modules = new Map([
    [`\0${probe}`, assembly],
    [`\0${chart}`, guardedChartFixtureSource],
    [`\0${table}`, guardedTableFixtureSource],
  ])
  return {
    name: 'pavp-access-lifecycle-browser-probe',
    enforce: 'pre',
    resolveId(id) {
      return modules.has(`\0${id}`) ? `\0${id}` : undefined
    },
    load: (id) => modules.get(id),
    transform(source, id) {
      if (id.endsWith('/src/main.ts')) {
        const anchor = '  retainedAppearanceSafetyRestorationAuthority,\n)'
        return `import { lifecycleHost } from '${probe}'\n${insert(source, anchor, '  retainedAppearanceSafetyRestorationAuthority,\n  lifecycleHost,\n)')}`
      }
      if (id.endsWith('/src/App.vue')) {
        const withImport = insert(
          source,
          '<script setup lang="ts">',
          `<script setup lang="ts">\nimport { LifecycleControls } from '${probe}'`,
        )
        return insert(withImport, '  </UiProvider>', '    <LifecycleControls />\n  </UiProvider>')
      }
      if (id.endsWith('/src/app/workbench/charts/ChartLinkedWorkbench.vue')) {
        const withImport = insert(
          source,
          '<script setup lang="ts">',
          `<script setup lang="ts">\nimport { LifecycleViews } from '${probe}'`,
        )
        return insert(
          withImport,
          '@controller="connect"\n      >',
          '@controller="connect"\n      >\n        <LifecycleViews />',
        )
      }
      return undefined
    },
  }
}
