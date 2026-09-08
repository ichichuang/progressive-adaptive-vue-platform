export const applicationConfig = {
  navigation: { preferenceStorageKey: 'pavp:web:navigation-preference' },
  localization: { preferenceStorageKey: 'pavp:web:locale-preference' },
  appearance: {
    customThemeRegistryStorageKey: 'pavp:web:custom-theme-registry',
    preferenceStorageKey: 'pavp:web:user-preference',
  },
} as const
