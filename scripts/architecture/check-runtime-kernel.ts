import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'

import ts from 'typescript'

import {
  createCoreErrorLedger,
  installCoreErrorDiagnostics,
  type NormalizedCoreError,
} from '../../apps/web/src/app/errors/core-error'
import { normalizeUnhandledPromiseRejection } from '../../apps/web/src/app/errors/error-normalizer'
import { createStartupAttemptId } from '../../apps/web/src/app/bootstrap/lifecycle'

type JsonPrimitive = boolean | number | string | null
type ComparableValue =
  JsonPrimitive | readonly ComparableValue[] | { readonly [key: string]: ComparableValue }

interface ParsedSource {
  readonly path: string
  readonly text: string
  readonly sourceFile: ts.SourceFile
}

const rootDirectory = process.cwd()
const webSourceDirectory = resolve(rootDirectory, 'apps/web/src')

const bootstrapStepIds = [
  'validate-build-and-runtime-configuration',
  'install-pre-vue-global-failure-capture',
  'initialize-design-system-and-resolve-first-paint-handoff',
  'create-vue-application',
  'create-pinia',
  'install-platform-providers',
  'create-and-ready-router',
  'create-and-ready-storage',
  'create-and-ready-i18n',
  'initialize-navigation-preference',
  'initialize-workspace-session',
  'initialize-scroll-system',
  'mount-application',
  'register-post-mount-appearance-media-subscriptions',
  'publish-application-ready',
] as const

const bootstrapDependencies = [
  [],
  ['validate-build-and-runtime-configuration'],
  ['install-pre-vue-global-failure-capture'],
  ['initialize-design-system-and-resolve-first-paint-handoff'],
  ['create-vue-application'],
  [
    'initialize-design-system-and-resolve-first-paint-handoff',
    'create-vue-application',
    'create-pinia',
  ],
  [
    'validate-build-and-runtime-configuration',
    'create-vue-application',
    'install-platform-providers',
  ],
  ['validate-build-and-runtime-configuration', 'install-platform-providers'],
  ['create-vue-application', 'create-and-ready-router', 'create-and-ready-storage'],
  ['create-pinia', 'create-and-ready-storage'],
  ['create-pinia', 'create-and-ready-router', 'create-and-ready-storage'],
  [
    'create-pinia',
    'create-and-ready-router',
    'create-and-ready-storage',
    'create-and-ready-i18n',
    'initialize-navigation-preference',
    'initialize-workspace-session',
  ],
  [
    'create-and-ready-router',
    'create-and-ready-storage',
    'create-and-ready-i18n',
    'initialize-navigation-preference',
    'initialize-workspace-session',
    'initialize-scroll-system',
  ],
  ['install-platform-providers', 'mount-application'],
  [
    'validate-build-and-runtime-configuration',
    'mount-application',
    'register-post-mount-appearance-media-subscriptions',
  ],
] as const

const disposalStepIds = [
  'withdraw-application-ready',
  'remove-appearance-media-subscriptions',
  'unmount-vue-application',
  'dispose-scroll-system',
  'dispose-workspace-session',
  'dispose-navigation-preference',
  'dispose-i18n',
  'dispose-storage',
  'dispose-router-and-history',
  'dispose-installed-platform-provider-handles',
  'dispose-pinia',
  'release-vue-application-creation-handle',
  'release-first-paint-handoff-and-safety-handle',
  'dispose-global-failure-capture',
  'abort-release-runtime-configuration-handle',
] as const

const configurationFailureCauses = [
  'configuration-source-missing',
  'configuration-network-failure',
  'configuration-malformed-json',
  'configuration-schema-rejected',
  'configuration-environment-mismatch',
  'configuration-release-mismatch',
  'configuration-build-mismatch',
  'configuration-base-mismatch',
  'configuration-origin-prohibited',
  'configuration-document-mismatch',
  'configuration-first-paint-mismatch',
] as const

const coreErrorIds = [
  'runtime-configuration-failure',
  'application-startup-failure',
  'vue-component-failure',
  'unhandled-promise-rejection',
] as const

const coreErrorMessageKeys = [
  'core-error.runtime-configuration-failure',
  'core-error.application-startup-failure',
  'core-error.vue-component-failure',
  'core-error.unhandled-promise-rejection',
] as const

const prohibitedContextFields = [
  'Cookie',
  'Authorization',
  'Token',
  'Password',
  'Secret',
  'CSRF',
  'full URL',
  'query',
  'form value',
  'request body',
  'response body',
  'Storage payload',
  'file content',
  'DOM text',
  'raw Runtime Configuration',
  'raw event',
  'raw Promise',
  'raw component instance',
  'component props',
  'component emits',
  'raw cause',
  'raw message',
  'raw stack',
] as const

const expectedRegistryRecords: Readonly<Record<(typeof coreErrorIds)[number], ComparableValue>> = {
  'runtime-configuration-failure': {
    id: 'runtime-configuration-failure',
    owner: 'apps/web/src/app/errors registry and normalizer',
    producer: 'apps/web/src/app/config loader',
    recoveryExecutor: 'runtime-kernel',
    category: 'configuration',
    userMessageKey: 'core-error.runtime-configuration-failure',
    recoverability: 'retry-operation',
    retryOwner: 'runtime-kernel',
    reportLevel: 'fatal',
    safeContextFields: [
      'startupAttemptId',
      'configurationFailureCause',
      'releaseSha',
      'buildVersion',
    ],
    normalizationSource: 'typed Runtime Configuration loader failure',
    fatalForCurrentAttempt: true,
    stateWhenRetryBudgetAvailable: 'recoverable-failure',
    stateWhenRetryBudgetExhausted: 'fatal-failure',
    startupPrecedence: 'configuration-first-before-global-capture',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  },
  'application-startup-failure': {
    id: 'application-startup-failure',
    owner: 'apps/web/src/app/errors registry and normalizer',
    producer: 'runtime-kernel bootstrap-step boundary',
    presentationOwner: 'runtime-kernel',
    category: 'startup',
    userMessageKey: 'core-error.application-startup-failure',
    recoverability: 'reload-application',
    retryOwner: 'user',
    reportLevel: 'fatal',
    safeContextFields: ['startupAttemptId', 'bootstrapStepId', 'releaseSha', 'buildVersion'],
    normalizationSource: 'bootstrap-step catch or unclaimed startup-phase window.error',
    fatalForCurrentAttempt: true,
    startupPrecedence: 'initial-root-component-failure-is-application-startup-failure-once',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  },
  'vue-component-failure': {
    id: 'vue-component-failure',
    owner: 'apps/web/src/app/errors capture and normalizer',
    producer: 'app.config.errorHandler or admitted component boundary',
    presentationOwner: 'admitted page boundary or AppErrorBoundary',
    category: 'component',
    userMessageKey: 'core-error.vue-component-failure',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: ['startupAttemptId', 'vueLifecyclePhase', 'releaseSha', 'buildVersion'],
    normalizationSource: 'app.config.errorHandler or admitted component boundary',
    fatalForCurrentAttempt: false,
    allowedVueLifecyclePhase: ['render', 'setup', 'lifecycle', 'watcher'],
    startupPrecedence: 'initial-root-mount-propagates-to-application-startup-failure',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  },
  'unhandled-promise-rejection': {
    id: 'unhandled-promise-rejection',
    owner: 'apps/web/src/app/errors global capture',
    producer: 'the one global unhandledrejection listener',
    category: 'unknown',
    userMessageKey: 'core-error.unhandled-promise-rejection',
    recoverability: 'none',
    retryOwner: 'none',
    reportLevel: 'error',
    safeContextFields: [
      'applicationStartupState',
      'startupAttemptId',
      'releaseSha',
      'buildVersion',
    ],
    normalizationSource: 'PromiseRejectionEvent.reason at the global listener',
    fatalForCurrentAttempt: false,
    triggersStartupRecovery: false,
    startupPrecedence: 'never-triggers-startup-recovery',
    duplicateCaptureBehavior: 'preserve-opaque-identity-and-do-not-recapture',
    capabilityStatus: 'ACTIVE',
  },
}

function parseSource(path: string, text: string): ParsedSource {
  const script = path.endsWith('.vue')
    ? (/<script\b[^>]*>([\s\S]*?)<\/script>/u.exec(text)?.[1] ?? text)
    : text
  return {
    path,
    text: script,
    sourceFile: ts.createSourceFile(path, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  }
}

async function readSource(path: string): Promise<ParsedSource> {
  return parseSource(path, await readFile(path, 'utf8'))
}

async function collectTypeScriptSources(directory: string): Promise<ParsedSource[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const sources: ParsedSource[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      sources.push(...(await collectTypeScriptSources(path)))
    } else if (entry.isFile() && extname(entry.name) === '.ts') {
      sources.push(await readSource(path))
    }
  }

  return sources
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node)
  ts.forEachChild(node, (child) => {
    walk(child, visit)
  })
}

function nodesOf<T extends ts.Node>(node: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const result: T[] = []
  walk(node, (candidate) => {
    if (predicate(candidate)) {
      result.push(candidate)
    }
  })
  return result
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression
  }

  if (
    ts.isCallExpression(current) &&
    current.arguments.length === 1 &&
    ts.isPropertyAccessExpression(current.expression) &&
    ts.isIdentifier(current.expression.expression) &&
    current.expression.expression.text === 'Object' &&
    current.expression.name.text === 'freeze'
  ) {
    const frozenValue = current.arguments[0]
    if (frozenValue !== undefined) {
      return unwrapExpression(frozenValue)
    }
  }

  return current
}

function propertyName(name: ts.PropertyName | undefined): string | undefined {
  if (name === undefined) {
    return undefined
  }
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }
  return undefined
}

function propertyExpression(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const property = object.properties.find((candidate) => propertyName(candidate.name) === name)
  if (property === undefined) {
    return undefined
  }
  if (ts.isPropertyAssignment(property)) {
    return property.initializer
  }
  if (ts.isShorthandPropertyAssignment(property)) {
    return property.name
  }
  return undefined
}

function objectLiteral(
  expression: ts.Expression | undefined,
): ts.ObjectLiteralExpression | undefined {
  if (expression === undefined) {
    return undefined
  }
  const value = unwrapExpression(expression)
  return ts.isObjectLiteralExpression(value) ? value : undefined
}

function arrayLiteral(
  expression: ts.Expression | undefined,
): ts.ArrayLiteralExpression | undefined {
  if (expression === undefined) {
    return undefined
  }
  const value = unwrapExpression(expression)
  return ts.isArrayLiteralExpression(value) ? value : undefined
}

function literalValue(expression: ts.Expression | undefined): JsonPrimitive | undefined {
  if (expression === undefined) {
    return undefined
  }
  const value = unwrapExpression(expression)
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
    return value.text
  }
  if (ts.isNumericLiteral(value)) {
    return Number(value.text)
  }
  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  if (value.kind === ts.SyntaxKind.NullKeyword) {
    return null
  }
  return undefined
}

function stringArray(expression: ts.Expression | undefined): string[] | undefined {
  const array = arrayLiteral(expression)
  if (array === undefined) {
    return undefined
  }
  const values = array.elements.map((element) => literalValue(element))
  return values.every((value): value is string => typeof value === 'string') ? values : undefined
}

function variableInitializer(source: ParsedSource, name: string): ts.Expression | undefined {
  for (const declaration of nodesOf(source.sourceFile, ts.isVariableDeclaration)) {
    if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
      return declaration.initializer
    }
  }
  return undefined
}

function canonicalText(node: ts.Node, source: ParsedSource): string {
  return node.getText(source.sourceFile).replaceAll(/\s+/gu, '')
}

function callMemberName(call: ts.CallExpression): string | undefined {
  const expression = call.expression
  if (ts.isIdentifier(expression)) {
    return expression.text
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text
  }
  return undefined
}

function namedImportLocalName(
  sourceFile: ts.SourceFile,
  moduleName: string,
  importedName: string,
): string | undefined {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== moduleName
    ) {
      continue
    }

    const bindings = statement.importClause?.namedBindings
    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      continue
    }

    const specifier = bindings.elements.find(
      (candidate) => (candidate.propertyName?.text ?? candidate.name.text) === importedName,
    )
    if (specifier !== undefined) {
      return specifier.name.text
    }
  }

  return undefined
}

function memberPath(expression: ts.Expression | undefined): readonly string[] {
  if (expression === undefined) {
    return []
  }
  if (ts.isIdentifier(expression)) {
    return [expression.text]
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return [...memberPath(expression.expression), expression.name.text]
  }
  return []
}

function storedValuePath(expression: ts.Expression | undefined): readonly string[] {
  if (expression === undefined) {
    return []
  }

  let current: ts.Node = expression
  for (;;) {
    const parent = current.parent
    if (
      (ts.isAwaitExpression(parent) && parent.expression === current) ||
      ((ts.isParenthesizedExpression(parent) ||
        ts.isAsExpression(parent) ||
        ts.isSatisfiesExpression(parent) ||
        ts.isTypeAssertionExpression(parent) ||
        ts.isNonNullExpression(parent)) &&
        parent.expression === current)
    ) {
      current = parent
      continue
    }

    break
  }

  const parent = current.parent
  if (
    ts.isVariableDeclaration(parent) &&
    parent.initializer === current &&
    ts.isIdentifier(parent.name)
  ) {
    return [parent.name.text]
  }
  if (
    ts.isBinaryExpression(parent) &&
    parent.right === current &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    return memberPath(parent.left)
  }
  if (
    ts.isPropertyAssignment(parent) &&
    parent.initializer === current &&
    (ts.isIdentifier(parent.name) ||
      ts.isStringLiteral(parent.name) ||
      ts.isNumericLiteral(parent.name))
  ) {
    const ownerPath = storedValuePath(parent.parent)
    return ownerPath.length === 0 ? [] : [...ownerPath, parent.name.text]
  }
  if (ts.isArrayLiteralExpression(parent)) {
    const index = parent.elements.findIndex((element) => element === current)
    const ownerPath = storedValuePath(parent)
    return index < 0 || ownerPath.length === 0 ? [] : [...ownerPath, String(index)]
  }

  return []
}

