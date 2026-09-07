<script setup lang="ts" generic="I, K extends UiFormKey<I>">
import PavpNaiveFormField from '../adapters/naive/PavpNaiveFormField.vue'
import PavpNaiveFormControl from '../adapters/naive/PavpNaiveFormControl.vue'
import { useFormFieldPresentation } from './form-field-presentation'
import type { UiFormFieldProps, UiFormFieldSlots, UiFormKey } from './form-contracts'

/** One configured field, sharing its controller's values, issues and lifecycle. */
defineOptions({ name: 'UiFormField', inheritAttrs: false })
const props = defineProps<UiFormFieldProps<I, K>>()
const slots = defineSlots<UiFormFieldSlots<I, K>>()
const { binding, config, controlScopeKey } = useFormFieldPresentation(
  props,
  () => slots.default !== undefined,
)
</script>

<template>
  <PavpNaiveFormField
    v-if="!binding.hidden"
    :key="controlScopeKey"
    :binding="binding"
    :config="config"
    :copy="form.copy"
    v-bind="$attrs"
  >
    <slot
      v-if="config.kind === 'custom'"
      v-bind="binding"
    />
    <PavpNaiveFormControl
      v-else
      :form="form"
      :binding="binding"
    />
  </PavpNaiveFormField>
</template>
