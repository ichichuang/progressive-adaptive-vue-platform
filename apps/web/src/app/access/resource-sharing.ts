import { z } from 'zod'
import type { ResourceInteractionHost } from './resource-interaction'

const id = z.string().min(1).max(256)
const timestamp = z.number().int().nonnegative()
export const sharingMode = z.enum(['private', 'organization', 'selected-members', 'public'])
export type SharingMode = z.output<typeof sharingMode>
export interface SharingHost extends ResourceInteractionHost<'save' | 'revoke'> {
  readonly modes: readonly SharingMode[]
  readonly scopes: readonly { readonly id: string; readonly label: string }[]
  readonly members?: readonly { readonly id: string; readonly label: string }[]
  readonly maxLifetimeMs?: number
  readonly destinationPolicy?: {
    readonly origins: readonly string[]
    permits(destination: URL): boolean
  }
}

const shareViewSchema = z.strictObject({
  revision: id,
  status: z.enum(['ready', 'recorded', 'publishing', 'effective', 'revoked', 'expired', 'failed']),
  expiresAt: timestamp.optional(),
  destination: z
    .discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('host'), url: z.string().max(4096) }),
      z.strictObject({
        kind: z.literal('simulation'),
        reference: z.string().regex(/^fixture:[a-z0-9-]+$/u),
      }),
    ])
    .optional(),
})

export function parseShareView(input: unknown, host: SharingHost) {
  const result = shareViewSchema.safeParse(input)
  if (!result.success) return undefined
  const { destination, ...view } = result.data
  if (view.status !== 'effective' || !destination) return view
  if (destination.kind === 'simulation') return { ...view, destination }
  try {
    const url = new URL(destination.url)
    const policy = host.destinationPolicy
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !policy?.origins.includes(url.origin) ||
      !policy.permits(new URL(url))
    )
      return undefined
    return { ...view, destination: { kind: 'host' as const, url: url.href } }
  } catch {
    return undefined
  }
}

export function sharingProposal(
  host: SharingHost,
  input: {
    readonly mode: SharingMode | null
    readonly scope: string | null
    readonly recipients: readonly string[]
    readonly expiresAt: number | null
  },
  now = Date.now(),
) {
  const { mode, scope, recipients, expiresAt } = input
  if (
    mode === null ||
    !host.modes.includes(mode) ||
    scope === null ||
    !host.scopes.some(({ id }) => id === scope)
  )
    return undefined
  if (mode === 'selected-members') {
    if (
      recipients.length === 0 ||
      new Set(recipients).size !== recipients.length ||
      !recipients.every((recipient) => host.members?.some(({ id }) => id === recipient) === true)
    )
      return undefined
  } else if (recipients.length !== 0) return undefined
  if (
    expiresAt !== null &&
    (!timestamp.safeParse(expiresAt).success ||
      host.maxLifetimeMs === undefined ||
      expiresAt <= now ||
      expiresAt - now > host.maxLifetimeMs)
  )
    return undefined
  return { mode, scope, recipients: [...recipients], grant: 'read', expiresAt }
}
