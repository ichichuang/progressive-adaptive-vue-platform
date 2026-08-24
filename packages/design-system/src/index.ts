export {
  colorModePreferenceSchema,
  contrastPreferenceSchema,
  densityPreferenceSchema,
  fontScaleSchema,
  materialPreferenceSchema,
  motionPreferenceSchema,
  uiDensitySchema,
  fontScaleValues,
  type ColorModePreference,
  type ContrastPreference,
  type DensityPreference,
  type FontScale,
  type MaterialPreference,
  type MotionPreference,
  type UiDensity,
} from './schema/appearance.schema'
export { builtInThemeIds } from './schema/complete-theme.schema'
export {
  explicitThemePreferenceSchema,
  type ExplicitThemePreference,
  type ThemeReference,
} from './schema/preference.schema'
export { ProductPreferenceDefault } from './runtime/appearance-defaults'
export { applyAppearance, type EffectiveAppearanceState } from './runtime/apply-appearance'
export {
  migrateToExplicitThemePreference,
  type PreferenceMigrationResult,
} from './runtime/preference-migration'
export { resolveColorMode, type EffectiveColorMode } from './runtime/resolve-color-mode'
export { resolveMaterial, type EffectiveMaterial } from './runtime/resolve-material'
export {
  installCustomThemeBank,
  resolveThemeReference,
  validateCustomThemeDefinition,
  type CustomThemeRegistryEntry,
  type CustomThemeValidationResult,
  type ThemeBankInstallationResult,
  type ThemeReferenceResolutionResult,
  type ThemeRegistryEntry,
} from './runtime/theme-registry'
export { tokenNames, type TokenName } from './generated/token-names'
export { tokens } from './generated/tokens'
export {
  layoutRegistry,
  type LayoutProfileId,
  type LayoutRegistry,
  type LayoutRegistryRecord,
  type LayoutTokenId,
} from './generated/layout-registry'
export { platformPreset } from './unocss/preset'
export {
  designSystemConsoleProjection,
  type DesignSystemConsoleProjection,
} from './console/design-system-console-projection'
