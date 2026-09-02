import { createHash } from 'node:crypto'
import { access, lstat, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { extname, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import { projectConfig } from '../../project.config'
import ts from 'typescript'
import { parse as parseYaml } from 'yaml'

import { routeRegistry } from '../../apps/web/src/app/router/route-registry'
import { routerFileGenerationOptions } from '../../apps/web/vite.config'
import { runtimePreflightAuthority } from './check-runtime'

type JsonObject = Record<string, unknown>

interface OfficialRouteGeneratorContext {
  generateRoutes(): string
  scanPages(startWatchers?: boolean): Promise<void>
  stopWatcher(): void
}

const officialVueRouterGenerator = createRequire(import.meta.url)('vue-router/unplugin') as {
  createRoutesContext(options: unknown): OfficialRouteGeneratorContext
  resolveOptions(options: unknown): unknown
}

const rootDirectory = process.cwd()
const expectedRuntime = {
  node: '24.15.0',
  pnpm: '10.34.5',
  typescript: '6.0.3',
} as const
const expectedPackageManager = `pnpm@${expectedRuntime.pnpm}`
const expectedBuildVersion = '0.0.0'
const expectedZodVersion = '4.4.3'
const expectedVueVersion = '3.5.40'
const expectedVueRouterVersion = '5.2.0'
const expectedVueRouterIntegrity =
  'sha512-QAC5i0LEb1GLG0LXDQmHu8L7FX12j0KwU/JTKmLQUJMrn04gQdKP6Du+p0QwpHb3iy71vBlqnHQ8WAfOSAWhqw=='
const expectedNaiveUiVersion = '2.45.2'
const expectedNaiveUiIntegrity =
  'sha512-KshetbFOX/uZ/Pe+60hJoUAo47x5QO1JpZaUVPQCQkNhFfJ7hKsX55A8oMFQHccEpLuQUMPkJ41cX94R4nWUjg=='
const expectedMotionVVersion = '2.4.0'
const expectedMotionVIntegrity =
  'sha512-kRDGMAZk3nvdjEO36Wo6pezSEIStGXGhVFiwo1QkUDsUg8mB5igjYPXyece8wtu2DrHhmFfA6Y1nOz07+5QH4A=='
const expectedVueUseCoreVersion = '14.4.0'
const expectedVueUseCoreIntegrity =
  'sha512-X4WHz1HlCzCBoYXesUkifzzWBAcZgXG8Fi5iNPQg/epdzOB3gu8Fawj3hvuwYR1nGcXGnvxwYYcUC/71++svtQ=='
const vueRouterDeclarationFileName = 'index-BN0B0y8a.d.ts'
const vueRouterPatchPath = 'patches/vue-router@5.2.0.patch'
const motionVPatchPath = 'patches/motion-v@2.4.0.patch'
const expectedMotionVPatchHash = 'fe15a8c9fbe1795b63b62db2b0a262c44c45fe58fc75b14cd89c51ead0e19d59'
const expectedMotionVPatchDeclarationFileCount = 19
const expectedMotionVPatchDeclarationHunkCount = 20
const expectedMotionVRuntimeJavaScriptFileCount = 91
const expectedMotionVRuntimeHashManifest =
  '58f8bbff2272c77b361cbc3eb438f7e3b32d4b42eb83b1599760bb76db502adb'
const expectedVueUseCoreSnapshotCoordinate = '@vueuse/core@14.4.0(vue@3.5.40(typescript@6.0.3))'
const expectedMotionVSnapshotCoordinate =
  'motion-v@2.4.0(patch_hash=fe15a8c9fbe1795b63b62db2b0a262c44c45fe58fc75b14cd89c51ead0e19d59)(@vueuse/core@14.4.0(vue@3.5.40(typescript@6.0.3)))(vue@3.5.40(typescript@6.0.3))'
const expectedPatchedDependencies = {
  'motion-v@2.4.0': motionVPatchPath,
  'unconfig@7.5.0': 'patches/unconfig@7.5.0.patch',
  'vue-router@5.2.0': vueRouterPatchPath,
} as const
const prohibitedDirectMotionCompatibilityDependencies = [
  'react',
  'react-dom',
  '@types/react',
  '@types/react-dom',
  '@types/web-bluetooth',
] as const
const expectedImplementationContract = {
  phase: 1,
  state: 'IN_PROGRESS',
} as const
const exactSemanticVersionPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u
const buildConfigurationSourceExtensions = new Set(['.html', '.js', '.mjs', '.ts', '.vue'])
const excludedBuildConfigurationDirectories = new Set(['dist', 'node_modules'])

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

function canonicalPageSourcePath(filePath: string): string {
  return relative(rootDirectory, filePath).split('\\').join('/')
}

async function validateOfficialRouteDtsRegeneration(): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pavp-router-dts-'))
  const generatedPath = resolve(temporaryDirectory, 'route-map.d.ts')
  const context = officialVueRouterGenerator.createRoutesContext(
    officialVueRouterGenerator.resolveOptions({
      ...routerFileGenerationOptions,
      dts: generatedPath,
    }),
  )

  try {
    await context.scanPages(false)
    const generatedRuntimeRoutes = context.generateRoutes()
    const [generated, repositoryArtifact] = await Promise.all([
      readFile(generatedPath, 'utf8'),
      readFile(resolve(rootDirectory, 'apps/web/src/route-map.d.ts'), 'utf8'),
    ])

    expectEqual(repositoryArtifact, generated, 'Official generated Router DTS equality')
    const runtimeSource = ts.createSourceFile(
      '<official-vue-router-runtime-routes>',
      generatedRuntimeRoutes,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const generatedRecords = collectNodes(runtimeSource, ts.isObjectLiteralExpression).flatMap(
      (object) => {
        const path = objectPropertyExpression(object, 'path')
        const name = objectPropertyExpression(object, 'name')
        const component = objectPropertyExpression(object, 'component')
        const componentBody =
          component !== undefined && ts.isArrowFunction(component) ? component.body : undefined

        if (
          path === undefined ||
          !ts.isStringLiteral(path) ||
          name === undefined ||
          !ts.isStringLiteral(name) ||
          componentBody === undefined ||
          !ts.isCallExpression(componentBody) ||
          componentBody.expression.kind !== ts.SyntaxKind.ImportKeyword ||
          componentBody.arguments.length !== 1 ||
          componentBody.arguments[0] === undefined ||
          !ts.isStringLiteral(componentBody.arguments[0])
        ) {
          return []
        }

        return [
          [canonicalPageSourcePath(componentBody.arguments[0].text), name.text, path.text] as const,
        ]
      },
    )
    const expectedRecords = routeRegistry.map(
      (record) => [record.sourcePath, record.name, record.pathPattern] as const,
    )
    const bySourcePath = (left: readonly string[], right: readonly string[]): number =>
      left[0]?.localeCompare(right[0] ?? '', 'en') ?? 0

    expectStructuredEqual(
      [...generatedRecords].sort(bySourcePath),
      [...expectedRecords].sort(bySourcePath),
      'Official generated runtime Route Registry projection',
    )
  } finally {
    context.stopWatcher()
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

function vueRouterDeclarationDiagnostics(declarationText: string): readonly ts.Diagnostic[] {
  const configurationPath = resolve(rootDirectory, 'apps/web/tsconfig.json')
  const configuration = ts.readConfigFile(configurationPath, (fileName) =>
    ts.sys.readFile(fileName),
  )

  if (configuration.error !== undefined) {
    throw new Error('Router compatibility probe could not read the web TypeScript configuration.')
  }

  const parsed = ts.parseJsonConfigFileContent(
    configuration.config,
    ts.sys,
    resolve(rootDirectory, 'apps/web'),
    { noEmit: true },
    configurationPath,
  )

  if (
    parsed.options.strict !== true ||
    parsed.options.exactOptionalPropertyTypes !== true ||
    parsed.options.skipLibCheck === true
  ) {
    throw new Error('Router compatibility probe requires the unchanged strict TypeScript policy.')
  }

  const host = ts.createCompilerHost(parsed.options)
  const originalGetSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName.endsWith(`/vue-router/dist/${vueRouterDeclarationFileName}`)
      ? ts.createSourceFile(fileName, declarationText, languageVersion, true, ts.ScriptKind.TS)
      : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)

  const program = ts.createProgram({
    rootNames: [resolve(rootDirectory, 'apps/web/src/route-map.d.ts')],
    options: parsed.options,
    host,
  })

  return ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        diagnostic.code === 2430 &&
        diagnostic.file?.fileName.endsWith(`/vue-router/dist/${vueRouterDeclarationFileName}`) ===
          true,
    )
}

async function validateVueRouterCompatibilityProbe(): Promise<void> {
  const declarationPath = resolve(
    rootDirectory,
    `apps/web/node_modules/vue-router/dist/${vueRouterDeclarationFileName}`,
  )
  const patchedDeclaration = await readFile(declarationPath, 'utf8')
  const replacements = [
    ['name?: RecordName | undefined;', 'name?: RecordName;'],
    ['path?: MatcherPatternPath | undefined;', 'path?: MatcherPatternPath;'],
    ['hash?: MatcherPatternHash | undefined;', 'hash?: MatcherPatternHash;'],
  ] as const
  let unpatchedDeclaration = patchedDeclaration

  for (const [patched, unpatched] of replacements) {
    expectExactCount(
      patchedDeclaration.split(patched).length - 1,
      1,
      `Installed Vue Router declaration replacement ${patched}`,
    )
    unpatchedDeclaration = unpatchedDeclaration.replace(patched, unpatched)
  }

  expectExactCount(
    vueRouterDeclarationDiagnostics(patchedDeclaration).length,
    0,
    'Patched Vue Router TS2430 diagnostics',
  )

  const unpatchedDiagnostics = vueRouterDeclarationDiagnostics(unpatchedDeclaration)
  const unpatchedLines = unpatchedDiagnostics.map((diagnostic) =>
    diagnostic.file === undefined || diagnostic.start === undefined
      ? undefined
      : diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1,
  )
  expectStructuredEqual(
    unpatchedLines,
    [1227, 1336],
    'Unpatched official Vue Router TS2430 diagnostic coordinates',
  )
  const unpatchedMessages = unpatchedDiagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  )

  if (
    !unpatchedMessages[0]?.includes("Interface 'EXPERIMENTAL_ResolverRecord_Group'") ||
    !unpatchedMessages[0].includes("Type 'undefined' is not assignable to type 'RecordName'") ||
    !unpatchedMessages[1]?.includes("Interface 'EXPERIMENTAL_RouteRecord_Base'") ||
    !unpatchedMessages[1].includes("Type 'undefined' is not assignable to type 'RecordName'")
  ) {
    throw new Error('Unpatched official Vue Router TS2430 causal diagnostics drifted.')
  }
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

function expectExactCount(actual: number, expected: number, description: string): void {
  if (actual !== expected) {
    throw new Error(`${description}: expected ${String(expected)}, received ${String(actual)}.`)
  }
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

interface MotionPatchMetadata {
  readonly hash: string
  readonly hunkCount: number
  readonly targetFiles: readonly string[]
}

function readMotionPatchMetadata(patch: string): MotionPatchMetadata {
  const lines = patch.split('\n')
  const targetFiles = lines
    .filter((line) => line.startsWith('diff --git '))
    .map((line) => {
      const match = /^diff --git a\/(\S+) b\/(\S+)$/u.exec(line)

      if (match?.[1] === undefined || match[2] === undefined || match[1] !== match[2]) {
        throw new Error(`Motion for Vue patch contains an invalid target header: ${line}.`)
      }

      return match[1]
    })
  const declarationOnly = targetFiles.every(
    (file) => file.endsWith('.d.ts') || file.endsWith('.d.mts'),
  )
  const oldTargets = lines
    .filter((line) => line.startsWith('--- '))
    .map((line) => line.slice('--- a/'.length))
  const newTargets = lines
    .filter((line) => line.startsWith('+++ '))
    .map((line) => line.slice('+++ b/'.length))

  if (
    !declarationOnly ||
    targetFiles.length === 0 ||
    new Set(targetFiles).size !== targetFiles.length ||
    !isDeepStrictEqual(oldTargets, targetFiles) ||
    !isDeepStrictEqual(newTargets, targetFiles) ||
    lines.some(
      (line) =>
        line === 'GIT binary patch' ||
        line.startsWith('Binary files ') ||
        line.startsWith('rename from ') ||
        line.startsWith('rename to '),
    )
  ) {
    throw new Error(
      'Motion for Vue patch must target unique declaration files only, with matching old/new headers.',
    )
  }

  return {
    hash: createHash('sha256').update(patch).digest('hex'),
    hunkCount: lines.filter((line) => line.startsWith('@@ ')).length,
    targetFiles,
  }
}

async function collectFiles(
  directory: string,
  predicate: (fileName: string) => boolean,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path, predicate)))
    } else if (entry.isFile() && predicate(entry.name)) {
      files.push(path)
    }
  }

  return files
}

interface RuntimeHashManifest {
  readonly fileCount: number
  readonly hash: string
}

