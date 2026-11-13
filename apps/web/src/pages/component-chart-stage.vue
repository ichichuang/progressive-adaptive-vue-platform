<script setup lang="ts">
import ChartStageWorkbench from '../app/workbench/charts/ChartStageWorkbench.vue'
defineOptions({ name: 'ComponentChartStagePage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ChartStageWorkbench
    :title="title"
    :message="message"
  />
</template>
