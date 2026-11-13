import { z } from 'zod'
import { inject, type InjectionKey } from 'vue'
export const dateTimeSettingsSchema = z.strictObject({
  timeZone: z.string().refine((value) => {
    if (value === 'system') return true
    try {
      new Intl.DateTimeFormat('en', { timeZone: value })
      return true
    } catch {
      return false
    }
  }),
  hourCycle: z.enum(['h12', 'h23']),
})
export const defaultDateTimeSettings = { timeZone: 'system', hourCycle: 'h23' } as const
export const dateTimePreferenceSchema = dateTimeSettingsSchema.extend({
  schemaVersion: z.literal(1),
})
export type DateTimePreference = z.infer<typeof dateTimePreferenceSchema>
export interface DateTimePreferencePort {
  subscribe(invalidate: () => void): () => void
  read():
    | { readonly status: 'missing' }
    | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' | 'disposed' }
    | { readonly status: 'found'; readonly preference: DateTimePreference }
  write(preference: DateTimePreference): {
    readonly status: 'saved' | 'failed'
    readonly reason?: 'disposed'
  }
}
export const dateTimePreferencePortKey: InjectionKey<DateTimePreferencePort> =
  Symbol('DateTimePreferencePort')
export function useDateTimePreferencePort(): DateTimePreferencePort {
  const port = inject(dateTimePreferencePortKey)
  if (!port) throw new Error('Date/time storage is unavailable.')
  return port
}
