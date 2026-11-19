import { computed, onScopeDispose, provide, shallowReactive, type ComputedRef } from 'vue'
import { loadingFeedbackKey, type LoadingFeedback } from '../../shared/loading'

export function provideLoadingFeedback(): ComputedRef<boolean> {
  const activeTasks = shallowReactive(new Set<() => void>())
  let disposed = false

  const feedback: LoadingFeedback = {
    async run(task, options) {
      const signal = options?.signal
      signal?.throwIfAborted()
      if (disposed) return await task()

      const release = (): void => {
        if (!activeTasks.delete(release)) return
        signal?.removeEventListener('abort', release)
      }

      activeTasks.add(release)
      signal?.addEventListener('abort', release, { once: true })
      try {
        return await task()
      } finally {
        release()
      }
    },
  }

  provide(loadingFeedbackKey, Object.freeze(feedback))
  onScopeDispose(() => {
    disposed = true
    for (const release of activeTasks) release()
  })
  return computed(() => activeTasks.size > 0)
}
