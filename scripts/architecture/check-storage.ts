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
      'Storage Registry must contain exactly the two frozen direct-compatibility records.',
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
    if (sourceText.includes(keyLiteral) && !approvedRawStorageKeyPaths.has(displayPath)) {
      violations.push(displayPath + ': raw Storage key literal is outside its approved authority.')
    }
  }

  return violations
}

function storageOwnerClosureFileViolation(displayPath: string, source: ts.SourceFile): string[] {
  const violations: string[] = []

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
    if (normalized.includes(token)) {
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

function focusedNegativeProbes(): string[] {
  const failures: string[] = []

  const mutatedRegistry = storageRegistry.map((record, index) =>
    index === 0 ? { ...record, schemaId: 'drifted-schema' } : record,
  )
  if (
    !validateStorageRegistryRecords(mutatedRegistry).includes(
      'Storage Registry must contain exactly the two frozen direct-compatibility records.',
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