async function createMotionVRuntimeHashManifest(
  packageDirectory: string,
): Promise<RuntimeHashManifest> {
  const runtimeFiles = await collectFiles(
    packageDirectory,
    (fileName) => fileName.endsWith('.js') || fileName.endsWith('.mjs'),
  )
  const relativeFiles = runtimeFiles
    .map((file) => relative(packageDirectory, file).split('\\').join('/'))
    .sort(codePointCompare)
  const manifestHash = createHash('sha256')

  for (const relativeFile of relativeFiles) {
    const fileHash = createHash('sha256')
      .update(await readFile(resolve(packageDirectory, relativeFile)))
      .digest('hex')
    manifestHash.update(relativeFile).update('\0').update(fileHash).update('\n')
  }

  return { fileCount: relativeFiles.length, hash: manifestHash.digest('hex') }
}

function architectureAssignmentBlock(
  architecture: string,
  firstAssignment: string,
): Readonly<Record<string, string>> {
  const starts = [...architecture.matchAll(new RegExp(`^${firstAssignment}$`, 'gmu'))]

  if (starts.length !== 1 || starts[0]?.index === undefined) {
    throw new Error(`ARCHITECTURE.md must contain exactly one ${firstAssignment} block.`)
  }

  const blockStart = starts[0].index
  const blockEnd = architecture.indexOf('\n```', blockStart)

  if (blockEnd === -1) {
    throw new Error(`ARCHITECTURE.md does not close the ${firstAssignment} block.`)
  }

  const assignments: Record<string, string> = {}

  for (const line of architecture.slice(blockStart, blockEnd).split('\n')) {
    const separator = line.indexOf('=')

    if (separator <= 0) {
      continue
    }

    const key = line.slice(0, separator)

    if (!/^[A-Z][A-Z0-9_]*$/u.test(key) || Object.hasOwn(assignments, key)) {
      throw new Error(`ARCHITECTURE.md contains an invalid or duplicate ${key} assignment.`)
    }

    assignments[key] = line.slice(separator + 1)
  }

  return assignments
}

function motionDeclarationCompatibilityDiagnostics(
  includePublishedGlobalAugmentation: boolean,
): readonly ts.Diagnostic[] {
  const fixturePath = resolve(rootDirectory, '<motion-v-declaration-compatibility-probe>.ts')
  const fixture = `
interface VueNativeHtmlAttributes {
  onDrag?: (event: { readonly nativeDrag: true }) => void
}
interface PublishedMotionOptions {
  onDrag?: (event: { readonly motionDrag: true }) => void
}
interface EffectiveHtmlAttributes extends VueNativeHtmlAttributes${
    includePublishedGlobalAugmentation ? ', PublishedMotionOptions' : ''
  } {}
`
  const options: ts.CompilerOptions = {
    exactOptionalPropertyTypes: true,
    noEmit: true,
    skipLibCheck: false,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  }
  const host = ts.createCompilerHost(options)
  const originalFileExists = host.fileExists.bind(host)
  const originalGetSourceFile = host.getSourceFile.bind(host)
  const originalReadFile = host.readFile.bind(host)
  host.fileExists = (fileName) => fileName === fixturePath || originalFileExists(fileName)
  host.readFile = (fileName) => (fileName === fixturePath ? fixture : originalReadFile(fileName))
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === fixturePath
      ? ts.createSourceFile(fileName, fixture, languageVersion, true, ts.ScriptKind.TS)
      : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)

  return ts
    .getPreEmitDiagnostics(ts.createProgram({ host, options, rootNames: [fixturePath] }))
    .filter((diagnostic) => diagnostic.file?.fileName === fixturePath)
}

interface MotionPatchInvariantModel {
  readonly canonicalPatchCount: number
  readonly declarationFileCount: number
  readonly declarationHunkCount: number
  readonly declarationOnly: boolean
  readonly directCompatibilityDependencyCount: number
  readonly exactOptionalPropertyTypes: boolean
  readonly motionPatchCount: number
  readonly patchHash: string
  readonly patchPath: string
  readonly runtimeFileCount: number
  readonly runtimeHash: string
  readonly skipLibCheck: boolean
  readonly strict: boolean
}

function motionPatchInvariantViolations(model: MotionPatchInvariantModel): readonly string[] {
  return [
    model.canonicalPatchCount === 3 ? undefined : 'canonical patch count',
    model.declarationFileCount === expectedMotionVPatchDeclarationFileCount
      ? undefined
      : 'declaration file count',
    model.declarationHunkCount === expectedMotionVPatchDeclarationHunkCount
      ? undefined
      : 'declaration hunk count',
    model.declarationOnly ? undefined : 'declaration-only scope',
    model.directCompatibilityDependencyCount === 0
      ? undefined
      : 'direct compatibility dependency count',
    model.exactOptionalPropertyTypes ? undefined : 'exactOptionalPropertyTypes',
    model.motionPatchCount === 1 ? undefined : 'Motion patch count',
    model.patchHash === expectedMotionVPatchHash ? undefined : 'patch hash',
    model.patchPath === motionVPatchPath ? undefined : 'patch path',
    model.runtimeFileCount === expectedMotionVRuntimeJavaScriptFileCount
      ? undefined
      : 'runtime file count',
    model.runtimeHash === expectedMotionVRuntimeHashManifest ? undefined : 'runtime hash',
    !model.skipLibCheck ? undefined : 'skipLibCheck',
    model.strict ? undefined : 'strict',
  ].filter((violation): violation is string => violation !== undefined)
}

function validateMotionPatchCompatibilityProbes(): void {
  const control: MotionPatchInvariantModel = {
    canonicalPatchCount: 3,
    declarationFileCount: expectedMotionVPatchDeclarationFileCount,
    declarationHunkCount: expectedMotionVPatchDeclarationHunkCount,
    declarationOnly: true,
    directCompatibilityDependencyCount: 0,
    exactOptionalPropertyTypes: true,
    motionPatchCount: 1,
    patchHash: expectedMotionVPatchHash,
    patchPath: motionVPatchPath,
    runtimeFileCount: expectedMotionVRuntimeJavaScriptFileCount,
    runtimeHash: expectedMotionVRuntimeHashManifest,
    skipLibCheck: false,
    strict: true,
  }

  if (motionPatchInvariantViolations(control).length !== 0) {
    throw new Error('Motion declaration-patch invariant control probe must pass.')
  }

  for (const mutation of [
    { canonicalPatchCount: 4 },
    { declarationFileCount: 20 },
    { declarationHunkCount: 21 },
    { declarationOnly: false },
    { directCompatibilityDependencyCount: 1 },
    { exactOptionalPropertyTypes: false },
    { motionPatchCount: 2 },
    { patchHash: '0'.repeat(64) },
    { patchPath: 'patches/motion-v.patch' },
    { runtimeFileCount: 92 },
    { runtimeHash: '0'.repeat(64) },
    { skipLibCheck: true },
    { strict: false },
  ] satisfies readonly Partial<MotionPatchInvariantModel>[]) {
    if (motionPatchInvariantViolations({ ...control, ...mutation }).length === 0) {
      throw new Error('Motion declaration-patch reversible in-memory mutation probe must fail.')
    }
  }

  const unpatchedDiagnostics = motionDeclarationCompatibilityDiagnostics(true)
  const patchedDiagnostics = motionDeclarationCompatibilityDiagnostics(false)

  if (
    unpatchedDiagnostics.length < 1 ||
    !unpatchedDiagnostics.some(
      (diagnostic) =>
        diagnostic.code === 2320 &&
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').includes('onDrag'),
    ) ||
    patchedDiagnostics.length !== 0
  ) {
    throw new Error(
      'Motion declaration compatibility fixture must reproduce the unpatched HTMLAttributes conflict and clear it when patched.',
    )
  }
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression
  }

  return current
}

function descendantNodes(node: ts.Node): ts.Node[] {
  const descendants: ts.Node[] = []

  function visit(current: ts.Node): void {
    descendants.push(current)
    ts.forEachChild(current, visit)
  }

  visit(node)

  return descendants
}

function callExpressions(sourceFile: ts.Node): ts.CallExpression[] {
  const calls: ts.CallExpression[] = []

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      calls.push(node)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return calls
}

function collectNodes<Node extends ts.Node>(
  root: ts.Node,
  predicate: (node: ts.Node) => node is Node,
): Node[] {
  const nodes: Node[] = []

  function visit(node: ts.Node): void {
    if (predicate(node)) {
      nodes.push(node)
    }

    ts.forEachChild(node, visit)
  }

  visit(root)
  return nodes
}

function propertyName(property: ts.ObjectLiteralElementLike): string | undefined {
  if (property.name === undefined) {
    return undefined
  }

  return ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
    ? property.name.text
    : undefined
}

function objectPropertyExpression(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const property = object.properties.find((candidate) => propertyName(candidate) === name)

  if (property !== undefined && ts.isPropertyAssignment(property)) {
    return property.initializer
  }

  if (property !== undefined && ts.isShorthandPropertyAssignment(property)) {
    return property.name
  }

  return undefined
}

function hasExactObjectPropertySet(
  object: ts.ObjectLiteralExpression,
  expected: readonly string[],
): boolean {
  const names = object.properties.map(propertyName)
  return (
    names.every((name): name is string => name !== undefined) &&
    names.length === expected.length &&
    new Set(names).size === names.length &&
    expected.every((name) => names.includes(name))
  )
}

function importSpecifier(
  sourceFile: ts.SourceFile,
  moduleName: string,
  importedName: string,
): ts.ImportSpecifier | undefined {
  const matchingImports = sourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName,
  )
  const matchingSpecifiers = matchingImports.flatMap((statement) => {
    const bindings = statement.importClause?.namedBindings
    return bindings !== undefined && ts.isNamedImports(bindings)
      ? bindings.elements.filter(
          (element) => (element.propertyName?.text ?? element.name.text) === importedName,
        )
      : []
  })

  return matchingImports.length === 1 && matchingSpecifiers.length === 1
    ? matchingSpecifiers[0]
    : undefined
}

function defaultImportIdentifier(
  sourceFile: ts.SourceFile,
  moduleName: string,
): ts.Identifier | undefined {
  const matchingImports = sourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName,
  )
  const defaultImport = matchingImports[0]?.importClause?.name

  return matchingImports.length === 1 && defaultImport !== undefined ? defaultImport : undefined
}

function symbolAt(checker: ts.TypeChecker, node: ts.Node | undefined): ts.Symbol | undefined {
  if (node === undefined) {
    return undefined
  }

  if (
    ts.isIdentifier(node) &&
    ts.isShorthandPropertyAssignment(node.parent) &&
    node.parent.name === node
  ) {
    return checker.getShorthandAssignmentValueSymbol(node.parent)
  }

  return checker.getSymbolAtLocation(node)
}

function sameSymbol(
  checker: ts.TypeChecker,
  left: ts.Node | undefined,
  right: ts.Node | undefined,
): boolean {
  const leftSymbol = symbolAt(checker, left)
  const rightSymbol = symbolAt(checker, right)
  return leftSymbol !== undefined && leftSymbol === rightSymbol
}

function callFromExpression(expression: ts.Expression | undefined): ts.CallExpression | undefined {
  if (expression === undefined) {
    return undefined
  }

  let current = unwrapExpression(expression)

  if (ts.isAwaitExpression(current)) {
    current = unwrapExpression(current.expression)
  }

  return ts.isCallExpression(current) ? current : undefined
}

function isStringLiteral(expression: ts.Expression | undefined, expected: string): boolean {
  return expression !== undefined && ts.isStringLiteral(expression) && expression.text === expected
}

function isNumericLiteral(expression: ts.Expression | undefined, expected: number): boolean {
  return (
    expression !== undefined &&
    ts.isNumericLiteral(expression) &&
    Number(expression.text) === expected
  )
}

function resolveAliasedSymbol(checker: ts.TypeChecker, node: ts.Node): ts.Symbol | undefined {
  const symbol = checker.getSymbolAtLocation(node)

  if (symbol === undefined) {
    return undefined
  }

  return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol
}

function symbolDeclaredInPath(symbol: ts.Symbol | undefined, expectedPath: string): boolean {
  return (
    symbol !== undefined &&
    symbol.declarations?.some(
      (declaration) => resolve(declaration.getSourceFile().fileName) === resolve(expectedPath),
    ) === true
  )
}

interface CompilerContext {
  readonly checker: ts.TypeChecker
  readonly program: ts.Program
  readonly runtimeConfigurationSourceFile: ts.SourceFile
  readonly viteEnvironmentSourceFile: ts.SourceFile
  readonly viteSourceFile: ts.SourceFile
}

function createCompilerContext(input: {
  readonly runtimeConfigurationPath: string
  readonly viteConfigurationPath: string
  readonly viteEnvironmentPath: string
}): CompilerContext {
  const program = ts.createProgram({
    rootNames: [
      input.viteConfigurationPath,
      input.runtimeConfigurationPath,
      input.viteEnvironmentPath,
      resolve(rootDirectory, 'project.config.ts'),
    ],
    options: {
      allowJs: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
      types: ['node', 'vite/client'],
    },
  })
  const viteSourceFile = program.getSourceFile(input.viteConfigurationPath)
  const runtimeConfigurationSourceFile = program.getSourceFile(input.runtimeConfigurationPath)
  const viteEnvironmentSourceFile = program.getSourceFile(input.viteEnvironmentPath)

  if (
    viteSourceFile === undefined ||
    runtimeConfigurationSourceFile === undefined ||
    viteEnvironmentSourceFile === undefined
  ) {
    throw new Error('Runtime Kernel build authority compiler context is incomplete.')
  }

  const syntaxDiagnostics = program
    .getSyntacticDiagnostics()
    .filter((diagnostic) =>
      [viteSourceFile, runtimeConfigurationSourceFile, viteEnvironmentSourceFile].includes(
        diagnostic.file,
      ),
    )

  if (syntaxDiagnostics.length !== 0) {
    throw new Error('Runtime Kernel build authority sources contain syntax diagnostics.')
  }

  return {
    checker: program.getTypeChecker(),
    program,
    runtimeConfigurationSourceFile,
    viteEnvironmentSourceFile,
    viteSourceFile,
  }
}

