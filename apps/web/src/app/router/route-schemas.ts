import { z } from 'zod'

export const routeParamsSchemaRegistry = Object.freeze([
  Object.freeze({
    id: 'route-params.none',
    schema: z.object({}).strict(),
  }),
  Object.freeze({
    id: 'route-params.not-found-path',
    schema: z.object({ path: z.string().min(1) }).strict(),
  }),
] as const)

export const routeQuerySchemaRegistry = Object.freeze([
  Object.freeze({
    id: 'route-query.none',
    schema: z.object({}).strict(),
  }),
] as const)

export function routeParamsSchema(schemaId: string): z.ZodType {
  const record = routeParamsSchemaRegistry.find((candidate) => candidate.id === schemaId)

  if (record === undefined) {
    throw new TypeError('The route Params schema is not registered.')
  }

  return record.schema
}

export function routeQuerySchema(schemaId: string): z.ZodType {
  const record = routeQuerySchemaRegistry.find((candidate) => candidate.id === schemaId)

  if (record === undefined) {
    throw new TypeError('The route Query schema is not registered.')
  }

  return record.schema
}
