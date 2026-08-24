import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { routeRegistry } from '../../apps/web/src/app/router/route-registry'
import { capabilityManifest } from '../../apps/web/src/generated/capability-manifest'
import { capabilityManifestSource } from './generate-capability-manifest'

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const outputPath = resolve(repositoryRoot, 'apps/web/src/generated/capability-manifest.ts')
export async function validateCapabilityManifest(): Promise<string[]> {
  const violations: string[] = []
  const routeNames = new Set(routeRegistry.map((record) => record.name))
  const actual = await readFile(outputPath, 'utf8')
  const expected = await capabilityManifestSource()

  if (actual !== expected) {
    violations.push('Capability Manifest regeneration equality failed.')
  }

  if (capabilityManifest.records.some((record) => !routeNames.has(record.routeName))) {
    violations.push('Capability Manifest contains a dangling route reference.')
  }

  return violations
}

if (process.argv[1]?.endsWith('check-capability-manifest.ts')) {
  const violations = await validateCapabilityManifest()

  if (violations.length > 0) {
    throw new Error(violations.join('\n'))
  }

  console.log('Capability Manifest check: passed')
}
