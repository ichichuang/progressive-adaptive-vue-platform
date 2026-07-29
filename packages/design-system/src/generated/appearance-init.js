/* Generated file. Do not edit directly. */
;(function () {
  'use strict'

  var colorModes = ['light', 'dark', 'system']
  var legacyColorModes = ['light', 'dark', 'system', 'high-contrast']
  var contrasts = ['standard', 'enhanced']
  var materials = ['adaptive', 'reduced', 'solid']
  var densities = ['compact', 'comfortable', 'spacious']
  var fontScales = [0.9, 1, 1.1, 1.2]
  var motions = ['full', 'reduced', 'none']
  var themeIdPattern = new RegExp('^[a-z][a-z0-9-]*$', 'u')
  var defaultPreference = {
    schemaVersion: 2,
    appearance: {
      colorMode: 'system',
      theme: 'neutral',
      palette: {
        brand: 'oklch(37% 0.014 247)',
        accent: 'oklch(55% 0.012 247)',
        neutral: 'neutral',
      },
      contrast: 'standard',
      material: 'adaptive',
      density: {
        preset: 'comfortable',
        scale: 1,
      },
      fontScale: 1,
      motion: 'full',
    },
  }
  var colorModeContract = {
    dark: 'dark',
    light: 'light',
    system: 'system',
  }
  var materialContract = {
    adaptive: 'adaptive',
    reduced: 'reduced',
    solid: 'solid',
  }

  function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  function hasOnlyKeys(value, expectedKeys) {
    if (!isRecord(value)) {
      return false
    }

    var actualKeys = Object.keys(value).sort()
    var sortedExpectedKeys = expectedKeys.slice().sort()
    return actualKeys.join('\n') === sortedExpectedKeys.join('\n')
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
      themeIdPattern.test(value.theme) &&
      (!requiresMaterial || includes(materials, value.material))
    )
  }

  function isV2Preference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 2 &&
      isAppearance(value.appearance, colorModes, true)
    )
  }

  function isV1Preference(value) {
    return (
      hasOnlyKeys(value, ['appearance', 'schemaVersion']) &&
      value.schemaVersion === 1 &&
      isAppearance(value.appearance, legacyColorModes, false)
    )
  }

  function upgradePreference(value) {
    if (isV2Preference(value)) {
      return value
    }

    if (!isV1Preference(value)) {
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
    preference = upgradePreference(defaultPreference)
  } else {
    var parsedPreference

    try {
      parsedPreference = JSON.parse(rawPreference)
    } catch {
      return
    }

    preference = upgradePreference(parsedPreference)
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

  root.setAttribute('data-color-mode', effectiveAppearance.colorMode)
  root.setAttribute('data-contrast', effectiveAppearance.contrast)
  root.setAttribute('data-density', effectiveAppearance.density)
  root.setAttribute('data-material', effectiveAppearance.material)
  root.setAttribute('data-motion', effectiveAppearance.motion)
  root.setAttribute('data-theme', effectiveAppearance.theme)
  root.style.setProperty('--ui-font-scale', String(effectiveAppearance.fontScale))
})()
