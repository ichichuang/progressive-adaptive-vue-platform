import {
  validateCustomThemeDefinition,
  type CustomThemeRegistryEntry,
  type CustomThemeValidationResult,
  type ThemeReference,
} from '@platform/design-system'

import { applicationConfig } from '../config/app.config'

type RejectedCustomThemeValidation = Extract<CustomThemeValidationResult, { status: 'rejected' }>

interface CustomThemeRegistrySnapshot {
  readonly schemaVersion: 1
  readonly entries: readonly CustomThemeRegistryEntry[]
}

interface RejectedRegistryDefinition {
  readonly themeId: string
  readonly validation: RejectedCustomThemeValidation
}

type RegistryEntriesValidationResult =
  | {
      readonly status: 'validated'
      readonly entries: readonly CustomThemeRegistryEntry[]
    }
  | { readonly status: 'inaccessible' }
  | {
      readonly status: 'definitions-rejected'
      readonly failures: readonly RejectedRegistryDefinition[]
    }

export type CustomThemeRegistryReadResult =
  | {
      readonly status: 'accessible'
      readonly entries: readonly CustomThemeRegistryEntry[]
    }
  | {
      readonly status: 'inaccessible'
      readonly rejectedCustomTheme?: RejectedCustomThemeValidation
    }

export interface CapturedCustomThemeRegistryStorageValue {
  readonly status: 'captured'
  readonly rawValue: string | null
}

export type CustomThemeRegistryStorageCaptureResult =
  CapturedCustomThemeRegistryStorageValue | { readonly status: 'unavailable' }

export type CustomThemeRegistryStorageWriteResult =
  | {
      readonly status: 'written'
      readonly entries: readonly CustomThemeRegistryEntry[]
    }
  | { readonly status: 'rejected' }
  | { readonly status: 'unavailable' }

export type CustomThemeRegistryStorageRestoreResult =
  { readonly status: 'restored' } | { readonly status: 'unavailable' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort(compareCodePoints)
  const canonicalExpected = [...expected].sort(compareCodePoints)

  return (
    actual.length === canonicalExpected.length &&
    actual.every((key, index) => key === canonicalExpected[index])
  )
}

function parseDuplicateAwareJson(rawValue: string): unknown {
  let index = 0

  function fail(): never {
    throw new SyntaxError('Invalid JSON document.')
  }

  function skipWhitespace(): void {
    while (
      rawValue[index] === ' ' ||
      rawValue[index] === '\t' ||
      rawValue[index] === '\n' ||
      rawValue[index] === '\r'
    ) {
      index += 1
    }
  }

  function parseString(): string {
    if (rawValue[index] !== '"') {
      fail()
    }

    const start = index
    index += 1

    while (index < rawValue.length) {
      const character = rawValue[index]

      if (character === '\\') {
        index += 2
        continue
      }

      index += 1

      if (character === '"') {
        const parsed = JSON.parse(rawValue.slice(start, index)) as unknown

        if (typeof parsed !== 'string') {
          fail()
        }

        return parsed
      }
    }

    return fail()
  }

  function parseNumber(): number {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rawValue.slice(index))

    if (match === null) {
      fail()
    }

    index += match[0].length
    const parsed = Number(match[0])

    if (!Number.isFinite(parsed)) {
      fail()
    }

    return parsed
  }

  function parseLiteral(literal: 'true' | 'false' | 'null'): boolean | null {
    if (!rawValue.startsWith(literal, index)) {
      fail()
    }

    index += literal.length

    if (literal === 'true') {
      return true
    }

    if (literal === 'false') {
      return false
    }

    return null
  }

  function parseArray(): readonly unknown[] {
    const value: unknown[] = []
    index += 1
    skipWhitespace()

    if (rawValue[index] === ']') {
      index += 1
      return value
    }

    while (index < rawValue.length) {
      value.push(parseValue())
      skipWhitespace()

      if (rawValue[index] === ']') {
        index += 1
        return value
      }

      if (rawValue[index] !== ',') {
        fail()
      }

      index += 1
      skipWhitespace()
    }

    return fail()
  }

  function parseObject(): Record<string, unknown> {
    const value = Object.create(null) as Record<string, unknown>
    index += 1
    skipWhitespace()

    if (rawValue[index] === '}') {
      index += 1
      return value
    }

    while (index < rawValue.length) {
      const key = parseString()

      if (Object.prototype.hasOwnProperty.call(value, key)) {
        fail()
      }

      skipWhitespace()

      if (rawValue[index] !== ':') {
        fail()
      }

      index += 1
      const parsedValue = parseValue()

      Object.defineProperty(value, key, {
        configurable: true,
        enumerable: true,
        value: parsedValue,
        writable: true,
      })

      skipWhitespace()

      if (rawValue[index] === '}') {
        index += 1
        return value
      }

      if (rawValue[index] !== ',') {
        fail()
      }

      index += 1
      skipWhitespace()
    }

    return fail()
  }

  function parseValue(): unknown {
    skipWhitespace()

    const character = rawValue[index]

    if (character === '"') {
      return parseString()
    }

    if (character === '{') {
      return parseObject()
    }

    if (character === '[') {
      return parseArray()
    }

    if (character === 't') {
      return parseLiteral('true')
    }

    if (character === 'f') {
      return parseLiteral('false')
    }

    if (character === 'n') {
      return parseLiteral('null')
    }

    if (character === '-' || (character !== undefined && /[0-9]/u.test(character))) {
      return parseNumber()
    }

    return fail()
  }

  const parsed = parseValue()
  skipWhitespace()

  if (index !== rawValue.length) {
    fail()
  }

  return parsed
}

