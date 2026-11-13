import { formatUiDateTime } from '../../packages/ui/src/date-time/date-time'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { getEventListeners } from 'node:events'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { TextDecoder } from 'node:util'
import { runInNewContext } from 'node:vm'

import stylelint from 'stylelint'
import { ESLint } from 'eslint'
import ts from 'typescript'
import type * as VueRuntime from 'vue'
import type * as VueSfc from 'vue/compiler-sfc'

import type * as QueryCore from '../../apps/web/src/shared/query'
import type * as ApiCore from '../../apps/web/src/shared/api'
import type * as UapiService from '../../apps/web/src/shared/services/uapi-world-time'

import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { projectConfig } from '../../project.config'
import {
  apiBaseUrlSchema,
  apiRequestPolicies,
  createApiClient,
  type ApiEndpoint,
  type ApiFetch,
  type ApiResult,
} from '../../apps/web/src/shared/api'
import { coreRuntimeConfigurationSchema } from '../../apps/web/src/app/config/runtime-configuration-contract'
import {
  readUapiWorldTime,
  type UapiWorldTime,
} from '../../apps/web/src/shared/services/uapi-world-time'
import { validateArchitectureAdminConsole } from './check-architecture-admin-console'
import { validateAppearanceCutover } from './check-appearance-cutover'
import { validateI18nArchitecture } from './check-i18n'
import { validateRouterArchitecture } from './check-router'
import { validateRuntimeKernelArchitecture } from './check-runtime-kernel'
import { validateStorageArchitecture } from './check-storage'
import { ordinaryStyleDebt } from './style-debt-baseline'
import {
  generatedStyleOwners,
  scssFallbackOwners,
  styleCompilerAdmission,
  styleDeclarationKey,
  styleSourceAdmission,
  validateScssFallbackOutputContract,
} from './style-ownership'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const sourceExtensions = new Set(['.ts', '.vue'])
const importSourceExtensions = new Set(['.cjs', '.js', '.mjs', '.ts', '.vue'])
const excludedDirectoryNames = new Set([
  '.git',
  'node_modules',
  // Nested accidental checkout; not the active parent worktree.
  'progressive-adaptive-vue-platform',
])
const generatedOutputDirectories = new Set([resolve(rootDirectory, 'apps/web/dist')])
const rootTypeScriptConfigurationSuffix = '.config.ts'
// Current implementation admission, not a permanent judgment of library suitability.
const inactiveCapabilityPackages = [
  '@capacitor/core',
  '@tanstack/query-core',
  '@tanstack/vue-table',
  '@tanstack/vue-virtual',
  '@tauri-apps/api',
  '@unocss/preset-attributify',
  '@unocss/preset-tagify',
  'ag-grid-community',
  'ag-grid-vue3',
  'alova',
  'axios',
  'clsx',
  'dayjs',
  'element-plus',
  'gsap',
  'less',
  'lodash',
  'moment',
  'nuxt',
  'nx',
  'openapi-fetch',
  'openapi-typescript',
  'overlayscrollbars-vue',
  'primevue',
  'quasar',
  'react',
  'react-dom',
  'reka-ui',
  'tailwindcss',
  'turbo',
  'unplugin-vue-router',
  'unplugin-auto-import',
  'unplugin-vue-components',
  'vee-validate',
  'vue-i18n',
  'vuetify',
] as const
const workspaceNames = new Set<string>(projectConfig.workspaces.map((workspace) => workspace.name))
const allowedWorkspaceDependencies = new Map<string, ReadonlySet<string>>(
  projectConfig.workspaces.map((workspace) => [
    workspace.name,
    new Set<string>(workspace.mayDependOn),
  ]),
)
// Preserve the exact installed set; VueUse also supports domain-owned public utility use.
const adminNavigationMotionPackages = ['@vueuse/core', 'motion-v'] as const
const adminNavigationMotionOwner = '@platform/ui'
const adminNavigationMotionPrivateDirectory = 'packages/ui/src/adapters/motion/'

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

function inactiveCapabilityPackage(specifier: string): string | undefined {
  return inactiveCapabilityPackages.find(
    (packageName) => specifier === packageName || specifier.startsWith(`${packageName}/`),
  )
}

