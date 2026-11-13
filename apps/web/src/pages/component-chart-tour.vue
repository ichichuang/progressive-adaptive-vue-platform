<script setup lang="ts">
import ChartTourWorkbench from '../app/workbench/charts/ChartTourWorkbench.vue'
defineOptions({ name: 'ComponentChartTourPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ChartTourWorkbench
    :title="title"
    :message="message"
  />
</template>
