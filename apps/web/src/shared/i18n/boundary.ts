import { inject, type App, type InjectionKey, type Ref } from 'vue'

import type { ConsoleLocale } from './locale-contract'
import type { ConsoleMessageScope, ConsoleTranslate } from './message-schema'

export type LocalePreferenceReadResult =
  | { readonly status: 'found'; readonly locale: ConsoleLocale }
  | { readonly status: 'missing' }
  | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' }

export interface LocalePreferencePort {
  read(): LocalePreferenceReadResult
  write(locale: ConsoleLocale): { readonly status: 'saved' | 'failed' }
}

export type ConsoleLocaleSwitchResult =
  | {
      readonly status: 'applied'
      readonly locale: ConsoleLocale
      readonly persistence: 'saved' | 'failed'
    }
  | { readonly status: 'unchanged'; readonly locale: ConsoleLocale }
  | {
      readonly status: 'failed'
      readonly locale: ConsoleLocale
      readonly reason: 'unsupported-locale' | 'message-load-failed' | 'commit-failed'
    }
  | {
      readonly status: 'cancelled'
      readonly locale: ConsoleLocale
      readonly reason: 'superseded' | 'disposed'
    }

export type ConsoleLocaleNotice =
  | 'none'
  | 'loading'
  | 'applied'
  | 'not-saved'
  | 'saved-choice-unavailable'
  | 'preference-unavailable'
  | 'unsupported-locale'
  | 'message-load-failed'
  | 'commit-failed'

export interface ConsoleI18nBoundary {
  readonly locale: Readonly<Ref<ConsoleLocale>>
  readonly pendingLocale: Readonly<Ref<ConsoleLocale | null>>
  readonly notice: Readonly<Ref<ConsoleLocaleNotice>>
  readonly t: ConsoleTranslate
  switchLocale(candidate: unknown): Promise<ConsoleLocaleSwitchResult>
  prepareScope(
    scope: ConsoleMessageScope,
  ): Promise<{ readonly status: 'ready' | 'failed' | 'cancelled' }>
}

export interface ConsoleI18nHandle {
  readonly ready: Promise<
    | { readonly status: 'ready'; readonly boundary: ConsoleI18nBoundary }
    | { readonly status: 'cancelled' }
  >
  dispose(): void
}

export interface ConsoleI18nInput {
  readonly application: App
  readonly document: Document
  readonly preference: LocalePreferencePort
  readonly initialScope: ConsoleMessageScope
  readonly onLocaleCommitted: (translate: ConsoleTranslate) => void
}

const consoleI18nKey: InjectionKey<ConsoleI18nBoundary> = Symbol('ConsoleI18n')

export function provideConsoleI18n(application: App, boundary: ConsoleI18nBoundary): void {
  application.provide(consoleI18nKey, boundary)
}

export function useConsoleI18n(): ConsoleI18nBoundary {
  const boundary = inject(consoleI18nKey)
  if (boundary === undefined) throw new Error('The console language boundary is not ready.')
  return boundary
}
