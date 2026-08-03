import type { Format } from 'style-dictionary/types'

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
  schemaVersion: 6,
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
  const completeThemesById = new Map<string, (typeof result.completeThemes)[number]>(
    result.completeThemes.map((theme) => [theme.id, theme]),
  )
  const themes = result.themes.map((theme) => {
    const completeTheme = completeThemesById.get(theme.id)

    if (completeTheme === undefined) {
      throw new Error(`${theme.id}: complete target Theme metadata is missing.`)
    }

    return {
      id: theme.id,
      label: theme.label,
      neutral: theme.palette.neutral,
      complete: {
        activationStatus: completeTheme.activationStatus,
        registryKind: completeTheme.registryKind,
        selector: completeTheme.selector,
        source: completeTheme.source,
        schemaVersion: completeTheme.schemaVersion,
        roleContractVersion: completeTheme.roleContractVersion,
        planes: completeTheme.planes,
      },
    }
  })
  const firstPaint = [
    {
      applicationKeyAgnostic: true,
      baseline: {
        colorMode: 'light',
        contrast: 'standard',
        density: 'comfortable',
        fontScale: 1,
        material: 'solid',
        motion: 'full',
        theme: 'neutral',
      },
      artifacts: ['appearance-init.js', 'critical-theme.css'],
      synchronousClassicScript: true,
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
