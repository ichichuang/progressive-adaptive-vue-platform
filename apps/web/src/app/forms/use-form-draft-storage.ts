import { inject } from 'vue'
import { createFormDraftStorage } from '../storage/form-draft-storage'
import {
  formDraftStorageKey,
  type FormDraftStorage,
  type FormDraftStorageContext,
} from './form-draft-contract'

const owners = new WeakMap<FormDraftStorageContext, FormDraftStorage>()

/** Static imports here are reached only through the existing lazy form consumers. */
export function useFormDraftStorage() {
  const context = inject(formDraftStorageKey)
  if (!context) throw new Error('Forms require the application draft storage owner.')
  let storage = owners.get(context)
  if (!storage) {
    storage = createFormDraftStorage(context.errorAdapter, context.isDisposed)
    owners.set(context, storage)
  }
  return storage
}
