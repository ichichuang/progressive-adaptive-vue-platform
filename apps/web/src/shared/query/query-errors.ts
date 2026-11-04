import type { ApiError, ApiResult } from '../api'

/** A valid HTTP acceptance, carried separately from completed data and HTTP failures. */
export class ApiQueryAccepted<Value> extends Error {
  readonly result: Readonly<
    Exclude<ApiResult<Value>, { readonly status: 'failure' }> & { readonly status: 'accepted' }
  >

  constructor(result: ApiQueryAccepted<Value>['result']) {
    super('The API read was accepted and is not complete.')
    this.name = 'ApiQueryAccepted'
    this.result = Object.freeze({ ...result })
  }
}

export class ApiQueryError<ErrorData = never> extends Error {
  readonly detail: Readonly<ApiError<ErrorData>>

  constructor(detail: ApiError<ErrorData>) {
    super('The API read query failed.')
    this.name = 'ApiQueryError'
    this.detail = Object.freeze({ ...detail })
  }
}
