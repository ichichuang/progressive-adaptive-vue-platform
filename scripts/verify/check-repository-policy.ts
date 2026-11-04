import { execFileSync } from 'node:child_process'
import { readFile, readdir, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

import ts from 'typescript'

import { styleCompilerAdmission, styleSourceAdmission } from '../architecture/style-ownership'

type JsonObject = Record<string, unknown>

interface RepositoryInventory {
  directories: string[]
  regularFiles: string[]
  symbolicLinks: string[]
}

const rootDirectory = await realpath(process.cwd())
const ignoredDirectoryNames = new Set(['.git', 'node_modules'])
const generatedOutputDirectories = new Set([resolve(rootDirectory, 'apps/web/dist')])
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
const numericVersionStylePattern = new RegExp(
  ['(?:', 'v', '|version)', '[123]', '(?![0-9])'].join(''),
  'iu',
)
const requireFromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
const vueSfcCompiler = requireFromWeb('vue/compiler-sfc') as {
  readonly parse: (
    source: string,
    options: Readonly<{ filename: string }>,
  ) => {
    readonly descriptor: {
      readonly script: { readonly content: string } | null
      readonly scriptSetup: { readonly content: string } | null
    }
    readonly errors: readonly unknown[]
  }
}

function numericVersionDeclarationNames(path: string, text: string): string[] {
  if (path.endsWith('.vue')) {
    const parsed = vueSfcCompiler.parse(text, { filename: path })
    if (parsed.errors.length > 0) throw new Error(`${path}: invalid Vue source.`)
    text = [parsed.descriptor.script?.content, parsed.descriptor.scriptSetup?.content]
      .filter((content): content is string => content !== undefined)
      .join('\n')
  } else if (!/\.[cm]?[jt]sx?$/iu.test(path)) {
    return []
  }

  const parsed = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  const names = new Set<string>()
  function inspectBinding(name: ts.BindingName | ts.PropertyName | undefined): void {
    if (name === undefined) return
    if (ts.isStringLiteral(name)) {
      let first = true
      for (const character of name.text) {
        const codePoint = character.codePointAt(0) ?? 0
        if (
          first
            ? !ts.isIdentifierStart(codePoint, ts.ScriptTarget.Latest)
            : !ts.isIdentifierPart(codePoint, ts.ScriptTarget.Latest)
        )
          return // Punctuation-bearing keys are data, not owned identifier names.
        first = false
      }
      if (first) return
    }
    if (
      (ts.isIdentifier(name) || ts.isStringLiteral(name)) &&
      numericVersionStylePattern.test(name.text)
    )
      names.add(name.text)
    if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression))
      inspectBinding(name.expression)
    if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) inspectBinding(element.name)
      }
    }
  }
  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isTypeParameterDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isMethodSignature(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isPropertySignature(node) ||
      ts.isPropertyAssignment(node) ||
      ts.isShorthandPropertyAssignment(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    )
      inspectBinding(node.name)
    // Upstream exported names are external contracts; an explicit local alias is ours.
    if (ts.isImportSpecifier(node) && node.propertyName !== undefined) inspectBinding(node.name)
    if (ts.isImportClause(node) || ts.isNamespaceImport(node)) inspectBinding(node.name)
    if (ts.isExportSpecifier(node) && node.propertyName !== undefined) inspectBinding(node.name)
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  return [...names]
}

