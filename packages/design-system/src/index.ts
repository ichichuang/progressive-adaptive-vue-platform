export {
  appearancePreferenceV2Schema,
  colorModePreferenceSchema,
  contrastPreferenceSchema,
  densityPreferenceSchema,
  fontScaleSchema,
  materialPreferenceSchema,
  motionPreferenceSchema,
  uiDensitySchema,
  type AppearancePreferenceV2,
  type ColorModePreference,
  type ContrastPreference,
  type DensityPreference,
  type FontScale,
  type MaterialPreference,
  type MotionPreference,
  type UiDensity,
} from './schema/appearance.schema'
export { themeDefinitionSchema, themeIdSchema, type ThemeDefinition } from './schema/theme.schema'
export { userPreferenceV2Schema, type UserPreferenceV2 } from './schema/preference.schema'
export {
  applyAppearance,
  type AppearanceAttributeTarget,
  type EffectiveAppearanceState,
} from './runtime/apply-appearance'
export { defaultUserPreferenceV2 } from './runtime/appearance-defaults'
export {
  prepareFirstPaint,
  type FirstPaintApplicationBoundary,
  type FirstPaintResolutionEnvironment,
  type PreparedFirstPaintState,
  type PrepareFirstPaintInput,
} from './runtime/first-paint'
export { upgradeUserPreference } from './runtime/preference-schema-upgrades'
export {
  resolveColorMode,
  type EffectiveColorMode,
  type ResolveColorModeInput,
} from './runtime/resolve-color-mode'
export {
  resolveMaterial,
  type EffectiveMaterial,
  type ResolveMaterialInput,
} from './runtime/resolve-material'
export { tokenNames, type TokenName } from './generated/token-names'
export { tokens } from './generated/tokens'
export { platformPreset } from './unocss/preset'
