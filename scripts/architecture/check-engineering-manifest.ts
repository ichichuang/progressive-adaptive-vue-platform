import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { engineeringManifestSource } from './generate-engineering-manifest'

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const outputPath = resolve(repositoryRoot, 'apps/web/src/generated/engineering-manifest.ts')

export async function validateEngineeringManifest(): Promise<string[]> {
  const actual = await readFile(outputPath, 'utf8')
  const expected = await engineeringManifestSource()

  return actual === expected ? [] : ['Engineering Manifest regeneration equality failed.']
}

if (process.argv[1]?.endsWith('check-engineering-manifest.ts')) {
  const violations = await validateEngineeringManifest()

  if (violations.length > 0) {
    throw new Error(violations.join('\n'))
  }

  console.log('Engineering Manifest check: passed')
}
