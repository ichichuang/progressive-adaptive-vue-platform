import { z } from 'zod'
import { accessScopeSchema, type AccessProvider } from './access-contract'
import { capabilityKey, indexCapabilities, scopeDecision } from './adapter-capabilities'
import { nativeScopeSchema } from './native-grants'
import { createProviderSnapshot } from './provider-snapshot'

const id = z.string().min(1)
const instant = z.number().int().nonnegative()
const window = { startsAt: instant.optional(), expiresAt: instant.optional() }
const validWindow = ({
  startsAt,
  expiresAt,
}: {
  startsAt?: number | undefined
  expiresAt?: number | undefined
}) => (startsAt ?? 0) < (expiresAt ?? Infinity)
const principal = z.strictObject({ kind: z.enum(['principal', 'group']), id })
const reference = z.strictObject({ resource: id, id })
const grant = z.enum(['owner', 'member', 'collaborator'])
const mapping = z.strictObject({
  resource: id,
  action: id,
  allow: z.array(grant).min(1),
  inherit: z.array(id),
})
const snapshotSchema = z.strictObject({
  complete: z.boolean(),
  scope: accessScopeSchema.refine((path) => path.length > 0),
  revision: id,
  expiresAt: instant.optional(),
  principals: z.array(id).max(256),
  groups: z
    .array(
      z.strictObject({
        id,
        members: z.array(z.strictObject({ principal, ...window }).refine(validWindow)).max(256),
      }),
    )
    .max(256),
  objects: z.array(reference.extend({ parent: reference.optional() })).max(256),
  edges: z
    .array(
      z
        .strictObject({
          object: reference,
          principal,
          relation: z.enum(['owner', 'member', 'collaborator', 'exclude']),
          ...window,
        })
        .refine(validWindow),
    )
    .max(1024),
})
type Reference = z.output<typeof reference>
type Subject = z.output<typeof principal>
type Edge = z.output<typeof snapshotSchema>['edges'][number]

function objectKey({ resource, id }: Reference): string {
  return JSON.stringify([resource, id])
}
function indexed<T>(values: readonly T[], key: (value: T) => string): Map<string, T> {
  const result = new Map(values.map((value) => [key(value), value]))
  if (result.size !== values.length) throw new TypeError('Duplicate relationship reference.')
  return result
}
function validateAcyclic<T>(
  index: ReadonlyMap<string, T>,
  links: (node: T) => readonly string[],
): void {
  const done = new Set<string>()
  const queue = new Set<string>()
  function visit(key: string): void {
    if (done.has(key)) return
    if (queue.has(key)) throw new TypeError('Cyclic relationship snapshot.')
    const node = index.get(key)
    if (!node) throw new TypeError('Missing relationship reference.')
    queue.add(key)
    for (const target of links(node)) visit(target)
    queue.delete(key)
    done.add(key)
  }
  for (const key of index.keys()) visit(key)
}

