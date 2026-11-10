import type { InjectionKey } from 'vue'
import type { createShellScroll } from './shell-scroll-runtime'
import type { StorageErrorAdapter } from '../storage/storage-error'

export interface ShellScrollStorageContext {
  readonly errorAdapter: StorageErrorAdapter
  readonly isDisposed: () => boolean
}
export const shellScrollStorageKey: InjectionKey<
  () => ReturnType<typeof createShellScroll> | undefined
> = Symbol()
