import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { projectConfig } from '../../project.config'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const expectedPackageManager = `pnpm@${projectConfig.runtime.pnpm}`

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readJsonObject(path: string): Promise<JsonObject> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown

  if (!isJsonObject(parsed)) {
    throw new Error(`${path} must contain a JSON object.`)
  }

  return parsed
}

function expectEqual(actual: unknown, expected: unknown, description: string): void {
  if (actual !== expected) {
    throw new Error(
      `${description}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    )
  }
}

const rootManifest = await readJsonObject(resolve(rootDirectory, 'package.json'))
const rootEngines = rootManifest['engines']
const rootDevDependencies = rootManifest['devDependencies']

if (!isJsonObject(rootEngines) || !isJsonObject(rootDevDependencies)) {
  throw new Error('The root package manifest must declare engines and devDependencies objects.')
}

expectEqual(rootManifest['name'], projectConfig.identity.packageName, 'Root package identity')
expectEqual(rootManifest['private'], true, 'Root package privacy')
expectEqual(rootManifest['packageManager'], expectedPackageManager, 'Package manager baseline')
expectEqual(rootEngines['node'], '>=24.0.0 <25.0.0', 'Node engine baseline')
expectEqual(rootEngines['pnpm'], '>=10.0.0 <11.0.0', 'pnpm engine baseline')
expectEqual(rootDevDependencies['typescript'], 'catalog:', 'TypeScript catalog binding')

const knownNames = new Set(projectConfig.workspaces.map((workspace) => workspace.name))
const knownPaths = new Set(projectConfig.workspaces.map((workspace) => workspace.path))

if (
  knownNames.size !== projectConfig.workspaces.length ||
  knownPaths.size !== projectConfig.workspaces.length
) {
  throw new Error('Workspace names and paths must be unique.')
}

for (const workspace of projectConfig.workspaces) {
  const workspaceRoot = resolve(rootDirectory, workspace.path)
  await access(workspaceRoot)

  const manifest = await readJsonObject(resolve(workspaceRoot, 'package.json'))
  expectEqual(manifest['name'], workspace.name, `${workspace.path} package name`)
  expectEqual(manifest['private'], true, `${workspace.path} package privacy`)
  expectEqual(manifest['type'], 'module', `${workspace.path} module type`)

  for (const dependency of workspace.mayDependOn) {
    if (!knownNames.has(dependency)) {
      throw new Error(
        `${workspace.name} declares an unknown workspace dependency direction: ${dependency}.`,
      )
    }
  }
}

const workspaceConfiguration = await readFile(resolve(rootDirectory, 'pnpm-workspace.yaml'), 'utf8')

for (const workspacePattern of ['apps/*', 'packages/*']) {
  if (!workspaceConfiguration.includes(`- ${workspacePattern}`)) {
    throw new Error(`pnpm-workspace.yaml must include ${workspacePattern}.`)
  }
}

if (!workspaceConfiguration.includes('\ncatalog:\n')) {
  throw new Error('pnpm-workspace.yaml must define the shared version catalog.')
}

expectEqual(
  projectConfig.governance.architectureAuthority,
  'ARCHITECTURE.md',
  'Architecture authority',
)
expectEqual(projectConfig.governance.defaultBranch, 'main', 'Default branch governance')
expectEqual(projectConfig.governance.implementationPhase, 0, 'Implementation phase')

console.log('Project configuration schema: valid')
