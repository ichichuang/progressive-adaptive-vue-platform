import { resolve } from 'node:path'
import { createServer } from 'vite'

const probeId = 'virtual:pavp-guarded-chart-probe'
export const guardedChartFixtureSource = String.raw`
import { computed, h, ref } from 'vue'
import { UiChartTimeRange, UiG2Chart } from '@platform/ui'
import { useAccessBoundary } from '/src/app/access/access-boundary.ts'
import { useGuardedChart } from '/src/app/charts/use-guarded-chart.ts'

const domain = 'guarded-chart-fixture'
const resource = 'measures'
const scope = { kind: 'global' }
const requirement = action => ({ operator:'all', scope, requests:[{ kind:'collection', domain, resource, action }] })
const denied = new Set()
const key = ({action, recordId, fieldPath}) => [action,recordId,fieldPath].join(':')
let notify
let team = 'alpha'
let principalId = 'guarded-chart-fixture-principal'
export const accessHost = {
  resolveContext: () => ({identity:{kind:'known',principalId},scope:[{kind:'team',id:team}]}),
  decisions: [{domain, targets:['collection','record','field'], evaluate({request}) {
    return {status:denied.has(key(request)) ? 'deny' : 'allow'}
  }}],
  subscribe(listener) { notify = listener; return () => { notify = undefined } },
}
const empty = { type:'view', children:[] }
const rows = [
  {id:'a',time:1,amount:18,privateAmount:92,caption:'Fixture private label',extra:'Fixture forbidden raw'},
  {id:'b',time:4,amount:34,privateAmount:51,caption:'Remaining private label'},
  {id:'c',time:6,amount:24,privateAmount:63,caption:'Another private label'},
]
const options = {
  type:'view', paddingLeft:38, paddingBottom:36,
  children:[
    {type:'interval',key:'amounts',encode:{x:'time',y:'amount'},axis:{x:{title:false},y:{title:false}},
      tooltip:{items:['amount']},animate:{enter:{type:'growInY',duration:1200}}},
    {type:'point',key:'private',encode:{x:'time',y:'privateAmount',size:7},
      tooltip:{items:['caption','privateAmount']}, animate:{enter:{type:'fadeIn',duration:1500}}},
  ],
}
function revoke(kind, action, id, fieldPath) {
  denied.add(key({action,recordId:id,fieldPath}))
  void notify?.({kind,domain,action,...(id ? {resource,recordId:id} : {}),...(fieldPath ? {fieldPath} : {})})
}

export const Fixture = { setup() {
  const access = useAccessBoundary()
  const painted = ref(0)
  const chart = ref()
  const result = ref('')
  const narrow = ref(false)
  const tracking = ref(false)
  const model = useGuardedChart({
    access,view:requirement('view'),options,
    series:{
      amounts:{fields:['time','amount'],input:'window'},
      private:{fields:['time','privateAmount','caption'],input:'complete'},
    },
    records:{domain, resource, id: row=>row.id, read:'record', fields:{privateAmount:'field',caption:'field'}},
    source:{kind:'local',read:(context)=>{
      if (team === 'empty') return {kind:'records',completeness:'complete',rows:[]}
      return {kind:'records',completeness:'complete',rows:team==='alpha' && context.scope[0]?.id !== 'second' ? rows : rows.slice(1)}
    }},
    time:{field:'time',overview:'amount',permitted:()=>team==='empty' ? undefined : [0,7]},
    output:{image:requirement('image'), data:{requirement:requirement('csv'),fields:['amount']}},
  })
  const aggregate = useGuardedChart({
    access,view:requirement('aggregate'),
    options:{type:'interval',key:'total',encode:{x:'bucket',y:'sum'},animate:false},
    series:{total:{fields:['bucket','sum'],input:'aggregate'}},
    source:{kind:'local',read:()=>({kind:'aggregate',rows:[{bucket:'Aggregate only',sum:29}]})},
  })
  const range = computed(()=>model.range.value ?? [0,7])
  const buttons = {
    'Revoke field':()=>revoke('field','field','a','privateAmount'),
    'Revoke record':()=>revoke('record','record','b'),
    'Revoke image':()=>revoke('domain','image'),
    'Empty scope':()=>{ team='empty'; void notify?.({kind:'scope'}) },
    'Revoke during render':async()=>{
      if (await model.refresh() === 'stale') return
      const target = '[aria-label="Guarded measured chart"]'
      let attempts = 0
      const interrupt = ()=>{
        const host=document.querySelector(target)
        if (++attempts < 24 && !host?.querySelector('div canvas')) { requestAnimationFrame(interrupt); return }
        result.value='Revoked with busy '+host?.getAttribute('aria-busy')
        team='empty'; void notify?.({kind:'scope'})
      }
      requestAnimationFrame(interrupt)
    },
    'Switch scope':()=>{ team=team==='alpha' ? 'beta' : 'alpha'; void notify?.({kind:'scope'}) },
    'Switch identity':()=>{ principalId=principalId.endsWith('alternate') ? 'guarded-chart-fixture-principal' : 'guarded-chart-fixture-alternate'; void notify?.({kind:'identity'}) },
    'Narrow':()=>{ narrow.value=!narrow.value },
    'Capture image': async()=>{ try {const blob=await chart.value.exportImage(); result.value='Image '+blob.size} catch {result.value='Unavailable'} },
    'Revoke pending image': async()=> {
      const pending=chart.value.exportImage()
      revoke('domain','image')
      try { await pending; result.value='Unexpected image' }
      catch { result.value='Image rejected after revocation' }
    },
    'Read export rows':()=>{ const output=model.exportData('amounts'); result.value=output?.isCurrent() ? JSON.stringify(output.rows) : 'Unavailable' },
  }
  return ()=>h('section',{style:{padding:'16px',width:narrow.value?'390px':'min(680px, 100%)'},'aria-label':'Guarded chart fixture'},[
    h('div',Object.entries(buttons).map(([label,onClick])=>h('button',{type:'button',onClick},label))),
    h('output',{'aria-label':'Chart state'}, model.status.value+' | '+painted.value+' | '+result.value+' | '+tracking.value+' | '+range.value.join(',')),
    h('div',{style:{height:'285px'}},[h(UiG2Chart,{ref:chart,options:empty,access:model.view,label:'Guarded measured chart',onRendered:()=>{painted.value++}})]),
    h(UiChartTimeRange,{
      value:range.value, min:model.timeline.value?.bounds[0]??0, max:model.timeline.value?.bounds[1]??7,
      overview:model.timeline.value?.overview??[],isCurrent:()=>!!model.timeline.value,
      formatValue:value=>String(value), label:'Guarded overview', startLabel:'Start',endLabel:'End',helpText:'Use arrows',
      onStart:()=>{tracking.value=true},onEnd:()=>{tracking.value=false},
      'onUpdate:value':value=>{void model.timeline.value?.select(value)},
    }),
    h('div',{style:{height:'170px'}},[h(UiG2Chart,{options:empty,access:aggregate.view,label:'Guarded aggregate chart'})]),
    h('div',{style:{height:'170px'}},[h(UiG2Chart,{label:'Public chart fixture',options:{
      type:'interval',data:[{name:'Public',count:35}],encode:{x:'name',y:'count'},animate:false,
    }})]),
  ])
} }
`

function replace(source: string, from: string, to: string): string {
  if (source.split(from).length !== 2) throw new Error('The guarded chart probe entry changed.')
  return source.replace(from, to)
}

export async function serveGuardedChartBrowserProbe(): Promise<void> {
  const server = await createServer({
    root: resolve('apps/web'),
    configFile: resolve('apps/web/vite.config.ts'),
    configLoader: 'runner',
    cacheDir: 'node_modules/.vite-guarded-chart-probe',
    server: { host: '127.0.0.1', port: 41808, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'guarded-chart-browser-probe',
        enforce: 'pre',
        resolveId(id) {
          return id === probeId ? '\0' + id : undefined
        },
        load(id) {
          return id === '\0' + probeId ? guardedChartFixtureSource : undefined
        },
        transform(source, id) {
          if (id.endsWith('/src/pages/component-chart-linked.vue') && !id.includes('?'))
            return "<script>export { Fixture as default } from '" + probeId + "'</script>"
          if (id.endsWith('/src/main.ts'))
            return (
              'import { accessHost } from "' +
              probeId +
              '"\n' +
              replace(
                source,
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
