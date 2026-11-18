import type { AccessRequestInteractionHost } from '../access/access-request-interaction'
import type { GuardedAction } from '../access/guarded-action'
import { sharingMode, sharingProposal, type SharingHost } from '../access/resource-sharing'
import { members, organizations, reportId } from './showcase-data'
import { reportCapability, showcaseRequirement } from './showcase-requirements'
import type { ShowcaseWorld } from './showcase-world'

export function createShowcaseInteractions(world: ShowcaseWorld) {
  const { state } = world
  let shareRevision = 'share-seed'
  let requestRevision = 'request-seed'
  let epoch = world.currentGeneration()
  function reconcile() {
    const current = world.currentGeneration()
    if (epoch === current) return
    epoch = current
    shareRevision = world.issueRevision()
    requestRevision = world.issueRevision()
  }
  function command(
    action: string,
    revision: () => string,
    commit: Parameters<ShowcaseWorld['guardedCommand']>[1],
  ): GuardedAction<unknown> {
    return world.guardedCommand(
      () => showcaseRequirement(reportCapability(action, reportId)),
      (target, context) => {
        reconcile()
        if (target.revision !== revision()) return
        return commit(target, context)
      },
      { isTargetCurrent: ({ id }) => id === reportId, businessAllows: () => true },
    )
  }

  const sharing: SharingHost = {
    label: 'Signal report',
    targetId: reportId,
    modes: sharingMode.options,
    scopes: [{ id: organizations[0].id, label: organizations[0].en }],
    members,
    maxLifetimeMs: 24 * 60 * 60_000,
    viewRequirement: showcaseRequirement(reportCapability('sharing', reportId)),
    read() {
      reconcile()
      const { status, expiresAt } = state.share
      return Promise.resolve({
        revision: shareRevision,
        status:
          status === 'effective' && (expiresAt ?? Infinity) <= state.time ? 'expired' : status,
        ...(expiresAt === undefined ? {} : { expiresAt }),
        ...(status !== 'effective'
          ? {}
          : { destination: { kind: 'simulation', reference: 'fixture:showcase-report' } }),
      })
    },
    commands: {
      save: command(
        'sharing',
        () => shareRevision,
        (target) => {
          const values = target.proposal?.values
          const mode = sharingMode.safeParse(values?.['mode']).data ?? null
          const candidateScope = values?.['scope']
          const recipients = values?.['recipients']
          const expiresAt = values?.['expiresAt']
          if (
            (typeof expiresAt !== 'number' && expiresAt !== null) ||
            typeof candidateScope !== 'string' ||
            !Array.isArray(recipients)
          )
            return
          const proposal = sharingProposal(
            sharing,
            {
              mode,
              scope: candidateScope,
              recipients: recipients.filter((value): value is string => typeof value === 'string'),
              expiresAt,
            },
            state.time,
          )
          if (!proposal) return
          shareRevision = world.issueRevision()
          world.setShare({
            mode: proposal.mode,
            recipients: proposal.recipients,
            ...(expiresAt === null ? {} : { expiresAt }),
            status: 'effective',
          })
          return true
        },
      ),
      revoke: command(
        'sharing',
        () => shareRevision,
        () => {
          shareRevision = world.issueRevision()
          world.setShare({ ...state.share, status: 'revoked' })
          return true
        },
      ),
    },
  }

  const requests: AccessRequestInteractionHost = {
    scopes: sharing.scopes,
    targetId: reportId,
    label: 'Signal report',
    viewRequirement: showcaseRequirement(reportCapability('request', reportId)),
    read() {
      reconcile()
      return Promise.resolve({
        revision: requestRevision,
        status:
          state.requestState === 'pending' && state.time >= state.approvalExpiresAt
            ? 'expired'
            : state.requestState,
      })
    },
    commands: {
      request: command(
        'request',
        () => requestRevision,
        (_target, context) => {
          if (context.identity.kind !== 'known') return
          const principalId = context.identity.principalId
          const requester = members.find(({ id }) => id === principalId)?.id
          if (!requester || state.requestState !== 'requestable') return
          state.requester = requester
          state.requestState = 'pending'
          requestRevision = world.issueRevision()
          return true
        },
      ),
      approve: command(
        'approve',
        () => requestRevision,
        () => {
          if (state.requestState !== 'pending' || state.time >= state.approvalExpiresAt) return
          state.requestState = 'effective'
          requestRevision = world.issueRevision()
          return true
        },
      ),
    },
  }
  return { sharing, requests }
}
