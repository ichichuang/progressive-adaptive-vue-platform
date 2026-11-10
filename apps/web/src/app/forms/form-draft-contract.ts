import type { InjectionKey } from 'vue'
import type { StorageErrorAdapter } from '../storage/storage-error'

export type FormDraftFailure = 'unavailable' | 'invalid' | 'incompatible' | 'expired' | 'conflict'

export type FormDraftRead<T> =
  | { readonly status: 'missing' }
  | {
      readonly status: 'found'
      readonly data: T
      readonly savedAt: number
      readonly expiresAt: number
    }
  | { readonly status: 'unusable'; readonly reason: FormDraftFailure }

export interface FormDraftPort<T> {
  read(): FormDraftRead<T>
  write(
    data: T,
  ):
    | { readonly status: 'saved'; readonly savedAt: number; readonly expiresAt: number }
    | { readonly status: 'failed'; readonly reason: FormDraftFailure }
  clear():
    | { readonly status: 'cleared' }
    | { readonly status: 'failed'; readonly reason: FormDraftFailure }
}

/** Application persistence only. Consumers must opt in to storing non-sensitive data. */
export interface FormDraftStorage {
  create<T>(input: {
    readonly scope: string
    readonly schemaKey: string
    readonly maxAgeMs: number
    readonly parse: (value: unknown) => T
  }): FormDraftPort<T>
}

/** App-private lifetime supplied by Storage; the concrete adapter loads with form consumers. */
export interface FormDraftStorageContext {
  readonly errorAdapter: StorageErrorAdapter
  readonly isDisposed: () => boolean
}

export const formDraftStorageKey: InjectionKey<FormDraftStorageContext> = Symbol('FormDraftStorage')
