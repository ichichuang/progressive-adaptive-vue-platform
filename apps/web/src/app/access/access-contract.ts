import { z } from 'zod'

const identifier = z.string().min(1)
const expiresAt = z.number().int().nonnegative()
export const accessScopeSchema = z
  .array(z.strictObject({ kind: identifier, id: identifier }).readonly())
  .readonly()

const identitySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('anonymous') }),
  z.strictObject({ kind: z.literal('known'), principalId: identifier }),
])

export const accessContextSchema = z
  .strictObject({
    identity: identitySchema.readonly(),
    scope: accessScopeSchema,
    revision: identifier.optional(),
    expiresAt: expiresAt.optional(),
  })
  .readonly()

const resource = { domain: identifier, resource: identifier }
const record = { ...resource, recordId: identifier }
const field = { ...record, fieldPath: identifier }
const action = { action: identifier }

export const accessRequestSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('type'), ...resource, ...action }),
    z.strictObject({ kind: z.literal('collection'), ...resource, ...action }),
    z.strictObject({ kind: z.literal('record'), ...record, ...action }),
    z.strictObject({ kind: z.literal('field'), ...field, ...action }),
  ])
  .readonly()

export const accessInvalidationSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('identity') }),
    z.strictObject({ kind: z.literal('scope') }),
    z.strictObject({
      kind: z.literal('domain'),
      domain: identifier,
      action: identifier.optional(),
    }),
    z.strictObject({ kind: z.literal('record'), ...record, action: identifier.optional() }),
    z.strictObject({ kind: z.literal('field'), ...field, action: identifier.optional() }),
  ])
  .readonly()

export const accessDecisionSchema = z
  .strictObject({
    status: z.enum(['allow', 'deny', 'indeterminate']),
    revision: identifier.optional(),
    expiresAt: expiresAt.optional(),
  })
  .readonly()

export type AccessRequest = z.output<typeof accessRequestSchema>
export type AccessInvalidation = z.output<typeof accessInvalidationSchema>
type AccessContextSnapshot = z.output<typeof accessContextSchema>
type AccessDecision = z.output<typeof accessDecisionSchema>

export type AccessContextChange =
  | { readonly kind: 'identity' }
  | { readonly kind: 'scope'; readonly candidate?: z.output<typeof accessScopeSchema> }

export type AccessHostChange =
  AccessContextChange | Exclude<AccessInvalidation, { readonly kind: 'identity' | 'scope' }>

export interface BoundAccessRequest {
  readonly id: number
  readonly context: AccessContextSnapshot
  readonly contextGeneration: number
  readonly request: AccessRequest
}

export interface AccessHost {
  resolveContext(
    change: AccessContextChange,
  ): AccessContextSnapshot | Promise<AccessContextSnapshot>
  readonly decisions: readonly {
    readonly domain: string
    readonly targets: readonly AccessRequest['kind'][]
    evaluate(request: BoundAccessRequest): AccessDecision | Promise<AccessDecision>
  }[]
  subscribe?(notify: (change: AccessHostChange) => Promise<void>): () => void
}

export type AccessContextState =
  | { readonly status: 'ready'; readonly snapshot: AccessContextSnapshot }
  | {
      readonly status:
        | 'unconfigured'
        | 'initializing'
        | 'transitioning'
        | 'identity-failed'
        | 'expired'
        | 'disposed'
    }

export type AccessState =
  | AccessDecision
  | {
      readonly status:
        | 'initializing'
        | 'transitioning'
        | 'identity-failed'
        | 'pending'
        | 'stale'
        | 'expired'
        | 'disposed'
        | 'configuration-error'
        | 'evaluation-failed'
    }

interface AccessPermit {
  readonly binding: BoundAccessRequest
  isCurrent(): boolean
}

interface AccessConsumer {
  read(): AccessState
  evaluate(): Promise<void>
  permit(): AccessPermit | undefined
  dispose(): void
}

export interface AccessBoundary {
  readContext(): AccessContextState
  observe(
    request: AccessRequest,
    onInvalidated: (change: AccessInvalidation) => void,
  ): AccessConsumer
}
