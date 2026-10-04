import {
  inject,
  nextTick,
  onScopeDispose,
  shallowRef,
  watch,
  type InjectionKey,
  type WatchSource,
} from 'vue'

import type { WorkspaceInstanceIdentity } from './workspace.store'

export const workspaceInstanceKey: InjectionKey<WorkspaceInstanceIdentity> =
  Symbol('workspace-instance')

export interface WorkspaceContentState {
  readonly revision: number
  readonly ready: boolean
}

export const workspaceContentKey: InjectionKey<
  (instance: WorkspaceInstanceIdentity, read: () => WorkspaceContentState) => () => void
> = Symbol('workspace-content')

// Used by the current mutable appearance consumer. Revisions describe real content changes,
// never activations or mount counts; the Router owns the associated scroll record.
export function useWorkspaceContentRevision(source: WatchSource): void {
  const register = inject(workspaceContentKey)
  const instance = inject(workspaceInstanceKey)
  if (register === undefined || instance === undefined)
    throw new TypeError('The Workspace content boundary is unavailable.')
  const state = shallowRef<WorkspaceContentState>({ revision: 0, ready: false })
  let disposed = false
  const release = register(instance, () => state.value)
  watch(
    source,
    async () => {
      const revision = state.value.revision + 1
      state.value = { revision, ready: false }
      await nextTick()
      if (!disposed && state.value.revision === revision) state.value = { revision, ready: true }
    },
    { flush: 'sync', immediate: true, deep: true },
  )
  onScopeDispose(() => {
    disposed = true
    release()
  })
}
