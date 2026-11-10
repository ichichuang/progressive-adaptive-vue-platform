import { computed } from 'vue'
import type { UiFormController, UiFormValue } from '@platform/ui'
import { useFormDraft } from '../../forms/use-form-draft'
import { useConsoleI18n, type ConsoleMessageKey } from '../../../shared/i18n'

/** Opt-in persistence for non-sensitive example inputs, isolated by the example's form ID. */
export function useFormExampleDraft<I extends Record<string, UiFormValue>>(
  form: UiFormController<I>,
  includeFields: readonly string[],
) {
  const { t } = useConsoleI18n()
  const draft = useFormDraft({
    form,
    scope: `example-${form.formId}-input`,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    includeFields,
    enabled: () => true,
    automatic: true,
  })
  const messages = {
    empty: 'formLifecycle.ready',
    available: 'formLifecycle.notSaved',
    restored: 'formLifecycle.restored',
    saved: 'formLifecycle.saved',
    changed: 'formLifecycle.saving',
    cleared: 'formLifecycle.ready',
    unavailable: 'formLifecycle.unavailable',
    invalid: 'formLifecycle.invalidDraft',
    expired: 'formLifecycle.expiredDraft',
    incompatible: 'formLifecycle.invalidDraft',
    conflict: 'formLifecycle.conflict',
  } as const satisfies Record<typeof draft.status.value, ConsoleMessageKey>
  return {
    hasUnsavedChanges: () => form.hasPendingInput.value || draft.unsaved.value,
    statusText: computed(() =>
      t(
        form.hasPendingInput.value && !draft.unsaved.value
          ? 'formLifecycle.pending'
          : messages[draft.status.value],
      ),
    ),
  }
}
