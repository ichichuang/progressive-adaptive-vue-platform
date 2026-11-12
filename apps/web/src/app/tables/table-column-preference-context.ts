import type { InjectionKey } from 'vue'
import type { StorageErrorAdapter } from '../storage/storage-error'
export interface TableColumnPreferenceContext {
  readonly errorAdapter: StorageErrorAdapter
  readonly isDisposed: () => boolean
}
export const tableColumnPreferenceKey: InjectionKey<TableColumnPreferenceContext> =
  Symbol('TableColumnPreference')
