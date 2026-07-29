import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { TextDecoder } from 'node:util'

import ts from 'typescript'

import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { projectConfig } from '../../project.config'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const sourceExtensions = new Set(['.ts', '.vue'])
const excludedApplicationDirectories = new Set(['dist', 'node_modules'])
const rootTypeScriptConfigurationSuffix = '.config.ts'
const workspaceNames = new Set<string>(projectConfig.workspaces.map((workspace) => workspace.name))
const allowedWorkspaceDependencies = new Map<string, ReadonlySet<string>>(
  projectConfig.workspaces.map((workspace) => [
    workspace.name,
    new Set<string>(workspace.mayDependOn),
  ]),
)

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readJsonObject(path: string): Promise<JsonObject> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown

  if (!isJsonObject(parsed)) {
    throw new Error(`${relative(rootDirectory, path)} must contain a JSON object.`)
  }

  return parsed
}

function dependencyEntries(packageJson: JsonObject): [string, string][] {
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
  const entries: [string, string][] = []

  for (const section of sections) {
    const dependencies = packageJson[section]

    if (!isJsonObject(dependencies)) {
      continue
    }

    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version === 'string') {
        entries.push([name, version])
      }
    }
  }

  return entries
}

async function validateManifestDependencies(): Promise<string[]> {
  const violations: string[] = []

  for (const workspace of projectConfig.workspaces) {
    const manifestPath = resolve(rootDirectory, workspace.path, 'package.json')
    const manifest = await readJsonObject(manifestPath)
    const allowed = allowedWorkspaceDependencies.get(workspace.name) ?? new Set<string>()

    for (const [dependency, version] of dependencyEntries(manifest)) {
      if (!workspaceNames.has(dependency)) {
        continue
      }

      if (!allowed.has(dependency)) {
        violations.push(`${workspace.name} may not depend on ${dependency}.`)
      }

      if (!version.startsWith('workspace:')) {
        violations.push(`${workspace.name} must use the workspace: protocol for ${dependency}.`)
      }
    }
  }

  return violations
}

async function validateRootConfigurationDependencies(): Promise<string[]> {
  const rootManifest = await readJsonObject(resolve(rootDirectory, 'package.json'))
  const declaredDependencies = new Map(dependencyEntries(rootManifest))
  const rootEntries = await readdir(rootDirectory, {
    withFileTypes: true,
  })
  const configurationFiles = rootEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(rootTypeScriptConfigurationSuffix))
    .map((entry) => resolve(rootDirectory, entry.name))
  const violations: string[] = []

  for (const configurationFile of configurationFiles) {
    const sourceText = await readFile(configurationFile, 'utf8')
    const imports = ts.preProcessFile(sourceText, true, true).importedFiles

    for (const importedFile of imports) {
      if (!workspaceNames.has(importedFile.fileName)) {
        continue
      }

      const version = declaredDependencies.get(importedFile.fileName)
      const displayPath = relative(rootDirectory, configurationFile)

      if (version === undefined) {
        violations.push(
          `${displayPath}: root configuration import "${importedFile.fileName}" requires a direct root dependency declaration.`,
        )
      } else if (!version.startsWith('workspace:')) {
        violations.push(
          `${displayPath}: root configuration dependency "${importedFile.fileName}" must use the workspace: protocol.`,
        )
      }
    }
  }

  return violations
}

