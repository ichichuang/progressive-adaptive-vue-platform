import tokenManifest from '../generated/tokens.manifest.json' with { type: 'json' }
import { contrastPreferenceValues, materialPreferenceValues } from '../schema/appearance.schema'
import { builtInThemeIds } from '../schema/complete-theme.schema'

export interface DesignSystemConsoleProjection {
  readonly schemaVersion: 1
  readonly publicRoleCount: 36
  readonly publicColorRoleCount: 9
  readonly builtInThemeIds: readonly string[]
  readonly planeIds: readonly string[]
  readonly contrastValues: readonly string[]
  readonly materialValues: readonly string[]
  readonly manifestSchemaVersion: 8
  readonly manifestRecordCount: 231
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
  tokenManifest.activePublicRoles.length !== 36 ||
  publicColorRoleCount !== 9 ||
  tokenManifest.schemaVersion !== 8 ||
  tokenManifest.governance.recordCount !== 231
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
