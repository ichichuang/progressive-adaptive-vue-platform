<script setup lang="ts">
import TableCapabilityOverview from '../app/workbench/tables/TableCapabilityOverview.vue'
defineOptions({ name: 'ComponentTableOverviewPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableCapabilityOverview
    :title="title"
    :message="message"
  />
</template>
