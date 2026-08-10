import type { Format } from 'style-dictionary/types'

import {
  builtInThemeIds,
  completeThemeRoleContractVersion,
  completeThemeSchemaVersion,
} from '../../schema/complete-theme.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import {
  generatedNotice,
  requireBuildResult,
  resolvedCssValue,
  selectTokensForOutput,
  stableJson,
  type FormatContext,
} from './shared'
import { preInitializationSafetyBaseline } from './first-paint'
import { themeRegistryDocument } from './typescript'

const manifestRecordFamilies = [
  'tokens',
  'activePublicRoles',
  'unoCssMappings',
  'namedContrasts',
  'alphaContracts',
  'densities',
  'themes',
  'firstPaint',
] as const

const manifestMetadataKeys = [
  'generatedNotice',
  'schemaVersion',
  'sourceFiles',
  'compoundBudget',
  'governance',
] as const

const forbiddenManifestSizeGovernanceFields = new Set<string>([
  'currentGzipBytes',
  'baselineGzipBytes',
  'expectedGzipByteDelta',
  'gzipHardLimitBytes',
])

const manifestGovernanceContract = {
  schemaVersion: 7,
  compressionProfileId: 'node-zlib-gzip-sync',
  records: {
    baselineCount: 174,
    expectedCountDelta: 7,
    expectedCounts: {
      tokens: 105,
      activePublicRoles: 27,
      unoCssMappings: 27,
      namedContrasts: 14,
      alphaContracts: 1,
      densities: 3,
      themes: 3,
      firstPaint: 1,
    },
  },
} as const

type ManifestRecordFamily = (typeof manifestRecordFamilies)[number]
type ManifestDocument = Record<string, unknown>
type ThemeColorMode = 'dark' | 'light'
type ThemeContrast = 'enhanced' | 'standard'

const themeColorModes = ['light', 'dark'] as const satisfies readonly ThemeColorMode[]
const themeContrasts = ['standard', 'enhanced'] as const satisfies readonly ThemeContrast[]
const themeRecordKeys = [
  'activationStatus',
  'registryKind',
  'themeId',
  'label',
  'source',
  'schemaVersion',
  'roleContractVersion',
  'planes',
  'bank',
] as const
const themeBankRecordKeys = [
  'colorMode',
  'contrast',
  'publicRole',
  'sourceField',
  'authoredValue',
  'bankVariable',
  'publicBinding',
] as const
const firstPaintCapabilities = {
  preferenceStorageKeyAttribute: true,
  preferenceStorageRead: true,
  explicitThemePreferenceValidation: true,
  legacyPreferenceMigration: true,
  builtInThemeResolution: true,
  atomicAppearanceApplication: true,
  synchronousCustomThemeResolution: false,
  customThemeRuntimeResolution: true,
  themeRegistryStorageKeyAttribute: false,
} as const

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function manifestRecordCounts(document: ManifestDocument): Record<ManifestRecordFamily, number> {
  return Object.fromEntries(
    manifestRecordFamilies.map((family) => {
      const records = document[family]

      if (!Array.isArray(records)) {
        throw new Error(`Manifest record family "${family}" must be an array.`)
      }

      return [family, records.length]
    }),
  ) as Record<ManifestRecordFamily, number>
}

function manifestRecordCount(counts: Record<ManifestRecordFamily, number>): number {
  return manifestRecordFamilies.reduce((total, family) => total + counts[family], 0)
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  description: string,
): void {
  const actual = Object.keys(value).sort(compareCodePoints)
  const expected = [...expectedKeys].sort(compareCodePoints)

  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(
      `${description}: expected [${expected.join(', ')}], received [${actual.join(', ')}].`,
    )
  }
}

function validateNoForbiddenManifestSizeGovernance(value: unknown, path = 'Manifest'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateNoForbiddenManifestSizeGovernance(item, `${path}[${String(index)}]`)
    })
    return
  }

  if (!isUnknownRecord(value)) {
    return
  }

  for (const [key, item] of Object.entries(value)) {
    if (forbiddenManifestSizeGovernanceFields.has(key)) {
      throw new Error(`${path}.${key}: forbidden Manifest size self-governance field.`)
    }

    validateNoForbiddenManifestSizeGovernance(item, `${path}.${key}`)
  }
}