export function createRelationshipAccess(options: {
  readonly domain: string
  readonly mappings: readonly z.input<typeof mapping>[]
  readonly snapshot?: unknown
  readonly clock?: () => number
  readonly maxTraversal?: number
}) {
  const { domain } = options
  const maxTraversal = z
    .number()
    .int()
    .min(1)
    .max(4096)
    .parse(options.maxTraversal ?? 512)
  const clock = options.clock ?? Date.now
  const mappings = indexCapabilities(
    options.mappings.map((item) => ({ ...mapping.parse(item), kind: 'record' as const })),
  )
  const resources = new Set([...mappings.values()].map(({ resource }) => resource))
  const inheritance = new Map<string, Set<string>>()
  for (const rule of mappings.values()) {
    const parents = inheritance.get(rule.resource) ?? new Set<string>()
    for (const parent of rule.inherit) {
      if (!resources.has(parent)) throw new TypeError('Unregistered parent resource type.')
      parents.add(parent)
    }
    inheritance.set(rule.resource, parents)
  }
  const snapshots = createProviderSnapshot(domain, options.snapshot, (input) => {
    const source = snapshotSchema.parse(input)
    const scope = nativeScopeSchema.parse({ kind: 'exact', path: source.scope })
    const groups = indexed(source.groups, ({ id }) => id)
    const objects = indexed(source.objects, objectKey)
    const principals = indexed(source.principals, (id) => id)
    const edges = new Map<string, Edge[]>()
    if (!source.complete)
      return {
        scope,
        revision: source.revision,
        complete: false,
        expiresAt: source.expiresAt,
        groups,
        objects,
        edges,
      }
    const registered = (value: Subject) =>
      value.kind === 'principal' ? principals.has(value.id) : groups.has(value.id)
    for (const group of groups.values()) {
      if (group.members.some(({ principal }) => !registered(principal)))
        throw new TypeError('Unregistered group member.')
    }
    validateAcyclic(groups, (group) =>
      group.members.flatMap(({ principal }) => (principal.kind === 'group' ? [principal.id] : [])),
    )
    for (const object of objects.values()) {
      if (
        !resources.has(object.resource) ||
        (object.parent && !inheritance.get(object.resource)?.has(object.parent.resource))
      )
        throw new TypeError('Unregistered relationship inheritance.')
    }
    validateAcyclic(objects, (object) => (object.parent ? [objectKey(object.parent)] : []))
    for (const edge of source.edges) {
      const key = objectKey(edge.object)
      if (!registered(edge.principal) || !objects.has(key))
        throw new TypeError('Unregistered relationship edge.')
      const bucket = edges.get(key) ?? []
      bucket.push(edge)
      edges.set(key, bucket)
    }
    return {
      scope,
      revision: source.revision,
      complete: source.complete,
      expiresAt: source.expiresAt,
      groups,
      objects,
      edges,
    }
  })

  const provider: AccessProvider = {
    domain,
    targets: Object.freeze(['record']),
    subscribe: snapshots.subscribe,
    evaluate(binding) {
      const { request, context } = binding
      const rule = mappings.get(capabilityKey(request))
      if (request.domain !== domain || request.kind !== 'record' || !rule)
        return { status: 'unsupported', reasonCode: 'access.capability-unsupported' }
      const snapshot = snapshots.read()
      if ('unavailable' in snapshot) return snapshot.unavailable
      const { scope, revision, complete, expiresAt, groups, objects, edges } = snapshot.value
      const now = clock()
      if (!Number.isSafeInteger(now) || now < 0)
        return { status: 'configuration-error', reasonCode: 'access.invalid-clock' }
      if (!complete || scopeDecision(scope, binding) || (expiresAt ?? Infinity) <= now)
        return { status: 'indeterminate', reasonCode: 'access.relationship-snapshot-unavailable' }
      if (context.identity.kind !== 'known') return { status: 'deny', revision }
      const identity = context.identity.principalId
      const memberships = new Map<string, boolean>()
      let remaining = maxTraversal
      let deadline = expiresAt ?? Infinity
      function charge(): void {
        if (--remaining < 0) throw new RangeError('Relationship traversal exhausted.')
      }
      function inWindow(time: {
        startsAt?: number | undefined
        expiresAt?: number | undefined
      }): boolean {
        const started = time.startsAt ?? 0
        const ended = time.expiresAt ?? Infinity
        if (now < started) deadline = Math.min(deadline, started)
        if (now < ended) deadline = Math.min(deadline, ended)
        return started <= now && now < ended
      }
      function included(subject: Subject): boolean {
        charge()
        if (subject.kind === 'principal') return subject.id === identity
        const cached = memberships.get(subject.id)
        if (cached !== undefined) return cached
        let found = false
        for (const member of groups.get(subject.id)?.members ?? []) {
          charge()
          if (inWindow(member) && included(member.principal)) found = true
        }
        memberships.set(subject.id, found)
        return found
      }
      let allowed = false
      let excluded = false
      try {
        let object = objects.get(objectKey({ resource: request.resource, id: request.recordId }))
        while (object !== undefined) {
          charge()
          for (const edge of edges.get(objectKey(object)) ?? []) {
            charge()
            if (edge.relation !== 'exclude' && !rule.allow.includes(edge.relation)) continue
            if (!inWindow(edge) || !included(edge.principal)) continue
            if (edge.relation === 'exclude') excluded = true
            else allowed = true
          }
          const parent = object.parent
          object =
            parent && rule.inherit.includes(parent.resource)
              ? objects.get(objectKey(parent))
              : undefined
        }
      } catch {
        return { status: 'indeterminate', reasonCode: 'access.relationship-traversal-limit' }
      }
      return {
        status: allowed && !excluded ? 'allow' : 'deny',
        revision,
        ...(Number.isFinite(deadline) ? { expiresAt: deadline } : {}),
      }
    },
  }
  return Object.freeze({ provider: Object.freeze(provider), replaceSnapshot: snapshots.replace })
}