function directStringArguments(source: ParsedSource, memberName: string): string[] {
  return nodesOf(source.sourceFile, ts.isCallExpression)
    .filter((call) => callMemberName(call) === memberName)
    .flatMap((call) => {
      const value = literalValue(call.arguments[0])
      return typeof value === 'string' ? [value] : []
    })
}

function equalArray(actual: readonly string[] | undefined, expected: readonly string[]): boolean {
  return (
    actual?.length === expected.length && actual.every((value, index) => value === expected[index])
  )
}

function exactObjectKeys(object: ts.ObjectLiteralExpression, expected: readonly string[]): boolean {
  const keys = object.properties.map((property) => propertyName(property.name))
  return equalArray(
    keys.every((key): key is string => key !== undefined) ? [...keys].sort() : undefined,
    [...expected].sort(),
  )
}

function comparableRecord(object: ts.ObjectLiteralExpression): Record<string, ComparableValue> {
  const result: Record<string, ComparableValue> = {}
  for (const property of object.properties) {
    const name = propertyName(property.name)
    if (name === undefined || !ts.isPropertyAssignment(property)) {
      continue
    }
    const primitive = literalValue(property.initializer)
    if (primitive !== undefined) {
      result[name] = primitive
      continue
    }
    const array = stringArray(property.initializer)
    if (array !== undefined) {
      result[name] = array
    }
  }
  return result
}

function sameComparable(actual: ComparableValue, expected: ComparableValue): boolean {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      return false
    }
    const actualValues = actual as readonly ComparableValue[]
    const expectedValues = expected as readonly ComparableValue[]
    return (
      actualValues.length === expectedValues.length &&
      actualValues.every((value, index) => {
        const expectedValue = expectedValues[index]
        return expectedValue !== undefined && sameComparable(value, expectedValue)
      })
    )
  }
  if (
    typeof actual === 'object' &&
    actual !== null &&
    typeof expected === 'object' &&
    expected !== null
  ) {
    const actualRecord = actual as Readonly<Record<string, ComparableValue>>
    const expectedRecord = expected as Readonly<Record<string, ComparableValue>>
    return Object.keys(expectedRecord).every(
      (key) =>
        key in actualRecord &&
        sameComparable(
          actualRecord[key] as ComparableValue,
          expectedRecord[key] as ComparableValue,
        ),
    )
  }
  return actual === expected
}

function validateBootstrapRegistry(source: ParsedSource): string[] {
  const violations: string[] = []
  const registry = arrayLiteral(variableInitializer(source, 'bootstrapStepRegistry'))
  const records = registry?.elements
    .map((element) => objectLiteral(element))
    .filter((record): record is ts.ObjectLiteralExpression => record !== undefined)

  if (records?.length !== bootstrapStepIds.length) {
    return ['Runtime Kernel Bootstrap Registry must contain exactly fifteen records.']
  }

  const actualIds = records.map((record) => literalValue(propertyExpression(record, 'id')))
  if (!equalArray(actualIds as string[], bootstrapStepIds)) {
    violations.push(
      'Runtime Kernel Bootstrap Registry IDs/order drifted from the exact fifteen-step contract.',
    )
  }

  records.forEach((record, index) => {
    const dependencies = stringArray(propertyExpression(record, 'dependencies'))
    if (!equalArray(dependencies, bootstrapDependencies[index] ?? [])) {
      violations.push(`Bootstrap step ${String(index + 1)} dependency graph drifted.`)
    }
    const mountOwner = literalValue(propertyExpression(record, 'domMountOwner'))
    if (mountOwner !== (actualIds[index] === 'mount-application')) {
      violations.push(`Bootstrap step ${String(index + 1)} Mount ownership drifted.`)
    }
    const retryEligible = literalValue(
      propertyExpression(record, 'ownFailureEligibleForConfigurationRetry'),
    )
    if (retryEligible !== (index === 0)) {
      violations.push(`Bootstrap step ${String(index + 1)} retry eligibility drifted.`)
    }
  })

  return violations
}

function validateBootstrapExecution(source: ParsedSource): string[] {
  const violations: string[] = []
  const enteredSteps = directStringArguments(source, 'enterBootstrapStep').filter((value) =>
    (bootstrapStepIds as readonly string[]).includes(value),
  )

  if (!equalArray(enteredSteps, bootstrapStepIds)) {
    violations.push(
      'Runtime Kernel execution must enter each exact Bootstrap step once and in Registry order.',
    )
  }

  const disposalSteps = nodesOf(source.sourceFile, ts.isCallExpression).flatMap((call) => {
    const value = literalValue(call.arguments[0])
    return typeof value === 'string' && (disposalStepIds as readonly string[]).includes(value)
      ? [value]
      : []
  })
  if (!equalArray(disposalSteps, disposalStepIds)) {
    violations.push(
      'Runtime Kernel reverse disposal order must match the exact fifteen-step contract.',
    )
  }

  const loadCalls = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'loadRuntimeConfiguration',
  )
  const createAppCalls = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'createVueApplication',
  )
  const createPiniaCalls = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'createPiniaProvider',
  )
  if (loadCalls.length !== 1 || createAppCalls.length !== 1 || createPiniaCalls.length !== 1) {
    violations.push(
      'Runtime Kernel must uniquely own configuration, Vue creation, and Pinia creation.',
    )
  } else if (
    (loadCalls[0]?.getStart(source.sourceFile) ?? 0) >
      (createAppCalls[0]?.getStart(source.sourceFile) ?? 0) ||
    (loadCalls[0]?.getStart(source.sourceFile) ?? 0) >
      (createPiniaCalls[0]?.getStart(source.sourceFile) ?? 0)
  ) {
    violations.push('Runtime Configuration must execute before Vue or Pinia creation.')
  }

  const providersImport = namedImportLocalName(
    source.sourceFile,
    './install-providers',
    'installPlatformProviders',
  )
  const providersCalls = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) =>
      providersImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === providersImport,
  )
  const providersInput = objectLiteral(providersCalls[0]?.arguments[0])
  if (
    providersCalls.length !== 1 ||
    providersInput === undefined ||
    !equalArray(memberPath(propertyExpression(providersInput, 'api')).slice(-2), [
      'configuration',
      'api',
    ])
  )
    violations.push(
      'The API read boundary must receive the existing validated Runtime Configuration API through provider installation.',
    )

  const routerFactoryImport = namedImportLocalName(
    source.sourceFile,
    '../router/router-lifecycle',
    'createAndReadyRouter',
  )
  const routerReadyCalls = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) =>
      routerFactoryImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === routerFactoryImport,
  )
  const routerReadyCall = routerReadyCalls[0]
  const routerReadyAwait =
    routerReadyCall?.parent !== undefined && ts.isAwaitExpression(routerReadyCall.parent)
      ? routerReadyCall.parent
      : undefined
  const routerHandlePath = storedValuePath(routerReadyCall)
  const routerInput = objectLiteral(routerReadyCall?.arguments[0])
  let enclosingFunction: ts.Node | undefined = routerReadyCall
  while (
    enclosingFunction !== undefined &&
    !ts.isFunctionDeclaration(enclosingFunction) &&
    !ts.isFunctionExpression(enclosingFunction) &&
    !ts.isArrowFunction(enclosingFunction) &&
    !ts.isMethodDeclaration(enclosingFunction)
  ) {
    enclosingFunction = enclosingFunction.parent
  }
  const attemptInputName =
    enclosingFunction !== undefined &&
    (ts.isFunctionDeclaration(enclosingFunction) ||
      ts.isFunctionExpression(enclosingFunction) ||
      ts.isArrowFunction(enclosingFunction) ||
      ts.isMethodDeclaration(enclosingFunction)) &&
    enclosingFunction.parameters[0]?.name !== undefined &&
    ts.isIdentifier(enclosingFunction.parameters[0].name)
      ? enclosingFunction.parameters[0].name.text
      : undefined
  const startupAttemptInput =
    routerInput === undefined ? undefined : propertyExpression(routerInput, 'startupAttemptId')
  const mountStepEntries = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) =>
      callMemberName(call) === 'enterBootstrapStep' &&
      literalValue(call.arguments[0]) === 'mount-application',
  )
  const routerDisposalCalls = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) => literalValue(call.arguments[0]) === 'dispose-router-and-history',
  )
  const routerDisposalOperation = routerDisposalCalls[0]?.arguments[1]
  const disposalHandlePaths =
    routerDisposalOperation === undefined
      ? []
      : nodesOf(routerDisposalOperation, ts.isCallExpression).flatMap((call) =>
          ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === 'dispose'
            ? [memberPath(call.expression.expression)]
            : [],
        )
  const disposalReceiverRoot = disposalHandlePaths[0]?.[0]
  let disposalOwner: ts.Node | undefined = routerDisposalCalls[0]
  while (disposalOwner !== undefined) {
    const ownsReceiverRoot =
      ts.isFunctionDeclaration(disposalOwner) ||
      ts.isFunctionExpression(disposalOwner) ||
      ts.isArrowFunction(disposalOwner) ||
      ts.isMethodDeclaration(disposalOwner)
        ? disposalOwner.parameters.some(
            (parameter) =>
              ts.isIdentifier(parameter.name) && parameter.name.text === disposalReceiverRoot,
          )
        : false

    if (ownsReceiverRoot) {
      break
    }

    disposalOwner = disposalOwner.parent
  }
  const disposalInputName =
    disposalOwner !== undefined &&
    (ts.isFunctionDeclaration(disposalOwner) ||
      ts.isFunctionExpression(disposalOwner) ||
      ts.isArrowFunction(disposalOwner) ||
      ts.isMethodDeclaration(disposalOwner)) &&
    disposalOwner.parameters[0]?.name !== undefined &&
    ts.isIdentifier(disposalOwner.parameters[0].name)
      ? disposalOwner.parameters[0].name.text
      : undefined
  const disposalFactoryName =
    disposalOwner !== undefined &&
    ts.isFunctionDeclaration(disposalOwner) &&
    disposalOwner.name !== undefined
      ? disposalOwner.name.text
      : undefined
  const routerResourceOwnerPath = routerHandlePath.slice(0, -1)
  const routerResourceMember = routerHandlePath.at(-1)
  const disposalFactoryCalls = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) =>
      disposalFactoryName !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === disposalFactoryName,
  )
  const disposalFactoryInput = objectLiteral(disposalFactoryCalls[0]?.arguments[0])
  const resourceHandoffProperty = disposalFactoryInput?.properties.find((property) => {
    const value =
      ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)
        ? propertyExpression(disposalFactoryInput, propertyName(property.name) ?? '')
        : undefined

    return equalArray(memberPath(value), routerResourceOwnerPath)
  })
  const resourceHandoffName = propertyName(resourceHandoffProperty?.name)
  const expectedDisposalHandlePath =
    disposalInputName === undefined ||
    resourceHandoffName === undefined ||
    routerResourceMember === undefined
      ? []
      : [disposalInputName, resourceHandoffName, routerResourceMember]
  const routerDisposalUsesHandle =
    disposalHandlePaths.some((path) => equalArray(path, routerHandlePath)) ||
    (disposalFactoryCalls.length === 1 &&
      expectedDisposalHandlePath.length !== 0 &&
      disposalHandlePaths.some((path) => equalArray(path, expectedDisposalHandlePath)))

  if (
    routerFactoryImport === undefined ||
    routerReadyCalls.length !== 1 ||
    routerReadyAwait === undefined ||
    routerHandlePath.length === 0 ||
    routerInput === undefined ||
    !exactObjectKeys(routerInput, ['application', 'configuration', 'startupAttemptId']) ||
    !equalArray(memberPath(startupAttemptInput), [attemptInputName ?? '', 'startupAttemptId']) ||
    mountStepEntries.length !== 1 ||
    routerReadyCall === undefined ||
    routerReadyCall.getStart(source.sourceFile) >
      (mountStepEntries[0]?.getStart(source.sourceFile) ?? 0) ||
    routerDisposalCalls.length !== 1 ||
    !routerDisposalUsesHandle
  ) {
    violations.push(
      'Runtime Kernel must await exactly one Router lifecycle handle before entering application Mount.',
    )
  }

  const readyWithdrawal = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'withdrawStartupCapture',
  )
  if (readyWithdrawal.length !== 1) {
    violations.push(
      'Ready transition must withdraw the startup window.error listener exactly once.',
    )
  }

  return violations
}

