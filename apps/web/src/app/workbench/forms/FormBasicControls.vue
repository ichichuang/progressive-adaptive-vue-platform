<script setup lang="ts">
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  computed,
  effectScope,
  getCurrentInstance,
  nextTick,
  onScopeDispose,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useFormExampleUndo } from './use-form-example-undo'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { UiForm, parseUiFormSchema, useUiForm, type UiFormSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NButtonGroup } from 'naive-ui/es/button-group'
import FormExampleActions from './FormExampleActions.vue'
import FormCapabilityWorkbench from './FormCapabilityWorkbench.vue'
import { useFormShowcase } from './form-showcase'
import { useFormExampleDraft } from './use-form-example-draft'

type FormSource = 'code' | 'json'
const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly source: FormSource
}>()
const emit = defineEmits<{ source: [value: FormSource] }>()
const demo = useFormShowcase()
const { t } = demo
const instance = getCurrentInstance()
if (instance === null) throw new TypeError('The form example requires the application context.')
const application = instance.appContext.app
const sourceGroup = useTemplateRef<InstanceType<typeof NButtonGroup>>('sourceGroup')
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
    {
      kind: 'radio',
      name: 'audience',
      label: 'formShowcase.radio',
      options: [
        { value: 'internal', label: 'configuredForm.internal' },
        { value: 'external', label: 'configuredForm.external' },
      ],
    },
    {
      kind: 'checkbox-group',
      name: 'interests',
      label: 'formShowcase.checkboxGroup',
      options: [
        { value: 'design', label: 'configuredForm.design' },
        { value: 'engineering', label: 'configuredForm.engineering' },
      ],
    },
    { kind: 'date-range', name: 'period', label: 'formShowcase.dateRange' },
    { kind: 'time', name: 'startTime', label: 'formShowcase.time' },
    { kind: 'switch', name: 'enabled', label: 'formShowcase.enabled' },
    {
      kind: 'mask',
      name: 'reference',
      label: 'formFields.reference',
      mask: 'AAA-####',
      placeholder: 'formFields.referencePlaceholder',
    },
    {
      kind: 'slider',
      name: 'progress',
      label: 'formFields.progress',
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 40,
    },
    {
      kind: 'rating',
      name: 'rating',
      label: 'formFields.rating',
      count: 5,
      allowHalf: true,
      defaultValue: 3.5,
    },
    {
      kind: 'attachment',
      name: 'attachments',
      label: 'formFields.attachments',
      description: 'formFields.localAttachment',
      source: 'local-selection',
      maxFiles: 3,
      maxSize: 5242880,
    },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'formShowcase.notes',
      span: 2,
    },
  ],
} satisfies UiFormSchema
function createForm(source: FormSource) {
  const schema =
    source === 'json'
      ? parseUiFormSchema(JSON.parse(JSON.stringify(configuration)) as unknown)
      : configuration
  return useUiForm({
    ...demo,
    // Demonstrates file selection only. No request or claim of server persistence.
    attachments: {
      'local-selection': (file) =>
        Promise.resolve({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
        }),
    },
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
        audience: null as string | null,
        interests: [] as string[],
        period: null as [string, string] | null,
        startTime: null as string | null,
        enabled: true,
        notes: '',
      },
    },
  })
}
const draftFields = [
  'name',
  'capacity',
  'category',
  'tags',
  'startDate',
  'audience',
  'interests',
  'period',
  'startTime',
  'enabled',
  'reference',
  'progress',
  'rating',
  'attachments',
  'notes',
]
function createSession(source: FormSource) {
  const scope = effectScope(true)
  try {
    const session = application.runWithContext(() =>
      scope.run(() => {
        const form = createForm(source)
        return { form, draft: useFormExampleDraft(form, draftFields) }
      }),
    )
    if (!session) throw new TypeError('The form example scope is unavailable.')
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
const history = useFormExampleUndo(() => form.value)
watch(
  () => props.source,
  (source) => {
    // End the old persistence session before recovering the same draft in the new form.
    session.value.dispose()
    session.value = createSession(source)
  },
)
onScopeDispose(() => {
  session.value.dispose()
})
function hasUnsavedChanges(): boolean {
  return session.value.draft.hasUnsavedChanges()
}
function switchSource(value: FormSource): void {
  if (props.source !== value && !hasUnsavedChanges()) emit('source', value)
}
function restoreSourceFocus(value: FormSource): void {
  void nextTick(() => {
    const root: unknown = sourceGroup.value?.$el
    if (root instanceof HTMLElement)
      root.querySelector<HTMLButtonElement>(`button[data-form-source="${value}"]`)?.focus({
        preventScroll: true,
      })
  })
}
function confirmSource(value: FormSource): void {
  emit('source', value)
  restoreSourceFocus(value)
}
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="basics"
    :form="form"
    :has-unsaved-changes="hasUnsavedChanges"
    :draft-status="draftStatus"
  >
    <template #controls>
      <NButtonGroup
        ref="sourceGroup"
        data-pavp-exclusive-selection
        v-bind="
          {
            class: 'min-w-0',
            'aria-label': t('formShowcase.configurationSource'),
          } satisfies HTMLAttributes
        "
      >
        <NPopconfirm
          v-for="kind in ['code', 'json'] as const"
          :key="kind"
          class="wb-form-draft-popover"
          scrollable
          to="#pavp-overlay-root"
          :disabled="source === kind || !hasUnsavedChanges()"
          :positive-text="
            t(kind === 'code' ? 'configuredForm.sourceCode' : 'configuredForm.sourceJson')
          "
          :negative-text="t('formBuilder.cancel')"
          @positive-click="confirmSource(kind)"
          @negative-click="restoreSourceFocus(kind)"
        >
          <template #trigger>
            <NButton
              class="min-h-target-enhanced min-w-target-enhanced"
              secondary
              :bordered="false"
              :type="source === kind ? 'primary' : 'default'"
              :data-form-source="kind"
              v-bind="{ 'aria-pressed': source === kind } satisfies ButtonHTMLAttributes"
              @click="switchSource(kind)"
            >
              {{ t(kind === 'code' ? 'configuredForm.sourceCode' : 'configuredForm.sourceJson') }}
            </NButton>
          </template>
          {{ t('formDraft.sourceSwitchConfirm') }}
        </NPopconfirm>
      </NButtonGroup>
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
