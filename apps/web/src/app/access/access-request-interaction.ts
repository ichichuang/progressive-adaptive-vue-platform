import { z } from 'zod'
import type { AccessRequirement } from './native-requirement'
import type { ResourceInteractionHost } from './resource-interaction'

export interface AccessRequestInteractionHost extends ResourceInteractionHost<
  'request' | 'cancel' | 'approve' | 'reject' | 'revoke'
> {
  readonly scopes: readonly { readonly id: string; readonly label: string }[]
  readonly effectiveRequirement?: AccessRequirement
}

const viewSchema = z.strictObject({
  revision: z.string().min(1),
  status: z.enum([
    'requestable',
    'pending',
    'approved',
    'provisioning',
    'effective',
    'rejected',
    'cancelled',
    'revoked',
    'expired',
    'failed',
  ]),
  expiresAt: z.number().int().nonnegative().optional(),
})

export function parseAccessRequestView(input: unknown) {
  return viewSchema.safeParse(input).data
}

export function requestProposal(
  host: AccessRequestInteractionHost,
  scope: string | null,
  reason: string,
) {
  const description = reason.trim()
  if (
    scope === null ||
    !host.scopes.some(({ id }) => id === scope) ||
    description.length === 0 ||
    description.length > 500
  )
    return undefined
  return { scope, reason: description }
}
