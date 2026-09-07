/** Cancellable UI waiting; abort does not imply that an external mutation rolled back. */
export function createFormOperation<T>(cancelled: T) {
  const abort = new AbortController()
  let resolveResult: ((value: T) => void) | undefined
  const promise = new Promise<T>((resolve) => {
    resolveResult = resolve
  })
  let settled = false
  function resolve(value: T): void {
    if (settled) return
    settled = true
    resolveResult?.(value)
  }
  return {
    signal: abort.signal,
    promise: promise,
    resolve,
    cancel(): void {
      resolve(cancelled)
      abort.abort()
    },
  }
}