function requireRecord(value: unknown, description: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new Error(`${description}: expected an object.`)
  }

  return value
}

function requireRecords(value: unknown, description: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.every(isUnknownRecord)) {
    throw new Error(`${description}: expected an object array.`)
  }

  return value
}

function publicColorRoleContracts(document: ManifestDocument): Record<string, unknown>[] {
  const records = requireRecords(
    document['activePublicRoles'],
    'Manifest Active Public Role records',
  ).filter(
    (record) =>
      record['tokenType'] === 'color' &&
      record['themePlaneApplicability'] === 'target-required-after-atomic-cutover',
  )

  if (records.length !== 9) {
    throw new Error(
      `Manifest active Public Color Role count: expected 9, received ${String(records.length)}.`,
    )
  }

  for (const record of records) {
    if (typeof record['id'] !== 'string' || typeof record['cssVariable'] !== 'string') {
      throw new Error('Manifest active Public Color Role identity/binding is malformed.')
    }
  }

  return records
}

function expectedBankVariable(
  colorMode: ThemeColorMode,
  contrast: ThemeContrast,
  publicBinding: string,
): string {
  const prefix = '--ui-color-'

  if (!publicBinding.startsWith(prefix)) {
    throw new Error(`${publicBinding}: Manifest Public Color binding has an invalid namespace.`)
  }

  return `--ui-theme-bank-${colorMode}-${contrast}-${publicBinding.slice(prefix.length)}`
}

function validateActiveThemeManifest(document: ManifestDocument): void {
  const themes = requireRecords(document['themes'], 'Manifest Theme records')
  const publicColors = publicColorRoleContracts(document)
  const publicRoleIds = publicColors.map((record) => record['id'] as string)

  if (themes.length !== builtInThemeIds.length) {
    throw new Error(
      `Manifest Built-in Theme count: expected ${String(builtInThemeIds.length)}, received ${String(themes.length)}.`,
    )
  }

  for (const [themeIndex, theme] of themes.entries()) {
    const expectedThemeId = builtInThemeIds[themeIndex]
    const description = `Manifest themes[${String(themeIndex)}]`

    assertExactKeys(theme, themeRecordKeys, description)

    if (
      expectedThemeId === undefined ||
      theme['activationStatus'] !== 'ACTIVE' ||
      theme['registryKind'] !== 'built-in' ||
      theme['themeId'] !== expectedThemeId ||
      typeof theme['label'] !== 'string' ||
      typeof theme['source'] !== 'string' ||
      theme['schemaVersion'] !== completeThemeSchemaVersion ||
      theme['roleContractVersion'] !== completeThemeRoleContractVersion
    ) {
      throw new Error(`${description}: active Built-in Theme identity/metadata is malformed.`)
    }

    const planes = requireRecord(theme['planes'], `${description}.planes`)
    const bank = requireRecord(theme['bank'], `${description}.bank`)

    assertExactKeys(planes, themeColorModes, `${description}.planes`)
    assertExactKeys(bank, ['visibility', 'records'], `${description}.bank`)

    if (bank['visibility'] !== 'ui-internal') {
      throw new Error(`${description}.bank.visibility must equal "ui-internal".`)
    }

    const bankRecords = requireRecords(bank['records'], `${description}.bank.records`)
    const expectedRecordCount = themeColorModes.length * themeContrasts.length * publicColors.length

    if (bankRecords.length !== expectedRecordCount) {
      throw new Error(
        `${description}.bank.records: expected ${String(expectedRecordCount)}, received ${String(bankRecords.length)}.`,
      )
    }

    let recordIndex = 0

    for (const colorMode of themeColorModes) {
      const modePlanes = requireRecord(planes[colorMode], `${description}.planes.${colorMode}`)

      assertExactKeys(modePlanes, themeContrasts, `${description}.planes.${colorMode}`)

      for (const contrast of themeContrasts) {
        const roleMap = requireRecord(
          modePlanes[contrast],
          `${description}.planes.${colorMode}.${contrast}`,
        )

        assertExactKeys(roleMap, publicRoleIds, `${description}.planes.${colorMode}.${contrast}`)

        for (const publicColor of publicColors) {
          const publicRole = publicColor['id'] as string
          const publicBinding = publicColor['cssVariable'] as string
          const authoredValue = roleMap[publicRole]
          const bankRecord = bankRecords[recordIndex]

          if (bankRecord === undefined) {
            throw new Error(`${description}.bank.records[${String(recordIndex)}] is missing.`)
          }

          assertExactKeys(
            bankRecord,
            themeBankRecordKeys,
            `${description}.bank.records[${String(recordIndex)}]`,
          )

          if (
            typeof authoredValue !== 'string' ||
            bankRecord['colorMode'] !== colorMode ||
            bankRecord['contrast'] !== contrast ||
            bankRecord['publicRole'] !== publicRole ||
            bankRecord['sourceField'] !== `planes.${colorMode}.${contrast}.${publicRole}` ||
            bankRecord['authoredValue'] !== authoredValue ||
            bankRecord['bankVariable'] !==
              expectedBankVariable(colorMode, contrast, publicBinding) ||
            bankRecord['publicBinding'] !== publicBinding
          ) {
            throw new Error(
              `${description}.bank.records[${String(recordIndex)}]: active Theme Bank projection is malformed.`,
            )
          }

          recordIndex += 1
        }
      }
    }
  }
}

