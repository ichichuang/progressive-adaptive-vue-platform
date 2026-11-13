<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { UiForm, useUiDynamicForm } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { useFormDraftStorage } from '../app/forms/use-form-draft-storage'
import { useDraftSession } from '../app/forms/use-draft-session'
import {
  dynamicFormPresets,
  parseDynamicFormExampleDraft,
  type DynamicFormPreset,
} from '../app/workbench/forms/dynamic-form-example'

defineOptions({ name: 'ComponentFormDynamicPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const port = useFormDraftStorage().create({
  scope: 'example-form-dynamic-input',
  schemaKey: 'dynamic-form-known-presets',
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  parse: parseDynamicFormExampleDraft,
})
const bootstrap = port.read()
const initialPreset: DynamicFormPreset =
  bootstrap.status === 'found' ? bootstrap.data.preset : 'simple'
const changing = ref(false)
const outcome = ref<'ready' | 'applied' | 'blocked' | 'failed'>('ready')
const owner = useUiDynamicForm({
  ...demo,
  formId: 'form-dynamic',
  schema: dynamicFormPresets[initialPreset],
  initial: { draftId: 'dynamic-example', values: {} },
})
const form = owner.form
const preset = computed<DynamicFormPreset>(() =>
  form.value.schema.fields.some((field) => field.name === 'notes') ? 'detailed' : 'simple',
)
const draft = useDraftSession({
  port,
  automatic: true,
  enabled: () =>
    !changing.value && !form.value.hasPendingInput.value && form.value.phase.value === 'idle',
  snapshot: () =>
    parseDynamicFormExampleDraft({
      preset: preset.value,
      values: form.value.getValues(),
      step: form.value.schema.steps?.[form.value.activeStepIndex.value ?? 0]?.name,
    }),
  restore: (data) => {
    // A competing configuration cannot silently replace the bootstrapped form.
    if (data.preset !== preset.value || form.value.hasPendingInput.value) return false
    const { notes, ...values } = data.values
    const result = form.value.replaceValues({
      ...values,
      ...(notes === undefined ? {} : { notes }),
    })
    if (result !== 'applied' && result !== 'unchanged') return false
    const index = form.value.schema.steps?.findIndex((step) => step.name === data.step) ?? -1
    if (index < 0) return false
    void form.value.setActiveStep(index, { relax: true })
    return true
  },
})
const history = useFormExampleUndo(() => form.value)
const busy = computed(() => changing.value || form.value.phase.value !== 'idle')
const visibleOutcome = computed(() =>
  outcome.value === 'blocked' && !form.value.hasPendingInput.value && !busy.value
    ? 'ready'
    : outcome.value,
)
const outcomeMessage = computed(
  () =>
    ({
      ready: t('formCapabilities.dynamic.ready'),
      applied: t('formCapabilities.dynamic.applied'),
      blocked: t('formCapabilities.dynamic.blocked'),
      failed: t('formCapabilities.dynamic.failed'),
    })[visibleOutcome.value],
)
const canBack = computed(() => (form.value.activeStepIndex.value ?? 0) > 0)
const canNext = computed(
  () => (form.value.activeStepIndex.value ?? 0) < (form.value.schema.steps?.length ?? 1) - 1,
)
const draftMessage = computed(() => {
  if (form.value.hasPendingInput.value) return t('formLifecycle.pending')
  if (
    ['unavailable', 'invalid', 'incompatible', 'expired', 'conflict'].includes(draft.status.value)
  )
    return t('formCapabilities.dynamic.unsaved')
  return t('formCapabilities.dynamic.saved')
})
async function selectPreset(value: string | number | boolean): Promise<void> {
  if ((value !== 'simple' && value !== 'detailed') || changing.value) return
  changing.value = true
  try {
    const result = await owner.replaceSchema(dynamicFormPresets[value])
    outcome.value =
      result.status === 'applied' ? 'applied' : result.status === 'unchanged' ? 'ready' : 'blocked'
  } catch {
    outcome.value = 'failed'
  } finally {
    changing.value = false
  }
}
</script>

<template>
  <FormCapabilityWorkbench
    capability="dynamic"
    :title="title"
    :message="message"
    :form="form"
    :has-unsaved-changes="() => form.hasPendingInput.value || draft.unsaved.value"
    :draft-status="draftMessage"
  >
    <template #controls>
      <NRadioGroup
        :value="preset"
        :disabled="busy"
        :aria-label="t('formCapabilities.dynamic.controls')"
        @update:value="selectPreset"
      >
        <NRadioButton value="simple">
          {{ t('formCapabilities.dynamic.simple') }}
        </NRadioButton>
        <NRadioButton value="detailed">
          {{ t('formCapabilities.dynamic.detailed') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
    <p class="m-0 text-caption text-text-secondary">
      {{ t('formCapabilities.dynamic.try') }}
    </p>
    <UiForm
      class="grid gap-content-gap"
      :form="form"
    >
      <template #actions>
        <span />
      </template>
    </UiForm>
    <template #status>
      <p
        class="m-0 text-body text-text-primary"
        role="status"
        aria-live="polite"
      >
        {{ outcomeMessage }}
      </p>
    </template>
    <template #actions>
      <NButton
        :disabled="busy || !canBack"
        @click="form.goBackStep()"
      >
        {{ t('formCapabilities.dynamic.back') }}
      </NButton>
      <NButton
        :disabled="busy || !canNext"
        secondary
        @click="form.goNextStep()"
      >
        {{ t('formCapabilities.dynamic.next') }}
      </NButton>
      <FormExampleActions
        :form="form"
        :history="history"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
