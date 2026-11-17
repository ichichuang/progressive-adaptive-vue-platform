import { createApiAttempt } from '../../shared/api/cancellation'
import type {
  AccessBoundary,
  AccessInvalidation,
  AccessState,
  BoundAccessRequest,
} from './access-contract'
import { observeNativeRequirement, type NativeAccessRequirement } from './native-requirement'

export interface ActionTarget {
  readonly id: string
  readonly revision?: string
  readonly idempotencyKey?: string
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
  readonly requirement: (target: ActionTarget) => NativeAccessRequirement
  readonly isTargetCurrent: (target: ActionTarget) => boolean
  readonly businessAllows: (target: ActionTarget) => boolean
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
  | 'invalid-target'
  | 'not-dispatched'
  | 'completed'
  | 'failed'
  | 'unknown'

export interface GuardedActionOutcome {
  readonly targetId: string
  readonly status: ActionStatus
  readonly requestId?: string
  readonly applied?: boolean
}

interface ActionInvocation {
  readonly targets: readonly ActionTarget[]
  readonly mode?: 'all' | 'partial'
  readonly signal: AbortSignal
  readonly confirm?: (signal: AbortSignal) => boolean | Promise<boolean>
}

type Requirement = ReturnType<typeof observeNativeRequirement>
type Permit = NonNullable<ReturnType<Requirement['permit']>>

interface Candidate {
  readonly target: ActionTarget
  readonly check: Requirement
  isBound(): boolean
  permit: Permit | undefined
}

function outcome(
  target: ActionTarget,
  status: ActionStatus,
  requestId?: string,
  applied?: boolean,
): GuardedActionOutcome {
  return Object.freeze({
    targetId: target.id,
    status,
    ...(requestId === undefined ? {} : { requestId }),
    ...(applied === undefined ? {} : { applied }),
  })
}

export function observeActionTarget<Result>(
  access: AccessBoundary,
  action: GuardedAction<Result>,
  target: ActionTarget,
  onInvalidated: (change: AccessInvalidation) => void,
) {
  let requirement: NativeAccessRequirement | undefined
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
  return observeNativeRequirement(access, requirement, onInvalidated)
}

function authorizationStatus(state: AccessState): ActionStatus {
  if (state.status === 'deny') return 'denied'
  return state.status === 'configuration-error' ? state.status : 'unresolved'
}

/** Bind once at invocation; a new identity or target needs a new invocation. */
export async function executeGuardedAction<Result>(
  access: AccessBoundary,
  action: GuardedAction<Result>,
  input: ActionInvocation,
): Promise<readonly GuardedActionOutcome[]> {
  const targets = Array.from(input.targets, ({ id, revision, idempotencyKey }) =>
    Object.freeze({
      id,
      ...(revision === undefined ? {} : { revision }),
      ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    }),
  )
  if (
    new Set(targets.map(({ id }) => id)).size !== targets.length ||
    targets.some(({ id }) => id.length === 0)
  )
    return targets.map((target) => outcome(target, 'invalid-target'))
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

  async function authorize(candidate: Candidate): Promise<ActionStatus | undefined> {
    const { target, check } = candidate
    if (!candidate.isBound()) return 'not-dispatched'
    if (!action.businessAllows(target)) return 'business-blocked'
    const attempt = createApiAttempt(lifecycle.signal, 10_000)
    try {
      await attempt.run(() => check.evaluate())
    } catch {
      return candidate.isBound() ? 'unresolved' : 'not-dispatched'
    } finally {
      attempt.dispose()
    }
    if (!candidate.isBound()) return 'not-dispatched'
    if (!action.businessAllows(target)) return 'business-blocked'
    candidate.permit = check.permit()
    return candidate.permit === undefined ? authorizationStatus(check.read()) : undefined
  }

  function eligibility(candidate: Candidate): ActionStatus | undefined {
    if (!candidate.isBound()) return 'not-dispatched'
    if (!action.businessAllows(candidate.target)) return 'business-blocked'
    return candidate.permit?.isCurrent() === true
      ? undefined
      : authorizationStatus(candidate.check.read())
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
          outcome(
            command.target,
            candidate === undefined
              ? 'not-dispatched'
              : (eligibility(candidate) ?? 'not-dispatched'),
          ),
        )
        continue
      }
      const reply = correlate(command, replies)
      if (reply?.status === 'completed') {
        let applied = false
        if (command.isCurrent() && action.apply !== undefined) {
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
      const check = observeActionTarget(access, action, target, (change) => {
        invalidated = true
        if (
          change.kind === 'identity' ||
          change.kind === 'scope' ||
          input.mode !== 'partial' ||
          targets.length === 1
        )
          cancel()
      })
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
        if (status === undefined) approved.push(candidate)
        else outcomes.set(candidate.target.id, outcome(candidate.target, status))
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
        if (input.mode === 'partial') {
          for (const candidate of approved) {
            // A previous command may cross an asynchronous boundary or change business state.
            const status = await authorize(candidate)
            if (status === undefined) await dispatch([candidate])
            else outcomes.set(candidate.target.id, outcome(candidate.target, status))
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
