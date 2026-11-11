import type { ApiError, ApiErrorCategory, ApiResult } from './contracts'

export function createApiRequestIdentity(endpointId: string): {
  readonly endpointId: string
  readonly requestId: string
} {
  return Object.freeze({
    endpointId: /^[a-z][a-z0-9.-]{0,79}$/u.test(endpointId) ? endpointId : 'invalid-endpoint',
    requestId: Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join(''),
  })
}

export function createApiFailure<ErrorData = never>(
  identity: { readonly endpointId: string; readonly requestId: string },
  category: ApiErrorCategory,
  extra: Pick<ApiError<ErrorData>, 'httpStatus' | 'data' | 'retryAfterSeconds'> = {},
): Extract<ApiResult<never, ErrorData>, { status: 'failure' }> {
  return Object.freeze({
    status: 'failure',
    error: Object.freeze({ category, ...identity, ...extra }),
  })
}

export function rejectApiInput(
  endpointId: string,
): Extract<ApiResult<never>, { status: 'failure' }> {
  return createApiFailure(createApiRequestIdentity(endpointId), 'request')
}

export class ApiProcessingError extends Error {
  readonly category: ApiErrorCategory
  constructor(category: ApiErrorCategory) {
    super(`API processing failed: ${category}`)
    this.category = category
  }
}
