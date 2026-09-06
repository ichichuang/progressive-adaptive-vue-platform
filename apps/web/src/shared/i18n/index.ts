export { useConsoleI18n } from './boundary'
export type {
  ConsoleI18nBoundary,
  ConsoleI18nHandle,
  ConsoleLocaleNotice,
  LocalePreferencePort,
  LocalePreferenceReadResult,
} from './boundary'
export { createConsoleI18n } from './lifecycle'
export { consoleLocaleRegistry, localePreferenceSchema } from './locale-contract'
export type { LocalePreference } from './locale-contract'
export type { ConsoleMessageKey, ConsoleTranslate } from './message-schema'
