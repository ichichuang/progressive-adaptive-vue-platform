import {
  explicitThemePreferenceSchema,
  type ExplicitThemePreference,
} from '@platform/design-system'

import { applicationConfig } from '../config/app.config'

type StoredPreferenceParseResult =
  | {
      readonly status: 'restored'
      readonly preference: ExplicitThemePreference
    }
  | { readonly status: 'malformed' }
  | {
      readonly status: 'rejected'
      readonly code: 'PREFERENCE_INPUT_INVALID'
    }

export type PreferenceStorageReadResult =
  StoredPreferenceParseResult | { readonly status: 'missing' } | { readonly status: 'unavailable' }

export type PreferenceStorageWriteResult =
  | { readonly status: 'written' }
  | { readonly status: 'rejected' }
  | { readonly status: 'unavailable' }

function parseStoredPreference(rawValue: string): StoredPreferenceParseResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawValue) as unknown
  } catch {
    return { status: 'malformed' }
  }

  const preference = explicitThemePreferenceSchema.safeParse(parsed)

  if (!preference.success) {
    return {
      status: 'rejected',
      code: 'PREFERENCE_INPUT_INVALID',
    }
  }

  return {
    status: 'restored',
    preference: preference.data,
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
