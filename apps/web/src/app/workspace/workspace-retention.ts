import {
  KeepAlive,
  cloneVNode,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onErrorCaptured,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
  shallowReactive,
  shallowRef,
  watch,
  watchEffect,
  type Component,
  type InjectionKey,
  type PropType,
  type VNode,
} from 'vue'

import type { ConsoleTranslate } from '../../shared/i18n'
import { appErrorBoundaryHooksKey, type NormalizedCoreError } from '../errors/core-error'
import { getCoreErrorMessage } from '../errors/core-error-messages'
import { getCoreErrorRecord } from '../errors/core-error-registry'
import { normalizeVueComponentFailure, resolveVueLifecyclePhase } from '../errors/error-normalizer'
import {
  focusContractRegistry,
  getRoutePresentation,
  getRouteRecord,
} from '../router/route-registry'
import type { WorkspaceRenderSnapshot } from '../router/router-scroll-controller'
import { workspaceInstanceKey } from './workspace-content'
import {
  isLiveWorkspace,
  type LiveWorkspaceEntry,
  type useWorkspaceStore,
  type WorkspaceEntry,
  type WorkspaceInstanceIdentity,
} from './workspace.store'

interface RefreshRequest {
  readonly signal: AbortSignal
  isCurrent(): boolean
  replace(prepare: (replacement: LiveWorkspaceEntry) => void): LiveWorkspaceEntry | undefined
}

interface WorkspaceRetentionCommands {
  isHealthy(entry: LiveWorkspaceEntry): boolean
  close(entry: WorkspaceEntry): Promise<boolean>
  refresh(
    entry: LiveWorkspaceEntry,
    request: RefreshRequest,
  ): Promise<LiveWorkspaceEntry | undefined>
}

export const workspaceRetentionKey: InjectionKey<WorkspaceRetentionCommands> =
  Symbol('workspace-retention')

type PagePresentation = 'page' | 'component-fallback'

interface PageLifetime {
  snapshot: WorkspaceRenderSnapshot
  failure: NormalizedCoreError | undefined
  disposalFailure: { readonly cause: unknown } | undefined
  disposing: boolean
  released: boolean
}

interface RetainedPage extends PageLifetime {
  readonly instance: WorkspaceInstanceIdentity
  definition: Component | undefined
  predecessor: RetainedPage | undefined
  established: boolean
}

interface PresentationAcknowledgment {
  readonly snapshot: WorkspaceRenderSnapshot
  readonly presentation: PagePresentation
}

function sameDelivery(
  left: WorkspaceRenderSnapshot | undefined,
  right: WorkspaceRenderSnapshot,
): boolean {
  return left?.commit === right.commit && left.workspace === right.workspace
}

function sameLifetime(left: WorkspaceRenderSnapshot, right: WorkspaceRenderSnapshot): boolean {
  return left.workspace === undefined
    ? right.workspace === undefined && left.routeName === right.routeName
    : left.workspace.instance === right.workspace?.instance
}