function associatedRejectedValidation(
  validation: RejectedCustomThemeValidation,
  registryThemeId: string,
): RejectedCustomThemeValidation {
  if (validation.code === 'THEME_INVALID' && validation.themeId === null) {
    return {
      ...validation,
      themeId: registryThemeId,
    }
  }

  return validation
}

function canonicalEntries(
  entries: readonly CustomThemeRegistryEntry[],
): readonly CustomThemeRegistryEntry[] {
  return [...entries].sort((left, right) => compareCodePoints(left.themeId, right.themeId))
}

function validateRegistryEntries(entries: unknown): RegistryEntriesValidationResult {
  if (!Array.isArray(entries)) {
    return { status: 'inaccessible' }
  }

  const seenThemeIds = new Set<string>()
  const validatedEntries: CustomThemeRegistryEntry[] = []
  const failures: RejectedRegistryDefinition[] = []

  for (const candidate of entries) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ['registryKind', 'themeId', 'definition']) ||
      candidate['registryKind'] !== 'custom' ||
      typeof candidate['themeId'] !== 'string' ||
      candidate['themeId'].length === 0
    ) {
      return { status: 'inaccessible' }
    }

    const themeId = candidate['themeId']

    if (seenThemeIds.has(themeId)) {
      return { status: 'inaccessible' }
    }

    seenThemeIds.add(themeId)

    const definition = candidate['definition']
    const submittedDefinitionId = isRecord(definition) ? definition['id'] : undefined

    if (typeof submittedDefinitionId === 'string' && submittedDefinitionId !== themeId) {
      return { status: 'inaccessible' }
    }

    const validation = validateCustomThemeDefinition(definition)

    if (validation.status === 'rejected') {
      failures.push({
        themeId,
        validation: associatedRejectedValidation(validation, themeId),
      })
      continue
    }

    if (validation.entry.themeId !== themeId) {
      return { status: 'inaccessible' }
    }

    validatedEntries.push(validation.entry)
  }

  if (failures.length !== 0) {
    return {
      status: 'definitions-rejected',
      failures,
    }
  }

  return {
    status: 'validated',
    entries: canonicalEntries(validatedEntries),
  }
}

