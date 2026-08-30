import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, relative, resolve } from 'node:path'

import ts from 'typescript'

import { routeRegistry } from '../../apps/web/src/app/router/route-registry'
import {
  uiPublicComponentRegistry,
  type UiPublicComponentRegistry,
  type UiPublicComponentRegistryRecord,
  type UiPublicEmitContract,
  type UiPublicPropContract,
  type UiPublicSlotContract,
} from '../../packages/ui/src/registry/ui-public-component-registry'

const rootDirectory = process.cwd()
const uiSourceDirectory = resolve(rootDirectory, 'packages/ui/src')
const uiProviderPath = 'packages/ui/src/providers/UiProvider.vue'
const uiAdminShellPath = 'packages/ui/src/components/UiAdminShell.vue'
const overlayRootId = 'pavp-overlay-root'
const overlayTarget = `#${overlayRootId}`

interface VueTemplateProperty {
  readonly type: number
  readonly name?: string
  readonly value?: {
    readonly content?: string
  }
  readonly arg?: {
    readonly content?: string
  }
  readonly exp?: {
    readonly content?: string
  }
}

interface VueTemplateNode {
  readonly type: number
  readonly tag?: string
  readonly props?: readonly VueTemplateProperty[]
  readonly children?: readonly VueTemplateNode[]
}

interface VueSfcCompiler {
  readonly parse: (
    source: string,
    options: Readonly<{ filename: string }>,
  ) => {
    readonly descriptor: {
      readonly template: {
        readonly ast?: VueTemplateNode
      } | null
    }
    readonly errors: readonly unknown[]
  }
}

interface ParsedVueTemplate {
  readonly path: string
  readonly root: VueTemplateNode
}

interface OverlayNegativeProbeResult {
  readonly id: string
  readonly expectedFailureCode: string
  readonly passed: boolean
}

const requireFromWeb = createRequire(resolve(rootDirectory, 'apps/web/package.json'))
const vueSfcCompiler = requireFromWeb('vue/compiler-sfc') as VueSfcCompiler

function scriptContent(source: string): string {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
    .map((match) => match[1] ?? '')
    .join('\n')
}

function sourceFile(path: string, source: string): ts.SourceFile {
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function isVueElement(node: VueTemplateNode): node is VueTemplateNode & {
  readonly tag: string
  readonly props: readonly VueTemplateProperty[]
  readonly children: readonly VueTemplateNode[]
} {
  return node.type === 1 && node.tag !== undefined && node.props !== undefined
}

function walkVueElements(
  node: VueTemplateNode,
  visit: (
    element: VueTemplateNode & {
      readonly tag: string
      readonly props: readonly VueTemplateProperty[]
      readonly children: readonly VueTemplateNode[]
    },
  ) => void,
): void {
  if (isVueElement(node)) {
    visit(node)
  }

  for (const child of node.children ?? []) {
    walkVueElements(child, visit)
  }
}

function staticAttribute(
  element: VueTemplateNode & { readonly props: readonly VueTemplateProperty[] },
  name: string,
): string | undefined {
  const attribute = element.props.find((property) => property.type === 6 && property.name === name)
  return attribute?.value?.content
}

function propertyTargetsName(property: VueTemplateProperty, name: string): boolean {
  return (
    (property.type === 6 && property.name === name) ||
    (property.type === 7 && property.name === 'bind' && property.arg?.content === name)
  )
}

function hasAttributeOrBinding(
  element: VueTemplateNode & { readonly props: readonly VueTemplateProperty[] },
  name: string,
): boolean {
  return element.props.some((property) => propertyTargetsName(property, name))
}

function stringLiteralExpression(expression: string | undefined): string | undefined {
  if (expression === undefined) {
    return undefined
  }

  const parsed = sourceFile('overlay-expression.ts', `const value = ${expression}`)
  const statement = parsed.statements[0]

  if (statement === undefined || !ts.isVariableStatement(statement)) {
    return undefined
  }

  const initializer = statement.declarationList.declarations[0]?.initializer

  return initializer !== undefined &&
    (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))
    ? initializer.text
    : undefined
}

