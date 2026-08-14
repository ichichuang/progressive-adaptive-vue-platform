import { useAppearanceStore } from './appearance.store'

type AppearanceAttemptDisposalMode = 'failed-startup' | 'normal-or-hmr'

type AppearanceFirstPaintHandoff = undefined | { readonly restoration: 'custom-theme-reference' }

export type AppearanceSafetyRestorationAuthority = () => void

export interface AppearanceFirstPaintHandoffHandle {
  readonly handoff: AppearanceFirstPaintHandoff
  readonly safetyRestorationAuthority: AppearanceSafetyRestorationAuthority | undefined
  restoreSafetyForFailedStartup(): void
  dispose(mode: AppearanceAttemptDisposalMode): void
}

interface AppearanceEnvironment {
  readonly backdropFilterSupported: boolean
  readonly forcedColorsActive: boolean
  readonly prefersDark: boolean
  readonly reducedTransparencyRequested: boolean
}

interface AppearanceMediaQueries {
  readonly darkMode: MediaQueryList
  readonly forcedColors: MediaQueryList
  readonly reducedTransparency: MediaQueryList
}

type AppearanceStore = ReturnType<typeof useAppearanceStore>
type AppearancePinia = NonNullable<Parameters<typeof useAppearanceStore>[0]>

export interface AppearanceProviderHandle {
  readonly store: AppearanceStore
  readonly mediaQueries: AppearanceMediaQueries
  readonly currentEnvironment: () => AppearanceEnvironment
  readonly reapply: () => void
  dispose(mode: AppearanceAttemptDisposalMode): void
}

export type AppearanceMediaSubscriptionsUnsubscribe = () => void

interface AppearanceInitializerScript extends HTMLScriptElement {
  __pavpAppearanceHandoff?: unknown
  __pavpRestoreAppearanceSafety?: unknown
}

function isCustomThemeRestorationHandoff(
  value: unknown,
): value is { readonly restoration: 'custom-theme-reference' } {
  try {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 1 &&
      Object.prototype.hasOwnProperty.call(value, 'restoration') &&
      (value as { readonly restoration?: unknown }).restoration === 'custom-theme-reference'
    )
  } catch {
    return false
  }
}

export function initializeAppearanceFirstPaintHandoff(
  documentTarget: Document,
  exactInitializerScript: HTMLScriptElement,
  retainedSafetyRestorationAuthority: AppearanceSafetyRestorationAuthority | undefined,
  retainHandle: (handle: AppearanceFirstPaintHandoffHandle) => void,
): AppearanceFirstPaintHandoffHandle {
  if (exactInitializerScript.ownerDocument !== documentTarget) {
    throw new Error('The generated Appearance initializer script is not exact.')
  }

  const script = exactInitializerScript as AppearanceInitializerScript
  let candidateHandoff: unknown
  let candidateRestorationOperation: unknown
  let handoffFieldReadable = false
  let restorationFieldReadable = false

  try {
    candidateRestorationOperation = script.__pavpRestoreAppearanceSafety
    restorationFieldReadable = true
  } catch {
    candidateRestorationOperation = undefined
  }

  try {
    candidateHandoff = script.__pavpAppearanceHandoff
    handoffFieldReadable = true
  } catch {
    candidateHandoff = undefined
  }

  const safetyRestorationAuthority =
    typeof candidateRestorationOperation === 'function'
      ? (candidateRestorationOperation as AppearanceSafetyRestorationAuthority)
      : retainedSafetyRestorationAuthority
  let restoreSafety = safetyRestorationAuthority ?? null
  let handoff: AppearanceFirstPaintHandoff = undefined
  let safetyRestored = false
  let bridgeFieldsReleased = false
  let disposed = false

  const releaseBridgeFields = (): void => {
    if (bridgeFieldsReleased) {
      return
    }

    delete script.__pavpAppearanceHandoff
    delete script.__pavpRestoreAppearanceSafety
    bridgeFieldsReleased = true
  }

  const restoreSafetyForFailedStartup = (): void => {
    if (safetyRestored || restoreSafety === null) {
      return
    }

    restoreSafety()
    safetyRestored = true
    restoreSafety = null
  }

  const handle: AppearanceFirstPaintHandoffHandle = {
    get handoff() {
      return handoff
    },
    safetyRestorationAuthority,
    restoreSafetyForFailedStartup,
    dispose(mode) {
      if (disposed) {
        return
      }

      if (mode === 'failed-startup') {
        restoreSafetyForFailedStartup()
      }

      releaseBridgeFields()
      handoff = undefined
      restoreSafety = null
      disposed = true
    },
  }

  retainHandle(handle)

  let validatedHandoff: AppearanceFirstPaintHandoff = undefined

  if (isCustomThemeRestorationHandoff(candidateHandoff)) {
    validatedHandoff = candidateHandoff
  }

  const handoffIsValid =
    handoffFieldReadable && (candidateHandoff === undefined || validatedHandoff !== undefined)
  const restorationOperationIsValid =
    restorationFieldReadable &&
    (candidateRestorationOperation === undefined ||
      typeof candidateRestorationOperation === 'function')
  const customHandoffHasSafety =
    candidateHandoff === undefined || typeof candidateRestorationOperation === 'function'

  if (!handoffIsValid || !restorationOperationIsValid || !customHandoffHasSafety) {
    restoreSafetyForFailedStartup()
    releaseBridgeFields()
    throw new Error('The generated Appearance handoff is malformed.')
  }

  handoff = validatedHandoff
  releaseBridgeFields()
  return handle
}

