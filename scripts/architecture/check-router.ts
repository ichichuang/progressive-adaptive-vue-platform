import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import ts from 'typescript'

import { coreErrorRegistry } from '../../apps/web/src/app/errors/core-error-registry'
import {
  advanceActiveGuardStage,
  activeGuardStageRegistry,
  activeNavigationOutcomeRegistry,
  completeActiveGuardStages,
  createActiveGuardStageProgress,
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
  'apps/web/src/pages/appearance.vue',
  'apps/web/src/pages/design-tokens.vue',
  'apps/web/src/pages/runtime-kernel.vue',
  'apps/web/src/pages/router.vue',
  'apps/web/src/pages/storage.vue',
  'apps/web/src/pages/ui-system.vue',
  'apps/web/src/pages/responsive-layout.vue',
  'apps/web/src/pages/engineering.vue',
  'apps/web/src/pages/capabilities.vue',
  'apps/web/src/pages/error/400.vue',
  'apps/web/src/pages/error/401.vue',
  'apps/web/src/pages/error/403.vue',
  'apps/web/src/pages/[...path].vue',
  'apps/web/src/pages/error/500.vue',
  'apps/web/src/pages/error/offline.vue',
  'apps/web/src/pages/error/maintenance.vue',
] as const
const expectedProductPageSources = expectedPageSources.slice(0, 10)
const expectedRouteRecords = [
  [
    'apps/web/src/pages/index.vue',
    'console-overview',
    '/',
    'route-params.none',
    'route-query.none',
    'route-title.console-overview',
    'route.console.overview',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/appearance.vue',
    'appearance-management',
    '/appearance',
    'route-params.none',
    'route-query.none',
    'route-title.appearance-management',
    'route.console.appearance',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/design-tokens.vue',
    'design-token-inspector',
    '/design-tokens',
    'route-params.none',
    'route-query.none',
    'route-title.design-token-inspector',
    'route.console.design-tokens',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/runtime-kernel.vue',
    'runtime-kernel-inspector',
    '/runtime-kernel',
    'route-params.none',
    'route-query.none',
    'route-title.runtime-kernel-inspector',
    'route.console.runtime-kernel',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/router.vue',
    'router-governance-inspector',
    '/router',
    'route-params.none',
    'route-query.none',
    'route-title.router-governance-inspector',
    'route.console.router',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/storage.vue',
    'storage-persistence-inspector',
    '/storage',
    'route-params.none',
    'route-query.none',
    'route-title.storage-persistence-inspector',
    'route.console.storage',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/ui-system.vue',
    'ui-system-inspector',
    '/ui-system',
    'route-params.none',
    'route-query.none',
    'route-title.ui-system-inspector',
    'route.console.ui-system',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/responsive-layout.vue',
    'responsive-layout-inspector',
    '/responsive-layout',
    'route-params.none',
    'route-query.none',
    'route-title.responsive-layout-inspector',
    'route.console.responsive-layout',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/engineering.vue',
    'engineering-quality-inspector',
    '/engineering',
    'route-params.none',
    'route-query.none',
    'route-title.engineering-quality-inspector',
    'route.console.engineering',
    'route-boundary',
  ],
  [
    'apps/web/src/pages/capabilities.vue',
    'capability-roadmap',
    '/capabilities',
    'route-params.none',
    'route-query.none',
    'route-title.capability-roadmap',
    'route.console.capabilities',
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
const expectedReadingCommonMeta = {
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
const expectedConsoleCommonMeta = {
  layout: 'workspace',
  layoutCapabilityId: 'route-layout.architecture-admin-console',
  auth: 'public',
  requiredPermissionIds: [],
  blockScrollOwnerId: 'architecture-console-content-block',
  inlineScrollOwnerId: 'architecture-console-content-inline',
  keepAlive: 'never',
  dataPrefetch: 'none',
  unsavedChangesPolicy: 'none',
  focusContractId: 'route-focus.architecture-console-page-heading',
  scrollRestorationPolicyId: 'route-scroll.architecture-console-content-history',
} as const
const expectedRouteTitles = {
  'route-title.console-overview': '总览',
  'route-title.appearance-management': '主题与外观',
  'route-title.design-token-inspector': '设计令牌',
  'route-title.runtime-kernel-inspector': '运行时内核',
  'route-title.router-governance-inspector': '路由治理',
  'route-title.storage-persistence-inspector': '存储与持久化',
  'route-title.ui-system-inspector': 'UI 组件',
  'route-title.responsive-layout-inspector': '响应式布局',
  'route-title.engineering-quality-inspector': '工程与质量',
  'route-title.capability-roadmap': '能力路线图',
  'route-title.error-invalid-route-input': '地址无效',
  'route-title.error-authentication-required': '需要身份认证',
  'route-title.error-permission-denied': '访问被拒绝',
  'route-title.error-route-not-found': '未找到页面',
  'route-title.error-application-route-failure': '页面不可用',
  'route-title.error-network-unavailable': '当前离线',
  'route-title.error-service-unavailable': '服务不可用',
} as const
const expectedMessages = [
  [
    'console-overview',
    'route-message.console-overview-summary',
    '查看当前已启用的前端架构能力与运行状态。',
  ],
  [
    'appearance-management',
    'route-message.appearance-management-summary',
    '统一管理主题、颜色模式、对比度、材质、字号与动效，并实时查看界面效果。',
  ],
  [
    'design-token-inspector',
    'route-message.design-token-inspector-summary',
    '查看当前公开角色、主题平面、对比度、材质与清单摘要。',
  ],
  [
    'runtime-kernel-inspector',
    'route-message.runtime-kernel-inspector-summary',
    '查看当前十一阶段启动流程、Provider 与生命周期边界。',
  ],
  [
    'router-governance-inspector',
    'route-message.router-governance-inspector-summary',
    '查看路由、布局、滚动、焦点与错误页治理。',
  ],
  [
    'storage-persistence-inspector',
    'route-message.storage-persistence-inspector-summary',
    '查看当前存储记录、分区、错误与生命周期边界。',
  ],
  [
    'ui-system-inspector',
    'route-message.ui-system-inspector-summary',
    '查看已准入的 PAVP UI 组件与供应商隔离边界。',
  ],
  [
    'responsive-layout-inspector',
    'route-message.responsive-layout-inspector-summary',
    '查看 narrow、regular 与 wide 的布局投影与尺寸权威。',
  ],
  [
    'engineering-quality-inspector',
    'route-message.engineering-quality-inspector-summary',
    '查看工具链、静态门禁、构建预算与托管工作流。',
  ],
  [
    'capability-roadmap',
    'route-message.capability-roadmap-summary',
    '查看尚未启用能力的状态、前置条件与准入要求。',
  ],
  [
    'error-invalid-route-input',
    'route-message.error-invalid-route-input',
    '请求的地址包含无效信息。',
  ],
  [
    'error-authentication-required',
    'route-message.error-authentication-required',
    '需要完成身份认证才能继续。',
  ],
  ['error-permission-denied', 'route-message.error-permission-denied', '你没有查看此页面的权限。'],
  ['error-route-not-found', 'route-message.error-route-not-found', '未找到请求的页面。'],
  [
    'error-application-route-failure',
    'route-message.error-application-route-failure',
    '应用无法打开此页面。',
  ],
  [
    'error-network-unavailable',
    'route-message.error-network-unavailable',
    '当前处于离线状态，无法访问此页面。',
  ],
  ['error-service-unavailable', 'route-message.error-service-unavailable', '此服务暂时不可用。'],
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

interface RouterInteractionSnapshot {
  readonly frameSource: string
  readonly lifecycleSource: string
}

interface RouterInteractionNegativeProbeResult {
  readonly id: string
  readonly expectedFailureCode: string
  readonly passed: boolean
}

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

function routerInteractionContractViolations(snapshot: RouterInteractionSnapshot): string[] {
  const violations: string[] = []
  const duplicateConditionPattern =
    /if\s*\(\s*to\.name\s*===\s*from\.name\s*&&\s*to\.fullPath\s*===\s*from\.fullPath\s*\)\s*\{/u
  const duplicateCondition = duplicateConditionPattern.exec(snapshot.lifecycleSource)
  const duplicateLookupIndex = snapshot.lifecycleSource.indexOf('navigationAttempts.get(to)')
  const duplicateBlock =
    /if\s*\(\s*to\.name\s*===\s*from\.name\s*&&\s*to\.fullPath\s*===\s*from\.fullPath\s*\)\s*\{([\s\S]*?)\}/u.exec(
      snapshot.lifecycleSource,
    )

  if (
    duplicateCondition === null ||
    duplicateLookupIndex === -1 ||
    duplicateCondition.index > duplicateLookupIndex
  ) {
    violations.push('DUPLICATE_SCROLL_NOOP_ORDER')
  }
  if (duplicateBlock?.[1]?.trim() !== 'return false') {
    violations.push('DUPLICATED_NAVIGATION_ERROR_ROUTE')
  }

  const headingFocusCalls = [
    ...snapshot.lifecycleSource.matchAll(/focusTargets\[0\]\.focus\s*\(/gu),
  ]
  const guardedHeadingFocus =
    /if\s*\(\s*from\s*!==\s*START_LOCATION\s*\)\s*\{\s*focusTargets\[0\]\.focus\s*\(\s*\{\s*preventScroll\s*:\s*true\s*\}\s*\)\s*\}/u.test(
      snapshot.lifecycleSource,
    )
  if (!/\bSTART_LOCATION\b/u.test(snapshot.lifecycleSource) || !guardedHeadingFocus) {
    violations.push('INITIAL_NAVIGATION_FOCUS_PRESERVATION')
  }
  if (headingFocusCalls.length !== 1 || !guardedHeadingFocus) {
    violations.push('SUBSEQUENT_NAVIGATION_HEADING_FOCUS')
  }

  const currentRouteGuard =
    /if\s*\(\s*router\.currentRoute\.value\.name\s*===\s*routeName\s*\)\s*\{\s*return\s*\}/u.exec(
      snapshot.frameSource,
    )
  const pushIndex = snapshot.frameSource.indexOf('router.push(')
  if (currentRouteGuard === null || pushIndex === -1 || currentRouteGuard.index > pushIndex) {
    violations.push('FRAME_CURRENT_ROUTE_NOOP')
  }

  const resolvedPush = /const\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+router\.push\s*\([^)]*\)/u.exec(
    snapshot.frameSource,
  )
  const failureBinding = resolvedPush?.[1]
  const duplicatedNoop =
    failureBinding !== undefined &&
    new RegExp(
      `if\\s*\\(\\s*isNavigationFailure\\(\\s*${failureBinding}\\s*,\\s*NavigationFailureType\\.duplicated\\s*\\)\\s*\\)\\s*\\{\\s*return\\s*\\}`,
      'u',
    ).test(snapshot.frameSource)
  if (!duplicatedNoop) {
    violations.push('FRAME_DUPLICATED_RESULT_NOOP')
  }
  if (
    /error-application-route-failure|\/error\/500|router\.replace\s*\(/u.test(
      snapshot.frameSource,
    ) ||
    /\bcatch\s*(?:\(|\{)/u.test(snapshot.frameSource)
  ) {
    violations.push('DUPLICATED_NAVIGATION_ERROR_ROUTE')
  }

  return [...new Set(violations)]
}

function runRouterInteractionNegativeProbes(
  baseline: RouterInteractionSnapshot,
): readonly RouterInteractionNegativeProbeResult[] {
  const duplicateGuard = `if (to.name === from.name && to.fullPath === from.fullPath) {
        return false
      }`
  const currentRouteGuard = `if (router.currentRoute.value.name === routeName) {
    return
  }`
  const duplicatedResultGuard = `if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    return
  }`
  const probes: readonly [
    string,
    string,
    (snapshot: RouterInteractionSnapshot) => RouterInteractionSnapshot,
  ][] = [
    [
      'initial-navigation-unconditional-heading-focus',
      'INITIAL_NAVIGATION_FOCUS_PRESERVATION',
      (snapshot) => ({
        ...snapshot,
        lifecycleSource: snapshot.lifecycleSource.replace(
          'if (from !== START_LOCATION)',
          'if (true)',
        ),
      }),
    ],
    [
      'subsequent-navigation-heading-focus-removed',
      'SUBSEQUENT_NAVIGATION_HEADING_FOCUS',
      (snapshot) => ({
        ...snapshot,
        lifecycleSource: snapshot.lifecycleSource.replace(
          'focusTargets[0].focus({ preventScroll: true })',
          '',
        ),
      }),
    ],
    [
      'frame-pushes-current-route',
      'FRAME_CURRENT_ROUTE_NOOP',
      (snapshot) => ({
        ...snapshot,
        frameSource: snapshot.frameSource.replace(currentRouteGuard, ''),
      }),
    ],
    [
      'duplicate-scroll-detected-after-attempt-lookup',
      'DUPLICATE_SCROLL_NOOP_ORDER',
      (snapshot) => ({
        ...snapshot,
        lifecycleSource: snapshot.lifecycleSource
          .replace(duplicateGuard, '')
          .replace(
            'const navigation = navigationAttempts.get(to)',
            `const navigation = navigationAttempts.get(to)\n\n      ${duplicateGuard}`,
          ),
      }),
    ],
    [
      'duplicated-result-maps-to-500',
      'DUPLICATED_NAVIGATION_ERROR_ROUTE',
      (snapshot) => ({
        ...snapshot,
        frameSource: snapshot.frameSource.replace(
          duplicatedResultGuard,
          `if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    await router.replace({ name: 'error-application-route-failure' })
    return
  }`,
        ),
      }),
    ],
  ]

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutate]) =>
      Object.freeze({
        id,
        expectedFailureCode,
        passed: routerInteractionContractViolations(mutate(baseline)).includes(expectedFailureCode),
      }),
    ),
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

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression
  }

  return current
}

function memberPath(expression: ts.Expression | undefined): readonly string[] {
  if (expression === undefined) {
    return []
  }

  const current = unwrapExpression(expression)
  if (ts.isIdentifier(current)) {
    return [current.text]
  }
  if (ts.isPropertyAccessExpression(current)) {
    return [...memberPath(current.expression), current.name.text]
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
        ts.isTypeAssertionExpression(parent) ||
        ts.isNonNullExpression(parent) ||
        ts.isSatisfiesExpression(parent)) &&
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

function objectPropertyValue(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const property = object.properties.find((candidate) => {
    const propertyName = candidate.name
    return (
      propertyName !== undefined &&
      (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) &&
      propertyName.text === name
    )
  })

  if (property !== undefined && ts.isPropertyAssignment(property)) {
    return property.initializer
  }

  if (property !== undefined && ts.isShorthandPropertyAssignment(property)) {
    return property.name
  }

  return undefined
}

function exactSet(values: readonly string[], expected: readonly string[]): boolean {
  return (
    values.length === expected.length &&
    new Set(values).size === values.length &&
    expected.every((value) => values.includes(value))
  )
}

function guardStageProgressViolations(): string[] {
  const validProgress = createActiveGuardStageProgress()

  try {
    for (const stage of activeGuardStageRegistry) {
      advanceActiveGuardStage(validProgress, stage)
    }
    completeActiveGuardStages(validProgress)
  } catch {
    return ['The active Router Guard progress authority rejects its exact five-stage registry.']
  }

  let rejectedOutOfOrder = false
  let rejectedIncomplete = false

  try {
    advanceActiveGuardStage(createActiveGuardStageProgress(), activeGuardStageRegistry[1])
  } catch {
    rejectedOutOfOrder = true
  }

  try {
    completeActiveGuardStages(createActiveGuardStageProgress())
  } catch {
    rejectedIncomplete = true
  }

  return rejectedOutOfOrder && rejectedIncomplete
    ? []
    : ['The active Router Guard progress authority accepted incomplete or out-of-order execution.']
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
    violations.push('Router Route Registry diverged from the exact seventeen-record authority.')
  }

  for (const record of routeRegistry) {
    const { titleKey, breadcrumbKey, telemetryName, errorPolicy, ...commonMeta } = record.meta
    const expectedCommonMeta =
      record.meta.layout === 'workspace' ? expectedConsoleCommonMeta : expectedReadingCommonMeta
    const expectedBreadcrumbKey =
      record.meta.layout === 'workspace' ? `route-breadcrumb.${record.name}` : null
    if (
      !isDeepStrictEqual(commonMeta, expectedCommonMeta) ||
      !isDeepStrictEqual(record.capabilityStatus, 'ACTIVE') ||
      titleKey.length === 0 ||
      breadcrumbKey !== expectedBreadcrumbKey ||
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
    violations.push('Router Title Registry diverged from its exact seventeen records.')
  }

  if (
    !isDeepStrictEqual(
      routeMessageRegistry.map((record) => [record.routeName, record.key, record.text]),
      expectedMessages,
    )
  ) {
    violations.push('Router Message Registry diverged from its exact seventeen records.')
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
    violations.push('Telemetry-name Registry must project the exact seventeen Route records.')
  }

  if (
    !exactSet(
      layouts.map((record) => record.id),
      ['route-layout.architecture-admin-console', 'route-layout.reading-document'],
    ) ||
    !exactSet(
      scrollOwners.map((record) => record.id),
      [
        'architecture-console-content-block',
        'architecture-console-content-inline',
        'document-block',
        'document-inline',
      ],
    ) ||
    !exactSet(
      scrollPolicies.map((record) => record.id),
      ['route-scroll.architecture-console-content-history', 'route-scroll.document-history'],
    ) ||
    !exactSet(
      focusContracts.map((record) => record.id),
      ['route-focus.architecture-console-page-heading', 'route-focus.primary-heading'],
    )
  ) {
    violations.push('Router Layout, native Scroll or Focus reference registries drifted.')
  }

  if (
    !isDeepStrictEqual(
      focusContracts.map((record) => [
        record.id,
        record.target,
        record.targetTabIndex,
        record.timing,
        record.focusBehavior,
        record.successfulNavigation,
        record.cancelledOrFailedNavigation,
        record.missingTarget,
        record.visibleFocus,
        record.capabilityStatus,
      ]),
      [
        [
          'route-focus.architecture-console-page-heading',
          'h1[data-route-focus="architecture-console-page-heading"]',
          -1,
          'after-admin-shell-and-routed-dom-commit-without-arbitrary-timeout',
          'initial-preserve-browser-focus;subsequent-prevent-scroll-then-registered-scroll-restoration',
          'initial-preserve-browser-focus;subsequent-location-change-transfer-focus-to-target',
          'preserve-or-restore-previous-valid-focus',
          'typed-navigation-failure',
          'existing-semantic-focus-tokens',
          'ACTIVE',
        ],
        [
          'route-focus.primary-heading',
          'h1[data-route-focus="primary-heading"]',
          -1,
          'after-routed-dom-commit-without-arbitrary-timeout',
          'initial-preserve-browser-focus;subsequent-prevent-scroll-then-registered-scroll-restoration',
          'initial-preserve-browser-focus;subsequent-location-change-transfer-focus-to-target',
          'preserve-or-restore-previous-valid-focus',
          'typed-navigation-failure',
          'existing-semantic-focus-tokens',
          'ACTIVE',
        ],
      ],
    )
  ) {
    violations.push('Router Focus Registry diverged from the initial/subsequent focus contract.')
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
    const productPage = expectedProductPageSources.includes(sourcePath)
    const productPageInvalid =
      productPage &&
      (count(source, /<UiPageHeader\b/gu) !== 1 ||
        count(source, /<main\b/gu) !== 0 ||
        count(source, /<h1\b/gu) !== 0)
    const errorPageInvalid =
      !productPage &&
      (count(source, /<main\b/gu) !== 1 ||
        count(source, /<h1\b/gu) !== 1 ||
        count(source, /data-route-focus="primary-heading"/gu) !== 1 ||
        count(source, /tabindex="-1"/gu) !== 1)

    if (
      productPageInvalid ||
      errorPageInvalid ||
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
    !appSource.includes("from 'vue-router'") ||
    !appSource.includes("from './app/router/route-registry'")
  ) {
    violations.push(
      'App.vue must remain the single Router outlet and consume Router-owned presentation.',
    )
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
  const experimentalSpecifier =
    namedBindings !== undefined && ts.isNamedImports(namedBindings)
      ? namedBindings.elements[0]
      : undefined

  if (
    experimentalImports.length !== 1 ||
    experimentalImport?.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword ||
    namedBindings === undefined ||
    !ts.isNamedImports(namedBindings) ||
    namedBindings.elements.length !== 1 ||
    experimentalSpecifier?.name.text !== '_ExtractParamParserType' ||
    (experimentalSpecifier.propertyName?.text ?? experimentalSpecifier.name.text) !==
      '_ExtractParamParserType' ||
    source.split('vue-router/experimental').length - 1 !== 1
  ) {
    return ['Official generated Router DTS experimental type-import shape drifted.']
  }

  return []
}

async function navigationContractViolations(): Promise<string[]> {
  const sourcePath = resolve(routerDirectory, 'navigation-contract.ts')
  const source = await readFile(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const resultDeclaration = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'TypedNavigationResult',
  )
  const variants =
    resultDeclaration !== undefined && ts.isUnionTypeNode(resultDeclaration.type)
      ? resultDeclaration.type.types.filter(ts.isTypeLiteralNode)
      : []
  const expectedVariants: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    allow: {
      kind: "'allow'",
      navigationId: 'string',
      destination: 'RegisteredRouteDestination',
    },
    redirect: {
      kind: "'redirect'",
      navigationId: 'string',
      reason: "'redirected'",
      destination: 'RegisteredRouteDestination',
      replace: 'true',
    },
    cancel: {
      kind: "'cancel'",
      navigationId: 'string',
      reason: "'cancelled-by-new-navigation'",
    },
    failure: {
      kind: "'failure'",
      navigationId: 'string',
      errorId: 'RouterErrorId',
      destination: 'RegisteredRouteDestination',
    },
  }
  const actualVariants = new Map<string, Readonly<Record<string, string>>>()

  for (const variant of variants) {
    const properties = variant.members.filter(ts.isPropertySignature)
    const fields: Record<string, string> = {}

    for (const property of properties) {
      if (
        property.questionToken !== undefined ||
        !property.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ||
        property.type === undefined ||
        (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name))
      ) {
        continue
      }

      fields[property.name.text] = property.type.getText(sourceFile).replaceAll(/\s+/gu, ' ')
    }

    const kind = fields['kind']?.match(/^'(allow|redirect|cancel|failure)'$/u)?.[1]
    if (kind !== undefined) {
      actualVariants.set(kind, fields)
    }
  }

  if (
    resultDeclaration === undefined ||
    !resultDeclaration.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) ||
    variants.length !== 4 ||
    actualVariants.size !== 4 ||
    Object.entries(expectedVariants).some(
      ([kind, expected]) => !isDeepStrictEqual(actualVariants.get(kind), expected),
    )
  ) {
    return ['Typed Navigation Result Union diverged from its exact four variants.']
  }

  return []
}

async function routerErrorContractViolations(): Promise<string[]> {
  const sourcePath = resolve(routerDirectory, 'router-error-registry.ts')
  const source = await readFile(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const contextDeclaration = sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'RouterErrorSafeContext',
  )
  const contextFields: Record<string, string> = {}

  for (const property of contextDeclaration?.members.filter(ts.isPropertySignature) ?? []) {
    if (
      property.questionToken !== undefined ||
      !property.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ||
      property.type === undefined ||
      (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name))
    ) {
      continue
    }

    const typeParts = ts.isUnionTypeNode(property.type)
      ? property.type.types.map((type) => type.getText(sourceFile)).sort()
      : [property.type.getText(sourceFile)]
    contextFields[property.name.text] = typeParts.join(' | ')
  }
  const exactStringLiteralUnion = (name: string): readonly string[] | undefined => {
    const declaration = sourceFile.statements.find(
      (statement): statement is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(statement) && statement.name.text === name,
    )
    const types =
      declaration !== undefined && ts.isUnionTypeNode(declaration.type)
        ? declaration.type.types
        : declaration === undefined
          ? []
          : [declaration.type]

    if (
      declaration === undefined ||
      !declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ||
      !types.every(
        (type): type is ts.LiteralTypeNode =>
          ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal),
      )
    ) {
      return undefined
    }

    return types.flatMap((type) =>
      ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal) ? [type.literal.text] : [],
    )
  }

  if (
    contextDeclaration === undefined ||
    !contextDeclaration.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) ||
    !isDeepStrictEqual(contextFields, {
      navigationId: 'string',
      routeName: 'RouteName | null',
      failureKind: 'RouterFailureKind',
      releaseSha: 'string',
      buildVersion: 'string',
      controlledReloadUsed: 'false',
    }) ||
    !isDeepStrictEqual(exactStringLiteralUnion('RouterErrorId'), [
      'route-input-validation-failure',
      'route-not-found',
      'route-navigation-failure',
      'route-chunk-load-failure',
      'route-disposal-failure',
      'route-redirect-loop',
    ]) ||
    !isDeepStrictEqual(exactStringLiteralUnion('RouterFailureKind'), [
      'invalid-input',
      'route-not-found',
      'chunk-load-failed',
      'route-disposal-failed',
      'redirect-loop',
      'unknown-navigation-failure',
    ])
  ) {
    return ['Router Error safe-context field union drifted or exposed prohibited raw context.']
  }

  return []
}

