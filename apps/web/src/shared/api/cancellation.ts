export interface ApiAttempt {
  readonly signal: AbortSignal
  run<Value>(operation: () => Promise<Value>): Promise<Value>
  timedOut(): boolean
  dispose(): void
}

export function createApiAttempt(caller: AbortSignal, timeoutMilliseconds: number): ApiAttempt {
  const controller = new AbortController()
  let timeout = false
  const cancel = (): void => {
    controller.abort()
  }
  caller.addEventListener('abort', cancel, { once: true })
  if (caller.aborted) cancel()
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      timeout = true
      controller.abort()
    }
  }, timeoutMilliseconds)

  return {
    signal: controller.signal,
    timedOut: () => timeout,
    dispose() {
      clearTimeout(timer)
      caller.removeEventListener('abort', cancel)
    },
    run<Value>(operation: () => Promise<Value>): Promise<Value> {
      return new Promise<Value>((resolve, reject) => {
        const abort = (): void => {
          reject(new DOMException('Request cancelled.', 'AbortError'))
        }
        if (controller.signal.aborted) {
          abort()
          return
        }
        controller.signal.addEventListener('abort', abort, { once: true })
        void Promise.resolve()
          .then(() => {
            controller.signal.throwIfAborted()
            return operation()
          })
          .then(resolve, reject)
          .finally(() => {
            controller.signal.removeEventListener('abort', abort)
          })
      })
    },
  }
}