interface BuildAuthorityFlowModel {
  readonly alternateProducerCount: number
  readonly artifactDescriptorConsumers: number
  readonly buildVersionProducerCalls: number
  readonly compiledIdentityConsumers: number
  readonly projectConfigImportResolved: boolean
  readonly releaseShaProducerCalls: number
  readonly runtimeDescriptorProducers: number
}

function validateBuildAuthorityFlowModel(model: BuildAuthorityFlowModel): readonly string[] {
  return model.projectConfigImportResolved &&
    model.releaseShaProducerCalls === 1 &&
    model.buildVersionProducerCalls === 1 &&
    model.runtimeDescriptorProducers === 1 &&
    model.artifactDescriptorConsumers === 1 &&
    model.compiledIdentityConsumers === 3 &&
    model.alternateProducerCount === 0
    ? []
    : ['Runtime Kernel build authority compiler dataflow drift.']
}

function callTargetsSymbol(
  checker: ts.TypeChecker,
  call: ts.CallExpression | undefined,
  declaration: ts.Node | undefined,
): boolean {
  return call !== undefined && sameSymbol(checker, call.expression, declaration)
}

function identifierReferencesSymbol(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  declaration: ts.Node | undefined,
): readonly ts.Identifier[] {
  const expected = symbolAt(checker, declaration)

  return expected === undefined
    ? []
    : collectNodes(sourceFile, ts.isIdentifier).filter(
        (identifier) => symbolAt(checker, identifier) === expected,
      )
}

function isPotentialExecFileSyncCall(call: ts.CallExpression): boolean {
  return (
    (ts.isIdentifier(call.expression) && call.expression.text === 'execFileSync') ||
    (ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === 'execFileSync')
  )
}

function validateBuildAuthoritySyntaxNegativeProbes(): void {
  const decoySource = ts.createSourceFile(
    '<build-authority-decoy-probe>',
    "import { execFileSync } from 'node:child_process'; execFileSync('git', ['rev-parse', 'HEAD'])",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const inertSource = ts.createSourceFile(
    '<build-authority-inert-probe>',
    "// execFileSync('git', ['rev-parse', 'HEAD'])\nconst explanation = \"execFileSync('git', ['rev-parse', 'HEAD'])\"",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const decoyCalls = callExpressions(decoySource)
  const inertCalls = callExpressions(inertSource)

  if (
    decoyCalls.filter(isPotentialExecFileSyncCall).length !== 1 ||
    decoyCalls.filter((call) => isStringLiteral(call.arguments[0], 'git')).length !== 1 ||
    inertCalls.filter(isPotentialExecFileSyncCall).length !== 0 ||
    inertCalls.filter((call) => isStringLiteral(call.arguments[0], 'git')).length !== 0
  ) {
    throw new Error(
      'Build authority reversible in-memory decoy/comment/string probe did not preserve AST semantics.',
    )
  }
}

function validateSemanticFlowNegativeProbes(): void {
  const semanticModel: BuildAuthorityFlowModel = {
    alternateProducerCount: 0,
    artifactDescriptorConsumers: 1,
    buildVersionProducerCalls: 1,
    compiledIdentityConsumers: 3,
    projectConfigImportResolved: true,
    releaseShaProducerCalls: 1,
    runtimeDescriptorProducers: 1,
  }

  if (validateBuildAuthorityFlowModel(semanticModel).length !== 0) {
    throw new Error('Build authority semantic-flow control probe must pass.')
  }

  for (const mutation of [
    { alternateProducerCount: 1 },
    { artifactDescriptorConsumers: 0 },
    { buildVersionProducerCalls: 2 },
    { compiledIdentityConsumers: 2 },
    { projectConfigImportResolved: false },
    { releaseShaProducerCalls: 0 },
    { runtimeDescriptorProducers: 2 },
  ] satisfies readonly Partial<BuildAuthorityFlowModel>[]) {
    if (validateBuildAuthorityFlowModel({ ...semanticModel, ...mutation }).length === 0) {
      throw new Error('Build authority semantic-flow mutation probe must fail.')
    }
  }
}

type ImplementedFunction = ts.ArrowFunction | ts.FunctionDeclaration | ts.FunctionExpression

function isImplementedFunction(node: ts.Node): node is ImplementedFunction {
  return ts.isArrowFunction(node) || ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
}

function enclosingImplementedFunction(node: ts.Node): ImplementedFunction | undefined {
  let current: ts.Node = node.parent

  while (!isImplementedFunction(current)) {
    if (ts.isSourceFile(current)) {
      return undefined
    }

    current = current.parent
  }

  return current
}

function implementedFunctionBody(fn: ImplementedFunction | undefined): ts.Block | undefined {
  return fn?.body !== undefined && ts.isBlock(fn.body) ? fn.body : undefined
}

function resolveValueExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression | undefined,
  seen = new Set<ts.Symbol>(),
): ts.Expression | undefined {
  if (expression === undefined) {
    return undefined
  }

  const current = unwrapExpression(expression)

  if (ts.isAwaitExpression(current)) {
    return resolveValueExpression(checker, current.expression, seen)
  }

  if (!ts.isIdentifier(current)) {
    return current
  }

  const symbol = symbolAt(checker, current)

  if (symbol === undefined || seen.has(symbol)) {
    return current
  }

  const declaration = symbol.valueDeclaration

  if (declaration !== undefined && ts.isVariableDeclaration(declaration)) {
    seen.add(symbol)
    return resolveValueExpression(checker, declaration.initializer, seen)
  }

  return current
}

function sameValueOrigin(
  checker: ts.TypeChecker,
  left: ts.Expression | undefined,
  right: ts.Expression | undefined,
): boolean {
  const resolvedLeft = resolveValueExpression(checker, left)
  const resolvedRight = resolveValueExpression(checker, right)

  return (
    resolvedLeft !== undefined &&
    resolvedRight !== undefined &&
    (resolvedLeft === resolvedRight || sameSymbol(checker, resolvedLeft, resolvedRight))
  )
}

function memberAccess(
  expression: ts.Expression | undefined,
): { readonly owner: ts.Expression; readonly key: string } | undefined {
  if (expression === undefined) {
    return undefined
  }

  const current = unwrapExpression(expression)

  if (ts.isPropertyAccessExpression(current)) {
    return { key: current.name.text, owner: current.expression }
  }

  if (
    ts.isElementAccessExpression(current) &&
    (ts.isStringLiteralLike(current.argumentExpression) ||
      ts.isNumericLiteral(current.argumentExpression))
  ) {
    return { key: current.argumentExpression.text, owner: current.expression }
  }

  return undefined
}

function expressionDerivesFrom(
  checker: ts.TypeChecker,
  expression: ts.Expression | undefined,
  authority: ts.Expression | ts.CallExpression,
  seen = new Set<ts.Node>(),
): boolean {
  const current = resolveValueExpression(checker, expression)
  const expected = resolveValueExpression(checker, authority)

  if (current === undefined || expected === undefined || seen.has(current)) {
    return false
  }

  if (current === expected || sameSymbol(checker, current, expected)) {
    return true
  }

  seen.add(current)

  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    return expressionDerivesFrom(checker, current.expression, authority, seen)
  }

  if (ts.isTemplateExpression(current)) {
    return current.templateSpans.some((span) =>
      expressionDerivesFrom(checker, span.expression, authority, seen),
    )
  }

  return false
}

function objectLiteralFromExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression | undefined,
): ts.ObjectLiteralExpression | undefined {
  const resolved = resolveValueExpression(checker, expression)
  return resolved !== undefined && ts.isObjectLiteralExpression(resolved) ? resolved : undefined
}

function isNamedMemberCall(
  call: ts.CallExpression | undefined,
  owner: string,
  method: string,
): boolean {
  return (
    call !== undefined &&
    ts.isPropertyAccessExpression(call.expression) &&
    ts.isIdentifier(call.expression.expression) &&
    call.expression.expression.text === owner &&
    call.expression.name.text === method
  )
}

function functionImplementationForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression | undefined,
): ImplementedFunction | undefined {
  if (expression === undefined) {
    return undefined
  }

  const symbol = resolveAliasedSymbol(checker, expression)

  for (const declaration of symbol?.declarations ?? []) {
    if (isImplementedFunction(declaration)) {
      return declaration
    }

    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      const initializer = unwrapExpression(declaration.initializer)

      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        return initializer
      }
    }
  }

  return undefined
}

function functionImplementationForCall(
  checker: ts.TypeChecker,
  call: ts.CallExpression | undefined,
): ImplementedFunction | undefined {
  return functionImplementationForExpression(checker, call?.expression)
}

function nodeIsWithin(node: ts.Node, ancestor: ts.Node): boolean {
  let current: ts.Node = node

  for (;;) {
    if (current === ancestor) {
      return true
    }

    if (ts.isSourceFile(current)) {
      return false
    }

    current = current.parent
  }
}

function isCallbackInputPropertyFlow(
  checker: ts.TypeChecker,
  expression: ts.Expression | undefined,
  callback: ts.ArrowFunction | ts.FunctionExpression,
  property: string,
): boolean {
  const callbackParameter = callback.parameters[0]
  const resolved = resolveValueExpression(checker, expression)

  if (
    callback.parameters.length !== 1 ||
    callbackParameter === undefined ||
    resolved === undefined
  ) {
    return false
  }

  if (ts.isIdentifier(resolved)) {
    const symbol = symbolAt(checker, resolved)

    return (
      symbol?.declarations?.some(
        (declaration) =>
          ts.isBindingElement(declaration) &&
          nodeIsWithin(declaration, callbackParameter) &&
          (declaration.propertyName?.getText() ?? declaration.name.getText()) === property,
      ) === true
    )
  }

  const access = memberAccess(resolved)
  return (
    access?.key === property &&
    ts.isIdentifier(callbackParameter.name) &&
    sameSymbol(checker, access.owner, callbackParameter.name)
  )
}

function returnExpressions(fn: ImplementedFunction | undefined): readonly ts.Expression[] {
  const body = implementedFunctionBody(fn)

  if (body === undefined) {
    return fn !== undefined && ts.isArrowFunction(fn) && ts.isExpression(fn.body) ? [fn.body] : []
  }

  return body.statements.flatMap((statement) =>
    ts.isReturnStatement(statement) && statement.expression !== undefined
      ? [statement.expression]
      : [],
  )
}

function objectFreezeArgument(call: ts.CallExpression | undefined): ts.Expression | undefined {
  return isNamedMemberCall(call, 'Object', 'freeze') && call?.arguments.length === 1
    ? call.arguments[0]
    : undefined
}

function isRuntimeIdentitySerialization(
  checker: ts.TypeChecker,
  expression: ts.Expression | undefined,
  runtimeDescriptor: ts.Expression,
  field: 'environment' | 'releaseSha' | 'buildVersion',
): boolean {
  const call = callFromExpression(resolveValueExpression(checker, expression))
  const access = memberAccess(call?.arguments[0])

  return (
    isNamedMemberCall(call, 'JSON', 'stringify') &&
    call?.arguments.length === 1 &&
    access?.key === field &&
    expressionDerivesFrom(checker, access.owner, runtimeDescriptor)
  )
}

