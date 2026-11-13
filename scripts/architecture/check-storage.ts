import { runInNewContext } from 'node:vm'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import ts from 'typescript'

import { applicationConfig } from '../../apps/web/src/app/config/app.config'
import { coreErrorRegistry } from '../../apps/web/src/app/errors/core-error-registry'
import { routerErrorRegistry } from '../../apps/web/src/app/router/router-error-registry'
import {
  consoleNavigationRegistry,
  routeRegistry,
} from '../../apps/web/src/app/router/route-registry'
import {
  navigationPreferenceSchema,
  parseNavigationPreference,
  type NavigationPreferencePort,
} from '../../apps/web/src/app/navigation/navigation-preference-contract'
import {
  useNavigationPreferenceStore,
  type initializeNavigationPreference,
} from '../../apps/web/src/app/navigation/navigation-preference.store'
import { createNavigationPreferenceStorage } from '../../apps/web/src/app/storage/navigation-preference-storage'
import type { ScrollPreferencePort } from '../../apps/web/src/app/scroll/scroll-preference-contract'
import { useScrollPreferenceStore } from '../../apps/web/src/app/scroll/scroll-preference.store'
import { createStorageErrorAdapter } from '../../apps/web/src/app/storage/storage-error'
import { createStartupAttemptId } from '../../apps/web/src/app/bootstrap/lifecycle'
import {
  browserPageBindingSchema,
  browserPageDiscoveryChannelName,
  browserPageDiscoverySchema,
  browserPageSessionSchema,
} from '../../apps/web/src/app/router/browser-page-session-contract'
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
    id: 'dashboard-layout',
    ownerDomain: 'apps/web/src/app/dashboard',
    key: applicationConfig.dashboard.layoutStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'dashboard-layout',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'table-column-preferences',
    ownerDomain: 'apps/web/src/app/tables',
    key: applicationConfig.tables.columnPreferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'table-column-preference',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'form-drafts',
    ownerDomain: 'apps/web/src/app/forms',
    key: applicationConfig.forms.draftStorageKey,
    medium: 'local-storage',
    persistenceShape: 'persisted-envelope',
    schemaId: 'form-draft',
    currentSchemaVersion: 1,
    minimumSupportedSchemaVersion: 1,
    principalPartition: 'none',
    containsSensitiveData: false,
    corruptionPolicy: 'preserve-in-place-reject-read',
    capabilityStatus: 'ACTIVE',
  },
  {
    id: 'appearance-preference',
    ownerDomain: 'apps/web/src/app/appearance',
    key: applicationConfig.appearance.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'explicit-theme-preference',
    currentSchemaVersion: 4,
    minimumSupportedSchemaVersion: 4,
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
    id: 'date-time-preference',
    ownerDomain: 'apps/web/src/app/date-time',
    key: applicationConfig.dateTime.preferenceStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'date-time-preference',
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
    currentSchemaVersion: 2,
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
    id: 'shell-scroll',
    ownerDomain: 'apps/web/src/app/scroll',
    key: applicationConfig.scroll.shellStorageKey,
    medium: 'local-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'shell-scroll',
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
  {
    id: 'browser-page-session',
    ownerDomain: 'apps/web/src/app/router',
    key: applicationConfig.browserPage.sessionStorageKey,
    medium: 'session-storage',
    persistenceShape: 'direct-compatibility',
    schemaId: 'browser-page-session',
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
  'pavp:web:table-column-preferences',
  'pavp:web:form-drafts',
  'pavp:web:user-preference',
  'pavp:web:custom-theme-registry',
  'pavp:web:locale-preference',
  'pavp:web:dashboard-layout',
  'pavp:web:date-time-preference',
  'pavp:web:navigation-preference',
  'pavp:web:workspace-session',
  'pavp:web:shell-scroll',
  'pavp:web:scroll-preference',
  'pavp:web:scroll-refresh-session',
  'pavp:web:browser-page-session',
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
      'Storage Registry must contain the twelve direct-compatibility records and the form-draft envelope.',
    )
  }

  const shaped = records as readonly {
    readonly persistenceShape?: string
    readonly medium?: string
  }[]

  if (
    shaped.filter((record) => record.persistenceShape === 'persisted-envelope').length !== 1 ||
    shaped.some((record) => record.medium === 'memory') ||
    shaped.some((record) => record.medium === 'indexed-db')
  ) {
    violations.push(
      'Storage Registry must admit exactly one form-draft envelope and no memory-only or IndexedDB records.',
    )
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
      (keyLiteral === 'pavp:web:dashboard-layout' ||
      keyLiteral === 'pavp:web:date-time-preference' ||
      keyLiteral === 'pavp:web:locale-preference' ||
      keyLiteral === 'pavp:web:navigation-preference' ||
      keyLiteral === 'pavp:web:workspace-session' ||
      keyLiteral === 'pavp:web:scroll-preference' ||
      keyLiteral === 'pavp:web:scroll-refresh-session' ||
      keyLiteral === 'pavp:web:browser-page-session'
        ? displayPath !== 'apps/web/src/app/config/app.config.ts'
        : !approvedRawStorageKeyPaths.has(displayPath))
    ) {
      violations.push(displayPath + ': raw Storage key literal is outside its approved authority.')
    }
  }

  return violations
}

function storageBrowserAccess(source: ts.SourceFile) {
  const browserGlobals = new Set(['window', 'globalThis', 'self'])
  const unwrap = (expression: ts.Expression): ts.Expression => {
    while (ts.isParenthesizedExpression(expression)) expression = expression.expression
    return expression
  }
  const ownsName = (binding: ts.BindingName, name: string): boolean =>
    ts.isIdentifier(binding)
      ? binding.text === name
      : binding.elements.some(
          (element) => ts.isBindingElement(element) && ownsName(element.name, name),
        )
  // Follow lexical const receiver aliases only; this is not interprocedural alias analysis.
  function resolvesBrowserValue(
    expression: ts.Expression,
    kind: 'global' | 'channel',
    seen = new Set<ts.Node>(),
  ): boolean {
    const value = unwrap(expression)
    if (!ts.isIdentifier(value))
      return kind === 'channel' && browserMember(value, 'BroadcastChannel', seen)
    for (let scope: ts.Node = value.parent; ; scope = scope.parent) {
      if (
        ts.isFunctionLike(scope) &&
        (scope.parameters.some((parameter) => ownsName(parameter.name, value.text)) ||
          ((ts.isFunctionExpression(scope) || ts.isFunctionDeclaration(scope)) &&
            scope.name?.text === value.text))
      )
        return false
      const loopInitializer =
        ts.isForStatement(scope) || ts.isForInStatement(scope) || ts.isForOfStatement(scope)
          ? scope.initializer
          : undefined
      const declarations =
        ts.isBlock(scope) || ts.isSourceFile(scope)
          ? scope.statements.flatMap((statement) =>
              ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
            )
          : ts.isCatchClause(scope) && scope.variableDeclaration !== undefined
            ? [scope.variableDeclaration]
            : loopInitializer !== undefined &&
                ts.isVariableDeclarationList(loopInitializer) &&
                (loopInitializer.flags & ts.NodeFlags.BlockScoped) !== 0
              ? [...loopInitializer.declarations]
              : []
      const binding = declarations.find((declaration) => ownsName(declaration.name, value.text))
      if (binding !== undefined) {
        if (
          !ts.isIdentifier(binding.name) ||
          binding.initializer === undefined ||
          !ts.isVariableDeclarationList(binding.parent) ||
          !(binding.parent.flags & ts.NodeFlags.Const) ||
          binding.pos >= value.pos ||
          seen.has(binding)
        )
          return false
        seen.add(binding)
        return resolvesBrowserValue(binding.initializer, kind, seen)
      }
      if (
        (ts.isBlock(scope) || ts.isSourceFile(scope)) &&
        scope.statements.some(
          (statement) =>
            (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
            statement.name?.text === value.text,
        )
      )
        return false
      if (ts.isSourceFile(scope)) break
    }
    return kind === 'global' ? browserGlobals.has(value.text) : value.text === 'BroadcastChannel'
  }
  const browserMember = (
    expression: ts.Expression,
    name: string,
    seen = new Set<ts.Node>(),
  ): boolean => {
    const value = unwrap(expression)
    if (ts.isPropertyAccessExpression(value))
      return value.name.text === name && resolvesBrowserValue(value.expression, 'global', seen)
    if (!ts.isElementAccessExpression(value)) return false
    const key = unwrap(value.argumentExpression)
    return (
      ts.isStringLiteralLike(key) &&
      key.text === name &&
      resolvesBrowserValue(value.expression, 'global', seen)
    )
  }
  const channelReference = (expression: ts.Expression): boolean => {
    if (ts.isIdentifier(expression)) {
      const parent = expression.parent
      // A property/declaration name is not a read of the global constructor.
      if (
        ('name' in parent &&
          parent.name === expression &&
          !ts.isShorthandPropertyAssignment(parent)) ||
        (ts.isQualifiedName(parent) && parent.right === expression)
      )
        return false
    }
    return resolvesBrowserValue(expression, 'channel')
  }
  return {
    browserMember,
    unwrap,
    channelReferences: nodesOf(
      source,
      (node): node is ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression =>
        ts.isIdentifier(node) ||
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node),
    ).filter(channelReference),
    channelConstructors: nodesOf(source, ts.isNewExpression).filter((expression) =>
      resolvesBrowserValue(expression.expression, 'channel'),
    ),
  }
}

