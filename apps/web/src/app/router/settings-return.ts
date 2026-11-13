import { inject, onScopeDispose, provide, type InjectionKey } from 'vue'
import { useRouter } from 'vue-router'

import {
  isLiveWorkspace,
  useWorkspaceStore,
  type LiveWorkspaceEntry,
} from '../workspace/workspace.store'
import { useWorkspaceNavigation } from './application-navigation'
import {
  registeredRouteDestination,
  resolveRegisteredDestination,
  routeDestination,
  sameRouteAddress,
  validateRouteInput,
  type RegisteredRouteDestination,
  type TypedNavigationResult,
} from './route-input'
import { routeRegistry } from './route-registry'

interface SettingsOrigin {
  readonly destination: RegisteredRouteDestination
  readonly workspace: Pick<LiveWorkspaceEntry, 'identity' | 'instance'>
}

interface SettingsReturn {
  finish(): Promise<TypedNavigationResult>
}

const settingsReturnKey: InjectionKey<SettingsReturn> = Symbol('PAVP Settings Return')

export function provideSettingsReturn(): SettingsReturn {
  const router = useRouter()
  const workspace = useWorkspaceStore()
  const navigation = useWorkspaceNavigation()
  let origin: SettingsOrigin | undefined
  let pending: Promise<TypedNavigationResult> | undefined

  const stop = router.afterEach((to, from, failure) => {
    if (failure !== undefined || to.name === from.name) return
    if (to.name !== 'control-center') {
      origin = undefined
      return
    }

    const source = routeRegistry.find((record) => record.name === from.name)
    if (
      source?.workspaceIdentityPolicyId !== 'workspace-identity.route-single' ||
      validateRouteInput(from).kind !== 'valid'
    ) {
      origin = undefined
      return
    }

    const destination = routeDestination(from)
    const entry = workspace.entries.find((candidate) => {
      const resolved = resolveRegisteredDestination(router, candidate.destination)
      return (
        isLiveWorkspace(candidate) && resolved !== undefined && sameRouteAddress(from, resolved)
      )
    })
    origin =
      entry !== undefined && isLiveWorkspace(entry) ? { destination, workspace: entry } : undefined
  })

  const settingsReturn: SettingsReturn = Object.freeze({
    finish() {
      if (pending !== undefined) return pending
      const source = origin
      const target =
        source === undefined
          ? undefined
          : workspace.entries.find(
              (entry) =>
                isLiveWorkspace(entry) &&
                entry.identity === source.workspace.identity &&
                entry.instance === source.workspace.instance,
            )
      const result =
        target !== undefined && isLiveWorkspace(target) && source !== undefined
          ? navigation.navigate(source.destination, { workspaceActivation: target })
          : navigation.navigate(registeredRouteDestination({ name: 'workbench-welcome' }))
      pending = result
      void result
        .finally(() => {
          if (pending === result) pending = undefined
        })
        .catch(() => undefined)
      return result
    },
  })

  provide(settingsReturnKey, settingsReturn)
  onScopeDispose(() => {
    stop()
    origin = undefined
    pending = undefined
  })
  return settingsReturn
}

export function useSettingsReturn(): SettingsReturn {
  const boundary = inject(settingsReturnKey)
  if (boundary === undefined) throw new Error('The Settings return boundary is unavailable.')
  return boundary
}
