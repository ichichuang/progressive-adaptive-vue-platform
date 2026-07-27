import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

import ts from 'typescript'

import { projectConfig } from '../../project.config'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const sourceExtensions = new Set(['.ts', '.vue'])
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

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)))
    } else if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
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
  const sourceFiles = (await Promise.all(roots.map(collectSourceFiles))).flat()
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

const violations = [...(await validateManifestDependencies()), ...(await validateSourceImports())]

if (violations.length > 0) {
  throw new Error(
    `Architecture boundary violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  )
}

console.log('Architecture boundaries: valid')
