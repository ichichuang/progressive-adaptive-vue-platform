<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NDropdown } from 'naive-ui/es/dropdown'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
defineOptions({ name: 'ComponentFormStructurePage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const schema = {
  columns: 2,
  fields: [
    {
      kind: 'group',
      name: 'address',
      label: 'configuredForm.address',
      description: 'configuredForm.addressHint',
      span: 1,
      fields: [
        { kind: 'text', name: 'city', label: 'configuredForm.city', span: 2 },
        { kind: 'text', name: 'street', label: 'configuredForm.street', span: 2 },
      ],
    },
    {
      kind: 'group',
      name: 'settings',
      label: 'formShowcase.preferences',
      description: 'formShowcase.groupLayoutHint',
      span: 1,
      fields: [
        { kind: 'switch', name: 'enabled', label: 'formShowcase.enabled', span: 2 },
        {
          kind: 'number',
          name: 'capacity',
          label: 'configuredForm.capacity',
          min: 1,
          max: 100,
          span: 2,
        },
      ],
    },
    {
      kind: 'repeat',
      name: 'contacts',
      label: 'configuredForm.contacts',
      description: 'formShowcase.repeatHint',
      minItems: 1,
      maxItems: 3,
      addLabel: 'configuredForm.addItem',
      itemLabel: 'configuredForm.contact',
      fields: [
        { kind: 'text', name: 'name', label: 'configuredForm.name', required: true },
        { kind: 'switch', name: 'emailEnabled', label: 'formShowcase.useEmail' },
        {
          kind: 'text',
          name: 'email',
          label: 'configuredForm.email',
          span: 2,
          hidden: { field: 'emailEnabled', scope: 'group', operator: 'eq', value: false },
          required: { field: 'emailEnabled', scope: 'group', operator: 'eq', value: true },
          rules: { format: 'email' },
        },
      ],
    },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-structure',
  schema,
  initial: {
    draftId: 'nested-record',
    values: {
      address: { city: '', street: '' },
      settings: { enabled: true, capacity: 12 },
      contacts: [{ name: 'PAVP', emailEnabled: true, email: 'demo@example.com' }],
    },
  },
})
const rowOptions = computed(() => {
  void form.revision.value
  return form.rowKeys('contacts').map((key, index) => ({
    key,
    label: `${t('configuredForm.contact')} ${String(index + 1)} · ${form.values.value.contacts[index]?.name ?? ''}`,
  }))
})
const rowCheck = ref<{
  key: string
  unavailable: boolean
  outcome: Awaited<ReturnType<typeof form.validateItem>>
} | null>(null)
const checkingRow = ref<string | null>(null)
let rowAttempt = 0
watch(
  [form.revision, form.issues],
  () => {
    rowCheck.value = null
    if (checkingRow.value !== null && !form.rowKeys('contacts').includes(checkingRow.value)) {
      rowAttempt += 1
      checkingRow.value = null
    }
  },
  { flush: 'sync' },
)
function rowLabel(key: string): string {
  const index = form.rowKeys('contacts').indexOf(key)
  return `${t('configuredForm.contact')} ${String(index + 1)}`
}
const rowCheckText = computed(() => {
  if (checkingRow.value !== null)
    return `${rowLabel(checkingRow.value)}: ${t('configuredForm.validating')}`
  const result = rowCheck.value
  if (result === null) return t('formShowcase.rowCheckHint')
  const message = result.unavailable
    ? t('formShowcase.rowCheckUnavailable')
    : result.outcome === 'valid'
      ? t('formShowcase.rowCheckValid')
      : result.outcome === 'invalid'
        ? t('formShowcase.rowCheckInvalid')
        : result.outcome === 'cancelled'
          ? t('workbench.apiLabel.cancelled')
          : t('formShowcase.rowCheckUnavailable')
  return `${rowLabel(result.key)}: ${message}`
})
async function validateRow(value: string | number): Promise<void> {
  const key = String(value)
  const index = form.rowKeys('contacts').indexOf(key)
  if (index === -1) return
  const attempt = ++rowAttempt
  checkingRow.value = key
  const outcome = await form.validateItem('contacts', index)
  if (attempt !== rowAttempt) return
  checkingRow.value = null
  if (form.rowKeys('contacts').includes(key))
    rowCheck.value = {
      key,
      outcome,
      unavailable: form.notice.value === form.copy.validationUnavailable,
    }
}
async function loadRows(count: number): Promise<void> {
  if (form.hasPendingInput.value || form.phase.value !== 'idle') return
  form.setValue(
    'contacts',
    Array.from({ length: count }, (_, index) => ({
      name: `${t('configuredForm.samplePerson')} ${String(index + 1)}`,
      emailEnabled: true,
      email: `demo${String(index + 1)}@example.com`,
    })),
  )
  await form.validate()
}
const draft = useFormExampleDraft(form, ['address', 'settings', 'contacts'])
const history = useFormExampleUndo(() => form)
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="structure"
    :form="form"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
  >
    <template #controls>
      <NDropdown
        trigger="click"
        to="#pavp-overlay-root"
        :options="rowOptions"
        :disabled="rowOptions.length === 0 || form.submitting.value"
        @select="validateRow"
      >
        <NButton
          class="min-h-target-enhanced min-w-target-enhanced"
          :disabled="rowOptions.length === 0 || form.submitting.value"
        >
          {{ t('formShowcase.validateRow') }}
        </NButton>
      </NDropdown>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        :disabled="form.hasPendingInput.value || form.phase.value !== 'idle'"
        :title="form.hasPendingInput.value ? t('formLifecycle.pending') : undefined"
        @click="loadRows(0)"
      >
        {{ t('formShowcase.loadEmptyRows') }}
      </NButton>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        :disabled="form.hasPendingInput.value || form.phase.value !== 'idle'"
        :title="form.hasPendingInput.value ? t('formLifecycle.pending') : undefined"
        @click="loadRows(4)"
      >
        {{ t('formShowcase.loadExcessRows') }}
      </NButton>
    </template>
    <template #insight>
      <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
        <span
          class="font-title-weight text-text-primary"
          v-text="t('formShowcase.lastRowCheck')"
        />
        <span
          class="min-w-0 truncate"
          role="status"
          aria-live="polite"
          :title="`${rowCheckText} · ${t('formShowcase.structureBoundary')}`"
          v-text="rowCheckText"
        />
      </div>
      <div
        class="grid grid-cols-2 min-w-0 items-center gap-component-unit text-caption text-text-secondary"
      >
        <span
          class="min-w-0 truncate"
          :title="t('formShowcase.contactCount')"
          v-text="t('formShowcase.contactCount')"
        />
        <strong
          class="font-title-weight text-right min-w-0 truncate text-text-primary"
          :title="`${form.rowKeys('contacts').length} / 1–3`"
          v-text="`${form.rowKeys('contacts').length} / 1–3`"
        />
      </div>
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
