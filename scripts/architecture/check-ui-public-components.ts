import { readFile, readdir } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'

import ts from 'typescript'

import { componentExampleConsumers } from '../../apps/web/src/app/workbench/component-example-consumers'
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
  'packages/ui/src/adapters/motion/motion-policy.ts',
  'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
  'packages/ui/src/adapters/motion/ScrollViewport.vue',
  'packages/ui/src/adapters/motion/FormValidationFeedback.vue',
  'packages/ui/src/adapters/motion/TableSortIcon.vue',
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
      privateProvider?.tag !== 'NConfigProvider' ||
      !containsElementTag(privateProvider, 'slot')
    ) {
      violations.push(
        'OVERLAY_ROOT_ORDER: UiProvider must render the static overlay root first, then NConfigProvider with its slot.',
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
  const providerTemplate =
    baseline.get(uiProviderPath)?.match(/<template>[\s\S]*?<\/template>/u)?.[0] ?? ''
  const overlayRootTag =
    new RegExp(`<div\\b(?=[^>]*\\bid="${overlayRootId}")[^>]*\\/>`, 'u').exec(
      providerTemplate,
    )?.[0] ?? '<missing-overlay-root>'
  const rootAfterSlotTemplate = providerTemplate
    .replace(overlayRootTag, '')
    .replace('<slot />', `<slot />\n    ${overlayRootTag}`)
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
        overlayRootTag,
        `${overlayRootTag}\n  <div id="${overlayRootId}" />`,
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
        overlayRootTag,
        overlayRootTag.replace('<div', '<div v-if="true"'),
      ),
    },
    {
      id: 'unguarded-drawer-ref',
      expectedFailureCode: 'DRAWER_REF_UNSAFE',
      sources: changedOverlaySource(
        baseline,
        uiAdminShellPath,
        'const drawerClose = ref<InstanceType<typeof NButton>>()',
        'const drawerClose = ref<InstanceType<typeof NButton>>()\ndrawerClose.value.$el.focus()',
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

function uiCondition(expression: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(expression)) expression = expression.expression
  return expression
}

function conditionTerms(expression: ts.Expression): readonly ts.Expression[] {
  const value = uiCondition(expression)
  return ts.isBinaryExpression(value) &&
    value.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ? [...conditionTerms(value.left), ...conditionTerms(value.right)]
    : [value]
}

function conditionEquality(
  expression: ts.Expression,
  matches: (value: ts.Expression) => boolean,
  expected: string | number | boolean | null,
): boolean {
  const value = uiCondition(expression)
  if (
    !ts.isBinaryExpression(value) ||
    value.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
  )
    return false
  const literalMatches = (expression: ts.Expression): boolean => {
    const candidate = uiCondition(expression)
    return (
      (ts.isStringLiteral(candidate) && candidate.text === expected) ||
      (ts.isNumericLiteral(candidate) && Number(candidate.text) === expected) ||
      (candidate.kind === ts.SyntaxKind.TrueKeyword && expected === true) ||
      (candidate.kind === ts.SyntaxKind.NullKeyword && expected === null)
    )
  }
  return (
    (matches(uiCondition(value.left)) && literalMatches(value.right)) ||
    (literalMatches(value.left) && matches(uiCondition(value.right)))
  )
}

function workspaceMenuDismissalViolations(source: string): string[] {
  const handler = /@clickoutside="([\w$]+)"/u.exec(source)?.[1]
  const parsed = sourceFile('WorkspaceTabsSurface.vue', scriptContent(source))
  const dismiss = parsed.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === handler,
  )
  const event = dismiss?.parameters[0]?.name.getText()
  const guards = dismiss?.body?.statements.filter(ts.isIfStatement) ?? []
  const gesture = guards.find((guard) => {
    const then = guard.thenStatement
    if (ts.isReturnStatement(then)) return true
    if (!ts.isBlock(then) || then.statements.length !== 1) return false
    const statement = then.statements[0]
    return statement !== undefined && ts.isReturnStatement(statement)
  })
  const terms = gesture === undefined ? [] : conditionTerms(gesture.expression)
  const eventProperty = (value: ts.Expression, name: string): boolean =>
    ts.isPropertyAccessExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === event &&
    value.name.text === name
  const path = terms.find(
    (term) =>
      ts.isCallExpression(term) &&
      ts.isPropertyAccessExpression(term.expression) &&
      term.expression.name.text === 'some' &&
      ts.isCallExpression(term.expression.expression) &&
      ts.isPropertyAccessExpression(term.expression.expression.expression) &&
      term.expression.expression.expression.name.text === 'composedPath' &&
      ts.isIdentifier(term.expression.expression.expression.expression) &&
      term.expression.expression.expression.expression.text === event,
  )
  const callback = path !== undefined && ts.isCallExpression(path) ? path.arguments[0] : undefined
  const target =
    callback !== undefined && ts.isArrowFunction(callback)
      ? callback.parameters[0]?.name.getText()
      : undefined
  const callbackExpression =
    callback !== undefined && ts.isArrowFunction(callback)
      ? ts.isBlock(callback.body)
        ? callback.body.statements.find(ts.isReturnStatement)?.expression
        : callback.body
      : undefined
  const targetTerms = callbackExpression === undefined ? [] : conditionTerms(callbackExpression)
  const targetCall = (value: ts.Expression, name: string, argument?: string): boolean =>
    ts.isCallExpression(value) &&
    ts.isPropertyAccessExpression(value.expression) &&
    value.expression.name.text === name &&
    ts.isIdentifier(value.expression.expression) &&
    value.expression.expression.text === target &&
    (argument === undefined ||
      (value.arguments[0] !== undefined &&
        ts.isStringLiteral(value.arguments[0]) &&
        value.arguments[0].text === argument))
  const localRefs = nullableRefDeclarations(source)
  const currentItems = new Set(
    dismiss?.body?.statements.flatMap((statement) =>
      ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.flatMap((declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.initializer !== undefined &&
            ts.isPropertyAccessExpression(declaration.initializer) &&
            declaration.initializer.name.text === 'value'
              ? [declaration.name.text]
              : [],
          )
        : [],
    ) ?? [],
  )
  const containsTarget = (value: ts.Expression): boolean => {
    if (
      !ts.isCallExpression(value) ||
      !ts.isPropertyAccessExpression(value.expression) ||
      value.expression.name.text !== 'contains'
    )
      return false
    const owner = value.expression.expression
    const argument = value.arguments[0]
    return (
      ts.isPropertyAccessExpression(owner) &&
      owner.name.text === 'value' &&
      ts.isIdentifier(owner.expression) &&
      localRefs.has(owner.expression.text) &&
      argument !== undefined &&
      ts.isIdentifier(argument) &&
      argument.text === target
    )
  }
  const liveTarget = (value: ts.Expression): boolean => targetCall(value, 'closest', '[inert]')
  const currentTab = targetTerms.some((term) => {
    if (
      !ts.isBinaryExpression(term) ||
      term.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
    )
      return false
    const queryId = (value: ts.Expression): boolean =>
      ts.isPropertyAccessExpression(value) &&
      value.name.text === 'id' &&
      targetCall(uiCondition(value.expression), 'querySelector', '[role="tab"]')
    const currentId = (value: ts.Expression): boolean =>
      ts.isTemplateExpression(value) &&
      value.head.text === '' &&
      value.templateSpans.length === 1 &&
      value.templateSpans[0]?.literal.text === '-tab' &&
      ts.isPropertyAccessExpression(value.templateSpans[0].expression) &&
      value.templateSpans[0].expression.name.text === 'id' &&
      ts.isIdentifier(value.templateSpans[0].expression.expression) &&
      currentItems.has(value.templateSpans[0].expression.expression.text)
    return (
      (queryId(uiCondition(term.left)) && currentId(uiCondition(term.right))) ||
      (currentId(uiCondition(term.left)) && queryId(uiCondition(term.right)))
    )
  })
  // The exemption belongs to an owned, live target and a right-button release, never all outside input.
  if (
    event === undefined ||
    !terms.some((term) =>
      conditionEquality(term, (value) => eventProperty(value, 'type'), 'mouseup'),
    ) ||
    !terms.some((term) => conditionEquality(term, (value) => eventProperty(value, 'button'), 2)) ||
    !targetTerms.some(
      (term) => containsTarget(term) || conditionEquality(term, containsTarget, true),
    ) ||
    !targetTerms.some(
      (term) =>
        conditionEquality(term, liveTarget, null) ||
        (ts.isPrefixUnaryExpression(term) &&
          term.operator === ts.SyntaxKind.ExclamationToken &&
          liveTarget(uiCondition(term.operand))),
    ) ||
    !currentTab
  )
    return ['WORKSPACE_MENU_OWNED_CONTEXT_GESTURE']
  return []
}

function mainContentFillViolations(source: string): string[] {
  const template = parseVueTemplate('UiScrollArea.vue', source)
  if (typeof template === 'string') return [template]
  const violations: string[] = []
  const localRefs = nullableRefDeclarations(source)
  const parsed = sourceFile('UiScrollArea.vue.ts', scriptContent(source))
  const enhancementContentRefs = new Set<string>()
  function contentRefRead(expression: ts.Expression): string | undefined {
    const value = uiCondition(expression)
    return ts.isPropertyAccessExpression(value) &&
      value.name.text === 'value' &&
      ts.isIdentifier(value.expression)
      ? value.expression.text
      : undefined
  }
  function inspectEnhancement(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'createScrollEnhancement'
    ) {
      const options = node.arguments[0]
      const content =
        options !== undefined && ts.isObjectLiteralExpression(options)
          ? options.properties.find(
              (property): property is ts.PropertyAssignment =>
                ts.isPropertyAssignment(property) &&
                (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
                property.name.text === 'content',
            )?.initializer
          : undefined
      let reference = content === undefined ? undefined : contentRefRead(content)
      if (content !== undefined && ts.isIdentifier(content)) {
        // Resolve the one local DOM alias passed to the public enhancement API.
        // The nearest lexical declaration owns it; no private identifier is prescribed.
        for (let scope: ts.Node = node.parent; !ts.isSourceFile(scope); scope = scope.parent) {
          if (ts.isBlock(scope)) {
            const binding = scope.statements
              .flatMap((statement) =>
                ts.isVariableStatement(statement)
                  ? [...statement.declarationList.declarations]
                  : [],
              )
              .find(
                (declaration) =>
                  declaration.pos < node.pos &&
                  ts.isIdentifier(declaration.name) &&
                  declaration.name.text === content.text,
              )
            if (binding !== undefined) {
              reference =
                binding.initializer === undefined ? undefined : contentRefRead(binding.initializer)
              break
            }
          }
          if (
            ts.isFunctionDeclaration(scope) ||
            ts.isFunctionExpression(scope) ||
            ts.isArrowFunction(scope) ||
            ts.isMethodDeclaration(scope)
          )
            break
        }
      }
      enhancementContentRefs.add(reference ?? '')
    }
    ts.forEachChild(node, inspectEnhancement)
  }
  inspectEnhancement(parsed)
  const contentRef = enhancementContentRefs.size === 1 ? [...enhancementContentRefs][0] : undefined
  const mainContentOwners: VueTemplateNode[] = []
  walkVueElements(template.root, (element) => {
    if (!hasAttributeOrBinding(element, 'data-main-content')) return
    mainContentOwners.push(element)
    const marker = element.props.find((property) =>
      propertyTargetsName(property, 'data-main-content'),
    )
    if (
      element.tag !== 'div' ||
      contentRef === undefined ||
      !localRefs.has(contentRef) ||
      staticAttribute(element, 'ref') !== contentRef ||
      staticAttribute(element, 'class') !== 'pavp-scroll-area__content' ||
      marker?.type !== 7 ||
      marker.exp?.content !== "enabled && ownerId === 'architecture-console-content'"
    )
      violations.push('Main-content fill must bind directly to its enabled content owner.')
  })
  if (mainContentOwners.length !== 1)
    violations.push('Scroll Area requires exactly one instance-local main-content marker.')
  return violations
}

function workspaceKeyboardViolations(source: string): string[] {
  const template = parseVueTemplate('WorkspaceTabsSurface.vue', source)
  if (typeof template === 'string') return [template]
  const violations: string[] = []
  let tabs = 0
  let localMenus = 0
  const handles = (element: VueTemplateNode, event: string): boolean =>
    element.props?.some((prop) => prop.name === 'on' && prop.arg?.content === event) === true
  walkVueElements(template.root, (element) => {
    if (staticAttribute(element, 'role') === 'tab') {
      tabs += 1
      const tabindex = element.props.find(
        (prop) => prop.name === 'bind' && prop.arg?.content === 'tabindex',
      )?.exp?.content
      if (
        element.tag !== 'NButton' ||
        tabindex === undefined ||
        Number.isFinite(Number(tabindex)) ||
        !handles(element, 'keydown') ||
        !handles(element, 'focus')
      )
        violations.push('WORKSPACE_KEYBOARD_ROVING_TAB')
    }
    if (element.tag === 'NDropdown' && handles(element, 'keydown')) localMenus += 1
  })
  if (tabs !== 1) violations.push('WORKSPACE_KEYBOARD_ROVING_TAB')
  if (localMenus !== 1) violations.push('WORKSPACE_KEYBOARD_LOCAL_MENU')
  const keys = new Set<string>()
  function inspect(node: ts.Node): void {
    if (ts.isStringLiteral(node)) keys.add(node.text)
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'addEventListener' &&
      ts.isIdentifier(node.expression.expression) &&
      ['document', 'window'].includes(node.expression.expression.text) &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0]) &&
      ['keydown', 'keyup', 'keypress', 'focusin'].includes(node.arguments[0].text)
    )
      violations.push('WORKSPACE_KEYBOARD_LOCAL_OWNER')
    ts.forEachChild(node, inspect)
  }
  inspect(sourceFile('WorkspaceTabsSurface.vue', scriptContent(source)))
  if (
    ![
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Enter',
      ' ',
      'ContextMenu',
      'F10',
      'Escape',
      'Tab',
    ].every((key) => keys.has(key))
  )
    violations.push('WORKSPACE_KEYBOARD_KEYS')
  return [...new Set(violations)]
}

