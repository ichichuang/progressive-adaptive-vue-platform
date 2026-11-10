import type { UiTableRequest, UiTableTransport } from '@platform/ui'
import { createApiClient } from '../../../shared/api'
import { createTableHttpTransport, dummyJsonTableResponseAdapter } from '../../../shared/table'

/** Public test service only. All writes are simulated and disappear on the next read. */
export function createPublicProductTableTransport(): UiTableTransport {
  return createTableHttpTransport(
    createApiClient({
      configuration: { status: 'configured', baseUrl: 'https://dummyjson.com/' },
    }),
    { responseAdapter: dummyJsonTableResponseAdapter },
  )
}

/** JSON-only requests; pagination and form bindings are resolved by the shared table. */
export const publicProductTableRequests = {
  list: {
    api: 'products/search',
    method: 'GET',
    params: {
      q: { from: 'filters.q' },
      limit: { from: 'pageSize' },
      skip: { from: 'offset' },
    },
  },
  detail: {
    api: 'products/{id}',
    method: 'GET',
    path: { id: { from: 'row.id' } },
  },
  create: {
    api: 'products/add',
    method: 'POST',
    body: {
      title: { from: 'form.title' },
      description: { from: 'form.description' },
      price: { from: 'form.price' },
      stock: { from: 'form.stock' },
    },
  },
  update: {
    api: 'products/{id}',
    method: 'PATCH',
    path: { id: { from: 'row.id' } },
    body: {
      title: { from: 'form.title' },
      description: { from: 'form.description' },
      price: { from: 'form.price' },
      stock: { from: 'form.stock' },
    },
  },
  remove: {
    api: 'products/{id}',
    method: 'DELETE',
    path: { id: { from: 'row.id' } },
  },
} as const satisfies Readonly<Record<string, UiTableRequest>>
