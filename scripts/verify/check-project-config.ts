import { access, lstat, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import { projectConfig } from '../../project.config'
import { parse as parseYaml } from 'yaml'

import { runtimePreflightAuthority } from './check-runtime'

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
const phaseOneUiDependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

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

function expectDirectDependencyAbsent(
  manifest: JsonObject,
  dependency: string,
  description: string,
): void {
  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const dependencies = manifest[section]

    if (isJsonObject(dependencies) && Object.hasOwn(dependencies, dependency)) {
      throw new Error(`${description} must not directly declare ${dependency} in ${section}.`)
    }
  }
}

function normalizePhaseOneUiSource(source: string): string {
  return source.replace(/\r\n?/gu, '\n').replace(/\n$/u, '')
}

async function validatePhaseOneUiPackage(): Promise<void> {
  const packageDirectory = resolve(rootDirectory, 'packages/ui')
  const manifest = await readJsonObject(resolve(packageDirectory, 'package.json'))

  for (const section of phaseOneUiDependencySections) {
    const dependencies = manifest[section]

    if (dependencies === undefined) {
      continue
    }

    if (!isJsonObject(dependencies)) {
      throw new Error(`Phase 1 @platform/ui ${section} must be an object when declared.`)
    }

    if (Object.keys(dependencies).length !== 0) {
      throw new Error(`Phase 1 @platform/ui ${section} must contain zero entries.`)
    }
  }

  expectStructuredEqual(
    manifest['exports'],
    {
      '.': {
        types: './src/index.ts',
        default: './src/index.ts',
      },
    },
    'Phase 1 @platform/ui exports',
  )

  const sourceDirectory = resolve(packageDirectory, 'src')
  const sourceDirectoryStatus = await lstat(sourceDirectory)

  if (!sourceDirectoryStatus.isDirectory()) {
    throw new Error('Phase 1 @platform/ui src must be a regular directory.')
  }

  const sourceEntries = await readdir(sourceDirectory, { withFileTypes: true })
  const implementationSource = sourceEntries[0]

  if (
    sourceEntries.length !== 1 ||
    implementationSource?.name !== 'index.ts' ||
    !implementationSource.isFile()
  ) {
    throw new Error(
      'Phase 1 @platform/ui src must contain exactly one regular file named index.ts and no subdirectories.',
    )
  }

  expectEqual(
    normalizePhaseOneUiSource(
      await readFile(resolve(sourceDirectory, implementationSource.name), 'utf8'),
    ),
    'export {}',
    'Phase 1 @platform/ui implementation content',
  )
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
const rootScripts = rootManifest['scripts']

if (
  !isJsonObject(rootEngines) ||
  !isJsonObject(rootDevDependencies) ||
  !isJsonObject(rootScripts)
) {
  throw new Error(
    'The root package manifest must declare engines, scripts, and devDependencies objects.',
  )
}

expectEqual(rootManifest['name'], projectConfig.identity.packageName, 'Root package identity')
expectEqual(rootManifest['private'], true, 'Root package privacy')
expectEqual(rootManifest['packageManager'], expectedPackageManager, 'Package manager baseline')
expectEqual(rootManifest['pnpm'], undefined, 'Legacy package.json pnpm configuration')
expectEqual(rootEngines['node'], expectedRuntime.node, 'Exact Node engine baseline')
expectEqual(rootEngines['pnpm'], expectedRuntime.pnpm, 'Exact pnpm engine baseline')
expectStructuredEqual(
  runtimePreflightAuthority,
  { node: expectedRuntime.node, pnpm: expectedRuntime.pnpm },
  'Process runtime preflight authority',
)

const verifyScript = rootScripts['verify']

if (typeof verifyScript !== 'string') {
  throw new Error('The root package manifest must declare a verify script.')
}

expectEqual(
  verifyScript.split(' && ')[0],
  'tsx scripts/verify/check-runtime.ts',
  'First root verify gate',
)
expectEqual(
  rootDevDependencies['@platform/design-system'],
  'workspace:*',
  'Root design-system workspace binding',
)
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
  designSystemDevDependencies['@unocss/core'],
  'catalog:',
  'Design-system UnoCSS core catalog binding',
)
expectEqual(
  designSystemDevDependencies['style-dictionary'],
  'catalog:',
  'Style Dictionary catalog binding',
)
expectEqual(
  designSystemDevDependencies['unocss'],
  'catalog:',
  'Design-system UnoCSS catalog binding',
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
expectEqual(workspaceCatalog['@unocss/core'], '66.7.5', 'UnoCSS core catalog version')
expectEqual(workspaceCatalog['pinia'], '3.0.4', 'Pinia catalog version')

const lockfile = await readYamlObject(resolve(rootDirectory, 'pnpm-lock.yaml'))
const lockfileCatalogs = lockfile['catalogs']
const defaultLockfileCatalog = isJsonObject(lockfileCatalogs)
  ? lockfileCatalogs['default']
  : undefined
const lockfileImporters = lockfile['importers']
const webLockfileImporter = isJsonObject(lockfileImporters)
  ? lockfileImporters['apps/web']
  : undefined
const webLockfileDependencies = isJsonObject(webLockfileImporter)
  ? webLockfileImporter['dependencies']
  : undefined
const lockedPiniaDependency = isJsonObject(webLockfileDependencies)
  ? webLockfileDependencies['pinia']
  : undefined
const lockfilePackages = lockfile['packages']
const lockedPiniaPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('pinia@'))
  : []

expectStructuredEqual(
  isJsonObject(defaultLockfileCatalog) ? defaultLockfileCatalog['pinia'] : undefined,
  { specifier: '3.0.4', version: '3.0.4' },
  'Pinia lockfile catalog coordinate',
)
expectEqual(
  isJsonObject(lockedPiniaDependency) ? lockedPiniaDependency['specifier'] : undefined,
  'catalog:',
  'Pinia web lockfile specifier',
)

if (
  !isJsonObject(lockedPiniaDependency) ||
  typeof lockedPiniaDependency['version'] !== 'string' ||
  !lockedPiniaDependency['version'].startsWith('3.0.4(')
) {
  throw new Error('Pinia web lockfile resolution must bind exact version 3.0.4.')
}

expectStructuredEqual(lockedPiniaPackageKeys, ['pinia@3.0.4'], 'Pinia lockfile package set')

const webManifest = await readJsonObject(resolve(rootDirectory, 'apps/web/package.json'))
const uiManifest = await readJsonObject(resolve(rootDirectory, 'packages/ui/package.json'))

expectStructuredEqual(
  webManifest['dependencies'],
  {
    '@platform/design-system': 'workspace:*',
    pinia: 'catalog:',
    vue: 'catalog:',
  },
  'Package 5 web dependency set',
)

for (const [manifest, description] of [
  [rootManifest, 'root package'],
  [designSystemManifest, '@platform/design-system'],
  [uiManifest, '@platform/ui'],
] as const) {
  expectDirectDependencyAbsent(manifest, 'pinia', description)
}

for (const [manifest, description] of [
  [rootManifest, 'root package'],
  [webManifest, '@platform/web'],
  [designSystemManifest, '@platform/design-system'],
  [uiManifest, '@platform/ui'],
] as const) {
  expectDirectDependencyAbsent(manifest, '@vue/devtools-api', description)
}

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

await validatePhaseOneUiPackage()

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
