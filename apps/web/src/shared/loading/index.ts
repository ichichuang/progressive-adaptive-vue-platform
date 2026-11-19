import { inject, type InjectionKey } from 'vue'

export interface LoadingFeedback {
  /**
   * Track a task in the application loading bar and preserve its result or rejection.
   * An aborted signal releases the feedback. Pass the same signal to the task to cancel its work.
   */
  run<T>(task: () => T | PromiseLike<T>, options?: { readonly signal?: AbortSignal }): Promise<T>
}

export const loadingFeedbackKey: InjectionKey<LoadingFeedback> = Symbol('Loading Feedback')

export function useLoadingFeedback(): LoadingFeedback {
  const feedback = inject(loadingFeedbackKey)
  if (feedback === undefined) throw new Error('The application loading feedback is unavailable.')
  return feedback
}
