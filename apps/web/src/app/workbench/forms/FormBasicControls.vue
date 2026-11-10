<script setup lang="ts">
import { useFormExampleUndo } from './use-form-example-undo'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { UiForm, parseUiFormSchema, useUiForm, type UiFormSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import FormExampleActions from './FormExampleActions.vue'
import FormCapabilityWorkbench from './FormCapabilityWorkbench.vue'
import { useFormShowcase } from './form-showcase'
import { useFormExampleDraft } from './use-form-example-draft'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly source: 'code' | 'json'
}>()
const emit = defineEmits<{ source: [value: 'code' | 'json'] }>()
const demo = useFormShowcase()
const { t } = demo
const configuration = {
  columns: 2,
  fields: [
    {
      kind: 'text',
      name: 'name',
      label: 'configuredForm.name',
      placeholder: 'configuredForm.namePlaceholder',
      required: true,
    },
    {
      kind: 'number',
      name: 'capacity',
      label: 'configuredForm.capacity',
      min: 1,
      max: 100,
      step: 1,
      placeholder: 'formShowcase.capacityPlaceholder',
    },
    {
      kind: 'select',
      name: 'category',
      label: 'configuredForm.category',
      placeholder: 'formShowcase.selectPlaceholder',
      options: [
        { value: 'internal', label: 'configuredForm.internal' },
        { value: 'external', label: 'configuredForm.external' },
      ],
    },
    {
      kind: 'multi-select',
      name: 'tags',
      label: 'configuredForm.tags',
      options: [
        { value: 'design', label: 'configuredForm.design' },
        { value: 'engineering', label: 'configuredForm.engineering' },
      ],
    },
    {
      kind: 'date',
      name: 'startDate',
      label: 'configuredForm.date',
      placeholder: 'formShowcase.datePlaceholder',
    },
    { kind: 'switch', name: 'enabled', label: 'formShowcase.enabled' },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'formShowcase.notes',
      span: 2,
    },
  ],
} satisfies UiFormSchema
const schema =
  props.source === 'json'
    ? parseUiFormSchema(JSON.parse(JSON.stringify(configuration)) as unknown)
    : configuration
const form = useUiForm({
  ...demo,
  formId: 'form-basic-controls',
  schema,
  initial: {
    draftId: 'basic-controls',
    values: {
      name: '',
      capacity: null as number | null,
      category: null as string | null,
      tags: [] as string[],
      startDate: null as string | null,
      enabled: true,
      notes: '',
    },
  },
})
const draft = useFormExampleDraft(form, [
  'name',
  'capacity',
  'category',
  'tags',
  'startDate',
  'enabled',
  'notes',
])
function switchSource(value: 'code' | 'json'): void {
  if (!draft.hasUnsavedChanges()) emit('source', value)
}
const history = useFormExampleUndo(() => form)
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="basics"
    :form="form"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
  >
    <template #controls>
      <NPopconfirm
        v-for="kind in ['code', 'json'] as const"
        :key="kind"
        class="wb-form-draft-popover"
        scrollable
        to="#pavp-overlay-root"
        :disabled="source === kind || !draft.hasUnsavedChanges()"
        :positive-text="
          t(kind === 'code' ? 'configuredForm.sourceCode' : 'configuredForm.sourceJson')
        "
        :negative-text="t('formBuilder.cancel')"
        @positive-click="emit('source', kind)"
      >
        <template #trigger>
          <NButton
            class="min-h-target-enhanced min-w-target-enhanced"
            secondary
            :bordered="false"
            :type="source === kind ? 'primary' : 'default'"
            :aria-pressed="source === kind"
            @click="switchSource(kind)"
          >
            {{ t(kind === 'code' ? 'configuredForm.sourceCode' : 'configuredForm.sourceJson') }}
          </NButton>
        </template>
        {{ t('formDraft.sourceSwitchConfirm') }}
      </NPopconfirm>
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