function validateConfigurationContract(source: ParsedSource): string[] {
  const violations: string[] = []
  if (
    !equalArray(stringArray(variableInitializer(source, 'compiledEnvironmentValues')), [
      'development',
      'production',
    ])
  ) {
    violations.push('Compiled Environment authority must contain exactly development/production.')
  }
  if (
    !equalArray(
      stringArray(variableInitializer(source, 'runtimeConfigurationFailureCauses')),
      configurationFailureCauses,
    )
  ) {
    violations.push(
      'Runtime Configuration Failure Cause authority must contain the exact eleven causes.',
    )
  }

  const schemaInitializer = variableInitializer(source, 'coreRuntimeConfigurationSchema')
  if (schemaInitializer === undefined) {
    violations.push('Core Runtime Configuration strict schema authority is missing.')
    return violations
  }
  let schema = unwrapExpression(schemaInitializer)
  while (
    ts.isCallExpression(schema) &&
    ts.isPropertyAccessExpression(schema.expression) &&
    schema.expression.name.text !== 'strictObject'
  ) {
    schema = unwrapExpression(schema.expression.expression)
  }
  if (
    !ts.isCallExpression(schema) ||
    !ts.isPropertyAccessExpression(schema.expression) ||
    schema.expression.name.text !== 'strictObject' ||
    schema.arguments.length !== 1
  ) {
    violations.push('Core Runtime Configuration must use one exact strict schema root.')
    return violations
  }
  const fields = objectLiteral(schema.arguments[0])
  if (
    fields === undefined ||
    !exactObjectKeys(fields, [
      'schemaVersion',
      'environment',
      'deploymentBase',
      'releaseSha',
      'buildVersion',
      'api',
      'presentation',
    ])
  ) {
    violations.push(
      'Core Runtime Configuration schema must contain the build identity, API and presentation fields.',
    )
    return violations
  }

  const fieldTexts = Object.fromEntries(
    fields.properties.flatMap((property) => {
      const name = propertyName(property.name)
      return name !== undefined && ts.isPropertyAssignment(property)
        ? [[name, canonicalText(property.initializer, source)]]
        : []
    }),
  )
  const expectedFields = {
    schemaVersion: 'z.literal(2)',
    environment: 'z.enum(compiledEnvironmentValues)',
    deploymentBase: "z.literal('/')",
    releaseSha: 'z.string().regex(/^[0-9a-f]{40}$/u)',
    buildVersion:
      'z.string().regex(/^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)$/u)',
    api: 'apiConfigurationSchema',
  }
  for (const [field, expected] of Object.entries(expectedFields)) {
    if (fieldTexts[field] !== expected) {
      violations.push(`Runtime Configuration field ${field} drifted from its exact strict rule.`)
    }
  }
  return violations
}

function validateConfigurationLoader(source: ParsedSource): string[] {
  const violations: string[] = []
  const calls = nodesOf(source.sourceFile, ts.isCallExpression)
  const stringArguments = (member: string): string[] => directStringArguments(source, member)

  if (
    !equalArray(
      stringArguments('querySelectorAll').filter((value) =>
        value.includes('runtime-configuration'),
      ),
      ['[data-runtime-configuration-url]'],
    )
  ) {
    violations.push('Runtime Configuration loader must have one exact HTML carrier selector.')
  }
  if (!stringArguments('matches').includes('script[type="module"][src]')) {
    violations.push('Runtime Configuration carrier must be the existing module bootstrap script.')
  }
  if (!stringArguments('getAttribute').includes('data-runtime-configuration-url')) {
    violations.push('Runtime Configuration loader must read the exact carrier attribute.')
  }

  const newUrls = nodesOf(source.sourceFile, ts.isNewExpression).filter(
    (expression) => ts.isIdentifier(expression.expression) && expression.expression.text === 'URL',
  )
  if (newUrls.length !== 3) {
    violations.push('Runtime Configuration loader must own exactly three URL constructions.')
  }

  const pathLiterals = nodesOf(source.sourceFile, ts.isStringLiteral).map((literal) => literal.text)
  for (const path of [
    '/runtime-configuration.json',
    '/generated/critical-theme.css',
    '/generated/appearance-init.js',
  ]) {
    if (pathLiterals.filter((literal) => literal === path).length !== 1) {
      violations.push(`Runtime Configuration path authority ${path} must occur exactly once.`)
    }
  }

  const fetchCalls = calls.filter((call) => {
    const options = objectLiteral(call.arguments[1])
    return (
      options !== undefined &&
      literalValue(propertyExpression(options, 'credentials')) === 'same-origin' &&
      literalValue(propertyExpression(options, 'cache')) === 'no-store' &&
      literalValue(propertyExpression(options, 'redirect')) === 'error' &&
      propertyExpression(options, 'signal') !== undefined
    )
  })
  if (fetchCalls.length !== 1) {
    violations.push('Runtime Configuration fetch must use the exact single request option set.')
  }

  const expectedCallCounts: Readonly<Record<string, number>> = {
    text: 1,
    parse: 1,
    safeParse: 1,
  }
  for (const [member, expectedCount] of Object.entries(expectedCallCounts)) {
    if (calls.filter((call) => callMemberName(call) === member).length !== expectedCount) {
      violations.push(
        `Runtime Configuration loader must call ${member} exactly ${String(expectedCount)} time(s).`,
      )
    }
  }

  const causeCounts = new Map<string, number>()
  for (const literal of nodesOf(source.sourceFile, ts.isStringLiteral)) {
    if ((configurationFailureCauses as readonly string[]).includes(literal.text)) {
      causeCounts.set(literal.text, (causeCounts.get(literal.text) ?? 0) + 1)
    }
  }
  const expectedCauseCounts: Readonly<Record<string, number>> = {
    'configuration-source-missing': 1,
    'configuration-network-failure': 3,
    'configuration-malformed-json': 1,
    'configuration-schema-rejected': 1,
    'configuration-environment-mismatch': 1,
    'configuration-release-mismatch': 1,
    'configuration-build-mismatch': 1,
    'configuration-base-mismatch': 1,
    'configuration-origin-prohibited': 2,
    'configuration-document-mismatch': 2,
    'configuration-first-paint-mismatch': 1,
  }
  for (const cause of configurationFailureCauses) {
    if (causeCounts.get(cause) !== expectedCauseCounts[cause]) {
      violations.push(`Runtime Configuration cause mapping/count drifted for ${cause}.`)
    }
  }

  const executor = nodesOf(source.sourceFile, ts.isFunctionDeclaration).find((fn) =>
    configurationFailureCauses.every((cause) =>
      fn.getText(source.sourceFile).includes(`'${cause}'`),
    ),
  )
  if (executor?.body === undefined) {
    violations.push('Runtime Configuration execution boundary is missing.')
    return violations
  }
  const executorText = canonicalText(executor.body, source)
  const orderedFragments = [
    'configuration-source-missing',
    'newURL(',
    'configuration-origin-prohibited',
    "credentials:'same-origin'",
    '.ok',
    '.text()',
    'JSON.parse(',
    '.safeParse(',
    'configuration-environment-mismatch',
    'configuration-release-mismatch',
    'configuration-build-mismatch',
    'configuration-base-mismatch',
    'configuration-document-mismatch',
    'configuration-first-paint-mismatch',
    "status:'success'",
  ]
  let previous = -1
  for (const fragment of orderedFragments) {
    const position = executorText.indexOf(fragment, previous + 1)
    if (position < 0) {
      violations.push(`Runtime Configuration compatibility sequence is missing ${fragment}.`)
      break
    }
    previous = position
  }

  const compatibilityPairs = [
    ['environment', 'environment'],
    ['releaseSha', 'releaseSha'],
    ['buildVersion', 'buildVersion'],
    ['deploymentBase', 'BASE_URL'],
  ] as const
  const binaryTexts = nodesOf(executor.body, ts.isBinaryExpression).map((node) =>
    canonicalText(node, source),
  )
  for (const [left, right] of compatibilityPairs) {
    if (!binaryTexts.some((text) => text.includes(`.${left}!==`) && text.includes(right))) {
      violations.push(`Runtime Configuration ${left} compatibility authority drifted.`)
    }
  }

  return violations
}

function validateCoreErrorRegistry(source: ParsedSource): string[] {
  const violations: string[] = []
  if (
    !equalArray(
      stringArray(variableInitializer(source, 'coreErrorProhibitedContextFields')),
      prohibitedContextFields,
    )
  ) {
    violations.push('Core Error prohibited-context authority drifted.')
  }
  const registry = arrayLiteral(variableInitializer(source, 'coreErrorRegistry'))
  const records = registry?.elements
    .map((element) => objectLiteral(element))
    .filter((record): record is ts.ObjectLiteralExpression => record !== undefined)
  if (records?.length !== 4) {
    return [...violations, 'Core Error Registry must contain exactly four records.']
  }
  const ids = records.map((record) => literalValue(propertyExpression(record, 'id')))
  if (!equalArray(ids as string[], coreErrorIds)) {
    violations.push('Core Error Registry ID/order drifted from the exact four-record authority.')
  }
  records.forEach((record) => {
    const id = literalValue(propertyExpression(record, 'id'))
    if (typeof id !== 'string' || !(id in expectedRegistryRecords)) {
      return
    }
    const actual = comparableRecord(record)
    const expected = expectedRegistryRecords[id as keyof typeof expectedRegistryRecords]
    if (!sameComparable(actual, expected)) {
      violations.push(`Core Error Registry metadata drifted for ${id}.`)
    }
    const prohibited = propertyExpression(record, 'prohibitedContextFields')
    if (
      prohibited === undefined ||
      !ts.isIdentifier(prohibited) ||
      prohibited.text !== 'coreErrorProhibitedContextFields'
    ) {
      violations.push(
        `Core Error record ${id} must consume the single prohibited-context authority.`,
      )
    }
  })
  return violations
}

function validateCoreErrorMessages(source: ParsedSource): string[] {
  const table = objectLiteral(variableInitializer(source, 'coreErrorMessageTable'))
  if (table === undefined) {
    return ['Core Error safe message authority is missing.']
  }
  const keys = table.properties.map((property) => propertyName(property.name))
  return equalArray(keys as string[], coreErrorMessageKeys)
    ? []
    : ['Core Error safe message authority must contain exactly the four frozen message keys.']
}

function validateNormalizersAndLedger(normalizer: ParsedSource, coreError: ParsedSource): string[] {
  const violations: string[] = []
  const createdIds = directStringArguments(normalizer, 'createNormalizedCoreError')
  if (!equalArray(createdIds, coreErrorIds)) {
    violations.push('Core Error normalizers must create exactly the four registered error IDs.')
  }
  if (
    nodesOf(normalizer.sourceFile, ts.isCallExpression).filter(
      (call) => callMemberName(call) === 'isNormalizedCoreError',
    ).length !== 4
  ) {
    violations.push(
      'Every Core Error normalizer must preserve an already-normalized opaque identity.',
    )
  }
  const weakSets = nodesOf(coreError.sourceFile, ts.isNewExpression).filter(
    (node) => ts.isIdentifier(node.expression) && node.expression.text === 'WeakSet',
  )
  const maps = nodesOf(coreError.sourceFile, ts.isNewExpression).filter(
    (node) => ts.isIdentifier(node.expression) && node.expression.text === 'Map',
  )
  if (weakSets.length !== 2 || maps.length !== 1) {
    violations.push('Core Error identity/capture dedupe authorities must remain exact.')
  }
  for (const field of ['errorInstanceId', 'safeContext']) {
    if (!coreError.text.includes(field)) {
      violations.push(`Normalized Core Error safe shape is missing ${field}.`)
    }
  }
  for (const forbidden of ['message:', 'stack:', 'cause:']) {
    if (coreError.text.includes(forbidden)) {
      violations.push(`Normalized Core Error must not expose ${forbidden.slice(0, -1)}.`)
    }
  }
  return violations
}

function validateLocalDiagnostics(kernel: ParsedSource): string[] {
  const violations: string[] = []
  const start = nodesOf(kernel.sourceFile, ts.isFunctionDeclaration).find(
    (declaration) => declaration.name?.text === 'startRuntimeKernel',
  )
  if (start === undefined) return ['Local diagnostics require the running kernel owner.']

  const imports = nodesOf(kernel.sourceFile, ts.isImportDeclaration).find(
    (declaration) => literalValue(declaration.moduleSpecifier) === '../errors/core-error',
  )?.importClause?.namedBindings
  const importedNames =
    imports !== undefined && ts.isNamedImports(imports)
      ? new Set(imports.elements.map((element) => element.name.text))
      : new Set<string>()
  const installs = nodesOf(start, ts.isCallExpression).filter(
    (call) =>
      ts.isIdentifier(call.expression) &&
      importedNames.has(call.expression.text) &&
      call.arguments.length === 2 &&
      call.arguments[0]?.getText(kernel.sourceFile) === 'window' &&
      call.arguments[1] !== undefined &&
      ts.isIdentifier(call.arguments[1]),
  )
  const install = installs[0]
  const ledgerArgument = install?.arguments[1]
  const declaration = install?.parent
  if (
    installs.length !== 1 ||
    ledgerArgument === undefined ||
    !ts.isIdentifier(ledgerArgument) ||
    declaration === undefined ||
    !ts.isVariableDeclaration(declaration) ||
    !ts.isIdentifier(declaration.name)
  ) {
    return ['The running kernel must install exactly one local diagnostic facade.']
  }
  const ledgerInitializer = variableInitializer(kernel, ledgerArgument.text)
  if (
    ledgerInitializer === undefined ||
    !ts.isCallExpression(ledgerInitializer) ||
    !ts.isIdentifier(ledgerInitializer.expression) ||
    !importedNames.has(ledgerInitializer.expression.text)
  ) {
    violations.push('The local diagnostic facade must read the kernel-owned ledger.')
  }

  const disposal = nodesOf(start, ts.isMethodDeclaration).find(
    (method) => propertyName(method.name) === 'dispose',
  )
  const hasCleanup =
    disposal !== undefined &&
    nodesOf(disposal, ts.isTryStatement).some((statement) => {
      if (statement.finallyBlock === undefined) return false
      const calls = nodesOf(statement.finallyBlock, ts.isCallExpression)
      return (
        calls.some(
          (call) =>
            ts.isPropertyAccessExpression(call.expression) &&
            ts.isIdentifier(call.expression.expression) &&
            call.expression.expression.text === ledgerArgument.text &&
            call.expression.name.text === 'dispose',
        ) &&
        calls.some(
          (call) =>
            ts.isIdentifier(call.expression) && call.expression.text === declaration.name.getText(),
        )
      )
    })
  if (!hasCleanup)
    violations.push('Final kernel disposal must clear and release local diagnostics.')
  return violations
}

