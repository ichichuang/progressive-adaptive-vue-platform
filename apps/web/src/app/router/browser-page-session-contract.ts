import type { InjectionKey } from 'vue'
import { z } from 'zod'

import { routeRegistry } from './route-registry'

export const browserPageBindingSchema = z
  .strictObject({
    sourceId: z.uuid(),
    associationId: z.uuid(),
    routeName: z.string().min(1),
    deploymentBase: z.literal('/'),
  })
  .readonly()

export type BrowserPageBinding = z.infer<typeof browserPageBindingSchema>

export const browserPageSessionSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    sourceId: z.uuid(),
    associations: z.array(browserPageBindingSchema).max(routeRegistry.length).readonly(),
    target: browserPageBindingSchema.nullable(),
  })
  .refine(
    (snapshot) =>
      snapshot.associations.every((binding) => binding.sourceId === snapshot.sourceId) &&
      new Set(snapshot.associations.map((binding) => binding.routeName)).size ===
        snapshot.associations.length &&
      new Set(snapshot.associations.map((binding) => binding.associationId)).size ===
        snapshot.associations.length,
    'Browser page associations must belong to their source and have unique identities.',
  )
  .readonly()

export type BrowserPageSessionSnapshot = z.infer<typeof browserPageSessionSchema>

export const browserPageDiscoverySchema = z
  .strictObject({
    kind: z.literal('discover'),
    binding: browserPageBindingSchema,
    requestId: z.uuid(),
  })
  .readonly()

export type BrowserPageDiscovery = z.infer<typeof browserPageDiscoverySchema>

export interface BrowserPageSessionPort {
  read():
    | { readonly status: 'missing' }
    | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' | 'disposed' }
    | { readonly status: 'found'; readonly snapshot: BrowserPageSessionSnapshot }
  write(snapshot: BrowserPageSessionSnapshot): { readonly status: 'saved' | 'failed' }
  initializeTarget(
    target: Window,
    binding: BrowserPageBinding,
  ): {
    readonly status: 'saved' | 'failed'
  }
  subscribe(listener: (message: BrowserPageDiscovery) => void): () => void
  discover(message: BrowserPageDiscovery): boolean
  available(): boolean
}

export const browserPageSessionKey: InjectionKey<BrowserPageSessionPort> =
  Symbol('Browser Page Session')

export const browserPageDiscoveryChannelName = 'pavp:browser-page:discovery' as const
