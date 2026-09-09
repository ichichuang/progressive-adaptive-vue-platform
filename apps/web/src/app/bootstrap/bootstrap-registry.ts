export type BootstrapStepId =
  | 'validate-build-and-runtime-configuration'
  | 'install-pre-vue-global-failure-capture'
  | 'initialize-design-system-and-resolve-first-paint-handoff'
  | 'create-vue-application'
  | 'create-pinia'
  | 'install-platform-providers'
  | 'create-and-ready-router'
  | 'create-and-ready-storage'
  | 'create-and-ready-i18n'
  | 'initialize-navigation-preference'
  | 'initialize-workspace-session'
  | 'mount-application'
  | 'register-post-mount-appearance-media-subscriptions'
  | 'publish-application-ready'

type BootstrapFailureClassification =
  'runtime-configuration-failure' | 'application-startup-failure'

interface BootstrapStepRecord {
  readonly id: BootstrapStepId
  readonly dependencies: readonly BootstrapStepId[]
  readonly createInput: string
  readonly createOutput: string
  readonly readyCondition: string
  readonly disposeResponsibility: string
  readonly domMountOwner: boolean
  readonly failureClassification: BootstrapFailureClassification
  readonly retryParticipant: true
  readonly ownFailureEligibleForConfigurationRetry: boolean
  readonly hmrBehavior: string
}

