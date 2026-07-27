import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules'])
const forbiddenDirectoryNames = new Set([
  '__snapshots__',
  '__tests__',
  'coverage',
  'demos',
  'e2e',
  'evidence',
  'fixtures',
  'mocks',
  'screenshots',
  'showcase',
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
  '.ai',
  '.agents',
  '.storybook',
  '.github/dependabot.yml',
  'apps/desktop',
  'apps/mobile',
  'apps/docs',
])

function normalizePath(path: string): string {
  return path.split(sep).join('/')
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function collectRepositoryFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...(await collectRepositoryFiles(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
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

const files = await collectRepositoryFiles(rootDirectory)
const violations: string[] = []

for (const absolutePath of files) {
  const repositoryPath = normalizePath(relative(rootDirectory, absolutePath))
  const segments = repositoryPath.split('/')
  const fileName = segments.at(-1) ?? ''

  if (segments.some((segment) => forbiddenDirectoryNames.has(segment.toLowerCase()))) {
    violations.push(`${repositoryPath}: forbidden test, demo, or evidence directory.`)
  }

  if (forbiddenFilePatterns.some((pattern) => pattern.test(fileName.toLowerCase()))) {
    violations.push(`${repositoryPath}: forbidden test or browser-automation file.`)
  }

  if (forbiddenRootPaths.has(repositoryPath)) {
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
}

for (const forbiddenPath of forbiddenRootPaths) {
  const absolutePath = resolve(rootDirectory, forbiddenPath)

  if (files.some((file) => file === absolutePath || file.startsWith(`${absolutePath}${sep}`))) {
    violations.push(`${forbiddenPath}: forbidden repository infrastructure.`)
  }
}

if (violations.length > 0) {
  throw new Error(
    `Repository policy violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  )
}

console.log('Production-only repository policy: valid')
