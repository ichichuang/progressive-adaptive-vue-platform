import type { ConsoleMessageKey } from '../../shared/i18n'
import type { DraftSessionStatus } from './use-draft-session'

export const formDraftStatusMessages = {
  empty: 'formBuilder.draftEmpty',
  available: 'formBuilder.draftAvailable',
  restored: 'formBuilder.draftRestored',
  saved: 'formBuilder.draftSaved',
  changed: 'formBuilder.draftChanged',
  cleared: 'formBuilder.draftCleared',
  unavailable: 'formDraft.unavailable',
  invalid: 'formBuilder.draftInvalid',
  expired: 'formBuilder.draftExpired',
  incompatible: 'formBuilder.draftIncompatible',
  conflict: 'formBuilder.draftConflict',
} as const satisfies Record<DraftSessionStatus, ConsoleMessageKey>