function resolvedAttribute(
  element: VueTemplateNode & { readonly props: readonly VueTemplateProperty[] },
  name: string,
): string | undefined {
  for (const property of element.props) {
    if (property.type === 6 && property.name === name) {
      return property.value?.content
    }

    if (property.type === 7 && property.name === 'bind' && property.arg?.content === name) {
      return stringLiteralExpression(property.exp?.content)
    }
  }

  return undefined
}

function hasStructuralCondition(
  element: VueTemplateNode & { readonly props: readonly VueTemplateProperty[] },
): boolean {
  return element.props.some(
    (property) =>
      property.type === 7 &&
      (property.name === 'if' ||
        property.name === 'else-if' ||
        property.name === 'else' ||
        property.name === 'for'),
  )
}

function containsElementTag(node: VueTemplateNode, tag: string): boolean {
  let found = false

  walkVueElements(node, (element) => {
    if (element.tag === tag) {
      found = true
    }
  })

  return found
}

function parseVueTemplate(path: string, source: string): ParsedVueTemplate | string {
  const parsed = vueSfcCompiler.parse(source, { filename: path })

  if (parsed.errors.length > 0) {
    const details = parsed.errors
      .map((error) => (error instanceof Error ? error.message : String(error)))
      .join('; ')
    return `OVERLAY_SFC_PARSE: ${path}: ${details}`
  }

  const root = parsed.descriptor.template?.ast

  return root === undefined
    ? `OVERLAY_SFC_PARSE: ${path}: Vue template AST is unavailable.`
    : { path, root }
}

async function collectVueFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectVueFiles(path)
      }

      return entry.isFile() && entry.name.endsWith('.vue') ? [path] : []
    }),
  )

  return nestedFiles.flat().sort()
}

async function loadOverlaySourceMap(): Promise<ReadonlyMap<string, string>> {
  const files = (
    await Promise.all(
      ['apps', 'packages'].map((directory) => collectVueFiles(resolve(rootDirectory, directory))),
    )
  ).flat()
  const sources = new Map<string, string>()

  for (const path of files) {
    sources.set(relative(rootDirectory, path), await readFile(path, 'utf8'))
  }

  const indexPath = resolve(rootDirectory, 'apps/web/index.html')
  const indexSource = (await readFile(indexPath, 'utf8')).replace(/<!doctype html>\s*/iu, '')
  sources.set('apps/web/index.html', `<template>${indexSource}</template>`)

  return sources
}

function conditionalTeleportTemplateRefs(root: VueTemplateNode): ReadonlySet<string> {
  const references = new Set<string>()

  function visit(node: VueTemplateNode, insideTeleport: boolean, conditional: boolean): void {
    if (!isVueElement(node)) {
      for (const child of node.children ?? []) {
        visit(child, insideTeleport, conditional)
      }
      return
    }

    const nextInsideTeleport = insideTeleport || node.tag.toLowerCase() === 'teleport'
    const nextConditional = conditional || (nextInsideTeleport && hasStructuralCondition(node))
    const reference = staticAttribute(node, 'ref')

    if (nextInsideTeleport && nextConditional && reference !== undefined) {
      references.add(reference)
    }

    for (const child of node.children) {
      visit(child, nextInsideTeleport, nextConditional)
    }
  }

  visit(root, false, false)
  return references
}

function hasNullableRefInitializer(call: ts.CallExpression): boolean {
  if (call.arguments.length === 0) {
    return true
  }

  const initializer = call.arguments[0]

  return (
    call.arguments.length === 1 &&
    initializer !== undefined &&
    (initializer.kind === ts.SyntaxKind.NullKeyword ||
      (ts.isIdentifier(initializer) && initializer.text === 'undefined'))
  )
}

