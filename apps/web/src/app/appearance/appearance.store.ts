import {
  ProductPreferenceDefault,
  applyAppearance,
  captureRadius,
  explicitThemePreferenceSchema,
  installCustomThemeBank,
  projectUiAppearance,
  resolveColorMode,
  resolveMaterial,
  resolveMotion,
  resolveThemeReference,
  type CustomThemeRegistryEntry,
  type CustomThemeValidationResult,
  type EffectiveAppearanceState,
  type ExplicitThemePreference,
  type UiAppearanceSnapshot,
} from '@platform/design-system'
import { defineStore } from 'pinia'

import {
  readCustomThemeRegistry,
  validateCustomThemeRegistryEntries,
  writeCustomThemeRegistry,
} from './custom-theme-registry-storage'
import { readStoredPreference, writeStoredPreference } from './preference-storage'

interface AppearanceStoreState {
  preference: ExplicitThemePreference | null
  customThemeRegistry: readonly CustomThemeRegistryEntry[] | null
}

interface AppearanceEnvironment {
  readonly backdropFilterSupported: boolean
  readonly forcedColorsActive: boolean
  readonly prefersDark: boolean
  readonly prefersReducedMotion: boolean
  readonly reducedTransparencyRequested: boolean
}

type PersistenceIntent = 'none' | 'preference' | 'registry'

type AppearanceTransitionResult = { readonly status: 'committed' } | { readonly status: 'rejected' }

interface AppearanceAttributeCapture {
  readonly name: (typeof appearanceAttributeNames)[number]
  readonly present: boolean
  readonly value: string | null
}

interface AppearanceDomCapture {
  readonly attributes: readonly AppearanceAttributeCapture[]
  readonly restoreRadius: () => void
  readonly fontScale: {
    readonly present: boolean
    readonly priority: string
    readonly value: string
  }
}

const appearanceAttributeNames = [
  'data-color-mode',
  'data-theme-kind',
  'data-theme',
  'data-contrast',
  'data-material',
  'data-density',
  'data-motion',
] as const

function productDefaultPreference(): ExplicitThemePreference {
  return explicitThemePreferenceSchema.parse({
    schemaVersion: 4,
    appearance: ProductPreferenceDefault,
  })
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonValuesEqual(value, right[index]))
    )
  }

  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false
  }

  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        jsonValuesEqual(leftRecord[key], rightRecord[key]),
    )
  )
}

function deriveEffectiveAppearance(
  preference: ExplicitThemePreference,
  environment: AppearanceEnvironment,
): EffectiveAppearanceState {
  return {
    colorMode: resolveColorMode({
      storedColorMode: preference.appearance.colorMode,
      prefersDark: environment.prefersDark,
    }),
    theme: preference.appearance.theme,
    contrast: preference.appearance.contrast,
    material: resolveMaterial({
      storedMaterial: preference.appearance.material,
      forcedColorsActive: environment.forcedColorsActive,
      reducedTransparencyRequested: environment.reducedTransparencyRequested,
      backdropFilterSupported: environment.backdropFilterSupported,
    }),
    density: preference.appearance.density.preset,
    fontScale: preference.appearance.fontScale,
    motion: resolveMotion({
      storedMotion: preference.appearance.motion,
      prefersReducedMotion: environment.prefersReducedMotion,
    }),
    radius: preference.appearance.radius,
  }
}

function captureAppearanceDom(target: HTMLElement): AppearanceDomCapture {
  const fontScaleValue = target.style.getPropertyValue('--ui-font-scale')
  const fontScalePriority = target.style.getPropertyPriority('--ui-font-scale')
  return {
    attributes: appearanceAttributeNames.map((name) => ({
      name,
      present: target.hasAttribute(name),
      value: target.getAttribute(name),
    })),
    restoreRadius: captureRadius(target),
    fontScale: {
      present: fontScaleValue !== '' || fontScalePriority !== '',
      value: fontScaleValue,
      priority: fontScalePriority,
    },
  }
}

function restoreAppearanceDom(target: HTMLElement, capture: AppearanceDomCapture): void {
  for (const attribute of capture.attributes) {
    if (attribute.present && attribute.value !== null) {
      target.setAttribute(attribute.name, attribute.value)
    } else {
      target.removeAttribute(attribute.name)
    }
  }

  if (capture.fontScale.present) {
    target.style.setProperty('--ui-font-scale', capture.fontScale.value, capture.fontScale.priority)
  } else {
    target.style.removeProperty('--ui-font-scale')
  }
  capture.restoreRadius()
}

