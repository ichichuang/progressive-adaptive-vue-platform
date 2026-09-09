import type { Pinia } from 'pinia'
import { watch } from 'vue'

import type { WorkspaceSessionPort } from './workspace-session-contract'
import { useWorkspaceStore } from './workspace.store'

export function initializeWorkspaceSession(
  pinia: Pinia,
  port: WorkspaceSessionPort,
): { dispose(): void } {
  const workspace = useWorkspaceStore(pinia)
  const restored = port.read()
  workspace.restore(restored.status === 'found' ? restored.session.openRouteNames : [])
  const stop = watch(
    () => workspace.entries.map((entry) => entry.destination.name),
    (names, previous) => {
      if (
        names.length === previous.length &&
        names.every((name, index) => name === previous[index])
      )
        return
      port.write({ schemaVersion: 1, openRouteNames: names })
    },
    { flush: 'sync' },
  )
  return { dispose: stop }
}
