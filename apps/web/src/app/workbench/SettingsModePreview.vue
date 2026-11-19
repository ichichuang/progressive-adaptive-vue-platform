<script setup lang="ts">
import type { ColorModePreference } from '@platform/design-system'

defineProps<{
  readonly mode: ColorModePreference
}>()
</script>

<template>
  <span
    class="size-icon-large"
    :class="{
      'i-lucide-monitor': mode === 'system',
      'i-lucide-sun': mode === 'light',
      'i-lucide-moon': mode === 'dark',
    }"
    aria-hidden="true"
  />
</template>
