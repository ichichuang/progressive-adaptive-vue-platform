import { readFileSync } from 'node:fs'

import type { Format } from 'style-dictionary/types'
import ts from 'typescript'

import { ProductPreferenceDefault } from '../../runtime/appearance-defaults'
import { colorModeResolutionContract } from '../../runtime/resolve-color-mode'
import { materialResolutionContract } from '../../runtime/resolve-material'
import {
  colorModePreferenceValues,
  contrastPreferenceValues,
  fontScaleValues,
  materialPreferenceValues,
  motionPreferenceValues,
  uiDensityValues,
} from '../../schema/appearance.schema'
import {
  cssWideKeywords,
  forbiddenComputedColorSyntax,
  supportedAbsoluteColorSyntax,
  systemColorKeywords,
} from '../../schema/complete-theme.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import {
  canonicalLayerOrder,
  formatAppearanceBaseCss,
  formatForcedColorsCss,
  formatThemeBankCss,
  formatTokenCssRules,
} from './css'
import { generatedNotice, requireBuildResult, resolvedCssValue, type FormatContext } from './shared'
import { themeRegistryDocument } from './typescript'
import { radiusProjectionDocument } from './radius'

export const preInitializationSafetyBaseline = {
  effectiveColorMode: 'light',
  effectiveTheme: {
    registryKind: 'built-in',
    themeId: 'royal-iris',
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
const duplicateAwareJsonRuntime = ts
  .transpileModule(readFileSync(new URL('../parse-json.ts', import.meta.url), 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  })
  .outputText.replace('export function parseJsonSource', 'function parseJsonSource')

const radiusProjectionRuntime = ts
  .transpileModule(
    readFileSync(new URL('../../runtime/radius-projection.ts', import.meta.url), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
  )
  .outputText.replace('export function resolveRadius', 'function resolveRadius')

const motionResolutionRuntime = ts
  .transpileModule(
    readFileSync(new URL('../../runtime/resolve-motion.ts', import.meta.url), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
  )
  .outputText.replace('export function resolveMotion', 'function resolveMotion')

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
  for (const name of [
    'interaction.radius.control',
    'interaction.radius.panel',
    'interaction.radius.small',
  ]) {
    const token = result.tokens.find(
      (record) => record.role.name === name && Object.keys(record.conditions).length === 0,
    )
    if (token?.cssVariable === undefined)
      throw new Error(`${name}: critical radius baseline is unavailable.`)
    declarations.push(`    ${token.cssVariable}: ${resolvedCssValue(token, result)};`)
  }
  return declarations.join('\n')
}

export function formatCriticalThemeCss(result: TokenBuildResult): string {
  return `/* ${generatedNotice} */
${canonicalLayerOrder}

@layer tokens {
  :root {
${criticalDeclarations(result)}
  }

${formatTokenCssRules(
  result,
  result.tokens.filter(
    (token) =>
      token.role.name === 'interaction.control.height' ||
      token.role.name === 'interaction.control.height-baseline' ||
      token.role.name === 'spacing.button.inline',
  ),
)}

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
          `${padding}  ${/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(key) ? key : javascriptString(key)}: ${javascriptLiteral(propertyValue, indentation + 2)},`,
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

  /* Embedded from the declared Color.js dependency for exact current Custom color validation. */
  ${embeddedColorJsRuntime}

  ${duplicateAwareJsonRuntime}

  var colorModes = ${javascriptLiteral(colorModePreferenceValues)}
  var themeColorModes = ['light', 'dark']
  var contrasts = ${javascriptLiteral(contrastPreferenceValues)}
  var materials = ${javascriptLiteral(materialPreferenceValues)}
  var densities = ${javascriptLiteral(uiDensityValues)}
  var fontScales = ${javascriptLiteral(fontScaleValues)}
  var motions = ${javascriptLiteral(motionPreferenceValues)}
  var builtInThemeIds = ${javascriptLiteral(registry.builtInRegistryOrder)}
  var roleContractVersion = ${javascriptLiteral(registry.roleContractVersion)}
  var publicColorBindings = ${javascriptLiteral(
    registry.activePublicColorRoles.map((record) => [record.publicRole, record.publicBinding]),
  )}
  var activePublicColorRoles = publicColorBindings.map(function (record) { return record[0] })
  var namedContrasts = ${javascriptLiteral(registry.namedContrasts.filter((pair) => pair.staticMaterialProjections.length === 0).map((pair) => [pair.foregroundRole, pair.backgroundRole, pair.standardMinimum, pair.enhancedMinimum, pair.enhancedDifferenceRequired]))}
  var forbiddenColorKeywords = ${javascriptLiteral([...cssWideKeywords, ...systemColorKeywords])}
  var supportedColorSyntax = new RegExp(${javascriptString(supportedAbsoluteColorSyntax.source)}, 'iu')
  var forbiddenColorSyntax = new RegExp(${javascriptString(forbiddenComputedColorSyntax.source)}, 'iu')
  var radiusContract = ${javascriptLiteral(radiusProjectionDocument(result))}
${radiusProjectionRuntime}
${motionResolutionRuntime}
  var customBankRecords = themeColorModes.flatMap(function (colorMode) {
    return contrasts.flatMap(function (contrast) {
      return publicColorBindings.map(function (binding) {
        var colorPrefix = '--ui-color-'
        if (!binding[1].startsWith(colorPrefix)) throw new Error('Invalid Public Color binding')
        return {
          bankVariable: '--ui-theme-bank-' + colorMode + '-' + contrast + '-' + binding[1].slice(colorPrefix.length),
          colorMode: colorMode, contrast: contrast, publicRole: binding[0],
        }
      })
    })
  })
  var customBankVariables = customBankRecords.map(function (record) { return record.bankVariable })
  var appearanceAttributeNames = ${javascriptLiteral([
    'data-color-mode',
    'data-theme-kind',
    'data-theme',
    'data-contrast',
    'data-material',
    'data-density',
    'data-motion',
  ])}
  var appearanceStylePropertyNames = ['--ui-font-scale', '--ui-radius-control', '--ui-radius-panel', '--ui-radius-small']
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

  function isThemeColor(roleId, value) {
    if (typeof value !== 'string' || value.trim() !== value ||
      !supportedColorSyntax.test(value) || forbiddenColorSyntax.test(value) ||
      includes(forbiddenColorKeywords, value.toLowerCase()) || !isCssColor(value)) {
      return false
    }

    try {
      var color = new Color(value)
      var expectedAlpha = roleId === 'color.scrim.viewport' ? 0.56 : 1
      return color.alpha === expectedAlpha && color.inGamut('srgb')
    } catch {
      return false
    }
  }

  function validatedCustomThemeDefinition(value) {
    if (
      !hasOnlyKeys(value, ['id', 'label', 'planes', 'roleContractVersion', 'schemaVersion']) ||
      value.schemaVersion !== 3 ||
      typeof value.id !== 'string' ||
      value.id.length === 0 ||
      typeof value.label !== 'string' ||
      value.label.length === 0 ||
      value.roleContractVersion !== roleContractVersion ||
      !hasOnlyKeys(value.planes, ['dark', 'light'])
    ) {
      return null
    }

    var sourceRoles = activePublicColorRoles
    var normalizedPlanes = {}

    for (var colorModeIndex = 0; colorModeIndex < themeColorModes.length; colorModeIndex += 1) {
      var colorMode = themeColorModes[colorModeIndex]
      var modePlanes = value.planes[colorMode]

      if (!hasOnlyKeys(modePlanes, contrasts)) {
        return null
      }

      normalizedPlanes[colorMode] = {}

      for (var contrastIndex = 0; contrastIndex < contrasts.length; contrastIndex += 1) {
        var contrast = contrasts[contrastIndex]
        var plane = modePlanes[contrast]

        if (!hasOnlyKeys(plane, sourceRoles)) {
          return null
        }

        var normalizedPlane = {}

        for (var roleIndex = 0; roleIndex < sourceRoles.length; roleIndex += 1) {
          var roleId = sourceRoles[roleIndex]
          var authoredValue = plane[roleId]

          if (!isThemeColor(roleId, authoredValue)) {
            return null
          }

          normalizedPlane[roleId] = authoredValue

        }

        if (!hasOnlyKeys(normalizedPlane, activePublicColorRoles)) {
          return null
        }

        normalizedPlanes[colorMode][contrast] = normalizedPlane
      }

      var standard = normalizedPlanes[colorMode].standard
      var enhanced = normalizedPlanes[colorMode].enhanced
      var changedStricterEndpoint = false
      for (var pairIndex = 0; pairIndex < namedContrasts.length; pairIndex += 1) {
        var pair = namedContrasts[pairIndex]
        var standardRatio = new Color(standard[pair[0]]).contrastWCAG21(new Color(standard[pair[1]]))
        var enhancedRatio = new Color(enhanced[pair[0]]).contrastWCAG21(new Color(enhanced[pair[1]]))
        if (standardRatio < pair[2] || enhancedRatio < pair[3] ||
          (pair[4] && enhancedRatio <= standardRatio)) return null
        if (pair[3] > pair[2] && (standard[pair[0]] !== enhanced[pair[0]] ||
          standard[pair[1]] !== enhanced[pair[1]])) changedStricterEndpoint = true
      }
      if (!changedStricterEndpoint) return null
    }

    return {
      schemaVersion: value.schemaVersion,
      roleContractVersion: roleContractVersion,
      id: value.id,
      label: value.label,
      planes: normalizedPlanes,
    }
  }

  function readSelectedCustomThemeDefinition(storageKey, themeId) {
    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      return null
    }

    var rawRegistry

    try {
      rawRegistry = localStorage.getItem(storageKey)
    } catch {
      return null
    }

    if (rawRegistry === null) {
      return null
    }

    var registrySnapshot

    try {
      registrySnapshot = JSON.parse(rawRegistry)
      parseJsonSource(rawRegistry, 'Custom Theme Registry')
    } catch {
      return null
    }

    if (
      !hasOnlyKeys(registrySnapshot, ['entries', 'schemaVersion']) ||
      registrySnapshot.schemaVersion !== 1 ||
      !Array.isArray(registrySnapshot.entries)
    ) {
      return null
    }

    var selected = null
    var themeIds = new Set()
    for (var entryIndex = 0; entryIndex < registrySnapshot.entries.length; entryIndex += 1) {
      var entry = registrySnapshot.entries[entryIndex]
      if (!hasOnlyKeys(entry, ['definition', 'registryKind', 'themeId']) ||
        entry.registryKind !== 'custom' || !isRecord(entry.definition) ||
        entry.definition.id !== entry.themeId || themeIds.has(entry.themeId)) return null
      var definition = validatedCustomThemeDefinition(entry.definition)
      if (definition === null) return null
      themeIds.add(entry.themeId)
      if (entry.themeId === themeId) selected = definition
    }
    return selected
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

  function isExplicitAppearance(value) {
    return (
      hasOnlyKeys(value, [
        'colorMode',
        'contrast',
        'density',
        'fontScale',
        'material',
        'motion',
        'theme',
        'radius',
      ]) &&
      includes(colorModes, value.colorMode) &&
      includes(contrasts, value.contrast) &&
      isDensity(value.density) &&
      includes(fontScales, value.fontScale) &&
      includes(materials, value.material) &&
      includes(motions, value.motion) &&
      isThemeReference(value.theme) &&
      (typeof value.radius === 'number' && Number.isInteger(value.radius) &&
        value.radius >= radiusContract.minimum && value.radius <= radiusContract.maximum)
    )
  }

  function isExplicitThemePreference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 4 &&
      isExplicitAppearance(value.appearance)
    )
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

  var motionMediaQuery
  try {
    if (typeof matchMedia === 'function') motionMediaQuery = matchMedia('(prefers-reduced-motion: reduce)')
  } catch { /* Keep the explicit preference when the platform query is unavailable. */ }

  function readEffectiveMotion(storedMotion) {
    var prefersReducedMotion = false
    try { prefersReducedMotion = Boolean(motionMediaQuery && motionMediaQuery.matches) } catch {}
    return resolveMotion({ storedMotion: storedMotion, prefersReducedMotion: prefersReducedMotion })
  }

  root.setAttribute('data-motion', readEffectiveMotion(${javascriptString(ProductPreferenceDefault.motion)}))

  function clearCustomBankVariables() {
    customBankVariables.forEach(function (variable) {
      root.style.removeProperty(variable)
    })
  }

  function restoreAppearanceSafety() {
    clearCustomBankVariables()
    root.style.removeProperty('--ui-radius-control')
    root.style.removeProperty('--ui-radius-panel')
    root.style.removeProperty('--ui-radius-small')
    root.setAttribute('data-motion', readEffectiveMotion(${javascriptString(ProductPreferenceDefault.motion)}))
${safetyBaselineRestorationLines()}
  }

  function captureAppearanceState() {
    return {
      attributes: appearanceAttributeNames.map(function (name) {
        return {
          name: name,
          present: root.hasAttribute(name),
          value: root.getAttribute(name),
        }
      }),
      styles: appearanceStylePropertyNames.map(function (name) {
        var value = root.style.getPropertyValue(name)
        var priority = root.style.getPropertyPriority(name)
        return { name: name, present: value !== '' || priority !== '', value: value, priority: priority }
      }),
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

    capture.styles.forEach(function (style) {
      if (style.present) root.style.setProperty(style.name, style.value, style.priority)
      else root.style.removeProperty(style.name)
    })
  }

  function applyRadius(value) {
    var projected = resolveRadius(value, radiusContract)
    root.style.setProperty('--ui-radius-control', String(projected.control) + 'px')
    root.style.setProperty('--ui-radius-panel', String(projected.panel) + 'px')
    root.style.setProperty('--ui-radius-small', String(projected.small) + 'px')
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

  if (!isExplicitThemePreference(parsedPreference)) return

  var storedAppearance = parsedPreference.appearance

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
    if (storedAppearance.theme.registryKind === 'custom') {
      var customThemeRegistryStorageKey = currentScript.getAttribute(
        'data-theme-registry-storage-key',
      )
      var customDefinition = readSelectedCustomThemeDefinition(
        customThemeRegistryStorageKey,
        storedAppearance.theme.themeId,
      )

      if (customDefinition === null) {
        currentScript.__pavpAppearanceHandoff = { restoration: 'custom-theme-reference' }
        return
      }

      clearCustomBankVariables()

      customBankRecords.forEach(function (record) {
        root.style.setProperty(
          record.bankVariable,
          customDefinition.planes[record.colorMode][record.contrast][record.publicRole],
        )
      })

      root.setAttribute('data-color-mode', effectiveColorMode)
      root.setAttribute('data-theme-kind', 'custom')
      root.setAttribute('data-theme', storedAppearance.theme.themeId)
      root.setAttribute('data-contrast', storedAppearance.contrast)
      root.setAttribute('data-material', effectiveMaterial)
      root.setAttribute('data-density', storedAppearance.density.preset)
      root.setAttribute('data-motion', readEffectiveMotion(storedAppearance.motion))
      root.style.setProperty('--ui-font-scale', String(storedAppearance.fontScale))
      applyRadius(storedAppearance.radius)
      currentScript.__pavpAppearanceHandoff = { restoration: 'custom-theme-reference' }
      return
    }

    clearCustomBankVariables()
    root.setAttribute('data-color-mode', effectiveColorMode)
    root.setAttribute('data-theme-kind', 'built-in')
    root.setAttribute('data-theme', storedAppearance.theme.themeId)
    root.setAttribute('data-contrast', storedAppearance.contrast)
    root.setAttribute('data-material', effectiveMaterial)
    root.setAttribute('data-density', storedAppearance.density.preset)
    root.setAttribute('data-motion', readEffectiveMotion(storedAppearance.motion))
    root.style.setProperty('--ui-font-scale', String(storedAppearance.fontScale))
    applyRadius(storedAppearance.radius)
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
