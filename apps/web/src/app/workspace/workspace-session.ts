import type { Pinia } from 'pinia'
import { watch } from 'vue'

import type { WorkspaceSessionPort } from './workspace-session-contract'
import { useWorkspaceStore } from './workspace.store'

export function initializeWorkspaceSession(
  pinia: Pinia,
  port: WorkspaceSessionPort,
  isPublicRouteName: (name: string) => boolean,
): { dispose(): void } {
  const workspace = useWorkspaceStore(pinia)
  const restored = port.read()
  const storedNames = restored.status === 'found' ? restored.session.openRouteNames : []
  const names = storedNames.filter(isPublicRouteName)
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
    { flush: 'sync', immediate: names.length !== storedNames.length },
  )
  return { dispose: stop }
}
