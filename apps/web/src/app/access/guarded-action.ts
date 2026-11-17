import { createApiAttempt } from '../../shared/api/cancellation'
import { captureAccessProposal } from './access-boundary'
import type {
  AccessBoundary,
  AccessContextSnapshot,
  AccessInvalidation,
  AccessProposal,
  AccessState,
  BoundAccessRequest,
} from './access-contract'
import { observeNativeRequirement, type AccessRequirement } from './native-requirement'
import {
  observeBusinessAvailability,
  sameBusinessScope,
  type AvailabilityResult,
  type BusinessConstraint,
  type OperationIntent,
} from './business-availability'

export interface ActionTarget {
  readonly id: string
  readonly mode?: string
  readonly revision?: string
  readonly idempotencyKey?: string
  readonly proposal?: AccessProposal
}

export type AssuranceResult =
  | { readonly status: 'cancelled' | 'expired' | 'failed' }
  | {
      readonly status: 'verified'
      readonly intent: OperationIntent
      readonly expiresAt: number
      readonly refreshContext?: true
    }

interface ActionCommand {
  readonly requestId: string
  readonly target: ActionTarget
  readonly context: BoundAccessRequest['context']
  isCurrent(): boolean
}

type ActionReply<Result> = {
  readonly requestId: string
  readonly targetId: string
} & (
  | { readonly status: 'completed'; readonly value: Result }
  | { readonly status: 'failed' | 'unknown' | 'not-dispatched' }
)

export interface GuardedAction<Result> {
  readonly requirement: (target: ActionTarget) => AccessRequirement
  readonly isTargetCurrent: (target: ActionTarget) => boolean
  readonly businessAllows: (target: ActionTarget) => boolean
  readonly availability?: {
    readonly operation: string
    constraints(target: ActionTarget): readonly BusinessConstraint[]
    verify?(intent: OperationIntent, signal: AbortSignal): Promise<AssuranceResult>
  }
  /** The host owns transport, authoritative authorization and any transaction across commands. */
  readonly dispatch: (
    commands: readonly ActionCommand[],
    signal: AbortSignal,
  ) => Promise<readonly ActionReply<Result>[]>
  /** An explicitly admitted, idempotent replay of the very same command IDs. */
  readonly retryUnknown?: true
  /** Apply to the current owner synchronously. Follow-up asynchronous reads take their own lease. */
  readonly apply?: (value: Result, command: ActionCommand) => undefined
}

type ActionStatus =
  | 'denied'
  | 'business-blocked'
  | 'unresolved'
  | 'configuration-error'
  | 'unsupported'
  | 'invalid-target'
  | 'not-dispatched'
  | 'completed'
  | 'failed'
  | 'unknown'
type PreflightStatus = ActionStatus | 'assurance-required'

export interface GuardedActionOutcome {
  readonly targetId: string
  readonly status: ActionStatus
  readonly requestId?: string
  readonly applied?: boolean
  readonly reason?: AvailabilityReason
}

type AvailabilityReason = Pick<AvailabilityResult, 'kind' | 'status'>

interface ActionInvocation {
  readonly targets: readonly ActionTarget[]
  readonly mode?: 'all' | 'partial'
  readonly signal: AbortSignal
  readonly confirm?: (signal: AbortSignal) => boolean | Promise<boolean>
}

type Requirement = ReturnType<typeof observeNativeRequirement>
type Permit = NonNullable<ReturnType<Requirement['permit']>>

interface AssuranceProof {
  readonly intent: OperationIntent
  readonly context: AccessContextSnapshot
  readonly revision: string
  readonly expiresAt: number
}

interface Candidate {
  readonly target: ActionTarget
  readonly check: ReturnType<typeof observeActionTarget>
  isBound(): boolean
  permit: Permit | undefined
}

function outcome(
  target: ActionTarget,
  status: ActionStatus,
  requestId?: string,
  applied?: boolean,
  reason?: AvailabilityReason,
): GuardedActionOutcome {
  return Object.freeze({
    targetId: target.id,
    status,
    ...(requestId === undefined ? {} : { requestId }),
    ...(applied === undefined ? {} : { applied }),
    ...(reason === undefined ? {} : { reason }),
  })
}

function captureTarget(target: ActionTarget): ActionTarget {
  const { id, mode, revision, idempotencyKey, proposal } = target
  return Object.freeze({
    id,
    ...(mode === undefined ? {} : { mode }),
    ...(revision === undefined ? {} : { revision }),
    ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    ...(proposal === undefined ? {} : { proposal: captureAccessProposal(proposal) }),
  })
}

