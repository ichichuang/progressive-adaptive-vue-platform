<script setup lang="ts">
import ChartExampleWorkbench from '../app/workbench/charts/ChartExampleWorkbench.vue'
defineOptions({ name: 'ComponentChartCompositionPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ChartExampleWorkbench
    :title="title"
    :message="message"
    group="composition"
  />
</template>
