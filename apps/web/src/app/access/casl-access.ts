// An explicitly imported provider entry. The public and native bootstrap do not import CASL.
import { createMongoAbility, subject, type MongoAbility, type RawRuleOf } from '@casl/ability'
import { z } from 'zod'
import type { AccessProvider } from './access-contract'
import {
  capabilityKey,
  capabilityShape,
  indexCapabilities,
  scopeDecision,
  type AdapterScope,
} from './adapter-capabilities'
import {
  factPathSchema,
  factScalarSchema,
  readDeclaredFacts,
  validFactPaths,
  type LoadConditionalFacts,
} from './conditional-facts'
import { nativeScopeSchema } from './native-grants'
import { createProviderSnapshot } from './provider-snapshot'

const token = z.string().min(1)
const names = z.union([token, z.array(token).min(1)])
const fieldPattern = z
  .string()
  .refine((value) =>
    value
      .split('.')
      .every((part) => part === '*' || part === '**' || factPathSchema.safeParse(part).success),
  )
const operators = z
  .strictObject({
    $eq: factScalarSchema.optional(),
    $ne: factScalarSchema.optional(),
    $in: z.array(factScalarSchema).optional(),
    $nin: z.array(factScalarSchema).optional(),
    $gt: z.union([z.number(), z.string()]).optional(),
    $gte: z.union([z.number(), z.string()]).optional(),
    $lt: z.union([z.number(), z.string()]).optional(),
    $lte: z.union([z.number(), z.string()]).optional(),
    $exists: z.boolean().optional(),
  })
  .refine((condition) => Object.keys(condition).length > 0)
const ruleSchema = z.strictObject({
  action: names,
  subject: names,
  fields: z.union([fieldPattern, z.array(fieldPattern).min(1)]).optional(),
  conditions: z.record(factPathSchema, z.union([factScalarSchema, operators])).optional(),
  inverted: z.boolean().optional(),
})
const policySchema = z.strictObject({
  revision: token,
  rules: z.array(ruleSchema),
})
const mappingSchema = z
  .strictObject({
    ...capabilityShape,
    subject: token.refine((value) => value !== 'all'),
    abilityAction: token,
    input: z.enum(['confirmed', 'candidate']).default('confirmed'),
  })
  .refine(
    (mapping) =>
      mapping.input === 'confirmed' || mapping.kind === 'record' || mapping.kind === 'field',
  )

interface CaslAccessOptions {
  readonly domain: string
  readonly scope: AdapterScope
  readonly mappings: readonly z.input<typeof mappingSchema>[]
  readonly policy?: unknown
  readonly loadFacts?: LoadConditionalFacts
}

type Ability = MongoAbility<
  [string, string | ReturnType<typeof subject<string, Record<string, unknown>>>]
>
function list(value: string | string[]): string[] {
  return typeof value === 'string' ? [value] : value
}

/** Validate the complete ordered policy before installing it. CASL is the rule evaluator. */
export function createCaslAccess(options: CaslAccessOptions) {
  const { domain } = options
  const scope = nativeScopeSchema.parse(options.scope)
  const mappings = indexCapabilities(options.mappings.map((item) => mappingSchema.parse(item)))
  const actions = new Set([
    'manage',
    ...[...mappings.values()].map(({ abilityAction }) => abilityAction),
  ])
  const subjects = new Set(['all', ...[...mappings.values()].map((item) => item.subject)])
  const policies = createProviderSnapshot(domain, options.policy, (input) => {
    const policy = policySchema.parse(input)
    const dependencies = new Set<string>()
    for (const rule of policy.rules) {
      if (
        list(rule.action).some((name) => !actions.has(name)) ||
        list(rule.subject).some((name) => !subjects.has(name))
      )
        throw new TypeError('A CASL rule references an unregistered action or subject.')
      for (const path of Object.keys(rule.conditions ?? {})) dependencies.add(path)
    }
    if (!validFactPaths([...dependencies])) throw new TypeError('CASL fact paths overlap.')
    const ability = createMongoAbility<Ability>(policy.rules as RawRuleOf<Ability>[])
    // The library compiles condition matchers lazily. Check all supported rules now.
    for (const action of actions) {
      for (const subjectType of subjects) {
        for (const rule of ability.possibleRulesFor(action, subjectType)) void rule.ast
      }
    }
    return { ability, revision: policy.revision }
  })

  const provider: AccessProvider = {
    domain,
    targets: Object.freeze([...new Set([...mappings.values()].map(({ kind }) => kind))]),
    subscribe: policies.subscribe,
    async evaluate(binding) {
      const { request } = binding
      const mapping = mappings.get(capabilityKey(request))
      if (request.domain !== domain || !mapping)
        return { status: 'unsupported', reasonCode: 'access.capability-unsupported' }
      const denied = scopeDecision(scope, binding)
      if (denied) return denied
      const snapshot = policies.read()
      if ('unavailable' in snapshot) return snapshot.unavailable
      const { ability, revision } = snapshot.value
      const { abilityAction, subject: subjectType, input } = mapping
      if (request.kind === 'type')
        return { status: ability.can(abilityAction, subjectType) ? 'allow' : 'deny', revision }
      const field = request.kind === 'field' ? request.fieldPath : undefined
      if (field !== undefined && !factPathSchema.safeParse(field).success)
        return { status: 'unsupported', reasonCode: 'access.field-path-unsupported' }
      const possible = ability.rulesFor(abilityAction, subjectType, field)
      if (request.kind === 'collection') {
        if (possible.some((rule) => rule.conditions !== undefined))
          return { status: 'indeterminate', reasonCode: 'access.collection-projection-required' }
        return { status: ability.can(abilityAction, subjectType) ? 'allow' : 'deny', revision }
      }
      if (!request.recordId)
        return { status: 'unsupported', reasonCode: 'access.record-id-required' }
      const required = [...new Set(possible.flatMap((rule) => Object.keys(rule.conditions ?? {})))]
      const projected = await readDeclaredFacts(options.loadFacts, binding, input, required)
      if (policies.read() !== snapshot)
        return { status: 'indeterminate', reasonCode: 'access.snapshot-replaced' }
      if ('unavailable' in projected) return projected.unavailable
      const target = subject(subjectType, projected.facts)
      return {
        status: ability.can(abilityAction, target, field) ? 'allow' : 'deny',
        revision,
        ...projected.validity,
      }
    },
  }
  return Object.freeze({
    provider: Object.freeze(provider),
    replacePolicy: policies.replace,
    invalidateFacts: policies.invalidate,
  })
}
