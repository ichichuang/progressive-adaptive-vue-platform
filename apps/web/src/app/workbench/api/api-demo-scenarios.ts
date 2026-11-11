import { z } from 'zod'
import {
  createApiClient,
  type ApiEndpoint,
  type ApiFetch,
  type ApiMethod,
  type ApiRequestInput,
  type ApiResult,
} from '../../../shared/api'

export const apiDemoScenarioGroups = {
  basics: ['product', 'search'],
  parameters: [
    'query',
    'post',
    'put',
    'patch',
    'delete',
    'form-data',
    'url-encoded',
    'body-text',
    'body-blob',
    'body-buffer',
    'get-body',
    'bad-path',
    'form-content-type',
  ],
  responses: [
    'json',
    'text',
    'blob',
    'array-buffer',
    'empty',
    'head',
    'accepted',
    'mime',
    'parse',
    'schema',
  ],
  cancellation: ['delay', 'timeout'],
  errors: ['network', 'not-found', 'rate-limit', 'unavailable', 'recovery'],
  authorization: [
    'anonymous',
    'provided',
    'missing-provider',
    'failed-provider',
    'header-override',
    'path-escape',
    'oversized',
  ],
} as const
export type ApiDemoScenario =
  (typeof apiDemoScenarioGroups)[keyof typeof apiDemoScenarioGroups][number]

const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  description: z.string().optional(),
  category: z.string().optional(),
})
function productEndpoint(productId: number) {
  return {
    id: 'api-showcase.product',
    method: 'GET',
    path: ['products', String(productId)],
    policy: 'standard',
    authentication: 'anonymous',
    response: { mode: 'json', mimeTypes: ['application/json'], schema: productSchema },
  } as const satisfies ApiEndpoint<z.infer<typeof productSchema>>
}

interface ApiDemoEvidence {
  readonly transport: 'public' | 'local'
  readonly method: ApiMethod
  readonly url: string | null
  readonly bodyKind: string
  readonly bodyPreview: unknown
  readonly calls: number | null
  readonly authorization: {
    readonly endpointId: string
    readonly method: ApiMethod
    readonly origin: string
  } | null
}
export interface ApiDemoOutcome {
  readonly result: ApiResult<unknown, unknown>
  readonly evidence: ApiDemoEvidence
  readonly elapsedMilliseconds: number
}
export interface ApiDemoInput {
  readonly signal: AbortSignal
  readonly productId: number
  readonly search: string
}

const sample = { id: 1, title: 'PAVP sample', price: 24 }
const localSchema = z.object({ id: z.number(), title: z.string(), price: z.number() })

