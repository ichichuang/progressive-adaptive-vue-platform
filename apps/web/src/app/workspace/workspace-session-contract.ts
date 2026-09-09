import { z } from 'zod'

export const workspaceSessionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  openRouteNames: z.array(z.string().min(1)).readonly(),
})

export type WorkspaceSession = z.infer<typeof workspaceSessionSchema>

export type WorkspaceSessionReadResult =
  | { readonly status: 'missing' }
  | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' }
  | { readonly status: 'found'; readonly session: WorkspaceSession }

export interface WorkspaceSessionPort {
  read(): WorkspaceSessionReadResult
  write(session: WorkspaceSession): { readonly status: 'saved' | 'failed' }
}
