import type { ApiHookContext, ApiHooks, ApiResponseHookContext } from './contracts'
import type { ApiAttempt } from './cancellation'

export type ApiResponseTransform = (
  value: unknown,
  responseKind: ApiResponseHookContext['responseKind'],
) => Promise<unknown>

export function snapshotApiHooks(hooks: ApiHooks | undefined): ApiHooks {
  return Object.freeze({ ...hooks })
}

export function createApiResponseTransform(
  hooks: readonly ApiHooks[],
  context: ApiHookContext,
  httpStatus: number,
  attempt: ApiAttempt,
): ApiResponseTransform {
  return async (value, responseKind) => {
    let transformed = value
    const responseContext = Object.freeze({ ...context, httpStatus, responseKind })
    for (const hook of hooks) {
      if (hook.transformResponse !== undefined) {
        transformed = await attempt.run(() =>
          Promise.resolve(hook.transformResponse?.(transformed, responseContext)),
        )
      }
    }
    return transformed
  }
}
