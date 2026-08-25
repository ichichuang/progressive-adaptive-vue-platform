import { readFileSync } from 'node:fs'

import type { Format } from 'style-dictionary/types'

import { ProductPreferenceDefault } from '../../runtime/appearance-defaults'
import { colorModeResolutionContract } from '../../runtime/resolve-color-mode'
import { materialResolutionContract } from '../../runtime/resolve-material'
import {
  colorModePreferenceValues,
  contrastPreferenceValues,
  fontScaleValues,
  legacyColorModePreferenceValues,
  materialPreferenceValues,
  motionPreferenceValues,
  uiDensityValues,
} from '../../schema/appearance.schema'
import {
  legacyBuiltInThemeIds,
  legacySeedThemeIdPattern,
} from '../../schema/legacy-seed-theme.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import {
  canonicalLayerOrder,
  formatAppearanceBaseCss,
  formatForcedColorsCss,
  formatThemeBankCss,
} from './css'
import { generatedNotice, requireBuildResult, resolvedCssValue, type FormatContext } from './shared'
import { themeRegistryDocument } from './typescript'

export const preInitializationSafetyBaseline = {
  effectiveColorMode: 'light',
  effectiveTheme: {
    registryKind: 'built-in',
    themeId: 'iris',
  },
  effectiveContrast: 'standard',
  effectiveMaterial: 'solid',
  effectiveDensity: 'comfortable',
} as const

