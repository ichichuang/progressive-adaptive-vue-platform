<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { UiForm, useUiForm } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { createFormMediaExample } from '../app/workbench/forms/form-media-example'

defineOptions({ name: 'ComponentFormMediaPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const example = createFormMediaExample()
const mode = ref<'edit' | 'detail'>('edit')
const form = useUiForm({
  ...demo,
  formId: 'form-media',
  schema: example.schema,
  initial: { draftId: 'media-example', values: example.initial },
  attachments: { session: example.service },
})
const history = useFormExampleUndo(() => form)
onScopeDispose(example.dispose)
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="media"
    :form="form"
    :mode="mode"
  >
    <template #controls>
      <NRadioGroup
        v-model:value="mode"
        :disabled="form.hasPendingInput.value"
        :aria-label="t('formCapabilities.media.controls')"
      >
        <NRadioButton value="edit">
          {{ t('configuredForm.edit') }}
        </NRadioButton>
        <NRadioButton value="detail">
          {{ t('configuredForm.detail') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
    <p class="m-0 text-caption text-text-secondary">
      {{ t('formCapabilities.media.local') }}
    </p>
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
