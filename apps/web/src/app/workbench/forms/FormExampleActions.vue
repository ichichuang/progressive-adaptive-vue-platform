<script setup lang="ts" generic="I">
import type { UiFormController } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { useConsoleI18n } from '../../../shared/i18n'
import type { useFormExampleUndo } from './use-form-example-undo'
const props = defineProps<{
  readonly form: UiFormController<I>
  readonly history: ReturnType<typeof useFormExampleUndo<I>>
  readonly submitLabel?: string
}>()
const { t } = useConsoleI18n()
function reset(): void {
  if (!props.form.hasPendingInput.value && props.form.phase.value === 'idle') props.form.reset()
}
</script>
<template>
  <NButton
    class="min-h-target-enhanced min-w-target-enhanced"
    attr-type="submit"
    :form="form.formId"
    type="primary"
    :aria-busy="form.phase.value === 'validating' || form.phase.value === 'submitting'"
    :disabled="form.phase.value !== 'idle'"
  >
    {{ submitLabel ?? t('formShowcase.checkValues') }}
  </NButton>
  <NButton
    class="min-h-target-enhanced min-w-target-enhanced"
    secondary
    :bordered="false"
    :disabled="form.hasPendingInput.value || form.phase.value !== 'idle'"
    :title="form.hasPendingInput.value ? t('formLifecycle.pending') : undefined"
    @click="reset"
  >
    {{ t('configuredForm.reset') }}
  </NButton>
  <NButton
    class="min-h-target-enhanced min-w-target-enhanced"
    secondary
    :bordered="false"
    :disabled="!history.canUndo.value"
    :title="form.hasPendingInput.value ? t('formLifecycle.pending') : t('formShowcase.undoHint')"
    @click="history.undo"
  >
    {{ t('formShowcase.undo') }}
  </NButton>
</template>