/** The injected transport owns its timer and releases it on both abort and completion. */
function waitForResponse(
  milliseconds: number,
  signal: AbortSignal | null | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The demo request was cancelled.', 'AbortError'))
      return
    }
    const finish = (): void => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }
    const timer = setTimeout(finish, milliseconds)
    const abort = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('The demo request was cancelled.', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

function localResponse(scenario: ApiDemoScenario, productId: number): Response {
  if (scenario === 'network') throw new TypeError('Local network failure scenario')
  if (scenario === 'not-found') return Response.json({ message: 'Not found' }, { status: 404 })
  if (scenario === 'rate-limit')
    return Response.json({ message: 'Try later' }, { status: 429, headers: { 'Retry-After': '3' } })
  if (scenario === 'unavailable') return Response.json({ message: 'Unavailable' }, { status: 503 })
  if (scenario === 'empty' || scenario === 'head') return new Response(null, { status: 204 })
  if (scenario === 'mime')
    return new Response(JSON.stringify(sample), { headers: { 'Content-Type': 'text/plain' } })
  if (scenario === 'parse')
    return new Response('{broken', { headers: { 'Content-Type': 'application/json' } })
  if (scenario === 'schema') return Response.json({ ...sample, price: 'invalid' })
  if (scenario === 'oversized')
    return new Response('x'.repeat(1024 * 1024 + 1), {
      headers: { 'Content-Type': 'application/json' },
    })
  if (scenario === 'text')
    return new Response('PAVP response sample', { headers: { 'Content-Type': 'text/plain' } })
  if (scenario === 'blob' || scenario === 'array-buffer')
    return new Response(new Uint8Array([80, 65, 86, 80]), {
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  return Response.json(
    scenario === 'delay'
      ? { ...sample, id: productId, title: `PAVP sample ${String(productId)}` }
      : sample,
    { status: scenario === 'accepted' ? 202 : 200 },
  )
}

function requestBody(scenario: ApiDemoScenario, search: string): ApiRequestInput['body'] {
  if (['post', 'put', 'patch', 'delete', 'get-body'].includes(scenario))
    return { kind: 'json', value: { ...sample, title: search || sample.title } }
  if (scenario === 'form-data' || scenario === 'form-content-type') {
    const value = new FormData()
    value.set('title', search || sample.title)
    value.set('price', '24')
    return { kind: 'native', value }
  }
  if (scenario === 'url-encoded')
    return {
      kind: 'native',
      value: new URLSearchParams({ title: search || sample.title, price: '24' }),
    }
  if (scenario === 'body-text') return { kind: 'native', value: search || 'PAVP sample' }
  if (scenario === 'body-blob')
    return { kind: 'native', value: new Blob(['PAVP'], { type: 'text/plain' }) }
  if (scenario === 'body-buffer')
    return { kind: 'native', value: new TextEncoder().encode('PAVP').buffer }
  return undefined
}

function describeBody(body: BodyInit | null | undefined): {
  bodyKind: string
  bodyPreview: unknown
} {
  if (body === undefined || body === null) return { bodyKind: 'none', bodyPreview: null }
  if (typeof body === 'string') return { bodyKind: 'text', bodyPreview: body }
  if (body instanceof FormData)
    return {
      bodyKind: 'FormData',
      bodyPreview: Object.fromEntries(
        [...body].map(([key, value]) => [
          key,
          typeof value === 'string' ? value : { type: value.type, bytes: value.size },
        ]),
      ),
    }
  if (body instanceof URLSearchParams)
    return { bodyKind: 'URLSearchParams', bodyPreview: body.toString() }
  if (body instanceof Blob)
    return { bodyKind: 'Blob', bodyPreview: { type: body.type, bytes: body.size } }
  if (body instanceof ArrayBuffer)
    return { bodyKind: 'ArrayBuffer', bodyPreview: { bytes: body.byteLength } }
  return { bodyKind: 'binary', bodyPreview: null }
}

/** Finite demo inputs only. Local scenarios never fall through to global fetch. */
export async function runApiDemo(
  scenario: ApiDemoScenario,
  input: ApiDemoInput,
): Promise<ApiDemoOutcome> {
  const started = performance.now()
  const remote = scenario === 'product' || scenario === 'search'
  const body = requestBody(scenario, input.search)
  const method: ApiMethod =
    scenario === 'head'
      ? 'HEAD'
      : scenario === 'put'
        ? 'PUT'
        : scenario === 'patch'
          ? 'PATCH'
          : scenario === 'delete'
            ? 'DELETE'
            : body !== undefined && scenario !== 'get-body'
              ? 'POST'
              : 'GET'
  let evidence: ApiDemoEvidence = {
    transport: remote ? 'public' : 'local',
    method,
    url: null,
    bodyKind: 'none',
    bodyPreview: null,
    calls: remote ? null : 0,
    authorization: null,
  }
  const fetcher: ApiFetch = async (url, request) => {
    evidence = {
      ...evidence,
      url: url.href,
      calls: (evidence.calls ?? 0) + 1,
      ...describeBody(request.body),
    }
    await waitForResponse(
      scenario === 'timeout'
        ? 12_000
        : scenario === 'delay'
          ? input.productId === 1
            ? 1600
            : input.productId === 2
              ? 800
              : 400
          : 160,
      request.signal,
    )
    return localResponse(scenario, input.productId)
  }
  const api = createApiClient({
    configuration: {
      status: 'configured',
      baseUrl: remote ? 'https://dummyjson.com/' : 'https://pavp-demo.invalid/api/',
    },
    ...(remote ? {} : { fetch: fetcher }),
    ...(scenario === 'provided' || scenario === 'failed-provider'
      ? {
          authorize: ({
            endpointId,
            method: authorizationMethod,
            origin,
          }: {
            endpointId: string
            method: ApiMethod
            origin: string
          }) => {
            evidence = {
              ...evidence,
              authorization: { endpointId, method: authorizationMethod, origin },
            }
            if (scenario === 'failed-provider')
              return Promise.reject(new Error('Local authorization failure scenario'))
            return Promise.resolve({
              headers: { 'X-Demo-Authorization': 'local-sample-not-a-credential' },
              credentials: 'omit' as const,
            })
          },
        }
      : {}),
  })
  let endpoint: ApiEndpoint<unknown> = {
    id: `api-showcase.${scenario}`,
    method,
    path:
      scenario === 'bad-path'
        ? ['products/1']
        : scenario === 'path-escape'
          ? ['..', 'outside']
          : ['sample'],
    policy: 'standard',
    authentication: ['provided', 'missing-provider', 'failed-provider'].includes(scenario)
      ? 'provided'
      : 'anonymous',
    response: { mode: 'json', mimeTypes: ['application/json'], schema: localSchema },
  }
  if (scenario === 'product') endpoint = productEndpoint(input.productId)
  if (scenario === 'search')
    endpoint = {
      ...endpoint,
      path: ['products', 'search'],
      response: {
        mode: 'json',
        mimeTypes: ['application/json'],
        schema: z.object({
          products: z.array(productSchema),
          total: z.number(),
          skip: z.number(),
          limit: z.number(),
        }),
      },
    }
  if (scenario === 'empty' || scenario === 'head')
    endpoint = { ...endpoint, response: { mode: 'empty', mimeTypes: [], schema: z.undefined() } }
  if (scenario === 'text')
    endpoint = {
      ...endpoint,
      response: { mode: 'text', mimeTypes: ['text/plain'], schema: z.string() },
    }
  if (scenario === 'blob')
    endpoint = {
      ...endpoint,
      response: {
        mode: 'blob',
        mimeTypes: ['application/octet-stream'],
        schema: z.instanceof(Blob),
      },
    }
  if (scenario === 'array-buffer')
    endpoint = {
      ...endpoint,
      response: {
        mode: 'array-buffer',
        mimeTypes: ['application/octet-stream'],
        schema: z.instanceof(ArrayBuffer),
      },
    }
  if (remote) {
    const url = new URL(endpoint.path.map(encodeURIComponent).join('/'), 'https://dummyjson.com/')
    if (scenario === 'search') {
      url.searchParams.set('q', input.search)
      url.searchParams.set('limit', '5')
      url.searchParams.set('skip', '0')
    }
    evidence = { ...evidence, url: url.href }
  }
  const result = await api.request(endpoint, {
    signal: input.signal,
    ...(body === undefined ? {} : { body }),
    ...(scenario === 'search'
      ? { query: { q: input.search, limit: 5, skip: 0 } }
      : scenario === 'query'
        ? { query: { q: input.search, tag: ['design', 'vue'], limit: 5, optional: undefined } }
        : {}),
    ...(scenario === 'form-content-type'
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : scenario === 'header-override'
        ? { headers: { Authorization: 'local-sample-not-a-credential' } }
        : {}),
  })
  return { result, evidence, elapsedMilliseconds: performance.now() - started }
}
