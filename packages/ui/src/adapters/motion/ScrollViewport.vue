<script setup lang="ts">
import { m } from 'motion-v'

defineProps<{ readonly horizontal: boolean }>()
const emit = defineEmits<{ viewport: [element: HTMLElement | null] }>()
defineSlots<{ default: (props: Readonly<Record<string, never>>) => unknown }>()

// Vue's public component root, never an enhanced/vendor-generated scrolling element.
function setViewport(value: unknown): void {
  const element =
    value instanceof HTMLElement
      ? value
      : value !== null && typeof value === 'object' && '$el' in value
        ? value.$el
        : null
  emit('viewport', element instanceof HTMLElement ? element : null)
}
</script>

<template>
  <component
    :is="horizontal ? m.div : 'div'"
    :ref="setViewport"
    :layout-scroll="horizontal || undefined"
  >
    <slot />
  </component>
</template>
