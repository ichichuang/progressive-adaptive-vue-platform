<script setup lang="ts">
import ChartExampleWorkbench from '../app/workbench/charts/ChartExampleWorkbench.vue'
defineOptions({ name: 'ComponentChartTrendsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ChartExampleWorkbench
    :title="title"
    :message="message"
    group="trends"
  />
</template>
