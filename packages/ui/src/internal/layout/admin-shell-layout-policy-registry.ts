export interface LayoutProfileThresholdPolicyRecord {
  readonly id: string
  readonly containerName: string
  readonly containerType: 'inline-size'
  readonly measurementAxis: 'inline'
  readonly resolverOwner: string
  readonly observerOwner: string
  readonly regularMinimumTokenId: string
  readonly wideMinimumTokenId: string
  readonly profileOrder: readonly ['narrow', 'regular', 'wide']
  readonly capabilityStatus: 'ACTIVE'
}

export interface MinimumTargetPolicyRecord {
  readonly id: string
  readonly minimumInlineSizeTokenId: string
  readonly minimumBlockSizeTokenId: string
  readonly appliesTo: readonly string[]
  readonly inlineTextLinkException: true
  readonly densityReductionAllowed: false
  readonly capabilityStatus: 'ACTIVE'
}

export interface SafeAreaPolicyRecord {
  readonly id: string
  readonly owner: string
  readonly insetSource: 'env-safe-area-insets'
  readonly childConsumption: 'private-shell-layout-variables-only'
  readonly progressiveFallback: 'zero'
  readonly negativeOffsetAllowed: false
  readonly capabilityStatus: 'ACTIVE'
}

export interface AdminShellLayoutPolicyRegistry {
  readonly schemaVersion: 1
  readonly profileThresholdPolicies: readonly LayoutProfileThresholdPolicyRecord[]
  readonly minimumTargetPolicies: readonly MinimumTargetPolicyRecord[]
  readonly safeAreaPolicies: readonly SafeAreaPolicyRecord[]
}

export const adminShellLayoutPolicyRegistry = Object.freeze({
  schemaVersion: 1,
  profileThresholdPolicies: Object.freeze([
    Object.freeze({
      id: 'layout-profile.architecture-admin-console',
      containerName: 'pavp-admin-shell',
      containerType: 'inline-size',
      measurementAxis: 'inline',
      resolverOwner: 'packages/ui/src/internal/layout/resolve-admin-shell-profile.ts',
      observerOwner: 'UiAdminShell',
      regularMinimumTokenId: 'layout.profile.regular.min-inline-size',
      wideMinimumTokenId: 'layout.profile.wide.min-inline-size',
      profileOrder: Object.freeze(['narrow', 'regular', 'wide'] as const),
      capabilityStatus: 'ACTIVE',
    }),
  ]),
  minimumTargetPolicies: Object.freeze([
    Object.freeze({
      id: 'target-size.enhanced-44',
      minimumInlineSizeTokenId: 'layout.target.enhanced.minimum-inline-size',
      minimumBlockSizeTokenId: 'layout.target.enhanced.minimum-block-size',
      appliesTo: Object.freeze([
        'custom-action',
        'custom-drawer-action',
        'custom-header-action',
        'custom-icon-action',
        'custom-navigation-item',
        'custom-setting-control',
      ]),
      inlineTextLinkException: true,
      densityReductionAllowed: false,
      capabilityStatus: 'ACTIVE',
    }),
  ]),
  safeAreaPolicies: Object.freeze([
    Object.freeze({
      id: 'safe-area.viewport-insets',
      owner: 'UiAdminShell',
      insetSource: 'env-safe-area-insets',
      childConsumption: 'private-shell-layout-variables-only',
      progressiveFallback: 'zero',
      negativeOffsetAllowed: false,
      capabilityStatus: 'ACTIVE',
    }),
  ]),
} as const satisfies AdminShellLayoutPolicyRegistry)
