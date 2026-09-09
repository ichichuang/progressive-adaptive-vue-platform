import { z } from 'zod'

export const scrollPreferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  restoreOnRefresh: z.boolean(),
})
export const defaultRestoreOnRefresh = true
export type ScrollPreference = z.infer<typeof scrollPreferenceSchema>

export interface ScrollPreferencePort {
  read():
    | { readonly status: 'missing' }
    | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' | 'disposed' }
    | { readonly status: 'found'; readonly preference: ScrollPreference }
  write(preference: ScrollPreference): {
    readonly status: 'saved' | 'failed'
    readonly reason?: 'disposed'
  }
}