function storageOwnerClosureFileViolation(displayPath: string, source: ts.SourceFile): string[] {
  const violations: string[] = []
  const { browserMember, unwrap, channelReferences, channelConstructors } =
    storageBrowserAccess(source)

  const localStorageOwners = new Set([
    'apps/web/src/app/storage/form-draft-storage.ts',
    'apps/web/src/app/storage/shared-preference-events.ts',
    'apps/web/src/app/appearance/preference-storage.ts',
    'apps/web/src/app/appearance/custom-theme-registry-storage.ts',
    'apps/web/src/app/storage/locale-preference-storage.ts',
    'apps/web/src/app/storage/dashboard-layout-storage.ts',
    'apps/web/src/app/storage/date-time-preference-storage.ts',
    'apps/web/src/app/storage/navigation-preference-storage.ts',
    'apps/web/src/app/storage/workspace-session-storage.ts',
    'apps/web/src/app/storage/scroll-preference-storage.ts',
    'apps/web/src/app/storage/shell-scroll-storage.ts',
    'apps/web/src/app/storage/table-column-preference-storage.ts',
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

  const discoveryName = namedImportLocalName(
    source,
    '../router/browser-page-session-contract',
    'browserPageDiscoveryChannelName',
  )
  const admittedDiscovery =
    displayPath === 'apps/web/src/app/storage/browser-page-session-storage.ts' &&
    discoveryName !== undefined &&
    channelConstructors.length === 1 &&
    channelConstructors[0]?.arguments?.[0]?.getText(source) === discoveryName
  if (channelReferences.length > 0 && !admittedDiscovery) {
    violations.push(displayPath + ': BroadcastChannel is only admitted for browser-page discovery.')
  }

  const storageEventRegistration = nodesOf(source, ts.isCallExpression).some(
    (call) =>
      ((ts.isIdentifier(call.expression) && call.expression.text === 'addEventListener') ||
        browserMember(call.expression, 'addEventListener')) &&
      call.arguments[0] !== undefined &&
      ts.isStringLiteralLike(call.arguments[0]) &&
      call.arguments[0].text === 'storage',
  )
  const storageEventHandler = nodesOf(source, ts.isBinaryExpression).some(
    (expression) =>
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      browserMember(expression.left, 'onstorage') &&
      unwrap(expression.right).kind !== ts.SyntaxKind.NullKeyword,
  )
  if (
    (storageEventRegistration || storageEventHandler) &&
    displayPath !== 'apps/web/src/app/storage/shared-preference-events.ts' &&
    displayPath !== 'apps/web/src/app/storage/form-draft-storage.ts'
  ) {
    violations.push(displayPath + ': Storage change events have no admitted consumer.')
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
          displayPath !== 'apps/web/src/app/storage/browser-page-session-storage.ts' &&
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
  const kernelPath = resolve(rootDirectory, 'apps/web/src/app/bootstrap/runtime-kernel.ts')
  const [lifecycleText, kernelText] = await Promise.all([
    readFile(lifecyclePath, 'utf8'),
    readFile(kernelPath, 'utf8'),
  ])
  const lifecycleSource = scriptSource(lifecyclePath, lifecycleText)
  const kernelSource = scriptSource(kernelPath, kernelText)

  const lifecycleFactories = nodesOf(lifecycleSource, ts.isFunctionDeclaration).filter(
    (fn) =>
      fn.name?.text === 'createAndReadyStorage' &&
      fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  )
  if (lifecycleFactories.length !== 1) {
    violations.push('Storage lifecycle must own exactly one createAndReadyStorage factory.')
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
        'browserPage',
        'dashboard',
        'dateTime',
        'forms',
        'localization',
        'navigation',
        'scroll',
        'tables',
        'updates',
        'workspace',
      ]) &&
      isDeepStrictEqual(Object.keys(applicationConfig.navigation), ['preferenceStorageKey']) &&
      isDeepStrictEqual(applicationConfig.updates, {
        pollIntervalMs: 300000,
        minimumCheckIntervalMs: 60000,
        timeoutMs: 10000,
      }),
    'the exact application configuration key surface drifted.',
  )
  const schema = nodesOf(contract, ts.isVariableDeclaration).find(
    (node) => node.name.getText(contract) === 'navigationPreferenceSchema',
  )?.initializer
  const schemaArgument =
    schema !== undefined && ts.isCallExpression(schema) ? schema.arguments[0] : undefined
  const payloadFields = [
    'schemaVersion',
    'wideNavigationCollapsed',
    'accordion',
    'expandedGroupIds',
  ]
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
    'the payload must be the strict current four-field navigation schema.',
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
    fieldSchemas.get('schemaVersion') === 'z.literal(2)' &&
      fieldSchemas.get('wideNavigationCollapsed') === 'z.boolean()' &&
      fieldSchemas.get('accordion') === 'z.boolean()' &&
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
      adapter.text.includes('parseNavigationPreference(value)') &&
      adapterCalls.filter(
        (call) =>
          ts.isPropertyAccessExpression(call.expression) &&
          call.expression.expression.getText(adapter) === schemaImport &&
          call.expression.name.text === 'safeParse',
      ).length === 2 &&
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
      kernel.text.includes('consoleNavigationGroups'),
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
      isDeepStrictEqual(stateRefs.sort(), [
        'accordion',
        'expandedGroupIds',
        'wideNavigationCollapsed',
      ]),
    'Pinia must contain exactly the three runtime preference fields in one private Store.',
  )
  const writes = nodesOf(store, ts.isCallExpression).filter(
    (call) => callMemberName(call) === 'write',
  )
  report(
    writes.length > 0 && writes.every((call) => call.arguments.length === 1),
    'explicit actions must use the one-argument preference port; runtime probes verify payload and per-call writes.',
  )
  report(
    nodesOf(store, ts.isCallExpression).some((call) => callMemberName(call) === 'read') &&
      !/\b(?:watch|watchEffect|localStorage|sessionStorage|setTimeout|setInterval|requestAnimationFrame|useRouter|useRoute)\b|\$subscribe|\$patch|\$state/u.test(
        store.text,
      ),
    'initialization and shared-preference reads must remain separate from routing and automatic persistence.',
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
      'Storage Registry must contain the twelve direct-compatibility records and the form-draft envelope.',
    )
  ) {
    failures.push('Negative probe failed: Storage Registry drift was accepted.')
  }

  const mutatedEnvelopeRegistry = storageRegistry.map((record) =>
    record.id === 'appearance-preference'
      ? { ...record, persistenceShape: 'persisted-envelope' as const }
      : record,
  )
  if (
    !validateStorageRegistryRecords(mutatedEnvelopeRegistry).includes(
      'Storage Registry must admit exactly one form-draft envelope and no memory-only or IndexedDB records.',
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
    failures.push(
      'Negative probe failed: BroadcastChannel outside browser-page discovery was accepted.',
    )
  }

  const unadmittedStorageCommunication = [
    'const channel = new BroadcastChannel("pavp:storage:change")',
    "window.addEventListener('storage', () => undefined)",
    'window.onstorage = () => undefined',
    "window['onstorage'] = () => undefined",
    "const channel = new window['BroadcastChannel']('unowned')",
    "window['addEventListener']('storage', () => undefined)",
    'const browser = window; browser.onstorage = () => undefined',
    "const browser = globalThis; const target = browser; target['addEventListener']('storage', () => undefined)",
    "const browser = self; const channel = new browser['BroadcastChannel']('unowned')",
    "function connect() { const browser = window; browser['onstorage'] = () => undefined }",
    "const browser = window; for (const target of []) { browser.addEventListener('storage', () => undefined) }",
    'const browser = window; for (const browser of []) {} browser.onstorage = () => undefined',
    'for (const browser = window; false;) { browser.onstorage = () => undefined }',
    'const browser = window; try {} catch (error) { browser.onstorage = () => undefined }',
    'const browser = window; function local() { browser.onstorage = () => undefined }',
  ]
  for (const source of unadmittedStorageCommunication) {
    if (
      storageOwnerClosureFileViolation(
        'apps/web/src/app/storage/storage-lifecycle.ts',
        scriptSource('storage-lifecycle.ts', source),
      ).length !== 1
    )
      failures.push('Negative probe failed: unadmitted Storage communication was accepted.')
  }
  if (
    storageOwnerClosureFileViolation(
      'apps/web/src/app/storage/browser-page-session-storage.ts',
      scriptSource(
        'browser-page-session-storage.ts',
        "import { browserPageDiscoveryChannelName } from '../router/browser-page-session-contract'; new BroadcastChannel(browserPageDiscoveryChannelName)",
      ),
    ).length !== 0
  ) {
    failures.push('Positive probe failed: admitted browser-page discovery was rejected.')
  }
  if (
    storageOwnerClosureFileViolation(
      'apps/web/src/app/storage/storage-lifecycle.ts',
      scriptSource(
        'storage-lifecycle.ts',
        "const record = { onstorage: null }; record.onstorage = null; const target = new EventTarget(); target.addEventListener('storage', () => undefined); window.onstorage = null; window['onstorage'] = null",
      ),
    ).length !== 0
  ) {
    failures.push(
      'Positive probe failed: local data was mistaken for browser Storage communication.',
    )
  }
  for (const source of [
    "const browser = new EventTarget(); browser['addEventListener']('storage', () => undefined)",
    "const record = {}; record['onstorage'] = () => undefined; record['BroadcastChannel'] = 'data'",
    "const record = { BroadcastChannel: 'data' }; record.BroadcastChannel; record['BroadcastChannel']",
    'const record = { BroadcastChannel: class {} }; new record.BroadcastChannel()',
    'class BroadcastChannel {}; new BroadcastChannel() ',
    "function local(window) { new window.BroadcastChannel('local') }",
    "const browser = window; function local(browser) { browser.addEventListener('storage', () => undefined) }",
    "const browser = window; { const browser = new EventTarget(); browser.addEventListener('storage', () => undefined) }",
    "const browser = window; for (const browser of []) { browser.addEventListener('storage', () => undefined) }",
    'const browser = window; for (const browser of []) browser.onstorage = () => undefined',
    'const browser = window; for (const browser in {}) { browser.onstorage = () => undefined }',
    "const browser = window; for (const browser = new EventTarget(); false;) { browser.addEventListener('storage', () => undefined) }",
    'const browser = window; for (let browser of []) { browser.onstorage = () => undefined }',
    'const browser = window; try {} catch (browser) { browser.onstorage = () => undefined }',
    'const browser = window; try {} catch ({ browser }) { browser.onstorage = () => undefined }',
    'const browser = window; const local = function browser() { browser.onstorage = () => undefined }',
  ]) {
    if (
      storageOwnerClosureFileViolation(
        'apps/web/src/app/storage/storage-lifecycle.ts',
        scriptSource('storage-lifecycle.ts', source),
      ).length !== 0
    )
      failures.push(
        'Positive probe failed: local or shadowed receiver was treated as a browser global.',
      )
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

function scrollResultOrchestrationViolations(sourceText: string): string[] {
  const source = scriptSource('scroll-system.ts', sourceText)
  const calls = nodesOf(source, ts.isCallExpression)
  const initializer = nodesOf(source, ts.isFunctionDeclaration).find(
    (node) => node.name?.text === 'initializeScrollSystem',
  )
  const storage = initializer?.parameters
    .find((parameter) => parameter.type?.getText(source) === 'ScrollRefreshPort')
    ?.name.getText(source)
  const storageCalls = (member: string) =>
    calls.filter(
      (call) =>
        ts.isPropertyAccessExpression(call.expression) &&
        call.expression.expression.getText(source) === storage &&
        callMemberName(call) === member,
    )
  const clear = storageCalls('clear')[0]
  const clearOwner = nodesOf(
    source,
    (node): node is ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction =>
      ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node),
  )
    .filter(
      (node) =>
        node !== initializer && clear !== undefined && node.pos < clear.pos && node.end > clear.end,
    )
    .sort((left, right) => left.end - left.pos - (right.end - right.pos))[0]
  const clearName =
    clearOwner === undefined
      ? undefined
      : ts.isVariableDeclaration(clearOwner.parent)
        ? clearOwner.parent.name.getText(source)
        : !ts.isArrowFunction(clearOwner)
          ? clearOwner.name?.text
          : undefined
  const compact = (node: ts.Node | undefined) => node?.getText(source).replaceAll(/\s+/gu, '') ?? ''
  const clears = (node: ts.Node | undefined) =>
    node !== undefined &&
    nodesOf(node, ts.isCallExpression).some((call) => callMemberName(call) === clearName)
  const connection = calls.find((call) => callMemberName(call) === 'connectRefreshScroll')
  const binding = connection?.arguments[0]
  const field = (name: string) =>
    binding !== undefined && ts.isObjectLiteralExpression(binding)
      ? binding.properties.find((property) => property.name?.getText(source) === name)
      : undefined
  const read = storageCalls('read')[0]
  const readName =
    read !== undefined && ts.isVariableDeclaration(read.parent)
      ? read.parent.name.getText(source)
      : undefined
  const pendingField = field('pending')
  const clearResult =
    clear !== undefined && ts.isVariableDeclaration(clear.parent)
      ? clear.parent.name.getText(source)
      : undefined
  const violations: string[] = []
  if (
    storageCalls('read').length !== 1 ||
    storageCalls('clear').length !== 1 ||
    clearOwner === undefined ||
    clearResult === undefined ||
    !nodesOf(clearOwner, ts.isIfStatement).some(
      (guard) =>
        compact(guard.expression) === `${clearResult}.status==='saved'` &&
        nodesOf(guard.thenStatement, ts.isReturnStatement).some(
          (node) => node.expression?.kind === ts.SyntaxKind.TrueKeyword,
        ),
    ) ||
    !nodesOf(clearOwner, ts.isReturnStatement).some(
      (node) => node.expression?.kind === ts.SyntaxKind.FalseKeyword,
    ) ||
    readName === undefined ||
    pendingField === undefined ||
    connection === undefined ||
    !nodesOf(source, ts.isBinaryExpression).some(
      (comparison) =>
        comparison.end < connection.pos && compact(comparison) === `${readName}.status==='found'`,
    ) ||
    !calls.some((call) => call.end < connection.pos && callMemberName(call) === clearName)
  )
    violations.push('SCROLL_RELOAD_CONFIRMED_CONSUMPTION')
  const capture = field('capture')
  const failedWrite =
    capture === undefined
      ? undefined
      : nodesOf(capture, ts.isIfStatement).find((guard) =>
          nodesOf(guard.expression, ts.isCallExpression).some((call) =>
            storageCalls('write').includes(call),
          ),
        )
  if (
    storageCalls('write').length !== 1 ||
    failedWrite === undefined ||
    !compact(failedWrite.expression).endsWith(".status==='failed'") ||
    !clears(failedWrite.thenStatement)
  )
    violations.push('SCROLL_RELOAD_FAILED_WRITE_INVALIDATION')
  if (!clears(field('invalidate'))) violations.push('SCROLL_RELOAD_INVALID_CAPTURE_INVALIDATION')
  const preferenceWatch = calls.find((call) => callMemberName(call) === 'watch')
  const watcher = preferenceWatch?.arguments[1]
  const enabled =
    watcher !== undefined && ts.isArrowFunction(watcher)
      ? watcher.parameters[0]?.name.getText(source)
      : undefined
  const disabled =
    watcher === undefined
      ? undefined
      : nodesOf(watcher, ts.isIfStatement).find(
          (guard) => enabled !== undefined && compact(guard.expression) === `!${enabled}`,
        )
  if (
    disabled === undefined ||
    !clears(disabled.thenStatement) ||
    !nodesOf(disabled.thenStatement, ts.isCallExpression).some(
      (call) => callMemberName(call) === 'discardPending',
    ) ||
    !compact(preferenceWatch?.arguments[2]).includes("flush:'sync'")
  )
    violations.push('SCROLL_RELOAD_DISABLED_PENDING_DISCARD')
  return violations
}

function scrollResultOrchestrationNegativeProbes(source: string): string[] {
  const probes = [
    ['SCROLL_RELOAD_CONFIRMED_CONSUMPTION', /\.status === 'saved'/u, ".status === 'failed'"],
    [
      'SCROLL_RELOAD_FAILED_WRITE_INVALIDATION',
      /\.status === 'failed'\) [\w$]+\(\)/u,
      ".status === 'failed') undefined",
    ],
    [
      'SCROLL_RELOAD_INVALID_CAPTURE_INVALIDATION',
      /invalidate: \(\) => \{\s*[\w$]+\(\)/u,
      'invalidate: () => { undefined',
    ],
    ['SCROLL_RELOAD_DISABLED_PENDING_DISCARD', /[\w$]+\?\.discardPending\(\)/u, 'undefined'],
  ] as const
  const baselineValid = scrollResultOrchestrationViolations(source).length === 0
  return probes.flatMap(([expected, pattern, replacement]) => {
    const mutated = source.replace(pattern, replacement)
    return baselineValid &&
      mutated !== source &&
      isDeepStrictEqual(scrollResultOrchestrationViolations(mutated), [expected])
      ? []
      : [`${expected}: reload Storage result in-memory negative probe failed.`]
  })
}

async function scrollStorageViolations(): Promise<string[]> {
  const violations: string[] = []
  const contracts = [
    [
      'shell-scroll-contract',
      'shellScrollSchema',
      ['schemaVersion', 'sidebarTop', 'drawerTop', 'tabsLeft'],
      'shell-scroll-storage',
      'localStorage',
    ],
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
  const system = await readFile(
    resolve(rootDirectory, 'apps/web/src/app/scroll/scroll-system.ts'),
    'utf8',
  )
  violations.push(
    ...scrollResultOrchestrationViolations(system),
    ...scrollResultOrchestrationNegativeProbes(system),
  )
  return violations
}

function browserPageSessionAdapterViolations(sourceText: string): string[] {
  const source = scriptSource('browser-page-session-storage.ts', sourceText)
  const calls = nodesOf(source, ts.isCallExpression)
  const methods = nodesOf(source, ts.isMethodDeclaration)
  const initialization = methods.find(
    (method) => method.name.getText(source) === 'initializeTarget',
  )
  const compactInitialization = initialization?.getText(source).replaceAll(/\s+/gu, '') ?? ''
  const target = initialization?.parameters[0]?.name.getText(source)
  const constructors = storageBrowserAccess(source).channelConstructors
  const nameImport = namedImportLocalName(
    source,
    '../router/browser-page-session-contract',
    'browserPageDiscoveryChannelName',
  )
  const eventCalls = (methodName: string) =>
    calls.filter(
      (call) =>
        callMemberName(call) === methodName && call.arguments[0]?.getText(source) === "'message'",
    )
  const additions = eventCalls('addEventListener')
  const removals = eventCalls('removeEventListener')
  const key = nodesOf(source, ts.isVariableDeclaration)
    .find(
      (declaration) =>
        declaration.initializer?.getText(source) ===
        'applicationConfig.browserPage.sessionStorageKey',
    )
    ?.name.getText(source)
  const discoverySchema = namedImportLocalName(
    source,
    '../router/browser-page-session-contract',
    'browserPageDiscoverySchema',
  )
  const valid =
    target !== undefined &&
    compactInitialization.includes(`${target}.closed`) &&
    compactInitialization.includes(`${target}.opener!==window`) &&
    compactInitialization.includes(`${target}.document.URL!=='about:blank'`) &&
    compactInitialization.includes('sourceId:crypto.randomUUID()') &&
    compactInitialization.includes('associations:[]') &&
    constructors.length === 1 &&
    constructors[0]?.arguments?.[0]?.getText(source) === nameImport &&
    additions.length === 1 &&
    removals.length === 1 &&
    additions[0]?.arguments[1]?.getText(source) === removals[0]?.arguments[1]?.getText(source) &&
    calls.some((call) => callMemberName(call) === 'close') &&
    calls.some(
      (call) =>
        ts.isPropertyAccessExpression(call.expression) &&
        callMemberName(call) === 'safeParse' &&
        call.expression.expression.getText(source) === discoverySchema &&
        call.arguments[0] !== undefined &&
        ts.isPropertyAccessExpression(call.arguments[0]) &&
        call.arguments[0].name.text === 'data',
    ) &&
    key !== undefined &&
    calls.filter((call) => callMemberName(call) === 'setItem').length === 1 &&
    calls
      .filter((call) => ['setItem', 'getItem'].includes(callMemberName(call) ?? ''))
      .every((call) => call.arguments[0]?.getText(source) === key) &&
    !calls.some((call) => callMemberName(call) === 'removeItem') &&
    !/\b(?:localStorage|setTimeout|setInterval|requestAnimationFrame)\b|window\.(?:open|postMessage)|\.location\s*(?:=|\.)/u.test(
      sourceText,
    ) &&
    sourceText.includes('applicationConfig.browserPage.sessionStorageKey') &&
    sourceText.includes("reason: 'disposed'") &&
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
    ].every((id) => sourceText.includes(id))
  return valid
    ? []
    : [
        'Browser page Storage must preserve its narrow target, data and discovery lifecycle boundaries.',
      ]
}

async function browserPageSessionViolations(): Promise<string[]> {
  const [adapter, lifecycle, kernel] = await Promise.all([
    readFile(resolve(storageDirectory, 'browser-page-session-storage.ts'), 'utf8'),
    readFile(resolve(storageDirectory, 'storage-lifecycle.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/bootstrap/runtime-kernel.ts'), 'utf8'),
  ])
  const violations = browserPageSessionAdapterViolations(adapter)
  const lifecycleSource = scriptSource('storage-lifecycle.ts', lifecycle)
  const kernelSource = scriptSource('runtime-kernel.ts', kernel)
  const factoryImport = namedImportLocalName(
    lifecycleSource,
    './browser-page-session-storage',
    'createBrowserPageSessionStorage',
  )
  const handles = nodesOf(lifecycleSource, ts.isVariableDeclaration).filter(
    (declaration) =>
      declaration.initializer !== undefined &&
      ts.isCallExpression(declaration.initializer) &&
      declaration.initializer.expression.getText(lifecycleSource) === factoryImport,
  )
  const handleName = handles[0]?.name.getText(lifecycleSource)
  const injectionKey = namedImportLocalName(
    kernelSource,
    '../router/browser-page-session-contract',
    'browserPageSessionKey',
  )
  const provisions = nodesOf(kernelSource, ts.isCallExpression).filter(
    (call) =>
      callMemberName(call) === 'provide' &&
      call.arguments[0]?.getText(kernelSource) === injectionKey,
  )
  const channelName: string = browserPageDiscoveryChannelName
  const binding = {
    sourceId: '11111111-1111-4111-8111-111111111111',
    associationId: '22222222-2222-4222-8222-222222222222',
    routeName: 'control-center',
    deploymentBase: '/',
  }
  const snapshot = {
    schemaVersion: 1,
    sourceId: binding.sourceId,
    associations: [binding],
    target: null,
  }
  const discovery = { kind: 'discover', binding, requestId: '33333333-3333-4333-8333-333333333333' }
  if (
    !browserPageBindingSchema.safeParse(binding).success ||
    !browserPageSessionSchema.safeParse(snapshot).success ||
    !browserPageDiscoverySchema.safeParse(discovery).success ||
    [
      { ...binding, sourceId: 'not-a-uuid' },
      { ...binding, associationId: 'not-a-uuid' },
      { ...binding, deploymentBase: '/other/' },
      { ...binding, routeName: '' },
      { ...binding, extra: true },
    ].some((value) => browserPageBindingSchema.safeParse(value).success) ||
    [
      { ...snapshot, schemaVersion: 2 },
      { ...snapshot, sourceId: binding.associationId },
      { ...snapshot, associations: [binding, { ...binding, associationId: binding.sourceId }] },
      { ...snapshot, associations: [binding, { ...binding, routeName: 'workbench-dashboard' }] },
      {
        ...snapshot,
        associations: Array.from({ length: routeRegistry.length + 1 }, (_, index) => ({
          ...binding,
          associationId: `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`,
          routeName: String(index),
        })),
      },
      { ...snapshot, target: { ...binding, extra: true } },
      { ...snapshot, extra: true },
    ].some((value) => browserPageSessionSchema.safeParse(value).success) ||
    [
      { ...discovery, kind: 'reply' },
      { ...discovery, requestId: 'invalid' },
      { ...discovery, extra: true },
    ].some((value) => browserPageDiscoverySchema.safeParse(value).success)
  )
    violations.push(
      'Browser page metadata and discovery must retain their strict identities and source-owned unique associations.',
    )
  if (
    !isDeepStrictEqual(applicationConfig.browserPage, {
      sessionStorageKey: 'pavp:web:browser-page-session',
    }) ||
    channelName !== 'pavp:browser-page:discovery' ||
    !lifecycle.includes('readonly browserPageSession: BrowserPageSessionPort') ||
    handles.length !== 1 ||
    !nodesOf(lifecycleSource, ts.isPropertyAssignment).some(
      (property) =>
        handleName !== undefined &&
        property.name.getText(lifecycleSource) === 'browserPageSession' &&
        property.initializer.getText(lifecycleSource) === `${handleName}.port`,
    ) ||
    !nodesOf(lifecycleSource, ts.isCallExpression).some(
      (call) =>
        handleName !== undefined &&
        call.expression.getText(lifecycleSource) === `${handleName}.dispose`,
    ) ||
    provisions.length !== 1 ||
    !provisions[0]?.arguments[1]?.getText(kernelSource).endsWith('.owner.browserPageSession')
  )
    violations.push(
      'Browser page session must retain one Storage-owned port, private discovery name and Kernel injection.',
    )
  for (const invalid of [
    adapter.replace('target.opener !== window', 'target.opener === window'),
    adapter.replaceAll('channel.close()', 'channel.toString()'),
    adapter.replace('safeParse(event.data)', 'safeParse({})'),
  ]) {
    if (invalid === adapter || browserPageSessionAdapterViolations(invalid).length === 0)
      violations.push(
        'Negative probe failed: browser page target, discovery validation or disposal drift was accepted.',
      )
  }
  const discoveryAdapterPath = 'apps/web/src/app/storage/browser-page-session-storage.ts'
  for (const extra of [
    "new BroadcastChannel('pavp:storage:change')",
    "new window['BroadcastChannel']('pavp:storage:change')",
    "new window.BroadcastChannel('pavp:storage:change')",
    "const browser = window; new browser['BroadcastChannel']('pavp:storage:change')",
    "const Channel = window['BroadcastChannel']; new Channel('pavp:storage:change')",
  ]) {
    const invalid = adapter + '\n{\n' + extra + '\n}'
    if (
      browserPageSessionAdapterViolations(invalid).length === 0 ||
      storageOwnerClosureFileViolation(
        discoveryAdapterPath,
        scriptSource(discoveryAdapterPath, invalid),
      ).length === 0
    )
      violations.push(
        'Negative probe failed: extra discovery-adapter channel acquisition was accepted.',
      )
  }
  const adapterSource = scriptSource(discoveryAdapterPath, adapter)
  const constructorExpression =
    storageBrowserAccess(adapterSource).channelConstructors[0]?.expression
  const bracketConstructor =
    constructorExpression === undefined
      ? adapter
      : adapter.slice(0, constructorExpression.getStart(adapterSource)) +
        "window['BroadcastChannel']" +
        adapter.slice(constructorExpression.end)
  if (
    constructorExpression === undefined ||
    browserPageSessionAdapterViolations(bracketConstructor).length !== 0 ||
    storageOwnerClosureFileViolation(
      discoveryAdapterPath,
      scriptSource(discoveryAdapterPath, bracketConstructor),
    ).length !== 0
  )
    violations.push('Positive probe failed: equivalent discovery constructor syntax was rejected.')
  return violations
}

async function sharedPreferenceEventViolations(): Promise<string[]> {
  const path = 'apps/web/src/app/storage/shared-preference-events.ts'
  const source = await readFile(resolve(rootDirectory, path), 'utf8')
  const listeners = new Set<
    (event: { key: string | null; storageArea: unknown; readonly newValue?: unknown }) => void
  >()
  const area = {}
  const host = {
    localStorage: area,
    addEventListener(
      _name: string,
      listener: (event: {
        key: string | null
        storageArea: unknown
        readonly newValue?: unknown
      }) => void,
    ) {
      listeners.add(listener)
    },
    removeEventListener(
      _name: string,
      listener: (event: {
        key: string | null
        storageArea: unknown
        readonly newValue?: unknown
      }) => void,
    ) {
      listeners.delete(listener)
    },
  }
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext },
  }).outputText
  const operation: unknown = runInNewContext(
    compiled + '\nexports.subscribeSharedPreferenceChanges',
    { exports: {}, window: host },
    { timeout: 1000 },
  )
  if (typeof operation !== 'function') return ['Shared preference subscription is unavailable.']
  const subscribe = operation as (keys: readonly string[], invalidate: () => void) => () => void
  const failures: string[] = []
  const key = applicationConfig.appearance.preferenceStorageKey
  const state = { reads: 0, listenedBeforeRead: true }
  const stop = subscribe([key], () => {
    state.reads += 1
    state.listenedBeforeRead &&= listeners.size === 1
  })
  const receive = [...listeners][0]
  if (receive === undefined) return ['Shared preference subscription did not retain its listener.']
  receive({ key: applicationConfig.workspace.sessionStorageKey, storageArea: area })
  receive({ key, storageArea: {} })
  if (state.reads !== 1 || !state.listenedBeforeRead)
    failures.push('Shared preference subscription must listen before catch-up and filter key/area.')
  receive({
    key,
    storageArea: area,
    get newValue() {
      throw new Error('Payload must not be read.')
    },
  })
  receive({ key: null, storageArea: area })
  if (state.reads !== 3)
    failures.push(
      'Shared preference invalidation must handle selected keys and clear without reading payload.',
    )
  stop()
  stop()
  receive({ key, storageArea: area })
  if (listeners.size !== 0 || state.reads !== 3)
    failures.push('Shared preference disposal must remove the listener and ignore late callbacks.')
  try {
    subscribe([key], () => {
      throw new Error('In-memory catch-up cancellation.')
    })
  } catch {
    /* Only the isolated fixture throws; no application or browser fault is injected. */
  }
  if (listeners.size !== 0) failures.push('Failed preference catch-up leaked its listener.')
  const calls = nodesOf(scriptSource(path, source), ts.isCallExpression)
  if (
    calls.some((call) =>
      ['setItem', 'removeItem', 'clear', 'dispatchEvent'].includes(callMemberName(call) ?? ''),
    )
  )
    failures.push('Shared preference invalidation must not write Storage or replay events.')
  return failures
}