function normalizePath(path: string): string {
  return path.split(sep).join('/')
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWithinPath(repositoryPath: string, parentPath: string): boolean {
  return repositoryPath === parentPath || repositoryPath.startsWith(`${parentPath}/`)
}

function isWithinDirectory(path: string, directory: string): boolean {
  const descendant = relative(directory, path)
  return !isAbsolute(descendant) && descendant !== '..' && !descendant.startsWith(`..${sep}`)
}

function isProductSourceRoot(path: string): boolean {
  const segments = relative(rootDirectory, path)
    .split(sep)
    .map((segment) => segment.toLowerCase())
  return (
    segments.length >= 3 &&
    (segments[0] === 'apps' || segments[0] === 'packages') &&
    segments.at(-1) === 'src' &&
    !segments.some((segment) =>
      ['.git', 'node_modules', 'dist', '.cache', '.vite', '.turbo'].includes(segment),
    )
  )
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

    if (
      entry.isDirectory() &&
      !ignoredDirectoryNames.has(entry.name) &&
      !generatedOutputDirectories.has(path)
    ) {
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
// Discover real source directories, including workspaces absent from the curated
// project registry. Filesystem ancestry, not a string prefix, owns containment.
const governedSourceRoots = inventory.directories.filter(isProductSourceRoot)
const repositoryFiles = new Set(
  inventory.regularFiles.map((file) => normalizePath(relative(rootDirectory, file))),
)
const violations: string[] = []

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
  const path = resolve(rootDirectory, repositoryPath)
  const sourceRoot = isProductSourceRoot(path)
    ? path
    : governedSourceRoots.find((root) => isWithinDirectory(path, root))
  if (sourceRoot !== undefined) {
    violations.push(
      `${repositoryPath}: NOT_ADMITTED: symbolic product source cannot be inspected in governed source root ${normalizePath(relative(rootDirectory, sourceRoot))}.`,
    )
  }
}

for (const absolutePath of inventory.regularFiles) {
  const repositoryPath = normalizePath(relative(rootDirectory, absolutePath))
  const segments = repositoryPath.split('/')
  const fileName = segments.at(-1) ?? ''

  const sourceRoot = governedSourceRoots.find((root) => isWithinDirectory(absolutePath, root))
  if (sourceRoot !== undefined && /\.[jt]sx$/iu.test(fileName)) {
    violations.push(
      `${repositoryPath}: NOT_ADMITTED: product authoring is TypeScript and Vue in governed source root ${normalizePath(relative(rootDirectory, sourceRoot))}; JSX/TSX requires a separate Owner decision.`,
    )
  }
  if (sourceRoot !== undefined && !isWithinDirectory(await realpath(absolutePath), sourceRoot)) {
    violations.push(
      `${repositoryPath}: NOT_ADMITTED: product source escapes governed source root ${normalizePath(relative(rootDirectory, sourceRoot))}.`,
    )
  }

  if (/\.(?:scss|sass)$/iu.test(fileName)) {
    violations.push(
      ...styleSourceAdmission({
        path: repositoryPath,
        block: 0,
        lang: fileName.toLowerCase().endsWith('.scss') ? 'scss' : 'sass',
        scoped: true,
        content: await readFile(absolutePath, 'utf8'),
      }).map((message) => `${repositoryPath}: ${message}`),
    )
  }

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
      if (
        /^sass(?:-embedded)?$/u.test(dependency) &&
        !styleCompilerAdmission(repositoryPath, dependency)
      ) {
        violations.push(
          `${repositoryPath}: style compiler requires explicit support and an exact fallback owner.`,
        )
      }
    }
  }

  const content = await readFile(absolutePath)

  if (content.includes(0)) {
    continue
  }

  const text = content.toString('utf8')

  for (const name of numericVersionDeclarationNames(repositoryPath, text)) {
    violations.push(`${repositoryPath}: numeric-version-style declaration ${name} is forbidden.`)
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

const namingProbes: readonly (readonly [string, string, readonly string[]])[] = [
  [
    'naming-probe.ts',
    `import { externalV1 } from 'vendor'
const endpoint = 'https://example.invalid/api/v1'
const release = 'v2.0.0'
const label = 'Version3 migration'
// Protocol v1 is an external contract.
export { externalV1 }`,
    [],
  ],
  [
    'naming-probe.ts',
    'const layoutV2 = {}; function loadVersion3() {}',
    ['layoutV2', 'loadVersion3'],
  ],
  [
    'naming-probe.ts',
    `const layout = { layoutV2: true, 'panelV1': true, ['surfaceV3']: true }
const endpoint = { path: '/api/v1' }
const handlers = { get layoutVersion2() { return true } }`,
    ['layoutV2', 'panelV1', 'surfaceV3', 'layoutVersion2'],
  ],
  [
    'naming-probe.ts',
    `const external = { '/api/v1': true, 'api/v1': true, 'v2.0': true, 'v2.0.0': true,
  ['v3.1.0-beta.1']: true, 'application/vnd.example.v2+json': true,
  'https://example.invalid/api/v1': true }
const owned = { 'layoutV2': true, ['layoutVersion3']: true, '布局V2': true }`,
    ['layoutV2', 'layoutVersion3', '布局V2'],
  ],
  [
    'NamingProbe.vue',
    '<script setup lang="ts">const layoutV2 = 1</script><template><span>v1</span></template>',
    ['layoutV2'],
  ],
]
for (const [path, text, expected] of namingProbes) {
  const actual = numericVersionDeclarationNames(path, text)
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index]))
    violations.push('Repository naming in-memory probe failed.')
}

if (violations.length > 0) {
  throw new Error(
    `Repository policy violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  )
}

console.log('Repository policy: valid')
