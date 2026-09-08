import { z } from 'zod'

export const navigationPreferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  wideNavigationCollapsed: z.boolean(),
  expandedGroupIds: z.array(z.string().min(1)).readonly(),
})

export type NavigationPreference = z.infer<typeof navigationPreferenceSchema>

export type NavigationPreferenceReadResult =
  | { readonly status: 'missing' }
  | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' }
  | { readonly status: 'found'; readonly preference: NavigationPreference }

export interface NavigationPreferencePort {
  read(): NavigationPreferenceReadResult
  write(preference: NavigationPreference): { readonly status: 'saved' | 'failed' }
}

export function reconcileNavigationGroupIds(
  preferredIds: readonly string[],
  admittedIds: readonly string[],
): readonly string[] {
  const preferred = new Set(preferredIds)
  return [...new Set(admittedIds)].filter((id) => preferred.has(id))
}
