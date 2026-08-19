import { execFileSync } from 'node:child_process'
import { constants, gzipSync, type ZlibOptions } from 'node:zlib'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { projectConfig } from '../../project.config'
import { routeRegistry } from '../../apps/web/src/app/router/route-registry'
import ts from 'typescript'

interface ManifestChunk {
  css?: string[]
  dynamicImports?: string[]
  file: string
  imports?: string[]
  isEntry?: boolean
}

type Manifest = Record<string, ManifestChunk>

interface HtmlStartTag {
  attributes: ReadonlyMap<string, string | null>
  index: number
  name: string
}

interface ProductionHtmlExpectation {
  readonly appearanceInitializerPath: string
  readonly criticalThemePath: string
  readonly entryPath: string
  readonly initialCssPaths: ReadonlySet<string>
  readonly runtimeConfigurationUrl: string
}

interface GzipMeasurement {
  readonly bytes: number
  readonly releaseShaReplacements: number
}

interface ReleaseShaMeasurementNormalization {
  readonly canonicalReleaseSha: string
  readonly currentReleaseSha: string
}

const rootDirectory = process.cwd()
const distributionDirectory = resolve(rootDirectory, 'apps/web/dist')
const generatedSourceDirectory = resolve(rootDirectory, 'packages/design-system/src/generated')
const rootPackageManifestPath = resolve(rootDirectory, 'package.json')
const runtimeConfigurationArtifactName = 'runtime-configuration.json'
const deploymentBase: string = projectConfig.deployment.deploymentBase
const releaseShaOutputPattern = /^([0-9a-f]{40})(?:\r?\n)?$/u
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
const runtimeKernelBundleContract = {
  baselineCommit: 'fe4a0f7598e000a62d6f45da85711f308ae54971',
  canonicalMeasurementReleaseSha: '3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177',
  baseline: {
    initialJavaScriptGzipBytes:
      explicitThemePreferenceBundleContract.final.initialJavaScriptGzipBytes,
    initialCssGzipBytes: explicitThemePreferenceBundleContract.final.initialCssGzipBytes,
    lazyChunks: explicitThemePreferenceBundleContract.final.lazyChunks,
  },
  final: {
    initialJavaScriptGzipBytes: 132064,
    initialCssGzipBytes: 7457,
    lazyChunks: 0,
  },
  delta: {
    initialJavaScriptGzipBytes: 8129,
    initialCssGzipBytes: 7,
    lazyChunks: 0,
  },
} as const
const productionBundleGzipOptions = {
  chunkSize: constants.Z_DEFAULT_CHUNK,
  finishFlush: constants.Z_FINISH,
  flush: constants.Z_NO_FLUSH,
  level: constants.Z_BEST_COMPRESSION,
  memLevel: constants.Z_DEFAULT_MEMLEVEL,
  strategy: constants.Z_DEFAULT_STRATEGY,
  windowBits: constants.Z_DEFAULT_WINDOWBITS,
} as const satisfies ZlibOptions
const expectedLazyRouteKeys = new Set(
  routeRegistry.map((record) => record.sourcePath.replace(/^apps\/web\//u, '')),
)

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

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHtmlWhitespace(value: string | undefined): boolean {
  return value !== undefined && /[\t\n\f\r ]/u.test(value)
}

function parseHtmlAttributes(source: string, tagName: string): ReadonlyMap<string, string | null> {
  const attributes = new Map<string, string | null>()
  let cursor = 0

  while (cursor < source.length) {
    while (isHtmlWhitespace(source[cursor])) {
      cursor += 1
    }

    if (cursor >= source.length || source[cursor] === '/') {
      break
    }

    const nameStart = cursor

    while (
      cursor < source.length &&
      !isHtmlWhitespace(source[cursor]) &&
      source[cursor] !== '=' &&
      source[cursor] !== '/' &&
      source[cursor] !== '>'
    ) {
      cursor += 1
    }

    if (cursor === nameStart) {
      throw new Error(`Production HTML contains an invalid ${tagName} attribute.`)
    }

    const attributeName = source.slice(nameStart, cursor).toLowerCase()

    if (attributes.has(attributeName)) {
      throw new Error(
        `Production HTML contains duplicate ${attributeName} attributes on ${tagName}.`,
      )
    }

    while (isHtmlWhitespace(source[cursor])) {
      cursor += 1
    }

    let attributeValue: string | null = null

    if (source[cursor] === '=') {
      cursor += 1

      while (isHtmlWhitespace(source[cursor])) {
        cursor += 1
      }

      const quote = source[cursor]

      if (quote === '"' || quote === "'") {
        cursor += 1
        const valueStart = cursor

        while (cursor < source.length && source[cursor] !== quote) {
          cursor += 1
        }

        if (cursor >= source.length) {
          throw new Error(`Production HTML contains an unterminated ${attributeName} value.`)
        }

        attributeValue = source.slice(valueStart, cursor)
        cursor += 1
      } else {
        const valueStart = cursor

        while (
          cursor < source.length &&
          !isHtmlWhitespace(source[cursor]) &&
          !['"', "'", '`', '<', '=', '>'].includes(source[cursor] ?? '')
        ) {
          cursor += 1
        }

        if (cursor === valueStart) {
          throw new Error(`Production HTML contains an empty unquoted ${attributeName} value.`)
        }

        attributeValue = source.slice(valueStart, cursor)
      }
    }

    attributes.set(attributeName, attributeValue)
  }

  return attributes
}

function findHtmlTagEnd(html: string, start: number, tagName: string): number {
  let cursor = start
  let quote: '"' | "'" | null = null

  while (cursor < html.length) {
    const character = html[cursor]

    if (quote !== null) {
      if (character === quote) {
        quote = null
      }
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      return cursor
    }

    cursor += 1
  }

  throw new Error(`Production HTML contains an unterminated ${tagName} tag.`)
}

function findRawTextEnd(lowercaseHtml: string, start: number, tagName: string): number {
  const marker = `</${tagName}`
  let candidate = lowercaseHtml.indexOf(marker, start)

  while (candidate >= 0) {
    const boundary = lowercaseHtml[candidate + marker.length]

    if (boundary === '>' || isHtmlWhitespace(boundary)) {
      return candidate
    }

    candidate = lowercaseHtml.indexOf(marker, candidate + marker.length)
  }

  throw new Error(`Production HTML contains an unterminated ${tagName} raw-text element.`)
}

function parseHtmlStartTags(html: string): readonly HtmlStartTag[] {
  const tags: HtmlStartTag[] = []
  const lowercaseHtml = html.toLowerCase()
  const rawTextElements = new Set([
    'iframe',
    'noembed',
    'noframes',
    'noscript',
    'script',
    'style',
    'textarea',
    'title',
    'xmp',
  ])
  const inertElementStack: string[] = []
  let cursor = 0

  while (cursor < html.length) {
    const startIndex = html.indexOf('<', cursor)

    if (startIndex < 0) {
      break
    }

    if (html.startsWith('<!--', startIndex)) {
      const commentEnd = html.indexOf('-->', startIndex + 4)

      if (commentEnd < 0) {
        throw new Error('Production HTML contains an unterminated comment.')
      }

      cursor = commentEnd + 3
      continue
    }

    if (html.startsWith('</', startIndex)) {
      let nameEnd = startIndex + 2

      while (/[A-Za-z0-9:-]/u.test(html[nameEnd] ?? '')) {
        nameEnd += 1
      }

      const name = html.slice(startIndex + 2, nameEnd).toLowerCase()
      const tagEnd = findHtmlTagEnd(html, nameEnd, name || 'closing')

      if (inertElementStack.at(-1) === name) {
        inertElementStack.pop()
      }

      cursor = tagEnd + 1
      continue
    }

    if (html.startsWith('<!', startIndex) || html.startsWith('<?', startIndex)) {
      cursor = findHtmlTagEnd(html, startIndex + 2, 'declaration') + 1
      continue
    }

    const firstNameCharacter = html[startIndex + 1]

    if (firstNameCharacter === undefined || !/[A-Za-z]/u.test(firstNameCharacter)) {
      cursor = startIndex + 1
      continue
    }

    let nameEnd = startIndex + 2

    while (/[A-Za-z0-9:-]/u.test(html[nameEnd] ?? '')) {
      nameEnd += 1
    }

    const name = html.slice(startIndex + 1, nameEnd).toLowerCase()

    if (name === 'plaintext') {
      throw new Error('Production HTML may not contain a plaintext raw-text element.')
    }

    const tagEnd = findHtmlTagEnd(html, nameEnd, name)
    const attributeSource = html.slice(nameEnd, tagEnd)

    if (inertElementStack.length === 0) {
      tags.push({
        attributes: parseHtmlAttributes(attributeSource, name),
        index: startIndex,
        name,
      })
    }

    if (name === 'template' || name === 'noscript') {
      inertElementStack.push(name)
    }

    cursor = tagEnd + 1

    if (rawTextElements.has(name)) {
      cursor = findRawTextEnd(lowercaseHtml, cursor, name)
    }
  }

  if (inertElementStack.length !== 0) {
    throw new Error('Production HTML contains an unterminated inert element.')
  }

  return tags
}

function productionHtmlViolations(
  html: string,
  expectation: ProductionHtmlExpectation,
): readonly string[] {
  let tags: readonly HtmlStartTag[]

  try {
    tags = parseHtmlStartTags(html)
  } catch (error: unknown) {
    return [error instanceof Error ? error.message : 'Production HTML parsing failed.']
  }

  const violations: string[] = []
  const scripts = tags.filter((tag) => tag.name === 'script')
  const moduleScripts = scripts.filter((tag) => tag.attributes.get('type') === 'module')
  const carrierTags = tags.filter((tag) => tag.attributes.has('data-runtime-configuration-url'))
  const criticalThemeTags = tags.filter(
    (tag) =>
      tag.name === 'link' &&
      tag.attributes.get('rel') === 'stylesheet' &&
      tag.attributes.get('media') === 'all' &&
      tag.attributes.get('href') === expectation.criticalThemePath,
  )
  const appearanceInitializerTags = scripts.filter(
    (tag) => tag.attributes.get('src') === expectation.appearanceInitializerPath,
  )
  const moduleScript = moduleScripts[0]
  const carrierTag = carrierTags[0]
  const criticalThemeTag = criticalThemeTags[0]
  const appearanceInitializerTag = appearanceInitializerTags[0]

  if (moduleScripts.length !== 1 || moduleScript === undefined) {
    violations.push('Production HTML must contain exactly one real module bootstrap script.')
  }

  if (carrierTags.length !== 1 || carrierTag === undefined) {
    violations.push('Production HTML must contain exactly one real Runtime Configuration carrier.')
  }

  if (
    moduleScript !== undefined &&
    carrierTag !== undefined &&
    (carrierTag !== moduleScript ||
      moduleScript.attributes.get('data-runtime-configuration-url') !==
        expectation.runtimeConfigurationUrl ||
      moduleScript.attributes.get('src') !== expectation.entryPath)
  ) {
    violations.push(
      'Production HTML module bootstrap must be the exact Runtime Configuration carrier.',
    )
  }

  if (criticalThemeTags.length !== 1 || criticalThemeTag === undefined) {
    violations.push('Production HTML must contain one exact critical-theme stylesheet path.')
  }

  if (
    appearanceInitializerTags.length !== 1 ||
    appearanceInitializerTag === undefined ||
    appearanceInitializerTag.attributes.has('type') ||
    appearanceInitializerTag.attributes.has('async') ||
    appearanceInitializerTag.attributes.has('defer')
  ) {
    violations.push(
      'Production HTML must contain one synchronous classic Appearance initializer path.',
    )
  }

  if (
    moduleScript !== undefined &&
    criticalThemeTag !== undefined &&
    appearanceInitializerTag !== undefined &&
    (criticalThemeTag.index >= appearanceInitializerTag.index ||
      appearanceInitializerTag.index >= moduleScript.index)
  ) {
    violations.push(
      'Production startup order must be critical theme, Appearance initializer, then module bootstrap.',
    )
  }

  for (const expectedPath of expectation.initialCssPaths) {
    const matchingLinks = tags.filter(
      (tag) =>
        tag.name === 'link' &&
        tag.attributes.get('rel') === 'stylesheet' &&
        tag.attributes.get('href') === expectedPath,
    )

    if (matchingLinks.length !== 1) {
      violations.push(`Production HTML must contain the exact stylesheet path ${expectedPath}.`)
    }
  }

  return violations
}

function validateProductionHtmlNegativeProbes(): void {
  const expectation: ProductionHtmlExpectation = {
    appearanceInitializerPath: '/generated/appearance-init.js',
    criticalThemePath: '/generated/critical-theme.css',
    entryPath: '/assets/entry.js',
    initialCssPaths: new Set<string>(),
    runtimeConfigurationUrl: '/runtime-configuration.json',
  }
  const criticalTheme = '<link rel="stylesheet" media="all" href="/generated/critical-theme.css">'
  const appearance = '<script src="/generated/appearance-init.js"></script>'
  const carrier =
    '<script type="module" src="/assets/entry.js" data-runtime-configuration-url="/runtime-configuration.json"></script>'
  const validHtml = `${criticalTheme}${appearance}${carrier}`

  if (productionHtmlViolations(validHtml, expectation).length !== 0) {
    throw new Error('Production HTML validator rejected its exact in-memory control model.')
  }

  const commentSpoof = `${criticalTheme}${appearance}<!--${carrier}-->`
  const rawTextSpoof = `${criticalTheme}${appearance}<script>const decoy = ${JSON.stringify(carrier)}</script>`
  const inertTemplateSpoof = `${criticalTheme}${appearance}<template>${carrier}</template>`
  const duplicateCarrier = `${validHtml}${carrier}`

  if (
    productionHtmlViolations(commentSpoof, expectation).length === 0 ||
    productionHtmlViolations(rawTextSpoof, expectation).length === 0 ||
    productionHtmlViolations(inertTemplateSpoof, expectation).length === 0 ||
    productionHtmlViolations(duplicateCarrier, expectation).length === 0
  ) {
    throw new Error(
      'Production HTML reversible in-memory spoof/duplicate negative probe did not fail.',
    )
  }
}

async function readBuildVersion(): Promise<string> {
  const value = JSON.parse(await readFile(rootPackageManifestPath, 'utf8')) as unknown

  if (!isJsonObject(value) || typeof value['version'] !== 'string') {
    throw new Error('The root package manifest must provide the Build Version authority.')
  }

  return value['version']
}

function readReleaseSha(): string {
  const output = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDirectory,
    encoding: 'utf8',
  })
  const match = releaseShaOutputPattern.exec(output)

  if (match?.[1] === undefined) {
    throw new Error('The current Git revision must be a full lowercase commit SHA.')
  }

  return match[1]
}

