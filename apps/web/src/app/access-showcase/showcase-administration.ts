import type { UiLocale } from '@platform/ui'
import type { AccessProvider, AccessRequest } from '../access/access-contract'
import { createNativeGrantProvider } from '../access/native-grants'
import type {
  AdministrationCommand,
  AdministrationHost,
  AdministrationModuleHost,
} from '../administration/administration-host'
import { administrationPageSchema } from '../administration/administration-records'
import { administrationAccessDomain } from '../administration/administration-routes'
import { members, organizations } from './showcase-data'
import { localShowcaseRead } from './showcase-read'
import { globalShowcaseScope, showcaseRequirement } from './showcase-requirements'
import type { ShowcaseWorld } from './showcase-world'

const module = 'policies'
const domain = administrationAccessDomain
const policyId = 'showcase-policy'
const policyCopy = {
  subject: { en: 'Signal project access policy', 'zh-CN': '信号项目访问策略' },
  saved: { en: 'Saved for review', 'zh-CN': '已保存，待审核' },
  confirmed: { en: 'Confirmed', 'zh-CN': '已确认' },
  source: { en: 'Local showcase', 'zh-CN': '本地演示' },
  detail: { en: 'Simulated policy management', 'zh-CN': '模拟策略管理' },
  model: { en: 'native', 'zh-CN': '原生' },
  scope: { en: organizations[0].en, 'zh-CN': organizations[0].zh },
  baseline: { en: 'Confirmed project navigation grants.', 'zh-CN': '已确认项目导航权限。' },
  proposed: {
    en: 'Proposed project navigation change awaiting confirmation.',
    'zh-CN': '项目导航权限的变更草案待确认。',
  },
  noProposal: { en: 'No saved proposal.', 'zh-CN': '尚无已保存的草案。' },
  save: { en: 'Save policy for review', 'zh-CN': '保存策略以供审核' },
  publish: { en: 'Confirm effective policy', 'zh-CN': '确认策略生效' },
} satisfies Record<string, Record<UiLocale, string>>
const policyLabels = new Map(Object.values(policyCopy).map((copy) => [copy.en, copy]))

function request(kind: 'collection' | 'type', resource: string, action: string): AccessRequest {
  return { kind, domain, resource, action }
}
function record(action: string): AccessRequest {
  return { kind: 'record', domain, resource: module, recordId: policyId, action }
}

const policyFields = [
  'label',
  'status',
  'source',
  'detail',
  'model',
  'editable',
  'scopeLabel',
  'activeRevision',
  'draftState',
  'baselineSummary',
  'draftSummary',
] as const

const requests = [
  request('type', 'workbench', 'view'),
  request('type', module, 'view'),
  request('collection', module, 'list'),
  record('read'),
  record('save'),
  record('publish'),
  request('type', module, 'columns'),
]
const field = { kind: 'field', domain, resource: module, action: 'read-field' } as const
const capabilities = [
  ...requests.map(({ kind, resource, action }) => ({ kind, resource, action })),
  { kind: field.kind, resource: field.resource, action: field.action },
]
const grants = [
  ...requests,
  ...policyFields.map((fieldPath) => ({ ...field, recordId: policyId, fieldPath })),
]

export function createShowcaseAdministration(world: ShowcaseWorld) {
  const { state } = world
  function confirmedAuthority() {
    return createNativeGrantProvider(domain, capabilities, {
      complete: true,
      revision: state.policyRevision,
      roles: [],
      subjects: [
        {
          identity: { kind: 'known', principalId: members[0].id },
          groups: [],
          roles: [],
          grants: grants.map((entry) => ({
            effect: 'allow',
            request: entry,
            scope: { kind: 'exact', path: [{ kind: 'organization', id: organizations[0].id }] },
          })),
        },
      ],
    })
  }
  const provider: AccessProvider = {
    domain,
    targets: ['type', 'collection', 'record', 'field'],
    evaluate: (binding) => confirmedAuthority().evaluate(binding),
  }
  function policyRow() {
    return {
      id: policyId,
      revision: state.adminRevision,
      label: policyCopy.subject.en,
      status: state.policyDraft ? policyCopy.saved.en : policyCopy.confirmed.en,
      source: policyCopy.source.en,
      detail: policyCopy.detail.en,
      model: 'native',
      editable: true,
      scopeLabel: policyCopy.scope.en,
      activeRevision: state.policyRevision,
      draftState: state.policyDraft ? ('saved' as const) : ('unsaved' as const),
      baselineSummary: policyCopy.baseline.en,
      draftSummary: state.policyDraft ? policyCopy.proposed.en : policyCopy.noProposal.en,
    }
  }
  function command(kind: 'save' | 'publish'): AdministrationCommand {
    return {
      kind,
      label: policyCopy[kind].en,
      grantable: () => state.grantable,
      action: world.guardedCommand<unknown>(
        () => showcaseRequirement(record(kind)),
        (target) => {
          if (state.adminConflict) {
            state.adminConflict = false
            state.adminRevision = world.issueRevision()
            return
          }
          if (
            !state.grantable ||
            target.revision !== state.adminRevision ||
            target.proposal?.values['expectedActiveRevision'] !== state.policyRevision
          )
            return
          state.adminRevision = world.issueRevision()
          if (kind === 'save') state.policyDraft = true
          else {
            state.policyDraft = false
            state.policyRevision = world.issueRevision()
            void world.setProjectAccess(!state.projectAccess)
          }
          return true
        },
        {
          isTargetCurrent: ({ id }) => id === policyId,
          businessAllows: () => kind === 'save' || state.policyDraft,
        },
      ),
    }
  }

  const policies: AdministrationModuleHost = {
    domain,
    resource: module,
    scope: globalShowcaseScope,
    recordRead: 'read',
    completeness: 'partial',
    displayText: (value, locale) => policyLabels.get(value)?.[locale] ?? value,
    read: localShowcaseRead(
      world,
      'showcase-policy-list',
      administrationPageSchema,
      () => showcaseRequirement(request('collection', module, 'list')),
      (_context, query) => {
        const row = policyRow()
        const keyword = typeof query['keyword'] === 'string' ? query['keyword'].toLowerCase() : ''
        const matches = [
          policyCopy.subject,
          state.policyDraft ? policyCopy.saved : policyCopy.confirmed,
        ].some((label) => Object.values(label).some((text) => text.toLowerCase().includes(keyword)))
        const rows = matches ? [row] : []
        return { rows: Number(query['offset']) > 0 ? [] : rows, total: rows.length }
      },
    ),
    query: ({ page, pageSize, filters }) => ({
      offset: (page - 1) * pageSize,
      ...(typeof filters['keyword'] === 'string' ? { keyword: filters['keyword'] } : {}),
    }),
    projection: {
      selection: 'all',
      paths: Object.fromEntries(
        policyFields.map((field) => [
          field,
          {
            column: showcaseRequirement(request('type', module, 'columns')),
            read: 'read-field',
          },
        ]),
      ),
    },
    commands: [command('save'), command('publish')],
    simulation: {
      requirement: showcaseRequirement(record('read')),
      subjects: members,
      request: () => record('read'),
      async prepare({ context, subjectId }, signal) {
        const generation = world.currentGeneration()
        const snapshot = confirmedAuthority()
        await world.wait(state.latency)
        if (signal.aborted || world.currentGeneration() !== generation) return
        return {
          provider: snapshot,
          context: { ...context, identity: { kind: 'known', principalId: subjectId } },
        }
      },
    },
  }
  return { provider, modules: { policies } satisfies AdministrationHost }
}