export function validateCustomThemeRegistryEntries(
  entries: readonly CustomThemeRegistryEntry[],
): CustomThemeRegistryReadResult {
  const validation = validateRegistryEntries(entries)

  if (validation.status !== 'validated') {
    return { status: 'inaccessible' }
  }

  return {
    status: 'accessible',
    entries: validation.entries,
  }
}

function inaccessibleRegistryResult(
  failures: readonly RejectedRegistryDefinition[],
  requestedReference: ThemeReference | undefined,
): CustomThemeRegistryReadResult {
  const onlyFailure = failures.length === 1 ? failures[0] : undefined

  if (
    onlyFailure !== undefined &&
    requestedReference?.registryKind === 'custom' &&
    onlyFailure.themeId === requestedReference.themeId
  ) {
    return {
      status: 'inaccessible',
      rejectedCustomTheme: onlyFailure.validation,
    }
  }

  return { status: 'inaccessible' }
}

export function parseCustomThemeRegistrySnapshot(
  rawValue: string,
  requestedReference?: ThemeReference,
): CustomThemeRegistryReadResult {
  let parsed: unknown

  try {
    parsed = parseDuplicateAwareJson(rawValue)
  } catch {
    return { status: 'inaccessible' }
  }

  if (
    !isRecord(parsed) ||
    !hasExactKeys(parsed, ['schemaVersion', 'entries']) ||
    parsed['schemaVersion'] !== 1
  ) {
    return { status: 'inaccessible' }
  }

  const validation = validateRegistryEntries(parsed['entries'])

  if (validation.status === 'inaccessible') {
    return { status: 'inaccessible' }
  }

  if (validation.status === 'definitions-rejected') {
    return inaccessibleRegistryResult(validation.failures, requestedReference)
  }

  return {
    status: 'accessible',
    entries: validation.entries,
  }
}

export function readCustomThemeRegistry(
  requestedReference?: ThemeReference,
): CustomThemeRegistryReadResult {
  let rawValue: string | null

  try {
    rawValue = localStorage.getItem(applicationConfig.appearance.customThemeRegistryStorageKey)
  } catch {
    return { status: 'inaccessible' }
  }

  if (rawValue === null) {
    return {
      status: 'accessible',
      entries: [],
    }
  }

  return parseCustomThemeRegistrySnapshot(rawValue, requestedReference)
}

export function captureCustomThemeRegistry(): CustomThemeRegistryStorageCaptureResult {
  try {
    return {
      status: 'captured',
      rawValue: localStorage.getItem(applicationConfig.appearance.customThemeRegistryStorageKey),
    }
  } catch {
    return { status: 'unavailable' }
  }
}

export function writeCustomThemeRegistry(
  entries: readonly CustomThemeRegistryEntry[],
): CustomThemeRegistryStorageWriteResult {
  const validation = validateCustomThemeRegistryEntries(entries)

  if (validation.status !== 'accessible') {
    return { status: 'rejected' }
  }

  const snapshot: CustomThemeRegistrySnapshot = {
    schemaVersion: 1,
    entries: validation.entries,
  }
  let serialized: string

  try {
    serialized = JSON.stringify(snapshot)
  } catch {
    return { status: 'rejected' }
  }

  try {
    localStorage.setItem(applicationConfig.appearance.customThemeRegistryStorageKey, serialized)
    return {
      status: 'written',
      entries: validation.entries,
    }
  } catch {
    return { status: 'unavailable' }
  }
}

export function restoreCustomThemeRegistry(
  capture: CapturedCustomThemeRegistryStorageValue,
): CustomThemeRegistryStorageRestoreResult {
  try {
    if (capture.rawValue === null) {
      localStorage.removeItem(applicationConfig.appearance.customThemeRegistryStorageKey)
    } else {
      localStorage.setItem(
        applicationConfig.appearance.customThemeRegistryStorageKey,
        capture.rawValue,
      )
    }

    return { status: 'restored' }
  } catch {
    return { status: 'unavailable' }
  }
}
