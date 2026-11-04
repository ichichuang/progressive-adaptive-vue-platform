import { z } from 'zod'

import { rejectApiInput, type ApiClient, type ApiEndpoint, type ApiResult } from '../api'
import type { ApiQueryRuntime } from '../query'

const worldTimeSchema = z.object({
  datetime: z.string().min(1),
  offset_seconds: z.number().int(),
  offset_string: z.string().min(1),
  query: z.string(),
  timestamp_unix: z.number().int(),
  timezone: z.string().min(1),
  weekday: z.string().min(1),
})
const errorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u)
const errorSchema = z.union([
  z.object({ code: errorCodeSchema }),
  z.object({ error: errorCodeSchema }),
])
const citySchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => value === value.trim())

export type UapiWorldTime = z.infer<typeof worldTimeSchema>
type UapiError = z.infer<typeof errorSchema>

const worldTimeEndpoint = {
  id: 'uapi.world-time',
  method: 'GET',
  path: ['v1', 'misc', 'worldtime'],
  policy: 'standard',
  authentication: 'anonymous',
  response: { mode: 'json', mimeTypes: ['application/json'], schema: worldTimeSchema },
  errorSchema,
} as const satisfies ApiEndpoint<UapiWorldTime, UapiError>

export function readUapiWorldTime(
  client: ApiClient,
  city: string,
  signal: AbortSignal,
): Promise<ApiResult<UapiWorldTime, UapiError>> {
  if (!citySchema.safeParse(city).success) {
    return Promise.resolve(rejectApiInput(worldTimeEndpoint.id))
  }
  return client.request(worldTimeEndpoint, { query: { city }, signal })
}

export function uapiWorldTimeQueryOptions(runtime: ApiQueryRuntime, city: string) {
  if (!citySchema.safeParse(city).success) throw new TypeError('The world-time city is invalid.')
  return runtime.queryOptions(worldTimeEndpoint, { query: { city } })
}
