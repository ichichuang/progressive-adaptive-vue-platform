export type BootstrapStepId =
  | 'validate-build-and-runtime-configuration'
  | 'install-pre-vue-global-failure-capture'
  | 'initialize-design-system-and-resolve-first-paint-handoff'
  | 'create-vue-application'
  | 'create-pinia'
  | 'install-platform-providers'
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
    id: 'mount-application',
    dependencies: ['install-platform-providers'],
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
