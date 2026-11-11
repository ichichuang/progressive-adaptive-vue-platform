export interface ApiAttempt {
  readonly signal: AbortSignal
  run<Value>(operation: () => Promise<Value>): Promise<Value>
  cancel(): void
  wait<Value>(operation: () => Promise<Value>, timeoutMilliseconds: number): Promise<Value>
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

  const attempt: ApiAttempt = {
    signal: controller.signal,
    cancel,
    async wait<Value>(
      operation: () => Promise<Value>,
      timeoutMilliseconds: number,
    ): Promise<Value> {
      const idle = setTimeout(() => {
        if (!controller.signal.aborted) {
          timeout = true
          controller.abort()
        }
      }, timeoutMilliseconds)
      try {
        return await attempt.run(operation)
      } finally {
        clearTimeout(idle)
      }
    },
    timedOut: () => timeout,
    dispose() {
      clearTimeout(timer)
      caller.removeEventListener('abort', cancel)
    },
    run<Value>(operation: () => Promise<Value>): Promise<Value> {
      return new Promise<Value>((resolve, reject) => {
        const abort = (): void => {
          controller.signal.removeEventListener('abort', abort)
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
          .then(
            (value) => {
              controller.signal.removeEventListener('abort', abort)
              resolve(value)
            },
            (error: unknown) => {
              controller.signal.removeEventListener('abort', abort)
              reject(error instanceof Error ? error : new Error('API operation failed.'))
            },
          )
      })
    },
  }
  return attempt
}