function localDiagnosticsProbes(): string[] {
  const violations: string[] = []
  const ledger = createCoreErrorLedger()
  const target = {}
  const key = '__PAVP_ERROR_DIAGNOSTICS__'
  const release = installCoreErrorDiagnostics(target, ledger)
  const descriptor = Object.getOwnPropertyDescriptor(target, key)
  const value: unknown = descriptor?.value
  if (
    descriptor?.configurable !== true ||
    descriptor.enumerable !== false ||
    descriptor.writable !== false ||
    typeof value !== 'object' ||
    value === null ||
    !('snapshot' in value) ||
    typeof value.snapshot !== 'function' ||
    !Object.isFrozen(value)
  ) {
    release()
    ledger.dispose()
    return ['Local diagnostics must expose one immutable, read-only snapshot facade.']
  }
  const facade = value as { snapshot(): readonly NormalizedCoreError[] }
  const emptySnapshot = facade.snapshot()
  const input = {
    source: new Error('private diagnostic probe'),
    applicationStartupState: 'ready' as const,
    startupAttemptId: createStartupAttemptId(),
    releaseSha: 'probe',
    buildVersion: 'probe',
  }
  const errors = Array.from({ length: 101 }, () => normalizeUnhandledPromiseRejection(input))
  for (const error of errors) ledger.capture(error)
  const snapshot = facade.snapshot()
  const first = errors[0]
  const second = errors[1]
  const last = errors.at(-1)
  if (
    first === undefined ||
    second === undefined ||
    last === undefined ||
    snapshot.length !== 100 ||
    snapshot[0] !== second ||
    snapshot.at(-1) !== last ||
    ledger.has(first) ||
    ledger.capture(first) ||
    emptySnapshot.length !== 0 ||
    !Object.isFrozen(snapshot) ||
    !Object.isFrozen(snapshot[0]) ||
    !Object.isFrozen(snapshot[0].safeContext) ||
    JSON.stringify(snapshot).includes('private diagnostic probe')
  ) {
    violations.push('Local diagnostics must retain only the latest 100 immutable safe records.')
  }

  Object.defineProperty(target, key, { configurable: true, value: 'replacement' })
  release()
  if (Reflect.get(target, key) !== 'replacement') {
    violations.push('Diagnostic disposal must preserve a replacement property.')
  }
  const secondTarget = {}
  const releaseSecond = installCoreErrorDiagnostics(secondTarget, ledger)
  releaseSecond()
  ledger.dispose()
  if (Object.hasOwn(secondTarget, key) || facade.snapshot().length !== 0) {
    violations.push('Diagnostic disposal must remove its facade and clear stale snapshots.')
  }

  const occupied = Object.defineProperty({}, key, { value: 'occupied' })
  const inherited = Object.create({ [key]: 'inherited' }) as object
  const oldWarn = console.warn
  let warningCount = 0
  let collisionThrew = false
  try {
    console.warn = () => {
      warningCount += 1
      throw new Error('simulated console failure')
    }
    installCoreErrorDiagnostics(occupied, ledger)()
    installCoreErrorDiagnostics(inherited, ledger)()
  } catch {
    collisionThrew = true
  } finally {
    console.warn = oldWarn
  }
  if (
    collisionThrew ||
    warningCount !== 2 ||
    Reflect.get(occupied, key) !== 'occupied' ||
    Object.hasOwn(inherited, key) ||
    Reflect.get(inherited, key) !== 'inherited'
  ) {
    violations.push('A diagnostic property collision must be non-fatal and preserve its owner.')
  }
  return violations
}

function validatePageBoundaryInjection(
  coreError: ParsedSource,
  rootBoundary: ParsedSource,
  retention: ParsedSource,
): string[] {
  const violations: string[] = []
  const injectionKey = namedImportLocalName(coreError.sourceFile, 'vue', 'InjectionKey')
  const keys = nodesOf(coreError.sourceFile, ts.isVariableDeclaration).filter((declaration) => {
    const type = declaration.type
    return (
      type !== undefined &&
      ts.isTypeReferenceNode(type) &&
      ts.isIdentifier(type.typeName) &&
      type.typeName.text === injectionKey &&
      type.typeArguments?.length === 1 &&
      type.typeArguments[0]?.getText(coreError.sourceFile) === 'AppErrorBoundaryHooks'
    )
  })
  const key = keys[0]
  if (
    keys.length !== 1 ||
    key === undefined ||
    !ts.isIdentifier(key.name) ||
    key.initializer === undefined ||
    !ts.isCallExpression(key.initializer) ||
    callMemberName(key.initializer) !== 'Symbol'
  ) {
    return ['Page boundaries must share one typed AppErrorBoundaryHooks key in the Error owner.']
  }
  const rootKey = namedImportLocalName(rootBoundary.sourceFile, './core-error', key.name.text)
  const provide = namedImportLocalName(rootBoundary.sourceFile, 'vue', 'provide')
  const providers = nodesOf(rootBoundary.sourceFile, ts.isCallExpression).filter(
    (call) => callMemberName(call) === provide && memberPath(call.arguments[0])[0] === rootKey,
  )
  if (
    rootKey === undefined ||
    providers.length !== 1 ||
    memberPath(providers[0]?.arguments[1]).at(-1) !== 'errorHooks'
  ) {
    violations.push('AppErrorBoundary must provide its existing errorHooks through the typed key.')
  }
  const localKey = namedImportLocalName(retention.sourceFile, '../errors/core-error', key.name.text)
  const inject = namedImportLocalName(retention.sourceFile, 'vue', 'inject')
  if (
    localKey === undefined ||
    nodesOf(retention.sourceFile, ts.isCallExpression).filter(
      (call) => callMemberName(call) === inject && memberPath(call.arguments[0])[0] === localKey,
    ).length === 0
  ) {
    violations.push('Local page capture must consume the same application-owned errorHooks key.')
  }
  return violations
}

function validateVueBoundaryCapture(source: ParsedSource): string[] {
  const violations: string[] = []
  const hook = namedImportLocalName(source.sourceFile, 'vue', 'onErrorCaptured')
  const normalizer =
    namedImportLocalName(source.sourceFile, './error-normalizer', 'normalizeVueComponentFailure') ??
    namedImportLocalName(
      source.sourceFile,
      '../errors/error-normalizer',
      'normalizeVueComponentFailure',
    )
  const registrations = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) => callMemberName(call) === hook,
  )
  if (hook === undefined || registrations.length === 0) {
    return ['Component boundaries must register Vue descendant error capture.']
  }
  for (const registration of registrations) {
    const callback = registration.arguments[0]
    if (
      callback === undefined ||
      (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) ||
      callback.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
      !ts.isBlock(callback.body)
    ) {
      violations.push('Component capture must synchronously stop handled-error propagation.')
      continue
    }
    const calls = nodesOf(callback.body, ts.isCallExpression)
    const normalized = calls.find((call) => callMemberName(call) === normalizer)
    const captured = calls.find(
      (call) =>
        callMemberName(call) === 'capture' &&
        equalArray(memberPath(call.arguments[0]), storedValuePath(normalized)),
    )
    const startup = nodesOf(callback.body, ts.isIfStatement).find(
      (statement) =>
        nodesOf(statement.expression, ts.isCallExpression).some(
          (call) => callMemberName(call) === 'getStartupState',
        ) &&
        nodesOf(statement.expression, ts.isStringLiteral).some(
          (literal) => literal.text === 'starting',
        ),
    )
    const startupReturns =
      startup === undefined ? [] : nodesOf(startup.thenStatement, ts.isReturnStatement)
    if (
      startup === undefined ||
      normalized === undefined ||
      startup.end > normalized.pos ||
      startupReturns.length === 0 ||
      startupReturns.some(
        (statement) =>
          statement.expression !== undefined &&
          !(ts.isIdentifier(statement.expression) && statement.expression.text === 'undefined'),
      )
    ) {
      violations.push('Component capture must propagate startup failures before normalization.')
    }
    const returns = nodesOf(callback.body, ts.isReturnStatement)
    if (
      normalized === undefined ||
      captured === undefined ||
      captured.pos < normalized.end ||
      !returns.some(
        (statement) => statement.pos > captured.end && literalValue(statement.expression) === false,
      ) ||
      returns.some(
        (statement) =>
          statement.pos > normalized.end && literalValue(statement.expression) !== false,
      )
    ) {
      violations.push(
        'Handled component failures must normalize and capture once before returning false.',
      )
    }
    if (captured !== undefined) {
      const captureResult = storedValuePath(captured)
      const decisions = nodesOf(callback.body, ts.isIfStatement).map(
        (statement) => statement.expression,
      )
      if (
        decisions.some(
          (condition) =>
            nodesOf(condition, ts.isCallExpression).includes(captured) ||
            (captureResult.length === 1 &&
              nodesOf(condition, ts.isIdentifier).some(
                (identifier) => identifier.text === captureResult[0],
              )),
        )
      ) {
        violations.push(
          'Duplicate component capture must not decide whether propagation is stopped.',
        )
      }
    }
    const swallowed = nodesOf(callback.body, ts.isTryStatement).some((statement) => {
      if (statement.catchClause === undefined) return false
      const protectedCalls = nodesOf(statement.tryBlock, ts.isCallExpression)
      return (
        ((normalized !== undefined && protectedCalls.includes(normalized)) ||
          (captured !== undefined && protectedCalls.includes(captured))) &&
        (nodesOf(statement.catchClause.block, ts.isReturnStatement).length > 0 ||
          !ts.isThrowStatement(
            statement.catchClause.block.statements.at(-1) ?? statement.catchClause,
          ))
      )
    })
    if (swallowed) {
      violations.push('Component normalization and capture machinery failures must propagate.')
    }
  }
  return violations
}

function pageBoundaryConnections(source: ParsedSource): readonly {
  readonly name: string
  readonly calls: readonly ts.CallExpression[]
}[] {
  const hook = namedImportLocalName(source.sourceFile, 'vue', 'onErrorCaptured')
  const registrations = nodesOf(source.sourceFile, ts.isCallExpression).filter(
    (call) => callMemberName(call) === hook,
  )
  const helpers = registrations.flatMap((registration) => {
    let owner: ts.Node = registration.parent
    while (!ts.isSourceFile(owner)) {
      if (ts.isFunctionDeclaration(owner) && owner.name !== undefined) return [owner.name.text]
      if (ts.isVariableDeclaration(owner) && ts.isIdentifier(owner.name)) return [owner.name.text]
      if (ts.isMethodDeclaration(owner)) return []
      owner = owner.parent
    }
    return []
  })
  return ['InstanceBoundary', 'OrdinaryBoundary'].map((name) => {
    const boundary = variableInitializer(source, name)
    const setup =
      boundary === undefined
        ? undefined
        : nodesOf(boundary, ts.isMethodDeclaration).find(
            (method) => propertyName(method.name) === 'setup',
          )
    const calls =
      setup === undefined
        ? []
        : nodesOf(setup, ts.isCallExpression).filter(
            (call) => registrations.includes(call) || helpers.includes(callMemberName(call) ?? ''),
          )
    return { name, calls }
  })
}

function validatePageBoundaryConnections(source: ParsedSource): string[] {
  return pageBoundaryConnections(source).flatMap(({ name, calls }) =>
    calls.length === 0
      ? [`${name} must install the existing local Vue capture responsibility.`]
      : [],
  )
}

