import type {
  ApiBatchOptions,
  ApiBatchRequest,
  ApiBatchResults,
  ApiClient,
  ApiResult,
} from './contracts'
import { createApiFailure, createApiRequestIdentity } from './errors'
import { snapshotApiHooks } from './hooks'
import { snapshotApiEndpoint, snapshotApiParameters } from './request'

export async function runApiBatch<const Requests extends readonly ApiBatchRequest[]>(
  request: ApiClient['request'],
  requests: Requests,
  options: ApiBatchOptions,
): Promise<ApiBatchResults<Requests>> {
  const concurrency = options.concurrency ?? 4
  const valid =
    options.signal instanceof AbortSignal && Number.isSafeInteger(concurrency) && concurrency > 0
  const entries = requests.map((entry) => {
    try {
      return {
        endpoint: snapshotApiEndpoint(entry.endpoint),
        input: {
          ...snapshotApiParameters(entry.input),
          hooks: snapshotApiHooks(entry.input.hooks),
        },
        signal: entry.input.signal,
      }
    } catch {
      return undefined
    }
  })
  const results: ApiResult<unknown, unknown>[] = []
  let next = 0
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next++
      if (index >= entries.length) return
      const entry = entries[index]
      if (
        !valid ||
        entry === undefined ||
        (entry.signal !== undefined && !(entry.signal instanceof AbortSignal))
      ) {
        results[index] = createApiFailure(
          createApiRequestIdentity(requests[index]?.endpoint.id ?? 'invalid-endpoint'),
          'request',
        )
        continue
      }
      if (options.signal.aborted || entry.signal?.aborted) {
        results[index] = createApiFailure(
          createApiRequestIdentity(entry.endpoint.id),
          'caller-abort',
        )
        continue
      }
      const controller = new AbortController()
      const abort = (): void => {
        controller.abort()
      }
      options.signal.addEventListener('abort', abort, { once: true })
      entry.signal?.addEventListener('abort', abort, { once: true })
      try {
        results[index] = await request(entry.endpoint, {
          ...entry.input,
          signal: controller.signal,
        })
      } finally {
        options.signal.removeEventListener('abort', abort)
        entry.signal?.removeEventListener('abort', abort)
      }
    }
  }
  await Promise.all(
    Array.from({ length: valid ? Math.min(concurrency, entries.length) : 1 }, worker),
  )
  // Each slot is assigned by its own request; the mapped tuple preserves that association.
  return Object.freeze(results) as ApiBatchResults<Requests>
}
