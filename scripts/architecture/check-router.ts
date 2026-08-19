import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import ts from 'typescript'

import { coreErrorRegistry } from '../../apps/web/src/app/errors/core-error-registry'
import {
  activeGuardStageRegistry,
  activeNavigationOutcomeRegistry,
} from '../../apps/web/src/app/router/navigation-contract'
import {
  activeDynamicRouteRegistry,
  activeRedirectRegistry,
  errorRouteRegistry,
  focusContractRegistry,
  routeLayoutCapabilityRegistry,
  routeMessageRegistry,
  routeRegistry,
  routeTitleRegistry,
  scrollOwnerRegistry,
  scrollRestorationPolicyRegistry,
  telemetryNameRegistry,
} from '../../apps/web/src/app/router/route-registry'
import {
  routeParamsSchemaRegistry,
  routeQuerySchemaRegistry,
} from '../../apps/web/src/app/router/route-schemas'
import {
  applicationErrorRegistry,
  routerErrorRegistry,
} from '../../apps/web/src/app/router/router-error-registry'

const rootDirectory = process.cwd()
const routerDirectory = resolve(rootDirectory, 'apps/web/src/app/router')
const pagesDirectory = resolve(rootDirectory, 'apps/web/src/pages')
const generatedRouteMapPath = resolve(rootDirectory, 'apps/web/src/route-map.d.ts')
const expectedPageSources = [
  'apps/web/src/pages/index.vue',
  'apps/web/src/pages/error/400.vue',
  'apps/web/src/pages/error/401.vue',
  'apps/web/src/pages/error/403.vue',
  'apps/web/src/pages/[...path].vue',
  'apps/web/src/pages/error/500.vue',
  'apps/web/src/pages/error/offline.vue',
  'apps/web/src/pages/error/maintenance.vue',
] as const
const expectedRouteRecords = [
  [
    'apps/web/src/pages/index.vue',
    'home',
    '/',
    'route-params.none',
    'route-query.none',
    'route-title.home',
    'route.home',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/error/400.vue',
    'error-invalid-route-input',
    '/error/400',
    'route-params.none',
    'route-query.none',
    'route-title.error-invalid-route-input',
    'route.error.invalid-route-input',
    'application-boundary',
  ],
  [
    'apps/web/src/pages/error/401.vue',
    'error-authentication-required',
    '/error/401',
    'route-params.none',
    'route-query.none',
    'route-title.error-authentication-required',
    'route.error.authentication-required',
    'application-boundary',
  ],
  [
    'apps/web/src/pages/error/403.vue',
    'error-permission-denied',
    '/error/403',
    'route-params.none',
    'route-query.none',
    'route-title.error-permission-denied',
    'route.error.permission-denied',
    'application-boundary',
  ],
  [
    'apps/web/src/pages/[...path].vue',
    'error-route-not-found',
    '/:path(.*)',
    'route-params.not-found-path',
    'route-query.none',
    'route-title.error-route-not-found',
    'route.error.route-not-found',
    'application-boundary',
  ],
  [
    'apps/web/src/pages/error/500.vue',
    'error-application-route-failure',
    '/error/500',
    'route-params.none',
    'route-query.none',
    'route-title.error-application-route-failure',
    'route.error.application-route-failure',
    'application-boundary',
  ],
  [
    'apps/web/src/pages/error/offline.vue',
    'error-network-unavailable',
    '/error/offline',
    'route-params.none',
    'route-query.none',
    'route-title.error-network-unavailable',
    'route.error.network-unavailable',
    'application-boundary',
  ],
  [
    'apps/web/src/pages/error/maintenance.vue',
    'error-service-unavailable',
    '/error/maintenance',
    'route-params.none',
    'route-query.none',
    'route-title.error-service-unavailable',
    'route.error.service-unavailable',
    'application-boundary',
  ],
] as const
const expectedCommonMeta = {
  breadcrumbKey: null,
  layout: 'reading',
  layoutCapabilityId: 'route-layout.reading-document',
  auth: 'public',
  requiredPermissionIds: [],
  blockScrollOwnerId: 'document-block',
  inlineScrollOwnerId: 'document-inline',
  keepAlive: 'never',
  dataPrefetch: 'none',
  unsavedChangesPolicy: 'none',
  focusContractId: 'route-focus.primary-heading',
  scrollRestorationPolicyId: 'route-scroll.document-history',
} as const
const expectedRouteTitles = {
  'route-title.home': 'Progressive Adaptive Vue Platform',
  'route-title.error-invalid-route-input': 'Invalid address',
  'route-title.error-authentication-required': 'Authentication required',
  'route-title.error-permission-denied': 'Access denied',
  'route-title.error-route-not-found': 'Page not found',
  'route-title.error-application-route-failure': 'Page unavailable',
  'route-title.error-network-unavailable': 'Offline',
  'route-title.error-service-unavailable': 'Service unavailable',
} as const
const expectedMessages = [
  [
    'home',
    'route-message.home-summary',
    'Phase 1A token contract and deterministic build foundation.',
  ],
  [
    'error-invalid-route-input',
    'route-message.error-invalid-route-input',
    'The requested address contains invalid information.',
  ],
  [
    'error-authentication-required',
    'route-message.error-authentication-required',
    'Authentication is required to continue.',
  ],
  [
    'error-permission-denied',
    'route-message.error-permission-denied',
    'You do not have permission to view this page.',
  ],
  [
    'error-route-not-found',
    'route-message.error-route-not-found',
    'The requested page was not found.',
  ],
  [
    'error-application-route-failure',
    'route-message.error-application-route-failure',
    'The application could not open this page.',
  ],
  [
    'error-network-unavailable',
    'route-message.error-network-unavailable',
    'This page is unavailable while the device is offline.',
  ],
  [
    'error-service-unavailable',
    'route-message.error-service-unavailable',
    'This service is temporarily unavailable.',
  ],
] as const
const expectedErrorRoutes = [
  ['400', 'invalid-route-input', 'error-invalid-route-input'],
  ['401', 'authentication-required', 'error-authentication-required'],
  ['403', 'permission-denied', 'error-permission-denied'],
  ['404', 'route-not-found', 'error-route-not-found'],
  ['500', 'application-route-failure', 'error-application-route-failure'],
  ['offline', 'network-unavailable', 'error-network-unavailable'],
  ['maintenance', 'service-unavailable', 'error-service-unavailable'],
] as const
const expectedRouterErrors = [
  [
    'route-input-validation-failure',
    'validation',
    'router-error.route-input-validation-failure',
    'none',
    'none',
    'error',
    'error-invalid-route-input',
  ],
  [
    'route-not-found',
    'navigation',
    'router-error.route-not-found',
    'none',
    'none',
    'error',
    'error-route-not-found',
  ],
  [
    'route-navigation-failure',
    'navigation',
    'router-error.route-navigation-failure',
    'none',
    'none',
    'error',
    'error-application-route-failure',
  ],
  [
    'route-chunk-load-failure',
    'chunk-load',
    'router-error.route-chunk-load-failure',
    'reload-application',
    'user',
    'error',
    { offline: 'error-network-unavailable', fallback: 'error-application-route-failure' },
  ],
  [
    'route-disposal-failure',
    'navigation',
    'router-error.route-disposal-failure',
    'reload-application',
    'user',
    'fatal',
    'error-application-route-failure',
  ],
  [
    'route-redirect-loop',
    'navigation',
    'router-error.route-redirect-loop',
    'none',
    'none',
    'error',
    'error-application-route-failure',
  ],
] as const

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

