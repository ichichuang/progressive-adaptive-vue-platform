import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

type JsonObject = Record<string, unknown>

interface RepositoryInventory {
  directories: string[]
  regularFiles: string[]
  symbolicLinks: string[]
}

const rootDirectory = process.cwd()
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules'])
const requiredAiWorkflowFiles = new Set([
  '.ai/skills/pavp-ui/SKILL.md',
  '.ai/skills/pavp-ui/references/acceptance-report.md',
  '.ai/skills/pavp-ui/references/execution-contract.md',
  '.ai/skills/pavp-ui/references/specialist-lens-policy.md',
  '.ai/skills/pavp-ui/references/task-routing.md',
])
const allowedAiDirectories = new Set([
  '.ai',
  '.ai/skills',
  '.ai/skills/pavp-ui',
  '.ai/skills/pavp-ui/references',
])
const forbiddenClientAuthorityDirectoryNames = new Set([
  '.agents',
  '.claude',
  '.codex',
  '.kimi',
  '.kimi-code',
])
const forbiddenDirectoryNames = new Set([
  '.storybook',
  '__snapshots__',
  '__tests__',
  'coverage',
  'demos',
  'e2e',
  'evidence',
  'fixtures',
  'mocks',
  'recordings',
  'screenshots',
  'showcase',
  'showcases',
  'snapshots',
  'stories',
  'storybook',
  'test',
  'tests',
  'traces',
])
const forbiddenFilePatterns = [
  /(?:^|[.-])spec\.[^.]+$/u,
  /(?:^|[.-])test\.[^.]+$/u,
  /\.stories\.[^.]+$/u,
  /^(?:cypress|playwright|vitest)\.config\./u,
]
const forbiddenDependencyPatterns = [
  /playwright/u,
  /storybook/u,
  /test-utils/u,
  /vitest/u,
  /(?:^|[/@-])cypress(?:$|[/@-])/u,
  /(?:^|[/@-])jest(?:$|[/@-])/u,
]
const forbiddenRootPaths = new Set([
  '.github/dependabot.yml',
  'apps/desktop',
  'apps/docs',
  'apps/mobile',
])
const forbiddenHomePathPatterns = [
  {
    label: 'concrete macOS user-home path',
    pattern: /(?:^|[\s"'`=(])\/Users\/[A-Za-z0-9._-]+(?:\/[^\s"'<>]*)?/mu,
  },
  {
    label: 'concrete Linux user-home path',
    pattern: /(?:^|[\s"'`=(])\/home\/[A-Za-z0-9._-]+(?:\/[^\s"'<>]*)?/mu,
  },
  {
    label: 'concrete root user-home path',
    pattern: /(?:^|[\s"'`=(])\/root(?:\/[^\s"'<>]*)?(?=$|[\s"'`<>),;])/mu,
  },
  {
    label: 'concrete Windows user-home path',
    pattern:
      /(?:^|[\s"'`=(])[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][A-Za-z0-9._-]+(?:[\\/][^\s"'<>]*)?/mu,
  },
  {
    label: 'concrete UNC user-home path',
    pattern:
      /(?:^|[\s"'`=(])(?:\\\\|\/\/)[A-Za-z0-9._-]+[\\/](?:Users|home|homes|profiles)[\\/][A-Za-z0-9._-]+(?:[\\/][^\s"'<>]*)?/imu,
  },
]
const forbiddenMachineLocalAuthorityPathPatterns = [
  /(?:~|\$(?:HOME|USERPROFILE)|\$\{(?:HOME|USERPROFILE)\}|%(?:HOME|USERPROFILE)%)[\\/](?:\.ai|\.agents|\.claude|\.codex|\.kimi|\.kimi-code)(?:[\\/]|$)/iu,
  /(?:~|\$(?:HOME|USERPROFILE)|\$\{(?:HOME|USERPROFILE)\}|%(?:HOME|USERPROFILE)%)[\\/]\.config[\\/](?:claude|codex|kimi|kimi-code)(?:[\\/]|$)/iu,
  /(?:~|\$(?:HOME|USERPROFILE)|\$\{(?:HOME|USERPROFILE)\}|%(?:HOME|USERPROFILE)%)[\\/]\.local[\\/]share[\\/](?:claude|codex|kimi|kimi-code)(?:[\\/]|$)/iu,
  /(?:~|\$(?:HOME|USERPROFILE)|\$\{(?:HOME|USERPROFILE)\}|%(?:HOME|USERPROFILE)%)[\\/]Library[\\/]Application Support[\\/](?:Claude|Codex|Kimi|Kimi Code)(?:[\\/]|$)/iu,
  /(?:\$CODEX_HOME|\$\{CODEX_HOME\}|%CODEX_HOME%)(?:[\\/]|$)/iu,
  /(?:\$XDG_CONFIG_HOME|\$\{XDG_CONFIG_HOME\}|%(?:APPDATA|LOCALAPPDATA)%)[\\/](?:claude|codex|kimi|kimi-code)(?:[\\/]|$)/iu,
  /(?:HKEY_CURRENT_USER|HKCU)(?::)?[\\/]Software[\\/](?:Claude|Codex|Kimi|Kimi Code)(?:[\\/]|$)/iu,
  /\/etc\/(?:claude|codex|kimi|kimi-code)(?:\/|$)/iu,
]
const subordinateBrowserRuleSyncFiles = [
  'AGENTS.md',
  'README.md',
  '.ai/skills/pavp-ui/SKILL.md',
  '.ai/skills/pavp-ui/references/task-routing.md',
  '.ai/skills/pavp-ui/references/execution-contract.md',
  '.ai/skills/pavp-ui/references/acceptance-report.md',
  'scripts/verify/check-repository-policy.ts',
] as const
const subordinateBrowserRuleContentHashes = new Map<string, string>([
  ['AGENTS.md', 'd82713a93021b3f5e98136e7274dc118d8aae3250f08da119aade4b188badf06'],
  ['README.md', 'a9b2a2ebd911a694af71cb5af53d48516f34ca4339800ecda740a58f9ae1f277'],
  [
    '.ai/skills/pavp-ui/SKILL.md',
    '0783a23b91d4c1ec48acf72de2c15a3ef9a517ead5f9ca08eaa166d28b818fd8',
  ],
  [
    '.ai/skills/pavp-ui/references/task-routing.md',
    '5fc958d96ff7aad63169709d2e5672074a2bec59b814dd1343e6ee709becf18e',
  ],
  [
    '.ai/skills/pavp-ui/references/execution-contract.md',
    'a31adaef88aab5bc6beb09a71483209bb8fa9d853d28315313387e92a2bb8acd',
  ],
  [
    '.ai/skills/pavp-ui/references/acceptance-report.md',
    '74d512da345cee79cd7a1301be9eeda121cb298496ef4c022df0510acb32fc71',
  ],
])
const numericVersionStylePattern = new RegExp(
  ['(?:', 'v', '|version)', '[123]', '(?![0-9])'].join(''),
  'iu',
)
const namingContentScanExcludedPaths = new Set(['pnpm-lock.yaml'])

function normalizePath(path: string): string {
  return path.split(sep).join('/')
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWithinPath(repositoryPath: string, parentPath: string): boolean {
  return repositoryPath === parentPath || repositoryPath.startsWith(`${parentPath}/`)
}

function collectTrackedSymbolicLinks(): string[] {
  const indexEntries = execFileSync('git', ['ls-files', '--stage', '-z'], {
    cwd: rootDirectory,
    encoding: 'utf8',
  })

  return indexEntries
    .split('\0')
    .filter((entry) => entry.startsWith('120000 '))
    .map((entry) => entry.slice(entry.indexOf('\t') + 1))
}

async function collectRepositoryInventory(directory: string): Promise<RepositoryInventory> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })
  const inventory: RepositoryInventory = {
    directories: [],
    regularFiles: [],
    symbolicLinks: [],
  }

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      const childInventory = await collectRepositoryInventory(path)

      inventory.directories.push(path, ...childInventory.directories)
      inventory.regularFiles.push(...childInventory.regularFiles)
      inventory.symbolicLinks.push(...childInventory.symbolicLinks)
    } else if (entry.isSymbolicLink()) {
      inventory.symbolicLinks.push(path)
    } else if (entry.isFile()) {
      inventory.regularFiles.push(path)
    }
  }

  return inventory
}

function packageDependencies(packageJson: JsonObject): string[] {
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
  const dependencies: string[] = []

  for (const section of sections) {
    const values = packageJson[section]

    if (isJsonObject(values)) {
      dependencies.push(...Object.keys(values))
    }
  }

  return dependencies
}

const inventory = await collectRepositoryInventory(rootDirectory)
const repositoryFiles = new Set(
  inventory.regularFiles.map((file) => normalizePath(relative(rootDirectory, file))),
)
const violations: string[] = []

for (const repositoryPath of subordinateBrowserRuleSyncFiles) {
  if (!repositoryFiles.has(repositoryPath)) {
    violations.push(`${repositoryPath}: subordinate browser-rule synchronization file is missing.`)
    continue
  }

  const expectedHash = subordinateBrowserRuleContentHashes.get(repositoryPath)

  if (expectedHash !== undefined) {
    const content = await readFile(join(rootDirectory, repositoryPath))
    const actualHash = createHash('sha256').update(content).digest('hex')

    if (actualHash !== expectedHash) {
      violations.push(
        `${repositoryPath}: subordinate workflow content drift requires an architecture-authorized synchronization.`,
      )
    }
  }
}

for (const requiredPath of requiredAiWorkflowFiles) {
  if (!repositoryFiles.has(requiredPath)) {
    violations.push(`${requiredPath}: required project UI workflow file is missing or not regular.`)
  }
}

for (const absolutePath of inventory.directories) {
  const repositoryPath = normalizePath(relative(rootDirectory, absolutePath))
  const segments = repositoryPath.split('/')

  if (
    (repositoryPath === '.ai' || repositoryPath.startsWith('.ai/')) &&
    !allowedAiDirectories.has(repositoryPath)
  ) {
    violations.push(`${repositoryPath}: directory is outside the project UI workflow allowlist.`)
  }

  if (
    segments.some((segment) => forbiddenClientAuthorityDirectoryNames.has(segment.toLowerCase()))
  ) {
    violations.push(`${repositoryPath}: client-specific project authority path is forbidden.`)
  }

  if (segments.some((segment) => forbiddenDirectoryNames.has(segment.toLowerCase()))) {
    violations.push(`${repositoryPath}: forbidden test, demo, or evidence directory.`)
  }

  if ([...forbiddenRootPaths].some((path) => isWithinPath(repositoryPath, path))) {
    violations.push(`${repositoryPath}: forbidden repository infrastructure.`)
  }
}

const symbolicLinks = new Set([
  ...inventory.symbolicLinks.map((path) => normalizePath(relative(rootDirectory, path))),
  ...collectTrackedSymbolicLinks(),
])

for (const repositoryPath of symbolicLinks) {
  violations.push(`${repositoryPath}: symbolic links are forbidden repository infrastructure.`)
}

for (const absolutePath of inventory.regularFiles) {
  const repositoryPath = normalizePath(relative(rootDirectory, absolutePath))
  const segments = repositoryPath.split('/')
  const fileName = segments.at(-1) ?? ''

  if (numericVersionStylePattern.test(repositoryPath)) {
    violations.push(`${repositoryPath}: numeric-version-style file naming is forbidden.`)
  }

  if (
    (repositoryPath === '.ai' || repositoryPath.startsWith('.ai/')) &&
    !requiredAiWorkflowFiles.has(repositoryPath)
  ) {
    violations.push(`${repositoryPath}: file is outside the exact project UI workflow allowlist.`)
  }

  if (
    segments.some((segment) => forbiddenClientAuthorityDirectoryNames.has(segment.toLowerCase()))
  ) {
    violations.push(`${repositoryPath}: client-specific project authority path is forbidden.`)
  }

  if (segments.some((segment) => forbiddenDirectoryNames.has(segment.toLowerCase()))) {
    violations.push(`${repositoryPath}: forbidden test, demo, or evidence directory.`)
  }

  if (forbiddenFilePatterns.some((pattern) => pattern.test(fileName.toLowerCase()))) {
    violations.push(`${repositoryPath}: forbidden test or browser-automation file.`)
  }

  if ([...forbiddenRootPaths].some((path) => isWithinPath(repositoryPath, path))) {
    violations.push(`${repositoryPath}: forbidden repository infrastructure.`)
  }

  if (fileName === 'package.json') {
    const parsed = JSON.parse(await readFile(absolutePath, 'utf8')) as unknown

    if (!isJsonObject(parsed)) {
      violations.push(`${repositoryPath}: package manifest must be a JSON object.`)
      continue
    }

    for (const dependency of packageDependencies(parsed)) {
      if (forbiddenDependencyPatterns.some((pattern) => pattern.test(dependency.toLowerCase()))) {
        violations.push(`${repositoryPath}: forbidden dependency "${dependency}".`)
      }
    }
  }

  const content = await readFile(absolutePath)

  if (content.includes(0)) {
    continue
  }

  const text = content.toString('utf8')

  if (
    !namingContentScanExcludedPaths.has(repositoryPath) &&
    !repositoryPath.startsWith('patches/') &&
    !repositoryPath.endsWith('.svg') &&
    numericVersionStylePattern.test(text)
  ) {
    violations.push(`${repositoryPath}: numeric-version-style naming is forbidden.`)
  }

  for (const { label, pattern } of forbiddenHomePathPatterns) {
    if (pattern.test(text)) {
      violations.push(`${repositoryPath}: ${label} dependency is forbidden.`)
    }
  }

  if (forbiddenMachineLocalAuthorityPathPatterns.some((pattern) => pattern.test(text))) {
    violations.push(`${repositoryPath}: machine-local authority or registry path is forbidden.`)
  }
}

if (violations.length > 0) {
  throw new Error(
    `Repository policy violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  )
}

console.log('Production-only repository policy: valid')