async function collectBuildConfigurationFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory() && !excludedBuildConfigurationDirectories.has(entry.name)) {
      files.push(...(await collectBuildConfigurationFiles(path)))
    } else if (entry.isFile() && buildConfigurationSourceExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

async function validateMotionVDeclarationGraph(
  packageDirectory: string,
  patchTargets: readonly string[],
): Promise<void> {
  const declarationFiles = await collectFiles(
    packageDirectory,
    (fileName) => fileName.endsWith('.d.ts') || fileName.endsWith('.d.mts'),
  )
  const prohibitedDeclarationReferences: string[] = []

  for (const file of declarationFiles) {
    const source = await readFile(file, 'utf8')

    if (
      /(?:from\s*|export\s+\*\s+from\s*)['"](?:framer-motion(?:\/dom)?|@vueuse\/core)['"]/u.test(
        source,
      )
    ) {
      prohibitedDeclarationReferences.push(relative(packageDirectory, file).split('\\').join('/'))
    }
  }

  expectStructuredEqual(
    prohibitedDeclarationReferences,
    [],
    'Patched Motion for Vue declaration-only React/VueUse reachability',
  )

  for (const target of patchTargets) {
    await access(resolve(packageDirectory, target))
  }

  expectEqual(
    (await readFile(resolve(packageDirectory, 'dist/es/types/instance.d.ts'), 'utf8')).trim(),
    'export {};',
    'Patched Motion for Vue global native-element augmentation removal',
  )

  const rootDeclaration = await readFile(resolve(packageDirectory, 'dist/es/index.d.ts'), 'utf8')

  if (
    !rootDeclaration.includes("export * from 'motion-dom';") ||
    !rootDeclaration.includes("export * from 'motion-utils';") ||
    rootDeclaration.includes('framer-motion')
  ) {
    throw new Error('Patched Motion for Vue root declaration graph drifted.')
  }
}

async function validateMotionCompatibilityBypassAbsence(): Promise<void> {
  const sourceFiles = (
    await Promise.all(
      ['apps', 'packages'].map((directory) =>
        collectBuildConfigurationFiles(resolve(rootDirectory, directory)),
      ),
    )
  )
    .flat()
    .sort(codePointCompare)
  const suppressionInventory: string[] = []
  const prohibitedMotionAmbientModules: string[] = []

  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8')
    const displayPath = relative(rootDirectory, file).split('\\').join('/')

    for (const match of source.matchAll(/@ts-(?:ignore|nocheck)/gu)) {
      suppressionInventory.push(`${displayPath}:${match[0]}`)
    }

    if (!file.endsWith('.ts')) {
      continue
    }

    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )

    for (const declaration of collectNodes(sourceFile, ts.isModuleDeclaration)) {
      const moduleName = ts.isStringLiteral(declaration.name) ? declaration.name.text : undefined

      if (
        moduleName === 'motion-v' ||
        moduleName?.startsWith('motion-v/') === true ||
        (moduleName?.includes('*') === true && moduleName.toLowerCase().includes('motion'))
      ) {
        prohibitedMotionAmbientModules.push(`${displayPath}:${moduleName}`)
      }
    }
  }

  expectStructuredEqual(
    suppressionInventory,
    ['apps/web/src/route-map.d.ts:@ts-nocheck'],
    'Repository TypeScript suppression inventory',
  )
  expectStructuredEqual(
    prohibitedMotionAmbientModules,
    [],
    'Repository ambient Motion declaration replacement inventory',
  )
}

async function validateMotionTypeScriptStrictness(): Promise<void> {
  const baseConfiguration = await readJsonObject(resolve(rootDirectory, 'tsconfig.base.json'))
  const uiConfiguration = await readJsonObject(resolve(rootDirectory, 'packages/ui/tsconfig.json'))
  const baseCompilerOptions = baseConfiguration['compilerOptions']
  const uiCompilerOptions = uiConfiguration['compilerOptions']

  if (!isJsonObject(baseCompilerOptions) || !isJsonObject(uiCompilerOptions)) {
    throw new Error('Motion declaration compatibility requires object TypeScript configurations.')
  }

  expectEqual(baseCompilerOptions['strict'], true, 'TypeScript strict policy')
  expectEqual(
    baseCompilerOptions['exactOptionalPropertyTypes'],
    true,
    'TypeScript exactOptionalPropertyTypes policy',
  )
  expectEqual(baseCompilerOptions['skipLibCheck'], undefined, 'TypeScript skipLibCheck override')
  expectEqual(baseCompilerOptions['moduleResolution'], 'Bundler', 'TypeScript module resolution')
  expectEqual(baseCompilerOptions['types'], undefined, 'TypeScript base types override')
  expectEqual(baseCompilerOptions['typeRoots'], undefined, 'TypeScript base typeRoots override')
  expectEqual(baseCompilerOptions['paths'], undefined, 'TypeScript base path aliases')
  expectStructuredEqual(uiCompilerOptions['lib'], ['ES2022', 'DOM'], 'UI TypeScript library set')
  expectEqual(uiCompilerOptions['skipLibCheck'], undefined, 'UI TypeScript skipLibCheck override')
  expectEqual(uiCompilerOptions['types'], undefined, 'UI TypeScript types override')
  expectEqual(uiCompilerOptions['typeRoots'], undefined, 'UI TypeScript typeRoots override')
  expectEqual(uiCompilerOptions['paths'], undefined, 'UI TypeScript path aliases')
  expectEqual(uiCompilerOptions['moduleResolution'], undefined, 'UI module-resolution override')

  const configurationPath = resolve(rootDirectory, 'packages/ui/tsconfig.json')
  const configuration = ts.readConfigFile(configurationPath, (fileName) =>
    ts.sys.readFile(fileName),
  )

  if (configuration.error !== undefined) {
    throw new Error('Motion declaration compatibility could not read the UI TypeScript config.')
  }

  const parsed = ts.parseJsonConfigFileContent(
    configuration.config,
    ts.sys,
    resolve(rootDirectory, 'packages/ui'),
    { noEmit: true },
    configurationPath,
  )

  if (
    parsed.options.strict !== true ||
    parsed.options.exactOptionalPropertyTypes !== true ||
    parsed.options.skipLibCheck === true
  ) {
    throw new Error('Motion declaration compatibility requires unchanged strict UI TypeScript.')
  }
}

function validateMotionFeatureBudgetAuthority(): void {
  const budget = projectConfig.bundleBudgets.adminNavigationMotionFeatureJavaScriptGzipBytes

  if (!Number.isSafeInteger(budget) || budget <= 0 || budget % 8192 !== 0) {
    throw new Error(
      'Admin Navigation Motion feature budget must be a positive 8 KiB-aligned integer.',
    )
  }
}

