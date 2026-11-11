import type { ApiAttempt } from './cancellation'
import type { ApiEndpoint, ApiErrorCategory, ApiStreamEndpoint } from './contracts'
import type { ApiResponseTransform } from './hooks'

export type ApiResponseResult<Value, ErrorData> =
  | { readonly status: 'success' | 'accepted'; readonly data: Value }
  | { readonly status: 'failure'; readonly category: ApiErrorCategory; readonly data?: ErrorData }

async function readBody(
  response: Response,
  attempt: ApiAttempt,
  maximumBytes: number,
): Promise<Uint8Array | undefined> {
  if (response.body === null) return new Uint8Array()
  const length = response.headers.get('content-length')
  if (
    length !== null &&
    (!/^\d+$/u.test(length) ||
      !Number.isSafeInteger(Number(length)) ||
      Number(length) > maximumBytes)
  ) {
    await attempt.run(() => response.body?.cancel() ?? Promise.resolve())
    return undefined
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  let complete = false
  try {
    for (;;) {
      const chunk = await attempt.run(() => reader.read())
      if (chunk.done) {
        complete = true
        break
      }
      bytes += chunk.value.byteLength
      if (bytes > maximumBytes) return undefined
      chunks.push(chunk.value)
    }
    const result = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    return result
  } finally {
    if (!complete) void reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

export async function readApiResponse<Value, ErrorData>(
  response: Response,
  endpoint: ApiEndpoint<Value, ErrorData> | ApiStreamEndpoint<Value, ErrorData>,
  attempt: ApiAttempt,
  maximumBytes: number,
  transform?: ApiResponseTransform,
): Promise<ApiResponseResult<Value, ErrorData>> {
  const failed = (category: ApiErrorCategory): ApiResponseResult<Value, ErrorData> => ({
    status: 'failure',
    category,
  })
  if (response.status === 0 || response.type === 'opaque' || response.type === 'opaqueredirect')
    return failed('protocol')
  if (!response.ok && (endpoint.method === 'HEAD' || response.status === 304)) {
    void response.body?.cancel().catch(() => undefined)
    return failed('http')
  }
  const empty = endpoint.method === 'HEAD' || response.status === 204 || response.status === 205
  if (
    endpoint.method !== 'HEAD' &&
    empty &&
    ![null, '0'].includes(response.headers.get('content-length'))
  )
    return failed('protocol')
  if (empty && endpoint.response.mode !== 'empty') {
    void response.body?.cancel().catch(() => undefined)
    return failed('protocol')
  }
  if (!response.ok && endpoint.errorSchema === undefined) {
    void response.body?.cancel().catch(() => undefined)
    return failed('http')
  }
  const body = await readBody(response, attempt, maximumBytes)
  if (body === undefined) return failed('protocol')
  let data: unknown
  if (endpoint.response.mode === 'empty' && response.ok) {
    if (body.byteLength !== 0) return failed('protocol')
    data = undefined
  } else {
    const contentType = response.headers
      .get('content-type')
      ?.toLowerCase()
      .split(';')
      .map((part) => part.trim())
    const mime = contentType?.[0]
    const json = !response.ok || endpoint.response.mode === 'json'
    if (
      mime === undefined ||
      (json
        ? mime !== 'application/json' && !mime.endsWith('+json')
        : !endpoint.response.mimeTypes.includes(mime))
    )
      return failed('protocol')
    if (response.ok && !endpoint.response.mimeTypes.includes(mime)) return failed('protocol')
    const charset = contentType
      ?.find((part) => part.startsWith('charset='))
      ?.slice(8)
      .replaceAll('"', '')
    if (json || endpoint.response.mode === 'text') {
      if (charset !== undefined && !['utf-8', 'utf8'].includes(charset)) return failed('protocol')
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(body)
        data = json ? (JSON.parse(text) as unknown) : text
      } catch {
        return failed('parse')
      }
    } else {
      const buffer = new ArrayBuffer(body.byteLength)
      new Uint8Array(buffer).set(body)
      data = endpoint.response.mode === 'blob' ? new Blob([buffer], { type: mime }) : buffer
    }
  }
  if (transform !== undefined) {
    try {
      data = await transform(data, response.ok ? 'success' : 'error')
    } catch {
      attempt.signal.throwIfAborted()
      return failed('hook')
    }
  }
  if (!response.ok) {
    const schema = endpoint.errorSchema
    if (schema === undefined) return failed('http')
    try {
      const parsed = await attempt.run(() => schema.safeParseAsync(data))
      return parsed.success
        ? { status: 'failure', category: 'http', data: parsed.data }
        : failed('schema')
    } catch {
      attempt.signal.throwIfAborted()
      return failed('schema')
    }
  }
  try {
    const parsed = await attempt.run(() => endpoint.response.schema.safeParseAsync(data))
    return parsed.success
      ? { status: response.status === 202 ? 'accepted' : 'success', data: parsed.data }
      : failed('schema')
  } catch {
    attempt.signal.throwIfAborted()
    return failed('schema')
  }
}