function nativeKeyboardBoundaryViolations(provider: string, fatalSource: string): string[] {
  const violations: string[] = []
  const script = sourceFile('UiProvider.vue', scriptContent(provider))
  const keyboardEvents = new Set(['keydown', 'keyup', 'keypress', 'focusin'])
  function inspectProvider(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'blur' ||
        (node.expression.name.text === 'addEventListener' &&
          node.arguments[0] !== undefined &&
          ts.isStringLiteral(node.arguments[0]) &&
          keyboardEvents.has(node.arguments[0].text)))
    )
      violations.push('KEYBOARD_PROVIDER_NATIVE_BEHAVIOR')
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      ['onkeydown', 'onkeyup', 'onkeypress', 'onfocusin'].includes(node.left.name.text)
    )
      violations.push('KEYBOARD_PROVIDER_NATIVE_BEHAVIOR')
    ts.forEachChild(node, inspectProvider)
  }
  inspectProvider(script)
  if (provider.includes('keyboard-focus-policy'))
    violations.push('KEYBOARD_PROVIDER_NATIVE_BEHAVIOR')

  const fatal = sourceFile('fatal-boundary.ts', fatalSource)
  const buttons = new Set<string>()
  const tabOverrides = new Set<string>()
  function inspectFatal(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isCallExpression(node.initializer) &&
      ts.isPropertyAccessExpression(node.initializer.expression) &&
      node.initializer.expression.name.text === 'createElement' &&
      node.initializer.arguments[0]?.getText(fatal).replaceAll(/['"]/gu, '') === 'button'
    )
      buttons.add(node.name.text)
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      ts.isIdentifier(node.left.expression) &&
      node.left.name.text === 'tabIndex'
    )
      tabOverrides.add(node.left.expression.text)
    ts.forEachChild(node, inspectFatal)
  }
  inspectFatal(fatal)
  if (buttons.size !== 1 || [...buttons].some((name) => tabOverrides.has(name)))
    violations.push('KEYBOARD_FATAL_NATIVE_ACTION')
  return [...new Set(violations)]
}