export function observeActionTarget<Result>(
  access: AccessBoundary,
  action: GuardedAction<Result>,
  target: ActionTarget,
  onInvalidated: (change: AccessInvalidation) => void,
  options?: { readonly mode?: ActionInvocation['mode']; readonly businessInvalidated?: () => void },
) {
  let requirement: AccessRequirement | undefined
  try {
    const selected = action.requirement(target)
    if (
      !selected.requests.some(
        (request) =>
          (request.kind === 'record' || request.kind === 'field') && request.recordId !== target.id,
      )
    )
      requirement = selected
  } catch {
    // An unusable declaration keeps the target unavailable.
  }
  const authorization = observeNativeRequirement(
    access,
    requirement,
    onInvalidated,
    target.proposal,
  )
  const context = access.readContext()
  const definition = action.availability
  let intent: OperationIntent | undefined
  try {
    if (context.status === 'ready' && definition?.operation)
      intent = Object.freeze({
        operation: definition.operation,
        target: captureTarget(target),
        mode: options?.mode ?? 'all',
        context: context.snapshot,
      })
  } catch {
    /* Malformed proposals stay unavailable. */
  }
  const business = observeBusinessAvailability(
    access,
    intent,
    definition === undefined
      ? undefined
      : () => {
          if (!intent) throw new TypeError('Missing operation intent.')
          return definition.constraints(target)
        },
    options?.businessInvalidated ?? (() => undefined),
  )
  function assessment() {
    const state = authorization.read()
    const results = authorization.permit()?.isCurrent() === true ? business.read() : []
    // Declaration order breaks ties. Other restrictions take priority over recovery.
    const primary =
      results.find(({ status }) => status !== 'available' && status !== 'challenge') ??
      results.find(({ status }) => status === 'challenge')
    return { state, results, primary }
  }
  return {
    ...authorization,
    intent,
    async evaluate(signal?: AbortSignal): Promise<void> {
      await authorization.evaluate()
      if (
        !signal?.aborted &&
        authorization.permit()?.isCurrent() === true &&
        action.businessAllows(target)
      )
        await business.evaluate(signal)
    },
    assessment,
    dispose(): void {
      business.dispose()
      authorization.dispose()
    },
  }
}

function authorizationStatus(state: AccessState): ActionStatus {
  if (state.status === 'deny') return 'denied'
  if (state.status === 'evaluation-failed') return 'failed'
  return state.status === 'configuration-error' || state.status === 'unsupported'
    ? state.status
    : 'unresolved'
}

/** Bind once at invocation; a new identity or target needs a new invocation. */
export async function executeGuardedAction<Result>(
  access: AccessBoundary,
  action: GuardedAction<Result>,
  input: ActionInvocation,
): Promise<readonly GuardedActionOutcome[]> {
  let targets: readonly ActionTarget[]
  try {
    targets = input.targets.map(captureTarget)
  } catch {
    return input.targets.map((target) => outcome(target, 'invalid-target'))
  }
  if (
    new Set(targets.map(({ id }) => id)).size !== targets.length ||
    targets.some(({ id }) => id.length === 0)
  )
    return targets.map((target) => outcome(target, 'invalid-target'))
  return await runGuardedAction(access, action, input, targets)
}

function sameSubject(left: AccessContextSnapshot, right: AccessContextSnapshot): boolean {
  return (
    left.identity.kind === 'known' &&
    right.identity.kind === 'known' &&
    left.identity.principalId === right.identity.principalId &&
    left.delegation?.actorId === right.delegation?.actorId &&
    left.delegation?.reference === right.delegation?.reference &&
    left.delegation?.expiresAt === right.delegation?.expiresAt &&
    JSON.stringify(left.delegation?.restrictions) ===
      JSON.stringify(right.delegation?.restrictions) &&
    sameBusinessScope(left.scope, right.scope)
  )
}