function count(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length
}

function exactSet(values: readonly string[], expected: readonly string[]): boolean {
  return (
    values.length === expected.length &&
    new Set(values).size === values.length &&
    expected.every((value) => values.includes(value))
  )
}

function registryViolations(): string[] {
  const violations: string[] = []
  const coreErrors: readonly unknown[] = coreErrorRegistry
  const routerErrors: readonly unknown[] = routerErrorRegistry
  const applicationErrors: readonly unknown[] = applicationErrorRegistry
  const layouts: readonly (typeof routeLayoutCapabilityRegistry)[number][] =
    routeLayoutCapabilityRegistry
  const scrollOwners: readonly (typeof scrollOwnerRegistry)[number][] = scrollOwnerRegistry
  const scrollPolicies: readonly (typeof scrollRestorationPolicyRegistry)[number][] =
    scrollRestorationPolicyRegistry
  const focusContracts: readonly (typeof focusContractRegistry)[number][] = focusContractRegistry
  const redirects: readonly unknown[] = activeRedirectRegistry
  const dynamicRoutes: readonly unknown[] = activeDynamicRouteRegistry
  const actualRoutes = routeRegistry.map((record) => [
    record.sourcePath,
    record.name,
    record.pathPattern,
    record.paramsSchemaId,
    record.querySchemaId,
    record.meta.titleKey,
    record.meta.telemetryName,
    record.meta.errorPolicy,
  ])

  if (!isDeepStrictEqual(actualRoutes, expectedRouteRecords)) {
    violations.push('Router Route Registry diverged from the exact eight-record authority.')
  }

  for (const record of routeRegistry) {
    const { titleKey, telemetryName, errorPolicy, ...commonMeta } = record.meta
    if (
      !isDeepStrictEqual(commonMeta, expectedCommonMeta) ||
      !isDeepStrictEqual(record.capabilityStatus, 'ACTIVE') ||
      titleKey.length === 0 ||
      telemetryName.length === 0 ||
      errorPolicy.length === 0
    ) {
      violations.push(`Route ${record.name} diverged from the exact active Common Meta contract.`)
    }
  }

  for (const field of ['name', 'pathPattern', 'sourcePath'] as const) {
    const values = routeRegistry.map((record) => record[field])
    if (new Set(values).size !== routeRegistry.length) {
      violations.push(`Route Registry ${field} values must be globally unique.`)
    }
  }

  if (!isDeepStrictEqual(routeTitleRegistry, expectedRouteTitles)) {
    violations.push('Router Title Registry diverged from its exact eight records.')
  }

  if (
    !isDeepStrictEqual(
      routeMessageRegistry.map((record) => [record.routeName, record.key, record.text]),
      expectedMessages,
    )
  ) {
    violations.push('Router Message Registry diverged from its exact eight records.')
  }

  if (
    !isDeepStrictEqual(
      errorRouteRegistry.map((record) => [record.code, record.category, record.routeName]),
      expectedErrorRoutes,
    )
  ) {
    violations.push('Error Route Registry diverged from its exact seven records.')
  }

  if (
    !isDeepStrictEqual(
      routerErrorRegistry.map((record) => [
        record.id,
        record.category,
        record.userMessageKey,
        record.recoverability,
        record.retryOwner,
        record.reportLevel,
        record.safeRoute,
      ]),
      expectedRouterErrors,
    )
  ) {
    violations.push('Router Error Registry diverged from its exact six records.')
  }

  if (coreErrors.length !== 4 || routerErrors.length !== 6 || applicationErrors.length !== 10) {
    violations.push('Combined Core plus Router Error Registry must contain exactly ten records.')
  }

  if (
    !isDeepStrictEqual(
      telemetryNameRegistry,
      routeRegistry.map((record) => record.meta.telemetryName),
    )
  ) {
    violations.push('Telemetry-name Registry must project the exact eight Route records.')
  }

  if (
    !isDeepStrictEqual(layouts, [
      {
        id: 'route-layout.reading-document',
        layout: 'reading',
        shellRequired: false,
        renderOwner: 'route-component',
        blockScrollOwnerId: 'document-block',
        inlineScrollOwnerId: 'document-inline',
        requiredShellRegionIds: [],
        optionalShellRegionIds: [],
        movablePanelIds: [],
        resizableRegionIds: [],
        capabilityStatus: 'ACTIVE',
      },
    ]) ||
    !isDeepStrictEqual(scrollOwners, [
      {
        id: 'document-block',
        axis: 'block',
        ownerKind: 'document',
        ownerTarget: 'document.scrollingElement',
        nativeScrolling: true,
      },
      {
        id: 'document-inline',
        axis: 'inline',
        ownerKind: 'document',
        ownerTarget: 'document.scrollingElement',
        nativeScrolling: true,
      },
    ]) ||
    !isDeepStrictEqual(scrollPolicies, [
      {
        id: 'route-scroll.document-history',
        historyTraversal: 'finite-saved-native-block-and-inline-offsets-for-matching-owner',
        newNavigation: 'logical-block-and-inline-start',
        missingOrChangedOwner: 'logical-start',
        ownerReadiness: 'after-routed-dom-commit',
        arbitraryTimeout: 'PROHIBITED',
        polling: 'PROHIBITED',
        customScroller: 'PROHIBITED',
        scrollHijacking: 'PROHIBITED',
      },
    ]) ||
    !isDeepStrictEqual(focusContracts, [
      {
        id: 'route-focus.primary-heading',
        target: 'h1[data-route-focus="primary-heading"]',
        targetTabIndex: -1,
        timing: 'after-routed-dom-commit-without-arbitrary-timeout',
        focusBehavior: 'prevent-scroll-then-registered-scroll-restoration',
        successfulNavigation: 'transfer-focus-to-target',
        cancelledOrFailedNavigation: 'preserve-or-restore-previous-valid-focus',
        missingTarget: 'typed-navigation-failure',
      },
    ])
  ) {
    violations.push('Router Layout, native Scroll or Focus reference registries drifted.')
  }

  if (
    !isDeepStrictEqual(activeGuardStageRegistry, [
      'validate-route-contract',
      'ensure-runtime-configuration-ready',
      'resolve-router-owned-safe-destination',
      'prepare-route-presentation',
      'commit-focus-and-scroll',
    ]) ||
    !isDeepStrictEqual(activeNavigationOutcomeRegistry, [
      'duplicated',
      'cancelled-by-new-navigation',
      'redirected',
      'invalid-input',
      'chunk-load-failed',
      'route-disposal-failed',
      'redirect-loop',
      'unknown-navigation-failure',
    ]) ||
    redirects.length !== 0 ||
    dynamicRoutes.length !== 0
  ) {
    violations.push('Active Router Guard, outcome, Redirect or Dynamic Route projection drifted.')
  }

  return violations
}

