import type { AccessRequest } from '../access/access-contract'
import { showcaseNavigationDomain } from './showcase-routes'
import type { AccessRequirement } from '../access/native-requirement'

export const fixtureRecordsDomain = 'showcase-records'
export const fixtureRelationshipsDomain = 'showcase-relationships'
export const fixtureAvailabilitySource = 'showcase-availability'
export const fixtureWorkflowSource = 'showcase-workflow'

export const globalShowcaseScope = { kind: 'global' } as const
export const showcaseRequirement = (...requests: readonly AccessRequest[]): AccessRequirement => ({
  scope: globalShowcaseScope,
  operator: 'all',
  requests,
})

export function taskCapability(kind: 'collection', action: string): AccessRequest
export function taskCapability(kind: 'record', action: string, recordId: string): AccessRequest
export function taskCapability(
  kind: 'field',
  action: string,
  recordId: string,
  fieldPath: string,
): AccessRequest
export function taskCapability(
  kind: 'collection' | 'record' | 'field',
  action: string,
  recordId?: string,
  fieldPath?: string,
): AccessRequest {
  const base = { domain: fixtureRecordsDomain, resource: 'task', action }
  if (kind === 'collection') return { ...base, kind, domain: showcaseNavigationDomain }
  if (kind === 'record' && recordId !== undefined) return { ...base, kind, recordId }
  if (kind === 'field' && recordId !== undefined && fieldPath !== undefined)
    return { ...base, kind, recordId, fieldPath }
  throw new TypeError('Incomplete showcase task capability.')
}

export const reportCapability = (action: string, recordId: string): AccessRequest => ({
  kind: 'record',
  domain: fixtureRecordsDomain,
  resource: 'report',
  action,
  recordId,
})

export const showcaseRoleCheck: AccessRequest = {
  kind: 'type',
  domain: 'showcase-role-graph',
  resource: 'project',
  action: 'view',
}
