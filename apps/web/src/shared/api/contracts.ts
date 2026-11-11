import type { z } from 'zod'

import type { ApiConfiguration } from './configuration'
import type { ApiPolicyOverrides, ApiRequestPolicyId } from './policies'

export type ApiMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ApiResponseMode = 'json' | 'text' | 'blob' | 'array-buffer' | 'empty'
export type ApiErrorCategory =
  | 'configuration'
  | 'request'
  | 'authorization'
  | 'network'
  | 'http'
  | 'protocol'
  | 'parse'
  | 'schema'
  | 'timeout'
  | 'caller-abort'
  | 'hook'
  | 'consumer'

export interface ApiEndpoint<Response, ErrorData = never> {
  readonly id: string
  readonly method: ApiMethod
  readonly path: readonly string[]
  readonly policy: ApiRequestPolicyId
  readonly authentication: 'anonymous' | 'provided'
  readonly response: {
    readonly mode: ApiResponseMode
    readonly mimeTypes: readonly string[]
    readonly schema: z.ZodType<Response>
  }
  readonly errorSchema?: z.ZodType<ErrorData>
}

export interface ApiStreamEndpoint<Value, ErrorData = never> extends Omit<
  ApiEndpoint<Value, ErrorData>,
  'response' | 'policy'
> {
  readonly policy: 'stream'
  readonly response: {
    readonly mode: 'sse' | 'ndjson'
    readonly mimeTypes: readonly string[]
    readonly schema: z.ZodType<Value>
  }
}

type QueryValue = string | number | boolean
export interface ApiRequestParameters {
  readonly query?: Readonly<Record<string, QueryValue | readonly QueryValue[] | undefined>>
  readonly headers?: HeadersInit
  readonly body?:
    | { readonly kind: 'json'; readonly value: unknown }
    | {
        readonly kind: 'native'
        readonly value: string | Blob | FormData | URLSearchParams | ArrayBuffer
      }
}

export interface ApiHookContext {
  readonly endpointId: string
  readonly requestId: string
  readonly method: ApiMethod
  readonly signal: AbortSignal
}

export interface ApiResponseHookContext extends ApiHookContext {
  readonly httpStatus: number
  readonly responseKind: 'success' | 'error' | 'event'
}

export interface ApiHooks {
  readonly beforeRequest?: (
    parameters: ApiRequestParameters,
    context: ApiHookContext,
  ) => ApiRequestParameters | Promise<ApiRequestParameters>
  readonly transformResponse?: (value: unknown, context: ApiResponseHookContext) => unknown
}

export interface ApiRequestInput extends ApiRequestParameters {
  readonly signal: AbortSignal
  readonly hooks?: ApiHooks
}

export interface ApiError<ErrorData = never> {
  readonly category: ApiErrorCategory
  readonly endpointId: string
  readonly requestId: string
  readonly httpStatus?: number
  readonly data?: ErrorData
  readonly retryAfterSeconds?: number
}

export type ApiResult<Response, ErrorData = never> =
  | {
      readonly status: 'success' | 'accepted'
      readonly data: Response
      readonly httpStatus: number
      readonly requestId: string
    }
  | { readonly status: 'failure'; readonly error: ApiError<ErrorData> }

export type ApiFetch = (url: URL, input: RequestInit) => Promise<Response>
export type ApiAuthorizationProvider = (input: {
  readonly endpointId: string
  readonly method: ApiMethod
  readonly origin: string
  readonly signal: AbortSignal
}) => Promise<{ readonly headers: HeadersInit; readonly credentials: 'omit' | 'same-origin' }>

export interface ApiClientInput {
  readonly configuration: ApiConfiguration
  readonly origin?: string
  readonly fetch?: ApiFetch
  readonly authorize?: ApiAuthorizationProvider
  readonly hooks?: ApiHooks
  readonly policies?: ApiPolicyOverrides
}

export interface ApiBatchRequest<Value = unknown, ErrorData = unknown> {
  readonly endpoint: ApiEndpoint<Value, ErrorData>
  readonly input: ApiRequestParameters & {
    readonly signal?: AbortSignal
    readonly hooks?: ApiHooks
  }
}

export interface ApiBatchOptions {
  readonly signal: AbortSignal
  readonly concurrency?: number
}

export type ApiBatchResults<Requests extends readonly ApiBatchRequest[]> = {
  readonly [Index in keyof Requests]: Requests[Index] extends ApiBatchRequest<
    infer Value,
    infer ErrorData
  >
    ? ApiResult<Value, ErrorData>
    : never
}

export interface ApiStreamEvent<Value> {
  readonly data: Value
  readonly index: number
  readonly event?: string
  readonly id?: string
}

export interface ApiStreamInput<Value> extends ApiRequestInput {
  readonly onEvent: (event: ApiStreamEvent<Value>, context: ApiHookContext) => void | Promise<void>
}

export interface ApiStreamSummary {
  readonly eventCount: number
}

export interface ApiClient {
  request<Response, ErrorData = never>(
    endpoint: ApiEndpoint<Response, ErrorData>,
    input: ApiRequestInput,
  ): Promise<ApiResult<Response, ErrorData>>
  batch<const Requests extends readonly ApiBatchRequest[]>(
    requests: Requests,
    options: ApiBatchOptions,
  ): Promise<ApiBatchResults<Requests>>
  stream<Value, ErrorData = never>(
    endpoint: ApiStreamEndpoint<Value, ErrorData>,
    input: ApiStreamInput<Value>,
  ): Promise<ApiResult<ApiStreamSummary, ErrorData>>
}
