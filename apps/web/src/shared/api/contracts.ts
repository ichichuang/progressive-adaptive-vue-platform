import type { z } from 'zod'

import type { ApiConfiguration } from './configuration'
import type { ApiRequestPolicyId } from './policies'

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

type QueryValue = string | number | boolean
export interface ApiRequestInput {
  readonly signal: AbortSignal
  readonly query?: Readonly<Record<string, QueryValue | readonly QueryValue[] | undefined>>
  readonly headers?: HeadersInit
  readonly body?:
    | { readonly kind: 'json'; readonly value: unknown }
    | {
        readonly kind: 'native'
        readonly value: string | Blob | FormData | URLSearchParams | ArrayBuffer
      }
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
}

export interface ApiClient {
  request<Response, ErrorData = never>(
    endpoint: ApiEndpoint<Response, ErrorData>,
    input: ApiRequestInput,
  ): Promise<ApiResult<Response, ErrorData>>
}
