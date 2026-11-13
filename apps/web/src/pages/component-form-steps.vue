<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'

defineOptions({ name: 'ComponentFormStepsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const mode = ref<'edit' | 'detail'>('edit')
const schema = {
  columns: 2,
  fields: [
    {
      kind: 'text',
      name: 'fullName',
      label: 'formCapabilities.steps.fullName',
      required: true,
      placeholder: 'formCapabilities.steps.fullNamePlaceholder',
    },
    {
      kind: 'text',
      name: 'email',
      label: 'configuredForm.email',
      required: true,
      rules: { format: 'email' },
      placeholder: 'formCapabilities.steps.emailPlaceholder',
    },
    {
      kind: 'switch',
      name: 'needsPhone',
      label: 'formCapabilities.steps.needsPhone',
    },
    {
      kind: 'text',
      name: 'phone',
      label: 'formCapabilities.steps.phone',
      required: { field: 'needsPhone', operator: 'eq', value: true },
      hidden: { field: 'needsPhone', operator: 'eq', value: false },
      placeholder: 'formCapabilities.steps.phonePlaceholder',
    },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'formShowcase.notes',
      span: 2,
      placeholder: 'formCapabilities.steps.notesPlaceholder',
    },
    {
      kind: 'radio',
      name: 'confirmed',
      label: 'formCapabilities.steps.confirmed',
      required: true,
      options: [
        { value: 'yes', label: 'configuredForm.yes' },
        { value: 'no', label: 'configuredForm.no' },
      ],
    },
  ],
  steps: [
    {
      name: 'identity',
      label: 'formCapabilities.steps.identity',
      fields: ['fullName', 'email'],
    },
    {
      name: 'details',
      label: 'formCapabilities.steps.details',
      fields: ['needsPhone', 'phone', 'notes'],
    },
    {
      name: 'confirm',
      label: 'formCapabilities.steps.confirm',
      fields: ['confirmed'],
    },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-steps',
  schema,
  initial: {
    draftId: 'steps-record',
    values: {
      fullName: '',
      email: '',
      needsPhone: false,
      phone: '',
      notes: '',
      confirmed: null,
    },
  },
})
const draft = useFormExampleDraft(form, [
  'fullName',
  'email',
  'needsPhone',
  'phone',
  'notes',
  'confirmed',
])
const history = useFormExampleUndo(() => form)
const stepCount = computed(() => form.schema.steps?.length ?? 0)
const activeStepIndex = computed(() => form.activeStepIndex.value)
const isLastStep = computed(
  () => activeStepIndex.value !== null && activeStepIndex.value >= stepCount.value - 1,
)
const canGoBack = computed(() => activeStepIndex.value !== null && activeStepIndex.value > 0)
function goBack(): void {
  void form.goBackStep()
}
function goNext(): void {
  void form.goNextStep()
}
function reset(): void {
  if (!form.hasPendingInput.value && form.phase.value === 'idle') form.reset()
}
</script>

<template>
  <FormCapabilityWorkbench
    capability="steps"
    :title="title"
    :message="message"
    :form="form"
    :mode="mode"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
    submit-mode="submit"
  >
    <template #controls>
      <NRadioGroup
        v-model:value="mode"
        :aria-label="t('formCapabilities.steps.canvas')"
      >
        <NRadioButton value="edit">
          {{ t('configuredForm.edit') }}
        </NRadioButton>
        <NRadioButton value="detail">
          {{ t('configuredForm.detail') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
    <UiForm
      class="grid gap-content-gap"
      :form="form"
      :mode="mode"
    >
      <template #actions>
        <span />
      </template>
    </UiForm>
    <template #actions>
      <NButton
        v-if="canGoBack"
        class="min-h-target-enhanced min-w-target-enhanced"
        attr-type="button"
        secondary
        :bordered="false"
        :disabled="form.phase.value !== 'idle'"
        @click="goBack"
      >
        {{ form.copy.previousStep!() }}
      </NButton>
      <NButton
        v-if="mode === 'edit' && !isLastStep"
        class="min-h-target-enhanced min-w-target-enhanced"
        attr-type="button"
        type="primary"
        :disabled="form.phase.value !== 'idle'"
        @click="goNext"
      >
        {{ form.copy.nextStep!() }}
      </NButton>
      <NButton
        v-else-if="mode === 'edit'"
        class="min-h-target-enhanced min-w-target-enhanced"
        attr-type="submit"
        :form="form.formId"
        type="primary"
        :aria-busy="form.phase.value === 'validating' || form.phase.value === 'submitting'"
        :disabled="form.phase.value !== 'idle'"
      >
        {{ form.copy.submit() }}
      </NButton>
      <NButton
        v-if="mode === 'edit'"
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
        v-if="mode === 'edit'"
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :disabled="!history.canUndo.value"
        :title="
          form.hasPendingInput.value ? t('formLifecycle.pending') : t('formShowcase.undoHint')
        "
        @click="history.undo"
      >
        {{ t('formShowcase.undo') }}
      </NButton>
    </template>
    <template #insight>
      <p
        class="m-0 text-caption text-text-secondary"
        v-text="t('formCapabilities.steps.insight')"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
