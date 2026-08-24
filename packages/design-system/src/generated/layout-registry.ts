/* Generated file. Do not edit directly. */
export type LayoutProfileId = 'narrow' | 'regular' | 'wide'

export type LayoutTokenId =
  | 'layout.admin.content.minimum-inline-size'
  | 'layout.admin.drawer.maximum-inline-size'
  | 'layout.admin.header.block-size'
  | 'layout.admin.sidebar.expanded-inline-size'
  | 'layout.admin.sidebar.rail-inline-size'
  | 'layout.profile.regular.min-inline-size'
  | 'layout.profile.wide.min-inline-size'
  | 'layout.target.enhanced.minimum-block-size'
  | 'layout.target.enhanced.minimum-inline-size'

export interface LayoutRegistryRecord {
  readonly id: LayoutTokenId
  readonly kind: 'profile-threshold' | 'shell-size' | 'content-size' | 'minimum-target'
  readonly resolvedValue: string
  readonly cssVariable: `--ui-layout-${string}`
}

export interface LayoutRegistry {
  readonly schemaVersion: 1
  readonly records: readonly LayoutRegistryRecord[]
}

export const layoutRegistry = {
  schemaVersion: 1,
  records: [
    {
      id: 'layout.admin.content.minimum-inline-size',
      kind: 'content-size',
      resolvedValue: '20rem',
      cssVariable: '--ui-layout-admin-content-minimum-inline-size',
    },
    {
      id: 'layout.admin.drawer.maximum-inline-size',
      kind: 'shell-size',
      resolvedValue: '20rem',
      cssVariable: '--ui-layout-admin-drawer-maximum-inline-size',
    },
    {
      id: 'layout.admin.header.block-size',
      kind: 'shell-size',
      resolvedValue: '3.5rem',
      cssVariable: '--ui-layout-admin-header-block-size',
    },
    {
      id: 'layout.admin.sidebar.expanded-inline-size',
      kind: 'shell-size',
      resolvedValue: '16rem',
      cssVariable: '--ui-layout-admin-sidebar-expanded-inline-size',
    },
    {
      id: 'layout.admin.sidebar.rail-inline-size',
      kind: 'shell-size',
      resolvedValue: '4rem',
      cssVariable: '--ui-layout-admin-sidebar-rail-inline-size',
    },
    {
      id: 'layout.profile.regular.min-inline-size',
      kind: 'profile-threshold',
      resolvedValue: '48rem',
      cssVariable: '--ui-layout-profile-regular-min-inline-size',
    },
    {
      id: 'layout.profile.wide.min-inline-size',
      kind: 'profile-threshold',
      resolvedValue: '80rem',
      cssVariable: '--ui-layout-profile-wide-min-inline-size',
    },
    {
      id: 'layout.target.enhanced.minimum-block-size',
      kind: 'minimum-target',
      resolvedValue: '44px',
      cssVariable: '--ui-layout-target-enhanced-minimum-block-size',
    },
    {
      id: 'layout.target.enhanced.minimum-inline-size',
      kind: 'minimum-target',
      resolvedValue: '44px',
      cssVariable: '--ui-layout-target-enhanced-minimum-inline-size',
    },
  ],
} as const satisfies LayoutRegistry