function schemaViolations(): string[] {
  const violations: string[] = []
  const paramsSchemas: readonly (typeof routeParamsSchemaRegistry)[number][] =
    routeParamsSchemaRegistry
  const querySchemas: readonly (typeof routeQuerySchemaRegistry)[number][] =
    routeQuerySchemaRegistry
  const params = new Map(paramsSchemas.map((record) => [record.id, record.schema]))
  const query = new Map(querySchemas.map((record) => [record.id, record.schema]))
  const noParams = params.get('route-params.none')
  const notFound = params.get('route-params.not-found-path')
  const noQuery = query.get('route-query.none')

  if (
    paramsSchemas.length !== 2 ||
    noParams === undefined ||
    !noParams.safeParse({}).success ||
    noParams.safeParse({ unexpected: 'value' }).success ||
    notFound === undefined ||
    !notFound.safeParse({ path: 'missing' }).success ||
    notFound.safeParse({}).success ||
    notFound.safeParse({ path: ['missing'] }).success ||
    notFound.safeParse({ path: 'missing', unexpected: 'value' }).success
  ) {
    violations.push('Router Params Schema Registry diverged from the exact two strict schemas.')
  }

  if (
    querySchemas.length !== 1 ||
    noQuery === undefined ||
    !noQuery.safeParse({}).success ||
    noQuery.safeParse({ unexpected: 'value' }).success ||
    noQuery.safeParse({ unexpected: ['first', 'second'] }).success
  ) {
    violations.push('Router Query Schema Registry diverged from the exact strict-empty schema.')
  }

  const paramsIds = new Set(paramsSchemas.map((record) => record.id))
  const queryIds = new Set(querySchemas.map((record) => record.id))
  if (
    routeRegistry.some(
      (record) => !paramsIds.has(record.paramsSchemaId) || !queryIds.has(record.querySchemaId),
    )
  ) {
    violations.push('Route Registry Params/Query schema references are not closed.')
  }

  return violations
}

