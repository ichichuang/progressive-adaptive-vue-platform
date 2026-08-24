import {
  layoutRegistry,
  type LayoutProfileId,
  type LayoutRegistryRecord,
  type LayoutTokenId,
} from '@platform/design-system'

import { adminShellLayoutPolicyRegistry } from '../internal/layout/admin-shell-layout-policy-registry'
import { adminShellRegionRegistry } from '../internal/layout/admin-shell-region-registry'

export interface ResponsiveLayoutThresholdReference {
  readonly tokenId: LayoutTokenId
  readonly resolvedValue: string
}

export interface ResponsiveLayoutProfileRecord {
  readonly id: LayoutProfileId
  readonly minimumInclusive: ResponsiveLayoutThresholdReference | null
  readonly maximumExclusive: ResponsiveLayoutThresholdReference | null
}

export interface ResponsiveLayoutSizeTokenRecord {
  readonly tokenId: LayoutTokenId
  readonly resolvedValue: string
}

export interface ResponsiveLayoutConsoleProjection {
  readonly schemaVersion: 1
  readonly profileThresholdPolicyId: 'layout-profile.architecture-admin-console'
  readonly profiles: readonly ResponsiveLayoutProfileRecord[]
  readonly shellRegionIds: readonly string[]
  readonly sizeTokens: readonly ResponsiveLayoutSizeTokenRecord[]
  readonly minimumTargetPolicyId: 'target-size.enhanced-44'
  readonly safeAreaPolicyId: 'safe-area.viewport-insets'
}

function layoutRecord(id: LayoutTokenId): LayoutRegistryRecord {
  const record = layoutRegistry.records.find((candidate) => candidate.id === id)

  if (record === undefined) {
    throw new TypeError(`${id}: Responsive Layout projection source is missing.`)
  }

  return record
}

function thresholdReference(id: LayoutTokenId): ResponsiveLayoutThresholdReference {
  const record = layoutRecord(id)
  return Object.freeze({ tokenId: record.id, resolvedValue: record.resolvedValue })
}

const regularMinimum = thresholdReference('layout.profile.regular.min-inline-size')
const wideMinimum = thresholdReference('layout.profile.wide.min-inline-size')
const profilePolicy = adminShellLayoutPolicyRegistry.profileThresholdPolicies[0]
const minimumTargetPolicy = adminShellLayoutPolicyRegistry.minimumTargetPolicies[0]
const safeAreaPolicy = adminShellLayoutPolicyRegistry.safeAreaPolicies[0]

if (
  profilePolicy === undefined ||
  minimumTargetPolicy === undefined ||
  safeAreaPolicy === undefined
) {
  throw new TypeError('The Responsive Layout policy projection is incomplete.')
}

const sizeTokenIds = [
  'layout.admin.content.minimum-inline-size',
  'layout.admin.drawer.maximum-inline-size',
  'layout.admin.header.block-size',
  'layout.admin.sidebar.expanded-inline-size',
  'layout.admin.sidebar.rail-inline-size',
  'layout.target.enhanced.minimum-block-size',
  'layout.target.enhanced.minimum-inline-size',
] as const satisfies readonly LayoutTokenId[]

export const responsiveLayoutConsoleProjection = Object.freeze({
  schemaVersion: 1,
  profileThresholdPolicyId: profilePolicy.id,
  profiles: Object.freeze([
    Object.freeze({ id: 'narrow', minimumInclusive: null, maximumExclusive: regularMinimum }),
    Object.freeze({
      id: 'regular',
      minimumInclusive: regularMinimum,
      maximumExclusive: wideMinimum,
    }),
    Object.freeze({ id: 'wide', minimumInclusive: wideMinimum, maximumExclusive: null }),
  ]),
  shellRegionIds: Object.freeze(adminShellRegionRegistry.records.map((record) => record.id)),
  sizeTokens: Object.freeze(
    sizeTokenIds.map((id) => {
      const record = layoutRecord(id)
      return Object.freeze({ tokenId: record.id, resolvedValue: record.resolvedValue })
    }),
  ),
  minimumTargetPolicyId: minimumTargetPolicy.id,
  safeAreaPolicyId: safeAreaPolicy.id,
} as const satisfies ResponsiveLayoutConsoleProjection)
