import { shallowReactive } from 'vue'
import type {
  AccessContextSnapshot,
  AccessHost,
  AccessHostChange,
  AccessProvider,
  AccessRequest,
  BoundAccessRequest,
  ProviderInvalidation,
} from '../access/access-contract'
import { confirmedFeature, type BusinessConstraint } from '../access/business-availability'
import type { LoadConditionalFacts } from '../access/conditional-facts'
import type { ActionTarget, GuardedAction } from '../access/guarded-action'
import { createLocalAvailabilitySource } from '../access/local-availability-source'
import { createNativeGrantProvider } from '../access/native-grants'
import { createRelationshipAccess } from '../access/relationship-access'
import { createWorkflowAvailability } from '../access/workflow-availability'
import {
  initialShowcaseState,
  members,
  organizations,
  projects,
  reportId,
  type FixtureIdentity,
  type Organization,
  type ShowcaseState,
  type Task,
} from './showcase-data'
import { createShowcasePredicates, type ConditionalAuthority } from './showcase-conditional'
import type { ShowcasePreset } from './showcase-presets'
import {
  fixtureAvailabilitySource,
  fixtureRecordsDomain,
  fixtureRelationshipsDomain,
  fixtureWorkflowSource,
  globalShowcaseScope,
  reportCapability,
  showcaseRequirement,
  showcaseRoleCheck,
  taskCapability,
} from './showcase-requirements'
import {
  showcaseNavigationDomain,
  showcaseProjectRequirement,
  type AccessShowcaseProfile,
} from './showcase-routes'

function organizationScope(organization: Organization) {
  return [{ kind: 'organization', id: organization }] as const
}

function capability({ kind, resource, action }: AccessRequest) {
  return { kind, resource, action }
}

const listTasks = taskCapability('collection', 'list')
const navigationCapabilities = [showcaseProjectRequirement, listTasks].map(capability)
const relationshipReport = { resource: 'report', id: reportId }
const relationshipProject = { resource: 'project', id: projects[0].id }

