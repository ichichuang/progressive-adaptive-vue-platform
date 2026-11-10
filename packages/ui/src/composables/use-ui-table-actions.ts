import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import type {
  UiTableBatchAction,
  UiTableController,
  UiTableReadonlyRecord,
  UiTableSelection,
  UiTableTransport,
} from '../components/table-contracts'
import { resolveUiTableRequest } from '../components/table-request'
import { cloneDraft, freezeDraftValue, getFormValue } from './form-draft-values'

export interface UiTableActionsInput {
  readonly table: UiTableController
  readonly transport: UiTableTransport
  readonly context?: UiTableReadonlyRecord
}

/** One batch request per confirmed, immutable current-page selection. Never guesses partial success. */
export function useUiTableActions(input: UiTableActionsInput) {
  const pending = shallowRef<string | null>(null)
  const error = shallowRef<Error | null>(null)
  const snapshot = <T>(value: T): T => freezeDraftValue(cloneDraft(value)) as T
  const context = snapshot(input.context ?? {})
  let active: AbortController | undefined
  let disposed = false

  function current(signal: AbortSignal): boolean {
    return !disposed && !signal.aborted
  }

  async function execute(
    id: string,
    confirm: (
      action: UiTableBatchAction,
      selection: UiTableSelection,
    ) => boolean | Promise<boolean>,
  ): Promise<boolean> {
    if (disposed || pending.value !== null || input.table.loading.value || input.table.error.value)
      return false
    const action = input.table.schema.batchActions?.find((candidate) => candidate.id === id)
    if (!action) throw new TypeError('Unknown table batch action.')
    if (!input.transport.mutate) throw new TypeError('Batch actions require a mutation transport.')
    const keys = input.table.selectedKeys.value
    if (keys.length === 0) return false
    const selected = new Set(keys)
    const selection: UiTableSelection = snapshot({
      keys,
      rows: input.table.rows.value.filter((row) => {
        const key = getFormValue(row, input.table.schema.rowKey)
        return (typeof key === 'string' || typeof key === 'number') && selected.has(key)
      }),
    })
    const query = input.table.query.value
    const controller = new AbortController()
    active = controller
    pending.value = id
    error.value = null
    try {
      if (!(await confirm(action, selection)) || !current(controller.signal)) return false
      await input.transport.mutate(
        resolveUiTableRequest(action.request, {
          ...query,
          context,
          selection,
          row: {},
          form: {},
        }),
        controller.signal,
      )
      if (!current(controller.signal)) return false
      // A query changed during the request must not have its new selection cleared.
      if (input.table.query.value === query && input.table.selectedKeys.value === keys)
        input.table.setSelection([])
      await input.table.refresh()
      return true
    } catch (cause) {
      if (current(controller.signal))
        error.value = cause instanceof Error ? cause : new Error('Table batch action failed.')
      return false
    } finally {
      if (active === controller) {
        active = undefined
        pending.value = null
      }
    }
  }
  function dispose(): void {
    disposed = true
    active?.abort()
    pending.value = null
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return {
    pending: computed(() => pending.value),
    error: computed(() => error.value),
    execute,
    dispose,
  }
}
