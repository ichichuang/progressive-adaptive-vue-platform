import {
  ProductPreferenceDefault,
  applyAppearance,
  explicitThemePreferenceSchema,
  installCustomThemeBank,
  resolveColorMode,
  resolveMaterial,
  resolveThemeReference,
  type CustomThemeRegistryEntry,
  type CustomThemeValidationResult,
  type EffectiveAppearanceState,
  type ExplicitThemePreference,
} from '@platform/design-system'
import { defineStore } from 'pinia'

import {
  captureCustomThemeRegistry,
  readCustomThemeRegistry,
  restoreCustomThemeRegistry,
  validateCustomThemeRegistryEntries,
  writeCustomThemeRegistry,
  type CapturedCustomThemeRegistryStorageValue,
} from './custom-theme-registry-storage'
import {
  captureStoredPreference,
  readStoredPreference,
  restoreStoredPreference,
  writeStoredPreference,
  type CapturedPreferenceStorageValue,
} from './preference-storage'

interface AppearanceStoreState {
  preference: ExplicitThemePreference | null
  customThemeRegistry: readonly CustomThemeRegistryEntry[] | null
}

interface AppearanceEnvironment {
  readonly backdropFilterSupported: boolean
  readonly forcedColorsActive: boolean
  readonly prefersDark: boolean
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
    schemaVersion: 3,
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
    motion: preference.appearance.motion,
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
    fontScale: {
      present: fontScaleValue !== '' || fontScalePriority !== '',
      priority: fontScalePriority,
      value: fontScaleValue,
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
}

function commitAppearanceTransition(
  store: AppearanceStoreState,
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

  const effectiveAppearance = deriveEffectiveAppearance(validatedPreference.data, environment)
  let preferenceCapture: CapturedPreferenceStorageValue | undefined
  let registryCapture: CapturedCustomThemeRegistryStorageValue | undefined

  if (persistenceIntent === 'preference') {
    const capture = captureStoredPreference()

    if (capture.status !== 'captured') {
      return { status: 'rejected' }
    }

    preferenceCapture = capture
  } else if (persistenceIntent === 'registry') {
    if (validatedRegistry === null) {
      return { status: 'rejected' }
    }

    const capture = captureCustomThemeRegistry()

    if (capture.status !== 'captured') {
      return { status: 'rejected' }
    }

    registryCapture = capture
  }

  const previousState: AppearanceStoreState = {
    preference: store.preference,
    customThemeRegistry: store.customThemeRegistry,
  }
  const domCapture = captureAppearanceDom(target)
  let completedWrite = false
  let committedRegistry = validatedRegistry

  try {
    if (resolution.entry.registryKind === 'custom') {
      const installation = installCustomThemeBank(target, resolution.entry)

      if (installation.status !== 'installed') {
        throw new Error('Custom Theme Bank installation was rejected.')
      }
    }

    applyAppearance(target, effectiveAppearance)

    if (persistenceIntent === 'preference') {
      const write = writeStoredPreference(validatedPreference.data)

      if (write.status !== 'written') {
        throw new Error('Preference persistence was rejected.')
      }

      completedWrite = true
    } else if (persistenceIntent === 'registry') {
      if (validatedRegistry === null) {
        throw new Error('Registry persistence requires an accessible candidate.')
      }

      const write = writeCustomThemeRegistry(validatedRegistry)

      if (write.status !== 'written') {
        throw new Error('Custom Theme Registry persistence was rejected.')
      }

      committedRegistry = write.entries
      completedWrite = true
    }

    store.preference = validatedPreference.data
    store.customThemeRegistry = committedRegistry
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
      // A hostile host object cannot prevent state and selected-key compensation attempts.
    }

    if (completedWrite) {
      if (persistenceIntent === 'preference' && preferenceCapture !== undefined) {
        restoreStoredPreference(preferenceCapture)
      } else if (persistenceIntent === 'registry' && registryCapture !== undefined) {
        restoreCustomThemeRegistry(registryCapture)
      }
    }

    store.preference = previousState.preference
    store.customThemeRegistry = previousState.customThemeRegistry
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
          : preferenceRead.status === 'missing'
            ? productDefaultPreference()
            : null
      const registryRead = readCustomThemeRegistry(candidatePreference?.appearance.theme)
      const candidateRegistry = registryRead.status === 'accessible' ? registryRead.entries : null

      if (candidatePreference === null) {
        this.preference = null
        this.customThemeRegistry = candidateRegistry
        return { status: 'rejected' }
      }

      const result = commitAppearanceTransition(
        this,
        document.documentElement,
        candidatePreference,
        candidateRegistry,
        environment,
        'none',
        registryRead.status === 'inaccessible' ? registryRead.rejectedCustomTheme : undefined,
      )

      if (result.status === 'rejected') {
        this.preference = null
        this.customThemeRegistry = candidateRegistry
      }

      return result
    },

    changeAppearancePreference(
      preference: unknown,
      environment: AppearanceEnvironment,
    ): AppearanceTransitionResult {
      return commitAppearanceTransition(
        this,
        document.documentElement,
        preference,
        this.customThemeRegistry,
        environment,
        'preference',
      )
    },

    resetAppearancePreference(environment: AppearanceEnvironment): AppearanceTransitionResult {
      return commitAppearanceTransition(
        this,
        document.documentElement,
        productDefaultPreference(),
        this.customThemeRegistry,
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
      if (this.customThemeRegistry === null) {
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

      const capture = captureCustomThemeRegistry()

      if (capture.status !== 'captured') {
        return { status: 'rejected' }
      }

      const write = writeCustomThemeRegistry(validation.entries)

      if (write.status !== 'written') {
        restoreCustomThemeRegistry(capture)
        return { status: 'rejected' }
      }

      this.customThemeRegistry = write.entries
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
