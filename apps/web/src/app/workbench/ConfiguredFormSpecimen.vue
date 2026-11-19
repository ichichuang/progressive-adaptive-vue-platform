<script setup lang="ts">
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  computed,
  effectScope,
  getCurrentInstance,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  useId,
  watch,
} from 'vue'
import {
  UiCopyAction,
  UiForm,
  UiScrollArea,
  parseUiFormSchema,
  useUiForm,
  type UiFormSchema,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NButtonGroup } from 'naive-ui/es/button-group'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import ComponentSpecimen from './ComponentSpecimen.vue'
import FormExampleActions from './forms/FormExampleActions.vue'
import FormLiveResult from './forms/FormLiveResult.vue'
import { useFormExampleCheck, useFormShowcase } from './forms/form-showcase'
import { useFormExampleDraft } from './forms/use-form-example-draft'
import { useFormExampleUndo } from './forms/use-form-example-undo'
import { useWorkspaceUnsavedChanges } from '../workspace/use-workspace-unsaved-changes'
type FormSource = 'code' | 'json'
const props = defineProps<{ readonly source: FormSource }>()
const emit = defineEmits<{ source: [value: FormSource] }>()
const demo = useFormShowcase()
const { t } = demo
const instance = getCurrentInstance()
if (instance === null) throw new TypeError('The configured form requires the application context.')
const application = instance.appContext.app
const mode = ref<'edit' | 'detail'>('edit')
const modeGroupName = useId()
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
const draftFields = [
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
]
function createSession(source: FormSource) {
  const scope = effectScope(true)
  try {
    const session = application.runWithContext(() =>
      scope.run(() => {
        const schema =
          source === 'json'
            ? parseUiFormSchema(JSON.parse(JSON.stringify(configuration)) as unknown)
            : configuration
        const form = useUiForm({
          ...demo,
          formId: 'configured-form-specimen',
          schema,
          initial: { draftId: 'configured-form-example', values: initialValues },
        })
        return { form, draft: useFormExampleDraft(form, draftFields) }
      }),
    )
    if (!session) throw new TypeError('The configured form scope is unavailable.')
    return {
      ...session,
      dispose: () => {
        scope.stop()
      },
    }
  } catch (error) {
    scope.stop()
    throw error
  }
}
const session = shallowRef(createSession(props.source))
const form = computed(() => session.value.form)
const draftStatus = computed(() => session.value.draft.statusText.value)
function hasUnsavedChanges(): boolean {
  return session.value.draft.hasUnsavedChanges()
}
useWorkspaceUnsavedChanges(hasUnsavedChanges, () => form.value.revision.value)
const { checked, validate, clearCheck } = useFormExampleCheck(() => form.value)
watch(
  () => props.source,
  (source) => {
    // End the old persistence session before recovering its saved draft.
    session.value.dispose()
    session.value = createSession(source)
    mode.value = 'edit'
    clearCheck()
  },
)
onScopeDispose(() => {
  session.value.dispose()
})
function switchSource(source: FormSource): void {
  if (source !== props.source && !hasUnsavedChanges()) emit('source', source)
}
const copyValue = computed(() =>
  [
    t('formShowcase.aiRequest'),
    t('configuredForm.description'),
    t('configuredForm.sourceNote'),
    t('formShowcase.localBoundary'),
    t('formShowcase.aiBoundary'),
    'apps/web/src/app/workbench/ConfiguredFormSpecimen.vue',
    JSON.stringify(form.value.schema, null, 2),
  ].join('\n\n'),
)
function fill(): void {
  const current = form.value
  if (current.hasPendingInput.value || current.phase.value !== 'idle') return
  current.setValues({
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
const history = useFormExampleUndo(() => form.value)
</script>
<template>
  <ComponentSpecimen
    name="UiForm"
    pavp
    span="full"
    compact-inset
    top-aligned
  >
    <template #actions>
      <UiCopyAction
        variant="tertiary"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <div class="grid min-w-0 w-full">
      <div class="wb-form-stage wb-form-specimen-stage grid min-h-0 min-w-0">
        <section
          class="wb-form-canvas flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
          :aria-label="t('configuredForm.title')"
          @input.capture="clearCheck"
          @submit.capture.stop.prevent="mode === 'edit' && validate()"
        >
          <div class="flex-1 min-h-0 min-w-0">
            <UiScrollArea
              owner-id="configured-form-specimen-playground"
              :enabled="active"
            >
              <header
                class="wb-form-panel-header shrink-0 grid min-h-0 min-w-0 items-center gap-component-unit"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap min-w-0 items-center gap-component-unit">
                    <NButtonGroup
                      data-pavp-exclusive-selection
                      v-bind="
                        {
                          class: 'min-w-0',
                          'aria-label': t('formShowcase.configurationSource'),
                        } satisfies HTMLAttributes
                      "
                    >
                      <NButton
                        secondary
                        :bordered="false"
                        :type="source === 'code' ? 'primary' : 'default'"
                        v-bind="
                          {
                            'aria-pressed': source === 'code',
                            title: draftStatus,
                          } satisfies ButtonHTMLAttributes
                        "
                        :disabled="hasUnsavedChanges()"
                        @click="switchSource('code')"
                      >
                        {{ t('configuredForm.sourceCode') }}
                      </NButton>
                      <NButton
                        secondary
                        :bordered="false"
                        :type="source === 'json' ? 'primary' : 'default'"
                        v-bind="
                          {
                            'aria-pressed': source === 'json',
                            title: draftStatus,
                          } satisfies ButtonHTMLAttributes
                        "
                        :disabled="hasUnsavedChanges()"
                        @click="switchSource('json')"
                      >
                        {{ t('configuredForm.sourceJson') }}
                      </NButton>
                    </NButtonGroup>
                    <NRadioGroup
                      v-model:value="mode"
                      :name="modeGroupName"
                      v-bind="
                        {
                          role: 'radiogroup',
                          'aria-label': t('formShowcase.viewMode'),
                        } satisfies HTMLAttributes
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
                  </div>
                </div>
                <span
                  class="min-w-0 truncate text-caption text-text-secondary"
                  role="status"
                  aria-live="polite"
                  :title="draftStatus"
                  v-text="draftStatus"
                />
              </header>
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
            class="wb-form-panel-header shrink-0 min-w-0 bg-surface-panel"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap min-w-0 items-center gap-component-unit">
                <FormExampleActions
                  :form="form"
                  :history="history"
                />
                <NButton
                  class="min-h-target-enhanced min-w-target-enhanced"
                  quaternary
                  :disabled="form.hasPendingInput.value || form.phase.value !== 'idle'"
                  v-bind="
                    {
                      title: form.hasPendingInput.value ? t('formLifecycle.pending') : undefined,
                    } satisfies ButtonHTMLAttributes
                  "
                  @click="fill"
                >
                  {{ t('configuredForm.fill') }}
                </NButton>
              </div>
            </div>
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