function validateRuntimeConfiguration(
  value: unknown,
  expectedBuildVersion: string,
  expectedReleaseSha: string,
): void {
  if (!isJsonObject(value)) {
    throw new Error('runtime-configuration.json must contain one object.')
  }

  const expectedKeys = [
    'buildVersion',
    'deploymentBase',
    'environment',
    'releaseSha',
    'schemaVersion',
  ] as const
  const receivedKeys = Object.keys(value).sort()

  if (
    receivedKeys.length !== expectedKeys.length ||
    receivedKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error('runtime-configuration.json must contain the exact five-field record.')
  }

  if (
    value['schemaVersion'] !== 1 ||
    value['environment'] !== 'production' ||
    value['deploymentBase'] !== deploymentBase ||
    value['releaseSha'] !== expectedReleaseSha ||
    value['buildVersion'] !== expectedBuildVersion
  ) {
    throw new Error('runtime-configuration.json does not match the production build identity.')
  }
}

function staticPropertyName(property: ts.ObjectLiteralElementLike): string | null {
  if (!ts.isPropertyAssignment(property)) {
    return null
  }

  if (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) {
    return property.name.text
  }

  return null
}

function countCompiledIdentityRecords(
  source: string,
  expectedBuildVersion: string,
  expectedReleaseSha: string,
): number {
  const sourceFile = ts.createSourceFile(
    'production-bundle.js',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  )
  let matches = 0

  function visit(node: ts.Node): void {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map<string, string>()

      for (const property of node.properties) {
        const name = staticPropertyName(property)

        if (
          name === null ||
          !ts.isPropertyAssignment(property) ||
          !ts.isStringLiteralLike(property.initializer) ||
          properties.has(name)
        ) {
          properties.clear()
          break
        }

        properties.set(name, property.initializer.text)
      }

      const keys = [...properties.keys()].sort()

      if (
        keys.length === 3 &&
        keys[0] === 'buildVersion' &&
        keys[1] === 'environment' &&
        keys[2] === 'releaseSha' &&
        properties.get('environment') === 'production' &&
        properties.get('releaseSha') === expectedReleaseSha &&
        properties.get('buildVersion') === expectedBuildVersion
      ) {
        matches += 1
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return matches
}

async function gzipMeasurement(
  relativePath: string,
  releaseShaNormalization?: ReleaseShaMeasurementNormalization,
): Promise<GzipMeasurement> {
  const contents = await readFile(resolve(distributionDirectory, relativePath))
  let measurementContents = contents
  let releaseShaReplacements = 0

  if (releaseShaNormalization !== undefined) {
    const source = contents.toString('utf8')
    const segments = source.split(releaseShaNormalization.currentReleaseSha)

    releaseShaReplacements = segments.length - 1

    if (releaseShaReplacements > 0) {
      measurementContents = Buffer.from(
        segments.join(releaseShaNormalization.canonicalReleaseSha),
        'utf8',
      )
    }
  }

  return {
    bytes: gzipSync(measurementContents, productionBundleGzipOptions).byteLength,
    releaseShaReplacements,
  }
}

async function validateRuntimeKernelBuildOutput(
  entryFile: string,
  initialCssFiles: ReadonlySet<string>,
  expectedBuildVersion: string,
  expectedReleaseSha: string,
): Promise<void> {
  for (const fileName of ['appearance-init.js', 'critical-theme.css'] as const) {
    const [source, emitted] = await Promise.all([
      readFile(resolve(generatedSourceDirectory, fileName)),
      readFile(resolve(distributionDirectory, 'generated', fileName)),
    ])

    if (!source.equals(emitted)) {
      throw new Error(`${fileName}: production output differs from the generated source artifact.`)
    }
  }

  if (deploymentBase !== '/') {
    throw new Error('The Runtime Kernel bundle contract requires the exact root deployment base.')
  }

  const deploymentPath = (relativePath: string): string => `${deploymentBase}${relativePath}`
  const runtimeConfigurationUrl = deploymentPath(runtimeConfigurationArtifactName)
  const criticalThemePath = deploymentPath('generated/critical-theme.css')
  const appearanceInitializerPath = deploymentPath('generated/appearance-init.js')
  const [indexHtml, runtimeConfigurationSource] = await Promise.all([
    readFile(resolve(distributionDirectory, 'index.html'), 'utf8'),
    readFile(resolve(distributionDirectory, runtimeConfigurationArtifactName), 'utf8'),
  ])
  let runtimeConfigurationValue: unknown

  try {
    runtimeConfigurationValue = JSON.parse(runtimeConfigurationSource) as unknown
  } catch {
    throw new Error('runtime-configuration.json must contain valid JSON.')
  }

  validateRuntimeConfiguration(runtimeConfigurationValue, expectedBuildVersion, expectedReleaseSha)

  const htmlViolations = productionHtmlViolations(indexHtml, {
    appearanceInitializerPath,
    criticalThemePath,
    entryPath: deploymentPath(entryFile),
    initialCssPaths: new Set([...initialCssFiles].map(deploymentPath)),
    runtimeConfigurationUrl,
  })

  if (htmlViolations.length !== 0) {
    throw new Error(`Production HTML contract violations:\n- ${htmlViolations.join('\n- ')}`)
  }
}

async function validateCompiledBuildIdentity(
  manifest: Manifest,
  initialChunkKeys: ReadonlySet<string>,
  expectedBuildVersion: string,
  expectedReleaseSha: string,
): Promise<void> {
  const initialJavaScriptSources = await Promise.all(
    [...initialChunkKeys]
      .map((key) => manifest[key])
      .filter((chunk): chunk is ManifestChunk => chunk?.file.endsWith('.js') === true)
      .map((chunk) => readFile(resolve(distributionDirectory, chunk.file), 'utf8')),
  )
  const compiledIdentityRecords = initialJavaScriptSources.reduce(
    (count, source) =>
      count + countCompiledIdentityRecords(source, expectedBuildVersion, expectedReleaseSha),
    0,
  )

  if (compiledIdentityRecords !== 1) {
    throw new Error(
      `Compiled production JavaScript must contain exactly one matching build identity record; received ${String(compiledIdentityRecords)}.`,
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
validateProductionHtmlNegativeProbes()
const manifest = parseManifest(manifestValue)
const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry === true)

if (entries.length !== 1 || entries[0] === undefined) {
  throw new Error('Vite manifest must contain exactly one production entry chunk.')
}

const entry = entries[0]
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

const expectedBuildVersion = await readBuildVersion()
const expectedReleaseSha = readReleaseSha()

await Promise.all([
  validateRuntimeKernelBuildOutput(
    entry[1].file,
    initialCssFiles,
    expectedBuildVersion,
    expectedReleaseSha,
  ),
  validateCompiledBuildIdentity(
    manifest,
    initialChunkKeys,
    expectedBuildVersion,
    expectedReleaseSha,
  ),
])

const initialJavaScriptMeasurements = await Promise.all(
  [...initialJavaScriptFiles].map((relativePath) =>
    gzipMeasurement(relativePath, {
      canonicalReleaseSha: runtimeKernelBundleContract.canonicalMeasurementReleaseSha,
      currentReleaseSha: expectedReleaseSha,
    }),
  ),
)
const releaseShaMeasurementReplacements = initialJavaScriptMeasurements.reduce(
  (total, measurement) => total + measurement.releaseShaReplacements,
  0,
)
const initialJavaScriptBytes = initialJavaScriptMeasurements.reduce(
  (total, measurement) => total + measurement.bytes,
  0,
)
const initialCssMeasurements = await Promise.all(
  [...initialCssFiles].map((relativePath) => gzipMeasurement(relativePath)),
)
const initialCssBytes = initialCssMeasurements.reduce(
  (total, measurement) => total + measurement.bytes,
  0,
)

if (releaseShaMeasurementReplacements !== 1) {
  throw new Error(
    `Production bundle measurement must normalize exactly one validated Release SHA; received ${String(releaseShaMeasurementReplacements)}.`,
  )
}

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
  runtimeKernelBundleContract.final.initialJavaScriptGzipBytes -
    runtimeKernelBundleContract.baseline.initialJavaScriptGzipBytes !==
    runtimeKernelBundleContract.delta.initialJavaScriptGzipBytes ||
  runtimeKernelBundleContract.final.initialCssGzipBytes -
    runtimeKernelBundleContract.baseline.initialCssGzipBytes !==
    runtimeKernelBundleContract.delta.initialCssGzipBytes ||
  runtimeKernelBundleContract.final.lazyChunks - runtimeKernelBundleContract.baseline.lazyChunks !==
    runtimeKernelBundleContract.delta.lazyChunks
) {
  throw new Error('Runtime Kernel bundle baseline/final/delta arithmetic is inconsistent.')
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

if (
  dynamicChunkKeys.size !== expectedLazyRouteKeys.size ||
  [...dynamicChunkKeys].some((key) => !expectedLazyRouteKeys.has(key))
) {
  throw new Error(
    `Router lazy route closure drifted: expected ${String(expectedLazyRouteKeys.size)} exact routes, received ${String(dynamicChunkKeys.size)}.`,
  )
}

const lazyRouteFiles = new Set<string>()

for (const dynamicChunkKey of dynamicChunkKeys) {
  const chunk = manifest[dynamicChunkKey]

  if (!chunk?.file.endsWith('.js')) {
    throw new Error(`Router lazy route ${dynamicChunkKey} must emit exactly one JavaScript chunk.`)
  }
  lazyRouteFiles.add(chunk.file)

  const { bytes } = await gzipMeasurement(chunk.file)

  if (bytes > projectConfig.bundleBudgets.lazyRouteJavaScriptGzipBytes) {
    throw new Error(
      `Lazy chunk ${chunk.file} is ${String(bytes)} gzip bytes; budget is ${String(projectConfig.bundleBudgets.lazyRouteJavaScriptGzipBytes)}.`,
    )
  }
}

if (lazyRouteFiles.size !== expectedLazyRouteKeys.size) {
  throw new Error('Each exact Router route must retain its own lazy JavaScript chunk.')
}

console.log(
  `Bundle budget: initial JavaScript ${String(initialJavaScriptBytes)} bytes gzip (${String(initialJavaScriptBytes - runtimeKernelBundleContract.final.initialJavaScriptGzipBytes)} Router delta from Runtime Kernel final), initial CSS ${String(initialCssBytes)} bytes gzip (${String(initialCssBytes - runtimeKernelBundleContract.final.initialCssGzipBytes)} Router delta from Runtime Kernel final), lazy route chunks ${String(dynamicChunkKeys.size)} (${String(dynamicChunkKeys.size - runtimeKernelBundleContract.final.lazyChunks)} Router delta)`,
)
