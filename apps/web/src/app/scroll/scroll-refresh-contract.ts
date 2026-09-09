import { z } from 'zod'

export const scrollRefreshSchema = z.strictObject({
  schemaVersion: z.literal(1),
  routeName: z.string().min(1),
  ownerId: z.string().min(1),
  left: z.number(),
  top: z.number(),
  context: z.array(z.union([z.string(), z.number()])).readonly(),
})
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
