<script setup lang="ts">
import ChartLiveWorkbench from '../app/workbench/charts/ChartLiveWorkbench.vue'
defineOptions({ name: 'ComponentChartLiveDistributionPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ChartLiveWorkbench
    :title="title"
    :message="message"
    kind="distribution"
  />
</template>
