import type { applicationConfig } from '../config/app.config'

type SharedPreferenceKey =
  | typeof applicationConfig.dateTime.preferenceStorageKey
  | typeof applicationConfig.appearance.preferenceStorageKey
  | typeof applicationConfig.appearance.customThemeRegistryStorageKey
  | typeof applicationConfig.localization.preferenceStorageKey
  | typeof applicationConfig.navigation.preferenceStorageKey
  | typeof applicationConfig.scroll.preferenceStorageKey

/** Invalidations only: domain owners read and validate their own persisted value. */
export function subscribeSharedPreferenceChanges(
  keys: readonly SharedPreferenceKey[],
  invalidate: () => void,
): () => void {
  let disposed = false
  const receive = (event: StorageEvent): void => {
    if (disposed || (event.key !== null && !keys.some((key) => key === event.key))) return
    try {
      if (event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    invalidate()
  }
  const unsubscribe = (): void => {
    if (disposed) return
    disposed = true
    window.removeEventListener('storage', receive)
  }
  window.addEventListener('storage', receive)
  try {
    // Close the read-before-listen startup gap, including changes before registration.
    invalidate()
  } catch (source: unknown) {
    unsubscribe()
    throw source
  }
  return unsubscribe
}
