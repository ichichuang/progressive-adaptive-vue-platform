import { computed, onActivated, onDeactivated, shallowRef, watch } from 'vue'
import type { AccessBoundary } from './access-contract'
import { observeActionTarget, type ActionTarget, type GuardedAction } from './guarded-action'

export function useActionEligibility<Result>(
  access: AccessBoundary,
  selection: () =>
    | {
        readonly action: GuardedAction<Result>
        readonly target: ActionTarget
      }
    | undefined,
) {
  const active = shallowRef(true)
  const check = shallowRef<ReturnType<typeof observeActionTarget>>()
  onActivated(() => {
    active.value = true
  })
  onDeactivated(() => {
    active.value = false
  })
  watch(
    () => [selection(), access.readContext(), active.value] as const,
    ([selected, context, enabled], _, onCleanup) => {
      check.value = undefined
      if (!selected || context.status !== 'ready' || !enabled) return
      const lifetime = new AbortController()
      function refresh(): void {
        queueMicrotask(() => {
          if (!lifetime.signal.aborted) void owner.evaluate(lifetime.signal)
        })
      }
      const owner = observeActionTarget(access, selected.action, selected.target, refresh, {
        businessInvalidated: refresh,
      })
      onCleanup(() => {
        lifetime.abort()
        owner.dispose()
      })
      check.value = owner
      void owner.evaluate(lifetime.signal)
    },
    { immediate: true, flush: 'sync' },
  )
  const assessment = computed(() => check.value?.assessment())
  const actionable = computed(() => {
    const selected = selection()
    if (
      !selected ||
      !selected.action.isTargetCurrent(selected.target) ||
      !selected.action.businessAllows(selected.target)
    )
      return false
    const result = assessment.value
    return (
      result?.state.status === 'allow' &&
      (result.primary === undefined ||
        (result.primary.status === 'challenge' &&
          selected.action.availability?.verify !== undefined))
    )
  })
  return { assessment, actionable }
}