function validateFirstPaintManifest(document: ManifestDocument): void {
  const records = requireRecords(document['firstPaint'], 'Manifest First Paint records')

  if (records.length !== 1) {
    throw new Error(
      `Manifest First Paint record count: expected 1, received ${String(records.length)}.`,
    )
  }

  const record = records[0]

  if (record === undefined) {
    throw new Error('Manifest First Paint record is missing.')
  }

  assertExactKeys(
    record,
    [
      'applicationKeyAgnostic',
      'safetyBaseline',
      'artifacts',
      'synchronousClassicScript',
      'storageWrite',
      'capabilities',
    ],
    'Manifest First Paint record',
  )

  const safetyBaseline = requireRecord(
    record['safetyBaseline'],
    'Manifest First Paint safety baseline',
  )
  const effectiveTheme = requireRecord(
    safetyBaseline['effectiveTheme'],
    'Manifest First Paint effective Theme',
  )
  const capabilities = requireRecord(record['capabilities'], 'Manifest First Paint capabilities')

  assertExactKeys(
    safetyBaseline,
    [
      'effectiveColorMode',
      'effectiveTheme',
      'effectiveContrast',
      'effectiveMaterial',
      'effectiveDensity',
    ],
    'Manifest First Paint safety baseline',
  )
  assertExactKeys(
    effectiveTheme,
    ['registryKind', 'themeId'],
    'Manifest First Paint effective Theme',
  )
  assertExactKeys(
    capabilities,
    Object.keys(firstPaintCapabilities),
    'Manifest First Paint capabilities',
  )

  const artifacts = record['artifacts']

  if (
    record['applicationKeyAgnostic'] !== true ||
    safetyBaseline['effectiveColorMode'] !== preInitializationSafetyBaseline.effectiveColorMode ||
    effectiveTheme['registryKind'] !==
      preInitializationSafetyBaseline.effectiveTheme.registryKind ||
    effectiveTheme['themeId'] !== preInitializationSafetyBaseline.effectiveTheme.themeId ||
    safetyBaseline['effectiveContrast'] !== preInitializationSafetyBaseline.effectiveContrast ||
    safetyBaseline['effectiveMaterial'] !== preInitializationSafetyBaseline.effectiveMaterial ||
    safetyBaseline['effectiveDensity'] !== preInitializationSafetyBaseline.effectiveDensity ||
    !Array.isArray(artifacts) ||
    artifacts.length !== 2 ||
    artifacts[0] !== 'appearance-init.js' ||
    artifacts[1] !== 'critical-theme.css' ||
    record['synchronousClassicScript'] !== true ||
    record['storageWrite'] !== false ||
    Object.entries(firstPaintCapabilities).some(
      ([capability, expected]) => capabilities[capability] !== expected,
    )
  ) {
    throw new Error('Manifest First Paint metadata does not match its exact active contract.')
  }
}