function validatePageFallbackAcknowledgment(source: ParsedSource): string[] {
  const violations: string[] = []
  const nativeFallback = nodesOf(source.sourceFile, ts.isFunctionDeclaration).find((declaration) =>
    nodesOf(declaration, ts.isCallExpression).some((call) => {
      if (typeof literalValue(call.arguments[0]) !== 'string') return false
      const props = objectLiteral(call.arguments[1])
      const hook = props === undefined ? undefined : propertyExpression(props, 'onVnodeMounted')
      return (
        hook !== undefined &&
        ts.isIdentifier(hook) &&
        declaration.parameters.some(
          (parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === hook.text,
        )
      )
    }),
  )
  if (nativeFallback?.name === undefined)
    return ['Local fallback must acknowledge its actual native DOM mount.']
  const nativeProps = nodesOf(nativeFallback, ts.isObjectLiteralExpression).find(
    (object) => propertyExpression(object, 'onVnodeMounted') !== undefined,
  )
  const mountHook =
    nativeProps === undefined ? undefined : propertyExpression(nativeProps, 'onVnodeMounted')
  const mountIndex = nativeFallback.parameters.findIndex(
    (parameter) =>
      mountHook !== undefined &&
      ts.isIdentifier(mountHook) &&
      ts.isIdentifier(parameter.name) &&
      parameter.name.text === mountHook.text,
  )
  const keepAlive = namedImportLocalName(source.sourceFile, 'vue', 'KeepAlive')
  for (const name of ['InstanceBoundary', 'OrdinaryBoundary']) {
    const boundary = variableInitializer(source, name)
    const fallback =
      boundary === undefined
        ? undefined
        : nodesOf(boundary, ts.isCallExpression).find(
            (call) => callMemberName(call) === nativeFallback.name?.text,
          )
    const mounted = fallback?.arguments[mountIndex]
    if (
      fallback === undefined ||
      mounted === undefined ||
      !nodesOf(mounted, ts.isCallExpression).some(
        (call) =>
          callMemberName(call) === 'rendered' &&
          literalValue(call.arguments[1]) === 'component-fallback',
      )
    ) {
      violations.push(`${name} must acknowledge fallback only from its actual native mount.`)
      continue
    }
    if (name === 'InstanceBoundary') {
      let branch: ts.Node = fallback.parent
      while (!ts.isSourceFile(branch) && !ts.isIfStatement(branch)) branch = branch.parent
      if (
        !ts.isIfStatement(branch) ||
        nodesOf(branch, ts.isCallExpression).some(
          (call) => memberPath(call.arguments[0])[0] === keepAlive,
        )
      )
        violations.push(
          'Failed Workspace content must replace its entire internal KeepAlive subtree.',
        )
    } else if (boundary !== undefined) {
      const witness = nodesOf(mounted, ts.isBinaryExpression).find(
        (binary) =>
          literalValue(binary.right) === 'component-fallback' && ts.isIdentifier(binary.left),
      )?.left
      const mount = namedImportLocalName(source.sourceFile, 'vue', 'onMounted')
      const update = namedImportLocalName(source.sourceFile, 'vue', 'onUpdated')
      for (const hook of nodesOf(boundary, ts.isCallExpression).filter(
        (call) => callMemberName(call) === mount || callMemberName(call) === update,
      )) {
        const argument = hook.arguments[0]
        const callback =
          argument !== undefined && ts.isIdentifier(argument)
            ? variableInitializer(source, argument.text)
            : argument
        if (
          callback === undefined ||
          witness === undefined ||
          !ts.isIdentifier(witness) ||
          !nodesOf(callback, ts.isIfStatement).some((statement) =>
            nodesOf(statement.expression, ts.isBinaryExpression).some(
              (binary) =>
                ts.isIdentifier(binary.left) &&
                binary.left.text === witness.text &&
                literalValue(binary.right) === 'component-fallback',
            ),
          )
        )
          violations.push(
            'Ordinary fallback updates must require an actual native-mount acknowledgment.',
          )
      }
    }
  }
  return violations
}

function validateGlobalCapture(
  source: ParsedSource,
  allSources: readonly ParsedSource[],
): string[] {
  const violations: string[] = []
  const addEvents = directStringArguments(source, 'addEventListener')
  const removeEvents = directStringArguments(source, 'removeEventListener')
  if (!equalArray(addEvents, ['error', 'unhandledrejection'])) {
    violations.push('Global failure capture must install exactly error then unhandledrejection.')
  }
  if (!equalArray(removeEvents, ['error', 'unhandledrejection'])) {
    violations.push('Global failure capture must remove exactly error then unhandledrejection.')
  }
  const allAddEvents = allSources.flatMap((candidate) =>
    directStringArguments(candidate, 'addEventListener'),
  )
  if (
    allAddEvents.filter((event) => event === 'error').length !== 1 ||
    allAddEvents.filter((event) => event === 'unhandledrejection').length !== 1
  ) {
    violations.push('Global failure listener ownership must be unique application-wide.')
  }
  const normalizedIds = [
    ...nodesOf(source.sourceFile, ts.isCallExpression).map((call) => callMemberName(call)),
  ]
  if (
    !normalizedIds.includes('normalizeApplicationStartupFailure') ||
    !normalizedIds.includes('normalizeUnhandledPromiseRejection')
  ) {
    violations.push('Global listeners must normalize only through the Core Error authority.')
  }
  const rejectionRegistration = nodesOf(source.sourceFile, ts.isCallExpression).find(
    (call) =>
      callMemberName(call) === 'addEventListener' &&
      literalValue(call.arguments[0]) === 'unhandledrejection',
  )
  const listener = rejectionRegistration?.arguments[1]
  const callback =
    listener !== undefined && ts.isIdentifier(listener)
      ? variableInitializer(source, listener.text)
      : listener
  const eventParameter =
    callback !== undefined && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
      ? callback.parameters[0]?.name
      : undefined
  if (
    callback === undefined ||
    eventParameter === undefined ||
    !ts.isIdentifier(eventParameter) ||
    !nodesOf(callback, ts.isCallExpression).some(
      (call) =>
        ts.isPropertyAccessExpression(call.expression) &&
        ts.isIdentifier(call.expression.expression) &&
        call.expression.expression.text === eventParameter.text &&
        call.expression.name.text === 'preventDefault',
    )
  ) {
    violations.push('Unhandled rejections must not expose raw reasons through browser reporting.')
  }
  return violations
}

function validateVueMount(
  createApplication: ParsedSource,
  allSources: readonly ParsedSource[],
): string[] {
  const violations: string[] = []
  const sourcesByPath = new Map(allSources.map((source) => [resolve(source.path), source]))
  const compilerOptions: ts.CompilerOptions = { noResolve: true, noLib: true }
  const host = ts.createCompilerHost(compilerOptions)
  host.getSourceFile = (fileName) => sourcesByPath.get(resolve(fileName))?.sourceFile
  host.fileExists = (fileName) => sourcesByPath.has(resolve(fileName))
  host.readFile = (fileName) => sourcesByPath.get(resolve(fileName))?.text
  const checker = ts
    .createProgram({
      rootNames: [...sourcesByPath.keys()],
      options: compilerOptions,
      host,
    })
    .getTypeChecker()
  const applicationLifecycleCalls = allSources.flatMap((source) => {
    const queryConstructors = new Set<ts.Symbol>()
    for (const declaration of source.sourceFile.statements) {
      if (
        !ts.isImportDeclaration(declaration) ||
        !ts.isStringLiteral(declaration.moduleSpecifier) ||
        declaration.moduleSpecifier.text !== '@tanstack/vue-query' ||
        declaration.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword
      )
        continue
      const bindings = declaration.importClause?.namedBindings
      if (bindings === undefined || !ts.isNamedImports(bindings)) continue
      for (const specifier of bindings.elements) {
        if (
          specifier.isTypeOnly ||
          (specifier.propertyName?.text ?? specifier.name.text) !== 'QueryClient'
        )
          continue
        const symbol = checker.getSymbolAtLocation(specifier.name)
        if (symbol !== undefined) queryConstructors.add(symbol)
      }
    }
    const queryClients = new Map<ts.Symbol, ts.Node>()
    for (const declaration of nodesOf(source.sourceFile, ts.isVariableDeclaration)) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !ts.isVariableDeclarationList(declaration.parent) ||
        (declaration.parent.flags & ts.NodeFlags.Const) === 0 ||
        declaration.initializer === undefined
      )
        continue
      const statement = declaration.parent.parent
      const container = ts.isVariableStatement(statement) ? statement.parent : statement
      const initializer = declaration.initializer
      if (ts.isNewExpression(initializer) && ts.isIdentifier(initializer.expression)) {
        const constructor = checker.getSymbolAtLocation(initializer.expression)
        if (constructor === undefined || !queryConstructors.has(constructor)) continue
      } else if (ts.isIdentifier(initializer)) {
        const target = checker.getSymbolAtLocation(initializer)
        if (target === undefined || queryClients.get(target) !== container) continue
      } else continue
      const symbol = checker.getSymbolAtLocation(declaration.name)
      if (symbol !== undefined) queryClients.set(symbol, container)
    }
    return nodesOf(source.sourceFile, ts.isCallExpression)
      .filter((call) => {
        if (!['mount', 'unmount'].includes(callMemberName(call) ?? '')) return false
        const receiver = ts.isPropertyAccessExpression(call.expression)
          ? call.expression.expression
          : undefined
        const symbol =
          receiver !== undefined && ts.isIdentifier(receiver)
            ? checker.getSymbolAtLocation(receiver)
            : undefined
        return symbol === undefined || !queryClients.has(symbol)
      })
      .map((call) => ({ call, source }))
  })
  const mountCalls = applicationLifecycleCalls.filter(
    ({ call }) => callMemberName(call) === 'mount',
  )
  const unmountCalls = applicationLifecycleCalls.filter(
    ({ call }) => callMemberName(call) === 'unmount',
  )
  if (
    mountCalls.length !== 1 ||
    resolve(mountCalls[0]?.source.path ?? '') !== resolve(createApplication.path)
  ) {
    violations.push(
      'Runtime Kernel Mount ownership must be unique and remain in create-application.',
    )
  }
  if (unmountCalls.length !== 1) {
    violations.push('Vue Mount must have one exact unmount responsibility.')
  }
  if (!createApplication.text.includes("target: '#app'")) {
    violations.push('Vue Mount target type must remain exact #app.')
  }

  const errorHandlerAssignments = nodesOf(
    createApplication.sourceFile,
    ts.isBinaryExpression,
  ).filter((binary) =>
    canonicalText(binary.left, createApplication).endsWith('.config.errorHandler'),
  )
  if (errorHandlerAssignments.length !== 1) {
    violations.push('Vue application must install exactly one application error handler.')
  } else {
    const errorHandlerAssignment = errorHandlerAssignments[0]
    if (errorHandlerAssignment === undefined) {
      return violations
    }
    const handlerText = canonicalText(errorHandlerAssignment.right, createApplication)
    const claim = handlerText.indexOf('claimMountFailure(')
    const component = handlerText.indexOf('captureComponentFailure(')
    const mounting = handlerText.indexOf('isMounting()')
    const mountingBranch = nodesOf(errorHandlerAssignment.right, ts.isIfStatement).find(
      (statement) =>
        canonicalText(statement.expression, createApplication).includes('isMounting()'),
    )
    const mountingBranchReturns =
      mountingBranch !== undefined &&
      nodesOf(mountingBranch.thenStatement, ts.isReturnStatement).length === 1
    if (
      mounting < 0 ||
      claim < mounting ||
      component < claim ||
      !handlerText.includes('claimMountFailure({') ||
      !mountingBranchReturns
    ) {
      violations.push(
        'Initial Mount failure precedence must claim startup once before component capture.',
      )
    }
  }
  return violations
}

function vueMountQueryLifecycleProbes(createApplication: ParsedSource): string[] {
  const prefix =
    "import { QueryClient } from '@tanstack/vue-query'; import type { App } from 'vue'; const queryClient = new QueryClient(); queryClient.mount(); queryClient.unmount();"
  const cases = [
    ['direct QueryClient lifecycle', prefix, false],
    [
      'renamed QueryClient import and handle',
      "import { QueryClient as CacheClient } from '@tanstack/vue-query'; const cache = new CacheClient(); cache.mount(); cache.unmount();",
      false,
    ],
    [
      'ordinary additional Vue lifecycle',
      `${prefix} function wrong(app: App) { app.mount('#unexpected'); app.unmount() }`,
      true,
    ],
    [
      'same-scope immutable lifecycle alias',
      `${prefix} const lifecycleClient = queryClient; lifecycleClient.mount(); function release() { lifecycleClient.unmount() }`,
      false,
    ],
    [
      'same-scope immutable alias chain',
      `${prefix} const lifecycleClient = queryClient, releaseClient = lifecycleClient; lifecycleClient.mount(); releaseClient.unmount();`,
      false,
    ],
    [
      'alias receiver parameter shadow',
      `${prefix} const lifecycleClient = queryClient; function wrong(lifecycleClient: App) { lifecycleClient.mount('#unexpected'); lifecycleClient.unmount() }`,
      true,
    ],
    [
      'alias target parameter shadow',
      `${prefix} function wrong(queryClient: App) { const lifecycleClient = queryClient; lifecycleClient.mount('#unexpected'); lifecycleClient.unmount() }`,
      true,
    ],
    [
      'mutable alias reassigned to Vue',
      `${prefix} function wrong(app: App) { let lifecycleClient: QueryClient | App = queryClient; lifecycleClient = app; lifecycleClient.mount('#unexpected'); lifecycleClient.unmount() }`,
      true,
    ],
    [
      'receiver parameter shadow',
      `${prefix} function wrong(queryClient: App) { queryClient.mount('#unexpected'); queryClient.unmount() }`,
      true,
    ],
    [
      'receiver block shadow',
      `${prefix} function wrong(app: App) { { const queryClient = app; queryClient.mount('#unexpected'); queryClient.unmount() } }`,
      true,
    ],
    [
      'constructor parameter shadow',
      `${prefix} function wrong(QueryClient: new () => App) { const client = new QueryClient(); client.mount('#unexpected'); client.unmount() }`,
      true,
    ],
  ] as const
  return cases.flatMap(([label, text, rejected]) => {
    const fixture = parseSource(
      resolve(webSourceDirectory, 'app/bootstrap/in-memory-mount-contract.ts'),
      text,
    )
    const violations = validateVueMount(createApplication, [createApplication, fixture])
    return violations.length === (rejected ? 2 : 0)
      ? []
      : [`Vue mount Query lifecycle probe failed: ${label}.`]
  })
}

