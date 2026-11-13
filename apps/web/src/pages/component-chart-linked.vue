<script setup lang="ts">
import ChartLinkedWorkbench from '../app/workbench/charts/ChartLinkedWorkbench.vue'
defineOptions({ name: 'ComponentChartLinkedPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ChartLinkedWorkbench
    :title="title"
    :message="message"
  />
</template>
