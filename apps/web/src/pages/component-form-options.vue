<script setup lang="ts">
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { computed, ref } from 'vue'
import {
  UiForm,
  useUiForm,
  type UiFormOption,
  type UiFormPagedOptionSource,
  type UiFormSchema,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NSwitch } from 'naive-ui/es/switch'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
defineOptions({ name: 'ComponentFormOptionsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const mode = ref<'edit' | 'detail'>('edit')
const readerAvailable = ref(true)
const catalog: readonly UiFormOption[] = [
  { value: 'design', label: 'formOptions.design' },
  { value: 'engineering', label: 'formOptions.engineering' },
  { value: 'research', label: 'formOptions.research' },
  { value: 'content', label: 'formOptions.content' },
  { value: 'operations', label: 'formOptions.operations' },
  { value: 'support', label: 'formOptions.support' },
]
const localCatalog: UiFormPagedOptionSource<object> = {
  pageSize: 2,
  query(_values, { search, page, pageSize, signal }) {
    signal.throwIfAborted()
    if (!readerAvailable.value)
      return Promise.reject(new Error('Local catalog reader is unavailable.'))
    const matching = catalog.filter((item) =>
      `${demo.translate(item.label)} ${String(item.value)}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    )
    const offset = (page - 1) * pageSize
    return Promise.resolve({
      items: matching.slice(offset, offset + pageSize),
      hasNext: offset + pageSize < matching.length,
    })
  },
  resolve(_values, { selected, signal }) {
    signal.throwIfAborted()
    if (!readerAvailable.value)
      return Promise.reject(new Error('Local catalog reader is unavailable.'))
    return Promise.resolve({
      items: catalog.filter((item) => selected.includes(item.value)),
      missing: selected.filter((value) => !catalog.some((item) => item.value === value)),
    })
  },
}
const schema = {
  columns: 1,
  fields: [
    {
      kind: 'select',
      name: 'team',
      label: 'formOptions.team',
      options: { source: 'catalog', dependsOn: [] },
    },
    {
      kind: 'multi-select',
      name: 'collaborators',
      label: 'formOptions.collaborators',
      options: { source: 'catalog', dependsOn: [] },
    },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-options',
  schema,
  sources: { catalog: localCatalog },
  initial: {
    draftId: 'local-catalog',
    values: { team: 'operations', collaborators: ['research', 'support'] },
  },
})
const fields = computed(() => ['team', 'collaborators'].map((name) => form.field(name)))
const selectionSummary = computed(() => {
  const selected = fields.value.flatMap((field) => field.selectedOptions)
  if (
    fields.value.some((field) => field.optionsState === 'failed') ||
    selected.some((item) => item.status === 'failed' || item.status === 'missing')
  )
    return t('formOptions.recoveryNeeded')
  if (selected.some((item) => item.status !== 'ready')) return t('formOptions.checkingSelection')
  return t(selected.length ? 'formOptions.selectionReady' : 'formOptions.nothingSelected')
})
function retry(): void {
  for (const name of ['team', 'collaborators']) {
    form.field(name).retryOptions('query')
    form.field(name).retryOptions('selection')
  }
}
const draft = useFormExampleDraft(form, ['team', 'collaborators'])
const history = useFormExampleUndo(() => form)
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="options"
    :form="form"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
    :mode="mode"
  >
    <template #controls>
      <NButton
        v-for="view in ['edit', 'detail'] as const"
        :key="view"
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :type="mode === view ? 'primary' : 'default'"
        :aria-pressed="mode === view"
        :disabled="view === 'detail' && form.hasPendingInput.value"
        @click="mode = view"
      >
        {{ t(view === 'edit' ? 'configuredForm.edit' : 'configuredForm.detail') }}
      </NButton>
    </template>
    <template #status>
      <div
        class="grid min-w-0 gap-component-unit text-caption text-text-secondary"
        role="status"
        aria-live="polite"
      >
        <p
          class="m-0 truncate"
          :title="t(readerAvailable ? 'formOptions.readerReady' : 'formOptions.readerUnavailable')"
        >
          {{ t(readerAvailable ? 'formOptions.readerReady' : 'formOptions.readerUnavailable') }}
        </p>
        <p
          class="m-0 truncate"
          :title="selectionSummary"
        >
          {{ selectionSummary }}
        </p>
      </div>
    </template>
    <template #insight>
      <div class="grid min-w-0 gap-content-gap text-caption text-text-secondary">
        <div
          v-for="field in fields"
          :key="field.name"
          class="grid min-w-0 gap-component-unit"
        >
          <strong class="text-text-primary">{{
            t(field.name === 'team' ? 'formOptions.team' : 'formOptions.collaborators')
          }}</strong>
          <p class="m-0 break-words">
            {{ t('formOptions.page') }}: {{ field.optionQuery?.page ?? 1 }} ·
            {{ t('formOptions.search') }}: {{ field.optionQuery?.search || t('formOptions.all') }}
          </p>
          <p class="m-0 break-words">
            {{ t('formOptions.selection') }}:
            {{
              field.selectedOptions
                .map((item) =>
                  item.option
                    ? demo.translate(item.option.label)
                    : t('formOptions.unknownSelection'),
                )
                .join(', ') || t('configuredForm.empty')
            }}
          </p>
        </div>
      </div>
    </template>
    <div class="grid gap-content-gap">
      <section
        class="grid gap-component-unit"
        :aria-label="t('formOptions.reader')"
      >
        <p class="m-0 text-caption text-text-secondary">
          {{ t('formOptions.localHint') }}
        </p>
        <div class="flex flex-wrap items-center gap-component-unit">
          <span>{{ t('formOptions.reader') }}</span>
          <NSwitch
            v-model:value="readerAvailable"
            :aria-label="t('formOptions.reader')"
          />
          <NButton
            secondary
            :bordered="false"
            @click="retry"
          >
            {{ t('formOptions.retry') }}
          </NButton>
        </div>
      </section>
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
    <template #actions>
      <FormExampleActions
        :form="form"
        :history="history"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
