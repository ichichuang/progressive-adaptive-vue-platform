export const applicationConfig = {
  forms: {
    draftStorageKey: 'pavp:web:form-drafts',
    builderDraftMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  browserPage: { sessionStorageKey: 'pavp:web:browser-page-session' },
  scroll: {
    shellStorageKey: 'pavp:web:shell-scroll',
    preferenceStorageKey: 'pavp:web:scroll-preference',
    refreshSessionStorageKey: 'pavp:web:scroll-refresh-session',
  },
  workspace: { sessionStorageKey: 'pavp:web:workspace-session' },
  navigation: { preferenceStorageKey: 'pavp:web:navigation-preference' },
  localization: { preferenceStorageKey: 'pavp:web:locale-preference' },
  appearance: {
    customThemeRegistryStorageKey: 'pavp:web:custom-theme-registry',
    preferenceStorageKey: 'pavp:web:user-preference',
  },
} as const
