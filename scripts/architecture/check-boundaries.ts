import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { TextDecoder } from 'node:util'

import stylelint from 'stylelint'
import ts from 'typescript'

import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { projectConfig } from '../../project.config'
import { validateArchitectureAdminConsole } from './check-architecture-admin-console'
import { validateAppearanceCutover } from './check-appearance-cutover'
import { validateRouterArchitecture } from './check-router'
import { validateRuntimeKernelArchitecture } from './check-runtime-kernel'
import { validateStorageArchitecture } from './check-storage'

type JsonObject = Record<string, unknown>

const rootDirectory = process.cwd()
const sourceExtensions = new Set(['.ts', '.vue'])
const importSourceExtensions = new Set(['.cjs', '.js', '.mjs', '.ts', '.vue'])
const excludedApplicationDirectories = new Set(['dist', 'node_modules'])
const rootTypeScriptConfigurationSuffix = '.config.ts'
const inactiveCapabilityPackages = [
  '@capacitor/core',
  '@tanstack/query-core',
  '@tanstack/vue-query',
  '@tanstack/vue-table',
  '@tanstack/vue-virtual',
  '@tauri-apps/api',
  '@unocss/preset-attributify',
  '@unocss/preset-tagify',
  '@vueuse/core',
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
  'motion-v',
  'nuxt',
  'nx',
  'openapi-fetch',
  'openapi-typescript',
  'primevue',
  'quasar',
  'react',
  'react-dom',
  'reka-ui',
  'sass',
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

  for (const [description, manifestPath] of [
    ['root package', resolve(rootDirectory, 'package.json')],
    ...projectConfig.workspaces.map(
      (workspace) =>
        [workspace.name, resolve(rootDirectory, workspace.path, 'package.json')] as const,
    ),
  ] as const) {
    const manifest = await readJsonObject(manifestPath)

    for (const [dependency] of dependencyEntries(manifest)) {
      const inactivePackage = inactiveCapabilityPackage(dependency)

      if (inactivePackage !== undefined) {
        violations.push(
          `${description}: Phase 1 may not declare inactive capability package "${inactivePackage}".`,
        )
      }
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

function inspectImport(sourcePath: string, specifier: string): string[] {
  const violations: string[] = []
  const displayPath = relative(rootDirectory, sourcePath)
  const fromLayer = sourceLayer(sourcePath)
  const inactivePackage = inactiveCapabilityPackage(specifier)

  if (inactivePackage !== undefined) {
    violations.push(
      `${displayPath}: Phase 1 import of inactive capability package "${inactivePackage}" is forbidden.`,
    )
  }

  if (/^@platform\/[^/]+\/.+/u.test(specifier)) {
    violations.push(`${displayPath}: workspace deep import "${specifier}" is forbidden.`)
  }

  if (
    (specifier === 'naive-ui' || specifier.startsWith('naive-ui/')) &&
    !relative(rootDirectory, sourcePath)
      .split(sep)
      .join('/')
      .startsWith('packages/ui/src/adapters/naive/')
  ) {
    violations.push(
      `${displayPath}: "naive-ui" may only be imported by the private @platform/ui Naive adapter.`,
    )
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
  ]
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
  const appearancePagePath = resolve(rootDirectory, 'apps/web/src/pages/appearance.vue')
  const appearancePreviewInternalVariables = new Set([
    '--ui-admin-optical-backdrop-blur',
    '--ui-material-chrome-background',
    '--ui-material-overlay-background',
  ])
  const violations: string[] = []

  for (const applicationFile of applicationFiles) {
    const sourceText = decodeUtf8Text(await readFile(applicationFile))
    const allowedInternalVariables =
      applicationFile === appearancePagePath
        ? appearancePreviewInternalVariables
        : new Set<string>()

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

  if (extension === '.vue') {
    return [...sourceText.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gu)]
      .map((match) => match[1] ?? '')
      .join('\n')
  }

  return ''
}

async function validateNoApplicationOpticalEffects(): Promise<string[]> {
  const applicationFiles = await collectApplicationFiles(resolve(rootDirectory, 'apps/web'))
  const appearancePagePath = resolve(rootDirectory, 'apps/web/src/pages/appearance.vue')
  const forbiddenOpticalSyntax =
    /\b(?:backdrop-filter|filter)\s*:|(?:blur|brightness|saturate)\s*\(/u
  const violations: string[] = []

  for (const applicationFile of applicationFiles) {
    const sourceText = decodeUtf8Text(await readFile(applicationFile))

    if (
      applicationFile !== appearancePagePath &&
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

function vueStyleBlocks(sourceText: string): readonly string[] {
  return [...sourceText.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gu)].map(
    (match) => match[1] ?? '',
  )
}

async function validateVueStyleGuardrails(): Promise<string[]> {
  const roots = [resolve(rootDirectory, 'apps/web/src'), resolve(rootDirectory, 'packages/ui/src')]
  const vueFiles = (
    await Promise.all(roots.map((root) => collectSourceFiles(root, new Set(['.vue']))))
  ).flat()
  const violations: string[] = []

  for (const path of vueFiles) {
    const displayPath = relative(rootDirectory, path)
    const blocks = vueStyleBlocks(await readFile(path, 'utf8'))

    for (const [index, code] of blocks.entries()) {
      const result = await stylelint.lint({
        code,
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

  if (/\bdata-theme-registry-storage-key\b/u.test(indexHtml)) {
    violations.push(
      'apps/web/index.html: the Custom Theme Registry storage-key attribute is forbidden.',
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
    'data-theme="iris"',
    'data-contrast="standard"',
    'data-density="comfortable"',
    'data-material="solid"',
    'data-motion="full"',
  ]

  if (baselineAttributes.some((attribute) => !indexHtml.includes(attribute))) {
    violations.push(
      'apps/web/index.html: Iris/Light/Standard/Comfortable/Solid baseline attributes are incomplete.',
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

const violations = [
  ...(await validateManifestDependencies()),
  ...(await validateRootConfigurationDependencies()),
  ...(await validateSourceImports()),
  ...(await validateDesignSystemTokenExports()),
  ...(await validateNoApplicationInternalTokenUse()),
  ...(await validateNoApplicationOpticalEffects()),
  ...(await validateVueStyleGuardrails()),
  ...(await validateFirstPaintApplicationContract()),
  ...(await validateAppearanceCutover()),
  ...(await validateRouterArchitecture()),
  ...(await validateRuntimeKernelArchitecture()),
  ...(await validateStorageArchitecture()),
  ...(await validateArchitectureAdminConsole()),
]

if (violations.length > 0) {
  throw new Error(
    `Architecture boundary violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  )
}

console.log('Architecture boundaries: valid')