function validateProviders(installProviders: ParsedSource, pinia: ParsedSource): string[] {
  const violations: string[] = []
  if (
    !equalArray(stringArray(variableInitializer(installProviders, 'activeProviderIds')), [
      'pinia',
      'appearance',
    ])
  ) {
    violations.push('Active Provider set must be exactly Pinia and Appearance.')
  }
  const providerCalls = nodesOf(installProviders.sourceFile, ts.isCallExpression).map(
    callMemberName,
  )
  if (
    providerCalls.filter((name) => name === 'use').length !== 1 ||
    providerCalls.filter((name) => name === 'installAppearanceProvider').length !== 1
  ) {
    violations.push('Provider installation must install Pinia and Appearance exactly once.')
  }
  const apiBoundaryImport = namedImportLocalName(
    installProviders.sourceFile,
    '../api/api-read-boundary',
    'provideApiReadBoundary',
  )
  const apiBoundaryCalls = nodesOf(installProviders.sourceFile, ts.isCallExpression).filter(
    (call) =>
      apiBoundaryImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === apiBoundaryImport,
  )
  if (
    apiBoundaryCalls.length !== 1 ||
    memberPath(apiBoundaryCalls[0]?.arguments[1]).at(-1) !== 'api'
  )
    violations.push(
      'The immutable API read boundary must be installed once with the caller-provided API configuration.',
    )

  const piniaCalls = nodesOf(pinia.sourceFile, ts.isCallExpression).map(callMemberName)
  for (const name of ['createPinia', 'disposePinia', 'getActivePinia', 'setActivePinia']) {
    if (piniaCalls.filter((candidate) => candidate === name).length !== 1) {
      violations.push(`Pinia lifecycle must call ${name} exactly once.`)
    }
  }
  return violations
}

function validateRetry(
  policy: ParsedSource,
  kernel: ParsedSource,
  fatalBoundary: ParsedSource,
): string[] {
  const violations: string[] = []
  const object = objectLiteral(variableInitializer(policy, 'startupConfigurationRecoveryPolicy'))
  if (object === undefined) {
    return ['Startup Configuration recovery policy is missing.']
  }
  const expected: Readonly<Record<string, JsonPrimitive>> = {
    id: 'startup-configuration-recovery',
    owner: 'runtime-kernel',
    trigger: 'user-action-only',
    maximumRetriesPerDocument: 1,
    totalAttempts: 2,
    eligibleError: 'runtime-configuration-failure',
    retryStateStorage: 'document-memory-only',
    automaticRetry: false,
    automaticReload: false,
    timer: false,
    backoff: false,
    polling: false,
    storageClearing: false,
  }
  for (const [field, value] of Object.entries(expected)) {
    if (literalValue(propertyExpression(object, field)) !== value) {
      violations.push(`Configuration recovery policy field ${field} drifted.`)
    }
  }
  const eligibleCauses = propertyExpression(object, 'eligibleCauses')
  if (
    eligibleCauses === undefined ||
    !ts.isIdentifier(eligibleCauses) ||
    eligibleCauses.text !== 'runtimeConfigurationFailureCauses'
  ) {
    violations.push('Configuration retry must consume all and only the eleven cause authority.')
  }
  const counterGetter = nodesOf(kernel.sourceFile, ts.isGetAccessorDeclaration).find(
    (getter) => propertyName(getter.name) === 'configurationRetriesUsed',
  )
  const counterReturn = counterGetter?.body?.statements.find(ts.isReturnStatement)?.expression
  const counter =
    counterReturn !== undefined && ts.isIdentifier(counterReturn) ? counterReturn.text : undefined
  const maximum = nodesOf(kernel.sourceFile, ts.isVariableDeclaration).find((declaration) =>
    equalArray(memberPath(declaration.initializer), [
      'startupConfigurationRecoveryPolicy',
      'maximumRetriesPerDocument',
    ]),
  )?.name
  const maximumName = maximum !== undefined && ts.isIdentifier(maximum) ? maximum.text : undefined
  const configurationBranch = nodesOf(kernel.sourceFile, ts.isIfStatement).find((statement) => {
    const condition = unwrapExpression(statement.expression)
    if (
      !ts.isBinaryExpression(condition) ||
      condition.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
    )
      return false
    const status =
      literalValue(condition.right) === 'configuration-failure'
        ? condition.left
        : literalValue(condition.left) === 'configuration-failure'
          ? condition.right
          : undefined
    const path = memberPath(status)
    return path.length === 2 && path[1] === 'status'
  })
  const configurationCondition =
    configurationBranch === undefined ? undefined : unwrapExpression(configurationBranch.expression)
  const outcomeName =
    configurationCondition !== undefined && ts.isBinaryExpression(configurationCondition)
      ? memberPath(
          literalValue(configurationCondition.right) === 'configuration-failure'
            ? configurationCondition.left
            : configurationCondition.right,
        )[0]
      : undefined
  const action = (
    configurationBranch === undefined
      ? []
      : nodesOf(configurationBranch.thenStatement, ts.isPropertyAssignment)
  ).find(
    (property) =>
      propertyName(property.name) === 'action' &&
      ts.isConditionalExpression(unwrapExpression(property.initializer)),
  )
  const conditional = action === undefined ? undefined : unwrapExpression(action.initializer)
  const availability =
    conditional !== undefined && ts.isConditionalExpression(conditional)
      ? unwrapExpression(conditional.condition)
      : undefined
  const guard =
    availability !== undefined && ts.isIdentifier(availability)
      ? variableInitializer(kernel, availability.text)
      : availability
  const terms = (expression: ts.Expression | undefined): readonly ts.Expression[] => {
    if (expression === undefined) return []
    const value = unwrapExpression(expression)
    return ts.isBinaryExpression(value) &&
      value.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ? [...terms(value.left), ...terms(value.right)]
      : [value]
  }
  const guardTerms = terms(guard)
  const underBudget = guardTerms.some((term) => {
    let value = term
    const negated =
      ts.isPrefixUnaryExpression(value) && value.operator === ts.SyntaxKind.ExclamationToken
    if (negated && ts.isPrefixUnaryExpression(value)) value = unwrapExpression(value.operand)
    if (!ts.isBinaryExpression(value)) return false
    const left = unwrapExpression(value.left)
    const right = unwrapExpression(value.right)
    if (!ts.isIdentifier(left) || !ts.isIdentifier(right)) return false
    return (
      (left.text === counter &&
        right.text === maximumName &&
        value.operatorToken.kind ===
          (negated ? ts.SyntaxKind.GreaterThanEqualsToken : ts.SyntaxKind.LessThanToken)) ||
      (left.text === maximumName &&
        right.text === counter &&
        value.operatorToken.kind ===
          (negated ? ts.SyntaxKind.LessThanEqualsToken : ts.SyntaxKind.GreaterThanToken))
    )
  })
  if (!underBudget) {
    violations.push('Runtime Kernel must guard retry with the per-document maximum.')
  }
  const counterWrites = nodesOf(
    kernel.sourceFile,
    (node): node is ts.BinaryExpression | ts.PrefixUnaryExpression | ts.PostfixUnaryExpression =>
      (ts.isBinaryExpression(node) &&
        ts.isIdentifier(node.left) &&
        node.left.text === counter &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
      ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        ts.isIdentifier(node.operand) &&
        node.operand.text === counter &&
        (node.operator === ts.SyntaxKind.PlusPlusToken ||
          node.operator === ts.SyntaxKind.MinusMinusToken)),
  )
  const write = counterWrites[0]
  const isCounter = (expression: ts.Expression): boolean => {
    const value = unwrapExpression(expression)
    return ts.isIdentifier(value) && value.text === counter
  }
  const assignedSum =
    write !== undefined &&
    ts.isBinaryExpression(write) &&
    write.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ? unwrapExpression(write.right)
      : undefined
  const assignsOneMore =
    assignedSum !== undefined &&
    ts.isBinaryExpression(assignedSum) &&
    assignedSum.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    ((isCounter(assignedSum.left) && literalValue(assignedSum.right) === 1) ||
      (literalValue(assignedSum.left) === 1 && isCounter(assignedSum.right)))
  const incrementsOnce =
    write !== undefined &&
    ((!ts.isBinaryExpression(write) && write.operator === ts.SyntaxKind.PlusPlusToken) ||
      (ts.isBinaryExpression(write) &&
        write.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&
        literalValue(write.right) === 1) ||
      assignsOneMore)
  const retryObject =
    conditional !== undefined && ts.isConditionalExpression(conditional)
      ? objectLiteral(conditional.whenTrue)
      : undefined
  const run = retryObject?.properties.find((property) => propertyName(property.name) === 'run')
  const runExpression =
    run !== undefined && ts.isPropertyAssignment(run)
      ? unwrapExpression(run.initializer)
      : undefined
  const runBody =
    run !== undefined && ts.isMethodDeclaration(run)
      ? run.body
      : runExpression !== undefined &&
          (ts.isArrowFunction(runExpression) || ts.isFunctionExpression(runExpression))
        ? runExpression.body
        : undefined
  if (
    counterWrites.length !== 1 ||
    !incrementsOnce ||
    retryObject === undefined ||
    literalValue(propertyExpression(retryObject, 'kind')) !== 'retry' ||
    runBody === undefined ||
    write.parent.parent !== runBody
  ) {
    violations.push('Runtime Kernel must consume retry budget exactly once per user retry.')
  }
  if (configurationBranch === undefined) {
    violations.push('Only Runtime Configuration failure may enter the in-document retry branch.')
  }
  const completeCleanup = guardTerms.some((term) => {
    const isFailedLength = (expression: ts.Expression): boolean =>
      equalArray(memberPath(unwrapExpression(expression)), [
        outcomeName ?? '',
        'disposalResult',
        'failedSteps',
        'length',
      ])
    if (ts.isPrefixUnaryExpression(term) && term.operator === ts.SyntaxKind.ExclamationToken)
      return isFailedLength(term.operand)
    if (!ts.isBinaryExpression(term)) return false
    return (
      (isFailedLength(term.left) &&
        literalValue(term.right) === 0 &&
        [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.LessThanEqualsToken].includes(
          term.operatorToken.kind,
        )) ||
      (literalValue(term.left) === 0 &&
        isFailedLength(term.right) &&
        [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken].includes(
          term.operatorToken.kind,
        ))
    )
  })
  if (!completeCleanup) {
    violations.push('Retry must require complete failed-attempt disposal.')
  }
  const clickAdds = directStringArguments(fatalBoundary, 'addEventListener').filter(
    (event) => event === 'click',
  )
  const clickRemoves = directStringArguments(fatalBoundary, 'removeEventListener').filter(
    (event) => event === 'click',
  )
  if (clickAdds.length !== 1 || clickRemoves.length !== 1) {
    violations.push('Configuration retry/reload must be owned by one idempotent user click action.')
  }
  return violations
}

function validateAppearance(source: ParsedSource): string[] {
  const violations: string[] = []
  const queries = directStringArguments(source, 'matchMedia')
  if (
    !equalArray(queries, [
      '(prefers-color-scheme: dark)',
      '(forced-colors: active)',
      '(prefers-reduced-transparency: reduce)',
      '(prefers-reduced-motion: reduce)',
    ])
  ) {
    violations.push(
      'Appearance media authority must contain its three appearance queries and the admitted reduced-motion query.',
    )
  }
  const addChange = directStringArguments(source, 'addEventListener').filter(
    (event) => event === 'change',
  )
  const removeChange = directStringArguments(source, 'removeEventListener').filter(
    (event) => event === 'change',
  )
  if (addChange.length !== 1 || removeChange.length !== 1) {
    violations.push(
      'Appearance media subscription loop must own one paired change add/remove operation.',
    )
  }
  if (!source.text.includes("CSS.supports('backdrop-filter', 'blur(0)')")) {
    violations.push(
      'Appearance runtime capability probe must match the generated First Paint probe.',
    )
  }
  return violations
}

function validateHmr(main: ParsedSource, allSources: readonly ParsedSource[]): string[] {
  const violations: string[] = []
  const hotSources = allSources.filter((source) => source.text.includes('import.meta.hot'))
  if (hotSources.length !== 1 || resolve(hotSources[0]?.path ?? '') !== resolve(main.path)) {
    violations.push('Runtime Kernel Running Application handle must be the sole HMR owner.')
  }
  const calls = nodesOf(main.sourceFile, ts.isCallExpression)
  if (
    calls.filter((call) => callMemberName(call) === 'accept').length !== 1 ||
    calls.filter((call) => callMemberName(call) === 'dispose').length !== 3
  ) {
    violations.push('Runtime Kernel HMR accept/disposal ownership drifted.')
  }
  const starts = calls.filter((call) => callMemberName(call) === 'startRuntimeKernel')
  const awaitedDisposals = nodesOf(main.sourceFile, ts.isAwaitExpression).filter(
    (node) => ts.isCallExpression(node.expression) && callMemberName(node.expression) === 'dispose',
  )
  if (
    starts.length !== 1 ||
    awaitedDisposals.length !== 2 ||
    (awaitedDisposals[0]?.getStart(main.sourceFile) ?? 0) >
      (starts[0]?.getStart(main.sourceFile) ?? 0)
  ) {
    violations.push('HMR must await complete old disposal before one fresh Kernel start.')
  }
  for (const source of allSources) {
    for (const binary of nodesOf(source.sourceFile, ts.isBinaryExpression)) {
      const left = canonicalText(binary.left, source)
      const operator = binary.operatorToken.kind
      if (
        operator >= ts.SyntaxKind.FirstAssignment &&
        operator <= ts.SyntaxKind.LastAssignment &&
        (left.startsWith('window.') || left.startsWith('globalThis.') || left.startsWith('self.'))
      ) {
        violations.push(
          `${relative(rootDirectory, source.path)} must not publish a Runtime Kernel global.`,
        )
      }
    }
  }
  return violations
}

