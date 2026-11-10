import { inject } from 'vue'
import { createFormDraftStorage } from '../storage/form-draft-storage'
import { formDraftStorageKey } from './form-draft-contract'

/** Static imports here are reached only through the existing lazy form consumers. */
export function useFormDraftStorage() {
  const context = inject(formDraftStorageKey)
  if (!context) throw new Error('Forms require the application draft storage owner.')
  return createFormDraftStorage(context.errorAdapter, context.isDisposed)
}
