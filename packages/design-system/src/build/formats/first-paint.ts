import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { Format } from 'style-dictionary/types'
import ts from 'typescript'
import { build } from 'vite'

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
  completeThemeSchemaVersion,
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

const colorBuild = await build({
  configFile: false,
  envFile: false,
  logLevel: 'silent',
  publicDir: false,
  build: {
    lib: {
      entry: fileURLToPath(new URL('../../schema/css-color.ts', import.meta.url)),
      formats: ['iife'],
      name: 'PavpFirstPaintColor',
    },
    minify: true,
    reportCompressedSize: false,
    target: 'es2022',
    write: false,
  },
})
const colorOutputs = Array.isArray(colorBuild) ? colorBuild : [colorBuild]
const colorOutput = colorOutputs[0]
if (
  colorOutputs.length !== 1 ||
  colorOutput === undefined ||
  !('output' in colorOutput) ||
  colorOutput.output.length !== 1
) {
  throw new Error('First Paint color build must produce one self-contained JavaScript chunk.')
}
const colorChunk = colorOutput.output[0]
if (colorChunk.imports.length !== 0 || colorChunk.dynamicImports.length !== 0) {
  throw new Error('First Paint color build must not depend on other chunks.')
}
const embeddedColorJsRuntime = colorChunk.code.trim()
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

