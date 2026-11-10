<script setup lang="ts">
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { computed } from 'vue'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormDraft } from '../app/forms/use-form-draft'
import { useFormDraftStorage } from '../app/forms/use-form-draft-storage'
import type { ConsoleMessageKey } from '../shared/i18n'

defineOptions({ name: 'ComponentFormLifecyclePage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const schema = {
  columns: 2,
  fields: [
    { kind: 'text', name: 'name', label: 'configuredForm.name', required: true },
    {
      kind: 'number',
      name: 'capacity',
      label: 'configuredForm.capacity',
      rules: { min: 1, max: 100 },
    },
    {
      kind: 'select',
      name: 'category',
      label: 'configuredForm.category',
      options: [
        { value: 'internal', label: 'configuredForm.internal' },
        { value: 'external', label: 'configuredForm.external' },
      ],
    },
    { kind: 'textarea', name: 'notes', label: 'formShowcase.notes', span: 2 },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-lifecycle',
  schema,
  initial: {
    draftId: 'lifecycle-record',
    values: { name: '', capacity: 4, category: 'internal', notes: '' },
  },
})
const localDraft = useFormDraft({
  form,
  scope: 'example-form-lifecycle-input',
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  includeFields: ['name', 'capacity', 'category', 'notes'],
  enabled: () => true,
  automatic: true,
})

// Read the old, narrower example once. Never overwrite or delete its record.
const storage = useFormDraftStorage()
if (localDraft.status.value === 'empty' && !form.hasUnsavedChanges.value) {
  const previous = storage
    .create({
      scope: 'example-form-lifecycle',
      schemaKey: JSON.stringify({ schema: form.schema, fields: ['capacity', 'category'] }),
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      parse(value: unknown) {
        if (typeof value !== 'object' || value === null || Array.isArray(value))
          throw new TypeError('Expected the previous example draft.')
        const data = value as Record<string, unknown>
        if (
          Object.keys(data).sort().join(',') !== 'draftId,formId,initial,values' ||
          data['formId'] !== form.formId ||
          data['draftId'] !== form.draftId.value
        )
          throw new TypeError('The previous draft belongs to another example.')
        function fields(value: unknown) {
          if (typeof value !== 'object' || value === null || Array.isArray(value))
            throw new TypeError('Expected the previous field values.')
          const fields = value as Record<string, unknown>
          if (
            Object.keys(fields).sort().join(',') !== 'capacity,category' ||
            !(
              fields['capacity'] === null ||
              (typeof fields['capacity'] === 'number' && Number.isFinite(fields['capacity']))
            ) ||
            ![null, 'internal', 'external'].includes(fields['category'] as string | null)
          )
            throw new TypeError('The previous field values are invalid.')
          return {
            capacity: fields['capacity'],
            category: fields['category'] as string | null,
          }
        }
        const initial = fields(data['initial'])
        if (initial.capacity !== 4 || initial.category !== 'internal')
          throw new TypeError('The previous draft has another reset baseline.')
        return fields(data['values'])
      },
    })
    .read()
  if (previous.status === 'found' && localDraft.active.value) {
    form.setValues(previous.data)
    localDraft.save()
  }
}
const unsaved = computed(() => form.hasPendingInput.value || localDraft.unsaved.value)
const statusMessages = {
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
} as const satisfies Record<typeof localDraft.status.value, ConsoleMessageKey>
const statusText = computed(() =>
  t(
    form.hasPendingInput.value && !localDraft.unsaved.value
      ? 'formLifecycle.pending'
      : statusMessages[localDraft.status.value],
  ),
)
const saved = computed(() => !unsaved.value && localDraft.active.value)
const history = useFormExampleUndo(() => form)
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="lifecycle"
    :form="form"
    :has-unsaved-changes="() => unsaved"
  >
    <template #controls>
      <div
        class="flex min-w-0 items-center gap-component-unit text-caption text-text-secondary"
        role="status"
        aria-live="polite"
        :title="statusText"
      >
        <span
          :class="saved ? 'i-lucide-check text-control-primary' : 'i-lucide-info'"
          class="shrink-0 size-icon-small"
          aria-hidden="true"
        />
        <span
          class="truncate"
          v-text="statusText"
        />
      </div>
    </template>
    <p class="m-0 text-caption text-text-secondary">
      {{ t('formLifecycle.editHint') }}
    </p>
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