export function createWorkspaceRetention(
  workspace: ReturnType<typeof useWorkspaceStore>,
  translate: ConsoleTranslate,
) {
  const pages = shallowReactive(new Map<WorkspaceInstanceIdentity, RetainedPage>())
  const requested = shallowRef<WorkspaceRenderSnapshot>()
  const active = shallowRef<WorkspaceRenderSnapshot>()
  const acknowledged = shallowRef<PresentationAcknowledgment>()
  const disposed = shallowRef(false)
  const ordinary = shallowRef<PageLifetime>()
  let matched: { snapshot: WorkspaceRenderSnapshot; vnode: VNode } | undefined
  let issued: PresentationAcknowledgment | undefined
  let exiting: PresentationAcknowledgment | undefined

  function currentLifetime(snapshot: WorkspaceRenderSnapshot): PageLifetime | undefined {
    return snapshot.workspace === undefined
      ? ordinary.value !== undefined && sameDelivery(ordinary.value.snapshot, snapshot)
        ? ordinary.value
        : undefined
      : pages.get(snapshot.workspace.instance)
  }

  function readFailure(snapshot: WorkspaceRenderSnapshot): NormalizedCoreError | undefined {
    return owns(snapshot) ? currentLifetime(snapshot)?.failure : undefined
  }

  function owns(snapshot: WorkspaceRenderSnapshot): boolean {
    return (
      !disposed.value &&
      sameDelivery(requested.value, snapshot) &&
      (snapshot.workspace === undefined
        ? workspace.active === undefined
        : workspace.active === snapshot.workspace)
    )
  }

  function advance(): void {
    if (disposed.value || exiting !== undefined) return
    const next = requested.value
    const current = active.value
    if (
      current !== undefined &&
      (next === undefined || !owns(next) || !sameLifetime(current, next))
    ) {
      // A scheduled child that never rendered has no exit callback to await.
      exiting = issued
      active.value = undefined
      if (exiting !== undefined) return
    }
    if (next === undefined || !owns(next)) return
    if (next.workspace !== undefined) {
      const page = pages.get(next.workspace.instance)
      if (
        page?.definition === undefined ||
        page.predecessor?.released === false ||
        page.predecessor?.disposalFailure !== undefined
      )
        return
      page.predecessor = undefined
    } else if (matched === undefined || !sameDelivery(matched.snapshot, next)) return
    if (!sameDelivery(active.value, next)) active.value = next
  }

  function exit(snapshot: WorkspaceRenderSnapshot, presentation: PagePresentation): void {
    if (issued?.snapshot === snapshot && issued.presentation === presentation) issued = undefined
    if (exiting?.snapshot !== snapshot || exiting.presentation !== presentation) return
    exiting = undefined
    advance()
  }

  function ensurePage(
    snapshot: WorkspaceRenderSnapshot,
    predecessor?: RetainedPage,
  ): RetainedPage | undefined {
    const entry = snapshot.workspace
    if (entry === undefined) return undefined
    let page = pages.get(entry.instance)
    if (page === undefined) {
      page = shallowReactive({
        instance: entry.instance,
        snapshot,
        definition: predecessor?.definition,
        predecessor:
          predecessor?.established === true && !predecessor.released ? predecessor : undefined,
        established: false,
        released: false,
        failure: undefined,
        disposalFailure: undefined,
        disposing: false,
      })
      pages.set(entry.instance, page)
    } else page.snapshot = snapshot
    return page
  }

  function acceptCommitted(snapshot: WorkspaceRenderSnapshot): void {
    if (disposed.value || sameDelivery(requested.value, snapshot)) return
    ensurePage(snapshot)
    requested.value = snapshot
    advance()
  }

  // All waits stop on settlement, including synchronous settlement and an already-aborted signal.
  function waitFor(
    read: () => boolean | undefined,
    signal?: AbortSignal,
  ): { promise: Promise<boolean>; cancel(): void } {
    let cancel = (): void => undefined
    if (disposed.value || signal?.aborted === true)
      return { promise: Promise.resolve(false), cancel }
    const promise = new Promise<boolean>((resolve, reject) => {
      let settled = false
      let stop = (): void => undefined
      const finish = (value: boolean, error?: { cause: unknown }): void => {
        if (settled) return
        settled = true
        stop()
        signal?.removeEventListener('abort', abort)
        if (error === undefined) resolve(value)
        else
          reject(
            error.cause instanceof Error
              ? error.cause
              : new Error('Workspace rendering failed.', { cause: error.cause }),
          )
      }
      const abort = (): void => {
        finish(false)
      }
      cancel = abort
      signal?.addEventListener('abort', abort, { once: true })
      stop = watchEffect(
        () => {
          try {
            const value = disposed.value || signal?.aborted === true ? false : read()
            if (value !== undefined) finish(value)
          } catch (cause: unknown) {
            finish(false, { cause })
          }
        },
        { flush: 'sync' },
      )
      const isSettled = (): boolean => settled
      if (isSettled()) stop()
    })
    return { promise, cancel }
  }

  async function whenRendered(
    snapshot: WorkspaceRenderSnapshot,
    signal: AbortSignal,
  ): Promise<PagePresentation | 'cancelled'> {
    const rendered = await waitFor(() => {
      if (!owns(snapshot)) return false
      const lifetime = currentLifetime(snapshot)
      if (lifetime?.disposalFailure !== undefined) throw lifetime.disposalFailure.cause
      const presentation = lifetime?.failure === undefined ? 'page' : 'component-fallback'
      return sameDelivery(acknowledged.value?.snapshot, snapshot) &&
        acknowledged.value?.presentation === presentation
        ? true
        : undefined
    }, signal).promise
    if (!rendered || !owns(snapshot) || signal.aborted) return 'cancelled'
    const disposalFailure = currentLifetime(snapshot)?.disposalFailure
    if (disposalFailure !== undefined) throw disposalFailure.cause
    // A capture between the synchronous ACK and this continuation invalidates that ACK.
    const presentation = readFailure(snapshot) === undefined ? 'page' : 'component-fallback'
    return acknowledged.value?.presentation === presentation
      ? presentation
      : whenRendered(snapshot, signal)
  }

  function waitReleased(page: RetainedPage | undefined, signal?: AbortSignal) {
    return waitFor(() => {
      if (page?.disposalFailure !== undefined) throw page.disposalFailure.cause
      if (page === undefined || !page.established || page.released) return true
      return undefined
    }, signal)
  }

  const stopEntries = watch(
    () => workspace.entries,
    (entries) => {
      for (const [instance, page] of pages) {
        if (entries.some((entry) => isLiveWorkspace(entry) && entry.instance === instance)) continue
        pages.delete(instance)
        if (!page.established) page.released = true
      }
    },
    { flush: 'sync' },
  )

  const commands: WorkspaceRetentionCommands = {
    isHealthy(entry) {
      const snapshot = requested.value
      return (
        snapshot?.workspace === entry &&
        owns(snapshot) &&
        sameDelivery(acknowledged.value?.snapshot, snapshot) &&
        acknowledged.value?.presentation === 'page' &&
        currentLifetime(snapshot)?.disposalFailure === undefined &&
        readFailure(snapshot) === undefined
      )
    },
    async close(entry) {
      if (
        disposed.value ||
        !workspace.entries.includes(entry) ||
        workspace.activeIdentity === entry.identity ||
        !workspace.canDiscard(entry)
      )
        return false
      const page = isLiveWorkspace(entry) ? pages.get(entry.instance) : undefined
      if (page?.disposalFailure !== undefined) throw page.disposalFailure.cause
      const released = waitReleased(page)
      try {
        workspace.discard(entry)
        const removed = !workspace.entries.includes(entry)
        if (!removed) released.cancel()
        return (await released.promise) && removed
      } finally {
        released.cancel()
      }
    },
    async refresh(entry, request) {
      const snapshot = requested.value
      if (
        disposed.value ||
        request.signal.aborted ||
        !request.isCurrent() ||
        snapshot?.workspace !== entry ||
        !sameDelivery(acknowledged.value?.snapshot, snapshot) ||
        acknowledged.value?.presentation !==
          (readFailure(snapshot) === undefined ? 'page' : 'component-fallback') ||
        workspace.active !== entry ||
        !workspace.canDiscard(entry)
      )
        return undefined
      const old = pages.get(entry.instance)
      if (old?.disposalFailure !== undefined) throw old.disposalFailure.cause
      // Register before the synchronous CAS; no callback can be missed by the subsequent wait.
      const released = waitReleased(old, request.signal)
      try {
        const replacement = request.replace((replacement) => {
          // Install the release prerequisite before Router publishes the replacement.
          ensurePage(Object.freeze({ ...snapshot, workspace: replacement }), old)
        })
        if (replacement === undefined) {
          released.cancel()
          await released.promise
          return undefined
        }
        const next = Object.freeze({ ...snapshot, workspace: replacement })
        if (!(await released.promise) || !request.isCurrent() || !owns(next)) return undefined
        if (
          (await whenRendered(next, request.signal)) !== 'page' ||
          !request.isCurrent() ||
          !owns(next) ||
          readFailure(next) !== undefined
        )
          return undefined
        return replacement
      } finally {
        // Cancelling this wait never revokes an already allocated replacement.
        released.cancel()
      }
    },
  }

  return {
    pages,
    active,
    commands,
    acceptCommitted,
    whenRendered,
    readFailure,
    ownsLifetime(lifetime: PageLifetime) {
      return (
        !disposed.value && !lifetime.released && currentLifetime(lifetime.snapshot) === lifetime
      )
    },
    ordinary(snapshot: WorkspaceRenderSnapshot) {
      const lifetime = shallowReactive<PageLifetime>({
        snapshot,
        failure: undefined,
        disposalFailure: undefined,
        disposing: false,
        released: false,
      })
      ordinary.value = lifetime
      return lifetime
    },
    message(error: NormalizedCoreError) {
      return getCoreErrorMessage(getCoreErrorRecord(error.id).userMessageKey, translate)
    },
    presentation: (snapshot: WorkspaceRenderSnapshot) =>
      getRoutePresentation(snapshot.routeName, translate),
    match(snapshot: WorkspaceRenderSnapshot | undefined, vnode: VNode | undefined) {
      if (snapshot === undefined || vnode === undefined || !sameDelivery(requested.value, snapshot))
        return
      matched = { snapshot, vnode }
      const page =
        snapshot.workspace === undefined ? undefined : pages.get(snapshot.workspace.instance)
      if (page !== undefined) {
        if (typeof vnode.type !== 'object' && typeof vnode.type !== 'function') {
          const cause = new TypeError('The matched Workspace component definition is unavailable.')
          page.disposalFailure = { cause }
          throw cause
        }
        page.definition = vnode.type as Component
      }
      advance()
    },
    ordinaryVNode(snapshot: WorkspaceRenderSnapshot): VNode {
      if (matched === undefined || !sameDelivery(matched.snapshot, snapshot))
        throw new TypeError('The committed RouterView result is unavailable.')
      return cloneVNode(matched.vnode, {
        ...snapshot.inputProps,
        ...getRoutePresentation(snapshot.routeName, translate),
      })
    },
    entered(snapshot: WorkspaceRenderSnapshot, presentation: PagePresentation) {
      if (owns(snapshot) && sameDelivery(active.value, snapshot))
        issued = { snapshot, presentation }
    },
    rendered(snapshot: WorkspaceRenderSnapshot, presentation: PagePresentation) {
      if (
        owns(snapshot) &&
        sameDelivery(active.value, snapshot) &&
        currentLifetime(snapshot)?.disposalFailure === undefined &&
        presentation === (readFailure(snapshot) === undefined ? 'page' : 'component-fallback') &&
        (!sameDelivery(acknowledged.value?.snapshot, snapshot) ||
          acknowledged.value?.presentation !== presentation)
      )
        acknowledged.value = { snapshot, presentation }
    },
    exit,
    released(page: RetainedPage) {
      page.released = true
      if (exiting?.snapshot.workspace?.instance === page.instance)
        exit(exiting.snapshot, exiting.presentation)
      advance()
    },
    dispose() {
      if (disposed.value) return
      disposed.value = true
      stopEntries()
      pages.clear()
      requested.value = active.value = undefined
      acknowledged.value = ordinary.value = undefined
      matched = issued = exiting = undefined
    },
  }
}