async function pageViolations(): Promise<string[]> {
  const violations: string[] = []
  const pageFiles = (await collectFiles(pagesDirectory))
    .filter((path) => extname(path) === '.vue')
    .map((path) => relative(rootDirectory, path).split('\\').join('/'))

  if (!exactSet(pageFiles, expectedPageSources)) {
    return ['Official Router page source root must contain exactly the eight admitted Vue files.']
  }

  for (const sourcePath of expectedPageSources) {
    const source = await readFile(resolve(rootDirectory, sourcePath), 'utf8')
    if (
      count(source, /<main\b/gu) !== 1 ||
      count(source, /<h1\b/gu) !== 1 ||
      count(source, /data-route-focus="primary-heading"/gu) !== 1 ||
      count(source, /tabindex="-1"/gu) !== 1 ||
      /\b(?:definePage|fetch|useRoute|useRouter)\s*\(/u.test(source) ||
      /<route\b/gu.test(source)
    ) {
      violations.push(`${sourcePath} diverged from the exact route document contract.`)
    }
  }

  const appSource = await readFile(resolve(rootDirectory, 'apps/web/src/App.vue'), 'utf8')
  if (
    count(appSource, /<RouterView\b/gu) !== 1 ||
    count(appSource, /<main\b/gu) !== 0 ||
    !appSource.includes('getRoutePresentation(route.name)')
  ) {
    violations.push('App.vue must remain the single Router outlet and consume route presentation.')
  }

  return violations
}

async function generatedTypeViolations(): Promise<string[]> {
  const source = await readFile(generatedRouteMapPath, 'utf8')
  const sourceFile = ts.createSourceFile(
    generatedRouteMapPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const experimentalImports = sourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'vue-router/experimental',
  )
  const experimentalImport = experimentalImports[0]
  const namedBindings = experimentalImport?.importClause?.namedBindings
  const generatedNames = [...source.matchAll(/^    '([^']+)': RouteRecordInfo</gmu)].map(
    (match) => match[1] ?? '',
  )
  const generatedSources = [...source.matchAll(/^    '(src\/pages\/[^']+\.vue)': \{/gmu)].map(
    (match) => `apps/web/${match[1] ?? ''}`,
  )

  if (
    experimentalImports.length !== 1 ||
    experimentalImport?.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword ||
    namedBindings === undefined ||
    !ts.isNamedImports(namedBindings) ||
    namedBindings.elements.length !== 1 ||
    namedBindings.elements[0]?.name.text !== '_ExtractParamParserType' ||
    !exactSet(
      generatedNames,
      routeRegistry.map((record) => record.name),
    ) ||
    !exactSet(
      generatedSources,
      routeRegistry.map((record) => record.sourcePath),
    ) ||
    source.split('vue-router/experimental').length - 1 !== 1
  ) {
    return ['Official generated Router DTS import or exact route projection drifted.']
  }

  return []
}

