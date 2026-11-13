<script setup lang="ts">
import { ref } from 'vue'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { UiForm, useUiForm } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
import { createFormRichTextExample } from '../app/workbench/forms/form-rich-text-example'

defineOptions({ name: 'ComponentFormRichTextPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const example = createFormRichTextExample(t)
const mode = ref<'edit' | 'detail'>('edit')
const form = useUiForm({
  ...demo,
  formId: 'form-rich-text',
  schema: example.schema,
  initial: { draftId: 'form-rich-text', values: {} },
})
const history = useFormExampleUndo(() => form)
const draft = useFormExampleDraft(form, ['title', 'body', 'note'])
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="richText"
    :form="form"
    :mode="mode"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
  >
    <template #controls>
      <NRadioGroup
        v-model:value="mode"
        :disabled="form.hasPendingInput.value"
        :aria-label="t('formCapabilities.richText.controls')"
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
      <FormExampleActions
        :form="form"
        :history="history"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
