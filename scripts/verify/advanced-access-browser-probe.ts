import { resolve } from 'node:path'
import { createServer } from 'vite'

const probeId = 'virtual:pavp-advanced-access-probe'
const hostId = probeId + '-host'
const fixtureHost = String.raw`
import { ref } from 'vue'
import { createCaslAccess } from '/src/app/access/casl-access.ts'
import { createRelationshipAccess } from '/src/app/access/relationship-access.ts'

const domain = 'wp09-conditional-fixture'
const groupDomain = 'wp09-relationship-fixture'
const identity = { kind:'known', principalId:'wp09-fixture-principal' }
const scopePath = [{ kind:'team', id:'wp09-fixture-team' }]
const scope = { kind:'exact', path:scopePath }
const resource = 'task'
const request = (kind, action, recordId, fieldPath) => ({kind,domain,resource,action,
  ...(recordId ? {recordId} : {}), ...(fieldPath ? {fieldPath} : {})})
const required = (request) => ({ operator:'all', scope, requests:[request] })
const owner = ref(identity.principalId)
const modelRows = [
  {id:'item-a',title:'Fixture owned task',amount:40,note:'Unpublished fixture secret'},
  {id:'item-b',title:'Fixture other task',amount:90,note:'Another unpublished secret'},
]
const automatic = { owner: identity.principalId }
const casl = createCaslAccess({
  domain, scope,
  mappings: [
    ['type','columns'],['collection','list'],['record','read'],['record','write'],
    ['field','read-field'],['field','write-field'],['record','validate-proposal'],
  ].map(([kind,action]) => ({
    kind,resource,action,subject:'Task',abilityAction:action,
    ...(action === 'validate-proposal' ? {input:'candidate'} : {}),
  })),
  policy:{revision:'fixture-policy',rules:[
    {action:'columns',subject:'Task'}, {action:'list',subject:'Task'},
    {action:'read',subject:'Task',conditions:automatic},
    {action:'write',subject:'Task',conditions:automatic},
    {action:'read-field',subject:'Task',fields:['title','amount'],conditions:automatic},
    {action:'write-field',subject:'Task',fields:['title','note'],conditions:automatic},
    {action:'validate-proposal',subject:'Task',conditions:{accepted:true}},
  ]},
  loadFacts(binding,input,paths) {
    const known = (value) => ({status:'known',value})
    return {binding,input,complete:[...paths],
      ...(input === 'candidate' ? {proposalRevision:binding.proposal.revision} : {}),
      facts: input==='candidate'
        ? {accepted:known(binding.proposal.values.note !== 'reject')}
        : {owner:known(binding.request.recordId==='item-a' ? owner.value : 'another-principal')},
    }
  },
})
const project = {resource:'project',id:'parent'}
const groupLink = {kind:'group',id:'crew'}
const graph = {
  complete:true,scope:scopePath,revision:'fixture-relations',
  principals:[identity.principalId],
  groups:[{id:'crew',members:[{principal:{kind:'principal',id:identity.principalId}}]}],
  objects:[project,{resource,id:'item-a',parent:project}],
  edges:[{object:project,principal:groupLink,relation:'collaborator'}],
}
const relationship = createRelationshipAccess({
  domain:groupDomain,snapshot:graph,
  mappings:[
    {resource:'project',action:'link',allow:['owner'],inherit:[]},
    {resource,action:'link',allow:['collaborator'],inherit:['project']},
  ],
})
const groupCheck = required({kind:'record',domain:groupDomain,resource,recordId:'item-a',action:'link'})
export const accessHost = {
  resolveContext() {return {identity,scope:scopePath}},
  decisions:[casl.provider,relationship.provider],
}
export { domain, scope, resource, request, required, owner, modelRows, casl, graph, relationship, groupCheck }
`