async function validateRuntimeKernelBuildConfiguration(): Promise<void> {
  validateBuildAuthoritySyntaxNegativeProbes()
  validateSemanticFlowNegativeProbes()
  const webDirectory = resolve(rootDirectory, 'apps/web')
  const viteConfigurationPath = resolve(webDirectory, 'vite.config.ts')
  const runtimeConfigurationPath = resolve(webDirectory, 'src/app/config/runtime-configuration.ts')
  const viteEnvironmentPath = resolve(webDirectory, 'src/vite-env.d.ts')
  const { checker, runtimeConfigurationSourceFile, viteEnvironmentSourceFile, viteSourceFile } =
    createCompilerContext({
      runtimeConfigurationPath,
      viteConfigurationPath,
      viteEnvironmentPath,
    })

  const projectConfigImport = importSpecifier(
    viteSourceFile,
    '../../project.config',
    'projectConfig',
  )
  const projectConfigImportResolved =
    projectConfigImport !== undefined &&
    symbolDeclaredInPath(
      resolveAliasedSymbol(checker, projectConfigImport.name),
      resolve(rootDirectory, 'project.config.ts'),
    )

  expectEqual(
    projectConfigImportResolved,
    true,
    'Compiler-resolved Vite projectConfig import authority',
  )

  const projectConfigSymbol =
    projectConfigImport === undefined ? undefined : symbolAt(checker, projectConfigImport.name)
  const projectConfigReferences = collectNodes(viteSourceFile, ts.isIdentifier).filter(
    (identifier) => symbolAt(checker, identifier) === projectConfigSymbol,
  )
  const deploymentBaseAccesses = collectNodes(viteSourceFile, ts.isPropertyAccessExpression).filter(
    (access) => {
      if (access.name.text !== 'deploymentBase') {
        return false
      }

      const deploymentAccess = memberAccess(access.expression)
      return (
        deploymentAccess?.key === 'deployment' &&
        sameSymbol(checker, deploymentAccess.owner, projectConfigImport?.name)
      )
    },
  )

  expectExactCount(deploymentBaseAccesses.length, 1, 'Vite deployment-base authority')
  expectExactCount(projectConfigReferences.length, 2, 'Vite projectConfig reference closure')

  const deploymentBaseAuthority = deploymentBaseAccesses[0]

  if (deploymentBaseAuthority === undefined) {
    throw new Error('Vite deployment-base authority is missing.')
  }

  const execFileSyncImport = importSpecifier(viteSourceFile, 'node:child_process', 'execFileSync')
  const readFileImport = importSpecifier(viteSourceFile, 'node:fs/promises', 'readFile')
  const resolveImport = importSpecifier(viteSourceFile, 'node:path', 'resolve')
  const defineConfigImport = importSpecifier(viteSourceFile, 'vite', 'defineConfig')
  const runtimeSchemaImport = importSpecifier(
    viteSourceFile,
    './src/app/config/runtime-configuration-contract',
    'coreRuntimeConfigurationSchema',
  )
  const viteChildProcessImports = viteSourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'node:child_process',
  )
  const viteChildProcessBindings = viteChildProcessImports[0]?.importClause?.namedBindings

  for (const [binding, description] of [
    [execFileSyncImport, 'Vite execFileSync import'],
    [readFileImport, 'Vite readFile import'],
    [resolveImport, 'Vite resolve import'],
    [defineConfigImport, 'Vite defineConfig import'],
    [runtimeSchemaImport, 'Vite Runtime Configuration schema import'],
  ] as const) {
    expectEqual(binding === undefined, false, description)
  }

  expectEqual(
    runtimeSchemaImport !== undefined &&
      symbolDeclaredInPath(
        resolveAliasedSymbol(checker, runtimeSchemaImport.name),
        resolve(webDirectory, 'src/app/config/runtime-configuration-contract.ts'),
      ),
    true,
    'Compiler-resolved Runtime Configuration schema import authority',
  )

  if (
    viteChildProcessImports.length !== 1 ||
    viteChildProcessBindings === undefined ||
    !ts.isNamedImports(viteChildProcessBindings) ||
    viteChildProcessBindings.elements.length !== 1 ||
    viteChildProcessBindings.elements[0] !== execFileSyncImport
  ) {
    throw new Error('Vite child-process authority must be the sole direct execFileSync import.')
  }

  const execFileSyncCalls = callExpressions(viteSourceFile).filter((call) =>
    callTargetsSymbol(checker, call, execFileSyncImport?.name),
  )

  expectExactCount(execFileSyncCalls.length, 1, 'Release SHA build-boundary read count')
  expectExactCount(
    identifierReferencesSymbol(checker, viteSourceFile, execFileSyncImport?.name).length,
    2,
    'Release SHA execFileSync import/call reference closure',
  )

  const releaseShaCall = execFileSyncCalls[0]
  const releaseShaArguments = releaseShaCall?.arguments
  const releaseShaCommand = releaseShaArguments?.[0]
  const releaseShaCommandArguments = releaseShaArguments?.[1]
  const releaseShaOptions = releaseShaArguments?.[2]

  expectEqual(
    releaseShaCommand !== undefined && ts.isStringLiteral(releaseShaCommand)
      ? releaseShaCommand.text
      : undefined,
    'git',
    'Release SHA command',
  )
  expectStructuredEqual(
    releaseShaCommandArguments !== undefined &&
      ts.isArrayLiteralExpression(releaseShaCommandArguments)
      ? releaseShaCommandArguments.elements.map((element) =>
          ts.isStringLiteral(element) ? element.text : undefined,
        )
      : undefined,
    ['rev-parse', 'HEAD'],
    'Release SHA command arguments',
  )
  expectStructuredEqual(
    releaseShaOptions !== undefined && ts.isObjectLiteralExpression(releaseShaOptions)
      ? releaseShaOptions.properties.map(propertyName).sort()
      : undefined,
    ['cwd', 'encoding'].sort(),
    'Release SHA command option field set',
  )

  const repositoryPathCalls = callExpressions(viteSourceFile).filter((call) => {
    const importMetaDirectory = call.arguments[0]

    return (
      callTargetsSymbol(checker, call, resolveImport?.name) &&
      call.arguments.length === 2 &&
      importMetaDirectory !== undefined &&
      ts.isPropertyAccessExpression(importMetaDirectory) &&
      ts.isMetaProperty(importMetaDirectory.expression) &&
      importMetaDirectory.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
      importMetaDirectory.name.text === 'dirname' &&
      isStringLiteral(call.arguments[1], '../..')
    )
  })
  const repositoryPathCall = repositoryPathCalls[0]

  if (
    releaseShaOptions === undefined ||
    !ts.isObjectLiteralExpression(releaseShaOptions) ||
    repositoryPathCalls.length !== 1 ||
    repositoryPathCall === undefined ||
    !sameValueOrigin(
      checker,
      objectPropertyExpression(releaseShaOptions, 'cwd'),
      repositoryPathCall,
    ) ||
    !isStringLiteral(objectPropertyExpression(releaseShaOptions, 'encoding'), 'utf8')
  ) {
    throw new Error('Release SHA command options must use the exact repository authority.')
  }

  const releaseShaReader = enclosingImplementedFunction(releaseShaCall ?? viteSourceFile)
  const releaseShaReaderBody = implementedFunctionBody(releaseShaReader)
  const prohibitedReleaseTransforms = new Set(['slice', 'substr', 'substring', 'trim', 'trimEnd'])
  const releaseShaReaderNodes =
    releaseShaReader === undefined ? [] : descendantNodes(releaseShaReader)
  const prohibitedTransformCalls = releaseShaReaderNodes.filter(
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      prohibitedReleaseTransforms.has(node.expression.name.text),
  )
  const releaseFallbacks = releaseShaReaderNodes.filter(
    (node) =>
      ts.isConditionalExpression(node) ||
      ts.isTryStatement(node) ||
      (ts.isBinaryExpression(node) &&
        (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)),
  )

  expectEqual(releaseShaReaderBody === undefined, false, 'Release SHA reader presence')
  expectEqual(releaseShaReader?.parameters.length, 0, 'Release SHA reader parameter count')
  expectExactCount(prohibitedTransformCalls.length, 0, 'Release SHA shortening/trim transforms')
  expectExactCount(releaseFallbacks.length, 0, 'Release SHA fallback expressions')
  const releasePatternCalls =
    releaseShaReaderBody === undefined
      ? []
      : collectNodes(releaseShaReaderBody, ts.isCallExpression).filter((call) => {
          const owner = resolveValueExpression(
            checker,
            ts.isPropertyAccessExpression(call.expression) ? call.expression.expression : undefined,
          )

          return (
            ts.isPropertyAccessExpression(call.expression) &&
            call.expression.name.text === 'exec' &&
            owner !== undefined &&
            ts.isRegularExpressionLiteral(owner) &&
            owner.text === '/^([0-9a-f]{40})(?:\\r?\\n)?$/u' &&
            call.arguments.length === 1 &&
            releaseShaCall !== undefined &&
            expressionDerivesFrom(checker, call.arguments[0], releaseShaCall)
          )
        })
  const releaseReturn = returnExpressions(releaseShaReader)[0]
  const releaseReturnAccess = memberAccess(releaseReturn)

  if (
    releasePatternCalls.length !== 1 ||
    releaseReturnAccess?.key !== '1' ||
    releasePatternCalls[0] === undefined ||
    !expressionDerivesFrom(checker, releaseReturnAccess.owner, releasePatternCalls[0]) ||
    collectNodes(releaseShaReaderBody ?? viteSourceFile, ts.isThrowStatement).length !== 1 ||
    returnExpressions(releaseShaReader).length !== 1
  ) {
    throw new Error('Release SHA producer/validation dataflow drifted.')
  }

  const rootManifestPathCalls = callExpressions(viteSourceFile).filter(
    (call) =>
      callTargetsSymbol(checker, call, resolveImport?.name) &&
      call.arguments.length === 2 &&
      isStringLiteral(call.arguments[1], 'package.json') &&
      sameValueOrigin(checker, call.arguments[0], repositoryPathCall),
  )
  const rootManifestPathCall = rootManifestPathCalls[0]
  const buildVersionReadCalls = callExpressions(viteSourceFile).filter(
    (call) =>
      callTargetsSymbol(checker, call, readFileImport?.name) &&
      call.arguments.length === 2 &&
      rootManifestPathCall !== undefined &&
      sameValueOrigin(checker, call.arguments[0], rootManifestPathCall) &&
      isStringLiteral(call.arguments[1], 'utf8'),
  )
  const buildVersionReadCall = buildVersionReadCalls[0]
  const buildVersionReader = enclosingImplementedFunction(buildVersionReadCall ?? viteSourceFile)
  const buildVersionReaderBody = implementedFunctionBody(buildVersionReader)
  const buildVersionParseCalls =
    buildVersionReaderBody === undefined
      ? []
      : collectNodes(buildVersionReaderBody, ts.isCallExpression).filter(
          (call) =>
            isNamedMemberCall(call, 'JSON', 'parse') &&
            call.arguments.length === 1 &&
            buildVersionReadCall !== undefined &&
            expressionDerivesFrom(checker, call.arguments[0], buildVersionReadCall),
        )
  const buildVersionReturn = returnExpressions(buildVersionReader)[0]
  const buildVersionReturnAccess = memberAccess(buildVersionReturn)

  if (
    rootManifestPathCalls.length !== 1 ||
    buildVersionReadCalls.length !== 1 ||
    buildVersionReaderBody === undefined ||
    buildVersionReader?.parameters.length !== 0 ||
    buildVersionParseCalls.length !== 1 ||
    returnExpressions(buildVersionReader).length !== 1 ||
    buildVersionReturnAccess?.key !== 'version' ||
    buildVersionParseCalls[0] === undefined ||
    !expressionDerivesFrom(checker, buildVersionReturnAccess.owner, buildVersionParseCalls[0])
  ) {
    throw new Error('Root package Build Version reader dataflow drifted.')
  }

  const defineConfigCalls = callExpressions(viteSourceFile).filter((call) =>
    callTargetsSymbol(checker, call, defineConfigImport?.name),
  )
  const defineConfigCall = defineConfigCalls[0]
  const defineConfigCallback = defineConfigCall?.arguments[0]

  if (
    defineConfigCalls.length !== 1 ||
    defineConfigCallback === undefined ||
    (!ts.isArrowFunction(defineConfigCallback) && !ts.isFunctionExpression(defineConfigCallback)) ||
    !defineConfigCallback.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
    ) ||
    !ts.isBlock(defineConfigCallback.body)
  ) {
    throw new Error('Vite defineConfig compiler boundary drifted.')
  }

  const defineConfigBody = defineConfigCallback.body
  const buildVersionProducerCalls = callExpressions(defineConfigBody).filter(
    (call) => functionImplementationForCall(checker, call) === buildVersionReader,
  )
  const releaseShaProducerCalls = callExpressions(defineConfigBody).filter(
    (call) => functionImplementationForCall(checker, call) === releaseShaReader,
  )
  const buildVersionProducerCall = buildVersionProducerCalls[0]
  const releaseShaProducerCall = releaseShaProducerCalls[0]
  const runtimeParseCalls = callExpressions(defineConfigBody).filter(
    (call) =>
      ts.isPropertyAccessExpression(call.expression) &&
      call.expression.name.text === 'parse' &&
      sameSymbol(checker, call.expression.expression, runtimeSchemaImport?.name),
  )
  const runtimeParseCall = runtimeParseCalls[0]
  const runtimeRecordArgument = runtimeParseCall?.arguments[0]
  const runtimeRecord =
    runtimeRecordArgument !== undefined && ts.isObjectLiteralExpression(runtimeRecordArgument)
      ? runtimeRecordArgument
      : undefined
  const parentCall =
    runtimeParseCall?.parent !== undefined && ts.isCallExpression(runtimeParseCall.parent)
      ? runtimeParseCall.parent
      : undefined
  const runtimeDescriptorExpression =
    objectFreezeArgument(parentCall) === runtimeParseCall ? parentCall : runtimeParseCall
  const environmentExpression =
    runtimeRecord === undefined ? undefined : objectPropertyExpression(runtimeRecord, 'environment')
  const deploymentBaseExpression =
    runtimeRecord === undefined
      ? undefined
      : objectPropertyExpression(runtimeRecord, 'deploymentBase')
  const releaseShaExpression =
    runtimeRecord === undefined ? undefined : objectPropertyExpression(runtimeRecord, 'releaseSha')
  const buildVersionExpression =
    runtimeRecord === undefined
      ? undefined
      : objectPropertyExpression(runtimeRecord, 'buildVersion')

  const runtimeProducerChecks = new Map<string, boolean>([
    ['Build Version reader binding', buildVersionProducerCalls.length === 1],
    ['Build Version reader arguments', buildVersionProducerCall?.arguments.length === 0],
    ['Release SHA reader binding', releaseShaProducerCalls.length === 1],
    ['Release SHA reader arguments', releaseShaProducerCall?.arguments.length === 0],
    ['Runtime Configuration parse call', runtimeParseCalls.length === 1],
    [
      'Runtime Configuration schema binding',
      runtimeParseCall !== undefined &&
        ts.isPropertyAccessExpression(runtimeParseCall.expression) &&
        runtimeParseCall.expression.name.text === 'parse' &&
        sameSymbol(checker, runtimeParseCall.expression.expression, runtimeSchemaImport?.name),
    ],
    ['Runtime Configuration parse arguments', runtimeParseCall?.arguments.length === 1],
    [
      'Runtime Configuration exact record',
      runtimeRecord !== undefined &&
        hasExactObjectPropertySet(runtimeRecord, [
          'schemaVersion',
          'environment',
          'deploymentBase',
          'releaseSha',
          'buildVersion',
        ]),
    ],
    [
      'Runtime Configuration schema version',
      runtimeRecord !== undefined &&
        isNumericLiteral(objectPropertyExpression(runtimeRecord, 'schemaVersion'), 1),
    ],
    [
      'Runtime Configuration environment binding',
      isCallbackInputPropertyFlow(checker, environmentExpression, defineConfigCallback, 'mode'),
    ],
    [
      'Runtime Configuration deployment-base binding',
      expressionDerivesFrom(checker, deploymentBaseExpression, deploymentBaseAuthority),
    ],
    [
      'Runtime Configuration Release SHA binding',
      releaseShaProducerCall !== undefined &&
        expressionDerivesFrom(checker, releaseShaExpression, releaseShaProducerCall),
    ],
    [
      'Runtime Configuration Build Version binding',
      buildVersionProducerCall !== undefined &&
        expressionDerivesFrom(checker, buildVersionExpression, buildVersionProducerCall),
    ],
  ])
  const failedRuntimeProducerChecks = [...runtimeProducerChecks]
    .filter(([, passed]) => !passed)
    .map(([description]) => description)

  if (failedRuntimeProducerChecks.length !== 0) {
    throw new Error(
      `Runtime Configuration producer compiler dataflow drifted: ${failedRuntimeProducerChecks.join(', ')}.`,
    )
  }

  if (runtimeDescriptorExpression === undefined || !ts.isExpression(runtimeDescriptorExpression)) {
    throw new Error('Runtime Configuration descriptor declaration is missing.')
  }

  const defineConfigReturns = returnExpressions(defineConfigCallback)
  const returnedConfiguration = objectLiteralFromExpression(checker, defineConfigReturns[0])
  const defineRecordExpression =
    returnedConfiguration === undefined
      ? undefined
      : objectPropertyExpression(returnedConfiguration, 'define')
  const defineRecordValue =
    defineRecordExpression === undefined ? undefined : unwrapExpression(defineRecordExpression)
  const defineRecord =
    defineRecordValue !== undefined && ts.isObjectLiteralExpression(defineRecordValue)
      ? defineRecordValue
      : undefined

  if (
    returnedConfiguration === undefined ||
    defineConfigReturns.length !== 1 ||
    !expressionDerivesFrom(
      checker,
      objectPropertyExpression(returnedConfiguration, 'base'),
      deploymentBaseAuthority,
    ) ||
    defineRecord === undefined ||
    !hasExactObjectPropertySet(defineRecord, [
      '__PAVP_COMPILED_ENVIRONMENT__',
      '__PAVP_COMPILED_RELEASE_SHA__',
      '__PAVP_COMPILED_BUILD_VERSION__',
    ]) ||
    !isRuntimeIdentitySerialization(
      checker,
      objectPropertyExpression(defineRecord, '__PAVP_COMPILED_ENVIRONMENT__'),
      runtimeDescriptorExpression,
      'environment',
    ) ||
    !isRuntimeIdentitySerialization(
      checker,
      objectPropertyExpression(defineRecord, '__PAVP_COMPILED_RELEASE_SHA__'),
      runtimeDescriptorExpression,
      'releaseSha',
    ) ||
    !isRuntimeIdentitySerialization(
      checker,
      objectPropertyExpression(defineRecord, '__PAVP_COMPILED_BUILD_VERSION__'),
      runtimeDescriptorExpression,
      'buildVersion',
    )
  ) {
    throw new Error('Compiled Runtime Configuration consumer dataflow drifted.')
  }

  const pluginsExpression = objectPropertyExpression(returnedConfiguration, 'plugins')
  const pluginsValue = resolveValueExpression(checker, pluginsExpression)
  const pluginCalls =
    pluginsValue !== undefined && ts.isArrayLiteralExpression(pluginsValue)
      ? pluginsValue.elements.filter(ts.isCallExpression)
      : []
  const routerPluginImport = defaultImportIdentifier(viteSourceFile, 'vue-router/vite')
  const vuePluginImport = defaultImportIdentifier(viteSourceFile, '@vitejs/plugin-vue')
  const routerPluginCalls = pluginCalls.filter((call) =>
    callTargetsSymbol(checker, call, routerPluginImport),
  )
  const vuePluginCalls = pluginCalls.filter((call) =>
    callTargetsSymbol(checker, call, vuePluginImport),
  )
  const routerPluginCall = routerPluginCalls[0]
  const vuePluginCall = vuePluginCalls[0]
  const routerOptionsArgument = routerPluginCall?.arguments[0]
  const routerOptionsDeclaration = collectNodes(viteSourceFile, ts.isVariableDeclaration).find(
    (declaration) =>
      ts.isIdentifier(declaration.name) &&
      sameSymbol(checker, routerOptionsArgument, declaration.name),
  )
  const routerOptionsStatement = routerOptionsDeclaration?.parent.parent
  const runtimeRouterOptions: Readonly<Record<string, unknown>> = routerFileGenerationOptions
  const runtimeRouterOptionKeys = Object.keys(runtimeRouterOptions).sort()

  if (
    routerPluginImport === undefined ||
    vuePluginImport === undefined ||
    routerPluginCalls.length !== 1 ||
    vuePluginCalls.length !== 1 ||
    routerPluginCall === undefined ||
    vuePluginCall === undefined ||
    pluginCalls.indexOf(routerPluginCall) >= pluginCalls.indexOf(vuePluginCall) ||
    routerOptionsDeclaration === undefined ||
    !ts.isIdentifier(routerOptionsDeclaration.name) ||
    routerOptionsArgument === undefined ||
    !sameSymbol(checker, routerOptionsArgument, routerOptionsDeclaration.name) ||
    routerOptionsStatement === undefined ||
    !ts.isVariableStatement(routerOptionsStatement) ||
    !routerOptionsStatement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) ||
    !isDeepStrictEqual(runtimeRouterOptionKeys, [
      'beforeWriteFiles',
      'dts',
      'extendRoute',
      'extensions',
      'importMode',
      'root',
      'routesFolder',
    ]) ||
    runtimeRouterOptions['root'] !== resolve(rootDirectory, 'apps/web') ||
    runtimeRouterOptions['routesFolder'] !== 'src/pages' ||
    !isDeepStrictEqual(runtimeRouterOptions['extensions'], ['.vue']) ||
    runtimeRouterOptions['importMode'] !== 'async' ||
    runtimeRouterOptions['dts'] !== 'src/route-map.d.ts' ||
    typeof runtimeRouterOptions['extendRoute'] !== 'function' ||
    typeof runtimeRouterOptions['beforeWriteFiles'] !== 'function'
  ) {
    throw new Error(
      'Official Vue Router Vite plugin configuration authority or pre-Vue order drifted.',
    )
  }
  const artifactPluginCalls = pluginCalls.filter(
    (call) =>
      call.arguments.length === 1 &&
      expressionDerivesFrom(checker, call.arguments[0], runtimeDescriptorExpression),
  )
  const artifactPluginCall = artifactPluginCalls[0]
  const runtimeArtifactsFunction = functionImplementationForCall(checker, artifactPluginCall)
  const runtimeArtifactsBody = implementedFunctionBody(runtimeArtifactsFunction)
  const runtimeArtifactsParameter = runtimeArtifactsFunction?.parameters[0]
  const descriptorSerializers =
    runtimeArtifactsBody === undefined
      ? []
      : collectNodes(runtimeArtifactsBody, ts.isCallExpression).filter((call) => {
          const parameterName = runtimeArtifactsParameter?.name
          return (
            isNamedMemberCall(call, 'JSON', 'stringify') &&
            call.arguments.length === 3 &&
            parameterName !== undefined &&
            sameValueOrigin(checker, call.arguments[0], parameterName as ts.Expression) &&
            call.arguments[1]?.kind === ts.SyntaxKind.NullKeyword &&
            isNumericLiteral(call.arguments[2], 2)
          )
        })
  const descriptorSerializer = descriptorSerializers[0]
  const runtimeArtifactDescriptorBindings = callExpressions(viteSourceFile).filter(
    (call) => functionImplementationForCall(checker, call) === runtimeArtifactsFunction,
  )
  const artifactEmitCalls =
    runtimeArtifactsBody === undefined
      ? []
      : collectNodes(runtimeArtifactsBody, ts.isCallExpression).filter((call) => {
          const descriptor = call.arguments[0]

          return (
            ts.isPropertyAccessExpression(call.expression) &&
            call.expression.name.text === 'emitFile' &&
            descriptor !== undefined &&
            ts.isObjectLiteralExpression(descriptor) &&
            descriptorSerializer !== undefined &&
            expressionDerivesFrom(
              checker,
              objectPropertyExpression(descriptor, 'source'),
              descriptorSerializer,
            ) &&
            isStringLiteral(
              resolveValueExpression(checker, objectPropertyExpression(descriptor, 'fileName')),
              'runtime-configuration.json',
            ) &&
            isStringLiteral(objectPropertyExpression(descriptor, 'type'), 'asset')
          )
        })

  if (
    runtimeArtifactsBody === undefined ||
    runtimeArtifactsFunction?.parameters.length !== 1 ||
    runtimeArtifactsParameter === undefined ||
    !ts.isIdentifier(runtimeArtifactsParameter.name) ||
    descriptorSerializers.length !== 1 ||
    artifactPluginCalls.length !== 1 ||
    runtimeArtifactDescriptorBindings.length !== 1 ||
    runtimeArtifactDescriptorBindings[0]?.arguments.length !== 1 ||
    !expressionDerivesFrom(
      checker,
      runtimeArtifactDescriptorBindings[0].arguments[0],
      runtimeDescriptorExpression,
    ) ||
    artifactPluginCall !== runtimeArtifactDescriptorBindings[0] ||
    artifactEmitCalls.length !== 1
  ) {
    throw new Error('Runtime Configuration artifact descriptor dataflow drifted.')
  }

  const expectedCompiledGlobals = [
    ['environment', '__PAVP_COMPILED_ENVIRONMENT__'],
    ['releaseSha', '__PAVP_COMPILED_RELEASE_SHA__'],
    ['buildVersion', '__PAVP_COMPILED_BUILD_VERSION__'],
  ] as const
  const compiledGlobalDeclarations = new Map(
    expectedCompiledGlobals.map(([field, globalName]) => [
      field,
      collectNodes(viteEnvironmentSourceFile, ts.isVariableDeclaration).find(
        (candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === globalName,
      ),
    ]),
  )
  const compiledIdentityObjects = collectNodes(
    runtimeConfigurationSourceFile,
    ts.isObjectLiteralExpression,
  ).filter((object) => {
    if (
      !hasExactObjectPropertySet(
        object,
        expectedCompiledGlobals.map(([field]) => field),
      )
    ) {
      return false
    }

    return expectedCompiledGlobals.every(([field]) => {
      const declaration = compiledGlobalDeclarations.get(field)
      const consumer = objectPropertyExpression(object, field)
      return declaration !== undefined && sameSymbol(checker, consumer, declaration.name)
    })
  })
  const compiledIdentityObject = compiledIdentityObjects[0]
  let compiledIdentityConsumers = 0

  for (const [field, globalName] of expectedCompiledGlobals) {
    const declaration = compiledGlobalDeclarations.get(field)
    const consumer =
      compiledIdentityObject === undefined
        ? undefined
        : objectPropertyExpression(compiledIdentityObject, field)

    if (
      declaration?.type === undefined ||
      (field === 'environment'
        ? declaration.type.getText(viteEnvironmentSourceFile) !==
          "'development' | 'staging' | 'production'"
        : declaration.type.getText(viteEnvironmentSourceFile) !== 'string') ||
      consumer === undefined ||
      !sameSymbol(checker, consumer, declaration.name)
    ) {
      throw new Error(`Compiled identity consumer ${field} is not compiler-bound to ${globalName}.`)
    }

    compiledIdentityConsumers += 1
  }

  if (
    compiledIdentityObjects.length !== 1 ||
    compiledIdentityObject === undefined ||
    !hasExactObjectPropertySet(compiledIdentityObject, [
      'environment',
      'releaseSha',
      'buildVersion',
    ])
  ) {
    throw new Error('Compiled Build Identity must be the exact three-field record.')
  }

  const buildConfigurationFiles = await collectBuildConfigurationFiles(webDirectory)
  let alternateProducerCount = 0
  let rootPackagePathLiteralCount = 0

  for (const path of buildConfigurationFiles) {
    const source = await readFile(path, 'utf8')
    const displayPath = relative(rootDirectory, path)
    const sourceFile = ts.createSourceFile(
      path,
      extname(path) === '.vue'
        ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
            .map((match) => match[1] ?? '')
            .join('\n')
        : source,
      ts.ScriptTarget.Latest,
      true,
      extname(path) === '.js' || extname(path) === '.mjs' ? ts.ScriptKind.JS : ts.ScriptKind.TS,
    )
    const childProcessImports = sourceFile.statements.filter(
      (statement): statement is ts.ImportDeclaration =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === 'node:child_process',
    )

    if (
      (path !== viteConfigurationPath && childProcessImports.length !== 0) ||
      (path === viteConfigurationPath && childProcessImports.length !== 1)
    ) {
      alternateProducerCount += 1
    }

    for (const call of callExpressions(sourceFile)) {
      if (
        isPotentialExecFileSyncCall(call) &&
        (path !== viteConfigurationPath ||
          !execFileSyncCalls.some((expectedCall) => expectedCall.getStart() === call.getStart()))
      ) {
        alternateProducerCount += 1
      }

      if (
        isStringLiteral(call.arguments[0], 'git') &&
        (path !== viteConfigurationPath ||
          !execFileSyncCalls.some((expectedCall) => expectedCall.getStart() === call.getStart()))
      ) {
        alternateProducerCount += 1
      }
    }

    const manifestPathLiterals = collectNodes(sourceFile, ts.isStringLiteral).filter(
      (literal) => literal.text === 'package.json' || literal.text.endsWith('/package.json'),
    )
    rootPackagePathLiteralCount += manifestPathLiterals.length

    const alternateEnvironmentAuthorities = [
      ...collectNodes(sourceFile, ts.isPropertyAccessExpression),
      ...collectNodes(sourceFile, ts.isElementAccessExpression),
    ].filter((access) =>
      /(?:process|import\.meta)\.env(?:\.|\[)[^\n;]*(?:SHA|COMMIT|VERSION|RELEASE)/u.test(
        access.getText(sourceFile),
      ),
    )

    alternateProducerCount += alternateEnvironmentAuthorities.length

    if (alternateEnvironmentAuthorities.length !== 0) {
      throw new Error(`${displayPath} contains an alternate build identity producer.`)
    }
  }

  expectExactCount(rootPackagePathLiteralCount, 1, 'Root package authority path literal count')

  const runtimeDescriptorProducers = callExpressions(viteSourceFile).filter(
    (call) =>
      ts.isPropertyAccessExpression(call.expression) &&
      call.expression.name.text === 'parse' &&
      sameSymbol(checker, call.expression.expression, runtimeSchemaImport?.name),
  ).length
  const flowModel: BuildAuthorityFlowModel = {
    alternateProducerCount,
    artifactDescriptorConsumers: artifactEmitCalls.length,
    buildVersionProducerCalls: buildVersionProducerCalls.length,
    compiledIdentityConsumers,
    projectConfigImportResolved,
    releaseShaProducerCalls: execFileSyncCalls.length,
    runtimeDescriptorProducers,
  }
  const flowViolations = validateBuildAuthorityFlowModel(flowModel)

  if (flowViolations.length !== 0) {
    throw new Error(flowViolations.join('\n'))
  }

  expectExactCount(releaseShaProducerCalls.length, 1, 'Release SHA descriptor producer invocation')
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

async function validateArchitectureConsoleUiPackage(): Promise<void> {
  const packageDirectory = resolve(rootDirectory, 'packages/ui')
  const manifest = await readJsonObject(resolve(packageDirectory, 'package.json'))

  expectStructuredEqual(
    manifest['dependencies'],
    {
      '@platform/design-system': 'workspace:*',
      '@vueuse/core': 'catalog:',
      'motion-v': 'catalog:',
      'naive-ui': 'catalog:',
      vue: 'catalog:',
    },
    'Architecture Console @platform/ui dependencies',
  )

  for (const section of ['devDependencies', 'peerDependencies', 'optionalDependencies']) {
    expectEqual(manifest[section], undefined, `Architecture Console @platform/ui ${section}`)
  }

  expectStructuredEqual(
    manifest['exports'],
    {
      '.': {
        types: './src/index.ts',
        default: './src/index.ts',
      },
    },
    'Architecture Console @platform/ui exports',
  )

  const sourceDirectory = resolve(packageDirectory, 'src')
  const sourceDirectoryStatus = await lstat(sourceDirectory)

  if (!sourceDirectoryStatus.isDirectory()) {
    throw new Error('Architecture Console @platform/ui src must be a regular directory.')
  }

  await access(resolve(sourceDirectory, 'index.ts'))
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
expectEqual(rootManifest['version'], expectedBuildVersion, 'Root Build Version authority')

if (
  typeof rootManifest['version'] !== 'string' ||
  !exactSemanticVersionPattern.test(rootManifest['version'])
) {
  throw new Error('The root Build Version authority must use exact semantic-version syntax.')
}

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
expectEqual(workspaceCatalog['gsap'], undefined, 'Inactive GSAP catalog coordinate')
expectEqual(
  workspaceCatalog['@vueuse/core'],
  expectedVueUseCoreVersion,
  'VueUse core catalog version',
)
expectEqual(workspaceCatalog['motion-v'], expectedMotionVVersion, 'Motion for Vue catalog version')
expectEqual(workspaceCatalog['pinia'], '3.0.4', 'Pinia catalog version')
expectEqual(workspaceCatalog['vue'], expectedVueVersion, 'Vue catalog version')
expectEqual(workspaceCatalog['zod'], expectedZodVersion, 'Zod catalog version')
expectEqual(workspaceCatalog['vue-router'], expectedVueRouterVersion, 'Vue Router catalog version')
expectEqual(workspaceConfiguration['allowUnusedPatches'], false, 'Unused patch failure policy')
expectEqual(
  workspaceConfiguration['ignorePatchFailures'],
  false,
  'Patch application failure policy',
)
expectStructuredEqual(
  workspaceConfiguration['patchedDependencies'],
  expectedPatchedDependencies,
  'Workspace patched dependency authority',
)

const workspacePatchedDependencies = workspaceConfiguration['patchedDependencies']

if (!isJsonObject(workspacePatchedDependencies)) {
  throw new Error('Workspace patched dependency authority must be an object.')
}

expectExactCount(
  Object.keys(workspacePatchedDependencies).filter((key) => key.startsWith('motion-v@')).length,
  1,
  'Workspace Motion for Vue exact patch count',
)

const motionVPatch = await readFile(resolve(rootDirectory, motionVPatchPath), 'utf8')
const motionVPatchMetadata = readMotionPatchMetadata(motionVPatch)

expectEqual(motionVPatchMetadata.hash, expectedMotionVPatchHash, 'Motion for Vue patch SHA-256')
expectExactCount(
  motionVPatchMetadata.targetFiles.length,
  expectedMotionVPatchDeclarationFileCount,
  'Motion for Vue patch declaration target count',
)
expectExactCount(
  motionVPatchMetadata.hunkCount,
  expectedMotionVPatchDeclarationHunkCount,
  'Motion for Vue patch declaration hunk count',
)

const motionVPackageDirectory = resolve(rootDirectory, 'packages/ui/node_modules/motion-v')
const motionVRuntimeHashManifest = await createMotionVRuntimeHashManifest(motionVPackageDirectory)

expectStructuredEqual(
  motionVRuntimeHashManifest,
  {
    fileCount: expectedMotionVRuntimeJavaScriptFileCount,
    hash: expectedMotionVRuntimeHashManifest,
  },
  'Installed Motion for Vue runtime JavaScript hash manifest',
)
await validateMotionVDeclarationGraph(motionVPackageDirectory, motionVPatchMetadata.targetFiles)
await validateMotionTypeScriptStrictness()
await validateMotionCompatibilityBypassAbsence()
validateMotionPatchCompatibilityProbes()
validateMotionFeatureBudgetAuthority()

const vueRouterPatch = await readFile(resolve(rootDirectory, vueRouterPatchPath), 'utf8')
const vueRouterPatchLines = vueRouterPatch.split('\n')
const vueRouterPatchHash = createHash('sha256').update(vueRouterPatch).digest('hex')
expectExactCount(
  vueRouterPatchLines.filter((line) => line.startsWith('diff --git ')).length,
  1,
  'Vue Router patch target count',
)
expectExactCount(
  vueRouterPatchLines.filter((line) => line.startsWith('@@ ')).length,
  1,
  'Vue Router patch hunk count',
)
expectStructuredEqual(
  vueRouterPatchLines.filter((line) => /^[-+]  (?:name|path|hash)\?/u.test(line)),
  [
    '-  name?: RecordName;',
    '+  name?: RecordName | undefined;',
    '-  path?: MatcherPatternPath;',
    '+  path?: MatcherPatternPath | undefined;',
    '-  hash?: MatcherPatternHash;',
    '+  hash?: MatcherPatternHash | undefined;',
  ],
  'Vue Router patch declaration replacements',
)

if (
  !vueRouterPatch.startsWith(
    'diff --git a/dist/index-BN0B0y8a.d.ts b/dist/index-BN0B0y8a.d.ts\n',
  ) ||
  vueRouterPatchLines.filter(
    (line) =>
      (line.startsWith('+') || line.startsWith('-')) &&
      !line.startsWith('+++') &&
      !line.startsWith('---') &&
      !/^[-+]  (?:name|path|hash)\?/u.test(line),
  ).length !== 0
) {
  throw new Error('Vue Router patch must remain declaration-only and exactly scoped.')
}

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
const uiLockfileImporter = isJsonObject(lockfileImporters)
  ? lockfileImporters['packages/ui']
  : undefined
const uiLockfileDependencies = isJsonObject(uiLockfileImporter)
  ? uiLockfileImporter['dependencies']
  : undefined
const lockedUiNaiveDependency = isJsonObject(uiLockfileDependencies)
  ? uiLockfileDependencies['naive-ui']
  : undefined
const lockedUiVueUseCoreDependency = isJsonObject(uiLockfileDependencies)
  ? uiLockfileDependencies['@vueuse/core']
  : undefined
const lockedUiMotionVDependency = isJsonObject(uiLockfileDependencies)
  ? uiLockfileDependencies['motion-v']
  : undefined
const lockedUiGsapDependency = isJsonObject(uiLockfileDependencies)
  ? uiLockfileDependencies['gsap']
  : undefined
const lockedPiniaDependency = isJsonObject(webLockfileDependencies)
  ? webLockfileDependencies['pinia']
  : undefined
const lockedVueRouterDependency = isJsonObject(webLockfileDependencies)
  ? webLockfileDependencies['vue-router']
  : undefined
const lockfilePackages = lockfile['packages']
const lockedPiniaPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('pinia@'))
  : []
const lockedZodPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('zod@'))
  : []
const lockedVueRouterPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('vue-router@'))
  : []