type RetentionController = ReturnType<typeof createWorkspaceRetention>
const controllerProp = { type: Object as PropType<RetentionController>, required: true } as const
const snapshotProp = { type: Object as PropType<WorkspaceRenderSnapshot>, required: true } as const

function usePageFailure(controller: RetentionController, lifetime: PageLifetime): void {
  const hooks = inject(appErrorBoundaryHooksKey)
  if (hooks === undefined) throw new TypeError('The application error boundary is unavailable.')
  let releasing = false
  onBeforeUnmount(() => {
    releasing = lifetime.disposing = true
  })
  onUpdated(() => {
    if (!releasing) lifetime.disposing = false
  })
  onErrorCaptured((source, _instance, info) => {
    if (hooks.getStartupState() === 'starting') return undefined
    // Teardown belongs to the outer failure path; only it normalizes and captures this source.
    if (!lifetime.released && lifetime.disposing) {
      lifetime.disposalFailure = { cause: source }
      return undefined
    }
    const error = normalizeVueComponentFailure({
      source,
      startupAttemptId: hooks.startupAttemptId,
      vueLifecyclePhase: resolveVueLifecyclePhase(info),
      releaseSha: hooks.releaseSha,
      buildVersion: hooks.buildVersion,
    })
    hooks.capture(error)
    if (lifetime.released) return false
    if (controller.ownsLifetime(lifetime)) lifetime.failure ??= error
    return false
  })
}

