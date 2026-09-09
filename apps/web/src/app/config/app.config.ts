export const applicationConfig = {
  scroll: {
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
