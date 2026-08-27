import tokenManifest from '../generated/tokens.manifest.json' with { type: 'json' }
import { contrastPreferenceValues, materialPreferenceValues } from '../schema/appearance.schema'
import { builtInThemeIds } from '../schema/complete-theme.schema'

export interface DesignSystemConsoleProjection {
  readonly schemaVersion: 1
  readonly publicRoleCount: 37
  readonly publicColorRoleCount: 10
  readonly builtInThemeIds: readonly string[]
  readonly planeIds: readonly string[]
  readonly contrastValues: readonly string[]
  readonly materialValues: readonly string[]
  readonly manifestSchemaVersion: 9
  readonly manifestRecordCount: 252
}

const firstTheme = tokenManifest.themes[0]

if (firstTheme === undefined) {
  throw new TypeError('The Design System Console projection requires a built-in Theme.')
}

const planeIds = Object.entries(firstTheme.planes).flatMap(([colorMode, contrasts]) =>
  Object.keys(contrasts).map((contrast) => `${colorMode}.${contrast}`),
)
const publicColorRoleCount = tokenManifest.activePublicRoles.filter(
  (record) => record.tokenType === 'color',
).length

if (
  tokenManifest.activePublicRoles.length !== 37 ||
  publicColorRoleCount !== 10 ||
  tokenManifest.schemaVersion !== 9 ||
  tokenManifest.governance.recordCount !== 252
) {
  throw new TypeError('The Design System Console projection source is incomplete.')
}

export const designSystemConsoleProjection = Object.freeze({
  schemaVersion: 1,
  publicRoleCount: tokenManifest.activePublicRoles.length,
  publicColorRoleCount,
  builtInThemeIds: Object.freeze([...builtInThemeIds]),
  planeIds: Object.freeze(planeIds),
  contrastValues: Object.freeze([...contrastPreferenceValues]),
  materialValues: Object.freeze([...materialPreferenceValues]),
  manifestSchemaVersion: tokenManifest.schemaVersion,
  manifestRecordCount: tokenManifest.governance.recordCount,
} as const satisfies DesignSystemConsoleProjection)
