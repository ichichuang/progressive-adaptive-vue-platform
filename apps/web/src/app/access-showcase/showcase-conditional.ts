import type { AccessProvider } from '../access/access-contract'
import type { LoadConditionalFacts } from '../access/conditional-facts'
import { createPredicateAccess } from '../access/predicate-access'
import { fixtureRecordsDomain, globalShowcaseScope } from './showcase-requirements'

export const conditionalCapabilities = [
  ...['read', 'save', 'complete', 'create', 'delete'].map((action) => ({
    kind: 'record' as const,
    resource: 'task',
    action,
  })),
  ...['read-field', 'write-field'].map((action) => ({
    kind: 'field' as const,
    resource: 'task',
    action,
  })),
  ...['read', 'export', 'sharing', 'request', 'approve'].map((action) => ({
    kind: 'record' as const,
    resource: 'report',
    action,
  })),
]

export function conditionsFor(action: string): Readonly<Record<string, boolean>> {
  const base = { inScope: true, member: true }
  switch (action) {
    case 'create':
      return { ...base, manager: true }
    case 'save':
    case 'delete':
    case 'complete':
      return { ...base, assigned: true }
    case 'read-field':
      return { ...base, readable: true }
    case 'write-field':
      return { ...base, assigned: true, writable: true }
    case 'sharing':
      return { ...base, manager: true }
    case 'approve':
      return { ...base, reviewer: true, separateRequester: true, approvalCurrent: true }
    default:
      return base
  }
}

export type ConditionalAuthority = (loadFacts: LoadConditionalFacts) => AccessProvider

export const createShowcasePredicates: ConditionalAuthority = (loadFacts) =>
  createPredicateAccess({
    domain: fixtureRecordsDomain,
    scope: globalShowcaseScope,
    rules: conditionalCapabilities.map((capability) => ({
      ...capability,
      requires: Object.keys(conditionsFor(capability.action)),
      test: ({ facts }) =>
        Object.entries(conditionsFor(capability.action)).every(
          ([path, value]) => facts[path] === value,
        ),
    })),
    loadFacts,
  }).provider
