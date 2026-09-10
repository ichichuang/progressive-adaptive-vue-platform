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
const motionAdapterDirectory = 'packages/ui/src/adapters/motion'
const motionAdapterFiles = [
  'packages/ui/src/adapters/motion/AdminNavigationSelectionLens.vue',
  'packages/ui/src/adapters/motion/admin-navigation-dom-max.ts',
  'packages/ui/src/adapters/motion/motion-feature-runtime.ts',
  'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
  'packages/ui/src/adapters/motion/ScrollViewport.vue',
] as const
const forbiddenMotionPublicApi =
  /\b(?:AdminNavigationSelectionLens|WorkspaceTabsSurface|createMotionFeatureRuntime|LayoutGroup|LazyMotion|MotionConfig|MotionPreference|domMax)\b|motion-v|adapters\/motion/u
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

async function collectUiBoundarySourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectUiBoundarySourceFiles(path)
      }

      return entry.isFile() && /\.(?:ts|tsx|vue)$/u.test(entry.name) ? [path] : []
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
  const providerTemplate = `<template>\n  <div id="${overlayRootId}" />\n  <PavpNaiveConfigProvider
    :appearance="appearance"
    :locale="locale"
  >\n    <slot />\n  </PavpNaiveConfigProvider>\n</template>`
  const rootAfterSlotTemplate = `<template>\n  <PavpNaiveConfigProvider
    :appearance="appearance"
    :locale="locale"
  >\n    <slot />\n    <div id="${overlayRootId}" />\n  </PavpNaiveConfigProvider>\n</template>`
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

