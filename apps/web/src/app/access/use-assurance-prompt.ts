import { computed, onDeactivated, onScopeDispose, shallowRef } from 'vue'
import type { OperationIntent } from './business-availability'
import type { AssuranceResult } from './guarded-action'

export function useAssurancePrompt(
  verifyWithHost: (intent: OperationIntent, signal: AbortSignal) => Promise<AssuranceResult>,
) {
  const phase = shallowRef<'closed' | 'prompt' | 'verifying'>('closed')
  const open = computed(() => phase.value !== 'closed')
  let stop: (() => void) | undefined
  let start: (() => Promise<void>) | undefined
  function cancel(): void {
    stop?.()
  }
  onScopeDispose(cancel)
  onDeactivated(cancel)
  function verify(intent: OperationIntent, signal: AbortSignal): Promise<AssuranceResult> {
    if (phase.value !== 'closed' || signal.aborted) return Promise.resolve({ status: 'cancelled' })
    return new Promise((resolve) => {
      const controller = new AbortController()
      function finish(result: AssuranceResult): void {
        if (controller.signal.aborted) return
        controller.abort()
        signal.removeEventListener('abort', abort)
        stop = undefined
        start = undefined
        phase.value = 'closed'
        resolve(result)
      }
      function abort(): void {
        finish({ status: 'cancelled' })
      }
      stop = abort
      start = async () => {
        if (phase.value !== 'prompt') return
        phase.value = 'verifying'
        try {
          finish(await verifyWithHost(intent, controller.signal))
        } catch {
          finish({ status: 'failed' })
        }
      }
      signal.addEventListener('abort', abort, { once: true })
      phase.value = 'prompt'
    })
  }
  return {
    open,
    phase,
    verify,
    cancel,
    async accept() {
      await start?.()
    },
  }
}
