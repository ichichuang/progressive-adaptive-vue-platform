import type { UiScrollController } from '@platform/ui'
import type { InjectionKey } from 'vue'

type RegisterScrollController = (controller: UiScrollController) => () => void

export const routerScrollControllerKey: InjectionKey<RegisterScrollController> = Symbol(
  'PAVP Router Scroll Controller',
)

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
