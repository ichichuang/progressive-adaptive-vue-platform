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

export type RouteParamsSchemaId = (typeof routeParamsSchemaRegistry)[number]['id']
export type RouteQuerySchemaId = (typeof routeQuerySchemaRegistry)[number]['id']

export function routeParamsSchema<const I extends RouteParamsSchemaId>(
  schemaId: I,
): Extract<(typeof routeParamsSchemaRegistry)[number], { readonly id: I }>['schema']
export function routeParamsSchema(schemaId: string) {
  const record = routeParamsSchemaRegistry.find((candidate) => candidate.id === schemaId)

  if (record === undefined) {
    throw new TypeError('The route Params schema is not registered.')
  }

  return record.schema
}

export function routeQuerySchema<const I extends RouteQuerySchemaId>(
  schemaId: I,
): Extract<(typeof routeQuerySchemaRegistry)[number], { readonly id: I }>['schema']
export function routeQuerySchema(schemaId: string) {
  const record = routeQuerySchemaRegistry.find((candidate) => candidate.id === schemaId)

  if (record === undefined) {
    throw new TypeError('The route Query schema is not registered.')
  }

  return record.schema
}
