import {
  explicitThemePreferenceSchema,
  migrateToExplicitThemePreference,
  type ExplicitThemePreference,
  type PreferenceMigrationResult,
} from '@platform/design-system'

import { applicationConfig } from '../config/app.config'

type PreferenceMigrationFailure = Extract<PreferenceMigrationResult, { status: 'failure' }>

type StoredPreferenceParseResult =
  | {
      readonly status: 'restored'
      readonly preference: ExplicitThemePreference
    }
  | { readonly status: 'malformed' }
  | {
      readonly status: 'rejected'
      readonly code: PreferenceMigrationFailure['code']
    }

export type PreferenceStorageReadResult =
  StoredPreferenceParseResult | { readonly status: 'missing' } | { readonly status: 'unavailable' }

export interface CapturedPreferenceStorageValue {
  readonly status: 'captured'
  readonly rawValue: string | null
}

export type PreferenceStorageCaptureResult =
  CapturedPreferenceStorageValue | { readonly status: 'unavailable' }

export type PreferenceStorageWriteResult =
  | { readonly status: 'written' }
  | { readonly status: 'rejected' }
  | { readonly status: 'unavailable' }

export type PreferenceStorageRestoreResult =
  { readonly status: 'restored' } | { readonly status: 'unavailable' }

function parseStoredPreference(rawValue: string): StoredPreferenceParseResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawValue) as unknown
  } catch {
    return { status: 'malformed' }
  }

  const migration = migrateToExplicitThemePreference(parsed)

  if (migration.status === 'failure') {
    return {
      status: 'rejected',
      code: migration.code,
    }
  }

  return {
    status: 'restored',
    preference: migration.preference,
  }
}

export function readStoredPreference(): PreferenceStorageReadResult {
  let rawValue: string | null

  try {
    rawValue = localStorage.getItem(applicationConfig.appearance.preferenceStorageKey)
  } catch {
    return { status: 'unavailable' }
  }

  if (rawValue === null) {
    return { status: 'missing' }
  }

  return parseStoredPreference(rawValue)
}

export function captureStoredPreference(): PreferenceStorageCaptureResult {
  try {
    return {
      status: 'captured',
      rawValue: localStorage.getItem(applicationConfig.appearance.preferenceStorageKey),
    }
  } catch {
    return { status: 'unavailable' }
  }
}

export function writeStoredPreference(
  preference: ExplicitThemePreference,
): PreferenceStorageWriteResult {
  const parsed = explicitThemePreferenceSchema.safeParse(preference)

  if (!parsed.success) {
    return { status: 'rejected' }
  }

  let serialized: string

  try {
    serialized = JSON.stringify(parsed.data)
  } catch {
    return { status: 'rejected' }
  }

  try {
    localStorage.setItem(applicationConfig.appearance.preferenceStorageKey, serialized)
    return { status: 'written' }
  } catch {
    return { status: 'unavailable' }
  }
}

export function restoreStoredPreference(
  capture: CapturedPreferenceStorageValue,
): PreferenceStorageRestoreResult {
  try {
    if (capture.rawValue === null) {
      localStorage.removeItem(applicationConfig.appearance.preferenceStorageKey)
    } else {
      localStorage.setItem(applicationConfig.appearance.preferenceStorageKey, capture.rawValue)
    }

    return { status: 'restored' }
  } catch {
    return { status: 'unavailable' }
  }
}