async function collectSourceFiles(
  directory: string,
  extensions: ReadonlySet<string> = sourceExtensions,
): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path, extensions)))
    } else if (entry.isFile() && extensions.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

async function collectApplicationFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory() && !excludedApplicationDirectories.has(entry.name)) {
      files.push(...(await collectApplicationFiles(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

function decodeUtf8Text(contents: Uint8Array): string | undefined {
  if (contents.includes(0)) {
    return undefined
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(contents)
  } catch {
    return undefined
  }
}

function sourceTextForImports(path: string, sourceText: string): string {
  if (extname(path) !== '.vue') {
    return sourceText
  }

  return [...sourceText.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
    .map((match) => match[1] ?? '')
    .join('\n')
}

function sourceLayer(path: string): string | undefined {
  const normalized = relative(rootDirectory, path).split(sep).join('/')

  if (normalized.startsWith('packages/design-system/src/')) {
    return 'design-system'
  }

  if (normalized.startsWith('packages/ui/src/')) {
    return 'ui'
  }

  if (!normalized.startsWith('apps/web/src/')) {
    return undefined
  }

  const sourceRelative = normalized.slice('apps/web/src/'.length)
  const [segment] = sourceRelative.split('/')

  if (segment === 'app' || segment === 'pages' || segment === 'features' || segment === 'shared') {
    return segment
  }

  return 'web-root'
}

const allowedLayers = new Map<string, Set<string>>([
  ['web-root', new Set(['web-root', 'app', 'pages', 'features', 'shared', 'ui', 'design-system'])],
  ['app', new Set(['app', 'pages', 'features', 'shared', 'ui', 'design-system'])],
  ['pages', new Set(['pages', 'features', 'shared', 'ui', 'design-system'])],
  ['features', new Set(['features', 'shared', 'ui', 'design-system'])],
  ['shared', new Set(['shared', 'ui', 'design-system'])],
  ['ui', new Set(['ui', 'design-system'])],
  ['design-system', new Set(['design-system'])],
])

function featureName(path: string): string | undefined {
  const normalized = relative(rootDirectory, path).split(sep).join('/')
  const match = /^apps\/web\/src\/features\/([^/]+)/u.exec(normalized)
  return match?.[1]
}

function workspaceLayer(specifier: string): string | undefined {
  if (specifier === '@platform/ui') {
    return 'ui'
  }

  if (specifier === '@platform/design-system') {
    return 'design-system'
  }

  return undefined
}

function inspectImport(sourcePath: string, specifier: string): string[] {
  const violations: string[] = []
  const displayPath = relative(rootDirectory, sourcePath)
  const fromLayer = sourceLayer(sourcePath)

  if (/^@platform\/[^/]+\/.+/u.test(specifier)) {
    violations.push(`${displayPath}: workspace deep import "${specifier}" is forbidden.`)
  }

  if (
    (specifier === 'reka-ui' || specifier === 'motion-v' || specifier === 'clsx') &&
    fromLayer !== 'ui'
  ) {
    violations.push(`${displayPath}: "${specifier}" may only be imported by @platform/ui.`)
  }

  const targetPath = specifier.startsWith('.') ? resolve(dirname(sourcePath), specifier) : undefined
  const toLayer = targetPath === undefined ? workspaceLayer(specifier) : sourceLayer(targetPath)

  if (
    fromLayer !== undefined &&
    toLayer !== undefined &&
    !allowedLayers.get(fromLayer)?.has(toLayer)
  ) {
    violations.push(
      `${displayPath}: ${fromLayer} may not import ${toLayer} through "${specifier}".`,
    )
  }

  if (
    fromLayer === 'features' &&
    toLayer === 'features' &&
    targetPath !== undefined &&
    featureName(sourcePath) !== featureName(targetPath)
  ) {
    violations.push(`${displayPath}: cross-feature import "${specifier}" is forbidden.`)
  }

  if (
    fromLayer !== 'features' &&
    toLayer === 'features' &&
    targetPath !== undefined &&
    !/(?:^|\/)index$/u.test(targetPath)
  ) {
    violations.push(`${displayPath}: feature imports must target the public index.ts boundary.`)
  }

  return violations
}

async function validateSourceImports(): Promise<string[]> {
  const roots = [
    resolve(rootDirectory, 'apps/web/src'),
    resolve(rootDirectory, 'packages/design-system/src'),
    resolve(rootDirectory, 'packages/ui/src'),
  ]
  const sourceFiles = (await Promise.all(roots.map((root) => collectSourceFiles(root)))).flat()
  const violations: string[] = []

  for (const sourceFile of sourceFiles) {
    const sourceText = sourceTextForImports(sourceFile, await readFile(sourceFile, 'utf8'))
    const imports = ts.preProcessFile(sourceText, true, true).importedFiles

    for (const importedFile of imports) {
      violations.push(...inspectImport(sourceFile, importedFile.fileName))
    }
  }

  return violations
}

async function validateDesignSystemTokenExports(): Promise<string[]> {
  const manifestPath = resolve(rootDirectory, 'packages/design-system/package.json')
  const manifest = await readJsonObject(manifestPath)
  const exportsField = manifest['exports']

  if (!isJsonObject(exportsField)) {
    return ['@platform/design-system must declare an explicit exports object.']
  }

  const allowedExports = new Set(['.', './tokens.css'])
  return Object.keys(exportsField)
    .filter((exportPath) => !allowedExports.has(exportPath))
    .map(
      (exportPath) =>
        `@platform/design-system token internals may not be exposed through public subpath "${exportPath}".`,
    )
}

async function validateNoApplicationInternalTokenUse(): Promise<string[]> {
  const manifest = await readJsonObject(
    resolve(rootDirectory, 'packages/design-system/src/generated/tokens.manifest.json'),
  )
  const manifestTokens = manifest['tokens']

  if (!Array.isArray(manifestTokens)) {
    return ['Generated token Manifest must declare a tokens array.']
  }

  const internalCssVariables = manifestTokens.flatMap((token) => {
    if (
      !isJsonObject(token) ||
      token['visibility'] !== 'ui-internal' ||
      typeof token['cssVariable'] !== 'string'
    ) {
      return []
    }

    return [token['cssVariable']]
  })
  const applicationFiles = await collectApplicationFiles(resolve(rootDirectory, 'apps/web'))
  const violations: string[] = []

  for (const applicationFile of applicationFiles) {
    const sourceText = decodeUtf8Text(await readFile(applicationFile))

    const referencedInternalVariable = internalCssVariables.find((cssVariable) =>
      sourceText?.includes(cssVariable),
    )

    if (referencedInternalVariable !== undefined) {
      violations.push(
        `${relative(rootDirectory, applicationFile)}: applications may not consume ui-internal token "${referencedInternalVariable}".`,
      )
    }
  }

  return violations
}

function cssLikeContent(path: string, sourceText: string): string {
  const extension = extname(path)

  if (extension === '.css' || extension === '.html') {
    return sourceText
  }

  if (extension === '.vue') {
    return [...sourceText.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gu)]
      .map((match) => match[1] ?? '')
      .join('\n')
  }

  return ''
}

async function validateNoApplicationOpticalEffects(): Promise<string[]> {
  const applicationFiles = await collectApplicationFiles(resolve(rootDirectory, 'apps/web'))
  const forbiddenOpticalSyntax =
    /\b(?:backdrop-filter|filter)\s*:|(?:blur|brightness|saturate)\s*\(/u
  const violations: string[] = []

  for (const applicationFile of applicationFiles) {
    const sourceText = decodeUtf8Text(await readFile(applicationFile))

    if (
      sourceText !== undefined &&
      forbiddenOpticalSyntax.test(cssLikeContent(applicationFile, sourceText))
    ) {
      violations.push(
        `${relative(rootDirectory, applicationFile)}: page-authored optical effects are forbidden.`,
      )
    }
  }

  return violations
}

async function validateFirstPaintApplicationContract(): Promise<string[]> {
  const indexPath = resolve(rootDirectory, 'apps/web/index.html')
  const viteConfigurationPath = resolve(rootDirectory, 'apps/web/vite.config.ts')
  const appearanceInitPath = resolve(
    rootDirectory,
    'packages/design-system/src/generated/appearance-init.js',
  )
  const [indexHtml, viteConfiguration, appearanceInit] = await Promise.all([
    readFile(indexPath, 'utf8'),
    readFile(viteConfigurationPath, 'utf8'),
    readFile(appearanceInitPath, 'utf8'),
  ])
  const violations: string[] = []
  const storageKeyMatches = [...indexHtml.matchAll(/\bdata-preference-storage-key="([^"]*)"/gu)]
  const configuredStorageKey = applicationConfig.appearance.preferenceStorageKey

  if (storageKeyMatches.length !== 1 || storageKeyMatches[0]?.[1] !== configuredStorageKey) {
    violations.push(
      'apps/web/index.html: the first-paint script storage key must exactly match the application-owned configuration.',
    )
  }

  if (appearanceInit.includes(configuredStorageKey)) {
    violations.push(
      'packages/design-system/src/generated/appearance-init.js: generated initialization must remain application-key-agnostic.',
    )
  }

  const criticalThemeIndex = indexHtml.indexOf('href="/generated/critical-theme.css"')
  const appearanceInitIndex = indexHtml.indexOf('src="/generated/appearance-init.js"')
  const vueBootstrapIndex = indexHtml.indexOf('src="/src/main.ts"')

  if (
    criticalThemeIndex < 0 ||
    appearanceInitIndex <= criticalThemeIndex ||
    vueBootstrapIndex <= appearanceInitIndex
  ) {
    violations.push(
      'apps/web/index.html: startup order must be critical theme, synchronous appearance initialization, then Vue bootstrap.',
    )
  }

  const appearanceScriptTag =
    /<script\b(?=[^>]*\bsrc="\/generated\/appearance-init\.js")[^>]*><\/script>/u.exec(
      indexHtml,
    )?.[0]

  if (
    appearanceScriptTag === undefined ||
    /\b(?:async|defer|type)\s*=/u.test(appearanceScriptTag)
  ) {
    violations.push(
      'apps/web/index.html: appearance-init.js must be included as a synchronous classic script.',
    )
  }

  const baselineAttributes = [
    'data-color-mode="light"',
    'data-contrast="standard"',
    'data-density="comfortable"',
    'data-material="solid"',
    'data-motion="full"',
    'data-theme="neutral"',
  ]

  if (baselineAttributes.some((attribute) => !indexHtml.includes(attribute))) {
    violations.push(
      'apps/web/index.html: Neutral/Light/Standard/Comfortable/Solid baseline attributes are incomplete.',
    )
  }

  if (
    !viteConfiguration.includes('appearance-init.js') ||
    !viteConfiguration.includes('critical-theme.css') ||
    !viteConfiguration.includes('applicationConfig.appearance.preferenceStorageKey')
  ) {
    violations.push(
      'apps/web/vite.config.ts: generated first-paint asset and application configuration wiring is incomplete.',
    )
  }

  return violations
}

const violations = [
  ...(await validateManifestDependencies()),
  ...(await validateRootConfigurationDependencies()),
  ...(await validateSourceImports()),
  ...(await validateDesignSystemTokenExports()),
  ...(await validateNoApplicationInternalTokenUse()),
  ...(await validateNoApplicationOpticalEffects()),
  ...(await validateFirstPaintApplicationContract()),
]

if (violations.length > 0) {
  throw new Error(
    `Architecture boundary violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  )
}

console.log('Architecture boundaries: valid')