async function nativeKeyboardViolations(): Promise<string[]> {
  const provider = await readFile(resolve(rootDirectory, uiProviderPath), 'utf8')
  const fatal = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/errors/fatal-boundary.ts'),
    'utf8',
  )
  const violations = nativeKeyboardBoundaryViolations(provider, fatal)
  for (const statement of [
    "window.addEventListener('keydown', event => event.preventDefault(), true)",
    "window.addEventListener('focusin', event => event.target?.blur(), true)",
    'window.onkeyup = event => event.stopImmediatePropagation()',
  ]) {
    if (
      !nativeKeyboardBoundaryViolations(
        provider.replace('</script>', `${statement}\n</script>`),
        fatal,
      ).includes('KEYBOARD_PROVIDER_NATIVE_BEHAVIOR')
    )
      violations.push('KEYBOARD_PROVIDER_NEGATIVE_PROBE')
  }
  const fatalProbe = "const action = document.createElement('button'); action.tabIndex = -1"
  if (
    !nativeKeyboardBoundaryViolations(provider, fatalProbe).includes('KEYBOARD_FATAL_NATIVE_ACTION')
  )
    violations.push('KEYBOARD_FATAL_NEGATIVE_PROBE')
  return violations
}

function scrollDisposalRegistered(source: string): boolean {
  const parsed = sourceFile('UiScrollArea.vue', scriptContent(source))
  const controllers = new Set<string>()
  const hooks: ts.CallExpression[] = []
  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isCallExpression(node.initializer) &&
      node.initializer.typeArguments?.some((type) => type.getText() === 'UiScrollController')
    )
      controllers.add(node.name.text)
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'onBeforeUnmount'
    )
      hooks.push(node)
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  function isDisposal(value: ts.Expression | undefined): boolean {
    return (
      value !== undefined &&
      ts.isPropertyAccessExpression(value) &&
      ts.isIdentifier(value.expression) &&
      controllers.has(value.expression.text) &&
      value.name.text === 'dispose'
    )
  }
  return hooks.some((hook) => {
    const callback = hook.arguments[0]
    if (isDisposal(callback)) return true
    if (
      callback === undefined ||
      (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
    )
      return false
    const body = callback.body
    if (!ts.isBlock(body)) return ts.isCallExpression(body) && isDisposal(body.expression)
    return body.statements.some((statement) => {
      const expression =
        ts.isExpressionStatement(statement) || ts.isReturnStatement(statement)
          ? statement.expression
          : undefined
      return (
        expression !== undefined &&
        ts.isCallExpression(expression) &&
        isDisposal(expression.expression)
      )
    })
  })
}

