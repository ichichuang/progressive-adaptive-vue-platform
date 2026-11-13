import type { InjectionKey, Ref } from 'vue'

export type RuntimeUpdateStatus = 'idle' | 'checking' | 'current' | 'available' | 'unavailable'
export interface RuntimeUpdateContext {
  readonly status: Readonly<Ref<RuntimeUpdateStatus>>
  check(): Promise<void>
}
export const runtimeUpdateKey: InjectionKey<RuntimeUpdateContext> = Symbol('runtime-update')
