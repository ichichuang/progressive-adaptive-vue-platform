<script setup lang="ts">
import { computed } from 'vue'
import type { BuilderInputState } from './use-form-builder'
import { NInput } from 'naive-ui/es/input'
import { parseBuilderNumberInput } from './builder-input-values'

const props = defineProps<{
  readonly value: number | null
  readonly input: BuilderInputState
  readonly label: string
  readonly labelledBy?: string
  readonly integer?: boolean
  readonly required?: boolean
}>()
const emit = defineEmits<{
  'update:value': [value: number | null]
}>()
const raw = computed(() => props.input.raw ?? (props.value === null ? '' : String(props.value)))
function update(value: string): void {
  const { value: parsed, invalid } = parseBuilderNumberInput(value, props.integer, props.required)
  props.input.update(value, invalid)
  if (!invalid) emit('update:value', parsed)
}
</script>
<template>
  <NInput
    :value="raw"
    :status="input.invalid ? 'error' : 'success'"
    :input-props="{
      inputmode: integer ? 'numeric' : 'decimal',
      'aria-invalid': input.invalid,
      'aria-labelledby': labelledBy,
      'aria-label': labelledBy ? undefined : label,
    }"
    @update:value="update"
  />
</template>