async function lifecycleViolations(): Promise<string[]> {
  const violations: string[] = []
  const lifecyclePath = resolve(routerDirectory, 'router-lifecycle.ts')
  const lifecycle = await readFile(lifecyclePath, 'utf8')
  const lifecycleSource = ts.createSourceFile(
    lifecyclePath,
    lifecycle,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const applicationSourceFiles = (
    await collectFiles(resolve(rootDirectory, 'apps/web/src'))
  ).filter((path) => ['.ts', '.vue'].includes(extname(path)))
  const applicationSources = await Promise.all(
    applicationSourceFiles.map(async (path) => {
      const source = await readFile(path, 'utf8')
      const structuralSource =
        extname(path) === '.vue'
          ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
              .map((match) => match[1] ?? '')
              .join('\n')
          : source

      return {
        path,
        source,
        sourceFile: ts.createSourceFile(
          path,
          structuralSource,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TS,
        ),
      }
    }),
  )
  const frameSource = applicationSources.find(
    (candidate) =>
      relative(rootDirectory, candidate.path).split('\\').join('/') ===
      'apps/web/src/app/console/ConsoleRouteFrame.vue',
  )?.source

  if (frameSource === undefined) {
    violations.push('The Admin Console Router frame is unavailable.')
  } else {
    const interactionSnapshot = { frameSource, lifecycleSource: lifecycle }
    violations.push(...routerInteractionContractViolations(interactionSnapshot))

    for (const result of runRouterInteractionNegativeProbes(interactionSnapshot)) {
      if (!result.passed) {
        violations.push(`${result.id}: reversible in-memory negative probe did not fail.`)
      }
    }
  }
  const calls = nodesOf(lifecycleSource, ts.isCallExpression)
  const callCount = (name: string): number =>
    calls.filter((call) => callMemberName(call) === name).length
  const advanceStageImport = namedImportLocalName(
    lifecycleSource,
    './navigation-contract',
    'advanceActiveGuardStage',
  )
  const createStageProgressImport = namedImportLocalName(
    lifecycleSource,
    './navigation-contract',
    'createActiveGuardStageProgress',
  )
  const completeStagesImport = namedImportLocalName(
    lifecycleSource,
    './navigation-contract',
    'completeActiveGuardStages',
  )
  const activeStageCalls = calls.filter(
    (call) =>
      advanceStageImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === advanceStageImport,
  )
  const activeStages = activeStageCalls.flatMap((call) => {
    const stage = call.arguments[1]
    return stage !== undefined && ts.isStringLiteral(stage) ? [stage.text] : []
  })

  if (
    activeStageCalls.length !== activeGuardStageRegistry.length ||
    !exactSet(activeStages, activeGuardStageRegistry) ||
    createStageProgressImport === undefined ||
    completeStagesImport === undefined ||
    callCount(createStageProgressImport) !== 1 ||
    callCount(completeStagesImport) !== 1
  ) {
    violations.push(
      'Router lifecycle must consume every active Guard stage through the ordered progress authority.',
    )
  }

  const historyFactoryImport = namedImportLocalName(
    lifecycleSource,
    'vue-router',
    'createWebHistory',
  )
  const routerFactoryImport = namedImportLocalName(lifecycleSource, 'vue-router', 'createRouter')
  const historyCalls = calls.filter(
    (call) =>
      historyFactoryImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === historyFactoryImport,
  )
  const routerCalls = calls.filter(
    (call) =>
      routerFactoryImport !== undefined &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === routerFactoryImport,
  )
  const variableDeclarations = nodesOf(lifecycleSource, ts.isVariableDeclaration)
  const bindingElements = nodesOf(lifecycleSource, ts.isBindingElement)
  const precedingDeclaration = (
    name: string,
    position: number,
  ): ts.VariableDeclaration | undefined =>
    variableDeclarations
      .filter(
        (declaration) =>
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === name &&
          declaration.getStart(lifecycleSource) <= position,
      )
      .sort((left, right) => right.getStart(lifecycleSource) - left.getStart(lifecycleSource))[0]
  const precedingBindingElement = (name: string, position: number): ts.BindingElement | undefined =>
    bindingElements
      .filter(
        (element) =>
          ts.isIdentifier(element.name) &&
          element.name.text === name &&
          element.getStart(lifecycleSource) <= position,
      )
      .sort((left, right) => right.getStart(lifecycleSource) - left.getStart(lifecycleSource))[0]
  const derivesFromPath = (
    expression: ts.Expression | undefined,
    expectedPath: readonly string[],
    seen = new Set<ts.Node>(),
  ): boolean => {
    if (expression === undefined) {
      return false
    }

    const current = unwrapExpression(expression)
    if (isDeepStrictEqual(memberPath(current), expectedPath)) {
      return true
    }
    if (seen.has(current)) {
      return false
    }
    seen.add(current)

    if (ts.isIdentifier(current)) {
      const declaration = precedingDeclaration(current.text, current.getStart(lifecycleSource))
      if (declaration?.initializer !== undefined) {
        return derivesFromPath(declaration.initializer, expectedPath, seen)
      }

      const binding = precedingBindingElement(current.text, current.getStart(lifecycleSource))
      const pattern = binding?.parent
      const owner = pattern?.parent
      const propertyName = binding?.propertyName ?? binding?.name
      if (
        binding !== undefined &&
        pattern !== undefined &&
        ts.isObjectBindingPattern(pattern) &&
        owner !== undefined &&
        ts.isVariableDeclaration(owner) &&
        owner.initializer !== undefined &&
        propertyName !== undefined &&
        (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) &&
        expectedPath.at(-1) === propertyName.text
      ) {
        return derivesFromPath(owner.initializer, expectedPath.slice(0, -1), seen)
      }

      return false
    }

    return (
      ts.isPropertyAccessExpression(current) &&
      expectedPath.at(-1) === current.name.text &&
      derivesFromPath(current.expression, expectedPath.slice(0, -1), seen)
    )
  }
  const resolveObjectLiteral = (
    expression: ts.Expression | undefined,
    seen = new Set<ts.Node>(),
  ): ts.ObjectLiteralExpression | undefined => {
    if (expression === undefined) {
      return undefined
    }

    const current = unwrapExpression(expression)
    if (ts.isObjectLiteralExpression(current)) {
      return current
    }
    if (!ts.isIdentifier(current) || seen.has(current)) {
      return undefined
    }
    seen.add(current)

    return resolveObjectLiteral(
      precedingDeclaration(current.text, current.getStart(lifecycleSource))?.initializer,
      seen,
    )
  }
  const historyOwnerPath = storedValuePath(historyCalls[0])
  const routerOwnerPath = storedValuePath(routerCalls[0])
  const callsOnOwner = (ownerPath: readonly string[], member: string): ts.CallExpression[] =>
    ownerPath.length === 0
      ? []
      : calls.filter(
          (call) =>
            ts.isPropertyAccessExpression(call.expression) &&
            call.expression.name.text === member &&
            derivesFromPath(call.expression.expression, ownerPath),
        )

  if (
    historyFactoryImport === undefined ||
    routerFactoryImport === undefined ||
    historyCalls.length !== 1 ||
    routerCalls.length !== 1 ||
    historyOwnerPath.length === 0 ||
    routerOwnerPath.length === 0
  ) {
    violations.push('Router lifecycle must own exactly one Router and one Web History instance.')
  }

  const autoRoutesImports = lifecycleSource.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'vue-router/auto-routes',
  )
  const autoRoutesBindings = autoRoutesImports[0]?.importClause?.namedBindings
  const autoRoutesSpecifier =
    autoRoutesBindings !== undefined && ts.isNamedImports(autoRoutesBindings)
      ? autoRoutesBindings.elements[0]
      : undefined
  const autoRoutesBinding = autoRoutesSpecifier?.name.text
  if (
    autoRoutesImports.length !== 1 ||
    autoRoutesImports[0]?.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword ||
    autoRoutesBindings === undefined ||
    !ts.isNamedImports(autoRoutesBindings) ||
    autoRoutesBindings.elements.length !== 1 ||
    (autoRoutesSpecifier?.propertyName?.text ?? autoRoutesSpecifier?.name.text) !== 'routes'
  ) {
    violations.push(
      'Router lifecycle must consume the official generated runtime routes exactly once.',
    )
  }

  const lifecycleFactory = nodesOf(lifecycleSource, ts.isFunctionDeclaration).find(
    (declaration) => declaration.name?.text === 'createAndReadyRouter',
  )
  const lifecycleInput = lifecycleFactory?.parameters[0]?.name
  const lifecycleInputBinding =
    lifecycleInput !== undefined && ts.isIdentifier(lifecycleInput)
      ? lifecycleInput.text
      : undefined
  const historyCall = historyCalls[0]
  if (
    lifecycleInputBinding === undefined ||
    historyCall?.arguments.length !== 1 ||
    !derivesFromPath(historyCall.arguments[0], [
      lifecycleInputBinding,
      'configuration',
      'deploymentBase',
    ])
  ) {
    violations.push('Web History must consume the validated Runtime Configuration deployment base.')
  }

  const routerCall = routerCalls[0]
  const routerOptions = routerCall?.arguments[0]
  const routerOptionsObject = resolveObjectLiteral(routerOptions)
  const routerOptionKeys =
    routerOptionsObject !== undefined
      ? routerOptionsObject.properties.flatMap((property) => {
          if (ts.isShorthandPropertyAssignment(property)) {
            return [property.name.text]
          }

          if (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) {
            if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
              return [property.name.text]
            }
          }

          return []
        })
      : []
  const historyOption =
    routerOptionsObject === undefined
      ? undefined
      : objectPropertyValue(routerOptionsObject, 'history')
  const routesOption =
    routerOptionsObject === undefined
      ? undefined
      : objectPropertyValue(routerOptionsObject, 'routes')

  if (
    !exactSet(routerOptionKeys, ['history', 'routes', 'scrollBehavior']) ||
    !derivesFromPath(historyOption, historyOwnerPath) ||
    autoRoutesBinding === undefined ||
    !derivesFromPath(routesOption, [autoRoutesBinding])
  ) {
    violations.push(
      'The sole Router must consume the sole History, generated routes and scroll policy.',
    )
  }

  const installRouterCalls = calls.filter((call) => {
    const routerArgument = call.arguments[0]
    if (
      !ts.isPropertyAccessExpression(call.expression) ||
      call.expression.name.text !== 'use' ||
      call.arguments.length !== 1 ||
      routerArgument === undefined ||
      !derivesFromPath(routerArgument, routerOwnerPath)
    ) {
      return false
    }

    return derivesFromPath(call.expression.expression, [lifecycleInputBinding ?? '', 'application'])
  })
  const installRouterCall = installRouterCalls[0]
  const readyCalls = callsOnOwner(routerOwnerPath, 'isReady')
  const readyCall = readyCalls[0]
  if (
    installRouterCalls.length !== 1 ||
    readyCalls.length !== 1 ||
    installRouterCall === undefined ||
    readyCall === undefined ||
    installRouterCall.getStart(lifecycleSource) > readyCall.getStart(lifecycleSource) ||
    !ts.isAwaitExpression(readyCall.parent)
  ) {
    violations.push('Router installation and awaited readiness must complete before Kernel Mount.')
  }

  const lifecycleInputType = lifecycleFactory?.parameters[0]?.type
  const lifecycleInputFields =
    lifecycleInputType !== undefined && ts.isTypeLiteralNode(lifecycleInputType)
      ? Object.fromEntries(
          lifecycleInputType.members.flatMap((member) => {
            if (
              !ts.isPropertySignature(member) ||
              member.type === undefined ||
              member.questionToken !== undefined ||
              !member.modifiers?.some(
                (modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword,
              ) ||
              (!ts.isIdentifier(member.name) && !ts.isStringLiteral(member.name))
            ) {
              return []
            }

            return [[member.name.text, member.type.getText(lifecycleSource)]]
          }),
        )
      : {}

  if (
    !isDeepStrictEqual(lifecycleInputFields, {
      application: 'App',
      configuration: 'CoreRuntimeConfiguration',
      startupAttemptId: 'string',
    }) ||
    callCount('mount') !== 0 ||
    /\b(?:fetch|setTimeout|setInterval|addRoute|clearRoutes|experimental_createRouter)\b/u.test(
      lifecycle,
    ) ||
    lifecycle.includes('vue-router/experimental')
  ) {
    violations.push('Router lifecycle input, ownership or future-scope contract drifted.')
  }

  const focusCalls = calls.filter((call) => {
    const focusOptions = call.arguments[0]
    return (
      callMemberName(call) === 'focus' &&
      focusOptions !== undefined &&
      ts.isObjectLiteralExpression(focusOptions) &&
      objectPropertyValue(focusOptions, 'preventScroll')?.kind === ts.SyntaxKind.TrueKeyword
    )
  })
  const titleAssignments = nodesOf(lifecycleSource, ts.isBinaryExpression).filter(
    (expression) =>
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      expression.left.getText(lifecycleSource) === 'document.title',
  )
  const documentScrollOwnerReferences = nodesOf(
    lifecycleSource,
    ts.isPropertyAccessExpression,
  ).filter(
    (expression) =>
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === 'document' &&
      expression.name.text === 'scrollingElement',
  )

  if (
    focusCalls.length === 0 ||
    titleAssignments.length === 0 ||
    documentScrollOwnerReferences.length === 0
  ) {
    violations.push('Router title, native scroll-restoration or focus-transfer contract drifted.')
  }

  const hookMembers = new Set(['beforeEach', 'beforeResolve', 'afterEach', 'onError'])
  const hookCalls = [...hookMembers].flatMap((member) =>
    callsOnOwner(routerOwnerPath, member).map((call) => ({ member, call })),
  )
  const retainedHookRemovers = hookCalls.filter(({ call }) => storedValuePath(call).length !== 0)
  const historyDestroyCalls = callsOnOwner(historyOwnerPath, 'destroy')
  const lifecycleHandle = lifecycleSource.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'RouterLifecycleHandle',
  )
  const lifecycleHandlePropertyTypes = Object.fromEntries(
    lifecycleHandle?.members.flatMap((member) => {
      if (
        !ts.isPropertySignature(member) ||
        member.type === undefined ||
        member.questionToken !== undefined ||
        !member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ||
        (!ts.isIdentifier(member.name) && !ts.isStringLiteral(member.name))
      ) {
        return []
      }

      return [[member.name.text, member.type.getText(lifecycleSource).replaceAll(/\s+/gu, ' ')]]
    }) ?? [],
  )
  const disposeMethod = lifecycleHandle?.members.find(
    (member): member is ts.MethodSignature =>
      ts.isMethodSignature(member) &&
      (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) &&
      member.name.text === 'dispose',
  )
  const disposeParameterCount = disposeMethod?.parameters.length
  const disposeReturnType = disposeMethod?.type?.getText(lifecycleSource)

  if (
    [...hookMembers].some((member) => callsOnOwner(routerOwnerPath, member).length !== 1) ||
    hookCalls.length !== 4 ||
    retainedHookRemovers.length !== 4 ||
    historyDestroyCalls.length !== 1 ||
    lifecycleHandle === undefined ||
    !lifecycleHandle.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ||
    !isDeepStrictEqual(lifecycleHandlePropertyTypes['router'], 'Router') ||
    !isDeepStrictEqual(lifecycleHandlePropertyTypes['history'], 'RouterHistory') ||
    !isDeepStrictEqual(
      lifecycleHandlePropertyTypes['guardRemovers'],
      'readonly [() => void, () => void, () => void]',
    ) ||
    !isDeepStrictEqual(lifecycleHandlePropertyTypes['errorHandlerRemover'], '() => void') ||
    disposeParameterCount !== 0 ||
    disposeReturnType !== 'void'
  ) {
    violations.push('Router hook removal, History destruction or idempotent disposal drifted.')
  }

  for (const candidate of applicationSources) {
    if (resolve(candidate.path) === resolve(lifecyclePath)) {
      continue
    }

    const importsRouter = candidate.sourceFile.statements.some(
      (statement) =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        (statement.moduleSpecifier.text === 'vue-router' ||
          statement.moduleSpecifier.text.startsWith('vue-router/')),
    )
    const competingHooks = nodesOf(candidate.sourceFile, ts.isCallExpression).filter(
      (call) =>
        ts.isPropertyAccessExpression(call.expression) &&
        hookMembers.has(call.expression.name.text),
    )

    if (importsRouter && competingHooks.length !== 0) {
      violations.push(
        relative(rootDirectory, candidate.path) + ' competes for global Router hooks.',
      )
    }
  }

  for (const candidate of applicationSources) {
    const normalized = relative(rootDirectory, candidate.path).split('\\').join('/')
    const usesExperimental = candidate.source.includes('vue-router/experimental')
    const usesRuntimeRoutes = candidate.source.includes('vue-router/auto-routes')
    const routerImportAllowed =
      normalized === 'apps/web/src/App.vue' ||
      normalized === 'apps/web/src/app/console/ConsoleRouteFrame.vue' ||
      normalized === 'apps/web/src/route-map.d.ts' ||
      normalized.startsWith('apps/web/src/app/router/')

    if (usesExperimental && normalized !== 'apps/web/src/route-map.d.ts') {
      violations.push(normalized + ' contains a forbidden experimental Router import.')
    }

    if (
      usesRuntimeRoutes &&
      normalized !== 'apps/web/src/route-map.d.ts' &&
      normalized !== 'apps/web/src/app/router/router-lifecycle.ts'
    ) {
      violations.push(normalized + ' competes for official generated runtime routes.')
    }

    if (
      /(?:from\s+|import\s*\()(['"])vue-router(?:\/[^'"]+)?\1/u.test(candidate.source) &&
      !routerImportAllowed
    ) {
      violations.push(normalized + ' imports Vue Router outside the admitted Router boundary.')
    }
  }

  const routerAndPageSources = applicationSources.filter(
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
        relative(rootDirectory, candidate.path) + ' activates forbidden future scope.',
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

  return [
    ...registryViolations(),
    ...guardStageProgressViolations(),
    ...schemaViolations(),
    ...(await pageViolations()),
    ...(await generatedTypeViolations()),
    ...(await navigationContractViolations()),
    ...(await routerErrorContractViolations()),
    ...(await lifecycleViolations()),
    ...routeIdViolations,
  ]
}
