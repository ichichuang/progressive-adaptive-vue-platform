<script setup lang="ts">
import { NFormItem } from 'naive-ui/es/form'
import FormValidationFeedback from '../motion/FormValidationFeedback.vue'
import { computed, inject, useAttrs } from 'vue'
import type {
  UiFormCopy,
  UiFormFieldBinding,
  UiFormFieldConfig,
} from '../../components/form-contracts'
import { formNativeAttributes } from '../../components/form-native-attributes'
import { pavpNaiveAppearanceKey } from './pavp-naive-runtime-context'
import { createPavpNaiveFormThemeProjection } from './pavp-naive-form-theme'

defineOptions({ name: 'PavpNaiveFormField', inheritAttrs: false })
defineProps<{
  readonly feedbackRevision: number
  readonly binding: UiFormFieldBinding
  readonly config: UiFormFieldConfig
  readonly copy: UiFormCopy
}>()
defineSlots<{ default: () => unknown }>()
const attrs = useAttrs()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('UiFormField requires UiProvider.')
const theme = computed(() => createPavpNaiveFormThemeProjection(appearance.value).Form)
</script>

<template>
  <NFormItem
    v-bind="{
      ...formNativeAttributes(attrs),
      ...(binding.invalid ? { validationStatus: 'error' as const } : {}),
    }"
    class="pavp-form-field"
    :data-invalid="binding.invalid"
    :data-readonly="binding.readonly"
    label-placement="top"
    :label="config.label"
    :label-props="{ id: binding.labelId, for: binding.controlId }"
    :show-require-mark="false"
    :show-feedback="false"
    :theme-overrides="theme"
  >
    <template #label>
      {{ config.label }} <span v-if="binding.required">({{ copy.required() }})</span>
    </template>
    <div class="pavp-form-field__content">
      <FormValidationFeedback
        :motion="appearance.motion"
        :revision="feedbackRevision"
        :active="binding.invalid && !binding.hidden && !binding.disabled && !binding.readonly"
        :errors="binding.errors"
      >
        <slot />
      </FormValidationFeedback>
      <ul
        :id="`${binding.controlId}-errors`"
        class="sr-only"
      >
        <li
          v-for="(message, index) in binding.errors"
          :key="index"
        >
          {{ message() }}
        </li>
      </ul>
      <p
        v-if="config.description"
        :id="`${binding.controlId}-description`"
        class="pavp-form-field__description"
      >
        {{ config.description }}
      </p>
    </div>
  </NFormItem>
</template>

<style>
@layer components {
  .pavp-form-field,
  .pavp-form-field__content {
    min-inline-size: 0;
    inline-size: 100%;
  }
  .pavp-form-field__description {
    color: var(--ui-color-text-secondary);
  }
}
@layer vendor-overrides {
  .pavp-form-field .n-form-item-label {
    white-space: normal;
  }
}
.pavp-form-field .n-form-item-label {
  transition: none;
}
</style>
