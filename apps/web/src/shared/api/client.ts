import { runApiBatch } from './batch'
import { createApiAttempt, type ApiAttempt } from './cancellation'
import { apiConfigurationSchema } from './configuration'
import type {
  ApiClient,
  ApiClientInput,
  ApiEndpoint,
  ApiError,
  ApiErrorCategory,
  ApiHookContext,
  ApiRequestInput,
  ApiResult,
  ApiStreamEndpoint,
} from './contracts'
import { resolveApiPolicies, type ApiRequestPolicy } from './policies'
import { ApiProcessingError, createApiFailure, createApiRequestIdentity } from './errors'
import { createApiResponseTransform, snapshotApiHooks, type ApiResponseTransform } from './hooks'
import { createApiRequest, snapshotApiEndpoint, snapshotApiParameters } from './request'
import { readApiResponse, type ApiResponseResult } from './response'
import { readApiStream } from './stream'

export function createApiClient(input: ApiClientInput): ApiClient {
  const configuration = apiConfigurationSchema.safeParse(input.configuration)
  const policies = resolveApiPolicies(input.policies)
  const fetcher =
    input.fetch ?? ((url: URL, request: RequestInit) => globalThis.fetch(url, request))
  const authorize = input.authorize
  const clientHooks = snapshotApiHooks(input.hooks)
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

  async function execute<Value, ErrorData, Output>(
    endpoint: ApiEndpoint<Value, ErrorData> | ApiStreamEndpoint<Value, ErrorData>,
    request: ApiRequestInput,
    consume: (
      response: Response,
      definition: ApiEndpoint<Value, ErrorData> | ApiStreamEndpoint<Value, ErrorData>,
      attempt: ApiAttempt,
      policy: ApiRequestPolicy,
      transform: ApiResponseTransform,
      context: ApiHookContext,
    ) => Promise<ApiResponseResult<Output, ErrorData>>,
    streaming: boolean,
  ): Promise<ApiResult<Output, ErrorData>> {
    const identity = createApiRequestIdentity(endpoint.id)
    const { endpointId, requestId } = identity
    const failure = (
      category: ApiErrorCategory,
      extra: Pick<ApiError<ErrorData>, 'httpStatus' | 'data' | 'retryAfterSeconds'> = {},
    ): ApiResult<Output, ErrorData> => createApiFailure(identity, category, extra)
    if (baseUrl === undefined || policies === undefined) return failure('configuration')
    if (
      endpointId === 'invalid-endpoint' ||
      !(request.signal instanceof AbortSignal) ||
      !Object.hasOwn(policies, endpoint.policy)
    )
      return failure('request')
    const policy = policies[endpoint.policy]
    const attempt = createApiAttempt(request.signal, policy.timeoutMilliseconds)
    let phase: ApiErrorCategory = 'request'
    let response: Response | undefined
    let complete = false
    try {
      attempt.signal.throwIfAborted()
      const definition = snapshotApiEndpoint(endpoint)
      if (
        streaming !== ['sse', 'ndjson'].includes(definition.response.mode) ||
        (streaming && (definition.policy !== 'stream' || definition.method === 'HEAD'))
      )
        return failure('request')
      const hooks = [clientHooks, snapshotApiHooks(request.hooks)]
      const context: ApiHookContext = Object.freeze({
        ...identity,
        method: definition.method,
        signal: attempt.signal,
      })
      let parameters = snapshotApiParameters(request)
      // Validate the definition and original input before running user hooks.
      createApiRequest(baseUrl, definition, parameters)
      for (const hook of hooks) {
        if (hook.beforeRequest !== undefined) {
          phase = 'hook'
          const beforeRequest = hook.beforeRequest
          const transformed = await attempt.run(() =>
            Promise.resolve(beforeRequest(parameters, context)),
          )
          phase = 'request'
          parameters = snapshotApiParameters(transformed)
          createApiRequest(baseUrl, definition, parameters)
        }
      }
      const prepared = createApiRequest(baseUrl, definition, parameters)
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
            ['cookie', 'host', 'origin', 'content-length', 'accept', 'content-type'].includes(name)
          )
            return failure('authorization')
          prepared.headers.set(name, value)
        }
      }
      phase = 'network'
      const receive = async (): Promise<Response> => {
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
      }
      response = streaming
        ? await attempt.wait(receive, policies.stream.idleTimeoutMilliseconds)
        : await attempt.run(receive)
      const transform = createApiResponseTransform(hooks, context, response.status, attempt)
      const parsed = await consume(response, definition, attempt, policy, transform, context)
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
      complete = true
      return Object.freeze({
        status: parsed.status,
        data: parsed.data,
        httpStatus: response.status,
        requestId,
      })
    } catch (error) {
      if (attempt.signal.aborted) return failure(attempt.timedOut() ? 'timeout' : 'caller-abort')
      return failure(
        error instanceof ApiProcessingError ? error.category : phase,
        response === undefined ? {} : { httpStatus: response.status },
      )
    } finally {
      if (
        response?.body !== null &&
        response?.body !== undefined &&
        !response.body.locked &&
        !response.bodyUsed
      )
        void response.body.cancel().catch(() => undefined)
      attempt.dispose()
      if (!complete) attempt.cancel()
    }
  }

  const request: ApiClient['request'] = (endpoint, requestInput) =>
    execute(
      endpoint,
      requestInput,
      (response, definition, attempt, policy, transform) =>
        readApiResponse(response, definition, attempt, policy.maximumResponseBytes, transform),
      false,
    )

  return Object.freeze({
    request,
    batch: (requests, options) => runApiBatch(request, requests, options),
    stream(endpoint, streamInput) {
      const onEvent = streamInput.onEvent
      if (typeof onEvent !== 'function')
        return Promise.resolve(createApiFailure(createApiRequestIdentity(endpoint.id), 'request'))
      return execute(
        endpoint,
        streamInput,
        (response, definition, attempt, _policy, transform, context) => {
          if (policies === undefined)
            return Promise.resolve({ status: 'failure', category: 'request' })
          return readApiStream(
            response,
            definition as typeof endpoint,
            attempt,
            policies.stream,
            transform,
            onEvent,
            context,
          )
        },
        true,
      )
    },
  } satisfies ApiClient)
}