function validateNavigationModePreferences(): readonly string[] {
  const violations: string[] = []
  const expect = (valid: boolean, detail: string): void => {
    if (!valid) violations.push('Navigation modes: ' + detail)
  }
  const ids = consoleNavigationRegistry.map((group) => group.id)
  const legacy = {
    schemaVersion: 1,
    wideNavigationCollapsed: true,
    expandedGroupIds: ids.slice(0, 2),
  }
  const parsed = parseNavigationPreference(legacy)
  expect(
    parsed.success &&
      !parsed.data.accordion &&
      parsed.data.wideNavigationCollapsed &&
      isDeepStrictEqual(parsed.data.expandedGroupIds, legacy.expandedGroupIds),
    'strict legacy input preserves sidebar/group choices and defaults to free mode',
  )
  for (const invalid of [
    { ...legacy, extra: true },
    { ...legacy, schemaVersion: 2 },
    { ...legacy, schemaVersion: 2, accordion: 'true' },
    { ...legacy, schemaVersion: 3, accordion: false },
  ])
    expect(
      !parseNavigationPreference(invalid).success,
      'unknown, incomplete or unsupported records fail validation',
    )

  type ApplicationPinia = Parameters<typeof initializeNavigationPreference>[0]
  const piniaLibrary = createRequire(resolve(rootDirectory, 'apps/web/package.json'))('pinia') as {
    createPinia(): ApplicationPinia
    disposePinia(pinia: ApplicationPinia): void
    getActivePinia(): ApplicationPinia | undefined
    setActivePinia(pinia: ApplicationPinia | undefined): void
  }
  const originalPinia = piniaLibrary.getActivePinia()
  const pinia = piniaLibrary.createPinia()
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const key = applicationConfig.navigation.preferenceStorageKey
  const values = new Map<string, string>([[key, JSON.stringify(legacy)]])
  let writes = 0
  let mismatch = false
  const errors: string[] = []
  const errorAdapter = createStorageErrorAdapter({
    startupAttemptId: createStartupAttemptId(),
    releaseSha: '0'.repeat(40),
    buildVersion: '0.0.0',
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem(name: string) {
          return values.get(name) ?? null
        },
        setItem(name: string, value: string) {
          writes += 1
          if (mismatch) {
            const parsedValue = navigationPreferenceSchema.parse(JSON.parse(value) as unknown)
            value = JSON.stringify({ ...parsedValue, accordion: !parsedValue.accordion })
          }
          values.set(name, value)
        },
      },
    },
  })
  let stop: (() => void) | undefined
  try {
    const adapter = createNavigationPreferenceStorage(
      {
        normalize(id, input) {
          errors.push(id)
          return errorAdapter.normalize(id, input)
        },
      },
      () => false,
    )
    let invalidate = (): void => undefined
    const port: NavigationPreferencePort = {
      ...adapter,
      subscribe(listener) {
        invalidate = listener
        listener()
        return () => {
          invalidate = () => undefined
        }
      },
    }
    const store = useNavigationPreferenceStore(pinia)
    stop = store.initialize(port, ids)
    expect(
      writes === 0 && !store.accordion && store.wideNavigationCollapsed,
      'legacy restore and catch-up do not rewrite storage',
    )
    store.setNavigationAccordion(true, [])
    const saved = navigationPreferenceSchema.parse(JSON.parse(values.get(key) ?? 'null') as unknown)
    expect(
      writes === 1 &&
        saved.accordion &&
        saved.expandedGroupIds.length === 0 &&
        saved.wideNavigationCollapsed,
      'mode and branch choice save atomically without persisting an active route',
    )
    store.setExpandedGroupIds(ids)
    expect(store.expandedGroupIds.length === 1, 'accordion keeps one admitted preferred root')
    store.setNavigationAccordion(false, ids)
    expect(
      !store.accordion && isDeepStrictEqual(store.expandedGroupIds, ids),
      'free mode restores all branches and permits independent expansion',
    )
    const beforeRemote = writes
    values.set(
      key,
      JSON.stringify({ ...saved, accordion: true, expandedGroupIds: ids.slice(1, 2) }),
    )
    invalidate()
    expect(
      store.accordion &&
        isDeepStrictEqual(store.expandedGroupIds, ids.slice(1, 2)) &&
        writes === beforeRemote,
      'remote mode/branch preferences apply without writeback or action replay',
    )
    values.set(key, '{}')
    invalidate()
    expect(
      store.accordion &&
        isDeepStrictEqual(store.expandedGroupIds, ids.slice(1, 2)) &&
        writes === beforeRemote,
      'invalid remote records preserve the last valid mode',
    )
    mismatch = true
    expect(
      adapter.write(saved).status === 'failed' && errors.includes('storage-readback-mismatch'),
      'readback validates the persisted mode as well as the other preference fields',
    )
    expect(
      isDeepStrictEqual(store.setNavigationAccordion(false, ids), {
        status: 'applied',
        persistence: 'failed',
      }) && !store.accordion,
      'the real storage readback failure reaches the caller without rolling back the applied mode',
    )
    stop()
    const beforeDisposed = writes
    store.setNavigationAccordion(false, ids)
    expect(writes === beforeDisposed, 'disposed preferences cannot save mode changes')
  } finally {
    stop?.()
    piniaLibrary.disposePinia(pinia)
    piniaLibrary.setActivePinia(originalPinia)
    if (originalWindow === undefined) Reflect.deleteProperty(globalThis, 'window')
    else Object.defineProperty(globalThis, 'window', originalWindow)
  }
  return violations
}