function commitAppearanceTransition(
  store: AppearanceStoreState & { $patch(mutate: (state: AppearanceStoreState) => void): void },
  target: HTMLElement,
  candidatePreference: unknown,
  candidateCustomThemeRegistry: readonly CustomThemeRegistryEntry[] | null,
  environment: AppearanceEnvironment,
  persistenceIntent: PersistenceIntent,
  rejectedCustomTheme?: Extract<CustomThemeValidationResult, { status: 'rejected' }>,
): AppearanceTransitionResult {
  const validatedPreference = explicitThemePreferenceSchema.safeParse(candidatePreference)

  if (!validatedPreference.success) {
    return { status: 'rejected' }
  }

  let validatedRegistry = candidateCustomThemeRegistry

  if (candidateCustomThemeRegistry !== null) {
    const registryValidation = validateCustomThemeRegistryEntries(candidateCustomThemeRegistry)

    if (registryValidation.status !== 'accessible') {
      return { status: 'rejected' }
    }

    validatedRegistry = registryValidation.entries
  }

  const resolution = resolveThemeReference({
    reference: validatedPreference.data.appearance.theme,
    customThemeRegistry: validatedRegistry,
    ...(rejectedCustomTheme === undefined ? {} : { rejectedCustomTheme }),
  })

  if (resolution.status !== 'resolved') {
    return { status: 'rejected' }
  }

  let effectiveAppearance: Readonly<UiAppearanceSnapshot>

  try {
    effectiveAppearance = projectUiAppearance(
      deriveEffectiveAppearance(validatedPreference.data, environment),
      resolution.entry,
    )
  } catch {
    return { status: 'rejected' }
  }
  const previousState: AppearanceStoreState = {
    preference: store.preference,
    customThemeRegistry: store.customThemeRegistry,
  }
  const domCapture = captureAppearanceDom(target)

  try {
    if (resolution.entry.registryKind === 'custom') {
      const installation = installCustomThemeBank(target, resolution.entry)

      if (installation.status !== 'installed') {
        throw new Error('Custom Theme Bank installation was rejected.')
      }
    }

    applyAppearance(target, effectiveAppearance)
    store.$patch((state) => {
      state.preference = validatedPreference.data
      state.customThemeRegistry = validatedRegistry
    })
    // Persist last: once setItem succeeds there is no fallible local commit or stale compensation.

    if (persistenceIntent === 'preference') {
      const write = writeStoredPreference(validatedPreference.data)

      if (write.status !== 'written') {
        throw new Error('Preference persistence was rejected.')
      }
    } else if (persistenceIntent === 'registry') {
      if (validatedRegistry === null) {
        throw new Error('Registry persistence requires an accessible candidate.')
      }

      const write = writeCustomThemeRegistry(validatedRegistry)

      if (write.status !== 'written') {
        throw new Error('Custom Theme Registry persistence was rejected.')
      }
    }

    return { status: 'committed' }
  } catch {
    try {
      const rollbackPreference = previousState.preference ?? productDefaultPreference()
      const previousResolution = resolveThemeReference({
        reference: rollbackPreference.appearance.theme,
        customThemeRegistry: previousState.customThemeRegistry,
      })

      if (previousResolution.status === 'resolved') {
        const previousEffectiveAppearance = deriveEffectiveAppearance(
          rollbackPreference,
          environment,
        )

        if (previousResolution.entry.registryKind === 'custom') {
          installCustomThemeBank(target, previousResolution.entry)
        }

        applyAppearance(target, previousEffectiveAppearance)
      }
    } catch {
      // Exact Appearance-owned DOM state is restored below even if the host rejects semantics.
    }

    try {
      restoreAppearanceDom(target, domCapture)
    } catch {
      // A hostile host object cannot prevent the local state restoration attempt.
    }

    store.$patch((state) => {
      state.preference = previousState.preference
      state.customThemeRegistry = previousState.customThemeRegistry
    })
    return { status: 'rejected' }
  }
}

