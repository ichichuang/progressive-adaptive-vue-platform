import { z } from 'zod'
import type { UiTableQuery, UiTableReadonlyRecord } from '@platform/ui'

/** Application-owned URL allowlist. Only explicitly declared, non-sensitive filters are public. */
export function createTableQueryLinkCodec(
  filters: z.ZodObject,
  options: {
    readonly sortableKeys: readonly string[]
    readonly pageSizes: readonly number[]
    readonly pageSize: number
  },
) {
  const state = z.strictObject({
    page: z.number().int().min(1).max(1_000_000),
    pageSize: z
      .number()
      .int()
      .refine((size) => options.pageSizes.includes(size)),
    filters: filters.strict(),
    sorts: z
      .array(
        z.strictObject({
          key: z.string().refine((key) => options.sortableKeys.includes(key)),
          order: z.enum(['ascend', 'descend']),
        }),
      )
      .max(options.sortableKeys.length)
      .refine((sorts) => new Set(sorts.map((sort) => sort.key)).size === sorts.length),
  })
  const defaults = { page: 1, pageSize: options.pageSize, filters: filters.parse({}), sorts: [] }
  const querySchema = z.strictObject({
    table: z
      .string()
      .max(4096)
      .refine((value) => {
        try {
          return state.safeParse(JSON.parse(value)).success
        } catch {
          return false
        }
      })
      .optional(),
  })
  function decode(query: unknown): Omit<UiTableQuery, 'sort'> {
    const parsed = querySchema.parse(query)
    const value = state.parse(parsed.table === undefined ? defaults : JSON.parse(parsed.table))
    // Filter schemas belong to the application and must produce finite JSON records.
    return { ...value, filters: value.filters as UiTableReadonlyRecord }
  }
  function encode(query: Omit<UiTableQuery, 'sort'>): { table?: string } {
    const publicFilters = Object.fromEntries(
      Object.keys(filters.shape).map((key) => [key, query.filters[key]]),
    )
    const value = state.parse({
      page: query.page,
      pageSize: query.pageSize,
      filters: publicFilters,
      sorts: query.sorts,
    })
    const table = JSON.stringify(value)
    if (table.length > 4096) throw new TypeError('The table query link is too long.')
    return table === JSON.stringify(state.parse(defaults)) ? {} : { table }
  }
  return { querySchema, encode, decode }
}
