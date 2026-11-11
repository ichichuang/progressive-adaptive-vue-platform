import type { ApiAttempt } from './cancellation'
import type {
  ApiHookContext,
  ApiStreamEndpoint,
  ApiStreamEvent,
  ApiStreamInput,
  ApiStreamSummary,
} from './contracts'
import { ApiProcessingError } from './errors'
import type { ApiResponseTransform } from './hooks'
import type { ApiStreamPolicy } from './policies'
import { readApiResponse, type ApiResponseResult } from './response'

export async function readApiStream<Value, ErrorData>(
  response: Response,
  endpoint: ApiStreamEndpoint<Value, ErrorData>,
  attempt: ApiAttempt,
  policy: ApiStreamPolicy,
  transform: ApiResponseTransform,
  onEvent: ApiStreamInput<Value>['onEvent'],
  context: ApiHookContext,
): Promise<ApiResponseResult<ApiStreamSummary, ErrorData>> {
  const failed = (category: 'protocol'): ApiResponseResult<ApiStreamSummary, ErrorData> => ({
    status: 'failure',
    category,
  })
  if (!response.ok) {
    const error = await readApiResponse(
      response,
      endpoint,
      attempt,
      policy.maximumResponseBytes,
      transform,
    )
    return error.status === 'failure' ? error : failed('protocol')
  }
  const parts = response.headers
    .get('content-type')
    ?.toLowerCase()
    .split(';')
    .map((part) => part.trim())
  const mime = parts?.[0]
  const charset = parts
    ?.find((part) => part.startsWith('charset='))
    ?.slice(8)
    .replaceAll('"', '')
  const sse = endpoint.response.mode === 'sse'
  const length = response.headers.get('content-length')
  if (
    response.body === null ||
    response.status === 204 ||
    response.status === 205 ||
    mime === undefined ||
    !endpoint.response.mimeTypes.includes(mime) ||
    !(sse
      ? mime === 'text/event-stream'
      : ['application/x-ndjson', 'application/ndjson'].includes(mime)) ||
    (charset !== undefined && !['utf-8', 'utf8'].includes(charset)) ||
    (length !== null &&
      (!/^\d+$/u.test(length) ||
        !Number.isSafeInteger(Number(length)) ||
        Number(length) > policy.maximumResponseBytes))
  )
    return failed('protocol')

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  const lineBytes: number[] = []
  let firstLine = true
  let pendingCR = false
  let eventBytes = 0
  let totalBytes = 0
  let eventCount = 0
  let complete = false
  let dataLines: string[] = []
  let eventName = ''
  let lastEventId = ''

  const emit = async (
    value: unknown,
    metadata: Pick<ApiStreamEvent<Value>, 'event' | 'id'> = {},
  ): Promise<void> => {
    let transformed: unknown
    try {
      transformed = await transform(value, 'event')
    } catch {
      attempt.signal.throwIfAborted()
      throw new ApiProcessingError('hook')
    }
    let data: Value
    try {
      const parsed = await attempt.run(() => endpoint.response.schema.safeParseAsync(transformed))
      if (!parsed.success) throw new ApiProcessingError('schema')
      data = parsed.data
    } catch {
      attempt.signal.throwIfAborted()
      throw new ApiProcessingError('schema')
    }
    try {
      await attempt.run(() =>
        Promise.resolve(onEvent(Object.freeze({ data, index: eventCount, ...metadata }), context)),
      )
    } catch {
      attempt.signal.throwIfAborted()
      throw new ApiProcessingError('consumer')
    }
    attempt.signal.throwIfAborted()
    eventCount += 1
  }

  const line = async (): Promise<void> => {
    let text: string
    try {
      text = decoder.decode(new Uint8Array(lineBytes))
    } catch {
      throw new ApiProcessingError('parse')
    }
    lineBytes.length = 0
    if (firstLine) {
      if (text.startsWith('\uFEFF')) text = text.slice(1)
      firstLine = false
    }
    if (!sse) {
      eventBytes = 0
      if (text.trim() === '') return
      let value: unknown
      try {
        value = JSON.parse(text) as unknown
      } catch {
        throw new ApiProcessingError('parse')
      }
      await emit(value)
      return
    }
    if (text === '') {
      eventBytes = 0
      if (dataLines.length > 0)
        await emit(dataLines.join('\n'), { event: eventName || 'message', id: lastEventId })
      dataLines = []
      eventName = ''
      return
    }
    if (text.startsWith(':')) return
    const colon = text.indexOf(':')
    const field = colon === -1 ? text : text.slice(0, colon)
    let value = colon === -1 ? '' : text.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'data') dataLines.push(value)
    else if (field === 'event') eventName = value
    else if (field === 'id' && !value.includes('\0')) lastEventId = value
    // retry is intentionally ignored: this transport performs exactly one connection.
  }

  try {
    for (;;) {
      const chunk = await attempt.wait(() => reader.read(), policy.idleTimeoutMilliseconds)
      if (chunk.done) {
        if (!sse) {
          if (pendingCR) throw new ApiProcessingError('parse')
          if (lineBytes.length > 0) await line()
        }
        // SSE dispatches only on a blank line, never an unfinished event at EOF.
        complete = true
        return {
          status: response.status === 202 ? 'accepted' : 'success',
          data: Object.freeze({ eventCount }),
        }
      }
      totalBytes += chunk.value.byteLength
      if (totalBytes > policy.maximumResponseBytes) throw new ApiProcessingError('protocol')
      for (const byte of chunk.value) {
        attempt.signal.throwIfAborted()
        if (pendingCR) {
          pendingCR = false
          if (byte === 10) {
            if (!sse) await line()
            continue
          }
          if (!sse) throw new ApiProcessingError('parse')
        }
        eventBytes += 1
        if (eventBytes > policy.maximumEventBytes) throw new ApiProcessingError('protocol')
        if (byte === 13) {
          pendingCR = true
          if (sse) await line()
        } else if (byte === 10) await line()
        else lineBytes.push(byte)
      }
    }
  } finally {
    if (!complete) void reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
