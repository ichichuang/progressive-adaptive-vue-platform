import type { useAppearanceStore } from './appearance.store'

type AppearanceStore = ReturnType<typeof useAppearanceStore>

interface AppearanceInitializerScript extends HTMLScriptElement {
  __pavpAppearanceHandoff?: unknown
  __pavpRestoreAppearanceSafety?: unknown
}

interface AppearanceEnvironment {
  readonly backdropFilterSupported: boolean
  readonly forcedColorsActive: boolean
  readonly prefersDark: boolean
  readonly reducedTransparencyRequested: boolean
}

function isCustomThemeRestorationHandoff(
  value: unknown,
): value is { readonly restoration: 'custom-theme-reference' } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    Object.prototype.hasOwnProperty.call(value, 'restoration') &&
    (value as { readonly restoration?: unknown }).restoration === 'custom-theme-reference'
  )
}

function consumeFirstPaintBridge(): {
  readonly handoff: unknown
  readonly restoreSafety: (() => void) | null
} {
  const script = document.querySelector<AppearanceInitializerScript>(
    'script[src="/generated/appearance-init.js"]',
  )

  if (script === null) {
    return {
      handoff: undefined,
      restoreSafety: null,
    }
  }

  const handoff = script.__pavpAppearanceHandoff
  const restorationOperation = script.__pavpRestoreAppearanceSafety

  delete script.__pavpAppearanceHandoff
  delete script.__pavpRestoreAppearanceSafety

  return {
    handoff,
    restoreSafety:
      typeof restorationOperation === 'function' ? (restorationOperation as () => void) : null,
  }
}

function appearanceEnvironment(
  darkMode: MediaQueryList,
  forcedColors: MediaQueryList,
  reducedTransparency: MediaQueryList,
): AppearanceEnvironment {
  return {
    backdropFilterSupported:
      CSS.supports('backdrop-filter', 'none') || CSS.supports('-webkit-backdrop-filter', 'none'),
    forcedColorsActive: forcedColors.matches,
    prefersDark: darkMode.matches,
    reducedTransparencyRequested: reducedTransparency.matches,
  }
}

export function bootstrapAppearance(store: AppearanceStore): () => void {
  const bridge = consumeFirstPaintBridge()
  const handoffIsValid =
    bridge.handoff === undefined || isCustomThemeRestorationHandoff(bridge.handoff)
  const darkMode = matchMedia('(prefers-color-scheme: dark)')
  const forcedColors = matchMedia('(forced-colors: active)')
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)')
  const currentEnvironment = (): AppearanceEnvironment =>
    appearanceEnvironment(darkMode, forcedColors, reducedTransparency)

  let restoration

  try {
    restoration = store.restoreAppearance(currentEnvironment())
  } catch (error) {
    bridge.restoreSafety?.()
    throw error
  }

  if (restoration.status === 'rejected') {
    bridge.restoreSafety?.()
  }

  if (!handoffIsValid) {
    bridge.restoreSafety?.()
    throw new Error('The generated Appearance handoff is malformed.')
  }

  const reapply = (): void => {
    store.reapplyAppearance(currentEnvironment())
  }

  for (const mediaQuery of [darkMode, forcedColors, reducedTransparency]) {
    mediaQuery.addEventListener('change', reapply)
  }

  let disposed = false

  return () => {
    if (disposed) {
      return
    }

    disposed = true

    for (const mediaQuery of [darkMode, forcedColors, reducedTransparency]) {
      mediaQuery.removeEventListener('change', reapply)
    }
  }
}