const lockedVueRouterPackage = isJsonObject(lockfilePackages)
  ? lockfilePackages[`vue-router@${expectedVueRouterVersion}`]
  : undefined
const lockedNaiveUiPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('naive-ui@'))
  : []
const lockedNaiveUiPackage = isJsonObject(lockfilePackages)
  ? lockfilePackages[`naive-ui@${expectedNaiveUiVersion}`]
  : undefined
const lockedVueUseCorePackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('@vueuse/core@'))
  : []
const lockedVueUseCorePackage = isJsonObject(lockfilePackages)
  ? lockfilePackages[`@vueuse/core@${expectedVueUseCoreVersion}`]
  : undefined
const lockedMotionVPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('motion-v@'))
  : []
const lockedMotionVPackage = isJsonObject(lockfilePackages)
  ? lockfilePackages[`motion-v@${expectedMotionVVersion}`]
  : undefined
const lockedReactPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('react@'))
  : []
const lockedReactDomPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('react-dom@'))
  : []
const lockedGsapPackageKeys = isJsonObject(lockfilePackages)
  ? Object.keys(lockfilePackages).filter((key) => key.startsWith('gsap@'))
  : []
const lockedZodDependency = isJsonObject(webLockfileDependencies)
  ? webLockfileDependencies['zod']
  : undefined