export function manifestDocument(result: TokenBuildResult): ManifestDocument {
  const materialProjectionsByRole = new Map(
    result.materialRoles.map((record) => [record.name, [...record.projections]]),
  )
  const activePublicRoles = result.activePublicRoles.map((record) => ({
    ...record,
    unocss: {
      ...record.unocss,
      classes: [...record.unocss.classes],
      allowedCssProperties: [...record.unocss.allowedCssProperties],
    },
  }))
  const unoCssMappings = result.unoCssMappings.map((record) => ({
    ...record,
    classes: [...record.classes],
    allowedCssProperties: [...record.allowedCssProperties],
  }))
  const namedContrasts = result.namedContrasts.map((record) => ({
    ...record,
    staticMaterialProjections: [...record.staticMaterialProjections],
  }))
  const alphaContracts = result.alphaContracts.map((record) => ({ ...record }))
  const densities = result.densityPresets.map((id) => ({ id }))
  const themes = themeRegistryDocument(result).builtInEntries.map((entry) => ({
    activationStatus: 'ACTIVE' as const,
    registryKind: entry.registryKind,
    themeId: entry.themeId,
    label: entry.definition.label,
    source: entry.source,
    schemaVersion: entry.definition.schemaVersion,
    roleContractVersion: entry.definition.roleContractVersion,
    planes: entry.definition.planes,
    bank: {
      visibility: entry.bank.visibility,
      records: entry.bank.records.map((record) => ({
        colorMode: record.colorMode,
        contrast: record.contrast,
        publicRole: record.publicRole,
        sourceField: record.sourceField,
        authoredValue: record.authoredValue,
        bankVariable: record.bankVariable,
        publicBinding: record.publicBinding,
      })),
    },
  }))
  const firstPaint = [
    {
      applicationKeyAgnostic: true,
      safetyBaseline: preInitializationSafetyBaseline,
      artifacts: ['appearance-init.js', 'critical-theme.css'],
      synchronousClassicScript: true,
      storageWrite: false,
      capabilities: firstPaintCapabilities,
    },
  ]
  const tokens = selectTokensForOutput(result, 'manifest').map((token) => {
    const materialProjections = materialProjectionsByRole.get(token.role.name)

    return {
      name: token.path,
      type: token.type,
      tier: token.tier,
      visibility: token.visibility,
      source: token.source,
      conditions: token.conditions,
      role: token.role,
      resolvedValue: resolvedCssValue(token, result),
      ...(token.compound === undefined ? {} : { compound: token.compound }),
      ...(token.cssVariable === undefined ? {} : { cssVariable: token.cssVariable }),
      ...(materialProjections === undefined ? {} : { materialProjections }),
    }
  })
  const counts = {
    tokens: tokens.length,
    activePublicRoles: activePublicRoles.length,
    unoCssMappings: unoCssMappings.length,
    namedContrasts: namedContrasts.length,
    alphaContracts: alphaContracts.length,
    densities: densities.length,
    themes: themes.length,
    firstPaint: firstPaint.length,
  } satisfies Record<ManifestRecordFamily, number>
  const count = manifestRecordCount(counts)

  return {
    generatedNotice,
    schemaVersion: manifestGovernanceContract.schemaVersion,
    sourceFiles: result.sourceFiles,
    compoundBudget: {
      limit: result.colorCompoundBudget,
      used: result.compounds.length,
    },
    governance: {
      recordFamilies: manifestRecordFamilies,
      recordCounts: counts,
      recordCount: count,
      baselineRecordCount: manifestGovernanceContract.records.baselineCount,
      expectedRecordCountDelta: manifestGovernanceContract.records.expectedCountDelta,
      compressionProfileId: manifestGovernanceContract.compressionProfileId,
    },
    tokens,
    activePublicRoles,
    unoCssMappings,
    namedContrasts,
    alphaContracts,
    densities,
    themes,
    firstPaint,
  }
}

