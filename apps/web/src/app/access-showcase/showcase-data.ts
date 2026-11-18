import type { SharingMode } from '../access/resource-sharing'
import type { ShowcasePreset } from './showcase-presets'

export const organizations = [
  { id: 'showcase-harbor', en: 'Harbor Studio', zh: '港湾工作室' },
  { id: 'showcase-ridge', en: 'Ridge Cooperative', zh: '山脊合作社' },
] as const
export const members = [
  { id: 'showcase-fern', label: 'Fern' },
  { id: 'showcase-robin', label: 'Robin' },
] as const
export const projects = [
  { id: 'showcase-signal', organization: organizations[0].id, label: 'Harbor Signal' },
  { id: 'showcase-atlas', organization: organizations[1].id, label: 'Ridge Atlas' },
] as const
export const reportId = 'showcase-report'
export type Organization = (typeof organizations)[number]['id']
type Member = (typeof members)[number]['id']
export type FixtureIdentity = Member | 'anonymous'
export type Fault = 'none' | 'empty-grants' | 'empty-data' | 'incomplete' | 'provider-failure'
export type RelationshipMode = 'complete' | 'incomplete' | 'cycle'
export type ExportBlock = 'none' | 'feature' | 'entitlement' | 'quota' | 'workflow'

export interface Task {
  readonly id: string
  readonly project: (typeof projects)[number]['id']
  readonly assignee: Member
  readonly title: string
  readonly owner: string
  readonly budget: string
  readonly secret: string
  readonly source: string
  readonly workflow: 'ready' | 'awaiting-review'
  readonly factsComplete: boolean
  readonly completed: boolean
  readonly revision: string
}

const titles = ['Inspect beacon', 'Survey coastline', 'Document blind spots', 'Approve dispatch']
function initialTasks(): readonly Task[] {
  return projects.flatMap((project) =>
    titles.map((title, index): Task => ({
      id: `${project.id}-task-${String(index + 1)}`,
      project: project.id,
      assignee: index === 1 ? members[1].id : members[0].id,
      title,
      owner: members[1].label,
      budget: '8100',
      secret: 'showcase-synthetic-replacement-seed',
      source: 'task-workspace',
      workflow: index === 3 ? 'awaiting-review' : 'ready',
      factsComplete: index !== 2,
      completed: false,
      revision: 'seed',
    })),
  )
}

export interface ShowcaseState {
  preset: ShowcasePreset
  identity: FixtureIdentity
  organization: Organization
  tasks: readonly Task[]
  latency: number
  projectAccess: boolean
  titleWriteRevoked: ReadonlySet<string>
  titleReadRevoked: ReadonlySet<string>
  fault: Fault
  relationships: RelationshipMode
  block: ExportBlock
  quota: number
  time: number
  approvalExpiresAt: number
  requester: Member
  requestState: 'requestable' | 'pending' | 'effective' | 'rejected'
  share: {
    readonly mode: SharingMode
    readonly recipients: readonly string[]
    readonly expiresAt?: number
    readonly status: 'ready' | 'effective' | 'revoked'
  }
  policyDraft: boolean
  policyRevision: string
  adminRevision: string
  adminConflict: boolean
  grantable: boolean
}

export function initialShowcaseState(preset: ShowcasePreset, time: number): ShowcaseState {
  return {
    preset,
    identity: preset === 1 ? 'anonymous' : members[0].id,
    organization: organizations[0].id,
    tasks: initialTasks(),
    latency: preset === 11 ? 1400 : 0,
    projectAccess: true,
    titleWriteRevoked: new Set(),
    titleReadRevoked: new Set(),
    fault: 'none',
    relationships: preset === 19 ? 'cycle' : 'complete',
    block: preset === 13 ? 'feature' : 'none',
    quota: 2,
    time,
    approvalExpiresAt: time + 10 * 60_000,
    requester: members[0].id,
    requestState: preset === 14 || preset === 15 ? 'pending' : 'requestable',
    share:
      preset === 17
        ? {
            mode: 'organization',
            recipients: [],
            expiresAt: time + 10 * 60_000,
            status: 'effective',
          }
        : { mode: 'private', recipients: [], status: 'ready' },
    policyDraft: preset === 21,
    policyRevision: 'effective-seed',
    adminRevision: 'record-seed',
    adminConflict: preset === 22,
    grantable: true,
  }
}
