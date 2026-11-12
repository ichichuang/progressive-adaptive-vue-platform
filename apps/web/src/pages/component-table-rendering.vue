<script setup lang="ts">
import TableRenderingWorkbench from '../app/workbench/tables/TableRenderingWorkbench.vue'
defineOptions({ name: 'ComponentTableRenderingPage' })
defineProps<{ readonly title: string; readonly message: string; readonly breadcrumb?: string }>()
</script>
<template>
  <TableRenderingWorkbench
    :title="title"
    :message="message"
  />
</template>
