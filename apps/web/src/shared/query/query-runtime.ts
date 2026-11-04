import { CancelledError, QueryClient, queryOptions } from '@tanstack/vue-query'

import type { ApiClient, ApiEndpoint, ApiRequestInput } from '../api'
import { ApiQueryAccepted, ApiQueryError } from './query-errors'
import { apiQueryPolicies } from './query-policy'

export type ApiReadEndpoint<Response, ErrorData = never> = ApiEndpoint<Response, ErrorData> & {
  readonly method: 'GET'
  readonly authentication: 'anonymous'
  readonly response: { readonly mode: 'json' }
}

export type ApiReadQueryInput = Pick<ApiRequestInput, 'query'>

type QueryValues = NonNullable<ApiRequestInput['query']>
type QueryScalar = Exclude<QueryValues[string], readonly unknown[] | undefined>

function isQueryRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return (
    (prototype === null || prototype === Object.prototype) &&
    Reflect.ownKeys(value).every((key) => typeof key === 'string')
  )
}

function captureRead<Response, ErrorData>(
  endpoint: ApiEndpoint<Response, ErrorData>,
  input: unknown,
) {
  try {
    if (
      endpoint.method !== 'GET' ||
      endpoint.authentication !== 'anonymous' ||
      endpoint.response.mode !== 'json' ||
      typeof endpoint.id !== 'string' ||
      endpoint.id.length === 0 ||
      input === null ||
      typeof input !== 'object' ||
      Reflect.ownKeys(input).some((key) => key !== 'query')
    )
      throw new TypeError()

    const rawPath: unknown = endpoint.path
    if (!Array.isArray(rawPath) || rawPath.length === 0) throw new TypeError()
    const path: readonly unknown[] = rawPath
    const capturedPath = path.map((part) => {
      if (typeof part !== 'string' || !part || part === '.' || part === '..' || /[\\/]/u.test(part))
        throw new TypeError()
      return part
    })
    const source: unknown = Reflect.get(input, 'query')
    if (source !== undefined && !isQueryRecord(source)) throw new TypeError()

    const entries: [string, QueryValues[string]][] = []
    const search = new URLSearchParams()
    for (const [key, raw] of Object.entries<unknown>(source ?? {})) {
      if (raw === undefined) continue
      const values: readonly unknown[] = Array.isArray(raw) ? raw : [raw]
      const captured: QueryScalar[] = []
      for (const value of values) {
        if (
          typeof value !== 'string' &&
          typeof value !== 'boolean' &&
          !(typeof value === 'number' && Number.isFinite(value))
        )
          throw new TypeError()
        captured.push(value)
        search.append(key, String(value))
      }
      entries.push([key, Array.isArray(raw) ? Object.freeze(captured) : captured[0]])
    }
    const query: QueryValues = Object.freeze(Object.fromEntries(entries))
    const definition = Object.freeze({
      ...endpoint,
      method: endpoint.method,
      authentication: endpoint.authentication,
      path: Object.freeze(capturedPath),
      response: Object.freeze({
        ...endpoint.response,
        mode: endpoint.response.mode,
        mimeTypes: Object.freeze([...endpoint.response.mimeTypes]),
      }),
    })
    const key = Object.freeze([
      'api-read',
      definition.id,
      definition.path,
      search.toString(),
    ] as const)
    return { definition, query, key }
  } catch {
    throw new TypeError('The API read query definition or input is invalid.')
  }
}

/** The caller owns this client and releases it after its consumers have stopped. */
export function createApiQueryRuntime(api: ApiClient) {
  const policy = apiQueryPolicies['manual-read']
  const queryClient = new QueryClient({ defaultOptions: { queries: policy } })
  const request = api.request.bind(api)
  let disposed = false
  let disposal: Promise<void> | undefined
  queryClient.mount()

  function assertActive(signal?: AbortSignal): void {
    if (disposed || signal?.aborted === true)
      throw new CancelledError({ silent: true, revert: true })
  }

  function readOptions<Response, ErrorData = never>(
    endpoint: ApiReadEndpoint<Response, ErrorData>,
    input: ApiReadQueryInput = {},
  ) {
    assertActive()
    const captured = captureRead(endpoint, input)
    return queryOptions<
      Response,
      ApiQueryError<ErrorData> | ApiQueryAccepted<Response>,
      Response,
      typeof captured.key
    >({
      ...policy,
      queryKey: captured.key,
      async queryFn({ signal }) {
        assertActive(signal)
        const result = await request(captured.definition, { query: captured.query, signal })
        assertActive(signal)
        if (result.status === 'failure') throw new ApiQueryError(result.error)
        if (result.status === 'accepted')
          throw new ApiQueryAccepted({ ...result, status: 'accepted' })
        if (result.data === undefined)
          throw new ApiQueryError({
            category: 'schema',
            endpointId: captured.definition.id,
            requestId: result.requestId,
            httpStatus: result.httpStatus,
          })
        return result.data
      },
    })
  }

  function dispose(): Promise<void> {
    if (disposal !== undefined) return disposal
    let completeCancellation: ((completion: Promise<void>) => void) | undefined
    disposal = new Promise<void>((resolveCancellation) => {
      completeCancellation = resolveCancellation
    }).then(() => {
      queryClient.clear()
    })
    disposed = true
    queryClient.unmount()
    completeCancellation?.(queryClient.cancelQueries())
    return disposal
  }

  return Object.freeze({ queryClient, queryOptions: readOptions, dispose })
}

export type ApiQueryRuntime = ReturnType<typeof createApiQueryRuntime>