const designSystemLockfileImporter = isJsonObject(lockfileImporters)
  ? lockfileImporters['packages/design-system']
  : undefined
const designSystemLockfileDependencies = isJsonObject(designSystemLockfileImporter)
  ? designSystemLockfileImporter['dependencies']
  : undefined
const lockedDesignSystemZodDependency = isJsonObject(designSystemLockfileDependencies)
  ? designSystemLockfileDependencies['zod']
  : undefined
const lockfileSnapshots = lockfile['snapshots']
const lockfilePatchedDependencies = lockfile['patchedDependencies']
const lockedVueRouterPatch = isJsonObject(lockfilePatchedDependencies)
  ? lockfilePatchedDependencies['vue-router@5.2.0']
  : undefined
const lockedMotionVPatch = isJsonObject(lockfilePatchedDependencies)
  ? lockfilePatchedDependencies['motion-v@2.4.0']
  : undefined
const lockedVueRouterPatchHash = isJsonObject(lockedVueRouterPatch)
  ? lockedVueRouterPatch['hash']
  : undefined
const lockedMotionVPatchHash = isJsonObject(lockedMotionVPatch)
  ? lockedMotionVPatch['hash']
  : undefined
const lockedVueRouterSnapshotKeys = isJsonObject(lockfileSnapshots)
  ? Object.keys(lockfileSnapshots).filter((key) => key.startsWith('vue-router@'))
  : []
const lockedNaiveUiSnapshotKeys = isJsonObject(lockfileSnapshots)
  ? Object.keys(lockfileSnapshots).filter((key) => key.startsWith('naive-ui@'))
  : []
const lockedVueUseCoreSnapshotKeys = isJsonObject(lockfileSnapshots)
  ? Object.keys(lockfileSnapshots).filter((key) => key.startsWith('@vueuse/core@'))
  : []
const lockedMotionVSnapshotKeys = isJsonObject(lockfileSnapshots)
  ? Object.keys(lockfileSnapshots).filter((key) => key.startsWith('motion-v@'))
  : []
const lockedGsapSnapshotKeys = isJsonObject(lockfileSnapshots)
  ? Object.keys(lockfileSnapshots).filter((key) => key.startsWith('gsap@'))
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
expectStructuredEqual(
  isJsonObject(defaultLockfileCatalog) ? defaultLockfileCatalog['zod'] : undefined,
  { specifier: expectedZodVersion, version: expectedZodVersion },
  'Zod lockfile catalog coordinate',
)
expectStructuredEqual(
  lockedZodDependency,
  { specifier: 'catalog:', version: expectedZodVersion },
  'Zod web lockfile coordinate',
)
expectStructuredEqual(
  lockedDesignSystemZodDependency,
  { specifier: 'catalog:', version: expectedZodVersion },
  'Zod design-system lockfile coordinate',
)
expectStructuredEqual(
  lockedZodPackageKeys,
  [`zod@${expectedZodVersion}`],
  'Zod lockfile package set',
)
expectStructuredEqual(
  isJsonObject(lockfileSnapshots) ? lockfileSnapshots[`zod@${expectedZodVersion}`] : undefined,
  {},
  'Zod lockfile snapshot',
)
expectStructuredEqual(
  isJsonObject(defaultLockfileCatalog) ? defaultLockfileCatalog['vue-router'] : undefined,
  { specifier: expectedVueRouterVersion, version: expectedVueRouterVersion },
  'Vue Router lockfile catalog coordinate',
)

if (
  !isJsonObject(lockedVueRouterDependency) ||
  lockedVueRouterDependency['specifier'] !== 'catalog:' ||
  typeof lockedVueRouterDependency['version'] !== 'string' ||
  typeof lockedVueRouterPatchHash !== 'string' ||
  !/^[0-9a-f]{64}$/u.test(lockedVueRouterPatchHash) ||
  lockedVueRouterPatchHash !== vueRouterPatchHash ||
  !lockedVueRouterDependency['version'].startsWith(
    `${expectedVueRouterVersion}(patch_hash=${lockedVueRouterPatchHash})`,
  )
) {
  throw new Error('Vue Router web lockfile resolution must bind the exact patched coordinate.')
}

expectStructuredEqual(
  lockedVueRouterPackageKeys,
  [`vue-router@${expectedVueRouterVersion}`],
  'Vue Router lockfile package set',
)
expectEqual(
  isJsonObject(lockedVueRouterPackage) && isJsonObject(lockedVueRouterPackage['resolution'])
    ? lockedVueRouterPackage['resolution']['integrity']
    : undefined,
  expectedVueRouterIntegrity,
  'Official Vue Router npm integrity',
)
expectEqual(
  isJsonObject(lockedVueRouterPatch) ? lockedVueRouterPatch['path'] : undefined,
  vueRouterPatchPath,
  'Vue Router lockfile patch path',
)

if (
  lockedVueRouterSnapshotKeys.length !== 1 ||
  !lockedVueRouterSnapshotKeys[0]?.startsWith(
    `vue-router@${expectedVueRouterVersion}(patch_hash=${lockedVueRouterPatchHash})`,
  )
) {
  throw new Error('Vue Router patched lockfile snapshot identity drifted.')
}

expectStructuredEqual(
  isJsonObject(defaultLockfileCatalog) ? defaultLockfileCatalog['@vueuse/core'] : undefined,
  { specifier: expectedVueUseCoreVersion, version: expectedVueUseCoreVersion },
  'VueUse core lockfile catalog coordinate',
)
expectStructuredEqual(
  isJsonObject(defaultLockfileCatalog) ? defaultLockfileCatalog['motion-v'] : undefined,
  { specifier: expectedMotionVVersion, version: expectedMotionVVersion },
  'Motion for Vue lockfile catalog coordinate',
)
expectStructuredEqual(
  lockedUiVueUseCoreDependency,
  {
    specifier: 'catalog:',
    version: expectedVueUseCoreSnapshotCoordinate.slice('@vueuse/core@'.length),
  },
  'VueUse core @platform/ui lockfile coordinate',
)
expectStructuredEqual(
  lockedUiMotionVDependency,
  {
    specifier: 'catalog:',
    version: expectedMotionVSnapshotCoordinate.slice('motion-v@'.length),
  },
  'Motion for Vue @platform/ui lockfile coordinate',
)
expectStructuredEqual(
  lockedVueUseCorePackageKeys,
  [`@vueuse/core@${expectedVueUseCoreVersion}`],
  'VueUse core lockfile package set',
)
expectStructuredEqual(
  lockedMotionVPackageKeys,
  [`motion-v@${expectedMotionVVersion}`],
  'Motion for Vue lockfile package set',
)
expectEqual(
  isJsonObject(lockedVueUseCorePackage) && isJsonObject(lockedVueUseCorePackage['resolution'])
    ? lockedVueUseCorePackage['resolution']['integrity']
    : undefined,
  expectedVueUseCoreIntegrity,
  'Official VueUse core npm integrity',
)
expectEqual(
  isJsonObject(lockedMotionVPackage) && isJsonObject(lockedMotionVPackage['resolution'])
    ? lockedMotionVPackage['resolution']['integrity']
    : undefined,
  expectedMotionVIntegrity,
  'Official Motion for Vue npm integrity',
)
expectStructuredEqual(
  isJsonObject(lockedMotionVPackage) ? lockedMotionVPackage['peerDependencies'] : undefined,
  { '@vueuse/core': '>=10.0.0', vue: '>=3.0.0' },
  'Motion for Vue peer dependency authority',
)
expectEqual(
  isJsonObject(lockedMotionVPatch) ? lockedMotionVPatch['path'] : undefined,
  motionVPatchPath,
  'Motion for Vue lockfile patch path',
)
expectEqual(lockedMotionVPatchHash, expectedMotionVPatchHash, 'Motion for Vue lockfile patch hash')
expectStructuredEqual(
  lockedVueUseCoreSnapshotKeys,
  [expectedVueUseCoreSnapshotCoordinate],
  'VueUse core lockfile snapshot identity',
)
expectStructuredEqual(
  lockedMotionVSnapshotKeys,
  [expectedMotionVSnapshotCoordinate],
  'Motion for Vue patched lockfile snapshot identity',
)
expectStructuredEqual(lockedReactPackageKeys, [], 'Direct React lockfile package set')
expectStructuredEqual(lockedReactDomPackageKeys, [], 'Direct React DOM lockfile package set')