export async function validateUiPublicComponents(): Promise<string[]> {
  const violations: string[] = await nativeKeyboardViolations()
  const overlaySources = await loadOverlaySourceMap()
  const overlayNegativeProbeResults = runOverlayNegativeProbes(overlaySources)
  const registry: UiPublicComponentRegistry = uiPublicComponentRegistry
  const registryRecords: readonly UiPublicComponentRegistryRecord[] = registry.records
  const indexSource = await readFile(resolve(uiSourceDirectory, 'index.ts'), 'utf8')
  const scrollSource = await readFile(
    resolve(uiSourceDirectory, 'components/UiScrollArea.vue'),
    'utf8',
  )
  const [scrollRuntime, scrollProvider, naivePatch] = await Promise.all([
    readFile(resolve(uiSourceDirectory, 'adapters/scroll/scroll-enhancement-runtime.ts'), 'utf8'),
    readFile(resolve(rootDirectory, uiProviderPath), 'utf8'),
    readFile(resolve(rootDirectory, 'patches/naive-ui@2.45.2.patch'), 'utf8'),
  ])
  const naiveScrollSections = naivePatch
    .split('diff --git ')
    .filter((section) =>
      /^(?:a\/es\/|a\/lib\/)_internal\/scrollbar\/src\/Scrollbar\.(?:mjs|js)\b/u.test(section),
    )
  if (
    !scrollProvider.includes("'pavp.scroll'") ||
    naiveScrollSections.length !== 2 ||
    naiveScrollSections.some((section) => !section.includes('"pavp.scroll"')) ||
    !scrollRuntime.includes("'data-pavp-naive-scroll'") ||
    !scrollSource.includes('[data-pavp-naive-scroll]')
  )
    violations.push(
      'Naive scrolling must retain its private shared injection and presentation marker.',
    )
  violations.push(...mainContentFillViolations(scrollSource))
  const contentProbe = `<script setup lang="ts">
const localContent = ref<HTMLElement>()
const host = ref<HTMLElement>()
const viewport = ref<HTMLElement>()
function enhance() {
  const body = localContent.value
  runtime.createScrollEnhancement({ content: body })
}
</script>
<template><div ref="localContent" class="pavp-scroll-area__content"
:data-main-content="enabled && ownerId === 'architecture-console-content'" /></template>`
  const renamedContentRef = contentProbe.replaceAll('localContent', 'renamedContent')
  if (mainContentFillViolations(renamedContentRef).length !== 0)
    violations.push('Main-content in-memory positive probe froze a private ref name.')
  if (
    mainContentFillViolations(contentProbe.replace('ref="localContent"', 'ref="unboundContent"'))
      .length === 0
  )
    violations.push('Main-content in-memory negative probe accepted an unbound ref.')
  for (const wrongRef of ['host', 'viewport']) {
    const disconnected = contentProbe.replace('ref="localContent"', `ref="${wrongRef}"`)
    if (mainContentFillViolations(disconnected).length === 0)
      violations.push('Main-content in-memory negative probe accepted a disconnected content ref.')
  }
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
    !scrollDisposalRegistered(scrollSource)
  )
    violations.push(
      'Scroll Area must retain the native PAVP viewport/controller, private enhancement and disposable execution contract.',
    )
  const disposalProbe = `<script setup lang="ts">
const local = Object.freeze<UiScrollController>({})
onBeforeUnmount(local.dispose)
</script>`
  for (const callback of ['local.dispose', '() => local.dispose()', '() => { local.dispose() }'])
    if (
      !scrollDisposalRegistered(
        disposalProbe.replace('onBeforeUnmount(local.dispose)', `onBeforeUnmount(${callback})`),
      )
    )
      violations.push('Scroll disposal check rejected an equivalent lifecycle callback.')
  for (const callback of ['() => {}', '() => local.dispose', '() => other.dispose()'])
    if (
      scrollDisposalRegistered(
        disposalProbe.replace('onBeforeUnmount(local.dispose)', `onBeforeUnmount(${callback})`),
      )
    )
      violations.push('Scroll disposal check accepted a disconnected lifecycle callback.')
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
      if (element.tag === 'NDropdown') menus.push(element)
      if (
        (staticAttribute(element, 'role') === 'tablist' || element.tag === 'LazyMotion') &&
        containsElementTag(element, 'NDropdown')
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
      !menu.props.some(
        (prop) =>
          prop.name === 'bind' &&
          prop.arg?.content === 'to' &&
          prop.exp?.content === 'overlayTarget',
      ) ||
      !workspaceScrollSource.includes("inject(pavpOverlayTargetKey, '#pavp-overlay-root')") ||
      !menu.props.some(
        (prop) =>
          prop.name === 'bind' && prop.arg?.content === 'keyboard' && prop.exp?.content === 'false',
      ) ||
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
      workspaceScrollSource.includes('while-focus') ||
      !workspaceScrollSource.includes('getBoundingClientRect()') ||
      /\b(?:useRouter|useWorkspaceStore|KeepAlive|localStorage|sessionStorage)\b/u.test(
        workspaceScrollSource,
      )
    )
      violations.push(
        'Workspace menu must preserve pointer intents, local keyboard ownership and UI-only responsibilities.',
      )
    violations.push(...workspaceKeyboardViolations(workspaceScrollSource))
    const keyboardProbes: readonly [string, string][] = [
      [
        workspaceScrollSource.replace(/:tabindex="[^"]*"/u, 'tabindex="-1"'),
        'WORKSPACE_KEYBOARD_ROVING_TAB',
      ],
      [workspaceScrollSource.replace(/@keydown="[^"]*"/gu, ''), 'WORKSPACE_KEYBOARD_LOCAL_MENU'],
      [workspaceScrollSource.replace("'ArrowLeft'", "'UnusedKey'"), 'WORKSPACE_KEYBOARD_KEYS'],
      [
        workspaceScrollSource.replace(
          '</script>',
          "window.addEventListener('keydown', () => {})\n</script>",
        ),
        'WORKSPACE_KEYBOARD_LOCAL_OWNER',
      ],
    ]
    for (const [mutated, code] of keyboardProbes)
      if (mutated === workspaceScrollSource || !workspaceKeyboardViolations(mutated).includes(code))
        violations.push('Workspace keyboard in-memory negative probe failed.')
    const dismissal = workspaceMenuDismissalViolations(workspaceScrollSource)
    const menuProbe = `<script setup lang="ts">
const strip = ref<HTMLElement>()
function dismiss(event?: MouseEvent): void {
  const item = contextItem.value
  if (event?.type === 'mouseup' && event.button === 2 && item !== undefined &&
    event.composedPath().some((target) => target instanceof HTMLElement &&
      strip.value?.contains(target) === true && target.closest('[inert]') === null &&
      target.querySelector('[role="tab"]')?.id === \`\${item.id}-tab\`)) return
}
</script><template><NDropdown @clickoutside="dismiss" /></template>`
    const dismissalProbes = [
      menuProbe.replace(/([\w$]+)\.button === 2/u, 'true'),
      menuProbe.replace(/([\w$]+)\?\.type === 'mouseup'/u, 'true'),
      menuProbe.replace(/([\w$.]+)\?\.contains\([\w$]+\) === true/u, 'true'),
      menuProbe.replace(/([\w$]+)\.closest\('\[inert\]'\) === null/u, 'true'),
      menuProbe.replace(
        /([\w$]+)\.querySelector\('\[role="tab"\]'\)\?\.id === `\$\{[\w$]+\.id\}-tab`/u,
        'true',
      ),
    ]
    for (const mutated of dismissalProbes)
      if (
        dismissal.length !== 0 ||
        mutated === menuProbe ||
        !isDeepStrictEqual(workspaceMenuDismissalViolations(mutated), [
          'WORKSPACE_MENU_OWNED_CONTEXT_GESTURE',
        ])
      )
        violations.push('Workspace menu gesture in-memory negative probe failed.')
    const dismissalPositiveProbes = [
      menuProbe.replace(/([\w$]+)\.button === 2/u, '(2 === $1.button)'),
      menuProbe.replace(/([\w$]+)\?\.type === 'mouseup'/u, "'mouseup' === $1?.type"),
      menuProbe.replace(/([\w$.]+)\?\.contains\(([\w$]+)\) === true/u, '$1?.contains($2)'),
      menuProbe.replace(/([\w$]+)\.closest\('\[inert\]'\) === null/u, "!$1.closest('[inert]')"),
    ]
    for (const changed of dismissalPositiveProbes)
      if (changed === menuProbe || workspaceMenuDismissalViolations(changed).length !== 0)
        violations.push(
          'Workspace menu gesture in-memory positive probe froze an equivalent private expression.',
        )
    violations.push(...dismissal)
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
        element.tag !== 'NButton' ||
        staticAttribute(element, 'attr-type') !== 'button' ||
        hasAttributeOrBinding(element, 'role') ||
        !hasAttributeOrBinding(element, 'disabled') ||
        hasAttributeOrBinding(element, 'tabindex') ||
        hasStructuralCondition(element)
      )
        violations.push(
          'Workspace adjacent activation controls must remain visible Naive buttons with disabled semantics.',
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
    const unwrapMotionControl = (element: VueTemplateNode): VueTemplateNode | undefined => {
      if (!isVueElement(element)) return undefined
      if (element.tag !== 'M' || !hasAttributeOrBinding(element, 'as-child')) return element
      const children = element.children.filter(isVueElement)
      return children.length === 1 && !hasStructuralCondition(element) ? children[0] : undefined
    }
    walkVueElements(workspaceTemplate.root, (element) => {
      const children = element.children.filter(isVueElement)
      const firstControl = children[0] === undefined ? undefined : unwrapMotionControl(children[0])
      const lastControl = children[2] === undefined ? undefined : unwrapMotionControl(children[2])
      if (
        children.length === 3 &&
        firstControl !== undefined &&
        controls.includes(firstControl) &&
        lastControl !== undefined &&
        controls.includes(lastControl) &&
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
  const formComponents = new Set(['UiForm', 'UiFormField'])
  const parsedFormContracts = sourceFile('form-contracts.ts', formContracts)
  const formInterfaces = parsedFormContracts.statements.filter(ts.isInterfaceDeclaration)
  const compactType = (value: string): string => value.replace(/\s+/gu, '')
  for (const component of ['UiForm', 'UiFormField']) {
    const record = registryRecords.find((record) => record.exportName === component)
    const props = formInterfaces.find((node) => node.name.text === `${component}Props`)
    const slots = formInterfaces.find((node) => node.name.text === `${component}Slots`)
    if (record === undefined || props === undefined || slots === undefined) {
      violations.push(
        `${component}: exact generic props, slots and source registration are required.`,
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
    ['schema', 'copy'].some(
      (name) =>
        !formInput.members.some(
          (member) =>
            ts.isPropertySignature(member) &&
            member.name.getText(parsedFormContracts) === name &&
            member.questionToken === undefined,
        ),
    )
  ) {
    violations.push(
      'UiFormInput must require JSON schema and localized copy; trusted extensions stay separate.',
    )
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
        'schema',
        'copy',
        'values',
        'dirty',
        'dirtyFields',
        'pendingFields',
        'hasPendingInput',
        'hasUnsavedChanges',
        'revision',
        'loadState',
        'touched',
        'issues',
        'phase',
        'submitting',
        'notice',
        'text',
        'getValues',
        'getInitial',
        'getValue',
        'setValues',
        'replaceValues',
        'setValue',
        'load',
        'nodeState',
        'nodeLabel',
        'canFocusField',
        'focusField',
        'rowKeys',
        'addItem',
        'insertItem',
        'duplicateItem',
        'removeItem',
        'moveItem',
        'blur',
        'validate',
        'validateItem',
        'submit',
        'reset',
        'replaceInitial',
        'field',
        'dispose',
      ],
    )
  )
    violations.push(
      'UiFormController must retain the configured form draft, group and lifecycle surface.',
    )
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
    const expectedGeneric = 'I'
    if (
      !source.includes(`generic="${expectedGeneric}"`) ||
      !macroContractTypes(source).includes(`${name}Props<I>`) ||
      !macroContractTypes(source).includes(
        name === 'UiForm' ? 'UiFormSlots<I>' : 'UiFormFieldSlots',
      )
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
    const feedbackReservations: boolean[] = []
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
      if (element.tag === 'NFormItem')
        feedbackReservations.push(
          element.props.some(
            (property) =>
              property.type === 7 &&
              property.name === 'bind' &&
              property.arg?.content === 'show-feedback' &&
              property.exp?.content?.trim() === 'false',
          ),
        )
      if (
        element.tag === 'NSelect' ||
        element.tag === 'NDatePicker' ||
        element.tag === 'NPopover'
      ) {
        if (resolvedAttribute(element, 'to') !== overlayTarget)
          violations.push(`${name}: form popups must use the existing overlay root.`)
      }
    })
    if (forms !== (name === 'PavpNaiveForm' ? 1 : 0))
      violations.push(`${name}: native form boundary count diverged.`)
    if (/\.(?:restoreValidation|validate)\s*\(/u.test(scriptContent(source)))
      violations.push(`${name}: vendor validation methods are forbidden.`)
    if (
      name === 'PavpNaiveFormField' &&
      (/['"]success['"]/u.test(source) ||
        !source.includes("validationStatus: 'error'") ||
        !feedbackReservations.includes(true) ||
        !source.includes('class="sr-only"') ||
        source.includes('pavp-form-feedback-lane') ||
        source.includes('var(--ui-color-text-on-status-error)') ||
        source.includes('background-color: var(--ui-color-status-error)'))
    ) {
      violations.push(
        'PavpNaiveFormField must keep ordinary validity neutral and keep full errors accessible without reserving a feedback row.',
      )
    }
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
    registryRecords.some(
      (record) =>
        record.capabilityStatus !== 'ACTIVE' ||
        (formComponents.has(record.exportName) &&
          record.sourcePath !== `packages/ui/src/components/${record.exportName}.vue`),
    )
  ) {
    violations.push('UI Registry must preserve the current component status and source ownership.')
  }

  if (!exactSet(Object.keys(componentExampleConsumers), registeredExports))
    violations.push('Workbench example coverage must name the current public UI components.')

  const productRoutes = routeRegistry.filter((record) => record.meta.layout !== 'reading')
  const routeNameBySource = new Map(productRoutes.map((record) => [record.sourcePath, record.name]))
  const directConsumers = new Map<string, string[]>()
  const workspaceFrame = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/console/ConsoleRouteFrame.vue'),
    'utf8',
  )
  const shellScrollSource = await readFile(resolve(rootDirectory, uiAdminShellPath), 'utf8')
  const shellContracts = sourceFile(
    'contracts.ts',
    await readFile(resolve(uiSourceDirectory, 'components/contracts.ts'), 'utf8'),
  )
  const compositionType = shellContracts.statements.find(
    (node): node is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(node) && node.name.text === 'UiShellComposition',
  )
  const compositionNames =
    compositionType !== undefined && ts.isUnionTypeNode(compositionType.type)
      ? compositionType.type.types.flatMap((node) =>
          ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal) ? [node.literal.text] : [],
        )
      : []
  const shellRecord = registryRecords.find((record) => record.exportName === 'UiAdminShell')
  if (
    !exactSet(compositionNames, [
      'admin-workspace',
      'admin-workspace-footer',
      'header-content',
      'header-content-footer',
      'content-footer',
      'content-only',
    ]) ||
    !indexSource.includes('UiShellComposition,') ||
    !isDeepStrictEqual(
      shellRecord?.props.find((prop) => prop.name === 'composition'),
      {
        name: 'composition',
        type: 'UiShellComposition | null',
        required: true,
        defaultValue: null,
      },
    ) ||
    !isDeepStrictEqual(
      shellRecord?.slots.find((slot) => slot.name === 'footer'),
      {
        name: 'footer',
        slotPropsType: 'Readonly<Record<string, never>>',
        required: false,
      },
    )
  )
    violations.push(
      'UiAdminShell must expose the exact six compositions, required nullable input and optional application Footer through @platform/ui.',
    )

  if (
    shellScrollSource.includes("import UiScrollArea from './UiScrollArea.vue'") &&
    shellScrollSource.includes('owner-id="architecture-console-content"')
  )
    directConsumers.set(
      'UiScrollArea',
      productRoutes.filter((route) => route.name !== 'control-center').map((route) => route.name),
    )
  if (
    importedNames(scriptContent(workspaceFrame), '@platform/ui').includes('UiWorkspaceTabs') &&
    [...workspaceFrame.matchAll(/<UiWorkspaceTabs\b/gu)].length === 1
  )
    directConsumers.set(
      'UiWorkspaceTabs',
      productRoutes
        .filter((route) => route.workspaceIdentityPolicyId !== null)
        .map((route) => route.name),
    )

  for (const [sourcePath, routeName] of routeNameBySource) {
    const pageScript = scriptContent(await readFile(resolve(rootDirectory, sourcePath), 'utf8'))
    const usesWorkbenchPage = ts
      .preProcessFile(pageScript, true, true)
      .importedFiles.some(({ fileName }) => fileName === '../app/workbench/WorkbenchPage.vue')
    const pageSource =
      pageScript +
      (usesWorkbenchPage
        ? scriptContent(
            await readFile(
              resolve(rootDirectory, 'apps/web/src/app/workbench/WorkbenchPage.vue'),
              'utf8',
            ),
          )
        : '')

    for (const importedName of importedNames(pageSource, '@platform/ui')) {
      const consumers = directConsumers.get(importedName) ?? []
      if (!consumers.includes(routeName)) consumers.push(routeName)
      directConsumers.set(importedName, consumers)
    }

    // Resolve the existing copy/form composites through local showcase components.
    const workbenchDirectory = resolve(rootDirectory, 'apps/web/src/app/workbench')
    const visited = new Set<string>()
    async function collectShowcaseConsumers(path: string): Promise<void> {
      if (visited.has(path)) return
      visited.add(path)
      const source = await readFile(path, 'utf8')
      const script = scriptContent(source)
      for (const component of importedNames(script, '@platform/ui')) {
        if (
          ![
            'UiG2Chart',
            'UiChartTimeRange',
            'UiCopyAction',
            'UiForm',
            'UiFormField',
            'UiRadioCardGroup',
            'UiTable',
            'UiTableEditor',
            'UiScrollArea',
          ].includes(component) ||
          !new RegExp(`<${component}\\b`, 'u').test(source)
        )
          continue
        // UiForm's recursive field renderer is itself a UiFormField consumer.
        for (const name of component === 'UiTableEditor'
          ? ['UiTableEditor', 'UiForm', 'UiFormField']
          : component === 'UiForm'
            ? ['UiForm', 'UiFormField']
            : [component]) {
          const consumers = directConsumers.get(name) ?? []
          if (!consumers.includes(routeName)) consumers.push(routeName)
          directConsumers.set(name, consumers)
        }
      }
      for (const { fileName } of ts.preProcessFile(script, true, true).importedFiles) {
        if (!fileName.startsWith('.') || !fileName.endsWith('.vue')) continue
        const imported = resolve(dirname(path), fileName)
        const workbenchRelative = relative(workbenchDirectory, imported)
        if (workbenchRelative.startsWith('..') || workbenchRelative === '') continue
        await collectShowcaseConsumers(imported)
      }
    }
    await collectShowcaseConsumers(resolve(rootDirectory, sourcePath))
  }

  for (const consumer of ['TokenSpecimen', 'ComponentSpecimen', 'MotionSpecimen']) {
    const source = await readFile(
      resolve(rootDirectory, `apps/web/src/app/workbench/${consumer}.vue`),
      'utf8',
    )
    if (
      !importedNames(scriptContent(source), '@platform/ui').includes('UiCopyAction') ||
      !/<UiCopyAction\b/u.test(source)
    )
      violations.push(`${consumer}: copy actions must use the shared UiCopyAction owner.`)
  }

  for (const record of registryRecords) {
    const source = await readFile(resolve(rootDirectory, record.sourcePath), 'utf8')
    const expectedProps = registeredContractNames(record.props)
    const expectedEmits = registeredContractNames(record.emits)
    const expectedSlots = registeredContractNames(record.slots)

    const importedContracts = formComponents.has(record.exportName)
      ? formContracts
      : record.exportName === 'UiTable'
        ? await readFile(resolve(uiSourceDirectory, 'components/table-contracts.ts'), 'utf8')
        : ''
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

    if (record.exportName === 'UiCopyAction') {
      const parsed = sourceFile(record.sourcePath, scriptContent(source))
      const actualProps: { name: string; type: string; required: boolean }[] = []
      const defaultContract = { disabled: false }
      function visitCopyContract(node: ts.Node): void {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
          const contract = node.typeArguments?.[0]
          if (
            node.expression.text === 'defineProps' &&
            contract !== undefined &&
            ts.isTypeLiteralNode(contract)
          )
            for (const member of contract.members) {
              if (!ts.isPropertySignature(member) || member.type === undefined) continue
              actualProps.push({
                name: member.name.getText(parsed),
                type: compactType(member.type.getText(parsed)),
                required: member.questionToken === undefined,
              })
            }
          const defaults = node.arguments[1]
          if (
            node.expression.text === 'withDefaults' &&
            defaults !== undefined &&
            ts.isObjectLiteralExpression(defaults)
          )
            defaultContract.disabled = defaults.properties.some(
              (property) =>
                ts.isPropertyAssignment(property) &&
                property.name.getText(parsed) === 'disabled' &&
                property.initializer.kind === ts.SyntaxKind.FalseKeyword,
            )
        }
        ts.forEachChild(node, visitCopyContract)
      }
      visitCopyContract(parsed)
      const expected = record.props.map((prop) => ({
        name: prop.name,
        type: compactType(prop.type),
        required: prop.required,
      }))
      if (!isDeepStrictEqual(actualProps, expected) || !defaultContract.disabled)
        violations.push('UiCopyAction exact Props and disabled default must match its Registry.')
    }

    if (record.exportName === 'UiRadioCardGroup') {
      const parsed = sourceFile(record.sourcePath, scriptContent(source))
      const disabledContract = { optional: false, default: false }
      function visitRadioContract(node: ts.Node): void {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
          const contract = node.typeArguments?.[0]
          if (
            node.expression.text === 'defineProps' &&
            contract !== undefined &&
            ts.isTypeLiteralNode(contract)
          ) {
            disabledContract.optional = contract.members.some(
              (member) =>
                ts.isPropertySignature(member) &&
                member.name.getText(parsed) === 'disabled' &&
                member.questionToken !== undefined &&
                member.type?.kind === ts.SyntaxKind.BooleanKeyword,
            )
          }
          const defaults = node.arguments[1]
          if (
            node.expression.text === 'withDefaults' &&
            defaults !== undefined &&
            ts.isObjectLiteralExpression(defaults)
          ) {
            disabledContract.default = defaults.properties.some(
              (property) =>
                ts.isPropertyAssignment(property) &&
                property.name.getText(parsed) === 'disabled' &&
                property.initializer.kind === ts.SyntaxKind.FalseKeyword,
            )
          }
        }
        ts.forEachChild(node, visitRadioContract)
      }
      visitRadioContract(parsed)
      if (
        !disabledContract.optional ||
        !disabledContract.default ||
        !isDeepStrictEqual(
          record.props.find((prop) => prop.name === 'disabled'),
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            defaultValue: 'false',
          },
        )
      )
        violations.push(
          'UiRadioCardGroup must retain its optional boolean disabled input with false default.',
        )
    }

    const actualConsumers =
      record.exportName === 'UiProvider' || record.exportName === 'UiAdminShell'
        ? productRoutes.map((route) => route.name)
        : (directConsumers.get(record.exportName) ?? [])

    if (!exactSet(actualConsumers, componentExampleConsumers[record.exportName] ?? [])) {
      violations.push(
        `${record.exportName}: actual product-route consumers diverged from workbench coverage.`,
      )
    }
  }

  const adapterFiles = [
    'packages/ui/src/adapters/naive/PavpNaiveForm.vue',
    'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    'packages/ui/src/adapters/naive/PavpNaiveFormControl.vue',
    'packages/ui/src/adapters/naive/PavpNaiveFormChoice.vue',
    'packages/ui/src/adapters/naive/use-form-control.ts',
    'packages/ui/src/adapters/naive/pavp-naive-runtime-context.ts',
    'packages/ui/src/adapters/naive/regional-navigation-theme.ts',
    'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
    'packages/ui/src/adapters/naive/pavp-naive-form-theme.ts',
    'packages/ui/src/adapters/naive/pavp-naive-table-theme.ts',
    'packages/ui/src/adapters/naive/pavp-naive-table-layout.ts',
    'packages/ui/src/adapters/naive/semantic-naive-theme.ts',
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

  const boundaryFiles = (
    await Promise.all([
      collectUiBoundarySourceFiles(resolve(rootDirectory, 'apps')),
      collectUiBoundarySourceFiles(uiSourceDirectory),
    ])
  ).flat()

  const runtimeImports: string[] = []

  for (const absolutePath of boundaryFiles) {
    const relativePath = relative(rootDirectory, absolutePath)
    const rawSource = await readFile(resolve(rootDirectory, relativePath), 'utf8').catch(() => '')

    if (rawSource.length === 0) {
      violations.push(`${relativePath}: UI source is empty.`)
      continue
    }

    const source = relativePath.endsWith('.vue') ? scriptContent(rawSource) : rawSource
    const parsed = sourceFile(relativePath, source)

    if (
      relativePath !== 'packages/ui/src/components/UiCopyAction.vue' &&
      /\bnavigator\s*(?:\??\.\s*clipboard\b|\[\s*['"]clipboard['"]\s*\])|\bexecCommand\s*\(\s*['"]copy['"]/u.test(
        rawSource,
      )
    ) {
      violations.push(`${relativePath}: route app clipboard actions through UiCopyAction.`)
    }

    for (const statement of parsed.statements) {
      if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier !== undefined &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        (statement.moduleSpecifier.text === 'naive-ui' ||
          statement.moduleSpecifier.text.startsWith('naive-ui/'))
      ) {
        violations.push(
          `${relativePath}: Naive re-exports are forbidden; import official names at the consumer.`,
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
        importClause.namedBindings !== undefined &&
        ts.isNamespaceImport(importClause.namedBindings)
      ) {
        violations.push(`${relativePath}: Naive namespace imports are forbidden.`)
      }
      if (
        importClause.phaseModifier !== ts.SyntaxKind.TypeKeyword &&
        statement.moduleSpecifier.text === 'naive-ui' &&
        (importClause.name !== undefined ||
          (importClause.namedBindings !== undefined &&
            ts.isNamedImports(importClause.namedBindings) &&
            importClause.namedBindings.elements.some((element) => !element.isTypeOnly)))
      ) {
        violations.push(
          `${relativePath}: use on-demand Naive component entrypoints for runtime imports.`,
        )
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
        if (element.propertyName !== undefined && element.propertyName.text !== element.name.text) {
          violations.push(`${relativePath}: use the official Naive import name.`)
        }
        if (
          element.name.text === 'NConfigProvider' &&
          ![uiProviderPath, 'packages/ui/src/providers/UiColorScope.vue'].includes(relativePath)
        ) {
          violations.push(
            relativePath + ': NConfigProvider is owned exclusively by UiProvider and UiColorScope.',
          )
        }
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
    'NDatePicker@naive-ui/es/date-picker',
    'NBreadcrumb@naive-ui/es/breadcrumb',
    'NBreadcrumbItem@naive-ui/es/breadcrumb',
    'NButton@naive-ui/es/button',
    'NCard@naive-ui/es/card',
    'NConfigProvider@naive-ui/es/config-provider',
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
    'NAlert@naive-ui/es/alert',
    'NAffix@naive-ui/es/affix',
    'NAnchor@naive-ui/es/anchor',
    'NAnchorLink@naive-ui/es/anchor',
    'NBackTop@naive-ui/es/back-top',
    'NAutoComplete@naive-ui/es/auto-complete',
    'NAvatar@naive-ui/es/avatar',
    'NAvatarGroup@naive-ui/es/avatar-group',
    'NBadge@naive-ui/es/badge',
    'NButtonGroup@naive-ui/es/button-group',
    'NCalendar@naive-ui/es/calendar',
    'NCarousel@naive-ui/es/carousel',
    'NCarouselItem@naive-ui/es/carousel',
    'NCascader@naive-ui/es/cascader',
    'NCheckbox@naive-ui/es/checkbox',
    'NCheckboxGroup@naive-ui/es/checkbox',
    'NLog@naive-ui/es/log',
    'NImageGroup@naive-ui/es/image',
    'NImagePreview@naive-ui/es/image',
    'NLoadingBarProvider@naive-ui/es/loading-bar',
    'NMessageProvider@naive-ui/es/message',
    'NModalProvider@naive-ui/es/modal',
    'NNotificationProvider@naive-ui/es/notification',
    'useLoadingBar@naive-ui/es/loading-bar',
    'useMessage@naive-ui/es/message',
    'useModal@naive-ui/es/modal',
    'useNotification@naive-ui/es/notification',
    'NCol@naive-ui/es/legacy-grid',
    'NCollapse@naive-ui/es/collapse',
    'NCollapseItem@naive-ui/es/collapse',
    'NCollapseTransition@naive-ui/es/collapse-transition',
    'NMarquee@naive-ui/es/marquee',
    'NScrollbar@naive-ui/es/scrollbar',
    'NInfiniteScroll@naive-ui/es/infinite-scroll',
    'NVirtualList@naive-ui/es/virtual-list',
    'NColorPicker@naive-ui/es/color-picker',
    'NCountdown@naive-ui/es/countdown',
    'NDataTable@naive-ui/es/data-table',
    'NDescriptions@naive-ui/es/descriptions',
    'NDescriptionsItem@naive-ui/es/descriptions',
    'NEllipsis@naive-ui/es/ellipsis',
    'NDialog@naive-ui/es/dialog',
    'NDivider@naive-ui/es/divider',
    'NDrawer@naive-ui/es/drawer',
    'NDrawerContent@naive-ui/es/drawer',
    'NDynamicInput@naive-ui/es/dynamic-input',
    'NDynamicTags@naive-ui/es/dynamic-tags',
    'NEmpty@naive-ui/es/empty',
    'NFlex@naive-ui/es/flex',
    'NFloatButton@naive-ui/es/float-button',
    'NFloatButtonGroup@naive-ui/es/float-button-group',
    'NFormItemCol@naive-ui/es/form',
    'NFormItemGi@naive-ui/es/form',
    'NFormItemRow@naive-ui/es/form',
    'NGi@naive-ui/es/grid',
    'NGradientText@naive-ui/es/gradient-text',
    'NGrid@naive-ui/es/grid',
    'NH2@naive-ui/es/typography',
    'NH3@naive-ui/es/typography',
    'NHeatmap@naive-ui/es/heatmap',
    'NHighlight@naive-ui/es/highlight',
    'NImage@naive-ui/es/image',
    'NIconWrapper@naive-ui/es/icon-wrapper',
    'NInputOtp@naive-ui/es/input-otp',
    'NInputGroup@naive-ui/es/input',
    'NInputGroupLabel@naive-ui/es/input',
    'NLayoutContent@naive-ui/es/layout',
    'NLayoutFooter@naive-ui/es/layout',
    'NLayoutHeader@naive-ui/es/layout',
    'NList@naive-ui/es/list',
    'NListItem@naive-ui/es/list',
    'NMention@naive-ui/es/mention',
    'NModal@naive-ui/es/modal',
    'NNumberAnimation@naive-ui/es/number-animation',
    'NP@naive-ui/es/typography',
    'NPagination@naive-ui/es/pagination',
    'NPageHeader@naive-ui/es/page-header',
    'NPopconfirm@naive-ui/es/popconfirm',
    'NPopover@naive-ui/es/popover',
    'NPopselect@naive-ui/es/popselect',
    'NProgress@naive-ui/es/progress',
    'NQrCode@naive-ui/es/qr-code',
    'NRadio@naive-ui/es/radio',
    'NRate@naive-ui/es/rate',
    'NResult@naive-ui/es/result',
    'NRow@naive-ui/es/legacy-grid',
    'NSkeleton@naive-ui/es/skeleton',
    'NSlider@naive-ui/es/slider',
    'NSpace@naive-ui/es/space',
    'NSpin@naive-ui/es/spin',
    'NSplit@naive-ui/es/split',
    'NStatistic@naive-ui/es/statistic',
    'NStep@naive-ui/es/steps',
    'NSteps@naive-ui/es/steps',
    'NTabPane@naive-ui/es/tabs',
    'NTab@naive-ui/es/tabs',
    'NTable@naive-ui/es/table',
    'NTbody@naive-ui/es/table',
    'NTd@naive-ui/es/table',
    'NTabs@naive-ui/es/tabs',
    'NTh@naive-ui/es/table',
    'NThead@naive-ui/es/table',
    'NText@naive-ui/es/typography',
    'NThing@naive-ui/es/thing',
    'NTime@naive-ui/es/time',
    'NTimePicker@naive-ui/es/time-picker',
    'NTimeline@naive-ui/es/timeline',
    'NTimelineItem@naive-ui/es/timeline',
    'NTr@naive-ui/es/table',
    'NTransfer@naive-ui/es/transfer',
    'NTree@naive-ui/es/tree',
    'NTreeSelect@naive-ui/es/tree-select',
    'NUpload@naive-ui/es/upload',
    'NUploadDragger@naive-ui/es/upload',
    'NUploadFileList@naive-ui/es/upload',
    'NUploadTrigger@naive-ui/es/upload',
    'NWatermark@naive-ui/es/watermark',
  ]

  if (
    runtimeImports.filter((entry) => entry === 'NConfigProvider@naive-ui/es/config-provider')
      .length !== 2
  ) {
    violations.push('UiProvider and UiColorScope must each own one NConfigProvider import.')
  }
  if (!exactSet([...new Set(runtimeImports)], expectedRuntimeImports)) {
    violations.push('Direct Naive runtime imports diverged from the admitted exact set.')
  }

  const themeSource = await readFile(
    resolve(uiSourceDirectory, 'adapters/naive/pavp-naive-theme.ts'),
    'utf8',
  )

  for (const override of [
    'Breadcrumb',
    'Button',
    'Card',
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
