<script setup lang="ts">
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { ref } from 'vue'
import {
  UiForm,
  useUiForm,
  type UiFormSchema,
  type UiFormOption,
  type UiFormPagedOptionSource,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
defineOptions({ name: 'ComponentFormDetailPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const mode = ref<'edit' | 'detail'>('detail')
// These local data functions exercise the public source contract without a service.
function localChoiceSource(items: readonly UiFormOption[]): UiFormPagedOptionSource<object> {
  return {
    pageSize: 1,
    query: (_values, { search, page, pageSize, signal }) => {
      signal.throwIfAborted()
      const filtered = items.filter((item) =>
        `${demo.translate(item.label)} ${String(item.value)}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
      )
      const start = (page - 1) * pageSize
      return Promise.resolve({
        items: filtered.slice(start, start + pageSize),
        hasNext: start + pageSize < filtered.length,
      })
    },
    resolve: (_values, { selected, signal }) => {
      signal.throwIfAborted()
      return Promise.resolve({
        items: items.filter((item) => selected.includes(item.value)),
        missing: selected.filter((value) => !items.some((item) => item.value === value)),
      })
    },
  }
}
const categories = localChoiceSource([
  { value: 'internal', label: 'configuredForm.internal' },
  { value: 'external', label: 'configuredForm.external' },
])
const tags = localChoiceSource([
  { value: 'design', label: 'configuredForm.design' },
  { value: 'engineering', label: 'configuredForm.engineering' },
])
const schema = {
  columns: 2,
  fields: [
    { kind: 'text', name: 'code', label: 'configuredForm.code', readonly: true },
    { kind: 'text', name: 'name', label: 'configuredForm.name', required: true },
    {
      kind: 'select',
      name: 'category',
      label: 'configuredForm.category',
      options: { source: 'categories', dependsOn: [] },
    },
    {
      kind: 'multi-select',
      name: 'tags',
      label: 'configuredForm.tags',
      options: { source: 'tags', dependsOn: [] },
    },
    { kind: 'switch', name: 'enabled', label: 'formShowcase.enabled' },
    { kind: 'date', name: 'startDate', label: 'configuredForm.date' },
    { kind: 'textarea', name: 'notes', label: 'formShowcase.notes', span: 2 },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-detail',
  sources: { categories, tags },
  schema,
  initial: {
    draftId: 'detail-preview',
    values: {
      code: 'FORM-001',
      name: 'PAVP',
      category: 'external',
      tags: ['design', 'engineering'],
      enabled: true,
      startDate: '2026-12-01',
      notes: '',
    },
  },
})
const draft = useFormExampleDraft(form, [
  'code',
  'name',
  'category',
  'tags',
  'enabled',
  'startDate',
  'notes',
])
const history = useFormExampleUndo(() => form)
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="detail"
    :form="form"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
    :mode="mode"
  >
    <template #controls>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :type="mode === 'detail' ? 'primary' : 'default'"
        :aria-pressed="mode === 'detail'"
        :disabled="form.hasPendingInput.value"
        @click="mode = 'detail'"
      >
        {{ t('configuredForm.detail') }}
      </NButton>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :type="mode === 'edit' ? 'primary' : 'default'"
        :aria-pressed="mode === 'edit'"
        @click="mode = 'edit'"
      >
        {{ t('configuredForm.edit') }}
      </NButton>
    </template>
    <template #insight>
      <div
        class="grid grid-cols-2 min-w-0 items-center gap-component-unit text-caption text-text-secondary"
      >
        <span
          class="min-w-0 truncate"
          :title="t('formShowcase.viewMode')"
          v-text="t('formShowcase.viewMode')"
        />
        <span
          class="text-right min-w-0 truncate text-text-primary"
          :title="t(mode === 'detail' ? 'configuredForm.detail' : 'configuredForm.edit')"
          v-text="t(mode === 'detail' ? 'configuredForm.detail' : 'configuredForm.edit')"
        />
      </div>
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
