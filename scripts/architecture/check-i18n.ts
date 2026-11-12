import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { dirname, relative, resolve } from 'node:path'
import { isDeepStrictEqual, TextDecoder } from 'node:util'

import { baseCompile, type NodeTypes } from '@intlify/message-compiler'
import ts from 'typescript'

import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import {
  getRouteMessageScope,
  routeMessageRegistry,
  routeRegistry,
} from '../../apps/web/src/app/router/route-registry'
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
import type { createConsoleI18nRuntime } from '../../apps/web/src/shared/i18n/runtime'
import type { UiLocale } from '../../packages/ui/src/components/contracts'

const messageNodeType: NodeTypes.Message = 2
const namedNodeType: NodeTypes.Named = 4
const textNodeType: NodeTypes.Text = 3
const literalNodeType: NodeTypes.Literal = 9

const root = process.cwd()
const owner = 'apps/web/src/shared/i18n'
const scopes = ['common', 'console', 'appearance', 'capabilities'] as const
const locales = ['zh-CN', 'en'] as const
const expectedParameters = {} as const
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

async function sharedLocalePreferenceProbes(source: string, root: string): Promise<string[]> {
  type RuntimeFactory = typeof createConsoleI18nRuntime
  type Input = Parameters<RuntimeFactory>[0]
  type Loader = Parameters<RuntimeFactory>[1]
  const path = resolve(root, 'apps/web/src/shared/i18n/runtime.ts')
  const requireOwner = createRequire(path)
  const compiled = ts.transpileModule(source.replaceAll('import.meta.env', '({ DEV: false })'), {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
  }).outputText
  const factory: unknown = runInNewContext(
    compiled + '\nexports.createConsoleI18nRuntime',
    {
      exports: {},
      require: requireOwner,
    },
    { timeout: 1000 },
  )
  if (typeof factory !== 'function') return ['Shared locale runtime is unavailable.']
  const createRuntime = factory as RuntimeFactory
  const vue = requireOwner('vue') as { createApp(root: object): Input['application'] }
  const resources = new Map<string, Awaited<ReturnType<Loader>>>()
  for (const locale of ['zh-CN', 'en'])
    for (const scope of ['common', 'console'])
      resources.set(
        locale + '/' + scope,
        JSON.parse(
          await readFile(
            resolve(root, `apps/web/src/shared/i18n/messages/${locale}/${scope}.json`),
            'utf8',
          ),
        ) as Awaited<ReturnType<Loader>>,
      )
  const nextTask = () => new Promise<undefined>((resolve) => setTimeout(resolve, 0))
  const failures: string[] = []
  for (const preference of [
    { status: 'missing' },
    { status: 'unusable', reason: 'unavailable' },
    { status: 'unusable', reason: 'invalid' },
    { status: 'found', locale: 'zh-CN' },
  ] as const) {
    const attributes = new Map<string, string>()
    let writes = 0
    const documentTarget = {
      documentElement: {
        get lang() {
          return attributes.get('lang') ?? ''
        },
        set lang(value: string) {
          attributes.set('lang', value)
        },
        get dir() {
          return attributes.get('dir') ?? ''
        },
        set dir(value: string) {
          attributes.set('dir', value)
        },
        getAttribute: (key: string) => attributes.get(key) ?? null,
        setAttribute: (key: string, value: string) => attributes.set(key, value),
        removeAttribute: (key: string) => attributes.delete(key),
      },
    } as unknown as Document
    const handle = createRuntime(
      {
        application: vue.createApp({ render: () => null }),
        document: documentTarget,
        initialScope: 'console',
        defaultLocale: 'en',
        preference: {
          read: () => preference,
          write: () => {
            writes += 1
            return { status: 'saved' }
          },
          subscribe: () => () => undefined,
        },
        onLocaleCommitted: () => undefined,
      },
      (locale, scope) => {
        const messages = resources.get(locale + '/' + scope)
        if (messages === undefined) throw new Error('Deployment locale fixture is unavailable.')
        return Promise.resolve(messages)
      },
    )
    try {
      const ready = await handle.ready
      if (
        ready.status !== 'ready' ||
        documentTarget.documentElement.lang !== (preference.status === 'found' ? 'zh-CN' : 'en') ||
        writes !== 0
      )
        failures.push(
          `Deployment locale default/override failed for ${JSON.stringify(preference)}.`,
        )
    } finally {
      handle.dispose()
    }
  }
  for (const [phase, outcome, replacement] of [
    ['startup', 'resolve', 'zh-CN'],
    ['startup', 'reject', 'zh-CN'],
    ['ready', 'resolve', 'zh-CN'],
    ['ready', 'reject', 'zh-CN'],
    ['startup', 'resolve', 'en'],
    ['startup', 'reject', 'en'],
  ] as const) {
    const label = `${phase}/${outcome}/${replacement}`
    let preference: ReturnType<Input['preference']['read']> = {
      status: 'found',
      locale: phase === 'startup' ? 'en' : 'zh-CN',
    }
    let invalidate: () => void = () => undefined
    let writes = 0
    let failWrite = false
    let removals = 0
    let announceEnglish: () => void = () => undefined
    const englishStarted = new Promise<void>((resolve) => {
      announceEnglish = resolve
    })
    let releaseEnglish: () => void = () => undefined
    let rejectEnglish: (reason: Error) => void = () => undefined
    const english = new Promise<void>((resolve, reject) => {
      releaseEnglish = resolve
      rejectEnglish = reject
    })
    const attributes = new Map<string, string>()
    const commits: string[] = []
    const documentTarget = {
      documentElement: {
        get lang() {
          return attributes.get('lang') ?? ''
        },
        set lang(value: string) {
          attributes.set('lang', value)
          commits.push(value)
        },
        get dir() {
          return attributes.get('dir') ?? ''
        },
        set dir(value: string) {
          attributes.set('dir', value)
        },
        getAttribute: (key: string) => attributes.get(key) ?? null,
        setAttribute(key: string, value: string) {
          attributes.set(key, value)
          if (key === 'lang') commits.push(value)
        },
        removeAttribute: (key: string) => {
          attributes.delete(key)
        },
      },
    } as unknown as Document
    const handle = createRuntime(
      {
        application: vue.createApp({ render: () => null }),
        document: documentTarget,
        initialScope: 'console',
        preference: {
          read: () => preference,
          write(locale) {
            writes += 1
            if (failWrite) return { status: 'failed' }
            preference = { status: 'found', locale }
            return { status: 'saved' }
          },
          subscribe(listener) {
            invalidate = listener
            listener()
            return () => {
              removals += 1
              invalidate = () => undefined
            }
          },
        },
        onLocaleCommitted: () => undefined,
      },
      async (locale, scope) => {
        if (locale === 'en') {
          announceEnglish()
          await english
        }
        const messages = resources.get(locale + '/' + scope)
        if (messages === undefined) throw new Error('The isolated message fixture is unavailable.')
        return messages
      },
    )
    try {
      if (phase === 'ready') {
        await handle.ready
        preference = { status: 'found', locale: 'en' }
        invalidate()
      }
      const started = await Promise.race([englishStarted.then(() => true), nextTask()])
      if (started !== true) {
        failures.push(`${label}: the pending English choice was not exercised.`)
        continue
      }
      if (replacement === 'zh-CN') {
        preference = { status: 'found', locale: replacement }
        invalidate()
      }
      const early = await Promise.race([handle.ready, nextTask()])
      if (replacement === 'en' && early !== undefined)
        failures.push(
          `${label}: current English selection skipped its required resource readiness.`,
        )
      if (replacement === 'zh-CN' && early?.status !== 'ready')
        failures.push(`${label}: latest Chinese readiness waited for obsolete English loading.`)
      if (outcome === 'resolve') releaseEnglish()
      else rejectEnglish(new Error('Isolated obsolete resource failure.'))
      const final = await handle.ready
      await nextTask()
      if (
        final.status !== 'ready' ||
        final.boundary.locale.value !==
          (replacement === 'en' && outcome === 'resolve' ? 'en' : 'zh-CN') ||
        final.boundary.pendingLocale.value !== null ||
        commits.includes('en') !== (replacement === 'en' && outcome === 'resolve') ||
        (replacement === 'en' && outcome === 'reject'
          ? final.boundary.notice.value !== 'saved-choice-unavailable'
          : ['saved-choice-unavailable', 'message-load-failed'].includes(
              final.boundary.notice.value,
            )) ||
        writes !== 0
      )
        failures.push(
          `${label}: stale locale completion/failure changed presentation, notice or persisted preference.`,
        )
      if (
        phase === 'startup' &&
        outcome === 'resolve' &&
        replacement === 'en' &&
        final.status === 'ready'
      ) {
        const boundary = final.boundary
        if (boundary.notice.value !== 'none')
          failures.push('Remote restoration must be silent and must not claim a local save.')
        preference = { status: 'missing' }
        invalidate()
        await nextTask()
        if (boundary.locale.value !== 'zh-CN' || boundary.notice.value !== 'none' || writes !== 0)
          failures.push('Remote clear must apply the default without a save notice or write.')
        preference = { status: 'found', locale: 'en' }
        invalidate()
        await nextTask()
        preference = { status: 'unusable', reason: 'invalid' }
        invalidate()
        if (
          boundary.locale.value !== 'en' ||
          boundary.notice.value !== 'preference-unavailable' ||
          !boundary.t('i18n.preference-unavailable').includes('last valid') ||
          writes !== 0
        )
          failures.push(
            'Invalid remote preference must accurately report retaining the last valid English locale.',
          )
        preference = { status: 'found', locale: 'en' }
        invalidate()
        await nextTask()
        if (boundary.notice.value !== 'none' || writes !== 0)
          failures.push(
            'A valid remote no-op must clear stale synchronization feedback without saving.',
          )
        const saved = await boundary.switchLocale('zh-CN')
        if (
          saved.status !== 'applied' ||
          saved.persistence !== 'saved' ||
          boundary.notice.value !== 'applied' ||
          writes !== 1
        )
          failures.push('Explicit local save must retain its applied/saved result and notice.')
        preference = { status: 'unusable', reason: 'invalid' }
        invalidate()
        if (
          boundary.locale.value !== 'zh-CN' ||
          !boundary.t('i18n.preference-unavailable').includes('保留')
        )
          failures.push(
            'Invalid preference copy must also describe retaining the valid Chinese locale.',
          )
        failWrite = true
        const failed = await boundary.switchLocale('en')
        if (
          failed.status !== 'applied' ||
          failed.persistence !== 'failed' ||
          boundary.notice.value !== 'not-saved' ||
          writes !== 2
        )
          failures.push(
            'Explicit local persistence failure must retain its applied/not-saved feedback.',
          )
      }
    } finally {
      releaseEnglish()
      handle.dispose()
    }
    if (removals !== 1) failures.push(`${label}: locale preference listener was not released.`)
  }
  return failures
}