function nullableRefDeclarations(source: string): ReadonlySet<string> {
  const parsed = sourceFile('UiAdminShell.vue.ts', scriptContent(source))
  const names = new Set<string>()

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'ref' &&
      node.initializer.typeArguments?.length === 1 &&
      hasNullableRefInitializer(node.initializer)
    ) {
      names.add(node.name.text)
    }

    ts.forEachChild(node, visit)
  }

  visit(parsed)
  return names
}

function unsafeDrawerRefDereferences(
  source: string,
  drawerReferenceNames: ReadonlySet<string>,
): readonly string[] {
  const parsed = sourceFile('UiAdminShell.vue.ts', scriptContent(source))
  const unsafeNames = new Set<string>()

  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      drawerReferenceNames.has(node.expression.text) &&
      node.name.text === 'value'
    ) {
      const parent = node.parent
      const unsafePropertyAccess =
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        parent.questionDotToken === undefined
      const unsafeElementAccess =
        ts.isElementAccessExpression(parent) &&
        parent.expression === node &&
        parent.questionDotToken === undefined
      const unsafeCall =
        ts.isCallExpression(parent) &&
        parent.expression === node &&
        parent.questionDotToken === undefined

      if (
        unsafePropertyAccess ||
        unsafeElementAccess ||
        unsafeCall ||
        ts.isNonNullExpression(parent)
      ) {
        unsafeNames.add(node.expression.text)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(parsed)
  return [...unsafeNames].sort()
}

function overlayContractViolations(sources: ReadonlyMap<string, string>): string[] {
  const violations: string[] = []
  const parsedTemplates: ParsedVueTemplate[] = []

  for (const [path, source] of sources) {
    const parsed = parseVueTemplate(path, source)

    if (typeof parsed === 'string') {
      violations.push(parsed)
    } else {
      parsedTemplates.push(parsed)
    }
  }

  const overlayRoots: readonly {
    readonly path: string
    readonly element: VueTemplateNode & {
      readonly tag: string
      readonly props: readonly VueTemplateProperty[]
      readonly children: readonly VueTemplateNode[]
    }
  }[] = parsedTemplates.flatMap(({ path, root }) => {
    const elements: (typeof overlayRoots)[number][] = []
    walkVueElements(root, (element) => {
      if (resolvedAttribute(element, 'id') === overlayRootId) {
        elements.push({ path, element })
      }
    })
    return elements
  })

  if (overlayRoots.length !== 1) {
    violations.push(
      `OVERLAY_ROOT_COUNT: expected one ${overlayRootId} template root, received ${String(overlayRoots.length)}.`,
    )
  } else if (overlayRoots[0]?.path !== uiProviderPath) {
    violations.push(`OVERLAY_ROOT_OWNER: ${overlayRootId} must be owned by ${uiProviderPath}.`)
  }

  const providerSource = sources.get(uiProviderPath)
  const providerTemplate = parsedTemplates.find(({ path }) => path === uiProviderPath)?.root

  if (providerSource === undefined || providerTemplate === undefined) {
    violations.push(`OVERLAY_ROOT_ORDER: ${uiProviderPath} is unavailable.`)
  } else {
    const topLevelElements = (providerTemplate.children ?? []).filter(isVueElement)
    const rootElement = topLevelElements[0]
    const privateProvider = topLevelElements[1]

    if (
      topLevelElements.length !== 2 ||
      rootElement === undefined ||
      resolvedAttribute(rootElement, 'id') !== overlayRootId ||
      staticAttribute(rootElement, 'id') !== overlayRootId ||
      privateProvider?.tag !== 'PavpNaiveConfigProvider' ||
      !containsElementTag(privateProvider, 'slot')
    ) {
      violations.push(
        'OVERLAY_ROOT_ORDER: UiProvider must render the static overlay root first, then PavpNaiveConfigProvider with its slot.',
      )
    }

    if (rootElement !== undefined && hasStructuralCondition(rootElement)) {
      violations.push(
        'OVERLAY_ROOT_CONDITIONAL: the UiProvider overlay root must be unconditional.',
      )
    }

    if (rootElement !== undefined && hasAttributeOrBinding(rootElement, 'aria-hidden')) {
      violations.push('OVERLAY_ROOT_A11Y: the UiProvider overlay root must not be aria-hidden.')
    }
  }

  for (const { path, root } of parsedTemplates) {
    walkVueElements(root, (element) => {
      if (element.tag.toLowerCase() !== 'teleport') {
        return
      }

      const targetProperties = element.props.filter((property) =>
        propertyTargetsName(property, 'to'),
      )

      if (
        targetProperties.length !== 1 ||
        targetProperties[0]?.type !== 6 ||
        staticAttribute(element, 'to') !== overlayTarget
      ) {
        violations.push(
          `TELEPORT_TARGET: ${path} Teleport must statically target ${overlayTarget}.`,
        )
      }

      if (hasAttributeOrBinding(element, 'defer')) {
        violations.push(`TELEPORT_DEFER: ${path} Teleport must not defer target resolution.`)
      }
    })
  }

  const adminSource = sources.get(uiAdminShellPath)
  const adminTemplate = parsedTemplates.find(({ path }) => path === uiAdminShellPath)?.root

  if (adminSource === undefined || adminTemplate === undefined) {
    violations.push(`DRAWER_REF_CONDITIONAL: ${uiAdminShellPath} is unavailable.`)
  } else {
    const drawerReferenceNames = conditionalTeleportTemplateRefs(adminTemplate)
    const nullableReferences = nullableRefDeclarations(adminSource)

    if (drawerReferenceNames.size === 0) {
      violations.push('DRAWER_REF_CONDITIONAL: no conditional Teleport template refs were found.')
    }

    for (const name of drawerReferenceNames) {
      if (!nullableReferences.has(name)) {
        violations.push(`DRAWER_REF_NULLABLE: ${name} must use a nullable ref declaration.`)
      }
    }

    for (const name of unsafeDrawerRefDereferences(adminSource, drawerReferenceNames)) {
      violations.push(`DRAWER_REF_UNSAFE: ${name}.value is dereferenced without an optional guard.`)
    }
  }

  return [...new Set(violations)]
}

function changedOverlaySource(
  sources: ReadonlyMap<string, string>,
  path: string,
  search: string,
  replacement: string,
): ReadonlyMap<string, string> {
  const changed = new Map(sources)
  const source = sources.get(path)

  if (source !== undefined) {
    changed.set(path, source.replace(search, replacement))
  }

  return changed
}

function runOverlayNegativeProbes(
  baseline: ReadonlyMap<string, string>,
): readonly OverlayNegativeProbeResult[] {
  const providerTemplate = `<template>\n  <div id="${overlayRootId}" />\n  <PavpNaiveConfigProvider :appearance="appearance">\n    <slot />\n  </PavpNaiveConfigProvider>\n</template>`
  const rootAfterSlotTemplate = `<template>\n  <PavpNaiveConfigProvider :appearance="appearance">\n    <slot />\n    <div id="${overlayRootId}" />\n  </PavpNaiveConfigProvider>\n</template>`
  const probes: readonly {
    readonly id: string
    readonly expectedFailureCode: string
    readonly sources: ReadonlyMap<string, string>
  }[] = [
    {
      id: 'overlay-root-after-slot',
      expectedFailureCode: 'OVERLAY_ROOT_ORDER',
      sources: changedOverlaySource(
        baseline,
        uiProviderPath,
        providerTemplate,
        rootAfterSlotTemplate,
      ),
    },
    {
      id: 'second-overlay-root',
      expectedFailureCode: 'OVERLAY_ROOT_COUNT',
      sources: changedOverlaySource(
        baseline,
        uiProviderPath,
        `<div id="${overlayRootId}" />`,
        `<div id="${overlayRootId}" />\n  <div id="${overlayRootId}" />`,
      ),
    },
    {
      id: 'body-teleport',
      expectedFailureCode: 'TELEPORT_TARGET',
      sources: changedOverlaySource(
        baseline,
        uiAdminShellPath,
        `<Teleport to="${overlayTarget}">`,
        '<Teleport to="body">',
      ),
    },
    {
      id: 'conditional-overlay-root',
      expectedFailureCode: 'OVERLAY_ROOT_CONDITIONAL',
      sources: changedOverlaySource(
        baseline,
        uiProviderPath,
        `<div id="${overlayRootId}" />`,
        `<div v-if="true" id="${overlayRootId}" />`,
      ),
    },
    {
      id: 'unguarded-drawer-ref',
      expectedFailureCode: 'DRAWER_REF_UNSAFE',
      sources: changedOverlaySource(
        baseline,
        uiAdminShellPath,
        'drawerClose.value?.focus()',
        'drawerClose.value.focus()',
      ),
    },
  ]

  return probes.map(({ id, expectedFailureCode, sources }) => ({
    id,
    expectedFailureCode,
    passed: overlayContractViolations(sources).some((violation) =>
      violation.startsWith(`${expectedFailureCode}:`),
    ),
  }))
}

function importedNames(source: string, specifier: string): string[] {
  const parsed = sourceFile('source.ts', source)
  return parsed.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== specifier ||
      statement.importClause?.namedBindings === undefined ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      return []
    }

    return statement.importClause.namedBindings.elements.map(
      (element) => element.propertyName?.text ?? element.name.text,
    )
  })
}

