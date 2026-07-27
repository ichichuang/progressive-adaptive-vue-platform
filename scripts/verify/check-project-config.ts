import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import { projectConfig } from '../../project.config'
import { parse as parseYaml } from 'yaml'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const expectedRuntime = {
  node: '24.15.0',
  pnpm: '10.34.5',
  typescript: '6.0.3',
} as const
const expectedPackageManager = `pnpm@${expectedRuntime.pnpm}`
const expectedImplementationContract = {
  phase: 1,
  state: 'IN_PROGRESS',
} as const

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

async function readYamlObject(path: string): Promise<JsonObject> {
  const parsed = parseYaml(await readFile(path, 'utf8')) as unknown

  if (!isJsonObject(parsed)) {
    throw new Error(`${path} must contain a YAML object.`)
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

function expectStructuredEqual(actual: unknown, expected: unknown, description: string): void {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(
      `${description}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    )
  }
}

function parseMiseTools(configuration: string): JsonObject {
  const tools: JsonObject = {}
  let section = ''

  for (const rawLine of configuration.split('\n')) {
    const line = rawLine.trim()

    if (line.length === 0 || line.startsWith('#')) {
      continue
    }

    const sectionMatch = /^\[([A-Za-z0-9_.-]+)\]$/u.exec(line)

    if (sectionMatch) {
      section = sectionMatch[1] ?? ''
      continue
    }

    if (section !== 'tools') {
      continue
    }

    const assignmentMatch = /^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"$/u.exec(line)

    if (!assignmentMatch) {
      throw new Error(`mise.toml contains an unsupported tools entry: ${line}.`)
    }

    const key = assignmentMatch[1]

    if (!key || Object.hasOwn(tools, key)) {
      throw new Error(`mise.toml contains a duplicate or invalid tools entry: ${line}.`)
    }

    tools[key] = assignmentMatch[2]
  }

  return tools
}

function readCanonicalImplementationState(architecture: string): string {
  const matches = [...architecture.matchAll(/^IMPLEMENTATION_STATE=([A-Z_]+)$/gmu)]

  if (matches.length !== 1) {
    throw new Error(
      `ARCHITECTURE.md must declare exactly one canonical implementation state; received ${String(matches.length)}.`,
    )
  }

  return matches[0]?.[1] ?? ''
}

function findWorkflowStep(steps: unknown[], name: string): JsonObject {
  const matches = steps.filter(
    (step): step is JsonObject => isJsonObject(step) && step['name'] === name,
  )

  if (matches.length !== 1) {
    throw new Error(`The Static Verification workflow must contain exactly one "${name}" step.`)
  }

  const match = matches[0]

  if (!match) {
    throw new Error(`The Static Verification workflow is missing the "${name}" step.`)
  }

  return match
}

expectStructuredEqual(projectConfig.runtime, expectedRuntime, 'Project runtime baseline')

const rootManifest = await readJsonObject(resolve(rootDirectory, 'package.json'))
const rootEngines = rootManifest['engines']
const rootDevDependencies = rootManifest['devDependencies']

if (!isJsonObject(rootEngines) || !isJsonObject(rootDevDependencies)) {
  throw new Error('The root package manifest must declare engines and devDependencies objects.')
}

expectEqual(rootManifest['name'], projectConfig.identity.packageName, 'Root package identity')
expectEqual(rootManifest['private'], true, 'Root package privacy')
expectEqual(rootManifest['packageManager'], expectedPackageManager, 'Package manager baseline')
expectEqual(rootManifest['pnpm'], undefined, 'Legacy package.json pnpm configuration')
expectEqual(rootEngines['node'], '>=24.0.0 <25.0.0', 'Node engine baseline')
expectEqual(rootEngines['pnpm'], '>=10.0.0 <11.0.0', 'pnpm engine baseline')
expectEqual(rootDevDependencies['typescript'], 'catalog:', 'TypeScript catalog binding')
expectEqual(rootDevDependencies['yaml'], 'catalog:', 'YAML parser catalog binding')

const miseConfiguration = await readFile(resolve(rootDirectory, 'mise.toml'), 'utf8')

expectStructuredEqual(
  parseMiseTools(miseConfiguration),
  { node: expectedRuntime.node },
  'mise tools baseline',
)

const designSystemManifest = await readJsonObject(
  resolve(rootDirectory, 'packages/design-system/package.json'),
)
const designSystemDependencies = designSystemManifest['dependencies']
const designSystemDevDependencies = designSystemManifest['devDependencies']

if (!isJsonObject(designSystemDependencies) || !isJsonObject(designSystemDevDependencies)) {
  throw new Error(
    'The design-system package must declare dependencies and devDependencies objects.',
  )
}

expectEqual(designSystemDependencies['colorjs.io'], 'catalog:', 'Color.js catalog binding')
expectEqual(designSystemDependencies['zod'], 'catalog:', 'Zod catalog binding')
expectEqual(
  designSystemDevDependencies['style-dictionary'],
  'catalog:',
  'Style Dictionary catalog binding',
)

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

const workspaceConfiguration = await readYamlObject(resolve(rootDirectory, 'pnpm-workspace.yaml'))

expectStructuredEqual(
  workspaceConfiguration['packages'],
  ['apps/*', 'packages/*'],
  'Workspace package patterns',
)

const workspaceCatalog = workspaceConfiguration['catalog']

if (!isJsonObject(workspaceCatalog) || Object.keys(workspaceCatalog).length === 0) {
  throw new Error('pnpm-workspace.yaml must define the shared version catalog.')
}

expectEqual(workspaceCatalog['yaml'], '2.9.0', 'YAML parser catalog version')
expectEqual(workspaceConfiguration['strictDepBuilds'], true, 'Strict dependency build policy')
expectStructuredEqual(
  workspaceConfiguration['allowBuilds'],
  {
    'esbuild@0.28.1': true,
    '@bundled-es-modules/glob': false,
    'style-dictionary': false,
  },
  'Reviewed dependency build decisions',
)

for (const obsoleteBuildPolicyKey of [
  'onlyBuiltDependencies',
  'onlyBuiltDependenciesFile',
  'neverBuiltDependencies',
  'ignoredBuiltDependencies',
  'ignoreDepScripts',
]) {
  expectEqual(
    workspaceConfiguration[obsoleteBuildPolicyKey],
    undefined,
    `Obsolete dependency build policy key "${obsoleteBuildPolicyKey}"`,
  )
}

expectEqual(
  workspaceConfiguration['dangerouslyAllowAllBuilds'],
  undefined,
  'Dangerous dependency build override',
)
expectStructuredEqual(
  workspaceConfiguration['patchedDependencies'],
  {
    'unconfig@7.5.0': 'patches/unconfig@7.5.0.patch',
  },
  'Reviewed unconfig patch',
)

const architecture = await readFile(resolve(rootDirectory, 'ARCHITECTURE.md'), 'utf8')

expectStructuredEqual(
  {
    phase: projectConfig.governance.implementationPhase,
    state: readCanonicalImplementationState(architecture),
  },
  expectedImplementationContract,
  'Canonical implementation contract',
)

const ciConfiguration = await readYamlObject(resolve(rootDirectory, '.github/workflows/verify.yml'))

expectEqual(ciConfiguration['name'], 'Static Verification', 'Verification workflow name')

const ciJobs = ciConfiguration['jobs']

if (!isJsonObject(ciJobs) || !isJsonObject(ciJobs['verify'])) {
  throw new Error('The Static Verification workflow must declare the verify job.')
}

const verifyJob = ciJobs['verify']
const ciSteps = verifyJob['steps']

if (!Array.isArray(ciSteps)) {
  throw new Error('The Static Verification verify job must declare a steps array.')
}

expectEqual(verifyJob['name'], 'Production static gates', 'Verification job label')

const pnpmSetupConfiguration = findWorkflowStep(ciSteps, 'Install pnpm')['with']
const nodeSetupConfiguration = findWorkflowStep(ciSteps, 'Configure Node.js')['with']

if (!isJsonObject(pnpmSetupConfiguration) || !isJsonObject(nodeSetupConfiguration)) {
  throw new Error('The Static Verification runtime setup steps must declare with mappings.')
}

expectEqual(
  pnpmSetupConfiguration['version'],
  expectedRuntime.pnpm,
  'Verification workflow pnpm version',
)
expectEqual(
  nodeSetupConfiguration['node-version'],
  expectedRuntime.node,
  'Verification workflow Node version',
)

expectEqual(
  projectConfig.governance.architectureAuthority,
  'ARCHITECTURE.md',
  'Architecture authority',
)
expectEqual(projectConfig.governance.defaultBranch, 'main', 'Default branch governance')

console.log('Project configuration schema: valid')