async function navigationContractViolations(): Promise<string[]> {
  const sourcePath = resolve(routerDirectory, 'navigation-contract.ts')
  const source = await readFile(sourcePath, 'utf8')
  const kinds = [...source.matchAll(/readonly kind: '(allow|redirect|cancel|failure)'/gu)].map(
    (match) => match[1] ?? '',
  )

  if (
    !isDeepStrictEqual(kinds, ['allow', 'redirect', 'cancel', 'failure']) ||
    count(source, /readonly navigationId: string/gu) !== 4 ||
    count(source, /readonly destination: RegisteredRouteDestination/gu) !== 3 ||
    count(source, /readonly replace: true/gu) !== 1 ||
    count(source, /readonly errorId: RouterErrorId/gu) !== 1 ||
    !source.includes("readonly reason: 'redirected'") ||
    !source.includes("readonly reason: 'cancelled-by-new-navigation'")
  ) {
    return ['Typed Navigation Result Union diverged from its exact four variants.']
  }

  return []
}

async function routerErrorContractViolations(): Promise<string[]> {
  const source = await readFile(resolve(routerDirectory, 'router-error-registry.ts'), 'utf8')
  const contextBody = /export interface RouterErrorSafeContext \{([\s\S]*?)\n\}/u.exec(source)?.[1]
  const contextFields =
    contextBody === undefined
      ? []
      : [...contextBody.matchAll(/readonly ([A-Za-z]+):/gu)].map((match) => match[1] ?? '')

  if (
    !isDeepStrictEqual(contextFields, [
      'navigationId',
      'routeName',
      'failureKind',
      'releaseSha',
      'buildVersion',
      'controlledReloadUsed',
    ]) ||
    !source.includes('readonly controlledReloadUsed: false') ||
    /readonly (?:url|path|params|query|hash|cause|message|stack):/u.test(contextBody ?? '')
  ) {
    return ['Router Error safe-context field union drifted or exposed prohibited raw context.']
  }

  return []
}

