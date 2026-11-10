import { z } from 'zod'

import type { UiTablePage, UiTableRecord } from '@platform/ui'

/** Trusted backend conversion, configured once by the application, never by table JSON. */
export interface TableResponseAdapter {
  readonly list: (response: unknown) => UiTablePage
  readonly detail: (response: unknown) => UiTableRecord
  readonly mutate: (response: unknown) => void
}

/** Edit these application-owned conversions to match the project's backend contract. */
const recordSchema = z.record(z.string(), z.json())
const pageSchema = z.object({
  rows: z.array(recordSchema),
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
})
const mutationSchema = z.object({ success: z.literal(true) })

function readTablePage(response: unknown): UiTablePage {
  return pageSchema.parse(response)
}

function readTableDetail(response: unknown): UiTableRecord {
  return recordSchema.parse(response)
}

function readTableMutation(response: unknown): void {
  mutationSchema.parse(response)
}

export const standardTableResponseAdapter: TableResponseAdapter = Object.freeze({
  list: readTablePage,
  detail: readTableDetail,
  mutate: readTableMutation,
})

const productSchema = recordSchema.and(z.object({ id: z.number().int().positive() }))
const productPageSchema = z.object({
  products: z.array(productSchema),
  total: pageSchema.shape.total,
})

/** DummyJSON writes are simulated and are not persisted. https://dummyjson.com/docs/products */
export const dummyJsonTableResponseAdapter: TableResponseAdapter = Object.freeze({
  list(response: unknown): UiTablePage {
    const page = productPageSchema.parse(response)
    return { rows: page.products, total: page.total }
  },
  detail(response: unknown): UiTableRecord {
    return productSchema.parse(response)
  },
  mutate(response: unknown): void {
    productSchema.parse(response)
  },
})
