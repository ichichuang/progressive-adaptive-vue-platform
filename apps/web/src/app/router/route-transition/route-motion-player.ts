import type { UiMotionController } from '@platform/ui'
import { inject, onScopeDispose, provide, type InjectionKey } from 'vue'

export type RouteMotionOrigin = 'center' | { readonly clientX: number; readonly clientY: number }
export interface RouteMotionPlayer {
  readonly controller: UiMotionController
  readonly consumeOrigin: () => RouteMotionOrigin
}
type RegisterRouteMotionPlayer = (player: RouteMotionPlayer) => () => void
const routeMotionPlayerKey: InjectionKey<RegisterRouteMotionPlayer> = Symbol('Route Motion Player')

/** The persistent shell supplies the UI-scoped player; navigation retains transition ownership. */
export function provideRouteMotionPlayer(): () => RouteMotionPlayer | undefined {
  let current: RouteMotionPlayer | undefined
  provide(routeMotionPlayerKey, (player) => {
    current = player
    return () => {
      if (current === player) current = undefined
    }
  })
  return () => current
}

export function connectRouteMotionPlayer(
  player: UiMotionController,
  consumeOrigin: () => RouteMotionOrigin,
): void {
  const register = inject(routeMotionPlayerKey)
  if (register === undefined) throw new Error('The Route Motion boundary is unavailable.')
  onScopeDispose(register({ controller: player, consumeOrigin }))
}

/** Read-only arrival barrier: pages choreograph content only after the shell's reveal settles. */
export interface RouteRevealBoundary {
  begin(): () => void
  readonly whenRevealed: () => Promise<void>
}
const routeRevealKey: InjectionKey<Pick<RouteRevealBoundary, 'whenRevealed'>> =
  Symbol('Route Reveal')
export function provideRouteRevealBoundary(): RouteRevealBoundary {
  let pending: { promise: Promise<void>; finish: () => void } | undefined
  const boundary: RouteRevealBoundary = {
    begin() {
      pending?.finish()
      let resolve!: () => void
      const promise = new Promise<void>((done) => {
        resolve = done
      })
      const owner = {
        promise,
        finish: () => {
          resolve()
          if (pending === owner) pending = undefined
        },
      }
      pending = owner
      return owner.finish
    },
    whenRevealed: () => pending?.promise ?? Promise.resolve(),
  }
  provide(routeRevealKey, { whenRevealed: boundary.whenRevealed })
  onScopeDispose(() => pending?.finish())
  return boundary
}
export function useRouteRevealBoundary(): Pick<RouteRevealBoundary, 'whenRevealed'> {
  const boundary = inject(routeRevealKey)
  if (!boundary) throw new Error('The route reveal boundary is unavailable.')
  return boundary
}
