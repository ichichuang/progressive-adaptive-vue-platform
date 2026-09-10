import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { isDeepStrictEqual, TextDecoder } from 'node:util'

import { baseCompile, type NodeTypes } from '@intlify/message-compiler'
import ts from 'typescript'

import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { getRouteMessageScope, routeRegistry } from '../../apps/web/src/app/router/route-registry'
import { capabilityMessageKeys } from '../../apps/web/src/generated/capability-manifest'
import {
  consoleLocaleRegistry,
  consoleLocaleSchema,
  defaultConsoleLocale,
  type ConsoleLocale,
} from '../../apps/web/src/shared/i18n/locale-contract'
import {
  messageParameterKinds,
  messageScopeCoverage,
} from '../../apps/web/src/shared/i18n/message-schema'
import type { UiLocale } from '../../packages/ui/src/components/contracts'

const messageNodeType: NodeTypes.Message = 2
const namedNodeType: NodeTypes.Named = 4
const textNodeType: NodeTypes.Text = 3
const literalNodeType: NodeTypes.Literal = 9

const root = process.cwd()
const owner = 'apps/web/src/shared/i18n'
const scopes = ['common', 'console', 'appearance', 'capabilities'] as const
const locales = ['zh-CN', 'en'] as const
const expectedParameters = {
  'console.storage.active-records': { count: 'number' },
  'appearance.gallery.description': { count: 'number' },
  'appearance.preview.current-material': { material: 'string' },
} as const
const localeTypeCoverage = {
  application: true,
  ui: true,
} satisfies {
  application: Exclude<ConsoleLocale, UiLocale> extends never ? true : false
  ui: Exclude<UiLocale, ConsoleLocale> extends never ? true : false
}

interface TemplateNode {
  readonly type: number
  readonly tag?: string
  readonly content?: string | TemplateNode
  readonly children?: readonly TemplateNode[]
  readonly props?: readonly {
    readonly type: number
    readonly name?: string
    readonly arg?: { readonly content?: string }
    readonly exp?: { readonly content?: string }
    readonly value?: { readonly content?: string }
  }[]
}
interface SfcCompiler {
  parse(
    source: string,
    options: { filename: string },
  ): {
    readonly errors: readonly unknown[]
    readonly descriptor: {
      readonly script?: { readonly content: string } | null
      readonly scriptSetup?: { readonly content: string } | null
      readonly template?: { readonly ast?: TemplateNode } | null
    }
  }
}
const compiler = createRequire(resolve(root, 'apps/web/package.json'))(
  'vue/compiler-sfc',
) as SfcCompiler

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true })
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = `${directory}/${entry.name}`
        return entry.isDirectory() ? sourceFiles(path) : [path]
      }),
    )
  ).flat()
}

