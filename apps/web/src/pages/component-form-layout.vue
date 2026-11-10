<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'

defineOptions({ name: 'ComponentFormLayoutPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const columns = ref<1 | 2>(2)
const schema = {
  columns: 2,
  fields: [
    { kind: 'text', name: 'project', label: 'formCapabilities.layout.project', required: true },
    { kind: 'text', name: 'owner', label: 'formCapabilities.layout.owner', required: true },
    {
      kind: 'textarea',
      name: 'brief',
      label: 'formCapabilities.layout.brief',
      span: 2,
      description: 'formCapabilities.layout.fullSpanHint',
    },
    {
      kind: 'group',
      name: 'delivery',
      label: 'formCapabilities.layout.delivery',
      span: 2,
      description: 'formCapabilities.layout.groupHint',
      fields: [
        { kind: 'text', name: 'city', label: 'configuredForm.city' },
        { kind: 'text', name: 'street', label: 'configuredForm.street' },
        {
          kind: 'group',
          name: 'contact',
          label: 'formCapabilities.layout.contact',
          span: 2,
          fields: [
            { kind: 'text', name: 'name', label: 'configuredForm.name' },
            {
              kind: 'text',
              name: 'email',
              label: 'configuredForm.email',
              rules: { format: 'email' },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-layout',
  schema,
  initial: {
    draftId: 'responsive-project',
    values: {
      project: 'PAVP',
      owner: '',
      brief: '',
      delivery: { city: '', street: '', contact: { name: '', email: '' } },
    },
  },
})
const history = useFormExampleUndo(() => form)
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="layout"
    :form="form"
  >
    <template #controls>
      <NButton
        v-for="count in [1, 2] as const"
        :key="count"
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :type="columns === count ? 'primary' : 'default'"
        :aria-pressed="columns === count"
        @click="columns = count"
      >
        {{
          t(
            count === 1
              ? 'formCapabilities.layout.oneColumn'
              : 'formCapabilities.layout.twoColumns',
          )
        }}
      </NButton>
    </template>
    <p class="m-0 text-body text-text-secondary">
      {{ t('formCapabilities.layout.intro') }}
    </p>
    <UiForm
      class="grid gap-content-gap"
      :form="form"
      :columns="columns"
    >
      <template #actions>
        <span />
      </template>
    </UiForm>
    <template #insight>
      <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
        <strong class="font-title-weight text-text-primary">{{
          t(
            columns === 1
              ? 'formCapabilities.layout.oneColumn'
              : 'formCapabilities.layout.twoColumns',
          )
        }}</strong>
        <p class="m-0">
          {{ t('formCapabilities.layout.responsive') }}
        </p>
        <p class="m-0">
          {{ t('formCapabilities.layout.preserved') }}
        </p>
      </div>
    </template>
    <template #actions>
      <FormExampleActions
        :form="form"
        :history="history"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
