import { inject, onScopeDispose, shallowRef, watch, type WatchSource } from 'vue'

import { workspaceInstanceKey } from './workspace-content'
import { workspaceUnsavedChangesKey } from './workspace-unsaved-changes'

// Registrations live with the retained page, including while it is deactivated.
export function useWorkspaceUnsavedChanges(
  hasUnsavedChanges: () => boolean,
  changes: WatchSource,
): void {
  const register = inject(workspaceUnsavedChangesKey)
  const instance = inject(workspaceInstanceKey)
  if (register === undefined || instance === undefined)
    throw new TypeError('The Workspace unsaved changes boundary is unavailable.')
  const revision = shallowRef(0)
  watch(
    [hasUnsavedChanges, changes],
    () => {
      revision.value += 1
    },
    { deep: true, flush: 'sync' },
  )
  onScopeDispose(
    register({ instance, read: () => ({ dirty: hasUnsavedChanges(), revision: revision.value }) }),
  )
}
