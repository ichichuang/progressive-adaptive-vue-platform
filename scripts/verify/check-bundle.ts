import { gzipSync } from 'node:zlib'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { projectConfig } from '../../project.config'

interface ManifestChunk {
  css?: string[]
  dynamicImports?: string[]
  file: string
  imports?: string[]
  isEntry?: boolean
}

type Manifest = Record<string, ManifestChunk>

const rootDirectory = process.cwd()
const distributionDirectory = resolve(rootDirectory, 'apps/web/dist')
const generatedSourceDirectory = resolve(rootDirectory, 'packages/design-system/src/generated')
const explicitThemePreferenceBundleContract = {
  baselineCommit: '2f5a28a7dbe877f96ac3d24299d892bd7bb9087f',
  baseline: {
    initialJavaScriptGzipBytes: 25996,
    initialCssGzipBytes: 3591,
    lazyChunks: 0,
  },
  final: {
    initialJavaScriptGzipBytes: 123935,
    initialCssGzipBytes: 7450,
    lazyChunks: 0,
  },
  delta: {
    initialJavaScriptGzipBytes: 97939,
    initialCssGzipBytes: 3859,
    lazyChunks: 0,
  },
} as const

function isManifestChunk(value: unknown): value is ManifestChunk {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate['file'] === 'string'
}

function parseManifest(value: unknown): Manifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Vite manifest must be an object.')
  }

  const entries = Object.entries(value)

  if (!entries.every(([, chunk]) => isManifestChunk(chunk))) {
    throw new Error('Vite manifest contains an invalid chunk.')
  }

  return Object.fromEntries(entries)
}

async function gzipBytes(relativePath: string): Promise<number> {
  const contents = await readFile(resolve(distributionDirectory, relativePath))
  return gzipSync(contents, {
    level: 9,
  }).byteLength
}

async function validateFirstPaintBuildOutput(): Promise<void> {
  for (const fileName of ['appearance-init.js', 'critical-theme.css'] as const) {
    const [source, emitted] = await Promise.all([
      readFile(resolve(generatedSourceDirectory, fileName)),
      readFile(resolve(distributionDirectory, 'generated', fileName)),
    ])

    if (!source.equals(emitted)) {
      throw new Error(`${fileName}: production output differs from the generated source artifact.`)
    }
  }

  const indexHtml = await readFile(resolve(distributionDirectory, 'index.html'), 'utf8')
  const criticalThemeIndex = indexHtml.indexOf('href="/generated/critical-theme.css"')
  const appearanceInitIndex = indexHtml.indexOf('src="/generated/appearance-init.js"')
  const moduleBootstrapIndex = indexHtml.indexOf('type="module"')

  if (
    criticalThemeIndex < 0 ||
    appearanceInitIndex <= criticalThemeIndex ||
    moduleBootstrapIndex <= appearanceInitIndex
  ) {
    throw new Error(
      'Production startup order must be critical theme, synchronous appearance initialization, then module bootstrap.',
    )
  }
}

function collectInitialChunks(manifest: Manifest, entryKey: string): Set<string> {
  const keys = new Set<string>()
  const pending = [entryKey]

  while (pending.length > 0) {
    const key = pending.pop()

    if (key === undefined || keys.has(key)) {
      continue
    }

    const chunk = manifest[key]

    if (chunk === undefined) {
      throw new Error(`Vite manifest references missing chunk "${key}".`)
    }

    keys.add(key)
    pending.push(...(chunk.imports ?? []))
  }

  return keys
}

const manifestValue = JSON.parse(
  await readFile(resolve(distributionDirectory, '.vite/manifest.json'), 'utf8'),
) as unknown
const manifest = parseManifest(manifestValue)
await validateFirstPaintBuildOutput()
const entry = Object.entries(manifest).find(([, chunk]) => chunk.isEntry === true)

if (entry === undefined) {
  throw new Error('Vite manifest does not contain a production entry chunk.')
}

const initialChunkKeys = collectInitialChunks(manifest, entry[0])
const initialJavaScriptFiles = new Set<string>(['generated/appearance-init.js'])
const initialCssFiles = new Set<string>(['generated/critical-theme.css'])

