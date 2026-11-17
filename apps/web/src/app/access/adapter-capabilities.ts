import { z } from 'zod'
import {
  accessRequestSchema,
  type AccessDecision,
  type AccessRequest,
  type BoundAccessRequest,
} from './access-contract'
import { matchNativeScope, type nativeScopeSchema } from './native-grants'

const kinds = accessRequestSchema.unwrap().options.map(({ shape }) => shape.kind.value)
export const capabilityShape = {
  kind: z.enum(kinds),
  resource: z.string().min(1),
  action: z.string().min(1),
}
export type AdapterScope = z.input<typeof nativeScopeSchema>
type Capability = Pick<AccessRequest, 'kind' | 'resource' | 'action'>

export function capabilityKey({ kind, resource, action }: Capability): string {
  return JSON.stringify([kind, resource, action])
}

export function indexCapabilities<T extends Capability>(entries: readonly T[]): Map<string, T> {
  if (entries.length === 0) throw new TypeError('An adapter requires explicit capabilities.')
  const result = new Map<string, T>()
  for (const entry of entries) {
    const key = capabilityKey(entry)
    if (result.has(key)) throw new TypeError('Duplicate adapter capability.')
    result.set(key, entry)
  }
  return result
}

export function scopeDecision(
  scope: z.output<typeof nativeScopeSchema>,
  binding: BoundAccessRequest,
): AccessDecision | undefined {
  const result = matchNativeScope(scope, binding.context.scope)
  if (result === 'unknown')
    return { status: 'indeterminate', reasonCode: 'access.scope-unconfirmed' }
  if (result === 'different') return { status: 'deny', reasonCode: 'access.scope-mismatch' }
}