const colorJsPolicyUnsafeExportName = ['multiply_v', '3_m3x3'].join('')
const declaredColorJsRuntime = readFileSync(
  new URL(import.meta.resolve('colorjs.io/dist/color.global.min.js')),
  'utf8',
)
  .replace(/\n?\/\/# sourceMappingURL=.*$/u, '')
  .trimEnd()
const embeddedColorJsRuntime = declaredColorJsRuntime.replace(
  colorJsPolicyUnsafeExportName,
  'multiplyVectorByMatrix3',
)

if (
  !embeddedColorJsRuntime.startsWith('var Color=') ||
  declaredColorJsRuntime.split(colorJsPolicyUnsafeExportName).length !== 2 ||
  embeddedColorJsRuntime.includes(colorJsPolicyUnsafeExportName)
) {
  throw new Error('The declared Color.js classic runtime has an unexpected shape.')
}

function criticalDeclarations(result: TokenBuildResult): string {
  const materialNames = [
    ...new Set(
      result.tokens
        .filter(
          (token) =>
            token.tier === 'semantic.material' &&
            token.visibility === 'ui-internal' &&
            token.type === 'color',
        )
        .map((token) => token.role.name),
    ),
  ].sort(compareCodePoints)
  const declarations = materialNames.map((name) => {
    const matches = result.tokens.filter(
      (token) =>
        token.role.name === name &&
        Object.keys(token.conditions).length === 1 &&
        token.conditions.material === 'solid',
    )

    if (matches.length !== 1 || matches[0]?.cssVariable === undefined) {
      throw new Error(`${name}: critical theme requires exactly one Solid Material record.`)
    }

    return `    ${matches[0].cssVariable}: ${resolvedCssValue(matches[0], result)};`
  })

  declarations.push(`    --ui-font-scale: ${String(ProductPreferenceDefault.fontScale)};`)
  return declarations.join('\n')
}

export function formatCriticalThemeCss(result: TokenBuildResult): string {
  return `/* ${generatedNotice} */
${canonicalLayerOrder}

@layer tokens {
  :root {
${criticalDeclarations(result)}
  }

${formatThemeBankCss(result)}
}

${formatForcedColorsCss()}

${formatAppearanceBaseCss()}
`
}

export function createCriticalThemeFormat(context: FormatContext): Format {
  return {
    name: 'pavp/css/critical-theme',
    format: () => formatCriticalThemeCss(requireBuildResult(context)),
  }
}

function javascriptString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

function javascriptLiteral(value: unknown, indentation = 0): string {
  if (typeof value === 'string') {
    return javascriptString(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => javascriptLiteral(item, indentation)).join(', ')}]`
  }

  if (typeof value === 'object') {
    const padding = ' '.repeat(indentation)
    const properties = Object.entries(value)
      .map(
        ([key, propertyValue]) =>
          `${padding}  ${key}: ${javascriptLiteral(propertyValue, indentation + 2)},`,
      )
      .join('\n')

    return `{\n${properties}\n${padding}}`
  }

  throw new Error('Unsupported generated JavaScript literal.')
}

function safetyBaselineRestorationLines(): string {
  return [
    `    root.setAttribute('data-color-mode', ${javascriptString(preInitializationSafetyBaseline.effectiveColorMode)})`,
    `    root.setAttribute('data-theme-kind', ${javascriptString(preInitializationSafetyBaseline.effectiveTheme.registryKind)})`,
    `    root.setAttribute('data-theme', ${javascriptString(preInitializationSafetyBaseline.effectiveTheme.themeId)})`,
    `    root.setAttribute('data-contrast', ${javascriptString(preInitializationSafetyBaseline.effectiveContrast)})`,
    `    root.setAttribute('data-material', ${javascriptString(preInitializationSafetyBaseline.effectiveMaterial)})`,
    `    root.setAttribute('data-density', ${javascriptString(preInitializationSafetyBaseline.effectiveDensity)})`,
  ].join('\n')
}

export function formatAppearanceInitScript(result: TokenBuildResult): string {
  const registry = themeRegistryDocument(result)

  return `/* ${generatedNotice} */
// prettier-ignore
;(function () {
  'use strict'

  /* Embedded from the declared Color.js dependency for exact legacy-schema parity. */
  ${embeddedColorJsRuntime}

  var colorModes = ${javascriptLiteral(colorModePreferenceValues)}
  var legacyColorModes = ${javascriptLiteral(legacyColorModePreferenceValues)}
  var contrasts = ${javascriptLiteral(contrastPreferenceValues)}
  var materials = ${javascriptLiteral(materialPreferenceValues)}
  var densities = ${javascriptLiteral(uiDensityValues)}
  var fontScales = ${javascriptLiteral(fontScaleValues)}
  var motions = ${javascriptLiteral(motionPreferenceValues)}
  var builtInThemeIds = ${javascriptLiteral(registry.builtInRegistryOrder)}
  var retiredBuiltInThemeIds = ${javascriptLiteral(legacyBuiltInThemeIds)}
  var defaultBuiltInThemeId = ${javascriptString(ProductPreferenceDefault.theme.themeId)}
  var legacyBuiltInThemeTuples = ${javascriptLiteral(registry.legacyBuiltInThemeTuples, 2)}
  var customBankVariables = ${javascriptLiteral(registry.customBankVariables)}
  var appearanceAttributeNames = ${javascriptLiteral([
    'data-color-mode',
    'data-theme-kind',
    'data-theme',
    'data-contrast',
    'data-material',
    'data-density',
    'data-motion',
  ])}
  var legacySeedThemeIdPattern = new RegExp(${javascriptString(legacySeedThemeIdPattern.source)}, 'u')
  var colorModeContract = ${javascriptLiteral(colorModeResolutionContract, 2)}
  var materialContract = ${javascriptLiteral(materialResolutionContract, 2)}

  function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  function compareCodePoints(left, right) {
    return left < right ? -1 : left > right ? 1 : 0
  }

  function hasOnlyKeys(value, expectedKeys) {
    if (!isRecord(value)) {
      return false
    }

    var actualKeys = Object.keys(value).sort(compareCodePoints)
    var sortedExpectedKeys = expectedKeys.slice().sort(compareCodePoints)
    return actualKeys.join('\\n') === sortedExpectedKeys.join('\\n')
  }

  function includes(values, value) {
    return values.indexOf(value) !== -1
  }

  function isCssColor(value) {
    if (typeof value !== 'string') {
      return false
    }

    try {
      new Color(value)
      return true
    } catch {
      return false
    }
  }

  function isPalette(value) {
    return (
      hasOnlyKeys(value, ['accent', 'brand', 'neutral']) &&
      isCssColor(value.accent) &&
      isCssColor(value.brand) &&
      includes(['cool', 'neutral', 'warm'], value.neutral)
    )
  }

  function isDensity(value) {
    return (
      hasOnlyKeys(value, ['preset', 'scale']) &&
      includes(densities, value.preset) &&
      typeof value.scale === 'number' &&
      Number.isFinite(value.scale) &&
      value.scale >= 0.9 &&
      value.scale <= 1.15 &&
      Math.abs(value.scale * 20 - Math.round(value.scale * 20)) < 0.0000001
    )
  }

  function isThemeReference(value) {
    if (!hasOnlyKeys(value, ['registryKind', 'themeId'])) {
      return false
    }

    if (value.registryKind === 'built-in') {
      return includes(builtInThemeIds, value.themeId)
    }

    return value.registryKind === 'custom' && typeof value.themeId === 'string' && value.themeId.length > 0
  }

  function isExplicitAppearance(value, themeReferenceValidator) {
    return (
      hasOnlyKeys(value, [
        'colorMode',
        'contrast',
        'density',
        'fontScale',
        'material',
        'motion',
        'theme',
      ]) &&
      includes(colorModes, value.colorMode) &&
      includes(contrasts, value.contrast) &&
      isDensity(value.density) &&
      includes(fontScales, value.fontScale) &&
      includes(materials, value.material) &&
      includes(motions, value.motion) &&
      themeReferenceValidator(value.theme)
    )
  }

  function isExplicitThemePreference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 3 &&
      isExplicitAppearance(value.appearance, isThemeReference)
    )
  }

  function isRetiredBuiltInThemeReference(value) {
    return (
      hasOnlyKeys(value, ['registryKind', 'themeId']) &&
      value.registryKind === 'built-in' &&
      includes(retiredBuiltInThemeIds, value.themeId)
    )
  }

  function isRetiredBuiltInPreference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 3 &&
      isExplicitAppearance(value.appearance, isRetiredBuiltInThemeReference)
    )
  }

  function isLegacyAppearance(value, acceptedColorModes, requiresMaterial) {
    var expectedKeys = [
      'colorMode',
      'contrast',
      'density',
      'fontScale',
      'motion',
      'palette',
      'theme',
    ]

    if (requiresMaterial) {
      expectedKeys.push('material')
    }

    return (
      hasOnlyKeys(value, expectedKeys) &&
      includes(acceptedColorModes, value.colorMode) &&
      includes(contrasts, value.contrast) &&
      isDensity(value.density) &&
      includes(fontScales, value.fontScale) &&
      includes(motions, value.motion) &&
      isPalette(value.palette) &&
      typeof value.theme === 'string' &&
      legacySeedThemeIdPattern.test(value.theme) &&
      (!requiresMaterial || includes(materials, value.material))
    )
  }

  function isLegacySeedPreference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 2 &&
      isLegacyAppearance(value.appearance, colorModes, true)
    )
  }

  function isLegacyPreferenceInput(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 1 &&
      isLegacyAppearance(value.appearance, legacyColorModes, false)
    )
  }

  function migrateLegacySeedPreference(value) {
    var appearance = value.appearance
    var tuple = legacyBuiltInThemeTuples.find(function (candidate) {
      return candidate.themeId === appearance.theme
    })

    if (
      !tuple ||
      tuple.brand !== appearance.palette.brand ||
      tuple.accent !== appearance.palette.accent ||
      tuple.neutral !== appearance.palette.neutral
    ) {
      return { status: 'failure', code: 'MIGRATION_REQUIRES_THEME_COMPLETION' }
    }

    return {
      status: 'success',
      preference: {
        schemaVersion: 3,
        appearance: {
          colorMode: appearance.colorMode,
          theme: { registryKind: 'built-in', themeId: defaultBuiltInThemeId },
          contrast: appearance.contrast,
          material: appearance.material,
          density: { preset: appearance.density.preset, scale: appearance.density.scale },
          fontScale: appearance.fontScale,
          motion: appearance.motion,
        },
      },
    }
  }

  function migrateReferenceToBuiltIn(value, themeId) {
    var appearance = value.appearance

    return {
      status: 'success',
      preference: {
        schemaVersion: 3,
        appearance: {
          colorMode: appearance.colorMode,
          theme: { registryKind: 'built-in', themeId: themeId },
          contrast: appearance.contrast,
          material: appearance.material,
          density: { preset: appearance.density.preset, scale: appearance.density.scale },
          fontScale: appearance.fontScale,
          motion: appearance.motion,
        },
      },
    }
  }

  function migrateToExplicitThemePreference(value) {
    if (isExplicitThemePreference(value)) {
      if (
        value.appearance.theme.registryKind === 'custom' &&
        includes(builtInThemeIds, value.appearance.theme.themeId)
      ) {
        return migrateReferenceToBuiltIn(value, value.appearance.theme.themeId)
      }

      return { status: 'success', preference: value }
    }

    if (isRetiredBuiltInPreference(value)) {
      return migrateReferenceToBuiltIn(value, defaultBuiltInThemeId)
    }

    if (isLegacySeedPreference(value)) {
      return migrateLegacySeedPreference(value)
    }

    if (isLegacyPreferenceInput(value)) {
      var legacyAppearance = value.appearance
      var wasHighContrast = legacyAppearance.colorMode === 'high-contrast'

      return migrateLegacySeedPreference({
        schemaVersion: 2,
        appearance: {
          colorMode: wasHighContrast ? colorModeContract.system : legacyAppearance.colorMode,
          theme: legacyAppearance.theme,
          palette: {
            brand: legacyAppearance.palette.brand,
            accent: legacyAppearance.palette.accent,
            neutral: legacyAppearance.palette.neutral,
          },
          contrast: wasHighContrast ? 'enhanced' : legacyAppearance.contrast,
          material: materialContract.solid,
          density: {
            preset: legacyAppearance.density.preset,
            scale: legacyAppearance.density.scale,
          },
          fontScale: legacyAppearance.fontScale,
          motion: legacyAppearance.motion,
        },
      })
    }

    return { status: 'failure', code: 'PREFERENCE_INPUT_INVALID' }
  }

  function resolveColorMode(storedColorMode, prefersDark) {
    if (storedColorMode === colorModeContract.system) {
      return prefersDark ? colorModeContract.dark : colorModeContract.light
    }

    return storedColorMode
  }

  function resolveMaterial(
    storedMaterial,
    forcedColorsActive,
    reducedTransparencyRequested,
    backdropFilterSupported,
  ) {
    if (forcedColorsActive || storedMaterial === materialContract.solid) {
      return materialContract.solid
    }

    if (storedMaterial === materialContract.reduced) {
      return materialContract.reduced
    }

    if (reducedTransparencyRequested) {
      return materialContract.reduced
    }

    return backdropFilterSupported ? materialContract.adaptive : materialContract.solid
  }

  var currentScript = document.currentScript
  var root = document.documentElement

  if (
    !currentScript ||
    !root ||
    typeof root.setAttribute !== 'function' ||
    typeof root.getAttribute !== 'function' ||
    typeof root.hasAttribute !== 'function' ||
    typeof root.removeAttribute !== 'function' ||
    !root.style ||
    typeof root.style.getPropertyPriority !== 'function' ||
    typeof root.style.getPropertyValue !== 'function' ||
    typeof root.style.setProperty !== 'function' ||
    typeof root.style.removeProperty !== 'function'
  ) {
    return
  }

  function clearCustomBankVariables() {
    customBankVariables.forEach(function (variable) {
      root.style.removeProperty(variable)
    })
  }

  function restoreAppearanceSafety() {
    clearCustomBankVariables()
${safetyBaselineRestorationLines()}
  }

  function captureAppearanceState() {
    var fontScaleValue = root.style.getPropertyValue('--ui-font-scale')
    var fontScalePriority = root.style.getPropertyPriority('--ui-font-scale')

    return {
      attributes: appearanceAttributeNames.map(function (name) {
        return {
          name: name,
          present: root.hasAttribute(name),
          value: root.getAttribute(name),
        }
      }),
      fontScale: {
        present: fontScaleValue !== '' || fontScalePriority !== '',
        priority: fontScalePriority,
        value: fontScaleValue,
      },
    }
  }

  function restoreAppearanceState(capture) {
    capture.attributes.forEach(function (attribute) {
      if (attribute.present && attribute.value !== null) {
        root.setAttribute(attribute.name, attribute.value)
      } else {
        root.removeAttribute(attribute.name)
      }
    })

    if (capture.fontScale.present) {
      root.style.setProperty(
        '--ui-font-scale',
        capture.fontScale.value,
        capture.fontScale.priority,
      )
    } else {
      root.style.removeProperty('--ui-font-scale')
    }
  }

  currentScript.__pavpRestoreAppearanceSafety = restoreAppearanceSafety

  var storageKey =
    typeof currentScript.getAttribute === 'function'
      ? currentScript.getAttribute('data-preference-storage-key')
      : null

  if (typeof storageKey !== 'string' || storageKey.length === 0) {
    return
  }

  var rawPreference

  try {
    rawPreference = localStorage.getItem(storageKey)
  } catch {
    return
  }

  if (rawPreference === null) {
    return
  }

  var parsedPreference

  try {
    parsedPreference = JSON.parse(rawPreference)
  } catch {
    return
  }

  var migration = migrateToExplicitThemePreference(parsedPreference)

  if (migration.status !== 'success') {
    return
  }

  var storedAppearance = migration.preference.appearance

  if (storedAppearance.theme.registryKind === 'custom') {
    currentScript.__pavpAppearanceHandoff = { restoration: 'custom-theme-reference' }
    return
  }

  var forcedColorsActive
  var prefersDark
  var reducedTransparencyRequested
  var backdropFilterSupported

  try {
    if (
      typeof matchMedia !== 'function' ||
      typeof CSS !== 'object' ||
      CSS === null ||
      typeof CSS.supports !== 'function'
    ) {
      return
    }

    forcedColorsActive = matchMedia('(forced-colors: active)').matches
    prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
    reducedTransparencyRequested = matchMedia('(prefers-reduced-transparency: reduce)').matches
    backdropFilterSupported =
      CSS.supports('backdrop-filter', 'blur(0)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(0)')
  } catch {
    return
  }

  var effectiveColorMode = resolveColorMode(storedAppearance.colorMode, prefersDark)
  var effectiveMaterial = resolveMaterial(
    storedAppearance.material,
    forcedColorsActive,
    reducedTransparencyRequested,
    backdropFilterSupported,
  )
  var previousAppearanceState = captureAppearanceState()

  try {
    clearCustomBankVariables()
    root.setAttribute('data-color-mode', effectiveColorMode)
    root.setAttribute('data-theme-kind', 'built-in')
    root.setAttribute('data-theme', storedAppearance.theme.themeId)
    root.setAttribute('data-contrast', storedAppearance.contrast)
    root.setAttribute('data-material', effectiveMaterial)
    root.setAttribute('data-density', storedAppearance.density.preset)
    root.setAttribute('data-motion', storedAppearance.motion)
    root.style.setProperty('--ui-font-scale', String(storedAppearance.fontScale))
  } catch {
    restoreAppearanceState(previousAppearanceState)
    clearCustomBankVariables()
  }
})()
`
}

export function createAppearanceInitFormat(context: FormatContext): Format {
  return {
    name: 'pavp/javascript/appearance-init',
    format: () => formatAppearanceInitScript(requireBuildResult(context)),
  }
}
