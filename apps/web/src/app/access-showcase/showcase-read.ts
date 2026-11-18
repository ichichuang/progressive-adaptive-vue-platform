import { z } from 'zod'
import type { AccessContextSnapshot } from '../access/access-contract'
import type { AccessRequirement } from '../access/native-requirement'
import { createApiClient } from '../../shared/api'
import { showcaseRequirement, taskCapability } from './showcase-requirements'
import type { ShowcaseWorld } from './showcase-world'

/** The real request client uses an isolated, in-memory transport for this composition. */
export function localShowcaseRead<S extends z.ZodType>(
  world: ShowcaseWorld,
  resource: string,
  schema: S,
  requirement: (query: Readonly<Record<string, unknown>>) => AccessRequirement,
  project: (
    context: AccessContextSnapshot,
    query: Readonly<Record<string, unknown>>,
  ) => z.input<S> | undefined,
) {
  const endpoint = {
    method: 'GET',
    id: resource,
    path: [resource],
    policy: 'standard',
    authentication: 'provided',
    response: { mode: 'json', mimeTypes: ['application/json'], schema },
  } as const
  const requests = new Map<string, { data: unknown; latency: number }>()
  const client = createApiClient({
    configuration: { status: 'configured', baseUrl: 'https://access-showcase.invalid/' },
    authorize: () => Promise.resolve({ headers: {}, credentials: 'omit' }),
    async fetch(url) {
      const requestId = new URL(url).searchParams.get('requestId')
      const pending = requestId === null ? undefined : requests.get(requestId)
      if (!pending || requestId === null) return Response.json(null, { status: 404 })
      requests.delete(requestId)
      // Return the captured result even if the scope changes during the simulated
      // transport. The scoped owner must reject that late response.
      await world.wait(pending.latency)
      return Response.json(pending.data)
    },
  })
  return {
    client,
    requirement,
    plan(
      {
        context,
        query,
        requestId,
      }: {
        context: AccessContextSnapshot
        query: Readonly<Record<string, unknown>>
        requestId: string
      },
      signal: AbortSignal,
    ) {
      const data = project(context, query)
      if (data === undefined) return { status: 'empty' as const }
      const pending = { data, latency: world.state.latency }
      requests.set(requestId, pending)
      signal.addEventListener(
        'abort',
        () => {
          requests.delete(requestId)
        },
        { once: true },
      )
      return { status: 'ready' as const, endpoint, input: { query: { requestId } } }
    },
  }
}

export function showcaseTaskRead(world: ShowcaseWorld) {
  return localShowcaseRead(
    world,
    'showcase-task-detail',
    z.object({ id: z.string(), revision: z.string(), values: z.record(z.string(), z.string()) }),
    (query) => showcaseRequirement(taskCapability('record', 'read', String(query['id']))),
    (context, query) => {
      const task = world.taskFor(String(query['id']), context)
      if (!task) return
      return {
        id: task.id,
        revision: task.revision,
        values: {
          ...(world.state.titleReadRevoked.has(task.id) ? {} : { title: task.title }),
          owner: task.owner,
          source: task.source,
        },
      }
    },
  )
}
