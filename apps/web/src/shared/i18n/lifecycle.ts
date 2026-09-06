import type { ConsoleI18nHandle, ConsoleI18nInput } from './boundary'
import { loadConsoleResource } from './resource-loaders'

export function createConsoleI18n(input: ConsoleI18nInput): ConsoleI18nHandle {
  let disposed = false
  const isDisposed = (): boolean => disposed
  let runtime: ConsoleI18nHandle | undefined
  let cancel: (() => void) | undefined
  const cancelled = new Promise<{ readonly status: 'cancelled' }>((resolve) => {
    cancel = () => {
      resolve({ status: 'cancelled' })
    }
  })
  const ready = Promise.race([
    cancelled,
    (async () => {
      const module = await import('./runtime')
      if (isDisposed()) return { status: 'cancelled' } as const
      runtime = module.createConsoleI18nRuntime(input, loadConsoleResource)
      return runtime.ready
    })(),
  ])
  return {
    ready,
    dispose() {
      if (isDisposed()) return
      disposed = true
      cancel?.()
      runtime?.dispose()
      runtime = undefined
    },
  }
}
