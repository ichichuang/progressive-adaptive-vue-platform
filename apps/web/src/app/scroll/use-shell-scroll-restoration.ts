import { inject, onScopeDispose } from 'vue'
import { shellScrollStorageKey } from './shell-scroll-storage-key'

/** Bootstrap prepares the optional runtime before any shell viewport can paint. */
export function useShellScrollRestoration() {
  const create = inject(shellScrollStorageKey)
  if (create === undefined) throw new Error('Missing scroll storage.')
  const runtime = create()
  onScopeDispose(() => runtime?.dispose())
  return (area: 'sidebar' | 'drawer' | 'tabs', element: HTMLElement | null): void => {
    runtime?.[area](element)
  }
}
