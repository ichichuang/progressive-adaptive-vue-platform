import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createApiClient, type ApiEndpoint, type ApiResult } from '../../apps/web/src/shared/api'

// Resolve runtime schemas from their application owner, as the transport architecture checks do.
const z = createRequire(resolve(process.cwd(), 'apps/web/package.json'))('zod') as {
  number(): ApiEndpoint<number>['response']['schema']
  string(): ApiEndpoint<string>['response']['schema']
  object(shape: { value: ApiEndpoint<number>['response']['schema'] }): ApiEndpoint<{
    value: number
  }>['response']['schema']
}

function at<T>(values: readonly T[], index: number): T {
  const value = values[index]
  assert.notEqual(value, undefined)
  return value as T
}

const configuration = { status: 'configured', baseUrl: 'https://advanced.invalid/' } as const
const endpoint = {
  id: 'advanced.test',
  method: 'GET',
  path: ['test'],
  policy: 'standard',
  authentication: 'anonymous',
  response: {
    mode: 'json',
    mimeTypes: ['application/json'],
    schema: z.object({ value: z.number() }),
  },
} as const satisfies ApiEndpoint<{ value: number }>
const signal = () => new AbortController().signal
const json = (value: number, status = 200) => Response.json({ value }, { status })
function failure(result: ApiResult<unknown, unknown>, category: string) {
  assert.equal(result.status, 'failure')
  assert.equal(result.error.category, category)
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const never = () =>
  new Promise<never>(() => {
    /* Intentionally pending until the operation is aborted. */
  })
const order: string[] = []
const hooked = createApiClient({
  configuration,
  hooks: {
    beforeRequest(parameters) {
      order.push('client-request')
      return { ...parameters, query: { value: 7 } }
    },
    transformResponse(value) {
      order.push('client-response')
      return { value: Number(Reflect.get(value as object, 'value')) }
    },
  },
  fetch: async (url) => {
    await Promise.resolve()
    assert.equal(url.searchParams.get('value'), '7')
    return Response.json({ value: '8' })
  },
})
const transformed = await hooked.request(endpoint, {
  signal: signal(),
  hooks: {
    beforeRequest(parameters) {
      order.push('request-request')
      return parameters
    },
    transformResponse(value) {
      order.push('request-response')
      return { value: Number(Reflect.get(value as object, 'value')) + 1 }
    },
  },
})
assert.equal(transformed.status, 'success')
assert.deepEqual(transformed.data, { value: 9 })
assert.deepEqual(order, [
  'client-request',
  'request-request',
  'client-response',
  'request-response',
])
let authorizationCalls = 0
const invalid = createApiClient({
  configuration,
  authorize: async () => {
    await Promise.resolve()
    authorizationCalls++
    return { headers: {}, credentials: 'omit' }
  },
  hooks: {
    beforeRequest(parameters) {
      return { ...parameters, headers: { Authorization: 'forbidden' } }
    },
  },
  fetch: async () => {
    await Promise.resolve()
    throw new Error('invalid hook must not fetch')
  },
})
failure(
  await invalid.request({ ...endpoint, authentication: 'provided' }, { signal: signal() }),
  'request',
)
assert.equal(authorizationCalls, 0)
failure(
  await hooked.request(endpoint, {
    signal: signal(),
    hooks: { transformResponse: () => ({ value: 'bad' }) },
  }),
  'schema',
)
for (const phase of ['beforeRequest', 'transformResponse'] as const) {
  const controller = new AbortController()
  const entered = deferred<undefined>()
  const client = createApiClient({
    configuration,
    fetch: async () => await Promise.resolve(json(1)),
    hooks: {
      [phase]: () => {
        entered.resolve(undefined)
        return never()
      },
    },
  })
  const pending = client.request(endpoint, { signal: controller.signal })
  await entered.promise
  controller.abort()
  failure(await pending, 'caller-abort')
}

// Explicit transport gates make concurrency and completion ordering deterministic.
const gates = Array.from({ length: 4 }, () => deferred<Response>())
const started: number[] = []
const enteredSecond = deferred<undefined>()
const enteredThird = deferred<undefined>()
const batchClient = createApiClient({
  configuration,
  fetch: async (url) => {
    await Promise.resolve()
    const index = Number(url.searchParams.get('index'))
    started.push(index)
    if (started.length === 2) enteredSecond.resolve(undefined)
    if (started.length === 3) enteredThird.resolve(undefined)
    return at(gates, index).promise
  },
})
const queries = Array.from({ length: 4 }, (_, index) => ({ index }))
const batch = batchClient.batch(
  queries.map((query) => ({ endpoint, input: { query } })),
  { signal: signal(), concurrency: 2 },
)
await enteredSecond.promise
assert.deepEqual(started, [0, 1])
at(queries, 2).index = 99
at(gates, 1).resolve(json(1, 202))
await enteredThird.promise
assert.deepEqual(started, [0, 1, 2])
at(gates, 2).resolve(Response.json({ reason: 'bad' }, { status: 400 }))
at(gates, 0).resolve(json(0))
at(gates, 3).resolve(json(3))
const results = await batch
assert.deepEqual(
  results.map((result) => result.status),
  ['success', 'accepted', 'failure', 'success'],
)
const firstResult = at(results, 0)
if (firstResult.status !== 'failure') assert.equal(firstResult.data.value, 0)
failure(at(results, 2), 'http')

const group = new AbortController()
const firstStarted = deferred<undefined>()
let calls = 0
const abortClient = createApiClient({
  configuration,
  fetch: () => {
    calls++
    firstStarted.resolve(undefined)
    return never()
  },
})
const cancelledBatch = abortClient.batch(
  Array.from({ length: 3 }, () => ({ endpoint, input: {} })),
  { signal: group.signal, concurrency: 1 },
)
await firstStarted.promise
group.abort()
for (const result of await cancelledBatch) failure(result, 'caller-abort')
assert.equal(calls, 1)
const individual = new AbortController()
individual.abort()
const isolated = await createApiClient({
  configuration,
  fetch: async () => await Promise.resolve(json(1)),
}).batch(
  [
    { endpoint, input: { signal: individual.signal } },
    { endpoint, input: {} },
  ],
  { signal: signal() },
)
failure(isolated[0], 'caller-abort')
assert.equal(isolated[1].status, 'success')

console.log(
  'Advanced API: hook ordering, transform validation, hook cancellation, batch concurrency/order/snapshots and cancellation passed.',
)

function bytewise(text: string, mime: string) {
  const bytes = new TextEncoder().encode(text)
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
        controller.close()
      },
    }),
    { headers: { 'content-type': mime } },
  )
}
const sse = {
  ...endpoint,
  policy: 'stream',
  response: { mode: 'sse', mimeTypes: ['text/event-stream'], schema: z.string() },
} as const
const ndjson = {
  ...endpoint,
  policy: 'stream',
  response: {
    mode: 'ndjson',
    mimeTypes: ['application/x-ndjson'],
    schema: z.object({ value: z.number() }),
  },
} as const
const events: unknown[] = []
const streamed = await createApiClient({
  configuration,
  fetch: async () => {
    await Promise.resolve()
    return bytewise(
      '\uFEFF: comment\r\nid: abc\revent: update\ndata: 你好\r\ndata: world\r\n\r\ndata: ignored',
      'text/event-stream',
    )
  },
}).stream(sse, {
  signal: signal(),
  onEvent(event) {
    events.push(event)
  },
})
assert.equal(streamed.status, 'success')
assert.equal(streamed.data.eventCount, 1)
assert.deepEqual(events, [{ data: '你好\nworld', index: 0, id: 'abc', event: 'update' }])
const lines: unknown[] = []
const lineResult = await createApiClient({
  configuration,
  fetch: async () =>
    await Promise.resolve(bytewise('\n{"value":1}\r\n\n{"value":2}', 'application/x-ndjson')),
}).stream(ndjson, {
  signal: signal(),
  async onEvent(event) {
    await Promise.resolve(undefined)
    lines.push(event.data)
  },
})
assert.equal(lineResult.status, 'success')
assert.deepEqual(lines, [{ value: 1 }, { value: 2 }])
for (const [body, category] of [
  ['invalid\n', 'parse'],
  ['{"value":"invalid"}\n', 'schema'],
] as const) {
  failure(
    await createApiClient({
      configuration,
      fetch: async () => await Promise.resolve(bytewise(body, 'application/x-ndjson')),
    }).stream(ndjson, {
      signal: signal(),
      onEvent() {
        /* This case asserts the terminal result only. */
      },
    }),
    category,
  )
}
for (const limit of ['maximumEventBytes', 'maximumResponseBytes'] as const) {
  failure(
    await createApiClient({
      configuration,
      policies: { stream: { [limit]: 4 } },
      fetch: async () => await Promise.resolve(bytewise('{"value":1}\n', 'application/x-ndjson')),
    }).stream(ndjson, {
      signal: signal(),
      onEvent() {
        /* This case asserts the terminal result only. */
      },
    }),
    'protocol',
  )
}
for (const phase of ['read', 'consumer'] as const) {
  let cleaned = false
  const controller = new AbortController()
  const entered = deferred<undefined>()
  const client = createApiClient({
    configuration,
    fetch: async () =>
      await Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            start(stream) {
              if (phase === 'consumer') stream.enqueue(new TextEncoder().encode('{"value":1}\n'))
              else entered.resolve(undefined)
            },
            cancel() {
              cleaned = true
            },
          }),
          { headers: { 'content-type': 'application/x-ndjson' } },
        ),
      ),
  })
  const pending = client.stream(ndjson, {
    signal: controller.signal,
    onEvent() {
      entered.resolve(undefined)
      return never()
    },
  })
  await entered.promise
  controller.abort()
  failure(await pending, 'caller-abort')
  assert.equal(cleaned, true)
}
let cleanedFailure = false
const consumerFailure = await createApiClient({
  configuration,
  fetch: async () =>
    await Promise.resolve(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"value":1}\n'))
          },
          cancel() {
            cleanedFailure = true
          },
        }),
        { headers: { 'content-type': 'application/x-ndjson' } },
      ),
    ),
}).stream(ndjson, {
  signal: signal(),
  onEvent() {
    throw new Error('consumer rejected')
  },
})
failure(consumerFailure, 'consumer')
assert.equal(cleanedFailure, true)
console.log(
  'Advanced streams: bytewise Unicode/SSE framing, NDJSON final line, malformed/schema/limit failures, cancellation and reader cleanup passed.',
)

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
for (const phase of ['beforeRequest', 'transformResponse'] as const) {
  failure(
    await createApiClient({
      configuration,
      fetch: async () => await Promise.resolve(json(1)),
      hooks: {
        [phase]() {
          throw new Error('hook failed')
        },
      },
    }).request(endpoint, { signal: signal() }),
    'hook',
  )
}
let idleCleaned = false
failure(
  await createApiClient({
    configuration,
    policies: { stream: { idleTimeoutMilliseconds: 20 } },
    fetch: async () =>
      await Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            cancel() {
              idleCleaned = true
            },
          }),
          { headers: { 'content-type': 'application/x-ndjson' } },
        ),
      ),
  }).stream(ndjson, {
    signal: signal(),
    onEvent() {
      /* This case asserts the terminal result only. */
    },
  }),
  'timeout',
)
assert.equal(idleCleaned, true)
const slowConsumer = await createApiClient({
  configuration,
  policies: { stream: { idleTimeoutMilliseconds: 20, timeoutMilliseconds: 2000 } },
  fetch: async () =>
    await Promise.resolve(bytewise('{"value":1}\n{"value":2}\n', 'application/x-ndjson')),
}).stream(ndjson, {
  signal: signal(),
  async onEvent() {
    await pause(60)
  },
})
assert.equal(slowConsumer.status, 'success')
failure(
  await createApiClient({
    configuration,
    policies: { stream: { timeoutMilliseconds: 20, idleTimeoutMilliseconds: 1000 } },
    fetch: async () => await Promise.resolve(bytewise('{"value":1}\n', 'application/x-ndjson')),
  }).stream(ndjson, { signal: signal(), onEvent: never }),
  'timeout',
)
let httpCalls = 0
failure(
  await createApiClient({
    configuration,
    fetch: async () => {
      await Promise.resolve()
      httpCalls++
      return Response.json({ message: 'unavailable' }, { status: 503 })
    },
  }).stream(ndjson, {
    signal: signal(),
    onEvent() {
      assert.fail('HTTP errors must not deliver events')
    },
  }),
  'http',
)
assert.equal(httpCalls, 1)