function publicComponentExports(source: string): string[] {
  const parsed = sourceFile('index.ts', source)
  return parsed.statements.flatMap((statement) => {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.exportClause === undefined ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      return []
    }

    return statement.exportClause.elements.flatMap((element) =>
      element.propertyName?.text === 'default' && element.name.text.startsWith('Ui')
        ? [element.name.text]
        : [],
    )
  })
}

function macroContractNames(source: string, macroName: string): string[] {
  const parsed = sourceFile('component.ts', scriptContent(source))
  const names = new Set<string>()

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === macroName
    ) {
      const type = node.typeArguments?.[0]

      if (type !== undefined && ts.isTypeLiteralNode(type)) {
        for (const member of type.members) {
          if (ts.isPropertySignature(member) || ts.isMethodSignature(member)) {
            if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) {
              names.add(member.name.text)
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(parsed)
  return [...names].sort()
}

function exactSet(actual: readonly string[], expected: readonly string[]): boolean {
  const left = [...actual].sort()
  const right = [...expected].sort()
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function registeredContractNames(
  records: readonly (UiPublicPropContract | UiPublicEmitContract | UiPublicSlotContract)[],
): string[] {
  return records.map((contract) => contract.name)
}

export async function validateUiPublicComponents(): Promise<string[]> {
  const violations: string[] = []
  const overlaySources = await loadOverlaySourceMap()
  const overlayNegativeProbeResults = runOverlayNegativeProbes(overlaySources)
  const registry: UiPublicComponentRegistry = uiPublicComponentRegistry
  const registryRecords: readonly UiPublicComponentRegistryRecord[] = registry.records
  const indexSource = await readFile(resolve(uiSourceDirectory, 'index.ts'), 'utf8')
  const publicExports = publicComponentExports(indexSource)
  const registeredExports = registryRecords.map((record) => record.exportName)

  if (!exactSet(publicExports, registeredExports)) {
    violations.push('@platform/ui public component exports must exactly equal the UI Registry.')
  }

  if (
    !Object.isFrozen(registry) ||
    !Object.isFrozen(registry.records) ||
    registryRecords.some((record) => record.capabilityStatus !== 'ACTIVE')
  ) {
    violations.push('UI Public Component Registry must be active and deeply immutable.')
  }

  const productRoutes = routeRegistry.filter((record) => record.meta.layout === 'workspace')
  const routeNameBySource = new Map(productRoutes.map((record) => [record.sourcePath, record.name]))
  const directConsumers = new Map<string, string[]>()

  for (const [sourcePath, routeName] of routeNameBySource) {
    const pageSource = scriptContent(await readFile(resolve(rootDirectory, sourcePath), 'utf8'))

    for (const importedName of importedNames(pageSource, '@platform/ui')) {
      const consumers = directConsumers.get(importedName) ?? []
      consumers.push(routeName)
      directConsumers.set(importedName, consumers)
    }
  }

  for (const record of registryRecords) {
    const source = await readFile(resolve(rootDirectory, record.sourcePath), 'utf8')
    const expectedProps = registeredContractNames(record.props)
    const expectedEmits = registeredContractNames(record.emits)
    const expectedSlots = registeredContractNames(record.slots)

    if (!exactSet(macroContractNames(source, 'defineProps'), expectedProps)) {
      violations.push(`${record.exportName}: defineProps contract diverged from the UI Registry.`)
    }

    if (!exactSet(macroContractNames(source, 'defineEmits'), expectedEmits)) {
      violations.push(`${record.exportName}: defineEmits contract diverged from the UI Registry.`)
    }

    if (!exactSet(macroContractNames(source, 'defineSlots'), expectedSlots)) {
      violations.push(`${record.exportName}: defineSlots contract diverged from the UI Registry.`)
    }

    const actualConsumers =
      record.exportName === 'UiProvider' || record.exportName === 'UiAdminShell'
        ? productRoutes.map((route) => route.name)
        : (directConsumers.get(record.exportName) ?? [])

    if (!exactSet(actualConsumers, record.consumerRouteNames)) {
      violations.push(
        `${record.exportName}: actual product-route consumers diverged from Registry.`,
      )
    }

    if (/\b(?:GlobalTheme|GlobalThemeOverrides|N[A-Z][A-Za-z]+)\b/u.test(source)) {
      violations.push(
        `${record.exportName}: public component source leaks a Naive UI type or value.`,
      )
    }
  }

  const adapterFiles = [
    'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    'packages/ui/src/adapters/naive/naive-breadcrumb.ts',
    'packages/ui/src/adapters/naive/naive-button.ts',
    'packages/ui/src/adapters/naive/naive-descriptions.ts',
    'packages/ui/src/adapters/naive/naive-layout.ts',
    'packages/ui/src/adapters/naive/naive-menu.ts',
    'packages/ui/src/adapters/naive/naive-radio.ts',
    'packages/ui/src/adapters/naive/naive-tag.ts',
    'packages/ui/src/adapters/naive/pavp-naive-runtime-context.ts',
    'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
  ] as const
  const actualAdapterFiles = (await readdir(resolve(uiSourceDirectory, 'adapters/naive')))
    .filter((name) => name.endsWith('.ts') || name.endsWith('.vue'))
    .map((name) => `packages/ui/src/adapters/naive/${name}`)

  if (!exactSet(actualAdapterFiles, adapterFiles)) {
    violations.push('Private Naive adapter file inventory diverged from the exact owned set.')
  }

  const runtimeImports: string[] = []

  for (const relativePath of adapterFiles) {
    const rawSource = await readFile(resolve(rootDirectory, relativePath), 'utf8')
    const source = relativePath.endsWith('.vue') ? scriptContent(rawSource) : rawSource
    const parsed = sourceFile(relativePath, source)

    for (const statement of parsed.statements) {
      if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier !== undefined &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        (statement.moduleSpecifier.text === 'naive-ui' ||
          statement.moduleSpecifier.text.startsWith('naive-ui/')) &&
        statement.exportClause !== undefined &&
        ts.isNamedExports(statement.exportClause)
      ) {
        const specifier = statement.moduleSpecifier.text
        runtimeImports.push(
          ...statement.exportClause.elements.flatMap((element) =>
            element.isTypeOnly
              ? []
              : [`${element.propertyName?.text ?? element.name.text}@${specifier}`],
          ),
        )
        continue
      }

      if (!ts.isImportDeclaration(statement)) {
        continue
      }

      const importClause = statement.importClause
      if (
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        (statement.moduleSpecifier.text !== 'naive-ui' &&
          !statement.moduleSpecifier.text.startsWith('naive-ui/')) ||
        importClause === undefined
      ) {
        continue
      }

      if (
        importClause.name !== undefined &&
        importClause.phaseModifier !== ts.SyntaxKind.TypeKeyword
      ) {
        runtimeImports.push(`${importClause.name.text}@${statement.moduleSpecifier.text}`)
      }

      if (
        importClause.namedBindings === undefined ||
        !ts.isNamedImports(importClause.namedBindings)
      ) {
        continue
      }

      for (const element of importClause.namedBindings.elements) {
        const clauseTypeOnly = importClause.phaseModifier === ts.SyntaxKind.TypeKeyword
        const elementTypeOnly = element.getText(parsed).startsWith('type ')
        if (!clauseTypeOnly && !elementTypeOnly) {
          runtimeImports.push(
            `${element.propertyName?.text ?? element.name.text}@${statement.moduleSpecifier.text}`,
          )
        }
      }
    }
  }

  const expectedRuntimeImports = [
    'NBreadcrumb@naive-ui/es/breadcrumb',
    'NBreadcrumbItem@naive-ui/es/breadcrumb',
    'NButton@naive-ui/es/button',
    'NConfigProvider@naive-ui/es/config-provider',
    'NDescriptions@naive-ui/es/descriptions',
    'NDescriptionsItem@naive-ui/es/descriptions',
    'NLayout@naive-ui/es/layout',
    'NLayoutSider@naive-ui/es/layout',
    'NMenu@naive-ui/es/menu',
    'NRadioButton@naive-ui/es/radio',
    'NRadioGroup@naive-ui/es/radio',
    'NTag@naive-ui/es/tag',
    'breadcrumbDark@naive-ui/es/breadcrumb/styles/dark',
    'buttonDark@naive-ui/es/button/styles/dark',
    'commonDark@naive-ui/es/_styles/common/dark',
    'descriptionsDark@naive-ui/es/descriptions/styles/dark',
    'layoutDark@naive-ui/es/layout/styles/dark',
    'menuDark@naive-ui/es/menu/styles/dark',
    'radioDark@naive-ui/es/radio/styles/dark',
    'tagDark@naive-ui/es/tag/styles/dark',
  ]

  if (!exactSet(runtimeImports, expectedRuntimeImports)) {
    violations.push('Private Naive runtime imports diverged from the admitted exact set.')
  }

  const themeSource = await readFile(
    resolve(uiSourceDirectory, 'adapters/naive/pavp-naive-theme.ts'),
    'utf8',
  )

  for (const override of [
    'Breadcrumb',
    'Button',
    'Descriptions',
    'Layout',
    'Menu',
    'Radio',
    'Tag',
  ]) {
    if (!themeSource.includes(`  ${override}: {`)) {
      violations.push(`${override}: required PAVP-to-Naive override map is missing.`)
    }
  }

  violations.push(...overlayContractViolations(overlaySources))

  for (const result of overlayNegativeProbeResults) {
    if (!result.passed) {
      violations.push(`${result.id}: reversible in-memory negative probe did not fail.`)
    }
  }

  return violations
}

if (process.argv[1]?.endsWith('check-ui-public-components.ts')) {
  const violations = await validateUiPublicComponents()

  if (violations.length > 0) {
    throw new Error(violations.join('\n'))
  }

  console.log('UI Public Component check: passed (5/5 overlay negative probes)')
}