function validateScrollDocumentLifecycle(
  main: ParsedSource,
  kernel: ParsedSource,
  system: ParsedSource,
): string[] {
  const violations: string[] = []
  const calls = nodesOf(main.sourceFile, ts.isCallExpression)
  const events = ['vite:beforeUpdate', 'vite:beforeFullReload', 'vite:afterUpdate']
  const listeners = (member: string, event: string) =>
    calls.filter(
      (call) => callMemberName(call) === member && literalValue(call.arguments[0]) === event,
    )
  const callback = (event: string) => {
    const name = listeners('on', event)[0]?.arguments[1]?.getText(main.sourceFile)
    return nodesOf(main.sourceFile, ts.isVariableDeclaration).find(
      (node) => node.name.getText(main.sourceFile) === name,
    )?.initializer
  }
  const start = calls.find((call) => callMemberName(call) === 'startRuntimeKernel')
  const getters = start?.arguments[1]
  const getter = (name: string) =>
    getters !== undefined && ts.isObjectLiteralExpression(getters)
      ? getters.properties.find((property) => property.name?.getText(main.sourceFile) === name)
      : undefined
  const reload = getter('readReloadEligible')
  const workspace = getter('readWorkspaceGeneration')
  const reloadPath =
    reload === undefined
      ? []
      : (nodesOf(reload, ts.isPropertyAccessExpression)
          .map((node) => memberPath(node))
          .sort((a, b) => b.length - a.length)[0] ?? [])
  const generation =
    workspace === undefined ? undefined : nodesOf(workspace, ts.isConditionalExpression)[0]
  const generationPath = memberPath(generation?.whenTrue)
  const readinessPath = memberPath(generation?.condition)
  const update = callback('vite:afterUpdate')
  if (
    events.some((event) => {
      const add = listeners('on', event)
      const remove = listeners('off', event)
      return (
        add.length !== 1 ||
        remove.length !== 1 ||
        add[0]?.arguments[1]?.getText(main.sourceFile) !==
          remove[0]?.arguments[1]?.getText(main.sourceFile) ||
        !calls.some(
          (call) =>
            callMemberName(call) === 'dispose' &&
            remove[0] !== undefined &&
            call.pos < remove[0].pos &&
            call.end > remove[0].end,
        )
      )
    })
  )
    violations.push('SCROLL_HMR_LISTENER_LIFETIME')
  if (
    reloadPath.length === 0 ||
    generationPath.length === 0 ||
    readinessPath.length === 0 ||
    generation?.whenFalse.getText(main.sourceFile) !== 'undefined' ||
    ['vite:beforeUpdate', 'vite:beforeFullReload'].some((event) => {
      const invalidation = callback(event)
      const assignments =
        invalidation === undefined ? [] : nodesOf(invalidation, ts.isPropertyAssignment)
      const assigned = (path: readonly string[]) =>
        assignments.find((node) => node.name.getText(main.sourceFile) === path.at(-1))?.initializer
      return (
        assigned(reloadPath)?.kind !== ts.SyntaxKind.FalseKeyword ||
        assigned(readinessPath)?.kind !== ts.SyntaxKind.FalseKeyword ||
        assigned(generationPath) === undefined ||
        equalArray(memberPath(assigned(generationPath)), generationPath)
      )
    })
  )
    violations.push('SCROLL_HMR_PRE_UPDATE_INVALIDATION')
  const guards = update === undefined ? [] : nodesOf(update, ts.isIfStatement)
  if (
    update === undefined ||
    !nodesOf(update, ts.isCallExpression).some((call) => callMemberName(call) === 'nextTick') ||
    !guards.some(
      (guard) =>
        nodesOf(guard.expression, ts.isBinaryExpression).some(
          (node) =>
            node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
            equalArray(memberPath(node.left), generationPath) &&
            ts.isIdentifier(node.right),
        ) &&
        nodesOf(guard.thenStatement, ts.isPropertyAssignment).some(
          (node) =>
            node.name.getText(main.sourceFile) === readinessPath.at(-1) &&
            node.initializer.kind === ts.SyntaxKind.TrueKeyword,
        ),
    ) ||
    nodesOf(update, ts.isPropertyAssignment).some(
      (node) =>
        node.name.getText(main.sourceFile) === reloadPath.at(-1) &&
        node.initializer.kind !== ts.SyntaxKind.FalseKeyword,
    )
  )
    violations.push('SCROLL_HMR_SETTLED_FRESH_WORKSPACE')
  const kernelStart = nodesOf(kernel.sourceFile, ts.isFunctionDeclaration).find(
    (node) => node.name?.text === 'startRuntimeKernel',
  )
  const lifecycleParameter = kernelStart?.parameters.find(
    (node) => node.type?.getText(kernel.sourceFile) === 'ScrollDocumentLifecycle',
  )
  const initialize = nodesOf(kernel.sourceFile, ts.isCallExpression).find(
    (call) => callMemberName(call) === 'initializeScrollSystem',
  )
  const attempt = nodesOf(kernel.sourceFile, ts.isFunctionDeclaration).find(
    (node) =>
      node !== kernelStart &&
      initialize !== undefined &&
      node.pos < initialize.pos &&
      node.end > initialize.end,
  )
  const forwarding = nodesOf(kernel.sourceFile, ts.isCallExpression).find(
    (call) => callMemberName(call) === attempt?.name?.text,
  )?.arguments[0]
  const forwarded = initialize?.arguments[4]
  const systemInitializer = nodesOf(system.sourceFile, ts.isFunctionDeclaration).find(
    (node) => node.name?.text === 'initializeScrollSystem',
  )
  const systemParameter = systemInitializer?.parameters.find(
    (node) => node.type?.getText(system.sourceFile) === 'ScrollDocumentLifecycle',
  )
  const binding = nodesOf(system.sourceFile, ts.isCallExpression).find(
    (call) => callMemberName(call) === 'connectRefreshScroll',
  )?.arguments[0]
  if (
    lifecycleParameter === undefined ||
    reload === undefined ||
    workspace === undefined ||
    forwarded === undefined ||
    !ts.isPropertyAccessExpression(forwarded) ||
    forwarding === undefined ||
    !ts.isObjectLiteralExpression(forwarding) ||
    !forwarding.properties.some(
      (property) =>
        property.name?.getText(kernel.sourceFile) === forwarded.name.text &&
        (ts.isShorthandPropertyAssignment(property)
          ? property.name.getText(kernel.sourceFile)
          : ts.isPropertyAssignment(property)
            ? property.initializer.getText(kernel.sourceFile)
            : '') === lifecycleParameter.name.getText(kernel.sourceFile),
    ) ||
    systemParameter === undefined ||
    binding === undefined ||
    !ts.isObjectLiteralExpression(binding) ||
    !binding.properties.some(
      (property) =>
        ts.isSpreadAssignment(property) &&
        property.expression.getText(system.sourceFile) ===
          systemParameter.name.getText(system.sourceFile),
    )
  )
    violations.push('SCROLL_DOCUMENT_LIFECYCLE_FORWARDING')
  return violations
}

function scrollDocumentLifecycleNegativeProbes(
  main: ParsedSource,
  kernel: ParsedSource,
  system: ParsedSource,
): string[] {
  const baselineValid = validateScrollDocumentLifecycle(main, kernel, system).length === 0
  const eventRemoval = main.text.replace(/[^\n]*\.off\('vite:afterUpdate', [\w$]+\)\n/u, '')
  const getter = nodesOf(main.sourceFile, ts.isPropertyAssignment).find(
    (node) => node.name.getText(main.sourceFile) === 'readReloadEligible',
  )
  const reloadName =
    getter === undefined ? undefined : nodesOf(getter, ts.isPropertyAccessExpression)[0]?.name.text
  const invalidation = nodesOf(main.sourceFile, ts.isPropertyAssignment).find(
    (node) =>
      node.name.getText(main.sourceFile) === reloadName &&
      node.initializer.kind === ts.SyntaxKind.FalseKeyword,
  )?.initializer
  const generationGuard = nodesOf(main.sourceFile, ts.isIfStatement).find(
    (node) =>
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken,
  )
  const forwarded = nodesOf(kernel.sourceFile, ts.isCallExpression).find(
    (call) => callMemberName(call) === 'initializeScrollSystem',
  )?.arguments[4]
  const replace = (source: ParsedSource, node: ts.Node | undefined, text: string) =>
    node === undefined
      ? source.text
      : source.text.slice(0, node.getStart(source.sourceFile)) + text + source.text.slice(node.end)
  const update = replace(main, invalidation, 'true')
  const readiness = replace(main, generationGuard?.expression, 'true')
  const forwarding = replace(kernel, forwarded, 'undefined')
  const probes = [
    ['SCROLL_HMR_LISTENER_LIFETIME', parseSource(main.path, eventRemoval), kernel],
    ['SCROLL_HMR_PRE_UPDATE_INVALIDATION', parseSource(main.path, update), kernel],
    ['SCROLL_HMR_SETTLED_FRESH_WORKSPACE', parseSource(main.path, readiness), kernel],
    ['SCROLL_DOCUMENT_LIFECYCLE_FORWARDING', main, parseSource(kernel.path, forwarding)],
  ] as const
  return probes.flatMap(([expected, changedMain, changedKernel]) => {
    const actual = validateScrollDocumentLifecycle(changedMain, changedKernel, system)
    return baselineValid &&
      (changedMain.text !== main.text || changedKernel.text !== kernel.text) &&
      equalArray(actual, [expected])
      ? []
      : [`${expected}: Scroll HMR in-memory negative probe failed.`]
  })
}

function validateNoFutureCapabilities(sources: readonly ParsedSource[]): string[] {
  const violations: string[] = []
  const prohibitedPackages = ['axios', 'openapi-fetch', 'vue-i18n']
  for (const source of sources) {
    for (const declaration of nodesOf(source.sourceFile, ts.isImportDeclaration)) {
      const specifier = declaration.moduleSpecifier
      if (
        ts.isStringLiteral(specifier) &&
        !(
          specifier.text === 'vue-i18n' &&
          relative(rootDirectory, source.path) === 'apps/web/src/shared/i18n/runtime.ts'
        ) &&
        prohibitedPackages.some(
          (name) => specifier.text === name || specifier.text.startsWith(`${name}/`),
        )
      ) {
        violations.push(
          `${relative(rootDirectory, source.path)} activates prohibited future capability ${specifier.text}.`,
        )
      }
    }
  }
  return violations
}

function focusedNegativeProbes(input: {
  readonly bootstrapRegistry: ParsedSource
  readonly runtimeKernel: ParsedSource
  readonly errorRegistry: ParsedSource
  readonly installProviders: ParsedSource
  readonly retryPolicy: ParsedSource
}): string[] {
  const failures: string[] = []
  const mutate = (source: ParsedSource, search: string, replacement: string): ParsedSource => {
    if (!source.text.includes(search)) {
      throw new Error(`Runtime Kernel negative probe could not find ${search}.`)
    }
    return parseSource(source.path, source.text.replace(search, replacement))
  }

  const swappedRegistry = mutate(
    input.bootstrapRegistry,
    "id: 'validate-build-and-runtime-configuration'",
    "id: 'install-pre-vue-global-failure-capture'",
  )
  if (
    !validateBootstrapRegistry(swappedRegistry).includes(
      'Runtime Kernel Bootstrap Registry IDs/order drifted from the exact fifteen-step contract.',
    )
  ) {
    failures.push('Negative probe failed: Bootstrap Registry drift was accepted.')
  }

  const swappedDisposal = mutate(
    input.runtimeKernel,
    "'remove-appearance-media-subscriptions'",
    "'dispose-pinia'",
  )
  if (
    !validateBootstrapExecution(swappedDisposal).includes(
      'Runtime Kernel reverse disposal order must match the exact fifteen-step contract.',
    )
  ) {
    failures.push('Negative probe failed: reverse disposal drift was accepted.')
  }

  const fifthError = mutate(
    input.errorRegistry,
    "id: 'runtime-configuration-failure',",
    "id: 'unexpected-runtime-failure',",
  )
  if (
    !validateCoreErrorRegistry(fifthError).includes(
      'Core Error Registry ID/order drifted from the exact four-record authority.',
    )
  ) {
    failures.push('Negative probe failed: Core Error Registry drift was accepted.')
  }

  const futureProvider = mutate(
    input.installProviders,
    "['pinia', 'appearance']",
    "['pinia', 'appearance', 'router']",
  )
  if (
    !validateProviders(futureProvider, parseSource('pinia.ts', 'export {}')).includes(
      'Active Provider set must be exactly Pinia and Appearance.',
    )
  ) {
    failures.push('Negative probe failed: future Provider admission was accepted.')
  }

  const retryTwo = mutate(
    input.retryPolicy,
    'maximumRetriesPerDocument: 1',
    'maximumRetriesPerDocument: 2',
  )
  if (
    !validateRetry(
      retryTwo,
      input.runtimeKernel,
      parseSource('fatal-boundary.ts', 'export {}'),
    ).includes('Configuration recovery policy field maximumRetriesPerDocument drifted.')
  ) {
    failures.push('Negative probe failed: retry budget drift was accepted.')
  }
  const retryContracts = [
    'Runtime Kernel must guard retry with the per-document maximum.',
    'Runtime Kernel must consume retry budget exactly once per user retry.',
    'Retry must require complete failed-attempt disposal.',
  ]
  const retryProbe = parseSource(
    'retry-expression-probe.ts',
    `
const maximum = startupConfigurationRecoveryPolicy.maximumRetriesPerDocument
let used = 0
const handle = { get configurationRetriesUsed() { return used } }
if (failure.status === 'configuration-failure') {
  const available = failure.disposalResult.failedSteps.length === 0 && used < maximum
  renderConfigurationFailure({ action: available
    ? { kind: 'retry', run() { used += 1 } }
    : { kind: 'reload' } })
}`,
  )
  const retryPositiveProbes: readonly (readonly [string, string])[] = [
    ['used += 1', 'used++'],
    ['used += 1', '++used'],
    ['used += 1', 'used = used + 1'],
    ['used < maximum', 'maximum > used'],
    ['used < maximum', '!(used >= maximum)'],
    [
      'failure.disposalResult.failedSteps.length === 0',
      '!failure.disposalResult.failedSteps.length',
    ],
    [
      'failure.disposalResult.failedSteps.length === 0',
      '0 === failure.disposalResult.failedSteps.length',
    ],
    ['run() { used += 1 }', 'run: () => { used += 1 }'],
  ]
  for (const [search, replacement] of retryPositiveProbes) {
    const changed = mutate(retryProbe, search, replacement)
    if (
      validateRetry(input.retryPolicy, changed, parseSource('fatal-boundary.ts', 'export {}')).some(
        (violation) => retryContracts.includes(violation),
      )
    ) {
      failures.push('Retry in-memory positive probe froze an equivalent private expression.')
    }
  }
  const retryNegativeProbes: readonly (readonly [string, string, string])[] = [
    ['used += 1', 'used += 2', retryContracts[1] ?? ''],
    ['used < maximum', 'used <= maximum', retryContracts[0] ?? ''],
    ['failure.disposalResult.failedSteps.length === 0', 'true', retryContracts[2] ?? ''],
  ]
  for (const [search, replacement, expected] of retryNegativeProbes) {
    const changed = mutate(retryProbe, search, replacement)
    if (
      !validateRetry(
        input.retryPolicy,
        changed,
        parseSource('fatal-boundary.ts', 'export {}'),
      ).includes(expected)
    ) {
      failures.push('Retry in-memory negative probe lost budget or cleanup protection.')
    }
  }
  return failures
}

