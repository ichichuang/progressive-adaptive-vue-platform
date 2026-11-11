import type { ApiEndpoint, ApiRequestParameters, ApiStreamEndpoint } from './contracts'
import { apiRequestPolicies } from './policies'

function encodeJsonBody(value: unknown): string | undefined {
  return JSON.stringify(value)
}

const managedAuthorizationHeaders = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
  'x-csrf-token',
])

export function createApiRequest<Response, ErrorData>(
  baseUrl: string,
  endpoint: ApiEndpoint<Response, ErrorData> | ApiStreamEndpoint<Response, ErrorData>,
  input: ApiRequestParameters,
): { readonly url: URL; readonly headers: Headers; readonly body: BodyInit | undefined } {
  if (
    !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method) ||
    !Object.hasOwn(apiRequestPolicies, endpoint.policy) ||
    !['anonymous', 'provided'].includes(endpoint.authentication) ||
    endpoint.path.length === 0 ||
    endpoint.path.some(
      (segment) =>
        typeof segment !== 'string' ||
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        /[\\/]/u.test(segment),
    ) ||
    !['json', 'text', 'blob', 'array-buffer', 'empty', 'sse', 'ndjson'].includes(
      endpoint.response.mode,
    ) ||
    (endpoint.response.mode !== 'empty' && endpoint.response.mimeTypes.length === 0)
  )
    throw new TypeError('The endpoint definition is invalid.')

  const url = new URL(
    endpoint.path.map((segment) => encodeURIComponent(segment)).join('/'),
    baseUrl,
  )
  const base = new URL(baseUrl)
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
    throw new TypeError('The endpoint escaped the configured API base.')
  }
  for (const [key, raw] of Object.entries(input.query ?? {})) {
    if (raw === undefined) continue
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      if (
        !['string', 'boolean', 'number'].includes(typeof value) ||
        (typeof value === 'number' && !Number.isFinite(value))
      ) {
        throw new TypeError('The query value is invalid.')
      }
      url.searchParams.append(key, String(value))
    }
  }
  const headers = new Headers(input.headers)
  for (const name of headers.keys()) {
    if (managedAuthorizationHeaders.has(name))
      throw new TypeError('Use the authorization boundary.')
  }
  if (!headers.has('accept') && endpoint.response.mimeTypes.length > 0) {
    headers.set('accept', endpoint.response.mimeTypes.join(', '))
  }
  if (input.body === undefined) return { url, headers, body: undefined }
  if (endpoint.method === 'GET' || endpoint.method === 'HEAD')
    throw new TypeError('This method cannot carry a body.')

  if (input.body.kind === 'json') {
    if (
      headers.has('content-type') &&
      headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json'
    ) {
      throw new TypeError('The JSON content type is invalid.')
    }
    headers.set('content-type', 'application/json')
    const body = encodeJsonBody(input.body.value)
    if (body === undefined) throw new TypeError('The JSON body is invalid.')
    return { url, headers, body }
  }
  if (!['native'].includes(input.body.kind))
    throw new TypeError('The request body mode is invalid.')
  let body = input.body.value
  if (!(
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  )) {
    throw new TypeError('The native request body is invalid.')
  }
  if (body instanceof FormData && headers.has('content-type')) {
    throw new TypeError('FormData owns its multipart boundary.')
  }
  if (body instanceof FormData) {
    const snapshot = new FormData()
    for (const [name, value] of body) snapshot.append(name, value)
    body = snapshot
  } else if (body instanceof URLSearchParams) body = new URLSearchParams(body)
  else if (body instanceof ArrayBuffer) body = body.slice(0)
  return { url, headers, body }
}

// Capture caller-owned mutable values before the first asynchronous boundary.
export function snapshotApiParameters(input: ApiRequestParameters): ApiRequestParameters {
  const query =
    input.query === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(input.query).map(([key, value]) => [
            key,
            typeof value === 'object' ? [...value] : value,
          ]),
        )
  let body = input.body
  if (body?.kind === 'json') {
    const encoded = encodeJsonBody(body.value)
    if (encoded === undefined) throw new TypeError('The JSON body is invalid.')
    body = { kind: 'json', value: JSON.parse(encoded) as unknown }
  } else if (body?.kind === 'native') {
    const value = body.value
    if (value instanceof FormData) {
      const copy = new FormData()
      for (const [name, entry] of value) copy.append(name, entry)
      body = { kind: 'native', value: copy }
    } else if (value instanceof URLSearchParams)
      body = { kind: 'native', value: new URLSearchParams(value) }
    else if (value instanceof ArrayBuffer) body = { kind: 'native', value: value.slice(0) }
    else body = { ...body }
  }
  return {
    ...(query === undefined ? {} : { query }),
    ...(input.headers === undefined ? {} : { headers: new Headers(input.headers) }),
    ...(body === undefined ? {} : { body }),
  }
}

export function snapshotApiEndpoint<
  Definition extends ApiEndpoint<unknown, unknown> | ApiStreamEndpoint<unknown, unknown>,
>(endpoint: Definition): Definition {
  const snapshot: Definition = {
    ...endpoint,
    path: Object.freeze([...endpoint.path]),
    response: Object.freeze({
      ...endpoint.response,
      mimeTypes: Object.freeze([...endpoint.response.mimeTypes]),
    }),
  }
  return Object.freeze(snapshot)
}
