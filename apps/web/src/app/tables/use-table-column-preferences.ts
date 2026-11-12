import { inject } from 'vue'
import { tableColumnPreferenceKey } from './table-column-preference-context'
import { createTableColumnPreferenceStorage } from '../storage/table-column-preference-storage'
export function useTableColumnPreferences() {
  const context = inject(tableColumnPreferenceKey)
  if (!context) throw new Error('Tables require the application column preference storage owner.')
  return createTableColumnPreferenceStorage(context.errorAdapter, context.isDisposed)
}
