import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { format, resolveConfig } from 'prettier'

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const architecturePath = resolve(repositoryRoot, 'ARCHITECTURE.md')
const outputPath = resolve(repositoryRoot, 'apps/web/src/generated/capability-manifest.ts')
const sourceMarker = '下方唯一 JSON Fenced Block 是 Post-landing Manifest Source。'
const section13TableHeader = '| Capability | Status | Current authority |'
const mappingTableHeader = '| Manifest ID | Exact mapped §1.3 Capability records |'

type CapabilityStatus = 'ACTIVE' | 'TARGET_INACTIVE' | 'DEFERRED'
type SourceCapabilityStatus = CapabilityStatus | 'PROHIBITED'
type CapabilityImplementationStatus = 'complete' | 'not-started' | 'deferred'
type CapabilityPresentationMode = 'active-interactive' | 'active-read-only' | 'roadmap-only'

const implementationStatusByCapability: Record<CapabilityStatus, CapabilityImplementationStatus> = {
  ACTIVE: 'complete',
  TARGET_INACTIVE: 'not-started',
  DEFERRED: 'deferred',
}

const statusRank: Record<CapabilityStatus, number> = {
  ACTIVE: 0,
  TARGET_INACTIVE: 1,
  DEFERRED: 2,
}

interface CapabilityManifestRecordSource {
  readonly id: string
  readonly visibleLabel: string
  readonly summary: string
  readonly routeName: string
  readonly owner: string
  readonly prerequisiteIds: readonly string[]
  readonly admissionCondition: string
}

interface CapabilityManifestSource {
  readonly schemaVersion: 1
  readonly recordCount: 21
  readonly records: readonly CapabilityManifestRecordSource[]
}

interface CapabilityManifestRecord {
  readonly id: string
  readonly visibleLabel: string
  readonly summary: string
  readonly capabilityStatus: CapabilityStatus
  readonly implementationStatus: CapabilityImplementationStatus
  readonly presentationMode: CapabilityPresentationMode
  readonly routeName: string
  readonly owner: string
  readonly prerequisiteIds: readonly string[]
  readonly admissionCondition: string
  readonly interactive: boolean
}

interface CapabilityManifest {
  readonly schemaVersion: 1
  readonly recordCount: 21
  readonly records: readonly CapabilityManifestRecord[]
}

function parseMarkdownTable(architecture: string, header: string): string[][] {
  const lines = architecture.split('\n')
  const headerIndex = lines.findIndex((line) => line.trim() === header)

  if (headerIndex < 0) {
    throw new TypeError(`The canonical table is missing: ${header}`)
  }

  const rows: string[][] = []

  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index]

    if (!line?.startsWith('|')) break

    rows.push(
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
  }

  return rows
}

function readSection13Statuses(architecture: string): Map<string, SourceCapabilityStatus> {
  const statuses = new Map<string, SourceCapabilityStatus>()
  const known: readonly SourceCapabilityStatus[] = [
    'ACTIVE',
    'TARGET_INACTIVE',
    'DEFERRED',
    'PROHIBITED',
  ]

  for (const row of parseMarkdownTable(architecture, section13TableHeader)) {
    const name = row[0]
    const status = row[1]?.replaceAll('`', '')

    if (name === undefined || status === undefined) continue
    if (!(known as readonly string[]).includes(status)) {
      throw new TypeError(`§1.3 has an unknown Capability status: ${status}`)
    }

    statuses.set(name, status as SourceCapabilityStatus)
  }

  if (statuses.size === 0) {
    throw new TypeError('§1.3 Capability Status Registry is empty.')
  }

  return statuses
}

function readManifestMapping(architecture: string): Map<string, readonly string[]> {
  const mapping = new Map<string, readonly string[]>()

  for (const row of parseMarkdownTable(architecture, mappingTableHeader)) {
    const id = row[0]?.replaceAll('`', '')
    const sources = (row[1] ?? '')
      .split(';')
      .map((source) => source.trim().replaceAll('`', ''))
      .filter((source) => source.length > 0)

    if (id === undefined || sources.length === 0) {
      throw new TypeError('A Manifest mapping row is incomplete.')
    }

    mapping.set(id, sources)
  }

  if (mapping.size === 0) {
    throw new TypeError('The Capability Manifest mapping table is empty.')
  }

  return mapping
}

function validateSource(source: unknown): CapabilityManifestSource {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    throw new TypeError('Capability Manifest source must be an object.')
  }

  const document = source as Partial<CapabilityManifestSource>
  const records = document.records

  if (
    document.schemaVersion !== 1 ||
    document.recordCount !== 21 ||
    !Array.isArray(records) ||
    records.length !== 21
  ) {
    throw new TypeError('Capability Manifest source header is invalid.')
  }

  const typedRecords = records as readonly CapabilityManifestRecordSource[]
  const ids = typedRecords.map((record) => record.id)
  const sortedIds = [...ids].sort()

  if (
    new Set(ids).size !== ids.length ||
    ids.some((id, index) => id !== sortedIds[index]) ||
    typedRecords.some((record) =>
      record.prerequisiteIds.some((id, index) => id !== [...record.prerequisiteIds].sort()[index]),
    )
  ) {
    throw new TypeError('Capability Manifest source records are invalid.')
  }

  const knownIds = new Set(ids)

  if (typedRecords.some((record) => record.prerequisiteIds.some((id) => !knownIds.has(id)))) {
    throw new TypeError('Capability Manifest contains a dangling prerequisite.')
  }

  return document as CapabilityManifestSource
}

