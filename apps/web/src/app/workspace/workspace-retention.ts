import {
  KeepAlive,
  cloneVNode,
  defineComponent,
  h,
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
import { getRoutePresentation } from '../router/route-registry'
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
  close(entry: WorkspaceEntry): Promise<boolean>
  refresh(
    entry: LiveWorkspaceEntry,
    request: RefreshRequest,
  ): Promise<LiveWorkspaceEntry | undefined>
}

export const workspaceRetentionKey: InjectionKey<WorkspaceRetentionCommands> =
  Symbol('workspace-retention')

interface RetainedPage {
  readonly instance: WorkspaceInstanceIdentity
  snapshot: WorkspaceRenderSnapshot
  definition: Component | undefined
  predecessor: RetainedPage | undefined
  established: boolean
  released: boolean
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
  const acknowledged = shallowRef<WorkspaceRenderSnapshot>()
  const disposed = shallowRef(false)
  const failure = shallowRef<{ snapshot: WorkspaceRenderSnapshot; cause: unknown }>()
  let matched: { snapshot: WorkspaceRenderSnapshot; vnode: VNode } | undefined
  let issued: WorkspaceRenderSnapshot | undefined
  let exiting: WorkspaceRenderSnapshot | undefined

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
      if (page?.definition === undefined || page.predecessor?.released === false) return
      page.predecessor = undefined
    } else if (matched === undefined || !sameDelivery(matched.snapshot, next)) return
    if (!sameDelivery(active.value, next)) active.value = next
  }

  function exit(snapshot: WorkspaceRenderSnapshot): void {
    if (issued === snapshot) issued = undefined
    if (exiting !== snapshot) return
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

  function whenRendered(snapshot: WorkspaceRenderSnapshot, signal: AbortSignal): Promise<boolean> {
    return waitFor(() => {
      if (failure.value !== undefined && sameDelivery(failure.value.snapshot, snapshot))
        throw failure.value.cause
      if (!owns(snapshot)) return false
      return sameDelivery(acknowledged.value, snapshot) ? true : undefined
    }, signal).promise
  }

  function waitReleased(page: RetainedPage | undefined, signal?: AbortSignal) {
    return waitFor(() => {
      if (page === undefined || !page.established || page.released) return true
      if (failure.value?.snapshot.workspace?.instance === page.instance) throw failure.value.cause
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
    async close(entry) {
      if (
        disposed.value ||
        !workspace.entries.includes(entry) ||
        workspace.activeIdentity === entry.identity ||
        !workspace.canDiscard(entry)
      )
        return false
      const page = isLiveWorkspace(entry) ? pages.get(entry.instance) : undefined
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
        !sameDelivery(acknowledged.value, snapshot) ||
        workspace.active !== entry ||
        !workspace.canDiscard(entry)
      )
        return undefined
      const old = pages.get(entry.instance)
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
        if (!(await whenRendered(next, request.signal)) || !request.isCurrent() || !owns(next))
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
    readFailure(snapshot: WorkspaceRenderSnapshot) {
      return failure.value !== undefined && sameDelivery(failure.value.snapshot, snapshot)
        ? failure.value
        : undefined
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
          failure.value = { snapshot, cause }
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
    entered(snapshot: WorkspaceRenderSnapshot) {
      if (!disposed.value) issued = snapshot
    },
    rendered(snapshot: WorkspaceRenderSnapshot) {
      if (
        owns(snapshot) &&
        sameDelivery(active.value, snapshot) &&
        !sameDelivery(acknowledged.value, snapshot)
      )
        acknowledged.value = snapshot
    },
    exit,
    released(page: RetainedPage) {
      page.released = true
      if (exiting?.workspace?.instance === page.instance) exit(exiting)
      advance()
    },
    fail(snapshot: WorkspaceRenderSnapshot, cause: unknown) {
      failure.value = { snapshot, cause }
    },
    dispose() {
      if (disposed.value) return
      disposed.value = true
      stopEntries()
      pages.clear()
      requested.value = active.value = acknowledged.value = undefined
      matched = issued = exiting = undefined
      failure.value = undefined
    },
  }
}

type RetentionController = ReturnType<typeof createWorkspaceRetention>
const controllerProp = { type: Object as PropType<RetentionController>, required: true } as const
const snapshotProp = { type: Object as PropType<WorkspaceRenderSnapshot>, required: true } as const

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
    let delivered: WorkspaceRenderSnapshot | undefined
    let mounted = false
    onUpdated(() => {
      if (props.active && mounted && delivered === props.snapshot)
        props.controller.rendered(delivered)
    })
    onUnmounted(() => {
      props.controller.released(page)
    })
    onErrorCaptured((cause) => {
      props.controller.fail(page.snapshot, cause)
    })
    return () =>
      h(KeepAlive, null, {
        default: () => {
          if (!props.active || page.definition === undefined) return null
          const snapshot = props.snapshot
          delivered = snapshot
          props.controller.entered(snapshot)
          return h(page.definition, {
            ...snapshot.inputProps,
            ...props.controller.presentation(snapshot),
            onVnodeMounted: () => {
              mounted = true
              props.controller.rendered(snapshot)
            },
            onVnodeUnmounted: () => {
              mounted = false
              props.controller.exit(snapshot)
            },
          })
        },
      })
  },
})

const OrdinaryBoundary = defineComponent({
  props: { controller: controllerProp, snapshot: snapshotProp },
  setup(props) {
    let delivered = props.snapshot
    const acknowledge = (): void => {
      props.controller.rendered(delivered)
    }
    onMounted(acknowledge)
    onUpdated(acknowledge)
    onUnmounted(() => {
      props.controller.exit(delivered)
    })
    onErrorCaptured((cause) => {
      props.controller.fail(delivered, cause)
    })
    return () => {
      delivered = props.snapshot
      props.controller.entered(delivered)
      try {
        return props.controller.ordinaryVNode(delivered)
      } catch (cause: unknown) {
        props.controller.fail(delivered, cause)
        throw cause
      }
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
