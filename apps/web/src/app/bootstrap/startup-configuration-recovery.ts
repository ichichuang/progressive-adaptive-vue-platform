import { runtimeConfigurationFailureCauses } from '../config/runtime-configuration-contract'

export const startupConfigurationRecoveryPolicy = Object.freeze({
  id: 'startup-configuration-recovery',
  owner: 'runtime-kernel',
  trigger: 'user-action-only',
  maximumRetriesPerDocument: 1,
  totalAttempts: 2,
  eligibleError: 'runtime-configuration-failure',
  eligibleCauses: runtimeConfigurationFailureCauses,
  retryStateStorage: 'document-memory-only',
  automaticRetry: false,
  automaticReload: false,
  timer: false,
  backoff: false,
  polling: false,
  storageClearing: false,
} as const)
