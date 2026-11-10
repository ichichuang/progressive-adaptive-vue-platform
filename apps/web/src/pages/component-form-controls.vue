<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import FormPreferenceControl from '../app/workbench/forms/FormPreferenceControl.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'

defineOptions({ name: 'ComponentFormControlsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const mode = ref<'edit' | 'detail'>('edit')
const schema = {
  columns: 1,
  fields: [
    {
      kind: 'custom',
      name: 'profile',
      label: 'formCapabilities.controls.profile',
      description: 'formCapabilities.controls.profileHint',
      required: true,
      defaultValue: 'balanced',
    },
    { kind: 'switch', name: 'enabled', label: 'formCapabilities.controls.enabled' },
    {
      kind: 'custom',
      name: 'channels',
      label: 'formCapabilities.controls.channels',
      description: 'formCapabilities.controls.channelsHint',
      required: { field: 'enabled', operator: 'eq', value: true },
      disabled: { field: 'enabled', operator: 'eq', value: false },
      defaultValue: ['inapp'],
    },
    { kind: 'textarea', name: 'notes', label: 'formShowcase.notes' },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-controls',
  schema,
  initial: {
    draftId: 'local-preferences',
    values: { profile: 'balanced', enabled: true, channels: ['inapp'], notes: '' },
  },
})
const history = useFormExampleUndo(() => form)
function profileLabel(value: unknown): string {
  return value === 'quiet'
    ? t('formCapabilities.controls.quiet')
    : value === 'instant'
      ? t('formCapabilities.controls.instant')
      : t('formCapabilities.controls.balanced')
}
function channelLabels(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return form.copy.empty()
  return value
    .map((channel) =>
      channel === 'inapp'
        ? t('formCapabilities.controls.inapp')
        : channel === 'email'
          ? t('formCapabilities.controls.email')
          : t('formCapabilities.controls.desktop'),
    )
    .join(' / ')
}
function detailValue(name: string, value: unknown): string {
  if (name === 'profile') return profileLabel(value)
  if (name === 'channels') return channelLabels(value)
  if (typeof value === 'boolean') return value ? form.copy.yes() : form.copy.no()
  return typeof value === 'string' && value ? value : form.copy.empty()
}
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="controls"
    :form="form"
    :mode="mode"
  >
    <template #controls>
      <NButton
        secondary
        :bordered="false"
        class="min-h-target-enhanced min-w-target-enhanced"
        :type="mode === 'edit' ? 'primary' : 'default'"
        :aria-pressed="mode === 'edit'"
        @click="mode = 'edit'"
      >
        {{ t('configuredForm.edit') }}
      </NButton>
      <NButton
        secondary
        :bordered="false"
        class="min-h-target-enhanced min-w-target-enhanced"
        :type="mode === 'detail' ? 'primary' : 'default'"
        :aria-pressed="mode === 'detail'"
        :disabled="form.hasPendingInput.value"
        @click="mode = 'detail'"
      >
        {{ t('configuredForm.detail') }}
      </NButton>
    </template>
    <UiForm
      :form="form"
      :mode="mode"
      class="grid gap-content-gap"
    >
      <template #field="binding">
        <FormPreferenceControl
          v-if="binding.name === 'profile' || binding.name === 'channels'"
          :binding="binding"
          :kind="binding.name"
        />
      </template>
      <template #detail="binding">
        <span class="min-w-0 whitespace-pre-wrap break-words">
          {{ detailValue(binding.name, binding.value) }}
        </span>
      </template>
      <template #actions>
        <span />
      </template>
    </UiForm>
    <template #actions>
      <FormExampleActions
        :form="form"
        :history="history"
      />
    </template>
    <template #status>
      <p class="m-0 text-caption text-text-secondary">
        {{ t('formCapabilities.controls.boundary') }}
      </p>
    </template>
  </FormCapabilityWorkbench>
</template>
