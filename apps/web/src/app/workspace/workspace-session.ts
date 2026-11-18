import type { Pinia } from 'pinia'
import { watch } from 'vue'

import type { WorkspaceSessionPort } from './workspace-session-contract'
import { useWorkspaceStore } from './workspace.store'

export function readPublicWorkspaceSession(
  port: Pick<WorkspaceSessionPort, 'read'>,
  isPublicRouteName: (name: string) => boolean,
) {
  const restored = port.read()
  const stored = restored.status === 'found' ? restored.session.openRouteNames : []
  const names = stored.filter(isPublicRouteName)
  return { names, skipped: stored.length - names.length }
}

export function initializeWorkspaceSession(
  pinia: Pinia,
  port: WorkspaceSessionPort,
  isPublicRouteName: (name: string) => boolean,
): { dispose(): void } {
  const workspace = useWorkspaceStore(pinia)
  const { names, skipped } = readPublicWorkspaceSession(port, isPublicRouteName)
  workspace.restore(names)
  const stop = watch(
    () => workspace.entries.map((entry) => entry.destination.name).filter(isPublicRouteName),
    (names, previous) => {
      if (
        names.length === previous?.length &&
        names.every((name, index) => name === previous[index])
      )
        return
      port.write({ schemaVersion: 1, openRouteNames: names })
    },
    { flush: 'sync', immediate: skipped !== 0 },
  )
  return { dispose: stop }
}
