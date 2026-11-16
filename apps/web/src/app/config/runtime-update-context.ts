import type { InjectionKey } from 'vue'

export type RuntimeUpdateOutcome = 'current' | 'available' | 'unavailable'
export interface RuntimeUpdateContext {
  check(): Promise<RuntimeUpdateOutcome | undefined>
}
export const runtimeUpdateKey: InjectionKey<RuntimeUpdateContext> = Symbol('runtime-update')
