import type * as ScrollRuntime from './scroll-enhancement-runtime'
export type ScrollEnhancement = ReturnType<typeof ScrollRuntime.createScrollEnhancement>

let runtimePromise: Promise<typeof ScrollRuntime | undefined> | undefined

/** Optional presentation enhancement; native scrolling never waits for this module. */
export function loadScrollEnhancement(): Promise<typeof ScrollRuntime | undefined> {
  runtimePromise ??= import('./scroll-enhancement-runtime').catch(() => {
    console.warn('PAVP scroll enhancement unavailable; native scrolling remains active.')
    return undefined
  })
  return runtimePromise
}
