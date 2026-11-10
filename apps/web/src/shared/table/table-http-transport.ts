import { z } from 'zod'

import type { UiTableResolvedRequest, UiTableTransport } from '@platform/ui'
import type { ApiClient, ApiEndpoint, ApiRequestInput } from '../api'
import { standardTableResponseAdapter, type TableResponseAdapter } from './table-response'

/** Trusted application options, never supplied by the table's JSON schema. */
export interface TableHttpTransportOptions {
  readonly authentication?: ApiEndpoint<unknown>['authentication']
  readonly mutationResponse?: 'json' | 'empty'
  readonly responseAdapter?: TableResponseAdapter
}

function requestPath(api: string): readonly string[] {
  if (typeof api !== 'string' || /[?#\\:\s]/u.test(api) || api.startsWith('//'))
    throw new TypeError('The table API must be a path within the configured API base.')
  const parts = (api.startsWith('/') ? api.slice(1) : api).split('/')
  return parts.map((encoded) => {
    // The shared HTTP client encodes each segment; decode bindings exactly once here.
    const part = decodeURIComponent(encoded)
    if (
      !part ||
      part === '.' ||
      part === '..' ||
      /[\\/?#%]/u.test(part) ||
      Array.from(part).some((character) => {
        const code = character.charCodeAt(0)
        return code < 32 || code === 127
      })
    )
      throw new TypeError('The table API contains an invalid path segment.')
    return part
  })
}

function requestQuery(
  params: UiTableResolvedRequest['params'],
): NonNullable<ApiRequestInput['query']> {
  const entries = Object.entries(params).map(([key, raw]) => {
    const values: readonly unknown[] = Array.isArray(raw) ? raw : [raw]
    const captured = values.map((value) => {
      if (
        typeof value !== 'string' &&
        typeof value !== 'boolean' &&
        !(typeof value === 'number' && Number.isFinite(value))
      )
        throw new TypeError('Table query parameters must be scalars or arrays of scalars.')
      return value
    })
    return [key, Array.isArray(raw) ? captured : captured[0]] as const
  })
  return Object.fromEntries(entries)
}

/** Reuses the application's configured HTTP and authorization boundary without a second cache. */
export function createTableHttpTransport(
  api: ApiClient,
  options: TableHttpTransportOptions = {},
): UiTableTransport {
  const authentication = options.authentication ?? 'anonymous'
  const mutationResponse = options.mutationResponse ?? 'json'
  const adapter = options.responseAdapter ?? standardTableResponseAdapter
  if (
    !['anonymous', 'provided'].includes(authentication) ||
    !['json', 'empty'].includes(mutationResponse) ||
    typeof adapter.list !== 'function' ||
    typeof adapter.detail !== 'function' ||
    typeof adapter.mutate !== 'function'
  )
    throw new TypeError('Invalid table HTTP transport options.')

  async function execute(
    operation: 'list' | 'detail' | 'mutate',
    request: UiTableResolvedRequest,
    signal: AbortSignal,
  ): Promise<unknown> {
    signal.throwIfAborted()
    const mode = operation === 'mutate' ? mutationResponse : 'json'
    const result = await api.request(
      {
        id: `table.${operation}`,
        method: request.method,
        path: requestPath(request.api),
        policy: 'standard',
        authentication,
        response: {
          mode,
          mimeTypes: mode === 'json' ? ['application/json'] : [],
          schema: mode === 'json' ? z.json() : z.undefined(),
        },
      },
      {
        signal,
        query: requestQuery(request.params),
        ...(Object.keys(request.body).length === 0
          ? {}
          : { body: { kind: 'json', value: request.body } }),
      },
    )
    signal.throwIfAborted()
    if (result.status === 'failure')
      throw new Error(`The table request failed (${result.error.category}).`, {
        cause: result.error,
      })
    if (result.status === 'accepted')
      throw new Error('The table request was accepted but has not completed.', {
        cause: {
          status: result.status,
          httpStatus: result.httpStatus,
          requestId: result.requestId,
        },
      })
    return result.data
  }

  return Object.freeze({
    async list(request, signal) {
      return adapter.list(await execute('list', request, signal))
    },
    async detail(request, signal) {
      return adapter.detail(await execute('detail', request, signal))
    },
    async mutate(request, signal) {
      const response = await execute('mutate', request, signal)
      if (mutationResponse === 'json') adapter.mutate(response)
    },
  } satisfies UiTableTransport)
}