async function runGuardedAction<Result>(
  access: AccessBoundary,
  action: GuardedAction<Result>,
  input: ActionInvocation,
  targets: readonly ActionTarget[],
  proof?: AssuranceProof,
): Promise<readonly GuardedActionOutcome[]> {
  const start = access.readContext()
  if (start.status !== 'ready') return targets.map((target) => outcome(target, 'unresolved'))
  const context = start.snapshot
  const lifecycle = new AbortController()
  const cancel = (): void => {
    lifecycle.abort()
  }
  input.signal.addEventListener('abort', cancel, { once: true })
  if (input.signal.aborted) cancel()
  const candidates: Candidate[] = []
  const outcomes = new Map<string, GuardedActionOutcome>()

  function isOriginCurrent(): boolean {
    const current = access.readContext()
    return !lifecycle.signal.aborted && current.status === 'ready' && current.snapshot === context
  }

  async function authorize(candidate: Candidate): Promise<PreflightStatus | undefined> {
    const { check } = candidate
    if (!candidate.isBound()) return 'not-dispatched'
    const attempt = createApiAttempt(lifecycle.signal, 10_000)
    try {
      await attempt.run(() => check.evaluate(attempt.signal))
    } catch {
      return candidate.isBound() ? 'unresolved' : 'not-dispatched'
    } finally {
      attempt.dispose()
    }
    if (!candidate.isBound()) return 'not-dispatched'
    candidate.permit = check.permit()
    return eligibility(candidate)
  }

  function eligibility(candidate: Candidate): PreflightStatus | undefined {
    if (!candidate.isBound()) return 'not-dispatched'
    if (candidate.permit?.isCurrent() !== true) return authorizationStatus(candidate.check.read())
    if (!action.businessAllows(candidate.target)) return 'business-blocked'
    const { primary } = candidate.check.assessment()
    if (!primary) return undefined
    if (primary.status === 'challenge') {
      if (
        proof?.context === context &&
        proof.revision === primary.revision &&
        proof.intent.operation === candidate.check.intent?.operation &&
        proof.expiresAt > Date.now()
      )
        return undefined
      return action.availability?.verify !== undefined &&
        targets.length === 1 &&
        proof === undefined
        ? 'assurance-required'
        : 'business-blocked'
    }
    if (primary.status === 'configuration-error') return 'configuration-error'
    if (primary.status === 'failed') return 'failed'
    return primary.status === 'restricted' ? 'business-blocked' : 'unresolved'
  }

  function blocked(candidate: Candidate, status: PreflightStatus): GuardedActionOutcome {
    const primary = candidate.check.assessment().primary
    return outcome(
      candidate.target,
      status === 'assurance-required' ? 'business-blocked' : status,
      undefined,
      undefined,
      primary === undefined
        ? undefined
        : { ...(primary.kind === undefined ? {} : { kind: primary.kind }), status: primary.status },
    )
  }

  async function verify(candidate: Candidate): Promise<readonly GuardedActionOutcome[]> {
    const intent = candidate.check.intent
    const assurance = candidate.check.assessment().primary
    const definition = action.availability
    const unavailable = (status: ActionStatus) => [blocked(candidate, status)]
    if (!intent || assurance?.status !== 'challenge' || !assurance.revision || !definition?.verify)
      return unavailable('configuration-error')
    if (context.identity.kind !== 'known' || !candidate.isBound())
      return unavailable('not-dispatched')
    let result: AssuranceResult
    try {
      result = await definition.verify(intent, lifecycle.signal)
    } catch {
      return unavailable(candidate.isBound() ? 'failed' : 'not-dispatched')
    }
    if (!candidate.isBound()) return unavailable('not-dispatched')
    if (result.status !== 'verified')
      return unavailable(result.status === 'failed' ? 'failed' : 'not-dispatched')
    const expiresAt = Math.min(result.expiresAt, assurance.expiresAt ?? Infinity)
    if (result.intent !== intent || !Number.isFinite(expiresAt) || expiresAt <= Date.now())
      return unavailable('not-dispatched')
    let continuation = context
    if (result.refreshContext) {
      const refreshed = await access.reconfirm?.(context)
      if (!refreshed || !sameSubject(context, refreshed)) return unavailable('not-dispatched')
      continuation = refreshed
    }
    const current = access.readContext()
    if (
      input.signal.aborted ||
      current.status !== 'ready' ||
      current.snapshot !== continuation ||
      !action.isTargetCurrent(candidate.target) ||
      expiresAt <= Date.now()
    )
      return unavailable('not-dispatched')
    for (const { check } of candidates) check.dispose()
    const { signal, mode } = input
    return await runGuardedAction(
      access,
      action,
      { signal, targets, ...(mode === undefined ? {} : { mode }) },
      targets,
      {
        intent,
        context: continuation,
        revision: assurance.revision,
        expiresAt,
      },
    )
  }

  async function dispatch(group: readonly Candidate[]): Promise<void> {
    const commands = Object.freeze(
      group.map((candidate): ActionCommand =>
        Object.freeze({
          requestId: crypto.randomUUID(),
          context,
          target: candidate.target,
          isCurrent: () => eligibility(candidate) === undefined,
        }),
      ),
    )
    const delivery = { dispatched: false }
    async function send() {
      const attempt = createApiAttempt(input.signal, 30_000)
      try {
        return await attempt.run(async () => {
          if (group.some((candidate) => eligibility(candidate) !== undefined)) return []
          delivery.dispatched = true
          return await action.dispatch(commands, attempt.signal)
        })
      } catch {
        return []
      } finally {
        attempt.dispose()
      }
    }
    const correlate = (command: ActionCommand, replies: readonly ActionReply<Result>[]) => {
      // Count entries sharing either identity before checking the complete pair.
      const matches = replies.filter(
        (reply) => reply.requestId === command.requestId || reply.targetId === command.target.id,
      )
      const reply = matches[0]
      return matches.length === 1 &&
        reply?.requestId === command.requestId &&
        reply.targetId === command.target.id
        ? reply
        : undefined
    }
    let replies = await send()
    if (
      delivery.dispatched &&
      action.retryUnknown === true &&
      commands.every(
        (command) =>
          command.target.idempotencyKey &&
          command.isCurrent() &&
          correlate(command, replies)?.status === 'unknown',
      )
    )
      replies = await send()
    for (const command of commands) {
      if (!delivery.dispatched) {
        const candidate = group.find(({ target }) => target.id === command.target.id)
        outcomes.set(
          command.target.id,
          candidate === undefined
            ? outcome(command.target, 'not-dispatched')
            : blocked(candidate, eligibility(candidate) ?? 'not-dispatched'),
        )
        continue
      }
      const reply = correlate(command, replies)
      if (reply?.status === 'completed') {
        let applied = false
        const candidate = group.find(({ target }) => target.id === command.target.id)
        // A completed command may itself change the quota or workflow that enabled dispatch.
        const applyCurrent =
          action.availability === undefined
            ? command.isCurrent()
            : candidate?.isBound() && candidate.permit?.isCurrent()
        if (applyCurrent && action.apply !== undefined) {
          try {
            action.apply(reply.value, command)
            applied = true
          } catch {
            // A presentation failure cannot change the service's completed outcome.
          }
        }
        outcomes.set(
          command.target.id,
          outcome(command.target, 'completed', command.requestId, applied),
        )
      } else
        outcomes.set(
          command.target.id,
          outcome(command.target, reply?.status ?? 'unknown', command.requestId),
        )
    }
  }

  try {
    // Subscribe all targets before any awaits, including while confirmation is open.
    for (const target of targets) {
      let invalidated = false
      const check = observeActionTarget(
        access,
        action,
        target,
        (change) => {
          invalidated = true
          if (
            change.kind === 'identity' ||
            change.kind === 'scope' ||
            input.mode !== 'partial' ||
            targets.length === 1
          )
            cancel()
        },
        { mode: input.mode },
      )
      candidates.push({
        target,
        check,
        permit: undefined,
        isBound: () => !invalidated && isOriginCurrent() && action.isTargetCurrent(target),
      })
    }
    async function preflight(group: readonly Candidate[]) {
      const approved: Candidate[] = []
      for (const candidate of group) {
        const status = await authorize(candidate)
        if (status === undefined || status === 'assurance-required') approved.push(candidate)
        else outcomes.set(candidate.target.id, blocked(candidate, status))
      }
      return approved
    }

    let approved = await preflight(candidates)
    if (
      approved.length !== 0 &&
      (input.mode === 'partial' || approved.length === candidates.length)
    ) {
      const confirmed =
        input.confirm === undefined ||
        (!lifecycle.signal.aborted && (await input.confirm(lifecycle.signal)))
      if (confirmed && input.confirm !== undefined) approved = await preflight(approved)
      if (confirmed) {
        const required = approved.find(
          (candidate) => eligibility(candidate) === 'assurance-required',
        )
        if (required !== undefined) return await verify(required)
        if (input.mode === 'partial') {
          for (const candidate of approved) {
            // A previous command may cross an asynchronous boundary or change business state.
            const status = await authorize(candidate)
            if (status === undefined) await dispatch([candidate])
            else outcomes.set(candidate.target.id, blocked(candidate, status))
          }
        } else if (approved.length === candidates.length) await dispatch(approved)
      }
    }
    return targets.map((target) => outcomes.get(target.id) ?? outcome(target, 'not-dispatched'))
  } finally {
    input.signal.removeEventListener('abort', cancel)
    for (const { check } of candidates) check.dispose()
  }
}
