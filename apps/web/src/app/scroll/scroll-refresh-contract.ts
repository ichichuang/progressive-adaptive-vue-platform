import { z } from 'zod'
import { settingsScrollPositionSchema } from './settings-scroll-position'

export const scrollRefreshSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    routeName: z.string().min(1),
    ownerId: z.string().min(1),
    left: z.number(),
    top: z.number().nonnegative(),
    context: z.array(z.union([z.string(), z.number()])).readonly(),
    settings: settingsScrollPositionSchema.optional(),
  })
  .refine(
    ({ settings, left, top }) => {
      if (settings === undefined) return true
      const active = settings.positions[settings.section]
      return active?.left === left && active.top === top
    },
    {
      path: ['settings', 'positions'],
      message: 'The active settings offset must match the route offset.',
    },
  )
export type ScrollRefreshSnapshot = z.infer<typeof scrollRefreshSchema>

export interface ScrollRefreshPort {
  read():
    | { readonly status: 'missing' }
    | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' | 'disposed' }
    | { readonly status: 'found'; readonly snapshot: ScrollRefreshSnapshot }
  write(snapshot: ScrollRefreshSnapshot): {
    readonly status: 'saved' | 'failed'
    readonly reason?: 'disposed'
  }
  clear(): { readonly status: 'saved' | 'failed'; readonly reason?: 'disposed' }
}