function nodesOf<T extends ts.Node>(source: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const nodes: T[] = []
  function visit(node: ts.Node): void {
    if (predicate(node)) nodes.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return nodes
}

function parseSource(path: string, source: string): ts.SourceFile {
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function callName(call: ts.CallExpression): string | undefined {
  return ts.isIdentifier(call.expression)
    ? call.expression.text
    : ts.isPropertyAccessExpression(call.expression)
      ? call.expression.name.text
      : undefined
}

function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  return object.properties.flatMap((item) =>
    ts.isPropertyAssignment(item) && item.name.getText().replaceAll(/['"]/gu, '') === name
      ? [item.initializer]
      : [],
  )[0]
}

function equalSet(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    new Set(actual).size === actual.length &&
    isDeepStrictEqual([...actual].sort(), [...expected].sort())
  )
}

export async function validateI18nArchitecture(): Promise<string[]> {
  const violations: string[] = []
  const report = (condition: boolean, detail: string): void => {
    if (!condition) violations.push(`I18n: ${detail}`)
  }
  const paths = await sourceFiles(owner)
  const catalogPaths = locales.flatMap((locale) =>
    scopes.map((scope) => `${owner}/messages/${locale}/${scope}.json`),
  )
  report(
    equalSet(
      paths.filter((path) => path.endsWith('.json')),
      catalogPaths,
    ),
    'the eight production catalog paths must remain exact.',
  )
  report(
    equalSet(Object.keys(messageScopeCoverage), scopes) &&
      Object.values(messageScopeCoverage).every(Boolean),
    'the four typed language scope schemas must agree.',
  )
  const catalogs = new Map<string, Readonly<Record<string, string>>>()
  const keyScopes = new Map<string, string>()
  for (const path of catalogPaths) {
    const source = new TextDecoder('utf-8', { fatal: true }).decode(
      await readFile(resolve(root, path)),
    )
    report(!source.includes('\r') && source.endsWith('\n'), `${path}: UTF-8/LF source required.`)
    const value: unknown = JSON.parse(source)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      violations.push(`I18n: ${path}: flat string object required.`)
      continue
    }
    const entries = Object.entries(value)
    const parsed = parseSource(path, `const messages = ${source}`)
    const object = nodesOf(parsed, ts.isObjectLiteralExpression)[0]
    const authoredKeys =
      object?.properties.map((item) => item.name?.getText().replace(/^"|"$/gu, '') ?? '') ?? []
    report(
      entries.length > 0 &&
        equalSet(
          authoredKeys,
          entries.map(([key]) => key),
        ),
      `${path}: duplicate or non-literal catalog key.`,
    )
    const messages: Record<string, string> = {}
    const scope = scopes.find((candidate) => path.endsWith(`/${candidate}.json`))
    for (const [key, message] of entries) {
      if (typeof message !== 'string' || message.trim().length === 0) {
        violations.push(`I18n: ${path}: ${key} must be nonempty text.`)
        continue
      }
      messages[key] = message
      const expected = Object.entries(expectedParameters).find(
        ([candidate]) => candidate === key,
      )?.[1]
      try {
        // Official JIT AST only: no generated JavaScript is evaluated.
        const { ast } = baseCompile(message, {
          jit: true,
          optimize: false,
          minify: false,
          onError(error) {
            throw error
          },
        })
        if (ast.body.type !== messageNodeType) throw new Error('Plural messages are not admitted.')
        const parameters = new Set<string>()
        for (const item of ast.body.items) {
          if (item.type === namedNodeType) parameters.add(item.key)
          else if (item.type !== textNodeType && item.type !== literalNodeType)
            throw new Error('Only text, literal escapes and named parameters are admitted.')
        }
        report(
          equalSet([...parameters], Object.keys(expected ?? {})),
          `${path}: ${key} named parameters drifted.`,
        )
        report(
          scope !== 'common' || parameters.size === 0,
          `${path}: safe common messages cannot interpolate.`,
        )
      } catch {
        violations.push(`I18n: ${path}: ${key} has invalid or unadmitted official message syntax.`)
      }
      if (path.includes('/zh-CN/')) {
        report(!keyScopes.has(key), `${key} occurs in multiple scopes.`)
        keyScopes.set(key, scope ?? '')
      }
    }
    catalogs.set(path, messages)
  }
  for (const scope of scopes) {
    report(
      equalSet(
        Object.keys(catalogs.get(`${owner}/messages/zh-CN/${scope}.json`) ?? {}),
        Object.keys(catalogs.get(`${owner}/messages/en/${scope}.json`) ?? {}),
      ),
      `${scope}: Chinese/English key coverage differs.`,
    )
  }
  for (const [locale, refresh, close] of [
    ['zh-CN', '刷新', '关闭'],
    ['en', 'Refresh', 'Close'],
  ] as const) {
    const common = catalogs.get(`${owner}/messages/${locale}/common.json`)
    report(
      common?.['workspace.refreshLabel'] === refresh && common['shell.closeActionLabel'] === close,
      `${locale}: Workspace Refresh/Close must use the common localized labels.`,
    )
  }
  report(
    isDeepStrictEqual(messageParameterKinds, expectedParameters),
    'the three named-parameter contracts must remain exact.',
  )
  report(
    defaultConsoleLocale === 'zh-CN' &&
      isDeepStrictEqual(consoleLocaleSchema.options, locales) &&
      Object.values(localeTypeCoverage).every(Boolean),
    'locale default, exact schema or UI type compatibility drifted.',
  )
  report(
    isDeepStrictEqual(
      consoleLocaleRegistry,
      locales.map((locale) => ({
        id: locale,
        languageTag: locale,
        intlLocale: locale,
        direction: 'ltr',
        messageLoaderId: `console-messages.${locale}`,
        capabilityStatus: 'ACTIVE',
      })),
    ),
    'the two active locale records drifted.',
  )

  const sources = new Map<string, ts.SourceFile>()
  const sourceText = new Map<string, string>()
  const usedKeys = new Set<string>(
    Object.values(capabilityMessageKeys).flatMap((record) => Object.values(record)),
  )
  const runtimeImports: string[] = []
  const dynamicResources: string[] = []
  const factories: ts.CallExpression[] = []
  const switchConsumers = new Map<string, number>()
  const appFiles = (await sourceFiles('apps/web/src')).filter((path) => /\.(ts|vue)$/u.test(path))
  function checkReferences(path: string, parsed: ts.SourceFile): void {
    for (const literal of nodesOf(parsed, ts.isStringLiteralLike)) {
      if (keyScopes.has(literal.text)) usedKeys.add(literal.text)
    }
    for (const call of nodesOf(parsed, ts.isCallExpression)) {
      const name = callName(call)
      if (name === 'switchLocale') switchConsumers.set(path, (switchConsumers.get(path) ?? 0) + 1)
      if (name === 'createI18n') {
        factories.push(call)
        report(
          path === `${owner}/runtime.ts`,
          'Composer creation must remain in the runtime owner.',
        )
      }
      if (name !== 't' && name !== 'getDefaultConsoleMessage') continue
      const key = call.arguments[0]
      if (key !== undefined && ts.isStringLiteralLike(key)) {
        report(keyScopes.has(key.text), `${path}: unknown message ${key.text}.`)
        const route = routeRegistry.find((record) => record.sourcePath === path)
        if (route !== undefined)
          report(
            keyScopes.get(key.text) === 'common' ||
              keyScopes.get(key.text) === getRouteMessageScope(route.name),
            `${path}: message used before its route scope is ready.`,
          )
      } else if (key !== undefined) {
        report(
          !ts.isTemplateExpression(key) &&
            !(ts.isBinaryExpression(key) && key.operatorToken.kind === ts.SyntaxKind.PlusToken),
          `${path}: message keys may not be constructed by consumers.`,
        )
      }
    }
  }
  for (const path of appFiles) {
    const text = await readFile(resolve(root, path), 'utf8')
    sourceText.set(path, text)
    let script = text
    if (path.endsWith('.vue')) {
      const parsed = compiler.parse(text, { filename: path })
      report(parsed.errors.length === 0, `${path}: invalid Vue source.`)
      script = `${parsed.descriptor.script?.content ?? ''}\n${parsed.descriptor.scriptSetup?.content ?? ''}`
      function visitTemplate(node: TemplateNode): void {
        if (
          node.type === 5 &&
          typeof node.content === 'object' &&
          typeof node.content.content === 'string'
        )
          checkReferences(path, parseSource(path, node.content.content))
        for (const prop of node.props ?? []) {
          if (prop.exp?.content !== undefined)
            checkReferences(path, parseSource(path, prop.exp.content))
          report(prop.name !== 'html', `${path}: translated HTML is prohibited.`)
          if (prop.arg?.content === 'key')
            report(
              !/\b(?:locale|pendingLocale)\b/u.test(prop.exp?.content ?? ''),
              `${path}: language cannot remount the page tree.`,
            )
        }
        for (const child of node.children ?? []) visitTemplate(child)
      }
      if (parsed.descriptor.template?.ast !== undefined)
        visitTemplate(parsed.descriptor.template.ast)
    }
    const parsed = parseSource(path, script)
    sources.set(path, parsed)
    checkReferences(path, parsed)
    for (const declaration of nodesOf(parsed, ts.isImportDeclaration)) {
      if (!ts.isStringLiteral(declaration.moduleSpecifier)) continue
      const specifier = declaration.moduleSpecifier.text
      const typeOnly = declaration.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword
      if (specifier === 'vue-i18n' || specifier.startsWith('vue-i18n/'))
        runtimeImports.push(`${path}:${specifier}`)
      if (path.startsWith(`${owner}/`) && specifier.startsWith('.'))
        report(
          !relative(resolve(root, owner), resolve(root, dirname(path), specifier)).startsWith('..'),
          `${path}: localization may not depend on its callers.`,
        )
      if (!typeOnly && specifier.endsWith('.json') && path.startsWith(`${owner}/`))
        report(
          specifier === './messages/zh-CN/common.json' &&
            [`${owner}/default-messages.ts`, `${owner}/resource-loaders.ts`].includes(path),
          `${path}: only safe Chinese common may be statically loaded.`,
        )
    }
    for (const call of nodesOf(parsed, ts.isCallExpression)) {
      if (call.expression.kind !== ts.SyntaxKind.ImportKeyword) continue
      const specifier = call.arguments[0]
      if (path.startsWith(`${owner}/`)) {
        report(
          specifier !== undefined && ts.isStringLiteral(specifier),
          `${path}: dynamic imports must be explicit.`,
        )
        if (specifier !== undefined && ts.isStringLiteral(specifier)) {
          if (specifier.text.endsWith('.json')) {
            report(path === `${owner}/resource-loaders.ts`, 'lazy catalogs have one loader owner.')
            dynamicResources.push(relative(root, resolve(root, dirname(path), specifier.text)))
          } else
            report(
              path === `${owner}/lifecycle.ts` && specifier.text === './runtime',
              'only the lifecycle may load the language runtime.',
            )
        }
      }
    }
  }
  report(
    equalSet(runtimeImports, [`${owner}/runtime.ts:vue-i18n`]) && factories.length === 1,
    'exactly one private application Composer is required.',
  )
  report(
    equalSet(
      dynamicResources,
      catalogPaths.filter((path) => path !== `${owner}/messages/zh-CN/common.json`),
    ),
    'seven explicit lazy catalog roots are required.',
  )
  const options = factories[0]?.arguments[0]
  if (options !== undefined && ts.isObjectLiteralExpression(options)) {
    for (const [name, expected] of Object.entries({
      legacy: 'false',
      globalInjection: 'false',
      flatJson: 'true',
      locale: 'defaultConsoleLocale',
      fallbackLocale: 'defaultConsoleLocale',
      fallbackFormat: 'false',
      missingWarn: 'import.meta.env.DEV',
      fallbackWarn: 'import.meta.env.DEV',
    }))
      report(property(options, name)?.getText() === expected, `Composer ${name} drifted.`)
    report(
      !['messages', 'missing', 'messageCompiler', 'messageResolver'].some(
        (name) => property(options, name) !== undefined,
      ),
      'no placeholder messages or replacement compiler/resolver are admitted.',
    )
  } else violations.push('I18n: Composer options must be explicit.')
  report(
    equalSet(
      [...usedKeys].filter((key) => keyScopes.has(key)),
      [...keyScopes.keys()],
    ),
    'all catalog messages must have an actual production reference.',
  )

  const textAt = (path: string): string => sourceText.get(path) ?? ''
  const boundary = sources.get(`${owner}/boundary.ts`)
  const publicBoundary =
    boundary === undefined
      ? undefined
      : nodesOf(boundary, ts.isInterfaceDeclaration).find(
          (node) => node.name.text === 'ConsoleI18nBoundary',
        )
  report(
    publicBoundary !== undefined &&
      equalSet(
        publicBoundary.members.map((member) => member.name?.getText() ?? ''),
        ['locale', 'pendingLocale', 'notice', 't', 'switchLocale', 'prepareScope'],
      ) &&
      publicBoundary.members
        .filter(ts.isPropertySignature)
        .every((member) =>
          member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword),
        ),
    'the readonly consumer boundary and its exact members must remain intact.',
  )
  const safeSource = sources.get(`${owner}/default-messages.ts`)
  report(
    safeSource !== undefined &&
      nodesOf(safeSource, ts.isImportDeclaration).every(
        (node) =>
          node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword ||
          (ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === './messages/zh-CN/common.json'),
      ),
    'pre-initialization Chinese must not depend on services.',
  )
  const schemaSource = sources.get(`${owner}/message-schema.ts`)
  report(
    schemaSource !== undefined &&
      nodesOf(schemaSource, ts.isImportDeclaration).length === 8 &&
      nodesOf(schemaSource, ts.isImportDeclaration).every(
        (node) => node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword,
      ),
    'message schema must derive from eight type-only catalogs.',
  )
  const kernel = sources.get('apps/web/src/app/bootstrap/runtime-kernel.ts')
  const kernelCalls = kernel === undefined ? [] : nodesOf(kernel, ts.isCallExpression)
  for (const name of ['createConsoleI18n', 'connectLocalization', 'refreshCurrentRouteTitle'])
    report(
      kernelCalls.filter((call) => callName(call) === name).length === 1,
      `Kernel must uniquely connect ${name}.`,
    )
  const router = sources.get('apps/web/src/app/router/router-lifecycle.ts')
  const guards =
    router === undefined
      ? []
      : nodesOf(router, ts.isCallExpression).filter((call) => callName(call) === 'beforeResolve')
  const presentationGuard = guards[0]
  report(
    guards.length === 1 &&
      presentationGuard !== undefined &&
      nodesOf(presentationGuard, ts.isAwaitExpression).some(
        (awaited) =>
          ts.isCallExpression(awaited.expression) &&
          callName(awaited.expression) === 'prepareScope',
      ),
    'the existing presentation guard must await scope readiness.',
  )
  const creation = kernelCalls.find((call) => callName(call) === 'createConsoleI18n')
  const connection = kernelCalls.find((call) => callName(call) === 'connectLocalization')
  const mount = kernelCalls.find((call) => callName(call) === 'mountVueApplication')
  const readiness =
    kernel === undefined
      ? undefined
      : nodesOf(kernel, ts.isAwaitExpression).find(
          (node) =>
            ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'ready',
        )
  report(
    creation !== undefined &&
      readiness !== undefined &&
      connection !== undefined &&
      mount !== undefined &&
      creation.pos < readiness.pos &&
      readiness.pos < connection.pos &&
      connection.pos < mount.pos &&
      !ts.isAwaitExpression(creation.parent),
    'Kernel must register a synchronous handle, await readiness and connect Router before Mount.',
  )
  const runtime = sources.get(`${owner}/runtime.ts`)
  const runtimeCalls = runtime === undefined ? [] : nodesOf(runtime, ts.isCallExpression)
  report(
    runtimeCalls.filter((call) => callName(call) === 'createI18n').length === 1 &&
      runtimeCalls.some((call) => callName(call) === 'nextTick') &&
      runtimeCalls.some((call) => callName(call) === 'onLocaleCommitted') &&
      runtimeCalls.some((call) => callName(call) === 'dispose'),
    'commit, render-flush and official disposal belong to the same runtime owner.',
  )
  for (const path of paths.filter((path) => path.endsWith('.ts')))
    report(
      !/\b(?:localStorage|sessionStorage|fetch|setTimeout|setInterval|navigator|createPinia|defineStore|useI18n)\b|\$t\b/u.test(
        textAt(path),
      ),
      `${path}: unadmitted locale source, store, retry or side effect.`,
    )
  const portPath = 'apps/web/src/app/storage/locale-preference-storage.ts'
  const port = sources.get(portPath)
  const portCalls = port === undefined ? [] : nodesOf(port, ts.isCallExpression)
  report(
    isDeepStrictEqual(
      applicationConfig.localization.preferenceStorageKey,
      'pavp:web:locale-preference',
    ) &&
      portCalls.some((call) => callName(call) === 'setItem') &&
      portCalls.some((call) => callName(call) === 'getItem') &&
      portCalls.some(
        (call) =>
          ts.isPropertyAccessExpression(call.expression) &&
          call.expression.expression.getText() === 'localePreferenceSchema' &&
          call.expression.name.text === 'safeParse',
      ) &&
      !portCalls.some((call) => callName(call) === 'removeItem' || callName(call) === 'clear'),
    'the Storage port must use the canonical schema and preserve the stored preference.',
  )
  const html = await readFile(resolve(root, 'apps/web/index.html'), 'utf8')
  report(
    /<html\b[^>]*\blang="zh-CN"[^>]*\bdir="ltr"/u.test(html),
    'HTML must use the safe Chinese default and ltr direction.',
  )
  const appearance = textAt('apps/web/src/pages/appearance.vue')
  report(
    appearance.includes(':model-value="pendingLocale ?? locale"') &&
      appearance.includes(':aria-busy="pendingLocale !== null"') &&
      switchConsumers.get('apps/web/src/pages/appearance.vue') === 1 &&
      appearance.indexOf('data-appearance-axis="motion"') <
        appearance.indexOf(':model-value="pendingLocale ?? locale"') &&
      appearance.indexOf(':model-value="pendingLocale ?? locale"') <
        appearance.indexOf("t('appearance.reset')"),
    'the one language control must expose pending intent in its admitted position.',
  )
  report(
    textAt('apps/web/src/App.vue').includes(':locale="locale"') &&
      textAt('apps/web/src/app/console/ConsoleRouteFrame.vue').includes(
        'readonly UiAdminNavigationGroup[]',
      ),
    'App and the actual reactive Shell consumer must retain checked semantic inputs.',
  )
  const privateProviderPath = 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue'
  const privateProvider = await readFile(resolve(root, privateProviderPath), 'utf8')
  const providerSfc = compiler.parse(privateProvider, { filename: privateProviderPath })
  const providerScript = parseSource(
    privateProviderPath,
    providerSfc.descriptor.scriptSetup?.content ?? '',
  )
  const providerLocaleImports = nodesOf(providerScript, ts.isImportDeclaration).flatMap((node) =>
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text.startsWith('naive-ui/es/locales/')
      ? [`${node.importClause?.name?.text ?? ''}:${node.moduleSpecifier.text}`]
      : [],
  )
  report(
    equalSet(providerLocaleImports, [
      'zhCN:naive-ui/es/locales/common/zhCN',
      'enUS:naive-ui/es/locales/common/enUS',
      'dateZhCN:naive-ui/es/locales/date/zhCN',
      'dateEnUS:naive-ui/es/locales/date/enUS',
    ]),
    'Four exact common/date locale imports belong to the existing private provider.',
  )
  function checkProvider(node: TemplateNode): void {
    if (node.tag === 'NConfigProvider') {
      const bindings = new Map(
        (node.props ?? [])
          .filter((prop) => prop.name === 'bind')
          .map((prop) => [prop.arg?.content, prop.exp?.content]),
      )
      report(
        bindings.get('locale') === "locale === 'zh-CN' ? zhCN : enUS" &&
          bindings.get('date-locale') === "locale === 'zh-CN' ? dateZhCN : dateEnUS",
        'Naive common and date locales must project the same committed input.',
      )
    }
    for (const child of node.children ?? []) checkProvider(child)
  }
  if (providerSfc.descriptor.template?.ast !== undefined)
    checkProvider(providerSfc.descriptor.template.ast)
  const uiProvider = await readFile(
    resolve(root, 'packages/ui/src/providers/UiProvider.vue'),
    'utf8',
  )
  const uiShell = await readFile(
    resolve(root, 'packages/ui/src/components/UiAdminShell.vue'),
    'utf8',
  )
  report(
    uiProvider.includes('readonly locale: UiLocale') &&
      uiProvider.includes(':locale="locale"') &&
      uiShell.includes('readonly copy: UiAdminShellCopy'),
    'locale and translated Shell copy remain required semantic UI props.',
  )
  for (const locale of locales) {
    const label =
      catalogs.get(`${owner}/messages/${locale}/common.json`)?.['i18n.language-label'] ?? ''
    report(
      label.includes('语言') && label.includes('Language'),
      `${locale}: language accessible label must identify both languages.`,
    )
  }
  return violations
}
