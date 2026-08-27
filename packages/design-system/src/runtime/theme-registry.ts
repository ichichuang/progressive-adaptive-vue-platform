import { generatedThemeRegistry } from '../generated/theme-registry'
import {
  customThemeDefinitionSchema,
  legacyCustomThemeDefinitionSchema,
  legacyCustomThemeRoleContractVersion,
  type BuiltInThemeDefinition,
  type BuiltInThemeId,
  type CustomThemeDefinition,
  type CustomThemeId,
} from '../schema/complete-theme.schema'
import {
  calculateWcag21Contrast,
  isInSrgbGamut,
  parseCssColor,
  type ParsedCssColor,
} from '../schema/css-color'
import type { ThemeReference } from '../schema/preference.schema'

const themeColorModes = ['light', 'dark'] as const
const themeContrasts = ['standard', 'enhanced'] as const

type ThemeColorMode = (typeof themeColorModes)[number]
type ThemeContrast = (typeof themeContrasts)[number]

export type ThemeRegistryEntry =
  | {
      readonly registryKind: 'built-in'
      readonly themeId: BuiltInThemeId
      readonly definition: BuiltInThemeDefinition
    }
  | {
      readonly registryKind: 'custom'
      readonly themeId: CustomThemeId
      readonly definition: CustomThemeDefinition
    }

export type CustomThemeRegistryEntry = Extract<
  ThemeRegistryEntry,
  { readonly registryKind: 'custom' }
>

interface ThemeValidationEvidence {
  readonly themeId?: string
  readonly roleContractVersion?: number
  readonly fieldPath: string
  readonly role?: string
  readonly plane?: string
  readonly submittedValue?: string
  readonly actualAlpha?: number
  readonly requiredAlphaPolicy?: string
  readonly contrastPairId?: string
  readonly actualRatio?: number
  readonly requiredRatio?: number
}

export type CustomThemeValidationResult =
  | {
      readonly status: 'validated'
      readonly entry: CustomThemeRegistryEntry
    }
  | {
      readonly status: 'rebound'
      readonly code: 'ROLE_CONTRACT_REBOUND_NON_COLOR_ONLY'
      readonly entry: CustomThemeRegistryEntry
      readonly previousRoleContractVersion: number
      readonly currentRoleContractVersion: number
    }
  | {
      readonly status: 'rejected'
      readonly code: 'THEME_INVALID'
      readonly registryKind: 'custom'
      readonly themeId: string | null
      readonly evidence: readonly ThemeValidationEvidence[]
    }
  | {
      readonly status: 'rejected'
      readonly code: 'ROLE_CONTRACT_MISMATCH'
      readonly registryKind: 'custom'
      readonly themeId: string
      readonly receivedRoleContractVersion: number
      readonly requiredRoleContractVersion: number
    }

export type ThemeReferenceResolutionResult =
  | {
      readonly status: 'resolved'
      readonly reference: ThemeReference
      readonly entry: ThemeRegistryEntry
    }
  | {
      readonly status: 'unresolved'
      readonly reference: ThemeReference
      readonly code: 'THEME_NOT_FOUND'
    }
  | {
      readonly status: 'unresolved'
      readonly reference: ThemeReference
      readonly code: 'THEME_INACCESSIBLE'
    }
  | {
      readonly status: 'unresolved'
      readonly reference: ThemeReference
      readonly code: 'THEME_INVALID'
      readonly evidence: readonly ThemeValidationEvidence[]
    }
  | {
      readonly status: 'unresolved'
      readonly reference: ThemeReference
      readonly code: 'ROLE_CONTRACT_MISMATCH'
      readonly receivedRoleContractVersion: number
      readonly requiredRoleContractVersion: number
    }

