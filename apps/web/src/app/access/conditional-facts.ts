import { z } from 'zod'
import type { AccessDecision, BoundAccessRequest } from './access-contract'

const forbiddenParts = new Set(['__proto__', 'prototype', 'constructor', '__caslSubjectType__'])
export const factPathSchema = z
  .string()
  .refine((path) =>
    path
      .split('.')
      .every((part) => /^[A-Za-z_][A-Za-z0-9_-]*$/u.test(part) && !forbiddenParts.has(part)),
  )
export const factScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const valueSchema = z.union([factScalarSchema, z.array(factScalarSchema).readonly()])
const factSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('known'), value: valueSchema }),
  z.strictObject({ status: z.literal('absent') }),
  z.strictObject({ status: z.literal('pending') }),
  z.strictObject({ status: z.literal('unknown') }),
  z.strictObject({ status: z.literal('undisclosed') }),
])
const packetSchema = z.strictObject({
  facts: z.record(factPathSchema, factSchema),
  complete: z.array(factPathSchema),
  revision: z.string().min(1).optional(),
  expiresAt: z.number().int().nonnegative().optional(),
})
export type ConditionalInput = 'confirmed' | 'candidate'
export type FactPacket = z.input<typeof packetSchema> & {
  readonly binding: BoundAccessRequest
  readonly input: ConditionalInput
  readonly proposalRevision?: string
}
export type LoadConditionalFacts = (
  binding: BoundAccessRequest,
  input: ConditionalInput,
  required: readonly string[],
) => FactPacket | undefined | Promise<FactPacket | undefined>

interface ProjectedFacts {
  readonly facts: Record<string, unknown>
  readonly validity: Pick<AccessDecision, 'expiresAt'>
}

export function validFactPaths(paths: readonly string[]): boolean {
  const unique = new Set(paths)
  return (
    paths.length === unique.size &&
    paths.every(
      (path) =>
        factPathSchema.safeParse(path).success &&
        !paths.some((other) => other.startsWith(path + '.')),
    )
  )
}

export async function readDeclaredFacts(
  load: LoadConditionalFacts | undefined,
  binding: BoundAccessRequest,
  input: ConditionalInput,
  required: readonly string[],
): Promise<ProjectedFacts | { readonly unavailable: AccessDecision }> {
  const incomplete = { status: 'indeterminate', reasonCode: 'access.facts-incomplete' } as const
  if (input === 'candidate' && binding.proposal === undefined)
    return { unavailable: { status: 'indeterminate', reasonCode: 'access.proposal-required' } }
  if (required.length === 0) return { facts: {}, validity: {} }
  if (!load) return { unavailable: incomplete }
  try {
    const packet = await load(binding, input, Object.freeze([...required]))
    if (
      packet?.binding !== binding ||
      packet.input !== input ||
      (input === 'candidate' && packet.proposalRevision !== binding.proposal?.revision)
    )
      return { unavailable: incomplete }
    const parsed = packetSchema.safeParse({
      facts: packet.facts,
      complete: packet.complete,
      revision: packet.revision,
      expiresAt: packet.expiresAt,
    })
    if (!parsed.success)
      return { unavailable: { status: 'configuration-error', reasonCode: 'access.invalid-facts' } }
    const { facts, complete, expiresAt } = parsed.data
    const covered = new Set(complete)
    if (expiresAt !== undefined && expiresAt <= Date.now()) return { unavailable: incomplete }
    if (required.some((path) => facts[path]?.status === 'pending'))
      return { unavailable: { status: 'pending', reasonCode: 'access.facts-pending' } }
    const result: Record<string, unknown> = {}
    for (const path of required) {
      const fact = Object.hasOwn(facts, path) ? facts[path] : undefined
      if (!covered.has(path) || !fact || (fact.status !== 'known' && fact.status !== 'absent'))
        return { unavailable: incomplete }
      if (fact.status === 'absent') continue
      const segments = path.split('.')
      const leaf = segments.pop()
      if (!leaf) return { unavailable: incomplete }
      let parent = result
      for (const segment of segments) {
        if (!Object.hasOwn(parent, segment)) parent[segment] = {}
        parent = parent[segment] as Record<string, unknown>
      }
      parent[leaf] = fact.value
    }
    return { facts: result, validity: expiresAt === undefined ? {} : { expiresAt } }
  } catch {
    return { unavailable: { status: 'evaluation-failed', reasonCode: 'access.fact-load-failed' } }
  }
}