expectStructuredEqual(
  isJsonObject(defaultLockfileCatalog) ? defaultLockfileCatalog['naive-ui'] : undefined,
  { specifier: expectedNaiveUiVersion, version: expectedNaiveUiVersion },
  'Naive UI lockfile catalog coordinate',
)
expectStructuredEqual(lockedNaiveUiPackageKeys, ['naive-ui@2.45.2'], 'Naive UI package set')
if (
  !isJsonObject(lockedUiNaiveDependency) ||
  lockedUiNaiveDependency['specifier'] !== 'catalog:' ||
  typeof lockedUiNaiveDependency['version'] !== 'string' ||
  !lockedUiNaiveDependency['version'].startsWith('2.45.2(vue@3.5.40')
) {
  throw new Error('Naive UI @platform/ui lockfile importer binding drifted.')
}
expectEqual(
  isJsonObject(lockedNaiveUiPackage) && isJsonObject(lockedNaiveUiPackage['resolution'])
    ? lockedNaiveUiPackage['resolution']['integrity']
    : undefined,
  expectedNaiveUiIntegrity,
  'Naive UI npm integrity',
)

if (
  !isJsonObject(lockedNaiveUiPackage) ||
  !isJsonObject(lockedNaiveUiPackage['engines']) ||
  lockedNaiveUiPackage['engines']['node'] !== '>=20' ||
  !isJsonObject(lockedNaiveUiPackage['peerDependencies']) ||
  lockedNaiveUiPackage['peerDependencies']['vue'] !== '^3.0.0' ||
  lockedNaiveUiSnapshotKeys.length !== 1 ||
  !lockedNaiveUiSnapshotKeys[0]?.startsWith('naive-ui@2.45.2(vue@3.5.40')
) {
  throw new Error('Naive UI engine, Vue peer or single snapshot closure drifted.')
}

expectStructuredEqual(
  isJsonObject(defaultLockfileCatalog) ? defaultLockfileCatalog['gsap'] : undefined,
  undefined,
  'Inactive GSAP lockfile catalog coordinate',
)
expectStructuredEqual(
  lockedUiGsapDependency,
  undefined,
  'Inactive GSAP @platform/ui lockfile coordinate',
)
expectStructuredEqual(lockedGsapPackageKeys, [], 'Inactive GSAP lockfile package set')
expectStructuredEqual(lockedGsapSnapshotKeys, [], 'Inactive GSAP lockfile snapshot set')

const webManifest = await readJsonObject(resolve(rootDirectory, 'apps/web/package.json'))
const uiManifest = await readJsonObject(resolve(rootDirectory, 'packages/ui/package.json'))

for (const dependency of prohibitedDirectMotionCompatibilityDependencies) {
  expectEqual(
    workspaceCatalog[dependency],
    undefined,
    `Prohibited direct compatibility catalog coordinate ${dependency}`,
  )

  for (const [manifest, description] of [
    [rootManifest, 'root package'],
    [webManifest, '@platform/web'],
    [designSystemManifest, '@platform/design-system'],
    [uiManifest, '@platform/ui'],
  ] as const) {
    expectDirectDependencyAbsent(manifest, dependency, description)
  }
}

for (const [manifest, description] of [
  [rootManifest, 'root package'],
  [webManifest, '@platform/web'],
  [designSystemManifest, '@platform/design-system'],
] as const) {
  expectDirectDependencyAbsent(manifest, 'motion-v', description)
  expectDirectDependencyAbsent(manifest, '@vueuse/core', description)
}

expectEqual(
  workspaceConfiguration['catalog'] !== undefined && isJsonObject(workspaceConfiguration['catalog'])
    ? workspaceConfiguration['catalog']['naive-ui']
    : undefined,
  expectedNaiveUiVersion,
  'Naive UI workspace catalog coordinate',
)
expectEqual(
  workspaceConfiguration['catalog'] !== undefined && isJsonObject(workspaceConfiguration['catalog'])
    ? workspaceConfiguration['catalog']['gsap']
    : undefined,
  undefined,
  'Inactive GSAP workspace catalog coordinate',
)

expectStructuredEqual(
  webManifest['dependencies'],
  {
    '@platform/design-system': 'workspace:*',
    '@platform/ui': 'workspace:*',
    pinia: 'catalog:',
    vue: 'catalog:',
    'vue-router': 'catalog:',
    zod: 'catalog:',
  },
  'Router web dependency set',
)

expectEqual(designSystemDependencies['zod'], 'catalog:', 'Design-system Zod catalog binding')

expectDirectDependencyAbsent(rootManifest, 'zod', 'root package')

for (const workspace of projectConfig.workspaces) {
  if (workspace.path === 'apps/web' || workspace.path === 'packages/design-system') {
    continue
  }

  expectDirectDependencyAbsent(
    await readJsonObject(resolve(rootDirectory, workspace.path, 'package.json')),
    'zod',
    workspace.name,
  )
}

for (const [manifest, description] of [
  [rootManifest, 'root package'],
  [designSystemManifest, '@platform/design-system'],
  [uiManifest, '@platform/ui'],
] as const) {
  expectDirectDependencyAbsent(manifest, 'pinia', description)
  expectDirectDependencyAbsent(manifest, 'vue-router', description)
}

for (const [manifest, description] of [
  [rootManifest, 'root package'],
  [webManifest, '@platform/web'],
  [designSystemManifest, '@platform/design-system'],
  [uiManifest, '@platform/ui'],
] as const) {
  expectDirectDependencyAbsent(manifest, '@vue/devtools-api', description)
}

for (const [manifest, description] of [
  [rootManifest, 'root package'],
  [webManifest, '@platform/web'],
  [designSystemManifest, '@platform/design-system'],
  [uiManifest, '@platform/ui'],
] as const) {
  expectDirectDependencyAbsent(manifest, 'gsap', description)
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
  expectedPatchedDependencies,
  'Reviewed exact-version patch set',
)

const architecture = await readFile(resolve(rootDirectory, 'ARCHITECTURE.md'), 'utf8')
const motionPatchArchitecture = architectureAssignmentBlock(
  architecture,
  'PATCH_TARGET_PACKAGE=motion-v',
)

expectStructuredEqual(
  {
    PATCH_TARGET_PACKAGE: motionPatchArchitecture['PATCH_TARGET_PACKAGE'],
    PATCH_TARGET_VERSION: motionPatchArchitecture['PATCH_TARGET_VERSION'],
    PATCH_FILE: motionPatchArchitecture['PATCH_FILE'],
    PATCH_KIND: motionPatchArchitecture['PATCH_KIND'],
    PATCH_RUNTIME_CHANGE: motionPatchArchitecture['PATCH_RUNTIME_CHANGE'],
    PATCH_JAVASCRIPT_CHANGE: motionPatchArchitecture['PATCH_JAVASCRIPT_CHANGE'],
    PATCH_PACKAGE_METADATA_CHANGE: motionPatchArchitecture['PATCH_PACKAGE_METADATA_CHANGE'],
    PATCH_SECOND_PACKAGE: motionPatchArchitecture['PATCH_SECOND_PACKAGE'],
    TYPESCRIPT_STRICTNESS_CHANGE: motionPatchArchitecture['TYPESCRIPT_STRICTNESS_CHANGE'],
    REACT_TYPE_DEPENDENCY: motionPatchArchitecture['REACT_TYPE_DEPENDENCY'],
    PATCH_RUNTIME_HASH_EQUALITY: motionPatchArchitecture['PATCH_RUNTIME_HASH_EQUALITY'],
    PATCH_SHA256: motionPatchArchitecture['PATCH_SHA256'],
    PATCH_CHANGED_DECLARATION_FILE_COUNT:
      motionPatchArchitecture['PATCH_CHANGED_DECLARATION_FILE_COUNT'],
    PATCH_CHANGED_DECLARATION_HUNK_COUNT:
      motionPatchArchitecture['PATCH_CHANGED_DECLARATION_HUNK_COUNT'],
    PATCH_CHANGED_DECLARATION_FILES: motionPatchArchitecture['PATCH_CHANGED_DECLARATION_FILES'],
    PATCH_RUNTIME_JAVASCRIPT_FILE_COUNT:
      motionPatchArchitecture['PATCH_RUNTIME_JAVASCRIPT_FILE_COUNT'],
    PATCH_RUNTIME_HASH_MANIFEST_ALGORITHM:
      motionPatchArchitecture['PATCH_RUNTIME_HASH_MANIFEST_ALGORITHM'],
    PATCH_RUNTIME_HASH_MANIFEST_SHA256:
      motionPatchArchitecture['PATCH_RUNTIME_HASH_MANIFEST_SHA256'],
    PATCH_EXACT_MOTION_PATCH_COUNT: motionPatchArchitecture['PATCH_EXACT_MOTION_PATCH_COUNT'],
    PATCH_CANONICAL_TOTAL_SET: motionPatchArchitecture['PATCH_CANONICAL_TOTAL_SET'],
    PATCH_DIRECT_REACT_OR_BROWSER_GLOBAL_COMPATIBILITY_DEPENDENCY:
      motionPatchArchitecture['PATCH_DIRECT_REACT_OR_BROWSER_GLOBAL_COMPATIBILITY_DEPENDENCY'],
    PATCH_TYPESCRIPT_STRICT: motionPatchArchitecture['PATCH_TYPESCRIPT_STRICT'],
    PATCH_TYPESCRIPT_EXACT_OPTIONAL_PROPERTY_TYPES:
      motionPatchArchitecture['PATCH_TYPESCRIPT_EXACT_OPTIONAL_PROPERTY_TYPES'],
    PATCH_TYPESCRIPT_SKIP_LIB_CHECK: motionPatchArchitecture['PATCH_TYPESCRIPT_SKIP_LIB_CHECK'],
  },
  {
    PATCH_TARGET_PACKAGE: 'motion-v',
    PATCH_TARGET_VERSION: expectedMotionVVersion,
    PATCH_FILE: motionVPatchPath,
    PATCH_KIND: 'DECLARATION_ONLY',
    PATCH_RUNTIME_CHANGE: 'PROHIBITED',
    PATCH_JAVASCRIPT_CHANGE: 'PROHIBITED',
    PATCH_PACKAGE_METADATA_CHANGE: 'PROHIBITED',
    PATCH_SECOND_PACKAGE: 'PROHIBITED',
    TYPESCRIPT_STRICTNESS_CHANGE: 'PROHIBITED',
    REACT_TYPE_DEPENDENCY: 'PROHIBITED',
    PATCH_RUNTIME_HASH_EQUALITY: 'REQUIRED',
    PATCH_SHA256: motionVPatchMetadata.hash,
    PATCH_CHANGED_DECLARATION_FILE_COUNT: String(motionVPatchMetadata.targetFiles.length),
    PATCH_CHANGED_DECLARATION_HUNK_COUNT: String(motionVPatchMetadata.hunkCount),
    PATCH_CHANGED_DECLARATION_FILES: motionVPatchMetadata.targetFiles.join(';'),
    PATCH_RUNTIME_JAVASCRIPT_FILE_COUNT: String(motionVRuntimeHashManifest.fileCount),
    PATCH_RUNTIME_HASH_MANIFEST_ALGORITHM:
      'sorted POSIX relative path;NUL;per-file SHA-256 hex;newline',
    PATCH_RUNTIME_HASH_MANIFEST_SHA256: motionVRuntimeHashManifest.hash,
    PATCH_EXACT_MOTION_PATCH_COUNT: '1',
    PATCH_CANONICAL_TOTAL_SET: Object.keys(expectedPatchedDependencies).join(';'),
    PATCH_DIRECT_REACT_OR_BROWSER_GLOBAL_COMPATIBILITY_DEPENDENCY: 'PROHIBITED',
    PATCH_TYPESCRIPT_STRICT: 'true',
    PATCH_TYPESCRIPT_EXACT_OPTIONAL_PROPERTY_TYPES: 'true',
    PATCH_TYPESCRIPT_SKIP_LIB_CHECK: 'false',
  },
  'Motion for Vue declaration-patch Architecture synchronization',
)
expectExactCount(
  [
    ...architecture.matchAll(
      /^MOTION_FEATURE_PROJECT_CONFIG_BUDGET_PROPERTY=projectConfig\.bundleBudgets\.adminNavigationMotionFeatureJavaScriptGzipBytes$/gmu,
    ),
  ].length,
  1,
  'Admin Navigation Motion feature project-config budget Architecture authority',
)

expectStructuredEqual(
  {
    phase: projectConfig.governance.implementationPhase,
    state: readCanonicalImplementationState(architecture),
  },
  expectedImplementationContract,
  'Canonical implementation contract',
)

await validateArchitectureConsoleUiPackage()

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
expectStructuredEqual(
  projectConfig.deployment,
  { deploymentBase: '/' },
  'Exact root-only deployment configuration',
)

await validateRuntimeKernelBuildConfiguration()
await validateOfficialRouteDtsRegeneration()
await validateVueRouterCompatibilityProbe()

console.log('Project configuration schema: valid')
