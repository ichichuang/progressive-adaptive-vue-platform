import {
  designSystemConsoleProjection,
  type DesignSystemConsoleProjection,
} from '@platform/design-system'
import {
  responsiveLayoutConsoleProjection,
  uiSystemConsoleProjection,
  type ResponsiveLayoutConsoleProjection,
  type UiSystemConsoleProjection,
} from '@platform/ui'

import { capabilityManifest, type CapabilityManifest } from '../../generated/capability-manifest'
import { engineeringManifest, type EngineeringManifest } from '../../generated/engineering-manifest'
import {
  runtimeKernelConsoleProjection,
  type RuntimeKernelConsoleProjection,
} from '../bootstrap/runtime-kernel-console-projection'
import {
  routerConsoleProjection,
  type RouterConsoleProjection,
} from '../router/router-console-projection'
import {
  storageConsoleProjection,
  type StorageConsoleProjection,
} from '../storage/storage-console-projection'

export interface OverviewProjection {
  readonly schemaVersion: 1
  readonly designSystem: DesignSystemConsoleProjection
  readonly runtimeKernel: RuntimeKernelConsoleProjection
  readonly router: RouterConsoleProjection
  readonly storage: StorageConsoleProjection
  readonly uiSystem: UiSystemConsoleProjection
  readonly responsiveLayout: ResponsiveLayoutConsoleProjection
  readonly engineering: EngineeringManifest
  readonly capabilities: CapabilityManifest
}

export const overviewProjection = Object.freeze({
  schemaVersion: 1,
  designSystem: designSystemConsoleProjection,
  runtimeKernel: runtimeKernelConsoleProjection,
  router: routerConsoleProjection,
  storage: storageConsoleProjection,
  uiSystem: uiSystemConsoleProjection,
  responsiveLayout: responsiveLayoutConsoleProjection,
  engineering: engineeringManifest,
  capabilities: capabilityManifest,
} as const satisfies OverviewProjection)
