import { shallowRef } from 'vue'
import { z } from 'zod'
import {
  accessScopeSchema,
  type AccessBoundary,
  type AccessContextSnapshot,
} from './access-contract'
import type { ActionTarget } from './guarded-action'

const identifier = z.string().min(1)
const deadline = z.number().int().nonnegative()
const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const owner = z.strictObject({ kind: identifier, id: identifier }).readonly()
const base = { id: identifier, source: identifier, scope: accessScopeSchema }
const constraintSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...base,
      kind: z.literal('feature'),
      environment: identifier,
      variant: identifier.optional(),
    }),
    z.strictObject({ ...base, kind: z.literal('entitlement'), owner, capability: identifier }),
    z.strictObject({
      ...base,
      kind: z.literal('quota'),
      owner,
      unit: identifier,
      period: identifier,
      requested: amount.positive(),
    }),
    z.strictObject({ ...base, kind: z.literal('workflow'), transition: identifier }),
    z.strictObject({ ...base, kind: z.literal('assurance') }),
  ])
  .readonly()

export type BusinessConstraint = z.output<typeof constraintSchema>
export interface OperationIntent {
  readonly operation: string
  readonly target: ActionTarget
  readonly mode: 'all' | 'partial'
  readonly context: AccessContextSnapshot
}

const details = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('feature'), value: z.union([z.boolean(), identifier]) }),
  z.strictObject({ kind: z.literal('entitlement'), granted: z.boolean() }),
  z.strictObject({
    kind: z.literal('quota'),
    remaining: z.union([amount, z.literal('unlimited')]),
  }),
  z.strictObject({ kind: z.literal('workflow'), eligible: z.boolean() }),
  z.strictObject({ kind: z.literal('assurance'), challenge: z.literal(true) }),
])
const resolutionSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('confirmed'),
    revision: identifier,
    expiresAt: deadline.optional(),
    detail: details,
  }),
  z.strictObject({ status: z.enum(['pending', 'unknown', 'configuration-error', 'failed']) }),
])

export type BusinessResolution = z.input<typeof resolutionSchema>
export interface BusinessEvaluation {
  readonly intent: OperationIntent
  readonly constraint: BusinessConstraint
}

export interface BusinessAvailabilitySource {
  readonly id: string
  evaluate(
    input: BusinessEvaluation,
    signal: AbortSignal,
  ): BusinessResolution | Promise<BusinessResolution>
  subscribe?(
    invalidate: (change: {
      readonly constraintId: string
      readonly scope?: AccessContextSnapshot['scope']
      readonly targetId?: string
    }) => void,
  ): () => void
}

type AvailabilityStatus =
  | 'available'
  | 'restricted'
  | 'challenge'
  | 'pending'
  | 'unknown'
  | 'configuration-error'
  | 'failed'
  | 'stale'
export interface AvailabilityResult {
  readonly kind?: BusinessConstraint['kind']
  readonly status: AvailabilityStatus
  readonly revision?: string
  readonly expiresAt?: number
  readonly allowance?: {
    readonly remaining: number | 'unlimited'
    readonly requested: number
    readonly unit: string
    readonly period: string
  }
}

export function sameBusinessScope(
  left: AccessContextSnapshot['scope'],
  right: AccessContextSnapshot['scope'],
): boolean {
  return (
    left.length === right.length &&
    left.every(({ kind, id }, index) => {
      const item = right[index]
      return item?.kind === kind && item.id === id
    })
  )
}

function normalize(constraint: BusinessConstraint, input: unknown): AvailabilityResult {
  const { kind } = constraint
  const parsed = resolutionSchema.safeParse(input)
  if (!parsed.success) return { kind, status: 'configuration-error' }
  const result = parsed.data
  if (result.status !== 'confirmed') return { kind, status: result.status }
  const { detail, revision, expiresAt } = result
  const validity = { kind, revision, ...(expiresAt === undefined ? {} : { expiresAt }) }
  switch (constraint.kind) {
    case 'feature': {
      if (
        detail.kind !== 'feature' ||
        typeof detail.value !== (constraint.variant === undefined ? 'boolean' : 'string')
      )
        break
      return {
        ...validity,
        status: (
          constraint.variant === undefined
            ? detail.value === true
            : detail.value === constraint.variant
        )
          ? 'available'
          : 'restricted',
      }
    }
    case 'entitlement':
      if (detail.kind === 'entitlement')
        return { ...validity, status: detail.granted ? 'available' : 'restricted' }
      break
    case 'quota':
      if (detail.kind === 'quota') {
        const { remaining } = detail
        const { requested, unit, period } = constraint
        return {
          ...validity,
          status: remaining === 'unlimited' || remaining >= requested ? 'available' : 'restricted',
          allowance: { remaining, requested, unit, period },
        }
      }
      break
    case 'workflow':
      if (detail.kind === 'workflow')
        return { ...validity, status: detail.eligible ? 'available' : 'restricted' }
      break
    case 'assurance':
      if (detail.kind === 'assurance') return { ...validity, status: 'challenge' }
      break
  }
  return { kind, status: 'configuration-error' }
}

