export {
  appearancePreferenceSchema,
  colorModeSchema,
  contrastPreferenceSchema,
  densityPreferenceSchema,
  fontScaleSchema,
  motionPreferenceSchema,
  uiDensitySchema,
  type AppearancePreference,
  type ColorMode,
  type DensityPreference,
  type FontScale,
  type MotionPreference,
  type UiDensity,
} from './schema/appearance.schema'
export { themeDefinitionSchema, themeIdSchema, type ThemeDefinition } from './schema/theme.schema'
export { userPreferenceSchema, type UserPreference } from './schema/preference.schema'
export { tokenNames, type TokenName } from './generated/token-names'
export { tokens } from './generated/tokens'
export { platformPreset } from './unocss/preset'