function deriveStatus(
  id: string,
  sources: readonly string[],
  section13: Map<string, SourceCapabilityStatus>,
): Pick<
  CapabilityManifestRecord,
  'capabilityStatus' | 'implementationStatus' | 'presentationMode' | 'interactive'
> {
  let capabilityStatus: CapabilityStatus = 'ACTIVE'

  for (const source of sources) {
    const status = section13.get(source)

    if (status === undefined) {
      throw new TypeError(`Manifest mapping references an unknown §1.3 capability: ${source}`)
    }

    if (status === 'PROHIBITED') {
      throw new TypeError(`Manifest mapping maps a PROHIBITED §1.3 capability: ${source}`)
    }

    if (statusRank[status] > statusRank[capabilityStatus]) {
      capabilityStatus = status
    }
  }

  const interactive = (id === 'appearance' || id === 'i18n') && capabilityStatus === 'ACTIVE'

  return {
    capabilityStatus,
    implementationStatus: implementationStatusByCapability[capabilityStatus],
    presentationMode:
      capabilityStatus === 'ACTIVE'
        ? interactive
          ? 'active-interactive'
          : 'active-read-only'
        : 'roadmap-only',
    interactive,
  }
}

async function readManifest(): Promise<CapabilityManifest> {
  const architecture = await readFile(architecturePath, 'utf8')
  const markerIndex = architecture.indexOf(sourceMarker)
  const fenceStart = architecture.indexOf('```json\n', markerIndex)
  const contentStart = fenceStart + '```json\n'.length
  const fenceEnd = architecture.indexOf('\n```', contentStart)

  if (markerIndex < 0 || fenceStart < 0 || fenceEnd < 0) {
    throw new TypeError('The canonical Capability Manifest source block is missing.')
  }

  const source = validateSource(JSON.parse(architecture.slice(contentStart, fenceEnd)) as unknown)
  const section13 = readSection13Statuses(architecture)
  const mapping = readManifestMapping(architecture)

  const records: CapabilityManifestRecord[] = source.records.map((record) => {
    const sources = mapping.get(record.id)

    if (sources === undefined) {
      throw new TypeError(`The Manifest record has no §1.3 mapping: ${record.id}`)
    }

    const derived = deriveStatus(record.id, sources, section13)

    return {
      id: record.id,
      visibleLabel: record.visibleLabel,
      summary: record.summary,
      capabilityStatus: derived.capabilityStatus,
      implementationStatus: derived.implementationStatus,
      presentationMode: derived.presentationMode,
      routeName: record.routeName,
      owner: record.owner,
      prerequisiteIds: record.prerequisiteIds,
      admissionCondition: record.admissionCondition,
      interactive: derived.interactive,
    }
  })

  return { schemaVersion: source.schemaVersion, recordCount: source.recordCount, records }
}

function messageKeys(id: string) {
  return {
    visibleLabel: `capability.${id}.visible-label`,
    summary: `capability.${id}.summary`,
    admissionCondition: `capability.${id}.admission-condition`,
  }
}

export async function capabilityCatalogSource(): Promise<string> {
  const manifest = await readManifest()
  const messages: Record<string, string> = {}
  for (const record of manifest.records) {
    const keys = messageKeys(record.id)
    for (const field of ['visibleLabel', 'summary', 'admissionCondition'] as const) {
      messages[keys[field]] = record[field].replace(/[@{}|]/g, (value) => `{'${value}'}`)
    }
  }
  return JSON.stringify(messages, null, 2) + '\n'
}

export async function capabilityManifestSource(): Promise<string> {
  const manifest = await readManifest()
  const keyMap = Object.fromEntries(
    manifest.records.map((record) => [record.id, messageKeys(record.id)]),
  )
  const serialized = JSON.stringify(manifest, null, 2)

  const source = `/* Generated file. Do not edit directly. */
export type CapabilityImplementationStatus = 'complete' | 'not-started' | 'deferred'

export type CapabilityPresentationMode =
  | 'active-interactive'
  | 'active-read-only'
  | 'roadmap-only'

export interface CapabilityManifestRecord {
  readonly id: string
  readonly visibleLabel: string
  readonly summary: string
  readonly capabilityStatus: 'ACTIVE' | 'TARGET_INACTIVE' | 'DEFERRED'
  readonly implementationStatus: CapabilityImplementationStatus
  readonly presentationMode: CapabilityPresentationMode
  readonly routeName: string
  readonly owner: string
  readonly prerequisiteIds: readonly string[]
  readonly admissionCondition: string
  readonly interactive: boolean
}

export interface CapabilityManifest {
  readonly schemaVersion: 1
  readonly recordCount: 21
  readonly records: readonly CapabilityManifestRecord[]
}

export const capabilityManifest = ${serialized} as const satisfies CapabilityManifest

export const capabilityMessageKeys = ${JSON.stringify(keyMap, null, 2)} as const
`

  return format(source, {
    ...(await resolveConfig(outputPath)),
    filepath: outputPath,
  })
}

async function main(): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, await capabilityManifestSource(), 'utf8')
  await writeFile(
    resolve(repositoryRoot, 'apps/web/src/shared/i18n/messages/zh-CN/capabilities.json'),
    await capabilityCatalogSource(),
    'utf8',
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