export type ThemeBankInstallationResult =
  { readonly status: 'installed' } | { readonly status: 'rejected' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function exactStringSet(actual: readonly string[], expected: readonly string[]): boolean {
  const sortedActual = [...actual].sort(compareCodePoints)
  const sortedExpected = [...expected].sort(compareCodePoints)

  return (
    sortedActual.length === sortedExpected.length &&
    sortedActual.every((value, index) => value === sortedExpected[index])
  )
}

function submittedThemeId(value: unknown): string | null {
  if (!isRecord(value) || typeof value['id'] !== 'string' || value['id'].length === 0) {
    return null
  }

  return value['id']
}

function validationEvidence(
  fieldPath: string,
  themeId: string | null,
  additions: Omit<ThemeValidationEvidence, 'fieldPath' | 'themeId'> = {},
): ThemeValidationEvidence {
  return {
    fieldPath,
    ...(themeId === null ? {} : { themeId }),
    ...additions,
  }
}

function colorPlane(
  definition: CustomThemeDefinition,
  colorMode: ThemeColorMode,
  contrast: ThemeContrast,
): Readonly<Record<string, string>> {
  return definition.planes[colorMode][contrast]
}

function parsedColor(value: string): ParsedCssColor | null {
  try {
    return parseCssColor(value)
  } catch {
    return null
  }
}

function normalizeLegacyCustomThemeDefinition(input: unknown): CustomThemeDefinition | null {
  const legacy = legacyCustomThemeDefinitionSchema.safeParse(input)

  if (!legacy.success) {
    return null
  }

  const normalizedPlanes = Object.fromEntries(
    themeColorModes.map((colorMode) => [
      colorMode,
      Object.fromEntries(
        themeContrasts.map((contrast) => {
          const plane = legacy.data.planes[colorMode][contrast]
          const actionPrimary = plane['color.action.primary']

          return [
            contrast,
            Object.fromEntries(
              Object.entries(plane).flatMap(([roleId, value]) =>
                roleId === 'color.action.primary'
                  ? [
                      [roleId, value],
                      ['color.control.primary', actionPrimary],
                    ]
                  : [[roleId, value]],
              ),
            ),
          ]
        }),
      ),
    ]),
  )

  return customThemeDefinitionSchema.parse({
    ...legacy.data,
    roleContractVersion: generatedThemeRegistry.roleContractVersion,
    planes: normalizedPlanes,
  })
}

function validateCustomThemePlanes(
  definition: CustomThemeDefinition,
): readonly ThemeValidationEvidence[] {
  const evidence: ThemeValidationEvidence[] = []
  const roleIds = generatedThemeRegistry.activePublicColorRoles.map((record) => record.publicRole)

  for (const colorMode of themeColorModes) {
    for (const contrast of themeContrasts) {
      const planeName = `${colorMode}.${contrast}`
      const plane = colorPlane(definition, colorMode, contrast)

      if (!exactStringSet(Object.keys(plane), roleIds)) {
        evidence.push(
          validationEvidence(`planes.${planeName}`, definition.id, {
            roleContractVersion: definition.roleContractVersion,
            plane: planeName,
          }),
        )
        continue
      }

      for (const roleId of roleIds) {
        const value = plane[roleId]

        if (value === undefined) {
          evidence.push(
            validationEvidence(`planes.${planeName}.${roleId}`, definition.id, {
              plane: planeName,
              role: roleId,
            }),
          )
          continue
        }

        const color = parsedColor(value)
        const alphaContract = generatedThemeRegistry.alphaContracts.find(
          (record) => record.roleId === roleId,
        )
        const requiredAlpha = alphaContract?.minimumAlpha ?? 1

        if (color === null || !isInSrgbGamut(color) || color.alpha !== requiredAlpha) {
          evidence.push(
            validationEvidence(`planes.${planeName}.${roleId}`, definition.id, {
              plane: planeName,
              role: roleId,
              submittedValue: value,
              ...(typeof color?.alpha === 'number' ? { actualAlpha: color.alpha } : {}),
              requiredAlphaPolicy: `exact:${String(requiredAlpha)}`,
            }),
          )
        }
      }

      for (const pair of generatedThemeRegistry.namedContrasts) {
        if (pair.staticMaterialProjections.length !== 0) {
          continue
        }

        const foreground = plane[pair.foregroundRole]
        const background = plane[pair.backgroundRole]

        if (foreground === undefined || background === undefined) {
          continue
        }

        const foregroundColor = parsedColor(foreground)
        const backgroundColor = parsedColor(background)

        if (foregroundColor === null || backgroundColor === null) {
          continue
        }

        const actualRatio = calculateWcag21Contrast(foregroundColor, backgroundColor)
        const requiredRatio = contrast === 'enhanced' ? pair.enhancedMinimum : pair.standardMinimum

        if (actualRatio < requiredRatio) {
          evidence.push(
            validationEvidence(`planes.${planeName}`, definition.id, {
              plane: planeName,
              contrastPairId: pair.id,
              actualRatio,
              requiredRatio,
            }),
          )
        }
      }
    }

    const standard = colorPlane(definition, colorMode, 'standard')
    const enhanced = colorPlane(definition, colorMode, 'enhanced')
    const enhancedDuplicatesStandard = roleIds.every(
      (roleId) => standard[roleId] === enhanced[roleId],
    )
    const stricterPairs = generatedThemeRegistry.namedContrasts.filter(
      (pair) =>
        pair.staticMaterialProjections.length === 0 && pair.enhancedMinimum > pair.standardMinimum,
    )
    const stricterEndpointsUnchanged = stricterPairs.every(
      (pair) =>
        standard[pair.foregroundRole] === enhanced[pair.foregroundRole] &&
        standard[pair.backgroundRole] === enhanced[pair.backgroundRole],
    )

    if (enhancedDuplicatesStandard || stricterEndpointsUnchanged) {
      evidence.push(
        validationEvidence(`planes.${colorMode}.enhanced`, definition.id, {
          roleContractVersion: definition.roleContractVersion,
          plane: `${colorMode}.enhanced`,
        }),
      )
    }
  }

  return evidence
}

export function validateCustomThemeDefinition(input: unknown): CustomThemeValidationResult {
  const themeId = submittedThemeId(input)
  const receivedRoleContractVersion = isRecord(input) ? input['roleContractVersion'] : undefined

  if (receivedRoleContractVersion === legacyCustomThemeRoleContractVersion) {
    const normalized = normalizeLegacyCustomThemeDefinition(input)

    if (normalized === null) {
      const parsed = legacyCustomThemeDefinitionSchema.safeParse(input)

      return {
        status: 'rejected',
        code: 'THEME_INVALID',
        registryKind: 'custom',
        themeId,
        evidence: parsed.success
          ? [validationEvidence('<root>', themeId)]
          : parsed.error.issues.map((issue) =>
              validationEvidence(issue.path.map(String).join('.') || '<root>', themeId),
            ),
      }
    }

    const evidence = validateCustomThemePlanes(normalized)

    if (evidence.length !== 0) {
      return {
        status: 'rejected',
        code: 'THEME_INVALID',
        registryKind: 'custom',
        themeId: normalized.id,
        evidence,
      }
    }

    return {
      status: 'rebound',
      code: 'ROLE_CONTRACT_REBOUND_NON_COLOR_ONLY',
      entry: {
        registryKind: 'custom',
        themeId: normalized.id,
        definition: normalized,
      },
      previousRoleContractVersion: legacyCustomThemeRoleContractVersion,
      currentRoleContractVersion: generatedThemeRegistry.roleContractVersion,
    }
  }

  if (
    themeId !== null &&
    typeof receivedRoleContractVersion === 'number' &&
    receivedRoleContractVersion !== generatedThemeRegistry.roleContractVersion
  ) {
    return {
      status: 'rejected',
      code: 'ROLE_CONTRACT_MISMATCH',
      registryKind: 'custom',
      themeId,
      receivedRoleContractVersion,
      requiredRoleContractVersion: generatedThemeRegistry.roleContractVersion,
    }
  }

  const parsed = customThemeDefinitionSchema.safeParse(input)

  if (!parsed.success) {
    return {
      status: 'rejected',
      code: 'THEME_INVALID',
      registryKind: 'custom',
      themeId,
      evidence: parsed.error.issues.map((issue) =>
        validationEvidence(issue.path.map(String).join('.') || '<root>', themeId),
      ),
    }
  }

  const evidence = validateCustomThemePlanes(parsed.data)

  if (evidence.length !== 0) {
    return {
      status: 'rejected',
      code: 'THEME_INVALID',
      registryKind: 'custom',
      themeId: parsed.data.id,
      evidence,
    }
  }

  return {
    status: 'validated',
    entry: {
      registryKind: 'custom',
      themeId: parsed.data.id,
      definition: parsed.data,
    },
  }
}

export function resolveThemeReference({
  reference,
  customThemeRegistry,
  rejectedCustomTheme,
}: {
  readonly reference: ThemeReference
  readonly customThemeRegistry: readonly CustomThemeRegistryEntry[] | null
  readonly rejectedCustomTheme?: CustomThemeValidationResult
}): ThemeReferenceResolutionResult {
  if (reference.registryKind === 'built-in') {
    const generatedEntry = generatedThemeRegistry.builtInEntries.find(
      (entry) => entry.themeId === reference.themeId,
    )

    if (generatedEntry === undefined) {
      return {
        status: 'unresolved',
        reference,
        code: 'THEME_NOT_FOUND',
      }
    }

    return {
      status: 'resolved',
      reference,
      entry: {
        registryKind: 'built-in',
        themeId: generatedEntry.themeId,
        definition: generatedEntry.definition,
      },
    }
  }

  if (customThemeRegistry === null) {
    if (
      rejectedCustomTheme?.status === 'rejected' &&
      rejectedCustomTheme.themeId === reference.themeId
    ) {
      if (rejectedCustomTheme.code === 'THEME_INVALID') {
        return {
          status: 'unresolved',
          reference,
          code: 'THEME_INVALID',
          evidence: rejectedCustomTheme.evidence,
        }
      }

      return {
        status: 'unresolved',
        reference,
        code: 'ROLE_CONTRACT_MISMATCH',
        receivedRoleContractVersion: rejectedCustomTheme.receivedRoleContractVersion,
        requiredRoleContractVersion: rejectedCustomTheme.requiredRoleContractVersion,
      }
    }

    return {
      status: 'unresolved',
      reference,
      code: 'THEME_INACCESSIBLE',
    }
  }

  const entry = customThemeRegistry.find((candidate) => candidate.themeId === reference.themeId)

  if (entry === undefined) {
    return {
      status: 'unresolved',
      reference,
      code: 'THEME_NOT_FOUND',
    }
  }

  return {
    status: 'resolved',
    reference,
    entry,
  }
}

interface ThemeBankStyleTarget {
  getPropertyPriority(name: string): string
  getPropertyValue(name: string): string
  removeProperty(name: string): string
  setProperty(name: string, value: string, priority?: string): void
}

interface ThemeBankTarget {
  readonly style: ThemeBankStyleTarget
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  removeAttribute(name: string): void
  setAttribute(name: string, value: string): void
}

interface CapturedBankProperty {
  readonly name: string
  readonly present: boolean
  readonly priority: string
  readonly value: string
}

interface CapturedIdentityAttribute {
  readonly name: 'data-theme' | 'data-theme-kind'
  readonly present: boolean
  readonly value: string | null
}

const installedCustomThemeBanks = new WeakMap<ThemeBankTarget, CustomThemeRegistryEntry>()

function restoreIdentityAttribute(
  target: ThemeBankTarget,
  attribute: CapturedIdentityAttribute,
): void {
  if (attribute.present && attribute.value !== null) {
    target.setAttribute(attribute.name, attribute.value)
  } else {
    target.removeAttribute(attribute.name)
  }
}

function createThemeBankRollback(target: ThemeBankTarget): () => void {
  const properties: CapturedBankProperty[] = generatedThemeRegistry.customBankVariables.map(
    (name) => {
      const value = target.style.getPropertyValue(name)
      const priority = target.style.getPropertyPriority(name)

      return {
        name,
        present: value !== '' || priority !== '',
        priority,
        value,
      }
    },
  )
  const identityAttributes: CapturedIdentityAttribute[] = [
    {
      name: 'data-theme-kind',
      present: target.hasAttribute('data-theme-kind'),
      value: target.getAttribute('data-theme-kind'),
    },
    {
      name: 'data-theme',
      present: target.hasAttribute('data-theme'),
      value: target.getAttribute('data-theme'),
    },
  ]
  const previousBankState = installedCustomThemeBanks.get(target)

  return () => {
    for (const property of properties) {
      if (property.present) {
        target.style.setProperty(property.name, property.value, property.priority)
      } else {
        target.style.removeProperty(property.name)
      }
    }

    for (const attribute of identityAttributes) {
      restoreIdentityAttribute(target, attribute)
    }

    if (previousBankState === undefined) {
      installedCustomThemeBanks.delete(target)
    } else {
      installedCustomThemeBanks.set(target, previousBankState)
    }
  }
}

function customBankValues(
  entry: CustomThemeRegistryEntry,
): readonly { readonly name: string; readonly value: string }[] | null {
  const sourceRecords = generatedThemeRegistry.builtInEntries[0].bank.records

  const values = sourceRecords.map((record) => ({
    name: record.bankVariable,
    value: entry.definition.planes[record.colorMode][record.contrast][record.publicRole],
  }))

  if (
    values.length !== generatedThemeRegistry.customBankVariables.length ||
    values.some(
      (value, index) =>
        value.name !== generatedThemeRegistry.customBankVariables[index] ||
        typeof value.value !== 'string',
    )
  ) {
    return null
  }

  return values as readonly { readonly name: string; readonly value: string }[]
}

export function installCustomThemeBank(
  target: ThemeBankTarget,
  entry: CustomThemeRegistryEntry,
): ThemeBankInstallationResult {
  const validation = validateCustomThemeDefinition(entry.definition)

  if (
    (validation.status !== 'validated' && validation.status !== 'rebound') ||
    validation.entry.themeId !== entry.themeId
  ) {
    return { status: 'rejected' }
  }

  const values = customBankValues(validation.entry)

  if (values === null) {
    return { status: 'rejected' }
  }

  const rollback = createThemeBankRollback(target)

  try {
    for (const name of generatedThemeRegistry.customBankVariables) {
      target.style.removeProperty(name)
    }

    for (const value of values) {
      target.style.setProperty(value.name, value.value)
    }

    target.setAttribute('data-theme-kind', 'custom')
    target.setAttribute('data-theme', validation.entry.themeId)
    installedCustomThemeBanks.set(target, validation.entry)
    return { status: 'installed' }
  } catch (installationError) {
    try {
      rollback()
    } catch (rollbackError) {
      throw new AggregateError(
        [installationError, rollbackError],
        'Custom Theme Bank installation and rollback both failed.',
      )
    }

    return { status: 'rejected' }
  }
}

export function clearCustomThemeBank(target: ThemeBankTarget): void {
  const rollback = createThemeBankRollback(target)

  try {
    for (const name of generatedThemeRegistry.customBankVariables) {
      target.style.removeProperty(name)
    }

    installedCustomThemeBanks.delete(target)
  } catch (error) {
    rollback()
    throw error
  }
}
