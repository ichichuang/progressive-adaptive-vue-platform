import type {
  AccessHost,
  AccessHostChange,
  AccessRequest,
} from '../../apps/web/src/app/access/access-contract'
import type {
  AdministrationCommand,
  AdministrationHost,
  AdministrationModuleHost,
} from '../../apps/web/src/app/administration/administration-host'
import {
  administrationModules,
  type AdministrationModule,
} from '../../apps/web/src/app/administration/administration-routes'
import type { GuardedAction } from '../../apps/web/src/app/access/guarded-action'
import { createNativeGrantProvider } from '../../apps/web/src/app/access/native-grants'
import { createApiClient } from '../../apps/web/src/shared/api'
import {
  administrationPageSchema,
  type AdministrationRecord,
} from '../../apps/web/src/app/administration/administration-records'

const domain = 'administration'
const global = { kind: 'global' } as const
const scope = [{ kind: 'organization', id: 'wp11-fixture-orchard' }] as const
const operator = { kind: 'known', principalId: 'wp11-fixture-operator' } as const
const requirement = (request: AccessRequest) => ({
  scope: global,
  operator: 'all' as const,
  requests: [request],
})
type Row = AdministrationRecord
function row(
  id: string,
  label: string,
  status: string,
  source = 'direct',
  model = 'native',
  editable = true,
): Row {
  return {
    id,
    revision: 'seed',
    label,
    status,
    source,
    model,
    editable,
    detail: 'Local simulation',
    scopeLabel: 'Orchard organization',
  }
}

