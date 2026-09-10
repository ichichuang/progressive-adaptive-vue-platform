import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import stylelint from 'stylelint'
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
  consoleNavigationRegistry,
  errorRouteRegistry,
  focusContractRegistry,
  routeLayoutCapabilityRegistry,
  routeMessageRegistry,
  routeRegistry,
  routeTitleRegistry,
  scrollOwnerRegistry,
  scrollRestorationPolicyRegistry,
  telemetryNameRegistry,
  workspaceIdentityPolicyRegistry,
} from '../../apps/web/src/app/router/route-registry'
import {
  routeParamsSchemaRegistry,
  routeQuerySchemaRegistry,
} from '../../apps/web/src/app/router/route-schemas'
import {
  applicationErrorRegistry,
  routerErrorRegistry,
} from '../../apps/web/src/app/router/router-error-registry'
import { routeTransitionBoundaryRegistry } from '../../apps/web/src/app/router/route-transition/route-transition-boundary-registry'
import { routeTransitionPresetRegistry } from '../../apps/web/src/app/router/route-transition/route-transition-preset-registry'
import { resolveRouteTransition } from '../../apps/web/src/app/router/route-transition/resolve-route-transition'
import {
  resolveRouteTransitionRule,
  routeTransitionRuleRegistry,
} from '../../apps/web/src/app/router/route-transition/route-transition-rule-registry'
import type {
  RouteTransitionDirection,
  RouteTransitionMotion,
  RouteTransitionPresetId,
  RouteTransitionResolverInput,
  RouteTransitionRule,
  RouteTransitionType,
} from '../../apps/web/src/app/router/route-transition/route-transition-types'

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
  routeTransitionFamilyId: 'route-family.error',
} as const
const expectedConsoleCommonMeta = {
  layout: 'workspace',
  layoutCapabilityId: 'route-layout.architecture-admin-console',
  auth: 'public',
  requiredPermissionIds: [],
  blockScrollOwnerId: 'architecture-console-content-block',
  inlineScrollOwnerId: 'architecture-console-content-inline',
  keepAlive: 'route-instance',
  dataPrefetch: 'none',
  unsavedChangesPolicy: 'none',
  focusContractId: 'route-focus.architecture-console-page-heading',
  scrollRestorationPolicyId: 'route-scroll.architecture-console-content-history',
  routeTransitionFamilyId: 'route-family.architecture-workspace',
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
    '查看当前十五阶段启动流程、Provider 与生命周期边界。',
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

interface RouteTransitionSourceSnapshot {
  readonly appSource: string
  readonly applicationSource: string
  readonly boundarySource: string
  readonly checkBundleSource: string
  readonly coordinatorSource: string
  readonly cssSource: string
  readonly engineeringManifestSource: string
  readonly frameSource: string
  readonly layersSource: string
  readonly lifecycleSource: string
  readonly lockSource: string
  readonly manifestSource: string
  readonly presetSource: string
  readonly projectConfigSource: string
  readonly registrySource: string
  readonly routeInputSource: string
  readonly resolverSource: string
  readonly ruleSource: string
  readonly typesSource: string
  readonly uiSource: string
}

interface RouteTransitionSourceProofResult {
  readonly id: string
  readonly passed: boolean
}

interface RouteTransitionSourceNegativeProbeResult {
  readonly id: string
  readonly expectedFailureCode: string
  readonly passed: boolean
}

export const expectedRouteTransitionSourceProofCount = 52
export const expectedRouteTransitionSourceNegativeProbeCount = 16
export const expectedRouterPresentationCommitNegativeProbeCount = 8
export const expectedRouteTransitionPresetSelectionNegativeProbeCount = 7
export const expectedRouteTransitionFullPaceNegativeProbeCount = 9
export const expectedRouteTransitionStylelintPolicyNegativeProbeCount = 3
export const expectedRouteTransitionWorkspaceDefaultNegativeProbeCount = 4

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
  const duplicateConditionPattern = /if\s*\(\s*to\s*===\s*from\s*\)\s*return false/u
  const duplicateCondition = duplicateConditionPattern.exec(snapshot.lifecycleSource)
  const duplicateLookupIndex = snapshot.lifecycleSource.indexOf('await applicationMountedPromise')

  if (
    duplicateCondition === null ||
    duplicateLookupIndex === -1 ||
    duplicateCondition.index > duplicateLookupIndex
  ) {
    violations.push('DUPLICATE_SCROLL_NOOP_ORDER')
  }
  if (duplicateCondition === null) {
    violations.push('DUPLICATED_NAVIGATION_ERROR_ROUTE')
  }

  const headingFocusCalls = [...snapshot.lifecycleSource.matchAll(/heading\.focus\s*\(/gu)]
  const guardedHeadingFocus =
    /if\s*\(\s*from\s*!==\s*START_LOCATION\s*&&\s*!samePage\s*&&\s*!locked\s*\)\s*heading\.focus\(\{ preventScroll: true \}\)/u.test(
      snapshot.lifecycleSource,
    )
  if (!/\bSTART_LOCATION\b/u.test(snapshot.lifecycleSource) || !guardedHeadingFocus) {
    violations.push('INITIAL_NAVIGATION_FOCUS_PRESERVATION')
  }
  if (headingFocusCalls.length !== 1 || !guardedHeadingFocus) {
    violations.push('SUBSEQUENT_NAVIGATION_HEADING_FOCUS')
  }

  const currentRouteGuard =
    /isCurrentDestination:\s*resolved !== undefined && sameRouteAddress\(router.currentRoute.value, resolved\)/u.exec(
      snapshot.frameSource,
    )
  const pushIndex = snapshot.frameSource.indexOf('routeTransitionCoordinator.navigate(')
  if (currentRouteGuard === null || pushIndex === -1 || currentRouteGuard.index > pushIndex) {
    violations.push('FRAME_CURRENT_ROUTE_NOOP')
  }

  // The frame consumes the typed operation without adding result-dependent side effects.
  const duplicatedNoop =
    /await routeTransitionCoordinator\.navigate\(item\.destination\)\s*\}/u.test(
      snapshot.frameSource,
    )
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
  const duplicateGuard = 'if (to === from) return false'
  const currentRouteGuard = 'sameRouteAddress(router.currentRoute.value, resolved)'
  const duplicatedResultGuard = 'await routeTransitionCoordinator.navigate(item.destination)'
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
          'from !== START_LOCATION && !samePage && !locked',
          '!samePage && !locked',
        ),
      }),
    ],
    [
      'subsequent-navigation-heading-focus-removed',
      'SUBSEQUENT_NAVIGATION_HEADING_FOCUS',
      (snapshot) => ({
        ...snapshot,
        lifecycleSource: snapshot.lifecycleSource.replace(
          'heading.focus({ preventScroll: true })',
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
            'await applicationMountedPromise',
            `await applicationMountedPromise\n      ${duplicateGuard}`,
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
          `const result = await routeTransitionCoordinator.navigate(item.destination)
  if (result.kind === 'duplicated') {
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

  if (
    !isDeepStrictEqual(workspaceIdentityPolicyRegistry, [
      { id: 'workspace-identity.route-single', kind: 'route-single' },
    ])
  )
    violations.push('Workspace policy must remain the single admitted route-single policy.')

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
      errorPolicy.length === 0 ||
      record.workspaceIdentityPolicyId !==
        (record.meta.layout === 'workspace' ? 'workspace-identity.route-single' : null)
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

  const workspaceComponentNames = new Set<string>()
  for (const sourcePath of expectedPageSources) {
    const source = await readFile(resolve(rootDirectory, sourcePath), 'utf8')
    const productPage = expectedProductPageSources.includes(sourcePath)
    if (productPage) {
      const options = [
        ...source.matchAll(/\bdefineOptions\(\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)/gu),
      ]
      const name = options[0]?.[1]
      if (
        options.length !== 1 ||
        name === undefined ||
        name.length === 0 ||
        workspaceComponentNames.has(name)
      )
        violations.push(
          `${sourcePath}: route-single KeepAlive requires an explicit unique page component name.`,
        )
      if (name !== undefined) workspaceComponentNames.add(name)
    }
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
  const sourcePath = resolve(routerDirectory, 'route-input.ts')
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
    duplicated: {
      kind: "'duplicated'",
      destination: 'RegisteredRouteDestination',
    },
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
      reason: "'cancelled-by-new-navigation' | 'access-invalidated'",
    },
    failure: {
      kind: "'failure'",
      navigationId: 'string',
      errorId: 'RouterErrorId',
      destination: "Readonly<{ name: (typeof errorRouteRegistry)[number]['routeName'] }>",
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

    const kind = fields['kind']?.match(/^'(duplicated|allow|redirect|cancel|failure)'$/u)?.[1]
    if (kind !== undefined) {
      actualVariants.set(kind, fields)
    }
  }

  if (
    resultDeclaration === undefined ||
    !resultDeclaration.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) ||
    variants.length !== 5 ||
    actualVariants.size !== 5 ||
    Object.entries(expectedVariants).some(
      ([kind, expected]) => !isDeepStrictEqual(actualVariants.get(kind), expected),
    )
  ) {
    return ['Typed Navigation Result Union diverged from its exact five variants.']
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
      'aborted-by-guard',
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
    const usesRuntimeRoutes = candidate.sourceFile.statements.some(
      (statement) =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === 'vue-router/auto-routes' &&
        statement.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword &&
        (statement.importClause?.name !== undefined ||
          statement.importClause?.namedBindings === undefined ||
          ts.isNamespaceImport(statement.importClause.namedBindings) ||
          statement.importClause.namedBindings.elements.some((element) => !element.isTypeOnly)),
    )
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

async function loadRouteTransitionSourceSnapshot(): Promise<RouteTransitionSourceSnapshot> {
  const applicationDirectory = resolve(rootDirectory, 'apps/web/src')
  const uiDirectory = resolve(rootDirectory, 'packages/ui/src')
  const applicationFiles = (await collectFiles(applicationDirectory)).filter((path) =>
    ['.css', '.ts', '.vue'].includes(extname(path)),
  )
  const uiFiles = (await collectFiles(uiDirectory)).filter((path) =>
    ['.css', '.ts', '.vue'].includes(extname(path)),
  )
  const [applicationSources, uiSources] = await Promise.all([
    Promise.all(applicationFiles.map((path) => readFile(path, 'utf8'))),
    Promise.all(uiFiles.map((path) => readFile(path, 'utf8'))),
  ])
  const transitionDirectory = resolve(routerDirectory, 'route-transition')
  const [
    appSource,
    boundarySource,
    checkBundleSource,
    coordinatorSource,
    cssSource,
    engineeringManifestSource,
    frameSource,
    layersSource,
    lifecycleSource,
    lockSource,
    rootManifestSource,
    webManifestSource,
    uiManifestSource,
    presetSource,
    projectConfigSource,
    registrySource,
    routeInputSource,
    resolverSource,
    ruleSource,
    typesSource,
  ] = await Promise.all([
    readFile(resolve(rootDirectory, 'apps/web/src/App.vue'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition-boundary-registry.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'scripts/verify/check-bundle.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition-coordinator.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition.css'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/generated/engineering-manifest.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/console/ConsoleRouteFrame.vue'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/styles/layers.css'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/router/router-lifecycle.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'pnpm-lock.yaml'), 'utf8'),
    readFile(resolve(rootDirectory, 'package.json'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/package.json'), 'utf8'),
    readFile(resolve(rootDirectory, 'packages/ui/package.json'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition-preset-registry.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'project.config.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/router/route-registry.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/router/route-input.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'resolve-route-transition.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition-rule-registry.ts'), 'utf8'),
    readFile(resolve(transitionDirectory, 'route-transition-types.ts'), 'utf8'),
  ])

  return Object.freeze({
    appSource,
    applicationSource: applicationSources.join('\n'),
    boundarySource,
    checkBundleSource,
    coordinatorSource,
    cssSource,
    engineeringManifestSource,
    frameSource,
    layersSource,
    lifecycleSource,
    lockSource,
    manifestSource: [rootManifestSource, webManifestSource, uiManifestSource].join('\n'),
    presetSource,
    projectConfigSource,
    registrySource,
    routeInputSource,
    resolverSource,
    ruleSource,
    typesSource,
    uiSource: uiSources.join('\n'),
  })
}

function sourceSection(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex === -1
    ? ''
    : source.slice(startIndex, endIndex === -1 ? source.length : endIndex)
}

function routeTransitionSourceProofResults(
  snapshot: RouteTransitionSourceSnapshot,
): readonly RouteTransitionSourceProofResult[] {
  const productRoutes = routeRegistry.filter(
    (route) => route.meta.routeTransitionFamilyId === 'route-family.architecture-workspace',
  )
  const errorRoutes = routeRegistry.filter(
    (route) => route.meta.routeTransitionFamilyId === 'route-family.error',
  )
  const presetIds = routeTransitionPresetRegistry.map((preset) => preset.id)
  const presetRecords: readonly {
    readonly id: string
    readonly isDefault: boolean
    readonly transitionType: string | null
    readonly visualRecipe: string | null
  }[] = routeTransitionPresetRegistry
  const ruleRecords: readonly unknown[] = routeTransitionRuleRegistry
  const boundaryRecords: readonly {
    readonly target: string
    readonly viewTransitionName: string
  }[] = routeTransitionBoundaryRegistry
  const nonePreset = presetRecords[0]
  const contentBoundary = boundaryRecords[0]
  const fullWorkspaceInput = {
    fromRouteName: 'console-overview',
    toRouteName: 'appearance-management',
    navigationKind: 'push',
    fromFamilyId: 'route-family.architecture-workspace',
    toFamilyId: 'route-family.architecture-workspace',
    motion: 'full',
    layoutProfile: 'wide',
    nativeApiAvailable: true,
    typedTransitionSupport: true,
    documentVisibility: 'visible',
    boundaryValidity: 'valid',
    activeTransitionState: 'idle',
  } as const
  const fullWorkspaceDecision = resolveRouteTransition(fullWorkspaceInput)
  const errorDecisions = [
    resolveRouteTransition({
      ...fullWorkspaceInput,
      toRouteName: 'error-route-not-found',
      toFamilyId: 'route-family.error',
    }),
    resolveRouteTransition({
      ...fullWorkspaceInput,
      fromRouteName: 'error-route-not-found',
      fromFamilyId: 'route-family.error',
    }),
    resolveRouteTransition({
      ...fullWorkspaceInput,
      fromRouteName: 'error-route-not-found',
      toRouteName: 'error-application-route-failure',
      fromFamilyId: 'route-family.error',
      toFamilyId: 'route-family.error',
    }),
  ]
  const navigationBypasses = [
    resolveRouteTransition({ ...fullWorkspaceInput, navigationKind: 'initial' }),
    resolveRouteTransition({ ...fullWorkspaceInput, navigationKind: 'replace' }),
    resolveRouteTransition({ ...fullWorkspaceInput, navigationKind: 'redirect' }),
    resolveRouteTransition({ ...fullWorkspaceInput, navigationKind: 'traverse-back' }),
    resolveRouteTransition({ ...fullWorkspaceInput, navigationKind: 'traverse-forward' }),
    resolveRouteTransition({ ...fullWorkspaceInput, navigationKind: 'recovery' }),
    resolveRouteTransition({ ...fullWorkspaceInput, navigationKind: 'error' }),
    resolveRouteTransition({ ...fullWorkspaceInput, motion: 'none' }),
    resolveRouteTransition({ ...fullWorkspaceInput, nativeApiAvailable: false }),
    resolveRouteTransition({ ...fullWorkspaceInput, documentVisibility: 'hidden' }),
  ]
  const expectedPresetIds = [
    'route-transition.none',
    'route-transition.content-crossfade',
    'route-transition.axis-inline-soft',
    'route-transition.drill-soft',
    'route-transition.sheet-soft',
  ]
  const errorRuleSource = sourceSection(
    snapshot.ruleSource,
    "ruleId: 'route-transition-rule.architecture-workspace-error'",
    'const ruleSpecificity',
  )
  const navigateSource = sourceSection(
    snapshot.coordinatorSource,
    'navigate(destination: RegisteredRouteDestination',
    'dispose() {',
  )
  const preparationSource = sourceSection(
    snapshot.coordinatorSource,
    'const performNavigation = async',
    'return Object.freeze({\n    navigate(',
  )
  const acceptanceSource = sourceSection(
    snapshot.lifecycleSource,
    'presentationCommitBroker.accept =',
    'const beforeEachRemover',
  )
  const operationSource = sourceSection(
    snapshot.lifecycleSource,
    'function beginOperation(',
    'function ownsNavigation(',
  )
  const nativeNavigationSource = sourceSection(
    snapshot.lifecycleSource,
    'function issueNavigation(',
    'presentationCommitBroker.accept =',
  )
  const motionObservationSource = sourceSection(
    snapshot.coordinatorSource,
    'const stopMotionObservation = watch',
    'const requestIsCurrent',
  )
  const updateSource = sourceSection(
    snapshot.coordinatorSource,
    'const update = async (): Promise<void>',
    'let transition: ViewTransition',
  )
  const presentationCommitBrokerSource = sourceSection(
    snapshot.lifecycleSource,
    'type RouterPresentationCommitOutcome',
    'export interface RouterLifecycleHandle',
  )
  const scrollBehaviorSource = sourceSection(
    snapshot.lifecycleSource,
    'async scrollBehavior(to, from, savedPosition)',
    '  routerPresentationCommitBrokers.set(router, presentationCommitBroker)',
  )
  const beforeEachSource = sourceSection(
    snapshot.lifecycleSource,
    'const beforeEachRemover = router.beforeEach',
    'const beforeResolveRemover = router.beforeResolve',
  )
  const afterEachSource = sourceSection(
    snapshot.lifecycleSource,
    'const afterEachRemover = router.afterEach',
    'const errorHandlerRemover = router.onError',
  )
  const beforeResolveSource = sourceSection(
    snapshot.lifecycleSource,
    'const beforeResolveRemover',
    'const afterEachRemover',
  )
  const regionCommitSource = sourceSection(
    scrollBehaviorSource,
    'const context = regionContext(to',
    'completeActiveGuardStages(',
  )
  const regionWriteSource = sourceSection(
    snapshot.lifecycleSource,
    'function writeRegionPosition(',
    'export async function createAndReadyRouter(',
  )
  const errorHandlerSource = sourceSection(
    snapshot.lifecycleSource,
    'const errorHandlerRemover = router.onError',
    'const dispose = (): void',
  )
  const lifecycleDisposeSource = sourceSection(
    snapshot.lifecycleSource,
    'const dispose = (): void',
    'const handle: RouterLifecycleHandle',
  )
  const reducedCss = sourceSection(
    snapshot.cssSource,
    "html:root[data-motion='reduced']",
    "html:root[data-motion='none']",
  )
  const noneCss = sourceSection(
    snapshot.cssSource,
    "html:root[data-motion='none']",
    '@keyframes pavp-route-content-crossfade-old',
  )
  const crossfadeCss = sourceSection(
    snapshot.cssSource,
    '@keyframes pavp-route-content-crossfade-old',
    '@keyframes pavp-route-axis-inline-old-toward-left',
  )

  return Object.freeze([
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_01_ROUTE_META_16',
      passed:
        count(snapshot.registrySource, /readonly routeTransitionFamilyId:/gu) === 1 &&
        snapshot.routeInputSource.includes('!routeMetaMatches(location.meta, record.meta)') &&
        snapshot.routeInputSource.includes(
          'Object.keys(actual).length === Object.keys(expected).length',
        ) &&
        routeRegistry.every((route) => Object.keys(route.meta).length === 16),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_02_PRODUCT_FAMILIES',
      passed:
        productRoutes.length === 10 &&
        snapshot.registrySource.includes(
          "routeTransitionFamilyId: 'route-family.architecture-workspace'",
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_03_ERROR_FAMILIES',
      passed:
        errorRoutes.length === 7 &&
        snapshot.registrySource.includes("routeTransitionFamilyId: 'route-family.error'"),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_04_PRESET_IDS',
      passed:
        isDeepStrictEqual(presetIds, expectedPresetIds) &&
        new Set(presetIds).size === expectedPresetIds.length,
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_05_VISUAL_RECIPES',
      passed:
        nonePreset?.transitionType === null &&
        nonePreset.visualRecipe === null &&
        [
          'pavp-route-content-crossfade-old',
          'pavp-route-axis-inline-old-toward-left',
          'pavp-route-drill-forward-old',
          'pavp-route-sheet-forward-old',
        ].every((recipe) => snapshot.cssSource.includes(`@keyframes ${recipe}`)) &&
        !snapshot.cssSource.includes('@keyframes route-transition-none'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_06_DEFAULT_PRESET',
      passed:
        presetRecords.filter((preset) => preset.isDefault).length === 1 &&
        presetRecords.find((preset) => preset.isDefault)?.id ===
          'route-transition.content-crossfade' &&
        snapshot.presetSource.includes('isDefault: true'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_07_PRODUCT_AXIS',
      passed:
        fullWorkspaceDecision.kind === 'native-element' &&
        fullWorkspaceDecision.presetId === 'route-transition.axis-inline-soft' &&
        fullWorkspaceDecision.transitionType === 'pavp-route-axis-inline-soft' &&
        fullWorkspaceDecision.direction === 'forward',
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_08_ERROR_EDGES_NONE',
      passed:
        errorDecisions.every(
          (decision) => decision.kind === 'bypass' && decision.reason === 'error-family-edge',
        ) && count(errorRuleSource, /PresetId: 'route-transition\.none'/gu) === 6,
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_09_RULE_PRECEDENCE_AND_AMBIGUITY',
      passed:
        ruleRecords.length === 5 &&
        count(snapshot.ruleSource, /ruleId: 'route-transition-rule\.architecture-workspace'/gu) ===
          1 &&
        ['exact-route-pair', 'ordered-routes', 'route-family', 'global-default'].every((kind) =>
          snapshot.typesSource.includes(`'${kind}'`),
        ) &&
        snapshot.ruleSource.includes('right.priority - left.priority') &&
        snapshot.ruleSource.includes('right.specificity - left.specificity') &&
        snapshot.ruleSource.includes("return Object.freeze({ status: 'ambiguous' })"),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_10_BOUNDARY_CARDINALITY',
      passed: boundaryRecords.length === 1,
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_11_BOUNDARY_IDENTITY',
      passed:
        contentBoundary?.target === '[data-scroll-owner="architecture-console-content"]' &&
        contentBoundary.viewTransitionName === 'root',
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_12_COORDINATOR_INSTANCE',
      passed:
        count(snapshot.frameSource, /createRouteTransitionCoordinator\s*\(\s*\{/gu) === 1 &&
        count(snapshot.frameSource, /routeTransitionCoordinator\.navigate\s*\(/gu) === 3 &&
        snapshot.frameSource.includes('routeTransitionCoordinator.dispose()'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_13_NATIVE_CALL_OWNER',
      passed:
        count(snapshot.applicationSource, /\.startViewTransition\s*\(/gu) === 1 &&
        count(snapshot.coordinatorSource, /\.startViewTransition\s*\(/gu) === 1 &&
        !/document(?:\.documentElement)?\.startViewTransition|document\.documentElement/.test(
          snapshot.coordinatorSource,
        ) &&
        /typeof \w+\.startViewTransition === 'function'/u.test(snapshot.coordinatorSource),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_14_CURRENT_ROUTE_BEFORE_COORDINATOR',
      passed:
        snapshot.frameSource.includes('isCurrentDestination:') &&
        snapshot.frameSource.includes('sameRouteAddress(router.currentRoute.value, resolved)') &&
        snapshot.frameSource.includes('resolveRegisteredDestination(router, item.destination)') &&
        snapshot.frameSource.includes('routeTransitionCoordinator.navigate(item.destination)') &&
        snapshot.routeInputSource.includes(
          'stringifyQuery(left.query) === stringifyQuery(right.query)',
        ) &&
        snapshot.routeInputSource.includes('left.hash === right.hash') &&
        snapshot.routeInputSource.includes('paramValuesEqual(leftParams[key], rightParams[key])'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_15_BYPASS_MATRIX',
      passed:
        navigationBypasses.every((decision) => decision.kind === 'bypass') &&
        snapshot.resolverSource.includes(
          "if (input.motion === 'none') {\n    return bypass('motion-none')",
        ) &&
        [
          'replace-navigation',
          'redirect-navigation',
          'history-traversal',
          'recovery-navigation',
        ].every((reason) => snapshot.resolverSource.includes(`'${reason}'`)),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_16_PRELOAD_BEFORE_SNAPSHOT',
      passed:
        preparationSource.includes('await loadRouteLocation(resolvedTarget)') &&
        preparationSource.indexOf('await loadRouteLocation(resolvedTarget)') <
          preparationSource.indexOf('runVisualTransition(') &&
        snapshot.coordinatorSource.includes('instanceof HTMLElement') &&
        /!\w+\.isConnected/u.test(snapshot.coordinatorSource) &&
        /\w+ !== \w+\.element/u.test(
          preparationSource.slice(preparationSource.indexOf('await loadRouteLocation')),
        ) &&
        count(preparationSource, /readBoundaryState\(\)/gu) === 2,
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_17_SINGLE_ROUTER_PUSH_IN_UPDATE',
      passed:
        !/input\.router\.(?:push|replace)\s*\(/u.test(snapshot.coordinatorSource) &&
        count(snapshot.lifecycleSource, /router\.(?:push|replace)\s*\(/gu) === 2 &&
        nativeNavigationSource.includes(
          "request.kind === 'replace' ? router.replace(target.fullPath) : router.push(target.fullPath)",
        ) &&
        /if \(!navigationStarted && !disposed && operation === request\) \{\s*navigationStarted = true\s*issueNavigation\(request, target\)/u.test(
          acceptanceSource,
        ) &&
        count(updateSource, /await navigateDirectly\(request\)/gu) === 1 &&
        snapshot.coordinatorSource.includes('(updatePromise ??= update())'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_18_ROUTER_RESULT_AWAITED',
      passed:
        updateSource.includes('const result = await navigateDirectly(request)') &&
        acceptanceSource.includes('return request.completion') &&
        nativeNavigationSource.includes('finishNativeFailure(request, failure, target)'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_19_ACTIVE_INTERRUPTION',
      passed:
        navigateSource.includes(
          'const request = acceptRouterNavigation(input.router, destination, options)',
        ) &&
        navigateSource.indexOf('acceptRouterNavigation(') <
          navigateSource.indexOf('skipVisualTransition(activeTransition)') &&
        navigateSource.includes('skipVisualTransition(activeTransition)') &&
        navigateSource.indexOf('acceptRouterNavigation(') <
          navigateSource.indexOf('performNavigation(request, options)') &&
        acceptanceSource.includes(
          'if (resolved !== undefined && sameRouteAddress(router.currentRoute.value, resolved))',
        ) &&
        acceptanceSource.indexOf('sameRouteAddress(router.currentRoute.value, resolved)') <
          acceptanceSource.indexOf('const request = beginOperation(') &&
        operationSource.includes('operation?.finish({') &&
        operationSource.includes("reason: 'cancelled-by-new-navigation'") &&
        operationSource.indexOf('operation?.finish({') <
          operationSource.indexOf('operation = next') &&
        !/navigationEpoch|routerNavigationSequence/u.test(snapshot.coordinatorSource),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_20_STALE_PRELOAD_EPOCH',
      passed:
        count(
          preparationSource,
          /if \(!requestIsCurrent\(request\)\) return request\.completion/gu,
        ) === 2 &&
        snapshot.coordinatorSource.includes('!disposed && request.isCurrent()') &&
        acceptanceSource.includes('isCurrent: () => !disposed && operation === request') &&
        beforeEachSource.includes('request !== operation') &&
        /!disposed &&[\s\S]*?navigation\.operation === operation &&\s*operation\.navigation === to/u.test(
          sourceSection(
            snapshot.lifecycleSource,
            'function ownsNavigation(',
            'function currentLocationMatches(',
          ),
        ) &&
        /if \(!ownsNavigation\(to, navigation\)\) return false[\s\S]*await localization\.prepareScope[\s\S]*if \(!ownsNavigation\(to, navigation\)[\s\S]*if \(!ownsNavigation\(to, navigation\)\) return false\s*captureSource\(from\)/u.test(
          beforeResolveSource,
        ) &&
        afterEachSource.includes(
          'if (!ownsNavigation(to, navigation) || !currentLocationMatches(to)) return',
        ) &&
        scrollBehaviorSource.includes('!entryIsCurrent(entry)') &&
        navigateSource.includes(
          'Promise.race([request.completion, performNavigation(request, options)])',
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_21_NATIVE_PROMISE_HANDLING',
      passed:
        snapshot.coordinatorSource.includes('transition.ready.catch') &&
        snapshot.coordinatorSource.includes('await transition.updateCallbackDone') &&
        snapshot.coordinatorSource.includes('transition.finished.then'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_22_REAL_FAILURES_OBSERVABLE',
      passed:
        updateSource.includes('catch (error)') &&
        updateSource.includes('throw error') &&
        preparationSource.includes('return navigateDirectly(request)') &&
        errorHandlerSource.includes("const recovering = request.result?.kind === 'failure'") &&
        errorHandlerSource.includes("? 'route-redirect-loop'") &&
        /request\.result = failure[\s\S]*if \(recovering \|\| to\.name === failure\.destination\.name\) \{\s*request\.finish\(failure\)[\s\S]*issueNavigation\(request, target\)/u.test(
          errorHandlerSource,
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_23_MOTION_CHANGE_SKIPS_VISUAL',
      passed:
        snapshot.coordinatorSource.includes(
          '() => input.appearance.snapshot.value.motion,\n    () => {\n      skipVisualTransition(activeTransition)',
        ) &&
        !/router\.|cancelBeforeStart|beginOperation/u.test(motionObservationSource) &&
        motionObservationSource.includes('clearDirection(directionOwner)') &&
        motionObservationSource.includes("flush: 'sync'"),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_24_NO_SECOND_HISTORY_OR_NAVIGATION_OWNER',
      passed: !/\bhistory\.|\.replace\s*\(|\.go\s*\(|\.back\s*\(|\.forward\s*\(/u.test(
        snapshot.coordinatorSource,
      ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_25_NO_LAYOUT_MEASUREMENT_OBSERVER_OR_LISTENER',
      passed:
        !/getBoundingClientRect|offset(?:Width|Height)|client(?:Width|Height)|ResizeObserver|MutationObserver|addEventListener/u.test(
          snapshot.coordinatorSource,
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_26_CONTENT_SCOPED_ROOT_ONLY',
      passed:
        [...snapshot.cssSource.matchAll(/([^{}]+)\{[^{}]*\}/gu)]
          .flatMap((match) => (match[1] ?? '').split(','))
          .filter((selector) => selector.includes('::view-transition'))
          .every((selector) =>
            selector.includes("[data-scroll-owner='architecture-console-content']"),
          ) && !snapshot.cssSource.includes(':root {'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_27_CONTENT_BOUNDARY_NAMED',
      passed:
        snapshot.cssSource.includes(
          "[data-scroll-owner='architecture-console-content'] {\n    view-transition-name: root;",
        ) &&
        snapshot.boundarySource.includes(
          'target: \'[data-scroll-owner="architecture-console-content"]\'',
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_28_PERSISTENT_REGIONS_UNNAMED',
      passed:
        count(snapshot.cssSource, /view-transition-name:/gu) === 1 &&
        !/pavp-admin-shell__(?:header|sidebar)|pavp-overlay-root|navigation-selection-lens[\s\S]{0,80}view-transition-name/u.test(
          snapshot.cssSource,
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_29_FULL_DEFAULT_OPACITY_ONLY',
      passed:
        count(crossfadeCss, /opacity: [01];/gu) === 4 &&
        count(crossfadeCss, /transform: none;/gu) === 4 &&
        !/scale\(|--ui-space-|rotate|perspective/u.test(crossfadeCss),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_30_SPATIAL_RECIPE_BOUNDS',
      passed:
        [
          'pavp-route-axis-inline-new-from-right',
          'pavp-route-axis-inline-new-from-left',
          'transform: scale(0.985)',
          'transform: scale(1.015)',
          'pavp-route-sheet-forward-new',
          'pavp-route-sheet-reverse-old',
          'translate: 0 var(--ui-space-content-gap)',
          'transform-origin: center top',
        ].every((marker) => snapshot.cssSource.includes(marker)) &&
        !/\d+(?:\.\d+)?(?:px|rem)\b/u.test(snapshot.cssSource),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_31_REDUCED_NON_SPATIAL',
      passed:
        count(reducedCss, /animation-name: pavp-route-content-crossfade-(?:old|new);/gu) === 2 &&
        count(reducedCss, /transform: none;/gu) === 2 &&
        count(reducedCss, /translate: none;/gu) === 2 &&
        !/scale\(|--ui-space-|axis-inline|drill-soft|sheet-soft/u.test(reducedCss),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_32_NONE_IMMEDIATE',
      passed:
        noneCss.includes('animation: none;') &&
        noneCss.includes('transition: none;') &&
        noneCss.includes('visibility: hidden;\n    opacity: 0;') &&
        noneCss.includes('visibility: visible;\n    opacity: 1;'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_33_LIVE_ROUTE_STABLE',
      passed:
        snapshot.cssSource.includes(
          '.pavp-route-content {\n    visibility: visible;\n    opacity: 1;\n    transform: none;\n    translate: none;',
        ) && snapshot.layersSource.includes('.pavp-route-content {\n  opacity: 1;'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_34_RUNTIME_005_PRESERVED',
      passed:
        count(snapshot.appSource, /<RouterView\b/gu) === 1 &&
        count(snapshot.appSource, /class="pavp-route-content"/gu) === 1 &&
        count(snapshot.appSource, /<KeepAlive\b/gu) === 1 &&
        !/:key=|<Transition\b|<TransitionGroup\b|AnimatePresence|<KeepAlive\b|<Suspense\b|v-if=|v-show=/u.test(
          snapshot.appSource
            .replace(/<KeepAlive\s+:include="[\w$]+\.includedComponentNames"\s*>/gu, '')
            .replace(/(<component\b[^>]*):key="[\w$]+\.active\?\.instance"/gu, '$1'),
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_35_DEPENDENCY_AND_BUDGET_CLOSURE',
      passed:
        !/ssgoi|route-transition/u.test(snapshot.manifestSource) &&
        snapshot.manifestSource.includes('"motion-v": "catalog:"') &&
        snapshot.manifestSource.includes('"@vueuse/core": "catalog:"') &&
        snapshot.lockSource.includes('motion-v@2.4.0.patch') &&
        snapshot.projectConfigSource.includes(
          'adminNavigationMotionFeatureJavaScriptGzipBytes: 48 * 1024',
        ) &&
        snapshot.projectConfigSource.includes('initialCssGzipBytes: 40 * 1024') &&
        snapshot.projectConfigSource.includes('initialJavaScriptGzipBytes: 256 * 1024') &&
        snapshot.projectConfigSource.includes('lazyRouteJavaScriptGzipBytes: 120 * 1024') &&
        snapshot.engineeringManifestSource.includes(
          "{ id: 'admin-navigation-motion-feature-javascript-gzip', limit: 49152",
        ) &&
        !snapshot.uiSource.includes('route-transition'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_36_ADMITTED_DYNAMIC_ROOTS',
      passed:
        snapshot.checkBundleSource.includes('const expectedLazyRouteCount = 17') &&
        snapshot.checkBundleSource.includes('const expectedMotionFeatureDynamicRootCount = 1') &&
        snapshot.checkBundleSource.includes('const expectedDynamicRootCount = 27') &&
        !/\bimport\s*\(/u.test(
          [
            snapshot.boundarySource,
            snapshot.coordinatorSource,
            snapshot.presetSource,
            snapshot.resolverSource,
            snapshot.ruleSource,
            snapshot.typesSource,
          ].join('\n'),
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_37_ROUTER_PRESENTATION_COMMIT_BOUNDARY',
      passed:
        snapshot.lifecycleSource.includes(
          'const routerPresentationCommitBrokers = new WeakMap<Router, RouterPresentationCommitBroker>()',
        ) &&
        count(updateSource, /reserveRouterPresentationCommit\s*\(/gu) === 1 &&
        /const reservation = reserveRouterPresentationCommit\(\{[\s\S]*navigationId: request\.navigationId,[\s\S]*?\}\)[\s\S]*?try\s*\{\s*const result = await navigateDirectly\(request\)/u.test(
          updateSource,
        ) &&
        updateSource.includes('await reservation.completion') &&
        updateSource.indexOf('await navigateDirectly(request)') <
          updateSource.indexOf('await reservation.completion') &&
        !/\bnextTick\b/u.test(snapshot.coordinatorSource),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_38_EXACT_BINDING_AND_FOCUS_COMMIT',
      passed:
        presentationCommitBrokerSource.includes('readonly expectedRouteName: RouteName') &&
        presentationCommitBrokerSource.includes('readonly expectedFullPath: string') &&
        presentationCommitBrokerSource.includes(
          'readonly completion: Promise<RouterPresentationCommitOutcome>',
        ) &&
        presentationCommitBrokerSource.includes('routeName === reservation.expectedRouteName') &&
        presentationCommitBrokerSource.includes('reservation.navigationId === navigationId') &&
        presentationCommitBrokerSource.includes(
          'navigation.fullPath === reservation.expectedFullPath',
        ) &&
        presentationCommitBrokerSource.includes('if (selected === undefined) {\n    return') &&
        beforeEachSource.indexOf('navigationAttempts.set(to') <
          beforeEachSource.lastIndexOf(
            'bindRouterPresentationCommit(presentationCommitBroker, to, routeName, navigationId)',
          ) &&
        scrollBehaviorSource.indexOf('document.title = getRoutePresentation(') <
          scrollBehaviorSource.indexOf('heading.focus({ preventScroll: true })') &&
        scrollBehaviorSource.indexOf('heading.focus({ preventScroll: true })') <
          scrollBehaviorSource.indexOf(
            'resolveBoundRouterPresentationCommit(presentationCommitBroker, to)',
          ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_39_FINAL_REGION_SCROLL_COMMIT',
      passed:
        regionWriteSource.includes("controller.scrollTo({ ...position, behavior: 'instant' })") &&
        regionWriteSource.includes('!state.ready') &&
        regionWriteSource.includes('Number.isFinite(position.left)') &&
        regionWriteSource.includes('Number.isFinite(position.top)') &&
        regionCommitSource.includes('writeRegionPosition(controller, record)') &&
        regionCommitSource.includes('writeRegionFragment(controller, hash)') &&
        !regionCommitSource.includes('resolveBoundRouterPresentationCommit(') &&
        scrollBehaviorSource.lastIndexOf('writeRegionPosition(') <
          scrollBehaviorSource.lastIndexOf(
            'resolveBoundRouterPresentationCommit(presentationCommitBroker, to)',
          ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_40_COORDINATOR_READ_ONLY_PRESENTATION_WAIT',
      passed:
        !/\.focus\s*\(|scroll(?:IntoView|To)|scrollTop|scrollLeft|scrollingElement|document\.title\s*=/u.test(
          snapshot.coordinatorSource,
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_41_FAILURE_CANCELLATION_AND_DISPOSAL_SETTLEMENT',
      passed:
        /result\.kind !== 'allow'[^{}]*\) \{\s*reservation\.cancel\(\)/u.test(updateSource) &&
        /catch \(error\) \{\s*reservation\.cancel\(\)/u.test(updateSource) &&
        afterEachSource.includes(
          'cancelBoundRouterPresentationCommit(presentationCommitBroker, to)',
        ) &&
        errorHandlerSource.includes(
          'rejectBoundRouterPresentationCommit(presentationCommitBroker, to, source)',
        ) &&
        lifecycleDisposeSource.includes(
          'disposeRouterPresentationCommitBroker(router, presentationCommitBroker)',
        ) &&
        presentationCommitBrokerSource.includes('reservation.resolve(outcome)') &&
        presentationCommitBrokerSource.includes('reservation.reject(source)') &&
        count(presentationCommitBrokerSource, /broker\.reservations\.delete\(/gu) === 2 &&
        motionObservationSource.includes('cancelPresentation()') &&
        sourceSection(snapshot.coordinatorSource, 'dispose() {', '\n  })').includes(
          'cancelPresentation()',
        ) &&
        snapshot.coordinatorSource.includes('activeReservation?.cancel()') &&
        navigateSource.includes('cancelPresentation()') &&
        operationSource.includes(
          "settleRouterPresentationCommit(presentationCommitBroker, reservation, 'cancelled')",
        ) &&
        lifecycleDisposeSource.includes('operation?.finish({') &&
        snapshot.coordinatorSource.includes('pendingNavigation?.cancelBeforeStart()'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_42_REDIRECT_SKIPS_OWNING_VISUAL',
      passed:
        /currentRoute\.name !== resolvedTarget\.name[\s\S]*?currentRoute\.fullPath !== resolvedTarget\.fullPath[\s\S]*?currentRoute\.redirectedFrom !== undefined[\s\S]*?skipVisualTransition\(visual\.transition\)[\s\S]*?return/u.test(
          updateSource,
        ),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_43_DISTINCT_RAPID_NAVIGATION_IDENTITIES',
      passed:
        presentationCommitBrokerSource.includes("identity: Symbol('router-presentation-commit')") &&
        presentationCommitBrokerSource.includes('sequence: ++broker.reservationSequence') &&
        presentationCommitBrokerSource.includes('reservation.sequence > selected.sequence') &&
        presentationCommitBrokerSource.includes(
          "settleRouterPresentationCommit(broker, reservation, 'cancelled')",
        ) &&
        presentationCommitBrokerSource.includes(
          'broker.navigationReservations.set(navigation, selected)',
        ) &&
        presentationCommitBrokerSource.includes('navigationId: input.navigationId') &&
        presentationCommitBrokerSource.includes(
          'broker.currentOperation?.()?.navigationId !== input.navigationId',
        ) &&
        operationSource.includes('navigationId: crypto.randomUUID()'),
    }),
    Object.freeze({
      id: 'ROUTE_TRANSITION_SOURCE_44_PRESENTATION_COMMIT_SCOPE_CLOSURE',
      passed:
        !/requestAnimationFrame|requestIdleCallback|setTimeout|setInterval/u.test(
          presentationCommitBrokerSource + snapshot.coordinatorSource,
        ) &&
        snapshot.checkBundleSource.includes('const expectedLazyRouteCount = 17') &&
        snapshot.checkBundleSource.includes('const expectedMotionFeatureDynamicRootCount = 1') &&
        snapshot.projectConfigSource.includes(
          'adminNavigationMotionFeatureJavaScriptGzipBytes: 48 * 1024',
        ) &&
        snapshot.projectConfigSource.includes('initialCssGzipBytes: 40 * 1024') &&
        snapshot.projectConfigSource.includes('initialJavaScriptGzipBytes: 256 * 1024') &&
        !/ssgoi|route-transition/u.test(snapshot.manifestSource),
    }),
  ])
}

function runRouteTransitionSourceNegativeProbes(
  baseline: RouteTransitionSourceSnapshot,
): readonly RouteTransitionSourceNegativeProbeResult[] {
  const probes: readonly [
    string,
    string,
    (snapshot: RouteTransitionSourceSnapshot) => RouteTransitionSourceSnapshot,
  ][] = [
    [
      'route-transition-document-api-restored',
      'ROUTE_TRANSITION_SOURCE_13_NATIVE_CALL_OWNER',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          'element.startViewTransition({',
          'document.startViewTransition({',
        ),
      }),
    ],
    [
      'route-transition-replaced-boundary-not-checked',
      'ROUTE_TRANSITION_SOURCE_16_PRELOAD_BEFORE_SNAPSHOT',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          'element !== boundaryState.element',
          'false',
        ),
      }),
    ],
    [
      'route-transition-motion-retains-stale-callback',
      'ROUTE_TRANSITION_SOURCE_23_MOTION_CHANGE_SKIPS_VISUAL',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          '      clearDirection(directionOwner)\n    },',
          '      // Direction projection retained incorrectly.\n    },',
        ),
      }),
    ],
    [
      'route-transition-document-pseudo-tree-restored',
      'ROUTE_TRANSITION_SOURCE_26_CONTENT_SCOPED_ROOT_ONLY',
      (snapshot) => ({
        ...snapshot,
        cssSource: snapshot.cssSource.replace(
          "[data-scroll-owner='architecture-console-content']::view-transition {",
          '::view-transition {',
        ),
      }),
    ],
    [
      'route-transition-family-meta-removal',
      'ROUTE_TRANSITION_SOURCE_01_ROUTE_META_16',
      (snapshot) => ({
        ...snapshot,
        registrySource: snapshot.registrySource.replace(
          'readonly routeTransitionFamilyId: RouteTransitionFamilyId',
          'readonly driftedTransitionFamilyId: RouteTransitionFamilyId',
        ),
      }),
    ],
    [
      'route-transition-preset-default-drift',
      'ROUTE_TRANSITION_SOURCE_06_DEFAULT_PRESET',
      (snapshot) => ({
        ...snapshot,
        presetSource: snapshot.presetSource.replace('isDefault: true', 'isDefault: false'),
      }),
    ],
    [
      'route-transition-ambiguous-equal-rule',
      'ROUTE_TRANSITION_SOURCE_09_RULE_PRECEDENCE_AND_AMBIGUITY',
      (snapshot) => {
        const duplicateRule = sourceSection(
          snapshot.ruleSource,
          "  Object.freeze({\n    ruleId: 'route-transition-rule.architecture-workspace'",
          "  Object.freeze({\n    ruleId: 'route-transition-rule.architecture-workspace-error'",
        )
        return {
          ...snapshot,
          ruleSource: snapshot.ruleSource.replace(duplicateRule, duplicateRule + duplicateRule),
        }
      },
    ],
    [
      'route-transition-error-route-animation',
      'ROUTE_TRANSITION_SOURCE_08_ERROR_EDGES_NONE',
      (snapshot) => {
        const errorRule = sourceSection(
          snapshot.ruleSource,
          "ruleId: 'route-transition-rule.architecture-workspace-error'",
          "ruleId: 'route-transition-rule.error'",
        )
        return {
          ...snapshot,
          ruleSource: snapshot.ruleSource.replace(
            errorRule,
            errorRule.replace(
              "forwardPresetId: 'route-transition.none'",
              "forwardPresetId: 'route-transition.content-crossfade'",
            ),
          ),
        }
      },
    ],
    [
      'route-transition-motion-none-starts-transition',
      'ROUTE_TRANSITION_SOURCE_15_BYPASS_MATRIX',
      (snapshot) => ({
        ...snapshot,
        resolverSource: snapshot.resolverSource.replace(
          "  if (input.motion === 'none') {\n    return bypass('motion-none')\n  }\n",
          '',
        ),
      }),
    ],
    [
      'route-transition-snapshot-before-preload',
      'ROUTE_TRANSITION_SOURCE_16_PRELOAD_BEFORE_SNAPSHOT',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          'await loadRouteLocation(resolvedTarget)',
          'await runVisualTransition(request, resolvedTarget, decision, boundaryState.element)\n      await loadRouteLocation(resolvedTarget)',
        ),
      }),
    ],
    [
      'route-transition-second-router-push',
      'ROUTE_TRANSITION_SOURCE_17_SINGLE_ROUTER_PUSH_IN_UPDATE',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          'const result = await navigateDirectly(request)',
          'const result = await navigateDirectly(request)\n      void input.router.push(resolvedTarget.fullPath)',
        ),
      }),
    ],
    [
      'route-transition-active-interruption-removed',
      'ROUTE_TRANSITION_SOURCE_19_ACTIVE_INTERRUPTION',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          '      skipVisualTransition(activeTransition)\n      clearDirection(directionOwner)',
          '      clearDirection(directionOwner)',
        ),
      }),
    ],
    [
      'route-transition-duplicate-name-owner',
      'ROUTE_TRANSITION_SOURCE_28_PERSISTENT_REGIONS_UNNAMED',
      (snapshot) => ({
        ...snapshot,
        cssSource: `${snapshot.cssSource}\n.pavp-admin-shell__header { view-transition-name: root; }`,
      }),
    ],
    [
      'route-transition-reduced-spatial-motion',
      'ROUTE_TRANSITION_SOURCE_31_REDUCED_NON_SPATIAL',
      (snapshot) => ({
        ...snapshot,
        cssSource: snapshot.cssSource.replace(
          'animation-name: pavp-route-content-crossfade-old;\n    transform: none;\n    translate: none;',
          'animation-name: pavp-route-content-crossfade-old;\n    transform: none;\n    translate: var(--ui-space-content-gap) 0;',
        ),
      }),
    ],
    [
      'route-transition-keyed-live-route-animation',
      'ROUTE_TRANSITION_SOURCE_34_RUNTIME_005_PRESERVED',
      (snapshot) => ({
        ...snapshot,
        appSource: snapshot.appSource.replace('<RouterView ', '<RouterView :key="route.name" '),
      }),
    ],
    [
      'route-transition-layout-observer-authority-drift',
      'ROUTE_TRANSITION_SOURCE_25_NO_LAYOUT_MEASUREMENT_OBSERVER_OR_LISTENER',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: `${snapshot.coordinatorSource}\nvoid ResizeObserver`,
      }),
    ],
  ]
  const baselineProofs = routeTransitionSourceProofResults(baseline)

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutate]) => {
      const mutated = mutate(baseline)
      const failures = routeTransitionSourceProofResults(mutated)
        .filter((proof) => !proof.passed)
        .map((proof) => proof.id)
      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          baselineProofs.every((proof) => proof.passed) &&
          failures.length === 1 &&
          failures[0] === expectedFailureCode,
      })
    }),
  )
}

function runRouterPresentationCommitNegativeProbes(
  baseline: RouteTransitionSourceSnapshot,
): readonly RouteTransitionSourceNegativeProbeResult[] {
  const probes: readonly [
    string,
    string,
    (snapshot: RouteTransitionSourceSnapshot) => RouteTransitionSourceSnapshot,
  ][] = [
    [
      'router-presentation-commit-next-tick-only-wait',
      'ROUTE_TRANSITION_SOURCE_37_ROUTER_PRESENTATION_COMMIT_BOUNDARY',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          'await reservation.completion',
          'await nextTick()',
        ),
      }),
    ],
    [
      'router-presentation-commit-resolves-before-h1-focus',
      'ROUTE_TRANSITION_SOURCE_38_EXACT_BINDING_AND_FOCUS_COMMIT',
      (snapshot) => ({
        ...snapshot,
        lifecycleSource: snapshot.lifecycleSource.replace(
          'if (from !== START_LOCATION && !samePage && !locked) heading.focus({ preventScroll: true })',
          'resolveBoundRouterPresentationCommit(presentationCommitBroker, to)\n        if (from !== START_LOCATION && !samePage && !locked) heading.focus({ preventScroll: true })',
        ),
      }),
    ],
    [
      'router-presentation-commit-resolves-before-final-scroll-write',
      'ROUTE_TRANSITION_SOURCE_39_FINAL_REGION_SCROLL_COMMIT',
      (snapshot) => ({
        ...snapshot,
        lifecycleSource: snapshot.lifecycleSource.replace(
          'const context = regionContext(to, navigation, owner)',
          'const context = regionContext(to, navigation, owner)\n            resolveBoundRouterPresentationCommit(presentationCommitBroker, to)',
        ),
      }),
    ],
    [
      'router-presentation-commit-coordinator-takes-focus-and-scroll-ownership',
      'ROUTE_TRANSITION_SOURCE_40_COORDINATOR_READ_ONLY_PRESENTATION_WAIT',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: `${snapshot.coordinatorSource}\ndocument.title = 'drift'; document.body.focus(); document.body.scrollTop = 0`,
      }),
    ],
    [
      'router-presentation-commit-cancelled-reservation-left-unsettled',
      'ROUTE_TRANSITION_SOURCE_41_FAILURE_CANCELLATION_AND_DISPOSAL_SETTLEMENT',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          '        ) {\n          reservation.cancel()',
          '        ) {',
        ),
      }),
    ],
    [
      'router-presentation-commit-redirect-keeps-visual-animation',
      'ROUTE_TRANSITION_SOURCE_42_REDIRECT_SKIPS_OWNING_VISUAL',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: snapshot.coordinatorSource.replace(
          '          currentRoute.redirectedFrom !== undefined\n        ) {\n          reservation.cancel()\n          skipVisualTransition(visual.transition)\n          return',
          '          currentRoute.redirectedFrom !== undefined\n        ) {\n          reservation.cancel()\n          return',
        ),
      }),
    ],
    [
      'router-presentation-commit-reuses-reservation-identity',
      'ROUTE_TRANSITION_SOURCE_43_DISTINCT_RAPID_NAVIGATION_IDENTITIES',
      (snapshot) => ({
        ...snapshot,
        lifecycleSource: snapshot.lifecycleSource.replace(
          "identity: Symbol('router-presentation-commit')",
          'identity: sharedRouterPresentationCommitIdentity',
        ),
      }),
    ],
    [
      'router-presentation-commit-adds-timer-raf-or-scope-drift',
      'ROUTE_TRANSITION_SOURCE_44_PRESENTATION_COMMIT_SCOPE_CLOSURE',
      (snapshot) => ({
        ...snapshot,
        coordinatorSource: `${snapshot.coordinatorSource}\nrequestAnimationFrame(() => undefined)`,
      }),
    ],
  ]
  const baselineProofs = routeTransitionSourceProofResults(baseline)

  return Object.freeze(
    probes.map(([id, expectedFailureCode, mutate]) => {
      const mutated = mutate(baseline)
      const failures = routeTransitionSourceProofResults(mutated)
        .filter((proof) => !proof.passed)
        .map((proof) => proof.id)
      return Object.freeze({
        id,
        expectedFailureCode,
        passed:
          baselineProofs.every((proof) => proof.passed) &&
          failures.length === 1 &&
          failures[0] === expectedFailureCode,
      })
    }),
  )
}

interface RouteTransitionPresetSelectionSnapshot {
  readonly coordinatorSource: string
  readonly cssSource: string
  readonly neutralRules: readonly RouteTransitionRule[]
  readonly directedRules: readonly RouteTransitionRule[]
}

const routeTransitionSelectionInput = {
  fromRouteName: 'console-overview',
  toRouteName: 'appearance-management',
  navigationKind: 'push',
  fromFamilyId: 'route-family.architecture-workspace',
  toFamilyId: 'route-family.architecture-workspace',
  motion: 'full',
  layoutProfile: 'wide',
  nativeApiAvailable: true,
  typedTransitionSupport: true,
  documentVisibility: 'visible',
  boundaryValidity: 'valid',
  activeTransitionState: 'idle',
} as const satisfies RouteTransitionResolverInput

const routeTransitionSpatialPresets = [
  ['route-transition.axis-inline-soft', 'pavp-route-axis-inline-soft'],
  ['route-transition.drill-soft', 'pavp-route-drill-soft'],
  ['route-transition.sheet-soft', 'pavp-route-sheet-soft'],
] as const

function routeTransitionPresetSelectionSnapshot(
  snapshot: RouteTransitionSourceSnapshot,
): RouteTransitionPresetSelectionSnapshot {
  return {
    coordinatorSource: snapshot.coordinatorSource,
    cssSource: snapshot.cssSource,
    neutralRules: routeTransitionRuleRegistry.filter(
      (rule) => rule.kind === 'global-default' || rule.kind === 'route-family',
    ),
    directedRules: routeTransitionSpatialPresets.map<RouteTransitionRule>(([presetId]) => ({
      ruleId: `route-transition-rule.checker-${presetId}`,
      priority: 100,
      forwardPresetId: presetId,
      reversePresetId: presetId,
      fallbackPresetId: 'route-transition.content-crossfade',
      ...(presetId === 'route-transition.axis-inline-soft'
        ? {
            kind: 'ordered-routes',
            routeNames: ['console-overview', 'appearance-management'],
          }
        : {
            kind: 'exact-route-pair',
            fromRouteName: 'console-overview',
            toRouteName: 'appearance-management',
          }),
    })),
  }
}

function routeTransitionPresetProjectionValid(
  snapshot: RouteTransitionPresetSelectionSnapshot,
): boolean {
  const neutralRules = routeTransitionRuleRegistry.filter(
    (rule) => rule.kind === 'global-default' || rule.kind === 'route-family',
  )
  const matchesNativeDecision = (
    input: RouteTransitionResolverInput,
    rules: readonly RouteTransitionRule[],
    presetId: RouteTransitionPresetId,
    transitionType: RouteTransitionType,
    direction: RouteTransitionDirection,
  ): boolean =>
    isDeepStrictEqual(resolveRouteTransition(input, rules), {
      kind: 'native-element',
      presetId,
      boundaryId: 'route-transition-boundary.architecture-console-content',
      motionProjection: input.motion,
      direction,
      transitionType,
    })

  return (
    matchesNativeDecision(
      routeTransitionSelectionInput,
      neutralRules,
      'route-transition.content-crossfade',
      'pavp-route-content-crossfade',
      'neutral',
    ) &&
    snapshot.directedRules.length === routeTransitionSpatialPresets.length &&
    snapshot.directedRules.every((rule, index) => {
      const expected = routeTransitionSpatialPresets[index]
      if (expected === undefined) {
        return false
      }
      const rules = [...neutralRules, rule]
      return (['forward', 'reverse'] as const).every((direction) => {
        const input = {
          ...routeTransitionSelectionInput,
          ...(direction === 'reverse'
            ? {
                fromRouteName: routeTransitionSelectionInput.toRouteName,
                toRouteName: routeTransitionSelectionInput.fromRouteName,
              }
            : {}),
        }
        return (
          matchesNativeDecision(input, rules, expected[0], expected[1], direction) &&
          [
            { ...input, motion: 'reduced' as const },
            { ...input, typedTransitionSupport: false },
          ].every((projectionInput) =>
            matchesNativeDecision(
              projectionInput,
              rules,
              'route-transition.content-crossfade',
              'pavp-route-content-crossfade',
              'neutral',
            ),
          ) &&
          isDeepStrictEqual(resolveRouteTransition({ ...input, motion: 'none' }, rules), {
            kind: 'bypass',
            reason: 'motion-none',
          })
        )
      })
    })
  )
}

function routeTransitionNeutralRuleSemanticsValid(
  snapshot: RouteTransitionPresetSelectionSnapshot,
): boolean {
  const before = JSON.stringify(snapshot.neutralRules)
  const rejectsDirectionMapping = (rules: readonly RouteTransitionRule[]): boolean =>
    resolveRouteTransitionRule(routeTransitionSelectionInput, rules).status === 'invalid-rule' &&
    [
      routeTransitionSelectionInput,
      { ...routeTransitionSelectionInput, motion: 'reduced' as const },
      { ...routeTransitionSelectionInput, typedTransitionSupport: false },
    ].every((input) =>
      isDeepStrictEqual(resolveRouteTransition(input, rules), {
        kind: 'bypass',
        reason: 'invalid-rule',
      }),
    )
  const neutralInputs = [
    routeTransitionSelectionInput,
    {
      ...routeTransitionSelectionInput,
      toRouteName: 'error-route-not-found',
      toFamilyId: 'route-family.error',
    },
    {
      ...routeTransitionSelectionInput,
      fromRouteName: 'error-route-not-found',
      fromFamilyId: 'route-family.error',
    },
  ] as const
  const neutralDirectionsValid = neutralInputs.every((input) => {
    const resolution = resolveRouteTransitionRule(input, snapshot.neutralRules)
    return resolution.status === 'matched' && resolution.match.direction === 'neutral'
  })
  const globalDirection = resolveRouteTransitionRule(
    routeTransitionSelectionInput,
    snapshot.neutralRules.filter((rule) => rule.kind === 'global-default'),
  )
  const neutralFieldsRejectSpatial = snapshot.neutralRules.every((rule, index) =>
    routeTransitionSpatialPresets.every(([presetId]) =>
      (['forwardPresetId', 'reversePresetId', 'fallbackPresetId'] as const).every((field) =>
        rejectsDirectionMapping(
          snapshot.neutralRules.map((candidate, candidateIndex) =>
            candidateIndex === index ? { ...rule, [field]: presetId } : candidate,
          ),
        ),
      ),
    ),
  )
  const directedFallbacksRejectSpatial = snapshot.directedRules.every((rule) =>
    routeTransitionSpatialPresets.every(([fallbackPresetId]) =>
      rejectsDirectionMapping([...routeTransitionRuleRegistry, { ...rule, fallbackPresetId }]),
    ),
  )

  return (
    neutralDirectionsValid &&
    globalDirection.status === 'matched' &&
    globalDirection.match.direction === 'neutral' &&
    neutralFieldsRejectSpatial &&
    directedFallbacksRejectSpatial &&
    JSON.stringify(snapshot.neutralRules) === before
  )
}

function routeTransitionTypedRecipeCascadeValid(
  snapshot: RouteTransitionPresetSelectionSnapshot,
): boolean {
  const supportArguments: string[] = []
  const coordinator = ts.createSourceFile(
    'route-transition-coordinator.ts',
    snapshot.coordinatorSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(coordinator) === 'CSS' &&
      node.expression.name.text === 'supports' &&
      node.arguments.length === 1 &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      supportArguments.push(node.arguments[0].text.trim())
    }
    ts.forEachChild(node, visit)
  }
  visit(coordinator)
  const typedProbe =
    /^selector\(\s*(?:html(?::root)?|:root)?:active-view-transition-type\(\s*(pavp-route-[a-z-]+)\s*\)\s*\)$/u.exec(
      supportArguments[0] ?? '',
    )
  if (
    supportArguments.length !== 1 ||
    typedProbe === null ||
    !routeTransitionPresetRegistry.some((preset) => preset.transitionType === typedProbe[1])
  ) {
    return false
  }

  // This inspects only the admitted old/new recipe selectors, not general CSS syntax.
  const recipeSource = snapshot.cssSource
  if (/!important|:where\(/iu.test(recipeSource)) {
    return false
  }
  const recipeRules = [...recipeSource.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].flatMap((block) =>
    (block[1] ?? '').split(',').flatMap((rawSelector) => {
      const selector = rawSelector.trim().replaceAll(/\(\s+/gu, '(').replaceAll(/\s+\)/gu, ')')
      const target = /::view-transition-(old|new)\(root\)$/u.exec(selector)
      if (target === null) {
        return []
      }
      const animationName = (block[2] ?? '')
        .split(';')
        .flatMap((declaration) => {
          const animation = /^\s*animation(?:-name)?\s*:\s*(.+?)\s*$/u.exec(declaration)
          return animation?.[1] === undefined ? [] : [animation[1]]
        })
        .at(-1)
      const qualifiers = selector.slice(0, target.index)
      const motion = [...qualifiers.matchAll(/\[data-motion=['"](full|reduced|none)['"]\]/gu)]
      const direction =
        /\[data-pavp-route-transition-direction=['"](forward|reverse|neutral)['"]\]/u.exec(
          qualifiers,
        )?.[1]
      const writingDirection = /:dir\((ltr|rtl)\)/u.exec(qualifiers)?.[1]
      const transitionType = /:active-view-transition-type\((pavp-route-[a-z-]+)\)/u.exec(
        qualifiers,
      )?.[1]
      const scope = "[data-scroll-owner='architecture-console-content']"
      const [ancestor, subject] = qualifiers.split(scope)
      const scopedSubjectValid =
        subject !== undefined &&
        !/\s|:root|:dir|data-motion/u.test(subject) &&
        (ancestor === '' ||
          /^html(?::root)?(?::dir\((?:ltr|rtl)\)|\[data-motion=['"](?:reduced|none)['"]\])*\s+$/u.test(
            ancestor ?? '',
          ))
      const remainder = qualifiers
        .replace(scope, '')
        .replaceAll(/\[(?:data-motion|data-pavp-route-transition-direction)=['"][a-z]+['"]\]/gu, '')
        .replaceAll(
          /:root|:dir\((?:ltr|rtl)\)|:active-view-transition-type\(pavp-route-[a-z-]+\)/gu,
          '',
        )
        .trim()
      return [
        {
          animationName,
          target: target[1],
          motion: motion.map((match) => match[1]),
          direction,
          writingDirection,
          transitionType,
          classSpecificity: count(qualifiers, /\[|:(?:root|dir\(|active-view-transition-type\()/gu),
          typeSpecificity: remainder === 'html' ? 2 : 1,
          valid: scopedSubjectValid && (remainder === '' || remainder === 'html'),
        },
      ]
    }),
  )
  if (recipeRules.some((rule) => !rule.valid)) {
    return false
  }

  const recipes = [
    ['route-transition.content-crossfade', 'pavp-route-content-crossfade'],
    ['route-transition.content-crossfade', undefined],
    ...routeTransitionSpatialPresets,
  ] as const
  return recipes.every(([presetId, transitionType]) =>
    (presetId === 'route-transition.content-crossfade'
      ? (['neutral', 'forward', 'reverse'] as const)
      : (['forward', 'reverse'] as const)
    ).every((direction) =>
      (['ltr', 'rtl'] as const).every((writingDirection) =>
        (['full', 'reduced', 'none'] as const satisfies readonly RouteTransitionMotion[]).every(
          (motion) =>
            (['old', 'new'] as const).every((target) => {
              const matchingRules = recipeRules
                .map((rule, order) => ({ ...rule, order }))
                .filter(
                  (rule) =>
                    rule.animationName !== undefined &&
                    rule.target === target &&
                    rule.motion.every((requiredMotion) => requiredMotion === motion) &&
                    (rule.direction === undefined || rule.direction === direction) &&
                    (rule.writingDirection === undefined ||
                      rule.writingDirection === writingDirection) &&
                    (rule.transitionType === undefined || rule.transitionType === transitionType),
                )
                .sort(
                  (left, right) =>
                    right.classSpecificity - left.classSpecificity ||
                    right.typeSpecificity - left.typeSpecificity ||
                    right.order - left.order,
                )
              let expected = `pavp-route-content-crossfade-${target}`
              if (motion === 'none') {
                expected = 'none'
              } else if (motion === 'full' && presetId === 'route-transition.axis-inline-soft') {
                const towardLeft = (direction === 'forward') === (writingDirection === 'ltr')
                expected =
                  target === 'old'
                    ? `pavp-route-axis-inline-old-toward-${towardLeft ? 'left' : 'right'}`
                    : `pavp-route-axis-inline-new-from-${towardLeft ? 'right' : 'left'}`
              } else if (motion === 'full' && presetId !== 'route-transition.content-crossfade') {
                expected = `pavp-route-${presetId === 'route-transition.drill-soft' ? 'drill' : 'sheet'}-${direction}-${target}`
              }
              return matchingRules[0]?.animationName === expected
            }),
        ),
      ),
    ),
  )
}

function routeTransitionPresetSelectionProofResults(
  snapshot: RouteTransitionPresetSelectionSnapshot,
): readonly RouteTransitionSourceProofResult[] {
  return [
    {
      id: 'ROUTE_TRANSITION_SOURCE_45_PRESET_PROJECTION',
      passed: routeTransitionPresetProjectionValid(snapshot),
    },
    {
      id: 'ROUTE_TRANSITION_SOURCE_46_NEUTRAL_RULE_SEMANTICS',
      passed: routeTransitionNeutralRuleSemanticsValid(snapshot),
    },
    {
      id: 'ROUTE_TRANSITION_SOURCE_47_TYPED_RECIPE_CASCADE',
      passed: routeTransitionTypedRecipeCascadeValid(snapshot),
    },
  ]
}

function runRouteTransitionPresetSelectionNegativeProbes(
  baseline: RouteTransitionPresetSelectionSnapshot,
): readonly RouteTransitionSourceNegativeProbeResult[] {
  const probes: readonly [string, string, RouteTransitionPresetSelectionSnapshot][] = [
    [
      'neutral-family-spatial-preset',
      'ROUTE_TRANSITION_SOURCE_46_NEUTRAL_RULE_SEMANTICS',
      {
        ...baseline,
        neutralRules: baseline.neutralRules.map((rule) =>
          rule.kind === 'route-family' && rule.fromFamilyId === rule.toFamilyId
            ? { ...rule, fallbackPresetId: 'route-transition.sheet-soft' }
            : rule,
        ),
      },
    ],
    [
      'ordered-routes-spatial-neutral-fallback',
      'ROUTE_TRANSITION_SOURCE_45_PRESET_PROJECTION',
      {
        ...baseline,
        directedRules: baseline.directedRules.map((rule) =>
          rule.kind === 'ordered-routes'
            ? { ...rule, fallbackPresetId: 'route-transition.axis-inline-soft' }
            : rule,
        ),
      },
    ],
    [
      'typed-recipe-invalid-descendant-selector',
      'ROUTE_TRANSITION_SOURCE_47_TYPED_RECIPE_CASCADE',
      {
        ...baseline,
        cssSource: baseline.cssSource.replaceAll(
          "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction=",
          "[data-scroll-owner='architecture-console-content'] [data-pavp-route-transition-direction=",
        ),
      },
    ],
    [
      'typed-sheet-recipe-falls-back-to-generic-crossfade',
      'ROUTE_TRANSITION_SOURCE_47_TYPED_RECIPE_CASCADE',
      {
        ...baseline,
        cssSource: `${baseline.cssSource}\n@layer app {
          [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(pavp-route-sheet-soft)::view-transition-new(root) {
            animation-name: pavp-route-content-crossfade-new;
          }
        }`,
      },
    ],
    [
      'typed-recipe-neutral-direction',
      'ROUTE_TRANSITION_SOURCE_47_TYPED_RECIPE_CASCADE',
      {
        ...baseline,
        cssSource: baseline.cssSource.replaceAll(
          "data-pavp-route-transition-direction='forward'",
          "data-pavp-route-transition-direction='neutral'",
        ),
      },
    ],
    [
      'typed-recipe-defeats-reduced',
      'ROUTE_TRANSITION_SOURCE_47_TYPED_RECIPE_CASCADE',
      {
        ...baseline,
        cssSource: baseline.cssSource.replaceAll(
          ':active-view-transition-type(',
          ':root:root:active-view-transition-type(',
        ),
      },
    ],
    [
      'typed-feature-probe-invalid-selector',
      'ROUTE_TRANSITION_SOURCE_47_TYPED_RECIPE_CASCADE',
      {
        ...baseline,
        coordinatorSource: baseline.coordinatorSource.replaceAll(
          ':active-view-transition-type(',
          ':active-view-transition-type (',
        ),
      },
    ],
  ]
  const baselineValid = routeTransitionPresetSelectionProofResults(baseline).every(
    (proof) => proof.passed,
  )
  return probes.map(([id, expectedFailureCode, mutated]) => {
    const failures = routeTransitionPresetSelectionProofResults(mutated)
      .filter((proof) => !proof.passed)
      .map((proof) => proof.id)
    return {
      id,
      expectedFailureCode,
      passed:
        baselineValid &&
        !isDeepStrictEqual(mutated, baseline) &&
        isDeepStrictEqual(failures, [expectedFailureCode]),
    }
  })
}

function routeTransitionFullPaceProofResults(
  snapshot: RouteTransitionSourceSnapshot,
): readonly RouteTransitionSourceProofResult[] {
  const fullDuration = 'calc(var(--ui-motion-duration) + var(--ui-motion-duration) / 2)'
  const scope = "[data-scroll-owner='architecture-console-content']"
  const target = 'root'
  const group = `${scope}::view-transition-group(${target})`
  const pair = `${scope}::view-transition-image-pair(${target})`
  const images = `${scope}::view-transition-old(${target}),${scope}::view-transition-new(${target})`
  const reducedGroup = `html:root[data-motion='reduced'][data-motion='reduced']${group}`
  const expectedDurations = new Map([
    [group, fullDuration],
    [pair, 'inherit'],
    [images, 'inherit'],
    [reducedGroup, 'var(--ui-motion-duration)'],
  ])
  const durationOwners: string[] = []
  let validTiming = true
  let sharedImageTiming = false
  let disabledGroupGeometry = false
  for (const match of snapshot.cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selector = (match[1] ?? '').trim().replace(/\s+/gu, '')
    const declarations = (match[2] ?? '').split(';').map((entry) => entry.trim())
    for (const declaration of declarations) {
      const [property, ...valueParts] = declaration.split(':')
      const value = valueParts.join(':').trim().replace(/\s+/gu, ' ')
      if (property === 'animation-duration') {
        durationOwners.push(selector)
        validTiming &&= value === expectedDurations.get(selector)
      }
      if (property === 'animation') validTiming &&= value === 'none'
      if (property === 'animation-delay') validTiming &&= selector === images && value === 'initial'
      if (property === 'animation-timing-function') {
        validTiming &&= selector === images && value === 'var(--ui-motion-easing)'
      }
    }
    if (selector === group) {
      disabledGroupGeometry =
        declarations.includes('animation: none') &&
        declarations.indexOf('animation: none') <
          declarations.indexOf(`animation-duration: ${fullDuration}`)
    }
    if (selector === images) {
      sharedImageTiming = [
        'animation-duration: inherit',
        'animation-timing-function: var(--ui-motion-easing)',
        'animation-delay: initial',
        'animation-fill-mode: both',
      ].every((declaration) => declarations.includes(declaration))
    }
  }
  const nonRouteSource = [
    snapshot.applicationSource.replace(snapshot.cssSource, ''),
    snapshot.uiSource,
  ].join('\n')
  return [
    {
      id: 'ROUTE_TRANSITION_SOURCE_48_SHARED_FULL_PACE',
      passed:
        validTiming &&
        sharedImageTiming &&
        disabledGroupGeometry &&
        isDeepStrictEqual(durationOwners.sort(), [...expectedDurations.keys()].sort()) &&
        !/!important|transition\s*:\s*all|\b\d+(?:\.\d+)?m?s\b|--[\w-]+\s*:/u.test(
          snapshot.cssSource,
        ),
    },
    {
      id: 'ROUTE_TRANSITION_SOURCE_49_PACE_SCOPE',
      passed:
        !/calc\(\s*var\(--ui-motion-duration\)\s*(?:\+|\*\s*1\.5)/u.test(nonRouteSource) &&
        !/route[_-]?(?:transition[_-]?)?(?:pace|speed|duration)/iu.test(nonRouteSource),
    },
  ]
}

function runRouteTransitionFullPaceNegativeProbes(
  baseline: RouteTransitionSourceSnapshot,
): readonly RouteTransitionSourceNegativeProbeResult[] {
  const fullDuration = 'calc(var(--ui-motion-duration) + var(--ui-motion-duration) / 2)'
  const timingCode = 'ROUTE_TRANSITION_SOURCE_48_SHARED_FULL_PACE'
  const scopeCode = 'ROUTE_TRANSITION_SOURCE_49_PACE_SCOPE'
  const probes: readonly (readonly [string, string, RouteTransitionSourceSnapshot])[] = [
    [
      'full-pace-reverts-to-interaction-duration',
      timingCode,
      {
        ...baseline,
        cssSource: baseline.cssSource.replace(fullDuration, 'var(--ui-motion-duration)'),
      },
    ],
    [
      'old-new-pace-diverges',
      timingCode,
      {
        ...baseline,
        cssSource: `${baseline.cssSource}\n[data-scroll-owner='architecture-console-content']::view-transition-old(root) { animation-duration: var(--ui-motion-duration); }`,
      },
    ],
    [
      'pace-slows-global-header-menu',
      scopeCode,
      {
        ...baseline,
        uiSource: `${baseline.uiSource}\n.pavp-admin-shell__header, .n-menu { transition-duration: ${fullDuration}; }`,
      },
    ],
    [
      'reduced-pace-slows-to-full',
      timingCode,
      {
        ...baseline,
        cssSource: baseline.cssSource.replace(
          'animation-duration: var(--ui-motion-duration);',
          `animation-duration: ${fullDuration};`,
        ),
      },
    ],
    [
      'new-user-route-pace-preference',
      scopeCode,
      {
        ...baseline,
        applicationSource: `${baseline.applicationSource}\nconst appearance = { routeTransitionPace: 'slow' };`,
      },
    ],
    [
      'raw-route-duration',
      timingCode,
      {
        ...baseline,
        cssSource: baseline.cssSource.replace(fullDuration, '300ms'),
      },
    ],
    [
      'pace-changes-approved-dependency',
      'ROUTE_TRANSITION_SOURCE_35_DEPENDENCY_AND_BUDGET_CLOSURE',
      {
        ...baseline,
        manifestSource: baseline.manifestSource.replace(
          '"motion-v": "catalog:"',
          '"motion-v": "unapproved"',
        ),
      },
    ],
    [
      'pace-raises-route-budget',
      'ROUTE_TRANSITION_SOURCE_35_DEPENDENCY_AND_BUDGET_CLOSURE',
      {
        ...baseline,
        projectConfigSource: baseline.projectConfigSource.replace(
          'lazyRouteJavaScriptGzipBytes: 120 * 1024',
          'lazyRouteJavaScriptGzipBytes: 121 * 1024',
        ),
      },
    ],
    [
      'pace-adds-dynamic-root',
      'ROUTE_TRANSITION_SOURCE_36_ADMITTED_DYNAMIC_ROOTS',
      {
        ...baseline,
        typesSource: `${baseline.typesSource}\nvoid import('./route-pace');`,
      },
    ],
  ]
  const results = (
    snapshot: RouteTransitionSourceSnapshot,
  ): readonly RouteTransitionSourceProofResult[] => [
    ...routeTransitionSourceProofResults(snapshot),
    ...routeTransitionFullPaceProofResults({
      ...snapshot,
      applicationSource: snapshot.applicationSource.replace(baseline.cssSource, snapshot.cssSource),
    }),
  ]
  const baselineValid = results(baseline).every((proof) => proof.passed)
  return probes.map(([id, expectedFailureCode, mutated]) => ({
    id,
    expectedFailureCode,
    passed:
      baselineValid &&
      !isDeepStrictEqual(mutated, baseline) &&
      isDeepStrictEqual(
        results(mutated)
          .filter((proof) => !proof.passed)
          .map((proof) => proof.id),
        [expectedFailureCode],
      ),
  }))
}

interface RouteTransitionStylelintPolicySnapshot {
  readonly globalDurationPatterns: readonly string[]
  readonly scopeFiles: readonly string[]
  readonly routeConfig: stylelint.Config
  readonly otherConfigs: readonly stylelint.Config[]
}

async function routeTransitionStylelintPolicyGovernance(cssSource: string): Promise<{
  readonly proofs: readonly RouteTransitionSourceProofResult[]
  readonly probes: readonly RouteTransitionSourceNegativeProbeResult[]
}> {
  const routePath = 'apps/web/src/app/router/route-transition/route-transition.css'
  const otherPaths = [
    'apps/web/src/app/styles/layers.css',
    'apps/web/src/app/router/route-transition/other.css',
    'packages/ui/src/other.css',
  ]
  const source = await readFile(resolve(rootDirectory, 'stylelint.config.mjs'), 'utf8')
  const parsed = ts.createSourceFile(
    'stylelint.config.mjs',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  )
  let globalDurationPatterns: readonly string[] = []
  let scopeFiles: readonly string[] = []
  const strings = (node: ts.Node): readonly string[] =>
    ts.isArrayLiteralExpression(node)
      ? node.elements.map((entry) => (ts.isStringLiteral(entry) ? entry.text : ''))
      : []
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'approvedDurationPatterns' &&
      node.initializer !== undefined
    ) {
      globalDurationPatterns = strings(node.initializer)
    }
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(parsed) === 'files' &&
      strings(node.initializer).includes(routePath)
    ) {
      scopeFiles = [...scopeFiles, ...strings(node.initializer)]
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  const configs = await Promise.all(
    [routePath, ...otherPaths].map(async (path) => {
      const config = await stylelint.resolveConfig(resolve(rootDirectory, path), {
        configFile: resolve(rootDirectory, 'stylelint.config.mjs'),
        cwd: rootDirectory,
      })
      if (config === undefined) throw new Error('Route Transition Stylelint policy is unavailable.')
      return config
    }),
  )
  const routeConfig = configs[0]
  if (routeConfig === undefined) throw new Error('Route Transition Stylelint scope is unavailable.')
  const baseline: RouteTransitionStylelintPolicySnapshot = {
    globalDurationPatterns,
    scopeFiles,
    routeConfig,
    otherConfigs: configs.slice(1),
  }
  const full = 'calc(var(--ui-motion-duration) + var(--ui-motion-duration) / 2)'
  const half = 'calc(var(--ui-motion-duration) / 2)'
  const rule = 'declaration-property-value-disallowed-list'
  const check = async (
    config: stylelint.Config,
    path: string,
    property: string,
    value: string,
    rejected: boolean,
  ): Promise<boolean> => {
    const result = await stylelint.lint({
      code: `::view-transition-group(root) { ${property}: ${value}; }`,
      codeFilename: resolve(rootDirectory, path),
      config,
      cwd: rootDirectory,
    })
    const warnings = result.results.flatMap((entry) => entry.warnings)
    return (
      result.results.length === 1 &&
      result.results[0]?.ignored !== true &&
      (rejected
        ? result.errored &&
          warnings.length > 0 &&
          warnings.every((warning) => warning.rule === rule && warning.severity === 'error')
        : !result.errored && warnings.length === 0)
    )
  }
  const proofResults = async (
    snapshot: RouteTransitionStylelintPolicySnapshot,
  ): Promise<readonly RouteTransitionSourceProofResult[]> => {
    const scopeChecks = await Promise.all(
      snapshot.otherConfigs.flatMap((config, index) => [
        check(config, otherPaths[index] ?? '', 'animation-duration', full, true),
        check(config, otherPaths[index] ?? '', 'animation-duration', half, false),
      ]),
    )
    const invalidDurations = [
      '300ms',
      '0.3s',
      'calc(var(--ui-motion-duration) * 1.5)',
      'calc(var(--ui-motion-duration) + 100ms)',
      'calc(var(--ui-motion-duration) + var(--ui-motion-duration))',
      'calc(var(--ui-motion-easing) + var(--ui-motion-easing) / 2)',
      `${full}, ${full}`,
    ]
    const exactChecks = await Promise.all([
      ...[full, half, 'var(--ui-motion-duration)', 'inherit'].map((value) =>
        check(snapshot.routeConfig, routePath, 'animation-duration', value, false),
      ),
      ...invalidDurations.map((value) =>
        check(snapshot.routeConfig, routePath, 'animation-duration', value, true),
      ),
      ...['animation-delay', 'transition-delay', 'transition-duration'].map((property) =>
        check(snapshot.routeConfig, routePath, property, full, true),
      ),
      check(
        snapshot.routeConfig,
        routePath,
        'animation',
        `pavp-route-content-crossfade-old ${full} var(--ui-motion-easing) both`,
        true,
      ),
    ])
    return [
      {
        id: 'ROUTE_TRANSITION_SOURCE_50_STYLELINT_GLOBAL_DURATION',
        passed: isDeepStrictEqual(snapshot.globalDurationPatterns, [
          'calc\\(var\\(--ui-motion-duration\\) / 2\\)',
        ]),
      },
      {
        id: 'ROUTE_TRANSITION_SOURCE_51_STYLELINT_FILE_SCOPE',
        passed:
          isDeepStrictEqual(snapshot.scopeFiles, [routePath]) &&
          snapshot.otherConfigs.length === otherPaths.length &&
          scopeChecks.every(Boolean),
      },
      {
        id: 'ROUTE_TRANSITION_SOURCE_52_STYLELINT_EXACT_DECLARATION',
        passed: exactChecks.every(Boolean) && !cssSource.includes('stylelint-disable'),
      },
    ]
  }
  const proofs = await proofResults(baseline)
  const preservedBaseline = structuredClone(baseline)
  const mutations: readonly (readonly [string, string, RouteTransitionStylelintPolicySnapshot])[] =
    [
      [
        'full-duration-added-to-global-policy',
        'ROUTE_TRANSITION_SOURCE_50_STYLELINT_GLOBAL_DURATION',
        {
          ...baseline,
          globalDurationPatterns: [...baseline.globalDurationPatterns, full],
        },
      ],
      [
        'full-duration-scope-expanded-to-other-css',
        'ROUTE_TRANSITION_SOURCE_51_STYLELINT_FILE_SCOPE',
        {
          ...baseline,
          scopeFiles: ['**/*.css'],
          otherConfigs: baseline.otherConfigs.map(() => baseline.routeConfig),
        },
      ],
      [
        'full-duration-policy-accepts-raw-or-broad-values',
        'ROUTE_TRANSITION_SOURCE_52_STYLELINT_EXACT_DECLARATION',
        {
          ...baseline,
          routeConfig: {
            ...baseline.routeConfig,
            rules: {
              ...baseline.routeConfig.rules,
              [rule]: { 'animation-duration': [/^never$/u] },
            },
          },
        },
      ],
    ]
  const probes = await Promise.all(
    mutations.map(async ([id, expectedFailureCode, mutated]) => ({
      id,
      expectedFailureCode,
      passed:
        proofs.every((proof) => proof.passed) &&
        !isDeepStrictEqual(mutated, baseline) &&
        isDeepStrictEqual(
          (await proofResults(mutated)).filter((proof) => !proof.passed).map((proof) => proof.id),
          [expectedFailureCode],
        ),
    })),
  )
  return {
    proofs,
    probes: probes.map((probe) => ({
      ...probe,
      passed: probe.passed && isDeepStrictEqual(baseline, preservedBaseline),
    })),
  }
}

interface RouteTransitionDividerSnapshot {
  readonly cssSource: string
  readonly providerSource: string
  readonly themeSource: string
  readonly scriptSource: string
}

export function routeTransitionDividerFailures(
  snapshot: RouteTransitionDividerSnapshot,
): readonly string[] {
  const rules = (source: string) =>
    [...source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map(
      (match) => ({
        selector: (match[1] ?? '').replaceAll(/\s+/gu, ''),
        declarations: (match[2] ?? '')
          .split(';')
          .map((entry) => entry.trim())
          .filter(Boolean),
      }),
    )
  const cssRules = rules(snapshot.cssSource)
  const groupSelector =
    "[data-scroll-owner='architecture-console-content']::view-transition-group(root)"
  const group = cssRules.find((rule) => rule.selector === groupSelector)?.declarations ?? []
  const pairSelector =
    "[data-scroll-owner='architecture-console-content']::view-transition-image-pair(root)"
  const pairOverflow = cssRules
    .filter((rule) => rule.selector === pairSelector)
    .flatMap((rule) =>
      rule.declarations.filter((declaration) => /^overflow(?:-|:)/u.test(declaration)),
    )
  const live = rules(snapshot.providerSource.split('<style>')[1] ?? '').filter(
    (rule) =>
      rule.selector ===
      "[data-pavp-admin-navigation='persistent'].pavp-admin-shell__sidebar.n-layout-sider>.n-layout-sider__border",
  )
  const colorReference = /\bsiderBorderColor:\s*(\w+)\s*,/u.exec(snapshot.themeSource)?.[1]
  const colorValid =
    colorReference !== undefined &&
    new RegExp(`\\bconst ${colorReference} = tokens\\['color\\.border\\.default'\\]`, 'u').test(
      snapshot.themeSource,
    )
  const results: readonly (readonly [string, boolean])[] = [
    [
      'DIVIDER_LIVE_AUTHORITY',
      live.length === 1 &&
        isDeepStrictEqual(live[0]?.declarations, ['width: var(--ui-admin-border-width)']) &&
        colorValid,
    ],
    [
      'DIVIDER_NO_TRANSIENT_BORDER',
      cssRules.every((rule) =>
        rule.declarations.every((declaration) => !/^border(?:-|:)/u.test(declaration)),
      ),
    ],
    [
      'DIVIDER_NO_MARGIN',
      cssRules.every((rule) =>
        rule.declarations.every((declaration) => !/^margin(?:-|:)/u.test(declaration)),
      ),
    ],
    ['DIVIDER_IMAGE_PAIR_CONTAINMENT', isDeepStrictEqual(pairOverflow, ['overflow: clip'])],
    [
      'DIVIDER_CONTAINMENT_OWNER',
      cssRules.every(
        (rule) =>
          rule.selector === pairSelector ||
          !rule.declarations.some((declaration) =>
            /^(?:overflow|clip|mask)(?:-|:)/u.test(declaration),
          ),
      ),
    ],
    [
      'DIVIDER_IMAGE_PAIR_GEOMETRY',
      cssRules
        .filter((rule) => rule.selector.includes('::view-transition-image-pair('))
        .every((rule) =>
          rule.declarations.every((declaration) =>
            /^(?:animation(?:-duration)?|isolation|overflow):/u.test(declaration),
          ),
        ),
    ],
    [
      'DIVIDER_SNAPSHOT_GEOMETRY',
      cssRules
        .filter((rule) => /::view-transition-(?:old|new)\(/u.test(rule.selector))
        .every((rule) =>
          rule.declarations.every(
            (declaration) =>
              !/^(?:inset(?:-[\w-]+)?|width|height|position|padding(?:-[\w-]+)?):/u.test(
                declaration,
              ),
          ),
        ),
    ],
    [
      'DIVIDER_STATIC_GROUP',
      group.every(
        (declaration) =>
          declaration.startsWith('animation-duration:') || declaration === 'animation: none',
      ) && !/\b\d+(?:\.\d+)?px\b|stylelint-disable/u.test(snapshot.cssSource),
    ],
    [
      'DIVIDER_NO_JS_GEOMETRY',
      !/\b(?:getBoundingClientRect|getClientRects|ResizeObserver|MutationObserver|requestAnimationFrame|setTimeout|setInterval)\b/u.test(
        snapshot.scriptSource,
      ),
    ],
  ]
  return results.filter(([, passed]) => !passed).map(([id]) => id)
}

async function validateRouteTransitionDividerGovernance(): Promise<readonly string[]> {
  const source = await loadRouteTransitionSourceSnapshot()
  const [providerSource, themeSource] = await Promise.all([
    readFile(
      resolve(rootDirectory, 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue'),
      'utf8',
    ),
    readFile(resolve(rootDirectory, 'packages/ui/src/adapters/naive/pavp-naive-theme.ts'), 'utf8'),
  ])
  const baseline: RouteTransitionDividerSnapshot = {
    cssSource: source.cssSource,
    providerSource,
    themeSource,
    scriptSource: [
      source.coordinatorSource,
      source.resolverSource,
      source.ruleSource,
      source.boundarySource,
      source.presetSource,
      source.typesSource,
    ].join('\n'),
  }
  const preserved = structuredClone(baseline)
  const violations = [...routeTransitionDividerFailures(baseline)]
  const mutations: readonly (readonly [readonly string[], RouteTransitionDividerSnapshot])[] = [
    [
      ['DIVIDER_LIVE_AUTHORITY'],
      {
        ...baseline,
        providerSource: providerSource.replace('width: var(--ui-admin-border-width)', 'width: 1px'),
      },
    ],
    [
      ['DIVIDER_NO_TRANSIENT_BORDER', 'DIVIDER_STATIC_GROUP'],
      {
        ...baseline,
        cssSource: source.cssSource.replace(
          '::view-transition-group(root) {',
          '::view-transition-group(root) { border-inline-start-width: var(--ui-admin-border-width);',
        ),
      },
    ],
    [
      ['DIVIDER_NO_MARGIN', 'DIVIDER_STATIC_GROUP'],
      {
        ...baseline,
        cssSource: source.cssSource.replace(
          '::view-transition-group(root) {',
          '::view-transition-group(root) { margin-inline-start: calc(-1 * var(--ui-admin-border-width));',
        ),
      },
    ],
    [
      ['DIVIDER_NO_TRANSIENT_BORDER'],
      {
        ...baseline,
        cssSource: `${source.cssSource}\n::view-transition-old(root), ::view-transition-new(root) { border-inline-start-width: var(--ui-admin-border-width); }`,
      },
    ],
    [
      ['DIVIDER_IMAGE_PAIR_GEOMETRY'],
      {
        ...baseline,
        cssSource: `${source.cssSource}\n::view-transition-image-pair(root) { inset: 0; }`,
      },
    ],
    [
      ['DIVIDER_NO_JS_GEOMETRY'],
      {
        ...baseline,
        scriptSource: `${baseline.scriptSource}\ndocument.documentElement.getBoundingClientRect()`,
      },
    ],
    ...['', 'overflow: hidden;', 'overflow: auto;', 'overflow: scroll;'].map(
      (replacement) =>
        [
          ['DIVIDER_IMAGE_PAIR_CONTAINMENT'],
          { ...baseline, cssSource: source.cssSource.replace('overflow: clip;', replacement) },
        ] as const,
    ),
    ...[
      '.pavp-route-content',
      "[data-scroll-owner='architecture-console-content']",
      '::view-transition-old(root)',
      '::view-transition-new(root)',
    ].map(
      (selector) =>
        [
          ['DIVIDER_CONTAINMENT_OWNER'],
          { ...baseline, cssSource: `${source.cssSource}\n${selector} { overflow: clip; }` },
        ] as const,
    ),
    [
      ['DIVIDER_SNAPSHOT_GEOMETRY'],
      {
        ...baseline,
        cssSource: `${source.cssSource}\n::view-transition-old(root) { inset: 0; }`,
      },
    ],
  ]
  for (const [codes, mutated] of mutations) {
    if (
      violations.length > 0 ||
      isDeepStrictEqual(baseline, mutated) ||
      !isDeepStrictEqual(routeTransitionDividerFailures(mutated), codes)
    ) {
      violations.push(`${codes.join(',')}: divider in-memory negative probe failed.`)
    }
  }
  if (!isDeepStrictEqual(baseline, preserved)) violations.push('DIVIDER_PROBE_RESIDUE')
  violations.push(
    ...routeTransitionFullPaceProofResults(source)
      .filter((proof) => !proof.passed)
      .map((proof) => proof.id),
  )
  if (!routeTransitionTypedRecipeCascadeValid(routeTransitionPresetSelectionSnapshot(source))) {
    violations.push('DIVIDER_RECIPE_CASCADE')
  }
  const routePath = 'apps/web/src/app/router/route-transition/route-transition.css'
  const paths = [
    routePath,
    'apps/web/src/app/styles/layers.css',
    'apps/web/src/app/router/route-transition/other.css',
    'packages/ui/src/other.css',
  ]
  const configs = await Promise.all(
    paths.map(async (path) => {
      const config = await stylelint.resolveConfig(resolve(rootDirectory, path))
      if (config === undefined) throw new Error('Divider Stylelint policy is unavailable.')
      return config
    }),
  )
  const exact = 'calc(-1 * var(--ui-admin-border-width))'
  const policyFailures = async (
    policies: readonly stylelint.Config[],
  ): Promise<readonly string[]> => {
    const results = await Promise.all(
      policies.flatMap((config, index) => {
        const declarations: readonly (readonly [string, string, boolean])[] = [
          ['margin-inline-start', exact, true],
          ...[
            '-1px',
            '-0.0625rem',
            'calc(-1 * 1px)',
            'calc(-2 * var(--ui-admin-border-width))',
            'calc(-1 * var(--ui-space-content-gap))',
            'calc(var(--ui-admin-border-width) * -1)',
            'calc(-3 * var(--ui-space-page-inline))',
          ].map((value) => ['margin-inline-start', value, true] as const),
          ...['margin-inline-end', 'margin-left', 'padding-inline-start'].map(
            (property) => [property, exact, true] as const,
          ),
          ...[
            'margin-inline-start',
            'margin-inline-end',
            'margin-left',
            'padding-inline-start',
          ].flatMap((property) =>
            ['0', 'auto', 'var(--ui-space-content-gap)'].map(
              (value) => [property, value, false] as const,
            ),
          ),
        ]
        return declarations.map(async ([property, value, rejected]) => {
          const result = await stylelint.lint({
            config,
            code: `::view-transition-group(root) { ${property}: ${value}; }`,
            codeFilename: resolve(rootDirectory, paths[index] ?? routePath),
          })
          const warnings = result.results.flatMap((entry) => entry.warnings)
          const passed =
            result.results.length === 1 &&
            result.results[0]?.ignored !== true &&
            (rejected
              ? result.errored &&
                warnings.length > 0 &&
                warnings.every(
                  (warning) =>
                    warning.rule === 'declaration-property-value-disallowed-list' &&
                    warning.severity === 'error',
                )
              : !result.errored && warnings.length === 0)
          return {
            code: index === 0 ? 'DIVIDER_POLICY_EXACT' : 'DIVIDER_POLICY_GLOBAL_SCOPE',
            passed,
          }
        })
      }),
    )
    return [...new Set(results.filter((result) => !result.passed).map((result) => result.code))]
  }
  const policyBaseline = structuredClone(configs)
  const policyErrors = await policyFailures(configs)
  violations.push(...policyErrors)
  const routeConfig = configs[0]
  if (routeConfig === undefined) throw new Error('Divider Stylelint route config is unavailable.')
  const restoredMarginException = (config: stylelint.Config): stylelint.Config => ({
    ...config,
    rules: {
      ...config.rules,
      'declaration-property-value-disallowed-list': {
        ...Object.fromEntries(
          Object.entries(
            config.rules?.['declaration-property-value-disallowed-list'] as Record<string, unknown>,
          ).map(([property, values]) => [
            property.startsWith('/^') && property.includes('margin')
              ? property.replace('/^', '/^(?!margin-inline-start$)')
              : property,
            values,
          ]),
        ),
        'margin-inline-start': [
          /^(?!(?:0|auto|var\(--ui-space-content-gap\)|calc\(-1 \* var\(--ui-admin-border-width\)\))$)/u,
        ],
      },
    },
  })
  const policyMutations: readonly (readonly [string, readonly stylelint.Config[]])[] = [
    [
      'DIVIDER_POLICY_GLOBAL_SCOPE',
      [routeConfig, ...configs.slice(1).map(restoredMarginException)],
    ],
    ['DIVIDER_POLICY_EXACT', [restoredMarginException(routeConfig), ...configs.slice(1)]],
    [
      'DIVIDER_POLICY_EXACT',
      [
        {
          ...routeConfig,
          rules: {
            ...routeConfig.rules,
            'declaration-property-value-disallowed-list': { 'margin-inline-start': [/^never$/u] },
          },
        },
        ...configs.slice(1),
      ],
    ],
  ]
  for (const [code, mutated] of policyMutations) {
    if (policyErrors.length > 0 || !isDeepStrictEqual(await policyFailures(mutated), [code])) {
      violations.push(`${code}: divider policy in-memory negative probe failed.`)
    }
  }
  if (!isDeepStrictEqual(configs, policyBaseline)) violations.push('DIVIDER_POLICY_PROBE_RESIDUE')
  return violations
}

// Owner-confirmed order is a production direction contract, not declaration-order precedence.
const workspaceAxisRouteNames = [
  'console-overview',
  'appearance-management',
  'design-token-inspector',
  'runtime-kernel-inspector',
  'router-governance-inspector',
  'storage-persistence-inspector',
  'ui-system-inspector',
  'responsive-layout-inspector',
  'engineering-quality-inspector',
  'capability-roadmap',
] as const

export function workspaceAxisDefaultFailures(rules: readonly RouteTransitionRule[]): string[] {
  const expectedIds = [
    'route-transition-rule.global-default',
    'route-transition-rule.architecture-workspace',
    'route-transition-rule.architecture-workspace-axis',
    'route-transition-rule.architecture-workspace-error',
    'route-transition-rule.error',
  ]
  const orderedRules = rules.filter((rule) => rule.kind === 'ordered-routes')
  const axis = orderedRules[0]
  const family = rules.find(
    (rule) => rule.ruleId === 'route-transition-rule.architecture-workspace',
  )
  const failures: string[] = []
  if (!isDeepStrictEqual(rules.map((rule) => rule.ruleId).sort(), expectedIds.sort())) {
    failures.push('WORKSPACE_AXIS_RULE_INVENTORY')
  }
  if (
    orderedRules.length !== 1 ||
    axis?.ruleId !== 'route-transition-rule.architecture-workspace-axis' ||
    !isDeepStrictEqual(axis.routeNames, workspaceAxisRouteNames) ||
    !isDeepStrictEqual(
      consoleNavigationRegistry.flatMap((group) =>
        group.items.map((item) => item.destination.name),
      ),
      workspaceAxisRouteNames,
    ) ||
    axis.forwardPresetId !== 'route-transition.axis-inline-soft' ||
    axis.reversePresetId !== 'route-transition.axis-inline-soft' ||
    axis.fallbackPresetId !== 'route-transition.content-crossfade' ||
    family === undefined ||
    axis.priority <= family.priority
  ) {
    failures.push('WORKSPACE_AXIS_ORDERED_RULE')
  }
  const projectionsValid = workspaceAxisRouteNames.every((fromRouteName, fromIndex) =>
    workspaceAxisRouteNames.every(
      (toRouteName, toIndex) =>
        fromIndex === toIndex ||
        (['narrow', 'regular', 'wide'] as const).every((layoutProfile) => {
          const input = {
            ...routeTransitionSelectionInput,
            fromRouteName,
            toRouteName,
            layoutProfile,
          }
          const matches = (candidate: RouteTransitionResolverInput, spatial: boolean): boolean =>
            isDeepStrictEqual(resolveRouteTransition(candidate, rules), {
              kind: 'native-element',
              presetId: spatial
                ? 'route-transition.axis-inline-soft'
                : 'route-transition.content-crossfade',
              transitionType: spatial
                ? 'pavp-route-axis-inline-soft'
                : 'pavp-route-content-crossfade',
              boundaryId: 'route-transition-boundary.architecture-console-content',
              motionProjection: candidate.motion,
              direction: spatial ? (fromIndex < toIndex ? 'forward' : 'reverse') : 'neutral',
            })
          return (
            matches(input, true) &&
            matches({ ...input, motion: 'reduced' }, false) &&
            matches({ ...input, typedTransitionSupport: false }, false) &&
            isDeepStrictEqual(resolveRouteTransition({ ...input, motion: 'none' }, rules), {
              kind: 'bypass',
              reason: 'motion-none',
            })
          )
        }),
    ),
  )
  if (!projectionsValid) failures.push('WORKSPACE_AXIS_PROJECTION')
  return failures
}

function validateRouteTransitionWorkspaceDefaultGovernance(): readonly string[] {
  const baseline: readonly RouteTransitionRule[] = routeTransitionRuleRegistry
  const preserved = structuredClone(baseline)
  const failures = workspaceAxisDefaultFailures(baseline)
  const mutateAxis = (
    change: (rule: Extract<RouteTransitionRule, { kind: 'ordered-routes' }>) => RouteTransitionRule,
  ): readonly RouteTransitionRule[] =>
    baseline.map((rule) => (rule.kind === 'ordered-routes' ? change(rule) : rule))
  const probes: readonly (readonly [readonly string[], readonly RouteTransitionRule[]])[] = [
    [
      ['WORKSPACE_AXIS_RULE_INVENTORY', 'WORKSPACE_AXIS_ORDERED_RULE', 'WORKSPACE_AXIS_PROJECTION'],
      baseline.filter((rule) => rule.kind !== 'ordered-routes'),
    ],
    [
      ['WORKSPACE_AXIS_ORDERED_RULE', 'WORKSPACE_AXIS_PROJECTION'],
      mutateAxis((rule) => ({
        ...rule,
        routeNames: [rule.routeNames[1], rule.routeNames[0], ...rule.routeNames.slice(2)],
      })),
    ],
    [
      ['WORKSPACE_AXIS_ORDERED_RULE', 'WORKSPACE_AXIS_PROJECTION'],
      mutateAxis((rule) => ({ ...rule, forwardPresetId: 'route-transition.content-crossfade' })),
    ],
    [
      ['WORKSPACE_AXIS_RULE_INVENTORY', 'WORKSPACE_AXIS_PROJECTION'],
      [
        ...baseline,
        {
          ruleId: 'route-transition-rule.owner-preview-drill',
          kind: 'exact-route-pair',
          priority: 110,
          fromRouteName: 'console-overview',
          toRouteName: 'storage-persistence-inspector',
          forwardPresetId: 'route-transition.drill-soft',
          reversePresetId: 'route-transition.drill-soft',
          fallbackPresetId: 'route-transition.content-crossfade',
        },
      ],
    ],
  ]
  if (probes.length !== expectedRouteTransitionWorkspaceDefaultNegativeProbeCount) {
    failures.push('WORKSPACE_AXIS_PROBE_COUNT')
  }
  for (const [expected, mutated] of probes) {
    if (
      isDeepStrictEqual(mutated, baseline) ||
      !isDeepStrictEqual(workspaceAxisDefaultFailures(mutated), expected)
    ) {
      failures.push(
        `Workspace Axis in-memory probe did not fail exclusively for ${expected.join(',')}.`,
      )
    }
  }
  if (!isDeepStrictEqual(baseline, preserved)) failures.push('WORKSPACE_AXIS_PROBE_RESIDUE')
  return failures
}

export async function validateRouteTransitionSourceGovernance(): Promise<readonly string[]> {
  const snapshot = await loadRouteTransitionSourceSnapshot()
  const presetSelectionSnapshot = routeTransitionPresetSelectionSnapshot(snapshot)
  const stylelintPolicy = await routeTransitionStylelintPolicyGovernance(snapshot.cssSource)
  const proofs = [
    ...routeTransitionSourceProofResults(snapshot),
    ...routeTransitionPresetSelectionProofResults(presetSelectionSnapshot),
    ...routeTransitionFullPaceProofResults(snapshot),
    ...stylelintPolicy.proofs,
  ]
  const probes = runRouteTransitionSourceNegativeProbes(snapshot)
  const presentationCommitProbes = runRouterPresentationCommitNegativeProbes(snapshot)
  const presetSelectionProbes =
    runRouteTransitionPresetSelectionNegativeProbes(presetSelectionSnapshot)
  const violations: string[] = []

  if (stylelintPolicy.probes.length !== expectedRouteTransitionStylelintPolicyNegativeProbeCount) {
    violations.push('Route Transition Stylelint policy negative-probe count drifted.')
  }
  for (const probe of stylelintPolicy.probes) {
    if (!probe.passed)
      violations.push(
        `${probe.id}: reversible in-memory Stylelint policy probe did not fail exclusively for ${probe.expectedFailureCode}.`,
      )
  }

  const fullPaceProbes = runRouteTransitionFullPaceNegativeProbes(snapshot)
  if (fullPaceProbes.length !== expectedRouteTransitionFullPaceNegativeProbeCount) {
    violations.push('Route Transition Full pace negative-probe count drifted.')
  }
  for (const probe of fullPaceProbes) {
    if (!probe.passed) {
      violations.push(
        `${probe.id}: reversible in-memory Full pace probe did not fail exclusively for ${probe.expectedFailureCode}.`,
      )
    }
  }

  if (proofs.length !== expectedRouteTransitionSourceProofCount) {
    violations.push(
      `Route Transition source-proof count drifted: expected ${String(expectedRouteTransitionSourceProofCount)}, received ${String(proofs.length)}.`,
    )
  }
  violations.push(...proofs.filter((proof) => !proof.passed).map((proof) => proof.id))

  if (probes.length !== expectedRouteTransitionSourceNegativeProbeCount) {
    violations.push(
      `Route Transition source negative-probe count drifted: expected ${String(expectedRouteTransitionSourceNegativeProbeCount)}, received ${String(probes.length)}.`,
    )
  }
  for (const probe of probes) {
    if (!probe.passed) {
      violations.push(
        `${probe.id}: reversible in-memory Route Transition source probe did not fail exclusively for ${probe.expectedFailureCode}.`,
      )
    }
  }

  if (presentationCommitProbes.length !== expectedRouterPresentationCommitNegativeProbeCount) {
    violations.push(
      `Router Presentation Commit negative-probe count drifted: expected ${String(expectedRouterPresentationCommitNegativeProbeCount)}, received ${String(presentationCommitProbes.length)}.`,
    )
  }
  for (const probe of presentationCommitProbes) {
    if (!probe.passed) {
      violations.push(
        `${probe.id}: reversible in-memory Router Presentation Commit probe did not fail exclusively for ${probe.expectedFailureCode}.`,
      )
    }
  }

  if (presetSelectionProbes.length !== expectedRouteTransitionPresetSelectionNegativeProbeCount) {
    violations.push(
      `Route Transition preset-selection negative-probe count drifted: expected ${String(expectedRouteTransitionPresetSelectionNegativeProbeCount)}, received ${String(presetSelectionProbes.length)}.`,
    )
  }
  for (const probe of presetSelectionProbes) {
    if (!probe.passed) {
      violations.push(
        `${probe.id}: reversible in-memory preset-selection probe did not fail exclusively for ${probe.expectedFailureCode}.`,
      )
    }
  }

  return [
    ...violations,
    ...validateRouteTransitionWorkspaceDefaultGovernance(),
    ...(await validateRouteTransitionDividerGovernance()),
  ]
}

async function workspaceRefreshViolations(): Promise<string[]> {
  const violations: string[] = []
  const [store, frame, lifecycle, port] = await Promise.all([
    readFile(resolve(rootDirectory, 'apps/web/src/app/workspace/workspace.store.ts'), 'utf8'),
    readFile(resolve(rootDirectory, 'apps/web/src/app/console/ConsoleRouteFrame.vue'), 'utf8'),
    readFile(resolve(routerDirectory, 'router-lifecycle.ts'), 'utf8'),
    readFile(resolve(routerDirectory, 'router-scroll-controller.ts'), 'utf8'),
  ])
  const parsedStore = ts.createSourceFile('workspace.store.ts', store, ts.ScriptTarget.Latest, true)
  const refresh = nodesOf(parsedStore, ts.isFunctionDeclaration).find(
    (node) => node.name?.text === 'refresh',
  )
  const transaction = refresh === undefined ? undefined : nodesOf(refresh, ts.isTryStatement)[0]
  const ticks =
    transaction?.tryBlock.statements.filter(
      (node) =>
        ts.isExpressionStatement(node) &&
        ts.isAwaitExpression(node.expression) &&
        ts.isCallExpression(node.expression.expression) &&
        callMemberName(node.expression.expression) ===
          namedImportLocalName(parsedStore, 'vue', 'nextTick'),
    ) ?? []
  const calls = refresh === undefined ? [] : nodesOf(refresh, ts.isCallExpression)
  if (
    refresh?.parameters.length !== 2 ||
    transaction?.finallyBlock === undefined ||
    ticks.length !== 3 ||
    !calls.some((call) => callMemberName(call) === 'canDiscard') ||
    !calls.some((call) => callMemberName(call) === 'Symbol') ||
    /\b(?:localStorage|sessionStorage|workspaceSession|router)\b/u.test(refresh.getText())
  )
    violations.push(
      'Workspace refresh requires discard authority and three separate public KeepAlive flush phases with cleanup.',
    )

  const parsedFrame = ts.createSourceFile(
    'ConsoleRouteFrame.ts',
    /<script[^>]*>([\s\S]*?)<\/script>/u.exec(frame)?.[1] ?? '',
    ts.ScriptTarget.Latest,
    true,
  )
  if (
    !nodesOf(parsedFrame, ts.isPropertyAssignment).some(
      (property) =>
        property.name.getText() === 'refreshable' &&
        ts.isCallExpression(property.initializer) &&
        callMemberName(property.initializer) === 'canDiscard',
    )
  )
    violations.push('Workspace Refresh availability must project the existing discard authority.')
  const activateHandler = /@activate="([\w$]+)"/u.exec(frame)?.[1]
  const refreshHandler = /@refresh="([\w$]+)"/u.exec(frame)?.[1]
  const handler = nodesOf(parsedFrame, ts.isFunctionDeclaration).find(
    (node) => node.name?.text === refreshHandler,
  )
  const handlerCalls = handler === undefined ? [] : nodesOf(handler, ts.isCallExpression)
  const activateCall = handlerCalls.find((call) => callMemberName(call) === activateHandler)
  const refreshCall = handlerCalls.find((call) => callMemberName(call) === 'refresh')
  if (
    handler === undefined ||
    activateCall === undefined ||
    refreshCall === undefined ||
    activateCall.pos >= refreshCall.pos ||
    !handlerCalls.some((call) => callMemberName(call) === 'isRouterNavigationCurrent') ||
    !handlerCalls.some((call) => callMemberName(call) === 'isLiveWorkspace') ||
    !handlerCalls.some((call) => callMemberName(call) === 'sameRouteAddress') ||
    handlerCalls.some((call) =>
      ['navigate', 'push', 'replace', 'go'].includes(callMemberName(call) ?? ''),
    )
  )
    violations.push(
      'Context Refresh must reuse committed activation, reject stale navigation and avoid a second navigation or dormant remount.',
    )
  const parsedLifecycle = ts.createSourceFile(
    'router-lifecycle.ts',
    lifecycle,
    ts.ScriptTarget.Latest,
    true,
  )
  const registrations = nodesOf(parsedLifecycle, ts.isCallExpression).filter(
    (call) =>
      callMemberName(call) === 'provide' &&
      call.arguments[0]?.getText() === 'routerWorkspaceRefreshKey',
  )
  const resetOwner = registrations[0]?.arguments[1]
  const resetCalls = resetOwner === undefined ? [] : nodesOf(resetOwner, ts.isCallExpression)
  if (
    registrations.length !== 1 ||
    !port.includes('InjectionKey<') ||
    !port.includes('reset(replacement: LiveWorkspaceEntry): void') ||
    !frame.includes('inject(routerWorkspaceRefreshKey)') ||
    !resetCalls.some((call) => callMemberName(call) === 'cancelMotion') ||
    !resetCalls.some((call) => callMemberName(call) === 'isCurrent')
  )
    violations.push(
      'Router alone must own the current-operation refresh port, scroll invalidation and motion cancellation.',
    )
  if (
    /scrollTo|scrollTop\s*=|scrollLeft\s*=|scrollIntoView/u.test(frame) ||
    /__v_cache|__keepAliveStorageContainer|pruneCache|rendererInternals|\$forceUpdate|location\.reload|router\.go\(0\)/u.test(
      `${store}\n${frame}\n${lifecycle}`,
    )
  )
    violations.push(
      'Workspace refresh must not access private KeepAlive internals, reload the application or write scroll from the Frame.',
    )
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
    ...(await workspaceRefreshViolations()),
    ...(await validateRouteTransitionSourceGovernance()),
    ...routeIdViolations,
  ]
}
