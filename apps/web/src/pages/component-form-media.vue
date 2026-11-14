<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
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
const example = createFormMediaExample(() => t('formCapabilities.media.useSample'))
const mode = ref<'edit' | 'detail'>('edit')
const form = useUiForm({
  ...demo,
  formId: 'form-media',
  schema: example.schema,
  initial: { draftId: 'media-example', values: example.initial },
  attachments: { session: example.service, 'image-session': example.imageService },
})
const comparison = computed(() => {
  const image = form.values.value.image[0]
  return image ? example.comparisons.get(image.id) : undefined
})
function describeImage(image: { width: number; height: number; bytes: number }): string {
  return `${String(image.width)} × ${String(image.height)} · ${(image.bytes / 1024).toFixed(1)} KB`
}
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
    <template #insight>
      <div class="grid min-w-0 gap-component-unit text-caption">
        <strong>{{ t('formCapabilities.media.comparison') }}</strong>
        <template v-if="comparison">
          <span
            v-text="`${t('formCapabilities.media.before')} · ${describeImage(comparison.before)}`"
          />
          <span
            v-text="`${t('formCapabilities.media.after')} · ${describeImage(comparison.after)}`"
          />
        </template>
        <span
          v-else
          class="text-text-secondary"
          v-text="t('formCapabilities.media.comparisonEmpty')"
        />
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