export function createAdministrationFixture(mode: 'editable' | 'readonly' | 'missing' | 'deny') {
  let version = 0
  let revoked = mode === 'deny'
  let nextSaveFailure: 'failed' | 'revision-conflict' | undefined
  let parentDenied = false
  let reviewStatus: 'pending' | 'approved' | 'rejected' = 'pending'
  let shareStatus: 'ready' | 'recorded' | 'revoked' = 'ready'
  let publish: (change: AccessHostChange) => Promise<void> = () => Promise.resolve()
  const rows: Record<AdministrationModule, Row[]> = {
    directory: [
      {
        ...row('member-fern', 'Fern', 'Active member'),
        detail: 'Local simulation · Organization member',
      },
      row('member-robin', 'Robin', 'Invitable member'),
    ],
    groups: [
      { ...row('organization-orchard', 'Orchard', 'Organization', 'root', 'native', false) },
      {
        ...row(
          'group-regional',
          'Regional operations',
          'Organization group',
          'direct',
          'native',
          false,
        ),
        detail: 'Parent: Orchard',
      },
      {
        ...row('group-field', 'Field operations', 'Organization group'),
        detail: 'Members: Fern · Parent: Orchard',
      },
    ],
    roles: [
      {
        ...row('reading', 'Read report', 'Direct allow'),
        capability: 'Report / Read / reading',
        directEffect: 'allow',
        effective: 'allow',
      },
      {
        ...row('inherited', 'View summary', 'Inherited allow', 'inherited', 'native', false),
        capability: 'Report / Read / inherited',
        directEffect: 'unset',
        effective: 'allow',
      },
      {
        ...row('unset', 'Read draft', 'Unresolved', 'unset'),
        capability: 'Report / Read / unset',
        directEffect: 'unset',
        effective: 'unresolved',
      },
      row(
        'external',
        'External ordered grant',
        'Unsupported model · readonly',
        'external',
        'external',
        false,
      ),
    ],
    relationships: [
      row('relationship', 'Orchard report', 'Collaboration'),
      row('inherited-relation', 'Field report', 'Owner through parent', 'inherited'),
    ],
    policies: [
      {
        ...row('policy', 'Orchard policy', 'Draft'),
        draftState: 'unsaved',
        activeRevision: 'fixture-active-seed',
        baselineSummary: 'Report access is limited to the owner.',
        draftSummary: 'No saved draft.',
      },
    ],
    requests: [
      {
        ...row('request', 'Report access', 'Pending review'),
        operatorLabel: 'Fern',
        resourceLabel: 'Orchard report',
        reason: 'Read report for the field operations team.',
      },
      row('self-request', 'Operator access', 'Pending review · Self approval prohibited'),
    ],
    audit: [
      {
        ...row('event', 'Simulated access request', 'Recorded', 'local simulation', 'event', false),
        occurredAt: '2026-11-17T18:00:00Z',
        operatorLabel: 'Fern',
        resourceLabel: 'Orchard report',
        operationLabel: 'Submit access request',
        correlation: 'fixture-request-seed',
        detail: 'Fern requested read access to the Orchard report.',
      },
    ],
    diagnostics: [
      {
        ...row('check', 'Native provider', 'Configured', 'local simulation', 'native', false),
        detail: 'An isolated, complete native model is available for role simulation.',
      },
    ],
  }
  function find(module: AdministrationModule, id: string) {
    return rows[module].find((candidate) => candidate.id === id)
  }
  function action(
    module: AdministrationModule,
    verb: string,
    permits: (row: Row, input: unknown) => boolean,
    update: (row: Row, input: unknown) => void,
  ): GuardedAction<unknown> {
    return {
      requirement: ({ id }) =>
        requirement({ kind: 'record', domain, resource: module, recordId: id, action: verb }),
      isTargetCurrent: (target) => find(module, target.id)?.revision === target.revision,
      businessAllows(target) {
        const existing = find(module, target.id)
        return (
          !!existing &&
          (module !== 'policies' ||
            existing.activeRevision === target.proposal?.values['expectedActiveRevision']) &&
          permits(existing, target.proposal?.values['value'])
        )
      },
      dispatch(commands) {
        return Promise.resolve(
          commands.map(({ requestId, target }) => {
            const receipt = { requestId, targetId: target.id }
            const existing = find(module, target.id)
            const value = target.proposal?.values['value']
            if (
              !existing ||
              existing.revision !== target.revision ||
              (module === 'policies' &&
                existing.activeRevision !== target.proposal?.values['expectedActiveRevision']) ||
              !permits(existing, value)
            )
              return { ...receipt, status: 'failed' as const }
            if (verb === 'save' && nextSaveFailure !== undefined) {
              const failure = nextSaveFailure
              nextSaveFailure = undefined
              if (failure === 'revision-conflict') {
                existing.revision = `fixture-${String(++version)}`
                return { ...receipt, status: 'failed' as const, failure }
              }
              return { ...receipt, status: 'failed' as const }
            }
            update(existing, value)
            existing.revision = `fixture-${String(++version)}`
            rows.audit.unshift({
              ...row(
                `event-${String(version)}`,
                existing.label,
                'Recorded',
                'local simulation',
                'event',
                false,
              ),
              occurredAt: new Date().toISOString(),
              detail: verb,
              operatorLabel: 'Fixture operator',
              resourceLabel: existing.label,
              operationLabel: verb,
              correlation: requestId,
            })
            return { ...receipt, status: 'completed' as const, value: existing.revision }
          }),
        )
      },
    }
  }
  function command(
    module: AdministrationModule,
    kind: AdministrationCommand['kind'],
    label: string,
    permits: (row: Row, input: unknown) => boolean,
    update: (row: Row, input: unknown) => void,
    input?: AdministrationCommand['input'],
  ): AdministrationCommand {
    return {
      kind,
      label,
      ...(input ? { input } : {}),
      grantable({ target, values }, context) {
        const existing = find(module, target.id)
        return (
          context.identity.kind === 'known' &&
          context.identity.principalId === operator.principalId &&
          !!existing &&
          permits(existing, values['value'])
        )
      },
      action: action(module, kind, permits, update),
    }
  }
  const commands: Partial<Record<AdministrationModule, readonly AdministrationCommand[]>> = {
    directory: [
      command(
        'directory',
        'invite',
        'Invite to organization',
        (entry) => entry.status === 'Invitable member',
        (entry) => {
          entry.status = 'Invitation recorded'
        },
      ),
      command(
        'directory',
        'remove-member',
        'Remove organization membership',
        (entry) => entry.status === 'Active member',
        (entry) => {
          entry.status = 'Nonmember'
        },
      ),
      command(
        'directory',
        'disable-account',
        'Disable account',
        (entry) => entry.status !== 'Account disabled',
        (entry) => {
          entry.status = 'Account disabled'
        },
      ),
    ],
    groups: [
      command(
        'groups',
        'move-group',
        'Move group',
        (entry, value) =>
          entry.id === 'group-field' &&
          value === 'group-regional' &&
          entry.detail === 'Members: Fern · Parent: Orchard',
        (entry) => {
          entry.detail = 'Members: Fern · Parent: Regional operations'
        },
        { label: 'New parent', choices: ['group-regional'], writeAction: 'write-field' },
      ),
    ],
    roles: [
      command(
        'roles',
        'set-direct-rule',
        'Set native rule',
        (entry, value) => entry.id === 'reading' && (value === 'allow' || value === 'deny'),
        (entry, value) => {
          if (value !== 'allow' && value !== 'deny') return
          entry.directEffect = value
          entry.effective = value
          entry.status = value === 'allow' ? 'Direct allow' : 'Direct deny'
        },
        { label: 'Effect', choices: ['allow', 'deny'], writeAction: 'write-field' },
      ),
      command(
        'roles',
        'remove-direct-rule',
        'Remove native rule',
        (entry) => entry.id === 'reading' && entry.directEffect !== 'unset',
        (entry) => {
          entry.directEffect = 'unset'
          entry.effective = 'unresolved'
          entry.status = 'Unset rule'
        },
      ),
    ],
    relationships: [
      command(
        'relationships',
        'remove-direct-relation',
        'Remove collaboration',
        (entry) => entry.source === 'direct' && entry.status === 'Collaboration',
        (entry) => {
          entry.status = 'Removed'
        },
      ),
    ],
    policies: [
      command(
        'policies',
        'save',
        'Save policy draft',
        (entry, value) =>
          (entry.draftState === 'unsaved' || entry.draftState === 'saved') &&
          (value === 'owner-only' || value === 'field-read'),
        (entry, value) => {
          entry.draftSummary =
            value === 'field-read'
              ? 'Allow the field group to read reports.'
              : 'Report access is limited to the owner.'
          entry.draftState = 'saved'
          entry.differences = [
            {
              id: 'report-read',
              label: 'Report / Read',
              before: 'Field group: unset',
              after: value === 'field-read' ? 'Field group: inherited allow' : 'Field group: unset',
            },
          ]
          entry.status = 'Saved draft'
        },
        {
          label: 'Report audience',
          choices: ['owner-only', 'field-read'],
          writeAction: 'write-field',
        },
      ),
      command(
        'policies',
        'publish',
        'Publish saved policy',
        (entry) => entry.draftState === 'saved',
        (entry) => {
          entry.draftState = 'published'
          entry.status = 'Published · Awaiting effectiveness'
        },
      ),
    ],
  }
  const fixture = new Map<AdministrationModule, AdministrationModuleHost>()
  for (const module of administrationModules) {
    const request = { kind: 'collection', domain, resource: module, action: 'list' } as const
    const endpoint = {
      id: `wp11-fixture-${module}`,
      method: 'GET',
      path: [module],
      policy: 'standard',
      authentication: 'provided',
      response: { mode: 'json', mimeTypes: ['application/json'], schema: administrationPageSchema },
    } as const
    const client = createApiClient({
      configuration: { status: 'configured', baseUrl: 'https://fixture.example.test/' },
      authorize: () => Promise.resolve({ headers: {}, credentials: 'omit' }),
      fetch: (url) => {
        const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? ''
        const offset = Number(url.searchParams.get('offset') ?? 0)
        const size = Number(url.searchParams.get('size') ?? 10)
        const matches = rows[module].filter((item) =>
          [item.label, item.status].some((field) => field.toLowerCase().includes(keyword)),
        )
        return Promise.resolve(
          Response.json({ rows: matches.slice(offset, offset + size), total: matches.length }),
        )
      },
    })
    fixture.set(module, {
      domain,
      resource: module,
      scope: global,
      recordRead: 'read',
      completeness: 'partial',
      read: {
        client,
        requirement: () => requirement(request),
        plan: ({ query }) => ({ status: 'ready', endpoint, input: { query } }),
      },
      query: ({ filters, page, pageSize }) => ({
        ...(typeof filters['keyword'] === 'string' ? { keyword: filters['keyword'] } : {}),
        offset: (page - 1) * pageSize,
        size: pageSize,
      }),
      projection: {
        selection: 'listed',
        paths: Object.fromEntries(
          [
            'label',
            'source',
            'detail',
            'status',
            'model',
            'editable',
            'scopeLabel',
            'capability',
            'directEffect',
            'effective',
            'activeRevision',
            'draftState',
            'baselineSummary',
            'draftSummary',
            'occurredAt',
            'operatorLabel',
            'representedLabel',
            'resourceLabel',
            'operationLabel',
            'correlation',
            'reason',
            'differences',
          ].map((field) => [
            field,
            {
              column: requirement({ kind: 'type', domain, resource: module, action: 'columns' }),
              read: 'read-field',
            },
          ]),
        ),
      },
      ...(mode === 'editable' && commands[module] ? { commands: commands[module] } : {}),
      ...(module === 'requests'
        ? {
            review(entry) {
              const id = entry['id']
              const saved = typeof id === 'string' ? find('requests', id) : undefined
              if (!saved || typeof entry['label'] !== 'string') return undefined
              return {
                targetId: saved.id,
                label: entry['label'],
                viewRequirement: requirement({
                  kind: 'record',
                  domain,
                  resource: module,
                  action: 'review-read',
                  recordId: saved.id,
                }),
                effectiveRequirement: requirement({
                  kind: 'record',
                  domain,
                  resource: module,
                  action: 'effective',
                  recordId: saved.id,
                }),
                scopes: [],
                read: () =>
                  Promise.resolve({
                    revision: saved.revision,
                    status: saved.id === 'self-request' ? 'pending' : reviewStatus,
                  }),
                ...(mode === 'editable'
                  ? {
                      commands: {
                        approve: action(
                          module,
                          'approve',
                          (candidate) => candidate.id === 'request' && reviewStatus === 'pending',
                          (candidate) => {
                            reviewStatus = 'approved'
                            candidate.status = 'Approved · Awaiting effectiveness'
                          },
                        ),
                        reject: action(
                          module,
                          'reject',
                          (candidate) => candidate.id === 'request' && reviewStatus === 'pending',
                          (candidate) => {
                            reviewStatus = 'rejected'
                            candidate.status = 'Rejected'
                          },
                        ),
                      },
                    }
                  : {}),
              }
            },
          }
        : {}),
      ...(module === 'relationships'
        ? {
            sharing(entry) {
              const saved =
                entry['id'] === 'relationship' ? find('relationships', 'relationship') : undefined
              if (!saved || typeof entry['label'] !== 'string') return undefined
              return {
                targetId: saved.id,
                label: entry['label'],
                modes: ['private', 'organization'],
                scopes: [{ id: 'orchard', label: 'Orchard' }],
                viewRequirement: requirement({
                  kind: 'record',
                  domain,
                  resource: module,
                  action: 'share-read',
                  recordId: saved.id,
                }),
                read: () => Promise.resolve({ revision: saved.revision, status: shareStatus }),
                ...(mode === 'editable'
                  ? {
                      commands: {
                        save: action(
                          module,
                          'share',
                          (candidate) =>
                            candidate.id === 'relationship' && candidate.status !== 'Removed',
                          () => {
                            shareStatus = 'recorded'
                          },
                        ),
                        revoke: action(
                          module,
                          'revoke-share',
                          (candidate) => candidate.id === 'relationship',
                          () => {
                            shareStatus = 'revoked'
                          },
                        ),
                      },
                    }
                  : {}),
              }
            },
          }
        : {}),
      ...(module !== 'roles' && module !== 'policies'
        ? {}
        : {
            simulation: {
              requirement: requirement({
                kind: 'type',
                domain,
                resource: module,
                action: 'simulate',
              }),
              subjects: [{ id: 'fern', label: 'Fern' }],
              request: (target) =>
                typeof target['id'] === 'string' &&
                target['model'] === 'native' &&
                (module !== 'policies' ||
                  target['draftState'] === 'saved' ||
                  target['draftState'] === 'published')
                  ? {
                      kind: 'record',
                      domain: 'simulation',
                      resource: 'report',
                      action: 'read',
                      recordId: target['id'],
                    }
                  : undefined,
              prepare({ subjectId, request }) {
                const identity = { kind: 'known', principalId: subjectId } as const
                const rule = rows[module].find(
                  ({ id }) => request.kind === 'record' && request.recordId === id,
                )
                if (rule?.model !== 'native') return Promise.resolve(undefined)
                const revision = rule.revision
                const grants =
                  (module === 'roles' &&
                    ((rule.source === 'direct' && rule.directEffect !== 'unset') ||
                      rule.source === 'inherited')) ||
                  (module === 'policies' &&
                    rule.draftSummary === 'Allow the field group to read reports.')
                    ? [
                        {
                          request,
                          scope: { kind: 'exact', path: scope },
                          effect:
                            module === 'policies' ||
                            rule.source === 'inherited' ||
                            rule.directEffect === 'allow'
                              ? 'allow'
                              : 'deny',
                        },
                      ]
                    : []
                const provider = createNativeGrantProvider(
                  request.domain,
                  [{ kind: request.kind, resource: request.resource, action: request.action }],
                  {
                    complete: true,
                    revision,
                    roles:
                      grants.length && rule.source === 'inherited'
                        ? [{ id: 'readers', inherits: [], grants }]
                        : [],
                    subjects: [
                      {
                        identity,
                        groups: [],
                        roles: rule.source === 'inherited' ? ['readers'] : [],
                        grants: rule.source === 'inherited' ? [] : grants,
                      },
                    ],
                  },
                )
                return Promise.resolve({ context: { identity, scope, revision }, provider })
              },
            },
          }),
    })
  }
  const administration: AdministrationHost = Object.fromEntries(fixture)
  const accessHost: AccessHost = {
    ...(mode === 'missing' ? {} : { administration }),
    resolveContext: () => ({ identity: operator, scope }),
    decisions: [
      {
        domain,
        targets: ['type', 'collection', 'record', 'field'],
        evaluate: ({ request }) => ({
          status:
            !revoked &&
            !(parentDenied && request.resource === 'workbench') &&
            request.action !== 'effective'
              ? 'allow'
              : 'deny',
        }),
      },
    ],
    subscribe(notify) {
      publish = notify
      return () => {
        publish = () => Promise.resolve()
      }
    },
  }
  function revoke(): void {
    revoked = true
    void publish({ kind: 'domain', domain })
  }
  function denyParent(): void {
    parentDenied = true
    void publish({ kind: 'domain', domain })
  }
  function failNextSave(): void {
    nextSaveFailure = 'failed'
  }
  function conflictNextSave(): void {
    nextSaveFailure = 'revision-conflict'
  }
  function confirmEffectiveness(): boolean {
    const policy = rows.policies[0]
    if (policy?.draftState !== 'published') return false
    policy.draftState = 'effective'
    policy.status = 'Effective'
    policy.revision = `fixture-${String(++version)}`
    policy.activeRevision = policy.revision
    if (policy.draftSummary !== undefined) policy.baselineSummary = policy.draftSummary
    void publish({ kind: 'record', domain, resource: 'policies', recordId: policy.id })
    return true
  }
  return { accessHost, revoke, denyParent, failNextSave, conflictNextSave, confirmEffectiveness }
}