// A transport which ignores abort may resolve later; its body must still be released.
for (const mode of ['request', 'stream'] as const) {
  const late = deferred<Response>()
  const started = deferred<undefined>()
  const aborted = new AbortController()
  let released = false
  const client = createApiClient({
    configuration,
    fetch: () => {
      started.resolve(undefined)
      return late.promise
    },
  })
  const pending =
    mode === 'request'
      ? client.request(endpoint, { signal: aborted.signal })
      : client.stream(ndjson, {
          signal: aborted.signal,
          onEvent() {
            /* This case asserts the terminal result only. */
          },
        })
  await started.promise
  aborted.abort()
  failure(await pending, 'caller-abort')
  late.resolve(
    new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          released = true
        },
      }),
    ),
  )
  await pause(0)
  assert.equal(released, true, `${mode} must cancel a late response body`)
}
console.log(
  'Advanced API deadlines: idle timeout, slow consumer exemption, total timeout, thrown hooks, HTTP no-reconnect and late-body cleanup passed.',
)

const lateHeaders = deferred<Response>()
let lateHeadersReleased = false
failure(
  await createApiClient({
    configuration,
    policies: { stream: { idleTimeoutMilliseconds: 20, timeoutMilliseconds: 2000 } },
    fetch: () => lateHeaders.promise,
  }).stream(ndjson, {
    signal: signal(),
    onEvent() {
      /* No event can arrive before headers. */
    },
  }),
  'timeout',
)
lateHeaders.resolve(
  new Response(
    new ReadableStream<Uint8Array>({
      cancel() {
        lateHeadersReleased = true
      },
    }),
  ),
)
await pause(0)
assert.equal(lateHeadersReleased, true)
console.log('Advanced stream response-header idle deadline and late-body cleanup passed.')

await (await import('./check-upload')).verifyUploads()
await (await import('./check-form-upload-source')).verifyFormUploadSource()
