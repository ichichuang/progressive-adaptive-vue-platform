<script setup lang="ts">
import { PavpButtonPrimitive } from '../adapters/naive/naive-button'

defineOptions({ name: 'UiButton' })

withDefaults(
  defineProps<{
    readonly disabled?: boolean
    readonly type?: 'button' | 'submit'
    readonly variant?: 'ghost' | 'primary' | 'secondary'
  }>(),
  {
    disabled: false,
    type: 'button',
    variant: 'secondary',
  },
)

const emit = defineEmits<{
  press: []
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()
</script>

<template>
  <PavpButtonPrimitive
    class="min-h-target-enhanced min-w-target-enhanced"
    :attr-type="type"
    :disabled="disabled"
    :ghost="variant === 'ghost'"
    :secondary="variant === 'secondary'"
    :type="variant === 'primary' ? 'primary' : 'default'"
    @click="emit('press')"
  >
    <slot />
  </PavpButtonPrimitive>
</template>
