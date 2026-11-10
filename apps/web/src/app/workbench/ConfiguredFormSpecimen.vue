<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref } from 'vue'
import {
  UiCopyAction,
  UiForm,
  UiScrollArea,
  parseUiFormSchema,
  useUiForm,
  type UiFormSchema,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import ComponentSpecimen from './ComponentSpecimen.vue'
import FormExampleActions from './forms/FormExampleActions.vue'
import FormLiveResult from './forms/FormLiveResult.vue'
import { useFormExampleCheck, useFormShowcase } from './forms/form-showcase'
import { useFormExampleDraft } from './forms/use-form-example-draft'
import { useFormExampleUndo } from './forms/use-form-example-undo'
import { useWorkspaceUnsavedChanges } from '../workspace/use-workspace-unsaved-changes'
const props = defineProps<{ readonly source: 'code' | 'json' }>()
const emit = defineEmits<{ source: [value: 'code' | 'json'] }>()
const demo = useFormShowcase()
const { t } = demo
const mode = ref<'edit' | 'detail'>('edit')
const active = ref(true)
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
})
const configuration: UiFormSchema = {
  columns: 2,
  fields: [
    { kind: 'text', name: 'code', label: 'configuredForm.code', readonly: true },
    {
      kind: 'text',
      name: 'name',
      label: 'configuredForm.name',
      placeholder: 'configuredForm.namePlaceholder',
      required: true,
      rules: { maxLength: 60 },
    },
    {
      kind: 'select',
      name: 'category',
      label: 'configuredForm.category',
      required: true,
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
      kind: 'number',
      name: 'capacity',
      label: 'configuredForm.capacity',
      rules: { min: 1, max: 100 },
    },
    { kind: 'date', name: 'startDate', label: 'configuredForm.date' },
    { kind: 'switch', name: 'externalContact', label: 'configuredForm.enabled' },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'configuredForm.notes',
      description: 'configuredForm.notesHint',
      span: 2,
      hidden: { field: 'externalContact', operator: 'eq', value: false },
      required: { field: 'externalContact', operator: 'eq', value: true },
    },
    {
      kind: 'group',
      name: 'address',
      label: 'configuredForm.address',
      description: 'configuredForm.addressHint',
      fields: [
        { kind: 'text', name: 'city', label: 'configuredForm.city' },
        { kind: 'text', name: 'street', label: 'configuredForm.street' },
      ],
    },
    {
      kind: 'repeat',
      name: 'contacts',
      label: 'configuredForm.contacts',
      minItems: 1,
      maxItems: 4,
      addLabel: 'configuredForm.addItem',
      itemLabel: 'configuredForm.contact',
      fields: [
        { kind: 'text', name: 'name', label: 'configuredForm.name', required: true },
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
}
const schema =
  props.source === 'json'
    ? parseUiFormSchema(JSON.parse(JSON.stringify(configuration)) as unknown)
    : configuration
const initialValues = {
  code: 'DEMO-001',
  name: 'PAVP',
  category: 'internal',
  tags: [] as string[],
  capacity: 12,
  startDate: null as string | null,
  externalContact: false,
  notes: '',
  address: { city: '', street: '' },
  contacts: [{ name: 'PAVP', email: 'demo@example.com' }],
}
const form = useUiForm({
  ...demo,
  formId: 'configured-form-specimen',
  schema,
  initial: { draftId: 'configured-form-example', values: initialValues },
})
const draft = useFormExampleDraft(form, [
  'code',
  'name',
  'category',
  'tags',
  'capacity',
  'startDate',
  'externalContact',
  'notes',
  'address',
  'contacts',
])
useWorkspaceUnsavedChanges(draft.hasUnsavedChanges, () => form.revision.value)
const { checked, validate, clearCheck } = useFormExampleCheck(form)
const copyValue = computed(() =>
  [
    t('formShowcase.aiRequest'),
    t('configuredForm.description'),
    t('configuredForm.sourceNote'),
    t('formShowcase.localBoundary'),
    t('formShowcase.aiBoundary'),
    'apps/web/src/app/workbench/ConfiguredFormSpecimen.vue',
    JSON.stringify(form.schema, null, 2),
  ].join('\n\n'),
)
function fill(): void {
  if (form.hasPendingInput.value || form.phase.value !== 'idle') return
  form.setValues({
    name: t('configuredForm.sampleName'),
    category: 'external',
    tags: ['design', 'engineering'],
    capacity: 24,
    startDate: '2026-12-01',
    externalContact: true,
    notes: t('configuredForm.sampleNotes'),
    address: { city: t('configuredForm.sampleCity'), street: t('configuredForm.sampleStreet') },
    contacts: [{ name: t('configuredForm.samplePerson'), email: 'demo@example.com' }],
  })
}
const history = useFormExampleUndo(() => form)
</script>
<template>
  <ComponentSpecimen
    name="UiForm"
    pavp
    span="full"
    top-aligned
  >
    <div class="grid min-w-0 w-full gap-content-gap">
      <div class="flex flex-wrap min-w-0 items-start justify-between gap-content-gap">
        <div class="grid min-w-0 gap-component-unit">
          <h2 class="font-title-weight m-0 text-subheading text-text-primary">
            {{ t('configuredForm.title') }}
          </h2>
          <p class="m-0 text-caption text-text-secondary">
            {{ t('configuredForm.description') }}
          </p>
        </div>
        <UiCopyAction
          variant="tertiary"
          :value="copyValue"
          :label="t('formShowcase.copyAI')"
          :copy-label="t('workbench.copy')"
          :success-label="t('workbench.copied')"
          :failure-label="t('workbench.copyFailed')"
        />
      </div>
      <div class="wb-form-stage wb-form-specimen-stage grid min-h-0 min-w-0">
        <section
          class="wb-form-canvas flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
          :aria-label="t('configuredForm.title')"
          @input.capture="clearCheck"
          @submit.capture.stop.prevent="mode === 'edit' && validate()"
        >
          <header
            class="wb-form-panel-header shrink-0 grid grid-cols-2 min-h-0 min-w-0 items-center gap-component-unit"
          >
            <div class="wb-form-controls min-w-0">
              <UiScrollArea
                owner-id="configured-form-specimen-controls"
                :enabled="active"
                x-scrollable
              >
                <div
                  class="flex min-w-full w-max whitespace-nowrap items-center gap-component-unit"
                >
                  <NButton
                    secondary
                    :bordered="false"
                    :type="source === 'code' ? 'primary' : 'default'"
                    :aria-pressed="source === 'code'"
                    :disabled="draft.hasUnsavedChanges()"
                    :title="draft.statusText.value"
                    @click="emit('source', 'code')"
                  >
                    {{ t('configuredForm.sourceCode') }}
                  </NButton>
                  <NButton
                    secondary
                    :bordered="false"
                    :type="source === 'json' ? 'primary' : 'default'"
                    :aria-pressed="source === 'json'"
                    :disabled="draft.hasUnsavedChanges()"
                    :title="draft.statusText.value"
                    @click="emit('source', 'json')"
                  >
                    {{ t('configuredForm.sourceJson') }}
                  </NButton>
                  <NButton
                    secondary
                    :bordered="false"
                    :type="mode === 'edit' ? 'primary' : 'default'"
                    :aria-pressed="mode === 'edit'"
                    @click="mode = 'edit'"
                  >
                    {{ t('configuredForm.edit') }}
                  </NButton>
                  <NButton
                    secondary
                    :bordered="false"
                    :type="mode === 'detail' ? 'primary' : 'default'"
                    :aria-pressed="mode === 'detail'"
                    :disabled="form.hasPendingInput.value"
                    @click="mode = 'detail'"
                  >
                    {{ t('configuredForm.detail') }}
                  </NButton>
                </div>
              </UiScrollArea>
            </div>
            <span
              class="min-w-0 truncate text-caption text-text-secondary"
              role="status"
              aria-live="polite"
              :title="draft.statusText.value"
              v-text="draft.statusText.value"
            />
          </header>
          <div class="flex-1 min-h-0 min-w-0">
            <UiScrollArea
              owner-id="configured-form-specimen-playground"
              :enabled="active"
            >
              <div class="wb-form-scroll-content min-w-0">
                <UiForm
                  class="grid gap-content-gap"
                  :form="form"
                  :mode="mode"
                >
                  <template #actions>
                    <span />
                  </template>
                </UiForm>
              </div>
            </UiScrollArea>
          </div>
          <footer
            v-if="mode === 'edit'"
            class="wb-form-panel-header flex shrink-0 flex-wrap min-w-0 items-center bg-surface-panel gap-content-gap"
          >
            <FormExampleActions
              :form="form"
              :history="history"
            />
            <NButton
              class="min-h-target-enhanced min-w-target-enhanced"
              quaternary
              :disabled="form.hasPendingInput.value || form.phase.value !== 'idle'"
              :title="form.hasPendingInput.value ? t('formLifecycle.pending') : undefined"
              @click="fill"
            >
              {{ t('configuredForm.fill') }}
            </NButton>
          </footer>
        </section>
        <FormLiveResult
          :form="form"
          :mode="mode"
          :checked="checked"
        />
      </div>
    </div>
  </ComponentSpecimen>
</template>
