<script setup lang="ts">
import ChartCapabilityOverview from '../app/workbench/charts/ChartCapabilityOverview.vue'
defineOptions({ name: 'ComponentChartsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ChartCapabilityOverview
    :title="title"
    :message="message"
  />
</template>
