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
      label: 'Signal project access policy',
      status: state.policyDraft ? 'Saved for review' : 'Confirmed',
      source: 'Local showcase',
      detail: 'Simulated policy management',
      model: 'native',
      editable: true,
      scopeLabel: organizations[0].en,
      activeRevision: state.policyRevision,
      draftState: state.policyDraft ? ('saved' as const) : ('unsaved' as const),
      baselineSummary: 'Confirmed project navigation grants.',
      draftSummary: state.policyDraft
        ? 'Proposed project navigation change awaiting confirmation.'
        : 'No saved proposal.',
    }
  }
  function command(kind: 'save' | 'publish', label: string): AdministrationCommand {
    return {
      kind,
      label,
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
    read: localShowcaseRead(
      world,
      'showcase-policy-list',
      administrationPageSchema,
      () => showcaseRequirement(request('collection', module, 'list')),
      (_context, query) => {
        const row = policyRow()
        const keyword = typeof query['keyword'] === 'string' ? query['keyword'].toLowerCase() : ''
        const rows = row.label.toLowerCase().includes(keyword) ? [row] : []
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
    commands: [
      command('save', 'Save policy for review'),
      command('publish', 'Confirm effective policy'),
    ],
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
