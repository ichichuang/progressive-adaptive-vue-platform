<script setup lang="ts">
import { UiG2Chart, type UiG2ChartOptions } from '@platform/ui'

defineProps<{ readonly options: UiG2ChartOptions; readonly label: string }>()
const emit = defineEmits<{ rendered: []; error: [error: Error] }>()
</script>

<template>
  <UiG2Chart
    :options="options"
    :label="label"
    @rendered="emit('rendered')"
    @error="emit('error', $event)"
  />
</template>