export function createShowcaseWorld(
  profile: AccessShowcaseProfile,
  authority: ConditionalAuthority = createShowcasePredicates,
  initialTime = Date.now(),
) {
  const state = shallowReactive(initialShowcaseState(1, initialTime))
  let serial = 0
  let generation = 0
  let replace: (() => void) | undefined
  let subscriber: ((change: AccessHostChange) => Promise<void>) | undefined
  const issueRevision = () => `showcase-${String(++serial)}`
  const wait = (milliseconds: number) =>
    milliseconds === 0
      ? Promise.resolve()
      : new Promise<void>((done) => setTimeout(done, milliseconds))

  function currentContext(): AccessContextSnapshot {
    return {
      identity:
        state.identity === 'anonymous'
          ? { kind: 'anonymous' }
          : { kind: 'known', principalId: state.identity },
      scope: organizationScope(state.organization),
      revision: issueRevision(),
    }
  }

  function membersOf(organization: Organization) {
    return organization === organizations[0].id ? members : members.slice(0, 1)
  }

  function grant(request: AccessRequest, organization?: Organization) {
    return {
      effect: 'allow',
      request,
      scope:
        organization === undefined
          ? globalShowcaseScope
          : { kind: 'exact', path: organizationScope(organization) },
    }
  }

  function navigationPolicy() {
    return createNativeGrantProvider(showcaseNavigationDomain, navigationCapabilities, {
      complete: true,
      revision: state.policyRevision,
      roles: [
        {
          id: 'project-manager',
          inherits: [],
          grants: state.projectAccess
            ? [grant(showcaseProjectRequirement, organizations[0].id)]
            : [],
        },
        {
          id: 'report-reader',
          inherits: [],
          grants: state.projectAccess
            ? [grant(showcaseProjectRequirement, organizations[1].id)]
            : [],
        },
      ],
      subjects: members.map(({ id }) => ({
        identity: { kind: 'known', principalId: id },
        groups: [],
        roles: id === members[0].id ? ['project-manager', 'report-reader'] : ['project-manager'],
        grants: state.fault === 'empty-grants' ? [] : [grant(listTasks, organizations[0].id)],
      })),
    })
  }

  function roleGraphPolicy() {
    return createNativeGrantProvider(showcaseRoleCheck.domain, [capability(showcaseRoleCheck)], {
      complete: true,
      revision: state.policyRevision,
      roles: [
        { id: 'reviewer', inherits: ['reader'], grants: [] },
        {
          id: 'reader',
          inherits: state.relationships === 'cycle' ? ['reviewer'] : [],
          grants: [grant(showcaseRoleCheck)],
        },
      ],
      subjects: members.map(({ id }) => ({
        identity: { kind: 'known', principalId: id },
        groups: [],
        roles: ['reviewer'],
        grants: [],
      })),
    })
  }

  function projectFor(context: AccessContextSnapshot) {
    return projects.find(({ organization }) => organization === context.scope[0]?.id)
  }

  function taskFor(id: string, context: AccessContextSnapshot): Task | undefined {
    const project = projectFor(context)
    return state.tasks.find((task) => task.id === id && task.project === project?.id)
  }

  function factsFor(binding: BoundAccessRequest): Readonly<Record<string, boolean>> {
    const { request, context } = binding
    const id = context.identity.kind === 'known' ? context.identity.principalId : undefined
    const project = projectFor(context)
    const task = 'recordId' in request ? taskFor(request.recordId, context) : undefined
    const field = request.kind === 'field' ? request.fieldPath : undefined
    return {
      inScope:
        request.resource === 'report'
          ? 'recordId' in request && request.recordId === reportId && project !== undefined
          : task !== undefined,
      member:
        project !== undefined && membersOf(project.organization).some((member) => member.id === id),
      manager: project?.organization === organizations[0].id && id === members[0].id,
      assigned:
        project?.organization === organizations[0].id && id !== undefined && task?.assignee === id,
      readable:
        field !== 'budget' &&
        field !== 'secret' &&
        (field !== 'title' || (task !== undefined && !state.titleReadRevoked.has(task.id))),
      writable:
        (field === 'secret' || field === 'title') &&
        (field !== 'title' || (task !== undefined && !state.titleWriteRevoked.has(task.id))),
      reviewer: id === members[1].id,
      separateRequester: id !== state.requester,
      approvalCurrent: state.requestState === 'pending' && state.time < state.approvalExpiresAt,
    }
  }

  const loadFacts: LoadConditionalFacts = (binding, input, required) => {
    if (
      state.fault === 'incomplete' ||
      (binding.request.action === 'complete' &&
        'recordId' in binding.request &&
        taskFor(binding.request.recordId, binding.context)?.factsComplete === false)
    )
      return
    const facts = factsFor(binding)
    return {
      binding,
      input,
      complete: [...required],
      revision: state.policyRevision,
      facts: Object.fromEntries(
        required.map((path) => [path, { status: 'known', value: facts[path] ?? false }]),
      ),
    }
  }
  const conditional = authority(loadFacts)
  const records: AccessProvider = {
    ...conditional,
    async evaluate(binding) {
      if (state.fault === 'provider-failure')
        throw new Error('Synthetic decision operation failed.')
      const result = conditional.evaluate(binding)
      await wait(state.latency)
      return result
    },
  }

  function sharingRecipients() {
    switch (state.share.mode) {
      case 'private':
        return [members[0].id]
      case 'selected-members':
        return state.share.recipients
      case 'organization':
        return membersOf(organizations[0].id).map(({ id }) => id)
      case 'public':
        return members.map(({ id }) => id)
    }
  }

  function graph() {
    return {
      complete: state.relationships !== 'incomplete',
      scope: organizationScope(organizations[0].id),
      revision: issueRevision(),
      principals: members.map(({ id }) => id),
      groups:
        state.relationships === 'cycle'
          ? [
              {
                id: 'showcase-cycle',
                members: [{ principal: { kind: 'group', id: 'showcase-cycle' } }],
              },
            ]
          : [],
      objects: [relationshipProject, { ...relationshipReport, parent: relationshipProject }],
      edges:
        state.share.status === 'effective'
          ? sharingRecipients().map((id) => ({
              object: relationshipProject,
              principal: { kind: 'principal', id },
              relation: 'collaborator',
              ...(state.share.expiresAt === undefined ? {} : { expiresAt: state.share.expiresAt }),
            }))
          : [],
    }
  }

  const relations = createRelationshipAccess({
    domain: fixtureRelationshipsDomain,
    clock: () => state.time,
    mappings: [
      { resource: 'project', action: 'read', allow: ['collaborator'], inherit: [] },
      { resource: 'report', action: 'read', allow: ['collaborator'], inherit: ['project'] },
    ],
    snapshot: graph(),
  })
  const relationshipProvider: AccessProvider = {
    ...relations.provider,
    evaluate(binding) {
      // The bounded relationship evaluator requires a named principal. The host's
      // separate public-read audience is still confined to the exact share target.
      if (
        binding.context.identity.kind === 'anonymous' &&
        binding.request.kind === 'record' &&
        binding.request.resource === 'report' &&
        binding.request.recordId === reportId &&
        binding.request.action === 'read' &&
        binding.context.scope[0]?.id === organizations[0].id &&
        state.relationships === 'complete' &&
        state.share.mode === 'public' &&
        state.share.status === 'effective'
      ) {
        return { status: state.time < (state.share.expiresAt ?? Infinity) ? 'allow' : 'deny' }
      }
      return relations.provider.evaluate(binding)
    },
  }

  const available = createLocalAvailabilitySource(fixtureAvailabilitySource, ({ constraint }) => {
    const revision = state.policyRevision
    switch (constraint.kind) {
      case 'feature':
        return confirmedFeature({
          readiness: 'ready',
          reason: 'resolved',
          value: state.block !== 'feature',
          revision,
        })
      case 'entitlement':
        return {
          status: 'confirmed',
          revision,
          detail: { kind: 'entitlement', granted: state.block !== 'entitlement' },
        }
      case 'quota':
        return {
          status: 'confirmed',
          revision,
          detail: { kind: 'quota', remaining: state.block === 'quota' ? 0 : state.quota },
        }
      default:
        return { status: 'configuration-error' }
    }
  })
  const workflow = createWorkflowAvailability({
    id: fixtureWorkflowSource,
    transitions: {
      release: { requires: ['approved'], test: ({ facts }) => facts['approved'] === true },
    },
    loadFacts: (binding, input) => ({
      binding,
      input,
      complete: ['approved'],
      revision: state.policyRevision,
      facts: { approved: { status: 'known', value: state.block !== 'workflow' } },
    }),
  })

  function exportConstraints(): readonly BusinessConstraint[] {
    const scope = organizationScope(state.organization)
    const owner = scope[0]
    const base = { scope, source: fixtureAvailabilitySource }
    return [
      { ...base, id: 'showcase-export-feature', kind: 'feature', environment: 'showcase' },
      {
        ...base,
        id: 'showcase-export-entitlement',
        kind: 'entitlement',
        owner,
        capability: 'export',
      },
      {
        ...base,
        id: 'showcase-export-quota',
        kind: 'quota',
        owner,
        unit: 'exports',
        period: 'session',
        requested: 1,
      },
      {
        scope,
        id: 'showcase-export-workflow',
        source: fixtureWorkflowSource,
        kind: 'workflow',
        transition: 'release',
      },
    ]
  }

  const host: AccessHost = {
    decisions: [
      {
        domain: showcaseNavigationDomain,
        targets: ['type', 'collection'],
        evaluate: (binding) => navigationPolicy().evaluate(binding),
      },
      records,
      relationshipProvider,
      {
        domain: showcaseRoleCheck.domain,
        targets: ['type'],
        evaluate: (binding) => roleGraphPolicy().evaluate(binding),
      },
    ],
    availability: [available.source, workflow],
    resolveContext(change) {
      const candidate = change.kind === 'scope' ? change.candidate : undefined
      if (
        candidate !== undefined &&
        (candidate.length !== 1 ||
          candidate[0]?.kind !== 'organization' ||
          !organizations.some(({ id }) => id === candidate[0]?.id))
      )
        throw new TypeError('Unknown showcase scope.')
      const pending = replace
      replace = undefined
      pending?.()
      return currentContext()
    },
    subscribe(notify) {
      if (subscriber) throw new Error('The showcase host already has an owner.')
      subscriber = notify
      return () => {
        if (subscriber === notify) subscriber = undefined
      }
    },
  }

  function publish(change: AccessHostChange) {
    return subscriber?.(change) ?? Promise.resolve()
  }

  async function transition(change: AccessHostChange, commit: () => void) {
    replace = () => {
      generation++
      commit()
      void relations.replaceSnapshot(graph)
    }
    if (subscriber) await publish(change)
    else {
      const pending = replace
      replace = undefined
      pending()
    }
  }

  function invalidateRecord(id: string, action?: string): Promise<void> {
    return publish({
      kind: 'record',
      domain: fixtureRecordsDomain,
      resource: 'task',
      recordId: id,
      ...(action === undefined ? {} : { action }),
    })
  }

  function notifyRecords(
    change: ProviderInvalidation = { kind: 'domain', domain: fixtureRecordsDomain },
  ) {
    return publish(change)
  }

  function guardedCommand<Value>(
    requirement: GuardedAction<Value>['requirement'],
    commit: (target: ActionTarget, context: AccessContextSnapshot) => Value | undefined,
    rule: Pick<GuardedAction<Value>, 'isTargetCurrent' | 'businessAllows'>,
  ): GuardedAction<Value> {
    return {
      ...rule,
      requirement,
      async dispatch(commands, signal) {
        const origin = generation
        await wait(state.latency)
        return commands.map((command) => {
          const { requestId, target, context } = command
          const ids = { requestId, targetId: target.id }
          if (signal.aborted || origin !== generation || !command.isCurrent())
            return { ...ids, status: 'not-dispatched' }
          const value = commit(target, context)
          return value === undefined
            ? { ...ids, status: 'failed', failure: 'revision-conflict' }
            : { ...ids, status: 'completed', value }
        })
      },
    }
  }

  return {
    profile,
    state,
    host,
    wait,
    taskFor,
    projectFor,
    issueRevision,
    publish,
    invalidateRecord,
    currentGeneration: () => generation,
    select(preset: ShowcasePreset) {
      return transition({ kind: 'identity' }, () =>
        Object.assign(state, initialShowcaseState(preset, initialTime)),
      )
    },
    selectIdentity(identity: FixtureIdentity) {
      return transition({ kind: 'identity' }, () => {
        state.identity = identity
      })
    },
    selectOrganization(organization: Organization) {
      return transition({ kind: 'scope', candidate: organizationScope(organization) }, () => {
        state.organization = organization
      })
    },
    setProjectAccess(granted: boolean) {
      state.projectAccess = granted
      return publish({ kind: 'domain', domain: showcaseNavigationDomain, action: 'view' })
    },
    async setTitleAccess(id: string, kind: 'read' | 'write', granted: boolean) {
      const key = kind === 'read' ? 'titleReadRevoked' : 'titleWriteRevoked'
      const revoked = new Set(state[key])
      if (granted) revoked.delete(id)
      else revoked.add(id)
      state[key] = revoked
      await notifyRecords({
        kind: 'field',
        domain: fixtureRecordsDomain,
        resource: 'task',
        recordId: id,
        fieldPath: 'title',
        action: `${kind}-field`,
      })
    },
    async setFault(fault: ShowcaseState['fault']) {
      state.fault = fault
      await publish({ kind: 'domain', domain: showcaseNavigationDomain, action: 'list' })
      await notifyRecords()
    },
    setRelationshipMode(mode: ShowcaseState['relationships']) {
      state.relationships = mode
      void relations.replaceSnapshot(graph)
      return publish({ kind: 'domain', domain: showcaseRoleCheck.domain })
    },
    setShare(share: ShowcaseState['share']) {
      state.share = share
      void relations.replaceSnapshot(graph)
    },
    advanceTime() {
      state.time += 11 * 60_000
      void relations.replaceSnapshot(graph)
      return notifyRecords({
        kind: 'record',
        domain: fixtureRecordsDomain,
        resource: 'report',
        recordId: reportId,
        action: 'approve',
      })
    },
    guardedCommand,
    exportAction(): GuardedAction<unknown> {
      return {
        ...guardedCommand<unknown>(
          () => showcaseRequirement(reportCapability('export', reportId)),
          () => {
            if (state.block !== 'none' || state.quota < 1) return
            state.quota--
            return 'exported' as const
          },
          { isTargetCurrent: ({ id }) => id === reportId, businessAllows: () => true },
        ),
        availability: { operation: 'export', constraints: exportConstraints },
      }
    },
  }
}

export type ShowcaseWorld = ReturnType<typeof createShowcaseWorld>