for (const key of initialChunkKeys) {
  const chunk = manifest[key]

  if (chunk === undefined) {
    continue
  }

  if (chunk.file.endsWith('.js')) {
    initialJavaScriptFiles.add(chunk.file)
  }

  for (const cssFile of chunk.css ?? []) {
    initialCssFiles.add(cssFile)
  }
}

const initialJavaScriptBytes = (
  await Promise.all([...initialJavaScriptFiles].map(gzipBytes))
).reduce((total, bytes) => total + bytes, 0)
const initialCssBytes = (await Promise.all([...initialCssFiles].map(gzipBytes))).reduce(
  (total, bytes) => total + bytes,
  0,
)

if (
  explicitThemePreferenceBundleContract.final.initialJavaScriptGzipBytes -
    explicitThemePreferenceBundleContract.baseline.initialJavaScriptGzipBytes !==
    explicitThemePreferenceBundleContract.delta.initialJavaScriptGzipBytes ||
  explicitThemePreferenceBundleContract.final.initialCssGzipBytes -
    explicitThemePreferenceBundleContract.baseline.initialCssGzipBytes !==
    explicitThemePreferenceBundleContract.delta.initialCssGzipBytes ||
  explicitThemePreferenceBundleContract.final.lazyChunks -
    explicitThemePreferenceBundleContract.baseline.lazyChunks !==
    explicitThemePreferenceBundleContract.delta.lazyChunks
) {
  throw new Error('Package 5 bundle baseline/final/delta arithmetic is inconsistent.')
}

if (
  initialJavaScriptBytes !==
    explicitThemePreferenceBundleContract.final.initialJavaScriptGzipBytes ||
  initialCssBytes !== explicitThemePreferenceBundleContract.final.initialCssGzipBytes
) {
  throw new Error(
    `Package 5 measured bundle drift: JavaScript ${String(initialJavaScriptBytes)}, CSS ${String(initialCssBytes)}.`,
  )
}

if (initialJavaScriptBytes > projectConfig.bundleBudgets.initialJavaScriptGzipBytes) {
  throw new Error(
    `Initial JavaScript is ${String(initialJavaScriptBytes)} gzip bytes; budget is ${String(projectConfig.bundleBudgets.initialJavaScriptGzipBytes)}.`,
  )
}

if (initialCssBytes > projectConfig.bundleBudgets.initialCssGzipBytes) {
  throw new Error(
    `Initial CSS is ${String(initialCssBytes)} gzip bytes; budget is ${String(projectConfig.bundleBudgets.initialCssGzipBytes)}.`,
  )
}

const dynamicChunkKeys = new Set(
  Object.values(manifest).flatMap((chunk) => chunk.dynamicImports ?? []),
)

for (const dynamicChunkKey of dynamicChunkKeys) {
  const chunk = manifest[dynamicChunkKey]

  if (!chunk?.file.endsWith('.js')) {
    continue
  }

  const bytes = await gzipBytes(chunk.file)

  if (bytes > projectConfig.bundleBudgets.lazyRouteJavaScriptGzipBytes) {
    throw new Error(
      `Lazy chunk ${chunk.file} is ${String(bytes)} gzip bytes; budget is ${String(projectConfig.bundleBudgets.lazyRouteJavaScriptGzipBytes)}.`,
    )
  }
}

if (dynamicChunkKeys.size !== explicitThemePreferenceBundleContract.final.lazyChunks) {
  throw new Error(
    `Package 5 lazy chunk count drift: expected ${String(explicitThemePreferenceBundleContract.final.lazyChunks)}, received ${String(dynamicChunkKeys.size)}.`,
  )
}

console.log(
  `Bundle budget: initial JavaScript ${String(initialJavaScriptBytes)} bytes gzip (${String(explicitThemePreferenceBundleContract.delta.initialJavaScriptGzipBytes)} Package 5 delta), initial CSS ${String(initialCssBytes)} bytes gzip (${String(explicitThemePreferenceBundleContract.delta.initialCssGzipBytes)} Package 5 delta), lazy chunks ${String(dynamicChunkKeys.size)}`,
)
