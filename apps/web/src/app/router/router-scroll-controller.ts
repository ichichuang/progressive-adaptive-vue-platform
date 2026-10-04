import type { UiScrollController } from '@platform/ui'
import type { InjectionKey } from 'vue'
import type { LiveWorkspaceEntry } from '../workspace/workspace.store'
import type { ValidatedRouteInput } from './route-input'
import type { RouteName } from './route-registry'

type RegisterScrollController = (controller: UiScrollController) => () => void

export const routerScrollControllerKey: InjectionKey<RegisterScrollController> = Symbol(
  'PAVP Router Scroll Controller',
)

export interface WorkspaceRenderSnapshot {
  readonly commit: object
  readonly routeName: RouteName
  readonly inputProps: Readonly<{ routeInput?: ValidatedRouteInput }>
  readonly workspace: LiveWorkspaceEntry | undefined
}

export interface WorkspaceRetentionBinding {
  acceptCommitted(snapshot: WorkspaceRenderSnapshot): void
  whenRendered(snapshot: WorkspaceRenderSnapshot, signal: AbortSignal): Promise<boolean>
  readFailure(snapshot: WorkspaceRenderSnapshot): { readonly cause: unknown } | undefined
  dispose(): void
}

export const routerWorkspaceRetentionKey: InjectionKey<{
  connect(binding: WorkspaceRetentionBinding): () => void
  read(): WorkspaceRenderSnapshot | undefined
}> = Symbol('PAVP Router Workspace Retention')

export const routerWorkspaceRefreshKey: InjectionKey<
  (entry: LiveWorkspaceEntry) =>
    | {
        readonly signal: AbortSignal
        isCurrent(): boolean
        replace(prepare: (replacement: LiveWorkspaceEntry) => void): LiveWorkspaceEntry | undefined
        reset(replacement: LiveWorkspaceEntry): Promise<boolean>
        release(): void
      }
    | undefined
> = Symbol('PAVP Router Workspace Refresh')

export function createRouterScrollControllers() {
  const controllers = new Map<string, UiScrollController>()
  let disposed = false
  return {
    register: ((controller) => {
      const ownerId = controller.ownerId
      if (disposed || controllers.has(ownerId))
        throw new TypeError('The Router scroll controller already has an owner or is disposed.')
      controllers.set(ownerId, controller)
      return () => {
        if (controllers.get(ownerId) === controller) controllers.delete(ownerId)
      }
    }) satisfies RegisterScrollController,
    read(boundary: HTMLElement): UiScrollController {
      const id = boundary.dataset['scrollOwner']
      const controller = id === undefined ? undefined : controllers.get(id)
      if (disposed || controller?.ownsBoundary(boundary) !== true)
        throw new TypeError('The Router scroll controller is unavailable.')
      return controller
    },
    dispose() {
      disposed = true
      controllers.clear()
    },
  }
}