function pageBoundaryCaptureProbes(
  coreError: ParsedSource,
  rootBoundary: ParsedSource,
  retention: ParsedSource,
): string[] {
  const replace = (source: ParsedSource, node: ts.Node, replacement: string): ParsedSource =>
    parseSource(
      source.path,
      source.text.slice(0, node.getStart(source.sourceFile)) +
        replacement +
        source.text.slice(node.end),
    )
  const failures: string[] = []
  const hookName = namedImportLocalName(retention.sourceFile, 'vue', 'onErrorCaptured')
  const registration = nodesOf(retention.sourceFile, ts.isCallExpression).find(
    (call) => callMemberName(call) === hookName,
  )
  const callback = registration?.arguments[0]
  if (callback === undefined || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body)) {
    return ['Page capture in-memory probes could not locate the existing Vue capture boundary.']
  }
  const startup = nodesOf(callback.body, ts.isIfStatement).find((statement) =>
    nodesOf(statement.expression, ts.isCallExpression).some(
      (call) => callMemberName(call) === 'getStartupState',
    ),
  )
  const capture = nodesOf(callback.body, ts.isCallExpression).find(
    (call) => callMemberName(call) === 'capture',
  )
  const normalizeName = namedImportLocalName(
    retention.sourceFile,
    '../errors/error-normalizer',
    'normalizeVueComponentFailure',
  )
  const normalize = nodesOf(callback.body, ts.isCallExpression).find(
    (call) => callMemberName(call) === normalizeName,
  )
  if (startup === undefined || capture === undefined || normalize === undefined) {
    return ['Page capture in-memory probes require the real startup, normalizer and ledger path.']
  }
  const probes: readonly (readonly [string, ParsedSource])[] = [
    [
      'Component capture must synchronously stop handled-error propagation.',
      replace(retention, callback, `async ${callback.getText(retention.sourceFile)}`),
    ],
    [
      'Component capture must propagate startup failures before normalization.',
      replace(retention, startup.thenStatement, '{ return false }'),
    ],
    [
      'Handled component failures must normalize and capture once before returning false.',
      replace(retention, normalize, 'undefined'),
    ],
    [
      'Duplicate component capture must not decide whether propagation is stopped.',
      replace(
        retention,
        capture.parent,
        `if (!${capture.getText(retention.sourceFile)}) return undefined`,
      ),
    ],
    [
      'Component normalization and capture machinery failures must propagate.',
      replace(
        retention,
        capture.parent,
        `try { ${capture.getText(retention.sourceFile)} } catch { return false }`,
      ),
    ],
  ]
  for (const [expected, changed] of probes) {
    if (!validateVueBoundaryCapture(changed).includes(expected))
      failures.push(`Page capture in-memory negative probe failed: ${expected}`)
  }
  for (const { name, calls } of pageBoundaryConnections(retention)) {
    const call = calls[0]
    if (
      call === undefined ||
      !validatePageBoundaryConnections(replace(retention, call, 'undefined')).includes(
        `${name} must install the existing local Vue capture responsibility.`,
      )
    )
      failures.push(`Page capture in-memory negative probe failed: ${name} disconnected.`)
  }
  const provideName = namedImportLocalName(rootBoundary.sourceFile, 'vue', 'provide')
  const provide = nodesOf(rootBoundary.sourceFile, ts.isCallExpression).find(
    (call) => callMemberName(call) === provideName,
  )
  if (
    provide === undefined ||
    !validatePageBoundaryInjection(
      coreError,
      replace(rootBoundary, provide, 'undefined'),
      retention,
    ).includes('AppErrorBoundary must provide its existing errorHooks through the typed key.')
  )
    failures.push('Page capture in-memory negative probe failed: missing root errorHooks provider.')

  for (const name of ['InstanceBoundary', 'OrdinaryBoundary']) {
    const boundary = variableInitializer(retention, name)
    const ack =
      boundary === undefined
        ? undefined
        : nodesOf(boundary, ts.isCallExpression).find(
            (call) =>
              callMemberName(call) === 'rendered' &&
              literalValue(call.arguments[1]) === 'component-fallback',
          )
    let mounted: ts.Node | undefined = ack
    while (mounted !== undefined && !ts.isArrowFunction(mounted) && !ts.isSourceFile(mounted))
      mounted = mounted.parent
    if (mounted === undefined || !ts.isArrowFunction(mounted)) {
      failures.push(`Page fallback in-memory probes could not locate ${name}'s native ACK.`)
      continue
    }
    if (
      !validatePageFallbackAcknowledgment(replace(retention, mounted, 'undefined')).includes(
        `${name} must acknowledge fallback only from its actual native mount.`,
      )
    )
      failures.push(`Page fallback in-memory negative probe failed: ${name}'s native ACK removed.`)
    if (name === 'InstanceBoundary' && ts.isCallExpression(mounted.parent)) {
      const fallback = mounted.parent
      const h = namedImportLocalName(retention.sourceFile, 'vue', 'h')
      const keepAlive = namedImportLocalName(retention.sourceFile, 'vue', 'KeepAlive')
      if (h === undefined || keepAlive === undefined) {
        failures.push('Page fallback in-memory probe requires the existing Vue render imports.')
        continue
      }
      const changed = replace(
        retention,
        fallback,
        `${h}( ${keepAlive}, null, { default: () => ${fallback.getText(retention.sourceFile)} } )`,
      )
      if (
        !validatePageFallbackAcknowledgment(changed).includes(
          'Failed Workspace content must replace its entire internal KeepAlive subtree.',
        )
      )
        failures.push(
          'Page fallback in-memory negative probe failed: failed content remains cached.',
        )
    }
    if (name === 'OrdinaryBoundary' && boundary !== undefined) {
      const guard = nodesOf(boundary, ts.isIfStatement).find(
        (statement) =>
          nodesOf(statement.expression, ts.isStringLiteral).some(
            (literal) => literal.text === 'component-fallback',
          ) &&
          nodesOf(statement.thenStatement, ts.isCallExpression).some(
            (call) => callMemberName(call) === 'rendered',
          ),
      )
      if (
        guard === undefined ||
        !validatePageFallbackAcknowledgment(replace(retention, guard.expression, 'true')).includes(
          'Ordinary fallback updates must require an actual native-mount acknowledgment.',
        )
      )
        failures.push(
          'Page fallback in-memory negative probe failed: queued ordinary mounted ACK accepted.',
        )
    }
  }

  // A private helper rename preserves the same capture contract.
  let owner: ts.Node = callback
  while (!ts.isFunctionDeclaration(owner) && !ts.isSourceFile(owner)) owner = owner.parent
  if (ts.isFunctionDeclaration(owner) && owner.name !== undefined) {
    const renamed = parseSource(
      retention.path,
      retention.text.replaceAll(new RegExp(`\\b${owner.name.text}\\b`, 'gu'), 'renamedPageCapture'),
    )
    if (validateVueBoundaryCapture(renamed).length !== 0)
      failures.push('Page capture in-memory positive probe froze a private helper name.')
  }
  return failures
}

export async function validateRuntimeKernelArchitecture(): Promise<readonly string[]> {
  const paths = {
    bootstrapRegistry: resolve(webSourceDirectory, 'app/bootstrap/bootstrap-registry.ts'),
    runtimeKernel: resolve(webSourceDirectory, 'app/bootstrap/runtime-kernel.ts'),
    installProviders: resolve(webSourceDirectory, 'app/bootstrap/install-providers.ts'),
    createApplication: resolve(webSourceDirectory, 'app/bootstrap/create-application.ts'),
    retryPolicy: resolve(webSourceDirectory, 'app/bootstrap/startup-configuration-recovery.ts'),
    configurationContract: resolve(
      webSourceDirectory,
      'app/config/runtime-configuration-contract.ts',
    ),
    configurationLoader: resolve(webSourceDirectory, 'app/config/runtime-configuration.ts'),
    errorRegistry: resolve(webSourceDirectory, 'app/errors/core-error-registry.ts'),
    errorMessages: resolve(webSourceDirectory, 'app/errors/core-error-messages.ts'),
    coreError: resolve(webSourceDirectory, 'app/errors/core-error.ts'),
    rootBoundary: resolve(webSourceDirectory, 'app/errors/AppErrorBoundary.vue'),
    retention: resolve(webSourceDirectory, 'app/workspace/workspace-retention.ts'),
    errorNormalizer: resolve(webSourceDirectory, 'app/errors/error-normalizer.ts'),
    globalCapture: resolve(webSourceDirectory, 'app/errors/global-failure-capture.ts'),
    fatalBoundary: resolve(webSourceDirectory, 'app/errors/fatal-boundary.ts'),
    pinia: resolve(webSourceDirectory, 'app/providers/pinia.ts'),
    appearance: resolve(webSourceDirectory, 'app/appearance/appearance-bootstrap.ts'),
    main: resolve(webSourceDirectory, 'main.ts'),
  } as const

  const [
    bootstrapRegistry,
    runtimeKernel,
    installProviders,
    createApplication,
    retryPolicy,
    configurationContract,
    configurationLoader,
    errorRegistry,
    errorMessages,
    coreError,
    rootBoundary,
    retention,
    errorNormalizer,
    globalCapture,
    fatalBoundary,
    pinia,
    appearance,
    main,
    applicationSources,
  ] = await Promise.all([
    readSource(paths.bootstrapRegistry),
    readSource(paths.runtimeKernel),
    readSource(paths.installProviders),
    readSource(paths.createApplication),
    readSource(paths.retryPolicy),
    readSource(paths.configurationContract),
    readSource(paths.configurationLoader),
    readSource(paths.errorRegistry),
    readSource(paths.errorMessages),
    readSource(paths.coreError),
    readSource(paths.rootBoundary),
    readSource(paths.retention),
    readSource(paths.errorNormalizer),
    readSource(paths.globalCapture),
    readSource(paths.fatalBoundary),
    readSource(paths.pinia),
    readSource(paths.appearance),
    readSource(paths.main),
    collectTypeScriptSources(webSourceDirectory),
  ])

  const providerFiles = (await readdir(resolve(webSourceDirectory, 'app/providers'))).sort()
  const scrollSystem = await readSource(resolve(webSourceDirectory, 'app/scroll/scroll-system.ts'))
  const providerFileViolations = equalArray(providerFiles, ['pinia.ts'])
    ? []
    : [
        'Provider source set must contain exactly the active Pinia owner; future Provider files are prohibited.',
      ]

  const violations = [
    ...validateBootstrapRegistry(bootstrapRegistry),
    ...validateBootstrapExecution(runtimeKernel),
    ...validateConfigurationContract(configurationContract),
    ...validateConfigurationLoader(configurationLoader),
    ...validateCoreErrorRegistry(errorRegistry),
    ...validateCoreErrorMessages(errorMessages),
    ...validateNormalizersAndLedger(errorNormalizer, coreError),
    ...validateLocalDiagnostics(runtimeKernel),
    ...localDiagnosticsProbes(),
    ...validatePageBoundaryInjection(coreError, rootBoundary, retention),
    ...validateVueBoundaryCapture(rootBoundary),
    ...validateVueBoundaryCapture(retention),
    ...validatePageBoundaryConnections(retention),
    ...validatePageFallbackAcknowledgment(retention),
    ...pageBoundaryCaptureProbes(coreError, rootBoundary, retention),
    ...validateGlobalCapture(globalCapture, applicationSources),
    ...validateVueMount(createApplication, applicationSources),
    ...vueMountQueryLifecycleProbes(createApplication),
    ...validateProviders(installProviders, pinia),
    ...validateRetry(retryPolicy, runtimeKernel, fatalBoundary),
    ...validateAppearance(appearance),
    ...validateHmr(main, applicationSources),
    ...validateScrollDocumentLifecycle(main, runtimeKernel, scrollSystem),
    ...scrollDocumentLifecycleNegativeProbes(main, runtimeKernel, scrollSystem),
    ...validateNoFutureCapabilities(applicationSources),
    ...providerFileViolations,
    ...focusedNegativeProbes({
      bootstrapRegistry,
      runtimeKernel,
      errorRegistry,
      installProviders,
      retryPolicy,
    }),
  ]

  return [...new Set(violations)]
}