export const bootstrapStepRegistry = [
  {
    id: 'validate-build-and-runtime-configuration',
    dependencies: [],
    createInput:
      'startupAttemptId, AbortSignal, document carrier, compiled build identity, fetch boundary',
    createOutput: 'recursively immutable CoreRuntimeConfiguration and attempt-local load handle',
    readyCondition: 'strict artifact validation and compatibility comparisons complete',
    disposeResponsibility: 'abort in-flight request and release configuration reference',
    domMountOwner: false,
    failureClassification: 'runtime-configuration-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: true,
    hmrBehavior: 'full disposal and complete artifact reread without object reuse',
  },
  {
    id: 'install-pre-vue-global-failure-capture',
    dependencies: ['validate-build-and-runtime-configuration'],
    createInput:
      'validated config, startupAttemptId, startup state accessor, normalizer, capture sink',
    createOutput: 'exact listener references and one idempotent capture disposer',
    readyCondition: 'one window.error and one unhandledrejection listener installed atomically',
    disposeResponsibility: 'remove both global listeners',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'remove old listeners before creating a fresh capture handle',
  },
  {
    id: 'initialize-design-system-and-resolve-first-paint-handoff',
    dependencies: ['install-pre-vue-global-failure-capture'],
    createInput: 'document, exact generated script, private handoff, safety restoration capability',
    createOutput: 'validated no-handoff or custom-theme-reference handoff and safety handle',
    readyCondition: 'complete handoff shape validation before private field removal',
    disposeResponsibility:
      'restore safety on failed startup; otherwise release one-time bridge references',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'never reuse a consumed handoff; reread Package 5 persistence authorities',
  },
  {
    id: 'create-vue-application',
    dependencies: ['initialize-design-system-and-resolve-first-paint-handoff'],
    createInput: 'root component, core error hooks, startupAttemptId',
    createOutput: 'unmounted Vue application and creation handle',
    readyCondition: 'Vue error hooks installed while application remains unmounted',
    disposeResponsibility: 'release unmounted application reference; Mount owns unmount',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'create a fresh Vue application instance',
  },
  {
    id: 'create-pinia',
    dependencies: ['create-vue-application'],
    createInput: 'startupAttemptId',
    createOutput: 'fresh Pinia instance and disposal handle',
    readyCondition: 'Pinia construction complete with no placeholder stores',
    disposeResponsibility: 'call disposePinia exactly once after Vue and provider disposal',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'dispose old Pinia and never retain attempt stores',
  },
  {
    id: 'install-platform-providers',
    dependencies: [
      'initialize-design-system-and-resolve-first-paint-handoff',
      'create-vue-application',
      'create-pinia',
    ],
    createInput: 'Vue application, Pinia, validated handoff, Appearance adapters, media snapshot',
    createOutput: 'exact Pinia and Appearance provider handles',
    readyCondition: 'Pinia installed and one transactional Appearance restoration committed',
    disposeResponsibility: 'release provider handles and compensate failed-startup Appearance',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'dispose providers after unmount and before Pinia; never reuse handles',
  },
  {
    id: 'create-and-ready-router',
    dependencies: [
      'validate-build-and-runtime-configuration',
      'create-vue-application',
      'install-platform-providers',
    ],
    createInput:
      'validated Runtime Configuration, unmounted Vue application, generated routes, exact Router registries, error boundary, startupAttemptId',
    createOutput: 'one Router lifecycle handle with one Router, one Web History and exact removers',
    readyCondition: 'Router installed while unmounted and router.isReady() completed successfully',
    disposeResponsibility: 'remove Router hooks and destroy the exact Web History once',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'dispose and recreate fresh Router and History through the sole Runtime Kernel',
  },
  {
    id: 'create-and-ready-storage',
    dependencies: ['validate-build-and-runtime-configuration', 'install-platform-providers'],
    createInput:
      'validated Runtime Configuration, exact Storage Registry, Storage error normalization boundary, startupAttemptId',
    createOutput:
      'one Storage lifecycle handle with the sole Storage owner, exact BroadcastChannel handle, storage-event fallback listener and one idempotent disposer',
    readyCondition:
      'Storage Registry exact-equality validation succeeds; cross-tab handles created; storage error adapter installed; zero envelope/migration/memory-only records admitted',
    disposeResponsibility:
      'close the BroadcastChannel, remove the storage-event fallback listener idempotently and release Storage owner references',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior:
      'dispose and recreate the Storage owner and cross-tab handles through the sole Runtime Kernel',
  },
  {
    id: 'create-and-ready-i18n',
    dependencies: ['create-vue-application', 'create-and-ready-router', 'create-and-ready-storage'],
    createInput:
      'Vue application, Storage locale preference port, initial route scope and Router title callback',
    createOutput: 'synchronously registered ConsoleI18nHandle and ready readonly language boundary',
    readyCondition:
      'default and restored locale resources ready, one instance installed, document language and route title committed',
    disposeResponsibility:
      'cancel locale work, detach Router, release the official instance and restore document language',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior:
      'dispose after Vue unmount and before Storage, recreate only through the Runtime Kernel',
  },
  {
    id: 'initialize-navigation-preference',
    dependencies: ['create-pinia', 'create-and-ready-storage'],
    createInput:
      'current Pinia, Storage navigation preference port and admitted navigation group IDs',
    createOutput: 'initialized navigation preference Store and disposal handle',
    readyCondition: 'one safe read or nonfatal fallback reconciled before the first Shell render',
    disposeResponsibility:
      'detach the preference port and revoke explicit writes before Storage disposal',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior:
      'release after Vue unmount; initialize a fresh Store only through the Runtime Kernel',
  },
  {
    id: 'initialize-workspace-session',
    dependencies: ['create-pinia', 'create-and-ready-router', 'create-and-ready-storage'],
    createInput: 'current Pinia, ready Router-derived Workspace and Storage Workspace Session port',
    createOutput: 'restored Workspace structure and structural persistence disposer',
    readyCondition:
      'safe read or nonfatal fallback reconciled with the current committed URL before mount',
    disposeResponsibility: 'stop structural persistence before Storage, Router and Pinia disposal',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'dispose after Vue unmount; restore fresh structure through the Runtime Kernel',
  },
  {
    id: 'mount-application',
    dependencies: [
      'create-and-ready-router',
      'create-and-ready-storage',
      'create-and-ready-i18n',
      'initialize-navigation-preference',
      'initialize-workspace-session',
    ],
    createInput: 'ready Vue application and exact #app target',
    createOutput: 'mounted application handle',
    readyCondition: "application.mount('#app') returns and mounted state is confirmed",
    disposeResponsibility: 'idempotently unmount exactly once',
    domMountOwner: true,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'unmount before provider and Pinia disposal',
  },
  {
    id: 'register-post-mount-appearance-media-subscriptions',
    dependencies: ['install-platform-providers', 'mount-application'],
    createInput: 'mounted application, Appearance store, three media queries, reapply adapter',
    createOutput: 'exact listener references and one idempotent unsubscribe handle',
    readyCondition: 'all three Package 5 media listeners installed after mount',
    disposeResponsibility: 'remove all three listeners before Vue unmount',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'withdraw Ready and dispose this first among runtime resources',
  },
  {
    id: 'publish-application-ready',
    dependencies: [
      'validate-build-and-runtime-configuration',
      'mount-application',
      'register-post-mount-appearance-media-subscriptions',
    ],
    createInput: 'startupAttemptId, validated config, mounted application, aggregate handles',
    createOutput: 'private RunningApplicationHandle with one reverse disposer',
    readyCondition: 'atomic starting-to-ready transition and internal startup resolution',
    disposeResponsibility: 'withdraw Ready and release all handles in exact reverse order',
    domMountOwner: false,
    failureClassification: 'application-startup-failure',
    retryParticipant: true,
    ownFailureEligibleForConfigurationRetry: false,
    hmrBehavior: 'sole top-level HMR owner; dispose complete old attempt before fresh startup',
  },
] as const satisfies readonly BootstrapStepRecord[]
