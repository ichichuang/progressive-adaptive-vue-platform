import { shallowReactive } from 'vue'
import type {
  AccessContextSnapshot,
  AccessHost,
  AccessHostChange,
  AccessRequest,
} from '../../apps/web/src/app/access/access-contract'
import type { AccessRequestInteractionHost } from '../../apps/web/src/app/access/access-request-interaction'
import {
  confirmedFeature,
  type BusinessConstraint,
} from '../../apps/web/src/app/access/business-availability'
import type { ActionTarget, GuardedAction } from '../../apps/web/src/app/access/guarded-action'
import { createLocalAvailabilitySource } from '../../apps/web/src/app/access/local-availability-source'
import type { AccessRequirement } from '../../apps/web/src/app/access/native-requirement'
import { createPredicateAccess } from '../../apps/web/src/app/access/predicate-access'
import { createRelationshipAccess } from '../../apps/web/src/app/access/relationship-access'
import type { SharingHost } from '../../apps/web/src/app/access/resource-sharing'
import { createWorkflowAvailability } from '../../apps/web/src/app/access/workflow-availability'

export function createBusinessAccessScenario(now = Date.now) {
  const domain = 'wp10-fixture-operations'
  const shareDomain = 'wp10-fixture-relations'
  const availabilitySource = 'wp10-fixture-availability'
  const workflowSource = 'wp10-fixture-workflow'
  const organization = 'wp10-fixture-orchard'
  const scopePath = [
    { kind: 'organization', id: organization },
    { kind: 'project', id: 'jade' },
  ]
  const scope = { kind: 'exact' as const, path: scopePath }
  const task = 'report-jade'
  const actors = ['casey', 'marin', 'alex'] as const
  const load = () => ({
    feature: true,
    featureFallback: false,
    entitlement: true,
    quota: 2,
    exportReady: true,
    assumeDenied: false,
    taskState: 'draft',
    requester: 'casey',
    firstReviewer: '',
    revision: 1,
    exports: 0,
    evaluations: 0,
    sharing: 'ready',
    shareExpiry: null as number | null,
    accessRequest: 'requestable',
    accessRequester: '',
  })
  const state = shallowReactive(load())
  let notify: ((change: AccessHostChange) => Promise<void>) | undefined
  let active: AccessContextSnapshot = {
    identity: { kind: 'known', principalId: 'casey' },
    scope: scopePath,
    revision: 'identity-1',
  }
  let revision = 1
  let failContext = false
  function setPrincipal(principalId: string, path = scopePath): void {
    active = {
      identity: { kind: 'known', principalId },
      scope: path,
      revision: `identity-${String(++revision)}`,
    }
  }

  const operations = createPredicateAccess({
    domain,
    scope,
    rules: [
      'export',
      'manage-sharing',
      'status',
      'ask',
      'review',
      'delegate-enter',
      'delegate-exit',
      'submit',
      'approve',
      'reject',
      'withdraw',
      'read',
      'write',
      'read-field',
      'write-field',
      'list',
    ].map((action) => ({
      kind: action.endsWith('-field')
        ? ('field' as const)
        : action === 'list'
          ? ('collection' as const)
          : ('record' as const),
      resource: 'report',
      action,
      requires: [],
      test: ({ binding }) => {
        const { identity, delegation } = binding.context
        if (identity.kind !== 'known') return false
        const principal = identity.principalId
        if (delegation && action !== 'delegate-exit' && !delegation.restrictions.includes(action))
          return false
        if (action === 'export') return !state.assumeDenied
        if (action === 'review')
          return (
            (principal === 'marin' || principal === 'alex') &&
            [principal, delegation?.actorId ?? principal].every(
              (id) => id !== state.accessRequester,
            )
          )
        if (action === 'delegate-exit') return delegation !== undefined
        if (action === 'delegate-enter') return delegation === undefined
        return true
      },
    })),
  })
  function request(action: string, recordId = task): AccessRequest {
    if (action === 'list') return { domain, resource: 'report', kind: 'collection', action }
    return { domain, resource: 'report', kind: 'record', action, recordId }
  }
  function requirement(action: string, recordId = task): AccessRequirement {
    return { scope, operator: 'all', requests: [request(action, recordId)] }
  }
  const shareRead = {
    scope,
    operator: 'all',
    requests: [
      { domain: shareDomain, resource: 'report', kind: 'record', recordId: task, action: 'read' },
    ],
  } as const satisfies AccessRequirement
  function graph() {
    const object = { resource: 'report', id: task }
    return {
      complete: true,
      scope: scopePath,
      revision: `relation-${String(state.revision)}`,
      principals: actors,
      groups: [],
      objects: [object],
      edges:
        state.sharing === 'effective' || state.accessRequest === 'effective'
          ? [
              {
                object,
                principal: { kind: 'principal', id: 'casey' },
                relation: 'collaborator',
                ...(state.shareExpiry === null || state.accessRequest === 'effective'
                  ? {}
                  : { expiresAt: state.shareExpiry }),
              },
            ]
          : [],
    }
  }
  const relations = createRelationshipAccess({
    domain: shareDomain,
    snapshot: graph(),
    clock: now,
    mappings: [{ resource: 'report', action: 'read', allow: ['collaborator'], inherit: [] }],
  })
  const local = createLocalAvailabilitySource(availabilitySource, ({ constraint }) => {
    state.evaluations++
    const revision = String(state.revision)
    switch (constraint.kind) {
      case 'feature':
        return confirmedFeature({
          readiness: state.featureFallback ? 'failed' : 'ready',
          reason: state.featureFallback ? 'default' : 'resolved',
          value: state.feature,
          revision,
        })
      case 'entitlement':
        return {
          status: 'confirmed',
          revision,
          detail: { kind: 'entitlement', granted: state.entitlement },
        }
      case 'quota':
        return { status: 'confirmed', revision, detail: { kind: 'quota', remaining: state.quota } }
      case 'assurance':
        return {
          status: 'confirmed',
          revision: 'assurance-config',
          detail: { kind: 'assurance', challenge: true },
        }
      case 'workflow':
        return { status: 'configuration-error' }
    }
  })
  const workflowChanges = createLocalAvailabilitySource(workflowSource, () => ({
    status: 'unknown',
  }))
  const facts = ['state', 'requester', 'firstReviewer', 'exportReady'] as const
  const workflow = createWorkflowAvailability({
    id: workflowSource,
    subscribe: (notify) => workflowChanges.source.subscribe?.(notify) ?? (() => undefined),
    transitions: {
      export: { requires: facts, test: ({ facts }) => facts['exportReady'] === true },
      submit: { requires: facts, test: ({ facts }) => facts['state'] === 'draft' },
      approve: {
        requires: facts,
        test({ binding, facts }) {
          const { identity, delegation } = binding.intent.context
          if (identity.kind !== 'known') return false
          const actor = delegation?.actorId ?? identity.principalId
          return (
            (facts['state'] === 'submitted' || facts['state'] === 'first-review') &&
            [actor, identity.principalId].every(
              (id) => id !== facts['requester'] && id !== facts['firstReviewer'],
            )
          )
        },
      },
      reject: {
        requires: facts,
        test: ({ facts }) => facts['state'] === 'submitted' || facts['state'] === 'first-review',
      },
      withdraw: {
        requires: facts,
        test({ facts, binding }) {
          const { identity, delegation } = binding.intent.context
          return (
            identity.kind === 'known' &&
            identity.principalId === facts['requester'] &&
            (delegation?.actorId ?? identity.principalId) === facts['requester'] &&
            facts['state'] === 'submitted'
          )
        },
      },
    },
    loadFacts(binding, input) {
      return {
        binding,
        input,
        complete: [...facts],
        revision: String(state.revision),
        facts: {
          state: { status: 'known', value: state.taskState },
          requester: { status: 'known', value: state.requester },
          firstReviewer: { status: 'known', value: state.firstReviewer },
          exportReady: { status: 'known', value: state.exportReady },
        },
      }
    },
  })
  const feature: BusinessConstraint = {
    id: 'export-feature',
    source: availabilitySource,
    kind: 'feature',
    scope: scopePath,
    environment: 'local',
  }
  const owner = { kind: 'organization', id: organization }
  const entitlement: BusinessConstraint = {
    id: 'export-entitlement',
    source: availabilitySource,
    kind: 'entitlement',
    scope: scopePath,
    owner,
    capability: 'report-export',
  }
  const quota: BusinessConstraint = {
    id: 'export-quota',
    source: availabilitySource,
    kind: 'quota',
    scope: scopePath,
    owner,
    unit: 'exports',
    period: 'fixture period',
    requested: 1,
  }
  const workflowCondition = (transition: string): BusinessConstraint => ({
    id: `workflow-${transition}`,
    source: workflowSource,
    kind: 'workflow',
    scope: scopePath,
    transition,
  })
  const assurance: BusinessConstraint = {
    id: 'export-assurance',
    source: availabilitySource,
    kind: 'assurance',
    scope: scopePath,
  }
  const target = {
    id: task,
    mode: 'report',
    revision: 'report-data-1',
    idempotencyKey: 'fixture-report-export',
  }
  function makeAction(
    action: string,
    change: (
      target: ActionTarget,
      context: AccessContextSnapshot,
    ) => boolean | Promise<boolean> = () => true,
  ): GuardedAction<unknown> {
    return {
      requirement: ({ id }) => requirement(action, id),
      isTargetCurrent: () => true,
      businessAllows: () => true,
      async dispatch(commands) {
        return await Promise.all(
          commands.map(async ({ requestId, target, context }) => {
            const completed = await change(target, context)
            return {
              requestId,
              targetId: target.id,
              ...(completed
                ? { status: 'completed' as const, value: 'acknowledged' }
                : { status: 'failed' as const }),
            }
          }),
        )
      },
    }
  }
  let exportBarrier: (() => Promise<void>) | undefined
  function updated(id: string): void {
    state.revision++
    local.invalidate({ constraintId: id, scope: scopePath, targetId: task })
    workflowChanges.invalidate({ constraintId: id, scope: scopePath, targetId: task })
  }
  function exportAction(
    verify?: NonNullable<GuardedAction<unknown>['availability']>['verify'],
  ): GuardedAction<unknown> {
    return {
      ...makeAction('export', async () => {
        await exportBarrier?.()
        if (state.quota === 0) return false
        state.quota--
        state.exports++
        updated(quota.id)
        return true
      }),
      availability: {
        operation: 'export-report',
        constraints: () => [
          feature,
          entitlement,
          quota,
          workflowCondition('export'),
          ...(verify ? [assurance] : []),
        ],
        ...(verify ? { verify } : {}),
      },
    }
  }
  function transition(
    action: 'submit' | 'approve' | 'reject' | 'withdraw',
  ): GuardedAction<unknown> {
    return {
      ...makeAction(action, (target, context) => {
        if (target.revision !== String(state.revision) || context.identity.kind !== 'known')
          return false
        const actor = context.delegation?.actorId ?? context.identity.principalId
        if (action === 'submit') {
          state.taskState = 'submitted'
          state.requester = actor
          state.firstReviewer = ''
        } else if (action === 'approve') {
          if (state.taskState === 'submitted') {
            state.taskState = 'first-review'
            state.firstReviewer = actor
          } else state.taskState = 'approved'
        } else state.taskState = action === 'withdraw' ? 'draft' : 'rejected'
        for (const name of ['submit', 'approve', 'reject', 'withdraw'])
          updated(workflowCondition(name).id)
        return true
      }),
      availability: { operation: action, constraints: () => [workflowCondition(action)] },
    }
  }
  const enter = makeAction('delegate-enter', (_, context) => {
    if (context.identity.kind !== 'known') return false
    active = {
      identity: { kind: 'known', principalId: 'marin' },
      scope: context.scope,
      revision: `identity-${String(++revision)}`,
      delegation: {
        actorId: context.identity.principalId,
        reference: 'wp10-fixture-delegation',
        restrictions: ['status', 'read', 'approve'],
        expiresAt: now() + 120_000,
      },
    }
    return true
  })
  const exit = makeAction('delegate-exit', (_, context) => {
    if (!context.delegation) return false
    setPrincipal(context.delegation.actorId)
    return true
  })
  const host: AccessHost = {
    resolveContext() {
      if (failContext) throw new Error('Fixture host context failure.')
      return active
    },
    decisions: [operations.provider, relations.provider],
    availability: [local.source, workflow],
    delegation: { exit: () => ({ target, action: exit }) },
    subscribe(listener) {
      notify = listener
      return () => {
        notify = undefined
      }
    },
  }
  async function changeSharing(status: string): Promise<void> {
    state.sharing = status
    state.revision++
    await relations.replaceSnapshot(graph)
    operations.invalidateFacts({
      kind: 'record',
      domain,
      resource: 'report',
      recordId: task,
      action: 'status',
    })
  }
  async function changeAccessRequest(status: string): Promise<void> {
    state.accessRequest = status
    state.revision++
    await relations.replaceSnapshot(graph)
    operations.invalidateFacts({
      kind: 'record',
      domain,
      resource: 'report',
      recordId: task,
      action: 'status',
    })
  }
  function isRevisionCurrent(target: ActionTarget): boolean {
    return target.revision === String(state.revision)
  }
  const sharing: SharingHost = {
    targetId: task,
    label: 'Jade report',
    modes: ['private', 'organization', 'selected-members', 'public'],
    scopes: [{ id: 'summary', label: 'Report summary' }],
    members: actors.map((id) => ({ id, label: id })),
    viewRequirement: requirement('status'),
    maxLifetimeMs: 86_400_000,
    read: () =>
      Promise.resolve({
        status: state.sharing,
        revision: String(state.revision),
        ...(state.shareExpiry === null ? {} : { expiresAt: state.shareExpiry }),
        ...(state.sharing === 'effective'
          ? { destination: { kind: 'simulation', reference: 'fixture:jade-report-share' } }
          : {}),
      }),
    commands: {
      save: {
        ...makeAction('manage-sharing', async (target) => {
          if (!isRevisionCurrent(target)) return false
          state.shareExpiry =
            typeof target.proposal?.values['expiresAt'] === 'number'
              ? target.proposal.values['expiresAt']
              : null
          await changeSharing(
            target.proposal?.values['mode'] === 'private' ? 'revoked' : 'effective',
          )
          return true
        }),
        isTargetCurrent: isRevisionCurrent,
      },
      revoke: {
        ...makeAction('manage-sharing', async (target) => {
          if (!isRevisionCurrent(target)) return false
          state.shareExpiry = null
          await changeSharing('revoked')
          return true
        }),
        isTargetCurrent: isRevisionCurrent,
      },
    },
  }
  const accessRequest: AccessRequestInteractionHost = {
    targetId: task,
    label: 'Jade report summary',
    viewRequirement: requirement('status'),
    scopes: sharing.scopes,
    effectiveRequirement: shareRead,
    read: () => Promise.resolve({ status: state.accessRequest, revision: String(state.revision) }),
    commands: Object.fromEntries(
      (
        [
          ['request', 'ask', 'pending'],
          ['cancel', 'ask', 'cancelled'],
          ['approve', 'review', 'approved'],
          ['reject', 'review', 'rejected'],
          ['revoke', 'review', 'revoked'],
        ] as const
      ).map(
        ([command, action, status]) =>
          [
            command,
            {
              ...makeAction(action, async (target, context) => {
                if (!isRevisionCurrent(target)) return false
                if (context.identity.kind !== 'known') return false
                const actor = context.delegation?.actorId ?? context.identity.principalId
                if (command === 'request') state.accessRequester = actor
                if (
                  command === 'approve' &&
                  (state.accessRequest !== 'pending' ||
                    actor === state.accessRequester ||
                    context.identity.principalId === state.accessRequester)
                )
                  return false
                await changeAccessRequest(status)
                return true
              }),
              isTargetCurrent: isRevisionCurrent,
            },
          ] as const,
      ),
    ),
  }
  return {
    host,
    state,
    target,
    scope,
    scopePath,
    domain,
    requirement,
    shareRead,
    makeAction,
    exportAction,
    transition,
    sharing,
    accessRequest,
    enter,
    exit,
    updated,
    changeSharing,
    changeAccessRequest,
    invalidateAuth: () => {
      operations.invalidateFacts()
    },
    setExportBarrier: (barrier: () => Promise<void>) => {
      exportBarrier = barrier
    },
    select: async (principal: string, scope?: typeof scopePath) => {
      setPrincipal(principal, scope)
      await notify?.({ kind: 'identity' })
    },
    updateContextRevision: () => {
      active = { ...active, revision: `identity-${String(++revision)}` }
    },
    setContextFailure: (fail: boolean) => {
      failContext = fail
    },
    reset: async () => {
      Object.assign(state, load())
      setPrincipal('casey')
      exportBarrier = undefined
      await relations.replaceSnapshot(graph)
      await notify?.({ kind: 'identity' })
    },
  }
}
