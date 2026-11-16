import { z } from 'zod'

import {
  accessContextSchema,
  accessRequestSchema,
  accessScopeSchema,
  type AccessHost,
  type AccessRequest,
  type BoundAccessRequest,
} from './access-contract'

const identifier = z.string().min(1)
const capabilityIdentifier = identifier.refine((value) => !value.includes('*'))
const kinds = accessRequestSchema.unwrap().options.map((schema) => schema.shape.kind.value)
const capabilitiesSchema = z
  .array(
    z
      .strictObject({
        kind: z.enum(kinds),
        resource: capabilityIdentifier,
        action: capabilityIdentifier,
      })
      .readonly(),
  )
  .min(1)
  .readonly()

export const nativeScopeSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('global') }),
    z.strictObject({
      kind: z.literal('exact'),
      path: accessScopeSchema.refine(
        (path) => path.length > 0 && new Set(path.map(({ kind }) => kind)).size === path.length,
      ),
    }),
  ])
  .readonly()

const grantSchema = z.strictObject({
  effect: z.enum(['allow', 'deny']),
  request: accessRequestSchema,
  scope: nativeScopeSchema,
})

const grants = z.array(grantSchema)
const assignments = { roles: z.array(identifier), grants }
const policySchema = z.strictObject({
  complete: z.literal(true),
  revision: identifier,
  roles: z.array(z.strictObject({ id: identifier, inherits: z.array(identifier), grants })),
  groups: z.array(z.strictObject({ id: identifier, ...assignments })).optional(),
  subjects: z.array(
    z.strictObject({
      identity: accessContextSchema.unwrap().shape.identity,
      groups: z.array(identifier),
      ...assignments,
    }),
  ),
})

type Grant = z.output<typeof grantSchema>
type NativeScope = z.output<typeof nativeScopeSchema>
type Capability = z.output<typeof capabilitiesSchema>[number]
type Context = BoundAccessRequest['context']
type Provider = AccessHost['decisions'][number]
type Policy = z.output<typeof policySchema>

export function matchNativeScope(
  scope: NativeScope,
  actual: Context['scope'],
): 'match' | 'different' | 'unknown' {
  if (scope.kind === 'global') return 'match'
  if (new Set(actual.map(({ kind }) => kind)).size !== actual.length) return 'unknown'
  if (
    scope.path.length === actual.length &&
    scope.path.every(
      ({ kind, id }, index) => actual[index]?.kind === kind && actual[index].id === id,
    )
  )
    return 'match'
  let missing = false
  for (const { kind, id } of scope.path) {
    const confirmed = actual.find((part) => part.kind === kind)
    if (confirmed === undefined) missing = true
    else if (confirmed.id !== id) return 'different'
  }
  return missing ? 'unknown' : 'different'
}

function keyForCapability(input: Capability): string {
  return JSON.stringify([input.kind, input.resource, input.action])
}

function keyForIdentity(identity: Context['identity']): string | null {
  return identity.kind === 'known' ? identity.principalId : null
}

function uniqueIndex<T, Key>(entries: readonly T[], keyFor: (entry: T) => Key): Map<Key, T> {
  const result = new Map<Key, T>()
  for (const entry of entries) {
    const key = keyFor(entry)
    if (result.has(key)) throw new TypeError('Duplicate native access declaration.')
    result.set(key, entry)
  }
  return result
}

