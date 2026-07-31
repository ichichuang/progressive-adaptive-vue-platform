import { constants, gzipSync, type ZlibOptions } from 'node:zlib'

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

const manifestGovernanceContract = {
  schemaVersion: 4,
  gzip: {
    algorithm: 'gzip -9 -n',
    baselineBytes: 3366,
    expectedByteDelta: 1878,
    hardLimitBytes: 32 * 1024,
  },
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

const manifestGzipOptions = {
  chunkSize: constants.Z_DEFAULT_CHUNK,
  finishFlush: constants.Z_FINISH,
  flush: constants.Z_NO_FLUSH,
  level: constants.Z_BEST_COMPRESSION,
  memLevel: constants.Z_DEFAULT_MEMLEVEL,
  strategy: constants.Z_DEFAULT_STRATEGY,
  windowBits: constants.Z_DEFAULT_WINDOWBITS,
} as const satisfies ZlibOptions

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
  const themes = result.themes.map((theme) => ({
    id: theme.id,
    label: theme.label,
    neutral: theme.palette.neutral,
  }))
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
      gzipAlgorithm: manifestGovernanceContract.gzip.algorithm,
      baselineGzipBytes: manifestGovernanceContract.gzip.baselineBytes,
      expectedGzipByteDelta: manifestGovernanceContract.gzip.expectedByteDelta,
      gzipHardLimitBytes: manifestGovernanceContract.gzip.hardLimitBytes,
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
      'gzipAlgorithm',
      'baselineGzipBytes',
      'expectedGzipByteDelta',
      'gzipHardLimitBytes',
    ],
    'Manifest governance contract',
  )

  if (
    !Array.isArray(governance['recordFamilies']) ||
    governance['recordFamilies'].length !== manifestRecordFamilies.length ||
    governance['recordFamilies'].some(
      (family, index) => family !== manifestRecordFamilies[index],
    ) ||
    manifestRecordFamilies.some((family) => governanceCounts[family] !== counts[family]) ||
    governance['recordCount'] !== count ||
    governance['baselineRecordCount'] !== manifestGovernanceContract.records.baselineCount ||
    governance['expectedRecordCountDelta'] !==
      manifestGovernanceContract.records.expectedCountDelta ||
    governance['gzipAlgorithm'] !== manifestGovernanceContract.gzip.algorithm ||
    governance['baselineGzipBytes'] !== manifestGovernanceContract.gzip.baselineBytes ||
    governance['expectedGzipByteDelta'] !== manifestGovernanceContract.gzip.expectedByteDelta ||
    governance['gzipHardLimitBytes'] !== manifestGovernanceContract.gzip.hardLimitBytes
  ) {
    throw new Error('Manifest governance metadata does not match its record equation or budget.')
  }
}

function validateManifestGzipBytes(gzipBytes: number): void {
  if (gzipBytes > manifestGovernanceContract.gzip.hardLimitBytes) {
    throw new Error(
      `Manifest gzip budget exceeded: ${String(gzipBytes)} bytes exceed ${String(manifestGovernanceContract.gzip.hardLimitBytes)} bytes.`,
    )
  }

  const actualDelta = gzipBytes - manifestGovernanceContract.gzip.baselineBytes

  if (actualDelta !== manifestGovernanceContract.gzip.expectedByteDelta) {
    throw new Error(
      `Manifest gzip delta: expected ${String(manifestGovernanceContract.gzip.expectedByteDelta)} bytes, received ${String(actualDelta)} bytes (${String(gzipBytes)} total).`,
    )
  }
}

function deterministicManifestGzip(serializedManifest: Buffer): Buffer {
  return gzipSync(serializedManifest, manifestGzipOptions)
}

function validateDeterministicManifestGzip(serializedManifest: Buffer): Buffer {
  const first = deterministicManifestGzip(serializedManifest)
  const repeated = deterministicManifestGzip(serializedManifest)
  const expectedHeader = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02])

  if (!first.equals(repeated)) {
    throw new Error('Manifest gzip compression must be byte-identical within one process.')
  }

  if (!first.subarray(0, expectedHeader.length).equals(expectedHeader)) {
    throw new Error('Manifest gzip header must contain no name or timestamp metadata.')
  }

  const originalPath = process.env['PATH']

  try {
    process.env['PATH'] = '/pavp-manifest-gzip-path-must-not-be-read'

    if (!first.equals(deterministicManifestGzip(serializedManifest))) {
      throw new Error('Manifest gzip compression must not depend on the process PATH.')
    }
  } finally {
    if (originalPath === undefined) {
      delete process.env['PATH']
    } else {
      process.env['PATH'] = originalPath
    }
  }

  return first
}

export function validateManifestGovernance(result: TokenBuildResult): number {
  const document = manifestDocument(result)

  validateManifestDocument(document)

  const serializedManifest = Buffer.from(stableJson(document), 'utf8')
  const gzipBytes = validateDeterministicManifestGzip(serializedManifest).byteLength

  validateManifestGzipBytes(gzipBytes)
  return gzipBytes
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
