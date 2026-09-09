import { inject, nextTick, onScopeDispose, watch, type InjectionKey, type WatchSource } from 'vue'

import { useWorkspaceStore, type WorkspaceInstanceIdentity } from './workspace.store'

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
  const instance = useWorkspaceStore().active?.instance
  if (register === undefined || instance === undefined)
    throw new TypeError('The Workspace content boundary is unavailable.')
  let state: WorkspaceContentState = { revision: 0, ready: false }
  let disposed = false
  const release = register(instance, () => state)
  watch(
    source,
    async () => {
      const revision = state.revision + 1
      state = { revision, ready: false }
      await nextTick()
      if (!disposed && state.revision === revision) state = { revision, ready: true }
    },
    { flush: 'sync', immediate: true, deep: true },
  )
  onScopeDispose(() => {
    disposed = true
    release()
  })
}
