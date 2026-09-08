import type { ConsoleI18nBoundary, ConsoleTranslate } from '../../shared/i18n'
import { nextTick, type App } from 'vue'
import {
  createRouter,
  createWebHistory,
  isNavigationFailure,
  NavigationFailureType,
  START_LOCATION,
  type RouteLocationNormalized,
  type RouteLocationResolved,
  type NavigationFailure,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import type { CoreRuntimeConfiguration } from '../config/runtime-configuration-contract'
import {
  advanceActiveGuardStage,
  completeActiveGuardStages,
  createActiveGuardStageProgress,
  type ActiveGuardStageProgress,
} from './navigation-contract'
import {
  focusContractRegistry,
  getErrorRouteName,
  getRoutePresentation,
  getRouteMessageScope,
  getRouteRecord,
  routeRegistry,
  routeTitleRegistry,
  scrollOwnerRegistry,
  routeLayoutCapabilityRegistry,
  type RouteName,
} from './route-registry'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import {
  resolveRegisteredDestination,
  routeDestination,
  routeMetaMatches,
  sameRouteAddress,
  validateRouteInput,
  routeHasPageInput,
  type RegisteredRouteDestination,
  type ValidatedRouteInput,
  type TypedNavigationResult,
} from './route-input'
import {
  createNormalizedRouterError,
  safeRouterErrorRoute,
  type RouterErrorId,
  type RouterFailureKind,
} from './router-error-registry'

interface NavigationAttemptState {
  readonly navigationId: string
  readonly routeName: RouteName
  readonly guardStageProgress: ActiveGuardStageProgress
  componentResolutionReached: boolean
  readonly input: ValidatedRouteInput
  readonly operation: NavigationOperation
}

type RouterPresentationCommitOutcome = 'committed' | 'cancelled'

interface RouterPresentationCommitRecord {
  readonly identity: symbol
  readonly sequence: number
  readonly navigationId: string
  readonly expectedRouteName: RouteName
  readonly expectedFullPath: string
  readonly completion: Promise<RouterPresentationCommitOutcome>
  readonly resolve: (outcome: RouterPresentationCommitOutcome) => void
  readonly reject: (source: unknown) => void
  boundNavigation: RouteLocationNormalized | undefined
  settled: boolean
}

interface RouterPresentationCommitBroker {
  readonly reservations: Map<symbol, RouterPresentationCommitRecord>
  readonly navigationReservations: WeakMap<RouteLocationNormalized, RouterPresentationCommitRecord>
  reservationSequence: number
  disposed: boolean
  currentOperation?: () => NavigationOperation | undefined
  accept?: (
    destination: RegisteredRouteDestination,
    options?: Readonly<{ replace?: boolean }>,
  ) => RouterNavigationRequest | Extract<TypedNavigationResult, { kind: 'duplicated' | 'cancel' }>
  routeInput?: () => Readonly<{ routeInput?: ValidatedRouteInput }>
}

const routerPresentationCommitBrokers = new WeakMap<Router, RouterPresentationCommitBroker>()

function createRouterPresentationCommitBroker(): RouterPresentationCommitBroker {
  return {
    reservations: new Map(),
    navigationReservations: new WeakMap(),
    reservationSequence: 0,
    disposed: false,
  }
}

function settleRouterPresentationCommit(
  broker: RouterPresentationCommitBroker,
  reservation: RouterPresentationCommitRecord,
  outcome: RouterPresentationCommitOutcome,
): void {
  if (reservation.settled) {
    return
  }

  reservation.settled = true
  broker.reservations.delete(reservation.identity)
  reservation.resolve(outcome)
}

function rejectRouterPresentationCommit(
  broker: RouterPresentationCommitBroker,
  reservation: RouterPresentationCommitRecord,
  source: unknown,
): void {
  if (reservation.settled) {
    return
  }

  reservation.settled = true
  broker.reservations.delete(reservation.identity)
  reservation.reject(source)
}

function bindRouterPresentationCommit(
  broker: RouterPresentationCommitBroker,
  navigation: RouteLocationNormalized,
  routeName: RouteName | undefined,
  navigationId: string,
): void {
  let selected: RouterPresentationCommitRecord | undefined

  for (const reservation of broker.reservations.values()) {
    if (
      reservation.boundNavigation === undefined &&
      reservation.navigationId === navigationId &&
      routeName === reservation.expectedRouteName &&
      navigation.fullPath === reservation.expectedFullPath &&
      (selected === undefined || reservation.sequence > selected.sequence)
    ) {
      selected = reservation
    }
  }

  for (const reservation of [...broker.reservations.values()]) {
    if (reservation !== selected) {
      settleRouterPresentationCommit(broker, reservation, 'cancelled')
    }
  }

  if (selected === undefined) {
    return
  }

  selected.boundNavigation = navigation
  broker.navigationReservations.set(navigation, selected)
}

function resolveBoundRouterPresentationCommit(
  broker: RouterPresentationCommitBroker,
  navigation: RouteLocationNormalized,
): void {
  const reservation = broker.navigationReservations.get(navigation)
  if (reservation !== undefined) {
    settleRouterPresentationCommit(broker, reservation, 'committed')
  }
}

function cancelBoundRouterPresentationCommit(
  broker: RouterPresentationCommitBroker,
  navigation: RouteLocationNormalized,
): void {
  const reservation = broker.navigationReservations.get(navigation)
  if (reservation !== undefined) {
    settleRouterPresentationCommit(broker, reservation, 'cancelled')
  }
}

function rejectBoundRouterPresentationCommit(
  broker: RouterPresentationCommitBroker,
  navigation: RouteLocationNormalized,
  source: unknown,
): void {
  const reservation = broker.navigationReservations.get(navigation)
  if (reservation !== undefined) {
    rejectRouterPresentationCommit(broker, reservation, source)
  }
}

function disposeRouterPresentationCommitBroker(
  router: Router,
  broker: RouterPresentationCommitBroker,
): void {
  broker.disposed = true
  for (const reservation of [...broker.reservations.values()]) {
    settleRouterPresentationCommit(broker, reservation, 'cancelled')
  }
  routerPresentationCommitBrokers.delete(router)
}

export function reserveRouterPresentationCommit(input: {
  readonly router: Router
  readonly expectedRouteName: RouteName
  readonly expectedFullPath: string
  readonly navigationId: string
}): Readonly<{
  readonly completion: Promise<RouterPresentationCommitOutcome>
  cancel(): void
}> {
  const broker = routerPresentationCommitBrokers.get(input.router)
  const routeRecord = getRouteRecord(input.expectedRouteName)

  if (
    broker === undefined ||
    broker.disposed ||
    broker.currentOperation?.()?.navigationId !== input.navigationId ||
    input.expectedFullPath.length === 0 ||
    routeRecord.meta.routeTransitionFamilyId !== 'route-family.architecture-workspace'
  ) {
    throw new TypeError('The Router Presentation Commit reservation is unavailable.')
  }

  let resolveCompletion!: (outcome: RouterPresentationCommitOutcome) => void
  let rejectCompletion!: (source: unknown) => void
  const completion = new Promise<RouterPresentationCommitOutcome>((resolve, reject) => {
    resolveCompletion = resolve
    rejectCompletion = reject
  })
  const reservation: RouterPresentationCommitRecord = {
    identity: Symbol('router-presentation-commit'),
    sequence: ++broker.reservationSequence,
    navigationId: input.navigationId,
    expectedRouteName: input.expectedRouteName,
    expectedFullPath: input.expectedFullPath,
    completion,
    resolve: resolveCompletion,
    reject: rejectCompletion,
    boundNavigation: undefined,
    settled: false,
  }
  broker.reservations.set(reservation.identity, reservation)
  void completion.catch(() => undefined)

  return Object.freeze({
    completion,
    cancel() {
      settleRouterPresentationCommit(broker, reservation, 'cancelled')
    },
  })
}

export interface RouterLifecycleHandle {
  readonly router: Router
  readonly history: RouterHistory
  readonly guardRemovers: readonly [() => void, () => void, () => void]
  readonly errorHandlerRemover: () => void
  connectLocalization(boundary: ConsoleI18nBoundary): () => void
  refreshCurrentRouteTitle(translate: ConsoleTranslate): void
  markApplicationMounted(): void
  getLatestNavigationResult(): TypedNavigationResult | undefined
  dispose(): void
}

function generatedRouteRecords(records: readonly RouteRecordRaw[]): RouteRecordRaw[] {
  return records.flatMap((record) => [record, ...generatedRouteRecords(record.children ?? [])])
}

function validateGeneratedRouteClosure(): void {
  const namedRecords = generatedRouteRecords(routes).filter(
    (record): record is RouteRecordRaw & { readonly name: string } =>
      typeof record.name === 'string',
  )

  if (namedRecords.length !== routeRegistry.length) {
    throw new TypeError('The generated runtime route count does not match the Route Registry.')
  }

  for (const record of routeRegistry) {
    const generated = namedRecords.find((candidate) => candidate.name === record.name)

    if (
      generated?.path !== record.pathPattern ||
      !routeMetaMatches(generated.meta ?? {}, record.meta)
    ) {
      throw new TypeError('The generated runtime route set diverged from the Route Registry.')
    }
  }
}

function ensureRuntimeConfigurationReady(configuration: CoreRuntimeConfiguration): void {
  if (
    !Object.isFrozen(configuration) ||
    configuration.deploymentBase.length === 0 ||
    configuration.releaseSha.length === 0 ||
    configuration.buildVersion.length === 0
  ) {
    throw new TypeError('The Router requires the validated Runtime Configuration authority.')
  }
}

function createFailureResult(input: {
  readonly configuration: CoreRuntimeConfiguration
  readonly errorId: RouterErrorId
  readonly failureKind: RouterFailureKind
  readonly navigationId: string
  readonly routeName: RouteName | null
  readonly browserExplicitlyOffline: boolean
}): Extract<TypedNavigationResult, { readonly kind: 'failure' }> {
  const error = createNormalizedRouterError(input.errorId, {
    navigationId: input.navigationId,
    routeName: input.routeName,
    failureKind: input.failureKind,
    releaseSha: input.configuration.releaseSha,
    buildVersion: input.configuration.buildVersion,
    controlledReloadUsed: false,
  })
  const destination = Object.freeze({
    name: safeRouterErrorRoute(error.id, input.browserExplicitlyOffline),
  })

  return Object.freeze({
    kind: 'failure',
    navigationId: input.navigationId,
    errorId: error.id,
    destination,
  })
}

function finiteNativeScrollPosition(
  savedPosition: { readonly left: number; readonly top: number } | null,
): { readonly left: number; readonly top: number } {
  if (
    savedPosition !== null &&
    Number.isFinite(savedPosition.left) &&
    Number.isFinite(savedPosition.top)
  ) {
    return Object.freeze({ left: savedPosition.left, top: savedPosition.top })
  }

  return Object.freeze({ left: 0, top: 0 })
}

interface RouteEntryMarker {
  readonly scopeId: string
  readonly entryId: string
}

interface NavigationOperation {
  readonly navigationId: string
  kind: 'initial' | 'push' | 'replace' | 'pop'
  expectedFullPath: string
  navigation: RouteLocationNormalized | undefined
  readonly targetMarker: RouteEntryMarker | undefined
  result: TypedNavigationResult | undefined
  readonly completion: Promise<TypedNavigationResult>
  finish(result: TypedNavigationResult): void
}

interface RegionRecord {
  readonly marker: RouteEntryMarker
  readonly context: readonly (string | number)[]
  readonly left: number
  readonly top: number
}

interface CommittedEntry {
  readonly to: RouteLocationNormalized
  readonly navigation: NavigationAttemptState
  readonly marker: RouteEntryMarker | undefined
  presented:
    | { readonly owner: HTMLElement; readonly context: readonly (string | number)[] | undefined }
    | undefined
}

export function committedRouteInputProps(
  router: Router,
): Readonly<{ routeInput?: ValidatedRouteInput }> {
  return routerPresentationCommitBrokers.get(router)?.routeInput?.() ?? {}
}

export interface RouterNavigationRequest {
  readonly kind: 'accepted'
  readonly navigationId: string
  readonly resolvedTarget: RouteLocationResolved | undefined
  readonly completion: Promise<TypedNavigationResult>
  isCurrent(): boolean
  navigate(): Promise<TypedNavigationResult>
  cancelBeforeStart(): void
}

export function cancelledRouterNavigationResult(
  navigationId: string = crypto.randomUUID(),
): Extract<TypedNavigationResult, { kind: 'cancel' }> {
  return { kind: 'cancel', navigationId, reason: 'cancelled-by-new-navigation' }
}

export function acceptRouterNavigation(
  router: Router,
  destination: RegisteredRouteDestination,
  options?: Readonly<{ replace?: boolean }>,
): RouterNavigationRequest | Extract<TypedNavigationResult, { kind: 'duplicated' | 'cancel' }> {
  return (
    routerPresentationCommitBrokers.get(router)?.accept?.(destination, options) ??
    cancelledRouterNavigationResult()
  )
}

function sameContext(
  left: readonly (string | number)[] | undefined,
  right: readonly (string | number)[] | undefined,
): boolean {
  return (
    left !== undefined &&
    left.length === right?.length &&
    left.every((value, index) => value === right[index])
  )
}

function regionOwner(routeName: RouteName): HTMLElement | undefined {
  const route = getRouteRecord(routeName)
  const block = scrollOwnerRegistry.find((owner) => owner.id === route.meta.blockScrollOwnerId)
  const inline = scrollOwnerRegistry.find((owner) => owner.id === route.meta.inlineScrollOwnerId)
  if (block === undefined || inline === undefined)
    throw new TypeError('The routed scroll owner is unavailable.')
  if (block.ownerKind === 'document' && inline.ownerKind === 'document') {
    if (document.scrollingElement === null)
      throw new TypeError('The document scroll owner is unavailable.')
    return undefined
  }
  if (
    block.ownerKind !== 'region' ||
    inline.ownerKind !== 'region' ||
    !sameScrollOwnerTarget(block.ownerTarget, inline.ownerTarget)
  ) {
    throw new TypeError('The routed region scroll owner is inconsistent.')
  }
  const owners = document.querySelectorAll(block.ownerTarget)
  const owner = owners[0]
  if (owners.length !== 1 || !(owner instanceof HTMLElement) || !owner.isConnected)
    throw new TypeError('The routed region scroll owner is unavailable.')
  return owner
}

function sameScrollOwnerTarget(left: string, right: string): boolean {
  return left === right
}

function fragmentPosition(owner: Element, hash: string): { left: number; top: number } | undefined {
  if (hash === '') return undefined
  const targets = [...owner.querySelectorAll('[id]')].filter(
    (element) => element.id === hash.slice(1),
  )
  const target = targets[0]
  if (targets.length > 1) throw new TypeError('The routed fragment target is duplicated.')
  if (target === undefined) return undefined
  if (!target.isConnected || target.closest('.pavp-route-content') === null)
    throw new TypeError('The routed fragment target is unavailable.')
  for (
    let parent = target.parentElement;
    parent !== null && parent !== owner;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent)
    if (
      /(auto|scroll|hidden)/u.test(style.overflowX + style.overflowY) &&
      (parent.scrollWidth > parent.clientWidth || parent.scrollHeight > parent.clientHeight)
    )
      return undefined
  }
  const targetRect = target.getBoundingClientRect()
  const ownerRect =
    owner === document.scrollingElement ? { left: 0, top: 0 } : owner.getBoundingClientRect()
  return {
    left: owner.scrollLeft + targetRect.left - ownerRect.left - owner.clientLeft,
    top: owner.scrollTop + targetRect.top - ownerRect.top - owner.clientTop,
  }
}