const fixture = String.raw`
import { h, ref, onScopeDispose } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { UiForm, UiG2Chart, UiTable } from '@platform/ui'
import { useAccessBoundary } from '/src/app/access/access-boundary.ts'
import { observeNativeRequirement } from '/src/app/access/native-requirement.ts'
import { executeGuardedAction } from '/src/app/access/guarded-action.ts'
import { useGuardedForm } from '/src/app/forms/use-guarded-form.ts'
import { useGuardedTable } from '/src/app/tables/use-guarded-table.ts'
import { useGuardedChart } from '/src/app/charts/use-guarded-chart.ts'
import { useTableShowcase } from '/src/app/workbench/tables/table-showcase.ts'
import {domain,scope,resource,request,required,owner,modelRows,casl,graph,relationship,groupCheck} from "${hostId}"

const neutralOptions = {type:'view',children:[]}

export const AdvancedFixture = {setup() {
  const access = useAccessBoundary()
  const demo = useTableShowcase()
  const target = {id:'item-a',mode:'edit',revision:'fixture-item-revision'}
  const saves = ref(0)
  const lastSave = ref('')
  const linked = ref('')
  const pending = ref(false)
  const field = (canRead,canWrite) => ({edit:{
    ...(canRead ? {read:'read-field'} : {}), ...(canWrite ? {write:'write-field'} : {}),
  }})
  const form = useGuardedForm({
    access,form:{formId:'wp09-fixture-form',copy:{...demo.copy,submit:()=> 'Save conditional form'},
      schema:{fields:[
        {kind:'text',name:'title',label:'Task title'},
        {kind:'text',name:'note',label:'Replacement note'},
        {kind:'number',name:'amount',label:'Confirmed amount'},
      ]}},
    source:{domain,resource,scope,selection:'all',
      fields:{title:field(true,true),note:field(false,true),amount:field(true,false)}},
    target:()=>target,
    confirmed:()=>({receipt:'fixture-data-receipt',values:modelRows[0],isCurrent:()=>true}),
    recordRead:()=>required(request('record','read','item-a')),
    recordWrite:()=>required(request('record','write','item-a')),
    submitRequirement:()=>required(request('record','validate-proposal','item-a')),
    proposal:(payload)=>({revision:'fixture-proposal-'+String(saves.value+1),values:payload}),
    action:()=>({
      isTargetCurrent:()=>true,businessAllows:()=>true,
      async dispatch(commands) { return commands.map((command) => {
        if (!command.isCurrent()) return {status:'not-dispatched',requestId:command.requestId,targetId:command.target.id}
        saves.value++
        lastSave.value=JSON.stringify(command.target.proposal.values)
        return {status:'completed',requestId:command.requestId,targetId:command.target.id,value:'acknowledged'}
      }) },
    }),
  })
  const table = useGuardedTable({
    access,domain,resource,scope,recordAction:'read',target:row=>({id:row.id}),
    data:{kind:'local',read:required(request('collection','list')),rows:()=>modelRows},
    schema:{id:'wp09-fixture-table',rowKey:'id',source:{kind:'local'},columns:[
      {key:'title',title:'Task'},{key:'amount',title:'Amount',kind:'number'},{key:'note',title:'Note'},
    ]},
    fields:{selection:'listed',paths:{note:{column:required(request('type','columns')),read:'read-field'}}},
  })
  const chart = useGuardedChart({
    access,view:required(request('collection','list')),
    options:{type:'interval',key:'tasks',encode:{x:'title',y:'amount'},animate:false},
    series:{tasks:{fields:['title','amount'],input:'window'}},
    records:{domain,resource,id:row=>row.id,read:'read',fields:{title:'read-field',amount:'read-field'}},
    source:{kind:'local',read:()=>({kind:'records',completeness:'complete',rows:modelRows})},
  })
  let check
  function refreshGroup() {
    if (check) void check.evaluate()
  }
  check = observeNativeRequirement(access,groupCheck,refreshGroup)
  refreshGroup()
  onScopeDispose(()=>check.dispose())
  const groupCommand = {
    requirement:()=>groupCheck,isTargetCurrent:()=>true,businessAllows:()=>true,
    dispatch:(commands)=>Promise.resolve(commands.map(({requestId,target}) =>
      ({status:'completed',requestId,targetId:target.id,value:'linked'}))),
  }
  return () => h('section',{class:'grid min-w-0 gap-content-gap p-page-inline','aria-label':'Advanced access fixture'},[
    h('div',{class:'flex flex-wrap gap-component-unit'},[
      h(NButton,{onClick:async()=>{
        pending.value=true
        try {
          const [result]=await executeGuardedAction(access,groupCommand,{
            targets:[{id:'item-a'}],signal:new AbortController().signal,
          })
          linked.value=result.status
        } finally {pending.value=false}
      },loading:pending.value},()=> 'Run linked action'),
      h(NButton,{onClick:()=>void relationship.replaceSnapshot(()=>({...graph,edges:[]}))},()=> 'Remove parent collaboration'),
      h(NButton,{onClick:()=>{
        owner.value='changed-owner'
        casl.invalidateFacts({kind:'record',domain,resource,recordId:'item-a'})
      }},()=> 'Change confirmed owner'),
    ]),
    h('output',{'aria-label':'Adapter results'}, 'Saves '+saves.value+' '+lastSave.value+' | Action '+linked.value+' | '+check.read().status),
    h(UiForm,{form:form.form,mode:'edit'}),
    h(UiTable,{table:table.table,copy:demo.tableCopy}),
    h('div',{style:{height:'240px'}},[h(UiG2Chart,{options:neutralOptions,access:chart.view,label:'Conditional task chart'})]),
  ])
} }
`

function replace(source: string, from: string, to: string): string {
  if (source.split(from).length !== 2) throw new Error('The advanced access probe entry changed.')
  return source.replace(from, to)
}

export async function serveAdvancedAccessProbe(): Promise<void> {
  const server = await createServer({
    root: resolve('apps/web'),
    configFile: resolve('apps/web/vite.config.ts'),
    configLoader: 'runner',
    cacheDir: 'node_modules/.vite-advanced-access-probe',
    optimizeDeps: { include: ['@casl/ability'] },
    server: { host: '127.0.0.1', port: 41810, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'advanced-access-browser-probe',
        enforce: 'pre',
        resolveId(id) {
          return id === probeId || id === hostId ? '\0' + id : undefined
        },
        load(id) {
          if (id === '\0' + probeId) return fixture
          if (id === '\0' + hostId) return fixtureHost
          return undefined
        },
        transform(source, id) {
          if (id.endsWith('/src/pages/component-combination-modal.vue'))
            return replace(
              replace(
                source,
                "import TablePlayground from '../app/workbench/tables/TablePlayground.vue'",
                'import { AdvancedFixture } from "' + probeId + '"',
              ),
              '<TablePlayground :schema="schema" />',
              '<AdvancedFixture />',
            )
          if (id.endsWith('/src/main.ts'))
            return (
              'import { accessHost } from "' +
              hostId +
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
