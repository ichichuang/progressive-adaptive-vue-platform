import { z } from 'zod'

export const defaultNavigationAccordion = false

export const navigationPreferenceSchema = z.strictObject({
  schemaVersion: z.literal(2),
  wideNavigationCollapsed: z.boolean(),
  accordion: z.boolean(),
  expandedGroupIds: z.array(z.string().min(1)).readonly(),
})

export type NavigationPreference = z.infer<typeof navigationPreferenceSchema>

const legacyNavigationPreferenceSchema = navigationPreferenceSchema
  .omit({ accordion: true })
  .extend({ schemaVersion: z.literal(1) })

export function parseNavigationPreference(
  value: unknown,
): ReturnType<typeof navigationPreferenceSchema.safeParse> {
  const current = navigationPreferenceSchema.safeParse(value)
  if (current.success) return current
  const legacy = legacyNavigationPreferenceSchema.safeParse(value)
  return legacy.success
    ? {
        success: true,
        data: { ...legacy.data, schemaVersion: 2, accordion: defaultNavigationAccordion },
      }
    : current
}

export type NavigationPreferenceReadResult =
  | { readonly status: 'missing' }
  | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' }
  | { readonly status: 'found'; readonly preference: NavigationPreference }

export interface NavigationPreferencePort {
  subscribe(invalidate: () => void): () => void
  read(): NavigationPreferenceReadResult
  write(preference: NavigationPreference): { readonly status: 'saved' | 'failed' }
}

export type NavigationPreferenceMutationResult =
  | { readonly status: 'not-ready' }
  | { readonly status: 'busy' }
  | {
      readonly status: 'applied'
      readonly persistence: ReturnType<NavigationPreferencePort['write']>['status']
    }

export function reconcileNavigationGroupIds(
  preferredIds: readonly string[],
  admittedIds: readonly string[],
): readonly string[] {
  const preferred = new Set(preferredIds)
  return [...new Set(admittedIds)].filter((id) => preferred.has(id))
}