const paletteValidationRuntime = ts
  .transpileModule(
    readFileSync(new URL('../../schema/theme-palette-validation.ts', import.meta.url), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
  )
  .outputText.replace('export function paletteContrastFailure', 'function paletteContrastFailure')

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
      token.role.name.startsWith('interaction.control.height') ||
      token.role.name === 'interaction.control.height-baseline' ||
      token.role.name.startsWith('interaction.control.segment.') ||
      token.role.name === 'spacing.button.inline' ||
      token.role.name === 'spacing.content.gap' ||
      token.role.name === 'spacing.field.gap' ||
      token.role.name.startsWith('spacing.panel.') ||
      token.role.name.startsWith('spacing.control.segment.') ||
      token.role.name.startsWith('spacing.component.') ||
      token.role.name.startsWith('spacing.calendar.') ||
      token.role.name.startsWith('layout.calendar.') ||
      token.role.name.startsWith('spacing.indicator.') ||
      token.role.name.startsWith('interaction.icon.') ||
      token.role.name.startsWith('interaction.indicator.') ||
      token.role.name === 'typography.size.heading' ||
      token.role.name.startsWith('typography.size.control.') ||
      token.role.name === 'typography.size.subheading' ||
      token.role.name === 'typography.size.caption' ||
      token.role.name === 'typography.size.metric' ||
      token.role.name === 'typography.line-height.compact',
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
  const representative = registry.builtInEntries[0]
  const textContract = registry.namedContrasts.find(
    (record) => record.id === 'text-primary-on-panel',
  )
  const boundaryContract = registry.namedContrasts.find(
    (record) => record.id === 'control-primary-on-panel',
  )
  if (representative === undefined || textContract === undefined || boundaryContract === undefined)
    throw new Error('First Paint requires a complete palette and contrast contracts.')
  const paletteShape = (value: unknown): unknown =>
    typeof value === 'string'
      ? true
      : Object.fromEntries(
          Object.entries(value as Readonly<Record<string, unknown>>).map(([key, item]) => [
            key,
            paletteShape(item),
          ]),
        )

  return `/* ${generatedNotice} */
// prettier-ignore
;(function () {
  'use strict'

  /* Embedded from the declared Color.js dependency for exact current Custom color validation. */
  ${embeddedColorJsRuntime}

  ${duplicateAwareJsonRuntime}
  ${paletteValidationRuntime}

  var colorModes = ${javascriptLiteral(colorModePreferenceValues)}
  var themeColorModes = ['light', 'dark']
  var contrasts = ${javascriptLiteral(contrastPreferenceValues)}
  var materials = ${javascriptLiteral(materialPreferenceValues)}
  var densities = ${javascriptLiteral(uiDensityValues)}
  var fontScales = ${javascriptLiteral(fontScaleValues)}
  var motions = ${javascriptLiteral(motionPreferenceValues)}
  var builtInThemeIds = ${javascriptLiteral(registry.builtInRegistryOrder)}
  var roleContractVersion = ${javascriptLiteral(registry.roleContractVersion)}
  var themeSchemaVersion = ${javascriptLiteral(completeThemeSchemaVersion)}
  var palettePlaneShape = ${javascriptLiteral(paletteShape(representative.uiPalette.light.standard))}
  var publicRoleReferences = ${javascriptLiteral(representative.definition.planes)}
  var paletteTextMinimum = ${javascriptLiteral([textContract.standardMinimum, textContract.enhancedMinimum])}
  var paletteBoundaryMinimum = ${javascriptLiteral([boundaryContract.standardMinimum, boundaryContract.enhancedMinimum])}
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
      PavpFirstPaintColor.parseCssColor(value)
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
      var color = PavpFirstPaintColor.parseCssColor(value)
      var expectedAlpha = roleId === 'color.scrim.viewport' ? 0.56 : 1
      return color.alpha === expectedAlpha && PavpFirstPaintColor.isInSrgbGamut(color)
    } catch {
      return false
    }
  }

  function validatedCustomThemeDefinition(value) {
    if (
      !hasOnlyKeys(value, ['id', 'label', 'planes', 'roleContractVersion', 'schemaVersion', 'uiPalette']) ||
      value.schemaVersion !== themeSchemaVersion ||
      typeof value.id !== 'string' ||
      value.id.length === 0 ||
      typeof value.label !== 'string' ||
      value.label.length === 0 ||
      value.roleContractVersion !== roleContractVersion ||
      !hasOnlyKeys(value.planes, ['dark', 'light']) ||
      !hasOnlyKeys(value.uiPalette, ['dark', 'light'])
    ) {
      return null
    }

    var sourceRoles = activePublicColorRoles
    var normalizedPlanes = {}

    for (var colorModeIndex = 0; colorModeIndex < themeColorModes.length; colorModeIndex += 1) {
      var colorMode = themeColorModes[colorModeIndex]
      var modePlanes = value.planes[colorMode]
      var modePalettes = value.uiPalette[colorMode]

      if (!hasOnlyKeys(modePlanes, contrasts) || !hasOnlyKeys(modePalettes, contrasts)) {
        return null
      }

      normalizedPlanes[colorMode] = {}

      for (var contrastIndex = 0; contrastIndex < contrasts.length; contrastIndex += 1) {
        var contrast = contrasts[contrastIndex]
        var plane = modePlanes[contrast]
        var palette = modePalettes[contrast]

        if (!hasOnlyKeys(plane, sourceRoles) || !matchesPaletteShape(palette, palettePlaneShape)) {
          return null
        }

        var paletteFailure = paletteContrastFailure(palette, colorMode,
          paletteTextMinimum[contrastIndex], paletteBoundaryMinimum[contrastIndex],
          function (foreground, background) {
            return PavpFirstPaintColor.calculateWcag21Contrast(
              PavpFirstPaintColor.parseCssColor(foreground),
              PavpFirstPaintColor.parseCssColor(background))
          })
        if (paletteFailure !== null) return null

        var normalizedPlane = {}

        for (var roleIndex = 0; roleIndex < sourceRoles.length; roleIndex += 1) {
          var roleId = sourceRoles[roleIndex]
          var authoredValue = plane[roleId]
          if (roleId !== 'color.scrim.viewport' &&
              authoredValue !== publicRoleReferences[colorMode][contrast][roleId]) return null
          var resolvedValue = roleId === 'color.scrim.viewport'
            ? authoredValue : resolvePaletteReference(palette, authoredValue)

          if (!isThemeColor(roleId, resolvedValue)) {
            return null
          }

          normalizedPlane[roleId] = resolvedValue

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
        var standardRatio = PavpFirstPaintColor.calculateWcag21Contrast(PavpFirstPaintColor.parseCssColor(standard[pair[0]]), PavpFirstPaintColor.parseCssColor(standard[pair[1]]))
        var enhancedRatio = PavpFirstPaintColor.calculateWcag21Contrast(PavpFirstPaintColor.parseCssColor(enhanced[pair[0]]), PavpFirstPaintColor.parseCssColor(enhanced[pair[1]]))
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

  function matchesPaletteShape(value, shape) {
    if (shape === true) return typeof value === 'string' && /^#[0-9A-F]{6}$/.test(value)
    if (!hasOnlyKeys(value, Object.keys(shape))) return false
    return Object.keys(shape).every(function (key) { return matchesPaletteShape(value[key], shape[key]) })
  }

  function resolvePaletteReference(palette, value) {
    if (typeof value !== 'string') return null
    var match = /^\\{palette\\.([a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)+)\\}$/u.exec(value)
    if (match === null) return null
    var current = palette
    for (var segment of match[1].split('.')) {
      if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) return null
      current = current[segment]
    }
    return typeof current === 'string' ? current : null
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