function renderPageFailure(
  controller: RetentionController,
  lifetime: PageLifetime,
  snapshot: WorkspaceRenderSnapshot,
  onVnodeMounted: () => void,
  onVnodeUnmounted: () => void,
): VNode {
  const error = lifetime.failure
  const focus = focusContractRegistry.find(
    (record) => record.id === getRouteRecord(snapshot.routeName).meta.focusContractId,
  )
  const target = focus?.target.match(/^h1\[data-route-focus="([^"]+)"\]$/u)?.[1]
  if (error === undefined || focus === undefined || target === undefined)
    throw new TypeError('The page error presentation is unavailable.')
  const message = controller.message(error)
  // These semantic classes are already extracted from AppErrorBoundary.vue.
  return h(
    'section',
    {
      class:
        'leading-body font-body-family px-page-inline py-section-block text-body text-text-primary',
      role: 'alert',
      'aria-live': 'assertive',
      onVnodeMounted,
      onVnodeUnmounted,
    },
    [
      h(
        'h1',
        {
          class: 'leading-title font-title-weight m-0 text-title',
          'data-route-focus': target,
          tabindex: focus.targetTabIndex,
        },
        message.title,
      ),
      h('p', { class: 'text-text-secondary' }, message.description),
    ],
  )
}

const InstanceBoundary = defineComponent({
  props: {
    controller: controllerProp,
    page: { type: Object as PropType<RetainedPage>, required: true },
    snapshot: snapshotProp,
    active: Boolean,
  },
  setup(props) {
    const page = props.page
    page.established = true
    provide(workspaceInstanceKey, page.instance)
    usePageFailure(props.controller, page)
    let delivered: WorkspaceRenderSnapshot | undefined
    let mounted: PagePresentation | undefined
    let pageAttached = false
    onUpdated(() => {
      if (props.active && mounted !== undefined && delivered === props.snapshot)
        props.controller.rendered(delivered, mounted)
    })
    onUnmounted(() => {
      props.controller.released(page)
    })
    return () => {
      if (page.failure !== undefined) {
        if (pageAttached) page.disposing = true
        pageAttached = false
        if (!props.active) return null
        const snapshot = props.snapshot
        delivered = snapshot
        props.controller.entered(snapshot, 'component-fallback')
        return renderPageFailure(
          props.controller,
          page,
          snapshot,
          () => {
            if (delivered === snapshot) mounted = 'component-fallback'
            props.controller.rendered(snapshot, 'component-fallback')
          },
          () => {
            if (delivered === snapshot && mounted === 'component-fallback') mounted = undefined
            props.controller.exit(snapshot, 'component-fallback')
          },
        )
      }
      pageAttached = true
      return h(KeepAlive, null, {
        default: () => {
          if (!props.active || page.definition === undefined) return null
          const snapshot = props.snapshot
          delivered = snapshot
          props.controller.entered(snapshot, 'page')
          return h(page.definition, {
            ...snapshot.inputProps,
            ...props.controller.presentation(snapshot),
            onVnodeMounted: () => {
              if (delivered === snapshot && page.failure === undefined) mounted = 'page'
              props.controller.rendered(snapshot, 'page')
            },
            onVnodeUnmounted: () => {
              if (delivered === snapshot && mounted === 'page') mounted = undefined
              props.controller.exit(snapshot, 'page')
            },
          })
        },
      })
    }
  },
})

