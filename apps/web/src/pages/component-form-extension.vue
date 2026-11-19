<script setup lang="ts">
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { type HTMLAttributes, ref, useId } from 'vue'
import { UiForm, UiFormField, useUiForm, type UiFormSchema } from '@platform/ui'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExtensionControl from '../app/workbench/forms/FormExtensionControl.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
defineOptions({ name: 'ComponentFormExtensionPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const mode = ref<'edit' | 'detail'>('edit')
const modeGroupName = useId()
const schema = {
  columns: 2,
  fields: [
    { kind: 'text', name: 'name', label: 'configuredForm.name', required: true },
    {
      kind: 'custom',
      name: 'extensionKey',
      label: 'formShowcase.extensionKey',
      required: true,
      defaultValue: '',
      description: 'formShowcase.extensionHint',
    },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-extension',
  schema,
  initial: {
    draftId: 'trusted-extension',
    values: { name: 'PAVP', extensionKey: 'studio' },
  },
})
const draft = useFormExampleDraft(form, ['name', 'extensionKey'])
const history = useFormExampleUndo(() => form)
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="extension"
    :form="form"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
    :mode="mode"
  >
    <template #controls>
      <NRadioGroup
        v-model:value="mode"
        :name="modeGroupName"
        v-bind="
          { role: 'radiogroup', 'aria-label': t('formShowcase.viewMode') } satisfies HTMLAttributes
        "
      >
        <NRadioButton value="edit">
          {{ t('configuredForm.edit') }}
        </NRadioButton>
        <NRadioButton
          value="detail"
          :disabled="form.hasPendingInput.value"
        >
          {{ t('configuredForm.detail') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
    <template #insight>
      <div
        class="grid grid-cols-2 min-w-0 items-center gap-component-unit text-caption text-text-secondary"
      >
        <span
          class="min-w-0 truncate"
          :title="t('formShowcase.displayPrefix')"
          v-text="t('formShowcase.displayPrefix')"
        />
        <span class="text-right min-w-0 truncate text-text-primary">PAVP /</span>
      </div>
    </template>
    <UiForm
      class="grid gap-content-gap"
      :form="form"
      :mode="mode"
    >
      <div
        class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
      >
        <UiFormField
          :form="form"
          name="name"
          :mode="mode"
        />
        <UiFormField
          :form="form"
          name="extensionKey"
          :mode="mode"
        >
          <template #default="binding">
            <FormExtensionControl :binding="binding" />
          </template>
          <template #detail="binding">
            <span
              class="max-w-full inline-block whitespace-pre-wrap break-all text-body text-text-primary"
            >
              {{ binding.value ? `PAVP / ${String(binding.value)}` : t('configuredForm.empty') }}
            </span>
          </template>
        </UiFormField>
      </div>
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
  </FormCapabilityWorkbench>
</template>
