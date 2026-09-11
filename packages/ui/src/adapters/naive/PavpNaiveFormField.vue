<script setup lang="ts" generic="I, K extends UiFormKey<I>">
import { NFormItem } from 'naive-ui/es/form'
import { computed, inject, useAttrs } from 'vue'
import type {
  UiFormCopy,
  UiFormFieldBinding,
  UiFormFieldConfig,
  UiFormKey,
} from '../../components/form-contracts'
import { formNativeAttributes } from '../../components/form-native-attributes'
import { pavpNaiveAppearanceKey } from './pavp-naive-runtime-context'
import { createPavpNaiveFormThemeProjection } from './pavp-naive-theme'

defineOptions({ name: 'PavpNaiveFormField', inheritAttrs: false })
defineProps<{
  readonly binding: UiFormFieldBinding<I, K>
  readonly config: UiFormFieldConfig<I>
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
    :label="config.label()"
    :label-props="{ id: binding.labelId, for: binding.controlId }"
    :show-require-mark="false"
    :show-feedback="binding.invalid"
    :theme-overrides="theme"
  >
    <template #label>
      {{ config.label() }} <span v-if="binding.required">({{ copy.required() }})</span>
    </template>
    <div class="pavp-form-field__content">
      <slot />
      <p
        v-if="config.description"
        :id="`${binding.controlId}-description`"
        class="pavp-form-field__description"
      >
        {{ config.description() }}
      </p>
    </div>
    <template #feedback>
      <ul
        v-if="binding.invalid"
        :id="`${binding.controlId}-errors`"
        class="pavp-form-field__errors"
      >
        <li
          v-for="(message, index) in binding.errors"
          :key="index"
        >
          {{ message() }}
        </li>
      </ul>
    </template>
  </NFormItem>
</template>

<style>
.pavp-form-field,
.pavp-form-field__content {
  min-inline-size: 0;
  inline-size: 100%;
}
.pavp-form-field__description {
  color: var(--ui-color-text-secondary);
}
.pavp-form-field__errors {
  color: var(--ui-color-text-on-status-error);
  margin: 0;
  padding-inline-start: var(--ui-space-content-gap);
}
.pavp-form-field .n-form-item-feedback--error {
  background-color: var(--ui-color-status-error);
}
.pavp-form-field .n-form-item-label {
  white-space: normal;
  transition: none;
}
</style>
