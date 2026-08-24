import { uiPublicComponentRegistry } from '../registry/ui-public-component-registry'

export interface UiSystemConsoleStyledVendor {
  readonly packageName: 'naive-ui'
  readonly coordinate: 'naive-ui@2.45.2'
}

export interface UiSystemConsoleProjection {
  readonly schemaVersion: 1
  readonly publicComponentIds: readonly string[]
  readonly styledVendor: UiSystemConsoleStyledVendor
  readonly privateAdapterPolicyId: 'ui-vendor-imports.private-naive-adapter-only'
}

export const uiSystemConsoleProjection = Object.freeze({
  schemaVersion: 1,
  publicComponentIds: Object.freeze(uiPublicComponentRegistry.records.map((record) => record.id)),
  styledVendor: Object.freeze({
    packageName: 'naive-ui',
    coordinate: 'naive-ui@2.45.2',
  }),
  privateAdapterPolicyId: 'ui-vendor-imports.private-naive-adapter-only',
} as const satisfies UiSystemConsoleProjection)
