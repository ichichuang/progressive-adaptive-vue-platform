import type { LayoutProfileId } from '@platform/design-system'

export interface AdminShellRegionRegistryRecord {
  readonly id: string
  readonly owner: '@platform/ui'
  readonly profileAvailability: readonly LayoutProfileId[]
  readonly requiredProfiles: readonly LayoutProfileId[]
  readonly overlayRelationship:
    | 'none'
    | 'opens-navigation-overlay'
    | 'background-locked-by-navigation-overlay'
    | 'navigation-overlay'
  readonly scrollRelationship:
    | 'outside-route-primary-scroll-owner'
    | 'route-primary-block-and-inline-scroll-owner'
    | 'independent-native-overlay-scroll-with-route-primary-background-lock'
  readonly capabilityStatus: 'ACTIVE'
}

export interface AdminShellRegionRegistry {
  readonly schemaVersion: 1
  readonly records: readonly AdminShellRegionRegistryRecord[]
}

const allProfiles = Object.freeze(['narrow', 'regular', 'wide'] as const)
const persistentProfiles = Object.freeze(['regular', 'wide'] as const)
const narrowProfile = Object.freeze(['narrow'] as const)

export const adminShellRegionRegistry = Object.freeze({
  schemaVersion: 1,
  records: Object.freeze([
    Object.freeze({
      id: 'architecture-console-content',
      owner: '@platform/ui',
      profileAvailability: allProfiles,
      requiredProfiles: allProfiles,
      overlayRelationship: 'background-locked-by-navigation-overlay',
      scrollRelationship: 'route-primary-block-and-inline-scroll-owner',
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'architecture-console-header',
      owner: '@platform/ui',
      profileAvailability: allProfiles,
      requiredProfiles: allProfiles,
      overlayRelationship: 'opens-navigation-overlay',
      scrollRelationship: 'outside-route-primary-scroll-owner',
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'architecture-console-navigation',
      owner: '@platform/ui',
      profileAvailability: persistentProfiles,
      requiredProfiles: persistentProfiles,
      overlayRelationship: 'none',
      scrollRelationship: 'outside-route-primary-scroll-owner',
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'architecture-console-navigation-overlay',
      owner: '@platform/ui',
      profileAvailability: narrowProfile,
      requiredProfiles: narrowProfile,
      overlayRelationship: 'navigation-overlay',
      scrollRelationship: 'independent-native-overlay-scroll-with-route-primary-background-lock',
      capabilityStatus: 'ACTIVE',
    }),
  ]),
} as const satisfies AdminShellRegionRegistry)