function writeRegionPosition(
  owner: HTMLElement,
  position: { readonly left: number; readonly top: number },
): boolean {
  const style = getComputedStyle(owner)
  if (
    style.writingMode !== 'horizontal-tb' ||
    !Number.isFinite(position.left) ||
    !Number.isFinite(position.top)
  )
    return false
  const width = Math.max(0, owner.scrollWidth - owner.clientWidth)
  const height = Math.max(0, owner.scrollHeight - owner.clientHeight)
  owner.scrollLeft =
    style.direction === 'rtl'
      ? Math.max(-width, Math.min(0, position.left))
      : Math.max(0, Math.min(width, position.left))
  owner.scrollTop = Math.max(0, Math.min(height, position.top))
  return true
}

export async function createAndReadyRouter(input: {
  readonly application: App
  readonly configuration: CoreRuntimeConfiguration
  readonly startupAttemptId: string
}): Promise<RouterLifecycleHandle> {
  validateGeneratedRouteClosure()
  ensureRuntimeConfigurationReady(input.configuration)

  if (input.startupAttemptId.length === 0) {
    throw new TypeError('The Router requires the active Runtime Kernel startup attempt.')
  }

  let applicationMounted = false
  let resolveApplicationMounted: (() => void) | undefined
  const applicationMountedPromise = new Promise<void>((resolve) => {
    resolveApplicationMounted = resolve
  })
  let disposed = false
  let routerReady = false
  let localization: ConsoleI18nBoundary | undefined
  let latestNavigationResult: TypedNavigationResult | undefined
  let operation: NavigationOperation | undefined
  let nativeOperation: NavigationOperation | undefined
  let committedEntry: CommittedEntry | undefined
  const scopeId = crypto.randomUUID()
  const regionRecords = new Map<string, RegionRecord>()
  const appearance = input.application.runWithContext(useAppearanceReadBoundary)
  const navigationAttempts = new WeakMap<RouteLocationNormalized, NavigationAttemptState>()
  const presentationCommitBroker = createRouterPresentationCommitBroker()
  const history = createWebHistory(input.configuration.deploymentBase)

  function readMarker(state: unknown = window.history.state): RouteEntryMarker | undefined {
    if (state === null || typeof state !== 'object' || !('__pavpRouteEntry' in state))
      return undefined
    const marker: unknown = state.__pavpRouteEntry
    if (
      marker === null ||
      typeof marker !== 'object' ||
      Object.keys(marker).length !== 2 ||
      !('scopeId' in marker) ||
      marker.scopeId !== scopeId ||
      !('entryId' in marker) ||
      typeof marker.entryId !== 'string' ||
      marker.entryId.length === 0
    )
      return undefined
    return { scopeId, entryId: marker.entryId }
  }

  function beginOperation(
    kind: NavigationOperation['kind'],
    expectedFullPath: string,
  ): NavigationOperation {
    operation?.finish({
      kind: 'cancel',
      navigationId: operation.navigationId,
      reason: 'cancelled-by-new-navigation',
    })
    for (const reservation of [...presentationCommitBroker.reservations.values()]) {
      settleRouterPresentationCommit(presentationCommitBroker, reservation, 'cancelled')
    }
    let settled = false
    let resolveCompletion!: (result: TypedNavigationResult) => void
    const completion = new Promise<TypedNavigationResult>((resolve) => {
      resolveCompletion = resolve
    })
    const next: NavigationOperation = {
      navigationId: crypto.randomUUID(),
      kind,
      expectedFullPath,
      navigation: undefined,
      targetMarker: readMarker(),
      result: undefined,
      completion,
      finish(result) {
        if (settled) return
        settled = true
        next.result = result
        if (operation === next && result.kind !== 'duplicated') latestNavigationResult = result
        resolveCompletion(result)
      },
    }
    operation = next
    return next
  }

  function ownsNavigation(
    to: RouteLocationNormalized,
    navigation: NavigationAttemptState | undefined,
  ): navigation is NavigationAttemptState {
    return (
      !disposed &&
      navigation !== undefined &&
      navigation.operation === operation &&
      operation.navigation === to
    )
  }

  function currentLocationMatches(to: RouteLocationNormalized): boolean {
    return (
      router.currentRoute.value === to &&
      history.location === to.fullPath &&
      history.createHref(history.location) ===
        window.location.pathname + window.location.search + window.location.hash
    )
  }

  function entryIsCurrent(entry: CommittedEntry): boolean {
    return (
      committedEntry === entry &&
      ownsNavigation(entry.to, entry.navigation) &&
      currentLocationMatches(entry.to) &&
      (entry.marker === undefined || readMarker()?.entryId === entry.marker.entryId)
    )
  }

  function stampEntry(
    to: RouteLocationNormalized,
    navigation: NavigationAttemptState,
  ): RouteEntryMarker | undefined {
    let previous: RouteEntryMarker | undefined
    try {
      const state: unknown = window.history.state
      previous = readMarker(state)
      if (
        state === null ||
        typeof state !== 'object' ||
        Object.getPrototypeOf(state) !== Object.prototype ||
        Object.keys(state).length === 0 ||
        !ownsNavigation(to, navigation) ||
        !currentLocationMatches(to)
      )
        throw new Error('Entry metadata unavailable.')
      const kind = navigation.operation.kind
      if (kind === 'pop' && previous?.entryId !== navigation.operation.targetMarker?.entryId)
        throw new Error('Entry metadata changed.')
      if (kind === 'replace' && previous !== undefined) regionRecords.delete(previous.entryId)
      if (kind === 'pop' && previous !== undefined) return previous
      const marker =
        kind === 'replace' && previous !== undefined
          ? previous
          : { scopeId, entryId: crypto.randomUUID() }
      // Metadata only, after the final native commit. Preserve every foreign and vendor field.
      window.history.replaceState({ ...state, __pavpRouteEntry: marker }, '')
      if (readMarker()?.entryId !== marker.entryId) throw new Error('Entry metadata unavailable.')
      return marker
    } catch {
      if (previous !== undefined) regionRecords.delete(previous.entryId)
      return undefined
    }
  }

  function regionContext(
    to: RouteLocationNormalized,
    navigation: NavigationAttemptState,
    owner: HTMLElement,
  ): readonly (string | number)[] | undefined {
    if (
      input.configuration.environment === 'development' ||
      localization?.pendingLocale.value !== null ||
      owner.closest('[inert]') !== null
    )
      return undefined
    switch (navigation.routeName) {
      case 'console-overview':
      case 'design-token-inspector':
      case 'runtime-kernel-inspector':
      case 'router-governance-inspector':
      case 'storage-persistence-inspector':
      case 'ui-system-inspector':
      case 'responsive-layout-inspector':
      case 'engineering-quality-inspector':
      case 'capability-roadmap':
        break
      default:
        return undefined
    }
    const route = getRouteRecord(navigation.routeName)
    const capability = routeLayoutCapabilityRegistry.find(
      (candidate) => candidate.id === route.meta.layoutCapabilityId,
    )
    const profile = owner.closest<HTMLElement>('.pavp-admin-shell')?.dataset['layoutProfile']
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    const style = getComputedStyle(owner)
    if (
      capability === undefined ||
      profile === undefined ||
      !capability.allowedProfiles.some((value) => value === profile) ||
      !Number.isFinite(rootFontSize) ||
      rootFontSize <= 0 ||
      owner.clientWidth <= 0 ||
      owner.clientHeight <= 0 ||
      style.writingMode !== 'horizontal-tb' ||
      (style.direction !== 'ltr' && style.direction !== 'rtl')
    )
      return undefined
    const snapshot = appearance.snapshot.value
    return [
      scopeId,
      navigation.routeName,
      JSON.stringify([to.params, to.query, to.hash]),
      JSON.stringify([navigation.input.params, navigation.input.query]),
      input.configuration.releaseSha,
      input.configuration.buildVersion,
      localization.locale.value,
      getRouteMessageScope(navigation.routeName),
      snapshot.colorMode,
      snapshot.contrast,
      snapshot.density,
      snapshot.fontScale,
      snapshot.material,
      snapshot.motion,
      snapshot.theme.registryKind,
      snapshot.theme.themeId,
      route.meta.layoutCapabilityId,
      route.meta.blockScrollOwnerId,
      route.meta.inlineScrollOwnerId,
      profile,
      owner.clientWidth,
      owner.clientHeight,
      rootFontSize,
      style.writingMode,
      style.direction,
    ]
  }

  function retainRecord(record: RegionRecord): void {
    regionRecords.delete(record.marker.entryId)
    if (regionRecords.size === 64) {
      const oldest = regionRecords.keys().next().value
      if (oldest !== undefined) regionRecords.delete(oldest)
    }
    regionRecords.set(record.marker.entryId, record)
  }

  function captureSource(from: RouteLocationNormalized): void {
    const source = committedEntry
    if (
      source?.to !== from ||
      router.currentRoute.value !== from ||
      source.presented === undefined ||
      source.marker === undefined
    )
      return
    const owner = regionOwner(source.navigation.routeName)
    if (owner === undefined) return
    if (owner !== source.presented.owner)
      throw new TypeError('The presented source scroll owner changed.')
    const context = regionContext(from, source.navigation, owner)
    if (
      !sameContext(context, source.presented.context) ||
      context === undefined ||
      !Number.isFinite(owner.scrollLeft) ||
      !Number.isFinite(owner.scrollTop)
    ) {
      regionRecords.delete(source.marker.entryId)
      return
    }
    retainRecord({ marker: source.marker, context, left: owner.scrollLeft, top: owner.scrollTop })
  }

  const router = createRouter({
    history,
    routes,
    async scrollBehavior(to, from, savedPosition) {
      // Native programmatic duplicates pass the very same location twice; real pops do not.
      if (to === from) return false
      try {
        await applicationMountedPromise
        await nextTick()
        const entry = committedEntry
        if (!applicationMounted || entry?.to !== to || !entryIsCurrent(entry)) {
          cancelBoundRouterPresentationCommit(presentationCommitBroker, to)
          return false
        }
        const navigation = entry.navigation
        const routeRecord = getRouteRecord(navigation.routeName)
        const samePage = from.name === to.name
        const focusContract = focusContractRegistry.find(
          (contract) => contract.id === routeRecord.meta.focusContractId,
        )
        if (focusContract === undefined)
          throw new TypeError('The routed focus contract is unavailable.')
        const focusTargets = document.querySelectorAll<HTMLElement>(focusContract.target)
        const heading = focusTargets[0]
        if (
          focusTargets.length !== 1 ||
          heading?.tagName !== 'H1' ||
          !heading.isConnected ||
          heading.tabIndex !== focusContract.targetTabIndex
        )
          throw new TypeError('The routed document focus or scroll owner is unavailable.')
        const owner = regionOwner(navigation.routeName)
        advanceActiveGuardStage(navigation.guardStageProgress, 'commit-focus-and-scroll')
        document.title = getRoutePresentation(navigation.routeName, localization?.t).title
        const locked = owner?.closest('[inert]') !== null && owner !== undefined
        if (from !== START_LOCATION && !samePage && !locked) heading.focus({ preventScroll: true })
        if (!entryIsCurrent(entry)) {
          cancelBoundRouterPresentationCommit(presentationCommitBroker, to)
          return false
        }
        const preserve = samePage && navigation.operation.kind !== 'pop'
        let documentPosition: { readonly left: number; readonly top: number } | false = false
        if (!locked && entryIsCurrent(entry)) {
          if (owner === undefined) {
            const documentOwner = document.scrollingElement
            if (documentOwner === null)
              throw new TypeError('The document scroll owner is unavailable.')
            documentPosition =
              navigation.operation.kind === 'pop' && savedPosition !== null
                ? finiteNativeScrollPosition(savedPosition)
                : (fragmentPosition(
                    documentOwner,
                    preserve && from.hash === to.hash ? '' : navigation.input.hash,
                  ) ?? (preserve ? false : { left: 0, top: 0 }))
          } else {
            const context = regionContext(to, navigation, owner)
            const record =
              entry.marker === undefined ? undefined : regionRecords.get(entry.marker.entryId)
            let restored = false
            if (record !== undefined) {
              if (
                navigation.operation.kind === 'pop' &&
                record.marker.scopeId === scopeId &&
                sameContext(record.context, context) &&
                writeRegionPosition(owner, record)
              ) {
                retainRecord(record)
                restored = true
              } else regionRecords.delete(record.marker.entryId)
            }
            if (!restored) {
              const fragment = fragmentPosition(
                owner,
                preserve && from.hash === to.hash ? '' : navigation.input.hash,
              )
              if (fragment !== undefined) writeRegionPosition(owner, fragment)
              else if (!preserve) writeRegionPosition(owner, { left: 0, top: 0 })
            }
            entry.presented = { owner, context }
          }
        }
        completeActiveGuardStages(navigation.guardStageProgress)
        const result = navigation.operation.result ?? {
          kind: 'allow',
          navigationId: navigation.navigationId,
          destination: routeDestination(to),
        }
        navigation.operation.finish(result)
        resolveBoundRouterPresentationCommit(presentationCommitBroker, to)
        return documentPosition
      } catch (source: unknown) {
        rejectBoundRouterPresentationCommit(presentationCommitBroker, to, source)
        throw source
      }
    },
  })
  routerPresentationCommitBrokers.set(router, presentationCommitBroker)
  presentationCommitBroker.currentOperation = () => operation
  nativeOperation = beginOperation('initial', router.resolve(history.location).fullPath)
  const historyListenerRemover = history.listen((to) => {
    if (!disposed) nativeOperation = beginOperation('pop', router.resolve(to).fullPath)
  })

  presentationCommitBroker.routeInput = () => {
    const entry = committedEntry
    if (router.currentRoute.value !== entry?.to) return {}
    const record = getRouteRecord(entry.navigation.routeName)
    if (record.meta.routeTransitionFamilyId === 'route-family.error' || !routeHasPageInput(record))
      return {}
    return { routeInput: entry.navigation.input }
  }

  function finishNativeFailure(
    request: NavigationOperation,
    failure: NavigationFailure,
    target: RouteLocationNormalized,
  ): void {
    if (disposed || operation !== request) return
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      request.finish(
        request.result ?? { kind: 'duplicated', destination: routeDestination(target) },
      )
    } else if (isNavigationFailure(failure, NavigationFailureType.cancelled)) {
      request.finish(cancelledRouterNavigationResult(request.navigationId))
    } else {
      const recovering = request.result?.kind === 'failure'
      request.finish(
        createFailureResult({
          configuration: input.configuration,
          errorId: recovering ? 'route-redirect-loop' : 'route-navigation-failure',
          failureKind: recovering
            ? 'redirect-loop'
            : isNavigationFailure(failure, NavigationFailureType.aborted)
              ? 'aborted-by-guard'
              : 'unknown-navigation-failure',
          navigationId: request.navigationId,
          routeName: null,
          browserExplicitlyOffline: false,
        }),
      )
    }
  }

  function issueNavigation(request: NavigationOperation, target: RouteLocationResolved): void {
    if (disposed || operation !== request) return
    nativeOperation = request
    // The request is already owned; native completion must not delay logical cancellation.
    void (
      request.kind === 'replace' ? router.replace(target.fullPath) : router.push(target.fullPath)
    ).then(
      (failure) => {
        if (failure !== undefined) finishNativeFailure(request, failure, target)
      },
      () => {
        // onError owns real Router failures and its single safe-destination recovery.
        if (disposed || operation !== request || request.result !== undefined) return
        request.finish(
          createFailureResult({
            configuration: input.configuration,
            errorId: 'route-navigation-failure',
            failureKind: 'unknown-navigation-failure',
            navigationId: request.navigationId,
            routeName: null,
            browserExplicitlyOffline: false,
          }),
        )
      },
    )
  }

  presentationCommitBroker.accept = (destination, options) => {
    if (disposed) return cancelledRouterNavigationResult()
    const resolved = resolveRegisteredDestination(router, destination)
    if (resolved !== undefined && sameRouteAddress(router.currentRoute.value, resolved))
      return { kind: 'duplicated', destination: routeDestination(resolved) }
    const target = resolved ?? router.resolve({ name: 'error-invalid-route-input' })
    const request = beginOperation(
      resolved === undefined || options?.replace === true ? 'replace' : 'push',
      target.fullPath,
    )
    if (resolved === undefined)
      request.result = createFailureResult({
        configuration: input.configuration,
        errorId: 'route-input-validation-failure',
        failureKind: 'invalid-input',
        navigationId: request.navigationId,
        routeName: null,
        browserExplicitlyOffline: false,
      })
    let navigationStarted = false
    return Object.freeze({
      kind: 'accepted',
      navigationId: request.navigationId,
      resolvedTarget: resolved,
      completion: request.completion,
      isCurrent: () => !disposed && operation === request,
      navigate() {
        if (!navigationStarted && !disposed && operation === request) {
          navigationStarted = true
          issueNavigation(request, target)
        }
        return request.completion
      },
      cancelBeforeStart() {
        if (navigationStarted || operation !== request) return
        request.finish(cancelledRouterNavigationResult(request.navigationId))
        for (const reservation of [...presentationCommitBroker.reservations.values()]) {
          settleRouterPresentationCommit(presentationCommitBroker, reservation, 'cancelled')
        }
        operation = undefined
      },
    })
  }

  const beforeEachRemover = router.beforeEach((to) => {
    const request = nativeOperation
    if (
      disposed ||
      request === undefined ||
      request !== operation ||
      (to.redirectedFrom?.fullPath ?? to.fullPath) !== request.expectedFullPath
    )
      return false
    request.navigation = to
    const navigationId = request.navigationId
    const guardStageProgress = createActiveGuardStageProgress()
    advanceActiveGuardStage(guardStageProgress, 'validate-route-contract')
    const validated = validateRouteInput(to)
    advanceActiveGuardStage(guardStageProgress, 'ensure-runtime-configuration-ready')
    ensureRuntimeConfigurationReady(input.configuration)
    advanceActiveGuardStage(guardStageProgress, 'resolve-router-owned-safe-destination')
    if (validated.kind === 'invalid') {
      if (request.result?.kind === 'failure') {
        request.finish(
          createFailureResult({
            configuration: input.configuration,
            errorId: 'route-redirect-loop',
            failureKind: 'redirect-loop',
            navigationId,
            routeName: null,
            browserExplicitlyOffline: false,
          }),
        )
        return false
      }
      bindRouterPresentationCommit(presentationCommitBroker, to, undefined, navigationId)
      const failure = createFailureResult({
        configuration: input.configuration,
        errorId: 'route-input-validation-failure',
        failureKind: 'invalid-input',
        navigationId,
        routeName: null,
        browserExplicitlyOffline: false,
      })
      request.result = failure
      request.kind = 'replace'
      return { name: failure.destination.name, replace: true }
    }
    const routeName = validated.input.name
    navigationAttempts.set(to, {
      navigationId,
      routeName,
      input: validated.input,
      operation: request,
      guardStageProgress,
      componentResolutionReached: false,
    })
    bindRouterPresentationCommit(presentationCommitBroker, to, routeName, navigationId)
    if (routeName === getErrorRouteName('404'))
      request.result = createFailureResult({
        configuration: input.configuration,
        errorId: 'route-not-found',
        failureKind: 'route-not-found',
        navigationId,
        routeName,
        browserExplicitlyOffline: false,
      })
    return true
  })

  const beforeResolveRemover = router.beforeResolve(async (to, from) => {
    const navigation = navigationAttempts.get(to)
    if (!ownsNavigation(to, navigation)) return false
    const routeName = navigation.routeName
    advanceActiveGuardStage(navigation.guardStageProgress, 'prepare-route-presentation')
    navigation.componentResolutionReached = true
    const presentation = getRoutePresentation(routeName)
    if (routeTitleRegistry[getRouteRecord(routeName).meta.titleKey] !== presentation.title)
      throw new TypeError('The route presentation authority is incomplete.')
    if (localization !== undefined) {
      const prepared = await localization.prepareScope(getRouteMessageScope(routeName))
      if (!ownsNavigation(to, navigation) || prepared.status === 'cancelled') return false
      if (prepared.status === 'failed') {
        const recovering = navigation.operation.result?.kind === 'failure'
        const failure = createFailureResult({
          configuration: input.configuration,
          errorId: recovering ? 'route-redirect-loop' : 'route-chunk-load-failure',
          failureKind: recovering ? 'redirect-loop' : 'chunk-load-failed',
          navigationId: navigation.navigationId,
          routeName,
          browserExplicitlyOffline: !navigator.onLine,
        })
        if (recovering) {
          navigation.operation.finish(failure)
          return false
        }
        navigation.operation.result = failure
        navigation.operation.kind = 'replace'
        return { name: failure.destination.name, replace: true }
      }
    }
    if (!ownsNavigation(to, navigation)) return false
    captureSource(from)
    return true
  })

  const afterEachRemover = router.afterEach((to, _from, failure) => {
    const navigation = navigationAttempts.get(to)
    if (failure === undefined) {
      if (!ownsNavigation(to, navigation) || !currentLocationMatches(to)) return
      const marker = stampEntry(to, navigation)
      committedEntry = { to, navigation, marker, presented: undefined }
      if (navigation.operation.result === undefined && to.redirectedFrom !== undefined)
        navigation.operation.result = {
          kind: 'redirect',
          navigationId: navigation.navigationId,
          reason: 'redirected',
          destination: routeDestination(to),
          replace: true,
        }
      return
    }
    cancelBoundRouterPresentationCommit(presentationCommitBroker, to)
    if (!ownsNavigation(to, navigation)) return
    finishNativeFailure(navigation.operation, failure, to)
  })

  const errorHandlerRemover = router.onError((source, to) => {
    rejectBoundRouterPresentationCommit(presentationCommitBroker, to, source)
    const navigation = navigationAttempts.get(to)
    if (!routerReady || !ownsNavigation(to, navigation)) return
    const request = navigation.operation
    const recovering = request.result?.kind === 'failure'
    const chunkLoadFailure = !navigation.componentResolutionReached
    const failure = createFailureResult({
      configuration: input.configuration,
      errorId: recovering
        ? 'route-redirect-loop'
        : chunkLoadFailure
          ? 'route-chunk-load-failure'
          : 'route-navigation-failure',
      failureKind: recovering
        ? 'redirect-loop'
        : chunkLoadFailure
          ? 'chunk-load-failed'
          : 'unknown-navigation-failure',
      navigationId: navigation.navigationId,
      routeName: navigation.routeName,
      browserExplicitlyOffline: chunkLoadFailure && !navigator.onLine,
    })
    request.result = failure
    latestNavigationResult = failure
    if (recovering || to.name === failure.destination.name) {
      request.finish(failure)
      return
    }
    request.kind = 'replace'
    const target = router.resolve({ name: failure.destination.name })
    request.expectedFullPath = target.fullPath
    issueNavigation(request, target)
  })

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    operation?.finish({
      kind: 'cancel',
      navigationId: operation.navigationId,
      reason: 'cancelled-by-new-navigation',
    })
    operation = undefined
    nativeOperation = undefined
    committedEntry = undefined
    regionRecords.clear()
    localization = undefined
    disposeRouterPresentationCommitBroker(router, presentationCommitBroker)
    resolveApplicationMounted?.()
    resolveApplicationMounted = undefined
    const failures: unknown[] = []
    for (const remove of [
      errorHandlerRemover,
      afterEachRemover,
      beforeResolveRemover,
      beforeEachRemover,
      historyListenerRemover,
    ]) {
      try {
        remove()
      } catch (source: unknown) {
        failures.push(source)
      }
    }
    try {
      history.destroy()
    } catch (source: unknown) {
      failures.push(source)
    }
    if (failures.length !== 0) {
      latestNavigationResult = createFailureResult({
        configuration: input.configuration,
        errorId: 'route-disposal-failure',
        failureKind: 'route-disposal-failed',
        navigationId: crypto.randomUUID(),
        routeName: null,
        browserExplicitlyOffline: false,
      })
      throw new Error('Router disposal was incomplete.')
    }
  }

  const handle: RouterLifecycleHandle = {
    router,
    history,
    guardRemovers: Object.freeze([beforeEachRemover, beforeResolveRemover, afterEachRemover]),
    errorHandlerRemover,
    connectLocalization(boundary) {
      if (disposed || localization !== undefined)
        throw new Error('The Router locale binding is unavailable.')
      localization = boundary
      return () => {
        if (localization === boundary) localization = undefined
      }
    },
    refreshCurrentRouteTitle(translate) {
      if (disposed) return
      const record = getRouteRecord(router.currentRoute.value.name)
      document.title = getRoutePresentation(record.name, translate).title
    },
    markApplicationMounted() {
      if (disposed || applicationMounted) return
      applicationMounted = true
      resolveApplicationMounted?.()
      resolveApplicationMounted = undefined
    },
    getLatestNavigationResult() {
      return latestNavigationResult
    },
    dispose,
  }
  try {
    input.application.use(router)
    await router.isReady()
    routerReady = true
    return handle
  } catch (source: unknown) {
    try {
      dispose()
    } catch {
      /* The original startup failure remains the sole startup boundary. */
    }
    throw source
  }
}
