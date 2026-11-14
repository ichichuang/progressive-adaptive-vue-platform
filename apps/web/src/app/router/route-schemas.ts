import { z } from 'zod'
import { routeTransitionShowcasePresetIds } from './route-transition/route-transition-showcase'
import { tableQuerySharingCodec } from '../tables/table-query-sharing-example'

export const routeParamsSchemaRegistry = Object.freeze([
  Object.freeze({
    id: 'route-params.none',
    schema: z.strictObject({}),
  }),
  Object.freeze({
    id: 'route-params.not-found-path',
    schema: z.strictObject({ path: z.string().min(1) }),
  }),
] as const)

export const routeQuerySchemaRegistry = Object.freeze([
  Object.freeze({
    id: 'route-query.motion-transition',
    schema: z.strictObject({ preset: z.enum(routeTransitionShowcasePresetIds).optional() }),
  }),
  Object.freeze({ id: 'route-query.table-query-link', schema: tableQuerySharingCodec.querySchema }),
  Object.freeze({
    id: 'route-query.table-editor',
    schema: z
      .strictObject({
        mode: z.enum(['create', 'edit', 'detail']).default('create'),
        id: z
          .string()
          .regex(/^[1-9]\d{0,14}$/u)
          .optional(),
      })
      .refine((value) => value.mode === 'create' || value.id),
  }),
  Object.freeze({
    id: 'route-query.none',
    schema: z.strictObject({}),
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