async function lifecycleViolations(): Promise<string[]> {
  const violations: string[] = []
  const lifecyclePath = resolve(routerDirectory, 'router-lifecycle.ts')
  const lifecycle = await readFile(lifecyclePath, 'utf8')
  const sourceFiles = (await collectFiles(resolve(rootDirectory, 'apps/web/src'))).filter((path) =>
    ['.ts', '.vue'].includes(extname(path)),
  )
  const allSources = await Promise.all(
    sourceFiles.map(async (path) => ({ path, source: await readFile(path, 'utf8') })),
  )

  for (const [fragment, expected] of [
    ['createWebHistory(', 1],
    ['createRouter({', 1],
    ['router.beforeEach(', 1],
    ['router.beforeResolve(', 1],
    ['router.afterEach(', 1],
    ['router.onError(', 1],
    ['input.application.use(router)', 1],
    ['await router.isReady()', 1],
    ['history.destroy()', 1],
  ] as const) {
    if (lifecycle.split(fragment).length - 1 !== expected) {
      violations.push(
        `Router lifecycle must contain exactly ${String(expected)} ${fragment} owner.`,
      )
    }
  }

  const stageFragments = [
    'validateRouteContract(to)',
    'ensureRuntimeConfigurationReady(input.configuration)',
    'createFailureResult({',
    'getRoutePresentation(routeName)',
    'focusTargets[0].focus({',
  ] as const
  for (const fragment of stageFragments) {
    if (!lifecycle.includes(fragment)) {
      violations.push(`Router five-stage implementation is missing ${fragment}.`)
    }
  }

  if (
    !lifecycle.includes("from 'vue-router/auto-routes'") ||
    !lifecycle.includes('generatedRouteRecords(routes)') ||
    !lifecycle.includes('generated?.path !== record.pathPattern') ||
    !lifecycle.includes('routeMetaMatches(generated.meta ?? {}, record.meta)') ||
    lifecycle.split('validateGeneratedRouteClosure()').length - 1 !== 2 ||
    !lifecycle.includes('createWebHistory(input.configuration.deploymentBase)') ||
    lifecycle.indexOf('input.application.use(router)') >
      lifecycle.indexOf('await router.isReady()') ||
    /\b(?:fetch|setTimeout|setInterval|addRoute|clearRoutes|experimental_createRouter)\b/u.test(
      lifecycle,
    ) ||
    lifecycle.includes('vue-router/experimental') ||
    !lifecycle.includes('resolveApplicationMounted?.()') ||
    !lifecycle.includes('safeRouterErrorRoute(disposalError.id, false)')
  ) {
    violations.push(
      'Router lifecycle ownership, readiness, disposal or future-scope contract drifted.',
    )
  }

  const hookOwnerFragments = [
    'router.beforeEach(',
    'router.beforeResolve(',
    'router.afterEach(',
    'router.onError(',
  ]
  for (const candidate of allSources) {
    if (resolve(candidate.path) === resolve(lifecyclePath)) {
      continue
    }
    if (hookOwnerFragments.some((fragment) => candidate.source.includes(fragment))) {
      violations.push(
        `${relative(rootDirectory, candidate.path)} competes for global Router hooks.`,
      )
    }
  }

  const repositoryAuthoredSources = allSources.filter(
    (candidate) => resolve(candidate.path) !== resolve(generatedRouteMapPath),
  )
  if (
    repositoryAuthoredSources.some((candidate) =>
      candidate.source.includes('vue-router/experimental'),
    )
  ) {
    violations.push('Repository-authored or runtime Vue Router experimental imports are forbidden.')
  }

  const routerAndPageSources = allSources.filter(
    (candidate) =>
      candidate.path.startsWith(routerDirectory) || candidate.path.startsWith(pagesDirectory),
  )
  for (const candidate of routerAndPageSources) {
    if (
      /@tanstack|axios|openapi|localStorage|sessionStorage|useStorage|useAuth|useSession|usePermission|useI18n|AppShell|SharedUI/u.test(
        candidate.source,
      )
    ) {
      violations.push(
        `${relative(rootDirectory, candidate.path)} activates forbidden future scope.`,
      )
    }
  }

  return violations
}

