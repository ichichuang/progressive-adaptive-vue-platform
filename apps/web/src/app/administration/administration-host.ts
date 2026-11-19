import type { UiLocale, UiTablePage, UiTableQuery, UiTableReadonlyRecord } from '@platform/ui'
import type {
  AccessBoundary,
  AccessContextSnapshot,
  AccessProvider,
  AccessRequest,
  AccessProposal,
} from '../access/access-contract'
import type { GuardedAction, ActionTarget } from '../access/guarded-action'
import type { AccessRequirement } from '../access/native-requirement'
import type { createScopedApiRead } from '../api/scoped-api-read'
import type { useGuardedTable } from '../tables/use-guarded-table'
import type { AccessRequestInteractionHost, SharingHost } from '../access/advanced-interactions'
import type { AdministrationModule } from './administration-routes'

type AdministrationCommandKind =
  | 'invite'
  | 'remove-member'
  | 'disable-account'
  | 'move-group'
  | 'set-direct-rule'
  | 'remove-direct-rule'
  | 'set-parent-role'
  | 'remove-direct-relation'
  | 'save'
  | 'publish'
  | 'reconcile'

interface AdministrationDelta {
  readonly target: ActionTarget
  readonly values: AccessProposal['values']
}

export interface AdministrationCommand {
  readonly kind: AdministrationCommandKind
  readonly label: string
  readonly input?: {
    readonly label: string
    readonly choices?: readonly string[]
    readonly writeAction: string
  }
  readonly action: GuardedAction<unknown>
  /** Rechecked with the captured revision and proposal on each guarded preflight. */
  grantable(delta: AdministrationDelta, context: AccessContextSnapshot): boolean
}

export interface AdministrationSimulation {
  readonly requirement: AccessRequirement
  readonly subjects: readonly { readonly id: string; readonly label: string }[]
  /** The host returns an authorized immutable snapshot and a fresh provider for this invocation. */
  prepare(
    input: {
      readonly subjectId: string
      readonly context: AccessContextSnapshot
      readonly target: ActionTarget
      readonly request: AccessRequest
    },
    signal: AbortSignal,
  ): Promise<
    | {
        readonly provider: AccessProvider
        readonly context: AccessContextSnapshot
      }
    | undefined
  >
  request(row: UiTableReadonlyRecord): AccessRequest | undefined
}

export interface AdministrationModuleHost {
  readonly domain: string
  readonly resource: string
  readonly scope: AccessRequirement['scope']
  readonly read: Parameters<typeof createScopedApiRead<UiTablePage>>[1]
  readonly recordRead: string
  readonly completeness: 'complete' | 'partial'
  /** Optional presentation of the host's own labels, without changing record or command values. */
  displayText?(value: string, locale: UiLocale): string
  readonly projection: NonNullable<Parameters<typeof useGuardedTable>[0]['fields']>
  readonly query: (
    value: UiTableQuery,
  ) => Parameters<ReturnType<typeof createScopedApiRead<UiTablePage>>['run']>[0]
  readonly commands?: readonly AdministrationCommand[]
  readonly export?: {
    readonly requirement: AccessRequirement
    readonly fields: readonly string[]
  }
  sharing?(row: UiTableReadonlyRecord): SharingHost | undefined
  review?(row: UiTableReadonlyRecord): AccessRequestInteractionHost | undefined
  readonly simulation?: AdministrationSimulation
}

export type AdministrationHost = Readonly<
  Partial<Record<AdministrationModule, AdministrationModuleHost>>
>

export function administrationAction(
  access: AccessBoundary,
  command: AdministrationCommand,
  isCurrent: () => boolean,
): GuardedAction<unknown> {
  return {
    ...command.action,
    isTargetCurrent(target) {
      return isCurrent() && command.action.isTargetCurrent(target)
    },
    businessAllows(target) {
      const current = access.readContext()
      return (
        isCurrent() &&
        current.status === 'ready' &&
        command.action.businessAllows(target) &&
        command.grantable({ target, values: target.proposal?.values ?? {} }, current.snapshot)
      )
    },
  }
}
