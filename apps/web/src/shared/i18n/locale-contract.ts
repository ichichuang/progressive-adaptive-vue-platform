import { z } from 'zod'

export const consoleLocaleSchema = z.enum(['zh-CN', 'en'])
export type ConsoleLocale = z.infer<typeof consoleLocaleSchema>
export const defaultConsoleLocale: ConsoleLocale = 'zh-CN'

export const consoleLocaleRegistry = Object.freeze([
  Object.freeze({
    id: 'zh-CN',
    languageTag: 'zh-CN',
    intlLocale: 'zh-CN',
    direction: 'ltr',
    messageLoaderId: 'console-messages.zh-CN',
    capabilityStatus: 'ACTIVE',
  }),
  Object.freeze({
    id: 'en',
    languageTag: 'en',
    intlLocale: 'en',
    direction: 'ltr',
    messageLoaderId: 'console-messages.en',
    capabilityStatus: 'ACTIVE',
  }),
] as const)

export const localePreferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  locale: consoleLocaleSchema,
})
export type LocalePreference = z.infer<typeof localePreferenceSchema>
