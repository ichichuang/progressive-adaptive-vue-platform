<script setup lang="ts">
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleDraft } from '../app/workbench/forms/use-form-example-draft'
defineOptions({ name: 'ComponentFormDependenciesPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const schema = {
  columns: 2,
  fields: [
    {
      kind: 'select',
      name: 'region',
      label: 'formShowcase.region',
      options: [
        { value: 'east', label: 'formShowcase.east' },
        { value: 'west', label: 'formShowcase.west' },
        { value: 'unlisted', label: 'formShowcase.unlistedRegion' },
      ],
    },
    {
      kind: 'select',
      name: 'location',
      label: 'formShowcase.location',
      required: true,
      options: { source: 'locations', dependsOn: [{ field: 'region' }] },
    },
    { kind: 'switch', name: 'needsContact', label: 'configuredForm.enabled' },
    { kind: 'switch', name: 'locked', label: 'formShowcase.lockNotes' },
    {
      kind: 'text',
      name: 'email',
      label: 'configuredForm.email',
      hidden: { field: 'needsContact', operator: 'eq', value: false },
      required: { field: 'needsContact', operator: 'eq', value: true },
      rules: { format: 'email' },
    },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'formShowcase.notes',
      disabled: { field: 'locked', operator: 'eq', value: true },
      span: 2,
    },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-dependencies',
  schema,
  initial: {
    draftId: 'dependent-fields',
    values: {
      region: 'east',
      location: null as string | null,
      needsContact: false,
      locked: false,
      email: '',
      notes: '',
    },
  },
  sources: {
    locations: (values, { signal }) => {
      signal.throwIfAborted()
      return Promise.resolve(
        values.region === 'unlisted' || !values.region
          ? []
          : values.region === 'east'
            ? [
                { value: 'hangzhou', label: 'formShowcase.hangzhou' },
                { value: 'shanghai', label: 'formShowcase.shanghai' },
              ]
            : [
                { value: 'chengdu', label: 'formShowcase.chengdu' },
                { value: 'chongqing', label: 'formShowcase.chongqing' },
              ],
      )
    },
  },
})
const draft = useFormExampleDraft(form, [
  'region',
  'location',
  'needsContact',
  'locked',
  'email',
  'notes',
])
const history = useFormExampleUndo(() => form)
</script>
<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="dependencies"
    :form="form"
    :has-unsaved-changes="draft.hasUnsavedChanges"
    :draft-status="draft.statusText.value"
  >
    <template #controls>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        @click="form.field('location').retryOptions()"
      >
        {{ t('formShowcase.reloadLocalOptions') }}
      </NButton>
      <span class="text-caption text-text-secondary">{{
        t('formShowcase.localOptionSource')
      }}</span>
    </template>
    <template #insight>
      <dl class="m-0 grid gap-component-unit text-caption">
        <div class="grid grid-cols-2 min-w-0 items-center gap-component-unit">
          <dt
            class="min-w-0 truncate text-text-secondary"
            :title="t('formShowcase.emailVisibility')"
            v-text="t('formShowcase.emailVisibility')"
          />
          <dd
            class="m-0 text-right min-w-0 truncate text-text-primary"
            :title="`${t(form.field('email').hidden ? 'formShowcase.notShowing' : 'formShowcase.showing')}${form.field('email').required ? ` / ${t('formShowcase.requiredState')}` : ''}`"
            v-text="
              `${t(form.field('email').hidden ? 'formShowcase.notShowing' : 'formShowcase.showing')}${form.field('email').required ? ` / ${t('formShowcase.requiredState')}` : ''}`
            "
          />
        </div>
        <div class="grid grid-cols-2 min-w-0 items-center gap-component-unit">
          <dt
            class="min-w-0 truncate text-text-secondary"
            :title="t('formShowcase.notesAccess')"
            v-text="t('formShowcase.notesAccess')"
          />
          <dd
            class="m-0 text-right min-w-0 truncate text-text-primary"
            :title="
              t(
                form.field('notes').disabled
                  ? 'formShowcase.disabledState'
                  : 'formShowcase.editableState',
              )
            "
            v-text="
              t(
                form.field('notes').disabled
                  ? 'formShowcase.disabledState'
                  : 'formShowcase.editableState',
              )
            "
          />
        </div>
      </dl>
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
