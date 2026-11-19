import type { InjectionKey, Ref } from 'vue'
import type { UiLocale } from '../components/contracts'

export const uiLocaleKey: InjectionKey<Readonly<Ref<UiLocale>>> = Symbol('ui-locale')
