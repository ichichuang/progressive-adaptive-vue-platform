import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { format, resolveConfig } from 'prettier'

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const architecturePath = resolve(repositoryRoot, 'ARCHITECTURE.md')
const outputPath = resolve(repositoryRoot, 'apps/web/src/generated/capability-manifest.ts')
const sourceMarker = '下方唯一 JSON Fenced Block 是 Post-landing Manifest Source。'

interface CapabilityManifestRecordSource {
  readonly id: string
  readonly visibleLabel: string
  readonly summary: string
  readonly capabilityStatus: 'ACTIVE' | 'TARGET_INACTIVE' | 'DEFERRED'
  readonly implementationStatus: 'complete' | 'not-started' | 'deferred'
  readonly presentationMode: 'active-interactive' | 'active-read-only' | 'roadmap-only'
  readonly routeName: string
  readonly owner: string
  readonly prerequisiteIds: readonly string[]
  readonly admissionCondition: string
  readonly interactive: boolean
}

interface CapabilityManifestSource {
  readonly schemaVersion: 1
  readonly recordCount: 21
  readonly records: readonly CapabilityManifestRecordSource[]
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
    typedRecords.some((record) => {
      const expectedImplementation = {
        ACTIVE: 'complete',
        TARGET_INACTIVE: 'not-started',
        DEFERRED: 'deferred',
      }[record.capabilityStatus]
      const expectedPresentation =
        record.capabilityStatus === 'ACTIVE'
          ? record.id === 'appearance' || record.id === 'i18n'
            ? 'active-interactive'
            : 'active-read-only'
          : 'roadmap-only'

      return (
        record.implementationStatus !== expectedImplementation ||
        record.presentationMode !== expectedPresentation ||
        record.interactive !==
          ((record.id === 'appearance' || record.id === 'i18n') &&
            record.capabilityStatus === 'ACTIVE') ||
        record.prerequisiteIds.some((id, index) => id !== [...record.prerequisiteIds].sort()[index])
      )
    })
  ) {
    throw new TypeError('Capability Manifest source records are invalid.')
  }

  const knownIds = new Set(ids)

  if (typedRecords.some((record) => record.prerequisiteIds.some((id) => !knownIds.has(id)))) {
    throw new TypeError('Capability Manifest contains a dangling prerequisite.')
  }

  return document as CapabilityManifestSource
}

async function readManifest(): Promise<CapabilityManifestSource> {
  const architecture = await readFile(architecturePath, 'utf8')
  const markerIndex = architecture.indexOf(sourceMarker)
  const fenceStart = architecture.indexOf('```json\n', markerIndex)
  const contentStart = fenceStart + '```json\n'.length
  const fenceEnd = architecture.indexOf('\n```', contentStart)

  if (markerIndex < 0 || fenceStart < 0 || fenceEnd < 0) {
    throw new TypeError('The canonical Capability Manifest source block is missing.')
  }

  const source: unknown = JSON.parse(architecture.slice(contentStart, fenceEnd))
  return validateSource(source)
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
