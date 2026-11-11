import { z } from 'zod'
import {
  createApiClient,
  type ApiEndpoint,
  type ApiFetch,
  type ApiResult,
  type ApiStreamEndpoint,
} from '../../../shared/api'

export interface AdvancedHookEvidence {
  readonly before: unknown
  readonly sent: unknown
  readonly raw: unknown
  readonly order: readonly string[]
}
export interface AdvancedBatchProgress {
  readonly calls: number
  readonly finished: number
  readonly inFlight: number
  readonly peak: number
}
export type AdvancedStreamMode = 'sse' | 'ndjson'
export type AdvancedStreamScenario = 'valid' | 'malformed' | 'schema'
export interface AdvancedStreamRow {
  readonly index: number
  readonly text: string
}
const configuration = { status: 'configured', baseUrl: 'https://advanced-demo.invalid/' } as const
function pause(milliseconds: number, signal: AbortSignal | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Demo cancelled', 'AbortError'))
      return
    }
    const abort = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('Demo cancelled', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, milliseconds)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

/** Fixed harmless transformations only: no evaluated code, credentials, or global fetch. */
export async function runAdvancedHooks(input: {
  readonly signal: AbortSignal
  readonly title: string
  readonly header: string
  readonly conversion: 'normalize' | 'raw'
}): Promise<{ readonly result: ApiResult<unknown>; readonly evidence: AdvancedHookEvidence }> {
  const before = { query: {}, headers: {}, body: { title: input.title.slice(0, 64) } }
  const raw = { label: '  PAVP response  ', amount: '24' }
  const order: string[] = []
  let sent: unknown = null
  const fetcher: ApiFetch = async (url, request) => {
    sent = {
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(new Headers(request.headers)),
      body: request.body,
    }
    await pause(450, request.signal)
    return Response.json(raw)
  }
  const endpoint: ApiEndpoint<{ title: string; price: number }> = {
    id: 'showcase.advanced.hooks',
    method: 'POST',
    path: ['hooks'],
    policy: 'standard',
    authentication: 'anonymous',
    response: {
      mode: 'json',
      mimeTypes: ['application/json'],
      schema: z.object({ title: z.string(), price: z.number() }),
    },
  }
  const client = createApiClient({
    configuration,
    fetch: fetcher,
    hooks: {
      beforeRequest(parameters) {
        order.push('client.beforeRequest')
        return {
          ...parameters,
          query: { limit: 5, ...parameters.query },
          headers: { 'X-Demo-Label': input.header.slice(0, 64) },
        }
      },
      transformResponse(value) {
        order.push('client.transformResponse')
        return value
      },
    },
  })
  const result = await client.request(endpoint, {
    signal: input.signal,
    body: { kind: 'json', value: before.body },
    hooks: {
      beforeRequest(parameters) {
        order.push('request.beforeRequest')
        return {
          ...parameters,
          body: {
            kind: 'json',
            value: { title: before.body.title.trim().toUpperCase() || 'PAVP SAMPLE' },
          },
        }
      },
      transformResponse(value) {
        order.push('request.transformResponse')
        if (input.conversion === 'raw') return value
        const parsed = z.object({ label: z.string(), amount: z.string() }).parse(value)
        return { title: parsed.label.trim(), price: Number(parsed.amount) }
      },
    },
  })
  return { result, evidence: { before, sent, raw, order } }
}

/** Completion counters describe actual transport calls, not assumed batch success. */
export async function runAdvancedBatch(
  signal: AbortSignal,
  concurrency: number,
  onProgress: (progress: AdvancedBatchProgress) => void,
): Promise<readonly ApiResult<unknown, unknown>[]> {
  let calls = 0
  let finished = 0
  let inFlight = 0
  let peak = 0
  const publish = (): void => {
    onProgress({ calls, finished, inFlight, peak })
  }
  const fetcher: ApiFetch = async (url, input) => {
    const id = Number(url.searchParams.get('job'))
    calls++
    inFlight++
    peak = Math.max(peak, inFlight)
    publish()
    try {
      await pause([1000, 350, 700, 450, 550][id - 1] ?? 500, input.signal)
      return Response.json(
        { job: id, title: `PAVP job ${String(id)}` },
        { status: id === 2 ? 503 : id === 4 ? 202 : 200 },
      )
    } finally {
      inFlight--
      finished++
      publish()
    }
  }
  const endpoint: ApiEndpoint<{ job: number; title: string }> = {
    id: 'showcase.advanced.batch',
    method: 'GET',
    path: ['batch'],
    policy: 'standard',
    authentication: 'anonymous',
    response: {
      mode: 'json',
      mimeTypes: ['application/json'],
      schema: z.object({ job: z.number(), title: z.string() }),
    },
  }
  return createApiClient({ configuration, fetch: fetcher }).batch(
    [1, 2, 3, 4, 5].map((job) => ({ endpoint, input: { query: { job } } })),
    { signal, concurrency },
  )
}

function createFiniteStream(
  mode: AdvancedStreamMode,
  scenario: AdvancedStreamScenario,
  signal: AbortSignal | null | undefined,
): ReadableStream<Uint8Array> {
  const lifetime = new AbortController()
  const abort = (): void => {
    lifetime.abort()
  }
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const release = (): void => {
    signal?.removeEventListener('abort', abort)
    lifetime.abort()
  }
  let index = 0
  let cancelled = false
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await pause(450, lifetime.signal)
        if (cancelled) return
        const invalid = index === 3 && scenario !== 'valid'
        if (invalid && scenario === 'malformed') {
          controller.enqueue(
            mode === 'sse' ? new Uint8Array([0xc3, 0x28, 0x0a]) : encoder.encode('{broken\n'),
          )
        } else {
          const text = invalid ? 'invalid' : `PAVP event ${String(index + 1)}`
          controller.enqueue(
            encoder.encode(
              mode === 'sse'
                ? `id: ${String(index + 1)}\nevent: sample\ndata: ${text}\n\n`
                : `${JSON.stringify(invalid ? { text: 42 } : { text })}\n`,
            ),
          )
        }
        index++
        if (index === 6 || invalid) {
          controller.close()
          release()
        }
      } catch (error) {
        if (!cancelled) controller.error(error)
        release()
      }
    },
    cancel() {
      cancelled = true
      release()
    },
  })
}

export async function runAdvancedStream(
  signal: AbortSignal,
  mode: AdvancedStreamMode,
  scenario: AdvancedStreamScenario,
  onRow: (row: AdvancedStreamRow) => void,
): Promise<ApiResult<{ eventCount: number }>> {
  const fetcher: ApiFetch = (_url, input) =>
    Promise.resolve(
      new Response(createFiniteStream(mode, scenario, input.signal), {
        headers: { 'Content-Type': mode === 'sse' ? 'text/event-stream' : 'application/x-ndjson' },
      }),
    )
  const schema = z.string().startsWith('PAVP ').max(80)
  const endpoint: ApiStreamEndpoint<string> = {
    id: 'showcase.advanced.stream',
    method: 'GET',
    path: ['stream'],
    policy: 'stream',
    authentication: 'anonymous',
    response: {
      mode,
      mimeTypes: [mode === 'sse' ? 'text/event-stream' : 'application/x-ndjson'],
      schema: mode === 'sse' ? schema : z.object({ text: schema }).transform((value) => value.text),
    },
  }
  return createApiClient({ configuration, fetch: fetcher }).stream(endpoint, {
    signal,
    onEvent(event) {
      onRow({ index: event.index, text: event.data })
    },
  })
}
