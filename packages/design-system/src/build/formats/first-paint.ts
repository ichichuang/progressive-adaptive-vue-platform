import type { Format } from 'style-dictionary/types'

import {
  effectiveAppearanceAttributes,
  effectiveAppearanceCustomProperties,
} from '../../runtime/apply-appearance'
import { defaultCurrentPreference } from '../../runtime/appearance-defaults'
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
import { legacySeedThemeIdPattern } from '../../schema/legacy-seed-theme.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import { canonicalLayerOrder, formatAppearanceBaseCss, formatForcedColorsCss } from './css'
import { generatedNotice, requireBuildResult, resolvedCssValue, type FormatContext } from './shared'

const criticalRoleNames = new Set([
  'color.action.primary',
  'color.border.default',
  'color.focus.ring',
  'color.scrim.viewport',
  'color.surface.page',
  'color.surface.panel',
  'color.text.on-action',
  'color.text.primary',
  'color.text.secondary',
  'material.chrome.background',
  'material.modal.background',
  'material.overlay.background',
  'material.scrim.background',
])

function criticalDeclarations(result: TokenBuildResult): string {
  const declarations = result.tokens
    .filter((token) => {
      if (!criticalRoleNames.has(token.role.name) || token.cssVariable === undefined) {
        return false
      }

      const conditionEntries = Object.entries(token.conditions)
      return (
        conditionEntries.length === 0 ||
        (conditionEntries.length === 1 && token.conditions.material === 'solid')
      )
    })
    .sort((left, right) => compareCodePoints(left.role.name, right.role.name))
    .map((token) => {
      if (token.cssVariable === undefined) {
        throw new Error(`${token.path}: critical token is missing its CSS variable.`)
      }

      return `    ${token.cssVariable}: ${resolvedCssValue(token, result)};`
    })

  if (declarations.length !== criticalRoleNames.size) {
    throw new Error(
      `Critical theme contract requires ${String(criticalRoleNames.size)} complete baseline roles; received ${String(declarations.length)}.`,
    )
  }

  declarations.push('    --ui-font-scale: 1;')
  return declarations.join('\n')
}

export function formatCriticalThemeCss(result: TokenBuildResult): string {
  return `/* ${generatedNotice} */
${canonicalLayerOrder}

@layer tokens {
  :root {
${criticalDeclarations(result)}
  }
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

function appearanceAttributeWrites(): string {
  return effectiveAppearanceAttributes
    .map(
      ([stateKey, attributeName]) =>
        `  root.setAttribute(${javascriptString(attributeName)}, effectiveAppearance.${stateKey})`,
    )
    .join('\n')
}

function appearanceCustomPropertyWrites(): string {
  return effectiveAppearanceCustomProperties
    .map(
      ([stateKey, propertyName]) =>
        `  root.style.setProperty(${javascriptString(propertyName)}, String(effectiveAppearance.${stateKey}))`,
    )
    .join('\n')
}

export function formatAppearanceInitScript(): string {
  return `/* ${generatedNotice} */
;(function () {
  'use strict'

  var colorModes = ${javascriptLiteral(colorModePreferenceValues)}
  var legacyColorModes = ${javascriptLiteral(legacyColorModePreferenceValues)}
  var contrasts = ${javascriptLiteral(contrastPreferenceValues)}
  var materials = ${javascriptLiteral(materialPreferenceValues)}
  var densities = ${javascriptLiteral(uiDensityValues)}
  var fontScales = ${javascriptLiteral(fontScaleValues)}
  var motions = ${javascriptLiteral(motionPreferenceValues)}
  var legacySeedThemeIdPattern = new RegExp(${javascriptString(legacySeedThemeIdPattern.source)}, 'u')
  var defaultPreference = ${javascriptLiteral(defaultCurrentPreference, 2)}
  var colorModeContract = ${javascriptLiteral(colorModeResolutionContract, 2)}
  var materialContract = ${javascriptLiteral(materialResolutionContract, 2)}

  function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  function hasOnlyKeys(value, expectedKeys) {
    if (!isRecord(value)) {
      return false
    }

    var actualKeys = Object.keys(value).sort()
    var sortedExpectedKeys = expectedKeys.slice().sort()
    return actualKeys.join('\\n') === sortedExpectedKeys.join('\\n')
  }

  function includes(values, value) {
    return values.indexOf(value) !== -1
  }

  function isCssColor(value) {
    return (
      typeof value === 'string' &&
      value.length > 0 &&
      typeof CSS === 'object' &&
      CSS !== null &&
      typeof CSS.supports === 'function' &&
      CSS.supports('color', value)
    )
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

  function isAppearance(value, acceptedColorModes, requiresMaterial) {
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

  function isCurrentPreference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 2 &&
      isAppearance(value.appearance, colorModes, true)
    )
  }

  function isLegacyPreferenceInput(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 1 &&
      isAppearance(value.appearance, legacyColorModes, false)
    )
  }

  function migrateToCurrentPreference(value) {
    if (isCurrentPreference(value)) {
      return value
    }

    if (!isLegacyPreferenceInput(value)) {
      return null
    }

    var legacyAppearance = value.appearance
    var wasHighContrast = legacyAppearance.colorMode === 'high-contrast'

    return {
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
    }
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
  var storageKey =
    currentScript && typeof currentScript.getAttribute === 'function'
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

  var preference

  if (rawPreference === null) {
    preference = migrateToCurrentPreference(defaultPreference)
  } else {
    var parsedPreference

    try {
      parsedPreference = JSON.parse(rawPreference)
    } catch {
      return
    }

    preference = migrateToCurrentPreference(parsedPreference)
  }

  if (preference === null) {
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
      CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
  } catch {
    return
  }

  var storedAppearance = preference.appearance
  var effectiveAppearance = {
    colorMode: resolveColorMode(storedAppearance.colorMode, prefersDark),
    contrast: storedAppearance.contrast,
    density: storedAppearance.density.preset,
    fontScale: storedAppearance.fontScale,
    material: resolveMaterial(
      storedAppearance.material,
      forcedColorsActive,
      reducedTransparencyRequested,
      backdropFilterSupported,
    ),
    motion: storedAppearance.motion,
    theme: storedAppearance.theme,
  }
  var root = document.documentElement

  if (
    !root ||
    typeof root.setAttribute !== 'function' ||
    !root.style ||
    typeof root.style.setProperty !== 'function'
  ) {
    return
  }

${appearanceAttributeWrites()}
${appearanceCustomPropertyWrites()}
})()
`
}

export function createAppearanceInitFormat(): Format {
  return {
    name: 'pavp/javascript/appearance-init',
    format: formatAppearanceInitScript,
  }
}
