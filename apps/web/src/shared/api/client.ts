import { createApiAttempt } from './cancellation'
import { apiConfigurationSchema } from './configuration'
import type {
  ApiClient,
  ApiClientInput,
  ApiEndpoint,
  ApiError,
  ApiErrorCategory,
  ApiRequestInput,
  ApiResult,
} from './contracts'
import { apiRequestPolicies } from './policies'
import { createApiFailure, createApiRequestIdentity } from './errors'
import { createApiRequest } from './request'
import { readApiResponse } from './response'

export function createApiClient(input: ApiClientInput): ApiClient {
  const configuration = apiConfigurationSchema.safeParse(input.configuration)
  const fetcher =
    input.fetch ?? ((url: URL, request: RequestInit) => globalThis.fetch(url, request))
  const authorize = input.authorize
  let baseUrl: string | undefined
  if (configuration.success && configuration.data.status === 'configured') {
    try {
      const value = configuration.data.baseUrl
      if (value.startsWith('/')) {
        const origin = input.origin === undefined ? undefined : new URL(input.origin)
        if (
          origin !== undefined &&
          ['http:', 'https:'].includes(origin.protocol) &&
          origin.origin === input.origin
        )
          baseUrl = new URL(value, origin).href
      } else baseUrl = value
    } catch {
      baseUrl = undefined
    }
  }
  return Object.freeze({
    async request<Value, ErrorData = never>(
      endpoint: ApiEndpoint<Value, ErrorData>,
      request: ApiRequestInput,
    ): Promise<ApiResult<Value, ErrorData>> {
      const identity = createApiRequestIdentity(endpoint.id)
      const { endpointId, requestId } = identity
      const failure = (
        category: ApiErrorCategory,
        extra: Pick<ApiError<ErrorData>, 'httpStatus' | 'data' | 'retryAfterSeconds'> = {},
      ): ApiResult<Value, ErrorData> => createApiFailure(identity, category, extra)
      if (baseUrl === undefined) return failure('configuration')
      if (endpointId === 'invalid-endpoint' || !(request.signal instanceof AbortSignal))
        return failure('request')
      const attempt = createApiAttempt(
        request.signal,
        apiRequestPolicies.standard.timeoutMilliseconds,
      )
      let phase: ApiErrorCategory = 'request'
      let response: Response | undefined
      try {
        attempt.signal.throwIfAborted()
        const definition: ApiEndpoint<Value, ErrorData> = {
          ...endpoint,
          path: [...endpoint.path],
          response: { ...endpoint.response, mimeTypes: [...endpoint.response.mimeTypes] },
        }
        const prepared = createApiRequest(baseUrl, definition, request)
        let credentials: RequestCredentials = 'omit'
        if (definition.authentication === 'provided') {
          phase = 'authorization'
          if (authorize === undefined) return failure('authorization')
          const authorization = await attempt.run(() =>
            authorize({
              endpointId,
              method: definition.method,
              origin:
                configuration.success && configuration.data.status === 'configured'
                  ? (configuration.data.upstreamOrigin ?? prepared.url.origin)
                  : prepared.url.origin,
              signal: attempt.signal,
            }),
          )
          if (!['omit', 'same-origin'].includes(authorization.credentials))
            return failure('authorization')
          credentials = authorization.credentials
          for (const [name, value] of new Headers(authorization.headers)) {
            if (
              ['cookie', 'host', 'origin', 'content-length', 'accept', 'content-type'].includes(
                name,
              )
            )
              return failure('authorization')
            prepared.headers.set(name, value)
          }
        }
        phase = 'network'
        response = await attempt.run(async () => {
          const received = await fetcher(prepared.url, {
            method: definition.method,
            headers: prepared.headers,
            ...(prepared.body === undefined ? {} : { body: prepared.body }),
            signal: attempt.signal,
            credentials,
            cache: 'no-store',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
          })
          if (attempt.signal.aborted) {
            void received.body?.cancel().catch(() => undefined)
            attempt.signal.throwIfAborted()
          }
          return received
        })
        const parsed = await readApiResponse(
          response,
          definition,
          attempt,
          apiRequestPolicies.standard.maximumResponseBytes,
        )
        attempt.signal.throwIfAborted()
        if (parsed.status === 'failure') {
          const retryHeader = response.headers.get('retry-after')
          const seconds =
            retryHeader === null
              ? undefined
              : /^\d+$/u.test(retryHeader)
                ? Number(retryHeader)
                : Math.max(0, Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000))
          return failure(parsed.category, {
            httpStatus: response.status,
            ...('data' in parsed ? { data: parsed.data } : {}),
            ...(seconds !== undefined && Number.isSafeInteger(seconds)
              ? { retryAfterSeconds: seconds }
              : {}),
          })
        }
        return Object.freeze({
          status: parsed.status,
          data: parsed.data,
          httpStatus: response.status,
          requestId,
        })
      } catch {
        if (attempt.signal.aborted) return failure(attempt.timedOut() ? 'timeout' : 'caller-abort')
        return failure(phase)
      } finally {
        if (
          response?.body !== null &&
          response?.body !== undefined &&
          !response.body.locked &&
          !response.bodyUsed
        )
          void response.body.cancel().catch(() => undefined)
        attempt.dispose()
      }
    },
  })
}