function macroContractNames(source: string, macroName: string, formContracts = ''): string[] {
  const parsed = sourceFile('component.ts', scriptContent(source))
  const names = new Set<string>()

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === macroName
    ) {
      const argument = node.typeArguments?.[0]
      const type =
        argument !== undefined && ts.isTypeReferenceNode(argument)
          ? sourceFile('form-contracts.ts', formContracts).statements.find(
              (statement) =>
                ts.isInterfaceDeclaration(statement) &&
                statement.name.text === argument.typeName.getText(parsed),
            )
          : argument

      if (type !== undefined && (ts.isTypeLiteralNode(type) || ts.isInterfaceDeclaration(type))) {
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

function macroContractTypes(source: string): string[] {
  const parsed = sourceFile('component.ts', scriptContent(source))
  const contracts: string[] = []

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['defineProps', 'defineEmits', 'defineSlots'].includes(node.expression.text)
    ) {
      const type = node.typeArguments?.[0]

      if (type !== undefined) {
        contracts.push(type.getText(parsed))
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(parsed)
  return contracts
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
  const scrollSource = await readFile(
    resolve(uiSourceDirectory, 'components/UiScrollArea.vue'),
    'utf8',
  )
  const scrollContracts = sourceFile(
    'scroll-contracts.ts',
    await readFile(resolve(uiSourceDirectory, 'components/scroll-contracts.ts'), 'utf8'),
  )
  const scrollController = scrollContracts.statements.find(
    (statement) =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'UiScrollController',
  )
  if (
    scrollController === undefined ||
    !ts.isInterfaceDeclaration(scrollController) ||
    !exactSet(
      scrollController.members.flatMap((member) =>
        member.name === undefined ? [] : [member.name.getText(scrollContracts)],
      ),
      [
        'ownerId',
        'readState',
        'ownsBoundary',
        'readOffset',
        'cancelMotion',
        'scrollTo',
        'scrollBy',
        'scrollToStart',
        'scrollToEnd',
        'scrollToAnchor',
        'dispose',
      ],
    ) ||
    /naive-ui|overlayscrollbars|lenis|ScrollbarInst|containerRef|contentRef|\$el/iu.test(
      scrollContracts.text,
    ) ||
    /_internal\/scrollbar|containerRef|contentRef|n-scrollbar|\$el|requestAnimationFrame|setInterval|scrollIntoView/u.test(
      scriptContent(scrollSource),
    ) ||
    !scrollSource.includes('../adapters/scroll/scroll-enhancement-loader') ||
    !/\.scrollLeft\b/u.test(scrollSource) ||
    !/\.scrollTop\b/u.test(scrollSource) ||
    /PavpScrollbarPrimitive|data-overlayscrollbars-initialize/u.test(scrollSource) ||
    !/onBeforeUnmount\(\s*[\w$]+\.dispose\s*\)/u.test(scriptContent(scrollSource))
  )
    violations.push(
      'Scroll Area must retain the native PAVP viewport/controller, private enhancement and disposable execution contract.',
    )
  const workspaceScrollSource = await readFile(
    resolve(uiSourceDirectory, 'adapters/motion/WorkspaceTabsSurface.vue'),
    'utf8',
  )
  const workspaceTab = sourceFile(
    'contracts.ts',
    await readFile(resolve(uiSourceDirectory, 'components/contracts.ts'), 'utf8'),
  )
    .statements.filter(ts.isInterfaceDeclaration)
    .find((statement) => statement.name.text === 'UiWorkspaceTab')
  const refreshable = workspaceTab?.members
    .filter(ts.isPropertySignature)
    .find((member) => member.name.getText() === 'refreshable')
  if (
    refreshable?.type?.kind !== ts.SyntaxKind.BooleanKeyword ||
    refreshable.questionToken !== undefined ||
    !refreshable.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)
  )
    violations.push('UiWorkspaceTab requires a readonly boolean refreshable display fact.')
  const scrollViewportSource = await readFile(
    resolve(uiSourceDirectory, 'adapters/motion/ScrollViewport.vue'),
    'utf8',
  )
  if (
    !workspaceScrollSource.includes('<UiScrollArea') ||
    !workspaceScrollSource.includes('x-scrollable') ||
    !scrollViewportSource.includes(':layout-scroll=') ||
    !scrollSource.includes('<ScrollViewport') ||
    /scrollLeft\s*(?:=|\+=|-=)|layout-root|containerRef|contentRef/u.test(workspaceScrollSource)
  )
    violations.push(
      'Workspace horizontal reveal must use the Scroll Controller and PAVP-owned Motion geometry.',
    )
  const workspaceTemplate = parseVueTemplate('WorkspaceTabsSurface.vue', workspaceScrollSource)
  if (typeof workspaceTemplate === 'string') violations.push(workspaceTemplate)
  else {
    const menus: (VueTemplateNode & { readonly props: readonly VueTemplateProperty[] })[] = []
    walkVueElements(workspaceTemplate.root, (element) => {
      if (element.tag === 'PavpDropdownPrimitive') menus.push(element)
      if (
        (staticAttribute(element, 'role') === 'tablist' || element.tag === 'LazyMotion') &&
        containsElementTag(element, 'PavpDropdownPrimitive')
      )
        violations.push(
          'Workspace context menu must remain outside the tablist and Motion wrapper.',
        )
    })
    const menu = menus[0]
    if (
      menus.length !== 1 ||
      menu === undefined ||
      staticAttribute(menu, 'trigger') !== 'manual' ||
      staticAttribute(menu, 'to') !== overlayTarget ||
      !['show', 'x', 'y', 'options'].every((name) => hasAttributeOrBinding(menu, name)) ||
      !['update:show', 'clickoutside', 'select'].every((name) =>
        menu.props.some((prop) => prop.name === 'on' && prop.arg?.content === name),
      )
    )
      violations.push(
        'Workspace context menu requires one controlled public manual-position Dropdown.',
      )
    const actionKeys: string[] = []
    const disabledActionKeys: string[] = []
    const script = sourceFile('WorkspaceTabsSurface.vue', scriptContent(workspaceScrollSource))
    function collectActions(node: ts.Node): void {
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText() === 'key' &&
        ts.isStringLiteral(node.initializer)
      ) {
        actionKeys.push(node.initializer.text)
        if (ts.isObjectLiteralExpression(node.parent)) {
          const disabled = node.parent.properties
            .filter(ts.isPropertyAssignment)
            .find((property) => property.name.getText() === 'disabled')
          const field = node.initializer.text === 'refresh' ? 'refreshable' : 'closable'
          if (disabled?.initializer.getText().includes(`.${field}`))
            disabledActionKeys.push(node.initializer.text)
        }
      }
      ts.forEachChild(node, collectActions)
    }
    collectActions(script)
    if (
      !exactSet(actionKeys, ['refresh', 'close']) ||
      !exactSet(disabledActionKeys, ['refresh', 'close']) ||
      !workspaceScrollSource.includes('@contextmenu.prevent=') ||
      !workspaceScrollSource.includes("'ContextMenu'") ||
      !workspaceScrollSource.includes("'F10'") ||
      !workspaceScrollSource.includes('getBoundingClientRect()') ||
      /\b(?:useRouter|useWorkspaceStore|KeepAlive|localStorage|sessionStorage)\b/u.test(
        workspaceScrollSource,
      )
    )
      violations.push(
        'Workspace menu must preserve the two intents, keyboard opening and UI-only ownership.',
      )
    const controls: VueTemplateNode[] = []
    const tablists: VueTemplateNode[] = []
    const labels = new Set<string>()
    walkVueElements(workspaceTemplate.root, (element) => {
      if (staticAttribute(element, 'role') === 'tablist') tablists.push(element)
      const label = element.props.find(
        (property) => property.name === 'bind' && property.arg?.content === 'aria-label',
      )?.exp?.content
      if (label !== 'previousLabel' && label !== 'nextLabel') return
      controls.push(element)
      labels.add(label)
      if (
        element.tag !== 'm.button' ||
        staticAttribute(element, 'type') !== 'button' ||
        hasAttributeOrBinding(element, 'role') ||
        !hasAttributeOrBinding(element, 'disabled') ||
        hasAttributeOrBinding(element, 'tabindex') ||
        hasStructuralCondition(element)
      )
        violations.push(
          'Workspace adjacent activation controls must remain visible native buttons with disabled semantics.',
        )
    })
    if (controls.length !== 2 || labels.size !== 2 || tablists.length !== 1)
      violations.push(
        'Workspace Tabs require two localized adjacent controls and one manual tablist.',
      )
    for (const tablist of tablists)
      walkVueElements(tablist, (element) => {
        if (controls.includes(element))
          violations.push('Workspace adjacent activation controls must remain outside the tablist.')
      })
    let fixedRegionCount = 0
    walkVueElements(workspaceTemplate.root, (element) => {
      const children = element.children.filter(isVueElement)
      if (
        children.length === 3 &&
        children[0] !== undefined &&
        controls.includes(children[0]) &&
        children[2] !== undefined &&
        controls.includes(children[2]) &&
        children[1] !== undefined &&
        containsElementTag(children[1], 'UiScrollArea')
      )
        fixedRegionCount += 1
    })
    if (fixedRegionCount !== 1)
      violations.push(
        'Workspace adjacent controls must flank the central scroll viewport as fixed siblings.',
      )
  }
  const publicExports = publicComponentExports(indexSource)
  const registeredExports = registryRecords.map((record) => record.exportName)
  const formContracts = await readFile(
    resolve(uiSourceDirectory, 'components/form-contracts.ts'),
    'utf8',
  )
  const inactiveForms = new Set(['UiForm', 'UiFormField'])
  const parsedFormContracts = sourceFile('form-contracts.ts', formContracts)
  const formInterfaces = parsedFormContracts.statements.filter(ts.isInterfaceDeclaration)
  const compactType = (value: string): string => value.replace(/\s+/gu, '')
  for (const component of ['UiForm', 'UiFormField']) {
    const record = registryRecords.find((record) => record.exportName === component)
    const props = formInterfaces.find((node) => node.name.text === `${component}Props`)
    const slots = formInterfaces.find((node) => node.name.text === `${component}Slots`)
    if (record === undefined || props === undefined || slots === undefined) {
      violations.push(
        `${component}: exact generic props, slots and inactive source registration are required.`,
      )
      continue
    }
    for (const property of props.members.filter(ts.isPropertySignature)) {
      const contract = record.props.find(
        (prop) => prop.name === property.name.getText(parsedFormContracts),
      )
      if (
        contract?.required !== (property.questionToken === undefined) ||
        compactType(contract.type) !==
          compactType(property.type?.getText(parsedFormContracts) ?? '')
      ) {
        violations.push(
          `${component}: generic prop type/requiredness differs from its registry contract.`,
        )
      }
    }
    for (const property of slots.members.filter(ts.isPropertySignature)) {
      const contract = record.slots.find(
        (slot) => slot.name === property.name.getText(parsedFormContracts),
      )
      const slotType = property.type
      const parameter =
        slotType !== undefined && ts.isFunctionTypeNode(slotType)
          ? slotType.parameters[0]?.type
          : undefined
      if (
        contract?.required !== (property.questionToken === undefined) ||
        compactType(contract.slotPropsType) !==
          compactType(parameter?.getText(parsedFormContracts) ?? '')
      ) {
        violations.push(`${component}: typed slot binding differs from its registry contract.`)
      }
    }
  }
  const formInput = formInterfaces.find((node) => node.name.text === 'UiFormInput')
  if (
    formInput === undefined ||
    ['validation', 'copy', 'onSubmit'].some(
      (name) =>
        !formInput.members.some(
          (member) =>
            ts.isPropertySignature(member) &&
            member.name.getText(parsedFormContracts) === name &&
            member.questionToken === undefined,
        ),
    )
  ) {
    violations.push('UiFormInput must require the real validation port, copy and submit callback.')
  }
  const controller = formInterfaces.find((node) => node.name.text === 'UiFormController')
  if (
    controller === undefined ||
    !exactSet(
      controller.members.flatMap((member) =>
        member.name === undefined ? [] : [member.name.getText(parsedFormContracts)],
      ),
      [
        'formId',
        'draftId',
        'fields',
        'copy',
        'values',
        'dirty',
        'touched',
        'issues',
        'phase',
        'submitting',
        'notice',
        'setValues',
        'blur',
        'validate',
        'submit',
        'reset',
        'replaceInitial',
        'field',
        'dispose',
      ],
    )
  )
    violations.push('UiFormController must retain the bounded Section 21 public surface.')
  if (
    !indexSource.includes("export { useUiForm } from './composables/use-ui-form'") ||
    !indexSource.includes("export type * from './components/form-contracts'")
  ) {
    violations.push(
      'Forms must expose the controller and vendor-independent contracts through the package root.',
    )
  }
  for (const name of ['UiForm', 'UiFormField']) {
    const source = await readFile(resolve(uiSourceDirectory, `components/${name}.vue`), 'utf8')
    const expectedGeneric = name === 'UiForm' ? 'I' : 'I, K extends UiFormKey<I>'
    if (
      !source.includes(`generic="${expectedGeneric}"`) ||
      !macroContractTypes(source).includes(`${name}Props<${name === 'UiForm' ? 'I' : 'I, K'}>`) ||
      !macroContractTypes(source).includes(`${name}Slots<${name === 'UiForm' ? 'I' : 'I, K'}>`)
    ) {
      violations.push(`${name}: public SFC must preserve the admitted generic props and slots.`)
    }
  }
  for (const name of ['PavpNaiveForm', 'PavpNaiveFormField', 'PavpNaiveFormControl']) {
    const path = `packages/ui/src/adapters/naive/${name}.vue`
    const source = await readFile(resolve(rootDirectory, path), 'utf8')
    const template = parseVueTemplate(path, source)
    if (typeof template === 'string') {
      violations.push(template)
      continue
    }
    let forms = 0
    walkVueElements(template.root, (element) => {
      if (element.tag === 'form' || element.tag === 'NForm') {
        forms += 1
        if (
          name !== 'PavpNaiveForm' ||
          element.tag !== 'NForm' ||
          !hasAttributeOrBinding(element, 'novalidate')
        ) {
          violations.push('Only PavpNaiveForm may own the single native novalidate form boundary.')
        }
      }
      if (
        (element.tag === 'NForm' || element.tag === 'NFormItem') &&
        ['rules', 'rule', 'model'].some((prop) => hasAttributeOrBinding(element, prop))
      ) {
        violations.push(
          'Naive forms may project feedback but must not own domain rules or a second model.',
        )
      }
      if (element.tag === 'NSelect' || element.tag === 'NDatePicker') {
        if (resolvedAttribute(element, 'to') !== overlayTarget)
          violations.push(`${name}: form popups must use the existing overlay root.`)
      }
    })
    if (forms !== (name === 'PavpNaiveForm' ? 1 : 0))
      violations.push(`${name}: native form boundary count diverged.`)
    if (/\.(?:restoreValidation|validate)\s*\(/u.test(scriptContent(source)))
      violations.push(`${name}: vendor validation methods are forbidden.`)
  }

  if (
    ts
      .preProcessFile(indexSource, true, true)
      .importedFiles.some(
        ({ fileName }) =>
          fileName === 'motion-v' ||
          fileName.startsWith('motion-v/') ||
          fileName.includes('/adapters/motion/'),
      )
  ) {
    violations.push('@platform/ui public root may not export the private Motion adapter.')
  }

  const uiPackageManifest = JSON.parse(
    await readFile(resolve(rootDirectory, 'packages/ui/package.json'), 'utf8'),
  ) as { readonly exports?: unknown }
  const uiPackageExports = uiPackageManifest.exports

  if (
    typeof uiPackageExports !== 'object' ||
    uiPackageExports === null ||
    Array.isArray(uiPackageExports) ||
    !exactSet(Object.keys(uiPackageExports), ['.'])
  ) {
    violations.push('@platform/ui package exports must remain limited to the public root.')
  }

  const registrySource = await readFile(
    resolve(uiSourceDirectory, 'registry/ui-public-component-registry.ts'),
    'utf8',
  )

  if (
    forbiddenMotionPublicApi.test(registrySource) ||
    registryRecords.some(
      (record) =>
        record.sourcePath.startsWith(`${motionAdapterDirectory}/`) ||
        /motion/iu.test(record.exportName),
    )
  ) {
    violations.push('Private Admin Navigation Motion must not enter the UI Public Registry.')
  }

  if (!exactSet(publicExports, registeredExports)) {
    violations.push('@platform/ui public component exports must exactly equal the UI Registry.')
  }

  if (
    !Object.isFrozen(registry) ||
    !Object.isFrozen(registry.records) ||
    registryRecords.some((record) =>
      inactiveForms.has(record.exportName)
        ? record.capabilityStatus !== 'TARGET_INACTIVE' ||
          record.consumerRouteNames.length !== 0 ||
          record.sourcePath !== `packages/ui/src/components/${record.exportName}.vue`
        : record.capabilityStatus !== 'ACTIVE' || record.consumerRouteNames.length === 0,
    )
  ) {
    violations.push(
      'UI Registry must preserve ACTIVE consumers and exactly two unconsumed TARGET_INACTIVE forms.',
    )
  }

  const productRoutes = routeRegistry.filter((record) => record.meta.layout === 'workspace')
  const routeNameBySource = new Map(productRoutes.map((record) => [record.sourcePath, record.name]))
  const directConsumers = new Map<string, string[]>()
  const workspaceFrame = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/console/ConsoleRouteFrame.vue'),
    'utf8',
  )
  const shellScrollSource = await readFile(resolve(rootDirectory, uiAdminShellPath), 'utf8')
  if (
    shellScrollSource.includes("import UiScrollArea from './UiScrollArea.vue'") &&
    shellScrollSource.includes('owner-id="architecture-console-content"')
  )
    directConsumers.set(
      'UiScrollArea',
      productRoutes.map((route) => route.name),
    )
  if (
    importedNames(scriptContent(workspaceFrame), '@platform/ui').includes('UiWorkspaceTabs') &&
    [...workspaceFrame.matchAll(/<UiWorkspaceTabs\b/gu)].length === 1
  )
    directConsumers.set(
      'UiWorkspaceTabs',
      productRoutes.map((route) => route.name),
    )

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

    const importedContracts = inactiveForms.has(record.exportName) ? formContracts : ''
    if (!exactSet(macroContractNames(source, 'defineProps', importedContracts), expectedProps)) {
      violations.push(`${record.exportName}: defineProps contract diverged from the UI Registry.`)
    }

    if (!exactSet(macroContractNames(source, 'defineEmits'), expectedEmits)) {
      violations.push(`${record.exportName}: defineEmits contract diverged from the UI Registry.`)
    }

    if (!exactSet(macroContractNames(source, 'defineSlots', importedContracts), expectedSlots)) {
      violations.push(`${record.exportName}: defineSlots contract diverged from the UI Registry.`)
    }

    if (macroContractTypes(source).some((contract) => forbiddenMotionPublicApi.test(contract))) {
      violations.push(`${record.exportName}: public macro contract leaks private Motion API.`)
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
    'packages/ui/src/adapters/naive/PavpNaiveForm.vue',
    'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    'packages/ui/src/adapters/naive/PavpNaiveFormControl.vue',
    'packages/ui/src/adapters/naive/use-form-control.ts',
    'packages/ui/src/adapters/naive/naive-breadcrumb.ts',
    'packages/ui/src/adapters/naive/naive-button.ts',
    'packages/ui/src/adapters/naive/naive-descriptions.ts',
    'packages/ui/src/adapters/naive/naive-dropdown.ts',
    'packages/ui/src/adapters/naive/naive-icon.ts',
    'packages/ui/src/adapters/naive/naive-layout.ts',
    'packages/ui/src/adapters/naive/naive-menu.ts',
    'packages/ui/src/adapters/naive/naive-radio.ts',
    'packages/ui/src/adapters/naive/naive-switch.ts',
    'packages/ui/src/adapters/naive/naive-tag.ts',
    'packages/ui/src/adapters/naive/naive-tooltip.ts',
    'packages/ui/src/adapters/naive/pavp-naive-runtime-context.ts',
    'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
  ] as const
  const actualAdapterFiles = (await readdir(resolve(uiSourceDirectory, 'adapters/naive')))
    .filter((name) => name.endsWith('.ts') || name.endsWith('.vue'))
    .map((name) => `packages/ui/src/adapters/naive/${name}`)

  if (!exactSet(actualAdapterFiles, adapterFiles)) {
    violations.push('Private Naive adapter file inventory diverged from the exact owned set.')
  }

  const motionAdapterEntries = await readdir(resolve(rootDirectory, motionAdapterDirectory), {
    withFileTypes: true,
  })
  const actualMotionAdapterEntries = motionAdapterEntries
    .map((entry) => `${motionAdapterDirectory}/${entry.name}`)
    .sort()

  if (
    !exactSet(actualMotionAdapterEntries, motionAdapterFiles) ||
    motionAdapterEntries.some((entry) => !entry.isFile())
  ) {
    violations.push('Private Motion adapter file inventory diverged from the exact owned set.')
  }

  const adapterFileSet = new Set<string>(adapterFiles)
  const boundaryFiles = (
    await Promise.all([
      collectUiBoundarySourceFiles(resolve(rootDirectory, 'apps')),
      collectUiBoundarySourceFiles(uiSourceDirectory),
    ])
  ).flat()

  for (const path of boundaryFiles) {
    const relativePath = relative(rootDirectory, path)

    if (adapterFileSet.has(relativePath)) {
      continue
    }

    const rawSource = await readFile(path, 'utf8')
    const source = relativePath.endsWith('.vue') ? scriptContent(rawSource) : rawSource

    if (/\b(?:from\s+|import\s*\()['"]naive-ui(?:\/[^'"]*)?['"]/u.test(source)) {
      violations.push(`${relativePath}: direct Naive import escaped the private adapter boundary.`)
    }
  }

  const runtimeImports: string[] = []

  for (const relativePath of adapterFiles) {
    const rawSource = await readFile(resolve(rootDirectory, relativePath), 'utf8').catch(() => '')

    if (rawSource.length === 0) {
      violations.push(`${relativePath}: required private Naive adapter is missing.`)
      continue
    }

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
        if (statement.isTypeOnly) continue
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
    'zhCN@naive-ui/es/locales/common/zhCN',
    'enUS@naive-ui/es/locales/common/enUS',
    'dateZhCN@naive-ui/es/locales/date/zhCN',
    'dateEnUS@naive-ui/es/locales/date/enUS',
    'NForm@naive-ui/es/form',
    'NFormItem@naive-ui/es/form',
    'NInput@naive-ui/es/input',
    'NInputNumber@naive-ui/es/input-number',
    'NSelect@naive-ui/es/select',
    'NSwitch@naive-ui/es/switch',
    'NSwitch@naive-ui/es/switch', // The admitted Form Control and UiSwitch private adapters.
    'NDatePicker@naive-ui/es/date-picker',
    'NBreadcrumb@naive-ui/es/breadcrumb',
    'NBreadcrumbItem@naive-ui/es/breadcrumb',
    'NButton@naive-ui/es/button',
    'NConfigProvider@naive-ui/es/config-provider',
    'NDescriptions@naive-ui/es/descriptions',
    'NDescriptionsItem@naive-ui/es/descriptions',
    'NDropdown@naive-ui/es/dropdown',
    'NIcon@naive-ui/es/icon',
    'NLayout@naive-ui/es/layout',
    'NLayoutSider@naive-ui/es/layout',
    'NMenu@naive-ui/es/menu',
    'NRadioButton@naive-ui/es/radio',
    'NRadioGroup@naive-ui/es/radio',
    'NTag@naive-ui/es/tag',
    'NTooltip@naive-ui/es/tooltip',
    'breadcrumbDark@naive-ui/es/breadcrumb/styles/dark',
    'buttonDark@naive-ui/es/button/styles/dark',
    'commonDark@naive-ui/es/_styles/common/dark',
    'descriptionsDark@naive-ui/es/descriptions/styles/dark',
    'dropdownDark@naive-ui/es/dropdown/styles/dark',
    'layoutDark@naive-ui/es/layout/styles/dark',
    'menuDark@naive-ui/es/menu/styles/dark',
    'radioDark@naive-ui/es/radio/styles/dark',
    'tagDark@naive-ui/es/tag/styles/dark',
    'tooltipDark@naive-ui/es/tooltip/styles/dark',
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
    'Tooltip',
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
