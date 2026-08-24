<script setup lang="ts">
import { PavpRadioButtonPrimitive, PavpRadioGroupPrimitive } from '../adapters/naive/naive-radio'
import type { UiSegmentedOption } from './contracts'

defineOptions({ name: 'UiSegmentedControl' })

defineProps<{
  readonly accessibleLabel: string
  readonly modelValue: string
  readonly options: readonly UiSegmentedOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <PavpRadioGroupPrimitive
    :aria-label="accessibleLabel"
    :value="modelValue"
    @update:value="emit('update:modelValue', String($event))"
  >
    <PavpRadioButtonPrimitive
      v-for="option in options"
      :key="option.value"
      class="min-h-target-enhanced"
      :label="option.value"
      :value="option.value"
    >
      {{ option.label }}
    </PavpRadioButtonPrimitive>
  </PavpRadioGroupPrimitive>
</template>
