<script setup lang="ts">
import { inject } from 'vue'
import { PavpSwitchPrimitive } from '../adapters/naive/naive-switch'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'

defineOptions({ name: 'UiSwitch' })
defineProps<{ readonly modelValue: boolean; readonly accessibleLabel: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new Error('UiSwitch requires the PAVP Appearance context.')
function update(value: string | number | boolean): void {
  if (typeof value === 'boolean') emit('update:modelValue', value)
}
</script>

<template>
  <span
    class="pavp-switch"
    :data-motion="appearance?.motion"
  >
    <PavpSwitchPrimitive
      class="min-h-target-enhanced min-w-target-enhanced"
      :aria-label="accessibleLabel"
      :value="modelValue"
      @update:value="update"
    />
  </span>
</template>
