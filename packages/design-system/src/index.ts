export {
  appearancePreferenceSchema,
  colorModePreferenceSchema,
  contrastPreferenceSchema,
  densityPreferenceSchema,
  fontScaleSchema,
  materialPreferenceSchema,
  motionPreferenceSchema,
  uiDensitySchema,
  type AppearancePreference,
  type ColorModePreference,
  type ContrastPreference,
  type DensityPreference,
  type FontScale,
  type MaterialPreference,
  type MotionPreference,
  type UiDensity,
} from './schema/appearance.schema'
export {
  legacySeedThemeDefinitionSchema,
  legacySeedThemeIdSchema,
  type LegacySeedThemeDefinition,
} from './schema/legacy-seed-theme.schema'
export { currentPreferenceSchema, type CurrentPreference } from './schema/preference.schema'
export {
  applyAppearance,
  type AppearanceApplicationTarget,
  type AppearanceAttributeTarget,
  type AppearanceStyleTarget,
  type EffectiveAppearanceState,
} from './runtime/apply-appearance'
export { defaultCurrentPreference } from './runtime/appearance-defaults'
export {
  prepareFirstPaint,
  type FirstPaintApplicationBoundary,
  type FirstPaintResolutionEnvironment,
  type PreparedFirstPaintState,
  type PrepareFirstPaintInput,
} from './runtime/first-paint'
export { migrateToCurrentPreference } from './runtime/preference-migration'
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