function validatePreferenceMutationResults(): readonly string[] {
  const violations: string[] = []
  const expect = (valid: boolean, detail: string): void => {
    if (!valid) violations.push('Preference mutation results: ' + detail)
  }
  type ApplicationPinia = Parameters<typeof initializeNavigationPreference>[0]
  const piniaLibrary = createRequire(resolve(rootDirectory, 'apps/web/package.json'))('pinia') as {
    createPinia(): ApplicationPinia
    disposePinia(pinia: ApplicationPinia): void
    getActivePinia(): ApplicationPinia | undefined
    setActivePinia(pinia: ApplicationPinia | undefined): void
  }
  const originalPinia = piniaLibrary.getActivePinia()
  const pinia = piniaLibrary.createPinia()
  const ids = consoleNavigationRegistry.map((group) => group.id)
  let navigationRead: ReturnType<NavigationPreferencePort['read']> = { status: 'missing' }
  let scrollRead: ReturnType<ScrollPreferencePort['read']> = { status: 'missing' }
  const readNavigation: NavigationPreferencePort['read'] = () => navigationRead
  const readScroll: ScrollPreferencePort['read'] = () => scrollRead
  let navigationWrites = 0
  let scrollWrites = 0
  let writable = true
  let duringScrollWrite: (() => void) | undefined
  let invalidateNavigation = (): void => undefined
  let invalidateScroll = (): void => undefined
  let stopNavigation: (() => void) | undefined
  let stopScroll: (() => void) | undefined
  let stopNavigationWatch: (() => void) | undefined
  let stopScrollWatch: (() => void) | undefined
  const saved = { status: 'applied', persistence: 'saved' }
  const failed = { status: 'applied', persistence: 'failed' }
  const notReady = { status: 'not-ready' }
  try {
    const navigation = useNavigationPreferenceStore(pinia)
    const scroll = useScrollPreferenceStore(pinia)
    const unavailableResults = [
      navigation.setWideNavigationCollapsed(true),
      navigation.setExpandedGroupIds(ids),
      navigation.setNavigationAccordion(true, ids),
      scroll.setRestoreOnRefresh(false),
    ]
    expect(
      unavailableResults.every((result) => isDeepStrictEqual(result, notReady)) &&
        !navigation.wideNavigationCollapsed &&
        !navigation.accordion &&
        navigation.expandedGroupIds.length === 0 &&
        scroll.restoreOnRefresh &&
        navigationWrites === 0 &&
        scrollWrites === 0,
      'uninitialized calls report not-ready without applying or writing',
    )
    stopNavigation = navigation.initialize(
      {
        read: () => navigationRead,
        write(preference) {
          navigationWrites += 1
          if (!navigationPreferenceSchema.safeParse(preference).success) {
            expect(
              false,
              'each actual navigation write must contain the complete strict preference',
            )
            return { status: 'failed' }
          }
          if (!writable) return { status: 'failed' }
          navigationRead = { status: 'found', preference }
          return { status: 'saved' }
        },
        subscribe(listener) {
          invalidateNavigation = listener
          listener()
          return () => {
            invalidateNavigation = () => undefined
          }
        },
      },
      ids,
    )
    stopScroll = scroll.initialize({
      read: () => scrollRead,
      write(preference) {
        scrollWrites += 1
        if (!writable) return { status: 'failed' }
        duringScrollWrite?.()
        scrollRead = { status: 'found', preference }
        return { status: 'saved' }
      },
      subscribe(listener) {
        invalidateScroll = listener
        listener()
        return () => {
          invalidateScroll = () => undefined
        }
      },
    })
    expect(navigationWrites === 0 && scrollWrites === 0, 'restore/catch-up never saves')
    for (const mutate of [
      () => navigation.setWideNavigationCollapsed(true),
      () => navigation.setExpandedGroupIds(ids.slice(0, 1)),
      () => navigation.setNavigationAccordion(true, ids),
      () => navigation.setWideNavigationCollapsed(true),
    ]) {
      const before = navigationWrites
      expect(
        isDeepStrictEqual(mutate(), saved) && navigationWrites === before + 1,
        'all navigation actions, including a same-value request, expose one real save',
      )
    }
    expect(
      navigation.accordion &&
        navigation.wideNavigationCollapsed &&
        isDeepStrictEqual(navigation.expandedGroupIds, ids.slice(-1)),
      'result reporting preserves accordion normalization and applied state',
    )
    for (let index = 0; index < 2; index += 1) {
      const before = scrollWrites
      expect(
        isDeepStrictEqual(scroll.setRestoreOnRefresh(false), saved) && scrollWrites === before + 1,
        'scroll reports each real save, including a same-value request',
      )
    }
    writable = false
    for (const mutate of [
      () => navigation.setWideNavigationCollapsed(false),
      () => navigation.setExpandedGroupIds(ids.slice(0, 1)),
      () => navigation.setNavigationAccordion(false, ids),
    ]) {
      const before = navigationWrites
      expect(
        isDeepStrictEqual(mutate(), failed) && navigationWrites === before + 1,
        'all navigation actions expose actual write failure',
      )
    }
    const beforeScrollFailure = scrollWrites
    expect(
      isDeepStrictEqual(scroll.setRestoreOnRefresh(true), failed) &&
        scrollWrites === beforeScrollFailure + 1 &&
        scroll.restoreOnRefresh &&
        !navigation.wideNavigationCollapsed &&
        !navigation.accordion &&
        isDeepStrictEqual(navigation.expandedGroupIds, ids),
      'write failure preserves each applied memory choice without rollback or retry',
    )
    const beforeRemote = [navigationWrites, scrollWrites]
    navigationRead = {
      status: 'found',
      preference: {
        schemaVersion: 2,
        wideNavigationCollapsed: true,
        accordion: true,
        expandedGroupIds: ids.slice(-1),
      },
    }
    scrollRead = { status: 'found', preference: { schemaVersion: 1, restoreOnRefresh: false } }
    invalidateNavigation()
    invalidateScroll()
    expect(
      navigation.accordion && navigation.wideNavigationCollapsed && !scroll.restoreOnRefresh,
      'remote records still apply through the original owners',
    )
    navigationRead = { status: 'unusable', reason: 'invalid' }
    scrollRead = { status: 'unusable', reason: 'invalid' }
    invalidateNavigation()
    invalidateScroll()
    expect(
      navigation.accordion && navigation.wideNavigationCollapsed && !scroll.restoreOnRefresh,
      'invalid remote input retains the last valid choices',
    )
    navigationRead = { status: 'missing' }
    scrollRead = { status: 'missing' }
    invalidateNavigation()
    invalidateScroll()
    expect(
      !navigation.accordion &&
        !navigation.wideNavigationCollapsed &&
        scroll.restoreOnRefresh &&
        isDeepStrictEqual(navigation.expandedGroupIds, ids) &&
        isDeepStrictEqual([navigationWrites, scrollWrites], beforeRemote),
      'missing remote records restore defaults with zero writeback',
    )
    writable = true
    for (const scenario of ['collapse', 'groups', 'accordion', 'scroll', 'cross-domain'] as const) {
      navigation.setNavigationAccordion(false, ids)
      navigation.setWideNavigationCollapsed(false)
      scroll.setRestoreOnRefresh(true)
      const before = [navigationWrites, scrollWrites]
      const calls = { entered: false }
      let nested: ReturnType<typeof navigation.setWideNavigationCollapsed> | undefined
      const onChange = (): void => {
        if (calls.entered) return
        calls.entered = true
        switch (scenario) {
          case 'collapse':
            nested = navigation.setWideNavigationCollapsed(false)
            break
          case 'groups':
            nested = navigation.setExpandedGroupIds(ids.slice(0, 1))
            break
          case 'accordion':
            nested = navigation.setNavigationAccordion(false, ids.slice(0, 1))
            break
          case 'scroll':
            nested = scroll.setRestoreOnRefresh(true)
            break
          case 'cross-domain':
            nested = navigation.setWideNavigationCollapsed(true)
            break
        }
      }
      const stopWatch =
        scenario === 'scroll' || scenario === 'cross-domain'
          ? scroll.$subscribe(onChange, { flush: 'sync' })
          : navigation.$subscribe(onChange, { flush: 'sync' })
      try {
        const outer =
          scenario === 'collapse'
            ? navigation.setWideNavigationCollapsed(true)
            : scenario === 'groups'
              ? navigation.setExpandedGroupIds(ids.slice(-1))
              : scenario === 'accordion'
                ? navigation.setNavigationAccordion(true, ids)
                : scroll.setRestoreOnRefresh(false)
        const storedNavigation = readNavigation()
        const storedScroll = readScroll()
        const scrollAction = scenario === 'scroll' || scenario === 'cross-domain'
        const expectedGroups =
          scenario === 'groups' || scenario === 'accordion' ? ids.slice(-1) : ids
        expect(
          calls.entered &&
            isDeepStrictEqual(outer, saved) &&
            isDeepStrictEqual(nested, scenario === 'cross-domain' ? saved : { status: 'busy' }) &&
            navigationWrites ===
              (before[0] ?? 0) + (scrollAction && scenario !== 'cross-domain' ? 0 : 1) &&
            scrollWrites === (before[1] ?? 0) + (scrollAction ? 1 : 0) &&
            navigation.wideNavigationCollapsed ===
              (scenario === 'collapse' || scenario === 'cross-domain') &&
            navigation.accordion === (scenario === 'accordion') &&
            isDeepStrictEqual(navigation.expandedGroupIds, expectedGroups) &&
            storedNavigation.status === 'found' &&
            storedNavigation.preference.wideNavigationCollapsed ===
              navigation.wideNavigationCollapsed &&
            storedNavigation.preference.accordion === navigation.accordion &&
            isDeepStrictEqual(storedNavigation.preference.expandedGroupIds, expectedGroups) &&
            (!scrollAction ||
              (storedScroll.status === 'found' &&
                !storedScroll.preference.restoreOnRefresh &&
                !scroll.restoreOnRefresh)),
          `${scenario}: nested calls have truthful results and memory matches the single saved candidate`,
        )
      } finally {
        stopWatch()
      }
    }
    const writeReentry = { entered: false }
    let nestedWrite: ReturnType<typeof scroll.setRestoreOnRefresh> | undefined
    duringScrollWrite = () => {
      if (writeReentry.entered) return
      writeReentry.entered = true
      nestedWrite = scroll.setRestoreOnRefresh(true)
    }
    const beforeWriteReentry = scrollWrites
    expect(
      isDeepStrictEqual(scroll.setRestoreOnRefresh(false), saved) &&
        writeReentry.entered &&
        isDeepStrictEqual(nestedWrite, { status: 'busy' }) &&
        scrollWrites === beforeWriteReentry + 1 &&
        !scroll.restoreOnRefresh,
      'the same-store guard also covers synchronous reentry during the actual port write',
    )
    const unexpected = new Error('Isolated preference port failure')
    duringScrollWrite = () => {
      throw unexpected
    }
    let propagated = false
    try {
      scroll.setRestoreOnRefresh(false)
    } catch (source: unknown) {
      propagated = source === unexpected
    } finally {
      duringScrollWrite = undefined
    }
    expect(
      propagated && isDeepStrictEqual(scroll.setRestoreOnRefresh(false), saved),
      'unexpected port errors propagate while finally releases the same-store guard',
    )
    navigation.setNavigationAccordion(false, ids)
    navigation.setWideNavigationCollapsed(false)
    scroll.setRestoreOnRefresh(true)
    const beforeDisposal = [navigationWrites, scrollWrites]
    stopNavigationWatch = navigation.$subscribe(
      () => {
        const stop = stopNavigation
        stopNavigation = undefined
        stop?.()
      },
      { flush: 'sync' },
    )
    stopScrollWatch = scroll.$subscribe(
      () => {
        const stop = stopScroll
        stopScroll = undefined
        stop?.()
      },
      { flush: 'sync' },
    )
    expect(
      isDeepStrictEqual(navigation.setWideNavigationCollapsed(true), failed) &&
        isDeepStrictEqual(scroll.setRestoreOnRefresh(false), failed) &&
        navigation.wideNavigationCollapsed &&
        !scroll.restoreOnRefresh &&
        isDeepStrictEqual([navigationWrites, scrollWrites], beforeDisposal),
      'synchronous disposal during apply reports applied/failed and never writes through a released owner',
    )
    expect(
      [
        navigation.setWideNavigationCollapsed(false),
        navigation.setExpandedGroupIds([]),
        navigation.setNavigationAccordion(true, []),
        scroll.setRestoreOnRefresh(true),
      ].every((result) => isDeepStrictEqual(result, notReady)) &&
        navigation.wideNavigationCollapsed &&
        !navigation.accordion &&
        !scroll.restoreOnRefresh &&
        isDeepStrictEqual(navigation.expandedGroupIds, ids) &&
        isDeepStrictEqual([navigationWrites, scrollWrites], beforeDisposal),
      'calls after disposal are accurately not-ready without state or write changes',
    )
  } finally {
    stopNavigationWatch?.()
    stopScrollWatch?.()
    stopNavigation?.()
    stopScroll?.()
    piniaLibrary.disposePinia(pinia)
    piniaLibrary.setActivePinia(originalPinia)
  }
  const nestedIds = ['components', 'forms', 'design']
  const nestedParents = new Map<string, string | undefined>([
    ['components', undefined],
    ['forms', 'components'],
    ['design', undefined],
  ])
  for (const accordion of [false, true]) {
    const nestedPinia = piniaLibrary.createPinia()
    let stop: (() => void) | undefined
    try {
      const navigation = useNavigationPreferenceStore(nestedPinia)
      stop = navigation.initialize(
        {
          read: () => ({
            status: 'found',
            preference: {
              schemaVersion: 2,
              wideNavigationCollapsed: false,
              accordion,
              expandedGroupIds: ['components', 'forms'],
            },
          }),
          write: () => ({ status: 'saved' }),
          subscribe: () => () => undefined,
        },
        nestedIds,
        nestedParents,
      )
      expect(
        isDeepStrictEqual(navigation.expandedGroupIds, ['components', 'forms']),
        'restored nested expansion must preserve the entire ancestor path',
      )
      navigation.setExpandedGroupIds(nestedIds)
      expect(
        isDeepStrictEqual(navigation.expandedGroupIds, accordion ? ['design'] : nestedIds),
        'accordion must retain only one sibling branch while free mode preserves every group',
      )
      navigation.setExpandedGroupIds(['components', 'forms'])
      expect(
        isDeepStrictEqual(navigation.expandedGroupIds, ['components', 'forms']),
        'opening a nested group must retain its expanded parent',
      )
    } finally {
      stop?.()
      piniaLibrary.disposePinia(nestedPinia)
      piniaLibrary.setActivePinia(originalPinia)
    }
  }
  for (const timing of ['mode', 'groups'] as const) {
    const casePinia = piniaLibrary.createPinia()
    const admitted = ['primary', 'secondary']
    const expectedGroups = admitted.slice(-1)
    let writes = 0
    let stop: (() => void) | undefined
    let stopWatch: (() => void) | undefined
    const lifecycle = { released: false }
    let nested:
      ReturnType<ReturnType<typeof useNavigationPreferenceStore>['setExpandedGroupIds']> | undefined
    try {
      const navigation = useNavigationPreferenceStore(casePinia)
      stop = navigation.initialize(
        {
          read: () => ({ status: 'missing' }),
          write() {
            writes += 1
            return { status: 'saved' }
          },
          subscribe: () => () => undefined,
        },
        admitted,
      )
      stopWatch = navigation.$subscribe(
        () => {
          if (
            lifecycle.released ||
            !navigation.accordion ||
            (timing === 'groups' && !isDeepStrictEqual(navigation.expandedGroupIds, expectedGroups))
          )
            return
          lifecycle.released = true
          const dispose = stop
          stop = undefined
          dispose?.()
          nested = navigation.setExpandedGroupIds(admitted)
        },
        { flush: 'sync' },
      )
      expect(
        isDeepStrictEqual(navigation.setNavigationAccordion(true, admitted), failed) &&
          lifecycle.released &&
          isDeepStrictEqual(nested, notReady) &&
          navigation.accordion &&
          isDeepStrictEqual(navigation.expandedGroupIds, expectedGroups) &&
          writes === 0,
        `${timing}: accordion disposal retains the prepared normalized groups and cannot write`,
      )
    } finally {
      stopWatch?.()
      stop?.()
      piniaLibrary.disposePinia(casePinia)
      piniaLibrary.setActivePinia(originalPinia)
    }
  }
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
    ...(await sharedPreferenceEventViolations()),
    ...(await rawStorageKeyViolations()),
    ...(await sensitivePersistenceViolations()),
    ...(await storageLifecycleViolations()),
    ...(await navigationPreferenceViolations()),
    ...validateNavigationModePreferences(),
    ...validatePreferenceMutationResults(),
    ...(await workspaceSessionViolations()),
    ...(await scrollStorageViolations()),
    ...(await browserPageSessionViolations()),
    ...focusedNegativeProbes(),
  ]

  if (storageMigrationRegistry.length !== 0 || nonePrincipalPartitionId !== 'none') {
    violations.push('Storage migration registry and partition sentinel must remain frozen.')
  }

  return [...new Set(violations)]
}
