<script setup lang="ts">
import { UiForm, useUiForm, type UiFormIssue, type UiFormSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
defineOptions({ name: 'ComponentFormValidationPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const schema = {
  columns: 2,
  fields: [
    {
      kind: 'text',
      name: 'name',
      label: 'configuredForm.name',
      required: true,
      rules: { minLength: 2, maxLength: 40 },
    },
    {
      kind: 'text',
      name: 'email',
      label: 'configuredForm.email',
      required: true,
      rules: { format: 'email' },
    },
    {
      kind: 'number',
      name: 'capacity',
      label: 'configuredForm.capacity',
      required: true,
      rules: { min: 1, max: 8 },
      description: 'formShowcase.capacityRule',
    },
    {
      kind: 'text',
      name: 'alias',
      label: 'formShowcase.alias',
      required: true,
      description: 'formShowcase.aliasRule',
    },
    {
      kind: 'repeat',
      name: 'contacts',
      label: 'configuredForm.contacts',
      itemLabel: 'configuredForm.contact',
      minItems: 1,
      maxItems: 2,
      fields: [
        {
          kind: 'text',
          name: 'email',
          label: 'configuredForm.email',
          required: true,
          rules: { format: 'email' },
        },
      ],
    },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-validation',
  schema,
  initial: {
    draftId: 'record-a',
    values: {
      name: '',
      email: '',
      capacity: null as number | null,
      alias: '',
      contacts: [{ email: '' }],
    },
  },
  validation: (values) => {
    const issues: UiFormIssue[] = []
    if (values.alias && !/^[a-z][a-z0-9-]*$/u.test(values.alias)) {
      issues.push({ field: 'alias', message: () => t('formShowcase.aliasRule') })
    }
    const emails = values.contacts.map((contact) => contact.email.trim().toLowerCase())
    emails.forEach((email, index) => {
      if (email && emails.filter((candidate) => candidate === email).length > 1) {
        issues.push({
          field: `contacts.${String(index)}.email`,
          message: () => t('formShowcase.duplicateEmail'),
        })
      }
    })
    return issues
  },
})
function fill(valid: boolean): void {
  if (form.hasPendingInput.value || form.phase.value !== 'idle') return
  form.setValues({
    name: valid ? t('configuredForm.sampleName') : 'A',
    email: valid ? 'studio@example.com' : 'studio',
    capacity: valid ? 4 : 12,
    alias: valid ? 'design-studio' : 'Design Studio',
    contacts: valid
      ? [{ email: 'contact@example.com' }]
      : [{ email: 'same@example.com' }, { email: 'same@example.com' }],
  })
}

const draft = useFormExampleDraft(form, ['name', 'email', 'capacity', 'alias', 'contacts'])
const history = useFormExampleUndo(() => form)
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="validation"
    :form="form"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
  >
    <template #controls>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :disabled="form.hasPendingInput.value || form.phase.value !== 'idle'"
        :title="form.hasPendingInput.value ? t('formLifecycle.pending') : undefined"
        @click="fill(false)"
      >
        {{ t('formShowcase.fillInvalid') }}
      </NButton>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :disabled="form.hasPendingInput.value || form.phase.value !== 'idle'"
        :title="form.hasPendingInput.value ? t('formLifecycle.pending') : undefined"
        @click="fill(true)"
      >
        {{ t('formShowcase.fillValid') }}
      </NButton>
    </template>
    <UiForm
      class="grid gap-content-gap"
      :form="form"
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