function compilePolicy(policy: Policy, checkCapability: (request: AccessRequest) => boolean) {
  const roles = uniqueIndex(policy.roles, (role) => role.id)
  const groups = uniqueIndex(policy.groups ?? [], (group) => group.id)
  const subjects = uniqueIndex(policy.subjects, (subject) => keyForIdentity(subject.identity))
  const validated = new Set<string>()
  const visiting = new Set<string>()

  function visitRole(id: string): void {
    if (validated.has(id)) return
    const role = roles.get(id)
    if (role === undefined || visiting.has(id)) throw new TypeError('Invalid native role graph.')
    visiting.add(id)
    for (const parent of role.inherits) visitRole(parent)
    visiting.delete(id)
    validated.add(id)
  }

  for (const id of roles.keys()) visitRole(id)
  for (const holder of [...roles.values(), ...groups.values(), ...subjects.values()]) {
    if (holder.grants.some(({ request }) => !checkCapability(request)))
      throw new TypeError('Unregistered grant capability.')
    if ('roles' in holder && holder.roles.some((role) => !roles.has(role)))
      throw new TypeError('Unknown assigned role.')
  }

  const effective = new Map<string | null, ReadonlySet<Grant>>()
  for (const [key, subject] of subjects) {
    const roleIds = new Set(subject.roles)
    const permissions = new Set(subject.grants)
    for (const id of subject.groups) {
      const group = groups.get(id)
      if (group === undefined) throw new TypeError('Unknown assigned group.')
      for (const role of group.roles) roleIds.add(role)
      for (const grant of group.grants) permissions.add(grant)
    }
    // Set iteration includes newly discovered parents, once per role.
    for (const id of roleIds) {
      const role = roles.get(id)
      if (role === undefined) throw new TypeError('Unknown inherited role.')
      for (const parent of role.inherits) roleIds.add(parent)
      for (const grant of role.grants) permissions.add(grant)
    }
    effective.set(key, permissions)
  }
  return effective
}

function matchesTarget(grant: AccessRequest, request: AccessRequest): boolean {
  if (
    grant.kind !== request.kind ||
    grant.resource !== request.resource ||
    grant.action !== request.action
  )
    return false
  if ('recordId' in grant && (!('recordId' in request) || grant.recordId !== request.recordId))
    return false
  return (
    grant.kind !== 'field' || (request.kind === 'field' && grant.fieldPath === request.fieldPath)
  )
}

/** Validate a complete native policy once. Undefined means policy facts have not been confirmed. */
export function createNativeGrantProvider(
  domain: string,
  capabilities: unknown,
  snapshot: unknown,
) {
  const policyAvailable = snapshot !== undefined
  let catalog: ReadonlyMap<string, Capability> = new Map()
  let validCatalog = false
  let effective: ReturnType<typeof compilePolicy> | undefined
  let revision: string | undefined
  const registered = (request: AccessRequest) =>
    request.domain === domain && catalog.has(keyForCapability(request))

  try {
    capabilityIdentifier.parse(domain)
    catalog = uniqueIndex(capabilitiesSchema.parse(capabilities), keyForCapability)
    validCatalog = true
    if (policyAvailable) {
      const policy = policySchema.parse(snapshot)
      effective = compilePolicy(policy, registered)
      revision = policy.revision
    }
  } catch {
    // Never expose parser details, a partial policy, or a previous permissive snapshot.
  }

  return Object.freeze({
    domain,
    capabilities: Object.freeze([...catalog.values()]),
    targets: Object.freeze([...new Set([...catalog.values()].map(({ kind }) => kind))]),
    evaluate({ context, request }: BoundAccessRequest): ReturnType<Provider['evaluate']> {
      if (!validCatalog)
        return { status: 'configuration-error', reasonCode: 'native-access.invalid-catalog' }
      if (!registered(request))
        return {
          status: 'configuration-error',
          reasonCode: 'native-access.unregistered-capability',
        }
      if (!policyAvailable)
        return { status: 'indeterminate', reasonCode: 'native-access.policy-unavailable' }
      if (effective === undefined || revision === undefined)
        return { status: 'configuration-error', reasonCode: 'native-access.invalid-policy' }

      let allowed = false
      let possibleAllow = false
      let possibleDenial = false
      for (const grant of effective.get(keyForIdentity(context.identity)) ?? []) {
        if (!matchesTarget(grant.request, request)) continue
        const scope = matchNativeScope(grant.scope, context.scope)
        if (scope === 'different') continue
        if (scope === 'unknown') {
          if (grant.effect === 'deny') possibleDenial = true
          else possibleAllow = true
        } else if (grant.effect === 'deny') {
          return { status: 'deny', reasonCode: 'native-access.explicit-denial', revision }
        } else {
          allowed = true
        }
      }
      if (possibleDenial || (!allowed && possibleAllow))
        return { status: 'indeterminate', reasonCode: 'native-access.scope-unconfirmed', revision }
      return allowed
        ? { status: 'allow', reasonCode: 'native-access.granted', revision }
        : { status: 'deny', reasonCode: 'native-access.no-grant', revision }
    },
  } satisfies Provider & { readonly capabilities: readonly Capability[] })
}