// flatJson merges scopes into one message tree: a text leaf cannot also be a namespace.
function flatMessageParentKeys(keys: readonly string[]): readonly string[] {
  return keys.filter((parent) => keys.some((key) => key.startsWith(`${parent}.`)))
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
  report(
    flatMessageParentKeys(['preview.motionLabel', 'preview.motion.full']).length === 0 &&
      flatMessageParentKeys(['preview.motion.full', 'preview.motion']).includes('preview.motion'),
    'flatJson prefix probes must distinguish text leaves from namespaces regardless of key order.',
  )
  for (const locale of locales) {
    const mergedKeys = scopes.flatMap((scope) =>
      Object.keys(catalogs.get(`${owner}/messages/${locale}/${scope}.json`) ?? {}),
    )
    for (const parent of flatMessageParentKeys(mergedKeys))
      report(false, `${locale}: ${parent} is both message text and a flatJson namespace.`)
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
    'the current workbench catalogs do not declare named parameters.',
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
  const usedKeys = new Set<string>()
  for (const route of routeRegistry) {
    const message = routeMessageRegistry.find((record) => record.routeName === route.name)
    report(message !== undefined, `${route.name}: a route presentation message is required.`)
    for (const key of [route.meta.titleKey, route.meta.breadcrumbKey, message?.key]) {
      if (key === null || key === undefined) continue
      report(
        keyScopes.get(key) === 'common',
        `${route.name}: route presentation message ${key} must exist in the common catalog.`,
      )
      usedKeys.add(key)
    }
  }
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
  const routedKeys = [...keyScopes.entries()]
    .filter(([, scope]) => scope !== 'capabilities')
    .map(([key]) => key)
  report(
    equalSet(
      [...usedKeys].filter((key) => keyScopes.has(key) && keyScopes.get(key) !== 'capabilities'),
      routedKeys,
    ),
    `all routed catalog messages must have an actual production reference. Unused: ${routedKeys.filter((key) => !usedKeys.has(key)).join(', ')}`,
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
  const registry = sources.get('apps/web/src/app/router/route-registry.ts')
  const recordReader =
    registry === undefined
      ? undefined
      : nodesOf(registry, ts.isFunctionDeclaration).find(
          (node) => node.name?.text === 'getRouteRecord',
        )
  for (const record of routeRegistry) {
    const declaration: { readonly messageScope?: string } = record
    report(
      scopes.some((scope) => scope === declaration.messageScope) &&
        getRouteMessageScope(record.name) === declaration.messageScope,
      `${record.sourcePath}: route message scope must project its typed declaration.`,
    )
  }
  // Execute the existing public projection against changed declarations, without loading
  // another Router or any browser runtime. Neither names nor breadcrumbs select a scope.
  if (recordReader?.body === undefined || registry === undefined)
    report(false, 'the registered route lookup is unavailable.')
  else {
    // Replace only the public lookup port; retain the whole module so private helpers,
    // names and decomposition remain free to change.
    const text = registry.getFullText()
    const withDeclaration =
      text.slice(0, recordReader.body.getStart(registry)) +
      '{ return scopeRecordForProbe }' +
      text.slice(recordReader.body.end)
    const projection = ts.transpileModule(withDeclaration, {
      compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
    }).outputText
    const context = {
      exports: {},
      require: createRequire(resolve(root, 'apps/web/src/app/router/route-registry.ts')),
      scopeRecordForProbe: {},
    }
    const readScope: unknown = runInNewContext(
      `${projection}\nexports.getRouteMessageScope`,
      context,
      { timeout: 1000 },
    )
    const projectScope =
      typeof readScope === 'function' ? (readScope as (name: unknown) => unknown) : undefined
    for (const scope of scopes) {
      for (const record of routeRegistry) {
        for (const breadcrumbKey of [null, 'unchanged-breadcrumb']) {
          context.scopeRecordForProbe = { ...record, messageScope: scope, meta: { breadcrumbKey } }
          report(
            projectScope?.('renamed-route') === scope,
            'route scope selection must follow declarations independently of page identity or breadcrumb.',
          )
        }
      }
    }
  }
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
  const settingsPath = 'apps/web/src/pages/control-center.vue'
  report(
    equalSet(
      [...switchConsumers.keys()].filter((path) => path.startsWith('apps/web/src/pages/')),
      [settingsPath],
    ) && switchConsumers.get(settingsPath) === 1,
    'the standalone Control Center must own the single page-level language switch.',
  )
  const settings = compiler.parse(textAt(settingsPath), { filename: settingsPath })
  const settingsScript = parseSource(
    settingsPath,
    [settings.descriptor.script?.content, settings.descriptor.scriptSetup?.content].join('\n'),
  )
  const radioOwnerImport = settingsScript.statements
    .filter(
      (node): node is ts.ImportDeclaration =>
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === '@platform/ui',
    )
    .flatMap((node) => {
      const bindings = node.importClause?.namedBindings
      return bindings !== undefined && ts.isNamedImports(bindings) ? [...bindings.elements] : []
    })
    .find((node) => (node.propertyName?.text ?? node.name.text) === 'UiRadioCardGroup')?.name.text
  const languageControls: TemplateNode[] = []
  function collectLanguageControls(node: TemplateNode): void {
    if (
      radioOwnerImport !== undefined &&
      node.tag === radioOwnerImport &&
      node.props?.some((prop) => prop.name === 'bind' && prop.arg?.content === 'aria-busy')
    )
      languageControls.push(node)
    for (const child of node.children ?? []) collectLanguageControls(child)
  }
  if (settings.descriptor.template?.ast !== undefined)
    collectLanguageControls(settings.descriptor.template.ast)
  const languageControl = languageControls[0]
  const languageBindings = new Map(
    (languageControl?.props ?? [])
      .filter((prop) => prop.name === 'bind')
      .map((prop) => [prop.arg?.content, prop.exp?.content]),
  )
  report(
    settings.errors.length === 0 &&
      languageControls.length === 1 &&
      [
        'model-value',
        'options',
        'accessible-label',
        'aria-labelledby',
        'aria-busy',
        'disabled',
      ].every((name) => (languageBindings.get(name)?.trim().length ?? 0) > 0) &&
      ['model-value', 'aria-busy', 'disabled'].every((name) =>
        /\.pendingLocale\b/u.test(languageBindings.get(name) ?? ''),
      ) &&
      languageControl?.props?.some(
        (prop) => prop.name === 'on' && prop.arg?.content === 'update:model-value',
      ) === true,
    'the standalone language radio group must expose its controlled pending choice, visible options, accessible name, busy/disabled state and update action through the existing public component.',
  )
  report(
    textAt('apps/web/src/App.vue').includes(':locale="locale"') &&
      textAt('apps/web/src/app/console/ConsoleRouteFrame.vue').includes(
        'readonly UiAdminNavigationGroup[]',
      ),
    'App and the actual reactive Shell consumer must retain checked semantic inputs.',
  )
  const privateProviderPath = 'packages/ui/src/providers/UiProvider.vue'
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
      uiProvider.includes(':locale="locale === \'zh-CN\' ? zhCN : enUS"') &&
      uiShell.includes('readonly copy: UiAdminShellCopy'),
    'locale and translated Shell copy remain required semantic UI props.',
  )
  for (const locale of locales) {
    const settingsCopy = catalogs.get(`${owner}/messages/${locale}/appearance.json`)
    report(
      settingsCopy !== undefined &&
        Object.keys(settingsCopy).every((key) => key.startsWith('settings.')) &&
        ['settings.language', 'settings.chinese', 'settings.english'].every(
          (key) => (settingsCopy[key]?.trim().length ?? 0) > 0,
        ),
      `${locale}: the settings catalog must contain its real language label and options.`,
    )
  }
  violations.push(
    ...(await sharedLocalePreferenceProbes(sourceText.get(`${owner}/runtime.ts`) ?? '', root)),
  )
  return violations
}