async function validateManifestDependencies(): Promise<string[]> {
  const violations: string[] = []
  const manifestEntries = [
    ['root package', resolve(rootDirectory, 'package.json')],
    ...projectConfig.workspaces.map(
      (workspace) =>
        [workspace.name, resolve(rootDirectory, workspace.path, 'package.json')] as const,
    ),
  ] as const
  const manifests = new Map<string, JsonObject>()

  for (const [description, manifestPath] of manifestEntries) {
    const manifest = await readJsonObject(manifestPath)
    manifests.set(relative(rootDirectory, manifestPath), manifest)

    for (const [dependency] of dependencyEntries(manifest)) {
      if (
        /^sass(?:-embedded)?$/u.test(dependency) &&
        !styleCompilerAdmission(relative(rootDirectory, manifestPath), dependency)
      ) {
        violations.push(
          `${description}: style compiler requires explicit support and an exact fallback owner.`,
        )
      }
      const inactivePackage = inactiveCapabilityPackage(dependency)

      if (
        inactivePackage !== undefined &&
        !(inactivePackage === 'vue-i18n' && description === '@platform/web')
      ) {
        violations.push(
          `${description}: package "${inactivePackage}" has no current dependency admission; research does not authorize installation.`,
        )
      }
    }

    for (const dependency of [
      ...adminNavigationMotionPackages,
      'overlayscrollbars',
      'lenis',
      'gridstack',
    ]) {
      const declarations = dependencyEntries(manifest).filter(([name]) => name === dependency)
      const dependencies = manifest['dependencies']
      const admittedVersion = isJsonObject(dependencies) ? dependencies[dependency] : undefined

      if (
        description === adminNavigationMotionOwner ||
        (description === '@platform/web' && dependency === 'motion-v')
      ) {
        if (
          declarations.length !== 1 ||
          declarations[0]?.[1] !== 'catalog:' ||
          admittedVersion !== 'catalog:'
        ) {
          violations.push(
            `${description}: ${dependency} must be declared exactly once as a catalog: dependency.`,
          )
        }
      } else if (declarations.length > 0) {
        violations.push(
          `${description}: ${dependency} is outside its admitted workspace ownership.`,
        )
      }
    }

    for (const [dependency, owner, section] of [
      ['vue-i18n', '@platform/web', 'dependencies'],
      ['@tanstack/vue-query', '@platform/web', 'dependencies'],
      ['@intlify/message-compiler', 'root package', 'devDependencies'],
    ] as const) {
      const declarations = dependencyEntries(manifest).filter(([name]) => name === dependency)
      const admittedSection = manifest[section]
      if (description === owner) {
        if (
          declarations.length !== 1 ||
          !isJsonObject(admittedSection) ||
          admittedSection[dependency] !== 'catalog:'
        ) {
          violations.push(
            `${dependency} requires exactly one ${owner} ${section} catalog declaration.`,
          )
        }
      } else if (declarations.length !== 0) {
        violations.push(`${description}: ${dependency} belongs only to ${owner}.`)
      }
    }
  }

  const compilerOwners = new Set<string>()
  for (const owner of scssFallbackOwners) {
    const compilerOwner = JSON.stringify([owner.manifestPath, owner.compiler])
    if (compilerOwners.has(compilerOwner)) continue
    compilerOwners.add(compilerOwner)
    const manifest = manifests.get(owner.manifestPath)
    if (manifest === undefined) {
      violations.push(
        `${owner.path}: SCSS fallback compiler manifest "${owner.manifestPath}" is not a workspace manifest.`,
      )
      continue
    }
    const declarations = dependencyEntries(manifest).filter(([name]) => name === owner.compiler)
    const runtimeDependencies = manifest['dependencies']
    const developmentDependencies = manifest['devDependencies']
    const directDependency =
      (isJsonObject(runtimeDependencies) &&
        typeof runtimeDependencies[owner.compiler] === 'string') ||
      (isJsonObject(developmentDependencies) &&
        typeof developmentDependencies[owner.compiler] === 'string')
    if (
      declarations.length !== 1 ||
      !directDependency ||
      !styleCompilerAdmission(owner.manifestPath, owner.compiler)
    ) {
      violations.push(
        `${owner.path}: SCSS fallback compiler requires one direct manifest dependency and explicit compiler support.`,
      )
    }
  }

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

    if (
      entry.isDirectory() &&
      !excludedDirectoryNames.has(entry.name) &&
      !generatedOutputDirectories.has(path)
    ) {
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

    if (
      entry.isDirectory() &&
      !excludedDirectoryNames.has(entry.name) &&
      !generatedOutputDirectories.has(path)
    ) {
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

  if (segment === 'generated') {
    return 'generated'
  }

  return 'web-root'
}

const allowedLayers = new Map<string, Set<string>>([
  [
    'web-root',
    new Set(['web-root', 'app', 'pages', 'features', 'shared', 'generated', 'ui', 'design-system']),
  ],
  ['app', new Set(['app', 'pages', 'features', 'shared', 'generated', 'ui', 'design-system'])],
  ['pages', new Set(['app', 'pages', 'features', 'shared', 'generated', 'ui', 'design-system'])],
  ['features', new Set(['features', 'shared', 'ui', 'design-system'])],
  ['shared', new Set(['shared', 'ui', 'design-system'])],
  ['generated', new Set(['generated', 'design-system'])],
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

function inspectImport(
  sourcePath: string,
  specifier: string,
  directDependencies: ReadonlySet<string>,
): string[] {
  const violations: string[] = []
  const displayPath = relative(rootDirectory, sourcePath)
  const normalizedDisplayPath = displayPath.split(sep).join('/')
  const fromLayer = sourceLayer(sourcePath)
  const inactivePackage = inactiveCapabilityPackage(specifier)

  if (
    (specifier === '@tanstack/vue-query' || specifier.startsWith('@tanstack/vue-query/')) &&
    !(specifier === '@tanstack/vue-query' && normalizedDisplayPath.startsWith('apps/web/src/'))
  ) {
    violations.push(`${displayPath}: Vue Query requires the application-owned public package root.`)
  }

  if (
    /^sass(?:-embedded)?(?:\/|$)/u.test(specifier) &&
    !(
      normalizedDisplayPath === 'scripts/architecture/check-boundaries.ts' &&
      styleCompilerAdmission('package.json', specifier)
    )
  ) {
    violations.push(
      `${displayPath}: style compiler imports require the explicit Node compiler owner.`,
    )
  }

  if (
    (specifier === '@intlify/message-compiler' ||
      specifier.startsWith('@intlify/message-compiler/')) &&
    !(
      specifier === '@intlify/message-compiler' &&
      normalizedDisplayPath === 'scripts/architecture/check-i18n.ts'
    )
  ) {
    violations.push(`${displayPath}: message compiler is private to the Node i18n checker.`)
  }

  if (
    inactivePackage !== undefined &&
    !(specifier === 'vue-i18n' && normalizedDisplayPath === 'apps/web/src/shared/i18n/runtime.ts')
  ) {
    violations.push(
      `${displayPath}: package "${inactivePackage}" has no current implementation admission.`,
    )
  }

  if (/^@platform\/[^/]+\/.+/u.test(specifier)) {
    violations.push(`${displayPath}: workspace deep import "${specifier}" is forbidden.`)
  }

  if (
    (specifier === 'naive-ui' || specifier.startsWith('naive-ui/')) &&
    !(
      ['components', 'providers', 'adapters'].some((owner) =>
        normalizedDisplayPath.startsWith(`packages/ui/src/${owner}/`),
      ) ||
      (normalizedDisplayPath.startsWith('apps/web/src/') && normalizedDisplayPath.endsWith('.vue'))
    )
  ) {
    violations.push(
      `${displayPath}: "naive-ui" may only be imported by UI view, component, provider or presentation owners.`,
    )
  }

  if (specifier === 'motion-v' || specifier.startsWith('motion-v/')) {
    if (specifier !== 'motion-v') {
      violations.push(`${displayPath}: Motion Vue imports must target the exact "motion-v" root.`)
    }

    if (
      !normalizedDisplayPath.startsWith(adminNavigationMotionPrivateDirectory) &&
      normalizedDisplayPath !== 'apps/web/src/app/workbench/MotionGallery.vue' &&
      normalizedDisplayPath !== 'apps/web/src/app/workbench/WelcomeCapabilityStage.vue' &&
      normalizedDisplayPath !== 'apps/web/src/app/workbench/WelcomeExperience.vue'
    ) {
      violations.push(
        `${displayPath}: "motion-v" may only be imported by its private adapter or exact showcase owner.`,
      )
    }
  }

  if (specifier.startsWith('@tiptap/')) {
    if (
      normalizedDisplayPath !== 'packages/ui/src/adapters/naive/PavpFormRichText.vue' ||
      !['@tiptap/vue-3', '@tiptap/starter-kit'].includes(specifier)
    ) {
      violations.push(`${displayPath}: Tiptap imports belong to the private rich text adapter.`)
    }
  }
  if (/^(?:cropperjs|pdfjs-dist)(?:\/|$)/u.test(specifier)) {
    if (
      !normalizedDisplayPath.startsWith('packages/ui/src/adapters/media/') &&
      normalizedDisplayPath !== 'scripts/verify/check-form-media-preview.ts'
    )
      violations.push(`${displayPath}: Attachment media vendors belong to private media adapters.`)
  }

  if (/^gridstack(?:\/|$)/u.test(specifier)) {
    if (
      normalizedDisplayPath !== 'packages/ui/src/adapters/dashboard/grid-runtime.ts' ||
      !['gridstack', 'gridstack/dist/gridstack.min.css'].includes(specifier)
    ) {
      violations.push(`${displayPath}: GridStack belongs to the private dashboard adapter only.`)
    }
  }

  if (/^(?:overlayscrollbars|lenis)(?:\/|$)/u.test(specifier)) {
    if (
      normalizedDisplayPath !== 'packages/ui/src/adapters/scroll/scroll-enhancement-runtime.ts' ||
      !['overlayscrollbars', 'overlayscrollbars/overlayscrollbars.css', 'lenis'].includes(specifier)
    ) {
      violations.push(
        `${displayPath}: Scroll vendors are private to the admitted Scroll enhancement runtime and exact public exports.`,
      )
    }
  }

  if (specifier.startsWith('@vueuse/')) {
    const packageName = specifier.split('/').slice(0, 2).join('/')
    if (!directDependencies.has(packageName)) {
      violations.push(
        `${displayPath}: "${packageName}" requires a direct runtime dependency in the owning workspace; transitive imports are forbidden.`,
      )
    }
    if (specifier !== '@vueuse/core') {
      violations.push(
        `${displayPath}: VueUse imports must use the admitted "@vueuse/core" public root.`,
      )
    }
  }

  if ((specifier === 'reka-ui' || specifier === 'clsx') && fromLayer !== 'ui') {
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

function inspectVueUseOwnership(sourcePath: string, sourceText: string): string[] {
  const violations: string[] = []
  const displayPath = relative(rootDirectory, sourcePath).split(sep).join('/')
  const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true)
  const domainOwnedHelpers = new Set([
    'useStorage',
    'useStorageAsync',
    'useLocalStorage',
    'useSessionStorage',
    'useBroadcastChannel',
    'createFetch',
    'useFetch',
    'useWebSocket',
    'useEventSource',
    'useColorMode',
    'useDark',
  ])
  const motionEffectHelpers =
    /^(?:use(?:EventListener|Timeout.*|Interval.*|RafFn|Now|Timestamp|Countdown|Fps|Idle|ResizeObserver|MutationObserver|IntersectionObserver|PerformanceObserver|Element.*|Window.*|Mouse.*|Pointer.*|Scroll|Draggable|Swipe)|onClickOutside|onKey(?:Stroke|Down|Up|Pressed))$/u

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === '@vueuse/core'
    ) {
      const clause = node.importClause
      const bindings = clause?.namedBindings
      if (clause?.name !== undefined || bindings === undefined || !ts.isNamedImports(bindings)) {
        violations.push(`${displayPath}: VueUse requires explicit named public imports.`)
      } else if (clause?.phaseModifier !== ts.SyntaxKind.TypeKeyword) {
        for (const element of bindings.elements) {
          if (element.isTypeOnly) continue
          const importedName = (element.propertyName ?? element.name).text
          if (domainOwnedHelpers.has(importedName)) {
            violations.push(
              `${displayPath}: VueUse ${importedName} may not bypass the existing Storage, Network or Appearance owner; UI utility admission does not admit those effects.`,
            )
          }
          if (
            displayPath.startsWith(adminNavigationMotionPrivateDirectory) &&
            motionEffectHelpers.test(importedName)
          ) {
            violations.push(
              `${displayPath}: VueUse ${importedName} may not add independent listeners, timing, measurement or observers to the admitted Motion owner.`,
            )
          }
        }
      }
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === '@vueuse/core' &&
      !node.isTypeOnly &&
      (node.exportClause === undefined ||
        !ts.isNamedExports(node.exportClause) ||
        node.exportClause.elements.some((element) => !element.isTypeOnly))
    ) {
      violations.push(`${displayPath}: VueUse runtime re-exports may not hide utility ownership.`)
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments.some(
        (argument) => ts.isStringLiteral(argument) && argument.text === '@vueuse/core',
      )
    ) {
      violations.push(`${displayPath}: VueUse runtime loading requires explicit named imports.`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations
}

async function validateSourceImports(): Promise<string[]> {
  const workspaceDependencies = await Promise.all(
    projectConfig.workspaces.map(async (workspace) => {
      const manifest = await readJsonObject(resolve(rootDirectory, workspace.path, 'package.json'))
      const dependencies = manifest['dependencies']
      return {
        directory: `${resolve(rootDirectory, workspace.path)}${sep}`,
        dependencies: new Set(isJsonObject(dependencies) ? Object.keys(dependencies) : []),
      }
    }),
  )
  const roots = [
    resolve(rootDirectory, 'apps/web/src'),
    resolve(rootDirectory, 'packages/design-system/src'),
    resolve(rootDirectory, 'packages/ui/src'),
    resolve(rootDirectory, 'scripts'),
  ]
  const rootEntries = await readdir(rootDirectory, { withFileTypes: true })
  const rootConfigurationFiles = rootEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith('.config.ts') ||
          entry.name.endsWith('.config.mjs') ||
          entry.name === 'project.config.ts'),
    )
    .map((entry) => resolve(rootDirectory, entry.name))
  const sourceFiles = [
    ...(
      await Promise.all(roots.map((root) => collectSourceFiles(root, importSourceExtensions)))
    ).flat(),
    ...rootConfigurationFiles,
    resolve(rootDirectory, 'apps/web/vite.config.ts'),
    resolve(rootDirectory, 'apps/web/config.ts'),
  ]
  const violations: string[] = []

  for (const sourceFile of sourceFiles) {
    const sourceText = sourceTextForImports(sourceFile, await readFile(sourceFile, 'utf8'))
    const imports = ts.preProcessFile(sourceText, true, true).importedFiles
    const directDependencies =
      workspaceDependencies.find((workspace) => sourceFile.startsWith(workspace.directory))
        ?.dependencies ?? new Set<string>()

    for (const importedFile of imports) {
      violations.push(...inspectImport(sourceFile, importedFile.fileName, directDependencies))
    }
    if (imports.some((importedFile) => importedFile.fileName === '@vueuse/core')) {
      violations.push(...inspectVueUseOwnership(sourceFile, sourceText))
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
  const workbenchStylePath = resolve(rootDirectory, 'apps/web/src/app/workbench/workbench.css')
  // These existing application owners consume their private scales and native focus projection.
  const workbenchInternalVariables = new Set([
    '--ui-workbench-display-font-size',
    '--ui-workbench-specimen-minimum-inline-size',
    '--ui-workbench-specimen-preview-block-size',
    '--ui-workbench-api-content-block-size',
    '--ui-workbench-api-payload-block-size',
    '--ui-workbench-feedback-minimum-block-size',
    '--ui-workbench-motion-travel',
    '--ui-workbench-settings-navigator-inline-size',
    '--ui-admin-border-focus',
    '--ui-admin-focus-outline-offset',
  ])
  const violations: string[] = []

  for (const applicationFile of applicationFiles) {
    const sourceText = decodeUtf8Text(await readFile(applicationFile))
    const allowedInternalVariables =
      applicationFile === workbenchStylePath ? workbenchInternalVariables : new Set<string>()

    for (const referencedInternalVariable of internalCssVariables.filter((cssVariable) =>
      sourceText?.includes(cssVariable),
    )) {
      if (!allowedInternalVariables.has(referencedInternalVariable)) {
        violations.push(
          `${relative(rootDirectory, applicationFile)}: applications may not consume ui-internal token "${referencedInternalVariable}".`,
        )
      }
    }

    if (sourceText?.includes('--ui-theme-bank-')) {
      violations.push(
        `${relative(rootDirectory, applicationFile)}: applications may not enumerate private Theme Bank variables.`,
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

async function validateVueStyleGuardrails(): Promise<string[]> {
  const styleFiles = await collectSourceFiles(
    rootDirectory,
    new Set(['.vue', '.css', '.scss', '.sass']),
  )
  const violations: string[] = []
  const styleFilePaths = new Set(styleFiles.map((path) => relative(rootDirectory, path)))
  const baselineScopes = new Set<string>()
  const baselineDeclarations = new Set<string>()
  const scssSourceIdentity = (path: string, block: number, lang: string, scoped: boolean): string =>
    JSON.stringify([path, block, lang, scoped])
  const scssOwnerIdentities = new Set<string>()
  const scssSourceIdentities = new Map<string, number>()

  for (const owner of scssFallbackOwners) {
    const identity = scssSourceIdentity(owner.path, owner.block, owner.lang, owner.scoped)
    if (scssOwnerIdentities.has(identity)) {
      violations.push(`${owner.path}: SCSS fallback source identity has more than one owner.`)
    }
    scssOwnerIdentities.add(identity)
  }

  for (const group of ordinaryStyleDebt) {
    if (
      group.context.filter((context) => context.startsWith('@layer ')).length !== 1 ||
      !group.context.includes(
        group.path.startsWith('packages/ui/') ? '@layer components' : '@layer app',
      )
    ) {
      violations.push(`${group.path}: ordinary style debt must retain its explicit PAVP layer.`)
    }
    const scope = styleDeclarationKey({
      path: group.path,
      block: group.block,
      context: group.context,
      selector: group.selector,
      property: '',
      value: '',
      important: false,
    })
    if (!styleFilePaths.has(group.path)) {
      violations.push(`${group.path}: ordinary style-debt baseline source is unavailable.`)
    }
    if (group.declarations.length === 0) {
      violations.push(`${group.path}: ordinary style-debt baseline scope must own a declaration.`)
    }
    if (baselineScopes.has(scope)) {
      violations.push(`${group.path}: ordinary style-debt baseline scope is duplicated.`)
    }
    baselineScopes.add(scope)
    for (const [property, value, important] of group.declarations) {
      const declaration = styleDeclarationKey({
        path: group.path,
        block: group.block,
        context: group.context,
        selector: group.selector,
        property,
        value,
        important,
      })
      if (baselineDeclarations.has(declaration)) {
        violations.push(`${group.path}: ordinary style-debt declaration identity is duplicated.`)
      }
      baselineDeclarations.add(declaration)
    }
  }
  const compileStyle = (path: string, block: number, lang: string, source: string): string => {
    if (lang === 'css') return source
    const owner = scssFallbackOwners.find(
      (entry) => entry.path === path && entry.block === block && entry.lang === lang,
    )
    if (owner === undefined) throw new Error('Admitted style compiler owner is unavailable.')
    const requireCompiler = createRequire(resolve(rootDirectory, owner.manifestPath))
    const compiler = requireCompiler(owner.compiler) as {
      readonly compileString: (
        source: string,
        options: { readonly syntax: 'scss' | 'indented'; readonly style: 'expanded' },
      ) => { readonly css: string }
    }
    return compiler.compileString(source, {
      syntax: lang === 'sass' ? 'indented' : 'scss',
      style: 'expanded',
    }).css
  }
  const requireFromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
  const compiler = requireFromWeb('vue/compiler-sfc') as {
    readonly parse: (
      source: string,
      options: { readonly filename: string },
    ) => {
      readonly errors: readonly unknown[]
      readonly descriptor: {
        readonly styles: readonly {
          readonly content: string
          readonly scoped?: boolean
          readonly module?: string | boolean
          readonly lang?: string
          readonly src?: string
        }[]
      }
    }
  }

  for (const path of styleFiles) {
    const displayPath = relative(rootDirectory, path)
    if (extname(path) !== '.vue') {
      const source = await readFile(path, 'utf8')
      const language = extname(path).slice(1)
      if (language === 'scss' || language === 'sass') {
        const identity = scssSourceIdentity(displayPath, 0, language, true)
        scssSourceIdentities.set(identity, (scssSourceIdentities.get(identity) ?? 0) + 1)
      }
      const admission = styleSourceAdmission({
        path: displayPath,
        block: 0,
        lang: language,
        scoped: true,
        content: source,
      })
      violations.push(...admission.map((message) => `${displayPath}: ${message}`))
      if (admission.length === 0) {
        if (language === 'css' && generatedStyleOwners.some((owner) => owner.path === displayPath))
          continue
        const compiledCss = compileStyle(
          displayPath,
          0,
          extname(path).slice(1),
          await readFile(path, 'utf8'),
        )
        if (language === 'scss' || language === 'sass') {
          const owner = scssFallbackOwners.find(
            (entry) => entry.path === displayPath && entry.block === 0 && entry.lang === language,
          )
          if (owner === undefined) throw new Error('Admitted SCSS fallback owner is unavailable.')
          violations.push(...validateScssFallbackOutputContract(owner, compiledCss))
        }
        const result = await stylelint.lint({
          code: compiledCss,
          codeFilename: path,
          configFile: resolve(rootDirectory, 'stylelint.config.mjs'),
          cwd: rootDirectory,
          quietDeprecationWarnings: true,
        })
        for (const entry of result.results)
          for (const warning of entry.warnings) {
            violations.push(`${displayPath}: ${warning.text} (${warning.rule}).`)
          }
      }
      continue
    }
    const parsed = compiler.parse(await readFile(path, 'utf8'), { filename: path })
    if (parsed.errors.length > 0) {
      violations.push(`${displayPath}: invalid Vue SFC; style ownership could not be established.`)
      continue
    }
    const blocks = parsed.descriptor.styles

    for (const [index, block] of blocks.entries()) {
      const language = block.lang ?? 'css'
      if (language === 'scss' || language === 'sass') {
        const identity = scssSourceIdentity(displayPath, index, language, block.scoped === true)
        scssSourceIdentities.set(identity, (scssSourceIdentities.get(identity) ?? 0) + 1)
      }
      const admission = styleSourceAdmission({
        path: displayPath,
        block: index,
        lang: language,
        scoped: block.scoped === true,
        ...(block.module === undefined ? {} : { module: block.module }),
        ...(block.src === undefined ? {} : { src: block.src }),
        content: block.content,
      })
      if (admission.length > 0) {
        violations.push(
          ...admission.map((message) => `${displayPath} <style ${String(index + 1)}>: ${message}`),
        )
        continue
      }
      const compiledCss = compileStyle(displayPath, index, block.lang ?? 'css', block.content)
      if (language === 'scss' || language === 'sass') {
        const owner = scssFallbackOwners.find(
          (entry) =>
            entry.path === displayPath &&
            entry.block === index &&
            entry.lang === language &&
            entry.scoped === (block.scoped === true),
        )
        if (owner === undefined) throw new Error('Admitted SCSS fallback owner is unavailable.')
        violations.push(...validateScssFallbackOutputContract(owner, compiledCss))
      }
      const result = await stylelint.lint({
        code: compiledCss,
        codeFilename: `${path}.style-${String(index + 1)}.css`,
        configFile: resolve(rootDirectory, 'stylelint.config.mjs'),
        cwd: rootDirectory,
        quietDeprecationWarnings: true,
      })

      for (const lintResult of result.results) {
        for (const warning of lintResult.warnings) {
          violations.push(
            `${displayPath} <style ${String(index + 1)}>: ${warning.text} (${warning.rule}).`,
          )
        }
      }
    }
  }

  for (const owner of scssFallbackOwners) {
    const identity = scssSourceIdentity(owner.path, owner.block, owner.lang, owner.scoped)
    if (scssSourceIdentities.get(identity) !== 1) {
      violations.push(`${owner.path}: SCSS fallback owner must match exactly one source block.`)
    }
  }

  return violations
}

async function validateNativeCssCascade(): Promise<string[]> {
  interface CssNode {
    readonly type: string
    readonly name?: string
    readonly params?: string
    readonly nodes?: readonly CssNode[]
  }
  const { parse } = createRequire(import.meta.resolve('stylelint'))('postcss') as {
    readonly parse: (css: string) => CssNode
  }
  const names = ['reset', 'tokens', 'base', 'components', 'app', 'utilities', 'vendor-overrides']
  const violations: string[] = []
  const firstLayerNode = (node: CssNode): CssNode | undefined => {
    if (node.type === 'atrule' && node.name === 'layer') return node
    for (const child of node.nodes ?? []) {
      const found = firstLayerNode(child)
      if (found !== undefined) return found
    }
    return undefined
  }
  for (const path of [
    'apps/web/src/app/styles/layers.css',
    'packages/design-system/src/generated/tokens.css',
    'packages/design-system/src/generated/critical-theme.css',
  ]) {
    const firstLayer = firstLayerNode(parse(await readFile(resolve(rootDirectory, path), 'utf8')))
    if (
      firstLayer?.nodes !== undefined ||
      firstLayer?.params
        ?.split(',')
        .map((name) => name.trim())
        .join(',') !== names.join(',')
    )
      violations.push(`${path}: the first layer statement must establish the seven-layer order.`)
  }
  const unoLayerViolations = (css: string, expected: string): string[] => {
    const errors: string[] = []
    const visit = (node: CssNode, layer?: string): void => {
      let current = layer
      if (node.type === 'atrule' && node.name === 'layer') {
        if (layer !== undefined || node.params !== expected || node.nodes === undefined)
          errors.push('unexpected, nested or anonymous UnoCSS layer')
        current = node.params
      }
      if ((node.type === 'rule' || node.name === 'property') && current !== expected)
        errors.push('UnoCSS rule/property escaped its native owner')
      for (const child of node.nodes ?? []) visit(child, current)
    }
    visit(parse(css))
    return errors
  }
  const [{ createGenerator }, { default: config }] = await Promise.all([
    import('unocss'),
    import('../../uno.config'),
  ])
  const output = await (
    await createGenerator(config)
  ).generate('flex grid i-lucide-check bg-surface-page shadow-control')
  const expectedLayers: Readonly<Record<string, string>> = {
    base: 'reset',
    properties: 'tokens',
    theme: 'tokens',
    icons: 'utilities',
    default: 'utilities',
    shortcuts: 'utilities',
  }
  for (const internal of output.layers) {
    const expected = expectedLayers[internal]
    if (expected === undefined) violations.push(`UnoCSS internal layer has no owner: ${internal}`)
    else
      violations.push(
        ...unoLayerViolations(output.getLayer(internal) ?? '', expected).map(
          (message) => `${internal}: ${message}`,
        ),
      )
  }
  const prelude = parse(output.css).nodes?.find(
    (node) => node.type === 'atrule' && node.name === 'layer',
  )
  const emittedNames = [...new Set(prelude?.params?.split(',').map((name) => name.trim()))]
  if (prelude?.nodes !== undefined || emittedNames.join(',') !== 'reset,tokens,utilities')
    violations.push('UnoCSS native prelude must respect reset, tokens, utilities order.')
  if (unoLayerViolations('@layer utilities {.flex {display:flex}}', 'utilities').length !== 0)
    throw new Error('Native UnoCSS layer positive probe failed.')
  for (const css of [
    '.flex {display:flex}',
    '@layer default {.flex {display:flex}}',
    '@layer tokens {.flex {display:flex}}',
    '@layer utilities {@layer utilities {.flex {display:flex}}}',
  ])
    if (unoLayerViolations(css, 'utilities').length === 0)
      throw new Error('Native UnoCSS layer negative probe failed.')
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
  const configuredRegistryStorageKey = applicationConfig.appearance.customThemeRegistryStorageKey

  if (storageKeyMatches.length !== 1 || storageKeyMatches[0]?.[1] !== configuredStorageKey) {
    violations.push(
      'apps/web/index.html: the first-paint script storage key must exactly match the application-owned configuration.',
    )
  }

  if (
    appearanceInit.includes(configuredStorageKey) ||
    appearanceInit.includes(configuredRegistryStorageKey)
  ) {
    violations.push(
      'packages/design-system/src/generated/appearance-init.js: generated initialization must remain application-storage-key-agnostic.',
    )
  }

  const registryStorageKeyMatches = [
    ...indexHtml.matchAll(/\bdata-theme-registry-storage-key="([^"]*)"/gu),
  ]

  if (
    registryStorageKeyMatches.length !== 1 ||
    registryStorageKeyMatches[0]?.[1] !== configuredRegistryStorageKey
  ) {
    violations.push(
      'apps/web/index.html: the Custom Theme Registry storage key must exactly match application configuration.',
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
    'data-theme-kind="built-in"',
    'data-theme="royal-iris"',
    'data-contrast="standard"',
    'data-density="comfortable"',
    'data-material="solid"',
    'data-motion="full"',
  ]

  if (baselineAttributes.some((attribute) => !indexHtml.includes(attribute))) {
    violations.push(
      'apps/web/index.html: Royal Iris/Light/Standard/Comfortable/Solid baseline attributes are incomplete.',
    )
  }

  if (
    !viteConfiguration.includes('appearance-init.js') ||
    !viteConfiguration.includes('critical-theme.css') ||
    !viteConfiguration.includes('applicationConfig.appearance.preferenceStorageKey') ||
    !viteConfiguration.includes('applicationConfig.appearance.customThemeRegistryStorageKey')
  ) {
    violations.push(
      'apps/web/vite.config.ts: generated first-paint asset and application configuration wiring is incomplete.',
    )
  }

  return violations
}

export async function validateRouteTransitionBoundaryContract(): Promise<string[]> {
  const transitionDirectory = resolve(rootDirectory, 'apps/web/src/app/router/route-transition')
  const [
    boundarySource,
    coordinatorSource,
    cssSource,
    layersSource,
    lifecycleSource,
    registrySource,
    routeTransitionTypesSource,
    shellSource,
    uiPublicSource,
    settingsPageSource,
  ] = await Promise.all([
    readFile(resolve(transitionDirectory, 'route-transition-boundary-registry.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition-coordinator.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition.css'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/styles/layers.css'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/router/router-lifecycle.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/router/route-registry.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition-types.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/components/UiAdminShell.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/src/index.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/pages/control-center.vue'), 'utf8'),
  ])
  const violations: string[] = []
  const exactTarget = '[data-scroll-owner="architecture-console-content"]'
  const targetOwnerCount = [
    ...shellSource.matchAll(/:data-scroll-owner="[^"]*'architecture-console-content'[^"]*"/gu),
  ].length
  const transitionNameCount = [...cssSource.matchAll(/view-transition-name:\s*root/gu)].length
  const brokerStart = lifecycleSource.indexOf('type RouterPresentationCommitOutcome')
  const brokerEnd = lifecycleSource.indexOf('export interface RouterLifecycleHandle')
  const brokerSource =
    brokerStart === -1 || brokerEnd === -1 ? '' : lifecycleSource.slice(brokerStart, brokerEnd)

  if (
    targetOwnerCount !== 1 ||
    [...settingsPageSource.matchAll(/\bdata-scroll-owner="architecture-console-content"/gu)]
      .length !== 0 ||
    !boundarySource.includes(`target: '${exactTarget}'`) ||
    !boundarySource.includes("viewTransitionName: 'root'")
  ) {
    violations.push(
      'Route Transition must retain one exact architecture-console-content boundary registry owner.',
    )
  }
  if (
    transitionNameCount !== 1 ||
    !cssSource.includes(
      "[data-scroll-owner='architecture-console-content'] {\n    view-transition-name: root;",
    ) ||
    cssSource.includes(':root {\n    view-transition-name: none;') ||
    shellSource.includes('view-transition-name')
  ) {
    violations.push(
      'Route Transition snapshot naming must remain on the sole content boundary as the element-scoped root with persistent Shell regions unnamed.',
    )
  }
  if (
    !coordinatorSource.includes('document.querySelectorAll(boundary.target)') ||
    !coordinatorSource.includes("closest<HTMLElement>(shellSelector)?.dataset['layoutProfile']") ||
    /getBoundingClientRect|offset(?:Width|Height)|client(?:Width|Height)|ResizeObserver|MutationObserver|requestAnimationFrame|setTimeout|setInterval|addEventListener/u.test(
      coordinatorSource,
    )
  ) {
    violations.push(
      'Route Transition boundary validation must use the exact selector count, connected element identity and existing Shell layout profile.',
    )
  }
  if (
    !layersSource.includes("@import '../router/route-transition/route-transition.css';") ||
    /\bimport\s*\(/u.test(coordinatorSource)
  ) {
    violations.push(
      'Route Transition CSS and runtime must remain in the synchronous application closure.',
    )
  }
  if (
    !brokerSource.includes(
      'const routerPresentationCommitBrokers = new WeakMap<Router, RouterPresentationCommitBroker>()',
    ) ||
    !brokerSource.includes('export function reserveRouterPresentationCommit') ||
    !brokerSource.includes('routeName === reservation.expectedRouteName') ||
    !brokerSource.includes('navigation.fullPath === reservation.expectedFullPath') ||
    !/import\s*\{[^}]*\breserveRouterPresentationCommit\b[^}]*\}\s*from '\.\.\/router-lifecycle'/u.test(
      coordinatorSource,
    ) ||
    !brokerSource.includes('reservation.navigationId === navigationId') ||
    !coordinatorSource.includes('navigationId: request.navigationId') ||
    !coordinatorSource.includes('await reservation.completion') ||
    routeTransitionTypesSource.includes('RouterPresentationCommit') ||
    registrySource.includes('RouterPresentationCommit') ||
    uiPublicSource.includes('RouterPresentationCommit')
  ) {
    violations.push(
      'Router Presentation Commit must remain one private per-Router exact-navigation boundary consumed only by the coordinator.',
    )
  }
  if (
    /\.focus\s*\(|scroll(?:IntoView|To)|scrollTop|scrollLeft|scrollingElement|document\.title\s*=/u.test(
      coordinatorSource,
    ) ||
    /requestAnimationFrame|requestIdleCallback|setTimeout|setInterval|ResizeObserver|MutationObserver|addEventListener/u.test(
      brokerSource + coordinatorSource,
    )
  ) {
    violations.push(
      'The Route Transition coordinator may only await Router presentation work without acquiring presentation or timing authority.',
    )
  }
  if (
    !lifecycleSource.includes("controller.scrollTo({ ...position, behavior: 'instant' })") ||
    !lifecycleSource.includes('writeRegionFragment(controller, hash)') ||
    /owner\.scroll(?:Left|Top)\s*=/u.test(lifecycleSource) ||
    lifecycleSource.indexOf('resolveBoundRouterPresentationCommit(presentationCommitBroker, to)') <
      lifecycleSource.lastIndexOf('writeRegionPosition(controller,')
  ) {
    violations.push(
      'Router Presentation Commit must resolve only after the existing final inline and block region scroll writes.',
    )
  }

  return violations
}

async function validateDashboardWorldTime(worldTime: UapiWorldTime): Promise<boolean> {
  const fromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
  const vue = fromWeb('vue') as typeof VueRuntime
  const compiler = fromWeb('vue/compiler-sfc') as typeof VueSfc
  const source = await readFile(resolve(rootDirectory, 'apps/web/src/pages/dashboard.vue'), 'utf8')
  const { descriptor } = compiler.parse(source)
  const component = compiler.compileScript(descriptor, {
    id: 'dashboard-request-probe',
    inlineTemplate: true,
  })
  const compiled = ts.transpileModule(component.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const calls: { url: URL; input: RequestInit }[] = []
  const wrapper = vue.defineComponent({
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      return () => vue.h('div', attrs, [slots['actions']?.(), slots['default']?.()])
    },
  })
  const button = vue.defineComponent({
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      return () => vue.h('button', attrs, slots['default']?.())
    },
  })
  const radioGroup = vue.defineComponent({
    inheritAttrs: false,
    emits: ['update:value'],
    setup(_props, { emit }) {
      return () =>
        vue.h(
          'button',
          {
            onClick: () => {
              emit('update:value', 'overview')
            },
          },
          'open-dashboard-overview',
        )
    },
  })
  const mocks: Readonly<Record<string, unknown>> = {
    vue,
    '@platform/ui': {
      UiScrollArea: wrapper,
      UiStatusBadge: wrapper,
      formatUiDateTime,
      useUiDateTime: () =>
        vue.computed(() => ({ locale: 'zh-CN', timeZone: 'Asia/Shanghai', hourCycle: 'h23' })),
    },
    'naive-ui/es/button': { NButton: button },
    'naive-ui/es/card': { NCard: wrapper },
    '@platform/design-system': { builtInAppearanceThemePreviews: [] },
    '../shared/i18n': {
      useConsoleI18n: () => ({ t: (key: string) => key, locale: vue.ref('zh-CN') }),
    },
    '../shared/api': {
      createApiClient: (input: ApiCore.ApiClientInput) =>
        createApiClient({
          ...input,
          fetch: (url, request) => {
            calls.push({ url, input: request })
            return Promise.resolve(
              new Response(JSON.stringify(worldTime), {
                headers: { 'content-type': 'application/json' },
              }),
            )
          },
        }),
    },
    '../app/api/api-read-boundary': {
      useApiReadBoundary: () => ({
        configured: true,
        configuration: { status: 'configured', baseUrl: 'https://transport.invalid/base/' },
      }),
    },
    '../shared/services/uapi-world-time': { readUapiWorldTime },
    '../app/appearance/appearance-read-boundary': {
      useAppearanceReadBoundary: () => ({
        snapshot: vue.shallowRef({ theme: { themeId: 'probe' }, motion: 'none' }),
      }),
    },
    '../app/router/application-navigation': {
      useApplicationNavigation: () => ({ resolveHref: () => '/' }),
      useApplicationLinkActivation: () => () => undefined,
    },
    '../app/router/route-input': { registeredRouteDestination: (value: unknown) => value },
    '../app/workbench/WorkbenchPage.vue': wrapper,
    '../app/workbench/dashboard/DashboardComposer.vue': wrapper,
    '../app/router/router-scroll-controller': { routerScrollControllerKey: Symbol('test-scroll') },
    'naive-ui/es/radio': { NRadioGroup: radioGroup, NRadioButton: wrapper },
  }
  const module = { exports: {} as { default?: VueRuntime.Component } }
  runInNewContext(compiled, {
    AbortController,
    exports: module.exports,
    module,
    require: (name: string): unknown => {
      if (!Object.hasOwn(mocks, name)) throw new Error(`Unexpected dashboard dependency: ${name}`)
      return mocks[name]
    },
  })
  if (module.exports.default === undefined) return false

  interface ProbeNode {
    readonly tag: string
    text: string
    readonly props: Record<string, unknown>
    readonly children: ProbeNode[]
    parent: ProbeNode | null
    readonly style: { display: string }
  }
  const node = (tag: string, text = ''): ProbeNode => ({
    tag,
    text,
    props: {},
    children: [],
    parent: null,
    style: { display: '' },
  })
  const renderer = vue.createRenderer<ProbeNode, ProbeNode>({
    createElement: (tag) => node(tag),
    createText: (text) => node('#text', text),
    createComment: (text) => node('#comment', text),
    setText: (element, text) => {
      element.text = text
    },
    setElementText: (element, text) => {
      element.text = text
      element.children.length = 0
    },
    insert: (element, parent, anchor) => {
      if (element.parent !== null) {
        const previousIndex = element.parent.children.indexOf(element)
        if (previousIndex >= 0) element.parent.children.splice(previousIndex, 1)
      }
      const index = anchor === null || anchor === undefined ? -1 : parent.children.indexOf(anchor)
      parent.children.splice(index < 0 ? parent.children.length : index, 0, element)
      element.parent = parent
    },
    remove: (element) => {
      if (element.parent === null) return
      const index = element.parent.children.indexOf(element)
      if (index >= 0) element.parent.children.splice(index, 1)
      element.parent = null
    },
    parentNode: (element) => element.parent,
    nextSibling: (element) =>
      element.parent?.children[element.parent.children.indexOf(element) + 1] ?? null,
    patchProp: (element, key, _previous, value) => {
      element.props[key] = value
      if (key === 'textContent') {
        element.text = String(value ?? '')
        element.children.length = 0
      }
    },
  })
  const root = node('root')
  const app = renderer.createApp(module.exports.default, { title: 'Dashboard', message: 'Probe' })
  const children = (element: ProbeNode): ProbeNode[] => [
    element,
    ...element.children.flatMap(children),
  ]
  const text = (element: ProbeNode): string => element.text + element.children.map(text).join('')
  try {
    app.mount(root)
    const overviewButton = children(root).find(
      (element) => text(element) === 'open-dashboard-overview' && element.tag === 'button',
    )
    const openOverview = overviewButton?.props['onClick'] as (() => void) | undefined
    if (typeof openOverview !== 'function') return false
    openOverview()
    await vue.nextTick()
    const requestButton = children(root).find(
      (element) => element.tag === 'button' && text(element).includes('workbench.request'),
    )
    const click = requestButton?.props['onClick'] as (() => void) | undefined
    const callsBeforeClick = calls.length
    if (typeof click !== 'function') return false
    click()
    await new Promise<void>((resolveTurn) => setImmediate(resolveTurn))
    await vue.nextTick()
    const request = calls[0]
    return (
      callsBeforeClick === 0 &&
      calls.length === 1 &&
      request?.input.method === 'GET' &&
      request.url.pathname === '/base/v1/misc/worldtime' &&
      request.url.searchParams.get('city') === 'Asia/Shanghai' &&
      text(root).includes('workbench.api.success')
    )
  } finally {
    app.unmount()
  }
}

export async function validateApiTransport(): Promise<readonly string[]> {
  const violations: string[] = []
  const expect = (condition: boolean, label: string): void => {
    if (!condition) violations.push(`HTTP transport: ${label}`)
  }
  const category = (result: ApiResult<unknown, unknown>): string =>
    result.status === 'failure' ? result.error.category : result.status
  const eslint = new ESLint()
  for (const [source, rejected] of [
    ["void fetch('/api/value')", true],
    ["void window.fetch('/api/value')", true],
    ["void window['fetch']('/api/value')", true],
    ["void self.fetch('/api/value')", true],
    ["void globalThis['fetch']('/api/value')", true],
    ['new XMLHttpRequest()', true],
    ["function local(fetch) { return fetch('value') }", false],
    ["function local(window) { return window.fetch('value') }", false],
    ['const record = { fetch() {} }; record.fetch()', false],
  ] as const) {
    const messages =
      (
        await eslint.lintText(source, {
          filePath: resolve(rootDirectory, 'apps/web/src/app/router/route-input.ts'),
        })
      )[0]?.messages ?? []
    expect(
      messages.some((message) => message.ruleId === 'no-restricted-globals') === rejected,
      'native request ownership respects lexical scope',
    )
  }
  const configuration = {
    status: 'configured',
    baseUrl: 'https://transport.invalid/base/',
  } as const
  const endpoint: ApiEndpoint<string> = {
    id: 'verification.request',
    method: 'GET',
    path: ['records', 'a b%'],
    policy: 'standard',
    authentication: 'anonymous',
    response: {
      mode: 'json',
      mimeTypes: ['application/json'],
      schema: coreRuntimeConfigurationSchema.shape.buildVersion,
    },
  }
  const signal = new AbortController().signal
  const calls: { url: URL; input: RequestInit }[] = []
  const successful: ApiFetch = (url, input) => {
    calls.push({ url, input })
    return Promise.resolve(
      new Response('"0.0.0"', { headers: { 'content-type': 'application/json' } }),
    )
  }
  const client = createApiClient({
    configuration,
    fetch: successful,
    authorize: () => Promise.reject(new Error('Anonymous authorization must not run.')),
  })
  const baselineTimers = process
    .getActiveResourcesInfo()
    .filter((value) => value === 'Timeout').length
  const result = await client.request(endpoint, {
    signal,
    query: { q: 'a&b /', repeated: [1, false], omitted: undefined },
  })
  expect(result.status === 'success' && result.data === '0.0.0', 'validated JSON response')
  expect(
    calls.length === 1 &&
      calls[0]?.url.pathname === '/base/records/a%20b%25' &&
      calls[0].url.searchParams.get('q') === 'a&b /' &&
      calls[0].url.searchParams.getAll('repeated').join(',') === '1,false',
    'one attempt and single URL/query encoding',
  )
  expect(
    calls[0]?.input.credentials === 'omit' &&
      calls[0].input.redirect === 'error' &&
      calls[0].input.cache === 'no-store' &&
      calls[0].input.referrerPolicy === 'no-referrer',
    'anonymous credential/cache/redirect policy',
  )
  expect(
    getEventListeners(signal, 'abort').length === 0 &&
      process.getActiveResourcesInfo().filter((value) => value === 'Timeout').length ===
        baselineTimers,
    'success releases caller listener and timer',
  )
  for (const path of [['..'], ['/escape'], ['a\\b']]) {
    expect(
      category(await client.request({ ...endpoint, path }, { signal })) === 'request',
      'reject path traversal/separators',
    )
  }
  expect(calls.length === 1, 'invalid paths never execute fetch')
  expect(
    category(
      await client.request(endpoint, {
        signal,
        headers: { authorization: 'private-verification-value' },
      }),
    ) === 'request',
    'caller headers cannot bypass authorization',
  )
  const beforeCancelled = new AbortController()
  beforeCancelled.abort()
  expect(
    category(await client.request(endpoint, { signal: beforeCancelled.signal })) ===
      'caller-abort' && calls.length === 1,
    'pre-cancelled request executes no fetch',
  )
  expect(
    category(
      await createApiClient({
        configuration: { status: 'unconfigured' },
        fetch: successful,
      }).request(endpoint, { signal }),
    ) === 'configuration',
    'explicitly unconfigured API',
  )
  for (const value of [
    'http://transport.invalid/',
    'https://user:password@transport.invalid/',
    'https://transport.invalid/?key=value',
    'https://transport.invalid/#part',
    'https://transport.invalid',
    ' https://transport.invalid/',
  ]) {
    expect(!apiBaseUrlSchema.safeParse(value).success, 'reject unsafe or noncanonical base URL')
  }
  const post = await client.request(
    { ...endpoint, method: 'POST' },
    { signal, body: { kind: 'json', value: { label: 'value' } } },
  )
  expect(
    post.status === 'success' &&
      calls[1]?.input.body === '{"label":"value"}' &&
      new Headers(calls[1].input.headers).get('content-type') === 'application/json',
    'JSON body encoding',
  )
  const form = new FormData()
  form.set('field', 'value')
  await client.request(
    { ...endpoint, method: 'POST' },
    { signal, body: { kind: 'native', value: form } },
  )
  expect(
    calls[2]?.input.body instanceof FormData &&
      calls[2].input.body.get('field') === 'value' &&
      !new Headers(calls[2].input.headers).has('content-type'),
    'native FormData values and multipart boundary',
  )
  const probe = (response: () => Response) =>
    createApiClient({ configuration, fetch: () => Promise.resolve(response()) })
  for (const [body, mime, expected] of [
    ['{', 'application/json', 'parse'],
    ['12', 'application/json', 'schema'],
    ['"0.0.0"', 'text/html', 'protocol'],
  ] as const) {
    expect(
      category(
        await probe(() => new Response(body, { headers: { 'content-type': mime } })).request(
          endpoint,
          { signal },
        ),
      ) === expected,
      `distinct ${expected} failure`,
    )
  }
  expect(
    category(
      await probe(
        () => new Response(null, { status: 429, headers: { 'retry-after': '3' } }),
      ).request(endpoint, { signal }),
    ) === 'http',
    'non-success status is HTTP failure',
  )
  const limited = await probe(
    () => new Response(null, { status: 429, headers: { 'retry-after': '3' } }),
  ).request(endpoint, { signal })
  expect(
    limited.status === 'failure' && limited.error.retryAfterSeconds === 3,
    'bounded rate-limit hint without retry',
  )
  const secret = 'private-response-verification-value'
  const invalidError = await probe(
    () =>
      new Response(JSON.stringify(secret), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
  ).request({ ...endpoint, errorSchema: apiBaseUrlSchema }, { signal })
  expect(
    category(invalidError) === 'schema' && !JSON.stringify(invalidError).includes(secret),
    'unvalidated error body is absent',
  )
  const network = await createApiClient({
    configuration,
    fetch: () => Promise.reject(new Error(secret)),
  }).request(endpoint, { signal })
  expect(
    category(network) === 'network' && !JSON.stringify(network).includes(secret),
    'network cause is redacted',
  )
  const emptyEndpoint = {
    ...endpoint,
    response: {
      mode: 'empty' as const,
      mimeTypes: [],
      schema: coreRuntimeConfigurationSchema.shape.buildVersion.optional(),
    },
  }
  for (const headers of [
    new Headers(),
    new Headers({ 'content-type': 'application/json' }),
    new Headers({
      'content-type': 'application/json',
      'content-length': String(apiRequestPolicies.standard.maximumResponseBytes + 1),
    }),
  ]) {
    for (const declaredErrorSchema of [false, true]) {
      let attempts = 0
      const notModified = await createApiClient({
        configuration,
        fetch: (_url, input) => {
          attempts += 1
          expect(
            new Headers(input.headers).get('if-none-match') === '"in-memory-etag"' &&
              input.cache === 'no-store',
            'conditional request preserves its header and no-store policy',
          )
          return Promise.resolve(new Response(null, { status: 304, headers }))
        },
      }).request(
        { ...endpoint, ...(declaredErrorSchema ? { errorSchema: apiBaseUrlSchema } : {}) },
        { signal, headers: { 'if-none-match': '"in-memory-etag"' } },
      )
      expect(
        notModified.status === 'failure' &&
          notModified.error.category === 'http' &&
          notModified.error.httpStatus === 304 &&
          notModified.error.data === undefined &&
          attempts === 1 &&
          getEventListeners(signal, 'abort').length === 0,
        '304 remains HTTP without parsing a prohibited body or introducing cache/retry behavior',
      )
    }
  }
  expect(
    category(
      await probe(
        () => new Response(null, { status: 400, headers: { 'content-type': 'application/json' } }),
      ).request({ ...endpoint, errorSchema: apiBaseUrlSchema }, { signal }),
    ) === 'parse',
    'an absent declared JSON error body on ordinary HTTP errors still fails parsing',
  )
  for (const status of [401, 404]) {
    for (const declaredErrorSchema of [false, true]) {
      const head = await probe(
        () =>
          new Response(null, {
            status,
            headers: status === 404 ? { 'content-type': 'application/json' } : {},
          }),
      ).request(
        {
          ...emptyEndpoint,
          method: 'HEAD',
          ...(declaredErrorSchema ? { errorSchema: apiBaseUrlSchema } : {}),
        },
        { signal },
      )
      expect(
        head.status === 'failure' &&
          head.error.category === 'http' &&
          head.error.httpStatus === status &&
          head.error.data === undefined,
        'HEAD preserves HTTP errors without parsing absent bodies',
      )
    }
  }
  expect(
    (
      await probe(() => new Response(null)).request(
        { ...emptyEndpoint, method: 'HEAD' },
        { signal },
      )
    ).status === 'success',
    'successful HEAD retains empty response validation',
  )
  expect(
    (await probe(() => new Response(null, { status: 204 })).request(emptyEndpoint, { signal }))
      .status === 'success',
    '204 empty mode',
  )
  expect(
    category(
      await probe(() => new Response(null, { status: 204 })).request(endpoint, { signal }),
    ) === 'protocol',
    '204 cannot be parsed as JSON',
  )
  expect(
    (
      await probe(
        () =>
          new Response('"0.0.0"', { status: 202, headers: { 'content-type': 'application/json' } }),
      ).request(endpoint, { signal })
    ).status === 'accepted',
    '202 is explicitly accepted',
  )
  expect(
    (
      await probe(
        () => new Response('0.0.0', { headers: { 'content-type': 'text/plain' } }),
      ).request(
        {
          ...endpoint,
          response: { ...endpoint.response, mode: 'text', mimeTypes: ['text/plain'] },
        },
        { signal },
      )
    ).status === 'success',
    'text mode',
  )
  const applicationZod = createRequire(resolve(rootDirectory, 'apps/web/package.json'))('zod') as {
    custom<Value>(predicate: (value: unknown) => boolean): ApiEndpoint<Value>['response']['schema']
  }
  for (const mode of ['blob', 'array-buffer'] as const) {
    const schema = applicationZod.custom<Blob | ArrayBuffer>((value) =>
      mode === 'blob' ? value instanceof Blob : value instanceof ArrayBuffer,
    )
    expect(
      (
        await probe(
          () => new Response('binary', { headers: { 'content-type': 'application/octet-stream' } }),
        ).request(
          { ...endpoint, response: { mode, mimeTypes: ['application/octet-stream'], schema } },
          { signal },
        )
      ).status === 'success',
      `${mode} is validated`,
    )
    const binary = await probe(
      () =>
        new Response(new Uint8Array([0xe9, 0xff]), {
          headers: { 'content-type': 'text/csv; charset=iso-8859-1' },
        }),
    ).request({ ...endpoint, response: { mode, mimeTypes: ['text/csv'], schema } }, { signal })
    expect(binary.status === 'success', `${mode} does not decode binary charsets`)
    if (binary.status === 'success') {
      const bytes = new Uint8Array(
        binary.data instanceof Blob ? await binary.data.arrayBuffer() : binary.data,
      )
      expect(bytes[0] === 0xe9 && bytes[1] === 0xff, `${mode} preserves raw bytes`)
    }
  }
  expect(
    category(
      await probe(
        () =>
          new Response(new Uint8Array([0xe9]), {
            headers: { 'content-type': 'text/plain; charset=iso-8859-1' },
          }),
      ).request(
        {
          ...endpoint,
          response: { ...endpoint.response, mode: 'text', mimeTypes: ['text/plain'] },
        },
        { signal },
      ),
    ) === 'protocol',
    'text decoding retains its explicit UTF-8 contract',
  )
  let cancelledReader = false
  const oversized = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(apiRequestPolicies.standard.maximumResponseBytes + 1))
    },
    cancel() {
      cancelledReader = true
    },
  })
  expect(
    category(
      await probe(
        () => new Response(oversized, { headers: { 'content-type': 'application/json' } }),
      ).request(endpoint, { signal }),
    ) === 'protocol' && cancelledReader,
    'actual body byte limit cancels reader',
  )
  let started = (): void => undefined
  let deliverLateResponse: (response: Response) => void = () => undefined
  const deferredResponse = new Promise<Response>((resolveResponse) => {
    deliverLateResponse = resolveResponse
  })
  const networkStarted = new Promise<void>((resolveStarted) => {
    started = resolveStarted
  })
  const caller = new AbortController()
  const pending = createApiClient({
    configuration,
    fetch: async () => {
      started()
      return deferredResponse
    },
  }).request(endpoint, { signal: caller.signal })
  await networkStarted
  caller.abort()
  expect(
    category(await pending) === 'caller-abort' &&
      getEventListeners(caller.signal, 'abort').length === 0,
    'in-flight cancellation settles and releases caller',
  )
  let lateBodyCancelled = false
  deliverLateResponse(
    new Response(
      new ReadableStream({
        cancel() {
          lateBodyCancelled = true
        },
      }),
    ),
  )
  await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 0))
  expect(lateBodyCancelled, 'late fetch completion releases its response body')
  let authorizeStarted = (): void => undefined
  let finishAuthorization = (): void => undefined
  const authorizationStarted = new Promise<void>((resolveStarted) => {
    authorizeStarted = resolveStarted
  })
  const deferredAuthorization = new Promise<void>((resolveAuthorization) => {
    finishAuthorization = resolveAuthorization
  })
  const authorizationCaller = new AbortController()
  let afterAuthorizationFetches = 0
  const authorizing = createApiClient({
    configuration,
    authorize: async () => {
      authorizeStarted()
      await deferredAuthorization
      return { headers: {}, credentials: 'omit' }
    },
    fetch: () => {
      afterAuthorizationFetches += 1
      return Promise.resolve(new Response())
    },
  }).request({ ...endpoint, authentication: 'provided' }, { signal: authorizationCaller.signal })
  await authorizationStarted
  authorizationCaller.abort()
  expect(category(await authorizing) === 'caller-abort', 'authorization can be cancelled')
  finishAuthorization()
  await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 0))
  expect(
    afterAuthorizationFetches === 0 &&
      getEventListeners(authorizationCaller.signal, 'abort').length === 0,
    'late authorization cannot send a cancelled request',
  )
  const bodyCaller = new AbortController()
  let bodyStarted = (): void => undefined
  const bodyStart = new Promise<void>((resolveStarted) => {
    bodyStarted = resolveStarted
  })
  let readerCancelled = false
  const reading = createApiClient({
    configuration,
    fetch: () => {
      bodyStarted()
      return Promise.resolve(
        new Response(
          new ReadableStream({
            cancel() {
              readerCancelled = true
            },
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
      )
    },
  }).request(endpoint, { signal: bodyCaller.signal })
  await bodyStart
  await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 0))
  bodyCaller.abort()
  expect(
    category(await reading) === 'caller-abort' && readerCancelled,
    'body cancellation settles and releases its reader',
  )
  let schemaStarted = (): void => undefined
  let finishSchema = (): void => undefined
  const schemaStart = new Promise<void>((resolveStarted) => {
    schemaStarted = resolveStarted
  })
  const schemaWait = new Promise<void>((resolveSchema) => {
    finishSchema = resolveSchema
  })
  const schemaCaller = new AbortController()
  const asynchronousSchema = endpoint.response.schema.refine(async () => {
    schemaStarted()
    await schemaWait
    return true
  })
  const validating = client.request(
    { ...endpoint, response: { ...endpoint.response, schema: asynchronousSchema } },
    { signal: schemaCaller.signal },
  )
  await schemaStart
  schemaCaller.abort()
  expect(
    category(await validating) === 'caller-abort',
    'asynchronous schema validation can be cancelled',
  )
  finishSchema()
  const relative = createApiClient({
    configuration: { status: 'configured', baseUrl: '/api/' },
    origin: 'http://localhost:5174',
    fetch: successful,
  })
  expect(
    (await relative.request(endpoint, { signal })).status === 'success' &&
      calls.at(-1)?.url.origin === 'http://localhost:5174' &&
      calls.at(-1)?.url.pathname.startsWith('/api/') === true,
    'same-origin API base resolves against explicit site origin',
  )
  expect(
    category(
      await createApiClient({
        configuration: { status: 'configured', baseUrl: '/api/' },
        fetch: successful,
      }).request(endpoint, { signal }),
    ) === 'configuration',
    'relative API configuration needs an explicit origin',
  )
  const timeout = await createApiClient({
    configuration,
    fetch: async () => new Promise<Response>(() => undefined),
  }).request(endpoint, { signal })
  expect(
    category(timeout) === 'timeout' && getEventListeners(signal, 'abort').length === 0,
    'timeout is distinct and releases caller',
  )
  let authorizedFetches = 0
  const authorized = createApiClient({
    configuration,
    authorize: () =>
      Promise.resolve({
        headers: { authorization: 'private-verification-value' },
        credentials: 'omit',
      }),
    fetch: (_url, input) => {
      authorizedFetches += 1
      expect(
        new Headers(input.headers).get('authorization') === 'private-verification-value',
        'injected authorization is supplied once',
      )
      return Promise.resolve(
        new Response('"0.0.0"', { headers: { 'content-type': 'application/json' } }),
      )
    },
  })
  expect(
    (await authorized.request({ ...endpoint, authentication: 'provided' }, { signal })).status ===
      'success' && authorizedFetches === 1,
    'explicit injected authorization',
  )
  const mutableDefinition = {
    ...endpoint,
    path: [...endpoint.path],
    authentication: 'provided' as const,
    response: { ...endpoint.response, mimeTypes: [...endpoint.response.mimeTypes] },
  }
  let approvedMethod: string | undefined
  let sentMethod: string | undefined
  const snapshot = await createApiClient({
    configuration,
    authorize: ({ method }) => {
      approvedMethod = method
      mutableDefinition.method = 'DELETE'
      mutableDefinition.path[0] = '..'
      mutableDefinition.response.mode = 'text'
      mutableDefinition.response.mimeTypes[0] = 'text/plain'
      mutableDefinition.response.schema = apiBaseUrlSchema
      return Promise.resolve({ headers: {}, credentials: 'omit' })
    },
    fetch: (url, input) => {
      sentMethod = input.method
      expect(url.pathname.startsWith('/base/records/'), 'attempt retains its original path')
      return Promise.resolve(
        new Response('"0.0.0"', { headers: { 'content-type': 'application/json' } }),
      )
    },
  }).request(mutableDefinition, { signal })
  expect(
    snapshot.status === 'success' && approvedMethod === 'GET' && sentMethod === 'GET',
    'authorization and execution use one request-definition snapshot',
  )
  for (const errorResponse of [false, true]) {
    const definition = {
      ...endpoint,
      response: { ...endpoint.response },
      errorSchema: endpoint.response.schema,
    }
    const replaced = await createApiClient({
      configuration,
      fetch: () => {
        definition.response.schema = apiBaseUrlSchema
        definition.errorSchema = apiBaseUrlSchema
        return Promise.resolve(
          new Response('"https://transport.invalid/"', {
            status: errorResponse ? 400 : 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      },
    }).request(definition, { signal })
    expect(category(replaced) === 'schema', 'late success/error Schema replacement is ignored')
  }
  const mutableForm = new FormData()
  mutableForm.set('field', 'before')
  const mutableParameters = new URLSearchParams({ field: 'before' })
  const mutableBytes = new Uint8Array([1]).buffer
  for (const body of [mutableForm, mutableParameters, mutableBytes]) {
    const captured = await createApiClient({
      configuration,
      authorize: () => {
        if (body instanceof ArrayBuffer) new Uint8Array(body)[0] = 2
        else body.set('field', 'after')
        return Promise.resolve({ headers: {}, credentials: 'omit' })
      },
      fetch: (_url, input) => {
        expect(
          input.body instanceof ArrayBuffer
            ? new Uint8Array(input.body)[0] === 1
            : (input.body instanceof FormData || input.body instanceof URLSearchParams) &&
                input.body.get('field') === 'before',
          'mutable native body is fixed before authorization awaits',
        )
        return Promise.resolve(
          new Response('"0.0.0"', { headers: { 'content-type': 'application/json' } }),
        )
      },
    }).request(
      { ...endpoint, method: 'POST', authentication: 'provided' },
      { signal, body: { kind: 'native', value: body } },
    )
    expect(captured.status === 'success', 'native body snapshot succeeds')
  }
  let untrustedFetches = 0
  const proxied = {
    status: 'configured',
    baseUrl: '/api/',
    upstreamOrigin: 'https://transport.invalid',
  } as const
  for (const invalid of [
    { ...proxied, upstreamOrigin: 'http://transport.invalid' },
    { ...proxied, upstreamOrigin: 'https://transport.invalid/' },
    { ...proxied, upstreamOrigin: 'https://transport.invalid/path' },
    { ...proxied, upstreamOrigin: 'https://user@transport.invalid' },
    { ...proxied, baseUrl: 'https://transport.invalid/' },
  ]) {
    expect(
      category(
        await createApiClient({
          configuration: invalid,
          origin: 'http://localhost:5174',
          fetch: successful,
        }).request(endpoint, { signal }),
      ) === 'configuration',
      'proxy authentication metadata must be canonical and belong to a path-based API',
    )
  }
  const denied = await createApiClient({
    configuration: proxied,
    origin: 'http://localhost:5174',
    authorize: ({ origin }) => {
      expect(origin === proxied.upstreamOrigin, 'authorization sees the actual proxy recipient')
      throw new Error('The verification provider does not authorize this recipient.')
    },
    fetch: () => {
      untrustedFetches += 1
      return Promise.resolve(new Response())
    },
  }).request({ ...endpoint, authentication: 'provided' }, { signal })
  expect(
    category(denied) === 'authorization' && untrustedFetches === 0,
    'unapproved upstream receives no request or authentication data',
  )
  const trusted = await createApiClient({
    configuration: proxied,
    origin: 'http://localhost:5174',
    authorize: ({ origin }) => {
      if (origin !== proxied.upstreamOrigin) throw new Error('Unexpected recipient.')
      return Promise.resolve({ headers: { authorization: 'in-memory-only' }, credentials: 'omit' })
    },
    fetch: (url, input) => {
      expect(
        url.origin === 'http://localhost:5174' &&
          new Headers(input.headers).get('authorization') === 'in-memory-only',
        'explicit upstream approval permits the corresponding proxy request',
      )
      return Promise.resolve(
        new Response('"0.0.0"', { headers: { 'content-type': 'application/json' } }),
      )
    },
  }).request({ ...endpoint, authentication: 'provided' }, { signal })
  expect(trusted.status === 'success', 'trusted proxy authorization')
  const worldTime = {
    datetime: '2026-11-03T12:00:00+08:00',
    offset_seconds: 28800,
    offset_string: '+08:00',
    query: 'Asia/Shanghai',
    timestamp_unix: 1793678400,
    timezone: 'Asia/Shanghai',
    weekday: 'Tuesday',
  }
  expect(
    await validateDashboardWorldTime(worldTime),
    'dashboard requests Beijing using the documented IANA zone through the actual service',
  )
  expect(
    (
      await readUapiWorldTime(
        probe(
          () =>
            new Response(JSON.stringify(worldTime), {
              headers: { 'content-type': 'application/json' },
            }),
        ),
        'Asia/Shanghai',
        signal,
      )
    ).status === 'success',
    'actual service adapter validates documented fields',
  )
  expect(
    category(await readUapiWorldTime(client, '', signal)) === 'request',
    'service input boundary',
  )
  for (const body of [
    { error: 'TIMEZONE_NOT_FOUND', details: '' },
    { code: 'NOT_FOUND', message: 'The specified timezone was not found.' },
  ]) {
    const unavailable = await readUapiWorldTime(
      probe(
        () =>
          new Response(JSON.stringify(body), {
            status: 404,
            headers: { 'content-type': 'application/json' },
          }),
      ),
      'unknown-zone',
      signal,
    )
    expect(
      unavailable.status === 'failure' &&
        unavailable.error.category === 'http' &&
        unavailable.error.httpStatus === 404,
      'world-time service reports observed and documented provider errors as HTTP failures',
    )
  }
  const malformedWorldTimeError = await readUapiWorldTime(
    probe(
      () =>
        new Response(JSON.stringify({ error: 'invalid code!', details: 'private detail' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    ),
    'unknown-zone',
    signal,
  )
  expect(
    category(malformedWorldTimeError) === 'schema' &&
      !JSON.stringify(malformedWorldTimeError).includes('private detail'),
    'malformed world-time errors remain rejected and do not leak their body',
  )
  return violations
}

async function validateReadQueries(): Promise<readonly string[]> {
  const violations: string[] = []
  const expect = (condition: boolean, label: string): void => {
    if (!condition) violations.push(`Read Query: ${label}`)
  }
  // Load the actual application modules and Vue adapter in one module context.
  type Runtime = QueryCore.ApiQueryRuntime
  const fromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
  const query = fromWeb('./src/shared/query/index.ts') as typeof QueryCore
  const api = fromWeb('./src/shared/api/index.ts') as typeof ApiCore
  const service = fromWeb('./src/shared/services/uapi-world-time.ts') as typeof UapiService
  const official = fromWeb('@tanstack/vue-query') as {
    readonly QueryClient: new () => Runtime['queryClient']
    readonly CancelledError: new () => Error
    useQuery(
      options: unknown,
      client: Runtime['queryClient'],
    ): { readonly data: { readonly value: unknown } }
    readonly focusManager: { hasListeners(): boolean }
    readonly onlineManager: { hasListeners(): boolean }
  }
  const vue = fromWeb('vue') as typeof VueRuntime
  const runtimes: Runtime[] = []
  const scopes: ReturnType<typeof vue.effectScope>[] = []
  const previousFocusListeners = official.focusManager.hasListeners()
  const previousOnlineListeners = official.onlineManager.hasListeners()
  const previousTimeouts = process
    .getActiveResourcesInfo()
    .filter((value) => value === 'Timeout').length
  const configuration = { status: 'configured', baseUrl: 'https://query.invalid/base/' } as const
  const endpoint = {
    id: 'verification.read',
    method: 'GET',
    authentication: 'anonymous',
    path: ['records'],
    policy: 'standard',
    response: {
      mode: 'json',
      mimeTypes: ['application/json'],
      schema: coreRuntimeConfigurationSchema.shape.buildVersion,
    },
  } as const
  const response = (): Response =>
    new Response('"0.0.0"', { headers: { 'content-type': 'application/json' } })
  const create = (fetch: ApiFetch): Runtime => {
    const runtime = query.createApiQueryRuntime(api.createApiClient({ configuration, fetch }))
    runtimes.push(runtime)
    return runtime
  }
  const rejection = (operation: Promise<unknown>): Promise<unknown> =>
    operation.then(
      () => undefined,
      (error: unknown) => error,
    )
  const turn = (): Promise<void> => new Promise((resolveTurn) => setImmediate(resolveTurn))
  const deferred = <Value>() => {
    let settle: ((value: Value) => void) | undefined
    const promise = new Promise<Value>((resolveValue) => {
      settle = resolveValue
    })
    return {
      promise,
      resolve(value: Value): void {
        if (settle === undefined)
          throw new Error('Deferred verification value was not initialized.')
        settle(value)
      },
    }
  }

  try {
    let calls = 0
    let mode: 'success' | 'accepted' | 'network' | 'http' | 'schema' = 'success'
    const runtime = create(() => {
      calls += 1
      if (mode === 'network') return Promise.reject(new Error('private upstream cause'))
      if (mode === 'http') return Promise.resolve(new Response(null, { status: 503 }))
      if (mode === 'accepted')
        return Promise.resolve(
          new Response('"1.0.0"', { status: 202, headers: { 'content-type': 'application/json' } }),
        )
      if (mode === 'schema')
        return Promise.resolve(
          new Response('1', { headers: { 'content-type': 'application/json' } }),
        )
      return Promise.resolve(response())
    })
    expect(
      runtime.queryClient instanceof official.QueryClient,
      'uses the official Vue Query client',
    )
    const options = runtime.queryOptions(endpoint)
    const values = await Promise.all([
      runtime.queryClient.query(options),
      runtime.queryClient.query(options),
    ])
    expect(
      calls === 1 && values.every((value) => value === '0.0.0'),
      'one HTTP attempt for concurrent same-key reads',
    )
    const scope = vue.effectScope()
    scopes.push(scope)
    const observed = scope.run(() => official.useQuery(options, runtime.queryClient))
    await vue.nextTick()
    expect(
      observed?.data.value === '0.0.0' && calls === 1,
      'official useQuery consumes cached data with an explicit client',
    )
    await runtime.queryClient.invalidateQueries({ queryKey: options.queryKey, exact: true })
    expect(calls === 2, 'explicit invalidation refetches an active read')
    scope.stop()
    const remount = vue.effectScope()
    scopes.push(remount)
    remount.run(() => official.useQuery(options, runtime.queryClient))
    await vue.nextTick()
    expect(calls === 2, 'remount does not start a hidden read')
    remount.stop()

    for (const failedMode of ['network', 'http', 'schema'] as const) {
      mode = failedMode
      const before = calls
      const error = await rejection(runtime.queryClient.query(options))
      expect(
        error instanceof query.ApiQueryError &&
          error.detail.category === failedMode &&
          error.message === 'The API read query failed.' &&
          !JSON.stringify(error).includes('private upstream cause'),
        `${failedMode} preserves structured safe HTTP failure`,
      )
      expect(
        calls === before + 1 &&
          runtime.queryClient.getQueryState(options.queryKey)?.status === 'error' &&
          runtime.queryClient.getQueryData(options.queryKey) === '0.0.0',
        'failed refetch keeps last valid data, without retry or success classification',
      )
    }
    const failedOptions = runtime.queryOptions(endpoint, { query: { distinct: true } })
    await rejection(runtime.queryClient.query(failedOptions))
    expect(
      runtime.queryClient.getQueryData(failedOptions.queryKey) === undefined &&
        runtime.queryClient.getQueryState(failedOptions.queryKey)?.status === 'error',
      'initial failure never becomes success cache data',
    )
    mode = 'success'
    expect((await runtime.queryClient.query(options)) === '0.0.0', 'explicit retry can recover')

    mode = 'accepted'
    const accepted = await rejection(runtime.queryClient.query(options))
    expect(
      accepted instanceof query.ApiQueryAccepted &&
        !(accepted instanceof query.ApiQueryError) &&
        Object.is(accepted.result.status, 'accepted') &&
        accepted.result.httpStatus === 202 &&
        accepted.result.data === '1.0.0' &&
        runtime.queryClient.getQueryData(options.queryKey) === '0.0.0' &&
        runtime.queryClient.getQueryState(options.queryKey)?.error === accepted,
      '202 preserves typed acceptance separately from HTTP failure and prior completed data',
    )
    const firstAcceptedOptions = runtime.queryOptions(endpoint, { query: { firstAccepted: true } })
    const firstAccepted = await rejection(runtime.queryClient.query(firstAcceptedOptions))
    expect(
      firstAccepted instanceof query.ApiQueryAccepted &&
        runtime.queryClient.getQueryData(firstAcceptedOptions.queryKey) === undefined &&
        runtime.queryClient.getQueryState(firstAcceptedOptions.queryKey)?.status === 'error',
      'initial 202 exposes acceptance without completed cache data',
    )
    const acceptedCalls = calls
    await turn()
    expect(calls === acceptedCalls, 'acceptance never starts automatic retry or polling')
    mode = 'success'
    expect(
      (await runtime.queryClient.query(options)) === '0.0.0' &&
        runtime.queryClient.getQueryState(options.queryKey)?.status === 'success' &&
        runtime.queryClient.getQueryState(options.queryKey)?.error === null,
      'explicit completed reread clears the accepted outcome',
    )

    const undefinedOptions = runtime.queryOptions({
      ...endpoint,
      id: 'verification.undefined-read',
      response: {
        ...endpoint.response,
        schema: endpoint.response.schema.transform(() => undefined),
      },
    })
    const undefinedError = await rejection(runtime.queryClient.query(undefinedOptions))
    expect(
      undefinedError instanceof query.ApiQueryError &&
        undefinedError.detail.category === 'schema' &&
        runtime.queryClient
          .getQueryCache()
          .find({ queryKey: undefinedOptions.queryKey, exact: true })?.state.data === undefined &&
        runtime.queryClient.getQueryState(undefinedOptions.queryKey)?.status === 'error',
      'undefined schema output cannot reach Query as success data or an unstructured library error',
    )

    const mutablePath = ['records', 'a b%']
    const mimeTypes = ['application/json']
    const mutable = {
      ...endpoint,
      path: mutablePath,
      response: { ...endpoint.response, mimeTypes },
    }
    const repeated = [1, false]
    const input = { query: { repeated, q: 'a&b /' } }
    let capturedUrl: URL | undefined
    const snapshotRuntime = create((url) => {
      capturedUrl = url
      return Promise.resolve(response())
    })
    const captured = snapshotRuntime.queryOptions(mutable, input)
    mutablePath[1] = 'changed'
    mimeTypes[0] = 'text/plain'
    repeated.push(2)
    input.query.q = 'changed'
    await snapshotRuntime.queryClient.query(captured)
    expect(
      capturedUrl?.pathname === '/base/records/a%20b%25' &&
        capturedUrl.searchParams.getAll('repeated').join(',') === '1,false' &&
        capturedUrl.searchParams.get('q') === 'a&b /' &&
        captured.queryKey[3] === capturedUrl.search.slice(1),
      'options capture path, MIME and query before deferred execution; key matches the request',
    )
    const beforeInvalid = snapshotRuntime.queryClient.getQueryCache().getAll().length
    for (const invalidInput of [
      { headers: {} },
      { body: {} },
      { signal: new AbortController().signal },
      { query: { q: NaN } },
      { query: { q: Infinity } },
      { query: { q: {} } },
      { query: { q: [1, null] } },
      { query: new URLSearchParams() },
    ]) {
      let error: unknown
      try {
        snapshotRuntime.queryOptions(endpoint, invalidInput as QueryCore.ApiReadQueryInput)
      } catch (caught) {
        error = caught
      }
      expect(error instanceof TypeError, 'reject unsupported inputs before creating cache entries')
    }
    for (const invalid of [
      { ...endpoint, method: 'POST' },
      { ...endpoint, authentication: 'provided' },
      { ...endpoint, response: { ...endpoint.response, mode: 'text' } },
      { ...endpoint, path: ['..'] },
    ]) {
      let error: unknown
      try {
        snapshotRuntime.queryOptions(invalid as typeof endpoint)
      } catch (caught) {
        error = caught
      }
      expect(
        error instanceof TypeError,
        'reject writes, authenticated reads and non-JSON contracts',
      )
    }
    expect(
      snapshotRuntime.queryClient.getQueryCache().getAll().length === beforeInvalid,
      'invalid options create no cache state',
    )

    const pendingResponse = deferred<Response>()
    const started = deferred<AbortSignal>()
    const cancellable = create((_url, init) => {
      if (init.signal instanceof AbortSignal) started.resolve(init.signal)
      return pendingResponse.promise
    })
    const pendingOptions = cancellable.queryOptions(endpoint)
    const cancelled = rejection(cancellable.queryClient.query(pendingOptions))
    const fetchSignal = await started.promise
    await cancellable.queryClient.cancelQueries({ queryKey: pendingOptions.queryKey, exact: true })
    expect(
      (await cancelled) instanceof official.CancelledError && fetchSignal.aborted,
      'Query cancellation aborts the actual HTTP attempt',
    )
    pendingResponse.resolve(response())
    await turn()
    expect(
      cancellable.queryClient.getQueryData(pendingOptions.queryKey) === undefined &&
        cancellable.queryClient.getQueryState(pendingOptions.queryKey)?.fetchStatus === 'idle' &&
        getEventListeners(fetchSignal, 'abort').length === 0,
      'late ignored-abort response cannot cache data; HTTP listeners are released',
    )

    const scopeResponse = deferred<Response>()
    const scopeStarted = deferred<AbortSignal>()
    const scopedRuntime = create((_url, init) => {
      if (init.signal instanceof AbortSignal) scopeStarted.resolve(init.signal)
      return scopeResponse.promise
    })
    const pendingScope = vue.effectScope()
    scopes.push(pendingScope)
    const scopedOptions = scopedRuntime.queryOptions(endpoint)
    pendingScope.run(() => official.useQuery(scopedOptions, scopedRuntime.queryClient))
    const scopedSignal = await scopeStarted.promise
    pendingScope.stop()
    await turn()
    expect(
      scopedSignal.aborted &&
        scopedRuntime.queryClient.getQueryData(scopedOptions.queryKey) === undefined,
      'stopping the last Vue consumer aborts its pending shared read',
    )
    scopeResponse.resolve(response())

    const disposingResponse = deferred<Response>()
    const disposingStarted = deferred<AbortSignal>()
    const reentry: { completion?: Promise<void> } = {}
    let unmountCalls = 0
    let clearCalls = 0
    const disposing = create((_url, init) => {
      if (init.signal instanceof AbortSignal) {
        init.signal.addEventListener(
          'abort',
          () => {
            reentry.completion = disposing.dispose()
          },
          { once: true },
        )
        disposingStarted.resolve(init.signal)
      }
      return disposingResponse.promise
    })
    const unmount = disposing.queryClient.unmount.bind(disposing.queryClient)
    disposing.queryClient.unmount = () => {
      unmountCalls += 1
      unmount()
    }
    const clear = disposing.queryClient.clear.bind(disposing.queryClient)
    disposing.queryClient.clear = () => {
      clearCalls += 1
      clear()
    }
    const disposingOptions = disposing.queryOptions(endpoint)
    const disposedResult = rejection(disposing.queryClient.query(disposingOptions))
    const disposedSignal = await disposingStarted.promise
    const disposingCompletion = disposing.dispose()
    expect(
      disposingCompletion === reentry.completion && disposingCompletion === disposing.dispose(),
      'synchronous abort reentry returns the same published completion promise',
    )
    await disposingCompletion
    expect(
      (await disposedResult) instanceof official.CancelledError &&
        disposedSignal.aborted &&
        unmountCalls === 1 &&
        clearCalls === 1,
      'reentrant disposal cancels synchronously and unmounts/clears exactly once',
    )
    disposingResponse.resolve(response())
    await turn()
    expect(
      disposing.queryClient.getQueryCache().getAll().length === 0 &&
        runtime.queryClient.getQueryData(options.queryKey) === '0.0.0',
      'disposed cache stays empty and healthy runtime remains intact',
    )
    let disposedOptionsError: unknown
    try {
      disposing.queryOptions(endpoint)
    } catch (error) {
      disposedOptionsError = error
    }
    expect(
      disposedOptionsError instanceof official.CancelledError,
      'released runtime rejects new options',
    )

    const worldTime = {
      datetime: '2026-11-03T12:00:00+08:00',
      offset_seconds: 28800,
      offset_string: '+08:00',
      query: 'Asia/Shanghai',
      timestamp_unix: 1793678400,
      timezone: 'Asia/Shanghai',
      weekday: 'Tuesday',
    }
    const serviceRuntime = create(() =>
      Promise.resolve(
        new Response(JSON.stringify(worldTime), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const serviceData = await serviceRuntime.queryClient.query(
      service.uapiWorldTimeQueryOptions(serviceRuntime, 'Asia/Shanghai'),
    )
    expect(
      serviceData.timezone === 'Asia/Shanghai',
      'existing service endpoint validates Query data',
    )
    let invalidCity: unknown
    try {
      service.uapiWorldTimeQueryOptions(serviceRuntime, '')
    } catch (error) {
      invalidCity = error
    }
    expect(invalidCity instanceof TypeError, 'service input validation precedes Query options')
  } finally {
    for (const scope of scopes) scope.stop()
    await Promise.all(runtimes.map((runtime) => runtime.dispose()))
  }
  await turn()
  expect(
    official.focusManager.hasListeners() === previousFocusListeners &&
      official.onlineManager.hasListeners() === previousOnlineListeners,
    'all client subscriptions are released',
  )
  expect(
    process.getActiveResourcesInfo().filter((value) => value === 'Timeout').length ===
      previousTimeouts,
    'awaited disposal releases pending-request and cache timers',
  )
  return violations
}

if (process.argv[1]?.endsWith('check-boundaries.ts')) {
  const violations = [
    ...(await validateManifestDependencies()),
    ...(await validateRootConfigurationDependencies()),
    ...(await validateSourceImports()),
    ...(await validateApiTransport()),
    ...(await validateReadQueries()),
    ...(await validateDesignSystemTokenExports()),
    ...(await validateNoApplicationInternalTokenUse()),
    ...(await validateNoApplicationOpticalEffects()),
    ...(await validateVueStyleGuardrails()),
    ...(await validateNativeCssCascade()),
    ...(await validateFirstPaintApplicationContract()),
    ...(await validateRouteTransitionBoundaryContract()),
    ...(await validateAppearanceCutover()),
    ...(await validateRouterArchitecture()),
    ...(await validateRuntimeKernelArchitecture()),
    ...(await validateStorageArchitecture()),
    ...(await validateI18nArchitecture()),
    ...(await validateArchitectureAdminConsole()),
  ]

  if (violations.length > 0) {
    throw new Error(
      `Architecture boundary violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
    )
  }

  console.log('Architecture boundaries: valid')
}

export { validateScssFallbackOutputContract } from './style-ownership'