const OrdinaryBoundary = defineComponent({
  props: { controller: controllerProp, snapshot: snapshotProp },
  setup(props) {
    const lifetime = props.controller.ordinary(props.snapshot)
    usePageFailure(props.controller, lifetime)
    let delivered = props.snapshot
    let presentation: PagePresentation = 'page'
    let mounted: PagePresentation | undefined
    const acknowledge = (): void => {
      if (presentation === 'page' || mounted === 'component-fallback')
        props.controller.rendered(delivered, presentation)
    }
    onMounted(acknowledge)
    onUpdated(acknowledge)
    onUnmounted(() => {
      lifetime.released = true
      props.controller.exit(delivered, presentation)
    })
    return () => {
      delivered = props.snapshot
      lifetime.snapshot = delivered
      if (lifetime.failure !== undefined) {
        if (presentation === 'page') lifetime.disposing = true
        presentation = 'component-fallback'
        props.controller.entered(delivered, presentation)
        const snapshot = delivered
        return renderPageFailure(
          props.controller,
          lifetime,
          snapshot,
          () => {
            if (delivered === snapshot) mounted = 'component-fallback'
            props.controller.rendered(snapshot, 'component-fallback')
          },
          () => {
            if (delivered === snapshot) mounted = undefined
          },
        )
      }
      props.controller.entered(delivered, presentation)
      return props.controller.ordinaryVNode(delivered)
    }
  },
})

export const WorkspaceRetentionHost = defineComponent({
  props: {
    controller: controllerProp,
    snapshot: { type: Object as PropType<WorkspaceRenderSnapshot | undefined>, default: undefined },
    component: { type: Object as PropType<VNode | undefined>, default: undefined },
  },
  setup(props) {
    watch(
      () => [props.snapshot, props.component] as const,
      ([snapshot, component]) => {
        props.controller.match(snapshot, component)
      },
      { immediate: true, flush: 'sync' },
    )
    return () => {
      const controller = props.controller
      const active = controller.active.value
      return [
        ...[...controller.pages.values()]
          .filter((page) => page.definition !== undefined)
          .map((page) =>
            h(InstanceBoundary, {
              key: page.instance,
              controller,
              page,
              snapshot: page.snapshot,
              active: active?.workspace?.instance === page.instance,
            }),
          ),
        active !== undefined && active.workspace === undefined
          ? h(OrdinaryBoundary, { key: 'ordinary', controller, snapshot: active })
          : null,
      ]
    }
  },
})