/** A selected gate consumes detailed provider resolution. A configured fallback is never proof. */
export function confirmedFeature(input: {
  readonly readiness: 'ready' | 'initializing' | 'failed'
  readonly reason: 'resolved' | 'default' | 'missing' | 'type-mismatch' | 'error'
  readonly value: unknown
  readonly revision: string
  readonly expiresAt?: number
}): BusinessResolution {
  if (input.readiness === 'failed' || input.reason === 'error') return { status: 'failed' }
  if (input.readiness === 'initializing') return { status: 'pending' }
  if (input.reason === 'missing' || input.reason === 'type-mismatch')
    return { status: 'configuration-error' }
  if (input.reason !== 'resolved') return { status: 'unknown' }
  const value = z.union([z.boolean(), identifier]).safeParse(input.value)
  return value.success
    ? {
        status: 'confirmed',
        revision: input.revision,
        detail: { kind: 'feature', value: value.data },
        ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
      }
    : { status: 'configuration-error' }
}

export function observeBusinessAvailability(
  access: AccessBoundary,
  intent: OperationIntent | undefined,
  describe: (() => readonly BusinessConstraint[]) | undefined,
  onInvalidated: () => void,
) {
  const readReady = () => {
    const current = access.readContext()
    return intent !== undefined && current.status === 'ready' && current.snapshot === intent.context
  }
  let constraints: readonly BusinessConstraint[] | undefined
  try {
    constraints = describe === undefined ? [] : z.array(constraintSchema).parse(describe())
    if (
      new Set(constraints.map(({ id }) => id)).size !== constraints.length ||
      constraints.filter(({ kind }) => kind === 'assurance').length > 1
    )
      constraints = undefined
  } catch {
    /* The selected declaration stays unavailable. */
  }
  const entries = (constraints ?? []).map((constraint) => {
    const source = access.availabilitySource?.(constraint.source)
    const { kind } = constraint
    const unavailable: AvailabilityResult = { kind, status: 'configuration-error' }
    const result = shallowRef<AvailabilityResult>(
      source === undefined ? unavailable : { kind, status: 'pending' },
    )
    let attempt: AbortController | undefined
    let expiry: ReturnType<typeof setTimeout> | undefined
    let stop: (() => void) | undefined
    let closed = false
    let configured = source !== undefined
    function retire(): void {
      attempt?.abort()
      attempt = undefined
      clearTimeout(expiry)
    }
    try {
      stop = source?.subscribe?.((change) => {
        if (
          closed ||
          change.constraintId !== constraint.id ||
          (change.targetId !== undefined && change.targetId !== intent?.target.id) ||
          (change.scope !== undefined &&
            (intent === undefined || !sameBusinessScope(change.scope, intent.context.scope)))
        )
          return
        retire()
        result.value = { kind, status: 'stale' }
        onInvalidated()
      })
    } catch {
      configured = false
      result.value = unavailable
    }
    return {
      read(): AvailabilityResult {
        const current = result.value
        if (!readReady() || closed || (current.expiresAt ?? Infinity) <= Date.now())
          return { kind, status: 'stale' }
        return current
      },
      async evaluate(signal?: AbortSignal): Promise<void> {
        if (closed || !source || !configured || !intent || !readReady()) return
        if (!sameBusinessScope(constraint.scope, intent.context.scope)) {
          result.value = { kind, status: 'unknown' }
          return
        }
        retire()
        const current = new AbortController()
        attempt = current
        const abort = () => {
          current.abort()
        }
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) abort()
        result.value = { kind, status: 'pending' }
        const owns = () => !closed && !current.signal.aborted && attempt === current && readReady()
        try {
          if (!owns()) return
          const answer = await source.evaluate(
            Object.freeze({ intent, constraint }),
            current.signal,
          )
          if (!owns()) return
          const confirmed = normalize(constraint, answer)
          result.value = confirmed
          const deadline = confirmed.expiresAt
          function expire(): void {
            if (!owns() || deadline === undefined) return
            const delay = deadline - Date.now()
            if (delay <= 0) {
              result.value = { kind, status: 'stale' }
              onInvalidated()
            } else expiry = setTimeout(expire, Math.min(delay, 2_147_483_647))
          }
          if (deadline !== undefined && deadline > Date.now()) expire()
        } catch {
          if (owns()) result.value = { kind, status: 'failed' }
        } finally {
          signal?.removeEventListener('abort', abort)
        }
      },
      dispose(): void {
        closed = true
        retire()
        stop?.()
      },
    }
  })
  return {
    read: (): readonly AvailabilityResult[] =>
      constraints === undefined
        ? [{ status: 'configuration-error' }]
        : entries.map((entry) => entry.read()),
    evaluate: async (signal?: AbortSignal): Promise<void> => {
      await Promise.all(entries.map((entry) => entry.evaluate(signal)))
    },
    dispose: () => {
      for (const entry of entries) entry.dispose()
    },
  }
}
