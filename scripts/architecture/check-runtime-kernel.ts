import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'

import ts from 'typescript'

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
  ['install-platform-providers'],
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
    presentationOwner: 'AppErrorBoundary',
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
  return {
    path,
    text,
    sourceFile: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
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
    return ['Runtime Kernel Bootstrap Registry must contain exactly nine records.']
  }

  const actualIds = records.map((record) => literalValue(propertyExpression(record, 'id')))
  if (!equalArray(actualIds as string[], bootstrapStepIds)) {
    violations.push(
      'Runtime Kernel Bootstrap Registry IDs/order drifted from the exact nine-step contract.',
    )
  }

  records.forEach((record, index) => {
    const dependencies = stringArray(propertyExpression(record, 'dependencies'))
    if (!equalArray(dependencies, bootstrapDependencies[index] ?? [])) {
      violations.push(`Bootstrap step ${String(index + 1)} dependency graph drifted.`)
    }
    const mountOwner = literalValue(propertyExpression(record, 'domMountOwner'))
    if (mountOwner !== (index === 6)) {
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
      'Runtime Kernel reverse disposal order must match the exact nine-step contract.',
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
      'staging',
      'production',
    ])
  ) {
    violations.push(
      'Compiled Environment authority must contain exactly development/staging/production.',
    )
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
  const schema = unwrapExpression(schemaInitializer)
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
    ])
  ) {
    violations.push('Core Runtime Configuration schema must contain exactly five fields.')
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
    schemaVersion: 'z.literal(1)',
    environment: 'z.enum(compiledEnvironmentValues)',
    deploymentBase: "z.literal('/')",
    releaseSha: 'z.string().regex(/^[0-9a-f]{40}$/u)',
    buildVersion:
      'z.string().regex(/^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)$/u)',
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
  return violations
}

function validateVueMount(
  createApplication: ParsedSource,
  allSources: readonly ParsedSource[],
): string[] {
  const violations: string[] = []
  const mountCalls = allSources.flatMap((source) =>
    nodesOf(source.sourceFile, ts.isCallExpression)
      .filter((call) => callMemberName(call) === 'mount')
      .map((call) => ({ call, source })),
  )
  const unmountCalls = allSources.flatMap((source) =>
    nodesOf(source.sourceFile, ts.isCallExpression).filter(
      (call) => callMemberName(call) === 'unmount',
    ),
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
  const kernelText = canonicalText(kernel.sourceFile, kernel)
  if (!kernelText.includes('configurationRetriesUsed<maximumRetriesPerDocument')) {
    violations.push('Runtime Kernel must guard retry with the per-document maximum.')
  }
  if ((kernelText.match(/configurationRetriesUsed\+=1/gu) ?? []).length !== 1) {
    violations.push('Runtime Kernel must consume retry budget exactly once per user retry.')
  }
  if (!kernelText.includes("outcome.status==='configuration-failure'")) {
    violations.push('Only Runtime Configuration failure may enter the in-document retry branch.')
  }
  if (!kernelText.includes('outcome.disposalResult.failedSteps.length===0')) {
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
    ])
  ) {
    violations.push('Appearance media authority must contain exactly the three Package 5 queries.')
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
      if (
        left.startsWith('window.') ||
        left.startsWith('globalThis.') ||
        left.startsWith('self.')
      ) {
        violations.push(
          `${relative(rootDirectory, source.path)} must not publish a Runtime Kernel global.`,
        )
      }
    }
  }
  return violations
}

function validateNoFutureCapabilities(sources: readonly ParsedSource[]): string[] {
  const violations: string[] = []
  const prohibitedPackages = [
    'vue-router',
    '@tanstack/vue-query',
    'axios',
    'openapi-fetch',
    'vue-i18n',
  ]
  for (const source of sources) {
    for (const declaration of nodesOf(source.sourceFile, ts.isImportDeclaration)) {
      const specifier = declaration.moduleSpecifier
      if (
        ts.isStringLiteral(specifier) &&
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
      'Runtime Kernel Bootstrap Registry IDs/order drifted from the exact nine-step contract.',
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
      'Runtime Kernel reverse disposal order must match the exact nine-step contract.',
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
    readSource(paths.errorNormalizer),
    readSource(paths.globalCapture),
    readSource(paths.fatalBoundary),
    readSource(paths.pinia),
    readSource(paths.appearance),
    readSource(paths.main),
    collectTypeScriptSources(webSourceDirectory),
  ])

  const providerFiles = (await readdir(resolve(webSourceDirectory, 'app/providers'))).sort()
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
    ...validateGlobalCapture(globalCapture, applicationSources),
    ...validateVueMount(createApplication, applicationSources),
    ...validateProviders(installProviders, pinia),
    ...validateRetry(retryPolicy, runtimeKernel, fatalBoundary),
    ...validateAppearance(appearance),
    ...validateHmr(main, applicationSources),
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