export const useAppearanceStore = defineStore('appearance', {
  state: (): AppearanceStoreState => ({
    preference: null,
    customThemeRegistry: null,
  }),
  actions: {
    restoreAppearance(environment: AppearanceEnvironment): AppearanceTransitionResult {
      const preferenceRead = readStoredPreference()
      const candidatePreference =
        preferenceRead.status === 'restored'
          ? preferenceRead.preference
          : productDefaultPreference()
      const registryRead = readCustomThemeRegistry(candidatePreference.appearance.theme)
      const candidateRegistry = registryRead.status === 'accessible' ? registryRead.entries : null

      let result = commitAppearanceTransition(
        this,
        document.documentElement,
        candidatePreference,
        candidateRegistry,
        environment,
        'none',
        registryRead.status === 'inaccessible' ? registryRead.rejectedCustomTheme : undefined,
      )

      if (
        result.status === 'rejected' &&
        candidatePreference.appearance.theme.registryKind === 'custom'
      ) {
        // Recovery is memory-only. Existing explicit preference actions are the only replacement writers.
        result = commitAppearanceTransition(
          this,
          document.documentElement,
          productDefaultPreference(),
          candidateRegistry,
          environment,
          'none',
        )
      }

      if (result.status === 'rejected') {
        this.preference = null
        this.customThemeRegistry = candidateRegistry
      }

      return result
    },

    synchronizeAppearance(environment: AppearanceEnvironment): AppearanceTransitionResult {
      const preference = readStoredPreference()
      if (preference.status !== 'restored' && preference.status !== 'missing')
        return { status: 'rejected' }
      const candidate =
        preference.status === 'restored' ? preference.preference : productDefaultPreference()
      const registry = readCustomThemeRegistry(candidate.appearance.theme)
      const entries = registry.status === 'accessible' ? registry.entries : null
      if (
        jsonValuesEqual(candidate, this.preference) &&
        jsonValuesEqual(entries, this.customThemeRegistry)
      )
        return { status: 'committed' }
      return commitAppearanceTransition(
        this,
        document.documentElement,
        candidate,
        entries,
        environment,
        'none',
      )
    },

    readEffectiveAppearance(
      environment: AppearanceEnvironment,
    ): Readonly<EffectiveAppearanceState> | null {
      return this.preference === null
        ? null
        : deriveEffectiveAppearance(this.preference, environment)
    },

    changeAppearancePreference(
      preference: unknown,
      environment: AppearanceEnvironment,
    ): AppearanceTransitionResult {
      const registry = readCustomThemeRegistry()
      return commitAppearanceTransition(
        this,
        document.documentElement,
        preference,
        registry.status === 'accessible' ? registry.entries : null,
        environment,
        'preference',
      )
    },

    resetAppearancePreference(environment: AppearanceEnvironment): AppearanceTransitionResult {
      const registry = readCustomThemeRegistry()
      return commitAppearanceTransition(
        this,
        document.documentElement,
        productDefaultPreference(),
        registry.status === 'accessible' ? registry.entries : null,
        environment,
        'preference',
      )
    },

    replaceCustomThemeRegistry(
      entries: readonly CustomThemeRegistryEntry[],
      environment: AppearanceEnvironment,
    ): AppearanceTransitionResult {
      const preference = this.preference

      if (
        preference?.appearance.theme.registryKind !== 'custom' ||
        this.customThemeRegistry === null
      ) {
        return { status: 'rejected' }
      }

      const candidate = validateCustomThemeRegistryEntries(entries)

      if (candidate.status !== 'accessible') {
        return { status: 'rejected' }
      }

      const currentReference = preference.appearance.theme
      const previousEntry = this.customThemeRegistry.find(
        (entry) => entry.themeId === currentReference.themeId,
      )
      const candidateEntry = candidate.entries.find(
        (entry) => entry.themeId === currentReference.themeId,
      )

      if (
        previousEntry === undefined ||
        candidateEntry === undefined ||
        jsonValuesEqual(previousEntry.definition, candidateEntry.definition)
      ) {
        return { status: 'rejected' }
      }

      return commitAppearanceTransition(
        this,
        document.documentElement,
        preference,
        candidate.entries,
        environment,
        'registry',
      )
    },

    deleteCustomTheme(themeId: CustomThemeRegistryEntry['themeId']): AppearanceTransitionResult {
      const activeReference = this.preference?.appearance.theme
      if (
        this.customThemeRegistry === null ||
        (activeReference?.registryKind === 'custom' && activeReference.themeId === themeId)
      ) {
        return { status: 'rejected' }
      }

      const storedPreference = readStoredPreference()

      if (
        storedPreference.status !== 'restored' ||
        (storedPreference.preference.appearance.theme.registryKind === 'custom' &&
          storedPreference.preference.appearance.theme.themeId === themeId)
      ) {
        return { status: 'rejected' }
      }

      const remainingEntries = this.customThemeRegistry.filter((entry) => entry.themeId !== themeId)
      const validation = validateCustomThemeRegistryEntries(remainingEntries)

      if (validation.status !== 'accessible') {
        return { status: 'rejected' }
      }

      const previous = this.customThemeRegistry
      this.customThemeRegistry = validation.entries
      const write = writeCustomThemeRegistry(validation.entries)
      if (write.status !== 'written') {
        this.customThemeRegistry = previous
        return { status: 'rejected' }
      }
      return { status: 'committed' }
    },

    reapplyAppearance(environment: AppearanceEnvironment): AppearanceTransitionResult {
      if (this.preference === null) {
        return { status: 'rejected' }
      }

      return commitAppearanceTransition(
        this,
        document.documentElement,
        this.preference,
        this.customThemeRegistry,
        environment,
        'none',
      )
    },
  },
})
