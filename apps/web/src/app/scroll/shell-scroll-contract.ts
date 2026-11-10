import { z } from 'zod'

// Each shell region retains its own offset, independently of route-content restoration.
export const shellScrollSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sidebarTop: z.number().nonnegative(),
  drawerTop: z.number().nonnegative(),
  tabsLeft: z.number().nonnegative(),
})
export type ShellScrollSnapshot = z.infer<typeof shellScrollSchema>

export interface ShellScrollPort {
  read():
    | { readonly status: 'missing' }
    | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' | 'disposed' }
    | { readonly status: 'found'; readonly snapshot: ShellScrollSnapshot }
  write(snapshot: ShellScrollSnapshot): {
    readonly status: 'saved' | 'failed'
    readonly reason?: 'disposed'
  }
}
