import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import ts from 'typescript'

import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { coreErrorRegistry } from '../../apps/web/src/app/errors/core-error-registry'
import { routerErrorRegistry } from '../../apps/web/src/app/router/router-error-registry'
import {
  storageChangeChannelName,
  storageCrossTabEventAllowlist,
} from '../../apps/web/src/app/storage/storage-cross-tab-contract'
import { storageErrorMessageTable } from '../../apps/web/src/app/storage/storage-error-messages'
import { storageErrorRegistry } from '../../apps/web/src/app/storage/storage-error-registry'
import { storageMigrationRegistry } from '../../apps/web/src/app/storage/storage-migration-registry'
import { nonePrincipalPartitionId } from '../../apps/web/src/app/storage/storage-partition'
import { storageRegistry } from '../../apps/web/src/app/storage/storage-registry'

const rootDirectory = process.cwd()
const storageDirectory = resolve(rootDirectory, 'apps/web/src/app/storage')
const appearanceDirectory = resolve(rootDirectory, 'apps/web/src/app/appearance')

const expectedStorageRegistryRecords = [
  {
    id: 'appearance-preference',
    ownerDomain: 'apps/web/src/app/appearance',
    key: applicationConfig.appearance.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'explicit-theme-preference',
    currentSchemaVersion: 3,
    minimumSupportedSchemaVersion: 3,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'appearance-custom-theme-registry',
    ownerDomain: 'apps/web/src/app/appearance',
    key: applicationConfig.appearance.customThemeRegistryStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'custom-theme-registry-snapshot',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'locale-preference',
    ownerDomain: 'apps/web/src/shared/i18n',
    key: applicationConfig.localization.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'locale-preference',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'navigation-preference',
    ownerDomain: 'apps/web/src/app/navigation',
    key: applicationConfig.navigation.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'navigation-preference',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'workspace-session',
    ownerDomain: 'apps/web/src/app/workspace',
    key: applicationConfig.workspace.sessionStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'workspace-session',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'scroll-preference',
    ownerDomain: 'apps/web/src/app/scroll',
    key: applicationConfig.scroll.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'scroll-preference',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'scroll-refresh-session',
    ownerDomain: 'apps/web/src/app/router',
    key: applicationConfig.scroll.refreshSessionStorageKey,
    medium: 'session-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'scroll-refresh-session',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
] as const

const expectedStorageErrors = [
  ['storage-unavailable', 'storage', 'storage-error.storage-unavailable', 'none', 'none', 'error'],
  ['storage-read-denied', 'storage', 'storage-error.storage-read-denied', 'none', 'none', 'error'],
  [
    'storage-parse-failed',
    'storage',
    'storage-error.storage-parse-failed',
    'none',
    'none',
    'warning',
  ],
  [
    'storage-schema-rejected',
    'storage',
    'storage-error.storage-schema-rejected',
    'none',
    'none',
    'warning',
  ],
  [
    'storage-unsupported-version',
    'storage',
    'storage-error.storage-unsupported-version',
    'none',
    'none',
    'warning',
  ],
  [
    'storage-principal-mismatch',
    'storage',
    'storage-error.storage-principal-mismatch',
    'none',
    'none',
    'warning',
  ],
  [
    'storage-serialization-failed',
    'storage',
    'storage-error.storage-serialization-failed',
    'none',
    'none',
    'error',
  ],
  [
    'storage-quota-exceeded',
    'storage',
    'storage-error.storage-quota-exceeded',
    'none',
    'none',
    'error',
  ],
  [
    'storage-write-denied',
    'storage',
    'storage-error.storage-write-denied',
    'none',
    'none',
    'error',
  ],
  [
    'storage-readback-mismatch',
    'storage',
    'storage-error.storage-readback-mismatch',
    'none',
    'none',
    'error',
  ],
  [
    'storage-conflict-detected',
    'storage',
    'storage-error.storage-conflict-detected',
    'retry-operation',
    'user',
    'warning',
  ],
] as const

const expectedSafeContextFields = [
  'startupAttemptId',
  'storageRecordId',
  'storageFailureCategory',
  'schemaVersion',
  'byteLength',
  'payloadHash',
  'releaseSha',
  'buildVersion',
] as const

const rawStorageKeyLiterals = [
  'pavp:web:user-preference',
  'pavp:web:custom-theme-registry',
  'pavp:web:locale-preference',
  'pavp:web:navigation-preference',
  'pavp:web:workspace-session',
  'pavp:web:scroll-preference',
  'pavp:web:scroll-refresh-session',
] as const

const approvedRawStorageKeyPaths = new Set([
  'apps/web/src/app/config/app.config.ts',
  'apps/web/index.html',
  'packages/design-system/src/build/build.ts',
])

const sensitivePersistenceTokens = [
  'authorization',
  'cookie',
  'password',
  'secret',
  'csrf',
  'sessionstorage',
  'sessionid',
  'credential',
  'bearer',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'serverauthority',
  'querydata',
] as const

async function collectFiles(directory: string, extensions: ReadonlySet<string>): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path, extensions)))
    } else if (entry.isFile() && extensions.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

function scriptSource(path: string, sourceText: string): ts.SourceFile {
  const code =
    extname(path) === '.vue'
      ? [...sourceText.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
          .map((match) => match[1] ?? '')
          .join('\n')
      : sourceText

  return ts.createSourceFile(
    path,
    code,
    ts.ScriptTarget.Latest,
    true,
    extname(path) === '.js' ? ts.ScriptKind.JS : ts.ScriptKind.TS,
  )
}

function nodesOf<T extends ts.Node>(
  node: ts.Node,
  predicate: (candidate: ts.Node) => candidate is T,
): T[] {
  const matches: T[] = []

  function visit(candidate: ts.Node): void {
    if (predicate(candidate)) {
      matches.push(candidate)
    }

    ts.forEachChild(candidate, visit)
  }

  visit(node)
  return matches
}

function callMemberName(call: ts.CallExpression): string | undefined {
  if (ts.isIdentifier(call.expression)) {
    return call.expression.text
  }

  if (ts.isPropertyAccessExpression(call.expression)) {
    return call.expression.name.text
  }

  return undefined
}

function namedImportLocalName(
  source: ts.SourceFile,
  moduleName: string,
  importedName: string,
): string | undefined {
  for (const statement of source.statements) {
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

function validateStorageRegistryRecords(records: readonly unknown[]): string[] {
  const violations: string[] = []

  if (!isDeepStrictEqual(records, expectedStorageRegistryRecords)) {
    violations.push(
      'Storage Registry must contain exactly the seven admitted direct-compatibility records.',
    )
  }

  const shaped = records as readonly {
    readonly persistenceShape?: string
    readonly medium?: string
  }[]

  if (
    shaped.some((record) => record.persistenceShape === 'persisted-envelope') ||
    shaped.some((record) => record.medium === 'memory') ||
    shaped.some((record) => record.medium === 'indexed-db')
  ) {
    violations.push('Storage Registry must admit zero envelope, memory-only, or IndexedDB records.')
  }

  return violations
}

function validateStorageErrorRecords(
  storageErrors: readonly unknown[],
  coreErrors: readonly unknown[],
  routerErrors: readonly unknown[],
  messageTable: Readonly<Record<string, unknown>>,
): string[] {
  const violations: string[] = []
  const records = storageErrors as readonly {
    readonly id: string
    readonly category: string
    readonly userMessageKey: string
    readonly recoverability: string
    readonly retryOwner: string
    readonly reportLevel: string
    readonly safeContextFields: readonly string[]
  }[]

  if (
    !isDeepStrictEqual(
      records.map((record) => [
        record.id,
        record.category,
        record.userMessageKey,
        record.recoverability,
        record.retryOwner,
        record.reportLevel,
      ]),
      expectedStorageErrors,
    )
  ) {
    violations.push('Storage Error Registry must contain exactly the eleven frozen records.')
  }

  if (coreErrors.length !== 4 || routerErrors.length !== 6 || storageErrors.length !== 11) {
    violations.push(
      'Combined Core plus Router plus Storage Error Registry must contain exactly 21 records.',
    )
  }

  for (const record of records) {
    if (!isDeepStrictEqual(record.safeContextFields, expectedSafeContextFields)) {
      violations.push('Storage Error record ' + record.id + ' safe-context fields drifted.')
    }
  }

  const messageKeys = Object.keys(messageTable).sort()
  const expectedMessageKeys = expectedStorageErrors.map((row) => row[2]).sort()

  if (!isDeepStrictEqual(messageKeys, expectedMessageKeys)) {
    violations.push(
      'Storage Error message authority must contain exactly the eleven storage-error. keys.',
    )
  }

  return violations
}

function rawStorageKeyFileViolation(displayPath: string, sourceText: string): string[] {
  const violations: string[] = []

  for (const keyLiteral of rawStorageKeyLiterals) {
    if (
      sourceText.includes(keyLiteral) &&
      (keyLiteral === 'pavp:web:locale-preference' ||
      keyLiteral === 'pavp:web:navigation-preference' ||
      keyLiteral === 'pavp:web:workspace-session' ||
      keyLiteral === 'pavp:web:scroll-preference' ||
      keyLiteral === 'pavp:web:scroll-refresh-session'
        ? displayPath !== 'apps/web/src/app/config/app.config.ts'
        : !approvedRawStorageKeyPaths.has(displayPath))
    ) {
      violations.push(displayPath + ': raw Storage key literal is outside its approved authority.')
    }
  }

  return violations
}

function storageOwnerClosureFileViolation(displayPath: string, source: ts.SourceFile): string[] {
  const violations: string[] = []

  const localStorageOwners = new Set([
    'apps/web/src/app/appearance/preference-storage.ts',
    'apps/web/src/app/appearance/custom-theme-registry-storage.ts',
    'apps/web/src/app/storage/locale-preference-storage.ts',
    'apps/web/src/app/storage/navigation-preference-storage.ts',
    'apps/web/src/app/storage/workspace-session-storage.ts',
    'apps/web/src/app/storage/scroll-preference-storage.ts',
  ])
  if (
    displayPath.startsWith('apps/web/src/') &&
    nodesOf(source, ts.isIdentifier).some((node) => node.text === 'localStorage') &&
    !localStorageOwners.has(displayPath)
  ) {
    violations.push(displayPath + ': localStorage requires an exact admitted record adapter.')
  }

  for (const identifier of nodesOf(source, ts.isIdentifier)) {
    if (identifier.text === 'indexedDB' || identifier.text.startsWith('IDB')) {
      violations.push(displayPath + ': IndexedDB remains prohibited.')
      break
    }
  }

  if (
    nodesOf(source, ts.isIdentifier).some((identifier) => identifier.text === 'BroadcastChannel') &&
    !displayPath.startsWith('apps/web/src/app/storage/')
  ) {
    violations.push(displayPath + ': BroadcastChannel is only admitted in the Storage owner.')
  }

  return violations
}

function sensitivePersistenceFileViolation(displayPath: string, sourceText: string): string[] {
  const violations: string[] = []
  const normalized = sourceText.toLowerCase()

  for (const token of sensitivePersistenceTokens) {
    if (
      token === 'sessionstorage'
        ? displayPath !== 'apps/web/src/app/storage/scroll-refresh-storage.ts' &&
          /\bsessionStorage\b/iu.test(sourceText)
        : normalized.includes(token)
    ) {
      violations.push(
        displayPath + ': persisted Storage surface contains sensitive field ' + token + '.',
      )
    }
  }

  return violations
}

async function storageOwnerClosureViolations(): Promise<string[]> {
  const roots = [
    resolve(rootDirectory, 'apps/web/src'),
    resolve(rootDirectory, 'packages/design-system/src'),
    resolve(rootDirectory, 'packages/ui/src'),
  ]
  const files = (
    await Promise.all(roots.map((root) => collectFiles(root, new Set(['.ts', '.vue', '.js']))))
  ).flat()
  const violations: string[] = []

  for (const path of files) {
    const displayPath = relative(rootDirectory, path).split(sep).join('/')
    violations.push(
      ...storageOwnerClosureFileViolation(
        displayPath,
        scriptSource(path, await readFile(path, 'utf8')),
      ),
    )
  }

  return violations
}

async function rawStorageKeyViolations(): Promise<string[]> {
  const roots = [
    resolve(rootDirectory, 'apps/web/src'),
    resolve(rootDirectory, 'packages/design-system/src'),
    resolve(rootDirectory, 'packages/ui/src'),
  ]
  const files = (
    await Promise.all(
      roots.map((root) => collectFiles(root, new Set(['.ts', '.vue', '.js', '.html']))),
    )
  ).flat()
  files.push(resolve(rootDirectory, 'apps/web/index.html'))
  const violations: string[] = []

  for (const path of files) {
    const displayPath = relative(rootDirectory, path).split(sep).join('/')
    violations.push(...rawStorageKeyFileViolation(displayPath, await readFile(path, 'utf8')))
  }

  return violations
}

async function sensitivePersistenceViolations(): Promise<string[]> {
  const storageFiles = await collectFiles(storageDirectory, new Set(['.ts']))
  const files = [
    ...storageFiles,
    resolve(appearanceDirectory, 'preference-storage.ts'),
    resolve(appearanceDirectory, 'custom-theme-registry-storage.ts'),
  ]
  const violations: string[] = []

  for (const path of files) {
    const displayPath = relative(rootDirectory, path).split(sep).join('/')
    violations.push(...sensitivePersistenceFileViolation(displayPath, await readFile(path, 'utf8')))
  }

  return violations
}

async function storageLifecycleViolations(): Promise<string[]> {
  const violations: string[] = []
  const lifecyclePath = resolve(storageDirectory, 'storage-lifecycle.ts')
  const crossTabPath = resolve(storageDirectory, 'storage-cross-tab.ts')
  const kernelPath = resolve(rootDirectory, 'apps/web/src/app/bootstrap/runtime-kernel.ts')
  const [lifecycleText, crossTabText, kernelText] = await Promise.all([
    readFile(lifecyclePath, 'utf8'),
    readFile(crossTabPath, 'utf8'),
    readFile(kernelPath, 'utf8'),
  ])
  const lifecycleSource = scriptSource(lifecyclePath, lifecycleText)
  const crossTabSource = scriptSource(crossTabPath, crossTabText)
  const kernelSource = scriptSource(kernelPath, kernelText)

  const lifecycleFactories = nodesOf(lifecycleSource, ts.isFunctionDeclaration).filter(
    (fn) =>
      fn.name?.text === 'createAndReadyStorage' &&
      fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  )
  if (lifecycleFactories.length !== 1) {
    violations.push('Storage lifecycle must own exactly one createAndReadyStorage factory.')
  }

  const crossTabFactoryImport = namedImportLocalName(
    lifecycleSource,
    './storage-cross-tab',
    'createStorageCrossTabHandle',
  )
  const crossTabCalls = nodesOf(lifecycleSource, ts.isCallExpression).filter(
    (call) =>
      crossTabFactoryImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === crossTabFactoryImport,
  )
  if (crossTabFactoryImport === undefined || crossTabCalls.length !== 1) {
    violations.push('Storage lifecycle must create exactly one cross-tab handle.')
  }

  const storageFactoryImport = namedImportLocalName(
    kernelSource,
    '../storage/storage-lifecycle',
    'createAndReadyStorage',
  )
  const storageCalls = nodesOf(kernelSource, ts.isCallExpression).filter(
    (call) =>
      storageFactoryImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === storageFactoryImport,
  )
  if (storageFactoryImport === undefined || storageCalls.length !== 1) {
    violations.push('Runtime Kernel must own exactly one create-and-ready-storage call.')
  }

  const broadcastCalls = nodesOf(crossTabSource, ts.isNewExpression).filter(
    (expression) =>
      ts.isIdentifier(expression.expression) && expression.expression.text === 'BroadcastChannel',
  )
  if (broadcastCalls.length !== 1) {
    violations.push('Storage cross-tab handle must construct exactly one BroadcastChannel.')
  }

  if (!crossTabText.includes('storageChangeChannelName')) {
    violations.push('Storage cross-tab handle must use the frozen channel-name constant.')
  }

  const addStorageEvents = nodesOf(crossTabSource, ts.isCallExpression).filter(
    (call) =>
      callMemberName(call) === 'addEventListener' &&
      call.arguments[0] !== undefined &&
      ts.isStringLiteral(call.arguments[0]) &&
      call.arguments[0].text === 'storage',
  )
  const removeStorageEvents = nodesOf(crossTabSource, ts.isCallExpression).filter(
    (call) =>
      callMemberName(call) === 'removeEventListener' &&
      call.arguments[0] !== undefined &&
      ts.isStringLiteral(call.arguments[0]) &&
      call.arguments[0].text === 'storage',
  )
  if (addStorageEvents.length !== 1 || removeStorageEvents.length !== 1) {
    violations.push('Storage fallback must pair one storage add/remove listener operation.')
  }

  if (!crossTabText.includes('event.key')) {
    violations.push('Storage fallback must match event.key against the exact Registry keys.')
  }

  const closeCalls = nodesOf(crossTabSource, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'close',
  )
  if (closeCalls.length !== 1) {
    violations.push('Storage BroadcastChannel must be closed on disposal.')
  }

  return violations
}

async function navigationPreferenceViolations(): Promise<string[]> {
  const contractPath = 'apps/web/src/app/navigation/navigation-preference-contract.ts'
  const storePath = 'apps/web/src/app/navigation/navigation-preference.store.ts'
  const adapterPath = 'apps/web/src/app/storage/navigation-preference-storage.ts'
  const paths = [
    contractPath,
    storePath,
    adapterPath,
    'apps/web/src/app/storage/storage-lifecycle.ts',
    'apps/web/src/app/bootstrap/runtime-kernel.ts',
  ] as const
  const sources = new Map(
    await Promise.all(
      paths.map(
        async (path) =>
          [path, scriptSource(path, await readFile(resolve(rootDirectory, path), 'utf8'))] as const,
      ),
    ),
  )
  const contract = sources.get(contractPath)
  const store = sources.get(storePath)
  const adapter = sources.get(adapterPath)
  const lifecycle = sources.get('apps/web/src/app/storage/storage-lifecycle.ts')
  const kernel = sources.get('apps/web/src/app/bootstrap/runtime-kernel.ts')
  if (
    contract === undefined ||
    store === undefined ||
    adapter === undefined ||
    lifecycle === undefined ||
    kernel === undefined
  ) {
    return ['Navigation preference requires its exact application, Storage and Kernel owners.']
  }
  const violations: string[] = []
  const report = (valid: boolean, detail: string): void => {
    if (!valid) violations.push('Navigation preference: ' + detail)
  }
  report(
    isDeepStrictEqual(
      applicationConfig.navigation.preferenceStorageKey,
      'pavp:web:navigation-preference',
    ) &&
      isDeepStrictEqual(Object.keys(applicationConfig).sort(), [
        'appearance',
        'localization',
        'navigation',
        'scroll',
        'workspace',
      ]) &&
      isDeepStrictEqual(Object.keys(applicationConfig.navigation), ['preferenceStorageKey']),
    'the exact application configuration key surface drifted.',
  )
  const schema = nodesOf(contract, ts.isVariableDeclaration).find(
    (node) => node.name.getText(contract) === 'navigationPreferenceSchema',
  )?.initializer
  const schemaArgument =
    schema !== undefined && ts.isCallExpression(schema) ? schema.arguments[0] : undefined
  const payloadFields = ['schemaVersion', 'wideNavigationCollapsed', 'expandedGroupIds']
  report(
    schema !== undefined &&
      ts.isCallExpression(schema) &&
      callMemberName(schema) === 'strictObject' &&
      schemaArgument !== undefined &&
      ts.isObjectLiteralExpression(schemaArgument) &&
      isDeepStrictEqual(
        schemaArgument.properties.map((field) => field.name?.getText(contract)),
        payloadFields,
      ),
    'the payload must be the exact strict three-field schema.',
  )
  // These are persisted schema types and constraints, not private parser implementation details.
  const fieldSchemas =
    schemaArgument !== undefined && ts.isObjectLiteralExpression(schemaArgument)
      ? new Map(
          schemaArgument.properties
            .filter(ts.isPropertyAssignment)
            .map((field) => [
              field.name.getText(contract),
              field.initializer.getText(contract).replaceAll(/\s+/gu, ''),
            ]),
        )
      : new Map<string, string>()
  report(
    fieldSchemas.get('schemaVersion') === 'z.literal(1)' &&
      fieldSchemas.get('wideNavigationCollapsed') === 'z.boolean()' &&
      fieldSchemas.get('expandedGroupIds') === 'z.array(z.string().min(1)).readonly()',
    'version, Boolean, nonempty string IDs and readonly array constraints must remain exact.',
  )
  const adapterCalls = nodesOf(adapter, ts.isCallExpression)
  const schemaImport = namedImportLocalName(
    adapter,
    '../navigation/navigation-preference-contract',
    'navigationPreferenceSchema',
  )
  report(
    schemaImport !== undefined &&
      adapterCalls.filter(
        (call) =>
          ts.isPropertyAccessExpression(call.expression) &&
          call.expression.expression.getText(adapter) === schemaImport &&
          call.expression.name.text === 'safeParse',
      ).length === 3 &&
      adapterCalls.filter((call) => callMemberName(call) === 'getItem').length === 2 &&
      adapterCalls.filter((call) => callMemberName(call) === 'setItem').length === 1 &&
      !adapterCalls.some((call) => ['clear', 'removeItem'].includes(callMemberName(call) ?? '')),
    'read, write and readback must validate through the canonical schema without destructive recovery.',
  )
  const disposalPredicate = nodesOf(adapter, ts.isFunctionDeclaration)
    .find((node) => node.name?.text === 'createNavigationPreferenceStorage')
    ?.parameters[1]?.name.getText(adapter)
  for (const methodName of ['read', 'write']) {
    const method = nodesOf(adapter, ts.isMethodDeclaration).find(
      (node) => node.name.getText(adapter) === methodName,
    )
    const first = method?.body?.statements[0]
    report(
      disposalPredicate !== undefined &&
        first !== undefined &&
        ts.isIfStatement(first) &&
        ts.isCallExpression(first.expression) &&
        first.expression.expression.getText(adapter) === disposalPredicate &&
        nodesOf(first.thenStatement, ts.isReturnStatement).length === 1,
      'disposed ' + methodName + ' must return before accessing storage.',
    )
  }
  const errorIds = new Set(nodesOf(adapter, ts.isStringLiteral).map((literal) => literal.text))
  report(
    [
      'storage-unavailable',
      'storage-read-denied',
      'storage-parse-failed',
      'storage-unsupported-version',
      'storage-schema-rejected',
      'storage-serialization-failed',
      'storage-quota-exceeded',
      'storage-write-denied',
      'storage-readback-mismatch',
    ].every((id) => errorIds.has(id)) &&
      adapterCalls.some((call) => callMemberName(call) === 'normalize'),
    'all safe storage failure classifications must remain connected.',
  )
  report(
    nodesOf(lifecycle, ts.isCallExpression).filter(
      (call) => callMemberName(call) === 'createNavigationPreferenceStorage',
    ).length === 1 &&
      lifecycle.text.includes('readonly navigationPreference: NavigationPreferencePort') &&
      nodesOf(kernel, ts.isCallExpression).filter(
        (call) => callMemberName(call) === 'initializeNavigationPreference',
      ).length === 1 &&
      kernel.text.includes('resources.storage.owner.navigationPreference') &&
      kernel.text.includes('consoleNavigationRegistry'),
    'the Storage port and one pre-mount Kernel initializer must retain their application owners.',
  )
  const definitions = nodesOf(store, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'defineStore',
  )
  const setup = definitions[0]?.arguments[1]
  const stateRefs =
    setup !== undefined
      ? nodesOf(setup, ts.isVariableDeclaration)
          .filter(
            (node) =>
              node.initializer !== undefined &&
              ts.isCallExpression(node.initializer) &&
              ['ref', 'shallowRef', 'reactive'].includes(callMemberName(node.initializer) ?? ''),
          )
          .map((node) => node.name.getText(store))
      : []
  report(
    definitions.length === 1 &&
      definitions[0]?.arguments[0]?.getText(store) === "'navigation-preference'" &&
      isDeepStrictEqual(stateRefs.sort(), ['expandedGroupIds', 'wideNavigationCollapsed']),
    'Pinia must contain exactly the two runtime preference fields in one private Store.',
  )
  const writes = nodesOf(store, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'write',
  )
  const snapshot = writes[0]?.arguments[0]
  report(
    writes.length === 1 &&
      snapshot !== undefined &&
      ts.isObjectLiteralExpression(snapshot) &&
      isDeepStrictEqual(
        snapshot.properties.map((field) => field.name?.getText(store)),
        payloadFields,
      ),
    'explicit actions must write one complete preference snapshot.',
  )
  report(
    nodesOf(store, ts.isCallExpression).filter((call) => callMemberName(call) === 'read').length ===
      1 &&
      !/\b(?:watch|watchEffect|localStorage|sessionStorage|setTimeout|setInterval|requestAnimationFrame|useRouter|useRoute)\b|\$subscribe|\$patch|\$state/u.test(
        store.text,
      ),
    'one initialization read must remain separate from routing and automatic persistence.',
  )
  for (const source of [contract, store]) {
    violations.push(...sensitivePersistenceFileViolation(source.fileName, source.text))
  }
  return violations
}

async function workspaceSessionViolations(): Promise<string[]> {
  const directory = 'apps/web/src/app/'
  const paths = [
    directory + 'workspace/workspace-session-contract.ts',
    directory + 'workspace/workspace-session.ts',
    directory + 'workspace/workspace.store.ts',
    directory + 'storage/workspace-session-storage.ts',
    directory + 'storage/storage-lifecycle.ts',
    directory + 'bootstrap/runtime-kernel.ts',
  ]
  const [contract, controller, store, adapter, lifecycle, kernel] = await Promise.all(
    paths.map(async (path) =>
      scriptSource(path, await readFile(resolve(rootDirectory, path), 'utf8')),
    ),
  )
  if (!contract || !controller || !store || !adapter || !lifecycle || !kernel)
    return ['Workspace Session requires its exact application, Storage and Kernel owners.']
  const violations: string[] = []
  const report = (valid: boolean, detail: string): void => {
    if (!valid) violations.push('Workspace Session: ' + detail)
  }
  report(
    isDeepStrictEqual(
      applicationConfig.workspace.sessionStorageKey,
      'pavp:web:workspace-session',
    ) && isDeepStrictEqual(Object.keys(applicationConfig.workspace), ['sessionStorageKey']),
    'the exact application configuration authority drifted.',
  )
  const schema = nodesOf(contract, ts.isVariableDeclaration).find(
    (node) => node.name.getText(contract) === 'workspaceSessionSchema',
  )?.initializer
  const argument = schema && ts.isCallExpression(schema) ? schema.arguments[0] : undefined
  const fields =
    argument && ts.isObjectLiteralExpression(argument)
      ? argument.properties
          .filter(ts.isPropertyAssignment)
          .map((field) => [
            field.name.getText(contract),
            field.initializer.getText(contract).replaceAll(/\s+/gu, ''),
          ])
      : []
  report(
    schema !== undefined &&
      ts.isCallExpression(schema) &&
      callMemberName(schema) === 'strictObject' &&
      isDeepStrictEqual(fields, [
        ['schemaVersion', 'z.literal(1)'],
        ['openRouteNames', 'z.array(z.string().min(1)).readonly()'],
      ]),
    'the persisted payload must remain the strict version and ordered nonempty route-name array only.',
  )
  const adapterCalls = nodesOf(adapter, ts.isCallExpression)
  const schemaImport = namedImportLocalName(
    adapter,
    '../workspace/workspace-session-contract',
    'workspaceSessionSchema',
  )
  report(
    schemaImport !== undefined &&
      adapterCalls.filter(
        (call) =>
          ts.isPropertyAccessExpression(call.expression) &&
          call.expression.expression.getText(adapter) === schemaImport &&
          call.expression.name.text === 'safeParse',
      ).length === 3 &&
      adapterCalls.filter((call) => callMemberName(call) === 'getItem').length === 2 &&
      adapterCalls.filter((call) => callMemberName(call) === 'setItem').length === 1 &&
      !adapterCalls.some((call) => ['removeItem', 'clear'].includes(callMemberName(call) ?? '')),
    'read, write and readback must validate the canonical schema without destructive recovery.',
  )
  const calls = nodesOf(controller, ts.isCallExpression)
  const write = calls.filter((call) => callMemberName(call) === 'write')
  const snapshot = write[0]?.arguments[0]
  const restore = calls.find((call) => callMemberName(call) === 'restore')
  const watch = calls.find((call) => callMemberName(call) === 'watch')
  report(
    calls.filter((call) => callMemberName(call) === 'read').length === 1 &&
      restore !== undefined &&
      watch !== undefined &&
      restore.end < watch.pos &&
      write.length === 1 &&
      write[0] !== undefined &&
      write[0].pos > watch.pos &&
      write[0].end < watch.end &&
      snapshot !== undefined &&
      ts.isObjectLiteralExpression(snapshot) &&
      isDeepStrictEqual(
        snapshot.properties.map((field) => field.name?.getText(controller)),
        ['schemaVersion', 'openRouteNames'],
      ) &&
      !/\b(?:activeIdentity|componentName|instance|localStorage|sessionStorage|useRouter|useRoute|setTimeout|requestAnimationFrame)\b/u.test(
        controller.text,
      ),
    'restore must precede the structural watcher; only ordered route names may reach the sole write.',
  )
  report(
    nodesOf(lifecycle, ts.isCallExpression).filter(
      (call) => callMemberName(call) === 'createWorkspaceSessionStorage',
    ).length === 1 &&
      lifecycle.text.includes('readonly workspaceSession: WorkspaceSessionPort') &&
      nodesOf(kernel, ts.isCallExpression).filter(
        (call) => callMemberName(call) === 'initializeWorkspaceSession',
      ).length === 1 &&
      kernel.text.includes('resources.storage.owner.workspaceSession'),
    'one Storage-owned adapter and one pre-mount Kernel controller must retain their owners.',
  )
  const restoreBody = nodesOf(store, ts.isFunctionDeclaration).find(
    (node) => node.name?.text === 'restore',
  )?.body
  report(
    restoreBody !== undefined &&
      !nodesOf(restoreBody, ts.isIdentifier).some((node) =>
        ['Symbol', 'componentName', 'instance', 'activeIdentity'].includes(node.text),
      ) &&
      nodesOf(restoreBody, ts.isStringLiteral).some(
        (node) => node.text === 'workspace-identity.route-single',
      ),
    'restored structure must filter current route-single policy without fabricating live state or choosing active identity.',
  )
  return violations
}

function focusedNegativeProbes(): string[] {
  const failures: string[] = []

  const mutatedRegistry = storageRegistry.map((record, index) =>
    index === 0 ? { ...record, schemaId: 'drifted-schema' } : record,
  )
  if (
    !validateStorageRegistryRecords(mutatedRegistry).includes(
      'Storage Registry must contain exactly the seven admitted direct-compatibility records.',
    )
  ) {
    failures.push('Negative probe failed: Storage Registry drift was accepted.')
  }

  const mutatedEnvelopeRegistry = storageRegistry.map((record, index) =>
    index === 0 ? { ...record, persistenceShape: 'persisted-envelope' as const } : record,
  )
  if (
    !validateStorageRegistryRecords(mutatedEnvelopeRegistry).includes(
      'Storage Registry must admit zero envelope, memory-only, or IndexedDB records.',
    )
  ) {
    failures.push('Negative probe failed: Storage envelope admission was accepted.')
  }

  const mutatedErrors = storageErrorRegistry.map((record, index) =>
    index === 0 ? { ...record, reportLevel: 'warning' as const } : record,
  )
  if (
    !validateStorageErrorRecords(
      mutatedErrors,
      coreErrorRegistry,
      routerErrorRegistry,
      storageErrorMessageTable,
    ).includes('Storage Error Registry must contain exactly the eleven frozen records.')
  ) {
    failures.push('Negative probe failed: Storage Error Registry drift was accepted.')
  }

  if (
    rawStorageKeyFileViolation(
      'apps/web/src/pages/index.vue',
      "localStorage.getItem('pavp:web:user-preference')",
    ).length !== 1
  ) {
    failures.push('Negative probe failed: a raw Storage key outside its authority was accepted.')
  }

  const unownedBroadcast = scriptSource(
    'apps/web/src/pages/probe.ts',
    'const channel = new BroadcastChannel("unowned")',
  )
  if (
    storageOwnerClosureFileViolation('apps/web/src/pages/probe.ts', unownedBroadcast).length !== 1
  ) {
    failures.push('Negative probe failed: BroadcastChannel outside the Storage owner was accepted.')
  }

  const indexedDbAccess = scriptSource(
    'apps/web/src/pages/probe.ts',
    'const db = indexedDB.open("db")',
  )
  if (
    storageOwnerClosureFileViolation('apps/web/src/pages/probe.ts', indexedDbAccess).length !== 1
  ) {
    failures.push('Negative probe failed: IndexedDB access was accepted.')
  }

  if (
    sensitivePersistenceFileViolation(
      'apps/web/src/app/storage/storage-registry.ts',
      'sessionStorage.getItem("credential")',
    ).length === 0
  ) {
    failures.push('Negative probe failed: sensitive persisted Storage surface was accepted.')
  }

  return failures
}

async function scrollStorageViolations(): Promise<string[]> {
  const violations: string[] = []
  const contracts = [
    [
      'scroll-preference-contract',
      'scrollPreferenceSchema',
      ['schemaVersion', 'restoreOnRefresh'],
      'scroll-preference-storage',
      'localStorage',
    ],
    [
      'scroll-refresh-contract',
      'scrollRefreshSchema',
      ['schemaVersion', 'routeName', 'ownerId', 'left', 'top', 'context'],
      'scroll-refresh-storage',
      'sessionStorage',
    ],
  ] as const
  for (const [file, schemaName, fields, adapterName, medium] of contracts) {
    const path = `apps/web/src/app/scroll/${file}.ts`
    const contract = scriptSource(path, await readFile(resolve(rootDirectory, path), 'utf8'))
    const schema = nodesOf(contract, ts.isVariableDeclaration).find(
      (node) => node.name.getText(contract) === schemaName,
    )?.initializer
    const argument =
      schema !== undefined && ts.isCallExpression(schema) ? schema.arguments[0] : undefined
    if (
      schema === undefined ||
      !ts.isCallExpression(schema) ||
      callMemberName(schema) !== 'strictObject' ||
      argument === undefined ||
      !ts.isObjectLiteralExpression(argument) ||
      !isDeepStrictEqual(
        argument.properties.map((field) => field.name?.getText(contract)),
        fields,
      )
    )
      violations.push(`${path}: the exact strict scroll payload contract drifted.`)
    const adapter = await readFile(
      resolve(rootDirectory, `apps/web/src/app/storage/${adapterName}.ts`),
      'utf8',
    )
    if (
      !adapter.includes(`window.${medium}`) ||
      !adapter.includes(`${schemaName}.safeParse`) ||
      !adapter.includes("reason: 'disposed'") ||
      [
        'storage-unavailable',
        'storage-read-denied',
        'storage-parse-failed',
        'storage-unsupported-version',
        'storage-schema-rejected',
        'storage-serialization-failed',
        'storage-quota-exceeded',
        'storage-write-denied',
        'storage-readback-mismatch',
      ].some((id) => !adapter.includes(id))
    )
      violations.push(
        `${adapterName}: scroll Storage validation, error or disposal ownership drifted.`,
      )
  }
  const crossTab = await readFile(resolve(storageDirectory, 'storage-cross-tab.ts'), 'utf8')
  if (!/\.medium\s*===\s*'local-storage'/u.test(crossTab))
    violations.push('Session Storage must not participate in localStorage event routing.')
  return violations
}

export async function validateStorageArchitecture(): Promise<readonly string[]> {
  const violations = [
    ...validateStorageRegistryRecords(storageRegistry),
    ...validateStorageErrorRecords(
      storageErrorRegistry,
      coreErrorRegistry,
      routerErrorRegistry,
      storageErrorMessageTable,
    ),
    ...(await storageOwnerClosureViolations()),
    ...(await rawStorageKeyViolations()),
    ...(await sensitivePersistenceViolations()),
    ...(await storageLifecycleViolations()),
    ...(await navigationPreferenceViolations()),
    ...(await workspaceSessionViolations()),
    ...(await scrollStorageViolations()),
    ...focusedNegativeProbes(),
  ]

  const channelName: string = storageChangeChannelName

  if (
    storageMigrationRegistry.length !== 0 ||
    storageCrossTabEventAllowlist.length !== 0 ||
    channelName !== 'pavp:storage:change' ||
    nonePrincipalPartitionId !== 'none'
  ) {
    violations.push(
      'Storage migration registry, cross-tab allowlist, channel identity and partition sentinel must remain frozen.',
    )
  }

  return [...new Set(violations)]
}