function validateManifestDocument(document: ManifestDocument): void {
  validateNoForbiddenManifestSizeGovernance(document)

  const unknownRecordFamilies = Object.entries(document)
    .filter(
      ([key, value]) =>
        Array.isArray(value) &&
        !manifestMetadataKeys.includes(key as (typeof manifestMetadataKeys)[number]) &&
        !manifestRecordFamilies.includes(key as ManifestRecordFamily),
    )
    .map(([key]) => key)

  if (unknownRecordFamilies.length > 0) {
    throw new Error(`Manifest unknown record families: ${unknownRecordFamilies.join(', ')}.`)
  }

  assertExactKeys(
    document,
    [...manifestMetadataKeys, ...manifestRecordFamilies],
    'Manifest top-level contract',
  )

  if (
    document['generatedNotice'] !== generatedNotice ||
    document['schemaVersion'] !== manifestGovernanceContract.schemaVersion ||
    !Array.isArray(document['sourceFiles']) ||
    !isUnknownRecord(document['compoundBudget'])
  ) {
    throw new Error('Manifest non-record metadata is malformed.')
  }

  validateActiveThemeManifest(document)
  validateFirstPaintManifest(document)

  const counts = manifestRecordCounts(document)
  const expectedCounts = manifestGovernanceContract.records.expectedCounts

  for (const family of manifestRecordFamilies) {
    if (counts[family] !== expectedCounts[family]) {
      throw new Error(
        `Manifest "${family}" count: expected ${String(expectedCounts[family])}, received ${String(counts[family])}.`,
      )
    }
  }

  const count = manifestRecordCount(counts)
  const expectedCount =
    manifestGovernanceContract.records.baselineCount +
    manifestGovernanceContract.records.expectedCountDelta

  if (count !== expectedCount) {
    throw new Error(
      `Manifest record equation: expected ${String(expectedCount)}, received ${String(count)}.`,
    )
  }

  const governance = document['governance']

  if (!isUnknownRecord(governance)) {
    throw new Error('Manifest governance metadata is missing.')
  }

  const governanceCounts = governance['recordCounts']

  if (!isUnknownRecord(governanceCounts)) {
    throw new Error('Manifest governance record counts are missing.')
  }

  assertExactKeys(
    governance,
    [
      'recordFamilies',
      'recordCounts',
      'recordCount',
      'baselineRecordCount',
      'expectedRecordCountDelta',
      'compressionProfileId',
    ],
    'Manifest governance contract',
  )

  if (governance['compressionProfileId'] !== manifestGovernanceContract.compressionProfileId) {
    throw new Error(
      `Manifest compressionProfileId: expected "${manifestGovernanceContract.compressionProfileId}", received "${String(governance['compressionProfileId'])}".`,
    )
  }

  if (
    !Array.isArray(governance['recordFamilies']) ||
    governance['recordFamilies'].length !== manifestRecordFamilies.length ||
    governance['recordFamilies'].some(
      (family, index) => family !== manifestRecordFamilies[index],
    ) ||
    manifestRecordFamilies.some((family) => governanceCounts[family] !== counts[family]) ||
    governance['recordCount'] !== count ||
    governance['baselineRecordCount'] !== manifestGovernanceContract.records.baselineCount ||
    governance['expectedRecordCountDelta'] !== manifestGovernanceContract.records.expectedCountDelta
  ) {
    throw new Error('Manifest governance metadata does not match its record or profile contract.')
  }
}

export function validateManifestGovernance(result: TokenBuildResult): void {
  const document = manifestDocument(result)

  validateManifestDocument(document)
}

function formatManifest(result: TokenBuildResult): string {
  const document = manifestDocument(result)

  validateManifestDocument(document)
  return stableJson(document)
}

export function createManifestFormat(context: FormatContext): Format {
  return {
    name: 'pavp/json/manifest',
    format: () => formatManifest(requireBuildResult(context)),
  }
}
