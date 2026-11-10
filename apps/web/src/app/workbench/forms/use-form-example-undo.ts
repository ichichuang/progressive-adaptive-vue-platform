import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import type { UiFormController } from '@platform/ui'
import { formDraftSignature } from '../../forms/form-draft-signature'

/** Short-lived example history. Only canonical values are captured, never raw control input. */
export function useFormExampleUndo<I>(getForm: () => UiFormController<I>) {
  const history = shallowRef<readonly I[]>([])
  let restoring = false
  let disposed = false
  watch(
    () => {
      const form = getForm()
      return {
        form,
        baseline: formDraftSignature(form.getInitial()),
        values: form.getValues(),
        phase: form.phase.value,
      }
    },
    (current, previous) => {
      if (
        disposed ||
        current.phase === 'disposed' ||
        current.form !== previous?.form ||
        current.baseline !== previous.baseline
      ) {
        history.value = []
        return
      }
      if (!restoring && formDraftSignature(current.values) !== formDraftSignature(previous.values))
        history.value = [...history.value.slice(-9), previous.values]
    },
    { immediate: true, flush: 'sync' },
  )
  const canUndo = computed(() => {
    const form = getForm()
    return (
      !disposed &&
      history.value.length > 0 &&
      !form.hasPendingInput.value &&
      form.phase.value === 'idle'
    )
  })
  function undo(): void {
    if (!canUndo.value) return
    const form = getForm()
    const captured = history.value
    const values = captured.at(-1)
    if (values === undefined) return
    restoring = true
    try {
      // replaceValues keeps the accepted reset baseline and publishes the restored values to
      // the existing draft saver. Do not consume history if the controller rejects the change.
      const result = form.replaceValues(values)
      if ((result === 'applied' || result === 'unchanged') && history.value === captured)
        history.value = captured.slice(0, -1)
    } finally {
      restoring = false
    }
  }
  onScopeDispose(() => {
    disposed = true
    history.value = []
  })
  return { canUndo, undo }
}