function createAppearanceMediaQueries(): AppearanceMediaQueries {
  return {
    darkMode: matchMedia('(prefers-color-scheme: dark)'),
    forcedColors: matchMedia('(forced-colors: active)'),
    reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)'),
  }
}

function appearanceEnvironment(mediaQueries: AppearanceMediaQueries): AppearanceEnvironment {
  return {
    backdropFilterSupported:
      // eslint-disable-next-line local/no-page-optical-effects -- Capability detection must match the generated First Paint authority.
      CSS.supports('backdrop-filter', 'blur(0)') ||
      // eslint-disable-next-line local/no-page-optical-effects -- Capability detection must match the generated First Paint authority.
      CSS.supports('-webkit-backdrop-filter', 'blur(0)'),
    forcedColorsActive: mediaQueries.forcedColors.matches,
    prefersDark: mediaQueries.darkMode.matches,
    reducedTransparencyRequested: mediaQueries.reducedTransparency.matches,
  }
}

function orderedMediaQueries(mediaQueries: AppearanceMediaQueries): readonly MediaQueryList[] {
  return [mediaQueries.darkMode, mediaQueries.forcedColors, mediaQueries.reducedTransparency]
}

export function installAppearanceProvider(
  pinia: AppearancePinia,
  handoffHandle: AppearanceFirstPaintHandoffHandle,
): AppearanceProviderHandle {
  const mediaQueries = createAppearanceMediaQueries()
  const currentEnvironment = (): AppearanceEnvironment => appearanceEnvironment(mediaQueries)
  const store = useAppearanceStore(pinia)

  try {
    const restoration = store.restoreAppearance(currentEnvironment())

    if (restoration.status === 'rejected') {
      throw new Error('Appearance restoration was rejected.')
    }
  } catch (error) {
    handoffHandle.restoreSafetyForFailedStartup()
    throw error
  }

  const reapply = (): void => {
    store.reapplyAppearance(currentEnvironment())
  }
  let disposed = false

  return {
    store,
    mediaQueries,
    currentEnvironment,
    reapply,
    dispose(mode) {
      if (disposed) {
        return
      }

      if (mode === 'failed-startup') {
        handoffHandle.restoreSafetyForFailedStartup()
      }

      disposed = true
    },
  }
}

function removeMediaQueryListeners(
  mediaQueries: readonly MediaQueryList[],
  listener: () => void,
): MediaQueryList[] {
  const failedRemovals: MediaQueryList[] = []

  for (const mediaQuery of mediaQueries) {
    try {
      mediaQuery.removeEventListener('change', listener)
    } catch {
      failedRemovals.push(mediaQuery)
    }
  }

  return failedRemovals
}

export function registerPostMountAppearanceMediaSubscriptions(
  provider: AppearanceProviderHandle,
  retainUnsubscribe: (unsubscribe: AppearanceMediaSubscriptionsUnsubscribe) => void,
): AppearanceMediaSubscriptionsUnsubscribe {
  let registeredMediaQueries: MediaQueryList[] = []
  let disposed = false
  const unsubscribe = (): void => {
    if (disposed) {
      return
    }

    registeredMediaQueries = removeMediaQueryListeners(registeredMediaQueries, provider.reapply)

    if (registeredMediaQueries.length !== 0) {
      throw new Error('Appearance media subscription disposal was incomplete.')
    }

    disposed = true
  }

  retainUnsubscribe(unsubscribe)

  try {
    for (const mediaQuery of orderedMediaQueries(provider.mediaQueries)) {
      registeredMediaQueries.push(mediaQuery)
      mediaQuery.addEventListener('change', provider.reapply)
    }
  } catch (error) {
    try {
      unsubscribe()
    } catch {
      // The retained handle lets the aggregate Attempt disposer retry and record this cleanup.
    }
    throw error
  }

  return unsubscribe
}