export async function validateRouterArchitecture(): Promise<readonly string[]> {
  const routerSources = await collectFiles(routerDirectory)
  const routeIdOwners = await Promise.all(
    [
      ...routerSources,
      ...(await collectFiles(pagesDirectory)),
      resolve(rootDirectory, 'apps/web/vite.config.ts'),
      resolve(rootDirectory, 'apps/web/src/App.vue'),
    ].map(async (path) => ({ path, source: await readFile(path, 'utf8') })),
  )
  const routeIdViolations = routeIdOwners
    .filter((candidate) => /\brouteId\b/u.test(candidate.source))
    .map((candidate) => `${relative(rootDirectory, candidate.path)} must not introduce routeId.`)
  const rawRouteIdentityViolations: string[] = []
  const routeNames = routeRegistry.map((record) => record.name)
  const routePaths = routeRegistry
    .map((record) => record.pathPattern)
    .filter((pathPattern) => pathPattern !== '/')

  for (const candidate of routeIdOwners) {
    const normalized = relative(rootDirectory, candidate.path).split('\\').join('/')
    if (
      normalized === 'apps/web/src/app/router/route-registry.ts' ||
      normalized === 'apps/web/src/app/router/router-error-registry.ts' ||
      normalized === 'apps/web/src/route-map.d.ts'
    ) {
      continue
    }
    for (const identity of [...routeNames, ...routePaths]) {
      if (
        candidate.source.includes(`'${identity}'`) ||
        candidate.source.includes(`"${identity}"`)
      ) {
        rawRouteIdentityViolations.push(
          `${normalized} duplicates raw Route Registry identity ${identity}.`,
        )
      }
    }
  }

  return [
    ...registryViolations(),
    ...schemaViolations(),
    ...(await pageViolations()),
    ...(await generatedTypeViolations()),
    ...(await navigationContractViolations()),
    ...(await routerErrorContractViolations()),
    ...(await lifecycleViolations()),
    ...routeIdViolations,
    ...rawRouteIdentityViolations,
  ]
}
