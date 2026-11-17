import {
  computed,
  onActivated,
  onDeactivated,
  onScopeDispose,
  shallowRef,
  watch,
  type InjectionKey,
} from 'vue'
import type { UiTableReadonlyRecord } from '@platform/ui'
import { useAccessBoundary } from '../../access/access-boundary'
import {
  executeGuardedAction,
  observeActionTarget,
  type ActionTarget,
  type GuardedAction,
} from '../../access/guarded-action'

interface RowRemovalBinding {
  readonly target: ActionTarget
  readonly action: GuardedAction<unknown>
}

type SelectRowRemoval = (row: UiTableReadonlyRecord) => RowRemovalBinding | undefined

export const tableRowRemovalKey: InjectionKey<SelectRowRemoval> = Symbol('Table Row Removal')

export function useTableRowRemoval(
  select: SelectRowRemoval | undefined,
  row: () => UiTableReadonlyRecord,
  businessAllows: () => boolean,
  stillListed: () => boolean,
) {
  if (select === undefined) return undefined
  const access = useAccessBoundary()
  const binding = computed(() => select(row()))
  const allowed = shallowRef(false)
  const mounted = shallowRef(true)
  let execution: AbortController | undefined

  const stop = watch(
    () => [binding.value, access.readContext(), mounted.value] as const,
    ([bound, context, active], _, onCleanup) => {
      allowed.value = false
      if (bound === undefined || context.status !== 'ready' || !active) return
      const contextExpiry = context.snapshot.expiresAt ?? Infinity
      let released = false
      let expires: ReturnType<typeof setTimeout> | undefined
      let sequence = 0
      const check = observeActionTarget(access, bound.action, bound.target, () => {
        allowed.value = false
        queueMicrotask(() => {
          if (!released) void evaluate()
        })
      })
      async function evaluate(): Promise<void> {
        const current = ++sequence
        if (expires !== undefined) clearTimeout(expires)
        await check.evaluate()
        if (released || current !== sequence) return
        const permit = check.permit()
        allowed.value = permit?.isCurrent() === true
        const deadline = Math.min(contextExpiry, permit?.expiresAt ?? Infinity)
        if (allowed.value && Number.isFinite(deadline))
          expires = setTimeout(
            () => {
              allowed.value = permit?.isCurrent() === true && Date.now() < deadline
            },
            Math.min(2_147_483_647, Math.max(0, deadline - Date.now())),
          )
      }
      onCleanup(() => {
        released = true
        check.dispose()
        if (expires !== undefined) clearTimeout(expires)
      })
      void evaluate()
    },
    { flush: 'sync', immediate: true },
  )

  function cancel(): void {
    execution?.abort()
  }
  onActivated(() => {
    mounted.value = true
  })
  onDeactivated(() => {
    mounted.value = false
    cancel()
  })
  onScopeDispose(() => {
    mounted.value = false
    cancel()
    stop()
  })

  const canRemove = computed(() => {
    const current = binding.value
    return (
      current === undefined ||
      (allowed.value &&
        stillListed() &&
        businessAllows() &&
        current.action.businessAllows(current.target) &&
        current.action.isTargetCurrent(current.target))
    )
  })

  async function remove(confirm: (signal: AbortSignal) => Promise<boolean>): Promise<void> {
    const current = binding.value
    if (execution !== undefined || current === undefined || !canRemove.value) return
    const controller = new AbortController()
    execution = controller
    const action: GuardedAction<unknown> = {
      ...current.action,
      businessAllows: (target) => businessAllows() && current.action.businessAllows(target),
      isTargetCurrent: (target) =>
        binding.value === current && stillListed() && current.action.isTargetCurrent(target),
    }
    try {
      await executeGuardedAction(access, action, {
        targets: [current.target],
        signal: controller.signal,
        confirm,
      })
    } finally {
      if (execution === controller) execution = undefined
    }
  }

  return { controlled: computed(() => binding.value !== undefined), canRemove, remove }
}
